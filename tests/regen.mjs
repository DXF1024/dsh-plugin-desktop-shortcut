/**
 * Regenerate the real launcher + desktop shortcut with the fixed plugin code.
 * Usage: node tests/regen.mjs
 * (Mirrors what the plugin's auto-install does at dsh web startup.)
 */
import { apply } from '../src/index.js'

const fakeCtx = { on() {}, logger: console }
apply(fakeCtx, {
  dshDir: 'C:\\AAADXF\\DSH\\deepseek-harness-master',
  launcherPath: 'C:\\AAADXF\\DSH\\start-dsh-web.cmd',
  port: 3080,
  desktopName: 'DSH Web',
  autoInstall: true,
  openBrowser: true,
  preventDuplicate: true,
  browserDelaySec: 60,
})
console.log('regen done')
