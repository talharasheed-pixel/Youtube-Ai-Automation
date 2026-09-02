/**
 * Resilient Selector Abstraction Layer for YouTube Studio
 * 
 * Hierarchy:
 * 1. Accessible labels / ARIA roles
 * 2. Text / Content-based selectors
 * 3. Stable test IDs & attributes
 * 4. Semantic DOM relationships
 * 5. CSS selectors
 * 6. XPath fallbacks
 */

const SELECTORS = {
  // Navigation & Create
  CREATE_BUTTON: [
    'button[aria-label*="Create" i]',
    'ytcp-button#create-icon',
    '#create-button',
    'button:has-text("Create")',
    'button:has-text("Upload videos")',
    '//button[contains(., "Create")]'
  ],
  UPLOAD_MENU_ITEM: [
    'tp-yt-paper-item:has-text("Upload videos")',
    '#text-item-0',
    'a[test-id="upload-video"]',
    '//tp-yt-paper-item[contains(., "Upload videos")]'
  ],
  SELECT_FILES_BUTTON: [
    'input[type="file"]',
    '#select-files-button',
    'button:has-text("Select files")',
    'ytcp-button:has-text("Select files")'
  ],

  // Details Dialog / Form
  TITLE_INPUT: [
    '#title-textarea #textbox[contenteditable="true"]',
    '#title-textarea div[contenteditable="true"]',
    'div[aria-label*="title" i][contenteditable="true"]',
    '#textbox[aria-label*="title" i]',
    '#title-textarea [contenteditable="true"]',
    '//div[@id="title-textarea"]//div[@contenteditable="true"]'
  ],

  DESCRIPTION_INPUT: [
    '#description-textarea #textbox[contenteditable="true"]',
    '#description-textarea div[contenteditable="true"]',
    'div[aria-label*="description" i][contenteditable="true"]',
    '#description-container [contenteditable="true"]',
    '#description-textarea [contenteditable="true"]',
    '//div[@id="description-textarea"]//div[@contenteditable="true"]'
  ],

  THUMBNAIL_FILE_INPUT: [
    'input#file-loader[type="file"]',
    '#thumbnail-picker input[type="file"]',
    'input[type="file"][accept*="image"]',
    'ytcp-thumbnails-compact-editor-uploader input[type="file"]'
  ],

  THUMBNAIL_BUTTON: [
    '#upload-thumbnail-button',
    'button:has-text("Upload thumbnail")',
    'ytcp-button:has-text("Upload thumbnail")',
    '#thumbnail-picker'
  ],

  // Audience (Kids)
  NOT_MADE_FOR_KIDS_RADIO: [
    'tp-yt-paper-radio-button[name="VIDEO_MADE_FOR_KIDS_NOT_MFK"]',
    'tp-yt-paper-radio-button:has-text("No, it\'s not made for kids")',
    'tp-yt-paper-radio-button[aria-label*="not made for kids" i]',
    'input[name="VIDEO_MADE_FOR_KIDS_NOT_MFK"]',
    '//tp-yt-paper-radio-button[contains(., "not made for kids")]'
  ],

  MADE_FOR_KIDS_RADIO: [
    'tp-yt-paper-radio-button[name="VIDEO_MADE_FOR_KIDS_MFK"]',
    'tp-yt-paper-radio-button:has-text("Yes, it\'s made for kids")',
    '//tp-yt-paper-radio-button[contains(., "Yes, it\'s made for kids")]'
  ],

  // Show More / Tags
  SHOW_MORE_BUTTON: [
    'button:has-text("Show more")',
    'ytcp-button:has-text("Show more")',
    '#toggle-button:has-text("Show more")',
    '//button[contains(., "Show more")]'
  ],

  TAGS_INPUT: [
    '#tags-container input[aria-label*="Tags" i]',
    '#tags-container input',
    'input[placeholder*="Add tag" i]',
    '#chip-bar input'
  ],

  // Flow Navigation (Next, Back, Save)
  NEXT_BUTTON: [
    '#next-button',
    'button:has-text("Next")',
    'ytcp-button:has-text("Next")',
    '//button[contains(., "Next")]'
  ],

  VISIBILITY_TAB: [
    'button#step-badge-3',
    'button:has-text("Visibility")',
    '#step-title:has-text("Visibility")'
  ],

  // Visibility Options
  PUBLIC_RADIO: [
    'tp-yt-paper-radio-button[name="PUBLIC"]',
    'tp-yt-paper-radio-button:has-text("Public")',
    '//tp-yt-paper-radio-button[contains(., "Public")]'
  ],

  UNLISTED_RADIO: [
    'tp-yt-paper-radio-button[name="UNLISTED"]',
    'tp-yt-paper-radio-button:has-text("Unlisted")',
    '//tp-yt-paper-radio-button[contains(., "Unlisted")]'
  ],

  PRIVATE_RADIO: [
    'tp-yt-paper-radio-button[name="PRIVATE"]',
    'tp-yt-paper-radio-button:has-text("Private")',
    '//tp-yt-paper-radio-button[contains(., "Private")]'
  ],

  // Final Action
  PUBLISH_BUTTON: [
    '#done-button',
    'button:has-text("Publish")',
    'button:has-text("Save")',
    'ytcp-button:has-text("Publish")',
    'ytcp-button:has-text("Save")',
    '//button[contains(., "Publish") or contains(., "Save")]'
  ],

  CLOSE_DIALOG_BUTTON: [
    '#close-button',
    'button[aria-label="Close" i]',
    'button:has-text("Close")'
  ],

  // Status & Confirmation
  UPLOAD_STATUS_LABEL: [
    'span.progress-label',
    '.ytcp-video-upload-progress',
    'span:has-text("Upload complete")',
    'span:has-text("Processing")',
    'span:has-text("Checks complete")'
  ],

  PUBLISHED_DIALOG: [
    'ytcp-video-share-dialog',
    'h1:has-text("Video published")',
    'div:has-text("Video published")',
    'a[href*="youtu.be"]'
  ]
};

/**
 * Helper to resolve the best matching selector dynamically
 */
async function findElement(page, selectorList, timeout = 5000) {
  const selectors = Array.isArray(selectorList) ? selectorList : [selectorList];
  for (const selector of selectors) {
    try {
      const locator = page.locator(selector).first();
      if (await locator.isVisible({ timeout: 1000 }).catch(() => false)) {
        return { locator, selector };
      }
    } catch (e) {
      // Continue to next candidate
    }
  }

  // Final attempt with primary selector and explicit timeout
  try {
    const primary = selectors[0];
    const locator = page.locator(primary).first();
    await locator.waitFor({ state: 'attached', timeout });
    return { locator, selector: primary };
  } catch (err) {
    return null;
  }
}

module.exports = {
  SELECTORS,
  findElement
};
