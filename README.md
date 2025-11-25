# X‑Bot Auto Liker

Browser extension that automates liking, following and (optionally) AI-generated replies on X / Twitter search timelines. The popup UI lets you target a specific hashtag, control cadence, and toggle extra actions without editing source code.

> ⚠️ **Use responsibly.** Automated engagement may violate platform policies. You are responsible for complying with local laws and X’s Terms of Service.

---
## Features
- Watches live search results for a hashtag and likes posts in view.
- Optional OpenAI-powered replies that obey built-in safety/quality rules.
- Optional follow action for the author currently in view.
- Status HUD rendered in-page so you can track likes, replies and follows.
- Full control stored in `chrome.storage` so settings persist per browser.

---
## Project Layout
- `manifest.json` – Chrome MV3 manifest with permissions and entry points.
- `popup.html / popup.js / styles.css` – configuration UI presented from the toolbar.
- `content.js` – automation loop injected into any `x.com` / `twitter.com` tab.

---
## Requirements
- Google Chrome or any Chromium browser with Manifest V3 support.
- An OpenAI API key **only** if you enable AI replies (`gpt-3.5-turbo` by default).

---
## Installation (Developer Mode)
1. Clone or download this repository.
2. In Chrome, open `chrome://extensions`.
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the project folder.
5. Pin the “X-Bot Auto Liker” extension for quick access.

---
## Usage
1. Open the popup (`toolbar icon → X-Bot 🤖`).
2. Enter the hashtag you want to monitor (without the `#` symbol).
3. Set the interval in seconds between automation cycles.
4. (Optional) Toggle **AI Comments** and/or **Follow Author**.
5. (Optional) Paste an OpenAI API key if comments are enabled.
6. Click **Iniciar X-Bot**. The extension will navigate to the live hashtag feed and start processing visible posts.
7. Click **Detener** at any time to stop.

While running you will see a floating status card on the X tab that shows the latest action plus cumulative like/comment/follow counts.

---
## Configuration Reference
| Setting | Source | Description |
| --- | --- | --- |
| `hashtag` | Popup input | Hashtag monitored via `https://x.com/search?q=%23{hashtag}&f=live`. |
| `interval` | Popup input | Delay (seconds) between processing loops (+ random jitter). |
| `comments` | Popup checkbox | Enables AI replies. Requires stored `apiKey`. |
| `follow` | Popup checkbox | Attempts to follow the tweet author after liking. |
| `apiKey` | Popup password | OpenAI key stored locally; never sent outside API calls. |

---
## AI Reply Workflow
`content.js` invokes `generateAIComment()` with tweet text. The helper:
1. Calls `https://api.openai.com/v1/chat/completions` with custom system rules.
2. Ensures the model responds in the tweet’s language, < 20 words, and skips low-quality posts by returning `null`.
3. Inserts the generated text into the reply composer and sends it if available.

You can tweak prompts, switch models, or extend moderation rules directly inside `content.js`.

---
## Development Notes
- The automation loop tags processed tweets with `data-bot-proc` to avoid duplicates.
- `chrome.storage.onChanged` keeps running tabs in sync with popup actions.
- The floating status panel lives entirely in the content script—no external assets required.
- Feel free to add TypeScript, build tooling, or unit tests if you plan to grow the project.

---
## Privacy & Security
- The extension only stores data via `chrome.storage.local`; nothing is sent to external servers beyond the OpenAI API request you opt into.
- Always keep your OpenAI key private. Consider using environment-specific keys with limited quota.
- Review X’s automation policies; aggressive interaction rates can trigger account restrictions.

---
## Next Steps for Open Source Readiness
- Choose and add an OSS license (MIT/Apache-2.0 are common choices).
- Document known limitations or future roadmap items.
- Add screenshots/GIFs of the popup and in-page HUD for clarity.
- Set up automated linting/tests if you plan on accepting contributions.

---
## Disclaimer
This software is provided “as is”. You assume all responsibility for any account actions triggered by automated engagement.


