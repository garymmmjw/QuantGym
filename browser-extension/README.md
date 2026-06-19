# QuantGym Collector

Chrome extension for collecting LeetCode and interview-problem pages into QuantGym.

The production default board URL is `https://beta.quantgym.app/`. Remote Board URLs must use HTTPS; local development may use loopback HTTP URLs such as `http://127.0.0.1:5173/`, and the popup saves the chosen URL in Chrome extension storage.

## Install locally

1. Open `chrome://extensions`
2. Enable Developer mode
3. Click "Load unpacked"
4. Select this `browser-extension` folder

## Use

Open a LeetCode or interview-problem page, click the extension, then click "收录到面板". The extension opens QuantGym with a capture payload. If the problem is too long for a URL handoff, use "复制 JSON" and paste it into the app manually later.

## Validate and package

Run the extension gate before shipping:

```bash
npm run check:browser-extension
```

Run the popup runtime smoke to execute the real popup script with simulated Chrome extension APIs and page DOM:

```bash
npm run check:browser-extension:runtime-smoke
```

Run the Chrome Web Store readiness gate before submitting:

```bash
npm run check:chrome-store-readiness
npm run check:chrome-store-publication
```

Build a Chrome Web Store upload ZIP:

```bash
npm run package:browser-extension
```

The package is written to `artifacts/browser-extension/`, which is ignored by Git. The extension checker enforces Manifest V3, the expected permission set, required PNG icons, no `<all_urls>` host permission, no local default URL, and popup syntax validity.

The runtime smoke executes `popup.js` in a Node VM with fake `chrome.storage.local`, `chrome.tabs`, `chrome.scripting`, clipboard, popup DOM, and active-tab DOM objects. It verifies default Board URL loading, active-tab capture, rendered source/title/prompt/meta, copy JSON, normal QuantGym capture URL handoff, invalid/insecure remote Board URL fallback, loopback HTTP development URL allowance, and long-prompt clipboard fallback.

The store-readiness checker validates `store-listing.json`, the public privacy page at `public/chrome-extension-privacy.html`, screenshot and small promo image dimensions, permission justifications, data-use disclosures, and the final upload ZIP contents. The ZIP intentionally contains only the runtime extension files, not the store-listing metadata or store-assets source files.

After the extension is published from the Chrome Web Store developer dashboard,
record the external evidence and run the final publication signoff:

```bash
REAL_CHROME_ITEM_ID="paste-real-32-character-item-id-here"
REAL_UPLOAD_SHA256="paste-sha256-from-check-chrome-store-publication"

QUANTGYM_CHROME_WEB_STORE_ITEM_ID="$REAL_CHROME_ITEM_ID" \
QUANTGYM_CHROME_WEB_STORE_LISTING_URL="https://chromewebstore.google.com/detail/quantgym-collector/$REAL_CHROME_ITEM_ID" \
QUANTGYM_CHROME_WEB_STORE_EVIDENCE_URL="https://chromewebstore.google.com/detail/quantgym-collector/$REAL_CHROME_ITEM_ID" \
QUANTGYM_CHROME_WEB_STORE_STATUS="published" \
QUANTGYM_CHROME_WEB_STORE_SUBMITTED_VERSION="0.2.0" \
QUANTGYM_CHROME_WEB_STORE_UPLOAD_SHA256="$REAL_UPLOAD_SHA256" \
npm run check:chrome-store-publication:published
```

The item id must be the real Chrome Web Store id, not a placeholder-looking
repeated value. The listing URL must be the Chrome Web Store detail page for
that item id, and the listing/evidence URLs must be externally reachable HTTPS
URLs without embedded credentials, query strings, or fragments. The signoff gate
rejects localhost, loopback, private-network, and `.local` hosts.
