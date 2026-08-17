/**
 * WxTech プロキシ (320キューブ用) - Smart Signage Platform
 * ------------------------------------------------------------
 * 既存のWBGT用GASとは別スクリプトとして作成すること。
 * 本番稼働中のWBGT用GASには一切手を加えない。
 *
 * 【デプロイ前に必ずやること】
 *   1. エディタ左「プロジェクトの設定」→「スクリプト プロパティ」に追加
 *        プロパティ名 : WXTECH_API_KEY
 *        値           : （ウェザーニューズから発行された API キー）
 *      ※ API キーはコード内・HTML・Git リポジトリに含めないこと。
 *         本スクリプトは Script Properties の WXTECH_API_KEY のみを参照する。
 *         GitHub Pages 等の公開リポジトリにキーを置くと全世界に露出する。
 *
 *   2. デプロイ →「新しいデプロイ」→ 種類「ウェブアプリ」
 *        次のユーザーとして実行 : 自分
 *        アクセスできるユーザー   : 全員
 *
 *   3. 発行された /exec URL を HTML の SignageConfig.wxtech.gasUrl に設定
 *      （または ?wxGas= / ?wxtechGas= クエリで上書き）
 *
 * 【トライアル制限】1日1,000回 / 秒間10回
 *   キャッシュ15分 = 1地点あたり96回/日 → 約10地点まで
 *   キャッシュ30分 = 1地点あたり48回/日 → 約20地点まで
 *   地点数が増えたら CACHE_SEC を伸ばすこと。
 *
 * 【呼び出し例】
 *   ?site=suminoe
 *   ?lat=34.605184&lon=135.470949&name=住之江区
 */

// ====== 設定 ======
var CACHE_SEC = 900;   // キャッシュ保持秒数 (900 = 15分)
var TIMEOUT_MS = 15000;

// 地点マスタ。現場が増えたらここに足すだけでよい。
// HTML から ?site=suminoe のように呼ぶ。
var SITES = {
  suminoe: { name: '大阪市住之江区', lat: 34.605184, lon: 135.470949 },
  shizuoka: { name: '静岡',         lat: 34.976944, lon: 138.383056 }
};

var API_BASE = 'https://wxtech.weathernews.com/api/v1/ss1wx';


function doGet(e) {
  var params = (e && e.parameter) ? e.parameter : {};
  var callback = params.callback || '';
  var site = null;

  // site 指定があればマスタ優先。なければ lat/lon 直指定。どちらもなければ suminoe。
  if (params.site) {
    site = SITES[params.site];
    if (!site) {
      return json_({ ok: false, reason: 'unknown_site' }, callback);
    }
  } else if (params.lat && params.lon) {
    site = {
      name: params.name || '',
      lat: Number(params.lat),
      lon: Number(params.lon)
    };
  } else {
    site = SITES.suminoe;
  }

  try {
    var data = fetchForecast_(site.lat, site.lon);
    data.siteName = site.name;
    return json_(data, callback);
  } catch (err) {
    // ★安全ルール★ 取得に失敗したら ok:false のみを返す。
    return json_({ ok: false, reason: String(err).slice(0, 200) }, callback);
  }
}


/**
 * 1kmメッシュ ピンポイント天気予報・体感予報を取得して
 * 表示に必要な形だけに整形して返す。
 */
function fetchForecast_(lat, lon) {
  var cache = CacheService.getScriptCache();
  var key = 'ss1wx_' + lat.toFixed(4) + '_' + lon.toFixed(4);

  var hit = cache.get(key);
  if (hit) {
    var cached = JSON.parse(hit);
    cached.cached = true;
    return cached;
  }

  var apiKey = PropertiesService.getScriptProperties().getProperty('WXTECH_API_KEY');
  if (!apiKey) throw new Error('WXTECH_API_KEY missing (set Script Property WXTECH_API_KEY)');

  var url = API_BASE + '?lat=' + lat + '&lon=' + lon;
  var res = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: { 'X-API-Key': apiKey },
    muteHttpExceptions: true,
    followRedirects: true,
    validateHttpsCertificates: true
  });

  var code = res.getResponseCode();
  if (code !== 200) {
    throw new Error('http_' + code + ' ' + res.getContentText().slice(0, 120));
  }

  var raw = JSON.parse(res.getContentText());
  var wx = raw.wxdata && raw.wxdata[0];
  if (!wx || !wx.srf || !wx.srf.length) throw new Error('empty_payload');

  var out = {
    ok: true,
    cached: false,
    fetchedAt: new Date().toISOString(),
    now: wx.srf[0],                 // 直近1時間の予報 = 現在表示用
    hourly: wx.srf.slice(0, 12),    // 12時間分
    daily: (wx.mrf || []).slice(0, 7)
  };

  cache.put(key, JSON.stringify(out), CACHE_SEC);
  return out;
}


function json_(obj, callback) {
  var body = JSON.stringify(obj);
  // ブラウザ(CORS回避)用: ?callback=xxx で JSONP
  if (callback && /^[A-Za-z_$][\w$]*$/.test(String(callback))) {
    return ContentService
      .createTextOutput(callback + '(' + body + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(body)
    .setMimeType(ContentService.MimeType.JSON);
}


/** エディタ上での動作確認用。実行して200が返ることを見る。 */
function testFetch() {
  var r = fetchForecast_(34.605184, 135.470949);
  Logger.log(JSON.stringify(r, null, 2));
}
