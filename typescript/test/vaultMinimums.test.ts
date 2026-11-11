// pnpm test -- vaultMinimums.test.ts
import { describe, expect, test } from 'vitest';
import {
    BufferState,
    DEFAULT_MINIMUM_TRADE_AMOUNT,
    DEFAULT_MINIMUM_WRAP_AMOUNT,
    SwapKind,
    Vault,
    WeightedState,
} from '../src';

// The Vault minimums are configurable, defaulting to the frontier Vault (20261016-vault):
// minTradeAmount = 1e6 and minWrapAmount = 1e4.
describe('vault minimums', () => {
    test('exports the frontier Vault defaults', () => {
        expect(DEFAULT_MINIMUM_WRAP_AMOUNT).toEqual(10_000n);
        expect(DEFAULT_MINIMUM_TRADE_AMOUNT).toEqual(1_000_000n);
    });

    describe('minWrapAmount', () => {
        const wrapped = '0xd4fa2d31b7968e448877f69a96de69f5de8cd23e';
        const underlying = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
        const buffer: BufferState = {
            poolType: 'Buffer',
            rate: 1000000000000000000n,
            poolAddress: wrapped,
            tokens: [wrapped, underlying],
        };
        const wrap = (vault: Vault, amountRaw: bigint) =>
            vault.swap(
                {
                    amountRaw,
                    tokenIn: underlying,
                    tokenOut: wrapped,
                    swapKind: SwapKind.GivenIn,
                },
                buffer,
            );

        test('defaults to 1e4', () => {
            expect(() => wrap(new Vault(), 9_999n)).toThrowError(
                'wrapAmountTooSmall',
            );
            expect(wrap(new Vault(), 10_000n)).toEqual(10_000n);
        });

        test('can be lowered', () => {
            const vault = new Vault({ minWrapAmount: 1_000n });
            expect(wrap(vault, 5_000n)).toEqual(5_000n);
            expect(() => wrap(vault, 999n)).toThrowError('wrapAmountTooSmall');
        });

        test('can be raised', () => {
            const vault = new Vault({ minWrapAmount: 100_000n });
            expect(() => wrap(vault, 50_000n)).toThrowError(
                'wrapAmountTooSmall',
            );
        });
    });

    describe('minTradeAmount', () => {
        const tokens = [
            '0x000000000000000000000000000000000000000a',
            '0x000000000000000000000000000000000000000b',
        ];
        const pool: WeightedState = {
            poolType: 'WEIGHTED',
            poolAddress: '0x0000000000000000000000000000000000000001',
            tokens,
            scalingFactors: [1n, 1n],
            weights: [500000000000000000n, 500000000000000000n],
            swapFee: 0n,
            aggregateSwapFee: 0n,
            balancesLiveScaled18: [
                1000000000000000000000n,
                1000000000000000000000n,
            ],
            tokenRates: [1000000000000000000n, 1000000000000000000n],
            totalSupply: 2000000000000000000000n,
            supportsUnbalancedLiquidity: true,
        };
        const swap = (vault: Vault, amountRaw: bigint) =>
            vault.swap(
                {
                    amountRaw,
                    tokenIn: tokens[0],
                    tokenOut: tokens[1],
                    swapKind: SwapKind.GivenIn,
                },
                pool,
            );

        test('defaults to 1e6', () => {
            expect(() => swap(new Vault(), 999_999n)).toThrowError(
                'TradeAmountTooSmall',
            );
            expect(() => swap(new Vault(), 10_000_000n)).not.toThrow();
        });

        test('can be lowered', () => {
            const vault = new Vault({ minTradeAmount: 1_000n });
            expect(() => swap(vault, 500_000n)).not.toThrow();
        });

        test('can be raised', () => {
            const vault = new Vault({ minTradeAmount: 100_000_000n });
            expect(() => swap(vault, 10_000_000n)).toThrowError(
                'TradeAmountTooSmall',
            );
        });
    });
});
