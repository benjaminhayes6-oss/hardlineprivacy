// Hardline Privacy - Exposure Scanner (conversion-focused)
const form = document.getElementById('scanForm');
const resultsEl = document.getElementById('results');
const FALLBACK_RESULT = {
  success: true,
  requestId: '',
  exposure: 'moderate',
  limitedVisibility: true,
  results: [],
  message: 'Partial scan: one or more sources were unavailable. Results may be incomplete. Please try again.'
};
const FALLBACK_NOTICE_MAIN = 'Partial scan: one or more sources were unavailable. Results may be incomplete. Please try again.';
const FALLBACK_NOTICE_DETAIL = 'Results are based on available public sources and may change over time.';
const SCAN_TIMEOUT_MS = 12000;
const FALLBACK_RESULTS = [
  {
    title: 'People-search profile listings',
    snippet: 'These pages often include address history, relatives, and age ranges.',
    source: 'fallback'
  },
  {
    title: 'Property and map imagery links',
    snippet: 'Property records can expose home locations and ownership details.',
    source: 'fallback'
  },
  {
    title: 'Phone and identity directory entries',
    snippet: 'Phone numbers and email associations are commonly republished.',
    source: 'fallback'
  }
];

const BROKER_HINTS = [
  'spokeo.com','whitepages.com','radaris.com','truepeoplesearch.com','fastpeoplesearch.com',
  'beenverified.com','truthfinder.com','instantcheckmate.com','intelius.com','nuwber.com',
  'peoplefinders.com','ussearch.com','peekyou.com'
];

function getCtaVariant(){
  try{
    const params = new URLSearchParams(location.search);
    const forced = (params.get('exp') || '').toLowerCase();
    if (forced === 'a' || forced === 'b') {
      localStorage.setItem('hp_exp_scan_cta', forced);
      return forced;
    }
    const stored = localStorage.getItem('hp_exp_scan_cta');
    if (stored === 'a' || stored === 'b') return stored;
    const variant = Math.random() < 0.5 ? 'a' : 'b';
    localStorage.setItem('hp_exp_scan_cta', variant);
    return variant;
  }catch(e){
    return 'a';
  }
}

function setResultsHTML(html){
  if (!resultsEl) return;
  requestAnimationFrame(()=>{ resultsEl.innerHTML = html; });
}

function host(u){
  try { return new URL(u).hostname.replace(/^www\./,''); } catch { return ''; }
}

function collectBrokerHits(items){
  const hits = new Set();
  for (const it of (items||[])){
    const h = host(it.link||it.url||'');
    if (!h) continue;
    for (const b of BROKER_HINTS){
      if (h === b || h.endsWith('.'+b)) hits.add(b);
    }
  }
  return [...hits];
}

function normalizeExposureLevel(count, brokerHits, limitedVisibility){
  if (count >= 4 || brokerHits.length >= 2) return 'elevated';
  if (count >= 1) return 'moderate';
  if (limitedVisibility) return 'moderate';
  return 'low';
}

function getExposureMeta(items, exposure, limitedVisibility){
  const count = (items || []).length;
  const brokerHits = collectBrokerHits(items);
  const level = normalizeExposureLevel(count, brokerHits, limitedVisibility);
  if (level === 'elevated') return { level:'elevated', label:'Elevated Exposure', rec:'pro', brokerHits };
  if (level === 'low') return { level:'low', label:'Low Exposure', rec:'sub', brokerHits };
  return { level:'moderate', label:'Moderate Exposure', rec:'sub', brokerHits };
}

function riskPill(level,label){
  const cls = level==='low' ? 'risk-low' : level==='elevated' ? 'risk-high' : 'risk-mod';
  return `<span class="risk-pill ${cls}">${label}</span>`;
}

function recommendationBlock(rec){
  const map = {
    sub: { title:'Recommended for you: Ongoing Privacy Monitoring', href:'/pricing?rec=sub#plans', cta:'Protect My Information' },
    pro: { title:'Recommended for you: Enhanced / High‑Risk Protection', href:'/pricing?rec=pro#plans', cta:'Protect My Information' }
  };
  const r = map[rec] || map.sub;
  const variant = getCtaVariant();
  const ctaLabel = variant === 'b' ? 'Start Protection Now' : r.cta;
  return `
    <div class="callout">
      <div class="cta-box">
        <div>
          <div style="font-weight:900">${r.title}</div>
          <div class="small">Most removals complete in 7–21 days depending on the site.</div>
          <div class="small" style="margin-top:6px">No credit card required to view protection options.</div>
        </div>
        <div>
          <a class="btn primary" href="${r.href}">${ctaLabel}</a>
          <a class="btn ghost" href="/contact" style="margin-top:8px">Request a quote</a>
        </div>
      </div>
      <div class="small" style="margin-top:10px">Built by a U.S. Military Veteran &amp; Law‑Enforcement Officer · No ads · No data resale</div>
    </div>
  `;
}

function renderProviders(providers){
  if (!providers) return '';
  const entries = Object.entries(providers);
  if (!entries.length) return '';
  const lines = entries.map(([name, info])=>{
    const status = info.ok ? 'ok' : 'limited';
    const count = typeof info.count === 'number' ? ` (${info.count})` : '';
    return `${name}: ${status}${count}`;
  }).join(' · ');
  return `<div class="small" style="margin-top:8px">Sources: ${escapeHtml(lines)}</div>`;
}

function render(items, meta, message, isFallback, requestId, limitedVisibility, providers){
  const {level,label,rec,brokerHits} = meta;
  const count = (items || []).length;
  const safeId = escapeHtml(requestId || '');
  const hasFallbackResults = isFallback && (!items || items.length === 0);
  const listItems = (hasFallbackResults ? FALLBACK_RESULTS : (items||[])).slice(0, 15);
  const isPartial = Boolean(limitedVisibility || isFallback);

  const why = `
    <div class="callout">
      <h3 style="margin:0 0 6px">Why this matters</h3>
      <div class="small">Public listings are commonly used to target families—especially households with children or older adults.</div>
    </div>
  `;

  const means = `
    <div class="callout">
      <h3 style="margin:0 0 6px">What this means</h3>
      <div class="small">Public listings commonly include home addresses, phone numbers, relatives, and location data.</div>
      <div class="small" style="margin-top:8px">When aggregated across multiple sites, this information can be used to identify, track, or contact individuals without their consent.</div>
      <div class="small" style="margin-top:8px"><b>High‑risk broker note:</b> Certain sites are known to collect, resell, and frequently republish personal information—even after manual opt‑outs.</div>
    </div>
  `;

  const list = listItems.map(it => {
    const linkUrl = it.link||it.url||'';
    const h = host(linkUrl);
    const title = escapeHtml(it.title||linkUrl||'Result');
    const snippet = escapeHtml(it.snippet||'');
    const link = linkUrl ? `<a href="${linkUrl}" target="_blank" rel="nofollow noopener">${title}</a>` : `<span>${title}</span>`;
    return `
      <div class="item">
        <div>${link}</div>
        ${snippet ? `<div class="meta">${snippet}</div>` : ''}
        ${h ? `<div class="meta">${h}</div>` : ''}
      </div>
    `;
  }).join('') || `
    <div class="callout">
      <div>${escapeHtml(isFallback ? FALLBACK_NOTICE_MAIN : (message || FALLBACK_RESULT.message))}</div>
      <div class="small" style="margin-top:6px">${escapeHtml(isFallback ? FALLBACK_NOTICE_DETAIL : 'Free scans review a limited set of sources, which can vary over time.')}</div>
    </div>
  `;

  const levelText = level === 'elevated' ? 'Elevated' : level === 'low' ? 'Low' : 'Moderate';
  const exposureSummary = count
    ? `This scan identified ${count} publicly visible listing${count === 1 ? '' : 's'} associated with the name and location provided.`
    : 'This scan did not surface obvious listings for the name and location provided, but results can change as brokers refresh.';
  const brokerLine = brokerHits.length
    ? `Broker sources detected: ${brokerHits.join(', ')}.`
    : 'No broker-domain hits were detected in this scan.';

  const headerLabel = isPartial ? 'Partial Scan' : 'Scan Complete';
  const pillLabel = isPartial ? 'Limited Visibility' : label;
  const pillLevel = isPartial ? 'moderate' : level;
  const exposureBlock = isPartial ? '' : `
      <div class="small" style="margin-top:8px">Exposure Level: <span style="font-weight:700">${levelText}</span></div>
      <div class="small" style="margin-top:8px">${escapeHtml(exposureSummary)}</div>
      <div class="small" style="margin-top:8px">${escapeHtml(brokerLine)}</div>
      <div class="small" style="margin-top:8px">Results are based on available free sources and provide an exposure estimate, not a guarantee of removal or search rank changes.</div>
  `;

  setResultsHTML(`
    <div class="callout">
      <div class="scan-summary-header">
        <div style="font-weight:900">${headerLabel}</div>
        ${riskPill(pillLevel, pillLabel)}
      </div>
      ${isPartial ? `<div class="small" style="margin-top:8px">Partial scan: one or more sources were unavailable. Results may be incomplete. Please try again.</div>` : ''}
      ${!isPartial ? `<div class="small" style="margin-top:8px">${escapeHtml(message || FALLBACK_RESULT.message)}</div>` : ''}
      ${exposureBlock}
      ${renderProviders(providers)}
      <div class="small" style="margin-top:8px">Families with children and older adults are often targeted when listings are easy to find.</div>
      <div class="small" style="margin-top:8px">This scan uses publicly accessible sources only.</div>
      ${safeId ? `<div class="small" style="margin-top:8px">Request ID: <span style="font-weight:700">${safeId}</span></div>` : ''}
    </div>
    ${means}
    ${why}
    <div class="callout">
      <h3 style="margin:0 0 6px">Next steps</h3>
      <ul class="features">
        <li><span class="feature-icon">•</span>Review the listings below for known addresses and relatives.</li>
        <li><span class="feature-icon">•</span>Start removal work for broker sources that republish frequently.</li>
        <li><span class="feature-icon">•</span>Set monitoring so re‑listings are caught early.</li>
      </ul>
    </div>
    ${recommendationBlock(rec)}
    <div class="callout items-list">
      <h3 style="margin:0 0 6px">Results</h3>
      <div class="small">Showing up to 15 top results from available free sources.</div>
      ${hasFallbackResults ? `<div class="small" style="margin-top:6px">These are example exposure categories shown because the scan sources were temporarily unavailable.</div>` : ''}
      ${list}
    </div>
    <div class="small" style="margin-top:14px">This scan does not access private databases or bypass protections. Results reflect publicly accessible listings and may change over time.</div>
  `);
  if (resultsEl) {
    requestAnimationFrame(() => {
      resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
}

function escapeHtml(s){
  return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function generateRequestId(){
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `hp-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function setFieldError(fieldId, message){
  const input = document.getElementById(fieldId);
  const errorEl = document.getElementById(`error-${fieldId}`);
  if (errorEl) errorEl.textContent = message || '';
  if (input) {
    if (message) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  }
}

function buildFallbackResponse(){
  return {
    ...FALLBACK_RESULT,
    requestId: generateRequestId()
  };
}

async function runScan(){
  const name = document.getElementById('fullName')?.value.trim();
  const loc = document.getElementById('cityState')?.value.trim();
  const aliases = document.getElementById('aliases')?.value.trim();
  setFieldError('fullName', name ? '' : 'Please enter a full name.');
  setFieldError('cityState', loc ? '' : 'Please enter a city and state.');
  if (!name || !loc) return;

  const query = [name, loc, aliases].filter(Boolean).join(' ');
  const q = encodeURIComponent(query);

  setResultsHTML('<div class="callout">Scanning…</div>');

  try{
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SCAN_TIMEOUT_MS);
    let usedFallback = false;
    let fallbackReason = '';
    let res;
    try {
      res = await fetch(
        `/api/search?q=${q}&name=${encodeURIComponent(name)}&city=${encodeURIComponent(loc)}`,
        { signal: controller.signal }
      );
    } finally {
      clearTimeout(timeoutId);
    }
    let data = null;
    try {
      data = await res.json();
    } catch {
      usedFallback = true;
      fallbackReason = 'json-parse';
    }
    if (!res.ok) {
      usedFallback = true;
      fallbackReason = fallbackReason || `status-${res.status}`;
      data = buildFallbackResponse();
    }
    if (!data || data?.success !== true || !Array.isArray(data.results)) {
      usedFallback = true;
      fallbackReason = fallbackReason || 'invalid-payload';
      data = buildFallbackResponse();
    }
    const items = Array.isArray(data.results) ? data.results : [];
    const limitedVisibility = Boolean(data?.limitedVisibility || usedFallback);
  const meta = getExposureMeta(items, data?.exposure, limitedVisibility);
  // persist recommendation for pricing highlighting
  localStorage.setItem('hp_reco', meta.rec);
    const message = typeof data?.message === 'string' && data.message.trim()
      ? data.message.trim()
      : FALLBACK_RESULT.message;
    if (usedFallback) {
      console.log(`[scan-fallback] ${new Date().toISOString()} (${fallbackReason || 'unknown'})`);
    }
    const requestId = typeof data?.requestId === 'string' && data.requestId.trim()
      ? data.requestId.trim()
      : generateRequestId();
    render(items, meta, message, usedFallback, requestId, limitedVisibility, data?.providers);
  }catch(err){
    const fallbackReason = err?.name === 'AbortError' ? 'timeout' : 'network';
    console.log(`[scan-fallback] ${new Date().toISOString()} (${fallbackReason})`);
    const fallback = buildFallbackResponse();
    const meta = getExposureMeta([], fallback.exposure, true);
    localStorage.setItem('hp_reco', meta.rec);
    render([], meta, fallback.message, true, fallback.requestId, true, null);
  }
}

form?.addEventListener('submit', (e)=>{ e.preventDefault(); runScan(); });

['fullName','cityState'].forEach((id)=>{
  const input = document.getElementById(id);
  if (input) {
    input.addEventListener('input', ()=>{
      const value = input.value.trim();
      if (value) setFieldError(id, '');
    });
  }
});

// Optional: prefill via query params
(function(){
  const p = new URLSearchParams(location.search);
  const n = p.get('name');
  const l = p.get('location');
  if (n) document.getElementById('fullName').value = n;
  if (l) document.getElementById('cityState').value = l;
})();
