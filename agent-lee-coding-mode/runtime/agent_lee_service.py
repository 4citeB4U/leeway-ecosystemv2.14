"""Import-safe pywin32 loader for the canonical AgentLee service implementation.

The legacy service source remains `agent-lee-service.py` to preserve its
original bytes and behavior. pywin32 imports the PythonClass module by name,
and Python module names cannot contain hyphens. This loader is the only
translation layer: it exposes the existing AgentLeeService class unchanged.
"""

from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
import sys


LEGACY_SERVICE_PATH = Path(__file__).with_name("agent-lee-service.py")
if not LEGACY_SERVICE_PATH.is_file():
    raise ImportError(f"AGENTLEE_LEGACY_SERVICE_UNAVAILABLE: {LEGACY_SERVICE_PATH}")

_SPEC = spec_from_file_location("_leeway_agentlee_legacy_service", LEGACY_SERVICE_PATH)

if _SPEC is None or _SPEC.loader is None:
    raise ImportError(f"AGENTLEE_LEGACY_SERVICE_UNAVAILABLE: {LEGACY_SERVICE_PATH}")

_MODULE = module_from_spec(_SPEC)
sys.modules[_SPEC.name] = _MODULE
_SPEC.loader.exec_module(_MODULE)

AgentLeeService = _MODULE.AgentLeeService

__all__ = ["AgentLeeService", "LEGACY_SERVICE_PATH"]
