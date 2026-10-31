// pnpm test -- gyroECLPPool.test.ts
import { describe, expect, test } from 'vitest';
import { GyroECLP } from '../src/gyro';

describe('gyro ECLP pool', () => {
    // params from testData/testData/11155111-7748718-GyroECLP.json
    const pool = new GyroECLP({
        paramsAlpha: 998502246630054917n,
        paramsBeta: 1000200040008001600n,
        paramsC: 707106781186547524n,
        paramsS: 707106781186547524n,
        paramsLambda: 4000000000000000000000n,
        tauAlphaX: -94861212813096057289512505574275160547n,
        tauAlphaY: 31644119574235279926451292677567331630n,
        tauBetaX: 37142269533113549537591131345643981951n,
        tauBetaY: 92846388265400743995957747409218517601n,
        u: 66001741173104803338721745994955553010n,
        v: 62245253919818011890633399060291020887n,
        w: 30601134345582732000058913853921008022n,
        z: -28859471639991253843240999485797747790n,
        dSq: 99999999999999999886624093342106115200n,
    });
    describe('getMaxSingleTokenRemoveAmount', () => {
        test('exact in, BPT scaling factor is 1', () => {
            const maxRemoveAmount = pool.getMaxSingleTokenRemoveAmount({
                isExactIn: true,
                totalSupply: 100000000000000000000n,
                tokenOutBalance: 40000000000000000000n,
                tokenOutScalingFactor: 1n,
                tokenOutRate: 1000000000000000000n,
            });
            expect(maxRemoveAmount).to.eq(
                340282366920938463363374607431768211456n,
            );
        });
    });
});
