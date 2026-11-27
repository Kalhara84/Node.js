-- PostgreSQL schema and data for Payroll_II application tables only.
-- Drops and recreates only the 8 tables required by the backend.
BEGIN;
SET standard_conforming_strings = on;
SELECT pg_advisory_xact_lock(740219852);

-- Drop application tables if they exist (reverse dependency order)
DROP TABLE IF EXISTS "usrmast" CASCADE;
DROP TABLE IF EXISTS "usdmast" CASCADE;
DROP TABLE IF EXISTS "prgmast" CASCADE;
DROP TABLE IF EXISTS "p_empmast" CASCADE;
DROP TABLE IF EXISTS "s_locmast" CASCADE;
DROP TABLE IF EXISTS "p_depmast" CASCADE;
DROP TABLE IF EXISTS "p_sysmast" CASCADE;
DROP TABLE IF EXISTS "a_sysmast" CASCADE;

CREATE TABLE IF NOT EXISTS "a_sysmast" (
  "syssno" SERIAL,
  "sysrtp" INTEGER NOT NULL default '0',
  "sysrno" varchar(10) NOT NULL default '',
  "sysdes" varchar(40) NOT NULL default '',
  "sysdes1" varchar(40) default NULL,
  "sysdes2" varchar(30) default NULL,
  "syscomsno" INTEGER default NULL,
  "sysucdnew" varchar(30) default NULL,
  "sysentddt" date default NULL,
  "sysenttime" time default NULL,
  "sysucdame" varchar(30) default NULL,
  "sysameddt" date default NULL,
  "sysametime" time default NULL,
  PRIMARY KEY  ("sysrtp","sysrno"),
  UNIQUE ("syssno")
);

-- a_sysmast: 50 original source rows.
INSERT INTO "a_sysmast" ("syssno","sysrtp","sysrno","sysdes","sysdes1","sysdes2","syscomsno","sysucdnew","sysentddt","sysenttime","sysucdame","sysameddt","sysametime") VALUES
(1,1,E'1',E'Ab Sent',E'Leave type',NULL,1,E'2000',E'2010-02-26',E'19:38:57',E'2000',E'2012-03-06',E'18:46:19'),
(2,1,E'2',E'Annual',E'Leave type',NULL,1,E'2000',E'2010-02-26',E'19:39:08',E'2000',E'2012-03-06',E'18:46:42'),
(3,1,E'3',E'Casual',E'Leave type',NULL,1,E'2000',E'2010-02-26',E'19:39:17',E'2000',E'2012-03-06',E'18:46:52'),
(4,1,E'4',E'Lieu Leave',E'Leave type',NULL,1,E'2000',E'2010-02-26',E'19:39:27',E'2000',E'2012-03-06',E'18:47:20'),
(5,1,E'5',E'Nopay',E'Leave type',NULL,1,E'2000',E'2010-02-26',E'19:39:36',E'2000',E'2012-03-06',E'18:47:34'),
(6,2,E'1',E'1',E'Shift 1',NULL,1,E'2000',E'2010-02-26',E'19:41:31',E'2000',E'2010-02-26',E'19:46:16'),
(7,2,E'2',E'2',E'Shift 2',NULL,1,E'2000',E'2010-02-26',E'19:41:51',E'2000',E'2010-02-26',E'19:46:21'),
(8,3,E'1',E'Poya Day',E'Holiday  type',NULL,1,E'2000',E'2010-03-01',E'18:50:53',E'2000',E'2012-03-22',E'10:48:41'),
(9,3,E'2',E'Mercantile Holiday day',E'Holiday  type',NULL,1,E'2000',E'2010-03-01',E'18:51:09',E'2000',E'2012-03-22',E'10:49:34'),
(10,3,E'3',E'Satatutory leave',E'Holiday type',NULL,1,E'2000',E'2010-03-01',E'18:51:55',E'2000',E'2012-03-22',E'10:49:51'),
(11,3,E'4',E'Public Holiday',E'Holiday  type',NULL,1,E'2000',E'2010-03-01',E'18:52:17',E'2000',E'2012-03-22',E'10:50:13'),
(12,3,E'5',E'Public and Bank Holiday',E'Holiday type',NULL,1,E'2000',E'2010-03-01',E'18:52:35',E'2000',E'2012-03-22',E'10:50:26'),
(13,65,E'1',E'7',E'Workers annual leave',NULL,1,E'2000',E'2010-03-01',E'18:59:59',NULL,NULL,NULL),
(14,65,E'2',E'10',E'Workers medical leave',NULL,1,E'2000',E'2010-03-01',E'19:00:13',NULL,NULL,NULL),
(15,65,E'3',E'10',E'Workers casual leave',NULL,1,E'2000',E'2010-03-01',E'19:01:19',NULL,NULL,NULL),
(16,65,E'4',E'7',E'Staff annual leave',NULL,1,E'2000',E'2010-03-01',E'19:01:46',NULL,NULL,NULL),
(17,65,E'5',E'10',E'Staff medical leave',NULL,1,E'2000',E'2010-03-01',E'19:02:04',NULL,NULL,NULL),
(18,65,E'6',E'10',E'Staff casual leave',NULL,1,E'2000',E'2010-03-01',E'19:02:27',NULL,NULL,NULL),
(19,1,E'6',E'Medical',E'Leave type',NULL,1,E'2000',E'2010-03-02',E'17:26:24',E'2000',E'2012-03-06',E'18:47:57'),
(20,200,E'1',E'Casual',E'',NULL,1,E'2000',E'2010-03-02',E'18:55:27',NULL,NULL,NULL),
(21,200,E'2',E'Permanent',E'',NULL,1,E'2000',E'2010-03-02',E'18:57:10',NULL,NULL,NULL),
(22,19,E'01',E'JAN',NULL,E'',1,NULL,NULL,NULL,NULL,NULL,NULL),
(23,19,E'02',E'FEB',NULL,E'',1,NULL,NULL,NULL,NULL,NULL,NULL),
(24,19,E'03',E'MAR',NULL,E'',1,NULL,NULL,NULL,NULL,NULL,NULL),
(25,19,E'04',E'APR',NULL,E'',1,NULL,NULL,NULL,NULL,NULL,NULL),
(26,19,E'05',E'MAY',NULL,E'',1,NULL,NULL,NULL,NULL,NULL,NULL),
(27,19,E'06',E'JUN',NULL,E'',1,NULL,NULL,NULL,NULL,NULL,NULL),
(28,19,E'07',E'JUL',NULL,E'',1,NULL,NULL,NULL,NULL,NULL,NULL),
(29,19,E'08',E'AUG',NULL,E'',1,NULL,NULL,NULL,NULL,NULL,NULL),
(30,19,E'09',E'SEP',NULL,E'',1,NULL,NULL,NULL,NULL,NULL,NULL),
(31,19,E'10',E'OCT',NULL,E'',1,NULL,NULL,NULL,NULL,NULL,NULL),
(32,19,E'11',E'NOV',NULL,E'',1,NULL,NULL,NULL,NULL,NULL,NULL),
(33,19,E'12',E'DEC',NULL,E'',1,NULL,NULL,NULL,NULL,NULL,NULL),
(34,10,E'01',E'15',NULL,E'',1,NULL,NULL,NULL,NULL,NULL,NULL),
(35,26,E'01',E'M',NULL,E'',1,NULL,NULL,NULL,NULL,NULL,NULL),
(36,9,E'01',E'9',NULL,E'',1,NULL,NULL,NULL,NULL,NULL,NULL),
(37,201,E'1',E'Rabukkana',E'Print Mac',NULL,1,E'2000',E'2012-03-19',E'11:44:08',NULL,NULL,NULL),
(38,201,E'2',E'Rabukkana',E'Print Mac',NULL,1,E'2000',E'2012-03-19',E'11:44:18',NULL,NULL,NULL),
(39,201,E'3',E'Nawala',E'',NULL,1,E'2000',E'2012-03-19',E'11:44:39',NULL,NULL,NULL),
(40,201,E'4',E'Nawala',E'',NULL,1,E'2000',E'2012-03-19',E'11:44:52',NULL,NULL,NULL),
(41,202,E'1',E'Rabukkana',E'',NULL,1,E'2000',E'2012-03-20',E'09:27:52',NULL,NULL,NULL),
(42,202,E'2',E'Nawala',E'',NULL,1,E'2000',E'2012-03-20',E'09:28:00',NULL,NULL,NULL),
(43,3,E'6',E'Sat',E'Holiday type',NULL,1,E'2000',E'2012-03-06',E'10:12:45',E'2000',E'2012-03-06',E'10:13:58'),
(44,3,E'7',E'Sun',E'Holiday type',NULL,1,E'2000',E'2012-03-06',E'10:13:01',E'2000',E'2012-03-06',E'10:14:06'),
(45,1,E'7',E'Aditional Holiday',E'Leave type',NULL,1,E'2000',E'2012-03-06',E'18:48:35',NULL,NULL,NULL),
(46,1,E'8',E'Special',E'Leave type',NULL,1,E'2000',E'2012-03-06',E'18:48:54',NULL,NULL,NULL),
(47,1,E'9',E'visits',E'Leave type',NULL,1,E'2000',E'2012-03-06',E'18:49:38',NULL,NULL,NULL),
(48,1,E'10',E'Short leave',E'Leave type',NULL,1,E'2000',E'2012-03-06',E'18:53:31',NULL,NULL,NULL),
(49,1,E'11',E'Half Day',E'Leave type',NULL,1,E'2000',E'2012-03-06',E'18:53:53',NULL,NULL,NULL),
(50,33,E'1',E'MASTER FILE',E'',NULL,0,E'2000',E'2012-10-05',E'10:08:56',NULL,NULL,NULL)
ON CONFLICT DO NOTHING;

-- Keep generated IDs above imported IDs without rewinding existing sequences.
SELECT setval(pg_get_serial_sequence('a_sysmast', 'syssno'),
  GREATEST(COALESCE(MAX("syssno"), 1), COALESCE((SELECT last_value FROM pg_sequences
    WHERE schemaname = current_schema() AND sequencename = 'a_sysmast_syssno_seq'), 1)),
  MAX("syssno") IS NOT NULL) FROM "a_sysmast";

CREATE TABLE IF NOT EXISTS "p_sysmast" (
  "syssno" SERIAL,
  "sysrtp" INTEGER NOT NULL default '0',
  "sysrno" varchar(10) NOT NULL default '',
  "sysdes" varchar(40) NOT NULL default '',
  "sysdes1" varchar(40) default NULL,
  "sysdes2" varchar(30) default NULL,
  "sysdes3" varchar(50) NOT NULL DEFAULT '',
  "syscomsno" INTEGER default NULL,
  "sysucdnew" varchar(30) default NULL,
  "sysentddt" date default NULL,
  "sysenttime" time default NULL,
  "sysucdame" varchar(30) default NULL,
  "sysameddt" date default NULL,
  "sysametime" time default NULL,
  PRIMARY KEY  ("sysrtp","sysrno"),
  UNIQUE ("syssno")
);

-- p_sysmast: 50 original source rows.
INSERT INTO "p_sysmast" ("syssno","sysrtp","sysrno","sysdes","sysdes1","sysdes2","sysdes3","syscomsno","sysucdnew","sysentddt","sysenttime","sysucdame","sysameddt","sysametime") VALUES
(61,2,E'080',E'FESTIVAL ADVANCE',E'',NULL,E'',1,E'2000',E'2008-01-15',E'14:07:01',NULL,NULL,NULL),
(156,4,E'001',E'BASIC SALARY',E'',E'',E'',1,E'2000',E'2008-04-03',E'12:18:50',E'nathasha',E'2025-02-10',E'07:13:50'),
(157,4,E'005',E'OT - NORMAL',E'',E'',E'',1,E'2000',E'2008-04-03',E'12:19:25',E'nathasha',E'2025-02-10',E'07:13:50'),
(158,4,E'006',E'OT - DOUBLE',E'',E'',E'',1,E'2000',E'2008-04-03',E'12:19:40',E'nathasha',E'2025-02-10',E'07:13:50'),
(685,9,E'013',E'OTHER INCE',E'',E'',E'',1,E'2000',E'2012-05-07',E'10:59:09',E'2000',E'2025-04-09',E'18:27:45'),
(684,9,E'012',E'MISCANTHUS INC',E'',E'',E'',1,E'2000',E'2012-05-07',E'10:58:39',E'2000',E'2025-04-09',E'18:27:45'),
(683,9,E'011',E'SPRAY INCE',E'',E'',E'',1,E'2000',E'2012-05-07',E'10:58:08',E'2000',E'2025-04-09',E'18:27:45'),
(682,9,E'010',E'NIGHT INCE',E'',E'',E'',1,E'2000',E'2012-05-07',E'10:57:49',E'2000',E'2025-04-09',E'18:27:45'),
(719,4,E'065',E'ELECTRICITY',E'',E'',E'',1,E'hrd',E'2012-05-10',E'16:17:06',E'nathasha',E'2025-02-10',E'07:13:50'),
(720,9,E'065',E'ELECTRI',E'',E'',E'',0,E'hrd',E'2012-05-10',E'16:17:22',E'2000',E'2025-04-09',E'18:27:45'),
(159,4,E'051',E'EPF - 8%',E'',E'',E'',1,E'2000',E'2008-04-03',E'12:20:24',E'nathasha',E'2025-02-10',E'07:13:50'),
(161,4,E'054',E'NO PAY AMOUNT',E'',E'',E'',1,E'2000',E'2008-04-03',E'12:21:15',E'nathasha',E'2025-02-10',E'07:13:50'),
(275,4,E'055',E'SALARY ADVANCE PAYEMENT',E'',E'',E'',1,E'2000',E'2008-12-09',E'16:17:05',E'nathasha',E'2025-02-10',E'07:13:50'),
(463,4,E'056',E'W/SHOP',E'',E'',E'',1,E'2000',E'2010-03-12',E'17:13:51',E'nathasha',E'2025-02-10',E'07:13:50'),
(239,4,E'060',E'FINE',E'',E'',E'',1,E'2000',E'2008-04-22',E'13:09:45',E'nathasha',E'2025-02-10',E'07:13:50'),
(260,4,E'061',E'P.A.Y.E. (REGULAR)',E'',E'',E'',1,E'2000',E'2008-11-19',E'12:31:33',E'nathasha',E'2025-02-10',E'07:13:50'),
(392,4,E'062',E'OTHER DEC',E'',E'',E'',1,E'2000',E'2009-03-17',E'13:00:12',E'nathasha',E'2025-02-10',E'07:13:50'),
(250,4,E'080',E'FESTIVAL ADVANCE',E'',E'',E'',1,E'2000',E'2008-04-22',E'18:29:00',E'nathasha',E'2025-02-10',E'07:13:50'),
(167,4,E'090',E'LAST MONTH COIN',E'',E'',E'',1,E'2000',E'2008-04-03',E'12:32:49',E'nathasha',E'2025-02-10',E'07:13:50'),
(168,4,E'091',E'THIS MONTH COIN',E'',E'',E'',1,E'2000',E'2008-04-03',E'12:33:09',E'nathasha',E'2025-02-10',E'07:13:50'),
(112,4,E'092',E'NET PAY',E'',E'',E'',1,E'2000',E'2008-01-21',E'20:10:37',E'nathasha',E'2025-02-10',E'07:13:50'),
(258,4,E'093',E'Com ETF  - 3%',E'',E'',E'',1,E'2000',E'2008-09-01',E'10:51:35',E'nathasha',E'2025-02-10',E'07:13:50'),
(249,4,E'094',E'Com EPF - 12%',E'',E'',E'',1,E'2000',E'2008-04-22',E'18:09:09',E'nathasha',E'2025-02-10',E'07:13:50'),
(418,4,E'101',E'EPF GROSS',E'',E'',E'',1,NULL,NULL,NULL,E'nathasha',E'2025-02-10',E'07:13:50'),
(419,4,E'102',E'GROSS - TAX REGULAR',E'',E'',E'',1,NULL,NULL,NULL,E'nathasha',E'2025-02-10',E'07:13:50'),
(420,4,E'103',E'GROSS - TAX LUMPSUM',E'',E'',E'',1,NULL,NULL,NULL,E'nathasha',E'2025-02-10',E'07:13:50'),
(421,4,E'105',E'TAX DIRECTION (RELIEF)',E'',E'',E'',1,NULL,NULL,NULL,E'nathasha',E'2025-02-10',E'07:13:50'),
(177,4,E'110',E'OT MIN - NORMAL',E'',E'',E'',1,E'2000',E'2008-04-03',E'12:36:48',E'nathasha',E'2025-02-10',E'07:13:50'),
(178,4,E'111',E'OT MIN - DOUBLE',E'',E'',E'',1,E'2000',E'2008-04-03',E'12:37:02',E'nathasha',E'2025-02-10',E'07:13:50'),
(179,4,E'112',E'NO PAY DAYS (PAY)',E'',E'',E'',1,E'2000',E'2008-04-03',E'12:37:15',E'nathasha',E'2025-02-10',E'07:13:50'),
(467,4,E'114',E'NO PAY HOURS',E'',E'',E'',1,E'2000',E'2010-03-12',E'17:32:35',E'nathasha',E'2025-02-10',E'07:13:50'),
(490,9,E'061',E'P.A.Y.E. TAX',E'',E'',E'',1,E'2000',E'2008-11-19',E'12:31:33',E'2000',E'2025-04-09',E'18:27:45'),
(203,6,E'001',E'12',E'',E'',E'',1,E'2000',E'2008-04-08',E'11:09:19',E'2000',E'2010-03-12',E'17:56:27'),
(204,6,E'002',E'8',E'',E'',E'',1,E'2000',E'2008-04-08',E'11:09:26',E'2000',E'2010-03-12',E'17:56:41'),
(205,6,E'003',E'3',E'',NULL,E'',1,E'2000',E'2008-04-08',E'11:09:34',NULL,NULL,NULL),
(206,6,E'004',E'18',E'',NULL,E'',1,E'2000',E'2008-04-08',E'11:09:44',NULL,NULL,NULL),
(117,7,E'001',E'2026-08-01',E'',E'',E'',1,E'2000',E'2008-01-29',E'11:11:46',E'nathasha',E'2026-08-20',E'17:50:15'),
(143,7,E'002',E'31',E'',E'',E'',1,E'2000',E'2008-02-15',E'12:05:44',E'2000',E'2010-03-15',E'14:29:01'),
(118,8,E'001',E'2000',E'',NULL,E'',1,E'2000',E'2008-01-31',E'18:47:53',E'2000',E'2008-02-13',E'14:08:56'),
(137,8,E'002',E'1000',E'',NULL,E'',1,E'2000',E'2008-02-13',E'14:22:43',NULL,NULL,NULL),
(138,8,E'003',E'500',E'',NULL,E'',1,E'2000',E'2008-02-13',E'14:23:02',NULL,NULL,NULL),
(139,8,E'004',E'100',E'',NULL,E'',1,E'2000',E'2008-02-13',E'14:23:14',NULL,NULL,NULL),
(140,8,E'005',E'50',E'',NULL,E'',1,E'2000',E'2008-02-13',E'14:23:25',NULL,NULL,NULL),
(141,8,E'006',E'20',E'',NULL,E'',1,E'2000',E'2008-02-13',E'14:23:35',NULL,NULL,NULL),
(142,8,E'007',E'10',E'',NULL,E'',1,E'2000',E'2008-02-13',E'14:23:44',NULL,NULL,NULL),
(243,8,E'008',E'5',E'',NULL,E'',1,E'2000',E'2008-04-22',E'17:10:26',E'2000',E'2008-04-24',E'10:14:39'),
(251,8,E'009',E'2',E'',NULL,E'',1,E'2000',E'2008-04-24',E'10:14:52',NULL,NULL,NULL),
(252,8,E'010',E'1',E'',NULL,E'',1,E'2000',E'2008-04-24',E'10:15:02',NULL,NULL,NULL),
(489,9,E'060',E'FINE',E'',E'',E'',1,E'2000',E'2008-04-22',E'13:09:45',E'2000',E'2025-04-09',E'18:27:45'),
(488,9,E'056',E'W/SHOP',E'',E'',E'',1,E'2000',E'2010-03-12',E'17:13:51',E'2000',E'2025-04-09',E'18:27:45')
ON CONFLICT DO NOTHING;

-- Keep generated IDs above imported IDs without rewinding existing sequences.
SELECT setval(pg_get_serial_sequence('p_sysmast', 'syssno'),
  GREATEST(COALESCE(MAX("syssno"), 1), COALESCE((SELECT last_value FROM pg_sequences
    WHERE schemaname = current_schema() AND sequencename = 'p_sysmast_syssno_seq'), 1)),
  MAX("syssno") IS NOT NULL) FROM "p_sysmast";

CREATE TABLE IF NOT EXISTS "p_depmast" (
  "depsno" SERIAL,
  "depdep" varchar(6) NOT NULL default '',
  "depdes" varchar(30) default NULL,
  "depscgpcn" DOUBLE PRECISION default NULL,
  "depvatpcn" DOUBLE PRECISION default NULL,
  "deprsvpcn" DOUBLE PRECISION default NULL,
  "depoutbilyn" char(1) default NULL,
  "depucdnew" varchar(30) default NULL,
  "depentddt" date default NULL,
  "depenttime" time default NULL,
  "depucdame" varchar(30) default NULL,
  "depameddt" date default NULL,
  "depametime" time default NULL,
  PRIMARY KEY  ("depdep"),
  UNIQUE ("depsno")
);

-- p_depmast: 47 original source rows.
INSERT INTO "p_depmast" ("depsno","depdep","depdes","depscgpcn","depvatpcn","deprsvpcn","depoutbilyn","depucdnew","depentddt","depenttime","depucdame","depameddt","depametime") VALUES
(1,E'Accoun',E'Accounts',0.00,0.00,0.00,E'',E'2000',E'2012-03-04',E'18:42:00',E'',E'2012-05-08',E'11:18:47'),
(2,E'NURSER',E'NURSERY STAFF',NULL,NULL,NULL,NULL,E'2000',E'2012-03-19',E'10:15:03',NULL,NULL,NULL),
(3,E'LABOUR',E'LABOURERS',NULL,NULL,NULL,NULL,E'2000',E'2012-03-19',E'10:15:03',NULL,NULL,NULL),
(4,E'SECURI',E'SECURITY',NULL,NULL,NULL,NULL,E'2000',E'2012-03-19',E'10:15:03',NULL,NULL,NULL),
(5,E'DRIVER',E'DRIVERS',NULL,NULL,NULL,NULL,E'2000',E'2012-03-19',E'10:15:03',NULL,NULL,NULL),
(6,E'HEAD O',E'HEAD OFFICE',NULL,NULL,NULL,NULL,E'2000',E'2012-03-19',E'10:15:03',NULL,NULL,NULL),
(7,E'MAINTE',E'MAINTENANCE',NULL,NULL,NULL,NULL,E'2000',E'2012-03-19',E'10:15:03',NULL,NULL,NULL),
(8,E'TEAM L',E'TEAM LEADER',NULL,NULL,NULL,NULL,E'2000',E'2012-03-19',E'10:15:03',NULL,NULL,NULL),
(9,E'CASUAL',E'CASUAL FIELD ASSISTANT',NULL,NULL,NULL,NULL,E'2000',E'2012-03-19',E'10:15:03',NULL,NULL,NULL),
(10,E'MASON',E'MASON BASS',NULL,NULL,NULL,NULL,E'2000',E'2012-03-19',E'10:15:21',NULL,NULL,NULL),
(11,E'STAFF',E'STAFF',NULL,NULL,NULL,NULL,E'2000',E'2012-03-19',E'10:15:21',NULL,NULL,NULL),
(12,E'MECHAN',E'MECHANIC',NULL,NULL,NULL,NULL,E'2000',E'2012-03-19',E'10:15:21',NULL,NULL,NULL),
(13,E'ELECTR',E'ELECTRICIAN',NULL,NULL,NULL,NULL,E'2000',E'2012-03-19',E'10:15:21',NULL,NULL,NULL),
(14,E'KITCHE',E'KITCHEN',NULL,NULL,NULL,NULL,E'2000',E'2012-03-19',E'10:15:21',NULL,NULL,NULL),
(15,E'CONTRA',E'CONTRACT SEQURITY',NULL,NULL,NULL,NULL,E'2000',E'2012-03-19',E'10:15:21',NULL,NULL,NULL),
(16,E'ADMINI',E'ADMINISTRATION',NULL,NULL,NULL,NULL,E'2000',E'2012-03-19',E'10:15:32',NULL,NULL,NULL),
(17,E'CAD TE',E'CAD TECHNISIONS',NULL,NULL,NULL,NULL,E'2000',E'2012-03-19',E'10:15:32',NULL,NULL,NULL),
(18,E'DRAUGH',E'DRAUGHTSMAN  DPT',NULL,NULL,NULL,NULL,E'2000',E'2012-03-19',E'10:15:32',NULL,NULL,NULL),
(19,E'QUANTI',E'QUANTITY SURVEYOR  DPT',NULL,NULL,NULL,NULL,E'2000',E'2012-03-19',E'10:15:32',NULL,NULL,NULL),
(20,E'SITE W',E'SITE WORKS',NULL,NULL,NULL,NULL,E'2000',E'2012-03-19',E'10:15:32',NULL,NULL,NULL),
(21,E'ASSOCI',E'ASSOCIATES',NULL,NULL,NULL,NULL,E'2000',E'2012-03-19',E'10:15:32',NULL,NULL,NULL),
(22,E'ARCHIT',E'ARCHITECT DPT',NULL,NULL,NULL,NULL,E'2000',E'2012-03-19',E'10:15:32',NULL,NULL,NULL),
(23,E'ARCHI',E'ARCHI ASSISTANT',NULL,NULL,NULL,NULL,E'2000',E'2012-03-19',E'10:15:32',NULL,NULL,NULL),
(24,E'DIRECT',E'DIRECTORS',NULL,NULL,NULL,NULL,E'2000',E'2012-03-19',E'10:15:32',NULL,NULL,NULL),
(25,E'ENGINE',E'ENGINEERS-SITE',NULL,NULL,NULL,NULL,E'2000',E'2012-03-19',E'10:15:32',NULL,NULL,NULL),
(26,E'SALES',E'SALES DEPARTMENT',NULL,NULL,NULL,NULL,E'2000',E'2012-03-19',E'10:15:40',NULL,NULL,NULL),
(27,E'FAS',E'Field Assistant',0.00,0.00,0.00,E'',E'',E'2012-03-20',E'10:50:48',NULL,NULL,NULL),
(28,E'ASM',E'ASSISTANT MANAGER',0.00,0.00,0.00,E'',E'',E'2012-03-20',E'11:06:47',NULL,NULL,NULL),
(29,E'TEM',E'TEMPARY',0.00,0.00,0.00,E'',E'',E'2012-03-20',E'15:56:47',NULL,NULL,NULL),
(30,E'LABSUP',E'LAB SUPERVISER',0.00,0.00,0.00,E'',E'',E'2012-03-23',E'10:49:06',NULL,NULL,NULL),
(31,E'R&D',E'RESEARCH & DEVELOPMENT',0.00,0.00,0.00,E'',E'',E'2012-03-23',E'12:23:48',NULL,NULL,NULL),
(32,E'LABASS',E'LAB ASSISTANT',0.00,0.00,0.00,E'',E'',E'2012-03-23',E'12:26:15',NULL,NULL,NULL),
(33,E'PROD',E'PRODUCTION',0.00,0.00,0.00,E'',E'',E'2012-03-23',E'12:40:30',NULL,NULL,NULL),
(34,E'GARDEN',E'SUPERVISER',0.00,0.00,0.00,E'',E'',E'2012-03-23',E'12:53:22',NULL,NULL,NULL),
(35,E'MAN',E'MANAGER',0.00,0.00,0.00,E'',E'',E'2012-03-23',E'16:25:23',NULL,NULL,NULL),
(36,E'TEM -1',E'TEMPARY-1',0.00,0.00,0.00,E'',E'',E'2012-04-20',E'14:52:38',NULL,NULL,NULL),
(37,E'CON',E'CONTRACT',0.00,0.00,0.00,E'',E'',E'2012-05-03',E'16:56:24',NULL,NULL,NULL),
(38,E'SAASS',E'SALES ASSISTANT',0.00,0.00,0.00,E'',E'',E'2012-05-07',E'11:58:12',NULL,NULL,NULL),
(39,E'PRO',E'PRODUCTION MANAGER',0.00,0.00,0.00,E'',E'',E'2012-05-18',E'12:34:12',NULL,NULL,NULL),
(40,E'CHEMI',E'CHEMICAL SPRAYING',0.00,0.00,0.00,E'',E'',E'2012-09-04',E'12:53:14',NULL,NULL,NULL),
(41,E'DAPAID',E'DAILY PAID',0.00,0.00,0.00,E'',E'',E'2012-11-14',E'10:40:41',NULL,NULL,NULL),
(300,E'FIELD',E'FIELD',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
(301,E'LAB',E'LAB',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
(333,E'TRANSP',E'TRANSPORT',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
(334,E'STORES',E'STORES',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
(335,E'PACKIN',E'PACKING',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
(336,E'OFFASS',E'OFFICE ASSISTANT',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL)
ON CONFLICT DO NOTHING;

-- Keep generated IDs above imported IDs without rewinding existing sequences.
SELECT setval(pg_get_serial_sequence('p_depmast', 'depsno'),
  GREATEST(COALESCE(MAX("depsno"), 1), COALESCE((SELECT last_value FROM pg_sequences
    WHERE schemaname = current_schema() AND sequencename = 'p_depmast_depsno_seq'), 1)),
  MAX("depsno") IS NOT NULL) FROM "p_depmast";

CREATE TABLE IF NOT EXISTS "s_locmast" (
  "locsno" SERIAL,
  "locloc" varchar(6) NOT NULL default '',
  "locnam" varchar(50) default NULL,
  "loctyp" varchar(20) default NULL,
  "locad1" varchar(20) NOT NULL default '',
  "locad2" varchar(20) NOT NULL default '',
  "locad3" varchar(20) NOT NULL default '',
  "locad4" varchar(20) NOT NULL default '',
  "loctelno" varchar(20) NOT NULL default '',
  "locfaxno" varchar(20) NOT NULL default '',
  "locemail" varchar(20) NOT NULL default '',
  "locucdnew" varchar(10) default NULL,
  "locentddt" date default NULL,
  "locenttime" time default NULL,
  "locucdame" varchar(30) default NULL,
  "locameddt" date default NULL,
  "locametime" time default NULL,
  "locshlmin" DOUBLE PRECISION NOT NULL default '0.00',
  "locepfreg" varchar(15) NOT NULL default '',
  "loctinno" varchar(10) NOT NULL default '',
  "zone" varchar(5) default NULL,
  "employeer_no" INTEGER default NULL,
  "pay_mode" INTEGER default NULL,
  "Dic_off_code" INTEGER default NULL,
  "bank_code" INTEGER default NULL,
  "branch_code" INTEGER default NULL,
  "acc_no" INTEGER default NULL,
  PRIMARY KEY  ("locloc"),
  UNIQUE ("locsno")
);

-- s_locmast: 8 original source rows.
INSERT INTO "s_locmast" ("locsno","locloc","locnam","loctyp","locad1","locad2","locad3","locad4","loctelno","locfaxno","locemail","locucdnew","locentddt","locenttime","locucdame","locameddt","locametime","locshlmin","locepfreg","loctinno","zone","employeer_no","pay_mode","Dic_off_code","bank_code","branch_code","acc_no") VALUES
(1,E'MIKEFL',E'MIKE FLORA (PVT) LTD',E'',E'',E'',E'',E'',E'',E'',E'',E'',NULL,E'00:00:00',E'',NULL,E'00:00:00',120.00,E'B014659',E'104064655',E'B',14659,4,11,7135,1,123456),
(2,E'MKA',E'MIHIDU KEERTHIRATHNE',E'',E'',E'',E'',E'',E'',E'',E'',NULL,NULL,NULL,NULL,NULL,NULL,120.00,E'',E'',NULL,NULL,NULL,NULL,NULL,NULL,NULL),
(3,E'BIOTEC',E'MIKE BIOTECH ASIA  (PVT) LTD',NULL,E'',E'',E'',E'',E'',E'',E'',NULL,NULL,NULL,NULL,NULL,NULL,120.00,E'A038552',E'114364584',E'A',38552,NULL,NULL,NULL,NULL,NULL),
(4,E'MIKINT',E'MIKE FLORA INTERNATIONAL (PVT) LTD',NULL,E'',E'',E'',E'',E'',E'',E'',NULL,NULL,NULL,NULL,NULL,NULL,120.00,E'A021242',E'114034363',E'A',21242,NULL,NULL,NULL,NULL,NULL),
(5,E'UNI',E'MIKE UNIPAR ENERGY SYS (PVT) LTD',NULL,E'',E'',E'',E'',E'',E'',E'',NULL,NULL,NULL,NULL,NULL,NULL,120.00,E'A038881',E'',E'A',38881,NULL,NULL,NULL,NULL,NULL),
(6,E'MFR',E'MIKE FLORA RABUKKANA  NNNN',NULL,E'',E'',E'',E'',E'',E'',E'',NULL,NULL,NULL,NULL,NULL,NULL,120.00,E'U011232',E'',E'U',11832,4,11,7135,1,123456),
(8,E'MIAG',E'MIKE AGRO GREEN (PVT) LTD',NULL,E'',E'',E'',E'',E'',E'',E'',E'RZ',E'2025-10-24',NULL,NULL,NULL,NULL,0.00,E'',E'',NULL,NULL,NULL,NULL,NULL,NULL,NULL),
(9,E'MILP',E'MIKE LEISURE (PVT) LTD',NULL,E'',E'',E'',E'',E'',E'',E'',E'RZ',E'2025-10-24',NULL,NULL,NULL,NULL,0.00,E'',E'',NULL,NULL,NULL,NULL,NULL,NULL,NULL)
ON CONFLICT DO NOTHING;

-- Keep generated IDs above imported IDs without rewinding existing sequences.
SELECT setval(pg_get_serial_sequence('s_locmast', 'locsno'),
  GREATEST(COALESCE(MAX("locsno"), 1), COALESCE((SELECT last_value FROM pg_sequences
    WHERE schemaname = current_schema() AND sequencename = 's_locmast_locsno_seq'), 1)),
  MAX("locsno") IS NOT NULL) FROM "s_locmast";

CREATE TABLE IF NOT EXISTS "p_empmast" (
  "empsno" SERIAL,
  "empeno" INTEGER NOT NULL default '0',
  "empinital" varchar(20) NOT NULL default '',
  "empnam" varchar(80) default NULL,
  "empscgpcn" DOUBLE PRECISION NOT NULL default '0.00',
  "empcat" char(1) NOT NULL default '',
  "empdepsno" INTEGER  default '0',
  "emparesno" INTEGER  default '0',
  "empnopflg" char(1) NOT NULL default '',
  "empsal" DOUBLE PRECISION NOT NULL default '0.00',
  "empsala" DOUBLE PRECISION NOT NULL default '0.00',
  "empsalb" DOUBLE PRECISION NOT NULL default '0.00',
  "empbasisno" INTEGER  default '0',
  "empepfyn" char(1) NOT NULL default '',
  "emppasportno" varchar(15) NOT NULL DEFAULT '',
  "emppayeyn" varchar(1) NOT NULL DEFAULT '',
  "empmof" char(1) NOT NULL default '',
  "empidno" varchar(20) NOT NULL default '',
  "empjoin" date  default NULL,
  "empdesig" varchar(60) NOT NULL default '',
  "empdob" date  default NULL,
  "empleft" date  default NULL,
  "empcob" DOUBLE PRECISION NOT NULL default '0.00',
  "emptno" INTEGER NOT NULL default '0',
  "empprl" DOUBLE PRECISION NOT NULL default '0.00',
  "empactflg" char(1) default NULL,
  "empscgpts" INTEGER NOT NULL default '0',
  "empbnkacno" varchar(30) NOT NULL default '',
  "empbnkcode" varchar(20) NOT NULL default '',
  "empbnkbranch" varchar(20) NOT NULL default '',
  "empepfno" INTEGER NOT NULL default '0',
  "emptax" DOUBLE PRECISION NOT NULL default '0.00',
  "empgin" DOUBLE PRECISION NOT NULL default '0.00',
  "emptin" varchar(18) NOT NULL DEFAULT '',
  "emppostcode" varchar(12) NOT NULL DEFAULT '',
  "empcossno" INTEGER  default '0',
  "empsecsno" INTEGER  default '0',
  "empsts" char(1) NOT NULL default '',
  "empcasdays" INTEGER NOT NULL default '0',
  "empanudays" INTEGER NOT NULL default '0',
  "empmeddays" INTEGER NOT NULL default '0',
  "empssddt" date  default NULL,
  "empsdob" DOUBLE PRECISION NOT NULL default '0.00',
  "empswddt" date  default NULL,
  "empshddt" date  default NULL,
  "empbshob" DOUBLE PRECISION NOT NULL default '0.00',
  "empucdnew" varchar(30) default NULL,
  "empentddt" date default NULL,
  "empenttime" time default NULL,
  "empucdame" varchar(30) default NULL,
  "empameddt" date default NULL,
  "empametime" time default NULL,
  "empmapcode" INTEGER  default '0',
  "emplocsno" INTEGER  default '0',
  "empad1" varchar(40) NOT NULL default '',
  "empad2" varchar(40) NOT NULL default '',
  "empad3" varchar(40) NOT NULL default '',
  "empad4" varchar(40) NOT NULL default '',
  "empemail" varchar(40) NOT NULL default '',
  "empmrdtst" char(1) NOT NULL default '',
  "empbnkid" varchar(20) NOT NULL default '',
  "empotflg" char(1) NOT NULL default '',
  "empanual" varchar(4) NOT NULL default '',
  "empcasal" varchar(4) NOT NULL default '',
  "empleuleu" varchar(4) NOT NULL default '',
  "emptel" varchar(25) NOT NULL default '',
  "empattincflg" char(1) NOT NULL default '',
  "emplateflg" char(1) NOT NULL default '',
  "empnsatlflg" char(1) NOT NULL default '',
  "imgurl" varchar(100) default NULL,
  UNIQUE ("empsno")
);

-- p_empmast: 50 original source rows.
INSERT INTO "p_empmast" ("empsno","empeno","empinital","empnam","empscgpcn","empcat","empdepsno","emparesno","empnopflg","empsal","empsala","empsalb","empbasisno","empepfyn","emppasportno","emppayeyn","empmof","empidno","empjoin","empdesig","empdob","empleft","empcob","emptno","empprl","empactflg","empscgpts","empbnkacno","empbnkcode","empbnkbranch","empepfno","emptax","empgin","emptin","emppostcode","empcossno","empsecsno","empsts","empcasdays","empanudays","empmeddays","empssddt","empsdob","empswddt","empshddt","empbshob","empucdnew","empentddt","empenttime","empucdame","empameddt","empametime","empmapcode","emplocsno","empad1","empad2","empad3","empad4","empemail","empmrdtst","empbnkid","empotflg","empanual","empcasal","empleuleu","emptel","empattincflg","emplateflg","empnsatlflg","imgurl") VALUES
(1,1,E'',E'Mrs W.K.G. DIAS',0.00,E'W',1,42,E'N',28000.00,0.00,0.00,229,E'Y',E'',E'',E'M',E'736450151V',E'2004-03-01',E'PRODUCTION MANAGER ',E'1973-05-24',NULL,0.00,0,0.00,E'N',0,E'12100004845',E'\t\t\t',E'',1,0.00,0.00,E'',E'',0,570,E'',0,0,0,NULL,0.00,NULL,NULL,0.00,E'2000',E'2012-03-19',E'10:14:38',E'nathasha',E'2023-09-07',E'18:53:42',3001,3,E'',E'',E'',E'',E'',E'',E'',E'N',E'',E'',E'',E'',E'',E'Y',E'',E''),
(2,2,E'',E'Miss H.A.S.N. HAPUARACHCHI',0.00,E'W',1,0,E'',10250.00,0.00,0.00,0,E'Y',E'',E'',E'M',E'\r\n\t\t\t     777991515',E'2004-03-01',E'LABORATORY SUPERVISOR',E'1977-10-25',NULL,0.00,0,0.00,E'N',0,E'',E'\r\n\t\t\t',E'',2,0.00,0.00,E'',E'',0,571,E'',0,0,0,NULL,0.00,NULL,NULL,0.00,E'2000',E'2012-03-19',E'10:14:38',E'',NULL,E'00:00:00',2,3,E'NO. 82',E'GURUGAMA',E'KIRINDIWALA',E'',E'',E'S',E'',E'',E'',E'',E'',E'',E'',E'Y',E'',E''),
(3,3,E'',E'Mr A.P. DAYANANDA',0.00,E'W',1,0,E'',11000.00,0.00,0.00,0,E'Y',E'',E'',E'M',E'\r\n\t\t\t     713103357',E'2004-07-14',E'PRODUCTION EXECUTIVE',E'1971-11-05',NULL,0.00,0,0.00,E'N',0,E'',E'\r\n\t\t\t',E'',4,0.00,0.00,E'',E'',0,572,E'',0,0,0,NULL,0.00,NULL,NULL,0.00,E'2000',E'2012-03-19',E'10:14:38',E'',NULL,E'00:00:00',4,3,E'NO.193',E'MAY FIELD WATTA',E'WALPITAMULLA',E'DEWOLAPOLA',E'',E'M',E'',E'',E'',E'',E'',E'',E'',E'Y',E'',E''),
(4,4,E'',E'Miss A.E. MUNASINGHE',0.00,E'W',1,0,E'',25000.00,0.00,0.00,0,E'Y',E'',E'',E'F',E'\r\n\t\t\t     798653300',E'2004-10-04',E'ASSISTANT MANAGER PRODUCTION',E'1979-12-30',NULL,0.00,0,0.00,E'N',0,E'8690036417',E'\r\n\t\t\t     7056',E'69',6,0.00,0.00,E'',E'',0,573,E'',0,0,0,NULL,0.00,NULL,NULL,0.00,E'2000',E'2012-03-19',E'10:14:38',E'',NULL,E'00:00:00',6,3,E'"SRIYANI"""',E'MUNASINGGODA',E'MAGGONA',E'',E'',E'M',E'COMBKIRI',E'',E'',E'',E'',E'',E'',E'Y',E'',E''),
(5,5,E'',E'CARECLEEN MALANI',0.00,E'S',3,42,E'',19500.00,0.00,0.00,228,E'Y',E'',E'',E'F',E'787143253',E'2004-10-20',E'MANAGER-PRODUCT DEVELOPMENT      ',E'1978-08-01',NULL,0.00,0,0.00,E'N',0,E'',E'\t\t\t',E'',7,0.00,0.00,E'',E'',0,597,E'',0,0,0,NULL,0.00,NULL,NULL,0.00,E'2000',E'2012-03-19',E'10:14:38',E'nathasha',E'2015-03-03',E'14:33:43',7,3,E'NO. 402 / 11B',E'BOGAHAWILLA ROAD',E'KOTTAWA',E'',E'',E'S',E'',E'',E'',E'',E'',E'',E'',E'Y',E'',E''),
(6,6,E'W M S ',E'BANDA',0.00,E'S',26,42,E'Y',55000.00,0.00,0.00,228,E'Y',E'',E'',E'M',E'690722283V',E'1994-07-01',E'SALES ASSISTANT                      ',E'1969-03-12',NULL,0.40,0,0.00,E'Y',0,E'106001516496',E'7214',E'005',8,0.00,0.00,E'',E'',0,612,E'',0,0,0,NULL,0.00,NULL,NULL,0.00,E'2000',E'2012-03-19',E'10:14:38',E'nathasha',E'2026-05-08',E'06:07:09',8,5,E'351/B ',E'Dippitigoda Rd',E'Kelaniya',E'',E'',E'M',E'',E'N',E'14',E'7',E'',E'0718547190',E'N',E'Y',E'',E''),
(7,7,E'',E'Miss B.D. RANDUNUGE',0.00,E'W',1,0,E'',7500.00,0.00,0.00,0,E'Y',E'',E'',E'F',E'\r\n\t\t\t',E'2012-03-19',E'LAB ASSISTANT',E'2012-03-19',NULL,0.00,0,0.00,E'N',0,E'',E'\r\n\t\t\t',E'',10,0.00,0.00,E'',E'',0,576,E'',0,0,0,NULL,0.00,NULL,NULL,0.00,E'2000',E'2012-03-19',E'10:14:38',E'',NULL,E'00:00:00',10,3,E'',E'',E'',E'',E'',E'S',E'',E'',E'',E'',E'',E'',E'',E'Y',E'',E''),
(8,8,E'',E'SHRIYANI CARECLEEN',0.00,E'S',1,42,E'',7750.00,0.00,0.00,228,E'Y',E'',E'',E'M',E'711892583',NULL,E'LAB ASSISTANT   ',E'2012-03-19',NULL,0.00,0,0.00,E'N',0,E'',E'\t\t\t',E'',11,0.00,0.00,E'',E'',0,576,E'',0,0,0,NULL,0.00,NULL,NULL,0.00,E'2000',E'2012-03-19',E'10:14:38',E'nathasha',E'2015-03-03',E'14:33:51',11,3,E'',E'',E'',E'',E'',E'S',E'',E'',E'',E'',E'',E'',E'',E'Y',E'',E''),
(9,9,E'',E'Mr E.D.S. RATHNASIRI',0.00,E'W',27,42,E'N',13050.00,0.00,0.00,228,E'N',E'',E'',E'M',E'832961701V',E'2005-02-08',E'FIELD ASSISTANT',E'1983-10-22',E'2012-05-17',0.03,0,0.00,E'N',0,E'',E'\t\t\t     7214',E'4',12,0.00,0.00,E'',E'',0,575,E'',0,0,0,NULL,0.00,NULL,NULL,0.00,E'2000',E'2012-03-19',E'10:14:38',E'hrd',E'2012-07-09',E'09:11:35',12,3,E'AMBATHALLA',E'RAMBUKKANA',E'',E'',E'',E'S',E'NDB NUGEGO',E'N',E'',E'',E'',E'',E'',E'Y',E'',E''),
(10,10,E'',E'Miss H.P.D.L. HIRIYADENIYA',0.00,E'W',1,42,E'',12500.00,0.00,0.00,601,E'Y',E'',E'',E'F',E'805591706',E'2005-03-28',E'LABORATORY SUPERVISOR ',E'1980-02-28',NULL,0.00,0,0.00,E'N',0,E'',E'\t\t\t',E'',13,0.00,0.00,E'',E'',0,571,E'',0,0,0,NULL,0.00,NULL,NULL,0.00,E'2000',E'2012-03-19',E'10:14:38',E'nathasha',E'2014-10-31',E'14:56:56',3013,3,E'20/33, 3rd Lane',E'Old Air Port Road',E'Nagoda',E'Kalutara',E'',E'S',E'',E'',E'',E'',E'',E'',E'',E'Y',E'',E''),
(11,11,E'',E'Mr K.P.S. KARUNANAYAKE',0.00,E'W',1,0,E'',10500.00,0.00,0.00,0,E'Y',E'',E'',E'M',E'\r\n\t\t\t     790860241',E'2005-04-18',E'PRODUCTION EXECUTIVE',E'1979-03-26',NULL,0.00,0,0.00,E'N',0,E'',E'\r\n\t\t\t',E'',14,0.00,0.00,E'',E'',0,572,E'',0,0,0,NULL,0.00,NULL,NULL,0.00,E'2000',E'2012-03-19',E'10:14:38',E'',NULL,E'00:00:00',14,3,E'K.P.S.S. KARUNANAYAKE',E'NO. 130/1',E'KURIEKOTUWA',E'VEYANGODA',E'',E'S',E'',E'',E'',E'',E'',E'',E'',E'Y',E'',E''),
(12,12,E'S M R P ',E'SENARATH',0.00,E'S',301,42,E'Y',64000.00,0.00,0.00,228,E'Y',E'',E'',E'F',E'685160749V',E'2005-04-25',E'AST MGR - PRODUCTION                    ',E'1968-01-16',E'2019-11-30',0.00,0,0.00,E'N',0,E'004111004852',E'7214',E'004',17,0.00,0.00,E'',E'',0,570,E'',0,0,0,NULL,0.00,NULL,NULL,0.00,E'2000',E'2012-03-19',E'10:14:38',E'nathasha',E'2020-01-06',E'11:38:13',17,3,E'',E'KITTAMMAHARA',E'NITTAMBUWA',E'',E'',E'M',E'NDB NUGEGO',E'N',E'',E'',E'',E'0776856150',E'N',E'Y',E'Y',E''),
(13,13,E'',E'Mr R.P. MUNASINGHA',0.00,E'W',1,0,E'',12000.00,0.00,0.00,0,E'Y',E'',E'',E'M',E'\r\n\t\t\t     812190750',E'2005-05-05',E'LAB ASSISTANT',E'1981-08-06',NULL,0.00,0,0.00,E'N',0,E'',E'\r\n\t\t\t',E'',18,0.00,0.00,E'',E'',0,576,E'',0,0,0,NULL,0.00,NULL,NULL,0.00,E'2000',E'2012-03-19',E'10:14:38',E'',NULL,E'00:00:00',18,3,E'NO. 100',E'KOLONNAWA ROAD',E'KOLONNAWA',E'',E'',E'S',E'',E'',E'',E'',E'',E'',E'',E'Y',E'',E''),
(14,14,E'',E'Miss W.V.P. CHANDANI',0.00,E'W',1,0,E'',6500.00,0.00,0.00,0,E'Y',E'',E'',E'M',E'\r\n\t\t\t     768322058',E'2005-06-01',E'LAB ASSISTANT',E'1976-11-27',NULL,0.00,0,0.00,E'N',0,E'',E'\r\n\t\t\t',E'',20,0.00,0.00,E'',E'',0,576,E'',0,0,0,NULL,0.00,NULL,NULL,0.00,E'2000',E'2012-03-19',E'10:14:38',E'',NULL,E'00:00:00',20,3,E'NO. 28/29',E'BUDHALOKA MAWATHA',E'SUWARAPOLA',E'PILIYANDALA',E'',E'S',E'',E'',E'',E'',E'',E'',E'',E'Y',E'',E''),
(15,15,E'',E'Mrs K.M. DIAS',0.00,E'W',1,0,E'',40000.00,0.00,0.00,0,E'Y',E'',E'',E'F',E'\r\n\t\t\t     595610214',E'2005-06-15',E'GENERAL MANAGER',NULL,NULL,0.00,0,0.00,E'N',0,E'',E'\r\n\t\t\t',E'',22,0.00,0.00,E'',E'',0,578,E'',0,0,0,NULL,0.00,NULL,NULL,0.00,E'2000',E'2012-03-19',E'10:14:38',E'',NULL,E'00:00:00',22,3,E'160/4',E'PALMGROW WATHTHA',E'VEYANGODA',E'',E'',E'S',E'',E'',E'',E'',E'',E'',E'',E'Y',E'',E''),
(16,16,E'',E'Mr Y. NUWAN THILINA',0.00,E'W',1,42,E'',9000.00,0.00,0.00,228,E'Y',E'',E'',E'M',E'852852135',E'2005-09-23',E'LAB ASSISTANT',E'1985-11-10',NULL,0.00,0,0.00,E'N',0,E'',E'\t\t\t',E'',23,0.00,0.00,E'',E'',0,576,E'',0,0,0,NULL,0.00,NULL,NULL,0.00,E'2000',E'2012-03-19',E'10:14:38',E'2000',E'2012-04-05',E'09:55:58',0,3,E'7/125',E'THENNAKOON MAWATHA',E'MINUWANGODA',E'',E'',E'S',E'',E'',E'',E'',E'',E'',E'',E'Y',E'',E''),
(17,17,E'',E'Mr P.I. WIJAYARATNA',0.00,E'W',1,0,E'',14000.00,0.00,0.00,0,E'Y',E'',E'',E'M',E'\r\n\t\t\t     743361938',E'2005-11-01',E'ELECTRICIAN',E'1974-05-28',NULL,0.00,0,0.00,E'N',0,E'',E'\r\n\t\t\t',E'',26,0.00,0.00,E'',E'',0,579,E'',0,0,0,NULL,0.00,NULL,NULL,0.00,E'2000',E'2012-03-19',E'10:14:38',E'',NULL,E'00:00:00',26,3,E'NO. 270/A',E'Millagahawatta Road',E'Homagama',E'',E'',E'S',E'',E'',E'',E'',E'',E'',E'',E'Y',E'',E''),
(18,18,E'',E'Mr W.M.S.B.Wijekoon',0.00,E'W',1,0,E'',9500.00,0.00,0.00,0,E'Y',E'',E'',E'M',E'\r\n\t\t\t',E'2005-11-21',E'LAB ASSISTANT',E'1982-08-07',NULL,0.00,0,0.00,E'N',0,E'',E'\r\n\t\t\t',E'',28,0.00,0.00,E'',E'',0,576,E'',0,0,0,NULL,0.00,NULL,NULL,0.00,E'2000',E'2012-03-19',E'10:14:38',E'',NULL,E'00:00:00',28,3,E'C/O.H.A.D.S.S. Abeysinghe',E'10/5,',E'Walawwaththa Place',E'Galpoththa Road',E'',E'S',E'',E'',E'',E'',E'',E'',E'',E'Y',E'',E''),
(19,19,E'',E'Miss H.N.S. HARSHANI',0.00,E'W',1,0,E'',5500.00,0.00,0.00,0,E'Y',E'',E'',E'F',E'\r\n\t\t\t',E'2005-12-12',E'LAB ASSISTANT',E'1985-04-29',NULL,0.00,0,0.00,E'N',0,E'',E'\r\n\t\t\t',E'',29,0.00,0.00,E'',E'',0,576,E'',0,0,0,NULL,0.00,NULL,NULL,0.00,E'2000',E'2012-03-19',E'10:14:38',E'',NULL,E'00:00:00',29,3,E'54,',E'VIHARAMAWATHA',E'BELLANWILA',E'',E'',E'S',E'',E'',E'',E'',E'',E'',E'',E'Y',E'',E''),
(20,20,E'',E'Mr M.N. UDAYAKUMARA',0.00,E'W',1,0,E'',5500.00,0.00,0.00,0,E'Y',E'',E'',E'M',E'\r\n\t\t\t     811144509',E'2005-12-14',E'LAB ASSISTANT',E'1981-04-23',NULL,0.00,0,0.00,E'N',0,E'',E'\r\n\t\t\t',E'',30,0.00,0.00,E'',E'',0,576,E'',0,0,0,NULL,0.00,NULL,NULL,0.00,E'2000',E'2012-03-19',E'10:14:38',E'',NULL,E'00:00:00',30,3,E'NO. 75',E'PAGODA ROAD',E'NUGEGODA',E'',E'',E'S',E'',E'',E'',E'',E'',E'',E'',E'Y',E'',E''),
(21,21,E'',E'Miss I.P.K. HETTIGEDARA',0.00,E'W',1,0,E'',9500.00,0.00,0.00,0,E'Y',E'',E'',E'F',E'\r\n\t\t\t     825951865',E'2005-12-19',E'LAB ASSISTANT',E'1982-04-04',NULL,0.00,0,0.00,E'N',0,E'',E'\r\n\t\t\t',E'',31,0.00,0.00,E'',E'',0,576,E'',0,0,0,NULL,0.00,NULL,NULL,0.00,E'2000',E'2012-03-19',E'10:14:38',E'',NULL,E'00:00:00',31,3,E'645/C',E'ERIYAWETIYA ROAD',E'KIRIBATHGODA',E'',E'',E'S',E'',E'',E'',E'',E'',E'',E'',E'Y',E'',E''),
(22,22,E'',E'Mr H.G.L. SURANGA',0.00,E'W',1,0,E'',4000.00,0.00,0.00,0,E'Y',E'',E'',E'M',E'\r\n\t\t\t',E'2005-12-27',E'FIELD ASSISTANT',E'1980-01-30',NULL,0.00,0,0.00,E'N',0,E'',E'\r\n\t\t\t',E'',32,0.00,0.00,E'',E'',0,575,E'',0,0,0,NULL,0.00,NULL,NULL,0.00,E'2000',E'2012-03-19',E'10:14:38',E'',NULL,E'00:00:00',32,3,E'',E'',E'',E'',E'',E'S',E'',E'',E'',E'',E'',E'',E'',E'Y',E'',E''),
(23,23,E'',E'Miss K.C.A. PREMARATHNA',0.00,E'W',1,0,E'',5500.00,0.00,0.00,0,E'Y',E'',E'',E'F',E'\r\n\t\t\t     806531359V',E'2006-01-16',E'LAB ASSISTANT',E'1980-06-01',NULL,0.00,0,0.00,E'N',0,E'',E'\r\n\t\t\t',E'',33,0.00,0.00,E'',E'',0,576,E'',0,0,0,NULL,0.00,NULL,NULL,0.00,E'2000',E'2012-03-19',E'10:14:38',E'',NULL,E'00:00:00',33,3,E'48, Nagahaliydda',E'Gabbala',E'Kottawella',E'Rambukkana',E'',E'S',E'',E'',E'',E'',E'',E'',E'',E'Y',E'',E''),
(24,24,E'',E'Mr M.V.H.S. UDAYAKANTHA',0.00,E'W',1,0,E'',5000.00,0.00,0.00,0,E'Y',E'',E'',E'M',E'\r\n\t\t\t     780882972',E'2006-02-07',E'FIELD ASSISTANT',E'1978-03-28',NULL,0.00,0,0.00,E'N',0,E'',E'\r\n\t\t\t',E'',35,0.00,0.00,E'',E'',0,575,E'',0,0,0,NULL,0.00,NULL,NULL,0.00,E'2000',E'2012-03-19',E'10:14:38',E'',NULL,E'00:00:00',35,3,E'GODAKANDENIYA',E'RAMBUKKANA',E'',E'',E'',E'S',E'',E'',E'',E'',E'',E'',E'',E'Y',E'',E''),
(25,25,E'',E'Miss A.L.S.NADEESHA',0.00,E'W',1,0,E'',5500.00,0.00,0.00,0,E'Y',E'',E'',E'F',E'\r\n\t\t\t     846551255V',E'2006-02-20',E'LAB ASSISTANT',E'1984-06-03',NULL,0.00,0,0.00,E'N',0,E'',E'\r\n\t\t\t',E'',36,0.00,0.00,E'',E'',0,576,E'',0,0,0,NULL,0.00,NULL,NULL,0.00,E'2000',E'2012-03-19',E'10:14:38',E'',NULL,E'00:00:00',36,3,E'57/1, KUBUGODARA',E'EMBILIPITIYA',E'',E'',E'',E'S',E'',E'',E'',E'',E'',E'',E'',E'Y',E'',E''),
(26,26,E'',E'Ms K.G.P. FERNANDO',0.00,E'W',1,0,E'',11500.00,0.00,0.00,0,E'N',E'',E'',E'F',E'\r\n\t\t\t     857423925',E'2006-04-27',E'LAB ASSISTANT',E'1985-08-25',NULL,0.00,0,0.00,E'N',0,E'8110016941',E'\r\n\t\t\t     7056',E'41',37,0.00,0.00,E'',E'',0,576,E'',0,0,0,NULL,0.00,NULL,NULL,0.00,E'2000',E'2012-03-19',E'10:14:38',E'',NULL,E'00:00:00',37,3,E'NO. 175',E'DEWAWILA',E'MIRISWATHTHA ROAD',E'PANADURA',E'',E'S',E'COMBPANADU',E'',E'',E'',E'',E'',E'',E'Y',E'',E''),
(27,27,E'',E'Ms K.A.A. DILRUKSHI',0.00,E'W',1,0,E'',15000.00,0.00,0.00,0,E'Y',E'',E'',E'F',E'\r\n\t\t\t     796690836',E'2006-05-15',E'PRODUCTION EXECUTIVE',E'1979-06-17',NULL,0.00,0,0.00,E'N',0,E'',E'\r\n\t\t\t',E'',38,0.00,0.00,E'',E'',0,572,E'',0,0,0,NULL,0.00,NULL,NULL,0.00,E'2000',E'2012-03-19',E'10:14:38',E'',NULL,E'00:00:00',38,3,E'',E'',E'',E'',E'',E'S',E'',E'',E'',E'',E'',E'',E'',E'Y',E'',E''),
(28,28,E'',E'Mr U.M. SRIKANTHA',0.00,E'W',1,0,E'',10500.00,0.00,0.00,0,E'Y',E'',E'',E'M',E'\r\n\t\t\t',E'2005-04-04',E'ELECTRICIAN',NULL,NULL,0.00,0,0.00,E'N',0,E'',E'\r\n\t\t\t',E'',39,0.00,0.00,E'',E'',0,579,E'',0,0,0,NULL,0.00,NULL,NULL,0.00,E'2000',E'2012-03-19',E'10:14:38',E'',NULL,E'00:00:00',39,3,E'258 / 16',E'Batalanda Road',E'Makola South',E'Makola',E'',E'M',E'',E'',E'',E'',E'',E'',E'',E'Y',E'',E''),
(29,29,E'',E'Ms V. HANSIKA',0.00,E'W',1,0,E'',7000.00,0.00,0.00,0,E'Y',E'',E'',E'M',E'\r\n\t\t\t',E'2012-03-19',E'LAB ASSISTANT',E'2012-03-19',NULL,0.00,0,0.00,E'N',0,E'',E'\r\n\t\t\t',E'',40,0.00,0.00,E'',E'',0,576,E'',0,0,0,NULL,0.00,NULL,NULL,0.00,E'2000',E'2012-03-19',E'10:14:38',E'',NULL,E'00:00:00',40,3,E'',E'',E'',E'',E'',E'S',E'',E'',E'',E'',E'',E'',E'',E'Y',E'',E''),
(30,30,E'',E'Ms V. SAMANTHI',0.00,E'W',1,0,E'',7500.00,0.00,0.00,0,E'Y',E'',E'',E'M',E'\r\n\t\t\t',E'2012-03-19',E'LAB ASSISTANT',E'2012-03-19',NULL,0.00,0,0.00,E'N',0,E'',E'\r\n\t\t\t',E'',41,0.00,0.00,E'',E'',0,576,E'',0,0,0,NULL,0.00,NULL,NULL,0.00,E'2000',E'2012-03-19',E'10:14:38',E'',NULL,E'00:00:00',41,3,E'',E'',E'',E'',E'',E'S',E'',E'',E'',E'',E'',E'',E'',E'Y',E'',E''),
(31,31,E'',E'Ms S. JAYAWARDANE',0.00,E'W',1,0,E'',13000.00,0.00,0.00,228,E'Y',E'',E'',E'M',E'\r\n\t\t\t     868163356V',E'2006-10-10',E'LAB ASSISTANT',E'1986-11-11',NULL,0.00,0,0.00,E'N',0,E'4111004906',E'\r\n\t\t\t     7214',E'4',42,0.00,0.00,E'',E'',0,576,E'',0,0,0,NULL,0.00,NULL,NULL,0.00,E'2000',E'2012-03-19',E'10:14:38',E'',NULL,E'00:00:00',42,3,E'',E'',E'',E'',E'',E'S',E'NDB NUGEGO',E'',E'',E'',E'',E'',E'',E'Y',E'',E''),
(32,32,E'',E'Ms D.M.P. WEERASINGHE',0.00,E'W',1,0,E'',7750.00,0.00,0.00,228,E'Y',E'',E'',E'M',E'\r\n\t\t\t',E'2006-10-11',E'LAB ASSISTANT',E'1982-07-31',NULL,0.00,0,0.00,E'N',0,E'',E'\r\n\t\t\t',E'',43,0.00,0.00,E'',E'',0,576,E'',0,0,0,NULL,0.00,NULL,NULL,0.00,E'2000',E'2012-03-19',E'10:14:38',E'',NULL,E'00:00:00',43,3,E'',E'',E'',E'',E'',E'S',E'',E'',E'',E'',E'',E'',E'',E'Y',E'',E''),
(33,33,E'',E'Ms G. HETHUMUNI',0.00,E'S',1,42,E'',5500.00,0.00,0.00,228,E'Y',E'',E'',E'M',E'12',E'2012-03-19',E'LAB ASSISTANT ',E'2012-03-19',NULL,0.00,0,0.00,E'N',0,E'',E'\t\t\t',E'',44,0.00,0.00,E'',E'',0,576,E'',0,0,0,NULL,0.00,NULL,NULL,0.00,E'2000',E'2012-03-19',E'10:14:38',E'nathasha',E'2014-04-30',E'13:14:04',44,3,E'',E'',E'',E'',E'',E'S',E'',E'',E'',E'',E'',E'',E'',E'Y',E'',E''),
(34,34,E'',E'Ms K.A.I. THUSHARI',0.00,E'S',30,42,E'Y',20000.00,0.00,0.00,228,E'Y',E'',E'',E'F',E'768450447V',E'2006-08-02',E'LABORATORY SUPERVISOR           ',E'1976-12-10',NULL,0.00,0,0.00,E'N',0,E'',E'',E'',45,0.00,0.00,E'',E'',0,571,E'',0,0,0,NULL,0.00,NULL,NULL,0.00,E'2000',E'2012-03-19',E'10:14:38',E'nathasha',E'2016-09-14',E'13:44:21',45,3,E'NO. 395/59',E'RADAWANA',E'',E'',E'-',E'M',E'NDB NUGEGO',E'N',E'',E'',E'',E'',E'N',E'Y',E'Y',E''),
(35,35,E'',E'Ms W.A.C. NADEESHANI',0.00,E'W',1,0,E'',8500.00,0.00,0.00,228,E'Y',E'',E'',E'M',E'\r\n\t\t\t     -',E'2006-08-03',E'LAB ASSISTANT',E'1987-11-18',NULL,0.00,0,0.00,E'N',0,E'-',E'\r\n\t\t\t',E'',46,0.00,0.00,E'',E'',0,576,E'',0,0,0,NULL,0.00,NULL,NULL,0.00,E'2000',E'2012-03-19',E'10:14:38',E'',NULL,E'00:00:00',46,3,E'-',E'-',E'-',E'-',E'-',E'S',E'-',E'',E'',E'',E'',E'',E'',E'Y',E'',E''),
(36,36,E'',E'Ms M.H.D. SANDAKELUM',0.00,E'S',30,42,E'Y',18000.00,0.00,0.00,228,E'Y',E'',E'',E'F',E'815672682V',E'2006-08-04',E'LAB ASSISTANT           ',E'1981-03-07',NULL,-0.15,0,0.00,E'N',0,E'',E'',E'',47,0.00,0.00,E'',E'',0,571,E'',0,0,0,NULL,0.00,NULL,NULL,0.00,E'2000',E'2012-03-19',E'10:14:38',E'nathasha',E'2015-08-10',E'17:00:49',47,3,E'PUSHPARAMA ROAD',E'MEETIYAGODA',E'AMBALANGODA',E'',E'-',E'S',E'NDB NUGEGO',E'N',E'',E'',E'',E'',E'N',E'Y',E'Y',E''),
(37,37,E'',E'Mr U.A.D. NALIN KUMARA',0.00,E'W',1,0,E'',7000.00,0.00,0.00,228,E'Y',E'',E'',E'M',E'\r\n\t\t\t     802530617V',E'2006-08-21',E'ELECTRICIAN',E'1980-09-09',NULL,0.00,0,0.00,E'N',0,E'-',E'\r\n\t\t\t',E'',48,0.00,0.00,E'',E'',0,579,E'',0,0,0,NULL,0.00,NULL,NULL,0.00,E'2000',E'2012-03-19',E'10:14:38',E'',NULL,E'00:00:00',48,3,E'NAGAHAMULLA WATTA',E'WARAKAPITIYA',E'',E'',E'-',E'S',E'-',E'',E'',E'',E'',E'',E'',E'Y',E'',E''),
(38,38,E'',E'Mr N.L. DAMINDA',0.00,E'W',1,0,E'',18000.00,0.00,0.00,228,E'Y',E'',E'',E'M',E'\r\n\t\t\t     721822249',E'2007-01-04',E'ELECTRICIAN',E'1972-06-30',NULL,0.00,0,0.00,E'N',0,E'',E'\r\n\t\t\t',E'',60,0.00,0.00,E'',E'',0,579,E'',0,0,0,NULL,0.00,NULL,NULL,0.00,E'2000',E'2012-03-19',E'10:14:38',E'',NULL,E'00:00:00',60,3,E'NO. 163/B, Horana Road',E'Kahathuduwa',E'Polgasovita',E'',E'',E'S',E'',E'',E'',E'',E'',E'',E'',E'Y',E'',E''),
(39,39,E'',E'Miss S.P.C. R. Prasadini',0.00,E'W',1,0,E'',4000.00,0.00,0.00,228,E'Y',E'',E'',E'M',E'\r\n\t\t\t     858153468V',E'2007-01-09',E'FIELD ASSISTANT',E'1985-11-10',NULL,0.00,0,0.00,E'N',0,E'',E'\r\n\t\t\t',E'',50,0.00,0.00,E'',E'',0,575,E'',0,0,0,NULL,0.00,NULL,NULL,0.00,E'2000',E'2012-03-19',E'10:14:38',E'',NULL,E'00:00:00',50,3,E'NO.  36/1,',E'De Mel Road',E'Koswatta',E'Nawala',E'',E'S',E'',E'',E'',E'',E'',E'',E'',E'Y',E'',E''),
(40,40,E'',E'Miss J.H.K. PERERA',0.00,E'W',1,0,E'',4000.00,0.00,0.00,228,E'Y',E'',E'',E'F',E'\r\n\t\t\t',E'2007-01-30',E'FIELD ASSISTANT',E'1981-04-11',NULL,0.00,0,0.00,E'N',0,E'',E'\r\n\t\t\t',E'',51,0.00,0.00,E'',E'',0,575,E'',0,0,0,NULL,0.00,NULL,NULL,0.00,E'2000',E'2012-03-19',E'10:14:38',E'',NULL,E'00:00:00',51,3,E'',E'',E'',E'',E'',E'S',E'',E'',E'',E'',E'',E'',E'',E'Y',E'',E''),
(41,41,E'',E'Miss D.M.I. DISSANAYAKE',0.00,E'W',1,0,E'',9000.00,0.00,0.00,228,E'Y',E'',E'',E'F',E'\r\n\t\t\t',E'2007-03-01',E'LAB ASSISTANT',E'1976-02-27',NULL,0.00,0,0.00,E'N',0,E'',E'\r\n\t\t\t',E'',52,0.00,0.00,E'',E'',0,576,E'',0,0,0,NULL,0.00,NULL,NULL,0.00,E'2000',E'2012-03-19',E'10:14:38',E'',NULL,E'00:00:00',52,3,E'',E'',E'',E'',E'',E'S',E'',E'',E'',E'',E'',E'',E'',E'Y',E'',E''),
(42,42,E'',E'Miss S.A. JAYAWARDANA',0.00,E'W',1,0,E'',6500.00,0.00,0.00,228,E'Y',E'',E'',E'F',E'\r\n\t\t\t',E'2007-03-01',E'LAB ASSISTANT',E'1982-03-21',NULL,0.00,0,0.00,E'N',0,E'',E'\r\n\t\t\t',E'',53,0.00,0.00,E'',E'',0,576,E'',0,0,0,NULL,0.00,NULL,NULL,0.00,E'2000',E'2012-03-19',E'10:14:38',E'',NULL,E'00:00:00',53,3,E'NO. 51/22',E'MADAPATHALA',E'GALLE',E'',E'',E'S',E'',E'',E'',E'',E'',E'',E'',E'Y',E'',E''),
(43,43,E'',E'Miss G.G.N. RUKSHIKA FERNANDO',0.00,E'W',1,0,E'',6500.00,0.00,0.00,228,E'Y',E'',E'',E'F',E'\r\n\t\t\t',E'2007-03-01',E'LAB ASSISTANT',E'1982-07-07',NULL,0.00,0,0.00,E'N',0,E'',E'\r\n\t\t\t',E'',54,0.00,0.00,E'',E'',0,576,E'',0,0,0,NULL,0.00,NULL,NULL,0.00,E'2000',E'2012-03-19',E'10:14:38',E'',NULL,E'00:00:00',54,3,E'16, Woodland Avenue',E'Kohuwala',E'Nugegoda',E'',E'',E'S',E'',E'',E'',E'',E'',E'',E'',E'Y',E'',E''),
(44,44,E'',E'Miss K.D.N. DAMAYANTHI',0.00,E'W',1,0,E'',7000.00,0.00,0.00,228,E'Y',E'',E'',E'F',E'\r\n\t\t\t     837780560V',E'2007-03-05',E'LAB ASSISTANT',E'1983-10-04',NULL,0.00,0,0.00,E'N',0,E'',E'\r\n\t\t\t',E'',55,0.00,0.00,E'',E'',0,576,E'',0,0,0,NULL,0.00,NULL,NULL,0.00,E'2000',E'2012-03-19',E'10:14:38',E'',NULL,E'00:00:00',55,3,E'60/39, PALMADA',E'MIRIGAMA',E'',E'',E'',E'S',E'',E'',E'',E'',E'',E'',E'',E'Y',E'',E''),
(45,45,E'',E'Mr M.P.R. PERERA',0.00,E'W',1,0,E'',12500.00,0.00,0.00,228,E'Y',E'',E'',E'M',E'\r\n\t\t\t',E'2007-05-04',E'LAB ASSISTANT',E'1980-06-14',NULL,0.00,0,0.00,E'N',0,E'',E'\r\n\t\t\t',E'',56,0.00,0.00,E'',E'',0,576,E'',0,0,0,NULL,0.00,NULL,NULL,0.00,E'2000',E'2012-03-19',E'10:14:38',E'',NULL,E'00:00:00',56,3,E'',E'',E'',E'',E'',E'S',E'',E'',E'',E'',E'',E'',E'',E'Y',E'',E''),
(46,46,E'',E'Mr M.G.I.M.PREMACHANDRA',0.00,E'W',1,0,E'',4000.00,0.00,0.00,228,E'Y',E'',E'',E'M',E'\r\n\t\t\t',E'2012-03-19',E'FIELD ASSISTANT',E'2012-03-19',NULL,0.00,0,0.00,E'N',0,E'',E'\r\n\t\t\t',E'',57,0.00,0.00,E'',E'',0,575,E'',0,0,0,NULL,0.00,NULL,NULL,0.00,E'2000',E'2012-03-19',E'10:14:38',E'',NULL,E'00:00:00',57,3,E'',E'',E'',E'',E'',E'S',E'',E'',E'',E'',E'',E'',E'',E'Y',E'',E''),
(47,47,E'',E'Mr P.G.S. NILANKA',0.00,E'W',1,0,E'',5000.00,0.00,0.00,228,E'Y',E'',E'',E'M',E'\r\n\t\t\t     873071427V',E'2007-10-29',E'FIELD ASSISTANT',E'1987-11-02',NULL,0.00,0,0.00,E'N',0,E'',E'\r\n\t\t\t',E'',58,0.00,0.00,E'',E'',0,575,E'',0,0,0,NULL,0.00,NULL,NULL,0.00,E'2000',E'2012-03-19',E'10:14:38',E'',NULL,E'00:00:00',58,3,E'B 73/4, MAUSSAWA',E'KEHELPANNALA',E'',E'',E'',E'S',E'',E'',E'',E'',E'',E'',E'',E'Y',E'',E''),
(48,48,E'',E'Miss M. Dhammika Wijesekara',0.00,E'W',1,0,E'',6500.00,0.00,0.00,228,E'Y',E'',E'',E'F',E'\r\n\t\t\t     637680030V',E'2007-09-10',E'FIELD ASSISTANT',NULL,NULL,0.00,0,0.00,E'N',0,E'',E'\r\n\t\t\t',E'',59,0.00,0.00,E'',E'',0,575,E'',0,0,0,NULL,0.00,NULL,NULL,0.00,E'2000',E'2012-03-19',E'10:14:38',E'',NULL,E'00:00:00',59,3,E'161/4E',E'BATHALAWATTA Road',E'Malabe',E'',E'',E'S',E'',E'',E'',E'',E'',E'',E'',E'Y',E'',E''),
(49,49,E'',E'Miss M.R.I.H. Gunathilake',0.00,E'W',1,0,E'',6500.00,0.00,0.00,228,E'Y',E'',E'',E'F',E'\r\n\t\t\t     795722947V',E'2007-12-03',E'LAB ASSISTANT',E'1979-03-12',NULL,0.00,0,0.00,E'N',0,E'',E'\r\n\t\t\t',E'',61,0.00,0.00,E'',E'',0,576,E'',0,0,0,NULL,0.00,NULL,NULL,0.00,E'2000',E'2012-03-19',E'10:14:38',E'',NULL,E'00:00:00',61,3,E'NO.81',E'SUMANGALA MAWATHA',E'WARIYAPOLA',E'',E'',E'S',E'',E'',E'',E'',E'',E'',E'',E'Y',E'',E''),
(50,50,E'',E'Miss N.W. EDIRISINGHE',0.00,E'W',1,42,E'',10500.00,0.00,0.00,228,E'Y',E'',E'',E'F',E'835372928V',E'2007-12-04',E'LAB ASSISTANT',E'1983-02-06',NULL,0.00,0,0.00,E'N',0,E'4111004785',E'\t\t\t     7214',E'4',62,0.00,0.00,E'',E'',0,576,E'',0,0,0,NULL,0.00,NULL,NULL,0.00,E'2000',E'2012-03-19',E'10:14:38',E'hrd',E'2012-03-26',E'12:27:10',62,3,E'NO. 67/5,',E'ST. BRIDGETS ROAD',E'NAGODA',E'WELISARA',E'',E'S',E'NDB NUGEGO',E'',E'',E'',E'',E'',E'',E'Y',E'',E'')
ON CONFLICT DO NOTHING;

-- Keep generated IDs above imported IDs without rewinding existing sequences.
SELECT setval(pg_get_serial_sequence('p_empmast', 'empsno'),
  GREATEST(COALESCE(MAX("empsno"), 1), COALESCE((SELECT last_value FROM pg_sequences
    WHERE schemaname = current_schema() AND sequencename = 'p_empmast_empsno_seq'), 1)),
  MAX("empsno") IS NOT NULL) FROM "p_empmast";

CREATE TABLE IF NOT EXISTS "prgmast" (
  "prgsno" SERIAL,
  "prgmodsno" INTEGER NOT NULL default '0',
  "prgsmdsno" INTEGER NOT NULL default '0',
  "prgorder" varchar(5) NOT NULL default '',
  "prglvl" char(1) default NULL,
  "prgapp" varchar(30) NOT NULL DEFAULT 'payroll-web',
  "prgnam" varchar(35) default NULL,
  "prgdes" varchar(60) default NULL,
  "prgucdnew" varchar(30) default NULL,
  "prgentddt" date default NULL,
  "prgenttime" time default NULL,
  "prgucdame" varchar(30) default NULL,
  "prgameddt" date default NULL,
  "prgametime" time default NULL,
  PRIMARY KEY  ("prgmodsno","prgsmdsno","prgorder"),
  UNIQUE ("prgsno")
);

ALTER TABLE prgmast ADD COLUMN IF NOT EXISTS prgapp varchar(30) NOT NULL DEFAULT '';
-- Current application pages are registered below after all tables exist.

-- Keep generated IDs above imported IDs without rewinding existing sequences.
SELECT setval(pg_get_serial_sequence('prgmast', 'prgsno'),
  GREATEST(COALESCE(MAX("prgsno"), 1), COALESCE((SELECT last_value FROM pg_sequences
    WHERE schemaname = current_schema() AND sequencename = 'prgmast_prgsno_seq'), 1)),
  MAX("prgsno") IS NOT NULL) FROM "prgmast";

CREATE TABLE IF NOT EXISTS "usdmast" (
  "usdsno" SERIAL,
  "usdcomsno" INTEGER NOT NULL default '0',
  "usdusd" varchar(8) NOT NULL default '',
  "usdpwd" VARCHAR(200),
  "usduno" INTEGER default NULL,
  "usdnam" varchar(50) default NULL,
  "usdad1" varchar(50) default NULL,
  "usdad2" varchar(50) default NULL,
  "usdad3" varchar(50) default NULL,
  "usdtel" varchar(25) default NULL,
  "usdfax" varchar(25) default NULL,
  "usdmail" varchar(25) default NULL,
  "usdnic" varchar(10) default NULL,
  "usddes" varchar(25) default NULL,
  "usducdnew" varchar(40) default NULL,
  "usdentddt" date default NULL,
  "usdenttime" time NOT NULL default '00:00:00',
  "usducdame" varchar(40) default NULL,
  "usdameddt" date default NULL,
  "usdametime" time NOT NULL default '00:00:00',
  PRIMARY KEY  ("usdusd"),
  UNIQUE ("usdsno"),
  usdactive CHAR(1) NOT NULL DEFAULT 'Y',
  usdadmin BOOLEAN NOT NULL DEFAULT false
);

-- usdmast: 11 original source rows.
INSERT INTO "usdmast" ("usdsno","usdcomsno","usdusd","usdpwd","usduno","usdnam","usdad1","usdad2","usdad3","usdtel","usdfax","usdmail","usdnic","usddes","usducdnew","usdentddt","usdenttime","usducdame","usdameddt","usdametime","usdadmin") VALUES
(3,0,E'umesh',E'pwIkkzkRCAnVM',99,E'HRM',E'',E'',E'',E'',E'',E'hr@mikeflora.com',E'',E'ADM',NULL,NULL,E'00:00:00',NULL,NULL,E'00:00:00',true),
(23,0,E'madhu',E'pwY6bjfQbMAXM',99,E'madhu',E'',E'',E'',E'',E'',E'',E'',E'USR',NULL,NULL,E'00:00:00',NULL,NULL,E'00:00:00',false),
(6,0,E'rajika',E'pwYOfUEu2Zrls',99,E'',E'',E'',E'',E'',E'',E'',E'',E'ADM',NULL,NULL,E'00:00:00',NULL,NULL,E'00:00:00',true),
(22,0,E'sumedha',E'pwoG6UBobec96',99,E'sumedha',E'',E'',E'',E'',E'',E'',E'',E'ADM',NULL,NULL,E'00:00:00',NULL,NULL,E'00:00:00',true),
(19,0,E'nalaka',E'pwIkkzkRCAnVM',99,E'',E'',E'',E'',E'',E'',E'',E'',E'ADM',NULL,NULL,E'00:00:00',NULL,NULL,E'00:00:00',true),
(11,4,E'Manuja',E'pwIkkzkRCAnVM',0,E'',E'',E'',E'',E'',E'',E'',E'',E'USR',NULL,NULL,E'00:00:00',NULL,NULL,E'00:00:00',false),
(21,0,E'inokahr',E'pw3qsnUYD0tUc',99,E'',E'',E'',E'',E'',E'',E'',E'',E'ADM',NULL,NULL,E'00:00:00',NULL,NULL,E'00:00:00',true),
(15,0,E'nathasha',E'pws3mzxTSJCFs',99,E'NATHASHA',E'',E'',E'',E'',E'',E'',E'',E'ADM',NULL,NULL,E'00:00:00',NULL,NULL,E'00:00:00',true),
(18,0,E'2000',E'pws3mzxTSJCFs',99,E'',E'',E'',E'',E'',E'',E'',E'',E'ADM',NULL,NULL,E'00:00:00',NULL,NULL,E'00:00:00',true),
(17,0,E'inoka',E'pwYFwpjReVGRw',99,E'inoka',E'',E'',E'',E'',E'',E'',E'',E'ADM',NULL,NULL,E'00:00:00',NULL,NULL,E'00:00:00',true),
(20,0,E'ravi',E'pwrgiP1WACGfA',0,E'',E'',E'',E'',E'',E'',E'',E'',E'',NULL,NULL,E'00:00:00',NULL,NULL,E'00:00:00',false)
ON CONFLICT DO NOTHING;

-- Keep generated IDs above imported IDs without rewinding existing sequences.
SELECT setval(pg_get_serial_sequence('usdmast', 'usdsno'),
  GREATEST(COALESCE(MAX("usdsno"), 1), COALESCE((SELECT last_value FROM pg_sequences
    WHERE schemaname = current_schema() AND sequencename = 'usdmast_usdsno_seq'), 1)),
  MAX("usdsno") IS NOT NULL) FROM "usdmast";

CREATE TABLE IF NOT EXISTS "usrmast" (
  "usrsno" SERIAL,
  "usrusdsno" INTEGER NOT NULL default '0',
  "usrprgsno" INTEGER NOT NULL default '0',
  "usryn" char(1) default NULL,
  "usraddyn" char(1) default NULL,
  "usrameyn" char(1) default NULL,
  "usrdelyn" char(1) default NULL,
  "usrdisyn" char(1) default NULL,
  "usrupdyn" char(1) default NULL,
  "usrvssyn" char(1) default NULL,
  "usrucdnew" varchar(30) default NULL,
  "usrentddt" date default NULL,
  "usrenttime" time default NULL,
  "usrucdame" varchar(30) default NULL,
  "usrameddt" date default NULL,
  "usrametime" time default NULL,
  PRIMARY KEY  ("usrusdsno","usrprgsno"),
  UNIQUE ("usrsno")
);

-- Ordinary accounts receive page rights through the User Rights screen.

-- Keep generated IDs above imported IDs without rewinding existing sequences.
SELECT setval(pg_get_serial_sequence('usrmast', 'usrsno'),
  GREATEST(COALESCE(MAX("usrsno"), 1), COALESCE((SELECT last_value FROM pg_sequences
    WHERE schemaname = current_schema() AND sequencename = 'usrmast_usrsno_seq'), 1)),
  MAX("usrsno") IS NOT NULL) FROM "usrmast";

-- BEGIN WEB APP PROGRAM REGISTRATION
-- This import contains the complete setup; no second SQL file is needed.
LOCK TABLE a_sysmast, prgmast, usrmast IN SHARE ROW EXCLUSIVE MODE;

-- Remove obsolete programs and orphaned rights, keeping rights for this web app.
DELETE FROM usrmast r WHERE NOT EXISTS (
    SELECT 1 FROM prgmast p WHERE p.prgsno=r.usrprgsno AND p.prgapp='payroll-web'
);
DELETE FROM prgmast WHERE prgapp <> 'payroll-web';
CREATE UNIQUE INDEX IF NOT EXISTS prgmast_web_name ON prgmast(prgapp, prgnam) WHERE prgapp='payroll-web';

-- Keep generated IDs above rows already in the database.
SELECT setval(pg_get_serial_sequence('a_sysmast', 'syssno'),
    GREATEST(COALESCE(MAX(syssno), 0), COALESCE(pg_sequence_last_value(pg_get_serial_sequence('a_sysmast', 'syssno')::regclass), 0), 1), true) FROM a_sysmast;
SELECT setval(pg_get_serial_sequence('prgmast', 'prgsno'),
    GREATEST(COALESCE(MAX(prgsno), 0), COALESCE(pg_sequence_last_value(pg_get_serial_sequence('prgmast', 'prgsno')::regclass), 0), 1), true) FROM prgmast;

INSERT INTO a_sysmast(sysrtp, sysrno, sysdes) VALUES
    (32, 'WEBAPP', 'Payroll Web App'),
    (33, 'WEBPAGES', 'Application Pages')
ON CONFLICT DO NOTHING;

-- Register the actual Employee and User pages with all four permission choices.
INSERT INTO prgmast(prgmodsno, prgsmdsno, prgorder, prglvl, prgnam, prgdes, prgapp, prgucdnew, prgentddt, prgenttime)
SELECT m.syssno, s.syssno, page.display_order, 'M', page.name, page.description, 'payroll-web', 'web-setup', CURRENT_DATE, LOCALTIME
FROM a_sysmast m CROSS JOIN a_sysmast s CROSS JOIN (VALUES
    ('employees', 'Employee Master', '001'),
    ('users', 'User Master', '002')
) AS page(name, description, display_order)
WHERE m.sysrtp=32 AND m.sysrno='WEBAPP' AND s.sysrtp=33 AND s.sysrno='WEBPAGES'
ON CONFLICT DO NOTHING;
-- END WEB APP PROGRAM REGISTRATION
COMMIT;

-- Attendance correction setup (also available as db/migrations/001_attendance.sql).
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

-- Holiday Master setup (also available as db/migrations/002_holidays.sql).
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
