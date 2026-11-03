// pnpm test -- bufferPool.test.ts
import { describe, expect, test } from 'vitest';
import { BufferState, Vault } from '../src/index';

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
});
