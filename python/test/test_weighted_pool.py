import pytest

from src.common.maths import Rounding
from src.common.swap_params import SwapParams
from src.common.types import SwapKind
from src.pools.weighted.weighted import Weighted
from src.pools.weighted.weighted_data import WeightedState
from src.pools.weighted.weighted_math import (
    compute_in_given_exact_out,
    compute_out_given_exact_in,
)

BALANCE_IN = 1_000_000_000_000
BALANCE_OUT = 1_000_000_000_000_000_000_000_000


def make_pool(weights, **kwargs) -> Weighted:
    return Weighted(
        WeightedState(
            pool_address="0x0000000000000000000000000000000000000001",
            tokens=[
                "0x000000000000000000000000000000000000000a",
                "0x000000000000000000000000000000000000000b",
            ],
            scaling_factors=[1, 1],
            token_rates=[10**18, 10**18],
            balances_live_scaled18=[BALANCE_IN, BALANCE_OUT],
            swap_fee=0,
            aggregate_swap_fee=0,
            total_supply=10**24,
            supports_unbalanced_liquidity=True,
            hook_type=None,
            weights=weights,
            **kwargs,
        )
    )


def swap_params(swap_kind: SwapKind, amount: int) -> SwapParams:
    return SwapParams(
        swap_kind=swap_kind,
        balances_live_scaled18=[BALANCE_IN, BALANCE_OUT],
        index_in=0,
        index_out=1,
        amount_given_scaled18=amount,
    )


# WeightedPool v2 (balancer-v3-monorepo #1601, deployed in 20261021-weighted-pool) rounds
# `balanceTokenIn` up by 1 wei on both ExactIn and ExactOut swaps.
def test_on_swap_exact_in_rounds_balance_in_up():
    weights = [5 * 10**17, 5 * 10**17]
    amount_in = 100_000_000_000
    v2 = compute_out_given_exact_in(
        BALANCE_IN + 1, weights[0], BALANCE_OUT, weights[1], amount_in
    )
    v1 = compute_out_given_exact_in(
        BALANCE_IN, weights[0], BALANCE_OUT, weights[1], amount_in
    )
    assert v2 != v1
    params = swap_params(SwapKind.GIVENIN, amount_in)
    assert make_pool(weights).on_swap(params) == v2
    assert make_pool(weights, pool_version=2).on_swap(params) == v2
    assert make_pool(weights, pool_version=1).on_swap(params) == v1


def test_on_swap_exact_out_rounds_balance_in_up():
    weights = [2 * 10**17, 8 * 10**17]
    amount_out = 300_000_000_000_000_000_000_000
    v2 = compute_in_given_exact_out(
        BALANCE_IN + 1, weights[0], BALANCE_OUT, weights[1], amount_out
    )
    v1 = compute_in_given_exact_out(
        BALANCE_IN, weights[0], BALANCE_OUT, weights[1], amount_out
    )
    assert v2 != v1
    params = swap_params(SwapKind.GIVENOUT, amount_out)
    assert make_pool(weights).on_swap(params) == v2
    assert make_pool(weights, pool_version=2).on_swap(params) == v2
    assert make_pool(weights, pool_version=1).on_swap(params) == v1


# WeightedPool v2 enforces per-token minimum balances (`getMinTokenBalances()`) in onSwap,
# computeInvariant and computeBalance, reverting with TokenBalanceBelowMin.
MIN_WEIGHTS = [5 * 10**17, 5 * 10**17]
MIN_BALANCES = [10 * 10**18, 10 * 10**18]
LOW_MINS = [10**18, 10**18]
HIGH_MIN_OUT = [10**18, 95 * 10**17]
HIGH_MIN_IN = [10 * 10**18 + 2, 10**18]
EXACT_IN = SwapParams(
    swap_kind=SwapKind.GIVENIN,
    balances_live_scaled18=MIN_BALANCES,
    index_in=0,
    index_out=1,
    amount_given_scaled18=10**18,
)


def test_on_swap_reverts_when_ending_token_out_balance_below_min():
    pool = make_pool(MIN_WEIGHTS, min_token_balances=HIGH_MIN_OUT)
    with pytest.raises(ValueError, match="TokenBalanceBelowMin"):
        pool.on_swap(EXACT_IN)


def test_on_swap_reverts_when_balance_token_in_below_min():
    pool = make_pool(MIN_WEIGHTS, min_token_balances=HIGH_MIN_IN)
    with pytest.raises(ValueError, match="TokenBalanceBelowMin"):
        pool.on_swap(EXACT_IN)


def test_compute_invariant_reverts_when_balance_below_min():
    pool = make_pool(MIN_WEIGHTS, min_token_balances=HIGH_MIN_OUT)
    with pytest.raises(ValueError, match="TokenBalanceBelowMin"):
        pool.compute_invariant([10 * 10**18, 9 * 10**18], Rounding.ROUND_DOWN)


def test_compute_balance_reverts_when_new_balance_below_min():
    pool = make_pool(MIN_WEIGHTS, min_token_balances=HIGH_MIN_OUT)
    with pytest.raises(ValueError, match="TokenBalanceBelowMin"):
        pool.compute_balance(MIN_BALANCES, 1, 9 * 10**17)


def test_no_revert_above_min_nor_for_version_1_pools():
    pool = make_pool(MIN_WEIGHTS, min_token_balances=LOW_MINS)
    pool.on_swap(EXACT_IN)
    pool.compute_invariant(MIN_BALANCES, Rounding.ROUND_DOWN)
    pool.compute_balance(MIN_BALANCES, 1, 9 * 10**17)
    v1 = make_pool(MIN_WEIGHTS, pool_version=1, min_token_balances=HIGH_MIN_OUT)
    v1.on_swap(EXACT_IN)
