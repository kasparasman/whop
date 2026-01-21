import { verifyMessage, getAddress } from "viem";
import { arbitrum } from "viem/chains";
import { createPublicClient, http, formatUnits } from "viem";

// ACT token contract address on Arbitrum (replace with actual contract address)
const ACT_TOKEN_ADDRESS = "0x0000000000000000000000000000000000000000"; // TODO: Replace with actual ACT token address
const ACT_TOKEN_ABI = [
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
  },
] as const;

// Minimum ACT balance required (in token units, not wei)
const MIN_ACT_BALANCE = 1; // Adjust based on requirements

export const VERIFICATION_MESSAGE = "I am verifying ownership of this wallet to gain Publisher access in AnthropoCity.";

/**
 * Verify wallet signature and ACT token balance
 */
export async function verifyWalletAndBalance(
  address: string,
  signature: string
): Promise<{ success: boolean; error?: string; balance?: bigint }> {
  try {
    // Verify signature
    const isValid = await verifyMessage({
      address: address as `0x${string}`,
      message: VERIFICATION_MESSAGE,
      signature: signature as `0x${string}`,
    });

    if (!isValid) {
      return { success: false, error: "Signature verification failed" };
    }

    // Verify address matches
    const normalizedAddress = getAddress(address);

    // Create public client for Arbitrum
    const publicClient = createPublicClient({
      chain: arbitrum,
      transport: http(),
    });

    // Check ACT token balance
    try {
      const balance = (await publicClient.readContract({
        address: ACT_TOKEN_ADDRESS as `0x${string}`,
        abi: ACT_TOKEN_ABI,
        functionName: "balanceOf",
        args: [normalizedAddress],
      })) as bigint;

      // Convert from wei to token units (assuming 18 decimals)
      const balanceFormatted = formatUnits(balance, 18);
      const minBalanceFormatted = formatUnits(BigInt(MIN_ACT_BALANCE) * BigInt(10 ** 18), 18);

      if (balance < BigInt(MIN_ACT_BALANCE) * BigInt(10 ** 18)) {
        return {
          success: false,
          error: `Insufficient ACT balance. Minimum required: ${minBalanceFormatted}, Current: ${balanceFormatted}`,
          balance,
        };
      }

      return { success: true, balance };
    } catch (error) {
      return {
        success: false,
        error: "Failed to check ACT balance. Please ensure you're on Arbitrum network.",
      };
    }
  } catch (error) {
    console.error("Wallet verification error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error during verification",
    };
  }
}

