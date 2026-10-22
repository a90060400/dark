import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from app import DOWN_BG, HIDDEN_BG, KEY_BG, KeyboardApp


class AppTests(unittest.TestCase):
    def setUp(self):
        self.app = KeyboardApp(listen=False, settings_path=None)
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

    def test_opacity_slider_changes_window_alpha(self):
        self.app.opacity_scale.set(40)
        self.assertAlmostEqual(self.app.alpha, 0.6)
        self.assertAlmostEqual(float(self.app.root.attributes("-alpha")), 0.6)

    def test_custom_keys_are_the_ones_you_pick(self):
        self.app.toggle_edit()
        self.assertEqual(self.app.visible, set())
        self.assertEqual(self.app.faces["KeyA"][0].cget("bg"), HIDDEN_BG)
        self.app.toggle_visible("KeyA")
        self.app.toggle_visible("Space")
        self.assertEqual(self.app.visible, {"KeyA", "Space"})
        self.assertEqual(self.app.faces["KeyA"][0].cget("bg"), KEY_BG)
        self.assertEqual(self.app.faces["KeyS"][0].cget("bg"), HIDDEN_BG)
        self.app.toggle_edit()
        self.assertEqual(set(self.app.faces), {"KeyA", "Space"})
        self.assertFalse(self.app.editing)

    def test_finish_without_a_pick_stays_in_selection(self):
        self.app.toggle_edit()
        self.app.toggle_edit()
        self.assertTrue(self.app.editing)
        self.assertIn("請先點你要出現的按鍵", self.app.hint.cget("text"))

    def test_settings_restore_alpha_and_visible_keys(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "settings.json"
            path.write_text(json.dumps({"alpha": 0.5, "visible": ["KeyW", "Space"]}), encoding="utf-8")
            app = KeyboardApp(listen=False, settings_path=path)
            try:
                self.assertAlmostEqual(app.alpha, 0.5)
                self.assertEqual(set(app.faces), {"KeyW", "Space"})
            finally:
                app.close()


if __name__ == "__main__":
    unittest.main()
