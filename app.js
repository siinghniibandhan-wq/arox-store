(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const grid=$("app-grid"),filters=$("filters"),search=$("search"),dialog=$("app-dialog"),detail=$("app-detail");
  let apps=[],category="All",query="";
  const available=v=>typeof v==="string"&&v.trim()&&!/^needs confirmation$/i.test(v.trim());
  const node=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};
  const safeUrl=value=>{if(!available(value))return null;try{const u=new URL(value);return ["https:","http:"].includes(u.protocol)?u.href:null;}catch{return null;}};
  function renderFilters(){
    filters.replaceChildren();
    const cats=["All",...new Set(apps.map(a=>a.category).filter(Boolean))];
    cats.forEach(name=>{const b=node("button","filter"+(category===name?" active":""),name);b.type="button";b.setAttribute("aria-pressed",String(category===name));b.addEventListener("click",()=>{category=name;renderFilters();renderApps();});filters.append(b);});
  }
  function matches(a){const hay=[a.name,a.tagline,a.description,a.category,a.replaces,...(a.tags||[])].join(" ").toLowerCase();return(category==="All"||a.category===category)&&hay.includes(query);}
  function renderApps(){
    grid.replaceChildren();const shown=apps.filter(matches);
    $("app-count").textContent=shown.length+" "+(shown.length===1?"APPLICATION":"APPLICATIONS");
    $("collection-label").textContent=category==="All"?"All applications":category;
    $("empty-state").hidden=shown.length!==0;
    shown.forEach(app=>{
      const card=node("article","app-card");card.tabIndex=0;card.setAttribute("role","button");card.setAttribute("aria-label","View "+app.name);
      if(app.accent)card.style.setProperty("--card-glow",app.accent);
      const top=node("div","app-top"),icon=node("div","app-icon",app.icon||"◈"),cat=node("span","app-category",app.category||"Software");
      top.append(icon,cat);const name=node("h3","",app.name),tagline=node("p","",app.tagline||"");
      const bottom=node("div","card-bottom");bottom.append(node("span","",app.replaces?"AN ALTERNATIVE TO "+app.replaces.toUpperCase():"CURATED SOFTWARE"),node("b","","↗"));
      card.append(top,name,tagline,bottom);card.addEventListener("click",()=>openApp(app));card.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();openApp(app);}});grid.append(card);
    });
  }
  function addLink(parent,label,url,primary=false){
    const href=safeUrl(url);if(!href)return;
    const a=node("a","action"+(primary?"":" secondary"),label);a.href=href;a.target="_blank";a.rel="noopener noreferrer";parent.append(a);
  }
  function openApp(app){
    detail.replaceChildren();
    const eyebrow=node("div","eyebrow",app.category||"APPLICATION");
    const head=node("div","detail-head"),icon=node("div","detail-icon",app.icon||"◈"),heading=node("div","");
    const h=node("h2","",app.name);h.id="detail-name";heading.append(h,node("p","",app.tagline||""));head.append(icon,heading);
    const desc=node("p","detail-description",app.description||app.tagline||"");
    const actions=node("div","detail-actions");addLink(actions,"Explore project ↗",app.web_url,true);addLink(actions,"Browse source on GitHub ↗",app.github_url);addLink(actions,"Download ↗",app.download_url);
    detail.append(eyebrow,head,desc,actions);
    if(Array.isArray(app.features)&&app.features.length){
      const section=node("section","detail-section");section.append(node("h3","","What you can explore"));
      const list=node("div","feature-list");app.features.forEach(item=>list.append(node("div","feature-item",item)));section.append(list);detail.append(section);
    }
    const install=node("section","detail-section");install.append(node("h3","","Installation"));
    const box=node("div","install-box"),command=node("code","",available(app.install)?app.install:"Verified installation instructions will be published here.");
    box.append(command);
    if(available(app.install)){const copy=node("button","copy-btn","Copy");copy.type="button";copy.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(command.textContent);copy.textContent="Copied";}catch{copy.textContent="Copy unavailable";}});box.append(copy);}
    install.append(box,node("p","source-note",app.install_note||"Check the upstream project documentation before deploying. Installation commands are shown only when verified."));
    detail.append(install);
    const meta=node("p","detail-meta","License: "+(app.license||"Not yet verified")+" · Project source: "+(safeUrl(app.github_url)?"Linked to GitHub":"Not published"));
    detail.append(meta);
    if(typeof dialog.showModal==="function")dialog.showModal();else dialog.setAttribute("open","");
  }
  $("dialog-close").addEventListener("click",()=>dialog.close());
  dialog.addEventListener("click",e=>{if(e.target===dialog)dialog.close();});
  search.addEventListener("input",()=>{query=search.value.trim().toLowerCase();renderApps();});
  $("theme-toggle").addEventListener("click",()=>{const light=document.documentElement.classList.toggle("light");try{localStorage.setItem("arox-theme",light?"light":"dark");}catch{}});
  try{if(localStorage.getItem("arox-theme")==="light")document.documentElement.classList.add("light");}catch{}
  document.addEventListener("keydown",e=>{if(e.key==="/"&&!/INPUT|TEXTAREA/.test(document.activeElement.tagName)){e.preventDefault();search.focus();}if(e.key==="Escape"&&dialog.open)dialog.close();});
  $("year").textContent=new Date().getFullYear();
  fetch("apps.json").then(r=>{if(!r.ok)throw new Error("Catalogue unavailable");return r.json();}).then(data=>{if(!Array.isArray(data))throw new Error("Invalid catalogue");apps=data;renderFilters();renderApps();}).catch(()=>{$("app-count").textContent="CATALOGUE UNAVAILABLE";$("empty-state").hidden=false;$("empty-state").textContent="The app catalogue could not be loaded. Please try again later.";});
})();