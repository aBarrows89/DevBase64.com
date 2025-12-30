import Anthropic from "@anthropic-ai/sdk";

const apiKey = process.env.ANTHROPIC_API_KEY;

if (!apiKey) {
  console.error("Error: ANTHROPIC_API_KEY environment variable not set");
  console.log("Usage: ANTHROPIC_API_KEY=sk-ant-... node scripts/testAnthropicKey.mjs");
  process.exit(1);
}

async function testKey() {
  console.log("Testing Anthropic API key with a longer prompt (similar to resume analysis)...\n");

  const anthropic = new Anthropic({
    apiKey: apiKey,
  });

  // Simulate a resume-like analysis
  const testPrompt = `Analyze this resume and return JSON:

RESUME:
John Smith
Email: john@email.com
Phone: 555-1234
Experience: 5 years warehouse work at ABC Company (2019-2024)
Skills: Forklift certified, inventory management

Return JSON with: firstName, lastName, email, phone, overallScore (0-100)`;

  try {
    console.log("Making API call with model: claude-sonnet-4-20250514");
    console.log("Prompt length:", testPrompt.length, "characters\n");

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      temperature: 0,
      messages: [
        {
          role: "user",
          content: testPrompt
        }
      ],
    });

    console.log("✓ API Key is working!");
    console.log("Response:", message.content[0].type === 'text' ? message.content[0].text : "");
    console.log("\nUsage:", message.usage);
  } catch (error) {
    console.error("✗ API Error:", error.message);
    if (error.status) {
      console.error("  Status:", error.status);
    }
    if (error.error) {
      console.error("  Details:", JSON.stringify(error.error, null, 2));
    }
  }
}

testKey();
