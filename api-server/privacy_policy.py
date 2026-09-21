"""Account-owned workspaces are the default; shared catalogs contain no user work."""

import os

PRIVATE_WORKSPACES = os.environ.get("QUANTGYM_PRIVATE_WORKSPACES", "1").strip().lower() not in {"0", "false", "no", "off"}
