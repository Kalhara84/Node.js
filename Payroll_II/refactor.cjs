const fs = require('fs');
const path = require('path');
const ts = require('./backend/node_modules/typescript');
const files = ['backend/src', 'frontend/client', 'frontend/server'].flatMap(function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const name = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(name) : name.endsWith('.ts') ? [name] : [];
  });
const f = ts.factory;
function unwrap(node) {
  while (ts.isParenthesizedExpression(node)) node = node.expression;
  return node;
}
function branch(expression, makeStatement) {
  const value = unwrap(expression);
  if (ts.isConditionalExpression(value)) {
    return f.createIfStatement(value.condition,
      f.createBlock([branch(value.whenTrue, makeStatement)], true),
      f.createBlock([branch(value.whenFalse, makeStatement)], true));
  }
  return makeStatement(expression);
}
for (const file of files) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const result = ts.transform(source, [context => {
    function visit(node) {
      node = ts.visitEachChild(node, visit, context);
      if (ts.isArrowFunction(node) && !ts.isBlock(node.body)) {
        return f.updateArrowFunction(node, node.modifiers, node.typeParameters, node.parameters, node.type, node.equalsGreaterThanToken,
          f.createBlock([branch(node.body, value => f.createReturnStatement(value))], true));
      }
      if (ts.isReturnStatement(node) && node.expression && ts.isConditionalExpression(unwrap(node.expression))) {
        return branch(node.expression, value => f.createReturnStatement(value));
      }
      if (ts.isVariableStatement(node) && node.declarationList.declarations.length === 1) {
        const declaration = node.declarationList.declarations[0];
        if (declaration.initializer && ts.isConditionalExpression(unwrap(declaration.initializer))) {
          return [f.updateVariableStatement(node, node.modifiers, f.createVariableDeclarationList([
            f.updateVariableDeclaration(declaration, declaration.name, declaration.exclamationToken, declaration.type, undefined)
          ], ts.NodeFlags.Let)), branch(declaration.initializer, value => f.createExpressionStatement(f.createAssignment(declaration.name, value)))];
        }
      }
      if (ts.isExpressionStatement(node) && ts.isBinaryExpression(node.expression) && node.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isConditionalExpression(unwrap(node.expression.right))) {
        return branch(node.expression.right, value => f.createExpressionStatement(f.createAssignment(node.expression.left, value)));
      }
      const block = statement => ts.isBlock(statement) ? statement : f.createBlock([statement], true);
      if (ts.isIfStatement(node)) {
        return f.updateIfStatement(node, node.expression, block(node.thenStatement), node.elseStatement && (ts.isIfStatement(node.elseStatement) ? node.elseStatement : block(node.elseStatement)));
      }
      if (ts.isForOfStatement(node)) return f.updateForOfStatement(node, node.awaitModifier, node.initializer, node.expression, block(node.statement));
      if (ts.isForStatement(node)) return f.updateForStatement(node, node.initializer, node.condition, node.incrementor, block(node.statement));
      if (ts.isWhileStatement(node)) return f.updateWhileStatement(node, node.expression, block(node.statement));
      return node;
    }
    return root => ts.visitNode(root, visit);
  }]);
  fs.writeFileSync(file, ts.createPrinter({ newLine: ts.NewLineKind.LineFeed }).printFile(result.transformed[0]));
  result.dispose();
}
