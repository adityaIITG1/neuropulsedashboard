import { Session, metrics, categoryValue } from './segmentation';
type Metric=(typeof metrics)[number][0];
export function measured(rows:Session[],key:Metric){return rows.map(r=>r[key]).filter((v):v is number=>typeof v==='number'&&Number.isFinite(v));}
export function average(rows:Session[],key:Metric){const values=measured(rows,key);return values.length?values.reduce((a,b)=>a+b,0)/values.length:null;}
export function cohorts(rows:Session[],key:string,metric:Metric){const groups=new Map<string,Session[]>();for(const r of rows){const name=categoryValue(r,key);groups.set(name,[...(groups.get(name)||[]),r]);}return Array.from(groups,([name,items])=>({name,count:items.length,measured:measured(items,metric).length,value:average(items,metric)}));}
