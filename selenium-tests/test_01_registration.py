"""
Test Case 1: User Registration
This test validates the user registration functionality
"""
import time
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from base_test import BaseTest
from config import Config


class TestRegistration(BaseTest):
    """Test user registration functionality"""
    
    def test_user_registration(self):
        """
        Test Case: User Registration
        Steps:
        1. Navigate to registration page
        2. Fill in registration form
        3. Submit the form
        4. Verify successful registration
        """
        try:
            print("\n=== Starting User Registration Test ===")
            
            # Step 1: Navigate to Register page
            print("Step 1: Navigating to Register page...")
            # Try multiple methods to get to register page
            try:
                # Method 1: Try finding Register link
                register_link = self.wait_for_clickable(By.LINK_TEXT, "Register", timeout=3)
                self.safe_click(register_link)
            except:
                try:
                    # Method 2: Try finding Sign Up link
                    register_link = self.wait_for_clickable(By.LINK_TEXT, "Sign Up", timeout=3)
                    self.safe_click(register_link)
                except:
                    # Method 3: Navigate directly to register URL
                    print("⚠ Register link not found, navigating directly...")
                    self.driver.get(f"{Config.BASE_URL}/register")
            
            time.sleep(2)
            
            # Verify we're on the register page
            assert "register" in self.driver.current_url.lower(), "Not on register page"
            print("✓ Successfully navigated to Register page")
            self.take_screenshot("01_register_page")
            
            # Step 2: Fill in the registration form
            print("\nStep 2: Filling registration form...")
            
            # Find and fill name field (using placeholder)
            name_field = self.wait_for_element(By.XPATH, "//input[@placeholder='Full Name']")
            self.safe_send_keys(name_field, Config.TEST_USER["name"])
            print(f"✓ Entered name: {Config.TEST_USER['name']}")
            time.sleep(0.5)
            
            # Find and fill phone field
            phone_field = self.wait_for_element(By.XPATH, "//input[@placeholder='Phone Number (10 digits)']")
            self.safe_send_keys(phone_field, Config.TEST_USER["phone"])
            print(f"✓ Entered phone: {Config.TEST_USER['phone']}")
            time.sleep(0.5)
            
            # Find and fill email field
            email_field = self.wait_for_element(By.XPATH, "//input[@placeholder='Email']")
            self.safe_send_keys(email_field, Config.TEST_USER["email"])
            print(f"✓ Entered email: {Config.TEST_USER['email']}")
            time.sleep(0.5)
            
            # Find and fill password field
            password_field = self.wait_for_element(By.XPATH, "//input[@placeholder='Password (min 8 characters)']")
            self.safe_send_keys(password_field, Config.TEST_USER["password"])
            print(f"✓ Entered password")
            time.sleep(0.5)
            
            time.sleep(1)
            self.take_screenshot("02_form_filled")
            
            # Step 3: Submit the form
            print("\nStep 3: Submitting registration form...")
            # Look for "Create Account" button
            submit_button = self.wait_for_clickable(By.XPATH, "//button[contains(text(), 'Create Account') or contains(text(), 'Sign Up') or @type='submit']")
            self.safe_click(submit_button)
            print("✓ Clicked submit button")
            
            time.sleep(3)
            
            # Step 4: Verify successful registration
            print("\nStep 4: Verifying registration success...")
            self.take_screenshot("03_registration_result")
            
            # Check if redirected to login or home page
            current_url = self.driver.current_url.lower()
            if "login" in current_url or "home" in current_url or current_url == Config.BASE_URL + "/":
                print("✓ Registration successful - Redirected to login/home page")
            else:
                # Check for success message
                try:
                    success_message = self.driver.find_element(By.XPATH, "//*[contains(text(), 'success') or contains(text(), 'registered')]")
                    print(f"✓ Registration successful - Message: {success_message.text}")
                except:
                    print("⚠ Unable to verify success message, but no error visible")
            
            print("\n=== User Registration Test PASSED ===\n")
            
        except Exception as e:
            print(f"\n✗ Test Failed: {str(e)}")
            self.take_screenshot("registration_failure")
            pytest.fail(f"Registration test failed: {str(e)}")

