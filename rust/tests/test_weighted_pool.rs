//! WeightedPool parity with the deployed WeightedPool v2 (20261021-weighted-pool).

use alloy_primitives::U256;
use balancer_maths_rust::common::types::{SwapKind, SwapParams};
use balancer_maths_rust::pools::weighted::weighted_math::{
    compute_in_given_exact_out, compute_out_given_exact_in,
};
use balancer_maths_rust::pools::weighted::WeightedPool;
use balancer_maths_rust::PoolBase;

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
