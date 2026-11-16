# @frontier-fi/maths

## 0.2.1

### Patch Changes

- 74cbb60: `MathSol` divisions (`divUp`, `divDownFixed`, `divUpFixed`, `mulDivUpFixed`) throw a `RangeError` on a zero denominator for any numerator, matching the onchain reverts, instead of returning `0n`.
- 8b1bb90: `MathSol.divUpFixed` works again as a detached function value (for example as a `FixedPointFunction` callback). This also fixes the Gyro2CLP invariant rounded up, which threw a `TypeError`.
- 6f6406b: The static `GyroECLPMath` methods no longer depend on `this`, so they work as detached function values (as `MathSol` does). The same applies to the internal `SignedFixedPoint` and `GyroPoolMath` helpers.

## 0.2.0

### Minor Changes

- ed99025: Export `MathSol`, `LogExpMath`, `WAD`, `RAY` (1e27), `ONE_36` (1e36), `MAX_UINT256`, and zero-dependency `Token` / `TokenAmount` (`DECIMAL_SCALES`, `BigintIsh`, `toExact`) primitives from the package entrypoint, and fix `MathSol.powDownFixed` fast-path rounding for exponents `2 * WAD` and `4 * WAD`.

## 0.1.1

### Patch Changes

- 44a6a72: Tooling only, no changes to the package code: built with pnpm 12 on Node 24, and released from the `release` environment with npm trusted publishing and provenance.

## 0.1.0

### Minor Changes

- e9ff155: First npm release as `@frontier-fi/maths` (previously distributed as a GitHub release tarball under the name `@balancer-labs/balancer-maths`). Aligns the maths with the frontier v3 deployments:

    - WeightedPool v2: `onSwap` rounds `balanceTokenIn` up by 1 wei, and per-token minimum balances (`minTokenBalances`) are enforced with `TokenBalanceBelowMin`. Weighted state takes an optional `poolVersion` (default `2`).
    - Weighted `computeBalanceOutGivenInvariant` rounds the `1 / weight` exponent down when the invariant ratio is below one.
    - Add-liquidity single-token exact-out rounds the non-taxable balance once.
    - Buffers: the minimum wrap amount is `1e4`, checked on both the given and the calculated amount. With `mainDecimals` and `underlyingDecimals` on `BufferState`, the calculated amount is checked in the calculated token's raw decimals.
    - `new Vault({ minTradeAmount, minWrapAmount })` makes the Vault minimums configurable; the defaults are exported as `DEFAULT_MINIMUM_TRADE_AMOUNT` and `DEFAULT_MINIMUM_WRAP_AMOUNT`.
