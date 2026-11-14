// pnpm test -- staticHelpers.test.ts
import { describe, expect, test } from 'vitest';
import { GyroECLP, GyroECLPMath } from '../src';
import { GyroPoolMath } from '../src/gyro/gyroPoolMath';
import { SignedFixedPoint } from '../src/gyro/signedFixedPoint';

// Static math helpers must not depend on `this`, so they keep working when used as function values.
describe('static math helpers work as function values', () => {
    const ONE = 1000000000000000000n;

    describe('SignedFixedPoint', () => {
        const a = 3n * ONE + 7n;
        const b = -(2n * ONE) - 1n;
        test.each([
            'add',
            'addMag',
            'sub',
            'mulDownMag',
            'mulDownMagU',
            'mulUpMag',
            'mulUpMagU',
            'divDownMag',
            'divDownMagU',
            'divUpMag',
            'divUpMagU',
            'mulXp',
            'mulXpU',
            'divXp',
            'divXpU',
            'mulDownXpToNp',
            'mulDownXpToNpU',
            'mulUpXpToNp',
            'mulUpXpToNpU',
        ] as const)('%s', (name) => {
            const fn: (x: bigint, y: bigint) => bigint = SignedFixedPoint[name];
            expect(fn(a, b)).toEqual(SignedFixedPoint[name](a, b));
        });

        test('complement', () => {
            const fn = SignedFixedPoint.complement;
            expect(fn(ONE / 4n)).toEqual(SignedFixedPoint.complement(ONE / 4n));
        });
    });

    test('GyroPoolMath.sqrt', () => {
        const sqrt = GyroPoolMath.sqrt;
        expect(sqrt(2n * ONE, 5n)).toEqual(GyroPoolMath.sqrt(2n * ONE, 5n));
    });

    describe('GyroECLPMath', () => {
        // params from testData/testData/11155111-7748718-GyroECLP.json
        const { eclpParams, derivedECLPParams } = new GyroECLP({
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
        }).poolParams;
        const balances = [100n * ONE, 100n * ONE];

        test('calculateInvariantWithError', () => {
            const fn = GyroECLPMath.calculateInvariantWithError;
            expect(fn(balances, eclpParams, derivedECLPParams)).toEqual(
                GyroECLPMath.calculateInvariantWithError(
                    balances,
                    eclpParams,
                    derivedECLPParams,
                ),
            );
        });

        test('calcOutGivenIn', () => {
            const [currentInvariant, invErr] =
                GyroECLPMath.calculateInvariantWithError(
                    balances,
                    eclpParams,
                    derivedECLPParams,
                );
            const invariant = {
                x: currentInvariant + 2n * invErr,
                y: currentInvariant,
            };
            const fn = GyroECLPMath.calcOutGivenIn;
            expect(
                fn(
                    balances,
                    ONE,
                    true,
                    eclpParams,
                    derivedECLPParams,
                    invariant,
                ),
            ).toEqual(
                GyroECLPMath.calcOutGivenIn(
                    balances,
                    ONE,
                    true,
                    eclpParams,
                    derivedECLPParams,
                    invariant,
                ),
            );
        });
    });
});
