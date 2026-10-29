#!/usr/bin/env python3
"""整理 @aleabitoreddit 公開貼文，輸出可開啟的提及網頁。

資料來自 FxEmbed 的公開時間軸介面，對應 X 上已經公開的貼文。
這支程式只統計代號出現次數，不判斷買賣，也不是投資建議。
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

TAIPEI = ZoneInfo("Asia/Taipei")
API_URL = "https://api.fxtwitter.com/2/profile/{handle}/statuses"
USER_AGENT = "serenity-daily-digest/1.0 (personal research; +https://x.com/aleabitoreddit)"
TICKER_RE = re.compile(
    r"\$([A-Za-z]{1,12}(?:\.[A-Za-z]{1,4})?|\d{4,6}\.[A-Za-z]{1,4})"
)


@dataclass(frozen=True)
class Post:
    id: str
    url: str
    text: str
    created: datetime
    likes: int
    reposts: int
    replies: int
    is_reply: bool
    author: str

    @property
    def tickers(self) -> list[str]:
        return extract_tickers(self.text)

    @property
    def taipei_date(self) -> date:
        return self.created.astimezone(TAIPEI).date()


def ticker_counts(text: str) -> dict[str, int]:
    counts: dict[str, int] = {}
    for match in TICKER_RE.finditer(text):
        ticker = match.group(1).upper()
        counts[ticker] = counts.get(ticker, 0) + 1
    return counts


def extract_tickers(text: str) -> list[str]:
    return list(ticker_counts(text))


def parse_post(item: dict[str, object], handle: str) -> Post | None:
    if item.get("type") != "status":
        return None
    timestamp = item.get("created_timestamp")
    if not isinstance(timestamp, (int, float)):
        return None
    author = item.get("author")
    screen_name = ""
    if isinstance(author, dict):
        raw_name = author.get("screen_name")
        if isinstance(raw_name, str):
            screen_name = raw_name
    if screen_name.lower() != handle.lower():
        return None
    text = item.get("text")
    if not isinstance(text, str) or not text.strip():
        return None
    post_id = item.get("id")
    url = item.get("url")
    if not isinstance(post_id, str) or not isinstance(url, str):
        return None
    created = datetime.fromtimestamp(timestamp, tz=timezone.utc).astimezone(TAIPEI)
    return Post(
        id=post_id,
        url=url,
        text=text.strip(),
        created=created,
        likes=_as_int(item.get("likes")),
        reposts=_as_int(item.get("reposts")),
        replies=_as_int(item.get("replies")),
        is_reply=item.get("replying_to") not in (None, "", {}),
        author=screen_name,
    )


def _as_int(value: object) -> int:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return 0
    return int(value)


def fetch_page(handle: str, cursor: str | None, timeout: float) -> tuple[list[dict[str, object]], str | None]:
    params: dict[str, str] = {"count": "50", "with_replies": "1"}
    if cursor:
        params["cursor"] = cursor
    url = API_URL.format(handle=urllib.parse.quote(handle))
    query = urllib.parse.urlencode(params)
    request = urllib.request.Request(
        f"{url}?{query}",
        headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            if response.status == 204:
                return [], None
            payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        if error.code == 204:
            return [], None
        detail = error.read().decode("utf-8", errors="replace")[:300]
        raise RuntimeError(f"時間軸請求失敗（HTTP {error.code}）：{detail}") from error
    except urllib.error.URLError as error:
        raise RuntimeError(f"連線失敗：{error.reason}") from error

    if not isinstance(payload, dict):
        raise RuntimeError("時間軸回應不是 JSON 物件")
    code = payload.get("code")
    if code not in (200, None):
        message = payload.get("message") or "未知錯誤"
        raise RuntimeError(f"時間軸回應代碼 {code}：{message}")
    raw_results = payload.get("results")
    results = [item for item in raw_results if isinstance(item, dict)] if isinstance(raw_results, list) else []
    raw_cursor = payload.get("cursor")
    bottom = raw_cursor.get("bottom") if isinstance(raw_cursor, dict) else None
    next_cursor = bottom if isinstance(bottom, str) and bottom else None
    return results, next_cursor


def collect_posts(
    handle: str,
    start: datetime,
    end: datetime,
    max_pages: int,
    timeout: float,
) -> tuple[list[Post], bool]:
    cursor: str | None = None
    seen: set[str] = set()
    collected: list[Post] = []
    truncated = False
    for index in range(max_pages):
        page, cursor = fetch_page(handle, cursor, timeout)
        if not page:
            break
        page_posts: list[Post] = []
        for item in page:
            post = parse_post(item, handle)
            if post is None or post.id in seen:
                continue
            seen.add(post.id)
            page_posts.append(post)
            if start <= post.created < end:
                collected.append(post)
        reached_older = bool(page_posts) and all(post.created < start for post in page_posts)
        if reached_older or cursor is None:
            break
        if index == max_pages - 1:
            truncated = True
            break
        time.sleep(0.4)
    collected.sort(key=lambda post: post.created, reverse=True)
    return collected, truncated


def day_window(day: date) -> tuple[datetime, datetime]:
    start = datetime(day.year, day.month, day.day, tzinfo=TAIPEI)
    return start, start + timedelta(days=1)


def render_markdown(day: date, posts: list[Post], handle: str) -> str:
    lines = [
        f"# Serenity 每日整理 {day.isoformat()}（台北）",
        "",
        f"帳號：[@{handle}](https://x.com/{handle})",
        "",
        "這份整理只收錄當天公開貼文裡的股票代號與原文節錄，方便回看。",
        "它不是投資建議。作者本人可能持有或交易文中提到的股票，立場以原始貼文為準。",
        "",
        f"- 貼文數：{len(posts)}",
        f"- 有提到代號的貼文：{sum(1 for post in posts if post.tickers)}",
        "",
    ]
    if not posts:
        lines.extend(
            [
                "這一天沒有抓到該帳號的公開貼文。",
                "",
                "可能是當天沒有發文，或公開時間軸介面暫時沒有回傳。",
                "",
            ]
        )
        return "\n".join(lines)

    ticker_posts: dict[str, list[Post]] = {}
    for post in posts:
        for ticker in post.tickers:
            ticker_posts.setdefault(ticker, []).append(post)

    lines.extend(["## 代號一覽", ""])
    if not ticker_posts:
        lines.append("今天的貼文沒有 `$` 代號。")
        lines.append("")
    else:
        lines.append("| 代號 | 提及次數 | 貼文數 | 最新一則 |")
        lines.append("| --- | ---: | ---: | --- |")
        ranked = sorted(
            ticker_posts.items(),
            key=lambda item: (
                -sum(ticker_counts(post.text).get(item[0], 0) for post in item[1]),
                item[0],
            ),
        )
        for ticker, mentions in ranked:
            latest = mentions[0]
            hits = sum(ticker_counts(post.text).get(ticker, 0) for post in mentions)
            stamp = latest.created.strftime("%H:%M")
            lines.append(f"| {ticker} | {hits} | {len(mentions)} | [{stamp}]({latest.url}) |")
        lines.append("")

    lines.extend(["## 貼文", ""])
    for post in posts:
        stamp = post.created.strftime("%H:%M")
        kind = "回覆" if post.is_reply else "貼文"
        ticker_label = "、".join(post.tickers) if post.tickers else "無代號"
        lines.append(f"### {stamp} {kind} · {ticker_label}")
        lines.append("")
        lines.append(f"[原文]({post.url}) · 喜歡 {post.likes} · 轉發 {post.reposts} · 回覆 {post.replies}")
        lines.append("")
        for paragraph in post.text.splitlines() or [post.text]:
            lines.append(f"> {paragraph}" if paragraph else ">")
        lines.append("")
    return "\n".join(lines)


def posts_to_json(day: date, posts: list[Post], handle: str) -> dict[str, object]:
    return {
        "date": day.isoformat(),
        "timezone": "Asia/Taipei",
        "handle": handle,
        "post_count": len(posts),
        "posts": [
            {
                "id": post.id,
                "url": post.url,
                "created_at_taipei": post.created.isoformat(),
                "is_reply": post.is_reply,
                "tickers": post.tickers,
                "likes": post.likes,
                "reposts": post.reposts,
                "replies": post.replies,
                "text": post.text,
            }
            for post in posts
        ],
    }


def write_day(out_dir: Path, day: date, posts: list[Post], handle: str) -> tuple[Path, Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    markdown_path = out_dir / f"{day.isoformat()}.md"
    json_path = out_dir / f"{day.isoformat()}.json"
    markdown_path.write_text(render_markdown(day, posts, handle), encoding="utf-8")
    json_path.write_text(
        json.dumps(posts_to_json(day, posts, handle), ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return markdown_path, json_path


def build_board_payload(
    posts: list[Post],
    handle: str,
    start_day: date,
    end_day: date,
    truncated: bool,
) -> dict[str, object]:
    dates: list[str] = []
    cursor = end_day
    while cursor >= start_day:
        dates.append(cursor.isoformat())
        cursor -= timedelta(days=1)
    return {
        "handle": handle,
        "timezone": "Asia/Taipei",
        "generated_at": datetime.now(TAIPEI).isoformat(timespec="minutes"),
        "start": start_day.isoformat(),
        "end": end_day.isoformat(),
        "dates": dates,
        "truncated": truncated,
        "posts": [
            {
                "id": post.id,
                "url": post.url,
                "created_at": post.created.strftime("%Y-%m-%d %H:%M"),
                "date": post.taipei_date.isoformat(),
                "is_reply": post.is_reply,
                "mentions": ticker_counts(post.text),
                "text": post.text,
            }
            for post in posts
        ],
    }


def render_board_html(payload: dict[str, object]) -> str:
    template_path = Path(__file__).resolve().with_name("board_template.html")
    template = template_path.read_text(encoding="utf-8")
    marker = '<script id="board-data" type="application/json"></script>'
    if marker not in template:
        raise RuntimeError("網頁模板缺少資料標記")
    blob = json.dumps(payload, ensure_ascii=False).replace("<", "\\u003c")
    filled = marker.replace("></script>", ">" + blob + "</script>")
    return template.replace(marker, filled, 1)


def resolve_days(today: date, explicit: str | None, yesterday: bool, span: int) -> list[date]:
    if explicit and yesterday:
        raise ValueError("不能同時指定日期與「昨天」。")
    if span < 1:
        raise ValueError("天數至少為 1。")
    if explicit:
        end_day = date.fromisoformat(explicit)
    elif yesterday:
        end_day = today - timedelta(days=1)
    else:
        end_day = today
    return [end_day - timedelta(days=offset) for offset in range(span - 1, -1, -1)]


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="依台北日期整理 Serenity 的公開貼文。")
    parser.add_argument("--handle", default="aleabitoreddit", help="X 帳號，預設 aleabitoreddit")
    parser.add_argument("--date", help="台北日期 YYYY-MM-DD。預設為今天。")
    parser.add_argument("--yesterday", action="store_true", help="改整理昨天（台北）")
    parser.add_argument("--days", type=int, default=14, help="從結束日往前幾個台北日，預設 14")
    parser.add_argument(
        "--out",
        type=Path,
        default=Path(__file__).resolve().parent / "reports",
        help="輸出目錄",
    )
    parser.add_argument("--max-pages", type=int, default=40, help="最多翻幾頁時間軸")
    parser.add_argument("--timeout", type=float, default=30.0, help="單次請求逾時秒數")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        days = resolve_days(datetime.now(TAIPEI).date(), args.date, args.yesterday, args.days)
    except ValueError as error:
        print(error, file=sys.stderr)
        return 2
    if args.max_pages < 1:
        print("頁數至少為 1。", file=sys.stderr)
        return 2

    start, _ = day_window(days[0])
    _, end = day_window(days[-1])
    print(f"正在抓取 {days[0].isoformat()} 至 {days[-1].isoformat()}（台北）的公開貼文…")
    try:
        posts, truncated = collect_posts(args.handle, start, end, args.max_pages, args.timeout)
    except RuntimeError as error:
        print(error, file=sys.stderr)
        return 1
    if truncated:
        print("警告：已達頁數上限，較早的貼文沒有收進來。可加大 --max-pages。", file=sys.stderr)

    by_day: dict[date, list[Post]] = {day: [] for day in days}
    for post in posts:
        bucket = by_day.get(post.taipei_date)
        if bucket is not None:
            bucket.append(post)

    for day in days:
        markdown_path, _json_path = write_day(args.out, day, by_day[day], args.handle)
        print(f"{day.isoformat()} 貼文 {len(by_day[day])} → {markdown_path}")

    board_path = args.out / "index.html"
    payload = build_board_payload(posts, args.handle, days[0], days[-1], truncated)
    board_path.write_text(render_board_html(payload), encoding="utf-8")
    print(f"網頁 → {board_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
