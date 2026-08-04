#!/usr/bin/env python3
"""
Register newly created modules with Discovery
Phase 6 continuation - register observation, action, and orchestration modules
"""

import json
import sys
import os
from pathlib import Path
from datetime import datetime

# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    os.system('chcp 65001 > nul')
    try:
        sys.stdout.reconfigure(encoding='utf-8')  # type: ignore[attr-defined]
    except AttributeError:
        pass  # Fallback for older Python versions

# Add core to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.discovery.discovery_enforcement import DiscoveryEnforcement

def register_observation_modules():
    """Register observation layer modules"""
    print("\n[OBSERVATION LAYER REGISTRATION]")
    
    discovery = DiscoveryEnforcement()
    
    # ALOE Screen Capture
    discovery.register_component(
        component_id="aloe-screen-capture",
        component_type="observation",
        capabilities=[
            "screen-capture",
            "screenshot-save"
        ],
        location="agent-lee-coding-mode/observation-engine/modules/ALOE-Screen.psm1",
        metadata={
            "name": "ALOE Screen Capture",
            "version": "1.0.0",
            "module_type": "PowerShell",
            "layer": "observation",
            "sublayer": "screen-vision"
        }
    )
    print("  [OK] Registered: ALOE Screen Capture")
    
    # ALOE OCR
    discovery.register_component(
        component_id="aloe-ocr",
        component_type="observation",
        capabilities=[
            "ocr-text-extraction",
            "ocr-region-extraction"
        ],
        location="agent-lee-coding-mode/observation-engine/modules/ALOE-OCR.psm1",
        metadata={
            "name": "ALOE OCR",
            "version": "1.0.0",
            "module_type": "PowerShell",
            "layer": "observation",
            "sublayer": "screen-vision",
            "requires": "Windows.Media.Ocr"
        }
    )
    print("  [OK] Registered: ALOE OCR")
    
    # ALOE Window Detection
    discovery.register_component(
        component_id="aloe-window-detection",
        component_type="observation",
        capabilities=[
            "window-list",
            "window-focus-detection",
            "window-bounds"
        ],
        location="agent-lee-coding-mode/observation-engine/modules/ALOE-Window.psm1",
        metadata={
            "name": "ALOE Window Detection",
            "version": "1.0.0",
            "module_type": "PowerShell",
            "layer": "observation",
            "sublayer": "screen-vision"
        }
    )
    print("  [OK] Registered: ALOE Window Detection")

def register_action_modules():
    """Register action layer modules"""
    print("\n[ACTION LAYER REGISTRATION]")
    
    discovery = DiscoveryEnforcement()
    
    # Mouse Controller
    discovery.register_component(
        component_id="mouse-controller",
        component_type="action",
        capabilities=[
            "mouse-move",
            "mouse-click",
            "mouse-drag"
        ],
        location="core/action/mouse_controller.py",
        metadata={
            "name": "Mouse Controller",
            "version": "1.0.0",
            "module_type": "Python",
            "layer": "action",
            "sublayer": "desktop-control",
            "requires": "pyautogui"
        }
    )
    print("  [OK] Registered: Mouse Controller")
    
    # Keyboard Controller
    discovery.register_component(
        component_id="keyboard-controller",
        component_type="action",
        capabilities=[
            "keyboard-type",
            "keyboard-hotkey",
            "keyboard-press"
        ],
        location="core/action/keyboard_controller.py",
        metadata={
            "name": "Keyboard Controller",
            "version": "1.0.0",
            "module_type": "Python",
            "layer": "action",
            "sublayer": "desktop-control",
            "requires": "pyautogui"
        }
    )
    print("  [OK] Registered: Keyboard Controller")
    
    # Application Launcher
    discovery.register_component(
        component_id="app-launcher",
        component_type="action",
        capabilities=[
            "app-launch",
            "app-launch-verify"
        ],
        location="core/action/app_launcher.py",
        metadata={
            "name": "Application Launcher",
            "version": "1.0.0",
            "module_type": "Python",
            "layer": "action",
            "sublayer": "desktop-control"
        }
    )
    print("  [OK] Registered: Application Launcher")

def register_orchestration_modules():
    """Register orchestration layer modules"""
    print("\n[ORCHESTRATION LAYER REGISTRATION]")
    
    discovery = DiscoveryEnforcement()
    
    # Goal Parser
    discovery.register_component(
        component_id="goal-parser",
        component_type="orchestration",
        capabilities=[
            "goal-parse",
            "goal-validate"
        ],
        location="core/orchestration/goal_parser.py",
        metadata={
            "name": "Goal Parser",
            "version": "1.0.0",
            "module_type": "Python",
            "layer": "orchestration",
            "sublayer": "autonomous-loop"
        }
    )
    print("  [OK] Registered: Goal Parser")
    
    # Action Planner
    discovery.register_component(
        component_id="action-planner",
        component_type="orchestration",
        capabilities=[
            "action-plan",
            "action-plan-optimize"
        ],
        location="core/orchestration/action_planner.py",
        metadata={
            "name": "Action Planner",
            "version": "1.0.0",
            "module_type": "Python",
            "layer": "orchestration",
            "sublayer": "autonomous-loop"
        }
    )
    print("  [OK] Registered: Action Planner")
    
    # Execution Orchestrator
    discovery.register_component(
        component_id="execution-orchestrator",
        component_type="orchestration",
        capabilities=[
            "action-execute",
            "action-monitor"
        ],
        location="core/orchestration/execution_orchestrator.py",
        metadata={
            "name": "Execution Orchestrator",
            "version": "1.0.0",
            "module_type": "Python",
            "layer": "orchestration",
            "sublayer": "autonomous-loop"
        }
    )
    print("  [OK] Registered: Execution Orchestrator")
    
    # Result Verifier
    discovery.register_component(
        component_id="result-verifier",
        component_type="orchestration",
        capabilities=[
            "result-verify",
            "result-compare"
        ],
        location="core/orchestration/result_verifier.py",
        metadata={
            "name": "Result Verifier",
            "version": "1.0.0",
            "module_type": "Python",
            "layer": "orchestration",
            "sublayer": "autonomous-loop"
        }
    )
    print("  [OK] Registered: Result Verifier")
    
    # Failure Recovery
    discovery.register_component(
        component_id="failure-recovery",
        component_type="orchestration",
        capabilities=[
            "failure-detect",
            "failure-recover"
        ],
        location="core/orchestration/failure_recovery.py",
        metadata={
            "name": "Failure Recovery",
            "version": "1.0.0",
            "module_type": "Python",
            "layer": "orchestration",
            "sublayer": "autonomous-loop"
        }
    )
    print("  [OK] Registered: Failure Recovery")

def generate_registration_report():
    """Generate registration report"""
    discovery = DiscoveryEnforcement()
    registry = discovery.registry
    
    print("\n" + "="*60)
    print("NEW MODULE REGISTRATION COMPLETE")
    print("="*60)
    
    # Count by layer
    layers = {}
    for comp_id, comp_data in registry["components"].items():
        layer = comp_data.get("metadata", {}).get("layer", "unknown")
        layers[layer] = layers.get(layer, 0) + 1
    
    print(f"\nTotal components: {len(registry['components'])}")
    print(f"Total capabilities: {len(registry['capabilities'])}")
    print("\nComponents by layer:")
    for layer, count in sorted(layers.items()):
        print(f"  {layer}: {count}")
    
    # New modules
    print("\nNewly registered modules:")
    print("  [Observation]")
    print("    - ALOE Screen Capture")
    print("    - ALOE OCR")
    print("    - ALOE Window Detection")
    print("  [Action]")
    print("    - Mouse Controller")
    print("    - Keyboard Controller")
    print("    - Application Launcher")
    print("  [Orchestration]")
    print("    - Goal Parser")
    print("    - Action Planner")
    print("    - Execution Orchestrator")
    print("    - Result Verifier")
    print("    - Failure Recovery")
    
    print(f"\nRegistry updated: {registry.get('updated_at', registry.get('created_at', 'unknown'))}")

def main():
    print("="*60)
    print("REGISTERING NEW MODULES WITH DISCOVERY")
    print("="*60)
    
    try:
        register_observation_modules()
        register_action_modules()
        register_orchestration_modules()
        generate_registration_report()
        
        print("\n[SUCCESS] All new modules registered successfully")
        return 0
        
    except Exception as e:
        print(f"\n[FAIL] Registration failed: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(main())

# Made with Bob
