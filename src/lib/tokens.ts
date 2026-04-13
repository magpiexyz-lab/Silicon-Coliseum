import type { TokenInfo } from "./types";

export const SUPPORTED_TOKENS: TokenInfo[] = [
  {
    symbol: "PEPE",
    name: "Pepe",
    chain: "ethereum",
    searchQuery: "PEPE ethereum",
  },
  {
    symbol: "WIF",
    name: "dogwifhat",
    chain: "solana",
    searchQuery: "WIF solana dogwifhat",
  },
  {
    symbol: "BONK",
    name: "Bonk",
    chain: "solana",
    searchQuery: "BONK solana",
  },
  {
    symbol: "DOGE",
    name: "Dogecoin",
    chain: "multi",
    searchQuery: "DOGE dogecoin",
  },
  {
    symbol: "SHIB",
    name: "Shiba Inu",
    chain: "ethereum",
    searchQuery: "SHIB ethereum shiba",
  },
  {
    symbol: "FLOKI",
    name: "Floki",
    chain: "ethereum",
    searchQuery: "FLOKI ethereum",
  },
  {
    symbol: "BRETT",
    name: "Brett",
    chain: "base",
    searchQuery: "BRETT base",
  },
  {
    symbol: "POPCAT",
    name: "Popcat",
    chain: "solana",
    searchQuery: "POPCAT solana",
  },
  {
    symbol: "MEW",
    name: "cat in a dogs world",
    chain: "solana",
    searchQuery: "MEW solana cat dogs world",
  },
  {
    symbol: "TURBO",
    name: "Turbo",
    chain: "ethereum",
    searchQuery: "TURBO ethereum",
  },
  {
    symbol: "MOG",
    name: "Mog Coin",
    chain: "ethereum",
    searchQuery: "MOG ethereum mog coin",
  },
  {
    symbol: "PENGU",
    name: "Pudgy Penguins",
    chain: "solana",
    searchQuery: "PENGU solana pudgy penguins",
  },
];

export function getTokenBySymbol(symbol: string): TokenInfo | undefined {
  return SUPPORTED_TOKENS.find((t) => t.symbol === symbol);
}
