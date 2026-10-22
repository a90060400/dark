#!/usr/bin/env python3
"""桌面鍵盤映射。視窗保持在畫面上，按下的實體鍵會亮起來。"""

import json
import queue
import sys
import tkinter as tk
from pathlib import Path
from tkinter import font as tkfont

from pynput import keyboard

from mapping import display_name, from_keysym, normalize

PANEL = "#171c27"
CHROMA = "#010203"
KEY_BG = "#2a3142"
KEY_FG = "#f2f5fb"
HIDDEN_BG = "#141820"
HIDDEN_FG = "#6a7384"
DOWN_BG = "#ffc44d"
DOWN_FG = "#1c1404"
MUTED = "#aeb7c8"
GAP = 5
SECTION_GAP = 16
DEFAULT_ALPHA = 0.78


def gap(units):
    return ("gap", units)


def wide(code, units):
    return ("key", code, units)


def key(code):
    return ("key", code, 1)


MAIN_ROWS = [
    [key("Escape"), gap(1), key("F1"), key("F2"), key("F3"), key("F4"), gap(0.5), key("F5"), key("F6"), key("F7"), key("F8"), gap(0.5), key("F9"), key("F10"), key("F11"), key("F12")],
    [key("Backquote"), key("Digit1"), key("Digit2"), key("Digit3"), key("Digit4"), key("Digit5"), key("Digit6"), key("Digit7"), key("Digit8"), key("Digit9"), key("Digit0"), key("Minus"), key("Equal"), wide("Backspace", 2)],
    [wide("Tab", 1.5), key("KeyQ"), key("KeyW"), key("KeyE"), key("KeyR"), key("KeyT"), key("KeyY"), key("KeyU"), key("KeyI"), key("KeyO"), key("KeyP"), key("BracketLeft"), key("BracketRight"), wide("Backslash", 1.5)],
    [wide("CapsLock", 1.75), key("KeyA"), key("KeyS"), key("KeyD"), key("KeyF"), key("KeyG"), key("KeyH"), key("KeyJ"), key("KeyK"), key("KeyL"), key("Semicolon"), key("Quote"), wide("Enter", 2.25)],
    [wide("ShiftLeft", 2.25), key("KeyZ"), key("KeyX"), key("KeyC"), key("KeyV"), key("KeyB"), key("KeyN"), key("KeyM"), key("Comma"), key("Period"), key("Slash"), wide("ShiftRight", 2.75)],
    [wide("ControlLeft", 1.25), wide("MetaLeft", 1.25), wide("AltLeft", 1.25), wide("Space", 6.25), wide("AltRight", 1.25), wide("MetaRight", 1.25), wide("ContextMenu", 1.25), wide("ControlRight", 1.25)],
]

NAV_ROWS = [
    [key("PrintScreen"), key("ScrollLock"), key("Pause")],
    [key("Insert"), key("Home"), key("PageUp")],
    [key("Delete"), key("End"), key("PageDown")],
    [gap(1), gap(1), gap(1)],
    [gap(1), key("ArrowUp"), gap(1)],
    [key("ArrowLeft"), key("ArrowDown"), key("ArrowRight")],
]

NUMPAD = [
    ("NumLock", 0, 0, 1, 1),
    ("NumpadDivide", 0, 1, 1, 1),
    ("NumpadMultiply", 0, 2, 1, 1),
    ("NumpadSubtract", 0, 3, 1, 1),
    ("Numpad7", 1, 0, 1, 1),
    ("Numpad8", 1, 1, 1, 1),
    ("Numpad9", 1, 2, 1, 1),
    ("NumpadAdd", 1, 3, 2, 1),
    ("Numpad4", 2, 0, 1, 1),
    ("Numpad5", 2, 1, 1, 1),
    ("Numpad6", 2, 2, 1, 1),
    ("Numpad1", 3, 0, 1, 1),
    ("Numpad2", 3, 1, 1, 1),
    ("Numpad3", 3, 2, 1, 1),
    ("NumpadEnter", 3, 3, 2, 1),
    ("Numpad0", 4, 0, 1, 2),
    ("NumpadDecimal", 4, 2, 1, 1),
]

LEGEND = {
    "Escape": "Esc",
    "Backquote": "`",
    "Minus": "-",
    "Equal": "=",
    "Backspace": "⌫",
    "Tab": "Tab",
    "BracketLeft": "[",
    "BracketRight": "]",
    "Backslash": "\\",
    "CapsLock": "Caps",
    "Semicolon": ";",
    "Quote": "'",
    "Enter": "Enter",
    "ShiftLeft": "Shift",
    "ShiftRight": "Shift",
    "Comma": ",",
    "Period": ".",
    "Slash": "/",
    "ControlLeft": "Ctrl",
    "ControlRight": "Ctrl",
    "MetaLeft": "Win",
    "MetaRight": "Win",
    "AltLeft": "Alt",
    "AltRight": "Alt",
    "Space": "",
    "ContextMenu": "Menu",
    "PrintScreen": "PrtSc",
    "ScrollLock": "ScrLk",
    "Pause": "Pause",
    "Insert": "Ins",
    "Home": "Home",
    "PageUp": "PgUp",
    "Delete": "Del",
    "End": "End",
    "PageDown": "PgDn",
    "ArrowUp": "↑",
    "ArrowLeft": "←",
    "ArrowDown": "↓",
    "ArrowRight": "→",
    "NumLock": "Num",
    "NumpadDivide": "/",
    "NumpadMultiply": "*",
    "NumpadSubtract": "-",
    "NumpadAdd": "+",
    "NumpadEnter": "Enter",
    "NumpadDecimal": ".",
}


def iter_row_codes(rows):
    for items in rows:
        for item in items:
            if item[0] == "key":
                yield item[1]


NUMPAD_CODES = {item[0] for item in NUMPAD}
ALL_CODES = list(iter_row_codes(MAIN_ROWS)) + list(iter_row_codes(NAV_ROWS)) + [item[0] for item in NUMPAD]


def legend_for(code):
    if code in LEGEND:
        return LEGEND[code]
    if code.startswith("Key") and len(code) == 4:
        return code[3:]
    if code.startswith("Digit") and len(code) == 6:
        return code[5:]
    if code.startswith("Numpad") and code[-1].isdigit():
        return code[-1]
    return code


def pick_font():
    families = set(tkfont.families())
    for name in ("Microsoft JhengHei", "PingFang TC", "Noto Sans CJK TC", "Noto Sans CJK JP", "WenQuanYi Micro Hei", "Segoe UI", "DejaVu Sans"):
        if name in families:
            return name
    return "TkDefaultFont"


class KeyboardApp:
    def __init__(self, listen=True, settings_path="default"):
        self.root = tk.Tk()
        self.root.title("鍵盤映射")
        self.root.configure(bg=CHROMA)
        self.root.attributes("-topmost", True)
        screen_w = self.root.winfo_screenwidth()
        self.unit = 32 if screen_w < 1100 else 40
        self.font_name = pick_font()
        self.key_font = tkfont.Font(family=self.font_name, size=9 if self.unit < 36 else 10)
        self.small_font = tkfont.Font(family=self.font_name, size=7 if self.unit < 36 else 8)
        self.readout_font = tkfont.Font(family=self.font_name, size=22, weight="bold")
        self.layout = "full"
        self.visible = set(ALL_CODES)
        self.alpha = DEFAULT_ALPHA
        self.editing = False
        self._ready = False
        self.faces = {}
        self.held = []
        self._release_jobs = {}
        self.release_delay_ms = 80
        self.events = queue.Queue()
        self.listener = None
        self.listener_error = False
        self._placed = False
        if settings_path == "default":
            self.settings_path = Path(__file__).with_name("settings.json")
        elif settings_path:
            self.settings_path = Path(settings_path)
        else:
            self.settings_path = None
        self._load_settings()

        outer = tk.Frame(self.root, bg=CHROMA, padx=14, pady=12)
        outer.pack()
        bar = tk.Frame(outer, bg=PANEL, padx=10, pady=8)
        bar.pack(fill="x")
        self.readout = tk.Label(
            bar,
            text="準備映射",
            bg=PANEL,
            fg=MUTED,
            font=self.readout_font,
        )
        self.readout.pack(fill="x")
        tools = tk.Frame(bar, bg=PANEL)
        tools.pack(fill="x", pady=(4, 0))
        self.status = tk.Label(tools, text="正在啟動鍵盤觀測…", bg=PANEL, fg=MUTED, font=(self.font_name, 10))
        self.status.pack(side="left")
        button_row = tk.Frame(tools, bg=PANEL)
        button_row.pack(side="right")
        self.full_button = self._tool_button(button_row, "全尺寸", lambda: self.use_layout("full"))
        self.tkl_button = self._tool_button(button_row, "無數字鍵", lambda: self.use_layout("tkl"))
        self.edit_button = self._tool_button(button_row, "選擇按鍵", self.toggle_edit)
        self.top_var = tk.BooleanVar(value=True)
        top = tk.Checkbutton(
            button_row,
            text="保持在最上層",
            variable=self.top_var,
            command=self._apply_topmost,
            bg=PANEL,
            fg=KEY_FG,
            selectcolor="#242b3a",
            activebackground=PANEL,
            activeforeground=KEY_FG,
            font=(self.font_name, 10),
        )
        top.pack(side="left", padx=(8, 0))
        opacity_row = tk.Frame(bar, bg=PANEL)
        opacity_row.pack(fill="x", pady=(6, 0))
        tk.Label(opacity_row, text="透明度", bg=PANEL, fg=KEY_FG, font=(self.font_name, 10)).pack(side="left")
        self.opacity_var = tk.IntVar(value=round((1 - self.alpha) * 100))
        self.opacity_scale = tk.Scale(
            opacity_row,
            from_=0,
            to=70,
            resolution=5,
            orient=tk.HORIZONTAL,
            showvalue=True,
            length=160,
            bg=PANEL,
            fg=KEY_FG,
            troughcolor="#242b3a",
            highlightthickness=0,
            variable=self.opacity_var,
            command=self._on_opacity,
        )
        self.opacity_scale.pack(side="left", padx=(8, 0))
        self.board_host = tk.Frame(outer, bg=CHROMA)
        self.board_host.pack(pady=(10, 0))
        self.hint = tk.Label(
            bar,
            text="鍵與鍵之間是透明的。按鍵內容不儲存、不外傳。",
            bg=PANEL,
            fg="#7d8798",
            font=(self.font_name, 9),
        )
        self.hint.pack(anchor="w", pady=(6, 0))

        self._apply_transparency()
        self._render()
        self._mark_layout_buttons()
        self._ready = True
        self.opacity_var.trace_add("write", self._on_opacity_var)
        self.root.protocol("WM_DELETE_WINDOW", self.close)
        self.root.bind_all("<KeyPress>", self._on_tk_press)
        self.root.bind_all("<KeyRelease>", self._on_tk_release)
        if listen:
            self._start_listener()
        else:
            self.status.configure(text="觀測未啟動", fg=MUTED)
        self.root.after(16, self._poll)
        self.root.after(400, self._watch_listener)
        self.root.after(50, self._place_bottom)

    def _tool_button(self, parent, text, command):
        button = tk.Button(
            parent,
            text=text,
            command=command,
            bg="#242b3a",
            fg=KEY_FG,
            activebackground=DOWN_BG,
            activeforeground=DOWN_FG,
            relief="flat",
            padx=10,
            pady=2,
            font=(self.font_name, 10),
        )
        button.pack(side="left", padx=(6, 0))
        return button

    def _apply_topmost(self):
        self.root.attributes("-topmost", bool(self.top_var.get()))

    def _apply_transparency(self):
        try:
            self.root.attributes("-alpha", self.alpha)
        except tk.TclError:
            pass
        if sys.platform == "win32":
            try:
                self.root.wm_attributes("-transparentcolor", CHROMA)
            except tk.TclError:
                pass

    def _on_opacity_var(self, *_args):
        self._on_opacity(self.opacity_var.get())

    def _on_opacity(self, raw):
        self.alpha = min(1.0, max(0.3, 1 - float(raw) / 100))
        self._apply_transparency()
        self._save_settings()

    def _load_settings(self):
        if self.settings_path is None or not self.settings_path.exists():
            return
        try:
            data = json.loads(self.settings_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return
        alpha = data.get("alpha")
        if isinstance(alpha, (int, float)) and 0.3 <= float(alpha) <= 1:
            self.alpha = float(alpha)
        saved = data.get("visible")
        if isinstance(saved, list):
            chosen = {code for code in saved if code in ALL_CODES}
            if chosen:
                self.visible = chosen
                self.layout = "custom"
                if chosen == set(ALL_CODES):
                    self.layout = "full"
                elif chosen == set(ALL_CODES) - NUMPAD_CODES:
                    self.layout = "tkl"

    def _save_settings(self):
        if not self._ready or self.settings_path is None:
            return
        payload = {"alpha": self.alpha, "visible": sorted(self.visible)}
        self.settings_path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")

    def _place_bottom(self):
        if self._placed:
            return
        self.root.update_idletasks()
        width = self.root.winfo_reqwidth()
        height = self.root.winfo_reqheight()
        x = max(0, (self.root.winfo_screenwidth() - width) // 2)
        y = max(0, self.root.winfo_screenheight() - height - 28)
        self.root.geometry(f"+{x}+{y}")
        self._placed = True

    def use_layout(self, layout):
        if layout not in ("full", "tkl"):
            return
        target = set(ALL_CODES) if layout == "full" else set(ALL_CODES) - NUMPAD_CODES
        if self.layout == layout and self.visible == target and not self.editing:
            return
        self.editing = False
        self.layout = layout
        self.visible = target
        self._render()
        for code in self.held:
            self._paint(code, True)
        self._mark_layout_buttons()
        self._set_hint()
        self._save_settings()

    def toggle_edit(self):
        if self.editing:
            if not self.visible:
                self.hint.configure(text="請先點你要出現的按鍵，再按完成。")
                return
            self.editing = False
            self._save_settings()
        else:
            self.editing = True
            if self.layout != "custom":
                self.layout = "custom"
        self._render()
        for code in self.held:
            self._paint(code, True)
        self._mark_layout_buttons()
        self._set_hint()

    def toggle_visible(self, code):
        if code not in ALL_CODES or not self.editing:
            return
        if code in self.visible:
            self.visible.remove(code)
        else:
            self.visible.add(code)
        self.layout = "custom"
        self._paint(code, code in self.held)
        self._mark_layout_buttons()
        self._set_hint()
        self._save_settings()

    def _set_hint(self):
        if self.editing and not self.visible:
            text = "點你要出現的按鍵。選過的會留著，下次不用重選。"
        elif self.editing:
            text = f"已選 {len(self.visible)} 顆，會先記下來。再點一下可取消，選完按完成。"
        else:
            text = "鍵與鍵之間是透明的。按過的鍵不外傳。你選的鍵會留在這台電腦。"
        self.hint.configure(text=text)

    def _style_button(self, button, active):
        button.configure(
            bg=DOWN_BG if active else "#242b3a",
            fg=DOWN_FG if active else KEY_FG,
        )

    def _mark_layout_buttons(self):
        self._style_button(self.full_button, self.layout == "full" and not self.editing)
        self._style_button(self.tkl_button, self.layout == "tkl" and not self.editing)
        self.edit_button.configure(text="完成" if self.editing else "選擇按鍵")
        self._style_button(self.edit_button, self.editing or self.layout == "custom")

    def _render(self):
        for child in self.board_host.winfo_children():
            child.destroy()
        self.faces = {}
        board = tk.Frame(self.board_host, bg=CHROMA)
        board.pack()
        sections = []
        main = self._rows(board, MAIN_ROWS)
        if main is not None:
            sections.append(main)
        nav = self._rows(board, NAV_ROWS)
        if nav is not None:
            sections.append(nav)
        if self.editing or self._numpad_wanted():
            pad = self._numpad(board)
            if pad is not None:
                sections.append(pad)
        for index, section in enumerate(sections):
            section.pack(side="left", anchor="s", padx=(SECTION_GAP if index else 0, 0))

    def _shows(self, code):
        return self.editing or code in self.visible

    def _numpad_wanted(self):
        return any(code in self.visible for code in NUMPAD_CODES)

    def _rows(self, parent, rows):
        block = tk.Frame(parent, bg=CHROMA)
        used = False
        for items in rows:
            kept = []
            for item in items:
                if item[0] == "gap":
                    if not self.editing and self.layout == "custom":
                        continue
                    kept.append(item)
                    continue
                if self._shows(item[1]):
                    kept.append(item)
            if not any(item[0] == "key" for item in kept):
                continue
            row = tk.Frame(block, bg=CHROMA)
            row.pack(anchor="w")
            for item in kept:
                if item[0] == "gap":
                    self._slot(row, item[1], 1)
                    continue
                self._add_key(row, item[1], item[2], 1)
            used = True
        if not used:
            block.destroy()
            return None
        return block

    def _slot(self, parent, units_w, units_h):
        slot = tk.Frame(parent, width=int(self.unit * units_w), height=int(self.unit * units_h), bg=CHROMA)
        slot.pack(side="left")
        slot.pack_propagate(False)
        return slot

    def _add_key(self, parent, code, units_w, units_h):
        slot = self._slot(parent, units_w, units_h)
        face = tk.Frame(slot, bg=KEY_BG, highlightthickness=1, highlightbackground="#59637a")
        face.place(x=0, y=0, width=int(self.unit * units_w) - GAP, height=int(self.unit * units_h) - GAP)
        label_text = legend_for(code)
        label_font = self.small_font if units_w <= 1.25 and len(label_text) > 3 else self.key_font
        label = tk.Label(face, text=label_text, bg=KEY_BG, fg=KEY_FG, font=label_font)
        label.place(relx=0.5, rely=0.5, anchor="center")
        self.faces[code] = (face, label)
        self._bind_key(face, label, code)
        self._paint(code, code in self.held)
        return face

    def _bind_key(self, face, label, code):
        def handler(_event, key_code=code):
            if self.editing:
                self.toggle_visible(key_code)
            return "break"

        face.bind("<Button-1>", handler)
        label.bind("<Button-1>", handler)

    def _numpad(self, parent):
        shown = [item for item in NUMPAD if self._shows(item[0])]
        if not shown:
            return None
        pad = tk.Frame(parent, bg=CHROMA)
        for code, row, column, rowspan, colspan in shown:
            slot = tk.Frame(pad, width=int(self.unit * colspan), height=int(self.unit * rowspan), bg=CHROMA)
            slot.grid(row=row, column=column, rowspan=rowspan, columnspan=colspan, sticky="nw")
            slot.grid_propagate(False)
            face = tk.Frame(slot, bg=KEY_BG, highlightthickness=1, highlightbackground="#59637a")
            face.place(x=0, y=0, width=int(self.unit * colspan) - GAP, height=int(self.unit * rowspan) - GAP)
            label = tk.Label(face, text=legend_for(code), bg=KEY_BG, fg=KEY_FG, font=self.key_font)
            label.place(relx=0.5, rely=0.5, anchor="center")
            self.faces[code] = (face, label)
            self._bind_key(face, label, code)
            self._paint(code, code in self.held)
        return pad

    def _paint(self, code, down):
        widgets = self.faces.get(code)
        if widgets is None:
            return
        face, label = widgets
        if self.editing and code not in self.visible:
            bg, fg = HIDDEN_BG, HIDDEN_FG
        elif down:
            bg, fg = DOWN_BG, DOWN_FG
        else:
            bg, fg = KEY_BG, KEY_FG
        face.configure(bg=bg)
        label.configure(bg=bg, fg=fg)

    def set_down(self, code, down):
        pending = self._release_jobs.pop(code, None)
        if pending is not None:
            self.root.after_cancel(pending)
        if down:
            if code in self.held:
                return
            self.held.append(code)
            self._paint(code, True)
            self._update_readout()
            return
        if self.release_delay_ms <= 0:
            self._finish_release(code)
            return
        self._release_jobs[code] = self.root.after(self.release_delay_ms, lambda key_code=code: self._finish_release(key_code))

    def _finish_release(self, code):
        self._release_jobs.pop(code, None)
        if code not in self.held:
            return
        self.held.remove(code)
        self._paint(code, False)
        self._update_readout()

    def _update_readout(self):
        if self.held:
            self.readout.configure(text="  ".join(display_name(item) for item in self.held), fg=KEY_FG)
        else:
            self.readout.configure(text="準備映射", fg=MUTED)

    def is_down(self, code):
        return code in self.held

    def _on_tk_press(self, event):
        code = from_keysym(event.keysym)
        if code:
            self.set_down(code, True)
        return "break"

    def _on_tk_release(self, event):
        code = from_keysym(event.keysym)
        if code:
            self.set_down(code, False)
        return "break"

    def _start_listener(self):
        try:
            self.listener = keyboard.Listener(on_press=self._on_press, on_release=self._on_release)
            self.listener.start()
        except Exception:
            self.listener = None
            self.listener_error = True

    def _on_press(self, key):
        code = normalize(key)
        if code:
            self.events.put((True, code))

    def _on_release(self, key):
        code = normalize(key)
        if code:
            self.events.put((False, code))

    def _poll(self):
        while True:
            try:
                down, code = self.events.get_nowait()
            except queue.Empty:
                break
            self.set_down(code, down)
        if self.root.winfo_exists():
            self.root.after(16, self._poll)

    def _watch_listener(self, tries=0):
        if self.listener is None and not self.listener_error:
            return
        if self.listener is not None and self.listener.running:
            self.status.configure(text="觀測中 · 你按下的鍵會亮在這裡", fg="#d7ffe8")
            return
        if self.listener is not None and self.listener.is_alive() and tries < 10:
            self.root.after(200, lambda: self._watch_listener(tries + 1))
            return
        self.status.configure(text="全域觀測沒有啟動。點這個視窗後按鍵，仍會亮。", fg="#e7c07a")

    def close(self):
        for job in self._release_jobs.values():
            self.root.after_cancel(job)
        self._release_jobs.clear()
        if self.listener is not None:
            self.listener.stop()
        self.root.destroy()

    def run(self):
        self.root.mainloop()


def main():
    app = KeyboardApp(listen="--no-listen" not in sys.argv)
    app.run()


if __name__ == "__main__":
    main()
