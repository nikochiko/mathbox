// scheme parser in typescript

// Primitives

type LParen = "(";
type RParen = ")";

// type Letters
//     = "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h" | "j" | "k" | "l" | "m"
//     | "n" | "o" | "p" | "q" | "r" | "s" | "t" | "u" | "w" | "x" | "y" | "z"
//     | "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "J" | "K" | "L" | "M"
//     | "N" | "O" | "P" | "Q" | "R" | "S" | "T" | "U" | "W" | "X" | "Y" | "Z";
// type Whitespace = " " | "\n" | "\t" | "\r";

const NumberPattern = /[0-9]+(\.[0-9+])?/
type NumberToken = number;

// characters allowed in a variable name
type VarName = string;

type Primitive = VarName | NumberToken;

// allow up to 8 characters in a variable name.
// this looks hacky, but it's the clearest way because typescript doesn't allow
// unbounded recursion for template string types.
// maybe if all tokens are represented as a list of single-length strings, this can be changed
// to allow arbitrary-length variable names.
// type VarName
//     = `${VarChars}`
//     | `${VarChars}${VarChars}`
//     | `${VarChars}${VarChars}${VarChars}`
//     | `${VarChars}${VarChars}${VarChars}${VarChars}`
//     | `${VarChars}${VarChars}${VarChars}${VarChars}${VarChars}`
//     | `${VarChars}${VarChars}${VarChars}${VarChars}${VarChars}${VarChars}`
//     | `${VarChars}${VarChars}${VarChars}${VarChars}${VarChars}${VarChars}${VarChars}`
//     | `${VarChars}${VarChars}${VarChars}${VarChars}${VarChars}${VarChars}${VarChars}${VarChars}`;

// Means of combination
type Combination = [VarName, ...Expr[]];

type Expr
    = Primitive
    | Combination;

function normalizeWhitespace(s: string): string {
    s = s.replace(/\(/g, " ( ");
    s = s.replace(/\)/g, " ) ");
    s = s.replace(/\s+/g, " ");
    return s;
}

function tokenize(s: string): string[] {
    return normalizeWhitespace(s).trim().split(" ");
}

function parse(s: string): Expr {
    const tokens = tokenize(s);
    const [expr, rest] = parseExpr(tokens);
    if (rest.length !== 0) {
        throw new Error("unexpected tokens at end of input");
    }

    return expr;
}

function parseExpr(tokens: string[]): [Expr, string[]] {
    let result: Expr;

    const token = tokens.shift();
    if (token === undefined) {
        throw new Error("unexpected end of input");
    }

    if (token.match(NumberPattern)) {
        if (token.includes(".")) {
            result = parseFloat(token);
        } else {
            result = parseInt(token);
        }
    } else if (token == "(") {
        const token = tokens.shift();
        if (token === undefined) {
            throw new Error("unexpected end of input. expected varname for application");
        }

        const operator: VarName = token;
        const operands: Expr[] = [];
        while (tokens.length > 0) {
            const token = tokens[0];
            if (token === ")") {
                tokens.shift();
                break;
            } else {
                const [expr, rest] = parseExpr(tokens);
                operands.push(expr);
                tokens = rest;
            }
        }

        result = [operator, ...operands];
    } else {
        throw new Error(`unexpected token: ${token}`);
    }

    return [result, tokens];
}

// Environment
type Frame = Map<VarName, number | Function>;

type Env
    = null
    | { frame: Frame, parent: Env };

function lookup(env: Env, varname: VarName): number | Function {
    if (env === null) {
        throw new Error(`undefined variable: ${varname}`);
    }

    const value = env.frame.get(varname);
    if (value === undefined) {
        return lookup(env.parent, varname);
    } else {
        return value;
    }
}

function _eval(env: Env, expr: Expr): number {
    if (isPrimitive(expr)) {
        const value = evalPrimitive(env, expr);
        if (typeof value === "function") {
            throw new Error(`expected number, got function: ${value}`);
        }
        return value;
    } else if (isApplication(expr)) {
        return evalApplication(env, expr);
    } else {
        throw new Error(`unexpected expression: ${expr}`);
    }
}

function isPrimitive(expr: Expr): expr is Primitive {
    return typeof expr === "number" || typeof expr === "string";
}

function isApplication(expr: Expr): expr is Combination {
    return Array.isArray(expr);
}

function evalPrimitive(env: Env, expr: Primitive): number | Function {
    if (typeof expr === "number") {
        return expr;
    } else {
        return lookup(env, expr);
    }
}

function evalApplication(env: Env, expr: Combination): number {
    const [operator, ...operands] = expr;
    const operatorValue = lookup(env, operator);
    if (typeof operatorValue === "function") {
        const operandValues: number[] = Array.from(operands, operand => _eval(env, operand));
        return operatorValue(...operandValues);
    } else {
        throw new Error(`expected function, got ${operatorValue}`);
    }
}

export function evaluate(builtins: Map<string, number | Function>, s: string): [number?, string?] {
    const frame = new Map();
    for (const [name, func] of builtins) {
        frame.set(name as VarName, func);
    }

    const env = { frame , parent: null };
    const expr = parse(s);
    try {
        return [_eval(env, expr), undefined];
    } catch(e) {
        if (typeof e === "string") {
            return [undefined, e];
        } else if (e instanceof Error) {
            return [undefined, e.message];
        } else {
            return [undefined, "unknown error"];
        }
    }
}
