import db from "../db/index";
import type { BlobRow } from "../db/types";
import { PRUNE_INTERVAL } from "../env";
import { deleteBlob } from "../storage";

/**
 * Delete expired blobs from both the database and storage
 */
export async function pruneExpiredBlobs() {
  const now = Date.now();

  // Find all expired blobs
  const stmt = db.prepare(`
    SELECT * FROM blobs
    WHERE expires IS NOT NULL
    AND expires < ?
  `);

  const expiredBlobs = stmt.all(now) as BlobRow[];

  // Delete each expired blob
  for (const blob of expiredBlobs) {
    try {
      // Delete from storage first
      await deleteBlob(blob.sha256);

      // Then delete from database
      const deleteStmt = db.prepare("DELETE FROM blobs WHERE sha256 = ?");
      deleteStmt.run(blob.sha256);

      console.log(`Pruned expired blob: ${blob.sha256}`);
    } catch (error) {
      console.error(`Failed to prune blob ${blob.sha256}:`, error);
    }
  }

  if (expiredBlobs.length > 0)
    console.log(
      `Pruning complete. Deleted ${expiredBlobs.length} expired blobs.`,
    );
}

// Run once on startup
pruneExpiredBlobs().catch(console.error);

// Run every interval (default hour)
setInterval(pruneExpiredBlobs, PRUNE_INTERVAL * 1000);
