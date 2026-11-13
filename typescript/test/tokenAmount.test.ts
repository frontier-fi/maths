import { describe, expect, test } from 'vitest';
import * as rootExports from '../src';
import {
    DECIMAL_SCALES,
    MAX_UINT256,
    MathSol,
    ONE_36,
    RAY,
    Token,
    TokenAmount,
    WAD,
} from '../src';

describe('MathSol and TokenAmount exports', () => {
    const usdc = new Token(
        8453,
        '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        6,
        'USDC',
        'USD Coin',
    );
    const weth = new Token(
        8453,
        '0x4200000000000000000000000000000000000006',
        18,
        'WETH',
        'Wrapped Ether',
    );
    const zeroDec = new Token(
        1,
        '0x0000000000000000000000000000000000000001',
        0,
    );

    test('exports MathSol, WAD, RAY (1e27), ONE_36 (1e36), MAX_UINT256, and DECIMAL_SCALES', () => {
        expect(WAD).toBe(10n ** 18n);
        expect(RAY).toBe(10n ** 27n);
        expect(ONE_36).toBe(10n ** 36n);
        expect(MAX_UINT256).toBe((1n << 256n) - 1n);
        expect(DECIMAL_SCALES[12]).toBe(10n ** 12n);
        expect('_require' in rootExports).toBe(false);
        expect(MathSol.divDownFixed(3n * WAD, 2n * WAD)).toBe(
            1_500_000_000_000_000_000n,
        );
        expect(MathSol.powDownFixed(4n * WAD, WAD / 2n)).toBeGreaterThan(0n);
    });

    test('MathSol.powDownFixed floors fast-path exponents 2*WAD and 4*WAD while powUpFixed ceils', () => {
        const x = WAD + 1n;
        expect(MathSol.powDownFixed(x, 2n * WAD)).toBe(WAD + 2n);
        expect(MathSol.powUpFixed(x, 2n * WAD)).toBe(WAD + 3n);
        expect(MathSol.powDownFixed(x, 4n * WAD)).toBe(WAD + 4n);
        expect(MathSol.powUpFixed(x, 4n * WAD)).toBe(WAD + 7n);
    });

    test('Token lowercases addresses and compares chainId + address', () => {
        expect(usdc.address).toBe('0x833589fcd6edb6e08f4c7c32d4f71b54bda02913');
        expect(
            usdc.isSameAddress('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'),
        ).toBe(true);
        expect(
            usdc.isEqual(
                new Token(
                    8453,
                    '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
                    6,
                ),
            ),
        ).toBe(true);
        expect(
            usdc.isEqual(
                new Token(1, '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', 6),
            ),
        ).toBe(false);
        expect(usdc.toInputToken()).toEqual({
            address: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
            decimals: 6,
        });
    });

    test('TokenAmount.fromHumanAmount handles decimals, rounding, carry, and signs', () => {
        const human = TokenAmount.fromHumanAmount(usdc, '12.345678');
        expect(human.amount).toBe(12_345_678n);
        expect(human.scale18).toBe(12_345_678_000_000_000_000n);
        expect(human.toSignificant(6)).toBe('12.3456');
        expect(human.toSignificant(8)).toBe('12.345678');

        // Round half-away-from-zero with carry overflow into integer part
        expect(TokenAmount.fromHumanAmount(usdc, '0.9999995').amount).toBe(
            1_000_000n,
        );
        expect(TokenAmount.fromHumanAmount(usdc, '0.9999994').amount).toBe(
            999_999n,
        );
        expect(TokenAmount.fromHumanAmount(usdc, '.5').amount).toBe(500_000n);
        expect(TokenAmount.fromHumanAmount(usdc, '-1.25').amount).toBe(
            -1_250_000n,
        );
        expect(TokenAmount.fromHumanAmount(zeroDec, '4.5').amount).toBe(5n);
        expect(() =>
            TokenAmount.fromHumanAmount(usdc, '' as `${number}`),
        ).toThrow();
    });

    test('TokenAmount preserves zero when rounding up in mulUpFixed, divUpFixed, and fromScale18Amount', () => {
        const zeroWeth = TokenAmount.fromRawAmount(weth, 0n);
        const fiveWeth = TokenAmount.fromRawAmount(weth, 5n);

        expect(zeroWeth.mulUpFixed(WAD).amount).toBe(0n);
        expect(fiveWeth.mulUpFixed(0n).amount).toBe(0n);
        expect(zeroWeth.divUpFixed(WAD).amount).toBe(0n);

        expect(TokenAmount.fromScale18Amount(usdc, 0n, true).amount).toBe(0n);
        expect(TokenAmount.fromScale18Amount(zeroDec, 0n, true).amount).toBe(
            0n,
        );
        expect(TokenAmount.fromScale18Amount(weth, 0n, true).amount).toBe(0n);
    });

    test('TokenAmount scales from scale18 and performs sign-aware fixed-point math', () => {
        const oddScale18 = 1_000_000_000_001n;
        expect(
            TokenAmount.fromScale18Amount(usdc, oddScale18, false).amount,
        ).toBe(1n);
        expect(
            TokenAmount.fromScale18Amount(usdc, oddScale18, true).amount,
        ).toBe(2n);

        const amt = TokenAmount.fromRawAmount(weth, 3n);
        expect(amt.add(TokenAmount.fromRawAmount(weth, 2n)).amount).toBe(5n);
        expect(amt.sub(TokenAmount.fromRawAmount(weth, 1n)).amount).toBe(2n);
        expect(amt.mulDownFixed(WAD / 2n).amount).toBe(1n);
        expect(amt.mulUpFixed(WAD / 2n).amount).toBe(2n);
        expect(amt.divDownFixed(2n * WAD).amount).toBe(1n);
        expect(amt.divUpFixed(2n * WAD).amount).toBe(2n);

        // Negative exact amounts remain exact
        const negTwo = TokenAmount.fromRawAmount(weth, -2n);
        expect(negTwo.mulUpFixed(WAD).amount).toBe(-2n);
        expect(negTwo.mulDownFixed(WAD).amount).toBe(-2n);
        expect(negTwo.divUpFixed(WAD).amount).toBe(-2n);
        expect(negTwo.divDownFixed(WAD).amount).toBe(-2n);
        expect(
            TokenAmount.fromScale18Amount(usdc, -2_000_000_000_000n, true)
                .amount,
        ).toBe(-2n);

        // Negative non-exact amounts round toward +inf (Up) and -inf (Down)
        const negThree = TokenAmount.fromRawAmount(weth, -3n);
        expect(negThree.mulUpFixed(WAD / 2n).amount).toBe(-1n);
        expect(negThree.mulDownFixed(WAD / 2n).amount).toBe(-2n);
        expect(negThree.divUpFixed(2n * WAD).amount).toBe(-1n);
        expect(negThree.divDownFixed(2n * WAD).amount).toBe(-2n);
        expect(
            TokenAmount.fromScale18Amount(usdc, -1_500_000_000_000n, true)
                .amount,
        ).toBe(-1n);
        expect(
            TokenAmount.fromScale18Amount(usdc, -1_500_000_000_000n, false)
                .amount,
        ).toBe(-2n);

        expect(() => amt.divUpFixed(0n)).toThrow();
        expect(() => amt.divDownFixed(0n)).toThrow();
    });

    test('TokenAmount.add and sub reject mismatched token address, chainId, or decimals', () => {
        const oneUsdc = TokenAmount.fromHumanAmount(usdc, '1');
        const oneWeth = TokenAmount.fromHumanAmount(weth, '1');
        const mainnetUsdc = TokenAmount.fromHumanAmount(
            new Token(1, usdc.address, 6),
            '1',
        );
        const wrongDecUsdc = TokenAmount.fromRawAmount(
            new Token(8453, usdc.address, 18),
            1n,
        );

        expect(() => oneUsdc.add(oneWeth)).toThrow(/Token mismatch/);
        expect(() => oneUsdc.sub(oneWeth)).toThrow(/Token mismatch/);
        expect(() => oneUsdc.add(mainnetUsdc)).toThrow(/Token mismatch/);
        expect(() => oneUsdc.sub(mainnetUsdc)).toThrow(/Token mismatch/);
        expect(() => oneUsdc.add(wrongDecUsdc)).toThrow(/Token mismatch/);
        expect(() => oneUsdc.sub(wrongDecUsdc)).toThrow(/Token mismatch/);
    });

    test('TokenAmount rejects unsafe integer numbers and invalid decimals', () => {
        // eslint-disable-next-line no-loss-of-precision
        const unsafe = 1000000000000000001;
        expect(() => TokenAmount.fromRawAmount(weth, unsafe)).toThrow(
            RangeError,
        );
        expect(() =>
            TokenAmount.fromRawAmount(weth, Number.MAX_SAFE_INTEGER + 1),
        ).toThrow(RangeError);
        expect(() => TokenAmount.fromRawAmount(weth, 1.5)).toThrow(RangeError);
        expect(() => TokenAmount.fromRawAmount(weth, Number.NaN)).toThrow(
            RangeError,
        );
        expect(() => TokenAmount.fromScale18Amount(weth, unsafe)).toThrow(
            RangeError,
        );
        expect(() => TokenAmount.fromRawAmount(weth, '')).toThrow(SyntaxError);
        expect(
            TokenAmount.fromRawAmount(weth, Number.MAX_SAFE_INTEGER).amount,
        ).toBe(BigInt(Number.MAX_SAFE_INTEGER));
        expect(
            TokenAmount.fromRawAmount(weth, '1000000000000000001').amount,
        ).toBe(1000000000000000001n);

        const badDecToken = new Token(1, usdc.address, 24);
        expect(() => TokenAmount.fromRawAmount(badDecToken, 1n)).toThrow(
            RangeError,
        );
    });

    test('TokenAmount.toSignificant preserves significant digits for small and negative amounts', () => {
        expect(TokenAmount.fromRawAmount(usdc, 0n).toSignificant()).toBe('0');
        expect(TokenAmount.fromRawAmount(usdc, 50_000n).toSignificant(4)).toBe(
            '0.05',
        );

        // Small nonzero amounts retain significant digits instead of becoming "0"
        const tinyWeth = TokenAmount.fromHumanAmount(weth, '0.0000001');
        expect(tinyWeth.toSignificant()).toBe('0.0000001');
        expect(TokenAmount.fromRawAmount(weth, 1n).toSignificant()).toBe(
            '0.000000000000000001',
        );
        expect(
            TokenAmount.fromHumanAmount(
                weth,
                '0.000000312457062375',
            ).toSignificant(6),
        ).toBe('0.000000312457');

        // Negative fractional amounts format sign before leading zero
        expect(TokenAmount.fromRawAmount(usdc, -1n).toSignificant()).toBe(
            '-0.000001',
        );
        expect(
            TokenAmount.fromHumanAmount(usdc, '-12.345678').toSignificant(6),
        ).toBe('-12.3456');

        // Large integer and zero-decimal amounts respect significantDigits without scientific notation
        expect(
            TokenAmount.fromHumanAmount(usdc, '12345678').toSignificant(6),
        ).toBe('12345600');
        expect(TokenAmount.fromRawAmount(zeroDec, -42n).toSignificant()).toBe(
            '-42',
        );
        expect(() => tinyWeth.toSignificant(0)).toThrow(RangeError);
    });
});
