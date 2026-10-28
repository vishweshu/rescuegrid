import {
  Incident,
  SearchZone,
  EvidenceClue,
  MissingPerson,
  Hazard,
  RoadRestriction,
  RescueTeam,
  MissionRecommendation,
  MissionAssignment,
  SituationSummary,
  AuditLog,
  OfflineActionItem
} from '../types';
import * as localDb from './db';

const API_BASE = '/api';

// Global simulated offline switch
let isSimulatedOffline = false;

export function setSimulatedOffline(status: boolean) {
  isSimulatedOffline = status;
  localStorage.setItem('rescuegrid_simulated_offline', status ? 'true' : 'false');
}

export function getSimulatedOffline(): boolean {
  if (typeof window !== 'undefined') {
    const val = localStorage.getItem('rescuegrid_simulated_offline');
    if (val !== null) {
      isSimulatedOffline = val === 'true';
    }
  }
  return isSimulatedOffline;
}

export function isOffline(): boolean {
  return isSimulatedOffline || (typeof navigator !== 'undefined' && !navigator.onLine);
}

// ----------------- Core API Methods -----------------

export async function fetchIncident(): Promise<Incident | null> {
  if (isOffline()) {
    return {
      id: 'INC-WAYANAD-2026-SIM',
      title: 'SIMULATED: Western Ghats Hillside Landslide Sector 4 (Offline Cache)',
      incident_type: 'LANDSLIDE',
      location_name: 'Meppadi - Chooralmala Hills (Simulated)',
      center_lat: 11.535,
      center_lng: 76.155,
      start_time: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
      description: 'Heavy monsoon cloudburst triggered extensive debris flow. Running in OFFLINE EMERGENCY MODE.',
      status: 'ACTIVE',
      created_at: new Date().toISOString()
    };
  }

  try {
    const res = await fetch(`${API_BASE}/incident`);
    if (!res.ok) throw new Error('Failed to fetch incident');
    return await res.json();
  } catch (err) {
    console.warn('Network error, falling back to offline defaults', err);
    return null;
  }
}

export async function resetDemoScenario(): Promise<any> {
  if (isOffline()) {
    throw new Error('Cannot reset server demo scenario while offline.');
  }
  const res = await fetch(`${API_BASE}/demo/seed`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to reset demo');
  const data = await res.json();
  // Clear offline queue
  await localDb.clearOfflineQueue();
  return data;
}

export async function fetchZones(): Promise<SearchZone[]> {
  if (isOffline()) {
    const cached = await localDb.getCachedZones();
    if (cached.length > 0) return cached;
  }

  try {
    const res = await fetch(`${API_BASE}/zones`);
    if (!res.ok) throw new Error('Failed to fetch zones');
    const data: SearchZone[] = await res.json();
    await localDb.cacheAllData({ zones: data });
    return data;
  } catch (err) {
    console.warn('Network error fetching zones, reading from IndexedDB', err);
    return localDb.getCachedZones();
  }
}

export async function overrideZonePriority(
  zoneId: string,
  overrideScore: number,
  author: string,
  reason: string
): Promise<any> {
  const timestamp = new Date().toISOString();

  if (isOffline()) {
    // Queue offline mutation
    const mutation: OfflineActionItem = {
      client_mutation_id: `MUT-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      entity_type: 'SEARCH_ZONE',
      action: 'OVERRIDE',
      client_timestamp: timestamp,
      payload: {
        zone_id: zoneId,
        override_priority_score: overrideScore,
        override_author: author,
        override_reason: reason
      }
    };
    await localDb.enqueueOfflineMutation(mutation);

    // Optimistically update IndexedDB
    const zones = await localDb.getCachedZones();
    const target = zones.find((z) => z.id === zoneId);
    if (target) {
      target.override_priority_score = overrideScore;
      target.active_priority_score = overrideScore;
      target.override_author = author;
      target.override_reason = reason;
      target.override_timestamp = timestamp;
      target.is_overridden = true;
      await localDb.cacheAllData({ zones });
    }
    return { status: 'QUEUED_OFFLINE', message: 'Override saved to local offline queue' };
  }

  const res = await fetch(`${API_BASE}/zones/${zoneId}/override`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      override_priority_score: overrideScore,
      override_author: author,
      override_reason: reason
    })
  });
  if (!res.ok) throw new Error('Failed to override zone priority');
  return await res.json();
}

export async function fetchClues(zoneId?: string): Promise<EvidenceClue[]> {
  if (isOffline()) {
    const cached = await localDb.getCachedClues();
    if (zoneId) {
      return cached.filter((c) => c.zone_id === zoneId);
    }
    return cached;
  }

  try {
    const url = zoneId ? `${API_BASE}/clues?zone_id=${zoneId}` : `${API_BASE}/clues`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch clues');
    const data: EvidenceClue[] = await res.json();
    await localDb.cacheAllData({ clues: data });
    return data;
  } catch (err) {
    console.warn('Network error fetching clues, reading cache', err);
    return localDb.getCachedClues();
  }
}

export async function createClue(clueData: Partial<EvidenceClue>): Promise<EvidenceClue> {
  const timestamp = new Date().toISOString();

  if (isOffline()) {
    const optimisticClue: EvidenceClue = {
      id: `CLUE-LOCAL-${Date.now()}`,
      incident_id: clueData.incident_id || 'INC-WAYANAD-2026-SIM',
      zone_id: clueData.zone_id || null,
      source_type: clueData.source_type || 'EYEWITNESS_DIRECT',
      reporter_info: clueData.reporter_info || 'Field Reporter (Offline)',
      raw_text: clueData.raw_text || '',
      lat: clueData.lat || null,
      lng: clueData.lng || null,
      uncertainty_meters: clueData.uncertainty_meters || 50.0,
      reliability_score: clueData.reliability_score || 0.75,
      verification_status: 'UNVERIFIED',
      timestamp: timestamp,
      conflict_flag: false,
      extracted_entities: {
        trapped_count: 0,
        has_signs_of_life: false
      }
    };

    const mutation: OfflineActionItem = {
      client_mutation_id: `MUT-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      entity_type: 'EVIDENCE_CLUE',
      action: 'CREATE',
      client_timestamp: timestamp,
      payload: optimisticClue
    };

    await localDb.enqueueOfflineMutation(mutation);
    const existing = await localDb.getCachedClues();
    await localDb.cacheAllData({ clues: [optimisticClue, ...existing] });
    return optimisticClue;
  }

  const res = await fetch(`${API_BASE}/clues`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(clueData)
  });
  if (!res.ok) throw new Error('Failed to create clue');
  return await res.json();
}

export async function fetchMissingPersons(zoneId?: string): Promise<MissingPerson[]> {
  if (isOffline()) {
    const cached = await localDb.getCachedMissingPersons();
    if (zoneId) {
      return cached.filter((m) => m.last_seen_zone_id === zoneId);
    }
    return cached;
  }

  try {
    const url = zoneId ? `${API_BASE}/missing-persons?zone_id=${zoneId}` : `${API_BASE}/missing-persons`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch missing persons');
    const data: MissingPerson[] = await res.json();
    await localDb.cacheAllData({ missing_persons: data });
    return data;
  } catch (err) {
    console.warn('Network error fetching missing persons, reading cache', err);
    return localDb.getCachedMissingPersons();
  }
}

export async function createMissingPerson(mpData: Partial<MissingPerson>): Promise<MissingPerson> {
  const timestamp = new Date().toISOString();

  if (isOffline()) {
    const optimisticMP: MissingPerson = {
      id: `MP-LOCAL-${Date.now()}`,
      incident_id: mpData.incident_id || 'INC-WAYANAD-2026-SIM',
      full_name: mpData.full_name || 'Unidentified',
      age: mpData.age || null,
      gender: mpData.gender || null,
      last_seen_zone_id: mpData.last_seen_zone_id || null,
      last_seen_location_desc: mpData.last_seen_location_desc || '',
      contact_phone: mpData.contact_phone || null,
      physical_description: mpData.physical_description || '',
      medical_needs: mpData.medical_needs || '',
      reporter_name: mpData.reporter_name || '',
      reporter_contact: mpData.reporter_contact || '',
      status: 'REPORTED',
      report_time: timestamp
    };

    const mutation: OfflineActionItem = {
      client_mutation_id: `MUT-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      entity_type: 'MISSING_PERSON',
      action: 'CREATE',
      client_timestamp: timestamp,
      payload: optimisticMP
    };

    await localDb.enqueueOfflineMutation(mutation);
    const existing = await localDb.getCachedMissingPersons();
    await localDb.cacheAllData({ missing_persons: [optimisticMP, ...existing] });
    return optimisticMP;
  }

  const res = await fetch(`${API_BASE}/missing-persons`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mpData)
  });
  if (!res.ok) throw new Error('Failed to report missing person');
  return await res.json();
}

export async function fetchHazards(): Promise<Hazard[]> {
  if (isOffline()) {
    return localDb.getCachedHazards();
  }
  try {
    const res = await fetch(`${API_BASE}/hazards`);
    if (!res.ok) throw new Error('Failed to fetch hazards');
    const data: Hazard[] = await res.json();
    await localDb.cacheAllData({ hazards: data });
    return data;
  } catch (err) {
    return localDb.getCachedHazards();
  }
}

export async function fetchRoads(): Promise<RoadRestriction[]> {
  if (isOffline()) {
    return localDb.getCachedRoads();
  }
  try {
    const res = await fetch(`${API_BASE}/roads`);
    if (!res.ok) throw new Error('Failed to fetch roads');
    const data: RoadRestriction[] = await res.json();
    await localDb.cacheAllData({ roads: data });
    return data;
  } catch (err) {
    return localDb.getCachedRoads();
  }
}

export async function fetchTeams(): Promise<RescueTeam[]> {
  if (isOffline()) {
    return localDb.getCachedTeams();
  }
  try {
    const res = await fetch(`${API_BASE}/teams`);
    if (!res.ok) throw new Error('Failed to fetch rescue teams');
    const data: RescueTeam[] = await res.json();
    await localDb.cacheAllData({ teams: data });
    return data;
  } catch (err) {
    return localDb.getCachedTeams();
  }
}

export async function fetchMissionRecommendations(): Promise<MissionRecommendation[]> {
  if (isOffline()) {
    return [];
  }
  try {
    const res = await fetch(`${API_BASE}/missions/recommendations`);
    if (!res.ok) throw new Error('Failed to fetch mission recommendations');
    return await res.json();
  } catch (err) {
    return [];
  }
}

export async function fetchMissions(): Promise<MissionAssignment[]> {
  if (isOffline()) {
    return localDb.getCachedMissions();
  }
  try {
    const res = await fetch(`${API_BASE}/missions`);
    if (!res.ok) throw new Error('Failed to fetch missions');
    const data: MissionAssignment[] = await res.json();
    await localDb.cacheAllData({ missions: data });
    return data;
  } catch (err) {
    return localDb.getCachedMissions();
  }
}

export async function approveMission(payload: any): Promise<any> {
  const res = await fetch(`${API_BASE}/missions/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to approve mission');
  return await res.json();
}

export async function fetchSituationSummary(): Promise<SituationSummary | null> {
  if (isOffline()) {
    return localDb.getCachedSitRep();
  }
  try {
    const res = await fetch(`${API_BASE}/situation-summary`);
    if (!res.ok) throw new Error('Failed to fetch situation summary');
    const data: SituationSummary = await res.json();
    await localDb.cacheAllData({ sitrep: data });
    return data;
  } catch (err) {
    return localDb.getCachedSitRep();
  }
}

export async function fetchAuditLogs(): Promise<AuditLog[]> {
  if (isOffline()) {
    return [];
  }
  try {
    const res = await fetch(`${API_BASE}/audit-logs`);
    if (!res.ok) throw new Error('Failed to fetch audit logs');
    return await res.json();
  } catch (err) {
    return [];
  }
}

// ----------------- Offline Sync Trigger -----------------
export async function syncOfflineQueueNow(): Promise<{
  success: boolean;
  syncedCount: number;
  conflictCount: number;
  message: string;
}> {
  if (isOffline()) {
    return {
      success: false,
      syncedCount: 0,
      conflictCount: 0,
      message: 'Cannot sync while in Offline Mode. Switch to Online Mode first.'
    };
  }

  const queue = await localDb.getOfflineQueue();
  if (queue.length === 0) {
    return {
      success: true,
      syncedCount: 0,
      conflictCount: 0,
      message: 'No pending offline actions to synchronize.'
    };
  }

  try {
    const res = await fetch(`${API_BASE}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: 'BROWSER-CLIENT-01',
        actions: queue
      })
    });

    if (!res.ok) throw new Error('Sync endpoint returned error');
    const syncResult = await res.json();

    // Clear successfully processed actions
    await localDb.clearOfflineQueue();

    // Refresh all cache from server
    await fetchZones();
    await fetchClues();
    await fetchMissingPersons();

    return {
      success: true,
      syncedCount: syncResult.synced_count,
      conflictCount: syncResult.conflict_count,
      message: `Synchronized ${syncResult.synced_count} offline record(s). ${syncResult.conflict_count} conflict(s) resolved.`
    };
  } catch (err: any) {
    return {
      success: false,
      syncedCount: 0,
      conflictCount: 0,
      message: `Sync failed: ${err.message}`
    };
  }
}
