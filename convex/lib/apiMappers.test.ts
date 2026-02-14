import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  mapGA4Session,
  mapGoogleAd,
  mapGoogleAdGroup,
  mapGoogleCampaign,
  mapMetaAd,
  mapMetaAdSet,
  mapMetaCampaign,
  mapMetaLead,
  mapTikTokAd,
  mapTikTokAdGroup,
  mapTikTokCampaign,
  mapTikTokLead,
} from "./apiMappers.ts";

function withFixedNow<T>(timestamp: number, callback: () => T): T {
  const originalNow = Date.now;
  Date.now = () => timestamp;
  try {
    return callback();
  } finally {
    Date.now = originalNow;
  }
}

describe("mapMetaCampaign", () => {
  it("maps actions, spend, and normalized status", () => {
    const result = withFixedNow(1_700_000_000_000, () =>
      mapMetaCampaign({
        account_id: "act_123",
        date_start: "2026/2/5",
        campaign_id: "cmp_1",
        campaign_name: "Meta Campaign",
        status: "ARCHIVED",
        spend: "123.45",
        impressions: "1000",
        clicks: "50",
        actions: [
          { action_type: "lead", value: "4" },
          { action_type: "purchase", value: "2" },
          { action_type: "message_contacts_new", value: "3" },
        ],
      })
    );

    assert.equal(result.platform, "meta");
    assert.equal(result.platformAccountId, "act_123");
    assert.equal(result.date, "2026-02-05");
    assert.equal(result.spend, 123.45);
    assert.equal(result.leads, 7);
    assert.equal(result.conversions, 2);
    assert.equal(result.campaignStatus, "deleted");
    assert.equal(result.syncedAt, 1_700_000_000_000);
  });
});

describe("mapMetaAdSet", () => {
  it("maps ad set fields", () => {
    const result = mapMetaAdSet({
      account_id: "act_123",
      date_start: "2026-02-06",
      campaign_id: "cmp_1",
      campaign_name: "Campaign",
      adset_id: "set_1",
      adset_name: "Ad Set 1",
      status: "ACTIVE",
      spend: "50.5",
      impressions: "400",
      clicks: "20",
      actions: [{ action_type: "purchase", value: "1" }],
    });

    assert.equal(result.platform, "meta");
    assert.equal(result.adSetExternalId, "set_1");
    assert.equal(result.adSetName, "Ad Set 1");
    assert.equal(result.adSetStatus, "active");
    assert.equal(result.conversions, 1);
    assert.equal(result.spend, 50.5);
  });
});

describe("mapMetaAd", () => {
  it("maps ad fields", () => {
    const result = mapMetaAd({
      account_id: "act_123",
      date_start: "2026-02-07",
      campaign_id: "cmp_1",
      adset_id: "set_1",
      adset_name: "Set Name",
      ad_id: "ad_1",
      ad_name: "Ad Name",
      status: "PAUSED",
      spend: "12.2",
      impressions: "100",
      clicks: "4",
      actions: [{ action_type: "lead", value: "2" }],
    });

    assert.equal(result.platform, "meta");
    assert.equal(result.adExternalId, "ad_1");
    assert.equal(result.adName, "Ad Name");
    assert.equal(result.adStatus, "paused");
    assert.equal(result.leads, 2);
  });
});

describe("mapMetaLead", () => {
  it("extracts full name, phone, email from field_data and parses capturedAt", () => {
    const result = withFixedNow(1_700_000_000_000, () =>
      mapMetaLead({
        id: "lead_1",
        ad_account_id: "act_123",
        campaign_id: "cmp_1",
        adset_id: "set_1",
        ad_id: "ad_1",
        created_time: "2026-02-01T11:22:33Z",
        field_data: [
          { name: "full_name", values: ["Jane Doe"] },
          { name: "phone_number", values: ["+595111222"] },
          { name: "email", values: ["jane@example.com"] },
        ],
      })
    );

    assert.equal(result.sourcePlatform, "meta");
    assert.equal(result.platformAccountId, "act_123");
    assert.equal(result.leadExternalId, "lead_1");
    assert.equal(result.name, "Jane Doe");
    assert.equal(result.phone, "+595111222");
    assert.equal(result.email, "jane@example.com");
    assert.equal(result.capturedAt, Date.parse("2026-02-01T11:22:33Z"));
    assert.equal(result.importedAt, 1_700_000_000_000);
  });
});

describe("mapGoogleCampaign", () => {
  it("converts cost_micros and normalizes status", () => {
    const result = mapGoogleCampaign({
      customer: { id: "customers/777", currencyCode: "USD" },
      campaign: { id: "cmp_1", name: "Search Campaign", status: "ENABLED" },
      segments: { date: "2026-02-08" },
      metrics: {
        costMicros: 2_500_000,
        impressions: "500",
        clicks: "25",
        conversions: "5",
      },
    });

    assert.equal(result.platform, "google");
    assert.equal(result.platformAccountId, "777");
    assert.equal(result.spend, 2.5);
    assert.equal(result.campaignStatus, "active");
    assert.equal(result.conversions, 5);
  });
});

describe("mapGoogleAdGroup", () => {
  it("maps ad_group fields to ad set naming", () => {
    const result = mapGoogleAdGroup({
      customer_id: "123",
      segments_date: "2026-02-09",
      campaign: { id: "cmp_1", name: "Campaign 1" },
      ad_group: { id: "grp_1", name: "Ad Group 1", status: "PAUSED" },
      metrics: { cost_micros: "1000000", impressions: "200", clicks: "8" },
    });

    assert.equal(result.platform, "google");
    assert.equal(result.adSetExternalId, "grp_1");
    assert.equal(result.adSetName, "Ad Group 1");
    assert.equal(result.adSetStatus, "paused");
    assert.equal(result.spend, 1);
  });
});

describe("mapGoogleAd", () => {
  it("maps nested ad group ad shape", () => {
    const result = mapGoogleAd({
      customer_id: "123",
      segments_date: "2026-02-10",
      campaign: { id: "cmp_1", name: "Campaign 1" },
      ad_group: { id: "grp_1", name: "Group 1" },
      ad_group_ad: { status: "REMOVED", ad: { id: "ad_1", name: "Ad 1" } },
      metrics: { cost_micros: 900000, impressions: 80, clicks: 3 },
    });

    assert.equal(result.platform, "google");
    assert.equal(result.adExternalId, "ad_1");
    assert.equal(result.adName, "Ad 1");
    assert.equal(result.adStatus, "deleted");
    assert.equal(result.spend, 0.9);
  });
});

describe("mapTikTokCampaign", () => {
  it("maps adgroup_id, conversion, date, and status", () => {
    const result = mapTikTokCampaign({
      advertiser_id: "adv_1",
      campaign_id: "cmp_1",
      campaign_name: "TikTok Campaign",
      adgroup_id: "grp_1",
      stat_time_day: "2026-02-11",
      status: "STATUS_DISABLE",
      spend: "10.5",
      impressions: "300",
      clicks: "12",
      conversion: "4",
    });

    assert.equal(result.platform, "tiktok");
    assert.equal(result.adSetExternalId, "grp_1");
    assert.equal(result.date, "2026-02-11");
    assert.equal(result.conversions, 4);
    assert.equal(result.campaignStatus, "paused");
  });
});

describe("mapTikTokAdGroup", () => {
  it("maps ad set fields and status", () => {
    const result = mapTikTokAdGroup({
      advertiser_id: "adv_1",
      campaign_id: "cmp_1",
      adgroup_id: "grp_1",
      adgroup_name: "Ad Group 1",
      status: "STATUS_ENABLE",
      stat_time_day: "2026-02-12",
      spend: "20",
      impressions: "400",
      clicks: "16",
      conversion: "2",
    });

    assert.equal(result.platform, "tiktok");
    assert.equal(result.adSetExternalId, "grp_1");
    assert.equal(result.adSetName, "Ad Group 1");
    assert.equal(result.adSetStatus, "active");
    assert.equal(result.conversions, 2);
  });
});

describe("mapTikTokAd", () => {
  it("maps ad fields and deleted status", () => {
    const result = mapTikTokAd({
      advertiser_id: "adv_1",
      campaign_id: "cmp_1",
      adgroup_id: "grp_1",
      ad_id: "ad_1",
      ad_name: "TikTok Ad 1",
      status: "STATUS_DELETE",
      stat_time_day: "2026-02-13",
      spend: "9.9",
      impressions: "120",
      clicks: "6",
    });

    assert.equal(result.platform, "tiktok");
    assert.equal(result.adExternalId, "ad_1");
    assert.equal(result.adName, "TikTok Ad 1");
    assert.equal(result.adStatus, "deleted");
  });
});

describe("mapTikTokLead", () => {
  it("extracts contact details and parses capture time", () => {
    const result = withFixedNow(1_700_000_000_000, () =>
      mapTikTokLead({
        advertiser_id: "adv_1",
        lead_id: "lead_1",
        campaign_id: "cmp_1",
        adgroup_id: "grp_1",
        ad_id: "ad_1",
        create_time: 1_700_000_000,
        answers: [
          { question: "Full Name", answer: "Ana Perez" },
          { question: "Email", answer: "ana@example.com" },
          { question: "Phone Number", answer: "+595999000" },
        ],
      })
    );

    assert.equal(result.sourcePlatform, "tiktok");
    assert.equal(result.platformAccountId, "adv_1");
    assert.equal(result.leadExternalId, "lead_1");
    assert.equal(result.name, "Ana Perez");
    assert.equal(result.email, "ana@example.com");
    assert.equal(result.phone, "+595999000");
    assert.equal(result.capturedAt, 1_700_000_000_000);
    assert.equal(result.importedAt, 1_700_000_000_000);
  });
});

describe("mapGA4Session", () => {
  it("maps source/medium/campaign aliases", () => {
    const result = mapGA4Session({
      ga4PropertyId: "prop_1",
      date: "2026-02-14",
      sessionSource: "google",
      sessionMedium: "cpc",
      sessionCampaignName: "spring_sale",
      sessions: "150",
      engagedSessions: "90",
    });

    assert.equal(result.ga4PropertyId, "prop_1");
    assert.equal(result.source, "google");
    assert.equal(result.medium, "cpc");
    assert.equal(result.campaignName, "spring_sale");
    assert.equal(result.sessions, 150);
    assert.equal(result.engagedSessions, 90);
  });
});

describe("mapper safety", () => {
  it("handles null and undefined inputs gracefully", () => {
    assert.doesNotThrow(() => mapMetaCampaign(null));
    assert.doesNotThrow(() => mapMetaAdSet(undefined));
    assert.doesNotThrow(() => mapMetaAd(null));
    assert.doesNotThrow(() => mapMetaLead(undefined));
    assert.doesNotThrow(() => mapGoogleCampaign(null));
    assert.doesNotThrow(() => mapGoogleAdGroup(undefined));
    assert.doesNotThrow(() => mapGoogleAd(null));
    assert.doesNotThrow(() => mapTikTokCampaign(undefined));
    assert.doesNotThrow(() => mapTikTokAdGroup(null));
    assert.doesNotThrow(() => mapTikTokAd(undefined));
    assert.doesNotThrow(() => mapTikTokLead(null));
    assert.doesNotThrow(() => mapGA4Session(undefined));
  });
});
