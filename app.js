(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const grid=$("grid"),chips=$("chips"),search=$("search"),dlg=$("dlg"),detail=$("detail"),clear=$("search-clear");
  let apps=[],cat="All",q="";
  const valid=v=>typeof v==="string"&&v.trim()&&!/^needs confirmation$/i.test(v.trim());
  const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
  const safeUrl=v=>{if(!valid(v))return null;try{const u=new URL(v);return["https:","http:"].includes(u.protocol)?u.href:null;}catch{return null;}};
  function renderChips(){chips.replaceChildren();["All",...new Set(apps.map(a=>a.category).filter(Boolean))].forEach(name=>{const b=el("button","chip",name);b.type="button";b.setAttribute("aria-pressed",String(cat===name));b.onclick=()=>{cat=name;renderChips();renderApps();};chips.append(b);});}
  function matches(a){const hay=[a.name,a.tagline,a.description,a.category,a.replaces,...(a.tags||[]),...(a.features||[])].join(" ").normalize("NFKD").toLowerCase();return(cat==="All"||a.category===cat)&&hay.includes(q);}
  function renderApps(){grid.replaceChildren();const list=apps.filter(matches);$("count").textContent=list.length+" of "+apps.length+" apps";$("empty").hidden=list.length!==0;clear.hidden=!search.value;list.forEach(a=>{const c=el("button","card glass");c.type="button";if(valid(a.accent))c.style.setProperty("--tint",a.accent);const top=el("span","top"),info=el("span","");info.append(el("h3","",a.name),el("span","cat",a.category||"Software"));top.append(el("span","icon",a.icon||"•"),info);c.append(top,el("span","tag",a.tagline||""));if(a.replaces)c.append(el("span","alt","Alternative to "+a.replaces));if(Number.isFinite(a.rating_average)&&a.review_count>0)c.append(el("span","card-rating","★ "+a.rating_average.toFixed(1)+" · "+a.review_count+" reviews"));c.onclick=()=>open(a);grid.append(c);});}
  function link(parent,label,value,primary){const href=safeUrl(value);if(!href)return;const a=el("a","btn"+(primary?" primary":""),label);a.href=href;a.target="_blank";a.rel="noopener noreferrer";parent.append(a);}
  function section(parent,title){parent.append(el("h3","",title));}
  function open(a){
    detail.replaceChildren();const head=el("div","d-head"),t=el("div",""),h=el("h2","",a.name);h.id="d-name";t.append(h,el("p","",a.tagline||""));const icon=el("span","icon",a.icon||"•");if(valid(a.accent))icon.style.setProperty("--tint",a.accent);head.append(icon,t);detail.append(head,el("p","d-desc",a.description||a.tagline||""));
    const acts=el("div","actions");link(acts,"Open web app",a.web_url,true);link(acts,"Download source",a.download_url);link(acts,"View on GitHub",a.github_url);detail.append(acts);
    if(Array.isArray(a.features)&&a.features.length){section(detail,"Features");const ul=el("ul","feats");a.features.forEach(f=>ul.append(el("li","",f)));detail.append(ul);}
    section(detail,"Installation guide");
    if(Array.isArray(a.install_guide)&&a.install_guide.length){const ol=el("ol","install-steps");a.install_guide.forEach(step=>{const li=el("li","");li.append(el("strong","",step.title));const code=el("code","",step.command);li.append(code);if(step.note)li.append(el("p","note",step.note));ol.append(li);});detail.append(ol);}
    else detail.append(el("p","note","Installation instructions have not been published."));
    if(a.install_note)detail.append(el("p","note",a.install_note));
    section(detail,"Customer reviews");const panel=el("div","review-panel"),summary=el("div","review-summary");summary.append(el("strong","",Number.isFinite(a.rating_average)?"★ "+a.rating_average.toFixed(1):"Not rated yet"),el("span","note",(a.review_count||0)+" customer reviews"));panel.append(summary);
    panel.append(el("p","review-locked","Sign in is required to submit a rating or written review. Reviews will be enabled when the Arox Store review API and customer accounts are connected."));
    const pending=el("div","review-placeholder","Review submission is not active yet. No ratings or reviews are being collected at this stage.");panel.append(pending);detail.append(panel);
    detail.append(el("p","meta","License: "+(valid(a.license)?a.license:"not verified yet")));
    if(dlg.showModal)dlg.showModal();else dlg.setAttribute("open","");
  }
  $("close").onclick=()=>dlg.close();dlg.addEventListener("click",e=>{if(e.target===dlg)dlg.close();});
  search.addEventListener("input",()=>{q=search.value.trim().toLowerCase();renderApps();});clear.onclick=()=>{search.value="";q="";renderApps();search.focus();};
  const root=document.documentElement;try{const s=localStorage.getItem("arox-theme");if(s?s==="light":matchMedia("(prefers-color-scheme: light)").matches)root.classList.add("light");}catch{}
  $("theme").onclick=()=>{const l=root.classList.toggle("light");try{localStorage.setItem("arox-theme",l?"light":"dark");}catch{}};
  $("year").textContent=new Date().getFullYear();
  fetch("apps.json").then(r=>{if(!r.ok)throw Error("catalogue unavailable");return r.json();}).then(d=>{if(!Array.isArray(d))throw Error("invalid catalogue");apps=d;renderChips();renderApps();}).catch(()=>{$("count").textContent="";$("empty").hidden=false;$("empty").textContent="The app list could not be loaded. Refresh the page to try again.";});
})();