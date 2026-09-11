# QuantGym Collector

Chrome extension for recording visible LeetCode and interview-problem pages into QuantGym.

The production default board URL is `https://beta.quantgym.app/`. Remote Board URLs must use HTTPS; local development may use loopback HTTP URLs such as `http://127.0.0.1:5173/`, and the popup saves the chosen URL in Chrome extension storage.

## Install locally

1. Open `chrome://extensions`
2. Enable Developer mode
3. Click "Load unpacked"
4. Select this `browser-extension` folder

## Use

Open a LeetCode or interview-problem page, scroll or zoom until the problem is visible in the current browser viewport, click the extension, then click "记录题目". The extension captures the visible tab, opens QuantGym, and sends the screenshot plus page context to the QuantGym web app so the signed-in app can extract and save the problem. If you only want the text-based fallback, use "复制 JSON" and paste it into the app manually later.

## Import your LeetCode CN history

1. Associate your LeetCode CN profile in your QuantGym account.
2. Open `https://leetcode.cn/` in Chrome and sign in to that same LeetCode account.
3. Open this extension and click **同步力扣记录**. Keep the popup open while it reads your completed problem list and accepted submission metadata.
4. QuantGym opens its LeetCode module with an import preview. Check the username, counts, and any incomplete-history message, then click **导入到当前关联账号**. Delivery alone does not save records to your account.

The import uses your existing browser login only inside the LeetCode tab. It never reads, stores, or transfers passwords, cookies, tokens, or solution code. It exports only the profile username, problem identifiers/titles/difficulty, and accepted submission identifiers/times. The account is checked again after pagination; switching accounts interrupts the import.

Daily completed counts deduplicate accepted submissions by problem and calendar day. Multiple accepted submissions of the same problem in one day count as one completed problem. Random review uses the imported completed problem list. A question's `lastSubmittedAt` is not treated as its accepted date.

Each click includes at most 20,000 combined problem/submission records and less than 5 MiB, with a three-minute overall paging limit and individual request timeouts. Upstream changes, interrupted pagination, missing mappings, or limits produce an explicit partial-history notice. Such an import does not establish complete historical coverage. This depends on the currently available LeetCode CN site queries and may need updating if they change.

History can be sent only to `https://beta.quantgym.app`, `https://quantgym.app`, `https://www.quantgym.app`, or loopback HTTP development origins, always on `/leetcode`. Production permissions remain QuantGym-only; the content bridge also supports localhost and 127.0.0.1 development pages. If delivery is unavailable, click **下载记录 JSON** and select that file in QuantGym's LeetCode module. History stays in popup/page memory until closed and is not persisted in extension storage. The downloaded JSON is an explicit local export chosen by you.

## Validate and package

Run the extension gate before shipping:

```bash
npm run check:browser-extension
```

Run the popup runtime smoke to execute the real popup script with simulated Chrome extension APIs and page DOM:

```bash
npm run check:browser-extension:runtime-smoke
```

Validate LeetCode metadata pagination, account consistency, origin restrictions, and the review-delivery handshake:

```bash
node scripts/test-leetcode-extension.mjs
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

The package is written to `artifacts/browser-extension/`, which is ignored by Git. The extension checker enforces Manifest V3, the expected permission set, required PNG icons, QuantGym-only host permissions, no `<all_urls>` host permission, no local default URL, popup syntax validity, and the QuantGym bridge script.

The runtime smoke executes `popup.js` in a Node VM with fake `chrome.storage.local`, `chrome.tabs`, `chrome.scripting`, clipboard, popup DOM, and active-tab DOM objects. It verifies default Board URL loading, active-tab capture, rendered source/title/prompt/meta, copy JSON, visible-tab screenshot capture, QuantGym bridge message delivery, invalid/insecure remote Board URL fallback, loopback HTTP development URL allowance, and long-prompt clipboard fallback.

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
QUANTGYM_CHROME_WEB_STORE_SUBMITTED_VERSION="0.4.0" \
QUANTGYM_CHROME_WEB_STORE_UPLOAD_SHA256="$REAL_UPLOAD_SHA256" \
npm run check:chrome-store-publication:published
```

The item id must be the real Chrome Web Store id, not a placeholder-looking
repeated value. The listing URL must be the Chrome Web Store detail page for
that item id, and the listing/evidence URLs must be externally reachable HTTPS
URLs without embedded credentials, query strings, or fragments. The signoff gate
rejects localhost, loopback, private-network, and `.local` hosts.
