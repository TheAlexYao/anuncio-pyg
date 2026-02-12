# TikTok Platform Integration (P2)

Phase 2 priority. Covers TikTok Ads API via TikTok for Business.

## Credentials

| Credential | Env Variable | Where to Get |
|---|---|---|
| TikTok App ID | `TIKTOK_APP_ID` | [business-api.tiktok.com](https://business-api.tiktok.com/) → Create App |
| TikTok App Secret | `TIKTOK_APP_SECRET` | Same, App Details page |

Store in Convex:
```bash
npx convex env set TIKTOK_APP_ID "your-app-id"
npx convex env set TIKTOK_APP_SECRET "your-app-secret"
```

## App Setup

1. Go to [TikTok for Business Developer Portal](https://business-api.tiktok.com/)
2. Create App → Marketing API
3. Request scopes: `Ad Account Management`, `Ad Management`, `Reporting`
4. Set OAuth redirect URI: `https://your-domain.com/api/auth/tiktok/callback`
5. Submit for review (required before production use)

## OAuth Flow

### Step 1: Authorization URL

```
GET https://business-api.tiktok.com/portal/auth
  ?app_id={TIKTOK_APP_ID}
  &redirect_uri={REDIRECT_URI}
  &state={CSRF_TOKEN}
```

### Step 2: Exchange Code for Token

```
POST https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/
{
  "app_id": "{TIKTOK_APP_ID}",
  "secret": "{TIKTOK_APP_SECRET}",
  "auth_code": "{CODE}"
}
```

Returns: `access_token` (long-lived, ~24 hours), `advertiser_ids`

### Step 3: Refresh Token

```
POST https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/
{
  "app_id": "{TIKTOK_APP_ID}",
  "secret": "{TIKTOK_APP_SECRET}",
  "auth_code": "{REFRESH_TOKEN}",
  "grant_type": "refresh_token"
}
```

## TikTok Ads API

Base URL: `https://business-api.tiktok.com/open_api/v1.3`

All requests need:
```
Access-Token: {ACCESS_TOKEN}
Content-Type: application/json
```

### Key Endpoints

```
# List ad accounts
GET /advertiser/info/?advertiser_ids=["{ID}"]&fields=["name","balance","currency"]

# Get campaigns
GET /campaign/get/?advertiser_id={ID}&fields=["campaign_id","campaign_name","budget","status"]

# Create campaign
POST /campaign/create/
{
  "advertiser_id": "{ID}",
  "campaign_name": "My Campaign",
  "objective_type": "CONVERSIONS",
  "budget_mode": "BUDGET_MODE_DAY",
  "budget": 50.00
}

# Reporting
POST /report/integrated/get/
{
  "advertiser_id": "{ID}",
  "report_type": "BASIC",
  "dimensions": ["campaign_id"],
  "metrics": ["spend", "impressions", "clicks", "cpc", "cpm", "ctr"],
  "data_level": "AUCTION_CAMPAIGN",
  "start_date": "2026-02-01",
  "end_date": "2026-02-12"
}
```

### Objective Types

- `REACH` — Brand awareness
- `TRAFFIC` — Website visits
- `CONVERSIONS` — Website conversions
- `APP_INSTALL` — App installs
- `VIDEO_VIEWS` — Video views
- `LEAD_GENERATION` — Lead forms

## Key Rules

1. Access tokens are long-lived (~24h) but still need refresh logic
2. All monetary values are in **actual currency** (not micros like Google)
3. API responses wrap data in `{"code": 0, "data": {...}}` — check `code === 0` for success
4. Rate limit: 10 requests/second per app, 600/minute
5. Sandbox mode available for testing without spending
6. App review required before accessing production ad accounts
