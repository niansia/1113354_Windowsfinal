import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BookHeart,
  BookOpenText,
  Check,
  ChevronRight,
  CircleDot,
  Copy,
  ExternalLink,
  Heart,
  LocateFixed,
  Network,
  Pause,
  Play,
  RefreshCw,
  Route,
  Search,
  Share2,
  Sparkles,
  Volume2,
  X
} from 'lucide-react';
import { PoetryUniverseCanvas } from './poetry/PoetryUniverseCanvas';
import { analyzePoem } from '../poetry/poetryAnalysis';
import { POETRY_CORPUS_META, POEMS, POETS } from '../poetry/poetryCorpus';
import {
  getFavoriteViewFilters,
  parseFavoritePoems,
  POETRY_FAVORITES_KEY,
  serializeFavoritePoems,
  toggleFavoritePoem
} from '../poetry/poetryFavorites';
import { findPoetPath } from '../poetry/poetryGraph';
import { fetchPoetryBundle, getPoetryDisplayStats, mergeCorpus } from '../poetry/poetryRemoteCorpus';
import type { PoetryBundle } from '../poetry/poetryRemoteCorpus';
import { searchPoetry } from '../poetry/poetrySearch';
import type {
  Poet,
  Poem,
  PoetryDynasty,
  PoetryForm,
  PoetrySearchMode
} from '../poetry/poetryTypes';

interface FusionPoetryCloudProps {
  open: boolean;
  onClose: () => void;
  accent: string;
}

const DYNASTIES: Array<PoetryDynasty | '全部'> = ['全部', '先秦', '漢', '魏晉', '唐', '宋', '元', '明', '清'];
const FORMS: Array<PoetryForm | '全部'> = ['全部', '五絕', '七絕', '五律', '七律', '古體', '樂府', '詞', '曲', '自由'];
const SEARCH_MODES: PoetrySearchMode[] = ['全部', '詩人', '詩作'];

const POETRY_HOTSPOTS = [
  { label: '明月', query: '明月' },
  { label: '秋日', query: '秋日' },
  { label: '思鄉', query: '思鄉' },
  { label: '山水', query: '山水' },
  { label: '家國', query: '家國' }
];

const poemText = (poem: Poem, poet?: Poet) =>
  `《${poem.title}》\n${poet?.dynasty ?? poem.dynasty}・${poet?.name ?? ''}\n\n${poem.content.join('\n')}`;

export function FusionPoetryCloud({ open, onClose, accent }: FusionPoetryCloudProps) {
  const [query, setQuery] = useState('');
  const [dynasty, setDynasty] = useState<PoetryDynasty | '全部'>('全部');
  const [form, setForm] = useState<PoetryForm | '全部'>('全部');
  const [mode, setMode] = useState<PoetrySearchMode>('全部');
  const [selectedPoetId, setSelectedPoetId] = useState('li-bai');
  const [selectedPoemId, setSelectedPoemId] = useState('quiet-night-thought');
  const [routeStart, setRouteStart] = useState('li-bai');
  const [routeEnd, setRouteEnd] = useState('du-fu');
  const [routePoetIds, setRoutePoetIds] = useState<string[]>(['li-bai', 'du-fu']);
  const [routeReasons, setRouteReasons] = useState<string[]>(['盛唐詩壇最著名的相知交遊，杜甫多次作詩懷念李白']);
  const [resetToken, setResetToken] = useState(0);
  const [showFavorites, setShowFavorites] = useState(false);
  const [speakingPoemId, setSpeakingPoemId] = useState('');
  const [notice, setNotice] = useState('');
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    return parseFavoritePoems(window.localStorage.getItem(POETRY_FAVORITES_KEY));
  });
  const [bundle, setBundle] = useState<PoetryBundle | null>(null);

  // lazily pull the generated public-domain corpus and weave it into the curated
  // set; until it arrives the curated 20 poets render instantly.
  useEffect(() => {
    if (!open || bundle) return;
    const controller = new AbortController();
    let cancelled = false;
    fetchPoetryBundle(controller.signal).then((data) => {
      if (!cancelled && data) setBundle(data);
    });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [open, bundle]);

  const corpus = useMemo(() => mergeCorpus(POETS, POEMS, bundle), [bundle]);
  const archiveStats = useMemo(() => getPoetryDisplayStats(corpus), [corpus]);
  const allPoets = corpus.poets;
  const allPoems = corpus.poems;
  const graph = corpus.graph;
  const searchResult = useMemo(
    () => searchPoetry(allPoets, allPoems, { query, dynasty, form, mode }),
    [allPoems, allPoets, dynasty, form, mode, query]
  );
  const visiblePoems = useMemo(
    () => showFavorites
      ? searchResult.poems.filter((poem) => favorites.has(poem.id))
      : searchResult.poems,
    [favorites, searchResult.poems, showFavorites]
  );
  const visiblePoetIds = useMemo(
    () => new Set(visiblePoems.map((poem) => poem.poetId)),
    [visiblePoems]
  );
  const visiblePoets = useMemo(() => {
    if (!showFavorites) return searchResult.poets;
    return searchResult.poets.filter((poet) => visiblePoetIds.has(poet.id));
  }, [searchResult.poets, showFavorites, visiblePoetIds]);
  const selectedPoet = allPoets.find((poet) => poet.id === selectedPoetId) ?? allPoets[0];
  const selectedPoetPoems = useMemo(() => {
    const matched = visiblePoems.filter((poem) => poem.poetId === selectedPoet.id);
    return matched.length ? matched : allPoems.filter((poem) => poem.poetId === selectedPoet.id);
  }, [allPoems, selectedPoet.id, visiblePoems]);
  const selectedPoem = allPoems.find((poem) => poem.id === selectedPoemId)
    ?? selectedPoetPoems[0]
    ?? allPoems[0];
  const analysis = useMemo(() => analyzePoem(selectedPoem), [selectedPoem]);
  const poetById = useMemo(() => new Map(allPoets.map((poet) => [poet.id, poet])), [allPoets]);
  const routeNameOptions = useMemo(
    () => [...allPoets].sort((a, b) => b.poemCount - a.poemCount).slice(0, 800),
    [allPoets]
  );
  const poetIdByName = useMemo(() => new Map(allPoets.map((poet) => [poet.name, poet.id])), [allPoets]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, open]);

  useEffect(() => {
    if (!visiblePoets.length || visiblePoets.some((poet) => poet.id === selectedPoetId)) return;
    const nextPoet = visiblePoets[0];
    setSelectedPoetId(nextPoet.id);
    setSelectedPoemId(nextPoet.featuredPoemIds[0] ?? allPoems.find((poem) => poem.poetId === nextPoet.id)?.id ?? '');
  }, [allPoems, selectedPoetId, visiblePoets]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(POETRY_FAVORITES_KEY, serializeFavoritePoems(favorites));
    }
  }, [favorites]);

  useEffect(() => () => {
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
  }, []);

  if (!open) return null;

  const selectPoet = (poetId: string) => {
    const poet = poetById.get(poetId);
    setSelectedPoetId(poetId);
    const nextPoem = poet?.featuredPoemIds[0] ?? allPoems.find((poem) => poem.poetId === poetId)?.id;
    if (nextPoem) setSelectedPoemId(nextPoem);
  };

  const selectPoem = (poetId: string, poemId: string) => {
    setSelectedPoetId(poetId);
    setSelectedPoemId(poemId);
  };

  const runRoute = () => {
    const path = findPoetPath(graph, routeStart, routeEnd);
    setRoutePoetIds(path.poetIds);
    setRouteReasons(path.edges.map((edge) => edge.reason));
    if (path.poetIds.length) selectPoet(path.poetIds[path.poetIds.length - 1]);
    setNotice(path.poetIds.length ? `已找到 ${Math.max(0, path.poetIds.length - 1)} 段關係路徑` : '目前資料中找不到連通路徑');
  };

  const toggleFavorite = (poemId: string) => {
    setFavorites((current) => toggleFavoritePoem(current, poemId));
    setNotice(favorites.has(poemId) ? '已從藏詩移除' : '已收入藏詩');
  };

  const copyPoem = async () => {
    try {
      await navigator.clipboard.writeText(poemText(selectedPoem, poetById.get(selectedPoem.poetId)));
      setNotice('詩文已複製');
    } catch {
      setNotice('瀏覽器未允許剪貼簿，請手動選取詩文');
    }
  };

  const sharePoem = async () => {
    const text = poemText(selectedPoem, poetById.get(selectedPoem.poetId));
    try {
      if (navigator.share) {
        await navigator.share({ title: `詩雲・${selectedPoem.title}`, text });
        setNotice('分享面板已開啟');
      } else {
        await navigator.clipboard.writeText(text);
        setNotice('此環境不支援分享，詩文已複製');
      }
    } catch {
      setNotice('已取消分享');
    }
  };

  const speakPoem = () => {
    if (!('speechSynthesis' in window)) {
      setNotice('此環境不支援語音朗讀');
      return;
    }
    if (speakingPoemId === selectedPoem.id) {
      window.speechSynthesis.cancel();
      setSpeakingPoemId('');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(
      `${selectedPoem.title}，${poetById.get(selectedPoem.poetId)?.name ?? ''}。${selectedPoem.content.join('。')}`
    );
    utterance.lang = 'zh-TW';
    utterance.rate = 0.76;
    utterance.pitch = 0.92;
    utterance.onend = () => setSpeakingPoemId('');
    utterance.onerror = () => {
      setSpeakingPoemId('');
      setNotice('語音朗讀暫時無法使用');
    };
    window.speechSynthesis.speak(utterance);
    setSpeakingPoemId(selectedPoem.id);
  };

  const clearFilters = () => {
    setQuery('');
    setDynasty('全部');
    setForm('全部');
    setMode('全部');
    setShowFavorites(false);
  };

  const toggleFavoritesView = () => {
    if (showFavorites) {
      setShowFavorites(false);
      return;
    }
    const filters = getFavoriteViewFilters();
    setQuery(filters.query);
    setDynasty(filters.dynasty);
    setForm(filters.form);
    setMode(filters.mode);
    setShowFavorites(true);
  };

  return (
    <motion.div
      className="poetry-cloud-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ ['--poetry-accent' as string]: accent }}
    >
      <section className="poetry-cloud-shell" aria-label="詩雲古典詩詞關係宇宙">
        <header className="poetry-topbar">
          <div className="poetry-brand">
            <span className="poetry-brand-mark"><BookOpenText size={22} /></span>
            <div><strong>詩雲</strong><small>Poetry Cloud</small></div>
          </div>

          <div className="poetry-form-tabs" aria-label="體裁快速篩選">
            {FORMS.slice(1, 8).map((item) => (
              <button
                key={item}
                type="button"
                className={form === item ? 'active' : ''}
                onClick={() => setForm((current) => current === item ? '全部' : item)}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="poetry-corpus-status">
            <span>
              {archiveStats.archivePoets.toLocaleString('zh-TW')} 位詩人・{archiveStats.archivePoems.toLocaleString('zh-TW')} 首
            </span>
            <b>
              已載入 {archiveStats.loadedPoets.toLocaleString('zh-TW')} 星節點・{archiveStats.loadedTextPoems.toLocaleString('zh-TW')} 首真實文本
              {!bundle && '（載入中…）'}
            </b>
          </div>
          <button type="button" className="poetry-close" onClick={onClose} title="關閉詩雲"><X size={20} /></button>
        </header>

        <section className="poetry-command-deck">
          <div className="poetry-mode-tabs">
            {SEARCH_MODES.map((item) => (
              <button key={item} type="button" className={mode === item ? 'active' : ''} onClick={() => setMode(item)}>
                {item === '全部' ? '漫遊' : item}
              </button>
            ))}
            <button type="button" className={showFavorites ? 'active favorite' : 'favorite'} onClick={toggleFavoritesView}>
              <Heart size={13} fill={showFavorites ? 'currentColor' : 'none'} /> 藏詩
            </button>
          </div>
          <label className="poetry-search-box">
            <Search size={17} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜尋詩人、詩題、詩句或意象"
            />
            {query && <button type="button" onClick={() => setQuery('')} title="清除搜尋"><X size={14} /></button>}
          </label>
          <label className="poetry-select">
            <span>朝代</span>
            <select value={dynasty} onChange={(event) => setDynasty(event.target.value as PoetryDynasty | '全部')}>
              {DYNASTIES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="poetry-select">
            <span>體裁</span>
            <select value={form} onChange={(event) => setForm(event.target.value as PoetryForm | '全部')}>
              {FORMS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <button type="button" className="poetry-reset-view" onClick={() => setResetToken((value) => value + 1)}>
            <LocateFixed size={16} /> 重設星圖
          </button>
        </section>

        <div className="poetry-workspace">
          <aside className="poetry-route-panel">
            <section className="poetry-panel-block">
              <header><Sparkles size={15} /><strong>靈感入口</strong></header>
              <div className="poetry-hotspots">
                {POETRY_HOTSPOTS.map((item) => (
                  <button key={item.label} type="button" onClick={() => setQuery(item.query)}>{item.label}</button>
                ))}
              </div>
            </section>

            <section className="poetry-panel-block route-builder">
              <header><Route size={15} /><strong>詩路漫遊</strong></header>
              <p>選擇兩位詩人，尋找交遊、唱和、時代與意象的最短路徑。</p>
              <label>
                <span>起點詩人</span>
                <input
                  list="poetry-route-start"
                  value={poetById.get(routeStart)?.name ?? ''}
                  placeholder="輸入詩人，如 李白"
                  onChange={(event) => {
                    const id = poetIdByName.get(event.target.value.trim());
                    if (id) setRouteStart(id);
                  }}
                />
                <datalist id="poetry-route-start">
                  {routeNameOptions.map((poet) => <option key={poet.id} value={poet.name} />)}
                </datalist>
              </label>
              <label>
                <span>終點詩人</span>
                <input
                  list="poetry-route-end"
                  value={poetById.get(routeEnd)?.name ?? ''}
                  placeholder="輸入詩人，如 蘇軾"
                  onChange={(event) => {
                    const id = poetIdByName.get(event.target.value.trim());
                    if (id) setRouteEnd(id);
                  }}
                />
                <datalist id="poetry-route-end">
                  {routeNameOptions.map((poet) => <option key={poet.id} value={poet.name} />)}
                </datalist>
              </label>
              <button type="button" className="poetry-primary-action" onClick={runRoute}>
                <Network size={15} /> 尋找關係
              </button>
            </section>

            <section className="poetry-panel-block route-result">
              <header><CircleDot size={15} /><strong>目前路徑</strong></header>
              {routePoetIds.length ? (
                <div className="poetry-route-steps">
                  {routePoetIds.map((poetId, index) => (
                    <div key={`${poetId}-${index}`}>
                      <button type="button" onClick={() => selectPoet(poetId)}>
                        <b>{poetById.get(poetId)?.name}</b>
                        <small>{poetById.get(poetId)?.dynasty}</small>
                      </button>
                      {index < routePoetIds.length - 1 && (
                        <span><ChevronRight size={13} />{routeReasons[index]}</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : <p>尚未找到路徑。</p>}
            </section>

            <footer>
              <a href={corpus.meta.sourceUrl ?? POETRY_CORPUS_META.publicSourceUrl} target="_blank" rel="noreferrer">
                公開語料來源 <ExternalLink size={12} />
              </a>
            </footer>
          </aside>

          <main className="poetry-universe-stage">
            {visiblePoets.length ? (
              <PoetryUniverseCanvas
                poets={visiblePoets}
                poems={visiblePoems}
                graph={graph}
                selectedPoetId={selectedPoet.id}
                selectedPoemId={selectedPoem.id}
                form={form}
                resetToken={resetToken}
                archivePoetCount={archiveStats.archivePoets}
                archivePoemCount={archiveStats.archivePoems}
                onSelectPoet={selectPoet}
                onSelectPoem={selectPoem}
              />
            ) : (
              <div className="poetry-empty-state">
                <Search size={30} />
                <strong>沒有符合條件的詩雲節點</strong>
                <p>清除搜尋或改用其他朝代與體裁。</p>
                <button type="button" onClick={clearFilters}>清除全部條件</button>
              </div>
            )}
            <div className="poetry-stage-caption">
              <span><b>{visiblePoets.length.toLocaleString('zh-TW')}</b> 位詩人</span>
              <span><b>{visiblePoems.length.toLocaleString('zh-TW')}</b> 首作品</span>
              <span>WASD / 方向鍵飛行・拖曳轉向・滾輪調速・點詩星看真作・點虛空撈詩</span>
            </div>
          </main>

          <aside className="poetry-library-panel">
            <header className="poetry-poet-header">
              <div>
                <small>{selectedPoet.dynasty}・{selectedPoet.born ?? '生年不詳'}—{selectedPoet.died ?? '卒年不詳'}</small>
                <h2>{selectedPoet.name}</h2>
                <p>{[selectedPoet.courtesyName && `字${selectedPoet.courtesyName}`, selectedPoet.sobriquet].filter(Boolean).join('・')}</p>
              </div>
              <span><b>{selectedPoet.poemCount.toLocaleString('zh-TW')}</b> 傳世作品</span>
            </header>
            <p className="poetry-poet-bio">{selectedPoet.bio}</p>
            <div className="poetry-tag-row">
              {[...selectedPoet.styles, ...selectedPoet.themes].slice(0, 7).map((tag) => <span key={tag}>{tag}</span>)}
            </div>

            <div className="poetry-section-heading">
              <BookHeart size={15} />
              <strong>{showFavorites ? '我的藏詩' : '代表詩作'}</strong>
              <span>{selectedPoetPoems.length}</span>
            </div>
            <div className="poetry-poem-list">
              {selectedPoetPoems.map((poem) => (
                <button
                  key={poem.id}
                  type="button"
                  className={selectedPoem.id === poem.id ? 'active' : ''}
                  onClick={() => setSelectedPoemId(poem.id)}
                >
                  <span>
                    <strong>{poem.title}</strong>
                    <small>{poem.form}・{poem.themes.slice(0, 2).join(' / ')}</small>
                  </span>
                  <Heart size={14} fill={favorites.has(poem.id) ? 'currentColor' : 'none'} />
                </button>
              ))}
            </div>

            <motion.article
                key={selectedPoem.id}
                className="poetry-poem-reader"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <header>
                  <div><small>{selectedPoem.dynasty}・{selectedPoem.form}</small><h3>{selectedPoem.title}</h3></div>
                  <div className="poetry-reader-actions">
                    <button type="button" onClick={() => toggleFavorite(selectedPoem.id)} title="收藏">
                      <Heart size={15} fill={favorites.has(selectedPoem.id) ? 'currentColor' : 'none'} />
                    </button>
                    <button type="button" onClick={speakPoem} title="朗讀">
                      {speakingPoemId === selectedPoem.id ? <Pause size={15} /> : <Volume2 size={15} />}
                    </button>
                    <button type="button" onClick={copyPoem} title="複製"><Copy size={15} /></button>
                    <button type="button" onClick={sharePoem} title="分享"><Share2 size={15} /></button>
                  </div>
                </header>
                <div className="poetry-verses">
                  {selectedPoem.content.map((line) => <p key={line}>{line}</p>)}
                </div>
                <section className="poetry-analysis">
                  <header><Sparkles size={14} /><strong>詩意解析</strong></header>
                  <p>{analysis.summary}</p>
                  <small>{analysis.mood}</small>
                  <div>{analysis.craft.map((item) => <span key={item}><Check size={11} />{item}</span>)}</div>
                </section>
              </motion.article>
          </aside>
        </div>

        <AnimatePresence>
          {notice && (
            <motion.button
              type="button"
              className="poetry-notice"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              onClick={() => setNotice('')}
            >
              <Check size={14} /> {notice}
            </motion.button>
          )}
        </AnimatePresence>
      </section>
    </motion.div>
  );
}
