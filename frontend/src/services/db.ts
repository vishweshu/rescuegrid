import { openDB, DBSchema, IDBPDatabase } from 'idb';
import {
  SearchZone,
  EvidenceClue,
  MissingPerson,
  Hazard,
  RoadRestriction,
  RescueTeam,
  MissionAssignment,
  SituationSummary,
  OfflineActionItem
} from '../types';

interface RescueGridDB extends DBSchema {
  zones: {
    key: string;
    value: SearchZone;
  };
  clues: {
    key: string;
    value: EvidenceClue;
    indexes: { 'by-zone': string };
  };
  missing_persons: {
    key: string;
    value: MissingPerson;
    indexes: { 'by-zone': string };
  };
  hazards: {
    key: string;
    value: Hazard;
  };
  roads: {
    key: string;
    value: RoadRestriction;
  };
  teams: {
    key: string;
    value: RescueTeam;
  };
  missions: {
    key: string;
    value: MissionAssignment;
  };
  offline_queue: {
    key: string;
    value: OfflineActionItem;
  };
  metadata: {
    key: string;
    value: any;
  };
}

const DB_NAME = 'rescuegrid_offline_store';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<RescueGridDB>> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<RescueGridDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('zones')) {
          db.createObjectStore('zones', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('clues')) {
          const clueStore = db.createObjectStore('clues', { keyPath: 'id' });
          clueStore.createIndex('by-zone', 'zone_id');
        }
        if (!db.objectStoreNames.contains('missing_persons')) {
          const mpStore = db.createObjectStore('missing_persons', { keyPath: 'id' });
          mpStore.createIndex('by-zone', 'last_seen_zone_id');
        }
        if (!db.objectStoreNames.contains('hazards')) {
          db.createObjectStore('hazards', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('roads')) {
          db.createObjectStore('roads', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('teams')) {
          db.createObjectStore('teams', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('missions')) {
          db.createObjectStore('missions', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('offline_queue')) {
          db.createObjectStore('offline_queue', { keyPath: 'client_mutation_id' });
        }
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata');
        }
      },
    });
  }
  return dbPromise;
}

// ----------------- Batch Cache Utilities -----------------
export async function cacheAllData(data: {
  zones?: SearchZone[];
  clues?: EvidenceClue[];
  missing_persons?: MissingPerson[];
  hazards?: Hazard[];
  roads?: RoadRestriction[];
  teams?: RescueTeam[];
  missions?: MissionAssignment[];
  sitrep?: SituationSummary;
}) {
  const db = await getDB();
  const tx = db.transaction(
    ['zones', 'clues', 'missing_persons', 'hazards', 'roads', 'teams', 'missions', 'metadata'],
    'readwrite'
  );

  if (data.zones) {
    for (const z of data.zones) await tx.objectStore('zones').put(z);
  }
  if (data.clues) {
    for (const c of data.clues) await tx.objectStore('clues').put(c);
  }
  if (data.missing_persons) {
    for (const mp of data.missing_persons) await tx.objectStore('missing_persons').put(mp);
  }
  if (data.hazards) {
    for (const h of data.hazards) await tx.objectStore('hazards').put(h);
  }
  if (data.roads) {
    for (const r of data.roads) await tx.objectStore('roads').put(r);
  }
  if (data.teams) {
    for (const t of data.teams) await tx.objectStore('teams').put(t);
  }
  if (data.missions) {
    for (const m of data.missions) await tx.objectStore('missions').put(m);
  }
  if (data.sitrep) {
    await tx.objectStore('metadata').put(data.sitrep, 'latest_sitrep');
  }

  await tx.done;
}

// ----------------- Offline Mutation Queue -----------------
export async function enqueueOfflineMutation(mutation: OfflineActionItem) {
  const db = await getDB();
  await db.put('offline_queue', mutation);
}

export async function getOfflineQueue(): Promise<OfflineActionItem[]> {
  const db = await getDB();
  return db.getAll('offline_queue');
}

export async function clearOfflineQueue() {
  const db = await getDB();
  await db.clear('offline_queue');
}

export async function removeOfflineMutation(mutationId: string) {
  const db = await getDB();
  await db.delete('offline_queue', mutationId);
}

// ----------------- Read Cached Data -----------------
export async function getCachedZones(): Promise<SearchZone[]> {
  const db = await getDB();
  return db.getAll('zones');
}

export async function getCachedClues(): Promise<EvidenceClue[]> {
  const db = await getDB();
  return db.getAll('clues');
}

export async function getCachedMissingPersons(): Promise<MissingPerson[]> {
  const db = await getDB();
  return db.getAll('missing_persons');
}

export async function getCachedHazards(): Promise<Hazard[]> {
  const db = await getDB();
  return db.getAll('hazards');
}

export async function getCachedRoads(): Promise<RoadRestriction[]> {
  const db = await getDB();
  return db.getAll('roads');
}

export async function getCachedTeams(): Promise<RescueTeam[]> {
  const db = await getDB();
  return db.getAll('teams');
}

export async function getCachedMissions(): Promise<MissionAssignment[]> {
  const db = await getDB();
  return db.getAll('missions');
}

export async function getCachedSitRep(): Promise<SituationSummary | null> {
  const db = await getDB();
  const res = await db.get('metadata', 'latest_sitrep');
  return res || null;
}
