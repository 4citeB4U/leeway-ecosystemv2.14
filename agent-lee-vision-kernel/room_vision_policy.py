POLICY = {
    "noUnknownPersonNaming": True,
    "noProtectedTraitInference": True,
    "allowedDescriptions": [
        "objects",
        "lighting",
        "screen state",
        "non-sensitive posture",
        "location in room without identity"
    ],
    "blockedDescriptions": [
        "race",
        "gender identity",
        "age",
        "disability",
        "health",
        "emotion",
        "real-world identity"
    ]
}


def get_policy():
    return POLICY
