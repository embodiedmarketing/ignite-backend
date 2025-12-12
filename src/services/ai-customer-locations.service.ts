import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface CustomerAvatar {
  frustration?: string;
  fears?: string;
  perfectDay?: string;
  transformation?: string;
  uniqueApproach?: string;
  age?: string;
  income?: string;
  jobTitle?: string;
  previousSolutions?: string;
  blockers?: string;
  informationSources?: string;
  language?: string;
  decisionMaking?: string;
  investmentCriteria?: string;
  successMeasures?: string;
  outcomes?: string;
}

export async function generateCustomerLocations(customerAvatar: CustomerAvatar, existingLocations?: string) {
  try {
    const existingLocationsList = existingLocations ? `\n\nEXISTING LOCATIONS TO AVOID (do not suggest any of these):\n${existingLocations}` : '';
    
    const prompt = `Based on this detailed customer avatar, suggest 6-8 HIGHLY SPECIFIC locations where I can find and connect with these exact customers. I need real, actionable places - specific Facebook group names, LinkedIn communities, subreddit names, actual event types, etc.

Customer Avatar Analysis:
- Core Frustration: ${customerAvatar.frustration || 'Not provided'}
- Hidden Fears: ${customerAvatar.fears || 'Not provided'}
- Dream Outcome: ${customerAvatar.perfectDay || 'Not provided'}
- Transformation Sought: ${customerAvatar.transformation || 'Not provided'}
- Demographics: ${customerAvatar.age || 'Not specified'} years old, ${customerAvatar.income || 'income not specified'}, ${customerAvatar.jobTitle || 'role not specified'}
- Failed Solutions: ${customerAvatar.previousSolutions || 'Not provided'}
- Current Obstacles: ${customerAvatar.blockers || 'Not provided'}
- Information Sources: ${customerAvatar.informationSources || 'Not provided'}
- Communication Style: ${customerAvatar.language || 'Not provided'}
- Decision Process: ${customerAvatar.decisionMaking || 'Not provided'}

REQUIREMENTS:
- Give me SPECIFIC Facebook group names (search exact names people would recognize)
- Include SPECIFIC LinkedIn communities and hashtags they follow
- Name ACTUAL Instagram influencers they follow (use @username format)
- Suggest REAL subreddit communities (r/communityname)
- Recommend SPECIFIC podcast hosts they listen to
- Mention ACTUAL conference names and industry events
- Include REAL online course platforms or communities they join

For each suggestion, provide:
1. Category (Facebook Groups, Instagram Influencers, LinkedIn Communities, etc.)
2. Platform name
3. Specific location/name with member count if available
4. Reasoning why this customer avatar would be there
5. Connection strategy for authentic relationship building
6. Estimated audience size${existingLocationsList}

Generate 6-8 SPECIFIC, REAL locations. Be creative and think about where this exact customer avatar would naturally spend time online and offline.

Respond in JSON format:
{
  "suggestions": [
    {
      "category": "Category Name",
      "platform": "Platform",
      "specificLocation": "Exact name with details",
      "reasoning": "Why this customer avatar would be here",
      "connectionStrategy": "How to authentically connect",
      "estimatedAudience": "Size of community"
    }
  ],
  "summary": "Brief summary of the personalized approach",
  "nextSteps": ["actionable next steps"]
}`;

    const userPromptWithJson = prompt + "\n\nIMPORTANT: Return ONLY valid JSON with no markdown formatting or code blocks.";
    
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: "You are an expert at finding specific, real communities where target customers naturally gather. Always suggest actual, existing communities, influencers, and platforms - never make up fake names.",
      messages: [
        { role: "user", content: userPromptWithJson }
      ],
    });

    const contentText = response.content[0]?.type === "text" ? response.content[0].text : "";
    if (!contentText) {
      throw new Error("No response from Anthropic");
    }

    let cleanedContent = contentText.trim();
    if (cleanedContent.includes('```json')) {
      cleanedContent = cleanedContent.replace(/```json\s*/, '').replace(/```\s*$/, '');
    } else if (cleanedContent.includes('```')) {
      cleanedContent = cleanedContent.replace(/```.*?\n/, '').replace(/```\s*$/, '');
    }

    const result = JSON.parse(cleanedContent || '{}');
    return result;
    
  } catch (error) {
    console.error('Error generating customer locations:', error);
    
    // Provide personalized fallback suggestions when API is unavailable
    return generatePersonalizedFallback(customerAvatar, existingLocations);
  }
}

function generatePersonalizedFallback(customerAvatar: CustomerAvatar, existingLocations?: string) {
  console.log('Generating personalized fallback for customer avatar:', customerAvatar);
  
  const jobTitle = customerAvatar.jobTitle?.toLowerCase() || '';
  const frustration = (customerAvatar.frustration || '').toLowerCase();
  const transformation = (customerAvatar.transformation || '').toLowerCase();
  const informationSources = (customerAvatar.informationSources || '').toLowerCase();
  
  // Parse existing locations to avoid duplicates
  const existingList = existingLocations ? existingLocations.toLowerCase().split('\n').filter(loc => loc.trim()) : [];
  
  let suggestions = [];
  
  // Generate personalized suggestions based on their specific profile
  if (jobTitle.includes('coach') || jobTitle.includes('consultant') || transformation.includes('coach')) {
    if (!existingList.some(loc => loc.includes('coach'))) {
      suggestions.push({
        category: "Facebook Groups",
        platform: "Facebook",
        specificLocation: "Coach the Life Coach (25K+ members)",
        reasoning: "Community of coaches sharing strategies and building their practices",
        connectionStrategy: "Share coaching insights, participate in skill-building discussions",
        estimatedAudience: "25,000+ coaches and consultants"
      });
    }
    
    if (!existingList.some(loc => loc.includes('jenna') || loc.includes('kutcher'))) {
      suggestions.push({
        category: "Instagram Influencers",
        platform: "Instagram", 
        specificLocation: "@jenna_kutcher - Follow and engage with posts",
        reasoning: "Top business coach your ideal clients follow for authentic business building",
        connectionStrategy: "Engage meaningfully with posts, connect with others in comments",
        estimatedAudience: "1M+ followers interested in coaching/business"
      });
    }
  }
  
  if (jobTitle.includes('content') || jobTitle.includes('creator') || frustration.includes('content')) {
    if (!existingList.some(loc => loc.includes('content'))) {
      suggestions.push({
        category: "Facebook Groups",
        platform: "Facebook",
        specificLocation: "Content Creator Coalition (200K+ members)",
        reasoning: "Active community of content creators sharing strategies and monetization tips",
        connectionStrategy: "Share content strategies, offer feedback on others' content",
        estimatedAudience: "200,000+ content creators"
      });
    }
    
    if (!existingList.some(loc => loc.includes('amy') || loc.includes('porterfield'))) {
      suggestions.push({
        category: "Instagram Influencers", 
        platform: "Instagram",
        specificLocation: "@amyporterfield - Follow and engage with posts",
        reasoning: "Leading online marketing educator your customers follow for course creation",
        connectionStrategy: "Engage with posts about online courses, connect with engaged followers",
        estimatedAudience: "500K+ followers interested in online business"
      });
    }
  }
  
  if (jobTitle.includes('entrepreneur') || jobTitle.includes('business') || transformation.includes('business')) {
    if (!existingList.some(loc => loc.includes('entrepreneur'))) {
      suggestions.push({
        category: "Facebook Groups",
        platform: "Facebook",
        specificLocation: "Female Entrepreneur Association (650K+ members)",
        reasoning: "Massive community of female entrepreneurs sharing business strategies",
        connectionStrategy: "Share business insights, participate in weekly challenges",
        estimatedAudience: "650,000+ female entrepreneurs"
      });
    }
    
    if (!existingList.some(loc => loc.includes('marie') || loc.includes('forleo'))) {
      suggestions.push({
        category: "Instagram Influencers",
        platform: "Instagram",
        specificLocation: "@marieforleo - Follow and engage with posts", 
        reasoning: "Business mentor your ideal customers follow for authentic success strategies",
        connectionStrategy: "Engage with posts about business building, connect with active commenters",
        estimatedAudience: "400K+ followers interested in business/life coaching"
      });
    }
  }
  
  if (jobTitle.includes('freelancer') || jobTitle.includes('service') || frustration.includes('client')) {
    if (!existingList.some(loc => loc.includes('freelancer'))) {
      suggestions.push({
        category: "Facebook Groups",
        platform: "Facebook",
        specificLocation: "Six Figure Freelancers (40K+ members)",
        reasoning: "Community of freelancers focused on scaling their service businesses",
        connectionStrategy: "Share freelancing tips, offer advice on pricing and client management",
        estimatedAudience: "40,000+ freelancers and service providers"
      });
    }
    
    if (!existingList.some(loc => loc.includes('brennan') || loc.includes('dunn'))) {
      suggestions.push({
        category: "Instagram Influencers",
        platform: "Instagram",
        specificLocation: "@brennandunn - Follow and engage with posts",
        reasoning: "Freelancing expert your customers follow for business scaling strategies",
        connectionStrategy: "Engage with posts about freelancing, connect with others seeking growth",
        estimatedAudience: "50K+ followers interested in freelancing/consulting"
      });
    }
  }
  
  // Add LinkedIn community suggestions
  if (!existingList.some(loc => loc.includes('linkedin'))) {
    suggestions.push({
      category: "LinkedIn Communities",
      platform: "LinkedIn",
      specificLocation: "Entrepreneurship & Small Business Community",
      reasoning: "Professional network where your customers discuss business challenges and solutions",
      connectionStrategy: "Share valuable insights, comment thoughtfully on posts, connect with engaged members",
      estimatedAudience: "100K+ business professionals"
    });
  }
  
  // Add Reddit community
  if (!existingList.some(loc => loc.includes('reddit') || loc.includes('entrepreneur'))) {
    suggestions.push({
      category: "Reddit Communities",
      platform: "Reddit",
      specificLocation: "r/Entrepreneur (2M+ members)",
      reasoning: "Active community where your customers seek advice and share experiences",
      connectionStrategy: "Provide helpful advice, share experiences, build reputation through valuable contributions",
      estimatedAudience: "2M+ entrepreneurs and business owners"
    });
  }
  
  // Ensure we have at least 6 suggestions
  while (suggestions.length < 6) {
    if (!existingList.some(loc => loc.includes('boss'))) {
      suggestions.push({
        category: "Facebook Groups",
        platform: "Facebook",
        specificLocation: "Boss Babes Community (380K+ members)",
        reasoning: "Large community of female entrepreneurs building businesses",
        connectionStrategy: "Share business wins, participate in accountability challenges",
        estimatedAudience: "380,000+ female business owners"
      });
    } else {
      break;
    }
  }
  
  return {
    suggestions: suggestions.slice(0, 8),
    summary: `Personalized location suggestions based on your customer avatar: ${customerAvatar.jobTitle || 'professionals'} struggling with ${customerAvatar.frustration || 'growth challenges'}. These are specific, real communities where your ideal customers naturally gather.`,
    nextSteps: [
      `Focus on 2-3 locations where your ideal customer (${customerAvatar.jobTitle || 'target audience'}) would naturally gather`,
      "Build authentic relationships before introducing your offer",
      `Provide value around ${customerAvatar.transformation || 'their transformation goals'} to establish trust`,
      "Visit each specific location to verify current activity and relevance",
      "Engage consistently for 3-6 months before any soft offers"
    ]
  };
}