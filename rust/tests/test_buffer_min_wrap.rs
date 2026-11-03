//! The frontier Vault (20261016-vault) is deployed with minWrapAmount = 1e4, and checks both the
//! given and the calculated amount (Vault.erc4626BufferWrapOrUnwrap).

use alloy_primitives::U256;
use balancer_maths_rust::common::types::{BasePoolState, SwapInput, SwapKind};
use balancer_maths_rust::pools::buffer::{
    erc4626_buffer_wrap_or_unwrap, BufferImmutable, BufferMutable, BufferState,
};
use balancer_maths_rust::PoolError;

const WRAPPED: &str = "0xd4fa2d31b7968e448877f69a96de69f5de8cd23e";
const UNDERLYING: &str = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";

fn pool() -> BufferState {
    let wad = U256::from(1_000_000_000_000_000_000u64);
    BufferState {
        base: BasePoolState {
            pool_address: WRAPPED.to_string(),
            pool_type: "Buffer".to_string(),
            tokens: vec![WRAPPED.to_string(), UNDERLYING.to_string()],
            scaling_factors: vec![U256::ONE, U256::ONE],
            token_rates: vec![wad, wad],
            balances_live_scaled_18: vec![U256::ZERO, U256::ZERO],
            swap_fee: U256::ZERO,
            aggregate_swap_fee: U256::ZERO,
            total_supply: U256::ZERO,
            supports_unbalanced_liquidity: false,
            hook_type: None,
        },
        mutable: BufferMutable {
            rate: U256::from(2u64) * wad,
            max_deposit: Some(wad),
            max_mint: Some(wad),
        },
        immutable: BufferImmutable {
            pool_address: WRAPPED.to_string(),
            tokens: vec![WRAPPED.to_string(), UNDERLYING.to_string()],
        },
    }
}

fn wrap(amount_raw: u64) -> Result<U256, PoolError> {
    erc4626_buffer_wrap_or_unwrap(
        &SwapInput {
            amount_raw: U256::from(amount_raw),
            swap_kind: SwapKind::GivenIn,
            token_in: UNDERLYING.to_string(),
            token_out: WRAPPED.to_string(),
        },
        &pool(),
    )
}

#[test]
fn wrap_throws_when_given_amount_below_minimum() {
    assert!(matches!(
        wrap(9_999),
        Err(PoolError::BufferWrapAmountTooSmall)
    ));
}

#[test]
fn wrap_throws_when_calculated_amount_below_minimum() {
    // 15000 underlying at rate 2 wraps into 7500 shares
    assert!(matches!(
        wrap(15_000),
        Err(PoolError::BufferWrapAmountTooSmall)
    ));
}

#[test]
fn wrap_succeeds_when_both_amounts_at_least_minimum() {
    assert_eq!(wrap(20_000).unwrap(), U256::from(10_000u64));
}
