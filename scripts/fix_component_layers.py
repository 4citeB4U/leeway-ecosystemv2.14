#!/usr/bin/env python3
"""
Fix Component Layer Metadata
Add proper layer identification to all components in Discovery registry
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

from core.discovery.discovery_enforcement import DiscoveryEnforcement  # type: ignore[import-not-found]

def fix_component_layers():
    """Add layer metadata to components that are missing it"""
    
    print("=" * 60)
    print("FIXING COMPONENT LAYER METADATA")
    print("=" * 60)
    
    discovery = DiscoveryEnforcement()
    registry = discovery.registry
    
    # Define layer mappings for the 10 original components
    layer_fixes = {
        "sea-core": {
            "layer": "execution",
            "sublayer": "sea-core",
            "leeway_standard": "SEA-100Hz-deterministic"
        },
        "governance-layer": {
            "layer": "governance",
            "sublayer": "validation",
            "leeway_standard": "79-laws-8-standards"
        },
        "9e-learning-system": {
            "layer": "cognitive",
            "sublayer": "learning",
            "leeway_standard": "9E-semantic-versioning"
        },
        "identity-core": {
            "layer": "identity",
            "sublayer": "core",
            "leeway_standard": "10-immutable-laws"
        },
        "aloe-observation-engine": {
            "layer": "observation",
            "sublayer": "system-state",
            "leeway_standard": "ALOE-monitor-state"
        },
        "desktop-runtime": {
            "layer": "runtime",
            "sublayer": "desktop-server",
            "leeway_standard": "consent-enforcement"
        },
        "agent-lee-router": {
            "layer": "routing",
            "sublayer": "model-router",
            "leeway_standard": "lane-management"
        },
        "command-brain": {
            "layer": "orchestration",
            "sublayer": "command-orchestration",
            "leeway_standard": "voice-law-compliant"
        },
        "discovery-kernel": {
            "layer": "discovery",
            "sublayer": "topology-registry",
            "leeway_standard": "discovery-enforcement"
        },
        "agent-lee-runtime-service": {
            "layer": "runtime",
            "sublayer": "service-persistence",
            "leeway_standard": "24-7-persistence"
        }
    }
    
    fixed_count = 0
    
    for component_id, layer_data in layer_fixes.items():
        if component_id in registry["components"]:
            component = registry["components"][component_id]
            
            # Add layer metadata if missing
            if "layer" not in component.get("metadata", {}):
                if "metadata" not in component:
                    component["metadata"] = {}
                
                component["metadata"].update(layer_data)
                fixed_count += 1
                print(f"  [FIXED] {component_id}: layer={layer_data['layer']}, sublayer={layer_data['sublayer']}")
    
    # Save updated registry
    registry["updated_at"] = datetime.utcnow().isoformat()
    discovery._save_registry()
    
    print(f"\n[OK] Fixed {fixed_count} components")
    
    # Generate updated report
    print("\n" + "=" * 60)
    print("UPDATED COMPONENT LAYER DISTRIBUTION")
    print("=" * 60)
    
    layers = {}
    for comp_id, comp_data in registry["components"].items():
        layer = comp_data.get("metadata", {}).get("layer", "unknown")
        layers[layer] = layers.get(layer, 0) + 1
    
    print(f"\nTotal components: {len(registry['components'])}")
    print(f"Total capabilities: {len(registry['capabilities'])}")
    print("\nComponents by layer:")
    for layer, count in sorted(layers.items()):
        print(f"  {layer}: {count}")
    
    if layers.get("unknown", 0) > 0:
        print(f"\n[WARNING] Still have {layers['unknown']} unknown components!")
        print("Listing unknown components:")
        for comp_id, comp_data in registry["components"].items():
            if comp_data.get("metadata", {}).get("layer", "unknown") == "unknown":
                print(f"  - {comp_id}")
    else:
        print("\n[SUCCESS] All components have proper layer identification!")

def main():
    try:
        fix_component_layers()
        return 0
    except Exception as e:
        print(f"\n[FAIL] Layer fix failed: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(main())

# Made with Bob
