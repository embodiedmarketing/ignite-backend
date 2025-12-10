import OpenAI from "openai";
import {
  DataSourceValidator,
  UserContextData,
  ClientContextData,
} from "../utils/data-source-validator";
import Anthropic from "@anthropic-ai/sdk";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
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
  alignmentScore?: number; // Score showing how aligned the strategy is to source data
  improvementNotes?: string[]; // Notes on what was improved from previous version
}

interface RegenerationOptions {
  previousStrategy?: string;
  feedbackNotes?: string;
  focusAreas?: string[];
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

    // const response = await openai.chat.completions.create({
    //   model: "gpt-4o",
    //   messages: [
    //     {
    //       role: "system",
    //       content:
    //         "You are an expert at extracting emotional insights and authentic customer language from raw questionnaire data.",
    //     },
    //     { role: "user", content: emotionalExtractionPrompt },
    //   ],
    //   max_tokens: 3000,
    //   temperature: 0.5,
    // });
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514", // Claude Sonnet 4 (latest)
      max_tokens: 3000,
      temperature: 0.5,
      system: "You are an expert at extracting emotional insights and authentic customer language from raw questionnaire data.",
      messages: [
        {
          role: "user",
          content: emotionalExtractionPrompt,
        },
      ],
    });
    

    // const extractedInsights = response.choices[0]?.message?.content || "";
    const extractedInsights = response.content[0].type === "text" ? response.content[0].text : "";
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
  userId: number = 0,
  regenerationOptions?: RegenerationOptions
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

Deliver a messaging strategy that mirrors the depth, accuracy, emotional nuance, and owner-specific authenticity. The strategy must feel like it could ONLY come from this specific business owner — never generic, never templated.

🚨 ANTI-DRIFT RULES (CRITICAL - READ CAREFULLY)

**DO NOT DEFAULT TO GENERIC LANGUAGE. The #1 mistake is drifting toward typical coaching/business language when the source data says something different.**

COMMON DRIFT PATTERNS TO AVOID:

1. **Audience Drift** - Do NOT assume "entrepreneur" or "business owner" unless the source data SAYS this
   - If they say "professionals" → write "professionals" (not "entrepreneurs")
   - If they say "women in transition" → write that (not "female founders")
   - If they say "people feeling stuck" → write that (not "business owners ready to scale")
   - ALWAYS USE THEIR EXACT AUDIENCE DESCRIPTION

2. **Tone Drift** - Do NOT default to hustle/growth/scale language unless the source supports it
   - If their tone is reflective → keep it reflective (not "let's crush it")
   - If their tone is gentle → keep it gentle (not "stop playing small")
   - If their tone is wise → keep it wise (not "game-changing results")
   - MATCH THEIR ACTUAL VOICE, NOT TYPICAL MARKETING VOICE

3. **Problem Drift** - Do NOT add generic business problems they didn't mention
   - If they talk about "life pressure" → don't change it to "revenue challenges"
   - If they talk about "feeling invisible" → don't change it to "marketing struggles"
   - If they talk about "internal conflict" → don't change it to "business bottlenecks"
   - USE THEIR EXACT PROBLEMS

4. **Outcome Drift** - Do NOT add hustle outcomes they didn't promise
   - If they promise "peace" → don't change it to "6-figure months"
   - If they promise "clarity" → don't change it to "explosive growth"
   - If they promise "alignment" → don't change it to "scaling fast"
   - USE THEIR EXACT TRANSFORMATION

**BEFORE WRITING EACH SECTION, ASK:**
"Is this EXACTLY what they said, or am I defaulting to generic coaching language?"

If you catch yourself writing typical marketing/coaching phrases, STOP and return to the source data.`;

    // Add unique variation to ensure different outputs each time
    const uniquePromptId = Date.now();
    const variationNote = `[Generation Request #${uniquePromptId} - ${new Date().toISOString()}]`;

    // REGENERATION MODE: If previous strategy exists, include improvement instructions
    const isRegeneration = regenerationOptions?.previousStrategy?.trim();
    let regenerationContext = "";
    
    if (isRegeneration && regenerationOptions) {
      console.log("[REGENERATION MODE] Previous strategy detected - generating improved version");
      const prevStrategy = regenerationOptions.previousStrategy || "";
      const feedbackNotes = regenerationOptions.feedbackNotes || "";
      const focusAreas = regenerationOptions.focusAreas || [];
      
      regenerationContext = `

===== 🔄 REGENERATION MODE: ENHANCE TO 100% ALIGNMENT =====

**🎯 YOUR MISSION: Create an ENHANCED version that is:**
1. **100% aligned to the Q&A source data** (not 85%, not 90% — EXACTLY 100%)
2. **MORE CONCISE than the previous version** (enhancement ≠ more words)
3. **MORE SPECIFIC than the previous version** (deeper accuracy, not broader coverage)
4. **GROUNDED & TRUSTED ADVISOR TONE** (never promotional or hypey)

**PREVIOUS STRATEGY TO ENHANCE:**
${prevStrategy}

${feedbackNotes ? `**USER FEEDBACK TO ADDRESS:**\n${feedbackNotes}\n` : ""}
${focusAreas.length > 0 ? `**PRIORITY FOCUS AREAS:**\n${focusAreas.map(area => `- ${area}`).join('\n')}\n` : ""}

**⚠️ COMMON REGENERATION MISTAKES TO AVOID:**

❌ **MISTAKE 1: Adding verbosity** 
- Previous: "They feel overwhelmed by daily demands"
- BAD enhancement: "They feel deeply overwhelmed and exhausted by the constant, never-ending daily demands that pile up and create stress"
- GOOD enhancement: "They feel overwhelmed by daily demands — the school runs, the aging parents, the work deadlines that never stop"
→ Enhancement = MORE SPECIFIC, not MORE WORDS

❌ **MISTAKE 2: Diluting pain points with wordiness**
- If previous version was emotionally resonant and concise, KEEP IT CONCISE
- Don't pad sentences with filler words
- Every word must earn its place

❌ **MISTAKE 3: Shifting to promotional tone**
- Previous: "We help professionals find balance"
- BAD: "We TRANSFORM professionals into POWERFUL balanced beings!"
- GOOD: "We help professionals find the balance they've been quietly craving"
→ Keep the trusted advisor tone, never become a salesperson

❌ **MISTAKE 4: Reducing alignment to add "improvements"**
- If previous version was 95% aligned, the new version must be 100%, NOT 85%
- NEVER sacrifice alignment for "better marketing language"
- Source data accuracy > copywriting flourishes

**✅ WHAT "ENHANCED" ACTUALLY MEANS:**

1. **More Precise Audience Description**
   - Previous: "Professionals feeling stuck"
   - Enhanced: "Professionals in their 40s-50s feeling the weight of family responsibilities while wondering if this is all there is"
   → Added SPECIFICITY from source data, not generic expansion

2. **Sharper Pain Points** (from source data)
   - Previous: "They compare themselves to others"
   - Enhanced: "They watch colleagues get promoted while they stay stuck, wondering what's wrong with them"
   → Added EMOTIONAL DEPTH from source data, stayed concise

3. **Clearer Outcomes** (exactly as stated in Q&A)
   - Previous: "Find peace and clarity"
   - Enhanced: "Wake up without dread, know exactly what matters, feel at peace with their choices"
   → Added TANGIBLE DETAIL from source data, kept it grounded

4. **Tighter Voice** (match owner's actual tone)
   - Remove any sentence that sounds "marketing-y"
   - Keep sentences that sound like a wise friend giving advice
   - Empathetic, not promotional

**🔍 100% ALIGNMENT CHECKLIST:**

Before finalizing, verify EVERY element:
- [ ] Audience: Uses EXACT description from Q&A (not my assumption)
- [ ] Problems: Lists ONLY problems mentioned in Q&A (not generic ones)
- [ ] Desires: States ONLY outcomes from Q&A (not typical coaching promises)
- [ ] Voice: Matches owner's tone exactly (grounded, not promotional)
- [ ] Framework: Uses EXACT name/structure from Q&A (not invented)
- [ ] Differentiators: From Q&A only (not generic industry differentiators)
- [ ] Every sentence traceable to source data

**📏 CONCISENESS RULES:**

- If previous version said something well in 10 words, don't expand to 25 words
- Remove filler words: "really", "very", "truly", "deeply", "absolutely"
- Remove repetitive points — say it once, say it well
- Brevity is clarity. Concise is powerful.
- The best enhancement often REMOVES words while adding PRECISION

**🎭 TONE REQUIREMENTS:**

- Trusted advisor, not salesperson
- Empathetic, not excited
- Grounded, not hypey
- Wise, not pushy
- Calm confidence, not aggressive claims

**OUTPUT REQUIREMENT:**
Generate an enhanced version that:
1. Is 100% aligned to Q&A (every element verifiable against source)
2. Is MORE CONCISE than previous (fewer words, more precision)
3. Is MORE SPECIFIC (deeper accuracy from source data)
4. Maintains grounded, trusted advisor tone throughout
5. Could only come from THIS owner for THEIR specific audience

===== END REGENERATION INSTRUCTIONS =====

`;
    }

    const userMessage = `${variationNote}
${regenerationContext}

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

⚠️ **BEFORE YOU START WRITING:**
1. Re-read ALL the workbook responses above
2. Identify the EXACT audience they describe (not what you assume)
3. Identify the EXACT problems they mention (not generic ones)
4. Identify the EXACT outcomes they promise (not typical coaching outcomes)
5. Identify THEIR voice and tone (not marketing-speak)
6. Write ONLY what is supported by their answers

**DO NOT DEFAULT TO:**
- "Entrepreneur" or "business owner" unless they specifically said this
- Hustle/scale/growth language unless their tone supports it
- Generic coaching problems like "stuck" or "overwhelmed" unless they used these words
- Income/revenue promises unless they specifically mentioned these

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

FINAL REMINDERS - 100% ALIGNMENT, CONCISE, GROUNDED:

**🎯 100% Q&A ALIGNMENT (NON-NEGOTIABLE):**
- Every audience description must come DIRECTLY from their answers
- Every pain point must be EXACTLY what they described
- Every desire/outcome must be THEIR stated transformation
- Every differentiator must be what THEY said makes them unique
- If it's not in the source data, it should NOT be in the strategy

**✂️ CONCISENESS REQUIREMENTS:**
- Say more with fewer words — brevity is power
- Remove filler: "really", "very", "truly", "deeply", "absolutely", "actually"
- Don't repeat the same point in different words
- If 10 words work, don't use 25
- Enhancement = more PRECISE, not more VERBOSE

**🎭 TONE REQUIREMENTS:**
- Trusted advisor, NOT salesperson
- Empathetic and grounded, NOT excited and hypey
- Wise and calm, NOT aggressive and pushy
- Like a thoughtful friend giving honest advice
- NEVER sound promotional or "marketing-y"

**BRAND VOICE REQUIREMENTS:**
- Extract and amplify the business owner's AUTHENTIC VOICE from their answers
- Use their exact language, beliefs, and perspective throughout ALL sections
- Every section should reflect THEIR personality, not generic marketing voice
- Hooks and FAQ answers MUST sound like THEY would say them

**SPECIFICITY REQUIREMENTS:**
- Use TANGIBLE outcomes from their answers (not generic promises)
- Include specific moments and real-world situations THEY mentioned
- Use their numbers, timeframes, and metrics (don't invent new ones)

**CUSTOMER LANGUAGE:**
- Use customer's exact quotes from their answers
- Show specific struggles THEY described
- Name emotional costs and rewards THEY identified

**CONSISTENCY:**
- Everything must trace back to the source Q&A data
- Keep it simple, authentic, emotionally grounded
- CONCISE over verbose. ACCURATE over creative. THEIR VOICE over marketing voice.`;

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

    // const response = await openai.chat.completions.create({
    //   model: "gpt-4o",
    //   messages: [
    //     { role: "system", content: systemMessage },
    //     { role: "user", content: finalUserMessage },
    //   ],
    //   max_tokens: 5000,
    //   temperature: 0.9, // Increased to 0.9 for maximum variation
    //   top_p: 0.95, // Nucleus sampling - allows more diverse token selection
    //   frequency_penalty: 0.3, // Penalize frequent tokens to avoid repetition
    //   presence_penalty: 0.3, // Encourage new topics and ideas
    // });
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514", // Claude Sonnet 4 (latest)
      max_tokens: 5000,
      temperature: 0.9, // Increased to 0.9 for maximum variation
      system: systemMessage,
      messages: [
        { role: "user", content: [ { type: "text", text: finalUserMessage } ]  },
      ],
    });

    // const rawStrategy = response.choices[0]?.message?.content || "";
    const rawStrategy = response.content[0].type === "text" ? response.content[0].text : "";

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

    // Calculate alignment score
    const alignmentResult = calculateAlignmentScore(
      cleanStrategy,
      cleanUserResponses,
      emotionalInsights
    );

    console.log(`[ALIGNMENT] Strategy alignment score: ${alignmentResult.score}%`);
    if (isRegeneration) {
      console.log(`[REGENERATION] This is an improved version of a previous strategy`);
    }

    return {
      strategy: cleanStrategy,
      missingInformation: missingInfo,
      completeness,
      recommendations: generateRecommendations(completeness, missingInfo),
      alignmentScore: alignmentResult.score,
      improvementNotes: alignmentResult.improvementNotes,
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
          isNewGeneration: !isRegeneration,
          isRegeneration: !!isRegeneration,
          temperature: 0.85,
        },
        alignmentDetails: alignmentResult.details,
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

// ALIGNMENT SCORING FUNCTION
function calculateAlignmentScore(
  strategy: string,
  workbookResponses: WorkbookResponses,
  emotionalInsights: string
): { score: number; details: string[]; improvementNotes: string[] } {
  const strategyLower = strategy.toLowerCase();
  let totalPoints = 0;
  let maxPoints = 0;
  const details: string[] = [];
  const improvementNotes: string[] = [];

  // 1. Check for direct quote usage (20 points max)
  maxPoints += 20;
  const allResponses = Object.values(workbookResponses).filter(r => r?.trim());
  let quotesFound = 0;
  
  allResponses.forEach(response => {
    if (!response) return;
    // Check for significant phrases (5+ words) from responses
    const words = response.split(/\s+/).filter(w => w.length > 3);
    const significantPhrases = [];
    
    for (let i = 0; i < words.length - 4; i++) {
      const phrase = words.slice(i, i + 5).join(' ').toLowerCase();
      if (strategyLower.includes(phrase)) {
        quotesFound++;
        break; // Count each response once
      }
    }
  });
  
  const quoteScore = Math.min(20, (quotesFound / Math.max(1, allResponses.length)) * 40);
  totalPoints += quoteScore;
  details.push(`Direct quotes usage: ${quotesFound}/${allResponses.length} responses referenced (${Math.round(quoteScore)} pts)`);
  
  if (quoteScore < 15) {
    improvementNotes.push("Include more EXACT language and phrases from the workbook responses");
  }

  // 2. Check for proprietary framework/method mentions (15 points max)
  maxPoints += 15;
  const frameworkPatterns = [
    /framework/gi,
    /method/gi,
    /system/gi,
    /process/gi,
    /approach/gi,
    /→|->|step\s*\d/gi, // Arrow patterns or numbered steps
  ];
  
  let frameworkMentions = 0;
  frameworkPatterns.forEach(pattern => {
    const matches = strategy.match(pattern);
    if (matches) frameworkMentions += matches.length;
  });
  
  const frameworkScore = Math.min(15, frameworkMentions * 3);
  totalPoints += frameworkScore;
  details.push(`Proprietary method integration: ${frameworkMentions} mentions (${Math.round(frameworkScore)} pts)`);
  
  if (frameworkScore < 10) {
    improvementNotes.push("Integrate the owner's proprietary framework/method more prominently throughout");
  }

  // 3. Check for generic cliché avoidance (15 points max - lose points for clichés)
  maxPoints += 15;
  const genericClichés = [
    "transform your life",
    "unlock your potential",
    "take it to the next level",
    "maximize your",
    "empowered",
    "uplevel",
    "game-changer",
    "breakthrough",
    "skyrocket",
    "supercharge",
    "crushing it",
    "living your best life",
  ];
  
  let clichéCount = 0;
  genericClichés.forEach(cliché => {
    if (strategyLower.includes(cliché.toLowerCase())) {
      clichéCount++;
    }
  });
  
  const clichéScore = Math.max(0, 15 - (clichéCount * 3));
  totalPoints += clichéScore;
  details.push(`Generic cliché avoidance: ${clichéCount} clichés found (${Math.round(clichéScore)} pts)`);
  
  if (clichéScore < 12) {
    improvementNotes.push("Remove generic industry clichés and replace with owner-specific language");
  }

  // 3b. Check for AUDIENCE DRIFT (10 points max - CRITICAL for alignment)
  maxPoints += 10;
  const driftIndicators = [
    // Generic entrepreneur/business language that may not match actual avatar
    { term: "entrepreneur", penalty: 2, note: "generic 'entrepreneur' language" },
    { term: "business owner", penalty: 1, note: "generic 'business owner' language" },
    { term: "scale your business", penalty: 3, note: "hustle/scale language" },
    { term: "6-figure", penalty: 3, note: "income claim language" },
    { term: "7-figure", penalty: 3, note: "income claim language" },
    { term: "crushing it", penalty: 2, note: "hustle culture language" },
    { term: "hustle", penalty: 2, note: "hustle language" },
    { term: "grind", penalty: 2, note: "grind culture language" },
    { term: "boss babe", penalty: 3, note: "cliché audience term" },
    { term: "girlboss", penalty: 3, note: "cliché audience term" },
    { term: "solopreneur", penalty: 1, note: "generic audience term" },
    { term: "side hustle", penalty: 2, note: "hustle language" },
    { term: "passive income", penalty: 2, note: "generic promise" },
    { term: "work from anywhere", penalty: 1, note: "generic promise" },
    { term: "fire your boss", penalty: 3, note: "aggressive language" },
    { term: "quit your 9-5", penalty: 2, note: "generic positioning" },
  ];
  
  let driftPenalty = 0;
  const driftIssues: string[] = [];
  
  driftIndicators.forEach(indicator => {
    const regex = new RegExp(indicator.term, 'gi');
    const matches = strategyLower.match(regex);
    if (matches && matches.length > 0) {
      driftPenalty += indicator.penalty * matches.length;
      driftIssues.push(`${indicator.note} (${matches.length}x)`);
    }
  });
  
  const driftScore = Math.max(0, 10 - driftPenalty);
  totalPoints += driftScore;
  details.push(`Audience drift check: ${driftPenalty} drift penalty (${Math.round(driftScore)} pts)`);
  
  if (driftScore < 7) {
    improvementNotes.push(`DRIFT DETECTED: Strategy may have drifted from source data. Issues: ${driftIssues.slice(0, 3).join(', ')}`);
    improvementNotes.push("Re-read the workbook answers and use THEIR exact audience description, not generic terms");
  }

  // 3c. Check for PROMOTIONAL/HYPEY TONE (10 points max)
  maxPoints += 10;
  const promotionalIndicators = [
    { term: "transform", penalty: 1, note: "promotional language" },
    { term: "powerful", penalty: 1, note: "hypey adjective" },
    { term: "amazing", penalty: 2, note: "hypey adjective" },
    { term: "incredible", penalty: 2, note: "hypey adjective" },
    { term: "revolutionary", penalty: 3, note: "over-promotional" },
    { term: "game-changing", penalty: 2, note: "cliché promotional" },
    { term: "life-changing", penalty: 1, note: "promotional language" },
    { term: "finally!", penalty: 2, note: "sales pressure language" },
    { term: "imagine if", penalty: 1, note: "sales technique" },
    { term: "what if i told you", penalty: 3, note: "salesy opener" },
    { term: "secret", penalty: 2, note: "clickbait language" },
    { term: "proven", penalty: 1, note: "promotional claim" },
    { term: "guaranteed", penalty: 2, note: "promotional claim" },
    { term: "exclusive", penalty: 1, note: "promotional language" },
    { term: "limited time", penalty: 3, note: "urgency sales tactic" },
    { term: "act now", penalty: 3, note: "urgency sales tactic" },
    { term: "don't miss", penalty: 2, note: "urgency sales tactic" },
  ];
  
  let promotionalPenalty = 0;
  const promotionalIssues: string[] = [];
  
  promotionalIndicators.forEach(indicator => {
    const regex = new RegExp(indicator.term, 'gi');
    const matches = strategyLower.match(regex);
    if (matches && matches.length > 0) {
      promotionalPenalty += indicator.penalty * matches.length;
      promotionalIssues.push(`${indicator.note} (${matches.length}x)`);
    }
  });
  
  const promotionalScore = Math.max(0, 10 - promotionalPenalty);
  totalPoints += promotionalScore;
  details.push(`Promotional tone check: ${promotionalPenalty} promotional penalty (${Math.round(promotionalScore)} pts)`);
  
  if (promotionalScore < 7) {
    improvementNotes.push(`PROMOTIONAL TONE DETECTED: Strategy sounds too salesy. Issues: ${promotionalIssues.slice(0, 3).join(', ')}`);
    improvementNotes.push("Use grounded, trusted advisor tone — not promotional marketing language");
  }

  // 3d. Check for VERBOSITY (5 points max)
  maxPoints += 5;
  const fillerWords = [
    "really", "very", "truly", "deeply", "absolutely", "actually", 
    "basically", "literally", "definitely", "certainly", "obviously",
    "simply", "just", "quite", "rather", "somewhat"
  ];
  
  let fillerCount = 0;
  fillerWords.forEach(filler => {
    const regex = new RegExp(`\\b${filler}\\b`, 'gi');
    const matches = strategy.match(regex);
    if (matches) fillerCount += matches.length;
  });
  
  // Penalize excessive filler words (more than 5 is verbose)
  const verbosityPenalty = Math.max(0, fillerCount - 5);
  const verbosityScore = Math.max(0, 5 - verbosityPenalty);
  totalPoints += verbosityScore;
  details.push(`Verbosity check: ${fillerCount} filler words (${Math.round(verbosityScore)} pts)`);
  
  if (verbosityScore < 3) {
    improvementNotes.push(`VERBOSITY DETECTED: ${fillerCount} filler words found. Remove: really, very, truly, deeply, etc.`);
    improvementNotes.push("Be more concise — say more with fewer words");
  }

  // 4. Check for emotional insights integration (20 points max)
  maxPoints += 20;
  if (emotionalInsights?.trim()) {
    const insightKeywords = emotionalInsights
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 5)
      .slice(0, 50); // Sample 50 significant words
    
    let insightsUsed = 0;
    insightKeywords.forEach(keyword => {
      if (strategyLower.includes(keyword)) {
        insightsUsed++;
      }
    });
    
    const insightScore = Math.min(20, (insightsUsed / Math.max(1, insightKeywords.length)) * 40);
    totalPoints += insightScore;
    details.push(`Emotional insights integration: ${insightsUsed}/${insightKeywords.length} keywords (${Math.round(insightScore)} pts)`);
    
    if (insightScore < 15) {
      improvementNotes.push("Weave more emotional insights and customer language throughout the strategy");
    }
  } else {
    totalPoints += 10; // Partial points if no insights available
    details.push("Emotional insights: Not available (10 pts default)");
  }

  // 5. Check for specificity (tangible outcomes) (15 points max)
  maxPoints += 15;
  const tangiblePatterns = [
    /\$\d+/g, // Money amounts
    /\d+\s*(clients?|customers?|sales?|leads?|students?)/gi, // Numbers
    /\d+\s*(days?|weeks?|months?|hours?|minutes?)/gi, // Timeframes
    /\d+[ap]m/gi, // Specific times
    /\d+%/g, // Percentages
  ];
  
  let tangibleCount = 0;
  tangiblePatterns.forEach(pattern => {
    const matches = strategy.match(pattern);
    if (matches) tangibleCount += matches.length;
  });
  
  const tangibleScore = Math.min(15, tangibleCount * 2);
  totalPoints += tangibleScore;
  details.push(`Tangible specificity: ${tangibleCount} specific numbers/outcomes (${Math.round(tangibleScore)} pts)`);
  
  if (tangibleScore < 10) {
    improvementNotes.push("Add more specific numbers, timeframes, and measurable outcomes");
  }

  // 6. Check for section completeness (15 points max)
  maxPoints += 15;
  const requiredSections = [
    "core promise",
    "ideal customer",
    "brand voice",
    "problems",
    "desires",
    "belief shifts",
    "differentiators",
    "messaging pillars",
    "hooks",
    "offer snapshot",
    "objection",
  ];
  
  let sectionsFound = 0;
  requiredSections.forEach(section => {
    if (strategyLower.includes(section)) {
      sectionsFound++;
    }
  });
  
  const sectionScore = Math.round((sectionsFound / requiredSections.length) * 15);
  totalPoints += sectionScore;
  details.push(`Section completeness: ${sectionsFound}/${requiredSections.length} sections (${sectionScore} pts)`);
  
  if (sectionScore < 13) {
    improvementNotes.push("Ensure all required sections are present and properly labeled");
  }

  const finalScore = Math.round((totalPoints / maxPoints) * 100);
  
  console.log(`[ALIGNMENT SCORE] Final score: ${finalScore}% (${totalPoints}/${maxPoints} points)`);
  details.forEach(d => console.log(`  - ${d}`));

  return {
    score: finalScore,
    details,
    improvementNotes: improvementNotes.length > 0 ? improvementNotes : ["Strategy is well-aligned with source data"],
  };
}
