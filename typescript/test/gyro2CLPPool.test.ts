// pnpm test -- gyro2CLPPool.test.ts
import { describe, expect, test } from 'vitest';
import { Gyro2CLP } from '../src/gyro';

describe('gyro 2CLP pool', () => {
    const pool = new Gyro2CLP({
        sqrtAlpha: 997496867163000167n,
        sqrtBeta: 1002496882788171068n,
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
