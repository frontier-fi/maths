import { BufferState } from '../buffer/data';
import { isSameAddress } from '../vault/utils';
import { SwapInput, SwapKind } from '../vault/types';
import { calculateBufferAmounts } from './bufferMath';
import { WrappingDirection } from './types';

// minWrapAmount of the frontier Vault (20261016-vault)
export const DEFAULT_MINIMUM_WRAP_AMOUNT = 10_000n;

export function erc4626BufferWrapOrUnwrap(
    input: SwapInput,
    poolState: BufferState,
    minWrapAmount: bigint = DEFAULT_MINIMUM_WRAP_AMOUNT,
): bigint {
    if (input.amountRaw < minWrapAmount) {
        // If amount given is too small, rounding issues can be introduced that favors the user and can drain
        // the buffer. minWrapAmount prevents it. Most tokens have protections against it already, this
        // is just an extra layer of security.
        throw new Error('wrapAmountTooSmall');
    }
    const wrappingDirection = isSameAddress(
        input.tokenIn,
        poolState.poolAddress,
    )
        ? WrappingDirection.UNWRAP
        : WrappingDirection.WRAP;

    const amountCalculatedRaw = calculateBufferAmounts(
        wrappingDirection,
        input.swapKind,
        input.amountRaw,
        poolState.rate,
        poolState.maxDeposit,
        poolState.maxMint,
    );

    // The Vault also checks the calculated amount against the minimum, in the calculated token's raw decimals
    if (
        _toCalculatedTokenDecimals(
            amountCalculatedRaw,
            wrappingDirection,
            input.swapKind,
            poolState,
        ) < minWrapAmount
    ) {
        throw new Error('wrapAmountTooSmall');
    }

    return amountCalculatedRaw;
}

/**
 * The calculated amount is in the given token's decimals (the rate is decimal-normalized). Scales it to the raw
 * decimals of the calculated token, rounding down. Unchanged when the buffer token decimals are not provided.
 */
function _toCalculatedTokenDecimals(
    amountCalculated: bigint,
    direction: WrappingDirection,
    kind: SwapKind,
    poolState: BufferState,
): bigint {
    const { mainDecimals, underlyingDecimals } = poolState;
    if (mainDecimals === undefined || underlyingDecimals === undefined)
        return amountCalculated;

    const [decimalsIn, decimalsOut] =
        direction === WrappingDirection.UNWRAP
            ? [mainDecimals, underlyingDecimals]
            : [underlyingDecimals, mainDecimals];
    const [givenDecimals, calculatedDecimals] =
        kind === SwapKind.GivenIn
            ? [decimalsIn, decimalsOut]
            : [decimalsOut, decimalsIn];

    if (calculatedDecimals >= givenDecimals)
        return (
            amountCalculated * 10n ** BigInt(calculatedDecimals - givenDecimals)
        );
    return amountCalculated / 10n ** BigInt(givenDecimals - calculatedDecimals);
}
