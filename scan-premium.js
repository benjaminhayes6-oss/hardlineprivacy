/* HARDLINE BROKER BADGE AGENT */

(function () {

async function isEntitled() {
  try {
    const r = await fetch('/api/entitlements/me', {
      credentials: 'include'
    });
    return await r.json();
  } catch {
    return { entitled:false };
  }
}

async function getBrokers() {
  try {
    const r = await fetch('/api/brokers', {
      credentials:'include'
    });
    if(!r.ok) return [];
    return await r.json();
  } catch {
    return [];
  }
}

function host(u){
  try{
    return new URL(u).hostname.replace(/^www\./,'');
  }catch{
    return '';
  }
}

function addBadges(rows, brokers){

  const map = Object.fromEntries(
    brokers.map(b => [b.domain, b])
  );

  rows.forEach(tr => {

    if(tr.dataset.badged) return;
    tr.dataset.badged = "true";

    const link = tr.querySelector('a');
    if(!link) return;

    const info = map[host(link.href)];
    if(!info) return;

    let td = tr.querySelector('.badge');

    if(!td){
      td = document.createElement('td');
      td.className = 'badge';
      tr.appendChild(td);
    }

    let html =
      info.risk === 'high'
        ? 'High‑risk broker'
        : 'People‑search';

    if(info.aliasOf){
      html += ` (uses ${
        String(info.aliasOf)
        .replace('https://','')
        .replace('www.','')
      })`;
    }

    if(info.removalUrl){
      html += ` <a href="${info.removalUrl}"
        target="_blank"
        rel="nofollow noopener noreferrer">
        Remove →
      </a>`;
    }

    td.innerHTML = html;
  });
}

function getRows(){
  const table=document.querySelector('#results table');
  if(!table) return [];
  return Array.from(table.querySelectorAll('tr')).slice(1);
}

async function init(){

  const me = await isEntitled();
  if(!me.entitled && !me.admin) return;

  const brokers = await getBrokers();

  const rows = getRows();
  if(rows.length) addBadges(rows, brokers);

  const el=document.getElementById('results');
  if(!el) return;

  const obs = new MutationObserver(()=>{
    const r2=getRows();
    if(r2.length) addBadges(r2, brokers);
  });

  obs.observe(el,{
    childList:true,
    subtree:true
  });
}

document.addEventListener('DOMContentLoaded', init);

})();