(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const grid = $("grid"), chips = $("chips"), search = $("search"), dlg = $("dlg"), detail = $("detail");
  let apps = [], cat = "All", q = "";
  const ok = v => typeof v === "string" && v.trim() && !/^needs confirmation$/i.test(v.trim());
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };
  const url = v => { if (!ok(v)) return null; try { const u = new URL(v); return ["https:", "http:"].includes(u.protocol) ? u.href : null; } catch { return null; } };

  function renderChips() {
    chips.replaceChildren();
    ["All", ...new Set(apps.map(a => a.category).filter(Boolean))].forEach(name => {
      const b = el("button", "chip", name); b.type = "button"; b.setAttribute("aria-pressed", String(cat === name));
      b.onclick = () => { cat = name; renderChips(); renderApps(); };
      chips.append(b);
    });
  }
  const matches = a => (cat === "All" || a.category === cat) &&
    [a.name, a.tagline, a.description, a.category, a.replaces, ...(a.tags || [])].join(" ").toLowerCase().includes(q);

  function renderApps() {
    grid.replaceChildren();
    const list = apps.filter(matches);
    $("count").textContent = list.length + (list.length === 1 ? " app" : " apps");
    $("empty").hidden = list.length !== 0;
    list.forEach(a => {
      const c = el("button", "card glass"); c.type = "button";
      if (ok(a.accent)) c.style.setProperty("--tint", a.accent);
      const top = el("span", "top"), info = el("span", "");
      info.append(el("h3", "", a.name), el("span", "cat", a.category || "Software"));
      top.append(el("span", "icon", a.icon || "•"), info);
      c.append(top, el("span", "tag", a.tagline || ""));
      if (a.replaces) c.append(el("span", "alt", "Alternative to " + a.replaces));
      c.onclick = () => open(a);
      grid.append(c);
    });
  }

  function link(parent, label, value, primary) {
    const href = url(value); if (!href) return;
    const a = el("a", "btn" + (primary ? " primary" : ""), label); a.href = href; a.target = "_blank"; a.rel = "noopener noreferrer"; parent.append(a);
  }
  function soon(parent, label) { const s = el("span", "btn", label + " (coming soon)"); s.setAttribute("aria-disabled", "true"); parent.append(s); }

  function open(a) {
    detail.replaceChildren();
    const head = el("div", "d-head"), t = el("div", ""), h = el("h2", "", a.name); h.id = "d-name";
    t.append(h, el("p", "", a.tagline || ""));
    const icon = el("span", "icon", a.icon || "•"); if (ok(a.accent)) icon.style.setProperty("--tint", a.accent);
    head.append(icon, t);
    detail.append(head, el("p", "d-desc", a.description || a.tagline || ""));
    const acts = el("div", "actions");
    link(acts, "Open web app", a.web_url, true); link(acts, "Download", a.download_url); link(acts, "View on GitHub", a.github_url);
    soon(acts, "iOS"); soon(acts, "Android");
    detail.append(acts);
    if (Array.isArray(a.features) && a.features.length) {
      detail.append(el("h3", "", "What it does"));
      const ul = el("ul", "feats"); a.features.forEach(f => ul.append(el("li", "", f))); detail.append(ul);
    }
    detail.append(el("h3", "", "Install on your server"));
    if (ok(a.install)) {
      const box = el("div", "cmd"), code = el("code", "", a.install), copy = el("button", "btn", "Copy"); copy.type = "button";
      copy.onclick = async () => { try { await navigator.clipboard.writeText(a.install); copy.textContent = "Copied"; } catch { copy.textContent = "Copy failed"; } };
      box.append(code, copy); detail.append(box);
    } else detail.append(el("p", "note", "Install steps are not published yet."));
    if (a.install_note) detail.append(el("p", "note", a.install_note));
    detail.append(el("p", "meta", "License: " + (ok(a.license) ? a.license : "not verified yet")));
    dlg.showModal ? dlg.showModal() : dlg.setAttribute("open", "");
  }

  $("close").onclick = () => dlg.close();
  dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); });
  search.addEventListener("input", () => { q = search.value.trim().toLowerCase(); renderApps(); });
  const root = document.documentElement;
  try { const s = localStorage.getItem("arox-theme"); if (s ? s === "light" : matchMedia("(prefers-color-scheme: light)").matches) root.classList.add("light"); } catch {}
  $("theme").onclick = () => { const l = root.classList.toggle("light"); try { localStorage.setItem("arox-theme", l ? "light" : "dark"); } catch {} };
  $("year").textContent = new Date().getFullYear();
  fetch("apps.json").then(r => { if (!r.ok) throw 0; return r.json(); })
    .then(d => { if (!Array.isArray(d)) throw 0; apps = d; renderChips(); renderApps(); })
    .catch(() => { $("count").textContent = ""; $("empty").hidden = false; $("empty").textContent = "The app list could not be loaded. Refresh the page to try again."; });
})();