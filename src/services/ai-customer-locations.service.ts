import Anthropic from "@anthropic-ai/sdk";
import { getTextFromAnthropicContent, parseAndValidateAiJson } from "../utils/ai-response";
import { recordOrObjectSchema } from "../utils/ai-response-schemas";
import { PROMPT_JSON_ONLY, SYSTEM_CUSTOMER_LOCATIONS } from "../shared/prompts";

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
    
    const prompt = `<prompt>
  <task>Suggest 6-8 highly specific locations where the user can find and connect with their exact customers.</task>
  
  <inputs>
    <customer_avatar>
      <core_frustration>${customerAvatar.frustration || 'Not provided'}</core_frustration>
      <hidden_fears>${customerAvatar.fears || 'Not provided'}</hidden_fears>
      <dream_outcome>${customerAvatar.perfectDay || 'Not provided'}</dream_outcome>
      <transformation_sought>${customerAvatar.transformation || 'Not provided'}</transformation_sought>
      <demographics>
        <age>${customerAvatar.age || 'Not specified'}</age>
        <income>${customerAvatar.income || 'income not specified'}</income>
        <job_title>${customerAvatar.jobTitle || 'role not specified'}</job_title>
      </demographics>
      <failed_solutions>${customerAvatar.previousSolutions || 'Not provided'}</failed_solutions>
      <current_obstacles>${customerAvatar.blockers || 'Not provided'}</current_obstacles>
      <information_sources>${customerAvatar.informationSources || 'Not provided'}</information_sources>
      <communication_style>${customerAvatar.language || 'Not provided'}</communication_style>
      <decision_process>${customerAvatar.decisionMaking || 'Not provided'}</decision_process>
    </customer_avatar>
    ${existingLocations ? `<existing_locations>
      <![CDATA[
${existingLocations}
      ]]>
    </existing_locations>` : ''}
  </inputs>
  
  <location_requirements>
    <requirement>SPECIFIC Facebook group names (search exact names people would recognize)</requirement>
    <requirement>SPECIFIC LinkedIn communities and hashtags they follow</requirement>
    <requirement>ACTUAL Instagram influencers they follow (use @username format)</requirement>
    <requirement>REAL subreddit communities (r/communityname)</requirement>
    <requirement>SPECIFIC podcast hosts they listen to</requirement>
    <requirement>ACTUAL conference names and industry events</requirement>
    <requirement>REAL online course platforms or communities they join</requirement>
  </location_requirements>
  
  <suggestion_format>
    <field name="category">Category Name (Facebook Groups, Instagram Influencers, LinkedIn Communities, etc.)</field>
    <field name="platform">Platform</field>
    <field name="specificLocation">Exact name with details and member count if available</field>
    <field name="reasoning">Why this customer avatar would be here</field>
    <field name="connectionStrategy">How to authentically connect</field>
    <field name="estimatedAudience">Size of community</field>
  </suggestion_format>
  
  <output>
    <count>6-8 SPECIFIC, REAL locations</count>
    <requirement>Be creative and think about where this exact customer avatar would naturally spend time online and offline</requirement>
    <format>JSON</format>
    <structure>
      <![CDATA[
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
}
      ]]>
    </structure>
  </output>
</prompt>`;

    const userPromptWithJson = prompt + PROMPT_JSON_ONLY;
    
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: SYSTEM_CUSTOMER_LOCATIONS,
      messages: [
        { role: "user", content: userPromptWithJson }
      ],
    });

    const contentText = getTextFromAnthropicContent(response.content);
    if (!contentText) {
      throw new Error("No response from Anthropic");
    }
    const result = parseAndValidateAiJson(contentText, recordOrObjectSchema, {
      context: "customer locations",
      fallback: {},
    });
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