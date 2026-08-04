const fs = require('fs');
const path = require('path');

const MAP_PATH = path.join(__dirname, 'ecosystem-map.json');
const OUTPUT_DIR = path.join(__dirname, 'generated');

function loadMap() {
  return JSON.parse(fs.readFileSync(MAP_PATH, 'utf-8'));
}

function statusColor(status) {
  const colors = {
    'PLANNED': '#9CA3AF',
    'DEFINED': '#6B7280',
    'MOCK_VALIDATED': '#60A5FA',
    'CONFIGURED': '#818CF8',
    'DISCOVERED': '#A78BFA',
    'CONNECTED': '#34D399',
    'AUTHENTICATED': '#10B981',
    'LIVE_READ_ONLY': '#22C55E',
    'LIVE_WRITE_BOUNDED': '#16A34A',
    'UI_INTEGRATED': '#15803D',
    'END_TO_END_VALIDATED': '#166534',
    'PORTABLE_VALIDATED': '#14532D',
    'PRODUCTION_READY': '#047857',
    'DEGRADED': '#F59E0B',
    'BLOCKED': '#EF4444',
    'DEPRECATED': '#6B7280',
    'RECOVERY_PRESERVED': '#F97316',
    'UNKNOWN': '#9CA3AF'
  };
  return colors[status] || '#9CA3AF';
}

function categoryStyle(category) {
  const styles = {
    'standards': 'fill:#1E3A8A,color:#FFFFFF,stroke:#3B82F6,stroke-width:2px',
    'runtime': 'fill:#064E3B,color:#FFFFFF,stroke:#10B981,stroke-width:2px',
    'agent': 'fill:#4C1D95,color:#FFFFFF,stroke:#8B5CF6,stroke-width:2px',
    'ide': 'fill:#1E40AF,color:#FFFFFF,stroke:#3B82F6,stroke-width:2px',
    'contract': 'fill:#1E3A5F,color:#FFFFFF,stroke:#60A5FA,stroke-width:1px',
    'gateway': 'fill:#78350F,color:#FFFFFF,stroke:#F59E0B,stroke-width:2px',
    'tool': 'fill:#374151,color:#FFFFFF,stroke:#6B7280,stroke-width:1px',
    'migration': 'fill:#14532D,color:#FFFFFF,stroke:#22C55E,stroke-width:1px',
    'archive': 'fill:#451A03,color:#FFFFFF,stroke:#F97316,stroke-width:1px',
    'engine': 'fill:#0F766E,color:#FFFFFF,stroke:#14B8A6,stroke-width:2px'
  };
  return styles[category] || 'fill:#374151,color:#FFFFFF,stroke:#6B7280,stroke-width:1px';
}

function generateSubgraph(nodes, parentId) {
  const children = nodes.filter(n => n.parentId === parentId);
  if (children.length === 0) return '';

  let output = '';
  for (const child of children) {
    const grandChildren = nodes.filter(n => n.parentId === child.id);
    if (grandChildren.length > 0) {
      const subgraphContent = generateSubgraph(nodes, child.id);
      output += `\n  subgraph ${child.id}[${child.name}]\n    ${subgraphContent}  end\n`;
    } else {
      const label = `${child.name}\\n[${child.status}]`;
      output += `    ${child.id}(${label})\n`;
    }
  }
  return output;
}

function generateFullGraph() {
  const map = loadMap();
  const { nodes, relationships } = map;

  let output = '---\ntitle: LeeWay Ecosystem Map\n---\n';
  output += 'graph TB\n';

  // Style definitions
  output += '  %% Category style definitions\n';
  const categories = [...new Set(nodes.map(n => n.category))];
  for (const cat of categories) {
    const style = categoryStyle(cat);
    output += `  classDef ${cat} ${style}\n`;
  }

  // Status style definitions
  output += '\n  %% Status color definitions\n';
  const statuses = [...new Set(nodes.map(n => n.status))];
  for (const st of statuses) {
    const color = statusColor(st);
    output += `  classDef status-${st.replace(/_/g, '-')} fill:${color},color:#FFFFFF\n`;
  }

  output += '\n  %% Root-level nodes\n';
  // Top-level nodes (no parent)
  const rootNodes = nodes.filter(n => !n.parentId && n.category !== 'migration');
  for (const node of rootNodes) {
    const label = `${node.name}\\n[${node.status}]\\n${node.category}`;
    output += `  ${node.id}(${label})\n`;
  }

  output += '\n  %% Migration chain\n';
  const migrations = nodes.filter(n => n.category === 'migration');
  for (const mig of migrations) {
    const label = `${mig.name}\\n[${mig.status}]`;
    output += `  ${mig.id}(${label})\n`;
  }

  output += '\n  %% Relationships\n';
  for (const rel of relationships) {
    const existsFrom = nodes.find(n => n.id === rel.from);
    const existsTo = nodes.find(n => n.id === rel.to);
    if (existsFrom && existsTo) {
      const arrow = rel.direction === 'bidirectional' ? '<===>' : '===>';
      output += `  ${rel.from} ${arrow}|${rel.type}| ${rel.to}\n`;
    }
  }

  // Apply styles
  output += '\n  %% Apply category styles\n';
  for (const node of nodes) {
    output += `  class ${node.id} ${node.category};\n`;
  }

  return output;
}

function generateClusterGraph() {
  const map = loadMap();
  const { nodes, relationships } = map;

  let output = '---\ntitle: LeeWay Ecosystem Map (Clustered)\n---\n';
  output += 'graph TB\n';

  // Category style definitions
  const categories = [...new Set(nodes.map(n => n.category))];
  for (const cat of categories) {
    const style = categoryStyle(cat);
    output += `  classDef ${cat} ${style}\n`;
  }

  // Group nodes by category into subgraphs
  for (const cat of categories) {
    const catNodes = nodes.filter(n => n.category === cat && !n.parentId);
    if (catNodes.length === 0) continue;

    output += `\n  subgraph ${cat}_group[${cat.toUpperCase()}]\n`;
    for (const node of catNodes) {
      const label = `${node.name}\\n[${node.status}]`;
      output += `    ${node.id}(${label})\n`;
    }
    output += '  end\n';
  }

  // Relationships
  output += '\n  %% Relationships\n';
  for (const rel of relationships) {
    const arrow = rel.direction === 'bidirectional' ? '<===>' : '===>';
    output += `  ${rel.from} ${arrow}|${rel.type}| ${rel.to}\n`;
  }

  // Apply styles
  for (const node of nodes) {
    output += `  class ${node.id} ${node.category};\n`;
  }

  return output;
}

function generateDetailedGraph() {
  const map = loadMap();
  const { nodes, relationships } = map;

  let output = '---\ntitle: LeeWay Ecosystem Map (Detailed)\n---\n';
  output += 'graph TB\n';

  // Category style definitions
  const categories = [...new Set(nodes.map(n => n.category))];
  for (const cat of categories) {
    const style = categoryStyle(cat);
    output += `  classDef ${cat} ${style}\n`;
  }

  // All nodes with detailed labels
  for (const node of nodes) {
    const label = `${node.name}\\n[${node.status}]\\n${node.category}\\nTL:${node.truthLevel}`;
    output += `  ${node.id}(${label})\n`;
  }

  // All relationships
  for (const rel of relationships) {
    const arrow = rel.direction === 'bidirectional' ? '<===>' : '===>';
    output += `  ${rel.from} ${arrow}|${rel.type}| ${rel.to}\n`;
  }

  // Apply styles
  for (const node of nodes) {
    output += `  class ${node.id} ${node.category};\n`;
  }

  return output;
}

function writeOutput(name, content) {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  const filePath = path.join(OUTPUT_DIR, `${name}.mmd`);
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`Wrote ${filePath} (${content.length} bytes)`);
}

// Generate all three diagram variants
writeOutput('ecosystem-map-simple', generateFullGraph());
writeOutput('ecosystem-map-clustered', generateClusterGraph());
writeOutput('ecosystem-map-detailed', generateDetailedGraph());

console.log('\nMermaid diagram generation complete.');
console.log('To render: use mermaid-cli or paste into https://mermaid.live');
