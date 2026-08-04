"""Helper to enable GEC writes by setting an approval token.

Usage:
  python scripts/enable_gec_writes.py --token <TOKEN> [--file-approve]

If --file-approve is provided, the token is also written to
`agent-lee-coding-mode/config/gec_approval.token` so processes can read it.
"""
import os
import json
import argparse

ROOT = os.path.join(os.getcwd(), "agent-lee-coding-mode")
CONFIG_PATH = os.path.join(ROOT, "config", "gec_config.json")
APPROVAL_FILE = os.path.join(os.path.dirname(CONFIG_PATH), "gec_approval.token")


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--token", required=True)
    p.add_argument("--file-approve", action="store_true")
    args = p.parse_args()

    token = args.token
    if not os.path.exists(os.path.dirname(CONFIG_PATH)):
        os.makedirs(os.path.dirname(CONFIG_PATH), exist_ok=True)

    cfg = {"write_enabled": True, "approval_token": token}
    with open(CONFIG_PATH, "w", encoding="utf-8") as fh:
        json.dump(cfg, fh, indent=2)

    if args.file_approve:
        with open(APPROVAL_FILE, "w", encoding="utf-8") as fh:
            fh.write(token)

    print("GEC config written:", CONFIG_PATH)


if __name__ == "__main__":
    main()
