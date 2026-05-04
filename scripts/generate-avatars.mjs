/**
 * Generate AI profile pictures for all celebrity agents using fal.ai
 * Run: node scripts/generate-avatars.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AVATARS_DIR = path.join(__dirname, "..", "public", "avatars");

const FAL_API_KEY = process.env.FAL_API_KEY;
if (!FAL_API_KEY) {
  console.error("FAL_API_KEY not set. Run: set FAL_API_KEY=...");
  process.exit(1);
}

// All agents with their visual descriptions for avatar generation
const AGENTS = [
  {
    name: "warren-buffett",
    prompt: "Portrait of Warren Buffett as a stylized cartoon character, elderly man with glasses, wise smile, suit and tie, warm golden background, digital art style, trading theme, high quality avatar",
  },
  {
    name: "elon-musk",
    prompt: "Portrait of Elon Musk as a stylized cartoon character, confident smirk, futuristic space background with rockets, digital art style, tech CEO vibes, high quality avatar",
  },
  {
    name: "albert-einstein",
    prompt: "Portrait of Albert Einstein as a stylized cartoon character, wild white hair, thoughtful expression, chalkboard with equations background, digital art style, genius vibes, high quality avatar",
  },
  {
    name: "kratos",
    prompt: "Portrait of Kratos from God of War as a stylized character, red war paint, bald head, fierce expression, dark fiery background, digital art style, warrior vibes, high quality avatar",
  },
  {
    name: "the-rock",
    prompt: "Portrait of Dwayne The Rock Johnson as a stylized cartoon character, muscular, raised eyebrow, confident smile, gym/arena background, digital art style, tough guy vibes, high quality avatar",
  },
  {
    name: "naruto",
    prompt: "Portrait of Naruto Uzumaki anime character, blonde spiky hair, orange outfit, headband with leaf symbol, determined expression, digital art style, anime style avatar, high quality",
  },
  {
    name: "tony-stark",
    prompt: "Portrait of Tony Stark / Iron Man as a stylized cartoon character, goatee, confident smirk, arc reactor glowing on chest, tech lab background, digital art style, genius billionaire vibes, high quality avatar",
  },
  {
    name: "gordon-gekko",
    prompt: "Portrait of Gordon Gekko (Wall Street movie character) as a stylized cartoon, slicked back hair, expensive suit, cold calculating eyes, Wall Street skyscrapers background, digital art style, high quality avatar",
  },
  {
    name: "hermione-granger",
    prompt: "Portrait of Hermione Granger as a stylized cartoon character, bushy brown hair, determined expression, holding a wand, Hogwarts library background, digital art style, magical vibes, high quality avatar",
  },
  {
    name: "thanos",
    prompt: "Portrait of Thanos as a stylized cartoon character, purple skin, golden armor, infinity gauntlet glowing, space background, digital art style, powerful titan vibes, high quality avatar",
  },
  {
    name: "michael-scott",
    prompt: "Portrait of Michael Scott (The Office) as a stylized cartoon character, messy brown hair, silly confident grin, wearing a suit with World's Best Boss mug, office background, digital art style, high quality avatar",
  },
  {
    name: "sherlock-holmes",
    prompt: "Portrait of Sherlock Holmes as a stylized cartoon character, deerstalker hat, magnifying glass, sharp analytical eyes, Victorian London foggy background, digital art style, detective vibes, high quality avatar",
  },
  {
    name: "mark-zuckerberg",
    prompt: "Portrait of Mark Zuckerberg as a stylized cartoon character, simple grey t-shirt, neutral expression, data streams and social media icons background, digital art style, tech CEO vibes, high quality avatar",
  },
  {
    name: "goku",
    prompt: "Portrait of Goku from Dragon Ball Z anime character, Super Saiyan golden spiky hair, determined expression, energy aura glowing, digital art style, anime style avatar, high quality",
  },
  {
    name: "brock-lesnar",
    prompt: "Portrait of Brock Lesnar as a stylized cartoon character, intimidating muscular man, buzz cut, fierce expression, wrestling arena background, digital art style, beast vibes, high quality avatar",
  },
  {
    name: "tim-cook",
    prompt: "Portrait of Tim Cook as a stylized cartoon character, silver hair, glasses, calm composed expression, minimalist Apple-style background, digital art style, tech executive vibes, high quality avatar",
  },
  {
    name: "mr-beast",
    prompt: "Portrait of MrBeast (Jimmy Donaldson) as a stylized cartoon character, excited expression, casual hoodie, YouTube play button and money raining background, digital art style, content creator vibes, high quality avatar",
  },
  {
    name: "taylor-swift",
    prompt: "Portrait of Taylor Swift as a stylized cartoon character, blonde hair, sparkly outfit, microphone, concert stage background with glitter, digital art style, pop star vibes, high quality avatar",
  },
  {
    name: "kanye-west",
    prompt: "Portrait of Kanye West as a stylized cartoon character, confident expression, designer outfit, abstract artistic background, digital art style, visionary artist vibes, high quality avatar",
  },
  {
    name: "jeff-bezos",
    prompt: "Portrait of Jeff Bezos as a stylized cartoon character, bald head, laughing expression, rocket and delivery boxes background, digital art style, billionaire empire builder vibes, high quality avatar",
  },
  {
    name: "snoop-dogg",
    prompt: "Portrait of Snoop Dogg as a stylized cartoon character, braids, sunglasses, gold chain, laid back expression, smoke and purple background, digital art style, hip hop vibes, high quality avatar",
  },
  {
    name: "oprah-winfrey",
    prompt: "Portrait of Oprah Winfrey as a stylized cartoon character, warm welcoming smile, elegant outfit, sparkling golden background, digital art style, inspiring leader vibes, high quality avatar",
  },
  {
    name: "deadpool",
    prompt: "Portrait of Deadpool as a stylized cartoon character, red and black mask, eyes squinting with humor, crossed arms, breaking the fourth wall, comic book style background, digital art style, high quality avatar",
  },
  {
    name: "bill-gates",
    prompt: "Portrait of Bill Gates as a stylized cartoon character, glasses, thoughtful smile, simple sweater, books and computer background, digital art style, tech philanthropist vibes, high quality avatar",
  },
  {
    name: "cristiano-ronaldo",
    prompt: "Portrait of Cristiano Ronaldo as a stylized cartoon character, athletic build, confident celebration pose, soccer field background, digital art style, champion athlete vibes, high quality avatar",
  },
  {
    name: "rihanna",
    prompt: "Portrait of Rihanna as a stylized cartoon character, bold fashion outfit, confident expression, diamonds and luxury background, digital art style, music icon and mogul vibes, high quality avatar",
  },
  {
    name: "the-joker",
    prompt: "Portrait of The Joker (Batman villain) as a stylized cartoon character, green hair, white face paint, red smile, chaotic expression, dark Gotham background, digital art style, villain vibes, high quality avatar",
  },
  {
    name: "lionel-messi",
    prompt: "Portrait of Lionel Messi as a stylized cartoon character, short dark hair, calm humble expression, soccer jersey, stadium background, digital art style, GOAT vibes, high quality avatar",
  },
  {
    name: "captain-jack-sparrow",
    prompt: "Portrait of Captain Jack Sparrow as a stylized cartoon character, dreadlocks, bandana, pirate hat, kohl-lined eyes, sea and ship background, digital art style, pirate adventure vibes, high quality avatar",
  },
];

// Check which avatars already exist
function getExistingAvatars() {
  if (!fs.existsSync(AVATARS_DIR)) {
    fs.mkdirSync(AVATARS_DIR, { recursive: true });
    return new Set();
  }
  return new Set(fs.readdirSync(AVATARS_DIR));
}

async function generateAvatar(agent) {
  const filename = `${agent.name}.png`;
  const filepath = path.join(AVATARS_DIR, filename);

  console.log(`Generating: ${agent.name}...`);

  try {
    // Use fal.ai flux/schnell via synchronous endpoint (fal.run, not queue.fal.run)
    const response = await fetch("https://fal.run/fal-ai/flux/schnell", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${FAL_API_KEY}`,
      },
      body: JSON.stringify({
        prompt: agent.prompt,
        image_size: "square",
        num_inference_steps: 4,
        num_images: 1,
        enable_safety_checker: false,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`  Failed for ${agent.name}: ${response.status} ${errText}`);
      return false;
    }

    const result = await response.json();
    const imageUrl = result.images?.[0]?.url;
    if (!imageUrl) {
      console.error(`  No image URL for ${agent.name}`, JSON.stringify(result).slice(0, 200));
      return false;
    }

    // Download image
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) {
      console.error(`  Failed to download image for ${agent.name}: ${imgRes.status}`);
      return false;
    }
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    fs.writeFileSync(filepath, buffer);
    console.log(`  Saved: ${filename} (${(buffer.length / 1024).toFixed(1)} KB)`);
    return true;
  } catch (err) {
    console.error(`  Error generating ${agent.name}:`, err.message);
    return false;
  }
}

async function main() {
  const existing = getExistingAvatars();
  const missing = AGENTS.filter((a) => !existing.has(`${a.name}.png`));

  console.log(`Total agents: ${AGENTS.length}`);
  console.log(`Already generated: ${existing.size}`);
  console.log(`To generate: ${missing.length}`);
  console.log("");

  if (missing.length === 0) {
    console.log("All avatars already exist!");
    return;
  }

  let success = 0;
  let failed = 0;

  // Generate 3 at a time to avoid rate limits
  for (let i = 0; i < missing.length; i += 3) {
    const batch = missing.slice(i, i + 3);
    const results = await Promise.all(batch.map(generateAvatar));
    success += results.filter(Boolean).length;
    failed += results.filter((r) => !r).length;

    if (i + 3 < missing.length) {
      console.log(`  Batch done, waiting 2s...`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  console.log("");
  console.log(`Done! Generated: ${success}, Failed: ${failed}`);
}

main().catch(console.error);
