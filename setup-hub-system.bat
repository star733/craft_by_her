@echo off
echo ========================================
echo   CraftedByHer Hub System Setup
echo ========================================
echo.

echo Step 1: Installing dependencies...
cd server
call npm install
echo.

echo Step 2: Seeding hubs for all Kerala districts...
node seed-hubs.js
echo.

echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo Next Steps:
echo 1. Start your server: npm start
echo 2. Create hub managers via Admin Dashboard
echo 3. Assign managers to hubs
echo 4. Test the order flow
echo.
echo See HUB_SYSTEM_README.md for detailed documentation
echo.
pause
