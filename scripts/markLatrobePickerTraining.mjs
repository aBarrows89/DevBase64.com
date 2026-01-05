import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient(process.env.CONVEX_URL || "https://outstanding-dalmatian-787.convex.cloud");

async function markLatrobePickerTraining() {
  // First, get all locations to find Latrobe
  const locations = await client.query("locations:list", {});
  console.log("Locations:", locations.map(l => ({ id: l._id, name: l.name })));

  const latrobe = locations.find(l => l.name.toLowerCase().includes("latrobe"));

  if (!latrobe) {
    console.log("Could not find Latrobe location. Available locations:");
    locations.forEach(l => console.log(`  - ${l.name}`));
    return;
  }

  console.log(`\nFound Latrobe: ${latrobe.name} (${latrobe._id})`);

  // Get all personnel at Latrobe
  const allPersonnel = await client.query("personnel:list", {});
  const latrobePersonnel = allPersonnel.filter(p => p.locationId === latrobe._id && p.status === "active");

  console.log(`\nFound ${latrobePersonnel.length} active personnel at Latrobe:`);
  latrobePersonnel.forEach(p => console.log(`  - ${p.firstName} ${p.lastName}`));

  // Mark each one as complete for Picker Training Video
  let updated = 0;

  for (const person of latrobePersonnel) {
    const existingRecords = person.trainingRecords || [];

    // Check if already has this training
    const alreadyComplete = existingRecords.some(r => r.area === "Picker Training Video");

    if (alreadyComplete) {
      console.log(`  ${person.firstName} ${person.lastName} - already completed`);
      continue;
    }

    // Use the toggleTraining mutation instead of update
    await client.mutation("personnel:toggleTraining", {
      personnelId: person._id,
      trainingArea: "Picker Training Video",
    });

    console.log(`  ${person.firstName} ${person.lastName} - marked complete`);
    updated++;
  }

  console.log(`\nDone! Updated ${updated} personnel records.`);
}

markLatrobePickerTraining().catch(console.error);
