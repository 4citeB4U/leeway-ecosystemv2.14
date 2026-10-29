"""Regression checks for the import-safe AgentLee pywin32 loader."""

import importlib
import importlib.util
import json
from pathlib import Path
import hashlib
import sys
import tempfile
import unittest


RUNTIME = Path(__file__).resolve().parent
sys.path.insert(0, str(RUNTIME))


class AgentLeeServiceLoaderTest(unittest.TestCase):
    def test_loader_exposes_the_legacy_service_class(self):
        loader = importlib.import_module("agent_lee_service")
        self.assertEqual(loader.LEGACY_SERVICE_PATH, RUNTIME / "agent-lee-service.py")
        self.assertTrue(loader.LEGACY_SERVICE_PATH.is_file())
        self.assertEqual(loader.AgentLeeService.__name__, "AgentLeeService")
        self.assertEqual(loader.AgentLeeService._svc_name_, "AgentLee")

    def test_loader_fails_closed_when_legacy_source_is_absent(self):
        with tempfile.TemporaryDirectory() as directory:
            candidate = Path(directory) / "agent_lee_service.py"
            candidate.write_text((RUNTIME / "agent_lee_service.py").read_text(encoding="utf-8"), encoding="utf-8")
            spec = importlib.util.spec_from_file_location("isolated_agentlee_loader", candidate)
            module = importlib.util.module_from_spec(spec)
            with self.assertRaisesRegex(ImportError, "AGENTLEE_LEGACY_SERVICE_UNAVAILABLE"):
                spec.loader.exec_module(module)

    def test_source_manifest_pins_both_modules_and_remains_non_authorizing(self):
        manifest = json.loads((RUNTIME / "agent-lee-service-loader.manifest.json").read_text(encoding="utf-8"))
        legacy_hash = hashlib.sha256((RUNTIME / "agent-lee-service.py").read_bytes()).hexdigest().upper()
        loader_hash = hashlib.sha256((RUNTIME / "agent_lee_service.py").read_bytes()).hexdigest().upper()
        self.assertEqual(manifest["legacy"]["sha256"], legacy_hash)
        self.assertEqual(manifest["loader"]["sha256"], loader_hash)
        self.assertEqual(manifest["loader"]["pythonClass"], "agent_lee_service.AgentLeeService")
        self.assertFalse(manifest["production"]["deploymentAuthorized"])


if __name__ == "__main__":
    unittest.main()
