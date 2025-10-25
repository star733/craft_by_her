"""
Pytest Configuration File
This file contains pytest hooks and fixtures
"""
import pytest
import os
from datetime import datetime
from config import Config


def pytest_configure(config):
    """Create necessary directories before tests run"""
    # Create screenshots directory
    if not os.path.exists(Config.SCREENSHOT_DIR):
        os.makedirs(Config.SCREENSHOT_DIR)
    
    # Create reports directory
    if not os.path.exists(Config.REPORT_DIR):
        os.makedirs(Config.REPORT_DIR)


@pytest.hookimpl(tryfirst=True, hookwrapper=True)
def pytest_runtest_makereport(item, call):
    """
    Hook to capture test results and take screenshots on failure
    """
    outcome = yield
    report = outcome.get_result()
    
    # Set report attribute for each test phase
    setattr(item, f"report_{report.when}", report)
    
    # Take screenshot on failure
    if report.when == "call" and report.failed:
        if Config.SCREENSHOT_ON_FAILURE:
            try:
                # Get the test instance
                test_instance = item.instance
                if hasattr(test_instance, 'driver'):
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    screenshot_name = f"FAILED_{item.name}_{timestamp}"
                    test_instance.take_screenshot(screenshot_name)
            except Exception as e:
                print(f"Could not take screenshot: {e}")


def pytest_html_report_title(report):
    """Customize HTML report title"""
    report.title = Config.REPORT_TITLE


