import { BasePoolState } from '@/vault/types';

type PoolType = 'WEIGHTED';
export type WeightedImmutable = {
    weights: bigint[];
    // WeightedPool `version` (from the pool's `version()` JSON). Defaults to 2, the version deployed in
    // 20261021-weighted-pool. Version 1 pools do not round `balanceTokenIn` up in `onSwap`.
    poolVersion?: number;
};

export type WeightedState = BasePoolState & {
    poolType: PoolType;
} & WeightedImmutable;
