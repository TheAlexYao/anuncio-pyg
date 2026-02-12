# Google Platform Integration

Covers Google Ads API and Google OAuth. Both use the same Google Cloud Project.

## Credentials

| Credential | Env Variable | Where to Get |
|---|---|---|
| OAuth Client ID | `GOOGLE_CLIENT_ID` | [console.cloud.google.com](https://console.cloud.google.com/) → APIs & Services → Credentials |
| OAuth Client Secret | `GOOGLE_CLIENT_SECRET` | Same as above |
| Google Ads Developer Token | `GOOGLE_ADS_DEVELOPER_TOKEN` | Google Ads API Center (apply via MCC account) |
| MCC Customer ID | `GOOGLE_ADS_MCC_CUSTOMER_ID` | Manager account → Account settings (format: 123-456-7890) |

Store in Convex:
```bash
npx convex env set GOOGLE_CLIENT_ID "your-client-id"
npx convex env set GOOGLE_CLIENT_SECRET "your-client-secret"
npx convex env set GOOGLE_ADS_DEVELOPER_TOKEN "your-dev-token"
npx convex env set GOOGLE_ADS_MCC_CUSTOMER_ID "your-mcc-id"
```

For Next.js (public, client-side only):
```
# .env.local
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id
```

## Google Cloud Project Setup

1. Go to [console.cloud.google.com](https://console.cloud.google.com/) → Create Project
2. Enable APIs:
   - **Google Ads API**
   - **Google Analytics Data API** (GA4, if needed later)
3. Create OAuth 2.0 credentials:
   - Application type: **Web application**
   - Authorized redirect URI: `https://your-domain.com/api/auth/google/callback`
4. Configure OAuth consent screen (External, start in Testing mode)

## Google Ads Developer Token

1. Create a Google Ads Manager (MCC) account at [ads.google.com/home/tools/manager-accounts](https://ads.google.com/home/tools/manager-accounts/)
2. In MCC → Tools & Settings → API Center → Apply for Developer Token
3. Starts as **test tier** — limited to test accounts only
4. Apply for **basic access** when ready for production (requires app review)

### Test vs Basic Access

| | Test | Basic |
|---|---|---|
| Rate limits | Low | Standard |
| Accounts | Test accounts only | Any linked account |
| Review | None | Required |

## OAuth Flow

Users connect their Google Ads accounts via OAuth. Store refresh token encrypted in Convex.

### Step 1: Authorization URL

```
GET https://accounts.google.com/o/oauth2/v2/auth
  ?client_id={GOOGLE_CLIENT_ID}
  &redirect_uri={REDIRECT_URI}
  &response_type=code
  &scope=https://www.googleapis.com/auth/adwords
  &access_type=offline
  &prompt=consent
```

- `access_type=offline` is required to get a refresh token
- `prompt=consent` forces re-consent to ensure refresh token is returned

### Step 2: Exchange Code for Tokens

```
POST https://oauth2.googleapis.com/token
Content-Type: application/x-www-form-urlencoded

client_id={GOOGLE_CLIENT_ID}
&client_secret={GOOGLE_CLIENT_SECRET}
&code={CODE}
&grant_type=authorization_code
&redirect_uri={REDIRECT_URI}
```

Returns: `access_token`, `refresh_token`, `expires_in`

### Step 3: Refresh Access Token

```
POST https://oauth2.googleapis.com/token
Content-Type: application/x-www-form-urlencoded

client_id={GOOGLE_CLIENT_ID}
&client_secret={GOOGLE_CLIENT_SECRET}
&refresh_token={REFRESH_TOKEN}
&grant_type=refresh_token
```

## Google Ads API

Base URL: `https://googleads.googleapis.com/v18`

All requests need these headers:
```
Authorization: Bearer {ACCESS_TOKEN}
developer-token: {GOOGLE_ADS_DEVELOPER_TOKEN}
login-customer-id: {MCC_CUSTOMER_ID}  (no dashes, e.g., 1234567890)
```

### Key Operations

```
# List accessible customer accounts
GET /v18/customers:listAccessibleCustomers

# Get customer details
GET /v18/customers/{CUSTOMER_ID}

# Search (GAQL — Google Ads Query Language)
POST /v18/customers/{CUSTOMER_ID}/googleAds:searchStream
{
  "query": "SELECT campaign.id, campaign.name, campaign.status, metrics.impressions, metrics.clicks, metrics.cost_micros FROM campaign WHERE segments.date DURING LAST_7_DAYS"
}

# Create campaign
POST /v18/customers/{CUSTOMER_ID}/campaigns:mutate
{
  "operations": [{
    "create": {
      "name": "My Campaign",
      "advertisingChannelType": "SEARCH",
      "status": "PAUSED",
      "campaignBudget": "customers/{CUSTOMER_ID}/campaignBudgets/{BUDGET_ID}"
    }
  }]
}
```

### GAQL (Google Ads Query Language)

Used for all reporting and reads. SQL-like syntax.

```sql
-- Campaign performance
SELECT campaign.name, metrics.impressions, metrics.clicks, metrics.cost_micros
FROM campaign
WHERE segments.date DURING LAST_30_DAYS
ORDER BY metrics.impressions DESC

-- Ad group performance
SELECT ad_group.name, metrics.conversions, metrics.cost_per_conversion
FROM ad_group
WHERE campaign.id = 123456789
```

- `cost_micros` = cost in micros (divide by 1,000,000 for actual currency)
- Date segments: `LAST_7_DAYS`, `LAST_30_DAYS`, `THIS_MONTH`, `LAST_MONTH`
- Custom date range: `segments.date BETWEEN '2026-01-01' AND '2026-01-31'`

### Rate Limits

- 15,000 requests per day per developer token (basic access)
- Use `searchStream` instead of `search` for large result sets
- Batch mutations when possible (up to 5,000 operations per request)

## Key Rules

1. Always use `login-customer-id` header with MCC account ID (no dashes)
2. Store refresh tokens encrypted — never expose to client
3. Access tokens expire in 1 hour — refresh proactively
4. Google Ads costs are in **micros** — always divide by 1,000,000
5. Developer token starts as test — plan for basic access review
6. Use GAQL `searchStream` for reporting (not REST list endpoints)
