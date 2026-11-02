import { body, failure, json, limit } from '@/lib/http';
import { createEvent } from '@/lib/service';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    const input = await body(request);
    await limit(request, 'create', 10);
    return json(await createEvent(input), 201);
  } catch (e) {
    return failure(e);
  }
}
