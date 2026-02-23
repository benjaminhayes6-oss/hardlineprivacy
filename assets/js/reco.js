// Hardline Privacy - highlight recommended plan
(function(){
  const p = new URLSearchParams(location.search);
  const rec = (p.get('rec') || localStorage.getItem('hp_reco') || '').toLowerCase();
  const ids = { one:'tier-one', sub:'tier-sub', pro:'tier-pro' };
  // clear
  Object.values(ids).forEach(id => document.getElementById(id)?.classList.remove('recommended'));

  const chosen = ids[rec] || ids.sub;
  const el = document.getElementById(chosen);
  if (el){
    el.classList.add('recommended');
    // ensure the badge text is visible only on recommended
    // scroll gently if user came from scan
    if (location.hash === '#plans') el.scrollIntoView({behavior:'smooth', block:'start'});
  }
})();
