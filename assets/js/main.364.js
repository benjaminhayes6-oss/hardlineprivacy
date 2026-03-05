/* Hardline Privacy – main.364.js */
document.addEventListener("DOMContentLoaded", () => {
  const navHeaders = document.querySelectorAll("header.nav");
  if (navHeaders.length > 1) {
    navHeaders.forEach((header, index) => {
      if (index > 0) header.remove();
    });
  }

  const primaryNav = document.querySelector("header.nav nav");
  if (primaryNav) {
    const scanLinks = Array.from(primaryNav.querySelectorAll("a[href='/scan']"));
    scanLinks.forEach((link, index) => {
      if (index > 0) link.remove();
    });
  }

  const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
  if (pathname === "/founder" || pathname === "/resources") {
    const mainHeader = document.querySelector("header.nav");
    if (mainHeader) mainHeader.classList.add("no-sticky");
  }

  document.querySelectorAll(".scan-cta, .scan-btn, [data-scan-link]").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      const isAnchor = btn.tagName.toLowerCase() === "a";
      const href = isAnchor ? btn.getAttribute("href") : null;
      if (!isAnchor || !href) {
        event.preventDefault();
        window.location.href = "/scan";
      }
    });
  });

  document.addEventListener("click", (event) => {
    const scanTarget = event.target.closest("a[href='/scan'], a[href='/scan/']");
    if (!scanTarget) return;
    const href = scanTarget.getAttribute("href");
    if (!href) {
      event.preventDefault();
      window.location.href = "/scan";
    }
  });

  const toggle = document.querySelector("header.nav .menu-toggle");
  const nav = document.querySelector("header.nav nav");

  const ensureAuthorityHubLinks = () => {
    const headerNav = document.querySelector("header.nav nav");
    if (headerNav && !headerNav.querySelector("a[href='/authority-hub']")) {
      const link = document.createElement("a");
      link.href = "/authority-hub";
      link.textContent = "Authority Hub";

      const pricing = headerNav.querySelector("a[href='/pricing']");
      if (pricing) {
        headerNav.insertBefore(link, pricing);
      } else {
        headerNav.appendChild(link);
      }
    }

    document.querySelectorAll(".footer-links").forEach((footerLinks) => {
      if (!footerLinks.querySelector("a[href='/authority-hub']")) {
        const link = document.createElement("a");
        link.href = "/authority-hub";
        link.textContent = "Authority Hub";
        footerLinks.appendChild(link);
      }
    });
  };

  ensureAuthorityHubLinks();

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
  function getGa4MeasurementId(){
    var fromMeta = document.querySelector('meta[name="ga4-measurement-id"]');
    if (fromMeta && fromMeta.content) return fromMeta.content.trim();
    if (typeof window.HARDLINE_GA4_ID === 'string') return window.HARDLINE_GA4_ID.trim();
    var fromData = document.documentElement.getAttribute('data-ga4-id');
    return fromData ? fromData.trim() : '';
  }

  function initAnalytics(){
    window.dataLayer = window.dataLayer || [];
    window.hpTrack = function(eventName, params){
      if (!eventName) return;
      var payload = Object.assign({ event: eventName }, params || {});
      window.dataLayer.push(payload);
      if (typeof window.gtag === 'function') {
        window.gtag('event', eventName, params || {});
      }
    };

    document.querySelectorAll("a[href*='buy.stripe.com'], a[href^='/checkout/'], button[data-checkout-plan]").forEach(function(el){
      el.addEventListener('click', function(){
        var href = el.getAttribute('href') || '';
        var plan = el.getAttribute('data-checkout-plan') || href.split('/checkout/')[1] || 'unknown';
        window.hpTrack('checkout_clicked', {
          plan: plan
        });
      });
    });

    if (window.location.pathname.replace(/\/+$/, '') === '/pricing') {
      window.hpTrack('pricing_viewed', {
        page_path: '/pricing'
      });
    }

    var measurementId = getGa4MeasurementId();
    if (!/^G-[A-Z0-9]+$/.test(measurementId)) return;

    var gtagScript = document.createElement('script');
    gtagScript.async = true;
    gtagScript.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(measurementId);
    document.head.appendChild(gtagScript);

    window.gtag = function(){ window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', measurementId, {
      send_page_view: true,
      anonymize_ip: true
    });
  }

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

  function appendSitewideSchemas(){
    if(document.getElementById('hp-sitewide-schema')) return;
    var schemaScript=document.createElement('script');
    schemaScript.type='application/ld+json';
    schemaScript.id='hp-sitewide-schema';
    var schema={
      '@context':'https://schema.org',
      '@graph':[
        {
          '@type':'FAQPage',
          'mainEntity':[
            {
              '@type':'Question',
              'name':'How long does removal take?',
              'acceptedAnswer':{
                '@type':'Answer',
                'text':'Most removals begin processing within days, while full suppression and verification across multiple brokers typically takes one to three weeks.'
              }
            },
            {
              '@type':'Question',
              'name':'Why does data reappear?',
              'acceptedAnswer':{
                '@type':'Answer',
                'text':'Data reappears when brokers ingest new feeds from public records, marketing datasets, and partner networks that republish profile details.'
              }
            },
            {
              '@type':'Question',
              'name':'Is this legal?',
              'acceptedAnswer':{
                '@type':'Answer',
                'text':'Yes. Submitting opt-outs and privacy deletion requests to brokers is a lawful consumer-rights workflow in the United States.'
              }
            },
            {
              '@type':'Question',
              'name':'Do you sell my data?',
              'acceptedAnswer':{
                '@type':'Answer',
                'text':'No. Hardline Privacy does not sell client data and uses security-first handling standards for submitted information.'
              }
            },
            {
              '@type':'Question',
              'name':'What makes Hardline different?',
              'acceptedAnswer':{
                '@type':'Answer',
                'text':'Hardline combines human-verified removals, documented escalation workflows, and continuous monitoring focused on reducing repeat exposure.'
              }
            }
          ]
        },
        {
          '@type':'LocalBusiness',
          '@id':'https://hardlineprivacy.com/#localbusiness',
          'name':'Hardline Privacy',
          'url':'https://hardlineprivacy.com',
          'image':'https://hardlineprivacy.com/assets/images/hardline-og-dark.png',
          'address':{
            '@type':'PostalAddress',
            'addressLocality':'Nashville',
            'addressRegion':'Tennessee',
            'addressCountry':'United States'
          },
          'areaServed':'United States'
        }
      ]
    };
    schemaScript.textContent=JSON.stringify(schema);
    document.head.appendChild(schemaScript);
  }

  bindFormConsent();
  bindConsentLinks();
  initAnalytics();
  applyCtaVariants();
  initDynamicStats();
  appendSitewideSchemas();
})();
