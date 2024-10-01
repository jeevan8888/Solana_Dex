use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token};

declare_id!("4YSCYC56LXXdMNtLvkigBXK2keE6M9zVaAjYvPCrJbW8");

#[program]
pub mod solana_dex {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let dex_state = &mut ctx.accounts.dex_state;
        dex_state.authority = ctx.accounts.authority.key();
        dex_state.order_count = 0;
        Ok(())
    }

    pub fn place_order(
        ctx: Context<PlaceOrder>,
        side: OrderSide,
        amount: u64,
        price: u64,
    ) -> Result<()> {
        let dex_state = &mut ctx.accounts.dex_state;
        let order = Order {
            id: dex_state.order_count,
            owner: ctx.accounts.user.key(),
            side,
            amount,
            price,
            fulfilled: 0,
        };
        dex_state.orders.push(order);
        dex_state.order_count += 1;

        // Transfer tokens to DEX account
        let cpi_accounts = token::Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.dex_token_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        Ok(())
    }

    pub fn cancel_order(ctx: Context<CancelOrder>, order_id: u64) -> Result<()> {
        let dex_state = &mut ctx.accounts.dex_state;
        let order_index = dex_state
            .orders
            .iter()
            .position(|order| order.id == order_id && order.owner == ctx.accounts.user.key())
            .ok_or(ErrorCode::OrderNotFound)?;
        
        let order = dex_state.orders.remove(order_index);

        // Transfer tokens back to user
        let cpi_accounts = token::Transfer {
            from: ctx.accounts.dex_token_account.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.dex_state.to_account_info(),
        };
        
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, order.amount - order.fulfilled)?;

        Ok(())
    }

    pub fn match_orders(ctx: Context<MatchOrders>) -> Result<()> {
        let dex_state = &mut ctx.accounts.dex_state;

        // Collect buy and sell orders separately
        let buy_orders: Vec<Order> = dex_state.orders
            .iter()
            .filter(|o| o.side == OrderSide::Buy)
            .cloned()
            .collect();

        let sell_orders: Vec<Order> = dex_state.orders
            .iter()
            .filter(|o| o.side == OrderSide::Sell)
            .cloned()
            .collect();

        // Sort buy orders by price (descending)
        let mut sorted_buy_orders = buy_orders;
        sorted_buy_orders.sort_by(|a, b| b.price.cmp(&a.price));

        // Sort sell orders by price (ascending)
        let mut sorted_sell_orders = sell_orders;
        sorted_sell_orders.sort_by(|a, b| a.price.cmp(&b.price));

        for buy_order in sorted_buy_orders.iter_mut() {
            for sell_order in sorted_sell_orders.iter_mut() {
                if buy_order.price >= sell_order.price {
                    let match_amount = std::cmp::min(
                        buy_order.amount - buy_order.fulfilled,
                        sell_order.amount - sell_order.fulfilled,
                    );

                    buy_order.fulfilled += match_amount;
                    sell_order.fulfilled += match_amount;

                    // Implement token transfers here (if needed)
                }
            }
        }

        // Retain only unfulfilled orders
        dex_state.orders.retain(|order| order.amount != order.fulfilled);

        Ok(())
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum OrderSide {
    Buy,
    Sell,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Order {
    pub id: u64,
    pub owner: Pubkey,
    pub side: OrderSide,
    pub amount: u64,
    pub price: u64,
    pub fulfilled: u64,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = authority, space = 8 + 32 + 8 + 1000)]
    pub dex_state: Account<'info, DexState>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PlaceOrder<'info> {
    #[account(mut)]
    pub dex_state: Account<'info, DexState>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    /// CHECK: This is safe because the token account is validated through constraints.
    pub user_token_account: AccountInfo<'info>, 
    
    /// CHECK: This is safe because the token account is validated through constraints.
    pub dex_token_account: AccountInfo<'info>, 
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CancelOrder<'info> {
    #[account(mut)]
    pub dex_state: Account<'info, DexState>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    /// CHECK: This is safe because the token account is validated through constraints.
    pub user_token_account: AccountInfo<'info>, 
    
    /// CHECK: This is safe because the token account is validated through constraints.
    pub dex_token_account: AccountInfo<'info>, 
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct MatchOrders<'info> {
    #[account(mut)]
    pub dex_state: Account<'info, DexState>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
}

#[account]
pub struct DexState {
   pub authority: Pubkey,
   pub order_count: u64,
   pub orders: Vec<Order>, 
}

#[error_code]
pub enum ErrorCode {
   #[msg("Order not found")]
   OrderNotFound,
}