/**
 * Optional LLM-backed sentiment classifier. Falls back to the heuristic when
 * no OpenAI key is configured. Model from seo_settings.sentimentModel.
 */

import { heuristicSentiment } from "./parse";
import { getSecret } from "./secrets/store";
import { getSetting } from "./settings/store";

export type Sentiment = "positive" | "neutral" | "negative";

export async function classifySentiment(
  answer: string,
  targetDomain: string,
): Promise<Sentiment> {
  const apiKey = await getSecret("OPENAI_API_KEY");
  if (!apiKey) return heuristicSentiment(answer, targetDomain);

  const model = (await getSetting<string>("sentimentModel")) || "gpt-5.4-mini";
  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "system",
            content:
              "Classify the sentiment toward the brand in the user message as exactly one of: positive, neutral, negative. Reply with only that single word.",
          },
          {
            role: "user",
            content: `Brand: ${targetDomain}\n\nText:\n${answer.slice(0, 4000)}`,
          },
        ],
        max_output_tokens: 4,
      }),
    });

    if (!res.ok) throw new Error(`OpenAI sentiment HTTP ${res.status}`);
    const data = (await res.json()) as {
      output?: Array<{ content?: Array<{ text?: string }> }>;
      output_text?: string;
    };
    const text = (
      data.output_text ??
      data.output?.[0]?.content?.[0]?.text ??
      ""
    )
      .trim()
      .toLowerCase();
    if (text.startsWith("pos")) return "positive";
    if (text.startsWith("neg")) return "negative";
    if (text.startsWith("neu")) return "neutral";
    return heuristicSentiment(answer, targetDomain);
  } catch (e) {
    console.warn(
      "[aieo/sentiment] LLM classifier failed, falling back to heuristic:",
      e,
    );
    return heuristicSentiment(answer, targetDomain);
  }
}
