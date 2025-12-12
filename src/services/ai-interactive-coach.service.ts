import Anthropic from "@anthropic-ai/sdk";
import { getQuestionSpecificCoaching, evaluateResponseAgainstCoaching } from './question-specific-coaching';

// Using Claude Sonnet 4 (claude-sonnet-4-20250514) for all AI operations
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Enhanced question-specific coaching that uses our coaching database
function getQuestionSpecificCoachingPrompt(questionContext: string, userResponse: string): string {
  const coaching = getQuestionSpecificCoaching(questionContext);
  
  if (coaching) {
    const evaluation = evaluateResponseAgainstCoaching(userResponse, coaching);
    
    return `
QUESTION-SPECIFIC COACHING FOR: "${questionContext}"

EVALUATION CRITERIA FOR THIS QUESTION:
${coaching.evaluationCriteria.map(criteria => `- ${criteria}`).join('\n')}

CURRENT RESPONSE ANALYSIS:
${evaluation.feedback}

MISSING ELEMENTS TO ADD:
${evaluation.missingElements.map(element => `- ${element}`).join('\n')}

SPECIFIC IMPROVEMENT PROMPTS FOR THIS QUESTION:
${coaching.specificPrompts.map(prompt => `- ${prompt}`).join('\n')}

EXAMPLES OF EXCELLENT RESPONSES TO THIS EXACT QUESTION:
${coaching.improvedExamples.map((example, index) => `${index + 1}. "${example}"`).join('\n\n')}

COMMON MISTAKES TO AVOID:
${coaching.commonMistakes.map(mistake => `- ${mistake}`).join('\n')}

SUCCESS PATTERNS THAT WORK:
${coaching.successPatterns.map(pattern => `- ${pattern}`).join('\n')}

Based on this analysis, create improved versions that address the missing elements and follow the success patterns.`;
  }
  
  // Fallback for questions not in our database
  return `Focus on adding specific details, emotional depth, and customer language to make your response more compelling and actionable.`;
}

async function analyzeGeneralResponse(
  questionContext: string,
  userResponse: string,
  section: string,
  messagingStrategy?: any
): Promise<InteractiveCoachingResponse> {
  try {
    // Get question-specific coaching from our database
    const questionCoaching = getQuestionSpecificCoaching(questionContext);
    
    let coachingContext = "";
    if (questionCoaching) {
      const evaluation = evaluateResponseAgainstCoaching(userResponse, questionCoaching);
      
      coachingContext = `
QUESTION-SPECIFIC COACHING FOR: "${questionContext}"

EVALUATION CRITERIA FOR THIS QUESTION:
${questionCoaching.evaluationCriteria.map(criteria => `- ${criteria}`).join('\n')}

CURRENT RESPONSE ANALYSIS:
${evaluation.feedback}

MISSING ELEMENTS TO ADD:
${evaluation.missingElements.map(element => `- ${element}`).join('\n')}

EXAMPLES OF EXCELLENT RESPONSES TO THIS EXACT QUESTION:
${questionCoaching.improvedExamples.map((example, index) => `${index + 1}. "${example}"`).join('\n\n')}

COMMON MISTAKES TO AVOID:
${questionCoaching.commonMistakes.map(mistake => `- ${mistake}`).join('\n')}

SUCCESS PATTERNS THAT WORK:
${questionCoaching.successPatterns.map(pattern => `- ${pattern}`).join('\n')}
`;
    }

    const prompt = `You are an expert business coach providing question-specific feedback. You're analyzing a user's response to give tailored coaching.

QUESTION: "${questionContext}"
SECTION: "${section}"
USER'S CURRENT RESPONSE: "${userResponse}"

${coachingContext}

COACHING APPROACH:
1. ANALYZE their response against the specific criteria for this exact question
2. IDENTIFY which required elements are missing
3. PROVIDE 2-3 COMPLETE IMPROVED VERSIONS that address the missing elements
4. REFERENCE their specific words and build upon them rather than starting over
5. FOLLOW the success patterns proven to work for this question type

COACHING METHODOLOGY:
- Acknowledge what they've written specifically
- Use the proven improvement patterns for this question type
- Apply the best practices to enhance their content
- Avoid the common mistakes identified in our coaching knowledge
- Provide ready-to-use enhanced versions that follow successful transformation patterns

Respond with ONLY valid JSON (no markdown):
{
  "level": "needs-more-detail" | "good-start" | "excellent-depth",
  "levelDescription": "assessment based on best practices above",
  "feedback": "specific analysis using improvement patterns and coaching insights",
  "followUpQuestions": ["questions that address gaps identified in best practices"],
  "interactivePrompts": ["2-3 complete improved versions following transformation patterns"],
  "examples": ["examples from coaching knowledge that relate to their content"],
  "nextSteps": ["specific actions based on improvement patterns"],
  "encouragement": "encouraging statement about their progress",
  "conversationalResponse": "warm coaching response referencing their specific content and coaching insights"
}`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      messages: [{ role: "user", content: prompt + "\n\nIMPORTANT: Return ONLY valid JSON with no markdown formatting or code blocks." }],
      max_tokens: 800,
      temperature: 0.7,
    });

    const contentText = response.content[0]?.type === "text" ? response.content[0].text : "";
    if (!contentText) {
      throw new Error("No response from Anthropic");
    }

    let cleanContent = contentText;
    if (cleanContent.includes('```json')) {
      cleanContent = cleanContent.replace(/```json\s*/, '').replace(/```\s*$/, '');
    }
    if (cleanContent.includes('```')) {
      cleanContent = cleanContent.replace(/```.*?\n/, '').replace(/```\s*$/, '');
    }

    const parsed = JSON.parse(cleanContent.trim());
    return parsed;

  } catch (error) {
    console.error("General response analysis error:", error);
    return createContextualFallback(questionContext, userResponse, messagingStrategy);
  }
}

async function analyzeOfferResponse(
  questionContext: string,
  userResponse: string,
  messagingStrategy?: any
): Promise<InteractiveCoachingResponse> {
  try {
    const prompt = `You are an expert offer creation coach analyzing a user's response to an offer development question.

QUESTION: "${questionContext}"
USER'S CURRENT RESPONSE: "${userResponse}"

${messagingStrategy ? `MESSAGING STRATEGY CONTEXT:
${typeof messagingStrategy === 'string' ? messagingStrategy : JSON.stringify(messagingStrategy)}` : ''}

CRITICAL ANALYSIS APPROACH:
1. ANALYZE what the user has written specifically - don't ignore their content
2. IDENTIFY what's working well in their response
3. SPOT specific gaps or areas that need enhancement
4. PROVIDE 2-3 IMPROVED VERSIONS that build on their actual words
5. FOCUS on their offer creation, not generic business advice

COACHING GUIDELINES:
- If they've written substantial content (20+ words), acknowledge what they've provided
- Build on their specific ideas rather than replacing them
- For transformation questions: coach toward one powerful "I want..." customer statement
- For components questions: ensure each component has a clear customer benefit
- For differentiation questions: push for specific methodology or unique approach
- Use their messaging strategy insights to enhance their offer positioning

OFFER OUTLINE AUDIT FRAMEWORK:
When analyzing offer content, evaluate these core components:
1. TARGET AUDIENCE & PAIN POINTS: Are pain points specific, emotional, and urgent? Is there a consistent core problem?
2. PROBLEM-SOLUTION CLARITY: Does it solve one main problem with benefit-driven language (not process-driven)?
3. TRANSFORMATION STATEMENT: Short, emotionally resonant, outcome-focused following "We help [audience] go from [problem] to [desire] through [solution]"
4. DELIVERABLES: Are features tied to benefits? Do components match the transformation?
5. MESSAGING: Does it speak to dreams/results with outcome-oriented language (gain, become, achieve) vs tactical (get, access, download)?

KEY FEEDBACK PATTERNS:
- Flag vague descriptions: "Help you be more confident" → "Speak confidently at team meetings so you're seen as a leader"
- Transform features to benefits: "PDF guide" → "gives you clarity to take action fast"
- Lead with emotion + outcome: "Dream of running your business without tech headaches? We've got you."
- Create one-liner taglines usable "at Starbucks if someone asked"
- Address objections: time, money, DIY capability, trust

Respond with ONLY valid JSON (no markdown):
{
  "level": "needs-more-detail" | "good-start" | "excellent-depth",
  "levelDescription": "brief assessment of their current response quality",
  "feedback": "specific analysis of what they wrote and how to improve it",
  "followUpQuestions": ["specific questions about their offer based on what they wrote"],
  "interactivePrompts": ["2-3 improved versions of their actual response"],
  "examples": ["examples that relate to their specific content"],
  "nextSteps": ["actionable steps based on their current response"],
  "encouragement": "encouraging statement about their progress",
  "conversationalResponse": "warm coaching response that references their specific content"
}`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      messages: [{ role: "user", content: prompt + "\n\nIMPORTANT: Return ONLY valid JSON with no markdown formatting or code blocks." }],
      max_tokens: 800,
      temperature: 0.7,
    });

    const contentText = response.content[0]?.type === "text" ? response.content[0].text : "";
    if (!contentText) {
      throw new Error("No response from Anthropic");
    }

    let cleanContent = contentText;
    if (cleanContent.includes('```json')) {
      cleanContent = cleanContent.replace(/```json\s*/, '').replace(/```\s*$/, '');
    }
    if (cleanContent.includes('```')) {
      cleanContent = cleanContent.replace(/```.*?\n/, '').replace(/```\s*$/, '');
    }

    const parsed = JSON.parse(cleanContent.trim());
    return parsed;

  } catch (error) {
    console.error("Offer analysis error:", error);
    
    // Enhanced fallback based on user's actual response
    return createContextualFallback(questionContext, userResponse, messagingStrategy);
  }
}

function createContextualFallback(
  questionContext: string,
  userResponse: string,
  messagingStrategy?: any
): InteractiveCoachingResponse {
  const responseLength = userResponse.length;
  const hasSpecifics = /\b(specific|example|experience|situation|client|customer|result|benefit|outcome|transformation)\b/i.test(userResponse);
  const isTransformationQuestion = questionContext.toLowerCase().includes("transformation") || questionContext.toLowerCase().includes("dream");
  const isComponentsQuestion = questionContext.toLowerCase().includes("components") || questionContext.toLowerCase().includes("benefit");
  
  if (isTransformationQuestion) {
    return {
      level: responseLength > 50 && hasSpecifics ? "good-start" : "needs-more-detail",
      levelDescription: "Transformation statement needs clarity and emotion",
      feedback: `I can see you're thinking about the transformation your offer provides. Let's refine this into one powerful sentence that describes what transformation someone experiences when they complete your offer.`,
      followUpQuestions: [
        `What is the emotional or identity shift someone experiences?`,
        `What do they go FROM and what do they go TO?`,
        `How would you describe this transformation in one clear sentence?`
      ],
      interactivePrompts: [
        `Try rewriting as: "I want to ${userResponse.toLowerCase().includes('help') ? 'achieve [specific outcome]' : 'transform your current response into customer language'}"`,
        `From your customer's perspective: "I want to [use their emotional words for the result]"`,
        `Make it specific to YOUR offer: "I want to [exact result from completing your program]"`
      ],
      examples: [
        `Strong: "I want to land my first $10K client in 90 days" vs Weak: "I help with business growth"`,
        `Strong: "I want to wake up to sales notifications while I sleep" vs Weak: "I help with online marketing"`
      ],
      nextSteps: [
        `Rewrite in "I want..." format using customer language`,
        `Make it specific to what happens after completing YOUR offer`,
        `Use emotional words your customers would actually say`
      ],
      encouragement: "You're on the right track - let's make this transformation statement irresistible!",
      conversationalResponse: `I can see you understand the transformation you provide. Now let's craft this into one powerful sentence that makes your customers think "YES, that's exactly what I want!"`
    };
  }
  
  if (isComponentsQuestion) {
    return {
      level: responseLength > 30 ? "good-start" : "needs-more-detail",
      levelDescription: "Components need clear customer benefits",
      feedback: `I see you've listed some components. Now let's connect each one to a specific benefit or outcome your customer gets. Customers buy benefits, not features.`,
      followUpQuestions: [
        `For each component you mentioned, what specific problem does it solve for your customer?`,
        `What can your customer DO after completing each component?`,
        `Why would your customer be excited about each specific piece?`
      ],
      interactivePrompts: [
        `Take your first component and add: "→ BENEFIT: After this, my customer will be able to..."`,
        `For each component, ask: "So what? Why should my customer care about this?"`,
        `Rewrite as: "[Component Name] → [Specific customer outcome or ability they gain]"`
      ],
      examples: [
        `Strong: "Module 1: Foundation Audit → You'll discover exactly what's sabotaging your growth"`,
        `Strong: "Week 2: Content System → You'll attract ideal clients without feeling salesy"`
      ],
      nextSteps: [
        `Add a specific benefit after each component you listed`,
        `Use customer language - how would THEY describe the value?`,
        `Focus on what they can achieve, not what you'll teach`
      ],
      encouragement: "When you connect features to benefits, your offer becomes irresistible!",
      conversationalResponse: `You're thinking about the structure, which is great. Now let's make sure each piece clearly shows your customer what's in it for them.`
    };
  }
  
  // Generic enhancement for other offer questions
  return {
    level: responseLength > 40 && hasSpecifics ? "good-start" : "needs-more-detail",
    levelDescription: "Good foundation, needs more specificity",
    feedback: `You've given me a good starting point. Let's build on what you've written and make it more specific and compelling for your ideal customers.`,
    followUpQuestions: [
      `Can you expand on the specific details of what you wrote?`,
      `How does this connect to your customer's main pain points?`,
      `What specific outcomes or results does this create for your customers?`
    ],
    interactivePrompts: [
      `Build on what you wrote by adding specific details and customer benefits`,
      `Think about how to make your response more concrete and measurable`,
      `Consider how your ideal customer would respond to what you've written`
    ],
    examples: [
      `Specific details make offers more compelling than general statements`,
      `Customer-focused language converts better than business jargon`
    ],
    nextSteps: [
      `Add 2-3 specific details to what you've written`,
      `Include customer benefits and outcomes`,
      `Use language your customers would actually use`
    ],
    encouragement: "You're building something valuable - let's make it irresistible!",
    conversationalResponse: `I can see you're developing good ideas. Let's refine what you've written to make it more specific and customer-focused.`
  };
}

async function generateActualImprovedVersions(
  userResponse: string,
  questionContext: string,
  messagingStrategy?: any
): Promise<string[]> {
  try {
    // Get question-specific coaching based on the question type
    const questionSpecificPrompt = getQuestionSpecificCoachingPrompt(questionContext, userResponse);
    
    const prompt = `You are an expert business coach. A user answered this question: "${questionContext}"

Their current response: "${userResponse}"
${messagingStrategy ? `Their messaging strategy context: ${JSON.stringify(messagingStrategy)}` : ''}

${questionSpecificPrompt}

Create 2-3 ACTUAL IMPROVED VERSIONS of their response that they can use directly. These should be:
- Complete, ready-to-use responses (not suggestions or prompts)
- Based on their original response but enhanced with more depth, emotion, and specificity
- Written in a natural, authentic voice
- Addressing the question more completely than their original response

CRITICAL: Do NOT provide thinking prompts like "Think about..." or "Consider...". 
Provide ACTUAL improved response text they can copy and paste.

Return as a JSON object with an "improvedVersions" array containing the enhanced responses.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      messages: [{ role: "user", content: prompt + "\n\nIMPORTANT: Return ONLY valid JSON with an 'improvedVersions' array. Do not include markdown formatting." }],
      max_tokens: 500
    });

    const contentText = response.content[0]?.type === "text" ? response.content[0].text : "";
    if (!contentText) return [];
    const result = JSON.parse(contentText);
    return result.improvedVersions || [];
  } catch (error) {
    console.error('Error generating improved versions:', error);
    return [];
  }
}

interface InteractiveCoachingResponse {
  level: "needs-more-detail" | "good-start" | "excellent-depth";
  levelDescription: string;
  feedback: string;
  followUpQuestions: string[];
  interactivePrompts: string[];
  examples: string[];
  nextSteps: string[];
  encouragement: string;
  conversationalResponse: string;
}

// Question complexity analysis to provide appropriate support level
function analyzeQuestionComplexity(questionContext: string): {
  complexity: "simple" | "moderate" | "complex" | "deep";
  questionType: string;
  supportLevel: string;
  keyElements: string[];
} {
  const question = questionContext.toLowerCase();
  
  // Deep psychological/emotional questions
  if (question.includes("biggest frustration") || question.includes("deepest fears") || question.includes("anxieties") || question.includes("keep them up at night")) {
    return {
      complexity: "deep",
      questionType: "emotional-psychological",
      supportLevel: "high-empathy",
      keyElements: ["emotional depth", "specific pain points", "personal impact", "real situations"]
    };
  }
  
  // Strategic positioning questions
  if (question.includes("uniquely qualified") || question.includes("makes you different") || question.includes("positioning") || question.includes("competitive advantage")) {
    return {
      complexity: "complex",
      questionType: "strategic-positioning",
      supportLevel: "analytical-guidance",
      keyElements: ["specific credentials", "unique experience", "measurable results", "differentiation"]
    };
  }
  
  // Customer avatar/demographic questions
  if (question.includes("age range") || question.includes("income level") || question.includes("job title") || question.includes("demographics")) {
    return {
      complexity: "moderate",
      questionType: "demographic-profiling",
      supportLevel: "structured-guidance",
      keyElements: ["specific ranges", "clear categories", "realistic data", "market research"]
    };
  }
  
  // Behavioral/decision-making questions
  if (question.includes("make purchasing decisions") || question.includes("decision-making") || question.includes("buying process")) {
    return {
      complexity: "complex",
      questionType: "behavioral-analysis",
      supportLevel: "process-guidance",
      keyElements: ["decision factors", "timeline", "influences", "barriers"]
    };
  }
  
  // Offer components and benefits questions
  if (question.includes("components of your offer") || question.includes("main components") || question.includes("BENEFIT") || question.includes("outcome of each")) {
    return {
      complexity: "complex",
      questionType: "components-benefits-mapping",
      supportLevel: "structured-guidance",
      keyElements: ["component list", "benefit connection", "customer outcomes", "why they care"]
    };
  }

  // Solution/transformation questions - especially the main transformation question
  if (question.includes("main transformation") || question.includes("transformation you help") || question.includes("magic wand") || question.includes("perfect day") || question.includes("solve their problem") || question.includes("transformation")) {
    return {
      complexity: "deep",
      questionType: "transformation-visioning",
      supportLevel: "creative-guidance",
      keyElements: ["one powerful sentence", "customer language", "I want statement", "specific outcome"]
    };
  }
  
  // Brand voice/communication questions
  if (question.includes("brand voice") || question.includes("personality") || question.includes("communicate") || question.includes("tone")) {
    return {
      complexity: "moderate",
      questionType: "brand-voice",
      supportLevel: "creative-guidance",
      keyElements: ["personality traits", "communication style", "examples", "consistency"]
    };
  }
  
  // Default for simpler questions
  return {
    complexity: "simple",
    questionType: "general",
    supportLevel: "basic-guidance",
    keyElements: ["specific details", "clear examples", "personal experience"]
  };
}

// Provide question-specific guidance based on complexity analysis
function getQuestionSpecificGuidance(
  questionContext: string, 
  analysis: any, 
  userResponse: string
): InteractiveCoachingResponse {
  
  switch (analysis.questionType) {
    case "emotional-psychological":
      return {
        level: "needs-more-detail",
        levelDescription: "Emotional depth needed",
        feedback: "This question explores the deep emotional reality your customers face. We need to get inside their head and heart to understand what they're really experiencing.",
        followUpQuestions: [
          "What specific emotions wash over your ideal customer when this frustration hits hardest?",
          "What do your customers whisper to themselves in their most defeated moments?",
          "How does this problem make your customers feel about themselves as people?",
          "What physical sensations do your customers experience when this frustration peaks?",
          "What do your customers complain about to their spouse or close friends when they think no one else understands?"
        ],
        interactivePrompts: [
          "Picture your ideal customer at 2 AM, unable to sleep because of this problem - what thoughts are racing through their mind?",
          "Imagine overhearing your customer's private conversation with their best friend about this struggle",
          "Think about the moment your customer realizes this problem is bigger than they thought - what does that feel like for them?",
          "Consider the shame or embarrassment your customers might feel when others seem to have it figured out"
        ],
        examples: [
          "DEEP: 'I feel like such a failure. Everyone else seems to have this figured out while I'm drowning. I'm embarrassed to even admit how overwhelmed I am.' vs SHALLOW: 'It's challenging.'",
          "DEEP: 'I lie awake at 3 AM wondering if I'll ever be successful or if I'm just fooling myself. The stress is affecting my marriage.' vs SHALLOW: 'I have some concerns.'",
          "DEEP: 'I feel like I'm letting my family down. Every failed attempt makes me question if I'm cut out for this.' vs SHALLOW: 'I face obstacles.'"
        ],
        nextSteps: [
          "List your specific credentials, certifications, years of experience, or measurable achievements",
          "Describe your unique combination of skills/background that competitors can't replicate",
          "Share your personal transformation story that gives you credibility to help others",
          "Quantify your results with specific numbers (clients helped, revenue generated, success rates)"
        ],
        encouragement: "When you clearly articulate your unique qualifications, ideal clients will recognize you as the expert they've been searching for!",
        conversationalResponse: "This question is about establishing YOUR credibility and what makes YOU uniquely qualified. What specific experience, results, or background do you bring that others can't?"
      };

    case "strategic-positioning":
      return {
        level: "needs-more-detail",
        levelDescription: "Strategic specificity needed",
        feedback: "This question is about YOUR unique qualifications and what makes YOU different from other experts in your field. Focus on your specific credentials, measurable results, unique experience combination, and what you bring that others can't replicate.",
        followUpQuestions: [
          "What specific credentials, certifications, or years of experience do you have that establish your expertise?",
          "What measurable results have you personally achieved that prove your competence (revenue generated, clients helped, years of experience)?",
          "What unique combination of background, skills, or life experience gives you an unfair advantage over competitors?",
          "What personal transformation or breakthrough in your own life gives you credibility to guide others?",
          "What specific methodology, framework, or approach have you developed that's uniquely yours?",
          "What do your best clients say makes you different from everyone else they've worked with?"
        ],
        interactivePrompts: [
          "Think about the specific moment you realized you had unique expertise others don't have",
          "Consider what combination of your background would be impossible for competitors to replicate",
          "Reflect on your biggest personal breakthrough that now helps you guide others",
          "What would your best clients say is your 'secret sauce' that makes you different?",
          "Think about what you do differently that gets better results than the 'standard' approach"
        ],
        examples: [
          "STRONG: 'Former Wall Street analyst who lost everything in 2008, then built a 7-figure consulting business in 3 years using unconventional relationship-based strategies instead of traditional marketing.' vs WEAK: 'Experienced business consultant.'",
          "STRONG: 'Helped 47 service-based entrepreneurs go from $50K to $200K+ revenue in 18 months using my 3-phase Authority Without Advertising system.' vs WEAK: 'Good track record with clients.'",
          "STRONG: 'Only business coach who combines 15 years of Fortune 500 operations experience with certification in trauma-informed coaching - perfect for high-achievers healing from burnout.' vs WEAK: 'Corporate background plus coaching certification.'"
        ],
        nextSteps: [
          "Include specific numbers, timeframes, and measurable outcomes from your experience",
          "Combine 2-3 unique qualifications that create an 'unfair advantage'",
          "Add your personal transformation story that gives you credibility",
          "Mention your specific methodology or approach that's uniquely yours"
        ],
        encouragement: "Your unique combination of experience is what makes you irreplaceable - let's make that crystal clear!",
        conversationalResponse: "Let's build your positioning on concrete proof. What specific results, unique experience combination, and personal transformation story make you the obvious choice for your ideal clients?"
      };

    case "demographic-profiling":
      return {
        level: "needs-more-detail",
        levelDescription: "Specific targeting needed",
        feedback: "Demographic questions need precise, realistic data to create effective targeting.",
        followUpQuestions: [
          "What specific age range represents your best customers?",
          "What income level indicates they can afford your solution?",
          "What job titles or roles are most common among your ideal clients?",
          "What stage of business or career are they typically in?"
        ],
        interactivePrompts: [
          "Think about your current best customers",
          "Consider who has both the problem and resources to solve it",
          "Reflect on who gets the best results from your work"
        ],
        examples: [
          "'35-50 years old, $75K-200K income, consulting business owners' vs 'professionals'",
          "'Series A startup founders, 25-100 employees' vs 'entrepreneurs'",
          "'Mid-career marketing directors at SaaS companies' vs 'marketers'"
        ],
        nextSteps: [
          "Use specific ranges and clear categories",
          "Base on real customer data, not assumptions"
        ],
        encouragement: "Precise targeting makes all your marketing more effective!",
        conversationalResponse: "Demographics help you find and speak to the right people. Who exactly are your ideal customers?"
      };

    case "transformation-visioning":
      return {
        level: "needs-more-detail",
        levelDescription: "Need one powerful offer transformation sentence",
        feedback: "This needs to be ONE powerful sentence that captures the exact result your SPECIFIC OFFER delivers. Focus on what someone achieves by completing THIS particular program, course, or service - not your business in general.",
        followUpQuestions: [],
        interactivePrompts: [
          `For your specific offer, try: "I want to [exact outcome after completing your program/course/service]"`,
          `Think about your offer delivery: "I want to [transformation that happens in your specific timeframe]"`,
          `From your customer's perspective: "I want to [specific result they get from THIS offer, not your business overall]"`
        ],
        examples: [
          "OFFER-SPECIFIC: 'I want to land my first $10K client within 90 days' vs BUSINESS GENERAL: 'I help with business growth'",
          "OFFER-SPECIFIC: 'I want to build a profitable online course that sells while I sleep' vs BUSINESS GENERAL: 'I help with online education'",
          "OFFER-SPECIFIC: 'I want to create a 6-figure consulting business in 6 months' vs BUSINESS GENERAL: 'I help consultants grow'"
        ],
        nextSteps: [
          "Focus on what happens AFTER someone completes your specific program/course/service",
          "Use the exact timeframe and outcomes your offer promises to deliver",
          "Make it about THIS offer's transformation, not your overall business mission"
        ],
        encouragement: "Your offer's specific transformation is what makes people buy - let's nail exactly what they get!",
        conversationalResponse: "Focus on your specific offer's transformation. What exact result does someone achieve by completing THIS particular program, course, or service you're creating?"
      };

    case "components-benefits-mapping":
      return {
        level: "needs-more-detail",
        levelDescription: "Missing benefit connections for components",
        feedback: "Most entrepreneurs make the mistake of only listing WHAT they do without connecting it to WHY customers care. You need to show the specific benefit or outcome each component delivers to your customer.",
        followUpQuestions: [],
        interactivePrompts: [
          `For each component, ask: "What specific problem does this solve for my customer?"`,
          `Think: "After completing this component, my customer will be able to..."`,
          `Consider: "Why would my customer be excited about THIS particular step?"`
        ],
        examples: [
          "WEAK: 'Module 1: Foundation Building' vs STRONG: 'Module 1: Foundation Audit → BENEFIT: You'll discover exactly what's sabotaging your growth so you stop wasting time on the wrong strategies'",
          "WEAK: 'Week 2: Content Creation' vs STRONG: 'Week 2: Magnetic Content System → BENEFIT: You'll have a repeatable process that attracts ideal clients without feeling salesy or pushy'",
          "WEAK: 'Phase 3: Implementation' vs STRONG: 'Phase 3: Revenue Acceleration → BENEFIT: You'll land your first premium client using proven scripts and strategies that eliminate price objections'"
        ],
        nextSteps: [
          "For each component you listed, add '→ BENEFIT:' and explain the specific outcome",
          "Use customer language - how would THEY describe the value they get?",
          "Focus on what they can DO, FEEL, or ACHIEVE after each component",
          "Make each benefit answer the question: 'So what? Why should they care?'"
        ],
        encouragement: "When you connect features to benefits, your offer becomes irresistible because customers see exactly what's in it for them!",
        conversationalResponse: "I see you've listed components, but I need you to connect each one to a specific customer benefit. For each component, tell me: what specific outcome or result does your customer get from completing that piece?"
      };

    default:
      return {
        level: "needs-more-detail",
        levelDescription: "More detail needed",
        feedback: "This question is important for your messaging strategy. Let's develop a more detailed response.",
        followUpQuestions: [
          "Can you provide a specific example?",
          "What makes this particularly important?",
          "How does this connect to your business goals?"
        ],
        interactivePrompts: [
          "Think about concrete situations",
          "Consider real-world applications",
          "Reflect on your experience"
        ],
        examples: [
          "Specific examples are more compelling than general statements",
          "Personal stories create stronger connections"
        ],
        nextSteps: [
          "Add specific details and examples",
          "Explain the significance"
        ],
        encouragement: "Detailed responses create powerful messaging!",
        conversationalResponse: "Let's dive deeper into this question. What specific details can you share?"
      };
  }
}

export async function getInteractiveCoaching(
  section: string,
  questionContext: string,
  userResponse: string,
  userId: string = "anonymous",
  messagingStrategy?: any
): Promise<InteractiveCoachingResponse> {
  
  // Debug logging to identify data type issues
  console.log("=== INTERACTIVE COACHING DEBUG ===");
  console.log("Section type:", typeof section);
  console.log("Section value:", section);
  console.log("Section is string:", typeof section === 'string');
  console.log("================================");
  
  // Type safety: ensure section is a string
  const sectionStr = typeof section === 'string' ? section : String(section || 'Unknown');
  
  const questionAnalysis = analyzeQuestionComplexity(questionContext);
  
  // For very short responses, provide question-specific guidance
  if (userResponse.trim().length < 15) {
    return getQuestionSpecificGuidance(questionContext, questionAnalysis, userResponse);
  }
  
  // For all substantive responses, use AI analysis instead of generic fallbacks
  if (userResponse.trim().length >= 20) {
    // Offer creation questions get specialized analysis
    if (sectionStr.includes("Offer") || questionContext.includes("transformation") || questionContext.includes("components") || questionContext.includes("deliver")) {
      return await analyzeOfferResponse(questionContext, userResponse, messagingStrategy);
    }
    
    // All other questions (messaging strategy, customer avatar, etc.) get comprehensive analysis
    return await analyzeGeneralResponse(questionContext, userResponse, sectionStr, messagingStrategy);
  }

  // Build messaging context if available
  let messagingContext = "";
  if (messagingStrategy && typeof messagingStrategy === 'string' && messagingStrategy.length > 50) {
    messagingContext = `

EXISTING MESSAGING STRATEGY CONTEXT:
The user has already completed their comprehensive messaging strategy work. Here are their key insights:

${messagingStrategy}

CRITICAL COACHING APPROACH:
- DO NOT ask them to do more customer research - they've already completed this work
- EXTRACT specific insights from their messaging strategy above to enhance their offer foundation
- PROVIDE 2-3 COMPLETE, READY-TO-USE improved versions of their response
- USE their exact customer language and positioning from the strategy above
- FOCUS on how their offer delivers the transformation their customers want
- BUILD on their existing customer avatar and unique positioning work

IMPORTANT: Use this existing customer understanding to provide specific, actionable coaching that leverages their messaging foundation.`;
  }

  try {
    const prompt = `You are an expert business coach helping an entrepreneur develop their offer creation strategy. They just answered this question: "${questionContext}"${messagingContext}

QUESTION ANALYSIS:
- Complexity: ${questionAnalysis.complexity} (${questionAnalysis.questionType})
- This question specifically explores: ${questionAnalysis.keyElements.join(", ")}
- Their current response: "${userResponse}"

CRITICAL PERSPECTIVE GUIDANCE:
- If this question is about customer emotions, fears, frustrations, or feelings, ALL coaching must focus on their IDEAL CUSTOMER'S emotions, NOT the entrepreneur's personal feelings
- Questions about "their" fears means the customer's fears, not the entrepreneur's fears
- Help them understand what their customers think, feel, and experience
- Keep the focus on customer psychology, customer language, and customer emotional states
- NEVER ask about the entrepreneur's personal feelings or experiences
- ALL follow-up questions should be about understanding their CUSTOMERS better
- Examples: "What do your customers fear?" NOT "What do you fear?"

TRANSFORMATION QUESTION SPECIAL INSTRUCTIONS:
- If the question contains "main transformation" or "transformation you help people achieve", this asks what the OFFER provides
- The answer should describe the transformation from the entrepreneur's perspective (what they help achieve)
- Format: "They go from [current state] to [desired outcome]" or "Transform from X to Y"
- Focus on emotional/identity shifts, not just tactical results
- Examples: "Transform from overwhelmed solopreneur to confident CEO" vs "I help with business strategy"
- This is NOT asking for customer voice - it's asking what transformation the offer delivershe entrepreneur does

OFFER CREATION COACHING APPROACH:
- Since this is likely Step 2 (Create Your Offer), the user has already completed their messaging strategy in Step 1
- ANALYZE their existing messaging strategy and provide SPECIFIC RECOMMENDATIONS based on what you find
- DO NOT ask them to do more research - they've already done the work
- Instead of asking questions, GIVE THEM specific suggestions based on their messaging strategy data
- Provide 2-3 REVISED VERSIONS of their response that incorporate their customer insights
- Focus on how their offer delivers the transformation their customers want

As their business coach, provide deep, personalized guidance for this specific question. Your coaching should:

1. ACKNOWLEDGE their current response specifically
2. ANALYZE their existing messaging strategy and extract relevant insights
3. PROVIDE 2-3 SPECIFIC IMPROVED VERSIONS of their response using their customer data
4. Give 2-3 concrete examples that build on their actual customer avatar and positioning
5. Suggest EXACT LANGUAGE from their messaging strategy to improve their answer
6. Make the improvements actionable and ready to use immediately

For ${questionAnalysis.questionType} questions, focus especially on helping them develop ${questionAnalysis.keyElements.join(" and ")}.

IMPORTANT: If the question contains words like "their fears", "their frustrations", "their feelings", "what they think" - ALL coaching must be about understanding their CUSTOMERS, not the entrepreneur personally. 

Frame everything as leveraging existing customer research: "Based on your customer avatar work..." or "Your messaging strategy shows that your customers..."

Be conversational and supportive, like you're sitting across from them in a coaching session. Make this feel personal and specific to their situation.

CRITICAL: If messaging strategy is available, DO NOT ask follow-up questions. Instead:
- Analyze their messaging strategy data thoroughly
- WRITE COMPLETE, SPECIFIC TRANSFORMATION STATEMENTS for them to use
- Extract exact language from their customer avatar work to create ready-to-use statements
- Provide 2-3 COMPLETE REWRITTEN VERSIONS that they can copy and paste directly
- Make each suggestion a finished statement, not a template with brackets

Respond ONLY with valid JSON (no markdown formatting):
- level: "needs-more-detail" | "good-start" | "excellent-depth"
- levelDescription: Brief description of their response quality
- feedback: Your main coaching response that ANALYZES their messaging strategy and provides specific improvements
- followUpQuestions: Array of 3-4 questions (ONLY if no messaging strategy available)
- interactivePrompts: Array of 2-3 COMPLETE IMPROVED VERSIONS of their response that they can use directly
- examples: Array of 2-3 examples that reference their actual customer avatar and positioning
- nextSteps: Array of 2-3 ready-to-implement improvements using their messaging strategy insights
- encouragement: One encouraging sentence
- conversationalResponse: A warm, conversational response as their coach (2-3 sentences)

Focus on making this feel like a real coaching conversation, not generic advice.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      messages: [{ role: "user", content: [ { type: "text", text: prompt } ] }],
      max_tokens: 800,
      temperature: 0.7,
    });

    const content = response.content[0]?.type === "text" ? response.content[0].text : "";
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    // Clean up the response to handle markdown formatting
    let cleanContent = content;
    if (cleanContent.includes('```json')) {
      cleanContent = cleanContent.replace(/```json\s*/, '').replace(/```\s*$/, '');
    }
    if (cleanContent.includes('```')) {
      cleanContent = cleanContent.replace(/```.*?\n/, '').replace(/```\s*$/, '');
    }

    const parsed = JSON.parse(cleanContent.trim());
    
    // Generate actual improved versions instead of generic suggestions
    if (parsed.interactivePrompts && parsed.interactivePrompts.length > 0) {
      const hasGenericSuggestions = parsed.interactivePrompts.some((prompt: string) => 
        prompt.toLowerCase().includes('think about') || 
        prompt.toLowerCase().includes('consider') || 
        prompt.toLowerCase().includes('reflect on')
      );
      
      if (hasGenericSuggestions) {
        const improvedVersions = await generateActualImprovedVersions(userResponse, questionContext, messagingStrategy);
        if (improvedVersions.length > 0) {
          parsed.interactivePrompts = improvedVersions;
        }
      }
    }
    
    return parsed;

  } catch (error) {
    console.error("Interactive coaching error:", error);
    
    // Fallback with personalized response
    const responseLength = userResponse.length;
    const hasSpecifics = /\b(specific|example|experience|situation|client|customer|result)\b/i.test(userResponse);
    
    if (responseLength < 50) {
      return {
        level: "needs-more-detail",
        levelDescription: "Great start, let's expand",
        feedback: "I can see you're on the right track! Let's dive deeper into this together.",
        followUpQuestions: [
          "What specific situation or experience comes to mind?",
          "Can you walk me through a concrete example?",
          "What would this look like in practice?"
        ],
        interactivePrompts: [
          "Build on what you've started by adding specific details",
          "Think about concrete examples that illustrate your point", 
          "Consider what makes this unique to your customers' situation"
        ],
        examples: [
          "Like describing your favorite restaurant - what specific details make it special?",
          "Think of explaining this to a friend who doesn't know your business"
        ],
        nextSteps: [
          "Add 2-3 specific details or examples",
          "Explain the 'why' behind your answer"
        ],
        encouragement: "You're building something important - let's flesh this out together!",
        conversationalResponse: "I love that you're thinking about this! Now let's get into the specifics that will make this really powerful."
      };
    } else if (hasSpecifics) {
      return {
        level: "excellent-depth",
        levelDescription: "Excellent detail and insight",
        feedback: "This is exactly the kind of specific, thoughtful response that will make your messaging powerful!",
        followUpQuestions: [
          "How does this connect to your overall business goals?",
          "What would amplify this even more?",
          "How will you use this insight in your marketing?"
        ],
        interactivePrompts: [
          "Enhance what you wrote by adding specific differentiators",
          "Build on your response with concrete examples and proof points",
          "Expand your answer to show the specific value customers get"
        ],
        examples: [
          "This kind of specificity is what separates great messaging from generic content",
          "Your detailed response shows you truly understand your market"
        ],
        nextSteps: [
          "Consider how to incorporate this into your marketing materials",
          "Think about which channels would be best for sharing this message"
        ],
        encouragement: "This level of insight is exactly what will set you apart!",
        conversationalResponse: "Wow, this is fantastic! You've really thought this through, and it shows. This kind of clarity is what your ideal customers are looking for."
      };
    } else {
      return {
        level: "good-start",
        levelDescription: "Good foundation, let's build on it",
        feedback: "You're definitely on the right path! Let's add some specific details that will make this even more compelling.",
        followUpQuestions: [
          "What's a specific example of this in action?",
          "How does this play out in real situations?",
          "What makes this particularly important for your customers?"
        ],
        interactivePrompts: [
          "Develop what you wrote further with a specific story or case study",
          "Add evidence or proof points that support what you've shared",
          "Explain why this specifically matters to your ideal customers"
        ],
        examples: [
          "Like a chef describing their signature dish - what specific ingredients make it special?",
          "Think of how you'd explain this to someone who's never heard of your business"
        ],
        nextSteps: [
          "Add one specific example or story",
          "Include concrete details that prove your point"
        ],
        encouragement: "You're building something valuable - let's make it shine with specifics!",
        conversationalResponse: "I can see you understand this well! Now let's add the specific details that will make your audience really connect with this message."
      };
    }
  }
}

export async function generateExpandedResponse(
  originalResponse: string,
  coachingInsights: InteractiveCoachingResponse,
  questionContext: string
): Promise<string> {
  try {
    const prompt = `You are helping an entrepreneur expand their business response. They originally wrote: "${originalResponse}"

Based on coaching insights, help them create an expanded version that incorporates:
- More specific details and examples
- Emotional depth and personal connection
- Concrete evidence or stories
- Clear value proposition

Question context: "${questionContext}"

Coaching suggestions to incorporate:
${coachingInsights.followUpQuestions.map(q => `- ${q}`).join('\n')}

Write an expanded version that feels natural and authentic to their voice, but with much more depth and specificity. Keep their original tone but enhance it with the missing elements identified in the coaching.

Return only the expanded response text, not additional commentary.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 400,
      temperature: 0.7,
    });

    const contentText = response.content[0]?.type === "text" ? response.content[0].text : "";
    return contentText || originalResponse;

  } catch (error) {
    console.error("Response expansion error:", error);
    return originalResponse;
  }
}