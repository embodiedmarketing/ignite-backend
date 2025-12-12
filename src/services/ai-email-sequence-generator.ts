import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
  
  const systemPrompt = `You are an expert email copywriter specializing in creating authentic, relationship-building email sequences for entrepreneurs and coaches. Your emails should feel personal, warm, and conversational—like a friend writing with genuine insight and excitement.

KEY PRINCIPLES:
- Connection over conversion
- Short paragraphs with double line breaks between them for readability
- Conversational, human, and emotionally intelligent tone
- Under 500 words per email
- Scannable structure
- One clear, soft CTA per email
- Include stories or examples in at least 3 of the 5 emails
- Stay consistent with the brand voice and messaging strategy provided

CRITICAL REQUIREMENT: You MUST generate EXACTLY 5 emails following the exact template structure provided. Each email must follow its designated purpose and structure. No more, no less.

Each paragraph in the email body MUST be separated by double newlines (\\n\\n) for proper white space and readability.`;
  // Check if messaging strategy contains interview-enhanced fields
  // messagingStrategy is a markdown string, so we check for interview field keywords in the text
  const messagingStrategyText = typeof input.messagingStrategy === 'string' 
    ? input.messagingStrategy 
    : JSON.stringify(input.messagingStrategy || {});
  
  // Check for interview-enhanced field keywords in the markdown text
  const hasInterviewData = messagingStrategyText && typeof messagingStrategyText === 'string' && (
    messagingStrategyText.toLowerCase().includes('frustrations') ||
    messagingStrategyText.toLowerCase().includes('nighttime_worries') ||
    messagingStrategyText.toLowerCase().includes('nighttime worries') ||
    messagingStrategyText.toLowerCase().includes('secret_fears') ||
    messagingStrategyText.toLowerCase().includes('secret fears') ||
    messagingStrategyText.toLowerCase().includes('magic_solution') ||
    messagingStrategyText.toLowerCase().includes('magic solution') ||
    messagingStrategyText.toLowerCase().includes('failed_solutions') ||
    messagingStrategyText.toLowerCase().includes('failed solutions') ||
    messagingStrategyText.toLowerCase().includes('blockers') ||
    messagingStrategyText.toLowerCase().includes('decision_making') ||
    messagingStrategyText.toLowerCase().includes('decision making') ||
    messagingStrategyText.toLowerCase().includes('investment_criteria') ||
    messagingStrategyText.toLowerCase().includes('investment criteria') ||
    messagingStrategyText.toLowerCase().includes('success_measures') ||
    messagingStrategyText.toLowerCase().includes('success measures')
  );

  const userPrompt = `Generate a 5-part lead nurture email sequence for the following business:

## LEAD MAGNET INFORMATION
**Title**: ${input.leadMagnetTitle}
**Transformation Promised**: ${input.transformation}
**Problem It Solves**: ${input.problemSolved}

## TRIPWIRE OFFER INFORMATION
**Product Name**: ${input.tripwireTitle}
**Product Type**: ${input.tripwireType}
**Core Outcome**: ${input.tripwireOutcome}
**Price**: $${input.tripwirePrice}

## EMAIL STRATEGY
**Core Belief/Mindset Shift**: ${input.coreBeliefShift}
**Objections to Address**: ${input.objectionsDoubts}
**Stories & Examples**: ${input.storiesExamples}
**Content to Highlight**: ${input.contentHighlight}
**Content Flow**: ${input.contentOrder}

## BRAND VOICE & MESSAGING
${messagingStrategyText}

${hasInterviewData ? `\n⭐ CRITICAL: This messaging strategy contains INTERVIEW-ENHANCED insights from customer interview transcripts.
These fields (frustrations, nighttime_worries, secret_fears, magic_solution, etc.) contain the customer's EXACT WORDS and authentic emotional expressions.

YOU MUST:
1. Use CINEMATIC, MOMENT-BY-MOMENT language from these interview insights in your emails
2. Include customer's exact words, internal dialogue ("wondering, 'What am I missing?'")
3. Add SPECIFIC, TANGIBLE outcomes with numbers and timeframes
4. Show sensory details and specific moments ("Each time they open Instagram...")
5. Make emails VISCERAL and AUTHENTIC - like you're talking directly to the customer using their own language

EXAMPLE TRANSFORMATION:
❌ Generic: "They feel stuck and overwhelmed"
✅ Interview-enhanced: "They've been showing up online for months — posting, tweaking, trying every hack — and still hearing crickets. Each time they open Instagram, they see competitors thriving and wonder, 'What am I missing?'"

PRIORITIZE these interview-enhanced fields. Use the customer's exact language throughout your emails.\n` : ''}

## IDEAL CUSTOMER PROFILE
${input.idealCustomerProfile}

---

## SEQUENCE STRUCTURE TO FOLLOW

**Email 1: Delivery & Welcome**
- **Purpose**: Deliver the lead magnet and set the tone for the relationship
- **Tone**: Grateful, excited, confident, human
- **Include**:
  • Thank them for joining and confirm they're in the right place
  • Deliver the lead magnet link or access info
  • Share why you created this resource (connect with their struggle)
  • Reinforce the transformation/result promised by the lead magnet
  • Briefly introduce who you help and your credibility
  • Set expectations for what's coming next
- **CTA**: Access the lead magnet (and optionally reference the tripwire product)

**Email 2: Problem Awareness**
- **Purpose**: Help them feel seen and understood by articulating their core frustration
- **Tone**: Empathetic, validating, grounded
- **Include**:
  • Describe their current pain or frustration in vivid, emotional terms
  • Normalize the struggle and show you understand why it happens
  • Highlight what's possible when this problem is solved
  • Subtly hint that your approach offers a unique or refreshing path forward
- **CTA**: Link to a related content piece, mention the tripwire, or invite them to DM/reply

**Email 3: Small Win / Quick Tip**
- **Purpose**: Deliver quick value while reinforcing your authority and system
- **Tone**: Encouraging, practical, supportive
- **Include**:
  • Share a simple action, framework, or mindset shift that brings an immediate win
  • If possible, include a micro case study or personal example
  • Reinforce that this tip is one piece of a larger system
  • Encourage them to take action today
- **CTA**: Invite them to consume a related piece of content or reply with their takeaway

**Email 4: Your Disruptive Beliefs**
- **Purpose**: Challenge industry norms or outdated thinking
- **Tone**: Bold, thought-provoking, confident
- **Include**:
  • Call out a common belief or strategy that keeps people stuck
  • Explain why it's wrong or incomplete
  • Share your core belief and how it changes the game
  • Anchor this belief in your brand philosophy or method
- **CTA**: Invite them to engage (comment, reply, or consume a content piece expanding on this idea)

**Email 5: Belief Shift**
- **Purpose**: End the sequence by opening their mind to what's truly possible
- **Tone**: Hopeful, visionary, grounded in truth
- **Include**:
  • Identify a final misconception holding them back
  • Replace it with a more empowering truth
  • Use a story, metaphor, or analogy to make the shift feel real
  • Tie it back to your bigger system or method (without pitching)
  • Reinforce that the journey they started with your lead magnet is just the beginning
- **CTA**: Invite them to stay engaged—read a post, reply, or follow on social media

---

## OUTPUT FORMAT

For each email, provide:
1. **Subject Line**: Compelling, curiosity-driving subject line
2. **Email Body**: Full email copy following the structure above

Return the emails in JSON format as an array of objects with this structure:
{
  "emails": [
    {
      "emailNumber": 1,
      "subject": "Subject line here",
      "body": "Full email body here..."
    },
    ...
  ]
}

Remember:
- Keep each email under 500 words
- Use short paragraphs with white space
- Write in a personal, conversational tone matching the brand voice
- Include stories/examples in at least 3 emails
- One clear, natural CTA per email
- No hard sales—focus on connection and value`;

  // Retry loop with exponential backoff
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[EMAIL SEQUENCE] Attempt ${attempt + 1}/${MAX_RETRIES + 1} for user ${input.userId}`);
      
      // Use gpt-4o-mini as fallback after 4 failed attempts for better reliability
      const modelToUse = attempt >= 4 ? "gpt-4o-mini" : "gpt-4o";
      if (attempt >= 4) {
        console.log(`[EMAIL SEQUENCE] Switching to ${modelToUse} for better reliability after ${attempt} failed attempts`);
      }
      
      const completion = await openai.chat.completions.create(
        {
          model: modelToUse,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.7,
          response_format: { type: "json_object" },
          max_tokens: 4000 // Ensure we get complete responses
        },
        {
          timeout: 120000 // Increased to 120 seconds (2 minutes) for complex generations
        }
      );

      const content = completion.choices[0].message.content;
      if (!content) {
        throw new Error("No content received from OpenAI");
      }

      const result = JSON.parse(content);
      
      // Validate the response structure
      if (!result.emails || !Array.isArray(result.emails)) {
        throw new Error("Invalid response format: missing emails array");
      }
      
      // Ensure exactly 5 emails
      if (result.emails.length !== 5) {
        console.warn(`[EMAIL SEQUENCE] Received ${result.emails.length} emails instead of 5, retrying...`);
        throw new Error(`Invalid email count: expected 5, got ${result.emails.length}`);
      }
      
      // Validate each email has required fields
      result.emails.forEach((email: EmailContent, index: number) => {
        if (!email.emailNumber || !email.subject || !email.body) {
          throw new Error(`Email ${index + 1} is missing required fields (emailNumber, subject, or body)`);
        }
        
        if (email.emailNumber < 1 || email.emailNumber > 5) {
          throw new Error(`Email ${index + 1} has invalid emailNumber: ${email.emailNumber}`);
        }
        
        // Ensure body has proper paragraph breaks (double newlines)
        if (!email.body.includes('\n\n')) {
          email.body = email.body.replace(/\n/g, '\n\n');
        }
      });
      
      // Sort by email number to ensure correct order
      result.emails.sort((a: EmailContent, b: EmailContent) => a.emailNumber - b.emailNumber);
      
      console.log(`[EMAIL SEQUENCE] Successfully generated email sequence for user ${input.userId}`);
      return result.emails;
      
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

