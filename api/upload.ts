import {
  getDecodedToken,
  getEncodedToken,
  PaymentRequest,
} from "@cashu/cashu-ts";
import mime from "mime-types";

import type { BlobRow } from "../db/types";
import { insertBlob, insertToken } from "../db/utils";
import { CASHU_PAYOUT, STORAGE_DURATION } from "../env";
import { deleteBlob, saveBlob } from "../storage";
import {
  calculateRequiredAmount,
  createErrorResponse,
  getWallet,
} from "./utils";

export async function handleUploadRequest(req: Request): Promise<Response> {
  const contentLength = req.headers.get("content-length");
  if (!contentLength)
    return createErrorResponse("Content-Length header is required", 411);

  const requiredAmount = calculateRequiredAmount(parseInt(contentLength));

  const cashuTokenStr = req.headers.get("x-cashu");

  // If no cashu token or HEAD request, create a new payment request
  if (!cashuTokenStr || req.method === "HEAD") {
    const pr = new PaymentRequest(
      CASHU_PAYOUT.transport,
      undefined,
      requiredAmount,
      CASHU_PAYOUT.unit,
      CASHU_PAYOUT.mints,
      `Payment for upload`,
      false,
    );

    // Clear the transport since HTTP x-cashu requires no transport
    pr.transport = [];

    return createErrorResponse("Payment required", 402, {
      "x-cashu": pr.toEncodedRequest(),
    });
  }

  // Parse and verify the cashu token
  const token = getDecodedToken(cashuTokenStr);
  const total = token.proofs.reduce((t, p) => t + p.amount, 0);
  if (total < requiredAmount) {
    return createErrorResponse("Invalid or insufficient Cashu token", 400);
  }

  // Only PUT requests are allowed
  if (req.method !== "PUT")
    return createErrorResponse("Method not allowed", 405);

  let sha256: string | undefined = undefined;
  try {
    // Accept upload
    const buffer = await req.arrayBuffer();

    // Save the blob to storage
    const type = req.headers.get("content-type") || "application/octet-stream";
    const ext = mime.extension(type) || undefined;
    sha256 = await saveBlob(Buffer.from(buffer), ext);

    // Swap tokens and save to db
    const wallet = getWallet(token.mint);
    const proofs = await wallet.receive(token);
    const receivedAmount = proofs.reduce((t, p) => t + p.amount, 0);
    const newToken = getEncodedToken({
      mint: wallet.mint.mintUrl,
      proofs,
      memo: sha256,
    });

    console.log(`Received ${receivedAmount} sats for ${sha256}`);

    // Save token to DB
    insertToken({
      token: newToken,
      mint: wallet.mint.mintUrl,
      amount: receivedAmount,
    });

    const metadata: BlobRow = {
      sha256,
      size: parseInt(contentLength),
      type,
      uploaded: Date.now(),
      expires: Date.now() + STORAGE_DURATION * 1000,
    };

    // Save blob to DB
    await insertBlob(metadata);

    const descriptor = {
      url: new URL(
        `/${sha256}` + `${ext ? `.${ext}` : ""}`,
        req.url,
      ).toString(),
      sha256,
      size: metadata.size,
      type: metadata.type,
      uploaded: metadata.uploaded,
    };

    return new Response(JSON.stringify(descriptor), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Upload error:", error);

    if (sha256) await deleteBlob(sha256);

    return createErrorResponse("Internal server error", 500);
  }
}
