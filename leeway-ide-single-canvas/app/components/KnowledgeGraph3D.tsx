'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import * as d3 from 'd3';
import { forceSimulation, forceZ } from 'd3-force-3d';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface NodeData {
  id: string;
  name: string;
  category: string;
  fabricLayer?: string;
  status: string;
  truthLevel: string;
  health: string;
  description?: string;
  contracts?: string[];
  capabilities?: string[];
  dependencies?: string[];
  dependents?: string[];
  containers?: string[];
  ports?: number[];
  evidence?: string[];
  knownGaps?: string[];
  nextMigration?: string;
  deploymentTargets?: string[];
  executionModes?: string[];
  lastVerifiedUtc?: string;
  color?: string;
  opacity?: number;
  securityStatus?: string;
  trustBoundary?: string;
  authenticationRequired?: boolean;
  authorizationModel?: string;
  roles?: string[];
  riskClass?: string;
  securityConfidence?: string;
  securityEvidence?: string[];
  val?: number;
  x?: number;
  y?: number;
  z?: number;
}

interface LinkData {
  source: string;
  target: string;
  type: string;
  color?: string;
  width?: number;
}

interface GraphData {
  nodes: NodeData[];
  links: LinkData[];
  views?: any[];
  knowledgeProviders?: any[];
  timeMachine?: any;
  metadata?: any;
}

const CATEGORY_COLORS: Record<string, string> = {
  'standards': '#06b6d4',
  'fabric-layer': '#3b82f6',
  'runtime': '#22c55e',
  'agent': '#a855f7',
  'knowledge': '#f59e0b',
  'presentation': '#ec4899',
  'contract': '#6366f1',
  'gateway': '#f97316',
  'tool': '#6b7280',
  'migration': '#22c55e',
  'archive': '#a855f7',
  'engine': '#14b8a6',
  'ide': '#0ea5e9',
  'provider': '#eab308',
};

const STATUS_COLORS: Record<string, string> = {
  'PRODUCTION_READY': '#047857',
  'END_TO_END_VALIDATED': '#166534',
  'PORTABLE_VALIDATED': '#14532d',
  'UI_INTEGRATED': '#15803d',
  'LIVE_WRITE_BOUNDED': '#16a34a',
  'LIVE_READ_ONLY': '#22c55e',
  'AUTHENTICATED': '#10b981',
  'CONNECTED': '#34d399',
  'DISCOVERED': '#a78bfa',
  'CONFIGURED': '#818cf8',
  'DISCOVERING': '#93c5fd',
  'DEFINED': '#6b7280',
  'PLANNED': '#9ca3af',
  'MOCK_VALIDATED': '#60a5fa',
  'BLOCKED': '#ef4444',
  'DEGRADED': '#f59e0b',
  'DEPRECATED': '#6b7280',
  'RECOVERY_PRESERVED': '#f97316',
  'UNKNOWN': '#9ca3af',
};

const FABRIC_LAYER_Z: Record<string, number> = {
  'Layer 1': -800, 'Layer 2': -700, 'Layer 3': -600, 'Layer 4': -500, 'Layer 5': -400,
  'Layer 6': -300, 'Layer 7': -200, 'Layer 8': -100, 'Layer 9': 0,
  'Layer 10': 100, 'Layer 11': 200, 'Layer 12': 300, 'Layer 13': 300,
  'Layer 14': 500, 'Layer 15': 600, 'Cross-layer': 0,
};

const SECURITY_STATUS_COLORS: Record<string, string> = {
  'DIRECTLY_ENFORCED': '#059669',
  'INHERITED_ENFORCEMENT': '#10b981',
  'POLICY_DECLARED': '#3b82f6',
  'PARTIALLY_ENFORCED': '#f59e0b',
  'NOT_PROVEN': '#ef4444',
  'UNKNOWN': '#6b7280',
  'BLOCKED': '#dc2626',
  'NOT_APPLICABLE': '#9ca3af',
};

const TRUST_BOUNDARY_COLORS: Record<string, string> = {
  'leeway-standards': '#06b6d4',
  'zta-perimeter': '#3b82f6',
  'runtime-fabric': '#22c55e',
  'api-gateway': '#f97316',
  'docker-network': '#6366f1',
  'external-provider': '#a855f7',
  'browser-context': '#ec4899',
  'unclassified': '#6b7280',
};

export function KnowledgeGraph3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [graphData, setGraphData] = useState<any>(null);
  const [currentView, setCurrentView] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [showPanel, setShowPanel] = useState(false);
  const [timeMachineIndex, setTimeMachineIndex] = useState<number>(0);
  const [nodeCount, setNodeCount] = useState(0);
  const [linkCount, setLinkCount] = useState(0);
  const [securityOverlay, setSecurityOverlay] = useState(false);
  const [securityFilter, setSecurityFilter] = useState<string>('all');
  const [trustBoundaryFilter, setTrustBoundaryFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');

  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<any>(null);
  const simulationRef = useRef<any>(null);
  const nodeObjectsRef = useRef<Map<string, THREE.Group>>(new Map());
  const linkObjectsRef = useRef<THREE.Line[]>([]);
  const animationFrameRef = useRef<number>(0);
  const isPausedRef = useRef(false);
  const currentViewRef = useRef<string | null>(null);
  const visualizeRef = useRef<(() => void) | null>(null);

  // Store nodes and links in refs for onTick access
  const nodesRef = useRef<any[]>([]);
  const linksRef = useRef<any[]>([]);

  // Fetch graph data
  useEffect(() => {
    async function loadGraphData() {
      try {
        const resp = await fetch('/api/leeway/map-data');
        const data = await resp.json();
        setGraphData(data);
        if (data.views && data.views.length > 0) {
          const defaultView = data.views.find((v: any) => v.default) || data.views[0];
          setCurrentView(defaultView.id);
        }
      } catch (err) {
        console.error('Failed to load graph data:', err);
      }
    }
    loadGraphData();
  }, []);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current || !graphData) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    renderer.setClearColor(0x050812, 1);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 10000);
    camera.position.set(0, 300, 800);
    cameraRef.current = camera;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 20;
    controls.maxDistance = 2000;
    controls.enablePan = true;
    controls.enableRotate = true;
    controls.enableZoom = true;
    controls.rotateSpeed = 0.5;
    controls.zoomSpeed = 1.2;
    controls.panSpeed = 0.8;
    controlsRef.current = controls;

    // Lights
    scene.add(new THREE.AmbientLight(0x888888, Math.PI));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6 * Math.PI);
    dirLight.position.set(100, 200, 100);
    scene.add(dirLight);

    // Load graph data into Three.js
    if (graphData) {
      createGraphVisualization();
    }

    // Animation loop
    let animationFrame = 0;
    let isPaused = false;

    function animate() {
      if (!isPaused) {
        animationFrame = requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      }
    }
    animate();

    // Handle resize
    function onResize() {
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', onResize);

    // Node click handler
    function onNodeClick(event: MouseEvent) {
      const rect = renderer.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);

      // Check intersections with node objects
      const nodeMeshes: THREE.Object3D[] = [];
      nodeObjectsRef.current.forEach((obj) => {
        obj.traverse((child) => {
          if (child instanceof THREE.Mesh) nodeMeshes.push(child);
        });
      });

      const intersects = raycaster.intersectObjects(nodeMeshes, true);
      if (intersects.length > 0) {
        let group = intersects[0].object;
        while (group.parent && !group.userData.nodeData) {
          group = group.parent;
        }
        if (group.userData.nodeData) {
          onNodeClickHandler(group.userData.nodeData);
        }
      }
    }
    renderer.domElement.addEventListener('click', onNodeClick);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrame);
      renderer.domElement.removeEventListener('click', onNodeClick);
      window.removeEventListener('resize', onResize);
      container.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [graphData]);

  // Create graph visualization
  const createGraphVisualization = () => {
    if (!graphData || !sceneRef.current || !cameraRef.current) return;

    const scene = sceneRef.current;
    const camera = cameraRef.current;

    // Clear existing objects
    nodeObjectsRef.current.forEach((obj) => scene.remove(obj));
    linkObjectsRef.current.forEach((line) => scene.remove(line));
    nodeObjectsRef.current.clear();
    linkObjectsRef.current = [];

    // Apply view filter using ref for latest value
    const viewId = currentViewRef.current;
    let filtered = viewId
      ? applyView(graphData, viewId)
      : { nodes: graphData.nodes, relationships: graphData.relationships };

    // Apply security filters when overlay is active
    if (securityOverlay && (securityFilter !== 'all' || trustBoundaryFilter !== 'all' || riskFilter !== 'all')) {
      filtered = {
        nodes: filtered.nodes.filter((n: any) => {
          if (securityFilter === 'GAP' && n.securityStatus !== 'NOT_PROVEN' && n.securityStatus !== 'UNKNOWN') return false;
          if (securityFilter !== 'all' && securityFilter !== 'GAP' && n.securityStatus !== securityFilter) return false;
          if (trustBoundaryFilter !== 'all' && n.trustBoundary !== trustBoundaryFilter) return false;
          if (riskFilter !== 'all' && n.riskClass !== riskFilter) return false;
          return true;
        }),
        relationships: filtered.relationships,
      };
      const fsIds = new Set(filtered.nodes.map((n: any) => n.id));
      filtered.relationships = filtered.relationships.filter((r: any) => fsIds.has(r.from) && fsIds.has(r.to));
    }

    // Prepare nodes and links for d3-force-3d
    const nodes = filtered.nodes.map((n: any) => ({
      id: n.id,
      name: n.name,
      val: getNodeSize(n),
      color: CATEGORY_COLORS[n.category] || '#6b7280',
      opacity: getNodeOpacity(n),
      node: n,
      x: (Math.random() - 0.5) * 100,
      y: (Math.random() - 0.5) * 100,
      z: getNodeZ(n) + (Math.random() - 0.5) * 50,
    }));

    const links = filtered.relationships.map((l: any) => ({
      source: l.from,
      target: l.to,
      type: l.type,
      color: securityOverlay && l.securityStatus ? (SECURITY_STATUS_COLORS[l.securityStatus] || '#475569') : getLinkColor(l),
      width: getLinkWidth(l),
      securityStatus: l.securityStatus,
    }));

// Store nodes and links in refs for onTick access
    nodesRef.current = nodes;
    linksRef.current = links;

    // Initialize d3-force-3d simulation
    const simulation = forceSimulation()
      .nodes(nodes)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(80).strength(0.3))
      .force('charge', d3.forceManyBody().strength(-800).distanceMax(400))
      .force('center', d3.forceCenter(0, 0).strength(0.05))
      .force('collision', d3.forceCollide().radius((d: any) => d.val + 4).strength(0.8))
      .force('z', forceZ((d: any) => getNodeZ(d.node)).strength(0.15))
      .alphaDecay(0.02)
      .velocityDecay(0.4)
      .on('tick', onTick);

    simulation.stop();
    for (let i = 0; i < 100; i++) simulation.tick();
    simulationRef.current = simulation;

    // Create Three.js objects for nodes
    nodes.forEach((node: any) => {
      const group = createNodeObject(node);
      group.position.set(node.x, node.y, node.z);
      scene.add(group);
      nodeObjectsRef.current.set(node.id, group);
      node.__threeObj = group;
    });

    // Create Three.js objects for links
    links.forEach((link: any) => {
      const sourceObj = nodeObjectsRef.current.get(link.source);
      const targetObj = nodeObjectsRef.current.get(link.target);
      if (sourceObj && targetObj) {
        const points = [
          new THREE.Vector3(sourceObj.position.x, sourceObj.position.y, sourceObj.position.z),
          new THREE.Vector3(targetObj.position.x, targetObj.position.y, targetObj.position.z),
        ];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
          color: link.color,
          transparent: true,
          opacity: 0.6,
          depthWrite: false,
        });
        const line = new THREE.Line(geometry, material);
        line.userData = { link, sourceObj, targetObj };
        scene.add(line);
        linkObjectsRef.current.push(line);
        link.__lineObj = line;
      }
    });

    // Update counts
    setNodeCount(nodes.length);
    setLinkCount(links.length);

    // Initial camera position
    camera.position.set(0, 300, 800);
    camera.lookAt(0, 0, 0);

    // Store reference for external calls
    visualizeRef.current = createGraphVisualization;
  };

  const onTick = () => {
    // Update node positions
    nodesRef.current.forEach((node: any) => {
      const obj = nodeObjectsRef.current.get(node.id);
      if (obj) {
        obj.position.x = node.x;
        obj.position.y = node.y;
        obj.position.z = node.z;
      }
    });

    // Update link positions
    linkObjectsRef.current.forEach((line) => {
      const { sourceObj, targetObj } = line.userData;
      if (sourceObj && targetObj) {
        const positions = line.geometry.attributes.position.array;
        positions[0] = sourceObj.position.x;
        positions[1] = sourceObj.position.y;
        positions[2] = sourceObj.position.z;
        positions[3] = targetObj.position.x;
        positions[4] = targetObj.position.y;
        positions[5] = targetObj.position.z;
        line.geometry.attributes.position.needsUpdate = true;
      }
    });
  };

  // Helper functions
  function getNodeZ(node: any) {
    if (node.fabricLayer && FABRIC_LAYER_Z[node.fabricLayer] !== undefined) {
      return FABRIC_LAYER_Z[node.fabricLayer];
    }
    const catZ: Record<string, number> = {
      'standards': -800, 'fabric-layer': -600, 'runtime': -400,
      'agent': -200, 'knowledge': 0, 'presentation': 200,
      'contract': -500, 'gateway': -300, 'tool': -100,
      'migration': 300, 'archive': 500, 'engine': 100,
      'ide': 100, 'provider': 200,
    };
    return catZ[node.category] || 0;
  }

  function getNodeSize(node: any) {
    if (node.fabricLayer) return 8;
    if (node.parentId) return 5;
    if (node.category === 'standards') return 14;
    if (['runtime', 'agent', 'knowledge', 'presentation'].includes(node.category)) return 10;
    return 6;
  }

  function getNodeColor(node: any) {
    return CATEGORY_COLORS[node.category] || '#6b7280';
  }

  function getNodeOpacity(node: any) {
    return ['LIVE_READ_ONLY','LIVE_WRITE_BOUNDED','END_TO_END_VALIDATED','PRODUCTION_READY'].includes(node.status) ? 1.0 : 0.6;
  }

  function getLinkColor(link: any) {
    if (link.type === 'governs') return '#3b82f6';
    if (link.type === 'feeds') return '#22c55e';
    if (link.type === 'contains') return '#6366f1';
    if (link.type === 'triggers' || link.type === 'precedes') return '#22c55e';
    if (link.type === 'uses') return '#f59e0b';
    if (link.type === 'serves') return '#06b6d4';
    if (link.type === 'monitors') return '#ec4899';
    if (link.type === 'parallel-to') return '#a855f7';
    if (link.type === 'connects') return '#f97316';
    return '#475569';
  }

  function getLinkWidth(link: any) {
    if (['governs','contains','triggers','precedes'].includes(link.type)) return 2.5;
    if (['feeds','serves','uses','connects'].includes(link.type)) return 2;
    return 1.5;
  }

  function applyView(data: any, viewId: string) {
    const view = data.views?.find((v: any) => v.id === viewId);
    if (!view) return { nodes: data.nodes, relationships: data.relationships };

    let filteredNodes = [...data.nodes];
    const nf = view.nodeFilter || {};

    if (nf.categories?.length) filteredNodes = filteredNodes.filter((n: any) => nf.categories.includes(n.category));
    if (nf.fabricLayers?.length) filteredNodes = filteredNodes.filter((n: any) => nf.fabricLayers.includes(n.fabricLayer));
    if (nf.statuses?.length) filteredNodes = filteredNodes.filter((n: any) => nf.statuses.includes(n.status));
    if (nf.includeIds?.length) filteredNodes = filteredNodes.filter((n: any) => nf.includeIds.includes(n.id));
    if (nf.excludeIds?.length) filteredNodes = filteredNodes.filter((n: any) => !nf.excludeIds.includes(n.id));

    const nodeIds = new Set(filteredNodes.map((n: any) => n.id));
    let filteredRels = [...data.relationships];
    const rf = view.relationshipFilter || {};

    if (rf.types?.length) filteredRels = filteredRels.filter((r: any) => rf.types.includes(r.type));
    if (rf.excludeTypes?.length) filteredRels = filteredRels.filter((r: any) => !rf.excludeTypes.includes(r.type));
    filteredRels = filteredRels.filter((r: any) => nodeIds.has(r.from) && nodeIds.has(r.to));

    return { nodes: filteredNodes, relationships: filteredRels };
  }

  function createNodeObject(node: any) {
    const group = new THREE.Group();
    const nodeData = node.node || node;

    // Main sphere
    const geometry = new THREE.SphereGeometry(node.val * 0.8, 24, 24);
    const material = new THREE.MeshBasicMaterial({
      color: node.color,
      transparent: true,
      opacity: node.opacity,
      depthWrite: false,
    });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.renderOrder = 1;
    group.add(sphere);

    // Security status ring (hidden by default, shown when overlay is active)
    const secRingMaterial = new THREE.LineBasicMaterial({
      color: SECURITY_STATUS_COLORS[nodeData.securityStatus] || '#6b7280',
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const secRingPoints = [];
    const ringRadius = node.val * 1.6;
    for (let i = 0; i <= 32; i++) {
      const theta = (i / 32) * Math.PI * 2;
      secRingPoints.push(new THREE.Vector3(Math.cos(theta) * ringRadius, Math.sin(theta) * ringRadius, 0));
    }
    const secRingGeo = new THREE.BufferGeometry().setFromPoints(secRingPoints);
    const secRing = new THREE.Line(secRingGeo, secRingMaterial);
    secRing.renderOrder = 3;
    secRing.visible = securityOverlay;
    secRingMaterial.opacity = securityOverlay ? 0.8 : 0;
    secRing.name = 'securityRing';
    group.add(secRing);

    // Glow halo
    const glowGeometry = new THREE.SphereGeometry(node.val * 1.4, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: node.color,
      transparent: true,
      opacity: 0.15,
      depthWrite: false,
      side: THREE.BackSide,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.renderOrder = 0;
    group.add(glow);

    // Pulse animation for live nodes
    if (node.opacity === 1.0) {
      let phase = Math.random() * Math.PI * 2;
      const animate = () => {
        if (!group.parent) return;
        phase += 0.03;
        const scale = 1 + Math.sin(phase) * 0.15;
        glow.scale.setScalar(scale);
        glowMaterial.opacity = 0.1 + Math.sin(phase) * 0.05;
        requestAnimationFrame(animate);
      };
      animate();
    }

    // Label sprite
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = 128; canvas.height = 32;
    ctx.font = 'bold 14px "Segoe UI", sans-serif';
    ctx.fillStyle = '#e2e8f0';
    ctx.textAlign = 'center';
    ctx.fillText(node.name.length > 18 ? node.name.substring(0,16)+'…' : node.name, 64, 20);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      sizeAttenuation: false,
    });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(node.val * 12, node.val * 3, 1);
    sprite.position.set(0, node.val * 1.8, 0);
    sprite.renderOrder = 2;
    group.add(sprite);

    group.position.set(node.x, node.y, node.z);
    group.userData.nodeData = node;
    return group;
  }

  // Event handlers
  const onNodeClickHandler = (node: any) => {
    setSelectedNode(node);
    setShowPanel(true);
    // Focus camera on node
    const obj = nodeObjectsRef.current.get(node.id);
    if (obj && cameraRef.current) {
      const target = new THREE.Vector3(obj.position.x, obj.position.y, obj.position.z);
      const distance = Math.max(node.val * 25, 120);
      const startPos = cameraRef.current!.position.clone();
      const endPos = new THREE.Vector3(
        target.x + distance * 0.5,
        target.y + distance * 0.3,
        target.z + distance
      );
      animateCamera(startPos, endPos, target, 1000);
    }
  };

  const animateCamera = (start: THREE.Vector3, end: THREE.Vector3, target: THREE.Vector3, duration: number) => {
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      if (cameraRef.current) {
        cameraRef.current.position.x = start.x + (end.x - start.x) * eased;
        cameraRef.current.position.y = start.y + (end.y - start.y) * eased;
        cameraRef.current.position.z = start.z + (end.z - start.z) * eased;
        cameraRef.current.lookAt(target);
      }

      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  };

  const resetCamera = () => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(0, 300, 800);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  };

  // Toggle security overlay visibility
  useEffect(() => {
    nodeObjectsRef.current.forEach((group) => {
      group.traverse((child) => {
        if (child.name === 'securityRing' && child instanceof THREE.Line) {
          const mat = child.material as THREE.LineBasicMaterial;
          child.visible = securityOverlay;
          mat.opacity = securityOverlay ? 0.8 : 0;
        }
      });
    });
    // Update link colors when overlay toggles
    linkObjectsRef.current.forEach((line) => {
      const lineMat = line.material as THREE.LineBasicMaterial;
      if (line.userData.link && securityOverlay) {
        const relSec = line.userData.link.securityStatus;
        const secColor = relSec ? (SECURITY_STATUS_COLORS[relSec] || '#475569') : '#475569';
        lineMat.color.setHex(parseInt(secColor.replace('#', ''), 16));
        lineMat.opacity = relSec ? 0.8 : 0.6;
      } else if (line.userData.link) {
        lineMat.color.setHex(parseInt((line.userData.link.color || '#475569').replace('#', ''), 16));
        lineMat.opacity = 0.6;
      }
    });
  }, [securityOverlay]);

  // Rebuild visualization when security filters change
  useEffect(() => {
    if (visualizeRef.current && sceneRef.current) {
      visualizeRef.current();
    }
  }, [securityFilter, trustBoundaryFilter, riskFilter, securityOverlay]);

  // Time machine change handler
  const handleTimeMachineChange = (value: number) => {
    setTimeMachineIndex(value);
    if (graphData?.timeMachine?.snapshots) {
      const snap = graphData.timeMachine.snapshots[value];
      if (snap) {
        const snapTime = new Date(snap.timestamp).getTime();
        nodesRef.current.forEach((n: any) => {
          if (n.node && n.node.lastVerifiedUtc) {
            const nodeTime = new Date(n.node.lastVerifiedUtc).getTime();
            n.opacity = (nodeTime <= snapTime + 86400000) ? 1.0 : 0.15;
            const obj = nodeObjectsRef.current.get(n.id);
            if (obj) {
              obj.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                  child.material.opacity = n.opacity;
                }
              });
            }
          }
        });
      }
    }
  };

  // Initialize visualization when graphData is ready
  useEffect(() => {
    if (graphData) {
      // Three.js initialization is handled in the main useEffect
    }
  }, [graphData]);

  if (!graphData) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex items-center justify-center z-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 font-mono text-sm">Loading 3D Knowledge Brain...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-screen bg-slate-950">
      <div ref={containerRef} className="absolute inset-0" />
      
      {/* Top Bar */}
      <div className="fixed top-0 left-0 right-0 h-12 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between px-4 gap-4 z-40 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-cyan-400">LeeWay Knowledge Brain</h1>
          <span className="text-xs bg-cyan-600 text-white px-2 py-0.5 rounded">v2.0</span>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={currentView || ''}
            onChange={(e) => {
              const newView = e.target.value;
              currentViewRef.current = newView;
              setCurrentView(newView);
              if (visualizeRef.current) visualizeRef.current();
            }}
            className="bg-slate-800 text-slate-100 border border-slate-700 px-2 py-1 rounded text-sm cursor-pointer"
          >
            {graphData?.views?.map((v: any) => (
              <option key={v.id} value={v.id}>
                {v.icon ? v.icon + ' ' : ''}{v.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Search nodes..."
            className="bg-slate-800 text-slate-100 border border-slate-700 px-2 py-1 rounded text-sm w-56"
            onChange={(e) => {
              const q = e.target.value.toLowerCase();
              const matches = graphData?.nodes?.filter((n: any) =>
                n.name.toLowerCase().includes(q) || n.id.includes(q) || (n.description && n.description.toLowerCase().includes(q))
              );
              if (matches && matches.length > 0) {
                onNodeClickHandler(matches[0]);
              }
            }}
          />
          <button onClick={resetCamera} className="px-3 py-1 bg-slate-800 text-slate-300 border border-slate-700 rounded text-xs hover:bg-slate-700">Reset View</button>
          <button
            onClick={() => setSecurityOverlay(!securityOverlay)}
            className={`px-3 py-1 rounded text-xs border ${securityOverlay ? 'bg-emerald-700 text-white border-emerald-500' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}`}
          >
            {securityOverlay ? 'Security ON' : 'Security OFF'}
          </button>
          {securityOverlay && (
            <>
              <select
                value={securityFilter}
                onChange={(e) => setSecurityFilter(e.target.value)}
                className="bg-slate-800 text-slate-100 border border-slate-700 px-2 py-1 rounded text-xs cursor-pointer"
              >
                <option value="all">All Security</option>
                <option value="GAP">Enforcement Gaps (Not Proven/Unknown)</option>
                <option value="DIRECTLY_ENFORCED">Directly Enforced</option>
                <option value="INHERITED_ENFORCEMENT">Inherited</option>
                <option value="POLICY_DECLARED">Policy Declared</option>
                <option value="PARTIALLY_ENFORCED">Partially Enforced</option>
                <option value="NOT_PROVEN">Not Proven</option>
                <option value="UNKNOWN">Unknown</option>
                <option value="BLOCKED">Blocked</option>
                <option value="NOT_APPLICABLE">N/A</option>
              </select>
              <select
                value={trustBoundaryFilter}
                onChange={(e) => setTrustBoundaryFilter(e.target.value)}
                className="bg-slate-800 text-slate-100 border border-slate-700 px-2 py-1 rounded text-xs cursor-pointer"
              >
                <option value="all">All Boundaries</option>
                <option value="leeway-standards">LeeWay Standards</option>
                <option value="runtime-fabric">Runtime Fabric</option>
                <option value="api-gateway">API Gateway</option>
                <option value="docker-network">Docker Network</option>
                <option value="unclassified">Unclassified</option>
              </select>
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="bg-slate-800 text-slate-100 border border-slate-700 px-2 py-1 rounded text-xs cursor-pointer"
              >
                <option value="all">All Risk</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
                <option value="unknown">Unknown</option>
              </select>
              <button
                onClick={() => { setSecurityFilter('GAP'); setTrustBoundaryFilter('all'); setRiskFilter('all'); }}
                className="px-3 py-1 bg-red-900/50 text-red-300 border border-red-700 rounded text-xs hover:bg-red-800"
              >Show Gaps</button>
            </>
          )}
          <button onClick={() => setShowPanel(!showPanel)} className="px-3 py-1 bg-slate-800 text-slate-300 border border-slate-700 rounded text-xs hover:bg-slate-700">
            {showPanel ? 'Hide' : 'Show'} Details
          </button>
        </div>
      </div>

      {/* Time Machine */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
        <div className="bg-slate-900/95 border border-slate-700 rounded-lg p-4 min-w-[500px] backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <strong className="text-cyan-400">Time Machine</strong>
            <span className="text-xs text-slate-400" id="tm-date">{graphData?.timeMachine?.snapshots[timeMachineIndex]?.label || 'current'}</span>
            <button onClick={() => setTimeMachineIndex(0)} className="px-2 py-1 bg-slate-800 text-slate-300 border border-slate-700 rounded text-xs hover:bg-slate-700">Latest</button>
          </div>
          <input
            type="range"
            min="0"
            max={graphData?.timeMachine?.snapshots?.length - 1 || 0}
            value={timeMachineIndex}
            onChange={(e) => handleTimeMachineChange(parseInt(e.target.value))}
            className="w-full accent-cyan-500"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            {graphData?.timeMachine?.snapshots?.map((s: any, i: number) => (
              <span key={i}>{s.label}</span>
            ))}
          </div>
          <div id="tm-info" className="text-xs text-slate-400 mt-2 text-center">
            {graphData?.timeMachine?.snapshots[timeMachineIndex]?.nodeCount} nodes | {graphData?.timeMachine?.snapshots[timeMachineIndex]?.completionPercent}% complete
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="fixed top-14 left-4 z-30 flex gap-2 flex-wrap">
        <div className="bg-slate-900/90 border border-slate-700 rounded-lg px-3 py-1.5">
          <span className="text-slate-400 text-xs">Nodes</span>
          <span className="text-cyan-400 font-bold ml-1">{nodeCount}</span>
        </div>
        <div className="bg-slate-900/90 border border-slate-700 rounded-lg px-3 py-1.5">
          <span className="text-slate-400 text-xs">Links</span>
          <span className="text-cyan-400 font-bold ml-1">{linkCount}</span>
        </div>
        <div className="bg-slate-900/90 border border-slate-700 rounded-lg px-3 py-1.5">
          <span className="text-slate-400 text-xs">Proven</span>
          <span className="text-emerald-400 font-bold ml-1">{graphData?.nodes?.filter((n: any) => n.truthLevel === 'PROVEN').length || 0}</span>
        </div>
        <div className="bg-slate-900/90 border border-slate-700 rounded-lg px-3 py-1.5">
          <span className="text-slate-400 text-xs">Live</span>
          <span className="text-emerald-400 font-bold ml-1">{graphData?.nodes?.filter((n: any) => ['LIVE_READ_ONLY','LIVE_WRITE_BOUNDED','END_TO_END_VALIDATED','PRODUCTION_READY'].includes(n.status)).length || 0}</span>
        </div>
        <div className="bg-slate-900/90 border border-slate-700 rounded-lg px-3 py-1.5">
          <span className="text-slate-400 text-xs">Views</span>
          <span className="text-cyan-400 font-bold ml-1">{graphData?.views?.length || 0}</span>
        </div>
      </div>

      {/* Legend */}
      <div className="fixed top-14 right-4 z-30">
        <div className="bg-slate-900/90 border border-slate-700 rounded-lg p-3 max-h-[60vh] overflow-y-auto">
          {securityOverlay && (
            <>
              <h4 className="text-xs text-slate-400 uppercase tracking-wider mb-2">Security Status</h4>
              {Object.entries(SECURITY_STATUS_COLORS).map(([k,v]) => (
                <div key={k} className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full" style={{background: v, boxShadow: `0 0 6px ${v}`}} />
                  <span className="text-xs text-slate-300">{k.replace(/_/g, ' ')}</span>
                  <span className="text-xs text-slate-500 ml-auto">{graphData?.nodes?.filter((n: any) => n.securityStatus === k).length || 0}</span>
                </div>
              ))}
              <div className="border-t border-slate-700 my-2" />
            </>
          )}
          <h4 className="text-xs text-slate-400 uppercase tracking-wider mb-2">Categories</h4>
          {Object.entries(CATEGORY_COLORS).sort((a,b) => {
            const countA = graphData?.nodes?.filter((n: any) => n.category === a[0]).length || 0;
            const countB = graphData?.nodes?.filter((n: any) => n.category === b[0]).length || 0;
            return countB - countA;
          }).map(([k,v]) => (
            <div key={k} className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full border border-slate-700/50" style={{background: v, boxShadow: `0 0 8px ${v}`}} />
              <span className="text-xs text-slate-300">{k}</span>
              <span className="text-xs text-slate-500 ml-auto">{graphData?.nodes?.filter((n: any) => n.category === k).length || 0}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Side Panel */}
      <aside className={`fixed top-12 right-0 bottom-0 w-96 bg-slate-900/98 border-l border-slate-700 flex flex-col transform transition-transform duration-300 z-40 ${showPanel ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between p-3 border-b border-slate-700">
          <h3 className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Node Details</h3>
          <button onClick={() => setShowPanel(false)} className="text-slate-400 hover:text-red-400 text-2xl leading-none">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {selectedNode ? (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full border-2" style={{background: CATEGORY_COLORS[selectedNode.category] || '#6b7280', borderColor: STATUS_COLORS[selectedNode.status] || '#6b7280'}} />
                <div>
                  <div className="font-semibold text-lg text-slate-100">{selectedNode.name}</div>
                  <div className="text-xs text-slate-400">{selectedNode.id}</div>
                </div>
              </div>
              <div className="mb-3">
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Category</div>
                <div className="text-sm text-slate-100">{selectedNode.category}{selectedNode.fabricLayer ? ' — ' + selectedNode.fabricLayer : ''}</div>
              </div>
              <div className="mb-3">
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Status / Truth / Health</div>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 rounded-full text-xs font-semibold border" style={{background: `${STATUS_COLORS[selectedNode.status] || '#6b7280'}22`, color: STATUS_COLORS[selectedNode.status] || '#6b7280', borderColor: STATUS_COLORS[selectedNode.status] || '#6b7280'}}>{selectedNode.status}</span>
                  <span className="px-2 py-1 rounded-full text-xs font-semibold border" style={{background: '#6366f122', color: '#818cf8', borderColor: '#6366f1'}}>{selectedNode.truthLevel}</span>
                  <span className="px-2 py-1 rounded-full text-xs font-semibold border" style={{
                    background: selectedNode.health === 'HEALTHY' ? '#22c55e22' : selectedNode.health === 'DEGRADED' ? '#f59e0b22' : '#64748b22',
                    color: selectedNode.health === 'HEALTHY' ? '#22c55e' : selectedNode.health === 'DEGRADED' ? '#f59e0b' : '#64748b',
                    borderColor: selectedNode.health === 'HEALTHY' ? '#22c55e' : selectedNode.health === 'DEGRADED' ? '#f59e0b' : '#64748b'
                  }}>{selectedNode.health || 'UNKNOWN'}</span>
                </div>
              </div>
              {selectedNode.description && (
                <div className="mb-3">
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Description</div>
                  <div className="text-sm text-slate-200">{selectedNode.description}</div>
                </div>
              )}
              {selectedNode.securityStatus && (
                <div className="mb-3">
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Security Status</div>
                  <span className="px-2 py-1 rounded-full text-xs font-semibold border" style={{
                    background: `${SECURITY_STATUS_COLORS[selectedNode.securityStatus] || '#6b7280'}22`,
                    color: SECURITY_STATUS_COLORS[selectedNode.securityStatus] || '#6b7280',
                    borderColor: SECURITY_STATUS_COLORS[selectedNode.securityStatus] || '#6b7280'
                  }}>{selectedNode.securityStatus}</span>
                  {selectedNode.trustBoundary && (
                    <span className="ml-2 px-2 py-1 rounded-full text-xs font-semibold border" style={{
                      background: `${TRUST_BOUNDARY_COLORS[selectedNode.trustBoundary] || '#6b7280'}22`,
                      color: TRUST_BOUNDARY_COLORS[selectedNode.trustBoundary] || '#6b7280',
                      borderColor: TRUST_BOUNDARY_COLORS[selectedNode.trustBoundary] || '#6b7280'
                    }}>{selectedNode.trustBoundary}</span>
                  )}
                  {selectedNode.riskClass && (
                    <span className="ml-2 px-2 py-1 rounded-full text-xs font-semibold border" style={{
                      background: selectedNode.riskClass === 'critical' ? '#ef444422' : selectedNode.riskClass === 'high' ? '#f59e0b22' : '#64748b22',
                      color: selectedNode.riskClass === 'critical' ? '#ef4444' : selectedNode.riskClass === 'high' ? '#f59e0b' : '#64748b',
                      borderColor: selectedNode.riskClass === 'critical' ? '#ef4444' : selectedNode.riskClass === 'high' ? '#f59e0b' : '#64748b'
                    }}>{selectedNode.riskClass}</span>
                  )}
                </div>
              )}
              {selectedNode.securityConfidence && (
                <div className="mb-3">
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Security Confidence</div>
                  <div className="text-sm text-slate-100">{selectedNode.securityConfidence}</div>
                </div>
              )}
              {selectedNode.authorizationModel && (
                <div className="mb-3">
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Authorization Model</div>
                  <div className="text-sm text-slate-100">{selectedNode.authorizationModel}{selectedNode.roles ? ` (${selectedNode.roles.join(', ')})` : ''}</div>
                </div>
              )}
              {selectedNode.securityEvidence && selectedNode.securityEvidence.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Security Evidence</div>
                  <div className="text-sm text-slate-100">{selectedNode.securityEvidence.join(', ')}</div>
                </div>
              )}
              {selectedNode.owner && (
                <div className="mb-3">
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Owner</div>
                  <div className="text-sm text-slate-100">{selectedNode.owner}</div>
                </div>
              )}
              {selectedNode.version && (
                <div className="mb-3">
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Version</div>
                  <div className="text-sm text-slate-100">{selectedNode.version}</div>
                </div>
              )}
              {selectedNode.contracts && selectedNode.contracts.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Contracts</div>
                  <div className="text-sm text-slate-100">{selectedNode.contracts.join(', ')}</div>
                </div>
              )}
              {selectedNode.capabilities && selectedNode.capabilities.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Capabilities</div>
                  <div className="text-sm text-slate-100">{selectedNode.capabilities.join(', ')}</div>
                </div>
              )}
              {selectedNode.dependencies && selectedNode.dependencies.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Dependencies</div>
                  <div className="text-sm text-slate-100">{selectedNode.dependencies.map((d: string) => `<a href="#" onClick="focusNode('${d}');return false;" style={{color:'#3b82f6'}}>${d}</a>`).join(', ')}</div>
                </div>
              )}
              {selectedNode.dependents && selectedNode.dependents.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Dependents</div>
                  <div className="text-sm text-slate-100">{selectedNode.dependents.map((d: string) => `<a href="#" onClick="focusNode('${d}');return false;" style={{color:'#3b82f6'}}>${d}</a>`).join(', ')}</div>
                </div>
              )}
              {selectedNode.containers && selectedNode.containers.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Containers</div>
                  <div className="text-sm text-slate-100" style={{fontSize: '11px'}}>{selectedNode.containers.join('<br>')}</div>
                </div>
              )}
              {selectedNode.ports && selectedNode.ports.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Ports</div>
                  <div className="text-sm text-slate-100">{selectedNode.ports.join(', ')}</div>
                </div>
              )}
              {selectedNode.evidence && selectedNode.evidence.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Evidence</div>
                  <div className="text-sm text-slate-100">{selectedNode.evidence.join(', ')}</div>
                </div>
              )}
              {selectedNode.knownGaps && selectedNode.knownGaps.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs text-red-400 uppercase tracking-wider mb-1">Known Gaps</div>
                  <div className="text-sm text-red-300">{selectedNode.knownGaps.join('<br>')}</div>
                </div>
              )}
              {selectedNode.nextMigration && (
                <div className="mb-3">
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Next Migration</div>
                  <div className="text-sm text-slate-100">{selectedNode.nextMigration}</div>
                </div>
              )}
              {selectedNode.deploymentTargets && selectedNode.deploymentTargets.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Deployment Targets</div>
                  <div className="text-sm text-slate-100">{selectedNode.deploymentTargets.join(', ')}</div>
                </div>
              )}
              {selectedNode.executionModes && selectedNode.executionModes.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Execution Modes</div>
                  <div className="text-sm text-slate-100">{selectedNode.executionModes.join(', ')}</div>
                </div>
              )}
              {selectedNode.lastVerifiedUtc && (
                <div className="mb-3">
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Last Verified</div>
                  <div className="text-sm text-slate-100">{selectedNode.lastVerifiedUtc}</div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-slate-400 py-8">Click a node to view details</div>
          )}
        </div>
      </aside>

      {/* Help Tooltip */}
      <div className="fixed bottom-4 left-4 z-30 bg-slate-900/90 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-400 max-w-xs opacity-0 hover:opacity-100 transition-opacity duration-500">
        <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-cyan-400">Left Drag</kbd> Orbit &nbsp;
        <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-cyan-400">Right Drag</kbd> Pan &nbsp;
        <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-cyan-400">Scroll</kbd> Zoom &nbsp;
        <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-cyan-400">Click</kbd> Select
      </div>

    </div>
  );
}