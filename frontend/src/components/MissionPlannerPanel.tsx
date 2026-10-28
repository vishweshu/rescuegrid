import React, { useState } from 'react';
import {
  Truck,
  CheckCircle,
  AlertTriangle,
  ShieldAlert,
  Compass,
  Radio,
  Clock,
  ArrowRight,
  Package,
  Check
} from 'lucide-react';
import { MissionRecommendation, MissionAssignment, RescueTeam } from '../types';

interface MissionPlannerPanelProps {
  recommendations: MissionRecommendation[];
  missions: MissionAssignment[];
  teams: RescueTeam[];
  onApproveMission: (rec: MissionRecommendation) => Promise<void>;
  isOffline: boolean;
}

export const MissionPlannerPanel: React.FC<MissionPlannerPanelProps> = ({
  recommendations,
  missions,
  teams,
  onApproveMission,
  isOffline
}) => {
  const [approvingZoneId, setApprovingZoneId] = useState<string | null>(null);

  const handleApprove = async (rec: MissionRecommendation) => {
    try {
      setApprovingZoneId(rec.zone_id);
      await onApproveMission(rec);
    } catch (err: any) {
      alert(`Approval error: ${err.message}`);
    } finally {
      setApprovingZoneId(null);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Truck className="w-5 h-5 text-amber-400" />
          <h3 className="font-bold text-white text-sm">Capability-Aware Rescue Mission Planning</h3>
        </div>
        <span className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
          Human-in-the-Loop Sign-off Required
        </span>
      </div>

      {/* Notice Banner */}
      <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-400 flex items-start gap-2">
        <ShieldAlert className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
        <div>
          <b className="text-slate-200">Safety Routing Guarantee:</b> Autonomous dispatch is prohibited. Teams are matched based on specialized capabilities (e.g. K9 canine for rubble, hydraulic breach for collapsed concrete slabs) and will never be routed through unmitigated hazards or impassable road closures.
        </div>
      </div>

      {/* Recommendations Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {recommendations.length === 0 ? (
          <div className="col-span-full p-8 text-center text-slate-500 text-xs">
            No active mission recommendations at this time. All priority zones addressed or awaiting new intelligence.
          </div>
        ) : (
          recommendations.map((rec) => {
            const isApproved = missions.some((m) => m.zone_id === rec.zone_id && m.status === 'COORDINATOR_APPROVED');

            return (
              <div
                key={rec.zone_id}
                className={`p-3.5 rounded-lg border text-xs flex flex-col justify-between transition-all ${
                  isApproved
                    ? 'bg-emerald-950/20 border-emerald-800/80 shadow-md'
                    : 'bg-slate-800/70 border-slate-700 hover:border-slate-600'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold bg-slate-950 text-amber-400 px-2 py-0.5 rounded border border-slate-800">
                        {rec.zone_code}
                      </span>
                      <span className="font-bold text-white text-xs">{rec.zone_name.split('(')[0]}</span>
                    </div>
                    <span className="bg-red-950 text-red-300 font-mono font-black text-[11px] px-2 py-0.5 rounded border border-red-800">
                      Score: {rec.priority_score.toFixed(1)}
                    </span>
                  </div>

                  {/* Assigned Team & Capability Matching */}
                  <div className="p-2.5 bg-slate-950/80 rounded border border-slate-800 mb-2.5">
                    <div className="text-[11px] text-slate-400 mb-0.5 font-medium">Recommended Rescue Unit:</div>
                    <div className="font-bold text-sky-400 flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5" />
                      <span>{rec.team_name}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      Org: <b className="text-slate-300">{rec.team_organization}</b>
                    </div>
                  </div>

                  {/* Rationale */}
                  <p className="text-slate-300 leading-relaxed mb-2.5 italic">
                    "{rec.rationale}"
                  </p>

                  {/* Route & Hazard Warning */}
                  {rec.risk_warning && (
                    <div className="p-2 bg-amber-950/40 border border-amber-800/60 rounded text-[11px] text-amber-200 mb-2.5 flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <span>{rec.risk_warning}</span>
                    </div>
                  )}

                  {/* Recommended Equipment */}
                  {rec.recommended_equipment && rec.recommended_equipment.length > 0 && (
                    <div className="mb-2.5">
                      <div className="text-[11px] font-bold text-slate-400 mb-1 flex items-center gap-1">
                        <Package className="w-3 h-3 text-amber-400" />
                        <span>Recommended Equipment:</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {rec.recommended_equipment.map((eq, i) => (
                          <span key={i} className="bg-slate-900 border border-slate-700 text-slate-300 text-[10px] px-1.5 py-0.5 rounded">
                            {eq}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Coordinator Approval Action Button */}
                <div className="pt-2 border-t border-slate-700/60 mt-2">
                  {isApproved ? (
                    <div className="w-full py-2 bg-emerald-950 border border-emerald-700 text-emerald-300 rounded font-bold text-center flex items-center justify-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>MISSION DISPATCHED &amp; ACTIVE</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleApprove(rec)}
                      disabled={approvingZoneId === rec.zone_id}
                      className="w-full py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white rounded font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
                    >
                      <span>{approvingZoneId === rec.zone_id ? 'Authorizing...' : 'Approve & Dispatch Mission'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
