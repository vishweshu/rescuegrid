import React, { useState } from 'react';
import {
  Users,
  PlusCircle,
  X,
  Search,
  AlertCircle,
  Phone,
  User,
  HeartPulse
} from 'lucide-react';
import { MissingPerson, SearchZone } from '../types';

interface MissingPersonsPanelProps {
  missingPersons: MissingPerson[];
  zones: SearchZone[];
  onRegisterPerson: (person: Partial<MissingPerson>) => Promise<void>;
  isOffline: boolean;
}

export const MissingPersonsPanel: React.FC<MissingPersonsPanelProps> = ({
  missingPersons,
  zones,
  onRegisterPerson,
  isOffline
}) => {
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterZone, setFilterZone] = useState('ALL');

  // Form
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState<number | ''>('');
  const [gender, setGender] = useState('Female');
  const [zoneId, setZoneId] = useState('');
  const [locationDesc, setLocationDesc] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [medicalNeeds, setMedicalNeeds] = useState('');
  const [physicalDesc, setPhysicalDesc] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [reporterContact, setReporterContact] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const filtered = missingPersons.filter((p) => {
    if (filterZone !== 'ALL' && p.last_seen_zone_id !== filterZone) return false;
    if (searchTerm && !p.full_name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    try {
      setSubmitting(true);
      await onRegisterPerson({
        incident_id: 'INC-WAYANAD-2026-SIM',
        full_name: fullName,
        age: age ? Number(age) : null,
        gender: gender,
        last_seen_zone_id: zoneId || null,
        last_seen_location_desc: locationDesc,
        contact_phone: contactPhone,
        medical_needs: medicalNeeds,
        physical_description: physicalDesc,
        reporter_name: reporterName,
        reporter_contact: reporterContact,
        status: 'REPORTED'
      });
      setShowModal(false);
      setFullName('');
      setAge('');
      setLocationDesc('');
      setMedicalNeeds('');
    } catch (err: any) {
      alert(`Registration failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-amber-400" />
          <h3 className="font-bold text-white text-sm">Missing Persons Registry</h3>
          <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">
            {filtered.length} Recorded
          </span>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg shadow transition-all"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Register Missing</span>
        </button>
      </div>

      {/* Filter toolbar */}
      <div className="flex items-center gap-2 text-xs flex-wrap">
        <div className="relative flex-1 min-w-[140px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded pl-8 pr-2 py-1 text-slate-200 focus:outline-none focus:border-amber-500 text-xs"
          />
        </div>

        <select
          value={filterZone}
          onChange={(e) => setFilterZone(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 focus:outline-none text-xs"
        >
          <option value="ALL">All Zones</option>
          {zones.map((z) => (
            <option key={z.id} value={z.id}>{z.code}: {z.name.slice(0, 18)}</option>
          ))}
        </select>
      </div>

      {/* Directory Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.length === 0 ? (
          <div className="col-span-full p-8 text-center text-slate-500 text-xs">
            No missing person records matching criteria.
          </div>
        ) : (
          filtered.map((person) => {
            const zCode = zones.find((z) => z.id === person.last_seen_zone_id)?.code;

            return (
              <div
                key={person.id}
                className="p-3 bg-slate-800/70 border border-slate-700 rounded-lg text-xs flex flex-col justify-between hover:border-slate-600 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="font-bold text-white text-xs">{person.full_name}</span>
                    {zCode && (
                      <span className="bg-slate-950 text-amber-400 font-mono text-[10px] font-bold px-1.5 py-0.2 rounded border border-slate-800">
                        {zCode}
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-400 space-y-1 mb-2">
                    <div>Age: <b className="text-slate-200">{person.age || 'Unknown'}</b> • Gender: <b className="text-slate-200">{person.gender || 'N/A'}</b></div>
                    <div>Last Seen: <span className="text-slate-300">{person.last_seen_location_desc || 'Unspecified'}</span></div>
                    {person.medical_needs && (
                      <div className="p-1.5 bg-rose-950/40 border border-rose-900/60 rounded text-rose-300 font-medium flex items-center gap-1">
                        <HeartPulse className="w-3 h-3 text-rose-400 flex-shrink-0" />
                        <span>Medical: {person.medical_needs}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Reporter: {person.reporter_name || 'Anonymous'}</span>
                  <span className="bg-amber-950 text-amber-300 border border-amber-800 px-1.5 py-0.2 rounded font-bold">
                    {person.status}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 max-w-lg w-full shadow-2xl text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="font-bold text-white flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-amber-400" />
                <span>Register Missing Person</span>
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Full Name:</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Age:</label>
                  <input
                    type="number"
                    min="1"
                    max="110"
                    value={age}
                    onChange={(e) => setAge(e.target.value ? Number(e.target.value) : '')}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Gender:</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-slate-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Last Seen Zone:</label>
                  <select
                    value={zoneId}
                    onChange={(e) => setZoneId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-slate-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="">Select Zone</option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>{z.code}: {z.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Specific Location:</label>
                  <input
                    type="text"
                    placeholder="e.g., Quarter #2 Kitchen"
                    value={locationDesc}
                    onChange={(e) => setLocationDesc(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Medical Needs / Vulnerabilities:</label>
                <input
                  type="text"
                  placeholder="e.g., Diabetic (needs insulin), Asthma, Mobility impaired"
                  value={medicalNeeds}
                  onChange={(e) => setMedicalNeeds(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Reporter Name:</label>
                  <input
                    type="text"
                    value={reporterName}
                    onChange={(e) => setReporterName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Reporter Phone:</label>
                  <input
                    type="text"
                    placeholder="+91-98470XXXX2"
                    value={reporterContact}
                    onChange={(e) => setReporterContact(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded font-bold shadow-md transition-all"
                >
                  {submitting ? 'Registering...' : 'Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
