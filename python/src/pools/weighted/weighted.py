from typing import List, Optional

from src.common.maths import Rounding
from src.common.pool_base import PoolBase
from src.common.swap_params import SwapParams
from src.common.types import SwapKind
from src.pools.weighted.weighted_data import WeightedState
from src.pools.weighted.weighted_math import (
    _MAX_INVARIANT_RATIO,
    _MIN_INVARIANT_RATIO,
    compute_balance_out_given_invariant,
    compute_in_given_exact_out,
    compute_invariant_down,
    compute_invariant_up,
    compute_out_given_exact_in,
)


class Weighted(PoolBase):
    def __init__(self, pool_state: WeightedState):
        self.normalized_weights = pool_state.weights
        self.pool_version = pool_state.pool_version
        self.min_token_balances: Optional[List[int]] = pool_state.min_token_balances

    def get_maximum_invariant_ratio(self) -> int:
        return _MAX_INVARIANT_RATIO

    def get_minimum_invariant_ratio(self) -> int:
        return _MIN_INVARIANT_RATIO

    def on_swap(self, swap_params: SwapParams) -> int:
        # Pool version 2 rounds `balanceTokenIn` up on both ExactIn and ExactOut swaps.
        balance_token_in_scaled18 = swap_params.balances_live_scaled18[
            swap_params.index_in
        ] + (1 if self.pool_version >= 2 else 0)
        balance_token_out_scaled18 = swap_params.balances_live_scaled18[
            swap_params.index_out
        ]

        self._ensure_minimum_balance(swap_params.index_in, balance_token_in_scaled18)

        if swap_params.swap_kind.value == SwapKind.GIVENIN.value:
            calculated_amount_scaled18 = compute_out_given_exact_in(
                balance_token_in_scaled18,
                self.normalized_weights[swap_params.index_in],
                balance_token_out_scaled18,
                self.normalized_weights[swap_params.index_out],
                swap_params.amount_given_scaled18,
            )
            amount_out_scaled18 = calculated_amount_scaled18
        else:
            calculated_amount_scaled18 = compute_in_given_exact_out(
                balance_token_in_scaled18,
                self.normalized_weights[swap_params.index_in],
                balance_token_out_scaled18,
                self.normalized_weights[swap_params.index_out],
                swap_params.amount_given_scaled18,
            )
            amount_out_scaled18 = swap_params.amount_given_scaled18

        self._ensure_minimum_balance(
            swap_params.index_out, balance_token_out_scaled18 - amount_out_scaled18
        )

        return calculated_amount_scaled18

    def compute_invariant(
        self, balances_live_scaled18: List[int], rounding: Rounding
    ) -> int:
        for i, balance in enumerate(balances_live_scaled18):
            self._ensure_minimum_balance(i, balance)

        if rounding.value == Rounding.ROUND_UP.value:
            return compute_invariant_up(self.normalized_weights, balances_live_scaled18)

        return compute_invariant_down(self.normalized_weights, balances_live_scaled18)

    def compute_balance(
        self,
        balances_live_scaled18: List[int],
        token_in_index: int,
        invariant_ratio: int,
    ) -> int:
        original_balance = balances_live_scaled18[token_in_index]
        new_balance = compute_balance_out_given_invariant(
            original_balance,
            self.normalized_weights[token_in_index],
            invariant_ratio,
        )

        self._ensure_minimum_balance(token_in_index, min(original_balance, new_balance))

        return new_balance

    def _ensure_minimum_balance(self, token_index: int, balance_scaled18: int) -> None:
        # Pool version 2 reverts if a token balance would fall below its minimum
        # (`getMinTokenBalances()`). Skipped when the minimum balances are not part of
        # the pool state.
        if self.pool_version < 2 or self.min_token_balances is None:
            return
        minimum_balance_scaled18 = self.min_token_balances[token_index]
        if balance_scaled18 < minimum_balance_scaled18:
            raise ValueError(
                "TokenBalanceBelowMin",
                token_index,
                balance_scaled18,
                minimum_balance_scaled18,
            )
