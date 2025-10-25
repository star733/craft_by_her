# ✅ Pre-Test Execution Checklist

## Before Running Tests - Please Verify:

### 1. Application Status ✅

- [ ] **Frontend is running**
  ```bash
  cd client
  npm run dev
  ```
  - Should be accessible at: `http://localhost:5173`
  - Test by opening in browser

- [ ] **Backend is running**
  ```bash
  cd server
  npm start
  ```
  - Should be accessible at: `http://localhost:5000`
  - Database should be connected

### 2. Configuration ✅

- [ ] **Open `config.py`** and verify:
  
  - [ ] `BASE_URL` matches your frontend URL
    ```python
    BASE_URL = "http://localhost:5173"  # ← Correct?
    ```
  
  - [ ] `EXISTING_USER` has valid credentials
    ```python
    EXISTING_USER = {
        "email": "test@example.com",     # ← Update with real user
        "password": "Test123!"            # ← Update with real password
    }
    ```
    **Important**: This user must exist in your database!
  
  - [ ] `TEST_USER` email is unique (for registration test)
    ```python
    TEST_USER = {
        "email": "selenium_test_user@example.com",  # ← Should not exist yet
    }
    ```

### 3. System Requirements ✅

- [ ] **Python 3.8+** is installed
  ```bash
  python --version
  # or
  python3 --version
  ```

- [ ] **Google Chrome** browser is installed
  - Check: Open Chrome → Help → About Google Chrome

- [ ] **Internet connection** is active
  - Needed for downloading ChromeDriver on first run

### 4. Database Status ✅

- [ ] **At least one product** exists in database
  - Tests need products to add to cart/wishlist

- [ ] **Test user** (from `EXISTING_USER`) exists
  - Or create one via your app first

- [ ] **Registration email** is unique
  - `selenium_test_user@example.com` should not exist yet
  - Or change it in `config.py`

### 5. Browser Requirements ✅

- [ ] Chrome is updated to latest version
- [ ] No other automated testing running
- [ ] Sufficient screen resolution (minimum 1024x768)

---

## Quick Pre-Flight Test

Run these commands to verify everything:

```bash
# 1. Check if frontend is running
curl http://localhost:5173
# Should return HTML content

# 2. Check if backend is running
curl http://localhost:5000
# Should return API response or "Cannot GET /"

# 3. Check Python
python --version
# Should show Python 3.8 or higher

# 4. Check Chrome
# Windows: "C:\Program Files\Google\Chrome\Application\chrome.exe" --version
# Linux: google-chrome --version
# Mac: /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --version
```

---

## Ready to Run? 🚀

Once all checkboxes above are ticked:

### Windows:
```cmd
cd selenium-tests
run_tests.bat
```

### Linux/Mac:
```bash
cd selenium-tests
chmod +x run_tests.sh
./run_tests.sh
```

---

## After Test Execution

### Check Results:

- [ ] **Console output** - All tests passed?
- [ ] **HTML Report** - Open `reports/test_report.html`
- [ ] **Screenshots** - Check `screenshots/` folder
- [ ] **All 4 tests** executed successfully

### Expected Output:

```
========================================
Running Tests
========================================

test_01_registration.py::TestRegistration::test_user_registration PASSED
test_02_login.py::TestLogin::test_user_login PASSED
test_03_add_to_cart.py::TestAddToCart::test_add_to_cart PASSED
test_04_wishlist.py::TestWishlist::test_wishlist PASSED

========================================
4 passed in XX.XXs
========================================
```

---

## Troubleshooting Quick Fixes

### If Tests Fail:

**❌ Connection Error**
- ✅ Fix: Start your app (`npm run dev`)

**❌ Login Test Fails**
- ✅ Fix: Update `EXISTING_USER` credentials in `config.py`

**❌ Element Not Found**
- ✅ Fix: Increase wait times in `config.py`
  ```python
  IMPLICIT_WAIT = 15
  EXPLICIT_WAIT = 20
  ```

**❌ Registration Test Fails**
- ✅ Fix: Change `TEST_USER` email to something unique

**❌ ChromeDriver Error**
- ✅ Fix: Check internet connection, script will auto-download

---

## Post-Test Cleanup (Optional)

If you want to clean up test data:

- [ ] Delete test user: `selenium_test_user@example.com`
- [ ] Clear test cart items
- [ ] Clear test wishlist items
- [ ] Delete screenshots: `selenium-tests/screenshots/`
- [ ] Delete reports: `selenium-tests/reports/`

---

## Important Notes

⚠️ **Before Each Test Run:**
- Make sure app is running
- Verify credentials are valid
- Check that test user email is unique (for registration test)

✅ **After Test Run:**
- Check HTML report for detailed results
- Review screenshots for visual confirmation
- Check console for any warnings

---

## Need Help?

📖 **Documentation:**
- Full Guide: `README.md`
- Quick Start: `QUICK_START.md`
- Summary: `../SELENIUM_TESTS_SUMMARY.md`

🐛 **Common Issues:**
- See "Troubleshooting" section in `README.md`
- Check console output for error messages
- Review screenshots for visual debugging

---

**Happy Testing! 🎉**


