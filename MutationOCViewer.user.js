// ==UserScript==
// @name         Monarch Mutation — OCViewer
// @namespace    mutationOCViewerJocko
// @version      1.0.11
// @description  Live OC briefing. CPR matching, role recommendations, status icons, live countdowns.
// @author       JockoWillink [55408]
// @match        https://www.torn.com/factions.php?step=your*
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
      .ocv-cpr-req { font-size: 10px; color: #888; width: 90px; min-width: 90px; text-align: right; flex-shrink: 0; display: inline-block; }
      .ocv-cpr-val { font-weight: bold; width: 64px; min-width: 64px; text-align: right; flex-shrink: 0; display: inline-block; overflow: hidden; }
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
      _ocvCrimeStats  = null    // reset crime stats cache
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
  let _ocvCrimeStats  = null   // null = not fetched; keyed by "position#position_number"

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

    const cprIndex = {}
    rows.forEach(function(r) {
      const crimeKey = (r.crime_name || "").toLowerCase()
      const roleKey  = (r.role_name  || "").toLowerCase().replace(/\s*#\d+$/, "").trim()
      if (!cprIndex[crimeKey]) cprIndex[crimeKey] = {}
      cprIndex[crimeKey][roleKey] = r.cpr
    })

    const crimeDisplay = {
      "ace in the hole":"Ace in the Hole","stacking the deck":"Stacking the Deck",
      "blast from the past":"Blast from the Past","clinical precision":"Clinical Precision","break the bank":"Break the Bank"
    }
    const borderColors = {
      "ace in the hole":"#882222","stacking the deck":"#224488","blast from the past":"#226644",
      "clinical precision":"#664422","break the bank":"#555577"
    }
    const levelGroups = [
      { level: 9, crimes: ["ace in the hole"] },
      { level: 8, crimes: ["break the bank", "stacking the deck", "clinical precision"] },
      { level: 7, crimes: ["blast from the past"] },
    ]

    const shortP = [{label:"1w",days:7},{label:"2w",days:14},{label:"1mo",days:30},{label:"2mo",days:60}]
    const longP  = [{label:"3mo",days:90},{label:"6mo",days:180},{label:"1yr",days:365}]
    function makePBtn(p) {
      return '<button class="ocv-global-period-btn" data-days="' + p.days + '" '
        + 'style="background:none;border:1px solid #2a2a2a;border-radius:3px;color:#555;font-size:9px;padding:1px 7px;cursor:pointer;white-space:nowrap">'
        + p.label + '</button>'
    }

    let html = '<div style="font-size:11px;color:#555;margin-bottom:8px">CPR data updated weekly at 06:00 TCT (Sundays)</div>'
    html += '<div id="ocv-period-bar" style="background:#161616;border:1px solid #2a2a2a;border-radius:4px;padding:6px 10px;margin-bottom:12px">'
      + '<div style="font-size:9px;color:#444;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px">Growth Period</div>'
      + '<div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">'
      + '<span style="font-size:9px;color:#555;letter-spacing:1px;text-transform:uppercase;width:36px;flex-shrink:0">Short</span>'
      + shortP.map(makePBtn).join("")
      + '<span style="font-size:9px;color:#444;margin-left:4px">— select to show growth</span>'
      + '</div>'
      + '<div style="display:flex;align-items:center;gap:6px">'
      + '<span style="font-size:9px;color:#555;letter-spacing:1px;text-transform:uppercase;width:36px;flex-shrink:0">Long</span>'
      + longP.map(makePBtn).join("")
      + '<span style="flex:1"></span>'
      + '<span style="font-size:9px;color:#555;letter-spacing:1px;margin-right:4px">Graph size:</span>'
      + '<button class="ocv-graph-size-btn" data-dir="-1" style="background:none;border:1px solid #2a2a2a;border-radius:2px;color:#555;font-size:11px;width:18px;height:18px;line-height:1;cursor:pointer;padding:0">−</button>'
      + '<button class="ocv-graph-size-btn" data-dir="1" style="background:none;border:1px solid #2a2a2a;border-radius:2px;color:#555;font-size:11px;width:18px;height:18px;line-height:1;cursor:pointer;padding:0">+</button>'
      + '<span style="flex:1"></span>'
      + '<button id="ocv-cpr-eligible-btn" data-active="0" '
      + 'style="background:none;border:1px solid #2a2a2a;border-radius:3px;color:#555;font-size:9px;padding:1px 8px;cursor:pointer;white-space:nowrap">'
      + '✕ Hide ineligible OCs</button>'
      + '</div>'
      + '</div>'

    levelGroups.forEach(function(group) {
      const hasData = group.crimes.some(function(ck) {
        return reqs.filter(function(q){return q.crime_name.toLowerCase()===ck}).length
          || Object.keys(cprIndex[ck]||{}).length
      })
      if (!hasData) return
      html += '<div class="ocv-level-header" style="font-size:10px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#666;margin:12px 0 6px 0;padding-bottom:4px;border-bottom:1px solid #2a2a2a">Level ' + group.level + '</div>'

      group.crimes.forEach(function(crimeKey) {
        const crimeReqs   = reqs.filter(function(q){return q.crime_name.toLowerCase()===crimeKey})
        const tornRoles   = cprIndex[crimeKey] || {}
        const reqBaseKeys = crimeReqs.map(function(q){return q.role_name.toLowerCase().replace(/\s*#\d+$/,"").trim()})
        const extraRoles  = Object.keys(tornRoles).filter(function(rk){return !reqBaseKeys.includes(rk)})
        if (!crimeReqs.length && !Object.keys(tornRoles).length) return

        const cardId = "ocv-card-" + crimeKey.replace(/\s+/g,"-")
        const bc     = borderColors[crimeKey] || "#444"

        html += '<div class="ocv-cpr-crime-card" id="' + cardId + '" style="border-left-color:' + bc + '">'
        html += '<div class="ocv-cpr-crime-title">' + (crimeDisplay[crimeKey]||crimeKey) + '</div>'

        // Column headers
        html += '<div class="ocv-cpr-role-row" style="border-bottom:1px solid #333;margin-bottom:4px;padding-bottom:4px">'
          + '<span class="ocv-cpr-dot" style="background:transparent"></span>'
          + '<span class="ocv-cpr-role-name" style="color:#555;font-size:10px;letter-spacing:1px;text-transform:uppercase">Role</span>'
          + '<span style="font-size:10px;color:#446644;letter-spacing:1px;text-transform:uppercase;width:44px;text-align:right;flex-shrink:0">Count</span>'
          + '<span style="font-size:10px;color:#446644;letter-spacing:1px;text-transform:uppercase;width:52px;text-align:right;flex-shrink:0">Succ%</span>'
          + '<span style="flex:1"></span>'
          + '<span class="ocv-cpr-req" style="color:#555;font-size:10px;letter-spacing:1px;text-transform:uppercase">Req.</span>'
          + '<span class="ocv-cpr-val" style="color:#555;font-size:10px;letter-spacing:1px;text-transform:uppercase">Your CPR</span>'
          + '<span class="ocv-growth-col-hdr" style="font-size:10px;color:#44aa77;letter-spacing:1px;text-transform:uppercase;width:130px;text-align:right;flex-shrink:0;display:none">Growth</span>'
          + '<span style="font-size:10px;color:#555;letter-spacing:1px;text-transform:uppercase;width:72px;text-align:right;flex-shrink:0">Variance</span>'
          + '</div>'

        crimeReqs.forEach(function(req) {
          const baseKey  = req.role_name.toLowerCase().replace(/\s*#\d+$/,"").trim()
          const cpr      = (tornRoles[baseKey]!==undefined) ? tornRoles[baseKey] : null
          const minCpr   = req.min_cpr
          const roleSlug = req.role_name.replace(/\s+/g,"-").replace(/[^a-zA-Z0-9\-]/g,"")
          const valId    = cardId+"-"+roleSlug

          let dotColor, valClass
          if (cpr===null)        {dotColor="#444";valClass="ocv-cpr-grey"}
          else if (minCpr===null){dotColor="#44aa44";valClass="ocv-cpr-green"}
          else if (cpr>=minCpr)  {dotColor="#44aa44";valClass="ocv-cpr-green"}
          else                   {dotColor="#ffaa33";valClass="ocv-cpr-orange"}

          const cprDisplay = cpr!==null ? cpr : "—"
          const reqDisplay = minCpr!==null ? minCpr+"+" : "No req."
          const eligibility = cpr===null ? "unknown" : (minCpr!==null && cpr<minCpr) ? "no" : "yes"

          let deltaHTML = '<span style="font-size:10px;font-weight:bold;color:#444;width:72px;text-align:right;flex-shrink:0">—</span>'
          if (cpr!==null && minCpr!==null) {
            const diff = cpr-minCpr
            let dc, dt
            if (diff===0)    {dc="#2a7a2a";dt="✓ exact"}
            else if (diff>0) {dc=diff>=15?"#00ff88":diff>=8?"#44cc44":diff>=3?"#2a7a2a":"#1a4a1a";dt="+"+diff+" over"}
            else             {dc=diff<=-21?"#ff2222":diff<=-13?"#cc2222":diff<=-6?"#cc4400":diff<=-3?"#cc6600":"#cc7700";dt=diff+" short"}
            deltaHTML='<span style="font-size:10px;font-weight:bold;color:'+dc+';width:72px;text-align:right;flex-shrink:0">'+dt+'</span>'
          }

          html += '<div class="ocv-cpr-role-row" data-eligible="'+eligibility+'">'
            + '<span class="ocv-cpr-dot" style="background:'+dotColor+'"></span>'
            + '<span class="ocv-cpr-role-name">'+escHTML(req.role_name)+'</span>'
            + '<span class="ocv-stat-crimes" id="'+valId+'-crimes" style="font-size:10px;color:#555;width:44px;text-align:right;flex-shrink:0">—</span>'
            + '<span class="ocv-stat-succ" id="'+valId+'-succ" style="font-size:10px;color:#555;width:52px;text-align:right;flex-shrink:0">—</span>'
            + '<span style="flex:1"></span>'
            + '<span class="ocv-cpr-req">'+reqDisplay+'</span>'
            + '<span class="ocv-cpr-val '+valClass+'" id="'+valId+'" data-cpr="'+(cpr!==null?cpr:"")+'">'+cprDisplay+'</span>'
            + '<span class="ocv-growth-col" id="'+valId+'-growth" style="font-size:10px;width:130px;text-align:right;flex-shrink:0;display:none"></span>'
            + deltaHTML + '</div>'
        })

        extraRoles.forEach(function(roleKey) {
          const cpr      = tornRoles[roleKey]
          const roleSlug = roleKey.replace(/\s+/g,"-").replace(/[^a-zA-Z0-9\-]/g,"")
          const valId    = cardId+"-"+roleSlug
          html += '<div class="ocv-cpr-role-row">'
            + '<span class="ocv-cpr-dot" style="background:#44aa44"></span>'
            + '<span class="ocv-cpr-role-name" style="text-transform:capitalize">'+escHTML(roleKey)+'</span>'
            + '<span class="ocv-stat-crimes" id="'+valId+'-crimes" style="font-size:10px;color:#555;width:44px;text-align:right;flex-shrink:0">—</span>'
            + '<span class="ocv-stat-succ" id="'+valId+'-succ" style="font-size:10px;color:#555;width:52px;text-align:right;flex-shrink:0">—</span>'
            + '<span style="flex:1"></span>'
            + '<span class="ocv-cpr-req">No req.</span>'
            + '<span class="ocv-cpr-val ocv-cpr-green" id="'+valId+'" data-cpr="'+cpr+'">'+cpr+'</span>'
            + '<span class="ocv-growth-col" id="'+valId+'-growth" style="font-size:10px;width:130px;text-align:right;flex-shrink:0;display:none"></span>'
            + '<span style="width:72px;flex-shrink:0"></span></div>'
        })
        const graphId = "ocv-graph-" + crimeKey.replace(/\s+/g,"-")
        html += '</div>'  // close crime card
        html += '<div id="'+graphId+'" data-crime="'+escHTML(crimeKey)+'" data-size="1" style="display:none;margin-bottom:8px;background:#111;border:1px solid #2a2a2a;border-radius:3px;padding:8px 10px">'
          + '<div style="font-size:9px;color:#555;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px">CPR History</div>'
          + '<div class="ocv-graph-canvas-wrap" style="position:relative;height:80px"></div>'
          + '<div class="ocv-graph-legend" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px"></div>'
          + '</div>'
      })
    })

    cprBody.innerHTML = html

    cprBody.addEventListener("click", function(e) {
      const sizeBtn = e.target.closest(".ocv-graph-size-btn")
      if (sizeBtn) {
        const heights  = [50, 80, 120, 170, 230]
        const dir      = parseInt(sizeBtn.dataset.dir)
        const bar      = document.getElementById("ocv-period-bar")
        const curSize  = parseInt(bar ? bar.dataset.graphSize||"1" : "1")
        const nextSize = Math.max(0, Math.min(heights.length-1, curSize + dir))
        if (bar) bar.dataset.graphSize = nextSize

        // Resize only currently visible graph panels
        cprBody.querySelectorAll("[id^='ocv-graph-']").forEach(function(panel) {
          if (panel.style.display === "none") return  // skip hidden ones
          const wrap = panel.querySelector(".ocv-graph-canvas-wrap")
          if (wrap) wrap.style.height = heights[nextSize] + "px"
        })

        // Re-render visible graphs at new size
        const activeBtn = cprBody.querySelector(".ocv-global-period-btn[data-active='1']")
        if (activeBtn) ocvFetchAndApplyGrowth(parseInt(activeBtn.dataset.days))

        // Re-apply eligible filter if active so hidden graphs stay hidden
        const eligBtn = document.getElementById("ocv-cpr-eligible-btn")
        if (eligBtn && eligBtn.dataset.active === "1") {
          cprBody.querySelectorAll(".ocv-cpr-crime-card").forEach(function(card) {
            const rows = Array.from(card.querySelectorAll(".ocv-cpr-role-row[data-eligible]"))
            if (!rows.length) return
            const allIneligible = !rows.some(function(r) { return r.dataset.eligible === "yes" || r.dataset.eligible === "unknown" })
            if (allIneligible) {
              const g = document.getElementById(card.id.replace("ocv-card-","ocv-graph-"))
              if (g) g.style.display = "none"
            }
          })
        }
        return
      }

      const btn = e.target.closest(".ocv-global-period-btn")
      if (btn) {
        const days   = parseInt(btn.dataset.days)
        const active = btn.dataset.active === "1"
        cprBody.querySelectorAll(".ocv-global-period-btn").forEach(function(b) {
          b.dataset.active="0"; b.style.borderColor="#2a2a2a"; b.style.color="#555"; b.style.background="none"
        })
        if (active) {
          ocvClearAllGrowth()
        } else {
          btn.dataset.active="1"; btn.style.borderColor="#44aa77"; btn.style.color="#44aa77"; btn.style.background="#0a1a0a"
          ocvFetchAndApplyGrowth(days)
        }
        return
      }

      const eligBtn = e.target.closest("#ocv-cpr-eligible-btn")
      if (eligBtn) {
        const active = eligBtn.dataset.active === "1"
        if (active) {
          eligBtn.dataset.active    = "0"
          eligBtn.textContent       = "✕ Hide ineligible OCs"
          eligBtn.style.borderColor = "#2a2a2a"
          eligBtn.style.color       = "#555"
          // Show all cards and level headers
          cprBody.querySelectorAll(".ocv-cpr-crime-card").forEach(function(el) { el.style.display = "" })
          cprBody.querySelectorAll("[id^='ocv-graph-']").forEach(function(graph) {
            graph.style.display = graph.dataset.wasVisible || "none"
          })
          cprBody.querySelectorAll(".ocv-level-header").forEach(function(el) { el.style.display = "" })
        } else {
          eligBtn.dataset.active    = "1"
          eligBtn.textContent       = "✓ Eligible OCs only"
          eligBtn.style.borderColor = "#44aa77"
          eligBtn.style.color       = "#44aa77"
          cprBody.querySelectorAll(".ocv-cpr-crime-card").forEach(function(card) {
            const rows = Array.from(card.querySelectorAll(".ocv-cpr-role-row[data-eligible]"))
            if (!rows.length) return

            const hasEligible   = rows.some(function(r) { return r.dataset.eligible === "yes" })
            const hasUnknown    = rows.some(function(r) { return r.dataset.eligible === "unknown" })
            const allIneligible = !hasEligible && !hasUnknown
            const display       = allIneligible ? "none" : ""

            card.style.display = display
            // Always sync the graph panel regardless of growth state
            const graphId = card.id.replace("ocv-card-","ocv-graph-")
            const graph   = document.getElementById(graphId)
            if (graph) graph.style.display = allIneligible ? "none" : graph.dataset.wasVisible || ""
          })
          // Hide level headers where all cards underneath are hidden
          cprBody.querySelectorAll(".ocv-level-header").forEach(function(header) {
            let next = header.nextElementSibling
            let allHidden = true
            while (next && !next.classList.contains("ocv-level-header")) {
              if (next.classList.contains("ocv-cpr-crime-card") && next.style.display !== "none") {
                allHidden = false; break
              }
              next = next.nextElementSibling
            }
            header.style.display = allHidden ? "none" : ""
          })
        }
      }
    })
  }

  function ocvFetchAndApplyGrowth(days) {
    if (_ocvGrowthCache !== null && _ocvCrimeStats !== null) { ocvApplyAllGrowth(days); return }
    const userId = GM_getValue("ocv-user-id", null)
    if (!userId) return
    const since = new Date(); since.setFullYear(since.getFullYear()-1)
    const sinceStr = since.toISOString().split("T")[0]

    let growthDone = _ocvGrowthCache !== null
    let statsDone  = _ocvCrimeStats  !== null

    function onBothReady() {
      if (!growthDone || !statsDone) return
      ocvApplyAllGrowth(days)
      ocvApplyAllStats()
    }

    if (!growthDone) {
      GM_xmlhttpRequest({
        method:"GET",
        url: SB_URL+"/rest/v1/oc_member_cpr_history?user_id=eq."+userId+"&recorded_date=gte."+sinceStr+"&select=crime_name,role_name,cpr,recorded_date&order=recorded_date.asc",
        headers:{"apikey":SB_ANON_KEY,"Authorization":"Bearer "+SB_ANON_KEY},
        onload:function(res) {
          try {
            const rows = JSON.parse(res.responseText)||[]
            _ocvGrowthCache = {}
            rows.forEach(function(r) {
              const k=(r.crime_name||"").toLowerCase()
              if (!_ocvGrowthCache[k]) _ocvGrowthCache[k]=[]
              _ocvGrowthCache[k].push(r)
            })
          } catch(e) { _ocvGrowthCache = {}; console.error("Growth fetch failed",e) }
          growthDone = true; onBothReady()
        },
        onerror:function(){ _ocvGrowthCache={}; growthDone=true; onBothReady() }
      })
    }

    if (!statsDone) {
      // Fetch crime participations with crime name via embedded join
      GM_xmlhttpRequest({
        method:"GET",
        url: SB_URL+"/rest/v1/crime_participants?member_id=eq."+userId
          +"&select=position,position_number,outcome,crime_id,crimes!crime_participants_crime_id_fkey(name)",
        headers:{"apikey":SB_ANON_KEY,"Authorization":"Bearer "+SB_ANON_KEY},
        onload:function(res) {
          try {
            const rows = JSON.parse(res.responseText)||[]

            // If join didn't work (no crimes object), fall back to fetching crime names separately
            const needsFallback = rows.length && !rows[0].crimes
            if (needsFallback) {
              // Collect unique crime_ids then fetch names
              const crimeIds = [...new Set(rows.map(function(r){return r.crime_id}).filter(Boolean))]
              GM_xmlhttpRequest({
                method:"GET",
                url: SB_URL+"/rest/v1/crimes?id=in.("+crimeIds.join(",")+")"
                  +"&select=id,name",
                headers:{"apikey":SB_ANON_KEY,"Authorization":"Bearer "+SB_ANON_KEY},
                onload:function(res2) {
                  try {
                    const crimeRows = JSON.parse(res2.responseText)||[]
                    const crimeNameMap = {}
                    crimeRows.forEach(function(c){ crimeNameMap[c.id]=c.name })
                    // Attach crime name to participant rows
                    rows.forEach(function(r){ r._crimeName = crimeNameMap[r.crime_id]||"" })
                  } catch(e){}
                  ocvBuildCrimeStats(rows, true)
                  statsDone=true; onBothReady()
                },
                onerror:function(){ ocvBuildCrimeStats(rows, true); statsDone=true; onBothReady() }
              })
            } else {
              ocvBuildCrimeStats(rows, false)
              statsDone=true; onBothReady()
            }
          } catch(e) { _ocvCrimeStats={}; console.error("Stats fetch failed",e); statsDone=true; onBothReady() }
        },
        onerror:function(){ _ocvCrimeStats={}; statsDone=true; onBothReady() }
      })
    }
  }

  function ocvBuildCrimeStats(rows, useFallbackName) {
    // First pass: count how many distinct position_numbers exist per crime+position
    // to determine which roles need #N suffixes
    const crimePosCounts = {}
    rows.forEach(function(r) {
      const crimeName = useFallbackName
        ? (r._crimeName||"").toLowerCase()
        : (r.crimes && r.crimes.name ? r.crimes.name : "").toLowerCase()
      if (!crimeName) return
      const key = crimeName+"|"+(r.position||"").toLowerCase()
      if (!crimePosCounts[key]) crimePosCounts[key] = new Set()
      crimePosCounts[key].add(r.position_number)
    })

    _ocvCrimeStats = {}
    rows.forEach(function(r) {
      const crimeName = useFallbackName
        ? (r._crimeName||"").toLowerCase()
        : (r.crimes && r.crimes.name ? r.crimes.name : "").toLowerCase()
      if (!crimeName) return
      const posBase    = (r.position||"").toLowerCase()
      const countKey   = crimeName+"|"+posBase
      const isNumbered = crimePosCounts[countKey] && crimePosCounts[countKey].size > 1
      const displayName = isNumbered ? r.position+" #"+r.position_number : r.position
      const key = crimeName+"|"+displayName.toLowerCase()
      if (!_ocvCrimeStats[key]) _ocvCrimeStats[key] = { total:0, success:0 }
      _ocvCrimeStats[key].total++
      if (r.outcome === "Successful") _ocvCrimeStats[key].success++
    })
  }

  function ocvApplyAllStats() {
    if (!_ocvCrimeStats) return
    const cprBody = document.getElementById("ocv-cpr-body")
    if (!cprBody) return

    cprBody.querySelectorAll(".ocv-cpr-crime-card").forEach(function(card) {
      // Get the crime name from the card's data-crime or title element
      const titleEl  = card.querySelector(".ocv-cpr-crime-title")
      const crimeKey = titleEl ? titleEl.textContent.trim().toLowerCase() : ""

      card.querySelectorAll(".ocv-stat-crimes").forEach(function(el) {
        const row      = el.closest(".ocv-cpr-role-row")
        const nameSpan = row ? row.querySelector(".ocv-cpr-role-name") : null
        if (!nameSpan) return
        const roleName = nameSpan.textContent.trim().toLowerCase()
        const key      = crimeKey + "|" + roleName
        const stats    = _ocvCrimeStats[key]

        const succEl = row.querySelector(".ocv-stat-succ")
        if (!stats || !stats.total) {
          el.textContent = "—"; el.style.color = "#333"
          if (succEl) { succEl.textContent = "—"; succEl.style.color = "#333" }
          return
        }
        const pct = Math.round((stats.success / stats.total) * 100)
        const sc  = pct >= 90 ? "#44cc44" : pct >= 70 ? "#2a9a2a" : pct >= 50 ? "#cc8800" : "#cc4444"
        el.textContent = stats.total; el.style.color = "#888"
        if (succEl) { succEl.textContent = pct + "%"; succEl.style.color = sc }
      })
    })
  }

  function ocvApplyAllGrowth(days) {
    if (!_ocvGrowthCache) return
    const cprBody = document.getElementById("ocv-cpr-body")
    if (!cprBody) return
    const targetStr = new Date(new Date()-days*86400000).toISOString().split("T")[0]

    cprBody.querySelectorAll(".ocv-growth-col-hdr").forEach(function(el){el.style.display=""})
    cprBody.querySelectorAll(".ocv-growth-col").forEach(function(el){el.style.display=""})

    Object.keys(_ocvGrowthCache).forEach(function(crimeKey) {
      const cardId = "ocv-card-"+crimeKey.replace(/\s+/g,"-")
      const card   = document.getElementById(cardId)

      // Build a map of base role name -> how many numbered slots exist in the DOM
      // e.g. "muscle" -> ["Muscle #1","Muscle #2","Muscle #3"]
      const baseToDisplayNames = {}
      if (card) {
        card.querySelectorAll(".ocv-cpr-role-name").forEach(function(span) {
          const full = span.textContent.trim()
          const base = full.toLowerCase().replace(/\s*#\d+$/,"").trim()
          if (!baseToDisplayNames[base]) baseToDisplayNames[base] = []
          if (baseToDisplayNames[base].indexOf(full) === -1) baseToDisplayNames[base].push(full)
        })
      }

      const byRole = {}
      _ocvGrowthCache[crimeKey].forEach(function(r) {
        const base    = (r.role_name||"").toLowerCase().trim()
        const targets = (baseToDisplayNames[base] && baseToDisplayNames[base].length)
          ? baseToDisplayNames[base]
          : [r.role_name]  // fallback: use as-is
        targets.forEach(function(displayName) {
          if (!byRole[displayName]) byRole[displayName] = []
          byRole[displayName].push({date:r.recorded_date, cpr:r.cpr})
        })
      })
      Object.keys(byRole).forEach(function(roleName) {
        const entries  = byRole[roleName]
        const roleSlug = roleName.replace(/\s+/g,"-").replace(/[^a-zA-Z0-9\-]/g,"")
        const cell     = document.getElementById(cardId+"-"+roleSlug)
        const growthEl = document.getElementById(cardId+"-"+roleSlug+"-growth")
        if (!cell||!growthEl) return
        const nowCpr = parseInt(cell.dataset.cpr)
        if (isNaN(nowCpr)) return
        let pastEntry=null
        entries.forEach(function(e){if(e.date<=targetStr)pastEntry=e})
        // Fallback: if no snapshot before target date, use oldest available
        if (!pastEntry && entries.length) pastEntry=entries[0]
        if (!pastEntry){growthEl.innerHTML='<span style="color:#444">—</span>';return}
        const diff=nowCpr-pastEntry.cpr
        if (diff===0){growthEl.innerHTML='<span style="color:#444">—</span>';return}
        const gc=diff>0?(diff>=15?"#00ff88":diff>=8?"#44cc44":diff>=3?"#2a9a2a":"#1a6a1a"):(diff<=-10?"#ff2222":diff<=-5?"#cc4444":"#cc7700")
        const arrow=diff>0?"▲":"▼"
        const label=arrow+Math.abs(diff)
        growthEl.innerHTML='<span style="color:#aaa">'+pastEntry.cpr+' → '+nowCpr+'</span> <span style="font-weight:bold;color:'+gc+'">'+label+'</span>'
      })
      // For roles that have current CPR but no history entry (CPR never changed),
      // synthesize a flat line using today's value so they appear in the graph
      if (card) {
        const today = new Date().toISOString().split("T")[0]
        card.querySelectorAll(".ocv-cpr-role-name").forEach(function(span) {
          const full   = span.textContent.trim()
          const row    = span.closest(".ocv-cpr-role-row")
          const cell   = row ? row.querySelector(".ocv-cpr-val") : null
          const cprVal = cell ? parseInt(cell.dataset.cpr) : NaN
          if (isNaN(cprVal) || cprVal <= 0) return
          if (!byRole[full]) {
            byRole[full] = [{date: today, cpr: cprVal}]
          }
        })
      }

      // Apply tiny pixel offsets to roles that share identical CPR history
      // so overlapping lines are visually separable (same base name = same value)
      const baseGroups = {}
      Object.keys(byRole).forEach(function(displayName) {
        const base = displayName.toLowerCase().replace(/\s*#\d+$/,"").trim()
        if (!baseGroups[base]) baseGroups[base] = []
        baseGroups[base].push(displayName)
      })
      const offsets = {}  // displayName -> pixel offset in CPR units (tiny)
      Object.keys(baseGroups).forEach(function(base) {
        const names = baseGroups[base]
        if (names.length < 2) return
        // spread them by 0.3 CPR units each so they're visually distinct but numerically truthful
        names.forEach(function(name, i) {
          offsets[name] = (i - (names.length-1)/2) * 0.3
        })
      })

      // Apply offsets to a copy of byRole for rendering only
      const offsetByRole = {}
      Object.keys(byRole).forEach(function(name) {
        const off = offsets[name] || 0
        offsetByRole[name] = byRole[name].map(function(e) {
          return {date: e.date, cpr: e.cpr + off, realCpr: e.cpr}
        })
      })

      ocvRenderGraph(crimeKey, offsetByRole)
    })
  }

  function ocvClearAllGrowth() {
    const cprBody = document.getElementById("ocv-cpr-body")
    if (!cprBody) return
    cprBody.querySelectorAll(".ocv-growth-col-hdr").forEach(function(el){el.style.display="none"})
    cprBody.querySelectorAll(".ocv-growth-col").forEach(function(el){el.style.display="none";el.innerHTML=""})
    cprBody.querySelectorAll("[id^='ocv-graph-']").forEach(function(el){el.style.display="none"})
  }

  function ocvRenderGraph(crimeKey, byRole) {
    const graphId = "ocv-graph-"+crimeKey.replace(/\s+/g,"-")
    const panel   = document.getElementById(graphId)
    if (!panel) return
    const wrap   = panel.querySelector(".ocv-graph-canvas-wrap")
    const legend = panel.querySelector(".ocv-graph-legend")
    if (!wrap) return

    // Apply current global size setting
    const cprBody2 = document.getElementById("ocv-cpr-body")
    const bar      = cprBody2 ? document.getElementById("ocv-period-bar") : null
    const heights  = [50, 80, 120, 170, 230]
    const sizeIdx  = bar ? parseInt(bar.dataset.graphSize||"1") : 1
    wrap.style.height = heights[Math.max(0,Math.min(heights.length-1,sizeIdx))] + "px"

    const allDates=[]
    Object.values(byRole).forEach(function(entries){
      entries.forEach(function(e){if(allDates.indexOf(e.date)===-1)allDates.push(e.date)})
    })
    allDates.sort()
    if (!allDates.length){panel.style.display="none";return}

    // Build a weekly date spine from earliest to latest across all roles,
    // then carry each role's last known CPR forward to fill gaps
    const firstDate = allDates[0]
    const lastDate  = allDates[allDates.length-1]
    const spine = []
    const cur = new Date(firstDate + "T00:00:00Z")
    const end = new Date(lastDate  + "T00:00:00Z")
    while (cur <= end) {
      spine.push(cur.toISOString().split("T")[0])
      cur.setUTCDate(cur.getUTCDate() + 7)
    }
    // Make sure last date is always included
    if (spine[spine.length-1] !== lastDate) spine.push(lastDate)

    // Fill each role: for every spine date carry forward last known value
    const filledByRole = {}
    Object.keys(byRole).forEach(function(roleName) {
      const entries = byRole[roleName].slice().sort(function(a,b){return a.date<b.date?-1:1})
      const filled  = []
      let lastCpr   = null
      spine.forEach(function(d) {
        const exact = entries.find(function(e){return e.date===d})
        if (exact) {
          lastCpr = exact.cpr
          filled.push({date:d, cpr:exact.cpr, real:true})
        } else if (lastCpr !== null && d >= entries[0].date) {
          filled.push({date:d, cpr:lastCpr, real:false})
        }
      })
      if (filled.length) filledByRole[roleName] = filled
    })

    const roleColors=["#44cc88","#4488cc","#cc8844","#cc4488","#88cc44","#8844cc","#cc4444","#44cccc"]
    const roles=Object.keys(filledByRole)
    const W=wrap.offsetWidth||340, H=wrap.offsetHeight||80
    const PAD={t:6,r:8,b:20,l:32}
    const chartW=W-PAD.l-PAD.r, chartH=H-PAD.t-PAD.b

    let minV=Infinity,maxV=-Infinity
    Object.values(filledByRole).forEach(function(entries){
      entries.forEach(function(e){if(e.cpr<minV)minV=e.cpr;if(e.cpr>maxV)maxV=e.cpr})
    })
    if(minV===maxV){minV-=2;maxV+=2}
    const vRange=maxV-minV||1

    function xPos(d){const i=spine.indexOf(d);const len=spine.length;return len===1?PAD.l:PAD.l+(i/(len-1))*chartW}
    function yPos(v){return PAD.t+chartH-((v-minV)/vRange)*chartH}

    let svg='<svg width="100%" height="'+H+'" viewBox="0 0 '+W+' '+H+'" style="overflow:visible">'
    ;[minV,Math.round((minV+maxV)/2),maxV].forEach(function(v){
      const y=yPos(v)
      svg+='<line x1="'+PAD.l+'" y1="'+y+'" x2="'+(W-PAD.r)+'" y2="'+y+'" stroke="#2e2e2e" stroke-width="1"/>'
      svg+='<text x="'+(PAD.l-3)+'" y="'+(y+3)+'" text-anchor="end" font-size="9" fill="#888">'+v+'</text>'
    })
    const fmt=function(d){const p=d.split("-");return p[1]+"/"+p[2]}
    svg+='<text x="'+xPos(spine[0])+'" y="'+(H-3)+'" text-anchor="middle" font-size="9" fill="#888">'+fmt(spine[0])+'</text>'
    if(spine.length>1)svg+='<text x="'+xPos(spine[spine.length-1])+'" y="'+(H-3)+'" text-anchor="middle" font-size="9" fill="#888">'+fmt(spine[spine.length-1])+'</text>'

    roles.forEach(function(roleName,ri){
      const entries=filledByRole[roleName], color=roleColors[ri%roleColors.length]
      if(entries.length>1){
        const pts=entries.map(function(e){return xPos(e.date)+","+yPos(e.cpr)}).join(" ")
        svg+='<polyline points="'+pts+'" fill="none" stroke="'+color+'" stroke-width="1.5" class="ocv-graph-line" data-role="'+escHTML(roleName)+'" opacity="0.9"/>'
      }
      entries.forEach(function(e){
        if (e.real) {
          // Solid dot for real data points
          svg+='<circle cx="'+xPos(e.date)+'" cy="'+yPos(e.cpr)+'" r="3" fill="'+color+'" class="ocv-graph-dot" '
            +'data-role="'+escHTML(roleName)+'" data-cpr="'+(e.realCpr!==undefined?e.realCpr:e.cpr)+'" data-date="'+e.date+'" '
            +'style="cursor:pointer"/>'
        } else {
          // Hollow dot for carried-forward points
          svg+='<circle cx="'+xPos(e.date)+'" cy="'+yPos(e.cpr)+'" r="2" fill="none" stroke="'+color+'" stroke-width="1" '
            +'class="ocv-graph-dot" data-role="'+escHTML(roleName)+'" data-cpr="'+(e.realCpr!==undefined?e.realCpr:e.cpr)+'" data-date="'+e.date+'" '
            +'opacity="0.4" style="cursor:pointer"/>'
        }
      })
    })

    if(spine.length>1){
      const avgPts=spine.map(function(d){
        const vals=[];Object.values(filledByRole).forEach(function(ent){const e=ent.find(function(x){return x.date===d});if(e)vals.push(e.cpr)})
        if(!vals.length)return null
        return xPos(d)+","+yPos(vals.reduce(function(a,b){return a+b},0)/vals.length)
      }).filter(Boolean)
      if(avgPts.length>1)svg+='<polyline points="'+avgPts.join(" ")+'" fill="none" stroke="#fff" stroke-width="1" stroke-dasharray="3,3" opacity="0.2"/>'
    }
    svg+='</svg>'
    wrap.innerHTML=svg

    // Legend uses original byRole for legend items (real roles only)
    const legendRoles=Object.keys(filledByRole)

    // Custom hover tooltip — SVG title tags don't work reliably in Torn
    const tip = document.createElement("div")
    tip.style.cssText = "position:absolute;background:#1a1a1a;border:1px solid #444;border-radius:3px;"
      + "padding:3px 7px;font-size:10px;color:#eee;pointer-events:none;display:none;z-index:99;white-space:nowrap"
    wrap.appendChild(tip)
    wrap.querySelectorAll(".ocv-graph-dot").forEach(function(dot) {
      dot.addEventListener("mouseover", function() {
        const cx = parseFloat(dot.getAttribute("cx"))
        const cy = parseFloat(dot.getAttribute("cy"))
        const svgEl = wrap.querySelector("svg")
        const scale = svgEl ? (svgEl.getBoundingClientRect().width / W) : 1
        tip.textContent = dot.dataset.role + "  |  CPR " + dot.dataset.cpr + "  |  " + dot.dataset.date
        tip.style.display = "block"
        const tx = Math.min(cx * scale + 8, wrap.offsetWidth - 140)
        const ty = Math.max(cy * scale - 30, 0)
        tip.style.left = tx + "px"
        tip.style.top  = ty + "px"
      })
      dot.addEventListener("mouseout", function() { tip.style.display = "none" })
    })

    legend.innerHTML=legendRoles.map(function(roleName,ri){
      const color=roleColors[ri%roleColors.length]
      return '<span class="ocv-graph-legend-item" data-role="'+escHTML(roleName)+'" data-crime="'+escHTML(crimeKey)+'" '
        +'style="display:inline-flex;align-items:center;gap:3px;font-size:9px;color:#aaa;cursor:pointer;padding:1px 4px;border:1px solid #2a2a2a;border-radius:2px">'
        +'<span style="width:8px;height:2px;background:'+color+';display:inline-block;border-radius:1px"></span>'+escHTML(roleName)+'</span>'
    }).join("")

    legend.querySelectorAll(".ocv-graph-legend-item").forEach(function(item){
      item.addEventListener("click",function(){
        const role=item.dataset.role,crime=item.dataset.crime
        const gPanel=document.getElementById("ocv-graph-"+crime.replace(/\s+/g,"-"))
        if(!gPanel)return
        const hidden=item.dataset.hidden==="1"
        item.dataset.hidden=hidden?"0":"1"; item.style.opacity=hidden?"1":"0.35"
        gPanel.querySelectorAll(".ocv-graph-line[data-role='"+role+"'],.ocv-graph-dot[data-role='"+role+"']").forEach(function(el){
          el.style.display=hidden?"":"none"
        })
      })
    })
    panel.style.display="block"
    panel.dataset.wasVisible="block"
  }

})()
