# Solana Program Deployment Guide

## Step 1: Deploy via Solana Playground

1. Go to https://beta.solpg.io
2. Click "+" to create a new project, name it "silicon-coliseum"
3. Set framework to "Anchor"
4. Replace the contents of `src/lib.rs` with the code from `contracts/programs/silicon-coliseum/src/lib.rs`
5. In the left sidebar, update `Cargo.toml` dependencies to:
   ```toml
   [dependencies]
   anchor-lang = { version = "0.30.1", features = ["init-if-needed"] }
   ```
6. Click "Build" (wrench icon) - wait for compilation
7. Click "Deploy" (rocket icon) - select "Testnet" or "Devnet"
8. Copy the deployed Program ID

## Step 2: Update Environment

Add the Program ID to `.env.local`:
```
NEXT_PUBLIC_SOLANA_PROGRAM_ID=<your-program-id>
```

## Step 3: Fund Admin Wallet

The admin wallet is: GxNjXgAyfqTS5RmFBVPgbDz7eEd5pFJrNYGxZJQMeJYf

Fund it via:
- Solana faucet: https://faucet.solana.com
- Or CLI: `solana airdrop 2 GxNjXgAyfqTS5RmFBVPgbDz7eEd5pFJrNYGxZJQMeJYf --url devnet`

## Step 4: Initialize Program

```bash
npx tsx scripts/solana/initialize.ts
```

## Step 5: Create Arena Escrow (per arena)

```bash
npx tsx scripts/solana/create-arena.ts <arena-uuid>
```

## Step 6: Arena Lifecycle

```bash
# Close betting when arena starts
npx tsx scripts/solana/close-betting.ts <arena-uuid>

# After finalization, distribute rewards
npx tsx scripts/solana/distribute-rewards.ts <arena-uuid>
```
