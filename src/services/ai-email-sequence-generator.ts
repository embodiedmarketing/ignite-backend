import Anthropic from "@anthropic-ai/sdk";
import { getTextFromAnthropicContent, parseAndValidateAiJson, repairTruncatedEmailSequenceJson } from "../utils/ai-response";
import { emailSequenceResponseSchema } from "../utils/ai-response-schemas";
import { SYSTEM_EMAIL_SEQUENCE_GENERATOR } from "../shared/prompts";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});


interface EmailSequenceInput {
  userId: number;
  
  // Lead Magnet Information
  leadMagnetTitle: string;
  transformation: string;
  problemSolved: string;
  
  // Tripwire Offer Information
  tripwireTitle: string;
  tripwireType: string;
  tripwireOutcome: string;
  tripwirePrice: string;
  
  // Email Sequence Strategy
  coreBeliefShift: string;
  objectionsDoubts: string;
  storiesExamples: string;
  contentHighlight: string;
  contentOrder: string;
  
  // User's Messaging Strategy & Voice
  messagingStrategy: string;
  idealCustomerProfile: string;
}

interface EmailContent {
  emailNumber: number;
  subject: string;
  body: string;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function generateEmailSequence(input: EmailSequenceInput): Promise<EmailContent[]> {
  const MAX_RETRIES = 7; // Increased from 5 to 7 for better reliability
  const BASE_DELAY = 2000; // 2 seconds
  
  // Check if messaging strategy contains interview-enhanced fields
  const messagingStrategyText = typeof input.messagingStrategy === 'string' 
    ? input.messagingStrategy 
    : JSON.stringify(input.messagingStrategy || {});
  
  // Simplified interview data detection
  const hasInterviewData = messagingStrategyText && typeof messagingStrategyText === 'string' && 
    /(frustrations|nighttime_worries|secret_fears|magic_solution|failed_solutions|blockers|decision_making|investment_criteria|success_measures)/i.test(messagingStrategyText);

  // Optimized prompt: condensed structure
  const interviewNote = hasInterviewData ? `
⭐ INTERVIEW DATA: Use customer's EXACT WORDS. Show moments: "They've been posting for months — still hearing crickets. Each time they open Instagram, they see competitors thriving and wonder, 'What am I missing?'" Make it visceral and authentic.\n` : '';

//   const userPrompt = `Generate 5-part email sequence:
// LEAD MAGNET: ${input.leadMagnetTitle} | Transformation: ${input.transformation} | Problem: ${input.problemSolved}
// TRIPWIRE: ${input.tripwireTitle} (${input.tripwireType}) | Outcome: ${input.tripwireOutcome} | Price: $${input.tripwirePrice}
// STRATEGY: Belief shift: ${input.coreBeliefShift} | Objections: ${input.objectionsDoubts} | Stories: ${input.storiesExamples}
// MESSAGING: ${messagingStrategyText.substring(0, 1000)}${messagingStrategyText.length > 1000 ? '...' : ''}
// ${input.idealCustomerProfile ? `CUSTOMER: ${input.idealCustomerProfile}` : ''}
// ${interviewNote}
// STRUCTURE:  
// 1. Delivery & Welcome: Thank, deliver lead magnet, share why created, introduce credibility, set expectations
// 2. Problem Awareness: Describe pain vividly, normalize struggle, hint at unique solution
// 3. Small Win: Share quick tip/framework with example, reinforce it's part of larger system
// 4. Disruptive Beliefs: Challenge common belief, explain why wrong, share your core belief
// 5. Belief Shift: Identify misconception, replace with empowering truth, use story/metaphor, tie to system




// <principles>
// - Connection over conversion
// - Conversational, warm tone
// - Under 400 words per email
// - One clear, soft CTA per email
// - Stories in at


// <output_format>
// Return a JSON array of exactly 5 email objects:
// [
// {
// "emailNumber": 1,
// "subject": "string",
// "purpose": "string (one sentence)",
// "body": "string (email content with \\n\\n between paragraphs)"
// }
// ]
// Do not wrap in markdown. Return only the JSON array.
// </output_format>;

// `;

const userPrompt = `
<prompt>

  <task>
    Generate a 5-part email sequence based on the inputs below.
  </task>

  <inputs>

    <lead_magnet>
      <title>${input.leadMagnetTitle}</title>
      <transformation>${input.transformation}</transformation>
      <problem_solved>${input.problemSolved}</problem_solved>
    </lead_magnet>

    <tripwire>
      <title>${input.tripwireTitle}</title>
      <type>${input.tripwireType}</type>
      <outcome>${input.tripwireOutcome}</outcome>
      <price currency="USD">${input.tripwirePrice}</price>
    </tripwire>

    <strategy>
      <belief_shift>${input.coreBeliefShift}</belief_shift>
      <objections>${input.objectionsDoubts}</objections>
      <stories>${input.storiesExamples}</stories>
    </strategy>

    <messaging_strategy>
      ${messagingStrategyText.substring(0, 1000)}${messagingStrategyText.length > 1000 ? '...' : ''}
    </messaging_strategy>

    <customer_profile optional="true">
      ${input.idealCustomerProfile}
    </customer_profile>

    <interview_notes>
      ${interviewNote}
    </interview_notes>

  </inputs>

  <email_structure>
    <email number="1">
      Delivery and welcome: thank the reader, deliver the lead magnet, explain why it was created, establish credibility, and set expectations.
    </email>
    <email number="2">
      Problem awareness: vividly describe the pain, normalize the struggle, and hint at a unique solution.
    </email>
    <email number="3">
      Small win: share a quick tip or framework with an example and reinforce that it is part of a larger system.
    </email>
    <email number="4">
      Disruptive beliefs: challenge a common belief, explain why it is wrong, and introduce your core belief.
    </email>
    <email number="5">
      Belief shift: identify a misconception, replace it with an empowering truth, use a story or metaphor, and tie it to your system.
    </email>
  </email_structure>

  <principles>
    <principle>Connection over conversion</principle>
    <principle>Conversational and warm tone</principle>
    <principle>Maximum 400 words per email</principle>
    <principle>Exactly one clear, soft call-to-action per email</principle>
    <principle>Stories must appear in at least 3 of the 5 emails</principle>
  </principles>

  <output_contract>
    <format>JSON</format>
    <rules>
      <rule>Return a JSON array of exactly 5 email objects</rule>
      <rule>Do not include markdown</rule>
      <rule>Do not include commentary or explanations</rule>
      <rule>Return ONLY valid JSON</rule>
    </rules>
    <schema>
      <![CDATA[
      [
        {
          "emailNumber": 1,
          "subject": "string",
          "purpose": "string (one sentence)",
          "body": "string (use \\n\\n between paragraphs)"
        }
      ]
      ]]>
    </schema>
  </output_contract>

  <validation>
    If the output does not match the schema or is not valid JSON, regenerate silently until it does.
  </validation>

</prompt>
`;


  // Retry loop with exponential backoff
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[EMAIL SEQUENCE] Attempt ${attempt + 1}/${MAX_RETRIES + 1} for user ${input.userId}`);
      
      
      const completion = await anthropic.messages.create(
        {
          model: "claude-sonnet-4-20250514",
          max_tokens: 2200,
          temperature: 0.7,
          system: SYSTEM_EMAIL_SEQUENCE_GENERATOR,
          messages: [
            { role: "user", content: userPrompt}
          ],
        }
        );

      const content = getTextFromAnthropicContent(completion.content);
      if (!content) {
        throw new Error("No content received from Anthropic");
      }

      let result: { emails: Array<{ emailNumber: number; subject: string; body: string }> };
      try {
        result = parseAndValidateAiJson(content, emailSequenceResponseSchema, {
          context: "email sequence",
        });
      } catch (parseError: unknown) {
        const msg = parseError instanceof Error ? parseError.message : String(parseError);
        if (msg.toLowerCase().includes("unterminated string")) {
          const repaired = repairTruncatedEmailSequenceJson(content);
          result = parseAndValidateAiJson(repaired, emailSequenceResponseSchema, {
            context: "email sequence (repaired)",
          });
        } else {
          throw parseError;
        }
      }

      const emails = result.emails.map((email) => ({
        ...email,
        body: email.body.includes("\n\n") ? email.body : email.body.replace(/\n/g, "\n\n"),
      }));
      emails.sort((a, b) => a.emailNumber - b.emailNumber);

      console.log(`[EMAIL SEQUENCE] Successfully generated email sequence for user ${input.userId}`);
      return emails;
      
    } catch (error: any) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if this is a retryable error
      // Retryable errors include:
      // - Network/API errors (rate limits, timeouts, server errors, network failures)
      // - AI output formatting issues (malformed JSON, wrong email count, missing fields)
      const errorMessage = (error?.message || '').toLowerCase();
      const isRetryable = 
        error?.status === 429 || // Rate limit
        error?.status === 502 || // Bad Gateway
        error?.status === 503 || // Service unavailable
        error?.status === 504 || // Gateway timeout
        (error?.status >= 500 && error?.status < 600) || // Any 5xx server error
        error?.code === 'ECONNRESET' || // Connection reset
        error?.code === 'ETIMEDOUT' || // Timeout
        error?.name === 'AbortError' || // Timeout abort
        errorMessage.includes('timeout') ||
        errorMessage.includes('aborted') ||
        errorMessage.includes('fetch failed') || // Network fetch failures
        errorMessage.includes('network') || // General network errors
        errorMessage.includes('invalid email count') || // AI didn't generate 5 emails
        errorMessage.includes('invalid response format') || // AI returned bad format
        errorMessage.includes('missing required fields') || // AI output missing fields
        errorMessage.includes('invalid emailnumber') || // AI output has bad email numbers
        errorMessage.includes('no content received') || // AI returned empty response
        errorMessage.includes('unexpected token') || // JSON parse error
        errorMessage.includes('json') || // Other JSON parsing errors
        errorMessage.includes('ai returned invalid json') || // parseAndValidateAiJson
        errorMessage.includes('did not match expected shape') || // Zod validation
        error instanceof SyntaxError || // JSON.parse failed
        error instanceof TypeError; // Fetch/network type errors
      
      // Log the error
      console.error(`[EMAIL SEQUENCE] Attempt ${attempt + 1} failed:`, {
        error: error?.message,
        status: error?.status,
        code: error?.code,
        isRetryable,
        userId: input.userId
      });
      
      // If this is the last attempt or error is not retryable, throw
      if (attempt === MAX_RETRIES || !isRetryable) {
        console.error(`[EMAIL SEQUENCE] All retries exhausted or non-retryable error for user ${input.userId}`);
        throw lastError;
      }
      
      // Calculate delay with exponential backoff and jitter
      // Increased delays for better reliability: 3s, 6s, 12s, 24s, 48s, 60s, 60s
      const exponentialDelay = Math.min(BASE_DELAY * Math.pow(2, attempt), 60000); // Cap at 60 seconds
      const jitter = Math.random() * 2000; // Add up to 2 seconds of random jitter
      const delay = exponentialDelay + jitter;
      console.log(`[EMAIL SEQUENCE] Retrying in ${Math.round(delay / 1000)}s (attempt ${attempt + 1}/${MAX_RETRIES + 1})...`);
      await sleep(delay);
    }
  }
  
  // This should never be reached, but just in case
  throw lastError || new Error("Failed to generate email sequence after all retries");
}

