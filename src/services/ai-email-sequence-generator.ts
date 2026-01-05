import { z } from "zod";
import { anthropic } from "../utils/anthropic-client";
import { retryWithBackoff } from "../utils/retry-utils";
import { validateAnthropicJsonResponse } from "../utils/anthropic-validator";

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

// Zod schema for email content validation
const EmailContentSchema = z.object({
  emailNumber: z.number().int().min(1).max(5),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required"),
});

// Zod schema for email sequence response validation
const EmailSequenceResponseSchema = z.object({
  emails: z.array(EmailContentSchema).length(5, "Must contain exactly 5 emails"),
});

export async function generateEmailSequence(input: EmailSequenceInput): Promise<EmailContent[]> {
  
//   const systemPrompt = `You are an expert email copywriter specializing in creating authentic, relationship-building email sequences for entrepreneurs and coaches. Your emails should feel personal, warm, and conversational—like a friend writing with genuine insight and excitement.

// KEY PRINCIPLES:
// - Connection over conversion
// - Short paragraphs with double line breaks between them for readability
// - Conversational, human, and emotionally intelligent tone
// - Under 500 words per email
// - Scannable structure
// - One clear, soft CTA per email
// - Include stories or examples in at least 3 of the 5 emails
// - Stay consistent with the brand voice and messaging strategy provided

// CRITICAL REQUIREMENT: You MUST generate EXACTLY 5 emails following the exact template structure provided. Each email must follow its designated purpose and structure. No more, no less.

// Each paragraph in the email body MUST be separated by double newlines (\\n\\n) for proper white space and readability.`;



const systemPrompt = `
You are an expert email copywriter specializing in authentic, relationship-based nurture sequences. 

### CONSTRAINTS
- EXACTLY 5 emails in valid JSON format.
- TONE: Warm, personal, emotionally intelligent, conversational.
- FORMAT: Short paragraphs with double line breaks (\n\n).
- LENGTH: Under 250 words per email.
- STRUCTURE: 1 soft CTA per email; stories/examples in at least 3 emails.

### INTERVIEW-ENHANCED WRITING (If data present)
When "Interview Data" is provided, use visceral, cinematic language. Replace generic descriptions with the customer's exact internal dialogue and sensory details (e.g., "staring at the ceiling at 2 AM" instead of "feeling stressed").

### OUTPUT SCHEMA
{
  "emails": [
    { "emailNumber": 1, "subject": "string", "body": "string" }
  ]
}
`;


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

//   const userPrompt = `Generate a 5-part lead nurture email sequence for the following business:

// ## LEAD MAGNET INFORMATION
// **Title**: ${input.leadMagnetTitle}
// **Transformation Promised**: ${input.transformation}
// **Problem It Solves**: ${input.problemSolved}

// ## TRIPWIRE OFFER INFORMATION
// **Product Name**: ${input.tripwireTitle}
// **Product Type**: ${input.tripwireType}
// **Core Outcome**: ${input.tripwireOutcome}
// **Price**: $${input.tripwirePrice}

// ## EMAIL STRATEGY
// **Core Belief/Mindset Shift**: ${input.coreBeliefShift}
// **Objections to Address**: ${input.objectionsDoubts}
// **Stories & Examples**: ${input.storiesExamples}
// **Content to Highlight**: ${input.contentHighlight}
// **Content Flow**: ${input.contentOrder}

// ## BRAND VOICE & MESSAGING
// ${messagingStrategyText}

// ${hasInterviewData ? `\n⭐ CRITICAL: This messaging strategy contains INTERVIEW-ENHANCED insights from customer interview transcripts.
// These fields (frustrations, nighttime_worries, secret_fears, magic_solution, etc.) contain the customer's EXACT WORDS and authentic emotional expressions.

// YOU MUST:
// 1. Use CINEMATIC, MOMENT-BY-MOMENT language from these interview insights in your emails
// 2. Include customer's exact words, internal dialogue ("wondering, 'What am I missing?'")
// 3. Add SPECIFIC, TANGIBLE outcomes with numbers and timeframes
// 4. Show sensory details and specific moments ("Each time they open Instagram...")
// 5. Make emails VISCERAL and AUTHENTIC - like you're talking directly to the customer using their own language

// EXAMPLE TRANSFORMATION:
// ❌ Generic: "They feel stuck and overwhelmed"
// ✅ Interview-enhanced: "They've been showing up online for months — posting, tweaking, trying every hack — and still hearing crickets. Each time they open Instagram, they see competitors thriving and wonder, 'What am I missing?'"

// PRIORITIZE these interview-enhanced fields. Use the customer's exact language throughout your emails.\n` : ''}

// ## IDEAL CUSTOMER PROFILE
// ${input.idealCustomerProfile}

// ---

// ## SEQUENCE STRUCTURE TO FOLLOW

// **Email 1: Delivery & Welcome**
// - **Purpose**: Deliver the lead magnet and set the tone for the relationship
// - **Tone**: Grateful, excited, confident, human
// - **Include**:
//   • Thank them for joining and confirm they're in the right place
//   • Deliver the lead magnet link or access info
//   • Share why you created this resource (connect with their struggle)
//   • Reinforce the transformation/result promised by the lead magnet
//   • Briefly introduce who you help and your credibility
//   • Set expectations for what's coming next
// - **CTA**: Access the lead magnet (and optionally reference the tripwire product)

// **Email 2: Problem Awareness**
// - **Purpose**: Help them feel seen and understood by articulating their core frustration
// - **Tone**: Empathetic, validating, grounded
// - **Include**:
//   • Describe their current pain or frustration in vivid, emotional terms
//   • Normalize the struggle and show you understand why it happens
//   • Highlight what's possible when this problem is solved
//   • Subtly hint that your approach offers a unique or refreshing path forward
// - **CTA**: Link to a related content piece, mention the tripwire, or invite them to DM/reply

// **Email 3: Small Win / Quick Tip**
// - **Purpose**: Deliver quick value while reinforcing your authority and system
// - **Tone**: Encouraging, practical, supportive
// - **Include**:
//   • Share a simple action, framework, or mindset shift that brings an immediate win
//   • If possible, include a micro case study or personal example
//   • Reinforce that this tip is one piece of a larger system
//   • Encourage them to take action today
// - **CTA**: Invite them to consume a related piece of content or reply with their takeaway

// **Email 4: Your Disruptive Beliefs**
// - **Purpose**: Challenge industry norms or outdated thinking
// - **Tone**: Bold, thought-provoking, confident
// - **Include**:
//   • Call out a common belief or strategy that keeps people stuck
//   • Explain why it's wrong or incomplete
//   • Share your core belief and how it changes the game
//   • Anchor this belief in your brand philosophy or method
// - **CTA**: Invite them to engage (comment, reply, or consume a content piece expanding on this idea)

// **Email 5: Belief Shift**
// - **Purpose**: End the sequence by opening their mind to what's truly possible
// - **Tone**: Hopeful, visionary, grounded in truth
// - **Include**:
//   • Identify a final misconception holding them back
//   • Replace it with a more empowering truth
//   • Use a story, metaphor, or analogy to make the shift feel real
//   • Tie it back to your bigger system or method (without pitching)
//   • Reinforce that the journey they started with your lead magnet is just the beginning
// - **CTA**: Invite them to stay engaged—read a post, reply, or follow on social media

// ---

// ## OUTPUT FORMAT

// For each email, provide:
// 1. **Subject Line**: Compelling, curiosity-driving subject line
// 2. **Email Body**: Full email copy following the structure above

// Return the emails in JSON format as an array of objects with this structure:
// {
//   "emails": [
//     {
//       "emailNumber": 1,
//       "subject": "Subject line here",
//       "body": "Full email body here..."
//     },
//     ...
//   ]
// }

// Remember:
// - Keep each email under 500 words
// - Use short paragraphs with white space
// - Write in a personal, conversational tone matching the brand voice
// - Include stories/examples in at least 3 emails
// - One clear, natural CTA per email
// - No hard sales—focus on connection and value`;



const userPrompt = `
Generate a 5-part lead nurture sequence using the following context:

### 1. PRODUCT CONTEXT
- LEAD MAGNET: ${input.leadMagnetTitle} (${input.transformation})
- PROBLEM: ${input.problemSolved}
- TRIPWIRE: ${input.tripwireTitle} (${input.tripwireType}) at $${input.tripwirePrice}
- OUTCOME: ${input.tripwireOutcome}

### 2. STRATEGY & VOICE
- SHIFT: ${input.coreBeliefShift}
- OBJECTIONS: ${input.objectionsDoubts}
- BRAND VOICE: ${messagingStrategyText}
- AUDIENCE: ${input.idealCustomerProfile}

${hasInterviewData ? `### 3. INTERVIEW INSIGHTS (PRIORITIZE THIS)
Use these exact emotional triggers: ${messagingStrategyText}` : ''}

### 3. SEQUENCE FLOW
1. Delivery: Welcome & link to magnet.
2. Problem: Empathize with core frustration.
3. Win: Practical tip/framework for immediate value.
4. Disrupt: Challenge industry norms with your core belief.
5. Vision: Replace misconceptions with empowering truth.
`;


  return retryWithBackoff(
    async () => {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1800,
        temperature: 0.6,
        system: systemPrompt,
        messages: [
          { role: "user", content: userPrompt }
        ],
      });

      // Parse and validate JSON response using Zod schema
      const validatedResult = validateAnthropicJsonResponse(
        response,
        EmailSequenceResponseSchema,
        "EMAIL SEQUENCE"
      );
      
      // Ensure body has proper paragraph breaks (double newlines)
      validatedResult.emails.forEach((email) => {
        if (!email.body.includes('\n\n')) {
          email.body = email.body.replace(/\n/g, '\n\n');
        }
      });
      
      // Sort by email number to ensure correct order
      validatedResult.emails.sort((a, b) => a.emailNumber - b.emailNumber);
      
      console.log(`[EMAIL SEQUENCE] Successfully generated and validated email sequence for user ${input.userId}`);
      return validatedResult.emails;
    },
    {
      maxRetries: 7,
      baseDelay: 2000,
      context: "EMAIL SEQUENCE",
      onRetry: (attempt, error) => {
        console.error(`[EMAIL SEQUENCE] Attempt ${attempt + 1}/8 failed:`, {
          error: error?.message,
          status: error?.status,
          code: error?.code,
          userId: input.userId
        });
      }
    }
  );
}

