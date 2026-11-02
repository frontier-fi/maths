//! Weighted pool implementation

use crate::common::errors::PoolError;
use crate::common::pool_base::PoolBase;
use crate::common::types::{Rounding, SwapParams};
use crate::pools::weighted::weighted_data::WeightedState;
use crate::pools::weighted::weighted_math::{MAX_INVARIANT_RATIO, MIN_INVARIANT_RATIO, *};
use alloy_primitives::U256;

/// Default WeightedPool version: the version deployed in 20261021-weighted-pool
pub const DEFAULT_POOL_VERSION: u32 = 2;

/// Weighted pool implementation
pub struct WeightedPool {
    /// Normalized weights (scaled 18)
    normalized_weights: Vec<U256>,
    /// WeightedPool version; version 2 rounds `balanceTokenIn` up in `on_swap`
    pool_version: u32,
    /// Per-token minimum balances (scaled 18); enforced for pool version 2 when present
    min_token_balances: Option<Vec<U256>>,
}

impl WeightedPool {
    /// Create a new weighted pool (default pool version)
    pub fn new(weights: Vec<U256>) -> Result<Self, PoolError> {
        Self::new_with_version(weights, DEFAULT_POOL_VERSION)
    }

    /// Create a new weighted pool with an explicit pool version
    pub fn new_with_version(weights: Vec<U256>, pool_version: u32) -> Result<Self, PoolError> {
        if weights.is_empty() {
            return Err(PoolError::InvalidSwapParameters);
        }
        Ok(Self {
            normalized_weights: weights,
            pool_version,
            min_token_balances: None,
        })
    }

    /// Get the normalized weights
    pub fn normalized_weights(&self) -> &[U256] {
        &self.normalized_weights
    }

    /// Pool version 2 reverts if a token balance would fall below its minimum
    /// (`getMinTokenBalances()`). Skipped when the minimum balances are not part of the pool state.
    fn ensure_minimum_balance(
        &self,
        token_index: usize,
        balance_scaled_18: &U256,
    ) -> Result<(), PoolError> {
        if self.pool_version < 2 {
            return Ok(());
        }
        if let Some(min_token_balances) = &self.min_token_balances {
            let min = min_token_balances[token_index];
            if *balance_scaled_18 < min {
                return Err(PoolError::TokenBalanceBelowMin {
                    token_index,
                    balance: *balance_scaled_18,
                    min,
                });
            }
        }
        Ok(())
    }
}

impl PoolBase for WeightedPool {
    fn on_swap(&self, swap_params: &SwapParams) -> Result<U256, PoolError> {
        let token_in_index = swap_params.token_in_index;
        let token_out_index = swap_params.token_out_index;

        if token_in_index >= self.normalized_weights.len()
            || token_out_index >= self.normalized_weights.len()
        {
            return Err(PoolError::InvalidTokenIndex);
        }

        // Pool version 2 rounds `balanceTokenIn` up on both ExactIn and ExactOut swaps.
        let balance_in = &if self.pool_version >= 2 {
            swap_params.balances_live_scaled_18[token_in_index] + U256::ONE
        } else {
            swap_params.balances_live_scaled_18[token_in_index]
        };
        let weight_in = &self.normalized_weights[token_in_index];
        let balance_out = &swap_params.balances_live_scaled_18[token_out_index];
        let weight_out = &self.normalized_weights[token_out_index];
        let amount_scaled_18 = &swap_params.amount_scaled_18;

        self.ensure_minimum_balance(token_in_index, balance_in)?;

        let (calculated_amount_scaled_18, amount_out_scaled_18) = match swap_params.swap_kind {
            crate::common::types::SwapKind::GivenIn => {
                let amount_out = compute_out_given_exact_in(
                    balance_in,
                    weight_in,
                    balance_out,
                    weight_out,
                    amount_scaled_18,
                )?;
                (amount_out, amount_out)
            }
            crate::common::types::SwapKind::GivenOut => (
                compute_in_given_exact_out(
                    balance_in,
                    weight_in,
                    balance_out,
                    weight_out,
                    amount_scaled_18,
                )?,
                *amount_scaled_18,
            ),
        };

        let ending_balance_out = balance_out
            .checked_sub(amount_out_scaled_18)
            .ok_or(PoolError::MathOverflow)?;
        self.ensure_minimum_balance(token_out_index, &ending_balance_out)?;

        Ok(calculated_amount_scaled_18)
    }

    fn compute_invariant(
        &self,
        balances_live_scaled_18: &[U256],
        rounding: Rounding,
    ) -> Result<U256, PoolError> {
        for (i, balance) in balances_live_scaled_18.iter().enumerate() {
            self.ensure_minimum_balance(i, balance)?;
        }

        match rounding {
            Rounding::RoundDown => {
                compute_invariant_down(&self.normalized_weights, balances_live_scaled_18)
            }
            Rounding::RoundUp => {
                compute_invariant_up(&self.normalized_weights, balances_live_scaled_18)
            }
        }
    }

    fn compute_balance(
        &self,
        balances_live_scaled_18: &[U256],
        token_in_index: usize,
        invariant_ratio: &U256,
    ) -> Result<U256, PoolError> {
        if token_in_index >= balances_live_scaled_18.len()
            || token_in_index >= self.normalized_weights.len()
        {
            return Err(PoolError::InvalidTokenIndex);
        }

        let current_balance = &balances_live_scaled_18[token_in_index];
        let weight = &self.normalized_weights[token_in_index];

        // Calculate the new balance based on the invariant ratio
        let new_balance =
            compute_balance_out_given_invariant(current_balance, weight, invariant_ratio)?;

        self.ensure_minimum_balance(token_in_index, current_balance.min(&new_balance))?;

        Ok(new_balance)
    }

    fn get_maximum_invariant_ratio(&self) -> U256 {
        MAX_INVARIANT_RATIO
    }

    fn get_minimum_invariant_ratio(&self) -> U256 {
        MIN_INVARIANT_RATIO
    }
}

impl From<WeightedState> for WeightedPool {
    fn from(weighted_state: WeightedState) -> Self {
        Self {
            normalized_weights: weighted_state.weights,
            pool_version: weighted_state.pool_version.unwrap_or(DEFAULT_POOL_VERSION),
            min_token_balances: weighted_state.min_token_balances,
        }
    }
}
