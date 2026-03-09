@echo off
REM deploy-db.bat - Deploy Supabase functions on Windows
REM Usage: deploy-db.bat

echo.
echo ========================================
echo   Raatap Supabase Database Deployment
echo ========================================
echo.

REM Check if .env.local exists
if not exist ".env.local" (
    echo [ERROR] .env.local not found!
    echo.
    echo Please create a .env.local file with:
    echo   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
    echo   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
    echo.
    pause
    exit /b 1
)

REM Load environment variables
for /f "delims=" %%a in ('findstr /R "^NEXT_PUBLIC_SUPABASE_URL=" .env.local') do set "%%a"
for /f "delims=" %%a in ('findstr /R "^SUPABASE_SERVICE_ROLE_KEY=" .env.local') do set "%%a"

if "%NEXT_PUBLIC_SUPABASE_URL%"=="" (
    echo [ERROR] NEXT_PUBLIC_SUPABASE_URL not found in .env.local
    pause
    exit /b 1
)

if "%SUPABASE_SERVICE_ROLE_KEY%"=="" (
    echo [ERROR] SUPABASE_SERVICE_ROLE_KEY not found in .env.local
    pause
    exit /b 1
)

echo [INFO] Environment variables loaded
echo.

REM Check if supabase CLI is installed
where supabase >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Supabase CLI not found!
    echo.
    echo Please install it with: npm install -g supabase
    echo.
    pause
    exit /b 1
)

echo [INFO] Supabase CLI found
echo.

REM Check if logged in
supabase whoami >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] Not logged in to Supabase. Opening login page...
    supabase login
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Login failed or cancelled
        pause
        exit /b 1
    )
)

echo.
echo [INFO] Deploying database functions...
echo.

REM SQL files in order
set "SQL_FILES=database\functions\01_create_rides.sql database\functions\02_matching.sql database\functions\03_match_management.sql database\functions\04_seat_management.sql database\functions\05_auto_create_triggers.sql database\functions\06_idempotent_matching.sql database\functions\07_match_workflow_updates.sql database\functions\08_enforce_capacity.sql database\functions\09_standardize_match_functions.sql"

REM Deploy each file
for %%f in (%SQL_FILES%) do (
    if exist "%%f" (
        echo [DEPLOYING] %%f
        supabase db push --include-all
        if %ERRORLEVEL% NEQ 0 (
            echo [ERROR] Failed to deploy %%f
            pause
            exit /b 1
        )
        echo [OK] %%f deployed
        echo.
    ) else (
        echo [WARNING] File not found: %%f
        echo.
    )
)

echo.
echo ========================================
echo   Deployment Complete!
echo ========================================
echo.
echo Next steps:
echo   1. Check Supabase Dashboard - Database - Functions
echo   2. Verify triggers in Database - Triggers
echo   3. Test the app
echo.
pause
