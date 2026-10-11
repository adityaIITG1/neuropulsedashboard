import { Session } from './segmentation';
export function distribution(values: number[]) {
  const sorted = values.filter(Number.isFinite).sort((a,b)=>a-b);
  if (!sorted.length) return null;
  const quantile=(p:number)=>{const index=(sorted.length-1)*p, lower=Math.floor(index);return sorted[lower]+(sorted[Math.ceil(index)]-sorted[lower])*(index-lower);};
  const q1=quantile(.25), median=quantile(.5), q3=quantile(.75), iqr=q3-q1;
  const inside=sorted.filter(v=>v>=q1-1.5*iqr&&v<=q3+1.5*iqr);
  return {q1,median,q3,low:inside[0],high:inside[inside.length-1],count:sorted.length,outliers:sorted.filter(v=>v<q1-1.5*iqr||v>q3+1.5*iqr)};
}
export function cumulative(values:number[]) {
  const sorted=values.filter(Number.isFinite).sort((a,b)=>a-b);
  return Array.from(new Set(sorted)).map(value=>({value,percent:sorted.filter(v=>v<=value).length/sorted.length*100}));
}
export function metricPresent(report:Session,key:keyof Session) {return typeof report[key]==='number'&&Number.isFinite(report[key]);}
