import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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

    const prompt = `Evaluate this Core Offer Outline section for clarity, specificity, emotional resonance, and alignment with the main transformation.

**Section Title:** ${request.sectionTitle}

**Section Content:**
${request.sectionContent}

**Main Transformation:** ${request.mainTransformation}

${request.fullOutline ? `
**Full Outline Context:**
${request.fullOutline.substring(0, 1000)}...
` : ''}

🧠 **EVALUATION CRITERIA:**

1. **Clarity** - Is the message crystal clear and specific? (1=Confusing, 5=Instantly clear)
2. **Specificity** - Are there concrete details vs vague claims? (1=Vague, 5=Concrete)
3. **Emotional Resonance** - Does it connect emotionally? (1=Flat, 5=Emotionally charged)
4. **Alignment** - Does it align with the main transformation? (1=Scattered, 5=Cohesive)

🎯 **AI WRITING RULES TO ENFORCE:**

✅ Clarity & Focus - One core message, no mixed results
✅ Specificity - "Looks like / feels like" rule applied
✅ Emotional Resonance - Logical + emotional benefits
✅ Alignment - Everything ties back to main transformation

**YOUR TASK:**
Evaluate this section and provide:
1. Category scores (1-5 for each)
2. Total score out of 20
3. Strong points (2-3)
4. Needs work (2-3)
5. Warm, actionable coaching feedback
6. Whether a rewrite would help
7. Any alignment issues with the main transformation

Return in JSON format:
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
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a confident, warm business coach evaluating Core Offer sections. Provide honest, constructive feedback with a mentor's tone - encouraging yet direct about improvements needed.`
        },
        { role: "user", content: prompt }
      ],
      max_tokens: 1500,
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const result = response.choices[0]?.message?.content;
    if (!result) {
      throw new Error("No response from AI");
    }

    const evaluation: SectionEvaluation = JSON.parse(result);
    return evaluation;

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

    const prompt = `Rewrite this Core Offer section for maximum clarity, specificity, and emotional impact.

**Section Title:** ${request.sectionTitle}

**Current Content:**
${request.sectionContent}

**Main Transformation:** ${request.mainTransformation}

**Issues to Address:**
${request.specificIssues.map(issue => `- ${issue}`).join('\n')}

🧠 **AI WRITING RULES TO APPLY:**

✅ Clarity & Focus - One core message per section
✅ Specificity - Replace vague with concrete ("looks like / feels like")
✅ Emotional Resonance - Add emotional depth to logical benefits
✅ Alignment - Tie everything back to main transformation

📏 **QUALITY & LENGTH RULES:**
• Maintain high quality with expert-level insight and emotional depth
• For each paragraph: expand by 2-3 sentences beyond the original
• Add concrete examples and emotional context where helpful
• Keep it focused and impactful - quality over quantity
• Ensure clarity and specificity in every sentence
• Use ALL key details from the original content

**YOUR TASK:**
Rewrite this section to be:
- Crystal clear and specific
- Emotionally compelling with just enough detail
- Aligned with the main transformation
- Free of jargon and vague claims
- Enhanced but concise - each paragraph 2-3 sentences longer than original

**CRITICAL: Do NOT include the section title/heading (like "2️⃣ PURPOSE & POSITIONING") in your rewritten content. Only return the actual section content, starting directly with the subsections and details.**

Return in JSON format:
{
  "rewrittenContent": "the improved section content WITHOUT any section heading or title",
  "rationale": "why this version works better (warm, educational)",
  "improvements": ["improvement 1", "improvement 2", "improvement 3"]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a skilled marketing strategist rewriting Core Offer sections. Your specialty is enhancing content with clarity and emotional impact while keeping it concise. For each paragraph, expand by 2-3 sentences to add expert insight and emotional depth. Keep the authentic voice while improving specificity and connection.`
        },
        { role: "user", content: prompt }
      ],
      max_tokens: 1500,
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const result = response.choices[0]?.message?.content;
    if (!result) {
      throw new Error("No response from AI");
    }

    const rewrite: SectionRewriteResult = JSON.parse(result);
    return rewrite;

  } catch (error) {
    console.error("Section rewrite error:", error);
    throw new Error("Failed to rewrite section");
  }
}

