// Hoverable "?" help chip explaining what every gesture does. Pure hover/focus
// popover (no state) so it works the same in normal and immersive layouts.

interface GestureRow {
  icon: string;
  name: string;
  action: string;
}

const GESTURES: GestureRow[] = [
  { icon: "👉", name: "左右揮手", action: "星際旅行：滑向上一個 / 下一個天體" },
  { icon: "👆", name: "上下揮手", action: "切換星區分類（星圖中：上下環視）" },
  { icon: "✋", name: "手掌移動", action: "環繞、微調瞄準視角" },
  { icon: "🖐️", name: "張掌", action: "進入核心 / 詳細資料（星圖中：飛入該天體）" },
  { icon: "✊", name: "握拳", action: "返回上一層（星圖中：離開星圖）" }
];

const KEYS = "鍵盤： F 全螢幕沉浸 · M 宇宙星圖 · ← → 星際旅行 · Esc 返回";

export function GestureHelp({ className = "" }: { className?: string }) {
  return (
    <div className={`gesture-help ${className}`}>
      <button type="button" className="gh-button" aria-label="手勢說明" title="手勢說明">
        ?
      </button>
      <div className="gh-pop" role="tooltip">
        <div className="gh-head">手勢操作說明</div>
        <ul className="gh-list">
          {GESTURES.map((g) => (
            <li key={g.name}>
              <span className="gh-icon">{g.icon}</span>
              <span className="gh-name">{g.name}</span>
              <span className="gh-action">{g.action}</span>
            </li>
          ))}
        </ul>
        <div className="gh-keys">{KEYS}</div>
      </div>
    </div>
  );
}
