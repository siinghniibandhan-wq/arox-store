(() => {
  const $ = (id) => document.getElementById(id);
  const grid = $("app-grid"), filters = $("filters"), search = $("search");
  const dialog = $("app-dialog"), detail = $("app-detail");
  let apps = [], category = "All", query = "";
  const available = (value) => typeof value === "string" && value.trim() && !/^needs confirmation$/i.test(value.trim());
  const node = (tag, cls, text) => { const el = document.createElement(tag); if (cls) el.className = cls; if (text !== undefined) el.textContent = text; return el; };
  const safeUrl = (value) => { if (!available(value)) return null; try { const u = new URL(value); return ["https:","http:"].includes(u.protocol) ? u.href : null; } catch { return null; } };
  function renderFilters() {
    filters.replaceChildren();
    const cats = ["All", ...new Set(apps.map(a => a.category).filter(Boolean))];
    cats.forEach(name => { const b = node("button", "filter" + (category === name ? " active" : ""), name); b.type = "button"; b.addEventListener("click", () => { category = name; renderFilters(); renderApps(); }); filters.append(b); });
  }
  function matches(a) { const haystack = [a.name,a.tagline,a.description,a.category,a.replaces].join(" ").toLowerCase(); return (category === "All" || a.category === category) && haystack.includes(query); }
  function renderApps() {
    grid.replaceChildren();
    const shown = apps.filter(matches);
    $("app-count").textContent = shown.length + (shown.length === 1 ? " APP" : " APPS");
    $("empty-state").hidden = shown.length !== 0;
    shown.forEach(app => {
      const card = node("article","app-card"); card.tabIndex = 0; card.setAttribute("role","button"); card.setAttribute("aria-label","View " + app.name);
      const top = node("div","app-top"), icon = node("div","app-icon",app.icon || "◈"), cat = node("span","app-category",app.category || "Software");
      top.append(icon,cat); const name = node("h3","",app.name); const tagline = node("p","",app.tagline || "");
      const bottom = node("div","card-bottom"); bottom.append(node("span","",app.replaces ? "ALTERNATIVE TO " + app.replaces.toUpperCase() : "CURATED APP"),node("b","","↗"));
      card.append(top,name,tagline,bottom); card.addEventListener("click",()=>openApp(app)); card.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();openApp(app);}}); grid.append(card);
    });
  }
  function openApp(app) {
    detail.replaceChildren();
    const title = node("div","eyebrow",app.category || "APPLICATION");
    const icon = node("div","detail-icon",app.icon || "◈");
    const h = node("h2","",app.name), tagline = node("p","",app.tagline || "");
    const desc = node("p","detail-description",app.description || app.tagline || "");
    const actions = node("div","detail-actions");
    const web = safeUrl(app.web_url), gh = safeUrl(app.github_url), download = safeUrl(app.download_url);
    if (web) { const a=node("a","action","Open web app ↗"); a.href=web; a.target="_blank"; a.rel="noopener noreferrer"; actions.append(a); }
    if (gh) { const a=node("a","action secondary","View on GitHub ↗"); a.href=gh; a.target="_blank"; a.rel="noopener noreferrer"; actions.append(a); }
    if (download) { const a=node("a","action secondary","Download ↗"); a.href=download; a.target="_blank"; a.rel="noopener noreferrer"; actions.append(a); }
    const installTitle=node("h3","","Install on your server");
    const installBox=node("div","install-box"), command=node("code","",app.install || "Installation instructions coming soon");
    const copy=node("button","copy-btn","Copy"); copy.type="button"; copy.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(command.textContent);copy.textContent="Copied";}catch{copy.textContent="Select to copy";}});
    installBox.append(command,copy);
    const meta=node("p","detail-meta","License: " + (app.license || "needs confirmation") + " · iOS: " + (app.ios ? "Available" : "Coming soon") + " · Android: " + (app.android ? "Available" : "Coming soon"));
    detail.append(title,icon,h,tagline,desc,actions,installTitle,installBox,meta);
    if (typeof dialog.showModal === "function") dialog.showModal(); else dialog.setAttribute("open","");
  }
  $("dialog-close").addEventListener("click",()=>dialog.close());
  dialog.addEventListener("click",e=>{if(e.target===dialog)dialog.close();});
  search.addEventListener("input",()=>{query=search.value.trim().toLowerCase();renderApps();});
  $("theme-toggle").addEventListener("click",()=>{document.documentElement.classList.toggle("light");localStorage.setItem("arox-theme",document.documentElement.classList.contains("light")?"light":"dark");});
  if (localStorage.getItem("arox-theme")==="light") document.documentElement.classList.add("light");
  $("year").textContent = new Date().getFullYear();
  fetch("apps.json").then(r=>{if(!r.ok)throw new Error("Catalogue unavailable");return r.json();}).then(data=>{if(!Array.isArray(data))throw new Error("Invalid catalogue");apps=data;renderFilters();renderApps();}).catch(()=>{$("app-count").textContent="CATALOGUE UNAVAILABLE";$("empty-state").hidden=false;$("empty-state").textContent="The app catalogue could not be loaded. Please try again later.";});
})();