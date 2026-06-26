import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.join(__dirname, '../public')
const sourcePng = path.join(__dirname, '../../MTXfoil.png')

await mkdir(publicDir, { recursive: true })

const height = 144 // 2x for h-9 (36px) nav logo

async function writeLogo(name, pipeline) {
  const out = path.join(publicDir, name)
  await pipeline.png({ compressionLevel: 9, palette: true }).toFile(out)
  const { size } = await import('node:fs/promises').then((fs) => fs.stat(out))
  console.log(`${name}: ${(size / 1024).toFixed(1)} KB`)
}

const base = sharp(sourcePng).resize({ height, fit: 'inside' })

// Dark backgrounds: full-color logo
await writeLogo('mtxfoil-logo-dark.png', base.clone())

// Light backgrounds: slightly darkened for contrast on white
await writeLogo(
  'mtxfoil-logo-light.png',
  base.clone().modulate({ brightness: 0.75, saturation: 1.1 }),
)

// WebP variants (smaller)
for (const [name, pipe] of [
  ['mtxfoil-logo-dark.webp', base.clone()],
  ['mtxfoil-logo-light.webp', base.clone().modulate({ brightness: 0.75, saturation: 1.1 })],
]) {
  const out = path.join(publicDir, name)
  await pipe.webp({ quality: 85, alphaQuality: 90 }).toFile(out)
  const { size } = await import('node:fs/promises').then((fs) => fs.stat(out))
  console.log(`${name}: ${(size / 1024).toFixed(1)} KB`)
}
