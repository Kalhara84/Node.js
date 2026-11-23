import { pool } from '../lib/db';
import type { Department, Location, Lookups, SysItem } from '../types';


export const LookupModel = {
    async all(): Promise<Lookups> {
        const [locations, departments, sections, costCenters, basis, areas] = await Promise.all([
            pool.query<Location>('SELECT locsno, locloc, locnam FROM s_locmast ORDER BY locnam'),
            pool.query<Department>(
                'SELECT depsno, depdep, depdes FROM f_depmast ORDER BY depdes'
            ),
            pool.query<SysItem>(
                'SELECT syssno, sysrtp, sysrno, sysdes FROM p_sysmast WHERE sysrtp = 261 ORDER BY sysdes'
            ),
            pool.query<SysItem>(
                'SELECT syssno, sysrtp, sysrno, sysdes FROM p_sysmast WHERE sysrtp = 260 ORDER BY sysrno'
            ),
            pool.query<SysItem>(
                'SELECT syssno, sysrtp, sysrno, sysdes FROM p_sysmast WHERE sysrtp = 200 ORDER BY sysdes'
            ),
            pool.query<SysItem>(
                'SELECT syssno, sysrtp, sysrno, sysdes FROM a_sysmast WHERE sysrtp = 202 ORDER BY sysrno'
            ),
        ]);
        return {
            locations: locations.rows,
            departments: departments.rows,
            sections: sections.rows,
            costCenters: costCenters.rows,
            basis: basis.rows,
            areas: areas.rows,
        };
    },
};
