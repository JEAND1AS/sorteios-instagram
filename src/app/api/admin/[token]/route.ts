import { body, failure, json, limit } from '@/lib/http';
import { getAdmin, adminAction } from '@/lib/service';
export const runtime = 'nodejs';
export const maxDuration = 60;
type Context = { params: Promise<{ token: string }> };
export async function GET(_: Request, { params }: Context) {
  try {
    return json(await getAdmin((await params).token));
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request, { params }: Context) {
  try {
    const input = await body(request);
    await limit(request, 'admin', 150);
    return json(await adminAction((await params).token, input));
  } catch (e) {
    return failure(e);
  }
}
