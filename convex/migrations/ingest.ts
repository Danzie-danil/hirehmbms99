import { mutation, query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Idempotent batch insertion mutation for migration data.
 * Checks legacyId before inserting to avoid duplicates.
 */
export const insertBatch = mutation({
  args: {
    table: v.string(),
    documents: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    let inserted = 0;
    let skipped = 0;

    for (const doc of args.documents) {
      // 1. If document has a legacyId, check if it was already imported
      if (doc.legacyId) {
        const existing = await ctx.db
          .query(args.table as any)
          .filter((q) => q.eq(q.field("legacyId"), doc.legacyId))
          .first();

        if (existing) {
          skipped++;
          continue;
        }
      } else if (args.table === "sysSettings" && doc.key) {
        const existing = await ctx.db
          .query("sysSettings")
          .withIndex("by_key", (q) => q.eq("key", doc.key))
          .first();

        if (existing) {
          skipped++;
          continue;
        }
      }

      // 2. Insert into the target table
      const newId = await ctx.db.insert(args.table as any, doc);

      // 3. Populate migrationIdMap for relationship preservation
      if (doc.legacyId) {
        await ctx.db.insert("migrationIdMap", {
          entityType: args.table,
          oldSupabaseId: doc.legacyId,
          newConvexId: newId,
          createdAt: new Date().toISOString(),
        });
      }

      inserted++;
    }

    return { table: args.table, inserted, skipped, total: args.documents.length };
  },
});

/**
 * Verification query to return record counts across migrated tables in Convex.
 */
export const getTableCounts = query({
  args: {},
  handler: async (ctx) => {
    const tables = [
      "profiles",
      "branches",
      "pricingPlans",
      "sysSettings",
      "migrationIdMap"
    ];
    const counts: Record<string, number> = {};
    for (const table of tables) {
      const records = await ctx.db.query(table as any).collect();
      counts[table] = records.length;
    }
    return counts;
  },
});

