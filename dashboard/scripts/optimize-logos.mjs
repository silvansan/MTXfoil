import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.join(__dirname, '../public')
const sourcePng = path.join(__dirname, '../../MTXfoil-new.png')

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
await writeLogo('foil-logo-dark.png', base.clone())

// Light backgrounds: slightly darkened for contrast on white
await writeLogo(
  'foil-logo-light.png',
  base.clone().modulate({ brightness: 0.82, saturation: 1.05 }),
)

// WebP variants (smaller)
for (const [name, pipe] of [
  ['foil-logo-dark.webp', base.clone()],
  ['foil-logo-light.webp', base.clone().modulate({ brightness: 0.82, saturation: 1.05 })],
]) {
  const out = path.join(publicDir, name)
  await pipe.webp({ quality: 85, alphaQuality: 90 }).toFile(out)
  const { size } = await import('node:fs/promises').then((fs) => fs.stat(out))
  console.log(`${name}: ${(size / 1024).toFixed(1)} KB`)
}

// App icon / favicon (square crop from logo center)
const iconSize = 512
await sharp(sourcePng)
  .resize(iconSize, iconSize, { fit: 'contain', background: { r: 9, g: 9, b: 11, alpha: 1 } })
  .png({ compressionLevel: 9 })
  .toFile(path.join(publicDir, '../src/app/icon.png'))

console.log('icon.png: written to src/app/')
