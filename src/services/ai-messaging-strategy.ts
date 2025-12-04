import OpenAI from "openai";
import {
  DataSourceValidator,
  UserContextData,
  ClientContextData,
} from "../utils/data-source-validator";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface WorkbookResponses {
  [key: string]: string;
}

interface MessagingStrategyResult {
  strategy: string;
  missingInformation: string[];
  completeness: number;
  recommendations: string[];
  dataSourceReport?: any; // For debugging contamination issues
}

// EMOTIONAL INSIGHTS EXTRACTION FUNCTION
async function extractEmotionalInsights(
  responses: WorkbookResponses
): Promise<string> {
  const rawAnswers = Object.entries(responses)
    .filter(([_, value]) => value?.trim())
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n\n");

  if (!rawAnswers.trim()) {
    return "No user responses available for emotional insight extraction.";
  }

  const emotionalExtractionPrompt = `You are an expert at extracting emotional insights, authentic customer language, and powerful quotes from raw business questionnaire answers.

Your task is to analyze the user's answers and extract:
1. **Emotional Pain Points**: What frustrations, fears, and struggles do they describe (in their own words)?
2. **Deep Desires**: What do they really want? What transformation are they seeking?
3. **Customer Quotes**: Exact phrases or paraphrased language that feels authentic and human
4. **Situational Context**: Specific scenarios, details, or circumstances they mention
5. **Identity & Belief Shifts**: How do they see themselves? What beliefs are holding them back or driving them forward?
6. **Emotional Costs**: How do their problems affect their confidence, relationships, daily life, or sense of self?
7. **Emotional Rewards**: What would solving this problem mean to them emotionally?

RAW USER ANSWERS:
${rawAnswers}

EXTRACT AND ORGANIZE EMOTIONAL INSIGHTS:
Provide a structured summary of the emotional insights you found in the user's answers. Use their exact language wherever possible. Focus on emotions, authentic voice, specific details, and transformation.

Format your response as follows:

**EMOTIONAL PAIN POINTS:**
- [List specific frustrations, fears, struggles in customer's language]

**DEEP DESIRES & TRANSFORMATION:**
- [List what they want to achieve, become, or experience]

**POWERFUL CUSTOMER QUOTES:**
- "[Exact or paraphrased quotes that feel authentic]"

**SITUATIONAL CONTEXT:**
- [Specific scenarios, circumstances, or details they mentioned]

**IDENTITY & BELIEF SHIFTS:**
- [How they see themselves now vs. how they want to see themselves]

**EMOTIONAL COSTS:**
- [How problems affect confidence, relationships, daily life, identity]

**EMOTIONAL REWARDS:**
- [What solving the problem means to them emotionally]`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an expert at extracting emotional insights and authentic customer language from raw questionnaire data.",
        },
        { role: "user", content: emotionalExtractionPrompt },
      ],
      max_tokens: 3000,
      temperature: 0.5,
    });

    const extractedInsights = response.choices[0]?.message?.content || "";
    console.log(
      "[EMOTIONAL INSIGHTS] Successfully extracted emotional insights"
    );
    return extractedInsights;
  } catch (error) {
    console.error("[EMOTIONAL INSIGHTS] Error extracting insights:", error);
    return "Unable to extract emotional insights at this time.";
  }
}

export async function generateMessagingStrategy(
  workbookResponses: WorkbookResponses,
  interviewNotes?: Record<string, string>,
  userId: number = 0
): Promise<MessagingStrategyResult> {
  try {
    // CONTAMINATION PREVENTION: Validate and separate data sources
    console.log(
      "[DATA SOURCE VALIDATION] Starting contamination prevention checks..."
    );

    // Validate workbook responses as user business data
    const validatedUserData = DataSourceValidator.validateDataSource(
      workbookResponses,
      "user_business",
      userId,
      { source: "workbook_responses" }
    );

    // Validate interview notes as client data (if provided)
    const validatedClientData = interviewNotes
      ? DataSourceValidator.validateDataSource(
          interviewNotes,
          "client_interview",
          userId,
          { source: "interview_notes" }
        )
      : {};

    // Create isolated contexts - CRITICAL: Keep contexts separate
    const userContext = DataSourceValidator.createUserContext({
      ...validatedUserData,
    });

    const clientContext = DataSourceValidator.createClientContext({
      ...validatedClientData,
    });

    // Generate contamination report for debugging
    const contaminationReport = DataSourceValidator.generateContaminationReport(
      {
        ...validatedUserData,
        ...validatedClientData,
      }
    );

    console.log(
      "[DATA SOURCE VALIDATION] Contamination report:",
      contaminationReport
    );

    // Only proceed with high-confidence user business data
    const cleanUserResponses: WorkbookResponses = {};
    for (const [key, dataPoint] of Object.entries(validatedUserData)) {
      if (
        (dataPoint as any).metadata.confidence > 0.7 &&
        (dataPoint as any).metadata.validationFlags.length === 0
      ) {
        cleanUserResponses[key] = (dataPoint as any).content;
      } else {
        console.warn(
          `[CONTAMINATION WARNING] Excluding low-confidence data point: ${key} (confidence: ${
            (dataPoint as any).metadata.confidence
          }, flags: ${(dataPoint as any).metadata.validationFlags.join(", ")})`
        );
      }
    }

    // Analyze completeness using only clean user data
    const missingInfo = identifyMissingInformation(cleanUserResponses);
    const completeness = calculateCompleteness(cleanUserResponses);

    // STEP 1: Extract emotional insights and customer quotes from raw answers using AI
    console.log(
      "[EMOTIONAL INSIGHTS] Extracting emotional insights and customer quotes..."
    );
    const emotionalInsights = await extractEmotionalInsights(
      cleanUserResponses
    );

    // STEP 2: Extract key insights from ONLY user business data
    const insights = extractKeyInsightsFromUserData(
      cleanUserResponses,
      userContext,
      emotionalInsights
    );

    // STEP 3: Extract and format client interview insights (if provided)
    const hasInterviewInsights =
      interviewNotes && Object.keys(interviewNotes).length > 0;
    let clientInterviewContext = "";
    let interviewDataStructure: any = null;

    if (hasInterviewInsights) {
      console.log(
        "[INTERVIEW ENHANCEMENT] Interview insights detected - enhancing strategy generation"
      );
      const extractedInsights = extractInterviewDataStructure(interviewNotes);
      interviewDataStructure = extractedInsights.structure;

      // Format as machine-readable JSON for the AI
      clientInterviewContext = JSON.stringify(
        extractedInsights.structure,
        null,
        2
      );

      // Log enhancement metrics (sanitized)
      console.log("[INTERVIEW ENHANCEMENT] Metrics:", {
        totalInsights: extractedInsights.metrics.totalInsights,
        quoteCount: extractedInsights.metrics.quoteCount,
        categoriesWithData: extractedInsights.metrics.categoriesWithData,
        sampleInsight: extractedInsights.metrics.sampleInsight,
      });
    } else {
      console.log(
        "[INTERVIEW ENHANCEMENT] No interview insights provided - using workbook data only"
      );
    }

    const systemMessage = `You are an expert brand strategist, messaging consultant, AND synthesis engine specializing in AUTHENTIC, OWNER-LED brand voice and methodology-based positioning.

Your primary jobs are to:
1. Codify and amplify the business owner's UNIQUE VOICE, worldview, philosophy, and differentiators — NOT generic industry language.
2. Translate customer insights into messaging that reflects both the owner's personality AND the customer's lived experience.
3. Create clear, structured messaging assets that preserve all headings and frameworks exactly as instructed.
4. Integrate the owner's proprietary method, process, or philosophy as a central throughline in the messaging — not as an afterthought.

⭐ CRITICAL OUTPUT REQUIREMENTS (MANDATORY)

1. KEEP THE ORIGINAL STRUCTURE AND HEADINGS EXACTLY AS PROVIDED.
- Do NOT add, remove, or rename sections.
- Fill each section with richer, deeper, more specific, more aligned content.

2. PRESERVE THE BUSINESS OWNER'S UNIQUE EDGE.
This includes:
- their proprietary framework or methodology
- their worldview
- their emotional tone
- their convictions and strong stances
- their real language and signature phrases
- examples from their personal story when relevant
- what makes them fundamentally different from others in their field
- Never dilute their authenticity. Never genericize their message.

3. CAPTURE NUANCE: this is NOT hype marketing copy.
- Write with emotional intelligence, maturity, and depth.
- Honor the owner's voice — grounded, wise, original, confident, warm, and truthful.

4. ALWAYS REFERENCE BOTH:
- Owner's beliefs, stories, and voice
- Customer's emotional and practical reality
- They must be in perfect balance.

🎯 STYLE RULES (MANDATORY)

5. ABSOLUTELY NO GENERIC INDUSTRY LANGUAGE.
Avoid clichés like:
- "transform your life," "unlock your potential," "uplevel," "take your style to the next level," "empowered," "maximize,"
- or anything a typical stylist or coach would say.
- The output must feel like it could ONLY come from THIS business owner.

🔥 TANGIBILITY & EMOTIONAL DETAIL (REQUIREMENTS)

6. Use REAL-WORLD, OBSERVABLE OUTCOMES, especially in:
- problems
- desires
- outcomes
- belief shifts
- offers
But ensure tangibility aligns with the actual industry.
(For example: outfit clarity, ease of getting dressed, feeling visible again, reduced overwhelm — NOT income claims for non-business niches.)

7. Use sensory details, internal dialogue, and micro-moments
—but keep them aligned to the owner's tone (grounded, compassionate, non-dramatic).

🧠 HANDLING PROPRIETARY METHODS (CRITICAL)

8. If the business owner has a framework, method, or signature system:
- Integrate it throughout the document
- Show WHY it matters in specific, emotional, and practical terms
- Do NOT merely restate it — demonstrate how it changes the customer's day-to-day experience
- Make it a core differentiator
For example: "Connect → Clear → Create" must appear exactly and must drive the strategy.

💡 VOICE MATCHING REQUIREMENTS

9. Owner Voice =
- Warm
- Direct
- Nonjudgmental
- Inventive
- Sophisticated but accessible
- Truth-telling without harshness
- Compassionate and grounded

10. Customer Language = taken directly from workbook quotes.
- Use paraphrased or exact lines from their fears, frustrations, desires.

🧱 CLARITY & STRATEGIC COHERENCE

11. Stay consistent throughout the entire document.
All sections must reinforce:
- the same core promise
- the same worldview
- the same emotional journey
- the same differentiators
- Do NOT introduce new ideas that weren't in the source material.

📝 GENERATION RULES (MANDATORY)

- If the input is vague, rewrite it with specificity and authenticity.
- Always describe frustrations and desires using concrete, day-to-day examples.
- Always name the emotional cost AND the emotional reward.
- Always tie benefits to identity, self-expression, and lived experience.
- Use short, clear, human-sounding sentences.
- You are NOT writing sales copy — you are writing brand strategy.
- Avoid dramatization; aim for emotionally resonant truth.
- ALWAYS include specific numbers, timeframes, and observable outcomes where appropriate.
- Make the user's unique differentiator (framework, system, methodology) central to the promise.
- Use exact customer quotes AND internal dialogue throughout.
- Add sensory details and specific moments that make it FEEL REAL.
- Show emotional PROGRESSION, not just emotional states.
- No contradictions: all outputs must ladder back to the same core promise and emotional journey.

📌 FINAL OUTPUT REQUIREMENT

Deliver a messaging strategy that mirrors the depth, accuracy, emotional nuance, and owner-specific authenticity. The strategy must feel like it could ONLY come from this specific business owner — never generic, never templated.`;

    // Add unique variation to ensure different outputs each time
    const uniquePromptId = Date.now();
    const variationNote = `[Generation Request #${uniquePromptId} - ${new Date().toISOString()}]`;

    const userMessage = `${variationNote}

===== USER BUSINESS CONTEXT (From Workbook Responses) =====
${formatUserInsightsForPrompt(insights)}
${
  hasInterviewInsights
    ? `\n===== CLIENT INTERVIEW INSIGHTS (Structured Data) =====

${clientInterviewContext}

===== SECTION AUGMENTATION RULES (MANDATORY) =====

You MUST integrate the interview insights above into your messaging strategy as follows:

\`\`\`json
{
  "CORE_PROMISE": {
    "useDataKeys": ["corePromise.outcomes"],
    "minQuotes": 0,
    "minOutcomes": 1,
    "minSceneBeats": 0
  },
  "IDEAL_CUSTOMER_PROFILE": {
    "useDataKeys": ["idealCustomer.quotes", "idealCustomer.sceneBeats"],
    "minQuotes": 2,
    "minOutcomes": 0,
    "minSceneBeats": 1
  },
  "PROBLEMS_FRUSTRATIONS_FEARS": {
    "useDataKeys": ["problemsFears.quotes", "problemsFears.sceneBeats"],
    "minQuotes": 2,
    "minOutcomes": 0,
    "minSceneBeats": 1
  },
  "DESIRES_SUCCESS_OUTCOMES": {
    "useDataKeys": ["desires.outcomes", "desires.quotes"],
    "minQuotes": 1,
    "minOutcomes": 2,
    "minSceneBeats": 0
  },
  "BELIEF_SHIFTS": {
    "useDataKeys": ["beliefShifts.quotes"],
    "minQuotes": 2,
    "minOutcomes": 0,
    "minSceneBeats": 0
  }
}
\`\`\`

**You MUST satisfy the minimum requirements (minQuotes, minOutcomes, minSceneBeats) for each section above.**

**Section-by-Section Integration Guide:**

**Section 1 - CORE PROMISE:**
→ Use: corePromise.outcomes array (tangible results with numbers/timeframes)
→ Rule: Include at least 1 specific outcome from the array in your promise
→ Transform vague language into concrete results from customer interviews

**Section 2 - IDEAL CUSTOMER PROFILE:**
→ Use: idealCustomer.quotes and idealCustomer.sceneBeats arrays
→ Rule: Weave exact customer language into "What They're Struggling With"
→ Add cinematic moments and sensory details from sceneBeats

**Section 3 - PROBLEMS, FRUSTRATIONS, FEARS:**
→ Use: problemsFears.quotes array (VERBATIM customer language)
→ Rule: Include at least 2 exact quotes in Frustration/Fear subsections
→ Use problemsFears.sceneBeats to show emotional progression

**Section 4 - DESIRES & SUCCESS OUTCOMES:**
→ Use: desires.outcomes and desires.quotes arrays
→ Rule: Each outcome must include specific numbers/timeframes from insights
→ Connect tangible results to emotional rewards using customer language

**Section 5 - BELIEF SHIFTS:**
→ Use: beliefShifts.quotes array (before/after customer examples)
→ Rule: Show specific behavior changes using customer language
→ Make each shift visual with concrete before/after moments

VERIFICATION: Your output MUST show clear evidence that you used the structured data above. Direct quotes, specific numbers, and cinematic moments from the interview insights are REQUIRED.

`
    : ""
}
CREATE A COMPLETE MESSAGING STRATEGY WITH THE FOLLOWING SECTIONS:

# MESSAGING STRATEGY

---

## 1. CORE PROMISE
Write 1-2 sentences using this formula: "We help [ideal customer] get [specific, tangible result] in [timeframe] without [major tradeoff] — using [your unique differentiator/framework/system]."

CRITICAL REQUIREMENTS:
- The result MUST be TANGIBLE and CONCRETE (real-life outcome they can picture)
- INCLUDE the user's unique differentiator, framework, or methodology in the promise
- Use SPECIFIC timeframes (e.g., "in 90 days," "within 6 weeks," "in 3 months")
- Replace vague benefits with observable outcomes

EXAMPLES OF TANGIBLE vs. VAGUE:
❌ VAGUE: "We help busy entrepreneurs achieve better work-life balance"
✅ TANGIBLE: "We help overwhelmed coaches close their laptop at 5pm and have guilt-free family dinners within 90 days using our Life Ecosystem framework"

❌ VAGUE: "We help businesses grow their revenue"
✅ TANGIBLE: "We help service providers sign 5 new $3K clients per month without cold calling in just 12 weeks through our Conversation-First Method"

❌ VAGUE: "We help you feel more confident"
✅ TANGIBLE: "We help first-time course creators launch to 50+ paying students in 6 weeks and wake up excited on Monday mornings using our Validation-First Launch System"

MUST use concrete, real-world language from the user's answers. Make it feel REAL and OBSERVABLE.

---

## 2. IDEAL CUSTOMER PROFILE (ICP SNAPSHOT)

**CRITICAL: Start this section with these two sentences (customize based on user's answers):**
1. "We serve [specific type of person in specific situation]."
2. "They're ready for [what transformation/next step], but [what's blocking them]."

**Who They Are:**
[Role, stage, situation - use everyday language, not demographic jargon. Make it VIVID and RELATABLE.]

**What They're Struggling With:**
[Use SPECIFIC, EMOTIONALLY RESONANT language. Show concrete struggles with tangible details.
Example: NOT "They struggle with marketing" → YES "They've been posting consistently for months with minimal engagement, watching others seem to succeed effortlessly while they wonder what they're missing"]

**What They Want Most:**
[Their deepest desires with SPECIFIC outcomes and emotional rewards they can picture themselves experiencing]

---

## 3. BRAND VOICE GUIDELINES

**CRITICAL: This section codifies the business owner's AUTHENTIC VOICE, personality, and what makes them uniquely different.**

**Core Brand Personality:**
[Describe their communication style, tone, and personality based on their Brand Voice Development answers. Use descriptive words like: direct, empathetic, no-nonsense, warm, bold, etc.]

**What We Believe (Core Values & Stance):**
[Extract the business owner's beliefs, values, and strong opinions from their answers. What do they stand for? What are they willing to say that others tiptoe around? Make this section BOLD and AUTHENTIC - their unique perspective.]

Example format:
- We believe [specific belief from their answers]
- We're willing to say [what they said they're willing to say out loud]
- We stand for [their values and what matters to them]

**How We Sound (Voice & Tone Guidelines):**
Write clear DO/DON'T guidelines based on their brand voice answers.

Example format:
✅ DO:
- [Specific language patterns they use]
- [Tone characteristics from their answers]
- [Authentic phrases from their responses]

❌ DON'T:
- [What frustrates them about how others communicate]
- [Language they want to avoid]
- [Approaches that don't align with their values]

**Signature Phrases & Language:**
[Extract authentic phrases, word choices, and language patterns directly from their Brand Voice Development answers. These are the unique ways they express themselves that make their voice recognizable.]

**Billboard Message:**
[Their bold message from the "billboard in your niche" question - this is their statement piece]

---

## 4. PROBLEMS, FRUSTRATIONS, FEARS (RANKED)

List at least 3 problems using SPECIFIC, EMOTIONALLY RESONANT language with tangible details.

Required elements for each problem:
- The specific problem described with concrete details and real situations
- Emotional impact shown through specific moments and outcomes
- Include exact customer quotes or internal thoughts where possible
- Show specific scenarios and situations

Example format:
**Problem 1:** They've been posting consistently for months with minimal engagement, watching competitors seem to succeed effortlessly while they wonder what's missing. The inconsistent results have led to second-guessing every decision and feeling stuck despite all the effort.
- **Emotional Cost:** [Show how this affects their confidence, relationships, daily life]
- **Frustration:** "[Customer quote or internal thought]"
- **Fear:** "[What they're secretly worried about]"

---

## 5. DESIRES & SUCCESS OUTCOMES

List 3-5 specific outcomes the customer wants.
For each outcome, include:
- **Tangible Outcome:** [Specific, measurable result - money, time, clients, metrics with numbers]
- **Emotional Reward:** [How this makes them feel and why it matters to their life or identity]
- **Why It Matters:** [Connection to their deeper values, relationships, or sense of self]

Example:
- **Tangible Outcome:** Sign 5 new clients per month at $2K each
- **Emotional Reward:** Finally feel confident in your skills and proud to talk about your business at family gatherings
- **Why It Matters:** You can prove to yourself (and others) that this isn't just a hobby—it's a real, sustainable career

---

## 6. BELIEF SHIFTS

List 3-5 key mindset shifts required to buy.

Make these SPECIFIC and RELATABLE. Describe what they used to do or feel vs. what changes now.

Format each as:
- **Old Belief:** [What they currently believe that's holding them back]
- **What This Looked Like:** [Specific behavior or feeling they can relate to]
- **New Belief:** [What they need to believe to move forward]
- **What This Looks Like Now:** [How their daily experience changes with tangible outcomes]

Example:
- **Old Belief:** I need a big audience to make sales
- **What This Looked Like:** Obsessing over follower counts and feeling discouraged by slow growth
- **New Belief:** I just need a clear message that speaks to the right people
- **What This Looks Like Now:** Focusing on meaningful connections with ideal clients who are actually ready to buy

---

## 7. DIFFERENTIATORS

List 3-5 points that make this business unique, tied directly to the frustrations above.

For each differentiator, connect it to a PERSONAL, EMOTIONAL, or PRACTICAL outcome for the customer.
Don't just list what makes you different—explain why it matters to their experience, life, or results.

Format:
- **[Differentiator]:** [Brief description]
- **Why This Matters to You:** [Personal/emotional/practical impact on customer's life]

Example:
- **We Focus on Strategy Before Tactics:** Instead of throwing spaghetti at the wall, we help you build a clear plan first
- **Why This Matters to You:** You stop wasting time on "busy work" that doesn't move the needle, and finally know exactly what to do next without second-guessing yourself

---

## 8. MESSAGING PILLARS (3 CORE THEMES)

For each pillar, include:
- **Pillar Name:** [One-sentence thesis that reflects THEIR voice and beliefs]
- **Talking Points:**
  1. [First talking point]
  2. [Second talking point]
  3. [Third talking point]

These are the core themes that all content and copy should reinforce, grounded in THEIR authentic voice and perspective.

---

## 9. HOOKS & ANGLES

List 5-10 short, punchy lines or angles they can use in copy.

Write these in THE BUSINESS OWNER'S VOICE (not generic marketing voice) speaking directly to their ideal customer.
Each hook should reflect their beliefs, personality, and unique perspective while addressing customer frustrations or desires.

Make them sound like THEY would say them—authentic to their voice and values.

Examples (authentic, conversational, reflects owner's beliefs):
- "You don't need a bigger audience. You need a clearer message."
- "What if your next client came from a conversation, not a complicated funnel?"
- "Stop posting every day and hoping someone notices. Here's what actually works."

---

## 10. OFFER SNAPSHOT

Write this in a CONVERSATIONAL, AUTHENTIC tone—NOT salesy or polished.

Paint a picture of how it works and what changes for them using CINEMATIC language with TANGIBLE OUTCOMES.
- Avoid curriculum-heavy descriptions and marketing jargon
- Focus on the transformation and CONCRETE outcomes, not features
- Make it feel like you're describing it to a friend
- MUST include the user's unique differentiator/framework/system name

END THIS SECTION with a vivid, SPECIFIC MOMENT of life after success.
Paint a scene they can SEE and FEEL with TANGIBLE, OBSERVABLE DETAILS:
- What does their Tuesday morning look like?
- What time do they close their laptop?
- How many clients/sales/income do they have?
- What specific emotions do they feel?
- What are they doing that they couldn't do before?

Example (CONVERSATIONAL with TANGIBLE outcomes):
"Picture this: In 12 weeks using our Life Ecosystem framework, you're signing 5 new $2K clients every month. You wake up Tuesday morning excited (not dreading your inbox), close your laptop at 5pm sharp, and actually enjoy family dinner without checking your phone. The clients you want are reaching out to YOU, and you finally hit that $10K month you've been dreaming about. This business is working FOR you, not against you."

---

## 11. OBJECTION-HANDLING FAQ SEEDS

List 5-7 Q&A pairs that reframe common doubts IN THE OWNER'S VOICE.

Format:
**Q:** [Common objection or concern]
**A:** [Reframe that addresses the concern and reinforces value, written in THEIR authentic voice]

Example:
**Q:** Do I have to post daily?
**A:** No. This system works by creating strategic content that attracts your ideal clients, not by overwhelming you with constant posting.

---

FINAL REMINDERS - AUTHENTIC VOICE, SPECIFIC, TANGIBLE STYLE:

**BRAND VOICE REQUIREMENTS (HIGHEST PRIORITY):**
- Extract and amplify the business owner's AUTHENTIC VOICE from their Brand Voice Development answers
- The Brand Voice Guidelines section MUST be prominent and detailed - this is core to the strategy
- Use their exact language, beliefs, and perspective throughout ALL sections
- Every section should reflect THEIR personality and unique edge, not generic marketing voice
- Hooks, messaging pillars, and FAQ answers MUST sound like THEY would say them

**SPECIFICITY REQUIREMENTS:**
- USE TANGIBLE OUTCOMES EVERYWHERE: Replace every vague benefit with concrete, observable results (numbers, timeframes, specific actions)
- NO VAGUE BENEFITS ALLOWED: "better work-life balance" → "close laptop at 5pm"; "grow business" → "sign 5 clients/month at $2K each"
- Include specific moments, scenarios, and real-world situations
- Use numbers, timeframes, and measurable outcomes throughout

**CUSTOMER LANGUAGE:**
- Use customer's exact quotes and authentic language from their answers
- Show specific struggles with tangible, relatable details
- Always name both emotional cost AND emotional reward
- Make belief shifts relatable with before/after examples

**CONSISTENCY:**
- INCLUDE user's unique differentiator/framework/system throughout (especially in Core Promise, Brand Voice Guidelines, and Offer Snapshot)
- Everything must ladder back to the same core promise and the owner's authentic voice
- Keep it simple, authentic, emotionally grounded—avoid all hype, buzzwords, jargon
- AUTHENTIC over polished. THEIR VOICE over generic marketing. SPECIFIC over vague.`;

    // FORCE NEW GENERATION: Add unique identifier and explicit instructions
    const generationId = `gen_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const timestamp = new Date().toISOString();

    // Add explicit "NEW GENERATION" instructions to user message
    const enhancedUserMessage = `${userMessage}

---
🆕 CRITICAL GENERATION INSTRUCTIONS:
- This is a NEW generation request (ID: ${generationId})
- Generate a FRESH, UNIQUE messaging strategy - DO NOT reuse previous versions
- Create ORIGINAL content tailored specifically to the data provided above
- Use DIFFERENT phrasing, examples, and structure than any previous generation
- Generation timestamp: ${timestamp}
- You MUST create a completely new version, not a copy or variation of old content

IMPORTANT: Even if the input data is similar, you MUST generate a NEW, ORIGINAL messaging strategy with:
- Different word choices and phrasing
- Different examples and scenarios
- Fresh perspective and angles
- Unique structure and flow
- Original insights and connections`;

    console.log(
      `[MESSAGING STRATEGY] 🆕 Starting NEW generation (ID: ${generationId}) at ${timestamp}`
    );

    // Add randomization to prompt to force different outputs
    const randomVariations = [
      "Focus on emotional storytelling and customer transformation",
      "Emphasize specific outcomes and tangible results",
      "Highlight unique differentiators and authentic voice",
      "Prioritize customer language and real experiences",
      "Create vivid scenarios and moment-by-moment details",
    ];
    const randomVariation =
      randomVariations[Math.floor(Math.random() * randomVariations.length)];

    const finalUserMessage = `${enhancedUserMessage}

ADDITIONAL CREATIVE DIRECTION:
- ${randomVariation}
- Approach this from a ${
      ["fresh", "unique", "different", "original"][
        Math.floor(Math.random() * 4)
      ]
    } angle
- Use ${
      ["conversational", "authentic", "visceral", "cinematic"][
        Math.floor(Math.random() * 4)
      ]
    } language style`;

    console.log(
      `[MESSAGING STRATEGY] Using random variation: "${randomVariation}"`
    );

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: finalUserMessage },
      ],
      max_tokens: 5000,
      temperature: 0.9, // Increased to 0.9 for maximum variation
      top_p: 0.95, // Nucleus sampling - allows more diverse token selection
      frequency_penalty: 0.3, // Penalize frequent tokens to avoid repetition
      presence_penalty: 0.3, // Encourage new topics and ideas
    });

    const rawStrategy = response.choices[0]?.message?.content || "";

    // Log generation details to verify uniqueness
    const strategyHash = rawStrategy
      .substring(0, 200)
      .replace(/\s+/g, " ")
      .trim();
    console.log(
      `[MESSAGING STRATEGY] Generated strategy preview (first 200 chars): "${strategyHash}..."`
    );
    console.log(
      `[MESSAGING STRATEGY] Strategy length: ${rawStrategy.length} characters`
    );
    console.log(`[MESSAGING STRATEGY] Generation ID: ${generationId}`);
    console.log(
      `[MESSAGING STRATEGY] Used random variation: "${randomVariation}"`
    );

    // PER-SECTION VALIDATION: Verify interview insights were used in the generated strategy
    if (hasInterviewInsights && interviewDataStructure) {
      console.log(
        "[INTERVIEW INSIGHT VALIDATION] Checking if interview insights were integrated into strategy..."
      );

      const strategyLower = rawStrategy.toLowerCase();
      let quotesFound = 0;
      let outcomesFound = 0;
      let scenesFound = 0;

      // Check each section for interview data usage
      const allQuotes = [
        ...interviewDataStructure.corePromise.quotes,
        ...interviewDataStructure.idealCustomer.quotes,
        ...interviewDataStructure.problemsFears.quotes,
        ...interviewDataStructure.desires.quotes,
        ...interviewDataStructure.beliefShifts.quotes,
      ];

      const allOutcomes = [
        ...interviewDataStructure.corePromise.outcomes,
        ...interviewDataStructure.desires.outcomes,
      ];

      const allScenes = [
        ...interviewDataStructure.idealCustomer.sceneBeats,
        ...interviewDataStructure.problemsFears.sceneBeats,
      ];

      // Count how many quotes appear in the strategy (fuzzy match - first 30 chars)
      allQuotes.forEach((quote) => {
        const quoteSnippet = quote.substring(0, 30).toLowerCase();
        if (strategyLower.includes(quoteSnippet)) {
          quotesFound++;
        }
      });

      // Count how many outcomes appear in the strategy
      allOutcomes.forEach((outcome) => {
        const outcomeSnippet = outcome.substring(0, 30).toLowerCase();
        if (strategyLower.includes(outcomeSnippet)) {
          outcomesFound++;
        }
      });

      // Count how many scene beats appear in the strategy
      allScenes.forEach((scene) => {
        const sceneSnippet = scene.substring(0, 30).toLowerCase();
        if (strategyLower.includes(sceneSnippet)) {
          scenesFound++;
        }
      });

      console.log("[INTERVIEW INSIGHT VALIDATION] Results:", {
        quotesFound: `${quotesFound}/${allQuotes.length}`,
        outcomesFound: `${outcomesFound}/${allOutcomes.length}`,
        scenesFound: `${scenesFound}/${allScenes.length}`,
        usageRate: `${Math.round(
          ((quotesFound + outcomesFound + scenesFound) /
            (allQuotes.length + allOutcomes.length + allScenes.length)) *
            100
        )}%`,
      });

      if (quotesFound === 0 && outcomesFound === 0 && scenesFound === 0) {
        console.warn(
          "[INTERVIEW INSIGHT VALIDATION] ⚠️ WARNING: No interview insights detected in generated strategy!"
        );
      } else if (quotesFound + outcomesFound + scenesFound < 3) {
        console.warn(
          "[INTERVIEW INSIGHT VALIDATION] ⚠️ WARNING: Low interview insight usage detected"
        );
      } else {
        console.log(
          "[INTERVIEW INSIGHT VALIDATION] ✅ Interview insights successfully integrated into strategy"
        );
      }
    }

    // Remove unwanted AI-generated closing statements
    let cleanedStrategy = rawStrategy
      .replace(
        /Remember, the heart of this strategy is to connect with your audience on a deeply personal level, using their own words and experiences to guide them toward the transformation they desire\. Keep the language simple, the scenarios relatable, and the promises grounded in real outcomes\./gi,
        ""
      )
      .trim();

    // CRITICAL: Validate AI output for contamination
    console.log("[AI OUTPUT VALIDATION] Checking for contamination...");
    const validationResult = DataSourceValidator.validateAIOutput(
      cleanedStrategy,
      userContext,
      clientContext
    );

    let cleanStrategy = cleanedStrategy;
    if (!validationResult.isClean) {
      console.warn(
        "[CONTAMINATION DETECTED] Issues found in AI output:",
        validationResult.issues
      );

      // Use the cleaned strategy without displaying validation warnings to users
      cleanStrategy = cleanedStrategy;
    } else {
      console.log(
        "[AI OUTPUT VALIDATION] ✅ Strategy is clean, no contamination detected"
      );
    }

    console.log(
      `[MESSAGING STRATEGY] ✅ NEW strategy generated successfully (${cleanStrategy.length} characters, ID: ${generationId})`
    );

    return {
      strategy: cleanStrategy,
      missingInformation: missingInfo,
      completeness,
      recommendations: generateRecommendations(completeness, missingInfo),
      dataSourceReport: {
        ...contaminationReport,
        aiValidation: {
          isClean: validationResult.isClean,
          issues: validationResult.issues,
          timestamp: new Date().toISOString(),
        },
        generationMetadata: {
          generationId,
          generatedAt: timestamp,
          isNewGeneration: true,
          temperature: 0.85,
        },
      },
    };
  } catch (error) {
    console.error("Messaging strategy generation error:", error);
    throw new Error("Failed to generate messaging strategy");
  }
}

function identifyMissingInformation(responses: WorkbookResponses): string[] {
  const missing: string[] = [];

  // Check for critical positioning information
  const positioningKeys = Object.keys(responses).filter((key) =>
    key.includes("positioning")
  );
  if (
    positioningKeys.length === 0 ||
    !positioningKeys.some((key) => responses[key]?.trim())
  ) {
    missing.push("Unique positioning and what makes you different");
  }

  // Check for customer avatar information
  const customerKeys = Object.keys(responses).filter((key) =>
    key.includes("customer-avatar")
  );
  if (
    customerKeys.length < 3 ||
    !customerKeys.some((key) => responses[key]?.trim())
  ) {
    missing.push("Detailed customer avatar and target audience insights");
  }

  // Check for brand voice information
  const brandKeys = Object.keys(responses).filter((key) =>
    key.includes("brand-voice")
  );
  if (
    brandKeys.length === 0 ||
    !brandKeys.some((key) => responses[key]?.trim())
  ) {
    missing.push("Brand voice and personality definition");
  }

  // Check for offer/problem information
  const offerKeys = Object.keys(responses).filter(
    (key) => key.includes("offer") || key.includes("problem")
  );
  if (
    offerKeys.length === 0 ||
    !offerKeys.some((key) => responses[key]?.trim())
  ) {
    missing.push("Core offer and problem you solve");
  }

  return missing;
}

function calculateCompleteness(responses: WorkbookResponses): number {
  const totalPossibleSections = 15; // Estimate based on typical workbook
  const completedSections = Object.values(responses).filter(
    (response) => response && response.trim().length > 20
  ).length;

  return Math.min(100, (completedSections / totalPossibleSections) * 100);
}

function extractKeyInsights(
  responses: WorkbookResponses,
  interviewNotes?: Record<string, string>
) {
  return {
    positioning: Object.entries(responses)
      .filter(([key]) => key.includes("positioning"))
      .map(([key, value]) => ({ key, value })),
    customerAvatar: Object.entries(responses)
      .filter(([key]) => key.includes("customer-avatar"))
      .map(([key, value]) => ({ key, value })),
    brandVoice: Object.entries(responses)
      .filter(([key]) => key.includes("brand-voice"))
      .map(([key, value]) => ({ key, value })),
    offer: Object.entries(responses)
      .filter(([key]) => key.includes("offer") || key.includes("problem"))
      .map(([key, value]) => ({ key, value })),
    other: Object.entries(responses)
      .filter(
        ([key]) =>
          !key.includes("positioning") &&
          !key.includes("customer-avatar") &&
          !key.includes("brand-voice") &&
          !key.includes("offer") &&
          !key.includes("problem")
      )
      .map(([key, value]) => ({ key, value })),
    interviews: interviewNotes || {},
  };
}

function formatInsightsForPrompt(insights: any): string {
  let formatted = "";

  if (insights.positioning.length > 0) {
    formatted += "POSITIONING INSIGHTS:\n";
    insights.positioning.forEach((item: any) => {
      if (item.value?.trim()) {
        formatted += `- ${item.value}\n`;
      }
    });
    formatted += "\n";
  }

  if (insights.customerAvatar.length > 0) {
    formatted += "CUSTOMER AVATAR INSIGHTS:\n";
    insights.customerAvatar.forEach((item: any) => {
      if (item.value?.trim()) {
        formatted += `- ${item.value}\n`;
      }
    });
    formatted += "\n";
  }

  if (insights.brandVoice.length > 0) {
    formatted += "BRAND VOICE INSIGHTS:\n";
    insights.brandVoice.forEach((item: any) => {
      if (item.value?.trim()) {
        formatted += `- ${item.value}\n`;
      }
    });
    formatted += "\n";
  }

  if (insights.offer.length > 0) {
    formatted += "OFFER & PROBLEM INSIGHTS:\n";
    insights.offer.forEach((item: any) => {
      if (item.value?.trim()) {
        formatted += `- ${item.value}\n`;
      }
    });
    formatted += "\n";
  }

  return formatted;
}

function formatInterviewNotes(notes: Record<string, string>): string {
  return Object.entries(notes)
    .filter(([_, value]) => value?.trim())
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
}

function generateRecommendations(
  completeness: number,
  missingInfo: string[]
): string[] {
  const recommendations: string[] = [];

  if (completeness < 80) {
    recommendations.push(
      "Complete additional workbook sections for a more comprehensive strategy"
    );
  }

  if (missingInfo.length > 0) {
    recommendations.push(`Focus on: ${missingInfo.join(", ")}`);
  }

  if (completeness > 80) {
    recommendations.push(
      "Consider conducting customer interviews to add depth and authenticity"
    );
    recommendations.push("Test key messages with your target audience");
    recommendations.push("Refine based on market feedback and results");
  }

  return recommendations;
}

// NEW CONTAMINATION-SAFE FUNCTIONS

function extractKeyInsightsFromUserData(
  responses: WorkbookResponses,
  userContext: UserContextData,
  emotionalInsights?: string
) {
  return {
    // AI-extracted emotional insights (prioritized)
    emotionalInsights: emotionalInsights || "",

    // Structured data from workbook
    positioning: Object.entries(responses)
      .filter(([key]) => key.includes("positioning"))
      .map(([key, value]) => ({ key, value })),
    customerAvatar: Object.entries(responses)
      .filter(([key]) => key.includes("customer-avatar"))
      .map(([key, value]) => ({ key, value })),
    brandVoice: Object.entries(responses)
      .filter(([key]) => key.includes("brand-voice"))
      .map(([key, value]) => ({ key, value })),
    offer: Object.entries(responses)
      .filter(([key]) => key.includes("offer") || key.includes("problem"))
      .map(([key, value]) => ({ key, value })),
    other: Object.entries(responses)
      .filter(
        ([key]) =>
          !key.includes("positioning") &&
          !key.includes("customer-avatar") &&
          !key.includes("brand-voice") &&
          !key.includes("offer") &&
          !key.includes("problem")
      )
      .map(([key, value]) => ({ key, value })),
    businessContext: {
      name: userContext.businessName,
      industry: userContext.industry,
      stage: userContext.businessStage,
    },
  };
}

function formatUserInsightsForPrompt(insights: any): string {
  let formatted = "";

  // PRIORITY #1: AI-extracted emotional insights (most important for messaging)
  if (insights.emotionalInsights?.trim()) {
    formatted +=
      "===== EMOTIONAL INSIGHTS & CUSTOMER LANGUAGE (EXTRACTED BY AI) =====\n";
    formatted +=
      "Use this emotional intelligence as your PRIMARY SOURCE for creating authentic, deep messaging.\n\n";
    formatted += insights.emotionalInsights;
    formatted += "\n\n===== STRUCTURED DATA FROM WORKBOOK =====\n\n";
  }

  formatted += "BUSINESS OWNER'S VALIDATED RESPONSES:\n\n";

  // PRIORITY #2: BRAND VOICE (moved to top - this is CRITICAL for the new Brand Voice Guidelines section)
  if (insights.brandVoice.length > 0) {
    formatted +=
      "⭐ BRAND VOICE & PERSONALITY (CRITICAL - Use these answers to create the Brand Voice Guidelines section):\n";
    insights.brandVoice.forEach((item: any) => {
      if (item.value?.trim()) {
        formatted += `- "${item.value}"\n`;
      }
    });
    formatted +=
      "\nYou MUST use these brand voice answers to create a detailed, authentic Brand Voice Guidelines section that captures their unique personality, beliefs, and communication style.\n\n";
  }

  if (insights.positioning.length > 0) {
    formatted += "UNIQUE POSITIONING & EXPERTISE:\n";
    insights.positioning.forEach((item: any) => {
      if (item.value?.trim()) {
        formatted += `- "${item.value}"\n`;
      }
    });
    formatted += "\n";
  }

  if (insights.customerAvatar.length > 0) {
    formatted += "TARGET CUSTOMER UNDERSTANDING:\n";
    insights.customerAvatar.forEach((item: any) => {
      if (item.value?.trim()) {
        formatted += `- "${item.value}"\n`;
      }
    });
    formatted += "\n";
  }

  if (insights.offer.length > 0) {
    formatted += "OFFER & PROBLEM SOLUTION:\n";
    insights.offer.forEach((item: any) => {
      if (item.value?.trim()) {
        formatted += `- "${item.value}"\n`;
      }
    });
    formatted += "\n";
  }

  if (insights.other.length > 0) {
    formatted += "ADDITIONAL BUSINESS INSIGHTS:\n";
    insights.other.forEach((item: any) => {
      if (item.value?.trim()) {
        formatted += `- "${item.value}"\n`;
      }
    });
    formatted += "\n";
  }

  return formatted;
}

function formatClientContextForReference(
  clientContext: ClientContextData
): string {
  let formatted =
    "CLIENT RESEARCH PATTERNS (For Strategy Inspiration Only):\n\n";

  const clientData = Object.values(clientContext.interviewData);
  if (clientData.length === 0) {
    return "No client interview data available.\n";
  }

  clientData.forEach((dataPoint: any) => {
    if (dataPoint.content?.trim()) {
      formatted += `- Client Pattern: ${dataPoint.content.substring(0, 100)}${
        dataPoint.content.length > 100 ? "..." : ""
      }\n`;
    }
  });

  formatted +=
    "\n⚠️ IMPORTANT: These are client examples for context only. DO NOT include client quotes or demographics in the business messaging strategy.\n";

  return formatted;
}

interface InterviewInsightsBySection {
  quotes: string[];
  sceneBeats: string[];
  outcomes: string[];
}

interface FormattedInterviewInsights {
  contextBlock: string;
  metrics: {
    totalInsights: number;
    quoteCount: number;
    categoriesWithData: number;
    sampleInsight: string;
  };
}

function extractInterviewDataStructure(
  interviewNotes: Record<string, string>
): {
  structure: any;
  metrics: {
    totalInsights: number;
    quoteCount: number;
    categoriesWithData: number;
    sampleInsight: string;
  };
} {
  const structure = {
    corePromise: {
      quotes: [] as string[],
      sceneBeats: [] as string[],
      outcomes: [] as string[],
    },
    idealCustomer: {
      quotes: [] as string[],
      sceneBeats: [] as string[],
      outcomes: [] as string[],
    },
    problemsFears: {
      quotes: [] as string[],
      sceneBeats: [] as string[],
      outcomes: [] as string[],
    },
    desires: {
      quotes: [] as string[],
      sceneBeats: [] as string[],
      outcomes: [] as string[],
    },
    beliefShifts: {
      quotes: [] as string[],
      sceneBeats: [] as string[],
      outcomes: [] as string[],
    },
  };

  const sectionKeyMappings = {
    corePromise: ["magic_solution", "success_measures"],
    idealCustomer: [
      "frustrations",
      "nighttime_worries",
      "demographics",
      "blockers",
    ],
    problemsFears: ["frustrations", "nighttime_worries", "secret_fears"],
    desires: ["magic_solution", "success_measures", "referral_outcomes"],
    beliefShifts: ["failed_solutions", "blockers", "investment_criteria"],
  };

  let totalInsights = 0;
  let quoteCount = 0;
  let sampleInsight = "";
  let categoriesWithData = 0;

  // Process each interview note
  for (const [key, value] of Object.entries(interviewNotes)) {
    if (!value || !value.trim()) continue;

    totalInsights++;
    if (!sampleInsight) {
      sampleInsight =
        value.substring(0, 120) + (value.length > 120 ? "..." : "");
    }

    // Map to appropriate sections
    for (const [sectionName, keys] of Object.entries(sectionKeyMappings)) {
      if (keys.includes(key)) {
        const section = structure[sectionName as keyof typeof structure];

        // Always add as quote (customer's own words)
        section.quotes.push(value);
        quoteCount++;

        // Add to sceneBeats if it contains cinematic elements
        if (hasSceneElements(value)) {
          section.sceneBeats.push(value);
        }

        // Add to outcomes if it contains tangible results
        if (hasTangibleOutcome(value)) {
          section.outcomes.push(value);
        }
      }
    }
  }

  // Count categories with data
  for (const section of Object.values(structure)) {
    if (
      section.quotes.length > 0 ||
      section.sceneBeats.length > 0 ||
      section.outcomes.length > 0
    ) {
      categoriesWithData++;
    }
  }

  return {
    structure,
    metrics: {
      totalInsights,
      quoteCount,
      categoriesWithData,
      sampleInsight,
    },
  };
}

function hasSceneElements(text: string): boolean {
  // Check for cinematic/scene elements (actions, sensory details, moments)
  const sceneIndicators = [
    /\b(sitting|standing|walking|lying|staring|watching|looking|feeling|wondering)\b/i,
    /\b(at \d+[ap]m|midnight|morning|evening|night)\b/i,
    /\b(desk|computer|screen|phone|laptop|office|home|kitchen)\b/i,
    /\b(each time|every time|when|after|before)\b/i,
  ];

  return sceneIndicators.some((pattern) => pattern.test(text));
}

function hasTangibleOutcome(text: string): boolean {
  // Check for tangible outcomes (numbers, timeframes, specific results)
  const outcomeIndicators = [
    /\$\d+/, // Money
    /\d+\s*(clients?|customers?|sales?|leads?)/i, // Client numbers
    /\d+\s*(days?|weeks?|months?|hours?)/i, // Timeframes
    /\b\d+[ap]m\b/i, // Specific times
    /\bincrease|decrease|grow|earn|save|gain|reach\b/i, // Result verbs
  ];

  return outcomeIndicators.some((pattern) => pattern.test(text));
}
