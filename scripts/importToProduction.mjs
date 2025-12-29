import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import fs from "fs";

const client = new ConvexHttpClient("https://outstanding-dalmatian-787.convex.cloud");

async function importToProduction() {
  // Load employees from JSON
  const data = JSON.parse(fs.readFileSync("scripts/employees.json", "utf8"));
  const employees = data.employees;
  console.log(`Loaded ${employees.length} employees from JSON`);

  // Get existing personnel
  console.log("Fetching existing personnel from production...");
  const existing = await client.query(api.personnel.list, {});
  const existingEmails = new Set(existing.map(p => p.email.toLowerCase()));
  console.log(`Found ${existing.length} existing personnel\n`);

  let imported = 0;
  let skipped = 0;

  for (const emp of employees) {
    const email = emp.email.toLowerCase();

    if (existingEmails.has(email)) {
      console.log(`⏭ Skipping (exists): ${emp.firstName} ${emp.lastName} (${emp.email})`);
      skipped++;
      continue;
    }

    try {
      await client.mutation(api.personnel.create, {
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        phone: emp.phone,
        position: emp.position,
        department: emp.department,
        employeeType: emp.employeeType,
        hireDate: emp.hireDate,
      });
      console.log(`✓ Imported: ${emp.firstName} ${emp.lastName}`);
      imported++;
      existingEmails.add(email); // Prevent duplicates within this run
    } catch (error) {
      console.error(`✗ Failed: ${emp.firstName} ${emp.lastName}: ${error.message}`);
    }
  }

  console.log(`\n=== Import Complete ===`);
  console.log(`Imported: ${imported}`);
  console.log(`Skipped (already exist): ${skipped}`);
  console.log(`Total in database: ${existing.length + imported}`);
}

importToProduction().catch(console.error);
