import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import GraphCanvas, { type GraphMode } from './components/GraphCanvas';
import {
  evaluateRaw, formatResult, differentiate, integrateSymbolic, numericIntegral,
  solveEquation, statistics, linearRegression, matrixOperation, isPrime,
  primeFactors, divisors, continuedFraction, rationalApproximation, gcd, lcm,
  convertBase, combinatorics, latexToExpression
} from './lib/engine';
import type { AngleMode, SupportedBase } from './lib/engine';
import { ELEMENTS } from './lib/elements';
import { FORMULAS } from './lib/reference';
import { readHistory, readSettings, saveHistory, saveSettings, type HistoryEntry } from './lib/storage';

type ModelId = 'basic300'|'advanced115'|'scientific991'|'scientific991es'|'graph84';
type Page = 'home'|'tools'|'calc'|'graph'|'solver'|'calculus'|'number'|'complex'|'stats'|'matrix'|'formulas'|'periodic'|'history'|'camera'|'converter'|'settings';
type Settings = { angle: AngleMode; theme: string; };
type KeyDef = { label:string; insert?:string; action?:'equals'|'clear'|'delete'|'shift'|'alpha'|'angle'|'mode'|'decimal'|'solve'|'calc'|'fraction'|'calculus'|'matrix'; kind?:'function'|'command'|'number'|'operator'|'equals'|'danger'; };
const DEFAULTS: Settings = { angle: 'DEG', theme: 'graphite' };
const MODELS: Array<{id:ModelId;name:string;subtitle:string;description:string;badge:string}> = [
  {id:'basic300',name:'300 ES PLUS',subtitle:'Basic calculator',description:'Everyday arithmetic, fractions, percentages, roots and essential scientific functions.',badge:'BASIC'},
  {id:'advanced115',name:'115 ES PLUS',subtitle:'Advanced calculator',description:'Scientific functions, complex numbers, matrices, vectors and calculus shortcuts.',badge:'ADVANCED'},
  {id:'scientific991es',name:'991 ES PLUS',subtitle:'Scientific calculator',description:'Classic scientific keypad with equation solving, statistics and table modes.',badge:'SCIENTIFIC'},
  {id:'scientific991',name:'991 EX',subtitle:'Advanced scientific calculator',description:'Full scientific keypad, precision arithmetic, number theory and engineering functions.',badge:'FLAGSHIP'},
  {id:'graph84',name:'84 PLUS',subtitle:'Graphing calculator',description:'Cartesian, polar, parametric and implicit graphing with trace-friendly controls.',badge:'GRAPHING'}
];
const TOOL_PAGES: Array<{id:Page;label:string;icon:string}> = [
  {id:'solver',label:'Equation solver',icon:'x='},{id:'calculus',label:'Calculus',icon:'∫'},
  {id:'matrix',label:'Matrix & vectors',icon:'▦'},{id:'complex',label:'Complex numbers',icon:'ℂ'},
  {id:'stats',label:'Statistics',icon:'σ'},{id:'number',label:'Number theory',icon:'ℕ'},
  {id:'formulas',label:'Formula library',icon:'π'},{id:'periodic',label:'Periodic table',icon:'⚛'},
  {id:'history',label:'History',icon:'↶'},{id:'camera',label:'Camera input',icon:'▣'},
  {id:'converter',label:'Unit converter',icon:'⇄'},
  {id:'settings',label:'Settings',icon:'⚙'}
];
const UNIT_TABLES:Record<string,Record<string,number>> = {
  Length:{mm:0.001,cm:0.01,m:1,km:1000,in:0.0254,ft:0.3048,mi:1609.344},
  Mass:{mg:0.001,g:1,kg:1000,t:1000000,oz:28.349523125,lb:453.59237},
  Time:{ms:0.001,s:1,min:60,h:3600,day:86400},
  Area:{'mm²':0.000001,'cm²':0.0001,'m²':1,'km²':1000000,ha:10000,acre:4046.8564224},
  Volume:{mL:0.001,L:1,'m³':1000,gal:3.785411784,ft³:28.316846592},
  Speed:{'m/s':1,'km/h':1/3.6,mph:0.44704,knot:0.514444444},
  Data:{bit:1,byte:8,KB:8000,MB:8000000,GB:8000000000}
};
function convertUnits(value:number,category:string,from:string,to:string):number {
  if(!Number.isFinite(value)) throw new Error('Enter a valid numeric value.');
  if(category==='Temperature'){
    const celsius=from==='°C'?value:from==='°F'?(value-32)*5/9:value-273.15;
    return to==='°C'?celsius:to==='°F'?celsius*9/5+32:celsius+273.15;
  }
  const units=UNIT_TABLES[category];
  if(!units||units[from]===undefined||units[to]===undefined) throw new Error('Choose compatible units.');
  return value*units[from]/units[to];
}
\nconst BASIC_KEYS:KeyDef[][] = [
  [{label:'AC',action:'clear',kind:'danger'},{label:'DEL',action:'delete',kind:'command'},{label:'%',insert:'%',kind:'function'},{label:'÷',insert:'÷',kind:'operator'}],
  [{label:'√',insert:'sqrt(',kind:'function'},{label:'x²',insert:'^2',kind:'function'},{label:'π',insert:'π',kind:'function'},{label:'×',insert:'×',kind:'operator'}],
  [{label:'7',insert:'7',kind:'number'},{label:'8',insert:'8',kind:'number'},{label:'9',insert:'9',kind:'number'},{label:'−',insert:'−',kind:'operator'}],
  [{label:'4',insert:'4',kind:'number'},{label:'5',insert:'5',kind:'number'},{label:'6',insert:'6',kind:'number'},{label:'+',insert:'+',kind:'operator'}],
  [{label:'1',insert:'1',kind:'number'},{label:'2',insert:'2',kind:'number'},{label:'3',insert:'3',kind:'number'},{label:'=',action:'equals',kind:'equals'}],
  [{label:'±',insert:'(-)',kind:'function'},{label:'0',insert:'0',kind:'number'},{label:'.',insert:'.',kind:'number'},{label:'Ans',insert:'Ans',kind:'function'}]
];
const SCIENTIFIC_KEYS:KeyDef[][] = [
  [{label:'SHIFT',action:'shift',kind:'command'},{label:'ALPHA',action:'alpha',kind:'command'},{label:'MENU',action:'mode',kind:'command'},{label:'SETUP',action:'angle',kind:'command'},{label:'ON',action:'clear',kind:'danger'}],
  [{label:'CALC',action:'calc',kind:'command'},{label:'∫dx',action:'calculus',kind:'function'},{label:'d/dx',action:'calculus',kind:'function'},{label:'√',insert:'sqrt(',kind:'function'},{label:'x²',insert:'^2',kind:'function'}],
  [{label:'x⁻¹',insert:'^(-1)',kind:'function'},{label:'xʸ',insert:'^',kind:'function'},{label:'log',insert:'log(',kind:'function'},{label:'ln',insert:'ln(',kind:'function'},{label:'nCr',insert:'nCr(',kind:'function'}],
  [{label:'nPr',insert:'nPr(',kind:'function'},{label:'(',insert:'(',kind:'function'},{label:')',insert:')',kind:'function'},{label:'sin',insert:'sin(',kind:'function'},{label:'cos',insert:'cos(',kind:'function'}],
  [{label:'tan',insert:'tan(',kind:'function'},{label:'(-)',insert:'−',kind:'function'},{label:'° ′ ″',insert:'°',kind:'function'},{label:'hyp',insert:'sinh(',kind:'function'},{label:'S⇔D',action:'fraction',kind:'command'}],
  [{label:'7',insert:'7',kind:'number'},{label:'8',insert:'8',kind:'number'},{label:'9',insert:'9',kind:'number'},{label:'DEL',action:'delete',kind:'command'},{label:'AC',action:'clear',kind:'danger'}],
  [{label:'4',insert:'4',kind:'number'},{label:'5',insert:'5',kind:'number'},{label:'6',insert:'6',kind:'number'},{label:'×',insert:'×',kind:'operator'},{label:'÷',insert:'÷',kind:'operator'}],
  [{label:'1',insert:'1',kind:'number'},{label:'2',insert:'2',kind:'number'},{label:'3',insert:'3',kind:'number'},{label:'+',insert:'+',kind:'operator'},{label:'−',insert:'−',kind:'operator'}],
  [{label:'0',insert:'0',kind:'number'},{label:'.',insert:'.',kind:'number'},{label:'π',insert:'π',kind:'function'},{label:'Ans',insert:'Ans',kind:'function'},{label:'=',action:'equals',kind:'equals'}]
];
const ADVANCED_KEYS:KeyDef[][] = [
  [{label:'SHIFT',action:'shift',kind:'command'},{label:'ALPHA',action:'alpha',kind:'command'},{label:'MODE',action:'mode',kind:'command'},{label:'SETUP',action:'angle',kind:'command'},{label:'ON',action:'clear',kind:'danger'}],
  [{label:'SOLVE',action:'solve',kind:'command'},{label:'∫dx',insert:'∫(',kind:'function'},{label:'d/dx',insert:'diff(',kind:'function'},{label:'MATRIX',action:'matrix',kind:'function'},{label:'VECTOR',action:'matrix',kind:'function'}],
  [{label:'x²',insert:'^2',kind:'function'},{label:'^',insert:'^',kind:'function'},{label:'log',insert:'log(',kind:'function'},{label:'ln',insert:'ln(',kind:'function'},{label:'√',insert:'sqrt(',kind:'function'}],
  [{label:'sin',insert:'sin(',kind:'function'},{label:'cos',insert:'cos(',kind:'function'},{label:'tan',insert:'tan(',kind:'function'},{label:'(',insert:'(',kind:'function'},{label:')',insert:')',kind:'function'}],
  [{label:'7',insert:'7',kind:'number'},{label:'8',insert:'8',kind:'number'},{label:'9',insert:'9',kind:'number'},{label:'DEL',action:'delete',kind:'command'},{label:'AC',action:'clear',kind:'danger'}],
  [{label:'4',insert:'4',kind:'number'},{label:'5',insert:'5',kind:'number'},{label:'6',insert:'6',kind:'number'},{label:'×',insert:'×',kind:'operator'},{label:'÷',insert:'÷',kind:'operator'}],
  [{label:'1',insert:'1',kind:'number'},{label:'2',insert:'2',kind:'number'},{label:'3',insert:'3',kind:'number'},{label:'+',insert:'+',kind:'operator'},{label:'−',insert:'−',kind:'operator'}],
  [{label:'0',insert:'0',kind:'number'},{label:'.',insert:'.',kind:'number'},{label:'i',insert:'i',kind:'function'},{label:'Ans',insert:'Ans',kind:'function'},{label:'=',action:'equals',kind:'equals'}]
];
const ES_KEYS:KeyDef[][] = [
  [{label:'SHIFT',action:'shift',kind:'command'},{label:'ALPHA',action:'alpha',kind:'command'},{label:'MODE',action:'mode',kind:'command'},{label:'ON',action:'clear',kind:'danger'}],
  [{label:'CALC',action:'calc',kind:'command'},{label:'∫dx',insert:'∫(',kind:'function'},{label:'x⁻¹',insert:'^(-1)',kind:'function'},{label:'log',insert:'log(',kind:'function'}],
  [{label:'√',insert:'sqrt(',kind:'function'},{label:'x²',insert:'^2',kind:'function'},{label:'^',insert:'^',kind:'function'},{label:'ln',insert:'ln(',kind:'function'}],
  [{label:'(-)',insert:'−',kind:'function'},{label:'° ′ ″',insert:'°',kind:'function'},{label:'hyp',insert:'sinh(',kind:'function'},{label:'sin',insert:'sin(',kind:'function'}],
  [{label:'cos',insert:'cos(',kind:'function'},{label:'tan',insert:'tan(',kind:'function'},{label:'RCL',insert:'Ans',kind:'command'},{label:'ENG',insert:'*10^',kind:'command'}],
  [{label:'7',insert:'7',kind:'number'},{label:'8',insert:'8',kind:'number'},{label:'9',insert:'9',kind:'number'},{label:'DEL',action:'delete',kind:'command'}],
  [{label:'4',insert:'4',kind:'number'},{label:'5',insert:'5',kind:'number'},{label:'6',insert:'6',kind:'number'},{label:'×',insert:'×',kind:'operator'}],
  [{label:'1',insert:'1',kind:'number'},{label:'2',insert:'2',kind:'number'},{label:'3',insert:'3',kind:'number'},{label:'÷',insert:'÷',kind:'operator'}],
  [{label:'0',insert:'0',kind:'number'},{label:'.',insert:'.',kind:'number'},{label:'EXP',insert:'*10^',kind:'command'},{label:'Ans',insert:'Ans',kind:'function'}],
  [{label:'(',insert:'(',kind:'function'},{label:')',insert:')',kind:'function'},{label:'AC',action:'clear',kind:'danger'},{label:'=',action:'equals',kind:'equals'}]
];

export default function App() {
  const [page,setPage]=useState<Page>('home');
  const [model,setModel]=useState<ModelId>('scientific991');
  const [settings,setSettings]=useState<Settings>(()=>readSettings(DEFAULTS));
  const [expression,setExpression]=useState('');
  const [result,setResult]=useState('');
  const [error,setError]=useState('');
  const [ans,setAns]=useState<unknown>(0);
  const [shift,setShift]=useState(false);
  const [alpha,setAlpha]=useState(false);
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
  const [savedFunctions,setSavedFunctions]=useState<Array<{name:string;expression:string}>>(()=>{
    try{return JSON.parse(localStorage.getItem('mathpro.functions')||'[]')}catch{return[]}
  });
  const [functionName,setFunctionName]=useState('f');
  const [functionExpression,setFunctionExpression]=useState('x^2+3*x');
  const [tableStart,setTableStart]=useState('-5');
  const [tableStep,setTableStep]=useState('1');
  const [tableEnd,setTableEnd]=useState('5');
  const [tableRows,setTableRows]=useState<Array<{x:number;y:string}>>([]);

  useEffect(()=>saveSettings(settings),[settings]);
  useEffect(()=>saveHistory(history),[history]);
  useEffect(()=>{localStorage.setItem('mathpro.functions',JSON.stringify(savedFunctions))},[savedFunctions]);
  useEffect(()=>{if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>undefined)},[]);
  const selectedModel=MODELS.find(item=>item.id===model)||MODELS[3];
  const selected = ELEMENTS.find(el=>el.atomicNumber===selectedElement) || ELEMENTS[0];
  const filteredFormulas=useMemo(()=>FORMULAS.filter(item=>
    (category==='All'||item.category===category) &&
    (item.title+' '+item.formula+' '+item.note).toLowerCase().includes(formulaSearch.toLowerCase())
  ),[category,formulaSearch]);
  const keyRows=model==='basic300'?BASIC_KEYS:model==='advanced115'?ADVANCED_KEYS:model==='scientific991es'?ES_KEYS:SCIENTIFIC_KEYS;

  const calculate=(source=expression)=>{
    if(!source.trim()){setError('Enter an expression first.');return;}
    try {
      const raw=evaluateRaw(source,settings.angle,ans);
      const value=formatResult(raw);
      setAns(raw);setResult(value);setError('');
      const entry:HistoryEntry={id:globalThis.crypto?.randomUUID?.()||String(Date.now()),expression:source,result:value,createdAt:Date.now()};
      setHistory(list=>[entry,...list].slice(0,1000));
    } catch(e) {setResult('');setError(e instanceof Error?e.message:String(e));}
  };
  const insertText=(text:string)=>{
    setExpression(v=>v+text);
    setResult('');setError('');
  };
  const pressKey=(key:KeyDef)=>{
    if(key.action==='equals'||key.action==='calc'){calculate();setShift(false);setAlpha(false);return;}
    if(key.action==='clear'){setExpression('');setResult('');setError('');setShift(false);setAlpha(false);return;}
    if(key.action==='delete'){setExpression(v=>v.slice(0,-1));setResult('');setError('');return;}
    if(key.action==='shift'){setShift(v=>!v);setAlpha(false);return;}
    if(key.action==='alpha'){setAlpha(v=>!v);setShift(false);return;}
    if(key.action==='angle'){setSettings(s=>({...s,angle:s.angle==='DEG'?'RAD':s.angle==='RAD'?'GRAD':'DEG'}));return;}
    if(key.action==='mode'){setPage('tools');return;}
    if(key.action==='solve'){setPage('solver');return;}
    if(key.action==='calculus'){setPage('calculus');return;}
    if(key.action==='matrix'){setPage('matrix');return;}
    if(key.action==='fraction'){
      if(result){const value=Number(result);if(Number.isFinite(value)){const [p,q]=rationalApproximation(value);setResult(q===1?String(p):p+'/'+q);}}
      else insertText('/');
      return;
    }
    let text=key.insert??key.label;
    if(shift){
      const shifted:Record<string,string>={'sin':'asin(','cos':'acos(','tan':'atan(','log':'10^(','ln':'e^','x²':'sqrt(','√':'^2','nCr':'nPr('};
      text=shifted[key.label]??text;
    }else if(alpha){
      const alphaMap:Record<string,string>={'sin':'A','cos':'B','tan':'C','7':'x','8':'y','9':'z'};
      text=alphaMap[key.label]??text;
    }
    if(text==='(-)')text='−';
    insertText(text);
    setShift(false);setAlpha(false);
  };
  const selectModel=(id:ModelId)=>{
    setModel(id);setExpression('');setResult('');setError('');setShift(false);setAlpha(false);
    setPage(id==='graph84'?'graph':'calc');
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
  const runUnitConverter=()=>{try{
    const value=convertUnits(Number(converterValue),converterCategory,converterFrom,converterTo);
    setConverterResult(Number(value.toPrecision(12)).toString());
  }catch(e){setConverterResult(e instanceof Error?e.message:String(e))}};
  const pagesToTools=()=>setPage('tools');

  return <main className={'app theme-'+settings.theme}>
    <header className="app-topbar">
      <button className="brand-lockup" onClick={()=>setPage('home')}><span className="brand-symbol">M</span><span><b>MathPro <em>X</em></b><small>SCIENTIFIC SYSTEM</small></span></button>
      <div className="topbar-actions">
        <button className="top-pill" onClick={()=>setSettings(s=>({...s,angle:s.angle==='DEG'?'RAD':s.angle==='RAD'?'GRAD':'DEG'}))}>{settings.angle}</button>
        <button className="top-icon" onClick={()=>setPage('history')} aria-label="History">↶</button>
        <button className="top-icon" onClick={()=>setPage('settings')} aria-label="Settings">⚙</button>
      </div>
    </header>
    <nav className="primary-nav">
      <button className={page==='home'?'active':''} onClick={()=>setPage('home')}>CALCULATORS</button>
      <button className={page==='calc'?'active':''} onClick={()=>setPage('calc')}>SCIENTIFIC</button>
      <button className={page==='graph'?'active':''} onClick={()=>{setModel('graph84');setPage('graph')}}>GRAPH 84</button>
      <button className={['solver','calculus','number','complex','stats','matrix','formulas','periodic','camera','tools'].includes(page)?'active':''} onClick={pagesToTools}>TOOLS</button>
    </nav>

    {page==='home'&&<section className="home-screen">
      <div className="hero-copy"><span className="eyebrow">MULTI-MODE CALCULATOR</span><h1>One workspace.<br/><strong>Five calculator modes.</strong></h1><p>Choose the keypad and workflow you need. Switch models any time without losing your calculation history.</p></div>
      <div className="model-grid">
        {MODELS.map(item=><button className={'model-card model-'+item.id} key={item.id} onClick={()=>selectModel(item.id)}>
          <span className="model-top"><small>{item.badge}</small><span>↗</span></span>
          <span className="mini-device"><span className="mini-screen"><small>MATHPRO X</small><b>{item.id==='graph84'?'Y₁ = sin(X)':item.id==='basic300'?'123456789':item.id==='advanced115'?'a+bi  MATRIX':item.id==='scientific991es'?'sin(30)  0.5':'123456789 × 987'}</b></span><span className="mini-keys"><i/><i/><i/><i/><i/><i/><i/><i/><i/></span></span>
          <b className="model-name">{item.name}</b><strong>{item.subtitle}</strong><span className="model-desc">{item.description}</span><span className="launch-model">OPEN CALCULATOR <b>→</b></span>
        </button>)}
      </div>
      <div className="home-utilities"><div><span>TOOLS & REFERENCES</span><b>Beyond the keypad</b><p>Equation solving, calculus, matrices, statistics, number theory, formulas and periodic table.</p></div><button onClick={pagesToTools}>OPEN TOOLBOX →</button></div>
    </section>}

    {page==='calc'&&<section className={'calculator-stage model-stage-'+model}>
      <div className="device-heading">
        <div><span className="device-kicker">MATHPRO X / CALCULATOR MODE</span><h1>{selectedModel.name}</h1><p>{selectedModel.subtitle}</p></div>
        <button className="model-switch" onClick={()=>setPage('home')}>CHANGE MODEL⌄</button>
      </div>
      <div className="physical-calculator">
        <div className="calc-brand-row"><b>MathPro <em>X</em></b><span>SCIENTIFIC CALCULATOR</span><small>{selectedModel.name}</small></div>
        <section className="lcd-screen">
          <div className="lcd-status"><span>Math</span><span>{settings.angle}</span><span>{shift?'SHIFT':alpha?'ALPHA':'NORM'}</span><span>FIX 100</span></div>
          <textarea className="lcd-expression" rows={2} value={expression} onChange={e=>{setExpression(e.target.value);setResult('');setError('')}} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();calculate()}if(e.key==='Escape'){setExpression('');setResult('');setError('')}}} placeholder="Enter calculation" aria-label="Expression input"/>
          <div className="lcd-answer"><span className="lcd-error">{error}</span><strong>{result||' '}</strong></div>
          <div className="lcd-footer"><span>{result?'▶ RESULT':'▶ INPUT'}</span><span>{history.length} HISTORY</span></div>
        </section>
        <div className="physical-keypad">
          {keyRows.map((row,rowIndex)=><div className={'key-row key-row-'+rowIndex} key={rowIndex}>
            {row.map((key,index)=><button key={rowIndex+'-'+index} className={'calc-key key-'+(key.kind||'function')+(key.action==='shift'&&shift?' is-on':'')+(key.action==='alpha'&&alpha?' is-on':'')} onClick={()=>pressKey(key)}>{key.label}</button>)}
          </div>)}
        </div>
        <div className="calc-bottom-label"><span>MathPro X</span><span>100-DIGIT ENGINE · {settings.angle}</span></div>
      </div>
      <div className="calculator-footer-tools">
        <button onClick={()=>setPage('history')}>↶ HISTORY</button><button onClick={()=>setPage('solver')}>x= SOLVER</button><button onClick={()=>setPage('calculus')}>∫ CALCULUS</button><button onClick={()=>setPage('settings')}>⚙ SETTINGS</button>
      </div>
      <p className="precision-note">100-digit precision is available for supported BigNumber operations. Results from numerical and symbolic tools have their own method limits.</p>
    </section>}

    {page==='graph'&&<Panel title="84 PLUS · Graphing calculator" subtitle="Function · Polar · Parametric · Implicit">
      <div className="graph-device">
        <div className="graph-lcd-head"><b>Y= EDITOR</b><span>84 PLUS / GRAPH MODE</span></div>
        <div className="segmented">{(['cartesian','polar','parametric','implicit'] as GraphMode[]).map(mode=><button key={mode} className={graphMode===mode?'selected':''} onClick={()=>setGraphMode(mode)}>{mode}</button>)}</div>
        <Field label={graphMode==='polar'?'r(θ)':graphMode==='implicit'?'F(x,y) = 0':'Y₁ ='} value={graphExpr} onChange={setGraphExpr}/>
        {graphMode==='parametric'&&<div className="field-grid two"><Field label="X₁(t)" value={graphX} onChange={setGraphX}/><Field label="Y₁(t)" value={graphY} onChange={setGraphY}/></div>}
        <Field label="Window range ±" value={graphRange} onChange={setGraphRange}/>
        <div className="action-row"><button className="primary-action" onClick={()=>setExpression(graphExpr+'=0')}>Transfer to calculator</button><button onClick={()=>setGraphExpr('sin(x)')}>RESET GRAPH</button></div>
        <GraphCanvas mode={graphMode} expression={graphExpr} xExpression={graphX} yExpression={graphY} range={Math.max(1,Math.min(100,Number(graphRange)||10))}/>
      </div>
      <p className="muted small">Graph output is sampled numerically. Steep asymptotes and discontinuities may need a smaller window range.</p>
    </Panel>}

    {page==='tools'&&<section className="toolbox-screen"><div className="toolbox-head"><span className="eyebrow">MATHPRO X / TOOLBOX</span><h1>Engineering tools</h1><p>Choose a workspace. Each tool has its own inputs and results.</p></div><div className="toolbox-grid">{TOOL_PAGES.map(item=><button key={item.id} onClick={()=>setPage(item.id)}><b>{item.icon}</b><span>{item.label}</span><i>→</i></button>)}</div></section>}

    {page==='solver'&&<Panel title="Equation Solver" subtitle="Polynomial and supported symbolic equations">
      <Field label="Equation" value={equation} onChange={setEquation}/><Field label="Variable" value={variable} onChange={setVariable}/>
      <button className="primary-action" onClick={runSolver}>SOLVE EQUATION</button>
      <Output>{solutions.length?solutions.map((root,index)=><div key={index}>Root {index+1}: {root}</div>):'Solutions will appear here.'}</Output>
      <p className="muted small">Exact symbolic solutions depend on the expression forms supported by the algebra engine.</p>
    </Panel>}

    {page==='calculus'&&<Panel title="Calculus workspace" subtitle="Derivative · antiderivative · definite integral">
      <Field label="f(x)" value={calcExpr} onChange={setCalcExpr}/><Field label="Variable" value={calcVariable} onChange={setCalcVariable}/>
      <div className="field-grid two"><Field label="Lower bound" value={lower} onChange={setLower}/><Field label="Upper bound" value={upper} onChange={setUpper}/></div>
      <div className="action-row"><button className="primary-action" onClick={()=>runCalculus('diff')}>d/dx DERIVATIVE</button><button onClick={()=>runCalculus('int')}>∫ ANTIDERIVATIVE</button><button onClick={()=>runCalculus('definite')}>DEFINITE ∫</button></div>
      <Output>{calcOutput||'Choose an operation.'}</Output>
    </Panel>}

    {page==='number'&&<Panel title="Number Theory" subtitle="Prime factors · divisors · continued fractions · GCD/LCM">
      <Field label="Positive integer" value={integer} onChange={setInteger}/><button className="primary-action" onClick={runNumber}>ANALYZE INTEGER</button><Output>{numberOutput||'Analysis will appear here.'}</Output>
      <div className="result-grid"><div className="stat-tile"><span>GCD(84,30)</span><b>{gcd(84,30)}</b></div><div className="stat-tile"><span>LCM(84,30)</span><b>{lcm(84,30)}</b></div></div>
      <h3>Base conversion</h3><Field label="Input integer" value={baseValue} onChange={setBaseValue}/>
      <div className="segmented">{([2,8,10,16] as SupportedBase[]).map(base=><button key={base} className={sourceBase===base?'selected':''} onClick={()=>setSourceBase(base)}>BASE {base}</button>)}</div>
      <button onClick={runBase}>CONVERT BASES</button>{baseOutput&&<Output>Binary: {baseOutput.binary}{'\n'}Octal: {baseOutput.octal}{'\n'}Decimal: {baseOutput.decimal}{'\n'}Hex: {baseOutput.hexadecimal}</Output>}
      <h3>Permutations & combinations</h3><div className="field-grid two"><Field label="n" value={n} onChange={setN}/><Field label="r" value={r} onChange={setR}/></div>
      <button onClick={runCombinations}>CALCULATE nPr / nCr</button>{combOutput&&<Output>nPr = {combOutput.permutations}{'\n'}nCr = {combOutput.combinations}{'\n'}n! = {combOutput.factorial}</Output>}
    </Panel>}

    {page==='complex'&&<Panel title="Complex Numbers" subtitle="Rectangular-form arithmetic and evaluation">
      <Field label="Expression" value={complexExpr} onChange={setComplexExpr}/>
      <button className="primary-action" onClick={()=>{try{setComplexOutput(formatResult(evaluateRaw(complexExpr,settings.angle,ans)))}catch(e){setComplexOutput(e instanceof Error?e.message:String(e))}}}>EVALUATE COMPLEX EXPRESSION</button>
      <Output>{complexOutput||'Try (3+2i)*(1-i), sqrt(-1), or abs(3+4i).'}</Output>
    </Panel>}

    {page==='stats'&&<Panel title="Statistics & Regression" subtitle="Descriptive statistics and least-squares linear fit">
      <Field label="Values separated by commas" value={statValues} onChange={setStatValues}/><button className="primary-action" onClick={runStats}>CALCULATE STATISTICS</button>
      {statOutput&&<div className="result-grid">{Object.entries(statOutput).map(([key,value])=><div className="stat-tile" key={key}><span>{key}</span><b>{Number.isFinite(value)?value.toPrecision(7):'—'}</b></div>)}</div>}
      <h3>Linear regression</h3><Field label="Pairs x,y separated by semicolons" value={pairs} onChange={setPairs}/><button onClick={runRegression}>FIT y = a + bx</button>
      {regOutput&&<Output>y = {regOutput.intercept.toPrecision(8)} + {regOutput.slope.toPrecision(8)}x{'\n'}R² = {regOutput.r2.toPrecision(8)}</Output>}
      {error&&<p className="error-text">{error}</p>}
    </Panel>}

    {page==='matrix'&&<Panel title="Matrix & Vector Workspace" subtitle="Determinant · inverse · transpose · RREF · eigenvalues">
      <Field label="Matrix (numeric array)" value={matrixInput} onChange={setMatrixInput}/>
      <div className="segmented">{(['det','inv','transpose','rref','eigen','multiply'] as const).map(action=><button key={action} className={matrixAction===action?'selected':''} onClick={()=>setMatrixAction(action)}>{action}</button>)}</div>
      <button className="primary-action" onClick={runMatrix}>RUN MATRIX OPERATION</button><Output>{matrixOutput||'Example: [[1,2],[3,4]]'}</Output>
    </Panel>}

    {page==='formulas'&&<Panel title="STEM Formula Library" subtitle="Mathematics · physics · chemistry">
      <Field label="Search formulas" value={formulaSearch} onChange={setFormulaSearch}/>
      <div className="segmented">{['All','Mathematics','Physics','Chemistry'].map(value=><button key={value} className={category===value?'selected':''} onClick={()=>setCategory(value)}>{value}</button>)}</div>
      <div className="formula-list">{filteredFormulas.map(item=><div className="formula-card" key={item.title}><span>{item.category}</span><b>{item.title}</b><strong>{item.formula}</strong><small>{item.note}</small></div>)}</div>
    </Panel>}

    {page==='periodic'&&<Panel title="Periodic Table" subtitle="118 elements · select an element">
      <div className="periodic-scroll"><div className="periodic-grid">{ELEMENTS.map(item=><button key={item.atomicNumber} className={'element-cell '+(item.atomicNumber===selectedElement?'selected':'')} style={{gridColumn:item.group,gridRow:item.period}} onClick={()=>setSelectedElement(item.atomicNumber)}><small>{item.atomicNumber}</small><b>{item.symbol}</b></button>)}</div></div>
      <div className="element-detail"><span>{selected.atomicNumber}</span><b>{selected.symbol}</b><strong>{selected.name}</strong><small>{selected.family} · Period {selected.period} · Group {selected.group}</small></div>
    </Panel>}

    {page==='history'&&<Panel title="Calculation History" subtitle={history.length+' / 1000 stored entries'}>
      <div className="action-row"><button onClick={()=>setHistory([])}>CLEAR HISTORY</button><button onClick={()=>{
        const csv=['expression,result,timestamp',...history.map(item=>'"'+item.expression.replaceAll('"','""')+'","'+item.result.replaceAll('"','""')+'",'+new Date(item.createdAt).toISOString())].join('\n');
        const url=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));const link=document.createElement('a');link.href=url;link.download='mathpro-history.csv';link.click();URL.revokeObjectURL(url);
      }}>EXPORT CSV</button></div>
      <div className="history-list">{history.map(item=><button key={item.id} onClick={()=>{setExpression(item.expression);setResult(item.result);setError('');setPage('calc')}}><span>{item.expression}</span><b>{item.result}</b><small>{new Date(item.createdAt).toLocaleString()}</small></button>)}</div>
    </Panel>}

    {page==='converter'&&<Panel title="Unit Converter" subtitle="Length · mass · time · area · volume · speed · data · temperature">
      <label className="field">
        <span>Category</span>
        <select value={converterCategory} onChange={e=>{
          const category=e.target.value;
          setConverterCategory(category);
          const units=category==='Temperature'?['°C','°F','K']:Object.keys(UNIT_TABLES[category]);
          setConverterFrom(units[0]);setConverterTo(units[1]);setConverterResult('');
        }}>
          {['Length','Mass','Time','Area','Volume','Speed','Data','Temperature'].map(item=><option key={item} value={item}>{item}</option>)}
        </select>
      </label>
      <Field label="Value" value={converterValue} onChange={setConverterValue}/>
      <div className="field-grid two">
        <label className="field">
          <span>From</span>
          <select value={converterFrom} onChange={e=>setConverterFrom(e.target.value)}>
            {(converterCategory==='Temperature'?['°C','°F','K']:Object.keys(UNIT_TABLES[converterCategory])).map(unit=><option key={unit}>{unit}</option>)}
          </select>
        </label>
        <label className="field">
          <span>To</span>
          <select value={converterTo} onChange={e=>setConverterTo(e.target.value)}>
            {(converterCategory==='Temperature'?['°C','°F','K']:Object.keys(UNIT_TABLES[converterCategory])).map(unit=><option key={unit}>{unit}</option>)}
          </select>
        </label>
      </div>
      <button className="primary-action" onClick={runUnitConverter}>CONVERT UNITS</button>
      <Output>{converterResult||'Converted value will appear here.'}</Output>
    </Panel>}

    {page==='camera'&&<Panel title="Camera Math Input" subtitle="Choose or capture a mathematical expression">
      <label className="file-picker">OPEN CAMERA / CHOOSE IMAGE<input type="file" accept="image/*" capture="environment" onChange={event=>handlePhoto(event.target.files?.[0])}/></label>
      {photo&&<img className="camera-preview" src={photo} alt="Selected equation"/>}
      <p className="muted">{ocrStatus||'OCR requires the Mathpix server credentials to be configured.'}</p>
      {expression&&<button className="primary-action" onClick={()=>{setPage('calc');calculate(expression)}}>CALCULATE RECOGNIZED EXPRESSION</button>}
    </Panel>}

    {page==='settings'&&<Panel title="Settings & Themes" subtitle="Angle mode · appearance · calculation precision">
      <h3>Angle unit</h3><div className="segmented">{(['DEG','RAD','GRAD'] as AngleMode[]).map(mode=><button key={mode} className={settings.angle===mode?'selected':''} onClick={()=>setSettings(s=>({...s,angle:mode}))}>{mode}</button>)}</div>
      <h3>Theme</h3><div className="theme-options">{['graphite','midnight','light','violet','casio-green'].map(theme=><button key={theme} className={settings.theme===theme?'selected':''} onClick={()=>setSettings(s=>({...s,theme}))}>{theme.replace('-',' ')}</button>)}</div>
      <div className="settings-row"><span>BigNumber precision</span><b>100 digits</b></div><div className="settings-row"><span>History capacity</span><b>1000 entries</b></div>
      <p className="muted small">100-digit precision applies to supported BigNumber operations; other methods can use numerical approximations.</p>
    </Panel>}

    <footer className="app-footer"><button onClick={()=>setPage('home')}>MATHPRO X</button><span>Development build · v0.2.0</span><span>{settings.angle}</span></footer>
  </main>;
}

function Field({label,value,onChange}:{label:string;value:string;onChange:(value:string)=>void}){
  return <label className="field"><span>{label}</span><input value={value} onChange={event=>onChange(event.target.value)}/></label>;
}
function Panel({title,subtitle,children}:{title:string;subtitle:string;children:ReactNode}){
  return <section className="tool-panel"><div className="panel-title"><h2>{title}</h2><p>{subtitle}</p></div>{children}</section>;
}
function Output({children}:{children:ReactNode}){return <pre className="output-box">{children}</pre>}
