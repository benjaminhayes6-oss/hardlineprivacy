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
  if (count >= 8 || brokerHits.length >= 4) return 'high';
  if (count >= 4 || brokerHits.length >= 2) return 'elevated';
  if (count >= 1) return 'moderate';
  if (limitedVisibility) return 'moderate';
  return 'low';
}

function getExposureMeta(items, exposure, limitedVisibility){
  const count = (items || []).length;
  const brokerHits = collectBrokerHits(items);
  const level = normalizeExposureLevel(count, brokerHits, limitedVisibility);
  if (level === 'high') return { level:'high', label:'High Exposure', rec:'pro', brokerHits };
  if (level === 'elevated') return { level:'elevated', label:'Elevated Exposure', rec:'pro', brokerHits };
  if (level === 'low') return { level:'low', label:'Low Exposure', rec:'sub', brokerHits };
  return { level:'moderate', label:'Moderate Exposure', rec:'sub', brokerHits };
}

function riskPill(level,label){
  const cls = level==='low' ? 'risk-low' : level==='high' ? 'risk-high' : level==='elevated' ? 'risk-high' : 'risk-mod';
  return `<span class="risk-pill ${cls}">${label}</span>`;
}

function recommendationBlock(rec){
  const map = {
    sub: { title:'Recommended for you: Ongoing Privacy Monitoring', href:'/pricing?rec=sub#plans', cta:'Protect My Information' },
    pro: { title:'Recommended for you: Enhanced / High‑Risk Protection', href:'/pricing?rec=pro#plans', cta:'Protect My Information' }
  };
  const r = map[rec] || map.sub;
  return `
    <div class="callout">
      <div class="cta-box">
        <div>
          <div style="font-weight:900">${r.title}</div>
          <div class="small">Most removals complete in 7–21 days depending on the site.</div>
          <div class="small" style="margin-top:6px">No credit card required to view protection options.</div>
        </div>
        <div>
          <a class="btn primary" href="${r.href}">${r.cta}</a>
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

  const headerLabel = isPartial ? 'Partial Scan' : 'Scan Complete';
  const pillLabel = isPartial ? 'Exposure Analysis Complete' : label;
  const pillLevel = isPartial ? 'moderate' : level;
  const levels = [
    { key:'low', label:'Low' },
    { key:'moderate', label:'Moderate' },
    { key:'elevated', label:'Elevated' },
    { key:'high', label:'High' }
  ];
  const riskLevels = levels.map((l)=>{
    const active = l.key === pillLevel;
    const cls = `${l.key} ${active ? 'active' : ''}`.trim();
    return `<div class="risk-level ${cls}">${l.label}</div>`;
  }).join('');
  const exposureBlock = `
      <div class="risk-panel">
        <div class="risk-title">Estimated Risk Level</div>
        <div class="risk-levels">${riskLevels}</div>
        <div class="small" style="margin-top:8px">Based on the number and type of results returned from publicly accessible sources. This is an informational estimate, not a guarantee of removal or search rank changes.</div>
      </div>
      <div class="risk-categories">
        <div class="risk-title">Exposure Categories</div>
        <ul class="small">
          <li>People-search databases</li>
          <li>Phone aggregators</li>
          <li>Address history networks</li>
        </ul>
        <div class="small" style="margin-top:6px">Categories reflect the most common sources that surface public listings.</div>
      </div>
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
    ${recommendationBlock(rec)}
    <div class="callout items-list">
      <h3 style="margin:0 0 6px">Results</h3>
      <div class="small">Showing up to 15 top results from available free sources.</div>
      ${hasFallbackResults ? `<div class="small" style="margin-top:6px">These are example exposure categories shown because the scan sources were temporarily unavailable.</div>` : ''}
      ${list}
    </div>
    <div class="small" style="margin-top:14px">This scan does not access private databases or bypass protections. Results reflect publicly accessible listings and may change over time.</div>
  `);
}

function escapeHtml(s){
  return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function initStateSelect(){
  const select = document.getElementById('state');
  if (!select || select.dataset.hpSelect === 'ready') return null;
  select.dataset.hpSelect = 'ready';
  select.classList.add('hp-select-native');

  const wrapper = document.createElement('div');
  wrapper.className = 'hp-select';
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'hp-select-trigger';
  trigger.setAttribute('role', 'combobox');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-haspopup', 'listbox');
  const list = document.createElement('div');
  list.className = 'hp-select-list';
  list.setAttribute('role', 'listbox');
  list.id = `state-listbox-${Math.random().toString(36).slice(2, 8)}`;
  trigger.setAttribute('aria-controls', list.id);

  wrapper.append(trigger, list);
  select.insertAdjacentElement('afterend', wrapper);

  const optionEls = [];
  const options = Array.from(select.options);
  options.forEach((opt, index) => {
    const optionEl = document.createElement('div');
    optionEl.className = 'hp-select-option';
    optionEl.setAttribute('role', 'option');
    optionEl.setAttribute('aria-selected', 'false');
    optionEl.dataset.value = opt.value;
    optionEl.dataset.index = String(index);
    optionEl.id = `${list.id}-option-${index}`;
    optionEl.textContent = opt.textContent;
    if (opt.disabled) optionEl.setAttribute('aria-disabled', 'true');
    list.appendChild(optionEl);
    optionEls.push(optionEl);
  });

  let activeIndex = Math.max(select.selectedIndex, 0);

  function isDisabled(index){
    return optionEls[index]?.getAttribute('aria-disabled') === 'true';
  }

  function findNextEnabled(start, direction){
    let idx = start;
    while (idx >= 0 && idx < optionEls.length && isDisabled(idx)) {
      idx += direction;
    }
    if (idx < 0 || idx >= optionEls.length) return start;
    return idx;
  }

  function updateActive(index, shouldScroll){
    optionEls.forEach((opt, idx) => {
      opt.classList.toggle('is-active', idx === index);
    });
    const active = optionEls[index];
    if (active) {
      trigger.setAttribute('aria-activedescendant', active.id);
      if (shouldScroll) active.scrollIntoView({ block: 'nearest' });
    }
  }

  function syncFromSelect(){
    const selected = select.options[select.selectedIndex] || select.options[0];
    trigger.textContent = selected?.textContent?.trim() || 'Select your state';
    optionEls.forEach((opt, idx) => {
      const isSelected = opt.dataset.value === select.value;
      opt.setAttribute('aria-selected', isSelected ? 'true' : 'false');
      if (isSelected) activeIndex = idx;
    });
    updateActive(activeIndex, false);
  }

  function openList(){
    if (wrapper.classList.contains('is-open')) return;
    wrapper.classList.add('is-open');
    trigger.setAttribute('aria-expanded', 'true');
    activeIndex = findNextEnabled(activeIndex, 1);
    updateActive(activeIndex, true);
  }

  function closeList(){
    if (!wrapper.classList.contains('is-open')) return;
    wrapper.classList.remove('is-open');
    trigger.setAttribute('aria-expanded', 'false');
  }

  function selectIndex(index){
    const optionEl = optionEls[index];
    if (!optionEl || optionEl.getAttribute('aria-disabled') === 'true') return;
    select.value = optionEl.dataset.value || '';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    syncFromSelect();
  }

  trigger.addEventListener('click', () => {
    if (wrapper.classList.contains('is-open')) closeList();
    else openList();
  });

  trigger.addEventListener('keydown', (event) => {
    const { key } = event;
    if (key === 'ArrowDown' || key === 'ArrowUp') {
      event.preventDefault();
      if (!wrapper.classList.contains('is-open')) openList();
      const direction = key === 'ArrowDown' ? 1 : -1;
      activeIndex = findNextEnabled(activeIndex + direction, direction);
      updateActive(activeIndex, true);
      return;
    }
    if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      if (!wrapper.classList.contains('is-open')) {
        openList();
      } else {
        selectIndex(activeIndex);
        closeList();
      }
      return;
    }
    if (key === 'Escape') {
      event.preventDefault();
      closeList();
    }
  });

  list.addEventListener('click', (event) => {
    const optionEl = event.target.closest('.hp-select-option');
    if (!optionEl) return;
    selectIndex(Number(optionEl.dataset.index || 0));
    closeList();
    trigger.focus();
  });

  document.addEventListener('click', (event) => {
    if (!wrapper.contains(event.target)) closeList();
  });

  select.addEventListener('change', syncFromSelect);
  syncFromSelect();

  return { sync: syncFromSelect, trigger };
}

function isValidEmail(value){
  return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(String(value||'').trim());
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
  if (input?.classList?.contains('hp-select-native')) {
    const trigger = input.nextElementSibling?.querySelector('.hp-select-trigger');
    if (trigger) {
      if (message) trigger.setAttribute('aria-invalid', 'true');
      else trigger.removeAttribute('aria-invalid');
    }
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
  const email = document.getElementById('email')?.value.trim() || '';
  const state = document.getElementById('state')?.value.trim();
  const city = document.getElementById('city')?.value.trim();
  const aliases = document.getElementById('aliases')?.value.trim();
  setFieldError('fullName', name ? '' : 'Please enter a full name.');
  setFieldError('state', state ? '' : 'Please select a state.');
  if (!name || !state) return;

  const location = city ? `${city}, ${state}` : state;
  const query = [name, location, aliases].filter(Boolean).join(' ');
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
        `/api/search?q=${q}&name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}&state=${encodeURIComponent(state)}&city=${encodeURIComponent(city || '')}`,
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
    const errorMessage = data && data.success === false && typeof data.error === 'string'
      ? data.error.trim()
      : '';
    if (!res.ok) {
      usedFallback = true;
      fallbackReason = fallbackReason || `status-${res.status}`;
      data = errorMessage ? { ...buildFallbackResponse(), message: errorMessage } : buildFallbackResponse();
    }
    if (!data || data?.success !== true || !Array.isArray(data.results)) {
      usedFallback = true;
      fallbackReason = fallbackReason || 'invalid-payload';
      data = errorMessage ? { ...buildFallbackResponse(), message: errorMessage } : buildFallbackResponse();
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
    showPostScanPrompt({ name, state, city, requestId });
  }catch(err){
    const fallbackReason = err?.name === 'AbortError' ? 'timeout' : 'network';
    console.log(`[scan-fallback] ${new Date().toISOString()} (${fallbackReason})`);
    const fallback = buildFallbackResponse();
    const meta = getExposureMeta([], fallback.exposure, true);
    localStorage.setItem('hp_reco', meta.rec);
    render([], meta, fallback.message, true, fallback.requestId, true, null);
    showPostScanPrompt({ name, state, city, requestId: fallback.requestId });
  }
}

form?.addEventListener('submit', (e)=>{ e.preventDefault(); runScan(); });

['fullName','state','city'].forEach((id)=>{
  const input = document.getElementById(id);
  if (input) {
    const eventName = input.tagName === 'SELECT' ? 'change' : 'input';
    input.addEventListener(eventName, ()=>{
      const value = input.value.trim();
      if (value) setFieldError(id, '');
    });
  }
});

const stateSelectControl = initStateSelect();

// Optional: prefill via query params
(function(){
  const p = new URLSearchParams(location.search);
  const n = p.get('name');
  const e = p.get('email');
  const s = p.get('state');
  const c = p.get('city');
  if (n) document.getElementById('fullName').value = n;
  if (e && document.getElementById('email')) document.getElementById('email').value = e;
  if (s) document.getElementById('state').value = s;
  if (c) document.getElementById('city').value = c;
  if (stateSelectControl) stateSelectControl.sync();
})();

function showPostScanPrompt(details){
  const prompt = document.getElementById('postScanPrompt');
  if (!prompt) return;
  prompt.style.display = 'block';
  if (details?.requestId) {
    const requestId = document.getElementById('monitoringRequestId');
    if (requestId) requestId.value = details.requestId;
  }
  if (details?.name) {
    const nameField = document.getElementById('monitoringName');
    if (nameField) nameField.value = details.name;
  }
  if (details?.state) {
    const stateField = document.getElementById('monitoringState');
    if (stateField) stateField.value = details.state;
  }
  if (details?.city) {
    const cityField = document.getElementById('monitoringCity');
    if (cityField) cityField.value = details.city;
  }
}

const monitoringForm = document.getElementById('monitoringForm');
const monitoringStatus = document.getElementById('monitoringStatus');

function setMonitoringStatus(message, isError){
  if (!monitoringStatus) return;
  monitoringStatus.textContent = message || '';
  monitoringStatus.style.color = isError ? '#fca5a5' : 'var(--muted)';
}

monitoringForm?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const email = document.getElementById('monitoringEmail')?.value.trim() || '';
  const phone = document.getElementById('monitoringPhone')?.value.trim() || '';
  if (!email && !phone) {
    setMonitoringStatus('Please provide an email or phone to request monitoring updates.', true);
    return;
  }
  if (email && !isValidEmail(email)) {
    setMonitoringStatus('Please enter a valid email address.', true);
    return;
  }
  setMonitoringStatus('Submitting request...', false);
  try {
    const response = await fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(new FormData(monitoringForm)).toString()
    });
    if (!response.ok) throw new Error('submission-failed');
    setMonitoringStatus('Thanks! Monitoring updates will be sent to the contact info provided.', false);
    monitoringForm.reset();
  } catch {
    setMonitoringStatus('Unable to submit right now. Please try again later.', true);
  }
});

['monitoringEmail','monitoringPhone'].forEach((id)=>{
  const input = document.getElementById(id);
  if (!input) return;
  input.addEventListener('input', ()=>{ setMonitoringStatus('', false); });
});
