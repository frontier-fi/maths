---
'@frontier-fi/maths': minor
---

First npm release as `@frontier-fi/maths` (previously distributed as a GitHub release tarball under the name `@balancer-labs/balancer-maths`). Aligns the maths with the frontier v3 deployments:

- WeightedPool v2: `onSwap` rounds `balanceTokenIn` up by 1 wei, and per-token minimum balances (`minTokenBalances`) are enforced with `TokenBalanceBelowMin`. Weighted state takes an optional `poolVersion` (default `2`).
- Weighted `computeBalanceOutGivenInvariant` rounds the `1 / weight` exponent down when the invariant ratio is below one.
- Add-liquidity single-token exact-out rounds the non-taxable balance once.
- Buffers: the minimum wrap amount is `1e4`, checked on both the given and the calculated amount. With `mainDecimals` and `underlyingDecimals` on `BufferState`, the calculated amount is checked in the calculated token's raw decimals.
- `new Vault({ minTradeAmount, minWrapAmount })` makes the Vault minimums configurable; the defaults are exported as `DEFAULT_MINIMUM_TRADE_AMOUNT` and `DEFAULT_MINIMUM_WRAP_AMOUNT`.
