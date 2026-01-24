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
    // 1. Check access
    const access = await whopsdk.users.checkAccess(experienceId, {
      id: userId,
    });

    // 2. Fetch user metadata from Whop
    // Note: In a real app, you might want to fetch this from your own DB or 
    // use the Whop Company Metadata API if allowed.
    // For now, we'll try to fetch the company member data which contains metadata.
    const response = await fetch(
      `https://api.whop.com/api/v2/company/members/${userId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.WHOP_API_KEY}`,
        },
      }
    );

    let metadata = {};
    if (response.ok) {
      const member = await response.json();
      metadata = member.metadata || {};
    }

    return {
      id: userId,
      hasPurchase: access.has_access,
      metadata,
    };
  } catch (error) {
    console.error("Error fetching Whop user data:", error);
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
      console.error("Error storing Whop metadata:", error);
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
      console.error("Error granting publisher access:", error);
      return false;
    }

    console.log("[Whop API] Granted publisher access to user:", userId);
    return true;
  } catch (error) {
    console.error("Error granting publisher access:", error);
    return false;
  }
}
