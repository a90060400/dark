import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from pynput.keyboard import Key, KeyCode

from mapping import display_name, from_keysym, normalize


class NormalizeTests(unittest.TestCase):
    def test_special_keys_use_physical_side(self):
        self.assertEqual(normalize(Key.space), "Space")
        self.assertEqual(normalize(Key.shift_l), "ShiftLeft")
        self.assertEqual(normalize(Key.shift_r), "ShiftRight")
        self.assertEqual(normalize(Key.ctrl_l), "ControlLeft")
        self.assertEqual(normalize(Key.enter), "Enter")
        self.assertEqual(normalize(Key.f5), "F5")

    def test_letters_ignore_shift(self):
        self.assertEqual(normalize(KeyCode.from_char("a")), "KeyA")
        self.assertEqual(normalize(KeyCode.from_char("A")), "KeyA")
        self.assertEqual(normalize(KeyCode.from_char("!")), "Digit1")

    def test_windows_virtual_key_wins_over_ime_character(self):
        bopomofo = KeyCode(vk=65, char="ㄇ")
        self.assertEqual(normalize(bopomofo, platform="win32"), "KeyA")
        self.assertEqual(normalize(KeyCode.from_vk(96), platform="win32"), "Numpad0")
        self.assertEqual(normalize(KeyCode.from_vk(49), platform="win32"), "Digit1")

    def test_linux_does_not_treat_keysym_as_windows_vk(self):
        self.assertIsNone(normalize(KeyCode.from_vk(65), platform="linux"))

    def test_keysym_and_display_name(self):
        self.assertEqual(from_keysym("j"), "KeyJ")
        self.assertEqual(from_keysym("exclam"), "Digit1")
        self.assertEqual(from_keysym("KP_7"), "Numpad7")
        self.assertEqual(from_keysym("Shift_L"), "ShiftLeft")
        self.assertEqual(display_name("Space"), "空白")
        self.assertEqual(display_name("KeyF"), "F")


if __name__ == "__main__":
    unittest.main()
