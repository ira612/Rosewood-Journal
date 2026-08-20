# Rosewood Journal — Daily Planner (Advanced Edition)

A fully working planner, not just a static mockup. Everything you add is saved
in your browser's `localStorage`, so it's all still there the next time you
open the page (on the same browser/device). No build step, no server — just
open `index.html`.

## Structure
```
pink-planner/
├── index.html          → open this in any browser
├── css/style.css        → all styling — light/dark themes, responsive, print
├── js/script.js         → the whole app: data model, rendering, persistence
└── assets/images/       → artwork (banner, month tiles, mood board, avatar, player bg)
```

## What's new in this pass

- **Editable cover photo** — hover the banner up top and click "Change cover"
  to upload your own image; "Reset cover" restores the default artwork.
- **Accent themes** — Settings → Appearance → choose Rose, Lavender, Sage,
  Amber, or Ocean; each palette works correctly in both light and dark mode.
- **Username + password login (new)** — Settings → Account & Login → create a
  login. The journal shows a sign-in screen every time the page is reopened
  until the right username/password is entered; "👤 Set up login" / "🔐 Log
  out" in the sidebar handles setup and manual logout any time. The password
  is hashed (SHA-256, salted with the username) and never stored in plain
  text — but this is a friendly sign-in gate for a shared device, not real
  account security or encryption of the underlying data.
- **Voice journaling (new)** — in the "New entry" form, tap 🎙️ Speak to
  dictate your reflection using your browser's built-in speech recognition.
  The button hides itself automatically in browsers that don't support it.
- **Command palette (new)** — press `Ctrl/Cmd + K` (or "⌘K Quick search" in
  the sidebar) to jump straight to any section, journal entry, task, habit,
  or month by typing a few letters.
- **Achievements (new)** — a badge grid on the Dashboard that unlocks as you
  journal, build streaks, finish tasks, and fill out habits/board/month notes.

**Fully responsive** — a dedicated mobile top bar, a slide-in navigation
drawer, and a bottom tab bar with a floating "+" button appear under 880px;
the desktop sidebar/grid layout is preserved above that. Grids reflow from
4/5 columns down to 2 or 1 as the viewport narrows, tables scroll
horizontally on small screens, and every touch target is sized for fingers,
not just cursors.

- **Dashboard (new)** — at-a-glance stat cards (entries logged, day streak,
  tasks complete, most-felt mood), a 7-day mood bar chart, a progress ring for
  overall task completion, your most recent entries, and pending reminders.
- **Journal upgrades** — sort by newest/oldest/favorites, filter by clickable
  tag chips (combinable with the mood filter + text search), export all
  entries to CSV, and undo-able deletes (a toast gives you a few seconds to
  bring an entry back).
- **Habit Tracker (new)** — add habits with a color, check off a Mon–Sun grid,
  and see a running streak per habit; future days are locked.
- **Priorities & To-Do** — drag-and-drop reordering within each list, a
  progress bar per column, and undo-able deletes.
- **Monthly Overview** — clicking a month now opens a real mini calendar for
  that month with dots on days you journaled; clicking a day opens a new
  entry pre-filled with that date. Month tiles also show an entry-count badge.
  Notes/goals editing is unchanged.
- **Settings (new)** — dark mode (persisted), a compact-text density toggle,
  full data export/import as JSON (move your planner to another browser or
  device, or just keep a backup), one-click print/save-as-PDF, and a list of
  keyboard shortcuts.
- **Ambient sound player (now real audio)** — six calm, fully-tonal
  soundscapes: a soft piano pad, a slow never-repeating piano melody, a
  singing bowl, warm strings, a music box, and a soft ambient drone —
  all synthesized live with the Web Audio API (no filtered-noise sounds
  at all, so nothing sounds "rushy"). Play/pause, shuffle, mute, a live
  volume slider, an elapsed-time readout, a one-tap picker to jump
  straight to a sound, and a sleep timer (5/15/30/60 min) that fades
  the sound out and pauses it.
- **Breathing exercise** — a guided 4-4-4-4 box-breathing modal with
  an animated circle and a cycle counter; opening it starts soft ambient
  sound automatically if nothing's already playing.
- **Daily affirmation** — a gentle line on the dashboard that
  changes once a day, with a button to browse another whenever you like.
- **Journal prompts (new)** — a "Get a prompt" button in the new-entry
  form drops in a gentle writing prompt when you're not sure what to
  write.
- **Keyboard shortcuts** — `/` jumps to search, `N` opens a new entry, `Esc`
  closes any open dialog or the mobile drawer.
- **Accessibility & polish** — visible focus rings, `prefers-reduced-motion`
  support, print stylesheet, and safe-area padding for notched phones.

All of this still runs entirely client-side; nothing is sent to a server.

## Customize
- Colors: edit the CSS variables at the top of `css/style.css` (light theme)
  and inside `body.dark{ ... }` (dark theme)
- Default/demo content: edit `defaultData()` in `js/script.js`
- Moods & their colors: edit `MOOD_META` in `js/script.js`
- Habit colors: edit `HABIT_COLORS` in `js/script.js`
- Ambient sounds: edit `SOUNDSCAPES` (labels/icons) and the `build*`
  functions (the actual synthesis) in `js/script.js`
- Affirmations: edit the `AFFIRMATIONS` array in `js/script.js`
- Journal prompts: edit the `JOURNAL_PROMPTS` array in `js/script.js`
- Breathing pace: edit `BREATH_PHASES` in `js/script.js`

## Data & backups
Everything is stored under one `localStorage` key. Use **Settings → Export
backup** to download a `.json` snapshot, and **Import backup** to restore or
transfer it to another browser. **Reset demo data** wipes local data and
restores the original demo content.
