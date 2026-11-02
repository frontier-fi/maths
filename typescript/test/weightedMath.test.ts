// pnpm test -- weightedMath.test.ts
import { describe, expect, test } from 'vitest';
import { MathSol, WAD } from '../src/utils/math';
import { _computeBalanceOutGivenInvariant } from '../src/weighted/weightedMath';

// v3 WeightedMath.computeBalanceOutGivenInvariant rounds the `1 / weight` exponent up when the invariant
// ratio is above one and down otherwise, so the new balance is always rounded in the pool's favour.
describe('weighted math - computeBalanceOutGivenInvariant', () => {
    const currentBalance = 1000000000000000000000000n;
    const weight = 300000000000000000n;

    test('invariant ratio below one rounds the exponent down', () => {
        const invariantRatio = 739595000000000005n;
        const expected = MathSol.mulUpFixed(
            currentBalance,
            MathSol.powUpFixed(
                invariantRatio,
                MathSol.divDownFixed(WAD, weight),
            ),
        );
        const exponentRoundedUp = MathSol.mulUpFixed(
            currentBalance,
            MathSol.powUpFixed(invariantRatio, MathSol.divUpFixed(WAD, weight)),
        );
        expect(expected).not.toEqual(exponentRoundedUp);
        expect(
            _computeBalanceOutGivenInvariant(
                currentBalance,
                weight,
                invariantRatio,
            ),
        ).toEqual(expected);
    });

    test('invariant ratio above one rounds the exponent up', () => {
        const invariantRatio = 1100000000000000000n;
        const expected = MathSol.mulUpFixed(
            currentBalance,
            MathSol.powUpFixed(invariantRatio, MathSol.divUpFixed(WAD, weight)),
        );
        expect(
            _computeBalanceOutGivenInvariant(
                currentBalance,
                weight,
                invariantRatio,
            ),
        ).toEqual(expected);
    });
});
