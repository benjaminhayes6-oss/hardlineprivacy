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
  if (primaryNav) {
    const scanLink = primaryNav.querySelector("a[href='/scan']");
    if (scanLink) scanLink.classList.add("scan-link");
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
  const createMobileStickyCta = () => {
    if (document.querySelector(".mobile-sticky-cta")) return;
    const bar = document.createElement("div");
    bar.className = "mobile-sticky-cta";
    bar.innerHTML = `
      <a class="mobile-cta-secondary" href="/pricing">View Plans</a>
      <a class="mobile-cta-primary" href="/scan">Run Free Scan</a>
    `;
    document.body.appendChild(bar);
    document.body.classList.add("has-mobile-cta");
  };

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
  createMobileStickyCta();

  const injectNewsletterSignup = () => {
    if (document.querySelector(".newsletter-signup")) return;
    const footer = document.querySelector("footer");
    if (!footer || !footer.parentNode) return;

    const section = document.createElement("section");
    section.className = "newsletter-signup";
    section.setAttribute("aria-label", "Privacy newsletter signup");
    section.innerHTML = `
      <div class="newsletter-wrap">
        <h2>Get Privacy Law Alerts and Broker Takedown Tips</h2>
        <p>Receive practical 2026 privacy law updates and exposure-reduction guidance. Only an email address is required.</p>
        <form name="newsletter-signup" method="POST" data-netlify="true" netlify-honeypot="bot-field">
          <input type="hidden" name="form-name" value="newsletter-signup">
          <p hidden aria-hidden="true"><label>Do not fill this out <input name="bot-field"></label></p>
          <input type="email" name="email" autocomplete="email" required placeholder="Email address">
          <button class="btn-primary" type="submit">Subscribe</button>
        </form>
        <div class="newsletter-status" aria-live="polite"></div>
        <div class="newsletter-note">No spam. Unsubscribe at any time.</div>
      </div>
    `;
    footer.parentNode.insertBefore(section, footer);

    const form = section.querySelector("form");
    const status = section.querySelector(".newsletter-status");
    if (!form || !status) return;
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const body = new URLSearchParams(formData).toString();
      status.textContent = "Submitting...";
      status.classList.remove("error");
      try {
        const response = await fetch("/__forms.html", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body
        });
        if (!response.ok) {
          throw new Error("Submit failed");
        }
        form.reset();
        status.textContent = "Subscribed. New privacy updates will be sent soon.";
      } catch (error) {
        status.textContent = "Unable to subscribe right now. Please try again.";
        status.classList.add("error");
      }
    });
  };
  injectNewsletterSignup();

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

  function appendArticleSchema(){
    var pathname = window.location.pathname.replace(/\/+$/, '');
    if (!pathname.startsWith('/blog/') || pathname === '/blog') return;
    if (document.getElementById('hp-article-schema')) return;
    var headlineEl = document.querySelector('main h1, .hero h1, h1');
    var headline = headlineEl ? headlineEl.textContent.trim() : document.title.replace(/\s*\|\s*Hardline Privacy$/i,'').trim();
    if (!headline) return;
    var descMeta = document.querySelector('meta[name=\"description\"]');
    var description = descMeta && descMeta.content ? descMeta.content.trim() : '';
    var canonical = document.querySelector('link[rel=\"canonical\"]');
    var url = canonical && canonical.href ? canonical.href : ('https://hardlineprivacy.com' + pathname);
    var imageMeta = document.querySelector('meta[property=\"og:image\"]');
    var image = imageMeta && imageMeta.content ? imageMeta.content : 'https://hardlineprivacy.com/assets/images/hardline-og-dark.png';
    var pubMeta = document.querySelector('meta[name=\"article:published_time\"]');
    var modMeta = document.querySelector('meta[name=\"article:modified_time\"]');
    var published = pubMeta && pubMeta.content ? pubMeta.content : '2026-03-14';
    var modified = modMeta && modMeta.content ? modMeta.content : '2026-03-14';
    var schemaScript = document.createElement('script');
    schemaScript.type = 'application/ld+json';
    schemaScript.id = 'hp-article-schema';
    schemaScript.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Article',
      'headline': headline,
      'description': description,
      'image': [image],
      'author': {
        '@type': 'Organization',
        'name': 'Hardline Privacy Editorial Team'
      },
      'publisher': {
        '@type': 'Organization',
        'name': 'Hardline Privacy',
        'logo': {
          '@type': 'ImageObject',
          'url': 'https://hardlineprivacy.com/assets/images/logo-light.png'
        }
      },
      'mainEntityOfPage': url,
      'datePublished': published,
      'dateModified': modified
    });
    document.head.appendChild(schemaScript);
  }

  function appendFaqSchemaFromPage(){
    if (document.getElementById('hp-faq-schema')) return;
    var faqItems = Array.from(document.querySelectorAll('[data-faq-item]'));
    if (!faqItems.length) return;
    var entities = faqItems.map(function(item){
      var q = item.querySelector('[data-faq-question]');
      var a = item.querySelector('[data-faq-answer]');
      if (!q || !a) return null;
      return {
        '@type': 'Question',
        'name': q.textContent.trim(),
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': a.textContent.trim()
        }
      };
    }).filter(Boolean);
    if (!entities.length) return;
    var schemaScript = document.createElement('script');
    schemaScript.type = 'application/ld+json';
    schemaScript.id = 'hp-faq-schema';
    schemaScript.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      'mainEntity': entities
    });
    document.head.appendChild(schemaScript);
  }

  bindFormConsent();
  bindConsentLinks();
  initAnalytics();
  applyCtaVariants();
  initDynamicStats();
  appendSitewideSchemas();
  appendArticleSchema();
  appendFaqSchemaFromPage();
})();
