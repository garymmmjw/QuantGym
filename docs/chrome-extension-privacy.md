# QuantGym Collector Privacy Notice

QuantGym Collector is a Chrome extension for QuantGym beta users. Its single purpose is to bring user-selected problem content and personal LeetCode study records into their QuantGym study board.

## Data The Extension Handles

- Current active tab content: when the user opens the popup, the extension reads visible page text such as title, prompt, source URL, difficulty, and tags.
- Visible tab screenshot: when the user clicks "记录题目" / "Record", the extension captures the currently visible browser viewport so QuantGym can extract the problem with OCR/vision. The user controls this by placing the problem on screen and clicking the command.
- Local settings: the extension stores the user's preferred QuantGym board URL in Chrome local extension storage. Remote board URLs must use HTTPS; only loopback HTTP URLs are allowed for local development.
- Clipboard content: if a capture is too large for a URL handoff, the user can click "Copy JSON" to copy the captured problem JSON.
- LeetCode study history: only after the user clicks "同步力扣记录", the extension reads the logged-in LeetCode CN account's username, completed problem identifiers, titles and difficulty, plus accepted submission identifiers and timestamps. This reads metadata only, not submitted solution code.

## Data Sharing

The extension does not sell data, use data for ads, or run background collection. It does not send captured page content or screenshots anywhere unless the user clicks the record action. That action opens the user-configured QuantGym board URL, sends the screenshot and page context through a QuantGym-only bridge script, and lets the signed-in QuantGym web app process the screenshot through the user's configured QuantGym LLM endpoint. The user can also choose to copy JSON manually. To reduce accidental cleartext sharing, the popup rejects insecure remote Board URLs and falls back to the production QuantGym beta URL.

LeetCode history sync uses the existing login only within the active LeetCode tab. The extension does not read, store, or send passwords, cookies or tokens. History metadata is delivered only to beta.quantgym.app, quantgym.app, www.quantgym.app, or a loopback HTTP development origin, and appears for review before the user confirms importing into their linked QuantGym account. History is held in memory, not extension storage. If delivery fails, the user can choose a local JSON download and import that file manually. QuantGym stores confirmed imported records in the user's private account; unlinking the LeetCode account removes those linked records from QuantGym. A downloaded file remains on the user's device until the user deletes it.

## Permissions

- `activeTab`: lets the extension read the current tab after user interaction.
- `scripting`: lets the extension run the extraction script on the active tab and, only on a user-requested history sync, query that tab's own logged-in LeetCode account.
- `storage`: saves the user's preferred QuantGym board URL locally in Chrome.
- `tabs`: lets the extension capture the visible active tab after the user clicks Record, open QuantGym, send the capture to the QuantGym bridge, and focus the QuantGym tab.
- Host access for `quantgym.app`: lets a small bridge script deliver user-triggered captures and history metadata. The content bridge also runs on localhost and 127.0.0.1 HTTP pages for local development; history delivery is restricted to the LeetCode module.

## Remote Code

The extension does not load remote JavaScript or execute remotely hosted code.

## Contact

For privacy questions, contact `miaojiawei1108@gmail.com`.
