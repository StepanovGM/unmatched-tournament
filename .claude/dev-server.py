"""Local dev server for previewing the static site — same as
`python -m http.server`, but with caching disabled so the preview
always reflects the latest edits. Not part of the deployed site."""

import functools
import http.server
import sys


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8123
    directory = sys.argv[2] if len(sys.argv) > 2 else None
    handler_class = functools.partial(NoCacheHandler, directory=directory) if directory else NoCacheHandler
    http.server.test(HandlerClass=handler_class, port=port)
