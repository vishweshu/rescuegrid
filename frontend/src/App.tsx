import React, { useState, useEffect } from 'react';
import {
  Header
} from './components/Header';
import { DisasterMap } from './components/DisasterMap';
import { ZoneDetailDrawer } from './components/ZoneDetailDrawer';
import { ClueFusionFeed } from './components/ClueFusionFeed';
import { MissionPlannerPanel } from './components/MissionPlannerPanel';
import { MissingPersonsPanel } from './components/MissingPersonsPanel';
import { SituationSummaryModal } from './components/SituationSummaryModal';
import { AuditTrailModal } from './components/AuditTrailModal';

import {
  Incident,
  SearchZone,
  EvidenceClue,
  Hazard,
  RoadRestriction,
  RescueTeam,
  MissionRecommendation,
  MissionAssignment,
  MissingPerson,
  SituationSummary,
  AuditLog
} from './types';
import * as api from './services/api';
import * as localDb from './services/db';
import {
  Compass,
  Truck,
  Users,
  BrainCircuit,
  MessageSquare,
  AlertTriangle,
  Layers,
  ChevronRight,
  ShieldAlert,
  Flame,
  CheckCircle2
} from 'lucide-react';

export function App() {
  // Navigation Tab
  const [activeTab, setActiveTab] = useState<'MAP_OPERATIONS' | 'MISSIONS' | 'MISSING_PERSONS'>('MAP_OPERATIONS');

  // Inspector Sub-tab in Map view
  const [inspectorTab, setInspectorTab] = useState<'ZONE_AI' | 'CLUES'>('ZONE_AI');

  // Core Disaster State
  const [incident, setIncident] = useState<Incident | null>(null);
  const [zones, setZones] = useState<SearchZone[]>([]);
  const [clues, setClues] = useState<EvidenceClue[]>([]);
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [roads, setRoads] = useState<RoadRestriction[]>([]);
  const [teams, setTeams] = useState<RescueTeam[]>([]);
  const [missions, setMissions] = useState<MissionAssignment[]>([]);
  const [missionRecs, setMissionRecs] = useState<MissionRecommendation[]>([]);
  const [missingPersons, setMissingPersons] = useState<MissingPerson[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Selected Zone
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>('ZONE-ALPHA');

  // Modals
  const [showSitRep, setShowSitRep] = useState(false);
  const [sitrepData, setSitrepData] = useState<SituationSummary | null>(null);
  const [showAudit, setShowAudit] = useState(false);

  // Offline & Synchronization State
  const [isOffline, setIsOffline] = useState(api.getSimulatedOffline());
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);

  // Load state on mount
  useEffect(() => {
    loadAllData();
    checkOfflineQueueCount();
  }, [isOffline]);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const checkOfflineQueueCount = async () => {
    try {
      const q = await localDb.getOfflineQueue();
      setUnsyncedCount(q.length);
    } catch (err) {
      console.error(err);
    }
  };

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [inc, zList, cList, hList, rList, tList, mList, mpList] = await Promise.all([
        api.fetchIncident(),
        api.fetchZones(),
        api.fetchClues(),
        api.fetchHazards(),
        api.fetchRoads(),
        api.fetchTeams(),
        api.fetchMissions(),
        api.fetchMissingPersons()
      ]);

      setIncident(inc);
      setZones(zList);
      setClues(cList);
      setHazards(hList);
      setRoads(rList);
      setTeams(tList);
      setMissions(mList);
      setMissingPersons(mpList);

      // Load mission recommendations
      if (!isOffline) {
        const recs = await api.fetchMissionRecommendations();
        setMissionRecs(recs);
      }

      await checkOfflineQueueCount();
    } catch (err: any) {
      console.error('Error loading data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleOffline = (val: boolean) => {
    api.setSimulatedOffline(val);
    setIsOffline(val);
    if (val) {
      showToast('⚠️ Switched to OFFLINE EMERGENCY MODE (IndexedDB Active)');
    } else {
      showToast('🌐 Switched to ONLINE CLOUD MODE');
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      const res = await api.syncOfflineQueueNow();
      if (res.success) {
        showToast(`✅ ${res.message}`);
        await loadAllData();
      } else {
        alert(res.message);
      }
    } catch (err: any) {
      alert(`Sync failed: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleResetDemo = async () => {
    if (!window.confirm('Reset incident to original 20-structure simulated landslide state?')) return;
    try {
      await api.resetDemoScenario();
      showToast('🔄 Demo scenario re-seeded successfully.');
      await loadAllData();
      setSelectedZoneId('ZONE-ALPHA');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleOverridePriority = async (zoneId: string, score: number, author: string, reason: string) => {
    await api.overrideZonePriority(zoneId, score, author, reason);
    showToast(`Coordinator priority override applied: Zone score set to ${score.toFixed(1)}`);
    await loadAllData();
  };

  const handleSubmitClue = async (newClue: Partial<EvidenceClue>) => {
    await api.createClue(newClue);
    showToast('Survivor clue recorded and fused with situational intelligence.');
    await loadAllData();
  };

  const handleRegisterPerson = async (newPerson: Partial<MissingPerson>) => {
    await api.createMissingPerson(newPerson);
    showToast('Missing person registered into sector roster.');
    await loadAllData();
  };

  const handleApproveMission = async (rec: MissionRecommendation) => {
    await api.approveMission({
      incident_id: 'INC-WAYANAD-2026-SIM',
      zone_id: rec.zone_id,
      team_id: rec.team_id,
      priority_rank: rec.priority_rank,
      recommended_equipment: rec.recommended_equipment,
      rationale: rec.rationale,
      risk_warning: rec.risk_warning,
      missing_intel: rec.missing_intel,
      approved_by: 'Chief Incident Commander'
    });
    showToast(`Mission Approved: ${rec.team_name} dispatched to ${rec.zone_code}!`);
    await loadAllData();
  };

  const handleOpenSitRep = async () => {
    const sitrep = await api.fetchSituationSummary();
    setSitrepData(sitrep);
    setShowSitRep(true);
  };

  const handleOpenAudit = async () => {
    const logs = await api.fetchAuditLogs();
    setAuditLogs(logs);
    setShowAudit(true);
  };

  const selectedZone = zones.find((z) => z.id === selectedZoneId) || (zones.length > 0 ? zones[0] : null);
  const conflictsCount = clues.filter((c) => c.conflict_flag).length;

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Top Tactical Navigation Header */}
      <Header
        incident={incident}
        isOffline={isOffline}
        onToggleOffline={handleToggleOffline}
        onSync={handleSync}
        onResetDemo={handleResetDemo}
        onOpenSitRep={handleOpenSitRep}
        onOpenAudit={handleOpenAudit}
        unsyncedCount={unsyncedCount}
        syncing={syncing}
      />

      {/* Toast Notification Banner */}
      {notification && (
        <div className="bg-amber-600 text-white text-xs font-bold px-4 py-2 text-center shadow-lg transition-all sticky top-[72px] z-30 flex items-center justify-center gap-2">
          <span>{notification}</span>
        </div>
      )}

      {/* Main Operations Container */}
      <main className="max-w-7xl mx-auto w-full px-4 py-4 flex-1 flex flex-col gap-3.5">
        {/* Navigation Tabs Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          {/* Segmented Pill Control */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('MAP_OPERATIONS')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'MAP_OPERATIONS'
                  ? 'bg-amber-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>Disaster Map</span>
            </button>

            <button
              onClick={() => setActiveTab('MISSIONS')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'MISSIONS'
                  ? 'bg-amber-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>Missions</span>
              {missionRecs.length > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                  {missionRecs.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('MISSING_PERSONS')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'MISSING_PERSONS'
                  ? 'bg-amber-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Missing Persons</span>
              <span className="bg-slate-800 text-slate-300 text-[10px] font-mono px-1.5 py-0.2 rounded-full">
                {missingPersons.length}
              </span>
            </button>
          </div>

          {/* Quick Status Tally */}
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span>6 Sectors Monitored</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>{conflictsCount} Contradictions Detected</span>
            </span>
          </div>
        </div>

        {/* Tab 1: Tactical Map Operations & Inspector Cockpit */}
        {activeTab === 'MAP_OPERATIONS' && (
          <div className="flex flex-col gap-3">
            {/* Top Quick Sector Selector Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {zones.map((z) => {
                const isSelected = selectedZoneId === z.id;
                const score = z.active_priority_score;
                const scoreColor = score >= 75 ? 'text-red-400' : score >= 50 ? 'text-amber-400' : 'text-blue-400';
                const hasConflict = z.id === 'ZONE-CHARLIE';

                return (
                  <button
                    key={z.id}
                    onClick={() => {
                      setSelectedZoneId(z.id);
                      setInspectorTab('ZONE_AI');
                    }}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'bg-slate-800 border-amber-500 ring-2 ring-amber-500/30 shadow-md'
                        : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-[11px] text-slate-300">
                        {z.code}
                      </span>
                      <span className={`font-mono font-black text-xs ${scoreColor}`}>
                        {score.toFixed(1)}
                      </span>
                    </div>
                    <div className="text-[11px] font-semibold text-white truncate mb-1">
                      {z.name.split('(')[0]}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>Rank #{z.rank}</span>
                      {hasConflict ? (
                        <span className="text-red-400 font-bold flex items-center gap-0.5">
                          ⚠️ Conflict
                        </span>
                      ) : (
                        <span>{z.estimated_occupants} occupants</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Central Cockpit: Map (7 cols) + Inspector Panel (5 cols) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
              {/* Left / Center Map (7 cols) */}
              <div className="lg:col-span-7 flex flex-col">
                <DisasterMap
                  zones={zones}
                  clues={clues}
                  hazards={hazards}
                  roads={roads}
                  teams={teams}
                  selectedZoneId={selectedZoneId}
                  onSelectZone={(zid) => {
                    setSelectedZoneId(zid);
                    setInspectorTab('ZONE_AI');
                  }}
                  isOfflineMode={isOffline}
                />
              </div>

              {/* Right Integrated Inspector Panel (5 cols) */}
              <div className="lg:col-span-5 flex flex-col bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-2xl h-[600px]">
                {/* Inspector Header Switch Tabs */}
                <div className="flex items-center justify-between bg-slate-950 p-2 border-b border-slate-800 text-xs">
                  <div className="flex items-center gap-1 p-0.5 bg-slate-900 rounded-lg border border-slate-800">
                    <button
                      onClick={() => setInspectorTab('ZONE_AI')}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded font-semibold transition-all ${
                        inspectorTab === 'ZONE_AI'
                          ? 'bg-amber-600 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <BrainCircuit className="w-3.5 h-3.5" />
                      <span>Zone Details</span>
                    </button>

                    <button
                      onClick={() => setInspectorTab('CLUES')}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded font-semibold transition-all ${
                        inspectorTab === 'CLUES'
                          ? 'bg-amber-600 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Reports &amp; Clues ({clues.length})</span>
                      {conflictsCount > 0 && (
                        <span className="w-2 h-2 rounded-full bg-red-400" />
                      )}
                    </button>
                  </div>

                  {selectedZone && (
                    <span className="text-[11px] font-mono text-amber-400 font-bold pr-2">
                      Focus: {selectedZone.code}
                    </span>
                  )}
                </div>

                {/* Inspector Content Area */}
                <div className="flex-1 overflow-y-auto">
                  {inspectorTab === 'ZONE_AI' ? (
                    <ZoneDetailDrawer
                      zone={selectedZone}
                      onOverridePriority={handleOverridePriority}
                      isOffline={isOffline}
                    />
                  ) : (
                    <ClueFusionFeed
                      clues={clues}
                      zones={zones}
                      onSubmitClue={handleSubmitClue}
                      isOffline={isOffline}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Rescue Mission Dispatch */}
        {activeTab === 'MISSIONS' && (
          <MissionPlannerPanel
            recommendations={missionRecs}
            missions={missions}
            teams={teams}
            onApproveMission={handleApproveMission}
            isOffline={isOffline}
          />
        )}

        {/* Tab 3: Missing Persons Registry */}
        {activeTab === 'MISSING_PERSONS' && (
          <MissingPersonsPanel
            missingPersons={missingPersons}
            zones={zones}
            onRegisterPerson={handleRegisterPerson}
            isOffline={isOffline}
          />
        )}
      </main>

      {/* Clean Minimal Footer */}
      <footer className="bg-slate-950 border-t border-slate-800 text-slate-400 text-xs py-3 px-4 text-center mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            <b className="text-slate-200">RescueGrid</b> — Disaster Search &amp; Rescue Decision Support
          </span>
          <span className="text-slate-400">
            Offline-First • Explainable Heuristics • Human Coordinator Authorized
          </span>
        </div>
      </footer>

      {/* Situation Summary (SitRep) Modal */}
      {showSitRep && (
        <SituationSummaryModal
          summary={sitrepData}
          onClose={() => setShowSitRep(false)}
        />
      )}

      {/* Audit Log Modal */}
      {showAudit && (
        <AuditTrailModal
          logs={auditLogs}
          onClose={() => setShowAudit(false)}
        />
      )}
    </div>
  );
}

export default App;
