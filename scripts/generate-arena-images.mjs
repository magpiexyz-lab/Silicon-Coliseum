/**
 * Generate arena background images for Silicon Coliseum using fal.ai
 * Run: node scripts/generate-arena-images.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "..", "public");

// Load env from .env.local
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const FAL_API_KEY = process.env.FAL_API_KEY;
if (!FAL_API_KEY) {
  console.error("FAL_API_KEY not set. Check .env.local or set FAL_API_KEY env var.");
  process.exit(1);
}

const IMAGES = [
  {
    filename: "arena-bg.png",
    prompt: "Cute cartoon minions in gladiator armor battling each other in a colorful coliseum arena, vibrant neon colors, purple and pink lighting, playful and fun atmosphere, digital art style, wide panoramic view, 16:9 aspect ratio",
    image_size: "landscape_16_9",
  },
  {
    filename: "arena-card-1.png",
    prompt: "Abstract neon battleground with glowing swords crossed, purple and cyan energy, dark background with colorful sparks, digital art, square format",
    image_size: "square",
  },
  {
    filename: "arena-card-2.png",
    prompt: "Futuristic trading floor with holographic charts and AI robots competing, neon pink and blue lights, cyberpunk style, digital art, square format",
    image_size: "square",
  },
  {
    filename: "arena-card-3.png",
    prompt: "Cartoon gladiator arena with cute robot warriors, colorful explosions and confetti, fun and playful digital art style, square format",
    image_size: "square",
  },
];

async function generateImage(image) {
  const filepath = path.join(PUBLIC_DIR, image.filename);

  console.log(`Generating: ${image.filename} (${image.image_size})...`);

  try {
    const response = await fetch("https://fal.run/fal-ai/flux/schnell", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${FAL_API_KEY}`,
      },
      body: JSON.stringify({
        prompt: image.prompt,
        image_size: image.image_size,
        num_inference_steps: 4,
        num_images: 1,
        enable_safety_checker: false,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`  Failed for ${image.filename}: ${response.status} ${errText}`);
      return false;
    }

    const result = await response.json();
    const imageUrl = result.images?.[0]?.url;
    if (!imageUrl) {
      console.error(`  No image URL for ${image.filename}`, JSON.stringify(result).slice(0, 200));
      return false;
    }

    // Download image
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) {
      console.error(`  Failed to download image for ${image.filename}: ${imgRes.status}`);
      return false;
    }
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    fs.writeFileSync(filepath, buffer);
    const sizeKB = (buffer.length / 1024).toFixed(1);
    console.log(`  Saved: ${image.filename} (${sizeKB} KB)`);

    // Warn if suspiciously small (safety filter may have blocked)
    if (buffer.length < 10000) {
      console.warn(`  WARNING: ${image.filename} is only ${sizeKB} KB - may have been blocked by safety filter`);
    }

    return true;
  } catch (err) {
    console.error(`  Error generating ${image.filename}:`, err.message);
    return false;
  }
}

async function main() {
  console.log(`Generating ${IMAGES.length} arena images...`);
  console.log("");

  let success = 0;
  let failed = 0;

  for (const image of IMAGES) {
    const result = await generateImage(image);
    if (result) {
      success++;
    } else {
      failed++;
    }
    // Small delay between requests
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log("");
  console.log(`Done! Generated: ${success}, Failed: ${failed}`);
}

main().catch(console.error);
