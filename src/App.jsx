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
  { key: "normal", label: "Normal", color: "#00E5C7" },
  { key: "heat", label: "Heat Wave", color: "#FF9F1C" },
  { key: "severe", label: "Severe Heat Wave", color: "#FF3D7F" },
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
  return { isDay, isRaining, isHot };
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
        <line x1={cx} y1={cy} x2={cx + r * 0.75 * Math.cos((angle * Math.PI) / 180)} y2={cy + r * 0.75 * Math.sin((angle * Math.PI) / 180)} stroke="#F5F0FF" strokeWidth={3} strokeLinecap="round" style={{ transition: "all 0.6s cubic-bezier(0.34,1.56,0.64,1)" }} />
        <circle cx={cx} cy={cy} r={5} fill="#F5F0FF" />
      </svg>
      <div style={{ marginTop: -8, textAlign: "center" }}>
        <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 44, fontWeight: 700, color: "#F5F0FF", lineHeight: 1 }}>
          {temp.toFixed(1)}<span style={{ fontSize: 20, color: "#B8AEDB" }}>°C</span>
        </div>
        <div style={{ marginTop: 6, display: "inline-block", padding: "3px 12px", borderRadius: 999, fontSize: 12, letterSpacing: 0.4, textTransform: "uppercase", color: zone.color, border: `1px solid ${zone.color}66`, background: `${zone.color}1a` }}>{zone.label}</div>
      </div>
    </div>
  );
}

function ScoreCard({ label, value, unit, accent }) {
  return (
    <div style={{ background: "rgba(20,12,34,0.7)", backdropFilter: "blur(6px)", border: "1px solid #3A2A5C", borderRadius: 14, padding: "16px 18px", flex: 1, minWidth: 130 }}>
      <div style={{ fontSize: 12, color: "#B8AEDB", letterSpacing: 0.3, textTransform: "uppercase" }}>{label}</div>
      <div style={{ marginTop: 6, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 28, fontWeight: 700, color: accent }}>{value}<span style={{ fontSize: 14, color: "#B8AEDB", marginLeft: 4 }}>{unit}</span></div>
    </div>
  );
}

// ---- The drive scene: car + driver silhouette cruising down a scrolling road ----
function DriveScene({ isDay, isRaining, isHot }) {
  const sky = isRaining
    ? (isDay ? "linear-gradient(180deg,#4A5568,#2D3346)" : "linear-gradient(180deg,#151726,#0A0B14)")
    : isDay
    ? "linear-gradient(180deg,#3D8FC4,#8FCFE8)"
    : "linear-gradient(180deg,#141033,#2A1B4A)";

  const stars = useMemo(() => Array.from({ length: 25 }, () => ({ top: Math.random() * 55, left: Math.random() * 100, d: 1.2 + Math.random() * 1.5 })), []);
  const drops = useMemo(() => Array.from({ length: 40 }, () => ({ left: Math.random() * 100, delay: Math.random() * 1.2, dur: 0.5 + Math.random() * 0.4 })), []);
  const hills = useMemo(() => Array.from({ length: 6 }, (_, i) => i), []);

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: 16, background: sky }}>
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
        <span key={i} style={{ position: "absolute", top: `${s.top}%`, left: `${s.left}%`, width: 2, height: 2, borderRadius: "50%", background: "#F5F0FF", animation: `twinkle ${s.d}s ease-in-out infinite` }} />
      ))}
      {/* clouds if raining */}
      {isRaining && [0, 1, 2].map((i) => (
        <div key={i} style={{ position: "absolute", top: 16 + i * 14, left: -80, width: 140, height: 34, borderRadius: 30, background: isDay ? "#5A6478" : "#20233A", animation: `driftCloud ${9 + i * 3}s linear infinite`, animationDelay: `${i * -3}s`, opacity: 0.8 }} />
      ))}
      {/* lightning flash */}
      {isRaining && <div style={{ position: "absolute", inset: 0, background: "#F5F0FF", opacity: 0, animation: "lightning 5s ease-in-out infinite" }} />}

      {/* rolling hills silhouette, parallax loop */}
      <div style={{ position: "absolute", bottom: 46, left: 0, right: 0, height: 60, overflow: "hidden" }}>
        <div style={{ display: "flex", width: "200%", animation: "scrollX 14s linear infinite" }}>
          {hills.concat(hills).map((_, i) => (
            <svg key={i} width="180" height="60" viewBox="0 0 180 60" style={{ flexShrink: 0 }}>
              <path d="M0,60 Q45,10 90,45 T180,60 Z" fill={isDay ? "#2F6B4F" : "#150F2A"} opacity={0.9} />
            </svg>
          ))}
        </div>
      </div>

      {/* road */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 46, background: isDay ? "#3B3B44" : "#0C0C12" }}>
        <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 4, overflow: "hidden" }}>
          <div style={{ display: "flex", width: "200%", animation: "scrollX 0.9s linear infinite" }}>
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} style={{ width: 26, height: 4, background: "#F5F0FF", marginRight: 22, flexShrink: 0, opacity: 0.7 }} />
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
          <path d="M10,40 Q10,26 26,26 L40,26 Q48,12 66,12 L82,12 Q94,12 98,26 L108,26 Q116,26 116,36 L116,42 Q116,46 112,46 L14,46 Q10,46 10,42 Z" fill={isRaining ? "#7B61FF" : "#FF6FB5"} />
          {/* window */}
          <path d="M46,26 Q52,16 66,16 L80,16 Q88,16 92,26 Z" fill={isDay ? "#BEE7F5" : "#0A0B18"} />
          {/* driver silhouette */}
          <circle cx="63" cy="20" r="6" fill="#2A1B33" />
          <rect x="57" y="24" width="14" height="8" rx="3" fill="#2A1B33" />
          {/* wheels */}
          <circle cx="34" cy="46" r="8" fill="#111" />
          <circle cx="96" cy="46" r="8" fill="#111" />
          <circle cx="34" cy="46" r="3" fill="#F5F0FF" style={{ animation: "spin 0.5s linear infinite", transformOrigin: "34px 46px" }} />
          <circle cx="96" cy="46" r="3" fill="#F5F0FF" style={{ animation: "spin 0.5s linear infinite", transformOrigin: "96px 46px" }} />
        </svg>
        {/* wind flow lines behind the car */}
        <svg width="60" height="40" viewBox="0 0 60 40" style={{ position: "absolute", top: 10, right: 108 }}>
          <path d="M50,10 Q20,10 0,10" stroke="#F5F0FF" strokeWidth="1.5" fill="none" opacity="0.4" strokeDasharray="4 4" style={{ animation: "windFlow 0.7s linear infinite" }} />
          <path d="M50,22 Q20,22 0,22" stroke="#F5F0FF" strokeWidth="1.5" fill="none" opacity="0.3" strokeDasharray="4 4" style={{ animation: "windFlow 0.8s linear infinite" }} />
        </svg>
      </div>

      {/* rain streaks */}
      {isRaining && drops.map((d, i) => (
        <span key={i} style={{ position: "absolute", top: -20, left: `${d.left}%`, width: 2, height: 22, background: "linear-gradient(180deg, transparent, #AEE8FF)", animation: `rainFall ${d.dur}s linear ${d.delay}s infinite` }} />
      ))}
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
  const [scene, setScene] = useState(null);
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
      setTimeout(() => setScene(null), 6000);
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
      minHeight: "100%", color: "#F5F0FF",
      fontFamily: "ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      padding: "28px 20px 40px", position: "relative", overflow: "hidden",
      background: "linear-gradient(120deg, #0A0616, #1A0E32, #24123F, #150A28)",
      backgroundSize: "300% 300%", animation: `bgDrift 18s ease-in-out infinite${shakeKey > 0 ? ", shake 0.5s" : ""}`,
    }}>
      <style>{KEYFRAMES}</style>

      <div style={{ maxWidth: 880, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
          <div>
            <div style={{ fontSize: 12, color: "#B8AEDB", letterSpacing: 1.5, textTransform: "uppercase" }}>Weather Monitor</div>
            <h1 style={{ margin: "2px 0 0", fontSize: 28, fontWeight: 800, background: "linear-gradient(90deg,#FF6FB5,#7B61FF,#00E5C7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Gurugram, India</h1>
          </div>
          <div style={{ fontSize: 12, color: "#B8AEDB", fontFamily: "ui-monospace, monospace" }}>28.4595°N, 77.0266°E · plains</div>
        </div>

        <div style={{ marginTop: 26, position: "relative", display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 16px", background: "rgba(20,12,34,0.55)", backdropFilter: "blur(10px)", border: "1px solid #3A2A5C", borderRadius: 16, overflow: "hidden", minHeight: scene ? 300 : 260 }}>
          {scene && <DriveScene isDay={scene.isDay} isRaining={scene.isRaining} isHot={scene.isHot} />}
          <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", marginTop: scene ? 180 : 12 }}>
            <div style={{ position: "relative", width: 140, height: 140, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {!liveLoading && (<>
                <span style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `2px solid ${zone.color}`, animation: "ringPulse 2.2s ease-out infinite" }} />
                <span style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `2px solid ${zone.color}`, animation: "ringPulse 2.2s ease-out infinite 1.1s" }} />
              </>)}
              <button onClick={fetchLive} disabled={liveLoading} style={{
                position: "relative", width: 120, height: 120, borderRadius: "50%", border: "none",
                background: `conic-gradient(from 180deg, #FF6FB5, #7B61FF, #00E5C7, #FFD23F, #FF6FB5)`,
                color: "#0A0616", fontWeight: 800, fontSize: 14, letterSpacing: 0.3,
                cursor: liveLoading ? "default" : "pointer", boxShadow: `0 0 50px ${zone.color}55`,
                transition: "transform 0.15s ease", whiteSpace: "pre-line",
              }}
                onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.94)")}
                onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                {liveLoading ? "CHECKING…" : "CHECK\nTHE SKY"}
              </button>
            </div>
            <div style={{ marginTop: 14, fontSize: 13, color: "#D8CFF0", textAlign: "center" }}>Tap for a live reading — watch the drive react to it.</div>
            <div style={{ marginTop: 6, fontSize: 12, color: "#8A7FB0", fontFamily: "ui-monospace, monospace" }}>
              {pulseCount === 0 ? "You haven't checked yet this session" : `Checked ${pulseCount} time${pulseCount > 1 ? "s" : ""} this session`}
            </div>
            {liveError && <div style={{ marginTop: 10, fontSize: 12, color: "#FF3D7F" }}>{liveError}</div>}
          </div>
        </div>

        {showAlert && (
          <div key={`alert-${latest.time}`} style={{ marginTop: 18, padding: "12px 16px", borderRadius: 10, background: `${zone.color}1a`, border: `1px solid ${zone.color}66`, display: "flex", alignItems: "center", gap: 10, animation: "popIn 0.4s ease-out" }}>
            <div style={{ width: 8, height: 8, borderRadius: 999, background: zone.color, flexShrink: 0 }} />
            <div style={{ fontSize: 14 }}><strong style={{ color: zone.color }}>{zone.label} alert</strong> — current reading {latest.temp.toFixed(1)}°C meets IMD's plains threshold for this category.</div>
          </div>
        )}

        <div style={{ marginTop: 22, display: "flex", gap: 20, flexWrap: "wrap" }}>
          <div style={{ background: "rgba(20,12,34,0.7)", backdropFilter: "blur(6px)", border: "1px solid #3A2A5C", borderRadius: 14, padding: 16 }}>
            <Gauge temp={dispTemp} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1, minWidth: 260 }}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <ScoreCard label="Temperature" value={dispTemp.toFixed(1)} unit="°C" accent="#FF9F1C" />
              <ScoreCard label="Humidity" value={Math.round(dispHumidity)} unit="%" accent="#00E5C7" />
              <ScoreCard label="Wind" value={dispWind.toFixed(1)} unit="km/h" accent="#7B61FF" />
            </div>
            <div style={{ fontSize: 12, color: "#8A7FB0" }}>Last reading: {fmtTime(latest.time)}</div>
          </div>
        </div>

        <div style={{ marginTop: 26, display: "flex", gap: 8 }}>
          {[{ k: "24h", label: "24h" }, { k: "7d", label: "7 days" }, { k: "all", label: "All" }].map((r) => (
            <button key={r.k} onClick={() => setRange(r.k)} style={{ background: range === r.k ? "linear-gradient(90deg,#FF6FB5,#7B61FF)" : "transparent", color: range === r.k ? "#0A0616" : "#B8AEDB", border: "1px solid #3A2A5C", borderRadius: 8, padding: "6px 14px", fontSize: 13, cursor: "pointer", fontWeight: range === r.k ? 700 : 400 }}>{r.label}</button>
          ))}
        </div>

        <div style={{ marginTop: 14, background: "rgba(20,12,34,0.7)", backdropFilter: "blur(6px)", border: "1px solid #3A2A5C", borderRadius: 14, padding: "16px 8px 8px" }}>
          <div style={{ fontSize: 12, color: "#B8AEDB", padding: "0 12px 8px", textTransform: "uppercase", letterSpacing: 0.3 }}>Temperature trend</div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid stroke="#3A2A5C" strokeDasharray="3 3" />
              <XAxis dataKey="label" stroke="#8A7FB0" fontSize={11} tickLine={false} />
              <YAxis stroke="#8A7FB0" fontSize={11} tickLine={false} domain={[20, 50]} />
              <Tooltip contentStyle={{ background: "#0A0616", border: "1px solid #3A2A5C", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "#B8AEDB" }} />
              <Line type="monotone" dataKey="temp" stroke="#FF6FB5" strokeWidth={2.5} dot={{ r: 3, fill: "#7B61FF" }} name="°C" isAnimationActive animationDuration={500} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={{ marginTop: 24, padding: 16, background: "rgba(20,12,34,0.7)", backdropFilter: "blur(6px)", border: "1px solid #3A2A5C", borderRadius: 14 }}>
          <div style={{ fontSize: 13, color: "#B8AEDB", lineHeight: 1.6 }}>
            This dashboard can't authenticate to your private Google Sheet directly. Use "Check the Sky" above for a live reading, or upload a CSV export of your sheet below.
          </div>
          <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} style={{ marginTop: 12, fontSize: 13, color: "#B8AEDB" }} />
          {importMsg && <div style={{ marginTop: 8, fontSize: 12, color: "#00E5C7" }}>{importMsg}</div>}
        </div>
      </div>
    </div>
  );
}
