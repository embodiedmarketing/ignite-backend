import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface OfferResponses {
  [key: string]: string;
}

interface OfferOutlineResult {
  outline: string;
  missingInformation: string[];
  completeness: number;
  recommendations: string[];
}

export async function generateOfferOutline(
  offerResponses: OfferResponses,
  messagingStrategy?: Record<string, string>
): Promise<OfferOutlineResult> {
  
  // Calculate completeness
  const completeness = calculateOfferCompleteness(offerResponses);
  
  // Identify missing information
  const missingInfo = identifyMissingOfferInformation(offerResponses);
  
  // If completion is too low, return early with guidance
  if (completeness < 0.6) {
    return {
      outline: "",
      missingInformation: missingInfo,
      completeness,
      recommendations: generateOfferRecommendations(completeness, missingInfo)
    };
  }

  try {
    // Extract key insights from responses
    const insights = extractOfferInsights(offerResponses, messagingStrategy);
    
    const prompt = `You are an expert offer strategist creating a comprehensive offer outline for a business professional. Based on their responses, create a detailed offer outline that includes both the structure and messaging.

OFFER RESPONSES PROVIDED:
${formatOfferInsightsForPrompt(insights)}

${messagingStrategy ? `MESSAGING STRATEGY CONTEXT:
${formatMessagingStrategyForPrompt(messagingStrategy)}` : ''}

Create a comprehensive offer outline that includes:

1. **OFFER FOUNDATION**
   - Clear, compelling offer title using customer language
   - One-sentence transformation statement (what customers get)
   - Core problem being solved
   - Target customer description

2. **OFFER STRUCTURE & DELIVERY**
   - Delivery method and format
   - Timeline and duration
   - Complete program components (each component paired with its specific benefit/outcome)
   - Support and accountability elements

3. **PRICING & POSITIONING**
   - Pricing strategy and rationale
   - Value proposition and ROI
   - Payment options
   - Positioning against alternatives

4. **GUARANTEE & RISK REVERSAL**
   - Specific guarantee terms
   - Risk reversal elements
   - Success criteria and metrics

SPECIAL FOCUS: In the "OFFER STRUCTURE & DELIVERY" section, create a detailed component-benefit mapping where each program element is clearly paired with its specific benefit or outcome. Format it as:
- Component Name → Specific Benefit/Outcome for customer

This component-benefit mapping is critical for sales page generation, so be thorough and specific about what each element delivers.

Write this as a professional strategy document that could be used to create sales pages, marketing materials, and presentations. Use clear headings and bullet points. Make it specific and actionable.

Avoid generic business language. Use the customer's actual language and focus on concrete outcomes and emotional benefits.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1500,
      temperature: 0.7,
    });

    const contentText = response.content[0]?.type === "text" ? response.content[0].text : "";
    const outline = contentText || "";

    // Validate that we have substantial content
    if (!outline || outline.trim().length < 100) {
      console.log("OpenAI returned insufficient content, using enhanced fallback");
      const fallbackInsights = extractOfferInsights(offerResponses, messagingStrategy);
      const fallbackOutline = generateEnhancedFallbackOfferOutline(fallbackInsights, messagingStrategy);
      
      return {
        outline: fallbackOutline,
        missingInformation: missingInfo,
        completeness,
        recommendations: generateOfferRecommendations(completeness, missingInfo)
      };
    }

    return {
      outline,
      missingInformation: missingInfo,
      completeness,
      recommendations: generateOfferRecommendations(completeness, missingInfo)
    };

  } catch (error) {
    console.error("Error generating offer outline:", error);
    
    // Check if it's a rate limit error and provide fallback
    if (error instanceof Error && error.message.includes('Rate limit')) {
      console.log("Rate limit hit, providing enhanced fallback offer outline");
      const fallbackInsights = extractOfferInsights(offerResponses, messagingStrategy);
      return {
        outline: generateEnhancedFallbackOfferOutline(fallbackInsights, messagingStrategy),
        missingInformation: missingInfo,
        completeness,
        recommendations: generateOfferRecommendations(completeness, missingInfo)
      };
    }
    
    throw new Error("Failed to generate offer outline");
  }
}

function identifyMissingOfferInformation(responses: OfferResponses): string[] {
  const missing: string[] = [];
  
  const requiredSections = {
    "transformation": "Main transformation or outcome",
    "problem": "Specific problem being solved", 
    "delivery": "How the offer will be delivered",
    "timeline": "Timeline for results",
    "pricing": "Pricing strategy",
    "support": "Support and accountability",
    "guarantee": "Guarantees or promises"
  };

  Object.entries(requiredSections).forEach(([key, description]) => {
    const hasContent = Object.keys(responses).some(responseKey => 
      responseKey.toLowerCase().includes(key) && 
      responses[responseKey] && 
      responses[responseKey].trim().length > 10
    );
    
    if (!hasContent) {
      missing.push(description);
    }
  });

  return missing;
}

function calculateOfferCompleteness(responses: OfferResponses): number {
  const totalQuestions = Object.keys(responses).length;
  if (totalQuestions === 0) return 0;

  const answeredQuestions = Object.values(responses).filter(response => 
    response && response.trim().length > 10
  ).length;

  return Math.round((answeredQuestions / totalQuestions) * 100) / 100;
}

function extractOfferInsights(responses: OfferResponses, messagingStrategy?: Record<string, string>) {
  return {
    transformation: findResponseByKeywords(responses, ["transformation", "main transformation", "achieve"]),
    problem: findResponseByKeywords(responses, ["problem", "biggest problem", "challenge"]),
    approach: findResponseByKeywords(responses, ["different", "unique", "approach", "makes you"]),
    delivery: findResponseByKeywords(responses, ["deliver", "delivery", "format", "structure"]),
    timeline: findResponseByKeywords(responses, ["timeline", "time", "results", "90 days"]),
    pricing: findResponseByKeywords(responses, ["price", "charge", "cost", "investment"]),
    support: findResponseByKeywords(responses, ["support", "help", "guidance", "accountability"]),
    guarantee: findResponseByKeywords(responses, ["guarantee", "promise", "assure"]),
    objections: findResponseByKeywords(responses, ["objection", "concern", "hesitation"]),
    proof: findResponseByKeywords(responses, ["proof", "evidence", "testimonial", "result"]),
    urgency: findResponseByKeywords(responses, ["urgency", "scarcity", "limited", "deadline"]),
    // Pull from messaging strategy if available
    customerAvatar: messagingStrategy?.["customer-avatar"] || "",
    uniquePositioning: messagingStrategy?.["unique-positioning"] || "",
    brandVoice: messagingStrategy?.["brand-voice"] || ""
  };
}

function findResponseByKeywords(responses: OfferResponses, keywords: string[]): string {
  for (const key of Object.keys(responses)) {
    if (keywords.some(keyword => key.toLowerCase().includes(keyword.toLowerCase()))) {
      return responses[key] || "";
    }
  }
  return "";
}

function formatOfferInsightsForPrompt(insights: any): string {
  const sections = [
    `TRANSFORMATION: ${insights.transformation}`,
    `PROBLEM SOLVED: ${insights.problem}`,
    `UNIQUE APPROACH: ${insights.approach}`,
    `DELIVERY METHOD: ${insights.delivery}`,
    `TIMELINE: ${insights.timeline}`,
    `PRICING: ${insights.pricing}`,
    `SUPPORT PROVIDED: ${insights.support}`,
    `GUARANTEES: ${insights.guarantee}`,
    `PROOF/EVIDENCE: ${insights.proof}`
  ];

  return sections.filter(section => !section.endsWith(": ")).join("\n");
}

function formatMessagingStrategyForPrompt(strategy: Record<string, string>): string {
  return Object.entries(strategy)
    .map(([key, value]) => `${key.toUpperCase()}: ${value}`)
    .join("\n");
}

function generateOfferRecommendations(completeness: number, missingInfo: string[]): string[] {
  const recommendations: string[] = [];

  if (completeness < 0.4) {
    recommendations.push("Complete the core offer foundation questions first");
    recommendations.push("Focus on defining your transformation and target problem");
  } else if (completeness < 0.7) {
    recommendations.push("Add more detail to your delivery method and pricing strategy");
    recommendations.push("Include support and accountability elements");
  }

  if (missingInfo.length > 0) {
    recommendations.push(`Missing critical elements: ${missingInfo.slice(0, 3).join(", ")}`);
  }

  if (completeness >= 0.8) {
    recommendations.push("Great foundation! Consider testing with potential customers");
    recommendations.push("Focus on refining your messaging and objection handling");
  }

  return recommendations;
}

function generateEnhancedFallbackOfferOutline(insights: any, messagingStrategy?: Record<string, string>): string {
  // Extract actual content from insights or provide meaningful defaults
  const transformation = insights.transformation || "Help your customers achieve their desired outcome through proven methods";
  const problem = insights.problem || "Address their most pressing challenge";
  const approach = insights.approach || "Your unique methodology that sets you apart from competitors";
  const delivery = insights.delivery || "Comprehensive program delivered through structured modules";
  const timeline = insights.timeline || "90-day transformation timeline with milestone checkpoints";
  const pricing = insights.pricing || "Premium investment reflecting transformation value";
  const support = insights.support || "Direct access to expert guidance and accountability";
  const guarantee = insights.guarantee || "Results guarantee with clear success metrics";
  
  // Build comprehensive components list
  const components = [
    "Foundation Module → Establish clear direction and goals",
    "Implementation Framework → Step-by-step action plan", 
    "Expert Guidance → Direct access to proven strategies",
    "Accountability System → Regular check-ins and progress tracking",
    "Resource Library → Tools and templates for implementation",
    "Community Access → Connection with like-minded individuals"
  ];

  return `# COMPREHENSIVE OFFER OUTLINE

*Generated from your offer creation responses and messaging strategy*

---

## 1. OFFER FOUNDATION

**Core Transformation:** ${transformation}

**Primary Problem Solved:** ${problem}

**Target Customer:** Professionals ready to invest in proven solutions for sustainable results

**Unique Approach:** ${approach}

---

## 2. OFFER STRUCTURE & DELIVERY

**Delivery Method:** ${delivery}

**Program Timeline:** ${timeline}

**Core Components & Benefits:**
${components.map(comp => `• ${comp}`).join('\n')}

**Support Structure:** ${support}

**Implementation Support:** Weekly group calls, private community access, and resource library

---

## 3. PRICING & POSITIONING

**Investment Level:** ${pricing}

**Value Proposition:** ROI-focused pricing that reflects transformation value rather than time investment

**Payment Options:** 
- Single payment option (best value)
- Extended payment plan available
- Flexible terms for qualified participants

**Positioning:** Premium solution for serious professionals committed to results

---

## 4. GUARANTEE & RISK REVERSAL

**Guarantee Terms:** ${guarantee}

**Risk Reversal Elements:**
- 90-day implementation guarantee
- Clear success metrics and milestones
- Refund policy for non-completion scenarios
- Extended support for committed participants

**Success Criteria:**
- Measurable progress within first 30 days
- Implementation of core framework within 60 days
- Achievement of primary transformation within 90 days

---

## 5. NEXT STEPS

**Launch Preparation:**
- Validate pricing with target market
- Develop detailed curriculum and materials
- Create sales and marketing materials
- Set up delivery systems and support infrastructure

*This comprehensive outline provides the foundation for your complete offer. Use this as your blueprint for creating sales pages, marketing materials, and program development.*`;
}

