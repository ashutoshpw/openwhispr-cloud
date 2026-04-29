#!/usr/bin/env bun
/**
 * CLI script — send a prompt to the configured AI model and stream the response.
 *
 * Usage:
 *   bun run ai:query "Summarise the latest trends in DeFi"
 *   bun run ai:query "What is a smart contract?" --model gpt-4o
 *
 * Options:
 *   --model, -m   Override AI_DEFAULT_MODEL for this invocation
 *   --system, -s  Optional system prompt
 */
import { streamText } from "ai";
import { openai } from "../src/client";

const args = process.argv.slice(2);

if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
  console.log(
    'Usage: bun run ai:query "<prompt>" [--model <model>] [--system <system prompt>]',
  );
  process.exit(0);
}

function parseFlag(flag: string, short: string): string | null {
  const idx = args.findIndex((a) => a === short || a === flag);
  if (idx === -1 || !args[idx + 1]) return null;
  return args[idx + 1] ?? null;
}

const prompt = args.find((a) => !a.startsWith("-"));
if (!prompt) {
  console.error("Error: prompt is required.");
  process.exit(1);
}

const modelOverride = parseFlag("--model", "-m");
const systemPrompt = parseFlag("--system", "-s");
const modelId = modelOverride ?? process.env.AI_DEFAULT_MODEL ?? "";

console.error(`Model: ${modelId}\n`);

const { textStream } = streamText({
  model: openai.chat(modelId),
  ...(systemPrompt ? { system: systemPrompt } : {}),
  prompt,
});

for await (const chunk of textStream) {
  process.stdout.write(chunk);
}

process.stdout.write("\n");
