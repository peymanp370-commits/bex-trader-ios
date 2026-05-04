// BEX Push Worker + D1 + Preference
// Routes:
// GET  /health
// POST /subscribe
// POST /preference
// POST /send
// POST /send-test

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);

      if (request.method === "OPTIONS") {
        return cors(new Response(null, { status: 204 }));
      }

      if (url.pathname === "/health") {
        return json({
          ok: true,
          worker: "bex-push",
          version: "v3-strong-preference",
          strong_min_confidence: 70,
          hasDB: !!env.DB,
          hasVAPID_PUBLIC_KEY: !!env.VAPID_PUBLIC_KEY,
          hasVAPID_PRIVATE_KEY: !!env.VAPID_PRIVATE_KEY,
          now: Date.now()
        });
      }

      if (url.pathname === "/subscribe" && request.method === "POST") {
        return await subscribe(request, env);
      }

      if (url.pathname === "/preference" && request.method === "POST") {
        return await updatePreference(request, env);
      }

      if (url.pathname === "/send" && request.method === "POST") {
        return await sendPush(request, env);
      }

      if (url.pathname === "/send-test" && request.method === "POST") {
        return await sendPush(new Request(request.url, {
          method: "POST",
          headers: request.headers,
          body: JSON.stringify({
            title: "BEX Test Signal",
            body: "Push notification is working ✅",
            url: "/app",
            symbol: "XAUUSD",
            side: "BUY",
            confidence: 75,
            tag: "bex-test"
          })
        }), env);
      }

      return json({ ok: false, error: "not_found" }, 404);
    } catch (e) {
      return json({
        ok: false,
        error: e.message || String(e),
        stack: e.stack || null
      }, 500);
    }
  }
};

function cors(res) {
  const h = new Headers(res.headers);
  h.set("Access-Control-Allow-Origin", "https://bextrader.com");
  h.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  h.set("Access-Control-Allow-Headers", "Content-Type,Authorization");
  return new Response(res.body, { status: res.status, headers: h });
}

function json(data, status = 200) {
  return cors(new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json" }
  }));
}

function normalizePreference(v) {
  const x = String(v || "instant").trim().toLowerCase();

  if (["instant", "strong", "off"].includes(x)) return x;

  if (x === "لحظه‌ای" || x === "لحظه اي" || x === "lahzei") return "instant";
  if (x === "فقط سیگنال‌های قوی" || x === "فقط سیگنال های قوی" || x === "strong signals only") return "strong";
  if (x === "خاموش") return "off";

  return "instant";
}

async function ensureTable(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      endpoint TEXT PRIMARY KEY,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      preference TEXT NOT NULL DEFAULT 'instant',
      user_agent TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `).run();

  try {
    await env.DB.prepare(`
      ALTER TABLE push_subscriptions ADD COLUMN preference TEXT NOT NULL DEFAULT 'instant'
    `).run();
  } catch (_) {}
}

async function subscribe(request, env) {
  if (!env.DB) return json({ ok: false, error: "Missing DB binding" }, 500);

  await ensureTable(env);

  const body = await request.json();
  const sub = body.subscription || body;
  const preference = normalizePreference(body.preference || body.notificationPreference || "instant");

  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    return json({ ok: false, error: "Invalid subscription" }, 400);
  }

  const now = Date.now();
  const ua = request.headers.get("user-agent") || "";

  await env.DB.prepare(`
    INSERT INTO push_subscriptions
      (endpoint, p256dh, auth, preference, user_agent, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(endpoint) DO UPDATE SET
      p256dh = excluded.p256dh,
      auth = excluded.auth,
      preference = excluded.preference,
      user_agent = excluded.user_agent,
      updated_at = excluded.updated_at
  `).bind(
    sub.endpoint,
    sub.keys.p256dh,
    sub.keys.auth,
    preference,
    ua,
    now,
    now
  ).run();

  return json({ ok: true, subscribed: true, preference });
}

async function updatePreference(request, env) {
  if (!env.DB) return json({ ok: false, error: "Missing DB binding" }, 500);

  await ensureTable(env);

  const body = await request.json();
  const endpoint = body.endpoint;
  const preference = normalizePreference(body.preference);

  if (!endpoint) {
    return json({ ok: false, error: "Missing endpoint" }, 400);
  }

  const r = await env.DB.prepare(`
    UPDATE push_subscriptions
    SET preference = ?, updated_at = ?
    WHERE endpoint = ?
  `).bind(preference, Date.now(), endpoint).run();

  return json({
    ok: true,
    preference,
    changed: r.meta?.changes || 0
  });
}

async function sendPush(request, env) {
  if (!env.DB) return json({ ok: false, error: "Missing DB binding" }, 500);

  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
    return json({ ok: false, error: "Missing VAPID secrets" }, 500);
  }

  await ensureTable(env);

  const body = await request.json().catch(() => ({}));
  const confidence = Number(body.confidence || body.final_confidence || 0);
  const strongMinConfidence = Number(env.STRONG_MIN_CONFIDENCE || 70);

  const payload = JSON.stringify({
    title: body.title || "BEX Signal",
    body: body.body || "New trading signal is ready.",
    url: body.url || "/app",
    signal_id: body.signal_id || null,
    symbol: body.symbol || null,
    side: body.side || null,
    entry: body.entry || null,
    sl: body.sl || null,
    tp: body.tp || null,
    confidence: body.confidence || body.final_confidence || null,
    tag: body.tag || body.signal_id || "bex-signal"
  });

  const rows = await env.DB.prepare(`
    SELECT endpoint, p256dh, auth, preference
    FROM push_subscriptions
    WHERE preference IN ('instant', 'strong')
    ORDER BY updated_at DESC
    LIMIT 500
  `).all();

  const subs = rows.results || [];

  let sent = 0;
  let failed = 0;
  let removed = 0;
  let skipped_strong = 0;
  const errors = [];

  for (const s of subs) {
    if (s.preference === "strong" && confidence < strongMinConfidence) {
      skipped_strong++;
      continue;
    }

    const r = await sendWebPush({
      endpoint: s.endpoint,
      keys: {
        p256dh: s.p256dh,
        auth: s.auth
      }
    }, payload, env);

    if (r.ok) {
      sent++;
    } else {
      failed++;
      errors.push({
        endpoint: s.endpoint.slice(0, 80) + "...",
        preference: s.preference,
        status: r.status,
        error: r.error
      });

      if (r.status === 404 || r.status === 410) {
        await env.DB.prepare(`
          DELETE FROM push_subscriptions WHERE endpoint = ?
        `).bind(s.endpoint).run();

        removed++;
      }
    }
  }

  return json({
    ok: true,
    mode: "instant_plus_strong",
    confidence,
    strongMinConfidence,
    total: subs.length,
    sent,
    failed,
    removed,
    skipped_strong,
    errors: errors.slice(0, 10)
  });
}

async function sendWebPush(subscription, payload, env) {
  try {
    const endpoint = subscription.endpoint;
    const aud = new URL(endpoint).origin;
    const exp = Math.floor(Date.now() / 1000) + 12 * 60 * 60;

    const publicKey = env.VAPID_PUBLIC_KEY.trim();
    const privateKey = env.VAPID_PRIVATE_KEY.trim();

    const jwt = await createVapidJWT(
      aud,
      exp,
      "mailto:support@bextrader.com",
      publicKey,
      privateKey
    );

    const encrypted = await encryptPayload(
      payload,
      subscription.keys.p256dh,
      subscription.keys.auth
    );

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        TTL: "2419200",
        Urgency: "high",
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        Authorization: `vapid t=${jwt}, k=${publicKey}`
      },
      body: encrypted
    });

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: await res.text().catch(() => res.statusText)
      };
    }

    return { ok: true, status: res.status };
  } catch (e) {
    return { ok: false, status: 0, error: e.message || String(e) };
  }
}

async function createVapidJWT(aud, exp, sub, publicKey, privateKey) {
  const header = { typ: "JWT", alg: "ES256" };
  const payload = { aud, exp, sub };

  const unsigned =
    base64url(JSON.stringify(header)) + "." + base64url(JSON.stringify(payload));

  const key = await crypto.subtle.importKey(
    "jwk",
    vapidPrivateKeyToJwk(privateKey, publicKey),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const sig = new Uint8Array(await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(unsigned)
  ));

  return unsigned + "." + base64urlBytes(sig);
}

function vapidPrivateKeyToJwk(privateKey, publicKey) {
  const pub = base64urlToBytes(publicKey);
  const priv = base64urlToBytes(privateKey);

  if (pub.length !== 65 || pub[0] !== 4) {
    throw new Error("Invalid VAPID public key");
  }

  if (priv.length !== 32) {
    throw new Error("Invalid VAPID private key");
  }

  return {
    kty: "EC",
    crv: "P-256",
    alg: "ES256",
    ext: true,
    key_ops: ["sign"],
    x: base64urlBytes(pub.slice(1, 33)),
    y: base64urlBytes(pub.slice(33, 65)),
    d: base64urlBytes(priv)
  };
}

async function encryptPayload(payload, userPublicKey, userAuth) {
  const userPub = base64urlToBytes(userPublicKey);
  const authSecret = base64urlToBytes(userAuth);

  const localKeys = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  const localPublicKey = new Uint8Array(
    await crypto.subtle.exportKey("raw", localKeys.publicKey)
  );

  const remoteKey = await crypto.subtle.importKey(
    "raw",
    userPub,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  const sharedSecret = new Uint8Array(await crypto.subtle.deriveBits(
    { name: "ECDH", public: remoteKey },
    localKeys.privateKey,
    256
  ));

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prk = await hkdfExtract(authSecret, sharedSecret);

  const info = concat(
    str("WebPush: info\0"),
    userPub,
    localPublicKey
  );

  const ikm = await hkdfExpand(prk, info, 32);
  const prk2 = await hkdfExtract(salt, ikm);

  const cek = await hkdfExpand(prk2, str("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdfExpand(prk2, str("Content-Encoding: nonce\0"), 12);

  const plaintext = concat(str(payload), new Uint8Array([0x02]));

  const aesKey = await crypto.subtle.importKey(
    "raw",
    cek,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce, tagLength: 128 },
    aesKey,
    plaintext
  ));

  return concat(
    salt,
    uint32(4096),
    new Uint8Array([localPublicKey.length]),
    localPublicKey,
    ciphertext
  );
}

async function hkdfExtract(salt, ikm) {
  const key = await crypto.subtle.importKey(
    "raw",
    salt,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  return new Uint8Array(await crypto.subtle.sign("HMAC", key, ikm));
}

async function hkdfExpand(prk, info, len) {
  const key = await crypto.subtle.importKey(
    "raw",
    prk,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  let prev = new Uint8Array(0);
  let out = new Uint8Array(0);
  let counter = 1;

  while (out.length < len) {
    prev = new Uint8Array(await crypto.subtle.sign(
      "HMAC",
      key,
      concat(prev, info, new Uint8Array([counter++]))
    ));

    out = concat(out, prev);
  }

  return out.slice(0, len);
}

function str(s) {
  return new TextEncoder().encode(s);
}

function concat(...arrs) {
  const total = arrs.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;

  for (const a of arrs) {
    out.set(a, offset);
    offset += a.length;
  }

  return out;
}

function uint32(n) {
  return new Uint8Array([
    (n >>> 24) & 255,
    (n >>> 16) & 255,
    (n >>> 8) & 255,
    n & 255
  ]);
}

function base64url(input) {
  return base64urlBytes(str(input));
}

function base64urlBytes(bytes) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);

  return btoa(bin)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64urlToBytes(s) {
  s = String(s || "").trim().replace(/-/g, "+").replace(/_/g, "/");

  while (s.length % 4) s += "=";

  const bin = atob(s);
  const out = new Uint8Array(bin.length);

  for (let i = 0; i < bin.length; i++) {
    out[i] = bin.charCodeAt(i);
  }

  return out;
}