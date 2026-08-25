import { isStaffModePushEvent, receivesStaffModeNotifications } from '../../../shared/staffInteractionMode';
import { getSupabaseAdmin } from './supabaseAdmin';
import { isFcmConfigured, isFcmSubscription, sendFcmToSubscription } from './fcmDelivery';
import { filterSubscriptionsForPickupPush } from './pickupPushEvents';
import { configureVapidAsync, getWebPushModuleAsync } from './webPushLoader';

export type PushEventType =
  | 'new_item'
  | 'new_request'
  | 'item_claimed'
  | 'item_gifted'
  | 'pickup_scheduled'
  | 'pickup_reminder'
  | 'on_the_way'
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
  | 'listing_status'
  | 'go_get_availability_request'
  | 'go_get_available_now'
  | 'go_get_schedule_proposed'
  | 'go_get_schedule_confirmed'
  | 'go_get_ready_reminder'
  | 'go_get_fulfiller_ready'
  | 'go_get_started'
  | 'go_get_arrived'
  | 'go_get_completed'
  | 'go_get_cancelled'
  | 'contactless_pickup_arrived'
  | 'contactless_pickup_left'
  | 'feed_comment'
  | 'feed_reaction'
  | 'feed_upvote'
  | 'feed_downvote'
  | 'feed_post'
  | 'feed_reply'
  | 'friend_request'
  | 'friend_request_accepted'
  | 'award_unlocked'
  | 'event_rsvp'
  | 'event_comment'
  | 'announcement_comment'
  | 'update_comment'
  | 'violation_filed'
  | 'violation_decision'
  | 'account_locked'
  | 'appeal_decision';

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
  feedPosts: boolean;
  feedComments: boolean;
  feedReactions: boolean;
  feedUpvotes: boolean;
  feedDownvotes: boolean;
  listingComments: boolean;
  goGetAlerts: boolean;
  pickupCoordination: boolean;
  listingModeration: boolean;
  listingExpiry: boolean;
  violations: boolean;
  claimRequests: boolean;
  nearbyRequests: boolean;
  requestFulfilled: boolean;
  neighborRequests: boolean;
  feedReplies: boolean;
  friendRequests: boolean;
  awards: boolean;
  eventRsvps: boolean;
  eventComments: boolean;
  discussionComments: boolean;
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
  new_request: 'neighborRequests',
  item_claimed: 'claims',
  item_gifted: 'gifts',
  pickup_scheduled: 'pickupCoordination',
  pickup_reminder: 'pickupCoordination',
  on_the_way: 'pickupCoordination',
  new_message: 'messages',
  community_chat: 'communityChat',
  staff_chat: 'staffChat',
  message_request: 'messageRequests',
  message_request_accepted: 'messageRequests',
  new_comment: 'listingComments',
  listing_upvote: 'listingUpvotes',
  listing_downvote: 'listingDownvotes',
  listing_approved: 'listingModeration',
  listing_denied: 'listingModeration',
  listing_expiring: 'listingExpiry',
  listing_expired: 'listingExpiry',
  listing_status: 'listingExpiry',
  nearby_item: 'nearbyListings',
  nearby_request: 'nearbyRequests',
  claim_request: 'claimRequests',
  request_fulfilled: 'requestFulfilled',
  announcement: 'announcements',
  app_update: 'appUpdates',
  account_update: 'accountUpdates',
  support_reply: 'support',
  staff_support: 'staffSupport',
  staff_report: 'staffReports',
  director_alert: 'directorAlerts',
  saved_item_update: 'savedItems',
  go_get_availability_request: 'goGetAlerts',
  go_get_available_now: 'goGetAlerts',
  go_get_schedule_proposed: 'goGetAlerts',
  go_get_schedule_confirmed: 'goGetAlerts',
  go_get_ready_reminder: 'goGetAlerts',
  go_get_fulfiller_ready: 'goGetAlerts',
  go_get_started: 'goGetAlerts',
  go_get_arrived: 'goGetAlerts',
  go_get_completed: 'goGetAlerts',
  go_get_cancelled: 'goGetAlerts',
  contactless_pickup_arrived: 'pickupCoordination',
  contactless_pickup_left: 'pickupCoordination',
  feed_comment: 'feedComments',
  feed_reaction: 'feedReactions',
  feed_upvote: 'feedUpvotes',
  feed_downvote: 'feedDownvotes',
  feed_post: 'feedPosts',
  feed_reply: 'feedReplies',
  friend_request: 'friendRequests',
  friend_request_accepted: 'friendRequests',
  award_unlocked: 'awards',
  event_rsvp: 'eventRsvps',
  event_comment: 'eventComments',
  announcement_comment: 'discussionComments',
  update_comment: 'discussionComments',
  violation_filed: 'violations',
  violation_decision: 'violations',
  account_locked: 'violations',
  appeal_decision: 'violations',
};

const LEGACY_PREF_FALLBACK: Partial<Record<keyof NotificationPreferencesRow, keyof NotificationPreferencesRow>> = {
  feedPosts: 'newListings',
  feedComments: 'comments',
  feedReactions: 'comments',
  feedUpvotes: 'listingUpvotes',
  feedDownvotes: 'listingDownvotes',
  listingComments: 'comments',
  goGetAlerts: 'pickupReminders',
  pickupCoordination: 'pickupReminders',
  listingModeration: 'listingStatus',
  listingExpiry: 'listingStatus',
  violations: 'accountUpdates',
  claimRequests: 'requests',
  nearbyRequests: 'requests',
  requestFulfilled: 'requests',
  neighborRequests: 'requests',
  feedReplies: 'feedComments',
  friendRequests: 'messages',
  awards: 'enabled',
  eventRsvps: 'comments',
  eventComments: 'comments',
  discussionComments: 'announcements',
};

function prefAllows(prefs: NotificationPreferencesRow, key: keyof NotificationPreferencesRow): boolean {
  const row = prefs as unknown as Record<string, unknown>;
  if (row[key] !== undefined && row[key] !== null) {
    return row[key] !== false;
  }
  const fallback = LEGACY_PREF_FALLBACK[key];
  if (fallback) return prefs[fallback] !== false;
  return prefs[key] !== false;
}

function boolPref(row: Record<string, unknown>, key: string, fallbackKey?: string): boolean {
  if (row[key] !== undefined && row[key] !== null) return row[key] !== false;
  if (fallbackKey && row[fallbackKey] !== undefined) return row[fallbackKey] !== false;
  return true;
}

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
    feedPosts: boolPref(row, 'feedPosts', 'newListings'),
    feedComments: boolPref(row, 'feedComments', 'comments'),
    feedReactions: boolPref(row, 'feedReactions', 'comments'),
    feedUpvotes: boolPref(row, 'feedUpvotes', 'listingUpvotes'),
    feedDownvotes: boolPref(row, 'feedDownvotes', 'listingDownvotes'),
    listingComments: boolPref(row, 'listingComments', 'comments'),
    goGetAlerts: boolPref(row, 'goGetAlerts', 'pickupReminders'),
    pickupCoordination: boolPref(row, 'pickupCoordination', 'pickupReminders'),
    listingModeration: boolPref(row, 'listingModeration', 'listingStatus'),
    listingExpiry: boolPref(row, 'listingExpiry', 'listingStatus'),
    violations: boolPref(row, 'violations', 'accountUpdates'),
    claimRequests: boolPref(row, 'claimRequests', 'requests'),
    nearbyRequests: boolPref(row, 'nearbyRequests', 'requests'),
    requestFulfilled: boolPref(row, 'requestFulfilled', 'requests'),
    neighborRequests: boolPref(row, 'neighborRequests', 'requests'),
    feedReplies: boolPref(row, 'feedReplies', 'comments'),
    friendRequests: boolPref(row, 'friendRequests', 'messages'),
    awards: boolPref(row, 'awards'),
    eventRsvps: boolPref(row, 'eventRsvps', 'comments'),
    eventComments: boolPref(row, 'eventComments', 'comments'),
    discussionComments: boolPref(row, 'discussionComments', 'announcements'),
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
  return prefAllows(prefs, key);
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

  const supabaseAdmin = await getSupabaseAdmin();
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

  const supabaseAdmin = await getSupabaseAdmin();
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
        feedPosts: true,
        feedComments: true,
        feedReactions: true,
        feedUpvotes: true,
        feedDownvotes: true,
        listingComments: true,
        goGetAlerts: true,
        pickupCoordination: true,
        listingModeration: true,
        listingExpiry: true,
        violations: true,
        claimRequests: true,
        nearbyRequests: true,
        requestFulfilled: true,
        neighborRequests: true,
        feedReplies: true,
        friendRequests: true,
        awards: true,
        eventRsvps: true,
        eventComments: true,
        discussionComments: true,
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
  const supabaseAdmin = await getSupabaseAdmin();
  const { data, error } = await supabaseAdmin.from('push_subscriptions').select('*').in('userId', userIds);
  if (error) {
    console.error('[push] subscription query failed:', error.message);
    return [];
  }
  return (data || []) as PushSubscriptionRow[];
}

async function removeInvalidSubscription(endpoint: string) {
  const supabaseAdmin = await getSupabaseAdmin();
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
  'on_the_way',
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
    title: payload.title || 'BuffaloBuyNothing',
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

async function canDeliverPush(): Promise<boolean> {
  return (await configureVapidAsync()) || isFcmConfigured();
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
  options?: { excludeUserIds?: string[]; skipPreferenceCheck?: boolean; skipDedup?: boolean },
) {
  const exclude = new Set(options?.excludeUserIds || []);
  const targets = [...new Set(userIds)].filter((id) => id && !exclude.has(id));
  if (!targets.length || !(await canDeliverPush())) {
    return { sent: 0, failed: 0, removed: 0, skipped: targets.length, subscriptionCount: 0 };
  }

  const dedupTag = !options?.skipDedup ? payload.tag || payload.eventType : undefined;
  if (dedupTag) {
    const { claimPushDispatch } = await import('./pushDedup');
    const allowed = await claimPushDispatch(dedupTag);
    if (!allowed) {
      return { sent: 0, failed: 0, removed: 0, skipped: targets.length, subscriptionCount: 0, deduped: true };
    }
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

  const { logUserNotifications } = await import('./userNotificationLog');
  await logUserNotifications(allowed, payload);

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

  if (dedupTag && sent === 0) {
    const { releasePushDispatch } = await import('./pushDedup');
    await releasePushDispatch(dedupTag);
  }

  return {
    sent,
    failed,
    removed,
    skipped: options?.skipPreferenceCheck ? 0 : targets.length - allowed.length,
    subscriptionCount: subscriptions.length,
  };
}

function distanceMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
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

function coordsForNeighborhood(name: string): { lat: number; lng: number } | null {
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
