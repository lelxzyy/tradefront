"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  BookOpen,
  Calculator,
  ChartLineUp,
  Clock,
  Gear,
  MagnifyingGlass,
  Newspaper,
  Pulse,
  ShieldCheck,
  SignOut,
  Sparkle,
  SquaresFour,
  Target,
  WifiSlash,
} from "@phosphor-icons/react";
import FeaturePanel from "@/components/FeaturePanel";
const MarketChart = dynamic(() => import("@/components/MarketChart"), {
  ssr: false,
});
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const nav = [
  ["overview", "Overview", SquaresFour],
  ["chart", "Live chart", ChartLineUp],
  ["analysis", "AI analysis", Sparkle],
  ["signals", "Signals", Target],
  ["structure", "Market structure", Pulse],
  ["calendar", "Economic calendar", Newspaper],
  ["calculator", "Calculator", Calculator],
  ["journal", "Trade journal", BookOpen],
] as const;
type Market = {
  open: number;
  high: number;
  low: number;
  close: number;
  change_percent: number;
  timestamp: string;
};
export type Analysis = {
  status: string;
  confidence: number;
  classification: string;
  current_price: number;
  buy_confidence: number;
  sell_confidence: number;
  reasons: string[];
  levels: { support: number; resistance: number };
  indicators: { ema20: number; ema50: number; rsi14: number };
  primary_setup?: {
    action: string;
    conditional_order: string;
    entry: { low: number; high: number };
    stop_loss: number;
    take_profits: { label: string; price: number; rr: number }[];
    risk_reward: string;
    invalidation: string;
    executable: boolean;
    method: string;
  };
};
export default function Dashboard() {
  const [market, setMarket] = useState<Market | null>(null),
    [analysis, setAnalysis] = useState<Analysis | null>(null),
    [candles, setCandles] = useState<any[]>([]),
    [timeframe, setTimeframe] = useState("M15"),
    [error, setError] = useState(false),
    [mobile, setMobile] = useState(false),
    [active, setActive] = useState("overview");
  useEffect(() => {
    let mounted = true;
    const refreshQuote = async () => {
      try {
        const m = await fetch(`${API}/market/xauusd`, {
          cache: "no-store",
        }).then((r) => (r.ok ? r.json() : Promise.reject()));
        if (mounted) {
          setMarket(m.data);
          setError(false);
        }
      } catch {
        if (mounted) setError(true);
      }
    };
    refreshQuote();
    const quoteTimer = window.setInterval(refreshQuote, 15_000);
    return () => {
      mounted = false;
      window.clearInterval(quoteTimer);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const refreshTechnical = async () => {
      try {
        const c = await fetch(`${API}/chart/xauusd?timeframe=${timeframe}`, {
          cache: "no-store",
        }).then((r) => (r.ok ? r.json() : Promise.reject()));
        // Analysis runs afterwards and reuses the candle cache on the backend.
        const a = await fetch(`${API}/analysis/xauusd?timeframe=${timeframe}`, {
          cache: "no-store",
        }).then((r) => (r.ok ? r.json() : Promise.reject()));
        if (mounted) {
          setCandles(c.data);
          setAnalysis(a.data);
        }
      } catch {
        // Keep the last valid chart instead of replacing it during a transient rate limit.
      }
    };
    refreshTechnical();
    const technicalTimer = window.setInterval(refreshTechnical, 60_000);
    return () => {
      mounted = false;
      window.clearInterval(technicalTimer);
    };
  }, [timeframe]);
  const select = (id: string) => {
    setActive(id);
    setMobile(false);
  };
  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };
  return (
    <main>
      <aside className={mobile ? "open" : ""}>
        <div className="brand">
          <span className="logo">X</span>
          <div>
            <b>AURUM</b>
            <small>SMART TRADING</small>
          </div>
        </div>
        <nav>
          {nav.map(([id, label, I]) => (
            <button
              onClick={() => select(id)}
              className={active === id ? "active" : ""}
              key={id}
            >
              <I size={19} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="side-bottom">
          <button onClick={() => select("settings")}>
            <Gear size={19} />
            Settings
          </button>
          <div className="account">
            <span>LS</span>
            <div>
              <b>Local account</b>
              <small>Broker not connected</small>
            </div>
          </div>
        </div>
      </aside>
      <section className="workspace">
        <header>
          <button className="hamb" onClick={() => setMobile(!mobile)}>
            ☰
          </button>
          <div className="instrument">
            <span className="gold-dot" />
            <div>
              <b>XAUUSDm</b>
              <small>Gold / U.S. Dollar</small>
            </div>
            <em>MARKET</em>
          </div>
          <div className="quote">
            <small>LAST PRICE</small>
            <b>{market ? market.close.toFixed(2) : "—"}</b>
            <span
              className={(market?.change_percent || 0) >= 0 ? "green" : "red"}
            >
              {market
                ? `${market.change_percent > 0 ? "+" : ""}${market.change_percent.toFixed(2)}%`
                : "Unavailable"}
            </span>
          </div>
          <div className="header-actions">
            <MagnifyingGlass size={20} />
            <div className="live">
              <i /> API
            </div>
            <button className="avatar" onClick={logout} title="Keluar" aria-label="Keluar dari dashboard">
              <SignOut size={16} />
            </button>
          </div>
        </header>
        <div className="content">
          {active === "overview" ? (
            <Overview
              market={market}
              analysis={analysis}
              candles={candles}
              error={error}
              timeframe={timeframe}
              setTimeframe={setTimeframe}
            />
          ) : (
            <FeaturePanel
              active={active}
              analysis={analysis}
              candles={candles}
              timeframe={timeframe}
              setTimeframe={setTimeframe}
              marketAvailable={!error}
            />
          )}
          <p className="disclaimer">
            Analisis dan sinyal bersifat informasional dan bukan nasihat
            keuangan. Trading memiliki risiko kerugian. Selalu gunakan manajemen
            risiko.
          </p>
        </div>
      </section>
    </main>
  );
}
function Overview({
  market,
  analysis,
  candles,
  error,
  timeframe,
  setTimeframe,
}: any) {
  return (
    <>
      <div className="title-row">
        <div>
          <p className="eyebrow">
            MARKET OVERVIEW <span>/</span> XAUUSDm
          </p>
          <h1>Good morning, Trader.</h1>
          <p>Here’s what’s happening with Gold right now.</p>
        </div>
        <div className="updated">
          <Clock size={16} />
          Last update{" "}
          <b>
            {market
              ? new Date(market.timestamp).toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "—"}
          </b>
        </div>
      </div>
      {error && (
        <div className="unavailable">
          <WifiSlash size={22} />
          <div>
            <b>Market Data Unavailable</b>
            <span>
              Provider market sedang tidak tersedia atau kuota hariannya habis.
              Kalkulator dan jurnal tetap dapat digunakan.
            </span>
          </div>
        </div>
      )}
      <div className="metrics">
        <Metric
          label="MARKET BIAS"
          value={analysis?.status || "—"}
          tone={
            analysis?.status === "BUY"
              ? "green"
              : analysis?.status === "SELL"
                ? "red"
                : ""
          }
        />
        <Metric
          label="TREND STRENGTH"
          value={analysis?.classification || "—"}
          tone="purple"
        />
        <Metric
          label="VOLATILITY"
          value={candles.length ? "CALCULATED" : "—"}
          tone="amber"
        />
        <Metric label="ACTIVE SESSION" value={session()} tone="blue" />
        <Metric
          label="SIGNAL CONFIDENCE"
          value={analysis ? `${analysis.confidence}%` : "—"}
          tone="green"
          progress={analysis?.confidence}
        />
      </div>
      <div className="main-grid">
        <ChartPanel
          candles={candles}
          market={market}
          timeframe={timeframe}
          setTimeframe={setTimeframe}
        />
        <SignalPanel analysis={analysis} />
      </div>
      <div className="lower-grid">
        <section className="panel">
          <div className="panel-head">
            <b>Multi-timeframe analysis</b>
            <span className="pill">ENGINE READY</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>TIMEFRAME</th>
                <th>TREND</th>
                <th>STRUCTURE</th>
                <th>RSI</th>
                <th>EMA</th>
                <th>SIGNAL</th>
              </tr>
            </thead>
            <tbody>
              {["M5", "M15", "H1"].map((t) => (
                <tr key={t}>
                  <td>
                    <b>{t}</b>
                  </td>
                  <td>{analysis?.status || "—"}</td>
                  <td>{analysis ? "Calculated" : "Awaiting data"}</td>
                  <td>{analysis?.indicators.rsi14 ?? "—"}</td>
                  <td>
                    {analysis
                      ? analysis.current_price > analysis.indicators.ema50
                        ? "Above"
                        : "Below"
                      : "—"}
                  </td>
                  <td>
                    <span className="tag">{analysis?.status || "—"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="panel">
          <div className="panel-head">
            <b>Confidence distribution</b>
            <Pulse size={20} />
          </div>
          <Bar
            label="BUY"
            value={analysis?.buy_confidence || 0}
            color="green"
          />
          <Bar
            label="SELL"
            value={analysis?.sell_confidence || 0}
            color="red"
          />
          <div className="safety">
            <ShieldCheck size={20} />
            <span>
              Safety logic prevents aggressive entries below threshold.
            </span>
          </div>
        </section>
      </div>
    </>
  );
}
function ChartPanel({ candles, market, timeframe, setTimeframe }: any) {
  return (
    <section className="panel chart-panel">
      <div className="panel-head">
        <div>
          <b>XAUUSDm</b>
          <span>Gold Spot / U.S. Dollar</span>
        </div>
        <div className="timeframes">
          {["M1", "M5", "M15", "M30", "H1", "H4", "D1"].map((x) => (
            <button
              className={timeframe === x ? "selected" : ""}
              onClick={() => setTimeframe(x)}
              key={x}
            >
              {x}
            </button>
          ))}
        </div>
      </div>
      {candles.length ? (
        <MarketChart data={candles} />
      ) : (
        <div className="chart-empty">
          <ChartLineUp size={38} />
          <b>Waiting for verified OHLC data</b>
          <span>Configure TWELVEDATA_API_KEY in backend/.env.</span>
        </div>
      )}
      <div className="ohlc">
        <span>
          O <b>{market?.open ?? "—"}</b>
        </span>
        <span>
          H <b className="green">{market?.high ?? "—"}</b>
        </span>
        <span>
          L <b className="red">{market?.low ?? "—"}</b>
        </span>
        <span>
          C <b>{market?.close ?? "—"}</b>
        </span>
      </div>
    </section>
  );
}
function SignalPanel({ analysis }: { analysis: Analysis | null }) {
  const setup = analysis?.primary_setup;
  return (
    <section className="panel signal">
      <div className="panel-head">
        <div>
          <p className="eyebrow">SMART SIGNAL</p>
          <b>Recommended setup</b>
        </div>
        <ShieldCheck size={22} />
      </div>
      <div className={`signal-badge ${(analysis?.status || "").toLowerCase()}`}>
        {analysis?.status || "NO DATA"}
      </div>
      <div className="confidence">
        <div>
          <span>Confidence score</span>
          <b>{analysis?.confidence ?? 0}%</b>
        </div>
        <div>
          <i style={{ width: `${analysis?.confidence ?? 0}%` }} />
        </div>
      </div>
      <div className="levels">
        <div>
          <span>CURRENT</span>
          <b>{analysis?.current_price ?? "—"}</b>
        </div>
        <div>
          <span>SUPPORT</span>
          <b>{analysis?.levels.support ?? "—"}</b>
        </div>
        <div>
          <span>RESISTANCE</span>
          <b>{analysis?.levels.resistance ?? "—"}</b>
        </div>
      </div>
      <div className="rationale">
        {setup && (
          <>
            <b>
              {setup.executable ? "Calculated setup" : "Conditional scenario"}
            </b>
            <div className="setup-list">
              <div>
                <span>ORDER</span>
                <strong>{setup.action}</strong>
              </div>
              <div>
                <span>ENTRY</span>
                <strong>
                  {setup.entry.low} – {setup.entry.high}
                </strong>
              </div>
              <div>
                <span>STOP LOSS</span>
                <strong className="red">{setup.stop_loss}</strong>
              </div>
              {setup.take_profits.map((tp) => (
                <div key={tp.label}>
                  <span>
                    {tp.label} · 1:{tp.rr}
                  </span>
                  <strong className="green">{tp.price}</strong>
                </div>
              ))}
            </div>
            <p>{setup.invalidation}</p>
          </>
        )}
        <b>Technical rationale</b>
        {analysis?.reasons?.length ? (
          analysis.reasons.map((x) => (
            <p key={x}>
              <i /> {x}
            </p>
          ))
        ) : (
          <p>Appears after verified candles are available.</p>
        )}
      </div>
    </section>
  );
}
function Metric({ label, value, tone = "", progress }: any) {
  return (
    <div className="metric">
      <span>{label}</span>
      <b className={tone}>{value}</b>
      {progress !== undefined && (
        <div className="mini">
          <i style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}
function Bar({ label, value, color }: any) {
  return (
    <div className="bar">
      <div>
        <b>{label}</b>
        <span>{value}%</span>
      </div>
      <div>
        <i className={color} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
function session() {
  const h = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hour12: false,
      timeZone: "Asia/Jakarta",
    }).format(new Date()),
  );
  return h >= 19 || h < 4
    ? "NEW YORK"
    : h >= 14
      ? "LONDON"
      : h >= 6
        ? "ASIAN"
        : "CLOSED";
}
