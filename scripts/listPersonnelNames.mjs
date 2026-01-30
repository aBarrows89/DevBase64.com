// List all personnel names for debugging
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const client = new ConvexHttpClient(process.env.CONVEX_URL || "https://outstanding-dalmatian-787.convex.cloud");

async function main() {
  const allPersonnel = await client.query(api.personnel.list);

  // Filter for names similar to unlinked users
  const searchNames = ["harris", "price", "shetler", "myers", "lesofsky", "long", "warner", "collier", "weimer", "cassady", "bill", "terry", "teri", "emerson", "debbie", "levi", "josh", "jonathan"];

  console.log("Searching for personnel matching unlinked user names...\n");

  for (const p of allPersonnel) {
    const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
    const email = (p.email || "").toLowerCase();

    for (const search of searchNames) {
      if (fullName.includes(search) || email.includes(search)) {
        console.log(`${p.firstName} ${p.lastName} (${p.email || 'no email'}) [${p._id}]`);
        break;
      }
    }
  }
}

main().catch(console.error);
