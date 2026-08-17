/**
 * Smoke test for dsh-plugin-desktop-shortcut.
 * Runs the plugin against a fake Cordis ctx and a TEMP directory, so the real
 * Desktop is never touched.
 *
 * Usage: node tests/smoke.mjs
 */
import { mkdtempSync, existsSync, rmSync, readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { apply } from '../src/index.js'

const tmp = mkdtempSync(path.join(tmpdir(), 'dsh-shortcut-test-'))
const launcherPath = path.join(tmp, 'start-dsh-web.cmd')
const desktopPath = path.join(tmp, 'DSH Web.lnk')
const TEST_PORT = 55999 // unlikely to be in use -> status probe returns "not running"

/** Minimal fake Cordis context. */
function fakeCtx() {
  const ready = []
  let registered = null
  return {
    ready,
    registered: () => registered,
    on(event, fn) {
      if (event === 'ready') ready.push(fn)
    },
    commands: {
      register(def) { registered = def },
    },
    logger: { info: () => {}, warn: () => {} },
  }
}

async function runHandler(def, rawInput) {
  return def.handler({ rawInput, agent: { id: 'smoke' } })
}

let failures = 0
function check(label, ok) {
  console.log(`${ok ? '✅' : '❌'} ${label}`)
  if (!ok) failures += 1
}

// ---- 1. load + exports ----
const m = await import('../src/index.js')
check('exports name', m.name === 'desktop-shortcut')
check('exports apply', typeof m.apply === 'function')

// ---- 2. apply with temp config ----
const ctx = fakeCtx()
apply(ctx, {
  dshDir: tmp,
  launcherPath,
  desktopPath,
  desktopName: 'DSH Web',
  port: TEST_PORT,
  autoInstall: true,
})
check('registered ready fallback handler', ctx.ready.length >= 1)

// ---- 3. fire ready handlers (auto-install + command registration) ----
for (const fn of ctx.ready) await fn()
check('command registered after ready', ctx.registered()?.name === 'shortcut')
check('auto-install wrote launcher', existsSync(launcherPath))
check('auto-install created .lnk', existsSync(desktopPath))

// ---- 4. launcher content: port guard + browser open + executable pnpm ----
const launcher = readFileSync(launcherPath, 'utf8')
check('launcher has duplicate-run guard', /Get-NetTCPConnection/.test(launcher) && new RegExp(String(TEST_PORT)).test(launcher))
check('launcher auto-opens browser', /Start-Process/.test(launcher) && new RegExp(`127\\.0\\.0\\.1:${TEST_PORT}`).test(launcher))
// cmd.exe cannot execute bare .mjs/.js — must use a .cmd/.exe shim or `node <script>`.
// And a .cmd shim must be invoked with `call`, otherwise the outer batch exits early.
const launchLine = launcher.split(/\r?\n/).find((l) => / dsh web/.test(l))
check('launcher pnpm is executable (no bare .mjs)', Boolean(launchLine) && !/\.mjs" dsh web/.test(launchLine))
check('launcher uses call before the .cmd shim', Boolean(launchLine) && /^call /.test(launchLine.trim()))

// ---- 5. .lnk fields must be single-backslash paths (JSON.stringify bug guard) ----
{
  const r = spawnSync('powershell.exe', ['-NoProfile', '-Command',
    `$ws=New-Object -ComObject WScript.Shell; $l=$ws.CreateShortcut(${JSON.stringify(desktopPath)}); Write-Output $l.TargetPath; Write-Output $l.WorkingDirectory`],
    { encoding: 'utf8' })
  const [tp, wd] = (r.stdout || '').trim().split(/\r?\n/)
  check('shortcut TargetPath correct', tp === launcherPath)
  check('shortcut WorkingDirectory single-backslash', wd === path.dirname(launcherPath) && !wd.includes('\\\\'))
}

// ---- 6. status (server not running on the test port) ----
let res = await runHandler(ctx.registered(), 'status')
check('status returns success', res.kind === 'success')
check('status shows shortcut exists', /exists/.test(res.text))
check('status reports server not running', /not running/.test(res.text))

// ---- 7. install again (idempotent refresh) ----
res = await runHandler(ctx.registered(), 'install')
check('re-install returns success', res.kind === 'success')

// ---- 8. remove ----
res = await runHandler(ctx.registered(), 'remove')
check('remove returns success', res.kind === 'success')
check('launcher removed', !existsSync(launcherPath))
check('shortcut removed', !existsSync(desktopPath))

// ---- 9. unknown subcommand ----
res = await runHandler(ctx.registered(), 'explode')
check('unknown subcommand -> error', res.kind === 'error')

rmSync(tmp, { recursive: true, force: true })
console.log(failures === 0 ? '\n🎉 all smoke checks passed' : `\n💥 ${failures} check(s) failed`)
process.exit(failures === 0 ? 0 : 1)
