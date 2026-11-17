// Render this file with scripts/build-usage-collector.mjs before deploying.
const BOOK = '__LOG_SPREADSHEET_ID__';
const ACTIONS = /* approved actions */ {};
const SCREENS = { entry: '시작 화면', setup: '대상지 설정', analysis: '주제별 공간분석', ai_report: '보고서', ai_lab: 'AI 연구실' };
const LOCATIONS = { unshared: '미공유', shared: '공유', denied: '권한 거부', unavailable: '확인 불가' };

function jsonReply_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return jsonReply_({ service: 'Smart Green Studio usage', version: 1 });
}

function known_(table, key) {
  return typeof key === 'string' && Object.prototype.hasOwnProperty.call(table, key);
}

function logRow_(e, received) {
  if (!e || typeof e.v !== 'string' || !/^v[a-f0-9]{16}$/.test(e.v) ||
      !Number.isSafeInteger(e.n) || e.n < 1 || e.n > 1000000 ||
      !Number.isSafeInteger(e.t) || e.t < received.getTime() - 86400000 * 7 ||
      e.t > received.getTime() + 86400000 ||
      !known_(SCREENS, e.s) || !known_(ACTIONS, e.a) || !known_(LOCATIONS, e.p)) return null;
  const shared = e.p === 'shared';
  if (shared && (!Number.isInteger(e.x) || !Number.isInteger(e.y) ||
      Math.abs(e.x) > 900 || Math.abs(e.y) > 1800)) return null;
  if (!shared && (e.x != null || e.y != null)) return null;
  const kind = e.a === 'visit' ? '접속' : e.a === 'location' ? '위치 선택' : '클릭';
  return [new Date(e.t), e.v, e.n, kind, SCREENS[e.s], ACTIONS[e.a], LOCATIONS[e.p],
    shared ? e.x / 10 : '', shared ? e.y / 10 : '', received, e.v + '-' + e.n];
}

function doPost(request) {
  let locked = false;
  let lock;
  try {
    const raw = request && request.postData && request.postData.contents;
    if (typeof raw !== 'string' || raw.length > 12000) return jsonReply_({ error: 'invalid' });
    let body;
    try { body = JSON.parse(raw); } catch (ignore) { return jsonReply_({ error: 'invalid' }); }
    if (!body || body.version !== 1 || !Array.isArray(body.events) ||
        !body.events.length || body.events.length > 20) return jsonReply_({ error: 'invalid' });
    const received = new Date();
    const rows = body.events.map(event => logRow_(event, received));
    if (rows.some(row => !row)) return jsonReply_({ error: 'invalid' });
    const keys = rows.map(row => row[10]);
    lock = LockService.getScriptLock();
    locked = lock.tryLock(8000);
    if (!locked) return jsonReply_({ error: 'retry' });
    const sheet = SpreadsheetApp.openById(BOOK).getSheetByName('접속 로그');
    if (!sheet || sheet.getRange('K1').getValue() !== '기록 ID') return jsonReply_({ error: 'configuration' });
    const last = sheet.getLastRow();
    const seen = new Set();
    if (last > 1) {
      // Keys above contain only a validated visit ID, a hyphen and a decimal sequence number.
      const matches = sheet.getRange(2, 11, last - 1, 1).createTextFinder('^(' + keys.join('|') + ')$')
        .useRegularExpression(true).matchEntireCell(true).findAll();
      matches.forEach(cell => seen.add(String(cell.getValue())));
    }
    const fresh = rows.filter(row => {
      if (seen.has(row[10])) return false;
      seen.add(row[10]);
      return true;
    });
    if (fresh.length) {
      const capacity = sheet.getMaxRows();
      if (last + fresh.length > capacity) sheet.insertRowsAfter(capacity, Math.max(100, last + fresh.length - capacity));
      sheet.getRange(last + 1, 1, fresh.length, 11).setValues(fresh);
      SpreadsheetApp.flush();
    }
    return jsonReply_({ ok: true });
  } catch (ignore) {
    return jsonReply_({ error: 'retry' });
  } finally {
    if (locked) lock.releaseLock();
  }
}
