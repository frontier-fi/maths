// pnpm test -- basePoolMath.test.ts
import { describe, expect, test } from 'vitest';
import { MathSol } from '../src/utils/math';
import { computeAddLiquiditySingleTokenExactOut } from '../src/vault/basePoolMath';

// v3 BasePoolMath (vault 25d73b3d) computes the non-taxable balance as `(newSupply * balance) / totalSupply`,
// rounding once. Rounding twice (mulDown then divDown) lowers it and overcharges the swap fee.
describe('base pool math - computeAddLiquiditySingleTokenExactOut', () => {
    test('non-taxable balance is rounded once', () => {
        const totalSupply = 1000000000007n;
        const balances = [5000000000000000011n, 5000000000000000011n];
        const exactBptAmountOut = 100000000003n;
        const swapFeePercentage = 100000000000000000n;
        // Linear balance-given-invariant, enough to exercise the fee logic
        const computeBalance = (
            balancesLiveScaled18: bigint[],
            tokenInIndex: number,
            invariantRatio: bigint,
        ) =>
            MathSol.mulUpFixed(
                balancesLiveScaled18[tokenInIndex],
                invariantRatio,
            );

        const newSupply = exactBptAmountOut + totalSupply;
        const newBalance = computeBalance(
            balances,
            0,
            MathSol.divUpFixed(newSupply, totalSupply),
        );
        const taxableAmount =
            newBalance - (newSupply * balances[0]) / totalSupply;
        const expectedFee =
            MathSol.divUpFixed(
                taxableAmount,
                MathSol.complementFixed(swapFeePercentage),
            ) - taxableAmount;

        const { amountInWithFee, swapFeeAmounts } =
            computeAddLiquiditySingleTokenExactOut(
                balances,
                0,
                exactBptAmountOut,
                totalSupply,
                swapFeePercentage,
                5000000000000000000n,
                computeBalance,
            );

        expect(expectedFee).toEqual(1n);
        expect(swapFeeAmounts[0]).toEqual(expectedFee);
        expect(amountInWithFee).toEqual(newBalance - balances[0] + expectedFee);
    });
});
