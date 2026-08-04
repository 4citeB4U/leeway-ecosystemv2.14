from pathlib import Path
import json


CONFIG_PATH = Path(__file__).with_name("config.json")


def load_manifest():
    with CONFIG_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)
