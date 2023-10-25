// scheme parser in typescript

// type Letters
//     = "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h" | "j" | "k" | "l" | "m"
//     | "n" | "o" | "p" | "q" | "r" | "s" | "t" | "u" | "w" | "x" | "y" | "z"
//     | "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "J" | "K" | "L" | "M"
//     | "N" | "O" | "P" | "Q" | "R" | "S" | "T" | "U" | "W" | "X" | "Y" | "Z";
// type Whitespace = " " | "\n" | "\t" | "\r";

const NumberPattern = /^-?[0-9]+(\.[0-9]+)?$/
type NumberToken = number;

// characters allowed in a variable name
const VarNamePattern = /^[a-zA-Z\+\-\!\/\*\_][a-zA-Z0-9\+\-\!\?\*\_\']*$/;
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
type Combination 
    = [...Expr[]] // application
    | ["define", VarName, Expr] // definition
    | ["begin", ...Expr[]] // sequence
    | ["lambda", VarName[], Expr]; // lambda

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
    return normalizeWhitespace(s)
        .trim()
        .split(" ");
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
    } else if (token.match(VarNamePattern)) {
        result = token as VarName;
    } else if (token === "(") {
        const token = tokens.shift();
        if (token === undefined) {
            throw new Error("unexpected end of input");
        }

        const result: Expr[] = [];
        while (tokens.length > 0) {
            const token = tokens[0];
            if (token === ")") {
                tokens.shift();
                break;
            } else {
                const [expr, rest] = parseExpr(tokens);
                result.push(expr);
                tokens = rest;
            }
        }
    } else {
        throw new Error(`unexpected token: ${token}`);
    }

    return [result, tokens];
}

type DataType = BorrowedType | CustomType;

type BorrowedType = number | Function;
type CustomType = Nil | CustomFunction ;

type Nil = "nil";
type CustomFunction = { params: VarName[], body: Expr, env: Env };

// Environment
type Frame = Map<VarName, DataType>;
type Env
    = { frame: Frame, parent: Env | null };

function isCustomFunction(data: DataType): data is CustomFunction {
    return typeof data === "object" && data !== null && "params" in data && "body" in data && "env" in data;
}

function makeFrame(): Frame {
    return new Map();
}

function lookup(env: Env | null, varname: VarName): DataType {
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

function _eval(env: Env, expr: Expr): DataType {
    if (isPrimitive(expr)) {
        const value = evalPrimitive(env, expr);
        // if (typeof value === "function") {
        //     throw new Error(`expected number, got function: ${value}`);
        // }
        return value;
    } else if (isDefinition(expr)) {
        return evalDefinition(env, expr);
    } else if (isSequence(expr)) {
        return evalSequence(env, expr);
    } else if (isLambda(expr)) {
        return evalLambda(env, expr);
    } else if (isApplication(expr)) {
        return evalApplication(env, expr);
    } else {
        throw new Error(`unexpected expression: ${expr}`);
    }
}

function isPrimitive(expr: Expr): expr is Primitive {
    return typeof expr === "number" || typeof expr === "string";
}

function isDefinition(expr: Expr): expr is Combination {
    return Array.isArray(expr) && expr[0] === "define";
}

function isSequence(expr: Expr): expr is Combination {
    return Array.isArray(expr) && expr[0] === "begin";
}

function isLambda(expr: Expr): expr is Combination {
    return Array.isArray(expr) && expr[0] === "lambda";
}

function isApplication(expr: Expr): expr is Combination {
    return Array.isArray(expr);
}

function evalPrimitive(env: Env, expr: Primitive): DataType {
    if (typeof expr === "number") {
        return expr;
    } else {
        return lookup(env, expr);
    }
}

function evalDefinition(env: Env, expr: Combination): DataType {
    if (!(expr.length === 3)) {
        throw new Error(`invalid definition: ${expr}`);
    }

    const [_, varname, valueExpr] = expr;
    if (!(VarNamePattern.test(varname as VarName))) {
        throw new Error(`invalid variable name: ${varname}`);
    } else {
        const value = _eval(env, valueExpr);
        env.frame.set(varname as VarName, value);
        return value;
    }
}

function evalSequence(env: Env, expr: Combination): DataType {
    const [_, ...exprs] = expr;
    let result: DataType = "nil";
    for (const expr of exprs) {
        result = _eval(env, expr);
    }
    return result;
}

function evalLambda(env: Env, expr: Combination): CustomFunction {
    if (!(expr.length === 3)) {
        throw new Error(`invalid lambda: ${expr}`);
    }

    const [_, params, body] = expr;

    if (!(Array.isArray(params))) {
        throw new Error(`invalid lambda params: ${expr}`);
    }

    const paramNames = params as VarName[];
    for (const paramName of paramNames) {
        if (!(VarNamePattern.test(paramName))) {
            throw new Error(`invalid lambda param name: ${paramName}`);
        }
    }

    return {
        params: paramNames as VarName[],
        body,
        env,
    };
}

function evalApplication(env: Env, expr: Combination): DataType {
    const [operator, ...operands] = expr;
    const operatorValue = _eval(env, operator);
    if (operatorValue instanceof Function) {
        const operandValues: DataType[] = Array.from(operands, operand => _eval(env, operand));
        return operatorValue(...operandValues);
    } else if (isCustomFunction(operatorValue)) {
        const operandValues: DataType[] = Array.from(operands, operand => _eval(env, operand));
        const newFrame = makeFrame();
        for (let i = 0; i < operatorValue.params.length; i++) {
            newFrame.set(operatorValue.params[i], operandValues[i]);
        }
        const newEnv = { frame: newFrame, parent: operatorValue.env };
        return _eval(newEnv, operatorValue.body);
    } else {
        throw new Error(`expected function, got ${operatorValue}`);
    }
}

export function evaluate(builtins: Map<string, DataType>, s: string): [DataType?, string?] {
    const frame = makeFrame();
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
