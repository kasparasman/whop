import { NextResponse } from "next/server";
import { getACTFullStats } from "@/lib/price-utils";

export async function GET() {
    try {
        const stats = await getACTFullStats();
        return NextResponse.json(stats);
    } catch (error) {
        console.error("Error fetching ACT stats:", error);
        return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
    }
}
