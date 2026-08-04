import sys, json
from graphify.export import to_html
from pathlib import Path
import networkx as nx

G_json = json.loads(Path('graphify-out/graph.json').read_text(encoding='utf-8'))
analysis = json.loads(Path('graphify-out/.graphify_analysis.json').read_text(encoding='utf-8'))

G = nx.node_link_graph(G_json, edges='edges')
to_html(G, analysis, 'graphify-out/graph.html', title='LeeWay IDE Knowledge Graph')
print('HTML visualization written to graphify-out/graph.html')