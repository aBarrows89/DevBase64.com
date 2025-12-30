import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const client = new ConvexHttpClient("https://outstanding-dalmatian-787.convex.cloud");

async function findDuplicateNames() {
  console.log("Fetching all personnel...");
  const allPersonnel = await client.query(api.personnel.list, {});
  console.log(`Found ${allPersonnel.length} total records\n`);

  // Group by full name
  const byName = {};
  for (const person of allPersonnel) {
    const name = `${person.firstName} ${person.lastName}`.toLowerCase();
    if (!byName[name]) {
      byName[name] = [];
    }
    byName[name].push(person);
  }

  // Find duplicates
  const duplicates = [];
  for (const [name, records] of Object.entries(byName)) {
    if (records.length > 1) {
      duplicates.push({ name, records });
    }
  }

  if (duplicates.length === 0) {
    console.log("No duplicate names found!");
    return;
  }

  console.log(`Found ${duplicates.length} duplicate name(s):\n`);
  for (const dup of duplicates) {
    console.log(`=== ${dup.name} (${dup.records.length} records) ===`);
    for (const record of dup.records) {
      console.log(`  ID: ${record._id}`);
      console.log(`  Email: ${record.email}`);
      console.log(`  Hire Date: ${record.hireDate}`);
      console.log(`  Department: ${record.department}`);
      console.log(`  Created: ${new Date(record.createdAt).toLocaleString()}`);
      console.log("");
    }
  }

  // Ask which to delete
  console.log("\nTo delete duplicates, keeping the oldest by createdAt:");
  for (const dup of duplicates) {
    const sorted = dup.records.sort((a, b) => a.createdAt - b.createdAt);
    const toDelete = sorted.slice(1);
    for (const record of toDelete) {
      console.log(`  Would delete: ${record._id} (${record.email})`);
    }
  }
}

findDuplicateNames().catch(console.error);
