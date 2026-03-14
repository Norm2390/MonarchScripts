// ==UserScript==
// @name         Monarch Mutation — OCViewer
// @namespace    mutationOCViewerJocko
// @version      1.0.10
// @description  Live OC briefing. CPR matching, role recommendations, status icons, live countdowns.
// @author       JockoWillink [55408]
// @match        https://www.torn.com/factions.php?step=your&type=1*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      tttivqztkjnhenovxbag.supabase.co
// @run-at       document-idle
// @updateURL    https://github.com/Norm2390/MonarchScripts/raw/refs/heads/main/MutationOCViewer.user.js
// ==/UserScript==

;(function() {
  "use strict"

  const SB_URL      = "https://tttivqztkjnhenovxbag.supabase.co"
  const SB_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0dGl2cXp0a2puaGVub3Z4YmFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyODQ2NjMsImV4cCI6MjA3Mjg2MDY2M30.bgWWmf5Qq-Yoi1XYiBzlJsGOZlAQR3OZancu-sbv57c"

  let _timerInterval = null

  // ── Role priority order per crime ─────────────────────────────────────────
  // Ordered highest weight → lowest. Used for "Pro Tip" recommendations.
  // Base role names (no #1/#2) — matching logic strips suffixes.
  const ROLE_PRIORITY = {
    "blast from the past":  ["Muscle", "Engineer", "Bomber", "Hacker", "Picklock"],
    "clinical precision":   ["Imitator", "Cleaner", "Cat Burglar", "Assassin"],
    "break the bank":       ["Muscle", "Thief", "Robber"],
    // Break the Bank specifics: Muscle 3 > Thief 2 > Muscle 1 > Robber > Muscle 2 > Thief 1
    // Since there are numbered variants we handle weight-order by full label below
    "stacking the deck":    ["Imitator", "Hacker", "Cat Burglar", "Driver"],
    // Ace in the Hole: Imitator prioritised over Hacker despite Hacker having higher weight
    "ace in the hole":      ["Imitator", "Hacker", "Muscle", "Driver"],
  }

  // For crimes with numbered roles where specific numbers matter by weight
  const ROLE_PRIORITY_FULL = {
    "break the bank": ["Muscle #3", "Thief #2", "Muscle #1", "Robber", "Muscle #2", "Thief #1"],
  }

  // ── Boot ──────────────────────────────────────────────────────────────────
  const INJECT_SELECTORS = [
    ".organize-wrap", ".faction-crimes-wrap", "#faction-crimes",
    ".content-wrapper", "#mainContainer"
  ]

  function findContainer() {
    for (const sel of INJECT_SELECTORS) {
      const el = document.querySelector(sel)
      if (el) return el
    }
    return null
  }

  function boot() {
    injectStyles()
    const userId = GM_getValue("ocv-user-id", null)
    if (userId === null) {
      // Never been set — show prompt
      showIdPrompt(function() { injectPanel(); fetchAndRender() })
    } else {
      injectPanel()
      fetchAndRender()
    }
  }

  function isOnCrimesTab() {
    return window.location.hash.includes("/tab=crimes")
  }

  function maybeBooted() {
    if (!isOnCrimesTab()) return
    if (findContainer()) {
      boot()
    } else {
      const obs = new MutationObserver(function() {
        if (findContainer()) { obs.disconnect(); boot() }
      })
      obs.observe(document.body || document.documentElement, { childList: true, subtree: true })
      setTimeout(function() {
        obs.disconnect()
        if (!document.getElementById("ocv-wrapper")) boot()
      }, 5000)
    }
  }

  // Boot on initial load if already on crimes tab
  maybeBooted()

  // Re-check when hash changes (tab navigation within factions page)
  window.addEventListener("hashchange", function() {
    if (isOnCrimesTab()) {
      if (!document.getElementById("ocv-wrapper")) maybeBooted()
    } else {
      // Left crimes tab — remove the panel
      const w = document.getElementById("ocv-wrapper")
      if (w) w.remove()
    }
  })

  setInterval(function() {
    if (!isOnCrimesTab()) return
    if (!document.getElementById("ocv-wrapper") && !document.getElementById("ocv-id-overlay")) {
      if (findContainer()) { injectStyles(); injectPanel(); fetchAndRender() }
    }
  }, 2000)

  // ── ID prompt — built via DOM (not innerHTML) to avoid CSP issues ─────────
  function showIdPrompt(onDone) {
    // Remove any existing overlay first
    const existing = document.getElementById("ocv-id-overlay")
    if (existing) existing.remove()

    const overlay = document.createElement("div")
    overlay.id = "ocv-id-overlay"
    overlay.style.cssText = [
      "position:fixed","top:0","left:0","width:100%","height:100%",
      "background:rgba(0,0,0,0.75)","z-index:999999",
      "display:flex","align-items:center","justify-content:center"
    ].join(";")

    const box = document.createElement("div")
    box.style.cssText = [
      "background:#1a1a1a","border:1px solid #c82121","border-radius:6px",
      "padding:24px","max-width:360px","width:90%","font-family:Arial,sans-serif","box-sizing:border-box"
    ].join(";")

    const title = document.createElement("div")
    title.style.cssText = "font-size:13px;font-weight:bold;color:#ff8787;letter-spacing:1px;margin-bottom:8px"
    title.textContent = "OC VIEWER SETUP"

    const desc = document.createElement("div")
    desc.style.cssText = "font-size:12px;color:#aaa;margin-bottom:16px;line-height:1.5"
    desc.textContent = "Enter your Torn user ID to enable CPR matching and role recommendations. Stored locally, never shared."

    const label = document.createElement("div")
    label.style.cssText = "font-size:11px;color:#666;margin-bottom:6px"
    label.textContent = "Your Torn ID (numbers only — found in your profile URL)"

    const input = document.createElement("input")
    input.type = "text"
    input.placeholder = "e.g. 259767"
    input.style.cssText = [
      "width:100%","box-sizing:border-box","background:#111","border:1px solid #444",
      "border-radius:3px","padding:7px 10px","color:#eee","font-size:13px",
      "margin-bottom:12px","outline:none","display:block"
    ].join(";")

    const btnRow = document.createElement("div")
    btnRow.style.cssText = "display:flex;gap:8px"

    const saveBtn = document.createElement("button")
    saveBtn.style.cssText = [
      "flex:1","background:#881111","border:1px solid #c82121","border-radius:3px",
      "padding:8px","color:#ff8787","font-size:12px","cursor:pointer","font-weight:bold"
    ].join(";")
    saveBtn.textContent = "Save & Continue"

    const skipBtn = document.createElement("button")
    skipBtn.style.cssText = [
      "background:none","border:1px solid #333","border-radius:3px",
      "padding:8px 14px","color:#555","font-size:12px","cursor:pointer"
    ].join(";")
    skipBtn.textContent = "Skip"

    const errMsg = document.createElement("div")
    errMsg.style.cssText = "font-size:11px;color:#cc4444;margin-top:8px;display:none"
    errMsg.textContent = "Please enter a valid numeric Torn ID."

    btnRow.appendChild(saveBtn)
    btnRow.appendChild(skipBtn)
    box.appendChild(title)
    box.appendChild(desc)
    box.appendChild(label)
    box.appendChild(input)
    box.appendChild(btnRow)
    box.appendChild(errMsg)
    overlay.appendChild(box)
    document.body.appendChild(overlay)

    // Focus input after a short delay (page may still be settling)
    setTimeout(function() { input.focus() }, 150)

    function doSave() {
      const val = input.value.trim()
      const num = parseInt(val)
      if (!val || isNaN(num) || num <= 0) {
        errMsg.style.display = "block"
        return
      }
      GM_setValue("ocv-user-id", num)
      overlay.remove()
      onDone()
    }

    saveBtn.addEventListener("click", doSave)
    skipBtn.addEventListener("click", function() {
      GM_setValue("ocv-user-id", 0)  // 0 = explicitly skipped, won't prompt again
      overlay.remove()
      onDone()
    })
    input.addEventListener("keydown", function(e) {
      if (e.key === "Enter") doSave()
    })
  }

  // ── Styles ────────────────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById("ocv-styles")) return
    const s = document.createElement("style")
    s.id = "ocv-styles"
    s.textContent = `
      #ocv-wrapper {
        width: 100%; font-family: Arial, sans-serif;
        margin-bottom: 10px; box-sizing: border-box;
      }
      #ocv-header {
        background: #111; border: 1px solid #c82121; border-bottom: none;
        padding: 7px 14px; display: flex; align-items: center;
        justify-content: space-between; cursor: pointer;
        user-select: none; border-radius: 4px 4px 0 0;
      }
      #ocv-header:hover { background: #1a1a1a; }
      #ocv-header-left  { display: flex; align-items: center; gap: 10px; }
      #ocv-title {
        font-size: 11px; font-weight: bold; letter-spacing: 2px;
        text-transform: uppercase; color: #ff8787;
      }
      #ocv-meta       { font-size: 10px; color: #555; }
      #ocv-meta span  { color: #888; }
      #ocv-toggle-btn {
        font-size: 11px; background: none; border: 1px solid #333;
        border-radius: 3px; padding: 2px 8px; cursor: pointer; color: #888;
      }
      #ocv-toggle-btn:hover { border-color: #882222; color: #ff8787; }
      #ocv-refresh-btn {
        font-size: 10px; background: none; border: 1px solid #224466;
        border-radius: 3px; padding: 2px 7px; cursor: pointer; color: #336699;
      }
      #ocv-refresh-btn:hover    { border-color: #4488bb; color: #88ccff; }
      #ocv-refresh-btn:disabled { opacity: 0.4; cursor: not-allowed; }
      #ocv-id-btn {
        font-size: 10px; background: none; border: 1px solid #333;
        border-radius: 3px; padding: 2px 7px; cursor: pointer; color: #555;
      }
      #ocv-id-btn:hover { border-color: #555; color: #888; }
      #ocv-body {
        background: #1a1a1a; border: 1px solid #882222; border-top: none;
        padding: 12px 14px; border-radius: 0 0 4px 4px;
      }
      #ocv-body.ocv-collapsed { display: none; }
      #ocv-loading { text-align:center; padding:20px; color:#555; font-size:13px; font-style:italic; }
      #ocv-error   { text-align:center; padding:16px; color:#cc4444; font-size:13px; }
      .ocv-section-label {
        font-size: 10px; letter-spacing: 2px; text-transform: uppercase;
        color: #888; font-weight: bold;
        border-bottom: 1px solid #2a2a2a; padding-bottom: 5px; margin-bottom: 8px;
      }
      .ocv-ann-row {
        display: flex; align-items: center; gap: 10px;
        padding: 6px 10px; border-bottom: 1px solid #222;
      }
      .ocv-ann-row:last-child { border-bottom: none; }
      .ocv-badge {
        flex-shrink: 0; padding: 2px 8px; border-radius: 3px;
        font-size: 11px; font-weight: bold; letter-spacing: 1px;
      }
      .ocv-badge-urgent { background:#551111; border:1px solid #cc2222; color:#ff6666; }
      .ocv-badge-normal { background:#1f1111; border:1px solid #882222; color:#ff8787; }
      .ocv-badge-low    { background:#222233; border:1px solid #555577; color:#8888aa; }
      .ocv-badge-info   { background:#1a2a1a; border:1px solid #448844; color:#88cc88; }
      .ocv-badge-hold   { background:#1a1500; border:1px solid #7a6500; color:#ccaa00; }
      .ocv-ann-msg      { font-size: 13px; color: #e8e8e8; }
      .ocv-income-bar {
        background: #0d1a0d; border: 1px solid #2a5a2a;
        border-left: 3px solid #44aa44; border-radius: 4px;
        padding: 7px 12px; margin-bottom: 20px; font-size: 13px; color: #aaa;
      }
      .ocv-income-bar strong { color: #44cc44; font-size: 15px; }
      .ocv-oc-card {
        border-left: 3px solid #882222; border: 1px solid #2a2a2a;
        border-left: 3px solid #882222; border-radius:3px; padding: 9px 11px;
      }
      .ocv-oc-card:last-child { border-bottom: 1px solid #2a2a2a; }
      .ocv-oc-card.pri-urgent { border-left-color: #c82121; }
      .ocv-oc-card.pri-low    { border-left-color: #444; }
      .ocv-oc-card.pri-hold   { border-left-color: #7a6500; }
      .ocv-oc-header {
        display: flex; align-items: center; flex-wrap: wrap; gap: 7px; margin-bottom: 6px;
      }
      .ocv-oc-name       { font-weight:bold; font-size:14px; color:#ff8787; text-decoration:none; }
      .ocv-oc-name:hover { color:#ffaaaa; text-decoration:underline; }
      .ocv-oc-name-plain { font-weight:bold; font-size:14px; color:#ff8787; }
      .ocv-ctrl-hint     { font-size:10px; color:#336666; }
      .ocv-slots         { font-size:12px; color:#888; }
      .ocv-timer         { font-size:12px; color:#888; }
      .ocv-timer strong  { color:#c8c800; }
      .ocv-timer strong.stalled { color:#cc4444; }
      .ocv-roles         { display:flex; flex-wrap:wrap; gap:4px; margin-bottom:4px; }
      .ocv-chip          { display:inline-block; padding:2px 8px; border-radius:3px; font-size:12px; line-height:1.6; }
      .ocv-chip-open     { background:#0d1a0d; border:1px solid #2a7a2a; color:#44aa44; }
      .ocv-chip-open-no  { background:#1a1000; border:1px solid #7a5a00; color:#cc9900; }
      .ocv-chip-filled   { background:#1e1e1e; border:1px solid #444; color:#888; }
      .ocv-chip-name     { color:#aaa; }
      .ocv-status-icon   { font-size:10px; margin-left:2px; }
      .ocv-progress      { font-size:10px; color:#cc6644; font-weight:bold; margin-left:3px; }
      .ocv-progress.full { color:#44aa44; font-weight:bold; }
      .ocv-notes {
        font-size:12px; color:#aaa; border-left:2px solid #444;
        padding-left:8px; margin-top:5px;
      }
      .ocv-tip {
        font-size:11px; color:#7a9aaa; border-left:2px solid #336688;
        padding-left:8px; margin-top:6px; line-height:1.5;
      }
      .ocv-tip strong { color:#88bbdd; }
      .ocv-no-ocs { text-align:center; padding:16px; color:#555; font-style:italic; font-size:13px; }
      .ocv-cards-wrap { display:flex; flex-direction:column; gap:4px; }
      .ocv-live-badge {
        font-size:9px; color:#44aa44; border:1px solid #2a6a2a;
        background:#0d1a0d; border-radius:3px; padding:1px 5px; letter-spacing:1px;
      }
      .ocv-stale-badge {
        font-size:9px; color:#888; border:1px solid #333;
        background:#1a1a1a; border-radius:3px; padding:1px 5px; letter-spacing:1px;
      }
      /* Tab bar */
      #ocv-tabbar {
        display: flex; background: #0e0e0e;
        border-left: 1px solid #882222; border-right: 1px solid #882222;
        border-bottom: 1px solid #2a2a2a;
      }
      .ocv-tab {
        padding: 6px 16px; font-size: 10px; font-weight: bold;
        letter-spacing: 1px; text-transform: uppercase; color: #555;
        cursor: pointer; border: none; border-bottom: 2px solid transparent;
        background: none; transition: color 0.15s, border-color 0.15s;
      }
      .ocv-tab:hover { color: #aaa; }
      .ocv-tab.ocv-tab-active { color: #ff8787; border-bottom-color: #c82121; }
      /* CPR tab body */
      #ocv-cpr-body {
        background: #1a1a1a; border: 1px solid #882222; border-top: none;
        padding: 12px 14px; border-radius: 0 0 4px 4px; display: none;
      }
      .ocv-cpr-crime-card {
        background: #1e1e1e; border: 1px solid #2d2d2d;
        border-left: 3px solid #882222; border-radius: 4px;
        padding: 10px 12px; margin-bottom: 6px;
      }
      .ocv-cpr-crime-title {
        font-size: 10px; font-weight: bold; letter-spacing: 2px;
        text-transform: uppercase; color: #ff8787; margin-bottom: 8px;
      }
      .ocv-cpr-role-row {
        display: flex; align-items: center; gap: 8px;
        padding: 4px 0; border-bottom: 1px solid #2a2a2a; font-size: 12px;
      }
      .ocv-cpr-role-row:last-child { border-bottom: none; }
      .ocv-cpr-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
      .ocv-cpr-role-name { flex: 1; color: #ccc; }
      .ocv-cpr-req { font-size: 10px; color: #888; width: 90px; text-align: right; flex-shrink: 0; }
      .ocv-cpr-val { font-weight: bold; width: 64px; text-align: right; flex-shrink: 0; }
      .ocv-cpr-green  { color: #44cc44; }
      .ocv-cpr-orange { color: #ffaa33; }
      .ocv-cpr-grey   { color: #555; }
    `
    document.head.appendChild(s)
  }

  // ── Panel shell ───────────────────────────────────────────────────────────
  function injectPanel() {
    if (document.getElementById("ocv-wrapper")) return
    const userId  = GM_getValue("ocv-user-id", null)
    const idLabel = (userId && userId > 0) ? "ID: " + userId : "Set ID"

    const wrapper = document.createElement("div")
    wrapper.id = "ocv-wrapper"
    wrapper.innerHTML = `
      <div id="ocv-header">
        <div id="ocv-header-left">
          <span id="ocv-title">OC Priorities</span>
          <span id="ocv-meta">Loading...</span>
        </div>
        <div style="display:flex;gap:6px;align-items:center">
          <button id="ocv-id-btn" title="Set your Torn ID for CPR matching">${idLabel}</button>
          ${(userId && userId > 0) ? '<button id="ocv-filter-btn" title="Show only OCs you can join" style="font-size:10px;background:none;border:1px solid #333;border-radius:3px;padding:2px 7px;cursor:pointer;color:#555">⚑ My OCs</button>' : ''}
          <button id="ocv-refresh-btn">&#8635; Refresh</button>
          <button id="ocv-toggle-btn">&#9660; Hide</button>
        </div>
      </div>
      <div id="ocv-tabbar">
        <button class="ocv-tab ocv-tab-active" data-tab="oc">OC Priorities</button>
        <button class="ocv-tab" data-tab="cpr">My CPR</button>
      </div>
      <div id="ocv-body"><div id="ocv-loading">Fetching OC data...</div></div>
      <div id="ocv-cpr-body"><div style="color:#555;font-size:12px;text-align:center;padding:20px">Loading CPR data...</div></div>
    `

    const target = findContainer()
    if (target) target.insertBefore(wrapper, target.firstChild)
    else document.body.insertBefore(wrapper, document.body.firstChild)

    const collapsed = GM_getValue("ocv-collapsed", false)
    const body      = document.getElementById("ocv-body")
    const toggleBtn = document.getElementById("ocv-toggle-btn")
    if (collapsed) { body.classList.add("ocv-collapsed"); toggleBtn.textContent = "▶ Show" }

    document.getElementById("ocv-header").addEventListener("click", function(e) {
      const tgt = e.target.id
      if (tgt === "ocv-refresh-btn" || tgt === "ocv-id-btn") return
      const isNowCollapsed = !body.classList.contains("ocv-collapsed")
      body.classList.toggle("ocv-collapsed", isNowCollapsed)
      // Also collapse/show CPR body if it's active
      const cprBody = document.getElementById("ocv-cpr-body")
      const activeTab = document.querySelector(".ocv-tab.ocv-tab-active")
      if (cprBody && activeTab && activeTab.dataset.tab === "cpr") {
        cprBody.style.display = isNowCollapsed ? "none" : "block"
      }
      toggleBtn.textContent = isNowCollapsed ? "▶ Show" : "▼ Hide"
      GM_setValue("ocv-collapsed", isNowCollapsed)
    })

    // Tab switching
    document.getElementById("ocv-tabbar").addEventListener("click", function(e) {
      const tab = e.target.closest(".ocv-tab")
      if (!tab) return
      document.querySelectorAll(".ocv-tab").forEach(t => t.classList.remove("ocv-tab-active"))
      tab.classList.add("ocv-tab-active")
      const ocBody  = document.getElementById("ocv-body")
      const cprBody = document.getElementById("ocv-cpr-body")
      if (tab.dataset.tab === "oc") {
        ocBody.style.display  = ""
        cprBody.style.display = "none"
      } else {
        ocBody.style.display  = "none"
        cprBody.style.display = "block"
        ocvFetchCpr()
      }
    })

    document.getElementById("ocv-refresh-btn").addEventListener("click", function(e) {
      e.stopPropagation(); fetchAndRender()
    })

    const filterBtn = document.getElementById("ocv-filter-btn")
    if (filterBtn) {
      filterBtn.addEventListener("click", function(e) {
        e.stopPropagation()
        const active = filterBtn.dataset.active === "1"
        if (active) {
          filterBtn.dataset.active = "0"
          filterBtn.style.borderColor = "#333"
          filterBtn.style.color       = "#555"
          GM_setValue("ocv-filter-active", false)
          document.querySelectorAll(".ocv-oc-card").forEach(function(card) {
            card.style.display = ""
          })
          document.querySelectorAll(".ocv-section-label").forEach(function(el) {
            el.style.display = ""
          })
        } else {
          filterBtn.dataset.active = "1"
          filterBtn.style.borderColor = "#44aa44"
          filterBtn.style.color       = "#44aa44"
          GM_setValue("ocv-filter-active", true)
          document.querySelectorAll(".ocv-oc-card").forEach(function(card) {
            card.style.display = card.dataset.userEligible === "1" ? "" : "none"
          })
          // Hide section labels whose entire group is now hidden
          document.querySelectorAll(".ocv-cards-wrap").forEach(function(wrap) {
            const allHidden = Array.from(wrap.querySelectorAll(".ocv-oc-card"))
              .every(function(c) { return c.style.display === "none" })
            const label = wrap.previousElementSibling
            if (label && label.classList.contains("ocv-section-label")) {
              label.style.display = allHidden ? "none" : ""
            }
          })
        }
      })
    }

    document.getElementById("ocv-id-btn").addEventListener("click", function(e) {
      e.stopPropagation()
      const w = document.getElementById("ocv-wrapper")
      if (w) w.remove()
      GM_setValue("ocv-user-id", null)
      _ocvCprFetched  = false   // reset CPR cache
      _ocvGrowthCache = null    // reset growth cache
      GM_setValue("ocv-filter-active", false)  // reset filter
      showIdPrompt(function() { injectPanel(); fetchAndRender() })
    })
  }

  // ── Fetch all tables ──────────────────────────────────────────────────────
  function fetchAndRender() {
    const refreshBtn = document.getElementById("ocv-refresh-btn")
    const body       = document.getElementById("ocv-body")
    const meta       = document.getElementById("ocv-meta")
    if (refreshBtn) refreshBtn.disabled = true
    if (body) body.innerHTML = '<div id="ocv-loading">Fetching OC data...</div>'
    if (_timerInterval) { clearInterval(_timerInterval); _timerInterval = null }

    const userId = GM_getValue("ocv-user-id", null)
    const hasId  = userId && userId > 0

    let briefing     = null
    let liveMap      = null
    let cprReqMap    = {}
    let memberCpr    = {}
    let memberStatus = {}
    let done         = 0
    const TOTAL      = hasId ? 5 : 4
    let fatalErr     = false

    function onAllDone() {
      if (refreshBtn) setTimeout(function() { refreshBtn.disabled = false }, 3000)
      if (fatalErr) return
      renderBriefing(briefing, liveMap, cprReqMap, memberCpr, memberStatus, hasId)
      if (meta && briefing && briefing.published_at) {
        const pubAge  = Math.round((Date.now() - new Date(briefing.published_at).getTime()) / 60000)
        const pubStr  = pubAge < 1 ? "just now" : pubAge + "m ago"
        const liveRow = liveMap ? Object.values(liveMap)[0] : null
        const liveAge = liveRow ? Math.round((Date.now() - new Date(liveRow.fetched_at).getTime()) / 60000) : null
        const liveStr = liveAge !== null ? (liveAge < 1 ? "just now" : liveAge + "m ago") : "—"
        meta.innerHTML = "Published: <span>" + pubStr + "</span> &nbsp;|&nbsp; Live data: <span>" + liveStr + "</span>"
      }
    }

    function sbGet(endpoint, cb) {
      GM_xmlhttpRequest({
        method:  "GET",
        url:     SB_URL + endpoint,
        headers: { "apikey": SB_ANON_KEY, "Authorization": "Bearer " + SB_ANON_KEY },
        onload: function(res) {
          try {
            if (res.status < 200 || res.status >= 300) throw new Error("HTTP " + res.status)
            cb(null, JSON.parse(res.responseText))
          } catch(e) { cb(e, null) }
          done++; if (done === TOTAL) onAllDone()
        },
        onerror: function(e) {
          cb(e, null)
          done++; if (done === TOTAL) onAllDone()
        }
      })
    }

    sbGet("/rest/v1/oc_briefing?id=eq.1&select=*&limit=1", function(err, rows) {
      if (err || !rows || !rows.length) {
        fatalErr = true
        if (body) body.innerHTML = '<div id="ocv-error">No briefing published yet.</div>'
        if (meta) meta.innerHTML = '<span style="color:#888">No data</span>'
        if (refreshBtn) refreshBtn.disabled = false
        return
      }
      briefing = rows[0]
    })

    sbGet("/rest/v1/oc_live_data?select=*", function(err, rows) {
      if (err) { console.warn("[OCV] Live data:", err); return }
      liveMap = {}
      for (const row of (rows || [])) liveMap[row.id] = row
    })

    sbGet("/rest/v1/oc_cpr_requirements?select=*", function(err, rows) {
      if (err) { console.warn("[OCV] CPR reqs:", err); return }
      for (const row of (rows || [])) {
        if (row.min_cpr !== null)
          cprReqMap[(row.crime_name + "|" + row.role_name).toLowerCase()] = row.min_cpr
      }
    })

    sbGet("/rest/v1/oc_members?select=id,name,status&limit=500", function(err, rows) {
      if (err) { console.warn("[OCV] Members:", err); return }
      for (const row of (rows || [])) memberStatus[row.id] = row.status
    })

    if (hasId) {
      sbGet("/rest/v1/oc_member_cpr?user_id=eq." + userId + "&select=*", function(err, rows) {
        if (err) { console.warn("[OCV] Member CPR:", err); return }
        for (const row of (rows || []))
          memberCpr[(row.crime_name + "|" + row.role_name).toLowerCase()] = row.cpr
      })
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  function renderBriefing(briefing, liveMap, cprReqMap, memberCpr, memberStatus, hasId) {
    const body = document.getElementById("ocv-body")
    if (!body || !briefing) return

    let html = ""

    // Announcements
    const anns = briefing.announcements || []
    if (anns.length) {
      const annCollapsed = GM_getValue("ocv-ann-collapsed", false)
      html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">'
        + '<span style="font-size:12px;font-weight:bold;letter-spacing:3px;color:#888;text-transform:uppercase">Announcements</span>'
        + '<span style="flex:1;height:1px;background:#444;opacity:0.6"></span>'
        + '<button class="ocv-instr-toggle" data-target="ocv-announcements-body" '
        + 'style="background:none;border:none;color:#555;font-size:11px;cursor:pointer;padding:0 2px;letter-spacing:1px">'
        + (annCollapsed ? "▶" : "▼") + '</button>'
        + '</div>'
      html += '<div id="ocv-announcements-body" style="display:' + (annCollapsed ? "none" : "block") + ';border:1px solid #2a2a2a;border-radius:4px;overflow:hidden;margin-bottom:12px">'
      anns.forEach(function(a) {
        const cls = "ocv-badge ocv-badge-" + (a.level || "normal")
        html += '<div class="ocv-ann-row"><span class="' + cls + '">' + (a.level || "normal").toUpperCase() + '</span>'
          + '<span class="ocv-ann-msg">' + escHTML(a.message) + '</span></div>'
      })
      html += '</div>'
    }

    // Period income
    if (briefing.period_income || briefing.period_start || briefing.period_end) {
      html += '<div class="ocv-income-bar">'
      if (briefing.period_start || briefing.period_end) {
        html += '<div style="font-size:10px;color:#888;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px">'
          + 'Current Period: <span style="color:#aaa;font-weight:bold">'
          + escHTML(briefing.period_start || "")
          + (briefing.period_start && briefing.period_end ? " → " : "")
          + escHTML(briefing.period_end || "")
          + '</span></div>'
      }
      if (briefing.period_income) {
        html += 'OC Income This Period: <strong>' + escHTML(briefing.period_income) + '</strong>'
      }
      html += '</div>'
    }

    // Section header + legend
    const hasLive = liveMap && Object.keys(liveMap).length > 0
    html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">'
      + '<span style="font-size:12px;font-weight:bold;letter-spacing:3px;color:#888;text-transform:uppercase">Actively Recruiting OCs</span>'
      + '<span style="flex:1;height:1px;background:#444;opacity:0.6"></span>'
      + (hasLive ? '&nbsp;<span class="ocv-live-badge">LIVE</span>' : '&nbsp;<span class="ocv-stale-badge">CONFIG ONLY</span>')
      + '</div>'

    html += '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:8px;padding:5px 8px;background:#111;border:1px solid #222;border-radius:4px;font-size:11px;">'
      + '<span style="color:#555">Legend:</span>'
      + '<span><span style="display:inline-block;width:10px;height:10px;background:#0d1a0d;border:1px solid #2a7a2a;border-radius:2px;vertical-align:middle;margin-right:4px"></span>'
      + '<span style="color:#888">' + (hasId ? 'Meets CPR' : 'Open') + '</span></span>'
      + (hasId ? '<span><span style="display:inline-block;width:10px;height:10px;background:#1a1000;border:1px solid #7a5a00;border-radius:2px;vertical-align:middle;margin-right:4px"></span><span style="color:#888">CPR too low</span></span>' : '')
      + '<span><span style="display:inline-block;width:10px;height:10px;background:#1e1e1e;border:1px solid #444;border-radius:2px;vertical-align:middle;margin-right:4px"></span><span style="color:#888">Filled</span></span>'
      + '<span><span style="color:#cc6644;font-weight:bold;margin-right:4px">71%</span><span style="color:#888">Planning</span></span>'
      + '<span><span style="color:#44aa44;font-weight:bold;margin-right:4px">100%</span><span style="color:#888">Complete</span></span>'
      + '</div>'

    const configOcs = briefing.ocs || []
    if (!configOcs.length) {
      html += '<div class="ocv-no-ocs">No OCs currently published.</div>'
    } else {
      const nowSec      = Math.floor(Date.now() / 1000)
      const URGENT_SECS = 3 * 3600
      const sorted = configOcs.slice().sort(function(a, b) {
        const lA  = (liveMap && a.crimeId) ? (liveMap[parseInt(a.crimeId)] || null) : null
        const lB  = (liveMap && b.crimeId) ? (liveMap[parseInt(b.crimeId)] || null) : null
        const dA  = lA && lA.ready_at ? lA.ready_at - nowSec : null
        const dB  = lB && lB.ready_at ? lB.ready_at - nowSec : null
        const uA  = dA !== null && dA <= URGENT_SECS
        const uB  = dB !== null && dB <= URGENT_SECS
        if (uA && uB) return dA - dB
        if (uA) return -1
        if (uB) return 1
        return 0
      })

      // Group by priority for subsections, preserving urgency sort within each group
      const groups = [
        { key: "urgent", label: "URGENT",        color: "#ff4444" },
        { key: "normal", label: "NORMAL",        color: "#ff8787" },
        { key: "low",    label: "LOW",           color: "#8888cc" },
        { key: "hold",   label: "HOLD OFF JOINING FOR NOW", color: "#ccaa00" },
        { key: "info",   label: "INFO",          color: "#55bb55" },
      ]

      let cardIdx  = 0
      let firstGroup = true

      groups.forEach(function(group) {
        const groupOcs = sorted.filter(function(oc) {
          return (oc.priority || "normal") === group.key
        })
        // Filter out fully filled within group
        const visible = groupOcs.filter(function(oc) {
          const live      = (liveMap && oc.crimeId) ? (liveMap[parseInt(oc.crimeId)] || null) : null
          const liveSlots = live ? (live.slots || []) : null
          return !(liveSlots && liveSlots.length > 0 && liveSlots.every(function(s) { return s.filled }))
        })
        if (!visible.length) return

        // Subsection header
        html += '<div style="display:flex;align-items:center;gap:8px;margin:' + (firstGroup ? '0' : '14px') + ' 0 6px 0">'
          + '<span style="font-size:11px;font-weight:bold;letter-spacing:3px;color:' + group.color + ';text-transform:uppercase;text-shadow:0 0 8px ' + group.color + '44">' + group.label + '</span>'
          + '<span style="flex:1;height:1px;background:' + group.color + ';opacity:0.4"></span>'
          + '</div>'
        firstGroup = false

        html += '<div class="ocv-cards-wrap">'
        visible.forEach(function(oc) {
        const pri       = oc.priority || "normal"
        const live      = (liveMap && oc.crimeId) ? (liveMap[parseInt(oc.crimeId)] || null) : null
        const liveSlots = live ? (live.slots || []) : null
        const readyAt   = live ? live.ready_at : null

        const bg = cardIdx % 2 === 0 ? "#1a1a1a" : "#242424"
        cardIdx++

        const liveCrimeName = live ? live.name : oc.name
        const crimeKey      = liveCrimeName.toLowerCase()

        function getReqCpr(roleLabel) {
          return cprReqMap[(liveCrimeName + "|" + roleLabel).toLowerCase()] || null
        }
        function getMyMemberCpr(roleLabel) {
          const base = roleLabel.replace(/\s*#\d+$/, "").trim()
          const val  = memberCpr[(liveCrimeName + "|" + base).toLowerCase()]
          return val !== undefined ? val : null
        }

        // Name / link
        const crimeUrl = oc.crimeUrl || ""
        const nameHTML = crimeUrl
          ? '<a class="ocv-oc-name" href="' + crimeUrl + '" target="_blank">' + escHTML(oc.name) + '</a>'
            + '<span class="ocv-ctrl-hint">[Ctrl+Click]</span>'
          : '<span class="ocv-oc-name-plain">' + escHTML(oc.name) + '</span>'

        // Slot count
        let filledCount = 0, totalCount = 0
        if (liveSlots) {
          filledCount = liveSlots.filter(function(s) { return s.filled }).length
          totalCount  = liveSlots.length
        } else if (oc.slots) {
          const p = String(oc.slots).split("/")
          filledCount = parseInt(p[0]) || 0; totalCount = parseInt(p[1]) || 0
        }
        const slotsHTML = totalCount ? '<span class="ocv-slots">[ ' + filledCount + "/" + totalCount + ' filled ]</span>' : ""

        // Priority badge
        const badgeMap = { urgent:"ocv-badge-urgent", normal:"ocv-badge-normal", low:"ocv-badge-low", info:"ocv-badge-info", hold:"ocv-badge-hold" }
        const badgeHTML = '<span class="ocv-badge ' + (badgeMap[pri] || "ocv-badge-normal") + '">' + pri.toUpperCase() + '</span>'

        // Timer
        let timerHTML
        if (readyAt) {
          timerHTML = '<span class="ocv-timer">OC Stalls in: <strong class="ocv-countdown" data-ready="' + readyAt + '">--:--:--</strong></span>'
        } else if (oc.timer && oc.timer !== "N/A") {
          timerHTML = '<span class="ocv-timer">OC Stalls in: <strong>' + escHTML(oc.timer) + '</strong></span>'
        } else {
          timerHTML = '<span class="ocv-timer" style="color:#555">Stall time N/A</span>'
        }

        // Role chips
        let rolesHTML = '<div class="ocv-roles">'
        const openSlots = []

        if (liveSlots && liveSlots.length) {
          const open   = liveSlots.filter(function(s) { return !s.filled })
          const filled = liveSlots.filter(function(s) { return s.filled })
            .sort(function(a, b) { return (b.progress || 0) - (a.progress || 0) })

          open.forEach(function(slot) {
            openSlots.push(slot.position)
            const reqCpr   = getReqCpr(slot.position)
            const myCpr    = hasId ? getMyMemberCpr(slot.position) : null
            const noData   = hasId && myCpr === null && reqCpr !== null  // has req, no data → treat as ineligible
            const tooLow   = hasId && myCpr !== null && reqCpr !== null && myCpr < reqCpr
            const ineligible = noData || tooLow

            const chipClass = ineligible ? "ocv-chip ocv-chip-open-no" : "ocv-chip ocv-chip-open"
            let label = escHTML(slot.position)
            if (hasId && reqCpr) {
              if (myCpr !== null) {
                label += ' <span style="font-size:10px;opacity:0.75">| ' + myCpr + "/" + reqCpr + "+</span>"
              } else {
                label += ' <span style="font-size:10px;opacity:0.55">| N/A/' + reqCpr + "+</span>"
              }
            } else if (!hasId && reqCpr) {
              label += ' <span style="font-size:10px;opacity:0.55">| CPR: ' + reqCpr + "+</span>"
            }
            rolesHTML += '<span class="' + chipClass + '">' + label + '</span>'
          })

          filled.forEach(function(slot) {
            const prog    = slot.progress !== null ? Math.round(slot.progress) : null
            const progStr = prog !== null
              ? '<span class="ocv-progress' + (prog === 100 ? " full" : "") + '">' + prog + '%</span>' : ""
            const status  = slot.user_id ? (memberStatus[slot.user_id] || "Okay") : "Okay"
            const iconMap = { "Traveling": "✈", "Hospital": "+", "Jail": "🔒" }
            const icon    = iconMap[status]
              ? ' <span class="ocv-status-icon" title="' + status + '">' + iconMap[status] + '</span>'
              : ""
            rolesHTML += '<span class="ocv-chip ocv-chip-filled">'
              + escHTML(slot.position) + ': <span class="ocv-chip-name">'
              + escHTML(slot.user_name || "?") + '</span>' + icon + progStr + '</span>'
          })

        } else if (oc.roles && oc.roles.length) {
          oc.roles.forEach(function(r) {
            if (r.status === "filled") {
              rolesHTML += '<span class="ocv-chip ocv-chip-filled">' + escHTML(r.role)
                + (r.memberName ? ': <span class="ocv-chip-name">' + escHTML(r.memberName) + '</span>' : "") + '</span>'
            } else {
              openSlots.push(r.role)
              const reqCpr = getReqCpr(r.role) || r.cpr || null
              const myCpr  = hasId ? getMyMemberCpr(r.role) : null
              const tooLow = hasId && myCpr !== null && reqCpr !== null && myCpr < reqCpr
              const chipClass = tooLow ? "ocv-chip ocv-chip-open-no" : "ocv-chip ocv-chip-open"
              let label = escHTML(r.role)
              if (reqCpr) label += ' <span style="font-size:10px;opacity:0.55">| CPR: ' + reqCpr + "+</span>"
              rolesHTML += '<span class="' + chipClass + '">' + label + '</span>'
            }
          })
        }
        rolesHTML += '</div>'

        // Pro tip — only if user has ID and there are open slots
        let tipHTML = ""
        if (hasId && openSlots.length > 0) {
          tipHTML = buildProTip(crimeKey, openSlots, getReqCpr, getMyMemberCpr)
        }

        // Collapsible instructions section
        let instrHTML = ""
        const instrs = oc.instructions || []
        if (instrs.length) {
          const instrId = "ocv-instr-" + cardIdx
          const condLabels = {
            normal:  "⚠ Stall Warning",
            urgent:  "🔴 Stall Warning — Urgent",
            // legacy support
            below24: "⚠ Stall Warning",
            above48: "⚠ Stall Warning",
            above72: "⚠ Stall Warning",
            general: "⚠ Stall Warning",
          }
          let rows = instrs.map(function(r) {
            const color = r.type === "stall" ? (r.cond === "urgent" ? "#ff4444" : "#c8c800")
                        : r.type === "cpr"   ? "#55bbdd"
                        : "#9999cc"
            const condHead = r.type === "stall"
              ? '<span style="color:' + color + ';font-weight:bold">' + (condLabels[r.cond] || "⚠ Stall Warning") + ':</span> '
              : r.type === "cpr"  ? '<span style="color:#55bbdd;font-weight:bold">Hard CPR Requirements:</span> '
              : r.type === "note" ? '<span style="color:#888;font-weight:bold">Note:</span> '
              : ""
            return '<div style="padding:4px 0;border-bottom:1px solid #2a2a2a">'
              + condHead
              + '<span style="color:#ccc;font-size:12px">' + escHTML(r.text) + '</span>'
              + '</div>'
          }).join("")
          instrHTML = '<div style="margin-top:5px">'
            + '<button class="ocv-instr-toggle" data-target="' + instrId + '" '
            + 'style="background:none;border:none;color:#666;font-size:10px;cursor:pointer;padding:0;letter-spacing:1px">▼ INSTRUCTIONS (' + instrs.length + ')</button>'
            + '<div id="' + instrId + '" style="display:block;margin-top:5px;padding:6px 8px;background:#111;border:1px solid #2a2a2a;border-radius:3px">'
            + rows + '</div></div>'
        }

        // Determine if user can join any open slot (for filter toggle)
        let userCanJoin = !hasId  // if no ID, always show
        if (hasId && openSlots.length > 0) {
          // Check if at least one open chip is green (eligible)
          userCanJoin = Array.from(document.querySelectorAll ? [] : []).length >= 0  // placeholder, resolved below
          userCanJoin = false
          // Re-examine open slots against CPR
          if (liveSlots && liveSlots.length) {
            liveSlots.filter(function(s) { return !s.filled }).forEach(function(slot) {
              const reqCpr   = getReqCpr(slot.position)
              const myCpr    = getMyMemberCpr(slot.position)
              const noData   = myCpr === null && reqCpr !== null
              const tooLow   = myCpr !== null && reqCpr !== null && myCpr < reqCpr
              if (!noData && !tooLow) userCanJoin = true
            })
          } else if (oc.roles) {
            oc.roles.filter(function(r) { return r.status !== "filled" }).forEach(function(r) {
              const reqCpr = getReqCpr(r.role) || r.cpr || null
              const myCpr  = getMyMemberCpr(r.role)
              const tooLow = myCpr !== null && reqCpr !== null && myCpr < reqCpr
              if (!tooLow) userCanJoin = true
            })
          }
        }

        html += '<div class="ocv-oc-card pri-' + pri + '" data-user-eligible="' + (userCanJoin ? "1" : "0") + '" style="background:' + bg + '">'
          + '<div class="ocv-oc-header">' + nameHTML + slotsHTML + badgeHTML + timerHTML + '</div>'
          + rolesHTML + tipHTML + instrHTML + '</div>'
        })   // end visible.forEach
        html += '</div>'  // close this group's ocv-cards-wrap
      })     // end groups.forEach
    }

    body.innerHTML = html

    // Restore filter state if it was active
    if (hasId && GM_getValue("ocv-filter-active", false)) {
      const filterBtn = document.getElementById("ocv-filter-btn")
      if (filterBtn) {
        filterBtn.dataset.active    = "1"
        filterBtn.style.borderColor = "#44aa44"
        filterBtn.style.color       = "#44aa44"
        document.querySelectorAll(".ocv-oc-card").forEach(function(card) {
          card.style.display = card.dataset.userEligible === "1" ? "" : "none"
        })
        document.querySelectorAll(".ocv-cards-wrap").forEach(function(wrap) {
          const allHidden = Array.from(wrap.querySelectorAll(".ocv-oc-card"))
            .every(function(c) { return c.style.display === "none" })
          const label = wrap.previousElementSibling
          if (label && label.classList.contains("ocv-section-label")) {
            label.style.display = allHidden ? "none" : ""
          }
        })
      }
    }

    // Instruction panel toggles
    body.addEventListener("click", function(e) {
      const btn = e.target.closest(".ocv-instr-toggle")
      if (!btn) return
      const target = document.getElementById(btn.dataset.target)
      if (!target) return
      const open = target.style.display !== "none"
      target.style.display = open ? "none" : "block"
      btn.textContent = (open ? "▶" : "▼") + btn.textContent.slice(1)
      // Persist announcements collapsed state
      if (btn.dataset.target === "ocv-announcements-body") {
        GM_setValue("ocv-ann-collapsed", open)
      }
    })

    if (_timerInterval) clearInterval(_timerInterval)
    _timerInterval = setInterval(tickCountdowns, 1000)
    tickCountdowns()
  }

  // ── Pro tip builder ───────────────────────────────────────────────────────
  function buildProTip(crimeKey, openSlots, getReqCpr, getMyCpr) {
    // Get ordered priority list for this crime
    const priorityFull = ROLE_PRIORITY_FULL[crimeKey] || null
    const priorityBase = ROLE_PRIORITY[crimeKey] || null
    if (!priorityBase && !priorityFull) return ""

    // Build list of open slots the member qualifies for, in priority order
    const qualified = []

    if (priorityFull) {
      priorityFull.forEach(function(roleLabel) {
        if (openSlots.indexOf(roleLabel) === -1) return
        const req = getReqCpr(roleLabel)
        const my  = getMyCpr(roleLabel)
        const noData = my === null && req !== null   // has req but no CPR data → exclude
        if (!noData && (req === null || my >= req)) qualified.push(roleLabel)
      })
    } else {
      priorityBase.forEach(function(baseName) {
        openSlots.forEach(function(slot) {
          const slotBase = slot.replace(/\s*#\d+$/, "").trim()
          if (slotBase.toLowerCase() !== baseName.toLowerCase()) return
          const req    = getReqCpr(slot)
          const my     = getMyCpr(slot)
          const noData = my === null && req !== null  // has req but no CPR data → exclude
          if (!noData && (req === null || my >= req)) {
            if (qualified.indexOf(slot) === -1) qualified.push(slot)
          }
        })
      })
    }

    if (!qualified.length) return ""

    // Build readable tip
    const ordinals = ["1st", "2nd", "3rd", "4th", "5th"]
    const parts = qualified.slice(0, 3).map(function(role, idx) {
      return '<strong>' + ordinals[idx] + ':</strong> ' + escHTML(role)
    })

    return '<div class="ocv-tip">Recommended for you: ' + parts.join(" &nbsp;·&nbsp; ") + '</div>'
  }

  // ── Countdown ticker ──────────────────────────────────────────────────────
  function tickCountdowns() {
    const els = document.querySelectorAll(".ocv-countdown")
    if (!els.length) { clearInterval(_timerInterval); _timerInterval = null; return }
    const now = Math.floor(Date.now() / 1000)
    els.forEach(function(el) {
      const diff = parseInt(el.dataset.ready) - now
      if (diff <= 0) { el.textContent = "STALLED"; el.classList.add("stalled") }
      else {
        el.textContent = pad(Math.floor(diff / 3600)) + ":" + pad(Math.floor((diff % 3600) / 60)) + ":" + pad(diff % 60)
        el.classList.remove("stalled")
      }
    })
  }

  function pad(n) { return String(n).padStart(2, "0") }
  function escHTML(str) {
    if (!str) return ""
    return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")
  }

  // ── CPR Tab ───────────────────────────────────────────────────────────────
  let _ocvCprReqs     = []
  let _ocvCprFetched  = false
  let _ocvGrowthCache = null   // null = not fetched; {} = fetched, keyed by crime_name

  function ocvFetchCpr() {
    const userId = GM_getValue("ocv-user-id", null)
    const cprBody = document.getElementById("ocv-cpr-body")
    if (!cprBody) return

    if (!userId || userId <= 0) {
      cprBody.innerHTML = '<div style="color:#666;font-size:12px;text-align:center;padding:20px">Set your Torn ID (top right) to view your CPR profile.</div>'
      return
    }

    if (_ocvCprFetched) return  // already loaded this session
    cprBody.innerHTML = '<div style="color:#555;font-size:12px;text-align:center;padding:20px">Loading CPR data...</div>'

    let cprRows  = null
    let reqRows  = null
    let done     = 0

    function onBothDone() {
      if (cprRows === null || reqRows === null) return
      _ocvCprReqs    = reqRows
      _ocvCprFetched = true
      ocvRenderCpr(cprRows, reqRows)
    }

    // Fetch member CPR by user_id
    GM_xmlhttpRequest({
      method: "GET",
      url: SB_URL + "/rest/v1/oc_member_cpr?user_id=eq." + userId + "&select=crime_name,role_name,cpr",
      headers: { "apikey": SB_ANON_KEY, "Authorization": "Bearer " + SB_ANON_KEY },
      onload: function(res) {
        try { cprRows = JSON.parse(res.responseText) || [] } catch(e) { cprRows = [] }
        onBothDone()
      },
      onerror: function() { cprRows = []; onBothDone() }
    })

    // Fetch requirements (or use cached)
    if (_ocvCprReqs.length) {
      reqRows = _ocvCprReqs
      onBothDone()
    } else {
      GM_xmlhttpRequest({
        method: "GET",
        url: SB_URL + "/rest/v1/oc_cpr_requirements?select=*",
        headers: { "apikey": SB_ANON_KEY, "Authorization": "Bearer " + SB_ANON_KEY },
        onload: function(res) {
          try { reqRows = JSON.parse(res.responseText) || [] } catch(e) { reqRows = [] }
          onBothDone()
        },
        onerror: function() { reqRows = []; onBothDone() }
      })
    }
  }

  function ocvRenderCpr(rows, reqs) {
    const cprBody = document.getElementById("ocv-cpr-body")
    if (!cprBody) return

    if (!rows.length) {
      cprBody.innerHTML = '<div style="color:#666;font-size:12px;text-align:center;padding:20px">No CPR data found for your ID.<br><span style="font-size:11px;color:#444">Data updates daily at 06:00 TCT. You may not be on TornStats yet.</span></div>'
      return
    }

    // Index TornStats data — strip #N suffix for matching
    const cprIndex = {}
    rows.forEach(function(r) {
      const crimeKey = (r.crime_name || "").toLowerCase()
      const roleKey  = (r.role_name  || "").toLowerCase().replace(/\s*#\d+$/, "").trim()
      if (!cprIndex[crimeKey]) cprIndex[crimeKey] = {}
      cprIndex[crimeKey][roleKey] = r.cpr
    })

    const crimeOrder = [
      "ace in the hole", "stacking the deck", "blast from the past",
      "clinical precision", "break the bank"
    ]
    const crimeDisplay = {
      "ace in the hole":     "Ace in the Hole",
      "stacking the deck":   "Stacking the Deck",
      "blast from the past": "Blast from the Past",
      "clinical precision":  "Clinical Precision",
      "break the bank":      "Break the Bank"
    }
    const borderColors = {
      "ace in the hole":     "#882222",
      "stacking the deck":   "#224488",
      "blast from the past": "#226644",
      "clinical precision":  "#664422",
      "break the bank":      "#555577"
    }
    const levelGroups = [
      { level: 9, crimes: ["ace in the hole"] },
      { level: 8, crimes: ["break the bank", "stacking the deck", "clinical precision"] },
      { level: 7, crimes: ["blast from the past"] },
    ]

    let html = '<div style="font-size:11px;color:#555;margin-bottom:10px">CPR data updated daily at 06:00 TCT</div>'

    levelGroups.forEach(function(group) {
      // Only show the level header if at least one crime in this group has data
      const hasData = group.crimes.some(function(crimeKey) {
        const crimeReqs = reqs.filter(function(q) { return q.crime_name.toLowerCase() === crimeKey })
        const tornRoles = cprIndex[crimeKey] || {}
        return crimeReqs.length || Object.keys(tornRoles).length
      })
      if (!hasData) return

      html += '<div style="font-size:10px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;'
        + 'color:#666;margin:12px 0 6px 0;padding-bottom:4px;border-bottom:1px solid #2a2a2a">'
        + 'Level ' + group.level + '</div>'

      group.crimes.forEach(function(crimeKey) {
        const crimeReqs  = reqs.filter(function(q) { return q.crime_name.toLowerCase() === crimeKey })
        const tornRoles  = cprIndex[crimeKey] || {}
        const reqBaseKeys = crimeReqs.map(function(q) { return q.role_name.toLowerCase().replace(/\s*#\d+$/, "").trim() })
        const extraRoles  = Object.keys(tornRoles).filter(function(rk) { return !reqBaseKeys.includes(rk) })
        if (!crimeReqs.length && !Object.keys(tornRoles).length) return

        const cardId  = "ocv-card-" + crimeKey.replace(/\s+/g, "-")
        const bc = borderColors[crimeKey] || "#444"
        html += '<div class="ocv-cpr-crime-card" id="' + cardId + '" style="border-left-color:' + bc + '">'
        html += '<div class="ocv-cpr-crime-title">' + (crimeDisplay[crimeKey] || crimeKey) + '</div>'
        html += '<div class="ocv-cpr-role-row" style="border-bottom:1px solid #333;margin-bottom:4px;padding-bottom:4px">'
          + '<span class="ocv-cpr-dot" style="background:transparent"></span>'
          + '<span class="ocv-cpr-role-name" style="color:#555;font-size:10px;letter-spacing:1px;text-transform:uppercase">Role</span>'
          + '<span class="ocv-cpr-req" style="color:#555;font-size:10px;letter-spacing:1px;text-transform:uppercase">Requirement</span>'
          + '<span class="ocv-cpr-val" style="color:#555;font-size:10px;letter-spacing:1px;text-transform:uppercase">Your CPR</span>'
          + '<span style="font-size:10px;color:#555;letter-spacing:1px;text-transform:uppercase;width:72px;text-align:right;flex-shrink:0">Variance</span>'
          + '</div>'

        crimeReqs.forEach(function(req) {
          const baseKey  = req.role_name.toLowerCase().replace(/\s*#\d+$/, "").trim()
          const cpr      = (tornRoles[baseKey] !== undefined) ? tornRoles[baseKey] : null
          const minCpr   = req.min_cpr
          const roleSlug = req.role_name.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9\-]/g, "")
          const valId    = cardId + "-" + roleSlug

          let dotColor, valClass
          if (cpr === null)         { dotColor = "#444";    valClass = "ocv-cpr-grey" }
          else if (minCpr === null) { dotColor = "#44aa44"; valClass = "ocv-cpr-green" }
          else if (cpr >= minCpr)   { dotColor = "#44aa44"; valClass = "ocv-cpr-green" }
          else                      { dotColor = "#ffaa33"; valClass = "ocv-cpr-orange" }

          const cprDisplay = cpr !== null ? cpr : "—"
          const reqDisplay = minCpr !== null ? minCpr + "+" : "No req."

          let deltaHTML = ""
          if (cpr !== null && minCpr !== null) {
            const diff = cpr - minCpr
            let dc, dt
            if (diff === 0) {
              dc = "#2a7a2a"; dt = "✓ exact"
            } else if (diff > 0) {
              dc = diff >= 15 ? "#00ff88" : diff >= 8 ? "#44cc44" : diff >= 3 ? "#2a7a2a" : "#1a4a1a"
              dt = "+" + diff + " over"
            } else {
              dc = diff <= -21 ? "#ff2222" : diff <= -13 ? "#cc2222" : diff <= -6 ? "#cc4400" : diff <= -3 ? "#cc6600" : "#cc7700"
              dt = diff + " short"
            }
            deltaHTML = '<span style="font-size:10px;font-weight:bold;color:' + dc + ';width:72px;text-align:right;flex-shrink:0">' + dt + '</span>'
          }

          html += '<div class="ocv-cpr-role-row">'
            + '<span class="ocv-cpr-dot" style="background:' + dotColor + '"></span>'
            + '<span class="ocv-cpr-role-name">' + escHTML(req.role_name) + '</span>'
            + '<span class="ocv-cpr-req">' + reqDisplay + '</span>'
            + '<span class="ocv-cpr-val ' + valClass + '" id="' + valId + '" data-cpr="' + (cpr !== null ? cpr : "") + '">'
            + cprDisplay + '</span>'
            + deltaHTML
            + '</div>'
        })

        extraRoles.forEach(function(roleKey) {
          const cpr      = tornRoles[roleKey]
          const roleSlug = roleKey.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9\-]/g, "")
          const valId    = cardId + "-" + roleSlug
          html += '<div class="ocv-cpr-role-row">'
            + '<span class="ocv-cpr-dot" style="background:#44aa44"></span>'
            + '<span class="ocv-cpr-role-name" style="text-transform:capitalize">' + escHTML(roleKey) + '</span>'
            + '<span class="ocv-cpr-req">No req.</span>'
            + '<span class="ocv-cpr-val ocv-cpr-green" id="' + valId + '" data-cpr="' + cpr + '">' + cpr + '</span>'
            + '</div>'
        })

        html += '</div>'  // close crime card

        // Growth toggle — lazy loads on click
        const growthId = "ocv-growth-" + crimeKey.replace(/\s+/g, "-")
        html += '<div style="text-align:right;margin-top:-4px;margin-bottom:6px">'
          + '<button class="ocv-growth-btn" data-crime="' + escHTML(crimeKey) + '" data-panel="' + growthId + '" data-card="' + cardId + '" '
          + 'style="background:none;border:none;color:#336655;font-size:10px;cursor:pointer;letter-spacing:1px;padding:2px 0">▶ Show Growth</button>'
          + '</div>'
          + '<div id="' + growthId + '" style="display:none;margin-bottom:8px"></div>'
      })  // end group.crimes.forEach
    })  // end levelGroups.forEach

    // Wire growth toggles
    cprBody.addEventListener("click", function(e) {
      const btn = e.target.closest(".ocv-growth-btn")
      if (btn) {
        const panelId  = btn.dataset.panel
        const crimeKey = btn.dataset.crime
        const cardId   = btn.dataset.card
        const panel    = document.getElementById(panelId)
        if (!panel) return
        const open = panel.style.display !== "none"
        if (open) {
          panel.style.display = "none"
          btn.textContent = "▶ Show Growth"
          btn.style.color = "#336655"
          ocvClearDeltas(cardId)
        } else {
          panel.style.display = "block"
          btn.textContent = "▼ Hide Growth"
          btn.style.color = "#44aa77"
          if (!panel.dataset.loaded) {
            ocvFetchGrowth(crimeKey, cardId, panel)
            panel.dataset.loaded = "1"
          }
        }
        return
      }

      // Period selector button clicks
      const periodBtn = e.target.closest(".ocv-period-btn")
      if (periodBtn) {
        const cardId  = periodBtn.dataset.card
        const days    = parseInt(periodBtn.dataset.days)
        const panel   = periodBtn.closest(".ocv-growth-panel")
        if (!panel) return
        panel.querySelectorAll(".ocv-period-btn").forEach(function(b) {
          b.style.borderColor = "#2a2a2a"
          b.style.color       = "#555"
        })
        periodBtn.style.borderColor = "#44aa77"
        periodBtn.style.color       = "#44aa77"
        ocvApplyDeltas(cardId, days, panel._historyByRole)
      }
    })

    cprBody.innerHTML = html
  }

  function ocvFetchGrowth(crimeKey, cardId, panel) {
    const userId = GM_getValue("ocv-user-id", null)
    if (!userId) return

    // If already cached, serve immediately — zero API calls
    if (_ocvGrowthCache !== null) {
      ocvRenderGrowth(crimeKey, cardId, _ocvGrowthCache[crimeKey] || [], panel)
      return
    }

    panel.innerHTML = '<div style="color:#555;font-size:11px;padding:6px 0">Loading growth data...</div>'

    const since = new Date()
    since.setFullYear(since.getFullYear() - 1)
    const sinceStr = since.toISOString().split("T")[0]

    // Fetch ALL crimes for this user in one request — cache covers all panels
    GM_xmlhttpRequest({
      method: "GET",
      url: SB_URL + "/rest/v1/oc_member_cpr_history"
        + "?user_id=eq." + userId
        + "&recorded_date=gte." + sinceStr
        + "&select=crime_name,role_name,cpr,recorded_date"
        + "&order=recorded_date.asc",
      headers: { "apikey": SB_ANON_KEY, "Authorization": "Bearer " + SB_ANON_KEY },
      onload: function(res) {
        try {
          const rows = JSON.parse(res.responseText) || []

          // Build cache: { crimeName: [ {role_name, cpr, recorded_date}, ... ] }
          _ocvGrowthCache = {}
          rows.forEach(function(r) {
            const k = r.crime_name
            if (!_ocvGrowthCache[k]) _ocvGrowthCache[k] = []
            _ocvGrowthCache[k].push(r)
          })

          ocvRenderGrowth(crimeKey, cardId, _ocvGrowthCache[crimeKey] || [], panel)
        } catch(e) {
          panel.innerHTML = '<div style="color:#cc4444;font-size:11px;padding:6px 0">Failed to load growth data.</div>'
        }
      },
      onerror: function() {
        panel.innerHTML = '<div style="color:#cc4444;font-size:11px;padding:6px 0">Network error.</div>'
      }
    })
  }

  function ocvRenderGrowth(crimeKey, cardId, rows, panel) {
    if (!rows.length) {
      panel.innerHTML = '<div style="color:#555;font-size:11px;padding:6px 8px;background:#111;border-radius:3px">No history yet — snapshots are taken every Sunday. Check back next week.</div>'
      return
    }

    // Group by role, store on panel element for period switching
    const byRole = {}
    rows.forEach(function(r) {
      if (!byRole[r.role_name]) byRole[r.role_name] = []
      byRole[r.role_name].push({ date: r.recorded_date, cpr: r.cpr })
    })
    panel._historyByRole = byRole
    panel.classList.add("ocv-growth-panel")

    const periods = [
      { label: "4w",  days: 28  },
      { label: "12w", days: 84  },
      { label: "6mo", days: 180 },
      { label: "1yr", days: 365 },
    ]

    // Period selector bar
    let html = '<div style="display:flex;align-items:center;gap:6px;padding:6px 8px;background:#111;border-radius:3px">'
      + '<span style="font-size:10px;color:#555;letter-spacing:1px;text-transform:uppercase;flex:1">Growth period:</span>'
    periods.forEach(function(p, i) {
      const active = i === 0
      html += '<button class="ocv-period-btn" data-card="' + cardId + '" data-days="' + p.days + '" '
        + 'style="background:none;border:1px solid ' + (active ? "#44aa77" : "#2a2a2a") + ';border-radius:3px;'
        + 'color:' + (active ? "#44aa77" : "#555") + ';font-size:10px;padding:2px 8px;cursor:pointer">'
        + p.label + '</button>'
    })
    html += '</div>'
    panel.innerHTML = html

    // Apply default period (4w)
    ocvApplyDeltas(cardId, 28, byRole)
  }

  function ocvApplyDeltas(cardId, days, byRole) {
    if (!byRole) return
    const today    = new Date()
    const msPerDay = 86400000
    const targetStr = new Date(today - days * msPerDay).toISOString().split("T")[0]

    // Clear existing badges first
    ocvClearDeltas(cardId)

    Object.keys(byRole).forEach(function(roleName) {
      const entries  = byRole[roleName]
      const roleSlug = roleName.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9\-]/g, "")
      const cell     = document.getElementById(cardId + "-" + roleSlug)
      if (!cell) return

      const nowCpr = parseInt(cell.dataset.cpr)
      if (isNaN(nowCpr)) return

      // Most recent entry at or before target date
      let pastEntry = null
      entries.forEach(function(e) { if (e.date <= targetStr) pastEntry = e })
      if (!pastEntry) return  // no data that far back

      const diff = nowCpr - pastEntry.cpr
      if (diff === 0) return  // no change, show nothing

      const color = diff > 0 ? "#44cc44" : "#cc4444"
      const label = diff > 0 ? "(+" + diff + ")" : "(" + diff + ")"
      const badge = document.createElement("span")
      badge.className   = "ocv-growth-badge"
      badge.textContent = " " + label
      badge.style.cssText = "font-size:10px;font-weight:bold;color:" + color + ";margin-left:4px"
      cell.appendChild(badge)
    })
  }

  function ocvClearDeltas(cardId) {
    const card = document.getElementById(cardId)
    if (!card) return
    card.querySelectorAll(".ocv-growth-badge").forEach(function(b) { b.remove() })
  }

})()
