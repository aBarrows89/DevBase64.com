import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// List all safety check completions
export const listAllCompletions = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("safetyChecklistCompletions").collect();
  },
});

// Fix historical completion records where "no" should be the passing answer
// This handles questions like "Are you under the influence?" where No = Pass
export const fixSafetyCheckResponses = mutation({
  args: {
    questionPatterns: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    // Get all completions
    const completions = await ctx.db.query("safetyChecklistCompletions").collect();

    let updatedCount = 0;
    let recordsUpdated = 0;

    for (const completion of completions) {
      let needsUpdate = false;
      const updatedResponses = completion.responses.map((response) => {
        // Check if this question matches any of the patterns where "no" should be passing
        const questionLower = response.question.toLowerCase();
        const shouldNoBePass = args.questionPatterns.some((pattern) =>
          questionLower.includes(pattern.toLowerCase())
        );

        if (shouldNoBePass && response.response === "no" && !response.passed) {
          // This was incorrectly marked as failed - fix it
          needsUpdate = true;
          updatedCount++;
          return { ...response, passed: true };
        }

        return response;
      });

      if (needsUpdate) {
        // Recalculate allPassed
        const allPassed = updatedResponses.every((r) => r.passed);

        // Recalculate issues (only items that are now failed)
        const issues = updatedResponses
          .filter((r) => !r.passed || r.damageReported)
          .map((r) => ({
            itemId: r.itemId,
            description: r.damageDetails || r.notes || `Failed: ${r.question}`,
          }));

        await ctx.db.patch(completion._id, {
          responses: updatedResponses,
          allPassed,
          issues: issues.length > 0 ? issues : undefined,
        });

        recordsUpdated++;
      }
    }

    return {
      totalCompletions: completions.length,
      recordsUpdated,
      responsesFixed: updatedCount,
    };
  },
});
