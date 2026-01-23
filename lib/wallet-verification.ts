import { verifyMessage, getAddress, createPublicClient, http, formatUnits } from "viem";
import { arbitrum } from "viem/chains";
import { getACTFullStats } from "./price-utils";

// Token Address (Arbitrum)
const ACT_TOKEN_ADDRESS = getAddress("0xa84e264117442bea8e93f3981124695b693f0d77");

const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Threshold in USD
const MIN_USD_VALUE = Number(process.env.NEXT_PUBLIC_ACT_THRESHOLD_USD || 10);

export const VERIFICATION_MESSAGE = "I am verifying ownership of this wallet to gain Publisher access in AnthropoCity.";

/**
 * Verify wallet signature and ACT token balance with real-time USD value check
 * Uses external API for token price data
 */
export async function verifyWalletAndBalance(
  address: string,
  signature: string
): Promise<{ success: boolean; error?: string; balance?: bigint; usdValue?: string }> {
  try {
    // 1. Verify signature
    const isValid = await verifyMessage({
      address: address as `0x${string}`,
      message: VERIFICATION_MESSAGE,
      signature: signature as `0x${string}`,
    });

    if (!isValid) {
      return { success: false, error: "Signature verification failed" };
    }

    const normalizedAddress = getAddress(address);

    // 2. Setup Arbitrum Client
    const publicClient = createPublicClient({
      chain: arbitrum,
      transport: http(),
    });

    // 3. Get ACT Balance and Price Stats in Parallel
    const [balance, stats] = await Promise.all([
      publicClient.readContract({
        address: ACT_TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [normalizedAddress],
      }) as Promise<bigint>,
      getACTFullStats()
    ]);

    if (balance === 0n) {
      return { success: false, error: "Your wallet holds 0 ACT tokens." };
    }

    // 4. Calculate User total value in USD
    const userBalanceFormatted = parseFloat(formatUnits(balance, 18));
    const userUsdValue = userBalanceFormatted * stats.price;

    if (userUsdValue < MIN_USD_VALUE) {
      return {
        success: false,
        error: `Insufficient ACT value. Required: $${MIN_USD_VALUE}, Current: $${userUsdValue.toFixed(10)}`,
        balance,
        usdValue: userUsdValue.toFixed(10),
      };
    }

    return {
      success: true,
      balance,
      usdValue: userUsdValue.toFixed(10)
    };
  } catch (error) {
    console.error("Value verification error:", error);
    return {
      success: false,
      error: "Failed to verify token value. Please check your connection to Arbitrum.",
    };
  }
}
