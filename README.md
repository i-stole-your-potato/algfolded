# Algfolded

A timer-based trainer for **blindfolded (BLD) speedcubing algorithms**.

Algfolded is a general BLD **algset** trainer: it hosts several algorithm sets side by side, each with its own cases, scrambles and independent progress. Pick a set, select the cases you want, and drill them with a timer, spaced-repetition-style case selection, per-case notes and optional smart-cube tracking.

This repository is a fork of [tobipch's Algfolded](https://github.com/tobipch/algfolded). Algfolded itself was forked from [Roman Strakhov's ZBLL Trainer](https://github.com/Roman-/zbll), originally adapted with permission from the original author. Algorithm data is sourced from [blddb](https://github.com/nbwzx/blddb).

## Changes in this fork

Compared with the upstream snapshot at [`73db2fe`](https://github.com/tobipch/algfolded/commit/73db2fe54c7e131d072d99facc5bea091dcff7ee), this fork includes:

- **D-face corner buffers:** changed the configurable buffers from `RDF` / `FDL` to `DFR` / `DFL`, and the parity fallback buffer from `LDB` to `DBL`. Case targets and displayed letters are expressed from the new stickers. Existing saved `RDF` / `FDL` buffer orders migrate automatically while retaining their priority. Sticker definitions in the letter scheme remain intact.
- **Refreshed algorithm data:** re-fetched all eight algsets from BLDDB, regenerated corner-commutator buffer targets, and restored commutator notation. Case IDs and existing scrambles are preserved, so selections, notes and history continue to refer to the same cases. A refresh does not necessarily change every data file.
- **Recap selection fix:** deselecting a completed case during a recap no longer switches to Practice or resets the remaining progress. The current case stays in place if still pending, deselected cases leave the queue, and newly selected cases join the recap. Completing all remaining selected cases still ends the recap normally.
- **Visible upstream credit:** added a link to tobipch's repository in the page footer, with English, German, French and Italian translations.
- **Google Drive manual sync:** complete portable snapshots of letter schemes, notes, settings, selections, presets, custom/preferred algorithms, practice/SRS history and completed Flow runs across all algsets. Each upload creates a separate version. Restore validates the snapshot, saves a local recovery point, then replaces local data and reloads. Google OAuth setup is required; there is no background sync or automatic conflict merge.
- **Regression coverage:** updated buffer-label tests and added checks for D-face target geometry, saved-setting migration and changes to the selection during Recap.

Practice, Recap, Flow, smart-cube support and cloud sync were already present upstream.

### GitHub Pages

The frontend is published at https://i-stole-your-potato.github.io/algfolded/ by `.github/workflows/pages.yml` on pushes to `master`. The workflow builds with the Pages base path and deploys `dist/`. In repository Settings → Pages, select **GitHub Actions** as the source. A deployment can also be started manually from the Actions tab.

Pages hosts only the static frontend: practice, Recap, Flow and browser-local data work without a backend. Optional Google Drive backups also work on Pages after the setup below. WCA login and WCA cloud sync require the separate API and database described below; they are not hosted by Pages.

### Google Drive：跨裝置備份／還原設定

這是**手動同步**：裝置 A 備份 → 裝置 B 登入相同 Google 帳號 → 選擇版本還原。字母表、筆記、設定、自訂／偏好公式、已選 case、預設清單、練習／SRS 紀錄及已完成的 Flow 紀錄都包含在內，涵蓋所有公式集。尚未完成的 Flow 計時、藍芽連線、WCA 登入及待上傳至 WCA 後端的佇列不會搬移。程式附帶的公式資料也不重複備份。

#### 1. 建立 Google OAuth Client ID

1. 在 [Google Cloud Console](https://console.cloud.google.com/) 建立或選擇自己的專案，啟用 **Google Drive API**。
2. 在 **Google Auth Platform** 設定 Branding／Audience（舊版介面為 OAuth consent screen），填寫應用程式名稱、支援信箱與開發者聯絡信箱。個人使用可以先採 External／Testing，並將自己要使用的 Google 帳號加入 Test users。
3. 在 Data Access 加入唯一所需的 scope：`https://www.googleapis.com/auth/drive.appdata`。
4. 在 Clients 建立 **Web application** 的 OAuth client。Authorized JavaScript origins 加入 `https://i-stole-your-potato.github.io`。Origin **不要加 `/algfolded/` 路徑**。本機測試可另外加入 `http://localhost:5173` 和 `http://127.0.0.1:5173`。
5. 複製結尾為 `.apps.googleusercontent.com` 的 **Client ID**。這個前端使用彈出視窗的 token flow，不需要 client secret，也不需要設定本程式的 redirect URI。

#### 2. 設定 GitHub Pages

1. 開啟 repository → **Settings → Secrets and variables → Actions → Variables**。
2. 新增 Repository variable：名稱 `VITE_GOOGLE_CLIENT_ID`，值填入上一步的 Client ID。
3. 到 **Actions → Deploy GitHub Pages → Run workflow**，讓網站重新建置。僅修改 variable 不會自動觸發部署。
4. 等部署完成後重新整理網站，在 Settings 找到 **Google Drive · manual sync**。

Client ID 是公開識別碼，會編進網頁程式；**不要提供或填入 client secret**。目前沒有 Client ID 時，網站會顯示尚未設定，原有練習功能仍可使用。

本機開發：在未追蹤的 `.env.local` 設定 `VITE_GOOGLE_CLIENT_ID=你的ClientID`，重新啟動 `npm run dev`。Vite 的環境變數在建置時讀取，正式網站更改後也必須重建。所有裝置需使用同一個網站／Google Cloud 應用程式；換成另一個 Google Cloud 專案會使用不同的 app data 空間。

#### 3. 使用與還原

1. 在 Settings 按 **Enable Google connection** 載入 Google 登入程式，再按 **Choose Google account** 並授權。
2. 裝置 A 按 **Back up this device**；成功後會新增帶時間的版本，不會覆寫其他裝置的備份。
3. 裝置 B 使用同一 Google 帳號連線，必要時按 **Refresh backups**，選取版本，再按 **Restore selected backup**。
4. 確認前先關閉此網站的其他分頁，並停止練習。還原會取代全部可攜式本機資料（包含刪除備份中不存在的項目），重新載入網頁並中斷藍芽連線。若網站另有 WCA 後端，必須先登出 WCA，避免伺服器同步覆寫還原結果。
5. 要回復還原前的資料，可在 Settings 按 **Restore local recovery point**。只保留最近一次還原前的資料，存於同一瀏覽器；清除網站資料也會清掉它。

每次還原都必須先成功儲存本機還原點。瀏覽器空間不足會中止，不會直接覆寫；寫入途中失敗會嘗試回復原資料。若原資料與還原點合計超過瀏覽器容量，請先在有容量的裝置還原，或備份目前裝置後再處理空間。不要為了騰出空間直接刪掉唯一一份資料。

兩台裝置同時修改時，會產生各自的備份，**不會合併內容**。請先選定要保留的版本，再在其他裝置還原；繼續練習前先還原最新版，練習完再備份。版本不會自動清理，因此會使用 Google Drive 容量。

#### 權限、隱私與排錯

備份存放於 Google Drive 隱藏的 `appDataFolder`，不會顯示在「我的雲端硬碟」的一般檔案清單。只要求本應用程式資料空間的權限，不讀取其他 Drive 文件；資料直接由瀏覽器傳送到 Google。只有使用者按下啟用後才載入 Google 登入程式。Access token 僅存在記憶體中，不寫入 localStorage 或備份，過期或重新載入後需要重新選擇帳號。詳見 [Google token model](https://developers.google.com/identity/oauth2/web/guides/use-token-model) 與 [Drive app data folder](https://developers.google.com/workspace/drive/api/guides/appdata)。

**Disconnect** 只清除此頁的連線 token，不會刪除備份或撤銷 Google 帳號的授權。可在 Google 帳號的第三方連線管理撤銷存取，或到 Google Drive 設定的管理應用程式中刪除本應用程式的隱藏資料。

- `origin_mismatch`：檢查 JavaScript origin 的網域、協定與連接埠是否完全一致，且沒有路徑。
- 無法存取／403：確認已啟用 Drive API、測試帳號已加入、同意 app data 權限，且 Drive 仍有空間。
- 登入視窗無法開啟：允許此網站彈出視窗；若 Google 程式無法載入，檢查網路或內容阻擋器。
- 上傳逾時：先重新整理備份清單確認是否已成功，再重試；重試最多產生另一份版本，不會覆寫既有資料。
- 沒看到備份：確認使用相同 Google 帳號及相同 Cloud 專案的網站。

未設定 Client ID 時可驗證型別、備份格式、還原與模擬 API 測試；實際 Google 登入、跨裝置讀寫仍需設定完成後驗證。

Validation of these changes: type checking and the Pages production build pass. The full test run has 382 passing tests and two pre-existing failures in `src/views/legal.test.ts` that assume operator details are unfilled; five additional Drive settings component tests pass separately (387 passing tests total). The 23 new backup/Drive tests cover portable data, corrupt snapshots, recovery/quota failures, token expiry, pagination, immutable uploads and restore confirmation. Real Google login and cross-device transfers still require a configured Client ID. The data checks also identify 11 pre-existing parity cases without pre-generated scrambles; the trainer uses its inverse-algorithm fallback for those cases.

## Algsets

Switch between sets from the picker on the selection page. Each set keeps its **own** selection, session, statistics, spaced-repetition history, notes and presets — nothing bleeds across sets.

| Set | Cases | Description |
| --- | ----- | ----------- |
| **Corner Commutators** | 1008 | Every corner 3-cycle (3-style), grouped by buffer → second letter → case |
| **Edge Commutators** | 1760 | Every edge 3-cycle (3-style), grouped by buffer → second letter → case |
| **Corner 2-Twists** | 56 | Two twisted corners, grouped by buffer → case (`UFR/N`) |
| **Edge 2-Flips** | 66 | Two flipped edges, grouped by buffer → case (`UF-UB`) |
| **3-Twists** | 112 | Three corners twisted in the same direction, grouped by buffer |
| **LTCT** (Last Target Corner Twist) | 252 | The final corner-twist case at the end of a corners BLD solve |
| **T2C** (Twisted 2 Corners) | 126 | "Two corners left and your buffer is twisted": LTCT cases of the non-UFR buffers whose twisted corner is UFR, solved as a 3-target sequence from the next buffer |
| **Parities** | 813 | Corner parity algs that swap the corner buffer with a target and two edges with each other (memo swap / pseudo swap), grouped by buffer → edge swap → target letter |

Because the app is set-agnostic, adding a new set is essentially "a data file + a small descriptor" (see `src/algsets/`).

## Core features

- **Case selection UI** — expand groups/subgroups, select individual cases or whole branches, and see each case's letters at a glance. For the commutator sets, a **"+ Inverses"** button also selects the inverse of every selected case (AB → BA).
- **Command palette** (`Alt+K` or the ⌘ navbar button) — a PowerToys-style quick-action box: navigate, switch algset, toggle settings/theme/language, load presets, connect the smart cube, and run **wildcard selections**. Type a pattern with `*` (e.g. `UU*E`, several space-separated), `+`/`-` to add/remove from the selection, or `#`/`@`/`>` to filter to algsets/presets/commands.
- **Timer with stats** — per-solve history, inline notes, delete/inspect individual results, and a session summary (solve count, unique cases, total/mean time, sparkline, slowest cases with one-click re-practice).
- **Custom letter scheme** — edit your sticker→letter mapping (Speffz by default) in settings, for **both corners and edges**. The scheme drives the letters shown everywhere, including the 3-twists and commutator letters, so the whole app speaks your lettering.
- **WCA account & cloud sync** — sign in with your WCA account; solves are stored in a database so your history follows you across devices.
- **Statistics overview** — a mobile-friendly grid of all cases with average time and repetition count, searchable with `*`/`?` wildcards.
- **Your alg per case** — pick the algorithm you actually use for each case (click it in any case detail); with a smart cube the executed alg is recognized automatically.
- **Presets** — save named case selections (plus a starred quick-list) to jump between practice sets. Signed in, presets belong to the account and follow you to every device.
- **Notes** — attach a personal note to any case.
- **Interactive 3D cube** — touch/drag to rotate; configurable solving orientation.
- **Unified light/dark theme** and **four languages** (EN, DE, FR, IT).

### Buffer order

Most sets are grouped by **buffer**. In settings you can reorder the buffer priority — by **drag-and-drop** or the up/down buttons — and the sets **re-partition live**: each case is assigned to its highest-priority buffer, so the grouping and the case letters follow your preferred buffer order.

There are two buffer lists: a **corner** order (3-twists, corner commutators, corner 2-twists, parities, T2C) and a separate **edge** order (edge commutators, edge 2-flips). The D-layer corner buffers are named by their tracked sticker (`DFR`, `DFL`), and case targets are expressed from that sticker. A case only shows up under its highest-priority buffer — later buffers list only the cases their earlier buffers don't already cover, so the corner commutator set counts down 378 → 270 → 180 → 108 → 54 → 18 across the default order and the edge set 440 → 360 → … → 8.

Some cases consist only of never-configured pieces: the 2-piece sets can pair exactly the two back pieces (`DBR`+`DBL`, or `BR`+`BL`), and the parity set contains cases whose buffer corner is `DBL` (tracked from its D-face sticker). Those get an implicit lowest-priority fallback buffer so every case is still reachable.

### Smart case selection

When enabled (default), cases are picked with a weighted-random algorithm inspired by spaced repetition:

- **Slowness weight** — slower cases come up more often.
- **Recency weight** — cases you haven't seen in a while are prioritized.

Turn it off in settings for plain uniform-random practice.

### "Didn't know" button

After a solve, mark a case as forgotten — its estimated time is temporarily set to 5× the median so it returns much sooner. The penalty clears automatically after the next successful solve.

### Recap mode

Go through every selected case exactly once (Alt+R) — a counter shows how many remain. Normal weighted selection resumes once all cases are covered.

### Smart cube (Bluetooth)

Connect a Bluetooth smart cube for hands-free scramble tracking. Supported brands: **GAN** (Gen2/Gen3/Gen4, via `gan-web-bluetooth`) and **MoYu / QiYi** (via `btcube-web`). Click the Bluetooth button and pick your cube's brand.

- **Real-time tracking** — completed moves turn green; wrong moves show in red as corrections to undo.
- **Automatic solved detection** — recognizes when the cube returns to solved after scrambling + solving.
- **State-based reconciliation** — handles slice moves (M/S/E), out-of-order commuting moves and other noise by comparing the physical cube state against the expected state.
- **Pause / resume tracking** (Alt+Y) — temporarily ignore moves, e.g. while adjusting grip.
- **Reset virtual cube** (Alt+M) — re-sync when the physical cube is back to solved.
- **Letterpair mode** — practice straight from the letter pair: the bar shows the case's letters instead of a scramble, the virtual cube starts already scrambled, and the timer stops the moment you solve it. Only relative moves are tracked, so the physical cube can stay scrambled between cases — no re-scrambling, no doubt about whether your alg was correct. Enable it in settings.
- **Fresh measurement after mistakes** — if you turn wrong, undo your moves: as soon as the cube is back at the case's start position (or you reset with a full D/U-layer spin, D4/U4), the timing restarts from zero on your next move.
- **Alg recognition** — when a smart-cube solve finishes, the executed move sequence is matched against the case's algorithm collection (rotations, slice and wide moves are translated to what the cube physically reports). A recognized alg is recorded with the solve and saved as *your* alg for that case.
- **Keyboard simulator** for testing without a physical cube (`window.btSim.connect()` in the browser console).

## WCA login, cloud sync & statistics

Sign in via the account button in the navbar (WCA OAuth). While signed in:

- every solve is stored in the database (an offline queue in `localStorage` buffers solves when you're offline or logged out and drains after the next login),
- deleting a result also deletes it from the database,
- your per-case alg choices sync across devices,
- your presets sync across devices — the account copy wins, and presets a device already had are uploaded on first login instead of being dropped,
- the **statistics page** (bar-chart icon) aggregates over your whole account history.

Logged out, the statistics page falls back to the locally stored per-case data, so it works without an account too.

### Backend & deployment

The frontend stays a static Vite SPA; the API lives in **Vercel serverless functions** (`api/`) that talk to a **MariaDB**:

1. Create a MySQL database and allow remote access for its user
2. Create a WCA OAuth application (redirect URI `https://<domain>/api/auth/wca/callback`; the scope field can stay blank — the default scope is `public`).
3. Configure the environment variables from `.env.example` in Vercel.
4. Create the tables once — either run the **"Setup database"** GitHub Action (needs the `MYSQL_*` repository secrets, see `.github/workflows/setup-db.yml`) or locally `npm run setup-db` with the `MYSQL_*` variables set.

For local development run `vercel dev` (serves the functions on port 3000) next to `npm run dev` — the Vite dev server proxies `/api` there. Without a backend the app simply behaves as logged out.

## Development

```bash
npm install
npm run dev        # dev server
npm run build      # production build to dist/
npm run preview    # preview the production build
npm run test       # unit tests (Vitest)
npm run typecheck  # vue-tsc
```

**Stack:** Vue 3 (`<script setup>`) · Pinia · vue-router · vue-i18n · Bootstrap 5 · Vite. State is persisted to `localStorage`, namespaced per algset.

### Regenerating algorithm data

Algorithm and scramble data live in `src/assets/` and are produced by the scripts in `scripts/`:

```bash
# LTCT + T2C
node scripts/fetch_blddb_algs.mjs    # refreshes ltct_map.json algs + regenerates t2c_map.json from blddb
node scripts/generate_scrambles.mjs
node scripts/verify_scrambles.mjs
node scripts/generate_t2c_scrambles.mjs
node scripts/verify_t2c_scrambles.mjs

# 3-Twists
node scripts/generate_twists.mjs
node scripts/fetch_blddb_twist_algs.mjs     # refreshes the algs from blddb (matched by cube geometry)
node scripts/generate_twist_scrambles.mjs

# Commutators (edges & corners)
node scripts/fetch_blddb_comm_algs.mjs      # builds/refreshes corner_comms.json + edge_comms.json from blddb
node scripts/generate_comm_scrambles.mjs    # adds scrambles (idempotent/resumable)

# 2-Flips (edges) & 2-Twists (corners)
node scripts/fetch_blddb_flip_twist_algs.mjs   # builds/refreshes edge_flips.json + corner_twists2.json from blddb
node scripts/generate_flip_twist_scrambles.mjs # adds scrambles (idempotent/resumable)

# Parities
node scripts/fetch_blddb_parity_algs.mjs    # (re)generates parities_map.json from blddb (keeps scrambles)
node scripts/generate_parity_scrambles.mjs
node scripts/verify_parity_scrambles.mjs
```

The sets are fully data-driven from [blddb](https://github.com/nbwzx/blddb): every case is decoded by cube geometry and re-expressed from each configurable buffer, so the `fetch_blddb_*.mjs` scripts double as importers (they only update `algs`/`buffers`, leaving scrambles intact).

A GitHub Action (`.github/workflows/update-algs.yml`) refreshes **all** sets' algorithms from blddb weekly and opens a PR when they change.
