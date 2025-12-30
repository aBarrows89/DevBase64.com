#!/usr/bin/env node

// This script processes resumes using the Convex CLI (which works on PROD)
// instead of the HTTP client (which has issues)

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const RESUME_DIR = process.argv[2];

if (!RESUME_DIR) {
  console.log("Usage: node scripts/processResumesCLI.mjs <folder-with-resumes>");
  console.log("Example: node scripts/processResumesCLI.mjs ~/Desktop/Resumes");
  process.exit(1);
}

async function processResumes() {
  const files = fs.readdirSync(RESUME_DIR).filter(f =>
    f.endsWith('.txt') || f.endsWith('.pdf')
  );

  console.log(`Found ${files.length} resume files in ${RESUME_DIR}\n`);

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = path.join(RESUME_DIR, file);

    console.log(`\n[${i + 1}/${files.length}] Processing: ${file}`);

    try {
      // Read resume text (for .txt files)
      let resumeText;
      if (file.endsWith('.txt')) {
        resumeText = fs.readFileSync(filePath, 'utf-8');
      } else {
        console.log("  Skipping PDF - need text extraction");
        continue;
      }

      // Escape for JSON
      const escapedText = JSON.stringify(resumeText);
      const args = JSON.stringify({ resumeText: resumeText, fileName: file });

      // Call via Convex CLI
      const result = execSync(
        `CONVEX_DEPLOYMENT=prod:outstanding-dalmatian-787 npx convex run bulkUpload:processResume '${args.replace(/'/g, "'\\''")}'`,
        {
          cwd: process.cwd(),
          encoding: 'utf-8',
          timeout: 120000 // 2 minute timeout per resume
        }
      );

      const parsed = JSON.parse(result);
      if (parsed.success) {
        console.log(`  ✓ ${parsed.candidateName} - Score: ${parsed.overallScore} - Job: ${parsed.matchedJob}`);
      } else {
        console.log(`  ✗ Error: ${parsed.error}`);
      }

      // Small delay between resumes
      await new Promise(r => setTimeout(r, 2000));

    } catch (error) {
      console.log(`  ✗ Failed: ${error.message}`);
    }
  }

  console.log("\nDone!");
}

processResumes();
