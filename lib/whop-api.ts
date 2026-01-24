import { whopsdk } from "./whop-sdk";
import { sql } from "./db";

export interface WhopUserData {
  id: string;
  hasPurchase: boolean;
  metadata?: {
    wallet_verified?: string;
    wallet_address?: string;
    act_balance_verified?: string;
    verification_timestamp?: string;
  };
}

/**
 * Get user data and verification status from Neon DB
 * This uses the official @whop/sdk client for access checks.
 */
export async function getWhopUserData(
  userId: string,
  experienceId: string
): Promise<WhopUserData | null> {
  try {
    console.log(`[Whop API] Fetching data for user ${userId} using experience ${experienceId}`);

    // 1. Check access via SDK (Product Gating)
    // Signature: checkAccess(resourceID: string, params: { id: string })
    let hasPurchase = false;
    try {
      const access = await whopsdk.users.checkAccess(experienceId, {
        id: userId,
      });
      hasPurchase = access.has_access;
    } catch (checkError: any) {
      if (checkError.status === 404) {
        console.warn(`[Whop API] Experience/Product ${experienceId} not found. Defaulting to hasPurchase: true for development.`);
        hasPurchase = true;
      } else {
        console.error("[Whop API] checkAccess error:", checkError.message);
      }
    }

    // 2. Fetch verification status from local Neon DB
    // This is our source of truth for wallet mapping since Whop has no user metadata.
    const dbResults = await sql`
      SELECT * FROM user_verifications WHERE whop_user_id = ${userId} LIMIT 1
    `;

    const verification = dbResults[0];
    const metadata = verification ? {
      wallet_verified: "true",
      wallet_address: verification.wallet_address,
      act_balance_verified: "true",
      verification_timestamp: (verification.verified_at as Date)?.toISOString(),
    } : {};

    return {
      id: userId,
      hasPurchase,
      metadata,
    };
  } catch (error) {
    console.error("Critical error in getWhopUserData:", error);
    return null;
  }
}

/**
 * Store verification status in Neon DB
 */
export async function storeWhopMetadata(
  userId: string,
  metadata: {
    wallet_verified: string;
    wallet_address: string;
    act_balance_verified: string;
    verification_timestamp: string;
  }
): Promise<boolean> {
  try {
    // We store this in Neon because Whop does not have custom user metadata fields.
    await sql`
      INSERT INTO user_verifications (whop_user_id, wallet_address, is_verified, verified_at)
      VALUES (${userId}, ${metadata.wallet_address}, true, NOW())
      ON CONFLICT (whop_user_id) 
      DO UPDATE SET 
        wallet_address = EXCLUDED.wallet_address,
        is_verified = true,
        verified_at = NOW()
    `;

    console.log("[DB] Stored/Updated verification for user:", userId);
    return true;
  } catch (error) {
    console.error("Error storing verification in DB:", error);
    return false;
  }
}

/**
 * Grant access to Publisher functionality.
 * Since Whop doesn't have a direct "Grant Membership" API without checkout,
 * we handle the "Publisher" status primarily in our own Neon database.
 */
export async function grantPublisherAccess(
  userId: string
): Promise<boolean> {
  try {
    // We rely on the Neon DB (storeWhopMetadata) to confirm they are verified.
    // In this app, "Is in DB" == "Is a Publisher".
    console.log("[App Logic] User is recognized as Publisher locally:", userId);
    return true;
  } catch (error) {
    console.error("Error granting publisher access:", error);
    return false;
  }
}
