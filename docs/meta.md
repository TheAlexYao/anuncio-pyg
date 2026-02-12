# Meta Platform Integration

Covers Meta Ads API and WhatsApp Business API. Both use the same Meta App.

## Credentials

| Credential | Env Variable | Where to Get |
|---|---|---|
| Meta App ID | `META_APP_ID` | [developers.facebook.com](https://developers.facebook.com/) → Create App |
| Meta App Secret | `META_APP_SECRET` | App Dashboard → Settings → Basic |
| WhatsApp Phone Number ID | `WHATSAPP_PHONE_NUMBER_ID` | App Dashboard → WhatsApp → Getting Started |
| WhatsApp Access Token | `WHATSAPP_ACCESS_TOKEN` | System User token from Business Settings |

Store in Convex:
```bash
npx convex env set META_APP_ID "your-app-id"
npx convex env set META_APP_SECRET "your-app-secret"
npx convex env set WHATSAPP_PHONE_NUMBER_ID "your-phone-id"
npx convex env set WHATSAPP_ACCESS_TOKEN "your-token"
```

For Next.js (public, client-side only):
```
# .env.local
NEXT_PUBLIC_META_APP_ID=your-app-id
```

## Meta App Setup

1. Go to [developers.facebook.com](https://developers.facebook.com/) → My Apps → Create App
2. Choose **Business** type
3. Add products:
   - **Marketing API** (for Meta Ads)
   - **WhatsApp** (for WhatsApp Business)
4. Set OAuth redirect URI to `https://your-domain.com/api/auth/meta/callback`

## Meta Ads API

### OAuth Flow (User Token)

Users connect their ad accounts via OAuth. Store the token encrypted in Convex.

```
GET https://www.facebook.com/v21.0/dialog/oauth
  ?client_id={META_APP_ID}
  &redirect_uri={REDIRECT_URI}
  &scope=ads_management,ads_read,business_management
  &response_type=code
```

Exchange code for token:
```
POST https://graph.facebook.com/v21.0/oauth/access_token
  ?client_id={META_APP_ID}
  &client_secret={META_APP_SECRET}
  &redirect_uri={REDIRECT_URI}
  &code={CODE}
```

### Key Endpoints

```
# List ad accounts
GET /v21.0/me/adaccounts?fields=name,account_id,currency,account_status

# Get campaigns
GET /v21.0/act_{AD_ACCOUNT_ID}/campaigns?fields=name,status,objective,daily_budget

# Create campaign
POST /v21.0/act_{AD_ACCOUNT_ID}/campaigns
  name, objective, status, special_ad_categories

# Get ad insights (reporting)
GET /v21.0/act_{AD_ACCOUNT_ID}/insights
  ?fields=impressions,clicks,spend,cpc,cpm,ctr
  &date_preset=last_7d

# Create ad set
POST /v21.0/act_{AD_ACCOUNT_ID}/adsets
  name, campaign_id, daily_budget, targeting, billing_event, optimization_goal

# Create ad
POST /v21.0/act_{AD_ACCOUNT_ID}/ads
  name, adset_id, creative
```

### Rate Limits

- Business Use Case rate limiting (BUC) — tiered by app review status
- Use batch requests to reduce call count
- Respect `x-business-use-case-usage` header

## WhatsApp Business API

### Sending Messages

```
POST https://graph.facebook.com/v21.0/{PHONE_NUMBER_ID}/messages
Content-Type: application/json
Authorization: Bearer {WHATSAPP_ACCESS_TOKEN}

{
  "messaging_product": "whatsapp",
  "to": "1234567890",
  "type": "template",
  "template": {
    "name": "hello_world",
    "language": { "code": "en_US" }
  }
}
```

### Message Types

- **Template**: Pre-approved messages (required for initiating conversations)
- **Text**: Free-form text (only within 24-hour conversation window)
- **Image/Video/Document**: Media messages
- **Interactive**: Buttons, lists, product messages

### Webhooks

Register webhook URL in App Dashboard → WhatsApp → Configuration.

```
POST /api/webhooks/whatsapp
```

Verify webhook with challenge:
```ts
// GET handler — Meta sends verify_token challenge
const mode = searchParams.get("hub.mode");
const token = searchParams.get("hub.verify_token");
const challenge = searchParams.get("hub.challenge");
if (mode === "subscribe" && token === VERIFY_TOKEN) return challenge;
```

### Key Rules

- Templates must be approved before use — submit via Business Manager
- 24-hour conversation window — after user replies, you can send free-form messages for 24 hours
- Phone numbers must be verified and registered
- All messages require `messaging_product: "whatsapp"`
