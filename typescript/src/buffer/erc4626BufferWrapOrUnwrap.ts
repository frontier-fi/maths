import { BufferState } from '../buffer/data';
import { isSameAddress } from '../vault/utils';
import { SwapInput } from '../vault/types';
import { calculateBufferAmounts } from './bufferMath';
import { WrappingDirection } from './types';

// minWrapAmount of the frontier Vault (20261016-vault)
const _MINIMUM_WRAP_AMOUNT = 10000n;

export function erc4626BufferWrapOrUnwrap(
    input: SwapInput,
    poolState: BufferState,
): bigint {
    if (input.amountRaw < _MINIMUM_WRAP_AMOUNT) {
        // If amount given is too small, rounding issues can be introduced that favors the user and can drain
        // the buffer. _MINIMUM_WRAP_AMOUNT prevents it. Most tokens have protections against it already, this
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

    // The Vault also checks the calculated amount against the minimum
    if (amountCalculatedRaw < _MINIMUM_WRAP_AMOUNT) {
        throw new Error('wrapAmountTooSmall');
    }

    return amountCalculatedRaw;
}
