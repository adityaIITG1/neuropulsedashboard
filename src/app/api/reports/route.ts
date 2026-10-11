import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
const AWS_API_ENDPOINT = 'https://xac2f650s9.execute-api.ap-south-1.amazonaws.com/reports';
export async function GET() {
  try {
    const response = await fetch(AWS_API_ENDPOINT, { cache: 'no-store', signal: AbortSignal.timeout(15000) });
    if (!response.ok) return NextResponse.json({ success: false, reports: [], error: `Reports service returned HTTP ${response.status}. Please retry.` }, { status: 502 });
    const data = await response.json();
    if (!Array.isArray(data.reports) || !data.reports.every((report: unknown) => typeof report === 'object' && report !== null && 'SessionId' in report && typeof report.SessionId === 'string')) {
      return NextResponse.json({ success: false, reports: [], error: 'Reports service returned an invalid dataset. Please retry.' }, { status: 502 });
    }
    return NextResponse.json({ success: true, source: 'AWS_REPORTS_API', liveCount: data.reports.length, totalSessions: data.reports.length, reports: data.reports });
  } catch {
    return NextResponse.json({ success: false, reports: [], error: 'Unable to reach the reports service. Check the connection and retry.' }, { status: 503 });
  }
}
