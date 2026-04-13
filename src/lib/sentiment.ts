import OpenAI from "openai";
import type { TokenInfo, MarketData, SentimentData } from "./types";

const groq = new OpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY || "",
});

export async function analyzeSentiment(
  token: TokenInfo,
  marketData: MarketData
): Promise<SentimentData> {
  try {
    const prompt = `Analyze the current market sentiment for ${token.name} (${token.symbol}) on ${token.chain}.

Current Market Data:
- Price: $${marketData.price}
- 5m Change: ${marketData.priceChange5m}%
- 1h Change: ${marketData.priceChange1h}%
- 6h Change: ${marketData.priceChange6h}%
- 24h Change: ${marketData.priceChange24h}%
- 24h Volume: $${marketData.volume24h.toLocaleString()}
- Liquidity: $${marketData.liquidity.toLocaleString()}
- Market Cap: $${marketData.marketCap.toLocaleString()}

Respond ONLY with a JSON object in this exact format (no markdown, no explanation):
{
  "sentimentScore": <number between -1.0 and 1.0>,
  "buzzLevel": <integer between 0 and 10>,
  "keyThemes": [<string>, <string>, <string>],
  "summary": "<one paragraph summary of market sentiment>"
}`;

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      max_tokens: 500,
      messages: [
        {
          role: "system",
          content:
            "You are a crypto market sentiment analyst. You respond only with valid JSON.",
        },
        { role: "user", content: prompt },
      ],
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      throw new Error("Empty response from AI");
    }

    // Try to parse JSON response - handle potential markdown code blocks
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr);

    return {
      token: token.symbol,
      sentimentScore: Math.max(
        -1,
        Math.min(1, Number(parsed.sentimentScore) || 0)
      ),
      buzzLevel: Math.max(
        0,
        Math.min(10, Math.round(Number(parsed.buzzLevel) || 5))
      ),
      keyThemes: Array.isArray(parsed.keyThemes)
        ? parsed.keyThemes.map(String).slice(0, 5)
        : ["neutral"],
      summary: String(parsed.summary || "Unable to analyze sentiment."),
    };
  } catch (error) {
    console.error(`Sentiment analysis failed for ${token.symbol}:`, error);
    // Fallback to neutral on error
    return {
      token: token.symbol,
      sentimentScore: 0,
      buzzLevel: 5,
      keyThemes: ["neutral"],
      summary: "Unable to analyze sentiment at this time.",
    };
  }
}
