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

```sh
# 本地安装或发布到 npm 后
pnpm add dsh-plugin-desktop-shortcut
# 或：npm i dsh-plugin-desktop-shortcut
```

用 patch overlay 把插件加进 dsh 组合（参考 `examples/shortcut.cordis.yml`）：

```yaml
# shortcut.cordis.yml
- insert:
    - id: desktop-shortcut
      name: 'dsh-plugin-desktop-shortcut'
```

带 patch 启动：

```sh
dsh web --patch shortcut.cordis.yml
```

TUI 用户：在你的 TUI cordis 组合里同样加一行 `- name: 'dsh-plugin-desktop-shortcut'` 即可。

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
| `browserDelaySec` | number | `4` | 启动后多少秒打开浏览器 |

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
