import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import OpenAI from "openai";

// Initialize OpenAI client only when needed to avoid API key errors
let openai: OpenAI | null = null;

const initOpenAI = () => {
  if (!openai) {
    openai = new OpenAI({
      baseURL: process.env.CONVEX_OPENAI_BASE_URL,
      apiKey: process.env.CONVEX_OPENAI_API_KEY,
    });
  }
  return openai;
};

export const createSOP = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    materials: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.insert("sops", {
      ...args,
      authorId: userId,
      status: "draft",
      lastModified: Date.now(),
    });
  },
});

export const updateSOP = mutation({
  args: {
    id: v.id("sops"),
    title: v.string(),
    description: v.string(),
    materials: v.optional(v.string()),
    materialMappings: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const sop = await ctx.db.get(args.id);
    if (!sop) throw new Error("SOP not found");
    
    // Check if user has edit permissions
    const hasEditAccess = 
      // User is the author
      sop.authorId === userId ||
      // User has edit or admin permission
      (await ctx.db
        .query("sopShares")
        .withIndex("by_sop", (q) => 
          q.eq("sopId", args.id)
        )
        .filter(share => 
          share.eq(share.field("userId"), userId) &&
          (share.eq(share.field("permission"), "edit") || share.eq(share.field("permission"), "admin"))
        )
        .unique()) !== null;

    if (!hasEditAccess) {
      throw new Error("Not authorized to edit this SOP");
    }

    await ctx.db.patch(args.id, {
      title: args.title,
      description: args.description,
      materials: args.materials,
      materialMappings: args.materialMappings,
      lastModified: Date.now(),
    });
  },
});

export const deleteSOP = mutation({
  args: {
    id: v.id("sops"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const sop = await ctx.db.get(args.id);
    if (!sop) throw new Error("SOP not found");
    if (sop.authorId !== userId) throw new Error("Not authorized");

    // Delete all steps first
    const steps = await ctx.db
      .query("steps")
      .withIndex("by_sop", (q) => q.eq("sopId", args.id))
      .collect();
    
    for (const step of steps) {
      await ctx.db.delete(step._id);
    }

    // Then delete the SOP
    await ctx.db.delete(args.id);
  },
});

export const listSOPs = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("sops")
      .withIndex("by_author", (q) => q.eq("authorId", userId))
      .collect();
  },
});

/**
 * Get a specific SOP with its steps, checking for access permissions
 */

export const getSteps = query({
  args: { sopId: v.id("sops") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("steps")
      .withIndex("by_sop", (q) => q.eq("sopId", args.sopId))
      .order("asc")
      .collect();
  },
});

export const addStep = mutation({
  args: {
    sopId: v.id("sops"),
    instruction: v.string(),
    orderIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Verify the SOP exists and user has permission
    const sop = await ctx.db.get(args.sopId);
    if (!sop) throw new Error("SOP not found");
    
    // Check if user has edit permissions
    const hasEditAccess = 
      // User is the author
      sop.authorId === userId ||
      // User has edit or admin permission
      (await ctx.db
        .query("sopShares")
        .withIndex("by_sop", (q) => 
          q.eq("sopId", args.sopId)
        )
        .filter(share => 
          share.eq(share.field("userId"), userId) &&
          (share.eq(share.field("permission"), "edit") || share.eq(share.field("permission"), "admin"))
        )
        .unique()) !== null;

    if (!hasEditAccess) {
      throw new Error("Not authorized to edit this SOP");
    }

    await ctx.db.patch(args.sopId, { lastModified: Date.now() });
    return await ctx.db.insert("steps", args);
  },
});

export const updateStep = mutation({
  args: {
    stepId: v.id("steps"),
    instruction: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const step = await ctx.db.get(args.stepId);
    if (!step) throw new Error("Step not found");

    const sop = await ctx.db.get(step.sopId);
    if (!sop) throw new Error("SOP not found");
    
    // Check if user has edit permissions
    const hasEditAccess = 
      // User is the author
      sop.authorId === userId ||
      // User has edit or admin permission
      (await ctx.db
        .query("sopShares")
        .withIndex("by_sop", (q) => 
          q.eq("sopId", step.sopId)
        )
        .filter(share => 
          share.eq(share.field("userId"), userId) &&
          (share.eq(share.field("permission"), "edit") || share.eq(share.field("permission"), "admin"))
        )
        .unique()) !== null;

    if (!hasEditAccess) {
      throw new Error("Not authorized to edit this SOP");
    }

    await ctx.db.patch(args.stepId, { instruction: args.instruction });
    await ctx.db.patch(step.sopId, { lastModified: Date.now() });
  },
});

export const deleteStep = mutation({
  args: {
    stepId: v.id("steps"),
    sopId: v.id("sops"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await ctx.db.delete(args.stepId);
    
    // Update orderIndex for remaining steps
    const remainingSteps = await ctx.db
      .query("steps")
      .withIndex("by_sop", (q) => q.eq("sopId", args.sopId))
      .order("asc")
      .collect();
    
    for (let i = 0; i < remainingSteps.length; i++) {
      await ctx.db.patch(remainingSteps[i]._id, { orderIndex: i });
    }
    
    await ctx.db.patch(args.sopId, { lastModified: Date.now() });
  },
});

export const generateSteps = action({
  args: {
    topic: v.string(),
    context: v.string(),
  },
  handler: async (ctx, args) => {
    const prompt = `Create a concise, practical ${args.topic} procedure in 3-5 steps. Context: ${args.context}. Format as a numbered list. Be brief and clear.`;
    
    // Initialize OpenAI client only when needed
    const openaiClient = initOpenAI();
    
    const response = await openaiClient.chat.completions.create({
      model: "gpt-4.1-nano",
      messages: [{ role: "user", content: prompt }],
    });

    return response.choices[0].message.content;
  },
});

export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.storage.generateUploadUrl();
  },
});

export const uploadFile = mutation({
  args: {
    sopId: v.id("sops"),
    stepId: v.id("steps"),
    storageId: v.id("_storage"),
    type: v.union(v.literal("image"), v.literal("video")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Verify the SOP exists and user has permission
    const sop = await ctx.db.get(args.sopId);
    if (!sop) throw new Error("SOP not found");
    
    // Check if user has edit permissions
    const hasEditAccess = 
      // User is the author
      sop.authorId === userId ||
      // User has edit or admin permission
      (await ctx.db
        .query("sopShares")
        .withIndex("by_sop", (q) => 
          q.eq("sopId", args.sopId)
        )
        .filter(share => 
          share.eq(share.field("userId"), userId) &&
          (share.eq(share.field("permission"), "edit") || share.eq(share.field("permission"), "admin"))
        )
        .unique()) !== null;

    if (!hasEditAccess) {
      throw new Error("Not authorized to edit this SOP");
    }

    await ctx.db.patch(args.stepId, {
      [args.type === "image" ? "imageId" : "videoId"]: args.storageId,
    });
  },
});

export const getStorageUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

export const getSopWithSteps = query({
  args: { sopId: v.id("sops") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    
    const sop = await ctx.db.get(args.sopId);
    if (!sop) throw new Error("SOP not found");

    // Check if user has access to this SOP
    const hasAccess = 
      // User is the author
      sop.authorId === userId ||
      // SOP is public
      sop.isPublic === true ||
      // User has been granted access
      (await ctx.db
        .query("sopShares")
        .withIndex("by_sop", (q) => 
          q.eq("sopId", args.sopId)
        )
        .filter(share => share.eq(share.field("userId"), userId))
        .unique()) !== null;

    if (!hasAccess) {
      throw new Error("Not authorized to view this SOP");
    }

    const steps = await ctx.db
      .query("steps")
      .withIndex("by_sop", (q) => q.eq("sopId", args.sopId))
      .order("asc")
      .collect();

    return { sop, steps };
  },
});

// Add the missing updateStepOrder function to fix drag and drop functionality
export const updateStepOrder = mutation({
  args: {
    sopId: v.id("sops"),
    updates: v.array(
      v.object({
        id: v.id("steps"),
        orderIndex: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Verify the SOP exists and user has permission
    const sop = await ctx.db.get(args.sopId);
    if (!sop) throw new Error("SOP not found");
    
    // Check if user has edit permissions
    const hasEditAccess = 
      // User is the author
      sop.authorId === userId ||
      // User has edit or admin permission
      (await ctx.db
        .query("sopShares")
        .withIndex("by_sop", (q) => 
          q.eq("sopId", args.sopId)
        )
        .filter(share => 
          share.eq(share.field("userId"), userId) &&
          (share.eq(share.field("permission"), "edit") || share.eq(share.field("permission"), "admin"))
        )
        .unique()) !== null;

    if (!hasEditAccess) {
      throw new Error("Not authorized to edit this SOP");
    }

    // Update each step's order index
    for (const update of args.updates) {
      await ctx.db.patch(update.id, { orderIndex: update.orderIndex });
    }

    // Update the SOP's last modified timestamp
    await ctx.db.patch(args.sopId, { lastModified: Date.now() });
  },
});
