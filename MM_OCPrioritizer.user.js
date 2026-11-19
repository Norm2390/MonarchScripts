// ==UserScript==
// @name         Mutation OC Prioritizer (WIP)
// @namespace    jocko.mmocprioritizer
// @version      1.7.0
// @description  Faction CPR requirements, role qualification highlighting, role weights/success rates (crimehub), a planning progress bar, and a Prioritizer tab with your OC situation, pipeline and CPR by level. MM themed Red. 100% client side (browser) storage, nothing external.
// @match        https://www.torn.com/factions.php*
// @run-at       document-end
// @downloadURL  https://github.com/Norm2390/MonarchScripts/raw/refs/heads/main/MM_OCPrioritizer.user.js
// @updateURL    https://github.com/Norm2390/MonarchScripts/raw/refs/heads/main/MM_OCPrioritizer.user.js
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      crimeshub-2b4b0.firebaseapp.com
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
 */

(function () {
  "use strict";

  /* ============================================================================
   * CRIMESHUB API & SUCCESS PROBABILITY CONFIG
   * ============================================================================ */
  const CRIMESHUB_SITE = 'https://crimeshub-2b4b0.firebaseapp.com/';
  const CRIMESHUB_REFRESH_MS = 6 * 60 * 60 * 1000;
  const CRIMESHUB_CACHE_KEY = 'tornOC_crimeshubData_v1';

  const BUILTIN_CRIMESHUB_DATA = {"blastfromthepast":{"v":"","name":"Blast From The Past","roles":{"muscle":"Muscle","engineer":"Engineer","bomber":"Bomber","picklock1":"Picklock1","hacker":"Hacker","picklock2":"Picklock2"},"n":[["A1-C1","c",["Muscle"]],["A2-C1","c",["Hacker"]],["A2-C2","c",["Picklock1"]],["A2-C3","c",["Picklock1"]],["A3-C1","c",["Muscle"]],["A3-C2","c",["Muscle"]],["A4-C1","c",["Engineer"]],["A5-C1","c",["Bomber"]],["A6-C1","c",["Picklock2"]],["A6-C2","c",["Engineer","Picklock2"]],["A7-C1","c",["Picklock1"]],["A8-C1","c",["Hacker"]],["A10S","g"],["A1-C2","c",["Picklock1","Picklock2"]],["A1-C3","c",["Hacker"]],["A4-C2","c",["Muscle","Engineer"]],["A5-C2","c",["Engineer","Bomber"]],["A5F","b"],["A7-C2","c",["Picklock2"]],["B7-C1","c",["Picklock1"]],["B8-C1","c",["Hacker"]],["B8S2","g"],["A9S","g"],["B8S1","g"],["B6-C1","c",["Picklock2"]],["A4F","b"],["A3F","b"],["A2F","b"],["A1F","b"]],"e":[["Prelude","A1-C1"],["A1-C1P","A2-C1"],["A2-C1F","A2-C2"],["A2-C2F","A2-C3"],["A2-C3P","A3-C1"],["A3-C1F","A3-C2"],["A3-C2P","A4-C1"],["A4-C1P","A5-C1"],["A5-C1P","A6-C1"],["A6-C1F","A6-C2"],["A6-C2P","A7-C1"],["A7-C1P","A8-C1"],["A8-C1F","A10S"],["A1-C1F","A1-C2"],["A1-C2F","A1-C3"],["A1-C3P","A2-C1"],["A4-C1F","A4-C2"],["A4-C2P","A5-C1"],["A5-C1F","A5-C2"],["A5-C2F","A5F"],["A2-C1P","A3-C1"],["A3-C1P","A4-C1"],["A6-C1P","A7-C1"],["A7-C1F","A7-C2"],["A7-C2F","B7-C1"],["B7-C1F","B8-C1"],["B8-C1F","B8S2"],["A8-C1P","A9S"],["A2-C2P","A3-C1"],["B7-C1P","B8-C1"],["B7-C1P","B8S1"],["A6-C2F","B6-C1"],["B6-C1P","B7-C1"],["B6-C1F","B7-C1"],["A5-C2P","B6-C1"],["A1-C2P","A2-C1"],["A7-C2P","A8-C1"],["A4-C2F","A4F"],["A3-C2F","A3F"],["A2-C3F","A2F"],["A1-C3F","A1F"]],"w":{"Muscle":34,"Engineer":24,"Bomber":16,"Picklock1":11,"Hacker":12,"Picklock2":3}},"noreserve":{"v":"","name":"No Reserve","roles":{"techie":"Techie","engineer":"Engineer","carthief":"CarThief"},"n":[["A1-C1","c",["Techie"]],["A1-C2","c",["Techie"]],["A2-C1","c",["Techie"]],["A2-C2","c",["Techie"]],["A3-C1","c",["Techie"]],["A3-C2","c",["Engineer"]],["A3-C3","c",["CarThief"]],["B4-C1","c",["Engineer"]],["B5-C1","c",["CarThief"]],["B8-C1","c",["Techie"]],["B8-C2","c",["CarThief","Engineer"]],["B8F","b"],["A1-C3","c",["CarThief"]],["A4-C1","c",["CarThief"]],["A5-C1","c",["Engineer"]],["A6-C1","c",["Techie"]],["B9S","g"],["B4F","b"],["B5-C2","c",["Techie"]],["B6-C1","c",["CarThief","Engineer"]],["B7S","g"],["B8S","g"],["A2-C3","c",["Engineer"]],["B6-C2","c",["Techie"]],["B5F","b"],["A7S","g"],["A3F","b"],["B6F","b"],["A1F","b"],["A2F","b"]],"e":[["Prelude","A1-C1"],["A1-C1F","A1-C2"],["A1-C2P","A2-C1"],["A2-C1F","A2-C2"],["A2-C2P","A3-C1"],["A3-C1F","A3-C2"],["A3-C2F","A3-C3"],["A3-C3P","B4-C1"],["B4-C1P","B5-C1"],["B5-C1P","B8-C1"],["B8-C1F","B8-C2"],["B8-C2F","B8F"],["A1-C2F","A1-C3"],["A1-C3P","A2-C1"],["A3-C2P","A4-C1"],["A4-C1P","A5-C1"],["A5-C1P","A6-C1"],["A6-C1F","B8-C1"],["B8-C1P","B9S"],["A3-C1P","A4-C1"],["A4-C1F","B4-C1"],["B4-C1F","B4F"],["A2-C1P","A3-C1"],["A5-C1F","B5-C1"],["B5-C1F","B5-C2"],["B5-C2P","B6-C1"],["B6-C1P","B7S"],["B8-C2P","B8S"],["A1-C1P","A2-C1"],["A2-C2F","A2-C3"],["A2-C3P","A3-C1"],["B6-C1F","B6-C2"],["B6-C2P","B7S"],["B5-C2F","B5F"],["A6-C1P","A7S"],["A3-C3F","A3F"],["B6-C2F","B6F"],["A1-C3F","A1F"],["A2-C3F","A2F"]],"w":{"Techie":38,"Engineer":31,"CarThief":31}},"biddingwar":{"v":"","name":"Bidding War","roles":{"robber3":"Robber3","robber2":"Robber2","bomber2":"Bomber2","driver":"Driver","bomber1":"Bomber1","robber1":"Robber1"},"n":[["A1-C1","c",["Bomber1"]],["A1-C2","c",["Bomber1","Bomber2"]],["A2-C1","c",["Driver"]],["A3-C1","c",["Robber1"]],["A3-C2","c",["Robber2"]],["A4-C1","c",["Robber3"]],["A4-C2","c",["Bomber2"]],["A5-C1","c",["Robber3"]],["A5-C2","c",["Robber2"]],["A6-C2","c",["Robber2"]],["A6S2","g"],["A1-C3","c",["Driver"]],["A3-C3","c",["Robber1","Robber2"]],["A6-C1","c",["Robber3","Driver"]],["A5F","b"],["A2-C2","c",["Driver"]],["A2-C3","c",["Driver"]],["A4-C3","c",["Robber1"]],["A4F","b"],["A6S","g"],["A7-C1","c",["Bomber2"]],["A8S","g"],["A8S2","g"],["A3F","b"],["A2F","b"],["A4F2","b"],["A1F","b"]],"e":[["Prelude","A1-C1"],["A1-C1F","A1-C2"],["A1-C2P","A2-C1"],["A2-C1P","A3-C1"],["A3-C1F","A3-C2"],["A3-C2P","A4-C1"],["A4-C1F","A4-C2"],["A4-C2P","A5-C1"],["A5-C1F","A5-C2"],["A5-C2P","A6-C2"],["A6-C2F","A6S2"],["A1-C2F","A1-C3"],["A1-C3P","A2-C1"],["A3-C2F","A3-C3"],["A3-C3P","A4-C1"],["A4-C1P","A5-C1"],["A5-C1P","A6-C1"],["A6-C1F","A6-C2"],["A1-C1P","A2-C1"],["A3-C1P","A4-C1"],["A5-C2F","A5F"],["A2-C1F","A2-C2"],["A2-C2F","A2-C3"],["A2-C3P","A3-C1"],["A2-C2P","A3-C1"],["A4-C2F","A4-C3"],["A4-C3F","A4F"],["A6-C2P","A6S"],["A6-C1P","A7-C1"],["A7-C1P","A8S"],["A7-C1F","A8S2"],["A3-C3F","A3F"],["A2-C3F","A2F"],["A4-C3P","A4F2"],["A1-C3F","A1F"]],"w":{"Robber3":32,"Robber2":22,"Bomber2":18,"Driver":13,"Bomber1":8,"Robber1":7}},"stackingthedeck":{"v":"","name":"Stacking The Deck","roles":{"imitator":"Imitator","hacker":"Hacker","catburglar":"CatBurglar","driver":"Driver"},"n":[["A1-C1","c",["CatBurglar"]],["A1-C2","c",["CatBurglar","Imitator"]],["A2-C1","c",["Driver"]],["A2-C2","c",["Driver"]],["A3-C1","c",["CatBurglar"]],["A4-C1","c",["Hacker"]],["B2-C1","c",["Hacker"]],["B3-C1","c",["Imitator"]],["B4-C1","c",["Hacker"]],["B4S","g"],["B1-C1","c",["Imitator"]],["B3-C2","c",["Hacker"]],["B3F","b"],["A5-C1","c",["Hacker"]],["A5-C2","c",["Imitator"]],["A5F","b"],["B1-C2","c",["Imitator"]],["B1F","b"],["B5S","g"],["B2-C2","c",["Imitator"]],["B2F","b"],["A6S","g"],["A6-C1","c",["Imitator"]],["A7S","g"],["A1F","b"]],"e":[["Prelude","A1-C1"],["A1-C1F","A1-C2"],["A1-C2P","A2-C1"],["A2-C1F","A2-C2"],["A2-C2P","A3-C1"],["A3-C1P","A4-C1"],["A4-C1F","B2-C1"],["B2-C1P","B3-C1"],["B3-C1P","B4-C1"],["B4-C1F","B4S"],["A1-C1P","A2-C1"],["A2-C2F","B1-C1"],["B1-C1P","B2-C1"],["B3-C1F","B3-C2"],["B3-C2F","B3F"],["A4-C1P","A5-C1"],["A5-C1F","A5-C2"],["A5-C2F","A5F"],["B1-C1F","B1-C2"],["B1-C2F","B1F"],["A2-C1P","A3-C1"],["B4-C1P","B5S"],["A3-C1F","B1-C1"],["B3-C2P","B4S"],["B2-C1F","B2-C2"],["B2-C2P","B3-C1"],["B1-C2P","B2-C1"],["B2-C2F","B2F"],["A5-C2P","A6S"],["A5-C1P","A6-C1"],["A6-C1F","A6S"],["A6-C1P","A7S"],["A1-C2F","A1F"]],"w":{"Imitator":48,"Hacker":26,"CatBurglar":23,"Driver":3}},"leavenotrace":{"v":"V2","name":"Leave No Trace","roles":{"imitator":"Imitator","negotiator":"Negotiator","techie":"Techie"},"n":[["A1-C1","c",["Techie"]],["A2-C1","c",["Negotiator"]],["A3-C1","c",["Imitator"]],["A3-C2","c",["Negotiator"]],["A4-C1","c",["Imitator"]],["A4-C2","c",["Imitator"]],["A6-C1","c",["Techie"]],["A6-C2","c",["Negotiator"]],["A6-C3","c",["Imitator"]],["A6F","b"],["A1-C2","c",["Negotiator"]],["A2-C2","c",["Imitator"]],["A5-C1","c",["Techie"]],["A8-C1","c",["Negotiator"]],["A8S2","g"],["A3-C3","c",["Techie"]],["A6S","g"],["A8S1","g"],["A7-C1","c",["Negotiator"]],["A7S2","g"],["A4F","b"],["B1-C1","c",["Imitator"]],["B1-C2","c",["Negotiator"]],["B2-C1","c",["Techie","Negotiator"]],["B2F","b"],["A3F","b"],["B1F","b"],["B3S","g"],["A7S","g"],["A1F","b"]],"e":[["Prelude","A1-C1"],["A1-C1P","A2-C1"],["A2-C1P","A3-C1"],["A3-C1F","A3-C2"],["A3-C2P","A4-C1"],["A4-C1F","A4-C2"],["A4-C2P","A6-C1"],["A6-C1F","A6-C2"],["A6-C2F","A6-C3"],["A6-C3F","A6F"],["A1-C1F","A1-C2"],["A1-C2P","A2-C1"],["A2-C1F","A2-C2"],["A2-C2P","A3-C1"],["A4-C1P","A5-C1"],["A5-C1F","A6-C1"],["A6-C1P","A8-C1"],["A8-C1F","A8S2"],["A3-C2F","A3-C3"],["A3-C3P","A4-C1"],["A6-C3P","A6S"],["A8-C1P","A8S1"],["A5-C1P","A7-C1"],["A7-C1F","A7S2"],["A6-C2P","A8-C1"],["A4-C2F","A4F"],["A3-C1P","A4-C1"],["A2-C2F","B1-C1"],["B1-C1F","B1-C2"],["B1-C2P","B2-C1"],["B2-C1F","B2F"],["A3-C3F","A3F"],["B1-C2F","B1F"],["B1-C1P","B2-C1"],["B1-C2P","B3S"],["A7-C1P","A7S"],["A1-C2F","A1F"]],"w":{"Imitator":37,"Negotiator":34,"Techie":29}},"snowblind":{"v":"","name":"Snow Blind","roles":{"hustler":"Hustler","imitator":"Imitator","muscle1":"Muscle1","muscle2":"Muscle2"},"n":[["A1-C1","c",["Muscle1","Muscle2"]],["A2-C1","c",["Hustler"]],["A2-C2","c",["Imitator"]],["A3-C1","c",["Imitator"]],["A3-C2","c",["Hustler"]],["A4-C1","c",["Hustler"]],["A4-C2","c",["Hustler"]],["A5-C1","c",["Hustler"]],["A6-C1","c",["Imitator"]],["A7-C1","c",["Imitator"]],["A8S1","g"],["A5-C2","c",["Imitator"]],["A6-C2","c",["Hustler"]],["B7-C1","c",["Muscle1","Muscle2"]],["B7S1","g"],["A1-C2","c",["Muscle1"]],["A8S2","g"],["A1-C3","c",["Muscle2"]],["B7S2","g"],["A6-C3","c",["Muscle1","Muscle2"]],["B8S","g"],["A4-C3","c",["Hustler"]],["A4F","b"],["A6F","b"],["A4S","g"],["A5F","b"],["B1-C1","c",["Muscle1"]],["B1-C2","c",["Muscle2"]],["B1F1","b"],["B1F2","b"],["B1F3","b"],["A1F","b"]],"e":[["Prelude","A1-C1"],["A1-C1P","A2-C1"],["A2-C1F","A2-C2"],["A2-C2P","A3-C1"],["A3-C1F","A3-C2"],["A3-C2P","A4-C1"],["A4-C1F","A4-C2"],["A4-C2P","A5-C1"],["A5-C1P","A6-C1"],["A6-C1P","A7-C1"],["A7-C1P","A8S1"],["A4-C1P","A5-C1"],["A5-C1F","A5-C2"],["A5-C2P","A6-C1"],["A6-C1F","A6-C2"],["A6-C2P","B7-C1"],["B7-C1P","B7S1"],["A1-C1F","A1-C2"],["A1-C2P","A2-C1"],["A2-C1P","A3-C1"],["A7-C1F","A8S2"],["A1-C2F","A1-C3"],["A1-C3P","A2-C1"],["A3-C1P","A4-C1"],["B7-C1F","B7S2"],["A6-C2F","A6-C3"],["A6-C3P","B8S"],["A4-C2F","A4-C3"],["A4-C3F","A4F"],["A6-C3F","A6F"],["A4-C3P","A4S"],["A5-C2F","A5F"],["A2-C2F","B1-C1"],["B1-C1F","B1-C2"],["B1-C2F","B1F1"],["B1-C2P","B1F2"],["A3-C2F","A4-C3"],["B1-C1P","B1F3"],["A1-C3F","A1F"]],"w":{"Hustler":48,"Imitator":36,"Muscle1":8,"Muscle2":8}},"marketforces":{"v":"","name":"Market Forces","roles":{"enforcer":"Enforcer","negotiator":"Negotiator","muscle":"Muscle","lookout":"Lookout","arsonist":"Arsonist"},"n":[["A1-C1","c",["Lookout"]],["A2-C1","c",["Negotiator"]],["A3-C1","c",["Enforcer"]],["A3-C2","c",["Negotiator"]],["A3-C3","c",["Muscle"]],["B4-C1","c",["Arsonist"]],["B5-C1","c",["Muscle"]],["B5-C2","c",["Enforcer","Lookout"]],["B5F","b"],["A4-C1","c",["Arsonist"]],["A5-C1","c",["Muscle"]],["A5-C2","c",["Enforcer","Lookout"]],["A7-C1","c",["Negotiator"]],["A7-C2","c",["Negotiator"]],["A7S","g"],["A1-C2","c",["Enforcer"]],["A2-C2","c",["Muscle"]],["A8-C1","c",["Muscle"]],["A8S","g"],["A4-C2","c",["Arsonist"]],["B5S","g"],["A8S2","g"],["B4F","b"],["A5S","g"],["A4S","g"],["A3F","b"],["A2F","b"],["A1F","b"]],"e":[["Prelude","A1-C1"],["A1-C1P","A2-C1"],["A2-C1P","A3-C1"],["A3-C1F","A3-C2"],["A3-C2F","A3-C3"],["A3-C3P","B4-C1"],["B4-C1P","B5-C1"],["B5-C1F","B5-C2"],["B5-C2F","B5F"],["A3-C1P","A4-C1"],["A4-C1P","A5-C1"],["A5-C1F","A5-C2"],["A5-C2P","A7-C1"],["A7-C1F","A7-C2"],["A7-C2F","A7S"],["A1-C1F","A1-C2"],["A1-C2P","A2-C1"],["A2-C1F","A2-C2"],["A2-C2P","A3-C1"],["A7-C2P","A8-C1"],["A8-C1P","A8S"],["A3-C2P","A4-C1"],["A4-C1F","A4-C2"],["A4-C2P","B5-C1"],["B5-C2P","B5S"],["A5-C1P","A7-C1"],["A7-C1P","A8-C1"],["B5-C1P","B5S"],["A8-C1F","A8S2"],["B4-C1F","B4F"],["A5-C2F","A5S"],["A4-C2F","A4S"],["A3-C3F","A3F"],["A2-C2F","A2F"],["A1-C2F","A1F"]],"w":{"Enforcer":29,"Negotiator":27,"Muscle":23,"Lookout":16,"Arsonist":5}},"stagefright":{"v":"","name":"Stage Fright","roles":{"sniper":"Sniper","muscle1":"Muscle1","enforcer":"Enforcer","muscle3":"Muscle3","lookout":"Lookout","muscle2":"Muscle2"},"n":[["A1-C1","c",["Lookout","Muscle2"]],["A1-C2","c",["Lookout","Muscle1"]],["A2-C1","c",["Sniper"]],["A3-C1","c",["Muscle1","Muscle3"]],["B1-C1","c",["Enforcer"]],["B1-C2","c",["Sniper"]],["B1F","b"],["A1-C3","c",["Enforcer","Muscle3"]],["B2-C1","c",["Muscle1"]],["B3-C1","c",["Sniper"]],["B3F","b"],["A2-C2","c",["Muscle1"]],["A4-C1","c",["Enforcer"]],["B2-C2","c",["Sniper"]],["B2S","g"],["B4S","g"],["B2F","b"],["A2F","b"],["A5-C1","c",["Lookout","Sniper"]],["A6S","g"],["A1F","b"],["A7S","g"]],"e":[["Prelude","A1-C1"],["A1-C1F","A1-C2"],["A1-C2P","A2-C1"],["A2-C1P","A3-C1"],["A3-C1F","B1-C1"],["B1-C1F","B1-C2"],["B1-C2F","B1F"],["A1-C2F","A1-C3"],["A1-C3P","A2-C1"],["B1-C1P","B2-C1"],["B2-C1P","B3-C1"],["B3-C1F","B3F"],["A1-C1P","A2-C1"],["A2-C1F","A2-C2"],["A2-C2P","A3-C1"],["A3-C1P","A4-C1"],["A4-C1F","B2-C1"],["B2-C1F","B2-C2"],["B2-C2P","B2S"],["B3-C1P","B4S"],["B1-C2P","B2-C1"],["B2-C2F","B2F"],["A2-C2F","A2F"],["A4-C1P","A5-C1"],["A5-C1P","A6S"],["A1-C3F","A1F"],["A5-C1F","A7S"]],"w":{"Sniper":46,"Muscle1":20,"Enforcer":16,"Muscle3":9,"Lookout":6,"Muscle2":3}},"smokeandwingmirrors":{"v":"","name":"Smoke And Wing Mirrors","roles":{"carthief":"CarThief","imitator":"Imitator","hustler2":"Hustler2","hustler1":"Hustler1"},"n":[["A1-C1","c",["Imitator"]],["A1-C2","c",["CarThief"]],["A2-C1","c",["Imitator"]],["A3-C1","c",["CarThief"]],["A3-C2","c",["CarThief"]],["A4-C1","c",["Hustler1","Hustler2"]],["A5-C1","c",["CarThief"]],["A6-C1","c",["Hustler1"]],["A6-C2","c",["CarThief"]],["A6-C3","c",["CarThief"]],["A9S","g"],["A1-C3","c",["Imitator"]],["A2-C2","c",["Imitator"]],["A5-C2","c",["Imitator"]],["B3-C1","c",["Imitator"]],["B3S2","g"],["A2-C3","c",["CarThief"]],["B3S","g"],["A8S","g"],["A4-C2","c",["Hustler2"]],["A4-C3","c",["Hustler2"]],["B2-C1","c",["Hustler1"]],["B2-C2","c",["Hustler2"]],["B2F","b"],["A7S","g"],["C1F","b"],["A4F","b"],["A6F","b"],["A3F","b"],["A2F","b"],["A1F","b"]],"e":[["Prelude","A1-C1"],["A1-C1F","A1-C2"],["A1-C2P","A2-C1"],["A2-C1P","A3-C1"],["A3-C1F","A3-C2"],["A3-C2P","A4-C1"],["A4-C1P","A5-C1"],["A5-C1P","A6-C1"],["A6-C1F","A6-C2"],["A6-C2F","A6-C3"],["A6-C3P","A9S"],["A1-C2F","A1-C3"],["A1-C3P","A2-C1"],["A2-C1F","A2-C2"],["A2-C2P","A3-C1"],["A3-C1P","A4-C1"],["A5-C1F","A5-C2"],["A5-C2P","B3-C1"],["B3-C1F","B3S2"],["A2-C2F","A2-C3"],["A2-C3P","A3-C1"],["B3-C1P","B3S"],["A6-C2P","A8S"],["A1-C1P","A2-C1"],["A4-C1F","A4-C2"],["A4-C2F","A4-C3"],["A4-C3P","B2-C1"],["B2-C1F","B2-C2"],["B2-C2P","B3-C1"],["A4-C2P","B2-C1"],["B2-C2F","B2F"],["B2-C1P","B3-C1"],["A6-C1P","A7S"],["A5-C2F","C1F"],["A4-C3F","A4F"],["A6-C3F","A6F"],["A3-C2F","A3F"],["A2-C3F","A2F"],["A1-C3F","A1F"]],"w":{"CarThief":51,"Imitator":27,"Hustler2":13,"Hustler1":9}},"cashmeifyoucan":{"v":"","name":"Cash Me If You Can","roles":{"thief1":"Thief1","lookout":"Lookout","thief2":"Thief2"},"n":[["A1-C1","c",["Thief1"]],["A1-C2","c",["Thief1"]],["A2-C1","c",["Thief2"]],["A3-C1","c",["Thief1"]],["A3-C2","c",["Thief1"]],["A4-C1","c",["Thief2"]],["A4-C2","c",["Thief2"]],["B1-C1","c",["Thief1","Thief2"]],["B1F","b"],["A2-C2","c",["Thief1"]],["A5-C1","c",["Lookout"]],["A6-C1","c",["Thief2"]],["A7S","g"],["A2-C3","c",["Thief2"]],["B2-C1","c",["Lookout"]],["B3S","g"],["A1-C3","c",["Thief2"]],["B2F","b"],["A4S","g"],["A2F","b"],["A3-C3","c",["Thief2"]],["C1-C1","c",["Thief1"]],["C1F","b"],["A8S","g"],["C2S","g"],["A3F","b"],["A1F","b"]],"e":[["Prelude","A1-C1"],["A1-C1F","A1-C2"],["A1-C2P","A2-C1"],["A2-C1P","A3-C1"],["A3-C1F","A3-C2"],["A3-C2P","A4-C1"],["A4-C1F","A4-C2"],["A4-C2F","B1-C1"],["B1-C1F","B1F"],["A2-C1F","A2-C2"],["A2-C2P","A3-C1"],["A4-C1P","A5-C1"],["A5-C1P","A6-C1"],["A6-C1P","A7S"],["A2-C2F","A2-C3"],["A2-C3P","A3-C1"],["A3-C1P","A4-C1"],["A5-C1F","B1-C1"],["B1-C1P","B2-C1"],["B2-C1P","B3S"],["A1-C2F","A1-C3"],["A1-C3P","A2-C1"],["B2-C1F","B2F"],["A1-C1P","A2-C1"],["A4-C2P","A4S"],["A2-C3F","A2F"],["A3-C2F","A3-C3"],["A3-C3P","C1-C1"],["C1-C1F","C1F"],["A6-C1F","A8S"],["C1-C1P","C2S"],["A3-C3F","A3F"],["A1-C3F","A1F"]],"w":{"Thief1":50,"Lookout":28,"Thief2":22}},"mobmentality":{"v":"","name":"Mob Mentality","roles":{"looter1":"Looter1","looter2":"Looter2","looter4":"Looter4","looter3":"Looter3"},"n":[["A1-C1","c",["Looter1"]],["A2-C1","c",["Looter2"]],["A2-C2","c",["Looter4"]],["A2-C3","c",["Looter2","Looter3"]],["A3-C1","c",["Looter3"]],["A3-C2","c",["Looter4"]],["A3-C3","c",["Looter1"]],["A3-C4","c",["Looter2"]],["D1-C1","c",["Looter3"]],["D3S","g"],["A4-C1","c",["Looter2"]],["A4-C2","c",["Looter1"]],["A4F","b"],["A5-C1","c",["Looter4"]],["A5-C2","c",["Looter1"]],["A7S2","g"],["A1-C2","c",["Looter2"]],["A1-C3","c",["Looter3"]],["A7-C1","c",["Looter2"]],["A7S","g"],["A5F","b"],["D2F","b"],["B1-C1","c",["Looter4"]],["B3S","g"],["A2F","b"],["B2S","g"],["A1F","b"]],"e":[["Prelude","A1-C1"],["A1-C1P","A2-C1"],["A2-C1F","A2-C2"],["A2-C2F","A2-C3"],["A2-C3P","A3-C1"],["A3-C1F","A3-C2"],["A3-C2F","A3-C3"],["A3-C3F","A3-C4"],["A3-C4F","D1-C1"],["D1-C1P","D3S"],["A3-C2P","A4-C1"],["A4-C1F","A4-C2"],["A4-C2F","A4F"],["A4-C1P","A5-C1"],["A5-C1F","A5-C2"],["A5-C2P","A7S2"],["A1-C1F","A1-C2"],["A1-C2F","A1-C3"],["A1-C3P","A2-C1"],["A2-C1P","A3-C1"],["A1-C2P","A2-C1"],["A3-C1P","A4-C1"],["A5-C1P","A7-C1"],["A7-C1P","A7S"],["A5-C2F","A5F"],["A3-C3P","D1-C1"],["D1-C1F","D2F"],["A2-C2P","A3-C1"],["A7-C1F","A7S2"],["A4-C2P","B1-C1"],["B1-C1F","B3S"],["A3-C4P","D1-C1"],["A2-C3F","A2F"],["B1-C1P","B2S"],["A1-C3F","A1F"]],"w":{"Looter1":34,"Looter2":26,"Looter4":23,"Looter3":18}},"counteroffer":{"v":"","name":"Counter Offer","roles":{"robber":"Robber","engineer":"Engineer","picklock":"Picklock","hacker":"Hacker","looter":"Looter"},"n":[["A1-C1","c",["Robber"]],["A2-C1","c",["Engineer"]],["A3-C1","c",["Hacker"]],["A4-C1","c",["Hacker"]],["A5-C1","c",["Robber","Picklock"]],["A6-C1","c",["Looter","Engineer"]],["A7S","g"],["A2-C2","c",["Robber"]],["A3-C2","c",["Hacker"]],["B3-C1","c",["Looter"]],["B4-C1","c",["Picklock"]],["B5S","g"],["A1-C2","c",["Robber","Picklock"]],["A7S2","g"],["A5-C2","c",["Looter"]],["A5S","g"],["A4-C2","c",["Engineer"]],["A4F","b"],["A5-C3","c",["Looter","Robber"]],["A5F","b"],["A1-C3","c",["Looter","Picklock"]],["B3-C2","c",["Looter","Engineer"]],["A2F","b"],["B4-C2","c",["Engineer","Picklock"]],["B3F","b"],["A1F","b"],["B4F","b"]],"e":[["Prelude","A1-C1"],["A1-C1P","A2-C1"],["A2-C1F","A2-C2"],["A2-C2P","A3-C1"],["A3-C1F","A3-C2"],["A3-C2F","B3-C1"],["B3-C1P","B4-C1"],["B4-C1P","B5S"],["A3-C1P","A4-C1"],["A4-C1P","A5-C1"],["A5-C1P","A6-C1"],["A6-C1F","A7S2"],["A1-C1F","A1-C2"],["A1-C2P","A2-C1"],["A2-C1P","A3-C1"],["A5-C1F","A5-C2"],["A5-C2P","A5S"],["A6-C1P","A7S"],["A1-C2F","A1-C3"],["A1-C3P","A2-C1"],["A3-C2P","A4-C1"],["A4-C1F","A4-C2"],["A4-C2F","A4F"],["A4-C2P","A5-C1"],["A2-C2F","A2F"],["A1-C3F","A1F"],["A5-C2F","A5-C3"],["A5-C3P","A5S"],["B3-C1F","B3-C2"],["B3-C2P","B4-C1"],["B4-C1F","B4-C2"],["B4-C2P","B5S"],["A5-C3F","A5F"],["B3-C2F","B3F"],["B4-C2F","B4F"]],"w":{"Robber":36,"Engineer":28,"Picklock":17,"Hacker":12,"Looter":7}},"breakthebank":{"v":"V2","name":"Break The Bank","roles":{"muscle3":"Muscle3","thief2":"Thief2","muscle1":"Muscle1","robber":"Robber","muscle2":"Muscle2","thief1":"Thief1"},"n":[["A1-C1","c",["Robber","Muscle1"]],["A1-C2","c",["Muscle2"]],["A1-C3","c",["Muscle3"]],["A2-C1","c",["Muscle2"]],["A2-C2","c",["Muscle2","Thief1"]],["A3-C1","c",["Muscle3"]],["A3-C2","c",["Thief2"]],["A4-C2","c",["Robber","Thief2"]],["A5-C1","c",["Muscle3"]],["A6-C1","c",["Robber","Muscle1"]],["A7-C1","c",["Muscle1"]],["A8-C1","c",["Robber","Thief1"]],["A8S","g"],["A4-C1","c",["Thief2"]],["A7-C2","c",["Robber"]],["A10S","g"],["A8S2","g"],["A5-C2","c",["Muscle1","Muscle3"]],["A9S","g"],["A5F","b"],["A4F","b"],["B1-C1","c",["Thief2"]],["B2-C1","c",["Muscle3"]],["B2-C2","c",["Muscle1"]],["B3S","g"],["B1F","b"],["B2F","b"],["A1F","b"]],"e":[["Prelude","A1-C1"],["A1-C1F","A1-C2"],["A1-C2F","A1-C3"],["A1-C3P","A2-C1"],["A2-C1F","A2-C2"],["A2-C2P","A3-C1"],["A3-C1F","A3-C2"],["A3-C2F","A4-C2"],["A4-C2P","A5-C1"],["A5-C1P","A6-C1"],["A6-C1P","A7-C1"],["A7-C1P","A8-C1"],["A8-C1P","A8S"],["A1-C2P","A2-C1"],["A3-C2P","A4-C1"],["A4-C1P","A5-C1"],["A7-C1F","A7-C2"],["A7-C2F","A10S"],["A4-C1F","A4-C2"],["A8-C1F","A8S2"],["A5-C1F","A5-C2"],["A5-C2P","A6-C1"],["A7-C2P","A9S"],["A2-C1P","A3-C1"],["A5-C2F","A5F"],["A3-C1P","A4-C1"],["A1-C1P","A2-C1"],["A6-C1F","A7-C2"],["A4-C2F","A4F"],["A2-C2F","B1-C1"],["B1-C1P","B2-C1"],["B2-C1F","B2-C2"],["B2-C2P","B3S"],["B1-C1F","B1F"],["B2-C2F","B2F"],["B2-C1P","B3S"],["A1-C3F","A1F"]],"w":{"Muscle3":32,"Thief2":29,"Muscle1":14,"Robber":13,"Muscle2":10,"Thief1":3}},"aceinthehole":{"v":"V2","name":"Ace In The Hole","roles":{"hacker":"Hacker","imitator":"Imitator","muscle2":"Muscle2","muscle1":"Muscle1","driver":"Driver"},"n":[["A1-C1","c",["Imitator"]],["B2-C1","c",["Muscle1","Muscle2"]],["B3-C1","c",["Hacker"]],["B3-C2","c",["Hacker"]],["B4-C1","c",["Muscle1","Muscle2"]],["B5-C1","c",["Driver"]],["B6-C1","c",["Hacker"]],["B7S","g"],["B6-C2","c",["Hacker"]],["A2-C1","c",["Muscle1","Muscle2"]],["A3-C1","c",["Hacker"]],["A3-C2","c",["Hacker"]],["A3-C3","c",["Hacker"]],["A3F","b"],["A4-C1","c",["Muscle1","Muscle2"]],["A5-C1","c",["Driver"]],["A6-C1","c",["Hacker"]],["A7-C1","c",["Imitator"]],["A8S","g"],["A4-C2","c",["Imitator"]],["A4-C3","c",["Imitator","Muscle2"]],["A5-C2","c",["Driver"]],["A7-C2","c",["Muscle1","Muscle2"]],["A9S","g"],["A2-C2","c",["Muscle1","Muscle2"]],["C6-C1","c",["Imitator"]],["C7-C1","c",["Muscle1","Muscle2"]],["C8S","g"],["A2-C3","c",["Muscle2"]],["A2F","b"],["C6-C2","c",["Imitator","Muscle2"]],["C9S","g"],["B3F","b"],["A5-C3","c",["Driver"]],["B2-C2","c",["Muscle1","Muscle2"]],["B2F","b"],["A10S","g"],["B5-C2","c",["Driver"]],["D6-C1","c",["Hacker"]],["D6-C2","c",["Hacker"]],["D7S","g"],["D6F","b"],["C6F","b"],["B4-C2","c",["Muscle1"]],["C7F","b"],["B6F","b"],["A4F","b"],["B5F","b"],["B4F","b"]],"e":[["Prelude","A1-C1"],["A1-C1F","B2-C1"],["B2-C1P","B3-C1"],["B3-C1F","B3-C2"],["B3-C2P","B4-C1"],["B4-C1P","B5-C1"],["B5-C1P","B6-C1"],["B6-C1P","B7S"],["B6-C1F","B6-C2"],["B6-C2P","B7S"],["B3-C1P","B4-C1"],["A1-C1P","A2-C1"],["A2-C1P","A3-C1"],["A3-C1F","A3-C2"],["A3-C2F","A3-C3"],["A3-C3F","A3F"],["A3-C1P","A4-C1"],["A4-C1P","A5-C1"],["A5-C1P","A6-C1"],["A6-C1P","A7-C1"],["A7-C1P","A8S"],["A3-C3P","A4-C1"],["A4-C1F","A4-C2"],["A4-C2F","A4-C3"],["A4-C3P","A5-C1"],["A5-C1F","A5-C2"],["A5-C2P","A6-C1"],["A7-C1F","A7-C2"],["A7-C2P","A9S"],["A2-C1F","A2-C2"],["A2-C2P","A3-C1"],["A3-C2P","A4-C1"],["A4-C2P","A5-C1"],["A6-C1F","C6-C1"],["C6-C1P","C7-C1"],["C7-C1P","C8S"],["A2-C2F","A2-C3"],["A2-C3P","A3-C1"],["A2-C3F","A2F"],["C6-C1F","C6-C2"],["C6-C2P","C9S"],["B3-C2F","B3F"],["A5-C2F","A5-C3"],["A5-C3F","C6-C1"],["B2-C1F","B2-C2"],["B2-C2F","B2F"],["B2-C2P","B3-C1"],["A5-C3P","A6-C1"],["A7-C2F","A10S"],["B5-C1F","B5-C2"],["B5-C2P","D6-C1"],["D6-C1F","D6-C2"],["D6-C2P","D7S"],["D6-C2F","D6F"],["C6-C2F","C6F"],["B4-C1F","B4-C2"],["B4-C2P","B5-C1"],["D6-C1P","D7S"],["C7-C1F","C7F"],["B6-C2F","B6F"],["A4-C3F","A4F"],["B5-C2F","B5F"],["B4-C2F","B4F"]],"w":{"Hacker":28,"Imitator":21,"Muscle2":25,"Muscle1":18,"Driver":8}},"gaslighttheway":{"v":"","name":"Gaslight The Way","roles":{"imitator3":"Imitator3","imitator2":"Imitator2","looter3":"Looter3","imitator1":"Imitator1","looter1":"Looter1","looter2":"Looter2"},"n":[["A1-C1","c",["Imitator1","Looter1"]],["A2-C1","c",["Imitator2"]],["A3-C1","c",["Imitator3"]],["A4-C1","c",["Looter3"]],["A4-C2","c",["Looter3"]],["A4-C2N","u"],["A5-C1","c",["Looter2","Looter3"]],["A7-C1","c",["Imitator2"]],["A7S","g"],["A2-C2","c",["Imitator2"]],["A1-C2","c",["Imitator1","Looter1"]],["A2F","b"],["A3-C2","c",["Imitator3"]],["B8-C1","c",["Looter3"]],["B9S","g"],["A3F","b"],["B7-C1","c",["Imitator2"]],["B7S","g"],["A7S2","g"],["A1-C3","c",["Imitator1","Looter1"]],["B7S2","g"],["B8F","b"],["A1F","b"]],"e":[["Prelude","A1-C1"],["A1-C1P","A2-C1"],["A2-C1P","A3-C1"],["A3-C1P","A4-C1"],["A4-C1F","A4-C2"],["A4-C2P","A5-C1"],["A5-C1P","A7-C1"],["A7-C1P","A7S"],["A2-C1F","A2-C2"],["A2-C2P","A3-C1"],["A4-C1P","A5-C1"],["A1-C1F","A1-C2"],["A1-C2P","A2-C1"],["A2-C2F","A2F"],["A3-C1F","A3-C2"],["A3-C2P","B8-C1"],["B8-C1P","B9S"],["A3-C2F","A3F"],["A5-C1F","B7-C1"],["B7-C1P","B7S"],["A7-C1F","A7S2"],["A1-C2F","A1-C3"],["A1-C3P","A2-C1"],["B7-C1F","B7S2"],["B8-C1F","B8F"],["A4-C2F","A4-C2N"],["A4-C2X","A5-C1"],["A1-C3F","A1F"]],"w":{"Imitator3":41,"Imitator2":27,"Looter3":13,"Imitator1":9,"Looter1":10,"Looter2":0}},"clinicalprecision":{"v":"","name":"Clinical Precision","roles":{"imitator":"Imitator","cleaner":"Cleaner","catburglar":"CatBurglar","assassin":"Assassin"},"n":[["A1-C1","c",["CatBurglar"]],["A2-C1","c",["Assassin"]],["A3-C1","c",["Cleaner"]],["A4-C1","c",["Cleaner"]],["A4-C2","c",["CatBurglar"]],["A5-C1","c",["Imitator"]],["C5-C1","c",["Cleaner"]],["C5-C2","c",["CatBurglar","Cleaner"]],["C6-C1","c",["Imitator"]],["C7S","g"],["A1-C2","c",["Assassin","CatBurglar"]],["A6-C1","c",["Assassin"]],["A6-C2","c",["Assassin"]],["A7-C1","c",["Assassin","Cleaner"]],["A8S","g"],["A3-C2","c",["Cleaner"]],["A1-C3","c",["CatBurglar","Cleaner"]],["A1F","b"],["B3-C1","c",["Imitator"]],["B4-C1","c",["Imitator"]],["B4F","b"],["A2-C2","c",["Assassin"]],["C5F","b"],["B5-C1","c",["Assassin","Cleaner"]],["B6S","g"],["A6-C3","c",["Imitator"]],["A6F","b"],["A9S","g"],["C6F","b"],["A6S","g"],["A4F","b"],["B3-C2","c",["Assassin","Cleaner"]],["B3F","b"],["B5S","g"]],"e":[["Prelude","A1-C1"],["A1-C1P","A2-C1"],["A2-C1P","A3-C1"],["A3-C1P","A4-C1"],["A4-C1F","A4-C2"],["A4-C2P","A5-C1"],["A5-C1F","C5-C1"],["C5-C1F","C5-C2"],["C5-C2P","C6-C1"],["C6-C1P","C7S"],["A1-C1F","A1-C2"],["A1-C2P","A2-C1"],["A4-C1P","A5-C1"],["C5-C1P","C6-C1"],["A5-C1P","A6-C1"],["A6-C1F","A6-C2"],["A6-C2P","A7-C1"],["A7-C1P","A8S"],["A3-C1F","A3-C2"],["A3-C2P","A4-C1"],["A6-C1P","A7-C1"],["A1-C2F","A1-C3"],["A1-C3F","A1F"],["A3-C2F","B3-C1"],["B3-C1P","B4-C1"],["B4-C1F","B4F"],["A2-C1F","A2-C2"],["A2-C2P","A3-C1"],["C5-C2F","C5F"],["A2-C2F","B3-C1"],["B4-C1P","B5-C1"],["B5-C1P","B6S"],["A1-C3P","A2-C1"],["A6-C2F","A6-C3"],["A6-C3F","A6F"],["A7-C1F","A9S"],["C6-C1F","C6F"],["A6-C3P","A6S"],["A4-C2F","A4F"],["B3-C1F","B3-C2"],["B3-C2P","B4-C1"],["B3-C2F","B3F"],["B5-C1F","B5S"]],"w":{"Imitator":43,"Cleaner":22,"CatBurglar":19,"Assassin":16}},"guardianangels":{"v":"","name":"Guardian Ángels","roles":{"hustler":"Hustler","engineer":"Engineer","enforcer":"Enforcer"},"n":[["A1-C1","c",["Hustler"]],["A2-C1","c",["Engineer"]],["A3-C1","c",["Enforcer"]],["A4-C1","c",["Engineer"]],["B4-C1","c",["Engineer"]],["B5-C1","c",["Hustler"]],["B6S","g"],["A2-C2","c",["Enforcer","Engineer"]],["A3-C2","c",["Hustler"]],["A5-C1","c",["Hustler"]],["A6-C1","c",["Enforcer"]],["A7S","g"],["B5F","b"],["A5-C2","c",["Enforcer"]],["A6-C2","c",["Engineer"]],["A6-C3","c",["Hustler"]],["A9S","g"],["A5-C3","c",["Enforcer"]],["A8S","g"],["A1-C2","c",["Enforcer"]],["A2-C3","c",["Enforcer","Engineer"]],["B4-C2","c",["Enforcer","Hustler"]],["A1-C3","c",["Enforcer"]],["A1F","b"],["B4F","b"],["A6F","b"],["A5F","b"],["A2F","b"]],"e":[["Prelude","A1-C1"],["A1-C1P","A2-C1"],["A2-C1P","A3-C1"],["A3-C1P","A4-C1"],["A4-C1F","B4-C1"],["B4-C1P","B5-C1"],["B5-C1P","B6S"],["A2-C1F","A2-C2"],["A2-C2P","A3-C1"],["A3-C1F","A3-C2"],["A3-C2P","A4-C1"],["A4-C1P","A5-C1"],["A5-C1P","A6-C1"],["A6-C1P","A7S"],["B5-C1F","B5F"],["A5-C1F","A5-C2"],["A5-C2P","A6-C2"],["A6-C2F","A6-C3"],["A6-C3P","A9S"],["A5-C2F","A5-C3"],["A5-C3P","A6-C2"],["A6-C2P","A8S"],["A1-C1F","A1-C2"],["A1-C2P","A2-C1"],["A2-C2F","A2-C3"],["A2-C3P","A3-C1"],["B4-C1F","B4-C2"],["B4-C2P","B5-C1"],["A6-C1F","A6-C2"],["A1-C2F","A1-C3"],["A1-C3F","A1F"],["A3-C2F","B4-C1"],["B4-C2F","B4F"],["A1-C3P","A2-C1"],["A6-C3F","A6F"],["A5-C3F","A5F"],["A2-C3F","A2F"]],"w":{"Hustler":42,"Engineer":31,"Enforcer":27}},"sneakygitgrab":{"v":"","name":"Sneaky Git Grab","roles":{"pickpocket":"Pickpocket","imitator":"Imitator","techie":"Techie","hacker":"Hacker"},"n":[["A1-C1","c",["Imitator"]],["A1-C2","c",["Imitator"]],["A1-C3","c",["Pickpocket"]],["A2-C1","c",["Pickpocket"]],["A3-C1","c",["Imitator","Pickpocket"]],["A4-C1","c",["Techie"]],["A5-C1","c",["Hacker"]],["A6-C1","c",["Techie"]],["A7-C1","c",["Imitator"]],["A7S2","g"],["A3-C2","c",["Imitator"]],["A7S","g"],["A1F","b"],["A5-C2","c",["Hacker"]],["A2-C2","c",["Pickpocket"]],["A5-C3","c",["Imitator","Hacker"]],["A5F","b"],["A6-C2","c",["Imitator","Hacker"]],["A8S","g"],["A4-C2","c",["Techie","Pickpocket"]],["A9S","g"],["A2F","b"],["B6-C1","c",["Hacker"]],["B6F","b"],["A3-C3","c",["Pickpocket"]],["A3F","b"],["A4F","b"],["B7S","g"]],"e":[["Prelude","A1-C1"],["A1-C1F","A1-C2"],["A1-C2F","A1-C3"],["A1-C3P","A2-C1"],["A2-C1P","A3-C1"],["A3-C1P","A4-C1"],["A4-C1P","A5-C1"],["A5-C1P","A6-C1"],["A6-C1P","A7-C1"],["A7-C1F","A7S2"],["A1-C2P","A2-C1"],["A3-C1F","A3-C2"],["A3-C2P","A4-C1"],["A7-C1P","A7S"],["A1-C1P","A2-C1"],["A1-C3F","A1F"],["A5-C1F","A5-C2"],["A5-C2P","A6-C1"],["A2-C1F","A2-C2"],["A2-C2P","A3-C1"],["A5-C2F","A5-C3"],["A5-C3F","A5F"],["A6-C1F","A6-C2"],["A6-C2P","A8S"],["A4-C1F","A4-C2"],["A4-C2P","A5-C1"],["A6-C2F","A9S"],["A2-C2F","A2F"],["A5-C3P","B6-C1"],["B6-C1F","B6F"],["A3-C2F","A3-C3"],["A3-C3P","A4-C1"],["A3-C3F","A3F"],["A4-C2F","A4F"],["B6-C1P","B7S"]],"w":{"Pickpocket":51,"Imitator":18,"Techie":17,"Hacker":14}},"cranereaction":{"v":"V1","name":"Crane Reaction","roles":{"sniper":"Sniper","lookout":"Lookout","bomber":"Bomber","muscle1":"Muscle1","muscle2":"Muscle2","engineer":"Engineer"},"n":[["A1-C1","c",["Muscle1","Muscle2"]],["A1-C2","c",["Sniper"]],["A2-C1","c",["Lookout","Engineer"]],["A3-C1","c",["Bomber"]],["A4-C1","c",["Sniper","Lookout"]],["A5-C1","c",["Engineer","Bomber"]],["A5-C2","c",["Engineer","Bomber"]],["A6-C1","c",["Sniper","Lookout"]],["A7-C1","c",["Muscle1","Muscle2"]],["A8S","g"],["A1-C3","c",["Muscle1"]],["A4-C2","c",["Sniper","Lookout"]],["A4-C3","c",["Muscle1","Muscle2"]],["A6-C2","c",["Muscle1","Muscle2"]],["B7-C1","c",["Sniper","Lookout","Muscle1","Muscle2"]],["B7S","g"],["A1F","b"],["A2-C2","c",["Sniper"]],["A2F","b"],["B5-C1","c",["Engineer","Bomber"]],["B6-C1","c",["Sniper","Lookout"]],["B6-C2","c",["Lookout"]],["B7-C2","c",["Sniper","Lookout"]],["B7F","b"],["A7-C2","c",["Bomber"]],["A8S2","g"],["A7-C3","c",["Muscle1","Muscle2"]],["A8S3","g"],["A3-C2","c",["Sniper"]],["A3F","b"],["A7F","b"],["A4F","b"],["B5-C2","c",["Engineer","Bomber"]],["B7S2","g"],["B5F","b"],["B6F","b"]],"e":[["Prelude","A1-C1"],["A1-C1F","A1-C2"],["A1-C2P","A2-C1"],["A2-C1P","A3-C1"],["A3-C1P","A4-C1"],["A4-C1P","A5-C1"],["A5-C1F","A5-C2"],["A5-C2P","A6-C1"],["A6-C1P","A7-C1"],["A7-C1P","A8S"],["A1-C2F","A1-C3"],["A1-C3P","A2-C1"],["A5-C1P","A6-C1"],["A4-C1F","A4-C2"],["A4-C2F","A4-C3"],["A4-C3P","A5-C1"],["A6-C1F","A6-C2"],["A6-C2P","B7-C1"],["B7-C1P","B7S"],["A1-C3F","A1F"],["A1-C1P","A2-C1"],["A2-C1F","A2-C2"],["A2-C2F","A2F"],["A5-C2F","B5-C1"],["B5-C1P","B6-C1"],["B6-C1F","B6-C2"],["B6-C2P","B7-C1"],["B7-C1F","B7-C2"],["B7-C2F","B7F"],["A7-C1F","A7-C2"],["A7-C2P","A8S2"],["A7-C2F","A7-C3"],["A7-C3P","A8S3"],["A2-C2P","A3-C1"],["A3-C1F","A3-C2"],["A3-C2F","A3F"],["A3-C2P","A4-C1"],["A6-C2F","B6-C1"],["B6-C1P","B7-C1"],["A4-C2P","A5-C1"],["A7-C3F","A7F"],["A4-C3F","A4F"],["B5-C1F","B5-C2"],["B5-C2P","B6-C1"],["B7-C2P","B7S2"],["B5-C2F","B5F"],["B6-C2F","B6F"]],"w":{"Sniper":41,"Lookout":17,"Bomber":16,"Muscle1":10,"Muscle2":8,"Engineer":8}},"gonefission":{"v":"V1","name":"Gone Fission","roles":{"hijacker":"Hijacker","imitator":"Imitator","bomber":"Bomber","pickpocket":"Pickpocket","engineer":"Engineer"},"n":[["A1-C1","c",["Hijacker"]],["A2-C1","c",["Hijacker"]],["A3-C1","c",["Engineer"]],["A4-C1","c",["Imitator"]],["A5-C1","c",["Imitator","Pickpocket"]],["A6-C1","c",["Bomber"]],["A7-C1","c",["Imitator"]],["A7-C2","c",["Engineer"]],["A8S2","g"],["A2-C2","c",["Engineer","Hijacker"]],["A5-C2","c",["Imitator","Pickpocket"]],["A6-C2","c",["Bomber"]],["A1-C2","c",["Bomber"]],["A3-C2","c",["Bomber","Engineer"]],["A4-C2","c",["Pickpocket"]],["A8S3","g"],["A2F","b"],["A3-C3","c",["Engineer"]],["A3F","b"],["A1-C3","c",["Hijacker"]],["A8S","g"],["A5F","b"],["A6-C3","c",["Bomber","Pickpocket"]],["A6F","b"],["A4-C3","c",["Imitator"]],["A4F","b"],["A1X","u"]],"e":[["Prelude","A1-C1"],["A1-C1P","A2-C1"],["A2-C1P","A3-C1"],["A3-C1P","A4-C1"],["A4-C1P","A5-C1"],["A5-C1P","A6-C1"],["A6-C1P","A7-C1"],["A7-C1F","A7-C2"],["A7-C2P","A8S2"],["A2-C1F","A2-C2"],["A2-C2P","A3-C1"],["A5-C1F","A5-C2"],["A5-C2P","A6-C1"],["A6-C1F","A6-C2"],["A6-C2P","A7-C1"],["A1-C1F","A1-C2"],["A1-C2P","A2-C1"],["A3-C1F","A3-C2"],["A3-C2P","A4-C1"],["A4-C1F","A4-C2"],["A4-C2P","A5-C1"],["A7-C2F","A8S3"],["A2-C2F","A2F"],["A3-C2F","A3-C3"],["A3-C3F","A3F"],["A1-C2F","A1-C3"],["A1-C3P","A2-C1"],["A7-C1P","A8S"],["A3-C3P","A4-C1"],["A5-C2F","A5F"],["A6-C2F","A6-C3"],["A6-C3P","A7-C1"],["A6-C3F","A6F"],["A4-C2F","A4-C3"],["A4-C3P","A5-C1"],["A4-C3F","A4F"],["A1-C3F","A1X"]],"w":{"Hijacker":25,"Imitator":25,"Bomber":18,"Pickpocket":17,"Engineer":15}},"manifestcruelty":{"v":"V1","name":"Manifest Cruelty","roles":{"reviver":"Reviver","interrogator":"Interrogator","hacker":"Hacker","catburglar":"CatBurglar"},"n":[["A1-C1","c",["Interrogator","CatBurglar"]],["A2-C1","c",["Interrogator"]],["A3-C1","c",["CatBurglar"]],["B4-C1","c",["Interrogator"]],["B5-C1","c",["Reviver"]],["B5-C2","c",["Reviver"]],["B6-C1","c",["Hacker","CatBurglar"]],["B7S","g"],["A4-C1","c",["Hacker"]],["B4-C2","c",["Reviver"]],["A1-C2","c",["Hacker","Reviver"]],["B4-C3","c",["Interrogator","Reviver"]],["B6-C2","c",["Hacker","CatBurglar"]],["A5-C1","c",["Reviver"]],["A5-C2","c",["Reviver"]],["A5F","b"],["A2-C2","c",["Interrogator"]],["A6-C1","c",["Hacker"]],["A7-C1","c",["Interrogator"]],["A8S","g"],["A6-C2","c",["CatBurglar"]],["A6-C3","c",["Hacker","CatBurglar"]],["A1-C3","c",["Hacker","Reviver"]],["A1F","b"],["B4F","b"],["A7-C2","c",["Interrogator","Reviver"]],["A7S","g"],["A2-C3","c",["Reviver"]],["A7F","b"],["A2F","b"],["B5F","b"],["B6F","b"],["A6F","b"]],"e":[["Prelude","A1-C1"],["A1-C1P","A2-C1"],["A2-C1P","A3-C1"],["A3-C1F","B4-C1"],["B4-C1P","B5-C1"],["B5-C1F","B5-C2"],["B5-C2P","B6-C1"],["B6-C1P","B7S"],["A3-C1P","A4-C1"],["A4-C1F","B4-C1"],["B4-C1F","B4-C2"],["B4-C2P","B5-C1"],["A1-C1F","A1-C2"],["A1-C2P","A2-C1"],["B4-C2F","B4-C3"],["B4-C3P","B5-C1"],["B5-C1P","B6-C1"],["B6-C1F","B6-C2"],["B6-C2P","B7S"],["A4-C1P","A5-C1"],["A5-C1F","A5-C2"],["A5-C2F","A5F"],["A2-C1F","A2-C2"],["A2-C2P","A3-C1"],["A5-C1P","A6-C1"],["A6-C1P","A7-C1"],["A7-C1P","A8S"],["A6-C1F","A6-C2"],["A6-C2F","A6-C3"],["A6-C3P","A7-C1"],["A1-C2F","A1-C3"],["A1-C3P","A2-C1"],["A1-C3F","A1F"],["B4-C3F","B4F"],["A6-C2P","A7-C1"],["A5-C2P","A6-C1"],["A7-C1F","A7-C2"],["A7-C2P","A7S"],["A2-C2F","A2-C3"],["A2-C3P","A3-C1"],["A7-C2F","A7F"],["A2-C3F","A2F"],["B5-C2F","B5F"],["B6-C2F","B6F"],["A6-C3F","A6F"]],"w":{"Reviver":46,"Interrogator":24,"Hacker":16,"CatBurglar":14}},"windowofopportunity":{"v":"","name":"Window of Opportunity","roles":{"looter2":"Looter2","muscle1":"Muscle1","looter1":"Looter1","muscle2":"Muscle2","engineer":"Engineer"},"n":[["A1-C1","c",["Engineer"]],["A2-C1","c",["Muscle1","Muscle2"]],["A3-C1","c",["Looter1","Looter2"]],["A4-C1","c",["Engineer","Looter2"]],["A5-C1","c",["Looter1"]],["A6-C1","c",["Muscle1","Muscle2"]],["A7-C1","c",["Engineer","Muscle1"]],["A7-C2","c",["Muscle1","Muscle2"]],["A5-C2","c",["Looter1","Muscle1"]],["C6-C1","c",["Muscle1","Muscle2"]],["A4-C2","c",["Engineer","Looter2"]],["A1-C2","c",["Engineer"]],["A1-C3","c",["Engineer"]],["A2-C2","c",["Muscle1","Muscle2"]],["B5-C1","c",["Looter1"]],["B5-C2","c",["Looter1"]],["B6-C1","c",["Engineer","Looter2"]],["B7-C1","c",["Muscle1","Muscle2"]],["A3-C2","c",["Looter1","Looter2"]],["C6-C2","c",["Looter2"]],["A7-C3","c",["Looter2","Muscle1"]],["B7-C2","c",["Looter1","Looter2"]],["B6-C2","c",["Looter1","Looter2"]],["B6-C3","c",["Looter1","Looter2"]],["B7-C3","c",["Muscle1","Muscle2"]],["B5-C3","c",["Looter1"]],["A8S2","g"],["C6S","g"],["A8S","g"],["B8S","g"],["A8S3","g"],["B8S2","g"],["A1F","b"],["A2F","b"],["A3F","b"],["A7F","b"],["B7F","b"],["C6F","b"],["B5F","b"],["B6F","b"]],"e":[["Prelude","A1-C1"],["A1-C1F","A1-C2"],["A1-C1P","A2-C1"],["A2-C1P","A3-C1"],["A2-C1F","A2-C2"],["A3-C1P","A4-C1"],["A3-C1F","A3-C2"],["A4-C1P","A5-C1"],["A4-C1F","A4-C2"],["A5-C1P","A6-C1"],["A5-C1F","A5-C2"],["A5-C2P","A6-C1"],["A5-C2F","B5-C1"],["B5-C1F","B5-C2"],["B5-C1P","B6-C1"],["B5-C2F","B5-C3"],["B5-C2P","B6-C1"],["B6-C1P","B7-C1"],["B6-C1F","B6-C2"],["B7-C1P","B8S"],["B7-C1F","B7-C2"],["A3-C2F","A3F"],["A3-C2P","A4-C1"],["A6-C1P","A7-C1"],["A6-C1F","C6-C1"],["A7-C1F","A7-C2"],["A7-C1P","A8S"],["A7-C2P","A8S2"],["A7-C2F","A7-C3"],["C6-C1P","C6S"],["C6-C1F","C6-C2"],["A4-C2P","A5-C1"],["A4-C2F","B5-C1"],["C6-C2F","C6F"],["C6-C2P","C6S"],["A1-C2P","A2-C1"],["A1-C2F","A1-C3"],["A1-C3P","A2-C1"],["A1-C3F","A1F"],["A2-C2F","A2F"],["A2-C2P","A3-C1"],["A7-C3F","A7F"],["A7-C3P","A8S3"],["B7-C2F","B7-C3"],["B7-C2P","B8S"],["B6-C2F","B6-C3"],["B6-C2P","B7-C3"],["B6-C3F","B6F"],["B6-C3P","B7-C3"],["B7-C3F","B7F"],["B7-C3P","B8S2"],["B5-C3P","B6-C1"],["B5-C3F","B5F"]],"w":{"Looter2":25,"Muscle1":23,"Looter1":20,"Muscle2":17,"Engineer":15}},"thoushaltnotsteal":{"v":"","name":"Thou Shalt Not Steal","roles":{"picklock":"Picklock","pickpocket":"Pickpocket","thief":"Thief"},"n":[["A1-C1","c",["Thief"]],["A1-C2","c",["Pickpocket"]],["A2-C1","c",["Pickpocket"]],["A3-C1","c",["Picklock"]],["A3-C2","c",["Picklock"]],["A4-C1","c",["Thief"]],["A5-C1","c",["Picklock"]],["A6-C1","c",["Pickpocket"]],["A6-C2","c",["Pickpocket"]],["A5-C2","c",["Thief","Picklock"]],["A5-C4","c",["Pickpocket"]],["A2-C2","c",["Pickpocket","Thief"]],["B3-C1","c",["Thief","Picklock"]],["B4-C1","c",["Picklock"]],["B4-C2","c",["Thief","Picklock"]],["A4-C2","c",["Thief"]],["A5-C3","c",["Thief"]],["A1-C3","c",["Picklock"]],["B5-C1","c",["Picklock","Thief"]],["B6-C1","c",["Pickpocket"]],["B5-C2","c",["Thief","Picklock"]],["A7S","g"],["A7S2","g"],["A6S","g"],["A5S","g"],["B7S","g"],["B7S2","g"],["B4F","b"],["A5F2","b"],["B3F","b"],["A2F","b"],["A5F","b"],["B5F","b"],["A1X","u"]],"e":[["Prelude","A1-C1"],["A1-C1F","A1-C2"],["A1-C1P","A2-C1"],["A1-C2P","A2-C1"],["A1-C2F","A1-C3"],["A2-C1F","A2-C2"],["A2-C1P","A3-C1"],["A3-C1P","A4-C1"],["A3-C1F","A3-C2"],["A3-C2F","B3-C1"],["A3-C2P","A4-C1"],["A4-C1F","A4-C2"],["A4-C1P","A5-C1"],["A5-C1F","A5-C2"],["A5-C1P","A6-C1"],["A6-C1P","A7S"],["A6-C1F","A6-C2"],["A6-C2F","A6S"],["A6-C2P","A7S2"],["A5-C2P","A5-C4"],["A5-C2F","A5-C3"],["A5-C4F","A5F2"],["A5-C4P","A5S"],["A2-C2F","A2F"],["A2-C2P","A3-C1"],["B3-C1F","B3F"],["B3-C1P","B4-C1"],["B4-C1F","B4-C2"],["B4-C1P","B5-C1"],["B4-C2F","B4F"],["B4-C2P","B5-C1"],["A4-C2F","B4-C1"],["A4-C2P","A5-C1"],["A5-C3F","A5F"],["A5-C3P","A5-C4"],["A1-C3P","A2-C1"],["B5-C1F","B5-C2"],["B5-C1P","B6-C1"],["B6-C1F","B7S2"],["B6-C1P","B7S"],["B5-C2P","B6-C1"],["B5-C2F","B5F"],["A1-C3F","A1X"]],"w":{"Picklock":50,"Pickpocket":38,"Thief":12}},"dishitout":{"v":"","name":"Dish It Out","roles":{"assassin":"Assassin","muscle":"Muscle","saboteur1":"Saboteur1","engineer":"Engineer","saboteur2":"Saboteur2"},"n":[["A1-C1","c",["Engineer"]],["A1-C2","c",["Engineer"]],["A2-C1","c",["Assassin"]],["A3-C1","c",["Saboteur1"]],["A3-C2","c",["Saboteur1"]],["B3-C1","c",["Saboteur1","Saboteur2"]],["B4-C1","c",["Assassin","Muscle"]],["B4-C2","c",["Muscle"]],["A4-C1","c",["Muscle"]],["A4-C2","c",["Assassin","Muscle"]],["A5-C1","c",["Saboteur2"]],["A6-C1","c",["Muscle"]],["A7-C1","c",["Engineer"]],["A2-C2","c",["Assassin"]],["B5-C1","c",["Saboteur1","Engineer"]],["B6-C1","c",["Muscle"]],["B6-C2","c",["Assassin","Muscle","Saboteur1","Saboteur2"]],["B5-C2","c",["Saboteur2","Engineer"]],["A6-C2","c",["Assassin","Muscle"]],["A7-C2","c",["Assassin","Muscle"]],["A7-C3","c",["Engineer"]],["B5-C3","c",["Saboteur2"]],["B3-C2","c",["Saboteur1","Saboteur2"]],["A1-C3","c",["Saboteur1","Engineer"]],["A8S","g"],["A8S2","g"],["A8S3","g"],["B7S2","g"],["B7S","g"],["B4F","b"],["B6F","b"],["B5F","b"],["B3F","b"],["A2F","b"],["A4F","b"],["A1X","u"],["A7X","u"]],"e":[["Prelude","A1-C1"],["A1-C1P","A2-C1"],["A1-C1F","A1-C2"],["A1-C2F","A1-C3"],["A1-C2P","A2-C1"],["A2-C1F","A2-C2"],["A2-C1P","A3-C1"],["A3-C1P","A4-C1"],["A3-C1F","A3-C2"],["A3-C2P","A4-C1"],["A3-C2F","B3-C1"],["B3-C1P","B4-C1"],["B3-C1F","B3-C2"],["B4-C1P","B5-C1"],["B4-C1F","B4-C2"],["B4-C2F","B4F"],["B4-C2P","B5-C1"],["A4-C1P","A5-C1"],["A4-C1F","A4-C2"],["A4-C2F","A4F"],["A4-C2P","A5-C1"],["A5-C1P","A6-C1"],["A5-C1F","B5-C1"],["A6-C1F","A6-C2"],["A6-C1P","A7-C1"],["A7-C1P","A8S"],["A7-C1F","A7-C2"],["A2-C2P","A3-C1"],["A2-C2F","A2F"],["B5-C1P","B6-C1"],["B5-C1F","B5-C2"],["B6-C1P","B7S"],["B6-C1F","B6-C2"],["B6-C2F","B6F"],["B6-C2P","B7S2"],["B5-C2P","B6-C1"],["B5-C2F","B5-C3"],["A6-C2P","A7-C1"],["A6-C2F","B6-C1"],["A7-C2F","A7-C3"],["A7-C2P","A8S2"],["A7-C3P","A8S3"],["B5-C3F","B5F"],["B5-C3P","B6-C1"],["B3-C2P","B4-C1"],["B3-C2F","B3F"],["A1-C3P","A2-C1"],["A1-C3X","A1X"],["A7-C3X","A7X"]],"w":{"Assassin":37,"Muscle":25,"Saboteur1":15,"Engineer":14,"Saboteur2":9}},"honeytrap":{"v":"","name":"Honey Trap","roles":{"muscle2":"Muscle2","muscle1":"Muscle1","enforcer":"Enforcer"},"n":[["A1-C1","c",["Enforcer"]],["A1-C2","c",["Muscle1"]],["A1-C3","c",["Muscle2"]],["A2-C1","c",["Muscle1"]],["A2-C2","c",["Enforcer"]],["A2-C3","c",["Muscle2"]],["A3-C1","c",["Enforcer"]],["B1-C1","c",["Muscle2"]],["B2-C1","c",["Muscle1","Muscle2"]],["B2-C2","c",["Muscle2"]],["B2S","g"],["B1-C2","c",["Muscle2"]],["B2F","b"],["A4-C1","c",["Enforcer"]],["A4-C2","c",["Muscle1","Muscle2"]],["A5-C2","c",["Muscle1"]],["A6-C2","c",["Muscle2"]],["A6S","g"],["A5-C1","c",["Muscle2"]],["A6-C1","c",["Muscle1","Muscle2"]],["A7-C1","c",["Enforcer","Muscle1"]],["A8S","g"],["A5F","b"],["A7S","g"],["B1F","b"],["A4F","b"],["A2F","b"],["A1F","b"]],"e":[["Prelude","A1-C1"],["A1-C1F","A1-C2"],["A1-C2F","A1-C3"],["A1-C3P","A2-C1"],["A2-C1F","A2-C2"],["A2-C2F","A2-C3"],["A2-C3P","A3-C1"],["A3-C1F","B1-C1"],["B1-C1P","B2-C1"],["B2-C1F","B2-C2"],["B2-C2P","B2S"],["B2-C1P","B2S"],["A1-C2P","A2-C1"],["A2-C2P","A3-C1"],["B1-C1F","B1-C2"],["B1-C2P","B2-C1"],["B2-C2F","B2F"],["A3-C1P","A4-C1"],["A4-C1F","A4-C2"],["A4-C2P","A5-C2"],["A5-C2P","A6-C2"],["A6-C2F","A6S"],["A1-C1P","A2-C1"],["A4-C1P","A5-C1"],["A5-C1P","A6-C1"],["A6-C1F","A6-C2"],["A6-C2P","A7-C1"],["A7-C1P","A8S"],["A5-C2F","A5F"],["A5-C1F","A5-C2"],["A7-C1F","A7S"],["B1-C2F","B1F"],["A2-C1P","A3-C1"],["A6-C1P","A7-C1"],["A4-C2F","A4F"],["A2-C3F","A2F"],["A1-C3F","A1F"]],"w":{"Muscle2":42,"Muscle1":31,"Enforcer":27}},"pluckingthelotuspetal":{"v":"","name":"Plucking the Lotus Petal","roles":{"muscle":"Muscle","robber2":"Robber2","hustler":"Hustler","robber1":"Robber1"},"n":[["A1-C1","c",["Hustler"]],["A2-C1","c",["Muscle"]],["A3-C1","c",["Robber1"]],["A4-C1","c",["Robber2"]],["A4-C2","c",["Robber2"]],["A5-C1","c",["Hustler","Muscle"]],["A6-C1","c",["Muscle"]],["A7-C1","c",["Robber1","Robber2"]],["A2-C2","c",["Muscle"]],["C2-C1","c",["Muscle"]],["C3-C1","c",["Hustler"]],["C4-C1","c",["Muscle"]],["C4-C2","c",["Muscle"]],["C5-C1","c",["Robber1","Robber2"]],["C5-C2","c",["Muscle"]],["A6-C2","c",["Muscle"]],["A3-C2","c",["Robber1"]],["A5-C2","c",["Hustler"]],["C2-C2","c",["Muscle"]],["B6-C1","c",["Robber1","Robber2"]],["B7-C1","c",["Robber1","Robber2"]],["B7-C2","c",["Robber1","Robber2"]],["A3-C3","c",["Robber2","Robber1"]],["B6-C2","c",["Robber1","Robber2"]],["C3-C2","c",["Hustler"]],["A8S","g"],["A8S2","g"],["C6S","g"],["B8S","g"],["C4F","b"],["C2F","b"],["A4F","b"],["C3F","b"],["A2F","b"],["A3F","b"],["C5F","b"],["B7F","b"],["B6F","b"]],"e":[["Prelude","A1-C1"],["A1-C1P","A2-C1"],["A1-C1F","C2-C1"],["A2-C1P","A3-C1"],["A2-C1F","A2-C2"],["A3-C1F","A3-C2"],["A3-C1P","A4-C1"],["A4-C1P","A5-C1"],["A4-C1F","A4-C2"],["A4-C2P","A5-C1"],["A4-C2F","A4F"],["A5-C1F","A5-C2"],["A5-C1P","A6-C1"],["A6-C1P","A7-C1"],["A6-C1F","A6-C2"],["A7-C1P","A8S"],["A7-C1F","A8S2"],["A2-C2P","A3-C1"],["A2-C2F","A2F"],["C2-C1P","C3-C1"],["C2-C1F","C2-C2"],["C3-C1F","C3-C2"],["C3-C1P","C4-C1"],["C4-C1F","C4-C2"],["C4-C1P","C5-C1"],["C4-C2F","C4F"],["C4-C2P","C5-C1"],["C5-C1F","C5-C2"],["C5-C1P","C6S"],["C5-C2F","C5F"],["C5-C2P","C6S"],["A6-C2P","A7-C1"],["A6-C2F","B6-C1"],["A3-C2F","A3-C3"],["A3-C2P","A4-C1"],["A5-C2P","A6-C1"],["A5-C2F","B6-C1"],["C2-C2F","C2F"],["C2-C2P","C3-C1"],["B6-C1P","B7-C1"],["B6-C1F","B6-C2"],["B7-C1P","B8S"],["B7-C1F","B7-C2"],["B7-C2P","B8S"],["B7-C2F","B7F"],["A3-C3F","A3F"],["A3-C3P","A4-C1"],["B6-C2P","B7-C1"],["B6-C2F","B6F"],["C3-C2P","C4-C1"],["C3-C2F","C3F"]],"w":{"Muscle":48,"Robber2":24,"Hustler":14,"Robber1":14}},"lockstock":{"v":"","name":"Lock Stock","roles":{"assassin":"Assassin","smuggler":"Smuggler","hacker":"Hacker","muscle1":"Muscle1","muscle2":"Muscle2"},"n":[["A1-C1","c",["Muscle1","Muscle2"]],["A1-C2","c",["Muscle1","Muscle2"]],["A2-C1","c",["Assassin"]],["A3-C1","c",["Assassin"]],["A3-C2","c",["Assassin"]],["A4-C1","c",["Hacker"]],["A5-C1","c",["Muscle1","Muscle2"]],["A6-C1","c",["Smuggler"]],["A6-C2","c",["Smuggler"]],["A7-C1","c",["Hacker"]],["A2-C2","c",["Assassin"]],["A7-C2","c",["Hacker"]],["A5-C2","c",["Muscle1","Muscle2"]],["A5-C3","c",["Smuggler","Muscle1","Muscle2"]],["A7-C3","c",["Hacker","Smuggler"]],["A6-C3","c",["Smuggler","Muscle1","Muscle2"]],["A4-C2","c",["Hacker"]],["A1-C3","c",["Assassin"]],["A2-C3","c",["Assassin"]],["A3-C3","c",["Assassin"]],["A4-C3","c",["Hacker"]],["A8S","g"],["A8S2","g"],["A7F","b"],["A8S3","g"],["A6F","b"],["A3F","b"],["A4F","b"],["A2F","b"],["A3F2","b"],["A5F","b"],["A1X","u"]],"e":[["Prelude","A1-C1"],["A1-C1P","A2-C1"],["A1-C1F","A1-C2"],["A1-C2P","A2-C1"],["A1-C2F","A1-C3"],["A2-C1P","A3-C1"],["A2-C1F","A2-C2"],["A3-C1P","A4-C1"],["A3-C1F","A3-C2"],["A3-C2P","A4-C1"],["A3-C2F","A3F2"],["A4-C1F","A4-C2"],["A4-C1P","A5-C1"],["A5-C1P","A6-C1"],["A5-C1F","A5-C2"],["A6-C1P","A7-C1"],["A6-C1F","A6-C2"],["A6-C2P","A7-C1"],["A6-C2F","A6-C3"],["A7-C1F","A7-C2"],["A7-C1P","A8S"],["A2-C2F","A2-C3"],["A2-C2P","A3-C1"],["A7-C2P","A8S2"],["A7-C2F","A7-C3"],["A5-C2P","A6-C1"],["A5-C2F","A5-C3"],["A5-C3F","A5F"],["A5-C3P","A6-C1"],["A7-C3F","A7F"],["A7-C3P","A8S3"],["A6-C3P","A7-C3"],["A6-C3F","A6F"],["A4-C2F","A4-C3"],["A4-C2P","A5-C1"],["A1-C3P","A2-C1"],["A2-C3P","A3-C3"],["A2-C3F","A2F"],["A3-C3P","A4-C1"],["A3-C3F","A3F"],["A4-C3P","A5-C1"],["A4-C3F","A4F"],["A1-C3X","A1X"]],"w":{"Assassin":38,"Smuggler":25,"Hacker":15,"Muscle1":11,"Muscle2":11}},"hostiletakeover":{"v":"","name":"Hostile Takeover","roles":{"negotiator":"Negotiator","engineer":"Engineer","catburglar":"CatBurglar","muscle":"Muscle","kidnapper":"Kidnapper","hacker":"Hacker"},"n":[["A1-C1","c",["Muscle"]],["A2-C1","c",["Kidnapper","Negotiator"]],["A2-C2","c",["Negotiator"]],["A3-C1","c",["CatBurglar","Engineer"]],["A4-C1","c",["Engineer"]],["B4-C1","c",["CatBurglar"]],["B4-C2","c",["CatBurglar"]],["A1-C2","c",["Negotiator"]],["A1-C3","c",["Kidnapper","Negotiator","Muscle"]],["A5-C1","c",["Hacker"]],["A6-C1","c",["Negotiator"]],["A7-C1","c",["Kidnapper","Negotiator"]],["B5-C1","c",["Hacker"]],["B6-C1","c",["Kidnapper"]],["B6-C2","c",["Negotiator","Kidnapper"]],["B7-C1","c",["Negotiator","Muscle"]],["B7-C2","c",["CatBurglar","Muscle"]],["B5-C2","c",["Hacker"]],["A6-C2","c",["Negotiator"]],["A5-C3","c",["Engineer","Hacker"]],["A7-C2","c",["Muscle"]],["A2-C3","c",["Muscle"]],["A6-C3","c",["Negotiator","Muscle"]],["A7-C3","c",["CatBurglar","Muscle"]],["A8S","g"],["A8S3","g"],["A8S2","g"],["B8S","g"],["B8S2","g"],["B4F","b"],["B6F","b"],["A1F","b"],["B7F","b"],["B5F","b"],["A5F","b"],["A7F","b"],["A2F","b"],["A6F","b"]],"e":[["Prelude","A1-C1"],["A1-C1F","A1-C2"],["A1-C1P","A2-C1"],["A2-C1P","A3-C1"],["A2-C1F","A2-C2"],["A2-C2P","A3-C1"],["A2-C2F","A2-C3"],["A3-C1F","B4-C1"],["A3-C1P","A4-C1"],["A4-C1F","B4-C1"],["A4-C1P","A5-C1"],["B4-C1P","B5-C1"],["B4-C1F","B4-C2"],["B4-C2F","B4F"],["B4-C2P","B5-C1"],["A1-C2F","A1-C3"],["A1-C2P","A2-C1"],["A1-C3P","A2-C1"],["A1-C3F","A1F"],["A5-C1P","A6-C1"],["A5-C1F","A5-C2"],["A6-C1P","A7-C1"],["A6-C1F","A6-C2"],["A7-C1F","A7-C2"],["A7-C1P","A8S"],["B5-C1F","B5-C2"],["B5-C1P","B6-C1"],["B6-C1P","B7-C1"],["B6-C1F","B6-C2"],["B6-C2P","B7-C1"],["B6-C2F","B6F"],["B7-C1F","B7-C2"],["B7-C1P","B8S"],["B7-C2F","B7F"],["B7-C2P","B8S2"],["B5-C2P","B6-C1"],["B5-C2F","B5F"],["A6-C2F","A6-C3"],["A6-C2P","A7-C1"],["A5-C2F","A5-C3"],["A5-C2P","A6-C1"],["A5-C3F","A5F"],["A5-C3P","A6-C1"],["A7-C2F","A7-C3"],["A7-C2P","A8S2"],["A2-C3P","A3-C1"],["A2-C3F","A2F"],["A6-C3F","A6F"],["A6-C3P","A7-C1"],["A7-C3P","A8S3"],["A7-C3F","A7F"]],"w":{"Negotiator":25,"Engineer":20,"CatBurglar":17,"Muscle":15,"Kidnapper":13,"Hacker":10}},"clearedfortakeoff":{"v":"","name":"Cleared for Takeoff","roles":{"interrogator":"Interrogator","imitator":"Imitator","assassin":"Assassin","pickpocket":"Pickpocket","techie":"Techie","lookout":"Lookout"},"n":[["A1-C1","c",["Lookout","Pickpocket"]],["A2-C1","c",["Imitator","Techie"]],["A2-C2","c",["Imitator"]],["A3-C1","c",["Imitator","Techie"]],["A4-C1","c",["Imitator","Pickpocket"]],["B4-C1","c",["Assassin"]],["B5-C1","c",["Interrogator"]],["B6-C1","c",["Pickpocket"]],["B7-C1","c",["Techie","Interrogator"]],["A1-C2","c",["Lookout","Pickpocket"]],["B5-C2","c",["Interrogator"]],["A3-C2","c",["Imitator","Techie","Lookout"]],["A3-C3","c",["Imitator","Lookout"]],["A1-C3","c",["Assassin"]],["A2-C3","c",["Interrogator"]],["A5-C1","c",["Assassin"]],["A6-C1","c",["Interrogator"]],["A6-C2","c",["Assassin"]],["A7-C2","c",["Interrogator","Techie","Assassin"]],["A7-C3","c",["Imitator","Interrogator"]],["A5-C2","c",["Assassin"]],["A7-C1","c",["Techie"]],["B4-C2","c",["Assassin","Interrogator"]],["A5-C3","c",["Interrogator"]],["B7-C2","c",["Imitator"]],["B6-C2","c",["Lookout","Assassin","Pickpocket"]],["A8S","g"],["A8S2","g"],["A8S3","g"],["B8S","g"],["B8S2","g"],["B5F","b"],["A3F","b"],["A1F","b"],["A2F","b"],["A5F","b"],["B4F","b"],["A7F","b"],["B7F","b"],["B6F","b"]],"e":[["Prelude","A1-C1"],["A1-C1F","A1-C2"],["A1-C1P","A2-C1"],["A2-C1P","A3-C1"],["A2-C1F","A2-C2"],["A2-C2P","A3-C1"],["A2-C2F","A2-C3"],["A3-C1P","A4-C1"],["A3-C1F","A3-C2"],["A4-C1F","B4-C1"],["A4-C1P","A5-C1"],["B4-C1P","B5-C1"],["B4-C1F","B4-C2"],["B5-C1P","B6-C1"],["B5-C1F","B5-C2"],["B6-C1F","B6-C2"],["B6-C1P","B7-C1"],["B7-C1P","B8S"],["B7-C1F","B7-C2"],["A1-C2P","A2-C1"],["A1-C2F","A1-C3"],["B5-C2P","B6-C1"],["B5-C2F","B5F"],["A3-C2P","A4-C1"],["A3-C2F","A3-C3"],["A3-C3P","B4-C1"],["A3-C3F","A3F"],["A1-C3F","A1F"],["A1-C3P","A2-C1"],["A2-C3P","A3-C1"],["A2-C3F","A2F"],["A5-C1P","A6-C1"],["A5-C1F","A5-C2"],["A6-C1F","A6-C2"],["A6-C1P","A7-C1"],["A6-C2F","A7-C3"],["A6-C2P","A7-C2"],["A7-C2P","A8S2"],["A7-C2F","A7-C3"],["A7-C3F","A7F"],["A7-C3P","A8S3"],["A5-C2F","A5-C3"],["A5-C2P","A6-C1"],["A7-C1F","A7-C2"],["A7-C1P","A8S"],["B4-C2P","B5-C1"],["B4-C2F","B4F"],["A5-C3P","A6-C1"],["A5-C3F","A5F"],["B7-C2F","B7F"],["B7-C2P","B8S2"],["B6-C2F","B6F"],["B6-C2P","B7-C1"]],"w":{"Interrogator":25,"Imitator":25,"Assassin":18,"Pickpocket":12,"Techie":11,"Lookout":9}}};

  // Safe GM storage wrappers (TornPDA / managers that lack GM_* fall back to localStorage)
  function gmGet(key, def) {
    try {
      if (typeof GM_getValue === "function") return GM_getValue(key, def);
    } catch (e) { /* fall through */ }
    try {
      const raw = localStorage.getItem("tt2p_gm_" + key);
      return raw === null ? def : JSON.parse(raw);
    } catch (e) { return def; }
  }
  function gmSet(key, val) {
    try {
      if (typeof GM_setValue === "function") return GM_setValue(key, val);
    } catch (e) { /* fall through */ }
    try { localStorage.setItem("tt2p_gm_" + key, JSON.stringify(val)); } catch (e) { /* quota */ }
  }

  let crimesHubData = BUILTIN_CRIMESHUB_DATA;
  let crimesHubSource = 'built-in (2026-10-03)';

  const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

  const get = (url) => new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: 'GET', url, timeout: 30000,
      onload: (r) => (r.status >= 200 && r.status < 300 ? resolve(r.responseText) : reject(new Error(r.status + ' ' + url))),
      onerror: () => reject(new Error('network error ' + url)),
      ontimeout: () => reject(new Error('timeout ' + url)),
    });
  });

  function braceBlock(s, i) {
    let depth = 0;
    for (let j = i; j < s.length; j++) {
      if (s[j] === '{') depth++;
      else if (s[j] === '}' && --depth === 0) return s.slice(i, j + 1);
    }
    return null;
  }

  function parseBundle(js) {
    const crimes = [];
    const re = /super\.setName\("((?:[^"\\]|\\.)*)"\),super\.setRoles\(/g;
    let m;
    while ((m = re.exec(js))) {
      const name = JSON.parse('"' + m[1].replace(/\\x([0-9a-fA-F]{2})/g, '\\u00$1') + '"');
      const rolesJs = braceBlock(js, re.lastIndex);
      if (!rolesJs) continue;
      const roles = {}, w = {};
      const roleRe = /([A-Za-z0-9_]+):\{name:"([^"]+)"/g;
      let r;
      while ((r = roleRe.exec(rolesJs))) {
        roles[norm(r[2])] = r[1];
        const weight = /weight:(\d+(?:\.\d+)?)/.exec(braceBlock(rolesJs, r.index + r[1].length + 1) || '');
        if (weight) w[r[1]] = parseFloat(weight[1]);
      }
      const rest = js.slice(re.lastIndex + rolesJs.length, re.lastIndex + rolesJs.length + 6000);
      const head = rest.slice(0, rest.indexOf('static'));
      const ver = /version:\{name:"([^"]+)"/.exec(head);
      const usesVersion = /super\.loadNodes\(this\.name,i\.version\?\.name\)/.test(head);
      crimes.push({ name, roles, w, v: ver && usesVersion ? ver[1] : '' });
    }
    return crimes;
  }

  async function fetchLive() {
    const html = await get(CRIMESHUB_SITE);
    const main = /src="(main-[A-Za-z0-9]+\.js)"/.exec(html);
    if (!main) throw new Error('main bundle not found');
    const crimes = parseBundle(await get(CRIMESHUB_SITE + main[1]));
    if (!crimes.length) throw new Error('no crimes found in bundle');

    const latest = {};
    for (const c of crimes) {
      const key = norm(c.name);
      if (!latest[key] || latest[key].v < c.v) latest[key] = c;
    }

    const out = {};
    await Promise.all(Object.entries(latest).map(async ([key, c]) => {
      const base = CRIMESHUB_SITE + 'assets/json/' + encodeURIComponent(c.name.replace(/\s/g, '').toLowerCase() + c.v.toLowerCase());
      try {
        const [checks, paths] = await Promise.all([get(base + '_checks.json'), get(base + '_paths.json')].map((p) => p.then(JSON.parse)));
        out[key] = {
          v: c.v, name: c.name, roles: c.roles, w: c.w,
          n: checks.filter((x) => x.type !== 'start').map((x) => (x.type === 'check'
            ? [x.id, 'c', x.data.roles]
            : [x.id, x.type === 'ending' ? (x.data.text[0] === 'G' ? 'g' : 'b') : 'u'])),
          e: paths.map((x) => [x.id, x.target]),
        };
      } catch (err) {
        console.warn('[OC Success] skipped', c.name, err.message);
      }
    }));
    if (!Object.keys(out).length) throw new Error('no crime data downloaded');
    return out;
  }

  let crimesHubInFlight = false;
  let crimesHubCheckedAt = 0;
  const CRIMESHUB_RETRY_MS = 10 * 60 * 1000;

  async function loadCrimesHubData() {
    // Avoid re-reading/re-fetching every time the user flicks between tabs
    if (crimesHubInFlight) return;
    if (Date.now() - crimesHubCheckedAt < CRIMESHUB_RETRY_MS) return;
    crimesHubInFlight = true;
    crimesHubCheckedAt = Date.now();
    try {
      await loadCrimesHubDataInner();
    } finally {
      crimesHubInFlight = false;
    }
  }

  async function loadCrimesHubDataInner() {
    const cached = gmGet(CRIMESHUB_CACHE_KEY, null);
    if (cached && cached.data) {
      crimesHubData = Object.assign({}, BUILTIN_CRIMESHUB_DATA, cached.data);
      crimesHubSource = 'CrimesHub, ' + new Date(cached.at).toLocaleString();
      runPass();
      if (Date.now() - cached.at < CRIMESHUB_REFRESH_MS) return;
    }
    try {
      const data = await fetchLive();
      const at = Date.now();
      gmSet(CRIMESHUB_CACHE_KEY, { at, data });
      crimesHubData = Object.assign({}, BUILTIN_CRIMESHUB_DATA, data);
      crimesHubSource = 'CrimesHub, ' + new Date(at).toLocaleString();
      console.info('[OC Success] loaded', Object.keys(data).length, 'crimes from CrimesHub');
    } catch (err) {
      console.warn('[OC Success] live CrimesHub data unavailable, using', crimesHubSource, err);
    }
    runPass();
  }

  function simulate(crime, passRates) {
    const map = {};
    for (const [id, t, roles] of crime.n) map[id] = { t, roles, sources: [] };
    for (const [eid, target] of crime.e) if (map[target]) map[target].sources.push(eid);
    const done = {};
    const resolve = (id) => {
      const a = map[id];
      if (!a || done[id]) return a;
      done[id] = true;
      if (a.roles) {
        a.s = a.roles.reduce((sum, r) => sum + (passRates[r] ?? 0), 0) / (100 * a.roles.length);
      }
      if (id === 'A1-C1') a.occ = 1;
      else {
        a.occ = 0;
        for (const c of a.sources) {
          const src = resolve(c.slice(0, -1));
          if (src) a.occ += (c.slice(-1) === 'P' ? src.s : 1 - src.s) * src.occ;
        }
      }
      return a;
    };
    let success = 0;
    for (const id in map) {
      resolve(id);
      if (map[id].t === 'g') success += map[id].occ;
    }
    return success;
  }

  function processSuccessBadge(cardEl, info) {
    const levelEl = cardEl.querySelector('[class^="textLevel"], [class*=" textLevel"], [class*="textLevel__"]');
    if (!levelEl) return;

    const crime = crimesHubData[norm(info.crimeName)];
    let label = 'n/a', tip = 'Crime not in CrimesHub data';
    if (crime) {
      const rates = {};
      const missing = [];
      info.slots.forEach((slot) => {
        if (!slot.roleName) return;
        const roleKey = crime.roles ? crime.roles[norm(slot.roleName)] : null;
        const val = slot.chance;
        if (!roleKey) missing.push(slot.roleName + ' (unknown role)');
        else if (val === null || isNaN(val)) missing.push(slot.roleName);
        else rates[roleKey] = val;
      });

      if (missing.length) {
        label = '?';
        tip = 'No success chance for: ' + missing.join(', ');
      } else {
        label = (simulate(crime, rates) * 100).toFixed(2) + '%';
        tip = 'Simulated success chance, ' + crime.name + (crime.v ? ' ' + crime.v : '') + ' (data: ' + crimesHubSource + ')';
      }
    }

    const existingBadges = cardEl.querySelectorAll('.tt2p-oc-success');
    let badge = existingBadges[0];
    for (let i = 1; i < existingBadges.length; i++) {
      existingBadges[i].remove();
    }

    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'tt2p-oc-success';
      badge.style.cssText = 'margin-right:8px;font-weight:700;color:#5ad06e;white-space:nowrap;font-size:11px;display:inline-block;vertical-align:middle;';
      levelEl.insertBefore(badge, levelEl.firstChild);
    }
    if (badge.textContent !== label) badge.textContent = label;
    if (badge.title !== tip) badge.title = tip;
  }

  function injectTidyWeightBox(slot, crimeName) {
    if (!slot.wrapperEl) return;

    let weight = undefined;
    const weightMap = ROLE_WEIGHTS[crimeName];
    if (weightMap && slot.roleName) {
      weight = normalizeLookup(weightMap, slot.roleName);
    }
    if (weight === undefined && crimesHubData[norm(crimeName)]) {
      const crime = crimesHubData[norm(crimeName)];
      if (crime.roles && crime.w) {
        const rKey = crime.roles[norm(slot.roleName)];
        if (rKey && crime.w[rKey] !== undefined) {
          weight = crime.w[rKey];
        }
      }
    }

    const slotHeader = slot.wrapperEl.querySelector('button[class*="slotHeader__"]');
    if (!slotHeader) return;

    const existingRows = slot.wrapperEl.querySelectorAll('.tt2p-tidy-weight');
    let row = existingRows[0];
    for (let i = 1; i < existingRows.length; i++) {
      existingRows[i].remove();
    }

    if (weight === undefined) {
      if (row) row.remove();
      return;
    }

    if (!row) {
      row = document.createElement('div');
      row.className = 'tt2p-tidy-weight';
      row.style.cssText = 'text-align:center;font-size:12px;padding:3px 0;box-sizing:border-box;font-family:\'Inter\',sans-serif;font-weight:400;';
      slotHeader.parentNode.insertBefore(row, slotHeader.nextSibling);
    }

    const text = `Weight: ${weight.toFixed(1)}%`;
    if (row.textContent !== text) row.textContent = text;

    const lookKey = slotHeader.className + "|" + slot.wrapperEl.className;
    if (row.dataset.tt2pLookKey === lookKey) return;
    row.dataset.tt2pLookKey = lookKey;

    let el = slotHeader, cs = getComputedStyle(el);
    while (el.parentElement && cs.backgroundImage === 'none' && /rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor)) {
      el = el.parentElement;
      cs = getComputedStyle(el);
    }
    const hs = getComputedStyle(slotHeader);
    const look = {
      backgroundColor: cs.backgroundColor,
      backgroundImage: cs.backgroundImage,
      color: hs.color
    };
    const line = (side) => hs[side + 'Width'] !== '0px' && hs[side + 'Style'] !== 'none'
      ? hs[side + 'Width'] + ' ' + hs[side + 'Style'] + ' ' + hs[side + 'Color'] : '';
    const bottom = line('borderBottom') || line('borderTop') || '1px solid rgba(128,128,128,.35)';
    Object.assign(look, {
      borderLeft: line('borderLeft'),
      borderRight: line('borderRight'),
      borderTop: '',
      borderBottom: bottom
    });
    for (const k in look) {
      if (row.style[k] !== look[k]) row.style[k] = look[k];
    }
  }

  /* ============================================================================
   * CONFIG — edit this section to add/adjust crimes, CPR requirements, and
   * role weights.
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
    "Ship Happens": {
      "Assassin": 70, "Engineer": 70, "Hustler": 70, "Interrogator": 70, "Spy": 70,
    },
    "Cleared for Takeoff": {
      "Interrogator": 75, "Assassin": 75, "Imitator": 75, "Lookout": 75, "Pickpocket": 75, "Techie": 75,
    },
  };

  const ROLE_WEIGHTS = {
    "Snow Blind": { "Muscle #1": 8.5, "Hustler": 48.4, "Imitator": 34.6, "Muscle #2": 8.5 },
    "Window of Opportunity": { "Looter #2": 25, "Muscle #1": 23, "Looter #1": 20, "Muscle #2": 17, "Engineer": 15 },
    "Blast from the Past": {
      "Picklock #1": 10.8, "Muscle": 34.6, "Hacker": 12.1,
      "Bomber": 15.6, "Picklock #2": 2.9, "Engineer": 24.0,
    },
    "Cleared for Takeoff": { "Interrogator": 25, "Imitator": 25, "Assassin": 18, "Pickpocket": 12, "Techie": 11, "Lookout": 9 },
    "Clinical Precision": { "Imitator": 43.3, "Cleaner": 21.7, "Assassin": 16.1, "Cat Burglar": 18.9 },
    "Break the Bank": {
      "Muscle #1": 13.5, "Muscle #2": 10.1, "Muscle #3": 31.7,
      "Robber": 12.7, "Thief #1": 2.9, "Thief #2": 29.1,
    },
    "Lock Stock": { "Assassin": 38.6, "Muscle #2": 10.6, "Hacker": 15.3, "Muscle #1": 10.6, "Smuggler": 24.9 },
    "Stacking the Deck": { "Cat Burglar": 23.4, "Driver": 3.0, "Hacker": 25.4, "Imitator": 48.2 },
    "Ace in the Hole": { "Driver": 7.6, "Hacker": 28.3, "Imitator": 21.1, "Muscle #1": 18.3, "Muscle #2": 24.7 },
    "Hostile Takeover": { "Negotiator": 25, "Engineer": 20, "Hacker": 10, "Kidnapper": 13, "Muscle": 15, "Cat Burglar": 17 },
  };

  const LENIENCY = 0;
  const CROWDING_IDLE_THRESHOLD = 2;
  const NEAR_STALL_THRESHOLD_HOURS = 24;

  const CRIME_IMPORTANCE_ORDER = [
    "Hostile Takeover", "Ace in the Hole",
    "Break the Bank", "Ship Happens", "Lock Stock", "Stacking the Deck", "Clinical Precision", "Cleared for Takeoff",
    "Blast from the Past", "Window of Opportunity",
  ];
  function crimeImportanceIndex(crimeName) {
    const i = CRIME_IMPORTANCE_ORDER.indexOf(crimeName);
    return i === -1 ? CRIME_IMPORTANCE_ORDER.length : i;
  }

  const SCAN_DEBOUNCE_MS = 400;
  const TOAST_DURATION_MS = 6000;
  const HIDDEN_CRIMES_BY_DEFAULT = ["Manifest Cruelty"];

  const STORAGE_KEY = "tornOC_prioritizer_cprData_v1";
  const CRIME_DIFFICULTY_CACHE_KEY = "tornOC_prioritizer_crimeDifficultyCache_v1";
  const MAX_DIFFICULTY_KEY = "tornOC_prioritizer_maxDifficulty_v1";
  const SORT_TOGGLE_KEY = "tornOC_prioritizer_dynamicSortEnabled_v1";
  const SHOW_HIDDEN_KEY = "tornOC_prioritizer_showHiddenOcs_v1";
  const HIDE_FLAVOR_KEY = "tornOC_prioritizer_hideFlavorText_v1";
  const NOT_QUALIFIED_HEADER_ID = "tt2p-not-qualified-divider";
  const BAR_STYLE_KEY = "tornOC_prioritizer_barStyle_v1";
  function getBarStyle() {
    return localStorage.getItem(BAR_STYLE_KEY) === "classic" ? "classic" : "density";
  }
  const DEFAULT_MAX_DIFFICULTY = 10;

  let maxDifficultyLevel = (() => {
    const stored = parseInt(localStorage.getItem(MAX_DIFFICULTY_KEY), 10);
    return Number.isFinite(stored) && stored >= 1 && stored <= 10 ? stored : DEFAULT_MAX_DIFFICULTY;
  })();

  let dynamicSortEnabled = localStorage.getItem(SORT_TOGGLE_KEY) !== "0";
  let showHiddenOcs = localStorage.getItem(SHOW_HIDDEN_KEY) === "1";
  let hideFlavorText = localStorage.getItem(HIDE_FLAVOR_KEY) === "1";
  const slotProgressHistory = {};

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

  function loadCrimeDifficultyCache() {
    try {
      return JSON.parse(localStorage.getItem(CRIME_DIFFICULTY_CACHE_KEY) || "{}");
    } catch (e) {
      return {};
    }
  }
  let crimeDifficultyCache = loadCrimeDifficultyCache();
  function rememberCrimeDifficulty(crimeName, difficulty) {
    if (difficulty === null || difficulty === undefined) return;
    if (crimeDifficultyCache[crimeName] === difficulty) return;
    crimeDifficultyCache[crimeName] = difficulty;
    localStorage.setItem(CRIME_DIFFICULTY_CACHE_KEY, JSON.stringify(crimeDifficultyCache));
  }

  function sortCrimeNamesByDifficulty(names) {
    return [...names].sort((a, b) => {
      const da = crimeDifficultyCache[a];
      const db = crimeDifficultyCache[b];
      if (da !== undefined && db !== undefined && da !== db) return db - da;
      if (da !== undefined && db === undefined) return -1;
      if (da === undefined && db !== undefined) return 1;
      const cia = crimeImportanceIndex(a);
      const cib = crimeImportanceIndex(b);
      if (cia !== cib) return cia - cib;
      return a.localeCompare(b);
    });
  }

  function sortRoleNamesByWeight(crimeName, roleNames) {
    const weightMap = ROLE_WEIGHTS[crimeName];
    return [...roleNames].sort((a, b) => {
      const wa = weightMap ? normalizeLookup(weightMap, a) : undefined;
      const wb = weightMap ? normalizeLookup(weightMap, b) : undefined;
      if (wa !== undefined && wb !== undefined && wa !== wb) return wb - wa;
      if (wa !== undefined && wb === undefined) return -1;
      if (wa === undefined && wb !== undefined) return 1;
      return a.localeCompare(b);
    });
  }

  function recordCpr(store, crimeName, roleName, value) {
    if (!store[crimeName]) store[crimeName] = {};
    const existing = store[crimeName][roleName];
    if (!existing || value > existing.value) {
      const now = new Date().toISOString();
      const history = existing && existing.history ? existing.history.slice() : [];
      history.push({ value, at: now });
      store[crimeName][roleName] = { value, updatedAt: now, history };
      return { changed: true, previous: existing ? existing.value : null };
    }
    return { changed: false, previous: existing.value };
  }

  const LEVEL9_CRIMES = ["Hostile Takeover", "Ace in the Hole"];
  const GROWTH_RANGE_OPTIONS = [
    { label: "Lifetime", days: null },
    { label: "Last 3 Months", days: 90 },
    { label: "Last 2 Months", days: 60 },
    { label: "Last 1 Month", days: 30 },
    { label: "Last 2 Weeks", days: 14 },
  ];

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
        occupantRow = `<div class="tt2p-tt-row tt2p-tt-idle">⏳ Joined, but not yet planning (0%)</div>`;
      } else if (slot.planningState === "in_progress") {
        occupantRow = `<div class="tt2p-tt-row">Planning progress: <b>${slot.planningPct.toFixed(1)}%</b></div>`;
      } else if (slot.planningState === "blocked") {
        occupantRow = `<div class="tt2p-tt-row tt2p-tt-idle">⚠️ No planning progress seen — missing required item</div>`;
      } else {
        occupantRow = `<div class="tt2p-tt-row">Planning complete (100%) — waiting on other roles</div>`;
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

    let statusIcon = "";
    if (slot.qualifies === true) {
      statusIcon = ` <span class="tt2p-tt-pass">✓</span>`;
    } else if (slot.qualifies === false) {
      statusIcon = ` <span class="tt2p-tt-fail">✕</span>`;
    }

    const starHtml = slot.starRank !== undefined
      ? `<div class="tt2p-tt-row tt2p-tt-pass">${STAR_ICONS[slot.starRank]} ${STAR_LABELS[slot.starRank]} choice for you right now</div>`
      : "";

    return `
      <div class="tt2p-tt-title">${escapeHtml(slot.roleName)}</div>
      ${occupantRow}
      <div class="tt2p-tt-row">Current CPR Requirement: <b>${slot.requirement}</b>${LENIENCY > 0 ? ` (−${LENIENCY} flex allowed)` : ""}</div>
      <div class="tt2p-tt-row">Your CPR: <b>${chanceText}</b>${statusIcon}</div>
      ${starHtml}
    `;
  }

  function escapeHtml(str) {
    const d = document.createElement("div");
    d.textContent = str == null ? "" : String(str);
    return d.innerHTML;
  }

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

  function formatHM(hours) {
    if (!Number.isFinite(hours) || hours <= 0) return "0m";
    const totalMinutes = Math.round(hours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

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

  const tooltipState = new WeakMap();
  function attachTooltip(slot, crimeName, tracked) {
    if (!slot.wrapperEl) return;
    // Always keep the latest data so the tooltip never shows stale first-render values
    tooltipState.set(slot.wrapperEl, { slot, crimeName, tracked });
    if (slot.wrapperEl.dataset.tt2pTooltipBound) return;
    slot.wrapperEl.dataset.tt2pTooltipBound = "1";
    slot.wrapperEl.addEventListener("mouseenter", () => {
      const st = tooltipState.get(slot.wrapperEl);
      if (!st) return;
      const tt = ensureCustomTooltip();
      tt.innerHTML = tooltipHtml(st.slot, st.crimeName, st.tracked);
      tt.classList.add("tt2p-tooltip-visible");
    });
    slot.wrapperEl.addEventListener("mousemove", positionTooltip);
    slot.wrapperEl.addEventListener("mouseleave", () => {
      ensureCustomTooltip().classList.remove("tt2p-tooltip-visible");
    });
  }

  function updateTogglePillUi() {
    const pill = document.getElementById("tt2p-toggle-pill");
    const label = document.getElementById("tt2p-toggle-state-label");
    if (!pill || !label) return;
    pill.classList.toggle("tt2p-pill-on", dynamicSortEnabled);
    pill.classList.toggle("tt2p-pill-off", !dynamicSortEnabled);
    label.textContent = dynamicSortEnabled ? "ON - OCs are sorting based on your CPR & urgency." : "OFF (vanilla)";
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
    if (container.firstChild !== row) {
      container.insertBefore(row, container.firstChild);
    }
    updateTogglePillUi();
  }

  let settingsPanelEl = null;   // built once, lives inside the 4th crimes tab
  let settingsTabOpen = false;

  function buildSettingsPanel() {
    if (settingsPanelEl) return;

    const panel = document.createElement("div");
    panel.id = "tt2p-settings-panel";
    panel.innerHTML = `
      <div class="tt2p-settings-header">Your Settings</div>
      <div class="tt2p-settings-row">
        <label for="tt2p-difficulty-input">Max OC difficulty (1–10):</label>
        <input id="tt2p-difficulty-input" type="number" min="1" max="10" value="${maxDifficultyLevel}" />
        <button id="tt2p-difficulty-save" type="button">Save</button>
      </div>
      <div class="tt2p-settings-row" style="margin-top:10px;">
        <label class="tt2p-settings-checkbox-label">
          <input id="tt2p-show-hidden-input" type="checkbox" ${showHiddenOcs ? "checked" : ""} />
          Show hidden OCs (e.g. Manifest Cruelty)
        </label>
      </div>
      <div class="tt2p-settings-row" style="margin-top:6px;">
        <label class="tt2p-settings-checkbox-label">
          <input id="tt2p-hide-flavor-input" type="checkbox" ${hideFlavorText ? "checked" : ""} />
          Hide OC flavor text (places Bento directly in header)
        </label>
      </div>
      <div class="tt2p-settings-row" style="margin-top:10px;">
        <label for="tt2p-barstyle-select">Planning bar style:</label>
        <select id="tt2p-barstyle-select">
          <option value="density" ${getBarStyle() === "density" ? "selected" : ""}>Progress line (new)</option>
          <option value="classic" ${getBarStyle() === "classic" ? "selected" : ""}>Classic arrows</option>
        </select>
      </div>
      <div class="tt2p-settings-header" style="margin-top:14px;">CPR Data</div>
      <div class="tt2p-tabs">
        <button type="button" class="tt2p-tab-btn tt2p-tab-active" data-tab="snapshot">Snapshot</button>
        <button type="button" class="tt2p-tab-btn" data-tab="growth">Growth History</button>
      </div>
      <div id="tt2p-settings-body" class="tt2p-tab-panel tt2p-tab-panel-active"></div>
      <div id="tt2p-growth-body" class="tt2p-tab-panel">
        <div class="tt2p-growth-controls">
          <label for="tt2p-growth-range">Range:</label>
          <select id="tt2p-growth-range">
            ${GROWTH_RANGE_OPTIONS.map((o) => `<option value="${o.days ?? "lifetime"}">${o.label}</option>`).join("")}
          </select>
        </div>
        <div id="tt2p-growth-list"></div>
      </div>
      <button id="tt2p-purge-btn" type="button">Purge All CPR Data</button>
    `;

    settingsPanelEl = panel;

    panel.querySelectorAll(".tt2p-tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        panel.querySelectorAll(".tt2p-tab-btn").forEach((b) => b.classList.remove("tt2p-tab-active"));
        btn.classList.add("tt2p-tab-active");
        const target = btn.dataset.tab;
        panel.querySelector("#tt2p-settings-body").classList.toggle("tt2p-tab-panel-active", target === "snapshot");
        panel.querySelector("#tt2p-growth-body").classList.toggle("tt2p-tab-panel-active", target === "growth");
        if (target === "growth") renderGrowthPanel();
      });
    });

    panel.querySelector("#tt2p-growth-range").addEventListener("change", renderGrowthPanel);

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

    panel.querySelector("#tt2p-hide-flavor-input").addEventListener("change", (e) => {
      hideFlavorText = !!e.target.checked;
      localStorage.setItem(HIDE_FLAVOR_KEY, hideFlavorText ? "1" : "0");
      showToast(hideFlavorText ? "Flavor text hidden; Bento moved into header." : "Flavor text restored; Bento moved below text.");
      runPass();
    });

    panel.querySelector("#tt2p-barstyle-select").addEventListener("change", (e) => {
      localStorage.setItem(BAR_STYLE_KEY, e.target.value === "classic" ? "classic" : "density");
      showToast(e.target.value === "classic" ? "Planning bar: classic arrows." : "Planning bar: density line.");
      runPass();
    });

    panel.querySelector("#tt2p-purge-btn").addEventListener("click", () => {
      if (confirm("Erase all locally stored CPR data for this browser? This can't be undone.")) {
        localStorage.removeItem(STORAGE_KEY);
        renderSettingsPanel();
        renderGrowthPanel();
        showToast("CPR data purged.");
      }
    });
  }

  /* ============================================================================
   * MEMBER DASHBOARD (DOM only: reads the OC cards you have on screen and remembers them)
   * No faction API, no extra requests, nothing scraped from tabs you are not viewing.
   * ============================================================================ */
  const OC_CACHE_KEY = "tornOC_prioritizer_ocCache_v1";
  const QUEUE_CAP_HOURS = 36;       // longest wait before a new joiner's planning turn we call acceptable
  const QUEUE_CAP_TOP_HOURS = 72;   // extra leeway for Hostile Takeover / Ace in the Hole (level 9)
  const OVERFLOW_HOURS = 24;        // idle in a planning queue beyond this = worth moving
  const LEVEL_DEFAULTS = { "Hostile Takeover": 9, "Ace in the Hole": 9, "Break the Bank": 8, "Ship Happens": 8, "Lock Stock": 8, "Stacking the Deck": 8, "Clinical Precision": 8, "Cleared for Takeoff": 7, "Blast from the Past": 7, "Window of Opportunity": 7 };
  let lastNativeTab = null;

  function readSlotIdentity(headerEl, wrapperEl, hasOccupant) {
    const out = { memberName: null, memberId: null, isViewer: false, itemMissing: false };
    if (!hasOccupant || !wrapperEl) return out;
    const nameEl = wrapperEl.querySelector('[class*="textName__"]');
    out.memberName = nameEl && nameEl.textContent ? nameEl.textContent.trim() : null;
    const link = wrapperEl.querySelector('a[href*="XID="]');
    const m = link ? /XID=(\d+)/.exec(link.getAttribute("href") || "") : null;
    out.memberId = m ? parseInt(m[1], 10) : null;
    out.isViewer = Array.from(wrapperEl.querySelectorAll('[class*="slotMenuItem__"]')).some((el) => el.textContent.trim() === "Leave Role");
    out.itemMissing = !!headerEl.querySelector('[class*="inactive__"]');
    return out;
  }

  function roleWeightOf(crimeName, role) {
    const wm = ROLE_WEIGHTS[crimeName];
    if (wm) { const v = normalizeLookup(wm, role); if (v !== undefined) return v; }
    const c = crimesHubData[norm(crimeName)];
    if (c && c.roles && c.w) { const k = c.roles[norm(role)]; if (k && c.w[k] !== undefined) return c.w[k]; }
    return 0;
  }
  const dashLevelOf = (c) => c.level || crimeDifficultyCache[c.name] || LEVEL_DEFAULTS[c.name] || 0;
  const dAbbr = (n) => String(n).split(/\s+/).filter((w) => !/^(the|of|in|a|for|from|to|and|if|me)$/i.test(w)).map((w) => w[0].toUpperCase()).join("");
  const fmtHrs = (h) => (h <= 0.02 ? "now" : formatHM(h));

  /* ---- what the active tab shows -> compact records, remembered per tab ---- */
  function currentNativeTab() {
    const { bar } = crimesTabParts();
    if (!bar) return null;
    const b = Array.from(bar.querySelectorAll("button")).find((x) => !x.classList.contains("tt2p-settings-tab-btn") && Array.from(x.classList).some(isActiveCls));
    const t = b ? b.textContent.trim().toLowerCase() : "";
    return t.startsWith("recruit") ? "recruiting" : t.startsWith("plan") ? "planning" : t.startsWith("complet") ? "completed" : null;
  }

  function loadOcCache() { try { return JSON.parse(localStorage.getItem(OC_CACHE_KEY) || "{}"); } catch (e) { return {}; } }
  let ocCache = loadOcCache();
  const ocLastJson = {};
  let ocPersistAt = 0;

  function compactRecord(cardEl, info) {
    return {
      id: cardEl.getAttribute("data-oc-id") || info.crimeName,
      name: info.crimeName, level: info.difficulty, tracked: info.tracked, stalled: info.stalled,
      filled: info.occupiedCount, total: info.totalSlots,
      readyIn: info.overallCountdownHours, viewer: info.viewerJoined,
      slots: info.slots.map((s) => ({
        role: s.roleName, name: s.memberName, uid: s.memberId, cpr: s.chance, req: s.requirement,
        open: s.isOpen, occ: s.hasOccupant, st: s.planningState, pct: s.planningPct,
        me: s.isViewer, qual: s.qualifies, miss: s.itemMissing,
      })),
    };
  }
  function updateOcCache(tab, cardInfos) {
    const crimes = cardInfos.map(({ cardEl, info }) => compactRecord(cardEl, info));
    ocCache[tab] = { at: Date.now(), crimes };
    const j = JSON.stringify(crimes);
    if (ocLastJson[tab] !== j || Date.now() - ocPersistAt > 30000) {
      ocLastJson[tab] = j;
      ocPersistAt = Date.now();
      try { localStorage.setItem(OC_CACHE_KEY, JSON.stringify(ocCache)); } catch (e) { /* quota */ }
    }
  }
  function refreshOcCacheFromDom(tab) {
    if (tab !== "recruiting" && tab !== "planning") return;
    const infos = findOcCards().map((cardEl) => ({ cardEl, info: readCard(cardEl) })).filter((x) => x.info);
    if (infos.length) updateOcCache(tab, infos);
  }

  // members planning in order: the one in progress first, then the queue (24h each); `age` = hours since we last looked
  function ocSegments(c, age) {
    const members = c.slots.filter((s) => s.occ && s.st !== "complete");
    const active = members.filter((s) => s.st === "in_progress").sort((a, b) => (b.pct || 0) - (a.pct || 0));
    const rest = members.filter((s) => s.st !== "in_progress");
    const segs = active.concat(rest).map((s) => ({ kind: s.miss ? "blocked" : s.st === "in_progress" ? "active" : "queued", hrs: s.st === "in_progress" ? 24 * (1 - (s.pct || 0) / 100) : 24, s }));
    let burn = age;
    for (const sg of segs) { if (burn <= 0) break; const d = Math.min(burn, sg.hrs); sg.hrs -= d; burn -= d; }
    const out = segs.filter((sg) => sg.hrs > 0.05);
    return { segs: out, memberHrs: out.reduce((a, sg) => a + sg.hrs, 0), opens: c.slots.filter((s) => s.open) };
  }

  function ocRecords() {
    const now = Date.now();
    const byId = new Map();
    ["recruiting", "planning"].forEach((tab) => {
      const t = ocCache[tab];
      if (!t || !t.crimes) return;
      const age = (now - t.at) / 3600000;
      if (age > 24) return;
      t.crimes.forEach((c) => {
        if (HIDDEN_CRIMES_BY_DEFAULT.includes(c.name) && !showHiddenOcs) return;
        const sg = ocSegments(c, age);
        const full = c.total > 0 && c.filled === c.total;
        const readyNow = full ? (c.readyIn !== null && c.readyIn !== undefined ? Math.max(0, c.readyIn - age) : sg.memberHrs) : null;
        const rec = Object.assign({}, c, { tab, age, segs: sg.segs, opens: sg.opens, waitNow: sg.memberHrs, full, readyNow, level: dashLevelOf(c), isMine: !!c.viewer || c.slots.some((s) => s.me) });
        const prev = byId.get(c.id);
        if (!prev || rec.age < prev.age) byId.set(c.id, rec);
      });
    });
    return Array.from(byId.values());
  }

  /* ---- the viewer's own situation ---- */
  function myWaitInfo(r, me) {
    if (!me || me.st === "in_progress" || me.st === "complete") return null;
    const others = r.slots.filter((s) => s.occ && !s.me && s.st !== "complete");
    const partial = others.filter((s) => s.st === "in_progress").reduce((a, s) => a + 24 * (1 - (s.pct || 0) / 100), 0);
    const zeros = others.filter((s) => s.st !== "in_progress").length;
    const sub = (v) => Math.max(0, v - r.age);
    return { est: sub(partial + 12 * zeros), min: sub(partial), max: sub(partial + 24 * zeros) };
  }
  const isTop = (r) => LEVEL9_CRIMES.includes(r.name) || r.level >= 9;

  function joinOptions(recs, mine, myWait) {
    const out = [];
    const curIdx = mine ? crimeImportanceIndex(mine.name) : 0;
    recs.forEach((r) => {
      if (r.isMine || !r.tracked || !r.opens.length) return;
      const cap = isTop(r) ? QUEUE_CAP_TOP_HOURS : QUEUE_CAP_HOURS;
      if (r.waitNow > cap) return;
      r.opens.forEach((s) => {
        if (s.qual !== true) return;
        const tIdx = crimeImportanceIndex(r.name);
        const dir = !mine ? 1 : tIdx < curIdx ? 0 : tIdx === curIdx ? 1 : 2;
        if (mine && myWait) {
          if (r.waitNow > myWait.est - 12) return;
          if (dir === 2 && (myWait.est < 36 || isTop(mine))) return;
        }
        out.push({ r, s, start: r.waitNow, dir, tIdx, w: roleWeightOf(r.name, s.role) });
      });
    });
    out.sort((a, b) => a.dir - b.dir || a.tIdx - b.tIdx || a.start - b.start || b.w - a.w);
    return out.slice(0, 4);
  }

  function optionsHtml(opts) {
    if (!opts.length) return `<div class="tt2p-mgr-note">No open role you qualify for looks better right now.</div>`;
    return `<ul class="tt2p-mgr-lines">${opts.map((o) => {
      const tag = o.dir === 0 ? `<span class="tt2p-mgr-ok">&#8593; higher priority</span>` : o.dir === 1 ? "" : `<span class="tt2p-mgr-warn">&#8595; lower priority</span>`;
      return `<li><b>${escapeHtml(o.r.name)}</b> &middot; ${escapeHtml(o.s.role)} <span class="tt2p-mgr-dim">(your CPR ${o.s.cpr}/${o.s.req})</span> &mdash; your planning turn would come in ~${fmtHrs(o.start)} ${tag}</li>`;
    }).join("")}</ul>`;
  }

  function dashSituation(recs) {
    const warnings = [];
    const mine = recs.find((r) => r.isMine) || null;
    const me = mine ? mine.slots.find((s) => s.me) || null : null;
    let options = [];
    if (!recs.length) {
      warnings.push({ sev: "info", title: "No OC data yet", cause: "Open the Recruiting tab (and the Planning tab if you are in a planning OC) once: this dashboard only uses what is on your screen and remembers it for later.", view: null });
      return { mine, me, warnings, options };
    }
    if (mine && me) {
      const item = cachedItem(mine.id + ":" + me.role);
      if (me.miss) warnings.push({ sev: "bad", title: `You are missing the item for ${escapeHtml(me.role)} in ${escapeHtml(mine.name)}`, cause: item && item.text ? `Missing: <b>${escapeHtml(item.text)}</b>. Your planning cannot progress until you have it.` : "Your planning cannot progress until you have the required item (hover your role to see which one).", action: "Get or borrow the item (faction armoury) so your part can start.", view: "ocs" });
      if (mine.stalled) warnings.push({ sev: "bad", title: `${escapeHtml(mine.name)} is stalled`, cause: "Planning is paused: someone is missing an item or the queue has run out of people to plan.", action: "Check the OC in the OC list and get the blocker fixed.", view: "ocs" });
      const w = myWaitInfo(mine, me);
      const thr = isTop(mine) ? QUEUE_CAP_TOP_HOURS : OVERFLOW_HOURS;
      options = joinOptions(recs, mine, w);
      if (w && !me.miss && w.est > thr) {
        warnings.push({ sev: "warn", title: `Your planning turn in ${escapeHtml(mine.name)} is far away`, cause: `You are in the queue and your turn is roughly <b>${fmtHrs(w.est)}</b> away (between ${fmtHrs(w.min)} and ${fmtHrs(w.max)}; Torn does not show join order). Waiting this long is idle time.`, action: options.length ? "Better places for you right now:" : "Nothing better is open right now; stay put unless something appears.", extra: optionsHtml(options), view: "ocs" });
      }
      const req = me.req;
      if (req !== undefined && me.cpr > 0 && me.cpr < req - LENIENCY) warnings.push({ sev: "info", title: `Your CPR for ${escapeHtml(me.role)} is below the requirement`, cause: `${me.cpr} vs ${req} required in ${escapeHtml(mine.name)}.`, action: "Worth reviewing whether another role fits you better.", view: "cpr" });
      if (!warnings.some((x) => x.sev === "bad" || x.sev === "warn")) {
        const state = me.st === "complete" ? "your part is done" : me.st === "in_progress" ? `you are planning now (${Math.round(me.pct || 0)}%)` : "you are queued to plan";
        warnings.unshift({ sev: "good", title: `You are in ${escapeHtml(mine.name)} as ${escapeHtml(me.role)}`, cause: `${state}${mine.readyNow !== null ? "; the OC finishes in about " + fmtHrs(mine.readyNow) : mine.opens.length ? "; " + mine.opens.length + " role(s) still open" : ""}.`, view: "ocs" });
      }
    } else {
      options = joinOptions(recs, null, null);
      warnings.push({ sev: options.length ? "info" : "warn", title: "You are not in an OC", cause: options.length ? "These are your best open roles right now (higher priority first, then the shortest wait):" : "No open role you qualify for is available in the OCs I have seen.", extra: options.length ? optionsHtml(options) : "", view: "ocs" });
    }
    return { mine, me, warnings, options };
  }

  function updateTabAlert() {
    const { bar } = crimesTabParts();
    const btn = bar && bar.querySelector(".tt2p-settings-tab-btn");
    if (!btn) return;
    const n = dashSituation(ocRecords()).warnings.filter((w) => w.sev === "bad" || w.sev === "warn").length;
    if (n) btn.setAttribute("data-alert", String(n)); else btn.removeAttribute("data-alert");
  }
  // learn the missing item's name for the viewer's own blocked role (brief native tooltip, at most once a minute)
  function probeViewerItem(cardInfos) {
    cardInfos.forEach(({ cardEl, info }) => info.slots.forEach((s) => {
      if (!s.isViewer || !s.itemMissing || !s.wrapperEl) return;
      const key = (cardEl.getAttribute("data-oc-id") || "") + ":" + s.roleName;
      if (cachedItem(key)) return;
      probeMissingItem({ key, header: s.wrapperEl.querySelector('button[class*="slotHeader__"]') }, () => {});
    }));
  }

  /* ---- layout helpers (Torn-native panel chrome) ---- */
  const dPanel = (title, body, open, extra) =>
    `<div class="tt2p-tp"><div class="title-black top-round tt2p-tp-title"><h5 class="box-title">${title}</h5>${extra || ""}${open ? `<button type="button" class="tt2p-btn" data-open="${open}">Expand &#8599;</button>` : ""}</div><div class="cont-gray bottom-round tt2p-tp-body">${body}</div></div>`;
  const dTd = (v, title) => `<td${title ? ` title="${escapeHtml(title)}"` : ""}>${v}</td>`;
  const dTable = (head, rows) => `<div class="tt2p-mgr-scroll"><table class="tt2p-mgr-table"><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`;

  /* ---- pipeline Gantt: every OC as one line, members as segments (hours of planning), open roles hatched ---- */
  function dashGantt(recs, full) {
    const H = 168;
    const X = (h) => Math.max(0, Math.min(100, (h / H) * 100));
    const pos = (h0, h1) => `left:${X(h0).toFixed(2)}%;width:${Math.max(0.7, X(Math.min(h1, H)) - X(h0)).toFixed(2)}%`;
    const bar = (cls, h0, h1, label, tip) => (h0 >= H ? "" : `<div class="tt2p-g-bar tt2p-g-${cls}" style="${pos(h0, h1)}" title="${escapeHtml(tip || "")}">${label ? `<span>${escapeHtml(label)}</span>` : ""}</div>`);
    const row = (label, sub, inner) => `<div class="tt2p-g-row"><div class="tt2p-g-label"><b>${label}</b>${sub ? `<small>${sub}</small>` : ""}</div><div class="tt2p-g-track">${inner}</div></div>`;
    const ticks = [0, 24, 48, 72, 96, 120, 144, 168].map((h) => `<span style="left:${X(h)}%">${h === 0 ? "Now" : "+" + h / 24 + "d"}</span>`).join("");
    let html = `<div class="tt2p-g-row tt2p-g-axisrow"><div class="tt2p-g-label"></div><div class="tt2p-g-track tt2p-g-axis">${ticks}</div></div>`;

    const sorted = recs.slice().sort((a, b) => (b.isMine ? 1 : 0) - (a.isMine ? 1 : 0) || (b.opens.length > 0 && a.opens.length === 0 ? 1 : a.opens.length > 0 && b.opens.length === 0 ? -1 : 0) || b.level - a.level || crimeImportanceIndex(a.name) - crimeImportanceIndex(b.name) || a.waitNow - b.waitNow);
    const shown = sorted.slice(0, full ? 200 : 9);
    if (!shown.length) return `<div class="tt2p-mgr-note">Nothing to draw yet: open the Recruiting / Planning tabs once.</div>`;
    shown.forEach((r) => {
      let inner = "";
      let t = 0;
      r.segs.forEach((sg) => {
        const nm = sg.s.name || sg.s.role;
        const tip = `${nm} (${sg.s.role}): ${sg.kind === "active" ? "planning now, " : sg.kind === "blocked" ? "BLOCKED - missing the required item, " : "queued, "}${fmtHrs(sg.hrs)} of planning${sg.s.cpr ? "; CPR " + sg.s.cpr + (sg.s.req !== undefined ? "/" + sg.s.req : "") : ""}`;
        inner += bar(sg.kind + (sg.s.me ? " tt2p-g-me" : ""), t, t + sg.hrs, `${nm} ${Math.round(sg.hrs)}h`, tip);
        t += sg.hrs;
      });
      const stallAt = t;
      r.opens.forEach((s) => {
        inner += bar("need", t, t + 24, "open: " + s.role, `Open role: ${s.role}${s.req !== undefined ? ", needs CPR " + s.req : ""}${s.cpr ? " (yours: " + s.cpr + ")" : ""}${s.qual === true ? " - you qualify" : s.qual === false ? " - below your CPR" : ""}`);
        t += 24;
      });
      if (r.opens.length) inner += `<i class="tt2p-g-flag" style="left:${X(stallAt).toFixed(2)}%" title="${escapeHtml(r.name + " stalls here unless the open roles are filled")}"></i>`;
      const done = r.slots.filter((s) => s.occ && s.st === "complete").length;
      const sub = `L${r.level || "?"} &middot; ${r.filled}/${r.total}${done ? " &middot; " + done + " done" : ""}`;
      html += row(`${escapeHtml(dAbbr(r.name))}${r.isMine ? ' <span class="tt2p-mgr-ok">&#9733; you</span>' : ""}`, sub, inner);
    });
    if (!full && sorted.length > shown.length) html += `<div class="tt2p-g-empty">+${sorted.length - shown.length} more in the full view</div>`;
    const legend = `<div class="tt2p-g-legend"><span><i class="tt2p-g-active"></i>planning now</span><span><i class="tt2p-g-queued"></i>queued (24h each)</span><span><i class="tt2p-g-blocked"></i>blocked (missing item)</span><span><i class="tt2p-g-need"></i>open role</span><span><i class="tt2p-g-flagkey"></i>stalls here if unfilled</span></div>`;
    return `<div class="tt2p-g-wrap"><div class="tt2p-g">${html}</div></div>${legend}`;
  }

  /* ---- snapshot, finishing soon ---- */
  function dashSnapshot(recs) {
    const kv = (l, v, sub) => `<div class="tt2p-kv"><span>${l}</span><b>${v}</b>${sub ? `<small>${sub}</small>` : ""}</div>`;
    const rec = recs.filter((r) => !r.full);
    const plan = recs.filter((r) => r.full);
    const openSlots = rec.reduce((a, r) => a + r.opens.length, 0);
    const youQual = rec.reduce((a, r) => a + r.opens.filter((s) => s.qual === true).length, 0);
    const soon = recs.filter((r) => r.readyNow !== null && r.readyNow <= 24);
    const soonPeople = soon.reduce((a, r) => a + r.filled, 0);
    const over = rec.filter((r) => r.filled && r.waitNow > (isTop(r) ? QUEUE_CAP_TOP_HOURS : QUEUE_CAP_HOURS)).length;
    const missing = recs.filter((r) => r.slots.some((s) => s.miss)).length;
    const ages = ["recruiting", "planning"].map((t) => (ocCache[t] ? `${t === "recruiting" ? "Recruiting" : "Planning"} ${Math.max(0, Math.round((Date.now() - ocCache[t].at) / 60000))}m ago` : null)).filter(Boolean);
    return kv("OCs recruiting / planning", rec.length + " / " + plan.length) + kv("Open slots", openSlots, youQual ? youQual + " you qualify for" : "") +
      kv("OCs finishing in 24h", soon.length, soonPeople ? soonPeople + " members freed" : "") + kv("Over-queued OCs", over) + kv("OCs with a missing item", missing) +
      `<div class="tt2p-mgr-note" style="margin-top:6px">${ages.length ? "Seen: " + ages.join(" &middot; ") + ". Open a tab to refresh it." : "Nothing seen yet."}</div>`;
  }

  function dashFinishing(recs, limit, hoursMax) {
    const soon = recs.filter((r) => r.readyNow !== null && r.readyNow <= hoursMax).sort((a, b) => a.readyNow - b.readyNow);
    if (!soon.length) return `<div class="tt2p-mgr-note">No OC finishes in the next ${hoursMax}h (from what I have seen).</div>`;
    const rows = soon.slice(0, limit).map((r) => `<tr>${dTd(fmtHrs(r.readyNow))}${dTd(escapeHtml(r.name) + (r.isMine ? ' <span class="tt2p-mgr-ok">&#9733; you</span>' : ""))}${dTd("L" + (r.level || "?"))}${dTd(escapeHtml(r.slots.filter((s) => s.occ).map((s) => s.name || "?").join(", ")))}</tr>`);
    return dTable(["Finishes", "OC", "Lvl", "Members who become free"], rows) + (soon.length > limit ? `<div class="tt2p-mgr-note">+${soon.length - limit} more in the full view.</div>` : "");
  }

  /* ---- your CPR for every role, grouped by level ---- */
  function cprGroups() {
    const names = Object.keys(CPR_REQUIREMENTS).filter((n) => showHiddenOcs || !HIDDEN_CRIMES_BY_DEFAULT.includes(n));
    const groups = {};
    names.forEach((n) => { const lv = crimeDifficultyCache[n] || LEVEL_DEFAULTS[n] || 0; (groups[lv] = groups[lv] || []).push(n); });
    return Object.keys(groups).map(Number).sort((a, b) => b - a).map((lv) => ({ lv, crimes: groups[lv].sort((a, b) => crimeImportanceIndex(a) - crimeImportanceIndex(b) || a.localeCompare(b)) }));
  }
  function dashCprCompact() {
    const store = loadStore();
    const groups = cprGroups().filter((g) => g.lv >= 7);
    if (!groups.length) return `<div class="tt2p-mgr-note">No crimes configured.</div>`;
    return groups.map((g) => `<div class="tt2p-cpr-lv">Level ${g.lv}</div>` + g.crimes.map((n) => {
      const reqs = CPR_REQUIREMENTS[n];
      const chips = sortRoleNamesByWeight(n, Object.keys(reqs)).map((role) => {
        const e = store[n] && store[n][role];
        const v = e ? e.value : null;
        const cls = v === null ? "tt2p-cpr-none" : v >= reqs[role] - LENIENCY ? "tt2p-cpr-ok" : "tt2p-cpr-low";
        return `<span class="tt2p-cpr-chip ${cls}" title="${escapeHtml(role + ": your CPR " + (v === null ? "not seen yet" : v) + ", requirement " + reqs[role])}">${escapeHtml(role)} <b>${v === null ? "&ndash;" : v}</b><i>/${reqs[role]}</i></span>`;
      }).join("");
      return `<div class="tt2p-cpr-row"><span class="tt2p-cpr-crime">${escapeHtml(n)}</span><span class="tt2p-cpr-chips">${chips}</span></div>`;
    }).join("")).join("") + `<div class="tt2p-mgr-note">Green = meets the faction requirement, red = below it, grey = not seen yet (your CPR appears for a role when that OC is on screen). Lower levels are in the full view.</div>`;
  }
  function dashCprFull() {
    const store = loadStore();
    const rows = [];
    cprGroups().forEach((g) => {
      rows.push(`<tr class="tt2p-ov-grp"><td colspan="6">Level ${g.lv || "?"}</td></tr>`);
      g.crimes.forEach((n) => {
        const reqs = CPR_REQUIREMENTS[n];
        sortRoleNamesByWeight(n, Object.keys(reqs)).forEach((role, i) => {
          const e = store[n] && store[n][role];
          const diff = e ? e.value - reqs[role] : null;
          const dt = e ? new Date(e.updatedAt) : null;
          rows.push(`<tr>${dTd(i === 0 ? "<b>" + escapeHtml(n) + "</b>" : "")}${dTd(escapeHtml(role))}${dTd(e ? `<b>${e.value}</b>` : '<span class="tt2p-mgr-dim">not seen</span>')}${dTd(reqs[role])}${dTd(diff === null ? "" : diff >= 0 ? `<span class="tt2p-mgr-ok">&#10003; +${diff}</span>` : `<span class="tt2p-mgr-bad">needs +${-diff}</span>`)}${dTd(dt && !isNaN(dt) ? dt.toLocaleDateString() : "")}</tr>`);
        });
      });
    });
    return dTable(["Crime", "Role", "Your CPR", "Required", "Gap", "Updated"], rows);
  }

  /* ---- OC list (grouped like the in-game board) ---- */
  let ocSort = "time";
  let ocFilter = "";
  const ocOpen = new Set();
  function dashOcRow(r) {
    const timeCls = (h) => (h === null ? "" : h < 12 ? "tt2p-oc-t-bad" : h < 24 ? "tt2p-oc-t-warn" : "tt2p-oc-t-ok");
    const issues = [];
    const zero = r.slots.filter((s) => s.occ && s.st !== "complete" && s.st !== "in_progress").length;
    const partial = r.slots.some((s) => s.occ && s.st === "in_progress");
    const queued = Math.max(0, zero - (partial ? 0 : 1));
    const rows = r.slots.map((s) => {
      let member; let plan = ""; let cpr = ""; const notes = [];
      if (s.occ) {
        member = `${s.uid ? `<a href="https://www.torn.com/profiles.php?XID=${s.uid}" target="_blank" rel="noopener">${escapeHtml(s.name || "?")}</a>` : escapeHtml(s.name || "?")}${s.me ? ' <span class="tt2p-mgr-ok">&#9733; you</span>' : ""}`;
        plan = s.st === "complete" ? `<span class="tt2p-mgr-ok">Done</span>` : s.st === "in_progress" ? `<span class="tt2p-oc-bar"><i style="width:${Math.round(s.pct || 0)}%"></i></span> ${Math.round(s.pct || 0)}%` : `<span class="tt2p-mgr-dim">${s.miss ? "Blocked" : "Queued"}</span>`;
        const low = s.req !== undefined && s.cpr > 0 && s.cpr < s.req - LENIENCY;
        cpr = `<span class="${low ? "tt2p-mgr-bad" : ""}">${s.cpr || "-"}</span>${s.req !== undefined ? ` <span class="tt2p-mgr-dim">/ ${s.req}</span>` : ""}`;
        if (low) issues.push(`${s.name || "?"} (${s.role}): CPR ${s.cpr} is below the ${s.req} requirement`);
        if (s.miss) { const it = cachedItem(r.id + ":" + s.role); notes.push(`<span class="tt2p-mgr-bad">Missing ${escapeHtml(it && it.text ? it.text : "required item")}</span>`); issues.push(`${s.name || "?"} is missing an item`); }
      } else {
        member = `<span class="tt2p-mgr-dim">Open slot</span>`;
        cpr = s.req !== undefined ? `<span class="${s.qual === false ? "tt2p-mgr-bad" : "tt2p-mgr-ok"}">you ${s.cpr || "-"}</span> <span class="tt2p-mgr-dim">/ ${s.req}</span>` : "";
        notes.push(`<span class="tt2p-mgr-dim">${s.qual === true ? "you qualify" : s.qual === false ? "below your CPR" : ""}</span>`);
      }
      return `<tr>${dTd(escapeHtml(s.role))}${dTd(member)}${dTd(plan)}${dTd(cpr)}${dTd(notes.join(" "))}</tr>`;
    });
    if (r.stalled) issues.unshift("this OC is stalled");
    const kind = !r.filled ? "uninit" : r.opens.length ? "rec" : "full";
    const t = kind === "uninit" ? null : kind === "rec" ? r.waitNow : r.readyNow;
    const label = kind === "uninit" ? "Empty" : kind === "rec" ? "Stalls in" : "Ready in";
    const qb = queued ? `<span class="tt2p-oc-q tt2p-oc-q${Math.min(3, queued)}" title="${queued} member(s) waiting in the planning queue">${queued} queued</span>` : "";
    const warn = issues.length ? `<span class="tt2p-oc-warn" title="${escapeHtml(issues.join("\n"))}">&#9888; ${issues.length}</span>` : "";
    const body = (issues.length ? `<ul class="tt2p-oc-issues">${issues.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>` : "") +
      `<div class="tt2p-mgr-scroll"><table class="tt2p-mgr-table tt2p-oc-tbl"><thead><tr><th>Role</th><th>Member</th><th>Planning</th><th>CPR / req</th><th>Notes</th></tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
    return { kind, t, html: `<details class="tt2p-oc${r.isMine ? " tt2p-oc-mine" : ""}" data-id="${escapeHtml(r.id)}" ${ocOpen.has(String(r.id)) ? "open" : ""}><summary><span class="tt2p-oc-badge">${r.filled}/${r.total}</span>${warn}${qb}<span class="tt2p-oc-name">Lv${r.level || "?"} ${escapeHtml(r.name)}${r.isMine ? ' <span class="tt2p-mgr-ok">&#9733; you</span>' : ""}</span><span class="tt2p-oc-time ${timeCls(t)}">${t === null ? label : label + ": " + fmtHrs(t)}</span></summary><div class="tt2p-oc-body">${body}</div></details>` };
  }
  function dashOcListHtml(recs) {
    const q = ocFilter.trim().toLowerCase();
    const items = recs.filter((r) => !q || r.name.toLowerCase().includes(q) || r.slots.some((s) => s.occ && (s.name || "").toLowerCase().includes(q))).map((r) => Object.assign({ r }, dashOcRow(r)));
    const sorter = ocSort === "level" ? (a, b) => b.r.level - a.r.level || (a.t === null) - (b.t === null) || a.t - b.t : (a, b) => (a.t === null) - (b.t === null) || a.t - b.t;
    return [["uninit", "Uninitiated crimes"], ["rec", "Recruiting crimes"], ["full", "Full / planning crimes"]].map(([k, title]) => {
      const list = items.filter((i) => i.kind === k).sort(sorter);
      return `<div class="tt2p-oc-sec">${title} <span>(${list.length})</span></div>` + (list.length ? list.map((i) => i.html).join("") : `<div class="tt2p-mgr-note">None seen.</div>`);
    }).join("");
  }
  function dashOcPanelHtml(recs) {
    return `<div class="tt2p-oc-ctl"><span>Sort</span><button type="button" class="tt2p-btn ${ocSort === "time" ? "on" : ""}" data-ocsort="time">Time</button><button type="button" class="tt2p-btn ${ocSort === "level" ? "on" : ""}" data-ocsort="level">Level</button><input id="tt2p-board-search" type="text" placeholder="Search member or crime..." value="${escapeHtml(ocFilter)}" autocomplete="off" /><button type="button" class="tt2p-btn" data-ocall="1">Expand all</button><button type="button" class="tt2p-btn" data-ocall="0">Collapse all</button></div><div id="tt2p-board-list">${dashOcListHtml(recs)}</div>`;
  }

  /* ---- compact tab + full-screen overlay ---- */
  const DASH_VIEWS = [["overview", "Timeline"], ["ocs", "OC list"], ["cpr", "My CPRs"], ["settings", "Settings"]];
  let dashOvView = "overview";
  let settingsHome = null;

  function situationHtml(sit) {
    return sit.warnings.slice(0, 4).map((f) => `<div class="tt2p-find tt2p-find-${f.sev}"><i></i><div class="tt2p-find-txt"><b>${f.title}</b><div class="tt2p-find-cause">${f.cause}</div>${f.action ? `<div class="tt2p-find-act">${f.action}</div>` : ""}${f.extra || ""}</div>${f.view ? `<button type="button" class="tt2p-btn" data-open="${f.view}">Details</button>` : ""}</div>`).join("");
  }
  function dashLayer1() {
    const recs = ocRecords();
    const sit = dashSituation(recs);
    const btns = `<button type="button" class="tt2p-btn" data-open="overview">Full view &#8599;</button><button type="button" class="tt2p-btn" data-open="ocs">OC list</button><button type="button" class="tt2p-btn" data-open="settings">Settings</button>`;
    return dPanel("Your situation", situationHtml(sit), null, btns) +
      `<div class="tt2p-mgr-grid">${dPanel("Snapshot", dashSnapshot(recs), "ocs")}${dPanel("Finishing in 24h", dashFinishing(recs, 5, 24), "overview")}</div>` +
      dPanel("Pipeline: every OC, who is planning and what is still open", dashGantt(recs, false), "overview") +
      dPanel("Your CPR by level", dashCprCompact(), "cpr");
  }
  function dashOverlayHtml(view) {
    const recs = ocRecords();
    switch (view) {
      case "ocs": return dPanel("Running OCs", dashOcPanelHtml(recs));
      case "cpr": return dPanel("Your CPR for every role", dashCprFull());
      case "settings": return "";
      default: return dPanel("Your situation", situationHtml(dashSituation(recs))) + dPanel("Pipeline: every OC", dashGantt(recs, true)) + dPanel("Finishing in the next 48h", dashFinishing(recs, 60, 48));
    }
  }
  function restoreSettingsPanel() {
    if (settingsPanelEl && settingsHome && settingsPanelEl.parentElement !== settingsHome) settingsHome.appendChild(settingsPanelEl);
  }
  function renderOverlay() {
    const ov = document.getElementById("tt2p-mgr-overlay");
    if (!ov) return;
    const body = ov.querySelector(".tt2p-ov-body");
    const top = body.scrollTop;
    ov.querySelector(".tt2p-ov-nav").innerHTML = DASH_VIEWS.map(([v, l]) => `<button type="button" class="${v === dashOvView ? "on" : ""}" data-view="${v}">${l}</button>`).join("");
    if (dashOvView === "settings" && settingsPanelEl) {
      body.innerHTML = "";
      body.appendChild(settingsPanelEl);
      renderSettingsPanel();
      renderGrowthPanel();
    } else {
      restoreSettingsPanel();
      body.innerHTML = dashOverlayHtml(dashOvView);
    }
    body.scrollTop = top;
  }
  function openOverlay(view) {
    const ov = ensureOverlay();
    dashOvView = DASH_VIEWS.some(([v]) => v === view) ? view : "overview";
    ov.classList.add("tt2p-open");
    document.documentElement.classList.add("tt2p-ov-lock");
    renderOverlay();
    ov.querySelector(".tt2p-ov-body").scrollTop = 0;
  }
  function closeOverlay() {
    const ov = document.getElementById("tt2p-mgr-overlay");
    restoreSettingsPanel();
    if (ov) ov.classList.remove("tt2p-open");
    document.documentElement.classList.remove("tt2p-ov-lock");
  }
  function renderDashboard() {
    const el = document.getElementById("tt2p-mgr-dashboard");
    if (el) {
      try { el.innerHTML = dashLayer1(); }
      catch (e) { console.error("[OC Prioritizer] dashboard error", e); el.innerHTML = `<div class="tt2p-mgr-err">Dashboard error: ${escapeHtml(e.message)}</div>`; }
    }
    const ov = document.getElementById("tt2p-mgr-overlay");
    if (ov && ov.classList.contains("tt2p-open")) renderOverlay();
  }
  function dashHandleClick(e) {
    const t = e.target.closest && e.target.closest("[data-open],[data-view],[data-close],[data-ocsort],[data-ocall]");
    if (!t) return;
    if (t.dataset.open) return openOverlay(t.dataset.open);
    if (t.dataset.view) { dashOvView = t.dataset.view; return renderOverlay(); }
    if (t.dataset.close !== undefined) return closeOverlay();
    if (t.dataset.ocsort) { ocSort = t.dataset.ocsort; return renderOverlay(); }
    if (t.dataset.ocall !== undefined) {
      ocOpen.clear();
      if (t.dataset.ocall === "1") ocRecords().forEach((r) => ocOpen.add(String(r.id)));
      const lst = document.getElementById("tt2p-board-list");
      if (lst) lst.innerHTML = dashOcListHtml(ocRecords());
    }
  }
  function ensureOverlay() {
    let ov = document.getElementById("tt2p-mgr-overlay");
    if (ov) return ov;
    ov = document.createElement("div");
    ov.id = "tt2p-mgr-overlay";
    ov.innerHTML = `<div class="tt2p-ov-head title-black"><b class="tt2p-ov-title">Mutation OC Prioritizer</b><nav class="tt2p-ov-nav"></nav><button type="button" class="tt2p-btn" data-close="1">Close &#10005;</button></div><div class="tt2p-ov-body"></div>`;
    ov.addEventListener("click", dashHandleClick);
    ov.addEventListener("input", (e) => {
      if (e.target.id !== "tt2p-board-search") return;
      ocFilter = e.target.value;
      const lst = document.getElementById("tt2p-board-list");
      if (lst) lst.innerHTML = dashOcListHtml(ocRecords());
    });
    ov.addEventListener("toggle", (e) => {
      const d = e.target;
      if (d && d.classList && d.classList.contains("tt2p-oc")) { if (d.open) ocOpen.add(d.dataset.id); else ocOpen.delete(d.dataset.id); }
    }, true);
    document.body.appendChild(ov);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && ov.classList.contains("tt2p-open")) closeOverlay(); });
    return ov;
  }
  function ensureDashboard() {
    let el = document.getElementById("tt2p-mgr-dashboard");
    if (el) return el;
    el = document.createElement("div");
    el.id = "tt2p-mgr-dashboard";
    el.addEventListener("click", dashHandleClick);
    return el;
  }
  function dashOnTabOpen() {
    renderDashboard();
  }

  /* ============================================================================
   * "Prioritizer Settings" as a 4th Crimes tab
   * Recruiting | Planning | Completed | Prioritizer Settings
   * Clones a native tab button (so it styles identically), appends it to Torn's tab
   * bar and puts our settings panel right under the bar. While it is open we hide
   * Torn's own tab content with CSS (no Torn DOM is removed, so React stays happy).
   * ============================================================================ */
  let nativeActiveCls = null; // Torn's hashed "active___xxxxx" class, discovered at runtime

  function crimesTabParts() {
    const root = document.getElementById("faction-crimes-root");
    const bar = root ? root.querySelector('[class*="buttonsContainer__"]') : null;
    return { root, bar };
  }
  const isActiveCls = (c) => /^active__/.test(c);

  function ensureSettingsTab() {
    const { root, bar } = crimesTabParts();
    if (!root || !bar || !settingsPanelEl) return;
    const natives = Array.from(bar.querySelectorAll("button")).filter((b) => !b.classList.contains("tt2p-settings-tab-btn"));
    if (!natives.length) return;

    const activeNative = natives.find((b) => Array.from(b.classList).some(isActiveCls));
    if (activeNative) nativeActiveCls = Array.from(activeNative.classList).find(isActiveCls);

    let btn = bar.querySelector(".tt2p-settings-tab-btn");
    if (!btn) {
      btn = natives[0].cloneNode(true);
      btn.removeAttribute("i-data");
      Array.from(btn.classList).filter(isActiveCls).forEach((c) => btn.classList.remove(c));
      btn.classList.add("tt2p-settings-tab-btn");
      btn.title = "Mutation Prioritizer settings (Manager build)";
      const icon = btn.querySelector('[class*="iconWrapper__"]');
      if (icon) icon.innerHTML = "";
      const label = btn.querySelector('[class*="tabName__"]');
      const html = '<span class="tt2p-lbl-full">Prioritizer Settings</span><span class="tt2p-lbl-short">Prioritizer</span>';
      if (label) label.innerHTML = html; else btn.innerHTML = html;
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        openSettingsTab();
      });
      bar.appendChild(btn);
    }

    let tabPanel = document.getElementById("tt2p-settings-tab-panel");
    if (!tabPanel) {
      tabPanel = document.createElement("div");
      tabPanel.id = "tt2p-settings-tab-panel";
      tabPanel.appendChild(ensureDashboard());
      const cprDetails = document.createElement("details");
      cprDetails.className = "tt2p-mgr-sec tt2p-mgr-cpr";
      cprDetails.innerHTML = "<summary>Prioritizer settings &amp; your CPR data</summary>";
      cprDetails.appendChild(settingsPanelEl);
      settingsHome = cprDetails;
      tabPanel.appendChild(cprDetails);
    }
    if (tabPanel.previousElementSibling !== bar) bar.insertAdjacentElement("afterend", tabPanel);

    // leaving via one of Torn's own tabs: hand the view back to Torn
    if (!bar.__tt2pTabBound) {
      bar.__tt2pTabBound = true;
      bar.addEventListener("click", (e) => {
        const b = e.target.closest && e.target.closest("button");
        if (!b || b.classList.contains("tt2p-settings-tab-btn") || !settingsTabOpen) return;
        closeSettingsTab(b);
      }, true);
    }

    // keep highlight correct if Torn re-rendered the bar while we are open
    if (settingsTabOpen && nativeActiveCls) {
      natives.forEach((b) => b.classList.remove(nativeActiveCls));
      btn.classList.add(nativeActiveCls);
      root.classList.add("tt2p-settings-open");
    }
  }

  function openSettingsTab() {
    ensureSettingsTab();
    const { root, bar } = crimesTabParts();
    if (!root || !bar) return;
    // remember which of Torn's tabs was showing, and take one last look at its cards (no extra requests)
    lastNativeTab = currentNativeTab() || lastNativeTab;
    refreshOcCacheFromDom(lastNativeTab);
    settingsTabOpen = true;
    const btn = bar.querySelector(".tt2p-settings-tab-btn");
    if (nativeActiveCls) {
      bar.querySelectorAll("button").forEach((b) => b.classList.remove(nativeActiveCls));
      if (btn) btn.classList.add(nativeActiveCls);
    }
    root.classList.add("tt2p-settings-open");
    ensureCustomTooltip().classList.remove("tt2p-tooltip-visible");
    renderSettingsPanel();
    renderGrowthPanel();
    dashOnTabOpen();
  }

  function closeSettingsTab(clickedNative) {
    if (!settingsTabOpen) return;
    settingsTabOpen = false;
    const { root, bar } = crimesTabParts();
    if (root) root.classList.remove("tt2p-settings-open");
    const btn = bar && bar.querySelector(".tt2p-settings-tab-btn");
    if (btn && nativeActiveCls) btn.classList.remove(nativeActiveCls);
    // if the user re-clicked the tab Torn already considers active, React won't re-add its class
    if (clickedNative && nativeActiveCls) {
      setTimeout(() => clickedNative.classList.add(nativeActiveCls), 40);
    }
    if (latestDebouncedPass) latestDebouncedPass();
  }

  function renderSettingsPanel() {
    const body = document.getElementById("tt2p-settings-body");
    if (!body) return;
    const store = loadStore();
    const crimeNames = sortCrimeNamesByDifficulty(Object.keys(store));

    if (crimeNames.length === 0) {
      body.innerHTML = `<div class="tt2p-settings-empty">No CPR data stored yet. Browse Recruiting/Planning to capture some.</div>`;
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
      const roleNames = sortRoleNamesByWeight(crimeName, Object.keys(roles));
      const reqMap = CPR_REQUIREMENTS[crimeName];
      html += `<div class="tt2p-settings-crime">${escapeHtml(crimeName)}</div>`;
      roleNames.forEach((roleName) => {
        const entry = roles[roleName];
        const dt = new Date(entry.updatedAt);
        const dateStr = isNaN(dt) ? "" : dt.toLocaleDateString() + " " + dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

        let reqText = "—";
        let diffHtml = `<span class="tt2p-diff-neutral">—</span>`;
        if (reqMap) {
          const req = normalizeLookup(reqMap, roleName);
          if (req !== undefined) {
            reqText = String(req);
            const diff = entry.value - req;
            diffHtml = diff >= 0
              ? `<span class="tt2p-diff-met">✓ +${diff}</span>`
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

  function renderGrowthPanel() {
    const listEl = document.getElementById("tt2p-growth-list");
    const rangeSel = document.getElementById("tt2p-growth-range");
    if (!listEl || !rangeSel) return;

    const days = rangeSel.value === "lifetime" ? null : parseInt(rangeSel.value, 10);
    const cutoff = days ? Date.now() - days * 24 * 60 * 60 * 1000 : null;

    const store = loadStore();
    const crimeNames = sortCrimeNamesByDifficulty(Object.keys(store));
    let rows = "";
    let anyData = false;

    crimeNames.forEach((crimeName) => {
      const roles = store[crimeName];
      const roleNames = sortRoleNamesByWeight(crimeName, Object.keys(roles));
      let crimeRows = "";

      roleNames.forEach((roleName) => {
        const entry = roles[roleName];
        const history = entry.history && entry.history.length ? entry.history : [{ value: entry.value, at: entry.updatedAt }];
        const inRange = cutoff ? history.filter((h) => new Date(h.at).getTime() >= cutoff) : history;
        if (inRange.length === 0) return;

        let startValue;
        if (cutoff) {
          const before = history.filter((h) => new Date(h.at).getTime() < cutoff);
          startValue = before.length ? before[before.length - 1].value : inRange[0].value;
        } else {
          startValue = history[0].value;
        }
        const endValue = entry.value;
        const growth = endValue - startValue;
        anyData = true;

        const growthHtml = growth > 0
          ? `<span class="tt2p-diff-met">+${growth}</span>`
          : growth < 0
            ? `<span class="tt2p-diff-short">${growth}</span>`
            : `<span class="tt2p-diff-neutral">+0</span>`;

        crimeRows += `<div class="tt2p-settings-role tt2p-growth-row">
          <span>${escapeHtml(roleName)}</span>
          <span class="tt2p-col-num">${startValue}</span>
          <span class="tt2p-col-num tt2p-growth-arrow">→</span>
          <span class="tt2p-col-num">${endValue}</span>
          <span class="tt2p-col-num">${growthHtml}</span>
        </div>`;
      });

      if (crimeRows) {
        rows += `<div class="tt2p-settings-crime">${escapeHtml(crimeName)}</div>${crimeRows}`;
      }
    });

    if (!anyData) {
      listEl.innerHTML = `<div class="tt2p-settings-empty">No CPR observations in this range yet.</div>`;
      return;
    }

    listEl.innerHTML = `
      <div class="tt2p-settings-role tt2p-settings-headerrow tt2p-growth-row">
        <span>Role</span>
        <span class="tt2p-col-num">Start</span>
        <span class="tt2p-col-num"></span>
        <span class="tt2p-col-num">Now</span>
        <span class="tt2p-col-num">Growth</span>
      </div>
      ${rows}
    `;
  }

  /* ============================================================================
   * Styles (Inter Font + Carbon-style Join Cross & Delta Box + Bento Header Placement)
   * ============================================================================ */
  function injectStyles() {
    if (document.getElementById("tt2p-styles")) return;

    if (!document.getElementById("tt2p-font-inter")) {
      const fontLink = document.createElement("link");
      fontLink.id = "tt2p-font-inter";
      fontLink.rel = "stylesheet";
      fontLink.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap";
      document.head.appendChild(fontLink);
    }

    const style = document.createElement("style");
    style.id = "tt2p-styles";
    style.textContent = `
      :root {
        --tt2p-red-accent: #c82121;
        --tt2p-red-border: #882222;
        --tt2p-red-light: #ff8787;
        --tt2p-red-pink: #ffaaaa;
        --tt2p-red-darkbg: #1f1111;
        --tt2p-charcoal: #1e1e1e;
        --tt2p-deep: #121212;
        --tt2p-border: #2a2a2a;
        --tt2p-text: #e8e8e8;
        --tt2p-mute: #888888;
        --tt2p-good: #5ad06e;
        --tt2p-warn: #f0b43c;
      }

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
        background: var(--tt2p-charcoal);
        border: 1px solid var(--tt2p-good);
        color: var(--tt2p-text);
        font-size: 12px;
        font-family: 'Inter', Arial, sans-serif;
        padding: 8px 12px;
        border-radius: 4px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.5);
        opacity: 0;
        transform: translateX(20px);
        transition: opacity 0.25s ease, transform 0.25s ease;
        max-width: 280px;
      }
      .tt2p-toast-in { opacity: 1; transform: translateX(0); }
      .tt2p-toast-out { opacity: 0; transform: translateX(20px); }

      /* Remove native border above role cards */
      div[class*="slots__"],
      .tt2p-roles-container {
        border-top: none !important;
        box-shadow: none !important;
        background-image: none !important;
        margin-top: 6px !important; /* thin buffer between chevrons and roles */
        padding-top: 0 !important;
      }
      div[class*="slots__"]::before,
      div[class*="slots__"]::after,
      .tt2p-roles-container::before,
      .tt2p-roles-container::after {
        display: none !important;
        content: none !important;
        border: none !important;
      }
      /* Nothing below the chevron bars should draw a line either */
      .tt2p-timeline-strip {
        border-bottom: none !important;
        padding-bottom: 0 !important;
        margin-bottom: 0 !important;
      }

      /* Subtle Tinted Role Backgrounds */
      .tt2p-role-good > button[class*="slotHeader__"] {
        background-color: rgba(90, 208, 110, 0.12) !important;
        border-radius: 4px;
      }
      .tt2p-role-bad > button[class*="slotHeader__"] {
        background-color: rgba(200, 33, 33, 0.15) !important;
        border-radius: 4px;
      }

      /* Carbon-Style Disabled Join Button with Red Cross Overlay */
      button[class*="joinButton__"].tt2p-join-disabled {
        position: relative !important;
        pointer-events: none !important;
        opacity: 0.45 !important;
        cursor: not-allowed !important;
        text-decoration: line-through;
      }
      button[class*="joinButton__"].tt2p-join-disabled::after {
        content: '✕';
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ff3b30;
        font-family: Arial, sans-serif;
        font-weight: 900;
        font-size: 18px;
        line-height: 1;
        text-shadow: 0 0 3px #000, 0 0 1px #000;
        pointer-events: none;
      }

      /* Carbon-Style Delta Box replacing "24hrs" planning box */
      div[class*="planningTime__"].tt2p-delta-box {
        cursor: help !important;
      }
      div[class*="planningTime__"].tt2p-delta-box > span {
        display: none !important;
      }
      .tt2p-cpr-delta {
        font-family: 'Inter', Arial, sans-serif;
        font-weight: 800;
        font-size: 12px;
        letter-spacing: 0.3px;
        color: var(--tt2p-good);
      }
      .tt2p-cpr-delta.tt2p-cpr-delta-bad {
        color: var(--tt2p-red-light);
      }

      #${NOT_QUALIFIED_HEADER_ID} {
        display: flex;
        align-items: center;
        gap: 10px;
        margin: 18px 0 10px 0;
        padding: 8px 12px;
        border-radius: 4px;
        background: rgba(200, 33, 33, 0.15);
        border: 1px dashed var(--tt2p-red-border);
        color: var(--tt2p-red-light);
        font-family: 'Inter', Arial, sans-serif;
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0.3px;
      }
      .tt2p-not-qualified-card { opacity: 0.75; }

      .tt2p-status-badge {
        margin-top: 6px;
        display: inline-block;
        padding: 3px 8px;
        border-radius: 4px;
        font-family: 'Inter', Arial, sans-serif;
        font-size: 11px;
        font-weight: 700;
      }
      .tt2p-status-badge.tt2p-status-crowded {
        background: rgba(240, 180, 60, 0.15);
        border: 1px solid rgba(240, 180, 60, 0.5);
        color: var(--tt2p-warn);
      }
      .tt2p-status-badge.tt2p-status-stalled {
        background: var(--tt2p-red-darkbg);
        border: 1px solid var(--tt2p-red-border);
        color: var(--tt2p-red-light);
      }

      /* Bento Box Summary Container */
      .tt2p-top-bento-container {
        margin: 10px 12px 10px 12px; /* Uniform 10px top & bottom margin */
        font-family: 'Inter', Arial, sans-serif;
      }
      .tt2p-bento-grid {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 6px;
      }
      @media (max-width: 1024px) {
        .tt2p-bento-grid { grid-template-columns: repeat(3, 1fr); }
      }
      @media (max-width: 600px) {
        .tt2p-bento-grid { grid-template-columns: repeat(2, 1fr); }
      }
      .tt2p-bento-tile {
        background: #1a1a1a;
        border: 1px solid var(--tt2p-border);
        border-top: 2px solid var(--tt2p-red-border);
        border-radius: 4px;
        padding: 6px 8px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        box-sizing: border-box;
      }
      .tt2p-bento-tile.tt2p-bento-active { border-top-color: var(--tt2p-red-accent); }
      .tt2p-bento-tile.tt2p-bento-warning { border-top-color: var(--tt2p-warn); }
      .tt2p-bento-tile.tt2p-bento-danger { border-top-color: var(--tt2p-red-accent); background: var(--tt2p-red-darkbg); }
      .tt2p-bento-label {
        font-family: 'Inter', sans-serif;
        font-size: 9px;
        font-weight: 600;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        color: var(--tt2p-mute);
        margin-bottom: 2px;
      }
      .tt2p-bento-val {
        font-family: 'Inter', sans-serif;
        font-size: 12px;
        font-weight: 700;
        color: var(--tt2p-text);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-variant-numeric: tabular-nums;
      }

      /* Timeline Strip Header & Lower Section Layout with 2px Bevel Framing */
      .tt2p-timeline-strip {
        margin: 0;
        padding-top: 10px; /* Uniform 10px gap between top divider and crimeID text */
        border-top: 1px solid #000000 !important;
        box-shadow: inset 0 1px 0 #484848; /* 2px bevel top divider */
        font-family: 'Inter', Arial, sans-serif;
      }
      .tt2p-tl-strip-header {
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        gap: 4px;
        font-size: 11px;
        margin-top: 0 !important;
        margin-bottom: 2px;
        color: var(--tt2p-text);
      }
      .tt2p-tl-strip-title {
        font-weight: 400;
        color: var(--tt2p-text, #e8e8e8);
      }

      .tt2p-tl-strip-bars {
        display: flex;
        margin-top: 10px !important; /* Uniform 10px gap between bottom divider and progress bars */
        margin-bottom: 0px !important; /* 6px gap to role sections handled via container margin */
      }

      .tt2p-tl-seg {
        height: 18px;
        border-radius: 3px;
        background: var(--tt2p-deep);
        box-shadow: inset 0 1px 3px rgba(0,0,0,0.6);
        position: relative;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        clip-path: polygon(0% 0%, 88% 0%, 100% 50%, 88% 100%, 0% 100%, 12% 50%);
        filter: drop-shadow(1px 0 0 rgba(0,0,0,0.9)) drop-shadow(-1px 0 0 rgba(0,0,0,0.9)) drop-shadow(0 1px 0 rgba(0,0,0,0.9)) drop-shadow(0 -1px 0 rgba(0,0,0,0.9));
      }
      .tt2p-tl-seg-first { clip-path: polygon(0% 0%, 88% 0%, 100% 50%, 88% 100%, 0% 100%); }
      .tt2p-tl-seg-last { clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 12% 50%); }
      .tt2p-tl-seg-only { clip-path: none; border-radius: 4px; }
      .tt2p-tl-seg-fill {
        position: absolute;
        left: 0; top: 0; bottom: 0;
        transition: width 0.35s ease;
      }
      .tt2p-tl-seg-complete .tt2p-tl-seg-fill {
        background: linear-gradient(90deg, var(--tt2p-red-border), var(--tt2p-red-accent));
      }
      .tt2p-tl-seg-active .tt2p-tl-seg-fill {
        background-image:
          linear-gradient(90deg, var(--tt2p-red-accent), var(--tt2p-red-light)),
          repeating-linear-gradient(45deg, rgba(255,255,255,0.25) 0 7px, transparent 7px 14px);
        animation: tt2p-flow-stripes 0.9s linear infinite;
      }
      @keyframes tt2p-flow-stripes {
        from { background-position: 0 0, 0 0; }
        to   { background-position: 0 0, 28px 0; }
      }
      .tt2p-tl-seg-idle { background: var(--tt2p-deep); }
      .tt2p-tl-seg-idle-warn { background: rgba(200, 33, 33, 0.2); }
      .tt2p-tl-seg-blocked { background: rgba(160, 90, 220, 0.2); }
      .tt2p-tl-seg-open { background: rgba(255,255,255,0.03); }
      .tt2p-tl-seg-label {
        position: relative;
        z-index: 2;
        font-family: 'Inter', sans-serif;
        font-size: 8.5px;
        font-weight: 700;
        color: #fff;
        text-shadow: 0 1px 2px rgba(0,0,0,0.8);
        padding: 0 4px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      /* Metadata Stall Row with Bottom 2px Bevel framing */
      .tt2p-tl-stall-row {
        font-family: 'Inter', sans-serif;
        font-size: 11px;
        color: var(--tt2p-mute);
        padding-bottom: 10px !important; /* Uniform 10px gap between text and bottom divider */
        margin-bottom: 0 !important;
        border-bottom: 1px solid #000000 !important;
        box-shadow: 0 1px 0 #484848; /* 2px bevel bottom divider */
      }
      .tt2p-tl-stall-row.tt2p-tl-stall-warn { color: var(--tt2p-red-accent); font-weight: 700; }
      .tt2p-tl-stall-row.tt2p-tl-stall-ok { color: var(--tt2p-good); }
      .tt2p-tl-stall-row.tt2p-tl-stall-uninitiated { color: #9fd3ff; }
      .tt2p-tl-stall-row.tt2p-tl-stall-top-pick { color: var(--tt2p-warn); font-weight: 700; }

      /* Red Progress Bar Below Each Role Box */
      .tt2p-role-prog-bar {
        position: absolute;
        left: 2px;
        right: 2px;
        bottom: -6px;
        height: 4px;
        background: #262626;
        border-radius: 2px;
        overflow: hidden;
        z-index: 4;
        box-shadow: inset 0 1px 2px rgba(0,0,0,0.5);
      }
      .tt2p-role-prog-fill {
        display: block;
        height: 100%;
        background: linear-gradient(90deg, var(--tt2p-red-border), var(--tt2p-red-accent));
        transition: width 0.3s ease;
      }
      .tt2p-prog-complete .tt2p-role-prog-fill { background: var(--tt2p-red-border); }
      .tt2p-prog-active .tt2p-role-prog-fill {
        background: linear-gradient(90deg, var(--tt2p-red-accent), var(--tt2p-red-light));
        box-shadow: 0 0 5px var(--tt2p-red-accent);
      }
      .tt2p-prog-idle .tt2p-role-prog-fill { background: transparent; }
      .tt2p-prog-blocked .tt2p-role-prog-fill { background: var(--tt2p-red-pink); }

      /* Custom tooltip */
      #tt2p-tooltip {
        position: fixed;
        z-index: 9999999;
        background: var(--tt2p-charcoal);
        border: 1px solid var(--tt2p-red-border);
        border-radius: 6px;
        padding: 8px 10px;
        font-family: 'Inter', Arial, sans-serif;
        font-size: 12px;
        color: var(--tt2p-text);
        max-width: 260px;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.1s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.6);
      }
      #tt2p-tooltip.tt2p-tooltip-visible { opacity: 1; }
      .tt2p-tt-title { font-weight: 700; margin-bottom: 4px; color: var(--tt2p-red-pink); }
      .tt2p-tt-row { margin-top: 2px; }
      .tt2p-tt-pass { color: var(--tt2p-good); font-weight: 700; }
      .tt2p-tt-fail { color: var(--tt2p-red-light); font-weight: 700; }
      .tt2p-tt-idle { color: var(--tt2p-warn); font-weight: 700; }

      /* Gear + settings panel */
      #tt2p-gear-btn {
        position: fixed;
        right: 14px;
        top: 60px;
        z-index: 999999;
        width: 26px;
        padding: 8px 0;
        border-radius: 13px;
        background: var(--tt2p-charcoal);
        border: 1px solid rgba(255,255,255,0.2);
        color: var(--tt2p-text);
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
        font-weight: 700;
        letter-spacing: 0.03em;
        font-family: 'Inter', Arial, sans-serif;
        white-space: nowrap;
      }
      #tt2p-settings-panel {
        position: fixed;
        right: 14px;
        top: 60px;
        width: min(420px, calc(100vw - 28px));
        max-height: min(460px, 75vh);
        overflow-y: auto;
        background: var(--tt2p-charcoal);
        border: 1px solid var(--tt2p-red-border);
        border-radius: 6px;
        padding: 12px;
        z-index: 999999;
        font-family: 'Inter', Arial, sans-serif;
        font-size: 12px;
        color: var(--tt2p-text);
        display: none;
      }
      #tt2p-settings-panel.tt2p-open { display: block; }
      .tt2p-settings-header { font-weight: 700; font-size: 13px; margin-bottom: 8px; color: var(--tt2p-red-pink); }
      .tt2p-settings-empty { opacity: 0.7; font-style: italic; }
      .tt2p-settings-crime { font-weight: 700; margin-top: 10px; margin-bottom: 2px; color: #9fd3ff; }
      .tt2p-settings-role {
        display: grid;
        grid-template-columns: 1fr 62px 46px 66px 96px;
        align-items: center;
        gap: 6px;
        padding: 3px 0;
        border-bottom: 1px solid rgba(255,255,255,0.06);
      }
      .tt2p-settings-headerrow {
        font-weight: 700;
        font-size: 10.5px;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        color: var(--tt2p-red-pink);
        border-bottom: 1px solid rgba(255,255,255,0.15);
        padding-bottom: 5px;
      }
      .tt2p-col-num { text-align: right; font-variant-numeric: tabular-nums; }
      .tt2p-settings-value { font-weight: 700; }
      .tt2p-diff-met { color: var(--tt2p-good); font-weight: 700; }
      .tt2p-diff-short { color: var(--tt2p-red-light); font-weight: 700; }
      .tt2p-diff-neutral { opacity: 0.4; }

      .tt2p-tabs { display: flex; gap: 4px; margin: 6px 0 8px; }
      .tt2p-tab-btn {
        flex: 1;
        padding: 5px 8px;
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.15);
        color: var(--tt2p-mute);
        border-radius: 4px;
        cursor: pointer;
        font-size: 11px;
        font-family: 'Inter', sans-serif;
      }
      .tt2p-tab-btn:hover { background: rgba(255,255,255,0.08); }
      .tt2p-tab-btn.tt2p-tab-active {
        background: var(--tt2p-red-darkbg);
        border-color: var(--tt2p-red-accent);
        color: var(--tt2p-red-pink);
        font-weight: 700;
      }
      .tt2p-tab-panel { display: none; }
      .tt2p-tab-panel.tt2p-tab-panel-active { display: block; }

      .tt2p-growth-controls { display: flex; align-items: center; gap: 8px; font-size: 11px; margin-bottom: 8px; }
      .tt2p-growth-controls select {
        background: var(--tt2p-deep);
        border: 1px solid rgba(255,255,255,0.2);
        color: var(--tt2p-text);
        border-radius: 4px;
        padding: 3px 6px;
        font-size: 11px;
      }
      .tt2p-growth-row { grid-template-columns: 1fr 44px 20px 44px 56px; }
      .tt2p-growth-arrow { opacity: 0.5; }
      .tt2p-col-date { opacity: 0.6; font-size: 10px; white-space: nowrap; text-align: right; }
      #tt2p-purge-btn {
        width: 100%;
        margin-top: 12px;
        padding: 6px;
        background: var(--tt2p-red-darkbg);
        border: 1px solid var(--tt2p-red-accent);
        color: var(--tt2p-red-light);
        border-radius: 4px;
        cursor: pointer;
        font-weight: 700;
      }
      #tt2p-purge-btn:hover { background: rgba(200, 33, 33, 0.3); }

      .tt2p-settings-row { display: flex; flex-direction: column; gap: 6px; font-size: 12px; }
      .tt2p-settings-row input[type="number"] {
        width: 60px;
        background: var(--tt2p-deep);
        border: 1px solid rgba(255,255,255,0.2);
        color: var(--tt2p-text);
        border-radius: 4px;
        padding: 4px 6px;
      }
      .tt2p-settings-row button {
        background: rgba(68, 204, 68, 0.15);
        border: 1px solid var(--tt2p-good);
        color: var(--tt2p-good);
        border-radius: 4px;
        padding: 4px 8px;
        cursor: pointer;
        font-weight: 700;
      }
      .tt2p-settings-row button:hover { background: rgba(68, 204, 68, 0.3); }
      .tt2p-settings-checkbox-label { display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 12px; }

      #tt2p-sort-toggle-row {
        display: flex;
        align-items: center;
        gap: 10px;
        margin: 10px 0;
        padding: 8px 12px;
        border-radius: 4px;
        background: var(--tt2p-charcoal);
        border: 1px solid var(--tt2p-border);
        font-family: 'Inter', Arial, sans-serif;
        font-size: 12px;
        color: var(--tt2p-text);
      }
      .tt2p-toggle-label { font-weight: 700; opacity: 0.9; }

      #tt2p-star-legend {
        margin: -4px 0 10px;
        padding: 6px 12px;
        border-radius: 4px;
        background: var(--tt2p-charcoal);
        border: 1px solid rgba(255,255,255,0.08);
        font-family: 'Inter', Arial, sans-serif;
        font-size: 11px;
        color: var(--tt2p-mute);
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
      .tt2p-pill-on { background: var(--tt2p-red-accent); }
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
      /* ---- MANAGER / UAT: density-line planning bar ---- */
      .tt2p-dens-host { display: block; }
      .tt2p-dens { position: relative; padding-top: 20px; padding-bottom: 1px; user-select: none; -webkit-user-select: none; -webkit-tap-highlight-color: transparent; }
      .tt2p-dens-pinrow { position: absolute; left: 2px; right: 2px; top: 0; height: 20px; pointer-events: none; }
      .tt2p-dens-pin {
        position: absolute; top: 0; left: var(--tt2p-pin-left, 0%);
        width: 18px; height: 18px; margin-left: -9px; box-sizing: border-box;
        border-radius: 50%; background: #161616;
        border: 2px solid var(--tt2p-pin-color, #c82121); color: var(--tt2p-pin-color, #c82121);
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 0 6px var(--tt2p-pin-glow, rgba(200,33,33,.6));
        pointer-events: auto; cursor: help; z-index: 3;
      }
      .tt2p-dens-pin::after {
        content: ""; position: absolute; left: 50%; bottom: -6px; margin-left: -4px;
        border-style: solid; border-width: 5px 4px 0 4px;
        border-color: var(--tt2p-pin-color, #c82121) transparent transparent transparent;
      }
      .tt2p-dens-outer {
        position: relative; padding: 2px; box-sizing: border-box; border-radius: 6px;
        background: #0d0d0d; border: 1px solid #000;
        box-shadow: 0 1px 0 #484848, inset 0 1px 2px rgba(0,0,0,.8);
      }
      .tt2p-dens-inner { border-radius: 4px; overflow: hidden; background: #1a1a1a; }
      .tt2p-dens-track { position: relative; height: 8px; }
      .tt2p-dens-seg { position: absolute; top: 0; bottom: 0; cursor: help; }
      .tt2p-dens-seg-fill { position: absolute; left: 0; top: 0; bottom: 0; transition: width .35s ease; }
      .tt2p-dens-complete { background: linear-gradient(180deg, #a82a2a 0%, #7a1a1a 100%); }
      .tt2p-dens-active { background: #2c2c2c; }
      .tt2p-dens-active .tt2p-dens-seg-fill {
        background-image:
          linear-gradient(45deg, rgba(255,255,255,.22) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.22) 50%, rgba(255,255,255,.22) 75%, transparent 75%, transparent),
          linear-gradient(180deg, #e04a4a 0%, #c82121 100%);
        background-size: 12px 12px, auto;
        animation: tt2p-dens-stripes .9s linear infinite;
      }
      @keyframes tt2p-dens-stripes {
        from { background-position: 0 0, 0 0; }
        to   { background-position: 12px 0, 0 0; }
      }
      @media (prefers-reduced-motion: reduce) { .tt2p-dens-active .tt2p-dens-seg-fill { animation: none; } }
      .tt2p-dens-queued { background: #2e2e2e; }
      .tt2p-dens-blocked { background: rgba(160, 90, 220, .45); }
      .tt2p-dens-vacant { background: repeating-linear-gradient(135deg, #191919 0 4px, #121212 4px 8px); }
      .tt2p-dens-stripes {
        position: absolute; inset: 0; pointer-events: none;
        background: repeating-linear-gradient(90deg, rgba(255,255,255,.035) 0 1px, transparent 1px 4px);
      }
      .tt2p-dens-delims { position: absolute; left: 2px; right: 2px; top: -3px; bottom: -3px; pointer-events: none; }
      .tt2p-dens-delim { position: absolute; top: 0; bottom: 0; width: 1px; background: #6b6b6b; box-shadow: -1px 0 0 #000, 1px 0 0 #000; }
      .tt2p-dens-labels { position: relative; height: 12px; margin: 3px 2px 0; }
      .tt2p-dens-label {
        position: absolute; top: 0; box-sizing: border-box; padding: 0 3px; text-align: center;
        font-family: 'Inter', Arial, sans-serif; font-size: 9px; line-height: 12px; color: #8a8a8a;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: help;
      }
      .tt2p-dens-label-active { color: #e8e8e8; font-weight: 600; }
      .tt2p-dens-label-complete { color: #b98a8a; }

      /* ---- MANAGER / UAT: Prioritizer Settings as a 4th Crimes tab ---- */
      #tt2p-settings-tab-panel { display: none; margin: 10px 0; }
      #faction-crimes-root.tt2p-settings-open #tt2p-settings-tab-panel { display: block; }
      #faction-crimes-root.tt2p-settings-open > div > *:not(svg):not([class*="buttonsContainer__"]):not(#tt2p-settings-tab-panel) { display: none !important; }
      #tt2p-settings-tab-panel #tt2p-settings-panel {
        position: static; display: block; width: auto; max-height: none;
        overflow: visible; z-index: auto; box-sizing: border-box;
      }
      .tt2p-settings-tab-btn { min-width: 0; }
      .tt2p-settings-tab-btn .tt2p-lbl-short { display: none; }
      .tt2p-settings-tab-btn .tt2p-lbl-full, .tt2p-settings-tab-btn .tt2p-lbl-short { white-space: nowrap; }
      @media (max-width: 560px) {
        .tt2p-settings-tab-btn .tt2p-lbl-full { display: none; }
        .tt2p-settings-tab-btn .tt2p-lbl-short { display: inline; }
      }
      #tt2p-tooltip { box-sizing: border-box; }
      /* ---- MANAGER / UAT: dashboard ---- */
      :is(#tt2p-mgr-dashboard, #tt2p-mgr-overlay) { font-family: 'Inter', Arial, sans-serif; font-size: 12px; color: var(--tt2p-text); margin-bottom: 10px; }
      .tt2p-mgr-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 8px 12px; background: var(--tt2p-charcoal); border: 1px solid var(--tt2p-red-border); border-radius: 6px 6px 0 0; }
      .tt2p-mgr-title { font-weight: 700; font-size: 13px; color: var(--tt2p-red-pink); }
      .tt2p-mgr-status { flex: 1; color: var(--tt2p-mute); font-size: 11px; }
      .tt2p-mgr-dim { color: var(--tt2p-mute); }
      .tt2p-mgr-err { margin: 6px 0; padding: 6px 10px; border: 1px solid var(--tt2p-red-accent); background: var(--tt2p-red-darkbg); color: var(--tt2p-red-light); border-radius: 4px; }
      .tt2p-mgr-sec { background: #1a1a1a; border: 1px solid var(--tt2p-border); border-top: none; }
      .tt2p-mgr-sec > summary { cursor: pointer; padding: 7px 12px; font-weight: 700; font-size: 12px; background: #202020; list-style: none; user-select: none; }
      .tt2p-mgr-sec > summary::-webkit-details-marker { display: none; }
      .tt2p-mgr-sec > summary::before { content: "\\25B8"; display: inline-block; width: 14px; color: var(--tt2p-red-light); }
      .tt2p-mgr-sec[open] > summary::before { content: "\\25BE"; }
      .tt2p-mgr-body { padding: 8px 10px 10px; }
      .tt2p-mgr-cpr { margin-top: 10px; border: 1px solid var(--tt2p-border); border-radius: 6px; overflow: hidden; }
      .tt2p-mgr-cpr #tt2p-settings-panel { border: none; border-radius: 0; }
      .tt2p-mgr-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(96px, 1fr)); gap: 6px; }
      .tt2p-mgr-kpi { background: #151515; border: 1px solid var(--tt2p-border); border-top: 2px solid var(--tt2p-red-border); border-radius: 4px; padding: 5px 8px; display: flex; flex-direction: column; }
      .tt2p-mgr-kpi span { font-size: 9px; text-transform: uppercase; letter-spacing: .4px; color: var(--tt2p-mute); }
      .tt2p-mgr-kpi b { font-size: 16px; font-variant-numeric: tabular-nums; }
      .tt2p-mgr-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
      .tt2p-mgr-table { width: 100%; border-collapse: collapse; font-size: 11px; }
      .tt2p-mgr-table th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .3px; color: var(--tt2p-red-pink); padding: 4px 6px; border-bottom: 1px solid rgba(255,255,255,.15); white-space: nowrap; }
      .tt2p-mgr-table td { padding: 4px 6px; border-bottom: 1px solid rgba(255,255,255,.06); vertical-align: top; }
      .tt2p-mgr-table tbody tr:hover { background: rgba(255,255,255,.03); }
      .tt2p-mgr-chip { display: inline-block; background: rgba(200,33,33,.18); border: 1px solid var(--tt2p-red-border); border-radius: 3px; padding: 0 5px; margin: 1px 2px 1px 0; font-weight: 700; white-space: nowrap; }
      .tt2p-mgr-lines { margin: 0 0 8px; padding-left: 16px; line-height: 1.5; }
      .tt2p-mgr-note { margin-top: 6px; color: var(--tt2p-mute); font-size: 11px; line-height: 1.45; }
      .tt2p-mgr-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 8px; }
      .tt2p-mgr-row input[type="password"] { flex: 1 1 200px; min-width: 0; }
      .tt2p-mgr-row input, .tt2p-mgr-row button, .tt2p-mgr-head button { background: var(--tt2p-deep); border: 1px solid rgba(255,255,255,.2); color: var(--tt2p-text); border-radius: 4px; padding: 4px 8px; font-size: 11px; }
      .tt2p-mgr-row input[type="number"] { width: 52px; }
      .tt2p-mgr-row button, .tt2p-mgr-head button { cursor: pointer; font-weight: 700; }
      .tt2p-mgr-row button:hover, .tt2p-mgr-head button:hover { background: #2a2a2a; }
      .tt2p-mgr-row button:disabled, .tt2p-mgr-head button:disabled { opacity: .5; cursor: default; }
      .tt2p-mgr-row label { display: flex; align-items: center; gap: 6px; color: var(--tt2p-mute); }
      /* Torn's own table/list CSS forces dark text: pin our light palette */
      :is(#tt2p-mgr-dashboard, #tt2p-mgr-overlay), :is(#tt2p-mgr-dashboard, #tt2p-mgr-overlay) .tt2p-mgr-body { color: #e8e8e8; }
      :is(#tt2p-mgr-dashboard, #tt2p-mgr-overlay) .tt2p-mgr-table td,
      :is(#tt2p-mgr-dashboard, #tt2p-mgr-overlay) .tt2p-mgr-lines li,
      :is(#tt2p-mgr-dashboard, #tt2p-mgr-overlay) .tt2p-mgr-row label,
      :is(#tt2p-mgr-dashboard, #tt2p-mgr-overlay) .tt2p-mgr-kpi b { color: #e8e8e8 !important; }
      :is(#tt2p-mgr-dashboard, #tt2p-mgr-overlay) .tt2p-mgr-table td b,
      :is(#tt2p-mgr-dashboard, #tt2p-mgr-overlay) .tt2p-mgr-lines li b,
      :is(#tt2p-mgr-dashboard, #tt2p-mgr-overlay) .tt2p-mgr-table td span { color: #ffffff !important; }
      :is(#tt2p-mgr-dashboard, #tt2p-mgr-overlay) .tt2p-mgr-dim,
      :is(#tt2p-mgr-dashboard, #tt2p-mgr-overlay) .tt2p-mgr-table td .tt2p-mgr-dim { color: #9a9a9a !important; }
      :is(#tt2p-mgr-dashboard, #tt2p-mgr-overlay) .tt2p-mgr-chip,
      :is(#tt2p-mgr-dashboard, #tt2p-mgr-overlay) .tt2p-mgr-table td .tt2p-mgr-chip { color: #ffd6d6 !important; background: rgba(200,33,33,.28); border-color: #b02a2a; }
      :is(#tt2p-mgr-dashboard, #tt2p-mgr-overlay) .tt2p-mgr-note { color: #b0b0b0 !important; }
      :is(#tt2p-mgr-dashboard, #tt2p-mgr-overlay) .tt2p-mgr-table th { color: #ff9a9a !important; }
      :is(#tt2p-mgr-dashboard, #tt2p-mgr-overlay) .tt2p-mgr-kpi span { color: #a8a8a8 !important; }
      :is(#tt2p-mgr-dashboard, #tt2p-mgr-overlay) .tt2p-mgr-sec > summary { color: #ffffff !important; }
      :is(#tt2p-mgr-dashboard, #tt2p-mgr-overlay) .tt2p-mgr-title { color: #ff9a9a !important; }
      :is(#tt2p-mgr-dashboard, #tt2p-mgr-overlay) .tt2p-mgr-status { color: #b0b0b0 !important; }
      :is(#tt2p-mgr-dashboard, #tt2p-mgr-overlay) .tt2p-mgr-table td .tt2p-mgr-ok { color: #5ad06e !important; }
      :is(#tt2p-mgr-dashboard, #tt2p-mgr-overlay) .tt2p-mgr-table td .tt2p-mgr-warn { color: #f0b43c !important; }
      :is(#tt2p-mgr-dashboard, #tt2p-mgr-overlay) .tt2p-mgr-table td .tt2p-mgr-bad { color: #ff8787 !important; font-weight: 700; }
      .tt2p-spin { display: inline-block; width: 10px; height: 10px; margin-right: 6px; border: 2px solid #555; border-top-color: var(--tt2p-red-light); border-radius: 50%; animation: tt2p-spin .8s linear infinite; vertical-align: -1px; }
      @keyframes tt2p-spin { to { transform: rotate(360deg); } }
      /* ---- MANAGER / UAT: layer 1 panels (Torn chrome), findings, Gantt, overlay ---- */
      :is(#tt2p-mgr-dashboard, #tt2p-mgr-overlay) { font-family: 'Inter', Arial, sans-serif; font-size: 12px; }
      .tt2p-tp { margin: 0 0 10px; }
      .tt2p-tp-title { display: flex !important; align-items: center; gap: 8px; height: auto !important; min-height: 30px; padding: 0 10px !important; box-sizing: border-box; }
      .tt2p-tp-title h5.box-title { margin: 0 !important; flex: 1; font: 700 12px/30px 'Inter', Arial, sans-serif !important; color: var(--title-color, #fff) !important; text-shadow: var(--title-text-shadow, 0 0 2px #000); text-transform: none; }
      .tt2p-tp-body { padding: 10px 12px !important; box-sizing: border-box; color: var(--default-color, #ddd); }
      .tt2p-btn { background: var(--btn-background, linear-gradient(180deg,#111 0%,#555 25%,#333 60%,#333 78%,#111 100%)); border: var(--btn-border, 1px solid #111); color: var(--btn-color, #eee) !important; text-shadow: var(--btn-text-shadow, 0 0 5px #000); border-radius: 5px; padding: 3px 9px; font: 700 10px/1.4 'Inter', Arial, sans-serif; text-transform: uppercase; cursor: pointer; white-space: nowrap; }
      .tt2p-btn:hover { background: var(--btn-hover-background, linear-gradient(180deg,#333 0%,#777 25%,#333 59%,#666 78%,#333 100%)); color: var(--btn-hover-color, #fff) !important; }
      .tt2p-btn:disabled { opacity: .5; cursor: default; }
      .tt2p-mgr-grid { display: grid; grid-template-columns: minmax(220px, 1fr) minmax(0, 2fr); gap: 10px; }
      .tt2p-mgr-grid > .tt2p-tp { min-width: 0; }
      @media (max-width: 700px) { .tt2p-mgr-grid { grid-template-columns: 1fr; } }
      .tt2p-kv { display: flex; align-items: baseline; gap: 8px; padding: 5px 0; border-bottom: 1px solid var(--divider-dark-color, #222); box-shadow: 0 1px 0 var(--divider-light-color, #474747); }
      .tt2p-kv:last-child { border-bottom: none; box-shadow: none; }
      .tt2p-kv span { flex: 1; color: var(--default-content-title-color, #aaa) !important; }
      .tt2p-kv b { font-size: 14px; font-variant-numeric: tabular-nums; color: var(--default-color, #eee) !important; }
      .tt2p-kv small { flex-basis: 100%; color: var(--default-content-title-color, #888) !important; font-size: 10px; order: 3; }
      .tt2p-find { display: flex; align-items: flex-start; gap: 10px; padding: 8px 4px; border-bottom: 1px solid var(--divider-dark-color, #222); box-shadow: 0 1px 0 var(--divider-light-color, #474747); }
      .tt2p-find:last-of-type { border-bottom: none; box-shadow: none; }
      .tt2p-find > i { flex: none; width: 4px; align-self: stretch; border-radius: 2px; background: #888; }
      .tt2p-find-bad > i { background: var(--default-red-color, #E54C19); }
      .tt2p-find-warn > i { background: var(--default-orange-color, #F08C00); }
      .tt2p-find-info > i { background: var(--default-blue-color, #74c0fc); }
      .tt2p-find-good > i { background: var(--default-green-color, #82c91e); }
      .tt2p-find-txt { flex: 1; min-width: 0; line-height: 1.45; }
      .tt2p-find-txt b { font-size: 12.5px; color: var(--default-color, #fff) !important; }
      .tt2p-find-cause { color: var(--default-color, #ccc) !important; }
      .tt2p-find-act { color: var(--default-content-title-color, #9a9a9a) !important; font-style: italic; }
      #tt2p-settings-tab-panel .tt2p-tp-body table { width: 100%; }

      /* Gantt */
      .tt2p-g-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
      .tt2p-g { min-width: 620px; }
      .tt2p-g-row { display: flex; align-items: stretch; min-height: 26px; }
      .tt2p-g-label { flex: 0 0 104px; padding: 2px 6px 2px 0; display: flex; flex-direction: column; justify-content: center; line-height: 1.15; overflow: hidden; }
      .tt2p-g-label b { font-size: 11px; color: var(--default-color, #eee) !important; white-space: nowrap; }
      .tt2p-g-label small { font-size: 9px; color: var(--default-content-title-color, #888) !important; white-space: nowrap; }
      .tt2p-g-track { flex: 1; position: relative; min-height: 26px; background: repeating-linear-gradient(90deg, transparent 0, transparent calc(14.2857% - 1px), rgba(255,255,255,.09) calc(14.2857% - 1px), rgba(255,255,255,.09) 14.2857%); border-left: 1px solid rgba(255,255,255,.25); }
      .tt2p-g-axisrow { min-height: 18px; }
      .tt2p-g-axis { min-height: 18px; background: none; }
      .tt2p-g-axis span { position: absolute; top: 2px; transform: translateX(-50%); font-size: 9px; color: var(--default-content-title-color, #999) !important; }
      .tt2p-g-axis span:first-child { transform: none; }
      .tt2p-g-axis span:last-child { transform: translateX(-100%); }
      .tt2p-g-lane { margin: 8px 0 2px; padding-top: 6px; border-top: 1px solid var(--divider-dark-color, #222); box-shadow: 0 -1px 0 var(--divider-light-color, #474747); font-size: 10px; text-transform: uppercase; letter-spacing: .3px; color: var(--default-content-title-color, #9a9a9a) !important; }
      .tt2p-g-empty { padding: 4px 0 4px 104px; font-size: 11px; color: var(--default-content-title-color, #888) !important; }
      .tt2p-g-bar { position: absolute; top: 4px; bottom: 4px; border-radius: 3px; overflow: hidden; display: flex; align-items: center; min-width: 4px; box-sizing: border-box; }
      .tt2p-g-bar span { padding: 0 5px; font-size: 9px; font-weight: 700; white-space: nowrap; color: #fff !important; text-shadow: 0 1px 2px rgba(0,0,0,.8); }
      .tt2p-g-plan { background: linear-gradient(180deg, #a82a2a, #7a1a1a); }
      .tt2p-g-over { background: repeating-linear-gradient(45deg, #c82121 0 6px, #8f1a1a 6px 12px); }
      .tt2p-g-need { background: repeating-linear-gradient(135deg, #2a2a2a 0 4px, #1a1a1a 4px 8px); border: 1px dashed #c82121; }
      .tt2p-g-run { background: #3a3a3a; border: 1px solid #555; }
      .tt2p-g-risk { background: #3a3a3a; border: 1px solid var(--default-orange-color, #F08C00); }
      .tt2p-g-spawn { background: rgba(200,33,33,.32); border: 1px solid #c82121; }
      .tt2p-g-cover { background: rgba(130,201,30,.35); border: 1px solid var(--default-green-color, #82c91e); }
      .tt2p-g-start { background: rgba(240,140,0,.35); border: 1px solid var(--default-orange-color, #F08C00); }
      .tt2p-g-flag { position: absolute; top: 2px; bottom: 2px; width: 0; border-left: 2px solid var(--default-orange-color, #F08C00); }
      .tt2p-g-flag::before { content: ""; position: absolute; top: 0; left: 0; border: 4px solid transparent; border-left-color: var(--default-orange-color, #F08C00); border-right: 0; }
      .tt2p-g-dot { position: absolute; top: 5px; width: 16px; height: 16px; margin-left: -8px; border-radius: 50%; background: #161616; border: 2px solid var(--default-blue-color, #74c0fc); color: var(--default-blue-color, #74c0fc) !important; font: 700 9px/12px 'Inter', Arial, sans-serif; text-align: center; font-style: normal; box-sizing: border-box; cursor: help; }
      .tt2p-g-col { position: absolute; bottom: 2px; top: 2px; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; cursor: help; }
      .tt2p-g-col u { display: flex; flex-direction: column; justify-content: flex-end; width: 80%; background: #4a4a4a; border-radius: 2px 2px 0 0; text-decoration: none; overflow: hidden; }
      .tt2p-g-col s { display: block; background: var(--default-blue-color, #74c0fc); text-decoration: none; }
      .tt2p-g-col em { font: 700 9px/11px 'Inter', Arial, sans-serif; font-style: normal; color: var(--default-color, #ddd) !important; }
      .tt2p-g-legend { display: flex; flex-wrap: wrap; gap: 4px 14px; margin-top: 8px; font-size: 10px; color: var(--default-content-title-color, #999) !important; }
      .tt2p-g-legend span { display: inline-flex; align-items: center; gap: 5px; }
      .tt2p-g-legend i { display: inline-block; width: 14px; height: 8px; border-radius: 2px; }
      .tt2p-g-legend i.tt2p-g-dotkey { width: 12px; height: 12px; border-radius: 50%; background: #161616; border: 2px solid var(--default-blue-color, #74c0fc); color: var(--default-blue-color, #74c0fc); font: 700 8px/8px Arial; text-align: center; font-style: normal; }

      /* full-screen detail overlay */
      html.tt2p-ov-lock { overflow: hidden !important; }
      #tt2p-mgr-overlay { position: fixed; inset: 0; z-index: 2147483000; display: none; flex-direction: column; background: var(--main-bg, #191919); color: var(--default-color, #ddd); }
      #tt2p-mgr-overlay.tt2p-open { display: flex; }
      .tt2p-ov-head { flex: none; display: flex; align-items: center; gap: 10px; min-height: 44px; padding: 0 12px; box-sizing: border-box; }
      .tt2p-ov-title { font: 700 13px 'Inter', Arial, sans-serif; color: var(--title-color, #fff) !important; white-space: nowrap; }
      .tt2p-ov-nav { flex: 1; display: flex; gap: 4px; overflow-x: auto; scrollbar-width: none; }
      .tt2p-ov-nav::-webkit-scrollbar { display: none; }
      .tt2p-ov-nav button { flex: none; background: var(--tabs-bg-gradient, linear-gradient(180deg,#666 0%,#333 100%)); color: var(--default-tabs-color, #bbb) !important; border: 1px solid #111; border-radius: 5px 5px 0 0; padding: 6px 12px; font: 700 11px 'Inter', Arial, sans-serif; cursor: pointer; text-shadow: var(--tabs-text-shadow, 0 0 2px #000); }
      .tt2p-ov-nav button.on { background: var(--tabs-active-bg-gradient, linear-gradient(180deg,#333 0%,#666 100%)); color: var(--default-tabs-active-color, #fff) !important; }
      .tt2p-ov-body { flex: 1; overflow: auto; padding: 14px; box-sizing: border-box; -webkit-overflow-scrolling: touch; }
      .tt2p-ov-body > .tt2p-tp { max-width: 1400px; margin-left: auto; margin-right: auto; }
      #tt2p-mgr-overlay .tt2p-mgr-table { font-size: 12px; }
      #tt2p-mgr-overlay .tt2p-mgr-table td, #tt2p-mgr-overlay .tt2p-mgr-table th { padding: 5px 8px; }
      /* spawn mechanics + running OC list */
      .tt2p-mgr-chip-dim { background: rgba(255,255,255,.06) !important; border-color: #555 !important; color: #a8a8a8 !important; }
      .tt2p-mgr-chip-bad { background: rgba(136,34,34,.25) !important; border-color: #882222 !important; color: #ff9a9a !important; text-decoration: line-through; }
      .tt2p-btn.on { background: var(--btn-active-background, linear-gradient(180deg,#000 0%,#333 100%)); border-color: var(--default-red-color, #c82121); }
      .tt2p-oc-ctl { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-bottom: 8px; }
      .tt2p-oc-ctl span { color: var(--default-content-title-color, #999); }
      .tt2p-oc-ctl input { flex: 1 1 160px; min-width: 0; background: var(--input-background-color, #111); color: var(--input-color, #fff); border: 1px solid var(--input-border-color, #444); border-radius: 5px; padding: 4px 8px; font: 11px 'Inter', Arial, sans-serif; }
      .tt2p-oc-sec { margin: 12px 0 4px; padding: 6px 4px; font-weight: 700; font-size: 12px; border-bottom: 1px solid var(--divider-dark-color, #222); box-shadow: 0 1px 0 var(--divider-light-color, #474747); color: var(--default-color, #eee) !important; }
      .tt2p-oc-sec span { color: var(--default-content-title-color, #999) !important; font-weight: 400; }
      details.tt2p-oc { background: rgba(255,255,255,.035); border: 1px solid rgba(255,255,255,.08); border-radius: 4px; margin: 3px 0; }
      details.tt2p-oc > summary { display: flex; align-items: center; gap: 8px; padding: 6px 8px; cursor: pointer; list-style: none; user-select: none; }
      details.tt2p-oc > summary::-webkit-details-marker { display: none; }
      details.tt2p-oc > summary::before { content: "\\25B8"; color: var(--default-content-title-color, #999); width: 10px; flex: none; }
      details.tt2p-oc[open] > summary::before { content: "\\25BE"; }
      details.tt2p-oc[open] { border-color: rgba(255,255,255,.22); }
      .tt2p-oc-badge { flex: none; background: rgba(116,192,252,.14); border: 1px solid rgba(116,192,252,.35); border-radius: 3px; padding: 0 5px; font-size: 10px; font-weight: 700; color: var(--default-blue-color, #74c0fc) !important; }
      .tt2p-oc-name { flex: 1; min-width: 0; font-weight: 700; font-size: 12.5px; color: var(--default-color, #fff) !important; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .tt2p-oc-time { flex: none; font-size: 11px; font-weight: 700; white-space: nowrap; }
      .tt2p-oc-t-bad { color: #ff6b5e !important; }
      .tt2p-oc-t-warn { color: var(--default-orange-color, #F08C00) !important; }
      .tt2p-oc-t-ok { color: var(--default-content-title-color, #9aa5b5) !important; }
      .tt2p-oc-warn { flex: none; font-size: 10px; font-weight: 700; color: var(--default-orange-color, #F08C00) !important; cursor: help; }
      .tt2p-oc-q { flex: none; font-size: 10px; font-weight: 700; border-radius: 9px; padding: 0 7px; border: 1px solid; }
      .tt2p-oc-q1 { color: #f0d44a !important; border-color: #8a7a1d; background: rgba(240,212,74,.1); }
      .tt2p-oc-q2 { color: #f0a03c !important; border-color: #8a5a1d; background: rgba(240,160,60,.12); }
      .tt2p-oc-q3 { color: #ff6b5e !important; border-color: #8a2a1d; background: rgba(255,107,94,.12); }
      .tt2p-oc-body { padding: 4px 10px 10px 22px; }
      .tt2p-oc-issues { margin: 4px 0 8px; padding-left: 16px; color: var(--default-orange-color, #F08C00) !important; line-height: 1.5; }
      .tt2p-oc-issues li { color: var(--default-orange-color, #F08C00) !important; }
      .tt2p-oc-bar { display: inline-block; width: 60px; height: 5px; background: #262626; border-radius: 3px; overflow: hidden; vertical-align: middle; }
      .tt2p-oc-bar i { display: block; height: 100%; background: linear-gradient(90deg, #882222, #c82121); }
      .tt2p-oc-tbl a { color: var(--default-blue-color, #74c0fc) !important; text-decoration: none; }
      #tt2p-mgr-overlay .tt2p-mgr-table td .tt2p-mgr-bad { color: #ff8787 !important; font-weight: 700; }
      tr.tt2p-ov-grp td { padding: 8px 8px 4px !important; background: rgba(255,255,255,.05); border-bottom: 1px solid rgba(255,255,255,.18) !important; font-size: 11px; color: var(--default-color, #ddd) !important; }

      .tt2p-settings-row select {
        background: var(--tt2p-deep); border: 1px solid rgba(255,255,255,0.2);
        color: var(--tt2p-text); border-radius: 4px; padding: 4px 6px; font-size: 12px;
      }
      /* ---- member dashboard extras ---- */
      .tt2p-g-active { background-image: linear-gradient(45deg, rgba(255,255,255,.22) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.22) 50%, rgba(255,255,255,.22) 75%, transparent 75%, transparent), linear-gradient(180deg, #e04a4a, #c82121); background-size: 12px 12px, auto; animation: tt2p-dens-stripes .9s linear infinite; box-shadow: inset -1px 0 0 rgba(0,0,0,.6); }
      .tt2p-g-queued { background: linear-gradient(180deg, #8a2424, #5f1818); box-shadow: inset -1px 0 0 rgba(0,0,0,.6); }
      .tt2p-g-blocked { background: repeating-linear-gradient(45deg, #7b3fb3 0 6px, #55297f 6px 12px); box-shadow: inset -1px 0 0 rgba(0,0,0,.6); }
      .tt2p-g-me { outline: 2px solid var(--default-orange-color, #F08C00); outline-offset: -2px; }
      .tt2p-g-bar span { overflow: hidden; text-overflow: ellipsis; }
      .tt2p-g-legend i.tt2p-g-flagkey { width: 0; height: 10px; border-left: 2px solid var(--default-orange-color, #F08C00); border-radius: 0; }
      .tt2p-cpr-lv { margin: 8px 0 4px; font-size: 10px; text-transform: uppercase; letter-spacing: .4px; color: var(--default-content-title-color, #999) !important; }
      .tt2p-cpr-row { display: flex; gap: 10px; align-items: baseline; padding: 4px 0; border-bottom: 1px solid var(--divider-dark-color, #222); box-shadow: 0 1px 0 var(--divider-light-color, #474747); }
      .tt2p-cpr-crime { flex: 0 0 150px; font-weight: 700; font-size: 11.5px; color: var(--default-color, #eee) !important; }
      .tt2p-cpr-chips { display: flex; flex-wrap: wrap; gap: 4px; }
      .tt2p-cpr-chip { border: 1px solid; border-radius: 3px; padding: 1px 6px; font-size: 10.5px; white-space: nowrap; }
      .tt2p-cpr-chip b { font-size: 11.5px; } .tt2p-cpr-chip i { font-style: normal; opacity: .65; }
      .tt2p-cpr-ok { color: #5ad06e !important; border-color: #2f7d4a; background: rgba(90,208,110,.08); }
      .tt2p-cpr-low { color: #ff8787 !important; border-color: #8a2f2f; background: rgba(200,33,33,.12); }
      .tt2p-cpr-none { color: #8a8a8a !important; border-color: #3a3a3a; background: rgba(255,255,255,.03); }
      @media (max-width: 560px) { .tt2p-cpr-row { flex-direction: column; gap: 4px; } .tt2p-cpr-crime { flex: none; } }
      details.tt2p-oc-mine { border-color: var(--default-orange-color, #F08C00); }
      .tt2p-settings-tab-btn { position: relative; }
      .tt2p-settings-tab-btn[data-alert]::after { content: attr(data-alert); position: absolute; top: 2px; right: 4px; min-width: 14px; height: 14px; padding: 0 3px; box-sizing: border-box; border-radius: 7px; background: #c82121; color: #fff; font: 700 9px/14px Arial, sans-serif; text-align: center; }
      #tt2p-mgr-overlay .tt2p-ov-body #tt2p-settings-panel { position: static; display: block; width: auto; max-width: 900px; max-height: none; overflow: visible; margin: 0 auto; box-sizing: border-box; }
    `;
    document.head.appendChild(style);
  }

  function findOcCards() {
    return Array.from(document.querySelectorAll("[data-oc-id]"));
  }

  function normalizeLookup(map, roleName) {
    if (map[roleName] !== undefined) return map[roleName];
    const base = roleName.replace(/\s*#\d+$/, "").trim();
    if (map[base] !== undefined) return map[base];
    return undefined;
  }

  function readDifficulty(cardEl) {
    const valEl = cardEl.querySelector('span[class*="levelValue__"]');
    if (!valEl) return null;
    const v = parseInt(valEl.textContent.trim(), 10);
    return Number.isNaN(v) ? null : v;
  }

  function readOverallCountdownHours(cardEl) {
    const el = cardEl.querySelector('div[class*="phase__"] span[aria-hidden="true"]');
    if (!el) return null;
    const parts = el.textContent.trim().split(":").map((n) => parseInt(n, 10));
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return null;
    const [d, h, m, s] = parts;
    return d * 24 + h + m / 60 + s / 3600;
  }

  function classifyOccupantPlanning(headerEl, historyKey) {
    const wrapper = headerEl.parentElement;

    const progressSvg = wrapper ? wrapper.querySelector('svg circle[stroke-dasharray], [class*="progress__"]') : null;
    if (progressSvg) {
      const strokeDash = progressSvg.getAttribute("stroke-dasharray");
      if (strokeDash) {
        const parts = strokeDash.split(/[\s,]+/).map(parseFloat);
        if (parts.length >= 2 && parts[1] > 0) {
          const pct = Math.min(100, Math.max(0, (parts[0] / parts[1]) * 100));
          if (pct >= 99.9) return { pct: 100, state: "complete" };
          if (pct > 0) return { pct, state: "in_progress" };
        }
      }
    }

    const planningEl = headerEl.querySelector('[class*="planning__"]');
    if (planningEl) {
      slotProgressHistory[historyKey] = true;
      const style = planningEl.getAttribute("style") || "";
      const match = style.match(/([\d.]+)deg/);
      const deg = match ? parseFloat(match[1]) : NaN;
      if (!Number.isNaN(deg)) {
        const pct = Math.min(100, Math.max(0, (deg / 360) * 100));
        if (pct <= 0.01) return { pct: 0, state: "idle" };
        if (pct >= 99.99) return { pct: 100, state: "complete" };
        return { pct, state: "in_progress" };
      }
    }

    if (slotProgressHistory[historyKey]) {
      return { pct: 100, state: "complete" };
    }
    return { pct: 0, state: "blocked" };
  }

  function isCardStalled(cardEl) {
    const iconEl = cardEl.querySelector('[class*="iconContainer__"]');
    if (!iconEl) return false;
    return (iconEl.getAttribute("aria-label") || "").toLowerCase() === "paused";
  }

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

  function isViewerInCard(cardEl) {
    const items = cardEl.querySelectorAll('[class*="slotMenuItem__"]');
    for (const el of items) {
      if (el.textContent.trim() === "Leave Role") return true;
    }
    return false;
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
        ...readSlotIdentity(headerEl, wrapperEl, hasOccupant),
      };
    });

    const totalSlots = slots.length;
    const openCount = totalSlots - occupiedCount;
    const crowded = idleCount >= CROWDING_IDLE_THRESHOLD && openCount > 0 && difficulty !== 9;
    const nextJoinerWaitHours = computeTimeline(slots);

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
      viewerJoined: isViewerInCard(cardEl),
    };
  }

  const STAR_ICONS = ["🥇", "🥈", "🥉"];
  const STAR_LABELS = ["Best", "2nd best", "3rd best"];

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
    badge.title = `${STAR_LABELS[slot.starRank]} choice for you — based on your CPR and this role's impact`;
  }

  function ensureStarLegend(container) {
    if (!container) return;
    let legend = document.getElementById("tt2p-star-legend");
    if (!legend) {
      legend = document.createElement("div");
      legend.id = "tt2p-star-legend";
      legend.innerHTML = `
        <div class="tt2p-legend-row">🥇 Best role for you — highest impact you qualify for</div>
        <div class="tt2p-legend-row">🥈 2nd best choice</div>
        <div class="tt2p-legend-row">🥉 3rd best choice</div>
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

  function injectRoleProgressBar(slot) {
    if (!slot.wrapperEl) return;
    let bar = slot.wrapperEl.querySelector(".tt2p-role-prog-bar");
    if (!bar) {
      bar = document.createElement("div");
      bar.className = "tt2p-role-prog-bar";
      bar.innerHTML = `<span class="tt2p-role-prog-fill"></span>`;
      slot.wrapperEl.appendChild(bar);
    }
    const fill = bar.querySelector(".tt2p-role-prog-fill");
    if (slot.hasOccupant) {
      bar.style.display = "block";
      const pct = slot.planningPct || 0;
      fill.style.width = `${pct}%`;
      if (slot.planningState === "complete") {
        bar.className = "tt2p-role-prog-bar tt2p-prog-complete";
      } else if (slot.planningState === "in_progress") {
        bar.className = "tt2p-role-prog-bar tt2p-prog-active";
      } else if (slot.planningState === "blocked") {
        bar.className = "tt2p-role-prog-bar tt2p-prog-blocked";
      } else {
        bar.className = "tt2p-role-prog-bar tt2p-prog-idle";
      }
    } else {
      bar.style.display = "none";
    }
  }

  function updateCarbonRoleButtons(slot) {
    if (!slot.wrapperEl) return;

    const planningBox = slot.wrapperEl.querySelector('[class*="planningTime__"]');
    if (planningBox) {
      if (slot.isOpen && slot.chance !== null && slot.requirement !== undefined) {
        planningBox.classList.add("tt2p-delta-box");
        const diff = slot.chance - slot.requirement;
        const diffText = diff > 0 ? `+${diff}` : diff < 0 ? `−${-diff}` : "±0";

        let deltaEl = planningBox.querySelector(".tt2p-cpr-delta");
        if (!deltaEl) {
          deltaEl = document.createElement("b");
          deltaEl.className = "tt2p-cpr-delta";
          planningBox.appendChild(deltaEl);
        }
        deltaEl.textContent = diffText;
        deltaEl.classList.toggle("tt2p-cpr-delta-bad", diff < 0);

        planningBox.removeAttribute("title");
      } else {
        planningBox.classList.remove("tt2p-delta-box");
        const deltaEl = planningBox.querySelector(".tt2p-cpr-delta");
        if (deltaEl) deltaEl.remove();
        planningBox.removeAttribute("title");
      }
    }

    if (slot.joinBtnEl) {
      if (slot.qualifies === false) {
        slot.joinBtnEl.classList.add("tt2p-join-disabled");
        slot.joinBtnEl.title = `Your CPR ${slot.chance} is below the Faction minimum of ${slot.requirement} for ${slot.roleName}`;
      } else {
        slot.joinBtnEl.classList.remove("tt2p-join-disabled");
        if (slot.joinBtnEl.title && slot.joinBtnEl.title.startsWith("Your CPR ")) {
          slot.joinBtnEl.removeAttribute("title");
        }
      }
    }
  }

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

  /* ============================================================================
   * Density-line planning bar
   * One fluid line split into one segment per role (CSS percentages, no pixel
   * measuring, so it scales on phones/PC). Dark red = planned, red = planning,
   * charcoal = queued, hatched = vacant. Member names under each segment.
   * Hover (desktop) or tap (touch) shows details. Visual language borrowed from
   * Torn's Crimes density bar, rebuilt with our own CSS because Torn's styles
   * only load on crimes.php.
   * ============================================================================ */
  const DENS_ICONS = {
    clock: '<svg viewBox="0 0 16 16" width="10" height="10" aria-hidden="true"><path fill="currentColor" d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zm.7 3v3.4l2.5 1.5-.7 1.1-3.2-1.9V4.5h1.4z"/></svg>',
    hourglass: '<svg viewBox="0 0 16 16" width="10" height="10" aria-hidden="true"><path fill="currentColor" d="M4 1.5h8v1.2L9.3 8l2.7 5.3v1.2H4v-1.2L6.7 8 4 2.7z"/></svg>',
    check: '<svg viewBox="0 0 16 16" width="10" height="10" aria-hidden="true"><path fill="currentColor" d="M6.3 11.6 2.9 8.2l1.1-1.1 2.3 2.3 5.7-5.7 1.1 1.1z"/></svg>',
    alert: '<svg viewBox="0 0 16 16" width="10" height="10" aria-hidden="true"><path fill="currentColor" d="M7.1 2h1.8l-.4 7H7.5zM8 10.5a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2z"/></svg>',
  };
  const DENS_PIN = {
    active:  { color: "#c82121", glow: "rgba(200,33,33,.7)",   icon: "clock" },
    waiting: { color: "#9a9a9a", glow: "rgba(154,154,154,.4)", icon: "hourglass" },
    blocked: { color: "#a05adc", glow: "rgba(160,90,220,.6)",  icon: "alert" },
    stalled: { color: "#ff8787", glow: "rgba(255,135,135,.7)", icon: "alert" },
    done:    { color: "#882222", glow: "rgba(136,34,34,.6)",   icon: "check" },
    empty:   { color: "#666666", glow: "rgba(102,102,102,.3)", icon: "hourglass" },
  };

  // Member name lives in: .badgeContainer > .badge > span.textName___xxx
  // (NOT the slotMenu links like "View Profile" / "Remove from Role").
  function readMemberName(slot) {
    const w = slot.wrapperEl;
    if (!w || !slot.hasOccupant) return null;
    const el = w.querySelector('[class*="textName__"]') || w.querySelector('[class*="badge__"] span');
    const t = el && el.textContent ? el.textContent.trim() : "";
    if (!t || /^(view profile|remove from role|join)$/i.test(t)) return null;
    return t;
  }

  const DENS_BLOCK_PATTERNS = [
    [/hospital/i, "Hospitalized"],
    [/jail|federal/i, "In jail"],
    [/abroad|travel|flying/i, "Traveling / abroad"],
  ];
  function readBlockage(slot) {
    const out = [];
    if (slot.planningState === "blocked") out.push("Missing a required item");
    const w = slot.wrapperEl;
    if (w) {
      w.querySelectorAll('[aria-label],[title],[class*="hospital"],[class*="jail"],[class*="travel"],[class*="abroad"]').forEach((n) => {
        if (n.closest(".tt2p-tidy-weight,.tt2p-role-prog-bar,.tt2p-star-badge")) return;
        const hay = (n.getAttribute("aria-label") || "") + " " + (n.getAttribute("title") || "") + " " + (typeof n.className === "string" ? n.className : "");
        for (const [re, label] of DENS_BLOCK_PATTERNS) {
          if (re.test(hay) && !out.includes(label)) out.push(label);
        }
      });
    }
    return out;
  }

  /* Missing-item name: not present in the slot DOM, only in Torn's own hover popup.
   * We (a) passively capture that popup whenever you hover a role, and (b) when you
   * hover a blocked segment on our bar, briefly "hover" that role's header ourselves
   * to make Torn render the popup, read it, then un-hover. Results are cached. */
  const slotItemCache = new Map(); // "ocId:Role" -> { text|null, at }
  function slotKey(slot) {
    const card = slot.wrapperEl && slot.wrapperEl.closest("[data-oc-id]");
    return card && slot.roleName ? card.dataset.ocId + ":" + slot.roleName : null;
  }
  function slotKeyFromHeader(h) {
    const card = h.closest("[data-oc-id]");
    const role = h.querySelector('span[class*="title__"]');
    return card && role ? card.dataset.ocId + ":" + role.textContent.trim() : null;
  }
  function cachedItem(key) {
    const c = key && slotItemCache.get(key);
    if (!c) return null;
    return Date.now() - c.at < (c.text ? 5 * 60 * 1000 : 60 * 1000) ? c : null;
  }
  function parseMissingItem(text) {
    const m = /(?:missing|requires?|needs?)[^:]*:\s*(.+)$/i.exec(text);
    return (m ? m[1] : text).trim().slice(0, 60);
  }

  const recentBodyAdds = [];
  function harvestNativeTooltip(header) {
    const now = Date.now();
    const clean = (n) => (n && n.textContent ? n.textContent.replace(/\s+/g, " ").trim() : "");
    const skip = (n) => !n || (n.closest && n.closest("#tt2p-tooltip,.tt2p-timeline-strip"));
    const cands = recentBodyAdds.filter((r) => now - r.at < 1500).map((r) => r.node);
    document.querySelectorAll('[role="tooltip"],[class*="tooltip___"],[class*="Tooltip___"]').forEach((n) => cands.push(n));
    if (header.parentElement) header.parentElement.querySelectorAll('[role="tooltip"],[class*="tooltip"]').forEach((n) => cands.push(n));
    for (let i = cands.length - 1; i >= 0; i--) {          // pass 1: wording match
      if (skip(cands[i])) continue;
      const t = clean(cands[i]);
      if (t && t.length < 160 && /missing|require|need|item/i.test(t)) return t;
    }
    if (header.querySelector('[class*="inactive__"]')) {   // pass 2: blocked slot, take newest short popup
      for (let i = cands.length - 1; i >= 0; i--) {
        if (skip(cands[i])) continue;
        const t = clean(cands[i]);
        if (t && t.length < 100) return t;
      }
    }
    return null;
  }

  function captureNativeTooltip(header) {
    const key = slotKeyFromHeader(header);
    if (!key) return;
    const raw = harvestNativeTooltip(header);
    if (raw) {
      slotItemCache.set(key, { text: parseMissingItem(raw), at: Date.now() });
      console.debug("[MM Manager] captured slot tooltip:", key, "->", raw);
    }
  }

  function setupNativeTooltipCapture() {
    if (setupNativeTooltipCapture.done) return;
    setupNativeTooltipCapture.done = true;
    // popups usually get portaled to <body>: remember what was just added there
    new MutationObserver((muts) => {
      const now = Date.now();
      muts.forEach((m) => m.addedNodes.forEach((n) => {
        if (n.nodeType === 1) {
          recentBodyAdds.push({ node: n, at: now });
          if (recentBodyAdds.length > 20) recentBodyAdds.shift();
        }
      }));
    }).observe(document.body, { childList: true });
    // Torn flags the hovered trigger with data-is-tooltip-opened="true"
    new MutationObserver((muts) => {
      for (const m of muts) {
        const el = m.target;
        if (!el || el.nodeType !== 1 || el.getAttribute("data-is-tooltip-opened") !== "true") continue;
        const header = el.matches('button[class*="slotHeader__"]') ? el : el.closest('button[class*="slotHeader__"]');
        if (header) setTimeout(() => captureNativeTooltip(header), 80);
      }
    }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ["data-is-tooltip-opened"] });
  }

  let probingTooltip = false;
  function probeMissingItem(seg, done) {
    if (!seg.key || probingTooltip || cachedItem(seg.key)) return;
    const header = seg.header;
    if (!header || !header.isConnected) return;
    probingTooltip = true;
    const fire = (list) => list.forEach(([type, bubbles]) => {
      try { header.dispatchEvent(new MouseEvent(type, { bubbles, cancelable: true, view: window })); } catch (e) { /* ignore */ }
    });
    fire([["pointerover", true], ["mouseover", true], ["pointerenter", false], ["mouseenter", false], ["mousemove", true]]);
    setTimeout(() => {
      if (!cachedItem(seg.key)) {
        const raw = harvestNativeTooltip(header);
        slotItemCache.set(seg.key, { text: raw ? parseMissingItem(raw) : null, at: Date.now() });
        if (raw) console.debug("[MM Manager] probed slot tooltip:", seg.key, "->", raw);
      }
      fire([["mouseout", true], ["pointerout", true], ["mouseleave", false], ["pointerleave", false]]);
      probingTooltip = false;
      done();
    }, 180);
  }

  // Tooltip times are computed at hover time so they stay live between scans.
  function densHrs(h, at) {
    return Math.max(0, (h || 0) - (Date.now() - at) / 3600000);
  }
  function densT(h) {
    return h <= 0.0003 ? "now" : formatHM(h);
  }

  function densSegTip(seg, at) {
    const title = `<div class="tt2p-tt-title">${escapeHtml(seg.role)}</div>`;
    if (seg.state === "vacant") {
      const req = seg.req !== undefined ? `, <b>${seg.req}</b> CPR required` : "";
      return `${title}<div class="tt2p-tt-row tt2p-tt-idle">Vacant role to be filled${req}</div>`;
    }
    let status;
    if (seg.state === "complete") status = "<b>Completed</b>";
    else if (seg.state === "active") status = `<b>Active</b> - ${densT(densHrs(seg.remainingH, at))} remaining`;
    else if (seg.state === "queued") { const t = densT(densHrs(seg.startsInH, at)); status = `<b>In queue</b> - starts ${t === "now" ? "now" : "in " + t}`; }
    else status = "<b>Not progressing</b>";
    const item = cachedItem(seg.key);
    const blockList = seg.blockage.map((b) => (b === "Missing a required item" && item && item.text ? "Missing: " + item.text : b));
    const block = blockList.length
      ? `<span class="tt2p-tt-fail">${escapeHtml(blockList.join(", "))}</span>`
      : `<span class="tt2p-tt-pass">None</span>`;
    return `${title}
      <div class="tt2p-tt-row">Member: <b>${escapeHtml(seg.member || "Unknown")}</b></div>
      <div class="tt2p-tt-row">Planning status: ${status}</div>
      <div class="tt2p-tt-row">Blockage status: ${block}</div>`;
  }

  function densPinTip(pin, at) {
    const q = densHrs(pin.queueH, at);
    let a;
    if (pin.occupied === 0) a = "Not started - waiting for the first member to join";
    else if (pin.activeH !== null) a = `${escapeHtml(pin.role)}: <b>${densT(densHrs(pin.activeH, at))}</b> left on this segment`;
    else if (pin.queueCount > 0) a = "No role is actively planning right now";
    else a = "All joined members have finished planning";

    let b = "";
    if (pin.queueCount > 0) {
      b = `<div class="tt2p-tt-row">Planning queue: <b>${densT(q)}</b> remaining (${pin.queueCount} member${pin.queueCount === 1 ? "" : "s"})</div>`;
    }

    let c;
    if (pin.stalled) c = `<span class="tt2p-tt-fail">OC is stalled - needs action now</span>`;
    else if (pin.vacant > 0 && pin.occupied === 0) c = `<span class="tt2p-tt-idle">Needs 1 member to join to begin planning</span>`;
    else if (pin.vacant > 0) c = `<span class="tt2p-tt-idle">Stalls in <b>${densT(q)}</b> unless ${pin.vacant} vacant role${pin.vacant === 1 ? "" : "s"} get filled</span>`;
    else c = `<span class="tt2p-tt-pass">Fully staffed - no stall risk</span>`;

    return `<div class="tt2p-tt-title">Planning progress</div>
      <div class="tt2p-tt-row">${a}</div>${b}<div class="tt2p-tt-row">${c}</div>`;
  }

  function isTouchMode() {
    return !!(window.matchMedia && (window.matchMedia("(hover: none)").matches || window.matchMedia("(pointer: coarse)").matches));
  }

  // Phones/PDA: horizontally centered in the viewport, bottom edge just above the bar,
  // so it can never run off the left/right edge. Falls back to just below if no room above.
  function positionTooltipCentered(strip) {
    const tt = ensureCustomTooltip();
    const anchor = strip.querySelector(".tt2p-dens") || strip;
    const vw = document.documentElement.clientWidth || window.innerWidth;
    const vh = window.innerHeight;
    const margin = 8;
    tt.style.maxWidth = Math.min(320, vw - margin * 2) + "px";
    tt.style.left = "0px";
    tt.style.top = "0px";
    const tw = tt.offsetWidth;
    const th = tt.offsetHeight;
    const r = anchor.getBoundingClientRect();
    let top = r.top - th - 6;
    if (top < margin) top = Math.min(r.bottom + 6, vh - th - margin);
    tt.style.left = Math.max(margin, Math.round((vw - tw) / 2)) + "px";
    tt.style.top = Math.max(margin, Math.round(top)) + "px";
  }

  function bindDensityTooltips(strip) {
    if (strip.__tt2pDensBound) return;
    strip.__tt2pDensBound = true;
    setupNativeTooltipCapture();
    let touchTimer = null;
    let hoverSeg = null;

    const resolve = (target) => {
      const st = strip.__tt2pDens;
      if (!st || !target.closest) return null;
      if (target.closest("[data-pin]")) return { html: densPinTip(st.pin, st.at), seg: null };
      const segEl = target.closest("[data-seg]");
      const seg = segEl ? st.segs[+segEl.dataset.seg] : null;
      return seg ? { html: densSegTip(seg, st.at), seg } : null;
    };
    const hide = () => {
      hoverSeg = null;
      ensureCustomTooltip().classList.remove("tt2p-tooltip-visible");
    };
    if (!bindDensityTooltips.scrollBound) {
      bindDensityTooltips.scrollBound = true;
      window.addEventListener("scroll", () => ensureCustomTooltip().classList.remove("tt2p-tooltip-visible"), { passive: true });
    }
    const place = (e) => (isTouchMode() ? positionTooltipCentered(strip) : positionTooltip(e));
    const show = (e, r) => {
      hoverSeg = r.seg;
      const tt = ensureCustomTooltip();
      tt.innerHTML = r.html;
      tt.classList.add("tt2p-tooltip-visible");
      place(e);
      if (r.seg && r.seg.state === "blocked") {
        probeMissingItem(r.seg, () => {
          const st = strip.__tt2pDens;
          if (hoverSeg === r.seg && st) {
            ensureCustomTooltip().innerHTML = densSegTip(r.seg, st.at);
            if (isTouchMode()) positionTooltipCentered(strip);
          }
        });
      }
    };

    strip.addEventListener("mouseover", (e) => {
      if (isTouchMode()) return; // touch uses tap (click) below
      const r = resolve(e.target);
      if (r) show(e, r);
    });
    strip.addEventListener("mousemove", (e) => {
      if (isTouchMode()) return;
      if (e.target.closest && e.target.closest("[data-seg],[data-pin]")) positionTooltip(e);
    });
    strip.addEventListener("mouseout", () => { if (!isTouchMode()) hide(); });

    // Touch devices (no hover): tap to show, tap elsewhere / wait to hide
    strip.addEventListener("click", (e) => {
      if (!isTouchMode()) return;
      const r = resolve(e.target);
      clearTimeout(touchTimer);
      if (!r) return hide();
      show(e, r);
      touchTimer = setTimeout(hide, 5000);
    });
  }

  function buildDensityBlock(strip, info, leftOffset) {
    const slots = info.slots;
    const n = slots.length || 1;
    const segW = 100 / n;

    const segs = slots.map((slot) => {
      let state = "vacant";
      if (slot.hasOccupant) {
        if (slot.planningState === "complete") state = "complete";
        else if (slot.planningState === "in_progress") state = "active";
        else if (slot.planningState === "blocked") state = "blocked";
        else state = "queued";
      }
      return {
        role: slot.roleName || "Role",
        state,
        member: slot.hasOccupant ? readMemberName(slot) : null,
        pct: slot.planningPct || 0,
        remainingH: slot.timelineRemainingHours ?? null,
        startsInH: slot.timelineStartsInHours ?? null,
        blockage: slot.hasOccupant ? readBlockage(slot) : [],
        req: slot.requirement,
        key: slotKey(slot),
        header: slot.wrapperEl ? slot.wrapperEl.querySelector('button[class*="slotHeader__"]') : null,
      };
    });

    const activeIdx = segs.findIndex((s) => s.state === "active");
    const pendingIdx = segs.findIndex((s) => s.state === "queued" || s.state === "blocked");
    const occupied = segs.filter((s) => s.state !== "vacant");
    const queueCount = segs.filter((s) => s.state === "active" || s.state === "queued").length;

    let pos = 0;
    let pinState = "empty";
    if (activeIdx >= 0) {
      pos = (activeIdx + segs[activeIdx].pct / 100) / n;
      pinState = "active";
    } else if (pendingIdx >= 0) {
      pos = pendingIdx / n;
      pinState = segs[pendingIdx].state === "blocked" ? "blocked" : "waiting";
    } else if (occupied.length > 0) {
      pos = (segs.map((s) => s.state).lastIndexOf("complete") + 1) / n;
      pinState = "done";
    }
    if (info.stalled) pinState = "stalled";

    strip.__tt2pDens = {
      at: Date.now(),
      segs,
      pin: {
        state: pinState,
        role: activeIdx >= 0 ? segs[activeIdx].role : null,
        activeH: activeIdx >= 0 ? segs[activeIdx].remainingH : null,
        queueH: info.nextJoinerWaitHours || 0,
        queueCount,
        vacant: n - occupied.length,
        occupied: occupied.length,
        stalled: !!info.stalled,
      },
    };
    bindDensityTooltips(strip);

    const pc = DENS_PIN[pinState];
    const segHtml = segs.map((s, i) => {
      const fill = s.state === "active" ? `<i class="tt2p-dens-seg-fill" style="width:${s.pct.toFixed(1)}%"></i>` : "";
      return `<div class="tt2p-dens-seg tt2p-dens-${s.state}" data-seg="${i}" style="left:${(i * segW).toFixed(3)}%;width:${segW.toFixed(3)}%;">${fill}</div>`;
    }).join("");
    let delimHtml = "";
    for (let i = 1; i < n; i++) delimHtml += `<span class="tt2p-dens-delim" style="left:${(i * segW).toFixed(3)}%"></span>`;
    const labelHtml = segs.map((s, i) =>
      `<span class="tt2p-dens-label tt2p-dens-label-${s.state}" data-seg="${i}" style="left:${(i * segW).toFixed(3)}%;width:${segW.toFixed(3)}%;">${s.member ? escapeHtml(s.member) : ""}</span>`
    ).join("");

    return `<div class="tt2p-tl-strip-bars tt2p-dens-host" style="padding-left:${leftOffset}px;padding-right:${leftOffset}px;">
      <div class="tt2p-dens">
        <div class="tt2p-dens-pinrow"><div class="tt2p-dens-pin" data-pin="1" style="--tt2p-pin-left:${(pos * 100).toFixed(2)}%;--tt2p-pin-color:${pc.color};--tt2p-pin-glow:${pc.glow};">${DENS_ICONS[pc.icon]}</div></div>
        <div class="tt2p-dens-outer">
          <div class="tt2p-dens-inner"><div class="tt2p-dens-track">${segHtml}<div class="tt2p-dens-stripes"></div></div></div>
          <div class="tt2p-dens-delims">${delimHtml}</div>
        </div>
        <div class="tt2p-dens-labels">${labelHtml}</div>
      </div>
    </div>`;
  }

  function renderTimelineStrip(cardEl, info) {
    const descEl = cardEl.querySelector('p[class*="description__"]');
    const headerParent = cardEl.querySelector('p[class*="panelTitle__"]')?.closest('div[class*="panel__"]') || cardEl.firstElementChild;
    const rolesContainer = info.slots[0]?.wrapperEl?.parentElement || null;
    if (!rolesContainer || !rolesContainer.parentElement) return;

    if (descEl) {
      descEl.style.display = hideFlavorText ? "none" : "";
    }

    let topBentoContainer = cardEl.querySelector(".tt2p-top-bento-container");
    if (!topBentoContainer) {
      topBentoContainer = document.createElement("div");
      topBentoContainer.className = "tt2p-top-bento-container";
    }

    if (hideFlavorText) {
      if (descEl && descEl.parentElement) {
        if (topBentoContainer.previousElementSibling !== descEl) {
          descEl.after(topBentoContainer);
        }
      } else if (headerParent && topBentoContainer.parentElement !== headerParent) {
        headerParent.appendChild(topBentoContainer);
      }
    } else {
      if (descEl && descEl.parentElement) {
        if (topBentoContainer.previousElementSibling !== descEl) {
          descEl.after(topBentoContainer);
        }
      } else if (headerParent && topBentoContainer.parentElement !== headerParent) {
        headerParent.appendChild(topBentoContainer);
      }
    }

    let strip = cardEl.querySelector(".tt2p-timeline-strip");
    if (!strip) {
      strip = document.createElement("div");
      strip.className = "tt2p-timeline-strip";
    }
    if (strip.nextElementSibling !== rolesContainer) {
      rolesContainer.parentElement.insertBefore(strip, rolesContainer);
    }

    // Tag the real roles container so CSS can neutralise its native top line
    rolesContainer.classList.add("tt2p-roles-container");
    rolesContainer.style.setProperty("border-top", "none", "important");
    rolesContainer.style.setProperty("box-shadow", "none", "important");

    // Header success-chance % (top right): normal weight + Inter for crisper text
    cardEl.querySelectorAll('[class*="successChance__"], [class*="panel__"] span, [class*="panel__"] div').forEach((el) => {
      if (el.children.length > 0) return;
      if (el.closest('button[class*="slotHeader__"]')) return;
      if (!/^\d+(\.\d+)?%$/.test(el.textContent.trim())) return;
      el.style.setProperty("font-weight", "400", "important");
      el.style.setProperty("font-family", "'Inter', Arial, sans-serif", "important");
    });

    const rolesRect = rolesContainer.getBoundingClientRect();
    const firstSlotRect = info.slots[0]?.wrapperEl?.getBoundingClientRect();
    const leftOffset = firstSlotRect ? Math.max(0, Math.round(firstSlotRect.left - rolesRect.left)) : 0;

    const occupied = info.slots.filter((s) => s.hasOccupant);
    const activePlanner = occupied.find((s) => s.planningState === "in_progress");

    const rolesFilledText = `${info.occupiedCount} / ${info.totalSlots}`;
    const currentlyPlanningText = activePlanner ? `${activePlanner.roleName} (${(activePlanner.planningPct || 0).toFixed(0)}%)` : (info.occupiedCount === 0 ? "Not Started" : "Waiting");
    const nextStartText = activePlanner ? formatHM(activePlanner.timelineRemainingHours || 0) : (info.idleCount > 0 ? "~" + formatDuration(info.nextJoinerWaitHours || 0) : "N/A");
    const timeRoleNeededText = info.idleCount > 0 || info.occupiedCount < info.totalSlots ? `~${formatDuration(info.nextJoinerWaitHours || 0)}` : "Fully Staffed";

    let warningText = "-";
    let warningClass = "tt2p-bento-tile";
    let warningTooltip = "";

    if (info.stalled) {
      warningText = "⚠️ OC Stalled!";
      warningClass = "tt2p-bento-tile tt2p-bento-danger";
      warningTooltip = "This OC is frozen because a member is missing an item or paused.";
    } else if (info.blockedCount > 0) {
      warningText = `⚠️ ${info.blockedCount} Missing Items`;
      warningClass = "tt2p-bento-tile tt2p-bento-warning";
      warningTooltip = `${info.blockedCount} role(s) are missing items that will impact initiation of OC. Loan items from Armory where needed.`;
    } else if (info.crowded) {
      warningText = "⚠️ Busy (Idle queue)";
      warningClass = "tt2p-bento-tile tt2p-bento-warning";
      warningTooltip = "Quite a few people waiting to start planning, +36-48h wait. Consider starting up similar OC, or one that is close to stalling.";
    }

    const bentoHtml = `
      <div class="tt2p-bento-grid">
        <div class="tt2p-bento-tile">
          <span class="tt2p-bento-label">Roles Filled:</span>
          <b class="tt2p-bento-val">${rolesFilledText}</b>
        </div>
        <div class="tt2p-bento-tile tt2p-bento-active">
          <span class="tt2p-bento-label">Currently Planning:</span>
          <b class="tt2p-bento-val">${escapeHtml(currentlyPlanningText)}</b>
        </div>
        <div class="tt2p-bento-tile">
          <span class="tt2p-bento-label">Next Role Starts in:</span>
          <b class="tt2p-bento-val">${escapeHtml(nextStartText)}</b>
        </div>
        <div class="tt2p-bento-tile" title="Look to join crimes that need members in 24-36h; 2d max. Exceptions include Hostile Takeover, Ace in the Hole. If longer than this: Startup a similar OC or join one close to stalling">
          <span class="tt2p-bento-label">Needs 1 to Join In:</span>
          <b class="tt2p-bento-val">${escapeHtml(timeRoleNeededText)}</b>
        </div>
        <div class="${warningClass}" ${warningTooltip ? `title="${escapeHtml(warningTooltip)}"` : ""}>
          <span class="tt2p-bento-label">Status Warning:</span>
          <b class="tt2p-bento-val" style="text-align: center;">${escapeHtml(warningText)}</b>
        </div>
      </div>
    `;
    if (topBentoContainer.__tt2pHtml !== bentoHtml) {
      topBentoContainer.innerHTML = bentoHtml;
      topBentoContainer.__tt2pHtml = bentoHtml;
    }

    const crimeId = cardEl.getAttribute("data-oc-id") || "";
    const lvlText = info.difficulty !== null ? `Difficulty: Lv. ${info.difficulty}` : "";
    const pinPrefix = info.viewerJoined ? "📌 " : '<span style="visibility:hidden" aria-hidden="true">⏳ </span>';
    const idLvlName = `${pinPrefix}${crimeId ? `crimeID #${escapeHtml(crimeId)}` : ""}${lvlText ? ` | ${lvlText}` : ""}`;

    let stallRowHtml;
    if (info.stalled) {
      stallRowHtml = `<div class="tt2p-tl-stall-row tt2p-tl-stall-warn" style="padding-left:${leftOffset}px;">⏳ Time until stall: <b>${formatHMS(0)}</b> — Already stalled, needs action now.</div>`;
    } else if (info.occupiedCount === 0) {
      stallRowHtml = `<div class="tt2p-tl-stall-row tt2p-tl-stall-uninitiated" style="padding-left:${leftOffset}px;">⏱️ Uninitiated OC: waiting for 1 member to join to begin planning.</div>`;
    } else if (info.totalSlots - info.occupiedCount > 0) {
      const hoursLeft = info.nextJoinerWaitHours || 0;
      const isThreat = hoursLeft < NEAR_STALL_THRESHOLD_HOURS;
      const verdict = isThreat ? "⚠️ Sub-24h threat, consider joining" : "Low stall threat";
      stallRowHtml = `<div class="tt2p-tl-stall-row${isThreat ? " tt2p-tl-stall-warn" : ""}" style="padding-left:${leftOffset}px;">⏳ Time until stall: <b>${formatHMS(hoursLeft)}</b> — ${verdict}</div>`;
    } else {
      stallRowHtml = `<div class="tt2p-tl-stall-row tt2p-tl-stall-ok" style="padding-left:${leftOffset}px;">✅ Fully staffed — no stall risk right now.</div>`;
    }

    const useDensity = getBarStyle() === "density";
    let barsHtml = "";
    const { widths, gap } = useDensity ? { widths: [], gap: 8 } : measureRoleLayout(info.slots);
    const lastIdx = info.slots.length - 1;

    info.slots.forEach((slot, idx) => {
      if (useDensity) return;
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

    const headerOffset = Math.max(0, leftOffset + 2);

    const stripHtml = `
      <div class="tt2p-tl-strip-header" style="padding-left:${headerOffset}px;">
        <span class="tt2p-tl-strip-title">${idLvlName}</span>
      </div>
      ${stallRowHtml}
      ${useDensity ? buildDensityBlock(strip, info, leftOffset) : `<div class="tt2p-tl-strip-bars" style="gap:${gap}px;padding-left:${leftOffset}px;">${barsHtml}</div>`}
    `;
    if (strip.__tt2pHtml !== stripHtml) {
      strip.innerHTML = stripHtml;
      strip.__tt2pHtml = stripHtml;
    }
  }

  function updateStatusBadge(cardEl, info) {
    let badge = cardEl.querySelector(".tt2p-status-badge");
    let text = null;
    let variant = null;

    if (info.stalled) {
      text = "🔴 STALLED — needs planning action";
      variant = "stalled";
    } else if (info.crowded) {
      text = `🚦 Busy — ${info.idleCount} member(s) waiting to start planning.`;
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

  let isMutatingSelf = false;
  let originalCardOrder = null;

  function nativeMenuIsOpen() {
    return !!document.querySelector('[data-is-tooltip-opened="true"]');
  }

  function onCrimesTab() {
    return window.location.hash.includes("tab=crimes");
  }

  function runPass() {
    if (document.hidden) return;
    if (!onCrimesTab()) return;
    ensureSettingsTab();
    if (settingsTabOpen) return; // Torn's OC list is hidden while our tab is open
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

    const store = loadStore();
    let storeDirty = false;
    const toastMessages = [];
    const cardInfos = [];

    cards.forEach((cardEl) => {
      const info = readCard(cardEl);
      if (!info) return;
      cardInfos.push({ cardEl, info });
      rememberCrimeDifficulty(info.crimeName, info.difficulty);

      let cardQualifies = false;

      processSuccessBadge(cardEl, info);

      info.slots.forEach((slot) => {
        if (!slot.roleName) return;

        if (slot.isOpen && slot.chance !== null && !Number.isNaN(slot.chance)) {
          const result = recordCpr(store, info.crimeName, slot.roleName, slot.chance);
          if (result.changed) {
            storeDirty = true;
            const prevText = result.previous === null ? "new" : `${result.previous} →`;
            toastMessages.push(`${info.crimeName} — ${slot.roleName}: ${prevText} ${slot.chance}`);
          }
        }

        attachTooltip(slot, info.crimeName, info.tracked);
        injectTidyWeightBox(slot, info.crimeName);
        injectRoleProgressBar(slot);
        updateCarbonRoleButtons(slot);
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
          }
        } else if (!dynamicSortEnabled && slot.wrapperEl) {
          slot.wrapperEl.classList.remove("tt2p-role-good", "tt2p-role-bad");
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
      if (settingsTabOpen) {
        renderSettingsPanel();
        renderGrowthPanel();
      }
    }

    // remember what this tab shows (planning / recruiting) for the dashboard
    const tabNow = currentNativeTab();
    if (tabNow === "recruiting" || tabNow === "planning") {
      lastNativeTab = tabNow;
      updateOcCache(tabNow, cardInfos);
      probeViewerItem(cardInfos);
      updateTabAlert();
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
      if (HIDDEN_CRIMES_BY_DEFAULT.includes(info.crimeName) && !showHiddenOcs) {
        cardEl.style.display = "none";
        return;
      }
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

    visibleNotQualified.sort((a, b) => (readDifficulty(b) ?? -1) - (readDifficulty(a) ?? -1));

    const pinnedCards = [];
    const remainingQualified = [];
    visibleQualified.forEach((el) => {
      if (cardInfoByEl.get(el)?.viewerJoined) pinnedCards.push(el);
      else remainingQualified.push(el);
    });
    const remainingNotQualified = [];
    visibleNotQualified.forEach((el) => {
      if (cardInfoByEl.get(el)?.viewerJoined) pinnedCards.push(el);
      else remainingNotQualified.push(el);
    });

    const topCardInfo = remainingQualified.length ? cardInfoByEl.get(remainingQualified[0]) : null;
    if (topCardInfo && topCardInfo.occupiedCount === 0) {
      const topStallRow = remainingQualified[0].querySelector(".tt2p-tl-stall-row");
      if (topStallRow) {
        topStallRow.className = "tt2p-tl-stall-row tt2p-tl-stall-top-pick";
        const topStrip = topStallRow.closest(".tt2p-timeline-strip");
        if (topStrip) topStrip.__tt2pHtml = null;
        topStallRow.innerHTML = `⭐ Top recommendation — unstarted OC. Pick your highest-impact role (see star ratings below).`;
      }
    }

    reorderCards([...pinnedCards, ...remainingQualified], remainingNotQualified);
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
        divider.textContent = "⚠️ OCs Not Yet Qualified For";
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

  function debounce(fn, ms) {
    let t = null;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  let latestDebouncedPass = null;
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && latestDebouncedPass) latestDebouncedPass();
  });

  let activeObserver = null;
  let observedNode = null;

  function stopObserver() {
    if (activeObserver) {
      activeObserver.disconnect();
      activeObserver = null;
    }
    observedNode = null;
    latestDebouncedPass = null;
  }

  function setupObserver(root) {
    stopObserver();
    const debouncedPass = debounce(() => {
      runPass();
      // Our own DOM writes during the pass must not re-trigger another pass
      if (activeObserver) activeObserver.takeRecords();
    }, SCAN_DEBOUNCE_MS);
    latestDebouncedPass = debouncedPass;

    activeObserver = new MutationObserver(() => {
      if (isMutatingSelf) return;
      debouncedPass();
    });
    observedNode = root;
    activeObserver.observe(root, { childList: true, subtree: true });
    debouncedPass();
  }

  // Waits for the root; cancellable so stale waits never pile up
  let pendingWait = null;
  function cancelWait() {
    if (pendingWait) {
      clearInterval(pendingWait);
      pendingWait = null;
    }
  }
  function waitForRoot(selector, cb, timeoutMs = 60000) {
    cancelWait();
    const existing = document.querySelector(selector);
    if (existing) return cb(existing);
    const start = Date.now();
    pendingWait = setInterval(() => {
      if (!onCrimesTab()) return cancelWait();
      const el = document.querySelector(selector);
      if (el) {
        cancelWait();
        cb(el);
      } else if (Date.now() - start > timeoutMs) {
        cancelWait();
      }
    }, 300);
  }

  injectStyles();
  buildSettingsPanel();

  function initCrimesTab() {
    // Already watching a live, attached node -> nothing to do
    if (activeObserver && observedNode && observedNode.isConnected) return;
    waitForRoot("#faction-crimes-root", (root) => {
      if (!onCrimesTab()) return;
      originalCardOrder = null;
      // Observe the stable tab panel when available so a replaced root can't orphan us
      setupObserver(root.closest("#faction-crimes") || root);
    });
  }

  function handleRoute() {
    if (onCrimesTab()) {
      initCrimesTab();
      loadCrimesHubData();
      if (latestDebouncedPass) latestDebouncedPass();
    } else {
      cancelWait();
      closeOverlay();
      closeSettingsTab(null);
      stopObserver();
    }
  }

  // Self-heal: if Torn swaps the crimes root without a hash change, re-attach
  setInterval(() => {
    if (document.hidden || !onCrimesTab()) return;
    if (!activeObserver || !observedNode || !observedNode.isConnected) initCrimesTab();
  }, 3000);

  window.addEventListener("hashchange", handleRoute);
  handleRoute();
})();
