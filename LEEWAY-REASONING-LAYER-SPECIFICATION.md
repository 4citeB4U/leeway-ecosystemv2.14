# LeeWay Reasoning Layer Specification

**Layer**: L9 - Reasoning Layer  
**Version**: 1.0.0  
**Status**: SPECIFICATION  
**Created**: 2026-06-21

---

## Purpose

The Reasoning Layer transforms Agent Lee from a powerful architecture into a functioning, interactive agent.

**Core Question**: How do we think, decide, and plan?

---

## The Critical Gap

Today, Agent Lee can:
- ✓ Execute tasks (SEA)
- ✓ Store memory (Memory Layer)
- ✓ Follow governance (Governance Layer)
- ✓ Use tools (Tool Layer)

But Agent Lee **cannot**:
- ❌ Understand "open PowerPoint"
- ❌ Plan action sequences
- ❌ Reason about what to do
- ❌ Learn from outcomes
- ❌ Adapt strategies

**Reasoning is the missing link.**

---

## What Reasoning Does

### 1. Intent Understanding

**Input**: Natural language request

**Output**: Structured intent

**Example**:
```text
User: "Open PowerPoint"

Reasoning:
{
  "intent": "launch_application",
  "target": "PowerPoint",
  "action_type": "tool_invocation",
  "urgency": "normal",
  "context": "user_request"
}
```

---

### 2. Action Planning

**Input**: Structured intent

**Output**: Action sequence

**Example**:
```text
Intent: launch_application(PowerPoint)

Plan:
1. Query Discovery for PowerPoint location
2. Check Governance for launch permission
3. Identify required capability (tool_adapter)
4. Route through SEA
5. Execute launch
6. Verify success
7. Report to user
```

---

### 3. Decision Making

**Input**: Multiple options

**Output**: Best choice with reasoning

**Example**:
```text
Options:
- Launch PowerPoint desktop app
- Launch PowerPoint web app
- Launch PowerPoint via Office 365

Decision:
Launch desktop app

Reasoning:
- User is on Windows
- Desktop app is installed
- Fastest option
- Most features available
```

---

### 4. Problem Solving

**Input**: Obstacle or failure

**Output**: Alternative strategy

**Example**:
```text
Problem:
PowerPoint not found at expected path

Solution:
1. Query Discovery for alternate paths
2. Check recent installations
3. Search Program Files
4. If not found, offer to install
5. If user declines, suggest web version
```

---

### 5. Learning from Outcomes

**Input**: Execution result

**Output**: Updated knowledge

**Example**:
```text
Outcome:
PowerPoint launched successfully via tool_adapter

Learning:
- tool_adapter works for PowerPoint
- Increase confidence: 0.7 → 0.9
- Store successful pattern
- Update capability map
```

---

## Reasoning Architecture

```text
core/reasoning/
├── intent_parser.py          # Natural language → structured intent
├── action_planner.py         # Intent → action sequence
├── decision_engine.py        # Options → best choice
├── problem_solver.py         # Obstacle → solution
├── learning_engine.py        # Outcome → knowledge update
├── reasoning_models.py       # Data models
├── reasoning_receipts.py     # Receipt generation
└── reasoning_api.py          # Query interface
```

---

## Intent Parser

**Responsibility**: Understand what the user wants

**Input Types**:
```text
- Commands: "open PowerPoint"
- Questions: "where is SEA?"
- Requests: "show me running services"
- Complex: "create a presentation about AI and email it to John"
```

**Output Structure**:
```json
{
  "intent_type": "command|question|request|complex",
  "primary_action": "launch|query|show|create",
  "target": "PowerPoint|SEA|services|presentation",
  "modifiers": ["about AI", "email to John"],
  "confidence": 0.95,
  "ambiguity": null
}
```

**Integration**:
```python
from core.reasoning import IntentParser

parser = IntentParser()
intent = parser.parse("open PowerPoint")
```

---

## Action Planner

**Responsibility**: Convert intent into executable steps

**Planning Strategies**:
1. **Direct**: Single action
2. **Sequential**: Multiple ordered steps
3. **Conditional**: If-then branches
4. **Parallel**: Concurrent actions
5. **Iterative**: Loops with conditions

**Example Plan**:
```json
{
  "plan_id": "plan-20260621-090000",
  "intent": "launch_application(PowerPoint)",
  "strategy": "sequential",
  "steps": [
    {
      "step": 1,
      "action": "query_discovery",
      "params": {"target": "PowerPoint"},
      "required": true
    },
    {
      "step": 2,
      "action": "check_governance",
      "params": {"action": "launch_application"},
      "required": true
    },
    {
      "step": 3,
      "action": "route_to_sea",
      "params": {"task": "launch", "target": "PowerPoint"},
      "required": true
    },
    {
      "step": 4,
      "action": "verify_success",
      "params": {"timeout": 10},
      "required": false
    }
  ],
  "estimated_duration": "5s",
  "confidence": 0.9
}
```

---

## Decision Engine

**Responsibility**: Choose best option when multiple exist

**Decision Factors**:
```text
- User preferences
- System state
- Resource availability
- Success probability
- Execution cost
- Governance constraints
- Historical performance
```

**Decision Process**:
```python
from core.reasoning import DecisionEngine

engine = DecisionEngine()

options = [
    {"method": "desktop_app", "confidence": 0.9, "cost": "low"},
    {"method": "web_app", "confidence": 0.7, "cost": "medium"},
    {"method": "office365", "confidence": 0.8, "cost": "high"}
]

decision = engine.decide(options, context={"user_location": "local"})
# Returns: desktop_app with reasoning
```

---

## Problem Solver

**Responsibility**: Handle failures and obstacles

**Problem Types**:
```text
- Component not found
- Permission denied
- Resource unavailable
- Timeout
- Unexpected error
- Ambiguous input
```

**Solution Strategies**:
```text
1. Retry with backoff
2. Find alternative path
3. Request clarification
4. Escalate to user
5. Fallback to safe default
6. Learn and adapt
```

**Example**:
```python
from core.reasoning import ProblemSolver

solver = ProblemSolver()

problem = {
    "type": "component_not_found",
    "component": "PowerPoint",
    "expected_path": "C:/Program Files/Microsoft Office/PowerPoint.exe"
}

solution = solver.solve(problem)
# Returns: alternative_search_strategy with steps
```

---

## Learning Engine

**Responsibility**: Improve from experience

**Learning Types**:
```text
1. Success patterns
2. Failure patterns
3. User preferences
4. System behavior
5. Capability confidence
6. Strategy effectiveness
```

**Learning Process**:
```python
from core.reasoning import LearningEngine

engine = LearningEngine()

outcome = {
    "action": "launch_application",
    "target": "PowerPoint",
    "method": "tool_adapter",
    "result": "success",
    "duration": 2.5,
    "user_satisfaction": "high"
}

engine.learn(outcome)
# Updates: capability confidence, success patterns, preferences
```

---

## Integration with Other Layers

### Communication Layer (L11)
```text
User input
    ↓
Communication receives
    ↓
Reasoning parses intent
```

### Discovery Layer (L5)
```text
Reasoning needs component
    ↓
Query Discovery
    ↓
Get authoritative location
```

### Governance Layer (L2)
```text
Reasoning plans action
    ↓
Check Governance
    ↓
Get permission/denial
```

### Execution Layer (L8)
```text
Reasoning creates plan
    ↓
Route through SEA
    ↓
Execute steps
```

### Knowledge Layer (L4)
```text
Reasoning learns
    ↓
Store in Knowledge
    ↓
Retrieve for future decisions
```

---

## Reasoning Receipts

**Location**: `Archive/receipts/reasoning/`

**Receipt Types**:
```text
INTENT_PARSED
ACTION_PLANNED
DECISION_MADE
PROBLEM_SOLVED
LEARNING_UPDATED
```

**Example Receipt**:
```json
{
  "schema": "leeway.receipt.reasoning.v1",
  "receiptId": "reasoning-intent-20260621-090000",
  "action": "INTENT_PARSED",
  "input": "open PowerPoint",
  "intent": {
    "intent_type": "command",
    "primary_action": "launch",
    "target": "PowerPoint",
    "confidence": 0.95
  },
  "parsedAt": "2026-06-21T09:00:00Z",
  "parsedBy": "intent_parser",
  "ok": true
}
```

---

## The Complete Flow Example

**User**: "Agent Lee, open PowerPoint"

### Step 1: Intent Parsing
```json
{
  "intent": "launch_application",
  "target": "PowerPoint",
  "confidence": 0.95
}
```

### Step 2: Action Planning
```json
{
  "steps": [
    "query_discovery",
    "check_governance",
    "route_to_sea",
    "verify_success"
  ]
}
```

### Step 3: Execution
```text
Discovery: PowerPoint at C:/Program Files/.../PowerPoint.exe
Governance: APPROVED
SEA: Routing to tool_adapter
Tool: Launching...
Result: SUCCESS
```

### Step 4: Learning
```json
{
  "pattern": "launch_application via tool_adapter",
  "confidence": 0.9,
  "success_rate": 0.95
}
```

### Step 5: Response
```text
"PowerPoint opened successfully"
```

---

## Success Criteria

Reasoning Layer is complete when Agent Lee can:

1. ✓ Understand natural language commands
2. ✓ Plan multi-step actions
3. ✓ Make decisions between options
4. ✓ Solve problems when failures occur
5. ✓ Learn from outcomes
6. ✓ Adapt strategies over time
7. ✓ Handle ambiguous input
8. ✓ Request clarification when needed
9. ✓ Generate reasoning receipts
10. ✓ Integrate with all other layers

---

## Implementation Phases

### Phase 1: Intent Parser
- Natural language understanding
- Intent classification
- Confidence scoring

### Phase 2: Action Planner
- Sequential planning
- Conditional planning
- Plan validation

### Phase 3: Decision Engine
- Option evaluation
- Decision making
- Reasoning explanation

### Phase 4: Problem Solver
- Failure detection
- Solution generation
- Alternative strategies

### Phase 5: Learning Engine
- Pattern recognition
- Confidence updates
- Strategy adaptation

### Phase 6: Integration
- Connect to all layers
- End-to-end testing
- Receipt generation

---

## What This Enables

With Reasoning complete, Agent Lee can:

```text
"Open PowerPoint"           → Launches PowerPoint
"Show running services"     → Lists active services
"Close Notepad"             → Closes Notepad
"Launch Presentation Engine"→ Starts Presentation Engine
"What depends on Genesis?"  → Queries Discovery graph
"Create a report"           → Plans multi-step creation
"Fix the broken adapter"    → Diagnoses and repairs
```

Agent Lee becomes a **true agent**, not just an architecture.

---

**Status**: Specification complete, ready for implementation  
**Priority**: CRITICAL (after Discovery Layer)  
**Blocking**: True agent behavior  
**Owner**: LeeWay Core Team