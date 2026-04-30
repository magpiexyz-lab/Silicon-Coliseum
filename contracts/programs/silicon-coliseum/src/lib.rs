use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("5MSzqvJ6Kavmqsn3qnCvpEtyFn8NPSJNvrJZ4RXRoVeU");

// ============================================================================
// PDA Seeds
// ============================================================================
const SEED_CONFIG: &[u8] = b"config";
const SEED_ARENA: &[u8] = b"arena";
const SEED_BET: &[u8] = b"bet";
const SEED_REWARD: &[u8] = b"reward";

// ============================================================================
// Program Instructions
// ============================================================================
#[program]
pub mod silicon_coliseum {
    use super::*;

    /// Initialize program state: admin, treasury, CP rate, min bet, fee.
    /// Called once after deployment.
    pub fn initialize(
        ctx: Context<Initialize>,
        cp_rate_lamports: u64,
        min_bet_lamports: u64,
        fee_bps: u16,
    ) -> Result<()> {
        require!(cp_rate_lamports > 0, SiliconError::InvalidAmount);
        require!(fee_bps <= 10_000, SiliconError::InvalidFee);

        let config = &mut ctx.accounts.config;
        config.admin = ctx.accounts.admin.key();
        config.treasury = ctx.accounts.treasury.key();
        config.cp_rate_lamports = cp_rate_lamports;
        config.min_bet_lamports = min_bet_lamports;
        config.fee_bps = fee_bps;
        config.total_sol_volume = 0;
        config.total_cp_sold = 0;
        config.bump = ctx.bumps.config;
        Ok(())
    }

    /// Admin updates program configuration.
    pub fn update_config(
        ctx: Context<AdminAction>,
        cp_rate_lamports: Option<u64>,
        min_bet_lamports: Option<u64>,
        fee_bps: Option<u16>,
        new_treasury: Option<Pubkey>,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;
        if let Some(rate) = cp_rate_lamports {
            require!(rate > 0, SiliconError::InvalidAmount);
            config.cp_rate_lamports = rate;
        }
        if let Some(min_bet) = min_bet_lamports {
            config.min_bet_lamports = min_bet;
        }
        if let Some(fee) = fee_bps {
            require!(fee <= 10_000, SiliconError::InvalidFee);
            config.fee_bps = fee;
        }
        if let Some(treasury) = new_treasury {
            config.treasury = treasury;
        }
        Ok(())
    }

    /// User buys Coliseum Points by sending SOL to treasury.
    /// Emits CpPurchased event — backend listens and credits CP in database.
    pub fn buy_cp(ctx: Context<BuyCp>, sol_amount: u64) -> Result<()> {
        require!(sol_amount > 0, SiliconError::InvalidAmount);

        let cp_rate = ctx.accounts.config.cp_rate_lamports;
        let cp_amount = sol_amount / cp_rate;
        require!(cp_amount > 0, SiliconError::AmountTooSmall);

        // Transfer SOL from user to treasury
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.user.to_account_info(),
                    to: ctx.accounts.treasury.to_account_info(),
                },
            ),
            sol_amount,
        )?;

        // Update global stats
        let config = &mut ctx.accounts.config;
        config.total_sol_volume = config
            .total_sol_volume
            .checked_add(sol_amount)
            .ok_or(SiliconError::Overflow)?;
        config.total_cp_sold = config
            .total_cp_sold
            .checked_add(cp_amount)
            .ok_or(SiliconError::Overflow)?;

        emit!(CpPurchased {
            user: ctx.accounts.user.key(),
            sol_amount,
            cp_amount,
        });

        Ok(())
    }

    /// Admin creates an escrow PDA for a new arena.
    /// arena_uuid is the 16-byte binary form of the arena's UUID.
    pub fn create_arena_escrow(
        ctx: Context<CreateArenaEscrow>,
        arena_uuid: [u8; 16],
    ) -> Result<()> {
        let escrow = &mut ctx.accounts.arena_escrow;
        escrow.arena_uuid = arena_uuid;
        escrow.total_sol = 0;
        escrow.bet_count = 0;
        escrow.is_betting_open = true;
        escrow.is_finalized = false;
        escrow.total_distributed = 0;
        escrow.fee_collected = 0;
        escrow.bump = ctx.bumps.arena_escrow;
        Ok(())
    }

    /// Admin closes betting for an arena (transition to trading phase).
    pub fn close_betting(ctx: Context<ArenaAdmin>) -> Result<()> {
        let escrow = &mut ctx.accounts.arena_escrow;
        require!(escrow.is_betting_open, SiliconError::BettingAlreadyClosed);
        escrow.is_betting_open = false;

        emit!(BettingClosed {
            arena_uuid: escrow.arena_uuid,
        });
        Ok(())
    }

    /// User places a first SOL bet on an arena (creates the bet account).
    /// For additional bets on the same arena, use add_bet.
    pub fn place_bet(ctx: Context<PlaceBet>, sol_amount: u64) -> Result<()> {
        let min_bet = ctx.accounts.config.min_bet_lamports;
        let escrow = &mut ctx.accounts.arena_escrow;

        require!(escrow.is_betting_open, SiliconError::BettingClosed);
        require!(!escrow.is_finalized, SiliconError::ArenaFinalized);
        require!(sol_amount >= min_bet, SiliconError::BetTooSmall);

        // Transfer SOL from user to escrow PDA
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.user.to_account_info(),
                    to: escrow.to_account_info(),
                },
            ),
            sol_amount,
        )?;

        // Initialize user bet
        let bet = &mut ctx.accounts.user_bet;
        bet.user = ctx.accounts.user.key();
        bet.amount = sol_amount;
        bet.bump = ctx.bumps.user_bet;

        escrow.bet_count = escrow
            .bet_count
            .checked_add(1)
            .ok_or(SiliconError::Overflow)?;
        escrow.total_sol = escrow
            .total_sol
            .checked_add(sol_amount)
            .ok_or(SiliconError::Overflow)?;

        emit!(BetPlaced {
            user: ctx.accounts.user.key(),
            arena_uuid: escrow.arena_uuid,
            sol_amount,
            total_bet: bet.amount,
        });

        Ok(())
    }

    /// User adds more SOL to an existing bet on an arena.
    pub fn add_bet(ctx: Context<AddBet>, sol_amount: u64) -> Result<()> {
        let min_bet = ctx.accounts.config.min_bet_lamports;
        let escrow = &mut ctx.accounts.arena_escrow;

        require!(escrow.is_betting_open, SiliconError::BettingClosed);
        require!(!escrow.is_finalized, SiliconError::ArenaFinalized);
        require!(sol_amount >= min_bet, SiliconError::BetTooSmall);

        // Transfer SOL from user to escrow PDA
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.user.to_account_info(),
                    to: escrow.to_account_info(),
                },
            ),
            sol_amount,
        )?;

        // Add to existing bet
        let bet = &mut ctx.accounts.user_bet;
        bet.amount = bet
            .amount
            .checked_add(sol_amount)
            .ok_or(SiliconError::Overflow)?;
        escrow.total_sol = escrow
            .total_sol
            .checked_add(sol_amount)
            .ok_or(SiliconError::Overflow)?;

        emit!(BetPlaced {
            user: ctx.accounts.user.key(),
            arena_uuid: escrow.arena_uuid,
            sol_amount,
            total_bet: bet.amount,
        });

        Ok(())
    }

    /// User cancels their bet. Only allowed during betting phase.
    /// Refunds all SOL and closes the bet account (rent returned to user).
    pub fn cancel_bet(ctx: Context<CancelBet>) -> Result<()> {
        let escrow = &mut ctx.accounts.arena_escrow;
        let refund_amount = ctx.accounts.user_bet.amount;

        require!(escrow.is_betting_open, SiliconError::BettingClosed);
        require!(refund_amount > 0, SiliconError::NoBetToCancel);

        // Transfer SOL from escrow PDA to user (program owns the PDA)
        let escrow_info = escrow.to_account_info();
        **escrow_info.try_borrow_mut_lamports()? = escrow_info
            .lamports()
            .checked_sub(refund_amount)
            .ok_or(SiliconError::Overflow)?;
        **ctx
            .accounts
            .user
            .to_account_info()
            .try_borrow_mut_lamports()? += refund_amount;

        escrow.total_sol = escrow
            .total_sol
            .checked_sub(refund_amount)
            .ok_or(SiliconError::Overflow)?;
        escrow.bet_count = escrow
            .bet_count
            .checked_sub(1)
            .ok_or(SiliconError::Overflow)?;

        emit!(BetCancelled {
            user: ctx.accounts.user.key(),
            arena_uuid: escrow.arena_uuid,
            sol_amount: refund_amount,
        });

        // user_bet account is closed via `close = user` constraint
        Ok(())
    }

    /// Admin assigns a SOL reward to a winner for an arena.
    /// Called once per winner during off-chain finalization.
    pub fn set_reward(ctx: Context<SetReward>, amount: u64) -> Result<()> {
        require!(amount > 0, SiliconError::InvalidAmount);

        let escrow = &ctx.accounts.arena_escrow;
        require!(!escrow.is_betting_open, SiliconError::BettingStillOpen);

        let reward = &mut ctx.accounts.user_reward;
        reward.user = ctx.accounts.winner.key();
        reward.amount = amount;
        reward.is_claimed = false;
        reward.bump = ctx.bumps.user_reward;

        emit!(RewardSet {
            user: ctx.accounts.winner.key(),
            arena_uuid: escrow.arena_uuid,
            amount,
        });

        Ok(())
    }

    /// Admin finalizes an arena: sends fee to treasury, marks as finalized.
    /// Must be called after all set_reward calls.
    pub fn finalize_arena(ctx: Context<FinalizeArena>, fee_amount: u64) -> Result<()> {
        let escrow = &mut ctx.accounts.arena_escrow;
        require!(!escrow.is_finalized, SiliconError::ArenaFinalized);
        require!(!escrow.is_betting_open, SiliconError::BettingStillOpen);

        if fee_amount > 0 {
            let escrow_info = escrow.to_account_info();
            **escrow_info.try_borrow_mut_lamports()? = escrow_info
                .lamports()
                .checked_sub(fee_amount)
                .ok_or(SiliconError::Overflow)?;
            **ctx
                .accounts
                .treasury
                .to_account_info()
                .try_borrow_mut_lamports()? += fee_amount;
            escrow.fee_collected = fee_amount;
        }

        escrow.is_finalized = true;

        emit!(ArenaFinalized {
            arena_uuid: escrow.arena_uuid,
            fee_amount,
        });

        Ok(())
    }

    /// User claims their SOL reward. Closes the reward account (rent to user).
    pub fn claim_reward(ctx: Context<ClaimReward>) -> Result<()> {
        let escrow = &mut ctx.accounts.arena_escrow;
        let claim_amount = ctx.accounts.user_reward.amount;

        require!(escrow.is_finalized, SiliconError::ArenaNotFinalized);
        require!(!ctx.accounts.user_reward.is_claimed, SiliconError::AlreadyClaimed);
        require!(claim_amount > 0, SiliconError::InvalidAmount);

        // Transfer SOL from escrow to user
        let escrow_info = escrow.to_account_info();
        **escrow_info.try_borrow_mut_lamports()? = escrow_info
            .lamports()
            .checked_sub(claim_amount)
            .ok_or(SiliconError::Overflow)?;
        **ctx
            .accounts
            .user
            .to_account_info()
            .try_borrow_mut_lamports()? += claim_amount;

        escrow.total_distributed = escrow
            .total_distributed
            .checked_add(claim_amount)
            .ok_or(SiliconError::Overflow)?;

        emit!(RewardClaimed {
            user: ctx.accounts.user.key(),
            arena_uuid: escrow.arena_uuid,
            amount: claim_amount,
        });

        // user_reward account closed via `close = user` constraint
        Ok(())
    }

    /// Admin closes an empty arena escrow to reclaim rent.
    pub fn close_arena_escrow(_ctx: Context<CloseArenaEscrow>) -> Result<()> {
        // Validation in account constraints. Account closed via `close = admin`.
        Ok(())
    }
}

// ============================================================================
// Account State
// ============================================================================

#[account]
#[derive(InitSpace)]
pub struct ProgramConfig {
    pub admin: Pubkey,          // 32 — admin authority
    pub treasury: Pubkey,       // 32 — treasury wallet (receives SOL payments + fees)
    pub cp_rate_lamports: u64,  // 8  — lamports per 1 CP (1 SOL=10000 CP → 100_000)
    pub min_bet_lamports: u64,  // 8  — minimum SOL bet (0.01 SOL = 10_000_000)
    pub fee_bps: u16,           // 2  — fee in basis points (500 = 5%)
    pub total_sol_volume: u64,  // 8  — lifetime SOL received
    pub total_cp_sold: u64,     // 8  — lifetime CP sold
    pub bump: u8,               // 1
}

#[account]
#[derive(InitSpace)]
pub struct ArenaEscrow {
    pub arena_uuid: [u8; 16],    // 16 — arena UUID in binary
    pub total_sol: u64,          // 8  — total SOL held in escrow
    pub bet_count: u32,          // 4  — number of active bets
    pub is_betting_open: bool,   // 1  — true during betting phase
    pub is_finalized: bool,      // 1  — true after admin finalizes
    pub total_distributed: u64,  // 8  — SOL claimed by winners
    pub fee_collected: u64,      // 8  — fee sent to treasury
    pub bump: u8,                // 1
}

#[account]
#[derive(InitSpace)]
pub struct UserBet {
    pub user: Pubkey, // 32 — bettor's wallet
    pub amount: u64,  // 8  — total SOL bet (lamports)
    pub bump: u8,     // 1
}

#[account]
#[derive(InitSpace)]
pub struct UserReward {
    pub user: Pubkey,     // 32 — winner's wallet
    pub amount: u64,      // 8  — claimable SOL (lamports)
    pub is_claimed: bool, // 1
    pub bump: u8,         // 1
}

// ============================================================================
// Instruction Accounts
// ============================================================================

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + ProgramConfig::INIT_SPACE,
        seeds = [SEED_CONFIG],
        bump,
    )]
    pub config: Account<'info, ProgramConfig>,

    #[account(mut)]
    pub admin: Signer<'info>,

    /// CHECK: Treasury wallet address, validated by admin during initialization.
    pub treasury: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AdminAction<'info> {
    #[account(
        mut,
        seeds = [SEED_CONFIG],
        bump = config.bump,
        has_one = admin @ SiliconError::Unauthorized,
    )]
    pub config: Account<'info, ProgramConfig>,

    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct BuyCp<'info> {
    #[account(
        mut,
        seeds = [SEED_CONFIG],
        bump = config.bump,
    )]
    pub config: Account<'info, ProgramConfig>,

    #[account(mut)]
    pub user: Signer<'info>,

    /// CHECK: Treasury wallet, validated against config.treasury.
    #[account(
        mut,
        constraint = treasury.key() == config.treasury @ SiliconError::InvalidTreasury,
    )]
    pub treasury: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(arena_uuid: [u8; 16])]
pub struct CreateArenaEscrow<'info> {
    #[account(
        seeds = [SEED_CONFIG],
        bump = config.bump,
        has_one = admin @ SiliconError::Unauthorized,
    )]
    pub config: Account<'info, ProgramConfig>,

    #[account(
        init,
        payer = admin,
        space = 8 + ArenaEscrow::INIT_SPACE,
        seeds = [SEED_ARENA, arena_uuid.as_ref()],
        bump,
    )]
    pub arena_escrow: Account<'info, ArenaEscrow>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ArenaAdmin<'info> {
    #[account(
        seeds = [SEED_CONFIG],
        bump = config.bump,
        has_one = admin @ SiliconError::Unauthorized,
    )]
    pub config: Account<'info, ProgramConfig>,

    #[account(mut)]
    pub arena_escrow: Account<'info, ArenaEscrow>,

    pub admin: Signer<'info>,
}

/// First bet — creates the UserBet account via `init`.
#[derive(Accounts)]
pub struct PlaceBet<'info> {
    #[account(
        seeds = [SEED_CONFIG],
        bump = config.bump,
    )]
    pub config: Account<'info, ProgramConfig>,

    #[account(mut)]
    pub arena_escrow: Account<'info, ArenaEscrow>,

    #[account(
        init,
        payer = user,
        space = 8 + UserBet::INIT_SPACE,
        seeds = [SEED_BET, arena_escrow.key().as_ref(), user.key().as_ref()],
        bump,
    )]
    pub user_bet: Account<'info, UserBet>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

/// Additional bet — mutates an existing UserBet account.
#[derive(Accounts)]
pub struct AddBet<'info> {
    #[account(
        seeds = [SEED_CONFIG],
        bump = config.bump,
    )]
    pub config: Account<'info, ProgramConfig>,

    #[account(mut)]
    pub arena_escrow: Account<'info, ArenaEscrow>,

    #[account(
        mut,
        seeds = [SEED_BET, arena_escrow.key().as_ref(), user.key().as_ref()],
        bump = user_bet.bump,
        constraint = user_bet.user == user.key() @ SiliconError::Unauthorized,
    )]
    pub user_bet: Account<'info, UserBet>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelBet<'info> {
    #[account(mut)]
    pub arena_escrow: Account<'info, ArenaEscrow>,

    #[account(
        mut,
        seeds = [SEED_BET, arena_escrow.key().as_ref(), user.key().as_ref()],
        bump = user_bet.bump,
        close = user,
        constraint = user_bet.user == user.key() @ SiliconError::Unauthorized,
    )]
    pub user_bet: Account<'info, UserBet>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetReward<'info> {
    #[account(
        seeds = [SEED_CONFIG],
        bump = config.bump,
        has_one = admin @ SiliconError::Unauthorized,
    )]
    pub config: Account<'info, ProgramConfig>,

    #[account(mut)]
    pub arena_escrow: Account<'info, ArenaEscrow>,

    #[account(
        init,
        payer = admin,
        space = 8 + UserReward::INIT_SPACE,
        seeds = [SEED_REWARD, arena_escrow.key().as_ref(), winner.key().as_ref()],
        bump,
    )]
    pub user_reward: Account<'info, UserReward>,

    /// CHECK: Winner's wallet address provided by admin.
    pub winner: UncheckedAccount<'info>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FinalizeArena<'info> {
    #[account(
        seeds = [SEED_CONFIG],
        bump = config.bump,
        has_one = admin @ SiliconError::Unauthorized,
    )]
    pub config: Account<'info, ProgramConfig>,

    #[account(mut)]
    pub arena_escrow: Account<'info, ArenaEscrow>,

    /// CHECK: Treasury wallet, validated against config.treasury.
    #[account(
        mut,
        constraint = treasury.key() == config.treasury @ SiliconError::InvalidTreasury,
    )]
    pub treasury: UncheckedAccount<'info>,

    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct ClaimReward<'info> {
    #[account(mut)]
    pub arena_escrow: Account<'info, ArenaEscrow>,

    #[account(
        mut,
        seeds = [SEED_REWARD, arena_escrow.key().as_ref(), user.key().as_ref()],
        bump = user_reward.bump,
        close = user,
        constraint = user_reward.user == user.key() @ SiliconError::Unauthorized,
    )]
    pub user_reward: Account<'info, UserReward>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CloseArenaEscrow<'info> {
    #[account(
        seeds = [SEED_CONFIG],
        bump = config.bump,
        has_one = admin @ SiliconError::Unauthorized,
    )]
    pub config: Account<'info, ProgramConfig>,

    #[account(
        mut,
        constraint = arena_escrow.is_finalized @ SiliconError::ArenaNotFinalized,
        close = admin,
    )]
    pub arena_escrow: Account<'info, ArenaEscrow>,

    #[account(mut)]
    pub admin: Signer<'info>,
}

// ============================================================================
// Events
// ============================================================================

#[event]
pub struct CpPurchased {
    pub user: Pubkey,
    pub sol_amount: u64,
    pub cp_amount: u64,
}

#[event]
pub struct BettingClosed {
    pub arena_uuid: [u8; 16],
}

#[event]
pub struct BetPlaced {
    pub user: Pubkey,
    pub arena_uuid: [u8; 16],
    pub sol_amount: u64,
    pub total_bet: u64,
}

#[event]
pub struct BetCancelled {
    pub user: Pubkey,
    pub arena_uuid: [u8; 16],
    pub sol_amount: u64,
}

#[event]
pub struct RewardSet {
    pub user: Pubkey,
    pub arena_uuid: [u8; 16],
    pub amount: u64,
}

#[event]
pub struct ArenaFinalized {
    pub arena_uuid: [u8; 16],
    pub fee_amount: u64,
}

#[event]
pub struct RewardClaimed {
    pub user: Pubkey,
    pub arena_uuid: [u8; 16],
    pub amount: u64,
}

// ============================================================================
// Errors
// ============================================================================

#[error_code]
pub enum SiliconError {
    #[msg("Unauthorized: only admin can perform this action")]
    Unauthorized,
    #[msg("Invalid amount: must be greater than zero")]
    InvalidAmount,
    #[msg("Amount too small to convert to CP")]
    AmountTooSmall,
    #[msg("Invalid fee: must be 0-10000 basis points")]
    InvalidFee,
    #[msg("Invalid treasury address")]
    InvalidTreasury,
    #[msg("Betting is closed for this arena")]
    BettingClosed,
    #[msg("Betting is already closed")]
    BettingAlreadyClosed,
    #[msg("Betting is still open — close betting first")]
    BettingStillOpen,
    #[msg("Arena is already finalized")]
    ArenaFinalized,
    #[msg("Arena is not yet finalized")]
    ArenaNotFinalized,
    #[msg("Bet amount is below minimum")]
    BetTooSmall,
    #[msg("No bet to cancel")]
    NoBetToCancel,
    #[msg("Reward already claimed")]
    AlreadyClaimed,
    #[msg("Arithmetic overflow")]
    Overflow,
}
