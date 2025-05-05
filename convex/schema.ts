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
  }).index("by_author", ["authorId"]),
  
  steps: defineTable({
    sopId: v.id("sops"),
    orderIndex: v.number(),
    instruction: v.string(),
    imageId: v.optional(v.id("_storage")),
    videoId: v.optional(v.id("_storage")),
  }).index("by_sop", ["sopId", "orderIndex"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
