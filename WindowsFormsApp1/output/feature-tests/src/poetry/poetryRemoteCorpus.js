"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchPoetryBundle = fetchPoetryBundle;
exports.mergeCorpus = mergeCorpus;
const KNOWN_DYNASTIES = ['先秦', '漢', '魏晉', '南北朝', '唐', '宋', '元', '明', '清'];
const KNOWN_FORMS = ['五絕', '七絕', '五律', '七律', '古體', '樂府', '詞', '曲', '自由'];
const asDynasty = (value) => KNOWN_DYNASTIES.includes(value) ? value : '唐';
const asForm = (value) => KNOWN_FORMS.includes(value) ? value : '古體';
const edgeKey = (a, b) => [a, b].sort().join('::');
/**
 * Fetches the generated corpus bundle. Returns null when it is absent so the
 * app keeps working with just the curated set.
 */
async function fetchPoetryBundle(signal) {
    try {
        // resolve relative to the document so it works under both the Vite dev
        // server (base '/') and the WinForms WebView2 host (base './', file://).
        const baseHref = typeof document !== 'undefined' ? document.baseURI : 'http://localhost/';
        const url = new URL('poetry/poetry-corpus.json', baseHref).href;
        const res = await fetch(url, { signal });
        if (!res.ok)
            return null;
        const data = (await res.json());
        if (!Array.isArray(data?.poets) || !Array.isArray(data?.poems))
            return null;
        return data;
    }
    catch {
        return null;
    }
}
/**
 * Merges the large generated bundle with the hand-authored curated corpus.
 * Curated poets win on biography / relations; their poem counts are upgraded
 * with the real numbers from the public dataset.
 */
function mergeCorpus(curatedPoets, curatedPoems, bundle) {
    const poetById = new Map();
    const curatedById = new Map();
    for (const poet of curatedPoets) {
        const clone = { ...poet, themes: [...poet.themes], styles: [...poet.styles] };
        poetById.set(poet.id, clone);
        curatedById.set(poet.id, clone);
    }
    const poems = curatedPoems.map((poem) => ({ ...poem }));
    const edgeMap = new Map();
    // curated explicit relations first (richest reasons)
    for (const poet of curatedPoets) {
        for (const relation of poet.relations) {
            if (!curatedById.has(relation.poetId) && !bundle)
                continue;
            edgeMap.set(edgeKey(poet.id, relation.poetId), {
                source: poet.id,
                target: relation.poetId,
                kind: relation.kind,
                reason: relation.reason,
                weight: relation.weight ?? 0.65
            });
        }
    }
    if (bundle) {
        for (const bp of bundle.poets) {
            const existing = poetById.get(bp.id);
            if (existing) {
                existing.poemCount = Math.max(existing.poemCount, bp.poemCount);
                for (const theme of bp.themes ?? []) {
                    if (!existing.themes.includes(theme))
                        existing.themes.push(theme);
                }
                continue;
            }
            poetById.set(bp.id, {
                id: bp.id,
                name: bp.name,
                dynasty: asDynasty(bp.dynasty),
                bio: bp.bio ?? `${bp.dynasty}代詩人。`,
                themes: bp.themes ?? [],
                styles: bp.styles ?? [],
                poemCount: bp.poemCount,
                featuredPoemIds: [],
                relations: []
            });
        }
        const featuredByPoet = new Map();
        for (const bm of bundle.poems) {
            if (!poetById.has(bm.poetId))
                continue;
            poems.push({
                id: bm.id,
                title: bm.title,
                poetId: bm.poetId,
                dynasty: asDynasty(bm.dynasty),
                form: asForm(bm.form),
                content: bm.content,
                themes: bm.themes ?? [],
                imagery: bm.imagery ?? []
            });
            const list = featuredByPoet.get(bm.poetId) ?? [];
            if (list.length < 3)
                list.push(bm.id);
            featuredByPoet.set(bm.poetId, list);
        }
        for (const [poetId, ids] of featuredByPoet) {
            const poet = poetById.get(poetId);
            if (poet && !poet.featuredPoemIds.length)
                poet.featuredPoemIds = ids;
        }
        for (const be of bundle.edges) {
            if (!poetById.has(be.source) || !poetById.has(be.target))
                continue;
            const key = edgeKey(be.source, be.target);
            if (edgeMap.has(key))
                continue; // keep curated relation if both exist
            edgeMap.set(key, {
                source: be.source,
                target: be.target,
                kind: be.kind ?? '交遊',
                reason: be.reason ?? '贈答提及往來',
                weight: be.weight ?? 0.4
            });
        }
    }
    const poems_byPoet = new Map();
    for (const poem of poems) {
        const list = poems_byPoet.get(poem.poetId) ?? [];
        list.push(poem.id);
        poems_byPoet.set(poem.poetId, list);
    }
    const poets = [...poetById.values()];
    const nodes = poets.map((poet) => ({
        poetId: poet.id,
        poemIds: poems_byPoet.get(poet.id) ?? [],
        weight: Math.max(1, Math.log10(poet.poemCount + 10))
    }));
    // drop edges that point at poets we dropped
    const liveIds = new Set(poets.map((p) => p.id));
    const edges = [...edgeMap.values()].filter((edge) => liveIds.has(edge.source) && liveIds.has(edge.target));
    return {
        poets,
        poems,
        graph: { nodes, edges },
        meta: bundle?.meta ?? {}
    };
}
