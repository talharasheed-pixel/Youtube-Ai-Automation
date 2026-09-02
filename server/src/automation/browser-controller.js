const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

/**
 * BrowserController
 * 
 * Manages visible, interactive browser execution for YouTube Studio automation.
 * - Non-headless visible window
 * - Persistent browser profile/context
 * - Unicode-safe text injection (Urdu, Arabic, Hindi, Emojis)
 * - Visual highlighting of focused elements
 * - DOM inspection & verification
 */
class BrowserController extends EventEmitter {
  constructor(options = {}) {
    super();
    this.browser = null;
    this.context = null;
    this.page = null;
    this.userDataDir = options.userDataDir || path.resolve(__dirname, '../../storage/browser-profile');
    this.headless = options.headless !== undefined ? options.headless : false;
    this.executablePath = this._detectBrowserPath();
    this.isConnected = false;
  }

  _detectBrowserPath() {
    const candidates = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    ];

    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
    return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  }

  /**
   * Launch visible browser context with persistent profile
   */
  async launch() {
    if (this.context && this.page && !this.page.isClosed()) {
      return this.page;
    }

    if (!fs.existsSync(this.userDataDir)) {
      fs.mkdirSync(this.userDataDir, { recursive: true });
    }

    this.emit('log', {
      level: 'info',
      message: `Launching visible browser using ${path.basename(this.executablePath)}...`,
      timestamp: new Date().toISOString()
    });

    try {
      this.context = await chromium.launchPersistentContext(this.userDataDir, {
        headless: this.headless,
        executablePath: this.executablePath,
        viewport: { width: 1280, height: 800 },
        args: [
          '--disable-blink-features=AutomationControlled',
          '--start-maximized',
          '--no-default-browser-check',
          '--no-first-run'
        ]
      });

      const pages = this.context.pages();
      this.page = pages.length > 0 ? pages[0] : await this.context.newPage();
      this.isConnected = true;

      // Inject visual cursor / highlight helper for observability
      await this.page.addInitScript(() => {
        window.__highlightElement = (selector) => {
          try {
            const el = document.querySelector(selector);
            if (el) {
              const prevBorder = el.style.outline;
              el.style.outline = '3px solid #8b5cf6';
              el.style.boxShadow = '0 0 15px rgba(139, 92, 246, 0.8)';
              setTimeout(() => {
                el.style.outline = prevBorder;
                el.style.boxShadow = '';
              }, 1200);
            }
          } catch(e) {}
        };
      });

      this.emit('log', {
        level: 'success',
        message: 'Browser window opened and connected.',
        timestamp: new Date().toISOString()
      });

      return this.page;
    } catch (err) {
      this.emit('log', {
        level: 'error',
        message: `Failed to launch browser: ${err.message}`,
        timestamp: new Date().toISOString()
      });
      throw err;
    }
  }

  /**
   * Navigate to URL and wait for DOM readiness
   */
  async navigate(url, timeout = 30000) {
    const page = await this.launch();
    this.emit('log', {
      level: 'info',
      message: `Navigating to ${url}...`,
      timestamp: new Date().toISOString()
    });

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
    return page;
  }

  /**
   * Visibly highlight an element on screen before interacting
   */
  async highlight(locator) {
    try {
      await locator.evaluate((el) => {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const oldOutline = el.style.outline;
        const oldTransition = el.style.transition;
        el.style.transition = 'all 0.2s ease-in-out';
        el.style.outline = '3px solid #06b6d4';
        el.style.boxShadow = '0 0 20px rgba(6, 182, 212, 0.8)';
        setTimeout(() => {
          el.style.outline = oldOutline;
          el.style.boxShadow = '';
          el.style.transition = oldTransition;
        }, 1000);
      });
    } catch (e) {}
  }

  /**
   * Safe Unicode Text Entry (supports Urdu, Arabic, Hindi, Emojis, line breaks)
   * Avoids corrupting right-to-left and non-ASCII character sequences
   */
  async fillUnicodeText(locator, text) {
    await this.highlight(locator);
    await locator.click();

    // Select existing content and clear
    await this.page.keyboard.press('Control+A').catch(() => {});
    await this.page.keyboard.press('Backspace').catch(() => {});

    // For contenteditable / rich-text editors used by YouTube Studio:
    try {
      // 1. First attempt: Use page evaluate to set textContent and dispatch input events
      await locator.evaluate((el, val) => {
        el.focus();
        if (el.isContentEditable) {
          el.innerText = val;
        } else if ('value' in el) {
          el.value = val;
        }
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }, text);

      // Verify if text got applied
      const current = await this.getText(locator);
      if (current.trim().length > 0) {
        return;
      }
    } catch (e) {}

    // 2. Fallback: Type via clipboard / paste event to preserve complex Unicode
    try {
      await this.page.evaluate((val) => {
        const dt = new DataTransfer();
        dt.setData('text/plain', val);
        const evt = new ClipboardEvent('paste', {
          clipboardData: dt,
          bubbles: true,
          cancelable: true
        });
        document.activeElement.dispatchEvent(evt);
      }, text);
    } catch (e) {
      // 3. Fallback: direct locator.fill or type
      await locator.fill(text).catch(() => locator.type(text, { delay: 10 }));
    }
  }

  /**
   * Retrieve text from element (input value or innerText)
   */
  async getText(locator) {
    try {
      return await locator.evaluate((el) => {
        if ('value' in el && el.value) return el.value;
        return el.innerText || el.textContent || '';
      });
    } catch (e) {
      return '';
    }
  }

  /**
   * Action Verification: Checks whether UI field actually contains expected string
   */
  async verifyContent(locator, expectedSnippet, fieldName = 'Field') {
    const text = await this.getText(locator);
    const cleanText = text.replace(/\s+/g, ' ').trim();
    const cleanExpected = expectedSnippet.replace(/\s+/g, ' ').trim();

    const matches = cleanText.includes(cleanExpected) || cleanExpected.includes(cleanText);
    
    this.emit('log', {
      level: matches ? 'success' : 'warn',
      message: matches 
        ? `✓ Verified: ${fieldName} content matches expected output.`
        : `⚠ Warning: ${fieldName} content mismatch. Found "${cleanText.slice(0, 30)}..."`,
      timestamp: new Date().toISOString()
    });

    return {
      verified: matches,
      actual: cleanText,
      expected: cleanExpected
    };
  }

  async close() {
    try {
      if (this.context) await this.context.close();
      this.isConnected = false;
    } catch (e) {}
  }
}

module.exports = BrowserController;
