import { failure, json } from '@/lib/http';
import { toggleMaintenanceEvent } from '@/lib/maintenance';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`)
    return json({ error: 'Não autorizado.' }, 401);

  try {
    return json(await toggleMaintenanceEvent());
  } catch (error) {
    return failure(error);
  }
}
