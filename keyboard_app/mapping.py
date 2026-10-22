"""把鍵盤事件對到實體鍵位置。

Windows 用虛擬鍵碼，所以注音或倉頡輸入時仍對得到原本那顆鍵。
"""

import sys

from pynput.keyboard import Key, KeyCode

_KEY_NAMES = {
    "alt": "AltLeft",
    "alt_l": "AltLeft",
    "alt_r": "AltRight",
    "alt_gr": "AltRight",
    "backspace": "Backspace",
    "caps_lock": "CapsLock",
    "cmd": "MetaLeft",
    "cmd_l": "MetaLeft",
    "cmd_r": "MetaRight",
    "ctrl": "ControlLeft",
    "ctrl_l": "ControlLeft",
    "ctrl_r": "ControlRight",
    "delete": "Delete",
    "down": "ArrowDown",
    "end": "End",
    "enter": "Enter",
    "esc": "Escape",
    "home": "Home",
    "insert": "Insert",
    "left": "ArrowLeft",
    "menu": "ContextMenu",
    "num_lock": "NumLock",
    "page_down": "PageDown",
    "page_up": "PageUp",
    "pause": "Pause",
    "print_screen": "PrintScreen",
    "right": "ArrowRight",
    "scroll_lock": "ScrollLock",
    "shift": "ShiftLeft",
    "shift_l": "ShiftLeft",
    "shift_r": "ShiftRight",
    "space": "Space",
    "tab": "Tab",
    "up": "ArrowUp",
}

for _number in range(1, 13):
    _KEY_NAMES[f"f{_number}"] = f"F{_number}"

_WIN_VK = {
    8: "Backspace",
    9: "Tab",
    13: "Enter",
    16: "ShiftLeft",
    17: "ControlLeft",
    18: "AltLeft",
    19: "Pause",
    20: "CapsLock",
    27: "Escape",
    32: "Space",
    33: "PageUp",
    34: "PageDown",
    35: "End",
    36: "Home",
    37: "ArrowLeft",
    38: "ArrowUp",
    39: "ArrowRight",
    40: "ArrowDown",
    44: "PrintScreen",
    45: "Insert",
    46: "Delete",
    91: "MetaLeft",
    92: "MetaRight",
    93: "ContextMenu",
    106: "NumpadMultiply",
    107: "NumpadAdd",
    109: "NumpadSubtract",
    110: "NumpadDecimal",
    111: "NumpadDivide",
    144: "NumLock",
    145: "ScrollLock",
    160: "ShiftLeft",
    161: "ShiftRight",
    162: "ControlLeft",
    163: "ControlRight",
    164: "AltLeft",
    165: "AltRight",
    186: "Semicolon",
    187: "Equal",
    188: "Comma",
    189: "Minus",
    190: "Period",
    191: "Slash",
    192: "Backquote",
    219: "BracketLeft",
    220: "Backslash",
    221: "BracketRight",
    222: "Quote",
}

for _digit in range(10):
    _WIN_VK[48 + _digit] = f"Digit{_digit}"
    _WIN_VK[96 + _digit] = f"Numpad{_digit}"

for _letter_index, _letter in enumerate("ABCDEFGHIJKLMNOPQRSTUVWXYZ"):
    _WIN_VK[65 + _letter_index] = f"Key{_letter}"

for _function_index in range(1, 13):
    _WIN_VK[111 + _function_index] = f"F{_function_index}"

_CHAR_TO_CODE = {}
for _letter in "abcdefghijklmnopqrstuvwxyz":
    _code = f"Key{_letter.upper()}"
    _CHAR_TO_CODE[_letter] = _code
    _CHAR_TO_CODE[_letter.upper()] = _code

for _digit, _shifted in zip("1234567890", "!@#$%^&*()"):
    _CHAR_TO_CODE[_digit] = f"Digit{_digit}"
    _CHAR_TO_CODE[_shifted] = f"Digit{_digit}"

_CHAR_TO_CODE.update({
    "-": "Minus",
    "_": "Minus",
    "=": "Equal",
    "+": "Equal",
    "[": "BracketLeft",
    "{": "BracketLeft",
    "]": "BracketRight",
    "}": "BracketRight",
    "\\": "Backslash",
    "|": "Backslash",
    ";": "Semicolon",
    ":": "Semicolon",
    "'": "Quote",
    '"': "Quote",
    ",": "Comma",
    "<": "Comma",
    ".": "Period",
    ">": "Period",
    "/": "Slash",
    "?": "Slash",
    "`": "Backquote",
    "~": "Backquote",
    " ": "Space",
    "\t": "Tab",
    "\r": "Enter",
    "\n": "Enter",
    "\x1b": "Escape",
    "\b": "Backspace",
})

_KEYSYM = {
    "space": "Space",
    "Shift_L": "ShiftLeft",
    "Shift_R": "ShiftRight",
    "Control_L": "ControlLeft",
    "Control_R": "ControlRight",
    "Alt_L": "AltLeft",
    "Alt_R": "AltRight",
    "Meta_L": "MetaLeft",
    "Meta_R": "MetaRight",
    "Super_L": "MetaLeft",
    "Super_R": "MetaRight",
    "Win_L": "MetaLeft",
    "Win_R": "MetaRight",
    "Return": "Enter",
    "KP_Enter": "NumpadEnter",
    "BackSpace": "Backspace",
    "Escape": "Escape",
    "Tab": "Tab",
    "Caps_Lock": "CapsLock",
    "Up": "ArrowUp",
    "Down": "ArrowDown",
    "Left": "ArrowLeft",
    "Right": "ArrowRight",
    "Prior": "PageUp",
    "Next": "PageDown",
    "Home": "Home",
    "End": "End",
    "Insert": "Insert",
    "Delete": "Delete",
    "Print": "PrintScreen",
    "Pause": "Pause",
    "Scroll_Lock": "ScrollLock",
    "Num_Lock": "NumLock",
    "Menu": "ContextMenu",
    "App": "ContextMenu",
    "grave": "Backquote",
    "minus": "Minus",
    "equal": "Equal",
    "bracketleft": "BracketLeft",
    "bracketright": "BracketRight",
    "backslash": "Backslash",
    "semicolon": "Semicolon",
    "apostrophe": "Quote",
    "quoteright": "Quote",
    "comma": "Comma",
    "period": "Period",
    "slash": "Slash",
    "exclam": "Digit1",
    "at": "Digit2",
    "numbersign": "Digit3",
    "dollar": "Digit4",
    "percent": "Digit5",
    "asciicircum": "Digit6",
    "ampersand": "Digit7",
    "asterisk": "Digit8",
    "parenleft": "Digit9",
    "parenright": "Digit0",
    "underscore": "Minus",
    "plus": "Equal",
    "braceleft": "BracketLeft",
    "braceright": "BracketRight",
    "bar": "Backslash",
    "colon": "Semicolon",
    "quotedbl": "Quote",
    "less": "Comma",
    "greater": "Period",
    "question": "Slash",
    "asciitilde": "Backquote",
    "KP_Add": "NumpadAdd",
    "KP_Subtract": "NumpadSubtract",
    "KP_Multiply": "NumpadMultiply",
    "KP_Divide": "NumpadDivide",
    "KP_Decimal": "NumpadDecimal",
}

_NAMES = {
    "Backspace": "退格",
    "Tab": "Tab",
    "CapsLock": "大寫鎖",
    "Enter": "Enter",
    "NumpadEnter": "數字 Enter",
    "ShiftLeft": "左 Shift",
    "ShiftRight": "右 Shift",
    "ControlLeft": "左 Ctrl",
    "ControlRight": "右 Ctrl",
    "AltLeft": "左 Alt",
    "AltRight": "右 Alt",
    "MetaLeft": "左 Win",
    "MetaRight": "右 Win",
    "Space": "空白",
    "ContextMenu": "選單",
    "Escape": "Esc",
    "PrintScreen": "PrtSc",
    "ScrollLock": "ScrLk",
    "Pause": "Pause",
    "Insert": "Insert",
    "Home": "Home",
    "PageUp": "PgUp",
    "Delete": "Delete",
    "End": "End",
    "PageDown": "PgDn",
    "ArrowUp": "上",
    "ArrowLeft": "左",
    "ArrowDown": "下",
    "ArrowRight": "右",
    "NumLock": "Num",
    "NumpadDivide": "數字 /",
    "NumpadMultiply": "數字 *",
    "NumpadSubtract": "數字 -",
    "NumpadAdd": "數字 +",
    "NumpadDecimal": "數字 .",
}


def normalize(key, platform=None):
    """回傳實體鍵代號，例如 KeyA、Space。認不出來就回傳 None。"""
    if key is None:
        return None
    system = sys.platform if platform is None else platform
    if isinstance(key, Key):
        return _KEY_NAMES.get(key.name)
    if isinstance(key, KeyCode):
        if system == "win32" and key.vk in _WIN_VK:
            return _WIN_VK[key.vk]
        if key.char:
            return _CHAR_TO_CODE.get(key.char) or _CHAR_TO_CODE.get(key.char.lower())
    return None


def from_keysym(keysym):
    """把視窗自己收到的 Tk keysym 對到同一套實體鍵代號。"""
    if not keysym:
        return None
    if keysym in _KEYSYM:
        return _KEYSYM[keysym]
    if len(keysym) == 1 and keysym.isalpha():
        return f"Key{keysym.upper()}"
    if len(keysym) == 1 and keysym.isdigit():
        return f"Digit{keysym}"
    if keysym.startswith("KP_") and len(keysym) == 4 and keysym[3].isdigit():
        return f"Numpad{keysym[3]}"
    if len(keysym) >= 2 and keysym[0] == "F" and keysym[1:].isdigit():
        number = int(keysym[1:])
        if 1 <= number <= 12:
            return f"F{number}"
    return None


def display_name(code):
    if code in _NAMES:
        return _NAMES[code]
    if code.startswith("Key") and len(code) == 4:
        return code[3:]
    if code.startswith("Digit") and len(code) == 6:
        return code[5:]
    if code.startswith("Numpad") and code[-1].isdigit():
        return "數字 " + code[-1]
    if len(code) >= 2 and code[0] == "F" and code[1:].isdigit():
        return code
    return code
