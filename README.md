# dsh-plugin-desktop-shortcut

[![powered_by_dsh](https://img.shields.io/badge/powered_by-dsh-4D6BFE?style=flat-square&logo=deepseek&logoColor=white)](https://github.com/deepseek-ai/deepseek-harness)

A [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (dsh) plugin that creates a **Windows desktop shortcut** to launch `dsh web` with a single double-click — no terminal needed.

> ⚡ Zero runtime dependencies (Node builtins only). Windows-only.
> 中文说明见下方「安装与使用」章节。

## What it does

1. On plugin load, writes a small `.cmd` launcher next to your dsh checkout
   (`<dshDir>/start-dsh-web.cmd`) and creates `<Desktop>\DSH Web.lnk` pointing
   at it (handles OneDrive desktop redirection).
2. Double-click the shortcut → a console window opens → `pnpm dsh web` runs →
   open `http://127.0.0.1:3080`. Closing the window stops the service.
3. In the TUI, registers a `/shortcut` command:

| Command | Effect |
|---|---|
| `/shortcut` or `/shortcut status` | Show current shortcut state |
| `/shortcut install` | Create / refresh the shortcut and launcher |
| `/shortcut remove` | Delete both files |

## Install

```sh
# from this repo (local) or after publishing to npm
pnpm add dsh-plugin-desktop-shortcut
# or: npm i dsh-plugin-desktop-shortcut
```

Add the plugin to your dsh composition with a patch overlay
(see `examples/shortcut.cordis.yml`):

```yaml
# shortcut.cordis.yml
- insert:
    - id: desktop-shortcut
      name: 'dsh-plugin-desktop-shortcut'
```

Run dsh with the patch:

```sh
dsh web --patch shortcut.cordis.yml
```

For the TUI, add the same `- name: 'dsh-plugin-desktop-shortcut'` entry to your
TUI cordis composition.

## Configuration

All fields are optional.

| Key | Type | Default | Meaning |
|---|---|---|---|
| `dshDir` | string | `process.cwd()` | dsh checkout directory (launcher is written here) |
| `port` | number | `3080` | Web UI port shown in the launcher message |
| `desktopName` | string | `DSH Web` | Shortcut file name (`.lnk` appended) |
| `autoInstall` | boolean | `true` | Create the shortcut automatically on load |
| `launcherPath` | string | `<dshDir>/start-dsh-web.cmd` | Full path of the launcher script |
| `desktopPath` | string | `<Desktop>/<desktopName>.lnk` | Full path of the `.lnk` file |

Example:

```yaml
- insert:
    - id: desktop-shortcut
      name: 'dsh-plugin-desktop-shortcut'
      config:
        dshDir: 'C:\AAADXF\DSH\deepseek-harness-master'
        port: 3080
        desktopName: 'DSH Web'
        autoInstall: true
```

## Development

```sh
# syntax / export smoke test
node -e "import('./src/index.js').then(m => console.log(m.name, typeof m.apply))"
```

## License

MIT
