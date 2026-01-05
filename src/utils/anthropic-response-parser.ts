/**
 * Parses JSON response from Anthropic API, handling markdown code blocks and incomplete JSON
 */
export function parseAnthropicResponse(responseObj: any): any {
  // Handle response content
  let contentText = "";
  if (!responseObj.content || responseObj.content.length === 0) {
    console.error(`[ANTHROPIC PARSER] Empty content array in Anthropic response. Full response:`, JSON.stringify(responseObj, null, 2));
    throw new Error("No content received from Anthropic - empty content array");
  }
  
  const firstContent = responseObj.content[0];
  if (firstContent.type === "text") {
    contentText = firstContent.text || "";
  } else {
    console.error(`[ANTHROPIC PARSER] Unexpected content type: ${firstContent.type}. Full response:`, JSON.stringify(responseObj, null, 2));
    throw new Error(`Unexpected content type from Anthropic: ${firstContent.type}`);
  }
  
  if (!contentText) {
    console.error(`[ANTHROPIC PARSER] No text content in Anthropic response. Response structure:`, JSON.stringify(responseObj, null, 2));
    throw new Error("No content received from Anthropic");
  }
  
  // Clean up any markdown code blocks and extract JSON
  let cleanedContent = contentText.trim();
  
  // Remove markdown code blocks if present
  if (cleanedContent.includes('```json')) {
    // Extract content between ```json and ```
    const jsonMatch = cleanedContent.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      cleanedContent = jsonMatch[1].trim();
    } else {
      cleanedContent = cleanedContent.replace(/```json\s*/, '').replace(/```\s*$/, '');
    }
  } else if (cleanedContent.includes('```')) {
    // Extract content between ``` and ```
    const codeMatch = cleanedContent.match(/```[a-z]*\s*([\s\S]*?)\s*```/);
    if (codeMatch) {
      cleanedContent = codeMatch[1].trim();
    } else {
      cleanedContent = cleanedContent.replace(/```.*?\n/, '').replace(/```\s*$/, '');
    }
  }
  
  // Try to find JSON object in the content (handle cases where there's text before/after JSON)
  // Use a more robust method to find the complete JSON object
  let jsonStart = cleanedContent.indexOf('{');
  let jsonEnd = -1;
  
  if (jsonStart !== -1) {
    // Find the matching closing brace by counting braces
    let braceCount = 0;
    let inString = false;
    let escapeNext = false;
    
    for (let i = jsonStart; i < cleanedContent.length; i++) {
      const char = cleanedContent[i];
      
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      
      if (char === '\\') {
        escapeNext = true;
        continue;
      }
      
      if (char === '"') {
        inString = !inString;
        continue;
      }
      
      if (!inString) {
        if (char === '{') {
          braceCount++;
        } else if (char === '}') {
          braceCount--;
          if (braceCount === 0) {
            jsonEnd = i;
            break;
          }
        }
      }
    }
    
    if (jsonEnd !== -1 && jsonEnd > jsonStart) {
      cleanedContent = cleanedContent.substring(jsonStart, jsonEnd + 1);
    } else if (jsonStart !== -1) {
      // Fallback: use last } if brace counting didn't work
      const lastBrace = cleanedContent.lastIndexOf('}');
      if (lastBrace > jsonStart) {
        cleanedContent = cleanedContent.substring(jsonStart, lastBrace + 1);
      }
    }
  }
  
  // Remove any leading/trailing whitespace and newlines
  cleanedContent = cleanedContent.trim();
  
  // Try to fix incomplete/truncated JSON before parsing
  // Count opening vs closing braces/brackets to detect incomplete JSON
  const openBraces = (cleanedContent.match(/\{/g) || []).length;
  const closeBraces = (cleanedContent.match(/\}/g) || []).length;
  const openBrackets = (cleanedContent.match(/\[/g) || []).length;
  const closeBrackets = (cleanedContent.match(/\]/g) || []).length;
  
  // Check if JSON appears incomplete (mismatched brackets/braces)
  const missingBrackets = openBrackets - closeBrackets;
  const missingBraces = openBraces - closeBraces;
  
  // If JSON doesn't end properly or has mismatched brackets, try to fix it
  if ((missingBrackets > 0 || missingBraces > 0) || 
      (!cleanedContent.endsWith('}') && !cleanedContent.endsWith(']') && cleanedContent.length > 100)) {
    
    // Remove any incomplete last element (if it looks like it's cut off mid-string)
    // Check if the last character before } or ] might be inside a string
    if (cleanedContent.match(/"[^"]*$/)) {
      // Incomplete string, try to close it
      const lastQuote = cleanedContent.lastIndexOf('"');
      if (lastQuote > cleanedContent.length - 50) {
        // Likely an incomplete string, remove it and the incomplete object
        const lastOpenBrace = cleanedContent.lastIndexOf('{');
        if (lastOpenBrace > cleanedContent.length - 200) {
          cleanedContent = cleanedContent.substring(0, lastOpenBrace);
        }
      }
    }
    
    // Add missing closing brackets and braces
    if (missingBrackets > 0) {
      cleanedContent += ']'.repeat(missingBrackets);
    }
    if (missingBraces > 0) {
      cleanedContent += '}'.repeat(missingBraces);
    }
    
    console.warn(`[ANTHROPIC PARSER] JSON appeared incomplete, attempted to fix by adding ${missingBrackets} closing bracket(s) and ${missingBraces} closing brace(s)`);
  }
  
  // Try to parse - if it fails, log more details
  try {
    return JSON.parse(cleanedContent);
  } catch (parseError: any) {
    // Log more context around the error position if available
    const errorMatch = parseError.message.match(/position (\d+)/);
    if (errorMatch) {
      const errorPos = parseInt(errorMatch[1]);
      const startPos = Math.max(0, errorPos - 100);
      const endPos = Math.min(cleanedContent.length, errorPos + 100);
      console.error(`[ANTHROPIC PARSER] JSON parse error around position ${errorPos}:`);
      console.error(`[ANTHROPIC PARSER] Content snippet:`, cleanedContent.substring(startPos, endPos));
    }
    
    console.error(`[ANTHROPIC PARSER] JSON parse error. First 500 chars:`, cleanedContent.substring(0, 500));
    console.error(`[ANTHROPIC PARSER] Last 500 chars:`, cleanedContent.substring(Math.max(0, cleanedContent.length - 500)));
    console.error(`[ANTHROPIC PARSER] Parse error:`, parseError.message);
    console.error(`[ANTHROPIC PARSER] Full cleaned content length:`, cleanedContent.length);
    
    throw new Error(`Failed to parse JSON response: ${parseError.message}`);
  }
}

