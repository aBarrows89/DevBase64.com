"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Process an application received from Indeed webhook
export const processIndeedApplication = action({
  args: {
    indeedApplyId: v.string(),
    applicantName: v.string(),
    email: v.string(),
    phone: v.string(),
    resumeText: v.string(),
    resumeFileId: v.optional(v.string()), // Storage ID as string from HTTP client
    indeedJobId: v.string(),
    indeedJobTitle: v.string(),
    rawPayload: v.optional(v.string()),
    receivedAt: v.number(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    status: "success" | "duplicate" | "error";
    applicationId?: string;
    error?: string;
  }> => {
    try {
      // Check if we've already processed this Indeed application
      const existingLog = await ctx.runQuery(
        api.indeedIntegration.getWebhookLogByApplyId,
        { indeedApplyId: args.indeedApplyId }
      );

      if (existingLog) {
        console.log("Duplicate Indeed application:", args.indeedApplyId);
        return {
          success: true,
          status: "duplicate",
          applicationId: existingLog.applicationId,
          error: "Application already processed",
        };
      }

      // Check for mapping from Indeed job to internal job
      const jobMapping = await ctx.runQuery(
        api.indeedIntegration.getJobMappingByIndeedId,
        { indeedJobId: args.indeedJobId }
      );

      // Parse first/last name from full name
      const nameParts = args.applicantName.trim().split(/\s+/);
      const firstName = nameParts[0] || "Unknown";
      const lastName = nameParts.slice(1).join(" ") || "";

      // Run AI analysis on the resume
      const analysis = await ctx.runAction(api.aiMatching.analyzeResume, {
        resumeText: args.resumeText,
      });

      // Use AI-extracted contact info if better than Indeed-provided
      const finalFirstName = analysis.firstName || firstName;
      const finalLastName = analysis.lastName || lastName;
      const finalEmail = args.email || analysis.email || "";
      const finalPhone = args.phone || analysis.phone || "";

      // Check for duplicate application by email
      const existingApplication = await ctx.runQuery(
        api.applications.checkForDuplicate,
        {
          email: finalEmail || undefined,
          firstName: finalFirstName || undefined,
          lastName: finalLastName || undefined,
        }
      );

      if (existingApplication) {
        // Log it but mark as duplicate
        await ctx.runMutation(api.indeedIntegration.createWebhookLog, {
          indeedApplyId: args.indeedApplyId,
          receivedAt: args.receivedAt,
          applicantName: args.applicantName,
          applicantEmail: finalEmail,
          indeedJobId: args.indeedJobId,
          indeedJobTitle: args.indeedJobTitle,
          status: "duplicate",
          errorMessage: `Duplicate application for ${finalFirstName} ${finalLastName}`,
          rawPayload: args.rawPayload,
        });

        return {
          success: true,
          status: "duplicate",
          error: `Duplicate application for ${finalFirstName} ${finalLastName}`,
        };
      }

      // Determine which job to assign
      let assignedJobId: Id<"jobs">;
      let assignedJobTitle: string;
      let matchScore: number;

      if (jobMapping) {
        // Use the manual mapping
        assignedJobId = jobMapping.internalJobId;
        assignedJobTitle = jobMapping.internalJobTitle;
        matchScore = 100;
      } else if (analysis.jobMatches && analysis.jobMatches.length > 0) {
        // Use AI's best match
        const topMatch = analysis.jobMatches[0];
        assignedJobId = topMatch.jobId as Id<"jobs">;
        assignedJobTitle = topMatch.jobTitle;
        matchScore = topMatch.score;
      } else {
        // No match found - log error but still create with first available job
        const allJobs = await ctx.runQuery(api.jobs.getActiveJobs, {});
        if (!allJobs || allJobs.length === 0) {
          await ctx.runMutation(api.indeedIntegration.createWebhookLog, {
            indeedApplyId: args.indeedApplyId,
            receivedAt: args.receivedAt,
            applicantName: args.applicantName,
            applicantEmail: finalEmail,
            indeedJobId: args.indeedJobId,
            indeedJobTitle: args.indeedJobTitle,
            status: "error",
            errorMessage: "No active jobs available",
            rawPayload: args.rawPayload,
          });

          return {
            success: false,
            status: "error",
            error: "No active jobs available",
          };
        }
        assignedJobId = allJobs[0]._id;
        assignedJobTitle = allJobs[0].title;
        matchScore = 25;
      }

      // Build AI analysis object for storage
      const aiAnalysis = {
        suggestedJobId: assignedJobId,
        suggestedJobTitle: assignedJobTitle,
        matchScore,
        allScores: (analysis.jobMatches || []).map((m) => ({
          jobId: m.jobId as Id<"jobs">,
          jobTitle: m.jobTitle,
          score: m.score,
          matchedKeywords: m.matchedKeywords || [],
          reasoning: m.reasoning || "",
        })),
        extractedSkills: analysis.extractedSkills || [],
        summary: analysis.summary || "",
      };

      // Prepare candidate analysis with required fields
      const candidateAnalysis = analysis.candidateAnalysis ? {
        overallScore: analysis.candidateAnalysis.overallScore || 0,
        stabilityScore: analysis.candidateAnalysis.stabilityScore || 0,
        experienceScore: analysis.candidateAnalysis.experienceScore || 0,
        graduationYear: analysis.candidateAnalysis.graduationYear,
        yearsSinceGraduation: analysis.candidateAnalysis.yearsSinceGraduation,
        employmentHistory: analysis.candidateAnalysis.employmentHistory || [],
        redFlags: analysis.candidateAnalysis.redFlags || [],
        greenFlags: analysis.candidateAnalysis.greenFlags || [],
        totalYearsExperience: analysis.candidateAnalysis.totalYearsExperience || 0,
        averageTenureMonths: analysis.candidateAnalysis.averageTenureMonths || 0,
        longestTenureMonths: analysis.candidateAnalysis.longestTenureMonths || 0,
        recommendedAction: analysis.candidateAnalysis.recommendedAction || "review_carefully",
        hiringTeamNotes: analysis.candidateAnalysis.hiringTeamNotes || "",
      } : undefined;

      // Create the application
      const applicationId = await ctx.runMutation(
        api.applications.submitApplication,
        {
          firstName: finalFirstName,
          lastName: finalLastName || `(Indeed: ${args.indeedApplyId.slice(0, 8)})`,
          email: finalEmail,
          phone: finalPhone,
          resumeText: args.resumeText,
          resumeFileId: args.resumeFileId
            ? (args.resumeFileId as Id<"_storage">)
            : undefined,
          appliedJobId: assignedJobId,
          appliedJobTitle: assignedJobTitle,
          aiAnalysis,
          candidateAnalysis,
          source: "indeed", // Mark source as Indeed
        }
      );

      // Log successful processing
      await ctx.runMutation(api.indeedIntegration.createWebhookLog, {
        indeedApplyId: args.indeedApplyId,
        receivedAt: args.receivedAt,
        applicantName: args.applicantName,
        applicantEmail: finalEmail,
        indeedJobId: args.indeedJobId,
        indeedJobTitle: args.indeedJobTitle,
        status: "success",
        applicationId: applicationId as Id<"applications">,
        rawPayload: args.rawPayload,
      });

      console.log("Indeed application created:", applicationId);

      return {
        success: true,
        status: "success",
        applicationId,
      };
    } catch (error: unknown) {
      console.error("Error processing Indeed application:", error);

      // Log the error
      await ctx.runMutation(api.indeedIntegration.createWebhookLog, {
        indeedApplyId: args.indeedApplyId,
        receivedAt: args.receivedAt,
        applicantName: args.applicantName,
        applicantEmail: args.email,
        indeedJobId: args.indeedJobId,
        indeedJobTitle: args.indeedJobTitle,
        status: "error",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        rawPayload: args.rawPayload,
      });

      return {
        success: false,
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});
