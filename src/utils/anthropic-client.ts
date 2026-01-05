import Anthropic from "@anthropic-ai/sdk";

/**
 * Shared Anthropic client instance
 * Use this instead of creating multiple instances in service files
 */
export const anthropic = new Anthropic({ 
  apiKey: process.env.ANTHROPIC_API_KEY || ""
});

