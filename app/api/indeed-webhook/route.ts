import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { extractText } from "unpdf";
import crypto from "crypto";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Indeed Apply payload structure (based on Indeed docs)
interface IndeedApplicant {
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  resume?: {
    file?: {
      contentType?: string;
      fileName?: string;
      data?: string; // Base64 encoded
    };
    // Indeed Resume format (when using Indeed profile)
    html?: string;
    text?: string;
  };
}

interface IndeedJob {
  jobTitle?: string;
  jobId?: string;
  jobCompanyName?: string;
  jobLocation?: string;
}

interface IndeedPayload {
  id: string; // Unique 64-char apply ID
  locale?: string;
  job?: IndeedJob;
  applicant?: IndeedApplicant;
  questions?: Array<{
    question?: string;
    answer?: string;
  }>;
}

// Verify Indeed signature using HMAC-SHA1
function verifyIndeedSignature(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature || !secret) {
    // If no secret configured, skip verification (for testing)
    console.warn("Indeed signature verification skipped - no secret configured");
    return true;
  }

  const expectedSignature = crypto
    .createHmac("sha1", secret)
    .update(payload)
    .digest("hex");

  // Indeed may prefix with "sha1="
  const cleanSignature = signature.replace("sha1=", "");

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(cleanSignature)
  );
}

// Extract text from PDF buffer
async function extractTextFromPdfBuffer(buffer: ArrayBuffer): Promise<string> {
  const result = await extractText(buffer);

  let text: string;
  if (typeof result === "string") {
    text = result;
  } else if (result && typeof result.text === "string") {
    text = result.text;
  } else if (result && Array.isArray(result.text)) {
    text = result.text.join("\n");
  } else {
    text = String(result || "");
  }

  return text;
}

export async function POST(request: NextRequest) {
  const receivedAt = Date.now();

  try {
    // Get raw body for signature verification
    const rawBody = await request.text();

    // Verify Indeed signature
    const signature = request.headers.get("X-Indeed-Signature");
    const secret = process.env.INDEED_API_SECRET || "";

    if (secret && !verifyIndeedSignature(rawBody, signature, secret)) {
      console.error("Invalid Indeed signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    // Parse the payload
    const payload: IndeedPayload = JSON.parse(rawBody);

    console.log("Indeed webhook received:", {
      applyId: payload.id,
      applicant: payload.applicant?.fullName,
      job: payload.job?.jobTitle,
    });

    // Extract applicant info
    const applicantName = payload.applicant?.fullName || "Unknown";
    const applicantEmail = payload.applicant?.email || "";
    const applicantPhone = payload.applicant?.phoneNumber || "";
    const indeedJobId = payload.job?.jobId || "";
    const indeedJobTitle = payload.job?.jobTitle || "";

    // Get resume data
    let resumeText = "";
    let resumeBuffer: Buffer | null = null;
    let resumeFileName = "resume.pdf";

    // Try uploaded file first
    if (payload.applicant?.resume?.file?.data) {
      const base64Data = payload.applicant.resume.file.data;
      resumeBuffer = Buffer.from(base64Data, "base64");
      resumeFileName = payload.applicant.resume.file.fileName || "resume.pdf";

      // Extract text from PDF
      try {
        // Create a proper ArrayBuffer from the Buffer
        const arrayBuffer = resumeBuffer.buffer.slice(
          resumeBuffer.byteOffset,
          resumeBuffer.byteOffset + resumeBuffer.byteLength
        );
        resumeText = await extractTextFromPdfBuffer(arrayBuffer as ArrayBuffer);
        console.log("Extracted text from PDF, length:", resumeText.length);
      } catch (pdfError) {
        console.error("PDF extraction failed:", pdfError);
        // Try to continue with limited info
      }
    }

    // Fall back to Indeed Resume text if no file
    if (!resumeText && payload.applicant?.resume?.text) {
      resumeText = payload.applicant.resume.text;
    }

    // If still no resume text, create basic info
    if (!resumeText) {
      resumeText = `Name: ${applicantName}\nEmail: ${applicantEmail}\nPhone: ${applicantPhone}`;
    }

    // Upload resume file to Convex storage if we have it
    let resumeFileId: string | undefined;
    if (resumeBuffer) {
      try {
        // Get upload URL from Convex
        const uploadUrl = await convex.mutation(
          api.applications.generateUploadUrl,
          {}
        );

        // Upload the file - convert Buffer to Uint8Array for fetch body
        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: {
            "Content-Type":
              payload.applicant?.resume?.file?.contentType || "application/pdf",
          },
          body: new Uint8Array(resumeBuffer),
        });

        if (uploadResponse.ok) {
          const { storageId } = await uploadResponse.json();
          resumeFileId = storageId;
          console.log("Resume uploaded to Convex storage:", storageId);
        }
      } catch (uploadError) {
        console.error("Failed to upload resume to storage:", uploadError);
        // Continue without file storage
      }
    }

    // Process the application through Convex
    const result = await convex.action(
      api.indeedActions.processIndeedApplication,
      {
        indeedApplyId: payload.id,
        applicantName,
        email: applicantEmail,
        phone: applicantPhone,
        resumeText,
        resumeFileId,
        indeedJobId,
        indeedJobTitle,
        rawPayload: rawBody.substring(0, 10000), // Truncate for storage
        receivedAt,
      }
    );

    console.log("Indeed application processed:", result);

    // Always return 200 OK to Indeed (they retry on non-2XX)
    return NextResponse.json({
      success: true,
      applicationId: result.applicationId,
      status: result.status,
    });
  } catch (error: unknown) {
    console.error("Indeed webhook error:", error);

    // Try to log the error
    try {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      await convex.mutation(api.indeedIntegration.logWebhookError, {
        errorMessage,
        receivedAt,
      });
    } catch {
      // Ignore logging errors
    }

    // Still return 200 to prevent Indeed from retrying on our errors
    // (They should only retry on actual failures/timeouts)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Processing failed",
    });
  }
}

// GET handler for testing/verification
export async function GET() {
  return NextResponse.json({
    status: "Indeed webhook endpoint active",
    endpoint: "/api/indeed-webhook",
    method: "POST",
    description:
      "This endpoint receives job applications from Indeed Apply. Configure your Indeed job postings to POST to this URL.",
  });
}
