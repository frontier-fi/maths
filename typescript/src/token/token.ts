export type TokenAddress = `0x${string}`;

export type BigintIsh = bigint | string | number;

export type InputToken = {
    address: TokenAddress;
    decimals: number;
};

export class Token {
    public readonly chainId: number;
    public readonly address: TokenAddress;
    public readonly decimals: number;
    public readonly symbol?: string;
    public readonly name?: string;

    public constructor(
        chainId: number,
        address: TokenAddress,
        decimals: number,
        symbol?: string,
        name?: string,
    ) {
        this.chainId = chainId;
        // Addresses are always lowercased for speed
        this.address = address.toLowerCase() as TokenAddress;
        this.decimals = decimals;
        this.symbol = symbol;
        this.name = name;
    }

    public isEqual(token: Token): boolean {
        return this.chainId === token.chainId && this.address === token.address;
    }

    public isSameAddress(address: TokenAddress): boolean {
        return this.address === address.toLowerCase();
    }

    public toInputToken(): InputToken {
        return {
            address: this.address,
            decimals: this.decimals,
        };
    }
}
