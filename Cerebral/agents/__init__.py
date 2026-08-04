"""
Cerebral Agent Registry
========================
Four sovereign agents, each with a declared tool manifest.

Import pattern:
    from agents import SentinelAgent, NavigatorAgent, CodeScoutAgent, ArchivistAgent
    result = SentinelAgent().run("health_snapshot", {})
"""

from agents.sentinel_agent  import SentinelAgent
from agents.navigator_agent import NavigatorAgent
from agents.code_scout_agent import CodeScoutAgent
from agents.archivist_agent  import ArchivistAgent

AGENT_REGISTRY = {
    "sentinel":  SentinelAgent,
    "navigator": NavigatorAgent,
    "code_scout": CodeScoutAgent,
    "archivist": ArchivistAgent,
}

def get_agent(name: str):
    cls = AGENT_REGISTRY.get(name)
    if cls is None:
        raise ValueError(f"Unknown agent: {name!r}. Available: {list(AGENT_REGISTRY)}")
    return cls()

__all__ = ["SentinelAgent", "NavigatorAgent", "CodeScoutAgent", "ArchivistAgent",
           "AGENT_REGISTRY", "get_agent"]
