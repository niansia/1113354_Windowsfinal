import type { ApodData } from "../services/nasaService";

interface ApodPanelProps {
  apod: ApodData | null;
  loading: boolean;
}

const SOURCE_LABEL: Record<ApodData["source"], string> = {
  live: "NASA APOD · 即時",
  cache: "NASA APOD · 快取",
  fallback: "離線備援"
};

// NASA Astronomy Picture of the Day — live real data with graceful fallback.
export function ApodPanel({ apod, loading }: ApodPanelProps) {
  return (
    <section className="apod-panel">
      <div className="panel-title">
        NASA 每日宇宙影像
        <span className={`apod-badge ${apod?.source ?? "loading"}`}>
          {loading ? "載入中" : apod ? SOURCE_LABEL[apod.source] : "—"}
        </span>
      </div>
      {apod?.mediaType === "image" && apod.url ? (
        <div className="apod-image" style={{ backgroundImage: `url(${apod.url})` }} />
      ) : (
        <div className="apod-image apod-image-empty">✦ ✶ ✦</div>
      )}
      <div className="apod-title">{loading ? "正在連線 NASA…" : apod?.title}</div>
      <p className="apod-text">{loading ? "" : apod?.explanation}</p>
      {apod && (
        <div className="apod-meta">
          {apod.date}
          {apod.copyright ? ` · © ${apod.copyright}` : ""}
        </div>
      )}
    </section>
  );
}
