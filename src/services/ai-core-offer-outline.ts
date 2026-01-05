import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { validateAnthropicResponse, validateAnthropicJsonResponse } from "../utils/anthropic-validator";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface CoreOfferResponses {
  offerName?: string;
  headlineTransformation?: string;
  clearStatement?: string;
  uniqueDifference?: string;
  problemsFrustrations?: string;
  notFor?: string;
  alreadyTried?: string;
  stakes?: string;
  objections?: string;
  howItWorks?: string;
  allComponents?: string;
  componentBenefits?: string;
  emotionalBenefit?: string;
  offerDifference?: string;
  personalStoryCore?: string;
  qualifications?: string;
  testimonialsCore?: string;
  evidence?: string;
  investment?: string;
  bonuses?: string;
  framePricing?: string;
  guarantee?: string;
  deliveryMethod?: string;
  supportType?: string;
  timeline?: string;
}

interface CoreOfferOutlineResult {
  outline: string;
  evaluation: {
    overall_score: number;
    strengths: string[];
    improvements_needed: string[];
    coaching_feedback: string;
  };
  recommendations: string[];
}

export async function generateCoreOfferOutline(
  responses: CoreOfferResponses,
  userId: number = 0,
  messagingStrategy?: string | null
): Promise<CoreOfferOutlineResult> {
  try {
    console.log("[CORE OFFER AI] Starting generation...");

    // Validate minimum required inputs
    if (!responses.offerName || !responses.headlineTransformation) {
      throw new Error("Offer name and headline transformation are required");
    }

    // Build the prompt for AI generation
    const prompt = buildCoreOfferPrompt(responses, messagingStrategy);

    // Generate the outline using Claude Sonnet 4
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 5000,
      temperature: 0.7,
      system: `You are an expert marketing strategist and business coach. Your role is to help entrepreneurs create compelling, conversion-ready Core Offer Outlines. Your specialty is transforming user responses into rich, emotionally compelling narratives that synthesize and EXPAND their input.

You MUST:
- Write like a strategic marketer, not a chatbot
- Be clear, specific, emotionally resonant, and differentiated
- Always tie everything back to ONE main transformation
- Use the user's exact language and phrases
- Create logical alignment: Problem → Promise → Proof → Price → Payoff
- Be authentic and avoid marketing jargon
- Focus on emotional connection and real transformation

DEPTH RULES - CRITICAL:
- Use ALL user input — no key detail should be omitted
- EXPAND on user ideas with expert-level insight, emotional context, and practical application
- Each paragraph should feel like it was written by a marketing strategist who deeply understands human motivation
- Add examples, sensory detail, and emotional nuance that illustrate what the user described
- Keep the structure clean, but make each section SUBSTANTIAL and value-packed
- Match or EXCEED the combined word length of the user's original responses if necessary for completeness
- Prioritize clarity, story, and emotional resonance over brevity
- DO NOT SUMMARIZE — synthesize and expand

You will analyze the user's inputs and create a structured, persuasive Core Offer Outline that includes emotional hooks, clear positioning, and conversion elements.`,
      messages: [
        { role: "user", content: prompt }
      ],
    });

    const contentText = response.content[0]?.type === "text" ? response.content[0].text : "";
    const generatedOutline = contentText || "";

    // Evaluate the generated outline
    const evaluation = await evaluateOutline(generatedOutline, responses);

    // Generate recommendations based on evaluation
    const recommendations = generateRecommendations(evaluation, responses);

    return {
      outline: generatedOutline,
      evaluation,
      recommendations,
    };

  } catch (error) {
    console.error("Core Offer Outline generation error:", error);
    throw new Error("Failed to generate Core Offer Outline");
  }
}

function buildCoreOfferPrompt(responses: CoreOfferResponses, messagingStrategy?: string | null): string {
  const messagingStrategyContext = messagingStrategy 
    ? `\n\n📋 USER'S MESSAGING STRATEGY (Use this voice, tone, and positioning):\n${messagingStrategy}\n\nIMPORTANT: Align your Core Offer Outline with the voice, tone, positioning, and messaging style from the above strategy. Use similar language patterns, emotional hooks, and brand voice to maintain consistency.\n`
    : '';

  return `As a marketing strategist and business coach, create a comprehensive Core Offer Outline based on the user's inputs below.
${messagingStrategyContext}
USER'S CORE OFFER INPUTS:

**Offer Name:** ${responses.offerName || "Not provided"}

**Core Transformation & Messaging:**
- Headline Transformation: ${responses.headlineTransformation || "Not provided"}
- Clear Statement: ${responses.clearStatement || "Not provided"}  
- Unique Difference: ${responses.uniqueDifference || "Not provided"}

**Ideal Customer & Pain Points:**
- Problems/Frustrations: ${responses.problemsFrustrations || "Not provided"}
- NOT For: ${responses.notFor || "Not provided"}
- Already Tried: ${responses.alreadyTried || "Not provided"}
- Stakes (What happens if they don't solve this): ${responses.stakes || "Not provided"}
- Objections: ${responses.objections || "Not provided"}

**Features & Benefits:**
- How It Works: ${responses.howItWorks || "Not provided"}
- All Components: ${responses.allComponents || "Not provided"}
- Component Benefits: ${responses.componentBenefits || "Not provided"}
- Ultimate Emotional Benefit: ${responses.emotionalBenefit || "Not provided"}

**Proof & Authority:**
- Industry Differentiation: ${responses.offerDifference || "Not provided"}
- Personal Story: ${responses.personalStoryCore || "Not provided"}
- Qualifications: ${responses.qualifications || "Not provided"}
- Testimonials: ${responses.testimonialsCore || "Not provided"}
- Evidence: ${responses.evidence || "Not provided"}

**Pricing & Value:**
- Investment: ${responses.investment || "Not provided"}
- Bonuses: ${responses.bonuses || "Not provided"}
- Price Framing: ${responses.framePricing || "Not provided"}
- Guarantee: ${responses.guarantee || "Not provided"}

**Delivery Method & Structure:**
- Delivery Method: ${responses.deliveryMethod || "Not provided"}
- Support Type: ${responses.supportType || "Not provided"}
- Timeline: ${responses.timeline || "Not provided"}

---

CRITICAL INSTRUCTIONS:

1. **Act as a marketing strategist + coach**, not a template filler
2. **Analyze** the inputs for clarity, emotional resonance, and alignment
3. **Synthesize** them into a cohesive, persuasive offer outline
4. **Coach** by rewriting vague inputs with specificity and emotional hooks
5. **Ensure logical flow**: Problem → Promise → Proof → Price → Payoff

GENERATION RULES:
- If input is vague: rewrite it with specificity (e.g., "help clients" → "help busy executives reclaim 15+ hours weekly")
- If jargon appears: replace with plain, emotional language
- Always tie back to the MAIN transformation from headline
- Use exact customer phrases when provided
- No contradictions: everything ladders to one core promise
- Add emotional depth where missing

DEPTH RULES - APPLY TO EVERY SECTION:
- Use ALL details from user responses - never omit key information
- EXPAND on ideas with expert-level insight, emotional context, and practical examples
- Each section should be SUBSTANTIAL and value-packed with rich storytelling
- Match or EXCEED the combined word length of user's original responses for completeness
- Prioritize clarity, story, and emotional resonance over brevity
- DO NOT SUMMARIZE — synthesize and expand with depth and nuance

---

CREATE THE CORE OFFER OUTLINE USING THIS EXACT STRUCTURE:

# CORE OFFER OUTLINE

---

## 1️⃣ OFFER OVERVIEW

**Offer Name:** [Use the provided name or refine it if vague]

**Core Transformation (Main Promise):** 
[One concise, specific result this offer delivers - rewrite for clarity and emotional impact if needed]

**One-Sentence Desire Fulfilled:**
"You'll [clear outcome] so you can [emotional benefit]."

---

## 2️⃣ PURPOSE & POSITIONING

**Problem This Solves:**
[Summarize 2-3 key frustrations or desires from user's inputs - make them emotionally resonant]

**What Makes It Different:**
[Explain how this offer stands out - use their unique method, story, or approach]

**Why It's Urgent Now:**
[Describe what's at stake - use consequences from their "stakes" input]

---

## 3️⃣ TARGET AUDIENCE

**Ideal Customer:**
[Describe who this is for and what stage they're in - be specific]

**What They've Tried (and Why It Didn't Work):**
"They've tried [solution] but still struggle because [reason]."

**False Beliefs / Objections (and Reframes):**
[Transform their objections into belief shifts]
- **Old Belief:** [What holds them back]
- **New Belief:** [Truth that moves them forward]

---

## 4️⃣ STRUCTURE & COMPONENTS

**Phases or Roadmap:**
[Break down "how it works" into 3-5 clear phases with outcomes]
- **[Phase Name]** – [Outcome they achieve]
- **[Phase Name]** – [Outcome they achieve]

**Core Components:**
[List key components from their inputs with direct benefits]
- **[Component Name]** → [Direct benefit]
- **[Component Name]** → [Direct benefit]

**Bonuses:**
[List bonuses with added value]
- **[Bonus Name]** → [Added value or quick win]

**Ultimate Emotional Benefit:**
"They'll feel [emotion], finally able to [new reality]."

---

## 5️⃣ PROOF & AUTHORITY

**Personal Story / Connection:**
[Use their personal story - make it relatable and authentic]

**Expertise / Credentials:**
[Include qualifications and experience - position as credible authority]

**Testimonials / Social Proof:**
[Use provided testimonials or evidence - format as specific outcomes]
"Before I joined, I [pain]. After [time], I [result]." — [Name or generic]

---

## 6️⃣ PRICING & VALUE

**Investment:**
[State price clearly with comparison if provided]

**Value Framing:**
"Less than the cost of [painful alternative], for the result of [promise]."

**Guarantee / Risk Reversal:**
[Use their guarantee or create one if missing]
"If you [take action] and don't get [result], you'll receive [risk reversal]."

---

## 7️⃣ DELIVERY & SUPPORT

**Format + Duration:**
"Delivered as [format] over [timeframe]."

**Support Included:**
[List coaching, community, tools, or access points]

**Tools / Access Points:**
[Platforms or systems needed to deliver]

---

## 8️⃣ OFFER SUMMARY (CLOSING SNAPSHOT)

"[Offer Name] is a [format/type] for [ideal audience] who want to [main transformation]. Through [core components], it helps them [achieve key result] without [major pain]. Backed by [proof/credibility] and [guarantee], it gives them [emotional payoff] in [timeframe]."`;
}

async function evaluateOutline(
  outline: string,
  responses: CoreOfferResponses
): Promise<{
  overall_score: number;
  strengths: string[];
  improvements_needed: string[];
  coaching_feedback: string;
}> {
  try {
    const evaluationPrompt = `As a marketing strategist, evaluate this Core Offer Outline for clarity, alignment, and conversion potential.

GENERATED OUTLINE:
${outline}

ORIGINAL USER INPUTS:
- Offer Name: ${responses.offerName}
- Main Transformation: ${responses.headlineTransformation}
- Unique Difference: ${responses.uniqueDifference}

Evaluate on these criteria:
1. **Clarity** - Is the main promise crystal clear?
2. **Emotional Resonance** - Does it connect emotionally?
3. **Differentiation** - Is it clearly different from competitors?
4. **Logical Alignment** - Does Problem → Promise → Proof → Price → Payoff flow logically?
5. **Conversion Elements** - Are there strong hooks, urgency, and risk reversal?

Provide:
1. Overall score (1-100)
2. Top 3 strengths
3. Top 3 areas needing improvement
4. Specific coaching feedback with actionable rewrites

Respond in valid JSON format:
{
  "overall_score": number,
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "improvements_needed": ["improvement 1", "improvement 2", "improvement 3"],
  "coaching_feedback": "Detailed feedback with specific suggestions..."
}`;

    const userPromptWithJson = evaluationPrompt + "\n\nIMPORTANT: Return ONLY valid JSON with no markdown formatting or code blocks.";
    
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      messages: [{ role: "user", content: userPromptWithJson }],
      max_tokens: 1500,
      temperature: 0.3,
    });

    // Zod schema for evaluation response
    const EvaluationSchema = z.object({
      overall_score: z.number().min(0).max(100),
      strengths: z.array(z.string()),
      improvements_needed: z.array(z.string()),
      coaching_feedback: z.string().min(1)
    });
    
    const evaluation = validateAnthropicJsonResponse(
      response,
      EvaluationSchema,
      "CORE_OFFER_EVALUATION"
    );
    
    return {
      overall_score: evaluation.overall_score,
      strengths: evaluation.strengths,
      improvements_needed: evaluation.improvements_needed || [],
      coaching_feedback: evaluation.coaching_feedback || "Great work! The outline is cohesive and ready to launch."
    };

  } catch (error) {
    console.error("Evaluation error:", error);
    return {
      overall_score: 75,
      strengths: ["Clear main transformation", "Good structure", "Compelling positioning"],
      improvements_needed: [],
      coaching_feedback: "Your Core Offer Outline has been generated successfully."
    };
  }
}

function generateRecommendations(
  evaluation: any,
  responses: CoreOfferResponses
): string[] {
  const recommendations: string[] = [];

  if (evaluation.overall_score < 60) {
    recommendations.push("Consider revising the main transformation to be more specific and outcome-focused");
  }

  if (evaluation.overall_score >= 60 && evaluation.overall_score < 80) {
    recommendations.push("Strong foundation - focus on adding more emotional hooks and specific proof points");
  }

  if (evaluation.overall_score >= 80) {
    recommendations.push("Excellent work! This outline is ready for launch. Consider A/B testing different headlines.");
  }

  if (!responses.testimonialsCore || responses.testimonialsCore.length < 50) {
    recommendations.push("Add client testimonials or case studies to strengthen credibility");
  }

  if (!responses.guarantee || responses.guarantee.length < 20) {
    recommendations.push("Include a strong guarantee or risk reversal to reduce buyer hesitation");
  }

  return recommendations;
}

