"""
Base Test Class
This class provides common setup and teardown methods for all test classes
"""
import os
import time
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from webdriver_manager.chrome import ChromeDriverManager
from config import Config


class BaseTest:
    """Base test class with common methods"""
    
    def setup_method(self):
        """Setup method - runs before each test"""
        # Setup Chrome options
        chrome_options = Options()
        if Config.HEADLESS:
            chrome_options.add_argument("--headless")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--window-size=1920,1080")
        
        # Initialize the driver
        service = Service(ChromeDriverManager().install())
        self.driver = webdriver.Chrome(service=service, options=chrome_options)
        
        # Set timeouts
        self.driver.implicitly_wait(Config.IMPLICIT_WAIT)
        self.driver.set_page_load_timeout(Config.PAGE_LOAD_TIMEOUT)
        
        # Maximize window
        if Config.MAXIMIZE_WINDOW and not Config.HEADLESS:
            self.driver.maximize_window()
        
        # Initialize wait
        self.wait = WebDriverWait(self.driver, Config.EXPLICIT_WAIT)
        
        # Navigate to base URL
        self.driver.get(Config.BASE_URL)
        time.sleep(2)  # Wait for initial page load
    
    def teardown_method(self):
        """Teardown method - runs after each test"""
        if self.driver:
            self.driver.quit()
    
    def take_screenshot(self, name):
        """Take a screenshot and save it"""
        if not os.path.exists(Config.SCREENSHOT_DIR):
            os.makedirs(Config.SCREENSHOT_DIR)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{Config.SCREENSHOT_DIR}/{name}_{timestamp}.png"
        self.driver.save_screenshot(filename)
        print(f"Screenshot saved: {filename}")
        return filename
    
    def scroll_to_element(self, element):
        """Scroll to make element visible"""
        self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", element)
        time.sleep(0.5)
    
    def wait_for_element(self, by, value, timeout=None):
        """Wait for element to be present"""
        if timeout is None:
            timeout = Config.EXPLICIT_WAIT
        try:
            element = WebDriverWait(self.driver, timeout).until(
                EC.presence_of_element_located((by, value))
            )
            return element
        except TimeoutException:
            print(f"Element not found: {by}={value}")
            self.take_screenshot("element_not_found")
            raise
    
    def wait_for_clickable(self, by, value, timeout=None):
        """Wait for element to be clickable"""
        if timeout is None:
            timeout = Config.EXPLICIT_WAIT
        try:
            element = WebDriverWait(self.driver, timeout).until(
                EC.element_to_be_clickable((by, value))
            )
            return element
        except TimeoutException:
            print(f"Element not clickable: {by}={value}")
            self.take_screenshot("element_not_clickable")
            raise
    
    def safe_click(self, element):
        """Click element with error handling"""
        try:
            self.scroll_to_element(element)
            element.click()
        except Exception as e:
            print(f"Click failed, trying JavaScript click: {e}")
            self.driver.execute_script("arguments[0].click();", element)
    
    def safe_send_keys(self, element, text):
        """Send keys with error handling"""
        try:
            element.clear()
            element.send_keys(text)
        except Exception as e:
            print(f"Send keys failed: {e}")
            raise


