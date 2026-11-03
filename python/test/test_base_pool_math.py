from src.common.base_pool_math import compute_add_liquidity_single_token_exact_out
from src.common.maths import complement_fixed, div_up_fixed, mul_up_fixed


# v3 BasePoolMath (vault 25d73b3d) computes the non-taxable balance as
# `(newSupply * balance) / totalSupply`, rounding once. Rounding twice (mulDown then
# divDown) lowers it and overcharges the swap fee.
def test_add_liquidity_single_token_exact_out_rounds_non_taxable_balance_once():
    total_supply = 1_000_000_000_007
    balances = [5_000_000_000_000_000_011, 5_000_000_000_000_000_011]
    exact_bpt_amount_out = 100_000_000_003
    swap_fee_percentage = 10**17

    # Linear balance-given-invariant, enough to exercise the fee logic
    def compute_balance(balances_live_scaled18, token_in_index, invariant_ratio):
        return mul_up_fixed(balances_live_scaled18[token_in_index], invariant_ratio)

    new_supply = exact_bpt_amount_out + total_supply
    new_balance = compute_balance(balances, 0, div_up_fixed(new_supply, total_supply))
    taxable_amount = new_balance - (new_supply * balances[0]) // total_supply
    expected_fee = (
        div_up_fixed(taxable_amount, complement_fixed(swap_fee_percentage))
        - taxable_amount
    )

    result = compute_add_liquidity_single_token_exact_out(
        balances,
        0,
        exact_bpt_amount_out,
        total_supply,
        swap_fee_percentage,
        5 * 10**18,
        compute_balance,
    )

    assert expected_fee == 1
    assert result.swap_fee_amounts[0] == expected_fee
    assert result.amount_in_with_fee == new_balance - balances[0] + expected_fee
