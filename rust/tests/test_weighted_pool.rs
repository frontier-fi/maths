//! WeightedPool parity with the deployed WeightedPool v2 (20261021-weighted-pool).

use alloy_primitives::U256;
use balancer_maths_rust::common::types::{BasePoolState, Rounding, SwapKind, SwapParams};
use balancer_maths_rust::pools::weighted::weighted_math::{
    compute_in_given_exact_out, compute_out_given_exact_in,
};
use balancer_maths_rust::pools::weighted::{WeightedPool, WeightedState};
use balancer_maths_rust::{PoolBase, PoolError};

fn balance_in() -> U256 {
    U256::from(1_000_000_000_000u64)
}

fn balance_out() -> U256 {
    U256::from(1_000_000_000_000_000_000_000_000u128)
}

fn swap_params(swap_kind: SwapKind, amount: U256) -> SwapParams {
    SwapParams {
        swap_kind,
        token_in_index: 0,
        token_out_index: 1,
        amount_scaled_18: amount,
        balances_live_scaled_18: vec![balance_in(), balance_out()],
    }
}

// WeightedPool v2 (balancer-v3-monorepo #1601) rounds `balanceTokenIn` up by 1 wei on both
// ExactIn and ExactOut swaps.
#[test]
fn on_swap_exact_in_rounds_balance_in_up() {
    let weights = vec![
        U256::from(500_000_000_000_000_000u64),
        U256::from(500_000_000_000_000_000u64),
    ];
    let amount_in = U256::from(100_000_000_000u64);
    let v2 = compute_out_given_exact_in(
        &(balance_in() + U256::ONE),
        &weights[0],
        &balance_out(),
        &weights[1],
        &amount_in,
    )
    .unwrap();
    let v1 = compute_out_given_exact_in(
        &balance_in(),
        &weights[0],
        &balance_out(),
        &weights[1],
        &amount_in,
    )
    .unwrap();
    assert_ne!(v2, v1);

    let params = swap_params(SwapKind::GivenIn, amount_in);
    let pool = WeightedPool::new(weights.clone()).unwrap();
    assert_eq!(pool.on_swap(&params).unwrap(), v2);
    let pool_v2 = WeightedPool::new_with_version(weights.clone(), 2).unwrap();
    assert_eq!(pool_v2.on_swap(&params).unwrap(), v2);
    let pool_v1 = WeightedPool::new_with_version(weights, 1).unwrap();
    assert_eq!(pool_v1.on_swap(&params).unwrap(), v1);
}

#[test]
fn on_swap_exact_out_rounds_balance_in_up() {
    let weights = vec![
        U256::from(200_000_000_000_000_000u64),
        U256::from(800_000_000_000_000_000u64),
    ];
    let amount_out = U256::from(300_000_000_000_000_000_000_000u128);
    let v2 = compute_in_given_exact_out(
        &(balance_in() + U256::ONE),
        &weights[0],
        &balance_out(),
        &weights[1],
        &amount_out,
    )
    .unwrap();
    let v1 = compute_in_given_exact_out(
        &balance_in(),
        &weights[0],
        &balance_out(),
        &weights[1],
        &amount_out,
    )
    .unwrap();
    assert_ne!(v2, v1);

    let params = swap_params(SwapKind::GivenOut, amount_out);
    let pool = WeightedPool::new(weights.clone()).unwrap();
    assert_eq!(pool.on_swap(&params).unwrap(), v2);
    let pool_v2 = WeightedPool::new_with_version(weights.clone(), 2).unwrap();
    assert_eq!(pool_v2.on_swap(&params).unwrap(), v2);
    let pool_v1 = WeightedPool::new_with_version(weights, 1).unwrap();
    assert_eq!(pool_v1.on_swap(&params).unwrap(), v1);
}

// WeightedPool v2 enforces per-token minimum balances (`getMinTokenBalances()`) in onSwap,
// computeInvariant and computeBalance, reverting with TokenBalanceBelowMin.
fn wad(n: u64) -> U256 {
    U256::from(n) * U256::from(1_000_000_000_000_000_000u64)
}

fn pool_with_min_balances(
    min_token_balances: Vec<U256>,
    pool_version: Option<u32>,
) -> WeightedPool {
    let base = BasePoolState {
        pool_address: "0x0000000000000000000000000000000000000001".to_string(),
        pool_type: "WEIGHTED".to_string(),
        tokens: vec![
            "0x000000000000000000000000000000000000000a".to_string(),
            "0x000000000000000000000000000000000000000b".to_string(),
        ],
        scaling_factors: vec![U256::ONE, U256::ONE],
        token_rates: vec![wad(1), wad(1)],
        balances_live_scaled_18: vec![wad(10), wad(10)],
        swap_fee: U256::ZERO,
        aggregate_swap_fee: U256::ZERO,
        total_supply: wad(20),
        supports_unbalanced_liquidity: true,
        hook_type: None,
    };
    let mut json = serde_json::to_value(WeightedState::new(
        base,
        vec![U256::from(500_000_000_000_000_000u64); 2],
    ))
    .unwrap();
    json["minTokenBalances"] = serde_json::to_value(min_token_balances).unwrap();
    if let Some(v) = pool_version {
        json["poolVersion"] = serde_json::to_value(v).unwrap();
    }
    let state: WeightedState = serde_json::from_value(json).unwrap();
    WeightedPool::from(state)
}

fn min_balance_exact_in() -> SwapParams {
    SwapParams {
        swap_kind: SwapKind::GivenIn,
        token_in_index: 0,
        token_out_index: 1,
        amount_scaled_18: wad(1),
        balances_live_scaled_18: vec![wad(10), wad(10)],
    }
}

fn high_min_out() -> Vec<U256> {
    vec![wad(1), U256::from(9_500_000_000_000_000_000u64)]
}

#[test]
fn on_swap_reverts_when_ending_token_out_balance_below_min() {
    let pool = pool_with_min_balances(high_min_out(), None);
    assert!(matches!(
        pool.on_swap(&min_balance_exact_in()),
        Err(PoolError::TokenBalanceBelowMin { token_index: 1, .. })
    ));
}

#[test]
fn on_swap_reverts_when_balance_token_in_below_min() {
    let pool = pool_with_min_balances(vec![wad(10) + U256::from(2u64), wad(1)], None);
    assert!(matches!(
        pool.on_swap(&min_balance_exact_in()),
        Err(PoolError::TokenBalanceBelowMin { token_index: 0, .. })
    ));
}

#[test]
fn compute_invariant_reverts_when_balance_below_min() {
    let pool = pool_with_min_balances(high_min_out(), None);
    assert!(matches!(
        pool.compute_invariant(&[wad(10), wad(9)], Rounding::RoundDown),
        Err(PoolError::TokenBalanceBelowMin { token_index: 1, .. })
    ));
}

#[test]
fn compute_balance_reverts_when_new_balance_below_min() {
    let pool = pool_with_min_balances(high_min_out(), None);
    assert!(matches!(
        pool.compute_balance(
            &[wad(10), wad(10)],
            1,
            &U256::from(900_000_000_000_000_000u64)
        ),
        Err(PoolError::TokenBalanceBelowMin { token_index: 1, .. })
    ));
}

#[test]
fn no_revert_above_min_nor_for_version_1_pools() {
    let pool = pool_with_min_balances(vec![wad(1), wad(1)], None);
    assert!(pool.on_swap(&min_balance_exact_in()).is_ok());
    assert!(pool
        .compute_invariant(&[wad(10), wad(10)], Rounding::RoundDown)
        .is_ok());
    assert!(pool
        .compute_balance(
            &[wad(10), wad(10)],
            1,
            &U256::from(900_000_000_000_000_000u64)
        )
        .is_ok());
    let v1 = pool_with_min_balances(high_min_out(), Some(1));
    assert!(v1.on_swap(&min_balance_exact_in()).is_ok());
}
