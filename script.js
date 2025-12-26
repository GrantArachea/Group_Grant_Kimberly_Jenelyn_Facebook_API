/* ============================================================
   Facebook Graph API Demo — script.js
   ------------------------------------------------------------
   WHAT THIS APP DOES (high level):
   1) Lets the user paste/type an Access Token (topbar or modal).
   2) Fetches:
      - /me            (profile info using "fields")
      - /me/picture    (profile picture JSON with redirect=0)
      - /me/permissions (what scopes are granted)
   3) Renders a profile card + permissions list + raw JSON output.
   4) Supports OAuth login via redirect (no Facebook JS SDK).
   5) Has modals (token/settings/checklist), loading states,
      input validation, and a copy-to-clipboard JSON button.

   IMPORTANT NOTES:
   - Facebook Login does NOT work on file://. Use Live Server / HTTPS tunnel.
   - In Development Mode, only users with roles (admins/dev/testers) can login.
   - Some scopes (like email) may not be available or may require review.
   ============================================================ */

/* ===================== CONFIG ===================== */

/**
 * Your Facebook App ID (from Meta Developer dashboard).
 * Used in the OAuth redirect login URL as client_id.
 */
const FB_APP_ID = "907054345326846";

/**
 * Base Graph API domain. We build requests as:
 *   https://graph.facebook.com/{version}{path}?{params}
 */
const GRAPH_BASE = "https://graph.facebook.com";

/**
 * Graph API version.
 * Keep consistent with your app settings / docs you’re following.
 */
const GRAPH_VERSION = "v24.0";

/**
 * LOGIN_SCOPES determines what permissions you request during OAuth login.
 *
 * Why only public_profile?
 * - In dev mode, requesting "email" can fail or be restricted, causing
 *   "Invalid Scopes: email" in some setups.
 * - public_profile is the safest default and requires no review for basics.
 *
 * If you later enable email (and have it working), you can add:
 *   const LOGIN_SCOPES = ["public_profile", "email"];
 */
const LOGIN_SCOPES = ["public_profile"];

/**
 * getRedirectUri()
 * ------------------------------------------------------------
 * Returns the redirect URI that Facebook will send the user back to
 * after login.
 *
 * This MUST match exactly what you added in:
 *   Facebook Login → Settings → Valid OAuth Redirect URIs
 *
 * Using current origin + pathname means:
 * - Works for your deployed URL (Cloudflare tunnel / HTTPS)
 * - Works for local dev (http://127.0.0.1:5500/...)
 * - But NOT file://
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

/**
 * trim(v)
 * ------------------------------------------------------------
 * Safely trims whitespace.
 * - If v is null/undefined, converts to "" then trims.
 * - Helps avoid errors in validations and URL param building.
 */
function trim(v){ return (v ?? "").trim(); }

/**
 * escapeHtml(str)
 * ------------------------------------------------------------
 * Escapes user-derived content before injecting into innerHTML.
 * Prevents XSS and broken markup if the API returns characters like < > &.
 *
 * Returns a safe string with HTML entities.
 */
function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"
  }[m]));
}

/**
 * isValidFields(fields)
 * ------------------------------------------------------------
 * Validates the "fields" input used in /me?fields=...
 *
 * Allowed:
 * - letters A-Z (upper/lower)
 * - numbers 0-9
 * - underscore _
 * - comma ,
 * - spaces
 *
 * This reduces accidental invalid characters that can break requests.
 */
function isValidFields(fields){
  return /^[a-zA-Z0-9_,\s]+$/.test(fields);
}

/**
 * setStatus(text, kind)
 * ------------------------------------------------------------
 * Updates the status pill UI:
 * - text: what the pill says (e.g., "Success", "Error")
 * - kind:
 *    "ok"   -> green-ish style (pill--ok)
 *    "bad"  -> red-ish style   (pill--bad)
 *    other  -> neutral style   (pill--idle)
 */
function setStatus(text, kind){
  statusPill.textContent = text;
  statusPill.classList.remove("pill--idle", "pill--ok", "pill--bad");
  if (kind === "ok") statusPill.classList.add("pill--ok");
  else if (kind === "bad") statusPill.classList.add("pill--bad");
  else statusPill.classList.add("pill--idle");
}

/**
 * showError(msg)
 * ------------------------------------------------------------
 * Displays an error message in the UI error box.
 * - Makes sure the box is visible.
 */
function showError(msg){
  errorBox.textContent = msg;
  errorBox.classList.remove("is-hidden");
}

/**
 * clearError()
 * ------------------------------------------------------------
 * Clears any existing error text and hides the error box.
 */
function clearError(){
  errorBox.textContent = "";
  errorBox.classList.add("is-hidden");
}

/**
 * setLoading(on)
 * ------------------------------------------------------------
 * Enables/disables UI controls during API requests.
 *
 * When on=true:
 * - Shows loader
 * - Disables buttons and inputs to prevent double submits
 * - Updates status to "Loading"
 *
 * When on=false:
 * - Hides loader
 * - Re-enables controls
 */
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

/**
 * setSession(text, ok)
 * ------------------------------------------------------------
 * Updates a small session indicator (Connected / Not connected).
 * - text: label shown to user
 * - ok: if true, apply "connected" styling class
 */
function setSession(text, ok){
  sessionState.textContent = text;
  sessionState.classList.toggle("session__state--ok", !!ok);
}

/**
 * copyTextToClipboard(text)
 * ------------------------------------------------------------
 * Copies a string to clipboard.
 *
 * Strategy:
 * 1) Try modern Clipboard API (navigator.clipboard.writeText)
 * 2) Fallback to old approach:
 *    - create hidden textarea
 *    - select
 *    - document.execCommand("copy")
 *
 * Returns: true if copy succeeded, false otherwise.
 */
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
 * normalizeFields(fieldsStr)
 * ------------------------------------------------------------
 * Converts the fields string into a clean list:
 * - split by comma
 * - trim each entry
 * - remove empty entries
 * - remove duplicates while preserving order
 *
 * Example:
 *  " id, name , email, id " -> ["id","name","email"]
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

/**
 * setTokenEverywhere(value)
 * ------------------------------------------------------------
 * Keeps token in sync between:
 * - the main topbar token input (tokenInlineInput)
 * - the token modal input (tokenInput)
 */
function setTokenEverywhere(value){
  tokenInlineInput.value = value;
  tokenInput.value = value;
}

/**
 * getToken()
 * ------------------------------------------------------------
 * Returns the access token from UI.
 * - Prefers the main inline token input (topbar) since that’s the main UX.
 * - Falls back to modal token input if inline is empty.
 * - Always trims whitespace.
 */
function getToken(){
  return trim(tokenInlineInput.value) || trim(tokenInput.value);
}

/**
 * syncTokenFromInline()
 * ------------------------------------------------------------
 * When user types in inline input, copy the same value into modal input.
 * This prevents confusion where they open modal and see an old token.
 */
function syncTokenFromInline(){
  tokenInput.value = tokenInlineInput.value;
}

/**
 * syncTokenFromModal()
 * ------------------------------------------------------------
 * When user types in modal input, copy the same value into inline input.
 */
function syncTokenFromModal(){
  tokenInlineInput.value = tokenInput.value;
}

/* Wire the token sync listeners */
tokenInlineInput.addEventListener("input", syncTokenFromInline);
tokenInput.addEventListener("input", syncTokenFromModal);

/* ===================== MODAL SYSTEM ===================== */

/**
 * openModal(modal)
 * ------------------------------------------------------------
 * Shows a modal by removing the "is-hidden" class.
 * Then focuses the first enabled input/select/button for accessibility/UX.
 */
function openModal(modal){
  modal.classList.remove("is-hidden");

  const focusEl =
    modal.querySelector("input:not([disabled])") ||
    modal.querySelector("select:not([disabled])") ||
    modal.querySelector("button:not([disabled])");

  if (focusEl) setTimeout(() => focusEl.focus(), 0);
}

/**
 * closeModal(modal)
 * ------------------------------------------------------------
 * Hides a modal by adding the "is-hidden" class.
 */
function closeModal(modal){
  modal.classList.add("is-hidden");
}

/**
 * closeAllModals()
 * ------------------------------------------------------------
 * Convenience function to close all modals at once.
 * Used for Escape key behavior.
 */
function closeAllModals(){
  [modalToken, modalSettings, modalChecklist].forEach(closeModal);
}

/**
 * wireModal(modal)
 * ------------------------------------------------------------
 * Adds click-to-close behavior:
 * Any element inside the modal with data-close="true" will close that modal.
 *
 * Typical usage:
 * - Close button
 * - Overlay background
 */
function wireModal(modal){
  modal.addEventListener("click", (e) => {
    const target = e.target;
    if (target && target.dataset && target.dataset.close === "true"){
      closeModal(modal);
    }
  });
}

/* Apply wiring to each modal */
wireModal(modalToken);
wireModal(modalSettings);
wireModal(modalChecklist);

/**
 * Global Escape key handling:
 * - Esc closes all modals, regardless of which is open.
 */
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape"){
    closeAllModals();
  }
});

/* ===================== API CORE ===================== */

/**
 * apiGet(path, params)
 * ------------------------------------------------------------
 * Core function for calling Graph API endpoints with GET.
 *
 * Inputs:
 * - path: string like "/me" or "/me/picture"
 * - params: object of query params (access_token, fields, etc.)
 *
 * Behavior:
 * 1) Build URL = GRAPH_BASE / GRAPH_VERSION / path
 * 2) Attach query params
 * 3) fetch(url)
 * 4) Read response as text, try parse JSON
 * 5) If response is not ok (HTTP status not 2xx):
 *    - Extract helpful facebook error fields if present
 *    - Throw Error with extra metadata:
 *       err.status, err.payload, err.url
 *
 * Returns:
 * - Parsed JSON object (or {raw:text} if not JSON, though Graph is usually JSON)
 */
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

/**
 * fetchMe(accessToken, fields)
 * ------------------------------------------------------------
 * Calls GET /me with:
 * - access_token
 * - fields (comma-separated)
 *
 * Example:
 * /me?fields=id,name&access_token=...
 */
function fetchMe(accessToken, fields){
  return apiGet("/me", { access_token: accessToken, fields });
}

/**
 * fetchPicture(accessToken, type)
 * ------------------------------------------------------------
 * Calls GET /me/picture with:
 * - access_token
 * - type: picture size type (small, normal, large, square, etc.)
 * - redirect=0: IMPORTANT
 *    When redirect=0, Graph returns JSON with the image URL instead of
 *    redirecting to the image file. That lets us render it cleanly in the UI.
 *
 * Response shape:
 * { data: { url: "https://...", is_silhouette: false, ... } }
 */
function fetchPicture(accessToken, type){
  return apiGet("/me/picture", { access_token: accessToken, redirect: "0", type });
}

/**
 * fetchPermissions(accessToken)
 * ------------------------------------------------------------
 * Calls GET /me/permissions to see what permissions/scopes are granted.
 *
 * Response example:
 * { data: [{permission:"public_profile", status:"granted"}, ...] }
 */
function fetchPermissions(accessToken){
  return apiGet("/me/permissions", { access_token: accessToken });
}

/* ===================== DOM RENDER ===================== */

/**
 * renderProfile(me, pictureJson, requestedFields)
 * ------------------------------------------------------------
 * Renders the top profile card UI using:
 * - me: object returned from /me
 * - pictureJson: object returned from /me/picture?redirect=0
 * - requestedFields: array of fields user requested (normalized list)
 *
 * Handles email display logic:
 * - If email was returned: show it
 * - If email was requested but not returned: show "Not returned..."
 * - If email was not requested: show "Not requested"
 */
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

/**
 * renderPermissions(permJson)
 * ------------------------------------------------------------
 * Renders the permissions list UI from /me/permissions response.
 *
 * Behavior:
 * - If no permissions data array exists, show an empty message.
 * - Otherwise render each permission with status and colored indicator:
 *   granted -> ok styling
 *   declined/not granted -> bad styling
 */
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

/**
 * renderJSON(obj)
 * ------------------------------------------------------------
 * Renders raw JSON in the JSON output box (pre/code area).
 * Uses pretty formatting with 2-space indentation.
 */
function renderJSON(obj){
  jsonBox.textContent = JSON.stringify(obj, null, 2);
}

/**
 * resetUI()
 * ------------------------------------------------------------
 * Clears error + sets status to Idle + resets all panels to default.
 * Called on boot and on "Clear".
 */
function resetUI(){
  clearError();
  setStatus("Idle", "idle");
  profileBox.innerHTML = `<div class="empty">No data yet. Click <strong>Fetch</strong>.</div>`;
  permBox.innerHTML = `<div class="empty">No data yet. Fetch to see granted scopes.</div>`;
  jsonBox.textContent = `{}`;
}

/* ===================== CONTROLLER ===================== */

/**
 * onFetch()
 * ------------------------------------------------------------
 * Main handler when user clicks Fetch or presses Enter.
 *
 * Steps:
 * 1) Clear previous error
 * 2) Read inputs: token, fieldsStr, picture type
 * 3) Validate:
 *    - token required
 *    - fields required
 *    - fields characters allowed
 *    - fields length limit
 * 4) Normalize fields and build comma-separated fields param
 * 5) Turn on loading (disable UI)
 * 6) In parallel (Promise.all), call:
 *    - /me
 *    - /me/picture (redirect=0)
 *    - /me/permissions
 * 7) If /me has no id, treat as "no results"
 * 8) Render profile + permissions + combined JSON
 * 9) Handle errors and show helpful message based on status code
 * 10) Always turn off loading
 */
async function onFetch(){
  clearError();

  const token = getToken();
  const fieldsStr = trim(fieldsInput.value);
  const type = picType.value;

  // Validation: access token is required
  if (!token){
    showError("Invalid input: Access token is required. Type/paste it in the top bar token input.");
    setStatus("Invalid input", "bad");
    tokenInlineInput.focus();
    return;
  }

  // Validation: fields is required
  if (!fieldsStr){
    showError("Invalid input: Fields is required. Open Settings to update fields.");
    setStatus("Invalid input", "bad");
    openModal(modalSettings);
    return;
  }

  // Validation: allowed characters only
  if (!isValidFields(fieldsStr)){
    showError("Invalid input: Fields contains invalid characters.");
    setStatus("Invalid input", "bad");
    openModal(modalSettings);
    return;
  }

  // Validation: basic length guard
  if (fieldsStr.length > 120){
    showError("Invalid input: Fields is too long.");
    setStatus("Invalid input", "bad");
    openModal(modalSettings);
    return;
  }

  // Normalize + de-duplicate fields list
  const requestedFields = normalizeFields(fieldsStr);
  const fields = requestedFields.join(",");

  // Heads-up only if user requests email but we are not requesting email scope in OAuth
  // (This doesn't block fetching; it just warns user that email may not appear.)
  if (requestedFields.includes("email") && !LOGIN_SCOPES.includes("email")){
    showError("Note: 'email' is often not returned in dev mode unless your app/user has email permission. Fetch will still work.");
  }

  setLoading(true);

  try{
    // Run all three requests in parallel for faster UI
    const [me, picture, permissions] = await Promise.all([
      fetchMe(token, fields),
      fetchPicture(token, type),
      fetchPermissions(token)
    ]);

    // Combined object for JSON view/debugging
    const combined = { me, picture, permissions };

    // If /me doesn't return an id, treat it as no usable result
    if (!me?.id){
      showError("No results found: /me returned no id.");
      setStatus("No results", "bad");
      renderJSON(combined);
      profileBox.innerHTML = `<div class="empty">No results found.</div>`;
      permBox.innerHTML = `<div class="empty">No results found.</div>`;
      return;
    }

    // Render UI panels
    renderProfile(me, picture, requestedFields);
    renderPermissions(permissions);
    renderJSON(combined);
    setStatus("Success", "ok");
  }catch(err){
    // apiGet() throws an Error with err.status, err.payload, err.url
    const status = err.status;

    // Provide clearer message per typical HTTP status
    if (status === 401 || status === 403){
      showError(`Authentication/permission error (${status}): ${err.message}`);
    } else if (status === 404){
      showError(`Not found (${status}): ${err.message}`);
    } else if (status === 429){
      showError(`Rate limit (${status}): Too many requests. Try again later.`);
    } else {
      showError(`Failed API request: ${err.message}`);
    }

    // Show payload for debugging (or a fallback object)
    renderJSON(err.payload || { error: err.message, status: err.status, url: err.url });
    setStatus("Error", "bad");
  }finally{
    setLoading(false);
  }
}

/* ===================== OAUTH REDIRECT LOGIN (NO SDK) ===================== */

/**
 * parseHashParams()
 * ------------------------------------------------------------
 * Parses OAuth implicit flow result from URL hash fragment.
 *
 * After Facebook redirects back, URL can look like:
 *   https://your.site/index.html#access_token=...&expires_in=...&state=...
 *
 * This function converts that hash into an object:
 *   { access_token: "...", expires_in: "...", state: "..." }
 */
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

/**
 * clearHash()
 * ------------------------------------------------------------
 * Removes the hash fragment from URL without reloading.
 * Keeps the page clean so the token isn’t visible in URL after capture.
 */
function clearHash(){
  history.replaceState(null, "", `${location.origin}${location.pathname}${location.search}`);
}

/**
 * buildState()
 * ------------------------------------------------------------
 * Generates a random "state" value for OAuth CSRF protection.
 * Stores it in sessionStorage under "fb_oauth_state".
 *
 * On return, we verify that returned state matches stored state.
 */
function buildState(){
  const s = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  sessionStorage.setItem("fb_oauth_state", s);
  return s;
}

/**
 * verifyState(returned)
 * ------------------------------------------------------------
 * Verifies OAuth state parameter for basic CSRF protection:
 * - Reads expected state from sessionStorage
 * - Removes it (one-time use)
 * - Compares with the returned state in the URL hash
 *
 * Returns true if match, else false.
 */
function verifyState(returned){
  const expected = sessionStorage.getItem("fb_oauth_state");
  sessionStorage.removeItem("fb_oauth_state");
  return !!returned && !!expected && returned === expected;
}

/**
 * oauthLoginRedirect()
 * ------------------------------------------------------------
 * Starts OAuth login using the implicit flow (response_type=token)
 * WITHOUT using the Facebook SDK.
 *
 * Steps:
 * 1) Block file:// (OAuth won't work there)
 * 2) Validate FB_APP_ID exists
 * 3) Build redirect_uri (must match Meta dashboard)
 * 4) Build state value and store
 * 5) Construct Facebook dialog URL:
 *    https://www.facebook.com/{version}/dialog/oauth?client_id=...&redirect_uri=...
 * 6) Redirect the browser to that URL (window.location.assign)
 */
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

/**
 * oauthHandleReturn()
 * ------------------------------------------------------------
 * Runs on page load to check if we just returned from Facebook OAuth.
 *
 * If URL hash contains:
 * - error: show error and mark session not connected
 * - access_token: verify state, store token in inputs, mark connected
 *
 * Also:
 * - Clears hash to avoid token staying in the URL
 * - Enables Logout button
 * - Optionally opens token modal to confirm capture
 */
function oauthHandleReturn(){
  const p = parseHashParams();

  // Handle OAuth errors from Facebook
  if (p.error){
    showError(`OAuth error: ${p.error_description || p.error}`);
    setStatus("Auth failed", "bad");
    clearHash();
    setSession("Not connected", false);
    btnLogout.disabled = true;
    return;
  }

  // Handle OAuth success (implicit flow returns access_token in hash)
  if (p.access_token){
    const okState = verifyState(p.state);
    if (!okState){
      showError("OAuth blocked: state mismatch (security check failed). Try login again.");
      setStatus("Auth failed", "bad");
      clearHash();
      return;
    }

    // Save token into both UI inputs (inline + modal)
    setTokenEverywhere(p.access_token);

    // Remove token from the URL for security/cleanliness
    clearHash();

    // Update session UI
    setSession("Connected", true);
    btnLogout.disabled = false;
    setStatus("Logged in", "ok");

    // Optional: show modal so user can see token was captured
    openModal(modalToken);
  }
}

/**
 * oauthLogoutLocal()
 * ------------------------------------------------------------
 * This is a LOCAL logout (UI/session cleanup), not a Facebook global logout.
 *
 * What it does:
 * - Clears token fields
 * - Resets UI panels
 * - Updates session to "Not connected"
 * - Disables Logout button
 */
function oauthLogoutLocal(){
  setTokenEverywhere("");
  resetUI();
  setSession("Not connected", false);
  btnLogout.disabled = true;
  setStatus("Logged out", "ok");
}

/* ===================== EVENTS ===================== */

/**
 * Fetch button:
 * - Main action to call Graph API endpoints and update UI.
 */
btnFetch.addEventListener("click", onFetch);

/**
 * Clear button:
 * - Resets the UI back to initial state (does not change auth token unless user deletes it).
 */
btnClear.addEventListener("click", () => {
  resetUI();
  setStatus("Cleared", "idle");
});

/**
 * Copy JSON button:
 * - Copies the current jsonBox content to clipboard.
 * - Updates status or shows error if blocked.
 */
btnCopyJson.addEventListener("click", async () => {
  const ok = await copyTextToClipboard(jsonBox.textContent || "");
  if (ok) setStatus("JSON copied", "ok");
  else {
    showError("Copy failed: Browser blocked clipboard access.");
    setStatus("Copy failed", "bad");
  }
});

/**
 * OAuth login button:
 * - Starts redirect-based OAuth flow.
 */
btnLogin.addEventListener("click", oauthLoginRedirect);

/**
 * Logout button:
 * - Clears local token and resets UI.
 */
btnLogout.addEventListener("click", oauthLogoutLocal);

/* Token visibility toggles */

/**
 * btnToggleTokenInline:
 * - Toggles tokenInlineInput between password/text so you can show/hide token.
 */
btnToggleTokenInline.addEventListener("click", () => {
  tokenInlineInput.type = (tokenInlineInput.type === "password") ? "text" : "password";
});

/**
 * btnToggleToken:
 * - Toggles tokenInput (modal token) between password/text.
 */
btnToggleToken.addEventListener("click", () => {
  tokenInput.type = (tokenInput.type === "password") ? "text" : "password";
});

/* Sidebar modal buttons */

/**
 * Opens the Token modal (manual view/edit token).
 */
btnOpenToken.addEventListener("click", () => openModal(modalToken));

/**
 * Opens the Settings modal (fields + picture type settings).
 */
btnOpenSettings.addEventListener("click", () => openModal(modalSettings));

/**
 * Opens the Checklist modal (project setup checklist / guidance).
 */
btnOpenChecklist.addEventListener("click", () => openModal(modalChecklist));

/* Press Enter to fetch */

/**
 * Allow Enter key inside token inputs or fields input to trigger Fetch.
 * Improves UX so user doesn’t need to click the Fetch button every time.
 */
[tokenInlineInput, tokenInput, fieldsInput].forEach(el => {
  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter"){
      e.preventDefault();
      onFetch();
    }
  });
});

/* ===================== BOOT ===================== */

/**
 * Boot sequence:
 * 1) Reset UI panels
 * 2) Mark session as not connected
 * 3) Disable logout button by default
 * 4) If we returned from OAuth, capture token and set connected state
 */
resetUI();
setSession("Not connected", false);
btnLogout.disabled = true;
oauthHandleReturn();
