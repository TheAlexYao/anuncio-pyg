# Credentials & Security

How to manage API keys, OAuth tokens, and secrets across the stack.

## Setup Checklist

### P1 — Meta + Google

- [ ] Meta App — Create at [developers.facebook.com](https://developers.facebook.com/)
  - [ ] `META_APP_ID`
  - [ ] `META_APP_SECRET`
  - [ ] `WHATSAPP_PHONE_NUMBER_ID`
  - [ ] `WHATSAPP_ACCESS_TOKEN`
- [ ] Google Cloud Project — Create at [console.cloud.google.com](https://console.cloud.google.com/)
  - [ ] `GOOGLE_CLIENT_ID`
  - [ ] `GOOGLE_CLIENT_SECRET`
  - [ ] `GOOGLE_ADS_DEVELOPER_TOKEN` (apply via MCC)
  - [ ] `GOOGLE_ADS_MCC_CUSTOMER_ID`
- [ ] Infrastructure
  - [x] Convex project (anuncio-pyg)
  - [ ] `ENCRYPTION_KEY` — 32-byte key for token storage
  - [ ] Vercel deployment for frontend + OAuth callbacks

### P2 — TikTok

- [ ] TikTok App — Create at [business-api.tiktok.com](https://business-api.tiktok.com/)
  - [ ] `TIKTOK_APP_ID`
  - [ ] `TIKTOK_APP_SECRET`

## Where Credentials Live

| Type | Storage | Access |
|---|---|---|
| Platform API keys (app-level) | Convex env vars | Actions only (`process.env`) |
| User OAuth tokens (per-account) | Convex DB (encrypted) | Via internal queries |
| Public client IDs | `.env.local` as `NEXT_PUBLIC_*` | Client components |
| Encryption key | Convex env var | Actions only |

## Token Storage Pattern

User OAuth tokens (access + refresh) are stored **encrypted** in Convex.

### Generate Encryption Key

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
npx convex env set ENCRYPTION_KEY "the-generated-key"
```

### Schema for Token Storage

```ts
// convex/schema.ts
connectedAccounts: defineTable({
  userId: v.id("users"),
  platform: v.union(v.literal("meta"), v.literal("google"), v.literal("tiktok")),
  platformAccountId: v.string(),
  accountName: v.string(),
  encryptedAccessToken: v.string(),
  encryptedRefreshToken: v.optional(v.string()),
  tokenExpiresAt: v.number(),
  scopes: v.array(v.string()),
  connectedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_user_platform", ["userId", "platform"])
  .index("by_platform_account", ["platform", "platformAccountId"]),
```

### Encrypt/Decrypt (Convex action helper)

```ts
// convex/lib/crypto.ts
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";

export function encrypt(text: string, key: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, Buffer.from(key, "hex"), iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${tag}:${encrypted}`;
}

export function decrypt(data: string, key: string): string {
  const [ivHex, tagHex, encrypted] = data.split(":");
  const decipher = createDecipheriv(
    ALGORITHM,
    Buffer.from(key, "hex"),
    Buffer.from(ivHex, "hex")
  );
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
```

## Token Refresh Pattern

Tokens expire. Always check before use and refresh proactively.

```ts
// In a Convex action:
const account = await ctx.runQuery(internal.accounts.get, { id: accountId });
const key = process.env.ENCRYPTION_KEY!;

if (account.tokenExpiresAt < Date.now() - 60_000) {
  // Refresh token
  const newTokens = await refreshToken(account.platform, decrypt(account.encryptedRefreshToken!, key));
  await ctx.runMutation(internal.accounts.updateTokens, {
    id: accountId,
    encryptedAccessToken: encrypt(newTokens.access_token, key),
    tokenExpiresAt: Date.now() + newTokens.expires_in * 1000,
  });
  return newTokens.access_token;
}

return decrypt(account.encryptedAccessToken, key);
```

## OAuth Callback Pattern

All OAuth callbacks follow the same flow:

1. User clicks "Connect [Platform]" → redirect to platform auth URL
2. User authorizes → platform redirects to `/api/auth/{platform}/callback?code=...`
3. Callback handler: exchange code for tokens → encrypt → store in Convex → redirect to dashboard

Use Convex HTTP actions (not Next.js API routes) for callbacks when possible.

## Key Rules

1. Never store tokens unencrypted
2. Never expose secrets to client — only `NEXT_PUBLIC_*` vars are safe
3. Always check token expiry before API calls
4. Refresh tokens are long-lived but can be revoked — handle gracefully
5. Use `internal` Convex functions for token read/write — never expose to client API
6. Log token refreshes and failures for debugging
7. Each platform has different token lifetimes:
   - Meta: ~60 days (long-lived user token)
   - Google: ~1 hour (use refresh token)
   - TikTok: ~24 hours (use refresh token)
