(function () {
  var INTERVAL_MS = 1000;
  var RING_LENGTH = 2 * Math.PI * 54;
  var HISTORY_LIMIT = 8;

  var qrRoot = document.getElementById("qrcode");
  var payloadText = document.getElementById("payloadText");
  var seqEl = document.getElementById("seq");
  var remainEl = document.getElementById("remain");
  var liveDot = document.getElementById("liveDot");
  var liveLabel = document.getElementById("liveLabel");
  var progressRing = document.getElementById("progressRing");
  var toggleBtn = document.getElementById("toggleBtn");
  var copyBtn = document.getElementById("copyBtn");
  var refreshBtn = document.getElementById("refreshBtn");
  var statusText = document.getElementById("statusText");
  var prefixInput = document.getElementById("prefixInput");
  var modeSelect = document.getElementById("modeSelect");
  var modeHint = document.getElementById("modeHint");
  var historyList = document.getElementById("historyList");

  var qr = null;
  var seq = 0;
  var running = true;
  var currentPayload = "";
  var history = [];
  var startedAt = 0;
  var timerId = 0;
  var rafId = 0;

  function pad(value, size) {
    var text = String(value);
    while (text.length < size) text = "0" + text;
    return text;
  }

  function randomToken(length) {
    var alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    var bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    var out = "";
    for (var i = 0; i < length; i++) {
      out += alphabet[bytes[i] % alphabet.length];
    }
    return out;
  }

  function formatStamp(date) {
    return (
      date.getFullYear() +
      pad(date.getMonth() + 1, 2) +
      pad(date.getDate(), 2) +
      "-" +
      pad(date.getHours(), 2) +
      pad(date.getMinutes(), 2) +
      pad(date.getSeconds(), 2)
    );
  }

  function buildPayload(now) {
    var prefix = (prefixInput.value || "TICKET").trim() || "TICKET";
    var mode = modeSelect.value;
    var stamp = formatStamp(now);
    var token = randomToken(4);

    if (mode === "time") {
      return now.toISOString();
    }

    if (mode === "url") {
      var base = prefix;
      if (!/^https?:\/\//i.test(base)) {
        base = "https://example.com/verify";
      }
      var joiner = base.indexOf("?") >= 0 ? "&" : "?";
      return base + joiner + "t=" + Math.floor(now.getTime() / 1000) + "&c=" + token;
    }

    return prefix + "-" + stamp + "-" + token;
  }

  function updateHint() {
    var mode = modeSelect.value;
    if (mode === "time") {
      modeHint.textContent = "QR 內容會是 ISO 時間，例如 2026-08-27T08:25:01.000Z";
    } else if (mode === "url") {
      modeHint.textContent = "前綴填完整網址時會自動加上 t 與 c 參數；沒填網址則用示範網址。";
    } else {
      modeHint.textContent = "例如：TICKET-20260827-082501-A91C";
    }
  }

  function renderHistory() {
    historyList.innerHTML = "";
    if (!history.length) {
      var empty = document.createElement("li");
      empty.className = "empty";
      empty.textContent = "還沒有紀錄";
      historyList.appendChild(empty);
      return;
    }

    for (var i = 0; i < history.length; i++) {
      var item = document.createElement("li");
      item.textContent = history[i];
      historyList.appendChild(item);
    }
  }

  function drawQr(text) {
    if (!qr) {
      qr = new QRCode(qrRoot, {
        text: text,
        width: 256,
        height: 256,
        colorDark: "#111827",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M
      });
      return;
    }
    qr.clear();
    qr.makeCode(text);
  }

  function rotate(now) {
    currentPayload = buildPayload(now || new Date());
    seq += 1;
    startedAt = (now || new Date()).getTime();
    payloadText.textContent = currentPayload;
    seqEl.textContent = String(seq);
    history.unshift(currentPayload);
    if (history.length > HISTORY_LIMIT) history.length = HISTORY_LIMIT;
    renderHistory();
    drawQr(currentPayload);
  }

  function setRunning(next) {
    running = next;
    liveDot.classList.toggle("paused", !running);
    liveLabel.textContent = running ? "每秒更新中" : "已暫停";
    toggleBtn.textContent = running ? "暫停" : "繼續";
    if (running) {
      startedAt = Date.now();
    }
  }

  function tickFrame() {
    var elapsed = Date.now() - startedAt;
    var remain = running ? Math.max(0, INTERVAL_MS - elapsed) : INTERVAL_MS;
    remainEl.textContent = (remain / 1000).toFixed(1);
    var progress = running ? Math.min(1, elapsed / INTERVAL_MS) : 0;
    progressRing.style.strokeDashoffset = String(RING_LENGTH * (1 - progress));
    rafId = requestAnimationFrame(tickFrame);
  }

  function scheduleNext() {
    if (timerId) window.clearTimeout(timerId);
    timerId = window.setTimeout(function () {
      if (running) {
        rotate(new Date());
      }
      scheduleNext();
    }, INTERVAL_MS);
  }

  function setStatus(message) {
    statusText.textContent = message;
    if (setStatus.timer) window.clearTimeout(setStatus.timer);
    setStatus.timer = window.setTimeout(function () {
      statusText.textContent = "";
    }, 1800);
  }

  toggleBtn.addEventListener("click", function () {
    setRunning(!running);
  });

  refreshBtn.addEventListener("click", function () {
    rotate(new Date());
    scheduleNext();
    setStatus("已立刻換成新的 QR");
  });

  copyBtn.addEventListener("click", function () {
    if (!currentPayload) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(currentPayload).then(function () {
        setStatus("已複製目前內容");
      }).catch(function () {
        setStatus("複製失敗，請手動選取內容");
      });
    } else {
      setStatus("這個瀏覽器不支援一鍵複製");
    }
  });

  prefixInput.addEventListener("change", updateHint);
  modeSelect.addEventListener("change", updateHint);

  updateHint();
  renderHistory();
  progressRing.style.strokeDasharray = String(RING_LENGTH);
  rotate(new Date());
  setRunning(true);
  scheduleNext();
  tickFrame();
})();
