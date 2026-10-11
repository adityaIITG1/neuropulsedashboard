import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { DynamoDBClient, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  const secret = process.env.DASHBOARD_ADMIN_KEY;
  const table = process.env.REPORTS_TABLE_NAME;
  if (!secret || secret.length < 32 || !table || process.env.REPORTS_DELETE_ENABLED !== 'true') {
    return NextResponse.json({error:'Permanent deletion is not configured. An administrator must enable the AWS deletion service.'}, {status:503});
  }
  const expected = Buffer.from(`Bearer ${secret}`);
  const provided = Buffer.from(request.headers.get('authorization') || '');
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    return NextResponse.json({error:'Administrator authentication failed.'}, {status:401});
  }
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({error:'Cross-origin deletion is not allowed.'}, {status:403});
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({error:'Invalid request.'}, {status:400}); }
  if (!body || body.confirmation !== 'DELETE' || !Array.isArray(body.sessionIds) || body.sessionIds.length < 1 || body.sessionIds.length > 20 || !body.sessionIds.every((id: unknown) => typeof id === 'string' && id.length > 0 && id.length <= 512) || new Set(body.sessionIds).size !== body.sessionIds.length) {
    return NextResponse.json({error:'Select 1–20 unique session IDs and confirm with DELETE.'}, {status:400});
  }
  const client = new DynamoDBClient({region: process.env.AWS_REGION || 'ap-south-1', maxAttempts:2});
  const deleted: string[] = [], failed: string[] = [];
  try {
    for (const id of body.sessionIds as string[]) {
      try {
        await client.send(new DeleteItemCommand({TableName:table, Key:{SessionId:{S:id}}, ConditionExpression:'attribute_exists(#id)', ExpressionAttributeNames:{'#id':'SessionId'}}), {abortSignal:AbortSignal.timeout(5000)});
        deleted.push(id);
      } catch { failed.push(id); }
    }
  } finally { client.destroy(); }
  return NextResponse.json({deleted, failed});
}
