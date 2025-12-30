import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const client = new ConvexHttpClient("https://outstanding-dalmatian-787.convex.cloud");

// IDs of duplicates to delete (keeping the older records)
const duplicatesToDelete = [
  { id: "kx71kmr84p75f6atd9k833agz97y6e5k", name: "Dawson Dibert", email: "ddtyranitar@gmail.com" },
  { id: "kx7a2txbmehhrfm53dk942c2n17y6gfz", name: "Tyler Drexler", email: "tyler.drexler122@gmail.com" },
  { id: "kx7dgtv55a5ys8xkvbkm867yqx7y7601", name: "Lucas Lamer", email: "lucastlamer@gmail.com" },
  { id: "kx722m5hna5gmhccc75c5xfg1d7y6bj1", name: "Rahman Terry", email: "trezzysmith28@gmail.com" },
];

async function deleteDuplicates() {
  console.log("Deleting duplicate personnel records...\n");

  for (const dup of duplicatesToDelete) {
    try {
      await client.mutation(api.personnel.remove, {
        personnelId: dup.id,
      });
      console.log(`✓ Deleted: ${dup.name} (${dup.email})`);
    } catch (error) {
      console.error(`✗ Failed to delete ${dup.name}: ${error.message}`);
    }
  }

  console.log("\nDone! Verifying...");

  // Verify no more duplicates
  const allPersonnel = await client.query(api.personnel.list, {});
  console.log(`Total records now: ${allPersonnel.length}`);
}

deleteDuplicates().catch(console.error);
