import db from "./index";
import type { BlobRow, TokenRow } from "./types";

// Blob operations
export const insertBlob = (blob: BlobRow) => {
  const stmt = db.prepare(`
    INSERT INTO blobs (sha256, size, type, uploaded, expires)
    VALUES (?, ?, ?, ?, ?)
  `);
  return stmt.run(
    blob.sha256,
    blob.size,
    blob.type || null,
    blob.uploaded,
    blob.expires || null,
  );
};

export const getBlob = (sha256: string) => {
  const stmt = db.prepare("SELECT * FROM blobs WHERE sha256 = ?");
  return stmt.get(sha256) as BlobRow | null;
};

export const deleteBlob = (sha256: string) => {
  const stmt = db.prepare("DELETE FROM blobs WHERE sha256 = ?");
  return stmt.run(sha256);
};

// Token operations
export const insertToken = (token: TokenRow) => {
  const stmt = db.prepare(`
    INSERT INTO tokens (token, mint, amount)
    VALUES (?, ?, ?)
  `);
  return stmt.run(token.token, token.mint, token.amount);
};

export const getToken = (token: string) => {
  const stmt = db.prepare("SELECT * FROM tokens WHERE token = ?");
  return stmt.get(token) as TokenRow | null;
};

export const deleteToken = (token: string) => {
  const stmt = db.prepare("DELETE FROM tokens WHERE token = ?");
  return stmt.run(token);
};
