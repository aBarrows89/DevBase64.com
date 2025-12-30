// Raw HTTP test to Convex API
const PROD_URL = "https://outstanding-dalmatian-787.convex.cloud";
const DEV_URL = "https://quiet-rat-621.convex.cloud";

async function testRawHttp(url, name) {
  console.log(`\n=== Testing ${name} ===`);
  console.log(`URL: ${url}`);

  // Try the Convex sync protocol format
  const response = await fetch(`${url}/api/action`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Convex-Client": "npm-0.19.1",
    },
    body: JSON.stringify({
      path: "aiMatching:analyzeResume",
      args: {
        resumeText: "John Smith john@test.com 555-1234 warehouse worker 5 years",
      },
      format: "json",
    }),
  });

  console.log("Status:", response.status);

  const text = await response.text();
  console.log("Response length:", text.length);

  try {
    const json = JSON.parse(text);
    if (json.status === "success") {
      console.log("Score:", json.value?.candidateAnalysis?.overallScore);
      console.log("Summary:", json.value?.summary?.substring(0, 100));
    } else {
      console.log("Error:", json);
    }
  } catch {
    console.log("Raw response:", text.substring(0, 500));
  }
}

async function main() {
  await testRawHttp(DEV_URL, "DEV");
  await testRawHttp(PROD_URL, "PROD");
}

main().catch(console.error);
