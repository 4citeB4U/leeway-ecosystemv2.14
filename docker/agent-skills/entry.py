# REGION: LeeWay existing skills runtime integration
# TAG: LEEWAY-SKILLS-ENTRY-V1
# WHO: Agent Lee; WHAT: attach read-only canonical authority to existing app.
# WHY: preserve legacy API while exposing pinned instructions.
# WHERE: existing container; WHEN: startup; HOW: FastAPI route installation.
# ROLE: operator. LICENSE: MIT.
from legacy_app import app
from authority_projection import install
install(app)

