/**
 * Generate AI caricature avatars for celebrity agents using FAL.AI
 * Run: npx tsx scripts/generate-avatars.ts
 */
import { fal } from "@fal-ai/client";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import * as http from "http";

fal.config({
  credentials: process.env.FAL_API_KEY || "f48c6e0b-c057-4d3b-9b39-1897c97a8ac8:4ede16eeb3c2e65a7300e71b2c146461",
});

interface AgentPrompt {
  name: string;
  filename: string;
  prompt: string;
}

const agents: AgentPrompt[] = [
  {
    name: "Warren Buffett",
    filename: "warren-buffett.png",
    prompt:
      "Cartoon caricature portrait of Warren Buffett as a wise old trading guru, exaggerated large round glasses, kind smile, holding gold coins, wearing a classic suit with tie, warm golden background with stock chart patterns, digital art style, vibrant colors, chibi proportions, fun and friendly, circular portrait composition, clean background",
  },
  {
    name: "Elon Musk",
    filename: "elon-musk.png",
    prompt:
      "Cartoon caricature portrait of Elon Musk as a futuristic tech visionary, exaggerated sharp features, smirking confidently, wearing a sleek dark jacket, holding a glowing rocket, electric blue and purple neon background with circuit patterns, digital art style, vibrant colors, chibi proportions, fun and edgy, circular portrait composition, clean background",
  },
  {
    name: "Albert Einstein",
    filename: "albert-einstein.png",
    prompt:
      "Cartoon caricature portrait of Albert Einstein as a mad scientist trader, wild white hair sticking up dramatically, big expressive eyes, tongue sticking out playfully, wearing lab coat with formula E=mc2 on chalkboard behind him, green and teal glowing background, digital art style, vibrant colors, chibi proportions, fun and quirky, circular portrait composition, clean background",
  },
  {
    name: "Kratos",
    filename: "kratos.png",
    prompt:
      "Cartoon caricature portrait of Kratos from God of War as an intense warrior trader, red war paint stripe on face, bald head, thick beard, muscular, holding Blades of Chaos that glow with fire, dark red and orange fiery background, digital art style, vibrant colors, chibi proportions, fierce but fun, circular portrait composition, clean background",
  },
  {
    name: "The Rock",
    filename: "the-rock.png",
    prompt:
      "Cartoon caricature portrait of Dwayne The Rock Johnson as a powerful champion trader, exaggerated massive muscles, raised eyebrow signature look, wearing a sleeveless black shirt, gold championship belt, purple and gold background with lightning bolts, digital art style, vibrant colors, chibi proportions, confident and fun, circular portrait composition, clean background",
  },
  {
    name: "Naruto",
    filename: "naruto.png",
    prompt:
      "Cartoon caricature portrait of Naruto Uzumaki as an energetic ninja trader, spiky blonde hair, whisker marks on cheeks, wearing orange ninja headband with leaf symbol, doing a fist pump pose, bright orange and yellow background with swirling chakra energy, anime-inspired digital art style, vibrant colors, chibi proportions, energetic and determined, circular portrait composition, clean background",
  },
];

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const protocol = url.startsWith("https") ? https : http;
    protocol
      .get(url, (response) => {
        // Follow redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            file.close();
            fs.unlinkSync(dest);
            downloadFile(redirectUrl, dest).then(resolve).catch(reject);
            return;
          }
        }
        response.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve();
        });
      })
      .on("error", (err) => {
        fs.unlinkSync(dest);
        reject(err);
      });
  });
}

async function generateAvatar(agent: AgentPrompt): Promise<void> {
  const outputPath = path.join(
    __dirname,
    "..",
    "public",
    "avatars",
    agent.filename
  );

  console.log(`Generating avatar for ${agent.name}...`);

  try {
    const result = await fal.subscribe("fal-ai/flux/schnell", {
      input: {
        prompt: agent.prompt,
        image_size: "square",
        num_images: 1,
        num_inference_steps: 4,
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS" && update.logs) {
          for (const log of update.logs) {
            console.log(`  [${agent.name}] ${log.message}`);
          }
        }
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = result.data as any;
    if (data?.images?.[0]?.url) {
      const imageUrl = data.images[0].url;
      console.log(`  Downloading image for ${agent.name}...`);
      await downloadFile(imageUrl, outputPath);
      console.log(`  Saved: ${outputPath}`);
    } else {
      console.error(`  No image generated for ${agent.name}`);
      console.error("  Response:", JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error(`  Failed to generate avatar for ${agent.name}:`, error);
  }
}

async function main() {
  const avatarDir = path.join(__dirname, "..", "public", "avatars");
  if (!fs.existsSync(avatarDir)) {
    fs.mkdirSync(avatarDir, { recursive: true });
  }

  console.log("Generating AI caricature avatars for celebrity agents...\n");

  // Generate sequentially to avoid rate limits
  for (const agent of agents) {
    await generateAvatar(agent);
    console.log();
  }

  console.log("Done! All avatars generated.");
}

main().catch(console.error);
