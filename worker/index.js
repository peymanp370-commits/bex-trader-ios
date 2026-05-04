import { SignJWT, importPKCS8, createRemoteJWKSet, jwtVerify } from "jose";

let APPLE_JWKS_CACHE = null;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    try {
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders(request) });
      }

      if (!env.DB) {
        return fail(request, 500, "SERVER_CONFIG_ERROR", "Missing DB binding");
      }

      await ensureTables(env.DB);

      if (url.pathname === "/health" || url.pathname === "/status") {
        return ok(request, {
          worker: "bex-auth-worker-v2",
          hasDB: !!env.DB,
          now: Date.now(),
          oauth: {
            google: {
              configured: isGoogleConfigured(env),
              has_client_id: !!env.GOOGLE_CLIENT_ID,
              has_client_secret: !!env.GOOGLE_CLIENT_SECRET,
              has_redirect_uri: !!env.GOOGLE_REDIRECT_URI
            },
            apple: {
              configured: isAppleConfigured(env),
              has_client_id: !!env.APPLE_CLIENT_ID,
              has_team_id: !!env.APPLE_TEAM_ID,
              has_key_id: !!env.APPLE_KEY_ID,
              has_private_key: !!env.APPLE_PRIVATE_KEY,
              has_redirect_uri: !!env.APPLE_REDIRECT_URI
            }
          },
          endpoints: [
            "/health",
            "POST /auth/register",
            "POST /auth/login",
            "POST /auth/forgot-password",
            "POST /auth/reset-password",
            "POST /auth/refresh",
            "POST /auth/logout",
            "POST /auth/logout-all",
            "GET /auth/me",
            "GET /api/me",
            "GET /api/me/vip",
            "POST /api/me/mt5-account",
            "GET /api/me/trades",
            "GET /api/me/stats",
            "GET /api/admin/customers",
            "POST /api/admin/customer/upgrade-vip",
            "POST /api/admin/customer/disable-token",
            "POST /api/billing/create-checkout-session",
            "POST /api/billing/stripe-webhook",
            "GET /auth/google/start",
            "GET /auth/google/callback",
            "GET /auth/apple/start",
            "POST /auth/apple/callback"
          ],
          cookie: {
            domain: resolveCookieDomain(request, env),
            same_site: resolveSameSite(request, env),
            secure: shouldUseSecureCookies(request, env),
            apple_temp_same_site: "None"
          }
        });
      }

      if (url.pathname === "/auth/register" && request.method === "POST") {
        const body = await readJson(request);

        const firstName = clean(body.first_name);
        const lastName = clean(body.last_name);
        const email = normalizeEmail(body.email);
        let username = normalizeUsername(body.username);
        const phone = clean(body.phone);
        const timezone = clean(body.timezone) || "UTC";
        const detectedCountry = request.cf?.country || "Unknown";
        const country = clean(body.country) || detectedCountry;
        const password = String(body.password || "");
        const confirmPassword = String(body.confirm_password || "");

        if (!firstName || !lastName || !email || !password || !confirmPassword) {
          return fail(request, 400, "MISSING_REQUIRED_FIELDS", "Missing required fields", {
            fields: ["first_name", "last_name", "email", "password", "confirm_password"]
          });
        }

        if (password !== confirmPassword) {
          return fail(request, 400, "PASSWORDS_DO_NOT_MATCH", "Passwords do not match");
        }

        if (password.length < 6) {
          return fail(request, 400, "PASSWORD_TOO_SHORT", "Password must be at least 6 characters");
        }

        const existingEmailUser = await env.DB.prepare(
          `SELECT id FROM users WHERE email = ? LIMIT 1`
        ).bind(email).first();

        if (existingEmailUser) {
          return fail(request, 409, "EMAIL_EXISTS", "Email already registered", {
            field: "email"
          });
        }

        if (!username) {
          const base = normalizeUsername(email.split("@")[0]) || "user";
          username = await makeUniqueUsername(env.DB, base);
        } else {
          const existingUsernameUser = await env.DB.prepare(
            `SELECT id FROM users WHERE username = ? LIMIT 1`
          ).bind(username).first();

          if (existingUsernameUser) {
            return fail(request, 409, "USERNAME_EXISTS", "Username already taken", {
              field: "username"
            });
          }
        }

        const now = Date.now();
        const userId = makeId("usr");
        const identityId = makeId("idt");
        const passwordHash = await hashPassword(password);

        await env.DB.batch([
          env.DB.prepare(`
            INSERT INTO users (
              id, email, username, first_name, last_name, phone, timezone, country,
              plan, status, is_verified, created_at, updated_at, last_login_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'free', 'active', 1, ?, ?, ?)
          `).bind(
            userId,
            email,
            username,
            firstName,
            lastName,
            phone || null,
            timezone,
            country,
            now,
            now,
            now
          ),
          env.DB.prepare(`
            INSERT INTO auth_identities (
              id, user_id, provider, provider_user_id, provider_email, password_hash,
              refresh_token_encrypted, created_at, updated_at
            )
            VALUES (?, ?, 'password', NULL, ?, ?, NULL, ?, ?)
          `).bind(
            identityId,
            userId,
            email,
            passwordHash,
            now,
            now
          )
        ]);

        const session = await createRefreshSession(env.DB, userId, request);

        return okWithCookies(request, {
          message: "Registration successful",
          code: "REGISTER_SUCCESS",
          user: await getSafeUser(env.DB, userId)
        }, [buildRefreshCookie(request, env, session.refreshToken)]);
      }

      if (url.pathname === "/auth/login" && request.method === "POST") {
        const body = await readJson(request);
        const identity = String(body.identity || body.email || body.username || "").trim();
        const password = String(body.password || "");

        if (!identity || !password) {
          return fail(request, 400, "LOGIN_FIELDS_REQUIRED", "Email/username and password are required");
        }

        const email = normalizeEmail(identity);
        const username = normalizeUsername(identity);

        let user = null;

        if (email) {
          user = await env.DB.prepare(`
            SELECT u.*
            FROM users u
            WHERE u.email = ?
            LIMIT 1
          `).bind(email).first();
        }

        if (!user && username) {
          user = await env.DB.prepare(`
            SELECT u.*
            FROM users u
            WHERE u.username = ?
            LIMIT 1
          `).bind(username).first();
        }

        if (!user) {
          return fail(request, 404, "USER_NOT_FOUND", "User not found");
        }

        const passwordIdentity = await env.DB.prepare(`
          SELECT *
          FROM auth_identities
          WHERE user_id = ? AND provider = 'password'
          LIMIT 1
        `).bind(user.id).first();

        if (!passwordIdentity || !passwordIdentity.password_hash) {
          return fail(
            request,
            400,
            "SOCIAL_ACCOUNT_ONLY",
            "This account uses social sign-in. Please continue with Google or Apple."
          );
        }

        const isValid = await verifyPassword(password, passwordIdentity.password_hash);

        if (!isValid) {
          return fail(request, 401, "INVALID_PASSWORD", "Invalid password");
        }

        const now = Date.now();
        await env.DB.prepare(`
          UPDATE users
          SET last_login_at = ?, updated_at = ?
          WHERE id = ?
        `).bind(now, now, user.id).run();

        const session = await createRefreshSession(env.DB, user.id, request);

        return okWithCookies(request, {
          message: "Login successful",
          code: "LOGIN_SUCCESS",
          user: await getSafeUser(env.DB, user.id)
        }, [buildRefreshCookie(request, env, session.refreshToken)]);
      }

      if (url.pathname === "/auth/refresh" && request.method === "POST") {
        const refreshToken = getCookie(request, "refresh_token");

        if (!refreshToken) {
          return fail(request, 401, "REFRESH_TOKEN_MISSING", "Refresh token missing");
        }

        const refreshHash = await sha256(refreshToken);
        const now = Date.now();

        const currentSession = await env.DB.prepare(`
          SELECT *
          FROM auth_sessions
          WHERE refresh_token_hash = ?
            AND revoked_at IS NULL
            AND expires_at > ?
          LIMIT 1
        `).bind(refreshHash, now).first();

        if (!currentSession) {
          return fail(request, 401, "INVALID_REFRESH_TOKEN", "Invalid refresh token");
        }

        await env.DB.prepare(`
          UPDATE auth_sessions
          SET revoked_at = ?
          WHERE id = ?
        `).bind(now, currentSession.id).run();

        const rotated = await createRefreshSession(env.DB, currentSession.user_id, request, currentSession.id);

        return okWithCookies(request, {
          message: "Session refreshed",
          code: "REFRESH_SUCCESS",
          user: await getSafeUser(env.DB, currentSession.user_id)
        }, [buildRefreshCookie(request, env, rotated.refreshToken)]);
      }

      if (url.pathname === "/auth/logout" && request.method === "POST") {
        const refreshToken = getCookie(request, "refresh_token");

        if (refreshToken) {
          const refreshHash = await sha256(refreshToken);
          await env.DB.prepare(`
            UPDATE auth_sessions
            SET revoked_at = ?
            WHERE refresh_token_hash = ? AND revoked_at IS NULL
          `).bind(Date.now(), refreshHash).run();
        }

        return okWithCookies(request, {
          message: "Logged out",
          code: "LOGOUT_SUCCESS"
        }, [clearRefreshCookie(request, env)]);
      }

      if (url.pathname === "/auth/logout-all" && request.method === "POST") {
        const user = await requireUserByRefreshSession(env.DB, request);
        if (!user.ok) return user.response;

        await env.DB.prepare(`
          UPDATE auth_sessions
          SET revoked_at = ?
          WHERE user_id = ? AND revoked_at IS NULL
        `).bind(Date.now(), user.user.id).run();

        return okWithCookies(request, {
          message: "Logged out from all sessions",
          code: "LOGOUT_ALL_SUCCESS"
        }, [clearRefreshCookie(request, env)]);
      }

      if (url.pathname === "/auth/me" && request.method === "GET") {
        const user = await requireUserByRefreshSession(env.DB, request);
        if (!user.ok) return user.response;

        return ok(request, {
          user: user.user
        });
      }

      if (url.pathname === "/api/me" && request.method === "GET") {
        const user = await requireUserByRefreshSession(env.DB, request);
        if (!user.ok) return user.response;
        return ok(request, { user: user.user });
      }

      if (url.pathname === "/api/me/vip" && request.method === "GET") {
        const user = await requireUserByRefreshSession(env.DB, request);
        if (!user.ok) return user.response;
        const vip = await getVipProfile(env, user.user.id);
        return ok(request, vip);
      }

      if (url.pathname === "/api/me/mt5-account" && request.method === "POST") {
        const user = await requireUserByRefreshSession(env.DB, request);
        if (!user.ok) return user.response;
        const body = await readJson(request);
        const loginId = clean(body.login_id || body.mt5_account_login || body.account_login);
        const server = clean(body.server || body.broker_server || "");
        if (!loginId) return fail(request, 400, "MISSING_MT5_LOGIN", "MT5 account login is required");
        if (!server) return fail(request, 400, "MISSING_MT5_SERVER", "Broker server is required");
        const saved = await saveUserMt5Account(env, user.user, { loginId, server });
        return ok(request, saved);
      }

      if (url.pathname === "/api/me/trades" && request.method === "GET") {
        const user = await requireUserByRefreshSession(env.DB, request);
        if (!user.ok) return user.response;
        const limit = clampInt(url.searchParams.get("limit"), 50, 1, 100);
        const result = await getMyTrades(env, user.user, limit);
        return ok(request, result);
      }

      if (url.pathname === "/api/me/stats" && request.method === "GET") {
        const user = await requireUserByRefreshSession(env.DB, request);
        if (!user.ok) return user.response;
        const result = await getMyStats(env, user.user);
        return ok(request, result);
      }

      if (url.pathname === "/api/admin/customers" && request.method === "GET") {
        const user = await requireUserByRefreshSession(env.DB, request);
        if (!user.ok) return user.response;
        if (!isAdminUser(user.user)) return fail(request, 403, "ADMIN_ONLY", "Admin access required");
        const result = await getAdminCustomers(env, url);
        return ok(request, result);
      }

      if (url.pathname === "/api/admin/customer/upgrade-vip" && request.method === "POST") {
        const user = await requireUserByRefreshSession(env.DB, request);
        if (!user.ok) return user.response;
        if (!isAdminUser(user.user)) return fail(request, 403, "ADMIN_ONLY", "Admin access required");
        const body = await readJson(request);
        const result = await adminUpgradeVip(env, body);
        return ok(request, result);
      }

      if (url.pathname === "/api/admin/customer/disable-token" && request.method === "POST") {
        const user = await requireUserByRefreshSession(env.DB, request);
        if (!user.ok) return user.response;
        if (!isAdminUser(user.user)) return fail(request, 403, "ADMIN_ONLY", "Admin access required");
        const body = await readJson(request);
        const token = clean(body.token);
        const email = normalizeEmail(body.email);
        if (!token && !email) return fail(request, 400, "MISSING_TOKEN_OR_EMAIL", "token or email is required");
        const now = Date.now();
        let rs;
        if (token) {
          rs = await env.DB.prepare(`UPDATE vip_tokens SET active = 0, last_seen_at = ? WHERE token = ?`).bind(now, token).run();
        } else {
          rs = await env.DB.prepare(`UPDATE vip_tokens SET active = 0, last_seen_at = ? WHERE email = ?`).bind(now, email).run();
        }
        return ok(request, { disabled: rs?.meta?.changes || 0 });
      }



      if (url.pathname === "/api/billing/create-checkout-session" && request.method === "POST") {
        const user = await requireUserByRefreshSession(env.DB, request);
        if (!user.ok) return user.response;
        const body = await readJson(request);
        const result = await createStripeCheckoutSession(env, request, user.user, body);
        return ok(request, result);
      }

      if (url.pathname === "/api/billing/stripe-webhook" && request.method === "POST") {
        const result = await handleStripeWebhook(request, env);
        return ok(request, result);
      }

      if (url.pathname === "/auth/google/start" && request.method === "GET") {
        const missingGoogle = getMissingGoogleEnv(env);
        if (missingGoogle.length > 0) {
          return fail(request, 500, "GOOGLE_NOT_CONFIGURED", "Google OAuth is not configured", {
            missing: missingGoogle
          });
        }

        const state = crypto.randomUUID();
        const stateCookie = buildTempCookie(request, env, "oauth_google_state", state, 600);

        const googleUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
        googleUrl.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
        googleUrl.searchParams.set("redirect_uri", env.GOOGLE_REDIRECT_URI);
        googleUrl.searchParams.set("response_type", "code");
        googleUrl.searchParams.set("scope", "openid email profile");
        googleUrl.searchParams.set("access_type", "offline");
        googleUrl.searchParams.set("prompt", "select_account");
        googleUrl.searchParams.set("state", state);

        return redirectWithCookies(request, googleUrl.toString(), [stateCookie]);
      }

      if (url.pathname === "/auth/google/callback" && request.method === "GET") {
        if (!isGoogleConfigured(env)) {
          return redirectToAppError(env, "GOOGLE_NOT_CONFIGURED");
        }

        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const storedState = getCookie(request, "oauth_google_state");

        if (!code) {
          return redirectToAppError(env, "GOOGLE_CODE_MISSING");
        }

        if (!state || !storedState || state !== storedState) {
          return redirectToAppError(env, "GOOGLE_STATE_INVALID");
        }

        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code,
            client_id: env.GOOGLE_CLIENT_ID,
            client_secret: env.GOOGLE_CLIENT_SECRET,
            redirect_uri: env.GOOGLE_REDIRECT_URI,
            grant_type: "authorization_code"
          }).toString()
        });

        const tokenData = await tokenRes.json();

        if (!tokenRes.ok || !tokenData.access_token) {
          return redirectToAppError(env, "GOOGLE_TOKEN_EXCHANGE_FAILED");
        }

        const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`
          }
        });

        const profile = await profileRes.json();

        if (!profileRes.ok || !profile?.email || !profile?.id) {
          return redirectToAppError(env, "GOOGLE_PROFILE_FAILED");
        }

        const linked = await findOrCreateSocialUser(env.DB, {
          provider: "google",
          providerUserId: String(profile.id),
          providerEmail: normalizeEmail(profile.email),
          firstName: clean(profile.given_name) || "Google",
          lastName: clean(profile.family_name) || "User",
          emailVerified: true,
          usernameBase:
            normalizeUsername(profile.email?.split("@")[0]) ||
            normalizeUsername(profile.name) ||
            "google_user",
          country: request.cf?.country || "Unknown",
          timezone: "UTC"
        });

        const session = await createRefreshSession(env.DB, linked.userId, request);

        return redirectWithCookies(
          request,
          `${getAppRedirectUrl(env)}?auth=success`,
          [
            buildRefreshCookie(request, env, session.refreshToken),
            clearTempCookie(request, env, "oauth_google_state")
          ]
        );
      }

      if (url.pathname === "/auth/apple/start" && request.method === "GET") {
        if (!env.APPLE_CLIENT_ID || !env.APPLE_REDIRECT_URI) {
          return fail(request, 500, "APPLE_NOT_CONFIGURED", "Apple Sign In is not configured", {
            missing: getMissingAppleEnv(env, true)
          });
        }

        const state = crypto.randomUUID();
        const nonce = crypto.randomUUID();

        const cookies = [
          buildTempCookie(request, env, "oauth_apple_state", state, 600, { sameSite: "None" }),
          buildTempCookie(request, env, "oauth_apple_nonce", nonce, 600, { sameSite: "None" })
        ];

        const appleUrl = new URL("https://appleid.apple.com/auth/authorize");
        appleUrl.searchParams.set("response_type", "code id_token");
        appleUrl.searchParams.set("response_mode", "form_post");
        appleUrl.searchParams.set("client_id", env.APPLE_CLIENT_ID);
        appleUrl.searchParams.set("redirect_uri", env.APPLE_REDIRECT_URI);
        appleUrl.searchParams.set("scope", "name email");
        appleUrl.searchParams.set("state", state);
        appleUrl.searchParams.set("nonce", nonce);

        return redirectWithCookies(request, appleUrl.toString(), cookies);
      }

      if (url.pathname === "/auth/apple/callback" && request.method === "POST") {
        if (!isAppleConfigured(env)) {
          return redirectToAppError(env, "APPLE_NOT_CONFIGURED");
        }

        const form = await request.formData();
        const code = String(form.get("code") || "");
        const idTokenFromPost = String(form.get("id_token") || "");
        const state = String(form.get("state") || "");
        const rawUser = String(form.get("user") || "");

        const storedState = getCookie(request, "oauth_apple_state");
        const storedNonce = getCookie(request, "oauth_apple_nonce");

        if (!code) {
          return redirectToAppError(env, "APPLE_CALLBACK_MISSING_CODE");
        }

        if (!state || !storedState || state !== storedState) {
          return redirectToAppError(env, "APPLE_STATE_INVALID");
        }

        let clientSecret;
        try {
          clientSecret = await makeAppleClientSecret(env);
        } catch (err) {
          return fail(request, 500, "APPLE_PRIVATE_KEY_INVALID", err?.message || "Invalid Apple private key", {
            detail: diagnoseApplePrivateKey(env.APPLE_PRIVATE_KEY)
          });
        }

        const tokenRes = await fetch("https://appleid.apple.com/auth/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            code,
            client_id: env.APPLE_CLIENT_ID,
            client_secret: clientSecret,
            redirect_uri: env.APPLE_REDIRECT_URI
          }).toString()
        });

        const tokenData = await tokenRes.json();

        if (!tokenRes.ok || !tokenData.id_token) {
          return redirectToAppError(env, "APPLE_TOKEN_EXCHANGE_FAILED");
        }

        let claims;
        try {
          claims = await verifyAppleIdToken(
            tokenData.id_token || idTokenFromPost,
            env,
            storedNonce || null
          );
        } catch (err) {
          return redirectToAppError(env, err.code || "APPLE_ID_TOKEN_INVALID");
        }

        let submittedUser = null;
        try {
          submittedUser = rawUser ? JSON.parse(rawUser) : null;
        } catch {
          submittedUser = null;
        }

        const email = normalizeEmail(claims.email);
        const firstName = clean(submittedUser?.name?.firstName) || "Apple";
        const lastName = clean(submittedUser?.name?.lastName) || "User";

        const linked = await findOrCreateSocialUser(env.DB, {
          provider: "apple",
          providerUserId: String(claims.sub),
          providerEmail: email,
          firstName,
          lastName,
          emailVerified: claims.email_verified === true || claims.email_verified === "true",
          usernameBase:
            normalizeUsername(email?.split("@")[0]) ||
            normalizeUsername(`${firstName}_${lastName}`) ||
            "apple_user",
          country: request.cf?.country || "Unknown",
          timezone: "UTC",
          providerRefreshToken: tokenData.refresh_token || null
        });

        const session = await createRefreshSession(env.DB, linked.userId, request);

        return redirectWithCookies(
          request,
          `${getAppRedirectUrl(env)}?auth=success`,
          [
            buildRefreshCookie(request, env, session.refreshToken),
            clearTempCookie(request, env, "oauth_apple_state", { sameSite: "None" }),
            clearTempCookie(request, env, "oauth_apple_nonce", { sameSite: "None" })
          ]
        );
      }


      if (url.pathname === "/auth/forgot-password" && request.method === "POST") {
        const body = await readJson(request);
        const email = normalizeEmail(body.email);

        // Do not reveal whether an email exists.
        const safeMessage = "If this email exists, a reset link has been sent.";

        if (!email) {
          return ok(request, {
            message: safeMessage,
            code: "RESET_LINK_SENT_IF_EXISTS"
          });
        }

        const user = await env.DB.prepare(`
          SELECT id, email, first_name
          FROM users
          WHERE email = ?
          LIMIT 1
        `).bind(email).first();

        if (!user) {
          return ok(request, {
            message: safeMessage,
            code: "RESET_LINK_SENT_IF_EXISTS"
          });
        }

        const passwordIdentity = await env.DB.prepare(`
          SELECT id
          FROM auth_identities
          WHERE user_id = ? AND provider = 'password'
          LIMIT 1
        `).bind(user.id).first();

        // Social-only accounts cannot reset a password, but do not expose that in the UI.
        if (!passwordIdentity) {
          return ok(request, {
            message: safeMessage,
            code: "RESET_LINK_SENT_IF_EXISTS"
          });
        }

        const now = Date.now();
        const rawToken = `${crypto.randomUUID()}.${crypto.randomUUID()}`;
        const tokenHash = await sha256(rawToken);
        const expiresAt = now + 15 * 60 * 1000;
        const resetLink = `${getAppBaseUrl(env).replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(rawToken)}`;

        await env.DB.prepare(`
          UPDATE password_resets
          SET used_at = ?
          WHERE user_id = ? AND used_at IS NULL
        `).bind(now, user.id).run();

        await env.DB.prepare(`
          INSERT INTO password_resets (id, user_id, token_hash, expires_at, used_at, created_at)
          VALUES (?, ?, ?, ?, NULL, ?)
        `).bind(
          makeId("rst"),
          user.id,
          tokenHash,
          expiresAt,
          now
        ).run();

        const emailResult = await sendPasswordResetEmail(env, {
          to: user.email,
          firstName: user.first_name || "Trader",
          resetLink
        });

        const responseBody = {
          message: safeMessage,
          code: "RESET_LINK_SENT_IF_EXISTS"
        };

        if (!emailResult.ok && env.DEBUG_RESET_LINK === "1") {
          responseBody.debug = {
            email_sent: false,
            email_error: emailResult.error,
            reset_link: resetLink
          };
        } else if (env.DEBUG_RESET_LINK === "1") {
          responseBody.debug = {
            email_sent: true,
            reset_link: resetLink
          };
        }

        return ok(request, responseBody);
      }

      if (url.pathname === "/auth/reset-password" && request.method === "POST") {
        const body = await readJson(request);
        const token = String(body.token || "").trim();
        const password = String(body.password || body.new_password || "");
        const confirmPassword = String(body.confirm_password || body.confirmPassword || password || "");

        if (!token || !password) {
          return fail(request, 400, "RESET_FIELDS_REQUIRED", "Reset token and password are required");
        }

        if (password !== confirmPassword) {
          return fail(request, 400, "PASSWORDS_DO_NOT_MATCH", "Passwords do not match");
        }

        if (password.length < 6) {
          return fail(request, 400, "PASSWORD_TOO_SHORT", "Password must be at least 6 characters");
        }

        const tokenHash = await sha256(token);
        const now = Date.now();

        const reset = await env.DB.prepare(`
          SELECT *
          FROM password_resets
          WHERE token_hash = ?
            AND used_at IS NULL
            AND expires_at > ?
          LIMIT 1
        `).bind(tokenHash, now).first();

        if (!reset) {
          return fail(request, 400, "RESET_TOKEN_INVALID", "Reset link is invalid or expired");
        }

        const newPasswordHash = await hashPassword(password);
        const existingPasswordIdentity = await env.DB.prepare(`
          SELECT id
          FROM auth_identities
          WHERE user_id = ? AND provider = 'password'
          LIMIT 1
        `).bind(reset.user_id).first();

        if (existingPasswordIdentity) {
          await env.DB.prepare(`
            UPDATE auth_identities
            SET password_hash = ?, updated_at = ?
            WHERE id = ?
          `).bind(newPasswordHash, now, existingPasswordIdentity.id).run();
        } else {
          const user = await env.DB.prepare(`
            SELECT email
            FROM users
            WHERE id = ?
            LIMIT 1
          `).bind(reset.user_id).first();

          await env.DB.prepare(`
            INSERT INTO auth_identities (
              id, user_id, provider, provider_user_id, provider_email, password_hash,
              refresh_token_encrypted, created_at, updated_at
            )
            VALUES (?, ?, 'password', NULL, ?, ?, NULL, ?, ?)
          `).bind(
            makeId("idt"),
            reset.user_id,
            user?.email || null,
            newPasswordHash,
            now,
            now
          ).run();
        }

        await env.DB.batch([
          env.DB.prepare(`
            UPDATE password_resets
            SET used_at = ?
            WHERE id = ?
          `).bind(now, reset.id),
          env.DB.prepare(`
            UPDATE auth_sessions
            SET revoked_at = ?
            WHERE user_id = ? AND revoked_at IS NULL
          `).bind(now, reset.user_id),
          env.DB.prepare(`
            UPDATE users
            SET updated_at = ?
            WHERE id = ?
          `).bind(now, reset.user_id)
        ]);

        return ok(request, {
          message: "Password reset successful",
          code: "PASSWORD_RESET_SUCCESS"
        });
      }

      return fail(request, 404, "NOT_FOUND", "Not found");
    } catch (err) {
      return fail(request, 500, "UNHANDLED_ERROR", err?.message || String(err));
    }
  }
};

function ok(request, data = {}, status = 200) {
  return new Response(JSON.stringify({ ok: true, ...data }), {
    status,
    headers: {
      ...corsHeaders(request),
      "content-type": "application/json; charset=utf-8"
    }
  });
}

function fail(request, status, code, message, extra = {}) {
  return new Response(JSON.stringify({
    ok: false,
    code,
    message,
    ...extra
  }), {
    status,
    headers: {
      ...corsHeaders(request),
      "content-type": "application/json; charset=utf-8"
    }
  });
}

function okWithCookies(request, data = {}, cookies = [], status = 200) {
  const headers = new Headers({
    ...corsHeaders(request),
    "content-type": "application/json; charset=utf-8"
  });

  for (const cookie of cookies) headers.append("set-cookie", cookie);

  return new Response(JSON.stringify({ ok: true, ...data }), {
    status,
    headers
  });
}

function redirectWithCookies(request, location, cookies = []) {
  const headers = new Headers({
    ...corsHeaders(request),
    Location: location
  });

  for (const cookie of cookies) headers.append("set-cookie", cookie);

  return new Response(null, {
    status: 302,
    headers
  });
}

function redirectToAppError(env, code) {
  return Response.redirect(
    `${getAppRedirectUrl(env).replace(/\/$/, "")}/login?error=${encodeURIComponent(code)}`,
    302
  );
}

function getAppRedirectUrl(env) {
  return env.APP_REDIRECT_URL || "https://bextrader.com/app";
}


function getAppBaseUrl(env) {
  const explicit = String(env.APP_BASE_URL || env.PUBLIC_APP_URL || "").trim();
  if (explicit) return explicit;

  const redirect = getAppRedirectUrl(env).replace(/\/$/, "");
  if (redirect.endsWith("/app")) return redirect.slice(0, -4) || "https://bextrader.com";
  return redirect || "https://bextrader.com";
}

async function sendPasswordResetEmail(env, input) {
  const apiKey = String(env.RESEND_API_KEY || "").trim();
  const from = String(env.EMAIL_FROM || env.RESEND_FROM || "BEX AI <support@bextrader.com>").trim();

  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY missing" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from,
        to: input.to,
        subject: "Reset your BEX AI password",
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
            <h2>Reset your password</h2>
            <p>Hi ${escapeHtml(input.firstName || "Trader")},</p>
            <p>Click the button below to reset your BEX AI password. This link expires in 15 minutes.</p>
            <p>
              <a href="${escapeHtml(input.resetLink)}" style="display:inline-block;background:#f5b400;color:#000;text-decoration:none;font-weight:bold;padding:12px 18px;border-radius:10px">
                Reset Password
              </a>
            </p>
            <p>If the button does not work, copy and paste this link into your browser:</p>
            <p>${escapeHtml(input.resetLink)}</p>
          </div>
        `
      })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data?.message || data?.error || `Resend failed: ${res.status}` };
    }

    return { ok: true, id: data?.id || null };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function isGoogleConfigured(env) {
  return !!env.GOOGLE_CLIENT_ID && !!env.GOOGLE_CLIENT_SECRET && !!env.GOOGLE_REDIRECT_URI;
}

function isAppleConfigured(env) {
  return !!env.APPLE_CLIENT_ID && !!env.APPLE_TEAM_ID && !!env.APPLE_KEY_ID && !!env.APPLE_PRIVATE_KEY && !!env.APPLE_REDIRECT_URI;
}

function getMissingGoogleEnv(env) {
  const missing = [];
  if (!env.GOOGLE_CLIENT_ID) missing.push("GOOGLE_CLIENT_ID");
  if (!env.GOOGLE_CLIENT_SECRET) missing.push("GOOGLE_CLIENT_SECRET");
  if (!env.GOOGLE_REDIRECT_URI) missing.push("GOOGLE_REDIRECT_URI");
  return missing;
}

function getMissingAppleEnv(env, startOnly = false) {
  const missing = [];
  if (!env.APPLE_CLIENT_ID) missing.push("APPLE_CLIENT_ID");
  if (!env.APPLE_REDIRECT_URI) missing.push("APPLE_REDIRECT_URI");
  if (!startOnly) {
    if (!env.APPLE_TEAM_ID) missing.push("APPLE_TEAM_ID");
    if (!env.APPLE_KEY_ID) missing.push("APPLE_KEY_ID");
    if (!env.APPLE_PRIVATE_KEY) missing.push("APPLE_PRIVATE_KEY");
  }
  return missing;
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function clean(value) {
  const s = String(value || "").trim();
  return s || null;
}

function normalizeEmail(value) {
  const s = String(value || "").trim().toLowerCase();
  if (!s || !s.includes("@")) return null;
  return s;
}

function normalizeUsername(value) {
  const s = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9._-]/g, "");
  return s || null;
}

function makeId(prefix) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

async function sha256(text) {
  const data = new TextEncoder().encode(String(text || ""));
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hashPassword(password) {
  return await sha256(password);
}

async function verifyPassword(password, hash) {
  const incomingHash = await sha256(password);
  return incomingHash === hash;
}

function getCookie(request, name) {
  const cookie = request.headers.get("cookie") || "";
  const parts = cookie.split(";").map((x) => x.trim());

  for (const part of parts) {
    const [k, ...rest] = part.split("=");
    if (k === name) return rest.join("=");
  }

  return null;
}

function isLocalRequest(request) {
  try {
    const origin = new URL(request.url);
    return origin.hostname === "localhost" || origin.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function normalizeHost(hostname) {
  return String(hostname || "").trim().toLowerCase().replace(/^\.+/, "");
}

function getRequestHostname(request) {
  try {
    return normalizeHost(new URL(request.url).hostname);
  } catch {
    return "";
  }
}

function getConfiguredCookieBaseDomain(env) {
  const raw = normalizeHost(env.COOKIE_DOMAIN || env.AUTH_COOKIE_DOMAIN || "");
  if (!raw) return "";
  return raw.startsWith(".") ? raw.slice(1) : raw;
}

function isIpHostname(hostname) {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname);
}

function resolveCookieDomain(request, env) {
  const requestHost = getRequestHostname(request);
  const configured = getConfiguredCookieBaseDomain(env);

  if (configured && requestHost && (requestHost === configured || requestHost.endsWith(`.${configured}`))) {
    return `.${configured}`;
  }

  if (!requestHost || isLocalRequest(request) || requestHost === "localhost" || isIpHostname(requestHost)) {
    return null;
  }

  if (requestHost.endsWith(".bextrader.com") || requestHost === "bextrader.com") {
    return ".bextrader.com";
  }

  return null;
}

function shouldUseSecureCookies(request, env) {
  if (isLocalRequest(request)) return false;

  const protoHeader = String(request.headers.get("x-forwarded-proto") || "").toLowerCase();
  if (protoHeader === "http") return false;

  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return !!env.COOKIE_FORCE_SECURE;
  }
}

function resolveSameSite(request, env) {
  const explicit = String(env.COOKIE_SAMESITE || "").trim().toLowerCase();
  if (explicit === "none") return "None";
  if (explicit === "strict") return "Strict";
  if (explicit === "lax") return "Lax";

  const cookieDomain = resolveCookieDomain(request, env);
  const requestHost = getRequestHostname(request);
  const appHost = (() => {
    try {
      return normalizeHost(new URL(getAppRedirectUrl(env)).hostname);
    } catch {
      return "";
    }
  })();

  if (cookieDomain && appHost) {
    const base = cookieDomain.replace(/^\./, "");
    if (requestHost && (requestHost === base || requestHost.endsWith(`.${base}`)) && (appHost === base || appHost.endsWith(`.${base}`))) {
      return "Lax";
    }
  }

  return shouldUseSecureCookies(request, env) ? "None" : "Lax";
}

function baseCookieParts(request, env, maxAge, options = {}) {
  const parts = [
    "Path=/",
    "HttpOnly",
    `Max-Age=${maxAge}`
  ];

  const sameSite = options.sameSite || resolveSameSite(request, env);
  const secure = shouldUseSecureCookies(request, env);
  const domain = resolveCookieDomain(request, env);

  if (domain) parts.push(`Domain=${domain}`);
  parts.push(`SameSite=${sameSite}`);
  if (secure || sameSite === "None") parts.push("Secure");

  return parts;
}

function buildRefreshCookie(request, env, token) {
  return [
    `refresh_token=${token}`,
    ...baseCookieParts(request, env, 60 * 60 * 24 * 30)
  ].join("; ");
}

function clearRefreshCookie(request, env) {
  return [
    "refresh_token=",
    ...baseCookieParts(request, env, 0)
  ].join("; ");
}

function buildTempCookie(request, env, name, value, maxAge, options = {}) {
  return [
    `${name}=${value}`,
    ...baseCookieParts(request, env, maxAge, options)
  ].join("; ");
}

function clearTempCookie(request, env, name, options = {}) {
  return [
    `${name}=`,
    ...baseCookieParts(request, env, 0, options)
  ].join("; ");
}

function corsHeaders(request) {
  const origin = request?.headers?.get("Origin") || "";
  const allowed = [
    "https://bextrader.com",
    "https://www.bextrader.com",
    "https://auth.bextrader.com",
    "http://localhost:3000",
    "http://127.0.0.1:3000"
  ];

  const finalOrigin = allowed.includes(origin) ? origin : allowed[0];

  return {
    "Access-Control-Allow-Origin": finalOrigin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin"
  };
}

async function createRefreshSession(db, userId, request, rotatedFromSessionId = null) {
  const rawToken = `${crypto.randomUUID()}.${crypto.randomUUID()}`;
  const refreshHash = await sha256(rawToken);
  const now = Date.now();
  const expiresAt = now + 30 * 24 * 60 * 60 * 1000;

  const userAgent = request.headers.get("user-agent") || null;
  const ip = request.headers.get("cf-connecting-ip") || null;

  const sessionId = makeId("ses");

  await db.prepare(`
    INSERT INTO auth_sessions (
      id, user_id, refresh_token_hash, expires_at, revoked_at,
      user_agent, ip, created_at, rotated_from_session_id
    )
    VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?)
  `).bind(
    sessionId,
    userId,
    refreshHash,
    expiresAt,
    userAgent,
    ip,
    now,
    rotatedFromSessionId
  ).run();

  return {
    sessionId,
    refreshToken: rawToken
  };
}

async function requireUserByRefreshSession(db, request) {
  const refreshToken = getCookie(request, "refresh_token");
  if (!refreshToken) {
    return {
      ok: false,
      response: fail(request, 401, "UNAUTHORIZED", "Unauthorized")
    };
  }

  const refreshHash = await sha256(refreshToken);
  const now = Date.now();

  const row = await db.prepare(`
    SELECT
      s.id AS session_id,
      u.id,
      u.email,
      u.username,
      u.first_name,
      u.last_name,
      u.phone,
      u.timezone,
      u.country,
      u.plan,
      u.role,
      u.status,
      u.is_verified,
      u.created_at,
      u.updated_at,
      u.last_login_at
    FROM auth_sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.refresh_token_hash = ?
      AND s.revoked_at IS NULL
      AND s.expires_at > ?
    LIMIT 1
  `).bind(refreshHash, now).first();

  if (!row) {
    return {
      ok: false,
      response: fail(request, 401, "UNAUTHORIZED", "Unauthorized")
    };
  }

  return {
    ok: true,
    user: {
      id: row.id,
      email: row.email,
      username: row.username,
      first_name: row.first_name,
      last_name: row.last_name,
      phone: row.phone,
      timezone: row.timezone,
      country: row.country,
      plan: row.plan,
      role: row.role || "customer",
      status: row.status,
      is_verified: !!row.is_verified,
      created_at: row.created_at,
      updated_at: row.updated_at,
      last_login_at: row.last_login_at
    }
  };
}

async function getSafeUser(db, userId) {
  return await db.prepare(`
    SELECT
      id, email, username, first_name, last_name, phone, timezone,
      country, plan, role, status, is_verified, created_at, updated_at, last_login_at
    FROM users
    WHERE id = ?
    LIMIT 1
  `).bind(userId).first();
}

async function findOrCreateSocialUser(db, input) {
  const now = Date.now();

  const existingIdentity = await db.prepare(`
    SELECT *
    FROM auth_identities
    WHERE provider = ? AND provider_user_id = ?
    LIMIT 1
  `).bind(input.provider, input.providerUserId).first();

  if (existingIdentity) {
    await db.prepare(`
      UPDATE auth_identities
      SET provider_email = ?, updated_at = ?
      WHERE id = ?
    `).bind(
      input.providerEmail || null,
      now,
      existingIdentity.id
    ).run();

    await db.prepare(`
      UPDATE users
      SET updated_at = ?, last_login_at = ?
      WHERE id = ?
    `).bind(now, now, existingIdentity.user_id).run();

    return { userId: existingIdentity.user_id, created: false, linked: false };
  }

  let existingUser = null;

  if (input.providerEmail) {
    existingUser = await db.prepare(`
      SELECT *
      FROM users
      WHERE email = ?
      LIMIT 1
    `).bind(input.providerEmail).first();
  }

  if (existingUser) {
    await db.prepare(`
      INSERT INTO auth_identities (
        id, user_id, provider, provider_user_id, provider_email, password_hash,
        refresh_token_encrypted, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?)
    `).bind(
      makeId("idt"),
      existingUser.id,
      input.provider,
      input.providerUserId,
      input.providerEmail || null,
      input.providerRefreshToken || null,
      now,
      now
    ).run();

    await db.prepare(`
      UPDATE users
      SET updated_at = ?, last_login_at = ?, is_verified = ?
      WHERE id = ?
    `).bind(
      now,
      now,
      input.emailVerified ? 1 : 0,
      existingUser.id
    ).run();

    return { userId: existingUser.id, created: false, linked: true };
  }

  const userId = makeId("usr");
  const username = await makeUniqueUsername(db, input.usernameBase || "user");

  await db.batch([
    db.prepare(`
      INSERT INTO users (
        id, email, username, first_name, last_name, phone, timezone, country,
        plan, status, is_verified, created_at, updated_at, last_login_at
      )
      VALUES (?, ?, ?, ?, ?, NULL, ?, ?, 'free', 'active', ?, ?, ?, ?)
    `).bind(
      userId,
      input.providerEmail || `${input.provider}_${input.providerUserId}@placeholder.local`,
      username,
      input.firstName || input.provider,
      input.lastName || "User",
      input.timezone || "UTC",
      input.country || "Unknown",
      input.emailVerified ? 1 : 0,
      now,
      now,
      now
    ),
    db.prepare(`
      INSERT INTO auth_identities (
        id, user_id, provider, provider_user_id, provider_email, password_hash,
        refresh_token_encrypted, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?)
    `).bind(
      makeId("idt"),
      userId,
      input.provider,
      input.providerUserId,
      input.providerEmail || null,
      input.providerRefreshToken || null,
      now,
      now
    )
  ]);

  return { userId, created: true, linked: false };
}

function normalizePemKey(raw) {
  let value = String(raw || "").trim();

  if (!value) {
    const err = new Error("Apple private key is empty");
    err.code = "APPLE_PRIVATE_KEY_EMPTY";
    throw err;
  }

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'")) ||
    (value.startsWith("`") && value.endsWith("`"))
  ) {
    value = value.slice(1, -1).trim();
  }

  value = value
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n");

  const beginMarker = "-----BEGIN PRIVATE KEY-----";
  const endMarker = "-----END PRIVATE KEY-----";

  if (value.includes(beginMarker) && value.includes(endMarker)) {
    const beginIndex = value.indexOf(beginMarker);
    const endIndex = value.lastIndexOf(endMarker) + endMarker.length;
    value = value.slice(beginIndex, endIndex).trim();

    const lines = value.split("\n").map((line) => line.trim()).filter(Boolean);
    if (lines.length >= 3 && lines[0] === beginMarker && lines[lines.length - 1] === endMarker) {
      const body = lines.slice(1, -1).join("");
      if (!/^[A-Za-z0-9+/=]+$/.test(body)) {
        const err = new Error("Apple private key body contains invalid characters");
        err.code = "APPLE_PRIVATE_KEY_INVALID_BODY";
        throw err;
      }
      return [beginMarker, body.match(/.{1,64}/g)?.join("\n") || body, endMarker].join("\n");
    }
  }

  const compact = value.replace(/\s+/g, "");
  const compactBegin = beginMarker.replace(/\s+/g, "");
  const compactEnd = endMarker.replace(/\s+/g, "");

  if (compact.startsWith(compactBegin) && compact.endsWith(compactEnd)) {
    const body = compact
      .slice(compactBegin.length, compact.length - compactEnd.length)
      .trim();

    if (!body || !/^[A-Za-z0-9+/=]+$/.test(body)) {
      const err = new Error("Apple private key body is invalid");
      err.code = "APPLE_PRIVATE_KEY_INVALID_BODY";
      throw err;
    }

    return [beginMarker, body.match(/.{1,64}/g)?.join("\n") || body, endMarker].join("\n");
  }

  const err = new Error("Apple private key must include BEGIN/END PRIVATE KEY markers");
  err.code = "APPLE_PRIVATE_KEY_BAD_FORMAT";
  throw err;
}

function diagnoseApplePrivateKey(raw) {
  const value = String(raw || "").trim();
  const detail = {
    has_begin_marker: value.includes("BEGIN PRIVATE KEY"),
    has_end_marker: value.includes("END PRIVATE KEY"),
    has_escaped_newlines: value.includes("\\n"),
    has_real_newlines: value.includes("\n"),
    looks_quoted:
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'")) ||
      (value.startsWith("`") && value.endsWith("`")),
    begins_with_public_key: value.includes("BEGIN PUBLIC KEY"),
    begins_with_encrypted_key: value.includes("BEGIN ENCRYPTED PRIVATE KEY"),
    length: value.length
  };

  if (detail.begins_with_public_key) {
    detail.hint = "You pasted a public key. Use the Apple .p8 private key.";
  } else if (detail.begins_with_encrypted_key) {
    detail.hint = "You pasted an encrypted private key. Use the raw Apple .p8 private key.";
  } else if (!detail.has_begin_marker || !detail.has_end_marker) {
    detail.hint = "Secret must include full BEGIN/END PRIVATE KEY markers.";
  } else if (detail.looks_quoted) {
    detail.hint = "Remove wrapping quotes around APPLE_PRIVATE_KEY.";
  } else {
    detail.hint = "Re-copy the full AuthKey_XXXXXX.p8 file and paste it exactly.";
  }

  return detail;
}

async function makeAppleClientSecret(env) {
  const now = Math.floor(Date.now() / 1000);
  const pkcs8 = normalizePemKey(env.APPLE_PRIVATE_KEY);

  const privateKey = await importPKCS8(pkcs8, "ES256");

  return await new SignJWT({})
    .setProtectedHeader({
      alg: "ES256",
      kid: env.APPLE_KEY_ID
    })
    .setIssuer(env.APPLE_TEAM_ID)
    .setIssuedAt(now)
    .setExpirationTime(now + 60 * 60)
    .setAudience("https://appleid.apple.com")
    .setSubject(env.APPLE_CLIENT_ID)
    .sign(privateKey);
}

function getAppleJwks() {
  if (!APPLE_JWKS_CACHE) {
    APPLE_JWKS_CACHE = createRemoteJWKSet(
      new URL("https://appleid.apple.com/auth/keys")
    );
  }
  return APPLE_JWKS_CACHE;
}

async function verifyAppleIdToken(idToken, env, expectedNonce) {
  const { payload } = await jwtVerify(idToken, getAppleJwks(), {
    issuer: "https://appleid.apple.com",
    audience: env.APPLE_CLIENT_ID
  });

  if (expectedNonce && payload.nonce && payload.nonce !== expectedNonce) {
    const err = new Error("Apple nonce mismatch");
    err.code = "APPLE_NONCE_INVALID";
    throw err;
  }

  if (!payload.sub) {
    const err = new Error("Apple subject missing");
    err.code = "APPLE_SUB_MISSING";
    throw err;
  }

  return payload;
}

async function ensureTables(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      username TEXT UNIQUE,
      first_name TEXT,
      last_name TEXT,
      phone TEXT,
      timezone TEXT DEFAULT 'UTC',
      country TEXT,
      plan TEXT NOT NULL DEFAULT 'free',
      role TEXT DEFAULT 'customer',
      status TEXT NOT NULL DEFAULT 'active',
      is_verified INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      last_login_at INTEGER
    )
  `).run();

  await addColumnIfMissing(db, "users", "role TEXT DEFAULT 'customer'");

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS auth_identities (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      provider_user_id TEXT,
      provider_email TEXT,
      password_hash TEXT,
      refresh_token_encrypted TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `).run();

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS auth_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      refresh_token_hash TEXT NOT NULL UNIQUE,
      expires_at INTEGER NOT NULL,
      revoked_at INTEGER,
      user_agent TEXT,
      ip TEXT,
      created_at INTEGER NOT NULL,
      rotated_from_session_id TEXT
    )
  `).run();

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS email_verifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at INTEGER NOT NULL,
      used_at INTEGER,
      created_at INTEGER NOT NULL
    )
  `).run();

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at INTEGER NOT NULL,
      used_at INTEGER,
      created_at INTEGER NOT NULL
    )
  `).run();

  await db.prepare(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email
    ON users(email)
  `).run();

  await db.prepare(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username
    ON users(username)
  `).run();

  await db.prepare(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_identity_provider_pair
    ON auth_identities(provider, provider_user_id)
  `).run();

  await db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_auth_identities_user_id
    ON auth_identities(user_id)
  `).run();

  await db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id
    ON auth_sessions(user_id)
  `).run();
}


async function addColumnIfMissing(db, table, columnDef) {
  try { await db.prepare(`ALTER TABLE ${table} ADD COLUMN ${columnDef}`).run(); }
  catch (err) { const msg = String(err?.message || err).toLowerCase(); if (msg.includes("duplicate column") || msg.includes("already exists")) return; throw err; }
}
function isAdminUser(user) { return String(user?.role || "").trim().toLowerCase() === "admin"; }
function getMt5Db(env) { return env.MT5_DB || env.HISTORY_DB || env.DB; }
function sanitizeIdPart(value, fallback = "client") { return String(value || fallback).trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 48) || fallback; }
function makePublicToken(prefix = "bex_vip") { const bytes = new Uint8Array(8); crypto.getRandomValues(bytes); const tail = Array.from(bytes).map((b) => b.toString(16).padStart(2,"0")).join("").toUpperCase(); return `${prefix}_${tail}`; }
async function getVipProfile(env, userId) {
  const user = await env.DB.prepare(`SELECT id, email, plan, role, status FROM users WHERE id = ? LIMIT 1`).bind(userId).first();
  const token = await env.DB.prepare(`SELECT * FROM vip_tokens WHERE user_id = ? ORDER BY active DESC, created_at DESC LIMIT 1`).bind(userId).first();
  const account = await env.DB.prepare(`SELECT * FROM user_trading_accounts WHERE user_id = ? AND platform = 'mt5' ORDER BY is_active DESC, updated_at DESC LIMIT 1`).bind(userId).first();
  const settings = await env.DB.prepare(`SELECT * FROM user_execution_settings WHERE user_id = ? LIMIT 1`).bind(userId).first();
  const isVip = String(user?.plan || "").toLowerCase().includes("vip");
  return { user, is_vip: isVip, vip_token: token || null, mt5_account: account || null, execution_settings: settings || null, can_auto_trade: !!(isVip && token?.active === 1 && settings?.auto_trading_enabled === 1) };
}
async function saveUserMt5Account(env, user, input) {
  const now = Date.now(); const loginId = String(input.loginId || "").trim(); const server = String(input.server || "").trim(); const rowId = `uta_${sanitizeIdPart(user.email || user.id)}_mt5`;
  await env.DB.prepare(`INSERT INTO user_trading_accounts (id,user_id,platform,login_id,server,encrypted_password,is_active,created_at,updated_at) VALUES (?,?,'mt5',?,?, '',1,?,?) ON CONFLICT(id) DO UPDATE SET login_id=excluded.login_id, server=excluded.server, is_active=1, updated_at=excluded.updated_at`).bind(rowId, user.id, loginId, server, now, now).run();
  await env.DB.prepare(`UPDATE vip_tokens SET mt5_account_login = ?, last_seen_at = ? WHERE user_id = ? AND active = 1`).bind(loginId, now, user.id).run();
  return await getVipProfile(env, user.id);
}
async function getActiveVipForUser(env, user) { return await env.DB.prepare(`SELECT v.*, e.auto_trading_enabled, e.max_lot AS settings_max_lot, e.max_trades FROM vip_tokens v LEFT JOIN user_execution_settings e ON e.user_id = v.user_id WHERE v.user_id = ? AND v.active = 1 ORDER BY v.created_at DESC LIMIT 1`).bind(user.id).first(); }
async function getMyTrades(env, user, limit = 50) {
  const vip = await getActiveVipForUser(env, user); if (!vip?.mt5_account_login) return { count: 0, trades: [], note: "no_vip_mt5_account" };
  const rows = await getMt5Db(env).prepare(`SELECT deal_id, order_id, position_id, account_login, symbol, entry_side_real, closing_deal_side, volume, entry_price, exit_price, sl, tp, pnl_net, final_trade_result, actual_exit_reason, close_time, open_time, status, comment FROM mt5_trade_history WHERE account_login = ? AND status = 'CLOSED' ORDER BY close_time DESC, deal_id DESC LIMIT ?`).bind(String(vip.mt5_account_login), limit).all();
  return { count: rows.results?.length || 0, trades: rows.results || [], account_login: vip.mt5_account_login };
}
async function getMyStats(env, user) {
  const vip = await getActiveVipForUser(env, user); if (!vip?.mt5_account_login) return { account_login: null, stats: { total_trades: 0, wins: 0, losses: 0, flats: 0, win_rate: 0, total_pnl: 0, avg_pnl: 0 }, note: "no_vip_mt5_account" };
  const row = await getMt5Db(env).prepare(`SELECT COUNT(*) AS total_trades, SUM(CASE WHEN pnl_net > 0 THEN 1 ELSE 0 END) AS wins, SUM(CASE WHEN pnl_net < 0 THEN 1 ELSE 0 END) AS losses, SUM(CASE WHEN pnl_net = 0 THEN 1 ELSE 0 END) AS flats, SUM(pnl_net) AS total_pnl, AVG(pnl_net) AS avg_pnl, MAX(close_time) AS last_close_time FROM mt5_trade_history WHERE account_login = ? AND status = 'CLOSED'`).bind(String(vip.mt5_account_login)).first();
  const total = Number(row?.total_trades || 0); const wins = Number(row?.wins || 0);
  return { account_login: vip.mt5_account_login, stats: { total_trades: total, wins, losses: Number(row?.losses || 0), flats: Number(row?.flats || 0), win_rate: total > 0 ? Math.round((wins / total) * 10000) / 100 : 0, total_pnl: Number(row?.total_pnl || 0), avg_pnl: Number(row?.avg_pnl || 0), last_close_time: row?.last_close_time || null } };
}
async function getAdminCustomers(env, url) {
  const limit = clampInt(url.searchParams.get("limit"), 50, 1, 200);
  const rows = await env.DB.prepare(`SELECT u.id, u.email, u.username, u.first_name, u.last_name, u.plan, u.role, u.status, u.is_verified, u.created_at, u.last_login_at, v.client_id, v.token, v.mt5_account_login, v.active AS token_active, v.allowed_symbols, v.max_lot AS token_max_lot, v.expires_at, v.last_seen_at, e.auto_trading_enabled, e.max_lot AS settings_max_lot, e.max_trades, e.risk_mode, t.login_id, t.server FROM users u LEFT JOIN vip_tokens v ON v.user_id = u.id LEFT JOIN user_execution_settings e ON e.user_id = u.id LEFT JOIN user_trading_accounts t ON t.user_id = u.id AND t.platform = 'mt5' ORDER BY u.created_at DESC LIMIT ?`).bind(limit).all();
  return { count: rows.results?.length || 0, customers: rows.results || [] };
}
async function adminUpgradeVip(env, body) {
  const email = normalizeEmail(body.email); if (!email) throw new Error("email_required");
  const mt5Login = clean(body.mt5_account_login || body.login_id || body.account_login || ""); const server = clean(body.server || body.broker_server || ""); const maxLot = Number.isFinite(Number(body.max_lot)) ? Number(body.max_lot) : 0.05; const maxTrades = Number.isFinite(Number(body.max_trades)) ? Math.trunc(Number(body.max_trades)) : 3; const allowedSymbols = clean(body.allowed_symbols || "XAUUSD,XAGUSD"); const now = Date.now();
  const user = await env.DB.prepare(`SELECT * FROM users WHERE email = ? LIMIT 1`).bind(email).first(); if (!user) throw new Error("user_not_found");
  await env.DB.prepare(`UPDATE users SET plan = 'vip_auto', updated_at = ? WHERE id = ?`).bind(now, user.id).run();
  await env.DB.prepare(`INSERT OR REPLACE INTO user_execution_settings (user_id, auto_trading_enabled, max_lot, max_trades, risk_mode, updated_at) VALUES (?, 1, ?, ?, 'normal', ?)`).bind(user.id, maxLot, maxTrades, now).run();
  if (mt5Login) { const accountId = `uta_${sanitizeIdPart(email)}_mt5`; await env.DB.prepare(`INSERT INTO user_trading_accounts (id,user_id,platform,login_id,server,encrypted_password,is_active,created_at,updated_at) VALUES (?,?,'mt5',?,?, '',1,?,?) ON CONFLICT(id) DO UPDATE SET login_id=excluded.login_id, server=excluded.server, is_active=1, updated_at=excluded.updated_at`).bind(accountId, user.id, mt5Login, server || 'UNKNOWN_SERVER', now, now).run(); }
  const existing = await env.DB.prepare(`SELECT * FROM vip_tokens WHERE user_id = ? AND active = 1 LIMIT 1`).bind(user.id).first();
  if (!existing) { const clientId = clean(body.client_id) || `client_${sanitizeIdPart(email)}`; const token = clean(body.token) || makePublicToken(`bex_vip_${sanitizeIdPart(email)}`); const vipId = `vip_${sanitizeIdPart(email)}_${now}`; await env.DB.prepare(`INSERT INTO vip_tokens (id,user_id,email,client_id,token,mt5_account_login,active,expires_at,allowed_symbols,max_lot,plan,created_at,last_seen_at) VALUES (?,?,?,?,?,?,1,?,?,?,?,NULL)`).bind(vipId, user.id, email, clientId, token, mt5Login || '', Number(body.expires_at || 1798761599000), allowedSymbols, maxLot, 'VIP_AUTO', now).run(); }
  else { await env.DB.prepare(`UPDATE vip_tokens SET mt5_account_login = COALESCE(NULLIF(?, ''), mt5_account_login), allowed_symbols = ?, max_lot = ?, plan = 'VIP_AUTO' WHERE id = ?`).bind(mt5Login || '', allowedSymbols, maxLot, existing.id).run(); }
  return await getVipProfile(env, user.id);
}


/* ---------------- BILLING / STRIPE CHECKOUT ---------------- */

function normalizeBillingPlan(value) {
  const plan = String(value || "").trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_");
  if (plan === "basic") return "basic";
  if (plan === "pro") return "pro";
  if (plan === "vip" || plan === "vip_auto" || plan === "vipauto") return "vip_auto";
  if (plan === "lifetime" || plan === "life_time") return "lifetime";
  return null;
}

function normalizeBillingCycle(value, plan) {
  const cycle = String(value || "").trim().toLowerCase();
  if (plan === "lifetime") return "lifetime";
  if (cycle === "year" || cycle === "yearly" || cycle === "annual" || cycle === "annually") return "yearly";
  return "monthly";
}

function getPlanDisplayName(plan, billing) {
  if (plan === "basic") return billing === "yearly" ? "BEX Basic Yearly" : "BEX Basic Monthly";
  if (plan === "pro") return billing === "yearly" ? "BEX Pro Yearly" : "BEX Pro Monthly";
  if (plan === "vip_auto") return billing === "yearly" ? "BEX VIP Auto Yearly" : "BEX VIP Auto Monthly";
  if (plan === "lifetime") return "BEX Lifetime Access";
  return "BEX Plan";
}

function getPlanAmountCents(plan, billing) {
  if (plan === "basic" && billing === "monthly") return 999;
  if (plan === "basic" && billing === "yearly") return 7900;
  if (plan === "pro" && billing === "monthly") return 2900;
  if (plan === "pro" && billing === "yearly") return 24900;
  if (plan === "vip_auto" && billing === "monthly") return 4900;
  if (plan === "vip_auto" && billing === "yearly") return 39900;
  if (plan === "lifetime") return 79900;
  return null;
}

function getStripePriceId(env, plan, billing) {
  const key = `${plan}_${billing}`.toUpperCase();
  const map = {
    BASIC_MONTHLY: env.STRIPE_PRICE_BASIC_MONTHLY,
    BASIC_YEARLY: env.STRIPE_PRICE_BASIC_YEARLY,
    PRO_MONTHLY: env.STRIPE_PRICE_PRO_MONTHLY,
    PRO_YEARLY: env.STRIPE_PRICE_PRO_YEARLY,
    VIP_AUTO_MONTHLY: env.STRIPE_PRICE_VIP_AUTO_MONTHLY,
    VIP_AUTO_YEARLY: env.STRIPE_PRICE_VIP_AUTO_YEARLY,
    LIFETIME_LIFETIME: env.STRIPE_PRICE_LIFETIME
  };
  return String(map[key] || "").trim();
}

function getStripeMode(plan) {
  return plan === "lifetime" ? "payment" : "subscription";
}

function getBillingSuccessUrl(env, plan, billing) {
  const explicit = String(env.BILLING_SUCCESS_URL || "").trim();
  if (explicit) return explicit;
  const base = getAppBaseUrl(env).replace(/\/$/, "");
  return `${base}/app/checkout?success=1&plan=${encodeURIComponent(plan)}&billing=${encodeURIComponent(billing)}`;
}

function getBillingCancelUrl(env, plan, billing) {
  const explicit = String(env.BILLING_CANCEL_URL || "").trim();
  if (explicit) return explicit;
  const base = getAppBaseUrl(env).replace(/\/$/, "");
  return `${base}/app/vip?cancelled=1&plan=${encodeURIComponent(plan)}&billing=${encodeURIComponent(billing)}`;
}

function buildStripeForm(params) {
  const form = new URLSearchParams();
  for (const [key, value] of Object.entries(params || {})) {
    if (value === undefined || value === null || value === "") continue;
    form.set(key, String(value));
  }
  return form;
}

async function createStripeCheckoutSession(env, request, user, body) {
  const secret = String(env.STRIPE_SECRET_KEY || "").trim();
  if (!secret) throw new Error("STRIPE_SECRET_KEY missing");

  const plan = normalizeBillingPlan(body?.plan);
  if (!plan || plan === "free") throw new Error("invalid_plan");
  const billing = normalizeBillingCycle(body?.billing, plan);
  const mode = getStripeMode(plan);
  const priceId = getStripePriceId(env, plan, billing);
  if (!priceId) throw new Error(`missing_stripe_price_id_for_${plan}_${billing}`);

  const metadata = {
    user_id: user.id,
    email: user.email || "",
    plan,
    billing,
    source: "bex_app_checkout"
  };

  const params = {
    mode,
    success_url: getBillingSuccessUrl(env, plan, billing),
    cancel_url: getBillingCancelUrl(env, plan, billing),
    client_reference_id: user.id,
    customer_email: user.email || "",
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": 1,
    allow_promotion_codes: "true",
    "metadata[user_id]": metadata.user_id,
    "metadata[email]": metadata.email,
    "metadata[plan]": metadata.plan,
    "metadata[billing]": metadata.billing,
    "metadata[source]": metadata.source
  };

  if (mode === "subscription") {
    params["subscription_data[metadata][user_id]"] = metadata.user_id;
    params["subscription_data[metadata][email]"] = metadata.email;
    params["subscription_data[metadata][plan]"] = metadata.plan;
    params["subscription_data[metadata][billing]"] = metadata.billing;
  } else {
    params["payment_intent_data[metadata][user_id]"] = metadata.user_id;
    params["payment_intent_data[metadata][email]"] = metadata.email;
    params["payment_intent_data[metadata][plan]"] = metadata.plan;
    params["payment_intent_data[metadata][billing]"] = metadata.billing;
  }

  if (String(env.STRIPE_AUTOMATIC_TAX || "").trim() === "1") {
    params["automatic_tax[enabled]"] = "true";
  }

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: buildStripeForm(params).toString()
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.url) {
    throw new Error(data?.error?.message || `stripe_checkout_failed_${res.status}`);
  }

  await ensureBillingTables(env.DB);
  await env.DB.prepare(`
    INSERT INTO billing_events (id, provider, type, user_id, email, plan, billing, payload_json, created_at)
    VALUES (?, 'stripe', 'checkout_session_created', ?, ?, ?, ?, ?, ?)
  `).bind(
    makeId("bill_evt"),
    user.id,
    user.email || null,
    plan,
    billing,
    JSON.stringify({ id: data.id, mode, price_id: priceId }),
    Date.now()
  ).run();

  return {
    checkout_url: data.url,
    session_id: data.id,
    plan,
    billing,
    mode
  };
}

async function handleStripeWebhook(request, env) {
  const secret = String(env.STRIPE_WEBHOOK_SECRET || "").trim();
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET missing");

  const payload = await request.text();
  const sig = request.headers.get("stripe-signature") || "";
  const verified = await verifyStripeSignature(payload, sig, secret);
  if (!verified.ok) throw new Error(verified.reason || "stripe_signature_invalid");

  const event = JSON.parse(payload);
  await ensureBillingTables(env.DB);

  await env.DB.prepare(`
    INSERT OR IGNORE INTO billing_events (id, provider, type, user_id, email, plan, billing, payload_json, created_at)
    VALUES (?, 'stripe', ?, NULL, NULL, NULL, NULL, ?, ?)
  `).bind(event.id || makeId("stripe_evt"), event.type || "unknown", payload, Date.now()).run();

  if (event.type === "checkout.session.completed") {
    const session = event.data?.object || {};
    const meta = session.metadata || {};
    const userId = meta.user_id || session.client_reference_id || null;
    const email = normalizeEmail(meta.email || session.customer_email || "");
    const plan = normalizeBillingPlan(meta.plan);
    const billing = normalizeBillingCycle(meta.billing, plan);

    if (!plan || !userId) {
      return { received: true, ignored: true, reason: "missing_plan_or_user_id", event_type: event.type };
    }

    const applied = await applyPaidPlan(env, {
      user_id: userId,
      email,
      plan,
      billing,
      stripe_customer_id: session.customer || null,
      stripe_subscription_id: session.subscription || null,
      stripe_session_id: session.id || null,
      status: session.payment_status || "completed"
    });

    return { received: true, event_type: event.type, applied };
  }

  return { received: true, event_type: event.type || "unknown", ignored: true };
}

function parseStripeSignatureHeader(header) {
  const out = { t: "", v1: [] };
  for (const part of String(header || "").split(",")) {
    const [k, v] = part.split("=", 2);
    if (k === "t") out.t = v || "";
    if (k === "v1" && v) out.v1.push(v);
  }
  return out;
}

async function verifyStripeSignature(payload, header, secret) {
  const parsed = parseStripeSignatureHeader(header);
  if (!parsed.t || !parsed.v1.length) return { ok: false, reason: "stripe_signature_header_missing" };

  const timestamp = Number(parsed.t);
  if (!Number.isFinite(timestamp)) return { ok: false, reason: "stripe_signature_timestamp_invalid" };

  const toleranceSeconds = 5 * 60;
  const age = Math.abs(Math.floor(Date.now() / 1000) - timestamp);
  if (age > toleranceSeconds) return { ok: false, reason: "stripe_signature_timestamp_too_old" };

  const signedPayload = `${parsed.t}.${payload}`;
  const expected = await hmacSha256Hex(secret, signedPayload);
  const okSig = parsed.v1.some((sig) => safeEqualHex(expected, sig));
  return okSig ? { ok: true } : { ok: false, reason: "stripe_signature_mismatch" };
}

async function hmacSha256Hex(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqualHex(a, b) {
  const aa = String(a || "").toLowerCase();
  const bb = String(b || "").toLowerCase();
  if (aa.length !== bb.length) return false;
  let out = 0;
  for (let i = 0; i < aa.length; i++) out |= aa.charCodeAt(i) ^ bb.charCodeAt(i);
  return out === 0;
}

async function ensureBillingTables(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS billing_events (
      id TEXT PRIMARY KEY,
      provider TEXT,
      type TEXT,
      user_id TEXT,
      email TEXT,
      plan TEXT,
      billing TEXT,
      payload_json TEXT,
      created_at INTEGER
    )
  `).run();

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS user_billing (
      user_id TEXT PRIMARY KEY,
      email TEXT,
      plan TEXT,
      billing TEXT,
      status TEXT,
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT,
      stripe_session_id TEXT,
      current_period_end INTEGER,
      created_at INTEGER,
      updated_at INTEGER
    )
  `).run();

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS user_execution_settings (
      user_id TEXT PRIMARY KEY,
      auto_trading_enabled INTEGER NOT NULL DEFAULT 0,
      max_lot REAL DEFAULT 0.01,
      max_trades INTEGER DEFAULT 1,
      risk_mode TEXT DEFAULT 'normal',
      updated_at INTEGER
    )
  `).run();

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS user_trading_accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      platform TEXT DEFAULT 'mt5',
      login_id TEXT,
      server TEXT,
      encrypted_password TEXT,
      is_active INTEGER DEFAULT 1,
      created_at INTEGER,
      updated_at INTEGER
    )
  `).run();

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS vip_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      email TEXT NOT NULL,
      client_id TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      mt5_account_login TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      expires_at INTEGER,
      allowed_symbols TEXT DEFAULT 'XAUUSD,XAGUSD',
      max_lot REAL DEFAULT 0.01,
      plan TEXT DEFAULT 'VIP_AUTO',
      created_at INTEGER NOT NULL,
      last_seen_at INTEGER
    )
  `).run();
}

async function applyPaidPlan(env, input) {
  await ensureBillingTables(env.DB);
  const now = Date.now();
  let user = await env.DB.prepare(`SELECT * FROM users WHERE id = ? LIMIT 1`).bind(input.user_id).first();
  if (!user && input.email) user = await env.DB.prepare(`SELECT * FROM users WHERE email = ? LIMIT 1`).bind(input.email).first();
  if (!user) throw new Error("billing_user_not_found");

  const dbPlan = input.plan === "lifetime" ? "vip_auto" : input.plan;

  await env.DB.prepare(`UPDATE users SET plan = ?, updated_at = ? WHERE id = ?`).bind(dbPlan, now, user.id).run();

  await env.DB.prepare(`
    INSERT INTO user_billing (user_id,email,plan,billing,status,stripe_customer_id,stripe_subscription_id,stripe_session_id,current_period_end,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(user_id) DO UPDATE SET
      email=excluded.email,
      plan=excluded.plan,
      billing=excluded.billing,
      status=excluded.status,
      stripe_customer_id=excluded.stripe_customer_id,
      stripe_subscription_id=excluded.stripe_subscription_id,
      stripe_session_id=excluded.stripe_session_id,
      current_period_end=excluded.current_period_end,
      updated_at=excluded.updated_at
  `).bind(
    user.id,
    user.email || input.email || null,
    input.plan,
    input.billing,
    input.status || "active",
    input.stripe_customer_id || null,
    input.stripe_subscription_id || null,
    input.stripe_session_id || null,
    null,
    now,
    now
  ).run();

  if (input.plan === "vip_auto" || input.plan === "lifetime") {
    await grantVipAutoEntitlement(env, user, input.plan);
  }

  return { user_id: user.id, email: user.email, plan: dbPlan, billing_plan: input.plan, billing: input.billing };
}

async function grantVipAutoEntitlement(env, user, billingPlan = "vip_auto") {
  const now = Date.now();
  const email = normalizeEmail(user.email) || user.email || user.id;
  const maxLot = 0.05;
  const maxTrades = 3;
  const allowedSymbols = "XAUUSD,XAGUSD";

  await env.DB.prepare(`
    INSERT OR REPLACE INTO user_execution_settings (user_id, auto_trading_enabled, max_lot, max_trades, risk_mode, updated_at)
    VALUES (?, 1, ?, ?, 'normal', ?)
  `).bind(user.id, maxLot, maxTrades, now).run();

  const existing = await env.DB.prepare(`SELECT * FROM vip_tokens WHERE user_id = ? AND active = 1 LIMIT 1`).bind(user.id).first();
  const tokenPlan = billingPlan === "lifetime" ? "LIFETIME" : "VIP_AUTO";
  const expiresAt = billingPlan === "lifetime" ? null : 1798761599000;

  if (existing) {
    await env.DB.prepare(`
      UPDATE vip_tokens
      SET plan = ?, expires_at = ?, allowed_symbols = ?, max_lot = ?, last_seen_at = ?
      WHERE id = ?
    `).bind(tokenPlan, expiresAt, allowedSymbols, maxLot, now, existing.id).run();
    return { created: false, token: existing.token };
  }

  const clientId = `client_${sanitizeIdPart(email)}`;
  const token = makePublicToken(`bex_vip_${sanitizeIdPart(email)}`);
  const vipId = `vip_${sanitizeIdPart(email)}_${now}`;

  await env.DB.prepare(`
    INSERT INTO vip_tokens (id,user_id,email,client_id,token,mt5_account_login,active,expires_at,allowed_symbols,max_lot,plan,created_at,last_seen_at)
    VALUES (?,?,?,?,?,?,1,?,?,?,?,NULL)
  `).bind(vipId, user.id, email, clientId, token, "", expiresAt, allowedSymbols, maxLot, tokenPlan, now).run();

  return { created: true, token };
}

/* ---------------- END BILLING / STRIPE CHECKOUT ---------------- */

async function makeUniqueUsername(db, baseUsername) {
  let candidate = baseUsername || "user";
  let i = 1;

  while (true) {
    const exists = await db.prepare(
      `SELECT id FROM users WHERE username = ? LIMIT 1`
    ).bind(candidate).first();

    if (!exists) return candidate;

    candidate = `${baseUsername}_${i}`;
    i += 1;
  }
}
