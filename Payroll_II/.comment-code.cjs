const fs = require('fs');
const ts = require('./backend/node_modules/typescript');
const descriptions = {
 'frontend/src/main.ts': 'Start the browser app by loading library styles, custom styles and the router.',
 'frontend/src/app.ts': 'Choose the page for the URL, check the saved login and display the app layout.',
 'frontend/src/assets/index.ts': 'Give pages one place to import image URLs handled by Vite.',
 'frontend/src/services/api.ts': 'Send HTTP requests to the backend and handle tokens, responses and errors.',
 'frontend/src/services/auth.ts': 'Save, read, refresh and clear the current user session in browser storage.',
 'frontend/src/pages/login.ts': 'Build the login form, check empty fields and open the allowed page after login.',
 'frontend/src/pages/dashboard.ts': 'Fetch employee summaries and display dashboard cards, charts and recent employees.',
 'frontend/src/pages/account.ts': 'Let the signed-in user change their own password.',
 'frontend/src/pages/employees.ts': 'Show searchable employee records with page controls and allowed actions.',
 'frontend/src/pages/employee-view.ts': 'Load one employee and show their personal, job, salary and contact details.',
 'frontend/src/pages/employee-form.ts': 'Build the Add/Edit Employee form and send its values to the backend.',
 'frontend/src/pages/administration.ts': 'Manage programs, user accounts and program rights through administration APIs.',
 'frontend/src/pages/usrenter.ts': 'Load a selected user\'s program rights, edit checkboxes, then save or delete rights.',
 'frontend/src/utils/ui.ts': 'Share screen helpers for safe text, formatting, messages and confirmation dialogs.',
 'frontend/src/utils/charts.ts': 'Build SVG charts and HTML bars from dashboard values.',
 'frontend/src/types.ts': 'Describe frontend data shapes for TypeScript; these definitions do not run queries.',
 'frontend/vite.config.ts': 'Configure the Vite development and preview servers.',
 'backend/src/server.ts': 'Read the port setting and start the Express API server.',
 'backend/src/app.ts': 'Prepare Express to read browser requests and send them to API routes.',
 'backend/src/middleware.ts': 'Share request checks and error handlers used before or after controllers.',
 'backend/src/types.ts': 'Describe database rows, API results and token fields for TypeScript.',
 'backend/src/unix-crypt.d.ts': 'Tell TypeScript how the imported legacy password library is called.',
 'backend/src/lib/auth.ts': 'Hash passwords and create or check signed login tokens.',
 'backend/src/lib/db.ts': 'Set up shared PostgreSQL connections for the backend models.',
 'backend/src/lib/errors.ts': 'Create validation errors that the administration error handler returns as HTTP 400.',
 'backend/src/lib/permissions.ts': 'Read current account permissions and block requests without the required access.',
 'backend/src/routes/index.ts': 'Connect /api URLs to controllers and apply login and permission checks.',
 'backend/src/routes/administration.ts': 'Connect administrator-only URLs to program, user and rights controllers.',
 'backend/src/routes/usrenter.ts': 'Connect CHECK, SAVE and DELETE requests to the User Rights controller.',
 'backend/src/controllers/auth.controller.ts': 'Check login details, return user sessions and handle password changes.',
 'backend/src/controllers/dashboard.controller.ts': 'Return dashboard model results as a JSON response.',
 'backend/src/controllers/employee.controller.ts': 'Validate employee requests, call models and send HTTP responses.',
 'backend/src/controllers/administration.controller.ts': 'Validate administrator requests before changing programs, users or rights.',
 'backend/src/controllers/usrenter.controller.ts': 'Read the chosen user and program scope, then load or apply their rights.',
 'backend/src/models/user.model.ts': 'Find a login account in PostgreSQL by username.',
 'backend/src/models/dashboard.model.ts': 'Read employee totals, group summaries and recent records using SQL.',
 'backend/src/models/employee.model.ts': 'Read, create, update and delete employee records in PostgreSQL.',
 'backend/src/models/lookup.model.ts': 'Read the lists used by employee form dropdowns.',
 'backend/src/models/administration.model.ts': 'Run SQL for programs, user accounts, lookup lists and user rights.',
 'backend/src/models/usrenter.model.ts': 'Load scoped program rights and save or delete them in one transaction.',
 'backend/src/validators/employee.validator.ts': 'Allow known employee fields only and check their types and values.',
 'backend/src/validators/administration.validator.ts': 'Check program, user, lookup and rights input before SQL runs.',
 'backend/src/validators/usrenter.validator.ts': 'Check the selected user, module scope, action and permission arrays.',
 'backend/test/auth.cjs': 'Test login token checks, password hashes and controller error handling.',
 'backend/test/employee-number.cjs': 'Test server-generated employee numbers and database connection cleanup.',
 'backend/test/legacy-access.cjs': 'Test imported password hashes, employee rights and password changes.',
 'backend/test/usrenter.cjs': 'Test the User Rights API with mocked SQL and a temporary local server.'
};
const edits = {
 'frontend/src/main.ts': [
  ["import 'bootstrap/dist/css", 'Load Bootstrap styles for forms, buttons and layout.'],
  ["import 'bootstrap-icons/", 'Load the icon font used by buttons and menus.'],
  ["import './style.css'", 'Apply this project\'s colours, spacing and responsive styles.'],
  ["import './app.ts'", 'Start routing so the current URL displays the correct screen.']
 ],
 'frontend/vite.config.ts': [
  ['  server:', 'Run development on port 3000; fail instead of silently switching ports.'],
  ['  preview:', 'Use the same fixed port when previewing the production build.']
 ],
 'frontend/src/assets/index.ts': [
  ['export {', 'Export image URLs so pages can import their pictures from this file.']
 ],
 'frontend/src/app.ts': [
  ['const root =', 'Find the empty #root element provided by index.html.'],
  ['const MENU:', 'Define sidebar links, their icons and the headings shown for each page.'],
  ['const ROUTES:', 'Match browser addresses to page modules; only Login is public.'],
  ['    const routeParts =', 'Split both URLs into sections so each section can be compared.'],
  ['    if (routeParts.length', 'Reject URLs with a different number of sections.'],
  ['        if (rPart.startsWith', 'Save variable sections such as :id for the selected page to use.'],
  ['let renderId =', 'Track page changes so slow replies from an old page can be ignored.'],
  ['    if (replace) {', 'Replace the current history entry for redirects; otherwise add a new entry.'],
  ["    if (item.href === '/account')", 'My Account is available to every signed-in user.'],
  ["    if (item.href.startsWith", 'Show administration links only to administrators.'],
  ['    const visibleMenuItems =', 'Build only the menu links this user has permission to see.'],
  ['    const addEmployeeBtn =', 'Show the quick Add Employee button only when adding is allowed.'],
  ['    const id = ++renderId;', 'Mark this page load and read the current address and saved user.'],
  ["    if (path === '/')", 'When the main address opens, redirect to Login or the user\'s home page.'],
  ['        const match = matchRoute', 'Find the matching page and extract URL values such as employee ID.'],
  ['    const ctx: PageContext', 'Give pages navigation, URL values and a way to check if they are still open.'],
  ['    window.scrollTo(0, 0);', 'Start the new page at the top, then ask its module to draw the content.'],
  ['    const a = (e.target', 'Handle app links inside the router; preserve normal Ctrl-click browser actions.']
 ],
 'frontend/src/pages/login.ts': [
  ['        const show = pw.type', 'Choose whether the eye button should reveal or hide the password.']
 ],
 'frontend/src/services/auth.ts': [
  ['    localStorage.removeItem(TOKEN_KEY);', 'Remove both saved session values when the user logs out.'],
  ['    return currentUser()?.access', 'Return true only when saved permissions explicitly allow this action.']
 ],
 'frontend/src/services/api.ts': [
  ['    const headers: Record', 'Tell the backend that request bodies contain JSON text.'],
  ["        throw new Error('Cannot reach", 'Show a readable message when the backend cannot be reached.'],
  ['    return data as T;', 'Return the successful response in the data shape expected by the caller.'],
  ['let lookupsPromise:', 'Keep one shared dropdown request so pages can reuse its result.'],
  ['    if (lookupsPromise === null)', 'Load dropdowns only when no request or successful result is cached.'],
  ['            lookupsPromise = null;', 'Clear a failed request so the next call can retry loading dropdowns.']
 ],
 'frontend/src/pages/account.ts': [
  ['    const user = currentUser();', 'Read the saved profile to show which account is being changed.'],
  ['    el.innerHTML = `', 'Build inputs for the current password, new password and confirmation.'],
  ['        e.preventDefault();', 'Keep the page open while reading and submitting the form values.'],
  ['        if (data.newPassword', 'Stop before sending if the two new passwords do not match.'],
  ['        button.disabled = true;', 'Prevent another submission while the password change is running.'],
  ["            await request('/auth/password'", 'Send the password values to the protected password-change API.'],
  ['                form.reset();', 'Clear the inputs and show success only if this page is still open.'],
  ['            button.disabled = false;', 'Allow another attempt after success or failure.']
 ],
 'frontend/src/pages/employees.ts': [
  ["    let search = '';", 'Keep the search, page number, latest response and search delay timer.'],
  ['    el.innerHTML = `', 'Build the search box, employee table and area for page controls.'],
  ['            const r = await api.list', 'Ask the backend for one page of employees matching the search.'],
  ['            if (!ctx.alive()) return;', 'Ignore a late response if the user has left this page.', 'all'],
  ['        if (result.data.length)', 'Show employee rows, or an empty message if the search has no matches.'],
  ['        if (result.totalPages > 1)', 'Show Previous and Next only when there is more than one page.'],
  ['        const isActive =', 'Choose the employee status text and badge colour.'],
  ['        clearTimeout(timer);', 'Wait 350 ms after typing before searching to avoid a request on every key.'],
  ['        if (pg && !pg.disabled)', 'Load the chosen page when a page control is clicked.'],
  ['        const confirmed = await confirmModal', 'Ask before deleting the employee selected from the current results.'],
  ['            await api.remove', 'Delete the employee on the backend, then reload the table.'],
  ['            if (result.data.length === 1', 'Move back if deleting the last row would leave this page empty.'],
  ['    await load();', 'Load the first page as soon as the screen is ready.']
 ],
 'frontend/src/pages/employee-view.ts': [
  ['    let displayValue =', 'Show a dash for empty values and safely escape values that exist.'],
  ['    const id = Number', 'Read the employee ID captured from the browser URL.'],
  ['        [emp, lookups] = await Promise.all', 'Fetch the employee and dropdown descriptions together.'],
  ['    if (!ctx.alive()) return;', 'Ignore results if the user has already moved to another page.'],
  ['    const statusText =', 'Translate stored codes into readable status, department and gender labels.'],
  ['    el.innerHTML = `', 'Build the employee profile and its grouped detail cards.'],
  ['            const confirmed = await confirmModal', 'Ask for confirmation before removing this employee.'],
  ['                await api.remove', 'Delete the record and return to the employee list.']
 ],
 'frontend/src/pages/employee-form.ts': [
  ['type FieldKey =', 'Limit field names to employee fields and dropdown names to lookup lists.'],
  ['const SECTIONS:', 'Group field definitions into Personal, Job, Salary, Bank, Contact and Leave cards.'],
  ['for (const section of SECTIONS)', 'Collect all real fields into one list, skipping visual line breaks.'],
  ["    if (type === 'radio') {", 'Build radio choices and mark the option matching the saved value.'],
  ["    } else if (type === 'select')", 'Build dropdown options from the lookup list and select the saved value.'],
  ['        const inputType =', 'Choose date, whole-number, decimal or text input settings.'],
  ["        const readOnly = key === 'empeno'", 'Keep Employee No read-only because the backend assigns it.'],
  ["            if (field === 'break')", 'Insert a visual line break instead of an input for this layout marker.'],
  ['    for (const { key, type } of FIELDS)', 'Read each field and convert it to the value type expected by the API.'],
  ["        if (key === 'empeno') continue;", 'Leave Employee No out of the request; the server controls this value.'],
  ["        if (type === 'int' || type === 'select')", 'Convert number fields to numbers and empty optional fields to null.'],
  ['    const id = ctx.params', 'An ID means Edit mode; no ID means Add mode.'],
  ['        const lookupRequest =', 'Load dropdowns and either the existing employee or the next number preview.'],
  ['        if (emp) {', 'Fill Edit mode fields with saved employee values instead of defaults.'],
  ['    const pageTitle =', 'Choose Add/Save or Edit/Update labels for the current mode.'],
  ['    el.innerHTML = `', 'Build the employee form using the field definitions and loaded values.'],
  ['        const body = toPayload(form);', 'Convert inputs into the employee JSON body before checking and saving.'],
  ['        if (!body.empnam)', 'Require an employee name before sending the form.'],
  ['        buttons.forEach((btn) => { btn.disabled = true; });', 'Disable both Save buttons until the backend finishes.'],
  ['            if (id !== null) {', 'Update in Edit mode; otherwise create a new employee.'],
  ["            ctx.navigate('/employees');", 'Return to the employee list after a successful save.']
 ],
 'frontend/src/pages/dashboard.ts': [
  ['    const today =', 'Format the browser date for the dashboard welcome banner.'],
  ['    el.innerHTML = `', 'Build the welcome banner and the empty area for dashboard results.'],
  ['        icon.classList.add', 'Animate Refresh and show a loading message during the API call.'],
  ['            if (!ctx.alive()) return;', 'Ignore late data if another page has been opened.'],
  ['            icon.classList.remove', 'Stop the loading animation whether the request succeeds or fails.'],
  ["    qs(el, '#refresh').onclick = load;", 'Reuse load() for the Refresh button and the first page load.']
 ],
 'frontend/src/pages/administration.ts': [
  ['const flags =', 'Keep permission field names in the same order as their visible labels.'],
  ['    const mode = location.pathname', 'Use the URL to choose Programs, Users or Rights mode.'],
  ['    let rows: Row[]', 'Keep loaded records, dropdowns, the edited record and the selected user.'],
  ['        const result = await Promise.all', 'Load administration dropdowns and records together.'],
  ['    el.innerHTML = `', 'Build tabs, filters, an editor area and the records table.'],
  ['    const notice =', 'Display success or error messages above the records.'],
  ['        return rows.filter', 'Keep records matching the module, submodule and search text.'],
  ['        const list = rights', 'Show no rights until a user is chosen; otherwise use the filtered records.'],
  ["        $('#rows').innerHTML = list.length", 'Build the correct row layout for Users, Rights or Programs mode.'],
  ['        editing = row;', 'Remember the selected record; null means a new record.'],
  ["        $('#cancel').onclick", 'Close the editor without saving changes.'],
  ["        $('#form').onsubmit", 'Read the editor inputs and create or update the selected record.'],
  ['                await call(`/${mode}', 'Use POST for a new record and PUT with its ID when editing.'],
  ["            $('#lookup-form').onsubmit", 'Add a module or submodule, then refresh the dropdowns.'],
  ["    if (!rights) $('#add')", 'Connect Add, search and filters to the editor and table redraw.'],
  ["        $('#user').onchange", 'Load the chosen user\'s rights and discard replies from older selections.'],
  ['            const current = ++version;', 'Number this selection so a slower previous reply cannot replace its data.'],
  ['        if (t.dataset.column)', 'A column checkbox changes visible programs supporting that permission.'],
  ['        if (t.dataset.flag)', 'A row checkbox updates that program\'s permission in memory.'],
  ['        if (t.dataset.edit)', 'Open the chosen record in the editor.'],
  ['            if (t.dataset.delete)', 'Confirm program deletion before sending a DELETE request.'],
  ['            if (t.dataset.bulk)', 'Select or clear applicable permission flags for all visible records.'],
  ["            if (t.id === 'save-rights'", 'Save or delete rights for the visible programs of the selected user.'],
  ['                const selected = visible().map', 'Build the program IDs and y/n flags to send to the backend.'],
  ['    draw();', 'Display the initial table after connecting its controls.']
 ],
 'frontend/src/pages/usrenter.ts': [
  ['const flags: UsrFlag[]', 'Keep permission names in the same order as the table columns.'],
  ['        [lookups, users] = await Promise.all', 'Load user choices and module lists before building the form.'],
  ['    el.innerHTML = `', 'Build user filters, the permission table area and action buttons.'],
  ['    let te_scope:', 'Keep the checked selection, current edits, saved copy and request state.'],
  ['        let changed = 0;', 'Compare edited rows with the saved copy to count unsaved changes.'],
  ['            checkbox.indeterminate =', 'Show a mixed state when only some applicable programs are checked.'],
  ['        te_version++;', 'Cancel the old selection so it cannot be saved under new filters.'],
  ['        const result = await request<Checked>', 'Ask the backend for programs and rights within the checked scope.'],
  ['        if (!ctx.alive() || version !== te_version) return;', 'Discard this reply if the page or selected scope changed while waiting.'],
  ['        te_saved = result.rows.map', 'Copy saved rows separately so edits can be compared or reset.'],
  ["    control<HTMLButtonElement>('reset').onclick", 'Undo checkbox edits by restoring the last loaded rows.'],
  ['        if (te_busy || !te_scope', 'Save only after CHECK has loaded a non-empty selection.'],
  ['        if (remove) {', 'Ask before deleting the checked selection\'s rights.'],
  ['        const payload =', 'Send the scope, action, program IDs and a y/n array for each permission.'],
  ['            const result = await request<{ message: string }>', 'Post the rights to the backend, then reload saved values.'],
  ['                await load(scope);', 'Reload rights to show what the database actually saved.']
 ],
 'frontend/src/utils/ui.ts': [
  ['    return String(s ??', 'Replace HTML-sensitive characters so user text cannot become page markup.'],
  ['    return Number(n ??', 'Format numbers with Sri Lankan separators and the requested decimals.'],
  ['    const el = root.querySelector', 'Find the requested element inside its container.'],
  ['    if (!el) {', 'Fail clearly if the expected screen element is missing.'],
  ['    return new Promise((resolve)', 'Wait until the user confirms or cancels the dialog.'],
  ["        const el = document.createElement", 'Create the overlay and its Confirm and Cancel buttons.'],
  ['        const done =', 'Close the dialog and return true for Confirm or false for Cancel.'],
  ["        el.addEventListener('click'", 'Cancel or an overlay click returns false; Confirm returns true.'],
  ['        document.body.appendChild(el);', 'Attach the dialog to the page so the user can respond.']
 ],
 'frontend/src/utils/charts.ts': [
  ['export const PALETTE', 'Reuse these colours when chart items do not supply their own.'],
  ['    let total = 0;', 'Add all values to calculate the donut total and each slice\'s share.'],
  ['    const size = 170;', 'Set the donut size and ring thickness, then calculate its circumference.'],
  ['    const segs = items.map', 'Calculate the length, colour and starting offset of each donut slice.'],
  ['    const circles =', 'Turn slice lengths into SVG circle strokes.'],
  ['    const legend =', 'Build labels, values and percentages matching the donut colours.'],
  ['    let chartSegments =', 'Draw coloured slices only when there is a positive total.'],
  ['    const { format = String', 'Use the supplied value formatter and colour, or defaults.'],
  ['    if (!items.length)', 'Show a readable message when there are no chart items.', 'all'],
  ['    const max = Math.max', 'Scale bars against the largest value; use at least 1 to avoid dividing by zero.', 'all'],
  ['    const W = 520;', 'Set the column chart dimensions and space for labels.'],
  ['    const slot =', 'Calculate each column\'s available width and drawing height.'],
  ['    const grid =', 'Draw horizontal guide lines behind the columns.'],
  ['    const bars =', 'Calculate column positions and heights, then draw their labels.']
 ],
 'backend/src/app.ts': [
  ["app.use('/api', routes);", 'Send /api requests to routes/index.ts to choose the controller.']
 ],
 'backend/src/server.ts': [
  ['    port = Number', 'Convert the configured port text to a number before validating it.']
 ],
 'backend/src/lib/errors.ts': [
  ['    throw Object.assign', 'Attach status 400 so the route error handler can show this message.']
 ],
 'backend/src/lib/auth.ts': [
  ['    if (!body || !sig)', 'Reject tokens missing either the user-data part or signature.'],
  ['        const payload = JSON.parse', 'Decode the token data only after its signature has passed the check.'],
  ['    const salt = crypto.randomBytes', 'Use a fresh salt so the same password can have different stored hashes.']
 ],
 'backend/src/controllers/auth.controller.ts': [
  ['        const { currentPassword', 'Read the old password and both new-password values.'],
  ["        const row = (await pool.query('SELECT usdpwd", 'Read the signed-in user\'s stored hash, not an ID supplied by the form.'],
  ['        if (!row || !verifyPassword', 'Stop if the current password does not match the stored hash.'],
  ['        const r = await pool.query(', 'Save the new hash only if the old hash has not changed during this request.'],
  ['        if (!r.rowCount)', 'Return a conflict if another request changed the password first.']
 ],
 'backend/src/controllers/employee.controller.ts': [
  ['    if (typeof data.empeno', 'Check employee-number uniqueness when validated input includes a number.'],
  ['    if (typeof data.empmapcode', 'Check nonzero map codes for duplicates; ignore the same employee during edits.'],
  ['        const search = String', 'Read search text and keep page and page size within allowed limits.'],
  ['        const { errors, data }', 'Validate allowed fields and stop before writing if any input is invalid.', 'all'],
  ['        const dup = await duplicateError', 'Reject duplicate numbers or map codes with HTTP 409.', 'all'],
  ['        const id = await EmployeeModel.create', 'Insert the employee and return the saved record with HTTP 201.'],
  ['        await EmployeeModel.update', 'Save validated changes and return the updated employee.'],
  ['        await EmployeeModel.remove', 'Delete the confirmed employee and return a readable message.']
 ],
 'backend/src/controllers/administration.controller.ts': [
  ['        const u = await AdministrationModel.accountStatus', 'Read the current active and administrator flags for the signed-in user.'],
  ["        if (e.code === '23505')", 'Turn PostgreSQL duplicate-key errors into a readable HTTP 409 response.'],
  ['        const { module, submodule, values }', 'Validate program fields before checking that the module IDs exist.', 'all'],
  ['        const { data, password }', 'Validate the profile and keep password text separate until it is hashed.', 'all'],
  ['        if (data.usdcomsno', 'Reject a selected location that does not exist.', 'all'],
  ['        if (password) data.usdpwd', 'Hash a supplied password before storing it.', 'all'],
  ["        if (data.usdactive === 'N'", 'Prevent this screen from disabling administrator accounts.'],
  ['        const { rows, ids, clear }', 'Validate the rights list, duplicate IDs and clear/delete option.']
 ],
 'backend/src/controllers/usrenter.controller.ts': [
  ['        const scope = usrScope', 'Validate the user and All/Select module filters.', 'all'],
  ['        const user = await UsrEnterModel.findUser', 'Confirm the selected user exists before loading programs.'],
  ['        const rows = await UsrEnterModel.programs', 'Load scoped programs and return them with the user details.'],
  ['        const action = usrAction', 'Require one action, SAVE or DELETE, and validate permission arrays.'],
  ['        await UsrEnterModel.apply', 'Apply the validated rights in one database transaction.']
 ],
 'backend/src/models/employee.model.ts': [
  ['    async nextNumber', 'Preview one more than the largest employee number, or 1 for an empty table.'],
  ['        if (search) {', 'Search name, number, NIC or designation using a parameterized pattern.'],
  ['        const count = await pool.query', 'Count matches so the frontend can calculate page controls.'],
  ['        const rows = await pool.query<Employee>', 'Read the requested page with department and location names.'],
  ['    async findById', 'Read one employee by its internal database ID.'],
  ['    async findByEmpNo', 'Find an employee ID by employee number for duplicate checks.'],
  ['    async findByMapCode', 'Find an employee ID by attendance map code for duplicate checks.'],
  ["            await client.query('BEGIN');", 'Start a transaction so number allocation and insertion succeed together.'],
  ['            const generated =', 'Use the number calculated under the table lock, not a client number.'],
  ['            const cols =', 'Build column names and parameter placeholders from validated fields.'],
  ["            await client.query('COMMIT');", 'Keep the inserted employee and finish the transaction.'],
  ["            await client.query('ROLLBACK');", 'Undo transaction changes when any step fails.'],
  ['            client.release();', 'Always return the connection to the pool.'],
  ['        delete data.empeno;', 'Preserve Employee No even if a caller passes a replacement.'],
  ['        const sets =', 'Build UPDATE assignments and pass values as SQL parameters.'],
  ['    async remove', 'Delete only the employee matching the supplied internal ID.']
 ],
 'backend/src/models/lookup.model.ts': [
  ['    async all()', 'Load employee dropdown choices in parallel from their master tables.'],
  ['        return {', 'Group the returned database rows by dropdown name.']
 ],
 'backend/src/models/administration.model.ts': [
  ['const publicUserColumns', 'List public user fields; exclude the password hash.'],
  ['    async isAdministrator', 'Check whether this account is marked as an administrator.'],
  ['    async lookups()', 'Read modules (32), submodules (33) and locations together.'],
  ['    async createLookup', 'Insert a module or submodule and return its generated ID.'],
  ['    async locationExists', 'Check that a selected location exists before assigning it.'],
  ['    async programs()', 'List programs with module/submodule names in display order.'],
  ['    async createProgram', 'Insert program fields and record who created the program and when.'],
  ['    async updateProgram', 'Update program fields and record who changed the program and when.'],
  ['    async users()', 'List public account fields in username order.'],
  ['    async createUser', 'Insert validated user fields and audit details using SQL parameters.'],
  ['    async updateUser', 'Update validated account fields and return the public profile if found.'],
  ["            await c.query('BEGIN');", 'Start a transaction so related changes succeed or are undone together.', 'all'],
  ["            await c.query('COMMIT');", 'Save every change made in this transaction.', 'all'],
  ["            await c.query('ROLLBACK');", 'Undo this transaction when a SQL or validation step fails.', 'all'],
  ['            c.release();', 'Always return the connection to the pool, even after a failure.', 'all'],
  ['            const programs = await c.query', 'Verify submitted programs still exist before writing rights.'],
  ['            const levels =', 'Map program IDs to Single or Multi levels for permission rules.'],
  ['                if (clear) {', 'Delete this user/program permission row when Clear was requested.']
 ],
 'backend/src/models/usrenter.model.ts': [
  ['    async findUser', 'Read the selected user\'s code, name and administrator flag.'],
  ['    async programs', 'Load scoped programs; a null module ID means All.'],
  ["            await client.query('BEGIN');", 'Start a transaction so the whole rights selection changes together.'],
  ["            await client.query('LOCK TABLE", 'Prevent program changes while checking and saving the catalog.'],
  ["            if (!(await client.query('SELECT 1", 'Lock the selected user row and stop if the account no longer exists.'],
  ["            if (action === 'delete')", 'Delete only rights matching the checked user and module filters.'],
  ['                for (const row of rows)', 'Insert or update each program\'s allowed flags and acting user.'],
  ["            await client.query('COMMIT');", 'Save all rights changes after every step succeeds.'],
  ["            await client.query('ROLLBACK');", 'Undo changes if any validation or SQL write fails.'],
  ['            client.release();', 'Always release the checked-out database connection.']
 ],
 'backend/src/models/dashboard.model.ts': [
  ['            pool.query(`SELECT empcat', 'Count active employees by category.'],
  ['            pool.query(`SELECT empmof', 'Count active employees by gender.'],
  ["            pool.query(`SELECT COALESCE(d.depdes, 'Unassigned') AS label, COUNT", 'Count active employees by department.'],
  ['            pool.query(`SELECT COALESCE(l.locnam', 'Count active employees by location.'],
  ["            pool.query(`SELECT COALESCE(d.depdes, 'Unassigned') AS label, COALESCE", 'Sum active employees\' basic salaries for each department.'],
  ['            pool.query(`SELECT EXTRACT', 'Count employees by joining year.'],
  ['            pool.query(`SELECT e.empsno', 'Read the six newest employee IDs with department names.'],
  ['        return {', 'Convert numeric text where needed and build the dashboard response.']
 ],
 'backend/src/validators/employee.validator.ts': [
  ['type Kind =', 'Name checks for whole numbers, optional numbers, dates, flags and text.'],
  ['type Spec =', 'Describe one allowed field: name, check type and optional text limit.'],
  ['const SPEC:', 'List accepted employee fields; unlisted input fields are not copied.'],
  ['const isBlank =', 'Treat missing, null and empty-text values as blank.'],
  ['export function validateEmployee', 'Return cleaned employee data plus all validation messages.'],
  ['    if (!partial) {', 'Require a name on creation; updates check only fields that were sent.'],
  ['    for (const [name, kind, max]', 'Check each allowed field present in the request body.'],
  ["            case 'int':", 'Accept whole numbers; intn fields may be blank and become null.'],
  ["            case 'float':", 'Convert decimals to numbers; treat blanks as zero.'],
  ["            case 'date':", 'Accept YYYY-MM-DD date text, or null for a blank date.'],
  ["            case 'yn':", 'Accept only uppercase Yes/No flags Y or N.'],
  ["            case 'cat':", 'Accept Wages, Executive or Staff category codes only.'],
  ["            case 'mf':", 'Accept stored gender codes M or F only.'],
  ["            case 'str':", 'Trim text, check lengths and validate names and email addresses.'],
  ['    return { errors:', 'Remove duplicate messages and return cleaned, allowed fields.']
 ],
 'backend/src/validators/administration.validator.ts': [
  ['export const rightFlags', 'Define the four database permission flags accepted in rights requests.'],
  ['    if (!Number.isSafeInteger(n)', 'Require a whole number within the minimum and PostgreSQL integer range.'],
  ['    const s = String', 'Trim text before checking required values and maximum length.'],
  ['    if (![32, 33].includes(type))', 'Only module (32) and submodule (33) types can be added here.'],
  ["    if (!['S', 'M'].includes", 'Accept Single and Multi program levels only.'],
  ['    for (const [key, max]', 'Validate known fields; leave usernames unchanged during updates.'],
  ['    data.usduno =', 'Convert optional user number and location choices to stored values.'],
  ['    if (create || body.usdpwd)', 'Require a password on creation; check optional replacements during edits.'],
  ['    if (!Array.isArray(rows)', 'Require a rights array with no more than 10,000 programs.'],
  ['    if (new Set(ids).size', 'Reject duplicate program IDs.'],
  ['    for (const row of rows)', 'Check that every permission contains lowercase y or n.']
 ],
 'backend/src/validators/usrenter.validator.ts': [
  ['export const usrFlags', 'Use these names for each program\'s y/n permission arrays.'],
  ['type UsrInput', 'Keep incoming values unknown until they pass validation.'],
  ['export type UsrScope', 'Describe a checked user with optional module/submodule IDs.'],
  ['    const { modopt, smodopt }', 'Require A for All or S for Select on both filters.'],
  ['    if (!Array.isArray(input.prgsno)', 'Require a program list with no more than 10,000 items.'],
  ['    if (new Set(ids).size', 'Reject repeated program IDs.'],
  ['    if (input.hcount !== ids.length)', 'Reject a row count that does not match the submitted list.'],
  ['    for (const flag of usrFlags)', 'Require one lowercase y/n value per program for each permission.'],
  ['    return ids.map', 'Pair each program ID with its four validated permission values.'],
  ['    if ((input.save === true)', 'Reject requests selecting both SAVE and DELETE, or neither.']
 ],
 'backend/src/routes/index.ts': [
  ["router.post('/auth/password'", 'Use the confirmed signed-in user when changing a password.']
 ],
 'backend/src/routes/administration.ts': [
  ['const router =', 'Create the router mounted under /api/administration.'],
  ["router.use('/usrenter'", 'Forward User Rights requests to the nested usrenter router.']
 ],
 'backend/src/routes/usrenter.ts': [
  ['const router =', 'This router runs after login, active-account and administrator checks.']
 ],
 'backend/src/middleware.ts': [
  ['            await fn(req, res, next);', 'Run the controller and forward thrown errors to Express.'],
  ['    if ((err as { type?: string })?.type', 'Return 400 when the incoming body is not valid JSON.'],
  ['    console.error(err);', 'Log unexpected errors and send a generic 500 response.']
 ],
 'backend/src/lib/permissions.ts': [
  ['const EMPLOYEE_PROGRAMS', 'Recognize legacy program names used to assign employee access.'],
  ['const EMPLOYEE_ENTRY_PROGRAMS', 'Read add, amend and delete flags only from employee entry programs.']
 ],
 'backend/test/usrenter.cjs': [
  ['const programs =', 'Use one Single and one Multi program to test permission rules.'],
  ['const body =', 'Build a valid example request that each test can modify.'],
  ['async function fixture', 'Build a temporary test API with mocked SQL instead of real database writes.'],
  ["    context.mock.method(pool, 'query'", 'Replace database lookups with predictable account and program results.'],
  ["    context.mock.method(pool, 'connect'", 'Simulate transactions, connection release and optional write failures.'],
  ['    const app = express();', 'Start a local test API with a fake signed-in administrator.'],
  ['    context.after(', 'Close the temporary server after each test.'],
  ['        async send(', 'Send a test GET or POST and return its status and parsed JSON.']
 ],
 'backend/test/employee-number.cjs': [
  ["    t.mock.method(pool, 'query'", 'Capture UPDATE SQL instead of changing a real database record.'],
  ["    t.mock.method(pool, 'connect'", 'Simulate a transaction returning a generated employee number and ID.']
 ],
 'backend/test/legacy-access.cjs': [
  [" t.mock.method(pool,'query'", 'Replace SQL with controlled results so no real database is needed.', 'all'],
  [" t.mock.method(UserModel,'findByUsername'", 'Simulate an active imported account with a known legacy hash.']
 ],
 'backend/test/auth.cjs': [
  ['    const controllers =', 'Try immediate errors and errors thrown by asynchronous controllers.']
 ]
};
const shapeComments = {
 Department: 'Describe a department choice: ID, code and optional description.',
 Location: 'Describe a location choice: ID, code and optional name.',
 SysItem: 'Describe a coded lookup item, such as a section or cost centre.',
 Lookups: 'Group the dropdown lists returned by the lookup API.',
 Employee: 'Describe a complete employee record using its database field names.',
 Paged: 'Describe one results page, its record count and page totals.',
 AuthUser: 'Describe public signed-in user details returned to the browser.',
 ChartItem: 'Describe one chart label and its numeric value.',
 DashboardData: 'Describe totals, chart groups and recent employee rows.',
 PageContext: 'Describe navigation helpers and URL values supplied to pages.',
 PageModule: 'Require every page to provide an asynchronous render function.',
 EmployeeBody: 'Allow writable employee fields in create/update request bodies.',
 EmployeeInput: 'Allow writable employee fields after backend validation.',
 TokenPayload: 'Describe user identity and expiry fields inside a signed token.',
 UserRow: 'Describe a database account row, including its stored password hash.'
};
const printer = ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed });
function emitted(file, text) {
 if (file.endsWith('.d.ts')) return printer.printFile(ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true));
 return ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, removeComments: true } }).outputText;
}
const pending = [];
let count = 0;
for (const [file, description] of Object.entries(descriptions)) {
 const before = fs.readFileSync(file, 'utf8');
 const nl = before.includes('\r\n') ? '\r\n' : '\n';
 let after = '// ' + description + nl + before;
 for (const [anchor, explanation, selection] of edits[file] || []) {
  const lines = after.split(nl);
  const hits = lines.flatMap((line, i) => line.startsWith(anchor) ? [i] : []);
  if (!hits.length || (hits.length > 1 && selection !== 'all')) throw new Error(file + ': missing/ambiguous ' + anchor);
  for (const i of hits.reverse()) {
   lines.splice(i, 0, lines[i].match(/^\s*/)[0] + '// ' + explanation);
   count++;
  }
  after = lines.join(nl);
 }
 if (file.endsWith('/types.ts')) {
  const lines = after.split(nl);
  for (let i = lines.length - 1; i >= 0; i--) {
   const match = lines[i].match(/^export (?:interface|type) (\w+)/);
   if (match && shapeComments[match[1]]) {
    lines.splice(i, 0, '// ' + shapeComments[match[1]]);
    count++;
   }
  }
  after = lines.join(nl);
 }
 if (file.endsWith('.cjs')) {
  const lines = after.split(nl);
  for (let i = lines.length - 1; i >= 0; i--) {
   const match = lines[i].match(/^test\('([^']+)'/);
   if (match) {
    lines.splice(i, 0, '// Test: ' + match[1] + '.');
    count++;
   }
  }
  after = lines.join(nl);
 }
 if (emitted(file, before) !== emitted(file, after)) throw new Error(file + ': executable output changed');
 pending.push([file, after]);
}
for (const [file, after] of pending) fs.writeFileSync(file, after);
console.log('Added ' + count + ' block comments and file overviews across ' + pending.length + ' files. Verified executable output is unchanged in each file.');
