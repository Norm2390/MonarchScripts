// ==UserScript==
// @name         Mutation OC Prioritizer (WIP)
// @namespace    MM OC Prioritizer - Jocko
// @version      1.0.0
// @description  Faction CPR requirements + role qualification highlighting + role weights + OC card reordering for Torn OC 2.0. All local, no API, information off your crime page.
// @match        https://www.torn.com/factions.php*
// @run-at       document-end
// @grant        GM.xmlHttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_info
// @author       Jocko [55408]
// ==/UserScript==

/*
 * ============================================================================
 * PROPRIETARY — Mutation faction internal tool. Not open source, not for
 * public/collaborative use or redistribution.
 *
 * This script is built specifically for Mutation members to help organize
 * and prioritize the faction's OC cards. Do not copy, fork, re-host,
 * repackage, or redistribute this script (in whole or in part) outside the
 * faction without messaging Jocko [55408] first.
 * ============================================================================
 *
 * NOTE: MEMBERS WILL NOT HAVE TO ADJUST ANYTHING BELOW: IF YOU DO, YOU WILL NO LONGER BE ALIGNED WITH THE REST OF THE MEMBERS WHO USE IT!
 */

(function () {
  "use strict";

  /* ============================================================================
   * CONFIG FOR current/future Mutation OC MANAGERS  — edit this section to add/adjust crimes, CPR requirements, and
   * role weights.
   *
   * CPR_REQUIREMENTS: key = exact OC scenario name shown in the panel title.
   *   value = { "Role Name": minimumCPR }. Any crime NOT listed here is treated
   *   as "not run by the faction" and sinks to the bottom section.
   *
   * ROLE_WEIGHTS: same shape, independent of CPR_REQUIREMENTS — this is just
   *   "how much this role affects overall success chance", shown as an
   *   informational box under every role regardless of whether the crime is
   *   tracked/qualified. Add crimes here as you find their weight numbers, and
   *   adjust if Torn repatches the underlying probabilities.
   * ============================================================================ */
  const CPR_REQUIREMENTS = {
    "Pet Project": { "Kidnapper": 70, "Muscle": 70, "Picklock": 70 },
    "Mob Mentality": { "Looter #1": 70, "Looter #2": 70, "Looter #3": 60, "Looter #4": 67 },
    "Cash Me if You Can": { "Thief #1": 70, "Thief #2": 65, "Lookout": 70 },
    "Best of the Lot": { "Picklock": 70, "Car Thief": 70, "Muscle": 75, "Imitator": 60 },
    "Market Forces": { "Enforcer": 70, "Negotiator": 70, "Lookout": 68, "Arsonist": 40, "Muscle": 70 },
    "Smoke and Wing Mirrors": { "Car Thief": 74, "Imitator": 70, "Hustler #1": 60, "Hustler #2": 65 },
    "Gaslight the Way": {
      "Imitator #1": 70, "Imitator #2": 72, "Imitator #3": 72,
      "Looter #1": 60, "Looter #2": 40, "Looter #3": 65,
    },
    "Stage Fright": {
      "Enforcer": 70, "Muscle #1": 72, "Muscle #2": 50, "Muscle #3": 70,
      "Lookout": 60, "Sniper": 75,
    },
    "Snow Blind": { "Hustler": 74, "Imitator": 70, "Muscle #1": 70, "Muscle #2": 50 },
    "Leave No Trace": { "Techie": 60, "Negotiator": 70, "Imitator": 73 },
    "No Reserve": { "Car Thief": 67, "Techie": 75, "Engineer": 67 },
    "Counter Offer": { "Robber": 62, "Looter": 42, "Hacker": 60, "Picklock": 60, "Engineer": 62 },
    "Guardian Ángels": { "Enforcer": 60, "Hustler": 73, "Engineer": 70 },
    "Honey Trap": { "Enforcer": 60, "Muscle #1": 70, "Muscle #2": 75 },
    "Bidding War": {
      "Robber #1": 60, "Driver": 70, "Robber #2": 75, "Robber #3": 70,
      "Bomber #1": 70, "Bomber #2": 63,
    },
    "Blast from the Past": {
      "Picklock #1": 75, "Hacker": 75, "Engineer": 75, "Bomber": 75,
      "Muscle": 75, "Picklock #2": 40,
    },
    "Break the Bank": {
      "Robber": 68, "Muscle #1": 68, "Muscle #2": 68,
      "Thief #1": 66, "Muscle #3": 70, "Thief #2": 70,
    },
    "Stacking the Deck": { "Cat Burglar": 72, "Driver": 66, "Hacker": 72, "Imitator": 72 },
    "Clinical Precision": { "Imitator": 73, "Cat Burglar": 73, "Assassin": 72, "Cleaner": 73 },
    "Ace in the Hole": {
      "Imitator": 69, "Muscle #1": 67, "Muscle #2": 67, "Hacker": 68, "Driver": 60,
    },
    "Sneaky Git Grab": { "Imitator": 60, "Pickpocket": 75, "Hacker": 66, "Techie": 70 },
    "Manifest Cruelty": { "Reviver": 99, "Interrogator": 99, "Hacker": 99, "Cat Burglar": 99 },
    "Window of Opportunity": {
      "Engineer": 70, "Looter #1": 70, "Looter #2": 70, "Muscle #1": 70, "Muscle #2": 70,
    },
    "Lock Stock": {
      "Muscle #1": 70, "Assassin": 70, "Hacker": 70, "Muscle #2": 70, "Smuggler": 70,
    },
    "Hostile Takeover": {
      "Muscle": 68, "Negotiator": 68, "Cat Burglar": 68, "Kidnapper": 68, "Hacker": 68, "Engineer": 68,
    },
  };

  // Role importance / weight-to-success-chance, shown under every role
  // regardless of whether the crime is one we track requirements for.
  // Fill in more crimes here as you gather the numbers.
  const ROLE_WEIGHTS = {
    "Snow Blind": { "Muscle #1": 8.5, "Hustler": 48.4, "Imitator": 34.6, "Muscle #2": 8.5 },
    "Blast from the Past": {
      "Picklock #1": 10.8, "Muscle": 34.6, "Hacker": 12.1,
      "Bomber": 15.6, "Picklock #2": 2.9, "Engineer": 24.0,
    },
    "Clinical Precision": { "Imitator": 43.3, "Cleaner": 21.7, "Assassin": 16.1, "Cat Burglar": 18.9 },
    "Break the Bank": {
      "Muscle #1": 13.5, "Muscle #2": 10.1, "Muscle #3": 31.7,
      "Robber": 12.7, "Thief #1": 2.9, "Thief #2": 29.1,
    },
    "Lock Stock": { "Assassin": 38.6, "Muscle #2": 10.6, "Hacker": 15.3, "Muscle #1": 10.6, "Smuggler": 24.9 },
  };

  // How many points below the listed requirement we'll still call a "pass".
  // Set to 0 for now — strict minimums only, no flex. Bump back up if you
  // want the soft margin again later.
  const LENIENCY = 0;

  // Crowding: counts occupied roles that are IDLE (planning clock at 0%,
  // i.e. someone joined but hasn't started progressing) — not just any
  // occupied role. A role already at 100% isn't blocking anyone. If an OC
  // has this many people parked at 0% and still has open slots, we treat it
  // as "busy" and rank it below equally-difficult, less-crowded options —
  // never hidden, just deprioritized.
  const CROWDING_IDLE_THRESHOLD = 3; // 0,1,2 idle = fine (24-48h wait); 3+ = busy

  // How close to stalling (hours) counts as "urgent" for sort/wording
  // purposes. Shared by the stall-row verdict text and the sort buckets
  // below so they stay consistent with each other.
  const NEAR_STALL_THRESHOLD_HOURS = 24;

  // Explicit ranking to break ties between different crimes that share the
  // same difficulty number (e.g. Blast from the Past vs Window of
  // Opportunity are both Level 7, but the faction ranks BftP above WoO).
  // Anything not listed here falls back to a low priority (still sorts
  // after everything named, difficulty being equal).
  const CRIME_IMPORTANCE_ORDER = [
    "Hostile Takeover", "Ace in the Hole",
    "Break the Bank", "Lock Stock", "Stacking the Deck", "Clinical Precision",
    "Blast from the Past", "Window of Opportunity",
  ];
  function crimeImportanceIndex(crimeName) {
    const i = CRIME_IMPORTANCE_ORDER.indexOf(crimeName);
    return i === -1 ? CRIME_IMPORTANCE_ORDER.length : i;
  }

  // How long (ms) to wait after DOM activity settles before re-scanning.
  const SCAN_DEBOUNCE_MS = 1500;

  // How long (ms) an "updated CPR" toast stays on screen.
  const TOAST_DURATION_MS = 6000;

  // Crimes the faction never runs, hidden by default so nobody accidentally
  // spawns/joins one — "out of sight, out of mind." Toggle-able per-member
  // in the gear panel (Show hidden OCs). Add more crime names here as needed.
  const HIDDEN_CRIMES_BY_DEFAULT = ["Manifest Cruelty"];

  const STORAGE_KEY = "tornOC_prioritizer_cprData_v1";
  const MAX_DIFFICULTY_KEY = "tornOC_prioritizer_maxDifficulty_v1";
  const SORT_TOGGLE_KEY = "tornOC_prioritizer_dynamicSortEnabled_v1";
  const SHOW_HIDDEN_KEY = "tornOC_prioritizer_showHiddenOcs_v1";
  const NOT_QUALIFIED_HEADER_ID = "tt2p-not-qualified-divider";
  const DEFAULT_MAX_DIFFICULTY = 10; // no cap unless a member's setting says otherwise

  // Per-member settings (per-browser, editable via the gear panel). These are
  // intentionally NOT centrally managed — each member's own browser decides
  // its own cap/toggle state, same as the CPR data.
  let maxDifficultyLevel = (() => {
    const stored = parseInt(localStorage.getItem(MAX_DIFFICULTY_KEY), 10);
    return Number.isFinite(stored) && stored >= 1 && stored <= 10 ? stored : DEFAULT_MAX_DIFFICULTY;
  })();

  let dynamicSortEnabled = localStorage.getItem(SORT_TOGGLE_KEY) !== "0";
  let showHiddenOcs = localStorage.getItem(SHOW_HIDDEN_KEY) === "1";

  // Tracks, per browser session only (resets on page reload — not persisted
  // to localStorage), whether we've ever seen a LIVE planning clock (the
  // conic-gradient icon, at any %) for a given crime+role. Needed because
  // Torn renders the exact same static "inactive" icon for two very
  // different situations: a role that's genuinely 100% complete, and a role
  // whose occupant is missing a required item and has never started at all.
  // If we've watched that role actually tick at some point, "inactive" now
  // means complete. If we've never once seen it tick, "inactive" almost
  // certainly means blocked. See classifyOccupantPlanning() below.
  const slotProgressHistory = {};

  /* ============================================================================
   * Storage helpers — everything lives in localStorage on this machine only.
   * Nothing here is transmitted anywhere.
   * ============================================================================ */
  function loadStore() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch (e) {
      console.warn("[TornOC-Prioritizer] Corrupt storage, resetting.", e);
      return {};
    }
  }

  function saveStore(store) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }

  function recordCpr(store, crimeName, roleName, value) {
    if (!store[crimeName]) store[crimeName] = {};
    const existing = store[crimeName][roleName];
    if (!existing || value > existing.value) {
      store[crimeName][roleName] = { value, updatedAt: new Date().toISOString() };
      return { changed: true, previous: existing ? existing.value : null };
    }
    return { changed: false, previous: existing.value };
  }

  const LEVEL9_CRIMES = ["Hostile Takeover", "Ace in the Hole"];

  // Checks the member's STORED CPR history (not just what's currently open
  // on screen — Level 9 crimes might not even be spawned right now) against
  // the Level 9 requirements. If any tracked Level 9 role has ever been
  // observed meeting its requirement, this member is treated as "Level 9
  // capable" for sort-priority purposes. Ace in the Hole falls out of this
  // automatically once its CPR requirements are added to the config — no
  // code change needed then.
  function computeLevel9Capable() {
    const store = loadStore();
    for (const crime of LEVEL9_CRIMES) {
      const reqMap = CPR_REQUIREMENTS[crime];
      const stored = store[crime];
      if (!reqMap || !stored) continue;
      for (const role of Object.keys(reqMap)) {
        const entry = stored[role];
        if (entry && entry.value >= reqMap[role] - LENIENCY) return true;
      }
    }
    return false;
  }

  /* ============================================================================
   * Toast notifications
   * ============================================================================ */
  function ensureToastContainer() {
    let el = document.getElementById("tt2p-toast-container");
    if (!el) {
      el = document.createElement("div");
      el.id = "tt2p-toast-container";
      document.body.appendChild(el);
    }
    return el;
  }

  function showToast(message) {
    const container = ensureToastContainer();
    const toast = document.createElement("div");
    toast.className = "tt2p-toast";
    toast.textContent = message;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("tt2p-toast-in"));
    setTimeout(() => {
      toast.classList.remove("tt2p-toast-in");
      toast.classList.add("tt2p-toast-out");
      setTimeout(() => toast.remove(), 400);
    }, TOAST_DURATION_MS);
  }

  /* ============================================================================
   * Custom tooltip (own implementation — Torn's own hover tooltip content isn't
   * something we can safely inject into, and the disabled Join buttons block
   * native title-attribute tooltips via pointer-events:none anyway).
   * ============================================================================ */
  function ensureCustomTooltip() {
    let el = document.getElementById("tt2p-tooltip");
    if (!el) {
      el = document.createElement("div");
      el.id = "tt2p-tooltip";
      document.body.appendChild(el);
    }
    return el;
  }

  function tooltipHtml(slot, crimeName, tracked) {
    let occupantRow = "";
    if (slot.hasOccupant) {
      if (slot.planningState === "idle") {
        occupantRow = `<div class="tt2p-tt-row tt2p-tt-idle">\u23F3 Joined, but not yet planning (0%)</div>`;
      } else if (slot.planningState === "in_progress") {
        occupantRow = `<div class="tt2p-tt-row">Planning progress: <b>${slot.planningPct.toFixed(1)}%</b></div>`;
      } else if (slot.planningState === "blocked") {
        occupantRow = `<div class="tt2p-tt-row tt2p-tt-idle">\u26A0\uFE0F No planning progress seen \u2014 possibly missing a required item</div>`;
      } else {
        occupantRow = `<div class="tt2p-tt-row">Planning complete (100%) \u2014 waiting on other roles</div>`;
      }
    }

    if (!tracked) {
      return `<div class="tt2p-tt-title">${escapeHtml(crimeName)}</div>
        ${occupantRow}
        <div class="tt2p-tt-row">Not tracked by faction rules</div>`;
    }
    if (slot.requirement === undefined) {
      return `<div class="tt2p-tt-title">${escapeHtml(slot.roleName)}</div>
        ${occupantRow}
        <div class="tt2p-tt-row">No CPR requirement configured for this role</div>`;
    }
    const chanceText = slot.chance === null || Number.isNaN(slot.chance) ? "unknown" : slot.chance;
    let statusHtml = "";
    if (slot.qualifies === true) {
      statusHtml = `<div class="tt2p-tt-row tt2p-tt-pass">\u2705 PASS</div>`;
    } else if (slot.qualifies === false) {
      const short = Math.max(0, (slot.requirement - LENIENCY) - slot.chance);
      statusHtml = `<div class="tt2p-tt-row tt2p-tt-fail">\u274C FAIL (needs +${short})</div>`;
    }
    const starHtml = slot.starRank !== undefined
      ? `<div class="tt2p-tt-row tt2p-tt-pass">${STAR_ICONS[slot.starRank]} ${STAR_LABELS[slot.starRank]} choice for you right now</div>`
      : "";
    return `
      <div class="tt2p-tt-title">${escapeHtml(slot.roleName)}</div>
      ${occupantRow}
      <div class="tt2p-tt-row">Current CPR Requirement: <b>${slot.requirement}</b>${LENIENCY > 0 ? ` (\u2212${LENIENCY} flex allowed)` : ""}</div>
      <div class="tt2p-tt-row">Your CPR: <b>${chanceText}</b></div>
      ${statusHtml}
      ${starHtml}
    `;
  }

  function escapeHtml(str) {
    const d = document.createElement("div");
    d.textContent = str == null ? "" : String(str);
    return d.innerHTML;
  }

  // Formats a decimal-hours number into a compact "1d 4h 20m" style string.
  function formatDuration(hours) {
    if (!Number.isFinite(hours) || hours <= 0) return "0m";
    const totalMinutes = Math.round(hours * 60);
    const d = Math.floor(totalMinutes / 1440);
    const h = Math.floor((totalMinutes % 1440) / 60);
    const m = totalMinutes % 60;
    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0 || d > 0) parts.push(`${h}h`);
    parts.push(`${m}m`);
    return parts.join(" ");
  }

  // Strict "HH:MM" format — used for the active planner's own remaining
  // time, which is always bounded within a single 24h window so days never
  // come into play here.
  function formatHM(hours) {
    if (!Number.isFinite(hours) || hours < 0) hours = 0;
    const totalMinutes = Math.round(hours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  // "HH:MM:SS" — used for the time-until-stall countdown.
  function formatHMS(hours) {
    if (!Number.isFinite(hours) || hours < 0) hours = 0;
    const totalSeconds = Math.round(hours * 3600);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function positionTooltip(evt) {
    const tt = ensureCustomTooltip();
    const pad = 14;
    let x = evt.clientX + pad;
    let y = evt.clientY + pad;
    const rect = tt.getBoundingClientRect();
    if (x + rect.width > window.innerWidth) x = evt.clientX - rect.width - pad;
    if (y + rect.height > window.innerHeight) y = evt.clientY - rect.height - pad;
    tt.style.left = `${x}px`;
    tt.style.top = `${y}px`;
  }

  function attachTooltip(slot, crimeName, tracked) {
    if (!slot.wrapperEl || slot.wrapperEl.dataset.tt2pTooltipBound) return;
    slot.wrapperEl.dataset.tt2pTooltipBound = "1";
    slot.wrapperEl.addEventListener("mouseenter", () => {
      const tt = ensureCustomTooltip();
      tt.innerHTML = tooltipHtml(slot, crimeName, tracked);
      tt.classList.add("tt2p-tooltip-visible");
    });
    slot.wrapperEl.addEventListener("mousemove", positionTooltip);
    slot.wrapperEl.addEventListener("mouseleave", () => {
      ensureCustomTooltip().classList.remove("tt2p-tooltip-visible");
    });
  }

  /* ============================================================================
   * Sort/filter toggle pill — sits just below the Spawn action row. Flipping
   * it off restores the page's native order and disables all our styling
   * (join-button disabling, qualify highlighting, level-cap hiding). CPR
   * capture, weight boxes, and tooltips keep running either way since they're
   * informational only and don't change layout.
   * ============================================================================ */
  function updateTogglePillUi() {
    const pill = document.getElementById("tt2p-toggle-pill");
    const label = document.getElementById("tt2p-toggle-state-label");
    if (!pill || !label) return;
    pill.classList.toggle("tt2p-pill-on", dynamicSortEnabled);
    pill.classList.toggle("tt2p-pill-off", !dynamicSortEnabled);
    label.textContent = dynamicSortEnabled ? "ON - OCs are now sorting based on your CPR level & level of urgency to fill each OC. Start-up any blank OCs that are at the top " : "OFF (vanilla)";
  }

  function ensureSortTogglePill(container) {
    if (!container) return;
    let row = document.getElementById("tt2p-sort-toggle-row");
    if (!row) {
      row = document.createElement("div");
      row.id = "tt2p-sort-toggle-row";
      row.innerHTML = `
        <span class="tt2p-toggle-label">Dynamic Sorting/Filtering</span>
        <button id="tt2p-toggle-pill" type="button" class="tt2p-pill"><span class="tt2p-pill-knob"></span></button>
        <span id="tt2p-toggle-state-label"></span>
      `;
      row.querySelector("#tt2p-toggle-pill").addEventListener("click", () => {
        dynamicSortEnabled = !dynamicSortEnabled;
        localStorage.setItem(SORT_TOGGLE_KEY, dynamicSortEnabled ? "1" : "0");
        updateTogglePillUi();
        runPass();
      });
    }
    // Re-insert at the top every pass in case React wiped it during a re-render.
    if (container.firstChild !== row) {
      container.insertBefore(row, container.firstChild);
    }
    updateTogglePillUi();
  }

  /* ============================================================================
   * Settings gear + purge panel
   * ============================================================================ */
  function ensureGearUi() {
    if (document.getElementById("tt2p-gear-btn")) return;

    const gear = document.createElement("button");
    gear.id = "tt2p-gear-btn";
    gear.type = "button";
    gear.title = "Mutation OC Prioritizer settings";
    gear.innerHTML = `<span class="tt2p-gear-icon">\u2699\uFE0F</span><span class="tt2p-gear-label">Mutation OC Prioritizer</span>`;
    document.body.appendChild(gear);

    const panel = document.createElement("div");
    panel.id = "tt2p-settings-panel";
    panel.innerHTML = `
      <div class="tt2p-settings-header">Your Settings</div>
      <div class="tt2p-settings-row">
        <label for="tt2p-difficulty-input">Max OC difficulty you're cleared for (1\u201310):</label>
        <input id="tt2p-difficulty-input" type="number" min="1" max="10" value="${maxDifficultyLevel}" />
        <button id="tt2p-difficulty-save" type="button">Save</button>
      </div>
      <div class="tt2p-settings-row" style="margin-top:10px;">
        <label class="tt2p-settings-checkbox-label">
          <input id="tt2p-show-hidden-input" type="checkbox" ${showHiddenOcs ? "checked" : ""} />
          Show hidden OCs (e.g. Manifest Cruelty)
        </label>
      </div>
      <div class="tt2p-settings-header" style="margin-top:14px;">Stored CPR Data</div>
      <div id="tt2p-settings-body"></div>
      <button id="tt2p-purge-btn" type="button">Purge All CPR Data</button>
    `;
    document.body.appendChild(panel);

    gear.addEventListener("click", () => {
      panel.classList.toggle("tt2p-open");
      if (panel.classList.contains("tt2p-open")) {
        // Position the panel just above the gear button using its actual
        // measured height — the button's height now varies with the label
        // text, so a hardcoded offset would drift.
        const gearRect = gear.getBoundingClientRect();
        panel.style.bottom = `${Math.round(window.innerHeight - gearRect.top + 10)}px`;
        renderSettingsPanel();
      }
    });

    panel.querySelector("#tt2p-difficulty-save").addEventListener("click", () => {
      const input = document.getElementById("tt2p-difficulty-input");
      let val = parseInt(input.value, 10);
      if (!Number.isFinite(val) || val < 1) val = 1;
      if (val > 10) val = 10;
      input.value = val;
      maxDifficultyLevel = val;
      localStorage.setItem(MAX_DIFFICULTY_KEY, String(val));
      showToast(`Max OC difficulty set to ${val}/10.`);
      runPass();
    });

    panel.querySelector("#tt2p-show-hidden-input").addEventListener("change", (e) => {
      showHiddenOcs = !!e.target.checked;
      localStorage.setItem(SHOW_HIDDEN_KEY, showHiddenOcs ? "1" : "0");
      showToast(showHiddenOcs ? "Hidden OCs are now shown." : "Hidden OCs are hidden again.");
      runPass();
    });

    panel.querySelector("#tt2p-purge-btn").addEventListener("click", () => {
      if (confirm("Erase all locally stored CPR data for this browser? This can't be undone.")) {
        localStorage.removeItem(STORAGE_KEY);
        renderSettingsPanel();
        showToast("CPR data purged.");
      }
    });
  }

  function renderSettingsPanel() {
    const body = document.getElementById("tt2p-settings-body");
    if (!body) return;
    const store = loadStore();
    const crimeNames = Object.keys(store).sort();

    if (crimeNames.length === 0) {
      body.innerHTML = `<div class="tt2p-settings-empty">No CPR data stored yet. Browse Recruiting/Planning with open roles showing to capture some.</div>`;
      return;
    }

    let html = `
      <div class="tt2p-settings-role tt2p-settings-headerrow">
        <span>Role</span>
        <span class="tt2p-col-num">Your CPR</span>
        <span class="tt2p-col-num">Req</span>
        <span class="tt2p-col-num">Diff</span>
        <span class="tt2p-col-date">Updated</span>
      </div>
    `;

    crimeNames.forEach((crimeName) => {
      const roles = store[crimeName];
      const roleNames = Object.keys(roles).sort();
      const reqMap = CPR_REQUIREMENTS[crimeName];
      html += `<div class="tt2p-settings-crime">${escapeHtml(crimeName)}</div>`;
      roleNames.forEach((roleName) => {
        const entry = roles[roleName];
        const dt = new Date(entry.updatedAt);
        const dateStr = isNaN(dt) ? "" : dt.toLocaleDateString() + " " + dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

        let reqText = "\u2014";
        let diffHtml = `<span class="tt2p-diff-neutral">\u2014</span>`;
        if (reqMap) {
          const req = normalizeLookup(reqMap, roleName);
          if (req !== undefined) {
            reqText = String(req);
            const diff = entry.value - req;
            diffHtml = diff >= 0
              ? `<span class="tt2p-diff-met">\u2713 +${diff}</span>`
              : `<span class="tt2p-diff-short">Need +${-diff}</span>`;
          }
        }

        html += `<div class="tt2p-settings-role">
          <span>${escapeHtml(roleName)}</span>
          <span class="tt2p-col-num tt2p-settings-value">${entry.value}</span>
          <span class="tt2p-col-num">${reqText}</span>
          <span class="tt2p-col-num">${diffHtml}</span>
          <span class="tt2p-col-date">${dateStr}</span>
        </div>`;
      });
    });
    body.innerHTML = html;
  }

  /* ============================================================================
   * Styles
   * ============================================================================ */
  function injectStyles() {
    if (document.getElementById("tt2p-styles")) return;
    const style = document.createElement("style");
    style.id = "tt2p-styles";
    style.textContent = `
      #tt2p-toast-container {
        position: fixed;
        right: 14px;
        bottom: 14px;
        z-index: 999999;
        display: flex;
        flex-direction: column;
        gap: 6px;
        pointer-events: none;
      }
      .tt2p-toast {
        background: #1c1c1c;
        border: 1px solid #3ecf5c;
        color: #eaeaea;
        font-size: 12px;
        font-family: Arial, sans-serif;
        padding: 8px 12px;
        border-radius: 4px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.4);
        opacity: 0;
        transform: translateX(20px);
        transition: opacity 0.25s ease, transform 0.25s ease;
        max-width: 280px;
      }
      .tt2p-toast-in { opacity: 1; transform: translateX(0); }
      .tt2p-toast-out { opacity: 0; transform: translateX(20px); }

      .tt2p-role-good > button[class*="slotHeader__"] {
        outline: 2px solid #3ecf5c !important;
        outline-offset: -2px;
      }
      .tt2p-role-bad > button[class*="slotHeader__"] {
        outline: 2px solid #cf3e3e !important;
        outline-offset: -2px;
      }
      .tt2p-join-disabled {
        pointer-events: none !important;
        opacity: 0.35 !important;
        filter: grayscale(70%);
        cursor: not-allowed !important;
      }

      #${NOT_QUALIFIED_HEADER_ID} {
        display: flex;
        align-items: center;
        gap: 10px;
        margin: 18px 0 10px 0;
        padding: 8px 12px;
        border-radius: 4px;
        background: rgba(207, 62, 62, 0.12);
        border: 1px dashed rgba(207, 62, 62, 0.5);
        color: #d98c8c;
        font-family: Arial, sans-serif;
        font-size: 13px;
        font-weight: bold;
        letter-spacing: 0.3px;
      }
      .tt2p-not-qualified-card {
        opacity: 0.75;
      }

      .tt2p-status-badge {
        margin-top: 6px;
        display: inline-block;
        padding: 3px 8px;
        border-radius: 4px;
        font-family: Arial, sans-serif;
        font-size: 11px;
        font-weight: bold;
      }
      .tt2p-status-badge.tt2p-status-crowded {
        background: rgba(255, 165, 0, 0.15);
        border: 1px solid rgba(255, 165, 0, 0.5);
        color: #ffb84d;
      }
      .tt2p-status-badge.tt2p-status-stalled {
        background: #ffcc33;
        border: 1px solid #e0a800;
        color: #1a1a1a;
      }

      /* OC Timeline strip — single row inserted between the description and
         the roles grid, columns aligned to the role boxes directly below. */
      .tt2p-timeline-strip {
        margin: 10px 0 8px;
        padding-top: 8px;
        border-top: 1px solid rgba(255,255,255,0.12);
        font-family: Arial, sans-serif;
      }
      .tt2p-tl-strip-header {
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        gap: 3px 4px;
        font-size: 11px;
        margin-bottom: 10px;
        padding-bottom: 8px;
        border-bottom: 1px solid rgba(255,255,255,0.1);
      }
      .tt2p-tl-strip-title {
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: #cfe8ff;
        white-space: pre-wrap;
      }
      .tt2p-tl-strip-details {
        color: #cfcfcf;
        white-space: pre-wrap;
      }
      .tt2p-summary-warn { color: #ff9a7a; font-weight: bold; }
      .tt2p-tl-strip-sep { opacity: 0.35; margin: 0 2px; }

      .tt2p-tl-strip-bars {
        display: flex;
      }
      .tt2p-tl-seg {
        height: 18px;
        border-radius: 3px;
        background: rgba(255,255,255,0.06);
        box-shadow: inset 0 1px 3px rgba(0,0,0,0.4);
        position: relative;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        /* Chevron pointing right on both ends, so consecutive segments read
           as a connected arrow chain flowing toward completion. */
        clip-path: polygon(0% 0%, 88% 0%, 100% 50%, 88% 100%, 0% 100%, 12% 50%);
        /* Drop-shadow (not border) traces the actual clipped chevron
           silhouette on all sides, including the diagonal cuts — a plain
           border renders inconsistently along clip-path edges. */
        filter:
          drop-shadow(1px 0 0 rgba(0,0,0,0.9))
          drop-shadow(-1px 0 0 rgba(0,0,0,0.9))
          drop-shadow(0 1px 0 rgba(0,0,0,0.9))
          drop-shadow(0 -1px 0 rgba(0,0,0,0.9));
      }
      .tt2p-tl-seg-first {
        clip-path: polygon(0% 0%, 88% 0%, 100% 50%, 88% 100%, 0% 100%);
      }
      .tt2p-tl-seg-last {
        clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 12% 50%);
      }
      .tt2p-tl-seg-only {
        clip-path: none;
        border-radius: 4px;
      }
      .tt2p-tl-seg-fill {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        transition: width 0.35s ease;
      }
      .tt2p-tl-seg-fill::after {
        content: "";
        position: absolute;
        inset: 0;
        background: linear-gradient(180deg, rgba(255,255,255,0.35), rgba(255,255,255,0) 55%);
      }
      .tt2p-tl-seg-complete .tt2p-tl-seg-fill { background: linear-gradient(90deg, #5be085, #2ea44f); }
      .tt2p-tl-seg-active .tt2p-tl-seg-fill {
        background-image:
          linear-gradient(90deg, #6cb8ff, #2f86e0),
          repeating-linear-gradient(45deg, rgba(255,255,255,0.35) 0 7px, transparent 7px 14px);
        animation: tt2p-flow-stripes 0.9s linear infinite;
      }
      @keyframes tt2p-flow-stripes {
        from { background-position: 0 0, 0 0; }
        to   { background-position: 0 0, 28px 0; }
      }
      .tt2p-tl-seg-idle .tt2p-tl-seg-fill { background: transparent; }
      .tt2p-tl-seg-idle-warn { background: rgba(224,92,92,0.22); }
      .tt2p-tl-seg-idle-warn .tt2p-tl-seg-fill { background: transparent; }
      .tt2p-tl-seg-blocked { background: rgba(160,90,220,0.22); }
      .tt2p-tl-seg-blocked .tt2p-tl-seg-fill { background: transparent; }
      .tt2p-tl-seg-open { background: rgba(255,255,255,0.03); }
      .tt2p-tl-seg-open .tt2p-tl-seg-label { opacity: 0.5; }
      .tt2p-tl-seg-label {
        position: relative;
        z-index: 2;
        font-size: 9.5px;
        font-weight: 700;
        color: #fff;
        text-shadow: 0 1px 2px rgba(0,0,0,0.6);
        padding: 0 4px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .tt2p-tl-stall-row {
        font-size: 11px;
        color: #cfcfcf;
        margin-bottom: 8px;
      }
      .tt2p-tl-stall-row.tt2p-tl-stall-warn { color: #ff9a7a; font-weight: bold; }
      .tt2p-tl-stall-row.tt2p-tl-stall-ok { color: #8fd6a3; }
      .tt2p-tl-stall-row.tt2p-tl-stall-uninitiated { color: #8fc7ff; }
      .tt2p-tl-stall-row.tt2p-tl-stall-top-pick { color: #ffd166; font-weight: bold; }

      /* Weight boxes */
      .tt2p-weight-box {
        margin-top: 6px;
        padding: 6px;
        text-align: center;
        border: 1px solid rgba(255,255,255,0.15);
        border-radius: 6px;
        background: rgba(255,255,255,0.03);
        font-family: Arial, sans-serif;
      }
      .tt2p-weight-label {
        display: block;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: .05em;
        opacity: .8;
        padding-bottom: 3px;
        margin-bottom: 4px;
        border-bottom: 1px solid rgba(255,255,255,0.2);
        color: #eaeaea;
      }
      .tt2p-weight-value {
        display: block;
        font-size: 15px;
        font-weight: 700;
        margin-top: 2px;
        color: #eaeaea;
      }

      /* Custom tooltip */
      #tt2p-tooltip {
        position: fixed;
        z-index: 9999999;
        background: #101010;
        border: 1px solid rgba(255,255,255,0.25);
        border-radius: 6px;
        padding: 8px 10px;
        font-family: Arial, sans-serif;
        font-size: 12px;
        color: #eaeaea;
        max-width: 240px;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.1s ease;
        box-shadow: 0 4px 10px rgba(0,0,0,0.5);
      }
      #tt2p-tooltip.tt2p-tooltip-visible { opacity: 1; }
      .tt2p-tt-title { font-weight: bold; margin-bottom: 4px; }
      .tt2p-tt-row { margin-top: 2px; }
      .tt2p-tt-pass { color: #3ecf5c; font-weight: bold; }
      .tt2p-tt-fail { color: #e05c5c; font-weight: bold; }
      .tt2p-tt-idle { color: #ffb84d; font-weight: bold; }

      /* Gear + settings panel */
      #tt2p-gear-btn {
        position: fixed;
        right: 14px;
        bottom: 80px;
        z-index: 999999;
        width: 26px;
        padding: 8px 0;
        border-radius: 13px;
        background: #1c1c1c;
        border: 1px solid rgba(255,255,255,0.25);
        color: #eaeaea;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
      }
      #tt2p-gear-btn:hover { background: #2a2a2a; }
      .tt2p-gear-icon { font-size: 14px; line-height: 1; }
      .tt2p-gear-label {
        writing-mode: vertical-rl;
        transform: rotate(180deg);
        font-size: 10px;
        font-weight: bold;
        letter-spacing: 0.03em;
        font-family: Arial, sans-serif;
        white-space: nowrap;
        opacity: 0.9;
      }
      #tt2p-settings-panel {
        position: fixed;
        right: 14px;
        bottom: 124px;
        width: 420px;
        max-height: 460px;
        overflow-y: auto;
        background: #1c1c1c;
        border: 1px solid rgba(255,255,255,0.25);
        border-radius: 6px;
        padding: 10px;
        z-index: 999999;
        font-family: Arial, sans-serif;
        font-size: 12px;
        color: #eaeaea;
        display: none;
      }
      #tt2p-settings-panel.tt2p-open { display: block; }
      .tt2p-settings-header { font-weight: bold; font-size: 13px; margin-bottom: 8px; }
      .tt2p-settings-empty { opacity: 0.7; font-style: italic; }
      .tt2p-settings-crime { font-weight: bold; margin-top: 10px; margin-bottom: 2px; color: #9fd3ff; }
      .tt2p-settings-role {
        display: grid;
        grid-template-columns: 1fr 62px 46px 66px 96px;
        align-items: center;
        gap: 6px;
        padding: 3px 0;
        border-bottom: 1px solid rgba(255,255,255,0.08);
      }
      .tt2p-settings-headerrow {
        font-weight: bold;
        font-size: 10.5px;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        color: #9fd3ff;
        border-bottom: 1px solid rgba(255,255,255,0.2);
        padding-bottom: 5px;
      }
      .tt2p-col-num { text-align: right; font-variant-numeric: tabular-nums; }
      .tt2p-settings-value { font-weight: bold; }
      .tt2p-diff-met { color: #7fe89b; font-weight: bold; }
      .tt2p-diff-short { color: #ff9a7a; font-weight: bold; }
      .tt2p-diff-neutral { opacity: 0.4; }
      .tt2p-settings-date { opacity: 0.6; font-size: 10px; white-space: nowrap; text-align: right; }
      .tt2p-col-date { opacity: 0.6; font-size: 10px; white-space: nowrap; text-align: right; }
      #tt2p-purge-btn {
        width: 100%;
        margin-top: 12px;
        padding: 6px;
        background: rgba(207, 62, 62, 0.15);
        border: 1px solid rgba(207, 62, 62, 0.5);
        color: #e05c5c;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
      }
      #tt2p-purge-btn:hover { background: rgba(207, 62, 62, 0.3); }

      .tt2p-settings-row {
        display: flex;
        flex-direction: column;
        gap: 6px;
        font-size: 12px;
      }
      .tt2p-settings-row input {
        width: 60px;
        background: #101010;
        border: 1px solid rgba(255,255,255,0.25);
        color: #eaeaea;
        border-radius: 4px;
        padding: 4px 6px;
      }
      .tt2p-settings-row button {
        background: rgba(62, 207, 92, 0.15);
        border: 1px solid rgba(62, 207, 92, 0.5);
        color: #7fe89b;
        border-radius: 4px;
        padding: 4px 8px;
        cursor: pointer;
        font-weight: bold;
      }
      .tt2p-settings-row button:hover { background: rgba(62, 207, 92, 0.3); }
      .tt2p-settings-checkbox-label {
        display: flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
        font-size: 12px;
      }

      /* Sort toggle pill row */
      #tt2p-sort-toggle-row {
        display: flex;
        align-items: center;
        gap: 10px;
        margin: 10px 0;
        padding: 8px 12px;
        border-radius: 4px;
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.12);
        font-family: Arial, sans-serif;
        font-size: 12px;
        color: #eaeaea;
      }
      .tt2p-toggle-label { font-weight: bold; opacity: 0.9; }

      #tt2p-star-legend {
        margin: -4px 0 10px;
        padding: 6px 12px;
        border-radius: 4px;
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.1);
        font-family: Arial, sans-serif;
        font-size: 11px;
        color: #cfcfcf;
        display: flex;
        flex-wrap: wrap;
        gap: 2px 16px;
      }
      .tt2p-legend-row { white-space: nowrap; }

      .tt2p-slot-relative { position: relative !important; }
      .tt2p-star-badge {
        position: absolute;
        top: 2px;
        left: 20px;
        font-size: 11px;
        line-height: 1;
        z-index: 6;
        pointer-events: none;
        text-shadow: 0 1px 2px rgba(0,0,0,0.7);
      }

      .tt2p-pill {
        position: relative;
        width: 40px;
        height: 20px;
        border-radius: 10px;
        border: none;
        cursor: pointer;
        padding: 0;
        transition: background 0.2s ease;
      }
      .tt2p-pill-on { background: #3ecf5c; }
      .tt2p-pill-off { background: #555; }
      .tt2p-pill .tt2p-pill-knob {
        position: absolute;
        top: 2px;
        left: 2px;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #fff;
        transition: left 0.2s ease;
      }
      .tt2p-pill-on .tt2p-pill-knob { left: 22px; }
      #tt2p-toggle-state-label { opacity: 0.8; font-size: 11px; }
    `;
    document.head.appendChild(style);
  }

  /* ============================================================================
   * Grabbing CPR values for each members role
   * ============================================================================ */
  function findOcCards() {
    return Array.from(document.querySelectorAll("[data-oc-id]"));
  }

  function normalizeLookup(map, roleName) {
    if (map[roleName] !== undefined) return map[roleName];
    const base = roleName.replace(/\s*#\d+$/, "").trim();
    if (map[base] !== undefined) return map[base];
    return undefined;
  }

  // Reads the "X/10" difficulty chip live from the DOM rather than hardcoding
  // a crime->tier map — more robust if Torn adds/moves crimes between tiers.
  function readDifficulty(cardEl) {
    const valEl = cardEl.querySelector('span[class*="levelValue__"]');
    if (!valEl) return null;
    const v = parseInt(valEl.textContent.trim(), 10);
    return Number.isNaN(v) ? null : v;
  }

  // Reads the scenario's own overall countdown (DD:HH:MM:SS, the big digital
  // clock on the card thumbnail) — a completely separate deadline from our
  // computed "time until stall": this is when the OC listing itself expires
  // if nobody organizes it in time. Used to tiebreak between same-tier
  // vacant OCs — "pick the one expiring soonest" — since a fresh OC has no
  // planning-queue data to rank by otherwise.
  function readOverallCountdownHours(cardEl) {
    const el = cardEl.querySelector('div[class*="phase__"] span[aria-hidden="true"]');
    if (!el) return null;
    const parts = el.textContent.trim().split(":").map((n) => parseInt(n, 10));
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return null;
    const [d, h, m, s] = parts;
    return d * 24 + h + m / 60 + s / 3600;
  }

  // Classifies an occupied role's planning state using the conic-gradient
  // "planning clock" icon when present, PLUS session history when it's not:
  //   'idle'        -> live clock present, at 0% — parked, hasn't started.
  //   'in_progress' -> live clock present, 0% < x < 100%.
  //   'complete'    -> live clock hit 100%, OR no live clock now but we HAVE
  //                     seen one for this role earlier this session (it was
  //                     ticking, and has since finished).
  //   'blocked'     -> no live clock now, and we've NEVER seen one for this
  //                     role this session — Torn renders this with the exact
  //                     same static icon as a genuinely-complete role, so
  //                     this is a best-effort inference, not a certainty.
  //                     Most commonly means the occupant is missing a
  //                     required item and can't even begin.
  function classifyOccupantPlanning(headerEl, historyKey) {
    const planningEl = headerEl.querySelector('[class*="planning__"]');
    if (planningEl) {
      slotProgressHistory[historyKey] = true;
      const style = planningEl.getAttribute("style") || "";
      const match = style.match(/([\d.]+)deg/);
      const deg = match ? parseFloat(match[1]) : NaN;
      if (Number.isNaN(deg)) return { pct: 0, state: "idle" };
      const pct = Math.min(100, Math.max(0, (deg / 360) * 100));
      if (pct <= 0.01) return { pct, state: "idle" };
      if (pct >= 99.99) return { pct: 100, state: "complete" };
      return { pct, state: "in_progress" };
    }
    if (slotProgressHistory[historyKey]) {
      return { pct: 100, state: "complete" };
    }
    return { pct: 0, state: "blocked" };
  }

  // Torn's own pause/active indicator for the whole card — a true, hard
  // stall as opposed to a merely-crowded-but-still-active card.
  function isCardStalled(cardEl) {
    const iconEl = cardEl.querySelector('[class*="iconContainer__"]');
    if (!iconEl) return false;
    return (iconEl.getAttribute("aria-label") || "").toLowerCase() === "paused";
  }

  // Estimates a queue timeline across occupied-but-not-complete roles, using
  // DOM display order as a stand-in for join order (Torn doesn't expose real
  // join timestamps, so this is an approximation, not a guarantee). Each
  // role takes 24h once it actually starts. 'blocked' roles are excluded —
  // we don't know if/when they'll ever resolve, so they'd corrupt the
  // estimate rather than improve it. Returns the total hours until a
  // hypothetical brand-new joiner would actually start planning, and
  // annotates each relevant slot in-place with .timelineStartsInHours /
  // .timelineRemainingHours.
  function computeTimeline(slots) {
    let cumulative = 0;
    slots.forEach((slot) => {
      if (!slot.hasOccupant || slot.planningState === "complete" || slot.planningState === "blocked") return;
      if (slot.planningState === "in_progress") {
        const remaining = 24 * (1 - (slot.planningPct || 0) / 100);
        slot.timelineStartsInHours = 0;
        slot.timelineRemainingHours = remaining;
        cumulative += remaining;
      } else if (slot.planningState === "idle") {
        slot.timelineStartsInHours = cumulative;
        slot.timelineRemainingHours = 24;
        cumulative += 24;
      }
    });
    return cumulative;
  }

  function readCard(cardEl) {
    const titleEl = cardEl.querySelector('p[class*="panelTitle__"]');
    const crimeName = titleEl ? titleEl.textContent.trim() : null;
    if (!crimeName) return null;

    const reqMap = CPR_REQUIREMENTS[crimeName];
    const tracked = !!reqMap;
    const weightMap = ROLE_WEIGHTS[crimeName];
    const difficulty = readDifficulty(cardEl);
    const stalled = isCardStalled(cardEl);
    const crimeId = cardEl.getAttribute("data-oc-id") || crimeName;

    const slotHeaders = Array.from(cardEl.querySelectorAll('button[class*="slotHeader__"]'));
    let occupiedCount = 0;
    let idleCount = 0;
    let blockedCount = 0;
    const slots = slotHeaders.map((headerEl) => {
      const roleNameEl = headerEl.querySelector('span[class*="title__"]');
      const chanceEl = headerEl.querySelector('div[class*="successChance__"]');
      const roleName = roleNameEl ? roleNameEl.textContent.trim() : null;
      const chance = chanceEl ? parseInt(chanceEl.textContent.trim(), 10) : null;
      const wrapperEl = headerEl.parentElement;
      const joinBtnEl = wrapperEl ? wrapperEl.querySelector('button[class*="joinButton__"]') : null;
      const isOpen = !!joinBtnEl;
      const hasOccupant = !isOpen && !!wrapperEl?.querySelector('[class*="badgeContainer__"]');

      let planningPct = null;
      let planningState = null;
      if (hasOccupant) {
        const historyKey = `${crimeId}:${roleName}`;
        const classified = classifyOccupantPlanning(headerEl, historyKey);
        planningPct = classified.pct;
        planningState = classified.state;
        occupiedCount++;
        if (planningState === "idle") idleCount++;
        if (planningState === "blocked") blockedCount++;
      }

      let requirement, qualifies;
      if (tracked && roleName) {
        requirement = normalizeLookup(reqMap, roleName);
        if (requirement !== undefined && chance !== null) {
          qualifies = chance >= requirement - LENIENCY;
        }
      }

      let weight;
      if (weightMap && roleName) {
        weight = normalizeLookup(weightMap, roleName);
      }

      return {
        roleName, chance, isOpen, hasOccupant, planningPct, planningState,
        wrapperEl, joinBtnEl, requirement, qualifies, weight,
      };
    });

    const totalSlots = slots.length;
    const openCount = totalSlots - occupiedCount;
    const crowded = idleCount >= CROWDING_IDLE_THRESHOLD && openCount > 0;
    const nextJoinerWaitHours = computeTimeline(slots);

    // Star ranking: among OPEN roles this member actually qualifies for
    // (CPR meets requirement), rank by role-impact weight descending and
    // mark the top 3 gold/silver/bronze. Untracked crimes have no defined
    // "qualifies" concept, so no stars there.
    if (tracked) {
      const openQualifying = slots.filter((s) => s.isOpen && s.qualifies === true && s.weight !== undefined);
      openQualifying.sort((a, b) => (b.weight || 0) - (a.weight || 0));
      openQualifying.slice(0, 3).forEach((s, i) => {
        s.starRank = i;
      });
    }

    return {
      crimeName, tracked, difficulty, stalled, slots, blockedCount,
      occupiedCount, idleCount, totalSlots, crowded, nextJoinerWaitHours,
      overallCountdownHours: readOverallCountdownHours(cardEl),
    };
  }

  const STAR_ICONS = ["\u{1F947}", "\u{1F948}", "\u{1F949}"];
  const STAR_LABELS = ["Best", "2nd best", "3rd best"];

  // Small gold/silver/bronze badge placed right before the role name, for
  // the top 3 open roles (by weight) this member actually qualifies for.
  // Re-evaluated every pass since qualification/weight context can shift as
  // other members join or leave roles.
  // Placed as an absolutely-positioned OVERLAY on the slot's outer wrapper
  // div — deliberately NOT inserted into the slotHeader <button> itself.
  // That button is the exact element Torn uses to open its own native
  // action menu (View Profile / Remove from Role), and modifying its
  // children risks React re-rendering it and closing that menu out from
  // under the member. pointer-events:none means the badge never intercepts
  // clicks/hover meant for the button beneath it either.
  function upsertStarBadge(slot) {
    if (!slot.wrapperEl) return;
    slot.wrapperEl.classList.add("tt2p-slot-relative");
    let badge = slot.wrapperEl.querySelector(":scope > .tt2p-star-badge");

    if (slot.starRank === undefined) {
      if (badge) badge.remove();
      return;
    }
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "tt2p-star-badge";
      slot.wrapperEl.appendChild(badge);
    }
    badge.textContent = STAR_ICONS[slot.starRank] || "";
    badge.title = `${STAR_LABELS[slot.starRank]} choice for you \u2014 based on your CPR and this role's impact on success chance`;
  }

  function ensureStarLegend(container) {
    if (!container) return;
    let legend = document.getElementById("tt2p-star-legend");
    if (!legend) {
      legend = document.createElement("div");
      legend.id = "tt2p-star-legend";
      legend.innerHTML = `
        <div class="tt2p-legend-row">\u{1F947} Best role for you \u2014 highest impact you qualify for</div>
        <div class="tt2p-legend-row">\u{1F948} 2nd best choice</div>
        <div class="tt2p-legend-row">\u{1F949} 3rd best choice</div>
      `;
    }
    const toggleRow = document.getElementById("tt2p-sort-toggle-row");
    if (toggleRow) {
      if (toggleRow.nextSibling !== legend) {
        toggleRow.parentElement.insertBefore(legend, toggleRow.nextSibling);
      }
    } else if (legend.parentElement !== container) {
      container.insertBefore(legend, container.firstChild);
    }
  }

  function injectWeightBox(slot) {
    if (!slot.wrapperEl || slot.weight === undefined) return;
    if (slot.wrapperEl.querySelector(".tt2p-weight-box")) return;
    const box = document.createElement("div");
    box.className = "tt2p-weight-box";
    box.innerHTML = `<span class="tt2p-weight-label">Weight</span><span class="tt2p-weight-value">${slot.weight.toFixed(1)}%</span>`;
    slot.wrapperEl.appendChild(box);
  }

  // Measures the ACTUAL rendered width of each role box and the gap between
  // them, live, rather than hardcoding a pixel value — self-corrects if Torn
  // changes their layout, adjusts to different viewport/zoom sizes, and
  // needs no manual number from anyone. Uses the median gap across all
  // adjacent pairs (not just the first) so one anomalous reading doesn't
  // throw off the whole row, and rounds to whole pixels to avoid subpixel
  // drift between passes.
  function measureRoleLayout(slots) {
    const rects = slots.map((s) => (s.wrapperEl ? s.wrapperEl.getBoundingClientRect() : null));
    const knownWidths = rects.filter((r) => r && r.width > 0).map((r) => r.width);
    const avgWidth = knownWidths.length ? knownWidths.reduce((a, b) => a + b, 0) / knownWidths.length : 100;
    const widths = rects.map((r) => Math.round(r && r.width > 0 ? r.width : avgWidth));

    const gaps = [];
    for (let i = 0; i < rects.length - 1; i++) {
      if (rects[i] && rects[i + 1]) {
        const g = rects[i + 1].left - rects[i].right;
        if (g >= 0) gaps.push(g);
      }
    }
    let gap = 8;
    if (gaps.length) {
      gaps.sort((a, b) => a - b);
      gap = Math.round(gaps[Math.floor(gaps.length / 2)]);
    }
    return { widths, gap };
  }

  // Single-row "OC Timeline" strip, inserted BETWEEN the description and the
  // roles grid (not below everything) — one segment per role, using the same
  // flex layout as Torn's own roles row so each segment lines up above its
  // matching role box. Green/complete, blue/active (filled to actual %),
  // grey/idle ("Starts in Xh"), orange-red/idle + past the crowding
  // threshold, dim/"Open" for genuinely unclaimed roles.
  function renderTimelineStrip(cardEl, info) {
    const rolesContainer = info.slots[0]?.wrapperEl?.parentElement || null;
    if (!rolesContainer || !rolesContainer.parentElement) return;

    let strip = cardEl.querySelector(".tt2p-timeline-strip");
    if (!strip) {
      strip = document.createElement("div");
      strip.className = "tt2p-timeline-strip";
    }
    // Keep it pinned as the sibling immediately BEFORE the roles row, even
    // after a Torn re-render.
    if (strip.nextElementSibling !== rolesContainer) {
      rolesContainer.parentElement.insertBefore(strip, rolesContainer);
    }

    // Torn's roles row has its own internal left padding before the first
    // role box starts — measure it live so our strip lines up with it
    // exactly, instead of guessing a fixed indent.
    const rolesRect = rolesContainer.getBoundingClientRect();
    const firstSlotRect = info.slots[0]?.wrapperEl?.getBoundingClientRect();
    const leftOffset = firstSlotRect ? Math.max(0, Math.round(firstSlotRect.left - rolesRect.left)) : 0;

    const occupied = info.slots.filter((s) => s.hasOccupant);
    const completeCount = occupied.filter((s) => s.planningState === "complete").length;
    const activePlanner = occupied.find((s) => s.planningState === "in_progress");

    const crimeId = cardEl.getAttribute("data-oc-id") || "";
    const lvlText = info.difficulty !== null ? `Lv. ${info.difficulty}` : "";
    const idLvlName = `${crimeId ? `#${escapeHtml(crimeId)}  |  ` : ""}${lvlText ? `${lvlText}  ` : ""}${escapeHtml(info.crimeName)}`;

    let detailsStr = "";
    if (activePlanner) {
      detailsStr += `  \u2014  Currently Planning: ${escapeHtml(activePlanner.roleName)}  \u2014  Completed ${(activePlanner.planningPct || 0).toFixed(0)}%, ${formatHM(activePlanner.timelineRemainingHours || 0)} remaining until next role.`;
    }
    const trailingParts = [`${completeCount}/${info.totalSlots} Roles Complete`];
    if (info.idleCount > 0) {
      trailingParts.push(`Next member needed in ~${formatDuration(info.nextJoinerWaitHours || 0)}`);
    }
    if (info.blockedCount > 0) {
      trailingParts.push(`\u26A0\uFE0F ${info.blockedCount} possibly blocked (missing item?)`);
    }
    detailsStr += `  |  ${trailingParts.join("  |  ")}`;

    // Time-until-stall row: reuses the same queue math as "next member
    // needed" when there's still an open/unclaimed slot (once the queue
    // reaches that empty slot with nobody there, it stalls). If every slot
    // is already occupied, there's no open-slot stall risk to project from
    // current data.
    let stallRowHtml;
    if (info.stalled) {
      stallRowHtml = `<div class="tt2p-tl-stall-row tt2p-tl-stall-warn" style="padding-left:${leftOffset}px;">\u23F3 Time until stall: <b>${formatHMS(0)}</b> \u2014 Already stalled, needs action now.</div>`;
    } else if (info.occupiedCount === 0) {
      stallRowHtml = `<div class="tt2p-tl-stall-row tt2p-tl-stall-uninitiated" style="padding-left:${leftOffset}px;">\u{1F550} Uninitiated OC: waiting for 1 member to join to begin planning. If this is near the top, there's no other options, or your looking to spread out--> start it up.</div>`;
    } else if (info.totalSlots - info.occupiedCount > 0) {
      const hoursLeft = info.nextJoinerWaitHours || 0;
      const isThreat = hoursLeft < NEAR_STALL_THRESHOLD_HOURS;
      const verdict = isThreat
        ? "\u26A0\uFE0F Threat \u2014 sub-24h, if you qualify consider joining"
        : "Minimum stall threat, \u2014 consider joining/starting another OC";
      stallRowHtml = `<div class="tt2p-tl-stall-row${isThreat ? " tt2p-tl-stall-warn" : ""}" style="padding-left:${leftOffset}px;">\u23F3 Time until stall: <b>${formatHMS(hoursLeft)}</b> \u2014 ${verdict}</div>`;
    } else {
      stallRowHtml = `<div class="tt2p-tl-stall-row tt2p-tl-stall-ok" style="padding-left:${leftOffset}px;">\u2705 Fully staffed \u2014 no stall risk from open roles right now.</div>`;
    }

    let barsHtml = "";
    const { widths, gap } = measureRoleLayout(info.slots);
    const lastIdx = info.slots.length - 1;

    info.slots.forEach((slot, idx) => {
      let segClass = "tt2p-tl-seg-open";
      let label = "Open";
      let fillPct = 0;

      if (slot.hasOccupant) {
        if (slot.planningState === "complete") {
          segClass = "tt2p-tl-seg-complete";
          label = "Complete";
          fillPct = 100;
        } else if (slot.planningState === "in_progress") {
          segClass = "tt2p-tl-seg-active";
          fillPct = slot.planningPct || 0;
          label = `${fillPct.toFixed(0)}%`;
        } else if (slot.planningState === "blocked") {
          segClass = "tt2p-tl-seg-blocked";
          label = "Blocked?";
        } else {
          segClass = slot.crowdWarning ? "tt2p-tl-seg-idle-warn" : "tt2p-tl-seg-idle";
          label = `Starts in ${formatDuration(slot.timelineStartsInHours || 0)}`;
        }
      }

      let posClass = "";
      if (info.slots.length === 1) posClass = " tt2p-tl-seg-only";
      else if (idx === 0) posClass = " tt2p-tl-seg-first";
      else if (idx === lastIdx) posClass = " tt2p-tl-seg-last";

      const w = widths[idx];
      barsHtml += `<div class="tt2p-tl-seg ${segClass}${posClass}" style="flex:0 0 ${w}px;width:${w}px;"><div class="tt2p-tl-seg-fill" style="width:${fillPct}%"></div><span class="tt2p-tl-seg-label">${label}</span></div>`;
    });

    strip.innerHTML = `
      <div class="tt2p-tl-strip-header" style="padding-left:${leftOffset}px;">
        <span class="tt2p-tl-strip-title">\u{1F551} ${idLvlName}</span><span class="tt2p-tl-strip-details${info.crowded ? " tt2p-summary-warn" : ""}">${detailsStr}</span>
      </div>
      ${stallRowHtml}
      <div class="tt2p-tl-strip-bars" style="gap:${gap}px;padding-left:${leftOffset}px;">${barsHtml}</div>
    `;
  }

  // Two distinct visual cues, shown at most one at a time (stalled wins if
  // somehow both are true, since that's the more urgent case):
  //   - stalled  -> Torn's own "paused" indicator, the whole OC is frozen.
  //   - crowded  -> still actively ticking, but too many people are parked
  //                 at 0% waiting for their turn to plan.
  function updateStatusBadge(cardEl, info) {
    let badge = cardEl.querySelector(".tt2p-status-badge");
    let text = null;
    let variant = null;

    if (info.stalled) {
      text = "\u{1F534} STALLED \u2014 needs someone to pick up planning";
      variant = "stalled";
    } else if (info.crowded) {
      text = `\u{1F6A6} Busy \u2014 ${info.idleCount} member${info.idleCount === 1 ? "" : "s"} waiting to start planning. Msg the last 1-2 ppl (furthest right) to move or start up new oc if you see em online \u{1F6A6}`;
      variant = "crowded";
    }

    if (!text) {
      if (badge) badge.remove();
      return;
    }

    if (!badge) {
      const anchor = cardEl.querySelector('p[class*="panelTitle__"]')?.parentElement;
      if (!anchor) return;
      badge = document.createElement("div");
      badge.className = "tt2p-status-badge";
      anchor.appendChild(badge);
    }
    badge.textContent = text;
    badge.classList.toggle("tt2p-status-stalled", variant === "stalled");
    badge.classList.toggle("tt2p-status-crowded", variant === "crowded");
  }

  /* ============================================================================
   * Main pass
   * ============================================================================ */
  let isMutatingSelf = false;
  // Captures the page's own native order the first time we ever see it, so
  // "dynamic sort OFF" can restore a true vanilla view instead of just
  // freezing whatever order we'd already rearranged things into.
  let originalCardOrder = null;

  // If the member currently has one of Torn's own native dropdown/action
  // menus open (View Profile / Remove from Role / etc — Torn tracks this via
  // data-is-tooltip-opened="true" on the triggering element), we skip the
  // ENTIRE pass. Any DOM write we make anywhere on the page — even
  // completely unrelated to the open menu — risks Torn's React re-rendering
  // that subtree and silently closing it out from under the member mid-click.
  function nativeMenuIsOpen() {
    return !!document.querySelector('[data-is-tooltip-opened="true"]');
  }

  function runPass() {
    if (document.hidden) return;
    if (isMutatingSelf) return;
    if (nativeMenuIsOpen()) return;

    const cards = findOcCards();
    if (cards.length === 0) return;

    if (originalCardOrder === null) {
      originalCardOrder = cards.map((c) => c.dataset.ocId);
    }

    const container = cards[0].parentElement;
    ensureSortTogglePill(container);
    ensureStarLegend(container);

    // Always keep CPR capture + weight boxes + tooltips running (informational
    // only, doesn't touch layout/order), even with dynamic sort switched off.
    const store = loadStore();
    let storeDirty = false;
    const toastMessages = [];

    const cardInfos = [];

    cards.forEach((cardEl) => {
      const info = readCard(cardEl);
      if (!info) return;
      cardInfos.push({ cardEl, info });

      let cardQualifies = false;

      info.slots.forEach((slot) => {
        if (!slot.roleName) return;

        if (slot.isOpen && slot.chance !== null && !Number.isNaN(slot.chance)) {
          const result = recordCpr(store, info.crimeName, slot.roleName, slot.chance);
          if (result.changed) {
            storeDirty = true;
            const prevText = result.previous === null ? "new" : `${result.previous} \u2192`;
            toastMessages.push(`${info.crimeName} \u2014 ${slot.roleName}: ${prevText} ${slot.chance}`);
          }
        }

        attachTooltip(slot, info.crimeName, info.tracked);
        injectWeightBox(slot);
        upsertStarBadge(slot);

        if (slot.hasOccupant) {
          slot.crowdWarning = slot.planningState === "idle" && info.crowded;
        }

        if (dynamicSortEnabled && info.tracked && slot.wrapperEl) {
          slot.wrapperEl.classList.remove("tt2p-role-good", "tt2p-role-bad");
          if (slot.qualifies === true) {
            slot.wrapperEl.classList.add("tt2p-role-good");
            if (slot.isOpen) cardQualifies = true;
          } else if (slot.qualifies === false) {
            slot.wrapperEl.classList.add("tt2p-role-bad");
            if (slot.isOpen && slot.joinBtnEl) {
              slot.joinBtnEl.classList.add("tt2p-join-disabled");
            }
          }
        } else if (!dynamicSortEnabled && slot.wrapperEl) {
          slot.wrapperEl.classList.remove("tt2p-role-good", "tt2p-role-bad");
          if (slot.joinBtnEl) slot.joinBtnEl.classList.remove("tt2p-join-disabled");
        }
      });

      if (cardQualifies) cardEl.dataset.tt2pQualifies = "1";
      else delete cardEl.dataset.tt2pQualifies;

      cardEl.dataset.tt2pIdle = String(info.idleCount);
      cardEl.dataset.tt2pOccupied = String(info.occupiedCount);
      cardEl.dataset.tt2pStalled = info.stalled ? "1" : "0";
      updateStatusBadge(cardEl, info);
      renderTimelineStrip(cardEl, info);
    });

    if (storeDirty) {
      saveStore(store);
      toastMessages.forEach(showToast);
      const panel = document.getElementById("tt2p-settings-panel");
      if (panel && panel.classList.contains("tt2p-open")) renderSettingsPanel();
    }

    if (!dynamicSortEnabled) {
      restoreOriginalOrder(container, cards);
      cards.forEach((c) => {
        c.classList.remove("tt2p-not-qualified-card");
        const badge = c.querySelector(".tt2p-status-badge");
        if (badge) badge.remove();
      });
      const divider = document.getElementById(NOT_QUALIFIED_HEADER_ID);
      if (divider) divider.remove();
      return;
    }

    const visibleQualified = [];
    const visibleNotQualified = [];
    const cardInfoByEl = new Map(cardInfos.map(({ cardEl, info }) => [cardEl, info]));

    cardInfos.forEach(({ cardEl, info }) => {
      // Crimes the faction never runs (e.g. Manifest Cruelty) are hidden by
      // default — "out of sight, out of mind" — unless the member has
      // switched on "Show hidden OCs" in the gear panel.
      if (HIDDEN_CRIMES_BY_DEFAULT.includes(info.crimeName) && !showHiddenOcs) {
        cardEl.style.display = "none";
        return;
      }

      // Hard faction policy: members capped below this crime's difficulty
      // don't see it at all (not even in the "not qualified" bucket).
      if (info.difficulty !== null && info.difficulty > maxDifficultyLevel) {
        cardEl.style.display = "none";
        return;
      }
      cardEl.style.display = "";

      const qualifies = cardEl.dataset.tt2pQualifies === "1";
      if (info.tracked && qualifies) {
        visibleQualified.push(cardEl);
        cardEl.classList.remove("tt2p-not-qualified-card");
      } else {
        visibleNotQualified.push(cardEl);
        cardEl.classList.add("tt2p-not-qualified-card");
      }
    });

    // Priority order among OCs you qualify for, modeled on the member
    // decision tree. Two modes:
    //
    // NORMAL member: urgency-first across everything —
    //   0: Stalled, 1: Near-stall-urgent, 2: Vacant, 3: Everything else.
    //
    // LEVEL-9-CAPABLE member (their stored CPR history clears a Level 9
    // role's requirement, checked via computeLevel9Capable() below): the
    // decision tree says they should exhaust Level 9 options FIRST — stalled,
    // then urgent, then vacant — before dropping down to Break the Bank
    // (their explicit named fallback) and repeating the same three checks
    // there, and only THEN falling into the general pool everyone else uses:
    //   0: Level 9 stalled       3: Break the Bank stalled
    //   1: Level 9 near-stall    4: Break the Bank near-stall
    //   2: Level 9 vacant        5: Break the Bank vacant
    //   6: Everything else (general urgency-first pool, same as normal mode)
    //
    // Within any bucket, and always within bucket 6, difficulty (then crime
    // importance, then the bucket-specific tiebreak) still applies — see
    // urgencySubRank()/crimeImportanceIndex() below.
    // NOTE: this still doesn't check what OC the member is ALREADY
    // committed to elsewhere on the page — that's the one remaining piece
    // of the decision tree we haven't built.
    const level9Capable = computeLevel9Capable();

    function urgencySubRank(info) {
      const openCount = info.totalSlots - info.occupiedCount;
      if (info.stalled) return 0;
      if (info.occupiedCount > 0 && openCount > 0 && (info.nextJoinerWaitHours ?? Infinity) < NEAR_STALL_THRESHOLD_HOURS) return 1;
      if (info.occupiedCount === 0) return 2;
      return 3;
    }

    function primaryBucketRank(info) {
      const sub = urgencySubRank(info);
      if (!level9Capable) return sub;
      if (LEVEL9_CRIMES.includes(info.crimeName) && sub <= 2) return sub;
      if (info.crimeName === "Break the Bank" && sub <= 2) return 3 + sub;
      return 6;
    }

    visibleQualified.sort((a, b) => {
      const infoA = cardInfoByEl.get(a);
      const infoB = cardInfoByEl.get(b);

      const pa = primaryBucketRank(infoA);
      const pb = primaryBucketRank(infoB);
      if (pa !== pb) return pa - pb;

      const ua = urgencySubRank(infoA);
      const ub = urgencySubRank(infoB);
      if (ua !== ub) return ua - ub;

      const da = infoA.difficulty ?? -1;
      const db = infoB.difficulty ?? -1;
      if (db !== da) return db - da;

      const cia = crimeImportanceIndex(infoA.crimeName);
      const cib = crimeImportanceIndex(infoB.crimeName);
      if (cia !== cib) return cia - cib;

      if (ua === 1) {
        return (infoA.nextJoinerWaitHours ?? Infinity) - (infoB.nextJoinerWaitHours ?? Infinity);
      }
      if (ua === 2) {
        return (infoA.overallCountdownHours ?? Infinity) - (infoB.overallCountdownHours ?? Infinity);
      }
      if (infoA.idleCount !== infoB.idleCount) return infoA.idleCount - infoB.idleCount;
      return infoA.occupiedCount - infoB.occupiedCount;
    });

    // Aspirational ordering for the "not qualified" bucket too — hardest
    // tier first, so the OCs worth working toward show up before ones that
    // barely register.
    visibleNotQualified.sort((a, b) => (readDifficulty(b) ?? -1) - (readDifficulty(a) ?? -1));

    // Special-case the #1 recommendation: if it's a completely fresh OC
    // (nobody's joined at all), swap its stall-row message for one that
    // explains why it's on top and points at the star ratings.
    const topCardInfo = visibleQualified.length ? cardInfoByEl.get(visibleQualified[0]) : null;
    if (topCardInfo && topCardInfo.occupiedCount === 0) {
      const topStallRow = visibleQualified[0].querySelector(".tt2p-tl-stall-row");
      if (topStallRow) {
        topStallRow.className = "tt2p-tl-stall-row tt2p-tl-stall-top-pick";
        topStallRow.innerHTML = `\u2B50 This OC is your top recommendation \u2014 nobody's started it yet. Please pick your highest-impact role (see the star ratings below).`;
      }
    }

    reorderCards(visibleQualified, visibleNotQualified);
  }

  function restoreOriginalOrder(container, currentCards) {
    if (!originalCardOrder) return;

    const currentIds = currentCards.map((c) => c.dataset.ocId);
    const alreadyInOrder =
      currentIds.length === originalCardOrder.length &&
      currentIds.every((id, i) => id === originalCardOrder[i]);
    const allVisible = currentCards.every((c) => c.style.display !== "none");

    if (alreadyInOrder && allVisible) return;

    isMutatingSelf = true;
    const byId = new Map(currentCards.map((c) => [c.dataset.ocId, c]));
    originalCardOrder.forEach((id) => {
      const el = byId.get(id);
      if (el) container.appendChild(el);
    });
    currentCards.forEach((c) => {
      c.style.display = "";
    });
    requestAnimationFrame(() => {
      isMutatingSelf = false;
    });
  }

  function reorderCards(qualifiedCards, notQualifiedCards) {
    if (qualifiedCards.length === 0 && notQualifiedCards.length === 0) return;
    const anyCard = qualifiedCards[0] || notQualifiedCards[0];
    const container = anyCard.parentElement;
    if (!container) return;

    let divider = document.getElementById(NOT_QUALIFIED_HEADER_ID);
    const needDivider = notQualifiedCards.length > 0;

    // Only move DOM nodes when the resulting order would actually differ.
    // appendChild() on an already-attached element still detaches/reattaches
    // it even if it ends up in the same spot — and that's enough to close
    // any native dropdown/menu the member has open inside that card. Most
    // passes don't actually change anything, so this skips the DOM entirely
    // most of the time.
    const desiredIds = qualifiedCards.map((c) => c.dataset.ocId);
    if (needDivider) desiredIds.push("__DIVIDER__");
    desiredIds.push(...notQualifiedCards.map((c) => c.dataset.ocId));

    const currentRelevant = Array.from(container.children).filter(
      (el) => el.hasAttribute("data-oc-id") || el.id === NOT_QUALIFIED_HEADER_ID
    );
    const currentIds = currentRelevant.map((el) =>
      el.id === NOT_QUALIFIED_HEADER_ID ? "__DIVIDER__" : el.dataset.ocId
    );

    const alreadyInOrder =
      currentIds.length === desiredIds.length && currentIds.every((id, i) => id === desiredIds[i]);

    if (alreadyInOrder) {
      if (!needDivider && divider) divider.remove();
      return;
    }

    isMutatingSelf = true;

    qualifiedCards.forEach((el) => container.appendChild(el));

    if (needDivider) {
      if (!divider) {
        divider = document.createElement("div");
        divider.id = NOT_QUALIFIED_HEADER_ID;
        divider.textContent = "\u26A0\uFE0F OCs Not Yet Qualified For";
      }
      container.appendChild(divider);
      notQualifiedCards.forEach((el) => container.appendChild(el));
    } else if (divider) {
      divider.remove();
    }

    requestAnimationFrame(() => {
      isMutatingSelf = false;
    });
  }

  /* ============================================================================
   * Observer setup
   * ============================================================================ */
  function debounce(fn, ms) {
    let t = null;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  function setupObserver(root) {
    const debouncedPass = debounce(runPass, SCAN_DEBOUNCE_MS);

    const observer = new MutationObserver(() => {
      if (isMutatingSelf) return;
      debouncedPass();
    });

    observer.observe(root, { childList: true, subtree: true });

    debouncedPass();

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) debouncedPass();
    });
  }

  function waitForRoot(selector, cb, timeoutMs = 15000) {
    const existing = document.querySelector(selector);
    if (existing) return cb(existing);
    const start = Date.now();
    const interval = setInterval(() => {
      const el = document.querySelector(selector);
      if (el) {
        clearInterval(interval);
        cb(el);
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(interval);
      }
    }, 300);
  }

  /* ============================================================================
   * Init
   * ============================================================================ */
  injectStyles();
  ensureGearUi();
  waitForRoot("#faction-crimes-root", (root) => {
    setupObserver(root);
  });
})();
