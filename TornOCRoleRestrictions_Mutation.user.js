// ==UserScript==
// @name         Torn OC Role Restrictions (Mutation Specific)
// @namespace    https://xentac.github.io
// @version      0.5
// @description  Highlight role restrictions and best roles in OC 2.0 (modified copy of "Torn OC Role Evaluator"). Well paired with https://greasyfork.org/en/scripts/526834-oc-success-chance-2-0.
// @author       underko[3362751], xentac[3354782]
// @match        https://www.torn.com/factions.php*
// @grant        GM_xmlhttpRequest
// @connect      raw.githubusercontent.com
// @license      MIT

// ==/UserScript==

(function () {
  "use strict";

  let ocRoleInfluence = {
    "Pet Project": [
      { role: "Kidnapper", influence: 41.14, lower: 70 },
      { role: "Muscle", influence: 26.83, lower: 70 },
      { role: "Picklock", influence: 32.03, lower: 70 },
    ],
    "Mob Mentality": [
      { role: "Looter #1", influence: 34.83, lower: 70 },
      { role: "Looter #2", influence: 25.97, lower: 70 },
      { role: "Looter #3", influence: 19.87, lower: 60 },
      { role: "Looter #4", influence: 19.33, lower: 67 },
    ],
    "Cash Me if You Can": [
      { role: "Thief #1", influence: 46.67, lower: 70 },
      { role: "Thief #2", influence: 21.87, lower: 65 },
      { role: "Lookout", influence: 31.46, lower: 70 },
    ],
    "Best of the Lot": [
      { role: "Picklock", influence: 23.65, lower: 70 },
      { role: "Car Thief", influence: 21.06, lower: 70 },
      { role: "Muscle", influence: 36.43, lower: 75 },
      { role: "Imitator", influence: 18.85, lower: 60 },
    ],
    "Market Forces": [
      { role: "Enforcer", influence: 27.56, lower: 70 },
      { role: "Negotiator", influence: 25.59, lower: 70 },
      { role: "Lookout", influence: 19.05, lower: 68 },
      { role: "Arsonist", influence: 4.12, lower: 40 },
      { role: "Muscle", influence: 23.68, lower: 70 },
    ],
    "Smoke and Wing Mirrors": [
      { role: "Car Thief", influence: 48.2, lower: 74 },
      { role: "Imitator", influence: 26.3, lower: 70 },
      { role: "Hustler #1", influence: 7.7, lower: 60 },
      { role: "Hustler #2", influence: 17.81, lower: 65 },
    ],
    "Gaslight the Way": [
      { role: "Imitator #1", influence: 7.54, lower: 70 },
      { role: "Imitator #2", influence: 34.85, lower: 72 },
      { role: "Imitator #3", influence: 40.25, lower: 72 },
      { role: "Looter #1", influence: 7.54, lower: 60 },
      { role: "Looter #2", influence: 0.0, lower: 40 },
      { role: "Looter #3", influence: 9.83, lower: 65 },
    ],
    "Stage Fright": [
      { role: "Enforcer", influence: 16.89, lower: 70 },
      { role: "Muscle #1", influence: 21.92, lower: 72 },
      { role: "Muscle #2", influence: 2.09, lower: 50 },
      { role: "Muscle #3", influence: 9.49, lower: 70 },
      { role: "Lookout", influence: 7.68, lower: 60 },
      { role: "Sniper", influence: 41.92, lower: 75 },
    ],
    "Snow Blind": [
      { role: "Hustler", influence: 51.4, lower: 74 },
      { role: "Imitator", influence: 30.44, lower: 70 },
      { role: "Muscle #1", influence: 9.08, lower: 70 },
      { role: "Muscle #2", influence: 9.08, lower: 50 },
    ],
    "Leave No Trace": [
      { role: "Techie", influence: 24.4, lower: 60 },
      { role: "Negotiator", influence: 29.07, lower: 70 },
      { role: "Imitator", influence: 46.54, lower: 73 },
    ],
    "No Reserve": [
      { role: "Car Thief", influence: 30.86, lower: 67 },
      { role: "Techie", influence: 37.88, lower: 75 },
      { role: "Engineer", influence: 31.27, lower: 67 },
    ],
    "Counter Offer": [
      { role: "Robber", influence: 33.29, lower: 62 },
      { role: "Looter", influence: 4.69, lower: 42 },
      { role: "Hacker", influence: 16.72, lower: 60 },
      { role: "Picklock", influence: 17.1, lower: 60 },
      { role: "Engineer", influence: 28.21, lower: 62 },
    ],
    "Guardian Ángels": [
      { role: "Enforcer", influence: 24.4, lower: 60 },
      { role: "Hustler", influence: 29.07, lower: 73 },
      { role: "Engineer", influence: 46.54, lower: 70 },
    ],
    "Honey Trap": [
      { role: "Enforcer", influence: 20.21, lower: 60 },
      { role: "Muscle #1", influence: 34.32, lower: 70 },
      { role: "Muscle #2", influence: 45.47, lower: 75 },
    ],
    "Bidding War": [
      { role: "Robber #1", influence: 6.82, lower: 60 },
      { role: "Driver", influence: 21.93, lower: 70 },
      { role: "Robber #2", influence: 19.63, lower: 75 },
      { role: "Robber #3", influence: 25.65, lower: 70 },
      { role: "Bomber #1", influence: 10.96, lower: 70 },
      { role: "Bomber #2", influence: 15.0, lower: 63 },
    ],
    "Blast from the Past": [
      { role: "Picklock #1", influence: 9.81, lower: 70 },
      { role: "Hacker", influence: 6.18, lower: 70 },
      { role: "Engineer", influence: 25.29, lower: 75 },
      { role: "Bomber", influence: 20.4, lower: 75 },
      { role: "Muscle", influence: 36.75, lower: 75 },
      { role: "Picklock #2", influence: 1.56, lower: 15 },
    ],
    "Break the Bank": [
      { role: "Robber", influence: 10.84, lower: 66 },
      { role: "Muscle #1", influence: 10.27, lower: 66 },
      { role: "Muscle #2", influence: 7.78, lower: 66 },
      { role: "Thief #1", influence: 3.55, lower: 62 },
      { role: "Muscle #3", influence: 33.54, lower: 70 },
      { role: "Thief #2", influence: 34.03, lower: 70 },
    ],
    "Stacking the Deck": [
      { role: "Cat Burglar", influence: 31.99, lower: 75 },
      { role: "Driver", influence: 3.86, lower: 68 },
      { role: "Hacker", influence: 25.64, lower: 63 },
      { role: "Imitator", influence: 38.52, lower: 70 },
    ],
    "Clinical Precision": [
      { role: "Imitator", influence: 41.51, lower: 74 },
      { role: "Cat Burglar", influence: 22.21, lower: 72 },
      { role: "Assassin", influence: 14.56, lower: 70 },
      { role: "Cleaner", influence: 21.71, lower: 72 },
    ],
    "Ace in the Hole": [
      { role: "Imitator", influence: 13.73, lower: 65 },
      { role: "Muscle #1", influence: 18.55, lower: 65 },
      { role: "Muscle #2", influence: 18.88, lower: 72 },
      { role: "Hacker", influence: 37.49, lower: 75 },
      { role: "Driver", influence: 11.35, lower: 60 },
    ],
  };

  let crimeData = {};
  let previousTab = "none";

  function classifyOcRoleInfluence(ocName, roleName) {
    const ocInfo = ocRoleInfluence[ocName];
    const roleData = ocInfo?.find((r) => r.role === roleName);
    const lower = roleData ? roleData.lower : 70;
    let upper = lower + 10;

    const roleLowers = ocInfo
      .map((role) => {
        return role.lower;
      })
      .sort();

    // If our role is a low influence role, set the upper bound to the next highest lower bound if upper doesn't already pass it
    if (roleLowers[0] == lower && upper < roleLowers[1]) {
      upper = roleLowers[1];
    }

    return { lower, upper };
  }

  function getFactionId() {
    let factionId = "";
    try {
      document
        .querySelector(".forum-thread")
        .href.split("#")[1]
        .split("&")
        .forEach((elem) => {
          if (elem[0] == "a") {
            factionId = elem.split("=")[1];
          }
        });
    } catch (e) {
      console.log("[OCRoleRestrictions] Couldn't extract faction id:", e);
    }

    return factionId;
  }

  function updateFactionRoleRestrictions(factionId, cb) {
    try {
      GM_xmlhttpRequest({
        method: "GET",
        url: `https://raw.githubusercontent.com/xentac/oc_role_restrictions/refs/heads/main/${factionId}.json`,
        headers: {
          "Content-Type": "application/json",
        },
        onload: async function (response) {
          console.log(response);
          if (response.status != 200) {
            console.error(
              "[OCRoleRestrictions] Bad response fetching faction restrictions:",
              response.status,
            );
            return cb();
          }

          try {
            const result = JSON.parse(response.responseText);
            ocRoleInfluence = result;
          } catch (error) {
            console.error(
              "[OCRoleRestrictions] Failed to parse faction restrictions:",
              error.message,
            );
          }
          return cb();
        },
      });
    } catch (error) {
      console.error(
        "[OCRoleRestrictions] Failed fetching faction restrictions:",
        error.message,
      );
    }
  }

  function processCrime(wrapper) {
    const ocId = wrapper.getAttribute("data-oc-id");
    if (!ocId || crimeData[ocId]) return;

    const titleEl = wrapper.querySelector("p.panelTitle___aoGuV");
    if (!titleEl) return;

    const crimeTitle = titleEl.textContent.trim();
    const roles = [];

    const roleEls = wrapper.querySelectorAll(".title___UqFNy");
    roleEls.forEach((roleEl) => {
      const roleName = roleEl.textContent.trim();
      const successEl = roleEl.nextElementSibling;
      const chance = successEl
        ? parseInt(successEl.textContent.trim(), 10)
        : null;
      const evaluation =
        chance !== null
          ? classifyOcRoleInfluence(crimeTitle, roleName)
          : { lower: 70, upper: 80 };
      roles.push({ role: roleName, chance, evaluation });

      if (successEl && evaluation.lower) {
        successEl.textContent = `${chance}/${evaluation.lower}`;
      }

      const slotHeader = roleEl.closest("button.slotHeader___K2BS_");
      if (slotHeader) {
        if (chance >= evaluation.upper) {
          //slotHeader.style.backgroundColor = "#ca6f1e";
        } else if (chance >= evaluation.lower) {
          slotHeader.style.backgroundColor = "#239b56";
        } else {
          slotHeader.style.backgroundColor = "#a93226";
        }
      }
    });

    crimeData[ocId] = { id: ocId, title: crimeTitle, roles };
  }

  function setupMutationObserver(root) {
    const observer = new MutationObserver(() => {
      const tabTitle = document
        .querySelector("button.active___ImR61 span.tabName___DdwH3")
        ?.textContent.trim();

      if (tabTitle !== "Recruiting" && tabTitle !== "Planning") return;

      if (previousTab !== tabTitle) {
        crimeData = {};
        previousTab = tabTitle;
      }

      const allCrimes = document.querySelectorAll(".wrapper___U2Ap7");
      allCrimes.forEach((crimeNode) => {
        processCrime(crimeNode);
      });
    });

    observer.observe(root, { childList: true, subtree: true });
  }

  const factionId = getFactionId();
  const cb = () => {
    waitForKeyElements("#faction-crimes-root", (root) => {
      setupMutationObserver(root);
    });
  };
  if (factionId) {
    updateFactionRoleRestrictions(factionId, cb);
  } else {
    console.log(
      "[OCRoleRestrictions] Couldn't find faction id, going with defaults.",
    );
    cb();
  }

  // Inserting dependency because Torn PDA can't handle @require
  // ==UserScript==
  // @version 1.3.0
  // @name waitForKeyElements.js (CoeJoder fork)
  // @description A utility function for userscripts that detects and handles AJAXed content.
  // @namespace https://github.com/CoeJoder/waitForKeyElements.js
  // @author CoeJoder
  // @homepage https://github.com/CoeJoder/waitForKeyElements.js
  // @source https://raw.githubusercontent.com/CoeJoder/waitForKeyElements.js/master/waitForKeyElements.js
  //
  // ==/UserScript==

  /**
   * A utility function for userscripts that detects and handles AJAXed content.
   *
   * @example
   * waitForKeyElements("div.comments", (element) => {
   *   element.innerHTML = "This text inserted by waitForKeyElements().";
   * });
   *
   * waitForKeyElements(() => {
   *   const iframe = document.querySelector('iframe');
   *   if (iframe) {
   *     const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
   *     return iframeDoc.querySelectorAll("div.comments");
   *   }
   *   return null;
   * }, callbackFunc);
   *
   * @param {(string|function)} selectorOrFunction - The selector string or function.
   * @param {function}          callback           - The callback function; takes a single DOM element as parameter.
   *                                                 If returns true, element will be processed again on subsequent iterations.
   * @param {boolean}           [waitOnce=true]    - Whether to stop after the first elements are found.
   * @param {number}            [interval=300]     - The time (ms) to wait between iterations.
   * @param {number}            [maxIntervals=-1]  - The max number of intervals to run (negative number for unlimited).
   */
  function waitForKeyElements(
    selectorOrFunction,
    callback,
    waitOnce,
    interval,
    maxIntervals,
  ) {
    if (typeof waitOnce === "undefined") {
      waitOnce = true;
    }
    if (typeof interval === "undefined") {
      interval = 300;
    }
    if (typeof maxIntervals === "undefined") {
      maxIntervals = -1;
    }
    if (typeof waitForKeyElements.namespace === "undefined") {
      waitForKeyElements.namespace = Date.now().toString();
    }
    var targetNodes =
      typeof selectorOrFunction === "function"
        ? selectorOrFunction()
        : document.querySelectorAll(selectorOrFunction);

    var targetsFound = targetNodes && targetNodes.length > 0;
    if (targetsFound) {
      targetNodes.forEach(function (targetNode) {
        var attrAlreadyFound = `data-userscript-${waitForKeyElements.namespace}-alreadyFound`;
        var alreadyFound = targetNode.getAttribute(attrAlreadyFound) || false;
        if (!alreadyFound) {
          var cancelFound = callback(targetNode);
          if (cancelFound) {
            targetsFound = false;
          } else {
            targetNode.setAttribute(attrAlreadyFound, true);
          }
        }
      });
    }

    if (maxIntervals !== 0 && !(targetsFound && waitOnce)) {
      maxIntervals -= 1;
      setTimeout(function () {
        waitForKeyElements(
          selectorOrFunction,
          callback,
          waitOnce,
          interval,
          maxIntervals,
        );
      }, interval);
    }
  }
})();


