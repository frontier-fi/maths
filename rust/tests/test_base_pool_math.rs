//! BasePoolMath parity with the deployed Vault (20261016-vault, 25d73b3d).

use alloy_primitives::U256;
use balancer_maths_rust::common::errors::PoolError;
use balancer_maths_rust::common::maths::{complement_fixed, div_up_fixed, mul_up_fixed};
use balancer_maths_rust::vault::base_pool_math::compute_add_liquidity_single_token_exact_out;

// v3 BasePoolMath computes the non-taxable balance as `(newSupply * balance) / totalSupply`,
// rounding once. Rounding twice (mulDown then divDown) lowers it and overcharges the swap fee.
#[test]
fn add_liquidity_single_token_exact_out_rounds_non_taxable_balance_once() {
    let total_supply = U256::from(1_000_000_000_007u64);
    let balances = vec![
        U256::from(5_000_000_000_000_000_011u64),
        U256::from(5_000_000_000_000_000_011u64),
    ];
    let exact_bpt_amount_out = U256::from(100_000_000_003u64);
    let swap_fee_percentage = U256::from(100_000_000_000_000_000u64);

    // Linear balance-given-invariant, enough to exercise the fee logic
    let compute_balance = |balances_live_scaled_18: &[U256],
                           token_in_index: usize,
                           invariant_ratio: &U256|
     -> Result<U256, PoolError> {
        mul_up_fixed(&balances_live_scaled_18[token_in_index], invariant_ratio)
    };

    let new_supply = exact_bpt_amount_out + total_supply;
    let new_balance = compute_balance(
        &balances,
        0,
        &div_up_fixed(&new_supply, &total_supply).unwrap(),
    )
    .unwrap();
    let taxable_amount = new_balance - (new_supply * balances[0]) / total_supply;
    let expected_fee = div_up_fixed(
        &taxable_amount,
        &complement_fixed(&swap_fee_percentage).unwrap(),
    )
    .unwrap()
        - taxable_amount;

    let result = compute_add_liquidity_single_token_exact_out(
        &balances,
        0,
        &exact_bpt_amount_out,
        &total_supply,
        &swap_fee_percentage,
        &U256::from(5_000_000_000_000_000_000u64),
        &compute_balance,
    )
    .unwrap();

    assert_eq!(expected_fee, U256::ONE);
    assert_eq!(result.swap_fee_amounts[0], expected_fee);
    assert_eq!(
        result.amount_in_with_fee,
        new_balance - balances[0] + expected_fee
    );
}
