/* ===================== CONFIG ===================== */
const FB_APP_ID = "907054345326846";
const GRAPH_BASE = "https://graph.facebook.com";
const GRAPH_VERSION = "v24.0";

/**
 * IMPORTANT:
 * In dev mode, many apps will not be allowed to request "email" scope.
 * If you include it, Facebook may show: "Invalid Scopes: email"
 *
 * Fix: request only public_profile by default.
 */
const LOGIN_SCOPES = ["public_profile"];

/**
 * Redirect URI must match EXACTLY what's added in:
 * Facebook Login → Settings → Valid OAuth Redirect URIs
 *
 * This uses the current origin + path.
 */
function getRedirectUri(){
  return `${location.origin}${location.pathname}`;
}

/* ===================== DOM ===================== */
/* Main token typing (topbar) */
const tokenInlineInput = document.getElementById("tokenInlineInput");
const btnToggleTokenInline = document.getElementById("btnToggleTokenInline");

/* Modal token (optional) */
const tokenInput = document.getElementById("tokenInput");
const btnToggleToken = document.getElementById("btnToggleToken");

const fieldsInput = document.getElementById("fieldsInput");
const picType = document.getElementById("picType");

const btnFetch = document.getElementById("btnFetch");
const btnClear = document.getElementById("btnClear");
const btnCopyJson = document.getElementById("btnCopyJson");

const btnLogin = document.getElementById("btnLogin");
const btnLogout = document.getElementById("btnLogout");

const profileBox = document.getElementById("profileBox");
const permBox = document.getElementById("permBox");
const jsonBox = document.getElementById("jsonBox");
const errorBox = document.getElementById("errorBox");
const loader = document.getElementById("loader");
const statusPill = document.getElementById("statusPill");
const sessionState = document.getElementById("sessionState");

/* Modals */
const modalToken = document.getElementById("modalToken");
const modalSettings = document.getElementById("modalSettings");
const modalChecklist = document.getElementById("modalChecklist");

const btnOpenToken = document.getElementById("btnOpenToken");
const btnOpenSettings = document.getElementById("btnOpenSettings");
const btnOpenChecklist = document.getElementById("btnOpenChecklist");

/* ===================== UTILITIES ===================== */
function trim(v){ return (v ?? "").trim(); }

function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"
  }[m]));
}

function isValidFields(fields){
  // allow letters, numbers, underscore, comma, spaces
  return /^[a-zA-Z0-9_,\s]+$/.test(fields);
}

function setStatus(text, kind){
  statusPill.textContent = text;
  statusPill.classList.remove("pill--idle", "pill--ok", "pill--bad");
  if (kind === "ok") statusPill.classList.add("pill--ok");
  else if (kind === "bad") statusPill.classList.add("pill--bad");
  else statusPill.classList.add("pill--idle");
}

function showError(msg){
  errorBox.textContent = msg;
  errorBox.classList.remove("is-hidden");
}

function clearError(){
  errorBox.textContent = "";
  errorBox.classList.add("is-hidden");
}

function setLoading(on){
  loader.classList.toggle("is-hidden", !on);

  // Main actions
  btnFetch.disabled = on;
  btnClear.disabled = on;
  btnCopyJson.disabled = on;

  // OAuth
  btnLogin.disabled = on;
  btnLogout.disabled = on;

  // Sidebar + modal buttons
  btnOpenToken.disabled = on;
  btnOpenSettings.disabled = on;
  btnOpenChecklist.disabled = on;

  // Inputs
  tokenInlineInput.disabled = on;
  tokenInput.disabled = on;
  fieldsInput.disabled = on;
  picType.disabled = on;
  btnToggleTokenInline.disabled = on;
  btnToggleToken.disabled = on;

  if (on) setStatus("Loading", "idle");
}

function setSession(text, ok){
  sessionState.textContent = text;
  sessionState.classList.toggle("session__state--ok", !!ok);
}

async function copyTextToClipboard(text){
  try{
    await navigator.clipboard.writeText(text);
    return true;
  }catch{
    try{
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    }catch{
      return false;
    }
  }
}

/**
 * Normalize "fields" string:
 * - split by comma
 * - trim each
 * - drop empties
 * - de-duplicate
 */
function normalizeFields(fieldsStr){
  const arr = String(fieldsStr || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

  const seen = new Set();
  const out = [];
  for (const f of arr){
    if (!seen.has(f)){
      seen.add(f);
      out.push(f);
    }
  }
  return out;
}

/* ===================== TOKEN SYNC (main input <-> modal input) ===================== */
function setTokenEverywhere(value){
  tokenInlineInput.value = value;
  tokenInput.value = value;
}
function getToken(){
  // Prefer main input (the actual UI)
  return trim(tokenInlineInput.value) || trim(tokenInput.value);
}
function syncTokenFromInline(){
  tokenInput.value = tokenInlineInput.value;
}
function syncTokenFromModal(){
  tokenInlineInput.value = tokenInput.value;
}

tokenInlineInput.addEventListener("input", syncTokenFromInline);
tokenInput.addEventListener("input", syncTokenFromModal);

/* ===================== MODAL SYSTEM ===================== */
function openModal(modal){
  modal.classList.remove("is-hidden");

  // focus first input if exists
  const focusEl =
    modal.querySelector("input:not([disabled])") ||
    modal.querySelector("select:not([disabled])") ||
    modal.querySelector("button:not([disabled])");

  if (focusEl) setTimeout(() => focusEl.focus(), 0);
}

function closeModal(modal){
  modal.classList.add("is-hidden");
}

function closeAllModals(){
  [modalToken, modalSettings, modalChecklist].forEach(closeModal);
}

function wireModal(modal){
  modal.addEventListener("click", (e) => {
    const target = e.target;
    if (target && target.dataset && target.dataset.close === "true"){
      closeModal(modal);
    }
  });
}

wireModal(modalToken);
wireModal(modalSettings);
wireModal(modalChecklist);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape"){
    closeAllModals();
  }
});

/* ===================== API CORE ===================== */
async function apiGet(path, params){
  const url = new URL(`${GRAPH_BASE}/${GRAPH_VERSION}${path}`);
  for (const [k, v] of Object.entries(params || {})){
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), { method: "GET" });

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; }
  catch { data = { raw: text }; }

  if (!res.ok){
    const fbMsg = data?.error?.message;
    const fbType = data?.error?.type;
    const fbCode = data?.error?.code;

    const detail = fbMsg
      ? `${fbMsg}${fbType ? ` (type: ${fbType})` : ""}${(fbCode !== undefined) ? ` (code: ${fbCode})` : ""}`
      : null;

    const err = new Error(detail || `Request failed (${res.status}).`);
    err.status = res.status;
    err.payload = data;
    err.url = url.toString();
    throw err;
  }

  return data;
}

function fetchMe(accessToken, fields){
  return apiGet("/me", { access_token: accessToken, fields });
}
function fetchPicture(accessToken, type){
  return apiGet("/me/picture", { access_token: accessToken, redirect: "0", type });
}
function fetchPermissions(accessToken){
  return apiGet("/me/permissions", { access_token: accessToken });
}

/* ===================== DOM RENDER ===================== */
function renderProfile(me, pictureJson, requestedFields){
  const picUrl = pictureJson?.data?.url || "";
  const name = me?.name || "Unknown";
  const id = me?.id || "n/a";
  const email = me?.email;

  const wantsEmail = requestedFields.includes("email");

  const emailLine = email
    ? `<div class="line"><strong>Email:</strong> ${escapeHtml(email)}</div>`
    : wantsEmail
      ? `<div class="line"><strong>Email:</strong> <span class="mutedInline">Not returned (permission not granted or no email available)</span></div>`
      : `<div class="line"><strong>Email:</strong> <span class="mutedInline">Not requested</span></div>`;

  profileBox.innerHTML = `
    <div class="profileCard">
      <img class="avatar" src="${picUrl}" alt="Profile picture" />
      <div class="meta">
        <div class="name">${escapeHtml(name)}</div>
        <div class="line"><strong>ID:</strong> ${escapeHtml(id)}</div>
        ${emailLine}
      </div>
    </div>
  `;
}

function renderPermissions(permJson){
  const rows = permJson?.data || [];
  if (!Array.isArray(rows) || rows.length === 0){
    permBox.innerHTML = `<div class="empty">No permissions returned.</div>`;
    return;
  }

  const list = rows.map(p => {
    const perm = escapeHtml(p.permission || "unknown");
    const status = escapeHtml(p.status || "unknown");
    const ok = status.toLowerCase() === "granted";
    return `
      <li class="permItem">
        <span class="permName">${perm}</span>
        <span class="permStatus ${ok ? "permStatus--ok" : "permStatus--bad"}">${status}</span>
      </li>
    `;
  }).join("");

  permBox.innerHTML = `<ul class="permList">${list}</ul>`;
}

function renderJSON(obj){
  jsonBox.textContent = JSON.stringify(obj, null, 2);
}

function resetUI(){
  clearError();
  setStatus("Idle", "idle");
  profileBox.innerHTML = `<div class="empty">No data yet. Click <strong>Fetch</strong>.</div>`;
  permBox.innerHTML = `<div class="empty">No data yet. Fetch to see granted scopes.</div>`;
  jsonBox.textContent = `{}`;
}

/* ===================== CONTROLLER ===================== */
async function onFetch(){
  clearError();

  const token = getToken();
  const fieldsStr = trim(fieldsInput.value);
  const type = picType.value;

  // Validation
  if (!token){
    showError("Invalid input: Access token is required. Type/paste it in the top bar token input.");
    setStatus("Invalid input", "bad");
    tokenInlineInput.focus();
    return;
  }
  if (!fieldsStr){
    showError("Invalid input: Fields is required. Open Settings to update fields.");
    setStatus("Invalid input", "bad");
    openModal(modalSettings);
    return;
  }
  if (!isValidFields(fieldsStr)){
    showError("Invalid input: Fields contains invalid characters.");
    setStatus("Invalid input", "bad");
    openModal(modalSettings);
    return;
  }
  if (fieldsStr.length > 120){
    showError("Invalid input: Fields is too long.");
    setStatus("Invalid input", "bad");
    openModal(modalSettings);
    return;
  }

  const requestedFields = normalizeFields(fieldsStr);
  const fields = requestedFields.join(",");

  // Heads-up only
  if (requestedFields.includes("email") && !LOGIN_SCOPES.includes("email")){
    showError("Note: 'email' is often not returned in dev mode unless your app/user has email permission. Fetch will still work.");
  }

  setLoading(true);

  try{
    const [me, picture, permissions] = await Promise.all([
      fetchMe(token, fields),
      fetchPicture(token, type),
      fetchPermissions(token)
    ]);

    const combined = { me, picture, permissions };

    if (!me?.id){
      showError("No results found: /me returned no id.");
      setStatus("No results", "bad");
      renderJSON(combined);
      profileBox.innerHTML = `<div class="empty">No results found.</div>`;
      permBox.innerHTML = `<div class="empty">No results found.</div>`;
      return;
    }

    renderProfile(me, picture, requestedFields);
    renderPermissions(permissions);
    renderJSON(combined);
    setStatus("Success", "ok");
  }catch(err){
    const status = err.status;

    if (status === 401 || status === 403){
      showError(`Authentication/permission error (${status}): ${err.message}`);
    } else if (status === 404){
      showError(`Not found (${status}): ${err.message}`);
    } else if (status === 429){
      showError(`Rate limit (${status}): Too many requests. Try again later.`);
    } else {
      showError(`Failed API request: ${err.message}`);
    }

    renderJSON(err.payload || { error: err.message, status: err.status, url: err.url });
    setStatus("Error", "bad");
  }finally{
    setLoading(false);
  }
}

/* ===================== OAUTH REDIRECT LOGIN (NO SDK) ===================== */
function parseHashParams(){
  const h = (location.hash || "").replace(/^#/, "");
  const out = {};
  if (!h) return out;

  for (const part of h.split("&")){
    const [k, v] = part.split("=");
    if (!k) continue;
    out[decodeURIComponent(k)] = decodeURIComponent(v || "");
  }
  return out;
}

function clearHash(){
  history.replaceState(null, "", `${location.origin}${location.pathname}${location.search}`);
}

function buildState(){
  const s = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  sessionStorage.setItem("fb_oauth_state", s);
  return s;
}

function verifyState(returned){
  const expected = sessionStorage.getItem("fb_oauth_state");
  sessionStorage.removeItem("fb_oauth_state");
  return !!returned && !!expected && returned === expected;
}

function oauthLoginRedirect(){
  clearError();

  if (location.protocol === "file:"){
    showError("Facebook Login will not work on file://. Use Live Server or your HTTPS tunnel URL.");
    setStatus("Use server", "bad");
    return;
  }

  if (!FB_APP_ID){
    showError("Setup required: FB_APP_ID is missing.");
    setStatus("Setup needed", "bad");
    return;
  }

  setStatus("Redirecting…", "idle");

  const redirectUri = getRedirectUri();
  const state = buildState();

  const url = new URL(`https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`);
  url.searchParams.set("client_id", FB_APP_ID);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "token");
  url.searchParams.set("scope", LOGIN_SCOPES.join(","));
  url.searchParams.set("state", state);

  window.location.assign(url.toString());
}

function oauthHandleReturn(){
  const p = parseHashParams();

  if (p.error){
    showError(`OAuth error: ${p.error_description || p.error}`);
    setStatus("Auth failed", "bad");
    clearHash();
    setSession("Not connected", false);
    btnLogout.disabled = true;
    return;
  }

  if (p.access_token){
    const okState = verifyState(p.state);
    if (!okState){
      showError("OAuth blocked: state mismatch (security check failed). Try login again.");
      setStatus("Auth failed", "bad");
      clearHash();
      return;
    }

    setTokenEverywhere(p.access_token);
    clearHash();

    setSession("Connected", true);
    btnLogout.disabled = false;
    setStatus("Logged in", "ok");

    // Optional: open token modal so user can see token was captured
    openModal(modalToken);
  }
}

function oauthLogoutLocal(){
  setTokenEverywhere("");
  resetUI();
  setSession("Not connected", false);
  btnLogout.disabled = true;
  setStatus("Logged out", "ok");
}

/* ===================== EVENTS ===================== */
btnFetch.addEventListener("click", onFetch);

btnClear.addEventListener("click", () => {
  resetUI();
  setStatus("Cleared", "idle");
});

btnCopyJson.addEventListener("click", async () => {
  const ok = await copyTextToClipboard(jsonBox.textContent || "");
  if (ok) setStatus("JSON copied", "ok");
  else {
    showError("Copy failed: Browser blocked clipboard access.");
    setStatus("Copy failed", "bad");
  }
});

btnLogin.addEventListener("click", oauthLoginRedirect);
btnLogout.addEventListener("click", oauthLogoutLocal);

/* Token visibility toggles */
btnToggleTokenInline.addEventListener("click", () => {
  tokenInlineInput.type = (tokenInlineInput.type === "password") ? "text" : "password";
});
btnToggleToken.addEventListener("click", () => {
  tokenInput.type = (tokenInput.type === "password") ? "text" : "password";
});

/* Sidebar modal buttons */
btnOpenToken.addEventListener("click", () => openModal(modalToken));
btnOpenSettings.addEventListener("click", () => openModal(modalSettings));
btnOpenChecklist.addEventListener("click", () => openModal(modalChecklist));

/* Press Enter to fetch (from token/fields inputs) */
[tokenInlineInput, tokenInput, fieldsInput].forEach(el => {
  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter"){
      e.preventDefault();
      onFetch();
    }
  });
});

/* ===================== BOOT ===================== */
resetUI();
setSession("Not connected", false);
btnLogout.disabled = true;
oauthHandleReturn();
