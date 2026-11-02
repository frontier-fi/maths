//  pnpm test -- weightedPool.test.ts
import { describe, expect, test } from 'vitest';
import { SwapKind } from '../src/index';
import { Weighted } from '../src/weighted';
import {
    _computeInGivenExactOut,
    _computeOutGivenExactIn,
} from '../src/weighted/weightedMath';

describe('weighted pool', () => {
    const pool = new Weighted({
        weights: [60000000000000000000n, 40000000000000000000n],
    });
    describe('getMaxSwapAmount', () => {
        test('exact in, 18 decimals', () => {
            const swapParams = {
                swapKind: SwapKind.GivenIn,
                amountGivenScaled18: 0n,
                balancesLiveScaled18: [
                    60000000000000000000n,
                    40000000000000000000n,
                ],
                tokenRates: [1000000000000000000n, 1000000000000000000n],
                scalingFactors: [1n, 1000000000000n],
                indexIn: 0,
                indexOut: 1,
            };
            const maxSwapAmount = pool.getMaxSwapAmount(swapParams);
            expect(maxSwapAmount).to.eq(18000000000000000000n);
        });
        test('exact in, 6 decimals', () => {
            const swapParams = {
                swapKind: SwapKind.GivenIn,
                amountGivenScaled18: 0n,
                balancesLiveScaled18: [
                    60000000000000000000n,
                    40000000000000000000n,
                ],
                tokenRates: [1000000000000000000n, 1000000000000000000n],
                scalingFactors: [1000000000000n, 1n],
                indexIn: 0,
                indexOut: 1,
            };
            const maxSwapAmount = pool.getMaxSwapAmount(swapParams);
            expect(maxSwapAmount).to.eq(18000000n);
        });
        test('exact out', () => {
            const swapParams = {
                swapKind: SwapKind.GivenOut,
                amountGivenScaled18: 0n,
                balancesLiveScaled18: [
                    60000000000000000000n,
                    40000000000000000000n,
                ],
                tokenRates: [1000000000000000000n, 1000000000000000000n],
                scalingFactors: [1n, 1000000000000n],
                indexIn: 0,
                indexOut: 1,
            };
            const maxSwapAmount = pool.getMaxSwapAmount(swapParams);
            expect(maxSwapAmount).to.eq(12000000n);
        });
        test('exact out', () => {
            const pool = new Weighted({
                weights: [
                    330000000000000000n,
                    330000000000000000n,
                    340000000000000000n,
                ],
            });
            const swapParams = {
                swapKind: SwapKind.GivenIn,
                amountGivenScaled18: 0n,
                balancesLiveScaled18: [
                    3000000000000000000n,
                    2341576000000000000n,
                    3000000000000000000n,
                ],
                tokenRates: [
                    1000000000000000000n,
                    1000000000000000000n,
                    1000000000000000000n,
                ],
                scalingFactors: [1000000000000n, 1000000000000n, 1n],
                indexIn: 2,
                indexOut: 0,
            };
            const maxSwapAmount = pool.getMaxSwapAmount(swapParams);
            expect(maxSwapAmount).to.eq(900000000000000000n);
        });
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
            expect(maxRemoveAmount).to.eq(30000000000000000000n);
        });
    });
    // WeightedPool v2 (balancer-v3-monorepo #1601, deployed in 20261021-weighted-pool) rounds
    // `balanceTokenIn` up by 1 wei on both ExactIn and ExactOut swaps.
    describe('onSwap rounds balanceTokenIn up (pool version 2)', () => {
        const weights = [500000000000000000n, 500000000000000000n];
        const balanceIn = 1000000000000n;
        const balanceOut = 1000000000000000000000000n;
        const swapParams = (
            swapKind: SwapKind,
            amountGivenScaled18: bigint,
        ) => ({
            swapKind,
            amountGivenScaled18,
            balancesLiveScaled18: [balanceIn, balanceOut],
            indexIn: 0,
            indexOut: 1,
        });

        test('exact in', () => {
            const amountIn = 100000000000n;
            const v2 = _computeOutGivenExactIn(
                balanceIn + 1n,
                weights[0],
                balanceOut,
                weights[1],
                amountIn,
            );
            const v1 = _computeOutGivenExactIn(
                balanceIn,
                weights[0],
                balanceOut,
                weights[1],
                amountIn,
            );
            expect(v2).not.toEqual(v1);
            const params = swapParams(SwapKind.GivenIn, amountIn);
            expect(new Weighted({ weights }).onSwap(params)).toEqual(v2);
            expect(
                new Weighted({ weights, poolVersion: 2 }).onSwap(params),
            ).toEqual(v2);
            expect(
                new Weighted({ weights, poolVersion: 1 }).onSwap(params),
            ).toEqual(v1);
        });

        test('exact out', () => {
            const weights = [200000000000000000n, 800000000000000000n];
            const amountOut = 300000000000000000000000n;
            const v2 = _computeInGivenExactOut(
                balanceIn + 1n,
                weights[0],
                balanceOut,
                weights[1],
                amountOut,
            );
            const v1 = _computeInGivenExactOut(
                balanceIn,
                weights[0],
                balanceOut,
                weights[1],
                amountOut,
            );
            expect(v2).not.toEqual(v1);
            const params = swapParams(SwapKind.GivenOut, amountOut);
            expect(new Weighted({ weights }).onSwap(params)).toEqual(v2);
            expect(
                new Weighted({ weights, poolVersion: 2 }).onSwap(params),
            ).toEqual(v2);
            expect(
                new Weighted({ weights, poolVersion: 1 }).onSwap(params),
            ).toEqual(v1);
        });
    });
});
