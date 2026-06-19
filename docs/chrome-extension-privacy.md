# QuantGym Collector Privacy Notice

QuantGym Collector is a Chrome extension for QuantGym beta users. Its single purpose is to capture a problem page and help the user send that structured problem into their QuantGym study board.

## Data The Extension Handles

- Current active tab content: when the user opens the popup, the extension reads visible page text such as title, prompt, source URL, difficulty, and tags.
- Local settings: the extension stores the user's preferred QuantGym board URL in Chrome local extension storage. Remote board URLs must use HTTPS; only loopback HTTP URLs are allowed for local development.
- Clipboard content: if a capture is too large for a URL handoff, the user can click "Copy JSON" to copy the captured problem JSON.

## Data Sharing

The extension does not sell data, use data for ads, or run background collection. It does not send captured page content anywhere unless the user clicks the collect action, which opens the user-configured QuantGym board URL with the capture payload. The user can also choose to copy the JSON manually. To reduce accidental cleartext sharing, the popup rejects insecure remote Board URLs and falls back to the production QuantGym beta URL.

## Permissions

- `activeTab`: lets the extension read the current tab after user interaction.
- `scripting`: lets the extension run the extraction script on the active tab after user interaction.
- `storage`: saves the user's preferred QuantGym board URL locally in Chrome.

## Remote Code

The extension does not load remote JavaScript or execute remotely hosted code.

## Contact

For privacy questions, contact `miaojiawei1108@gmail.com`.
