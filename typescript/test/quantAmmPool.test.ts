// pnpm test -- quantAmmPool.test.ts
import { describe, expect, test } from 'vitest';
import { QuantAmm } from '../src/quantAmm';

describe('quantAmm pool', () => {
    const pool = new QuantAmm({
        poolType: 'QUANT_AMM_WEIGHTED',
        poolAddress: '0x6b61d8680c4f9e560c8306807908553f95c749c5',
        tokens: [
            '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
            '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        ],
        scalingFactors: [1n, 1n],
        tokenRates: [1000000000000000000n, 1000000000000000000n],
        balancesLiveScaled18: [60000000000000000000n, 40000000000000000000n],
        swapFee: 20000000000000000n,
        aggregateSwapFee: 0n,
        totalSupply: 100000000000000000000n,
        supportsUnbalancedLiquidity: true,
        maxTradeSizeRatio: 100000000000000000n,
        firstFourWeightsAndMultipliers: [
            600000000000000000n,
            400000000000000000n,
            0n,
            0n,
        ],
        secondFourWeightsAndMultipliers: [0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n],
        lastUpdateTime: 0n,
        lastInteropTime: 0n,
        currentTimestamp: 0n,
    });
    describe('getMaxSingleTokenRemoveAmount', () => {
        test('exact in, BPT scaling factor is 1', () => {
            const maxRemoveAmount = pool.getMaxSingleTokenRemoveAmount({
                isExactIn: true,
                totalSupply: 100000000000000000000n,
                tokenOutBalance: 40000000000000000000n,
                tokenOutScalingFactor: 1n,
                tokenOutRate: 1000000000000000000n,
            });
            expect(maxRemoveAmount).to.eq(10000000000000000000n);
        });
    });
});
