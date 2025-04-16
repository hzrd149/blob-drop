import { resolve, type BunRequest } from "bun";
import { getBlobPath } from "../storage";
import { getBlob } from "../db/utils";

export default function handleDownloadRequest(req: BunRequest<"/:sha256">) {
  const sha256 = req.params.sha256.match(/^[a-f0-9]{64}/)?.[0];
  if (!sha256) return new Response("Invalid SHA256", { status: 400 });

  const path = getBlobPath(sha256);
  if (!path) return new Response("Not found", { status: 404 });

  switch (req.method) {
    case "HEAD":
      return new Response(null, { status: 200 });
    case "GET":
      const metadata = getBlob(sha256);
      const file = Bun.file(path, {
        type: metadata?.type,
      });
      return new Response(file, { status: 200 });
  }

  return new Response("Method not allowed", { status: 405 });
}
