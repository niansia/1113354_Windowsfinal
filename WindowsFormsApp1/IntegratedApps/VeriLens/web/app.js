/* VeriLens -- misinformation forensics dashboard (vanilla JS). */
(function () {
  const { t, tf, setLang, getLang, LANGS } = window.I18N;
  const $ = (s, r) => (r || document).querySelector(s);
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

  const params = new URLSearchParams(location.search);
  // Locale governed by FusionOS system Settings -> 語言與時間 (default zh-TW, no in-app selector).
  (function initLang() { const l = params.get('lang'); if (l && LANGS.indexOf(l) >= 0) setLang(l); })();

  let lastResult = null;     // last analyze result
  let imgDataUrl = null;     // current uploaded image (data URL)
  let imgView = 'annotated'; // original | annotated | ela
  let activeTab = 'signals';

  const VERDICT = { credible: '可信', questionable: '存疑', likely_false: '可能不實' };
  const VCOLOR = { credible: '#45e6a4', questionable: '#ffc15e', likely_false: '#ff5f6d' };
  const FACTOR = { text_model: '文字模型', writing_style: '寫作風格', source_credibility: '來源可信度', image_tampering: '影像竄改', image_content: '影像內容', web_crossref: '網路查證' };
  function factorReason(f) {
    const v = f.value, pct = Math.round(v * 100);
    switch (f.key) {
      case 'text_model': return tf('AI 文字分類器：假訊息機率 {0}%', pct);
      case 'writing_style': return tf('寫作風格風險 {0}%（誘餌、聳動、來源引用等）', pct);
      case 'source_credibility': return tf('來源可信度 {0}%', pct);
      case 'web_crossref': return v >= 0.64 ? tf('網路查證：查核資料庫顯示相關不實訊息（風險 {0}%）', pct) : tf('網路查證：找到相關事實查核報導，此說法受到質疑（風險 {0}%）', pct);
      case 'image_tampering': return tf('影像竄改跡象 {0}%', pct);
      case 'image_content': return tf('影像中偵測到 {0} 個主體', Math.round(v));
      default: return '';
    }
  }

  // ============================ health ============================
  async function pollHealth(times) {
    try {
      const h = await (await fetch('/api/health', { cache: 'no-store' })).json();
      renderStatus(h);
      if ((!h.yolo || !h.textModel || !h.engine) && times > 0) setTimeout(() => pollHealth(times - 1), 2500);
    } catch (e) { if (times > 0) setTimeout(() => pollHealth(times - 1), 2500); }
  }
  function renderStatus(h) {
    const chips = [
      ['鑑識引擎', h.engine],
      ['YOLO', h.yolo],
      ['文字模型', h.textModel],
    ];
    const box = $('#statusChips'); box.innerHTML = '';
    chips.forEach(([label, ok]) => {
      const c = el('div', 'schip ' + (ok ? 'on' : 'off'));
      c.appendChild(el('span', 'dot'));
      c.appendChild(el('span', '', (label === 'YOLO' ? 'YOLO' : t(label)) + ' · ' + t(ok ? '就緒' : '載入中')));
      box.appendChild(c);
    });
  }

  // ============================ analyze ============================
  async function analyze() {
    const headline = $('#inHeadline').value.trim();
    const body = $('#inBody').value.trim();
    const source = $('#inSource').value.trim();
    if (!headline && !body) { alert(t('請先輸入新聞標題或內文')); return; }
    const btn = $('#analyzeBtn'); btn.disabled = true; const old = btn.textContent; btn.textContent = t('分析中…');
    try {
      const res = await (await fetch('/api/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headline, body, source, image: imgDataUrl })
      })).json();
      lastResult = res;
      renderResult(res);
      renderImage(res.image);
      renderSignals(res);
      loadCases();
    } catch (e) { alert('analysis failed'); }
    finally { btn.disabled = false; btn.textContent = old; }
  }

  async function fetchUrl() {
    const url = $('#inUrl').value.trim();
    if (!/^https?:\/\//i.test(url)) { alert(t('請貼上有效的新聞連結')); return; }
    const btn = $('#fetchBtn'); const old = btn.textContent;
    btn.disabled = true; $('#analyzeBtn').disabled = true; btn.textContent = t('擷取中…');
    try {
      const res = await (await fetch('/api/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url })
      })).json();
      if (res.ok === false || !res.verdict) { alert(t('無法擷取此連結，請改用手動貼上')); return; }
      if (res.extracted) {
        $('#inHeadline').value = res.extracted.headline || '';
        $('#inBody').value = res.extracted.body || '';
        $('#inSource').value = res.extracted.source || '';
      }
      if (res.image && res.image.original_url) setImage(res.image.original_url);
      lastResult = res;
      renderResult(res); renderImage(res.image); renderSignals(res); loadCases();
    } catch (e) { alert(t('無法擷取此連結，請改用手動貼上')); }
    finally { btn.disabled = false; btn.textContent = old; $('#analyzeBtn').disabled = false; }
  }

  function renderResult(r) {
    $('#resultEmpty').hidden = true; $('#resultBody').hidden = false;
    drawGauge(r.credibility, VCOLOR[r.verdict] || '#888');
    $('#gaugeScore').textContent = Math.round(r.credibility);
    const vl = $('#verdictLabel'); vl.textContent = t(VERDICT[r.verdict] || r.verdict); vl.className = 'verdict-label ' + r.verdict;
    $('#confVal').textContent = Math.round(r.confidence) + '%';
    $('#pfakeVal').textContent = (r.pFake * 100).toFixed(1) + '%';
    $('#engineVal').textContent = r.engine === 'native' ? t('原生') + ' C++' : 'Python';
    // thin-content warning (URL extraction yielded little text)
    const tw = $('#thinWarn');
    if (r.extracted && r.extracted.thin) {
      tw.hidden = false;
      tw.textContent = t('⚠ 此連結內容無法完整擷取（可能為社群平台或需登入），目前判定僅依少量資訊。建議手動複製貼上貼文內文，以進行完整的文字與網路查證。');
    } else { tw.hidden = true; }
    // factors
    const maxC = Math.max(0.8, ...r.factors.map(f => Math.abs(f.contribution)));
    const fbox = $('#factors'); fbox.innerHTML = '';
    r.factors.forEach(f => {
      const row = el('div', 'factor');
      const head = el('div', 'f-head');
      head.appendChild(el('div', 'f-name', t(FACTOR[f.key] || f.key)));
      const bar = el('div', 'f-bar'); const fill = el('div', 'f-fill ' + f.direction);
      fill.style.width = (Math.abs(f.contribution) / maxC * 50) + '%'; bar.appendChild(fill); head.appendChild(bar);
      head.appendChild(el('div', 'f-dir', t(f.direction === 'fake' ? '降低可信' : '提高可信')));
      row.appendChild(head);
      const reason = factorReason(f); if (reason) row.appendChild(el('div', 'f-reason', reason));
      fbox.appendChild(row);
    });
    renderWeb(r.web);
    // claims
    const cbox = $('#claims'); cbox.innerHTML = '';
    if (!r.claims || !r.claims.length) cbox.appendChild(el('div', 'empty', t('未偵測到明確的事實主張')));
    else r.claims.forEach(c => {
      const row = el('div', 'claim');
      row.appendChild(el('span', 'c-score', Math.round(c.score * 100)));
      row.appendChild(el('span', '', c.text));
      cbox.appendChild(row);
    });
  }

  function renderWeb(web) {
    const sub = $('#webSub'), box = $('#webEvidence');
    if (!web || !web.ran) { sub.hidden = true; return; }
    sub.hidden = false; box.innerHTML = '';
    const hits = web.hits || [];
    const summary = el('div', 'web-summary');
    summary.textContent = hits.length
      ? tf('發現 {0} 則相關事實查核', web.factCheckCount || hits.length)
      : t('未在查核資料庫找到相關紀錄');
    box.appendChild(summary);
    hits.forEach(h => {
      const a = el('a', 'web-hit ' + (h.rating || ''));
      a.href = h.url; a.target = '_blank'; a.rel = 'noopener';
      const top = el('div', 'wh-top');
      if (h.rating) top.appendChild(el('span', 'wh-rating', t(h.rating === 'debunk' ? '不實' : h.rating === 'true' ? '屬實' : '相關查核')));
      top.appendChild(el('span', 'wh-source', h.source));
      a.appendChild(top);
      a.appendChild(el('div', 'wh-title', h.title));
      if (h.reply) a.appendChild(el('div', 'wh-reply', h.reply));
      box.appendChild(a);
    });
  }

  function drawGauge(score, color) {
    const cv = $('#gauge'); const ctx = cv.getContext('2d'); const W = 180, R = 76, cx = 90, cy = 90;
    ctx.clearRect(0, 0, W, W);
    const start = Math.PI * 0.75, end = Math.PI * 2.25;
    ctx.lineCap = 'round'; ctx.lineWidth = 14;
    ctx.beginPath(); ctx.arc(cx, cy, R, start, end); ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.stroke();
    const frac = Math.max(0, Math.min(1, score / 100));
    ctx.beginPath(); ctx.arc(cx, cy, R, start, start + (end - start) * frac);
    const g = ctx.createLinearGradient(0, 0, W, W); g.addColorStop(0, color); g.addColorStop(1, color);
    ctx.strokeStyle = color; ctx.stroke();
  }

  // ============================ image ============================
  function renderImage(im) {
    const seg = $('#imgSeg'); seg.innerHTML = '';
    if (!im) { $('#imageEmpty').hidden = false; $('#imageView').hidden = true; $('#imageEmpty').textContent = t('未上傳圖片'); return; }
    $('#imageEmpty').hidden = true; $('#imageView').hidden = false;
    const tabs = [['original', '原圖', im.original_url],
                  ['annotated', 'YOLO 物件偵測', im.annotated_url || im.original_url],
                  ['ela', 'ELA 誤差熱圖', im.ela_url]];
    if (!im.detections || !im.detections.length) imgView = (imgView === 'annotated') ? 'original' : imgView;
    tabs.forEach(([v, lbl, url]) => {
      if (!url) return;
      const b = el('button', v === imgView ? 'on' : '', lbl === 'YOLO 物件偵測' ? 'YOLO' : t(lbl)); b.dataset.v = v;
      b.onclick = () => { imgView = v; seg.querySelectorAll('button').forEach(x => x.classList.toggle('on', x.dataset.v === v)); setImg(im); };
      seg.appendChild(b);
    });
    setImg(im);
    // tamper bars
    $('#tamperScore').textContent = Math.round(im.tamper * 100) + '%';
    $('#tamperScore').style.color = im.tamper > 0.5 ? 'var(--red)' : im.tamper > 0.3 ? 'var(--amber)' : 'var(--green)';
    const tb = $('#tamperBars'); tb.innerHTML = '';
    [['誤差層級分析', im.ela_score], ['雜訊不一致', im.noise_score], ['複製貼上', im.copymove_score]].forEach(([lbl, v]) => {
      const row = el('div', 'bar-row'); row.appendChild(el('span', '', t(lbl)));
      const bar = el('div', 'bar'); const i = el('i'); i.style.width = Math.round(v * 100) + '%'; bar.appendChild(i); row.appendChild(bar);
      row.appendChild(el('span', 'bv', Math.round(v * 100) + '%')); tb.appendChild(row);
    });
    // detections
    const dl = $('#detList'); dl.innerHTML = '';
    if (!im.detections.length) dl.appendChild(el('div', 'empty', im.yoloReady ? '—' : t('YOLO 模型未就緒')));
    im.detections.forEach(d => {
      const row = el('div', 'det'); row.appendChild(el('span', 'd-name', d.name));
      row.appendChild(el('span', 'd-conf', Math.round(d.conf * 100) + '%')); dl.appendChild(row);
    });
  }
  function setImg(im) {
    const url = imgView === 'original' ? im.original_url : imgView === 'ela' ? im.ela_url : (im.annotated_url || im.original_url);
    $('#forensicImg').src = url || '';
  }

  // ============================ text signals ============================
  function renderSignals(r) {
    const f = r.features || {}; const box = $('#signalsPanel'); box.innerHTML = '';
    const items = [
      ['誘餌標題詞', f.clickbait, f.clickbait > 0 ? 'bad' : 'good'],
      ['聳動情緒詞', f.sensational, f.sensational > 1 ? 'warn' : ''],
      ['絕對化用語', f.certainty, f.certainty > 0 ? 'warn' : ''],
      ['模糊推測詞', f.hedge, ''],
      ['來源引用', f.source, f.source > 0 ? 'good' : 'warn'],
      ['驚嘆/問號', (f.exclaim || 0) + (f.question || 0), (f.exclaim || 0) > 2 ? 'warn' : ''],
      ['全大寫詞', f.capsTokens, f.capsTokens > 0 ? 'warn' : ''],
      ['數字主張', f.numeric, ''],
      ['句數', f.sentences, ''],
      ['語言風險指數', Math.round((f.lingRisk || 0) * 100) + '%', (f.lingRisk || 0) > 0.5 ? 'bad' : (f.lingRisk || 0) > 0.3 ? 'warn' : 'good'],
    ];
    items.forEach(([label, val, cls]) => {
      const s = el('div', 'sig ' + (cls || ''));
      s.appendChild(el('div', 's-label', t(label)));
      s.appendChild(el('div', 's-val', val == null ? '–' : String(val)));
      box.appendChild(s);
    });
  }

  // ============================ cases ============================
  async function loadCases() {
    try {
      const d = await (await fetch('/api/cases', { cache: 'no-store' })).json();
      renderCases(d);
    } catch (e) {}
  }
  function renderCases(d) {
    const box = $('#casesPanel'); box.innerHTML = '';
    const st = d.stats || {};
    const stats = el('div', 'cases-stats');
    const mk = (lbl, val) => { const c = el('div', 'cstat'); c.appendChild(el('div', 'cs-label', t(lbl))); c.appendChild(el('div', 'cs-val', val)); return c; };
    stats.appendChild(mk('總分析數', st.total || 0));
    stats.appendChild(mk('平均可信度', (st.avgCredibility || 0) + '%'));
    stats.appendChild(mk('含圖片', st.withImage || 0));
    const bv = st.byVerdict || {};
    stats.appendChild(mk('可能不實', bv.likely_false || 0));
    box.appendChild(stats);
    const recent = d.recent || [];
    if (!recent.length) { box.appendChild(el('div', 'empty', t('尚無案件'))); return; }
    const table = el('table', 'case-table');
    const thead = el('tr');
    ['時間', '標題', '判定', '可信度'].forEach(h => thead.appendChild(el('th', '', t(h)))); table.appendChild(thead);
    recent.forEach(c => {
      const tr = el('tr');
      tr.appendChild(el('td', '', new Date(c.ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })));
      const td = el('td'); td.textContent = c.headline.length > 42 ? c.headline.slice(0, 42) + '…' : c.headline; tr.appendChild(td);
      const tv = el('td'); tv.appendChild(el('span', 'vtag ' + c.verdict, t(VERDICT[c.verdict] || c.verdict))); tr.appendChild(tv);
      tr.appendChild(el('td', 'cred-mini', Math.round(c.credibility) + '%'));
      table.appendChild(tr);
    });
    box.appendChild(table);
  }

  // ============================ methodology ============================
  function renderMethod() {
    const box = $('#methodPanel'); box.innerHTML = '';
    const blocks = [
      ['影像軌道（電腦視覺）', '以 YOLOv8 進行物件偵測（ONNX Runtime 推論 + 自寫 NMS），並以 ELA 誤差層級分析、雜訊不一致與 ORB 複製貼上偵測找出影像竄改痕跡。'],
      ['文字軌道（自然語言處理）', '結合 scikit-learn 字元 n-gram TF-IDF 分類器與 C++ 語言學特徵（誘餌、聳動、絕對化、來源引用、可讀性）。'],
      ['多模態融合', 'C++ 核心以單純貝氏對數機率將各模態信號融合為單一可信度，並輸出可解釋的因子貢獻。每次分析皆存入 SQLite 案件庫。'],
    ];
    blocks.forEach(([h, p]) => {
      const b = el('div', 'method-block'); b.appendChild(el('h4', '', t(h))); b.appendChild(el('p', '', t(p))); box.appendChild(b);
    });
    box.appendChild(el('div', 'method-note', t('注意：本工具提供風險訊號輔助判讀，非絕對真假認定，請搭配查證。')));
  }

  // ============================ tabs ============================
  function buildTabs() {
    const bar = $('#tabbar'); bar.innerHTML = '';
    [['signals', '文字訊號'], ['cases', '案件庫'], ['method', '方法論']].forEach(([id, lbl]) => {
      const b = el('button', id === activeTab ? 'on' : '', t(lbl)); b.onclick = () => { activeTab = id; switchTab(); };
      bar.appendChild(b);
    });
    switchTab();
  }
  function switchTab() {
    document.querySelectorAll('#tabbar button').forEach((b, i) => b.classList.toggle('on', ['signals', 'cases', 'method'][i] === activeTab));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.toggle('on', p.dataset.pane === activeTab));
    if (activeTab === 'cases') loadCases();
    if (activeTab === 'method') renderMethod();
  }

  // ============================ image upload ============================
  function setImage(dataUrl) {
    imgDataUrl = dataUrl;
    const dz = $('#dropZone'), pv = $('#imgPreview');
    if (dataUrl) { pv.src = dataUrl; dz.classList.add('has-img'); } else { pv.removeAttribute('src'); dz.classList.remove('has-img'); }
  }
  function fileToDataUrl(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const fr = new FileReader(); fr.onload = () => setImage(fr.result); fr.readAsDataURL(file);
  }
  function setupUpload() {
    const dz = $('#dropZone'), fi = $('#fileInput');
    dz.onclick = () => fi.click();
    fi.onchange = () => fileToDataUrl(fi.files[0]);
    dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('drag'));
    dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('drag'); if (e.dataTransfer.files[0]) fileToDataUrl(e.dataTransfer.files[0]); });
    window.addEventListener('paste', e => { const it = [...(e.clipboardData?.items || [])].find(i => i.type.startsWith('image/')); if (it) fileToDataUrl(it.getAsFile()); });
  }

  // ============================ examples ============================
  const EX_FAKE = {
    headline: '震驚！獨家曝光驚人真相，醫生都不敢說，這個方法100%治癒癌症，不轉不是台灣人！！！',
    body: '網路瘋傳一個驚人的內幕消息。據說某神秘配方絕對有效，已經有無數人見證，太可怕了，必看！千萬別讓他們把這篇刪掉，快分享給家人朋友。',
    source: 'line群組'
  };
  const EX_REAL = {
    headline: '中央氣象署：週末鋒面通過 北部有局部陣雨',
    body: '根據中央氣象署今日發布的資料，本週末將有一道鋒面通過台灣，預計為北部地區帶來約30毫米降雨。氣象專家指出，民眾外出建議攜帶雨具。氣象署表示，這波降雨有助於緩解中南部旱情，研究顯示對水庫蓄水有正面效益。',
    source: '中央社'
  };
  function loadExample(ex) { $('#inHeadline').value = ex.headline; $('#inBody').value = ex.body; $('#inSource').value = ex.source; setImage(null); }

  // ============================ i18n / locale ============================
  function applyStaticI18n() {
    document.querySelectorAll('[data-i18n]').forEach(e => { e.textContent = t(e.getAttribute('data-i18n')); });
    document.querySelectorAll('[data-i18n-ph]').forEach(e => { e.placeholder = t(e.getAttribute('data-i18n-ph')); });
    document.documentElement.lang = getLang();
  }
  function rerenderAll() {
    applyStaticI18n(); buildTabs();
    if (lastResult) { renderResult(lastResult); renderImage(lastResult.image); renderSignals(lastResult); }
    pollHealth(0);
  }
  function applyLocale(d) {
    const lang = d.language || (d.payload && d.payload.language);
    if (lang && LANGS.indexOf(lang) >= 0 && lang !== getLang()) { setLang(lang); rerenderAll(); }
  }
  window.addEventListener('message', (ev) => {
    let d = ev.data; if (!d) return;
    if (typeof d === 'string') { try { d = JSON.parse(d); } catch { return; } }
    if (d.type === 'FUSION_LOCALE_CHANGED' || d.type === 'FUSION_SET_LANGUAGE') applyLocale(d);
  });
  if (window.chrome && window.chrome.webview) {
    window.chrome.webview.addEventListener('message', (ev) => window.dispatchEvent(new MessageEvent('message', { data: ev.data })));
  }

  // ============================ boot ============================
  document.addEventListener('DOMContentLoaded', () => {
    applyStaticI18n(); buildTabs(); setupUpload();
    $('#analyzeBtn').onclick = analyze;
    $('#fetchBtn').onclick = fetchUrl;
    $('#inUrl').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); fetchUrl(); } });
    $('#clearBtn').onclick = () => { $('#inUrl').value = ''; $('#inHeadline').value = ''; $('#inBody').value = ''; $('#inSource').value = ''; setImage(null); };
    $('#exFake').onclick = () => loadExample(EX_FAKE);
    $('#exReal').onclick = () => loadExample(EX_REAL);
    pollHealth(12);
  });
})();
