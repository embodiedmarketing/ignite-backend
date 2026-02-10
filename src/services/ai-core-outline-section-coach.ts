import Anthropic from "@anthropic-ai/sdk";
import { getTextFromAnthropicContent, parseAndValidateAiJson } from "../utils/ai-response";
import { sectionEvaluationSchema, sectionRewriteResultSchema } from "../utils/ai-response-schemas";
import { PROMPT_JSON_ONLY, SYSTEM_CORE_OFFER_SECTION_EVALUATE, SYSTEM_CORE_OFFER_SECTION_REWRITE } from "../shared/prompts";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface SectionCoachingRequest {
  sectionTitle: string;
  sectionContent: string;
  mainTransformation: string;
  fullOutline?: string;
}

interface SectionEvaluation {
  qualityScore: number; // 0-100
  categoryScores: {
    clarity: { score: number; reasoning: string };
    specificity: { score: number; reasoning: string };
    emotionalResonance: { score: number; reasoning: string };
    alignment: { score: number; reasoning: string };
  };
  totalScore: number; // out of 20 (4 categories x 5 max)
  strongPoints: string[];
  needsWork: string[];
  coachingFeedback: string;
  needsRewrite: boolean;
  alignmentIssues: string[];
}

interface SectionRewriteRequest {
  sectionTitle: string;
  sectionContent: string;
  mainTransformation: string;
  specificIssues: string[];
}

interface SectionRewriteResult {
  rewrittenContent: string;
  rationale: string;
  improvements: string[];
}

export async function evaluateCoreOfferSection(
  request: SectionCoachingRequest
): Promise<SectionEvaluation> {
  try {
    console.log(`[SECTION COACH] Evaluating section: ${request.sectionTitle}`);

    const prompt = `<prompt>
  <task>Evaluate a Core Offer Outline section for clarity, specificity, emotional resonance, and alignment with the main transformation.</task>
  
  <inputs>
    <section_title>${request.sectionTitle}</section_title>
    <section_content>
      <![CDATA[
${request.sectionContent}
      ]]>
    </section_content>
    <main_transformation>${request.mainTransformation}</main_transformation>
    ${request.fullOutline ? `<full_outline_context>
      <![CDATA[
${request.fullOutline.substring(0, 1000)}...
      ]]>
    </full_outline_context>` : ''}
  </inputs>
  
  <evaluation_criteria>
    <criterion name="Clarity" scale="1-5">Is the message crystal clear and specific? (1=Confusing, 5=Instantly clear)</criterion>
    <criterion name="Specificity" scale="1-5">Are there concrete details vs vague claims? (1=Vague, 5=Concrete)</criterion>
    <criterion name="Emotional Resonance" scale="1-5">Does it connect emotionally? (1=Flat, 5=Emotionally charged)</criterion>
    <criterion name="Alignment" scale="1-5">Does it align with the main transformation? (1=Scattered, 5=Cohesive)</criterion>
  </evaluation_criteria>
  
  <ai_writing_rules>
    <rule name="Clarity & Focus">One core message, no mixed results</rule>
    <rule name="Specificity">"Looks like / feels like" rule applied</rule>
    <rule name="Emotional Resonance">Logical + emotional benefits</rule>
    <rule name="Alignment">Everything ties back to main transformation</rule>
  </ai_writing_rules>
  
  <evaluation_task>
    <step number="1">Category scores (1-5 for each)</step>
    <step number="2">Total score out of 20</step>
    <step number="3">Strong points (2-3)</step>
    <step number="4">Needs work (2-3)</step>
    <step number="5">Warm, actionable coaching feedback</step>
    <step number="6">Whether a rewrite would help</step>
    <step number="7">Any alignment issues with the main transformation</step>
  </evaluation_task>
  
  <output_format>
    <format>JSON</format>
    <schema>
      <![CDATA[
{
  "qualityScore": number (0-100 overall),
  "categoryScores": {
    "clarity": {"score": 1-5, "reasoning": "brief explanation"},
    "specificity": {"score": 1-5, "reasoning": "brief explanation"},
    "emotionalResonance": {"score": 1-5, "reasoning": "brief explanation"},
    "alignment": {"score": 1-5, "reasoning": "brief explanation"}
  },
  "totalScore": number (sum of category scores, max 20),
  "strongPoints": ["point 1", "point 2"],
  "needsWork": ["fix 1", "fix 2"],
  "coachingFeedback": "warm, specific feedback in mentor tone",
  "needsRewrite": boolean,
  "alignmentIssues": ["issue 1"] or []
}
      ]]>
    </schema>
  </output_format>
</prompt>`;

    const userPromptWithJson = prompt + PROMPT_JSON_ONLY;
    
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      temperature: 0.7,
      system: SYSTEM_CORE_OFFER_SECTION_EVALUATE,
      messages: [
        { role: "user", content: userPromptWithJson }
      ],
    });

    const contentText = getTextFromAnthropicContent(response.content);
    if (!contentText) {
      throw new Error("No response from Anthropic");
    }
    const evaluation = parseAndValidateAiJson(contentText, sectionEvaluationSchema, {
      context: "section evaluation",
    });
    return evaluation as SectionEvaluation;
  } catch (error) {
    console.error("Section coaching error:", error);
    throw new Error("Failed to evaluate section");
  }
}

export async function rewriteCoreOfferSection(
  request: SectionRewriteRequest
): Promise<SectionRewriteResult> {
  try {
    console.log(`[SECTION COACH] Rewriting section: ${request.sectionTitle}`);

    const prompt = `<prompt>
  <task>Rewrite a Core Offer section for maximum clarity, specificity, and emotional impact.</task>
  
  <inputs>
    <section_title>${request.sectionTitle}</section_title>
    <current_content>
      <![CDATA[
${request.sectionContent}
      ]]>
    </current_content>
    <main_transformation>${request.mainTransformation}</main_transformation>
    <issues_to_address>
      ${request.specificIssues.map(issue => `<issue>${issue}</issue>`).join('\n      ')}
    </issues_to_address>
  </inputs>
  
  <ai_writing_rules>
    <rule name="Clarity & Focus">One core message per section</rule>
    <rule name="Specificity">Replace vague with concrete ("looks like / feels like")</rule>
    <rule name="Emotional Resonance">Add emotional depth to logical benefits</rule>
    <rule name="Alignment">Tie everything back to main transformation</rule>
  </ai_writing_rules>
  
  <quality_length_rules>
    <rule>Maintain high quality with expert-level insight and emotional depth</rule>
    <rule>For each paragraph: expand by 2-3 sentences beyond the original</rule>
    <rule>Add concrete examples and emotional context where helpful</rule>
    <rule>Keep it focused and impactful - quality over quantity</rule>
    <rule>Ensure clarity and specificity in every sentence</rule>
    <rule>Use ALL key details from the original content</rule>
  </quality_length_rules>
  
  <rewrite_requirements>
    <requirement>Crystal clear and specific</requirement>
    <requirement>Emotionally compelling with just enough detail</requirement>
    <requirement>Aligned with the main transformation</requirement>
    <requirement>Free of jargon and vague claims</requirement>
    <requirement>Enhanced but concise - each paragraph 2-3 sentences longer than original</requirement>
  </rewrite_requirements>
  
  <critical_instruction>
    Do NOT include the section title/heading (like "2️⃣ PURPOSE & POSITIONING") in your rewritten content. 
    Only return the actual section content, starting directly with the subsections and details.
  </critical_instruction>
  
  <output_format>
    <format>JSON</format>
    <schema>
      <![CDATA[
{
  "rewrittenContent": "the improved section content WITHOUT any section heading or title",
  "rationale": "why this version works better (warm, educational)",
  "improvements": ["improvement 1", "improvement 2", "improvement 3"]
}
      ]]>
    </schema>
  </output_format>
</prompt>`;

    const userPromptWithJson = prompt + PROMPT_JSON_ONLY;
    
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      temperature: 0.7,
      system: SYSTEM_CORE_OFFER_SECTION_REWRITE,
      messages: [
        { role: "user", content: userPromptWithJson }
      ],
    });

    const contentText = getTextFromAnthropicContent(response.content);
    if (!contentText) {
      throw new Error("No response from Anthropic");
    }
    const rewrite = parseAndValidateAiJson(contentText, sectionRewriteResultSchema, {
      context: "section rewrite",
    });
    return rewrite as SectionRewriteResult;
  } catch (error) {
    console.error("Section rewrite error:", error);
    throw new Error("Failed to rewrite section");
  }
}

