import Anthropic from "@anthropic-ai/sdk";
import { getTextFromAnthropicContent, parseAndValidateAiJson } from "../utils/ai-response";
import { jsonObjectSchema } from "../utils/ai-response-schemas";
import {
  PROMPT_JSON_ESCAPED,
  SYSTEM_EMAIL_COPYWRITER_BASE,
  SYSTEM_EMAIL_WARM,
  SYSTEM_EMAIL_NURTURE,
  SYSTEM_EMAIL_REMINDER,
  SYSTEM_EMAIL_SALES,
} from "../shared/prompts";

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("[LAUNCH EMAILS] ANTHROPIC_API_KEY is not set in environment variables");
}

const anthropic = new Anthropic({ 
  apiKey: process.env.ANTHROPIC_API_KEY || ""
});

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function parseAnthropicResponse(responseObj: any): any {
  const contentText = getTextFromAnthropicContent(responseObj.content);
  if (!contentText) {
    console.error(`[LAUNCH EMAILS] No text content in Anthropic response. Response structure:`, JSON.stringify(responseObj, null, 2));
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
    
    console.warn(`[LAUNCH EMAILS] JSON appeared incomplete, attempted to fix by adding ${missingBrackets} closing bracket(s) and ${missingBraces} closing brace(s)`);
  }
  
  // Try to parse and validate as JSON object - if it fails, log more details
  try {
    return parseAndValidateAiJson(cleanedContent, jsonObjectSchema, { context: "launch email" }) as Record<string, unknown>;
  } catch (parseError: unknown) {
    const err = parseError instanceof Error ? parseError : new Error(String(parseError));
    // Log more context around the error position if available
    const errorMatch = err.message.match(/position (\d+)/);
    if (errorMatch) {
      const errorPos = parseInt(errorMatch[1]);
      const startPos = Math.max(0, errorPos - 100);
      const endPos = Math.min(cleanedContent.length, errorPos + 100);
      console.error(`[LAUNCH EMAILS] JSON parse error around position ${errorPos}:`);
      console.error(`[LAUNCH EMAILS] Content snippet:`, cleanedContent.substring(startPos, endPos));
    }
    
    console.error(`[LAUNCH EMAILS] JSON parse error. First 500 chars:`, cleanedContent.substring(0, 500));
    console.error(`[LAUNCH EMAILS] Last 500 chars:`, cleanedContent.substring(Math.max(0, cleanedContent.length - 500)));
    console.error(`[LAUNCH EMAILS] Parse error:`, err.message);
    console.error(`[LAUNCH EMAILS] Full cleaned content length:`, cleanedContent.length);
    
    throw new Error(`Failed to parse JSON response: ${err.message}`);
  }
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Log error details
      console.error(`[LAUNCH EMAILS] Retry attempt ${attempt + 1}/${maxRetries + 1} failed:`, {
        message: error?.message,
        status: error?.status,
        code: error?.code,
        name: error?.name,
        type: error?.constructor?.name
      });
      
      // Check if error has Anthropic-specific details
      if (error?.error) {
        console.error(`[LAUNCH EMAILS] Anthropic API error details:`, error.error);
      }
      
      // Retry on rate limits or 5xx errors
      const isRetryable = 
        error?.status === 429 || // Rate limit
        error?.status === 502 || // Bad Gateway
        error?.status === 503 || // Service unavailable
        error?.status === 504 || // Gateway timeout
        (error?.status >= 500 && error?.status < 600); // Any 5xx server error
      
      if (isRetryable && attempt < maxRetries) {
        const retryAfterMs = error?.headers?.['retry-after-ms'] 
          ? parseInt(error.headers['retry-after-ms']) 
          : baseDelay * Math.pow(2, attempt);
        
        console.log(`[LAUNCH EMAILS] Retryable error detected. Waiting ${retryAfterMs}ms before retry ${attempt + 1}/${maxRetries}`);
        await sleep(retryAfterMs);
        continue;
      }
      
      // Non-retryable error or max retries reached
      throw error;
    }
  }
  
  throw lastError;
}

interface LaunchEmailInputData {
  // User inputs from form
  inviteHooks: string;
  inviteFOMO: string;
  confirmationDetails: string;
  preEventActions: string;
  nurtureContent: string;
  liveAttendanceValue: string;
  mythsBeliefs: string;
  salesStories: string;
  finalPush: string;
  
  // From system data
  messagingStrategy: any;
  liveLaunchDetails: any;
  coreOfferOutline?: any;
  salesPageUrgency: string;
  showUpBonus?: string;
}

interface GeneratedEmail {
  emailType: 'registration_invite' | 'confirmation' | 'nurture' | 'reminder' | 'sales';
  emailNumber: number;
  subject: string;
  body: string;
}

interface LaunchEmailSequenceResult {
  emails: GeneratedEmail[];
  totalEmails: number;
}

function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

function extractMessagingStrategyEssentials(strategy: any): string {
  const content = strategy?.content || '';
  
  const sections = {
    corePromise: '',
    uniquePositioning: '',
    targetAudience: '',
    transformation: '',
    brandVoice: ''
  };
  
  if (content.includes('## 1. CORE PROMISE')) {
    const corePromiseMatch = content.match(/## 1\. CORE PROMISE\n(.+?)(?=\n##|$)/s);
    if (corePromiseMatch) sections.corePromise = corePromiseMatch[1].substring(0, 250).trim();
  }
  
  if (content.includes('## 2. UNIQUE POSITIONING')) {
    const positioningMatch = content.match(/## 2\. UNIQUE POSITIONING\n(.+?)(?=\n##|$)/s);
    if (positioningMatch) sections.uniquePositioning = positioningMatch[1].substring(0, 250).trim();
  }
  
  if (content.includes('## 3. TARGET AUDIENCE')) {
    const audienceMatch = content.match(/## 3\. TARGET AUDIENCE\n(.+?)(?=\n##|$)/s);
    if (audienceMatch) sections.targetAudience = audienceMatch[1].substring(0, 250).trim();
  }
  
  if (content.includes('## 4. TRANSFORMATION')) {
    const transformationMatch = content.match(/## 4\. TRANSFORMATION\n(.+?)(?=\n##|$)/s);
    if (transformationMatch) sections.transformation = transformationMatch[1].substring(0, 250).trim();
  }
  
  if (content.includes('## 5. BRAND VOICE')) {
    const voiceMatch = content.match(/## 5\. BRAND VOICE\n(.+?)(?=\n##|$)/s);
    if (voiceMatch) sections.brandVoice = voiceMatch[1].substring(0, 200).trim();
  }
  
  return `Core Promise: ${sections.corePromise}
Unique Positioning: ${sections.uniquePositioning}
Target Audience: ${sections.targetAudience}
Transformation: ${sections.transformation}
Brand Voice: ${sections.brandVoice}`;
}

function extractOfferEssentials(offer: any): string {
  const content = offer?.content || '';
  
  if (!content) return 'No core offer details available';
  
  const sections = {
    overview: '',
    purpose: '',
    outcomes: ''
  };
  
  if (content.includes('## 1️⃣ OFFER OVERVIEW')) {
    const overviewMatch = content.match(/## 1️⃣ OFFER OVERVIEW\n(.+?)(?=\n##|$)/s);
    if (overviewMatch) sections.overview = overviewMatch[1].substring(0, 400).trim();
  }
  
  if (content.includes('## 2️⃣ PURPOSE')) {
    const purposeMatch = content.match(/## 2️⃣ PURPOSE.+?\n(.+?)(?=\n##|$)/s);
    if (purposeMatch) sections.purpose = purposeMatch[1].substring(0, 400).trim();
  }
  
  if (content.includes('## 7️⃣ OUTCOMES')) {
    const outcomesMatch = content.match(/## 7️⃣ OUTCOMES.+?\n(.+?)(?=\n##|$)/s);
    if (outcomesMatch) sections.outcomes = outcomesMatch[1].substring(0, 400).trim();
  }
  
  return `Offer Overview: ${sections.overview}
Purpose: ${sections.purpose}
Outcomes: ${sections.outcomes}`;
}

async function generateWithRetry<T>(
  generatorFn: () => Promise<T>,
  emailType: string,
  maxRetries: number = 3
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await generatorFn();
    } catch (error: any) {
      lastError = error;
      
      // Check if this is a JSON parsing error (retryable)
      const isJsonParseError = 
        error?.message?.includes('Failed to parse JSON') ||
        error?.message?.includes('JSON') ||
        error instanceof SyntaxError;
      
      if (isJsonParseError && attempt < maxRetries - 1) {
        console.warn(`[LAUNCH EMAILS] ${emailType} - JSON parse error on attempt ${attempt + 1}/${maxRetries}, retrying...`);
        await sleep(1000 * (attempt + 1)); // Progressive delay
        continue;
      }
      
      // Non-retryable error or max retries reached
      throw error;
    }
  }
  
  throw lastError;
}

export async function generateLaunchEmailSequence(inputData: LaunchEmailInputData): Promise<LaunchEmailSequenceResult> {
  console.log('[LAUNCH EMAILS] Starting email sequence generation');
  
  const compactInputData = {
    ...inputData,
    messagingStrategyEssentials: extractMessagingStrategyEssentials(inputData.messagingStrategy),
    offerEssentials: inputData.coreOfferOutline ? extractOfferEssentials(inputData.coreOfferOutline) : ''
  };
  
  const emails: GeneratedEmail[] = [];
  
  try {
    // Generate emails sequentially to avoid rate limits, with retry logic for JSON errors
    console.log('[LAUNCH EMAILS] Generating 5 registration invite emails');
    const registrationEmails = await generateWithRetry(
      () => generateRegistrationInviteEmails(compactInputData),
      'Registration invites',
      3
    );
    emails.push(...registrationEmails);
    await sleep(500);
    
    console.log('[LAUNCH EMAILS] Generating confirmation email');
    const confirmationEmail = await generateWithRetry(
      () => generateConfirmationEmail(compactInputData),
      'Confirmation',
      3
    );
    emails.push(confirmationEmail);
    await sleep(500);
    
    console.log('[LAUNCH EMAILS] Generating 3 nurture emails');
    const nurtureEmails = await generateWithRetry(
      () => generateNurtureEmails(compactInputData),
      'Nurture emails',
      3
    );
    emails.push(...nurtureEmails);
    await sleep(500);
    
    console.log('[LAUNCH EMAILS] Generating 3 reminder emails');
    const reminderEmails = await generateWithRetry(
      () => generateReminderEmails(compactInputData),
      'Reminder emails',
      3
    );
    emails.push(...reminderEmails);
    await sleep(500);
    
    console.log('[LAUNCH EMAILS] Generating 5 sales emails');
    const salesEmails = await generateWithRetry(
      () => generateSalesEmails(compactInputData),
      'Sales emails',
      3
    );
    emails.push(...salesEmails);
    
    console.log(`[LAUNCH EMAILS] Successfully generated ${emails.length} emails`);
    
    return {
      emails,
      totalEmails: emails.length
    };
  } catch (error: any) {
    console.error('[LAUNCH EMAILS] Error generating email sequence:', error);
    console.error('[LAUNCH EMAILS] Error details:', {
      message: error?.message,
      status: error?.status,
      code: error?.code,
      name: error?.name,
      stack: error?.stack?.split('\n').slice(0, 5).join('\n')
    });
    
    // Preserve the original error message if it's informative
    if (error?.message && error.message !== 'Failed to generate email sequence') {
      throw error;
    }
    
    throw new Error(`Failed to generate email sequence: ${error?.message || 'Unknown error'}`);
  }
}


async function generateRegistrationInviteEmails(inputData: any): Promise<GeneratedEmail[]> {
  console.log('[LAUNCH EMAILS] Generating 5 registration invite emails');
  
  const userPrompt = `Generate 5 unique registration invite emails to promote the user's upcoming live launch experience.

MESSAGING STRATEGY:
${inputData.messagingStrategyEssentials}

LIVE LAUNCH DETAILS:
${JSON.stringify(inputData.liveLaunchDetails, null, 2)}

USER PROVIDED:
- Main hooks and promises: ${truncateText(inputData.inviteHooks, 1000)}
- What they miss if they don't attend: ${truncateText(inputData.inviteFOMO, 500)}

REQUIREMENTS:
Each email should focus on a different core angle:
1. Pain-based hook (highlight frustration or problem)
2. Desire-based hook (highlight dream outcome)
3. Unique mechanism hook (what makes this launch different)
4. Authority hook (personal or client story)
5. Urgency hook (final reminder, limited spots)

For each email:
- Start with a strong emotional hook or curiosity-driven statement
- Reinforce the transformation and core promise of attending
- Weave in emotional storytelling and relatable tone
- End with a clear CTA to register for the live event
- Keep subject lines friendly like they're from a friend (e.g., "RE: Your strategy" or "Quick heads-up about tomorrow")

OUTPUT FORMAT (JSON):
CRITICAL: You MUST return valid, properly escaped JSON. All quotes, newlines, and special characters in strings must be escaped.

Return a JSON object with this exact structure:
{
  "emails": [
    {
      "subjectLine": "friendly subject line here",
      "emailBody": "full email body. Use \\n\\n for paragraph breaks. Escape quotes: \\\"example\\\""
    },
    ...
  ]
}

IMPORTANT JSON RULES:
- Escape all double quotes in string values: \\\"
- Escape all backslashes: \\\\
- Use \\n for newlines in email bodies
- Ensure proper comma placement between array elements
- Close all brackets and braces properly
- No trailing commas

Make copy skimmable with short paragraphs. Avoid corporate or templated formatting.`;

  const userPromptWithJson = userPrompt + PROMPT_JSON_ESCAPED;
  const responseObj = await retryWithBackoff(() =>
    anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      temperature: 0.8,
      system: SYSTEM_EMAIL_COPYWRITER_BASE,
      messages: [
        { role: "user", content: userPromptWithJson }
      ],
    })
  );
  
  const response = parseAnthropicResponse(responseObj);
  const emailsArray = response.emails || [];
  
  return emailsArray.slice(0, 5).map((email: any, index: number) => ({
    emailType: 'registration_invite' as const,
    emailNumber: index + 1,
    subject: email.subjectLine || `Register for ${inputData.liveLaunchDetails?.topic || 'Our Live Experience'}`,
    body: email.emailBody || ''
  }));
}

async function generateConfirmationEmail(inputData: any): Promise<GeneratedEmail> {
  console.log('[LAUNCH EMAILS] Generating confirmation email');
  
  const userPrompt = `Write a friendly confirmation email for registrants of the live launch experience.

LIVE LAUNCH DETAILS:
${JSON.stringify(inputData.liveLaunchDetails, null, 2)}

USER PROVIDED:
- Key details registrants need: ${truncateText(inputData.confirmationDetails, 500)}
- Pre-event actions: ${truncateText(inputData.preEventActions, 500)}
${inputData.showUpBonus ? `- Show-up bonus: ${truncateText(inputData.showUpBonus, 300)}` : ''}

Include:
- The event name, date, time, and timezone
- Direct link to access or join (placeholder: [JOIN LINK HERE])
- A short reminder of the transformation or promise of the event
- Optional next step (add to calendar, join community, etc.)

Keep tone casual, warm, and excited — under 200 words.

OUTPUT FORMAT (JSON):
CRITICAL: You MUST return valid, properly escaped JSON. All quotes, newlines, and special characters in strings must be escaped.

{
  "subjectLine": "friendly confirmation subject",
  "emailBody": "full email body. Use \\n\\n for paragraph breaks. Escape quotes: \\\"example\\\""
}

IMPORTANT JSON RULES:
- Escape all double quotes in string values: \\\"
- Escape all backslashes: \\\\
- Use \\n for newlines
- No trailing commas
- Close all braces properly`;

  const userPromptWithJson = userPrompt + PROMPT_JSON_ESCAPED;
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured. Please set it in your environment variables.");
  }
  const responseObj = await retryWithBackoff(() =>
    anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      temperature: 0.7,
      system: SYSTEM_EMAIL_WARM,
      messages: [
        { role: "user", content: userPromptWithJson }
      ],
    })
  );
  const response = parseAnthropicResponse(responseObj);
  return {
    emailType: 'confirmation',
    emailNumber: 1,
    subject: response.subjectLine || "You're confirmed! Here's what to expect...",
    body: response.emailBody || ''
  };
}

async function generateNurtureEmails(inputData: any): Promise<GeneratedEmail[]> {
  console.log('[LAUNCH EMAILS] Generating 3 nurture emails');
  const userPrompt = `Write 3 nurture emails for registrants leading up to the live launch.

LIVE LAUNCH DETAILS:
${JSON.stringify(inputData.liveLaunchDetails, null, 2)}

MESSAGING STRATEGY:
${inputData.messagingStrategyEssentials}

USER PROVIDED:
- Stories, tips, or insights: ${truncateText(inputData.nurtureContent, 800)}
- Why show up live: ${truncateText(inputData.liveAttendanceValue, 500)}
- Myths or limiting beliefs to break down: ${truncateText(inputData.mythsBeliefs, 500)}
${inputData.showUpBonus ? `- Show-up bonus: ${truncateText(inputData.showUpBonus, 300)}` : ''}

Each email should:
- Tell a story or share an insight that builds anticipation
- Reconnect readers to their core desire or the problem this event solves
- Break down a limiting belief or false assumption
- Reinforce date/time/link clearly
${inputData.showUpBonus ? '- Tease the show-up bonus as extra reason to attend live' : ''}
- Keep tone warm, conversational, and focused on connection

OUTPUT FORMAT (JSON):
CRITICAL: You MUST return valid, properly escaped JSON. All quotes, newlines, and special characters in strings must be escaped.

{
  "emails": [
    {"subjectLine": "...", "emailBody": "... Use \\n\\n for breaks. Escape quotes: \\\"example\\\""},
    {"subjectLine": "...", "emailBody": "..."},
    {"subjectLine": "...", "emailBody": "..."}
  ]
}

IMPORTANT JSON RULES:
- Escape all double quotes in string values: \\\"
- Escape all backslashes: \\\\
- Use \\n for newlines in email bodies
- Ensure proper comma placement between array elements
- No trailing commas
- Close all brackets and braces properly`;

  const userPromptWithJson = userPrompt + PROMPT_JSON_ESCAPED;
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured. Please set it in your environment variables.");
  }
  
  const responseObj = await retryWithBackoff(() =>
    anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000, // Increased to handle 5 longer sales emails
      temperature: 0.8,
      system: SYSTEM_EMAIL_NURTURE,
      messages: [
        { role: "user", content: userPromptWithJson }
      ],
    })
  );
  const response = parseAnthropicResponse(responseObj);
  const emailsArray = response.emails || [];
  return emailsArray.slice(0, 3).map((email: any, index: number) => ({
    emailType: 'nurture' as const,
    emailNumber: index + 1,
    subject: email.subjectLine || `Getting ready for ${inputData.liveLaunchDetails?.topic || 'the live event'}`,
    body: email.emailBody || ''
  }));
}

async function generateReminderEmails(inputData: any): Promise<GeneratedEmail[]> {
  console.log('[LAUNCH EMAILS] Generating 3 reminder emails');
  
  const userPrompt = `Write 3 reminder emails for the live launch experience at these intervals:
1. 24 hours before
2. 1 hour before  
3. Live now

LIVE LAUNCH DETAILS:
${JSON.stringify(inputData.liveLaunchDetails, null, 2)}

Each email should:
- Open with excitement ("It's almost time!", "We're going live soon!")
- Include the event name, exact time, and timezone
- Put the JOIN LINK at the top and again near the bottom (use placeholder: [JOIN LINK HERE])
- Keep it short (under 120 words), urgent, and easy to skim
- Use energetic, friendly tone

OUTPUT FORMAT (JSON):
CRITICAL: You MUST return valid, properly escaped JSON. All quotes, newlines, and special characters in strings must be escaped.

{
  "emails": [
    {"subjectLine": "...", "emailBody": "... Use \\n\\n for breaks. Escape quotes: \\\"example\\\""},
    {"subjectLine": "...", "emailBody": "..."},
    {"subjectLine": "...", "emailBody": "..."}
  ]
}

IMPORTANT JSON RULES:
- Escape all double quotes in string values: \\\"
- Escape all backslashes: \\\\
- Use \\n for newlines in email bodies
- Ensure proper comma placement between array elements
- No trailing commas
- Close all brackets and braces properly`;

  const userPromptWithJson = userPrompt + PROMPT_JSON_ESCAPED;
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured. Please set it in your environment variables.");
  }
  
  const responseObj = await retryWithBackoff(() =>
    anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000, // Increased to handle 5 longer sales emails
      temperature: 0.7,
      system: SYSTEM_EMAIL_REMINDER,
      messages: [
        { role: "user", content: userPromptWithJson }
      ],
    })
  );
  
  const response = parseAnthropicResponse(responseObj);
  const emailsArray = response.emails || [];
  
  return emailsArray.slice(0, 3).map((email: any, index: number) => ({
    emailType: 'reminder' as const,
    emailNumber: index + 1,
    subject: email.subjectLine || ['Tomorrow!', 'Starting in 1 hour', 'We\'re live!'][index],
    body: email.emailBody || ''
  }));
}

async function generateSalesEmails(inputData: any): Promise<GeneratedEmail[]> {
  console.log('[LAUNCH EMAILS] Generating 5 sales emails');
  
  const userPrompt = `Write 5 sales emails to promote the user's core offer after the live launch.

MESSAGING STRATEGY:
${inputData.messagingStrategyEssentials}
${inputData.offerEssentials ? `
CORE OFFER OUTLINE:
${inputData.offerEssentials}
` : ''}
SALES PAGE URGENCY:
${truncateText(inputData.salesPageUrgency, 500)}

USER PROVIDED:
- Stories for sales emails: ${truncateText(inputData.salesStories, 800)}
- Final push for fence-sitters: ${truncateText(inputData.finalPush, 500)}

Each email should focus on a distinct conversion angle:
1. Emotional recap of the live event + open cart announcement
2. Transformation-focused story (what's possible after joining)
3. Objection handling (time, cost, belief — include proof or perspective)
4. Proof and credibility (client success, testimonials, guarantee)
5. Final urgency push (bonuses expiring, cart closing, limited spots)

Each email should:
- Start with a hook that resonates emotionally
- Highlight the offer's unique approach and transformation
- Reinforce urgency and deadlines
- Include one clear CTA to buy or join
- Maintain a natural, confident tone focused on opportunity — not pressure

OUTPUT FORMAT (JSON):
{
  "emails": [
    {"subjectLine": "...", "emailBody": "..."},
    {"subjectLine": "...", "emailBody": "..."},
    {"subjectLine": "...", "emailBody": "..."},
    {"subjectLine": "...", "emailBody": "..."},
    {"subjectLine": "...", "emailBody": "..."}
  ]
}`;

  const userPromptWithJson = userPrompt + PROMPT_JSON_ESCAPED;
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured. Please set it in your environment variables.");
  }
  
  const responseObj = await retryWithBackoff(() =>
    anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000, // Increased to handle 5 longer sales emails
      temperature: 0.8,
      system: SYSTEM_EMAIL_SALES,
      messages: [
        { role: "user", content: userPromptWithJson }
      ],
    })
  );
  const response = parseAnthropicResponse(responseObj);
  const emailsArray = response.emails || [];
  return emailsArray.slice(0, 5).map((email: any, index: number) => ({
    emailType: 'sales' as const,
    emailNumber: index + 1,
    subject: email.subjectLine || `About ${inputData.coreOfferOutline?.title || 'the offer'}`,
    body: email.emailBody || ''
  }));
}

