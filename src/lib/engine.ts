import { all, create, type MathNode } from 'mathjs';
import nerdamer from 'nerdamer';

export type AngleMode = 'DEG' | 'RAD' | 'GRAD';
export const math = create(all, { number: 'BigNumber', precision: 100, relTol: 1e-90, absTol: 1e-95, predictable: false });
const PI100 = math.bignumber('3.1415926535897932384626433832795028841971693993751058209749445923078164062862089986280348253421170679');
const DEG_TO_RAD = math.divide(PI100, math.bignumber(180));
const RAD_TO_DEG = math.divide(math.bignumber(180), PI100);
const GRAD_TO_RAD = math.divide(PI100, math.bignumber(200));
const RAD_TO_GRAD = math.divide(math.bignumber(200), PI100);
function radians(value: unknown, mode: AngleMode): any {
  if (mode === 'DEG') return math.multiply(value as any, DEG_TO_RAD);
  if (mode === 'GRAD') return math.multiply(value as any, GRAD_TO_RAD);
  return value;
}
function fromRadians(value: unknown, mode: AngleMode): any {
  if (mode === 'DEG') return math.multiply(value as any, RAD_TO_DEG);
  if (mode === 'GRAD') return math.multiply(value as any, RAD_TO_GRAD);
  return value;
}
export function normalizeExpression(source: string): string {
  return source.replaceAll('×', '*').replaceAll('÷', '/').replaceAll('−', '-')
    .replaceAll('π', 'pi').replaceAll('√', 'sqrt').replaceAll('Ans', 'ans')
    .replace(/(\d)(?=(?:pi|[a-df-zA-DF-Z]|\())/g, '$1*');
}
export function evaluateRaw(source: string, angle: AngleMode = 'DEG', ans: unknown = 0): unknown {
  const expression = normalizeExpression(source);
  const scope = {
    ans,
    sin: (x: unknown) => math.sin(radians(x, angle) as any),
    cos: (x: unknown) => math.cos(radians(x, angle) as any),
    tan: (x: unknown) => math.tan(radians(x, angle) as any),
    asin: (x: unknown) => fromRadians(math.asin(x as any), angle),
    acos: (x: unknown) => fromRadians(math.acos(x as any), angle),
    atan: (x: unknown) => fromRadians(math.atan(x as any), angle),
    sind: (x: unknown) => math.sin(radians(x, 'DEG') as any),
    cosd: (x: unknown) => math.cos(radians(x, 'DEG') as any),
    tand: (x: unknown) => math.tan(radians(x, 'DEG') as any)
  };
  return math.evaluate(expression, scope);
}
export function formatResult(value: unknown): string {
  return math.format(value as any, { precision: 100, lowerExp: -12, upperExp: 100 });
}
export function evaluateExpression(source: string, angle: AngleMode = 'DEG', ans: unknown = 0): string {
  return formatResult(evaluateRaw(source, angle, ans));
}
export function latexToExpression(source: string): string {
  let text = source.replace(/\\left|\\right/g, '').replace(/\\[()\[\]]/g, '').replace(/^\$+|\$+$/g, '').trim();
  const replacements: Array<[RegExp,string]> = [
    [/\\cdot|\\times/g,'*'], [/\\div/g,'/'], [/\\pi/g,'pi'], [/\\theta/g,'theta'],
    [/\\alpha/g,'alpha'], [/\\beta/g,'beta'], [/\\sin/g,'sin'], [/\\cos/g,'cos'], [/\\tan/g,'tan'],
    [/\\ln/g,'ln'], [/\\log/g,'log'], [/\\exp/g,'exp'], [/\\infty/g,'Infinity']
  ];
  for (const [pattern,replacement] of replacements) text=text.replace(pattern,replacement);
  text=text.replace(/\\sqrt\s*\{([^{}]*)\}/g,'sqrt($1)');
  for(let i=0;i<8;i++){const before=text;text=text.replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g,'(($1)/($2))');if(text===before)break;}
  text=text.replace(/\^\{([^{}]*)\}/g,'^($1)').replace(/_\{([^{}]*)\}/g,'$1').replace(/[{}]/g,'()').replace(/\\,/g,' ').replace(/\\;/g,' ');
  return normalizeExpression(text.replace(/\\[a-zA-Z]+/g,''));
}
export function differentiate(source: string, variable = 'x'): string { return nerdamer(normalizeExpression(source)).diff(variable).text(); }
export function integrateSymbolic(source: string, variable = 'x'): string { return nerdamer(normalizeExpression(source)).integrate(variable).text(); }
export function solveEquation(source: string, variable = 'x'): string[] {
  const raw = source.trim();
  const expression = raw.includes('=') ? `(${raw.slice(0, raw.indexOf('='))})-(${raw.slice(raw.indexOf('=') + 1)})` : raw;
  const result = nerdamer.solve(normalizeExpression(expression), variable);
  const roots = result.elements.map((root: { text(): string }) => root.text());
  if (!roots.length) return [`No supported closed-form root was returned${result.unsolved ? `: ${result.unsolved.text()}` : '.'}`];
  return roots;
}
export function numericIntegral(source: string, variable: string, a: number, b: number, steps = 2000): number {
  const n = Math.max(2, steps + (steps % 2)), h = (b - a) / n;
  const f = (x: number) => Number(math.evaluate(normalizeExpression(source), { [variable]: math.bignumber(x) }));
  let sum = f(a) + f(b);
  for (let i = 1; i < n; i++) sum += (i % 2 ? 4 : 2) * f(a + i * h);
  return sum * h / 3;
}
export function matrixOperation(input: string, operation: 'det'|'inv'|'transpose'|'rref'|'eigen'|'multiply'): string {
  if (!/^[\s\[\],+\-.\deE]+$/.test(input)) throw new Error('Use a numeric matrix such as [[1,2],[3,4]].');
  const parsed = math.evaluate(input) as any, value = (parsed && typeof parsed.valueOf === 'function' ? parsed.valueOf() : parsed) as any[][];
  if (!Array.isArray(value) || !value.length || !Array.isArray(value[0]) || value.some(row=>!Array.isArray(row)||row.length!==value[0].length)) throw new Error('Enter a non-empty rectangular matrix.');
  const matrix = math.matrix(value);
  switch (operation) {
    case 'det': return math.format(math.det(matrix), { precision: 100 });
    case 'inv': return math.format(math.inv(matrix), { precision: 100 });
    case 'transpose': return math.format(math.transpose(matrix), { precision: 100 });
    case 'rref': {
      const a = value.map(row => row.map(v => math.bignumber(v)));
      const rows = a.length, cols = a[0]?.length || 0, tolerance = math.bignumber('1e-90');
      let lead = 0;
      for (let r = 0; r < rows && lead < cols; r++) {
        let pivot = r; while (pivot < rows && math.smaller(math.abs(a[pivot][lead]), tolerance)) pivot++;
        if (pivot === rows) { lead++; r--; continue; }
        [a[r], a[pivot]] = [a[pivot], a[r]];
        const divisor = a[r][lead]; a[r] = a[r].map(v => math.divide(v, divisor));
        for (let i = 0; i < rows; i++) if (i !== r) { const factor = a[i][lead]; a[i] = a[i].map((v,j)=>math.subtract(v,math.multiply(factor,a[r][j]))); }
        lead++;
      }
      return math.format(a, { precision: 100 });
    }
    case 'eigen': return math.format(math.eigs(math.matrix(value.map(row=>row.map(Number)))).values, { precision: 15 });
    case 'multiply': return math.format(math.multiply(matrix, matrix), { precision: 100 });
  }
}
export function statistics(values: number[]): Record<string, number> {
  if (!values.length || values.some(v => !Number.isFinite(v))) throw new Error('Enter valid comma-separated numbers.');
  const sorted = [...values].sort((a,b)=>a-b), mean = values.reduce((a,b)=>a+b,0) / values.length;
  const variance = values.reduce((s,x)=>s+(x-mean)**2,0) / values.length;
  const median = sorted.length % 2 ? sorted[(sorted.length-1)/2] : (sorted[sorted.length/2-1]+sorted[sorted.length/2])/2;
  const counts = new Map<number, number>(); values.forEach(v=>counts.set(v,(counts.get(v)||0)+1));
  const maxCount = Math.max(...counts.values()), modes = [...counts].filter(([,n])=>n===maxCount).map(([v])=>v);
  return { n: values.length, min: sorted[0], max: sorted[sorted.length-1], range: sorted.at(-1)!-sorted[0], mean, median, mode: modes.length===values.length?NaN:modes[0], populationVariance: variance, populationStdDev: Math.sqrt(variance), sampleVariance: values.length>1?variance*values.length/(values.length-1):NaN, sum: values.reduce((a,b)=>a+b,0) };
}
export function linearRegression(points: Array<[number,number]>): { slope:number; intercept:number; r2:number } {
  if (points.length < 2) throw new Error('At least two (x,y) pairs are required.');
  const n=points.length, sx=points.reduce((s,p)=>s+p[0],0), sy=points.reduce((s,p)=>s+p[1],0);
  const sxx=points.reduce((s,p)=>s+p[0]**2,0), sxy=points.reduce((s,p)=>s+p[0]*p[1],0);
  const den=n*sxx-sx*sx; if (!den) throw new Error('The x values must not all be equal.');
  const slope=(n*sxy-sx*sy)/den, intercept=(sy-slope*sx)/n, yMean=sy/n;
  const ssTot=points.reduce((s,p)=>s+(p[1]-yMean)**2,0), ssRes=points.reduce((s,p)=>s+(p[1]-(intercept+slope*p[0]))**2,0);
  return { slope, intercept, r2: ssTot===0?1:1-ssRes/ssTot };
}
export function gcd(a: number, b: number): number { a=Math.abs(Math.trunc(a)); b=Math.abs(Math.trunc(b)); while(b){[a,b]=[b,a%b];} return a; }
export function lcm(a: number,b: number): number { return !a||!b?0:Math.abs(a/gcd(a,b)*b); }
export function isPrime(n: number): boolean { if (!Number.isSafeInteger(n)||n<2) return false; if(n%2===0)return n===2; for(let i=3;i<=Math.sqrt(n);i+=2)if(n%i===0)return false; return true; }
export function primeFactors(n: number): number[] { if(!Number.isSafeInteger(n)||n<2)throw new Error('Enter an integer greater than 1.'); const out:number[]=[]; for(let p=2;p*p<=n;p+=(p===2?1:2))while(n%p===0){out.push(p);n/=p;} if(n>1)out.push(n); return out; }
export function divisors(n: number): number[] { if(!Number.isSafeInteger(n)||n<1)throw new Error('Enter a positive integer.'); const out:number[]=[]; for(let i=1;i<=Math.sqrt(n);i++)if(n%i===0){out.push(i);if(i!==n/i)out.push(n/i);} return out.sort((a,b)=>a-b); }
export function continuedFraction(value: number, maxTerms=20): number[] { if(!Number.isFinite(value))throw new Error('Enter a finite value.'); const out:number[]=[]; let x=value; for(let i=0;i<maxTerms;i++){const a=Math.floor(x);out.push(a);const fraction=x-a;if(Math.abs(fraction)<1e-12)break;x=1/fraction;}return out; }
export function rationalApproximation(value: number, maxDenominator=100000): [number,number] { let x=value,h0=0,h1=1,k0=1,k1=0; for(let i=0;i<64;i++){const a=Math.floor(x),h=a*h1+h0,k=a*k1+k0;if(k>maxDenominator)break;h0=h1;h1=h;k0=k1;k1=k;const rem=x-a;if(rem<1e-14)break;x=1/rem;}return [h1,k1]; }
export type SupportedBase = 2 | 8 | 10 | 16;
export function convertBase(input: string, from: SupportedBase): Record<string,string> {
  let raw=input.trim().replaceAll('_',''); if(!raw) throw new Error('Enter a whole number.');
  const negative=raw.startsWith('-'); if(raw.startsWith('-')||raw.startsWith('+')) raw=raw.slice(1);
  const patterns:Record<SupportedBase,RegExp>={2:/^[01]+$/,8:/^[0-7]+$/,10:/^\d+$/,16:/^[0-9a-fA-F]+$/};
  if(!patterns[from].test(raw)) throw new Error(`The value contains digits not valid in base ${from}.`);
  const prefix:Record<SupportedBase,string>={2:'0b',8:'0o',10:'',16:'0x'};
  let value=BigInt(prefix[from]+raw); if(negative)value=-value;
  return {binary:value.toString(2),octal:value.toString(8),decimal:value.toString(10),hexadecimal:value.toString(16).toUpperCase()};
}
export function combinatorics(n:number,r:number):{permutations:string;combinations:string;factorial:string}{
  if(!Number.isSafeInteger(n)||!Number.isSafeInteger(r)||n<0||r<0||r>n||n>5000) throw new Error('Use integers with 0 ≤ r ≤ n ≤ 5000.');
  let fact=1n;for(let i=2n;i<=BigInt(n);i++)fact*=i;
  let perm=1n;for(let i=0;i<r;i++)perm*=BigInt(n-i);
  let rf=1n;for(let i=2n;i<=BigInt(r);i++)rf*=i;
  return {permutations:perm.toString(),combinations:(perm/rf).toString(),factorial:fact.toString()};
}
export function compileFunction(source: string, variable='x'): (x:number)=>number { const node = math.parse(normalizeExpression(source)) as MathNode; const code = node.compile(); return (x:number)=>Number(code.evaluate({[variable]:x})); }
