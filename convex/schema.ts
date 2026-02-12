import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const platformValidator = v.union(
  v.literal("google"),
  v.literal("meta"),
  v.literal("tiktok")
);

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
  }),

  user_auth: defineTable({
    userId: v.id("users"),
    platform: platformValidator,
    encryptedAccessToken: v.string(),
    encryptedRefreshToken: v.optional(v.string()),
    tokenExpiresAt: v.number(),
    scopes: v.array(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_platform", ["userId", "platform"]),

  connected_accounts: defineTable({
    userId: v.id("users"),
    platform: platformValidator,
    platformAccountId: v.string(),
    accountName: v.string(),
    accountType: v.string(),
    syncEnabled: v.boolean(),
    connectedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_platform", ["userId", "platform"])
    .index("by_platform_account", ["platform", "platformAccountId"]),
});
