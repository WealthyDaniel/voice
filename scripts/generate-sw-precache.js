import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DIST_DIR = path.resolve(__dirname, '../dist')
const SW_FILE = path.join(DIST_DIR, 'sw.js')

function getFilesRecursively(dir) {
  let results = []
  const list = fs.readdirSync(dir)
  list.forEach((file) => {
    const fullPath = path.join(dir, file)
    const stat = fs.statSync(fullPath)
    if (stat && stat.isDirectory()) {
      results = results.concat(getFilesRecursively(fullPath))
    } else {
      results.push(fullPath)
    }
  })
  return results
}

if (!fs.existsSync(DIST_DIR)) {
  console.error('Dist directory does not exist. Run build first.')
  process.exit(1)
}

const allFiles = getFilesRecursively(DIST_DIR)

// Filter out sw.js itself, source maps, and any other files we don't want to precache
const precacheFiles = allFiles
  .map((file) => {
    // Make path relative to DIST_DIR and format with forward slashes
    let relativePath = path.relative(DIST_DIR, file).replace(/\\/g, '/')
    return '/' + relativePath
  })
  .filter((route) => {
    // Do not cache sw.js, map files, or other assets that aren't loaded in the PWA app shell
    return (
      !route.endsWith('/sw.js') &&
      !route.endsWith('.map') &&
      route !== '/'
    )
  })

// Add the root path to ensure the base URL is precached
precacheFiles.unshift('/')

console.log('Precache assets identified:', precacheFiles)

if (fs.existsSync(SW_FILE)) {
  let swContent = fs.readFileSync(SW_FILE, 'utf8')
  
  // Replace the PRECACHE_ASSETS definition
  const replacement = `const PRECACHE_ASSETS = ${JSON.stringify(precacheFiles, null, 2)}`
  
  // Regex to find: const PRECACHE_ASSETS = [ ... ] across multiple lines
  const regex = /const\s+PRECACHE_ASSETS\s*=\s*\[[\s\S]*?\]/
  
  if (regex.test(swContent)) {
    swContent = swContent.replace(regex, replacement)
    fs.writeFileSync(SW_FILE, swContent, 'utf8')
    console.log('Successfully injected precache assets into dist/sw.js')
  } else {
    console.error('Failed to locate PRECACHE_ASSETS array in sw.js')
    process.exit(1)
  }
} else {
  console.error('sw.js not found in dist')
  process.exit(1)
}
