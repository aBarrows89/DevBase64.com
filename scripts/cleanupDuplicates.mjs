import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const client = new ConvexHttpClient("https://outstanding-dalmatian-787.convex.cloud");

async function cleanupDuplicates() {
  console.log("Fetching all personnel...");
  const allPersonnel = await client.query(api.personnel.list, {});
  console.log(`Found ${allPersonnel.length} total records`);

  // Group by email (lowercase)
  const byEmail = {};
  for (const person of allPersonnel) {
    const email = person.email.toLowerCase();
    if (!byEmail[email]) {
      byEmail[email] = [];
    }
    byEmail[email].push(person);
  }

  // Find duplicates
  let toDelete = [];
  for (const [email, records] of Object.entries(byEmail)) {
    if (records.length > 1) {
      // Sort by _creationTime, keep the oldest
      records.sort((a, b) => a._creationTime - b._creationTime);
      // Mark all but the first (oldest) for deletion
      for (let i = 1; i < records.length; i++) {
        toDelete.push({
          id: records[i]._id,
          name: `${records[i].firstName} ${records[i].lastName}`,
          email: records[i].email
        });
      }
    }
  }

  console.log(`\nFound ${toDelete.length} duplicates to remove`);
  console.log(`Will keep ${allPersonnel.length - toDelete.length} unique records\n`);

  if (toDelete.length === 0) {
    console.log("No duplicates found!");
    return;
  }

  // Delete duplicates
  let deleted = 0;
  for (const item of toDelete) {
    try {
      await client.mutation(api.personnel.remove, { personnelId: item.id });
      deleted++;
      console.log(`✓ Deleted duplicate: ${item.name} (${item.email})`);
    } catch (error) {
      console.error(`✗ Failed to delete ${item.name}: ${error.message}`);
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Deleted: ${deleted}`);
  console.log(`Remaining: ${allPersonnel.length - deleted}`);
}

cleanupDuplicates().catch(console.error);
