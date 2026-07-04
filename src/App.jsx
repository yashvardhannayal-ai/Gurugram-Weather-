import React, { useState, useMemo, useCallback } from "react";
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

// ---- Seed data (from the user's actual sheet, duplicates removed) ----
const SEED = [
  { time: "2026-07-03T09:30", temp: 35.2, wind: 5.8, humidity: 53 },
  { time: "2026-07-03T10:00", temp: 35.1, wind: 5.8, humidity: 53 },
  { time: "2026-07-03T10:15", temp: 35.1, wind: 5.8, humidity: 53 },
];

// IMD-derived thresholds for plains — flagged to the user as approximate / worth re-verifying
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

export default function WeatherDashboard() {
  const [rows, setRows] = useState(SEED);
  const [range, setRange] = useState("all");
  const [importMsg, setImportMsg] = useState("");
  const fileRef = React.useRef(null);

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
      style={{
        background: "#0B0D0F",
        minHeight: "100%",
        color: "#EDEEF0",
        fontFamily:
          "ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        padding: "28px 20px 40px",
      }}
    >
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        {/* Header */}
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

        {/* Alert banner */}
        {showAlert && (
          <div
            style={{
              marginTop: 18,
              padding: "12px 16px",
              borderRadius: 10,
              background: `${zone.color}18`,
              border: `1px solid ${zone.color}55`,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: 999, background: zone.color, flexShrink: 0 }} />
            <div style={{ fontSize: 14 }}>
              <strong style={{ color: zone.color }}>{zone.label} alert</strong> — current reading{" "}
              {latest.temp.toFixed(1)}°C meets IMD's plains threshold for this category.
            </div>
          </div>
        )}

        {/* Main grid */}
        <div style={{ marginTop: 22, display: "flex", gap: 20, flexWrap: "wrap" }}>
          <div style={{ background: "#14171A", border: "1px solid #23272B", borderRadius: 12, padding: 16 }}>
            <Gauge temp={latest.temp} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1, minWidth: 260 }}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <ScoreCard label="Temperature" value={latest.temp.toFixed(1)} unit="°C" accent="#FF7A45" />
              <ScoreCard label="Humidity" value={latest.humidity} unit="%" accent="#4FA8E0" />
              <ScoreCard label="Wind" value={latest.wind} unit="km/h" accent="#8B9198" />
            </div>
            <div style={{ fontSize: 12, color: "#5C6167" }}>
              Last reading: {fmtTime(latest.time)}
            </div>
          </div>
        </div>

        {/* Range filter */}
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

        {/* Chart */}
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
              <Line type="monotone" dataKey="temp" stroke="#FF7A45" strokeWidth={2} dot={{ r: 3 }} name="°C" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Data import + note */}
        <div style={{ marginTop: 24, padding: 16, background: "#14171A", border: "1px solid #23272B", borderRadius: 12 }}>
          <div style={{ fontSize: 13, color: "#8B9198", lineHeight: 1.6 }}>
            This dashboard can't authenticate to your private Google Sheet directly, so it's
            showing the sample rows from your sheet as of when I last checked it. To refresh it
            with your latest data: open your sheet → File → Share → Publish to web → export as
            CSV, download that file, then upload it below. (I have not re-verified Google Sheets'
            exact current menu wording for this — if it looks different, look for a "Publish to
            web" or "Download → CSV" option.)
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
