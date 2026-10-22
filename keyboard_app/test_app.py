import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from app import DOWN_BG, KEY_BG, KeyboardApp


class AppTests(unittest.TestCase):
    def setUp(self):
        self.app = KeyboardApp(listen=False)
        self.app.root.update_idletasks()

    def tearDown(self):
        self.app.close()

    def test_full_keyboard_maps_104_keys(self):
        self.assertEqual(len(self.app.faces), 104)
        self.assertIn("KeyA", self.app.faces)
        self.assertIn("NumpadEnter", self.app.faces)
        self.assertIn("ArrowUp", self.app.faces)

    def test_laptop_layout_removes_numpad(self):
        self.app.use_layout("tkl")
        self.app.root.update_idletasks()
        self.assertEqual(len(self.app.faces), 87)
        self.assertNotIn("Numpad0", self.app.faces)
        self.assertIn("KeyA", self.app.faces)

    def test_held_key_lights_and_names_itself(self):
        self.app.set_down("KeyF", True)
        self.app.set_down("Space", True)
        face, _label = self.app.faces["KeyF"]
        self.assertEqual(face.cget("bg"), DOWN_BG)
        self.assertEqual(self.app.readout.cget("text"), "F  空白")
        self.app.set_down("KeyF", False)
        self.app.set_down("Space", False)
        self.assertEqual(face.cget("bg"), KEY_BG)
        self.assertEqual(self.app.readout.cget("text"), "準備映射")
        self.assertFalse(self.app.is_down("Space"))


if __name__ == "__main__":
    unittest.main()
