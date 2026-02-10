import Anthropic from "@anthropic-ai/sdk";
import { getTextFromAnthropicContent, parseAndValidateAiJson } from "../utils/ai-response";
import {
  coachingEvaluationSchema,
  coreOfferRewriteResultSchema,
  coreOfferFinalSummarySchema,
} from "../utils/ai-response-schemas";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface QuestionCoachingRequest {
  questionKey: string;
  questionText: string;
  userResponse: string;
  mainTransformation?: string;
  allResponses?: Record<string, string>;
}

interface CategoryScore {
  score: number; // 1-5
  reasoning: string;
}

interface CoachingEvaluation {
  qualityScore: number; // 0-100 for overall
  categoryScores?: {
    clarity: CategoryScore;
    specificity: CategoryScore;
    differentiation: CategoryScore;
    emotion: CategoryScore;
    proof: CategoryScore;
    alignment: CategoryScore;
  };
  totalScore?: number; // out of 30
  coachingFeedback: string;
  strongPoints?: string[]; // What's strong (2-3 highlights)
  needsWork?: string[]; // What needs improvement (2-3 key fixes)
  needsRewrite: boolean;
  recommendedRewrite?: string;
  rewriteRationale?: string;
  alignmentIssues?: string[];
  suggestedFollowUps?: {
    questionKey: string;
    suggestion: string;
  }[];
}

interface RewriteRequest {
  questionKey: string;
  questionText: string;
  originalResponse: string;
  mainTransformation?: string;
  specificIssues?: string[];
}

interface RewriteResult {
  rewrittenText: string;
  rationale: string;
  improvements: string[];
}

interface FinalSummary {
  summary: string;
  keyStrengths: string[];
  nextSteps: string[];
  totalScore?: number;
  scoreSummary?: string;
}

// Section-specific coaching prompts mapping
const SECTION_COACHING_PROMPTS: Record<string, { keyChecks: string; weakPrompt: string }> = {
  headlineTransformation: {
    keyChecks: "Is it one clear transformation? Does it pass the Starbucks test?",
    weakPrompt: "This feels broad. What's the one main result or identity shift?"
  },
  problemAndUrgency: {
    keyChecks: "Emotionally specific and time-sensitive?",
    weakPrompt: "What does this pain look like in daily life?"
  },
  targetAudience: {
    keyChecks: "Clear who it's for and who it's not?",
    weakPrompt: "Who are you picturing when you write this?"
  },
  differentiation: {
    keyChecks: "Clear reason it's not free info?",
    weakPrompt: "What makes this impossible to find on YouTube?"
  },
  featuresAndBenefits: {
    keyChecks: "Each feature tied to emotional benefit?",
    weakPrompt: "Why does this matter to them?"
  },
  proofAndStory: {
    keyChecks: "Builds trust and relatability?",
    weakPrompt: "Can you add one quick story or testimonial?"
  },
  pricing: {
    keyChecks: "Value framed by transformation?",
    weakPrompt: "What's the cost of staying stuck?"
  },
  guarantee: {
    keyChecks: "Credible and specific?",
    weakPrompt: "What exactly will you do if they don't get results?"
  }
};

export async function coachQuestionResponse(
  request: QuestionCoachingRequest
): Promise<CoachingEvaluation> {
  try {
    console.log(`[CORE OFFER COACH] Evaluating question: ${request.questionKey}`);

    const prompt = buildCoachingPrompt(request);
    const sectionGuidance = SECTION_COACHING_PROMPTS[request.questionKey];

    const userPromptWithJson = prompt + PROMPT_JSON_ONLY;
    
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      temperature: 0.7,
      system: `You are a confident, warm, and collaborative business coach and marketing strategist. Your role is to evaluate user responses to Core Offer questions with a mentor's eye.

🧠 AI WRITING RULES YOU MUST ENFORCE:

✅ Clarity & Focus
- Only one core problem and one core promise — no mixed results
- Use clear, plain language. Avoid jargon
- Everything (features, benefits, proof) must tie back to that one transformation

✅ Specificity
- Replace vague claims ("gain confidence") with concrete outcomes ("speak on camera without hesitation")
- Use the "looks like / feels like" rule:
  * "What would this look like in their daily life?"
  * "How would they feel once this is solved?"

✅ Emotional Resonance
- Every logical benefit should have an emotional benefit attached
- Example: "Weekly calls → accountability and relief from overwhelm"
- Use active, human phrasing that evokes transformation

✅ Differentiation
- Emphasize what cannot be found for free: personalization, structure, support, accountability, or system
- Avoid generic phrasing like "holistic approach" or "step-by-step program"

✅ Flow & Alignment
- Each section should naturally lead into the next
- If something feels disjointed, note it and realign

🧾 SCORING SYSTEM (1–5 scale for each category):

1. **Clarity** - Transformation is obvious (1=Confusing, 5=Instantly clear)
2. **Specificity** - Measurable/tangible (1=Vague, 5=Concrete)
3. **Differentiation** - Stands apart from free options (1=Generic, 5=Distinct)
4. **Emotion** - Creates feeling/urgency (1=Flat, 5=Emotionally charged)
5. **Proof** - Shows credibility (1=Missing, 5=Convincing)
6. **Alignment** - Consistent throughout (1=Scattered, 5=Cohesive)

${sectionGuidance ? `
🔍 SECTION-SPECIFIC GUIDANCE FOR THIS QUESTION:
- Key Checks: ${sectionGuidance.keyChecks}
- If Weak, Ask: ${sectionGuidance.weakPrompt}
` : ''}

✨ YOUR FEEDBACK TONE:
- Confident, warm, and collaborative — like a mentor or strategist
- Avoid hype or condescension
- Use language that empowers and educates
- Examples:
  * "You're on the right track. Let's tighten your promise so it hits harder — it'll make everything else flow more clearly."
  * "You're close — this message is strong but trying to say too much at once. Let's simplify it to one transformation so it sticks."

⚙️ QUICK DIAGNOSTIC FORMAT:
Provide:
- ✅ Strong: [list 2–3 highlights]
- ⚡ Needs Work: [list 2–3 key fixes]

Return your evaluation in JSON format:
{
  "qualityScore": number (0-100),
  "categoryScores": {
    "clarity": {"score": 1-5, "reasoning": "brief explanation"},
    "specificity": {"score": 1-5, "reasoning": "brief explanation"},
    "differentiation": {"score": 1-5, "reasoning": "brief explanation"},
    "emotion": {"score": 1-5, "reasoning": "brief explanation"},
    "proof": {"score": 1-5, "reasoning": "brief explanation"},
    "alignment": {"score": 1-5, "reasoning": "brief explanation"}
  },
  "totalScore": number (sum of all category scores, max 30),
  "strongPoints": ["highlight 1", "highlight 2"],
  "needsWork": ["fix 1", "fix 2"],
  "coachingFeedback": "warm, specific coaching feedback in your mentor tone",
  "needsRewrite": boolean,
  "recommendedRewrite": "improved version (if needsRewrite is true)" or null,
  "rewriteRationale": "why this new version works better" or null,
  "alignmentIssues": ["issue 1", "issue 2"] or null,
  "suggestedFollowUps": [{"questionKey": "...", "suggestion": "..."}] or null
}`,
      messages: [
        { role: "user", content: userPromptWithJson }
      ],
    });

    const contentText = getTextFromAnthropicContent(response.content);
    if (!contentText) {
      throw new Error("No response from Anthropic");
    }
    const evaluation = parseAndValidateAiJson(contentText, coachingEvaluationSchema, {
      context: "core offer evaluation",
    });
    return evaluation as CoachingEvaluation;
  } catch (error) {
    console.error("Core Offer coaching error:", error);
    throw new Error("Failed to evaluate question response");
  }
}

export async function generateRewrite(
  request: RewriteRequest
): Promise<RewriteResult> {
  try {
    console.log(`[CORE OFFER COACH] Generating rewrite for: ${request.questionKey}`);

    const prompt = buildRewritePrompt(request);
    const userPromptWithJson = prompt + PROMPT_JSON_ONLY;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1200,
      temperature: 0.7,
      system: `You are a skilled marketing strategist and business coach helping entrepreneurs clarify and strengthen their Core Offer messaging.

🧠 AI WRITING RULES TO APPLY:

✅ Clarity & Focus
- Only one core problem and one core promise — no mixed results
- Use clear, plain language. Avoid jargon
- Everything must tie back to that one transformation

✅ Specificity
- Replace vague claims with concrete outcomes
- Apply the "looks like / feels like" rule:
  * "What would this look like in their daily life?"
  * "How would they feel once this is solved?"

✅ Emotional Resonance
- Every logical benefit should have an emotional benefit attached
- Use active, human phrasing that evokes transformation

✅ Differentiation
- Emphasize what cannot be found for free
- Avoid generic phrasing like "holistic approach" or "step-by-step program"

YOUR TASK:
- Take the user's original response and rewrite it for maximum clarity and impact
- Ensure alignment with their main transformation promise
- Address the specific issues identified
- Keep their authentic voice and personal details
- Make it emotionally resonant and specific

REWRITING PRINCIPLES:
- Simplify: One clear idea beats multiple competing ones
- Emotionalize: Connect to feelings, not just features
- Specify: Concrete details beat vague claims
- Align: Everything points back to the main transformation

✨ TONE:
- Confident, warm, and collaborative
- Explain WHY the new version works better
- Educate and empower

Return your rewrite in JSON format:
{
  "rewrittenText": "the improved version",
  "rationale": "why this version works better (warm, educational tone)",
  "improvements": ["improvement 1", "improvement 2", "improvement 3"]
}`,
      messages: [
        { role: "user", content: userPromptWithJson }
      ],
    });

    const contentText = getTextFromAnthropicContent(response.content);
    if (!contentText) {
      throw new Error("No response from Anthropic");
    }
    const rewrite = parseAndValidateAiJson(contentText, coreOfferRewriteResultSchema, {
      context: "core offer rewrite",
    });
    return rewrite as RewriteResult;
  } catch (error) {
    console.error("Core Offer rewrite error:", error);
    throw new Error("Failed to generate rewrite");
  }
}

export async function generateFinalSummary(
  allResponses: Record<string, string>
): Promise<FinalSummary> {
  try {
    console.log("[CORE OFFER COACH] Generating final summary");

    const prompt = buildSummaryPrompt(allResponses);
    const userPromptWithJson = prompt + PROMPT_JSON_ONLY;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      temperature: 0.7,
      system: `You are a business coach wrapping up a strategy session. Review the user's completed Core Offer and provide an encouraging, strategic summary.

🧠 EVALUATE AGAINST THESE CRITERIA:

✅ Clarity & Focus - One core problem, one core promise
✅ Specificity - Concrete outcomes vs vague claims
✅ Emotional Resonance - Logical + emotional benefits
✅ Differentiation - What can't be found for free
✅ Flow & Alignment - Sections naturally lead into each other

🧾 SCORING (Optional but recommended):
Score the overall offer on a 1-5 scale across:
1. Clarity
2. Specificity
3. Differentiation
4. Emotion
5. Proof
6. Alignment

Total Score: X/30

YOUR TASK:
- Acknowledge the cohesiveness and strength of their offer
- Provide diagnostic summary: "Here's what's strong and what to improve"
- Highlight 2-3 key strengths that stand out
- Provide 2-3 clear next steps for implementation
- Include overall score if applicable (e.g., "Your outline scores 24/30")
- Mirror the tone of a live strategy call wrap-up

✨ TONE:
- Confident and affirming
- Strategic and forward-looking
- Encouraging without being generic
- Example: "Your offer is now strong and cohesive — it communicates one clear promise, emotionally grounded benefits, and proof that builds trust. This version is ready for your messaging, funnel, and launch strategy."

Return in JSON format:
{
  "summary": "overall wrap-up statement with diagnostic",
  "keyStrengths": ["strength 1", "strength 2", "strength 3"],
  "nextSteps": ["next step 1", "next step 2", "next step 3"],
  "totalScore": number (optional, out of 30),
  "scoreSummary": "e.g., Your outline scores 24/30. The biggest opportunity is..." (optional)
}`,
      messages: [
        { role: "user", content: userPromptWithJson }
      ],
    });

    const contentText = getTextFromAnthropicContent(response.content);
    if (!contentText) {
      throw new Error("No response from Anthropic");
    }
    const summary = parseAndValidateAiJson(contentText, coreOfferFinalSummarySchema, {
      context: "core offer final summary",
    });
    return summary as FinalSummary;
  } catch (error) {
    console.error("Core Offer summary error:", error);
    throw new Error("Failed to generate final summary");
  }
}

// Helper function to build coaching prompt
function buildCoachingPrompt(request: QuestionCoachingRequest): string {
  const sectionGuidance = SECTION_COACHING_PROMPTS[request.questionKey];
  
  return `<prompt>
  <task>Evaluate a Core Offer question response using the AI Writing Rules and Scoring System.</task>
  
  <inputs>
    <question>${request.questionText}</question>
    <user_response>
      <![CDATA[
${request.userResponse}
      ]]>
    </user_response>
    <main_transformation_promise>${request.mainTransformation || "Not yet defined"}</main_transformation_promise>
    ${sectionGuidance ? `<section_specific_guidance>
      <key_checks>${sectionGuidance.keyChecks}</key_checks>
      <weak_prompt>${sectionGuidance.weakPrompt}</weak_prompt>
    </section_specific_guidance>` : ''}
    ${request.allResponses ? `<context_other_responses>
      ${Object.entries(request.allResponses).map(([key, value]) => `<response key="${key}">
        <![CDATA[
${value}
        ]]>
      </response>`).join('\n      ')}
    </context_other_responses>` : ''}
  </inputs>
  
  <evaluation_requirements>
    <requirement number="1">Category scores (1-5 for each of the 6 categories)</requirement>
    <requirement number="2">Total score out of 30</requirement>
    <requirement number="3">Quick diagnostic (Strong points & Needs Work)</requirement>
    <requirement number="4">Warm, specific coaching feedback</requirement>
    <requirement number="5">Rewrite recommendation if needed</requirement>
  </evaluation_requirements>
  
  <output_format>
    <format>JSON</format>
  </output_format>
</prompt>`;
}

// Helper function to build rewrite prompt
function buildRewritePrompt(request: RewriteRequest): string {
  return `<prompt>
  <task>Rewrite a Core Offer response for clarity and impact using the AI Writing Rules.</task>
  
  <inputs>
    <question>${request.questionText}</question>
    <original_response>
      <![CDATA[
${request.originalResponse}
      ]]>
    </original_response>
    <main_transformation_promise>${request.mainTransformation || "Not yet defined"}</main_transformation_promise>
    ${request.specificIssues && request.specificIssues.length > 0 ? `<specific_issues_to_address>
      ${request.specificIssues.map(issue => `<issue>${issue}</issue>`).join('\n      ')}
    </specific_issues_to_address>` : ''}
  </inputs>
  
  <writing_rules>
    <rule name="Clarity & Focus">One core promise</rule>
    <rule name="Specificity">"Looks like / feels like" rule</rule>
    <rule name="Emotional Resonance">Logical + emotional benefits</rule>
    <rule name="Differentiation">What can't be found for free</rule>
    <rule name="Flow & Alignment">Cohesive messaging</rule>
  </writing_rules>
  
  <output_format>
    <format>JSON</format>
    <requirement>Provide your rewrite with rationale explaining why the new version works better</requirement>
  </output_format>
</prompt>`;
}

// Helper function to build summary prompt
function buildSummaryPrompt(allResponses: Record<string, string>): string {
  return `<prompt>
  <task>Review a completed Core Offer and provide a final strategic summary with scoring.</task>
  
  <inputs>
    <core_offer_responses>
      ${Object.entries(allResponses).map(([key, value]) => `<response key="${key}">
        <![CDATA[
${value}
        ]]>
      </response>`).join('\n      ')}
    </core_offer_responses>
  </inputs>
  
  <evaluation_criteria>
    <criterion>Clarity & Focus</criterion>
    <criterion>Specificity</criterion>
    <criterion>Emotional Resonance</criterion>
    <criterion>Differentiation</criterion>
    <criterion>Flow & Alignment</criterion>
  </evaluation_criteria>
  
  <summary_requirements>
    <requirement number="1">Overall diagnostic summary (Strong & Needs Work)</requirement>
    <requirement number="2">Total score (X/30) across the 6 categories</requirement>
    <requirement number="3">Key strengths (2-3)</requirement>
    <requirement number="4">Next steps (2-3)</requirement>
    <requirement number="5">Encouraging wrap-up in mentor tone</requirement>
  </summary_requirements>
  
  <output_format>
    <format>JSON</format>
    <style>Format as a strategy call wrap-up</style>
  </output_format>
</prompt>`;
}

