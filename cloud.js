// Shared Supabase glue for the main menu and the game page.
// Every function here fails soft: if the project, tables, or network
// aren't available, callers just fall back to localStorage-only behavior.
(function (global) {
  "use strict";

  var SUPABASE_URL = "https://unzrcaenvlcsibmhowmj.supabase.co";
  var SUPABASE_KEY = "sb_publishable_ZHkfMpw1CntVxzJ1QoXPKg_71v1WJW6";
  var PLAYER_ID_KEY = "ssm.playerId";

  var client = null;
  function getClient() {
    if (client) return client;
    try {
      if (global.supabase && global.supabase.createClient) {
        client = global.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      }
    } catch (e) { client = null; }
    return client;
  }

  function getPlayerId() {
    try {
      var id = localStorage.getItem(PLAYER_ID_KEY);
      if (!id) {
        id = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
        localStorage.setItem(PLAYER_ID_KEY, id);
      }
      return id;
    } catch (e) { return "anon"; }
  }

  function cloudSaveProgress(data) {
    var c = getClient();
    if (!c) return;
    c.from("saves").upsert({
      player_id: getPlayerId(),
      coin_count: data.coinCount,
      bonus_count: data.bonusCount,
      pos_x: data.x,
      pos_y: data.y,
      updated_at: new Date().toISOString()
    }).then(function () {}, function () {});
  }

  function cloudClearProgress() {
    var c = getClient();
    if (!c) return;
    c.from("saves").delete().eq("player_id", getPlayerId()).then(function () {}, function () {});
  }

  function cloudLoadProgress() {
    var c = getClient();
    if (!c) return Promise.resolve(null);
    return c.from("saves").select("coin_count,bonus_count,pos_x,pos_y").eq("player_id", getPlayerId()).maybeSingle()
      .then(function (res) {
        if (!res || res.error || !res.data) return null;
        var d = res.data;
        return { coinCount: d.coin_count, bonusCount: d.bonus_count, x: d.pos_x, y: d.pos_y };
      }, function () { return null; });
  }

  function cloudSubmitScore(entry) {
    var c = getClient();
    if (!c) return Promise.resolve(false);
    return c.from("leaderboard").insert({
      name: (entry.name || "Adventurer").slice(0, 24),
      coins: entry.coins,
      bonus: entry.bonus,
      time_ms: entry.timeMs
    }).then(function (res) { return !(res && res.error); }, function () { return false; });
  }

  function cloudFetchLeaderboard(limit) {
    var c = getClient();
    if (!c) return Promise.resolve([]);
    return c.from("leaderboard").select("name,coins,bonus,time_ms")
      .order("bonus", { ascending: false })
      .order("time_ms", { ascending: true })
      .limit(limit || 5)
      .then(function (res) {
        return (res && res.data) ? res.data : [];
      }, function () { return []; });
  }

  global.SamCloud = {
    getPlayerId: getPlayerId,
    saveProgress: cloudSaveProgress,
    clearProgress: cloudClearProgress,
    loadProgress: cloudLoadProgress,
    submitScore: cloudSubmitScore,
    fetchLeaderboard: cloudFetchLeaderboard
  };
})(window);
