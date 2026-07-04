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
  { time: "2026-07-03T09:30", temp: 35.2, wind: 5.8, humidity: 53 },
  { time: "2026-07-03T10:00", temp: 35.1, wind: 5.8, humidity: 53 },
  { time: "2026-07-03T10:15", temp: 35.1, wind: 5.8, humidity: 53 },
];

const ZONES = [
  { key: "normal", label: "Normal", max: 40, color: "#4FA8E0" },
  { key: "heat", label: "Heat Wave", max: 45, color: "#FF7A45" },
  { key: "severe", label: "Severe Heat Wave", max: 55, color: "#E5484D" },
];

function classify(temp) {
  if (temp >= 45) return ZONES[2];
  if (temp >= 40) return ZONES[1];
  return ZONES[0];
}

function fmtTime(t) {
  const d = new Date(t);
  if (isNaN(d)) return t;
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
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

function Gauge({ temp }) {
  const zone = classify(temp);
  const pct = Math.max(0, Math.min(1, temp / 55));
  const angle = -90 + pct * 180;
  const r = 90;
  const cx = 110;
  const cy = 110;
  const arc = (startDeg, endDeg, color, key) => {
    const toXY = (deg) => {
      const rad = (deg * Math.PI) / 180;
      return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
    };
    const [x1, y1] = toXY(startDeg);
    const [x2, y2] = toXY(endDeg);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return (
      <path
        key={key}
        d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`}
        stroke={color}
        strokeWidth={14}
        strokeLinecap="round"
        fill="none"
        opacity={0.9}
      />
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg width="220" height="140" viewBox="0 0 220 140">
        {arc(180, 209, "#4FA8E0", "z0")}
        {arc(209, 253, "#4FA8E0", "z0b")}
        {arc(253, 297, "#FF7A45", "z1")}
        {arc(297, 360, "#E5484D", "z2")}
        <line
          x1={cx}
          y1={cy}
          x2={cx + r * 0.75 * Math.cos((angle * Math.PI) / 180)}
          y2={cy + r * 0.75 * Math.sin((angle * Math.PI) / 180)}
          stroke="#EDEEF0"
          strokeWidth={3}
          strokeLinecap="round"
          style={{ transition: "all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
        />
        <circle cx={cx} cy={cy} r={5} fill="#EDEEF0" />
      </svg>
      <div style={{ marginTop: -8, textAlign: "center" }}>
        <div
          style={{
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: 44,
            fontWeight: 600,
            color: "#EDEEF0",
            lineHeight: 1,
          }}
        >
          {temp.toFixed(1)}
          <span style={{ fontSize: 20, color: "#8B9198" }}>°C</span>
        </div>
        <div
          style={{
            marginTop: 6,
            display: "inline-block",
            padding: "3px 10px",
            borderRadius: 999,
            fontSize: 12,
            letterSpacing: 0.4,
            textTransform: "uppercase",
            color: zone.color,
            border: `1px solid ${zone.color}55`,
            background: `${zone.color}14`,
            transition: "color 0.3s, border-color 0.3s, background 0.3s",
          }}
        >
          {zone.label}
        </div>
      </div>
    </div>
  );
}

function ScoreCard({ label, value, unit, accent }) {
  return (
    <div
      style={{
        background: "#14171A",
        border: "1px solid #23272B",
        borderRadius: 12,
        padding: "16px 18px",
        flex: 1,
        minWidth: 130,
      }}
    >
      <div style={{ fontSize: 12, color: "#8B9198", letterSpacing: 0.3, textTransform: "uppercase" }}>
        {label}
      </div>
      <div
        style={{
          marginTop: 6,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: 28,
          fontWeight: 600,
          color: accent,
        }}
      >
        {value}
        <span style={{ fontSize: 14, color: "#8B9198", marginLeft: 4 }}>{unit}</span>
      </div>
    </div>
  );
}

const LAT = 28.4595;
const LON = 77.0266;
const OPEN_METEO_URL = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,wind_speed_10m,relative_humidity_2m`;

const KEYFRAMES = `
@keyframes ringPulse {
  0% { transform: scale(1); opacity: 0.55; }
  100% { transform: scale(1.9); opacity: 0; }
}
@keyframes screenFlash {
  0% { opacity: 0.32; }
  100% { opacity: 0; }
}
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-6px); }
  40% { transform: translateX(6px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}
@keyframes popIn {
  0% { transform: scale(0.9); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
`;

export default function WeatherDashboard() {
  const [rows, setRows] = useState(SEED);
  const [range, setRange] = useState("all");
  const [importMsg, setImportMsg] = useState("");
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState("");
  const [pulseCount, setPulseCount] = useState(0);
  const [flash, setFlash] = useState(null);
  const [shakeKey, setShakeKey] = useState(0);
  const fileRef = React.useRef(null);

  const fetchLive = useCallback(async () => {
    setLiveLoading(true);
    setLiveError("");
    try {
      const res = await fetch(OPEN_METEO_URL);
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = await res.json();
      const c = data.current;
      if (!c) throw new Error("Response didn't include current-weather data.");
      const newRow = {
        time: c.time,
        temp: c.temperature_2m,
        wind: c.wind_speed_10m,
        humidity: c.relative_humidity_2m,
      };
      setRows((prev) => {
        if (prev.length && prev[prev.length - 1].time === newRow.time) return prev;
        return [...prev, newRow];
      });
      setPulseCount((n) => n + 1);
      const z = classify(newRow.temp);
      setFlash({ color: z.color, key: Date.now() });
      if (z.key === "severe") setShakeKey((k) => k + 1);
    } catch (err) {
      setLiveError(
        err instanceof Error
          ? `Couldn't fetch live weather: ${err.message}`
          : "Couldn't fetch live weather."
      );
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
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        try {
          const parsed = res.data
            .map((row) => {
              const keys = Object.keys(row);
              const get = (name) =>
                row[keys.find((k) => k.toLowerCase().includes(name))];
              return {
                time: get("date") || get("time"),
                temp: parseFloat(get("temp")),
                wind: parseFloat(get("wind")),
                humidity: parseFloat(get("humid")),
              };
            })
            .filter((r) => r.time && !isNaN(r.temp));
          if (parsed.length === 0) {
            setImportMsg("No valid rows found — check column headers (Date/Time, Temperature, Wind Speed, Humidity).");
            return;
          }
          setRows(parsed);
          setImportMsg(`Loaded ${parsed.length} rows from CSV.`);
        } catch {
          setImportMsg("Could not parse this file. Make sure it's a CSV export of your sheet.");
        }
      },
      error: () => setImportMsg("Failed to read file."),
    });
  }, []);

  return (
    <div
      key={shakeKey}
      style={{
        background: "#0B0D0F",
        minHeight: "100%",
        color: "#EDEEF0",
        fontFamily: "ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        padding: "28px 20px 40px",
        position: "relative",
        animation: shakeKey > 0 ? "shake 0.5s" : "none",
      }}
    >
      <style>{KEYFRAMES}</style>

      {flash && (
        <div
          key={flash.key}
          onAnimationEnd={() => setFlash(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: flash.color,
            pointerEvents: "none",
            zIndex: 50,
            animation: "screenFlash 0.7s ease-out forwards",
          }}
        />
      )}

      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
          <div>
            <div style={{ fontSize: 12, color: "#8B9198", letterSpacing: 1, textTransform: "uppercase" }}>
              Weather Monitor
            </div>
            <h1 style={{ margin: "2px 0 0", fontSize: 26, fontWeight: 600 }}>Gurugram, India</h1>
          </div>
          <div style={{ fontSize: 12, color: "#8B9198", fontFamily: "ui-monospace, monospace" }}>
            28.4595°N, 77.0266°E · plains
          </div>
        </div>

        <div
          style={{
            marginTop: 26,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "36px 16px",
            background: "#14171A",
            border: "1px solid #23272B",
            borderRadius: 16,
          }}
        >
          <div style={{ position: "relative", width: 160, height: 160, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {!liveLoading && (
              <>
                <span style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `2px solid ${zone.color}`, animation: "ringPulse 2.2s ease-out infinite" }} />
                <span style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `2px solid ${zone.color}`, animation: "ringPulse 2.2s ease-out infinite 1.1s" }} />
              </>
            )}
            <button
              onClick={fetchLive}
              disabled={liveLoading}
              style={{
                position: "relative",
                width: 140,
                height: 140,
                borderRadius: "50%",
                border: "none",
                background: `radial-gradient(circle at 35% 30%, ${zone.color}, ${zone.color}cc)`,
                color: "#0B0D0F",
                fontWeight: 700,
                fontSize: 15,
                letterSpacing: 0.3,
                cursor: liveLoading ? "default" : "pointer",
                boxShadow: `0 0 40px ${zone.color}55`,
                transition: "transform 0.15s ease",
                whiteSpace: "pre-line",
              }}
              onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.94)")}
              onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              {liveLoading ? "CHECKING…" : "CHECK\nTHE SKY"}
            </button>
          </div>
          <div style={{ marginTop: 18, fontSize: 13, color: "#8B9198", textAlign: "center" }}>
            Tap to pull a live reading straight from the sky above Gurugram right now.
          </div>
          <div style={{ marginTop: 6, fontSize: 12, color: "#5C6167", fontFamily: "ui-monospace, monospace" }}>
            {pulseCount === 0
              ? "You haven't checked yet this session"
              : `You've checked the sky ${pulseCount} time${pulseCount > 1 ? "s" : ""} this session`}
          </div>
          {liveError && (
            <div style={{ marginTop: 10, fontSize: 12, color: "#E5484D" }}>{liveError}</div>
          )}
        </div>

        {showAlert && (
          <div
            key={`alert-${latest.time}`}
            style={{
              marginTop: 18,
              padding: "12px 16px",
              borderRadius: 10,
              background: `${zone.color}18`,
              border: `1px solid ${zone.color}55`,
              display: "flex",
              alignItems: "center",
              gap: 10,
              animation: "popIn 0.4s ease-out",
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: 999, background: zone.color, flexShrink: 0 }} />
            <div style={{ fontSize: 14 }}>
              <strong style={{ color: zone.color }}>{zone.label} alert</strong> — current reading{" "}
              {latest.temp.toFixed(1)}°C meets IMD's plains threshold for this category.
            </div>
          </div>
        )}

        <div style={{ marginTop: 22, display: "flex", gap: 20, flexWrap: "wrap" }}>
          <div style={{ background: "#14171A", border: "1px solid #23272B", borderRadius: 12, padding: 16 }}>
            <Gauge temp={dispTemp} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1, minWidth: 260 }}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <ScoreCard label="Temperature" value={dispTemp.toFixed(1)} unit="°C" accent="#FF7A45" />
              <ScoreCard label="Humidity" value={Math.round(dispHumidity)} unit="%" accent="#4FA8E0" />
              <ScoreCard label="Wind" value={dispWind.toFixed(1)} unit="km/h" accent="#8B9198" />
            </div>
            <div style={{ fontSize: 12, color: "#5C6167" }}>
              Last reading: {fmtTime(latest.time)}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 26, display: "flex", gap: 8 }}>
          {[
            { k: "24h", label: "24h" },
            { k: "7d", label: "7 days" },
            { k: "all", label: "All" },
          ].map((r) => (
            <button
              key={r.k}
              onClick={() => setRange(r.k)}
              style={{
                background: range === r.k ? "#EDEEF0" : "transparent",
                color: range === r.k ? "#0B0D0F" : "#8B9198",
                border: "1px solid #23272B",
                borderRadius: 8,
                padding: "6px 14px",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 14, background: "#14171A", border: "1px solid #23272B", borderRadius: 12, padding: "16px 8px 8px" }}>
          <div style={{ fontSize: 12, color: "#8B9198", padding: "0 12px 8px", textTransform: "uppercase", letterSpacing: 0.3 }}>
            Temperature trend
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid stroke="#23272B" strokeDasharray="3 3" />
              <XAxis dataKey="label" stroke="#5C6167" fontSize={11} tickLine={false} />
              <YAxis stroke="#5C6167" fontSize={11} tickLine={false} domain={[20, 50]} />
              <Tooltip
                contentStyle={{ background: "#0B0D0F", border: "1px solid #23272B", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "#8B9198" }}
              />
              <Line type="monotone" dataKey="temp" stroke="#FF7A45" strokeWidth={2} dot={{ r: 3 }} name="°C" isAnimationActive={true} animationDuration={500} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={{ marginTop: 24, padding: 16, background: "#14171A", border: "1px solid #23272B", borderRadius: 12 }}>
          <div style={{ fontSize: 13, color: "#8B9198", lineHeight: 1.6 }}>
            This dashboard can't authenticate to your private Google Sheet directly. Use "Check
            the Sky" above for a live reading, or upload a CSV export of your sheet below (File →
            Share → Publish to web → export as CSV — I have not re-verified Google Sheets' exact
            current wording for this).
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            onChange={handleFile}
            style={{ marginTop: 12, fontSize: 13, color: "#8B9198" }}
          />
          {importMsg && (
            <div style={{ marginTop: 8, fontSize: 12, color: "#4FA8E0" }}>{importMsg}</div>
          )}
        </div>
      </div>
    </div>
  );
}
