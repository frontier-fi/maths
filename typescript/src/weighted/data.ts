import { BasePoolState } from '@/vault/types';

type PoolType = 'WEIGHTED';
export type WeightedImmutable = {
    weights: bigint[];
    // WeightedPool `version` (from the pool's `version()` JSON). Defaults to 2, the version deployed in
    // 20261021-weighted-pool. Version 1 pools do not round `balanceTokenIn` up in `onSwap`.
    poolVersion?: number;
    // Per-token minimum balances (scaled18) from the pool's `getMinTokenBalances()`; pool version 2 only.
    // When omitted, the TokenBalanceBelowMin checks are skipped.
    minTokenBalances?: bigint[];
};

export type WeightedState = BasePoolState & {
    poolType: PoolType;
} & WeightedImmutable;
