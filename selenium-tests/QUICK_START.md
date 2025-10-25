# 🚀 Quick Start Guide - Selenium Tests

## Prerequisites Checklist

Before running tests, make sure:

- [ ] **Your Foodily app is running** at `http://localhost:5173`
  ```bash
  # In your project root, run:
  cd client
  npm run dev
  ```

- [ ] **Your backend server is running** at `http://localhost:5000`
  ```bash
  # In your project root, run:
  cd server
  npm start
  ```

- [ ] **Python 3.8+** is installed
  ```bash
  python --version
  # or
  python3 --version
  ```

- [ ] **Google Chrome** browser is installed

## ⚡ Running Tests (3 Simple Steps)

### For Windows:

1. **Open Command Prompt** or PowerShell

2. **Navigate to test folder**:
   ```cmd
   cd selenium-tests
   ```

3. **Run tests**:
   ```cmd
   run_tests.bat
   ```

### For Linux/Mac:

1. **Open Terminal**

2. **Navigate to test folder**:
   ```bash
   cd selenium-tests
   ```

3. **Run tests**:
   ```bash
   chmod +x run_tests.sh
   ./run_tests.sh
   ```

## 📝 Important Configuration

**Before running tests**, open `config.py` and update:

```python
# If your app runs on a different port, change this:
BASE_URL = "http://localhost:5173"

# Update with a valid user for login tests:
EXISTING_USER = {
    "email": "test@example.com",      # ← Change this
    "password": "Test123!"             # ← Change this
}
```

## 📊 Viewing Results

After tests complete:

1. **Open the HTML report**:
   - Go to `selenium-tests/reports/test_report.html`
   - Double-click to open in browser
   - View detailed test results

2. **Check screenshots**:
   - Go to `selenium-tests/screenshots/`
   - View screenshots taken during test execution

## 🎯 What Gets Tested?

✅ **User Registration** - Sign up flow  
✅ **User Login** - Authentication  
✅ **Add to Cart** - Shopping cart functionality  
✅ **Wishlist** - Add items to wishlist

## 🐛 Common Issues & Solutions

### Issue: "Connection refused" or "Cannot reach server"
**Solution**: Make sure your app is running (`npm run dev` in client folder)

### Issue: "Login test failed"
**Solution**: Update `EXISTING_USER` credentials in `config.py` with a valid user

### Issue: "ChromeDriver error"
**Solution**: The script auto-downloads ChromeDriver. If it fails, check your internet connection

### Issue: "Element not found"
**Solution**: Increase wait times in `config.py`:
```python
IMPLICIT_WAIT = 15  # Increase from 10
EXPLICIT_WAIT = 20  # Increase from 15
```

## 💡 Tips

- **First time running?** The script will automatically:
  - Create a virtual environment
  - Install all required packages
  - Download ChromeDriver
  - Run all tests

- **Want to see the browser?** Tests run with browser visible by default

- **Want headless mode?** Edit `config.py`: `HEADLESS = True`

- **Need to re-run?** Just run the same command again!

## 📞 Need Help?

1. Check `README.md` for detailed documentation
2. Review test output in the console
3. Check `reports/test_report.html` for detailed results
4. View `screenshots/` folder for visual confirmation

---

**That's it! Happy Testing! 🎉**


