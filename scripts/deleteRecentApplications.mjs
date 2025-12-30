import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const client = new ConvexHttpClient("https://outstanding-dalmatian-787.convex.cloud");

async function deleteRecentApplications() {
  console.log("Fetching all applications...");
  const apps = await client.query(api.applications.getAll, {});
  console.log(`Found ${apps.length} total applications\n`);

  // Find applications with score of exactly 50 (the fallback score)
  const score50Apps = apps.filter(app =>
    app.candidateAnalysis?.overallScore === 50
  );

  console.log(`Found ${score50Apps.length} applications with score=50 (AI failed):\n`);

  for (const app of score50Apps) {
    console.log(`  ${app.firstName} ${app.lastName} - Score: ${app.candidateAnalysis?.overallScore}, Created: ${new Date(app._creationTime).toLocaleString()}`);
  }

  if (score50Apps.length === 0) {
    console.log("No applications with fallback score to delete.");
    return;
  }

  console.log(`\nDeleting ${score50Apps.length} applications...`);

  for (const app of score50Apps) {
    try {
      await client.mutation(api.applications.remove, {
        applicationId: app._id,
      });
      console.log(`✓ Deleted: ${app.firstName} ${app.lastName}`);
    } catch (error) {
      console.error(`✗ Failed to delete ${app.firstName} ${app.lastName}: ${error.message}`);
    }
  }

  console.log("\nDone!");
}

deleteRecentApplications().catch(console.error);
