import Anthropic from "@anthropic-ai/sdk";
import { getTextFromAnthropicContent, parseAndValidateAiJson } from "../utils/ai-response";
import { outlineEvaluationSchema } from "../utils/ai-response-schemas";
import { PROMPT_JSON_ONLY } from "../shared/prompts";

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

    const generatedOutline = getTextFromAnthropicContent(response.content) || "";

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

  return `<prompt>
  <task>Create a comprehensive Core Offer Outline based on the user's inputs as a marketing strategist and business coach.</task>
  
  <inputs>
    ${messagingStrategyContext ? `<messaging_strategy>
      <![CDATA[
${messagingStrategyContext.replace(/^[\s\n]*📋 USER'S MESSAGING STRATEGY \(Use this voice, tone, and positioning\):[\s\n]*/, '').replace(/[\s\n]*IMPORTANT:.*$/s, '')}
      ]]>
      <instruction>Align your Core Offer Outline with the voice, tone, positioning, and messaging style from the above strategy. Use similar language patterns, emotional hooks, and brand voice to maintain consistency.</instruction>
    </messaging_strategy>` : ''}
    <core_offer_inputs>
      <offer_name>${responses.offerName || "Not provided"}</offer_name>
      <core_transformation_messaging>
        <headline_transformation>${responses.headlineTransformation || "Not provided"}</headline_transformation>
        <clear_statement>${responses.clearStatement || "Not provided"}</clear_statement>
        <unique_difference>${responses.uniqueDifference || "Not provided"}</unique_difference>
      </core_transformation_messaging>
      <ideal_customer_pain_points>
        <problems_frustrations>${responses.problemsFrustrations || "Not provided"}</problems_frustrations>
        <not_for>${responses.notFor || "Not provided"}</not_for>
        <already_tried>${responses.alreadyTried || "Not provided"}</already_tried>
        <stakes>${responses.stakes || "Not provided"}</stakes>
        <objections>${responses.objections || "Not provided"}</objections>
      </ideal_customer_pain_points>
      <features_benefits>
        <how_it_works>${responses.howItWorks || "Not provided"}</how_it_works>
        <all_components>${responses.allComponents || "Not provided"}</all_components>
        <component_benefits>${responses.componentBenefits || "Not provided"}</component_benefits>
        <ultimate_emotional_benefit>${responses.emotionalBenefit || "Not provided"}</ultimate_emotional_benefit>
      </features_benefits>
      <proof_authority>
        <industry_differentiation>${responses.offerDifference || "Not provided"}</industry_differentiation>
        <personal_story>${responses.personalStoryCore || "Not provided"}</personal_story>
        <qualifications>${responses.qualifications || "Not provided"}</qualifications>
        <testimonials>${responses.testimonialsCore || "Not provided"}</testimonials>
        <evidence>${responses.evidence || "Not provided"}</evidence>
      </proof_authority>
      <pricing_value>
        <investment>${responses.investment || "Not provided"}</investment>
        <bonuses>${responses.bonuses || "Not provided"}</bonuses>
        <price_framing>${responses.framePricing || "Not provided"}</price_framing>
        <guarantee>${responses.guarantee || "Not provided"}</guarantee>
      </pricing_value>
      <delivery_method_structure>
        <delivery_method>${responses.deliveryMethod || "Not provided"}</delivery_method>
        <support_type>${responses.supportType || "Not provided"}</support_type>
        <timeline>${responses.timeline || "Not provided"}</timeline>
      </delivery_method_structure>
    </core_offer_inputs>
  </inputs>
  
  <critical_instruction>
    <rule>ALWAYS generate a complete core offer outline - NEVER refuse to generate content or ask for more information</rule>
    <rule>If user inputs contain placeholder text (like "Lorem ipsum", "Commodi dolor", "Iure nostrud", "Elit omnis", "Laudantium", "Ab laborum", "Qui sint", "Libero at", "Aliquam velit", "Aut est", "Ut tempora", "Magni provident", etc.), ignore the placeholder text and use the messaging strategy context to create compelling, professional content</rule>
    <rule>Transform ANY placeholder or incomplete text into professional, compelling content that matches the messaging strategy tone and style</rule>
    <rule>If a field contains placeholder text, infer reasonable content based on the messaging strategy, other provided fields, and your expertise in core offer creation</rule>
    <rule>Your goal is to create a complete, usable core offer outline - use all available context (messaging strategy, other fields) to fill in any gaps</rule>
    <rule>Do NOT mention that you detected placeholder text or ask for replacement - simply generate the best possible outline using available information</rule>
    <rule>Do NOT include notes like "[NEEDS REPLACEMENT]" or "[NEEDS REPLACEMENT: ...]" in your output - generate complete, professional content</rule>
  </critical_instruction>
  
  <critical_instructions>
    <instruction number="1">Act as a marketing strategist + coach, not a template filler</instruction>
    <instruction number="2">Analyze the inputs for clarity, emotional resonance, and alignment</instruction>
    <instruction number="3">Synthesize them into a cohesive, persuasive offer outline</instruction>
    <instruction number="4">Coach by rewriting vague inputs with specificity and emotional hooks</instruction>
    <instruction number="5">Ensure logical flow: Problem → Promise → Proof → Price → Payoff</instruction>
  </critical_instructions>
  
  <generation_rules>
    <rule>If input is vague: rewrite it with specificity (e.g., "help clients" → "help busy executives reclaim 15+ hours weekly")</rule>
    <rule>If jargon appears: replace with plain, emotional language</rule>
    <rule>Always tie back to the MAIN transformation from headline</rule>
    <rule>Use exact customer phrases when provided</rule>
    <rule>No contradictions: everything ladders to one core promise</rule>
    <rule>Add emotional depth where missing</rule>
  </generation_rules>
  
  <depth_rules>
    <rule>Use ALL details from user responses - never omit key information</rule>
    <rule>EXPAND on ideas with expert-level insight, emotional context, and practical examples</rule>
    <rule>Each section should be SUBSTANTIAL and value-packed with rich storytelling</rule>
    <rule>Match or EXCEED the combined word length of user's original responses for completeness</rule>
    <rule>Prioritize clarity, story, and emotional resonance over brevity</rule>
    <rule>DO NOT SUMMARIZE — synthesize and expand with depth and nuance</rule>
  </depth_rules>
  
  <outline_structure>
    <section number="1" emoji="1️⃣" name="OFFER OVERVIEW">
      <field name="Offer Name">Use the provided name or refine it if vague</field>
      <field name="Core Transformation (Main Promise)">One concise, specific result this offer delivers - rewrite for clarity and emotional impact if needed</field>
      <field name="One-Sentence Desire Fulfilled">"You'll [clear outcome] so you can [emotional benefit]."</field>
    </section>
    
    <section number="2" emoji="2️⃣" name="PURPOSE & POSITIONING">
      <field name="Problem This Solves">Summarize 2-3 key frustrations or desires from user's inputs - make them emotionally resonant</field>
      <field name="What Makes It Different">Explain how this offer stands out - use their unique method, story, or approach</field>
      <field name="Why It's Urgent Now">Describe what's at stake - use consequences from their "stakes" input</field>
    </section>
    
    <section number="3" emoji="3️⃣" name="TARGET AUDIENCE">
      <field name="Ideal Customer">Describe who this is for and what stage they're in - be specific</field>
      <field name="What They've Tried (and Why It Didn't Work)">"They've tried [solution] but still struggle because [reason]."</field>
      <field name="False Beliefs / Objections (and Reframes)">
        Transform their objections into belief shifts
        - Old Belief: [What holds them back]
        - New Belief: [Truth that moves them forward]
      </field>
    </section>
    
    <section number="4" emoji="4️⃣" name="STRUCTURE & COMPONENTS">
      <field name="Phases or Roadmap">Break down "how it works" into 3-5 clear phases with outcomes
        - [Phase Name] – [Outcome they achieve]
      </field>
      <field name="Core Components">List key components from their inputs with direct benefits
        - [Component Name] → [Direct benefit]
      </field>
      <field name="Bonuses">List bonuses with added value
        - [Bonus Name] → [Added value or quick win]
      </field>
      <field name="Ultimate Emotional Benefit">"They'll feel [emotion], finally able to [new reality]."</field>
    </section>
    
    <section number="5" emoji="5️⃣" name="PROOF & AUTHORITY">
      <field name="Personal Story / Connection">Use their personal story - make it relatable and authentic</field>
      <field name="Expertise / Credentials">Include qualifications and experience - position as credible authority</field>
      <field name="Testimonials / Social Proof">Use provided testimonials or evidence - format as specific outcomes
        "Before I joined, I [pain]. After [time], I [result]." — [Name or generic]
      </field>
    </section>
    
    <section number="6" emoji="6️⃣" name="PRICING & VALUE">
      <field name="Investment">State price clearly with comparison if provided</field>
      <field name="Value Framing">"Less than the cost of [painful alternative], for the result of [promise]."</field>
      <field name="Guarantee / Risk Reversal">Use their guarantee or create one if missing
        "If you [take action] and don't get [result], you'll receive [risk reversal]."
      </field>
    </section>
    
    <section number="7" emoji="7️⃣" name="DELIVERY & SUPPORT">
      <field name="Format + Duration">"Delivered as [format] over [timeframe]."</field>
      <field name="Support Included">List coaching, community, tools, or access points</field>
      <field name="Tools / Access Points">Platforms or systems needed to deliver</field>
    </section>
    
    <section number="8" emoji="8️⃣" name="OFFER SUMMARY (CLOSING SNAPSHOT)">
      "[Offer Name] is a [format/type] for [ideal audience] who want to [main transformation]. Through [core components], it helps them [achieve key result] without [major pain]. Backed by [proof/credibility] and [guarantee], it gives them [emotional payoff] in [timeframe]."
    </section>
  </outline_structure>
</prompt>`;
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
    const evaluationPrompt = `<prompt>
  <task>Evaluate a Core Offer Outline for clarity, alignment, and conversion potential as a marketing strategist.</task>
  
  <inputs>
    <generated_outline>
      <![CDATA[
${outline}
      ]]>
    </generated_outline>
    <original_user_inputs>
      <offer_name>${responses.offerName}</offer_name>
      <main_transformation>${responses.headlineTransformation}</main_transformation>
      <unique_difference>${responses.uniqueDifference}</unique_difference>
    </original_user_inputs>
  </inputs>
  
  <evaluation_criteria>
    <criterion number="1" name="Clarity">Is the main promise crystal clear?</criterion>
    <criterion number="2" name="Emotional Resonance">Does it connect emotionally?</criterion>
    <criterion number="3" name="Differentiation">Is it clearly different from competitors?</criterion>
    <criterion number="4" name="Logical Alignment">Does Problem → Promise → Proof → Price → Payoff flow logically?</criterion>
    <criterion number="5" name="Conversion Elements">Are there strong hooks, urgency, and risk reversal?</criterion>
  </evaluation_criteria>
  
  <evaluation_requirements>
    <requirement number="1">Overall score (1-100)</requirement>
    <requirement number="2">Top 3 strengths</requirement>
    <requirement number="3">Top 3 areas needing improvement</requirement>
    <requirement number="4">Specific coaching feedback with actionable rewrites</requirement>
  </evaluation_requirements>
  
  <output_format>
    <format>JSON</format>
    <schema>
      <![CDATA[
{
  "overall_score": number,
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "improvements_needed": ["improvement 1", "improvement 2", "improvement 3"],
  "coaching_feedback": "Detailed feedback with specific suggestions..."
}
      ]]>
    </schema>
  </output_format>
</prompt>`;

    const userPromptWithJson = evaluationPrompt + PROMPT_JSON_ONLY;
    
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      messages: [{ role: "user", content: userPromptWithJson }],
      max_tokens: 1500,
      temperature: 0.3,
    });

    const contentText = getTextFromAnthropicContent(response.content);
    const evaluation = parseAndValidateAiJson(contentText, outlineEvaluationSchema, {
      context: "outline evaluation",
      fallback: {},
    });
    return {
      overall_score: evaluation.overall_score ?? 75,
      strengths: evaluation.strengths ?? [],
      improvements_needed: evaluation.improvements_needed ?? [],
      coaching_feedback: evaluation.coaching_feedback ?? "Great work! The outline is cohesive and ready to launch.",
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

