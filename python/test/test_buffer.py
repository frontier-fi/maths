import pytest

from src.common.types import SwapInput, SwapKind
from src.pools.buffer.buffer_data import BufferState
from src.pools.buffer.erc4626_buffer_wrap_or_unwrap import (
    erc4626_buffer_wrap_or_unwrap,
)

WRAPPED = "0xd4fa2d31b7968e448877f69a96de69f5de8cd23e"
UNDERLYING = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
POOL = BufferState(
    pool_address=WRAPPED,
    tokens=[WRAPPED, UNDERLYING],
    rate=2 * 10**18,
    max_deposit=10**18,
    max_mint=10**18,
)


def wrap(amount_raw: int) -> int:
    return erc4626_buffer_wrap_or_unwrap(
        SwapInput(
            amount_raw=amount_raw,
            swap_kind=SwapKind.GIVENIN,
            token_in=UNDERLYING,
            token_out=WRAPPED,
        ),
        POOL,
    )


# The frontier Vault (20261016-vault) is deployed with minWrapAmount = 1e4, and checks both
# the given and the calculated amount (Vault.erc4626BufferWrapOrUnwrap).
def test_wrap_throws_when_given_amount_below_minimum():
    with pytest.raises(ValueError, match="wrapAmountTooSmall"):
        wrap(9_999)


def test_wrap_throws_when_calculated_amount_below_minimum():
    # 15000 underlying at rate 2 wraps into 7500 shares
    with pytest.raises(ValueError, match="wrapAmountTooSmall"):
        wrap(15_000)


def test_wrap_succeeds_when_both_amounts_at_least_minimum():
    assert wrap(20_000) == 10_000
