---
'@frontier-fi/maths': patch
---

`MathSol` divisions (`divUp`, `divDownFixed`, `divUpFixed`, `mulDivUpFixed`) throw a `RangeError` on a zero denominator for any numerator, matching the onchain reverts, instead of returning `0n`.
