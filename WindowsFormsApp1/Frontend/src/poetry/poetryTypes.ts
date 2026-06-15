export type PoetryDynasty =
  | '先秦'
  | '漢'
  | '魏晉'
  | '南北朝'
  | '唐'
  | '宋'
  | '元'
  | '明'
  | '清';

export type PoetryForm =
  | '五絕'
  | '七絕'
  | '五律'
  | '七律'
  | '古體'
  | '樂府'
  | '詞'
  | '曲'
  | '自由';

export type PoetrySearchMode = '全部' | '詩人' | '詩作';

export interface PoetRelationSeed {
  poetId: string;
  kind: '交遊' | '唱和' | '師承' | '同時代' | '風格' | '意象';
  reason: string;
  weight?: number;
}

export interface Poet {
  id: string;
  name: string;
  dynasty: PoetryDynasty;
  courtesyName?: string;
  sobriquet?: string;
  born?: number;
  died?: number;
  bio: string;
  themes: string[];
  styles: string[];
  poemCount: number;
  featuredPoemIds: string[];
  relations: PoetRelationSeed[];
}

export interface Poem {
  id: string;
  title: string;
  poetId: string;
  dynasty: PoetryDynasty;
  form: PoetryForm;
  content: string[];
  themes: string[];
  imagery: string[];
  note?: string;
}

export interface PoetrySearchFilters {
  query: string;
  dynasty: PoetryDynasty | '全部';
  form: PoetryForm | '全部';
  mode: PoetrySearchMode;
}

export interface PoetrySearchResult {
  poets: Poet[];
  poems: Poem[];
  total: number;
  matchedTerms: string[];
}

export interface PoetryGraphNode {
  poetId: string;
  poemIds: string[];
  weight: number;
}

export interface PoetryGraphEdge {
  source: string;
  target: string;
  kind: PoetRelationSeed['kind'];
  reason: string;
  weight: number;
}

export interface PoetryGraph {
  nodes: PoetryGraphNode[];
  edges: PoetryGraphEdge[];
}

export interface PoetryPath {
  poetIds: string[];
  edges: PoetryGraphEdge[];
}

export interface PoetryLayoutNode {
  poetId: string;
  x: number;
  y: number;
  radius: number;
  color: string;
}

export interface PoetryAnalysis {
  summary: string;
  mood: string;
  images: string[];
  craft: string[];
  themes: string[];
}

