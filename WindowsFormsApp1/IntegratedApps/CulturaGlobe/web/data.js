// World-cultures dataset. ALL countries come from countries.generated.js (restcountries
// snapshot). LANG_GREET maps a language -> spoken greeting, REGION_MUSIC gives every
// country a region-appropriate procedural-audio profile, and DETAIL overlays richer
// hand-curated culture items (+ Traditional-Chinese names) for prominent countries.
import { COUNTRY_TABLE } from './countries.generated.js';
import { EXTRA_DETAIL } from './countries.detail.js';

export const CATEGORIES = [
  { id: 'language', zh: '語言問候', en: 'Language', glyph: '語', color: '#46e0ff' },
  { id: 'music', zh: '音樂', en: 'Music', glyph: '♪', color: '#ff6ad5' },
  { id: 'festival', zh: '節慶', en: 'Festival', glyph: '✦', color: '#ffc15e' },
  { id: 'landmark', zh: '地標', en: 'Landmark', glyph: '⌂', color: '#8d7bff' },
  { id: 'cuisine', zh: '美食', en: 'Cuisine', glyph: '❖', color: '#46e7a4' },
  { id: 'craft', zh: '工藝', en: 'Craft', glyph: '✺', color: '#ff8a5b' },
  { id: 'myth', zh: '神話信仰', en: 'Myth & Belief', glyph: '☯', color: '#b06bff' }
];

export const REGIONS = {
  asia: { zh: '亞洲', en: 'Asia' },
  mideast: { zh: '中東/北非', en: 'Middle East & N. Africa' },
  europe: { zh: '歐洲', en: 'Europe' },
  africa: { zh: '非洲', en: 'Africa' },
  americas: { zh: '美洲', en: 'Americas' },
  oceania: { zh: '大洋洲', en: 'Oceania' }
};

// spoken greeting keyed by the restcountries language name. zh fields are Traditional.
const G = (text, roman, lang) => ({ text, roman, lang });
const LANG_GREET = {
  Mandarin: G('你好', 'Nǐ hǎo', 'zh-CN'), Chinese: G('你好', 'Nǐ hǎo', 'zh-CN'),
  Japanese: G('こんにちは', 'Konnichiwa', 'ja-JP'), Korean: G('안녕하세요', 'Annyeonghaseyo', 'ko-KR'),
  English: G('Hello', 'Hello', 'en'), Spanish: G('Hola', 'Hola', 'es'),
  Portuguese: G('Olá', 'Olá', 'pt'), French: G('Bonjour', 'Bonjour', 'fr'),
  German: G('Hallo', 'Hallo', 'de'), Italian: G('Ciao', 'Ciao', 'it'),
  Russian: G('Здравствуйте', 'Zdravstvuyte', 'ru'), Arabic: G('السلام عليكم', 'As-salāmu ʿalaykum', 'ar'),
  Hindi: G('नमस्ते', 'Namaste', 'hi'), Bengali: G('নমস্কার', 'Nomoshkar', 'bn'),
  Urdu: G('السلام علیکم', 'Assalāmu ʿalaikum', 'ur'), Thai: G('สวัสดี', 'Sawasdee', 'th'),
  Vietnamese: G('Xin chào', 'Xin chào', 'vi'), Indonesian: G('Halo', 'Halo', 'id'),
  Malay: G('Hai', 'Hai', 'ms'), Turkish: G('Merhaba', 'Merhaba', 'tr'),
  Persian: G('سلام', 'Salâm', 'fa'), Dari: G('سلام', 'Salâm', 'fa'), Pashto: G('سلام', 'Salām', 'ps'),
  Hebrew: G('שלום', 'Shalom', 'he'), Greek: G('Γειά σου', 'Yiá sou', 'el'),
  Dutch: G('Hallo', 'Hallo', 'nl'), Swedish: G('Hej', 'Hej', 'sv'), Norwegian: G('Hei', 'Hei', 'nb'),
  Danish: G('Hej', 'Hej', 'da'), Finnish: G('Hei', 'Hei', 'fi'), Icelandic: G('Halló', 'Halló', 'is'),
  Polish: G('Cześć', 'Cześć', 'pl'), Czech: G('Ahoj', 'Ahoj', 'cs'), Slovak: G('Ahoj', 'Ahoj', 'sk'),
  Hungarian: G('Szia', 'Szia', 'hu'), Romanian: G('Salut', 'Salut', 'ro'),
  Ukrainian: G('Привіт', 'Pryvit', 'uk'), Bulgarian: G('Здравей', 'Zdravey', 'bg'),
  Croatian: G('Bok', 'Bok', 'hr'), Serbian: G('Здраво', 'Zdravo', 'sr'),
  Albanian: G('Përshëndetje', 'Përshëndetje', 'sq'), Catalan: G('Hola', 'Hola', 'ca'),
  Swahili: G('Jambo', 'Jambo', 'sw'), Amharic: G('ሰላም', 'Selam', 'am'), Zulu: G('Sawubona', 'Sawubona', 'zu'),
  Yoruba: G('Ẹ n lẹ', 'E nle', 'en'), Hausa: G('Sannu', 'Sannu', 'ha'), Somali: G('Salaan', 'Salaan', 'so'),
  Khmer: G('សួស្តី', 'Suostei', 'km'), Lao: G('ສະບາຍດີ', 'Sabaidee', 'lo'), Burmese: G('မင်္ဂလာပါ', 'Mingalaba', 'my'),
  Nepali: G('नमस्ते', 'Namaste', 'ne'), Sinhala: G('ආයුබෝවන්', 'Ayubowan', 'si'), Tamil: G('வணக்கம்', 'Vanakkam', 'ta'),
  Mongolian: G('Сайн байна уу', 'Sain baina uu', 'mn'), Filipino: G('Kumusta', 'Kumusta', 'fil'),
  Tagalog: G('Kumusta', 'Kumusta', 'fil'), Kazakh: G('Сәлем', 'Sälem', 'kk'), Uzbek: G('Salom', 'Salom', 'uz'),
  Maori: G('Kia ora', 'Kia ora', 'mi'), Samoan: G('Talofa', 'Talofa', 'sm'), Fijian: G('Bula', 'Bula', 'en'),
  // extra languages so the native greeting is the country's own language, not an English fallback
  Afrikaans: G('Hallo', 'Hallo', 'af'), Armenian: G('Բարև', 'Barev', 'hy'), Azerbaijani: G('Salam', 'Salam', 'az'),
  Bosnian: G('Zdravo', 'Zdravo', 'bs'), Georgian: G('გამარჯობა', 'Gamarjoba', 'ka'), Estonian: G('Tere', 'Tere', 'et'),
  Latvian: G('Sveiki', 'Sveiki', 'lv'), Lithuanian: G('Labas', 'Labas', 'lt'), Macedonian: G('Здраво', 'Zdravo', 'mk'),
  Montenegrin: G('Zdravo', 'Zdravo', 'sr'), Slovene: G('Živjo', 'Zivjo', 'sl'), Belarusian: G('Прывітанне', 'Pryvitannie', 'be'),
  Maldivian: G('އައްސަލާމް ޢަލައިކުމް', 'Assalaamu alaikum', 'dv'), Dzongkha: G('ཀུ་ཟུ་ཟང་པོ་ལ', 'Kuzuzangpo', 'dz'),
  Bislama: G('Halo', 'Halo', 'bi'), Kyrgyz: G('Салам', 'Salam', 'ky'), Guaraní: G('Mba’éichapa', 'Mbaeichapa', 'gn'),
  Aymara: G('Kamisaraki', 'Kamisaraki', 'ay'), Chibarwe: G('Mhoro', 'Mhoro', 'sn'),
  Tajik: G('Салом', 'Salom', 'tg'), Turkmen: G('Salam', 'Salam', 'tk'),
  'Seychellois Creole': G('Bonzour', 'Bonzour', 'fr'), 'Belizean Creole': G('Hello', 'Hello', 'en')
};

// a few restcountries language labels are a co-official / minority tongue; greet in the
// country's dominant everyday language instead so it reads as the real local language.
const GREET_OVERRIDE = {
  ar: 'Spanish', pe: 'Spanish', bo: 'Spanish',   // listed Guaraní/Aymara, but Spanish-dominant
  il: 'Hebrew',                                  // listed Arabic
  in: 'Hindi', pk: 'Urdu', ph: 'Filipino',       // listed English
  uz: 'Uzbek', tj: 'Tajik', tm: 'Turkmen'        // listed Russian
};

// resolve the greeting for a (sometimes messy) restcountries language label:
// exact, then without the "(...)" suffix, then by the first word.
function greetingFor(lang) {
  if (!lang) return LANG_GREET.English;
  if (LANG_GREET[lang]) return LANG_GREET[lang];
  const base = lang.replace(/\s*\(.*\)\s*/g, '').trim();   // "Persian (Farsi)" -> "Persian"
  if (LANG_GREET[base]) return LANG_GREET[base];
  const first = base.split(/[ /]/)[0];                     // "Norwegian Nynorsk" -> "Norwegian"
  return LANG_GREET[first] || LANG_GREET.English;
}

// per-region procedural-audio base profile (root varies per country, see build below)
const REGION_MUSIC = {
  asia: { scale: 'penta_cn', timbre: 'pluck', root: 262, tempo: 96 },
  mideast: { scale: 'hijaz', timbre: 'reed', root: 233, tempo: 100 },
  europe: { scale: 'major', timbre: 'reed', root: 262, tempo: 108 },
  africa: { scale: 'penta_africa', timbre: 'perc', root: 247, tempo: 116 },
  americas: { scale: 'major', timbre: 'pluck', root: 247, tempo: 112 },
  oceania: { scale: 'penta_cn', timbre: 'flute', root: 220, tempo: 88 }
};

const I = (cat, zh, en, dZh, dEn) => ({ cat, zh, en, dZh, dEn });

// Hand-curated detail (Traditional-Chinese names + culture items + music override).
const DETAIL = {
  tw: { zh: '台灣', music: { scale: 'penta_cn', root: 262, timbre: 'pluck', tempo: 104 }, items: [
    I('craft', '客家藍衫與花布', 'Hakka Blue Shirt', '客家藍衫樸實耐穿，桐花布是族群意象。', 'Hakka indigo workwear and tung-blossom cloth.'),
    I('festival', '客家義民祭', 'Hakka Yimin Festival', '祭祀義民、神豬的客庄盛事。', 'Honoring martyrs with sacred-pig offerings.'),
    I('cuisine', '夜市小吃與擂茶', 'Night Market & Lei-cha', '夜市小吃與客家擂茶兼容並蓄。', 'Night-market bites and Hakka ground-tea.'),
    I('myth', '媽祖遶境', 'Mazu Pilgrimage', '橫跨數縣市的海神媽祖遶境。', 'A pilgrimage for the sea goddess Mazu.') ] },
  cn: { zh: '中國', items: [
    I('landmark', '萬里長城', 'Great Wall', '綿延萬里的古代防線。', 'An ancient defensive line.'),
    I('festival', '春節', 'Spring Festival', '農曆新年的團圓鞭炮。', 'Lunar New Year reunions and firecrackers.'),
    I('craft', '書法與青花瓷', 'Calligraphy & Porcelain', '毛筆書法與青花瓷工藝。', 'Brush calligraphy and porcelain.') ] },
  jp: { zh: '日本', music: { scale: 'hirajoshi', root: 294, timbre: 'pluck', tempo: 80 }, items: [
    I('craft', '和紙與茶道', 'Washi & Tea Ceremony', '和紙工藝與侘寂茶道。', 'Washi craft and the wabi-sabi tea ceremony.'),
    I('festival', '櫻花季', 'Cherry Blossom', '春日賞櫻的物哀情懷。', 'Spring blossom-viewing.'),
    I('myth', '神道與鳥居', 'Shinto & Torii', '八百萬神與紅色鳥居。', 'Shinto kami and vermilion torii gates.') ] },
  kr: { zh: '韓國', items: [
    I('craft', '韓服與韓屋', 'Hanbok & Hanok', '優雅韓服與木造韓屋。', 'Elegant hanbok and timber hanok.'),
    I('music', '盤索里', 'Pansori', '說唱盤索里與四物農樂。', 'Pansori epic singing and samul nori.'),
    I('cuisine', '泡菜與發酵', 'Kimchi', '泡菜與醬類發酵智慧。', 'Kimchi and fermentation culture.') ] },
  mn: { zh: '蒙古', music: { scale: 'penta_cn', root: 196, timbre: 'bowed', tempo: 72 }, items: [
    I('music', '呼麥與馬頭琴', 'Throat Singing', '喉音呼麥與馬頭琴。', 'Khoomei throat singing and morin khuur.'),
    I('festival', '那達慕', 'Naadam', '摔角賽馬射箭三藝。', 'Wrestling, racing and archery games.') ] },
  in: { zh: '印度', music: { scale: 'raga', root: 220, timbre: 'pluck', tempo: 100 }, items: [
    I('landmark', '泰姬瑪哈陵', 'Taj Mahal', '愛之白色大理石陵寢。', 'A white-marble mausoleum of love.'),
    I('festival', '排燈節', 'Diwali', '萬燈齊明的光明節。', 'The festival of lights.'),
    I('music', '西塔琴與拉格', 'Sitar & Raga', '西塔琴的拉格旋律。', 'The sitar and raga system.') ] },
  id: { zh: '印尼', music: { scale: 'slendro', root: 233, timbre: 'bell', tempo: 88 }, items: [
    I('music', '甘美朗', 'Gamelan', '銅鑼金屬樂合奏。', 'The bronze gamelan ensemble.'),
    I('craft', '蠟染巴迪克', 'Batik', '蠟染防色布藝。', 'Wax-resist batik textiles.'),
    I('landmark', '婆羅浮屠', 'Borobudur', '世界最大佛教石塔。', "The world's largest Buddhist monument.") ] },
  th: { zh: '泰國', music: { scale: 'penta_cn', root: 311, timbre: 'bell', tempo: 96 }, items: [
    I('festival', '潑水節', 'Songkran', '新年互相潑水祈福。', 'New Year water-splashing.'),
    I('landmark', '金色佛寺', 'Golden Temples', '金碧輝煌的佛寺佛塔。', 'Gilded Buddhist temples.') ] },
  vn: { zh: '越南', items: [
    I('cuisine', '河粉', 'Phở', '清香牛骨高湯河粉。', 'Aromatic beef-broth noodle soup.'),
    I('craft', '水上木偶', 'Water Puppetry', '水面演出的木偶戲。', 'Puppetry performed on water.') ] },
  tr: { zh: '土耳其', music: { scale: 'hijaz', root: 247, timbre: 'pluck', tempo: 104 }, items: [
    I('landmark', '聖索菲亞', 'Hagia Sophia', '拜占庭與鄂圖曼的圓頂。', 'A Byzantine-Ottoman dome.'),
    I('myth', '旋轉苦修', 'Whirling Dervishes', '蘇菲旋轉冥想儀式。', 'The Sufi whirling ritual.'),
    I('craft', '土耳其地毯', 'Turkish Carpets', '手織圖紋地毯。', 'Hand-knotted carpets.') ] },
  ir: { zh: '伊朗', music: { scale: 'hijaz', root: 220, timbre: 'pluck', tempo: 92 }, items: [
    I('festival', '諾魯茲', 'Nowruz', '春分波斯新年。', 'The Persian New Year.'),
    I('craft', '波斯細密畫', 'Persian Miniature', '精緻細密畫與書法。', 'Persian miniature painting.') ] },
  sa: { zh: '沙烏地阿拉伯', music: { scale: 'hijaz', root: 196, timbre: 'reed', tempo: 88 }, items: [
    I('festival', '朝覲', 'Hajj', '前往麥加的朝聖。', 'The pilgrimage to Mecca.'),
    I('music', '阿爾達劍舞', 'Ardah', '鼓聲與詩歌的劍舞。', 'A sword dance of drums and poetry.') ] },
  il: { zh: '以色列', music: { scale: 'hijaz', root: 233, timbre: 'reed', tempo: 110 }, items: [
    I('landmark', '耶路撒冷舊城', 'Old City of Jerusalem', '三大宗教聖城。', 'Holy city of three faiths.'),
    I('music', '克萊茲梅爾', 'Klezmer', '猶太歡慶樂。', 'Festive Jewish klezmer.') ] },
  gb: { zh: '英國', music: { scale: 'dorian', root: 294, timbre: 'reed', tempo: 108 }, items: [
    I('landmark', '巨石陣', 'Stonehenge', '史前巨石環陣。', 'A prehistoric stone circle.'),
    I('festival', '愛丁堡藝穗節', 'Edinburgh Fringe', '世界最大表演藝術節。', "The world's largest arts festival."),
    I('music', '蘇格蘭風笛', 'Bagpipes', '高地風笛樂聲。', 'Highland bagpipes.'),
    I('myth', '亞瑟王傳說', 'Arthurian Legend', '亞瑟王與圓桌武士。', 'King Arthur and the Round Table.'),
    I('cuisine', '下午茶', 'Afternoon Tea', '紅茶司康三明治。', 'Tea, scones and sandwiches.') ] },
  ie: { zh: '愛爾蘭', music: { scale: 'dorian', root: 330, timbre: 'reed', tempo: 120 }, items: [
    I('music', '愛爾蘭笛與踢踏', 'Tin Whistle & Step', '輕快民謠與踢踏舞。', 'Lively folk and step dancing.'),
    I('festival', '聖派翠克節', "St Patrick's Day", '綠意守護聖人節。', 'The green patron-saint day.') ] },
  fr: { zh: '法國', items: [
    I('landmark', '艾菲爾鐵塔', 'Eiffel Tower', '巴黎鋼鐵地標。', "Paris's iron landmark."),
    I('cuisine', '法式料理', 'French Cuisine', '麵包起司紅酒藝術。', 'Bread, cheese and wine.'),
    I('music', '手風琴香頌', 'Chanson', '街頭手風琴香頌。', 'Street-accordion chanson.') ] },
  it: { zh: '義大利', music: { scale: 'major', root: 247, timbre: 'pluck', tempo: 112 }, items: [
    I('landmark', '羅馬競技場', 'Colosseum', '古羅馬圓形競技場。', 'The Roman amphitheatre.'),
    I('cuisine', '披薩與義大利麵', 'Pizza & Pasta', '披薩義大利麵故鄉。', 'Home of pizza and pasta.'),
    I('craft', '歌劇與文藝復興', 'Opera & Renaissance', '歌劇與文藝復興藝術。', 'Opera and Renaissance art.') ] },
  es: { zh: '西班牙', music: { scale: 'phrygian', root: 233, timbre: 'pluck', tempo: 120 }, items: [
    I('music', '佛朗明哥', 'Flamenco', '吉他踢踏拍掌。', 'Guitar, stamping and palmas.'),
    I('festival', '番茄節', 'La Tomatina', '萬人番茄大戰。', 'The tomato-throwing festival.') ] },
  gr: { zh: '希臘', music: { scale: 'hijaz', root: 262, timbre: 'pluck', tempo: 104 }, items: [
    I('landmark', '雅典衛城', 'Acropolis', '帕德嫩神廟遺跡。', 'The Parthenon ruins.'),
    I('myth', '希臘神話', 'Greek Mythology', '奧林帕斯諸神。', 'Myths of the Olympian gods.') ] },
  de: { zh: '德國', items: [
    I('festival', '慕尼黑啤酒節', 'Oktoberfest', '世界最大啤酒節。', "The world's largest beer festival."),
    I('music', '古典樂巨匠', 'Classical Masters', '巴哈貝多芬傳統。', 'Bach and Beethoven.') ] },
  ru: { zh: '俄羅斯', music: { scale: 'minor', root: 220, timbre: 'pluck', tempo: 96 }, items: [
    I('landmark', '聖瓦西里大教堂', "St Basil's", '紅場洋蔥圓頂教堂。', 'Onion-domed cathedral on Red Square.'),
    I('craft', '俄羅斯娃娃', 'Matryoshka', '層層相套木娃娃。', 'Nested wooden dolls.') ] },
  se: { zh: '瑞典', music: { scale: 'minor', root: 294, timbre: 'bowed', tempo: 100 }, items: [
    I('festival', '仲夏節', 'Midsummer', '夏至花柱民謠舞。', 'Maypole dancing at solstice.'),
    I('craft', '北歐設計', 'Nordic Design', '簡約實用設計。', 'Minimal Nordic design.') ] },
  eg: { zh: '埃及', music: { scale: 'hijaz', root: 220, timbre: 'reed', tempo: 100 }, items: [
    I('landmark', '吉薩金字塔', 'Pyramids of Giza', '法老陵墓。', 'Pharaonic tombs.'),
    I('myth', '古埃及諸神', 'Egyptian Gods', '太陽神拉與歐西里斯。', 'Ra and Osiris.') ] },
  ma: { zh: '摩洛哥', music: { scale: 'hijaz', root: 247, timbre: 'pluck', tempo: 104 }, items: [
    I('landmark', '麥地那市集', 'Medina Souks', '迷宮般傳統市集。', 'Labyrinthine markets.'),
    I('craft', '皮革染坊', 'Tanneries', '古法皮革染製。', 'Age-old leather dyeing.') ] },
  ng: { zh: '奈及利亞', items: [
    I('music', '會說話的鼓', 'Talking Drum', '模仿語調的鼓。', 'Drums that mimic speech.'),
    I('craft', '阿迪雷染布', 'Adire', '靛藍紮染布藝。', 'Indigo resist-dyed cloth.') ] },
  ke: { zh: '肯亞', items: [
    I('craft', '馬賽串珠', 'Maasai Beadwork', '鮮明馬賽串珠。', 'Vivid Maasai beadwork.'),
    I('festival', '馬賽跳躍舞', 'Adumu', '馬賽戰士跳躍舞。', 'Maasai jumping dance.') ] },
  et: { zh: '衣索比亞', music: { scale: 'penta_africa', root: 233, timbre: 'pluck', tempo: 96 }, items: [
    I('cuisine', '咖啡儀式', 'Coffee Ceremony', '咖啡發源地的烘豆儀式。', 'The coffee ceremony.'),
    I('myth', '巖鑿教堂', 'Rock Churches', '拉利貝拉岩鑿教堂。', 'Lalibela rock churches.') ] },
  za: { zh: '南非', items: [
    I('music', '阿卡貝拉合唱', 'Isicathamiya', '祖魯無伴奏合唱。', 'Zulu a-cappella singing.'),
    I('festival', '彩虹之國', 'Rainbow Nation', '多元族群國度。', 'A multi-ethnic nation.') ] },
  us: { zh: '美國', music: { scale: 'blues', root: 220, timbre: 'pluck', tempo: 112 }, items: [
    I('music', '爵士與藍調', 'Jazz & Blues', '非裔美國人的爵士藍調。', 'African-American jazz and blues.'),
    I('landmark', '自由女神像', 'Statue of Liberty', '移民之國自由象徵。', 'A symbol of liberty.'),
    I('festival', '感恩節', 'Thanksgiving', '家庭團聚感恩節。', 'A family feast of gratitude.') ] },
  mx: { zh: '墨西哥', items: [
    I('festival', '亡靈節', 'Day of the Dead', '繽紛骷髏祭祖。', 'The skull-decked festival of the dead.'),
    I('music', '街頭樂隊', 'Mariachi', '熱情街頭樂隊。', 'Exuberant mariachi.'),
    I('landmark', '馬雅金字塔', 'Maya Pyramids', '奇琴伊察金字塔。', 'Maya pyramids of Chichén Itzá.') ] },
  br: { zh: '巴西', music: { scale: 'major', root: 233, timbre: 'perc', tempo: 124 }, items: [
    I('festival', '里約嘉年華', 'Rio Carnival', '森巴花車嘉年華。', 'Samba float parades.'),
    I('music', '森巴與巴薩諾瓦', 'Samba & Bossa', '森巴節奏與巴薩諾瓦。', 'Samba and bossa nova.') ] },
  pe: { zh: '秘魯', music: { scale: 'andean', root: 294, timbre: 'flute', tempo: 100 }, items: [
    I('landmark', '馬丘比丘', 'Machu Picchu', '雲端印加古城。', 'The Inca citadel in the clouds.'),
    I('music', '安地斯排笛', 'Andean Panpipes', '排笛與恰朗戈。', 'Panpipes and charango.') ] },
  ar: { zh: '阿根廷', music: { scale: 'minor', root: 247, timbre: 'reed', tempo: 96 }, items: [
    I('music', '探戈', 'Tango', '深情探戈與班多鈕琴。', 'Passionate tango and bandoneón.') ] },
  cu: { zh: '古巴', music: { scale: 'major', root: 277, timbre: 'perc', tempo: 120 }, items: [
    I('music', '頌樂與騷莎', 'Son & Salsa', '熱帶頌樂與騷莎。', 'Tropical son and salsa.') ] },
  jm: { zh: '牙買加', music: { scale: 'blues', root: 196, timbre: 'pluck', tempo: 92 }, items: [
    I('music', '雷鬼樂', 'Reggae', '放鬆律動雷鬼。', 'The laid-back groove of reggae.') ] },
  ca: { zh: '加拿大', music: { scale: 'dorian', root: 262, timbre: 'bowed', tempo: 108 }, items: [
    I('craft', '原住民圖騰柱', 'Totem Poles', '西岸原住民圖騰柱。', 'First Nations totem poles.'),
    I('festival', '楓糖季', 'Maple Season', '春日採楓糖。', 'Spring maple tapping.') ] },
  au: { zh: '澳洲', music: { scale: 'penta_africa', root: 130, timbre: 'reed', tempo: 80 }, items: [
    I('music', '迪吉里杜管', 'Didgeridoo', '原住民迪吉里杜低鳴。', 'The Aboriginal didgeridoo drone.'),
    I('myth', '夢創時光', 'Dreamtime', '原住民夢創神話。', 'Aboriginal Dreamtime.'),
    I('landmark', '烏魯魯巨岩', 'Uluru', '紅色聖地巨岩。', 'The sacred red monolith.') ] },
  nz: { zh: '紐西蘭', music: { scale: 'penta_cn', root: 220, timbre: 'flute', tempo: 88 }, items: [
    I('music', '哈卡戰舞', 'Haka', '毛利哈卡戰舞。', 'The Māori haka.'),
    I('craft', '毛利雕刻', 'Māori Carving', '螺旋紋木雕。', 'Spiral Māori carving.') ] }
};

// deterministic small pitch variation per country so neighbours don't sound identical
function hashNum(s) { let h = 0; for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }

export const COUNTRIES = COUNTRY_TABLE.map((c) => {
  const d = DETAIL[c.id] || EXTRA_DETAIL[c.id] || {};   // curated DETAIL wins, else the bulk pack
  const base = REGION_MUSIC[c.region] || REGION_MUSIC.asia;
  const variation = Math.pow(2, ((hashNum(c.id) % 5) - 2) / 12); // +-2 semitones
  const music = d.music || { scale: base.scale, timbre: base.timbre, root: Math.round(base.root * variation), tempo: base.tempo };
  const greeting = greetingFor(GREET_OVERRIDE[c.id] || c.lang);
  return {
    id: c.id,
    zh: d.zh || c.zh,
    en: c.en,
    lat: c.lat, lon: c.lon, region: c.region,
    music,
    greeting,
    items: d.items || []
  };
});
