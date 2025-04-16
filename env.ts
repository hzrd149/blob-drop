import { decodePaymentRequest } from "@cashu/cashu-ts";

/** The port to run the server on */
export const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

/** A path to a directory where blobs are stored */
export const STORAGE_DIR = process.env.STORAGE_DIR ?? "./data/blobs";

/** Path to the SQLite database file */
export const DATABASE_PATH = process.env.DATABASE_PATH ?? "./data/storage.db";

if (!process.env.CASHU_PAYOUT)
  throw new Error("Missing CASHU_PAYOUT environment variable");

/** A cashu payment request used to get the accepted mints and payout the tokens */
export const CASHU_PAYOUT = decodePaymentRequest(process.env.CASHU_PAYOUT);

/** How long to store blobs in seconds */
export const STORAGE_DURATION = process.env.STORAGE_DURATION
  ? parseInt(process.env.STORAGE_DURATION)
  : 60 * 60 * 24; // 1 day

/** The amount of sats to charge per byte */
export const PRICE_PER_BYTE = process.env.PRICE_PER_BYTE
  ? parseFloat(process.env.PRICE_PER_BYTE)
  : 1 / (1024 * 1024); // default 1 sat per mb
