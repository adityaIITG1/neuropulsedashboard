'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  Zap,
  TrendingUp,
  Shield,
  Layers,
  Database,
  RefreshCw,
  Search,
  Users,
  Timer,
  CheckCircle2,
  ChevronRight,
  Filter,
  BarChart3,
  SlidersHorizontal,
  Clock,
  Sparkles,
  Award
} from 'lucide-react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

interface GraphPoint {
  sec: number;
  raw?: number;
  filtered?: number;
  envelope: number;
  isActive: boolean;
}

interface ReportItem {
  SessionId: string;
  timestamp: number;
  patientAge: string;
  patientGender: string;
  muscle: string;
  side: string;
  recordingSite?: string;
  exercise?: string;
  exerciseMode?: string;
  durationSeconds: number;
  activityGrade: number;
  activityGradeText?: string;
  signalQuality: string;
  activityDetected: boolean;
  activeTimeSec: number;
  activePercent: number;
  sustainedActivityTimeSec: number;
  activationEpisodes: number;
  sustainedEpisodes: number;
  longestEpisodeSec: number;
  medianEpisodeSec: number;
  medianRestSec: number;
  averageActiveEnvelope: number;
  peakActiveEnvelope: number;
  baselineValue: number;
  mvcReference: number;
  analysisVersion?: string;
  sessionPattern: string;
  spikesCount?: number;
  interpretationNarrative?: string;
  oneSentenceSummary?: string;
  graphValues?: GraphPoint[];
}

export default function NeuroPulseAnalyticsDashboard() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscleFilter, setSelectedMuscleFilter] = useState('ALL');
  const [selectedGenderFilter, setSelectedGenderFilter] = useState('ALL');
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'FATIGUE' | 'TABLE'>('OVERVIEW');
  const [connected, setConnected] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Fetch reports from API Gateway / DynamoDB endpoint
  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reports', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.success || !Array.isArray(data.reports)) throw new Error(data.error || 'Unable to load reports. Please retry.');
      setReports(data.reports);
      setConnected(true);
      setFetchError(null);
      setLastRefreshed(new Date());
      setSelectedSessionId(current => data.reports.some((report: ReportItem) => report.SessionId === current) ? current : (data.reports[0]?.SessionId || ''));
    } catch (error) {
      setReports([]);
      setSelectedSessionId('');
      setConnected(false);
      setFetchError(error instanceof Error ? error.message : 'Unable to load reports. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
    // Auto-refresh every 25 seconds
    const interval = setInterval(fetchReports, 25000);
    return () => clearInterval(interval);
  }, []);

  // Filtered dataset
  const filteredReports = useMemo(() => {
    return reports.filter((item) => {
      const matchesSearch =
        searchQuery === '' ||
        item.muscle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.SessionId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.exercise?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesMuscle =
        selectedMuscleFilter === 'ALL' || item.muscle === selectedMuscleFilter;

      const matchesGender =
        selectedGenderFilter === 'ALL' ||
        item.patientGender?.toLowerCase() === selectedGenderFilter.toLowerCase();

      return matchesSearch && matchesMuscle && matchesGender;
    });
  }, [reports, searchQuery, selectedMuscleFilter, selectedGenderFilter]);

  // Selected session for deep single-trace clinical examination
  const selectedSession = useMemo(() => {
    return reports.find((r) => r.SessionId === selectedSessionId) || reports[0];
  }, [reports, selectedSessionId]);

  // KPI Calculations
  const totalSessions = filteredReports.length;
  const avgActivePercent = useMemo(() => {
    if (!totalSessions) return 0;
    const sum = filteredReports.reduce((acc, r) => acc + (r.activePercent || 0), 0);
    return +(sum / totalSessions).toFixed(1);
  }, [filteredReports, totalSessions]);

  const avgPeakEnvelope = useMemo(() => {
    if (!totalSessions) return 0;
    const sum = filteredReports.reduce((acc, r) => acc + (r.peakActiveEnvelope || 0), 0);
    return +(sum / totalSessions).toFixed(1);
  }, [filteredReports, totalSessions]);

  const avgGrade = useMemo(() => {
    if (!totalSessions) return 0;
    const sum = filteredReports.reduce((acc, r) => acc + (r.activityGrade ?? 0), 0);
    return +(sum / totalSessions).toFixed(2);
  }, [filteredReports, totalSessions]);

  const avgSustainedSec = useMemo(() => {
    if (!totalSessions) return 0;
    const sum = filteredReports.reduce((acc, r) => acc + (r.sustainedActivityTimeSec || r.activeTimeSec || 0), 0);
    return +(sum / totalSessions).toFixed(1);
  }, [filteredReports, totalSessions]);

  // Aggregate Data for Muscle Distribution Chart
  const muscleDistributionData = useMemo(() => {
    const map: { [key: string]: { count: number; totalPeak: number; totalActive: number } } = {};
    filteredReports.forEach((r) => {
      const name = r.muscle || 'Other';
      if (!map[name]) map[name] = { count: 0, totalPeak: 0, totalActive: 0 };
      map[name].count += 1;
      map[name].totalPeak += r.peakActiveEnvelope || 0;
      map[name].totalActive += r.activePercent || 0;
    });
    return Object.entries(map).map(([name, val]) => ({
      muscle: name,
      sessions: val.count,
      avgPeak: +(val.totalPeak / val.count).toFixed(1),
      avgActive: +(val.totalActive / val.count).toFixed(1)
    }));
  }, [filteredReports]);

  // Demographics: Age distribution
  const ageDistributionData = useMemo(() => {
    const buckets: { [key: string]: number } = { '< 25 Y': 0, '25 - 40 Y': 0, '41 - 60 Y': 0, '60+ Y': 0 };
    filteredReports.forEach((r) => {
      const ageNum = parseInt(r.patientAge, 10);
      if (!Number.isFinite(ageNum)) return;
      if (ageNum < 25) buckets['< 25 Y']++;
      else if (ageNum <= 40) buckets['25 - 40 Y']++;
      else if (ageNum <= 60) buckets['41 - 60 Y']++;
      else buckets['60+ Y']++;
    });
    return Object.entries(buckets).map(([ageGroup, count]) => ({ ageGroup, count }));
  }, [filteredReports]);

  // Activity Pattern Breakdown
  const patternData = useMemo(() => {
    const map: { [key: string]: number } = {};
    filteredReports.forEach((r) => {
      const p = r.sessionPattern || 'Not reported';
      map[p] = (map[p] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredReports]);

  const COLORS = ['#00E5FF', '#0D9488', '#38BDF8', '#818CF8', '#F59E0B'];

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* 1. TOP CLINICAL HEADER BAR */}
      <header className="border-b border-slate-800/80 bg-[#0A101D]/90 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-teal-400 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Activity className="h-6 w-6 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-cyan-100 to-teal-300 bg-clip-text text-transparent">
                NeuroPulseAI Cloud Analytics
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 tracking-wider">
                POWER BI ENGINE
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Single-Channel Surface EMG Biofeedback Intelligence • AWS DynamoDB Live Pipeline
            </p>
          </div>
        </div>

        {/* Global Controls & Status */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
            <span className={`h-2 w-2 rounded-full ${loading ? 'bg-amber-400' : connected ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
            <span className="text-slate-400">AWS DynamoDB:</span>
            <span className={`font-semibold ${fetchError ? 'text-red-400' : 'text-slate-200'}`}>{loading ? 'Checking reports?' : connected ? 'Reports API connected' : 'Connection failed'}</span>
          </div>

          <button
            onClick={fetchReports}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-semibold transition active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Sync AWS Data
          </button>
        </div>
      </header>

      {/* 2. SUBHEADER: POWER BI FILTER SLICER BAR */}
      <div className="bg-[#0B1322] border-b border-slate-800/60 px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400">
            <SlidersHorizontal className="h-3.5 w-3.5 text-cyan-400" />
            <span className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">Slicers:</span>
          </div>

          {/* Muscle Slicer */}
          <select
            value={selectedMuscleFilter}
            onChange={(e) => setSelectedMuscleFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700/80 rounded-md px-2.5 py-1 text-slate-200 text-xs focus:outline-none focus:border-cyan-400"
          >
            <option value="ALL">All Muscle Groups ({reports.length})</option>
            {Array.from(new Set(reports.map((r) => r.muscle).filter(Boolean))).map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          {/* Gender Slicer */}
          <select
            value={selectedGenderFilter}
            onChange={(e) => setSelectedGenderFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700/80 rounded-md px-2.5 py-1 text-slate-200 text-xs focus:outline-none focus:border-cyan-400"
          >
            <option value="ALL">All Demographics</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>

          {/* Search Box */}
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-2 text-slate-500" />
            <input
              type="text"
              placeholder="Search exercise, muscle, ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-900 border border-slate-700/80 rounded-md pl-8 pr-3 py-1 text-slate-200 text-xs focus:outline-none focus:border-cyan-400 w-48 sm:w-64"
            />
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-lg bg-slate-900/90 p-1 border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('OVERVIEW')}
            className={`px-3 py-1 rounded-md transition ${
              activeTab === 'OVERVIEW'
                ? 'bg-cyan-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Clinical Overview
          </button>
          <button
            onClick={() => setActiveTab('FATIGUE')}
            className={`px-3 py-1 rounded-md transition ${
              activeTab === 'FATIGUE'
                ? 'bg-cyan-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Fatigue & Trace Examiner
          </button>
          <button
            onClick={() => setActiveTab('TABLE')}
            className={`px-3 py-1 rounded-md transition ${
              activeTab === 'TABLE'
                ? 'bg-cyan-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Raw DynamoDB Records ({filteredReports.length})
          </button>
        </div>
      </div>

      {/* 3. MAIN DASHBOARD CONTENT */}
      <main className="flex-1 p-6 space-y-6 max-w-[1700px] w-full mx-auto">
        {fetchError && <div role="alert" className="rounded-xl border border-red-500/40 bg-red-950/30 p-5 text-red-200"><h2 className="font-bold">Reports connection failed</h2><p className="mt-1 text-sm">{fetchError}</p><p className="mt-1 text-sm">Use Sync AWS Data to retry. No reports are displayed while the connection is unavailable.</p></div>}
        {!fetchError && reports.length === 0 && <div role="status" className="rounded-xl border border-slate-700 bg-slate-900 p-5"><h2 className="font-bold">{loading ? 'Loading real reports?' : 'No reports available'}</h2><p className="mt-1 text-sm text-slate-400">{loading ? 'Checking the reports service.' : 'The reports service returned no sessions. Upload a recording, then sync again.'}</p></div>}
        {reports.length > 0 && filteredReports.length === 0 && <div role="status" className="rounded-xl border border-slate-700 p-5">No reports match these filters. Clear the filters to see your sessions.</div>}
        {reports.length > 0 && <>
        {/* EXECUTIVE KPI SCORECARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Card 1: Total Sessions */}
          <div className="bg-[#0F172A]/80 border border-slate-800/80 rounded-2xl p-4 shadow-sm hover:border-cyan-500/40 transition">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Sessions</span>
              <Layers className="h-4 w-4 text-cyan-400" />
            </div>
            <div className="text-3xl font-extrabold text-white tracking-tight">{totalSessions}</div>
            <p className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1">
              <CheckCircle2 className="h-3 w-3" /> Synced across AWS Cloud
            </p>
          </div>

          {/* Card 2: Active Contraction % */}
          <div className="bg-[#0F172A]/80 border border-slate-800/80 rounded-2xl p-4 shadow-sm hover:border-cyan-500/40 transition">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Active Contraction</span>
              <Timer className="h-4 w-4 text-teal-400" />
            </div>
            <div className="text-3xl font-extrabold text-teal-400 tracking-tight">{avgActivePercent}%</div>
            <p className="text-[11px] text-slate-400 mt-1">
              Mean: <span className="text-slate-200 font-semibold">{avgSustainedSec}s</span> sustained hold
            </p>
          </div>

          {/* Card 3: Global Peak Envelope */}
          <div className="bg-[#0F172A]/80 border border-slate-800/80 rounded-2xl p-4 shadow-sm hover:border-cyan-500/40 transition">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Mean Peak Voluntary</span>
              <Zap className="h-4 w-4 text-amber-400" />
            </div>
            <div className="text-3xl font-extrabold text-amber-400 tracking-tight">{avgPeakEnvelope} µV</div>
            <p className="text-[11px] text-slate-400 mt-1">Peak electrical sEMG amplitude</p>
          </div>

          {/* Card 4: Activity Grade */}
          <div className="bg-[#0F172A]/80 border border-slate-800/80 rounded-2xl p-4 shadow-sm hover:border-cyan-500/40 transition">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Clinical Grade</span>
              <Award className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-extrabold text-emerald-400 tracking-tight">
              {avgGrade} <span className="text-base text-slate-500 font-normal">/ 5.0</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Medical biofeedback score</p>
          </div>

          {/* Card 5: Signal Quality */}
          <div className="bg-[#0F172A]/80 border border-slate-800/80 rounded-2xl p-4 shadow-sm hover:border-cyan-500/40 transition">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Signal Quality</span>
              <Shield className="h-4 w-4 text-cyan-400" />
            </div>
            <div className="text-3xl font-extrabold text-cyan-300 tracking-tight">{filteredReports.filter(r => r.signalQuality === 'GOOD').length} / {filteredReports.length}</div>
            <p className="text-[11px] text-emerald-400 mt-1">Sessions reporting GOOD signal quality</p>
          </div>
        </div>

        {/* 4. CLINICAL CHARTS SECTION */}
        {activeTab === 'OVERVIEW' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart 1: Muscle Target Distribution */}
            <div className="bg-[#0F172A]/80 border border-slate-800/80 rounded-2xl p-5 lg:col-span-2 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-cyan-400" />
                    Muscle Group Recruitment & Peak Microvolts (µV)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Comparing session count and average peak electrical activity across monitored muscles
                  </p>
                </div>
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={muscleDistributionData} margin={{ top: 10, right: 30, left: 0, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                    <XAxis dataKey="muscle" stroke="#64748B" fontSize={11} angle={-15} textAnchor="end" />
                    <YAxis stroke="#64748B" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px' }}
                      labelStyle={{ color: '#F8FAFC', fontWeight: 'bold' }}
                    />
                    <Legend />
                    <Bar dataKey="avgPeak" name="Avg Peak Amplitude (µV)" fill="#00E5FF" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="avgActive" name="Active Time %" fill="#0D9488" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Activity Pattern Breakdown */}
            <div className="bg-[#0F172A]/80 border border-slate-800/80 rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-amber-400" />
                Session Activity Patterns
              </h3>
              <p className="text-xs text-slate-400 mb-4">Classified by Biomedical Signal Analysis Engine</p>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={patternData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {patternData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 3: Demographic Age Cohort Analysis */}
            <div className="bg-[#0F172A]/80 border border-slate-800/80 rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-indigo-400" />
                Patient Age Cohort Distribution
              </h3>
              <p className="text-xs text-slate-400 mb-4">Anonymized clinical demographic brackets</p>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ageDistributionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                    <XAxis dataKey="ageGroup" stroke="#64748B" fontSize={11} />
                    <YAxis stroke="#64748B" fontSize={11} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px' }}
                    />
                    <Bar dataKey="count" name="Sessions" fill="#818CF8" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Quick Session Inspector Callout */}
            <div className="bg-gradient-to-br from-[#0F172A] to-[#131E35] border border-cyan-500/30 rounded-2xl p-5 lg:col-span-2 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest">
                    ACTIVE CLINICAL SESSION SPOTLIGHT
                  </span>
                  <span className="text-xs text-slate-400">ID: {selectedSession?.SessionId?.slice(0, 18)}...</span>
                </div>
                <h4 className="text-lg font-bold text-white">
                  {selectedSession?.muscle} ({selectedSession?.side} Side) — {selectedSession?.exercise || 'Not reported'}
                </h4>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  {selectedSession?.interpretationNarrative ||
                    'No interpretation was included in this report.'}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-800">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase">Active Time</div>
                  <div className="text-base font-extrabold text-teal-400">{selectedSession?.activeTimeSec}s</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase">Sustained Periods</div>
                  <div className="text-base font-extrabold text-cyan-400">{selectedSession?.sustainedEpisodes ?? 'N/A'}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase">Peak Envelope</div>
                  <div className="text-base font-extrabold text-amber-400">{selectedSession?.peakActiveEnvelope} µV</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase">MVC Reference</div>
                  <div className="text-base font-extrabold text-emerald-400">{selectedSession?.mvcReference ?? 'N/A'}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 5. FULL SESSION ACTIVITY GRAPH & FATIGUE EXAMINER */}
        {(activeTab === 'FATIGUE' || activeTab === 'OVERVIEW') && (
          <div className="bg-[#0F172A]/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-white">
                    FULL SESSION SURFACE EMG ACTIVITY TRACE & ENDURANCE TREND
                  </h3>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                    {selectedSession?.activityGradeText || 'Grade not reported'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Recorded sEMG activity envelope and raw signal, when included in the report
                </p>
              </div>

              {/* Session Selector Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Select Session:</span>
                <select
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-medium focus:outline-none focus:border-cyan-400 max-w-xs"
                >
                  {reports.map((r, idx) => (
                    <option key={r.SessionId} value={r.SessionId}>
                      #{idx + 1}: {r.muscle} ({r.patientAge || 'Age unavailable'}, {r.patientGender || 'Gender unavailable'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* The Main High-End Interactive Chart */}
            <div className="h-80 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={selectedSession?.graphValues || []}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="envelopeColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00E5FF" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#00E5FF" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="rawColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0D9488" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0D9488" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis dataKey="sec" stroke="#64748B" unit="s" fontSize={11} />
                  <YAxis stroke="#64748B" fontSize={11} unit=" µV" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#090E17', borderColor: '#00E5FF', borderRadius: '12px' }}
                    labelStyle={{ color: '#00E5FF', fontWeight: 'bold' }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="envelope"
                    name="Activity Envelope (µV)"
                    stroke="#00E5FF"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#envelopeColor)"
                  />
                  <Line
                    type="monotone"
                    dataKey="raw"
                    name="Filtered Raw EMG"
                    stroke="#38BDF8"
                    strokeWidth={1}
                    dot={false}
                    opacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Bottom Technical Details Box (Identical to User Report Image 2) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-3 border-t border-slate-800 text-xs">
              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase">Active Time</span>
                <span className="font-bold text-white text-sm">{selectedSession?.activeTimeSec} s</span>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase">Active %</span>
                <span className="font-bold text-teal-400 text-sm">{selectedSession?.activePercent}%</span>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase">Peak Active</span>
                <span className="font-bold text-cyan-400 text-sm">{selectedSession?.peakActiveEnvelope} µV</span>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase">Avg Active Env</span>
                <span className="font-bold text-amber-400 text-sm">{selectedSession?.averageActiveEnvelope} a.u.</span>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase">Sustained Episodes</span>
                <span className="font-bold text-indigo-400 text-sm">{selectedSession?.sustainedEpisodes ?? 'N/A'}</span>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase">Median Rest</span>
                <span className="font-bold text-slate-300 text-sm">{selectedSession?.medianRestSec} s</span>
              </div>
            </div>
          </div>
        )}

        {/* 6. RAW DYNAMODB RECORDS DATA GRID (Power BI Table View) */}
        {activeTab === 'TABLE' && (
          <div className="bg-[#0F172A] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Database className="h-4 w-4 text-cyan-400" />
                  Live AWS DynamoDB Items (`NeuroPulseReports`)
                </h3>
                <p className="text-xs text-slate-400">Strictly anonymized clinical telemetry synced from Android</p>
              </div>
              <span className="text-xs text-slate-400">
                Showing {filteredReports.length} records
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#090E17] text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Session ID</th>
                    <th className="px-4 py-3">Demographics</th>
                    <th className="px-4 py-3">Recording Site</th>
                    <th className="px-4 py-3">Exercise</th>
                    <th className="px-4 py-3">Active Duration</th>
                    <th className="px-4 py-3">Active %</th>
                    <th className="px-4 py-3">Peak Env (µV)</th>
                    <th className="px-4 py-3">Avg Env</th>
                    <th className="px-4 py-3">Grade</th>
                    <th className="px-4 py-3">Pattern</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredReports.map((item) => (
                    <tr
                      key={item.SessionId}
                      onClick={() => {
                        setSelectedSessionId(item.SessionId);
                        setActiveTab('FATIGUE');
                      }}
                      className="hover:bg-slate-800/40 transition cursor-pointer"
                    >
                      <td className="px-4 py-3 font-mono text-[11px] text-cyan-300">
                        {item.SessionId.slice(0, 16)}...
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-white">{item.patientAge}</span> / {item.patientGender}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-200">
                        {item.recordingSite || `${item.side} ${item.muscle}`}
                      </td>
                      <td className="px-4 py-3 text-slate-400">{item.exercise || 'Not reported'}</td>
                      <td className="px-4 py-3 font-semibold text-teal-400">{item.activeTimeSec}s</td>
                      <td className="px-4 py-3 font-semibold text-emerald-400">{item.activePercent}%</td>
                      <td className="px-4 py-3 font-bold text-amber-400">{item.peakActiveEnvelope} µV</td>
                      <td className="px-4 py-3 text-slate-300">{item.averageActiveEnvelope}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                          {item.activityGradeText || 'Grade not reported'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-slate-400">{item.sessionPattern}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        </>}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-800/80 bg-[#090E17] px-6 py-4 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 mt-auto">
        <p>© 2026 Debuggers Squad Innovations LLP • NeuroPulseAI Biomedical Research</p>
        <p className="flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5 text-cyan-400" /> HIPAA-Compliant De-Identified Telemetry
        </p>
      </footer>
    </div>
  );
}
