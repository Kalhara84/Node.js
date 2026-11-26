BEGIN;
CREATE TABLE IF NOT EXISTS "a_holmast" (
  "holsno" SERIAL,
  "holddt" date  default NULL,
  "holtypsno" INTEGER NOT NULL default '0',
  "holucdnew" varchar(30) NOT NULL default '',
  "holentddt" date  default NULL,
  "holenttime" time NOT NULL default '00:00:00',
  "holucdame" varchar(30) NOT NULL default '',
  "holameddt" date  default NULL,
  "holametime" time NOT NULL default '00:00:00',
  "holotrate" DOUBLE PRECISION NOT NULL default '0.00',
  UNIQUE ("holsno")
);
-- Preserve existing holidays; conflicting legacy dates must be resolved explicitly.
CREATE UNIQUE INDEX IF NOT EXISTS a_holmast_unique_date ON a_holmast(holddt);
SELECT setval(pg_get_serial_sequence('a_holmast', 'holsno'),
    GREATEST(COALESCE(MAX(holsno), 0), COALESCE(pg_sequence_last_value(pg_get_serial_sequence('a_holmast', 'holsno')::regclass), 0), 1), true) FROM a_holmast;
INSERT INTO a_sysmast(sysrtp, sysrno, sysdes) VALUES
    (32, 'WEBAPP', 'Payroll Web App'), (33, 'WEBPAGES', 'Application Pages') ON CONFLICT DO NOTHING;
INSERT INTO prgmast(prgmodsno, prgsmdsno, prgorder, prglvl, prgnam, prgdes, prgapp, prgucdnew, prgentddt, prgenttime)
SELECT m.syssno, s.syssno, '004', 'M', 'a_holm', 'Holiday Master', 'payroll-web', 'web-setup', CURRENT_DATE, LOCALTIME
FROM a_sysmast m CROSS JOIN a_sysmast s
WHERE m.sysrtp=32 AND m.sysrno='WEBAPP' AND s.sysrtp=33 AND s.sysrno='WEBPAGES'
AND NOT EXISTS (SELECT 1 FROM prgmast WHERE prgapp='payroll-web' AND prgnam='a_holm');
COMMIT;
