// ============================================================
//  LINE Messaging API
//  gas_code.js の末尾に追加するコードです
// ============================================================

const LINE_CHANNEL_ACCESS_TOKEN = 'ここにChannel access tokenを貼り付ける';
const LINE_CHANNEL_SECRET = '89bb8faacd8ea9fd470a7fa66e401764';

function sendLineMessage(userId, messages) {
  const url = 'https://api.line.me/v2/bot/message/push';
  const payload = {
    to: userId,
    messages: Array.isArray(messages) ? messages : [messages]
  };
  UrlFetchApp.fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + LINE_CHANNEL_ACCESS_TOKEN
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
}

function lineText(text) {
  return { type: 'text', text: text };
}

function notifyApplyLine(lineUserId, candidateName, jobTitle, companyName) {
  sendLineMessage(lineUserId, lineText(
    'おうぼかんりょうのおしらせ\n\n' + candidateName + ' さん\n\n' +
    companyName + ' の ' + jobTitle + ' に' +
    'おうぼがかんりょうしました。\n\n' +
    'きぎょうからのれんらくをおまちください。'
  ));
}

function notifyInterviewLine(lineUserId, candidateName, jobTitle, companyName, interviewDate) {
  sendLineMessage(lineUserId, lineText(
    'めんせつにっていかくていのおしらせ\n\n' + candidateName + ' さん\n\n' +
    companyName + ' との\nめんせつにっていがかくていしました。\n\n' +
    'めんせつにちじ：' + interviewDate + '\n' +
    'きゅうじん：' + jobTitle
  ));
}

function sendMorningReminders() {
  var s = sheet(SHEET.APPLICATIONS);
  var rows = s.getDataRange().getValues();
  var today = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd');

  for (var i = 1; i < rows.length; i++) {
    var row = rows[i];
    var interviewDate = row[6] ? Utilities.formatDate(new Date(row[6]), 'Asia/Tokyo', 'yyyy/MM/dd') : '';
    if (interviewDate === today && row[4] === 'めんせつよてい') {
      var lineUserId = getLineUserId(row[1]);
      if (lineUserId) {
        sendLineMessage(lineUserId, lineText(
          'ほんじつめんせつのリマインド\n\n' +
          'ほんじつ、めんせつのよていがあります。\n' +
          'じかんにゆとりをもってでかけてください。\n\n' +
          'がんばってください！'
        ));
      }
    }
  }
}

function notifyRejectionLine(lineUserId, candidateName, companyName, jobTitle) {
  sendLineMessage(lineUserId, lineText(
    'せんこうけっかのおしらせ\n\n' + candidateName + ' さん\n\n' +
    companyName + ' の ' + jobTitle + ' について、\n' +
    'こんかいはさいようをみおくらせていただくこととなりました。\n\n' +
    'ごおうぼいただきありがとうございました。'
  ));
}

function getLineUserId(candidateId) {
  var s = sheet(SHEET.CANDIDATES);
  var rows = s.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === candidateId) {
      return rows[i][15] || null;
    }
  }
  return null;
}

function saveLineUserId(candidateId, lineUserId) {
  var s = sheet(SHEET.CANDIDATES);
  var rows = s.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === candidateId) {
      s.getRange(i + 1, 16).setValue(lineUserId);
      return;
    }
  }
}

function handleLineWebhook(e) {
  var body = JSON.parse(e.postData.contents);
  var events = body.events || [];

  for (var i = 0; i < events.length; i++) {
    var event = events[i];
    var lineUserId = event.source.userId;

    if (event.type === 'follow') {
      sendLineMessage(lineUserId, lineText(
        'HR Bridge へようこそ！\n\n' +
        'このアカウントでは以下の通知をおおくりします。\n\n' +
        'おうぼかんりょう通知\n' +
        'めんせつかくてい通知\n' +
        'めんせつとうじつのリマインド\n' +
        'せんこうけっかのおしらせ\n\n' +
        'サービスのごりようはウェブサイトからログインしてください。'
      ));
    }

    if (event.type === 'message' && event.message.type === 'text') {
      sendLineMessage(lineUserId, lineText(
        'メッセージありがとうございます。\n\n' +
        'HR Bridge へのおといあわせは\n' +
        'サイトないのメッセージきのうをごりようください。'
      ));
    }
  }

  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}
