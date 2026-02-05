import type { Message } from "@anthropic-ai/sdk/resources/messages";
import { z } from "zod";

const LOG_LABEL = "[AI-RESPONSE]";

/**
 * Safely get plain text from an Anthropic message content array.
 * Returns empty string if content is missing or not text.
 */
export function getTextFromAnthropicContent(
  content: Message["content"] | undefined
): string {
  if (!content || !Array.isArray(content) || content.length === 0) {
    return "";
  }
  const first = content[0];
  if (first?.type === "text" && "text" in first) {
    return first.text ?? "";
  }
  return "";
}

/**
 * Strip markdown code fences (```json ... ``` or ``` ... ```) from AI output
 * and trim. Tries to extract JSON object by finding matching braces if needed.
 */
export function stripJsonMarkdown(raw: string): string {
  let s = raw.trim();
  const jsonBlock = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonBlock) {
    s = jsonBlock[1].trim();
  } else if (s.includes("```")) {
    s = s.replace(/```(?:json)?\s*/, "").replace(/\s*```.*$/s, "").trim();
  }
  const start = s.indexOf("{");
  if (start === -1) return s;
  let depth = 0;
  let inString = false;
  let quote: string | null = null;
  let i = start;
  while (i < s.length) {
    const c = s[i];
    if (inString) {
      if (c === "\\" && i + 1 < s.length) {
        i += 2;
        continue;
      }
      if (c === quote) inString = false;
      i++;
      continue;
    }
    if (c === '"' || c === "'") {
      inString = true;
      quote = c;
      i++;
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
    i++;
  }
  return s.slice(start);
}

export interface ParseAndValidateOptions {
  /** Label for logs when validation fails */
  context?: string;
  /** If set, on validation failure return this instead of throwing */
  fallback?: unknown;
}

/**
 * Parse raw AI text as JSON (with markdown stripping) and validate with Zod.
 * On success returns the parsed value. On failure: if options.fallback is set,
 * returns fallback; otherwise throws with a clear message and logs.
 */
export function parseAndValidateAiJson<T>(
  rawText: string,
  schema: z.ZodType<T>,
  options: ParseAndValidateOptions = {}
): T {
  const { context = "AI response", fallback } = options;
  let json: unknown;
  try {
    const cleaned = stripJsonMarkdown(rawText);
    if (!cleaned.trim()) {
      throw new Error("Empty content after stripping markdown");
    }
    // Single parse point for AI JSON; always validated with Zod below (eliminates crashes from malformed output)
    json = JSON.parse(cleaned);
  } catch (parseError) {
    const msg = parseError instanceof Error ? parseError.message : String(parseError);
    console.error(`${LOG_LABEL} JSON parse failed (${context}):`, msg);
    if (fallback !== undefined) return fallback as T;
    throw new Error(`AI returned invalid JSON (${context}): ${msg}`);
  }
  const result = schema.safeParse(json);
  if (result.success) {
    return result.data;
  }
  const issues = result.error.flatten();
  console.error(`${LOG_LABEL} Zod validation failed (${context}):`, JSON.stringify(issues, null, 2));
  if (fallback !== undefined) return fallback as T;
  throw new Error(
    `AI response did not match expected shape (${context}): ${result.error.message}`
  );
}

/**
 * Validate that AI returned a non-empty string (e.g. for markdown or plain text).
 * Returns trimmed string or throws / fallback.
 */
export function validateAiText(
  raw: string,
  options: { context?: string; fallback?: string; minLength?: number } = {}
): string {
  const { context = "AI response", fallback, minLength = 0 } = options;
  const s = raw.trim();
  if (s.length <= minLength) {
    if (fallback !== undefined) return fallback;
    throw new Error(`AI returned empty or too short text (${context})`);
  }
  return s;
}
