#!/usr/bin/env python3
"""Verify that /sitemap/ contains exactly published webpages and posts."""
from __future__ import annotations

import json
import os
import re
from html import unescape
from html.parser import HTMLParser
from pathlib import Path

import requests


def load_env_file() -> None:
    for candidate in [Path(".env"), Path.home() / ".hermes" / "secrets" / "commercialdailynews.env"]:
        if not candidate.exists():
            continue
        for line in candidate.read_text(errors="ignore").splitlines():
            if "=" not in line or line.strip().startswith("#"):
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_env_file()
SITE = os.environ.get("SITE_URL", "https://www.commercialdailynews.com").rstrip("/")
CLIENT_ID = os.environ.get("NEXT_PUBLIC_TINA_CLIENT_ID", "").strip()
BRANCH = os.environ.get("NEXT_PUBLIC_TINA_BRANCH") or os.environ.get("TINA_BRANCH") or "main"
TOKEN = os.environ.get("TINA_TOKEN", "").strip()
if not CLIENT_ID or not TOKEN:
    raise SystemExit("NEXT_PUBLIC_TINA_CLIENT_ID and TINA_TOKEN are required.")
TINA_URL = f"https://content.tinajs.io/2.4/content/{CLIENT_ID}/github/{BRANCH}"
QUERY = """
query SitemapEntries {
  pageConnection { edges { node { title permalink draft seo { metaTitle noindex } _sys { filename } } } }
  blogConnection { edges { node { title permalink draft seo { metaTitle noindex } _sys { filename } } } }
}
"""


def normalize(value: object) -> str:
    return re.sub(r"\s+", " ", unescape(str(value or ""))).strip()


def with_slash(value: str) -> str:
    if not value or value == "/":
        return "/"
    value = value if value.startswith("/") else "/" + value
    return value if value.endswith("/") else value + "/"


def page_url(node: dict) -> str:
    filename = node.get("_sys", {}).get("filename") or ""
    return "/" if filename == "home" else with_slash(node.get("permalink") or filename)


def post_url(node: dict) -> str:
    return with_slash(node.get("permalink") or node.get("_sys", {}).get("filename") or "")


class SitemapContentParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.depth = 0
        self.links: list[tuple[str, str]] = []
        self.headings: list[str] = []
        self._href: str | None = None
        self._link_text: list[str] = []
        self._heading_text: list[str] | None = None
        self.meta: dict[str, str] = {}
        self.title_text = ""
        self._in_title = False

    def handle_starttag(self, tag, attrs):
        attr = dict(attrs)
        if self.depth:
            self.depth += 1
        elif "data-sitemap-content" in attr:
            self.depth = 1
        if tag == "title":
            self._in_title = True
        if tag == "meta":
            key, content = attr.get("name") or attr.get("property"), attr.get("content")
            if key and content:
                self.meta[str(key)] = str(content)
        if self.depth and tag == "a" and attr.get("href"):
            self._href, self._link_text = attr["href"], []
        if self.depth and tag == "h2":
            self._heading_text = []

    def handle_endtag(self, tag):
        if tag == "a" and self._href:
            self.links.append((with_slash(self._href), normalize("".join(self._link_text))))
            self._href, self._link_text = None, []
        if tag == "h2" and self._heading_text is not None:
            self.headings.append(normalize("".join(self._heading_text)))
            self._heading_text = None
        if tag == "title":
            self._in_title = False
        if self.depth:
            self.depth -= 1

    def handle_data(self, data):
        if self._href:
            self._link_text.append(data)
        if self._heading_text is not None:
            self._heading_text.append(data)
        if self._in_title:
            self.title_text += data


def tina_query() -> dict:
    response = requests.post(
        TINA_URL,
        json={"query": QUERY},
        headers={"content-type": "application/json", "X-API-KEY": TOKEN, "User-Agent": "HermesSitemapVerify"},
        timeout=30,
    )
    response.raise_for_status()
    payload = response.json()
    if payload.get("errors"):
        raise RuntimeError(json.dumps(payload["errors"], indent=2))
    return payload["data"]


def main() -> int:
    data = tina_query()
    pages = [edge["node"] for edge in data.get("pageConnection", {}).get("edges", []) if edge.get("node")]
    posts = [edge["node"] for edge in data.get("blogConnection", {}).get("edges", []) if edge.get("node")]
    expected_pages = [
        (page_url(node), normalize(node.get("title") or node.get("seo", {}).get("metaTitle") or node.get("_sys", {}).get("filename")))
        for node in pages
        if not node.get("draft") and not node.get("seo", {}).get("noindex") and node.get("_sys", {}).get("filename") not in {"404", "sitemap"}
    ]
    expected_posts = [
        (post_url(node), normalize(node.get("title") or node.get("seo", {}).get("metaTitle") or node.get("_sys", {}).get("filename")))
        for node in posts
        if not node.get("draft") and not node.get("seo", {}).get("noindex")
    ]
    expected = expected_pages + expected_posts

    response = requests.get(
        f"{SITE}/sitemap/?v=sitemap-page-post-only",
        headers={"Cache-Control": "no-cache", "User-Agent": "Mozilla/5.0 HermesSitemapVerify/2.0"},
        timeout=30,
    )
    response.raise_for_status()
    parser = SitemapContentParser()
    parser.feed(response.text)
    failures: list[str] = []
    if parser.headings != ["Pages", "Posts"]:
        failures.append(f"sitemap headings must be exactly Pages, Posts; got {parser.headings!r}")
    if parser.links != expected:
        failures.append(f"sitemap content links must exactly equal published page/post tuples; expected={expected!r} actual={parser.links!r}")
    if len(set(parser.links)) != len(parser.links):
        failures.append("sitemap content contains duplicate links")
    if normalize(parser.title_text) != "Sitemap | Commercial Daily News":
        failures.append(f"bad title: {parser.title_text!r}")
    if parser.meta.get("description") != "Browse public webpages and posts published by Commercial Daily News.":
        failures.append("bad sitemap meta description")

    print("BACKEND_PAGE_COUNT", len(expected_pages))
    print("BACKEND_POST_COUNT", len(expected_posts))
    print("SITEMAP_CONTENT_LINK_COUNT", len(parser.links))
    if failures:
        print("SITEMAP_DYNAMIC_OK False")
        for failure in failures:
            print("FAIL", failure)
        return 1
    print("SITEMAP_DYNAMIC_OK True")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
