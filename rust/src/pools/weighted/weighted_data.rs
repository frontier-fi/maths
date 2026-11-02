//! Weighted pool data structures

use crate::common::types::BasePoolState;
use alloy_primitives::U256;
use serde::{Deserialize, Serialize};

/// Weighted pool state (extends BasePoolState with weighted-specific fields)
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct WeightedState {
    /// Base pool state
    #[serde(flatten)]
    pub base: BasePoolState,
    /// Normalized weights (scaled 18)
    pub weights: Vec<U256>,
    /// WeightedPool `version` (from the pool's `version()` JSON). Defaults to 2, the version deployed in
    /// 20261021-weighted-pool. Version 1 pools do not round `balanceTokenIn` up in `on_swap`.
    #[serde(default, rename = "poolVersion")]
    pub pool_version: Option<u32>,
    /// Per-token minimum balances (scaled 18) from the pool's `getMinTokenBalances()`; pool version 2
    /// only. When omitted, the TokenBalanceBelowMin checks are skipped.
    #[serde(default, rename = "minTokenBalances")]
    pub min_token_balances: Option<Vec<U256>>,
}

impl WeightedState {
    /// Create a new weighted pool state
    pub fn new(base: BasePoolState, weights: Vec<U256>) -> Self {
        Self {
            base,
            weights,
            pool_version: None,
            min_token_balances: None,
        }
    }

    /// Get the base pool state
    pub fn base(&self) -> &BasePoolState {
        &self.base
    }

    /// Get the weights
    pub fn weights(&self) -> &[U256] {
        &self.weights
    }
}

impl From<WeightedState> for BasePoolState {
    fn from(weighted_state: WeightedState) -> Self {
        weighted_state.base
    }
}

impl AsRef<BasePoolState> for WeightedState {
    fn as_ref(&self) -> &BasePoolState {
        &self.base
    }
}

impl From<WeightedState> for crate::common::types::PoolState {
    fn from(state: WeightedState) -> Self {
        crate::common::types::PoolState::Weighted(state)
    }
}
