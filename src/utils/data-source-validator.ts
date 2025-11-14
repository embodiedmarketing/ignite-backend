// Data source validation and isolation system to prevent AI contamination

export interface DataSourceMetadata {
  sourceType: "user_business" | "client_interview" | "ai_generated" | "mixed";
  userId: number;
  timestamp: Date;
  confidence: number; // 0-1, confidence that data source is correct
  lineage: string[]; // Track where data came from
  validationFlags: string[];
}

export interface ValidatedDataPoint {
  key: string;
  content: string;
  metadata: DataSourceMetadata;
  originalSource?: string;
}

export interface UserContextData {
  userId: number;
  businessName?: string;
  industry?: string;
  userRole?: string;
  businessStage?: string;
  userResponses: Record<string, ValidatedDataPoint>;
}

export interface ClientContextData {
  interviewId?: string;
  clientName?: string;
  clientDemographics?: string;
  interviewData: Record<string, ValidatedDataPoint>;
}

export class DataSourceValidator {
  // Validate and tag data sources
  static validateDataSource(
    data: Record<string, string>,
    sourceType: "user_business" | "client_interview",
    userId: number,
    additionalContext?: any
  ): Record<string, ValidatedDataPoint> {
    const validated: Record<string, ValidatedDataPoint> = {};
    const timestamp = new Date();

    for (const [key, content] of Object.entries(data)) {
      // Detect potential contamination patterns
      const validationFlags = this.detectContaminationFlags(content, sourceType);

      // Calculate confidence based on validation flags and content patterns
      const confidence = this.calculateConfidence(
        content,
        sourceType,
        validationFlags
      );

      validated[key] = {
        key,
        content,
        metadata: {
          sourceType,
          userId,
          timestamp,
          confidence,
          lineage: [sourceType],
          validationFlags,
        },
        originalSource: additionalContext?.source || "unknown",
      };
    }

    return validated;
  }

  // Detect potential cross-contamination patterns
  private static detectContaminationFlags(
    content: string,
    expectedSourceType: string
  ): string[] {
    const flags: string[] = [];
    const lowerContent = content.toLowerCase();

    if (expectedSourceType === "user_business") {
      // Detect client interview language in user business data
      if (this.hasClientInterviewPatterns(lowerContent)) {
        flags.push("potential_client_contamination");
      }

      // Check for first-person client quotes in business data
      if (this.hasFirstPersonClientPatterns(lowerContent)) {
        flags.push("client_voice_in_business_data");
      }
    }

    if (expectedSourceType === "client_interview") {
      // Detect business/company language in client interview data
      if (this.hasBusinessPatterns(lowerContent)) {
        flags.push("potential_business_contamination");
      }

      // Check for third-person business language in client data
      if (this.hasThirdPersonBusinessPatterns(lowerContent)) {
        flags.push("business_voice_in_client_data");
      }
    }

    // Common contamination indicators
    if (this.hasMixedPersonalPronouns(content)) {
      flags.push("mixed_pronouns");
    }

    if (this.hasAIGeneratedPatterns(lowerContent)) {
      flags.push("possible_ai_generated");
    }

    return flags;
  }

  // Calculate confidence score (0-1)
  private static calculateConfidence(
    content: string,
    sourceType: string,
    validationFlags: string[]
  ): number {
    let confidence = 1.0;

    // Reduce confidence for each contamination flag
    for (const flag of validationFlags) {
      switch (flag) {
        case "potential_client_contamination":
        case "potential_business_contamination":
          confidence -= 0.3;
          break;
        case "client_voice_in_business_data":
        case "business_voice_in_client_data":
          confidence -= 0.4;
          break;
        case "mixed_pronouns":
          confidence -= 0.2;
          break;
        case "possible_ai_generated":
          confidence -= 0.1;
          break;
      }
    }

    // Content length and quality factors
    if (content.length < 10) confidence -= 0.1;
    if (content.length > 1000) confidence += 0.1;

    return Math.max(0, Math.min(1, confidence));
  }

  // Pattern detection methods
  private static hasClientInterviewPatterns(content: string): boolean {
    const clientPatterns = [
      "customer said",
      "client mentioned",
      "interviewee stated",
      "according to the customer",
      "client feedback",
      "customer response",
    ];
    return clientPatterns.some((pattern) => content.includes(pattern));
  }

  private static hasFirstPersonClientPatterns(content: string): boolean {
    // Look for first-person language that sounds like client responses
    const clientPatterns = [
      /i struggle with/i,
      /i worry about/i,
      /i need help/i,
      /my biggest challenge/i,
      /my main problem/i,
      /i have tried/i,
    ];
    return clientPatterns.some((pattern) => pattern.test(content));
  }

  private static hasBusinessPatterns(content: string): boolean {
    const businessPatterns = [
      "our company",
      "our business",
      "we offer",
      "our services",
      "company mission",
      "business model",
      "our approach",
    ];
    return businessPatterns.some((pattern) => content.includes(pattern));
  }

  private static hasThirdPersonBusinessPatterns(content: string): boolean {
    const businessPatterns = [
      /the company offers/i,
      /their business provides/i,
      /they specialize in/i,
      /the business helps/i,
      /their approach is/i,
    ];
    return businessPatterns.some((pattern) => pattern.test(content));
  }

  private static hasMixedPersonalPronouns(content: string): boolean {
    const hasFirstPerson = /\b(i|my|me|myself)\b/i.test(content);
    const hasThirdPerson = /\b(they|their|them|he|she|his|her)\b/i.test(content);
    const hasSecondPerson = /\b(you|your|yours)\b/i.test(content);

    // Count how many different pronoun types are present
    const pronounTypes = [hasFirstPerson, hasThirdPerson, hasSecondPerson].filter(
      Boolean
    ).length;
    return pronounTypes > 1;
  }

  private static hasAIGeneratedPatterns(content: string): boolean {
    const aiPatterns = [
      "as an ai",
      "generated by ai",
      "ai-generated",
      "based on the provided information",
      "according to the data provided",
      "from the analysis above",
    ];
    return aiPatterns.some((pattern) => content.includes(pattern));
  }

  // Create isolated user context for AI prompts
  static createUserContext(
    validatedData: Record<string, ValidatedDataPoint>
  ): UserContextData {
    const userResponses: Record<string, ValidatedDataPoint> = {};
    let userId = 0;
    let businessName = "Unknown Business";
    let industry = "Unknown Industry";

    for (const [key, dataPoint] of Object.entries(validatedData)) {
      if (dataPoint.metadata.sourceType === "user_business") {
        // Only include high-confidence user business data
        if (dataPoint.metadata.confidence > 0.7) {
          userResponses[key] = dataPoint;
        }

        // Extract basic user context
        userId = dataPoint.metadata.userId;
        if (key.includes("business") || key.includes("company")) {
          if (dataPoint.content.length > 10) {
            businessName = dataPoint.content.substring(0, 100);
          }
        }
        if (key.includes("industry") || key.includes("niche")) {
          industry = dataPoint.content;
        }
      }
    }

    return {
      userId,
      businessName,
      industry,
      userResponses,
    };
  }

  // Create isolated client context for AI prompts
  static createClientContext(
    validatedData: Record<string, ValidatedDataPoint>
  ): ClientContextData {
    const interviewData: Record<string, ValidatedDataPoint> = {};

    for (const [key, dataPoint] of Object.entries(validatedData)) {
      if (dataPoint.metadata.sourceType === "client_interview") {
        // Only include high-confidence client interview data
        if (dataPoint.metadata.confidence > 0.7) {
          interviewData[key] = dataPoint;
        }
      }
    }

    return {
      interviewData,
    };
  }

  // Validate that AI-generated content doesn't contain contamination
  static validateAIOutput(
    aiOutput: string,
    userContext: UserContextData,
    clientContext: ClientContextData
  ): { isClean: boolean; issues: string[]; cleanedOutput?: string } {
    const issues: string[] = [];
    let isClean = true;

    // Check for client data bleeding into user context
    const userBusinessNames = Object.values(userContext.userResponses)
      .map((dp) => dp.content)
      .join(" ")
      .toLowerCase();

    const clientDataLower = Object.values(clientContext.interviewData)
      .map((dp) => dp.content)
      .join(" ")
      .toLowerCase();

    // Look for client-specific details in business-focused output
    if (
      aiOutput.toLowerCase().includes(clientDataLower.substring(0, 50)) &&
      clientDataLower.length > 50
    ) {
      issues.push("Client interview data found in business messaging");
      isClean = false;
    }

    // Check for pronoun confusion
    if (this.hasMixedPersonalPronouns(aiOutput)) {
      issues.push("Mixed pronouns detected in AI output");
      isClean = false;
    }

    // Check for demographic confusion
    const demographicPatterns = /\b\d{2,3}[k]?\s*(income|salary|earning)/i;
    if (
      demographicPatterns.test(aiOutput) &&
      !userContext.businessName?.toLowerCase().includes("financial")
    ) {
      issues.push("Possible client demographic data in business output");
      isClean = false;
    }

    return { isClean, issues };
  }

  // Generate contamination report
  static generateContaminationReport(
    validatedData: Record<string, ValidatedDataPoint>
  ) {
    const report = {
      totalDataPoints: Object.keys(validatedData).length,
      userBusinessData: 0,
      clientInterviewData: 0,
      contaminatedDataPoints: 0,
      lowConfidencePoints: 0,
      validationFlags: {} as Record<string, number>,
    };

    for (const dataPoint of Object.values(validatedData)) {
      if (dataPoint.metadata.sourceType === "user_business") {
        report.userBusinessData++;
      } else if (dataPoint.metadata.sourceType === "client_interview") {
        report.clientInterviewData++;
      }

      if (dataPoint.metadata.validationFlags.length > 0) {
        report.contaminatedDataPoints++;
      }

      if (dataPoint.metadata.confidence < 0.8) {
        report.lowConfidencePoints++;
      }

      // Count validation flags
      for (const flag of dataPoint.metadata.validationFlags) {
        report.validationFlags[flag] = (report.validationFlags[flag] || 0) + 1;
      }
    }

    return report;
  }
}


