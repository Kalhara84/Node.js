@echo off
set PGPASSWORD=mypass
"%~dp0pg_dump.exe" -h localhost -p 5432 -U postgres -d payrolldb_test --no-owner --no-privileges --clean --if-exists -f "%~dp0payroll_db_dump1.sql"
pause
