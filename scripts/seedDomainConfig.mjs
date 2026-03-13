import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import { readFileSync } from "fs";

// Load environment from .env.local
const envContent = readFileSync(".env.local", "utf-8");
let convexUrl = null;

// Parse each line
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (trimmed.startsWith("NEXT_PUBLIC_CONVEX_URL=")) {
    convexUrl = trimmed.replace("NEXT_PUBLIC_CONVEX_URL=", "").replace(/"/g, "").replace(/'/g, "").trim();
    break;
  }
}

if (!convexUrl) {
  console.error("Could not find NEXT_PUBLIC_CONVEX_URL in .env.local");
  process.exit(1);
}

console.log("Using Convex URL:", convexUrl);
const client = new ConvexHttpClient(convexUrl);

async function seed() {
  console.log("Connecting to:", process.env.NEXT_PUBLIC_CONVEX_URL);

  // Get the first super admin user
  const users = await client.query(api.auth.getAllUsers);
  const superAdmin = users?.find(u => u.role === "super_admin");

  if (!superAdmin) {
    console.error("No super admin found");
    process.exit(1);
  }

  console.log("Using super admin:", superAdmin.name, superAdmin._id);

  const result = await client.mutation(api.email.domainConfigs.seedDefaults, {
    userId: superAdmin._id
  });

  console.log("Seed result:", result);
}

seed().catch(console.error);
