import { pool } from '../lib/db';
import type { Employee, EmployeeInput, Paged } from '../types';
// employee + department name + location name

const SELECT_JOINED = `
  SELECT e.*, d.depdes AS department_name, l.locnam AS location_name
  FROM p_empmast e
  LEFT JOIN p_depmast d ON d.depsno = e.empdepsno
  LEFT JOIN s_locmast l ON l.locsno = e.emplocsno`;


  export const EmployeeModel = {
    async nextNumber(): Promise<number> {
        const r = await pool.query<{ empeno: number }>(
            'SELECT GREATEST(COALESCE(MAX(empeno), 0), 0) + 1 AS empeno FROM p_empmast',
        );
        return r.rows[0].empeno;
    },

    /** list with search + paging */
    async list(search: string, page: number, limit: number): Promise<Paged<Employee>> {
        const params: unknown[] = [];
        let where = '';
        if (search) {
            params.push(`%${search}%`);
            where = `WHERE (e.empnam ILIKE $1 OR CAST(e.empeno AS TEXT) LIKE $1 OR e.empidno ILIKE $1 OR e.empdesig ILIKE $1)`;
        }
        const count = await pool.query<{
            count: string;
        }>(
            `SELECT COUNT(*) FROM p_empmast e ${where}`, 
            params
        );

        const total = Number(count.rows[0].count);
        
        const rows = await pool.query<Employee>(`${SELECT_JOINED} ${where} ORDER BY e.empeno ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, limit, (page - 1) * limit]);
        
        return { 
            data: rows.rows, 
            total,
            page, 
            limit, 
            totalPages: Math.max(1, Math.ceil(total / limit)) 
        };

    },

    /** Fetch all employees for export and print */
    async all(): Promise<Employee[]> {
        const rows = await pool.query<Employee>(`${SELECT_JOINED} ORDER BY e.empeno ASC`);
        return rows.rows;
    },

    async findById(id: number): Promise<Employee | null> {
        const r = await pool.query<Employee>(`${SELECT_JOINED} WHERE e.empsno = $1`, [id]);
        return r.rows[0] ?? null;
    },

    async findByEmpNo(empeno: number): Promise<{
        empsno: number;
    } | null> {
        const r = await pool.query<{
            empsno: number;
        }>('SELECT empsno FROM p_empmast WHERE empeno = $1', [empeno]);
        return r.rows[0] ?? null;
    },

    async findByMapCode(code: number): Promise<{
        empsno: number;
    } | null> {
        const r = await pool.query<{
            empsno: number;
        }>('SELECT empsno FROM p_empmast WHERE empmapcode = $1', [code]);
        return r.rows[0] ?? null;
    },

    /** column names come from the validator whitelist, values are always parameters */
    async create(data: EmployeeInput): Promise<number> {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            // Allocate and insert under the same lock so simultaneous saves get different numbers.
            await client.query('LOCK TABLE p_empmast IN SHARE ROW EXCLUSIVE MODE');
            const next = await client.query<{ empeno: number }>(
                'SELECT GREATEST(COALESCE(MAX(empeno), 0), 0) + 1 AS empeno FROM p_empmast',
            );

            const generated = { ...data, empeno: next.rows[0].empeno };
            const cols = Object.keys(generated);
            const marks = cols.map((_, i) => `$${i + 1}`);
            const r = await client.query<{ empsno: number }>(
                `INSERT INTO p_empmast (${cols.join(', ')}) VALUES (${marks.join(', ')}) RETURNING empsno`,
                Object.values(generated),
            );

            await client.query('COMMIT');
            return r.rows[0].empsno;

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },
    async update(id: number, data: EmployeeInput): Promise<void> {
        data = { ...data };
        delete data.empeno;
        const cols = Object.keys(data);

        if (cols.length === 0) {
            return;
        }

        const sets = cols.map((c, i) => {
            return `${c} = $${i + 1}`;
        });

        await pool.query(
            `UPDATE p_empmast SET ${sets.join(', ')} WHERE empsno = $${cols.length + 1}`, 
            [ ...Object.values(data),
            id,
        ]);
    },
    async remove(id: number): Promise<void> {
        await pool.query(
            'DELETE FROM p_empmast WHERE empsno = $1', 
            [id]
        );
    },


};
