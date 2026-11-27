@echo off
set PGPASSWORD=mypass
"%~dp0psql.exe" -h localhost -p 5432 -U postgres -d payrolldb_test -v ON_ERROR_STOP=1 -f "%~dp0payroll_db.sql"
pause
