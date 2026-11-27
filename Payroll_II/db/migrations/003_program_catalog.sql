-- Register missing screens on an existing installation without resetting users or rights.
BEGIN;
SELECT pg_advisory_xact_lock(740219852);
LOCK TABLE a_sysmast, prgmast IN SHARE ROW EXCLUSIVE MODE;

SELECT setval(pg_get_serial_sequence('a_sysmast', 'syssno'),
    GREATEST(COALESCE(MAX(syssno), 0), COALESCE(pg_sequence_last_value(pg_get_serial_sequence('a_sysmast', 'syssno')::regclass), 0), 1), true) FROM a_sysmast;
SELECT setval(pg_get_serial_sequence('prgmast', 'prgsno'),
    GREATEST(COALESCE(MAX(prgsno), 0), COALESCE(pg_sequence_last_value(pg_get_serial_sequence('prgmast', 'prgsno')::regclass), 0), 1), true) FROM prgmast;

INSERT INTO a_sysmast(sysrtp, sysrno, sysdes) VALUES
    (32, 'WEBAPP', 'Payroll Web App'), (33, 'WEBPAGES', 'Application Pages')
ON CONFLICT DO NOTHING;

-- Keep the original ID so any assigned department rights remain attached.
UPDATE prgmast SET prgnam='depm'
WHERE prgapp='payroll-web' AND prgnam='departments'
AND NOT EXISTS (SELECT 1 FROM prgmast WHERE prgapp='payroll-web' AND prgnam='depm');

DO $$
DECLARE
    page record;
    module_id integer;
    submodule_id integer;
    free_order text;
BEGIN
    SELECT syssno INTO STRICT module_id FROM a_sysmast WHERE sysrtp=32 AND sysrno='WEBAPP';
    SELECT syssno INTO STRICT submodule_id FROM a_sysmast WHERE sysrtp=33 AND sysrno='WEBPAGES';
    FOR page IN SELECT * FROM (VALUES
        ('employees', 'Employee Master', 'M'),
        ('users', 'User Master', 'M'),
        ('a_inqempatt', 'Attendance Correction', 'M'),
        ('a_holm', 'Holiday Master', 'M'),
        ('dashboard', 'Dashboard', 'S'),
        ('programs', 'Program Master', 'M'),
        ('rights', 'User Rights', 'M'),
        ('depm', 'Department Master', 'M'),
        ('noptrn', 'Direct Transactions', 'M')
    ) AS pages(name, description, level)
    LOOP
        IF NOT EXISTS (SELECT 1 FROM prgmast WHERE prgapp='payroll-web' AND prgnam=page.name) THEN
            -- Custom programs may already occupy the usual display order.
            SELECT lpad(n::text, GREATEST(3, length(n::text)), '0') INTO free_order
            FROM generate_series(1, 99999) AS numbers(n)
            WHERE NOT EXISTS (SELECT 1 FROM prgmast
                WHERE prgmodsno=module_id AND prgsmdsno=submodule_id
                AND prgorder=lpad(n::text, GREATEST(3, length(n::text)), '0'))
            ORDER BY n LIMIT 1;
            IF free_order IS NULL THEN
                RAISE EXCEPTION 'No free display order for program %', page.name;
            END IF;
            INSERT INTO prgmast(prgmodsno, prgsmdsno, prgorder, prglvl, prgnam, prgdes,
                prgapp, prgucdnew, prgentddt, prgenttime)
            VALUES(module_id, submodule_id, free_order, page.level, page.name, page.description,
                'payroll-web', 'web-setup', CURRENT_DATE, LOCALTIME);
        END IF;
    END LOOP;
END $$;
COMMIT;
