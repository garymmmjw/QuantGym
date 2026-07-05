# QuantGym Collector Privacy Notice

QuantGym Collector is a Chrome extension for QuantGym beta users. Its single purpose is to record a visible problem and help the user send that structured problem into their QuantGym study board.

## Data The Extension Handles

- Current active tab content: when the user opens the popup, the extension reads visible page text such as title, prompt, source URL, difficulty, and tags.
- Visible tab screenshot: when the user clicks "记录题目" / "Record", the extension captures the currently visible browser viewport so QuantGym can extract the problem with OCR/vision. The user controls this by placing the problem on screen and clicking the command.
- Local settings: the extension stores the user's preferred QuantGym board URL in Chrome local extension storage. Remote board URLs must use HTTPS; only loopback HTTP URLs are allowed for local development.
- Clipboard content: if a capture is too large for a URL handoff, the user can click "Copy JSON" to copy the captured problem JSON.

## Data Sharing

The extension does not sell data, use data for ads, or run background collection. It does not send captured page content or screenshots anywhere unless the user clicks the record action. That action opens the user-configured QuantGym board URL, sends the screenshot and page context through a QuantGym-only bridge script, and lets the signed-in QuantGym web app process the screenshot through the user's configured QuantGym LLM endpoint. The user can also choose to copy JSON manually. To reduce accidental cleartext sharing, the popup rejects insecure remote Board URLs and falls back to the production QuantGym beta URL.

## Permissions

- `activeTab`: lets the extension read the current tab after user interaction.
- `scripting`: lets the extension run the extraction script on the active tab after user interaction.
- `storage`: saves the user's preferred QuantGym board URL locally in Chrome.
- `tabs`: lets the extension capture the visible active tab after the user clicks Record, open QuantGym, send the capture to the QuantGym bridge, and focus the QuantGym tab.
- Host access for `quantgym.app`: lets a small bridge script run only on QuantGym pages so user-triggered captures can be delivered to the QuantGym web app.

## Remote Code

The extension does not load remote JavaScript or execute remotely hosted code.

## Contact

For privacy questions, contact `miaojiawei1108@gmail.com`.
