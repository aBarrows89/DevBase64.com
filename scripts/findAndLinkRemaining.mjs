// Find personnel by first name and link/update emails
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const client = new ConvexHttpClient(process.env.CONVEX_URL || "https://outstanding-dalmatian-787.convex.cloud");

async function main() {
  const allPersonnel = await client.query(api.personnel.list);

  // Users we need to find
  const usersToFind = [
    { name: "Cassady Harris", email: "ar@ietires.com", userId: "jd77wjev4ezbdrrbf8fzfh7j757y7ed2", searchFirst: "cassady" },
    { name: "Terry Myers", email: "terry@ietires.com", userId: "jd74jd546hy0c2chfhasvrhprh7zhrt6", searchFirst: "terry" },
    { name: "Teri Lesofsky", email: "tlesofsky@ietires.com", userId: "jd76wh6z9yar6egh64rxpms6ps7zkp00", searchFirst: "teri" },
    { name: "Emerson Long", email: "emerson@ietires.com", userId: "jd77mbn3yf8v3f1kse2tdd8vq57zjnsq", searchFirst: "emerson" },
    { name: "Debbie Myers", email: "debbie@ietires.com", userId: "jd7ds87h4p9ehv9pp1pwf3cvc57zkhdq", searchFirst: "debbie" },
    { name: "Jonathan Weimer", email: "jkw6794@gmail.com", userId: "jd7fzpg081m3kk5srhh38f728d804bbb", searchFirst: "jonathan" },
  ];

  console.log("Searching for personnel by first name...\n");

  for (const user of usersToFind) {
    const matches = allPersonnel.filter(p =>
      p.firstName.toLowerCase() === user.searchFirst.toLowerCase()
    );

    console.log(`\n${user.name} (${user.email}):`);
    if (matches.length === 0) {
      console.log("  No matches found");
    } else {
      for (const m of matches) {
        console.log(`  - ${m.firstName} ${m.lastName} (${m.email || 'no email'}) [${m._id}]`);
      }
    }
  }
}

main().catch(console.error);
