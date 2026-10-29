"""digest.py 的純函式測試，不連外網。"""

from __future__ import annotations

import unittest
from datetime import date, datetime
from zoneinfo import ZoneInfo

from digest import (
    Post,
    build_board_payload,
    extract_tickers,
    parse_post,
    render_board_html,
    render_markdown,
    resolve_days,
    ticker_counts,
)

TAIPEI = ZoneInfo("Asia/Taipei")


def _post(text: str, hour: int, day: int = 29) -> Post:
    return Post(
        id=f"{day}-{hour}",
        url=f"https://x.com/aleabitoreddit/status/{day}{hour}",
        text=text,
        created=datetime(2026, 10, day, hour, 5, tzinfo=TAIPEI),
        likes=3,
        reposts=1,
        replies=0,
        is_reply=False,
        author="aleabitoreddit",
    )


class ExtractTickersTest(unittest.TestCase):
    def test_cashtags_and_numeric_listings(self) -> None:
        text = "Long $MU and $000660.KS, not the $4.8B figure or $LITE."
        self.assertEqual(extract_tickers(text), ["MU", "000660.KS", "LITE"])

    def test_dedupes_and_uppercases(self) -> None:
        self.assertEqual(extract_tickers("$mu then $MU again"), ["MU"])

    def test_ignores_plain_dollars(self) -> None:
        self.assertEqual(extract_tickers("spend $75 on lunch"), [])

    def test_counts_repeated_cashtags(self) -> None:
        self.assertEqual(ticker_counts("$MU and $mu again, plus $LITE"), {"MU": 2, "LITE": 1})


class ParsePostTest(unittest.TestCase):
    def test_keeps_original_posts_from_the_handle(self) -> None:
        created = datetime(2026, 10, 29, 2, 0, tzinfo=ZoneInfo("UTC"))
        post = parse_post(
            {
                "type": "status",
                "id": "1",
                "url": "https://x.com/aleabitoreddit/status/1",
                "text": "Watch $MRVL",
                "created_timestamp": int(created.timestamp()),
                "likes": 10,
                "reposts": 2,
                "replies": 1,
                "replying_to": None,
                "author": {"screen_name": "aleabitoreddit"},
            },
            "aleabitoreddit",
        )
        self.assertIsNotNone(post)
        assert post is not None
        self.assertEqual(post.taipei_date.isoformat(), "2026-10-29")
        self.assertEqual(post.tickers, ["MRVL"])
        self.assertFalse(post.is_reply)

    def test_marks_replies(self) -> None:
        post = parse_post(
            {
                "type": "status",
                "id": "3",
                "url": "https://x.com/aleabitoreddit/status/3",
                "text": "@someone $LWLG",
                "created_timestamp": 1793239241,
                "replying_to": {"screen_name": "someone"},
                "author": {"screen_name": "aleabitoreddit"},
            },
            "aleabitoreddit",
        )
        self.assertIsNotNone(post)
        assert post is not None
        self.assertTrue(post.is_reply)
        self.assertEqual(post.tickers, ["LWLG"])

    def test_drops_other_authors(self) -> None:
        post = parse_post(
            {
                "type": "status",
                "id": "2",
                "url": "https://x.com/other/status/2",
                "text": "$MU",
                "created_timestamp": 1793239241,
                "author": {"screen_name": "someoneelse"},
            },
            "aleabitoreddit",
        )
        self.assertIsNone(post)


class RenderAndDatesTest(unittest.TestCase):
    def test_markdown_lists_tickers_and_disclaimer(self) -> None:
        body = render_markdown(
            date(2026, 10, 29),
            [_post("$MRVL may buy $LITE", 10)],
            "aleabitoreddit",
        )
        self.assertIn("不是投資建議", body)
        self.assertIn("| MRVL | 1 | 1 |", body)
        self.assertIn("| LITE | 1 | 1 |", body)
        self.assertIn("https://x.com/aleabitoreddit/status/2910", body)

    def test_empty_day(self) -> None:
        body = render_markdown(date(2026, 10, 28), [], "aleabitoreddit")
        self.assertIn("沒有抓到", body)

    def test_resolve_yesterday_span(self) -> None:
        days = resolve_days(date(2026, 10, 29), None, True, 2)
        self.assertEqual(days, [date(2026, 10, 27), date(2026, 10, 28)])

    def test_board_counts_mentions_and_embeds_them(self) -> None:
        posts = [
            _post("$MU $MU keeps showing up", 11),
            _post("reply $MU", 9),
        ]
        payload = build_board_payload(posts, "aleabitoreddit", date(2026, 10, 28), date(2026, 10, 29), False)
        stored = payload["posts"]
        self.assertIsInstance(stored, list)
        assert isinstance(stored, list)
        self.assertEqual(stored[0]["mentions"], {"MU": 2})
        html = render_board_html(payload)
        self.assertIn('"MU": 2', html)
        self.assertIn("提及次數", html)
        self.assertIn('<script id="board-data" type="application/json">{', html)

    def test_rejects_date_and_yesterday_together(self) -> None:
        with self.assertRaises(ValueError):
            resolve_days(date(2026, 10, 29), "2026-10-01", True, 1)


if __name__ == "__main__":
    unittest.main()
