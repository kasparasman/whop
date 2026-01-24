import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { whopsdk } from "@/lib/whop-sdk";
import { verifyWalletAndBalance } from "@/lib/wallet-verification";
import { getWhopUserData, storeWhopMetadata, grantPublisherAccess } from "@/lib/whop-api";

/**
 * API route to verify wallet and ACT token ownership
 * Only accessible to Members (not Publishers)
 * Grants Publisher product access (prod_Umyij3nzsTJ3h) on successful verification
 */
export async function POST(request: NextRequest) {
  try {
    // --- DEVELOPER MODE SIMULATION ---
    const isDev = process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview";
    if (isDev && process.env.DEV_SIMULATE_STATUS) {
      console.log(`[DEV] Simulating successful verification`);
      return NextResponse.json({
        success: true,
        message: "Verification successful (SIMULATED).",
        walletAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
      });
    }

    let userId: string | null = null;
    const { searchParams } = new URL(request.url);

    // Use real Whop SDK to verify user token
    try {
      const headerValues = await headers();
      const verified = await whopsdk.verifyUserToken(headerValues);
      userId = (verified.userId ?? null) as string | null;
    } catch (sdkError: any) {
      // Fallback: Check for whop_user_token in query params if headers fail
      const tokenFromQuery = searchParams.get("whop_user_token");
      if (tokenFromQuery) {
        try {
          const verified = await whopsdk.verifyUserToken({
            headers: new Headers({ authorization: `Bearer ${tokenFromQuery}` })
          } as any);
          userId = (verified.userId ?? null) as string | null;
        } catch (innerError) {
          console.error("Failed to verify token from query params:", innerError);
        }
      }

      if (!userId) {
        return NextResponse.json(
          { error: "Unauthorized. Whop token not found or invalid." },
          { status: 401 }
        );
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized. Whop identity not established." },
        { status: 401 }
      );
    }

    // Verify user has purchase (using a default experienceId if not provided)
    const whopData = await getWhopUserData(userId, "exp_default");
    if (!whopData || !whopData.hasPurchase) {
      return NextResponse.json(
        { error: "Access denied. This app requires a purchase." },
        { status: 403 }
      );
    }

    // Check if already verified (Publisher status)
    const publisherAccess = await whopsdk.users.checkAccess(
      "prod_Umyij3nzsTJ3h",
      { id: userId }
    );
    if (publisherAccess.has_access) {
      return NextResponse.json(
        { error: "Wallet already verified. You are already a Publisher." },
        { status: 400 }
      );
    }

    // Get request body
    const body = await request.json();
    const { address, signature } = body;

    if (!address || !signature) {
      return NextResponse.json(
        { error: "Missing wallet address or signature." },
        { status: 400 }
      );
    }

    // Verify signature and ACT balance
    const verification = await verifyWalletAndBalance(address, signature);

    if (!verification.success) {
      return NextResponse.json(
        {
          success: false,
          message: verification.error || "Verification failed",
        },
        { status: 400 }
      );
    }

    // Store metadata via Whop API (optional - mainly for tracking)
    const timestamp = new Date().toISOString();
    const metadataToStore = {
      wallet_verified: "true",
      wallet_address: address,
      act_balance_verified: "true",
      verification_timestamp: timestamp,
    };

    await storeWhopMetadata(userId, metadataToStore);

    // Grant access to Publisher product (prod_Umyij3nzsTJ3h)
    const accessGranted = await grantPublisherAccess(userId);

    if (!accessGranted) {
      return NextResponse.json(
        {
          success: false,
          message: "Verification succeeded but failed to grant Publisher product access.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Verification successful. You are now a Publisher.",
      walletAddress: address,
    });
  } catch (error) {
    console.error("Error in /api/verify-wallet:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
