import { body, failure, json, limit } from '@/lib/http';
import { getInvite, join, identify } from '@/lib/service';
import { hash } from '@/lib/security';
export const runtime = 'nodejs';
export const maxDuration = 60;
type Context = { params: Promise<{ slug: string }> };
export async function GET(_: Request, { params }: Context) {
  try {
    return json(await getInvite((await params).slug));
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request, { params }: Context) {
  try {
    const input = await body(request);
    if (input.action === 'identify') {
      const slug = (await params).slug;
      await limit(request, 'identify:' + slug, 40);
      if (input.method === 'code') await limit(request, 'code-access:' + slug, 8);
      else
        await limit(request, 'identity:' + slug + ':' + hash(String(input.email).toLowerCase()), 8);
      return json(await identify(slug, input));
    }
    await limit(request, 'join', 40);
    return json(await join((await params).slug, input), 201);
  } catch (e) {
    return failure(e);
  }
}
