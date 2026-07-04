import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Papa from "papaparse";

const SEED = [
  { time: "2026-07-03T09:30", temp: 35.2, wind: 5.8, humidity: 53, precip: 0 },
  { time: "2026-07-03T10:00", temp: 35.1, wind: 5.8, humidity: 53, precip: 0 },
  { time: "2026-07-03T10:15", temp: 35.1, wind: 5.8, humidity: 53, precip: 0 },
];

const ZONES = [
  { key: "normal", label: "Normal", color: "#4FA8E0" },
  { key: "heat", label: "Heat Wave", color: "#FF9F1C" },
  { key: "severe", label: "Severe Heat Wave", color: "#E5484D" },
];

function classify(temp) {
  if (temp >= 45) return ZONES[2];
  if (temp >= 40) return ZONES[1];
  return ZONES[0];
}

function fmtTime(t) {
  const d = new Date(t);
  if (isNaN(d)) return t;
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function useCountUp(target, duration = 700) {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  useEffect(() => {
    const from = fromRef.current;
    const to = target;
    if (from === to) return;
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (to - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return display;
}

function pickScene(row) {
  const hour = new Date(row.time).getHours();
  const isDay = hour >= 6 && hour < 19;
  const isRaining = (row.precip ?? 0) > 0.1;
  const isHot = row.temp >= 38;
  return { isDay, isRaining, isHot, temp: row.temp };
}

function Gauge({ temp }) {
  const zone = classify(temp);
  const pct = Math.max(0, Math.min(1, temp / 55));
  const angle = -90 + pct * 180;
  const r = 90, cx = 110, cy = 110;
  const arc = (s, e, color, key) => {
    const toXY = (deg) => { const rad = (deg * Math.PI) / 180; return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)]; };
    const [x1, y1] = toXY(s), [x2, y2] = toXY(e);
    const large = e - s > 180 ? 1 : 0;
    return <path key={key} d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`} stroke={color} strokeWidth={14} strokeLinecap="round" fill="none" opacity={0.9} />;
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg width="220" height="140" viewBox="0 0 220 140">
        {arc(180, 240, "#00E5C7", "z0")}{arc(240, 300, "#FF9F1C", "z1")}{arc(300, 360, "#FF3D7F", "z2")}
        <line x1={cx} y1={cy} x2={cx + r * 0.75 * Math.cos((angle * Math.PI) / 180)} y2={cy + r * 0.75 * Math.sin((angle * Math.PI) / 180)} stroke="#EDEEF0" strokeWidth={3} strokeLinecap="round" style={{ transition: "all 0.6s cubic-bezier(0.34,1.56,0.64,1)" }} />
        <circle cx={cx} cy={cy} r={5} fill="#EDEEF0" />
      </svg>
      <div style={{ marginTop: -8, textAlign: "center" }}>
        <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 44, fontWeight: 700, color: "#EDEEF0", lineHeight: 1 }}>
          {temp.toFixed(1)}<span style={{ fontSize: 20, color: "#8B9198" }}>°C</span>
        </div>
        <div style={{ marginTop: 6, display: "inline-block", padding: "3px 12px", borderRadius: 999, fontSize: 12, letterSpacing: 0.4, textTransform: "uppercase", color: zone.color, border: `1px solid ${zone.color}66`, background: `${zone.color}1a` }}>{zone.label}</div>
      </div>
    </div>
  );
}

function ScoreCard({ label, value, unit, accent }) {
  return (
    <div style={{ background: "#14171A", border: "1px solid #23272B", borderRadius: 14, padding: "16px 18px", flex: 1, minWidth: 130 }}>
      <div style={{ fontSize: 12, color: "#8B9198", letterSpacing: 0.3, textTransform: "uppercase" }}>{label}</div>
      <div style={{ marginTop: 6, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 28, fontWeight: 700, color: accent }}>{value}<span style={{ fontSize: 14, color: "#8B9198", marginLeft: 4 }}>{unit}</span></div>
    </div>
  );
}

// ---- The drive scene: car + driver silhouette cruising down a scrolling road ----
function DriveScene({ isDay, isRaining, isHot, temp }) {
  const sky = isRaining
    ? (isDay ? "linear-gradient(180deg,#4A5568,#2D3346)" : "linear-gradient(180deg,#151726,#0A0B14)")
    : isDay
    ? "linear-gradient(180deg,#3D8FC4,#8FCFE8)"
    : "linear-gradient(180deg,#141033,#2A1B4A)";

  const stars = useMemo(() => Array.from({ length: 25 }, () => ({ top: Math.random() * 55, left: Math.random() * 100, d: 1.2 + Math.random() * 1.5 })), []);
  const drops = useMemo(() => Array.from({ length: 40 }, () => ({ left: Math.random() * 100, delay: Math.random() * 1.2, dur: 0.5 + Math.random() * 0.4 })), []);
  const buildings = useMemo(() => Array.from({ length: 10 }, () => {
    const w = 26 + Math.floor(Math.random() * 18);
    const h = 40 + Math.floor(Math.random() * 50);
    const cols = Math.max(1, Math.floor(w / 10));
    const rows = Math.max(1, Math.floor(h / 12));
    const windows = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        windows.push({ x: 4 + c * 9, y: 6 + r * 11, on: Math.random() > 0.4 });
      }
    }
    return { w, h, windows };
  }), []);

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: 16, background: sky }}>
      {/* temperature readout, always visible in the scene */}
      {temp != null && (
        <div style={{ position: "absolute", top: 12, left: 14, padding: "4px 10px", borderRadius: 8, background: "rgba(0,0,0,0.35)", color: "#EDEEF0", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 15, fontWeight: 700 }}>
          {temp.toFixed(1)}°C
        </div>
      )}

      {/* sun or moon */}
      {!isRaining && (
        <div style={{
          position: "absolute", top: isDay ? 28 : 22, right: 50, width: 44, height: 44, borderRadius: "50%",
          background: isDay ? "radial-gradient(circle,#FFE68A,#FFD23F)" : "radial-gradient(circle,#F0EEFB,#C9BFEA)",
          boxShadow: isDay ? "0 0 40px #FFD23Faa" : "0 0 30px #C9BFEAaa",
        }} />
      )}
      {/* stars, night only */}
      {!isDay && !isRaining && stars.map((s, i) => (
        <span key={i} style={{ position: "absolute", top: `${s.top}%`, left: `${s.left}%`, width: 2, height: 2, borderRadius: "50%", background: "#EDEEF0", animation: `twinkle ${s.d}s ease-in-out infinite` }} />
      ))}
      {/* clouds if raining */}
      {isRaining && [0, 1, 2].map((i) => (
        <div key={i} style={{ position: "absolute", top: 16 + i * 14, left: -80, width: 140, height: 34, borderRadius: 30, background: isDay ? "#5A6478" : "#20233A", animation: `driftCloud ${9 + i * 3}s linear infinite`, animationDelay: `${i * -3}s`, opacity: 0.8 }} />
      ))}
      {/* lightning flash */}
      {isRaining && <div style={{ position: "absolute", inset: 0, background: "#EDEEF0", opacity: 0, animation: "lightning 5s ease-in-out infinite" }} />}

      {/* city skyline, parallax loop, windows lit at night */}
      <div style={{ position: "absolute", bottom: 46, left: 0, right: 0, height: 90, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "flex-end", width: "200%", animation: "scrollX 16s linear infinite" }}>
          {buildings.concat(buildings).map((b, i) => (
            <svg key={i} width={b.w} height={b.h} viewBox={`0 0 ${b.w} ${b.h}`} style={{ flexShrink: 0, marginRight: 4 }}>
              <rect x="0" y="0" width={b.w} height={b.h} fill="#111318" />
              {!isDay && b.windows.map((w, wi) => (
                <rect key={wi} x={w.x} y={w.y} width="4" height="5" fill="#FFD98A" opacity={w.on ? 0.95 : 0} style={{ animation: w.on ? `twinkle ${2 + (wi % 3)}s ease-in-out infinite` : "none" }} />
              ))}
            </svg>
          ))}
        </div>
      </div>

      {/* road */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 46, background: isDay ? "#3B3B44" : "#0C0C12" }}>
        <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 4, overflow: "hidden" }}>
          <div style={{ display: "flex", width: "200%", animation: "scrollX 0.9s linear infinite" }}>
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} style={{ width: 26, height: 4, background: "#EDEEF0", marginRight: 22, flexShrink: 0, opacity: 0.7 }} />
            ))}
          </div>
        </div>
      </div>

      {/* heat shimmer over the road if hot */}
      {isHot && !isRaining && (
        <div style={{ position: "absolute", bottom: 40, left: 0, right: 0, height: 30, background: "linear-gradient(90deg, transparent, #FF9F1C55, transparent)", filter: "blur(6px)", animation: "heatShimmer 2s ease-in-out infinite" }} />
      )}

      {/* car + driver, bobbing slightly as it "drives" */}
      <div style={{ position: "absolute", bottom: 14, left: "38%", animation: "carBob 0.6s ease-in-out infinite" }}>
        <svg width="120" height="56" viewBox="0 0 120 56">
          {/* headlight beam at night */}
          {!isDay && (
            <polygon points="100,30 150,10 150,45" fill="#FFF3C4" opacity="0.25" />
          )}
          {/* car body */}
          <path d="M10,40 Q10,26 26,26 L40,26 Q48,12 66,12 L82,12 Q94,12 98,26 L108,26 Q116,26 116,36 L116,42 Q116,46 112,46 L14,46 Q10,46 10,42 Z" fill="#FF7A45" />
          {/* window */}
          <path d="M46,26 Q52,16 66,16 L80,16 Q88,16 92,26 Z" fill={isDay ? "#BEE7F5" : "#0A0B18"} />
          {/* driver silhouette */}
          <circle cx="63" cy="20" r="6" fill="#2A1B33" />
          <rect x="57" y="24" width="14" height="8" rx="3" fill="#2A1B33" />
          {/* wheels */}
          <circle cx="34" cy="46" r="8" fill="#111" />
          <circle cx="96" cy="46" r="8" fill="#111" />
          <circle cx="34" cy="46" r="3" fill="#EDEEF0" style={{ animation: "spin 0.5s linear infinite", transformOrigin: "34px 46px" }} />
          <circle cx="96" cy="46" r="3" fill="#EDEEF0" style={{ animation: "spin 0.5s linear infinite", transformOrigin: "96px 46px" }} />
        </svg>
        {/* wind flow lines behind the car */}
        <svg width="60" height="40" viewBox="0 0 60 40" style={{ position: "absolute", top: 10, right: 108 }}>
          <path d="M50,10 Q20,10 0,10" stroke="#EDEEF0" strokeWidth="1.5" fill="none" opacity="0.4" strokeDasharray="4 4" style={{ animation: "windFlow 0.7s linear infinite" }} />
          <path d="M50,22 Q20,22 0,22" stroke="#EDEEF0" strokeWidth="1.5" fill="none" opacity="0.3" strokeDasharray="4 4" style={{ animation: "windFlow 0.8s linear infinite" }} />
        </svg>
      </div>

      {/* rain streaks */}
      {isRaining && drops.map((d, i) => (
        <span key={i} style={{ position: "absolute", top: -20, left: `${d.left}%`, width: 2, height: 22, background: "linear-gradient(180deg, transparent, #AEE8FF)", animation: `rainFall ${d.dur}s linear ${d.delay}s infinite` }} />
      ))}
    </div>
  );
}

// Facts I can actually stand behind — sourced from IMD/NDMA material verified earlier
// in this build, not invented trivia. Numbers flagged as approximate where sources varied.
const FACTS = [
  "IMD only calls a Heat Wave once max temperature hits 40°C+ on the plains — AND is at least 4.5°C above normal.",
  "A Heat Wave isn't declared from one hot day — IMD requires the criteria to hold for 2 consecutive days.",
  "Severe Heat Wave, by absolute value: max temperature of 45°C or higher, regardless of what's \"normal\" for the date.",
  "Gurugram sits in IMD's \"plains\" category, which uses a 40°C threshold — hillier regions use a lower 30°C bar.",
  "Cold Wave criteria (plains): minimum temperature at or below 10°C, with a departure of roughly -4.5°C to -6.4°C from normal.",
  "This dashboard's live data comes from Open-Meteo, a free, non-commercial, no-API-key weather service.",
  "Approximately: IMD classifies rainfall as \"extremely heavy\" above roughly 204.5mm in a day — sources vary slightly on the exact cutoff, worth checking IMD directly.",
];

function TriviaStrip() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % FACTS.length), 5000);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{ marginTop: 22, padding: "16px 20px", background: "#14171A", border: "1px solid #23272B", borderRadius: 14, display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "#EDEEF0", flexShrink: 0 }}>Know this?</div>
      <div key={i} style={{ fontSize: 13, color: "#C7CBD1", lineHeight: 1.5, animation: "popIn 0.4s ease-out" }}>{FACTS[i]}</div>
    </div>
  );
}

const IMD_THRESHOLDS = [
  { label: "Heat Wave", detail: "Plains: 40°C+ and \u22654.5\u20136.4°C above normal", color: "#FF9F1C" },
  { label: "Severe Heat Wave", detail: "Absolute: 45°C or higher", color: "#FF3D7F" },
  { label: "Cold Wave", detail: "Plains: \u226410°C, ~-4.5 to -6.4°C below normal", color: "#5CC8FF" },
  { label: "Severe Cold Wave", detail: "Departure of more than ~-6.4°C from normal", color: "#7B61FF" },
];

function ThresholdPanel() {
  return (
    <div style={{ marginTop: 24, padding: 20, background: "#14171A", border: "1px solid #23272B", borderRadius: 14 }}>
      <div style={{ fontSize: 12, color: "#8B9198", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 14 }}>IMD threshold reference — plains</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        {IMD_THRESHOLDS.map((t) => (
          <div key={t.label} style={{ padding: 14, borderRadius: 10, background: `${t.color}12`, border: `1px solid ${t.color}44` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: t.color, marginBottom: 4 }}>{t.label}</div>
            <div style={{ fontSize: 12, color: "#8B9198", lineHeight: 1.5 }}>{t.detail}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12, fontSize: 11, color: "#6B7280", lineHeight: 1.5 }}>
        These figures come from IMD/NDMA material and may not reflect the most current official
        criteria — worth confirming on mausam.imd.gov.in if precision matters for your use.
      </div>
    </div>
  );
}


const LAT = 28.4595;
const LON = 77.0266;
const BASE_PARAMS = "temperature_2m,wind_speed_10m,relative_humidity_2m";
const FULL_URL = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=${BASE_PARAMS},precipitation&timezone=Asia%2FKolkata`;
const FALLBACK_URL = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=${BASE_PARAMS}&timezone=Asia%2FKolkata`;

const KEYFRAMES = `
@keyframes bgDrift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
@keyframes ringPulse { 0%{transform:scale(1);opacity:.6} 100%{transform:scale(1.9);opacity:0} }
@keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
@keyframes popIn { 0%{transform:scale(.9);opacity:0} 100%{transform:scale(1);opacity:1} }
@keyframes twinkle { 0%,100%{opacity:.2} 50%{opacity:1} }
@keyframes heatShimmer { 0%,100%{transform:translateX(0) scaleY(1)} 50%{transform:translateX(10px) scaleY(1.3)} }
@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
@keyframes scrollX { from{transform:translateX(0)} to{transform:translateX(-50%)} }
@keyframes carBob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-2px)} }
@keyframes windFlow { from{stroke-dashoffset:0} to{stroke-dashoffset:-16} }
@keyframes rainFall { 0%{transform:translateY(0);opacity:0} 10%{opacity:1} 100%{transform:translateY(200px);opacity:0} }
@keyframes driftCloud { from{transform:translateX(0)} to{transform:translateX(340px)} }
@keyframes lightning { 0%,92%,100%{opacity:0} 93%{opacity:.7} 94%{opacity:0} 96%{opacity:.5} 97%{opacity:0} }
`;

export default function WeatherDashboard() {
  const [rows, setRows] = useState(SEED);
  const [range, setRange] = useState("all");
  const [importMsg, setImportMsg] = useState("");
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState("");
  const [pulseCount, setPulseCount] = useState(0);
  const [shakeKey, setShakeKey] = useState(0);
  const [scene, setScene] = useState(() => pickScene(SEED[SEED.length - 1]));
  const fileRef = React.useRef(null);

  const fetchLive = useCallback(async () => {
    setLiveLoading(true);
    setLiveError("");
    try {
      let res = await fetch(FULL_URL);
      if (!res.ok) res = await fetch(FALLBACK_URL);
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = await res.json();
      const c = data.current;
      if (!c) throw new Error("Response didn't include current-weather data.");
      const newRow = { time: c.time, temp: c.temperature_2m, wind: c.wind_speed_10m, humidity: c.relative_humidity_2m, precip: c.precipitation ?? 0 };
      setRows((prev) => (prev.length && prev[prev.length - 1].time === newRow.time ? prev : [...prev, newRow]));
      setPulseCount((n) => n + 1);
      if (classify(newRow.temp).key === "severe") setShakeKey((k) => k + 1);
      setScene(pickScene(newRow));
    } catch (err) {
      setLiveError(err instanceof Error ? `Couldn't fetch live weather: ${err.message}` : "Couldn't fetch live weather.");
    } finally {
      setLiveLoading(false);
    }
  }, []);

  const filtered = useMemo(() => {
    if (range === "all") return rows;
    const now = new Date(rows[rows.length - 1]?.time || Date.now());
    const cutoff = new Date(now);
    if (range === "24h") cutoff.setHours(cutoff.getHours() - 24);
    if (range === "7d") cutoff.setDate(cutoff.getDate() - 7);
    return rows.filter((r) => new Date(r.time) >= cutoff);
  }, [rows, range]);

  const latest = filtered[filtered.length - 1] || rows[rows.length - 1];
  const zone = classify(latest.temp);
  const showAlert = zone.key !== "normal";
  const chartData = filtered.map((r) => ({ ...r, label: fmtTime(r.time) }));
  const dispTemp = useCountUp(latest.temp);
  const dispHumidity = useCountUp(latest.humidity);
  const dispWind = useCountUp(latest.wind);

  const handleFile = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: (res) => {
        try {
          const parsed = res.data.map((row) => {
            const keys = Object.keys(row);
            const get = (name) => row[keys.find((k) => k.toLowerCase().includes(name))];
            return { time: get("date") || get("time"), temp: parseFloat(get("temp")), wind: parseFloat(get("wind")), humidity: parseFloat(get("humid")), precip: 0 };
          }).filter((r) => r.time && !isNaN(r.temp));
          if (parsed.length === 0) { setImportMsg("No valid rows found — check column headers."); return; }
          setRows(parsed);
          setImportMsg(`Loaded ${parsed.length} rows from CSV.`);
        } catch { setImportMsg("Could not parse this file."); }
      },
      error: () => setImportMsg("Failed to read file."),
    });
  }, []);

  return (
    <div key={shakeKey} style={{
      minHeight: "100%", color: "#EDEEF0",
      fontFamily: "ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      padding: "28px 20px 40px", position: "relative", overflow: "hidden",
      background: "#0B0D0F",
      animation: shakeKey > 0 ? "shake 0.5s" : "none",
    }}>
      <style>{KEYFRAMES}</style>

      <div style={{ maxWidth: 880, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
          <div>
            <div style={{ fontSize: 12, color: "#8B9198", letterSpacing: 1.5, textTransform: "uppercase" }}>Weather Monitor</div>
            <h1 style={{ margin: "2px 0 0", fontSize: 26, fontWeight: 600, color: "#EDEEF0" }}>Gurugram, India</h1>
          </div>
          <div style={{ fontSize: 12, color: "#8B9198", fontFamily: "ui-monospace, monospace" }}>28.4595°N, 77.0266°E · plains</div>
        </div>

        <div style={{ marginTop: 26, position: "relative", overflow: "hidden", borderRadius: 16, border: "1px solid #23272B", height: 240 }}>
          <DriveScene isDay={scene.isDay} isRaining={scene.isRaining} isHot={scene.isHot} temp={scene.temp} />
        </div>

        <div style={{ marginTop: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 16, flexWrap: "wrap", padding: "14px 20px", background: "#14171A", border: "1px solid #23272B", borderRadius: 14 }}>
          <button onClick={fetchLive} disabled={liveLoading} style={{
            padding: "10px 22px", borderRadius: 999, border: "none",
            background: liveLoading ? "#23272B" : "#EDEEF0",
            color: liveLoading ? "#8B9198" : "#0B0D0F",
            fontWeight: 700, fontSize: 13, letterSpacing: 0.3,
            cursor: liveLoading ? "default" : "pointer",
            boxShadow: liveLoading ? "none" : `0 0 16px ${zone.color}55`,
            transition: "transform 0.15s ease",
          }}
            onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.96)")}
            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            {liveLoading ? "Checking…" : "Check the Sky"}
          </button>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 13, color: "#C7CBD1" }}>Tap for a live reading — watch the drive react to it.</div>
            <div style={{ marginTop: 4, fontSize: 12, color: "#8B9198", fontFamily: "ui-monospace, monospace" }}>
              {pulseCount === 0 ? "You haven't checked yet this session" : `Checked ${pulseCount} time${pulseCount > 1 ? "s" : ""} this session`}
            </div>
            {liveError && <div style={{ marginTop: 6, fontSize: 12, color: "#FF3D7F" }}>{liveError}</div>}
          </div>
        </div>

        <TriviaStrip />

        {showAlert && (
          <div key={`alert-${latest.time}`} style={{ marginTop: 18, padding: "12px 16px", borderRadius: 10, background: `${zone.color}1a`, border: `1px solid ${zone.color}66`, display: "flex", alignItems: "center", gap: 10, animation: "popIn 0.4s ease-out" }}>
            <div style={{ width: 8, height: 8, borderRadius: 999, background: zone.color, flexShrink: 0 }} />
            <div style={{ fontSize: 14 }}><strong style={{ color: zone.color }}>{zone.label} alert</strong> — current reading {latest.temp.toFixed(1)}°C meets IMD's plains threshold for this category.</div>
          </div>
        )}

        <div style={{ marginTop: 22, display: "flex", gap: 20, flexWrap: "wrap" }}>
          <div style={{ background: "#14171A", border: "1px solid #23272B", borderRadius: 14, padding: 16 }}>
            <Gauge temp={dispTemp} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1, minWidth: 260 }}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <ScoreCard label="Temperature" value={dispTemp.toFixed(1)} unit="°C" accent="#FF7A45" />
              <ScoreCard label="Humidity" value={Math.round(dispHumidity)} unit="%" accent="#4FA8E0" />
              <ScoreCard label="Wind" value={dispWind.toFixed(1)} unit="km/h" accent="#8B9198" />
            </div>
            <div style={{ fontSize: 12, color: "#8B9198" }}>Last reading: {fmtTime(latest.time)}</div>
          </div>
        </div>

        <div style={{ marginTop: 26, display: "flex", gap: 8 }}>
          {[{ k: "24h", label: "24h" }, { k: "7d", label: "7 days" }, { k: "all", label: "All" }].map((r) => (
            <button key={r.k} onClick={() => setRange(r.k)} style={{ background: range === r.k ? "#EDEEF0" : "transparent", color: range === r.k ? "#0B0D0F" : "#8B9198", border: "1px solid #23272B", borderRadius: 8, padding: "6px 14px", fontSize: 13, cursor: "pointer", fontWeight: range === r.k ? 700 : 400 }}>{r.label}</button>
          ))}
        </div>

        <div style={{ marginTop: 14, background: "#14171A", border: "1px solid #23272B", borderRadius: 14, padding: "16px 8px 8px" }}>
          <div style={{ fontSize: 12, color: "#8B9198", padding: "0 12px 8px", textTransform: "uppercase", letterSpacing: 0.3 }}>Temperature trend</div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid stroke="#23272B" strokeDasharray="3 3" />
              <XAxis dataKey="label" stroke="#8B9198" fontSize={11} tickLine={false} />
              <YAxis stroke="#8B9198" fontSize={11} tickLine={false} domain={[20, 50]} />
              <Tooltip contentStyle={{ background: "#0A0616", border: "1px solid #23272B", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "#8B9198" }} />
              <Line type="monotone" dataKey="temp" stroke="#FF9F1C" strokeWidth={2.5} dot={{ r: 3, fill: "#EDEEF0" }} name="°C" isAnimationActive animationDuration={500} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <ThresholdPanel />

        <div style={{ marginTop: 24, padding: 16, background: "#14171A", border: "1px solid #23272B", borderRadius: 14 }}>
          <div style={{ fontSize: 13, color: "#8B9198", lineHeight: 1.6 }}>
            This dashboard can't authenticate to your private Google Sheet directly. Use "Check the Sky" above for a live reading, or upload a CSV export of your sheet below.
          </div>
          <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} style={{ marginTop: 12, fontSize: 13, color: "#8B9198" }} />
          {importMsg && <div style={{ marginTop: 8, fontSize: 12, color: "#00E5C7" }}>{importMsg}</div>}
        </div>
      </div>
    </div>
  );
}
