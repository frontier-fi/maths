---
'@frontier-fi/maths': minor
---

Export `MathSol`, `LogExpMath`, `WAD`, `RAY` (1e27), `ONE_36` (1e36), `MAX_UINT256`, and zero-dependency `Token` / `TokenAmount` (`DECIMAL_SCALES`, `BigintIsh`, `toExact`) primitives from the package entrypoint, and fix `MathSol.powDownFixed` fast-path rounding for exponents `2 * WAD` and `4 * WAD`.
