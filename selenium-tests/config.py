# Configuration file for Selenium tests
# This file contains all the configuration settings for the test suite

class Config:
    # Application URLs
    BASE_URL = "http://localhost:5173"  # Your React app URL (adjust if different)
    
    # Test User Credentials
    TEST_USER = {
        "name": "Manu",
        "email": "manu09@example.com",
        "password": "manu@123",
        "phone": "9876543210"
    }
    
    # Existing User for Login Test (you can change this to an existing user)
    EXISTING_USER = {
        "email": "saji@gmail.com",
        "password": "11223344"
    }
    
    # Timeouts (in seconds)
    IMPLICIT_WAIT = 10
    EXPLICIT_WAIT = 15
    PAGE_LOAD_TIMEOUT = 30
    
    # Browser Settings
    HEADLESS = False  # Set to True to run tests without opening browser
    MAXIMIZE_WINDOW = True
    
    # Screenshot Settings
    SCREENSHOT_ON_FAILURE = True
    SCREENSHOT_DIR = "selenium-tests/screenshots"
    
    # Report Settings
    REPORT_DIR = "selenium-tests/reports"
    REPORT_TITLE = "Foodily App - Frontend Automation Test Report"


