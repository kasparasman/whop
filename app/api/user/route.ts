import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { whopsdk } from "@/lib/whop-sdk";
import { getWhopUserData } from "@/lib/whop-api";
import { UserIdentity, UserStatus } from "@/lib/types";

/**
 * API route to get user identity and status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const experienceId = searchParams.get("experienceId") || "exp_default";

    // --- DEVELOPER MODE SIMULATION ---
    // Only runs locally when DEV_SIMULATE_STATUS is set
    if (process.env.NODE_ENV === "development" && process.env.DEV_SIMULATE_STATUS) {
      const simulatedStatus = process.env.DEV_SIMULATE_STATUS as UserStatus;
      console.log(`[DEV] Simulating user status: ${simulatedStatus}`);

      return NextResponse.json({
        userId: "user_dev_simulated",
        status: simulatedStatus,
        actVerification: {
          verified: simulatedStatus === "Publisher",
          walletAddress: simulatedStatus === "Publisher" ? "0x742d35Cc6634C0532925a3b844Bc454e4438f44e" : undefined,
          network: simulatedStatus === "Publisher" ? "Arbitrum" : undefined,
          token: simulatedStatus === "Publisher" ? "ACT (ERC-20)" : undefined,
        }
      });
    }
    // ---------------------------------

    // 1. Extract the user from the token using verifyUserToken()
    const headerValues = await headers();
    const { userId } = await whopsdk.verifyUserToken(headerValues);

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized. Invalid or missing Whop token." },
        { status: 401 }
      );
    }

    // 2. Use the experienceId + userId to check access and fetch data
    const whopData = await getWhopUserData(userId, experienceId);

    if (!whopData) {
      return NextResponse.json(
        { error: "Failed to fetch user data from Whop." },
        { status: 500 }
      );
    }

    // Gating: Must have access to the experience product
    if (!whopData.hasPurchase) {
      return NextResponse.json(
        { error: "Access denied. This app requires a purchase." },
        { status: 403 }
      );
    }

    // 3. Check for Publisher product access
    let hasPublisherAccess = false;
    try {
      const publisherAccess = await whopsdk.users.checkAccess(
        "prod_Umyij3nzsTJ3h",
        { id: userId }
      );
      hasPublisherAccess = publisherAccess.has_access;
    } catch (error) {
      console.error("Error checking publisher access:", error);
    }

    // Determine user status
    let status: UserStatus = "Member";
    const metadata = whopData.metadata || {};

    if (
      (metadata.wallet_verified === "true" && metadata.act_balance_verified === "true") ||
      hasPublisherAccess
    ) {
      status = "Publisher";
    }

    // Build identity object
    const identity: UserIdentity = {
      userId: whopData.id,
      status,
      actVerification: {
        verified: metadata.wallet_verified === "true" || hasPublisherAccess,
        walletAddress: metadata.wallet_address,
        network: metadata.wallet_address ? "Arbitrum" : undefined,
        token: metadata.wallet_address ? "ACT (ERC-20)" : undefined,
      },
    };

    return NextResponse.json(identity);
  } catch (error) {
    console.error("Error in /api/user:", error);

    // Handle unauthorized specifically if SDK throws
    if (error instanceof Error && (error.message.includes("token") || error.message.includes("Unauthorized"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
