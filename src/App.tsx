import { useMemo, useState } from 'react';
import { evaluate } from 'mathjs';

const keys = ['SHIFT','ALPHA','MODE','2nd','sin','cos','tan','log','ln','√','x²','^','(',')','⌫','AC','7','8','9','÷','4','5','6','×','1','2','3','−','0','.','Ans','+','='];

export default function App() {
  const [expression,setExpression] = useState('');
  const [answer,setAnswer] = useState('0');
  const [angle,setAngle] = useState<'DEG'|'RAD'>('DEG');
  const [error,setError] = useState('');
  const result = useMemo(() => {
    if (!expression.trim()) return '';
    try {
      const source = expression.replaceAll('×','*').replaceAll('÷','/').replaceAll('−','-')
        .replace(/√\(/g,'sqrt(').replace(/sin\(/g, angle==='DEG'?'sin((pi/180)*(':'sin(')
        .replace(/cos\(/g, angle==='DEG'?'cos((pi/180)*(':'cos(')
        .replace(/tan\(/g, angle==='DEG'?'tan((pi/180)*(':'tan(');
      return String(evaluate(source, {Ans:Number(answer)}));
    } catch { return ''; }
  },[expression,angle,answer]);
  const press = (key:string) => {
    setError('');
    if (key==='AC') { setExpression(''); setError(''); return; }
    if (key==='⌫') { setExpression(v=>v.slice(0,-1)); return; }
    if (key==='=') {
      try { const value=result || String(evaluate(expression)); setAnswer(value); setExpression(value); }
      catch { setError('Invalid expression'); }
      return;
    }
    const insert:Record<string,string>={'÷':'/','×':'*','−':'-','√':'sqrt(','x²':'^2','Ans':'Ans'};
    setExpression(v=>v+(insert[key]??key));
  };
  return <div className="app-shell">
    <header><div><small>MATHPRO X</small><h1>Scientific Calculator</h1></div><button onClick={()=>setAngle(a=>a==='DEG'?'RAD':'DEG')}>{angle}</button></header>
    <section className="display"><div className="expression">{expression||'0'}</div><div className="answer">{result||answer}</div>{error&&<small className="error">{error}</small>}</section>
    <section className="keypad">{keys.map((key,i)=><button key={i} className={['=','AC'].includes(key)?'accent':''} onClick={()=>press(key)}>{key}</button>)}</section>
    <footer>MathPro X · Web / Android starter</footer>
  </div>;
}