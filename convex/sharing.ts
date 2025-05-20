import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Share an SOP with another user
 */
export const shareSOP = mutation({
  args: {
    sopId: v.id("sops"),
    userId: v.id("users"),
    permission: v.string(), // "view", "edit", "admin"
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) throw new Error("Not authenticated");

    // Check if the current user is the author or has admin permission
    const sop = await ctx.db.get(args.sopId);
    if (!sop) throw new Error("SOP not found");

    if (sop.authorId !== currentUserId) {
      // Check if the user has admin permission
      const userShare = await ctx.db
        .query("sopShares")
        .withIndex("by_sop", (q) => 
          q.eq("sopId", args.sopId)
        )
        .filter(q => q.eq("userId", currentUserId))
        .unique();

      if (!userShare || userShare.permission !== "admin") {
        throw new Error("Not authorized to share this SOP");
      }
    }

    // Check if the share already exists
    const existingShare = await ctx.db
      .query("sopShares")
      .withIndex("by_sop", (q) => 
        q.eq("sopId", args.sopId)
      )
      .filter(q => q.eq("userId", args.userId))
      .unique();

    if (existingShare) {
      // Update existing share
      await ctx.db.patch(existingShare._id, {
        permission: args.permission,
        sharedBy: currentUserId,
        sharedAt: Date.now(),
      });
      return existingShare._id;
    } else {
      // Create new share
      return await ctx.db.insert("sopShares", {
        sopId: args.sopId,
        userId: args.userId,
        permission: args.permission,
        sharedBy: currentUserId,
        sharedAt: Date.now(),
      });
    }
  },
});

/**
 * Remove sharing permission for a user
 */
export const removeSopShare = mutation({
  args: {
    sopId: v.id("sops"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) throw new Error("Not authenticated");

    // Check if the current user is the author or has admin permission
    const sop = await ctx.db.get(args.sopId);
    if (!sop) throw new Error("SOP not found");

    if (sop.authorId !== currentUserId) {
      // Check if the user has admin permission
      const userShare = await ctx.db
        .query("sopShares")
        .withIndex("by_sop", (q) => 
          q.eq("sopId", args.sopId)
        )
        .filter(q => q.eq("userId", currentUserId))
        .unique();

      if (!userShare || userShare.permission !== "admin") {
        throw new Error("Not authorized to modify sharing permissions");
      }
    }

    // Find and delete the share
    const share = await ctx.db
      .query("sopShares")
      .withIndex("by_sop", (q) => 
        q.eq("sopId", args.sopId)
      )
      .filter(q => q.eq("userId", args.userId))
      .unique();

    if (share) {
      await ctx.db.delete(share._id);
    }
  },
});

/**
 * Make an SOP public or private
 */
export const setSOPVisibility = mutation({
  args: {
    sopId: v.id("sops"),
    isPublic: v.boolean(),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) throw new Error("Not authenticated");

    // Check if the current user is the author or has admin permission
    const sop = await ctx.db.get(args.sopId);
    if (!sop) throw new Error("SOP not found");

    if (sop.authorId !== currentUserId) {
      // Check if the user has admin permission
      const userShare = await ctx.db
        .query("sopShares")
        .withIndex("by_sop", (q) => 
          q.eq("sopId", args.sopId)
        )
        .filter(q => q.eq("userId", currentUserId))
        .unique();

      if (!userShare || userShare.permission !== "admin") {
        throw new Error("Not authorized to change SOP visibility");
      }
    }

    await ctx.db.patch(args.sopId, { isPublic: args.isPublic });
  },
});

/**
 * Get SOPs shared with the current user
 */
export const getSharedSOPs = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Get all shares for this user
    const shares = await ctx.db
      .query("sopShares")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Get the SOPs
    const sopIds = shares.map((share) => share.sopId);
    const sops = await Promise.all(
      sopIds.map(async (sopId) => {
        const sop = await ctx.db.get(sopId);
        if (!sop) return null;

        // Get the author's information
        const author = await ctx.db.get(sop.authorId);
        const authorName = author ? author.name || author.email : "Unknown";

        // Get the share details
        const share = shares.find((s) => s.sopId === sopId);

        return {
          ...sop,
          authorName,
          permission: share ? share.permission : "view",
        };
      })
    );

    // Filter out any null values (in case a SOP was deleted)
    return sops.filter(Boolean);
  },
});

/**
 * Get public SOPs
 */
export const getPublicSOPs = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Get all public SOPs
    const publicSops = await ctx.db
      .query("sops")
      .withIndex("public_sops", (q) => q.eq("isPublic", true))
      .collect();

    // Get author information for each SOP
    const sopsWithAuthor = await Promise.all(
      publicSops.map(async (sop) => {
        // Skip SOPs authored by the current user
        if (sop.authorId === userId) return null;

        // Get the author's information
        const author = await ctx.db.get(sop.authorId);
        const authorName = author ? author.name || author.email : "Unknown";

        return {
          ...sop,
          authorName,
        };
      })
    );

    // Filter out null values (user's own SOPs)
    return sopsWithAuthor.filter(Boolean);
  },
});

/**
 * Get users who have access to a SOP
 */
export const getSOPCollaborators = query({
  args: {
    sopId: v.id("sops"),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) throw new Error("Not authenticated");

    // Check if the current user has access to this SOP
    const sop = await ctx.db.get(args.sopId);
    if (!sop) throw new Error("SOP not found");

    const hasAccess = 
      sop.authorId === currentUserId ||
      (await ctx.db
        .query("sopShares")
        .withIndex("by_sop", (q) => 
          q.eq("sopId", args.sopId)
        )
        .filter(q => q.eq("userId", currentUserId))
        .unique()) !== null;

    if (!hasAccess) {
      throw new Error("Not authorized to view collaborators");
    }

    // Get all shares for this SOP
    const shares = await ctx.db
      .query("sopShares")
      .withIndex("by_sop", (q) => q.eq("sopId", args.sopId))
      .order("asc")
      .collect();

    // Get user information for each share
    const collaborators = await Promise.all(
      shares.map(async (share) => {
        const user = await ctx.db.get(share.userId);
        if (!user) return null;

        return {
          userId: share.userId,
          email: user.email,
          name: user.name,
          permission: share.permission,
          sharedAt: share.sharedAt,
        };
      })
    );

    // Filter out null values and return
    return collaborators.filter(Boolean);
  },
});

/**
 * Add a comment to an SOP
 */
export const addSOPComment = mutation({
  args: {
    sopId: v.id("sops"),
    content: v.string(),
    parentId: v.optional(v.id("sopComments")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if the user has access to this SOP
    const sop = await ctx.db.get(args.sopId);
    if (!sop) throw new Error("SOP not found");

    const hasAccess =
      sop.authorId === userId ||
      sop.isPublic ||
      (await ctx.db
        .query("sopShares")
        .withIndex("by_sop", (q) => 
          q.eq("sopId", args.sopId)
        )
        .filter(q => q.eq("userId", userId))
        .unique()) !== null;

    if (!hasAccess) {
      throw new Error("Not authorized to comment on this SOP");
    }

    // If this is a reply, check that the parent comment exists
    if (args.parentId) {
      const parentComment = await ctx.db.get(args.parentId);
      if (!parentComment || parentComment.sopId !== args.sopId) {
        throw new Error("Parent comment not found");
      }
    }

    // Create the comment
    return await ctx.db.insert("sopComments", {
      sopId: args.sopId,
      userId,
      content: args.content,
      createdAt: Date.now(),
      parentId: args.parentId,
    });
  },
});

/**
 * Get comments for an SOP
 */
export const getSOPComments = query({
  args: {
    sopId: v.id("sops"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if the user has access to this SOP
    const sop = await ctx.db.get(args.sopId);
    if (!sop) throw new Error("SOP not found");

    const hasAccess =
      sop.authorId === userId ||
      sop.isPublic ||
      (await ctx.db
        .query("sopShares")
        .withIndex("by_sop", (q) => 
          q.eq("sopId", args.sopId)
        )
        .filter(q => q.eq("userId", userId))
        .unique()) !== null;

    if (!hasAccess) {
      throw new Error("Not authorized to view comments on this SOP");
    }

    // Get all comments for this SOP
    const comments = await ctx.db
      .query("sopComments")
      .withIndex("by_sop", (q) => q.eq("sopId", args.sopId))
      .order("asc")
      .collect();

    // Get user information for each comment
    const commentsWithUser = await Promise.all(
      comments.map(async (comment) => {
        const user = await ctx.db.get(comment.userId);
        return {
          ...comment,
          userName: user ? user.name || user.email : "Unknown",
        };
      })
    );

    return commentsWithUser;
  },
});