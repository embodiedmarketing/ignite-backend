// ChatGPT-style intelligent evaluators for all question types
// Each evaluator acts like ChatGPT coaching someone to depth and emotional connection

interface EvaluationResult {
  level: "needs-more-detail" | "good-start" | "excellent-depth";
  levelDescription: string;
  feedback: string;
  suggestions: string[];
  specificIssues: string[];
  encouragement: string;
}

interface UserContext {
  email?: string;
  firstName?: string;
  lastName?: string;
  businessName?: string;
  industry?: string;
  previousResponses?: any[];
  totalResponseCount?: number;
  messagingStrategy?: {
    content?: string;
    completionPercentage?: number;
  };
  offerOutline?: {
    title?: string;
    content?: string;
    completionPercentage?: number;
  };
}

// UNIQUE POSITIONING QUESTIONS
export function evaluateUniquePositioning(response: string): EvaluationResult {
  const hasCredentials = /\b(\d+\s*years?|\$[\d,]+[KMB]?|\d+[KMB]?\s*(clients?|entrepreneurs?|companies|revenue|generated|helped))\b/i.test(response);
  const hasPersonalStory = /\b(after|when|struggled?|failed?|discovered|developed|transformed?|journey|experience|story|moment|realized|learned|survived|battled|breakthrough)\b/i.test(response);
  const hasUniqueApproach = /\b(unique|different|unlike|special|distinctive|proprietary|signature|method|framework|system|approach|way)\b/i.test(response);
  const hasSpecificResults = /\b(\d+%|\d+x|increased|reduced|helped|generated|created|built|achieved|delivered)\b/i.test(response);
  const hasEmotionalDepth = /\b(passionate|driven|inspired|frustrated|determined|committed|purpose|mission|why|believe)\b/i.test(response);
  const hasUniqueWisdom = /\b(insight|wisdom|pattern|secret|truth|realize|understand|see|spot|recognize|shift|taught me|learned that|showed me)\b/i.test(response);
  const hasSpecificLifeExperience = /\b(experience taught|understand because|see things|perspective|wisdom|pattern|breakthrough changed)\b/i.test(response);
  const hasPurposeWhy = /\b(why|because|purpose|mission|called|driven|started|began|founded|created|launched|motivated|inspired to|passion for|dedicated to)\b/i.test(response);
  const hasAccolades = /\b(award|recognized|featured|published|certified|degree|MBA|PhD|speaker|expert|authority|leader|founder|CEO|author|winner)\b/i.test(response);
  
  // Check if they're actually answering the positioning question (what makes them qualified)
  const answersQualificationQuestion = hasCredentials || hasPersonalStory || hasUniqueApproach || hasSpecificResults || hasAccolades || hasUniqueWisdom;
  const answersWhyQuestion = hasPurposeWhy || hasEmotionalDepth;
  
  // Perfect: Answers both WHY and qualification aspects comprehensively
  if (answersQualificationQuestion && answersWhyQuestion && response.length > 40) {
    return {
      level: "excellent-depth",
      levelDescription: "Perfect blend of purpose and proven expertise",
      feedback: "Outstanding positioning! You've powerfully combined your personal 'why' with concrete credentials. This creates an emotional connection while establishing credibility - exactly what ideal clients need to trust you.",
      suggestions: [
        "What specific breakthrough moment led you to develop your unique approach?",
        "How does your personal mission translate into results for clients?",
        "What makes your methodology different from others in your field?"
      ],
      specificIssues: [],
      encouragement: "This combination of purpose and proof is what transforms prospects into raving fans!"
    };
  }
  
  // Strong qualifications that directly answer the question = excellent
  if (answersQualificationQuestion && (hasCredentials || hasAccolades || hasUniqueWisdom)) {
    return {
      level: "excellent-depth",
      levelDescription: "Strong credentials demonstrate clear expertise",
      feedback: "Excellent positioning! Your specific credentials create immediate credibility. These concrete numbers prove your expertise and help you stand out from competitors.",
      suggestions: [
        "Consider adding why you started this business and what drives your passion",
        "What unique methodology or approach sets you apart?",
        "Share the personal story behind your success"
      ],
      specificIssues: [],
      encouragement: "Your track record speaks volumes - this builds real trust with potential clients!"
    };
  }
  
  // Unique wisdom + personal story = highest level (prioritized over just credentials)
  if ((hasUniqueWisdom || hasSpecificLifeExperience) && hasPersonalStory && response.length > 60) {
    return {
      level: "excellent-depth",
      levelDescription: "Powerful unique wisdom backed by personal experience",
      feedback: "Exceptional positioning! You've revealed specific wisdom that only you possess based on your unique life experience. This depth of insight is what makes you irreplaceable to your ideal clients.",
      suggestions: [
        "What other patterns do you see that others completely miss?",
        "How do you help clients recognize this same breakthrough insight?",
        "What happens when people finally understand this truth you've discovered?"
      ],
      specificIssues: [],
      encouragement: "This unique wisdom is your competitive advantage - it's what makes you irreplaceable!"
    };
  }

  // Personal story + credentials/approach = excellent  
  if (hasPersonalStory && (hasCredentials || hasUniqueApproach || hasSpecificResults)) {
    return {
      level: "excellent-depth",
      levelDescription: "Compelling personal story with credible proof points",
      feedback: "Outstanding positioning! You've combined personal experience with credible elements that make your story both memorable and trustworthy. This creates authentic connection.",
      suggestions: [
        "What specific moment changed everything for you?",
        "How did this experience shape your unique approach?",
        "What results have you achieved because of this insight?"
      ],
      specificIssues: [],
      encouragement: "Your authentic story combined with results creates powerful, differentiating positioning!"
    };
  }
  
  // Multiple strong elements = excellent
  if ((hasCredentials && hasUniqueApproach) || (hasPersonalStory && hasEmotionalDepth) || (hasSpecificResults && hasUniqueApproach)) {
    return {
      level: "excellent-depth",
      levelDescription: "Multiple strong positioning elements create compelling profile",
      feedback: "Great positioning! You've combined several strong elements that work together to create a compelling and differentiated profile. This multi-faceted approach builds both credibility and connection.",
      suggestions: [
        "What's the deeper story behind your unique approach?",
        "How do you measure success differently than others?",
        "What transformation do you create that others can't?"
      ],
      specificIssues: [],
      encouragement: "You're building layered, authentic positioning that will resonate strongly!"
    };
  }
  
  // Some good elements = good start
  if (hasCredentials || hasPersonalStory || hasUniqueApproach || hasSpecificResults || (hasEmotionalDepth && response.length > 60)) {
    return {
      level: "good-start",
      levelDescription: "Good foundation with room to strengthen",
      feedback: "You have solid foundation elements for your positioning. To make this truly compelling, dig deeper into what makes you uniquely qualified and the story behind your expertise.",
      suggestions: [
        "What life experience taught you something most people never learn?",
        "What pattern do you see that others completely miss?",
        "What breakthrough moment changed how you understand this problem?",
        "What wisdom from your journey gives you unique insight into your clients' struggles?"
      ],
      specificIssues: [
        "Missing the unique wisdom that only you possess",
        "Needs the specific life experience that taught you something others don't know",
        "Could reveal more about the patterns you see that others miss"
      ],
      encouragement: "You're on the right track - adding specific details and your personal story will make this powerful!"
    };
  }
  
  // Any reasonable attempt at positioning = good start
  if (response.length > 20) {
    return {
      level: "good-start",
      levelDescription: "Working on positioning foundation",
      feedback: "You're thinking about your positioning, which is important. To make this more compelling, try to include specific elements that prove your expertise and help you stand out.",
      suggestions: [
        "What life experience taught you something others don't understand?",
        "What pattern do you recognize that most people miss completely?",
        "What breakthrough insight changed everything for you?",
        "What unique wisdom from your journey helps you see what others can't?"
      ],
      specificIssues: [
        "Could use more specific credentials or proof points"
      ],
      encouragement: "You're building your positioning - adding specific details will make this much stronger!"
    };
  }
  
  // Only very short responses get needs-more-detail
  return {
    level: "needs-more-detail",
    levelDescription: "Response too brief for positioning evaluation",
    feedback: "Please provide more detail about what makes you uniquely qualified to get meaningful positioning feedback.",
    suggestions: [
      "Share your background and experience",
      "Describe what makes you different",
      "Include specific credentials or results"
    ],
    specificIssues: [
      "Response too short to evaluate positioning"
    ],
    encouragement: "Take your time to share what makes you unique!"
  };
}

// BRAND VOICE QUESTIONS (Updated for Company Values)
export function evaluateBrandVoice(response: string): EvaluationResult {
  const hasValueWords = /\b(authentic|empowering|direct|nurturing|integrity|honesty|transparency|excellence|innovation|compassion|respect|accountability|courage|dedication|passion|purpose|trust|reliability|quality|service|growth|transformation|empowerment|connection|impact|results|genuine|supportive|caring|professional)\b/i.test(response);
  const hasPersonalValues = /\b(believe|value|important|matter|principle|guide|core|foundation|drive|motivate|passionate|committed|dedicated|stand for)\b/i.test(response);
  const hasBusinessApplication = /\b(clients|customers|work|business|relationships|messaging|communication|interact|serve|help|deliver|approach|brand|company)\b/i.test(response);
  const hasEmotionalConnection = /\b(feel|emotion|connect|resonate|inspire|motivate|comfort|challenge|support|understand|trust|safe|confident|respected|valued|heard|empowered)\b/i.test(response);
  const hasSpecificExamples = /\b(example|instance|specifically|such as|for instance|means|translates|shows up|looks like|when I|how I)\b/i.test(response);
  const hasEmotionalFeelWords = /\b(empowered|understood|confident|inspired|safe|excited|motivated|supported|encouraged|valued|heard|seen|capable|hopeful|relieved|calm|energized|transformed)\b/i.test(response);
  const hasEmotionalJourney = /\b(initially|first|then|after|eventually|ultimately|by the end|when they leave|before and after|transformation|journey|experience|shift)\b/i.test(response);
  const hasMissionLanguage = /\b(mission|purpose|why|exist|solve|problem|change|world|impact|help|serve|create|transform|improve|enable|empower|support)\b/i.test(response);
  const hasProblemFocus = /\b(problem|challenge|struggle|pain|difficulty|frustration|issue|gap|need|lack|missing|broken|inefficient|overwhelming)\b/i.test(response);
  const hasImpactLanguage = /\b(so that|in order to|to help|to enable|to create|to transform|to improve|to solve|to eliminate|to reduce|to increase|to build|to make)\b/i.test(response);
  
  // Perfect emotional journey with specific feelings = excellent
  if (hasEmotionalFeelWords && hasEmotionalJourney && response.length > 60) {
    return {
      level: "excellent-depth",
      levelDescription: "Detailed emotional experience with transformation journey",
      feedback: "Outstanding emotional branding! You've mapped out the complete emotional journey from initial contact to transformation. This level of emotional awareness will create deep, lasting connections with your audience.",
      suggestions: [
        "How will you ensure every touchpoint delivers this emotional experience?",
        "What specific words or phrases will you use to create these feelings?",
        "How is this emotional experience different from your competitors?"
      ],
      specificIssues: [],
      encouragement: "This emotional journey blueprint will guide every piece of content and interaction you create!"
    };
  }
  
  // Complete mission with problem and impact = excellent
  if (hasMissionLanguage && hasProblemFocus && hasImpactLanguage && response.length > 50) {
    return {
      level: "excellent-depth",
      levelDescription: "Clear mission with problem and impact defined",
      feedback: "Outstanding mission definition! You've clearly articulated why your company exists, what problem you solve, and the impact you create. This mission will guide all your messaging and business decisions.",
      suggestions: [
        "How does this mission differentiate you from competitors?",
        "What specific transformation does your mission create for customers?",
        "How will you know when you're successfully fulfilling this mission?"
      ],
      specificIssues: [],
      encouragement: "This clear mission will become the foundation for all your authentic messaging!"
    };
  }

  // Strong emotional connection with specific feelings = excellent  
  if (hasEmotionalFeelWords && hasEmotionalConnection && response.length > 40) {
    return {
      level: "excellent-depth",
      levelDescription: "Clear emotional experience with specific feelings",
      feedback: "Excellent emotional branding! You've identified specific feelings you want to create, which is crucial for building strong connections. This clarity will guide all your messaging decisions.",
      suggestions: [
        "How do you want this emotional experience to evolve throughout their journey?",
        "What specific language choices will create these feelings?",
        "What should they NOT feel when interacting with your brand?"
      ],
      specificIssues: [],
      encouragement: "This emotional clarity will help you create messaging that truly resonates!"
    };
  }
  
  // Mission with clear purpose = excellent
  if (hasMissionLanguage && (hasProblemFocus || hasImpactLanguage) && response.length > 35) {
    return {
      level: "excellent-depth", 
      levelDescription: "Clear company purpose and mission defined",
      feedback: "Excellent mission clarity! You've defined why your company exists and the purpose it serves. This foundation will make all your messaging more authentic and compelling.",
      suggestions: [
        "How does this mission connect to your personal story?",
        "What specific change are you creating in your customers' lives?",
        "How will customers' lives be different because your company exists?"
      ],
      specificIssues: [],
      encouragement: "This clear mission will attract customers who share your values and vision!"
    };
  }

  // Values + business application + emotional connection = excellent (raise bar)
  if (hasValueWords && hasBusinessApplication && hasEmotionalConnection && response.length > 80) {
    return {
      level: "excellent-depth",
      levelDescription: "Clear company values with business application described",
      feedback: "Excellent values definition! You've connected your personal values to how they show up in your business relationships and messaging. This creates an authentic foundation for all your communication.",
      suggestions: [
        "How do these values guide your content creation decisions?",
        "What would messaging that goes against these values sound like?",
        "How do these values make your ideal clients feel when they interact with you?"
      ],
      specificIssues: [],
      encouragement: "These values will help you create messaging that feels genuinely you and attracts aligned clients!"
    };
  }
  
  // Values + personal connection = good start (was excellent, now more realistic)
  if (hasValueWords && hasPersonalValues && response.length > 40) {
    return {
      level: "good-start",
      levelDescription: "Good values foundation, could expand on business application",
      feedback: "Great start on values identification! You've articulated what matters to you personally. To make this excellent, explain how these values show up in your business.",
      suggestions: [
        "How do these values translate into your client interactions?",
        "What does it look like when these values show up in your messaging?",
        "How do you want clients to experience these values when they work with you?"
      ],
      specificIssues: [],
      encouragement: "Strong values create magnetic messaging that attracts the right people!"
    };
  }
  
  // Some values but lacking business connection
  if (hasValueWords && response.length > 25) {
    return {
      level: "good-start",
      levelDescription: "Solid personality foundation, could be more vivid",
      feedback: "Good foundation for your brand voice! You've identified key personality traits. To make this more powerful, help your audience really feel and envision this personality.",
      suggestions: [
        "Add an analogy: 'like a trusted mentor' or 'as a supportive friend'",
        "Include how you want people to feel when they interact with you",
        "Describe what this voice is NOT (contrasts help clarify)",
        "Give a specific example of how this voice shows up in conversation"
      ],
      specificIssues: [
        "Could be more vivid and memorable",
        "Missing emotional elements that create connection",
        "Needs more specific examples or analogies"
      ],
      encouragement: "You've identified good traits - making them more vivid will bring your voice to life!"
    };
  }
  
  // Basic mission awareness = good start
  if (hasMissionLanguage || hasProblemFocus || response.length > 25) {
    return {
      level: "good-start",
      levelDescription: "Starting to define company mission and purpose",
      feedback: "Good start on defining your mission! You're thinking about why your company exists, which is crucial for authentic messaging. To make this more powerful, be more specific about the problem you solve and the impact you create.",
      suggestions: [
        "What specific problem does your company solve?",
        "Who benefits when your company succeeds in its mission?",
        "What would be missing from the world if your company didn't exist?",
        "Complete this: 'We exist to help [who] achieve [what] so they can [impact]'"
      ],
      specificIssues: [
        "Could be more specific about the problem being solved",
        "Missing the impact or transformation created",
        "Needs clearer connection between purpose and customer benefit"
      ],
      encouragement: "Your mission is the heart of your messaging - let's make it crystal clear!"
    };
  }

  // Basic emotional awareness = good start
  if (hasEmotionalConnection || response.length > 30) {
    return {
      level: "good-start",
      levelDescription: "Good emotional awareness, could be more specific",
      feedback: "Great start on emotional branding! You're thinking about how people feel, which is crucial. To make this more powerful, be more specific about the exact emotions and the journey people experience.",
      suggestions: [
        "Name 2-3 specific emotions you want people to feel initially",
        "Describe how these feelings should evolve throughout their experience",
        "What transformation in feeling do you want to create?",
        "How do you want them to feel different after working with you?"
      ],
      specificIssues: [
        "Could be more specific about exact emotions",
        "Missing the emotional journey or transformation",
        "Needs clearer contrast between before and after feelings"
      ],
      encouragement: "You understand the importance of emotions - now let's get specific about the experience!"
    };
  }
  
  // Some elements but basic = good start
  if (hasValueWords || hasPersonalValues || response.length > 20) {
    return {
      level: "good-start",
      levelDescription: "Basic voice elements, needs more personality",
      feedback: "You're starting to define your voice. To make this truly effective, be more specific about your personality and how you want people to feel when they interact with you.",
      suggestions: [
        "Choose 2-3 specific personality words that really capture your essence",
        "Add an analogy that helps people visualize your communication style",
        "Describe the emotional tone you create in conversations",
        "Think about how you're different from others in your field"
      ],
      specificIssues: [
        "Needs more specific personality descriptors",
        "Missing emotional connection elements",
        "Too general - could apply to many people"
      ],
      encouragement: "Your authentic voice is already there - let's bring it out with more specific details!"
    };
  }
  
  // Only meaningful brand voice attempts get good-start - raise bar
  if (response.length > 30 && (hasValueWords || hasPersonalValues || hasEmotionalConnection)) {
    return {
      level: "good-start",
      levelDescription: "Basic voice elements identified",
      feedback: "You're thinking about your brand voice, which is important for connecting with your audience. To make this more effective, try to be more specific about your personality and communication style.",
      suggestions: [
        "What personality words describe your communication style?",
        "How do you want people to feel when they interact with you?",
        "What makes your voice different from others?",
        "Can you give an example of how you naturally communicate?"
      ],
      specificIssues: [
        "Could use more specific personality descriptors"
      ],
      encouragement: "You're developing your voice - adding specific details will make it stronger!"
    };
  }
  
  // Only very short responses get needs-more-detail
  return {
    level: "needs-more-detail",
    levelDescription: "Response too brief for voice evaluation",
    feedback: "Please provide more detail about your communication style and personality to get meaningful brand voice feedback.",
    suggestions: [
      "Describe your natural communication style",
      "What personality words fit you?",
      "How do you want people to feel?"
    ],
    specificIssues: [
      "Response too short to evaluate voice"
    ],
    encouragement: "Take your time to describe your unique communication style!"
  };
}

// CUSTOMER AVATAR QUESTIONS
export function evaluateCustomerAvatar(response: string): EvaluationResult {
  const hasSpecificDemo = /\b(entrepreneurs?|founders?|business\s+owners?|consultants?|coaches?|freelancers?|agencies?|service\s+providers?|professionals?|executives?|managers?|startups?|companies?|small\s+business|people|women|men|parents|moms|dads|students|beginners|experienced|new|established|\d+[-\s]*\d+\s*years?\s*old|\$\d+k?[-\s]*\$?\d*k?\s*(income|salary)|online|digital|tech|healthcare|finance|education|solopreneurs?|creators?|individuals|someone|those|they)\b/i.test(response);
  
  const hasEmotionalPain = /\b(struggl(e|es|ed|ing)|frustrated?|overwhelmed?|stressed?|anxious|worried|afraid|tired|exhausted|stuck|lost|confused|unclear|uncertain|difficulty|difficulties|challenge|challenges|problem|problems|dont\s+know|can't|unable|failing|feels?|feeling|fear|scared|intimidated|paralyzed|hard|tough|trouble|issue|pain|hurt|upset|annoyed|bothered)\b/i.test(response);
  
  const hasSpecificDesires = /\b(want|desire|dream|goal|vision|hope|wish|need|seeking|looking\s+for|clarity|clear|position|messaging|marketing|growth|success|revenue|clients|customers|stand\s+out|differentiate|articulate|communicate|freedom|time|impact|recognition|security|better|improve|change|transform|achieve|get|build|create|make|find|learn|discover|understand)\b/i.test(response);
  
  const hasConcreteDetails = /\b(\d+|specific|exact|particular|concrete|precisely|clearly|detailed|unique|value|proposition|marketplace|crowded|competitive|niche|industry|sector|area|field|space|market|type|kind|sort)\b/i.test(response);
  
  const hasTargeting = /\b(who|that|like|such\s+as|including|specifically|particularly|especially|typically|usually|often|these|those|people\s+who|anyone\s+who|someone\s+who|clients\s+who|customers\s+who)\b/i.test(response);
  
  const hasPsychographics = /\b(believe|value|prioritize|care\s+about|important|mindset|attitude|personality|lifestyle|behavior|habits|prefer|avoid|love|hate|think|feel|focus|interested|passionate|committed|dedicated)\b/i.test(response);
  
  const hasContextualDepth = /\b(because|since|due\s+to|when|where|how|why|what\s+if|situation|circumstance|context|environment|stage|phase|moment|point|after|before|during|while|until|unless|although|though|however|but|and|or|so|then|now|currently|right\s+now)\b/i.test(response);
  
  // Even basic customer identification efforts = good start
  const hasBasicCustomerInfo = /\b(customer|client|audience|market|target|people|person|individual|user|buyer|prospect)\b/i.test(response);
  
  // Rich, multi-dimensional avatar = excellent
  if (hasSpecificDemo && hasEmotionalPain && hasSpecificDesires && (hasPsychographics || hasContextualDepth)) {
    return {
      level: "excellent-depth",
      levelDescription: "Comprehensive customer avatar with deep understanding",
      feedback: "Outstanding customer avatar! You've created a rich, multi-dimensional picture that combines demographics, emotions, desires, and deeper psychological insights. This level of understanding will make your messaging incredibly effective.",
      suggestions: [
        "What specific transformation moment are they seeking?",
        "What would their perfect day look like after working with you?",
        "What have they already tried that didn't work for them?"
      ],
      specificIssues: [],
      encouragement: "This deep customer understanding will transform your ability to connect and convert!"
    };
  }
  
  // Demographics + emotional depth = excellent
  if (hasSpecificDemo && hasEmotionalPain && (hasSpecificDesires || hasConcreteDetails)) {
    return {
      level: "excellent-depth",
      levelDescription: "Clear targeting with strong emotional understanding",
      feedback: "Excellent customer avatar! You've combined specific demographics with deep emotional understanding. This creates a clear picture of who you serve and what truly drives them.",
      suggestions: [
        "What deeper beliefs or values shape their decisions?",
        "What specific situation triggers their need for your help?",
        "How do they currently try to solve this problem?"
      ],
      specificIssues: [],
      encouragement: "This customer clarity will make your messaging resonate powerfully!"
    };
  }
  
  // Strong emotional insight = excellent
  if (hasEmotionalPain && hasSpecificDesires && (hasContextualDepth || hasPsychographics || hasConcreteDetails)) {
    return {
      level: "excellent-depth",
      levelDescription: "Deep emotional understanding with specific insights",
      feedback: "Excellent emotional understanding! You've captured the real internal experience of your customers - their struggles, desires, and motivations. This emotional connection is the foundation of powerful messaging.",
      suggestions: [
        "What specific demographics help you find more people like this?",
        "Where do these people typically hang out or get information?",
        "What language do they use to describe their situation?"
      ],
      specificIssues: [],
      encouragement: "Your emotional insight will create messaging that people feel in their core!"
    };
  }
  
  // Reasonable content with good elements = good start
  if ((hasSpecificDemo || hasEmotionalPain || hasSpecificDesires) && response.length > 50) {
    return {
      level: "good-start",
      levelDescription: "Solid foundation with clear customer understanding",
      feedback: "Good foundation for your customer avatar! You've identified important characteristics of your ideal customer. To make this more powerful, dig deeper into their emotional reality and specific context.",
      suggestions: [
        "What specific emotions do they experience about this problem?",
        "What do they lie awake at night worrying about?",
        "What would success look like to them specifically?",
        "What beliefs or values drive their decision-making?",
        "What situation or trigger makes them realize they need help?"
      ],
      specificIssues: [
        "Could use deeper emotional insight into their internal experience",
        "Missing specific context about when/why they seek help",
        "Would benefit from more psychological depth"
      ],
      encouragement: "You're building a clear picture - adding emotional depth will make it incredibly powerful!"
    };
  }
  
  // Basic content but some meaningful elements = good start
  if ((hasTargeting || hasSpecificDemo || hasEmotionalPain) && response.length > 30) {
    return {
      level: "good-start",
      levelDescription: "Basic customer identification with room for depth",
      feedback: "You're identifying your customer, which is an important start. To make this truly effective for messaging and marketing, go much deeper into who they are and what they experience.",
      suggestions: [
        "Get specific about demographics: What industries, roles, or life stages?",
        "Dive into emotions: What frustrates, worries, or excites them?",
        "Understand their desires: What do they really want to achieve?",
        "Explore their context: What situation brings them to seek help?",
        "Consider their mindset: What do they believe about success/failure?"
      ],
      specificIssues: [
        "Too broad - needs more specific targeting",
        "Missing emotional depth and psychological insight",
        "Lacks context about their specific situation or triggers"
      ],
      encouragement: "You're starting to focus - getting specific about their inner world will unlock powerful messaging!"
    };
  }
  
  // Only responses with meaningful content get good-start - be more strict
  if (response.length > 35 && (hasTargeting || hasSpecificDemo || hasEmotionalPain || hasSpecificDesires) && !response.toLowerCase().match(/^(business owners?|entrepreneurs?|people|women|men|everyone|anyone|clients?|customers?)\.?$/)) {
    return {
      level: "good-start",
      levelDescription: "Working on customer identification",
      feedback: "You're thinking about your customer, which is the right starting point. To make this more powerful for your messaging, try to add more specific details about who they are and what they experience.",
      suggestions: [
        "What specific type of person or business do you serve?",
        "What problems or challenges are they facing?",
        "What do they want to achieve or change?",
        "What makes them different from others in their situation?"
      ],
      specificIssues: [
        "Could be more specific about customer characteristics"
      ],
      encouragement: "You're building the foundation - adding specific details will make this incredibly powerful!"
    };
  }
  
  // Even basic attempts at customer identification = good start (very lenient)
  if (response.length > 15 && (hasBasicCustomerInfo || hasTargeting || hasContextualDepth)) {
    return {
      level: "good-start",
      levelDescription: "Starting to identify your customer",
      feedback: "You're beginning to think about your customer, which is a good start. Building on this foundation with more specific details will make your messaging much more effective.",
      suggestions: [
        "Who specifically are you trying to help?",
        "What problems do they face?",
        "What do they want to achieve?",
        "What makes them unique?"
      ],
      specificIssues: [
        "Needs more specificity about target customer"
      ],
      encouragement: "You're on the right track - let's get more specific!"
    };
  }
  
  // Only truly empty or very short responses get needs-more-detail
  if (response.length < 15) {
    return {
      level: "needs-more-detail",
      levelDescription: "Response too brief for evaluation",
      feedback: "Please provide more detail about your ideal customer to get meaningful feedback.",
      suggestions: [
        "Write a few sentences about who you want to help",
        "Describe their situation or challenges",
        "Think about what makes them unique"
      ],
      specificIssues: [
        "Response too short to evaluate"
      ],
      encouragement: "Take your time to share your thoughts!"
    };
  }
  
  // Final fallback - any response with some length = good start
  return {
    level: "good-start",
    levelDescription: "Working on customer identification",
    feedback: "You're thinking about your customer, which is the right starting point. To make this more powerful for your messaging, try to add more specific details about who they are and what they experience.",
    suggestions: [
      "Get specific about WHO: What type of person/business? Demographics? Role?",
      "Understand their PAIN: What specific struggles keep them up at night?",
      "Know their DESIRES: What do they really want to achieve or experience?",
      "Explore their CONTEXT: What situation makes them realize they need help?"
    ],
    specificIssues: [
      "Could use more specific targeting and emotional depth"
    ],
    encouragement: "You're building the foundation - adding specific details will make this incredibly powerful!"
  };
}

// OFFER TRANSFORMATION AND DREAM QUESTIONS (Foundation Questions)
export function evaluateOfferProblemSolution(response: string): EvaluationResult {
  const hasSpecificProblems = /\b(problem|challenge|frustration|struggle|pain|issue|difficulty|obstacle|barrier|roadblock)\b/i.test(response);
  const hasSolutionMapping = /\b(solve|solution|fix|address|eliminate|remove|overcome|handle|deal with|resolve|provide|offer|help)\b/i.test(response);
  const hasMultipleProblems = (response.match(/problem|challenge|frustration|struggle|pain|issue|difficulty/gi) || []).length >= 2;
  const hasSpecificSolutions = /\b(step|process|template|system|framework|method|tool|strategy|approach|technique)\b/i.test(response);
  const hasProblemSolutionPairs = response.includes('→') || response.includes(':') || /problem.*solution|challenge.*solve|frustration.*fix/i.test(response);

  // Complete problem-solution mapping = excellent
  if (hasSpecificProblems && hasSolutionMapping && hasMultipleProblems && hasProblemSolutionPairs && response.length > 100) {
    return {
      level: "excellent-depth",
      levelDescription: "Comprehensive problem-solution mapping with specific details",
      feedback: "Outstanding problem-solution mapping! You've identified multiple specific problems and clearly explained how your offer addresses each one. This comprehensive approach shows deep understanding of your customer's needs.",
      suggestions: [
        "How do these solutions differentiate you from competitors?",
        "Which problem-solution pair is your strongest selling point?",
        "What proof do you have that these solutions actually work?"
      ],
      specificIssues: [],
      encouragement: "This thorough problem-solution mapping will make your offer irresistible to your ideal customers!"
    };
  }

  // Good problem identification with solutions = excellent
  if (hasSpecificProblems && hasSolutionMapping && hasSpecificSolutions && response.length > 80) {
    return {
      level: "excellent-depth",
      levelDescription: "Clear problems identified with specific solutions outlined",
      feedback: "Excellent problem-solution alignment! You've identified specific problems and explained how your offer provides concrete solutions. This clarity will help customers immediately see the value.",
      suggestions: [
        "Can you add more specific problems from your customer avatar work?",
        "How do these solutions connect to the transformation you promise?",
        "What makes your approach to solving these problems unique?"
      ],
      specificIssues: [],
      encouragement: "This clear problem-solution connection will make your offer compelling and easy to understand!"
    };
  }

  // Some problems with solutions = good start
  if (hasSpecificProblems && hasSolutionMapping && response.length > 50) {
    return {
      level: "good-start",
      levelDescription: "Problems identified with basic solution approach",
      feedback: "Good start on problem-solution mapping! You're identifying problems and showing how your offer helps. To make this more compelling, be more specific about the exact solutions and add more problems.",
      suggestions: [
        "List 3-5 specific problems from your customer avatar deep dive",
        "For each problem, explain the exact solution your offer provides",
        "Use this format: 'Problem: [specific issue] → Solution: [how you fix it]'",
        "Think about emotional problems (fear, overwhelm) and practical problems (time, tools)"
      ],
      specificIssues: [
        "Could identify more specific problems",
        "Solutions could be more detailed and concrete",
        "Missing connection to customer avatar frustrations"
      ],
      encouragement: "You're on the right track - adding more specificity will make this much stronger!"
    };
  }

  // Basic problem awareness = good start
  if (hasSpecificProblems || hasSolutionMapping || response.length > 30) {
    return {
      level: "good-start",
      levelDescription: "Starting to identify problems or solutions",
      feedback: "You're beginning to think about problems and solutions, which is important for offer development. To make this effective, be more systematic about mapping specific problems to specific solutions.",
      suggestions: [
        "Review your customer avatar responses for specific frustrations and pain points",
        "List each problem as a separate bullet point",
        "For each problem, write exactly how your offer solves it",
        "Think about both surface problems and deeper emotional issues"
      ],
      specificIssues: [
        "Needs more specific problem identification",
        "Missing clear solution mapping",
        "Could connect better to customer avatar work"
      ],
      encouragement: "This problem-solution mapping is crucial for a compelling offer - you're building the foundation!"
    };
  }

  return {
    level: "needs-more-detail",
    levelDescription: "Insufficient detail for problem-solution evaluation",
    feedback: "Please provide more detail about the specific problems your customers face and how your offer solves them to get meaningful feedback.",
    suggestions: [
      "Think about your customer avatar's biggest frustrations",
      "List 3-5 specific problems they struggle with daily",
      "Explain how your offer directly addresses each problem"
    ],
    specificIssues: [
      "Response too brief to evaluate problem-solution fit"
    ],
    encouragement: "Take time to really think through your customer's problems - this is the heart of a great offer!"
  };
}

export function evaluateOfferTransformation(response: string): EvaluationResult {
  const isSingleSentence = !response.includes('.') || (response.split('.').filter(s => s.trim().length > 5).length <= 1);
  const hasTransformationStructure = /\b(transform|help|guide|take|move|shift|go from|become|achieve|reach|gain|eliminate|stop|start|build|from.*to|overcome|create)\b/i.test(response);
  const hasEmotionalWords = /\b(confident|excited|proud|fulfilled|peaceful|secure|free|successful|thriving|growing|empowered|clear|focused|unstuck|breakthrough|transformation|overwhelmed|stressed|anxious|struggling)\b/i.test(response);
  const hasSpecificOutcome = /\b(income|revenue|clients|business|career|relationship|health|weight|time|stress|fear|anxiety|leads|sales|authority|expertise|systems|processes|strategies)\b/i.test(response);
  
  // Check if they're describing what their offer provides (the transformation)
  const describesTransformation = hasTransformationStructure || hasEmotionalWords || hasSpecificOutcome;
  
  // Perfect: Clear transformation in one sentence
  if (isSingleSentence && describesTransformation && hasTransformationStructure && (hasEmotionalWords || hasSpecificOutcome)) {
    return {
      level: "excellent-depth",
      levelDescription: "Clear transformation statement with emotional depth",
      feedback: "Excellent! This clearly describes the transformation your offer provides. You've captured both the emotional shift and specific outcome in one powerful sentence that potential customers can immediately understand.",
      suggestions: [
        "Use this transformation as your core offer promise",
        "Build your sales page around this specific transformation",
        "Reference this transformation in all your marketing materials"
      ],
      specificIssues: [],
      encouragement: "This transformation statement clearly communicates the value of your offer!"
    };
  }
  
  // Good transformation description but could be clearer
  if (describesTransformation && (isSingleSentence || hasTransformationStructure)) {
    return {
      level: "good-start",
      levelDescription: "Single sentence format, needs more transformation clarity",
      feedback: "Great job keeping it to one sentence! To make this more powerful, add clearer transformation language and emotional outcomes that show the before and after state.",
      suggestions: [
        "Use clearer transformation language like 'transform from X to Y'",
        "Add emotional outcomes and specific results",
        "Show the before and after transformation clearly",
        "Include both emotional and practical benefits"
      ],
      specificIssues: [
        "Needs clearer transformation structure",
        "Could be more specific about outcomes"
      ],
      encouragement: "You're on the right track - add more transformation clarity!"
    };
  }
  
  // Basic transformation attempt but incomplete
  if (describesTransformation) {
    return {
      level: "good-start",
      levelDescription: "Describes transformation but needs refinement",
      feedback: "You're describing the transformation, which is good. To make this more powerful, focus on creating one clear sentence that shows the before and after state your offer provides.",
      suggestions: [
        "Pick the most important transformation and focus only on that",
        "Write it as one sentence describing what transformation you help achieve",
        "Use clear before and after language",
        "Focus on the emotional and practical shift you provide"
      ],
      specificIssues: [
        "Too many sentences - needs to be just one",
        "Focus on the single most important outcome"
      ],
      encouragement: "Condense this into one powerful sentence that captures their deepest desire!"
    };
  }
  
  // Doesn't describe any transformation
  return {
    level: "needs-more-detail",
    levelDescription: "Doesn't describe the transformation your offer provides",
    feedback: "This doesn't describe what transformation your offer helps people achieve. What specific change do you help create? What's the before and after state?",
    suggestions: [
      "What specific transformation does your offer help people achieve?",
      "Include both emotional and practical outcomes",
      "Use clear transformation language like 'transform from X to Y'",
      "Make it specific and compelling"
    ],
    specificIssues: [
      "Needs more specific transformation description",
      "Use clearer before and after language"
    ],
    encouragement: "Think about what your customer lies awake wanting to achieve!"
  };
}

// OFFER/PROBLEM/SOLUTION QUESTIONS
export function evaluateOfferContent(response: string): EvaluationResult {
  const hasSpecificProblem = /\b(specific|exact|particular|precise|clearly|struggle|challenge|problem|issue|difficulty|frustration|pain|obstacle|barrier)\b/i.test(response);
  const hasEmotionalImpact = /\b(feel|emotion|frustrated|worried|scared|excited|hopeful|confident|relieved|proud|empowered|transformation|breakthrough|success|achievement)\b/i.test(response);
  const hasConcreteOutcome = /\b(\d+|increase|improve|reduce|eliminate|achieve|create|build|develop|master|gain|learn|discover|unlock|transform|results?|outcomes?)\b/i.test(response);
  const hasSpecificProcess = /\b(step|phase|module|session|week|method|system|framework|process|approach|strategy|technique|tool)\b/i.test(response);
  const hasValueProposition = /\b(unique|different|unlike|special|only|exclusive|proprietary|breakthrough|revolutionary|proven|tested|guaranteed)\b/i.test(response);
  
  // Comprehensive offer description = excellent
  if (hasSpecificProblem && hasEmotionalImpact && hasConcreteOutcome && hasSpecificProcess) {
    return {
      level: "excellent-depth",
      levelDescription: "Comprehensive offer with clear problem-solution fit",
      feedback: "Excellent offer description! You've clearly defined the specific problem, emotional impact, concrete outcomes, and your process. This gives potential clients a complete picture of the transformation you provide.",
      suggestions: [
        "What makes your approach uniquely effective?",
        "What specific results can they expect and in what timeframe?",
        "What proof do you have that this approach works?"
      ],
      specificIssues: [],
      encouragement: "This clear, comprehensive offer will resonate strongly with your ideal clients!"
    };
  }
  
  // Problem + outcome + process = excellent
  if (hasSpecificProblem && hasConcreteOutcome && (hasSpecificProcess || hasValueProposition)) {
    return {
      level: "excellent-depth",
      levelDescription: "Clear problem-solution-outcome framework",
      feedback: "Great offer clarity! You've connected a specific problem to concrete outcomes through your process. This logical flow helps potential clients understand exactly what you provide and why they need it.",
      suggestions: [
        "How do they feel during this transformation process?",
        "What specific steps or milestones do they experience?",
        "What makes your solution different from alternatives they might try?"
      ],
      specificIssues: [],
      encouragement: "This clear problem-to-solution framework will make your offer compelling and easy to understand!"
    };
  }
  
  // Good elements present = good start (more lenient)
  if ((hasSpecificProblem && hasConcreteOutcome) || (hasEmotionalImpact && hasSpecificProcess) || (hasValueProposition && response.length > 40) || 
      (hasSpecificProblem && response.length > 30) || (hasConcreteOutcome && response.length > 30) || (hasEmotionalImpact && response.length > 25)) {
    return {
      level: "good-start",
      levelDescription: "Solid offer elements with room for completion",
      feedback: "You have important elements of your offer defined. To make this truly compelling, ensure you're connecting all the pieces: specific problem, emotional journey, concrete outcomes, and your unique process.",
      suggestions: [
        "What specific problem do you solve better than anyone else?",
        "What emotional transformation do clients experience?",
        "What concrete, measurable outcomes do they achieve?",
        "What's your unique process or methodology?",
        "How is your approach different from other solutions?"
      ],
      specificIssues: [
        "Could clarify the specific problem you solve",
        "Missing emotional transformation elements",
        "Needs more concrete outcome descriptions"
      ],
      encouragement: "You're building a solid offer foundation - connecting all the elements will make it powerful!"
    };
  }
  
  // Basic content = good start (very lenient)
  if (response.length > 20 && (hasSpecificProblem || hasConcreteOutcome || hasSpecificProcess || hasValueProposition || hasEmotionalImpact)) {
    return {
      level: "good-start",
      levelDescription: "Basic offer direction with need for more detail",
      feedback: "You're starting to define your offer, which is important progress. To make this compelling to potential clients, get much more specific about the problem, solution, and transformation you provide.",
      suggestions: [
        "Define the exact problem: What specific struggle do you address?",
        "Clarify the solution: What's your unique approach or method?",
        "Describe outcomes: What specific results do clients achieve?",
        "Include emotion: How do clients feel before vs. after?",
        "Show uniqueness: What makes your offer different and better?"
      ],
      specificIssues: [
        "Needs more specific problem definition",
        "Missing clear outcome descriptions",
        "Lacks emotional impact and transformation elements"
      ],
      encouragement: "You're beginning to shape your offer - adding specificity will make it irresistible!"
    };
  }
  
  // Insufficient detail
  return {
    level: "needs-more-detail",
    levelDescription: "Needs comprehensive offer definition",
    feedback: "Strong offers require clear definition of the problem you solve, the transformation you provide, and the specific outcomes clients achieve. Think about the complete journey from their current struggle to their desired success.",
    suggestions: [
      "PROBLEM: What specific struggle, frustration, or challenge do you address?",
      "EMOTION: How do they feel about this problem? How will they feel after?",
      "SOLUTION: What's your unique approach, method, or process?",
      "OUTCOMES: What concrete, measurable results do they achieve?",
      "PROOF: What evidence do you have that your approach works?",
      "UNIQUENESS: How is your solution different from alternatives?"
    ],
    specificIssues: [
      "Unclear what specific problem you solve",
      "Missing emotional transformation journey",
      "No concrete outcomes or results described",
      "Lacks unique value proposition or differentiation"
    ],
    encouragement: "Your offer has the potential to transform lives - let's define it with compelling clarity!"
  };
}

// GENERIC EVALUATOR FOR OTHER QUESTIONS
export function evaluateGeneric(section: string, response: string): EvaluationResult {
  const hasSpecifics = /\b(\d+|specific|exact|particular|concrete|precisely|detailed|clearly|measurable)\b/i.test(response);
  const hasEmotional = /\b(feel|emotion|struggle|challenge|excited|passionate|transformation|journey|story|personal|experience|impact|meaning|purpose)\b/i.test(response);
  const hasActionable = /\b(will|would|plan|strategy|step|process|method|approach|framework|system|implement|execute|achieve|create)\b/i.test(response);
  const hasDepth = /\b(because|since|due\s+to|when|where|how|why|what\s+if|example|instance|such\s+as|including|like\s+when)\b/i.test(response);
  
  // Multiple strong elements = excellent
  if (hasSpecifics && hasEmotional && (hasActionable || hasDepth) && response.length > 80) {
    return {
      level: "excellent-depth",
      levelDescription: "Comprehensive response with specifics and emotional depth",
      feedback: "Excellent response! You've combined specific details with emotional elements and actionable insights. This creates a compelling and memorable message that will resonate with your audience.",
      suggestions: [
        "How does this connect to your overall strategy?",
        "What specific examples could illustrate this further?",
        "How will you measure success with this approach?"
      ],
      specificIssues: [],
      encouragement: "This level of detail and emotional connection will create powerful impact!"
    };
  }
  
  // Good combination of elements = good start
  if ((hasSpecifics && hasEmotional) || (hasActionable && hasDepth) || (response.length > 60 && (hasSpecifics || hasEmotional))) {
    return {
      level: "good-start",
      levelDescription: "Solid foundation with good elements",
      feedback: "Good foundation! You have strong elements that create clarity and connection. Adding more specific details or emotional depth would make this even more impactful.",
      suggestions: [
        "What specific examples or details could strengthen this?",
        "How does this emotionally impact you or your audience?",
        "What actionable steps or outcomes does this lead to?",
        "Why is this particularly important or meaningful?"
      ],
      specificIssues: [
        "Could use more specific details or examples",
        "Missing deeper emotional connection",
        "Would benefit from more actionable elements"
      ],
      encouragement: "You're building something meaningful - adding depth will make it truly powerful!"
    };
  }
  
  // Basic but reasonable = good start (very lenient)
  if (response.length > 15 && (hasSpecifics || hasEmotional || hasActionable || response.split(' ').length > 5)) {
    return {
      level: "good-start",
      levelDescription: "Basic response with room for development",
      feedback: "You're developing your response, which is good progress. To make this more compelling, add specific details, emotional elements, and deeper insights that help your audience connect and understand.",
      suggestions: [
        "Add specific examples, numbers, or concrete details",
        "Include emotional elements that create connection",
        "Explain the 'why' behind your thinking",
        "Share personal experience or insights",
        "Connect this to your audience's needs and desires"
      ],
      specificIssues: [
        "Needs more specific details and examples",
        "Missing emotional depth or personal connection",
        "Could use more actionable or practical elements"
      ],
      encouragement: "You're building good content - adding specificity and emotion will make it shine!"
    };
  }
  
  // Insufficient detail
  return {
    level: "needs-more-detail",
    levelDescription: "Needs more specificity and depth",
    feedback: "This response needs more development to be effective. Think about specific details, emotional elements, and deeper insights that will help your message resonate and create impact.",
    suggestions: [
      "Add specific details, examples, or concrete elements",
      "Include emotional aspects that create human connection",
      "Explain the reasoning or story behind your thinking",
      "Share personal experience or insights",
      "Connect this to your audience's specific needs",
      "Consider actionable steps or practical applications"
    ],
    specificIssues: [
      "Too generic or vague",
      "Missing specific details that create clarity",
      "Lacks emotional connection or engagement",
      "Needs deeper development and insight"
    ],
    encouragement: "Every great response starts somewhere - let's develop this with specific details and authentic connection!"
  };
}

// ===========================
// ENHANCED CONTEXT-AWARE EVALUATORS
// These functions include comprehensive user information for better AI analysis
// ===========================

// Enhanced Unique Positioning evaluator with user context
export function evaluateUniquePositioningWithContext(response: string, userContext: UserContext): EvaluationResult {
  const baseEval = evaluateUniquePositioning(response);
  
  // Add context-aware suggestions based on user information
  const contextualSuggestions: string[] = [...baseEval.suggestions];
  const contextualFeedback = baseEval.feedback;
  
  // Add industry-specific insights if available
  if (userContext.industry) {
    contextualSuggestions.push(`How does your ${userContext.industry} experience give you unique insights others don't have?`);
  }
  
  // Add business-specific insights if available
  if (userContext.businessName) {
    contextualSuggestions.push(`What specific results has ${userContext.businessName} achieved that proves your unique approach?`);
  }
  
  // Add messaging strategy alignment if available
  if (userContext.messagingStrategy?.content) {
    contextualSuggestions.push("How does your positioning align with the messaging strategy you've already developed?");
  }
  
  return {
    ...baseEval,
    feedback: contextualFeedback + (userContext.firstName ? ` ${userContext.firstName}, considering your background and previous responses, this positioning has strong potential.` : ""),
    suggestions: contextualSuggestions
  };
}

// Enhanced Brand Voice evaluator with user context
export function evaluateBrandVoiceWithContext(response: string, userContext: UserContext): EvaluationResult {
  const baseEval = evaluateBrandVoice(response);
  
  const contextualSuggestions: string[] = [...baseEval.suggestions];
  
  // Add business context if available
  if (userContext.businessName && userContext.industry) {
    contextualSuggestions.push(`How does ${userContext.businessName}'s voice stand out in the ${userContext.industry} industry?`);
  }
  
  // Add consistency check with previous responses
  if (userContext.totalResponseCount && userContext.totalResponseCount > 5) {
    contextualSuggestions.push("Does this voice feel consistent with how you've been expressing yourself in other responses?");
  }
  
  return {
    ...baseEval,
    suggestions: contextualSuggestions
  };
}

// Enhanced Customer Avatar evaluator with user context
export function evaluateCustomerAvatarWithContext(response: string, userContext: UserContext): EvaluationResult {
  const baseEval = evaluateCustomerAvatar(response);
  
  const contextualSuggestions: string[] = [...baseEval.suggestions];
  
  // Add industry-specific customer insights
  if (userContext.industry) {
    contextualSuggestions.push(`What specific challenges do ${userContext.industry} customers face that others might not understand?`);
  }
  
  // Add offer alignment if available
  if (userContext.offerOutline?.content) {
    contextualSuggestions.push("How does this customer avatar connect to the offer you're developing?");
  }
  
  // Add messaging strategy alignment
  if (userContext.messagingStrategy?.content) {
    contextualSuggestions.push("Does this customer avatar align with the messaging strategy you've created?");
  }
  
  return {
    ...baseEval,
    suggestions: contextualSuggestions
  };
}

// Enhanced Offer Transformation evaluator with user context
export function evaluateOfferTransformationWithContext(response: string, userContext: UserContext): EvaluationResult {
  const baseEval = evaluateOfferTransformation(response);
  
  const contextualSuggestions: string[] = [...baseEval.suggestions];
  
  // Add business expertise context
  if (userContext.industry && userContext.businessName) {
    contextualSuggestions.push(`How does ${userContext.businessName}'s expertise in ${userContext.industry} enable this unique transformation?`);
  }
  
  // Add customer avatar connection
  if (userContext.previousResponses && userContext.previousResponses.length > 0) {
    contextualSuggestions.push("How does this transformation solve the specific problems your ideal customer faces?");
  }
  
  return {
    ...baseEval,
    suggestions: contextualSuggestions
  };
}

// Enhanced Offer Content evaluator with user context
export function evaluateOfferContentWithContext(response: string, userContext: UserContext): EvaluationResult {
  const baseEval = evaluateOfferContent(response);
  
  const contextualSuggestions: string[] = [...baseEval.suggestions];
  
  // Add business credibility context
  if (userContext.businessName) {
    contextualSuggestions.push(`What specific results has ${userContext.businessName} achieved that proves this offer works?`);
  }
  
  // Add industry expertise context
  if (userContext.industry) {
    contextualSuggestions.push(`What ${userContext.industry}-specific knowledge makes your offer uniquely valuable?`);
  }
  
  // Add existing strategy alignment
  if (userContext.messagingStrategy?.completionPercentage && userContext.messagingStrategy.completionPercentage > 50) {
    contextualSuggestions.push("How does this offer align with your established messaging strategy?");
  }
  
  return {
    ...baseEval,
    suggestions: contextualSuggestions
  };
}

// Enhanced Generic evaluator with user context
export function evaluateGenericWithContext(section: string, response: string, userContext: UserContext): EvaluationResult {
  const baseEval = evaluateGeneric(section, response);
  
  const contextualSuggestions: string[] = [...baseEval.suggestions];
  
  // Add personalized context based on user information
  if (userContext.firstName) {
    const personalFeedback = baseEval.feedback.replace("You", userContext.firstName + ", you");
  }
  
  // Add business context
  if (userContext.businessName && userContext.industry) {
    contextualSuggestions.push(`How does this relate to ${userContext.businessName}'s goals in the ${userContext.industry} space?`);
  }
  
  // Add progress context
  if (userContext.totalResponseCount && userContext.totalResponseCount > 3) {
    contextualSuggestions.push("How does this build on the foundation you've been creating in your other responses?");
  }
  
  return {
    ...baseEval,
    suggestions: contextualSuggestions
  };
}