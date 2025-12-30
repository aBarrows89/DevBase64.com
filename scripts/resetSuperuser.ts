// Reset Superuser Password Script
// Run this script with: npx tsx scripts/resetSuperuser.ts
// Or via Convex CLI: npx convex run auth:seedSuperuser --args '{"email":"admin@ietires.com","password":"Admin123!","name":"Administrator"}'

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

// Configuration - CHANGE THESE VALUES
const SUPERUSER_EMAIL = "admin@ietires.com";
const SUPERUSER_PASSWORD = "Admin123!";  // CHANGE THIS to your desired password
const SUPERUSER_NAME = "Administrator";

async function resetSuperuser() {
  // Get Convex deployment URL from environment
  const deploymentUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

  if (!deploymentUrl) {
    console.error("❌ Error: NEXT_PUBLIC_CONVEX_URL not found in environment");
    console.log("Please set this in your .env.local file");
    process.exit(1);
  }

  console.log("🔐 Resetting superuser account...\n");
  console.log(`Email: ${SUPERUSER_EMAIL}`);
  console.log(`Password: ${SUPERUSER_PASSWORD}`);
  console.log(`Name: ${SUPERUSER_NAME}\n`);

  const client = new ConvexHttpClient(deploymentUrl);

  try {
    const result = await client.mutation(api.auth.seedSuperuser, {
      email: SUPERUSER_EMAIL,
      password: SUPERUSER_PASSWORD,
      name: SUPERUSER_NAME,
    });

    if (result.success) {
      console.log(`✅ Success! Superuser account ${result.action}`);
      console.log(`\nYou can now login with:`);
      console.log(`  Email: ${SUPERUSER_EMAIL}`);
      console.log(`  Password: ${SUPERUSER_PASSWORD}`);
      console.log(`\n⚠️  IMPORTANT: Change this password after logging in!`);
    } else {
      console.error("❌ Failed to reset superuser:", result.error);
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }

  client.close();
}

resetSuperuser();
