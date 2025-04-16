import { CashuMint, CashuWallet } from "@cashu/cashu-ts";
import { PRICE_PER_BYTE } from "../env";

export function calculateRequiredAmount(contentLength: number): number {
  return Math.ceil(contentLength * PRICE_PER_BYTE);
}

const wallets = new Map<string, CashuWallet>();

/** Get or create a wallet for a mint URL */
export function getWallet(mint: string): CashuWallet {
  if (!wallets.has(mint)) {
    wallets.set(mint, new CashuWallet(new CashuMint(mint)));
  }

  return wallets.get(mint)!;
}

/**
 * Creates a Response object with an error status and x-reason header
 * @param message The error message to include in the x-reason header
 * @param status The HTTP status code (defaults to 400)
 * @param additionalHeaders Optional additional headers to include
 */
export function createErrorResponse(
  message: string,
  status: number = 400,
  additionalHeaders?: Record<string, string>,
): Response {
  return new Response(message, {
    status,
    headers: {
      "x-reason": message,
      ...additionalHeaders,
    },
  });
}
