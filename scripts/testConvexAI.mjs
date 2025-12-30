import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

// Test both deployments
const DEV_URL = "https://quiet-rat-621.convex.cloud";
const PROD_URL = "https://outstanding-dalmatian-787.convex.cloud";

// Use command line arg to choose: node testConvexAI.mjs dev|prod
const deployment = process.argv[2] || "dev";
const url = deployment === "prod" ? PROD_URL : DEV_URL;
console.log(`Testing ${deployment.toUpperCase()} deployment: ${url}\n`);
const client = new ConvexHttpClient(url);

async function testAI() {
  console.log("Testing AI analysis via Convex action...\n");

  const testResume = `
John Smith
123 Main Street
Columbus, OH 43215
john.smith@email.com
(614) 555-1234

WORK EXPERIENCE

Warehouse Associate - ABC Distribution (2020-2024)
- Operated forklifts and pallet jacks
- Managed inventory using WMS systems
- Loaded/unloaded trucks daily

Shipping Clerk - XYZ Logistics (2018-2020)
- Processed shipping orders
- Maintained accurate records

SKILLS
- Forklift certified
- Inventory management
- Team player
`;

  try {
    console.log("Calling aiMatching.analyzeResume action...");
    const result = await client.action(api.aiMatching.analyzeResume, {
      resumeText: testResume,
    });

    console.log("\n=== RESULT ===");
    console.log("Overall Score:", result.candidateAnalysis?.overallScore);
    console.log("Name:", result.firstName, result.lastName);
    console.log("Email:", result.email);
    console.log("Summary:", result.summary);

    if (result.candidateAnalysis?.overallScore === 50) {
      console.log("\n⚠️ Score is 50 - AI analysis likely failed!");
    } else {
      console.log("\n✓ AI analysis working!");
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

testAI();
