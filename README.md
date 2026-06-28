# Daily Task Manager

A lightweight, browser-based task manager for organizing your daily work. No install required — open and go.

## Features

- **Today view** — see tasks due today, overdue items, and tasks without a due date
- **All / Upcoming / Completed** filters
- **Priorities** — low, medium, high with color-coded badges
- **Due dates** — with overdue highlighting
- **Search** — find tasks by title or notes
- **Edit modal** — update title, notes, priority, and due date
- **Progress ring** — track how many of today's tasks you've finished
- **Dark mode** — toggle or follow system preference
- **Persistent storage** — tasks saved in your browser via `localStorage`

## Quick Start

### Option 1: Open directly

Double-click `index.html` to open it in your browser.

### Option 2: Local server (recommended)

```powershell
cd C:\Users\saksh\Projects\daily-task-manager
py -m http.server 8080
```

On some systems you may need `python -m http.server 8080` instead of `py`.

Then visit [http://localhost:8080](http://localhost:8080).

## Usage

1. Type a task in the input field and press **Add Task**
2. Set priority and due date before adding (optional)
3. Click the checkbox to mark a task complete
4. Use **✏️** to edit or **🗑️** to delete
5. Switch views in the sidebar: Today, All Tasks, Upcoming, Completed

## Files

| File | Purpose |
|------|---------|
| `index.html` | App structure |
| `styles.css` | Layout and theming |
| `app.js` | Task logic and persistence |

## Data

Tasks are stored in your browser under the key `daily-task-manager-tasks`. Clearing site data will remove them.
