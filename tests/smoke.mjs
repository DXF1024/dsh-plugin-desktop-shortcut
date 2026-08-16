/**
 * Smoke test for dsh-plugin-desktop-shortcut.
 * Runs the plugin against a fake Cordis ctx and a TEMP directory, so the real
 * Desktop is never touched.
 *
 * Usage: node tests/smoke.mjs
 */
import { mkdtempSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { apply } from '../src/index.js'

const tmp = mkdtempSync(path.join(tmpdir(), 'dsh-shortcut-test-'))
const launcherPath = path.join(tmp, 'start-dsh-web.cmd')
const desktopPath = path.join(tmp, 'DSH Web.lnk')

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

function runHandler(def, rawInput) {
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
apply(ctx, { dshDir: tmp, launcherPath, desktopPath, desktopName: 'DSH Web', autoInstall: true })
check('registered 2 ready handlers', ctx.ready.length === 2)

// ---- 3. status BEFORE ready (nothing created yet) ----
// (ready handlers are captured but not yet run; nothing exists)
let res = null
// simulate a manual /shortcut status before the auto-install fires
// -> call the registered handler if available, else skip (registration happens on ready)
if (ctx.registered()) {
  res = runHandler(ctx.registered(), 'status')
  check('status (pre-ready) returns success', res.kind === 'success')
  check('status (pre-ready) mentions missing', /missing/.test(res.text))
} else {
  console.log('⚠️ command not yet registered (expected: registration runs on ready)')
}

// ---- 4. fire ready handlers (auto-install + command registration) ----
for (const fn of ctx.ready) await fn()
check('command registered after ready', ctx.registered()?.name === 'shortcut')
check('auto-install wrote launcher', existsSync(launcherPath))
check('auto-install created .lnk', existsSync(desktopPath))

// ---- 5. status after install ----
res = runHandler(ctx.registered(), 'status')
check('status returns success', res.kind === 'success')
check('status shows exists', /exists/.test(res.text))

// ---- 6. remove ----
res = runHandler(ctx.registered(), 'remove')
check('remove returns success', res.kind === 'success')
check('launcher removed', !existsSync(launcherPath))
check('shortcut removed', !existsSync(desktopPath))

// ---- 7. unknown subcommand ----
res = runHandler(ctx.registered(), 'explode')
check('unknown subcommand -> error', res.kind === 'error')

rmSync(tmp, { recursive: true, force: true })
console.log(failures === 0 ? '\n🎉 all smoke checks passed' : `\n💥 ${failures} check(s) failed`)
process.exit(failures === 0 ? 0 : 1)
