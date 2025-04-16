import { createHash } from "crypto";
import { readdirSync } from "fs";
import { mkdir, unlink, writeFile } from "fs/promises";
import { join } from "path";
import { STORAGE_DIR } from "../env";

// Make sure the storage directory exists
await mkdir(STORAGE_DIR, { recursive: true });

// keep a list of all files in the storage directory
let files = readdirSync(STORAGE_DIR);

/** Saves a blob to the storage directory */
export async function saveBlob(
  data: Buffer,
  extension?: string,
): Promise<string> {
  const sha256 = createHash("sha256").update(data).digest("hex");

  const filename = extension
    ? `${sha256}.${extension.replace(/^\./, "")}`
    : sha256;
  const filepath = join(STORAGE_DIR, filename);
  await writeFile(filepath, data);
  files.push(filename);
  return sha256;
}

/** Deletes a blob from the storage directory */
export async function deleteBlob(sha256: string): Promise<void> {
  const filename = getBlobPath(sha256);
  if (!filename) return;

  await unlink(filename);
  files = files.filter((file) => file !== filename);
}

/** Returns true if a blob exists */
export function hasBlob(sha256: string): boolean {
  return !!getBlobPath(sha256);
}

/** Returns the path of a blob if it exists */
export function getBlobPath(sha256: string): string | null {
  const filename = files.find((file) => file.startsWith(sha256)) ?? null;
  return filename && join(STORAGE_DIR, filename);
}
