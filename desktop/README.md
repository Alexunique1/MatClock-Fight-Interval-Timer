# MatClock Desktop

Desktop app workspace for MatClock Fight Interval Timer.

## Stack

- Tauri 2
- React
- TypeScript
- Vite

## Commands

```bash
npm install
npm run dev
npm run build
npm run tauri dev
```

`npm run build` verifies the frontend. `npm run tauri dev` requires Rust/Cargo and the Tauri platform prerequisites.

On this Windows machine Cargo needs the following environment variable when downloading crates:

```powershell
$env:CARGO_HTTP_CHECK_REVOKE='false'
```

## Current Scope

This workspace starts Desktop Stage 1:

- desktop-only project structure in `desktop/`;
- main timer screen;
- top summary cards;
- active profile dropdown;
- start/pause/resume/reset flow;
- local profile storage scaffold;
- built-in desktop sounds in `public/sounds`;
- default `Start1` sound for round start, rest start, and finish;
- data model prepared for profiles, flexible rounds, sounds, voice, display, and theme settings;
- Tauri config scaffold for Windows/macOS packaging later.
