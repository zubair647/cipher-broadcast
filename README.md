# CipherSchools WhatsApp Broadcast Tool

A free, **fully local** desktop app for the CipherSchools ops team. Send one message
(text, or text + one image, or text + one PDF) to **every WhatsApp group in a chosen saved
list** — one click, instead of copy-pasting into each group by hand.

Each person runs their own copy. Nothing is sent to any third party: the WhatsApp session,
group registry, lists, and send history all live on your machine.

> ⚠️ This tool automates your own authenticated WhatsApp Web session. It is **not** an
> official WhatsApp client. Keep volume low (a few sends/day), only message groups you've
> already joined, and treat the ban-risk as the management-approved tradeoff the PRD
> describes. Sends are throttled with a randomized human-like delay to reduce flagging.

---

## Stack

- **Electron** shell — renderer for UI, main process owns the WhatsApp session(s).
- **React + TypeScript + Vite** (via `electron-vite`) for the UI.
- **[`whatsapp-web.js`](https://wwebjs.dev/)** (version-pinned) — drives a hidden,
  QR-authenticated WhatsApp Web session via Puppeteer/Chromium.
- **Local JSON store** under the OS userData dir for registry, lists, history, and friendly
  display-name overrides. WhatsApp auth is persisted by `whatsapp-web.js`'s `LocalAuth`
  (one `clientId` per account: `cipher-business`, `cipher-personal`).

Two accounts (**Business** and **Personal**) run in parallel, each with its own isolated
session, registry, lists, and history.

---

## Running locally

Requires **Node 18+** (works on Node 24).

```bash
npm install     # first run also downloads Chromium for whatsapp-web.js (~a few hundred MB)
npm run dev     # launches the app with hot-reload
```

### First-time setup inside the app

1. Open **Account Setup** in the sidebar.
2. Click **Link account** for Business or Personal.
3. On your phone: **WhatsApp → Settings → Linked Devices → Link a Device**, then scan the
   QR code shown in the app.
4. On success the app auto-syncs that account's groups into the registry.
5. Rename groups for clarity in **Manage Groups**, build lists in **Manage Lists**, then
   compose and send from **Send Broadcast** (a mandatory preview appears first).

The session is saved, so you won't need to re-scan every launch. If the session drops,
the main screen shows an amber "needs re-linking" banner.

---

## Screens

| Screen | Purpose |
| --- | --- |
| **Send Broadcast** | Compose, pick a list, attach one image/PDF, preview, send. |
| **Manage Lists** | Create/edit reusable named lists; a group can be in many lists. "All Groups" is the maintained default. |
| **Manage Groups** | View synced groups, rename for clarity, refresh from WhatsApp. |
| **Send History** | Chronological, searchable log with per-group delivery status (failures in red). |
| **Account Setup** | Link/relink each account by QR; per-account session status. |

---

## Build a distributable

```bash
npm run dist        # current platform
npm run dist:mac    # macOS .dmg
```

Output goes to `dist/`.

---

## Maintainability

`whatsapp-web.js` is pinned in `package.json`. If WhatsApp changes its web client and sends
start failing, bump the pinned version (check the library's releases) and re-test the link +
a small send before rolling the update out to the team.

---

## Data & privacy

- App data: `<userData>/data/store.json` (registry, lists, history).
- WhatsApp auth: `<userData>/wa-sessions/` (managed by `LocalAuth`).
- `<userData>` is the standard Electron per-user app data directory for your OS.

Nothing leaves your machine. "Log out" on an account ends its WhatsApp Web session and
clears its saved credentials.
