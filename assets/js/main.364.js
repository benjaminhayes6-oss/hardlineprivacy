/* Hardline Privacy – main.364.js */
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".scan-cta").forEach((btn) => {
    btn.addEventListener("click", () => {
      console.log("Scan CTA clicked");
    });
  });

  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector("header nav");

  if (!toggle || !nav) return;

  toggle.addEventListener("click", () => {
    const expanded =
      toggle.getAttribute("aria-expanded") === "true";

    toggle.setAttribute("aria-expanded", !expanded);
    nav.classList.toggle("open");
    document.body.classList.toggle("menu-open", !expanded);
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
      document.body.classList.remove("menu-open");
    });
  });

  document.addEventListener("click", (event) => {
    if (nav.classList.contains("open")
      && !nav.contains(event.target)
      && !toggle.contains(event.target)) {
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
      document.body.classList.remove("menu-open");
    }
  });
});

(function(){

  function getConsentVersion(){
    return document.body.getAttribute('data-consent-version') || '2026-02-16';
  }

  function storeConsent(context){
    try{
      var payload={
        version:getConsentVersion(),
        timestamp:new Date().toISOString(),
        context:context||'general'
      };
      localStorage.setItem('hp_consent', JSON.stringify(payload));
    }catch(e){
      /* no-op */
    }
  }

  function bindFormConsent(){
    document.querySelectorAll('form[data-requires-consent]').forEach(function(form){
      var checkbox=form.querySelector('input[data-consent-checkbox]');
      var errorEl=form.querySelector('.consent-error');
      if(checkbox){
        checkbox.addEventListener('change',function(){
          if(errorEl) errorEl.textContent='';
        });
      }
      form.addEventListener('submit',function(e){
        if(checkbox && !checkbox.checked){
          e.preventDefault();
          if(errorEl) errorEl.textContent='Please confirm you agree before continuing.';
          checkbox.focus();
          return;
        }
        if(checkbox && checkbox.checked){
          storeConsent(form.getAttribute('id') || form.getAttribute('name') || 'form');
        }
      });
    });
  }

  function bindConsentLinks(){
    document.querySelectorAll('[data-consent-target]').forEach(function(link){
      link.addEventListener('click',function(e){
        var targetId=link.getAttribute('data-consent-target');
        var errorId=link.getAttribute('data-consent-error');
        var checkbox=targetId ? document.getElementById(targetId) : null;
        var errorEl=errorId ? document.getElementById(errorId) : null;
        if(checkbox && !checkbox.checked){
          e.preventDefault();
          if(errorEl) errorEl.textContent='Please confirm you agree before continuing.';
          checkbox.focus();
          return;
        }
        storeConsent('purchase');
        var href=link.getAttribute('href') || '';
        if(href.indexOf('/checkout/')===0){
          e.preventDefault();
          var plan=href.slice('/checkout/'.length);
          startCheckout(plan, link, errorEl);
        }
      });
    });
  }

  function getCheckoutToken(){
    var meta=document.querySelector('meta[name="checkout-token"]');
    if(meta && meta.content) return meta.content;
    var bodyToken=document.body.getAttribute('data-checkout-token') || '';
    if(bodyToken) return bodyToken;
    return import.meta && import.meta.env && import.meta.env.VITE_CHECKOUT_SECRET ? import.meta.env.VITE_CHECKOUT_SECRET : '';
  }

  async function startCheckout(plan, link, errorEl){
    if(!plan){
      if(errorEl) errorEl.textContent='Please select a valid plan.';
      return;
    }
    var token=getCheckoutToken() || 'REPLACE_ME';
    var originalText=link ? link.textContent : '';
    if(link){
      link.setAttribute('aria-busy','true');
      link.textContent='Preparing checkout...';
    }
    try{
      var res=await fetch('/.netlify/functions/checkout',{
        method:'POST',
        headers:{
          'content-type':'application/json',
          'x-checkout-token':token || 'REPLACE_ME'
        },
        body:JSON.stringify({ plan: plan }),
        redirect:'manual'
      });
      var location=res.headers.get('Location') || res.headers.get('location');
      if(location){
        window.location.assign(location);
        return;
      }
      var data=await res.json();
      if(!res.ok){
        throw new Error(data && data.error ? data.error : 'Checkout failed');
      }
      if(data && data.url){
        window.location.href=data.url;
        return;
      }
      throw new Error('Checkout failed');
    }catch(e){
      if(errorEl) errorEl.textContent='Checkout failed. Please try again or contact support.';
      if(link){
        link.setAttribute('aria-busy','false');
        link.textContent=originalText;
      }
    }
  }

  function applyCtaVariants(){
    var params=new URLSearchParams(window.location.search);
    var src=(params.get('src')||'meta').toLowerCase();
    if(src!=='meta' && src!=='google') src='meta';
    document.querySelectorAll('.cta-variant').forEach(function(el){
      var raw=src==='meta' ? el.getAttribute('data-cta-meta') : el.getAttribute('data-cta-google');
      if(!raw) return;
      var labels=raw.split('|').map(function(label){ return label.trim(); }).filter(Boolean);
      if(!labels.length) return;
      var label=labels[Math.floor(Math.random()*labels.length)];
      if(label) el.textContent=label;
    });
  }

  function initDynamicStats(){
    document.querySelectorAll('[data-stat-range]').forEach(function(el){
      var range=(el.getAttribute('data-stat-range')||'').split('-').map(function(v){ return parseInt(v,10); });
      if(range.length<2 || range.some(function(v){ return Number.isNaN(v); })) return;
      var min=range[0];
      var max=range[1];
      if(max<min){ var tmp=min; min=max; max=tmp; }
      var target=Math.round(min + Math.random()*(max-min));
      var prefix=el.getAttribute('data-stat-prefix')||'';
      var suffix=el.getAttribute('data-stat-suffix')||'';
      var duration=parseInt(el.getAttribute('data-stat-duration')||'900',10);
      var startTime=null;
      function step(ts){
        if(startTime===null) startTime=ts;
        var progress=Math.min((ts-startTime)/duration,1);
        var value=Math.floor(target*progress);
        el.textContent=prefix + value + suffix;
        if(progress<1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  bindFormConsent();
  bindConsentLinks();
  applyCtaVariants();
  initDynamicStats();
})();
