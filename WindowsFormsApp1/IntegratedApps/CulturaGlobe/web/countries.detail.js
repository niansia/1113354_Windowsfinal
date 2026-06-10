// Hand-curated culture items for every country that data.js's DETAIL didn't already
// cover, so each marker gets its own per-point voice guide. Same shape as DETAIL:
//   id: { zh?: TraditionalName, items: [ I(cat, zh, en, descZh, descEn), ... ] }
// Categories: language | music | festival | landmark | cuisine | craft | myth.
// (English descriptions avoid apostrophes on purpose.) data.js DETAIL overrides this.
const I = (cat, zh, en, dZh, dEn) => ({ cat, zh, en, dZh, dEn });

export const EXTRA_DETAIL = {
  ad: { items: [
    I('landmark', '比利牛斯山', 'Pyrenees', '夾在法西之間的山中小國。', 'A microstate high in the Pyrenees.'),
    I('cuisine', '山區燉菜', 'Escudella', '庇里牛斯的傳統燉肉鍋。', 'A hearty mountain meat stew.'),
    I('festival', '梅里特謝爾聖母日', 'Meritxell Day', '主保聖母的國定假日。', 'The patron-saint national day.') ] },
  ae: { items: [
    I('landmark', '哈里發塔', 'Burj Khalifa', '世界最高的摩天大樓。', 'The tallest skyscraper in the world.'),
    I('landmark', '謝赫扎耶德清真寺', 'Sheikh Zayed Mosque', '潔白宏偉的大清真寺。', 'A vast white grand mosque.'),
    I('cuisine', '阿拉伯香飯', 'Machboos', '香料燉煮的肉飯。', 'Spiced meat and rice.') ] },
  af: { items: [
    I('landmark', '藍色清真寺', 'Blue Mosque', '馬扎里沙里夫的藍色聖陵。', 'The blue shrine of Mazar-i-Sharif.'),
    I('craft', '阿富汗地毯', 'Afghan Rugs', '手織羊毛地毯。', 'Hand-woven wool carpets.'),
    I('music', '魯巴琴', 'Rubab', '撥弦樂器魯巴琴。', 'The plucked rubab lute.') ] },
  ag: { items: [
    I('festival', '安地卡嘉年華', 'Carnival', '慶祝解放的夏季嘉年華。', 'A summer carnival of emancipation.'),
    I('landmark', '納爾遜船塢', 'Nelson Dockyard', '歷史悠久的英式海軍船塢。', 'A historic Georgian naval dockyard.') ] },
  al: { items: [
    I('landmark', '培拉特古城', 'Berat', '千窗之城的鄂圖曼老城。', 'The Ottoman town of a thousand windows.'),
    I('music', '伊索複音', 'Iso-polyphony', '多聲部民謠合唱。', 'Multipart folk singing.'),
    I('cuisine', '優格烤羊肉', 'Tavë Kosi', '優格焗烤羊肉。', 'Baked lamb with yogurt.') ] },
  am: { items: [
    I('landmark', '格加爾德修道院', 'Geghard', '岩鑿的中世紀修道院。', 'A medieval rock-cut monastery.'),
    I('music', '杜杜克管', 'Duduk', '哀傷的杏木雙簧管。', 'The plaintive apricot-wood duduk.'),
    I('cuisine', '拉瓦什薄餅', 'Lavash', '傳統薄餅麵包。', 'Traditional flatbread.') ] },
  ao: { items: [
    I('music', '基宗巴舞曲', 'Kizomba', '浪漫的基宗巴舞曲。', 'The romantic kizomba dance.'),
    I('craft', '喬奎面具', 'Chokwe Masks', '喬奎族木雕面具。', 'Chokwe carved masks.'),
    I('cuisine', '木薯糊', 'Funje', '木薯主食糊。', 'A cassava staple.') ] },
  at: { items: [
    I('music', '維也納古典樂', 'Viennese Classical', '莫札特與華爾滋之鄉。', 'Home of Mozart and the waltz.'),
    I('landmark', '美泉宮', 'Schönbrunn', '哈布斯堡的金色宮殿。', 'The Habsburg golden palace.'),
    I('cuisine', '維也納炸肉排', 'Wiener Schnitzel', '金黃酥脆炸肉排。', 'A crispy breaded veal cutlet.') ] },
  az: { items: [
    I('landmark', '火焰塔', 'Flame Towers', '巴庫的火焰造型大樓。', 'Baku flame-shaped towers.'),
    I('craft', '阿塞拜疆地毯', 'Carpets', '手織圖紋地毯。', 'Hand-knotted patterned carpets.'),
    I('music', '木卡姆', 'Mugham', '即興的木卡姆古典樂。', 'Improvised mugham classical music.') ] },
  ba: { items: [
    I('landmark', '莫斯塔爾古橋', 'Stari Most', '鄂圖曼石拱古橋。', 'An Ottoman stone arch bridge.'),
    I('music', '塞夫達赫', 'Sevdalinka', '憂傷的城市情歌。', 'Melancholic urban love songs.'),
    I('cuisine', '切巴契契', 'Ćevapi', '烤肉香腸配麵餅。', 'Grilled minced-meat sausages.') ] },
  bb: { items: [
    I('music', '卡利普索與索卡', 'Calypso & Soca', '加勒比節奏樂。', 'Caribbean rhythm music.'),
    I('festival', '豐收節', 'Crop Over', '慶祝甘蔗豐收的嘉年華。', 'A sugar-cane harvest carnival.'),
    I('cuisine', '飛魚與庫庫', 'Flying Fish', '國菜飛魚配玉米糊。', 'The national flying-fish dish.') ] },
  bd: { items: [
    I('landmark', '六十圓頂清真寺', 'Sixty Dome Mosque', '蘇丹時期的磚造清真寺。', 'A sultanate-era brick mosque.'),
    I('festival', '孟加拉新年', 'Pohela Boishakh', '繽紛的孟加拉新年遊行。', 'The colorful Bengali New Year parade.'),
    I('craft', '提花細布', 'Jamdani', '精緻的手織提花細布。', 'Fine handloom jamdani muslin.') ] },
  be: { items: [
    I('cuisine', '鬆餅與薯條', 'Waffles & Fries', '鬆餅、薯條與巧克力。', 'Waffles, fries and chocolate.'),
    I('landmark', '布魯塞爾大廣場', 'Grand-Place', '華麗的中世紀廣場。', 'An ornate medieval square.'),
    I('festival', '班什狂歡節', 'Binche Carnival', '面具小丑大遊行。', 'A masked-clown carnival.') ] },
  bf: { items: [
    I('festival', '泛非電影節', 'FESPACO', '非洲最大的電影節。', 'The biggest film festival in Africa.'),
    I('craft', '失蠟銅雕', 'Bronze Casting', '失蠟法銅雕工藝。', 'Lost-wax bronze art.'),
    I('music', '巴拉風琴', 'Balafon', '木琴巴拉風。', 'The balafon xylophone.') ] },
  bg: { items: [
    I('music', '保加利亞女聲', 'Bulgarian Voices', '神祕的多聲部女聲。', 'Mystic female polyphony.'),
    I('festival', '玫瑰節', 'Rose Festival', '玫瑰谷的採收慶典。', 'The Rose Valley harvest festival.'),
    I('cuisine', '優格與玫瑰油', 'Yogurt & Rose Oil', '保加利亞優格與玫瑰精油。', 'Bulgarian yogurt and rose oil.') ] },
  bh: { items: [
    I('landmark', '巴林古堡', 'Bahrain Fort', '葡屬時期的海岸古堡。', 'A Portuguese-era coastal fort.'),
    I('craft', '採珠業', 'Pearl Diving', '古老的波斯灣採珠。', 'Ancient Gulf pearl diving.'),
    I('cuisine', '香料魚飯', 'Machboos', '香料海鮮飯。', 'Spiced seafood rice.') ] },
  bi: { items: [
    I('music', '皇家聖鼓', 'Royal Drummers', '震撼的皇家聖鼓舞。', 'The thunderous royal drummers.'),
    I('cuisine', '豆飯與大蕉', 'Beans & Plantain', '豆類與大蕉主食。', 'Beans and plantain staples.') ] },
  bj: { items: [
    I('myth', '巫毒信仰', 'Vodun', '巫毒教的發源地。', 'The birthplace of Vodun.'),
    I('landmark', '水上村落', 'Ganvié', '湖上的高腳屋村。', 'A stilt-house lake village.'),
    I('craft', '阿波美壁雕', 'Abomey Reliefs', '王宮的泥塑浮雕。', 'Royal palace clay reliefs.') ] },
  bn: { items: [
    I('landmark', '蘇丹清真寺', 'Omar Ali Mosque', '金頂的蘇丹清真寺。', 'The golden-domed sultan mosque.'),
    I('landmark', '水上村', 'Kampong Ayer', '世界最大的水上聚落。', 'The largest stilt village in the world.'),
    I('cuisine', '西米糊', 'Ambuyat', '西米澱粉糊主食。', 'A sago-starch staple.') ] },
  bo: { items: [
    I('landmark', '烏尤尼鹽沼', 'Salar de Uyuni', '世界最大的鏡面鹽湖。', 'The largest mirror salt flat.'),
    I('festival', '奧魯羅狂歡節', 'Oruro Carnival', '魔鬼舞面具遊行。', 'The diablada masked dance.'),
    I('craft', '安地斯紡織', 'Aguayo Textiles', '鮮豔的安地斯織布。', 'Vivid Andean weaving.') ] },
  bs: { items: [
    I('festival', '君肯努', 'Junkanoo', '鼓樂面具大遊行。', 'A drum-and-mask street parade.'),
    I('landmark', '粉紅沙灘', 'Pink Sand Beach', '哈勃島的粉紅沙灘。', 'The pink sands of Harbour Island.'),
    I('cuisine', '海螺料理', 'Conch', '炸海螺與海螺沙拉。', 'Fried conch and conch salad.') ] },
  bt: { items: [
    I('landmark', '虎穴寺', 'Taktsang', '懸崖上的虎穴寺。', 'The cliffside Taktsang monastery.'),
    I('festival', '戴秋節', 'Tshechu', '面具神舞的節慶。', 'A masked-dance religious festival.'),
    I('myth', '國民幸福', 'Gross National Happiness', '以幸福為指標的國度。', 'A nation measured by happiness.') ] },
  bw: { items: [
    I('landmark', '奧卡萬戈三角洲', 'Okavango Delta', '內陸沼澤野生天堂。', 'An inland wildlife delta.'),
    I('craft', '草編工藝', 'Basketry', '手編草籃工藝。', 'Hand-coiled basketry.'),
    I('music', '桑族歌謠', 'San Songs', '布希曼人的歌舞。', 'Bushman song and dance.') ] },
  by: { items: [
    I('craft', '草編與刺繡', 'Straw Weaving', '草編與民族刺繡。', 'Straw craft and folk embroidery.'),
    I('cuisine', '馬鈴薯煎餅', 'Draniki', '香煎馬鈴薯餅。', 'Potato pancakes.'),
    I('landmark', '別洛韋日森林', 'Białowieża', '歐洲野牛的原始森林。', 'Primeval forest of the European bison.') ] },
  bz: { items: [
    I('landmark', '馬雅遺址', 'Maya Ruins', '卡拉科爾的馬雅金字塔。', 'The Maya pyramids of Caracol.'),
    I('landmark', '大藍洞', 'Great Blue Hole', '著名的海底藍洞。', 'The famous underwater sinkhole.'),
    I('cuisine', '椰香米飯燉豆', 'Rice & Beans', '椰香米飯燉豆。', 'Coconut rice and beans.') ] },
  cd: { items: [
    I('music', '林加拉舞曲', 'Soukous', '歡快的剛果倫巴。', 'Upbeat Congolese rumba.'),
    I('landmark', '維龍加國家公園', 'Virunga', '山地大猩猩的棲地。', 'Mountain-gorilla habitat.'),
    I('craft', '庫巴布', 'Kuba Cloth', '庫巴族幾何織布。', 'Kuba geometric cloth.') ] },
  cf: { items: [
    I('music', '俾格米複音', 'Pygmy Polyphony', '雨林俾格米人的複音歌。', 'Rainforest Pygmy polyphony.'),
    I('landmark', '桑加河森林', 'Sangha Forest', '中非雨林保護區。', 'A Central African rainforest reserve.') ] },
  cg: { items: [
    I('music', '剛果倫巴', 'Congolese Rumba', '列入遺產的倫巴樂。', 'Heritage-listed rumba.'),
    I('landmark', '奧扎拉國家公園', 'Odzala', '雨林與森林象。', 'Rainforest and forest elephants.') ] },
  ch: { items: [
    I('landmark', '馬特洪峰', 'Matterhorn', '阿爾卑斯的金字塔山峰。', 'The pyramid peak of the Alps.'),
    I('cuisine', '起司火鍋與巧克力', 'Fondue & Chocolate', '起司火鍋與瑞士巧克力。', 'Cheese fondue and Swiss chocolate.'),
    I('craft', '製錶工藝', 'Watchmaking', '精密的製錶工藝。', 'Precision watchmaking.') ] },
  ci: { items: [
    I('music', '庫貝舞曲', 'Coupé-Décalé', '都市流行舞曲。', 'Urban dance pop.'),
    I('craft', '鮑勒面具', 'Baule Masks', '鮑勒族木雕面具。', 'Baule carved masks.'),
    I('cuisine', '發酵木薯', 'Attiéké', '發酵木薯粒。', 'Fermented cassava couscous.') ] },
  cl: { items: [
    I('landmark', '復活節島摩艾', 'Moai', '神祕的巨石人像。', 'The mysterious stone heads.'),
    I('music', '新歌謠運動', 'Nueva Canción', '抗議民謠運動。', 'The protest folk movement.'),
    I('cuisine', '玉米肉派', 'Pastel de Choclo', '甜玉米肉派。', 'A sweet-corn meat pie.') ] },
  cm: { items: [
    I('music', '馬庫薩', 'Makossa', '動感的馬庫薩舞曲。', 'The lively makossa beat.'),
    I('landmark', '喀麥隆火山', 'Mount Cameroon', '西非最高的活火山。', 'The tallest active volcano in West Africa.'),
    I('craft', '草原王國木雕', 'Grassfields Art', '草原王國的木雕。', 'Grassfields carved art.') ] },
  co: { items: [
    I('music', '昆比亞', 'Cumbia', '哥倫比亞國民舞曲。', 'The national cumbia rhythm.'),
    I('festival', '花卉節', 'Feria de las Flores', '麥德林的花車遊行。', 'The Medellín flower parade.'),
    I('cuisine', '豐盛拼盤與咖啡', 'Bandeja Paisa', '豐盛拼盤與咖啡。', 'A hearty platter and coffee.') ] },
  cr: { items: [
    I('landmark', '阿雷納爾火山', 'Arenal Volcano', '圓錐形的活火山。', 'A conical active volcano.'),
    I('myth', '純粹生活', 'Pura Vida', '「純粹生活」的生活哲學。', 'The pura vida philosophy.'),
    I('cuisine', '加洛平托', 'Gallo Pinto', '米飯黑豆早餐。', 'A rice-and-beans breakfast.') ] },
  cv: { items: [
    I('music', '莫爾納', 'Morna', '憂傷的莫爾納民謠。', 'The soulful morna ballad.'),
    I('cuisine', '玉米豆燉菜', 'Cachupa', '玉米豆燉菜國菜。', 'The national corn-and-bean stew.') ] },
  cy: { items: [
    I('landmark', '帕福斯古城', 'Paphos', '阿芙蘿黛蒂神話之地。', 'Land of the Aphrodite myth.'),
    I('cuisine', '哈魯米起司', 'Halloumi', '可燒烤的哈魯米起司。', 'Grilled halloumi cheese.'),
    I('craft', '蕾夫卡拉蕾絲', 'Lefkara Lace', '手工蕾絲刺繡。', 'Handmade lace embroidery.') ] },
  cz: { items: [
    I('landmark', '布拉格城堡', 'Prague Castle', '查理大橋與古堡。', 'Charles Bridge and the old castle.'),
    I('cuisine', '啤酒與燉肉', 'Beer & Goulash', '世界知名的啤酒。', 'World-famous beer.'),
    I('craft', '波希米亞玻璃', 'Bohemian Glass', '水晶玻璃工藝。', 'Crystal glass craft.') ] },
  dj: { items: [
    I('landmark', '阿薩勒湖', 'Lake Assal', '非洲最低點的鹽湖。', 'The lowest salt lake in Africa.'),
    I('cuisine', '香料燉肉飯', 'Skoudehkaris', '香料米飯燉肉。', 'Spiced rice and meat.') ] },
  dk: { items: [
    I('myth', '小美人魚', 'Little Mermaid', '安徒生童話的雕像。', 'The Andersen fairy-tale statue.'),
    I('craft', '北歐設計', 'Danish Design', '簡約的家具設計。', 'Minimalist furniture design.'),
    I('cuisine', '開放三明治', 'Smørrebrød', '黑麥開放式三明治。', 'Rye open sandwiches.') ] },
  dm: { zh: '多米尼克', items: [
    I('landmark', '沸湖', 'Boiling Lake', '火山沸騰之湖。', 'A volcanic boiling lake.'),
    I('music', '卡丹斯樂', 'Cadence-lypso', '加勒比融合樂。', 'Caribbean fusion music.') ] },
  do: { items: [
    I('music', '梅倫格與巴恰塔', 'Merengue & Bachata', '熱情的國民舞曲。', 'The national dance music.'),
    I('landmark', '聖多明哥古城', 'Colonial Zone', '美洲最古老的歐式城區。', 'The oldest European city in the Americas.'),
    I('cuisine', '國旗飯', 'La Bandera', '米飯豆肉拼盤。', 'Rice, beans and meat.') ] },
  dz: { items: [
    I('music', '萊伊樂', 'Raï', '奧蘭流行的萊伊樂。', 'Popular raï music from Oran.'),
    I('landmark', '塔西利岩畫', 'Tassili', '撒哈拉岩畫與沙海。', 'Saharan rock art and dunes.'),
    I('cuisine', '庫斯庫斯', 'Couscous', '北非小米主食。', 'The North African semolina staple.') ] },
  ec: { items: [
    I('landmark', '加拉巴哥群島', 'Galápagos', '達爾文研究演化的島嶼。', 'The islands where Darwin studied evolution.'),
    I('craft', '巴拿馬草帽', 'Panama Hat', '厄瓜多手編草帽。', 'Ecuadorian woven straw hats.'),
    I('festival', '太陽祭', 'Inti Raymi', '安地斯太陽祭。', 'The Andean sun festival.') ] },
  ee: { items: [
    I('festival', '歌唱節', 'Song Festival', '萬人合唱的歌唱節。', 'A mass-choir song festival.'),
    I('landmark', '塔林老城', 'Tallinn Old Town', '中世紀漢薩老城。', 'A medieval Hanseatic old town.'),
    I('craft', '數位社會', 'e-Estonia', '先進的數位國家。', 'An advanced digital nation.') ] },
  er: { items: [
    I('landmark', '阿斯馬拉', 'Asmara', '義式現代主義建築之城。', 'A city of Italian modernist architecture.'),
    I('cuisine', '英傑拉薄餅', 'Injera', '發酵酸薄餅。', 'A sour fermented flatbread.') ] },
  fi: { items: [
    I('myth', '卡勒瓦拉', 'Kalevala', '芬蘭的民族史詩。', 'The Finnish national epic.'),
    I('landmark', '桑拿與極光', 'Sauna & Aurora', '桑拿文化與北極光。', 'Sauna culture and northern lights.'),
    I('craft', '設計與聖誕老人', 'Design & Santa', '設計之都與聖誕老人故鄉。', 'A design capital and home of Santa.') ] },
  fj: { items: [
    I('festival', '走火與卡瓦', 'Firewalking & Kava', '走火儀式與卡瓦飲。', 'Firewalking and the kava drink.'),
    I('craft', '樹皮布', 'Masi Cloth', '樹皮捶製布藝。', 'Beaten bark cloth.'),
    I('music', '梅克舞', 'Meke', '敘事歌舞梅克。', 'The narrative meke dance.') ] },
  fm: { items: [
    I('landmark', '南馬都爾', 'Nan Madol', '玄武岩石城遺址。', 'A basalt stone-city ruin.'),
    I('craft', '星辰航海術', 'Navigation', '看星導航的航海術。', 'Star-path canoe navigation.') ] },
  ga: { items: [
    I('myth', '布維提', 'Bwiti', '森林靈性傳統布維提。', 'The Bwiti forest spiritual tradition.'),
    I('craft', '芳族面具', 'Fang Masks', '芳族的白面具。', 'Fang white masks.'),
    I('landmark', '洛佩國家公園', 'Lopé', '雨林與草原的交界。', 'A forest-savanna mosaic.') ] },
  gd: { items: [
    I('craft', '肉豆蔻', 'Nutmeg', '香料島盛產的肉豆蔻。', 'The nutmeg of the spice island.'),
    I('festival', '香料嘉年華', 'Spicemas', '熱鬧的夏季嘉年華。', 'A lively summer carnival.') ] },
  ge: { items: [
    I('music', '喬治亞複音', 'Polyphony', '古老的多聲部合唱。', 'Ancient polyphonic singing.'),
    I('cuisine', '起司麵包與葡萄酒', 'Khachapuri & Wine', '起司麵包與八千年釀酒。', 'Cheese bread and 8000-year winemaking.'),
    I('landmark', '上斯瓦涅季', 'Svaneti', '高加索的塔樓村落。', 'Caucasus tower villages.') ] },
  gh: { items: [
    I('craft', '肯特布', 'Kente', '鮮豔的肯特織布。', 'The vivid kente cloth.'),
    I('landmark', '海岸城堡', 'Cape Coast Castle', '奴隸貿易史的城堡。', 'A slave-trade-era castle.'),
    I('music', '高生活樂', 'Highlife', '迦納的高生活流行樂。', 'Ghanaian highlife pop.') ] },
  gm: { items: [
    I('music', '科拉琴', 'Kora', '二十一弦的科拉豎琴。', 'The 21-string kora harp.'),
    I('landmark', '甘比亞河', 'Gambia River', '貫穿全國的大河。', 'The river that crosses the nation.') ] },
  gn: { items: [
    I('music', '金貝鼓', 'Djembe', '西非的金貝鼓樂。', 'West African djembe drumming.'),
    I('craft', '靛藍染布', 'Indigo Cloth', '靛藍染布工藝。', 'Indigo-dyed cloth.') ] },
  gq: { items: [
    I('music', '巴雷雷舞', 'Balele', '傳統的巴雷雷歌舞。', 'The traditional balele dance.'),
    I('landmark', '比奧科島', 'Bioko', '火山雨林島嶼。', 'A volcanic rainforest island.') ] },
  gt: { items: [
    I('landmark', '蒂卡爾', 'Tikal', '馬雅叢林金字塔。', 'Maya jungle pyramids.'),
    I('craft', '馬雅織布', 'Maya Textiles', '鮮豔的手織馬雅布。', 'Vivid Maya handweaving.'),
    I('festival', '巨型風箏', 'Giant Kites', '亡靈節的巨型風箏。', 'Giant kites for the Day of the Dead.') ] },
  gy: { items: [
    I('landmark', '凱厄圖爾瀑布', 'Kaieteur Falls', '世界最大的單級瀑布。', 'The largest single-drop waterfall.'),
    I('cuisine', '胡椒燉鍋', 'Pepperpot', '原住民燉肉鍋。', 'An Amerindian meat stew.') ] },
  hn: { items: [
    I('landmark', '科潘遺址', 'Copán', '馬雅石碑古城。', 'A Maya city of carved stelae.'),
    I('music', '加里富納鼓樂', 'Garífuna', '加勒比加里富納樂。', 'Garífuna Caribbean music.') ] },
  hr: { items: [
    I('landmark', '杜布羅夫尼克', 'Dubrovnik', '亞得里亞海的城牆古城。', 'The walled Adriatic old town.'),
    I('landmark', '普利特維采湖', 'Plitvice Lakes', '翠綠的瀑布湖群。', 'Emerald waterfall lakes.'),
    I('craft', '領帶起源', 'Cravat', '領帶的發源地。', 'The birthplace of the necktie.') ] },
  ht: { items: [
    I('myth', '巫毒教', 'Vodou', '海地的巫毒信仰。', 'Haitian Vodou belief.'),
    I('landmark', '拉費里埃城堡', 'Citadelle', '山頂的巨型要塞。', 'A mountaintop fortress.'),
    I('craft', '油桶鐵雕', 'Metal Art', '油桶切割的鐵雕藝術。', 'Oil-drum cut-metal art.') ] },
  hu: { items: [
    I('cuisine', '紅椒燉牛肉', 'Goulash', '紅椒燉肉湯。', 'Paprika beef stew.'),
    I('landmark', '布達佩斯溫泉', 'Budapest Baths', '多瑙河畔的溫泉之都。', 'A thermal-bath capital on the Danube.'),
    I('music', '查爾達什', 'Csárdás', '匈牙利的吉普賽舞曲。', 'A Hungarian gypsy dance.') ] },
  iq: { items: [
    I('landmark', '巴比倫遺址', 'Babylon', '古巴比倫文明遺址。', 'Ancient Babylonian ruins.'),
    I('music', '伊拉克木卡姆', 'Maqam', '古典的伊拉克木卡姆。', 'Classical Iraqi maqam.'),
    I('cuisine', '烤底格里斯魚', 'Masgouf', '炭烤底格里斯河魚。', 'Grilled Tigris river fish.') ] },
  is: { items: [
    I('myth', '精靈傳說', 'Elves', '隱身精靈的民間信仰。', 'Belief in hidden elves.'),
    I('landmark', '間歇泉與極光', 'Geysers & Aurora', '間歇泉、瀑布與極光。', 'Geysers, waterfalls and auroras.'),
    I('music', '冰島後搖', 'Post-rock', '空靈的冰島後搖。', 'Ethereal Icelandic post-rock.') ] },
  jo: { items: [
    I('landmark', '佩特拉古城', 'Petra', '玫瑰色的岩鑿古城。', 'The rose-red rock-cut city.'),
    I('landmark', '瓦地倫沙漠', 'Wadi Rum', '月之谷的紅色沙漠。', 'The red Valley of the Moon.'),
    I('cuisine', '曼薩夫', 'Mansaf', '優格羊肉飯國菜。', 'The national lamb-and-yogurt rice.') ] },
  kg: { items: [
    I('myth', '瑪納斯史詩', 'Epic of Manas', '世界最長的口傳史詩。', 'The longest oral epic.'),
    I('craft', '氈房與氈毯', 'Yurt & Shyrdak', '遊牧氈房與氈毯。', 'Nomad yurts and felt rugs.'),
    I('festival', '鷹獵', 'Eagle Hunting', '馴鷹狩獵傳統。', 'Falconry with golden eagles.') ] },
  kh: { items: [
    I('landmark', '吳哥窟', 'Angkor Wat', '世界最大的廟宇建築。', 'The largest religious monument.'),
    I('craft', '高棉絲綢', 'Khmer Silk', '手織的高棉絲。', 'Handwoven Khmer silk.'),
    I('music', '阿帕薩拉舞', 'Apsara Dance', '古典的仙女舞。', 'The classical apsara dance.') ] },
  ki: { items: [
    I('craft', '露兜葉編織', 'Pandanus Weaving', '露兜樹葉的編織。', 'Pandanus-leaf weaving.'),
    I('music', '基里巴斯舞', 'Kiribati Dance', '站立擺手的傳統舞。', 'A standing arm-movement dance.') ] },
  km: { items: [
    I('craft', '依蘭精油', 'Ylang-Ylang', '依蘭香精之島。', 'An island of ylang-ylang oil.'),
    I('festival', '大婚', 'Grand Mariage', '盛大的傳統婚禮。', 'A grand traditional wedding.') ] },
  kn: { items: [
    I('festival', '聖誕嘉年華', 'Sugar Mas', '熱鬧的聖誕嘉年華。', 'A festive Christmas carnival.'),
    I('landmark', '硫磺石要塞', 'Brimstone Hill', '山頂的石造要塞。', 'A hilltop stone fortress.') ] },
  kp: { items: [
    I('landmark', '平壤紀念建築', 'Pyongyang Monuments', '宏偉的紀念建築。', 'Grand monumental architecture.'),
    I('festival', '集體操', 'Mass Games', '大型團體操表演。', 'A mass gymnastics spectacle.'),
    I('music', '阿里郎', 'Arirang', '朝鮮民謠阿里郎。', 'The folk song Arirang.') ] },
  kw: { items: [
    I('landmark', '科威特塔', 'Kuwait Towers', '海濱地標水塔。', 'The seaside landmark towers.'),
    I('craft', '木帆船', 'Dhow', '傳統阿拉伯木帆船。', 'Traditional Arabian dhows.'),
    I('cuisine', '香料魚飯', 'Machboos', '香料海鮮飯。', 'Spiced seafood rice.') ] },
  kz: { items: [
    I('music', '冬不拉', 'Dombra', '雙弦的冬不拉琴。', 'The two-string dombra lute.'),
    I('festival', '鷹獵', 'Eagle Hunting', '草原的馴鷹狩獵。', 'Steppe eagle hunting.'),
    I('cuisine', '別什巴爾馬克', 'Beshbarmak', '馬肉麵片國菜。', 'The national horse-meat noodles.') ] },
  la: { items: [
    I('landmark', '龍坡邦', 'Luang Prabang', '古都的金色佛寺。', 'The golden temples of the old capital.'),
    I('festival', '清晨布施', 'Alms Giving', '僧侶的清晨布施。', 'The dawn alms-giving ritual.'),
    I('cuisine', '糯米與涼拌', 'Sticky Rice & Larb', '糯米配涼拌肉末。', 'Sticky rice with larb.') ] },
  lb: { items: [
    I('landmark', '巴勒貝克神廟', 'Baalbek', '巨大的羅馬神廟。', 'Colossal Roman temples.'),
    I('cuisine', '中東開胃菜', 'Mezze', '豐富的黎巴嫩前菜。', 'Abundant Lebanese mezze.'),
    I('music', '黛博凱舞', 'Dabke', '手牽手踏步的民族舞。', 'A line-stomping folk dance.') ] },
  lc: { items: [
    I('landmark', '皮通山', 'Pitons', '雙火山錐地標。', 'The twin volcanic peaks.'),
    I('festival', '聖露西亞爵士節', 'Jazz Festival', '加勒比的爵士音樂節。', 'A Caribbean jazz festival.') ] },
  li: { items: [
    I('landmark', '瓦杜茲城堡', 'Vaduz Castle', '山坡上的王室古堡。', 'A hillside princely castle.'),
    I('festival', '國慶日', 'National Day', '全民同慶的國慶。', 'A nationwide national day.') ] },
  lk: { items: [
    I('landmark', '獅子岩', 'Sigiriya', '岩頂的古代宮殿。', 'An ancient rock-top palace.'),
    I('festival', '佛牙節', 'Esala Perahera', '大象遊行的佛牙節。', 'The tooth-relic elephant procession.'),
    I('cuisine', '錫蘭茶與咖哩', 'Tea & Curry', '錫蘭紅茶與米飯咖哩。', 'Ceylon tea and rice with curry.') ] },
  lr: { items: [
    I('craft', '部族面具', 'Masks', '部族的木雕面具。', 'Tribal carved masks.'),
    I('cuisine', '木薯葉燉菜', 'Cassava Leaf', '木薯葉燉肉飯。', 'Cassava-leaf stew with rice.') ] },
  ls: { items: [
    I('craft', '巴索托毯', 'Basotho Blanket', '民族象徵的毛毯。', 'The national wool blanket.'),
    I('landmark', '高山王國', 'Mountain Kingdom', '雲端的高山王國。', 'A kingdom in the sky.') ] },
  lt: { items: [
    I('landmark', '十字架山', 'Hill of Crosses', '萬千十字架的聖地。', 'A hill of countless crosses.'),
    I('festival', '歌唱節', 'Song Festival', '波羅的海的歌唱節。', 'A Baltic song festival.'),
    I('craft', '琥珀工藝', 'Amber', '波羅的海琥珀。', 'Baltic amber craft.') ] },
  lu: { items: [
    I('landmark', '盧森堡古城', 'Old Quarters', '峽谷上的要塞古城。', 'A fortress city above a gorge.'),
    I('festival', '跳躍遊行', 'Echternach Dancing', '跳躍式的宗教遊行。', 'A hopping religious procession.') ] },
  lv: { items: [
    I('festival', '歌唱節', 'Song Festival', '萬人合唱的慶典。', 'A mass-choir celebration.'),
    I('landmark', '里加新藝術', 'Riga Art Nouveau', '新藝術建築之城。', 'An Art Nouveau city.'),
    I('craft', '琥珀與民謠', 'Amber & Dainas', '琥珀與民謠短詩。', 'Amber and folk-song verses.') ] },
  ly: { items: [
    I('landmark', '萊普提斯馬格納', 'Leptis Magna', '壯觀的羅馬古城。', 'A grand Roman ruin.'),
    I('landmark', '撒哈拉沙漠', 'Sahara', '廣袤的撒哈拉沙海。', 'Vast Saharan dunes.') ] },
  mc: { items: [
    I('festival', '摩納哥大獎賽', 'Grand Prix', 'F1街道賽車。', 'The F1 street race.'),
    I('landmark', '蒙地卡羅賭場', 'Monte Carlo Casino', '華麗的賭場建築。', 'An opulent casino.') ] },
  md: { items: [
    I('cuisine', '地下酒窖', 'Wine Cellars', '世界最大的酒窖。', 'The largest wine cellars.'),
    I('music', '環舞霍拉', 'Hora', '圍圈的霍拉環舞。', 'The hora circle dance.') ] },
  me: { items: [
    I('landmark', '科托灣', 'Bay of Kotor', '峽灣中的古城。', 'An old town in a fjord-like bay.'),
    I('landmark', '杜米托爾', 'Durmitor', '黑山的高山國家公園。', 'A black-mountain national park.') ] },
  mg: { items: [
    I('landmark', '猴麵包樹大道', 'Avenue of Baobabs', '巨大的猴麵包樹大道。', 'An avenue of giant baobabs.'),
    I('myth', '翻屍節', 'Famadihana', '與祖先共舞的翻屍禮。', 'The ancestor-reburial ritual.'),
    I('music', '法米麗琴', 'Valiha', '竹製的筒形琴。', 'The tubular bamboo zither.') ] },
  mh: { items: [
    I('craft', '海圖編織', 'Stick Charts', '木枝海浪導航圖。', 'Stick wave-navigation charts.'),
    I('craft', '露兜編織', 'Weaving', '露兜葉的編織工藝。', 'Pandanus weaving.') ] },
  mk: { items: [
    I('landmark', '奧赫里德湖', 'Lake Ohrid', '古老的奧赫里德湖。', 'The ancient Lake Ohrid.'),
    I('music', '銅管樂隊', 'Brass Bands', '巴爾幹的銅管樂。', 'Balkan brass bands.') ] },
  ml: { zh: '馬利', items: [
    I('landmark', '傑內大清真寺', 'Djenné Mosque', '世界最大的泥造清真寺。', 'The largest mud-brick mosque.'),
    I('music', '沙漠藍調', 'Desert Blues', '馬利的沙漠藍調。', 'Malian desert blues.'),
    I('landmark', '廷巴克圖', 'Timbuktu', '古代的學術之城。', 'An ancient city of learning.') ] },
  mm: { items: [
    I('landmark', '蒲甘佛塔', 'Bagan', '萬塔平原的古佛塔。', 'The temple-dotted plain of Bagan.'),
    I('craft', '漆器與金箔', 'Lacquerware', '緬甸漆器與貼金工藝。', 'Burmese lacquerware and gold leaf.'),
    I('cuisine', '茶葉沙拉', 'Lahpet', '發酵茶葉沙拉。', 'A fermented tea-leaf salad.') ] },
  mr: { items: [
    I('landmark', '欣蓋提古城', 'Chinguetti', '撒哈拉的古籍之城。', 'A Saharan town of old manuscripts.'),
    I('craft', '採鹽駝隊', 'Salt Caravans', '沙漠的鹽商駝隊。', 'Desert salt caravans.') ] },
  mt: { items: [
    I('landmark', '巨石神廟', 'Megalithic Temples', '史前的巨石神廟。', 'Prehistoric megalithic temples.'),
    I('landmark', '瓦萊塔古城', 'Valletta', '騎士團的要塞古城。', 'The fortress city of the Knights.'),
    I('festival', '教區節', 'Festa', '熱鬧的教區慶典。', 'A lively parish feast.') ] },
  mu: { items: [
    I('music', '賽加舞', 'Séga', '克里奧爾的賽加舞。', 'The Creole séga dance.'),
    I('landmark', '七色土', 'Seven Coloured Earths', '天然的七彩沙丘。', 'Natural seven-colored dunes.'),
    I('cuisine', '豆餅', 'Dholl Puri', '豆餅街頭小吃。', 'A split-pea flatbread street food.') ] },
  mv: { items: [
    I('landmark', '環礁島國', 'Atolls', '碧海環礁的島國。', 'A nation of coral atolls.'),
    I('music', '博杜貝魯鼓', 'Boduberu', '大鼓歌舞博杜貝魯。', 'The boduberu drum dance.') ] },
  mw: { items: [
    I('landmark', '馬拉維湖', 'Lake Malawi', '多彩慈鯛的大湖。', 'A lake of colorful cichlids.'),
    I('music', '古勒灣庫', 'Gule Wamkulu', '切瓦族的面具舞。', 'The Chewa masked dance.') ] },
  my: { items: [
    I('landmark', '雙子星塔', 'Petronas Towers', '吉隆坡的雙塔地標。', 'The Kuala Lumpur twin towers.'),
    I('cuisine', '椰漿飯與沙嗲', 'Nasi Lemak & Satay', '椰漿飯與烤肉串。', 'Coconut rice and grilled satay.'),
    I('festival', '多元族群節慶', 'Festivals', '華印馬的多元節慶。', 'Chinese, Indian and Malay festivals.') ] },
  mz: { items: [
    I('music', '馬拉本塔', 'Marrabenta', '都市舞曲馬拉本塔。', 'The urban marrabenta dance.'),
    I('craft', '馬孔德木雕', 'Makonde Carving', '馬孔德的黑木雕。', 'Makonde blackwood carving.'),
    I('cuisine', '皮里皮里蝦', 'Piri-piri Prawns', '辣味的烤大蝦。', 'Spicy grilled prawns.') ] },
  na: { items: [
    I('landmark', '索蘇斯維利沙丘', 'Sossusvlei', '紅色沙漠的高沙丘。', 'Towering red desert dunes.'),
    I('craft', '辛巴族紅泥', 'Himba Ochre', '辛巴族的紅泥裝飾。', 'Himba red-ochre adornment.') ] },
  ne: { items: [
    I('festival', '沃達貝求偶節', 'Gerewol', '沃達貝男子的選美節。', 'The Wodaabe male beauty contest.'),
    I('landmark', '阿伊爾沙漠', 'Aïr & Ténéré', '撒哈拉的沙漠綠洲。', 'Saharan desert and oases.') ] },
  ni: { items: [
    I('landmark', '雙火山島', 'Ometepe', '湖中島的雙火山。', 'A twin-volcano lake island.'),
    I('music', '馬林巴', 'Marimba', '木琴馬林巴樂。', 'Marimba music.') ] },
  nl: { items: [
    I('landmark', '風車與鬱金香', 'Windmills & Tulips', '風車與鬱金香花田。', 'Windmills and tulip fields.'),
    I('craft', '台夫特藍陶', 'Delftware', '藍白的台夫特陶。', 'Blue-and-white Delft pottery.'),
    I('festival', '國王節', 'Kings Day', '橙色狂歡的國王節。', 'The orange-clad King festival.') ] },
  no: { items: [
    I('landmark', '峽灣', 'Fjords', '壯麗的挪威峽灣。', 'Majestic Norwegian fjords.'),
    I('myth', '北歐神話', 'Norse Mythology', '維京人的北歐神話。', 'Viking Norse mythology.'),
    I('craft', '木板教堂', 'Stave Churches', '中世紀的木板教堂。', 'Medieval wooden stave churches.') ] },
  np: { items: [
    I('landmark', '聖母峰', 'Mount Everest', '世界最高的山峰。', 'The highest mountain on Earth.'),
    I('landmark', '加德滿都谷地', 'Kathmandu Valley', '古老的印度教與佛教神廟。', 'Ancient Hindu and Buddhist temples.'),
    I('festival', '德賽與燈節', 'Dashain & Tihar', '最大的印度教節慶。', 'The biggest Hindu festivals.') ] },
  nr: { items: [
    I('landmark', '磷礦島', 'Phosphate Island', '磷礦地貌的島國。', 'A phosphate-mined island.'),
    I('craft', '馴養軍艦鳥', 'Frigatebird', '馴養軍艦鳥的傳統。', 'A tradition of taming frigatebirds.') ] },
  om: { items: [
    I('landmark', '蘇丹大清真寺', 'Grand Mosque', '馬斯喀特的大清真寺。', 'The Muscat grand mosque.'),
    I('craft', '乳香', 'Frankincense', '古代的乳香之路。', 'The ancient frankincense trade.'),
    I('cuisine', '地坑燜羊肉', 'Shuwa', '地坑慢烤的羊肉。', 'Pit-roasted lamb.') ] },
  pa: { items: [
    I('landmark', '巴拿馬運河', 'Panama Canal', '連接兩洋的運河。', 'The canal linking two oceans.'),
    I('craft', '庫納莫拉布', 'Mola', '庫納族的拼布藝術。', 'Kuna reverse-applique cloth.'),
    I('music', '坦博里托', 'Tamborito', '鼓樂的民族舞。', 'The national drum dance.') ] },
  pg: { items: [
    I('festival', '高地歌舞節', 'Sing-sing', '部族羽飾的歌舞節。', 'A tribal feather sing-sing.'),
    I('craft', '塞皮克木雕', 'Sepik Carving', '塞皮克河的木雕。', 'Sepik River carving.') ] },
  ph: { items: [
    I('landmark', '巴拿威梯田', 'Banaue Rice Terraces', '古老的高山梯田。', 'Ancient mountain rice terraces.'),
    I('festival', '聖嬰節', 'Sinulog', '熱鬧的天主教慶典。', 'A lively Catholic fiesta.'),
    I('cuisine', '阿斗波', 'Adobo', '醬燒阿斗波國菜。', 'The national adobo stew.') ] },
  pk: { items: [
    I('landmark', '巴德夏希清真寺', 'Badshahi Mosque', '拉合爾的莫臥兒清真寺。', 'The Mughal mosque of Lahore.'),
    I('music', '卡瓦力', 'Qawwali', '蘇菲靈歌卡瓦力。', 'Sufi qawwali devotional song.'),
    I('craft', '卡車彩繪', 'Truck Art', '繽紛的卡車彩繪。', 'Colorful truck art.') ] },
  pl: { items: [
    I('landmark', '維利奇卡鹽礦', 'Wieliczka', '地下的鹽雕教堂。', 'An underground salt-carved chapel.'),
    I('music', '蕭邦', 'Chopin', '鋼琴詩人蕭邦的故鄉。', 'Home of Chopin.'),
    I('cuisine', '波蘭餃', 'Pierogi', '半月形的波蘭餃。', 'Half-moon dumplings.') ] },
  pt: { items: [
    I('music', '法朵', 'Fado', '憂傷的葡式法朵。', 'The melancholic Portuguese fado.'),
    I('craft', '阿茲勒赫瓷磚', 'Azulejos', '藍白的瓷磚畫。', 'Blue-and-white tile art.'),
    I('cuisine', '蛋塔與鱈魚', 'Pastel de Nata', '葡式蛋塔與鹹鱈魚。', 'Custard tarts and salt cod.') ] },
  pw: { items: [
    I('landmark', '水母湖', 'Jellyfish Lake', '無毒水母之湖。', 'A lake of stingless jellyfish.'),
    I('craft', '故事板雕刻', 'Storyboards', '敘事的木雕板。', 'Narrative carved storyboards.') ] },
  py: { items: [
    I('craft', '蛛網蕾絲', 'Ñandutí', '細緻的蛛網蕾絲。', 'Delicate spiderweb lace.'),
    I('music', '巴拉圭豎琴', 'Harp', '巴拉圭的民族豎琴。', 'The Paraguayan harp.'),
    I('cuisine', '冰瑪黛茶', 'Tereré', '冰涼的瑪黛茶。', 'Cold yerba-mate tereré.') ] },
  qa: { items: [
    I('landmark', '伊斯蘭藝術博物館', 'Museum of Islamic Art', '杜哈的現代博物館。', 'A modern Doha museum.'),
    I('craft', '獵鷹與木帆船', 'Falconry & Dhow', '獵鷹與木帆船傳統。', 'Falconry and dhow traditions.') ] },
  ro: { items: [
    I('myth', '布蘭城堡', 'Bran Castle', '德古拉傳說的城堡。', 'The Dracula-legend castle.'),
    I('craft', '彩繪修道院', 'Painted Monasteries', '壁畫的修道院。', 'Fresco-painted monasteries.'),
    I('music', '排笛', 'Pan Flute', '羅馬尼亞的排笛。', 'The Romanian pan flute.') ] },
  rs: { items: [
    I('music', '古查銅管樂', 'Guča Trumpet', '古查的銅管樂節。', 'The Guča brass festival.'),
    I('festival', '斯拉瓦', 'Slava', '家族守護聖人節。', 'A family patron-saint feast.'),
    I('cuisine', '烤肉與李子酒', 'Rakija', '烤肉與李子白蘭地。', 'Grilled meat and plum brandy.') ] },
  rw: { items: [
    I('landmark', '火山國家公園', 'Volcanoes NP', '山地大猩猩之鄉。', 'Home of mountain gorillas.'),
    I('music', '英托雷舞', 'Intore Dance', '武士的英托雷舞。', 'The warrior intore dance.'),
    I('craft', '伊米貢戈', 'Imigongo', '幾何牛糞畫。', 'Geometric cow-dung art.') ] },
  sb: { items: [
    I('music', '排笛樂團', 'Panpipes', '竹排笛的合奏。', 'Bamboo panpipe ensembles.'),
    I('craft', '貝殼貨幣', 'Shell Money', '傳統的貝殼錢。', 'Traditional shell money.') ] },
  sc: { items: [
    I('landmark', '海椰子', 'Coco de Mer', '巨大的海椰子。', 'The giant coco de mer nut.'),
    I('music', '莫蒂亞舞', 'Moutya', '克里奧爾的鼓舞。', 'A Creole drum dance.') ] },
  sd: { items: [
    I('landmark', '麥羅埃金字塔', 'Meroë Pyramids', '努比亞的金字塔群。', 'Nubian pyramids.'),
    I('music', '蘇丹民謠', 'Sudanese Folk', '蘇丹的民謠樂。', 'Sudanese folk music.') ] },
  sg: { zh: '新加坡', items: [
    I('landmark', '魚尾獅與濱海灣', 'Merlion & Marina Bay', '魚尾獅與超級樹。', 'The Merlion and the supertrees.'),
    I('cuisine', '小販中心美食', 'Hawker Food', '多元的小販中心美食。', 'Multicultural hawker food.'),
    I('festival', '多元族群節慶', 'Festivals', '華印馬的多元慶典。', 'Chinese, Indian and Malay festivals.') ] },
  si: { items: [
    I('landmark', '布萊德湖', 'Lake Bled', '湖中島的教堂。', 'An island church on a lake.'),
    I('landmark', '波斯托伊納洞', 'Postojna Cave', '壯觀的鐘乳石洞。', 'A spectacular karst cave.'),
    I('craft', '彩繪蜂箱', 'Beekeeping', '彩繪蜂箱的傳統。', 'Painted beehive panels.') ] },
  sk: { items: [
    I('landmark', '斯皮什城堡', 'Spiš Castle', '中歐最大的城堡之一。', 'One of the largest castles in Central Europe.'),
    I('music', '法雅卡笛', 'Fujara', '巨型的牧羊笛。', 'A giant shepherd flute.'),
    I('craft', '木造教堂', 'Wooden Churches', '喀爾巴阡的木教堂。', 'Carpathian wooden churches.') ] },
  sl: { items: [
    I('craft', '邦杜面具', 'Bundu Mask', '女性社團的木面具。', 'A women-society wooden mask.'),
    I('music', '馬靈格樂', 'Maringa', '棕櫚酒音樂馬靈格。', 'Palm-wine maringa music.') ] },
  sm: { items: [
    I('landmark', '三塔', 'Three Towers', '山頂的三座古塔。', 'Three towers atop the mountain.'),
    I('festival', '中世紀節', 'Medieval Days', '弩弓與中世紀慶典。', 'Crossbow and medieval festivities.') ] },
  sn: { items: [
    I('music', '姆巴拉克斯', 'Mbalax', '塞內加爾流行樂。', 'Senegalese mbalax pop.'),
    I('landmark', '戈雷島', 'Gorée Island', '奴隸貿易史的島嶼。', 'A slave-trade-history island.'),
    I('craft', '彩色沙畫', 'Sand Art', '彩色沙畫工藝。', 'Colored-sand art.') ] },
  so: { items: [
    I('music', '索馬利詩歌', 'Poetry', '口傳詩歌之國。', 'A nation of oral poetry.'),
    I('cuisine', '駱駝奶與香飯', 'Camel Milk', '駱駝奶與香料飯。', 'Camel milk and spiced rice.') ] },
  sr: { items: [
    I('cuisine', '多元料理', 'Roti & Pom', '印度薄餅與荷裔燉菜。', 'Indian roti and Creole pom.'),
    I('festival', '排燈與荷麗節', 'Diwali & Holi', '多族群的印度教慶典。', 'Multi-ethnic Hindu festivals.') ] },
  ss: { items: [
    I('craft', '牛群文化', 'Cattle Culture', '丁卡族的牛群文化。', 'The Dinka cattle culture.'),
    I('music', '部族歌舞', 'Tribal Dance', '部族的傳統歌舞。', 'Tribal song and dance.') ] },
  st: { items: [
    I('cuisine', '可可', 'Cocoa', '巧克力島的可可。', 'The cocoa of the chocolate islands.'),
    I('music', '烏蘇阿舞', 'Ússua', '葡非融合的舞樂。', 'Afro-Portuguese dance music.') ] },
  sv: { items: [
    I('landmark', '霍亞德塞倫', 'Joya de Cerén', '火山灰下的馬雅村。', 'A Maya village under ash.'),
    I('cuisine', '普普薩', 'Pupusa', '玉米餡餅國菜。', 'The national stuffed corn cake.') ] },
  sy: { items: [
    I('landmark', '帕米拉古城', 'Palmyra', '沙漠中的古羅馬城。', 'An ancient desert Roman city.'),
    I('landmark', '大馬士革老城', 'Old Damascus', '世界最古老的都城之一。', 'One of the oldest cities in the world.'),
    I('craft', '大馬士革錦緞', 'Damask', '大馬士革鋼與錦緞。', 'Damascus steel and brocade.') ] },
  sz: { items: [
    I('festival', '蘆葦節', 'Umhlanga', '少女的蘆葦舞節。', 'The reed-dance maiden festival.'),
    I('festival', '因克瓦拉節', 'Incwala', '王室的豐年祭。', 'The royal first-fruits ceremony.') ] },
  td: { items: [
    I('landmark', '恩內迪高原', 'Ennedi', '撒哈拉的岩拱與岩畫。', 'Saharan rock arches and art.'),
    I('music', '查德民謠', 'Chadian Folk', '查德的民謠樂。', 'Chadian folk music.') ] },
  tg: { items: [
    I('myth', '巫毒信仰', 'Vodun', '巫毒信仰之地。', 'A land of Vodun belief.'),
    I('landmark', '塔姆貝瑪泥堡', 'Koutammakou', '塔貝瑪族的泥造堡屋。', 'Tammari mud tower-houses.') ] },
  tj: { items: [
    I('landmark', '帕米爾高原', 'Pamir Mountains', '世界屋脊帕米爾。', 'The Pamir roof of the world.'),
    I('music', '沙什木卡姆', 'Shashmaqam', '古典的沙什木卡姆。', 'Classical shashmaqam.'),
    I('festival', '諾魯茲', 'Nowruz', '波斯的春分新年。', 'The Persian spring new year.') ] },
  tl: { items: [
    I('craft', '塔伊斯織布', 'Tais', '手織的塔伊斯布。', 'Handwoven tais cloth.'),
    I('landmark', '基督像', 'Cristo Rei', '山頂基督像與海岸。', 'A hilltop Christ statue and reefs.') ] },
  tm: { items: [
    I('craft', '土庫曼地毯', 'Carpets', '紅色的土庫曼地毯。', 'Red Turkmen carpets.'),
    I('landmark', '地獄之門', 'Darvaza', '燃燒的天然氣坑。', 'A burning gas crater.'),
    I('myth', '汗血馬', 'Akhal-Teke', '金色駿馬的文化。', 'The golden horse culture.') ] },
  tn: { items: [
    I('landmark', '迦太基遺址', 'Carthage', '古迦太基城的遺址。', 'Ancient Carthage ruins.'),
    I('landmark', '突尼斯麥地那', 'Medina', '鄂圖曼老城的市集。', 'An old-town souk.'),
    I('craft', '羅馬馬賽克', 'Mosaics', '羅馬馬賽克工藝。', 'Roman mosaic art.') ] },
  to: { items: [
    I('craft', '樹皮布', 'Ngatu', '樹皮捶製的布。', 'Beaten bark cloth.'),
    I('music', '拉卡拉卡舞', 'Lakalaka', '敘事歌舞拉卡拉卡。', 'The narrative lakalaka dance.') ] },
  tt: { items: [
    I('music', '鋼鼓', 'Steelpan', '鋼鼓的發源地。', 'The birthplace of steelpan.'),
    I('festival', '千里達嘉年華', 'Carnival', '加勒比最大的嘉年華。', 'The biggest Caribbean carnival.'),
    I('cuisine', '咖哩雙餅', 'Doubles', '鷹嘴豆咖哩街食。', 'A chickpea-curry street food.') ] },
  tv: { items: [
    I('music', '法泰勒舞', 'Fatele', '群唱拍擊的法泰勒。', 'A group song-and-clap dance.'),
    I('landmark', '環礁島國', 'Atolls', '低平的環礁島國。', 'A low-lying atoll nation.') ] },
  tz: { items: [
    I('landmark', '吉力馬札羅山', 'Kilimanjaro', '非洲最高的山峰。', 'The highest peak in Africa.'),
    I('music', '塔阿拉布', 'Taarab', '桑吉巴的塔阿拉布樂。', 'Zanzibar taarab music.'),
    I('landmark', '塞倫蓋蒂', 'Serengeti', '動物大遷徙的草原。', 'The great-migration savanna.') ] },
  ua: { items: [
    I('craft', '彩蛋與刺繡', 'Pysanka', '蠟染彩蛋與刺繡。', 'Wax-dyed eggs and embroidery.'),
    I('cuisine', '羅宋湯', 'Borscht', '甜菜羅宋湯。', 'Beet borscht soup.'),
    I('music', '班杜拉琴', 'Bandura', '多弦的班杜拉琴。', 'The many-string bandura.') ] },
  ug: { items: [
    I('landmark', '布溫迪森林', 'Bwindi', '山地大猩猩的棲地。', 'Mountain-gorilla forest.'),
    I('landmark', '尼羅河源', 'Source of the Nile', '白尼羅河的源頭。', 'The source of the White Nile.'),
    I('music', '阿東古琴', 'Adungu', '弓形的豎琴阿東古。', 'The arched adungu harp.') ] },
  uy: { items: [
    I('music', '坎東貝鼓', 'Candombe', '非裔的坎東貝鼓樂。', 'Afro-Uruguayan candombe drumming.'),
    I('cuisine', '烤肉與瑪黛茶', 'Asado & Mate', '炭烤肉與瑪黛茶。', 'Grilled asado and yerba mate.'),
    I('festival', '烏拉圭狂歡節', 'Carnival', '世界最長的狂歡節。', 'The longest carnival in the world.') ] },
  uz: { items: [
    I('landmark', '撒馬爾罕', 'Samarkand', '絲路的藍頂之城。', 'The blue-domed Silk Road city.'),
    I('craft', '蘇札尼刺繡', 'Suzani', '刺繡的蘇札尼織品。', 'Embroidered suzani textiles.'),
    I('cuisine', '手抓飯', 'Plov', '烏茲別克的手抓飯。', 'Uzbek plov rice.') ] },
  vc: { items: [
    I('festival', '文森嘉年華', 'Vincy Mas', '熱鬧的夏季嘉年華。', 'A lively summer carnival.'),
    I('landmark', '蘇弗里耶爾火山', 'La Soufrière', '活火山地標。', 'An active volcano.') ] },
  ve: { items: [
    I('landmark', '安赫爾瀑布', 'Angel Falls', '世界最高的瀑布。', 'The highest waterfall on Earth.'),
    I('music', '約羅波', 'Joropo', '平原的約羅波舞曲。', 'The plains joropo music.'),
    I('cuisine', '玉米餅', 'Arepa', '玉米餅國民美食。', 'The national corn-cake arepa.') ] },
  vu: { items: [
    I('festival', '陸地跳水', 'Land Diving', '藤蔓跳塔的成年禮。', 'The vine land-diving ritual.'),
    I('music', '敘事沙畫', 'Sand Drawing', '敘事的沙畫藝術。', 'Narrative sand drawing.') ] },
  ws: { items: [
    I('craft', '薩摩亞紋身', 'Tatau', '傳統的薩摩亞紋身。', 'Traditional Samoan tattoo.'),
    I('music', '希瓦舞', 'Siva', '優雅的薩摩亞舞。', 'The graceful Samoan siva.'),
    I('festival', '火刀舞', 'Fire Knife', '火刀表演舞。', 'The fire-knife dance.') ] },
  ye: { items: [
    I('landmark', '希巴姆古城', 'Shibam', '沙漠中的泥造摩天樓。', 'Mud-brick desert skyscrapers.'),
    I('landmark', '索科特拉島', 'Socotra', '龍血樹的奇異之島。', 'An island of dragon-blood trees.'),
    I('craft', '賈比亞短劍', 'Jambiya', '傳統的彎刃短劍。', 'A traditional curved dagger.') ] },
  zm: { items: [
    I('landmark', '維多利亞瀑布', 'Victoria Falls', '雷霆般的大瀑布。', 'The thundering great waterfall.'),
    I('festival', '庫翁博卡', 'Kuomboka', '洛茲王族的遷移節。', 'The Lozi royal migration festival.') ] },
  zw: { items: [
    I('landmark', '大辛巴威遺址', 'Great Zimbabwe', '古代的石城遺址。', 'An ancient stone-city ruin.'),
    I('music', '姆比拉琴', 'Mbira', '拇指琴姆比拉。', 'The mbira thumb piano.'),
    I('craft', '紹納石雕', 'Shona Sculpture', '紹納族的石雕。', 'Shona stone sculpture.') ] }
};

// Hand-written guides in the country's OWN language, keyed by marker id ({id}-0 hero,
// {id}-N items). Spoken in that language on click and shown on the card. Curated set of
// countries whose language has a common TTS voice and accurate text. Extend freely.
export const NATIVE_GUIDE = {
  // 日本語
  'jp-0': '日本へようこそ。伝統と自然が息づく国です。',
  'jp-1': '和紙と茶道。和紙の工芸と侘び寂びの茶の湯。',
  'jp-2': '桜の季節。春に桜を愛でる、もののあはれ。',
  'jp-3': '神道と鳥居。八百万の神と朱色の鳥居。',
  // 한국어
  'kr-0': '한국에 오신 것을 환영합니다.',
  'kr-1': '한복과 한옥. 우아한 한복과 목조 한옥.',
  'kr-2': '판소리. 판소리 창과 사물놀이.',
  'kr-3': '김치. 김치와 발효 문화.',
  // Deutsch
  'de-0': 'Willkommen in Deutschland.',
  'de-1': 'Das Oktoberfest. Das größte Volksfest der Welt.',
  'de-2': 'Klassische Meister. Die Tradition von Bach und Beethoven.',
  // Français
  'fr-0': 'Bienvenue en France.',
  'fr-1': 'La tour Eiffel. Le monument de fer de Paris.',
  'fr-2': 'La cuisine française. Le pain, le fromage et le vin.',
  'fr-3': 'La chanson. L’accordéon dans les rues de Paris.',
  // Español
  'es-0': 'Bienvenido a España.',
  'es-1': 'El flamenco. Guitarra, taconeo y palmas.',
  'es-2': 'La Tomatina. La fiesta de los tomates.',
  // Italiano
  'it-0': 'Benvenuti in Italia.',
  'it-1': 'Il Colosseo. L’anfiteatro dell’antica Roma.',
  'it-2': 'Pizza e pasta. La patria della pizza e della pasta.',
  'it-3': 'Opera e Rinascimento. L’opera e l’arte rinascimentale.',
  // Русский
  'ru-0': 'Добро пожаловать в Россию.',
  'ru-1': 'Собор Василия Блаженного. Купола на Красной площади.',
  'ru-2': 'Матрёшка. Деревянные вложенные куклы.',
  // Português (Portugal / Brasil)
  'pt-0': 'Bem-vindo a Portugal.',
  'pt-1': 'O fado. A canção melancólica portuguesa.',
  'pt-2': 'Os azulejos. Azulejos azuis e brancos.',
  'pt-3': 'Pastéis de nata. Pastéis de nata e bacalhau.',
  'br-0': 'Bem-vindo ao Brasil.',
  'br-1': 'O Carnaval do Rio. Desfiles de samba.',
  'br-2': 'Samba e bossa nova. O ritmo do samba e a bossa nova.',
  // Nederlands
  'nl-0': 'Welkom in Nederland.',
  'nl-1': 'Molens en tulpen. Windmolens en tulpenvelden.',
  'nl-2': 'Delfts blauw. Blauw-wit aardewerk.',
  'nl-3': 'Koningsdag. Het oranje feest.'
};
