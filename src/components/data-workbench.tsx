'use client';
import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Session, SegmentFilters, categories, metrics, categoryValue, reviewFlags } from '@/lib/segmentation';

interface Props {
  reports: Session[];
  visible: Session[];
  filters: SegmentFilters;
  setFilters: (filters: SegmentFilters) => void;
  excluded: string[];
  setExcluded: (ids: string[]) => void;
  refresh: () => Promise<void>;
}
export default function DataWorkbench({ reports, visible, filters, setFilters, excluded, setExcluded, refresh }: Props) {
  const [metric, setMetric] = useState<(typeof metrics)[number][0]>('activePercent');
  const [groupBy, setGroupBy] = useState('ageGroup');
  const [selected, setSelected] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [adminKey, setAdminKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const inputClass = 'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm';
  const change = (key: string, value: string) => setFilters({ ...filters, [key]: value });
  const groups = new Map<string, Session[]>();
  visible.forEach(report => { const name = categoryValue(report, groupBy); groups.set(name, [...(groups.get(name) || []), report]); });
  const mean = (rows: Session[], key: keyof Session) => {
    const values = rows.map(r => r[key]).filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
    return values.length ? (values.reduce((a,b) => a+b,0) / values.length).toFixed(2) : 'N/A';
  };
  const metricLabel = metrics.find(([key]) => key === metric)![1];
  const metricValues = visible.map(r => r[metric]).filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  const stats = metricValues.length ? {
    mean: (metricValues.reduce((a,b) => a+b,0) / metricValues.length).toFixed(2),
    min: Math.min(...metricValues).toFixed(2), max: Math.max(...metricValues).toFixed(2),
  } : null;
  const metricGroups = Array.from(groups).map(([name,rows]) => {
    const values = rows.map(r => r[metric]).filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
    return {name, count: rows.length, measured: values.length, value: values.length ? values.reduce((a,b)=>a+b,0)/values.length : null};
  });
  const exportData = () => {
    const fields = ['SessionId', ...categories.map(([key]) => key), ...metrics.map(([key]) => key)];
    const quote = (value: unknown) => { let text = String(value ?? ''); if (/^[=+\-@\t\r]/.test(text)) text = "'" + text; return '"' + text.replaceAll('"', '""') + '"'; };
    const csv = [fields, ...visible.map(r => fields.map(key => categories.some(([k]) => k === key) ? categoryValue(r,key) : r[key as keyof Session]))].map(row => row.map(quote).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], {type:'text/csv;charset=utf-8'}));
    const anchor = document.createElement('a'); anchor.href=url; anchor.download='neuropulse-segment.csv'; anchor.click(); URL.revokeObjectURL(url);
  };
  const deleteSelected = async () => {
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/reports/delete', {method:'POST', headers:{'Content-Type':'application/json', 'Authorization':`Bearer ${adminKey}`}, body:JSON.stringify({sessionIds:selected, confirmation})});
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Deletion failed.');
      setMessage(`Deleted ${result.deleted.length} records. ${result.failed.length ? `${result.failed.length} records could not be deleted; review and retry.` : ''}`);
      setSelected(result.failed); setConfirming(false); setConfirmation('');
      await refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Deletion failed.'); }
    finally { setBusy(false); setAdminKey(''); }
  };
  return <section className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5 space-y-5">
    <div className="flex flex-wrap justify-between gap-3"><div><h2 className="text-lg font-bold">Data segmentation & cleaning review</h2><p className="text-sm text-slate-400">{visible.length} matching reports of {reports.length}. Conditions use recorded fields only.</p></div><button className={inputClass + ' !w-auto'} onClick={() => {setFilters({}); setExcluded([]);}}>Reset filters & exclusions</button></div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <label className="text-xs space-y-1">Session identifier<input className={inputClass} value={filters.id || ''} onChange={e => change('id',e.target.value)} placeholder="UUID or part of an ID" /></label>
      {categories.map(([key,label]) => <label key={key} className="text-xs space-y-1">{label}<select className={inputClass} value={filters[key] || ''} onChange={e=>change(key,e.target.value)}><option value="">All</option>{Array.from(new Set(reports.map(r=>categoryValue(r,key)))).sort().map(v=><option key={v}>{v}</option>)}</select></label>)}
    </div>
    <div className="rounded-xl border border-cyan-500/30 bg-slate-950/50 p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="text-sm">Metric to explore<select className={inputClass} value={metric} onChange={e=>setMetric(e.target.value as typeof metric)}>{metrics.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
        <label className="text-sm">Compare by<select className={inputClass} value={groupBy} onChange={e=>setGroupBy(e.target.value)}>{categories.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">{[['Mean',stats?.mean],['Minimum',stats?.min],['Maximum',stats?.max],['Measured sessions',`${metricValues.length} / ${visible.length}`]].map(([label,value])=><div key={label} className="rounded-lg bg-slate-900 p-3"><div className="text-slate-400">{label}</div><div className="text-xl font-bold text-cyan-300">{value ?? 'Not recorded'}</div></div>)}</div>
      <p className="text-xs text-slate-400">{metricLabel}: mean across recorded values in each group. {visible.length-metricValues.length} sessions have no recorded value. Comparisons describe these sessions and do not establish treatment effects.</p>
      {metricValues.length > 0 ? <div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={metricGroups} margin={{bottom:35,left:10,right:20}}><CartesianGrid strokeDasharray="3 3" stroke="#334155" /><XAxis dataKey="name" stroke="#94a3b8" fontSize={11} interval={0} angle={-15} textAnchor="end" /><YAxis stroke="#94a3b8" /><Tooltip contentStyle={{backgroundColor:'#0f172a',borderColor:'#334155'}} /><Bar dataKey="value" name={`Mean ${metricLabel}`} fill="#22d3ee" /></BarChart></ResponsiveContainer></div> : <p role="status" className="text-slate-400">This metric is not recorded in the matching sessions. Select another metric or upload reports containing this field.</p>}
      <details><summary className="cursor-pointer text-sm">See exact metrics for each matching session</summary><div className="overflow-auto max-h-80"><table className="w-full text-xs text-left"><thead><tr><th className="p-2">Session ID</th>{categories.map(([key,label])=><th className="p-2 whitespace-nowrap" key={key}>{label}</th>)}{metrics.map(([key,label])=><th className="p-2 whitespace-nowrap" key={key}>{label}</th>)}</tr></thead><tbody>{visible.map(r=><tr className="border-t border-slate-800" key={r.SessionId}><td className="p-2 font-mono">{r.SessionId}</td>{categories.map(([key])=><td className="p-2" key={key}>{categoryValue(r,key)}</td>)}{metrics.map(([key])=><td className="p-2" key={key}>{Number.isFinite(r[key]) ? r[key] : 'Not recorded'}</td>)}</tr>)}</tbody></table></div></details>
    </div>
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">{metrics.map(([key,label])=><fieldset key={key} className="space-y-1"><legend className="text-xs">{label}</legend><div className="flex gap-2">{['min','max'].map(bound=><input key={bound} aria-label={`${label} ${bound}`} type="number" min="0" step="any" className={inputClass} placeholder={bound === 'min' ? 'Minimum' : 'Maximum'} value={filters[`${key}_${bound}`] || ''} onChange={e=>change(`${key}_${bound}`,e.target.value)} />)}</div></fieldset>)}</div>
    <div className="flex flex-wrap gap-3 items-center text-sm"><label><input type="checkbox" checked={!!filters.review} onChange={e=>change('review',e.target.checked?'yes':'')} /> Show reports needing review</label><button className="rounded-lg border border-slate-600 px-3 py-2" onClick={exportData}>Export matching data (CSV)</button><span className="text-slate-400">{excluded.length} manually excluded from this view</span></div>
    <div className="flex items-center gap-3"><label htmlFor="group-by" className="text-sm">Group matching data by</label><select id="group-by" className={inputClass+' !w-auto'} value={groupBy} onChange={e=>setGroupBy(e.target.value)}>{categories.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></div>
    <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr className="text-slate-400"><th className="p-2">Segment</th><th>Sessions</th><th>Mean active %</th><th>Mean peak µV</th><th>Longest episode (s)</th></tr></thead><tbody>{Array.from(groups).map(([name,rows])=><tr key={name} className="border-t border-slate-800"><td className="p-2">{name}</td><td>{rows.length}</td><td>{mean(rows,'activePercent')}</td><td>{mean(rows,'peakActiveEnvelope')}</td><td>{rows.some(r=>Number.isFinite(r.longestEpisodeSec)) ? Math.max(...rows.map(r=>Number.isFinite(r.longestEpisodeSec)?r.longestEpisodeSec!:0)).toFixed(2) : 'N/A'}</td></tr>)}</tbody></table>{!visible.length && <p className="p-3 text-slate-400">No matching records.</p>}</div>
    <details><summary className="cursor-pointer font-semibold">Review records, exclude from analysis, or delete from AWS</summary><p className="my-3 text-sm text-slate-400">Flags identify missing or invalid fields for review. Low activity alone does not make a recording useless. Exclusions affect this view only and reset on reload. Permanent deletion requires administrator access.</p>
      <div className="max-h-80 overflow-auto"><table className="w-full text-sm text-left"><thead><tr><th>Select</th><th>Full session identifier</th><th>Review flags</th><th>Analysis</th></tr></thead><tbody>{reports.map(r=><tr key={r.SessionId} className="border-t border-slate-800"><td className="p-2"><input aria-label={`Select ${r.SessionId}`} type="checkbox" checked={selected.includes(r.SessionId)} disabled={busy} onChange={e=>setSelected(e.target.checked?[...selected,r.SessionId]:selected.filter(id=>id!==r.SessionId))} /></td><td className="p-2 font-mono break-all">{r.SessionId}</td><td className="p-2">{reviewFlags(r).join('; ') || 'No flagged fields'}</td><td><button onClick={()=>setExcluded(excluded.includes(r.SessionId)?excluded.filter(id=>id!==r.SessionId):[...excluded,r.SessionId])}>{excluded.includes(r.SessionId)?'Restore':'Exclude'}</button></td></tr>)}</tbody></table></div>
      <button disabled={!selected.length || selected.length>20 || busy} className="mt-3 rounded-lg border border-red-500 px-4 py-2 text-red-300 disabled:opacity-40" onClick={()=>setConfirming(true)}>Permanently delete {selected.length} selected records</button><p className="mt-2 text-xs text-slate-400">Maximum 20 records per deletion request.</p>
    </details>
    {confirming && <div role="dialog" aria-label="Confirm permanent deletion" className="border border-red-500/50 rounded-xl p-4 space-y-3"><h3 className="font-bold text-red-300">Permanent AWS deletion</h3><p className="text-sm">These {selected.length} exact session IDs will be removed from the live DynamoDB table. This dashboard cannot undo it. Backups and exported copies are not removed.</p><ul className="max-h-32 overflow-auto text-xs font-mono">{selected.map(id=><li key={id}>{id}</li>)}</ul><label className="block text-sm">Administrator key<input type="password" autoComplete="off" className={inputClass} value={adminKey} onChange={e=>setAdminKey(e.target.value)} /></label><label className="block text-sm">Type DELETE to confirm<input className={inputClass} value={confirmation} onChange={e=>setConfirmation(e.target.value)} /></label><div className="flex gap-3"><button disabled={busy || confirmation!=='DELETE' || !adminKey} onClick={deleteSelected} className="bg-red-800 rounded-lg p-2 disabled:opacity-40">{busy?'Deleting…':'Confirm permanent deletion'}</button><button disabled={busy} onClick={()=>{setConfirming(false);setAdminKey('');setConfirmation('');}}>Cancel</button></div></div>}
    {message && <p role="status" className="text-sm text-amber-200">{message}</p>}
  </section>;
}
