# Foodily App - Selenium Test Automation Suite

## 📋 Overview

This is a comprehensive Selenium automation test suite for the Foodily App frontend. The suite tests the following critical functionalities:

1. **User Registration** - Test user sign-up functionality
2. **User Login** - Test user authentication
3. **Add to Cart** - Test adding products to shopping cart
4. **Wishlist** - Test adding products to wishlist

## 🎯 Test Coverage

| Test Case | Description | Status |
|-----------|-------------|--------|
| `test_01_registration.py` | Validates user registration flow | ✅ |
| `test_02_login.py` | Validates user login functionality | ✅ |
| `test_03_add_to_cart.py` | Validates add to cart functionality | ✅ |
| `test_04_wishlist.py` | Validates wishlist functionality | ✅ |

## 📁 Project Structure

```
selenium-tests/
├── base_test.py              # Base test class with common methods
├── config.py                 # Configuration settings
├── conftest.py               # Pytest configuration and hooks
├── requirements.txt          # Python dependencies
├── run_tests.bat             # Windows test runner
├── run_tests.sh              # Linux/Mac test runner
├── test_01_registration.py   # Registration test
├── test_02_login.py          # Login test
├── test_03_add_to_cart.py    # Add to cart test
├── test_04_wishlist.py       # Wishlist test
├── screenshots/              # Test screenshots (auto-generated)
└── reports/                  # Test reports (auto-generated)
```

## 🔧 Prerequisites

- **Python 3.8 or higher**
- **Google Chrome browser** (latest version)
- **Internet connection** (for downloading ChromeDriver)
- **Your Foodily app should be running** on `http://localhost:5173`

## 📦 Installation

### Windows

1. Open Command Prompt or PowerShell
2. Navigate to the `selenium-tests` directory:
   ```cmd
   cd selenium-tests
   ```
3. Run the test suite:
   ```cmd
   run_tests.bat
   ```

### Linux/Mac

1. Open Terminal
2. Navigate to the `selenium-tests` directory:
   ```bash
   cd selenium-tests
   ```
3. Make the script executable:
   ```bash
   chmod +x run_tests.sh
   ```
4. Run the test suite:
   ```bash
   ./run_tests.sh
   ```

## ⚙️ Configuration

Before running tests, update the configuration in `config.py`:

```python
class Config:
    # Update this to your app's URL
    BASE_URL = "http://localhost:5173"
    
    # Update these with valid credentials for login tests
    EXISTING_USER = {
        "email": "your-email@example.com",
        "password": "YourPassword123"
    }
    
    # Test user details (for registration)
    TEST_USER = {
        "name": "Test User Selenium",
        "email": "selenium_test_user@example.com",
        "password": "TestPassword123!",
        "phone": "9876543210"
    }
```

### Important Configuration Options:

- **`BASE_URL`**: Your application URL (default: `http://localhost:5173`)
- **`HEADLESS`**: Set to `True` to run tests without opening browser
- **`EXISTING_USER`**: Valid credentials for login tests
- **`TEST_USER`**: New user details for registration test

## 🚀 Running Tests

### Run All Tests

```bash
# Windows
run_tests.bat

# Linux/Mac
./run_tests.sh
```

### Run Specific Test

```bash
# Activate virtual environment first
# Windows: venv\Scripts\activate
# Linux/Mac: source venv/bin/activate

# Run specific test
pytest test_01_registration.py -v
pytest test_02_login.py -v
pytest test_03_add_to_cart.py -v
pytest test_04_wishlist.py -v
```

### Run Tests in Headless Mode

Edit `config.py` and set:
```python
HEADLESS = True
```

## 📊 Test Reports

After running tests, you'll find:

1. **HTML Report**: `reports/test_report.html`
   - Open this file in a browser to view detailed test results
   - Contains test execution time, pass/fail status, and error details

2. **Screenshots**: `screenshots/` folder
   - Screenshots are automatically taken during test execution
   - Failed tests generate additional failure screenshots
   - Named with timestamp for easy identification

## 🎬 Test Flow

### Test 1: Registration
1. Navigate to registration page
2. Fill in user details (name, email, password, phone)
3. Submit the form
4. Verify successful registration

### Test 2: Login
1. Navigate to login page
2. Enter credentials
3. Submit login form
4. Verify successful login (redirected away from login page)

### Test 3: Add to Cart
1. Login to the application
2. Navigate to products page
3. Select a product
4. Add product to cart
5. Navigate to cart page
6. Verify product is in cart

### Test 4: Wishlist
1. Login to the application
2. Navigate to products page
3. Select a product
4. Click wishlist/heart icon
5. Navigate to wishlist page
6. Verify product is in wishlist

## 🔍 Troubleshooting

### Common Issues:

**1. ChromeDriver Error**
- Solution: The script automatically downloads the correct ChromeDriver version
- If issues persist, manually download from https://chromedriver.chromium.org/

**2. Element Not Found**
- Check if your app is running on the correct URL
- Increase timeouts in `config.py` (EXPLICIT_WAIT, IMPLICIT_WAIT)
- UI might have changed - update element locators in test files

**3. Login Test Fails**
- Ensure `EXISTING_USER` credentials in `config.py` are correct
- Check if the user exists in your database

**4. Tests Run Too Fast**
- Browser closes before you can see what happened
- Set `HEADLESS = False` in config.py
- Add time.sleep() statements in test files for debugging

**5. Application Not Running**
- Make sure your React app is running: `npm run dev`
- Check if it's accessible at `http://localhost:5173`
- Update `BASE_URL` in config.py if running on different port

## 📝 Test Data

### Registration Test
- Creates a new user with email: `selenium_test_user@example.com`
- You can change this in `config.py` before running

### Login Test
- Uses credentials from `EXISTING_USER` in `config.py`
- **Important**: Update these with valid credentials before running

## 🎨 Customization

### Add More Tests

1. Create a new test file: `test_05_your_test.py`
2. Import BaseTest: `from base_test import BaseTest`
3. Create your test class:
```python
class TestYourFeature(BaseTest):
    def test_your_feature(self):
        # Your test code here
        pass
```

### Modify Locators

If your app's HTML structure changes, update the XPath/CSS selectors in the test files:
- Registration: `test_01_registration.py`
- Login: `test_02_login.py`
- Cart: `test_03_add_to_cart.py`
- Wishlist: `test_04_wishlist.py`

## 📈 Best Practices

✅ **DO:**
- Run tests on a clean database state
- Keep test data separate from production data
- Update config.py with correct URLs and credentials
- Review screenshots after test runs
- Check HTML report for detailed information

❌ **DON'T:**
- Run tests against production environment
- Hardcode sensitive data in test files
- Delete screenshots folder (it's auto-generated)
- Modify base_test.py unless necessary

## 🆘 Support

If you encounter issues:
1. Check the HTML report in `reports/test_report.html`
2. Review screenshots in `screenshots/` folder
3. Ensure your app is running correctly
4. Verify configuration in `config.py`
5. Check console output for detailed error messages

## 📄 License

This test suite is created for the Foodily App project.

---

**Happy Testing! 🎉**


