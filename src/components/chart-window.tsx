import { Children, ReactNode } from 'react';
// Unselected charts never mount Recharts stores, SVGs, or resize observers.
export default function ChartWindow({children,start=0,end=2}:{children:ReactNode;start?:number;end?:number}) {
 return <>{Children.toArray(children).slice(start,end)}</>;
}
