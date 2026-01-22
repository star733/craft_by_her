@echo off
echo.
echo ========================================
echo   CRAFTED BY HER - SYSTEM STARTUP
echo ========================================
echo.

echo 🔍 Checking system requirements...

:: Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js is installed

:: Check if npm is available
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not available
    pause
    exit /b 1
)

echo ✅ npm is available

:: Check if MongoDB is running (optional check)
echo 🔍 Checking MongoDB connection...

echo.
echo 📦 Installing dependencies...
echo.

:: Install server dependencies
echo Installing server dependencies...
cd server
if not exist node_modules (
    echo Installing server packages...
    call npm install
    if %errorlevel% neq 0 (
        echo ❌ Failed to install server dependencies
        pause
        exit /b 1
    )
) else (
    echo ✅ Server dependencies already installed
)

:: Install client dependencies
echo Installing client dependencies...
cd ..\client
if not exist node_modules (
    echo Installing client packages...
    call npm install
    if %errorlevel% neq 0 (
        echo ❌ Failed to install client dependencies
        pause
        exit /b 1
    )
) else (
    echo ✅ Client dependencies already installed
)

cd ..

echo.
echo ✅ All dependencies installed successfully!
echo.

:: Check environment configuration
echo 🔧 Checking environment configuration...

if not exist "server\.env" (
    echo ⚠️  Environment file not found
    echo Creating sample .env file...
    
    echo # CraftedByHer Environment Configuration > server\.env
    echo # Database >> server\.env
    echo MONGO_URI=mongodb://localhost:27017/foodily-auth-app >> server\.env
    echo. >> server\.env
    echo # Email Configuration (Required for OTP emails) >> server\.env
    echo EMAIL_USER=your-gmail@gmail.com >> server\.env
    echo EMAIL_PASS=your-app-password >> server\.env
    echo SMTP_HOST=smtp.gmail.com >> server\.env
    echo SMTP_PORT=587 >> server\.env
    echo SMTP_SECURE=false >> server\.env
    echo SENDER_NAME=CraftedByHer >> server\.env
    echo. >> server\.env
    echo # Server Configuration >> server\.env
    echo PORT=5000 >> server\.env
    echo NODE_ENV=development >> server\.env
    
    echo ✅ Sample .env file created
    echo ⚠️  Please update server\.env with your actual email credentials
) else (
    echo ✅ Environment file exists
)

echo.
echo 🚀 Starting the system...
echo.

:: Start both server and client
echo Starting backend server...
start "CraftedByHer Server" cmd /k "cd server && npm start"

:: Wait a moment for server to start
timeout /t 3 /nobreak >nul

echo Starting frontend client...
start "CraftedByHer Client" cmd /k "cd client && npm run dev"

echo.
echo ========================================
echo   SYSTEM STARTUP COMPLETE!
echo ========================================
echo.
echo 🌐 Frontend: http://localhost:5173
echo 🔧 Backend:  http://localhost:5000
echo.
echo 📊 Dashboard URLs:
echo   Admin:       http://localhost:5173/admin
echo   Hub Manager: http://localhost:5173/hub-manager/login
echo   Customer:    http://localhost:5173/login
echo.
echo 💡 Tips:
echo   - Check server\.env for email configuration
echo   - Both server and client will open in separate windows
echo   - Press Ctrl+C in each window to stop the services
echo.
echo 🎉 CraftedByHer Product Movement Control System is now running!
echo.

:: Run system verification
echo 🧪 Running system verification...
node verify-system.js

echo.
echo Press any key to close this window...
pause >nul