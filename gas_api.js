// ============================================================
//  HR Bridge — フロントエンド API 接続レイヤー
//  gas_api.js
//
//  使い方：
//    1. GAS_URL に Web App の URL を設定する
//    2. HTMLの <head> 内でこのファイルを読み込む
//       <script src="gas_api.js"></script>
//    3. 各関数を呼び出す
//       const result = await HRApi.login('admin', 'admin123');
// ============================================================

const HRApi = (() => {

  // ★ ここにデプロイした GAS の Web App URL を設定する
  const GAS_URL = 'https://script.google.com/macros/s/AKfycbx8ObA0oP9xfld-VY7fb-khLrJuIZvdGNZPgr4dvjUKqiOAwEbIfafPa54qPKrqDpN_dQ/exec';

  // セッション情報（ログイン後に保存）
  let session = {
    userId:   null,
    role:     null,
    name:     null,
    email:    null,
    plan:     null,
    loggedIn: false,
  };

  // ─── 内部：GASへのリクエスト送信 ─────────────────────────
  async function call(action, body = {}) {
    try {
      const res = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' }, // GAS CORS対応のため text/plain
        body: JSON.stringify({ action, ...body }),
        redirect: 'follow',
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'エラーが発生しました');
      return data;
    } catch (err) {
      console.error(`[HRApi] ${action} 失敗:`, err);
      throw err;
    }
  }

  async function get(action, params = {}) {
    const query = new URLSearchParams({ action, ...params }).toString();
    try {
      const res = await fetch(`${GAS_URL}?${query}`, { redirect: 'follow' });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'エラーが発生しました');
      return data;
    } catch (err) {
      console.error(`[HRApi] ${action} 失敗:`, err);
      throw err;
    }
  }

  // ─── ① 認証 ───────────────────────────────────────────────
  async function login(id, password) {
    const data = await call('login', { id, password });
    session = {
      userId:   id,
      role:     data.role,
      name:     data.name,
      email:    data.email,
      plan:     data.plan,
      loggedIn: true,
    };
    // セッション保存（チェックボックスONの場合）
    if (document.getElementById('remember-me')?.checked) {
      localStorage.setItem('hrb_session', JSON.stringify(session));
    }
    return data;
  }

  function logout() {
    session = { userId: null, role: null, name: null, email: null, plan: null, loggedIn: false };
    localStorage.removeItem('hrb_session');
  }

  function restoreSession() {
    const saved = localStorage.getItem('hrb_session');
    if (saved) {
      session = JSON.parse(saved);
      return session.loggedIn ? session : null;
    }
    return null;
  }

  function getSession() { return session; }

  async function resetPassword(email) {
    return call('resetPassword', { email });
  }

  async function setNewPassword(token, newPassword) {
    return call('setNewPassword', { token, newPassword });
  }

  // ─── ② 求人 ───────────────────────────────────────────────
  async function getJobs({ plan, keyword } = {}) {
    return get('getJobs', { plan: plan || '', keyword: keyword || '' });
  }

  async function createJob(jobData) {
    return call('createJob', { ...jobData, employerId: session.userId });
  }

  async function updateJob(jobId, fields) {
    return call('updateJob', { jobId, ...fields });
  }

  // ─── ③ 求職者 / ES ────────────────────────────────────────
  async function getCandidate(userId) {
    return get('getCandidate', { userId: userId || session.userId });
  }

  async function saveCandidate(candidateData) {
    return call('saveCandidate', {
      ...candidateData,
      userId:  session.userId,
      email:   candidateData.email || session.email,
    });
  }

  // ─── ④ 応募 / 面接ステータス ──────────────────────────────
  async function getApplications() {
    return get('getApplications', { userId: session.userId, role: session.role });
  }

  async function apply({ jobId, employerId, jobTitle, companyName }) {
    const candidate = await getCandidate();
    return call('apply', {
      candidateId:    session.userId,
      jobId,
      employerId,
      candidateEmail: session.email,
      candidateName:  session.name,
      jobTitle,
      companyName,
    });
  }

  async function setInterviewStatus({ appId, status, candidateEmail, candidateName, companyName, jobTitle }) {
    return call('setInterviewStatus', {
      appId, status, candidateEmail, candidateName, companyName, jobTitle,
      plan: session.plan || 'std',
    });
  }

  // ─── ⑤ メッセージ ─────────────────────────────────────────
  async function getMessages(appId) {
    return get('getMessages', { appId });
  }

  async function sendMessage({ appId, text, recipientEmail, recipientName }) {
    return call('sendMessage', {
      appId,
      fromRole:       session.role,
      fromName:       session.name,
      text,
      recipientEmail,
      recipientName,
    });
  }

  // ─── ⑥ 請求書 ─────────────────────────────────────────────
  async function getInvoices({ month } = {}) {
    return get('getInvoices', {
      employerId: session.role === 'employer' ? session.userId : '',
      month:      month || '',
    });
  }

  async function createInvoice({ interviewCount, month }) {
    return call('createInvoice', {
      employerId:     session.userId,
      companyName:    session.name,
      plan:           session.plan,
      interviewCount,
      month,
    });
  }

  // ─── ⑦ 初期化 ─────────────────────────────────────────────
  async function initSheets() {
    return call('initSheets');
  }

  // Public API
  return {
    login, logout, restoreSession, getSession,
    resetPassword, setNewPassword,
    getJobs, createJob, updateJob,
    getCandidate, saveCandidate,
    getApplications, apply, setInterviewStatus,
    getMessages, sendMessage,
    getInvoices, createInvoice,
    initSheets,
  };
})();
