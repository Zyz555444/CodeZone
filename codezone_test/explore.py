"""Explore CodeZone website to find issues."""
from playwright.sync_api import sync_playwright
import time
import os

os.makedirs('/workspace/codezone_test/screenshots', exist_ok=True)

issues = []

def log_issue(category, description):
    issues.append(f"[{category}] {description}")
    print(f"[{category}] {description}")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1440, 'height': 900})
    page = context.new_page()

    console_msgs = []
    page.on("console", lambda msg: console_msgs.append(f"{msg.type}: {msg.text}"))
    page.on("pageerror", lambda err: console_msgs.append(f"PAGE ERROR: {err}"))

    # 1. Visit homepage
    print("=== Visiting homepage ===")
    page.goto('https://zone.cosky.top/')
    page.wait_for_load_state('networkidle')
    time.sleep(3)
    page.screenshot(path='/workspace/codezone_test/screenshots/01_homepage.png', full_page=True)

    title = page.title()
    print(f"Title: {title}")

    links = page.locator('a').all()
    print(f"Total links on homepage: {len(links)}")
    for link in links[:40]:
        try:
            text = link.inner_text().strip()
            href = link.get_attribute('href')
            if text:
                print(f"  Link: '{text}' -> {href}")
        except:
            pass

    buttons = page.locator('button').all()
    print(f"\nTotal buttons on homepage: {len(buttons)}")
    for btn in buttons[:30]:
        try:
            text = btn.inner_text().strip()
            print(f"  Button: '{text}'")
        except:
            pass

    body_text = page.locator('body').inner_text()
    print(f"\n=== Homepage body text (first 3000 chars) ===")
    print(body_text[:3000])

    print(f"\n=== Console messages ===")
    for msg in console_msgs[:50]:
        print(msg)

    browser.close()

print(f"\n=== ISSUES FOUND: {len(issues)} ===")
for issue in issues:
    print(issue)
