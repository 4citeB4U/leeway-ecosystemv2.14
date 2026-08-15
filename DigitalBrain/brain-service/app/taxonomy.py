"""LeeWay Digital Brain taxonomy: hemisphere/region/cluster assignment.

Left hemisphere (ecosystem) territories:
    governance, development, applications, infrastructure, runtime-services,
    agents, skills-mcp, models, memory-evidence

Right hemisphere (user) territories:
    profile, conversations, projects, documents, creations, communication,
    media, memory, tasks, history
"""

LEFT_REGIONS = [
    "governance",
    "development",
    "applications",
    "infrastructure",
    "runtime-services",
    "agents",
    "skills-mcp",
    "models",
    "memory-evidence",
]

RIGHT_REGIONS = [
    "profile",
    "conversations",
    "projects",
    "documents",
    "creations",
    "communication",
    "media",
    "memory",
    "tasks",
    "history",
]

_REGION_LABELS = {
    "governance": "Governance",
    "development": "Development",
    "applications": "Applications",
    "infrastructure": "Infrastructure",
    "runtime-services": "Runtime / Services",
    "agents": "Agents",
    "skills-mcp": "Skills / MCPs",
    "models": "Models",
    "memory-evidence": "Memory & Evidence",
    "profile": "Profile",
    "conversations": "Conversations",
    "projects": "Projects",
    "documents": "Documents",
    "creations": "Creations",
    "communication": "Communication",
    "media": "Media",
    "memory": "Memory",
    "tasks": "Tasks",
    "history": "History",
}

_CAP_REGION_KEYWORDS = [
    ("model", "models"),
    ("llm", "models"),
    ("vision", "models"),
    ("voice", "models"),
    ("stt", "models"),
    ("tts", "models"),
    ("embed", "models"),
    ("agent", "agents"),
    ("skill", "skills-mcp"),
    ("mcp", "skills-mcp"),
    ("tool", "skills-mcp"),
    ("govern", "governance"),
    ("policy", "governance"),
    ("contract", "governance"),
    ("approval", "governance"),
    ("dev", "development"),
    ("code", "development"),
    ("build", "development"),
    ("test", "development"),
    ("debug", "development"),
    ("runtime", "runtime-services"),
    ("route", "runtime-services"),
    ("router", "runtime-services"),
    ("fabric", "runtime-services"),
    ("service", "runtime-services"),
    ("infra", "infrastructure"),
    ("docker", "infrastructure"),
    ("network", "infrastructure"),
    ("container", "infrastructure"),
    ("browser", "applications"),
    ("desktop", "applications"),
    ("ide", "applications"),
    ("camera", "applications"),
    ("screen", "applications"),
    ("memory", "memory-evidence"),
    ("evidence", "memory-evidence"),
    ("receipt", "memory-evidence"),
    ("proof", "memory-evidence"),
    ("ledger", "memory-evidence"),
]

_RUNTIME_SUBTYPE_REGION = [
    ("ide", "applications"),
    ("forgejo", "applications"),
    ("cerebral-ui", "applications"),
    ("desktop-runtime", "applications"),
    ("browser", "applications"),
    ("ollama", "infrastructure"),
    ("turbo", "runtime-services"),
    ("adapter", "runtime-services"),
    ("router", "runtime-services"),
    ("agent-lee", "agents"),
    ("fabric", "runtime-services"),
    ("digital-brain", "runtime-services"),
    ("cerebral", "runtime-services"),
]


def region_label(region):
    return _REGION_LABELS.get(region, region.replace("-", " ").title())


def _matches(text, keywords):
    t = text.lower()
    for kw, region in keywords:
        if kw in t:
            return region
    return None


def capability_region(capability_id, lane="", capability_type=""):
    text = " ".join([str(capability_id or ""), str(lane or ""), str(capability_type or "")])
    region = _matches(text, _CAP_REGION_KEYWORDS)
    return region or "applications"


def runtime_region(service_name, subtype=""):
    text = " ".join([str(service_name or ""), str(subtype or "")])
    region = _matches(text, _RUNTIME_SUBTYPE_REGION)
    return region or "runtime-services"


def note_region(source_path):
    """Vault folder heuristics: projects/creations/docs folders -> territories."""
    rel = str(source_path or "").replace("\\", "/").lower()
    if "project" in rel:
        return "projects"
    if "creation" in rel or "create" in rel or "art" in rel:
        return "creations"
    if "conversation" in rel or "chat" in rel:
        return "conversations"
    if "media" in rel or "image" in rel or "audio" in rel:
        return "media"
    if "task" in rel or "todo" in rel:
        return "tasks"
    return "documents"


def assign(node):
    """Return (hemisphere, region, cluster) for a node dict."""
    domain = node.get("domain") or ""
    node_type = node.get("type") or ""
    subtype = node.get("subtype") or ""
    node_id = node.get("id") or ""
    tags = node.get("tags_json") or ""
    metadata = node.get("metadata_json") or ""
    lane = ""
    if isinstance(metadata, dict):
        lane = metadata.get("lane") or metadata.get("capabilityType") or ""

    if domain in ("user", "user-data"):
        if node_type == "preference":
            return ("right", "profile", "preferences")
        if node_type == "task":
            return ("right", "tasks", "work-ledger")
        if node_type == "history":
            return ("right", "history", "ledger")
        if node_type == "conversation":
            return ("right", "conversations", "chats")
        if node_type == "note":
            return ("right", note_region(node.get("source_path")), "notes")
        return ("right", "documents", "notes")

    if domain == "system":
        return ("left", runtime_region(node_id, subtype), "services")

    if domain == "evidence":
        return ("left", "memory-evidence", "evidence")

    if node_type in ("standard", "law", "contract"):
        return ("left", "governance", node_type + "s")
    if node_type == "skill":
        return ("left", "skills-mcp", "skills")
    if node_type == "capability":
        region = capability_region(node_id, lane, subtype)
        cluster = lane or subtype or "capabilities"
        return ("left", region, cluster)
    if node_type == "model":
        return ("left", "models", "local-fabric")
    if node_type in ("evidence", "receipt", "ledger", "proof"):
        return ("left", "memory-evidence", "evidence")
    return ("left", "applications", "core")