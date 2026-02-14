# API Research - Quick Reference for Sync Implementation

## Meta Marketing API

### Campaign Insights Endpoint
```
GET /{act_account_id}/insights
  ?level=campaign
  &fields=campaign_id,campaign_name,impressions,reach,clicks,spend,actions,cpc,cpm,ctr
  &date_preset=last_30d
  &time_increment=1
```

Response fields:
- campaign_id, campaign_name
- date_start (YYYY-MM-DD)
- impressions, reach, clicks, spend
- actions[] (lead, purchase, etc.)
- cpc, cpm, ctr

### Lead Retrieval
```
GET /{leadgen_form_id}/leads
  ?fields=id,created_time,field_data,ad_id,campaign_id,adset_id
```

---

## Google Ads API

### Campaign Query (GAQL)
```sql
SELECT
  campaign.id, campaign.name, campaign.status,
  segments.date,
  metrics.impressions, metrics.clicks, metrics.cost_micros,
  metrics.conversions, metrics.ctr, metrics.average_cpc
FROM campaign
WHERE segments.date DURING LAST_30_DAYS
```

Endpoint: `POST /customers/{customer_id}/googleAds:searchStream`

Headers:
- Authorization: Bearer {access_token}
- developer-token: {GOOGLE_ADS_DEVELOPER_TOKEN}
- login-customer-id: {MCC_CUSTOMER_ID} (if using MCC)

**Note:** cost_micros ÷ 1,000,000 = local currency value

---

## TikTok Marketing API

### Campaign Report
```
GET /report/integrated/get
  ?advertiser_id={advertiser_id}
  &data_level=AUCTION_CAMPAIGN
  &dimensions=["campaign_id","stat_time_day"]
  &metrics=["spend","impressions","clicks","conversion","reach"]
  &start_date=YYYY-MM-DD
  &end_date=YYYY-MM-DD
```

### Lead Export
```
GET /pages/{page_id}/leads
```

---

## GA4 Data API

### Session Report
```
POST /v1beta/{property}/runReport
{
  "dateRanges": [{"startDate": "30daysAgo", "endDate": "today"}],
  "dimensions": [
    {"name": "date"},
    {"name": "sessionSource"},
    {"name": "sessionMedium"},
    {"name": "sessionCampaignName"}
  ],
  "metrics": [
    {"name": "sessions"},
    {"name": "engagedSessions"},
    {"name": "totalUsers"},
    {"name": "conversions"}
  ]
}
```

---

## Implementation Notes

1. All sync functions should use apiMappers.ts for parsing:
   - mapMetaCampaign, mapMetaAdSet, mapMetaAd, mapMetaLead
   - mapGoogleCampaign, mapGoogleAdGroup, mapGoogleAd
   - mapTikTokCampaign, mapTikTokAdGroup, mapTikTokAd, mapTikTokLead
   - mapGA4Session

2. Token refresh: Use google/oauth.ts getValidAccessToken for Google

3. Tenant context: All syncs need tenantId from connected_accounts

4. Error handling: Catch API errors, update account status to 'error'
