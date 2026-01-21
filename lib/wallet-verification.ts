import { verifyMessage, getAddress, createPublicClient, http, formatUnits, parseUnits } from "viem";
import { arbitrum } from "viem/chains";

// Token Addresses (Arbitrum)
const ACT_TOKEN_ADDRESS = "0xa84e264117442bea8e93f3981124695b693f0d77";
const WETH_ADDRESS = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
const USDC_E_ADDRESS = "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8";

// Uniswap V3 Pool Addresses (Arbitrum)
const ACT_WETH_POOL = "0x061f00b9cc145def6c27e61c243c78749a0a3325";
const WETH_USDC_POOL = "0xC31e54c7a869b9fcbecc14363cf510d1c41fa443";

const UNISWAP_V3_POOL_ABI = [
  {
    inputs: [],
    name: "slot0",
    outputs: [
      { name: "sqrtPriceX96", type: "uint160" },
      { name: "tick", type: "int24" },
      { name: "observationIndex", type: "uint16" },
      { name: "observationCardinality", type: "uint16" },
      { name: "observationCardinalityNext", type: "uint16" },
      { name: "feeProtocol", type: "uint8" },
      { name: "unlocked", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "token0",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "token1",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
  },
] as const;

// Threshold in USD
const MIN_USD_VALUE = 10;

export const VERIFICATION_MESSAGE = "I am verifying ownership of this wallet to gain Publisher access in AnthropoCity.";

/**
 * Calculate price from sqrtPriceX96
 * price = (sqrtPriceX96 / 2^96)^2
 */
function getPriceFromSqrtX96(sqrtPriceX96: bigint, decimals0: number, decimals1: number): number {
  const price = (Number(sqrtPriceX96) / 2 ** 96) ** 2;
  const decimalAdjustment = 10 ** (decimals0 - decimals1);
  return price * decimalAdjustment;
}

/**
 * Verify wallet signature and ACT token balance with real-time USD value check
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
      transport: http(), // Uses default public RPC, ideally use Alchemy/Infura for production
    });

    // 3. Get ACT Balance
    const balance = await publicClient.readContract({
      address: ACT_TOKEN_ADDRESS as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [normalizedAddress],
    }) as bigint;

    if (balance === 0n) {
      return { success: false, error: "Your wallet holds 0 ACT tokens." };
    }

    // 4. Fetch Real-time Prices from Uniswap V3

    // Get ACT/WETH sqrtPrice
    const [actWethSlot0] = await Promise.all([
      publicClient.readContract({
        address: ACT_WETH_POOL as `0x${string}`,
        abi: UNISWAP_V3_POOL_ABI,
        functionName: "slot0",
      }),
    ]);

    // Get WETH/USDC sqrtPrice
    const [wethUsdcSlot0] = await Promise.all([
      publicClient.readContract({
        address: WETH_USDC_POOL as `0x${string}`,
        abi: UNISWAP_V3_POOL_ABI,
        functionName: "slot0",
      }),
    ]);

    // Math:
    // ACT/WETH Pool: token0 = WETH (0x82a...), token1 = ACT (0xa84...)
    // Price of token0 (WETH) in token1 (ACT) = getPriceFromSqrtX96
    const wethInAct = getPriceFromSqrtX96(actWethSlot0[0], 18, 18);
    const actInWeth = 1 / wethInAct;

    // WETH/USDC Pool: token0 = WETH (0x82a...), token1 = USDC (0xff9...)
    // Price of token0 (WETH) in token1 (USDC)
    const wethInUsdc = getPriceFromSqrtX96(wethUsdcSlot0[0], 18, 6);

    // ACT Price in USD
    const actPriceInUsd = actInWeth * wethInUsdc;

    // User total value in USD
    const userBalanceFormatted = parseFloat(formatUnits(balance, 18));
    const userUsdValue = userBalanceFormatted * actPriceInUsd;

    if (userUsdValue < MIN_USD_VALUE) {
      return {
        success: false,
        error: `Insufficient ACT value. Required: $${MIN_USD_VALUE}, Current: $${userUsdValue.toFixed(2)}`,
        balance,
        usdValue: userUsdValue.toFixed(2),
      };
    }

    return {
      success: true,
      balance,
      usdValue: userUsdValue.toFixed(2)
    };
  } catch (error) {
    console.error("Value verification error:", error);
    return {
      success: false,
      error: "Failed to verify token value. Please check your connection to Arbitrum.",
    };
  }
}
