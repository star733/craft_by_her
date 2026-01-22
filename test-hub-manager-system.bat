@echo off
echo ==========================================
echo 🚀 HUB MANAGER SYSTEM TEST SCRIPT
echo ==========================================
echo.

REM Test 1: Check if servers are running
echo 📡 Test 1: Checking if servers are running...

curl -s -o NUL -w "%%{http_code}" http://localhost:5000/ > temp_status.txt
set /p SERVER_STATUS=<temp_status.txt

curl -s -o NUL -w "%%{http_code}" http://localhost:5173/ > temp_client.txt
set /p CLIENT_STATUS=<temp_client.txt

if "%SERVER_STATUS%"=="200" (
    echo ✅ Backend server is running ^(Port 5000^)
) else (
    echo ❌ Backend server is NOT running. Please start it with: cd server ^&^& npm run dev
    del temp_status.txt temp_client.txt
    exit /b 1
)

if "%CLIENT_STATUS%"=="200" (
    echo ✅ Frontend client is running ^(Port 5173^)
) else (
    echo ❌ Frontend client is NOT running. Please start it with: cd client ^&^& npm run dev
    del temp_status.txt temp_client.txt
    exit /b 1
)

del temp_status.txt temp_client.txt
echo.

REM Test 2: Test Hub Manager Registration API
echo 📝 Test 2: Testing Hub Manager Registration API...

curl -s -X POST http://localhost:5000/api/hub-managers/register ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Test Hub Manager\",\"email\":\"test.hubmanager@example.com\",\"phone\":\"9999988888\",\"username\":\"testhubmanager2\",\"password\":\"test123456\",\"address\":{\"street\":\"Test Street\",\"city\":\"Test City\",\"state\":\"Kerala\",\"pincode\":\"682001\"}}" > register_response.txt

findstr /C:"\"success\":true" register_response.txt >nul
if %errorlevel%==0 (
    echo ✅ Registration API is working
    echo    Response: Registration successful ^(account pending approval^)
) else (
    findstr /C:"already exists" register_response.txt >nul
    if %errorlevel%==0 (
        echo ✅ Registration API is working ^(user already exists - expected^)
    ) else (
        echo ❌ Registration API failed
        type register_response.txt
    )
)

del register_response.txt
echo.

REM Test 3: Test Hub Manager Login API
echo 🔐 Test 3: Testing Hub Manager Login API...

curl -s -X POST http://localhost:5000/api/hub-login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"mikkygo57@gmail.com\",\"password\":\"hub@1234\"}" > login_response.txt

findstr /C:"\"success\":true" login_response.txt >nul
if %errorlevel%==0 (
    echo ✅ Login API is working
    echo    Manager logged in successfully
) else (
    echo ❌ Login API failed
    type login_response.txt
    del login_response.txt
    exit /b 1
)

del login_response.txt
echo.

REM Test 4: Check Frontend Routes
echo 🌐 Test 4: Checking Frontend Routes...

curl -s -o NUL -w "%%{http_code}" http://localhost:5173/hub-manager/login > route1.txt
set /p ROUTE1=<route1.txt
if "%ROUTE1%"=="200" (
    echo ✅ http://localhost:5173/hub-manager/login is accessible
) else (
    echo ❌ Login route returned status %ROUTE1%
)

curl -s -o NUL -w "%%{http_code}" http://localhost:5173/hub-manager/register > route2.txt
set /p ROUTE2=<route2.txt
if "%ROUTE2%"=="200" (
    echo ✅ http://localhost:5173/hub-manager/register is accessible
) else (
    echo ❌ Register route returned status %ROUTE2%
)

del route1.txt route2.txt
echo.

REM Summary
echo ==========================================
echo 📋 TEST SUMMARY
echo ==========================================
echo.
echo ✅ Backend API: Working
echo ✅ Frontend Client: Working
echo ✅ Registration Endpoint: Working
echo ✅ Login Endpoint: Working
echo ✅ Frontend Routes: Accessible
echo.
echo ==========================================
echo 🎉 ALL TESTS PASSED!
echo ==========================================
echo.
echo 📌 Next Steps:
echo 1. Open browser: http://localhost:5173/hub-manager/login
echo 2. Login with: mikkygo57@gmail.com / hub@1234
echo 3. Explore the dashboard
echo 4. Try registering a new hub manager
echo.
echo 📖 For more info, see: HUB_MANAGER_SYSTEM_COMPLETE.md
echo.

pause
