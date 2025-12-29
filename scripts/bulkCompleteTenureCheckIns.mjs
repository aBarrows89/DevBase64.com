import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const client = new ConvexHttpClient("https://outstanding-dalmatian-787.convex.cloud");

async function bulkCompleteTenureCheckIns() {
  const beforeDate = "2025-12-01";
  const cutoffDate = new Date(beforeDate);
  cutoffDate.setHours(0, 0, 0, 0);

  console.log(`Marking all tenure check-ins complete for employees hired before ${beforeDate}...\n`);

  // Get all personnel
  const allPersonnel = await client.query(api.personnel.list, {});
  console.log(`Found ${allPersonnel.length} total personnel\n`);

  const milestones = ["1_day", "3_day", "7_day", "30_day", "60_day"];
  let updated = 0;
  let skipped = 0;

  for (const person of allPersonnel) {
    if (person.status !== "active") {
      continue;
    }

    const hireDate = new Date(person.hireDate);
    hireDate.setHours(0, 0, 0, 0);

    // Only process if hired before the cutoff date
    if (hireDate >= cutoffDate) {
      skipped++;
      continue;
    }

    const currentCheckIns = person.tenureCheckIns || [];
    const completedMilestones = currentCheckIns.map(c => c.milestone);
    const missingMilestones = milestones.filter(m => !completedMilestones.includes(m));

    if (missingMilestones.length > 0) {
      try {
        const result = await client.mutation(api.personnel.setAllTenureCheckInsComplete, {
          personnelId: person._id,
          completedByName: "System (Bulk)",
          notes: "Bulk completed for employees hired before " + beforeDate,
        });
        console.log(`✓ ${person.firstName} ${person.lastName} - added ${result.added} milestones (hired ${person.hireDate})`);
        updated++;
      } catch (error) {
        console.error(`✗ Failed for ${person.firstName} ${person.lastName}: ${error.message}`);
      }
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped (hired on/after ${beforeDate}): ${skipped}`);
}

bulkCompleteTenureCheckIns().catch(console.error);
