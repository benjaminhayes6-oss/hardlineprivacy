// Hardline Privacy - Exposure Scanner conversion flow
const form = document.getElementById('scanForm');
const resultsEl = document.getElementById('results');
const SCAN_TIMEOUT_MS = 12000;

const FALLBACK_RESULT = {
  success: true,
  requestId: '',
  results: [],
  message: 'Partial scan: one or more sources were unavailable. Results may be incomplete.'
};

const CATEGORY_RULES = [
  { key: 'address', pattern: /address|property|residen|location|home/i },
  { key: 'phone', pattern: /phone|mobile|cell|number|caller/i },
  { key: 'relatives', pattern: /relative|associate|family|household/i },
  { key: 'history', pattern: /histor|past|previous|archive/i },
  { key: 'profile', pattern: /people|profile|directory|broker|record/i }
];

function setResultsHTML(html) {
  if (!resultsEl) return;
  requestAnimationFrame(() => {
    resultsEl.innerHTML = html;
    animateExposureMeter();
    resultsEl.scrollIntoView({ behavior: 'auto', block: 'start' });
  });
}

function generateRequestId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `hp-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function setFieldError(fieldId, message) {
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

function normalizeApiResponse(data) {
  if (!data || typeof data !== 'object') return data;
  const mapped = { ...data };
  if (mapped.ok === true && mapped.success !== true) mapped.success = true;
  if (!Array.isArray(mapped.results)) {
    if (Array.isArray(mapped.items)) mapped.results = mapped.items;
    else if (Array.isArray(mapped.data)) mapped.results = mapped.data;
    else if (Array.isArray(mapped.listings)) mapped.results = mapped.listings;
    else if (mapped.results && Array.isArray(mapped.results.items)) mapped.results = mapped.results.items;
  }
  if (!mapped.requestId && typeof mapped.request_id === 'string') mapped.requestId = mapped.request_id;
  return mapped;
}

function detectExposureIndicators(items) {
  const found = new Set();
  for (const item of (items || [])) {
    const text = `${item?.title || ''} ${item?.snippet || ''} ${item?.link || item?.url || ''}`;
    for (const rule of CATEGORY_RULES) {
      if (rule.pattern.test(text)) found.add(rule.key);
    }
  }
  return {
    address: found.has('address'),
    phone: found.has('phone'),
    relatives: found.has('relatives'),
    history: found.has('history'),
    profile: found.has('profile')
  };
}

function getExposureLevel(items, limitedVisibility) {
  const count = (items || []).length;
  if (count >= 7) return 'HIGH';
  if (count >= 3) return 'MODERATE';
  if (count >= 1) return 'LOW';
  if (limitedVisibility) return 'MODERATE';
  return 'LOW';
}

function levelToScore(level) {
  if (level === 'HIGH') return 92;
  if (level === 'MODERATE') return 64;
  return 28;
}

function renderScanResult(payload) {
  const items = Array.isArray(payload.results) ? payload.results : [];
  const limitedVisibility = Boolean(payload.limitedVisibility);
  const level = getExposureLevel(items, limitedVisibility);
  const indicators = detectExposureIndicators(items);

  const line = (active, text) => `<li>${active ? '•' : '•'} ${text}${active ? ' detected' : ' possible'}</li>`;

  const html = `
    <section class="callout">
      <h2 style="margin:0">Exposure Scan Completed</h2>
      <ul class="scan-checks">
        <li>✔ Broker networks scanned</li>
        <li>✔ People-search databases checked</li>
        <li>✔ Exposure analysis generated</li>
      </ul>
      <div class="small" style="margin-top:8px">Request ID: ${escapeHtml(payload.requestId || generateRequestId())}</div>
      ${limitedVisibility ? '<div class="small" style="margin-top:6px">Partial scan coverage detected. Results are based on currently available sources.</div>' : ''}
    </section>

    <section class="callout">
      <h3 style="margin:0">Live Exposure Meter</h3>
      <div class="meter-head">
        <div class="small">LOW · MODERATE · HIGH</div>
        <div class="meter-level">Exposure Level: ${level}</div>
      </div>
      <div class="meter-bar" aria-label="Exposure level meter">
        <div class="meter-fill" id="meterFill" data-target="${levelToScore(level)}"></div>
      </div>
      <div class="small" style="margin-top:8px">Exposure levels are calculated based on publicly searchable data patterns associated with your search query.</div>
    </section>

    <section class="callout">
      <h3 style="margin:0">Your Personal Exposure Snapshot</h3>
      <ul class="snapshot-list">
        ${line(indicators.address, 'Address listings found on people-search networks')}
        ${line(indicators.phone, 'Phone number associations')}
        ${line(indicators.relatives, 'Relative and associate records visible')}
        ${line(indicators.history, 'Historical address records indexed')}
      </ul>
      <div class="small" style="margin-top:8px">These listings are commonly published by data broker networks and may appear across multiple search platforms.</div>
    </section>

    <section class="callout">
      <h3 style="margin:0">Example Listing Sources</h3>
      <ul class="source-list">
        <li>Whitepages</li>
        <li>Spokeo</li>
        <li>People-search databases</li>
        <li>Property record indexes</li>
      </ul>
      <div class="small" style="margin-top:8px">This section shows listing source types and not specific personal records.</div>
    </section>

    <section class="callout">
      <h3 style="margin:0">Why Exposure Matters</h3>
      <ul class="risk-list">
        <li>Identity theft and impersonation attempts</li>
        <li>Targeted scams and social engineering</li>
        <li>Harassment, stalking, and household targeting</li>
        <li>Property exposure and unsolicited contact</li>
      </ul>
      <div class="small" style="margin-top:8px">Most individuals never intentionally publish this information. Data brokers collect it from public records and aggregators.</div>
    </section>

    <section class="callout">
      <h3 style="margin:0">Start Reducing Your Exposure</h3>
      <div class="action-buttons">
        <a class="btn primary" href="/pricing?rec=sub#plans">Protect My Information</a>
        <a class="btn outline" href="/pricing#plans">View Protection Plans</a>
      </div>
      <div class="small" style="margin-top:10px">Most clients begin by removing existing listings and enabling monitoring to prevent their information from returning.</div>
    </section>
  `;

  setResultsHTML(html);
  if (typeof window.hpTrack === 'function') {
    window.hpTrack('scan_completed', {
      risk_level: level.toLowerCase(),
      result_count: items.length,
      partial_scan: limitedVisibility
    });
  }
}

function animateExposureMeter() {
  const meter = document.getElementById('meterFill');
  if (!meter) return;
  const target = Math.max(0, Math.min(100, Number(meter.dataset.target || 0)));
  requestAnimationFrame(() => {
    meter.style.width = `${target}%`;
  });
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

function buildFallbackResponse() {
  return {
    ...FALLBACK_RESULT,
    requestId: generateRequestId(),
    limitedVisibility: true
  };
}

async function runScan() {
  const name = document.getElementById('fullName')?.value.trim();
  const state = document.getElementById('state')?.value.trim();
  const city = document.getElementById('city')?.value.trim();
  const aliases = document.getElementById('aliases')?.value.trim();

  setFieldError('fullName', name ? '' : 'Please enter a full name.');
  setFieldError('state', state ? '' : 'Please select a state.');
  if (!name || !state) return;

  const query = [name, city ? `${city}, ${state}` : state, aliases].filter(Boolean).join(' ');
  const q = encodeURIComponent(query);
  setResultsHTML('<div class="callout">Running scan...</div>');

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SCAN_TIMEOUT_MS);
    let response;
    try {
      response = await fetch(`/api/search?q=${q}&name=${encodeURIComponent(name)}&state=${encodeURIComponent(state)}&city=${encodeURIComponent(city || '')}`, { signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = buildFallbackResponse();
    }

    data = normalizeApiResponse(data);
    if (!response.ok || !data || data.success !== true || !Array.isArray(data.results)) {
      data = {
        ...buildFallbackResponse(),
        message: (typeof data?.error === 'string' && data.error.trim()) ? data.error.trim() : FALLBACK_RESULT.message
      };
    }

    if (!data.requestId) data.requestId = generateRequestId();
    renderScanResult(data);
  } catch {
    renderScanResult(buildFallbackResponse());
  }
}

form?.addEventListener('submit', (event) => {
  event.preventDefault();
  runScan();
});

['fullName', 'state', 'city'].forEach((id) => {
  const input = document.getElementById(id);
  if (!input) return;
  const eventName = input.tagName === 'SELECT' ? 'change' : 'input';
  input.addEventListener(eventName, () => {
    if (input.value.trim()) setFieldError(id, '');
  });
});

function initStateSelect() {
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
  Array.from(select.options).forEach((opt, index) => {
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

  function syncFromSelect() {
    const selected = select.options[select.selectedIndex] || select.options[0];
    trigger.textContent = selected?.textContent?.trim() || 'Select your state';
    optionEls.forEach((opt, idx) => {
      const isSelected = opt.dataset.value === select.value;
      opt.setAttribute('aria-selected', isSelected ? 'true' : 'false');
      opt.classList.toggle('is-active', idx === activeIndex);
      if (isSelected) activeIndex = idx;
    });
  }

  function closeList() {
    wrapper.classList.remove('is-open');
    trigger.setAttribute('aria-expanded', 'false');
  }

  function openList() {
    wrapper.classList.add('is-open');
    trigger.setAttribute('aria-expanded', 'true');
  }

  trigger.addEventListener('click', () => {
    if (wrapper.classList.contains('is-open')) closeList();
    else openList();
  });

  list.addEventListener('click', (event) => {
    const optionEl = event.target.closest('.hp-select-option');
    if (!optionEl || optionEl.getAttribute('aria-disabled') === 'true') return;
    select.value = optionEl.dataset.value || '';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    syncFromSelect();
    closeList();
    trigger.focus();
  });

  document.addEventListener('click', (event) => {
    if (!wrapper.contains(event.target)) closeList();
  });

  select.addEventListener('change', syncFromSelect);
  syncFromSelect();
  return { sync: syncFromSelect };
}

const stateControl = initStateSelect();
(function prefillFromQuery() {
  const params = new URLSearchParams(location.search);
  const name = params.get('name');
  const state = params.get('state');
  const city = params.get('city');
  if (name) document.getElementById('fullName').value = name;
  if (state) document.getElementById('state').value = state;
  if (city) document.getElementById('city').value = city;
  if (stateControl) stateControl.sync();
})();
