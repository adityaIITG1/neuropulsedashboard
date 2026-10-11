export interface Session {
  SessionId: string;
  patientAge?: string;
  patientGender?: string;
  muscle?: string;
  side?: string;
  affectedSide?: string;
  exerciseMode?: string;
  condition?: string;
  sufferingCondition?: string;
  patientCondition?: string;
  activeTimeSec?: number;
  activePercent?: number;
  peakActiveEnvelope?: number;
  averageActiveEnvelope?: number;
  activityGrade?: number;
  longestEpisodeSec?: number;
  sessionPattern?: string;
  signalQuality?: string;
  graphValues?: unknown[];
}
export const categories = [
  ['ageGroup', 'Age group'], ['patientAge', 'Recorded age'], ['patientGender', 'Gender'], ['muscle', 'Target muscle'],
  ['side', 'Recording side'], ['affectedSide', 'Affected side'], ['exerciseMode', 'Exercise mode'], ['condition', 'Patient condition'],
  ['sessionPattern', 'Activation pattern'], ['signalQuality', 'Signal quality'],
] as const;
export const metrics = [
  ['activeTimeSec', 'Active duration (s)'], ['activePercent', 'Activation (%)'],
  ['peakActiveEnvelope', 'Peak envelope (µV)'], ['averageActiveEnvelope', 'Average envelope (µV)'],
  ['activityGrade', 'Clinical grade (0–5)'], ['longestEpisodeSec', 'Longest activity episode (s)'],
] as const;
export type SegmentFilters = Record<string, string>;
export function categoryValue(report: Session, key: string): string {
  if (key === 'ageGroup') {
    const age = parseInt(report.patientAge || '', 10);
    if (!Number.isFinite(age) || age < 0) return 'Not recorded';
    return age < 18 ? 'Under 18' : age <= 25 ? '18–25' : age <= 40 ? '26–40' : age <= 60 ? '41–60' : '61+';
  }
  if (key === 'condition') return report.condition || report.sufferingCondition || report.patientCondition || 'Not recorded';
  return String(report[key as keyof Session] || 'Not recorded');
}
export function reviewFlags(report: Session): string[] {
  const flags: string[] = [];
  if (!report.muscle) flags.push('Missing muscle');
  if (!report.patientAge) flags.push('Missing age');
  if (!report.patientGender) flags.push('Missing gender');
  if (!report.graphValues?.length) flags.push('No trace samples');
  if (report.signalQuality && !['GOOD', 'ACCEPTABLE'].includes(report.signalQuality.toUpperCase())) flags.push('Review signal quality');
  for (const [key, label] of metrics) {
    const value = report[key];
    if (value === undefined || value === null) flags.push(`Missing ${label}`);
    else if (!Number.isFinite(value) || value < 0 || (key === 'activePercent' && value > 100) || (key === 'activityGrade' && value > 5)) flags.push(`Invalid ${label}`);
  }
  return flags;
}
export function matchesSegment(report: Session, filters: SegmentFilters): boolean {
  if (filters.id && !report.SessionId.toLowerCase().includes(filters.id.toLowerCase())) return false;
  for (const [key] of categories) if (filters[key] && categoryValue(report, key) !== filters[key]) return false;
  for (const [key] of metrics) {
    for (const bound of ['min', 'max']) {
      const input = filters[`${key}_${bound}`];
      if (!input) continue;
      const value = report[key];
      if (!Number.isFinite(value) || (bound === 'min' ? value! < Number(input) : value! > Number(input))) return false;
    }
  }
  return !filters.review || reviewFlags(report).length > 0;
}
