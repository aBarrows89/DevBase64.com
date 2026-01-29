import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

// Create Convex client lazily to avoid build-time errors
function getConvexClient() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured");
  }
  return new ConvexHttpClient(url);
}

// Session storage (in production, use Redis or database)
const sessions: Map<string, {
  username: string;
  companyFile: string;
  requestCount: number;
  lastRequest: string | null;
}> = new Map();

// Generate unique session ticket
function generateTicket(): string {
  return `QBWC-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

// Parse SOAP request to extract method and parameters
function parseSOAPRequest(body: string): { method: string; params: Record<string, string> } {
  // Extract method name from SOAP body
  const methodMatch = body.match(/<(\w+) xmlns="http:\/\/developer\.intuit\.com\/">/);
  const method = methodMatch ? methodMatch[1] : "";

  // Extract parameters
  const params: Record<string, string> = {};

  // Common parameter patterns
  const paramPatterns = [
    { name: "strUserName", regex: /<strUserName>([^<]*)<\/strUserName>/ },
    { name: "strPassword", regex: /<strPassword>([^<]*)<\/strPassword>/ },
    { name: "ticket", regex: /<ticket>([^<]*)<\/ticket>/ },
    { name: "strHCPResponse", regex: /<strHCPResponse>([^<]*)<\/strHCPResponse>/ },
    { name: "strCompanyFileName", regex: /<strCompanyFileName>([^<]*)<\/strCompanyFileName>/ },
    { name: "qbXMLCountry", regex: /<qbXMLCountry>([^<]*)<\/qbXMLCountry>/ },
    { name: "qbXMLMajorVers", regex: /<qbXMLMajorVers>([^<]*)<\/qbXMLMajorVers>/ },
    { name: "qbXMLMinorVers", regex: /<qbXMLMinorVers>([^<]*)<\/qbXMLMinorVers>/ },
    { name: "response", regex: /<response>([\s\S]*?)<\/response>/ },
    { name: "hresult", regex: /<hresult>([^<]*)<\/hresult>/ },
    { name: "message", regex: /<message>([^<]*)<\/message>/ },
    { name: "strVersion", regex: /<strVersion>([^<]*)<\/strVersion>/ },
  ];

  for (const { name, regex } of paramPatterns) {
    const match = body.match(regex);
    if (match) {
      params[name] = match[1];
    }
  }

  return { method, params };
}

// Build SOAP response
function buildSOAPResponse(method: string, result: string | string[]): string {
  const resultArray = Array.isArray(result) ? result : [result];

  // Map method to response element name
  const responseElements: Record<string, string> = {
    serverVersion: "serverVersionResult",
    clientVersion: "clientVersionResult",
    authenticate: "authenticateResult",
    sendRequestXML: "sendRequestXMLResult",
    receiveResponseXML: "receiveResponseXMLResult",
    connectionError: "connectionErrorResult",
    getLastError: "getLastErrorResult",
    closeConnection: "closeConnectionResult",
  };

  const responseElement = responseElements[method] || `${method}Result`;

  // For authenticate, we return array elements
  if (method === "authenticate") {
    const arrayItems = resultArray.map(item => `<string>${escapeXml(item)}</string>`).join("");
    return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <soap:Body>
    <${method}Response xmlns="http://developer.intuit.com/">
      <${responseElement}>
        ${arrayItems}
      </${responseElement}>
    </${method}Response>
  </soap:Body>
</soap:Envelope>`;
  }

  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <soap:Body>
    <${method}Response xmlns="http://developer.intuit.com/">
      <${responseElement}>${escapeXml(resultArray[0])}</${responseElement}>
    </${method}Response>
  </soap:Body>
</soap:Envelope>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Handle serverVersion - returns server version string
async function handleServerVersion(): Promise<string> {
  return "IE Central QBWC Server v1.0";
}

// Handle clientVersion - validates Web Connector version
async function handleClientVersion(strVersion: string): Promise<string> {
  // Return empty string if version is OK, or "W:" warning, or "E:" error
  const version = parseFloat(strVersion);
  if (version < 2.0) {
    return "E:This application requires Web Connector version 2.0 or higher";
  }
  return ""; // OK
}

// Handle authenticate - validates credentials
async function handleAuthenticate(username: string, password: string): Promise<string[]> {
  try {
    const connection = await getConvexClient().query(api.quickbooks.getConnection);

    if (!connection) {
      return ["", "nvu"]; // Not valid user - no connection configured
    }

    if (connection.wcUsername !== username || connection.wcPassword !== password) {
      return ["", "nvu"]; // Not valid user
    }

    // Generate session ticket
    const ticket = generateTicket();
    sessions.set(ticket, {
      username,
      companyFile: "",
      requestCount: 0,
      lastRequest: null,
    });

    // Update connection status
    await getConvexClient().mutation(api.quickbooks.updateConnectionStatus, {
      status: "connected",
    });

    // Log connection
    await getConvexClient().mutation(api.quickbooks.createSyncLog, {
      sessionId: ticket,
      operation: "connect",
      direction: "import",
      status: "completed",
      message: `Authenticated user: ${username}`,
    });

    // Return ticket and empty string (no company file restriction)
    return [ticket, ""];
  } catch (error) {
    console.error("Authentication error:", error);
    return ["", "nvu"];
  }
}

// Handle sendRequestXML - returns QBXML request to process
async function handleSendRequestXML(
  ticket: string,
  strHCPResponse: string,
  strCompanyFileName: string,
  qbXMLCountry: string,
  qbXMLMajorVers: string,
  qbXMLMinorVers: string
): Promise<string> {
  const session = sessions.get(ticket);
  if (!session) {
    return ""; // Invalid session, end communication
  }

  // Store company file name on first request
  if (!session.companyFile && strCompanyFileName) {
    session.companyFile = strCompanyFileName;
    await getConvexClient().mutation(api.quickbooks.updateConnectionStatus, {
      status: "connected",
      qbVersion: `${qbXMLMajorVers}.${qbXMLMinorVers}`,
    });
  }

  try {
    // Get pending sync items
    const pendingItems = await getConvexClient().query(api.quickbooks.getPendingSyncItems, { limit: 1 });

    if (pendingItems.length === 0) {
      // No more work - check if we should query employees or paychecks
      const connection = await getConvexClient().query(api.quickbooks.getConnection);

      if (connection?.syncEmployees && session.requestCount === 0) {
        session.requestCount++;
        session.lastRequest = "employee_query";
        return await getConvexClient().query(api.quickbooks.generateEmployeeQueryXml);
      }

      // No more work to do
      return "";
    }

    const item = pendingItems[0];

    // Update item to processing
    await getConvexClient().mutation(api.quickbooks.updateSyncQueueItem, {
      itemId: item._id,
      status: "processing",
    });

    session.requestCount++;
    session.lastRequest = item._id;

    // Generate appropriate QBXML based on type
    if (item.type === "time_entry" && item.referenceType === "qbPendingTimeExport") {
      const xml = await getConvexClient().query(api.quickbooks.generateTimeTrackingAddXml, {
        exportId: item.referenceId as any,
      });
      return xml || "";
    }

    return "";
  } catch (error) {
    console.error("sendRequestXML error:", error);
    return "";
  }
}

// Handle receiveResponseXML - receives QB response
async function handleReceiveResponseXML(
  ticket: string,
  response: string,
  hresult: string,
  message: string
): Promise<string> {
  const session = sessions.get(ticket);
  if (!session) {
    return "-1"; // Invalid session
  }

  try {
    // Log the response
    await getConvexClient().mutation(api.quickbooks.createSyncLog, {
      sessionId: ticket,
      operation: "sync",
      direction: "import",
      status: hresult === "" || hresult === "0" ? "completed" : "failed",
      message: message || "Response received",
      errorDetails: hresult !== "" && hresult !== "0" ? response : undefined,
    });

    // Process response based on last request type
    if (session.lastRequest === "employee_query") {
      // Parse employee list response
      await processEmployeeQueryResponse(response, ticket);
    } else if (session.lastRequest) {
      // This was a sync queue item - mark as completed or failed
      const success = hresult === "" || hresult === "0";
      await getConvexClient().mutation(api.quickbooks.updateSyncQueueItem, {
        itemId: session.lastRequest as any,
        status: success ? "completed" : "failed",
        qbResponseXml: response,
        errorMessage: success ? undefined : message,
      });

      // Extract TxnID if this was a time tracking add
      if (success && response.includes("TimeTrackingRet")) {
        const txnIdMatch = response.match(/<TxnID>([^<]+)<\/TxnID>/);
        if (txnIdMatch) {
          // Get the queue item to find the export ID
          // This would update the export record with the QB transaction ID
        }
      }
    }

    // Return positive number for more work, 0 or negative for done
    const pendingItems = await getConvexClient().query(api.quickbooks.getPendingSyncItems, { limit: 1 });
    return pendingItems.length > 0 ? "1" : "0";
  } catch (error) {
    console.error("receiveResponseXML error:", error);
    return "-1";
  }
}

// Process employee query response
async function processEmployeeQueryResponse(response: string, sessionId: string): Promise<void> {
  try {
    // Parse employee data from QBXML response
    const employeeMatches = response.matchAll(
      /<EmployeeRet>[\s\S]*?<ListID>([^<]+)<\/ListID>[\s\S]*?<Name>([^<]+)<\/Name>[\s\S]*?<\/EmployeeRet>/g
    );

    const employees: Array<{ listId: string; name: string }> = [];
    for (const match of employeeMatches) {
      employees.push({
        listId: match[1],
        name: match[2],
      });
    }

    // Log employee sync
    await getConvexClient().mutation(api.quickbooks.createSyncLog, {
      sessionId,
      operation: "sync_employees",
      direction: "import",
      recordType: "employee",
      recordCount: employees.length,
      status: "completed",
      message: `Received ${employees.length} employees from QuickBooks`,
    });

    // Note: Auto-mapping would happen here in a full implementation
    // For now, we just log what we received
  } catch (error) {
    console.error("Error processing employee query response:", error);
  }
}

// Handle connectionError
async function handleConnectionError(
  ticket: string,
  hresult: string,
  message: string
): Promise<string> {
  await getConvexClient().mutation(api.quickbooks.updateConnectionStatus, {
    status: "error",
    error: `${hresult}: ${message}`,
  });

  await getConvexClient().mutation(api.quickbooks.createSyncLog, {
    sessionId: ticket,
    operation: "error",
    direction: "import",
    status: "failed",
    errorDetails: `${hresult}: ${message}`,
  });

  return "done";
}

// Handle getLastError
async function handleGetLastError(ticket: string): Promise<string> {
  // Return empty string if no error
  return "";
}

// Handle closeConnection
async function handleCloseConnection(ticket: string): Promise<string> {
  const session = sessions.get(ticket);
  if (session) {
    await getConvexClient().mutation(api.quickbooks.createSyncLog, {
      sessionId: ticket,
      operation: "disconnect",
      direction: "export",
      status: "completed",
      message: `Session closed after ${session.requestCount} requests`,
    });

    // Update last sync time
    await getConvexClient().mutation(api.quickbooks.updateConnectionStatus, {
      status: "disconnected",
    });

    sessions.delete(ticket);
  }
  return "OK";
}

// Main POST handler
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const { method, params } = parseSOAPRequest(body);

    console.log(`QBWC Request: ${method}`, params);

    let result: string | string[];

    switch (method) {
      case "serverVersion":
        result = await handleServerVersion();
        break;
      case "clientVersion":
        result = await handleClientVersion(params.strVersion || "");
        break;
      case "authenticate":
        result = await handleAuthenticate(params.strUserName || "", params.strPassword || "");
        break;
      case "sendRequestXML":
        result = await handleSendRequestXML(
          params.ticket || "",
          params.strHCPResponse || "",
          params.strCompanyFileName || "",
          params.qbXMLCountry || "",
          params.qbXMLMajorVers || "",
          params.qbXMLMinorVers || ""
        );
        break;
      case "receiveResponseXML":
        result = await handleReceiveResponseXML(
          params.ticket || "",
          params.response || "",
          params.hresult || "",
          params.message || ""
        );
        break;
      case "connectionError":
        result = await handleConnectionError(
          params.ticket || "",
          params.hresult || "",
          params.message || ""
        );
        break;
      case "getLastError":
        result = await handleGetLastError(params.ticket || "");
        break;
      case "closeConnection":
        result = await handleCloseConnection(params.ticket || "");
        break;
      default:
        console.warn(`Unknown QBWC method: ${method}`);
        result = "";
    }

    const responseXml = buildSOAPResponse(method, result);

    return new NextResponse(responseXml, {
      status: 200,
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("QBWC handler error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

// GET handler for WSDL (optional)
export async function GET() {
  // Return simple info page
  return new NextResponse(
    `<html>
      <head><title>IE Central QBWC Service</title></head>
      <body>
        <h1>QuickBooks Web Connector Service</h1>
        <p>This endpoint handles QuickBooks Web Connector SOAP requests.</p>
        <p>Configure your Web Connector to use this URL for sync operations.</p>
      </body>
    </html>`,
    {
      status: 200,
      headers: { "Content-Type": "text/html" },
    }
  );
}
