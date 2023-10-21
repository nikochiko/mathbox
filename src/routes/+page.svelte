<script>
import { onMount } from 'svelte';
import { writable } from 'svelte/store';
import * as math from '$lib/math.ts';
import { evaluate as scmEval } from '$lib/scheme.ts';

onMount(() => {
    window.MathJax = {
      tex: {
        inlineMath: [['$', '$'], ['\\(', '\\)']]
      },
      svg: {
        fontCache: 'global'
      }
    };

    (function () {
      var script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js';
      script.async = true;
      document.head.appendChild(script);
    })();
});

let nprStore = writable({
    n: 0,
    r: 0,
    result: 0,
    message: null,
});
nprStore.subscribe((value) => {
    try {
        value.result = math.npr(value.n, value.r);
        value.message = null;
    } catch (e) {
        value.message = e.message;
    }
    return value;
});

let ncrStore = writable({
    n: 0,
    r: 0,
    result: 0,
    message: null,
});
ncrStore.subscribe((value) => {
    try {
        value.result = math.ncr(value.n, value.r);
        value.message = null;
    } catch (e) {
        value.message = e.message;
    }
    return value;
});

let factStore = writable({
    n: 0,
    result: 0,
    message: null,
});
factStore.subscribe((value) => {
    try {
        value.result = math.factorial(value.n);
    } catch (e) {
        value.message = e.message;
    }
    return value;
});

const builtins = new Map();

// functions
builtins.set('npr', math.npr);
builtins.set('ncr', math.ncr);
builtins.set('+', math.add);
builtins.set('-', math.sub);
builtins.set('*', math.mul);
builtins.set('/', math.div);
builtins.set('^', math.pow);
builtins.set('!', math.factorial);
builtins.set('floor', math.floor);
builtins.set('ceil', math.ceil);
builtins.set('sin', math.sin);
builtins.set('cos', math.cos);
builtins.set('tan', math.tan);
builtins.set('fromDegrees', math.fromDegrees);
builtins.set('sqrt', math.sqrt);
builtins.set('mean', math.mean);
builtins.set('variance', math.variance);
builtins.set('std', math.std);
builtins.set('sampleVariance', math.sampleVariance);
builtins.set('sampleStd', math.sampleStd);
builtins.set('min', math.min);
builtins.set('max', math.max);
builtins.set('percentile', math.percentile);

// constants
builtins.set('e', math.e);
builtins.set('pi', math.pi);

let defaultExpression = '(+ 1 (npr 5 2))';

let scmStore = writable({
    builtins: builtins,
    expression: defaultExpression,
    formattedExpression: scmIndent(defaultExpression),
    result: scmEval(builtins, defaultExpression)[0],
    message: null,
});

scmStore.subscribe((value) => {
    try {
        let [result, message] = scmEval(value.builtins, value.expression);
        value.formattedExpression = scmIndent(value.expression);
        value.result = result;
        value.message = message;
    } catch (e) {
        value.formattedExpression = scmIndent(value.expression);
        value.result = null;
        value.message = e.message;
    }
    return value;
});

function scmIndent(expression) {
    expression = expression.replace(/\s+/g, ' ');
    expression = expression.replace(/\s?\(\s?/g, ' (');
    expression = expression.replace(/\s?\)\s?/g, ') ');
    const tokens = expression.split(' ');

    // at every subsequent '(token ', add a newline and indent
    let indent = 0;
    let result = '';
    for (const [i, token] of tokens.entries()) {
        const nextToken = i + 1 < tokens.length ? tokens[i + 1] : null;
        if (token[0] === '(') {
            result += '\n' + ' '.repeat(indent * 2) + token + ' ';
            indent++;
        } else if (token[token.length - 1] === ')') {
            indent--;
            result += token;
            if (nextToken && nextToken[0] !== ')') {
                result += '\n' + ' '.repeat(indent * 2);
            }
        } else {
            result += token + ' ';
        }
    }

    return result;
}
</script>

<h1>MathBox</h1>

<h2>1. <em><sup>n</sup>P<sub>r</sub></em></h2>
<form>
    <div>
        <label for="n">n = </label>
        <input type="number" bind:value={$nprStore.n} />

        <label for="r">r = </label>
        <input type="number" bind:value={$nprStore.r} />
    </div>
</form>
<div class="alert" class:show={$nprStore.message}>
    <p>{$nprStore.message}</p>
</div>
<div>
    <p><sup>{$nprStore.n || 0}</sup>P<sub>{$nprStore.r || 0}</sub> = {$nprStore.result || 0}</p>
</div>

<h2>2. <em><sup>n</sup>C<sub>r</sub></em></h2>
<form>
    <div>
        <label for="n">n = </label>
        <input type="number" bind:value={$ncrStore.n} />

        <label for="r">r = </label>
        <input type="number" bind:value={$ncrStore.r} />
    </div>
</form>
<div class="alert" class:show={$ncrStore.message}>
    <p>{$ncrStore.message}</p>
</div>
<div>
    <p><sup>{$ncrStore.n || 0}</sup>C<sub>{$ncrStore.r || 0}</sub> = {$ncrStore.result || 0}</p>
</div>

<h2>3. Factorial</h2>
<form>
    <label for="n">n = </label>
    <input type="number" bind:value={$factStore.n} />
</form>
<div class="alert" class:show={$factStore.message}>
    <p>{$factStore.message}</p>
</div>
<p>{$factStore.n || 0}! = {$factStore.result}</p>

<h2>4. Scheme</h2>
<form>
    <label for="expression">Expression = </label>
    <textarea bind:value={$scmStore.expression} />
</form>
<div class="alert" class:show={$scmStore.message}>
    <p>{$scmStore.message}</p>
</div>
<pre>{$scmStore.formattedExpression}</pre>
<pre>Result: {$scmStore.result}</pre>

<style>
.flex-center {
    display: flex;
    justify-content: center;
    align-items: center;
}

.alert {
    /* yellow with opacity */
    background-color: rgba(255, 200, 50, 0.2); 
    border: 1px solid rgba(255, 200, 50, 1);
    padding: 10px;
    margin: 20px 0;

    /* default */
    display: none;
}

.alert.show {
    display: block;
}
</style>
