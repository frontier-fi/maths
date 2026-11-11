type PoolType = 'Buffer';

export type BufferMutable = {
    rate: bigint;
    maxDeposit?: bigint;
    maxMint?: bigint;
};

export type BufferImmutable = {
    poolAddress: string;
    tokens: string[];
    // Decimals of the wrapped (ERC4626, `poolAddress`) token and its underlying token. With a decimal-normalized
    // rate the calculated amount is in the given token's decimals; when both are set it is scaled to the calculated
    // token's raw decimals for the Vault's minimum wrap amount check. The returned amount is not scaled.
    mainDecimals?: number;
    underlyingDecimals?: number;
};

/**
 * State of a buffer. Note - rate uses scaled 18.
 */
export type BufferState = { poolType: PoolType } & BufferImmutable &
    BufferMutable;
