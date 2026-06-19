import type { Poem, PoetryAnalysis } from './poetryTypes.js';

const moodFor = (poem: Poem) => {
  const text = [...poem.themes, ...poem.imagery].join('');
  if (/家國|戰亂|改革|戰事/.test(text)) return '沉雄而帶有時代重量';
  if (/離愁|思鄉|懷人|漂泊|羈旅/.test(text)) return '清寂含愁，情感由景物緩緩展開';
  if (/春日|青春|遊賞/.test(text)) return '明快清新，帶有流動的生命感';
  if (/禪意|山水|田園/.test(text)) return '澄澈疏朗，留有安靜而深遠的餘韻';
  return '情景交融，語意在凝鍊中保留想像空間';
};

export function analyzePoem(poem: Poem): PoetryAnalysis {
  const images = poem.imagery.slice(0, 6);
  const themeText = poem.themes.join('、');
  const imageText = images.slice(0, 3).join('、');
  const summary = `作品以${imageText || '景物'}為核心，將${themeText || '生命感受'}收束在${poem.form}的節奏中。`;
  const craft = [
    poem.content.length <= 2 ? '以極短篇幅完成由景入情的轉折' : '透過層層景物推進擴大時間與空間',
    poem.imagery.length >= 4 ? '多個意象彼此映照，形成連續畫面' : '集中意象反覆回聲，使情感更凝聚',
    /月|雨|風|雪|花|江|山/.test(poem.imagery.join('')) ? '自然景物不是背景，而是情緒與記憶的載體' : '語言節制，關鍵詞承擔主要情緒重量'
  ];

  return {
    summary,
    mood: moodFor(poem),
    images,
    craft,
    themes: [...poem.themes]
  };
}

