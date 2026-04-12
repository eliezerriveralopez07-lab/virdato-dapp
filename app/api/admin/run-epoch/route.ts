import { NextRequest, NextResponse } from "next/server";
import { runEpochPipeline } from "../../../../backend/integrity/runEpochPipeline";
import {
  distributorAbi,
  distributorAddress,
  publicClient,
} from "../../../../backend/integrity/clients";

export async function POST(req: NextRequest) {
  try {
    const operatorSecret = req.headers.get("x-operator-secret");

    if (
      !process.env.OPERATOR_SECRET ||
      operatorSecret !== process.env.OPERATOR_SECRET
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentEpoch = await publicClient.readContract({
      address: distributorAddress,
      abi: distributorAbi,
      functionName: "currentEpoch",
    });

    const epochNumber = Number(currentEpoch);

    const result = await runEpochPipeline(epochNumber);

    return NextResponse.json({
      success: true,
      onChainCurrentEpoch: epochNumber,
      result,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
