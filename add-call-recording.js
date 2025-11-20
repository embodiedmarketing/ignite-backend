// Script to add the Nov 12, 2025 Ads Optimization Call Recording
// Run with: node add-call-recording.js

const fetch = require("node-fetch");

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

async function addCallRecording() {
  try {
    console.log("Step 1: Logging in as admin...");

    // First, login to get session cookie
    const loginResponse = await fetch(`${BACKEND_URL}/api/admin/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      }),
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.statusText}`);
    }

    const cookies = loginResponse.headers.get("set-cookie");
    if (!cookies) {
      throw new Error("No session cookie received");
    }

    console.log("✓ Logged in successfully");

    console.log("\nStep 2: Creating platform resource for call recording...");

    // Extract session cookie
    const sessionCookie = cookies.split(";")[0];

    // Create the platform resource with timestamped transcript
    const timestampedDescription = `Live coaching call recording focused on ads optimization.

## Key Questions & Timestamps

### Coach's Questions:
- **[00:01:00]** [Can you remind me what the, the currency is again?](https://vimeo.com/1136519452/687cb0ed8f?share=copy&fl=sv&fe=ci#t=60s)
- **[00:01:57]** [Are you aligned with that?](https://vimeo.com/1136519452/687cb0ed8f?share=copy&fl=sv&fe=ci#t=117s)

### Client's Questions:
- **[00:01:59]** [Yes, I am. I just dunno, which one did you say? The, the,](https://vimeo.com/1136519452/687cb0ed8f?share=copy&fl=sv&fe=ci#t=119s)
- **[00:02:48]** [Is it not on?](https://vimeo.com/1136519452/687cb0ed8f?share=copy&fl=sv&fe=ci#t=168s)

Click any timestamp above to jump directly to that moment in the video.`;

    const resourceData = {
      title: "Nov 12, 2025 Ads Optimization Call Recording",
      description: timestampedDescription,
      resourceType: "video",
      resourceUrl:
        "https://vimeo.com/1136519452/687cb0ed8f?share=copy&fl=sv&fe=ci",
      sectionKey: "live-coaching-calls", // or 'ads-call-recording' if that section exists
      isActive: true,
    };

    // Debug: Log what we're sending
    console.log("\nSending resource data:");
    console.log(JSON.stringify(resourceData, null, 2));

    const createResponse = await fetch(
      `${BACKEND_URL}/api/admin/platform-resources`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: sessionCookie,
        },
        credentials: "include",
        body: JSON.stringify(resourceData),
      }
    );

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error("\n❌ Error response body:", errorText);
      try {
        const errorJson = JSON.parse(errorText);
        console.error("\n❌ Parsed error:", JSON.stringify(errorJson, null, 2));
        if (errorJson.errors && Array.isArray(errorJson.errors)) {
          console.error("\n❌ Validation errors:");
          errorJson.errors.forEach((err, idx) => {
            console.error(`  ${idx + 1}. Path: ${JSON.stringify(err.path)}`);
            console.error(
              `     Expected: ${err.expected}, Received: ${err.received}`
            );
            console.error(`     Message: ${err.message}`);
          });
        }
      } catch (e) {
        // Error text is not JSON, just show raw text
      }
      throw new Error(
        `Failed to create resource: ${createResponse.statusText} - ${errorText}`
      );
    }

    const resource = await createResponse.json();
    console.log("✓ Call recording added successfully!");
    console.log("\nResource created:");
    console.log(JSON.stringify(resource, null, 2));
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

// Check if credentials are provided
if (!ADMIN_PASSWORD) {
  console.error("ERROR: ADMIN_PASSWORD environment variable is required");
  console.log("\nUsage:");
  console.log(
    "  ADMIN_EMAIL=your@email.com ADMIN_PASSWORD=yourpassword node add-call-recording.js"
  );
  console.log("\nOr set BACKEND_URL if not using localhost:");
  console.log(
    "  BACKEND_URL=https://your-backend.com ADMIN_EMAIL=your@email.com ADMIN_PASSWORD=yourpassword node add-call-recording.js"
  );
  process.exit(1);
}

addCallRecording();
