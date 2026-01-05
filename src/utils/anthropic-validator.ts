import { z } from "zod";
import { parseAnthropicResponse } from "./anthropic-response-parser";

/**
 * Validates Anthropic API response using Zod schema
 * For JSON responses, parses and validates the JSON
 * For text responses, validates the response structure directly
 * @param response - Anthropic API response object
 * @param schema - Zod schema to validate against (should match parsed JSON structure, or response structure for text)
 * @returns Validated and parsed data
 * @throws Error if validation fails
 */
export function validateAnthropicResponse<T>(
  response: any,
  schema: z.ZodSchema<T>,
  context?: string
): T {
  try {
    // Validate the response structure directly (works for both JSON and text)
    const validated = schema.parse(response);
    
    if (context) {
      console.log(`[${context}] Response validated successfully`);
    }
    
    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = `Validation failed: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`;
      console.error(`[${context || 'ANTHROPIC_VALIDATOR'}] ${errorMessage}`);
      throw new Error(errorMessage);
    }
    throw error;
  }
}

/**
 * Validates and parses JSON response from Anthropic
 * Use this for JSON responses that need parsing first
 */
export function validateAnthropicJsonResponse<T>(
  response: any,
  schema: z.ZodSchema<T>,
  context?: string
): T {
  try {
    // Parse the response to extract JSON
    const parsed = parseAnthropicResponse(response);
    
    // Validate against Zod schema
    const validated = schema.parse(parsed);
    
    if (context) {
      console.log(`[${context}] JSON response validated successfully`);
    }
    
    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = `Validation failed: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`;
      console.error(`[${context || 'ANTHROPIC_VALIDATOR'}] ${errorMessage}`);
      throw new Error(errorMessage);
    }
    throw error;
  }
}

/**
 * Safe validation - returns validated data or throws error
 * Use this when you want validation errors to be retryable
 */
export function validateAnthropicResponseSafe<T>(
  response: any,
  schema: z.ZodSchema<T>,
  context?: string
): T {
  return validateAnthropicResponse(response, schema, context);
}

