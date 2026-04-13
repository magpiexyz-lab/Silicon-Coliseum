import { NextResponse } from "next/server";
import { z } from "zod";
import { ethers } from "ethers";
import { SCT_CONTRACT_ADDRESS, SCT_ABI, RPC_URL } from "@/lib/contract";

const WalletAddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid wallet address format");

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ walletAddress: string }> }
) {
  try {
    const { walletAddress } = await params;

    const parsed = WalletAddressSchema.safeParse(walletAddress);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    // If no contract address configured, return mock balance for dev mode
    if (
      !process.env.SCT_CONTRACT_ADDRESS ||
      SCT_CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000"
    ) {
      return NextResponse.json({
        balance: 10,
        walletAddress: walletAddress.toLowerCase(),
        mock: true,
      });
    }

    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const contract = new ethers.Contract(
        SCT_CONTRACT_ADDRESS,
        SCT_ABI,
        provider
      );
      const balance = await contract.wholeTokenBalance(walletAddress);

      return NextResponse.json({
        balance: Number(balance),
        walletAddress: walletAddress.toLowerCase(),
        mock: false,
      });
    } catch (err) {
      console.error("Failed to read on-chain SCT balance:", err);
      return NextResponse.json(
        { error: "Failed to read on-chain balance" },
        { status: 502 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
