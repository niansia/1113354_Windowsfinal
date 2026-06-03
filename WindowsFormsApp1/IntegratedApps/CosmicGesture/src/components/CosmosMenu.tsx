import { useMemo, useState } from "react";
import { CATEGORIES, type CatalogCategory, entriesByCategory, searchCatalog } from "../data/catalog";

interface CosmosMenuProps {
  activeCategory: CatalogCategory;
  selectedId: string;
  onCategoryChange: (category: CatalogCategory) => void;
  onSelect: (id: string) => void;
}

// Categorised + searchable explorer menu. Left column = category tabs, right column
// = the bodies in that category, or live search results across the whole catalog.
export function CosmosMenu({ activeCategory, selectedId, onCategoryChange, onSelect }: CosmosMenuProps) {
  const [query, setQuery] = useState("");
  const searching = query.trim().length > 0;
  const allResults = useMemo(() => (searching ? searchCatalog(query) : entriesByCategory(activeCategory)), [searching, query, activeCategory]);
  // The catalog now spans ~1,900 real objects — cap the rendered list so huge
  // categories (1,000+ galaxies) stay smooth; search narrows the full set.
  const CAP = 280;
  const results = useMemo(() => allResults.slice(0, CAP), [allResults]);
  const truncated = allResults.length - results.length;
  const headLabel = searching ? "搜尋結果" : CATEGORIES.find((c) => c.id === activeCategory)?.englishName;

  return (
    <nav className="cosmos-menu" aria-label="宇宙天體導覽">
      <div className="cosmos-menu-cats">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={!searching && cat.id === activeCategory ? "cat-tab active" : "cat-tab"}
            onClick={() => { setQuery(""); onCategoryChange(cat.id); }}
            title={cat.englishName}
          >
            <span className="cat-glyph">{cat.glyph}</span>
            <span className="cat-name">{cat.name}</span>
          </button>
        ))}
      </div>
      <div className="cosmos-menu-list">
        <input
          className="cosmos-search"
          type="text"
          value={query}
          placeholder="搜尋天體 / M96 / 黑洞 / 獵戶座…"
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="cosmos-menu-list-head">
          {headLabel}
          <span>{allResults.length}</span>
        </div>
        <div className="cosmos-menu-scroll">
          {results.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className={entry.id === selectedId ? "body-item active" : "body-item"}
              onClick={() => onSelect(entry.id)}
            >
              <span className="body-dot" style={{ background: entry.accent }} />
              <span className="body-item-text">
                <b>{entry.name}</b>
                <small>{entry.englishName}</small>
              </span>
            </button>
          ))}
          {searching && results.length === 0 && <div className="cosmos-empty">找不到符合的天體</div>}
          {truncated > 0 && <div className="cosmos-empty">還有 {truncated} 筆 · 用上方搜尋縮小範圍</div>}
        </div>
      </div>
    </nav>
  );
}
