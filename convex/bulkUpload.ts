"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// Process a single resume and create an application
export const processResume = action({
  args: {
    resumeText: v.string(),
    fileName: v.string(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    error?: string;
    applicationId?: string;
    candidateName?: string;
    matchedJob?: string;
    overallScore?: number;
  }> => {
    const { resumeText, fileName } = args;

    if (!resumeText || resumeText.trim().length < 50) {
      return {
        success: false,
        error: "Resume text too short or empty",
      };
    }

    try {
      // Run the AI analysis
      const analysis = await ctx.runAction(api.aiMatching.analyzeResume, {
        resumeText,
      }) as any;

      // Get the best matching job
      const topMatch = analysis.jobMatches?.[0];
      if (!topMatch) {
        return {
          success: false,
          error: "No job matches found",
        };
      }

      // Build the AI analysis object for storage
      const aiAnalysis = {
        suggestedJobId: topMatch.jobId,
        suggestedJobTitle: topMatch.jobTitle,
        matchScore: topMatch.score,
        allScores: analysis.jobMatches.map((m: any) => ({
          jobId: m.jobId,
          jobTitle: m.jobTitle,
          score: m.score,
          matchedKeywords: m.matchedKeywords,
          reasoning: m.reasoning,
        })),
        extractedSkills: analysis.extractedSkills || [],
        summary: analysis.summary,
      };

      // Create the application with the best matching job
      const applicationId = await ctx.runMutation(api.applications.submitApplication, {
        firstName: analysis.firstName || "Unknown",
        lastName: analysis.lastName || `(${fileName})`,
        email: analysis.email || "",
        phone: analysis.phone || "",
        resumeText,
        appliedJobId: topMatch.jobId,
        appliedJobTitle: topMatch.jobTitle,
        aiAnalysis,
        candidateAnalysis: analysis.candidateAnalysis,
      });

      return {
        success: true,
        applicationId,
        candidateName: `${analysis.firstName || "Unknown"} ${analysis.lastName || ""}`.trim(),
        matchedJob: topMatch.jobTitle,
        overallScore: analysis.candidateAnalysis?.overallScore,
      };
    } catch (error: any) {
      console.error("Error processing resume:", error);
      return {
        success: false,
        error: error?.message || "Unknown error processing resume",
      };
    }
  },
});
