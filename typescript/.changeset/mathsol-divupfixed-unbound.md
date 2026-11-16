---
'@frontier-fi/maths': patch
---

`MathSol.divUpFixed` works again as a detached function value (for example as a `FixedPointFunction` callback). This also fixes the Gyro2CLP invariant rounded up, which threw a `TypeError`.
