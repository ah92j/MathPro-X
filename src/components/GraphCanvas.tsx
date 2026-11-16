import { useEffect, useRef } from 'react';
import { math, normalizeExpression } from '../lib/engine';

export type GraphMode='cartesian'|'polar'|'parametric'|'implicit';
type Props={mode:GraphMode; expression:string; xExpression:string; yExpression:string; range:number; };

export default function GraphCanvas({mode,expression,xExpression,yExpression,range}:Props){
 const ref=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{
  const canvas=ref.current;if(!canvas)return;const ctx=canvas.getContext('2d');if(!ctx)return;
  const dpr=window.devicePixelRatio||1, w=canvas.clientWidth,h=canvas.clientHeight;
  canvas.width=w*dpr;canvas.height=h*dpr;ctx.scale(dpr,dpr);ctx.clearRect(0,0,w,h);
  ctx.fillStyle='#17191f';ctx.fillRect(0,0,w,h);
  const scale=Math.min(w,h)/(2*range),cx=w/2,cy=h/2;
  const px=(x:number)=>cx+x*scale,py=(y:number)=>cy-y*scale;
  ctx.strokeStyle='#343842';ctx.lineWidth=1;ctx.beginPath();
  for(let v=-range;v<=range;v++){ctx.moveTo(px(v),0);ctx.lineTo(px(v),h);ctx.moveTo(0,py(v));ctx.lineTo(w,py(v));}ctx.stroke();
  ctx.strokeStyle='#8c929e';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(0,cy);ctx.lineTo(w,cy);ctx.moveTo(cx,0);ctx.lineTo(cx,h);ctx.stroke();
  ctx.fillStyle='#aeb5c2';ctx.font='10px system-ui';ctx.fillText('x',w-12,cy-7);ctx.fillText('y',cx+7,12);
  const safe=(fn:()=>number)=>{try{const n=fn();return Number.isFinite(n)?n:NaN}catch{return NaN}};
  ctx.strokeStyle='#a78bfa';ctx.lineWidth=2.5;ctx.beginPath();let started=false;
  if(mode==='cartesian'){
   for(let i=0;i<=w;i++){const x=(i-cx)/scale,y=safe(()=>Number(math.evaluate(normalizeExpression(expression),{x:math.bignumber(x)})));if(!Number.isFinite(y)||Math.abs(y)>range*5){started=false;continue;}const Y=py(y);if(!started){ctx.moveTo(i,Y);started=true;}else ctx.lineTo(i,Y);}
   ctx.stroke();
  }else if(mode==='polar'||mode==='parametric'){
   const count=1000;for(let i=0;i<=count;i++){const t=-Math.PI*2+(i/count)*Math.PI*4;
    const [x,y]=mode==='polar'?(()=>{const r=safe(()=>Number(math.evaluate(normalizeExpression(expression),{t:math.bignumber(t),theta:math.bignumber(t)})));return [r*Math.cos(t),r*Math.sin(t)]})():[safe(()=>Number(math.evaluate(normalizeExpression(xExpression),{t:math.bignumber(t)}))),safe(()=>Number(math.evaluate(normalizeExpression(yExpression),{t:math.bignumber(t)})))];
    if(!Number.isFinite(x)||!Number.isFinite(y)||Math.abs(x)>range*4||Math.abs(y)>range*4){started=false;continue;}
    const X=px(x),Y=py(y);if(!started){ctx.moveTo(X,Y);started=true;}else ctx.lineTo(X,Y);
   }ctx.stroke();
  }else{
   // Marching-squares contour approximation for F(x,y)=0.
   const n=100,step=2*range/n;ctx.lineWidth=1.4;ctx.beginPath();
   for(let iy=0;iy<n;iy++)for(let ix=0;ix<n;ix++){
    const x=-range+ix*step,y=-range+iy*step;
    const v=[safe(()=>Number(math.evaluate(normalizeExpression(expression),{x:math.bignumber(x),y:math.bignumber(y)}))),safe(()=>Number(math.evaluate(normalizeExpression(expression),{x:math.bignumber(x+step),y:math.bignumber(y)}))),safe(()=>Number(math.evaluate(normalizeExpression(expression),{x:math.bignumber(x+step),y:math.bignumber(y+step)}))),safe(()=>Number(math.evaluate(normalizeExpression(expression),{x:math.bignumber(x),y:math.bignumber(y+step)})))];
    if(v.some(q=>!Number.isFinite(q)))continue;
    const pts:Array<[number,number]>=[];const corners:[[number,number],[number,number],[number,number],[number,number]]=[[x,y],[x+step,y],[x+step,y+step],[x,y+step]];
    for(let e=0;e<4;e++){const j=(e+1)%4;if((v[e]<=0&&v[j]>=0)||(v[e]>=0&&v[j]<=0)){const t=v[e]===v[j]?0.5:v[e]/(v[e]-v[j]);pts.push([corners[e][0]+(corners[j][0]-corners[e][0])*t,corners[e][1]+(corners[j][1]-corners[e][1])*t]);}}
    if(pts.length>=2){ctx.moveTo(px(pts[0][0]),py(pts[0][1]));ctx.lineTo(px(pts[1][0]),py(pts[1][1]));}
   }ctx.stroke();
  }
 },[mode,expression,xExpression,yExpression,range]);
 return <canvas ref={ref} className="graph-canvas" aria-label={`${mode} function graph`}/>;
}