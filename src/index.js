/**
 * dsh-plugin-desktop-shortcut
 *
 * A DeepSeek Harness (dsh) plugin that creates a Windows desktop shortcut
 * which launches `dsh web` with a double-click.
 *
 * Features
 * - Auto-installs the desktop shortcut when the plugin loads (`autoInstall`).
 * - Cute DeepSeek whale-girl icon (bundled asset, CC BY-NC-SA 4.0, see
 *   assets/NOTICE.md) — override with `iconPath`.
 * - Duplicate-run guard: if the web server is already listening, the launcher
 *   just opens the browser instead of starting a second instance.
 * - Auto-opens the browser after the server boots (`openBrowser`).
 * - Registers a `/shortcut` slash command when the TUI commands service is
 *   composed: `/shortcut`, `/shortcut install|ensure`, `/shortcut remove`,
 *   `/shortcut status` (status also reports whether the server is running).
 * - Zero runtime dependencies (Node builtins only). Windows-only.
 *
 * @module dsh-plugin-desktop-shortcut
 */

import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'desktop-shortcut'

const IS_WIN = process.platform === 'win32'
const USAGE = '/shortcut [install|remove|status]'

/** Bundled cute DeepSeek whale-girl icon (if present in the package). */
const DEFAULT_ICON = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'assets',
  'DeepSeekHarness-WhaleGirl.ico',
)

/* ------------------------------------------------------------------ */
/* Options resolution                                                  */
/* ------------------------------------------------------------------ */

/**
 * Resolve effective options from the plugin config object.
 * @param {Record<string, unknown>} [config] - Cordis plugin config (2nd arg of apply).
 * @returns {{dshDir: string, port: number, webUrl: string, desktopName: string, autoInstall: boolean, launcherPath: string, desktopPath: string, iconPath: string | undefined, openBrowser: boolean, preventDuplicate: boolean, browserDelaySec: number}}
 */
function resolveOptions(config = {}) {
  const dshDir = String(config.dshDir ?? process.cwd())
  const port = Number(config.port ?? 3080)
  const desktopName = String(config.desktopName ?? 'DSH Web')
  const launcherPath = String(config.launcherPath ?? path.join(dshDir, 'start-dsh-web.cmd'))
  const desktopPath = String(
    config.desktopPath
    ?? path.join(resolveDesktopDir(), `${desktopName}.lnk`),
  )
  let iconPath = config.iconPath === undefined || config.iconPath === ''
    ? undefined
    : String(config.iconPath)
  if (iconPath === undefined && existsSync(DEFAULT_ICON)) iconPath = DEFAULT_ICON
  return {
    dshDir,
    port,
    webUrl: `http://127.0.0.1:${port}`,
    desktopName,
    autoInstall: config.autoInstall !== false,
    launcherPath,
    desktopPath,
    iconPath: iconPath && existsSync(iconPath) ? iconPath : undefined,
    openBrowser: config.openBrowser !== false,
    preventDuplicate: config.preventDuplicate !== false,
    browserDelaySec: Math.max(1, Number(config.browserDelaySec ?? 60)),
  }
}

/* ------------------------------------------------------------------ */
/* Windows helpers                                                     */
/* ------------------------------------------------------------------ */

/** Resolve the real Desktop folder (handles OneDrive redirection). */
function resolveDesktopDir() {
  const r = spawnSync(
    'powershell.exe',
    ['-NoProfile', '-Command', "[Environment]::GetFolderPath('Desktop')"],
    { encoding: 'utf8' },
  )
  const line = (r.stdout || '').split(/\r?\n/).find(Boolean)
  if (r.status === 0 && line) return line.trim()
  return path.join(process.env.USERPROFILE || process.env.HOME || '.', 'Desktop')
}

/** Wrap a Windows path/command in double quotes for .cmd usage. */
function cmdQuote(s) {
  return `"${String(s).replace(/"/g, '""')}"`
}

/**
 * Resolve the pnpm launcher as an executable command.
 * cmd.exe cannot execute .mjs/.js directly — it would trigger the "open
 * with" dialog — so always prefer a .cmd/.exe/.bat shim, and fall back to
 * `node <script>` for bare module entry points.
 * @returns {{command: string, args: string[]}}
 */
function resolvePnpm() {
  // 1. Prefer an executable shim (.cmd/.exe/.bat) on PATH.
  const r = spawnSync('where.exe', ['pnpm'], { encoding: 'utf8' })
  if (r.status === 0) {
    const line = (r.stdout || '').split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => /\.(cmd|exe|bat)$/i.test(l))
    if (line) return { command: line, args: [] }
  }
  // 2. npm_execpath is set when dsh was launched under pnpm/npm.
  const exec = process.env.npm_execpath
  if (exec && /pnpm/i.test(exec) && existsSync(exec)) {
    if (!/\.m?js$/i.test(exec)) return { command: exec, args: [] }
    const cmdShim = exec.replace(/\.m?js$/i, '.cmd')
    if (existsSync(cmdShim)) return { command: cmdShim, args: [] }
    // Bare module entry: execute it with the current node binary.
    return { command: process.execPath, args: [exec] }
  }
  // 3. Fall back to PATH lookup at run time.
  return { command: 'pnpm', args: [] }
}

/** Render the .cmd launcher content (port guard + auto browser open). */
function renderLauncher(options, pnpm) {
  const launch = [cmdQuote(pnpm.command), ...pnpm.args.map(cmdQuote), 'dsh', 'web'].join(' ')
  const lines = [
    '@echo off',
    'REM Auto-generated by dsh-plugin-desktop-shortcut. Manage with: /shortcut remove',
    'setlocal',
    `cd /d "${options.dshDir}"`,
    `set "URL=${options.webUrl}"`,
    '',
    'REM --- duplicate-run guard: if the server is already listening, just open the browser ---',
  ]
  if (options.preventDuplicate) {
    lines.push(
      `powershell -NoProfile -Command "if (Get-NetTCPConnection -LocalPort ${options.port} -State Listen -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"`,
      'if %errorlevel%==0 (',
      `  echo [DSH] Web is already running: %URL% - opening browser...`,
      '  start "" "%URL%"',
      '  exit /b 0',
      ')',
      '',
    )
  }
  lines.push(
    `echo [DSH] Starting DeepSeek Harness Web (%URL%) ...`,
    'echo [DSH] Keep this window open while you use the web UI; closing it stops the service.',
    '',
  )
  if (options.openBrowser) {
    lines.push(
      'REM --- wait for the server to come up, then open the browser (poll the port) ---',
      'REM (a fixed delay opens the browser too early on cold starts; polling waits until it actually listens)',
      `start "" /min powershell.exe -NoProfile -Command "$u='${options.webUrl}'; for($i=0;$i -lt ${Math.max(1, options.browserDelaySec)};$i++){ $c=Get-NetTCPConnection -LocalPort ${options.port} -State Listen -ErrorAction SilentlyContinue; if($c){ Start-Sleep -Seconds 2; Start-Process $u; break }; Start-Sleep -Seconds 1 }"`,
      '',
    )
  }
  lines.push(
    // `call` is REQUIRED: invoking a .cmd from a batch without call makes the
    // outer script exit as soon as the inner one finishes (window closes and
    // the trailing echo/pause never run).
    `call ${launch}`,
    '',
    'echo.',
    'echo [DSH] Service stopped.',
    'pause',
    '',
  )
  return lines.join('\r\n')
}

/** Escape a string as a PowerShell single-quoted literal ('' escapes a quote). */
function psQuote(s) {
  return `'${String(s).replace(/'/g, "''")}'`
}

/** Create a Windows .lnk via PowerShell COM (optional icon). */
function createShortcut(shortcutPath, targetPath, workingDirectory, description, iconLocation) {
  const ps = [
    '$ws = New-Object -ComObject WScript.Shell',
    `$lnk = $ws.CreateShortcut(${psQuote(shortcutPath)})`,
    `$lnk.TargetPath = ${psQuote(targetPath)}`,
    `$lnk.WorkingDirectory = ${psQuote(workingDirectory)}`,
    `$lnk.Description = ${psQuote(description)}`,
    ...(iconLocation ? [`$lnk.IconLocation = ${psQuote(iconLocation)}`] : []),
    '$lnk.WindowStyle = 1',
    '$lnk.Save()',
  ].join('; ')
  const r = spawnSync('powershell.exe', ['-NoProfile', '-Command', ps], { encoding: 'utf8' })
  return r.status === 0
}

/** Probe whether a TCP server is listening on 127.0.0.1:port. */
function isServerRunning(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: '127.0.0.1', port, timeout: 1200 })
    socket.once('connect', () => { socket.destroy(); resolve(true) })
    socket.once('error', () => resolve(false))
    socket.once('timeout', () => { socket.destroy(); resolve(false) })
  })
}

/* ------------------------------------------------------------------ */
/* Operations                                                          */
/* ------------------------------------------------------------------ */

/** Write the launcher script and create the desktop shortcut. */
function installShortcut(options) {
  if (!IS_WIN) {
    throw new Error('this plugin is Windows-only (process.platform is not win32)')
  }
  const pnpm = resolvePnpm()
  const launcherDir = path.dirname(options.launcherPath)
  if (!existsSync(launcherDir)) mkdirSync(launcherDir, { recursive: true })
  writeFileSync(options.launcherPath, renderLauncher(options, pnpm), { encoding: 'utf8' })

  const created = !existsSync(options.desktopPath)
  const ok = createShortcut(
    options.desktopPath,
    options.launcherPath,
    path.dirname(options.launcherPath),
    `Launch DeepSeek Harness Web (${options.webUrl})`,
    options.iconPath,
  )
  if (!ok) throw new Error('failed to create the desktop shortcut via PowerShell')
  return {
    kind: 'success',
    text: [
      `Desktop shortcut: ${ok ? 'created' : 'updated'}`,
      `  Shortcut: ${options.desktopPath}`,
      `  Launcher: ${options.launcherPath}`,
      `  Target:   ${pnpm.command} ${pnpm.args.join(' ')} dsh web (in ${options.dshDir})`,
      `  URL:      ${options.webUrl}`,
      options.iconPath ? `  Icon:     ${options.iconPath}` : '  Icon:     (default)',
      `  Guard:    ${options.preventDuplicate ? 'duplicate-run check on' : 'off'}`,
      `  Browser:  ${options.openBrowser ? `auto-open once the server listens (poll up to ${options.browserDelaySec}s)` : 'off'}`,
      created ? '' : 'The shortcut already existed and was refreshed.',
    ].filter(Boolean).join('\n'),
  }
}

/** Remove the desktop shortcut and the launcher script. */
function removeShortcut(options) {
  let removed = 0
  if (existsSync(options.desktopPath)) {
    rmSync(options.desktopPath, { force: true })
    removed += 1
  }
  if (existsSync(options.launcherPath)) {
    rmSync(options.launcherPath, { force: true })
    removed += 1
  }
  return {
    kind: 'success',
    text: removed === 0
      ? 'No desktop shortcut found; nothing to remove.'
      : `Removed ${removed} item(s):\n  ${options.desktopPath}\n  ${options.launcherPath}`,
  }
}

/** Report the current state of the shortcut (async: probes the port). */
async function statusShortcut(options) {
  const lines = [`Shortcut: ${options.desktopPath}`]
  lines.push(existsSync(options.desktopPath)
    ? '  State: exists'
    : '  State: missing (run /shortcut install)')
  lines.push(`Launcher: ${options.launcherPath}`)
  lines.push(existsSync(options.launcherPath)
    ? '  State: exists'
    : '  State: missing')
  if (options.iconPath) lines.push(`Icon: ${options.iconPath}`)
  lines.push(`URL: ${options.webUrl}`)
  const running = await isServerRunning(options.port)
  lines.push(`Web server on ${options.port}: ${running ? '🟢 running' : '⚪ not running'}`)
  if (!IS_WIN) lines.push('Note: this plugin only works on Windows.')
  return { kind: 'success', text: lines.join('\n') }
}

/* ------------------------------------------------------------------ */
/* Command handler                                                     */
/* ------------------------------------------------------------------ */

/** Execute one parsed `/shortcut` invocation (async for the status probe). */
async function handleShortcutCommand(options, invocation) {
  const raw = String(invocation.rawInput ?? '').trim().toLowerCase()
  try {
    if (raw === '' || raw === 'status') return await statusShortcut(options)
    if (raw === 'install' || raw === 'ensure' || raw === 'create') return installShortcut(options)
    if (raw === 'remove' || raw === 'uninstall' || raw === 'delete') return removeShortcut(options)
    return { kind: 'error', text: `Unknown /shortcut subcommand "${raw}". Usage: ${USAGE}` }
  } catch (error) {
    return {
      kind: 'error',
      text: `desktop-shortcut: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

/* ------------------------------------------------------------------ */
/* Plugin entry                                                        */
/* ------------------------------------------------------------------ */

/**
 * Cordis plugin entry.
 * @param {import('@deepseek-ai/cordis').Context} ctx - Plugin context.
 * @param {Record<string, unknown>} [config] - Plugin configuration.
 */
export function apply(ctx, config) {
  const options = resolveOptions(config)
  let installed = false
  let registered = false

  // Auto-install (best effort). Runs immediately at mount — do not rely on
  // 'ready', which some profiles (e.g. the web app) never emit for plugins.
  const runAutoInstall = () => {
    if (installed || !IS_WIN || !options.autoInstall) return
    try {
      const result = installShortcut(options)
      installed = true
      if (ctx.logger) ctx.logger.info(`desktop-shortcut: ${result.text}`)
    } catch (error) {
      if (ctx.logger) {
        ctx.logger.warn(`desktop-shortcut: auto-install failed: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  }

  // Register the /shortcut command when the commands service is composed.
  // NOTE: this Cordis fork throws on plain property access when the service is
  // absent, so probe availability with try/catch instead of `ctx.commands?.`.
  const registerCommand = () => {
    if (registered) return
    let commands
    try {
      commands = ctx.commands
    } catch {
      return // commands service is not composed in this profile (e.g. web)
    }
    if (!commands || typeof commands.register !== 'function') return
    registered = true
    commands.register({
      name: 'shortcut',
      description: 'install, remove, or check the DSH web desktop shortcut (Windows)',
      input: { hint: '[install|remove|status]' },
      handler: invocation => handleShortcutCommand(options, invocation),
    })
  }

  runAutoInstall()
  registerCommand()

  // Fallback: services such as `commands` may only be available after ready.
  ctx.on('ready', () => {
    runAutoInstall()
    registerCommand()
  })
}
