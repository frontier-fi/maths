---
'@frontier-fi/maths': patch
---

The static `GyroECLPMath` methods no longer depend on `this`, so they work as detached function values (as `MathSol` does). The same applies to the internal `SignedFixedPoint` and `GyroPoolMath` helpers.
