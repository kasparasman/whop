import { createPublicClient, http, getAddress } from "viem";
import { arbitrum } from "viem/chains";

// Pool Addresses
const ACT_WETH_POOL = getAddress("0x061f00b9cc145def6c27e61c243c78749a0a3325");
const WETH_USDC_POOL = getAddress("0xC31e54c7a869b9fcbecc14363cf510d1c41fa443");

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
] as const;

function getPriceFromSqrtX96(sqrtPriceX96: bigint, decimals0: number, decimals1: number): number {
    const price = (Number(sqrtPriceX96) / 2 ** 96) ** 2;
    const decimalAdjustment = 10 ** (decimals0 - decimals1);
    return price * decimalAdjustment;
}

export async function getCurrentACTPrice(): Promise<number> {
    const publicClient = createPublicClient({
        chain: arbitrum,
        transport: http(),
    });

    const [actWethSlot0, wethUsdcSlot0] = await Promise.all([
        publicClient.readContract({
            address: ACT_WETH_POOL as `0x${string}`,
            abi: UNISWAP_V3_POOL_ABI,
            functionName: "slot0",
        }),
        publicClient.readContract({
            address: WETH_USDC_POOL as `0x${string}`,
            abi: UNISWAP_V3_POOL_ABI,
            functionName: "slot0",
        }),
    ]);

    const wethInAct = getPriceFromSqrtX96(actWethSlot0[0], 18, 18);
    const actInWeth = 1 / wethInAct;
    const wethInUsdc = getPriceFromSqrtX96(wethUsdcSlot0[0], 18, 6);

    return actInWeth * wethInUsdc;
}
