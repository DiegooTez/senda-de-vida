import sharp from 'sharp'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const input = join(root, 'public', 'Logo Asociacion Senda de Vida.jpeg')

// Trimmed version for use in the app (clean name, whitespace removed)
await sharp(input)
  .trim({ background: '#ffffff', threshold: 30 })
  .jpeg({ quality: 95 })
  .toFile(join(root, 'public', 'logo.jpeg'))

// Small square version for favicon (icon.jpeg in app dir)
await sharp(input)
  .trim({ background: '#ffffff', threshold: 30 })
  .resize(256, 256, { fit: 'contain', background: '#ffffff' })
  .jpeg({ quality: 95 })
  .toFile(join(root, 'src', 'app', 'icon.jpeg'))

console.log('✓ logo.jpeg (trimmed) → public/logo.jpeg')
console.log('✓ icon.jpeg (256×256) → src/app/icon.jpeg')
