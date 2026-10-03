import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

from build import SCENARIOS, build  # noqa: E402
from mock_data import make_snapshot  # noqa: E402


class BuildContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.production = build().read_text()

    def test_production_uses_same_origin_read_only_snapshot(self):
        self.assertIn('data-api-base="/meeting-room-display/api"', self.production)
        self.assertIn('data-layout-report="off"', self.production)
        self.assertNotIn('data-layout-report="on"', self.production)
        self.assertNotIn("{{", self.production)
        self.assertNotIn("open.feishu.cn", self.production)
        self.assertIn("data:image/svg+xml;base64,", self.production)
        self.assertIn("data:font/woff2;base64,", self.production)

    def test_local_artifact_keeps_geometry_reporting_for_acer_checks(self):
        local = (ROOT / "dist" / "local.html").read_text()
        self.assertIn('data-api-base="/api"', local)
        self.assertIn('data-layout-report="on"', local)

    def test_every_preview_uses_a_mock_api(self):
        for scenario in SCENARIOS:
            with self.subTest(scenario=scenario):
                html = (ROOT / "dist" / "preview" / scenario / "index.html").read_text()
                self.assertIn(f'data-api-base="/mock/{scenario}"', html)
                self.assertNotIn('data-api-base="/meeting-room-display/api"', html)


class MockContractTests(unittest.TestCase):
    NOW = datetime(2026, 9, 29, 9, 0, tzinfo=timezone(timedelta(hours=8)))

    def test_scenarios_are_synthetic_and_identity_free(self):
        for scenario in SCENARIOS:
            with self.subTest(scenario=scenario):
                payload = make_snapshot(scenario, self.NOW)
                self.assertEqual(payload["source"], "demo")
                self.assertIn("示例会议室", payload["room"]["name"])
                self.assertEqual(payload["fresh"], scenario != "unknown")
                self.assertEqual(payload["room"]["enabled"], True)
                for event in payload["events"]:
                    self.assertEqual(set(event), {"start", "end"})
                    self.assertLess(datetime.fromisoformat(event["start"]),
                                    datetime.fromisoformat(event["end"]))

    def test_unknown_cannot_show_future_booking(self):
        payload = make_snapshot("unknown", self.NOW)
        self.assertFalse(payload["fresh"])
        self.assertEqual(payload["events"], [])

    def test_preview_rooms_have_distinct_synthetic_names(self):
        one = make_snapshot("available", self.NOW, room_number=1)
        two = make_snapshot("available", self.NOW, room_number=2)
        self.assertNotEqual(one["room"]["name"], two["room"]["name"])
        self.assertEqual(two["source"], "demo")


if __name__ == "__main__":
    unittest.main()
