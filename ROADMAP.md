# BillerPe Owner App — Analysis, Features and Rollout Plan

Version 1 · 5 Oct 2026 · Design: `design/index.html` (open it in Chrome)

The Owner App is an Android app for owners on **Plan 1 (Web POS + Captain App)**.
The owner is not always at the restaurant. From the phone they can see every outlet,
download reports, get alerts and manage the outlet. **The app never takes orders.**
It works online only and talks to the BillerPe cloud, never to the outlet PC.

---

## 1. Analysis (Task 1)

### 1.1 What the cloud already knows about a Plan 1 outlet

The outlet PC (the BillerPe exe) bills offline and syncs with the cloud:

| Data | Reaches the cloud | Notes |
|---|---|---|
| PC online/offline | every 60 s (heartbeat) | `local_server_registrations.last_seen_at`, plus `app_version`, `update_status`, `hostname` |
| Orders: running and settled, with lines and taxes | every 3 min | bill numbers are final (exe-owned), `business_date` included |
| Table status (running / free) | every 3 min with the orders | |
| Cash sessions + cash movements, expenses, due receipts | every 3 min | |
| Audit log (who did what) | every 3 min | |
| Customers | every 3 min | |
| Stock: raw materials (with minimum level), semi-finished, recipes, POs, wastage | every 3 min | |
| Menu, tables, staff, roles, permissions, tax, payment modes, promos… | both ways | cloud edits reach the PC within ~60 s |
| KDS state, printer status | **never** | stays on the PC only |

**Result:** the app can show all of this with no change to the outlet PC. Live numbers are
up to about 3 minutes old. The app always shows "Updated X min ago" (owner decision: 3 min is fine).

### 1.2 What the owner can change, and how it reaches the outlet

Menu, staff and permissions, tables and sections, tax, payment modes, promo codes, bill
charges, expense heads and stock masters already sync **cloud → outlet PC** through the existing
pull (60-second heartbeat). The owner app writes these rows in the cloud, and the PC picks them
up within about a minute while it is online, or when it reconnects.
Printers stay on the PC on purpose.

Risks to handle (from earlier real incidents):
- **Id spaces.** A row created in the cloud has a cloud id. The PC stores it under its own
  local id (`cloud_id` link). Every write must be tested against a PC whose ids differ from the cloud's.
- **Conflicts.** If the PC changed the same row and has not uploaded it yet, the PC's change waits
  and the newer one wins (the fix from the hotel 6 table incident). The app must show
  "Waiting for outlet PC" until the PC has the change.
- **Running tables.** The owner cannot delete or switch off a table or section that has a
  running order. The cloud refuses it.

### 1.3 What can be reused

- **POS App (Plan 2)** already has an owner dashboard, "All outlets" reports, owner alerts,
  Firebase push, PDF export and share, fingerprint lock, and Hindi/Gujarati. We copy its design
  components and libraries (`fileExport`, `pdf`, `push`, `i18n`, `AppLock`, the BillerPe logo).
- **Cloud report code** (`appv1/domains/reports.js`) runs on the same tables the PC uploads to.
  It is limited to Plan 2 outlets today, so the owner API gives it a Plan 1 context.
- **Nothing changes in the outlet PC** for phases 1–3. Phase 4 (manage) is tested end to end
  against a real PC and needs no PC release unless testing finds a sync bug.

### 1.4 Owner decisions (5 Oct 2026)

| Topic | Decision |
|---|---|
| Who | Owner role only, Plan 1 outlets only (Plan 2 owners use the POS App) |
| Phones | Android first; iOS later (needs an Apple account + a Mac) |
| Price | Included in Plan 1, no extra charge, no activation gate |
| Live data | 3-minute freshness is fine; show "updated X min ago" |
| Orders | View only — no remote cancel, discount or approval |
| Owner can change | Menu, Staff & access, Tables & sections, Settings |
| Stock | View everything + edit masters; daily entries stay at the outlet |
| Alerts (push) | PC offline/online, risky actions, nightly day summary, low stock |
| Reports | PDF + Excel (.xlsx), any range, one or all outlets |
| Outlet PC | Health view only (no remote update button) |
| Languages | English + Hindi + Gujarati (native-speaker review before release) |

---

## 2. Feature list (Task 2)

### A. Sign in & account
1. Login with the owner's mobile + password (the same as the Web POS). Staff logins are refused
   with a clear message.
2. Lists every Plan 1 outlet where this mobile has the Owner role. Outlet switcher plus "All outlets".
3. Session stays logged in (refresh token). Fingerprint / PIN lock when the app opens.
4. Language per phone: English, हिन्दी, ગુજરાતી.
5. Profile, support call button, logout (removes this phone's push token).

### B. Home & live monitoring (view only)
6. Home for all outlets: net sales today, comparison with the same weekday last week, a sales
   curve through the day, bills, average bill, guests.
7. Live tiles: running tables, value on open bills, cancelled bills today.
8. Outlet cards: PC online/offline, last sync, sales, running tables, bills waiting to upload.
9. Outlet detail: today / yesterday / 7 days / custom range, sales by hour, peak hour,
   discount, tax, expenses, cash drawer (open session), payment mix, top items.
10. Running tables per section: amount, guests, minutes open, captain, bill printed,
    and tables open over 90 minutes highlighted.
11. Bills list across outlets with filters: running, settled, cancelled, edited after settle,
    due, discount. Search by bill no., table, customer, mobile.
12. Bill detail: items per KOT, the real totals, payment split, customer, and the activity
    timeline from the audit log (opened, KOTs, discount, edit, settle, cancel + reason, who, which device).
    Share bill PDF.
13. Outlet PC health: online/offline, last heard, last data sync, bills waiting, BillerPe server
    version and update status, Web POS version, PC name, offline periods in the last 7 days.

### C. Reports & downloads
14. All Web POS reports: day wise, item wise, category wise, payment mode, tax, discount,
    due received.
15. New owner reports: hourly sales, outlet comparison, cancelled & edited bills (who + reason),
    cash sessions (opening/closing/difference), expenses by head, stock in hand & ledger,
    purchases & wastage.
16. Any date range with presets, one outlet or all outlets (with a per-outlet breakdown).
17. Download as **PDF** and **Excel (.xlsx)**, and share to WhatsApp or email from the phone.

### D. Alerts & push notifications
18. Alerts screen with filters, unread dots, tap to open the bill, outlet or item.
19. **Outlet PC offline** after N minutes (default 10), and **back online**.
20. **Risky actions:** cancelled after KOT, discount above X% (default 20%), settled bill edited,
    cash difference at closing.
21. **Low stock:** a raw material or semi-finished item below its minimum level (once per item per day).
22. **Nightly day summary** at the owner's chosen time (default 11:30 PM): sales per outlet,
    payment mix, cancellations, discounts, edits, cash difference, expenses.
23. Alert rules screen: each alert on/off, with limits (minutes, %, time). One set for all outlets.
24. Push through Firebase (the existing BillerPe project), even when the app is closed.

### E. Manage (writes sync to the outlet PC)
25. Menu: switch items on/off (out of stock), change prices, add/edit items, categories,
    variants, addons, short codes. A "Syncing…" mark shows until the PC has the change.
26. Staff & access: add staff, edit name/mobile/role, reset PIN / password, disable or enable,
    per-user permissions (the Web POS module grid: view/add/edit/delete), reset to role defaults.
27. Tables & sections: add, rename, switch off. Refused while a table has a running order.
28. Settings: tax types, bill charges / service charge, payment modes (incl. custom), promo codes
    and discounts, expense heads.
29. Stock masters: raw materials (units, minimum levels), suppliers, recipes, semi-finished items.
30. Every change is recorded in the audit log as "Owner App".

### F. Not in the app (by decision)
- Taking orders, KOTs, billing, settling, cancelling, approving.
- Daily stock entries (POs, wastage, expenses) and printer settings.
- Remote control of the outlet PC (updates, restart).

---

## 3. Technical design

### 3.1 App — `BillerPe Owner App/app/`
- Same stack as the POS App: Vite + React + TypeScript + Tailwind + hash router + Capacitor 8,
  Android package `com.billerpe.owner`, app name "BillerPe Owner".
- Shared pieces are copied from the POS App (not linked, so the two apps can release
  independently): design tokens, sheets, `fileExport`, `pdf` (jsPDF), `push`, `i18n`, `AppLock`, logo.
- Excel files are built in the app with a small xlsx writer (SheetJS community build).
- The API client polls lightly while a screen is open (60 s, matching how often the cloud's data changes).
  No socket is needed.

### 3.2 Cloud — `uat-backend-v2/ownerv1/`, mounted at `/owner/v1`
- RPC style like `/app/v1`: `POST /owner/v1/<method> {args}` → `{ok, result}`.
- **Auth:** `login(mobile, password)` → owner JWT (`typ: "owner-app"`, own secret
  `OWNER_JWT_SECRET`) + refresh token, stored on a new `owner_devices` row (device info,
  push token, last seen). Allowed outlets = active `LOCAL_SUITE` hotels where this mobile is an
  active user with the Owner role. **Every call re-checks that the outlet is in that list** (multi-tenant rule).
- **Read methods:** `home`, `outlet`, `tables`, `bills`, `bill`, `outletPc`, `report`, `reportAll`,
  built on the existing report code with a Plan 1 context.
- **Write methods:** menu / staff / tables / settings / stock masters. Each write updates the
  cloud row the way the sync pull expects (`updatedAt` + entity version), so the PC fetches it.
  The app reads "synced to PC" status from the PC's next push/heartbeat.
- **Jobs:** `ownerv1/jobs.js` handles the offline/online watcher (state kept per registration, so
  offline periods are recorded), the nightly summary per owner, and low-stock checks after stock
  uploads. Risky-action alerts are raised when the PC's upload of orders, cash sessions and audit
  logs arrives (so alerts can be up to ~3 min after the event).
- **Push:** the existing `firebase-admin` setup. The owner must add an Android app
  `com.billerpe.owner` to the Firebase project and send its `google-services.json`.
- **New tables (migrations):** `owner_devices`, `owner_alerts`, `owner_alert_rules`,
  `outlet_offline_periods`.
- **Load:** Plan 1 has 1000+ outlets. All queries are per owner's outlets and indexed by
  `(hotel_id, business_date)`. Jobs scan only active registrations.

### 3.3 Testing (every phase)
- `scripts/test-ownerv1.js` against a `_test` database, covering every method, every refusal
  (staff login, Plan 2 outlet, someone else's outlet), and numbers that match the Web POS reports.
- Phase 4: real PC + cloud sync tests with deliberately different ids (as in
  `verify-table-sync.js`): an owner edit reaches the PC, a PC change made at the same time is not
  lost, and running tables are protected.
- App: headless-Chrome walkthrough of every screen (login, empty outlet, offline outlet,
  many outlets, Hindi/Gujarati), then a debug APK for testing on your phone.

---

## 4. Phased rollout (Task 3)

Each phase ends with a working APK you can test, the backend pushed to `master`, and the exact
server steps (migrations, env).

| Phase | What you get | Main work | Est. |
|---|---|---|---|
| **0 · Foundations** | App opens, owner logs in, sees their outlets with online/offline | App scaffold from POS App stack, brand/icons/splash, `/owner/v1` auth + outlets, `owner_devices` migration, APK build | 2–3 days |
| **1 · Watch** | Home, outlet live, running tables, bills, bill detail + activity, outlet PC health | Read APIs on the existing report code; "updated X min ago"; same-weekday comparison; offline-period tracking | 4–5 days |
| **2 · Reports** | Every report, any range, all outlets, PDF + Excel share | Report catalog + new owner reports, xlsx/pdf export, WebView share | 3–4 days |
| **3 · Manage** | Menu, staff & access, tables & sections, settings, stock masters | Write APIs + "Syncing…" status, end-to-end PC sync tests with different ids, running-table guards, audit "Owner App" | 6–8 days |
| **4 · Alerts** | Push for PC offline/online, risky actions, low stock, nightly summary; alert rules | Jobs, upload hooks, Firebase app, alerts screen | 3–4 days |
| **5 · Polish & release** | Hindi + Gujarati, fingerprint lock, dark mode, final QA, release APK | Translations (your review), full role/scenario QA, performance check with many outlets | 3–4 days |

Phase 3 (manage) comes before phase 4 (alerts) because it is the riskiest part and you wanted
management most. Phases 1–2 are read-only, so they are safe to give to owners early.

### What I need from you
1. **Design approval** (`design/index.html`): anything to add, remove or change before phase 1.
2. **Firebase** (before phase 4): add an Android app with package `com.billerpe.owner` to the
   BillerPe Firebase project and send me its `google-services.json`.
3. **App name and icon:** "BillerPe Owner" with the B.Pe mark — confirm or change.
4. **Translations** (phase 5): someone who reads Hindi and Gujarati to review the text.
5. **Each release:** deploy the backend and run the listed migrations (as for the POS App).

---

## 5. Status

### Phase 0 · Foundations — built 5 Oct 2026
- **Cloud** (`uat-backend-v2`, commit 19dda99 on `master`): `/owner/v1` login, resume, outlets with
  each PC's state, logout, push token, language; `owner_devices` table; Owner Firebase sender.
  Tests: `DATABASE_NAME=billerpe_app_test node scripts/test-ownerv1.js` (37 pass); POS App suite still 234 pass.
- **App** (`app/`): login, Home (every outlet + PC online/offline), outlet PC health, profile
  (support, log out), Bills/Reports/Manage/Alerts tabs say what each next phase brings.
  Push registers with the Owner Firebase project. Dark B.Pe icon and splash.
  Browser walkthrough: 26 checks pass.
- **APK:** `builds/BillerPe-Owner-0.1.0-debug.apk` (talks to https://uatbackend.billerpe.in).

**Server steps for this release**
1. `git pull` on the server.
2. `npm run migrate` (adds `owner_devices`, migration 20261005100000).
3. Put the Owner Firebase key on the server, outside the code folder, and add to `.env`:
   `OWNER_FIREBASE_SERVICE_ACCOUNT_FILE=/path/to/billerpeowner-firebase-adminsdk.json`
   (the file is in `secrets/` in this folder; never commit it). Optional: `OWNER_JWT_SECRET=<long random string>`.
4. Restart the backend.

**Test login:** the owner's mobile + Web POS password of any Plan 1 outlet.

### Outlet PC backlog — built 5 Oct 2026 (owner approved the exe change)
- **Exe** (`billerpe-local-exe` 840926f on `main`): the 60 s heartbeat also sends
  `x-exe-pending-orders` and `x-exe-last-push-age`. No new requests. Ships with the next exe release.
  `verify-sync-v2.js` checks it (step 12).
- **Cloud** (`uat-backend-v2` 9ee6e31): stored on the registration (migration 20261005110000);
  `/owner/v1 outlets` returns `pc.pendingOrders` / `pc.lastPushAt`. 43 owner tests pass.
- **App 0.1.1:** outlet cards say "Offline 14 min · 6 bills waiting"; the PC screen shows
  "Data synced" and "Bills waiting to upload". A PC on an older BillerPe shows "—" with
  "Update BillerPe on this PC to see this".

**Server steps (in addition to phase 0):** `npm run migrate` also runs 20261005110000.

### Phase 1 · Watch — built 5 Oct 2026 (app 0.2.0)
Screens built to match the design: Home (all outlets), Outlet live (today / yesterday / 7 days /
custom), Running tables, Bills (filters, search, outlet + date pickers), Bill detail with activity
and "Share bill PDF", Outlet PC health (now at its own screen behind the monitor button).
Owner decision 2026-10-05: guests are not recorded anywhere, so "Guests" reads **Items** and table
tiles leave the guest number off.

- **Cloud** `uat-backend-v2` 0df1ce1: `home`, `outlet`, `tables`, `bills`, `bill` in `ownerv1/watch.js`;
  the order upload also stores each bill's activity in the existing timeline table (no migration).
  84 owner tests; POS App 234 pass.
- **Exe** `billerpe-local-exe` 5325761: each uploaded bill carries its activity, KOT times, who sent
  each KOT and its staff member. Older PCs: bills still show, without KOT times or activity.
- **App** 0.2.0: `builds/BillerPe-Owner-0.2.0-debug.apk`. Browser walkthrough 43 checks.

Still to come in this phase's screens: "Offline in the last 7 days" on the PC screen (comes with the
phase 4 offline watcher), the Alerts badge (phase 4).
