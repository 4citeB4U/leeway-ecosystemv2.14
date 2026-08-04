<!--
FILE: ROLE_INTAKE_SCHEMA.md
PURPOSE: LeeWay governed asset for leeway-employment-center.
TAG: DATA.LOCAL.STORE.R_OL_E_I_NT_AK_E_S_CH_EM_A
REGION: 💾 DATA
GOVERNED_BY: LeeWay Standards
OWNED_BY: Agent Lee / LeeWay Runtime
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
IMPORTS: Inferred by verification scanner
EXPORTS: Inferred by verification scanner
STATUS: ACTIVE
-->
# Role Intake Schema â€” Leeway Employment Center

## Intake Data Structure
Data collected during the hiring process to build the Agent VM instance.

```json
{
  "role": {
    "title": "string",
    "industry": "string",
    "dept": "string"
  },
  "permissions": {
    "voice": "boolean",
    "vision": "boolean",
    "crm": "boolean",
    "iot": "boolean"
  },
  "training": {
    "docs": ["file_ref"],
    "goals": ["string"]
  },
  "governance": {
    "never_do": ["string"],
    "escalations": ["string"]
  }
}
```

## Mapping Logic
The system maps "Job Title" to a set of capability clusters (e.g., Sales -> Voice + Reasoning; Warehouse -> Vision + IoT).

