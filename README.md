# dsh-plugin-desktop-shortcut

[![powered_by_dsh](https://img.shields.io/badge/powered_by-dsh-4D6BFE?style=flat-square&logo=deepseek&logoColor=white)](https://github.com/deepseek-ai/deepseek-harness)

English | [中文](README.zh.md)

A [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (dsh) plugin that creates a **Windows desktop shortcut** to launch `dsh web` with a single double-click — no terminal needed.

> ✨ Zero runtime dependencies (Node builtins only). Windows-only.
> 🐳 Bundled cute DeepSeek whale-girl icon (CC BY-NC-SA 4.0, see [assets/NOTICE.md](assets/NOTICE.md)).

## Features

1. On plugin load, writes a small `.cmd` launcher next to your dsh checkout
   (`<dshDir>/start-dsh-web.cmd`) and creates `<Desktop>\DSH Web.lnk` pointing
   at it (handles OneDrive desktop redirection).
2. Double-click the shortcut → a console window opens → `pnpm dsh web` runs →
   open `http://127.0.0.1:3080`. Closing the window stops the service.
3. **Duplicate-run guard**: if dsh is already listening on the port, the
   launcher skips starting a second instance and just opens the browser.
4. **Auto-open browser**: opens the web UI a few seconds after the server
   boots (configurable delay).
5. In the TUI, registers a `/shortcut` command:

| Command | Effect |
|---|---|
| `/shortcut` or `/shortcut status` | Show current state (including whether the server is running) |
| `/shortcut install` | Create / refresh the shortcut and launcher |
| `/shortcut remove` | Delete both files |

## Install

> Windows only. The plugin is not published to npm yet — install it straight
> from this GitHub repo.

### 1. Install the package into your dsh profile

dsh ships a plugin manager that runs pnpm inside the profile directory:

```sh
# web profile (this plugin's main target):
pnpm dsh plugin --profile web add git+https://github.com/DXF1024/dsh-plugin-desktop-shortcut.git
# or the TUI profile (for the /shortcut command):
pnpm dsh plugin --profile tui add git+https://github.com/DXF1024/dsh-plugin-desktop-shortcut.git
```

### 2. Declare it in the profile's patch layer

Append to `~/.dsh/profiles/web/cordis.patch.yml` (it is an empty list by default):

```yaml
- insert:
    - id: desktop-shortcut
      name: 'dsh-plugin-desktop-shortcut'
      config:
        autoInstall: true
        # dshDir: 'C:\path\to\your\dsh-checkout'   # default: process.cwd()
        # desktopName: 'DSH Web'
        # iconPath: 'C:\path\to\custom.ico'
```

### 3. Restart dsh

```sh
pnpm dsh web
```

From now on every start creates/refreshes a **"DSH Web"** desktop shortcut
(whale-girl icon included). TUI users get the `/shortcut` command instead.

> **Troubleshooting for other machines**:
> - The loader resolves plugin packages from the profile directory
>   (`~/.dsh/profiles/web/`), so the package must be installed there via
>   `dsh plugin --profile web add` — installing it into the dsh checkout's own
>   `node_modules` does NOT work.
> - On machines with a **system proxy** (e.g. Clash), `dsh plugin add` may fail
>   with `Unsupported proxy syntax` because the CLI forwards the raw Windows
>   proxy (`127.0.0.1:7897`, no scheme) to git. Workaround — run pnpm directly
>   in the profile directory:
>   ```sh
>   cd ~/.dsh/profiles/web && pnpm add git+https://github.com/DXF1024/dsh-plugin-desktop-shortcut.git
>   ```

## Configuration

All fields are optional.

| Key | Type | Default | Meaning |
|---|---|---|---|
| `dshDir` | string | `process.cwd()` | dsh checkout directory (launcher is written here) |
| `port` | number | `3080` | Web UI port (used for the duplicate guard and browser URL) |
| `desktopName` | string | `DSH Web` | Shortcut file name (`.lnk` appended) |
| `autoInstall` | boolean | `true` | Create the shortcut automatically on load |
| `launcherPath` | string | `<dshDir>/start-dsh-web.cmd` | Full path of the launcher script |
| `desktopPath` | string | `<Desktop>/<desktopName>.lnk` | Full path of the `.lnk` file |
| `iconPath` | string | bundled whale-girl icon | Custom `.ico` path (empty = system default) |
| `openBrowser` | boolean | `true` | Auto-open the browser after startup |
| `preventDuplicate` | boolean | `true` | Don't start a second instance if already running |
| `browserDelaySec` | number | `4` | Seconds to wait before opening the browser |

Example:

```yaml
- insert:
    - id: desktop-shortcut
      name: 'dsh-plugin-desktop-shortcut'
      config:
        dshDir: 'C:\AAADXF\DSH\deepseek-harness-master'
        port: 3080
        desktopName: 'DSH Web'
        iconPath: 'C:\path\to\my-icon.ico'
        openBrowser: true
        preventDuplicate: true
        browserDelaySec: 4
```

## Development

```sh
# syntax / export smoke test (16 checks)
node tests/smoke.mjs
```

## Credits

- Icon: [fornarwhal/deepseek-whale-girl-icon](https://github.com/fornarwhal/deepseek-whale-girl-icon) (CC BY-NC-SA 4.0)

## License

Plugin code: MIT ｜ Bundled icon: CC BY-NC-SA 4.0 (see [assets/NOTICE.md](assets/NOTICE.md))
