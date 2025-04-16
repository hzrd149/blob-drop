import { decodePaymentRequest } from "@cashu/cashu-ts";
import { generateSecretKey } from "nostr-tools";

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

if (CASHU_PAYOUT.singleUse)
  throw new Error("CASHU_PAYOUT can not be a single use payment request");

/** How long to store blobs in seconds */
export const STORAGE_DURATION = process.env.STORAGE_DURATION
  ? parseInt(process.env.STORAGE_DURATION)
  : 60 * 60 * 24; // 1 day

/** The amount of sats to charge per byte */
export const PRICE_PER_BYTE = process.env.PRICE_PER_BYTE
  ? parseFloat(process.env.PRICE_PER_BYTE)
  : 1 / 1000; // default 1 sat per kb

/** The interval to prune expired blobs in seconds */
export const PRUNE_INTERVAL = process.env.PRUNE_INTERVAL
  ? parseInt(process.env.PRUNE_INTERVAL)
  : 60 * 60; // 1 hour

/** The threshold to payout the tokens */
export const PAYOUT_THRESHOLD = process.env.PAYOUT_THRESHOLD
  ? parseInt(process.env.PAYOUT_THRESHOLD)
  : 1000; // 1000 sats

/** The interval to payout the tokens in seconds */
export const PAYOUT_INTERVAL = process.env.PAYOUT_INTERVAL
  ? parseInt(process.env.PAYOUT_INTERVAL)
  : 60 * 60; // 1 hour

/** The nostr key to use for payout (in hex format) (default: random) */
export const PAYOUT_NOSTR_KEY = process.env.PAYOUT_NOSTR_KEY
  ? new Uint8Array(Buffer.from(process.env.PAYOUT_NOSTR_KEY, "hex"))
  : generateSecretKey();
