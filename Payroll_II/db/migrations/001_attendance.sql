BEGIN;
CREATE TABLE IF NOT EXISTS "a_denmast" (
  "densno" SERIAL,
  "denddt" date  default NULL,
  "denlocsno" INTEGER NOT NULL default '0',
  "denaresno" INTEGER NOT NULL default '0',
  "dendepsno" INTEGER NOT NULL default '0',
  "denmacsno" INTEGER NOT NULL default '0',
  "denempmapcode" varchar(10) NOT NULL default '',
  "dlyactinhh" INTEGER NOT NULL default '0',
  "dlyactinmm" INTEGER NOT NULL default '0',
  "dlyactouthh" INTEGER NOT NULL default '0',
  "dlyactoutmm" INTEGER NOT NULL default '0',
  "otbftime" DOUBLE PRECISION NOT NULL default '0.00',
  "otaftime" DOUBLE PRECISION NOT NULL default '0.00',
  "denot1" DOUBLE PRECISION NOT NULL default '0.00',
  "denot2" DOUBLE PRECISION NOT NULL default '0.00',
  "dennoot" char(1) NOT NULL default '',
  "dentrf" char(1) NOT NULL default '',
  "denempsno" INTEGER NOT NULL default '0',
  "denattsno" INTEGER NOT NULL default '0',
  "denotdepsno" INTEGER NOT NULL,
  "denucdnew" varchar(12) NOT NULL default '',
  "denentddt" date  default NULL,
  "denenttime" varchar(12) NOT NULL default '',
  "denlatemin" INTEGER NOT NULL default '0',
  "nolatflg" char(1) NOT NULL default '',
  "denpayottrf" char(1) NOT NULL default '',
  "denpaylttrf" char(1) NOT NULL default '',
  "dlyadddecot" varchar(6) NOT NULL default '',
  "denattinctrf" char(1) NOT NULL default '',
  UNIQUE ("densno")
);

ALTER TABLE a_denmast ADD COLUMN IF NOT EXISTS denucdame varchar(30);
ALTER TABLE a_denmast ADD COLUMN IF NOT EXISTS denameddt date;
ALTER TABLE a_denmast ADD COLUMN IF NOT EXISTS denametime time;
CREATE INDEX IF NOT EXISTS a_denmast_employee_month ON a_denmast(denempmapcode, denddt);
SELECT setval(pg_get_serial_sequence('a_denmast', 'densno'),
    GREATEST(COALESCE(MAX(densno), 0), COALESCE(pg_sequence_last_value(pg_get_serial_sequence('a_denmast', 'densno')::regclass), 0), 1), true) FROM a_denmast;
INSERT INTO a_sysmast(sysrtp, sysrno, sysdes) VALUES
    (32, 'WEBAPP', 'Payroll Web App'), (33, 'WEBPAGES', 'Application Pages') ON CONFLICT DO NOTHING;
INSERT INTO prgmast(prgmodsno, prgsmdsno, prgorder, prglvl, prgnam, prgdes, prgapp, prgucdnew, prgentddt, prgenttime)
SELECT m.syssno, s.syssno, '003', 'M', 'a_inqempatt', 'Attendance Correction', 'payroll-web', 'web-setup', CURRENT_DATE, LOCALTIME
FROM a_sysmast m CROSS JOIN a_sysmast s
WHERE m.sysrtp=32 AND m.sysrno='WEBAPP' AND s.sysrtp=33 AND s.sysrno='WEBPAGES'
AND NOT EXISTS (SELECT 1 FROM prgmast WHERE prgapp='payroll-web' AND prgnam='a_inqempatt');
COMMIT;
