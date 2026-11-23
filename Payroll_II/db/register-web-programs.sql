-- Register the two implemented business pages without deleting the old system catalog.
-- Run once on an existing database, or after importing payroll_db.sql on a new database.
BEGIN;
SELECT pg_advisory_xact_lock(740219853);

-- Keep different applications' program catalogs in the same database.
ALTER TABLE prgmast ADD COLUMN IF NOT EXISTS prgapp varchar(30) NOT NULL DEFAULT '';
LOCK TABLE a_sysmast, prgmast, usrmast IN SHARE ROW EXCLUSIVE MODE;
CREATE UNIQUE INDEX IF NOT EXISTS prgmast_web_name ON prgmast(prgapp, prgnam) WHERE prgapp = 'payroll-web';

-- Imported databases may have sequences behind their existing IDs; only advance them.
SELECT setval(pg_get_serial_sequence('a_sysmast', 'syssno'),
    GREATEST(COALESCE(MAX(syssno), 0), COALESCE(pg_sequence_last_value(pg_get_serial_sequence('a_sysmast', 'syssno')::regclass), 0), 1), true) FROM a_sysmast;
SELECT setval(pg_get_serial_sequence('prgmast', 'prgsno'),
    GREATEST(COALESCE(MAX(prgsno), 0), COALESCE(pg_sequence_last_value(pg_get_serial_sequence('prgmast', 'prgsno')::regclass), 0), 1), true) FROM prgmast;
SELECT setval(pg_get_serial_sequence('usrmast', 'usrsno'),
    GREATEST(COALESCE(MAX(usrsno), 0), COALESCE(pg_sequence_last_value(pg_get_serial_sequence('usrmast', 'usrsno')::regclass), 0), 1), true) FROM usrmast;

INSERT INTO a_sysmast(sysrtp, sysrno, sysdes) VALUES
    (32, 'WEBAPP', 'Payroll Web App'),
    (33, 'WEBPAGES', 'Application Pages')
ON CONFLICT DO NOTHING;

DO $$
DECLARE
    page record;
    new_id integer;
    module_id integer;
    submodule_id integer;
BEGIN
    SELECT syssno INTO module_id FROM a_sysmast WHERE sysrtp=32 AND sysrno='WEBAPP';
    SELECT syssno INTO submodule_id FROM a_sysmast WHERE sysrtp=33 AND sysrno='WEBPAGES';

    FOR page IN SELECT * FROM (VALUES
        ('employees', 'Employee Master', '001'),
        ('users', 'User Master', '002')
    ) AS pages(name, description, display_order)
    LOOP
        new_id := NULL;
        INSERT INTO prgmast(prgmodsno, prgsmdsno, prgorder, prglvl, prgnam, prgdes, prgapp, prgucdnew, prgentddt, prgenttime)
        VALUES(module_id, submodule_id, page.display_order, 'M', page.name, page.description, 'payroll-web', 'web-setup', CURRENT_DATE, LOCALTIME)
        ON CONFLICT DO NOTHING RETURNING prgsno INTO new_id;

        -- Copy existing equivalent rights only when the page is first registered.
        -- Running setup again must never restore permissions that an admin later removed.
        IF new_id IS NOT NULL THEN
            INSERT INTO usrmast(usrusdsno, usrprgsno, usryn, usraddyn, usrameyn, usrdelyn, usrucdnew, usrentddt, usrenttime)
            SELECT r.usrusdsno, new_id,
                CASE WHEN bool_or(r.usryn='y' OR (r.usraddyn='y' OR r.usrameyn='y' OR r.usrdelyn='y') AND
                    regexp_replace(p.prgnam, '\.php$', '') = ANY(CASE WHEN page.name='employees' THEN ARRAY['p_empenter','p_empenter1'] ELSE ARRAY['a_users'] END)) THEN 'y' ELSE 'n' END,
                CASE WHEN bool_or(r.usraddyn='y' AND regexp_replace(p.prgnam, '\.php$', '') = ANY(CASE WHEN page.name='employees' THEN ARRAY['p_empenter','p_empenter1'] ELSE ARRAY['a_users'] END)) THEN 'y' ELSE 'n' END,
                CASE WHEN bool_or(r.usrameyn='y' AND regexp_replace(p.prgnam, '\.php$', '') = ANY(CASE WHEN page.name='employees' THEN ARRAY['p_empenter','p_empenter1'] ELSE ARRAY['a_users'] END)) THEN 'y' ELSE 'n' END,
                CASE WHEN bool_or(r.usrdelyn='y' AND regexp_replace(p.prgnam, '\.php$', '') = ANY(CASE WHEN page.name='employees' THEN ARRAY['p_empenter','p_empenter1'] ELSE ARRAY['a_users'] END)) THEN 'y' ELSE 'n' END,
                'web-setup', CURRENT_DATE, LOCALTIME
            FROM usrmast r JOIN prgmast p ON p.prgsno=r.usrprgsno
            WHERE p.prgapp='' AND regexp_replace(p.prgnam, '\.php$', '') = ANY(
                CASE WHEN page.name='employees' THEN ARRAY['p_empm','p_empmastview','p_empm1','p_empenter','p_empenter1'] ELSE ARRAY['a_users'] END)
            GROUP BY r.usrusdsno
            ON CONFLICT(usrusdsno, usrprgsno) DO NOTHING;
        END IF;
    END LOOP;
END $$;
COMMIT;
