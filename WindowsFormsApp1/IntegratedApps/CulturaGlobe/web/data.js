// World-cultures dataset for the Cultura globe.
// Each country has a regional music profile (scale + timbre + root freq + tempo)
// that drives the procedural audio, a spoken greeting (for TTS), and several
// cultural markers across categories. Descriptions are zh-TW + en; other locales
// fall back to en for the data body (UI chrome is fully translated in i18n.js).

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
  mideast: { zh: '中東', en: 'Middle East' },
  europe: { zh: '歐洲', en: 'Europe' },
  africa: { zh: '非洲', en: 'Africa' },
  americas: { zh: '美洲', en: 'Americas' },
  oceania: { zh: '大洋洲', en: 'Oceania' }
};

const C = (cat, zh, en, dZh, dEn) => ({ cat, zh, en, dZh, dEn });

export const COUNTRIES = [
  // ---------------- East Asia ----------------
  {
    id: 'tw', zh: '台灣', en: 'Taiwan', region: 'asia', lat: 23.7, lon: 121.0,
    music: { scale: 'penta_cn', root: 262, timbre: 'pluck', tempo: 104 },
    greeting: { text: '你好', roman: 'Nǐ hǎo', lang: 'zh-TW' },
    items: [
      C('craft', '客家藍衫與花布', 'Hakka Blue Shirt & Floral Cloth', '客家藍衫樸實耐穿，桐花布是族群意象。', 'Hakka indigo workwear and tung-blossom floral cloth, emblems of the community.'),
      C('festival', '客家義民祭', 'Hakka Yimin Festival', '祭祀義民、神豬與挑擔的客庄盛事。', 'Honoring righteous martyrs with sacred-pig offerings in Hakka townships.'),
      C('cuisine', '小吃與客家擂茶', 'Street Food & Hakka Lei-cha', '夜市小吃與客家擂茶兼容並蓄。', 'Night-market bites alongside Hakka ground-tea (lei-cha).'),
      C('myth', '媽祖遶境', 'Mazu Pilgrimage', '橫跨數縣市的海神媽祖遶境信仰。', 'A days-long pilgrimage for the sea goddess Mazu.')
    ]
  },
  {
    id: 'cn', zh: '中國', en: 'China', region: 'asia', lat: 35.0, lon: 105.0,
    music: { scale: 'penta_cn', root: 247, timbre: 'pluck', tempo: 96 },
    greeting: { text: '你好', roman: 'Nǐ hǎo', lang: 'zh-CN' },
    items: [
      C('landmark', '萬里長城', 'Great Wall', '綿延萬里的古代軍事防線。', 'An ancient defensive line stretching thousands of li.'),
      C('festival', '春節', 'Spring Festival', '農曆新年的團圓與紅包鞭炮。', 'Lunar New Year reunions, red envelopes and firecrackers.'),
      C('craft', '書法與青花瓷', 'Calligraphy & Porcelain', '毛筆書法與青花瓷的千年工藝。', 'Millennia of brush calligraphy and blue-and-white porcelain.')
    ]
  },
  {
    id: 'jp', zh: '日本', en: 'Japan', region: 'asia', lat: 36.2, lon: 138.3,
    music: { scale: 'hirajoshi', root: 294, timbre: 'pluck', tempo: 80 },
    greeting: { text: 'こんにちは', roman: 'Konnichiwa', lang: 'ja-JP' },
    items: [
      C('craft', '和紙與茶道', 'Washi & Tea Ceremony', '和紙工藝與侘寂美學的茶道。', 'Washi paper craft and the wabi-sabi tea ceremony.'),
      C('festival', '櫻花季', 'Cherry Blossom (Hanami)', '春日賞櫻的物哀情懷。', 'Spring blossom-viewing and the aesthetic of transience.'),
      C('myth', '神道與鳥居', 'Shinto & Torii', '八百萬神與紅色鳥居的信仰。', 'Shinto, its myriad kami, and vermilion torii gates.')
    ]
  },
  {
    id: 'kr', zh: '韓國', en: 'South Korea', region: 'asia', lat: 36.5, lon: 127.8,
    music: { scale: 'penta_cn', root: 277, timbre: 'pluck', tempo: 92 },
    greeting: { text: '안녕하세요', roman: 'Annyeonghaseyo', lang: 'ko-KR' },
    items: [
      C('craft', '韓服與韓屋', 'Hanbok & Hanok', '線條優雅的韓服與木造韓屋。', 'Elegant hanbok dress and timber hanok houses.'),
      C('music', '盤索里與四物', 'Pansori & Samul Nori', '說唱盤索里與四物農樂打擊。', 'Pansori epic singing and samul nori percussion.'),
      C('cuisine', '泡菜與發酵', 'Kimchi & Fermentation', '泡菜與醬類的發酵飲食智慧。', 'Kimchi and a deep culture of fermentation.')
    ]
  },
  {
    id: 'mn', zh: '蒙古', en: 'Mongolia', region: 'asia', lat: 46.9, lon: 103.8,
    music: { scale: 'penta_cn', root: 196, timbre: 'bowed', tempo: 72 },
    greeting: { text: 'Сайн байна уу', roman: 'Sain baina uu', lang: 'mn-MN' },
    items: [
      C('music', '呼麥與馬頭琴', 'Throat Singing & Morin Khuur', '喉音呼麥與馬頭琴的草原之聲。', 'Khoomei throat singing and the horse-head fiddle.'),
      C('festival', '那達慕', 'Naadam', '摔角、賽馬與射箭的男兒三藝。', 'The three manly games: wrestling, horse racing, archery.')
    ]
  },
  // ---------------- South / SE Asia ----------------
  {
    id: 'in', zh: '印度', en: 'India', region: 'asia', lat: 22.0, lon: 79.0,
    music: { scale: 'raga', root: 220, timbre: 'pluck', tempo: 100 },
    greeting: { text: 'नमस्ते', roman: 'Namaste', lang: 'hi-IN' },
    items: [
      C('landmark', '泰姬瑪哈陵', 'Taj Mahal', '愛之白色大理石陵寢。', 'A white-marble mausoleum built for love.'),
      C('festival', '排燈節', 'Diwali', '萬燈齊明的光明節。', 'The festival of lights.'),
      C('music', '西塔琴與拉格', 'Sitar & Raga', '西塔琴演奏的拉格旋律體系。', 'The sitar and the melodic raga system.')
    ]
  },
  {
    id: 'id', zh: '印尼', en: 'Indonesia', region: 'asia', lat: -2.5, lon: 118.0,
    music: { scale: 'slendro', root: 233, timbre: 'bell', tempo: 88 },
    greeting: { text: 'Halo', roman: 'Halo', lang: 'id-ID' },
    items: [
      C('music', '甘美朗', 'Gamelan', '銅鑼金屬樂的甘美朗合奏。', 'The bronze metallophone gamelan ensemble.'),
      C('craft', '蠟染巴迪克', 'Batik', '蠟染防色的巴迪克布藝。', 'Wax-resist batik textile art.'),
      C('landmark', '婆羅浮屠', 'Borobudur', '世界最大的佛教石塔。', "The world's largest Buddhist monument.")
    ]
  },
  {
    id: 'th', zh: '泰國', en: 'Thailand', region: 'asia', lat: 15.0, lon: 101.0,
    music: { scale: 'penta_cn', root: 311, timbre: 'bell', tempo: 96 },
    greeting: { text: 'สวัสดี', roman: 'Sawasdee', lang: 'th-TH' },
    items: [
      C('festival', '潑水節', 'Songkran', '新年互相潑水祈福。', 'Lunar New Year water-splashing for blessings.'),
      C('landmark', '金色佛寺', 'Golden Temples', '金碧輝煌的佛寺與佛塔。', 'Gilded Buddhist temples and stupas.')
    ]
  },
  {
    id: 'vn', zh: '越南', en: 'Vietnam', region: 'asia', lat: 16.0, lon: 107.8,
    music: { scale: 'penta_cn', root: 262, timbre: 'pluck', tempo: 100 },
    greeting: { text: 'Xin chào', roman: 'Xin chào', lang: 'vi-VN' },
    items: [
      C('cuisine', '河粉', 'Phở', '清香牛骨高湯的河粉。', 'Aromatic beef-broth rice-noodle soup.'),
      C('craft', '水上木偶', 'Water Puppetry', '在水面演出的傳統木偶戲。', 'Traditional puppetry performed on water.')
    ]
  },
  // ---------------- Middle East ----------------
  {
    id: 'tr', zh: '土耳其', en: 'Turkey', region: 'mideast', lat: 39.0, lon: 35.0,
    music: { scale: 'hijaz', root: 247, timbre: 'pluck', tempo: 104 },
    greeting: { text: 'Merhaba', roman: 'Merhaba', lang: 'tr-TR' },
    items: [
      C('landmark', '聖索菲亞', 'Hagia Sophia', '跨越拜占庭與鄂圖曼的圓頂。', 'A dome bridging Byzantine and Ottoman eras.'),
      C('myth', '旋轉苦修', 'Whirling Dervishes', '蘇菲旋轉舞的冥想儀式。', 'The Sufi whirling meditation ritual.'),
      C('craft', '土耳其地毯', 'Turkish Carpets', '手織圖紋的土耳其地毯。', 'Hand-knotted patterned carpets.')
    ]
  },
  {
    id: 'ir', zh: '伊朗', en: 'Iran', region: 'mideast', lat: 32.0, lon: 53.0,
    music: { scale: 'hijaz', root: 220, timbre: 'pluck', tempo: 92 },
    greeting: { text: 'سلام', roman: 'Salâm', lang: 'fa-IR' },
    items: [
      C('festival', '諾魯茲', 'Nowruz', '春分波斯新年。', 'The Persian New Year at the spring equinox.'),
      C('craft', '波斯細密畫', 'Persian Miniature', '精緻的波斯細密畫與書法。', 'Exquisite Persian miniature painting and calligraphy.')
    ]
  },
  {
    id: 'sa', zh: '沙烏地阿拉伯', en: 'Saudi Arabia', region: 'mideast', lat: 24.0, lon: 45.0,
    music: { scale: 'hijaz', root: 196, timbre: 'reed', tempo: 88 },
    greeting: { text: 'السلام عليكم', roman: 'As-salāmu ʿalaykum', lang: 'ar-SA' },
    items: [
      C('festival', '朝覲', 'Hajj', '前往麥加的朝聖。', 'The pilgrimage to Mecca.'),
      C('music', '阿爾達劍舞', 'Ardah Sword Dance', '鼓聲與詩歌的劍舞。', 'A sword dance of drums and poetry.')
    ]
  },
  {
    id: 'il', zh: '以色列', en: 'Israel', region: 'mideast', lat: 31.5, lon: 34.9,
    music: { scale: 'hijaz', root: 233, timbre: 'reed', tempo: 110 },
    greeting: { text: 'שלום', roman: 'Shalom', lang: 'he-IL' },
    items: [
      C('landmark', '耶路撒冷舊城', 'Old City of Jerusalem', '三大宗教的聖城。', 'Holy city of three major faiths.'),
      C('music', '克萊茲梅爾', 'Klezmer', '猶太歡慶的克萊茲梅爾樂。', 'Festive Jewish klezmer music.')
    ]
  },
  // ---------------- Europe ----------------
  {
    id: 'gb', zh: '英國', en: 'United Kingdom', region: 'europe', lat: 54.0, lon: -2.5,
    music: { scale: 'dorian', root: 294, timbre: 'reed', tempo: 108 },
    greeting: { text: 'Hello', roman: 'Hello', lang: 'en-GB' },
    items: [
      C('landmark', '巨石陣', 'Stonehenge', '史前的巨石環陣。', 'A prehistoric ring of standing stones.'),
      C('festival', '愛丁堡藝穗節', 'Edinburgh Fringe', '世界最大的表演藝術節。', "The world's largest performing-arts festival."),
      C('music', '蘇格蘭風笛', 'Scottish Bagpipes', '高地風笛的嘹亮樂聲。', 'The stirring sound of Highland pipes.'),
      C('myth', '亞瑟王傳說', 'Arthurian Legend', '亞瑟王與圓桌武士。', 'King Arthur and the Knights of the Round Table.'),
      C('cuisine', '下午茶', 'Afternoon Tea', '紅茶、司康與三明治的傳統。', 'Tea, scones and sandwiches tradition.')
    ]
  },
  {
    id: 'ie', zh: '愛爾蘭', en: 'Ireland', region: 'europe', lat: 53.4, lon: -8.0,
    music: { scale: 'dorian', root: 330, timbre: 'reed', tempo: 120 },
    greeting: { text: 'Dia duit', roman: 'Dia duit', lang: 'ga-IE' },
    items: [
      C('music', '愛爾蘭笛與踢踏', 'Tin Whistle & Step Dance', '輕快的愛爾蘭民謠與踢踏舞。', 'Lively Irish folk tunes and step dancing.'),
      C('festival', '聖派翠克節', "St Patrick's Day", '綠意盎然的守護聖人節。', 'The green patron-saint festival.')
    ]
  },
  {
    id: 'fr', zh: '法國', en: 'France', region: 'europe', lat: 46.6, lon: 2.4,
    music: { scale: 'major', root: 262, timbre: 'reed', tempo: 100 },
    greeting: { text: 'Bonjour', roman: 'Bonjour', lang: 'fr-FR' },
    items: [
      C('landmark', '艾菲爾鐵塔', 'Eiffel Tower', '巴黎的鋼鐵地標。', "Paris's iron landmark."),
      C('cuisine', '法式料理', 'French Cuisine', '麵包、起司與紅酒的飲食藝術。', 'The art of bread, cheese and wine.'),
      C('music', '手風琴香頌', 'Accordion Chanson', '街頭手風琴的香頌風情。', 'Street-accordion chanson romance.')
    ]
  },
  {
    id: 'it', zh: '義大利', en: 'Italy', region: 'europe', lat: 42.8, lon: 12.5,
    music: { scale: 'major', root: 247, timbre: 'pluck', tempo: 112 },
    greeting: { text: 'Ciao', roman: 'Ciao', lang: 'it-IT' },
    items: [
      C('landmark', '羅馬競技場', 'Colosseum', '古羅馬的圓形競技場。', 'The ancient Roman amphitheatre.'),
      C('cuisine', '披薩與義大利麵', 'Pizza & Pasta', '披薩與義大利麵的故鄉。', 'Home of pizza and pasta.'),
      C('craft', '歌劇與文藝復興', 'Opera & Renaissance', '歌劇與文藝復興藝術。', 'Opera and Renaissance art.')
    ]
  },
  {
    id: 'es', zh: '西班牙', en: 'Spain', region: 'europe', lat: 40.0, lon: -3.7,
    music: { scale: 'phrygian', root: 233, timbre: 'pluck', tempo: 120 },
    greeting: { text: 'Hola', roman: 'Hola', lang: 'es-ES' },
    items: [
      C('music', '佛朗明哥', 'Flamenco', '吉他、踢踏與拍掌的佛朗明哥。', 'Guitar, foot-stamping and palmas of flamenco.'),
      C('festival', '番茄節', 'La Tomatina', '萬人番茄大戰。', 'The mass tomato-throwing festival.')
    ]
  },
  {
    id: 'gr', zh: '希臘', en: 'Greece', region: 'europe', lat: 39.0, lon: 22.0,
    music: { scale: 'hijaz', root: 262, timbre: 'pluck', tempo: 104 },
    greeting: { text: 'Γειά σου', roman: 'Yiá sou', lang: 'el-GR' },
    items: [
      C('landmark', '雅典衛城', 'Acropolis', '帕德嫩神廟的古典遺跡。', 'The Parthenon and classical ruins.'),
      C('myth', '希臘神話', 'Greek Mythology', '奧林帕斯諸神的神話。', 'Myths of the Olympian gods.')
    ]
  },
  {
    id: 'de', zh: '德國', en: 'Germany', region: 'europe', lat: 51.2, lon: 10.4,
    music: { scale: 'major', root: 196, timbre: 'reed', tempo: 116 },
    greeting: { text: 'Hallo', roman: 'Hallo', lang: 'de-DE' },
    items: [
      C('festival', '慕尼黑啤酒節', 'Oktoberfest', '世界最大的啤酒嘉年華。', "The world's largest beer festival."),
      C('music', '古典樂巨匠', 'Classical Masters', '巴哈、貝多芬的古典傳統。', 'The tradition of Bach and Beethoven.')
    ]
  },
  {
    id: 'ru', zh: '俄羅斯', en: 'Russia', region: 'europe', lat: 61.5, lon: 90.0,
    music: { scale: 'minor', root: 220, timbre: 'pluck', tempo: 96 },
    greeting: { text: 'Здравствуйте', roman: 'Zdravstvuyte', lang: 'ru-RU' },
    items: [
      C('landmark', '聖瓦西里大教堂', "St Basil's Cathedral", '紅場上的洋蔥圓頂教堂。', 'The onion-domed cathedral on Red Square.'),
      C('craft', '俄羅斯娃娃', 'Matryoshka', '層層相套的木製娃娃。', 'Nested wooden dolls.')
    ]
  },
  {
    id: 'se', zh: '瑞典', en: 'Sweden', region: 'europe', lat: 62.0, lon: 15.0,
    music: { scale: 'minor', root: 294, timbre: 'bowed', tempo: 100 },
    greeting: { text: 'Hej', roman: 'Hej', lang: 'sv-SE' },
    items: [
      C('festival', '仲夏節', 'Midsummer', '夏至豎花柱與民謠舞蹈。', 'Maypole dancing at the summer solstice.'),
      C('craft', '北歐設計', 'Nordic Design', '簡約實用的北歐設計。', 'Minimal, functional Nordic design.')
    ]
  },
  // ---------------- Africa ----------------
  {
    id: 'eg', zh: '埃及', en: 'Egypt', region: 'africa', lat: 26.8, lon: 30.8,
    music: { scale: 'hijaz', root: 220, timbre: 'reed', tempo: 100 },
    greeting: { text: 'السلام عليكم', roman: 'As-salāmu ʿalaykum', lang: 'ar-EG' },
    items: [
      C('landmark', '吉薩金字塔', 'Pyramids of Giza', '古埃及的法老陵墓。', 'Pharaonic tombs of ancient Egypt.'),
      C('myth', '古埃及諸神', 'Egyptian Gods', '太陽神拉與冥神歐西里斯。', 'Ra the sun god and Osiris of the dead.')
    ]
  },
  {
    id: 'ma', zh: '摩洛哥', en: 'Morocco', region: 'africa', lat: 31.8, lon: -7.0,
    music: { scale: 'hijaz', root: 247, timbre: 'pluck', tempo: 104 },
    greeting: { text: 'السلام', roman: 'Salām', lang: 'ar-MA' },
    items: [
      C('landmark', '麥地那市集', 'Medina Souks', '迷宮般的傳統市集。', 'Labyrinthine traditional markets.'),
      C('craft', '皮革染坊', 'Leather Tanneries', '古法皮革染製工藝。', 'Age-old leather-dyeing craft.')
    ]
  },
  {
    id: 'ng', zh: '奈及利亞', en: 'Nigeria', region: 'africa', lat: 9.1, lon: 8.7,
    music: { scale: 'penta_africa', root: 262, timbre: 'perc', tempo: 120 },
    greeting: { text: 'Ẹ n lẹ', roman: 'E nle (Yoruba)', lang: 'en-NG' },
    items: [
      C('music', '會說話的鼓', 'Talking Drum', '能模仿語調的會說話鼓。', 'Drums that mimic the tones of speech.'),
      C('craft', '阿迪雷染布', 'Adire Textile', '靛藍紮染的約魯巴布藝。', 'Yoruba indigo resist-dyed cloth.')
    ]
  },
  {
    id: 'ke', zh: '肯亞', en: 'Kenya', region: 'africa', lat: 0.2, lon: 37.9,
    music: { scale: 'penta_africa', root: 247, timbre: 'perc', tempo: 112 },
    greeting: { text: 'Jambo', roman: 'Jambo', lang: 'sw-KE' },
    items: [
      C('craft', '馬賽串珠', 'Maasai Beadwork', '色彩鮮明的馬賽串珠飾。', 'Vivid Maasai beaded ornaments.'),
      C('festival', '馬賽跳躍舞', 'Maasai Adumu', '馬賽戰士的跳躍舞。', 'The jumping dance of Maasai warriors.')
    ]
  },
  {
    id: 'et', zh: '衣索比亞', en: 'Ethiopia', region: 'africa', lat: 9.1, lon: 40.5,
    music: { scale: 'penta_africa', root: 233, timbre: 'pluck', tempo: 96 },
    greeting: { text: 'ሰላም', roman: 'Selam', lang: 'am-ET' },
    items: [
      C('cuisine', '咖啡儀式', 'Coffee Ceremony', '咖啡發源地的烘豆儀式。', 'The coffee-roasting ceremony of coffee’s birthplace.'),
      C('myth', '巖鑿教堂', 'Rock-Hewn Churches', '拉利貝拉的岩鑿教堂。', 'The rock-hewn churches of Lalibela.')
    ]
  },
  {
    id: 'za', zh: '南非', en: 'South Africa', region: 'africa', lat: -29.0, lon: 24.0,
    music: { scale: 'penta_africa', root: 262, timbre: 'perc', tempo: 116 },
    greeting: { text: 'Sawubona', roman: 'Sawubona (Zulu)', lang: 'zu-ZA' },
    items: [
      C('music', '阿卡貝拉合唱', 'Isicathamiya', '祖魯無伴奏合唱。', 'Zulu a-cappella choral singing.'),
      C('festival', '彩虹之國', 'Rainbow Nation', '多元族群的彩虹之國。', 'A multi-ethnic "rainbow nation".')
    ]
  },
  // ---------------- Americas ----------------
  {
    id: 'us', zh: '美國', en: 'United States', region: 'americas', lat: 39.0, lon: -98.0,
    music: { scale: 'blues', root: 220, timbre: 'pluck', tempo: 112 },
    greeting: { text: 'Hello', roman: 'Hello', lang: 'en-US' },
    items: [
      C('music', '爵士與藍調', 'Jazz & Blues', '源自非裔美國人的爵士藍調。', 'Jazz and blues born of African-American culture.'),
      C('landmark', '自由女神像', 'Statue of Liberty', '移民之國的自由象徵。', 'A symbol of liberty for a nation of immigrants.'),
      C('festival', '感恩節', 'Thanksgiving', '家庭團聚的感恩節。', 'A family feast of gratitude.')
    ]
  },
  {
    id: 'mx', zh: '墨西哥', en: 'Mexico', region: 'americas', lat: 23.6, lon: -102.5,
    music: { scale: 'major', root: 262, timbre: 'pluck', tempo: 120 },
    greeting: { text: 'Hola', roman: 'Hola', lang: 'es-MX' },
    items: [
      C('festival', '亡靈節', 'Day of the Dead', '繽紛骷髏祭祖的亡靈節。', 'The vibrant skull-decked festival honoring the dead.'),
      C('music', '街頭樂隊', 'Mariachi', '熱情奔放的街頭樂隊。', 'The exuberant mariachi bands.'),
      C('landmark', '馬雅金字塔', 'Maya Pyramids', '奇琴伊察的馬雅金字塔。', 'The Maya pyramids of Chichén Itzá.')
    ]
  },
  {
    id: 'br', zh: '巴西', en: 'Brazil', region: 'americas', lat: -10.0, lon: -53.0,
    music: { scale: 'major', root: 233, timbre: 'perc', tempo: 124 },
    greeting: { text: 'Olá', roman: 'Olá', lang: 'pt-BR' },
    items: [
      C('festival', '里約嘉年華', 'Rio Carnival', '森巴與花車的嘉年華。', 'Samba and float parades of Carnival.'),
      C('music', '森巴與巴薩諾瓦', 'Samba & Bossa Nova', '森巴節奏與巴薩諾瓦。', 'Samba rhythm and bossa nova.')
    ]
  },
  {
    id: 'pe', zh: '秘魯', en: 'Peru', region: 'americas', lat: -9.2, lon: -75.0,
    music: { scale: 'andean', root: 294, timbre: 'flute', tempo: 100 },
    greeting: { text: 'Allillanchu', roman: 'Allillanchu (Quechua)', lang: 'es-PE' },
    items: [
      C('landmark', '馬丘比丘', 'Machu Picchu', '雲端的印加古城。', 'The Inca citadel in the clouds.'),
      C('music', '安地斯排笛', 'Andean Panpipes', '排笛與恰朗戈的安地斯樂。', 'Panpipes and charango of the Andes.')
    ]
  },
  {
    id: 'ar', zh: '阿根廷', en: 'Argentina', region: 'americas', lat: -38.4, lon: -63.6,
    music: { scale: 'minor', root: 247, timbre: 'reed', tempo: 96 },
    greeting: { text: 'Hola', roman: 'Hola', lang: 'es-AR' },
    items: [
      C('music', '探戈', 'Tango', '深情的探戈與班多鈕琴。', 'Passionate tango and the bandoneón.')
    ]
  },
  {
    id: 'cu', zh: '古巴', en: 'Cuba', region: 'americas', lat: 21.5, lon: -79.5,
    music: { scale: 'major', root: 277, timbre: 'perc', tempo: 120 },
    greeting: { text: 'Hola', roman: 'Hola', lang: 'es-CU' },
    items: [
      C('music', '頌樂與騷莎', 'Son & Salsa', '頌樂與騷莎的熱帶節奏。', 'Son and salsa tropical rhythms.')
    ]
  },
  {
    id: 'jm', zh: '牙買加', en: 'Jamaica', region: 'americas', lat: 18.1, lon: -77.3,
    music: { scale: 'blues', root: 196, timbre: 'pluck', tempo: 92 },
    greeting: { text: 'Wah gwaan', roman: 'Wah gwaan', lang: 'en-JM' },
    items: [
      C('music', '雷鬼樂', 'Reggae', '放鬆律動的雷鬼樂。', 'The laid-back groove of reggae.')
    ]
  },
  {
    id: 'ca', zh: '加拿大', en: 'Canada', region: 'americas', lat: 56.1, lon: -106.3,
    music: { scale: 'dorian', root: 262, timbre: 'bowed', tempo: 108 },
    greeting: { text: 'Hello', roman: 'Hello / Bonjour', lang: 'en-CA' },
    items: [
      C('craft', '原住民圖騰柱', 'Totem Poles', '西岸原住民的圖騰柱。', 'Totem poles of West Coast First Nations.'),
      C('festival', '楓糖季', 'Maple Syrup Season', '春日採楓糖的傳統。', 'The spring maple-tapping tradition.')
    ]
  },
  // ---------------- Oceania ----------------
  {
    id: 'au', zh: '澳洲', en: 'Australia', region: 'oceania', lat: -25.0, lon: 134.0,
    music: { scale: 'penta_africa', root: 130, timbre: 'reed', tempo: 80 },
    greeting: { text: 'G’day', roman: "G'day", lang: 'en-AU' },
    items: [
      C('music', '迪吉里杜管', 'Didgeridoo', '原住民的迪吉里杜低鳴。', 'The drone of the Aboriginal didgeridoo.'),
      C('myth', '夢創時光', 'Dreamtime', '原住民的夢創神話。', 'Aboriginal Dreamtime mythology.'),
      C('landmark', '烏魯魯巨岩', 'Uluru', '紅色聖地烏魯魯。', 'The sacred red monolith of Uluru.')
    ]
  },
  {
    id: 'nz', zh: '紐西蘭', en: 'New Zealand', region: 'oceania', lat: -41.0, lon: 174.0,
    music: { scale: 'penta_cn', root: 220, timbre: 'flute', tempo: 88 },
    greeting: { text: 'Kia ora', roman: 'Kia ora', lang: 'mi-NZ' },
    items: [
      C('music', '哈卡戰舞', 'Haka', '毛利人的哈卡戰舞。', 'The Māori haka war dance.'),
      C('craft', '毛利雕刻', 'Māori Carving', '螺旋紋的毛利木雕。', 'Spiral-patterned Māori carving.')
    ]
  },
  {
    id: 'hi', zh: '夏威夷', en: 'Hawaii', region: 'oceania', lat: 20.8, lon: -156.3,
    music: { scale: 'major', root: 294, timbre: 'pluck', tempo: 84 },
    greeting: { text: 'Aloha', roman: 'Aloha', lang: 'haw' },
    items: [
      C('music', '草裙舞與烏克麗麗', 'Hula & Ukulele', '草裙舞與烏克麗麗。', 'Hula dance and the ukulele.')
    ]
  }
];
