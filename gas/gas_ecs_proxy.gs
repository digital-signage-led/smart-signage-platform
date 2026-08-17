/**
 * 環境クラウド（ECS Cloud）WBGT プロキシ — 専用 GAS（MOE 用 GAS とは分離）
 *
 * 使い方:
 *   <exec>?dataId=1050
 *   <exec>?dataId=1050&callback=cb  （JSONP）
 *
 * デプロイ: 「デプロイ」→「新しいデプロイ」→ 種類「ウェブアプリ」→ アクセス「全員」
 * 発行 URL を SignageConfig.ecs.gasUrl に設定（未設定時は moe.gasUrl + type=ecs でも可）
 */
var ECS_API_BASE = 'https://www.ecs-cloud.ne.jp/Json/WBGTNumData';
var CACHE_TTL_SEC = 90;

function doGet(e) {
  var params = (e && e.parameter) ? e.parameter : {};
  var dataId = normalizeEcsDataId_(params.dataId || params.ecsDataId || params.id);
  if (!dataId) {
    return respond_(params, { source: 'error', error: 'dataId パラメータが必要です（ECS Cloud 計測ID）' });
  }
  var cacheKey = 'ecs_' + dataId;
  var json = getCached_(cacheKey);
  if (!json) {
    var payload = buildEcsPayload_(dataId);
    json = JSON.stringify(payload);
    if (payload && payload.source === 'ecs-cloud') {
      putCached_(cacheKey, json);
    }
  }
  return respond_(params, json, true);
}

function buildEcsPayload_(dataId) {
  var url = ECS_API_BASE + '/' + encodeURIComponent(dataId) + '?r=' + Date.now();
  var text = httpGetText_(url);
  if (!text) {
    return { source: 'error', dataId: dataId, error: 'ECS API fetch failed' };
  }
  var rows;
  try {
    rows = JSON.parse(text);
  } catch (err) {
    return { source: 'error', dataId: dataId, error: 'ECS JSON parse failed' };
  }
  if (!rows || !rows.length) {
    return { source: 'error', dataId: dataId, error: 'ECS empty payload' };
  }
  return {
    source: 'ecs-cloud',
    dataId: dataId,
    updatedAt: Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm'),
    data: rows
  };
}

function normalizeEcsDataId_(raw) {
  var s = String(raw || '').trim();
  if (!/^\d{3,6}$/.test(s)) return '';
  return s;
}

function httpGetText_(url) {
  try {
    var res = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      followRedirects: true,
      headers: { 'User-Agent': 'wbgt-ecs-gas-proxy/1.0' }
    });
    if (res.getResponseCode() !== 200) return null;
    return res.getContentText('utf-8');
  } catch (err) {
    return null;
  }
}

function respond_(params, body, isJsonString) {
  var callback = params.callback ? String(params.callback) : '';
  var text = isJsonString ? body : JSON.stringify(body);
  if (callback) {
    return ContentService.createTextOutput(callback + '(' + text + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.JSON);
}

function getCached_(key) {
  try {
    return CacheService.getScriptCache().get(key);
  } catch (e) {
    return null;
  }
}

function putCached_(key, json) {
  try {
    CacheService.getScriptCache().put(key, json, CACHE_TTL_SEC);
  } catch (e) {
    /* continue */
  }
}
