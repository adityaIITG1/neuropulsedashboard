export function histogramBins(input: number[], count = 8) {
 const values=input.filter(Number.isFinite);
 if(!values.length)return [];
 const low=Math.min(...values), high=Math.max(...values), width=high===low?1:(high-low)/count;
 return Array.from({length:high===low?1:count},(_,i)=>{
  const start=low+i*width, end=start+width;
  return {x:start+width/2,label:high===low?String(low):`${start.toFixed(1)}–${end.toFixed(1)}`,count:values.filter(v=>v>=start&&(i===count-1||high===low?v<=end:v<end)).length};
 });
}
export function densityEstimate(input:number[]) {
 const values=input.filter(Number.isFinite);
 if(values.length<5||new Set(values).size<2)return [];
 const mean=values.reduce((a,b)=>a+b,0)/values.length;
 const sd=Math.sqrt(values.reduce((a,b)=>a+(b-mean)**2,0)/(values.length-1));
 const bandwidth=1.06*sd*values.length**(-.2);
 const low=Math.min(...values)-3*bandwidth, high=Math.max(...values)+3*bandwidth;
 return Array.from({length:81},(_,i)=>{const x=low+(high-low)*i/80;return {x,density:values.reduce((a,v)=>a+Math.exp(-.5*((x-v)/bandwidth)**2),0)/(values.length*bandwidth*Math.sqrt(2*Math.PI))};});
}
