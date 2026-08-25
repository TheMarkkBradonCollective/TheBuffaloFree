import { runPushSend } from './runPushSend';

export async function runAnnouncementNotify(
  callerId: string,
  update: { id: string; title: string; body: string },
): Promise<{ status: number; body: Record<string, unknown> }> {
  const updateId = String(update.id || '');
  if (!updateId) {
    return { status: 200, body: { ok: true, skipped: 'missing update id' } };
  }

  const title = String(update.title || 'Community announcement').trim() || 'Community announcement';
  const bodyText = String(update.body || '').trim();
  const body = bodyText ? `${title}: ${bodyText}`.slice(0, 180) : title;

  return runPushSend(callerId, {
    eventType: 'announcement',
    title: 'New announcement',
    body,
    url: '/help/announcements',
    tag: `announcement-${updateId}`,
  });
}
