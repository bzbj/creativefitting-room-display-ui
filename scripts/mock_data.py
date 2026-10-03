"""Synthetic room snapshots for frontend preview only."""

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo


SCENARIOS = {"available", "next", "busy", "soon", "unknown", "long"}


def make_snapshot(scenario: str, now: datetime | None = None, room_number: int = 1) -> dict:
    if scenario not in SCENARIOS:
        raise ValueError(f"Unknown preview scenario: {scenario}")
    if type(room_number) is not int or room_number < 1:
        raise ValueError("room_number must be a positive integer")
    now = now or datetime.now(ZoneInfo("Asia/Shanghai"))
    if now.tzinfo is None or now.utcoffset() is None:
        raise ValueError("now must include a timezone")

    def interval(start_minutes: int, end_minutes: int) -> dict:
        return {
            "start": (now + timedelta(minutes=start_minutes)).isoformat(),
            "end": (now + timedelta(minutes=end_minutes)).isoformat(),
        }

    events = {
        "available": [],
        "next": [interval(90, 150), interval(210, 270)],
        "busy": [interval(-20, 40), interval(120, 180)],
        "soon": [interval(5, 65), interval(140, 200)],
        "unknown": [],
        "long": [interval(-10, 50), interval(85, 145), interval(220, 280)],
    }[scenario]
    fresh = scenario != "unknown"
    return {
        "source": "demo",
        "fresh": fresh,
        "max_age_seconds": 630,
        "room": {
            "name": ("示例会议室 · 超长名称排版检查" if scenario == "long" else "示例会议室")
                    + (f" {room_number}" if room_number != 1 else ""),
            "capacity": 6,
            "enabled": True,
        },
        "fetched_at": (now if fresh else now - timedelta(minutes=20)).isoformat(),
        "last_attempt_at": now.isoformat(),
        "error": None if fresh else "预览：同步失败",
        "events": events,
    }
