import {
  getDecodedToken,
  getEncodedToken,
  type PaymentRequestPayload,
  type Proof,
} from "@cashu/cashu-ts";
import db from "../db/index";
import {
  CASHU_PAYOUT,
  PAYOUT_INTERVAL,
  PAYOUT_NOSTR_KEY,
  PAYOUT_THRESHOLD,
} from "../env";
import { getWallet } from "../api/utils";
import { deleteTokens, insertToken } from "../db/utils";
import {
  finalizeEvent,
  generateSecretKey,
  getPublicKey,
  nip17,
  nip19,
  Relay,
} from "nostr-tools";

/**
 * Process tokens that have reached the payout threshold
 */
export async function processTokenPayouts() {
  // Get sum of token amounts grouped by mint
  const stmt = db.prepare<
    {
      mint: string;
      total_amount: number;
    },
    [number]
  >(`
		SELECT mint, SUM(amount) as total_amount
    FROM tokens
    GROUP BY mint
    HAVING total_amount >= ?
  `);

  const readyMints = stmt.all(PAYOUT_THRESHOLD);

  // Process each mint that has reached the threshold
  for (const { mint, total_amount } of readyMints) {
    // Get tokens from database
    const rows = db
      .prepare<
        { id: number; token: string },
        [string]
      >("SELECT id, token FROM tokens WHERE mint = ?")
      .all(mint);

    // Create a proofs variable outside the try block so we can recover the proofs if the payout fails
    let swapProofs: Proof[] | undefined = undefined;

    try {
      console.log(`Processing payout for mint ${mint}:`);
      console.log(`Total amount: ${total_amount} sats`);

      const wallet = getWallet(mint);
      const tokens = rows.map((r) => getDecodedToken(r.token));
      let proofs = tokens.flatMap((t) => t.proofs);

      // Optimize tokens if there are more than one
      if (tokens.length > 1) {
        proofs = swapProofs = await wallet.receive({
          mint: wallet.mint.mintUrl,
          proofs,
        });
      }

      // find the first token with a unit
      const unit = CASHU_PAYOUT.unit || "sat";

      // Send cashu tokens
      let sent = false;

      const payload: PaymentRequestPayload = {
        id: CASHU_PAYOUT.id,
        proofs,
        unit,
        mint,
      };

      for (const transport of CASHU_PAYOUT.transport) {
        switch (transport.type) {
          case "nostr":
            const parsed = nip19.decode(transport.target);
            if (
              parsed.type !== "nprofile" ||
              parsed.data.relays === undefined ||
              parsed.data.relays?.length === 0
            )
              throw new Error("Invalid nostr target");

            console.log(
              `Using nostr key ${nip19.npubEncode(getPublicKey(PAYOUT_NOSTR_KEY))}`,
            );

            // Create NIP-17 DM with random key
            const message = nip17.wrapEvent(
              PAYOUT_NOSTR_KEY,
              {
                publicKey: parsed.data.pubkey,
                relayUrl: parsed.data.relays[0],
              },
              JSON.stringify(payload),
            );

            const relay = new Relay(parsed.data.relays[0]);
            await relay.connect();

            // Publish message
            const msg = await relay.publish(message);

            console.log(`Published nostr payout: ${msg}`);
            sent = true;

            // Delete the processed tokens
            deleteTokens(rows.map((r) => r.id));
            break;
          case "post":
            const res = await fetch(transport.target, {
              method: "POST",
              body: JSON.stringify(payload),
            });

            if (res.ok) {
              sent = true;
              console.log(
                `Sent ${proofs.reduce((acc, proof) => acc + proof.amount, 0)} ${unit} to ${transport.target}`,
              );
            } else
              throw new Error(
                `HTTP payout endpoint responded with ${res.status}`,
              );
            break;
        }

        // Break if we successfully sent the tokens
        if (sent) break;
      }

      if (!sent) throw new Error("Failed to payout tokens");

      // Delete the processed tokens
      deleteTokens(rows.map((r) => r.id));
    } catch (error) {
      console.error(`Failed to process payout for mint ${mint}:`, error);

      // Recover proofs if swap failed
      if (swapProofs) {
        // Remove old tokens
        deleteTokens(rows.map((r) => r.id));

        // Save the new swapped token to the database
        insertToken({
          token: getEncodedToken({ proofs: swapProofs, mint, unit: "sat" }),
          mint,
          amount: swapProofs.reduce((acc, proof) => acc + proof.amount, 0),
        });

        console.log("Saved swapped tokens to the database");
      }
    }
  }
}

// Run once on startup
processTokenPayouts().catch(console.error);

// Run every interval (default hour)
setInterval(processTokenPayouts, PAYOUT_INTERVAL * 1000);
