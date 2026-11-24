# Ego 日记 (Ego Journal)

**在线使用 Live:** 
- 主页 Lyra 的终端: https://isabellelyu6-code.github.io/Journal/
- Ego 日记: https://isabellelyu6-code.github.io/Journal/journal/

主页和日记共用同一个账号（同一个网址下，登录一次两边都能用）。配置 Supabase 后就是云端账号，任何浏览器都能登录。

## 主页 Hub (`index.html`)
- A terminal-style command line: `todo 内容 明天`, `ddl`, `today`, `sites`, `help`
- Links to all my sites, a to-do list, and a coursework and exam tracker
- Encrypted per account with the same scheme as the journal. Back up or restore with JSON from 账号 › 导出/导入

The public version contains no personal timetable, coursework, or travel data.

An open-source, single-file journal app inspired by Apple Journal. MIT licensed.

## 功能 Features
- **分区 Notebooks**: create as many as you want, each with its own colour; move entries between them
- **检索 Search**: full-text search over titles, body, places, `#tags`, and notebook names, with highlighted matches; filters for favourites, photos, mood, and a calendar day
- **识别 Recognition**: photograph a handwritten or printed page and turn it into text. It uses Claude when running as a Claude artifact; otherwise it uses [Tesseract.js](https://github.com/naptha/tesseract.js) in the browser (`chi_sim+eng`)
- **AI reports** (Claude artifact only): daily, weekly, and monthly reports covering what you were busy with, mood changes, important people and moments, and gentle suggestions. Reports are cached, encrypted
- **AI auto-organise** (Claude artifact only): after an import, it creates notebooks such as 学习, 梦境, or 朋友, files each entry, and fills in mood, place, and tags
- **智能标签 Smart tags** (Claude artifact only): suggests a title, tags, and a mood
- **Remember me**: you only log in once per device. A non-extractable copy of the account key is kept in that browser's IndexedDB; logging out removes it
- Deep-navy theme with a jade-green accent
- Mood (7-point scale like Apple's State of Mind), places, tags, favourites, photos, voice dictation
- Calendar with mood dots, streaks, "on this day", and a yearly review (entries, words, months, moods, tags)
- Writing prompts
- **Import from Apple Journal**: the export ZIP (Settings › Apps › Journal › Export), or the `.html` files in `Entries/`. It brings in the title, text, reflection prompt, photos, places, and State of Mind words, which become tags. HEIC photos only decode in Safari
- **Import**: `.txt` / `.md` files, which are split into entries automatically at date lines such as `2025-11-24`, `2025年11月24日 星期一`, `11月24日`, `2025/11/24 20:30`; a JSON backup; or photos (one entry each, with optional OCR). You can also paste a large block of text
- **Export**: a full JSON backup (including photos) or Markdown

## 账号与加密 Accounts & encryption
- Create as many accounts as you need, each with a username and password.
- Each account has a random 256-bit data key. Every notebook, entry, and photo is encrypted with AES-GCM before it is saved.
- The data key is wrapped with a key derived from your password (PBKDF2-SHA256, 310,000 iterations). The password itself is never stored.
- Changing the password only re-wraps the data key. **Forgetting the password means the data cannot be recovered.**
- JSON exports are *not* encrypted, so keep them safe.

## 云端同步（任何浏览器都能登录）Cloud sync with Supabase
Set the same two constants at the top of **both** `index.html` and `journal/index.html`.
Without this, accounts live only in the browser where they were created.
1. Create a free project at https://supabase.com.
2. Open **SQL Editor**, paste [`supabase.sql`](supabase.sql), and click Run.
3. Go to **Authentication → Sign In / Providers → Email** and turn off **Confirm email**, or keep it on and confirm by email.
4. In **Project Settings → API**, copy the **Project URL** and the **anon public** key into the two constants at the top of the `<script>` in `index.html` (`SUPABASE_URL`, `SUPABASE_ANON_KEY`).

Notes:
- The anon key is meant to be public. Row Level Security limits each user to their own rows.
- Everything is encrypted in the browser before upload, so Supabase only stores ciphertext.
- The login password is also the encryption password. Resetting it through Supabase's "forgot password" makes old entries unreadable. Change the password inside the app instead.

## 数据存储 Storage
- **As a Claude artifact**: encrypted records are kept in the artifact's private per-user database (`data/users/<id>/acc-<account>/...`) and sync across your devices.
- **Self-hosted** (open `index.html`, or host it on GitHub Pages or any static host): encrypted records are kept in the browser's IndexedDB on that device (`ego-accounts`, `ego-acc-<account>`). Export backups regularly.

## 自己部署 Self-host
It's a single file with no build step and no server:
```
git clone https://github.com/isabellelyu6-code/Journal
# push to GitHub → Settings → Pages → deploy from branch
```

## Data model
```json
{ "app": "ego-journal", "version": 1,
  "notebooks": [{ "id", "name", "color", "created", "order" }],
  "entries":   [{ "id", "nb", "date": "YYYY-MM-DDTHH:MM", "title", "body", "mood": 1-7|null,
                  "tags": [], "place", "photos": [photoId], "thumbs": {photoId: dataURL}, "fav", "created", "updated" }],
  "photos":    [{ "id", "data": "data:image/jpeg;base64,..." }] }
```
