const esbuild = require('esbuild')
const { globSync } = require('fs')
const path = require('path')

function* walk(dir) {
  const entries = require('fs').readdirSync(dir, { withFileTypes: true })
  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) {
      yield* walk(full)
    } else if (e.name.endsWith('.ts') && !e.name.endsWith('.d.ts') && !e.name.includes('.test.') && !e.name.includes('.spec.')) {
      yield full
    }
  }
}

const entryPoints = [...walk('src')]

esbuild.buildSync({
  entryPoints,
  outdir: 'dist',
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  sourcemap: false,
  logLevel: 'info',
})

console.log('esbuild done:', entryPoints.length, 'files')
