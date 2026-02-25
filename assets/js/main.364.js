/* Hardline Privacy – main.364.js */

(function(){

/* ================================
   MOBILE MENU SYSTEM (PRIMARY)
================================ */

const toggle = document.querySelector('.menu-toggle');
const nav = toggle ? toggle.closest('.nav').querySelector('nav') : null;

if(toggle && nav){

  toggle.addEventListener('click', () => {

    const expanded =
      toggle.getAttribute('aria-expanded') === 'true';

    toggle.setAttribute('aria-expanded', String(!expanded));
    nav.classList.toggle('open');
  });

  /* Close when link clicked */
  nav.querySelectorAll('a').forEach(link=>{
    link.addEventListener('click',()=>{
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded','false');
    });
  });

  /* Close when clicking outside */
  document.addEventListener('click',e=>{
    if(
      nav.classList.contains('open') &&
      !nav.contains(e.target) &&
      !toggle.contains(e.target)
    ){
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded','false');
    }
  });
}


/* ================================
   CONSENT SYSTEM
================================ */

function getConsentVersion(){
  return document.body.getAttribute('data-consent-version') || '2026-02-16';
}

function storeConsent(context){
  try{
    const payload={
      version:getConsentVersion(),
      timestamp:new Date().toISOString(),
      context:context||'general'
    };
    localStorage.setItem('hp_consent',JSON.stringify(payload));
  }catch(e){}
}

function bindFormConsent(){

  document.querySelectorAll('form[data-requires-consent]')
  .forEach(form=>{

    const checkbox=form.querySelector('[data-consent-checkbox]');
    const errorEl=form.querySelector('.consent-error');

    if(checkbox){
      checkbox.addEventListener('change',()=>{
        if(errorEl) errorEl.textContent='';
      });
    }

    form.addEventListener('submit',e=>{

      if(checkbox && !checkbox.checked){
        e.preventDefault();
        if(errorEl)
          errorEl.textContent='Please confirm you agree before continuing.';
        checkbox.focus();
        return;
      }

      if(checkbox){
        storeConsent(form.id || form.name || 'form');
      }
    });
  });
}


/* ================================
   CONSENT LINKS
================================ */

function bindConsentLinks(){

  document.querySelectorAll('[data-consent-target]')
  .forEach(link=>{

    link.addEventListener('click',e=>{

      const checkbox =
        document.getElementById(link.dataset.consentTarget);

      const errorEl =
        document.getElementById(link.dataset.consentError);

      if(checkbox && !checkbox.checked){
        e.preventDefault();
        if(errorEl)
          errorEl.textContent='Please confirm you agree before continuing.';
        checkbox.focus();
        return;
      }

      storeConsent('purchase');
    });
  });
}


/* ================================
   CTA VARIANTS
================================ */

function applyCtaVariants(){

  const params=new URLSearchParams(location.search);
  let src=(params.get('src')||'meta').toLowerCase();

  if(src!=='meta' && src!=='google') src='meta';

  document.querySelectorAll('.cta-variant').forEach(el=>{

    const raw =
      src==='meta'
      ? el.dataset.ctaMeta
      : el.dataset.ctaGoogle;

    if(!raw) return;

    const labels=raw.split('|')
      .map(v=>v.trim())
      .filter(Boolean);

    if(!labels.length) return;

    el.textContent=
      labels[Math.floor(Math.random()*labels.length)];
  });
}


/* ================================
   STICKY CTA
================================ */

function initStickyCta(){

  if(document.querySelector('.sticky-cta')) return;

  const cta=document.createElement('a');

  cta.className='btn primary sticky-cta';
  cta.href='/scan';
  cta.setAttribute('aria-label','Run Free Exposure Scan');
  cta.textContent='Run Free Exposure Scan';

  document.body.appendChild(cta);
}


/* ================================
   DYNAMIC STATS
================================ */

function initDynamicStats(){

  document.querySelectorAll('[data-stat-range]')
  .forEach(el=>{

    const range=el.dataset.statRange
      .split('-')
      .map(v=>parseInt(v,10));

    if(range.length<2) return;

    let [min,max]=range;

    if(max<min)[min,max]=[max,min];

    const target=Math.round(
      min + Math.random()*(max-min)
    );

    const prefix=el.dataset.statPrefix||'';
    const suffix=el.dataset.statSuffix||'';
    const duration=parseInt(el.dataset.statDuration||'900',10);

    let start=null;

    function step(ts){

      if(!start) start=ts;

      const progress=Math.min((ts-start)/duration,1);

      el.textContent=
        prefix+
        Math.floor(target*progress)+
        suffix;

      if(progress<1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  });
}


/* ================================
   INIT
================================ */

bindFormConsent();
bindConsentLinks();
applyCtaVariants();
initStickyCta();
initDynamicStats();

})();
