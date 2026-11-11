// pnpm test -- bufferPool.test.ts
import { describe, expect, test } from 'vitest';
import { BufferState, SwapKind, Vault } from '../src/index';

describe('buffer pool', () => {
    test('should wrap when < maxDeposit', () => {
        const vault = new Vault();

        const pool: BufferState = {
            poolType: 'Buffer',
            rate: 1122761623535914092n,
            poolAddress: '0xd4fa2d31b7968e448877f69a96de69f5de8cd23e',
            tokens: [
                '0xd4fa2d31b7968e448877f69a96de69f5de8cd23e',
                '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            ],
            maxDeposit: 1900471418535512n,
            maxMint: 1692675790387594n,
        };

        const calculatedAmount = vault.swap(
            {
                amountRaw: 100000000n,
                tokenIn: '0xd4fa2d31b7968e448877f69a96de69f5de8cd23e',
                tokenOut: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
                swapKind: 0,
            },
            pool,
        );
        expect(calculatedAmount).toEqual(112276162n);
    });
    test('should throw when > maxDeposit', () => {
        const vault = new Vault();

        const pool: BufferState = {
            poolType: 'Buffer',
            rate: 1122761623535914092n,
            poolAddress: '0xd4fa2d31b7968e448877f69a96de69f5de8cd23e',
            tokens: [
                '0xd4fa2d31b7968e448877f69a96de69f5de8cd23e',
                '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            ],
            maxDeposit: 1900471418535512n,
            maxMint: 1692675790387594n,
        };
        expect(() => {
            vault.swap(
                {
                    amountRaw: pool.maxDeposit! + 1n,
                    tokenIn: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9',
                    tokenOut: '0xb19382073c7A0aDdbb56Ac6AF1808Fa49e377B75',
                    swapKind: 0,
                },
                pool,
            );
        }).toThrowError(
            'ERC4626ExceededMaxDeposit 1900471418535513 1900471418535512',
        );
    });
    test('should wrap when < maxMint', () => {
        const vault = new Vault();

        const pool: BufferState = {
            poolType: 'Buffer',
            rate: 1122761623535914092n,
            poolAddress: '0xd4fa2d31b7968e448877f69a96de69f5de8cd23e',
            tokens: [
                '0xd4fa2d31b7968e448877f69a96de69f5de8cd23e',
                '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            ],
            maxDeposit: 1900471418535512n,
            maxMint: 1692675790387594n,
        };

        const calculatedAmount = vault.swap(
            {
                amountRaw: 100000000n,
                tokenIn: '0xd4fa2d31b7968e448877f69a96de69f5de8cd23e',
                tokenOut: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
                swapKind: 1,
            },
            pool,
        );
        expect(calculatedAmount).toEqual(89066101n);
    });
    test('should throw when > maxMint', () => {
        const vault = new Vault();

        const pool: BufferState = {
            poolType: 'Buffer',
            rate: 1122761623535914092n,
            poolAddress: '0xd4fa2d31b7968e448877f69a96de69f5de8cd23e',
            tokens: [
                '0xd4fa2d31b7968e448877f69a96de69f5de8cd23e',
                '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            ],
            maxDeposit: 1900471418535512n,
            maxMint: 1692675790387594n,
        };
        expect(() => {
            vault.swap(
                {
                    amountRaw: pool.maxMint! + 1n,
                    tokenIn: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9',
                    tokenOut: '0xb19382073c7A0aDdbb56Ac6AF1808Fa49e377B75',
                    swapKind: 1,
                },
                pool,
            );
        }).toThrowError(
            'ERC4626ExceededMaxMint 1692675790387595 1692675790387594',
        );
    });
    // The frontier Vault (20261016-vault) is deployed with minWrapAmount = 1e4, and checks both the given and
    // the calculated amount (Vault.erc4626BufferWrapOrUnwrap).
    describe('minimum wrap amount', () => {
        const wrapped = '0xd4fa2d31b7968e448877f69a96de69f5de8cd23e';
        const underlying = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
        const pool: BufferState = {
            poolType: 'Buffer',
            rate: 2000000000000000000n,
            poolAddress: wrapped,
            tokens: [wrapped, underlying],
            maxDeposit: 1000000000000000000n,
            maxMint: 1000000000000000000n,
        };
        const wrap = (amountRaw: bigint) =>
            new Vault().swap(
                {
                    amountRaw,
                    tokenIn: underlying,
                    tokenOut: wrapped,
                    swapKind: 0,
                },
                pool,
            );

        test('throws when the given amount is below 1e4', () => {
            expect(() => wrap(9999n)).toThrowError('wrapAmountTooSmall');
        });

        test('throws when the calculated amount is below 1e4', () => {
            // 15000 underlying at rate 2 wraps into 7500 shares
            expect(() => wrap(15000n)).toThrowError('wrapAmountTooSmall');
        });

        test('does not throw when both amounts are at least 1e4', () => {
            expect(wrap(20000n)).toEqual(10000n);
        });
    });
    // With a decimal-normalized rate the calculated amount is in the given token's decimals. The Vault checks the
    // calculated amount in the raw decimals of the calculated token, so it is scaled before the minimum check when
    // mainDecimals (wrapped token) and underlyingDecimals are provided. The returned amount is not scaled.
    describe('minimum wrap amount across decimals', () => {
        const wrapped = '0x98c23e9d8f34fefb1b7bd6a91b7ff122f4e16f5c';
        const underlying = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
        const usdcBuffer: BufferState = {
            poolType: 'Buffer',
            rate: 1050000000000000000n,
            poolAddress: wrapped,
            tokens: [wrapped, underlying],
            mainDecimals: 18,
            underlyingDecimals: 6,
        };
        const swap = (
            pool: BufferState,
            tokenIn: string,
            tokenOut: string,
            swapKind: SwapKind,
            amountRaw: bigint,
        ) => new Vault().swap({ amountRaw, tokenIn, tokenOut, swapKind }, pool);

        test('wrap 0.01 USDC (6 dec) into waUSDC (18 dec) does not throw', () => {
            // 10,000 raw USDC -> 9,523 pre-scaling -> 9.523e15 raw waUSDC
            expect(
                swap(
                    usdcBuffer,
                    underlying,
                    wrapped,
                    SwapKind.GivenIn,
                    10_000n,
                ),
            ).toEqual(9_523n);
        });

        test('unwrap into less than 1e4 raw USDC throws', () => {
            // 9.5e15 raw waUSDC -> 9.975e15 pre-scaling -> 9,975 raw USDC
            expect(() =>
                swap(
                    usdcBuffer,
                    wrapped,
                    underlying,
                    SwapKind.GivenIn,
                    9_500_000_000_000_000n,
                ),
            ).toThrowError('wrapAmountTooSmall');
        });

        test('exact out wrap needing less than 1e4 raw USDC in throws', () => {
            // 9e15 raw waUSDC out -> 9.45e15 pre-scaling -> 9,450 raw USDC in
            expect(() =>
                swap(
                    usdcBuffer,
                    underlying,
                    wrapped,
                    SwapKind.GivenOut,
                    9_000_000_000_000_000n,
                ),
            ).toThrowError('wrapAmountTooSmall');
            // 1e16 raw waUSDC out -> 1.05e16 pre-scaling -> 10,500 raw USDC in
            expect(
                swap(
                    usdcBuffer,
                    underlying,
                    wrapped,
                    SwapKind.GivenOut,
                    10_000_000_000_000_000n,
                ),
            ).toEqual(10_500_000_000_000_000n);
        });

        test('wrap 125 EURS into 99.85 stataEthEURS (both 2 dec) throws', () => {
            const eurs = '0xdb25f211ab05b1c97d595516f45794528a807ad8';
            const stataEurs = '0xd4fa2d31b7968e448877f69a96de69f5de8cd23e';
            const eursBuffer: BufferState = {
                poolType: 'Buffer',
                rate: 1251877816725087631n,
                poolAddress: stataEurs,
                tokens: [stataEurs, eurs],
                mainDecimals: 2,
                underlyingDecimals: 2,
            };
            // 12,500 raw EURS in passes, 9,985 raw shares out reverts
            expect(() =>
                swap(eursBuffer, eurs, stataEurs, SwapKind.GivenIn, 12_500n),
            ).toThrowError('wrapAmountTooSmall');
        });
    });
});
