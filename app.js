(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const grid=$("grid"),chips=$("chips"),search=$("search"),dlg=$("dlg"),detail=$("detail"),clear=$("search-clear");
  const authDlg=$("auth-dialog"),authContent=$("auth-content");
  const API_BASE=($('meta-api-base')?.content || document.querySelector('meta[name="arox-api-base"]')?.content || "").replace(/\/$/,"");
  let apps=[],cat="All",q="",accessToken=null,currentUser=null,pendingApp=null;
  const valid=v=>typeof v==="string"&&v.trim()&&!/^needs confirmation$/i.test(v.trim());
  const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
  const safeUrl=v=>{if(!valid(v))return null;try{const u=new URL(v);return["https:","http:"].includes(u.protocol)?u.href:null;}catch{return null;}};
  const apiReady=()=>Boolean(API_BASE);
  async function api(path,options={}) {
    if(!apiReady()) throw new Error("Customer accounts are not connected yet. The Arox Store API URL has not been configured.");
    const headers={"Content-Type":"application/json",...(options.headers||{})};
    if(accessToken)headers.Authorization="Bearer "+accessToken;
    const response=await fetch(API_BASE+path,{...options,headers});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.detail||data.message||"Request failed ("+response.status+")");
    return data;
  }
  function authButton(){ $("auth-open").textContent=currentUser?"Account":"Sign in"; }
  function renderChips(){chips.replaceChildren();["All",...new Set(apps.map(a=>a.category).filter(Boolean))].forEach(name=>{const b=el("button","chip",name);b.type="button";b.setAttribute("aria-pressed",String(cat===name));b.onclick=()=>{cat=name;renderChips();renderApps();};chips.append(b);});}
  function matches(a){const hay=[a.name,a.tagline,a.description,a.category,a.replaces,...(a.tags||[]),...(a.features||[])].join(" ").normalize("NFKD").toLowerCase();return(cat==="All"||a.category===cat)&&hay.includes(q);}
  function renderApps(){grid.replaceChildren();const list=apps.filter(matches);$("count").textContent=list.length+" of "+apps.length+" apps";$("empty").hidden=list.length!==0;clear.hidden=!search.value;list.forEach(a=>{const c=el("button","card glass");c.type="button";if(valid(a.accent))c.style.setProperty("--tint",a.accent);const top=el("span","top"),info=el("span","");info.append(el("h3","",a.name),el("span","cat",a.category||"Software"));top.append(el("span","icon",a.icon||"•"),info);c.append(top,el("span","tag",a.tagline||""));if(a.replaces)c.append(el("span","alt","Alternative to "+a.replaces));if(Number.isFinite(a.rating_average)&&a.review_count>0)c.append(el("span","card-rating","★ "+a.rating_average.toFixed(1)+" · "+a.review_count+" reviews"));c.onclick=()=>open(a);grid.append(c);});}
  function link(parent,label,value,primary){const href=safeUrl(value);if(!href)return;const a=el("a","btn"+(primary?" primary":""),label);a.href=href;a.target="_blank";a.rel="noopener noreferrer";parent.append(a);}
  function section(parent,title){parent.append(el("h3","",title));}
  function appId(a){return String(a.name||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");}
  function status(parent,message,isError=false){const p=el("p",isError?"form-status error":"form-status",message);p.setAttribute("role","status");parent.append(p);}
  function showAuth(mode="login",notice=""){
    authContent.replaceChildren();
    const title=mode==="register"?"Create your account":mode==="account"?"Your account":"Sign in to Arox Store";
    authContent.append(el("h2","",title));
    if(notice)status(authContent,notice);
    if(mode==="account"){
      const p=el("p","note",currentUser?.email||"Signed in");authContent.append(p);
      const out=el("button","btn","Sign out");out.type="button";out.onclick=()=>{accessToken=null;currentUser=null;authButton();authDlg.close();if(pendingApp)open(pendingApp);};authContent.append(out);
      if(authDlg.showModal&&!authDlg.open)authDlg.showModal();return;
    }
    const form=el("form","auth-form");
    const email=el("input","");email.type="email";email.required=true;email.maxLength=320;email.autocomplete="email";email.placeholder="Email address";
    const password=el("input","");password.type="password";password.required=true;password.minLength=mode==="register"?12:1;password.maxLength=128;password.autocomplete=mode==="register"?"new-password":"current-password";password.placeholder=mode==="register"?"Password (12+ characters)":"Password";
    form.append(el("label","","Email address"),email,el("label","","Password"),password);
    if(mode==="register"){const hint=el("p","note","Use at least 12 characters, including uppercase, lowercase and a number.");form.append(hint);}
    const submit=el("button","btn primary",mode==="register"?"Create account":"Sign in");submit.type="submit";form.append(submit);
    const switcher=el("button","text-button",mode==="register"?"Already have an account? Sign in":"New to Arox Store? Create an account");switcher.type="button";switcher.onclick=()=>showAuth(mode==="register"?"login":"register");form.append(switcher);
    form.onsubmit=async e=>{e.preventDefault();submit.disabled=true;const busy=el("p","form-status","Please wait…");form.append(busy);
      try{
        const data=await api(mode==="register"?"/api/auth/register":"/api/auth/login",{method:"POST",body:JSON.stringify({email:email.value.trim(),password:password.value})});
        if(mode==="register"){showAuth("login","If this address can be registered, a verification email will be sent. Verify your email before signing in.");}
        else{accessToken=data.access_token;currentUser=await api("/api/auth/me");authButton();authDlg.close();if(pendingApp)open(pendingApp);}
      }catch(err){busy.textContent=err.message;busy.classList.add("error");submit.disabled=false;}
    };
    authContent.append(form);
    if(!apiReady())status(authContent,"The customer API has not been deployed/configured yet. Registration and login will become available after connection.");
    if(authDlg.showModal&&!authDlg.open)authDlg.showModal();
  }
  async function loadReviews(a,panel){
    try{
      const data=await api("/api/apps/"+encodeURIComponent(appId(a))+"/reviews");
      const summary=panel.querySelector(".review-summary");summary.replaceChildren(
        el("strong","",data.average_rating===null?"Not rated yet":"★ "+Number(data.average_rating).toFixed(1)),
        el("span","note",data.review_count+" customer reviews"));
      const list=panel.querySelector(".review-list");list.replaceChildren();
      data.items.forEach(review=>{const item=el("article","review-item");item.append(el("strong","","★".repeat(review.rating)+" "+review.title),el("p","",review.body),el("small","note",new Date(review.created_at).toLocaleDateString()));list.append(item);});
    }catch(err){status(panel,apiReady()?"Reviews could not be loaded: "+err.message:"Published reviews will appear when the API is connected.");}
  }
  function reviewForm(a,panel){
    if(!currentUser){const sign=el("button","btn primary","Sign in to write a review");sign.type="button";sign.onclick=()=>{pendingApp=a;showAuth("login");};panel.append(sign);return;}
    const form=el("form","review-form"),rating=el("select","");rating.required=true;
    [["","Choose a rating"],["5","★★★★★ Excellent"],["4","★★★★ Good"],["3","★★★ Average"],["2","★★ Poor"],["1","★ Very poor"]].forEach(([v,t])=>{const o=el("option","",t);o.value=v;rating.append(o);});
    const title=el("input","");title.required=true;title.minLength=3;title.maxLength=120;title.placeholder="Review title";
    const body=el("textarea","");body.required=true;body.minLength=8;body.maxLength=3000;body.rows=4;body.placeholder="Share your experience";
    const submit=el("button","btn primary","Submit review");submit.type="submit";
    form.append(el("label","","Your rating"),rating,el("label","","Title"),title,el("label","","Your review"),body,submit);
    form.onsubmit=async e=>{e.preventDefault();submit.disabled=true;
      try{const result=await api("/api/apps/"+encodeURIComponent(appId(a))+"/reviews",{method:"POST",body:JSON.stringify({rating:Number(rating.value),title:title.value.trim(),body:body.value.trim()})});
        form.replaceChildren();status(form,result.status==="approved"?"Your review has been automatically approved and published.":"Your review was received and is awaiting an additional moderation check.");
        await loadReviews(a,panel);
      }catch(err){status(form,err.message,true);submit.disabled=false;}
    };
    panel.append(form);
  }
  function open(a){
    pendingApp=a;detail.replaceChildren();const head=el("div","d-head"),t=el("div",""),h=el("h2","",a.name);h.id="d-name";t.append(h,el("p","",a.tagline||""));const icon=el("span","icon",a.icon||"•");if(valid(a.accent))icon.style.setProperty("--tint",a.accent);head.append(icon,t);detail.append(head,el("p","d-desc",a.description||a.tagline||""));
    const acts=el("div","actions");link(acts,"Open web app",a.web_url,true);link(acts,"Download source",a.download_url);link(acts,"View on GitHub",a.github_url);detail.append(acts);
    if(Array.isArray(a.features)&&a.features.length){section(detail,"Features");const ul=el("ul","feats");a.features.forEach(f=>ul.append(el("li","",f)));detail.append(ul);}
    section(detail,"Installation guide");
    if(Array.isArray(a.install_guide)&&a.install_guide.length){const ol=el("ol","install-steps");a.install_guide.forEach(step=>{const li=el("li","");li.append(el("strong","",step.title),el("code","",step.command));if(step.note)li.append(el("p","note",step.note));ol.append(li);});detail.append(ol);}else detail.append(el("p","note","Installation instructions have not been published."));
    if(a.install_note)detail.append(el("p","note",a.install_note));
    section(detail,"Customer reviews");const panel=el("div","review-panel"),summary=el("div","review-summary");summary.append(el("strong","","Loading ratings…"),el("span","note",""));panel.append(summary);
    const list=el("div","review-list");panel.append(list);reviewForm(a,panel);detail.append(panel);loadReviews(a,panel);
    detail.append(el("p","meta","License: "+(valid(a.license)?a.license:"not verified yet")));
    if(dlg.showModal)dlg.showModal();else dlg.setAttribute("open","");
  }
  $("close").onclick=()=>dlg.close();dlg.addEventListener("click",e=>{if(e.target===dlg)dlg.close();});
  $("auth-open").onclick=()=>showAuth(currentUser?"account":"login");
  $("auth-close").onclick=()=>authDlg.close();
  authDlg.addEventListener("click",e=>{if(e.target===authDlg)authDlg.close();});
  search.addEventListener("input",()=>{q=search.value.trim().toLowerCase();renderApps();});clear.onclick=()=>{search.value="";q="";renderApps();search.focus();};
  const root=document.documentElement;try{const s=localStorage.getItem("arox-theme");if(s?s==="light":matchMedia("(prefers-color-scheme: light)").matches)root.classList.add("light");}catch{}
  $("theme").onclick=()=>{const l=root.classList.toggle("light");try{localStorage.setItem("arox-theme",l?"light":"dark");}catch{}};
  $("year").textContent=new Date().getFullYear();
  const verifyToken=new URLSearchParams(location.search).get("verify");
  if(verifyToken&&apiReady()){api("/api/auth/verify?token="+encodeURIComponent(verifyToken),{method:"POST"}).then(()=>{history.replaceState(null,"",location.pathname);showAuth("login","Email verified. You can now sign in.");}).catch(err=>showAuth("login",err.message));}
  fetch("apps.json").then(r=>{if(!r.ok)throw Error("catalogue unavailable");return r.json();}).then(d=>{if(!Array.isArray(d))throw Error("invalid catalogue");apps=d;renderChips();renderApps();}).catch(()=>{$("count").textContent="";$("empty").hidden=false;$("empty").textContent="The app list could not be loaded. Refresh the page to try again.";});
})();