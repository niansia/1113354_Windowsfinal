import { CATEGORIES, type CatalogEntry } from "../data/catalog";

export type InfoTab = "summary" | "detail" | "fun" | "source";

const TABS: { id: InfoTab; label: string }[] = [
  { id: "summary", label: "摘要" },
  { id: "detail", label: "詳細資料" },
  { id: "fun", label: "趣味知識" },
  { id: "source", label: "NASA 來源" }
];

interface InfoCardProps {
  entry: CatalogEntry;
  tab: InfoTab;
  onTabChange: (tab: InfoTab) => void;
}

// Astronomy-style data card that adapts to any category (planet, galaxy, black
// hole, constellation…), with tabbed summary / detail / fun-facts / sources.
export function InfoCard({ entry, tab, onTabChange }: InfoCardProps) {
  const categoryMeta = CATEGORIES.find((c) => c.id === entry.category);

  return (
    <section className="info-card">
      <header className="info-card-head">
        <div className="info-card-glyph" style={{ color: entry.accent, borderColor: entry.accent }}>
          {categoryMeta?.glyph}
        </div>
        <div className="info-card-title">
          <h2>{entry.name}</h2>
          <p>{entry.englishName}</p>
          <span className="info-card-type" style={{ borderColor: entry.accent, color: entry.accent }}>
            {entry.subtype}
          </span>
        </div>
      </header>

      <div className="info-tabs">
        {TABS.map((t) => (
          <button key={t.id} type="button" className={t.id === tab ? "info-tab active" : "info-tab"} onClick={() => onTabChange(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="info-body">
        {tab === "summary" && (
          <>
            <p className="info-desc">{entry.description}</p>
            <dl className="info-grid">
              <Field label="所屬系統" value={entry.system} />
              <Field label="距離" value={entry.distance} />
              <Field label="半徑 / 尺寸" value={entry.radius} />
              <Field label="質量" value={entry.mass} />
            </dl>
          </>
        )}

        {tab === "detail" && (
          <dl className="info-grid">
            <Field label="類型" value={entry.subtype} />
            <Field label="表面溫度" value={entry.temperature} />
            <Field label="自轉週期" value={entry.rotationPeriod} />
            <Field label="軌道週期" value={entry.orbitalPeriod} />
            {entry.spectralType && <Field label="光譜型" value={entry.spectralType} />}
            <Field label="距離" value={entry.distance} />
            {entry.facts.map((fact, i) => (
              <div className="info-fact" key={i}>
                <span>›</span>
                <p>{fact}</p>
              </div>
            ))}
          </dl>
        )}

        {tab === "fun" && (
          <ul className="info-fun">
            {entry.funFacts.map((fact, i) => (
              <li key={i}>✦ {fact}</li>
            ))}
            <li className="info-tags">
              {entry.tags.map((tg) => (
                <span key={tg}>#{tg}</span>
              ))}
            </li>
          </ul>
        )}

        {tab === "source" && (
          <div className="info-sources">
            <p>資料來源（NASA 為主，輔以公開天文資料庫）：</p>
            {entry.sources.map((s) => (
              <a key={s.url} href={s.url} target="_blank" rel="noreferrer">
                ↗ {s.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-field">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
