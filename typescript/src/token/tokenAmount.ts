import { WAD } from '../utils/math';
import { BigintIsh, InputToken, Token } from './token';

export type InputAmount = InputToken & {
    rawAmount: bigint;
};

export const DECIMAL_SCALES: Record<number, bigint> = {
    0: 1n,
    1: 10n,
    2: 100n,
    3: 1000n,
    4: 10000n,
    5: 100000n,
    6: 1000000n,
    7: 10000000n,
    8: 100000000n,
    9: 1000000000n,
    10: 10000000000n,
    11: 100000000000n,
    12: 1000000000000n,
    13: 10000000000000n,
    14: 100000000000000n,
    15: 1000000000000000n,
    16: 10000000000000000n,
    17: 100000000000000000n,
    18: 1000000000000000000n,
};

function assertValidDecimals(decimals: number): void {
    if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) {
        throw new RangeError(
            `Token decimals must be an integer between 0 and 18: ${decimals}`,
        );
    }
}

function toBigInt(value: BigintIsh): bigint {
    if (typeof value === 'bigint') {
        return value;
    }
    if (typeof value === 'number') {
        if (!Number.isSafeInteger(value)) {
            throw new RangeError(
                `Unsafe integer number: ${value}. Pass a bigint or string instead.`,
            );
        }
        return BigInt(value);
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed === '') {
            throw new SyntaxError('Cannot convert empty string to a BigInt');
        }
        return BigInt(trimmed);
    }
    throw new TypeError(`Unsupported BigintIsh value: ${String(value)}`);
}

function divFloor(a: bigint, b: bigint): bigint {
    if (b === 0n) {
        throw new RangeError('Division by zero');
    }
    const q = a / b;
    const r = a % b;
    return r !== 0n && r > 0n !== b > 0n ? q - 1n : q;
}

function divCeil(a: bigint, b: bigint): bigint {
    if (b === 0n) {
        throw new RangeError('Division by zero');
    }
    const q = a / b;
    const r = a % b;
    return r !== 0n && r > 0n === b > 0n ? q + 1n : q;
}

function parseDecimalUnits(value: string, decimals: number): bigint {
    assertValidDecimals(decimals);
    if (!/^-?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)$/.test(value)) {
        throw new Error(`Invalid decimal value: ${value}`);
    }

    let [integer = '', fraction = ''] = value.split('.');
    const negative = value.startsWith('-');
    if (negative) integer = integer.slice(1);
    if (integer === '') integer = '0';

    fraction = fraction.replace(/0+$/, '');

    if (decimals === 0) {
        if (fraction.length > 0 && Number(fraction[0]) >= 5) {
            integer = `${BigInt(integer) + 1n}`;
        }
        fraction = '';
    } else if (fraction.length > decimals) {
        const left = fraction.slice(0, decimals);
        const roundDigit = Number(fraction[decimals]);
        if (roundDigit >= 5) {
            const carried = (BigInt(left) + 1n)
                .toString()
                .padStart(decimals, '0');
            if (carried.length > decimals) {
                fraction = carried.slice(1);
                integer = `${BigInt(integer) + 1n}`;
            } else {
                fraction = carried;
            }
        } else {
            fraction = left;
        }
    } else {
        fraction = fraction.padEnd(decimals, '0');
    }

    return BigInt(`${negative ? '-' : ''}${integer}${fraction}`);
}

export class TokenAmount {
    public readonly token: Token;
    public readonly scalar: bigint;
    public readonly decimalScale: bigint;
    public amount: bigint;
    public scale18: bigint;

    public static fromRawAmount(
        token: Token,
        rawAmount: BigintIsh,
    ): TokenAmount {
        return new TokenAmount(token, rawAmount);
    }

    public static fromHumanAmount(
        token: Token,
        humanAmount: `${number}`,
    ): TokenAmount {
        const rawAmount = parseDecimalUnits(humanAmount, token.decimals);
        return new TokenAmount(token, rawAmount);
    }

    public static fromScale18Amount(
        token: Token,
        scale18Amount: BigintIsh,
        divUp?: boolean,
    ): TokenAmount {
        assertValidDecimals(token.decimals);
        const scalar = DECIMAL_SCALES[18 - token.decimals];
        const scaled = toBigInt(scale18Amount);
        const rawAmount = divUp
            ? divCeil(scaled, scalar)
            : divFloor(scaled, scalar);
        return new TokenAmount(token, rawAmount);
    }

    public static fromInputAmount(
        input: InputAmount,
        chainId: number,
    ): TokenAmount {
        const token = new Token(chainId, input.address, input.decimals);
        return new TokenAmount(token, input.rawAmount);
    }

    protected constructor(token: Token, amount: BigintIsh) {
        assertValidDecimals(token.decimals);
        this.decimalScale = DECIMAL_SCALES[token.decimals];
        this.token = token;
        this.amount = toBigInt(amount);
        this.scalar = DECIMAL_SCALES[18 - token.decimals];
        this.scale18 = this.amount * this.scalar;
    }

    private assertSameToken(other: TokenAmount): void {
        if (
            !this.token.isEqual(other.token) ||
            this.token.decimals !== other.token.decimals
        ) {
            throw new Error(
                `Token mismatch: ${this.token.chainId}:${this.token.address} (${this.token.decimals}) vs ${other.token.chainId}:${other.token.address} (${other.token.decimals})`,
            );
        }
    }

    public add(other: TokenAmount): TokenAmount {
        this.assertSameToken(other);
        return new TokenAmount(this.token, this.amount + other.amount);
    }

    public sub(other: TokenAmount): TokenAmount {
        this.assertSameToken(other);
        return new TokenAmount(this.token, this.amount - other.amount);
    }

    public mulUpFixed(other: bigint): TokenAmount {
        return new TokenAmount(this.token, divCeil(this.amount * other, WAD));
    }

    public mulDownFixed(other: bigint): TokenAmount {
        return new TokenAmount(this.token, divFloor(this.amount * other, WAD));
    }

    public divUpFixed(other: bigint): TokenAmount {
        return new TokenAmount(this.token, divCeil(this.amount * WAD, other));
    }

    public divDownFixed(other: bigint): TokenAmount {
        return new TokenAmount(this.token, divFloor(this.amount * WAD, other));
    }

    public toSignificant(significantDigits = 6): string {
        if (!Number.isInteger(significantDigits) || significantDigits <= 0) {
            throw new RangeError(
                `significantDigits must be a positive integer: ${significantDigits}`,
            );
        }
        if (this.amount === 0n) return '0';

        const sign = this.amount < 0n ? '-' : '';
        const digits = (
            this.amount < 0n ? -this.amount : this.amount
        ).toString();
        const decimals = this.token.decimals;

        const kept =
            digits.length > significantDigits
                ? digits.slice(0, significantDigits) +
                  '0'.repeat(digits.length - significantDigits)
                : digits;

        if (decimals === 0) {
            return `${sign}${kept}`;
        }

        if (kept.length <= decimals) {
            const padded = kept.padStart(decimals, '0').replace(/0+$/, '');
            return `${sign}0.${padded}`;
        }

        const intLen = kept.length - decimals;
        const intPart = kept.slice(0, intLen);
        const fracPart = kept.slice(intLen).replace(/0+$/, '');

        return fracPart.length === 0
            ? `${sign}${intPart}`
            : `${sign}${intPart}.${fracPart}`;
    }

    public toInputAmount(): InputAmount {
        return {
            address: this.token.address,
            decimals: this.token.decimals,
            rawAmount: this.amount,
        };
    }
}
