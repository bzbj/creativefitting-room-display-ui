#!/usr/bin/env python3
"""Build self-contained production and fixture-backed preview pages."""

import base64
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"
SRC = ROOT / "src"
DIST = ROOT / "dist"
SCENARIOS = ("available", "next", "busy", "soon", "unknown", "long")


def data_uri(path: Path, mime_type: str) -> str:
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{mime_type};base64,{encoded}"


def source_html(script: str | None = None) -> str:
    font_css = "\n".join(
        f"@font-face{{font-family:'{family}';font-style:normal;"
        f"font-weight:{weight};font-display:swap;"
        f"src:url('{data_uri(ASSETS / filename, 'font/woff2')}') format('woff2')}}"
        for family, weight, filename in (
            ("Nunito", "400 800", "Nunito-Latin.woff2"),
            ("Quicksand", "600 700", "Quicksand-Latin.woff2"),
        )
    )
    licenses = "\n\n".join(
        (ASSETS / filename).read_text()
        for filename in ("Nunito-OFL.txt", "Quicksand-OFL.txt")
    )
    replacements = {
        "{{WORDMARK_DATA}}": data_uri(
            ASSETS / "wordmark-dotted-i-solid-blue.svg", "image/svg+xml"
        ),
        "{{FONT_CSS}}": font_css,
        "{{PAGE_CSS}}": (SRC / "styles.css").read_text(),
        "{{SCRIPT}}": script if script is not None else (SRC / "app.js").read_text(),
        "{{FONT_LICENSES}}": licenses,
    }
    html = (SRC / "index.template.html").read_text()
    for marker, value in replacements.items():
        if html.count(marker) != 1:
            raise RuntimeError(f"Expected exactly one {marker} in template")
        html = html.replace(marker, value)
    return html


def configure(html: str, api_base: str) -> str:
    for old, new in (
        ('data-api-base="/api"', f'data-api-base="{api_base}"'),
        ('data-layout-report="on"', 'data-layout-report="off"'),
    ):
        if html.count(old) != 1:
            raise RuntimeError(f"Expected exactly one {old} in built HTML")
        html = html.replace(old, new, 1)
    return html


def build_studio() -> None:
    import html as html_module
    import json
    import re
    import shutil
    from urllib.parse import quote, urlencode

    source = SRC / "studio"
    output = DIST / "studio"
    output.mkdir(parents=True, exist_ok=True)
    email = json.loads((source / "email-submission.json").read_text())
    mailto = "mailto:" + email["recipient"] + "?" + urlencode({
        "subject": email["subject"], "body": "\r\n".join(email["body_lines"]),
    }, quote_via=quote)
    prompt = (source / "agent-prompt.txt").read_text().strip()
    prompt = prompt.replace("{{EMAIL_ADDRESS}}", email["recipient"]).replace("{{EMAIL_SUBJECT}}", email["subject"])
    replacements = {
        "{{AGENT_PROMPT}}": html_module.escape(prompt),
        "{{EMAIL_ADDRESS}}": html_module.escape(email["recipient"], quote=True),
        "{{EMAIL_SUBJECT}}": html_module.escape(email["subject"], quote=True),
        "{{EMAIL_MAILTO}}": html_module.escape(mailto, quote=True),
        "{{STUDIO_CSS}}": (source / "styles.css").read_text(),
        "{{STUDIO_SCRIPT}}": (source / "app.js").read_text(),
        "{{WORDMARK_DATA}}": data_uri(ASSETS / "wordmark-dotted-i-solid-blue.svg", "image/svg+xml"),
    }
    for template, filename in [("index.template.html", "index.html"), ("guide.template.html", "guide.html")]:
        html = (source / template).read_text()
        for marker, value in replacements.items():
            html = html.replace(marker, value)
        (output / filename).write_text(html)
    shell = configure(source_html((source / "shell.js").read_text()), "/rooms/studio/preview-only")
    shell = re.sub(r'<section class="question-card".*?</section>',
        '<section class="question-card" aria-label="作品区域"><div id="content-stage"></div></section>', shell, count=1, flags=re.S)
    shell = shell.replace('</style>', """
#content-stage {width:100%;height:100%;overflow:hidden;}
#content-stage iframe,#content-stage img,#content-stage video {display:block;width:100%;height:100%;border:0;}
#content-stage video {background:#111820;}
.studio-placeholder {height:100%;padding:32px;display:flex;flex-direction:column;justify-content:center;gap:25px;}
.studio-placeholder small {font-size:13px;letter-spacing:2px;color:#857843;}
.studio-placeholder strong {font-size:37px;line-height:1.4;}
.studio-placeholder span {font-size:19px;line-height:1.8;color:#8b7d4f;}
</style>""", 1)
    (output / "shell.html").write_text(shell)
    shutil.copyfile(source / "starter.html", output / "starter.html")


def build() -> Path:
    base = source_html()
    DIST.mkdir(exist_ok=True)
    (DIST / "local.html").write_text(base)
    production = DIST / "index.html"
    production.write_text(configure(base, "/meeting-room-display/api"))
    (DIST / "hub.html").write_text(configure(base, "/rooms/api"))
    menu = [
        '<!doctype html><html lang="zh-CN"><meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width,initial-scale=1">',
        '<title>会议室门牌 UI 预览</title><style>body{font:18px system-ui;padding:2rem;}',
        'a{display:block;margin:1rem 0}</style><h1>会议室门牌 UI 预览</h1>',
        '<p>以下均为动态生成的虚构数据，不连接飞书。</p>',
    ]
    labels = {
        "available": "空闲，无预约", "next": "空闲，后续有预约",
        "busy": "使用中", "soon": "即将开始", "unknown": "同步失败",
        "long": "长房间名与多场预约",
    }
    for scenario in SCENARIOS:
        output = DIST / "preview" / scenario / "index.html"
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(configure(base, f"/mock/{scenario}"))
        menu.append(f'<a href="/preview/{scenario}/">{labels[scenario]}</a>')
    menu.append('</html>')
    (DIST / "preview" / "index.html").write_text("\n".join(menu))
    build_studio()
    return production


if __name__ == "__main__":
    print(build())
