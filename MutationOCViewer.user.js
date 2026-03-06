// ==UserScript==
// @name         Mutation — OC Viewer
// @namespace    MutationOCViewer.JockoWillink
// @version      1.0.0
// @description  Live OC briefing overlay. Member CPR matching, status icons, live countdowns. Prioritization system specifically designed for Monarch Mutation Organized Crimes. Incompatible without admin controller
// @author       JockoWillink
// @match        https://www.torn.com/factions.php*
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

  // ── Status icons for filled role chips ────────────────────────────────────
  const STATUS_ICON = {
    "Traveling": "&#9992;",   // airplane
    "Hospital":  "&#128hospital;", // fallback below
    "Jail":      "&#9974;",   // chains/bars
  }
  // Use plain text fallbacks that render everywhere
  const STATUS_LABEL = {
    "Traveling": "[Travel]",
    "Hospital":  "[Hosp]",
    "Jail":      "[Jail]",
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
    promptForUserId()  // asks once if not set, then proceeds
  }

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

  setInterval(function() {
    if (!document.getElementById("ocv-wrapper")) {
      if (findContainer()) { injectStyles(); injectPanel(); fetchAndRender() }
    }
  }, 2000)

  // ── One-time user ID prompt ───────────────────────────────────────────────
  function promptForUserId() {
    const stored = GM_getValue("ocv-user-id", null)
    if (stored) {
      injectPanel()
      fetchAndRender()
      return
    }

    // Build a small prompt overlay
    const overlay = document.createElement("div")
    overlay.id = "ocv-id-overlay"
    overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:999999;display:flex;align-items:center;justify-content:center"
    overlay.innerHTML = `
      <div style="background:#1a1a1a;border:1px solid #c82121;border-radius:6px;padding:24px;max-width:360px;width:90%;font-family:Arial,sans-serif">
        <div style="font-size:13px;font-weight:bold;color:#ff8787;letter-spacing:1px;margin-bottom:8px">OC VIEWER SETUP</div>
        <div style="font-size:12px;color:#aaa;margin-bottom:16px">Enter your Torn user ID so the viewer can show which roles you qualify for. This is stored locally and never shared.</div>
        <div style="font-size:11px;color:#666;margin-bottom:6px">Your Torn ID (numbers only, found in your profile URL)</div>
        <input id="ocv-id-input" type="text" placeholder="e.g. 259767"
          style="width:100%;box-sizing:border-box;background:#111;border:1px solid #444;border-radius:3px;padding:7px 10px;color:#eee;font-size:13px;margin-bottom:12px;outline:none" />
        <div style="display:flex;gap:8px">
          <button id="ocv-id-save" style="flex:1;background:#881111;border:1px solid #c82121;border-radius:3px;padding:7px;color:#ff8787;font-size:12px;cursor:pointer;font-weight:bold">Save &amp; Continue</button>
          <button id="ocv-id-skip" style="background:none;border:1px solid #333;border-radius:3px;padding:7px 12px;color:#555;font-size:12px;cursor:pointer">Skip</button>
        </div>
        <div id="ocv-id-err" style="font-size:11px;color:#cc4444;margin-top:8px;display:none">Please enter a valid numeric ID.</div>
      </div>
    `
    document.body.appendChild(overlay)

    document.getElementById("ocv-id-save").addEventListener("click", function() {
      const val = document.getElementById("ocv-id-input").value.trim()
      if (!val || isNaN(parseInt(val))) {
        document.getElementById("ocv-id-err").style.display = "block"
        return
      }
      GM_setValue("ocv-user-id", parseInt(val))
      overlay.remove()
      injectPanel()
      fetchAndRender()
    })

    document.getElementById("ocv-id-skip").addEventListener("click", function() {
      overlay.remove()
      injectPanel()
      fetchAndRender()
    })

    // Allow enter key to submit
    document.getElementById("ocv-id-input").addEventListener("keydown", function(e) {
      if (e.key === "Enter") document.getElementById("ocv-id-save").click()
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
      #ocv-header:hover  { background: #1a1a1a; }
      #ocv-header-left   { display: flex; align-items: center; gap: 10px; }
      #ocv-title {
        font-size: 11px; font-weight: bold; letter-spacing: 2px;
        text-transform: uppercase; color: #ff8787;
      }
      #ocv-meta          { font-size: 10px; color: #555; }
      #ocv-meta span     { color: #888; }
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
      #ocv-reset-btn {
        font-size: 10px; background: none; border: 1px solid #333;
        border-radius: 3px; padding: 2px 7px; cursor: pointer; color: #555;
      }
      #ocv-reset-btn:hover { border-color: #555; color: #888; }
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
      .ocv-ann-msg      { font-size: 13px; color: #e8e8e8; }
      .ocv-income-bar {
        background: #0d1a0d; border: 1px solid #2a5a2a;
        border-left: 3px solid #44aa44; border-radius: 4px;
        padding: 7px 12px; margin-bottom: 12px; font-size: 13px; color: #aaa;
      }
      .ocv-income-bar strong { color: #44cc44; font-size: 15px; }
      .ocv-oc-card {
        border-left: 3px solid #882222; border-bottom: 1px solid #2d2d2d; padding: 9px 11px;
      }
      .ocv-oc-card:last-child { border-bottom: none; }
      .ocv-oc-card.pri-urgent { border-left-color: #c82121; }
      .ocv-oc-card.pri-low    { border-left-color: #444; }
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
      .ocv-chip          { display:inline-block; padding:2px 8px; border-radius:3px; font-size:12px; }
      .ocv-chip-open     { background:#0d1a0d; border:1px solid #2a7a2a; color:#44aa44; }
      .ocv-chip-open-no  { background:#1a1000; border:1px solid #7a5a00; color:#cc9900; }
      .ocv-chip-open-unk { background:#111; border:1px solid #333; color:#555; }
      .ocv-chip-filled   { background:#1e1e1e; border:1px solid #444; color:#888; }
      .ocv-chip-name     { color:#aaa; }
      .ocv-status-icon   { font-size:11px; margin-left:3px; }
      .ocv-progress      { font-size:10px; color:#cc6644; font-weight:bold; margin-left:3px; }
      .ocv-progress.full { color:#44aa44; font-weight:bold; }
      .ocv-notes {
        font-size:12px; color:#aaa; border-left:2px solid #444;
        padding-left:8px; margin-top:5px;
      }
      .ocv-no-ocs { text-align:center; padding:16px; color:#555; font-style:italic; font-size:13px; }
      .ocv-cards-wrap { border:1px solid #2a2a2a; border-radius:4px; overflow:hidden; }
      .ocv-live-badge {
        font-size:9px; color:#44aa44; border:1px solid #2a6a2a;
        background:#0d1a0d; border-radius:3px; padding:1px 5px; letter-spacing:1px;
      }
      .ocv-stale-badge {
        font-size:9px; color:#888; border:1px solid #333;
        background:#1a1a1a; border-radius:3px; padding:1px 5px; letter-spacing:1px;
      }
    `
    document.head.appendChild(s)
  }

  // ── Panel shell ───────────────────────────────────────────────────────────
  function injectPanel() {
    if (document.getElementById("ocv-wrapper")) return
    const userId  = GM_getValue("ocv-user-id", null)
    const wrapper = document.createElement("div")
    wrapper.id    = "ocv-wrapper"
    wrapper.innerHTML = `
      <div id="ocv-header">
        <div id="ocv-header-left">
          <span id="ocv-title">Mutation OC Priorities</span>
          <span id="ocv-meta">Loading...</span>
        </div>
        <div style="display:flex;gap:6px;align-items:center">
          <button id="ocv-reset-btn" title="Change your Torn ID">ID: ${userId || "?"}</button>
          <button id="ocv-refresh-btn" title="Fetch latest data">&#8635; Refresh</button>
          <button id="ocv-toggle-btn">&#9660; Hide</button>
        </div>
      </div>
      <div id="ocv-body">
        <div id="ocv-loading">Fetching OC data...</div>
      </div>
    `

    const target = findContainer()
    if (target) target.insertBefore(wrapper, target.firstChild)
    else document.body.insertBefore(wrapper, document.body.firstChild)

    const collapsed = GM_getValue("ocv-collapsed", false)
    const body      = document.getElementById("ocv-body")
    const toggleBtn = document.getElementById("ocv-toggle-btn")
    if (collapsed) { body.classList.add("ocv-collapsed"); toggleBtn.textContent = "▶ Show" }

    document.getElementById("ocv-header").addEventListener("click", function(e) {
      if (e.target.id === "ocv-refresh-btn" || e.target.id === "ocv-reset-btn") return
      const isNowCollapsed = !body.classList.contains("ocv-collapsed")
      body.classList.toggle("ocv-collapsed", isNowCollapsed)
      toggleBtn.textContent = isNowCollapsed ? "▶ Show" : "▼ Hide"
      GM_setValue("ocv-collapsed", isNowCollapsed)
    })

    document.getElementById("ocv-refresh-btn").addEventListener("click", function(e) {
      e.stopPropagation(); fetchAndRender()
    })

    // Reset button clears stored ID and re-prompts
    document.getElementById("ocv-reset-btn").addEventListener("click", function(e) {
      e.stopPropagation()
      GM_setValue("ocv-user-id", null)
      const w = document.getElementById("ocv-wrapper")
      if (w) w.remove()
      promptForUserId()
    })
  }

  // ── Fetch all tables in parallel ──────────────────────────────────────────
  function fetchAndRender() {
    const refreshBtn = document.getElementById("ocv-refresh-btn")
    const body       = document.getElementById("ocv-body")
    const meta       = document.getElementById("ocv-meta")
    if (refreshBtn) refreshBtn.disabled = true
    if (body) body.innerHTML = '<div id="ocv-loading">Fetching OC data...</div>'
    if (_timerInterval) { clearInterval(_timerInterval); _timerInterval = null }

    const userId = GM_getValue("ocv-user-id", null)

    let briefing    = null
    let liveMap     = null
    let cprReqMap   = {}   // "crime|role" → min_cpr requirement
    let memberCpr   = {}   // "crime|baseRole" → member's actual cpr
    let memberStatus = {}  // user_id → status string (from oc_members)
    let done        = 0
    const TOTAL     = userId ? 4 : 3
    let fatalErr    = false

    function onAllDone() {
      if (refreshBtn) setTimeout(function() { refreshBtn.disabled = false }, 3000)
      if (fatalErr) return
      renderBriefing(briefing, liveMap, cprReqMap, memberCpr, memberStatus)
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

    // 1. Briefing config
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

    // 2. Live OC data
    sbGet("/rest/v1/oc_live_data?select=*", function(err, rows) {
      if (err) { console.warn("[OC Viewer] Live data unavailable:", err); return }
      liveMap = {}
      for (const row of (rows || [])) liveMap[row.id] = row
    })

    // 3. CPR requirements
    sbGet("/rest/v1/oc_cpr_requirements?select=*", function(err, rows) {
      if (err) { console.warn("[OC Viewer] CPR requirements unavailable:", err); return }
      for (const row of (rows || [])) {
        if (row.min_cpr !== null) {
          cprReqMap[(row.crime_name + "|" + row.role_name).toLowerCase()] = row.min_cpr
        }
      }
    })

    // 4. Member's own CPR + member statuses (only if user ID is set)
    if (userId) {
      // Fetch this member's CPR scores
      sbGet("/rest/v1/oc_member_cpr?user_id=eq." + userId + "&select=*", function(err, rows) {
        if (err) { console.warn("[OC Viewer] Member CPR unavailable:", err); return }
        for (const row of (rows || [])) {
          // Key by base role (no #1/#2) to match TornStats format
          memberCpr[(row.crime_name + "|" + row.role_name).toLowerCase()] = row.cpr
        }
        // Also fetch all member statuses for the status icons on filled chips
        // Piggyback into this callback since it's the last one
      })
    }

    // Always fetch member statuses for icons on filled chips
    sbGet("/rest/v1/oc_members?select=id,name,status&limit=500", function(err, rows) {
      if (err) { console.warn("[OC Viewer] Member statuses unavailable:", err); return }
      for (const row of (rows || [])) memberStatus[row.id] = row.status
    })
  }

  // ── Render ────────────────────────────────────────────────────────────────
  function renderBriefing(briefing, liveMap, cprReqMap, memberCpr, memberStatus) {
    const body = document.getElementById("ocv-body")
    if (!body || !briefing) return

    const userId = GM_getValue("ocv-user-id", null)

    let html = ""

    // Announcements
    const anns = briefing.announcements || []
    if (anns.length) {
      html += '<div class="ocv-section-label" style="margin-bottom:6px">Priority Announcements</div>'
      html += '<div style="border:1px solid #2a2a2a;border-radius:4px;overflow:hidden;margin-bottom:12px">'
      anns.forEach(function(a) {
        const cls = "ocv-badge ocv-badge-" + (a.level || "normal")
        html += '<div class="ocv-ann-row"><span class="' + cls + '">' + (a.level || "normal").toUpperCase() + '</span>'
          + '<span class="ocv-ann-msg">' + escHTML(a.message) + '</span></div>'
      })
      html += '</div>'
    }

    // Period income
    if (briefing.period_income) {
      html += '<div class="ocv-income-bar">OC Income This Period: <strong>'
        + escHTML(briefing.period_income) + '</strong></div>'
    }

    // Section header
    const hasLive = liveMap && Object.keys(liveMap).length > 0
    html += '<div class="ocv-section-label" style="display:flex;justify-content:space-between;align-items:center;border-bottom:none;margin-bottom:6px">'
      + '<span style="border-bottom:1px solid #2a2a2a;padding-bottom:5px;width:100%;display:flex;justify-content:space-between">'
      + 'Actively Recruiting OCs'
      + (hasLive ? '&nbsp;<span class="ocv-live-badge">LIVE</span>' : '&nbsp;<span class="ocv-stale-badge">CONFIG ONLY</span>')
      + '</span></div>'

    // Legend — updated to include CPR states
    html += '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:8px;padding:5px 8px;background:#111;border:1px solid #222;border-radius:4px;font-size:11px;">'
      + '<span style="color:#555">Legend:</span>'
      + '<span><span style="display:inline-block;width:10px;height:10px;background:#0d1a0d;border:1px solid #2a7a2a;border-radius:2px;vertical-align:middle;margin-right:4px"></span><span style="color:#888">You qualify</span></span>'
      + '<span><span style="display:inline-block;width:10px;height:10px;background:#1a1000;border:1px solid #7a5a00;border-radius:2px;vertical-align:middle;margin-right:4px"></span><span style="color:#888">CPR too low</span></span>'
      + '<span><span style="display:inline-block;width:10px;height:10px;background:#111;border:1px solid #333;border-radius:2px;vertical-align:middle;margin-right:4px"></span><span style="color:#888">No CPR data</span></span>'
      + '<span><span style="display:inline-block;width:10px;height:10px;background:#1e1e1e;border:1px solid #444;border-radius:2px;vertical-align:middle;margin-right:4px"></span><span style="color:#888">Filled</span></span>'
      + '<span><span style="color:#cc6644;font-weight:bold;margin-right:4px">71%</span><span style="color:#888">Planning</span></span>'
      + '<span><span style="color:#44aa44;font-weight:bold;margin-right:4px">100%</span><span style="color:#888">Complete</span></span>'
      + (userId ? '' : '<span style="color:#666;font-style:italic">Set your ID to see CPR matching</span>')
      + '</div>'

    const configOcs = briefing.ocs || []
    if (!configOcs.length) {
      html += '<div class="ocv-no-ocs">No OCs currently published.</div>'
    } else {
      const nowSec      = Math.floor(Date.now() / 1000)
      const URGENT_SECS = 3 * 3600
      const sorted = configOcs.slice().sort(function(a, b) {
        const liveA  = (liveMap && a.crimeId) ? (liveMap[parseInt(a.crimeId)] || null) : null
        const liveB  = (liveMap && b.crimeId) ? (liveMap[parseInt(b.crimeId)] || null) : null
        const diffA  = liveA && liveA.ready_at ? liveA.ready_at - nowSec : null
        const diffB  = liveB && liveB.ready_at ? liveB.ready_at - nowSec : null
        const urgA   = diffA !== null && diffA <= URGENT_SECS
        const urgB   = diffB !== null && diffB <= URGENT_SECS
        if (urgA && urgB) return diffA - diffB
        if (urgA) return -1
        if (urgB) return 1
        return 0
      })

      html += '<div class="ocv-cards-wrap">'
      sorted.forEach(function(oc, i) {
        const bg        = i % 2 === 0 ? "#1e1e1e" : "#232323"
        const pri       = oc.priority || "normal"
        const live      = (liveMap && oc.crimeId) ? (liveMap[parseInt(oc.crimeId)] || null) : null
        const liveSlots = live ? (live.slots || []) : null
        const readyAt   = live ? live.ready_at : null

        // Skip fully filled
        if (liveSlots && liveSlots.length > 0 && liveSlots.every(function(s) { return s.filled })) return

        // Crime name from live data for accurate CPR lookup
        const liveCrimeName = live ? live.name : oc.name

        // Look up requirement CPR — strips #1/#2 suffix for member CPR lookup
        function getReqCpr(roleLabel) {
          const key = (liveCrimeName + "|" + roleLabel).toLowerCase()
          return cprReqMap[key] || null
        }
        function getMemberCpr(roleLabel) {
          const baseRole = roleLabel.replace(/\s*#\d+$/, "").trim()
          const key = (liveCrimeName + "|" + baseRole).toLowerCase()
          return memberCpr[key] !== undefined ? memberCpr[key] : null
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
        const badgeMap = { urgent:"ocv-badge-urgent", normal:"ocv-badge-normal", low:"ocv-badge-low", info:"ocv-badge-info" }
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

        // Roles
        let rolesHTML = '<div class="ocv-roles">'
        if (liveSlots && liveSlots.length) {
          const openSlots   = liveSlots.filter(function(s) { return !s.filled })
          const filledSlots = liveSlots.filter(function(s) { return s.filled })
            .sort(function(a, b) { return (b.progress || 0) - (a.progress || 0) })

          openSlots.forEach(function(slot) {
            const reqCpr    = getReqCpr(slot.position)
            const myCpr     = getMemberCpr(slot.position)
            const hasReq    = reqCpr !== null
            const hasMyData = myCpr !== null && userId

            let chipClass, cprSuffix
            if (!hasMyData) {
              // No member CPR data — show grey unknown chip
              chipClass = "ocv-chip ocv-chip-open-unk"
            } else if (hasReq && myCpr < reqCpr) {
              // Member doesn't meet requirement — orange/yellow chip
              chipClass = "ocv-chip ocv-chip-open-no"
            } else {
              // Meets requirement (or no requirement) — green chip
              chipClass = "ocv-chip ocv-chip-open"
            }

            let label = escHTML(slot.position)
            if (reqCpr) {
              if (hasMyData) {
                label += ' <span style="font-size:10px;opacity:0.8">| ' + myCpr + '/' + reqCpr + '+</span>'
              } else {
                label += ' <span style="font-size:10px;opacity:0.6">| CPR: ' + reqCpr + '+</span>'
              }
            }
            rolesHTML += '<span class="' + chipClass + '">' + label + '</span>'
          })

          filledSlots.forEach(function(slot) {
            const prog      = slot.progress !== null ? Math.round(slot.progress) : null
            const progStr   = prog !== null
              ? '<span class="ocv-progress' + (prog === 100 ? " full" : "") + '">' + prog + '%</span>' : ""
            // Status icon
            const status    = slot.user_id ? (memberStatus[slot.user_id] || "Okay") : "Okay"
            const statusStr = (status === "Traveling" || status === "Hospital" || status === "Jail")
              ? ' <span class="ocv-status-icon" title="' + status + '">'
                + (status === "Traveling" ? "✈" : status === "Hospital" ? "+" : "🔒")
                + '</span>'
              : ""
            rolesHTML += '<span class="ocv-chip ocv-chip-filled">'
              + escHTML(slot.position) + ': <span class="ocv-chip-name">'
              + escHTML(slot.user_name || "?") + '</span>' + statusStr + progStr + '</span>'
          })

        } else if (oc.roles && oc.roles.length) {
          // Config fallback
          oc.roles.forEach(function(r) {
            if (r.status === "filled") {
              rolesHTML += '<span class="ocv-chip ocv-chip-filled">' + escHTML(r.role)
                + (r.memberName ? ': <span class="ocv-chip-name">' + escHTML(r.memberName) + '</span>' : "") + '</span>'
            } else {
              const reqCpr  = getReqCpr(r.role) || r.cpr || null
              const myCpr   = getMemberCpr(r.role)
              let chipClass = "ocv-chip ocv-chip-open-unk"
              if (userId && myCpr !== null) {
                chipClass = (reqCpr && myCpr < reqCpr) ? "ocv-chip ocv-chip-open-no" : "ocv-chip ocv-chip-open"
              }
              let label = escHTML(r.role)
              if (reqCpr) label += ' <span style="font-size:10px;opacity:0.7">| CPR: ' + reqCpr + '+</span>'
              rolesHTML += '<span class="' + chipClass + '">' + label + '</span>'
            }
          })
        }
        rolesHTML += '</div>'

        const notesHTML = oc.notes ? '<div class="ocv-notes">' + escHTML(oc.notes) + '</div>' : ""

        html += '<div class="ocv-oc-card pri-' + pri + '" style="background:' + bg + '">'
          + '<div class="ocv-oc-header">' + nameHTML + slotsHTML + badgeHTML + timerHTML + '</div>'
          + rolesHTML + notesHTML + '</div>'
      })
      html += '</div>'
    }

    body.innerHTML = html

    if (_timerInterval) clearInterval(_timerInterval)
    _timerInterval = setInterval(tickCountdowns, 1000)
    tickCountdowns()
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


})()


