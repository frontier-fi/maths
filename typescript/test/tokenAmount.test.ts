import { describe, expect, test } from 'vitest';
import {
    DECIMAL_SCALES,
    MAX_UINT256,
    MathSol,
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

    test('exports MathSol, WAD, MAX_UINT256, and DECIMAL_SCALES', () => {
        expect(WAD).toBe(10n ** 18n);
        expect(MAX_UINT256).toBe((1n << 256n) - 1n);
        expect(DECIMAL_SCALES[12]).toBe(10n ** 12n);
        expect(MathSol.divDownFixed(3n * WAD, 2n * WAD)).toBe(
            1_500_000_000_000_000_000n,
        );
        expect(MathSol.powDownFixed(4n * WAD, WAD / 2n)).toBeGreaterThan(0n);
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
        expect(human.toSignificant(6)).toBe('12.345678');

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

    test('TokenAmount scales from scale18 and performs fixed-point math', () => {
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
        expect(TokenAmount.fromRawAmount(usdc, 0n).toSignificant()).toBe('0');
        expect(TokenAmount.fromRawAmount(usdc, 50_000n).toSignificant(4)).toBe(
            '0.05',
        );
    });
});
