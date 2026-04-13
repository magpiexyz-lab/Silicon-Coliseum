export const SCT_CONTRACT_ADDRESS =
  process.env.SCT_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000";

export const USDT_CONTRACT_ADDRESS =
  process.env.USDT_CONTRACT_ADDRESS || "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9";

export const RPC_URL =
  process.env.RPC_URL || "https://arb1.arbitrum.io/rpc";

export const ARBITRUM_CHAIN_ID = 42161;

// Minimal ERC-20 ABI for SCT contract interactions
export const SCT_ABI = [
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "wholeTokenBalance",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "purchaseTokens",
    inputs: [{ name: "tier", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "decimals",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
  },
] as const;

// Minimal ERC-20 ABI for USDT contract interactions
export const USDT_ABI = [
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "decimals",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
  },
] as const;

// SCT purchase tiers from experiment.yaml
export interface PurchaseTier {
  tier: number;
  usdtCost: number;
  sctReceived: number;
  rate: string;
  label: string;
}

export const TIERS: PurchaseTier[] = [
  {
    tier: 1,
    usdtCost: 1,
    sctReceived: 1,
    rate: "$1.00/SCT",
    label: "Starter",
  },
  {
    tier: 10,
    usdtCost: 10,
    sctReceived: 20,
    rate: "$0.50/SCT",
    label: "Pro (Popular)",
  },
  {
    tier: 100,
    usdtCost: 100,
    sctReceived: 250,
    rate: "$0.40/SCT",
    label: "Whale (Best Value)",
  },
];
