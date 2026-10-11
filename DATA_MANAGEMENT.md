# Data management setup

The dashboard filters the real reports returned by `/api/reports`. Categories include age group, gender, muscle, side, exercise mode, recorded condition, pattern, and signal quality. Numeric minimum/maximum filters cover active seconds, activation percentage, peak/average envelope, grade, and longest episode. Missing numeric values do not match numeric ranges. Condition reads `condition`, `sufferingCondition`, or `patientCondition`; absent values are displayed as Not recorded. The uploader must supply a condition field for condition-based analysis.

Cleaning flags identify missing fields, invalid numeric ranges, missing traces, and signals needing review. Flags are review aids; no report is automatically discarded or rewritten. Exclude/Restore affects the current browser view only. CSV exports contain only the matching, non-excluded records. Full IDs are retained for record selection.

## Enable permanent deletion

The existing AWS API only provides GET/POST and does not support deletion. A new server-only Next.js route deletes selected records directly from DynamoDB using the AWS SDK. It is disabled until these server environment variables are configured in Vercel:

- `REPORTS_DELETE_ENABLED=true`
- `REPORTS_TABLE_NAME=NeuroPulseReports` (verify this is the table behind the reports API)
- `AWS_REGION=ap-south-1`
- `DASHBOARD_ADMIN_KEY`: a random secret of at least 32 characters, shared only with administrators. Never use a NEXT_PUBLIC variable.
- AWS credentials from the server credential provider chain, scoped to `dynamodb:DeleteItem` on the verified table only. For Vercel, configure an AWS role/credential integration or server-only AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY (and AWS_SESSION_TOKEN for temporary credentials). Do not put credentials in source control or client code.

Redeploy after configuring environment variables. Administrators enter the key in the deletion confirmation form; it is sent over HTTPS, held only in component memory, and cleared after each request/cancellation. Select 1–20 exact session IDs, inspect the list, and type DELETE. The backend authenticates every request, rejects cross-origin browser requests, validates IDs, and uses conditional DeleteItem. Successful and failed IDs are returned separately; partial failures remain selected for review. AWS errors never result in a false success count. No database writes are performed by filters or exclusions.

Deletion removes live table records. Existing backups, other storage, and downloaded exports are unaffected. This is a shared administrator key workflow, not individual user accounts or role-based audit logging. Use a full identity/role integration before distributing administrator access broadly.

Official API reference: https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_DeleteItem.html
