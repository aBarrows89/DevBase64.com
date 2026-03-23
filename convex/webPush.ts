import { v } from "convex/values";
import { mutation, query, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

// ============ QUERIES ============

// Check if user has any push subscriptions
export const hasSubscription = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const subs = await ctx.db
      .query("webPushSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    return !!subs;
  },
});

// ============ MUTATIONS ============

// Save a web push subscription
export const subscribe = mutation({
  args: {
    userId: v.id("users"),
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if this endpoint already exists
    const existing = await ctx.db
      .query("webPushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .first();

    if (existing) {
      // Update existing subscription
      await ctx.db.patch(existing._id, {
        userId: args.userId,
        p256dh: args.p256dh,
        auth: args.auth,
        userAgent: args.userAgent,
      });
      return existing._id;
    }

    // Create new subscription
    return await ctx.db.insert("webPushSubscriptions", {
      userId: args.userId,
      endpoint: args.endpoint,
      p256dh: args.p256dh,
      auth: args.auth,
      userAgent: args.userAgent,
      createdAt: Date.now(),
    });
  },
});

// Remove a push subscription
export const unsubscribe = mutation({
  args: { endpoint: v.string() },
  handler: async (ctx, args) => {
    const sub = await ctx.db
      .query("webPushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .first();

    if (sub) {
      await ctx.db.delete(sub._id);
    }
  },
});

// Internal: remove a stale subscription by ID
export const removeSubscription = internalMutation({
  args: { subscriptionId: v.id("webPushSubscriptions") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.subscriptionId);
  },
});

// ============ ACTIONS ============

// Send web push notification to a user
export const sendToUser = internalAction({
  args: {
    userId: v.id("users"),
    title: v.string(),
    body: v.string(),
    url: v.optional(v.string()),
    tag: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get all subscriptions for this user
    const subscriptions = await ctx.runQuery(
      internal.webPush.getSubscriptionsForUser,
      { userId: args.userId }
    );

    if (!subscriptions || subscriptions.length === 0) {
      return { sent: 0 };
    }

    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const vapidSubject = process.env.VAPID_SUBJECT || "mailto:andy@ietires.com";

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error("VAPID keys not configured");
      return { sent: 0, error: "VAPID keys not configured" };
    }

    const payload = JSON.stringify({
      title: args.title,
      body: args.body,
      url: args.url || "/",
      tag: args.tag,
      icon: "/icons/icon-192x192.svg",
      badge: "/icons/icon-72x72.svg",
    });

    let sent = 0;
    for (const sub of subscriptions) {
      try {
        // Use the Web Push protocol directly with fetch
        const response = await sendWebPush(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload,
          vapidPublicKey,
          vapidPrivateKey,
          vapidSubject
        );

        if (response.ok) {
          sent++;
        } else if (response.status === 410 || response.status === 404) {
          // Subscription expired or invalid, remove it
          await ctx.runMutation(internal.webPush.removeSubscription, {
            subscriptionId: sub._id,
          });
        }
      } catch (error) {
        console.error("Failed to send push to subscription:", sub.endpoint, error);
      }
    }

    return { sent };
  },
});

// Internal query to get subscriptions
export const getSubscriptionsForUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("webPushSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

// ============ WEB PUSH HELPERS ============

// Web Push sending using fetch + Web Push protocol
// This avoids needing the web-push npm package in Convex
async function sendWebPush(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string
): Promise<Response> {
  // Import crypto for JWT signing
  const jwt = await createVapidJWT(subscription.endpoint, vapidPublicKey, vapidPrivateKey, vapidSubject);

  // Encrypt the payload using the subscription's public key
  const encrypted = await encryptPayload(payload, subscription.keys.p256dh, subscription.keys.auth);

  const response = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      "Content-Length": String(encrypted.byteLength),
      Authorization: `vapid t=${jwt.token}, k=${jwt.publicKey}`,
      TTL: "86400",
      Urgency: "high",
    },
    body: encrypted,
  });

  return response;
}

// Create VAPID JWT token
async function createVapidJWT(
  endpoint: string,
  publicKey: string,
  privateKey: string,
  subject: string
): Promise<{ token: string; publicKey: string }> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;

  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60, // 12 hours
    sub: subject,
  };

  const headerB64 = base64urlEncode(JSON.stringify(header));
  const payloadB64 = base64urlEncode(JSON.stringify(payload));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import the private key
  const keyData = base64urlDecode(privateKey);
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    convertECPrivateKey(keyData),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  // Sign the token
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  // Convert DER signature to raw format
  const rawSig = derToRaw(new Uint8Array(signature));
  const signatureB64 = base64urlEncodeBuffer(rawSig);

  return {
    token: `${unsignedToken}.${signatureB64}`,
    publicKey: publicKey,
  };
}

// Encrypt payload for Web Push (aes128gcm)
async function encryptPayload(
  payload: string,
  p256dhKey: string,
  authSecret: string
): Promise<ArrayBuffer> {
  const payloadBytes = new TextEncoder().encode(payload);

  // Decode subscription keys
  const userPublicKeyBuf = base64urlDecode(p256dhKey);
  const userPublicKeyBytes = new Uint8Array(userPublicKeyBuf);
  const userAuth = base64urlDecode(authSecret);

  // Generate ephemeral ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  // Export public key
  const localPublicKeyRaw = await crypto.subtle.exportKey("raw", localKeyPair.publicKey);
  const localPublicKeyBytes = new Uint8Array(localPublicKeyRaw);

  // Import user's public key
  const userKey = await crypto.subtle.importKey(
    "raw",
    userPublicKeyBuf,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // Derive shared secret
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: "ECDH", public: userKey },
    localKeyPair.privateKey,
    256
  );

  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // HKDF to derive IKM from shared secret and auth
  const authInfo = new TextEncoder().encode("WebPush: info\0");
  const authInfoFull = new Uint8Array(authInfo.length + userPublicKeyBytes.length + localPublicKeyBytes.length);
  authInfoFull.set(authInfo);
  authInfoFull.set(userPublicKeyBytes, authInfo.length);
  authInfoFull.set(localPublicKeyBytes, authInfo.length + userPublicKeyBytes.length);

  const ikmKey = await crypto.subtle.importKey("raw", sharedSecret, { name: "HKDF" }, false, ["deriveBits"]);
  const ikm = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(userAuth), info: authInfoFull },
    ikmKey,
    256
  );

  // Derive content encryption key
  const cekInfo = new TextEncoder().encode("Content-Encoding: aes128gcm\0");
  const cekKey = await crypto.subtle.importKey("raw", ikm, { name: "HKDF" }, false, ["deriveBits"]);
  const cek = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info: cekInfo },
    cekKey,
    128
  );

  // Derive nonce
  const nonceInfo = new TextEncoder().encode("Content-Encoding: nonce\0");
  const nonceKey = await crypto.subtle.importKey("raw", ikm, { name: "HKDF" }, false, ["deriveBits"]);
  const nonce = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info: nonceInfo },
    nonceKey,
    96
  );

  // Pad the payload (add delimiter byte 0x02)
  const paddedPayload = new Uint8Array(payloadBytes.length + 1);
  paddedPayload.set(payloadBytes);
  paddedPayload[payloadBytes.length] = 2; // Delimiter

  // Encrypt with AES-128-GCM
  const encryptionKey = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: new Uint8Array(nonce), tagLength: 128 },
    encryptionKey,
    paddedPayload
  );

  // Build aes128gcm header: salt (16) + rs (4) + idlen (1) + keyid (65)
  const recordSize = 4096;
  const header = new Uint8Array(16 + 4 + 1 + localPublicKeyBytes.length);
  header.set(salt);
  new DataView(header.buffer).setUint32(16, recordSize);
  header[20] = localPublicKeyBytes.length;
  header.set(localPublicKeyBytes, 21);

  // Combine header + encrypted data
  const result = new Uint8Array(header.length + encrypted.byteLength);
  result.set(header);
  result.set(new Uint8Array(encrypted), header.length);

  return result.buffer;
}

// ============ BASE64URL HELPERS ============

function base64urlEncode(str: string): string {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlEncodeBuffer(buffer: Uint8Array): string {
  let str = "";
  for (const byte of buffer) {
    str += String.fromCharCode(byte);
  }
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(str: string): ArrayBuffer {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (padded.length % 4)) % 4);
  const binary = atob(padded + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Convert raw EC private key (32 bytes) to PKCS8 format
function convertECPrivateKey(rawKey: ArrayBuffer): ArrayBuffer {
  const rawBytes = new Uint8Array(rawKey);
  // PKCS8 header for EC P-256 private key
  const header = new Uint8Array([
    0x30, 0x81, 0x87, 0x02, 0x01, 0x00, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86,
    0x48, 0xce, 0x3d, 0x02, 0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d,
    0x03, 0x01, 0x07, 0x04, 0x6d, 0x30, 0x6b, 0x02, 0x01, 0x01, 0x04, 0x20,
  ]);
  const result = new Uint8Array(header.length + rawBytes.length);
  result.set(header);
  result.set(rawBytes, header.length);
  return result.buffer;
}

// Convert DER-encoded ECDSA signature to raw format (r || s)
function derToRaw(der: Uint8Array): Uint8Array {
  // DER format: 0x30 len 0x02 rLen r 0x02 sLen s
  const raw = new Uint8Array(64);
  let offset = 2; // skip 0x30 and length

  // Read r
  offset++; // skip 0x02
  const rLen = der[offset++];
  const rStart = rLen > 32 ? offset + (rLen - 32) : offset;
  const rDest = rLen > 32 ? 0 : 32 - rLen;
  raw.set(der.slice(rStart, offset + rLen).slice(0, 32), rDest);
  offset += rLen;

  // Read s
  offset++; // skip 0x02
  const sLen = der[offset++];
  const sStart = sLen > 32 ? offset + (sLen - 32) : offset;
  const sDest = sLen > 32 ? 32 : 32 + (32 - sLen);
  raw.set(der.slice(sStart, offset + sLen).slice(0, 32), sDest);

  return raw;
}
