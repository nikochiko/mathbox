export function npr(n: number, r: number) : number {
    if (!isInteger(n) || !isInteger(r)) {
        throw new Error("n and r must be integers");
    }

    if (n < 0 || r < 0) {
        throw new Error("n and r must be positive");
    }

    if (r > n) {
        throw new Error("r must be less than or equal to n");
    }

    return factorial(n) / factorial(n - r);
}

export function ncr(n: number, r: number) : number {
    return npr(n, r) / factorial(r);
}

export function factorial(n: number): number {
    if (!isInteger(n)) {
        throw new Error("n must be an integer");
    }

    if (n < 0) {
        throw new Error("n must be positive");
    }

    let result = 1;
    for (let k = n; k > 0; k--) {
        result *= k;
    }

    return result;
}

export function add(...args: number[]): number {
    return args.reduce((acc, cur) => acc + cur, 0);
}

export function sub(a: number, b: number): number {
    return a - b;
}

export function mul(...args: number[]): number {
    return args.reduce((acc, cur) => acc * cur, 1);
}

export function div(a: number, b: number): number {
    return a / b;
}

export function floor(a: number): number {
    return Math.floor(a);
}

export function ceil(a: number): number {
    return Math.ceil(a);
}

export function pow(a: number, b: number): number {
    return Math.pow(a, b);
}

// to check that a *number* is an integer (and not float)
function isInteger(n: number): boolean {
    return n % 1 === 0;
}
