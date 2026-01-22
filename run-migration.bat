@echo off
echo ================================================
echo   SELLER PRODUCT OWNERSHIP MIGRATION
echo ================================================
echo.
echo This script will migrate your existing products
echo to the seller ownership system.
echo.
echo WHAT IT DOES:
echo - Assigns all products to an approved seller
echo - Adds sellerId, sellerName, sellerEmail to products
echo - Safe operation (read-modify products only)
echo.
pause
echo.
echo Starting migration...
echo.

cd server
node migrate-products-to-sellers.js

echo.
echo ================================================
echo   MIGRATION COMPLETE
echo ================================================
echo.
echo NEXT STEPS:
echo 1. Restart your server (if running)
echo 2. Test seller dashboard (sellers see only their products)
echo 3. Test admin dashboard (admin sees all products with seller info)
echo.
pause
