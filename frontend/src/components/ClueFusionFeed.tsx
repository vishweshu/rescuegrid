import React, { useState } from 'react';
import {
  MessageSquare,
  AlertOctagon,
  Copy,
  Radio,
  PlusCircle,
  X,
  Volume2,
  Battery,
  AlertTriangle,
  CheckCircle2,
  Users,
  Compass
} from 'lucide-react';
import { EvidenceClue, SearchZone } from '../types';

interface ClueFusionFeedProps {
  clues: EvidenceClue[];
  zones: SearchZone[];
  onSubmitClue: (newClue: Partial<EvidenceClue>) => Promise<void>;
  isOffline: boolean;
}

export const ClueFusionFeed: React.FC<ClueFusionFeedProps> = ({
  clues,
  zones,
  onSubmitClue,
  isOffline
}) => {
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [filterZone, setFilterZone] = useState<string>('ALL');
  const [showOnlyConflicts, setShowOnlyConflicts] = useState<boolean>(false);

  // Form State
  const [rawText, setRawText] = useState('');
  const [selectedZone, setSelectedZone] = useState('');
  const [sourceType, setSourceType] = useState('EYEWITNESS_DIRECT');
  const [reporterInfo, setReporterInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Filter clues
  const filteredClues = clues.filter((c) => {
    if (filterZone !== 'ALL' && c.zone_id !== filterZone) return false;
    if (showOnlyConflicts && !c.conflict_flag) return false;
    return true;
  });

  const conflictsCount = clues.filter((c) => c.conflict_flag).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim()) return;

    try {
      setSubmitting(true);
      await onSubmitClue({
        incident_id: 'INC-WAYANAD-2026-SIM',
        zone_id: selectedZone || null,
        source_type: sourceType,
        reporter_info: reporterInfo || 'Field Informant',
        raw_text: rawText,
        uncertainty_meters: 30.0,
        verification_status: 'UNVERIFIED'
      });
      setShowSubmitModal(false);
      setRawText('');
      setReporterInfo('');
    } catch (err: any) {
      alert(`Submission error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const getSourceBadge = (type: string) => {
    switch (type) {
      case 'ACOUSTIC_SENSOR':
        return <span className="bg-purple-900/60 text-purple-300 border border-purple-700 text-[10px] px-1.5 py-0.5 rounded font-mono">ACOUSTIC SENSOR</span>;
      case 'DRONE_RECON':
        return <span className="bg-cyan-900/60 text-cyan-300 border border-cyan-700 text-[10px] px-1.5 py-0.5 rounded font-mono">DRONE THERMAL</span>;
      case 'SOS_MESSAGE':
        return <span className="bg-red-900/60 text-red-300 border border-red-700 text-[10px] px-1.5 py-0.5 rounded font-mono">SOS SMS</span>;
      case 'FIRST_RESPONDER':
        return <span className="bg-emerald-900/60 text-emerald-300 border border-emerald-700 text-[10px] px-1.5 py-0.5 rounded font-mono">FIRST RESPONDER</span>;
      default:
        return <span className="bg-slate-800 text-slate-300 border border-slate-700 text-[10px] px-1.5 py-0.5 rounded font-mono">{type}</span>;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col h-full">
      {/* Header & Controls */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-amber-400" />
          <h3 className="font-bold text-white text-sm">Survivor Clue Fusion Stream</h3>
          <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">
            {filteredClues.length}
          </span>
        </div>

        <button
          onClick={() => setShowSubmitModal(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg shadow transition-all"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Submit Clue</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex items-center justify-between gap-2 mb-3 text-xs">
        <select
          value={filterZone}
          onChange={(e) => setFilterZone(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 focus:outline-none text-xs"
        >
          <option value="ALL">All Search Zones</option>
          {zones.map((z) => (
            <option key={z.id} value={z.id}>{z.code}: {z.name.slice(0, 20)}</option>
          ))}
        </select>

        {conflictsCount > 0 && (
          <button
            onClick={() => setShowOnlyConflicts(!showOnlyConflicts)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold border transition-all ${
              showOnlyConflicts
                ? 'bg-red-600 text-white border-red-500'
                : 'bg-red-950/60 text-red-300 border-red-800/80 hover:bg-red-900'
            }`}
          >
            <AlertOctagon className="w-3 h-3 text-red-400 animate-pulse" />
            <span>{conflictsCount} Critical Conflicts</span>
          </button>
        )}
      </div>

      {/* Clues Stream Container */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {filteredClues.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
            <MessageSquare className="w-8 h-8 mb-1.5 opacity-40" />
            <span>No clues matching current filter.</span>
          </div>
        ) : (
          filteredClues.map((clue) => {
            const entities = clue.extracted_entities || { trapped_count: 0, has_signs_of_life: false };
            const zoneCode = zones.find((z) => z.id === clue.zone_id)?.code;

            return (
              <div
                key={clue.id}
                className={`p-3 rounded-lg border text-xs transition-all ${
                  clue.conflict_flag
                    ? 'bg-red-950/40 border-red-700/80 shadow-md shadow-red-950/40'
                    : clue.duplicate_of_id
                    ? 'bg-slate-900/60 border-slate-800 opacity-80'
                    : 'bg-slate-800/70 border-slate-700/80 hover:border-slate-600'
                }`}
              >
                {/* Meta Header */}
                <div className="flex items-center justify-between gap-1 mb-1.5 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-slate-300">{clue.id}</span>
                    {zoneCode && (
                      <span className="bg-slate-950 text-amber-400 font-mono text-[10px] font-bold px-1.5 py-0.2 rounded border border-slate-800">
                        {zoneCode}
                      </span>
                    )}
                    {getSourceBadge(clue.source_type)}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(clue.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Raw Clue Text */}
                <p className="text-slate-200 mb-2 leading-relaxed">{clue.raw_text}</p>

                {/* NLP Extracted Badges */}
                <div className="flex items-center gap-1.5 flex-wrap mb-2">
                  {entities.trapped_count > 0 && (
                    <span className="bg-red-900/70 text-red-200 border border-red-700 text-[10px] px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      Trapped: {entities.trapped_count}
                    </span>
                  )}
                  {entities.has_signs_of_life && (
                    <span className="bg-emerald-900/70 text-emerald-200 border border-emerald-700 text-[10px] px-1.5 py-0.5 rounded font-bold flex items-center gap-1 animate-pulse">
                      <Volume2 className="w-3 h-3 text-emerald-300" />
                      Signs of Life Detected
                    </span>
                  )}
                  {entities.battery_percent !== undefined && entities.battery_percent !== null && (
                    <span className="bg-amber-900/70 text-amber-200 border border-amber-700 text-[10px] px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                      <Battery className="w-3 h-3" />
                      Battery: {entities.battery_percent}%
                    </span>
                  )}
                  {entities.urgency_keywords && entities.urgency_keywords.map((uk, idx) => (
                    <span key={idx} className="bg-slate-950 text-rose-300 text-[10px] px-1.5 py-0.5 rounded border border-rose-900/60 font-medium">
                      ⚠️ {uk}
                    </span>
                  ))}
                  {entities.evacuated_claimed && (
                    <span className="bg-blue-900/70 text-blue-200 border border-blue-700 text-[10px] px-1.5 py-0.5 rounded font-medium">
                      Evacuation Claimed
                    </span>
                  )}
                </div>

                {/* Duplicate Notification */}
                {clue.duplicate_of_id && (
                  <div className="mt-1 p-1.5 bg-slate-950 rounded text-[10px] text-slate-400 flex items-center gap-1.5 border border-slate-800">
                    <Copy className="w-3 h-3 text-blue-400" />
                    <span>Corroborates <b>{clue.duplicate_of_id}</b> (merged to avoid inflating victim count).</span>
                  </div>
                )}

                {/* CONFLICT / CONTRADICTION WARNING BANNER */}
                {clue.conflict_flag && clue.conflict_details && (
                  <div className="mt-2 p-2.5 bg-red-950/80 border border-red-700 rounded-md text-red-200">
                    <div className="font-bold flex items-center gap-1.5 text-red-300 mb-1">
                      <AlertOctagon className="w-4 h-4 text-red-400" />
                      <span>CONTRADICTORY INTELLIGENCE DETECTED</span>
                    </div>
                    <p className="text-[11px] leading-tight mb-1.5 text-red-100">
                      {clue.conflict_details.explanation}
                    </p>
                    <div className="text-[10px] font-bold text-amber-300 bg-red-900/50 p-1.5 rounded border border-red-700/60">
                      ⚡ Action Required: {clue.conflict_details.recommended_action}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Submit Clue Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 max-w-lg w-full shadow-2xl text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="font-bold text-white flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-amber-400" />
                <span>Submit Survivor Intelligence Clue</span>
              </h3>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Associated Search Zone:
                </label>
                <select
                  value={selectedZone}
                  onChange={(e) => setSelectedZone(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-slate-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="">Select Target Zone (or auto-spatial)</option>
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>{z.code}: {z.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Source Channel:
                  </label>
                  <select
                    value={sourceType}
                    onChange={(e) => setSourceType(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-slate-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="EYEWITNESS_DIRECT">Eyewitness Direct (Reliability 78%)</option>
                    <option value="ACOUSTIC_SENSOR">Acoustic Listening Sensor (95%)</option>
                    <option value="DRONE_RECON">Drone Thermal Recon (90%)</option>
                    <option value="FIRST_RESPONDER">First Responder Report (88%)</option>
                    <option value="SOS_MESSAGE">Direct SOS SMS (75%)</option>
                    <option value="FAMILY_REPORT">Family Relative (65%)</option>
                    <option value="SOCIAL_MEDIA_CHATTER">Social Media / WhatsApp (40%)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Reporter Contact / Unit:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., +91-98470XXXX9 or Squad 4"
                    value={reporterInfo}
                    onChange={(e) => setReporterInfo(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Raw Intelligence / Observation Text:
                </label>
                <textarea
                  required
                  rows={4}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="e.g., Acoustic listening device heard distinct knocking from basement void. Trapped count around 3 people. Battery level 10% and smell of gas nearby..."
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-slate-100 focus:outline-none focus:border-amber-500 font-sans"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  AI NLP Engine will automatically extract headcounts, acoustic life indicators, battery status, and detect potential contradictions with prior reports.
                </span>
              </div>

              {isOffline && (
                <div className="p-2 bg-red-950/60 border border-red-800 rounded text-[11px] text-red-300">
                  ⚡ <b>Offline Mode:</b> This clue will be stored in IndexedDB and queued for sync when central connectivity is restored.
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded font-bold shadow-md transition-all"
                >
                  {submitting ? 'Processing NLP...' : 'Submit & Analyze'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
