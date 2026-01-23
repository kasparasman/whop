export interface ACTStats {
    price: number;
    marketCap: number;
    liquidity: number;
    holders: number;
    circSupply: number;
}

export async function getACTFullStats(): Promise<ACTStats> {
    const response = await fetch("https://anthroposcity-tokens.anthroposcityworkers.workers.dev/dextoolsStats", {
        next: { revalidate: 60 } // Cache for 60 seconds
    });

    if (!response.ok) {
        throw new Error("Failed to fetch ACT stats from external API");
    }

    const data = await response.json();
    return {
        price: data.price,
        marketCap: data.marketCap,
        liquidity: data.liquidity,
        holders: data.holders,
        circSupply: data.circSupply
    };
}
