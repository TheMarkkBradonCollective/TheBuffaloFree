/**
 * Fictional Go Get pickup coordination fixtures for Play Store screenshots.
 * Buffalo landmarks only — never live member locations.
 */
import type { GoGetFulfillerLiveLocation, GoGetLiveLocation, GoGetSession, UserProfile } from '../types';
import { isGoGetTripLocked } from '../lib/goGetTripLock';
import { PLAY_STORE_DEMO_ITEMS, PLAY_STORE_DEMO_PROFILE, isPlayStoreDemo } from './playStoreDemo';

export const DEMO_GOGET_SESSION_ID = 'demo-goget-chair';

/** Major Buffalo locations used in mock pickup flows. */
export const BUFFALO_LOCATIONS = {
  cityHall: { lat: 42.8866, lng: -78.8784, label: 'Buffalo City Hall' },
  elmwood: { lat: 42.917, lng: -78.877, label: 'Elmwood Village' },
  canalSide: { lat: 42.877, lng: -78.879, label: 'Canalside' },
  silo: { lat: 42.875, lng: -78.877, label: 'Silo City' },
  delaware: { lat: 42.932, lng: -78.863, label: 'Delaware District' },
  allentown: { lat: 42.904, lng: -78.876, label: 'Allentown' },
  westSide: { lat: 42.896, lng: -78.894, label: 'West Side' },
  downtown: { lat: 42.886, lng: -78.878, label: 'Downtown Buffalo' },
} as const;

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function minutesFromNow(minutes: number): string {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

function avatar(seed: string): string {
  return `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(seed)}`;
}

export const DEMO_GOGET_AVERY_PROFILE: UserProfile = {
  uid: 'demo-neighbor-avery',
  displayName: 'Nia Brooks',
  email: 'nia.brooks.demo@example.com',
  neighborhood: 'Allentown',
  bio: 'Allentown neighbor — porch pickups welcome.',
  photoURL: avatar('Nia Brooks'),
  role: 'user',
  accountStatus: 'active',
  goGetEnabled: true,
  createdAt: hoursAgo(24 * 60),
  lastActiveAt: hoursAgo(0.5),
};

export const DEMO_GOGET_JORDAN_PROFILE: UserProfile = {
  uid: 'demo-neighbor-jordan',
  displayName: 'Theo Walsh',
  email: 'theo.walsh.demo@example.com',
  neighborhood: 'Hertel / North Buffalo',
  photoURL: avatar('Theo Walsh'),
  role: 'user',
  accountStatus: 'active',
  goGetEnabled: true,
  createdAt: hoursAgo(24 * 45),
  lastActiveAt: hoursAgo(1),
};

export const DEMO_GOGET_RILEY_PROFILE: UserProfile = {
  uid: 'demo-neighbor-riley',
  displayName: 'Devon Ruiz',
  email: 'devon.ruiz.demo@example.com',
  neighborhood: 'Delaware District',
  photoURL: avatar('Devon Ruiz'),
  role: 'user',
  accountStatus: 'active',
  goGetEnabled: true,
  createdAt: hoursAgo(24 * 35),
  lastActiveAt: hoursAgo(2),
};

const DEMO_PROFILES: Record<string, UserProfile> = {
  [PLAY_STORE_DEMO_PROFILE.uid]: PLAY_STORE_DEMO_PROFILE,
  [DEMO_GOGET_AVERY_PROFILE.uid]: DEMO_GOGET_AVERY_PROFILE,
  [DEMO_GOGET_JORDAN_PROFILE.uid]: DEMO_GOGET_JORDAN_PROFILE,
  [DEMO_GOGET_RILEY_PROFILE.uid]: DEMO_GOGET_RILEY_PROFILE,
};

export function getPlayStoreDemoProfile(uid: string): UserProfile | null {
  return DEMO_PROFILES[uid] ?? null;
}

export function getPlayStoreDemoItemById(itemId: string) {
  return PLAY_STORE_DEMO_ITEMS.find((item) => item.id === itemId) ?? null;
}

function baseChairSession(overrides: Partial<GoGetSession>): GoGetSession {
  return {
    id: DEMO_GOGET_SESSION_ID,
    itemId: 'demo-item-chair',
    itemType: 'giveaway',
    fulfillerUserId: DEMO_GOGET_AVERY_PROFILE.uid,
    fulfillerName: DEMO_GOGET_AVERY_PROFILE.displayName,
    requesterUserId: PLAY_STORE_DEMO_PROFILE.uid,
    requesterName: PLAY_STORE_DEMO_PROFILE.displayName,
    chatId: 'demo-chat-chair',
    handshakeMode: 'availability',
    status: 'awaiting_availability',
    destinationLat: BUFFALO_LOCATIONS.allentown.lat,
    destinationLng: BUFFALO_LOCATIONS.allentown.lng,
    destinationLabel: `${BUFFALO_LOCATIONS.allentown.label} porch`,
    ringExpiresAt: minutesFromNow(2),
    ringDurationSeconds: 140,
    fulfillerSharingLocation: false,
    createdAt: hoursAgo(0.05),
    updatedAt: hoursAgo(0.05),
    ...overrides,
  };
}

export const DEMO_GOGET_RING_SESSION = baseChairSession({
  status: 'awaiting_availability',
});

export const DEMO_GOGET_WAITING_SESSION = baseChairSession({
  status: 'awaiting_availability',
});

export const DEMO_GOGET_ACTIVE_SESSION = baseChairSession({
  status: 'active',
  ringExpiresAt: null,
  startedAt: hoursAgo(0.08),
  fulfillerSharingLocation: true,
});

export const DEMO_GOGET_ARRIVED_SESSION = baseChairSession({
  status: 'arrived',
  ringExpiresAt: null,
  startedAt: hoursAgo(0.15),
  arrivedAt: hoursAgo(0.02),
  fulfillerSharingLocation: true,
});

export const DEMO_GOGET_LIVE_LOCATION: GoGetLiveLocation = {
  sessionId: DEMO_GOGET_SESSION_ID,
  lat: 42.892,
  lng: -78.872,
  heading: 72,
  speedMph: 18,
  etaSeconds: 6 * 60 + 20,
  distanceMeters: 2100,
  updatedAt: new Date().toISOString(),
};

export const DEMO_GOGET_FULFILLER_LIVE_LOCATION: GoGetFulfillerLiveLocation = {
  sessionId: DEMO_GOGET_SESSION_ID,
  lat: BUFFALO_LOCATIONS.allentown.lat + 0.0008,
  lng: BUFFALO_LOCATIONS.allentown.lng + 0.0012,
  heading: 210,
  updatedAt: new Date().toISOString(),
};

export function parsePlayStoreGoGetScene(): string | null {
  if (typeof window === 'undefined' || !isPlayStoreDemo()) return null;
  const scene = new URLSearchParams(window.location.search).get('scene');
  return scene?.startsWith('goget-') ? scene : null;
}

export function getPlayStoreDemoGoGetSession(sessionId: string): GoGetSession | null {
  if (sessionId !== DEMO_GOGET_SESSION_ID) return null;
  const scene = parsePlayStoreGoGetScene();
  if (scene === 'goget-ring' || scene === 'goget-waiting') return DEMO_GOGET_RING_SESSION;
  if (scene === 'goget-navigation' || scene === 'goget-meeting') return DEMO_GOGET_ACTIVE_SESSION;
  if (scene === 'goget-tracking') return DEMO_GOGET_ACTIVE_SESSION;
  if (scene === 'goget-arrived') return DEMO_GOGET_ARRIVED_SESSION;
  return DEMO_GOGET_RING_SESSION;
}

export function getPlayStoreDemoActiveGoGetSession(itemId: string, userId: string): GoGetSession | null {
  const scene = parsePlayStoreGoGetScene();
  if (!scene?.startsWith('goget-')) return null;
  const session = getPlayStoreDemoGoGetSession(DEMO_GOGET_SESSION_ID);
  if (!session || session.itemId !== itemId) return null;
  if (session.fulfillerUserId !== userId && session.requesterUserId !== userId) return null;
  if (scene === 'goget-listing' || scene === 'goget-chat') return null;
  return session;
}

/** Viewer profile for a Play Store Go Get screenshot scene (picker vs poster). */
export function getPlayStoreDemoGoGetViewer(scene: string): UserProfile {
  if (scene === 'goget-ring' || scene === 'goget-tracking' || scene === 'goget-arrived') {
    return DEMO_GOGET_AVERY_PROFILE;
  }
  return PLAY_STORE_DEMO_PROFILE;
}

export function getPlayStoreDemoLockedGoGetSession(userId: string): GoGetSession | null {
  const scene = parsePlayStoreGoGetScene();
  if (!scene?.startsWith('goget-')) return null;
  if (scene === 'goget-listing' || scene === 'goget-chat' || scene === 'goget-ring') return null;
  const session = getPlayStoreDemoGoGetSession(DEMO_GOGET_SESSION_ID);
  if (!session) return null;
  if (session.fulfillerUserId !== userId && session.requesterUserId !== userId) return null;
  return isGoGetTripLocked(session, userId) ? session : null;
}

export function getPlayStoreDemoLiveLocation(sessionId: string): GoGetLiveLocation | null {
  if (sessionId !== DEMO_GOGET_SESSION_ID) return null;
  return DEMO_GOGET_LIVE_LOCATION;
}

export function getPlayStoreDemoFulfillerLiveLocation(sessionId: string): GoGetFulfillerLiveLocation | null {
  if (sessionId !== DEMO_GOGET_SESSION_ID) return null;
  return DEMO_GOGET_FULFILLER_LIVE_LOCATION;
}
