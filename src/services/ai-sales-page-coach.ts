import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface SalesPageCoachingResult {
  level: "needs-more-depth" | "good-foundation" | "high-converting";
  levelDescription: string;
  feedback: string;
  suggestions: string[];
  emotionalDepthScore: number;
  clarityScore: number;
  persuasionScore: number;
  improvements: string[];
  examples: string[];
}

// PROVEN BEST PRACTICES from high-converting sales pages
const HIGH_CONVERTING_PATTERNS = {
  emotional_hooks: {
    empathy_starters: [
      "You didn't start your business to feel burnt out and invisible...",
      "You didn't quit your corporate job to work 80-hour weeks...",
      "You started this journey with big dreams, but now you're stuck..."
    ],
    mirror_struggles: [
      "...but here you are, stuck posting to social media every day with barely any traction",
      "...yet you're working harder than ever with less to show for it",
      "...and you're questioning if you made the right choice"
    ]
  },
  
  aspirational_transformation: {
    vivid_scenarios: [
      "Imagine waking up to Stripe notifications from your latest course launch...",
      "Picture yourself checking your phone and seeing three new high-value clients...",
      "Envision closing your laptop at 3pm knowing you've already hit your monthly goal..."
    ],
    lifestyle_integration: [
      "...all while sipping coffee in your yoga pants",
      "...from your favorite coffee shop on a Tuesday morning", 
      "...before picking up the kids from school"
    ]
  },

  problem_agitation: {
    frustration_lists: [
      "You've downloaded every freebie, tried five different funnels, and still hear crickets...",
      "You've invested in courses, hired coaches, bought the fancy tools...",
      "You post consistently, engage authentically, follow all the 'rules'..."
    ],
    rhetorical_questions: [
      "Sound familiar?",
      "Been there?", 
      "Does this hit home?"
    ]
  },

  social_proof_structure: {
    before_after_format: [
      "Before working with [Name], I had zero clients. Now I've got a waitlist for my group coaching program...",
      "Six months ago, I was barely making $1k/month. Last month I hit my first $15k month...",
      "I went from posting to crickets to having people DM me asking how to work together..."
    ],
    specific_results: [
      "...and I'm finally earning consistent $10k months",
      "...all from an audience of just 800 people",
      "...without spending a dime on ads"
    ]
  },

  objection_crushing: {
    myth_busters: [
      "Think you need a big audience? Nope. One of our students launched with just 83 Instagram followers...",
      "Worried you don't have enough experience? Sarah had zero credentials and made $7k her first launch...",
      "Think you need fancy tech? Maria used free tools and hit $50k in 6 months..."
    ],
    proof_statements: [
      "...and made $7,200 in 10 days",
      "...and signed 5 clients in 30 days", 
      "...and tripled her income in 90 days"
    ]
  },

  call_to_action: {
    empowering_language: [
      "Click below to grab your spot inside [Program Name] and finally turn your ideas into income",
      "Yes! I want to transform my [struggle] into [success]",
      "I'm ready to stop [current pain] and start [desired outcome]"
    ],
    benefit_driven: [
      "Get instant access to the exact system that's helped 200+ entrepreneurs...",
      "Join the community of successful [niche] who've cracked the code...",
      "Finally get the step-by-step roadmap to [specific transformation]..."
    ]
  }
};

export async function coachSalesPageSection(
  sectionType: string,
  userInput: string,
  userId: string,
  existingContent?: string
): Promise<SalesPageCoachingResult> {
  
  if (!userInput || userInput.length < 20) {
    return {
      level: "needs-more-depth",
      levelDescription: "Needs substantial development",
      feedback: "Your response needs much more detail and emotional depth to be compelling.",
      suggestions: getSectionSpecificGuidance(sectionType),
      emotionalDepthScore: 1,
      clarityScore: 2,
      persuasionScore: 1,
      improvements: [],
      examples: getExamplesForSection(sectionType)
    };
  }

  try {
    const bestPractices = getBestPracticesForSection(sectionType);
    const coachingPrompt = `You are an expert sales page coach using PROVEN BEST PRACTICES from high-converting pages.

ANALYZE this ${sectionType} section and provide coaching using these conversion principles:

${bestPractices}

USER'S CURRENT CONTENT:
"${userInput}"

Rate as: needs-more-depth, good-foundation, or high-converting

Provide response in JSON format:
{
  "level": "needs-more-depth|good-foundation|high-converting",
  "levelDescription": "Brief description of current level",
  "feedback": "Specific feedback on what's working and what needs improvement",
  "suggestions": ["3-4 specific improvement suggestions"],
  "emotionalDepthScore": 1-10,
  "clarityScore": 1-10, 
  "persuasionScore": 1-10,
  "improvements": ["2-3 better versions of key phrases"]
}`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      messages: [{ role: "user", content: coachingPrompt + "\n\nIMPORTANT: Return ONLY valid JSON with no markdown formatting or code blocks." }],
      max_tokens: 600,
      temperature: 0.7,
    });

    const contentText = response.content[0]?.type === "text" ? response.content[0].text : "";
    const analysis = JSON.parse(contentText || "{}");
    
    return {
      level: analysis.level || "needs-more-depth",
      levelDescription: analysis.levelDescription || "Needs development",
      feedback: analysis.feedback || "Add more emotional depth and specific details.",
      suggestions: analysis.suggestions || getSectionSpecificGuidance(sectionType),
      emotionalDepthScore: analysis.emotionalDepthScore || 3,
      clarityScore: analysis.clarityScore || 3,
      persuasionScore: analysis.persuasionScore || 3,
      improvements: analysis.improvements || [],
      examples: getExamplesForSection(sectionType)
    };

  } catch (error) {
    console.error('AI coaching error:', error);
    return getLocalAnalysis(sectionType, userInput);
  }
}

function getBestPracticesForSection(sectionType: string): string {
  switch (sectionType.toLowerCase()) {
    case 'headline':
    case 'header':
      return `EMOTIONAL HOOKS & HEADLINES:
- Start with empathy: "You didn't start your business to feel burnt out and invisible..."
- Mirror reader's struggle WITHOUT blame - create instant connection
- Use conversational, relatable tone that feels like talking to a friend
- Examples: ${HIGH_CONVERTING_PATTERNS.emotional_hooks.empathy_starters.join(', ')}`;

    case 'problem':
    case 'pain':
      return `PROBLEM AGITATION:
- List common frustrations: "You've downloaded every freebie, tried five different funnels..."
- Use rhetorical questions to build tension: "Sound familiar?"
- Make readers feel SEEN before presenting solution
- Examples: ${HIGH_CONVERTING_PATTERNS.problem_agitation.frustration_lists.join(', ')}`;

    case 'transformation':
    case 'solution':
      return `ASPIRATIONAL TRANSFORMATION:
- Paint vivid future scenarios: "Imagine waking up to Stripe notifications..."
- Include sensory language and lifestyle integration
- Appeal to top 3 creator desires: freedom, ease, and impact
- Examples: ${HIGH_CONVERTING_PATTERNS.aspirational_transformation.vivid_scenarios.join(', ')}`;

    case 'social proof':
    case 'testimonial':
      return `SOCIAL PROOF STRUCTURE:
- Use before/after format: "Before working with [Name], I had zero clients. Now I've got..."
- Include specific numeric results and timeframes
- Position offer as proven and achievable
- Examples: ${HIGH_CONVERTING_PATTERNS.social_proof_structure.before_after_format.join(', ')}`;

    case 'objection':
    case 'faq':
      return `OBJECTION CRUSHING:
- Counter myths: "Think you need a big audience? Nope. One student launched with 83 followers..."
- Provide proof that removes barriers
- Address doubts directly with specific evidence
- Examples: ${HIGH_CONVERTING_PATTERNS.objection_crushing.myth_busters.join(', ')}`;

    case 'cta':
    case 'call to action':
      return `CALL TO ACTION:
- Empowering language: "Click below to grab your spot and finally turn ideas into income"
- Benefit-driven, not feature-driven
- Use low-resistance phrasing that feels easy to say yes to
- Examples: ${HIGH_CONVERTING_PATTERNS.call_to_action.empowering_language.join(', ')}`;

    default:
      return `PROVEN CONVERSION PRINCIPLES:
- Use empathy and mirror struggles without blame
- Paint vivid transformation scenarios with sensory details
- Include specific results and social proof
- Make benefits clear and outcomes tangible
- Address objections with proof and evidence`;
  }
}

function getSectionSpecificGuidance(sectionType: string): string[] {
  switch (sectionType.toLowerCase()) {
    case 'headline':
      return [
        "Start with empathy that mirrors their struggle",
        "Use conversational tone like talking to a friend",
        "Avoid blame - create connection instead",
        "Include specific transformation promise"
      ];
    case 'problem':
      return [
        "List specific frustrations they experience",
        "Use rhetorical questions to build tension",
        "Make them feel seen and understood",
        "Validate their struggle without judgment"
      ];
    case 'solution':
      return [
        "Paint vivid future scenarios with sensory details",
        "Include lifestyle integration elements",
        "Appeal to freedom, ease, and impact",
        "Show specific transformation timeline"
      ];
    default:
      return [
        "Add more emotional depth and personal connection",
        "Include specific examples and social proof",
        "Focus on transformation outcomes",
        "Use customer language, not business jargon"
      ];
  }
}

function getExamplesForSection(sectionType: string): string[] {
  switch (sectionType.toLowerCase()) {
    case 'headline':
      return HIGH_CONVERTING_PATTERNS.emotional_hooks.empathy_starters;
    case 'problem':
      return HIGH_CONVERTING_PATTERNS.problem_agitation.frustration_lists;
    case 'solution':
      return HIGH_CONVERTING_PATTERNS.aspirational_transformation.vivid_scenarios;
    case 'social proof':
      return HIGH_CONVERTING_PATTERNS.social_proof_structure.before_after_format;
    case 'objection':
      return HIGH_CONVERTING_PATTERNS.objection_crushing.myth_busters;
    case 'cta':
      return HIGH_CONVERTING_PATTERNS.call_to_action.empowering_language;
    default:
      return [
        "Use specific, emotional language that resonates",
        "Include concrete examples and transformation stories",
        "Focus on outcomes, not just features"
      ];
  }
}

function getLocalAnalysis(sectionType: string, userInput: string): SalesPageCoachingResult {
  const wordCount = userInput.split(' ').length;
  const hasEmotionalWords = /feel|struggle|dream|fear|hope|excited|frustrated|stuck|transform|finally/i.test(userInput);
  const hasSpecifics = /\$|\d+|days|weeks|months|clients|revenue|income/i.test(userInput);
  
  let level: "needs-more-depth" | "good-foundation" | "high-converting" = "needs-more-depth";
  
  if (wordCount > 30 && hasEmotionalWords && hasSpecifics) {
    level = "high-converting";
  } else if (wordCount > 15 && (hasEmotionalWords || hasSpecifics)) {
    level = "good-foundation";
  }

  return {
    level,
    levelDescription: level === "high-converting" ? "Strong conversion potential" : 
                     level === "good-foundation" ? "Good start, needs refinement" : 
                     "Needs substantial development",
    feedback: level === "high-converting" ? 
              "Great use of emotional language and specific details. This has strong conversion potential." :
              "Add more emotional depth, specific examples, and customer language to increase impact.",
    suggestions: getSectionSpecificGuidance(sectionType),
    emotionalDepthScore: hasEmotionalWords ? 7 : 3,
    clarityScore: wordCount > 20 ? 6 : 3,
    persuasionScore: hasSpecifics ? 6 : 3,
    improvements: [],
    examples: getExamplesForSection(sectionType)
  };
}

export async function improveSalesPageSection(
  sectionType: string,
  currentContent: string,
  userId: string,
  customerAvatar?: any
): Promise<string> {
  
  try {
    const bestPractices = getBestPracticesForSection(sectionType);
    const prompt = `Improve this ${sectionType} section using proven best practices:

${bestPractices}

CURRENT CONTENT:
"${currentContent}"

Rewrite this to be more compelling using the best practices above. Keep the core message but enhance with:
- More emotional depth and connection
- Specific transformation promises  
- Customer language that resonates
- Proven conversion techniques

Return only the improved version, no explanation needed.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
      temperature: 0.7,
    });

    const contentText = response.content[0]?.type === "text" ? response.content[0].text : "";
    return contentText || currentContent;

  } catch (error) {
    console.error('AI improvement error:', error);
    return currentContent;
  }
}