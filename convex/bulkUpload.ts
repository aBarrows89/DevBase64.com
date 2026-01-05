"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Process a single resume - checks for existing personnel first
export const processResume = action({
  args: {
    resumeText: v.string(),
    fileName: v.string(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    error?: string;
    type?: "new_application" | "personnel_update";
    applicationId?: string;
    personnelId?: string;
    candidateName?: string;
    matchedJob?: string;
    overallScore?: number;
    currentPosition?: string;
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

      // Extract contact info from analysis
      const firstName = analysis.firstName || "";
      const lastName = analysis.lastName || "";
      const email = analysis.email || "";

      // Check if this person already exists in personnel
      const existingPersonnel = await ctx.runQuery(api.personnel.searchByEmailOrName, {
        email: email || undefined,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
      });

      // Get the best matching job
      const topMatch = analysis.jobMatches?.[0];

      if (existingPersonnel) {
        // This is an existing employee - update their record with resume and job analysis
        const jobMatchAnalysis = {
          suggestedPositions: analysis.jobMatches?.map((m: any) => ({
            jobId: m.jobId as Id<"jobs"> | undefined,
            jobTitle: m.jobTitle,
            score: m.score,
            matchedKeywords: m.matchedKeywords || [],
            reasoning: m.reasoning || "",
          })) || [],
          extractedSkills: analysis.extractedSkills || [],
          summary: analysis.summary || "",
          analyzedAt: Date.now(),
        };

        await ctx.runMutation(api.personnel.updateResumeAndAnalysis, {
          personnelId: existingPersonnel._id,
          resumeText,
          jobMatchAnalysis,
        });

        return {
          success: true,
          type: "personnel_update",
          personnelId: existingPersonnel._id,
          candidateName: `${existingPersonnel.firstName} ${existingPersonnel.lastName}`,
          matchedJob: topMatch?.jobTitle,
          overallScore: analysis.candidateAnalysis?.overallScore,
          currentPosition: existingPersonnel.position,
        };
      }

      // No existing personnel - create a new application
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
        firstName: firstName || "Unknown",
        lastName: lastName || `(${fileName})`,
        email: email || "",
        phone: analysis.phone || "",
        resumeText,
        appliedJobId: topMatch.jobId,
        appliedJobTitle: topMatch.jobTitle,
        aiAnalysis,
        candidateAnalysis: analysis.candidateAnalysis,
      });

      return {
        success: true,
        type: "new_application",
        applicationId,
        candidateName: `${firstName || "Unknown"} ${lastName || ""}`.trim(),
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
