"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POETRY_CORPUS_META = exports.POEMS = exports.POETS = void 0;
exports.POETS = [
    {
        id: 'qu-yuan',
        name: '屈原',
        dynasty: '先秦',
        courtesyName: '原',
        bio: '楚國詩人與政治家，以瑰麗想像、香草美人與深沉家國之思開拓楚辭傳統。',
        themes: ['家國', '求索', '香草', '忠貞'],
        styles: ['楚辭', '浪漫', '瑰麗'],
        poemCount: 25,
        featuredPoemIds: ['li-sao-excerpt'],
        relations: [{ poetId: 'li-bai', kind: '風格', reason: '李白承續楚辭的浪漫想像與求索精神', weight: 0.78 }]
    },
    {
        id: 'cao-cao',
        name: '曹操',
        dynasty: '漢',
        courtesyName: '孟德',
        bio: '建安文學代表人物，詩風古直悲涼，常以短歌書寫亂世、功業與生命無常。',
        themes: ['功業', '生命', '亂世', '求賢'],
        styles: ['建安風骨', '慷慨', '古直'],
        poemCount: 20,
        featuredPoemIds: ['short-song-style'],
        relations: [{ poetId: 'tao-yuanming', kind: '同時代', reason: '同屬魏晉前後文學轉折的重要座標', weight: 0.55 }]
    },
    {
        id: 'tao-yuanming',
        name: '陶淵明',
        dynasty: '魏晉',
        courtesyName: '元亮',
        sobriquet: '五柳先生',
        born: 365,
        died: 427,
        bio: '田園詩派的重要源頭，以平淡自然的語言書寫歸隱、飲酒與日常生命。',
        themes: ['田園', '歸隱', '飲酒', '自然'],
        styles: ['平淡', '自然', '真淳'],
        poemCount: 125,
        featuredPoemIds: ['drinking-five'],
        relations: [
            { poetId: 'wang-wei', kind: '風格', reason: '王維的山水田園詩承續其自然淡遠的精神', weight: 0.8 },
            { poetId: 'meng-haoran', kind: '風格', reason: '孟浩然同以田園與日常景物入詩', weight: 0.72 }
        ]
    },
    {
        id: 'zhang-jiuling',
        name: '張九齡',
        dynasty: '唐',
        courtesyName: '子壽',
        born: 678,
        died: 740,
        bio: '盛唐名相與詩人，詩風清澹雅正，以望月懷遠最為人熟知。',
        themes: ['月夜', '懷人', '山水'],
        styles: ['清澹', '雅正'],
        poemCount: 220,
        featuredPoemIds: ['moon-over-sea'],
        relations: [{ poetId: 'meng-haoran', kind: '同時代', reason: '同為盛唐清雅詩風的重要作者', weight: 0.62 }]
    },
    {
        id: 'meng-haoran',
        name: '孟浩然',
        dynasty: '唐',
        courtesyName: '浩然',
        born: 689,
        died: 740,
        bio: '盛唐山水田園詩人，善寫清晨、春雨、江山與隱逸生活。',
        themes: ['山水', '田園', '春日', '隱逸'],
        styles: ['清淡', '自然', '疏朗'],
        poemCount: 267,
        featuredPoemIds: ['spring-dawn'],
        relations: [
            { poetId: 'li-bai', kind: '交遊', reason: '李白敬重孟浩然，留下「吾愛孟夫子」等贈詩', weight: 0.94 },
            { poetId: 'wang-wei', kind: '風格', reason: '並稱王孟，同為盛唐山水田園詩代表', weight: 0.95 }
        ]
    },
    {
        id: 'wang-wei',
        name: '王維',
        dynasty: '唐',
        courtesyName: '摩詰',
        born: 701,
        died: 761,
        bio: '盛唐詩人、畫家，以空山、明月、松泉構成詩中有畫的靜謐境界。',
        themes: ['山水', '禪意', '月夜', '送別'],
        styles: ['空靈', '清寂', '詩畫'],
        poemCount: 407,
        featuredPoemIds: ['deer-enclosure', 'mountain-autumn-evening'],
        relations: [
            { poetId: 'li-bai', kind: '同時代', reason: '同為盛唐詩壇核心人物，分別開展空靈與浪漫向度', weight: 0.72 },
            { poetId: 'du-fu', kind: '同時代', reason: '共同見證盛唐至亂世的時代轉折', weight: 0.66 }
        ]
    },
    {
        id: 'li-bai',
        name: '李白',
        dynasty: '唐',
        courtesyName: '太白',
        sobriquet: '青蓮居士',
        born: 701,
        died: 762,
        bio: '盛唐浪漫主義詩人，以月、酒、山河與自由想像建立奔放瑰奇的詩歌宇宙。',
        themes: ['月夜', '思鄉', '山水', '飲酒', '送別'],
        styles: ['浪漫', '豪放', '飄逸'],
        poemCount: 1166,
        featuredPoemIds: ['quiet-night-thought', 'early-baidi', 'yellow-crane-farewell'],
        relations: [
            { poetId: 'du-fu', kind: '交遊', reason: '盛唐詩壇最著名的相知交遊，杜甫多次作詩懷念李白', weight: 1 },
            { poetId: 'wang-changling', kind: '交遊', reason: '以詩相贈，明月意象連結兩人的友情', weight: 0.88 }
        ]
    },
    {
        id: 'du-fu',
        name: '杜甫',
        dynasty: '唐',
        courtesyName: '子美',
        sobriquet: '少陵野老',
        born: 712,
        died: 770,
        bio: '唐代現實主義詩人，以沉鬱頓挫之筆記錄戰亂、民生、家國與個人漂泊。',
        themes: ['家國', '戰亂', '百姓', '漂泊', '春日'],
        styles: ['沉鬱', '頓挫', '寫實'],
        poemCount: 1458,
        featuredPoemIds: ['spring-view', 'spring-night-rain'],
        relations: [
            { poetId: 'bai-juyi', kind: '風格', reason: '白居易承續以詩關切現實與民生的傳統', weight: 0.8 },
            { poetId: 'lu-you', kind: '風格', reason: '陸游的家國書寫與杜詩精神遙相呼應', weight: 0.76 }
        ]
    },
    {
        id: 'wang-changling',
        name: '王昌齡',
        dynasty: '唐',
        courtesyName: '少伯',
        born: 698,
        died: 757,
        bio: '盛唐邊塞詩人，有「七絕聖手」之稱，作品明快凝練而情境深遠。',
        themes: ['邊塞', '送別', '月夜', '友情'],
        styles: ['凝練', '雄渾', '含蓄'],
        poemCount: 181,
        featuredPoemIds: ['frontier-one', 'lotus-inn-farewell'],
        relations: [{ poetId: 'du-mu', kind: '風格', reason: '兩人皆擅長以七絕凝聚歷史與邊塞情境', weight: 0.66 }]
    },
    {
        id: 'bai-juyi',
        name: '白居易',
        dynasty: '唐',
        courtesyName: '樂天',
        sobriquet: '香山居士',
        born: 772,
        died: 846,
        bio: '中唐詩人，主張文章合為時而著，語言平易，兼具諷諭與深情敘事。',
        themes: ['民生', '愛情', '離別', '草木'],
        styles: ['平易', '敘事', '諷諭'],
        poemCount: 2838,
        featuredPoemIds: ['grass'],
        relations: [
            { poetId: 'liu-yuxi', kind: '唱和', reason: '晚年頻繁唱和，並稱劉白', weight: 0.95 },
            { poetId: 'su-shi', kind: '風格', reason: '皆以通俗明朗語言拓展詩文的日常性', weight: 0.62 }
        ]
    },
    {
        id: 'liu-yuxi',
        name: '劉禹錫',
        dynasty: '唐',
        courtesyName: '夢得',
        born: 772,
        died: 842,
        bio: '中唐詩人，風格豪健清新，善於從歷史興亡與民歌傳統中提煉新意。',
        themes: ['懷古', '秋日', '民歌', '哲思'],
        styles: ['豪健', '清新', '明快'],
        poemCount: 800,
        featuredPoemIds: ['autumn-poem'],
        relations: [{ poetId: 'du-mu', kind: '風格', reason: '皆善於以精煉詩句書寫歷史興亡', weight: 0.7 }]
    },
    {
        id: 'du-mu',
        name: '杜牧',
        dynasty: '唐',
        courtesyName: '牧之',
        born: 803,
        died: 852,
        bio: '晚唐詩人，以俊爽七絕著稱，常在明麗景物中寄寓歷史感與盛衰之思。',
        themes: ['懷古', '秋日', '江南', '離別'],
        styles: ['俊爽', '明麗', '警策'],
        poemCount: 531,
        featuredPoemIds: ['mountain-travel', 'qingming'],
        relations: [{ poetId: 'li-shangyin', kind: '同時代', reason: '並稱小李杜，共同構成晚唐詩歌雙峰', weight: 0.96 }]
    },
    {
        id: 'li-shangyin',
        name: '李商隱',
        dynasty: '唐',
        courtesyName: '義山',
        born: 813,
        died: 858,
        bio: '晚唐詩人，詩境幽微綿密，擅長以象徵、典故與朦朧情感書寫無題詩。',
        themes: ['愛情', '身世', '夜雨', '懷古'],
        styles: ['朦朧', '綺麗', '含蓄'],
        poemCount: 616,
        featuredPoemIds: ['night-rain-north'],
        relations: [{ poetId: 'li-qingzhao', kind: '風格', reason: '兩人的情感書寫都細膩含蓄，善用夜雨與花月意象', weight: 0.66 }]
    },
    {
        id: 'su-shi',
        name: '蘇軾',
        dynasty: '宋',
        courtesyName: '子瞻',
        sobriquet: '東坡居士',
        born: 1037,
        died: 1101,
        bio: '北宋文學家，以曠達胸襟拓展詞境，作品涵蓋月夜、江山、人生與親情。',
        themes: ['月夜', '人生', '山水', '親情', '曠達'],
        styles: ['豪放', '曠達', '哲思'],
        poemCount: 3460,
        featuredPoemIds: ['water-tune', 'red-cliff'],
        relations: [
            { poetId: 'xin-qiji', kind: '風格', reason: '並列豪放詞代表，皆拓展詞的題材與氣象', weight: 0.98 },
            { poetId: 'li-qingzhao', kind: '同時代', reason: '共同奠定宋詞最具辨識度的兩種抒情方向', weight: 0.74 }
        ]
    },
    {
        id: 'li-qingzhao',
        name: '李清照',
        dynasty: '宋',
        sobriquet: '易安居士',
        born: 1084,
        died: 1155,
        bio: '宋代女詞人，語言清麗精準，前期明快，南渡後轉為深沉的離亂與懷舊。',
        themes: ['離愁', '花', '酒', '懷舊', '春日'],
        styles: ['婉約', '清麗', '細膩'],
        poemCount: 90,
        featuredPoemIds: ['slow-slow-song', 'dream-order'],
        relations: [{ poetId: 'lu-you', kind: '同時代', reason: '共同經歷南渡時代，作品皆留下離亂與故國記憶', weight: 0.68 }]
    },
    {
        id: 'xin-qiji',
        name: '辛棄疾',
        dynasty: '宋',
        courtesyName: '幼安',
        sobriquet: '稼軒',
        born: 1140,
        died: 1207,
        bio: '南宋豪放派詞人，以恢宏筆力書寫家國、抗金理想與田園生活。',
        themes: ['家國', '戰事', '田園', '壯志'],
        styles: ['豪放', '沉雄', '用典'],
        poemCount: 629,
        featuredPoemIds: ['blue-jade-case'],
        relations: [{ poetId: 'lu-you', kind: '同時代', reason: '同以恢復中原與家國志業為終身關懷', weight: 0.94 }]
    },
    {
        id: 'lu-you',
        name: '陸游',
        dynasty: '宋',
        courtesyName: '務觀',
        sobriquet: '放翁',
        born: 1125,
        died: 1210,
        bio: '南宋詩人，作品數量龐大，家國壯志與日常生活並存，風格真切雄健。',
        themes: ['家國', '夢', '鄉村', '梅花'],
        styles: ['雄健', '真切', '悲壯'],
        poemCount: 9300,
        featuredPoemIds: ['november-storm'],
        relations: [{ poetId: 'gong-zizhen', kind: '風格', reason: '龔自珍承續以詩介入時代與改革的家國精神', weight: 0.74 }]
    },
    {
        id: 'ma-zhiyuan',
        name: '馬致遠',
        dynasty: '元',
        courtesyName: '千里',
        sobriquet: '東籬',
        born: 1250,
        died: 1321,
        bio: '元代散曲家，以高度凝鍊的意象組合書寫秋思與天涯漂泊。',
        themes: ['秋日', '漂泊', '黃昏', '思鄉'],
        styles: ['凝鍊', '蒼涼', '畫面感'],
        poemCount: 130,
        featuredPoemIds: ['autumn-thoughts'],
        relations: [{ poetId: 'nalan-xingde', kind: '意象', reason: '同以秋夜、旅途與鄉愁構成蒼涼抒情', weight: 0.7 }]
    },
    {
        id: 'nalan-xingde',
        name: '納蘭性德',
        dynasty: '清',
        courtesyName: '容若',
        born: 1655,
        died: 1685,
        bio: '清初詞人，詞風清麗哀感，善寫悼亡、羈旅、雪夜與人世無常。',
        themes: ['悼亡', '羈旅', '雪夜', '離愁'],
        styles: ['清麗', '哀感', '真率'],
        poemCount: 348,
        featuredPoemIds: ['long-acacia'],
        relations: [{ poetId: 'li-qingzhao', kind: '風格', reason: '詞風同樣重視真情與精微感受', weight: 0.74 }]
    },
    {
        id: 'gong-zizhen',
        name: '龔自珍',
        dynasty: '清',
        courtesyName: '璱人',
        born: 1792,
        died: 1841,
        bio: '晚清思想家與詩人，以奇崛語言書寫改革理想、人才與時代轉型。',
        themes: ['改革', '人才', '落花', '家國'],
        styles: ['奇崛', '議論', '浪漫'],
        poemCount: 600,
        featuredPoemIds: ['misc-poems-220'],
        relations: [{ poetId: 'qu-yuan', kind: '風格', reason: '同具強烈求索精神與以詩承擔時代的自覺', weight: 0.64 }]
    }
];
exports.POEMS = [
    {
        id: 'li-sao-excerpt',
        title: '離騷（節選）',
        poetId: 'qu-yuan',
        dynasty: '先秦',
        form: '古體',
        content: ['路漫漫其修遠兮，吾將上下而求索。'],
        themes: ['求索', '忠貞'],
        imagery: ['長路', '天地']
    },
    {
        id: 'short-song-style',
        title: '短歌行',
        poetId: 'cao-cao',
        dynasty: '漢',
        form: '樂府',
        content: ['對酒當歌，人生幾何。', '譬如朝露，去日苦多。', '山不厭高，海不厭深。', '周公吐哺，天下歸心。'],
        themes: ['生命', '求賢', '功業'],
        imagery: ['酒', '朝露', '山海']
    },
    {
        id: 'drinking-five',
        title: '飲酒・其五',
        poetId: 'tao-yuanming',
        dynasty: '魏晉',
        form: '古體',
        content: ['結廬在人境，而無車馬喧。', '問君何能爾？心遠地自偏。', '採菊東籬下，悠然見南山。', '山氣日夕佳，飛鳥相與還。', '此中有真意，欲辨已忘言。'],
        themes: ['歸隱', '田園', '自然'],
        imagery: ['菊', '南山', '飛鳥', '夕陽']
    },
    {
        id: 'moon-over-sea',
        title: '望月懷遠',
        poetId: 'zhang-jiuling',
        dynasty: '唐',
        form: '五律',
        content: ['海上生明月，天涯共此時。', '情人怨遙夜，竟夕起相思。', '滅燭憐光滿，披衣覺露滋。', '不堪盈手贈，還寢夢佳期。'],
        themes: ['懷人', '月夜'],
        imagery: ['海', '明月', '露', '夢']
    },
    {
        id: 'spring-dawn',
        title: '春曉',
        poetId: 'meng-haoran',
        dynasty: '唐',
        form: '五絕',
        content: ['春眠不覺曉，處處聞啼鳥。', '夜來風雨聲，花落知多少。'],
        themes: ['春日', '惜春'],
        imagery: ['啼鳥', '風雨', '落花']
    },
    {
        id: 'deer-enclosure',
        title: '鹿柴',
        poetId: 'wang-wei',
        dynasty: '唐',
        form: '五絕',
        content: ['空山不見人，但聞人語響。', '返景入深林，復照青苔上。'],
        themes: ['山水', '禪意'],
        imagery: ['空山', '深林', '青苔', '夕光']
    },
    {
        id: 'mountain-autumn-evening',
        title: '山居秋暝',
        poetId: 'wang-wei',
        dynasty: '唐',
        form: '五律',
        content: ['空山新雨後，天氣晚來秋。', '明月松間照，清泉石上流。', '竹喧歸浣女，蓮動下漁舟。', '隨意春芳歇，王孫自可留。'],
        themes: ['山水', '秋日', '禪意'],
        imagery: ['空山', '新雨', '明月', '松', '清泉']
    },
    {
        id: 'quiet-night-thought',
        title: '靜夜思',
        poetId: 'li-bai',
        dynasty: '唐',
        form: '五絕',
        content: ['床前明月光，疑是地上霜。', '舉頭望明月，低頭思故鄉。'],
        themes: ['思鄉', '月夜'],
        imagery: ['月', '夜', '霜', '故鄉']
    },
    {
        id: 'early-baidi',
        title: '早發白帝城',
        poetId: 'li-bai',
        dynasty: '唐',
        form: '七絕',
        content: ['朝辭白帝彩雲間，千里江陵一日還。', '兩岸猿聲啼不住，輕舟已過萬重山。'],
        themes: ['山水', '旅途', '自由'],
        imagery: ['彩雲', '江', '猿聲', '輕舟', '群山']
    },
    {
        id: 'yellow-crane-farewell',
        title: '黃鶴樓送孟浩然之廣陵',
        poetId: 'li-bai',
        dynasty: '唐',
        form: '七絕',
        content: ['故人西辭黃鶴樓，煙花三月下揚州。', '孤帆遠影碧空盡，唯見長江天際流。'],
        themes: ['送別', '友情', '春日'],
        imagery: ['黃鶴樓', '煙花', '孤帆', '長江']
    },
    {
        id: 'spring-view',
        title: '春望',
        poetId: 'du-fu',
        dynasty: '唐',
        form: '五律',
        content: ['國破山河在，城春草木深。', '感時花濺淚，恨別鳥驚心。', '烽火連三月，家書抵萬金。', '白頭搔更短，渾欲不勝簪。'],
        themes: ['家國', '戰亂', '離別'],
        imagery: ['山河', '草木', '花', '鳥', '烽火']
    },
    {
        id: 'spring-night-rain',
        title: '春夜喜雨',
        poetId: 'du-fu',
        dynasty: '唐',
        form: '五律',
        content: ['好雨知時節，當春乃發生。', '隨風潛入夜，潤物細無聲。', '野徑雲俱黑，江船火獨明。', '曉看紅濕處，花重錦官城。'],
        themes: ['春日', '自然', '民生'],
        imagery: ['夜雨', '風', '江船', '燈火', '花']
    },
    {
        id: 'frontier-one',
        title: '出塞',
        poetId: 'wang-changling',
        dynasty: '唐',
        form: '七絕',
        content: ['秦時明月漢時關，萬里長征人未還。', '但使龍城飛將在，不教胡馬度陰山。'],
        themes: ['邊塞', '戰事', '家國'],
        imagery: ['明月', '關塞', '長城', '陰山']
    },
    {
        id: 'lotus-inn-farewell',
        title: '芙蓉樓送辛漸',
        poetId: 'wang-changling',
        dynasty: '唐',
        form: '七絕',
        content: ['寒雨連江夜入吳，平明送客楚山孤。', '洛陽親友如相問，一片冰心在玉壺。'],
        themes: ['送別', '友情', '品格'],
        imagery: ['寒雨', '江', '孤山', '冰心', '玉壺']
    },
    {
        id: 'grass',
        title: '賦得古原草送別',
        poetId: 'bai-juyi',
        dynasty: '唐',
        form: '五律',
        content: ['離離原上草，一歲一枯榮。', '野火燒不盡，春風吹又生。', '遠芳侵古道，晴翠接荒城。', '又送王孫去，萋萋滿別情。'],
        themes: ['送別', '生命', '春日'],
        imagery: ['原草', '野火', '春風', '古道']
    },
    {
        id: 'autumn-poem',
        title: '秋詞',
        poetId: 'liu-yuxi',
        dynasty: '唐',
        form: '七絕',
        content: ['自古逢秋悲寂寥，我言秋日勝春朝。', '晴空一鶴排雲上，便引詩情到碧霄。'],
        themes: ['秋日', '哲思', '昂揚'],
        imagery: ['晴空', '白鶴', '雲', '碧霄']
    },
    {
        id: 'mountain-travel',
        title: '山行',
        poetId: 'du-mu',
        dynasty: '唐',
        form: '七絕',
        content: ['遠上寒山石徑斜，白雲生處有人家。', '停車坐愛楓林晚，霜葉紅於二月花。'],
        themes: ['秋日', '山水'],
        imagery: ['寒山', '石徑', '白雲', '楓林', '霜葉']
    },
    {
        id: 'qingming',
        title: '清明',
        poetId: 'du-mu',
        dynasty: '唐',
        form: '七絕',
        content: ['清明時節雨紛紛，路上行人欲斷魂。', '借問酒家何處有？牧童遙指杏花村。'],
        themes: ['清明', '旅途', '鄉村'],
        imagery: ['春雨', '行人', '酒家', '牧童', '杏花']
    },
    {
        id: 'night-rain-north',
        title: '夜雨寄北',
        poetId: 'li-shangyin',
        dynasty: '唐',
        form: '七絕',
        content: ['君問歸期未有期，巴山夜雨漲秋池。', '何當共剪西窗燭，卻話巴山夜雨時。'],
        themes: ['懷人', '離愁', '秋日'],
        imagery: ['巴山', '夜雨', '秋池', '西窗', '燭']
    },
    {
        id: 'water-tune',
        title: '水調歌頭・明月幾時有',
        poetId: 'su-shi',
        dynasty: '宋',
        form: '詞',
        content: ['明月幾時有？把酒問青天。', '不知天上宮闕，今夕是何年。', '人有悲歡離合，月有陰晴圓缺，此事古難全。', '但願人長久，千里共嬋娟。'],
        themes: ['親情', '月夜', '人生', '曠達'],
        imagery: ['明月', '酒', '青天', '宮闕', '嬋娟']
    },
    {
        id: 'red-cliff',
        title: '念奴嬌・赤壁懷古',
        poetId: 'su-shi',
        dynasty: '宋',
        form: '詞',
        content: ['大江東去，浪淘盡，千古風流人物。', '亂石穿空，驚濤拍岸，捲起千堆雪。', '江山如畫，一時多少豪傑。', '人生如夢，一尊還酹江月。'],
        themes: ['懷古', '人生', '曠達'],
        imagery: ['大江', '驚濤', '亂石', '雪浪', '江月']
    },
    {
        id: 'slow-slow-song',
        title: '聲聲慢・尋尋覓覓',
        poetId: 'li-qingzhao',
        dynasty: '宋',
        form: '詞',
        content: ['尋尋覓覓，冷冷清清，淒淒慘慘戚戚。', '梧桐更兼細雨，到黃昏、點點滴滴。', '這次第，怎一個愁字了得！'],
        themes: ['離愁', '懷舊', '秋日'],
        imagery: ['梧桐', '細雨', '黃昏', '酒']
    },
    {
        id: 'dream-order',
        title: '如夢令・常記溪亭日暮',
        poetId: 'li-qingzhao',
        dynasty: '宋',
        form: '詞',
        content: ['常記溪亭日暮，沉醉不知歸路。', '興盡晚回舟，誤入藕花深處。', '爭渡，爭渡，驚起一灘鷗鷺。'],
        themes: ['青春', '遊賞', '自然'],
        imagery: ['溪亭', '日暮', '舟', '藕花', '鷗鷺']
    },
    {
        id: 'blue-jade-case',
        title: '青玉案・元夕',
        poetId: 'xin-qiji',
        dynasty: '宋',
        form: '詞',
        content: ['東風夜放花千樹，更吹落、星如雨。', '寶馬雕車香滿路。', '眾裡尋他千百度。', '驀然回首，那人卻在，燈火闌珊處。'],
        themes: ['元宵', '尋覓', '人生'],
        imagery: ['東風', '花樹', '星雨', '燈火']
    },
    {
        id: 'november-storm',
        title: '十一月四日風雨大作',
        poetId: 'lu-you',
        dynasty: '宋',
        form: '七絕',
        content: ['僵臥孤村不自哀，尚思為國戍輪臺。', '夜闌臥聽風吹雨，鐵馬冰河入夢來。'],
        themes: ['家國', '夢', '戰事'],
        imagery: ['孤村', '風雨', '鐵馬', '冰河', '夢']
    },
    {
        id: 'autumn-thoughts',
        title: '天淨沙・秋思',
        poetId: 'ma-zhiyuan',
        dynasty: '元',
        form: '曲',
        content: ['枯藤老樹昏鴉，小橋流水人家，古道西風瘦馬。', '夕陽西下，斷腸人在天涯。'],
        themes: ['秋日', '漂泊', '思鄉'],
        imagery: ['枯藤', '老樹', '昏鴉', '小橋', '流水', '瘦馬', '夕陽']
    },
    {
        id: 'long-acacia',
        title: '長相思・山一程',
        poetId: 'nalan-xingde',
        dynasty: '清',
        form: '詞',
        content: ['山一程，水一程，身向榆關那畔行，夜深千帳燈。', '風一更，雪一更，聒碎鄉心夢不成，故園無此聲。'],
        themes: ['羈旅', '思鄉', '雪夜'],
        imagery: ['山水', '關塞', '夜燈', '風雪', '故園']
    },
    {
        id: 'misc-poems-220',
        title: '己亥雜詩・其二百二十',
        poetId: 'gong-zizhen',
        dynasty: '清',
        form: '七絕',
        content: ['九州生氣恃風雷，萬馬齊喑究可哀。', '我勸天公重抖擻，不拘一格降人才。'],
        themes: ['改革', '人才', '家國'],
        imagery: ['九州', '風雷', '萬馬', '天公']
    }
];
exports.POETRY_CORPUS_META = {
    bundledPoets: exports.POETS.length,
    bundledPoems: exports.POEMS.length,
    publicSourceName: 'chinese-poetry/chinese-poetry',
    publicSourceUrl: 'https://github.com/chinese-poetry/chinese-poetry',
    expandablePoemCount: 337000
};
