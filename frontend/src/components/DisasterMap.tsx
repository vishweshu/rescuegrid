import React, { useState, useEffect, useRef } from 'react';
import {
  Layers,
  MapPin,
  AlertTriangle,
  Shield,
  Truck,
  Eye,
  Radio,
  Compass,
  Maximize2
} from 'lucide-react';
import { SearchZone, EvidenceClue, Hazard, RoadRestriction, RescueTeam } from '../types';

interface DisasterMapProps {
  zones: SearchZone[];
  clues: EvidenceClue[];
  hazards: Hazard[];
  roads: RoadRestriction[];
  teams: RescueTeam[];
  selectedZoneId: string | null;
  onSelectZone: (zoneId: string) => void;
  isOfflineMode: boolean;
}

export const DisasterMap: React.FC<DisasterMapProps> = ({
  zones,
  clues,
  hazards,
  roads,
  teams,
  selectedZoneId,
  onSelectZone,
  isOfflineMode
}) => {
  // Layer visibility state
  const [showZones, setShowZones] = useState(true);
  const [showClues, setShowClues] = useState(true);
  const [showHazards, setShowHazards] = useState(true);
  const [showRoads, setShowRoads] = useState(true);
  const [showTeams, setShowTeams] = useState(true);
  const [useTacticalGridFallback, setUseTacticalGridFallback] = useState(false);

  // Map container reference
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);

  // Fallback to tactical SVG grid if offline or error loading online tiles
  useEffect(() => {
    if (isOfflineMode) {
      setUseTacticalGridFallback(true);
    }
  }, [isOfflineMode]);

  // Leaflet initialization when online and not in fallback mode
  useEffect(() => {
    if (useTacticalGridFallback || !mapContainerRef.current) return;

    let isMounted = true;

    // Dynamically import Leaflet to avoid SSR/build window issues
    import('leaflet').then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      // Clean up previous instance
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }

      try {
        const map = L.map(mapContainerRef.current, {
          center: [11.5350, 76.1550],
          zoom: 15,
          zoomControl: true
        });

        // OpenStreetMap Tile Layer
        const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors | RescueGrid AI'
        }).addTo(map);

        tileLayer.on('tileerror', () => {
          console.warn('Map tiles unavailable, switching to local tactical grid fallback');
          setUseTacticalGridFallback(true);
        });

        // 1. Draw Zones
        zones.forEach((z) => {
          try {
            const geo = JSON.parse(z.boundary_geojson);
            const score = z.active_priority_score;
            const color = score >= 75 ? '#EF4444' : score >= 50 ? '#F59E0B' : '#3B82F6';

            // Leaflet expects [lat, lng], GeoJSON has [lng, lat]
            const coords = geo.coordinates[0].map((coord: number[]) => [coord[1], coord[0]]);
            const polygon = L.polygon(coords, {
              color: color,
              weight: selectedZoneId === z.id ? 4 : 2,
              fillColor: color,
              fillOpacity: selectedZoneId === z.id ? 0.35 : 0.18
            }).addTo(map);

            polygon.bindTooltip(`<b>${z.code}: ${z.name}</b><br/>Priority: <b>${score.toFixed(1)}/100</b>`, {
              sticky: true
            });

            polygon.on('click', () => {
              onSelectZone(z.id);
            });
          } catch (e) {
            console.error('Failed to parse zone polygon', e);
          }
        });

        // 2. Draw Hazards
        hazards.forEach((h) => {
          if (!h.active) return;
          const circle = L.circle([h.lat, h.lng], {
            radius: h.radius_meters || 60,
            color: '#DC2626',
            fillColor: '#EF4444',
            fillOpacity: 0.25,
            dashArray: '4, 6'
          }).addTo(map);

          circle.bindPopup(`
            <div style="font-size:12px;">
              <b style="color:#ef4444;">HAZARD: ${h.hazard_type} (${h.severity})</b><br/>
              ${h.description}<br/>
              <i>Radius: ${h.radius_meters}m</i>
            </div>
          `);
        });

        // 3. Draw Road Blocks
        roads.forEach((r) => {
          if (!r.active) return;
          const line = L.polyline([[r.start_lat, r.start_lng], [r.end_lat, r.end_lng]], {
            color: '#B91C1C',
            weight: 5,
            dashArray: '6, 8'
          }).addTo(map);

          line.bindPopup(`
            <div style="font-size:12px;">
              <b style="color:#b91c1c;">BLOCKED ROAD: ${r.road_name}</b><br/>
              Passable by: <b>${r.passable_by}</b><br/>
              Type: ${r.restriction_type}
            </div>
          `);
        });

        // 4. Draw Rescue Teams
        teams.forEach((t) => {
          const icon = L.divIcon({
            className: 'custom-team-pin',
            html: `<div style="background:#0284c7; color:#fff; border:2px solid #fff; border-radius:50%; width:28px; height:28px; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:bold; box-shadow:0 0 10px rgba(0,0,0,0.5);">🚒</div>`,
            iconSize: [28, 28]
          });

          const marker = L.marker([t.current_lat, t.current_lng], { icon }).addTo(map);
          marker.bindPopup(`
            <div style="font-size:12px;">
              <b style="color:#0284c7;">${t.name}</b> (${t.organization})<br/>
              Status: <b>${t.current_status}</b><br/>
              Radio: ${t.contact_radio || 'Standard VHF'}
            </div>
          `);
        });

        leafletMapRef.current = map;
      } catch (err) {
        console.warn('Leaflet initialization failed, falling back to tactical grid', err);
        setUseTacticalGridFallback(true);
      }
    });

    return () => {
      isMounted = false;
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [useTacticalGridFallback, zones, hazards, roads, teams, selectedZoneId]);

  // Color helper for priority scores
  const getScoreColor = (score: number) => {
    if (score >= 75) return '#EF4444'; // Red
    if (score >= 50) return '#F59E0B'; // Amber
    return '#3B82F6'; // Blue
  };

  return (
    <div className="relative w-full h-[600px] bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col">
      {/* Tactical Map Toolbar */}
      <div className="absolute top-3 left-3 z-30 flex flex-wrap items-center gap-2 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 p-1.5 rounded-lg shadow-lg text-xs">
        <span className="font-bold text-slate-300 flex items-center gap-1 px-1">
          <Layers className="w-3.5 h-3.5 text-amber-400" />
          <span>Layers:</span>
        </span>
        <button
          onClick={() => setShowZones(!showZones)}
          className={`px-2 py-1 rounded font-medium transition-all ${
            showZones ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          Zones ({zones.length})
        </button>
        <button
          onClick={() => setShowClues(!showClues)}
          className={`px-2 py-1 rounded font-medium transition-all ${
            showClues ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          Clues ({clues.length})
        </button>
        <button
          onClick={() => setShowHazards(!showHazards)}
          className={`px-2 py-1 rounded font-medium transition-all ${
            showHazards ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          Hazards ({hazards.length})
        </button>
        <button
          onClick={() => setShowRoads(!showRoads)}
          className={`px-2 py-1 rounded font-medium transition-all ${
            showRoads ? 'bg-rose-700 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          Roadblocks ({roads.length})
        </button>
        <button
          onClick={() => setShowTeams(!showTeams)}
          className={`px-2 py-1 rounded font-medium transition-all ${
            showTeams ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          Teams ({teams.length})
        </button>
      </div>

      {/* Mode Switcher: Online Tile Map vs Offline Tactical Grid Fallback */}
      <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
        <button
          onClick={() => setUseTacticalGridFallback(!useTacticalGridFallback)}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border backdrop-blur-md shadow-md flex items-center gap-1.5 transition-all ${
            useTacticalGridFallback
              ? 'bg-amber-950/90 text-amber-300 border-amber-600'
              : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:bg-slate-800'
          }`}
          title="Toggle high-contrast local tactical SVG grid (works 100% offline without map tile servers)"
        >
          <Compass className="w-3.5 h-3.5 text-amber-400" />
          <span>{useTacticalGridFallback ? 'Tactical Vector Grid (Offline)' : 'Online OSM Tiles'}</span>
        </button>
      </div>

      {/* Map Rendering Area */}
      {!useTacticalGridFallback ? (
        <div ref={mapContainerRef} className="w-full h-full z-10" />
      ) : (
        /* ---------------- Offline Tactical Vector Grid Fallback ---------------- */
        <div className="w-full h-full relative bg-[#090D16] select-none overflow-hidden flex items-center justify-center">
          <svg className="w-full h-full" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid meet">
            <defs>
              {/* Tactical grid pattern */}
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1E293B" strokeWidth="0.8" opacity="0.6" />
              </pattern>
              {/* Slurry mud pattern for hazard */}
              <pattern id="mudflow" width="10" height="10" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="10" y2="10" stroke="#7F1D1D" strokeWidth="1.5" opacity="0.7" />
              </pattern>
            </defs>

            {/* Background Grid */}
            <rect width="1000" height="600" fill="url(#grid)" />

            {/* Simulated Topographic Elevation Contours */}
            <path d="M 0,150 Q 250,110 500,160 T 1000,140" fill="none" stroke="#1E3A5F" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.4" />
            <path d="M 0,280 Q 250,240 500,290 T 1000,270" fill="none" stroke="#1E3A5F" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.4" />
            <path d="M 0,420 Q 250,380 500,430 T 1000,410" fill="none" stroke="#1E3A5F" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.4" />

            {/* Main River / Drainage Valley */}
            <path
              d="M 120,600 C 180,480 320,380 440,240 S 680,120 850,0"
              fill="none"
              stroke="#0369A1"
              strokeWidth="14"
              strokeLinecap="round"
              opacity="0.3"
            />
            <path
              d="M 120,600 C 180,480 320,380 440,240 S 680,120 850,0"
              fill="none"
              stroke="#0284C7"
              strokeWidth="4"
              strokeDasharray="8 4"
              opacity="0.7"
            />
            <text x="360" y="310" fill="#38BDF8" fontSize="11" fontWeight="bold" opacity="0.6" transform="rotate(-35, 360, 310)">
              Meppadi Mountain Torrent Stream
            </text>

            {/* Road Network */}
            {/* Primary Arterial Road */}
            <path d="M 80,80 L 350,150 L 520,240 L 750,320 L 920,480" fill="none" stroke="#475569" strokeWidth="8" strokeLinecap="round" />
            <path d="M 80,80 L 350,150 L 520,240 L 750,320 L 920,480" fill="none" stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="6 6" />

            {/* Secondary Bridge Road */}
            <path d="M 450,220 L 450,420 L 680,520" fill="none" stroke="#475569" strokeWidth="6" strokeLinecap="round" />

            {/* Render Blocked Roads */}
            {showRoads && (
              <>
                {/* Roadblock 1: Mud debris on arterial */}
                <line x1="380" y1="165" x2="480" y2="215" stroke="#EF4444" strokeWidth="9" strokeDasharray="8 6" />
                <rect x="400" y="150" width="75" height="18" rx="4" fill="#991B1B" stroke="#FCA5A5" strokeWidth="1" />
                <text x="406" y="163" fill="#FFF" fontSize="9" fontWeight="bold">BLOCKED DEBRIS</text>

                {/* Roadblock 2: Collapsed bridge */}
                <line x1="440" y1="310" x2="460" y2="350" stroke="#EF4444" strokeWidth="9" strokeDasharray="8 6" />
                <rect x="420" y="325" width="85" height="18" rx="4" fill="#991B1B" stroke="#FCA5A5" strokeWidth="1" />
                <text x="425" y="338" fill="#FFF" fontSize="9" fontWeight="bold">BRIDGE COLLAPSED</text>
              </>
            )}

            {/* Render 6 Search Zones (covering 20 structures) */}
            {showZones &&
              zones.map((zone) => {
                const isSelected = selectedZoneId === zone.id;
                const score = zone.active_priority_score;
                const strokeColor = getScoreColor(score);

                // Predefined sector coordinates for the 6 zones in the 1000x600 tactical canvas
                let x = 100, y = 100, w = 180, h = 140, structLabels = ['#1', '#2', '#3', '#4'];
                if (zone.code === 'Z-01') {
                  // Zone Alpha: Tea Estate Quarters
                  x = 160; y = 70; w = 210; h = 150;
                  structLabels = ['Q-1', 'Q-2 (TRAPPED)', 'Q-3', 'Q-4'];
                } else if (zone.code === 'Z-02') {
                  // Zone Bravo: Primary School & Market
                  x = 450; y = 70; w = 240; h = 150;
                  structLabels = ['Mkt-5', 'Mkt-6', 'School-7', 'Store-8'];
                } else if (zone.code === 'Z-03') {
                  // Zone Charlie: Hillside Enclave (CONFLICT)
                  x = 220; y = 260; w = 230; h = 160;
                  structLabels = ['Hse-9', 'Hse-10', 'Hse-11 (CONFLICT)', 'Hse-12'];
                } else if (zone.code === 'Z-04') {
                  // Zone Delta: Temple Relief Shelter
                  x = 690; y = 130; w = 230; h = 160;
                  structLabels = ['Temple-13', 'Hall-14', 'Camp-15'];
                } else if (zone.code === 'Z-05') {
                  // Zone Echo: Forest Depot
                  x = 60; y = 320; w = 190; h = 160;
                  structLabels = ['Depot-16', 'Timber-17'];
                } else if (zone.code === 'Z-06') {
                  // Zone Foxtrot: Valley Bridgehead
                  x = 520; y = 350; w = 240; h = 160;
                  structLabels = ['Auto-18', 'Auto-19', 'Shed-20'];
                }

                return (
                  <g
                    key={zone.id}
                    className="cursor-pointer transition-all duration-200"
                    onClick={() => onSelectZone(zone.id)}
                  >
                    {/* Zone Boundary Box */}
                    <rect
                      x={x}
                      y={y}
                      width={w}
                      height={h}
                      rx="8"
                      fill={strokeColor}
                      fillOpacity={isSelected ? 0.28 : 0.12}
                      stroke={strokeColor}
                      strokeWidth={isSelected ? 3.5 : 1.8}
                      strokeDasharray={isSelected ? 'none' : '4 2'}
                    />

                    {/* Zone Header Badge */}
                    <rect
                      x={x + 6}
                      y={y + 6}
                      width={w - 12}
                      height="22"
                      rx="4"
                      fill="#0F172A"
                      stroke={strokeColor}
                      strokeWidth="1"
                    />
                    <text x={x + 12} y={y + 21} fill="#F8FAFC" fontSize="11" fontWeight="bold">
                      {zone.code}: {zone.name.split('(')[0].trim().slice(0, 18)}
                    </text>
                    <text x={x + w - 16} y={y + 21} fill={strokeColor} fontSize="11" fontWeight="black" textAnchor="end">
                      {score.toFixed(1)}
                    </text>

                    {/* 20 Building Footprints within the Zones */}
                    {structLabels.map((lbl, idx) => {
                      const bx = x + 16 + (idx % 2) * 90;
                      const by = y + 40 + Math.floor(idx / 2) * 45;
                      const isDanger = lbl.includes('TRAPPED') || lbl.includes('CONFLICT');

                      return (
                        <g key={lbl}>
                          <rect
                            x={bx}
                            y={by}
                            width="75"
                            height="34"
                            rx="4"
                            fill={isDanger ? '#7F1D1D' : '#1E293B'}
                            stroke={isDanger ? '#EF4444' : '#475569'}
                            strokeWidth={isDanger ? 1.5 : 1}
                          />
                          <text
                            x={bx + 37}
                            y={by + 20}
                            fill={isDanger ? '#FCA5A5' : '#94A3B8'}
                            fontSize="8.5"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            {lbl}
                          </text>
                        </g>
                      );
                    })}

                    {/* Rank Badge */}
                    <circle cx={x + w - 6} cy={y + h - 6} r="12" fill={strokeColor} />
                    <text x={x + w - 6} y={y + h - 2} fill="#FFF" fontSize="10" fontWeight="black" textAnchor="middle">
                      #{zone.rank}
                    </text>
                  </g>
                );
              })}

            {/* Render Hazards */}
            {showHazards && (
              <>
                {/* Hazard 1: Active Slurry Landslide */}
                <circle cx="340" cy="230" r="45" fill="url(#mudflow)" stroke="#DC2626" strokeWidth="2" strokeDasharray="3 3" />
                <circle cx="340" cy="230" r="16" fill="#991B1B" />
                <text x="340" y="235" fill="#FFF" fontSize="11" fontWeight="bold" textAnchor="middle">⚠️</text>
                <text x="340" y="290" fill="#FCA5A5" fontSize="10" fontWeight="bold" textAnchor="middle">
                  Active Slope Creep (Debris)
                </text>

                {/* Hazard 2: Snapped 11kV Powerline */}
                <circle cx="510" cy="180" r="28" fill="#78350F" fillOpacity="0.4" stroke="#F59E0B" strokeWidth="2" strokeDasharray="3 3" />
                <text x="510" y="184" fill="#FDE68A" fontSize="13" fontWeight="bold" textAnchor="middle">⚡</text>
                <text x="510" y="220" fill="#FCD34D" fontSize="9.5" fontWeight="bold" textAnchor="middle">
                  Live 11kV Line
                </text>
              </>
            )}

            {/* Render Rescue Teams */}
            {showTeams && (
              <>
                {/* Team 1: NDRF 04 - Canine Unit */}
                <g transform="translate(180, 40)">
                  <circle cx="16" cy="16" r="15" fill="#0284C7" stroke="#FFF" strokeWidth="2" />
                  <text x="16" y="21" fill="#FFF" fontSize="12" textAnchor="middle">🐕</text>
                  <rect x="-35" y="34" width="105" height="18" rx="3" fill="#0F172A" stroke="#0284C7" strokeWidth="1" />
                  <text x="17" y="46" fill="#38BDF8" fontSize="8.5" fontWeight="bold" textAnchor="middle">NDRF K9 Team 04</text>
                </g>

                {/* Team 2: SDRF Heavy Breach */}
                <g transform="translate(560, 40)">
                  <circle cx="16" cy="16" r="15" fill="#EA580C" stroke="#FFF" strokeWidth="2" />
                  <text x="16" y="21" fill="#FFF" fontSize="12" textAnchor="middle">🚜</text>
                  <rect x="-40" y="34" width="112" height="18" rx="3" fill="#0F172A" stroke="#EA580C" strokeWidth="1" />
                  <text x="16" y="46" fill="#FB923C" fontSize="8.5" fontWeight="bold" textAnchor="middle">SDRF Heavy Breach 11</text>
                </g>

                {/* Team 3: Medical Evac */}
                <g transform="translate(850, 240)">
                  <circle cx="16" cy="16" r="15" fill="#10B981" stroke="#FFF" strokeWidth="2" />
                  <text x="16" y="21" fill="#FFF" fontSize="12" textAnchor="middle">🚑</text>
                  <rect x="-35" y="34" width="102" height="18" rx="3" fill="#0F172A" stroke="#10B981" strokeWidth="1" />
                  <text x="16" y="46" fill="#34D399" fontSize="8.5" fontWeight="bold" textAnchor="middle">108 Medical Unit</text>
                </g>
              </>
            )}
          </svg>

          {/* Tactical Fallback Watermark */}
          <div className="absolute bottom-3 left-3 bg-slate-900/90 border border-slate-700/80 px-2.5 py-1 rounded text-[11px] text-slate-300 font-mono shadow-md">
            🛡️ Local Offline Tactical Grid (Zero-Cloud Fallback Active)
          </div>
        </div>
      )}

      {/* Map Legend Footer */}
      <div className="bg-slate-900/95 border-t border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs z-20">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-slate-400 font-medium">Priority Scale:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500 inline-block shadow-sm shadow-red-500/50" />
            <span className="text-slate-300 font-semibold">Critical Rescue (≥ 75)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block shadow-sm shadow-amber-500/50" />
            <span className="text-slate-300 font-medium">High Search (50–74)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
            <span className="text-slate-300 font-medium">Monitored (&lt; 50)</span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-slate-400">
          <span className="flex items-center gap-1">
            <span className="text-red-400 font-bold">⚠️</span> Hazards Active: <b className="text-slate-200">{hazards.length}</b>
          </span>
          <span className="flex items-center gap-1">
            <span className="text-rose-400 font-bold">⛔</span> Blocked Roads: <b className="text-slate-200">{roads.length}</b>
          </span>
          <span className="flex items-center gap-1">
            <span className="text-sky-400 font-bold">🚒</span> Rescue Teams: <b className="text-slate-200">{teams.length}</b>
          </span>
        </div>
      </div>
    </div>
  );
};
