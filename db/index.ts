import { Database } from "bun:sqlite";
import { mkdir } from "fs/promises";
import { dirname } from "path";

import { DATABASE_PATH } from "../env";

// Make sure the database directory exists
await mkdir(dirname(DATABASE_PATH), { recursive: true });

// Initialize the database
const db = new Database(DATABASE_PATH);

// Create the blobs table
db.run(`
  CREATE TABLE IF NOT EXISTS blobs (
    sha256 TEXT PRIMARY KEY,
    size INTEGER NOT NULL,
    type TEXT,
    uploaded INTEGER NOT NULL,
    expires INTEGER
  )
`);

// Create the tokens table
db.run(`
  CREATE TABLE IF NOT EXISTS tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT NOT NULL,
    mint TEXT NOT NULL,
    amount INTEGER NOT NULL
  )
`);

// Export the database instance
export default db;
