# BigQuery Release Insights

A premium, responsive dashboard for tracking, searching, filtering, and sharing Google Cloud BigQuery release notes. Built using a Python Flask backend and a vanilla HTML5, CSS3, and JavaScript frontend.

![BigQuery Release Insights Dashboard](https://img.shields.io/badge/Stack-Flask%20%7C%20Vanilla%20HTML%20%7C%20CSS%20%7C%20JS-blue)
![License](https://img.shields.io/badge/License-Apache--2.0-green)

---

## 🚀 Key Features

* **Feed Segment Splitting**: Google's official feed groups an entire day's release logs into a single RSS `<entry>`. The backend parses this nested CDATA HTML, splits updates by `<h3>` tags, and flattens them into individual searchable cards.
* **Full-Fidelity Cyber Dark Theme**: Tailored glassmorphism styles built using CSS custom variables and HSL tokens. Cards lift, glow, and shadow on hover.
* **Smart Search & pill filters**: Instant client-side search query logic with live word highlighting inside card descriptions, and count-badge side pills.
* **Interactive Tweet Composer Modal**: Uses the native HTML `<dialog>` element with custom `@starting-style` entry and discrete `transition-behavior: allow-discrete` exit animations.
* **Smart Character Limit Estimation**: Implements t.co URL length correction (matching X's logic where all URLs count as exactly 23 characters) and draws a live circular SVG progress limit ring.
* **Native Popover Toasts**: Utilizes native `popover="manual"` to stack toast alerts cleanly in the Top Layer without z-index conflicts.
* **Memory Caching**: Cache feed updates for 5 minutes in memory to prevent rate limits, with a graceful cache fallback if network connection fails.
* **Copy to Clipboard Utility**: One-click formatted update summaries copied to user clipboards using the browser's `navigator.clipboard` API with dynamic visual button status feedback.
* **Export to CSV**: Formulates and triggers downloads of the currently filtered release logs as a CSV file, fully formatted with sanitization.
* **Dynamic Light/Dark Theme**: Dynamic switching of page styles via root CSS custom variables overrides. Preferences are saved to `localStorage` and loaded early in the `<head>` block to fully prevent theme flashes on refresh.

---

## 📂 Project Directory Structure

```text
agy-event-talks-app/
├── app.py                  # Flask Web server & Feed Parser
├── requirements.txt        # Python frozen dependencies
├── .gitignore              # Git ignore configuration
├── README.md               # Project documentation
├── templates/
│   └── index.html          # Semantic HTML5 layout shell
└── static/
    ├── css/
    │   └── style.css       # HSL variables, grid layout, & transitions
    └── js/
        └── app.js          # Client-side state controller & UI bindings
```

---

## 🛠️ Installation & Setup

Ensure you have **Python 3.8+** installed.

### 1. Clone & Navigate
```bash
git clone https://github.com/sheramir/agy-event-talks-app.git
cd agy-event-talks-app
```

### 2. Set Up Virtual Environment
Create and activate a python virtual environment:
```bash
# macOS/Linux
python3 -m venv .venv
source .venv/bin/activate

# Windows
python -m venv .venv
.venv\Scripts\activate
```

### 3. Install Dependencies
Install the required packages:
```bash
pip install -r requirements.txt
```

### 4. Run the Application
Start the Flask development server:
```bash
python app.py
```

Open **[http://127.0.0.1:8080](http://127.0.0.1:8080)** in your browser to view the application.

---

## 🔌 API Endpoints

### `GET /`
Serves the web dashboard client.

### `GET /api/feed`
Fetches and returns the parsed BigQuery release notes.
* **Query Parameters**:
  * `refresh=true` (optional): Force-bypasses the server-side cache to fetch fresh data from Google's feed.
* **Sample Response**:
```json
{
  "source": "network",
  "last_fetched": 1718502000,
  "updates": [
    {
      "id": "update-0-0",
      "date": "June 15, 2026",
      "timestamp": "2026-06-15T00:00:00-07:00",
      "type": "Feature",
      "html": "<p>Use Gemini Cloud Assist to optimize query performance...</p>",
      "text": "Use Gemini Cloud Assist to optimize query performance in BigQuery...",
      "link": "https://docs.cloud.google.com/bigquery/docs/release-notes#June_15_2026"
    }
  ]
}
```

---

## 📄 License
This project is licensed under the Apache 2.0 License.
