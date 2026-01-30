// Auto-link users to personnel records by name matching
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const client = new ConvexHttpClient(process.env.CONVEX_URL || "https://outstanding-dalmatian-787.convex.cloud");

async function main() {
  console.log("Fetching users without personnelId...");
  const allUsers = await client.query(api.auth.getAllUsers);
  const unlinkedUsers = allUsers.filter(u => !u.personnelId);

  console.log(`Found ${unlinkedUsers.length} users without personnelId:\n`);
  for (const user of unlinkedUsers) {
    console.log(`  - ${user.name} (${user.email}) [${user._id}]`);
  }

  console.log("\nFetching all personnel records...");
  const allPersonnel = await client.query(api.personnel.list);
  console.log(`Found ${allPersonnel.length} personnel records`);

  // Create name lookup map for personnel
  const personnelByFullName = new Map();
  const personnelByFirstLast = new Map();

  for (const p of allPersonnel) {
    const fullName = `${p.firstName} ${p.lastName}`.toLowerCase().trim();
    const key = `${p.firstName.toLowerCase().trim()}_${p.lastName.toLowerCase().trim()}`;

    personnelByFullName.set(fullName, p);
    personnelByFirstLast.set(key, p);
  }

  console.log("\n--- Attempting to link by name matching ---\n");

  let linkedCount = 0;
  const linked = [];
  const notFound = [];

  for (const user of unlinkedUsers) {
    // Skip system accounts
    if (user.email === "admin@devbase64.com") {
      console.log(`Skipping system account: ${user.name}`);
      continue;
    }

    const userName = user.name.toLowerCase().trim();
    let match = personnelByFullName.get(userName);

    // Try splitting name
    if (!match) {
      const parts = user.name.trim().split(/\s+/);
      if (parts.length >= 2) {
        const key = `${parts[0].toLowerCase()}_${parts[parts.length-1].toLowerCase()}`;
        match = personnelByFirstLast.get(key);
      }
    }

    if (match) {
      console.log(`Found match: ${user.name} -> ${match.firstName} ${match.lastName} (${match._id})`);

      // Update user with personnelId
      try {
        await client.mutation(api.auth.updateUser, {
          userId: user._id,
          personnelId: match._id
        });
        console.log(`  ✓ Linked successfully!`);
        linkedCount++;
        linked.push({ user: user.name, personnel: `${match.firstName} ${match.lastName}`, personnelId: match._id });
      } catch (e) {
        console.log(`  ✗ Failed to link: ${e.message}`);
      }
    } else {
      console.log(`No match found for: ${user.name} (${user.email})`);
      notFound.push({ name: user.name, email: user.email, userId: user._id });
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Linked by name: ${linkedCount}`);
  if (linked.length > 0) {
    for (const l of linked) {
      console.log(` - ${l.user} -> ${l.personnelId}`);
    }
  }

  if (notFound.length > 0) {
    console.log(`\nNot found (${notFound.length}):`);
    for (const n of notFound) {
      console.log(` - ${n.name} (${n.email})`);
    }
  }
}

main().catch(console.error);
