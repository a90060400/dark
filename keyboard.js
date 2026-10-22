(() => {
  "use strict";

  const SHIFT_LABEL = {
    Backquote: "~",
    Digit1: "!",
    Digit2: "@",
    Digit3: "#",
    Digit4: "$",
    Digit5: "%",
    Digit6: "^",
    Digit7: "&",
    Digit8: "*",
    Digit9: "(",
    Digit0: ")",
    Minus: "_",
    Equal: "+",
    BracketLeft: "{",
    BracketRight: "}",
    Backslash: "|",
    Semicolon: ":",
    Quote: "\"",
    Comma: "<",
    Period: ">",
    Slash: "?",
  };

  const LABEL = {
    Escape: "Esc",
    F1: "F1",
    F2: "F2",
    F3: "F3",
    F4: "F4",
    F5: "F5",
    F6: "F6",
    F7: "F7",
    F8: "F8",
    F9: "F9",
    F10: "F10",
    F11: "F11",
    F12: "F12",
    Backquote: "`",
    Minus: "-",
    Equal: "=",
    Backspace: "⌫",
    Tab: "Tab",
    BracketLeft: "[",
    BracketRight: "]",
    Backslash: "\\",
    CapsLock: "Caps",
    Semicolon: ";",
    Quote: "'",
    Enter: "Enter",
    ShiftLeft: "Shift",
    ShiftRight: "Shift",
    Comma: ",",
    Period: ".",
    Slash: "/",
    ControlLeft: "Ctrl",
    ControlRight: "Ctrl",
    MetaLeft: "Win",
    MetaRight: "Win",
    AltLeft: "Alt",
    AltRight: "Alt",
    Space: "",
    ContextMenu: "Menu",
    PrintScreen: "PrtSc",
    ScrollLock: "ScrLk",
    Pause: "Pause",
    Insert: "Ins",
    Home: "Home",
    PageUp: "PgUp",
    Delete: "Del",
    End: "End",
    PageDown: "PgDn",
    ArrowUp: "↑",
    ArrowLeft: "←",
    ArrowDown: "↓",
    ArrowRight: "→",
    NumLock: "Num",
    NumpadDivide: "/",
    NumpadMultiply: "*",
    NumpadSubtract: "-",
    NumpadAdd: "+",
    NumpadEnter: "Enter",
    NumpadDecimal: ".",
  };

  const NAME = {
    Escape: "Esc",
    Backspace: "退格",
    Tab: "Tab",
    CapsLock: "大寫鎖",
    Enter: "Enter",
    ShiftLeft: "左 Shift",
    ShiftRight: "右 Shift",
    ControlLeft: "左 Ctrl",
    ControlRight: "右 Ctrl",
    AltLeft: "左 Alt",
    AltRight: "右 Alt",
    MetaLeft: "左 Win",
    MetaRight: "右 Win",
    Space: "空白",
    ContextMenu: "選單",
    PrintScreen: "PrtSc",
    ScrollLock: "ScrLk",
    Pause: "Pause",
    Insert: "Insert",
    Home: "Home",
    PageUp: "PgUp",
    Delete: "Delete",
    End: "End",
    PageDown: "PgDn",
    ArrowUp: "上",
    ArrowLeft: "左",
    ArrowDown: "下",
    ArrowRight: "右",
    NumLock: "Num",
    NumpadDivide: "數字 /",
    NumpadMultiply: "數字 *",
    NumpadSubtract: "數字 -",
    NumpadAdd: "數字 +",
    NumpadEnter: "數字 Enter",
    NumpadDecimal: "數字 .",
  };

  const MAIN_ROWS = [
    ["Escape", gap(1), "F1", "F2", "F3", "F4", gap(0.5), "F5", "F6", "F7", "F8", gap(0.5), "F9", "F10", "F11", "F12"],
    ["Backquote", "Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Digit7", "Digit8", "Digit9", "Digit0", "Minus", "Equal", wide("Backspace", 2)],
    [wide("Tab", 1.5), "KeyQ", "KeyW", "KeyE", "KeyR", "KeyT", "KeyY", "KeyU", "KeyI", "KeyO", "KeyP", "BracketLeft", "BracketRight", wide("Backslash", 1.5)],
    [wide("CapsLock", 1.75), "KeyA", "KeyS", "KeyD", "KeyF", "KeyG", "KeyH", "KeyJ", "KeyK", "KeyL", "Semicolon", "Quote", wide("Enter", 2.25)],
    [wide("ShiftLeft", 2.25), "KeyZ", "KeyX", "KeyC", "KeyV", "KeyB", "KeyN", "KeyM", "Comma", "Period", "Slash", wide("ShiftRight", 2.75)],
    [wide("ControlLeft", 1.25), wide("MetaLeft", 1.25), wide("AltLeft", 1.25), wide("Space", 6.25), wide("AltRight", 1.25), wide("MetaRight", 1.25), wide("ContextMenu", 1.25), wide("ControlRight", 1.25)],
  ];

  const NAV_ROWS = [
    ["PrintScreen", "ScrollLock", "Pause"],
    ["Insert", "Home", "PageUp"],
    ["Delete", "End", "PageDown"],
    [gap(1), gap(1), gap(1)],
    [gap(1), "ArrowUp", gap(1)],
    ["ArrowLeft", "ArrowDown", "ArrowRight"],
  ];

  const NUMPAD_KEYS = [
    "NumLock", "NumpadDivide", "NumpadMultiply", "NumpadSubtract",
    "Numpad7", "Numpad8", "Numpad9", "NumpadAdd",
    "Numpad4", "Numpad5", "Numpad6",
    "Numpad1", "Numpad2", "Numpad3", "NumpadEnter",
    "Numpad0", "NumpadDecimal",
  ];

  const panel = document.getElementById("panel");
  const board = document.getElementById("board");
  const readout = document.getElementById("readout");
  const status = document.getElementById("status");
  const layoutFull = document.getElementById("layoutFull");
  const layoutTkl = document.getElementById("layoutTkl");
  const resetPlace = document.getElementById("resetPlace");
  const dragHandle = document.getElementById("dragHandle");

  const pressed = new Set();
  const afterglowTimers = new Map();
  let layout = "full";
  let drag = null;

  function gap(w) {
    return { gap: w };
  }

  function wide(code, w) {
    return { code, w };
  }

  function legendFor(code) {
    if (Object.prototype.hasOwnProperty.call(LABEL, code)) return LABEL[code];
    if (code.startsWith("Key")) return code.slice(3);
    if (code.startsWith("Digit")) return code.slice(5);
    if (/^Numpad[0-9]$/.test(code)) return code.slice(6);
    return code;
  }

  function nameFor(code) {
    if (Object.prototype.hasOwnProperty.call(NAME, code)) return NAME[code];
    if (/^Numpad[0-9]$/.test(code)) return "數字 " + code.slice(6);
    return legendFor(code);
  }

  function makeKey(code, w) {
    const el = document.createElement("div");
    const label = legendFor(code);
    el.className = "key";
    el.dataset.code = code;
    el.style.setProperty("--w", String(w));
    if (w <= 1.25 && label.length > 3) el.dataset.long = "1";

    const shift = SHIFT_LABEL[code];
    if (shift) {
      const shiftEl = document.createElement("span");
      shiftEl.className = "shift-label";
      shiftEl.textContent = shift;
      el.appendChild(shiftEl);
    }

    const legend = document.createElement("span");
    legend.className = "legend";
    legend.textContent = label;
    el.appendChild(legend);
    return el;
  }

  function makeSpacer(w) {
    const el = document.createElement("div");
    el.className = "spacer";
    el.style.setProperty("--w", String(w));
    return el;
  }

  function appendItem(row, item) {
    if (typeof item === "string") {
      row.appendChild(makeKey(item, 1));
      return;
    }
    if (typeof item.gap === "number") {
      row.appendChild(makeSpacer(item.gap));
      return;
    }
    row.appendChild(makeKey(item.code, item.w));
  }

  function makeRows(rows) {
    const block = document.createElement("div");
    block.className = "block";
    rows.forEach((items) => {
      const row = document.createElement("div");
      row.className = "row";
      items.forEach((item) => appendItem(row, item));
      block.appendChild(row);
    });
    return block;
  }

  function makeNumpad() {
    const pad = document.createElement("div");
    pad.className = "numpad";
    NUMPAD_KEYS.forEach((code) => pad.appendChild(makeKey(code, 1)));
    return pad;
  }

  function render() {
    board.replaceChildren(makeRows(MAIN_ROWS), makeRows(NAV_ROWS));
    if (layout === "full") board.appendChild(makeNumpad());
    pressed.forEach((code) => mark(code, true));
    layoutFull.setAttribute("aria-pressed", layout === "full" ? "true" : "false");
    layoutTkl.setAttribute("aria-pressed", layout === "tkl" ? "true" : "false");
  }

  function fit() {
    const probe = 40;
    board.style.setProperty("--u", probe + "px");
    const width = board.scrollWidth;
    const height = board.scrollHeight;
    if (!width || !height) return;
    const availableW = window.innerWidth - 48;
    const availableH = Math.max(160, window.innerHeight - 150);
    const next = probe * Math.min(availableW / width, availableH / height, 1.15);
    board.style.setProperty("--u", Math.max(14, next).toFixed(2) + "px");
  }

  function mark(code, down) {
    const el = board.querySelector(`[data-code="${CSS.escape(code)}"]`);
    if (!el) return;
    el.classList.toggle("is-down", down);
    if (down) {
      el.classList.remove("afterglow");
      const pending = afterglowTimers.get(code);
      if (pending) {
        clearTimeout(pending);
        afterglowTimers.delete(code);
      }
      return;
    }
    el.classList.add("afterglow");
    const pending = afterglowTimers.get(code);
    if (pending) clearTimeout(pending);
    afterglowTimers.set(code, setTimeout(() => {
      el.classList.remove("afterglow");
      afterglowTimers.delete(code);
    }, 160));
  }

  function updateReadout() {
    const names = [...pressed].map(nameFor);
    readout.textContent = names.length ? names.join("  ") : "準備映射";
    readout.classList.toggle("idle", names.length === 0);
  }

  function setLive(live) {
    status.dataset.state = live ? "live" : "idle";
    status.textContent = live
      ? "顯示中 · 畫面上的鍵跟著你的鍵盤亮"
      : "點一下這個畫面，實體按鍵就會亮在下面";
  }

  function releaseAll() {
    [...pressed].forEach((code) => mark(code, false));
    pressed.clear();
    updateReadout();
  }

  function onKeyDown(event) {
    event.preventDefault();
    setLive(true);
    if (pressed.has(event.code)) return;
    pressed.add(event.code);
    mark(event.code, true);
    updateReadout();
  }

  function onKeyUp(event) {
    event.preventDefault();
    if (!pressed.has(event.code)) return;
    pressed.delete(event.code);
    mark(event.code, false);
    updateReadout();
  }

  layoutFull.addEventListener("click", () => {
    layout = "full";
    render();
    fit();
  });

  layoutTkl.addEventListener("click", () => {
    layout = "tkl";
    render();
    fit();
  });

  resetPlace.addEventListener("click", () => {
    panel.style.left = "50%";
    panel.style.top = "auto";
    panel.style.bottom = "18px";
    panel.style.transform = "translateX(-50%)";
  });

  dragHandle.addEventListener("pointerdown", (event) => {
    const rect = panel.getBoundingClientRect();
    panel.style.left = rect.left + "px";
    panel.style.top = rect.top + "px";
    panel.style.bottom = "auto";
    panel.style.transform = "none";
    drag = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
    dragHandle.setPointerCapture(event.pointerId);
  });

  dragHandle.addEventListener("pointermove", (event) => {
    if (!drag) return;
    const maxLeft = window.innerWidth - panel.offsetWidth;
    const maxTop = window.innerHeight - panel.offsetHeight;
    const left = Math.min(maxLeft, Math.max(0, drag.left + event.clientX - drag.x));
    const top = Math.min(maxTop, Math.max(0, drag.top + event.clientY - drag.y));
    panel.style.left = left + "px";
    panel.style.top = top + "px";
  });

  dragHandle.addEventListener("pointerup", () => {
    drag = null;
  });

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", () => {
    releaseAll();
    setLive(false);
  });
  window.addEventListener("focus", () => setLive(true));
  window.addEventListener("resize", fit);

  render();
  fit();
  setLive(document.hasFocus());
})();
