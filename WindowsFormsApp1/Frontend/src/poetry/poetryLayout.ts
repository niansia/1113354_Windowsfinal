import type {
  PoetryGraph,
  PoetryLayoutNode
} from './poetryTypes.js';

const DYNASTY_COLORS = [
  '#ffd166',
  '#ff9f68',
  '#ff6f91',
  '#d970ff',
  '#7dd3fc',
  '#72f1b8',
  '#fca5a5'
];

const hashString = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const randomFrom = (seed: number) => {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
};

export function createPoetryLayout(
  graph: PoetryGraph,
  options: { width: number; height: number; seed?: number }
): PoetryLayoutNode[] {
  const padding = 60;
  const width = Math.max(options.width, padding * 2 + 1);
  const height = Math.max(options.height, padding * 2 + 1);
  const centerX = width * 0.52;
  const centerY = height * 0.5;
  const maxRadius = Math.min(width, height) * 0.38;
  const weights = graph.nodes.map((node) => node.weight);
  const minWeight = Math.min(...weights, 1);
  const maxWeight = Math.max(...weights, 1);

  return graph.nodes.map((node, index) => {
    const random = randomFrom((options.seed ?? 1337) + hashString(node.poetId));
    const ring = 0.2 + Math.sqrt((index + 1) / Math.max(1, graph.nodes.length)) * 0.8;
    const angle = index * 2.399963229728653 + (random() - 0.5) * 0.38;
    const radial = maxRadius * ring * (0.78 + random() * 0.22);
    const normalizedWeight = (node.weight - minWeight) / Math.max(0.001, maxWeight - minWeight);
    return {
      poetId: node.poetId,
      x: Math.min(width - padding, Math.max(padding, centerX + Math.cos(angle) * radial)),
      y: Math.min(height - padding, Math.max(padding, centerY + Math.sin(angle) * radial * 0.76)),
      radius: 8 + normalizedWeight * 20,
      color: DYNASTY_COLORS[index % DYNASTY_COLORS.length]
    };
  });
}

