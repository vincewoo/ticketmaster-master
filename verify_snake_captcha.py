from playwright.sync_api import sync_playwright, expect

def verify_snake_captcha():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto('http://localhost:8000')

        # Wait for the start modal and click the single player button
        expect(page.locator("#start-modal")).to_be_visible()
        page.click('#single-player-btn')

        # Wait for the loading modal to be hidden.
        expect(page.locator("#loading-modal")).to_be_hidden(timeout=10000)

        # Now that the loading is done, the seating chart should be visible.
        expect(page.locator('#seating-chart')).to_be_visible()

        # Open debug panel
        page.keyboard.press('`')
        expect(page.locator('#debug-panel')).to_be_visible()

        # Click the snake captcha button, forcing the click even if it's not in view
        page.click('#debug-snake-captcha', force=True)

        expect(page.locator('#snake-captcha-modal')).to_be_visible()

        # Take a screenshot
        page.screenshot(path='snake_captcha_verification.png')
        browser.close()

if __name__ == '__main__':
    verify_snake_captcha()
