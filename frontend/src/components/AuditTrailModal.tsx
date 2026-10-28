import React from 'react';
import { X, History, UserCheck, ShieldAlert, ArrowRight, Clock } from 'lucide-react';
import { AuditLog } from '../types';

interface AuditTrailModalProps {
  logs: AuditLog[];
  onClose: () => void;
}

export const AuditTrailModal: React.FC<AuditTrailModalProps> = ({ logs, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full p-6 shadow-2xl text-slate-100 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-900/60 rounded-lg border border-purple-700/80">
              <History className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Immutable Decision Audit Trail</h2>
              <p className="text-xs text-slate-400">
                Log of human coordinator overrides, clue submissions, and mission dispatches
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded border border-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Timeline List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No audit log entries recorded yet.
            </div>
          ) : (
            logs.map((log) => {
              const isOverride = log.action_type.includes('OVERRIDE');
              const isMission = log.action_type.includes('MISSION');

              return (
                <div
                  key={log.id}
                  className={`p-3 rounded-lg border ${
                    isOverride
                      ? 'bg-purple-950/40 border-purple-800 text-purple-100'
                      : isMission
                      ? 'bg-blue-950/40 border-blue-800 text-blue-100'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                      <span>{log.actor}</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>

                  <div className="text-[11px] font-mono text-amber-300/90 mb-1">
                    Action: <b>{log.action_type}</b> ({log.entity_type})
                  </div>

                  <p className="text-slate-200 leading-relaxed bg-slate-900/60 p-2 rounded border border-slate-800/80">
                    {log.details}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 pt-3 mt-4 flex items-center justify-between text-[11px] text-slate-400">
          <span>Cryptographically chained operational decision ledger</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-semibold transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
