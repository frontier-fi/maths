import { MAX_UINT256 } from '../constants';
import { MathSol } from '../utils/math';
import { toRawUndoRateRoundDown } from '../vault/utils';
import {
    MaxSingleTokenRemoveParams,
    MaxSwapParams,
    type PoolBase,
    Rounding,
    SwapKind,
    type SwapParams,
} from '../vault/types';
import {
    _computeOutGivenExactIn,
    _computeInGivenExactOut,
    _computeBalanceOutGivenInvariant,
    _MAX_IN_RATIO,
    _MAX_OUT_RATIO,
    _MAX_INVARIANT_RATIO,
    _MIN_INVARIANT_RATIO,
    _computeInvariantUp,
    _computeInvariantDown,
} from './weightedMath';

export class Weighted implements PoolBase {
    public normalizedWeights: bigint[];
    public poolVersion: number;
    public minTokenBalances?: bigint[];

    constructor(poolState: {
        weights: bigint[];
        poolVersion?: number;
        minTokenBalances?: bigint[];
    }) {
        this.normalizedWeights = poolState.weights;
        this.poolVersion = poolState.poolVersion ?? 2;
        this.minTokenBalances = poolState.minTokenBalances;
    }

    getMaximumInvariantRatio(): bigint {
        return _MAX_INVARIANT_RATIO;
    }

    getMinimumInvariantRatio(): bigint {
        return _MIN_INVARIANT_RATIO;
    }

    /**
     * Returns the max amount that can be swapped in relation to the swapKind.
     * @param maxSwapParams
     * @returns GivenIn: Returns the max amount in. GivenOut: Returns the max amount out.
     */
    getMaxSwapAmount(maxSwapParams: MaxSwapParams): bigint {
        const {
            balancesLiveScaled18,
            indexIn,
            indexOut,
            tokenRates,
            scalingFactors,
            swapKind,
        } = maxSwapParams;
        if (swapKind === SwapKind.GivenIn) {
            const max18 = MathSol.mulDownFixed(
                balancesLiveScaled18[indexIn],
                _MAX_IN_RATIO,
            );
            // Scale to token in (and remove rate)
            return toRawUndoRateRoundDown(
                max18,
                scalingFactors[indexIn],
                tokenRates[indexIn],
            );
        }

        const max18 = MathSol.mulDownFixed(
            balancesLiveScaled18[indexOut],
            _MAX_OUT_RATIO,
        );
        // Scale to token out
        return toRawUndoRateRoundDown(
            max18,
            scalingFactors[indexOut],
            tokenRates[indexOut],
        );
    }

    getMaxSingleTokenAddAmount(): bigint {
        return MAX_UINT256;
    }

    getMaxSingleTokenRemoveAmount(
        maxRemoveParams: MaxSingleTokenRemoveParams,
    ): bigint {
        const {
            isExactIn,
            totalSupply,
            tokenOutBalance,
            tokenOutScalingFactor,
            tokenOutRate,
        } = maxRemoveParams;
        return this.getMaxSwapAmount({
            swapKind: isExactIn ? SwapKind.GivenIn : SwapKind.GivenOut,
            balancesLiveScaled18: [totalSupply, tokenOutBalance],
            tokenRates: [1000000000000000000n, tokenOutRate],
            scalingFactors: [1n, tokenOutScalingFactor],
            indexIn: 0,
            indexOut: 1,
        });
    }

    onSwap(swapParams: SwapParams): bigint {
        const {
            swapKind,
            balancesLiveScaled18: balancesScaled18,
            indexIn,
            indexOut,
            amountGivenScaled18,
        } = swapParams;
        // Pool version 2 rounds `balanceTokenIn` up on both ExactIn and ExactOut swaps.
        const balanceTokenInScaled18 =
            balancesScaled18[indexIn] + (this.poolVersion >= 2 ? 1n : 0n);
        const balanceTokenOutScaled18 = balancesScaled18[indexOut];

        this._ensureMinimumBalance(indexIn, balanceTokenInScaled18);

        let calculatedAmountScaled18: bigint;
        let amountOutScaled18: bigint;
        if (swapKind === SwapKind.GivenIn) {
            calculatedAmountScaled18 = _computeOutGivenExactIn(
                balanceTokenInScaled18,
                this.normalizedWeights[indexIn],
                balanceTokenOutScaled18,
                this.normalizedWeights[indexOut],
                amountGivenScaled18,
            );
            amountOutScaled18 = calculatedAmountScaled18;
        } else {
            calculatedAmountScaled18 = _computeInGivenExactOut(
                balanceTokenInScaled18,
                this.normalizedWeights[indexIn],
                balanceTokenOutScaled18,
                this.normalizedWeights[indexOut],
                amountGivenScaled18,
            );
            amountOutScaled18 = amountGivenScaled18;
        }

        this._ensureMinimumBalance(
            indexOut,
            balanceTokenOutScaled18 - amountOutScaled18,
        );

        return calculatedAmountScaled18;
    }
    computeInvariant(
        balancesLiveScaled18: bigint[],
        rounding: Rounding,
    ): bigint {
        balancesLiveScaled18.forEach((balance, i) =>
            this._ensureMinimumBalance(i, balance),
        );

        if (rounding === Rounding.ROUND_UP)
            return _computeInvariantUp(
                this.normalizedWeights,
                balancesLiveScaled18,
            );
        else
            return _computeInvariantDown(
                this.normalizedWeights,
                balancesLiveScaled18,
            );
    }
    computeBalance(
        balancesLiveScaled18: bigint[],
        tokenInIndex: number,
        invariantRatio: bigint,
    ): bigint {
        const originalBalance = balancesLiveScaled18[tokenInIndex];
        const newBalance = _computeBalanceOutGivenInvariant(
            originalBalance,
            this.normalizedWeights[tokenInIndex],
            invariantRatio,
        );

        this._ensureMinimumBalance(
            tokenInIndex,
            originalBalance <= newBalance ? originalBalance : newBalance,
        );

        return newBalance;
    }

    /**
     * Pool version 2 reverts if a token balance would fall below its minimum (`getMinTokenBalances()`).
     * Skipped when the minimum balances are not part of the pool state.
     */
    private _ensureMinimumBalance(
        tokenIndex: number,
        balanceScaled18: bigint,
    ): void {
        if (this.poolVersion < 2 || !this.minTokenBalances) return;
        const minimumBalanceScaled18 = this.minTokenBalances[tokenIndex];
        if (balanceScaled18 < minimumBalanceScaled18) {
            throw new Error(
                `TokenBalanceBelowMin ${tokenIndex} ${balanceScaled18} ${minimumBalanceScaled18}`,
            );
        }
    }
}
