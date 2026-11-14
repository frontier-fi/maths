---
'@frontier-fi/maths': patch
---

`MathSol.divUp` throws a `RangeError` on a zero denominator again, instead of returning `0n`. A zero numerator still returns `0n`.
