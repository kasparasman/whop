import { whopsdk } from "./whop-sdk";

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
 * Get user data and metadata for a specific user
 */
export async function getWhopUserData(
  userId: string,
  experienceId: string
): Promise<WhopUserData | null> {
  try {
    console.log(`[Whop API] Fetching data for user ${userId} using experience ${experienceId}`);

    // 1. Check access
    let hasPurchase = false;
    try {
      const access = await whopsdk.users.checkAccess(experienceId, {
        id: userId,
      });
      hasPurchase = access.has_access;
    } catch (checkError: any) {
      // If the experience ID is not found (404), it might not be set up yet.
      // In development or for the default experience, we allow proceeding.
      if (checkError.status === 404) {
        console.warn(`[Whop API] Experience/Product ${experienceId} not found. Defaulting to hasPurchase: true for development.`);
        hasPurchase = true; // Allow dev to proceed if they haven't set up Whop experiences yet
      } else {
        console.error("[Whop API] checkAccess error:", checkError.message);
      }
    }

    // 2. Fetch user metadata from Whop
    const response = await fetch(
      `https://api.whop.com/api/v2/company/members/${userId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.WHOP_API_KEY}`,
        },
      }
    );

    if (response.status === 401) {
      console.error("[Whop API] CRITICAL: Your WHOP_API_KEY does not have permission to read company members. Please ensure 'member:basic:read' is enabled in your Whop Developer Dashboard.");
    }

    let metadata = {};
    if (response.ok) {
      const member = await response.json();
      metadata = member.metadata || {};
    }

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
 * Store metadata via Whop Company Metadata API
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
    const response = await fetch(
      `https://api.whop.com/api/v2/company/members/${userId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${process.env.WHOP_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          metadata,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      if (response.status === 401) {
        console.error("[Whop API] CRITICAL: Your WHOP_API_KEY does not have permission to update metadata. Please ensure 'member:manage' and 'member:basic:read' are enabled in your Whop Developer Dashboard.");
      } else {
        console.error("Error storing Whop metadata:", error);
      }
      return false;
    }

    console.log("[Whop API] Stored metadata for user:", userId);
    return true;
  } catch (error) {
    console.error("Error storing Whop metadata:", error);
    return false;
  }
}

// Publisher product ID
const PUBLISHER_PRODUCT_ID = "prod_Umyij3nzsTJ3h";

/**
 * Grant access to Publisher product via Whop API
 */
export async function grantPublisherAccess(
  userId: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://api.whop.com/api/v2/memberships`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.WHOP_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          product_id: PUBLISHER_PRODUCT_ID,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      if (response.status === 401) {
        console.error("[Whop API] CRITICAL: Your WHOP_API_KEY does not have permission to create memberships. Please ensure 'membership:write' or 'member:manage' is enabled in your Whop Developer Dashboard.");
      } else {
        console.error("Error granting publisher access:", error);
      }
      return false;
    }

    console.log("[Whop API] Granted publisher access to user:", userId);
    return true;
  } catch (error) {
    console.error("Error granting publisher access:", error);
    return false;
  }
}
