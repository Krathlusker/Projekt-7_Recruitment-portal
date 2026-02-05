/**
 * Convert 10-bit videos to 8-bit for browser compatibility
 * Uses NVIDIA NVENC (RTX 3070) for fast hardware encoding
 *
 * Problem: Videos are encoded with yuv420p10le (10-bit) which Firefox doesn't support
 * Solution: Convert to yuv420p (8-bit) with high quality settings
 */

import { execSync } from "child_process";
import { existsSync, readdirSync } from "fs";
import { dirname, join, basename, extname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const BITRATE = "4000k";           // Video bitrate (user requested 4000)
const MAX_BITRATE_THRESHOLD = 4200; // Convert if bitrate is above this (kbps)
const PRESET = "p7";               // NVENC preset: p1 (fastest) to p7 (highest quality)
const RC_MODE = "vbr";             // Variable bitrate for better quality
const MAX_BITRATE = "6000k";       // Max bitrate for VBR spikes
const BUFFER_SIZE = "8000k";       // Buffer size for rate control

// Videos directory - will find all .mp4 files automatically
const VIDEOS_DIR = join(__dirname, "..", "public", "videos");

// Get all mp4 files in the videos directory (excluding already converted _8bit files)
function getVideoFiles() {
  const files = readdirSync(VIDEOS_DIR);
  return files.filter(file =>
    file.endsWith(".mp4") &&
    !file.includes("_8bit")
  );
}

function getVideoInfo(videoPath) {
  try {
    const result = execSync(
      `ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,pix_fmt,width,height,bit_rate,r_frame_rate -of json "${videoPath}"`,
      { encoding: "utf8" }
    );
    const data = JSON.parse(result);
    const stream = data.streams[0];

    // Parse frame rate (format: "60000/1001" or "30/1")
    if (stream.r_frame_rate) {
      const [num, den] = stream.r_frame_rate.split('/').map(Number);
      stream.fps = den ? num / den : num;
    }

    return stream;
  } catch (error) {
    console.error(`Kunne ikke læse video info: ${error.message}`);
    return null;
  }
}

// Determine target fps based on source fps
function getTargetFps(sourceFps) {
  if (!sourceFps) return null; // passthrough

  // 58-62 fps → 30 fps (halve high frame rate)
  if (sourceFps >= 58 && sourceFps <= 62) {
    return 30;
  }

  // 29-31 fps → 30 fps (normalize to exactly 30)
  if (sourceFps >= 29 && sourceFps <= 31) {
    return 30;
  }

  // All other fps → keep original
  return null;
}

// Check if video needs conversion (10-bit OR high bitrate)
function needsConversion(info) {
  if (!info) return { needs: false, reason: null };

  // 10-bit formats that need conversion
  const tenBitFormats = ["yuv420p10le", "yuv420p10be", "yuv422p10le", "yuv444p10le"];
  if (tenBitFormats.includes(info.pix_fmt)) {
    return { needs: true, reason: "10-bit" };
  }

  // Check bitrate (convert to kbps)
  const bitrateKbps = info.bit_rate ? Math.round(parseInt(info.bit_rate) / 1000) : 0;
  if (bitrateKbps > MAX_BITRATE_THRESHOLD) {
    return { needs: true, reason: "høj bitrate", bitrate: bitrateKbps };
  }

  return { needs: false, bitrate: bitrateKbps };
}

function checkFFmpeg() {
  try {
    execSync("ffmpeg -version", { stdio: "pipe" });
    return true;
  } catch {
    console.error("❌ FFmpeg ikke fundet! Installer FFmpeg først.");
    return false;
  }
}

function checkNVENC() {
  try {
    // Check if NVENC is available
    const result = execSync("ffmpeg -encoders 2>&1", { encoding: "utf8" });
    if (result.includes("h264_nvenc")) {
      console.log("✅ NVIDIA NVENC encoder fundet!");
      return true;
    }
  } catch {
    // Ignore errors
  }
  console.error("❌ NVENC ikke tilgængelig. Bruger software encoding (langsommere).");
  return false;
}

function convertVideo(inputPath, useNVENC) {
  const filename = basename(inputPath);
  const ext = extname(inputPath);
  const nameWithoutExt = basename(inputPath, ext);
  const outputPath = join(dirname(inputPath), `${nameWithoutExt}_8bit${ext}`);

  console.log(`\n🎬 Konverterer: ${filename}`);

  // Get original video info
  const info = getVideoInfo(inputPath);
  if (info) {
    const fpsStr = info.fps ? ` @ ${info.fps.toFixed(2)} fps` : "";
    console.log(`   Original: ${info.pix_fmt} (${info.width}x${info.height}${fpsStr})`);
  }

  // Determine fps settings
  const targetFps = getTargetFps(info?.fps);
  const fpsOption = targetFps ? `-r ${targetFps}` : "-fps_mode passthrough";

  if (targetFps) {
    console.log(`   FPS: ${info.fps.toFixed(2)} → ${targetFps}`);
  }

  // Build FFmpeg command
  let cmd;
  if (useNVENC) {
    // NVIDIA NVENC hardware encoding (fast!)
    cmd = `ffmpeg -hwaccel cuda -i "${inputPath}" \
      -c:v h264_nvenc \
      -preset ${PRESET} \
      -rc ${RC_MODE} \
      -b:v ${BITRATE} \
      -maxrate ${MAX_BITRATE} \
      -bufsize ${BUFFER_SIZE} \
      -pix_fmt yuv420p \
      -profile:v high \
      ${fpsOption} \
      -c:a aac -b:a 128k \
      -movflags +faststart \
      "${outputPath}" -y`;
  } else {
    // Software encoding (slower but always works)
    cmd = `ffmpeg -i "${inputPath}" \
      -c:v libx264 \
      -preset slow \
      -crf 18 \
      -b:v ${BITRATE} \
      -maxrate ${MAX_BITRATE} \
      -bufsize ${BUFFER_SIZE} \
      -pix_fmt yuv420p \
      -profile:v high \
      ${fpsOption} \
      -c:a aac -b:a 128k \
      -movflags +faststart \
      "${outputPath}" -y`;
  }

  try {
    const startTime = Date.now();
    execSync(cmd.replace(/\s+/g, " "), { stdio: "inherit" });
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    // Verify the output
    const newInfo = getVideoInfo(outputPath);
    if (newInfo && newInfo.pix_fmt === "yuv420p") {
      console.log(`   ✅ Konverteret til: ${newInfo.pix_fmt} (${duration}s)`);
      return outputPath;
    } else {
      console.error(`   ❌ Konvertering fejlede - forkert pixel format`);
      return null;
    }
  } catch (error) {
    console.error(`   ❌ Fejl: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log("═".repeat(60));
  console.log("🎥 Video Konvertering & Komprimering");
  console.log("═".repeat(60));
  console.log(`📊 Indstillinger: ${BITRATE} bitrate, ${PRESET} preset`);
  console.log(`📊 Konverterer hvis: 10-bit ELLER bitrate > ${MAX_BITRATE_THRESHOLD} kbps`);
  console.log(`📁 Mappe: ${VIDEOS_DIR}`);

  if (!checkFFmpeg()) {
    process.exit(1);
  }

  const useNVENC = checkNVENC();
  if (useNVENC) {
    console.log("🚀 Bruger RTX 3070 GPU acceleration!");
  }

  // Find all video files automatically
  const allVideos = getVideoFiles();
  console.log(`\n📹 Scanner ${allVideos.length} video(er)...`);

  if (allVideos.length === 0) {
    console.log("\n⚠️  Ingen videoer fundet");
    return;
  }

  let success = 0;
  let failed = 0;
  let skipped = 0;

  for (const video of allVideos) {
    const videoPath = join(VIDEOS_DIR, video);
    const ext = extname(video);
    const nameWithoutExt = basename(video, ext);
    const outputPath = join(VIDEOS_DIR, `${nameWithoutExt}_8bit${ext}`);

    // Get video info
    const info = getVideoInfo(videoPath);
    if (!info) {
      console.log(`\n⚠️  Kan ikke læse: ${video}`);
      failed++;
      continue;
    }

    // Check if needs conversion (10-bit or high bitrate)
    const check = needsConversion(info);

    if (!check.needs) {
      const bitrateStr = check.bitrate ? ` @ ${check.bitrate} kbps` : "";
      console.log(`\n✅ OK (${info.pix_fmt}${bitrateStr}): ${video}`);
      skipped++;
      continue;
    }

    // Skip if output already exists
    if (existsSync(outputPath)) {
      console.log(`\n⏭️  Output findes allerede: ${nameWithoutExt}_8bit${ext}`);
      skipped++;
      continue;
    }

    // Log why we're converting
    if (check.reason === "10-bit") {
      console.log(`\n🔴 10-bit fundet (${info.pix_fmt}): ${video}`);
    } else {
      console.log(`\n🔵 Høj bitrate (${check.bitrate} kbps > ${MAX_BITRATE_THRESHOLD}): ${video}`);
    }

    const convertedPath = convertVideo(videoPath, useNVENC);

    if (convertedPath) {
      success++;
    } else {
      failed++;
    }
  }

  console.log("\n" + "═".repeat(60));
  console.log(`🏁 Færdig! ${success} konverteret, ${skipped} sprunget over, ${failed} fejlet`);

  if (success > 0) {
    console.log("\n📝 Næste trin:");
    console.log("   1. Opdater video-stier i koden til at bruge _8bit filerne");
    console.log("   2. Kør: node scripts/generate-posters.js");
    console.log("   3. Kør: npm run build");
    console.log("   4. Test i Firefox!");
  }
}

main();
