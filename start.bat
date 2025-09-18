@echo off
echo 🚀 Starting Foodily Auth App...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not installed. Please install npm first.
    pause
    exit /b 1
)

echo ✅ Node.js and npm are installed

REM Install server dependencies
echo 📦 Installing server dependencies...
cd server
npm install

REM Install client dependencies
echo 📦 Installing client dependencies...
cd ..\client
npm install

echo ✅ All dependencies installed successfully!

echo.
echo 🎉 Setup complete! To run the application:
echo.
echo 1. Start the backend server:
echo    cd server ^&^& npm start
echo.
echo 2. Start the frontend client (in a new terminal):
echo    cd client ^&^& npm run dev
echo.
echo 📱 Frontend: http://localhost:5173
echo 🔧 Backend:  http://localhost:5000
echo.
echo ⚠️  Make sure to configure your .env file in the server directory!
echo 📖 See README.md for detailed setup instructions.

pause
