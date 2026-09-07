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
  WifiSlash,
} from "@phosphor-icons/react";
import type { Analysis } from "@/app/page";
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
  return (
    <Page title="Economic calendar" sub="Gold-impact news and risk warnings">
      <Empty
        icon={<Newspaper />}
        title="Economic provider not configured"
        text="No fake events are shown. Connect a licensed economic-calendar provider before using news filters and countdown alerts."
      />
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
          <p className="eyebrow">XAUUSD SMART ASSISTANT</p>
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
              <span>GENERATED FROM ENGINE DATA</span>
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
    try {
      setTrades(JSON.parse(localStorage.getItem("xau-trades") || "[]"));
    } catch {}
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
  };
  const remove = (id: number) => {
    const next = trades.filter((x) => x.id !== id);
    setTrades(next);
    localStorage.setItem("xau-trades", JSON.stringify(next));
  };
  return (
    <Page
      title="Trade journal"
      sub="Save trades locally and review performance"
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
    try {
      const x = localStorage.getItem("xau-broker");
      if (x) setSpec(JSON.parse(x));
    } catch {}
  }, []);
  const save = () => {
    localStorage.setItem("xau-broker", JSON.stringify(spec));
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
        {saved && <span className="saved">Saved locally.</span>}
      </section>
    </Page>
  );
}
