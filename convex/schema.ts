import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

const applicationTables = {
  sops: defineTable({
    title: v.string(),
    description: v.string(),
    authorId: v.id("users"),
    status: v.string(),
    lastModified: v.number(),
    materials: v.optional(v.string()),
    materialMappings: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
  }).index("by_author", ["authorId"])
    .index("public_sops", ["isPublic"]),
  
  steps: defineTable({
    sopId: v.id("sops"),
    orderIndex: v.number(),
    instruction: v.string(),
    imageId: v.optional(v.id("_storage")),
    videoId: v.optional(v.id("_storage")),
  }).index("by_sop", ["sopId", "orderIndex"]),

  // Table for SOP sharing permissions
  sopShares: defineTable({
    sopId: v.id("sops"),
    userId: v.id("users"),
    permission: v.string(), // "view", "edit", "admin"
    sharedBy: v.id("users"),
    sharedAt: v.number(),
  }).index("by_sop", ["sopId"])
    .index("by_user", ["userId"]),

  // Table for SOP comments/feedback
  sopComments: defineTable({
    sopId: v.id("sops"),
    userId: v.id("users"),
    content: v.string(),
    createdAt: v.number(),
    parentId: v.optional(v.id("sopComments")),
  }).index("by_sop", ["sopId"])
    .index("by_parent", ["parentId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
