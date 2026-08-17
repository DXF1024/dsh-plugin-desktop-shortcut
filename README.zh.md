# dsh-plugin-desktop-shortcut

[![powered_by_dsh](https://img.shields.io/badge/powered_by-dsh-4D6BFE?style=flat-square&logo=deepseek&logoColor=white)](https://github.com/deepseek-ai/deepseek-harness)

[English](README.md) | 中文

一个 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（dsh）插件：在 Windows 桌面创建一个**一键启动 `dsh web` 的快捷方式**，双击即用，再也不用手敲命令。

> ✨ 零运行时依赖（只用 Node 内置模块），仅支持 Windows。
> 🐳 内置可爱的 DeepSeek 鲸鱼娘图标（CC BY-NC-SA 4.0，见 [assets/NOTICE.md](assets/NOTICE.md)）。

## 功能

1. 插件加载时自动生成启动器脚本（`<dshDir>/start-dsh-web.cmd`）和桌面快捷方式（`<桌面>\DSH Web.lnk`，自动处理 OneDrive 桌面重定向）。
2. 双击快捷方式 → 弹出控制台窗口 → 运行 `pnpm dsh web` → 打开 `http://127.0.0.1:3080`；关闭窗口即停止服务。
3. **防重复启动**：如果 dsh 已经在运行（端口被占用），不会重复启动，而是直接打开浏览器。
4. **自动打开浏览器**：服务启动数秒后自动打开网页（延时可配置）。
5. TUI 中注册 `/shortcut` 命令：

| 命令 | 作用 |
|---|---|
| `/shortcut` 或 `/shortcut status` | 查看当前状态（含服务是否在运行） |
| `/shortcut install` | 创建 / 刷新快捷方式与启动器 |
| `/shortcut remove` | 删除两者 |

## 安装

> 仅支持 Windows。插件**尚未发布到 npm**，直接从本 GitHub 仓库安装即可。

### 1. 把插件装进你的 dsh profile

dsh 自带插件管理器（在 profile 目录里执行 pnpm）：

```sh
# web 配置（本插件的主要目标）：
pnpm dsh plugin --profile web add git+https://github.com/DXF1024/dsh-plugin-desktop-shortcut.git
# 或 TUI 配置（用于 /shortcut 命令）：
pnpm dsh plugin --profile tui add git+https://github.com/DXF1024/dsh-plugin-desktop-shortcut.git
```

### 2. 在 profile 的补丁层声明插件

在 `~/.dsh/profiles/web/cordis.patch.yml` 末尾追加（默认是空列表）：

```yaml
- insert:
    - id: desktop-shortcut
      name: 'dsh-plugin-desktop-shortcut'
      config:
        autoInstall: true
        # dshDir: 'C:\path\to\your\dsh-checkout'   # 默认: process.cwd()
        # desktopName: 'DSH Web'
        # iconPath: 'C:\path\to\custom.ico'
```

### 3. 重启 dsh

```sh
pnpm dsh web
```

之后每次启动都会自动创建/刷新桌面「DSH Web」快捷方式（自带鲸鱼娘图标）。
TUI 用户则是多了 `/shortcut` 命令。

> **给其他机器排障**：
> - dsh 的 loader 从 **profile 目录**（`~/.dsh/profiles/web/`）向上解析插件包，
>   所以必须用 `dsh plugin --profile web add` 装到那里——只装进 dsh 检出目录自己的
>   `node_modules` 是**不会生效**的。
> - **开了系统代理**（如 Clash）的机器上，`dsh plugin add` 可能报
>   `Unsupported proxy syntax`——dsh CLI 会把 Windows 注册表里的代理原样传下去
>   （`127.0.0.1:7897`，没有协议头）导致 git 报错。解决办法：直接在 profile 目录里
>   手动执行 pnpm：
>   ```sh
>   cd ~/.dsh/profiles/web && pnpm add git+https://github.com/DXF1024/dsh-plugin-desktop-shortcut.git
>   ```

## 配置项

全部可选。

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `dshDir` | string | `process.cwd()` | dsh 检出目录（启动器写在这里） |
| `port` | number | `3080` | Web 端口（用于防重复检测与浏览器地址） |
| `desktopName` | string | `DSH Web` | 快捷方式文件名（自动加 `.lnk`） |
| `autoInstall` | boolean | `true` | 加载时自动创建快捷方式 |
| `launcherPath` | string | `<dshDir>/start-dsh-web.cmd` | 启动器完整路径 |
| `desktopPath` | string | `<桌面>/<desktopName>.lnk` | 快捷方式完整路径 |
| `iconPath` | string | 内置鲸鱼娘图标 | 自定义 `.ico` 图标路径（留空用系统默认） |
| `openBrowser` | boolean | `true` | 启动后自动打开浏览器 |
| `preventDuplicate` | boolean | `true` | 已运行时不再重复启动 |
| `browserDelaySec` | number | `60` | 轮询端口等待服务器就绪的最长秒数（冷启动可能很慢） |

示例：

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

## 开发

```sh
# 语法 / 导出冒烟测试（16 项，全部通过）
node tests/smoke.mjs
```

## 致谢

- 图标：[fornarwhal/deepseek-whale-girl-icon](https://github.com/fornarwhal/deepseek-whale-girl-icon)（CC BY-NC-SA 4.0）

## License

插件代码：MIT ｜ 内置图标：CC BY-NC-SA 4.0（详见 [assets/NOTICE.md](assets/NOTICE.md)）
