import { Router } from 'express';
import { pool } from '../lib/db';
import { hashPassword } from '../lib/auth';
import { wrap } from '../middleware';
import usrenter from './usrenter';

const router = Router();
const flags = ['usryn', 'usraddyn', 'usrameyn', 'usrdelyn'] as const;
const userFields: Record<string, number> = { usdusd:8, usdnam:50, usdad1:50, usdad2:50, usdad3:50, usdtel:25, usdfax:25, usdmail:25, usdnic:10, usddes:25 };
function fail(message: string): never { throw Object.assign(new Error(message), { status:400 }); }
function integer(v: unknown, label: string, min = 1): number {
    if ((typeof v !== 'string' && typeof v !== 'number') || String(v).trim()==='') fail(`${label} is required`);
    const n = Number(v);
    if (!Number.isSafeInteger(n) || n < min || n > 2147483647) fail(`${label} is invalid`);
    return n;
}
function string(v: unknown, label: string, max: number, required = false): string {
    if (v != null && typeof v !== 'string') fail(`${label} must be text`);
    const s = String(v ?? '').trim();
    if ((required && !s) || s.length > max) fail(`${label} is required and must be at most ${max} characters`);
    return s;
}
router.use(wrap(async (req,res,next) => {
    const u = (await pool.query('SELECT usdactive,usdadmin FROM usdmast WHERE usdsno=$1',[req.user!.sub])).rows[0];
    if (!u || u.usdactive !== 'Y') { res.status(401).json({message:'Account is inactive'}); return; }
    // Grant management is administrative; never infer authority from an editable designation.
    if (!u.usdadmin) { res.status(403).json({message:'Administrator access required'}); return; }
    next();
}));
router.use('/usrenter.php', usrenter);
router.get('/lookups', wrap(async (_req,res) => {
    const [modules, submodules, locations] = await Promise.all([
        pool.query('SELECT syssno,sysdes FROM a_sysmast WHERE sysrtp=32 ORDER BY sysdes'),
        pool.query('SELECT syssno,sysdes FROM a_sysmast WHERE sysrtp=33 ORDER BY sysdes'),
        pool.query('SELECT locsno,locnam FROM s_locmast ORDER BY locnam')]);
    res.json({modules:modules.rows,submodules:submodules.rows,locations:locations.rows});
}));
router.post('/lookups', wrap(async (req,res) => {
    const type = integer(req.body?.sysrtp,'Type');
    if (![32,33].includes(type)) fail('Only modules and submodules can be added here');
    const code = string(req.body.sysrno,'Code',10,true), description = string(req.body.sysdes,'Description',40,true);
    const r = await pool.query('INSERT INTO a_sysmast(sysrtp,sysrno,sysdes) VALUES($1,$2,$3) RETURNING syssno',[type,code,description]);
    res.status(201).json(r.rows[0]);
}));
router.get('/programs', wrap(async (_req,res) => {
    res.json((await pool.query(`SELECT p.*,m.sysdes AS module,s.sysdes AS submodule FROM prgmast p
      LEFT JOIN a_sysmast m ON m.syssno=p.prgmodsno LEFT JOIN a_sysmast s ON s.syssno=p.prgsmdsno
      ORDER BY p.prgmodsno,p.prgsmdsno,p.prgorder,p.prgsno`)).rows);
}));
async function programInput(body: Record<string,unknown>) {
    const module = integer(body.prgmodsno,'Module'), submodule = integer(body.prgsmdsno,'Submodule');
    const valid = await pool.query('SELECT syssno FROM a_sysmast WHERE (syssno=$1 AND sysrtp=32) OR (syssno=$2 AND sysrtp=33)',[module,submodule]);
    if (valid.rowCount !== 2) fail('Choose a valid module and submodule');
    if (!['S','M'].includes(String(body.prglvl))) fail('Choose Single or Multi level');
    return [module,submodule,string(body.prgorder,'Order',5,true),body.prglvl,string(body.prgnam,'Name',35,true),string(body.prgdes,'Description',60,true)];
}
router.post('/programs', wrap(async (req,res) => {
    const values = await programInput(req.body ?? {});
    const r = await pool.query(`INSERT INTO prgmast(prgmodsno,prgsmdsno,prgorder,prglvl,prgnam,prgdes,prgucdnew,prgentddt,prgenttime)
      VALUES($1,$2,$3,$4,$5,$6,$7,CURRENT_DATE,LOCALTIME) RETURNING *`,[...values,req.user!.usr]);
    res.status(201).json(r.rows[0]);
}));
router.put('/programs/:id', wrap(async (req,res) => {
    const id = integer(req.params.id,'Program');
    const values = await programInput(req.body ?? {});
    const r = await pool.query(`UPDATE prgmast SET prgmodsno=$1,prgsmdsno=$2,prgorder=$3,prglvl=$4,prgnam=$5,prgdes=$6,
      prgucdame=$7,prgameddt=CURRENT_DATE,prgametime=LOCALTIME WHERE prgsno=$8 RETURNING *`,[...values,req.user!.usr,id]);
    res.status(r.rowCount ? 200 : 404).json(r.rows[0] ?? {message:'Program not found'});
}));
router.delete('/programs/:id', wrap(async (req,res) => {
    const c = await pool.connect();
    try {
        const id = integer(req.params.id,'Program');
        await c.query('BEGIN');
        await c.query('LOCK TABLE prgmast IN SHARE ROW EXCLUSIVE MODE');
        await c.query('DELETE FROM usrmast WHERE usrprgsno=$1',[id]);
        const r = await c.query('DELETE FROM prgmast WHERE prgsno=$1',[id]);
        await c.query('COMMIT');
        res.status(r.rowCount ? 200 : 404).json({message:r.rowCount ? 'Program deleted' : 'Program not found'});
    } catch(e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
}));
const publicUserColumns = 'usdsno,usdcomsno,usdusd,usduno,usdnam,usdad1,usdad2,usdad3,usdtel,usdfax,usdmail,usdnic,usddes,usdactive';
router.get('/users', wrap(async (_req,res) => {
    res.json((await pool.query(`SELECT ${publicUserColumns} FROM usdmast ORDER BY usdusd`)).rows);
}));
async function userInput(body: Record<string,unknown>, create: boolean) {
    const data: Record<string,unknown> = {};
    for (const [key,max] of Object.entries(userFields)) {
        if (key==='usdusd' && !create) continue;
        data[key] = string(body[key],key,max,key==='usdusd');
    }
    data.usduno = body.usduno === '' || body.usduno == null ? null : integer(body.usduno,'User number',0);
    data.usdcomsno = body.usdcomsno === '' || body.usdcomsno == null ? 0 : integer(body.usdcomsno,'Location');
    if (data.usdcomsno && !(await pool.query('SELECT 1 FROM s_locmast WHERE locsno=$1',[data.usdcomsno])).rowCount) fail('Invalid location');
    if (!['Y','N'].includes(String(body.usdactive ?? 'Y'))) fail('Invalid active status');
    data.usdactive = body.usdactive ?? 'Y';
    if (create || body.usdpwd) {
        if (typeof body.usdpwd !== 'string' || !body.usdpwd.length || body.usdpwd.length > 256) fail('Password is required (maximum 256 characters)');
        data.usdpwd = hashPassword(body.usdpwd);
    }
    return data;
}
router.post('/users', wrap(async (req,res) => {
    const data = await userInput(req.body ?? {},true);
    const keys = Object.keys(data);
    const r = await pool.query(`INSERT INTO usdmast(${keys.join(',')},usducdnew,usdentddt,usdenttime)
      VALUES(${keys.map((_,i)=>`$${i+1}`).join(',')},$${keys.length+1},CURRENT_DATE,LOCALTIME) RETURNING ${publicUserColumns}`,[...Object.values(data),req.user!.usr]);
    res.status(201).json(r.rows[0]);
}));
router.put('/users/:id', wrap(async (req,res) => {
    const id = integer(req.params.id,'User'), data = await userInput(req.body ?? {},false);
    if (data.usdactive==='N' && (await pool.query('SELECT 1 FROM usdmast WHERE usdsno=$1 AND usdadmin=true',[id])).rowCount) fail('Administrator accounts cannot be disabled here');
    const keys=Object.keys(data);
    const r=await pool.query(`UPDATE usdmast SET ${keys.map((k,i)=>`${k}=$${i+1}`).join(',')},usducdame=$${keys.length+1},usdameddt=CURRENT_DATE,usdametime=LOCALTIME WHERE usdsno=$${keys.length+2} RETURNING ${publicUserColumns}`,[...Object.values(data),req.user!.usr,id]);
    res.status(r.rowCount ? 200 : 404).json(r.rows[0] ?? {message:'User not found'});
}));
router.get('/rights/:id', wrap(async (req,res) => {
    const id=integer(req.params.id,'User');
    res.json((await pool.query(`SELECT p.*,m.sysdes AS module,s.sysdes AS submodule,r.usryn,r.usraddyn,r.usrameyn,r.usrdelyn
      FROM prgmast p LEFT JOIN a_sysmast m ON m.syssno=p.prgmodsno LEFT JOIN a_sysmast s ON s.syssno=p.prgsmdsno
      LEFT JOIN usrmast r ON r.usrprgsno=p.prgsno AND r.usrusdsno=$1 ORDER BY p.prgmodsno,p.prgsmdsno,p.prgorder`,[id])).rows);
}));
router.put('/rights/:id', wrap(async (req,res) => {
    const id=integer(req.params.id,'User'), rows=req.body?.rows;
    if (!Array.isArray(rows) || rows.length > 10000) fail('Invalid rights list');
    const ids = rows.map(r=>integer(r?.prgsno,'Program'));
    if (new Set(ids).size !== ids.length) fail('Duplicate programs');
    for (const row of rows) for (const flag of flags) if (!['y','n'].includes(row[flag])) fail('Rights must be y or n');
    const c=await pool.connect();
    try {
        await c.query('BEGIN');
        await c.query('LOCK TABLE prgmast IN SHARE MODE');
        if (!(await c.query('SELECT 1 FROM usdmast WHERE usdsno=$1 FOR UPDATE',[id])).rowCount) fail('User not found');
        const programs = await c.query('SELECT prgsno,prglvl FROM prgmast WHERE prgsno=ANY($1::int[])',[ids]);
        if (programs.rowCount !== ids.length) fail('Program no longer exists; reload');
        for (const row of rows) {
            if (req.body.clear === true) { await c.query('DELETE FROM usrmast WHERE usrusdsno=$1 AND usrprgsno=$2',[id,row.prgsno]); continue; }
            const level = programs.rows.find(p=>p.prgsno===Number(row.prgsno))!.prglvl;
            const values = flags.map((f,i)=>(level==='S' && i>0)||(level==='M' && i===0) ? 'n' : row[f]);
            // Update only selected programs and editable flags; preserve hidden legacy flags and creation audit.
            await c.query(`INSERT INTO usrmast(usrusdsno,usrprgsno,usryn,usraddyn,usrameyn,usrdelyn,usrucdnew,usrentddt,usrenttime)
              VALUES($1,$2,$3,$4,$5,$6,$7,CURRENT_DATE,LOCALTIME) ON CONFLICT(usrusdsno,usrprgsno)
              DO UPDATE SET usryn=$3,usraddyn=$4,usrameyn=$5,usrdelyn=$6,usrucdame=$7,usrameddt=CURRENT_DATE,usrametime=LOCALTIME`,
              [id,row.prgsno,...values,req.user!.usr]);
        }
        await c.query('COMMIT'); res.json({message:`${rows.length} program rights updated`});
    } catch(e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
}));
router.use((err: unknown,_req: import('express').Request,res: import('express').Response,next: import('express').NextFunction) => {
    const e=err as {status?:number;code?:string;message?:string};
    if (e.status===400) { res.status(400).json({message:e.message}); return; }
    if (e.code==='23505') { res.status(409).json({message:'This code or module/submodule/order already exists'}); return; }
    next(err);
});
export default router;
