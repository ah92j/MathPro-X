import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import GraphCanvas, { type GraphMode } from './components/GraphCanvas';
import {
  evaluateRaw, formatResult, evaluateExpression, differentiate, integrateSymbolic,
  numericIntegral, solveEquation, statistics, linearRegression, matrixOperation,
  isPrime, primeFactors, divisors, continuedFraction, rationalApproximation,
  gcd, lcm, convertBase, combinatorics, latexToExpression
} from './lib/engine';
import type { AngleMode, SupportedBase } from './lib/engine';
import { ELEMENTS } from './lib/elements';
import { FORMULAS } from './lib/reference';
import { readHistory, readSettings, saveHistory, saveSettings, type HistoryEntry } from './lib/storage';

type Page = 'calc'|'graph'|'solver'|'calculus'|'number'|'complex'|'stats'|'matrix'|'formulas'|'periodic'|'history'|'camera'|'settings';
type Settings = { angle: AngleMode; theme: string; };
const DEFAULTS: Settings = { angle: 'DEG', theme: 'graphite' };
const PAGES: Array<{id:Page;label:string;icon:string}> = [
  {id:'calc',label:'Calculator',icon:'⌗'},{id:'graph',label:'Graph',icon:'⌁'},
  {id:'solver',label:'Solver',icon:'x='},{id:'calculus',label:'Calculus',icon:'∫'},
  {id:'number',label:'Number theory',icon:'ℕ'},{id:'complex',label:'Complex',icon:'ℂ'},
  {id:'stats',label:'Statistics',icon:'σ'},{id:'matrix',label:'Matrices',icon:'▦'},
  {id:'formulas',label:'Formula library',icon:'π'},{id:'periodic',label:'Periodic table',icon:'⚛'},
  {id:'history',label:'History',icon:'↶'},{id:'camera',label:'Camera OCR',icon:'▣'},
  {id:'settings',label:'Settings',icon:'⚙'}
];
const KEYS = [
  ['sin(','cos(','tan(','log10(','log(','sqrt('],
  ['π','e','^','(',')','!'],
  ['7','8','9','÷','⌫','AC'],
  ['4','5','6','×','Ans','−'],
  ['1','2','3','+','%','='],
  ['0','.','i',',','x','y']
];

export default function App() {
  const [page,setPage]=useState<Page>('calc');
  const [settings,setSettings]=useState<Settings>(()=>readSettings(DEFAULTS));
  const [expression,setExpression]=useState('');
  const [result,setResult]=useState('');
  const [error,setError]=useState('');
  const [ans,setAns]=useState<unknown>(0);
  const [history,setHistory]=useState<HistoryEntry[]>(()=>readHistory());
  const [graphMode,setGraphMode]=useState<GraphMode>('cartesian');
  const [graphExpr,setGraphExpr]=useState('sin(x)');
  const [graphX,setGraphX]=useState('cos(t)');
  const [graphY,setGraphY]=useState('sin(t)');
  const [graphRange,setGraphRange]=useState('10');
  const [equation,setEquation]=useState('x^2-5*x+6=0');
  const [variable,setVariable]=useState('x');
  const [solutions,setSolutions]=useState<string[]>([]);
  const [calcExpr,setCalcExpr]=useState('x^3+2*x');
  const [calcVariable,setCalcVariable]=useState('x');
  const [lower,setLower]=useState('0');
  const [upper,setUpper]=useState('4');
  const [calcOutput,setCalcOutput]=useState('');
  const [integer,setInteger]=useState('360');
  const [numberOutput,setNumberOutput]=useState('');
  const [baseValue,setBaseValue]=useState('255');
  const [sourceBase,setSourceBase]=useState<SupportedBase>(10);
  const [baseOutput,setBaseOutput]=useState<Record<string,string>|null>(null);
  const [n,setN]=useState('10');
  const [r,setR]=useState('3');
  const [combOutput,setCombOutput]=useState<{permutations:string;combinations:string;factorial:string}|null>(null);
  const [complexExpr,setComplexExpr]=useState('(3+2i)*(1-i)');
  const [complexOutput,setComplexOutput]=useState('');
  const [statValues,setStatValues]=useState('4, 7, 7, 8, 10, 12');
  const [statOutput,setStatOutput]=useState<Record<string,number>|null>(null);
  const [pairs,setPairs]=useState('1,2;2,4;3,5;4,8');
  const [regOutput,setRegOutput]=useState<{slope:number;intercept:number;r2:number}|null>(null);
  const [matrixInput,setMatrixInput]=useState('[[1,2],[3,4]]');
  const [matrixAction,setMatrixAction]=useState<'det'|'inv'|'transpose'|'rref'|'eigen'|'multiply'>('det');
  const [matrixOutput,setMatrixOutput]=useState('');
  const [formulaSearch,setFormulaSearch]=useState('');
  const [category,setCategory]=useState('All');
  const [selectedElement,setSelectedElement]=useState(17);
  const [photo,setPhoto]=useState('');
  const [ocrStatus,setOcrStatus]=useState('');

  useEffect(()=>saveSettings(settings),[settings]);
  useEffect(()=>saveHistory(history),[history]);
  useEffect(()=>{if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>undefined)},[]);
  const selected = ELEMENTS.find(el=>el.atomicNumber===selectedElement) || ELEMENTS[0];
  const filteredFormulas=useMemo(()=>FORMULAS.filter(item=>
    (category==='All'||item.category===category) &&
    (item.title+' '+item.formula+' '+item.note).toLowerCase().includes(formulaSearch.toLowerCase())
  ),[category,formulaSearch]);

  const calculate=(source=expression)=>{
    if(!source.trim()) return;
    try {
      const raw=evaluateRaw(source,settings.angle,ans);
      const value=formatResult(raw);
      setAns(raw);setResult(value);setError('');
      const entry:HistoryEntry={id:globalThis.crypto?.randomUUID?.()||String(Date.now()),expression:source,result:value,createdAt:Date.now()};
      setHistory(list=>[entry,...list].slice(0,1000));
    } catch(e) {setResult('');setError(e instanceof Error?e.message:String(e));}
  };
  const insert=(key:string)=>{
    setError('');
    if(key==='AC'){setExpression('');setResult('');return;}
    if(key==='⌫'){setExpression(v=>v.slice(0,-1));return;}
    if(key==='='){calculate();return;}
    const map:Record<string,string>={'÷':'/','×':'*','−':'-','π':'pi','Ans':'Ans'};
    setExpression(v=>v+(map[key]??key));
  };
  const runSolver=()=>{try{setSolutions(solveEquation(equation,variable))}catch(e){setSolutions([e instanceof Error?e.message:String(e)])}};
  const runCalculus=(kind:'diff'|'int'|'definite')=>{
    try {
      const value=kind==='diff'?differentiate(calcExpr,calcVariable):
        kind==='int'?integrateSymbolic(calcExpr,calcVariable):
        String(numericIntegral(calcExpr,calcVariable,Number(lower),Number(upper)));
      setCalcOutput(value);
    } catch(e){setCalcOutput(e instanceof Error?e.message:String(e));}
  };
  const runNumber=()=>{
    try {
      const value=Number(integer), factors=primeFactors(value), approx=rationalApproximation(value);
      setNumberOutput('Prime: '+isPrime(value)+'\nPrime factors: '+factors.join(' × ')+'\nDivisors: '+divisors(value).join(', ')+'\nContinued fraction: ['+continuedFraction(value).join(', ')+']\nRational: '+approx[0]+'/'+approx[1]);
    } catch(e){setNumberOutput(e instanceof Error?e.message:String(e));}
  };
  const runStats=()=>{
    try{setStatOutput(statistics(statValues.split(',').map(value=>Number(value.trim()))))}
    catch(e){setError(e instanceof Error?e.message:String(e));setStatOutput(null);}
  };
  const runRegression=()=>{
    try{setRegOutput(linearRegression(pairs.split(';').map(item=>item.split(',').map(Number) as [number,number])))}
    catch(e){setError(e instanceof Error?e.message:String(e));setRegOutput(null);}
  };
  const handlePhoto=async(file?:File)=>{
    if(!file)return;
    setPhoto(URL.createObjectURL(file));setOcrStatus('Reading image…');
    try{
      const src=await new Promise<string>((resolve,reject)=>{
        const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('Image could not be read'));reader.readAsDataURL(file);
      });
      const response=await fetch('/api/math-ocr',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({src})});
      if(!response.ok)throw new Error(response.status===503?'OCR service is not configured.':'OCR request failed: '+response.status);
      const data=await response.json() as {latex_styled?:string;text?:string};
      const recognized=(data.latex_styled||data.text||'').trim();
      if(!recognized)throw new Error('No mathematical expression found.');
      setExpression(latexToExpression(recognized));setOcrStatus('Expression recognized. Review it, then calculate.');
    }catch(e){setOcrStatus(e instanceof Error?e.message:String(e));}
  };
  const runBase=()=>{try{setBaseOutput(convertBase(baseValue,sourceBase));setNumberOutput('')}catch(e){setBaseOutput(null);setNumberOutput(e instanceof Error?e.message:String(e))}};
  const runCombinations=()=>{try{setCombOutput(combinatorics(Number(n),Number(r)))}catch(e){setCombOutput(null);setNumberOutput(e instanceof Error?e.message:String(e))}};
  const runMatrix=()=>{try{setMatrixOutput(matrixOperation(matrixInput,matrixAction))}catch(e){setMatrixOutput(e instanceof Error?e.message:String(e))}};
  const navigate=(id:Page)=>{setPage(id);setError('')};

  return <main className={'app theme-'+settings.theme}>
    <header className="top-status">
      <div className="brand-mark">MATH<span>PRO</span></div><span>SCI</span><span>{settings.angle}</span><span>FIX 100</span>
      <button className="angle-toggle" onClick={()=>setSettings(s=>({...s,angle:s.angle==='DEG'?'RAD':s.angle==='RAD'?'GRAD':'DEG'}))}>{settings.angle}</button>
    </header>
    <section className="display-shell">
      <div className="display-top"><span>MathPro X · Scientific Calculator</span><span>100 SIGNIFICANT DIGITS*</span></div>
      <input className="main-input" value={expression} onChange={e=>setExpression(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')calculate();if(e.key==='Escape')insert('AC')}} placeholder="Enter expression…" aria-label="Math expression"/>
      <div className="result-line"><span className={error?'error-text':''}>{error||result||' '}</span><span className="result-hint">{result?'RESULT':'NORM · MATH'}</span></div>
    </section>
    <nav className="module-strip" aria-label="Calculator modules">
      {PAGES.map(item=><button key={item.id} className={page===item.id?'active':''} onClick={()=>navigate(item.id)}><b>{item.icon}</b><span>{item.label}</span></button>)}
    </nav>

    {page==='calc'&&<section className="calculator-body">
      <div className="quick-toolbar"><button className="pro-button" onClick={()=>navigate('settings')}>SETTINGS</button><button onClick={()=>navigate('history')}>HISTORY</button><button onClick={()=>navigate('formulas')}>FORMULAS</button><button onClick={()=>navigate('camera')}>CAMERA</button></div>
      <div className="key-grid function-grid">{KEYS.slice(0,2).flatMap((row,i)=>row.map((key,j)=><button key={i+'-'+j} className="function-key" onClick={()=>insert(key)}><strong>{key}</strong></button>))}</div>
      <div className="key-grid number-grid">{KEYS.slice(2).flatMap((row,i)=>row.map((key,j)=><button key={i+'-'+j} className={'number-key '+(['AC','=','⌫'].includes(key)?'key-ac':'')} onClick={()=>insert(key)}>{key}</button>))}</div>
      <p className="keyboard-footer">DEG/RAD/GRAD · REAL & COMPLEX · LOCAL HISTORY {history.length}/1000</p>
    </section>}

    {page==='graph'&&<Panel title="Function Graphing" subtitle="Cartesian · Polar · Parametric · Implicit">
      <div className="segmented">{(['cartesian','polar','parametric','implicit'] as GraphMode[]).map(mode=><button key={mode} className={graphMode===mode?'selected':''} onClick={()=>setGraphMode(mode)}>{mode}</button>)}</div>
      <Field label={graphMode==='polar'?'r(θ)':graphMode==='implicit'?'F(x,y) = 0':'y = f(x)'} value={graphExpr} onChange={setGraphExpr}/>
      {graphMode==='parametric'&&<div className="field-grid two"><Field label="x(t)" value={graphX} onChange={setGraphX}/><Field label="y(t)" value={graphY} onChange={setGraphY}/></div>}
      <Field label="Range ±" value={graphRange} onChange={setGraphRange}/>
      <GraphCanvas mode={graphMode} expression={graphExpr} xExpression={graphX} yExpression={graphY} range={Math.max(1,Math.min(100,Number(graphRange)||10))}/>
      <p className="muted small">Graph points are numerically sampled. Discontinuities and steep curves may need a narrower range.</p>
    </Panel>}

    {page==='solver'&&<Panel title="Equation Solver" subtitle="Symbolic roots for supported equations">
      <Field label="Equation" value={equation} onChange={setEquation}/><Field label="Variable" value={variable} onChange={setVariable}/>
      <button className="primary-action" onClick={runSolver}>Solve equation</button>
      <Output>{solutions.length?solutions.map((root,index)=><div key={index}>Root {index+1}: {root}</div>):'Solutions will appear here.'}</Output>
      <p className="muted small">Exact symbolic solutions are limited to forms supported by Nerdamer.</p>
    </Panel>}

    {page==='calculus'&&<Panel title="Calculus Workspace" subtitle="Derivative · antiderivative · numerical definite integral">
      <Field label="f(x)" value={calcExpr} onChange={setCalcExpr}/><Field label="Variable" value={calcVariable} onChange={setCalcVariable}/>
      <div className="field-grid two"><Field label="Lower bound" value={lower} onChange={setLower}/><Field label="Upper bound" value={upper} onChange={setUpper}/></div>
      <div className="action-row"><button className="primary-action" onClick={()=>runCalculus('diff')}>Differentiate</button><button onClick={()=>runCalculus('int')}>Integrate</button><button onClick={()=>runCalculus('definite')}>Definite integral</button></div>
      <Output>{calcOutput||'Choose an operation.'}</Output>
    </Panel>}

    {page==='number'&&<Panel title="Number Theory" subtitle="Primes · divisors · continued fractions · bases · combinatorics">
      <Field label="Positive integer" value={integer} onChange={setInteger}/><button className="primary-action" onClick={runNumber}>Analyze integer</button><Output>{numberOutput||'Analysis will appear here.'}</Output>
      <div className="result-grid"><div className="stat-tile"><span>GCD(84,30)</span><b>{gcd(84,30)}</b></div><div className="stat-tile"><span>LCM(84,30)</span><b>{lcm(84,30)}</b></div></div>
      <h3>Base conversion</h3><Field label="Input integer" value={baseValue} onChange={setBaseValue}/>
      <div className="segmented">{([2,8,10,16] as SupportedBase[]).map(base=><button key={base} className={sourceBase===base?'selected':''} onClick={()=>setSourceBase(base)}>Base {base}</button>)}</div>
      <button onClick={runBase}>Convert bases</button>{baseOutput&&<Output>Binary: {baseOutput.binary}{'\n'}Octal: {baseOutput.octal}{'\n'}Decimal: {baseOutput.decimal}{'\n'}Hex: {baseOutput.hexadecimal}</Output>}
      <h3>Permutations & combinations</h3><div className="field-grid two"><Field label="n" value={n} onChange={setN}/><Field label="r" value={r} onChange={setR}/></div>
      <button onClick={runCombinations}>Calculate</button>{combOutput&&<Output>nPr = {combOutput.permutations}{'\n'}nCr = {combOutput.combinations}{'\n'}n! = {combOutput.factorial}</Output>}
    </Panel>}

    {page==='complex'&&<Panel title="Complex Numbers" subtitle="Rectangular form and complex arithmetic">
      <Field label="Expression" value={complexExpr} onChange={setComplexExpr}/>
      <button className="primary-action" onClick={()=>{try{setComplexOutput(evaluateExpression(complexExpr,settings.angle))}catch(e){setComplexOutput(e instanceof Error?e.message:String(e))}}}>Evaluate complex expression</button>
      <Output>{complexOutput||'Try (3+2i)*(1-i), sqrt(-1), or abs(3+4i).'}</Output>
    </Panel>}

    {page==='stats'&&<Panel title="Statistics & Regression" subtitle="Descriptive statistics and least-squares linear fit">
      <Field label="Values separated by commas" value={statValues} onChange={setStatValues}/><button className="primary-action" onClick={runStats}>Calculate statistics</button>
      {statOutput&&<div className="result-grid">{Object.entries(statOutput).map(([key,value])=><div className="stat-tile" key={key}><span>{key}</span><b>{Number.isFinite(value)?value.toPrecision(7):'—'}</b></div>)}</div>}
      <h3>Linear regression</h3><Field label="Pairs x,y separated by semicolons" value={pairs} onChange={setPairs}/><button onClick={runRegression}>Fit y = a + bx</button>
      {regOutput&&<Output>y = {regOutput.intercept.toPrecision(8)} + {regOutput.slope.toPrecision(8)}x{'\n'}R² = {regOutput.r2.toPrecision(8)}</Output>}
      {error&&<p className="error-text">{error}</p>}
    </Panel>}

    {page==='matrix'&&<Panel title="Matrix Calculator" subtitle="Determinant · inverse · transpose · RREF · eigenvalues">
      <Field label="Matrix (JSON format)" value={matrixInput} onChange={setMatrixInput}/>
      <div className="segmented">{(['det','inv','transpose','rref','eigen','multiply'] as const).map(action=><button key={action} className={matrixAction===action?'selected':''} onClick={()=>setMatrixAction(action)}>{action}</button>)}</div>
      <button className="primary-action" onClick={runMatrix}>Run matrix operation</button><Output>{matrixOutput||'Example: [[1,2],[3,4]]'}</Output>
    </Panel>}

    {page==='formulas'&&<Panel title="STEM Formula Library" subtitle="Starter mathematics · physics · chemistry references">
      <Field label="Search" value={formulaSearch} onChange={setFormulaSearch}/>
      <div className="segmented">{['All','Mathematics','Physics','Chemistry'].map(value=><button key={value} className={category===value?'selected':''} onClick={()=>setCategory(value)}>{value}</button>)}</div>
      <div className="formula-list">{filteredFormulas.map(item=><div className="formula-card" key={item.title}><span>{item.category}</span><b>{item.title}</b><strong>{item.formula}</strong><small>{item.note}</small></div>)}</div>
    </Panel>}

    {page==='periodic'&&<Panel title="Periodic Table" subtitle="118 element symbols · select an element">
      <div className="periodic-scroll"><div className="periodic-grid">{ELEMENTS.map(item=><button key={item.atomicNumber} className={'element-cell '+(item.atomicNumber===selectedElement?'selected':'')} style={{gridColumn:item.group,gridRow:item.period}} onClick={()=>setSelectedElement(item.atomicNumber)}><small>{item.atomicNumber}</small><b>{item.symbol}</b></button>)}</div></div>
      <div className="element-detail"><span>{selected.atomicNumber}</span><b>{selected.symbol}</b><strong>{selected.name}</strong><small>{selected.family} · Period {selected.period} · Group {selected.group}</small></div>
    </Panel>}

    {page==='history'&&<Panel title="Calculation History" subtitle={history.length+' / 1000 stored entries'}>
      <div className="action-row"><button onClick={()=>setHistory([])}>Clear history</button><button onClick={()=>{
        const csv=['expression,result,timestamp',...history.map(item=>'"'+item.expression.replaceAll('"','""')+'","'+item.result.replaceAll('"','""')+'",'+new Date(item.createdAt).toISOString())].join('\n');
        const url=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));const link=document.createElement('a');link.href=url;link.download='mathpro-history.csv';link.click();URL.revokeObjectURL(url);
      }}>Export CSV</button></div>
      <div className="history-list">{history.map(item=><button key={item.id} onClick={()=>{setExpression(item.expression);setResult(item.result);setPage('calc')}}><span>{item.expression}</span><b>{item.result}</b><small>{new Date(item.createdAt).toLocaleString()}</small></button>)}</div>
    </Panel>}

    {page==='camera'&&<Panel title="Camera Math Input" subtitle="Choose or capture a mathematical expression">
      <label className="file-picker">Open camera / choose image<input type="file" accept="image/*" capture="environment" onChange={event=>handlePhoto(event.target.files?.[0])}/></label>
      {photo&&<img className="camera-preview" src={photo} alt="Selected equation"/>}
      <p className="muted">{ocrStatus||'OCR requires the Mathpix server credentials to be configured.'}</p>
      {expression&&<button className="primary-action" onClick={()=>{setPage('calc');calculate(expression)}}>Calculate recognized expression</button>}
    </Panel>}

    {page==='settings'&&<Panel title="Settings & Themes" subtitle="Angle mode · appearance · precision">
      <h3>Angle unit</h3><div className="segmented">{(['DEG','RAD','GRAD'] as AngleMode[]).map(mode=><button key={mode} className={settings.angle===mode?'selected':''} onClick={()=>setSettings(s=>({...s,angle:mode}))}>{mode}</button>)}</div>
      <h3>Theme</h3><div className="theme-options">{['graphite','midnight','light','violet','casio-green'].map(theme=><button key={theme} className={settings.theme===theme?'selected':''} onClick={()=>setSettings(s=>({...s,theme}))}>{theme.replace('-',' ')}</button>)}</div>
      <div className="settings-row"><span>BigNumber precision</span><b>100 digits</b></div><div className="settings-row"><span>History capacity</span><b>1000 entries</b></div>
      <p className="muted small">100-digit precision applies only to supported BigNumber operations. Some symbolic, graphing and numerical methods have separate limits.</p>
    </Panel>}

    <footer className="app-footer"><span>MathPro X · Scientific Calculator</span><span>Pre-release · v0.1.0</span></footer>
  </main>;
}

function Field({label,value,onChange,readOnly=false}:{label:string;value:string;onChange?:(value:string)=>void;readOnly?:boolean}){
  return <label className="field"><span>{label}</span><input value={value} readOnly={readOnly} onChange={event=>onChange?.(event.target.value)}/></label>;
}
function Panel({title,subtitle,children}:{title:string;subtitle:string;children:ReactNode}){
  return <section className="tool-panel"><div className="panel-title"><h2>{title}</h2><p>{subtitle}</p></div>{children}</section>;
}
function Output({children}:{children:ReactNode}){return <pre className="output-box">{children}</pre>}
