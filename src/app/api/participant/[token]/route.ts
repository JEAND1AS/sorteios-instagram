import { body, failure, json, limit } from '@/lib/http';
import { personal, personalAction } from '@/lib/service';
export const runtime = 'nodejs';
export const maxDuration = 60;
type Context = { params: Promise<{ token: string }> };
export async function GET(_: Request, { params }: Context) {
  try {
    return json(await personal((await params).token));
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request, { params }: Context) {
  try {
    const input = await body(request);
    await limit(request, 'participant', 150);
    return json(await personalAction((await params).token, input));
  } catch (e) {
    return failure(e);
  }
}
