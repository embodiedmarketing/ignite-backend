import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface InterviewNotes {
  painPoints?: string;
  failedSolutions?: string;
  perfectDay?: string;
  secretFears?: string;
  language?: string;
  decisionMaking?: string;
}

interface CustomerAvatarSynthesis {
  frustration: string;
  fears: string;
  perfectDay: string;
  transformation: string;
  uniqueApproach: string;
  age: string;
  income: string;
  jobTitle: string;
  previousSolutions: string;
  blockers: string;
  informationSources: string;
  language: string;
  decisionMaking: string;
  investmentCriteria: string;
  successMeasures: string;
  outcomes: string;
}

export async function synthesizeCustomerAvatar(interviewNotes: InterviewNotes): Promise<CustomerAvatarSynthesis> {
  try {
    const prompt = `
You are an expert customer research analyst. Based on the following interview insights, create a comprehensive customer avatar that captures the real voice and needs of these potential customers.

Interview Insights:
- Pain Points & Frustrations: ${interviewNotes.painPoints || 'Not provided'}
- Failed Solutions: ${interviewNotes.failedSolutions || 'Not provided'}
- Perfect Day Scenarios: ${interviewNotes.perfectDay || 'Not provided'}
- Secret Fears: ${interviewNotes.secretFears || 'Not provided'}
- Language They Use: ${interviewNotes.language || 'Not provided'}
- Decision Making Process: ${interviewNotes.decisionMaking || 'Not provided'}

Create a detailed customer avatar by synthesizing these insights into the following format. Use the actual language and phrases from the interviews when possible. Be specific and authentic - avoid generic business speak.

Respond in JSON format with these fields:
{
  "frustration": "Their biggest frustration (use their actual words/phrases)",
  "fears": "What keeps them up at night (from secret fears insights)",
  "perfectDay": "Their ideal scenario when problem is solved (synthesized from perfect day)",
  "transformation": "The complete transformation they want to achieve",
  "uniqueApproach": "What unique approach they need based on failed solutions",
  "age": "Estimated age range based on context clues",
  "income": "Estimated income level based on context",
  "jobTitle": "Likely job title/role based on insights",
  "previousSolutions": "What they've tried before (from failed solutions)",
  "blockers": "What's preventing them from success",
  "informationSources": "Where they typically look for solutions",
  "language": "Key phrases and language they use",
  "decisionMaking": "How they make purchasing decisions",
  "investmentCriteria": "What they need to see to invest money",
  "successMeasures": "How they'll measure success",
  "outcomes": "Specific outcomes they want to achieve"
}

Guidelines:
- Use first-person language when appropriate ("I feel...", "I need...")
- Include specific phrases from the interviews
- Be authentic and avoid marketing-speak
- If limited interview data, make reasonable inferences but mark them as such
- Focus on emotional drivers, not just functional needs
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');
    
    return {
      frustration: result.frustration || "No interview data available yet",
      fears: result.fears || "No interview data available yet", 
      perfectDay: result.perfectDay || "No interview data available yet",
      transformation: result.transformation || "No interview data available yet",
      uniqueApproach: result.uniqueApproach || "No interview data available yet",
      age: result.age || "Not determined from interviews",
      income: result.income || "Not determined from interviews",
      jobTitle: result.jobTitle || "Not determined from interviews", 
      previousSolutions: result.previousSolutions || "No interview data available yet",
      blockers: result.blockers || "No interview data available yet",
      informationSources: result.informationSources || "No interview data available yet",
      language: result.language || "No interview data available yet",
      decisionMaking: result.decisionMaking || "No interview data available yet",
      investmentCriteria: result.investmentCriteria || "No interview data available yet",
      successMeasures: result.successMeasures || "No interview data available yet",
      outcomes: result.outcomes || "No interview data available yet"
    };
  } catch (error) {
    console.error("Customer avatar synthesis failed:", error);
    return {
      frustration: "Unable to synthesize from interview data. Please try again.",
      fears: "Unable to synthesize from interview data. Please try again.",
      perfectDay: "Unable to synthesize from interview data. Please try again.",
      transformation: "Unable to synthesize from interview data. Please try again.",
      uniqueApproach: "Unable to synthesize from interview data. Please try again.",
      age: "Unable to determine from interviews",
      income: "Unable to determine from interviews", 
      jobTitle: "Unable to determine from interviews",
      previousSolutions: "Unable to synthesize from interview data. Please try again.",
      blockers: "Unable to synthesize from interview data. Please try again.",
      informationSources: "Unable to synthesize from interview data. Please try again.",
      language: "Unable to synthesize from interview data. Please try again.",
      decisionMaking: "Unable to synthesize from interview data. Please try again.",
      investmentCriteria: "Unable to synthesize from interview data. Please try again.",
      successMeasures: "Unable to synthesize from interview data. Please try again.",
      outcomes: "Unable to synthesize from interview data. Please try again."
    };
  }
}

