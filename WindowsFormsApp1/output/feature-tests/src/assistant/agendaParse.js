"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseAgenda = parseAgenda;
const pad2 = (value) => String(value).padStart(2, '0');
const toISO = (date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
const addDays = (date, days) => {
    const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    next.setDate(next.getDate() + days);
    return next;
};
const CN_DIGIT = {
    '零': 0, '〇': 0, '一': 1, '壹': 1, '二': 2, '兩': 2, '两': 2, '弐': 2,
    '三': 3, '參': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9
};
// Parse an Arabic or Chinese number up to 99 (covers hours, minutes, dates, day-counts).
function parseNum(token) {
    const s = token.trim();
    if (!s)
        return null;
    if (/^\d{1,4}$/.test(s))
        return Number(s);
    if (s === '十' || s === '拾')
        return 10;
    if (s.includes('十') || s.includes('拾')) {
        const [a, b] = s.split(/[十拾]/);
        const tens = a === '' ? 1 : CN_DIGIT[a];
        const ones = b === '' ? 0 : CN_DIGIT[b];
        if (tens === undefined || ones === undefined)
            return null;
        return tens * 10 + ones;
    }
    if (s.length === 1)
        return CN_DIGIT[s] ?? null;
    let acc = '';
    for (const ch of s) {
        if (CN_DIGIT[ch] === undefined)
            return null;
        acc += String(CN_DIGIT[ch]);
    }
    return acc ? Number(acc) : null;
}
const NUM = '\\d{1,2}|[零〇一二三四五六七八九十兩两壹參]{1,3}';
const REL_DAYS = [
    [/大[後后]天|明々後日/, 3],
    [/後天|后天|明後日|あさって|모레/, 2],
    [/明天|明日|明早|明晚|あした|あす|明朝|tomorrow|내일/i, 1],
    [/今天|今日|今晚|今早|今夜|きょう|本日|today|tonight|오늘/i, 0],
    [/昨天|昨日|きのう|yesterday|어제/i, -1]
];
const WEEKDAY_CHAR = {
    '日': 0, '天': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6,
    '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 0
};
const EN_WEEKDAY = [
    [/sunday/i, 0], [/monday/i, 1], [/tuesday/i, 2], [/wednesday/i, 3],
    [/thursday/i, 4], [/friday/i, 5], [/saturday/i, 6]
];
// Resolve a weekday using a Monday-anchored week so "下週一" lands on next week's Monday
// (not two Mondays out) regardless of which day it is said.
const mondayIndex = (dow) => (dow + 6) % 7; // Mon→0 … Sun→6
function weekdayDate(now, targetDow, weekOffset, explicitWeek) {
    const todayMI = mondayIndex(now.getDay());
    const targetMI = mondayIndex(targetDow);
    if (!explicitWeek && weekOffset === 0) {
        let delta = targetMI - todayMI;
        if (delta < 0)
            delta += 7;
        if (delta === 0)
            delta = 7; // "週五" said on Friday → next Friday
        return addDays(now, delta);
    }
    const thisMonday = addDays(now, -todayMI);
    return addDays(thisMonday, weekOffset * 7 + targetMI);
}
const PM_MARK = /下午|午後|午后|傍晚|黃昏|黄昏|晚上|晚間|晚间|夜晚|今晚|明晚|夜|晚|p\.?m\.?|afternoon|evening|tonight|오후|저녁|밤/i;
const AM_MARK = /凌晨|清晨|早上|早晨|上午|早|a\.?m\.?|morning|아침|오전|午前/i;
const NOON_MARK = /中午|正午|noon/i;
const MARKER_DEFAULT = [
    [/凌晨/, 5], [/清晨|早晨/, 7], [/早上|上午|morning|아침|오전|午前/i, 9],
    [NOON_MARK, 12], [/下午|afternoon|오후/i, 14], [/傍晚|黃昏|黄昏|evening|저녁/i, 18],
    [/晚上|晚間|晚间|夜晚|今晚|明晚|tonight|밤/i, 20]
];
function findDate(text, now) {
    // X 月 Y 日/號
    const md = text.match(new RegExp(`(${NUM})\\s*月\\s*(${NUM})\\s*(?:日|號|号)?`));
    if (md) {
        const month = parseNum(md[1]);
        const day = parseNum(md[2]);
        if (month && day && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            let candidate = new Date(now.getFullYear(), month - 1, day);
            if (candidate < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
                candidate = new Date(now.getFullYear() + 1, month - 1, day);
            }
            return { date: candidate, consumed: [md[0]] };
        }
    }
    // numeric slash date M/D
    const slash = text.match(/(\d{1,2})\s*[\/\-月]\s*(\d{1,2})\s*(?:日|號|号)?/);
    if (slash) {
        const month = Number(slash[1]);
        const day = Number(slash[2]);
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            let candidate = new Date(now.getFullYear(), month - 1, day);
            if (candidate < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
                candidate = new Date(now.getFullYear() + 1, month - 1, day);
            }
            return { date: candidate, consumed: [slash[0]] };
        }
    }
    // N 天後 / in N days
    const inDays = text.match(new RegExp(`(${NUM})\\s*天\\s*(?:後|后|以後|之後)`)) || text.match(/in\s+(\d{1,2})\s+days?/i);
    if (inDays) {
        const n = parseNum(inDays[1]);
        if (n !== null)
            return { date: addDays(now, n), consumed: [inDays[0]] };
    }
    // weekday (週三 / 下週五 / next monday)
    const wk = text.match(/(下下|下|這|这|本|下個|下个|這個|这个)?\s*(?:週|周|星期|禮拜|礼拜)\s*(日|天|一|二|三|四|五|六|[1-7])/);
    if (wk) {
        const target = WEEKDAY_CHAR[wk[2]];
        if (target !== undefined) {
            const prefix = wk[1] ?? '';
            const weekOffset = /下下/.test(prefix) ? 2 : /下/.test(prefix) ? 1 : 0;
            const explicitWeek = /這|这|本/.test(prefix) || weekOffset > 0;
            return { date: weekdayDate(now, target, weekOffset, explicitWeek), consumed: [wk[0]] };
        }
    }
    const enNext = text.match(/(next\s+|this\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i);
    if (enNext) {
        const target = EN_WEEKDAY.find(([re]) => re.test(enNext[2]))?.[1];
        if (target !== undefined) {
            const next = /next/i.test(enNext[1] ?? '');
            const thisWeek = /this/i.test(enNext[1] ?? '');
            return { date: weekdayDate(now, target, next ? 1 : 0, next || thisWeek), consumed: [enNext[0]] };
        }
    }
    // relative day words
    for (const [re, offset] of REL_DAYS) {
        const m = text.match(re);
        if (m)
            return { date: addDays(now, offset), consumed: [m[0]] };
    }
    // bare day-of-month (X 日/號)
    const dayOnly = text.match(new RegExp(`(${NUM})\\s*(?:日|號|号)`));
    if (dayOnly) {
        const day = parseNum(dayOnly[1]);
        if (day && day >= 1 && day <= 31) {
            let candidate = new Date(now.getFullYear(), now.getMonth(), day);
            if (candidate < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
                candidate = new Date(now.getFullYear(), now.getMonth() + 1, day);
            }
            return { date: candidate, consumed: [dayOnly[0]] };
        }
    }
    return null;
}
function findTime(text) {
    // 24h / am-pm clock: 15:30, 9:00 am
    const clock = text.match(/(\d{1,2})\s*[:：]\s*(\d{2})\s*(am|pm|a\.m\.|p\.m\.)?/i);
    if (clock) {
        let hour = Number(clock[1]);
        const minute = Number(clock[2]);
        const mer = (clock[3] || '').toLowerCase();
        if (/p/.test(mer) && hour < 12)
            hour += 12;
        if (/a/.test(mer) && hour === 12)
            hour = 0;
        if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
            return { hour, minute, consumed: [clock[0]] };
        }
    }
    // Chinese N 點 [半 | 一刻 | 三刻 | 整 | N 分]
    const cn = text.match(new RegExp(`(${NUM})\\s*(?:點|点|時|时)\\s*(半|一刻|三刻|整|${NUM})?\\s*(?:分|分鐘|分钟)?`));
    if (cn) {
        let hour = parseNum(cn[1]);
        if (hour !== null && hour >= 0 && hour <= 24) {
            let minute = 0;
            const tail = cn[2];
            if (tail === '半')
                minute = 30;
            else if (tail === '一刻')
                minute = 15;
            else if (tail === '三刻')
                minute = 45;
            else if (tail === '整' || tail === undefined)
                minute = 0;
            else {
                const m = parseNum(tail);
                if (m !== null && m >= 0 && m <= 59)
                    minute = m;
            }
            // Look at the immediately preceding context for a meridiem marker, and consume it so
            // it doesn't leak into the task title.
            const before = text.slice(0, cn.index ?? 0);
            const markerMatch = before.match(/(凌晨|清晨|早晨|早上|上午|正午|中午|午後|午后|下午|傍晚|黃昏|黄昏|晚上|晚間|晚间|夜晚|今晚|明晚|夜|晚|早)\s*$/);
            const marker = markerMatch?.[1] ?? '';
            if (PM_MARK.test(marker) && hour < 12)
                hour += 12;
            else if (AM_MARK.test(marker) && hour === 12)
                hour = 0;
            if (hour === 24)
                hour = 0;
            return { hour, minute, consumed: marker ? [marker, cn[0]] : [cn[0]] };
        }
    }
    // "at 3 pm" without a colon
    const enHour = text.match(/\bat\s+(\d{1,2})\s*(am|pm|a\.m\.|p\.m\.)?/i) || text.match(/\b(\d{1,2})\s*(am|pm)\b/i);
    if (enHour) {
        let hour = Number(enHour[1]);
        const mer = (enHour[2] || '').toLowerCase();
        if (/p/.test(mer) && hour < 12)
            hour += 12;
        if (/a/.test(mer) && hour === 12)
            hour = 0;
        if (hour >= 0 && hour <= 23)
            return { hour, minute: 0, consumed: [enHour[0]] };
    }
    // Bare meridiem word with no explicit hour → sensible default.
    for (const [re, hour] of MARKER_DEFAULT) {
        const m = text.match(re);
        if (m)
            return { hour, minute: 0, consumed: [m[0]] };
    }
    return null;
}
const TITLE_NOISE = [
    /幫我|帮我|幫忙|帮忙|麻煩你?|麻烦你?|請你?|请你?|幫|帮|你可以|可以幫|能不能/g,
    /提醒我一下|提醒我|提醒一下|提醒|記得提醒|記得|记得|記下來|记下来|記下|记下|寫下|写下|標註|标注|标註|註記|注记|備註|备注|备忘|備忘|記一下|记一下|新增|加入|安排|排程|記|记/g,
    /幫我在|在|於|于|到了?|要|想要|想|需要|得|把|將|将|去/g,
    /的時候|的时候|的事情|這件事|这件事|一下/g,
    /remind me to|remind me|please|remember to|set a reminder( to)?|add (a )?(reminder|event|note)( to)?|note that|to-?do|schedule/gi,
    /リマインド|覚えて|メモして|予定/g,
    /알림|기억해|메모해|일정/g
];
function cleanTitle(raw, consumed) {
    let title = raw;
    for (const piece of consumed) {
        if (piece)
            title = title.split(piece).join(' ');
    }
    for (const noise of TITLE_NOISE)
        title = title.replace(noise, ' ');
    title = title
        .replace(/[，,、。．.！!？?；;：:]+/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/^[\s的了をに、,]+|[\s的了。、,]+$/g, '')
        .trim();
    return title;
}
function parseAgenda(raw, _lang, now = new Date()) {
    const text = (raw ?? '').trim();
    const dateMatch = findDate(text, now);
    const timeMatch = findTime(text);
    const consumed = [...(dateMatch?.consumed ?? []), ...(timeMatch?.consumed ?? [])];
    const date = dateMatch ? dateMatch.date : new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const time = timeMatch ? `${pad2(timeMatch.hour)}:${pad2(timeMatch.minute)}` : null;
    return {
        date: toISO(date),
        time,
        title: cleanTitle(text, consumed),
        hasDate: Boolean(dateMatch),
        hasTime: Boolean(timeMatch)
    };
}
