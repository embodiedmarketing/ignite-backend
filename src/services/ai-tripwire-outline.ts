import Anthropic from '@anthropic-ai/sdk';
import { getTextFromAnthropicContent } from "../utils/ai-response";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface TripwireResponses {
  offerName?: string;
  bigPromise?: string;
  problems?: string;
  differentFromFree?: string;
  urgency?: string;
  frustrations?: string;
  triedEverything?: string;
  objections?: string;
  components?: string;
  benefits?: string;
  emotionalBenefit?: string;
  credibility?: string;
  testimonials?: string;
  personalStory?: string;
  format?: string;
  timeCommitment?: string;
  tools?: string;
  price?: string;
  regularPrice?: string;
  valuePosition?: string;
}

interface TripwireOutlineResult {
  outline: string;
  missingInformation: string[];
  completeness: number;
}

export async function generateTripwireOutline(
  responses: TripwireResponses,
  messagingStrategy?: string | null
): Promise<TripwireOutlineResult> {
  
  // Calculate completeness
  const completeness = calculateCompleteness(responses);
  
  // Identify missing information
  const missingInfo = identifyMissingInformation(responses);
  
  // If completion is too low, return early
  if (completeness < 0.4) {
    return {
      outline: "",
      missingInformation: missingInfo,
      completeness
    };
  }

  try {
    const messagingStrategyContext = messagingStrategy 
      ? `\n\n📋 USER'S MESSAGING STRATEGY (Use this voice, tone, and positioning):\n${messagingStrategy}\n\nIMPORTANT: Align your Tripwire Offer Outline with the voice, tone, positioning, and messaging style from the above strategy. Use similar language patterns, emotional hooks, and brand voice.\n`
      : '';

    const prompt = `<prompt>
  <task>Transform user's detailed responses into a rich, emotionally compelling Tripwire Offer Outline that synthesizes and expands on their input.</task>
  
  <inputs>
    ${messagingStrategyContext ? `<messaging_strategy_context>
      <![CDATA[
${messagingStrategyContext}
      ]]>
    </messaging_strategy_context>` : ''}
    <user_responses>
      <![CDATA[
${formatResponsesForPrompt(responses)}
      ]]>
    </user_responses>
  </inputs>
  
  <critical_instruction>
    ALWAYS generate a complete tripwire outline. Never refuse or ask for more info. If you see placeholder text (Lorem ipsum, etc.), ignore it and use messaging strategy + other fields to create compelling content. Fill gaps from context; do not mention placeholders.
  </critical_instruction>
  <ai_writing_rules>
    Clarity: one core problem, one core promise; plain language; one transformation. Specificity: concrete outcomes, "looks like/feels like" examples. Emotional resonance: every benefit has emotional payoff. Differentiation: what can't be found free (personalization, structure, support). Flow: Problem → Promise → Proof → Price → Payoff.
  </ai_writing_rules>
  <depth_rules>
    Use ALL user input; EXPAND with insight and emotion; substantial sections; do not summarize—synthesize and expand. Match or exceed user response depth where needed.
  </depth_rules>
  
  <outline_structure>
    <section number="1" emoji="1️⃣" name="OFFER OVERVIEW">
      <field name="Offer Name">${responses.offerName || '[Short, branded title]'}</field>
      <field name="Core Transformation (Main Promise)">One concise, specific result the offer delivers - based on ${responses.bigPromise || 'the main promise'}</field>
      <field name="One-Sentence Desire Fulfilled">"You'll [clear outcome] so you can [emotional benefit]."</field>
    </section>
    
    <section number="2" emoji="2️⃣" name="PURPOSE & POSITIONING">
      <field name="Problem This Solves">Summarize 2-3 frustrations or desires from: ${responses.problems || 'user answers'} and ${responses.frustrations || 'frustrations'}</field>
      <field name="What Makes It Different">Explain how this offer stands out from free or generic resources - based on: ${responses.differentFromFree || 'differentiation'}</field>
      <field name="Why It's Urgent Now">Describe what's at stake or why taking action now matters - based on: ${responses.urgency || 'urgency factors'}</field>
    </section>
    
    <section number="3" emoji="3️⃣" name="TARGET AUDIENCE">
      <field name="Ideal Customer">Describe who this is for and what stage they're in</field>
      <field name="What They've Tried (and Why It Didn't Work)">"They've tried [solution] but still struggle because [reason]." Use: ${responses.triedEverything || 'past solutions'}</field>
      <field name="False Beliefs / Objections (and Reframes)">Transform objections into reframes: ${formatObjections(responses.objections)}</field>
    </section>
    
    <section number="4" emoji="4️⃣" name="STRUCTURE & COMPONENTS">
      <field name="Phases or Roadmap">Create a logical progression from the components</field>
      <field name="Core Components">
        ${formatFeatures(responses.components)}
        For each component, add: → [Direct benefit]
      </field>
      <field name="Bonuses">Add any additional value or quick wins</field>
      <field name="Ultimate Emotional Benefit">"They'll feel [emotion], finally able to [new reality]." Based on: ${responses.emotionalBenefit || 'emotional transformation'}</field>
    </section>
    
    <section number="5" emoji="5️⃣" name="PROOF & AUTHORITY">
      <field name="Personal Story / Connection">How the creator relates to this pain point - based on: ${responses.personalStory || 'personal connection'}</field>
      <field name="Expertise / Credentials">Include relevant qualifications or experience - based on: ${responses.credibility || 'credentials'}</field>
      <field name="Testimonials / Social Proof">${responses.testimonials || '"Before I joined, I [pain]. After [time], I [result]." — [Name]'}</field>
    </section>
    
    <section number="6" emoji="6️⃣" name="PRICING & VALUE">
      <field name="Investment">${responses.price || '$[Price]'} ${responses.regularPrice ? `(Normally ${responses.regularPrice})` : ''}</field>
      <field name="Value Framing">"Less than the cost of [painful alternative], for the result of [promise]." Based on: ${responses.valuePosition || 'value positioning'}</field>
      <field name="Guarantee / Risk Reversal">"If you [take action] and don't get [result], you'll receive [risk reversal]."</field>
    </section>
    
    <section number="7" emoji="7️⃣" name="DELIVERY & SUPPORT">
      <field name="Format + Duration">"Delivered as ${responses.format || '[format]'} over ${responses.timeCommitment || '[timeframe]'}."</field>
      <field name="Support Included">Coaching calls, community, reviews, etc. - infer from components and format</field>
      <field name="Tools / Access Points">${responses.tools || '[Platforms or systems needed to deliver it]'}</field>
    </section>
    
    <section number="8" emoji="8️⃣" name="OFFER SUMMARY (CLOSING SNAPSHOT)">
      "${responses.offerName || '[Offer Name]'} is a ${responses.format || '[format/type]'} for [ideal audience] who want to [main transformation]. Through [core components], it helps them [achieve key result] without [major pain]. Backed by [proof/credibility] and [guarantee], it gives them [emotional payoff] in ${responses.timeCommitment || '[timeframe]'}."
    </section>
  </outline_structure>
  
  <important_instructions>
    Keep EXACT section structure with emoji headers (1️⃣–8️⃣). Fill every section with details from user responses. Transform vague into specific; every benefit emotional + logical. Smooth flow; active, human phrasing; depth and substance. EXPAND user input—never compress or summarize.
  </important_instructions>
  <output>Generate the complete outline now.</output>
</prompt>`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2500,
      temperature: 0.7,
    });

    const outline = getTextFromAnthropicContent(response.content) || "";

    // Validate content
    if (!outline || outline.trim().length < 100) {
      return {
        outline: generateFallbackOutline(responses),
        missingInformation: missingInfo,
        completeness
      };
    }

    return {
      outline,
      missingInformation: missingInfo,
      completeness
    };

  } catch (error) {
    console.error("Error generating tripwire outline:", error);
    
    // Provide fallback on error
    return {
      outline: generateFallbackOutline(responses),
      missingInformation: missingInfo,
      completeness
    };
  }
}

function formatResponsesForPrompt(responses: TripwireResponses): string {
  const sections = [
    `Offer Name: ${responses.offerName || 'Not provided'}`,
    `Big Promise: ${responses.bigPromise || 'Not provided'}`,
    `Problems Solved: ${responses.problems || 'Not provided'}`,
    `Different from Free: ${responses.differentFromFree || 'Not provided'}`,
    `Urgency: ${responses.urgency || 'Not provided'}`,
    `Frustrations: ${responses.frustrations || 'Not provided'}`,
    `Tried Everything: ${responses.triedEverything || 'Not provided'}`,
    `Objections: ${responses.objections || 'Not provided'}`,
    `Components: ${responses.components || 'Not provided'}`,
    `Benefits: ${responses.benefits || 'Not provided'}`,
    `Emotional Benefit: ${responses.emotionalBenefit || 'Not provided'}`,
    `Credibility: ${responses.credibility || 'Not provided'}`,
    `Testimonials: ${responses.testimonials || 'Not provided'}`,
    `Personal Story: ${responses.personalStory || 'Not provided'}`,
    `Format: ${responses.format || 'Not provided'}`,
    `Time Commitment: ${responses.timeCommitment || 'Not provided'}`,
    `Tools: ${responses.tools || 'Not provided'}`,
    `Price: ${responses.price || 'Not provided'}`,
    `Regular Price: ${responses.regularPrice || 'Not provided'}`,
    `Value Position: ${responses.valuePosition || 'Not provided'}`
  ];

  return sections.filter(s => !s.endsWith('Not provided')).join('\n');
}

function containsPlaceholderText(text: string): boolean {
  if (!text) return false;
  const placeholderPatterns = [
    /lorem ipsum/i,
    /sed officia/i,
    /obcaecati/i,
    /laborum ducimus/i,
    /dolorem/i,
    /consectetur/i,
    /adipiscing/i,
    /^[A-Z][a-z]+ [a-z]+ [a-z]+$/i, // Pattern like "Sed officia enim"
    /^[A-Z][a-z]+ [A-Z][a-z]+ [A-Z]/i, // Pattern like "Obcaecati aliqua Ex"
  ];
  return placeholderPatterns.some(pattern => pattern.test(text));
}

function formatObjections(objections?: string): string {
  if (!objections) return '• [Objection] → [How Offer Overcomes It]';
  
  const lines = objections.split('\n').filter(l => l.trim());
  if (lines.length === 0) return '• [Objection] → [How Offer Overcomes It]';
  
  return lines.map(line => `• ${line}`).join('\n');
}

function formatFeatures(components?: string): string {
  if (!components) return '• [Feature Component]';
  
  const lines = components.split('\n').filter(l => l.trim());
  if (lines.length === 0) return '• [Feature Component]';
  
  return lines.map(line => `• ${line}`).join('\n');
}

function formatBenefits(benefits?: string): string {
  if (!benefits) return '• [Benefit Description]';
  
  const lines = benefits.split('\n').filter(l => l.trim());
  if (lines.length === 0) return '• [Benefit Description]';
  
  return lines.map(line => `• ${line}`).join('\n');
}

function calculateCompleteness(responses: TripwireResponses): number {
  const fields = Object.values(responses);
  const total = fields.length;
  if (total === 0) return 0;

  const filled = fields.filter(value => value && value.trim().length > 5).length;
  return Math.round((filled / total) * 100) / 100;
}

function identifyMissingInformation(responses: TripwireResponses): string[] {
  const missing: string[] = [];
  
  const required = {
    offerName: "Offer name/title",
    bigPromise: "Big promise or main result",
    problems: "Specific problems solved",
    differentFromFree: "Differentiation from free alternatives",
    components: "Main components/features",
    benefits: "Direct benefits",
    price: "Tripwire price"
  };

  Object.entries(required).forEach(([key, description]) => {
    const value = responses[key as keyof TripwireResponses];
    if (!value || value.trim().length < 5) {
      missing.push(description);
    }
  });

  return missing;
}

function generateFallbackOutline(responses: TripwireResponses): string {
  return `# TRIPWIRE OFFER OUTLINE

## 1️⃣ OFFER OVERVIEW
**Offer Name:** ${responses.offerName || '[Short, branded title]'}

**Core Transformation (Main Promise):** ${responses.bigPromise || '[One concise, specific result the offer delivers]'}

**One-Sentence Desire Fulfilled:** "You'll ${responses.bigPromise || '[clear outcome]'} so you can [emotional benefit]."

## 2️⃣ PURPOSE & POSITIONING
**Problem This Solves:**
${responses.problems || '[Summarize 2-3 frustrations or desires]'}
${responses.frustrations || ''}

**What Makes It Different:**
${responses.differentFromFree || '[Explain how this offer stands out from free or generic resources]'}

**Why It's Urgent Now:**
${responses.urgency || '[Describe what\'s at stake or why taking action now matters]'}

## 3️⃣ TARGET AUDIENCE
**Ideal Customer:**
[Describe who this is for and what stage they're in]

**What They've Tried (and Why It Didn't Work):**
${responses.triedEverything || '"They\'ve tried [solution] but still struggle because [reason]."'}

**False Beliefs / Objections (and Reframes):**
${formatObjections(responses.objections)}

## 4️⃣ STRUCTURE & COMPONENTS
**Phases or Roadmap:**
[Create a logical progression]

**Core Components:**
${formatFeatures(responses.components)}

**Bonuses:**
[Add any additional value or quick wins]

**Ultimate Emotional Benefit:**
${responses.emotionalBenefit || '"They\'ll feel [emotion], finally able to [new reality]."'}

## 5️⃣ PROOF & AUTHORITY
**Personal Story / Connection:**
${responses.personalStory || '[How the creator relates to this pain point]'}

**Expertise / Credentials:**
${responses.credibility || '[Include relevant qualifications or experience]'}

**Testimonials / Social Proof:**
${responses.testimonials || '"Before I joined, I [pain]. After [time], I [result]." — [Name]'}

## 6️⃣ PRICING & VALUE
**Investment:**
${responses.price || '$[Price]'}${responses.regularPrice ? ` (Normally ${responses.regularPrice})` : ''}

**Value Framing:**
${responses.valuePosition || '"Less than the cost of [painful alternative], for the result of [promise]."'}

**Guarantee / Risk Reversal:**
"If you [take action] and don't get [result], you'll receive [risk reversal]."

## 7️⃣ DELIVERY & SUPPORT
**Format + Duration:**
"Delivered as ${responses.format || '[format]'} over ${responses.timeCommitment || '[timeframe]'}."

**Support Included:**
[Coaching calls, community, reviews, etc.]

**Tools / Access Points:**
${responses.tools || '[Platforms or systems needed to deliver it]'}

## 8️⃣ OFFER SUMMARY (CLOSING SNAPSHOT)
"${responses.offerName || '[Offer Name]'} is a ${responses.format || '[format/type]'} for [ideal audience] who want to [main transformation]. Through [core components], it helps them [achieve key result] without [major pain]. Backed by [proof/credibility] and [guarantee], it gives them [emotional payoff] in ${responses.timeCommitment || '[timeframe]'}."

---

*Complete all missing sections above to generate a comprehensive outline.*`;
}

