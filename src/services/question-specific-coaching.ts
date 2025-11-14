// Question-specific coaching system that provides tailored feedback for each individual question

interface QuestionCoaching {
  evaluationCriteria: string[];
  improvedExamples: string[];
  specificPrompts: string[];
  commonMistakes: string[];
  successPatterns: string[];
}

// Comprehensive question-specific coaching database
export const questionSpecificCoaching: Record<string, QuestionCoaching> = {
  // UNIQUE POSITIONING QUESTIONS
  "WHY did you start your business? What makes you uniquely qualified to help your customers?": {
    evaluationCriteria: [
      "Personal story or breakthrough moment",
      "Specific credentials (years, revenue, client count)",
      "Unique methodology or approach",
      "Connection between personal experience and customer problems",
      "Emotional depth and authenticity"
    ],
    improvedExamples: [
      "After struggling with inconsistent income for 3 years as a freelancer, I developed a systematic approach that helped me land 15 premium clients in 6 months. Now I help other service providers use this same framework to book $5K+ clients consistently.",
      "I started this business after my own marketing agency failed because I was undercharging and overdelivering. That painful experience taught me the psychology of premium pricing, which I now use to help consultants 3x their rates without losing clients."
    ],
    specificPrompts: [
      "What specific struggle or breakthrough led you to start this business?",
      "Include concrete numbers: years of experience, revenue generated, clients helped",
      "What unique method or system did you develop from your personal experience?"
    ],
    commonMistakes: [
      "Generic statements without personal story",
      "Listing credentials without connecting to customer problems",
      "Vague claims without specific evidence"
    ],
    successPatterns: [
      "Personal struggle + breakthrough moment + proven results + unique method",
      "Specific credentials + emotional story + customer connection"
    ]
  },

  "What are your superpowers? What have you always been really good at?": {
    evaluationCriteria: [
      "Natural talents or innate abilities",
      "Skills people consistently compliment",
      "Things that come easily compared to others",
      "Specific examples of these abilities in action",
      "Connection to business value"
    ],
    improvedExamples: [
      "People always tell me I'm great at simplifying complex concepts. I can take something like Facebook ads strategy and explain it so clearly that my 70-year-old mom could understand it. This gift lets me help overwhelmed entrepreneurs who are paralyzed by information overload.",
      "Since I was young, I've had a gift for seeing patterns others miss. I can look at someone's business and immediately spot the 2-3 bottlenecks holding them back, while they're focused on 20 different 'problems.'"
    ],
    specificPrompts: [
      "What do people consistently compliment you on?",
      "What comes naturally to you that others struggle with?",
      "Give a specific example of this superpower in action with a client"
    ],
    commonMistakes: [
      "Listing learned skills instead of natural abilities",
      "Being too modest or vague",
      "Not connecting abilities to customer value"
    ],
    successPatterns: [
      "Natural ability + social proof + specific example + customer benefit",
      "Innate talent + evidence + business application"
    ]
  },

  "What's your personal story that connects to your expertise?": {
    evaluationCriteria: [
      "Specific timeline or journey",
      "Vulnerable moments or struggles",
      "Turning point or breakthrough",
      "How experience shapes current expertise",
      "Emotional authenticity"
    ],
    improvedExamples: [
      "Five years ago, I was working 80-hour weeks in corporate consulting, making good money but completely burnt out. When I had my second panic attack in a boardroom, I knew something had to change. That's when I discovered the power of systems and delegation. Now I help other high-achievers build businesses that don't consume their lives.",
      "I discovered this approach when I personally faced bankruptcy after my first business failed. Losing everything taught me the hard way that passion isn't enough - you need a proven system for attracting and converting customers. That painful lesson became the foundation for the framework I now teach."
    ],
    specificPrompts: [
      "What was your lowest point or biggest struggle?",
      "What specific moment changed everything for you?",
      "How did this experience shape your unique approach?"
    ],
    commonMistakes: [
      "Generic career progression without emotion",
      "Success story without struggle",
      "Not connecting personal experience to customer value"
    ],
    successPatterns: [
      "Struggle + breakthrough + lesson learned + how it helps customers",
      "Vulnerable moment + transformation + expertise gained"
    ]
  },

  "What do you do differently than others in your field?": {
    evaluationCriteria: [
      "Specific methodology or framework",
      "Unique approach or perspective",
      "Different process or steps",
      "Contrarian viewpoint or insight",
      "Measurable difference in results"
    ],
    improvedExamples: [
      "While most business coaches focus on strategy and tactics, I start with nervous system regulation. I discovered that 90% of business problems stem from anxiety and overwhelm, not lack of knowledge. My clients get better results because they're operating from a calm, clear state of mind.",
      "Unlike other marketing agencies that throw spaghetti at the wall, I use my 'Revenue GPS' system - a 3-step diagnostic that identifies exactly which marketing channel will work best for each business type. This means my clients see results in 30 days instead of 6 months."
    ],
    specificPrompts: [
      "What unique method or framework have you developed?",
      "What do you focus on that others ignore or skip?",
      "What contrarian belief do you have about your industry?"
    ],
    commonMistakes: [
      "Claiming to be different without specifics",
      "Listing features instead of unique approach",
      "Not explaining why your way is better"
    ],
    successPatterns: [
      "Industry standard approach + my different approach + why it works better",
      "Unique framework + specific steps + better results"
    ]
  },

  // BRAND VOICE QUESTIONS
  "What are your company values that you'd want to come through in your messaging?": {
    evaluationCriteria: [
      "3-4 core values clearly stated",
      "How values show up in client interactions",
      "Connection between values and customer benefits",
      "Authentic personal alignment",
      "Differentiation from competitors"
    ],
    improvedExamples: [
      "Authentic, empowering, and direct. I believe in giving straight talk without sugar-coating because my clients need real solutions, not false encouragement. This means I'll tell you exactly what's working and what isn't, so you can make actual progress instead of spinning your wheels.",
      "Integrity, simplicity, and results-focus. I only recommend strategies I've personally tested, I explain things in plain English without jargon, and every interaction is designed to move you closer to your goals. No fluff, no overwhelm, just clear next steps."
    ],
    specificPrompts: [
      "Choose 3-4 values that truly guide your decisions",
      "How do these values show up in how you work with clients?",
      "What customer benefit does each value create?"
    ],
    commonMistakes: [
      "Generic corporate values",
      "Values without practical application",
      "Not explaining how values benefit customers"
    ],
    successPatterns: [
      "Core value + how it shows up + customer benefit",
      "Personal belief + practical application + differentiation"
    ]
  },

  "How do you want people to FEEL when they interact with your brand?": {
    evaluationCriteria: [
      "Specific emotional states described",
      "Journey from current feeling to desired feeling",
      "How you create those feelings",
      "Connection to customer transformation",
      "Authentic emotional intelligence"
    ],
    improvedExamples: [
      "I want them to feel understood and hopeful. Most of my clients come to me feeling overwhelmed and like failures because nothing they've tried has worked. By the end of our first conversation, they should feel seen, validated, and excited about a clear path forward.",
      "Confident and empowered. I want to be the person who helps them stop second-guessing themselves and start trusting their instincts. They should leave every interaction feeling more capable and certain about their next steps."
    ],
    specificPrompts: [
      "What emotion do your ideal customers feel before working with you?",
      "How do you want them to feel after interacting with your brand?",
      "What specific actions do you take to create these feelings?"
    ],
    commonMistakes: [
      "Vague emotional words without specificity",
      "Not describing the emotional journey",
      "Focusing on your feelings instead of theirs"
    ],
    successPatterns: [
      "Current emotional state + desired emotional state + how you facilitate the shift",
      "Specific feeling + why it matters + how you create it"
    ]
  },

  // CUSTOMER AVATAR QUESTIONS
  "What are your ideal customer's demographics (age range, gender, income level, job title)?": {
    evaluationCriteria: [
      "Specific age range (not too broad)",
      "Income level or range",
      "Specific job titles or roles",
      "Industry or sector",
      "Geographic considerations if relevant"
    ],
    improvedExamples: [
      "Women entrepreneurs aged 35-45, primarily service-based business owners (coaches, consultants, agencies) making $50K-$150K annually. Most have 2-10 years of business experience and are looking to scale beyond the solopreneur stage.",
      "Tech startup founders and CTOs at companies with 10-50 employees who've raised Series A funding ($2M-$10M). They're typically 28-40 years old, highly educated, and based in major tech hubs like SF, NYC, or Austin."
    ],
    specificPrompts: [
      "Be specific with age ranges (10-year spans work well)",
      "Include income levels that indicate buying power",
      "List actual job titles your customers hold"
    ],
    commonMistakes: [
      "Age ranges too broad (e.g., 25-65)",
      "Vague income descriptions",
      "Generic job titles"
    ],
    successPatterns: [
      "Specific age range + income level + detailed job descriptions + industry context",
      "Demographics + psychographics + buying power indicators"
    ]
  },

  // OFFER TRANSFORMATION QUESTIONS
  "What is the main transformation your offer helps somebody achieve?": {
    evaluationCriteria: [
      "One powerful sentence describing the transformation",
      "Focus on emotional/identity transformation",
      "Clear before and after state",
      "From entrepreneur's perspective (what they help achieve)",
      "Specific and compelling outcome"
    ],
    improvedExamples: [
      "Transform overwhelmed entrepreneurs from working 70-hour weeks to having a profitable business that runs without them.",
      "Help anxious first-time speakers go from avoiding presentations to confidently commanding any room they enter.",
      "Guide struggling coaches from inconsistent income to a waitlist of dream clients paying premium prices."
    ],
    specificPrompts: [
      "Write exactly ONE sentence describing what transformation your offer provides",
      "Focus on the emotional/identity shift, not just tactical results",
      "Use format: 'Transform/Help [type of person] go from [current struggle] to [desired outcome]'"
    ],
    commonMistakes: [
      "Multiple transformations instead of one clear one",
      "Feature-focused instead of outcome-focused",
      "Business jargon instead of customer language"
    ],
    successPatterns: [
      "From [current painful state] to [desired emotional outcome]",
      "Identity shift + emotional transformation + specific result"
    ]
  },

  // OFFER COMPONENTS QUESTIONS
  "What are the 3-5 core components that will be included in your offer?": {
    evaluationCriteria: [
      "3-5 specific deliverables listed",
      "Clear customer benefit for each component",
      "Mix of content and implementation support",
      "Logical flow or structure",
      "Specific formats mentioned"
    ],
    improvedExamples: [
      "1) 90-Day Profit Acceleration Program → Complete system for doubling revenue in 3 months\n2) Weekly Group Coaching Calls → Real-time feedback and accountability\n3) Private Client Portal → 24/7 access to all training materials\n4) Done-For-You Email Templates → Save 10+ hours per week with proven scripts\n5) Emergency Text Support → Get unstuck immediately when challenges arise"
    ],
    specificPrompts: [
      "List exactly what they'll receive (videos, calls, templates, etc.)",
      "For each component, explain the specific benefit it provides",
      "Include both learning AND implementation support"
    ],
    commonMistakes: [
      "Vague component descriptions",
      "No customer benefits mentioned",
      "Only information without implementation help"
    ],
    successPatterns: [
      "Component name → Specific customer benefit",
      "Mix of content + community + implementation + support"
    ]
  }
};

export function getQuestionSpecificCoaching(questionText: string): QuestionCoaching | null {
  // First try exact match
  if (questionSpecificCoaching[questionText]) {
    return questionSpecificCoaching[questionText];
  }
  
  // Then try partial matches for key phrases
  const questionLower = questionText.toLowerCase();
  
  for (const [key, coaching] of Object.entries(questionSpecificCoaching)) {
    const keyLower = key.toLowerCase();
    if (questionLower.includes(keyLower.split('?')[0]) || 
        keyLower.includes(questionLower.split('?')[0])) {
      return coaching;
    }
  }
  
  return null;
}

export function evaluateResponseAgainstCoaching(
  response: string, 
  coaching: QuestionCoaching
): {
  level: "needs-more-detail" | "good-start" | "excellent-depth";
  feedback: string;
  suggestions: string[];
  missingElements: string[];
} {
  const responseLength = response.length;
  const criteriaMet = coaching.evaluationCriteria.filter(criteria => {
    return criteria.split(' ').some(word => 
      response.toLowerCase().includes(word.toLowerCase())
    );
  }).length;
  
  const totalCriteria = coaching.evaluationCriteria.length;
  const criteriaPercentage = criteriaMet / totalCriteria;
  
  let level: "needs-more-detail" | "good-start" | "excellent-depth";
  let feedback: string;
  
  if (criteriaPercentage >= 0.7 && responseLength > 80) {
    level = "excellent-depth";
    feedback = "Outstanding response! You've hit the key elements that make this compelling and authentic.";
  } else if (criteriaPercentage >= 0.4 && responseLength > 40) {
    level = "good-start";
    feedback = "Good foundation! You've covered some important elements. Let's add more depth to make it even stronger.";
  } else {
    level = "needs-more-detail";
    feedback = "This is a good start, but it needs more specificity and depth to be compelling for your ideal customers.";
  }
  
  const missingElements = coaching.evaluationCriteria.filter(criteria => {
    return !criteria.split(' ').some(word => 
      response.toLowerCase().includes(word.toLowerCase())
    );
  });
  
  return {
    level,
    feedback,
    suggestions: coaching.specificPrompts,
    missingElements
  };
}

