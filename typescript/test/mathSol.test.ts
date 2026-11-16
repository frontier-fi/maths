// pnpm test -- mathSol.test.ts
import { describe, expect, test } from 'vitest';
// Imported from the package entrypoint, as consumers of the exported MathSol do
import {
    calculateInvariant,
    type FixedPointFunction,
    MathSol,
    Rounding,
    WAD,
} from '../src';

describe('MathSol', () => {
    // A zero denominator must fail for any numerator, as it reverts on chain (FixedPoint.divDown panics,
    // mulDivUp / divUp / divUpRaw revert with ZeroDivision), instead of returning a plausible zero.
    describe('zero denominator', () => {
        const divisions = {
            divUp: (a: bigint, b: bigint) => MathSol.divUp(a, b),
            divDownFixed: (a: bigint, b: bigint) => MathSol.divDownFixed(a, b),
            divUpFixed: (a: bigint, b: bigint) => MathSol.divUpFixed(a, b),
            mulDivUpFixed: (a: bigint, b: bigint) =>
                MathSol.mulDivUpFixed(a, WAD, b),
        };

        test.each(Object.entries(divisions))(
            '%s throws for a non-zero numerator',
            (_, divide) => {
                expect(() => divide(1n, 0n)).toThrowError(RangeError);
                expect(() => divide(10n ** 18n, 0n)).toThrowError(RangeError);
            },
        );

        test.each(Object.entries(divisions))(
            '%s throws for a zero numerator',
            (_, divide) => {
                expect(() => divide(0n, 0n)).toThrowError(RangeError);
            },
        );

        test.each(Object.entries(divisions))(
            '%s returns zero for a zero numerator',
            (_, divide) => {
                expect(divide(0n, 3n)).toEqual(0n);
            },
        );
    });

    describe('divUp', () => {
        test('rounds up', () => {
            expect(MathSol.divUp(7n, 2n)).toEqual(4n);
            expect(MathSol.divUp(6n, 2n)).toEqual(3n);
        });
    });

    // The fixed point helpers are passed around as `FixedPointFunction` values, so they must not depend on `this`.
    describe('helpers work as function values', () => {
        test('divUpFixed', () => {
            const divide = MathSol.divUpFixed;
            expect(divide(1n, 2n)).toEqual(500000000000000000n);
        });

        test.each([
            'mulDownFixed',
            'mulUpFixed',
            'divDownFixed',
            'divUpFixed',
            'divUp',
            'min',
            'max',
        ] as const)('%s', (name) => {
            const fn: FixedPointFunction = MathSol[name];
            const a = 3n * WAD + 7n;
            const b = 2n * WAD + 1n;
            expect(fn(a, b)).toEqual(MathSol[name](a, b));
        });

        test('Gyro2CLP invariant rounded up (picks divUpFixed as a value)', () => {
            const balances = [1000n * WAD, 1200n * WAD];
            const sqrtAlpha = 900000000000000000n;
            const sqrtBeta = 1100000000000000000n;
            const up = calculateInvariant(
                balances,
                sqrtAlpha,
                sqrtBeta,
                Rounding.ROUND_UP,
            );
            const down = calculateInvariant(
                balances,
                sqrtAlpha,
                sqrtBeta,
                Rounding.ROUND_DOWN,
            );
            expect(up).toBeGreaterThanOrEqual(down);
        });
    });
});
