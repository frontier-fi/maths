// pnpm test -- mathSol.test.ts
import { describe, expect, test } from 'vitest';
// Imported from the package entrypoint, as consumers of the exported MathSol do
import { MathSol } from '../src';

describe('MathSol', () => {
    // A zero denominator must fail, as it does with plain bigint division (and reverts on chain), instead of
    // returning a plausible zero.
    describe('divUp', () => {
        test('throws on a zero denominator', () => {
            expect(() => MathSol.divUp(1n, 0n)).toThrowError(RangeError);
            expect(() => MathSol.divUp(10n ** 18n, 0n)).toThrowError(
                RangeError,
            );
        });

        test('returns zero for a zero numerator', () => {
            expect(MathSol.divUp(0n, 3n)).toEqual(0n);
        });

        test('rounds up', () => {
            expect(MathSol.divUp(7n, 2n)).toEqual(4n);
            expect(MathSol.divUp(6n, 2n)).toEqual(3n);
        });
    });
});
