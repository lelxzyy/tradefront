"use client";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  BookOpen,
  Calculator as CalculatorIcon,
  ChartLineUp,
  FloppyDisk,
  Gear,
  Info,
  Newspaper,
  Sparkle,
  Trash,
  UserPlus,
  Key,
  WifiSlash,
} from "@phosphor-icons/react";
import type { Analysis } from "@/app/page";
import { appendUserHistory, loadUserData, saveUserSection } from "@/lib/user-data-client";
const MarketChart = dynamic(() => import("./MarketChart"), { ssr: false });
type Props = {
  active: string;
  analysis: Analysis | null;
  candles: any[];
  timeframe: string;
  setTimeframe: (x: string) => void;
  marketAvailable: boolean;
};
type Trade = {
  id: number;
  date: string;
  direction: string;
  entry: number;
  exit: number;
  lot: number;
  notes: string;
  pnl: number;
};
export default function FeaturePanel(p: Props) {
  if (p.active === "calculator") return <TradingCalculator />;
  if (p.active === "journal") return <Journal />;
  if (p.active === "settings") return <BrokerSettings />;
  if (p.active === "users") return <UserManagement />;
  if (p.active === "api-keys") return <ApiKeyManagement />;
  if (p.active === "chart")
    return (
      <Page title="Live chart" sub="Interactive verified OHLC chart">
        <section className="panel">
          <div className="panel-head">
            <b>XAUUSDm · {p.timeframe}</b>
            <div className="timeframes">
              {["M1", "M5", "M15", "M30", "H1", "H4", "D1"].map((x) => (
                <button
                  className={p.timeframe === x ? "selected" : ""}
                  onClick={() => p.setTimeframe(x)}
                  key={x}
                >
                  {x}
                </button>
              ))}
            </div>
          </div>
          {p.candles.length ? (
            <MarketChart data={p.candles} />
          ) : (
            <Empty
              icon={<WifiSlash />}
              title="Market Data Unavailable"
              text="Configure the market provider to display verified candles."
            />
          )}
        </section>
      </Page>
    );
  if (p.active === "analysis") return <AiAnalysisPage {...p} />;
  if (p.active === "signals")
    return (
      <Page
        title="Signals"
        sub="Latest engine evaluation and saved signal history"
      >
        <DataRequired available={p.marketAvailable}>
          <Card title="Latest signal">
            <strong className={p.analysis?.status === "BUY" ? "green" : "red"}>
              {p.analysis?.status || "NO TRADE"}
            </strong>
            <Row a="Confidence" b={`${p.analysis?.confidence || 0}%`} />
            <Row a="Quality" b={p.analysis?.classification || "—"} />
            <p className="muted">
              Signals are not persisted until a valid setup with entry, SL, and
              TP is produced.
            </p>
          </Card>
        </DataRequired>
      </Page>
    );
  if (p.active === "structure")
    return (
      <Page
        title="Market structure"
        sub="Structure, momentum, and calculated levels"
      >
        <DataRequired available={p.marketAvailable}>
          <div className="feature-grid">
            <Card title="Structure status">
              <strong>
                {p.analysis?.status === "BUY"
                  ? "Bullish context"
                  : p.analysis?.status === "SELL"
                    ? "Bearish context"
                    : "No trade"}
              </strong>
              <p>
                Full HH/HL/BOS/CHoCH detection requires verified candle history.
              </p>
            </Card>
            <Card title="Support & resistance">
              <Row a="Support" b={p.analysis?.levels.support || "—"} />
              <Row a="Resistance" b={p.analysis?.levels.resistance || "—"} />
            </Card>
            <Card title="Indicators">
              <Row a="EMA 20" b={p.analysis?.indicators.ema20 || "—"} />
              <Row a="EMA 50" b={p.analysis?.indicators.ema50 || "—"} />
              <Row a="RSI 14" b={p.analysis?.indicators.rsi14 || "—"} />
            </Card>
          </div>
        </DataRequired>
      </Page>
    );
  return <EconomicCalendar />;
}

function EconomicCalendar() {
  const containerId = "tradingview-economic-calendar";

  useEffect(() => {
    const container = document.getElementById(containerId);
    if (!container || container.childNodes.length) return;

    const widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget";
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-events.js";
    script.async = true;
    script.textContent = JSON.stringify({
      colorTheme: "dark",
      isTransparent: true,
      width: "100%",
      height: 620,
      locale: "id_ID",
      importanceFilter: "0,1",
      countryFilter: "us",
    });
    container.append(widget, script);
  }, []);

  return (
    <Page title="Economic calendar" sub="Jadwal berita ekonomi AS berdampak pada XAU/USD">
      <div className="calendar-status">
        <span><i /> LIVE CALENDAR</span>
        <p><Info size={15} /> Waktu mengikuti zona perangkat. Fokus USD · dampak sedang dan tinggi.</p>
      </div>
      <section className="panel economic-calendar">
        <div id={containerId} className="tradingview-widget-container" />
        <div className="calendar-source">
          Data kalender disediakan oleh <a href="https://www.tradingview.com/economic-calendar/" target="_blank" rel="noreferrer">TradingView</a>. Jadwal dapat berubah; verifikasi sebelum membuka posisi.
        </div>
      </section>
    </Page>
  );
}
function Page({
  title,
  sub,
  children,
}: {
  title: string;
  sub: string;
  children: any;
}) {
  return (
    <>
      <div className="title-row">
        <div>
          <p className="eyebrow">LELXZYY TRADE</p>
          <h1>{title}</h1>
          <p>{sub}</p>
        </div>
      </div>
      {children}
    </>
  );
}
function DataRequired({
  available,
  children,
}: {
  available: boolean;
  children: any;
}) {
  return available ? (
    children
  ) : (
    <Empty
      icon={<WifiSlash />}
      title="Verified market data required"
      text="Configure TWELVEDATA_API_KEY in backend/.env, then restart Laravel."
    />
  );
}

function AiAnalysisPage(p: Props) {
  const [text, setText] = useState("");
  const [snapshot, setSnapshot] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState("");
  const analyze = async () => {
    setLoading(true);
    setFailure("");
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8010/api/v1"}/analysis/xauusd/ai`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ timeframe: p.timeframe }),
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.detail || result.message || "AI request failed");
      setText(result.data.ai.explanation);
      setSnapshot(result.data);
      void appendUserHistory("aiHistory", { timeframe: p.timeframe, ...result.data });
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "AI analysis failed");
    } finally {
      setLoading(false);
    }
  };
  return (
    <Page
      title="AI market analysis"
      sub="Instant explanation based only on verified engine calculations"
    >
      <DataRequired available={p.marketAvailable}>
        <div className="ai-action">
          <div>
            <b>Analyze {p.timeframe} now</b>
            <span>Market engine first, AI explanation second.</span>
          </div>
          <button className="primary" disabled={loading} onClick={analyze}>
            <Sparkle />
            {loading ? "Analyzing…" : "Analyze Now"}
          </button>
        </div>
        {failure && (
          <div className="warning">
            <Info /> {failure}
          </div>
        )}
        {(snapshot || p.analysis) && (
          <TradePlan analysis={(snapshot || p.analysis)!} />
        )}
        {text && (
          <section className="panel ai-output">
            <div className="panel-head">
              <b>AI explanation</b>
              <span className="ai-generated-time">
                GENERATED {snapshot?.ai?.generated_at
                  ? new Date(snapshot.ai.generated_at).toLocaleString("id-ID", {
                      timeZone: "Asia/Jakarta", day: "2-digit", month: "short", year: "numeric",
                      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
                    }) + " WIB"
                  : "FROM ENGINE DATA"}
              </span>
            </div>
            <AiNarrative text={text} />
          </section>
        )}
      </DataRequired>
    </Page>
  );
}

function TradePlan({ analysis }: { analysis: Analysis }) {
  const setup = analysis.primary_setup;
  if (!setup) return null;
  const side = setup.conditional_order.startsWith("BUY") ? "buy" : "sell";
  return (
    <section className={`trade-plan ${side}`}>
      <div className="trade-hero">
        <div>
          <span className="trade-kicker">PRIMARY TRADE PLAN</span>
          <div className="trade-title">
            <strong>{setup.action}</strong>
            <i>{setup.executable ? "READY" : "WAIT FOR CONFIRMATION"}</i>
          </div>
          <p>
            {setup.executable
              ? setup.conditional_order
              : `Conditional ${setup.conditional_order}`}{" "}
            · {analysis.confidence}% confidence
          </p>
        </div>
        <div className="rr-orb">
          <span>RISK / REWARD</span>
          <b>{setup.risk_reward}</b>
        </div>
      </div>
      <div className="price-ladder">
        <div className="ladder-row stop">
          <span>
            <i />
            STOP LOSS<small>Protection / invalidation</small>
          </span>
          <b>{setup.stop_loss}</b>
        </div>
        <div className="ladder-gap risk-zone">
          <span>RISK ZONE</span>
        </div>
        <div className="ladder-row entry">
          <span>
            <i />
            ENTRY ZONE<small>{setup.conditional_order}</small>
          </span>
          <b>
            {setup.entry.low} <em>—</em> {setup.entry.high}
          </b>
        </div>
        <div className="ladder-gap reward-zone">
          <span>PROFIT TARGETS</span>
        </div>
        {[...setup.take_profits].reverse().map((tp) => (
          <div className={`ladder-row target tp${tp.rr}`} key={tp.label}>
            <span>
              <i />
              {tp.label}
              <small>Reward 1:{tp.rr}</small>
            </span>
            <b>{tp.price}</b>
            <div className="tp-bar" style={{ width: `${35 + tp.rr * 18}%` }} />
          </div>
        ))}
      </div>
      <div className="trade-footer">
        <div>
          <span>MARKET PRICE</span>
          <b>{analysis.current_price}</b>
        </div>
        <div>
          <span>SUPPORT</span>
          <b>{analysis.levels.support}</b>
        </div>
        <div>
          <span>RESISTANCE</span>
          <b>{analysis.levels.resistance}</b>
        </div>
      </div>
      <div className="invalidation">
        <Info />
        <div>
          <b>Invalidation</b>
          <span>{setup.invalidation}</span>
        </div>
      </div>
    </section>
  );
}

function AiNarrative({ text }: { text: string }) {
  const lines = text
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
  return (
    <div className="ai-narrative">
      {lines.map((line, i) => {
        const clean = line.replace(/\*\*/g, "").replace(/^[-•]\s*/, "");
        const heading =
          /^(Kondisi|Alasan Teknikal|Aksi|Invalidation|Risiko)\s*:?$/i.test(
            clean,
          );
        if (heading) return <h3 key={i}>{clean.replace(/:$/, "")}</h3>;
        return <p key={i}>{clean}</p>;
      })}
    </div>
  );
}
function Empty({
  icon,
  title,
  text,
}: {
  icon: any;
  title: string;
  text: string;
}) {
  return (
    <div className="feature-empty">
      {icon}
      <b>{title}</b>
      <span>{text}</span>
    </div>
  );
}
function Card({ title, children }: { title: string; children: any }) {
  return (
    <section className="panel feature-card">
      <div className="panel-head">
        <b>{title}</b>
      </div>
      <div className="card-body">{children}</div>
    </section>
  );
}
function Row({ a, b }: { a: string; b: any }) {
  return (
    <div className="result-row">
      <span>{a}</span>
      <b>{b}</b>
    </div>
  );
}
function TradingCalculator() {
  const [type, setType] = useState("risk");
  const [balance, setBalance] = useState(1000),
    [risk, setRisk] = useState(1),
    [entry, setEntry] = useState(3500),
    [other, setOther] = useState(3490),
    [lot, setLot] = useState(0.01),
    [contract, setContract] = useState(100),
    [tick, setTick] = useState(0.01),
    [direction, setDirection] = useState("BUY");
  const [cloudReady, setCloudReady] = useState(false);
  useEffect(() => {
    loadUserData().then((data) => {
      const x = data.calculatorSettings;
      if (x) {
        setType(x.type ?? "risk"); setBalance(x.balance ?? 1000); setRisk(x.risk ?? 1);
        setEntry(x.entry ?? 3500); setOther(x.other ?? 3490); setLot(x.lot ?? .01);
        setContract(x.contract ?? 100); setTick(x.tick ?? .01); setDirection(x.direction ?? "BUY");
      }
    }).finally(() => setCloudReady(true));
  }, []);
  useEffect(() => {
    if (!cloudReady) return;
    const timer = window.setTimeout(() => void saveUserSection("calculatorSettings", { type, balance, risk, entry, other, lot, contract, tick, direction }), 600);
    return () => window.clearTimeout(timer);
  }, [cloudReady, type, balance, risk, entry, other, lot, contract, tick, direction]);
  const distance = Math.abs(entry - other);
  const result = useMemo(
    () =>
      type === "risk"
        ? {
            title: "Suggested lot",
            main: distance ? (balance * risk) / 100 / (distance * contract) : 0,
            rows: [
              ["Maximum risk", (balance * risk) / 100],
              ["SL distance", distance],
              ["Risk", `${risk}%`],
            ],
          }
        : type === "profit"
          ? {
              title: "Estimated P/L",
              main:
                (direction === "BUY" ? other - entry : entry - other) *
                lot *
                contract,
              rows: [
                ["Price difference", distance],
                ["Contract size", contract],
                ["Lot size", lot],
              ],
            }
          : {
              title: "Ticks",
              main: tick ? distance / tick : 0,
              rows: [
                ["Price difference", distance],
                ["Tick size", tick],
                ["Direction", "Absolute"],
              ],
            },
    [type, balance, risk, entry, other, lot, contract, tick, direction],
  );
  return (
    <Page
      title="Smart trading calculator"
      sub="Broker-adjustable Gold profit, risk, and point calculations"
    >
      <div className="calc-tabs">
        {[
          ["risk", "Risk & lot"],
          ["profit", "Profit / loss"],
          ["points", "Points / ticks"],
        ].map((x) => (
          <button
            key={x[0]}
            className={type === x[0] ? "selected" : ""}
            onClick={() => setType(x[0])}
          >
            {x[1]}
          </button>
        ))}
      </div>
      <div className="calculator-grid">
        <section className="panel form-card">
          <div className="panel-head">
            <b>Calculation inputs</b>
            <CalculatorIcon />
          </div>
          <div className="form-grid">
            <Field label="Account balance" value={balance} set={setBalance} />
            {type === "risk" && (
              <Field label="Risk percentage" value={risk} set={setRisk} />
            )}
            <Field label="Entry / Price 1" value={entry} set={setEntry} />
            <Field
              label={type === "risk" ? "Stop loss" : "Exit / Price 2"}
              value={other}
              set={setOther}
            />
            {type === "profit" && (
              <>
                <Field label="Lot size" value={lot} set={setLot} />
                <label>
                  Direction
                  <select
                    value={direction}
                    onChange={(e) => setDirection(e.target.value)}
                  >
                    <option>BUY</option>
                    <option>SELL</option>
                  </select>
                </label>
              </>
            )}{" "}
            {type !== "points" && (
              <Field label="Contract size" value={contract} set={setContract} />
            )}{" "}
            {type === "points" && (
              <Field label="Tick size" value={tick} set={setTick} />
            )}
          </div>
          {risk > 5 && type === "risk" && (
            <div className="warning">
              <Info /> Risk above 5% is considered high.
            </div>
          )}
        </section>
        <section className="panel result-card">
          <span>RESULT</span>
          <h2 className={Number(result.main) < 0 ? "red" : "green"}>
            {Number(result.main).toLocaleString(undefined, {
              maximumFractionDigits: 4,
            })}
          </h2>
          <p>{result.title}</p>
          {result.rows.map(([a, b]) => (
            <Row
              key={String(a)}
              a={String(a)}
              b={
                typeof b === "number"
                  ? b.toLocaleString(undefined, { maximumFractionDigits: 4 })
                  : b
              }
            />
          ))}
        </section>
      </div>
    </Page>
  );
}
function Field({
  label,
  value,
  set,
}: {
  label: string;
  value: number;
  set: (n: number) => void;
}) {
  return (
    <label>
      {label}
      <input
        type="number"
        step="any"
        value={value}
        onChange={(e) => set(Number(e.target.value))}
      />
    </label>
  );
}
function Journal() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    direction: "BUY",
    entry: 3500,
    exit: 3510,
    lot: 0.01,
    notes: "",
  });
  useEffect(() => {
    loadUserData().then((data) => {
      if (Array.isArray(data.journal)) setTrades(data.journal);
      else {
        try {
          const local = JSON.parse(localStorage.getItem("xau-trades") || "[]");
          setTrades(local);
          if (local.length) void saveUserSection("journal", local);
        } catch {}
      }
    }).catch(() => {});
  }, []);
  const save = () => {
    const pnl =
      (form.direction === "BUY"
        ? form.exit - form.entry
        : form.entry - form.exit) *
      form.lot *
      100;
    const next = [{ ...form, id: Date.now(), pnl }, ...trades];
    setTrades(next);
    localStorage.setItem("xau-trades", JSON.stringify(next));
    void saveUserSection("journal", next);
  };
  const remove = (id: number) => {
    const next = trades.filter((x) => x.id !== id);
    setTrades(next);
    localStorage.setItem("xau-trades", JSON.stringify(next));
    void saveUserSection("journal", next);
  };
  return (
    <Page
      title="Trade journal"
      sub="Save trades securely to your account and review performance"
    >
      <div className="journal-stats">
        <MetricBox a="Total trades" b={trades.length} />
        <MetricBox
          a="Win rate"
          b={
            trades.length
              ? `${Math.round((trades.filter((x) => x.pnl > 0).length / trades.length) * 100)}%`
              : "—"
          }
        />
        <MetricBox
          a="Estimated P/L"
          b={trades.reduce((a, x) => a + x.pnl, 0).toFixed(2)}
        />
      </div>
      <section className="panel form-card">
        <div className="panel-head">
          <b>Add completed trade</b>
          <BookOpen />
        </div>
        <div className="form-grid journal-form">
          <label>
            Date
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </label>
          <label>
            Direction
            <select
              value={form.direction}
              onChange={(e) => setForm({ ...form, direction: e.target.value })}
            >
              <option>BUY</option>
              <option>SELL</option>
            </select>
          </label>
          {(["entry", "exit", "lot"] as const).map((k) => (
            <label key={k}>
              {k.toUpperCase()}
              <input
                type="number"
                step="any"
                value={form[k]}
                onChange={(e) =>
                  setForm({ ...form, [k]: Number(e.target.value) })
                }
              />
            </label>
          ))}
          <label>
            Notes
            <input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </label>
        </div>
        <button className="primary" onClick={save}>
          <FloppyDisk /> Save trade
        </button>
      </section>
      <section className="panel journal-table">
        <table>
          <thead>
            <tr>
              <th>DATE</th>
              <th>SIDE</th>
              <th>ENTRY</th>
              <th>EXIT</th>
              <th>LOT</th>
              <th>P/L</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {trades.length ? (
              trades.map((t) => (
                <tr key={t.id}>
                  <td>{t.date}</td>
                  <td>{t.direction}</td>
                  <td>{t.entry}</td>
                  <td>{t.exit}</td>
                  <td>{t.lot}</td>
                  <td className={t.pnl >= 0 ? "green" : "red"}>
                    {t.pnl.toFixed(2)}
                  </td>
                  <td>
                    <button className="icon-btn" onClick={() => remove(t.id)}>
                      <Trash />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7}>No trades saved yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </Page>
  );
}
function MetricBox({ a, b }: { a: string; b: any }) {
  return (
    <div>
      <span>{a}</span>
      <b>{b}</b>
    </div>
  );
}
function BrokerSettings() {
  const [spec, setSpec] = useState({
    broker: "My Broker",
    symbol: "XAUUSDm",
    contract: 100,
    tick: 0.01,
    tickValue: 1,
    digits: 2,
  });
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    loadUserData().then((data) => {
      if (data.brokerSettings) setSpec(data.brokerSettings);
      else {
        try {
          const x = localStorage.getItem("xau-broker");
          if (x) { const parsed = JSON.parse(x); setSpec(parsed); void saveUserSection("brokerSettings", parsed); }
        } catch {}
      }
    }).catch(() => {});
  }, []);
  const save = () => {
    localStorage.setItem("xau-broker", JSON.stringify(spec));
    void saveUserSection("brokerSettings", spec);
    setSaved(true);
  };
  return (
    <Page
      title="Broker settings"
      sub="Match calculations to your broker contract specification"
    >
      <section className="panel form-card">
        <div className="panel-head">
          <b>Contract specification</b>
          <Gear />
        </div>
        <div className="form-grid">
          {Object.entries(spec).map(([k, v]) => (
            <label key={k}>
              {k.replace(/([A-Z])/g, " $1").toUpperCase()}
              <input
                value={v}
                type={typeof v === "number" ? "number" : "text"}
                step="any"
                onChange={(e) =>
                  setSpec({
                    ...spec,
                    [k]:
                      typeof v === "number"
                        ? Number(e.target.value)
                        : e.target.value,
                  })
                }
              />
            </label>
          ))}
        </div>
        <button className="primary" onClick={save}>
          <FloppyDisk /> Save settings
        </button>
        {saved && <span className="saved">Saved to MongoDB.</span>}
      </section>
    </Page>
  );
}

type ManagedUser = { id: string; name?: string; email: string; role: "owner" | "user"; active?: boolean; lastLoginAt?: string };
function UserManagement() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "user" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    try { const r = await fetch("/api/users", { cache: "no-store" }); const x = await r.json(); if (!r.ok) throw new Error(x.message); setUsers(x.data); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Gagal memuat user"); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const request = async (method: string, body?: unknown, query = "") => {
    setMessage("");
    const r = await fetch(`/api/users${query}`, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
    const x = await r.json();
    if (!r.ok) { setMessage(x.message || "Operasi gagal"); return false; }
    await load(); return true;
  };
  const create = async () => {
    if (await request("POST", form)) { setForm({ name: "", email: "", password: "", role: "user" }); setMessage("User berhasil dibuat."); }
  };
  return <Page title="User management" sub="Kelola akses dan data pengguna LELXZYY TRADE">
    <section className="panel form-card user-create">
      <div className="panel-head"><b>Add user</b><UserPlus /></div>
      <div className="form-grid">
        <label>NAME<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label>EMAIL<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <label>PASSWORD<input type="password" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
        <label>ROLE<select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="user">User</option><option value="owner">Owner</option></select></label>
      </div>
      <button className="primary" onClick={create} disabled={!form.name || !form.email || form.password.length < 8}><UserPlus /> Create user</button>
      {message && <span className="saved">{message}</span>}
    </section>
    <section className="panel journal-table user-table"><table><thead><tr><th>USER</th><th>ROLE</th><th>STATUS</th><th>LAST LOGIN</th><th>ACTIONS</th></tr></thead>
      <tbody>{loading ? <tr><td colSpan={5}>Loading users…</td></tr> : users.map((user) => <tr key={user.id}>
        <td><b>{user.name || "Unnamed"}</b><small>{user.email}</small></td><td><span className="tag">{user.role.toUpperCase()}</span></td>
        <td className={user.active === false ? "red" : "green"}>{user.active === false ? "INACTIVE" : "ACTIVE"}</td>
        <td>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) : "Never"}</td>
        <td><div className="user-actions"><button onClick={() => void request("PATCH", { email: user.email, active: user.active === false })}>{user.active === false ? "Enable" : "Disable"}</button><button onClick={() => { const password = window.prompt("Password baru (minimal 8 karakter)"); if (password) void request("PATCH", { email: user.email, password }); }}>Reset</button><button className="delete" onClick={() => { if (window.confirm(`Hapus ${user.email} beserta seluruh datanya?`)) void request("DELETE", undefined, `?email=${encodeURIComponent(user.email)}`); }}>Delete</button></div></td>
      </tr>)}</tbody></table></section>
  </Page>;
}

type ProviderKey = { id:string; label:string; maskedKey:string; active:boolean; priority:number; remaining?:number; limit?:number; lastError?:string; disabledUntil?:string };
function ApiKeyManagement(){
  const [keys,setKeys]=useState<ProviderKey[]>([]),[label,setLabel]=useState(""),[key,setKey]=useState(""),[message,setMessage]=useState("");
  const load=async()=>{const r=await fetch("/api/provider-keys",{cache:"no-store"});const x=await r.json();if(r.ok)setKeys(x.data);else setMessage(x.message)};
  useEffect(()=>{void load()},[]);
  const call=async(method:string,body?:unknown,query="")=>{const r=await fetch(`/api/provider-keys${query}`,{method,headers:body?{"Content-Type":"application/json"}:undefined,body:body?JSON.stringify(body):undefined});const x=await r.json();if(!r.ok){setMessage(x.message);return false}await load();return true};
  return <Page title="Twelve Data API pool" sub="Rotasi otomatis ketika kredit salah satu API key habis">
    <section className="panel form-card user-create"><div className="panel-head"><b>Add API key</b><Key /></div><div className="form-grid"><label>LABEL<input value={label} onChange={e=>setLabel(e.target.value)} placeholder="Primary key"/></label><label>TWELVE DATA KEY<input type="password" value={key} onChange={e=>setKey(e.target.value)} placeholder="Paste API key"/></label></div><button className="primary" disabled={key.length<20} onClick={async()=>{if(await call("POST",{label,key})){setLabel("");setKey("");setMessage("API key tersimpan terenkripsi.")}}}><Key/> Add key</button>{message&&<span className="saved">{message}</span>}</section>
    <section className="panel journal-table user-table"><table><thead><tr><th>PRIORITY</th><th>LABEL / KEY</th><th>CREDITS</th><th>ROTATION</th><th>ACTIONS</th></tr></thead><tbody>{keys.length?keys.map(x=><tr key={x.id}><td>#{x.priority}</td><td><b>{x.label}</b><small>{x.maskedKey} · {x.active?"ACTIVE":"DISABLED"}</small></td><td className={(x.remaining??1)===0?"red":"green"}>{x.remaining!==undefined?`${x.remaining} / ${x.limit}`:"—"}</td><td>{x.disabledUntil?`Retry ${new Date(x.disabledUntil).toLocaleString("id-ID",{timeZone:"Asia/Jakarta"})}`:"READY"}</td><td><div className="user-actions"><button onClick={()=>void call("PATCH",{id:x.id,active:!x.active})}>{x.active?"Disable":"Enable"}</button><button onClick={()=>{const value=window.prompt("API key baru");if(value)void call("PATCH",{id:x.id,key:value})}}>Change</button><button onClick={()=>{const value=window.prompt("Priority",String(x.priority));if(value)void call("PATCH",{id:x.id,priority:Number(value)})}}>Priority</button><button className="delete" onClick={()=>{if(confirm(`Hapus ${x.label}?`))void call("DELETE",undefined,`?id=${x.id}`)}}>Delete</button></div></td></tr>):<tr><td colSpan={5}>Belum ada API key.</td></tr>}</tbody></table></section>
  </Page>
}
