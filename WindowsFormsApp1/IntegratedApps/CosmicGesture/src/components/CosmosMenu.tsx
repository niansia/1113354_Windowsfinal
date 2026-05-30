import { CATEGORIES, type CatalogCategory, entriesByCategory } from "../data/catalog";

interface CosmosMenuProps {
  activeCategory: CatalogCategory;
  selectedId: string;
  onCategoryChange: (category: CatalogCategory) => void;
  onSelect: (id: string) => void;
}

// Categorised, extensible explorer menu that replaces the old flat planet rail.
// Left column = category tabs, right column = the bodies in that category.
export function CosmosMenu({ activeCategory, selectedId, onCategoryChange, onSelect }: CosmosMenuProps) {
  const entries = entriesByCategory(activeCategory);

  return (
    <nav className="cosmos-menu" aria-label="宇宙天體導覽">
      <div className="cosmos-menu-cats">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={cat.id === activeCategory ? "cat-tab active" : "cat-tab"}
            onClick={() => onCategoryChange(cat.id)}
            title={cat.englishName}
          >
            <span className="cat-glyph">{cat.glyph}</span>
            <span className="cat-name">{cat.name}</span>
          </button>
        ))}
      </div>
      <div className="cosmos-menu-list">
        <div className="cosmos-menu-list-head">
          {CATEGORIES.find((c) => c.id === activeCategory)?.englishName}
          <span>{entries.length}</span>
        </div>
        <div className="cosmos-menu-scroll">
          {entries.map((entry) => (
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
        </div>
      </div>
    </nav>
  );
}
