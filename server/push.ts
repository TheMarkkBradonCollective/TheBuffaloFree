import { supabaseAdmin } from './auth';
import { configureVapidAsync, getVapidPublicKey, getWebPushModuleAsync, isVapidConfigured } from '../api/push/_server/webPushLoader';
import { isFcmConfigured, isFcmSubscription, sendFcmToSubscription } from '../api/push/_server/fcmDelivery';
import { filterSubscriptionsForPickupPush } from '../api/push/_server/pickupPushEvents';
import { isStaffModePushEvent, receivesStaffModeNotifications } from '../shared/staffInteractionMode';

export type PushEventType =
  | 'new_item'
  | 'new_request'
  | 'item_claimed'
  | 'item_gifted'
  | 'pickup_scheduled'
  | 'pickup_reminder'
  | 'new_message'
  | 'community_chat'
  | 'staff_chat'
  | 'message_request'
  | 'message_request_accepted'
  | 'new_comment'
  | 'listing_upvote'
  | 'listing_downvote'
  | 'listing_approved'
  | 'listing_denied'
  | 'listing_expiring'
  | 'listing_expired'
  | 'nearby_item'
  | 'nearby_request'
  | 'claim_request'
  | 'request_fulfilled'
  | 'announcement'
  | 'app_update'
  | 'account_update'
  | 'support_reply'
  | 'staff_support'
  | 'staff_report'
  | 'director_alert'
  | 'saved_item_update'
  | 'listing_status';

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag?: string;
  eventType: PushEventType;
  data?: Record<string, string>;
}

export interface NotificationPreferencesRow {
  userId: string;
  enabled: boolean;
  messages: boolean;
  messageRequests: boolean;
  communityChat: boolean;
  staffChat: boolean;
  support: boolean;
  claims: boolean;
  gifts: boolean;
  comments: boolean;
  listingUpvotes: boolean;
  listingDownvotes: boolean;
  listingStatus: boolean;
  nearbyListings: boolean;
  requests: boolean;
  appUpdates: boolean;
  announcements: boolean;
  pickupReminders: boolean;
  newListings: boolean;
  savedItems: boolean;
  accountUpdates: boolean;
  staffSupport: boolean;
  staffReports: boolean;
  directorAlerts: boolean;
  directorJoins: boolean;
  directorLeaves: boolean;
  directorModeration: boolean;
  directorReports: boolean;
  directorTickets: boolean;
  directorListings: boolean;
  directorMessageRequests: boolean;
  directorClaimRequests: boolean;
  nearbyRadiusMiles: number;
  followedCategories: string[];
}

const DIRECTOR_CATEGORY_PREF_MAP: Record<string, keyof NotificationPreferencesRow> = {
  join: 'directorJoins',
  leave: 'directorLeaves',
  moderation: 'directorModeration',
  report: 'directorReports',
  ticket: 'directorTickets',
  listing: 'directorListings',
  message_request: 'directorMessageRequests',
  claim_request: 'directorClaimRequests',
};

interface PushSubscriptionRow {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

const EVENT_PREF_MAP: Record<PushEventType, keyof NotificationPreferencesRow | 'enabled'> = {
  new_item: 'newListings',
  new_request: 'requests',
  item_claimed: 'claims',
  item_gifted: 'gifts',
  pickup_scheduled: 'pickupReminders',
  pickup_reminder: 'pickupReminders',
  new_message: 'messages',
  community_chat: 'communityChat',
  staff_chat: 'staffChat',
  message_request: 'messageRequests',
  message_request_accepted: 'messageRequests',
  new_comment: 'comments',
  listing_upvote: 'listingUpvotes',
  listing_downvote: 'listingDownvotes',
  listing_approved: 'listingStatus',
  listing_denied: 'listingStatus',
  listing_expiring: 'listingStatus',
  listing_expired: 'listingStatus',
  listing_status: 'listingStatus',
  nearby_item: 'nearbyListings',
  nearby_request: 'requests',
  claim_request: 'requests',
  request_fulfilled: 'requests',
  announcement: 'announcements',
  app_update: 'appUpdates',
  account_update: 'accountUpdates',
  support_reply: 'support',
  staff_support: 'staffSupport',
  staff_report: 'staffReports',
  director_alert: 'directorAlerts',
  saved_item_update: 'savedItems',
};

export function configureVapid(): void {
  void configureVapidAsync().then((ok) => {
    if (!ok) {
      console.warn('[push] VAPID keys not configured — push delivery disabled');
    }
  });
}

export { getVapidPublicKey, isVapidConfigured };

function normalizePrefs(row: Record<string, unknown>): NotificationPreferencesRow {
  return {
    userId: String(row.userId),
    enabled: row.enabled !== false,
    messages: row.messages !== false,
    messageRequests: row.messageRequests !== false,
    communityChat: row.communityChat !== false,
    staffChat: row.staffChat !== false,
    support: row.support !== false,
    claims: row.claims !== false,
    gifts: row.gifts !== false,
    comments: row.comments !== false,
    listingUpvotes: row.listingUpvotes !== false,
    listingDownvotes: row.listingDownvotes !== false,
    listingStatus: row.listingStatus !== false,
    nearbyListings: row.nearbyListings !== false,
    requests: row.requests !== false,
    appUpdates: row.appUpdates !== false,
    announcements: row.announcements !== false,
    pickupReminders: row.pickupReminders !== false,
    newListings: row.newListings !== false,
    savedItems: row.savedItems !== false,
    accountUpdates: row.accountUpdates !== false,
    staffSupport: row.staffSupport !== false,
    staffReports: row.staffReports !== false,
    directorAlerts: row.directorAlerts !== false,
    directorJoins: row.directorJoins !== false,
    directorLeaves: row.directorLeaves !== false,
    directorModeration: row.directorModeration !== false,
    directorReports: row.directorReports !== false,
    directorTickets: row.directorTickets !== false,
    directorListings: row.directorListings !== false,
    directorMessageRequests: row.directorMessageRequests !== false,
    directorClaimRequests: row.directorClaimRequests !== false,
    nearbyRadiusMiles: Number(row.nearbyRadiusMiles ?? 10),
    followedCategories: Array.isArray(row.followedCategories) ? (row.followedCategories as string[]) : [],
  };
}

export function userAllowsEvent(prefs: NotificationPreferencesRow, eventType: PushEventType): boolean {
  if (!prefs.enabled) return false;
  const key = EVENT_PREF_MAP[eventType];
  if (key === 'enabled') return prefs.enabled;
  if (!key) return true;
  return prefs[key] !== false;
}

export function userAllowsDirectorAlert(prefs: NotificationPreferencesRow, category?: string): boolean {
  if (!prefs.enabled || prefs.directorAlerts === false) return false;
  if (!category) return true;

  const key = DIRECTOR_CATEGORY_PREF_MAP[category];
  if (!key) return true;
  return prefs[key] !== false;
}

export async function getStaffInteractionModesForUsers(userIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!userIds.length) return map;

  const { data } = await supabaseAdmin
    .from('users')
    .select('uid, staffInteractionMode, staff_interaction_mode')
    .in('uid', userIds);

  for (const row of data || []) {
    const uid = String((row as { uid: string }).uid);
    const mode =
      (row as { staffInteractionMode?: string; staff_interaction_mode?: string }).staffInteractionMode ??
      (row as { staff_interaction_mode?: string }).staff_interaction_mode;
    map.set(uid, mode === 'neighbor' ? 'neighbor' : 'staff');
  }

  return map;
}

export async function getPreferencesForUsers(userIds: string[]): Promise<Map<string, NotificationPreferencesRow>> {
  const map = new Map<string, NotificationPreferencesRow>();
  if (!userIds.length) return map;

  const { data } = await supabaseAdmin.from('notification_preferences').select('*').in('userId', userIds);
  for (const row of data || []) {
    map.set(String((row as Record<string, unknown>).userId), normalizePrefs(row as Record<string, unknown>));
  }

  for (const uid of userIds) {
    if (!map.has(uid)) {
      map.set(uid, {
        userId: uid,
        enabled: true,
        messages: true,
        messageRequests: true,
        communityChat: true,
        staffChat: true,
        support: true,
        claims: true,
        gifts: true,
        comments: true,
        listingUpvotes: true,
        listingDownvotes: true,
        listingStatus: true,
        nearbyListings: true,
        requests: true,
        appUpdates: true,
        announcements: true,
        pickupReminders: true,
        newListings: true,
        savedItems: true,
        accountUpdates: true,
        staffSupport: true,
        staffReports: true,
        directorAlerts: true,
        directorJoins: true,
        directorLeaves: true,
        directorModeration: true,
        directorReports: true,
        directorTickets: true,
        directorListings: true,
        directorMessageRequests: true,
        directorClaimRequests: true,
        nearbyRadiusMiles: 10,
        followedCategories: [],
      });
    }
  }

  return map;
}

export async function getSubscriptionsForUsers(userIds: string[]): Promise<PushSubscriptionRow[]> {
  if (!userIds.length) return [];
  const { data, error } = await supabaseAdmin.from('push_subscriptions').select('*').in('userId', userIds);
  if (error) {
    console.error('[push] subscription query failed:', error.message);
    return [];
  }
  return (data || []) as PushSubscriptionRow[];
}

async function removeInvalidSubscription(endpoint: string) {
  await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', endpoint);
}

const HIGH_URGENCY_EVENTS = new Set<PushEventType>([
  'director_alert',
  'staff_support',
  'staff_report',
  'support_reply',
  'new_message',
  'community_chat',
  'staff_chat',
  'message_request',
  'message_request_accepted',
  'item_claimed',
  'claim_request',
  'account_update',
]);

function webPushOptionsFor(eventType: PushEventType): { TTL: number; urgency: 'high' | 'normal' } {
  return {
    TTL: 60 * 60 * 24,
    urgency: HIGH_URGENCY_EVENTS.has(eventType) ? 'high' : 'normal',
  };
}

function buildNotificationPayload(payload: PushPayload): string {
  const body = String(payload.body || '').trim() || String(payload.title || '').trim() || 'New activity';
  return JSON.stringify({
    title: payload.title || 'Buffalo Buy Nothing',
    body,
    url: payload.url,
    icon: '/notification-icon.png',
    badge: '/notification-icon.png',
    tag: payload.tag || payload.eventType,
    eventType: payload.eventType,
    data: payload.data || {},
  });
}

function shouldRemoveSubscription(err: unknown): boolean {
  const status = (err as { statusCode?: number }).statusCode;
  if (status === 404 || status === 410) return true;
  if (status === 401 || status === 403) {
    const message = String((err as { body?: string }).body || (err as Error).message || '').toLowerCase();
    return message.includes('vapid') || message.includes('credentials') || message.includes('unauthorized');
  }
  return false;
}

export async function sendToSubscription(subscription: PushSubscriptionRow, payload: PushPayload) {
  if (isFcmSubscription(subscription.endpoint)) {
    const result = await sendFcmToSubscription(subscription.endpoint, payload);
    if (result.removed) await removeInvalidSubscription(subscription.endpoint);
    return result;
  }

  if (!(await configureVapidAsync())) return { ok: false as const, removed: false };

  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: { p256dh: subscription.p256dh, auth: subscription.auth },
  };

  const notification = buildNotificationPayload(payload);

  try {
    const webpush = await getWebPushModuleAsync();
    await webpush.sendNotification(pushSubscription, notification, webPushOptionsFor(payload.eventType));
    return { ok: true as const, removed: false };
  } catch (err: unknown) {
    if (shouldRemoveSubscription(err)) {
      await removeInvalidSubscription(subscription.endpoint);
      return { ok: false as const, removed: true };
    }
    const status = (err as { statusCode?: number }).statusCode;
    console.error('[push] send failed:', status, (err as Error).message);
    return { ok: false as const, removed: false };
  }
}

export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload,
  options?: { excludeUserIds?: string[]; skipPreferenceCheck?: boolean },
) {
  const exclude = new Set(options?.excludeUserIds || []);
  const targets = [...new Set(userIds)].filter((id) => id && !exclude.has(id));
  if (!targets.length || (!(await configureVapidAsync()) && !isFcmConfigured())) {
    return { sent: 0, failed: 0, removed: 0, skipped: targets.length, subscriptionCount: 0 };
  }

  let allowed = targets;
  if (!options?.skipPreferenceCheck) {
    const prefsMap = await getPreferencesForUsers(targets);
    allowed = targets.filter((uid) => {
      const prefs = prefsMap.get(uid);
      if (!prefs) return true;
      if (payload.eventType === 'director_alert') {
        return userAllowsDirectorAlert(prefs, payload.data?.directorCategory);
      }
      return userAllowsEvent(prefs, payload.eventType);
    });
  }

  if (isStaffModePushEvent(payload.eventType)) {
    const modeMap = await getStaffInteractionModesForUsers(allowed);
    allowed = allowed.filter((uid) => receivesStaffModeNotifications(modeMap.get(uid)));
  }

  const subscriptions = filterSubscriptionsForPickupPush(
    await getSubscriptionsForUsers(allowed),
    payload.eventType,
  );
  let sent = 0;
  let failed = 0;
  let removed = 0;

  await Promise.all(
    subscriptions.map(async (sub) => {
      const result = await sendToSubscription(sub, payload);
      if (result.ok) sent += 1;
      else {
        failed += 1;
        if (result.removed) removed += 1;
      }
    }),
  );

  return {
    sent,
    failed,
    removed,
    skipped: options?.skipPreferenceCheck ? 0 : targets.length - allowed.length,
    subscriptionCount: subscriptions.length,
  };
}

/** Haversine distance in miles between two lat/lng points. */
export function distanceMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 3958.8;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const NEIGHBORHOOD_COORDS: Record<string, { lat: number; lng: number }> = {
  Allentown: { lat: 42.904, lng: -78.876 },
  'Black Rock': { lat: 42.946, lng: -78.906 },
  'Broadway-Fillmore': { lat: 42.878, lng: -78.822 },
  'Central Park': { lat: 42.912, lng: -78.838 },
  'Delaware District': { lat: 42.932, lng: -78.863 },
  'Downtown Buffalo': { lat: 42.886, lng: -78.878 },
  'Elmwood Village': { lat: 42.917, lng: -78.877 },
  'First Ward': { lat: 42.863, lng: -78.869 },
  'Grant-Ferry': { lat: 42.909, lng: -78.889 },
  'Hamlin Park': { lat: 42.896, lng: -78.822 },
  'Hertel / North Buffalo': { lat: 42.947, lng: -78.874 },
  Kaisertown: { lat: 42.859, lng: -78.817 },
  Kenmore: { lat: 42.966, lng: -78.87 },
  'Lower West Side': { lat: 42.894, lng: -78.896 },
  'Masten Park': { lat: 42.901, lng: -78.842 },
  'North Buffalo': { lat: 42.945, lng: -78.875 },
  'North Park': { lat: 42.948, lng: -78.858 },
  Riverside: { lat: 42.935, lng: -78.908 },
  'South Buffalo': { lat: 42.845, lng: -78.825 },
  'University Heights': { lat: 42.964, lng: -78.828 },
  'Upper West Side': { lat: 42.905, lng: -78.896 },
  'West Side': { lat: 42.896, lng: -78.894 },
  Cheektowaga: { lat: 42.903, lng: -78.754 },
  Amherst: { lat: 42.978, lng: -78.8 },
  Tonawanda: { lat: 42.989, lng: -78.88 },
  Williamsville: { lat: 42.964, lng: -78.738 },
  Lackawanna: { lat: 42.826, lng: -78.824 },
  'West Seneca': { lat: 42.85, lng: -78.75 },
  'Orchard Park': { lat: 42.767, lng: -78.744 },
  Hamburg: { lat: 42.715, lng: -78.829 },
  Depew: { lat: 42.904, lng: -78.692 },
  Lancaster: { lat: 42.9, lng: -78.67 },
  'East Aurora': { lat: 42.767, lng: -78.613 },
  'Grand Island': { lat: 43.017, lng: -78.963 },
};

export function coordsForNeighborhood(name: string): { lat: number; lng: number } | null {
  return NEIGHBORHOOD_COORDS[name] || null;
}

export function withinRadius(
  viewerNeighborhood: string,
  itemNeighborhood: string,
  itemLatLng: { lat: number; lng: number } | null,
  radiusMiles: number,
): boolean {
  if (radiusMiles === 0) {
    return viewerNeighborhood === itemNeighborhood;
  }

  const viewerCoords = coordsForNeighborhood(viewerNeighborhood);
  const itemCoords = itemLatLng || coordsForNeighborhood(itemNeighborhood);
  if (!viewerCoords || !itemCoords) {
    return viewerNeighborhood === itemNeighborhood;
  }

  return distanceMiles(viewerCoords, itemCoords) <= radiusMiles;
}
