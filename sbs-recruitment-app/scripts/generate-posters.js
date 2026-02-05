/**
 * Generate poster images from video first frames
 * Runs as part of the build process
 * Requires: ffmpeg installed and in PATH
 *
 * Automatically generates a poster for ALL .mp4 files in public/videos/
 */

import { execSync } from 'child_process'
import { existsSync, readdirSync, statSync } from 'fs'
import { join, basename, extname } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const VIDEOS_DIR = join(__dirname, '../public/videos')
const IMAGES_DIR = join(__dirname, '../public/images')
const QUALITY = 95 // WebP quality 0-100 (higher = better quality, larger file)

function checkFFmpeg() {
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' })
    return true
  } catch {
    console.warn('⚠️  FFmpeg not found. Skipping poster generation.')
    console.warn('   Install FFmpeg to enable automatic poster generation.')
    return false
  }
}

function getVideoFiles() {
  if (!existsSync(VIDEOS_DIR)) {
    console.warn(`⚠️  Videos directory not found: ${VIDEOS_DIR}`)
    return []
  }

  return readdirSync(VIDEOS_DIR)
    .filter(file => extname(file).toLowerCase() === '.mp4')
    .filter(file => file.includes('_8bit')) // Only generate posters for _8bit videos (the ones we actually use)
}

function getPosterName(videoFile) {
  // video.mp4 -> video-poster.webp
  const name = basename(videoFile, extname(videoFile))
  return `${name}-poster.webp`
}

function generatePoster(videoFile) {
  const videoPath = join(VIDEOS_DIR, videoFile)
  const posterFile = getPosterName(videoFile)
  const posterPath = join(IMAGES_DIR, posterFile)

  // Check if poster already exists and is newer than video
  if (existsSync(posterPath)) {
    const videoStat = statSync(videoPath)
    const posterStat = statSync(posterPath)

    if (posterStat.mtime > videoStat.mtime) {
      console.log(`✓ Poster up to date: ${posterFile}`)
      return true
    }
  }

  try {
    console.log(`📸 Generating poster: ${posterFile}`)

    // Simple, compatible WebP extraction
    // Let FFmpeg auto-detect best settings from source video
    execSync(
      `ffmpeg -i "${videoPath}" -vframes 1 -c:v libwebp -quality ${QUALITY} "${posterPath}" -y`,
      { stdio: 'ignore' }
    )

    console.log(`✓ Created: ${posterFile}`)
    return true
  } catch (error) {
    console.error(`✗ Failed to generate poster for ${videoFile}:`, error.message)
    return false
  }
}

function main() {
  console.log('\n🎬 Generating video posters...\n')

  if (!checkFFmpeg()) {
    return
  }

  const videos = getVideoFiles()

  if (videos.length === 0) {
    console.log('No video files found.')
    return
  }

  console.log(`Found ${videos.length} video(s)\n`)

  let success = 0
  let failed = 0

  for (const video of videos) {
    if (generatePoster(video)) {
      success++
    } else {
      failed++
    }
  }

  console.log(`\n✅ Poster generation complete: ${success} success, ${failed} failed\n`)
}

main()
