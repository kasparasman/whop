import { NextResponse } from "next/server";
import { getCurrentACTPrice } from "@/lib/price-utils";

export async function GET() {
    try {
        const price = await getCurrentACTPrice();
        return NextResponse.json({ price });
    } catch (error) {
        console.error("Error fetching ACT price:", error);
        return NextResponse.json({ error: "Failed to fetch price" }, { status: 500 });
    }
}
