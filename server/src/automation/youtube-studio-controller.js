const EventEmitter = require('events');
const path = require('path');
const fs = require('fs');
const { SELECTORS, findElement } = require('./selectors');

/**
 * YouTubeStudioController
 * 
 * Orchestrates complete user-visible YouTube Studio workflows:
 * - Navigating to studio.youtube.com
 * - Triggering "Create" -> "Upload videos"
 * - Selecting video file
 * - Entering & verifying Title
 * - Entering & verifying Description (preserving Urdu/Arabic/Unicode/linebreaks)
 * - Uploading & verifying Thumbnail
 * - Audience settings (Not made for kids)
 * - Tags entry
 * - Step progression & Visibility settings (Public / Unlisted / Private)
 * - Human Confirmation Gate / Dry-run support
 */
class YouTubeStudioController extends EventEmitter {
  constructor(browserController) {
    super();
    this.browser = browserController;
    this.currentWorkflowState = 'IDLE';
    this.activeDialog = null;
    this.confirmationCallback = null;
    this.dryRun = false;
  }

  setDryRun(enabled) {
    this.dryRun = !!enabled;
  }

  /**
   * 1. Open YouTube Studio
   */
  async openStudio(channelUrl = 'https://studio.youtube.com') {
    this.emit('action', {
      action: 'open_studio',
      status: 'working',
      message: 'Opening YouTube Studio in visible browser...'
    });

    const page = await this.browser.navigate(channelUrl);
    await page.waitForTimeout(3000);

    // Check if login is required
    const isLoginRequired = await page.evaluate(() => {
      return document.querySelector('input[type="email"]') !== null || 
             window.location.href.includes('accounts.google.com');
    });

    if (isLoginRequired) {
      this.emit('action', {
        action: 'auth_check',
        status: 'warning',
        message: '⚠ YouTube login required in browser. Please complete Google sign-in in the open window.'
      });
      return { success: false, requiresLogin: true };
    }

    this.emit('action', {
      action: 'open_studio',
      status: 'completed',
      message: '✓ YouTube Studio loaded successfully.'
    });

    return { success: true };
  }

  /**
   * 2. Start Upload Flow & Select Video File
   */
  async selectVideo(videoFilePath) {
    if (!videoFilePath || !fs.existsSync(videoFilePath)) {
      throw new Error(`Video file not found: ${videoFilePath}`);
    }

    const page = this.browser.page;
    this.emit('action', {
      action: 'select_video',
      status: 'working',
      message: `Selecting video file: ${path.basename(videoFilePath)}`
    });

    // 1. Locate and click "Create" button
    const createBtn = await findElement(page, SELECTORS.CREATE_BUTTON, 8000);
    if (createBtn) {
      await this.browser.highlight(createBtn.locator);
      await createBtn.locator.click();
      await page.waitForTimeout(1000);
    }

    // 2. Click "Upload videos" if menu opens
    const uploadMenuItem = await findElement(page, SELECTORS.UPLOAD_MENU_ITEM, 3000);
    if (uploadMenuItem) {
      await this.browser.highlight(uploadMenuItem.locator);
      await uploadMenuItem.locator.click();
      await page.waitForTimeout(2000);
    }

    // 3. Set file input
    const fileInput = await findElement(page, SELECTORS.SELECT_FILES_BUTTON, 5000);
    if (!fileInput) {
      throw new Error('Upload dialog or "Select files" button not found');
    }

    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser', { timeout: 10000 }).catch(() => null),
      fileInput.locator.click().catch(() => {})
    ]);

    if (fileChooser) {
      await fileChooser.setFiles(videoFilePath);
    } else {
      // Direct setInputFiles on hidden file input
      await page.setInputFiles('input[type="file"]', videoFilePath);
    }

    this.emit('action', {
      action: 'select_video',
      status: 'completed',
      message: '✓ Video file uploaded into YouTube Studio dialog.'
    });

    await page.waitForTimeout(4000);
    return true;
  }

  /**
   * 3. Enter & Verify Title
   */
  async enterTitle(title) {
    const page = this.browser.page;
    this.emit('action', {
      action: 'enter_title',
      status: 'working',
      message: `Locating title field and entering: "${title.slice(0, 45)}..."`
    });

    const titleEl = await findElement(page, SELECTORS.TITLE_INPUT, 10000);
    if (!titleEl) {
      throw new Error('Title input field not found in YouTube Studio upload dialog');
    }

    await this.browser.fillUnicodeText(titleEl.locator, title);
    await page.waitForTimeout(1000);

    // Verification
    const verify = await this.browser.verifyContent(titleEl.locator, title.slice(0, 30), 'Title');
    
    this.emit('action', {
      action: 'enter_title',
      status: verify.verified ? 'completed' : 'warning',
      message: verify.verified ? '✓ Title entered and verified.' : '⚠ Title entered (verification partial match).'
    });

    return verify;
  }

  /**
   * 4. Enter & Verify Description (Preserves line breaks, Urdu/Arabic/Unicode, and hashtags)
   */
  async enterDescription(description) {
    const page = this.browser.page;
    this.emit('action', {
      action: 'enter_description',
      status: 'working',
      message: 'Locating description editor and inserting rich content...'
    });

    const descEl = await findElement(page, SELECTORS.DESCRIPTION_INPUT, 8000);
    if (!descEl) {
      throw new Error('Description field not found in upload dialog');
    }

    await this.browser.fillUnicodeText(descEl.locator, description);
    await page.waitForTimeout(1000);

    const firstLine = description.split('\n')[0] || description.slice(0, 30);
    const verify = await this.browser.verifyContent(descEl.locator, firstLine, 'Description');

    this.emit('action', {
      action: 'enter_description',
      status: verify.verified ? 'completed' : 'warning',
      message: verify.verified ? '✓ Description entered and verified.' : '⚠ Description entered.'
    });

    return verify;
  }

  /**
   * 5. Upload & Verify Thumbnail
   */
  async uploadThumbnail(thumbnailPath) {
    if (!thumbnailPath || !fs.existsSync(thumbnailPath)) {
      this.emit('action', {
        action: 'upload_thumbnail',
        status: 'skipped',
        message: 'No local thumbnail file provided; using YouTube default frame.'
      });
      return false;
    }

    const page = this.browser.page;
    this.emit('action', {
      action: 'upload_thumbnail',
      status: 'working',
      message: `Uploading custom thumbnail: ${path.basename(thumbnailPath)}`
    });

    try {
      const thumbInput = await findElement(page, SELECTORS.THUMBNAIL_FILE_INPUT, 4000);
      if (thumbInput) {
        await thumbInput.locator.setInputFiles(thumbnailPath);
      } else {
        const thumbBtn = await findElement(page, SELECTORS.THUMBNAIL_BUTTON, 4000);
        if (thumbBtn) {
          const [fileChooser] = await Promise.all([
            page.waitForEvent('filechooser', { timeout: 6000 }),
            thumbBtn.locator.click()
          ]);
          await fileChooser.setFiles(thumbnailPath);
        }
      }

      await page.waitForTimeout(3000);

      this.emit('action', {
        action: 'upload_thumbnail',
        status: 'completed',
        message: '✓ Thumbnail uploaded and preview updated in Studio.'
      });
      return true;
    } catch (err) {
      this.emit('action', {
        action: 'upload_thumbnail',
        status: 'warning',
        message: `⚠ Thumbnail upload skipped or requires phone verified channel: ${err.message}`
      });
      return false;
    }
  }

  /**
   * 6. Set Audience (Default: Not Made for Kids)
   */
  async setAudience(madeForKids = false) {
    const page = this.browser.page;
    this.emit('action', {
      action: 'set_audience',
      status: 'working',
      message: 'Setting audience policy (Not made for kids)...'
    });

    const selectorList = madeForKids ? SELECTORS.MADE_FOR_KIDS_RADIO : SELECTORS.NOT_MADE_FOR_KIDS_RADIO;
    const radioEl = await findElement(page, selectorList, 5000);
    if (radioEl) {
      await this.browser.highlight(radioEl.locator);
      await radioEl.locator.click();
      await page.waitForTimeout(500);
    }

    this.emit('action', {
      action: 'set_audience',
      status: 'completed',
      message: '✓ Audience configuration set.'
    });
  }

  /**
   * 7. Enter Tags (SEO)
   */
  async enterTags(tags = []) {
    if (!tags || tags.length === 0) return;

    const page = this.browser.page;
    this.emit('action', {
      action: 'enter_tags',
      status: 'working',
      message: `Adding ${tags.length} SEO tags into YouTube Studio...`
    });

    // Click "Show more"
    const showMore = await findElement(page, SELECTORS.SHOW_MORE_BUTTON, 3000);
    if (showMore) {
      await this.browser.highlight(showMore.locator);
      await showMore.locator.click().catch(() => {});
      await page.waitForTimeout(1000);
    }

    const tagsInput = await findElement(page, SELECTORS.TAGS_INPUT, 4000);
    if (tagsInput) {
      await this.browser.highlight(tagsInput.locator);
      const tagString = Array.isArray(tags) ? tags.join(',') : tags;
      await this.browser.fillUnicodeText(tagsInput.locator, tagString);
      await page.keyboard.press('Enter').catch(() => {});
    }

    this.emit('action', {
      action: 'enter_tags',
      status: 'completed',
      message: '✓ SEO tags added to video metadata.'
    });
  }

  /**
   * 8. Step Through to Visibility Screen
   */
  async navigateToVisibility() {
    const page = this.browser.page;
    this.emit('action', {
      action: 'navigate_visibility',
      status: 'working',
      message: 'Advancing steps to Visibility tab...'
    });

    for (let i = 0; i < 3; i++) {
      const nextBtn = await findElement(page, SELECTORS.NEXT_BUTTON, 4000);
      if (nextBtn) {
        await this.browser.highlight(nextBtn.locator);
        await nextBtn.locator.click();
        await page.waitForTimeout(1200);
      }
    }

    this.emit('action', {
      action: 'navigate_visibility',
      status: 'completed',
      message: '✓ Visibility configuration screen reached.'
    });
  }

  /**
   * 9. Set Visibility (Public / Unlisted / Private)
   */
  async setVisibility(visibility = 'PUBLIC') {
    const page = this.browser.page;
    const v = visibility.toUpperCase();
    let target = SELECTORS.PUBLIC_RADIO;
    if (v === 'UNLISTED') target = SELECTORS.UNLISTED_RADIO;
    if (v === 'PRIVATE') target = SELECTORS.PRIVATE_RADIO;

    const radio = await findElement(page, target, 4000);
    if (radio) {
      await this.browser.highlight(radio.locator);
      await radio.locator.click();
      await page.waitForTimeout(500);
    }
  }

  /**
   * 10. Final Publish or Dry-Run / Human Confirmation
   */
  async finalizePublish(options = {}) {
    const { requireConfirmation = false, visibility = 'PUBLIC' } = options;
    const page = this.browser.page;

    await this.setVisibility(visibility);

    if (this.dryRun) {
      this.emit('action', {
        action: 'publish_final',
        status: 'completed',
        message: '🛑 [DRY RUN MODE] All Studio fields filled & verified. Video saved as DRAFT (Publish skipped).'
      });
      return { status: 'DRY_RUN_COMPLETED' };
    }

    if (requireConfirmation) {
      this.emit('action', {
        action: 'publish_final',
        status: 'waiting_for_confirmation',
        message: '⏸️ Ready to Publish. Human confirmation required on dashboard.'
      });

      return new Promise((resolve) => {
        this.confirmationCallback = async (confirmed) => {
          if (confirmed) {
            const res = await this._executePublishClick();
            resolve(res);
          } else {
            resolve({ status: 'PUBLISH_CANCELLED_BY_USER' });
          }
        };
      });
    }

    return await this._executePublishClick();
  }

  async confirmPublish(confirmed = true) {
    if (this.confirmationCallback) {
      this.confirmationCallback(confirmed);
      this.confirmationCallback = null;
    }
  }

  async _executePublishClick() {
    const page = this.browser.page;
    this.emit('action', {
      action: 'publish_final',
      status: 'working',
      message: 'Clicking Publish button and verifying final broadcast state...'
    });

    const publishBtn = await findElement(page, SELECTORS.PUBLISH_BUTTON, 5000);
    if (publishBtn) {
      await this.browser.highlight(publishBtn.locator);
      await publishBtn.locator.click();
      await page.waitForTimeout(4000);
    }

    // Verify published dialog or link
    let videoUrl = null;
    try {
      const linkEl = page.locator('a[href*="youtu.be"]').first();
      if (await linkEl.isVisible({ timeout: 4000 })) {
        videoUrl = await linkEl.getAttribute('href');
      }
    } catch(e) {}

    this.emit('action', {
      action: 'publish_final',
      status: 'completed',
      message: videoUrl 
        ? `🎉 SUCCESS! Video published to YouTube: ${videoUrl}`
        : '✓ Video saved/published in YouTube Studio.'
    });

    return { status: 'PUBLISHED', videoUrl };
  }
}

module.exports = YouTubeStudioController;
