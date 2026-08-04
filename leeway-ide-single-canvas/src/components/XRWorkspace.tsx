/**
 * LEEWAY_HEADER - DO NOT REMOVE
 *
 * REGION: UI
 * TAG: UI.COMPONENT.PLACEHOLDER
 * DESCRIPTION: Leeway IDE component
 * AUTHORITY: LeeWay-Standards
 * DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
 *
 * 5WH:
 * WHAT = Component
 * WHY = Provide functionality
 * WHO = Leeway Innovations / Agent Lee Enablement
 * WHERE = FILEPATH
 * WHEN = 2026-06-06
 * HOW = React component
 *
 * CHAIN: Standards ? Integrated ? Runtime ? Projections
 * LICENSE: PROPRIETARY
 */

import { useState, useEffect, useRef } from "react";
import { StudioShell } from "./StudioShell";
import { StudioNode } from "./StudioNode";
import * as THREE from "three";
import {
  Boxes,
  Compass,
  FileText,
  Search,
  CheckCircle,
  Clock,
  Play,
  Pause,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Plus,
  AlertTriangle,
  Database,
  Radio,
  Gamepad2,
  Camera,
  Layers,
  HelpCircle,
  Eye,
  Settings,
  Tv,
  EyeOff,
  Cpu,
  Trash,
  Move,
  Maximize2,
  Sliders,
  Sparkles,
  Smartphone,
  ChevronRight,
  Workflow
} from "lucide-react";

export function XRWorkspace() {
  const [selectedNode, setSelectedNode] = useState("Glass Wall Panel (Mesh)");
  const [activeTab, setActiveTab] = useState("Scene Designer");
  const [renderMode, setRenderMode] = useState("Persp • Shaded"); // "Persp • Shaded", "Wireframe", "Splitscreen Stereoscopic VR", "Anaglyph 3D", "Live AR Camera"
  const [cameraRadius, setCameraRadius] = useState<number>(14);
  const [isBuildingTargets, setIsBuildingTargets] = useState(false);
  const [buildProgress, setBuildProgress] = useState(0);
  const [compilerLogs, setCompilerLogs] = useState([
    { progress: 100, text: "[Assets] Loaded luxury_glassvilla.glb successfully. Compiled 48 textures." },
    { progress: 100, text: "[Shaders] Translucency glass shader compiled for AR QuickLook compatibility." },
    { progress: 100, text: "[Physics] Colliders registered on 12 column architectural items." },
    { progress: 100, text: "[Pipeline] Targets verified. Ready for stereoscopic VR rendering build." }
  ]);

  // Transform coordinates linked to selected node
  const [transform, setTransform] = useState({
    posX: 0.00, posY: 1.5, posZ: 0.00,
    scaleX: 1.20, scaleY: 2.2, scaleZ: 0.20
  });

  // Track coordinates separately for each node so the values persist when switching nodes!
  const [nodesData, setNodesData] = useState<Record<string, { posX: number, posY: number, posZ: number, scaleX: number, scaleY: number, scaleZ: number }>>({
    "Glass Wall Panel (Mesh)": { posX: 0.0, posY: 1.5, posZ: 0.0, scaleX: 3.5, scaleY: 2.5, scaleZ: 0.15 },
    "Terrain Mesh": { posX: 0.0, posY: -0.1, posZ: 0.0, scaleX: 1.5, scaleY: 0.1, scaleZ: 1.5 },
    "Realistic Skylight Proj": { posX: 3.0, posY: 8.0, posZ: 4.0, scaleX: 1.0, scaleY: 1.0, scaleZ: 1.0 },
    "Lounge Modern Sofa": { posX: -1.8, posY: 0.35, posZ: -1.0, scaleX: 2.2, scaleY: 0.60, scaleZ: 1.0 },
    "Chair Design GLB": { posX: 1.5, posY: 0.35, posZ: 1.2, scaleX: 0.8, scaleY: 0.8, scaleZ: 0.8 },
    "User Teleport Target": { posX: 0.0, posY: 0.05, posZ: 2.5, scaleX: 1.0, scaleY: 1.0, scaleZ: 1.0 }
  });

  // Synchronize dynamic GUI transform state with the active selected node
  useEffect(() => {
    const data = nodesData[selectedNode];
    if (data) {
      setTransform(data);
    }
  }, [selectedNode]);

  // Synchronize active coordinate slider inputs back into nodes state directory
  const handleTransformChange = (key: keyof typeof transform, val: number) => {
    setTransform(prev => {
      const updated = { ...prev, [key]: val };
      setNodesData(all => ({
        ...all,
        [selectedNode]: updated
      }));
      return updated;
    });
  };

  // ThreeJS elements refs
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Track camera rotation and zoom in state to display on the panel
  const [cameraStats, setCameraStats] = useState({ yaw: 0.78, pitch: 0.35, dist: 14 });

  // Web camera stream trigger state
  const [isCameraLive, setIsCameraLive] = useState(false);

  // Active automation rules
  const [automationRules, setAutomationRules] = useState([
    { trigger: "On Gaze Select", source: "User Eye Vector", action: "Toggle Glass Translucency", active: true },
    { trigger: "On Proximity Trigger", source: "Sofa Mesh Collision", action: "Trigger Ambient Sound Node", active: true },
    { trigger: "On Device Grip Press", source: "Quest Controller", action: "Init Teleport Jump Beam", active: false }
  ]);

  // Build simulation loader
  useEffect(() => {
    let interval: any;
    if (isBuildingTargets) {
      interval = setInterval(() => {
        setBuildProgress(prev => {
          if (prev < 100) {
            return prev + 5;
          } else {
            setIsBuildingTargets(false);
            setCompilerLogs(prevLogs => [
              ...prevLogs,
              { progress: 100, text: `[Compile] Stereoscopic spatial shader bundle linked onto the device targets with success.` },
              { progress: 100, text: `[Build] Spatial projection deployed safely to LeeWay runtime local vault.` }
            ]);
            return 100;
          }
        });
      }, 150);
    }
    return () => clearInterval(interval);
  }, [isBuildingTargets]);

  const handleBuildAllTargets = () => {
    setBuildProgress(0);
    setIsBuildingTargets(true);
  };

  // Webcam streamer controller
  useEffect(() => {
    if (renderMode === "Live AR Camera" || isCameraLive) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
        .then(stream => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch(err => {
          console.warn("Could not initiate local webcam for AR overlays:", err);
          setIsCameraLive(false);
        });
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
    }

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [renderMode, isCameraLive]);

  // MAIN WebGL 3D THREE.JS RENDERER LOOP
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    // Grab dimensions
    const width = container.clientWidth;
    const height = container.clientHeight || 280;

    // 1. Scene
    const scene = new THREE.Scene();

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(10, 6, 10);

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // 4. Lights inside scene
    const ambLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 12, 5);
    scene.add(dirLight);

    // 5. Meshes
    // Terrain mesh
    const terrainGeo = new THREE.BoxGeometry(10, 0.1, 10);
    const terrainMat = new THREE.MeshStandardMaterial({ color: 0x1d2433, roughness: 0.8 });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.position.set(0, -0.05, 0);
    scene.add(terrainMesh);

    // Fine floor checker helper representing spatial boundaries
    const gridHelper = new THREE.GridHelper(10, 20, 0x4da6ff, 0x22304d);
    gridHelper.position.set(0, 0.01, 0);
    scene.add(gridHelper);

    // Structural columns
    const columns: THREE.Mesh[] = [];
    const colGeo = new THREE.CylinderGeometry(0.08, 0.08, 3, 12);
    const colMat = new THREE.MeshStandardMaterial({ color: 0x8c96a8, metalness: 0.8, roughness: 0.2 });
    
    const colPositions = [
      [-4.5, 1.5, -4.5],
      [4.5, 1.5, -4.5],
      [-4.5, 1.5, 4.5],
      [4.5, 1.5, 4.5]
    ];
    
    colPositions.forEach(([cx, cy, cz]) => {
      const colMesh = new THREE.Mesh(colGeo, colMat);
      colMesh.position.set(cx, cy, cz);
      scene.add(colMesh);
      columns.push(colMesh);
    });

    // Glass Wall Panel (Interactive target)
    const glassGeo = new THREE.BoxGeometry(1, 1, 1);
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.4,
      roughness: 0.05,
      metalness: 0.1,
      transmission: 0.9,
      ior: 1.5,
      thickness: 0.2
    });
    const glassWallMesh = new THREE.Mesh(glassGeo, glassMat);
    scene.add(glassWallMesh);

    // Sofa Mesh
    const sofaMainGeo = new THREE.BoxGeometry(1, 1, 1);
    const sofaMat = new THREE.MeshStandardMaterial({ color: 0xdde4f0, roughness: 0.9 });
    const sofaMesh = new THREE.Mesh(sofaMainGeo, sofaMat);
    scene.add(sofaMesh);

    // Chair Mesh
    const chairGeo = new THREE.BoxGeometry(1, 1, 1);
    const chairMat = new THREE.MeshStandardMaterial({ color: 0xe67e22, roughness: 0.7 });
    const chairMesh = new THREE.Mesh(chairGeo, chairMat);
    scene.add(chairMesh);

    // Teleport Target (Interactive target ring)
    const teleGeo = new THREE.TorusGeometry(0.35, 0.04, 8, 24);
    const teleMat = new THREE.MeshBasicMaterial({ color: 0xa855f7, wireframe: true });
    const teleportMesh = new THREE.Mesh(teleGeo, teleMat);
    teleportMesh.rotation.x = Math.PI / 2; // Flat on the floor
    scene.add(teleportMesh);

    // Create a rotating rings gizmo to indicate user selection
    const donutGeo = new THREE.RingGeometry(0.5, 0.55, 32);
    const donutMat = new THREE.MeshBasicMaterial({ color: 0x3b82f6, side: THREE.DoubleSide });
    const selectRingMesh = new THREE.Mesh(donutGeo, donutMat);
    selectRingMesh.rotation.x = Math.PI / 2;
    scene.add(selectRingMesh);

    // 6. Interaction orbit values
    let orbitYaw = 0.78;
    let orbitPitch = 0.35;
    let currentDist = 12;
    let isMouseDown = false;
    let lastX = 0;
    let lastY = 0;

    const onMouseDown = (e: MouseEvent) => {
      isMouseDown = true;
      lastX = e.clientX;
      lastY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isMouseDown) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      
      orbitYaw -= dx * 0.007;
      orbitPitch = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, orbitPitch - dy * 0.007));

      lastX = e.clientX;
      lastY = e.clientY;

      setCameraStats({
        yaw: parseFloat(orbitYaw.toFixed(2)),
        pitch: parseFloat(orbitPitch.toFixed(2)),
        dist: parseFloat(currentDist.toFixed(1))
      });
    };

    const onMouseUp = () => {
      isMouseDown = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      currentDist = Math.max(3, Math.min(30, currentDist + e.deltaY * 0.015));
      setCameraStats(prev => ({ ...prev, dist: parseFloat(currentDist.toFixed(1)) }));
    };

    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("mouseleave", onMouseUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    // Handle responsive container resize
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        const targetHeight = h || 280;
        renderer.setSize(w, targetHeight);
        camera.aspect = w / targetHeight;
        camera.updateProjectionMatrix();
      }
    });
    resizeObserver.observe(container);

    let animationFrameId: number;

    // Continuous tick loop
    const tick = () => {
      // Rotate basic active structures slowly representing simulation tracking
      SOFA_ROTATE: {
        teleportMesh.rotation.z += 0.015;
      }

      // Read current node coordinates from the React active structures directory dynamically via direct DOM/state link
      const nodeStates = nodesData;
      
      terrainMesh.position.set(nodeStates["Terrain Mesh"].posX, nodeStates["Terrain Mesh"].posY, nodeStates["Terrain Mesh"].posZ);
      terrainMesh.scale.set(nodeStates["Terrain Mesh"].scaleX, nodeStates["Terrain Mesh"].scaleY, nodeStates["Terrain Mesh"].scaleZ);

      dirLight.position.set(nodeStates["Realistic Skylight Proj"].posX, nodeStates["Realistic Skylight Proj"].posY, nodeStates["Realistic Skylight Proj"].posZ);

      glassWallMesh.position.set(nodeStates["Glass Wall Panel (Mesh)"].posX, nodeStates["Glass Wall Panel (Mesh)"].posY, nodeStates["Glass Wall Panel (Mesh)"].posZ);
      glassWallMesh.scale.set(nodeStates["Glass Wall Panel (Mesh)"].scaleX, nodeStates["Glass Wall Panel (Mesh)"].scaleY, nodeStates["Glass Wall Panel (Mesh)"].scaleZ);

      sofaMesh.position.set(nodeStates["Lounge Modern Sofa"].posX, nodeStates["Lounge Modern Sofa"].posY, nodeStates["Lounge Modern Sofa"].posZ);
      sofaMesh.scale.set(nodeStates["Lounge Modern Sofa"].scaleX, nodeStates["Lounge Modern Sofa"].scaleY, nodeStates["Lounge Modern Sofa"].scaleZ);

      chairMesh.position.set(nodeStates["Chair Design GLB"].posX, nodeStates["Chair Design GLB"].posY, nodeStates["Chair Design GLB"].posZ);
      chairMesh.scale.set(nodeStates["Chair Design GLB"].scaleX, nodeStates["Chair Design GLB"].scaleY, nodeStates["Chair Design GLB"].scaleZ);

      teleportMesh.position.set(nodeStates["User Teleport Target"].posX, nodeStates["User Teleport Target"].posY, nodeStates["User Teleport Target"].posZ);

      // Adjust selecting ring locator based on whichever mesh item is active
      const activeNodeName = selectedNode;
      if (activeNodeName.includes("Glass")) {
        selectRingMesh.position.copy(glassWallMesh.position);
        selectRingMesh.position.y = 0.05;
        selectRingMesh.scale.set(glassWallMesh.scale.x, glassWallMesh.scale.z, 1);
        selectRingMesh.visible = true;
      } else if (activeNodeName.includes("Sofa")) {
        selectRingMesh.position.copy(sofaMesh.position);
        selectRingMesh.position.y = 0.05;
        selectRingMesh.scale.set(sofaMesh.scale.x, sofaMesh.scale.z, 1);
        selectRingMesh.visible = true;
      } else if (activeNodeName.includes("Chair")) {
        selectRingMesh.position.copy(chairMesh.position);
        selectRingMesh.position.y = 0.05;
        selectRingMesh.scale.set(chairMesh.scale.x, chairMesh.scale.z, 1);
        selectRingMesh.visible = true;
      } else if (activeNodeName.includes("Teleport")) {
        selectRingMesh.position.copy(teleportMesh.position);
        selectRingMesh.position.y = 0.05;
        selectRingMesh.scale.set(1.2, 1.2, 1);
        selectRingMesh.visible = true;
      } else {
        selectRingMesh.visible = false;
      }

      // Handle custom render wireframe filters
      const activeFilter = renderMode;
      glassMat.wireframe = activeFilter === "Orthographic • Wireframe";
      terrainMat.wireframe = activeFilter === "Orthographic • Wireframe";
      sofaMat.wireframe = activeFilter === "Orthographic • Wireframe";
      chairMat.wireframe = activeFilter === "Orthographic • Wireframe";

      // Compute camera rotation trigonometry spherical mappings
      camera.position.x = currentDist * Math.sin(orbitYaw) * Math.cos(orbitPitch);
      camera.position.z = currentDist * Math.cos(orbitYaw) * Math.cos(orbitPitch);
      camera.position.y = currentDist * Math.sin(orbitPitch);
      camera.lookAt(0, 1.2, 0);

      // 7. Core frame viewport splitting
      if (activeFilter === "Splitscreen Stereoscopic VR") {
        const halfWidth = canvas.width / 2;
        const canvasHeight = canvas.height;

        // LEFT EYE RENDER
        renderer.setViewport(0, 0, halfWidth, canvasHeight);
        renderer.setScissor(0, 0, halfWidth, canvasHeight);
        renderer.setScissorTest(true);

        camera.position.x -= 0.22; // Offset eye coordinate
        camera.updateMatrixWorld();
        renderer.render(scene, camera);

        // RIGHT EYE RENDER
        renderer.setViewport(halfWidth, 0, halfWidth, canvasHeight);
        renderer.setScissor(halfWidth, 0, halfWidth, canvasHeight);
        renderer.setScissorTest(true);

        camera.position.x += 0.44; // Shift right coordinate
        camera.updateMatrixWorld();
        renderer.render(scene, camera);

        // RESET
        camera.position.x -= 0.22;
      } else if (activeFilter === "Anaglyph 3D") {
        // Render classical retro red-cyan offset blend anaglyphs
        const halfWidth = canvas.width;
        const canvasHeight = canvas.height;
        renderer.setScissorTest(false);
        renderer.setViewport(0, 0, halfWidth, canvasHeight);
        
        // Simulating 3D stereoscopy displacement by oscillating position
        const timeFactor = Date.now() * 0.001;
        camera.position.x += Math.sin(timeFactor * 1.5) * 0.08;
        camera.lookAt(0, 1.2, 0);
        renderer.render(scene, camera);
        camera.position.x -= Math.sin(timeFactor * 1.5) * 0.08;
      } else {
        // Normal PERSPECTIVE RENDER
        renderer.setViewport(0, 0, canvas.width, canvas.height);
        renderer.setScissorTest(false);
        renderer.render(scene, camera);
      }

      animationFrameId = requestAnimationFrame(tick);
    };

    tick();

    // CLEANUP
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("mouseleave", onMouseUp);
      canvas.removeEventListener("wheel", onWheel);
    };
  }, [renderMode, nodesData, selectedNode]);

  return (
    <StudioShell>
      {/* Wrap the XR studio in a draggable node container */}
      <StudioNode id="xr-workspace" title="XR / Spatial Workspace" initialX={60} initialY={90}>
        <div className="flex-1 w-full bg-transparent text-[#c9d1d9] p-5 overflow-y-auto custom-scrollbar flex flex-col space-y-5 min-h-0" id="xr-workspace-container">
      
      {/* Title Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between shrink-0 gap-3 border-b border-[#30363d]/50 pb-4">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-white flex items-center space-x-2">
            <Boxes className="w-5 h-5 text-blue-400 animate-pulse" />
            <span>XR Spatial Studio Editor</span>
            <span className="text-[10px] font-mono font-bold uppercase py-0.5 px-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg">WebXR Engine</span>
          </h1>
          <p className="text-xs text-gray-400 font-sans mt-0.5">
            Construct and coordinate AR/VR glass columns meshes, physics triggers, and telemetry nodes mappings. Drag inside the viewport to rotate view, scroll to zoom.
          </p>
        </div>
        
        {/* Workspace controls tabs selector */}
        <div className="flex bg-[#161b22] p-1 border border-[#30363d] rounded-xl self-start lg:self-center font-sans font-bold text-xs">
          {["Scene Designer", "Interactions Map", "Automation Node", "Target Build"].map((tab) => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                activeTab === tab ? "bg-blue-500 text-white shadow shadow-blue-500/15" : "text-gray-400 hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "Scene Designer" && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
          
          {/* Left Column: Scene graph tree hierarchy & assets manager (3 Cols) */}
          <div className="xl:col-span-3 flex flex-col space-y-4">
            
            {/* Scene Graph Tree Hierarchy */}
            <div className="bg-[#161b22]/70 border border-[#30363d] rounded-2xl p-4 flex flex-col space-y-3 shadow-lg select-none">
              <div className="flex items-center justify-between border-b border-[#30363d] pb-2">
                <span className="text-[10px] font-mono uppercase font-bold text-gray-400 tracking-wider">Spatial Scene Graph</span>
                <span className="text-[8px] font-mono text-emerald-400 flex items-center space-x-1 uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Active</span>
                </span>
              </div>
              
              <div className="space-y-1 font-mono text-xs overflow-y-auto max-h-56 custom-scrollbar pr-1">
                <div className="text-white font-bold leading-none flex items-center mb-1.5 text-[11px]">
                  <span className="text-gray-500 mr-1.5 text-[9px]">▼</span> Luxury Villa Scene
                </div>
                <div className="pl-3 text-[#c9d1d9]/80 space-y-1 border-l border-dashed border-gray-800 leading-normal text-[10.5px]">
                  
                  {/* Terrain Mesh toggler */}
                  <div 
                    onClick={() => setSelectedNode("Terrain Mesh")}
                    className={`pl-2 py-1.5 rounded-lg cursor-pointer flex items-center justify-between ${selectedNode === "Terrain Mesh" ? "bg-blue-500/15 text-blue-400 font-bold border border-blue-500/30" : "hover:bg-white/5"}`}
                  >
                    <span>└ Terrain Mesh</span>
                    <span className="text-[8.5px] text-gray-500">Box</span>
                  </div>

                  {/* Realistic Skylight Proj */}
                  <div 
                    onClick={() => setSelectedNode("Realistic Skylight Proj")}
                    className={`pl-2 py-1.5 rounded-lg cursor-pointer flex items-center justify-between ${selectedNode === "Realistic Skylight Proj" ? "bg-blue-500/15 text-blue-400 font-bold border border-blue-500/30" : "hover:bg-white/5"}`}
                  >
                    <span>└ Realistic Skylight Proj</span>
                    <span className="text-[8.5px] text-amber-500">Light</span>
                  </div>

                  {/* Architecture Glass Wall */}
                  <div 
                    onClick={() => setSelectedNode("Glass Wall Panel (Mesh)")}
                    className={`pl-2 py-1.5 rounded-lg cursor-pointer flex items-center justify-between ${selectedNode === "Glass Wall Panel (Mesh)" ? "bg-blue-500/15 text-blue-400 font-bold border border-blue-500/30" : "hover:bg-white/5"}`}
                  >
                    <span>└ Glass Wall Panel (Mesh)</span>
                    <span className="text-[8.5px] text-blue-400">Glass</span>
                  </div>

                  {/* Lounge Sofa */}
                  <div 
                    onClick={() => setSelectedNode("Lounge Modern Sofa")}
                    className={`pl-2 py-1.5 rounded-lg cursor-pointer flex items-center justify-between ${selectedNode === "Lounge Modern Sofa" ? "bg-blue-500/15 text-blue-400 font-bold border border-blue-500/30" : "hover:bg-white/5"}`}
                  >
                    <span>└ Lounge Modern Sofa</span>
                    <span className="text-[8.5px] text-emerald-400">Box</span>
                  </div>

                  {/* Chair Design */}
                  <div 
                    onClick={() => setSelectedNode("Chair Design GLB")}
                    className={`pl-2 py-1.5 rounded-lg cursor-pointer flex items-center justify-between ${selectedNode === "Chair Design GLB" ? "bg-blue-500/15 text-blue-400 font-bold border border-blue-500/30" : "hover:bg-white/5"}`}
                  >
                    <span>└ Chair Design GLB</span>
                    <span className="text-[8.5px] text-orange-400">Chair</span>
                  </div>

                  {/* Teleport Target */}
                  <div 
                    onClick={() => setSelectedNode("User Teleport Target")}
                    className={`pl-2 py-1.5 rounded-lg cursor-pointer flex items-center justify-between ${selectedNode === "User Teleport Target" ? "bg-blue-500/15 text-blue-400 font-bold border border-blue-500/30" : "hover:bg-white/5"}`}
                  >
                    <span>└ User Teleport Target</span>
                    <span className="text-[8.5px] text-purple-400">Trigger</span>
                  </div>

                </div>
              </div>

              <div className="pt-2">
                <button className="w-full py-2 bg-[#0d1117] border border-[#30363d] rounded-xl text-[10px] font-bold tracking-wide text-gray-400 hover:text-white uppercase transition-colors">
                  + Append Visual Node
                </button>
              </div>
            </div>

            {/* Asset Manager Vault directory */}
            <div className="bg-[#161b22]/70 border border-[#30363d] rounded-2xl p-4 flex flex-col space-y-3 shadow-lg select-none">
              <div className="flex items-center justify-between border-b border-[#30363d] pb-2">
                <span className="text-[10px] font-mono uppercase font-bold text-gray-400 tracking-wider">Spatial Visual Asset Bank</span>
                <span className="text-[9px] font-mono text-gray-500">File Storage</span>
              </div>

              <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto custom-scrollbar p-0.5">
                {[
                  { name: "luxury_glassvilla.glb", spec: "Mesh • 42 MB", focus: true },
                  { name: "coastline_hdri.exr", spec: "Skys • 18 MB", focus: false },
                  { name: "modern_lounge.gltf", spec: "Mesh • 8 MB", focus: false },
                  { name: "palm_leaves.glb", spec: "Mesh • 2 MB", focus: false }
                ].map((as, i) => (
                  <div 
                    key={i} 
                    className={`p-2 rounded-xl border text-[9px] cursor-pointer flex flex-col ${
                      as.focus 
                        ? "bg-blue-500/5 border-blue-500/40 text-blue-300"
                        : "bg-[#0d1117] border-[#30363d] hover:border-gray-600 text-gray-400"
                    }`}
                  >
                    <span className="font-bold block truncate text-white">{as.name}</span>
                    <span className="text-[8px] font-mono text-gray-500 block leading-none mt-1">{as.spec}</span>
                  </div>
                ))}
              </div>

              <button className="w-full py-2 bg-[#0d1117] border border-[#30363d] rounded-xl text-[9px] font-bold tracking-wide text-blue-400 hover:text-blue-300 hover:bg-blue-500/5 uppercase transition-colors">
                + Import GLB Asset
              </button>
            </div>

          </div>

          {/* Middle Column: Viewport rendering simulator (5 Cols) */}
          <div className="xl:col-span-5 flex flex-col space-y-4">
            
            {/* Panoramic Viewport Rendering Monitor */}
            <div className="bg-[#161b22]/70 border border-[#30363d] rounded-2xl p-4 flex flex-col space-y-3 shadow-lg select-none">
              <div className="flex items-center justify-between border-b border-[#30363d] pb-2">
                <span className="text-[10px] font-mono uppercase font-bold text-gray-400 tracking-wider block">Spatial 3D Viewport Monitor</span>
                
                <div className="flex items-center space-x-2">
                  <select 
                    value={renderMode}
                    onChange={(e) => {
                      setRenderMode(e.target.value);
                      if (e.target.value === "Live AR Camera") {
                        setIsCameraLive(true);
                      } else {
                        setIsCameraLive(false);
                      }
                    }}
                    className="bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-[10px] font-mono text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Persp • Shaded">Persp • Shaded</option>
                    <option value="Orthographic • Wireframe">Orthographic • Wireframe</option>
                    <option value="Splitscreen Stereoscopic VR">VR Splitscreen Glasses</option>
                    <option value="Anaglyph 3D">Anaglyph 3D (Red/Cyan)</option>
                    <option value="Live AR Camera">AR Cam Stream View</option>
                  </select>
                </div>
              </div>

              {/* WebGL viewport container */}
              <div 
                ref={containerRef}
                className="bg-black border border-[#30363d]/50 rounded-2xl relative h-72 overflow-hidden flex items-center justify-center shadow-inner"
              >
                {/* 1. Underlying camera webcam tag for live physical AR projection */}
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted
                  className={`absolute inset-0 w-full h-full object-cover z-0 transition-opacity duration-350 ${
                    renderMode === "Live AR Camera" || isCameraLive ? "opacity-90" : "opacity-0 pointer-events-none"
                  }`} 
                />

                {/* 2. Panoramic picture frame if webcam is off */}
                {renderMode !== "Live AR Camera" && !isCameraLive && (
                  <div 
                    className="absolute inset-0 bg-cover bg-center opacity-15 select-none pointer-events-none z-0" 
                    style={{ backgroundImage: "url('https://images.unsplash.com/photo-1626379616459-b2ce1d9decbc?fit=crop&w=640&q=50')" }} 
                  />
                )}

                {/* 3. Real interactive 3D WebGL Canvas */}
                <canvas 
                  ref={canvasRef} 
                  className="absolute inset-0 w-full h-full z-10 cursor-grab active:cursor-grabbing outline-none" 
                />

                {/* Simulated AR frame elements overlays if AR Cam is active */}
                {(renderMode === "Live AR Camera" || isCameraLive) && (
                  <div className="absolute inset-x-6 top-6 flex justify-between items-start pointer-events-none z-20">
                    <div className="bg-black/75 border border-blue-500/40 rounded-xl px-2.5 py-1.5 text-[8px] font-mono text-blue-300">
                      <span className="font-bold flex items-center space-x-1 uppercase text-blue-400">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping mr-1"></span>
                        Spatial Plane Lock
                      </span>
                      <span>Anchored on 4 col columns landscape</span>
                    </div>
                    <div className="bg-black/75 border border-emerald-500/30 rounded-xl px-2 py-1 text-[8.5px] font-mono text-emerald-400 font-bold uppercase">
                      SLAM tracking: ACTIVE
                    </div>
                  </div>
                )}

                {/* Viewport bottom info details banner */}
                <div className="absolute bottom-0 inset-x-0 bg-black/85 border-t border-white/5 px-3 py-1.5 flex items-center justify-between text-[9px] font-mono text-gray-500 z-20">
                  <span>Zoom/Orbit: drag & wheel</span>
                  <span className="hidden md:inline">Cam: Y{cameraStats.yaw} P{cameraStats.pitch} D{cameraStats.dist}</span>
                  <span className="text-emerald-500 font-bold uppercase tracking-tight">ThreeJS • OpenGL active</span>
                </div>
              </div>
            </div>

            {/* Spatial automated nodes pipeline */}
            <div className="bg-[#161b22]/70 border border-[#30363d] rounded-2xl p-4 flex flex-col space-y-3.5 shadow-lg select-none">
              <span className="text-[10px] font-mono uppercase font-bold text-gray-400 tracking-wider">Spatial physics automation</span>
              
              <div className="bg-[#0f141c] p-3 rounded-xl border border-white/5 space-y-3.5 select-none text-[9px] font-mono">
                <div className="flex justify-between items-center bg-[#0d1117] p-2 rounded border border-gray-800">
                  <div className="flex items-center space-x-2">
                    <Smartphone className="w-4 h-4 text-blue-400" />
                    <div>
                      <span className="text-white font-bold block uppercase leading-none">1. Fetch Device Node Variables</span>
                      <span className="text-[7.5px] text-gray-500 uppercase leading-none block mt-0.5">Telemetry listener loop</span>
                    </div>
                  </div>
                  <span className="text-blue-400 font-bold font-mono">24 channels</span>
                </div>
                
                <div className="text-center text-gray-600 font-bold leading-none select-text">↓</div>

                <div className="flex justify-between items-center bg-blue-500/10 border border-blue-500/30 text-blue-400 p-2 rounded">
                  <div className="flex items-center space-x-2">
                    <Workflow className="w-4 h-4 text-blue-400 animate-spin" />
                    <div>
                      <span className="text-blue-300 font-bold block uppercase leading-none text-left">2. Collision Mesh Resolver</span>
                      <span className="text-[7.5px] text-blue-500 uppercase leading-none block text-left mt-0.5">Automation Pipeline</span>
                    </div>
                  </div>
                  <span className="text-emerald-400 font-bold uppercase leading-none font-bold">Resolved</span>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Spatial Node Inspector details & Splittports (4 Cols) */}
          <div className="xl:col-span-4 flex flex-col space-y-4">
            
            {/* Spatial Inspector Panel */}
            <div className="bg-[#161b22]/70 border border-[#30363d] rounded-2xl p-4 flex flex-col space-y-3.5 shadow-lg select-none">
              <div className="flex items-center justify-between border-b border-[#30363d] pb-2">
                <span className="text-[10px] font-mono uppercase font-bold text-white tracking-wider flex items-center space-x-1">
                  <Sliders className="w-3.5 h-3.5 text-blue-400" />
                  <span>Mesh Element Inspector</span>
                </span>
                <span className="text-[9px] font-mono text-gray-500">Edit values</span>
              </div>
              
              <div className="text-xs space-y-3 select-text font-mono">
                <div className="bg-[#0d1117] p-2 rounded-xl text-white font-bold text-center border border-[#30363d] text-[10px]">
                  Selected Mesh ID: <span className="text-blue-400 font-bold">{selectedNode}</span>
                </div>
                
                {/* Position sliders inputs settings */}
                <div className="space-y-2 bg-[#0d1117] p-3 rounded-xl border border-[#30363d]/50">
                  <span className="text-gray-400 text-[8.5px] uppercase block font-semibold leading-none mb-1 text-left">Translate Coordinates (X, Y, Z)</span>
                  
                  <div className="flex items-center justify-between space-x-2">
                    <span className="text-xs text-gray-500 w-4 font-bold">X:</span>
                    <input 
                      type="range" min="-5" max="5" step="0.05" value={transform.posX}
                      onChange={(e) => handleTransformChange("posX", parseFloat(e.target.value))}
                      className="flex-1 accent-blue-500 h-1 bg-gray-800 rounded cursor-pointer" 
                    />
                    <span className="text-white text-xs font-bold w-10 text-right">{transform.posX.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center justify-between space-x-2">
                    <span className="text-xs text-gray-500 w-4 font-bold">Y:</span>
                    <input 
                      type="range" min="-0.5" max="3" step="0.05" value={transform.posY}
                      onChange={(e) => handleTransformChange("posY", parseFloat(e.target.value))}
                      className="flex-1 accent-blue-500 h-1 bg-gray-800 rounded cursor-pointer" 
                    />
                    <span className="text-white text-xs font-bold w-10 text-right">{transform.posY.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center justify-between space-x-2">
                    <span className="text-xs text-gray-500 w-4 font-bold">Z:</span>
                    <input 
                      type="range" min="-5" max="5" step="0.05" value={transform.posZ}
                      onChange={(e) => handleTransformChange("posZ", parseFloat(e.target.value))}
                      className="flex-1 accent-blue-500 h-1 bg-gray-800 rounded cursor-pointer" 
                    />
                    <span className="text-white text-xs font-bold w-10 text-right">{transform.posZ.toFixed(2)}</span>
                  </div>
                </div>

                {/* Scale sliders parameters */}
                <div className="space-y-2 bg-[#0d1117] p-3 rounded-xl border border-[#30363d]/50">
                  <span className="text-gray-400 text-[8.5px] uppercase block font-semibold leading-none mb-1 text-left">Transform Scale Dimensions (X, Y, Z)</span>
                  
                  <div className="flex items-center justify-between space-x-2">
                    <span className="text-xs text-gray-500 w-12 font-bold">Width:</span>
                    <input 
                      type="range" min="0.1" max="4.5" step="0.05" value={transform.scaleX}
                      onChange={(e) => handleTransformChange("scaleX", parseFloat(e.target.value))}
                      className="flex-1 accent-blue-500 h-1 bg-gray-800 rounded cursor-pointer" 
                    />
                    <span className="text-white text-xs font-bold w-10 text-right">{transform.scaleX.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center justify-between space-x-2">
                    <span className="text-xs text-gray-500 w-12 font-bold">Height:</span>
                    <input 
                      type="range" min="0.1" max="4.5" step="0.05" value={transform.scaleY}
                      onChange={(e) => handleTransformChange("scaleY", parseFloat(e.target.value))}
                      className="flex-1 accent-blue-500 h-1 bg-gray-800 rounded cursor-pointer" 
                    />
                    <span className="text-white text-xs font-bold w-10 text-right">{transform.scaleY.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center justify-between space-x-2">
                    <span className="text-xs text-gray-500 w-12 font-bold">Depth:</span>
                    <input 
                      type="range" min="0.1" max="4.5" step="0.05" value={transform.scaleZ}
                      onChange={(e) => handleTransformChange("scaleZ", parseFloat(e.target.value))}
                      className="flex-1 accent-blue-500 h-1 bg-gray-800 rounded cursor-pointer" 
                    />
                    <span className="text-white text-xs font-bold w-10 text-right">{transform.scaleZ.toFixed(2)}</span>
                  </div>
                </div>

                {/* Shaders configs translucency */}
                <div className="flex items-center justify-between bg-[#0d1117] p-2.5 rounded-lg border border-[#30363d]/50 text-[10px]">
                  <span className="text-gray-400">Translucency Shader ID</span>
                  <span className="text-blue-400 font-bold uppercase">"WebGL_Glassvilla"</span>
                </div>
              </div>
              
              <button 
                onClick={() => {
                  setCompilerLogs(prev => [
                    ...prev,
                    { progress: 100, text: `[Material] Applied spatial translucent materials kit parameter profiles to selected target.` }
                  ]);
                }}
                className="w-full py-2 bg-[#0d1117] border border-[#30363d] rounded-xl text-[10px] font-bold text-gray-400 hover:text-white uppercase transition-all"
              >
                Apply Custom Shader Materials Kit
              </button>
            </div>

            {/* Splittport dual screens previews */}
            <div className="bg-[#161b22]/70 border border-[#30363d] rounded-2xl p-4 flex flex-col space-y-4 shadow-lg select-none">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase font-bold text-gray-400 tracking-wider block">Split Stereoscopic Dual View</span>
                <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[7px] font-mono font-bold rounded uppercase">
                  Quest Direct Link
                </span>
              </div>
              
              <p className="text-[9.5px] text-gray-500 leading-normal">
                Twin adjacent offsets render slightly shifted paths mimicking human pupillary disparity to yield stereoscopic VR perspective.
              </p>

              <div className="grid grid-cols-2 gap-2">
                
                {/* Left Eye */}
                <div className="bg-black border border-[#30363d]/50 rounded-xl relative overflow-hidden flex items-center justify-center p-2 h-16 shadow-inner">
                  <div 
                    className="absolute inset-0 bg-cover bg-center opacity-30 select-none scale-102" 
                    style={{ backgroundImage: "url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?fit=crop&w=320&q=40')" }} 
                  />
                  <div className="absolute top-1 left-2 text-[7px] font-mono text-gray-500 leading-none">LEFT-EYE LENS</div>
                  <span className="absolute bottom-1 right-2 text-[6.5px] font-mono text-blue-400 leading-none">Offset -0.22</span>
                  <div className="text-[9px] font-bold text-white z-10 tracking-widest uppercase">Goggles L</div>
                </div>

                {/* Right Eye */}
                <div className="bg-black border border-[#30363d]/50 rounded-xl relative overflow-hidden flex items-center justify-center p-2 h-16 shadow-inner">
                  <div 
                    className="absolute inset-0 bg-cover bg-center opacity-30 select-none scale-102" 
                    style={{ backgroundImage: "url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?fit=crop&w=320&q=40')" }} 
                  />
                  <div className="absolute top-1 left-2 text-[7px] font-mono text-gray-500 leading-none">RIGHT-EYE LENS</div>
                  <span className="absolute bottom-1 right-2 text-[6.5px] font-mono text-blue-400 leading-none">Offset +0.22</span>
                  <div className="text-[9px] font-bold text-white z-10 tracking-widest uppercase">Goggles R</div>
                </div>

              </div>

              <div className="space-y-1.5 shrink-0 select-none pt-1">
                <button 
                  onClick={handleBuildAllTargets}
                  className="w-full py-2 bg-blue-500 hover:bg-blue-600 font-bold rounded-xl text-white shadow shadow-blue-500/15 transition-all text-xs cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isBuildingTargets ? "animate-spin" : ""}`} />
                  <span>{isBuildingTargets ? `Building Goggles Targets: ${buildProgress}%` : "Compile & Build 3D targets"}</span>
                </button>
              </div>
            </div>

            {/* Connected target diagnostics logs */}
            <div className="bg-[#161b22]/50 border border-[#30363d]/50 rounded-2xl p-3 text-[9px] font-mono">
              <span className="text-[8.5px] text-gray-500 font-bold block uppercase leading-none mb-1.5 text-left">Spatial compiler logs</span>
              <div className="space-y-1 select-text text-left max-h-24 overflow-y-auto custom-scrollbar">
                {compilerLogs.slice(-3).map((log, index) => (
                  <div key={index} className="text-[#c9d1d9]/85 truncate flex items-center">
                    <span className="text-emerald-500 text-[10px] mr-1">✓</span>
                    <span>{log.text}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {activeTab === "Interactions Map" && (
        <div className="bg-[#161b22]/70 border border-[#30363d] rounded-2xl p-5 flex flex-col space-y-4 shadow-lg min-h-0 select-none">
          <div className="border-b border-[#30363d] pb-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
              <Compass className="w-4 h-4 text-purple-400" />
              <span>Quest / Vision Pro Physical Input Map</span>
            </h2>
            <p className="text-xs text-gray-500 mt-1">Configure virtual eye fixation matrices, collision coordinates, and tracking vectors.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-[#0f141c] p-4 rounded-xl border border-white/5 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono text-gray-500 uppercase font-bold tracking-wider block mb-1">Controller Hands Layout</span>
                <h3 className="text-white text-xs font-bold font-sans">Meta Touch Plus Vectors</h3>
                <div className="space-y-2 mt-4 font-mono text-[10px] text-gray-400 text-left">
                  <div className="flex justify-between border-b border-white/5 pb-1 select-text">
                    <span>Active Controllers:</span>
                    <span className="text-emerald-400 font-bold">Dual (L/R) Locked</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-1 select-text">
                    <span>Grip Press Level:</span>
                    <span>12% accuracy</span>
                  </div>
                  <div className="flex justify-between select-text">
                    <span>Tracking standard:</span>
                    <span className="text-blue-400">OpenXR Profile</span>
                  </div>
                </div>
              </div>
              <button className="mt-4 px-3 py-1.5 bg-[#161b22] border border-[#30363d] hover:border-gray-500 rounded-xl text-[10px] font-bold text-gray-300">
                Calibrate Spatial Remap
              </button>
            </div>

            <div className="bg-[#0f141c] p-4 rounded-xl border border-white/5 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono text-gray-500 uppercase font-bold tracking-wider block mb-1">Human Eye Gaze Engine</span>
                <h3 className="text-white text-xs font-bold font-sans">Vision Pro Foveated Target</h3>
                <div className="space-y-2 mt-4 font-mono text-[10px] text-gray-400 text-left">
                  <div className="flex justify-between border-b border-white/5 pb-1 select-text">
                    <span>Pupil Target Point:</span>
                    <span className="text-blue-400 font-bold">[0.21, 1.48, -0.92]</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-1 select-text">
                    <span>Fixation Threshold:</span>
                    <span>320 ms lock</span>
                  </div>
                  <div className="flex justify-between select-text">
                    <span>Foveation Resolution:</span>
                    <span className="text-emerald-400">120 FPS high-detail</span>
                  </div>
                </div>
              </div>
              <button className="mt-4 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 rounded-xl text-[10px] font-bold text-white transition-colors">
                Run Calibration Screen
              </button>
            </div>

            <div className="bg-[#0f141c] p-4 rounded-xl border border-white/5 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono text-gray-500 uppercase font-bold tracking-wider block mb-1">Collision Boundary</span>
                <h3 className="text-white text-xs font-bold font-sans">Passthrough Safe Zone Guardian</h3>
                <div className="space-y-2 mt-4 font-mono text-[10px] text-gray-400 text-left">
                  <div className="flex justify-between border-b border-white/5 pb-1 select-text">
                    <span>Guardian Sphere:</span>
                    <span className="text-amber-500 font-bold">2.4m Safe Octree</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-1 select-text">
                    <span>Proximity Alerts:</span>
                    <span>Sofa & Table within mesh</span>
                  </div>
                  <div className="flex justify-between select-text">
                    <span>Safety Standard:</span>
                    <span className="text-emerald-400">Class 1 CE Compliant</span>
                  </div>
                </div>
              </div>
              <button className="mt-4 px-3 py-1.5 bg-[#161b22] border border-[#30363d] hover:border-gray-500 rounded-xl text-[10px] font-bold text-gray-300">
                Configure Obstacles
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "Automation Node" && (
        <div className="bg-[#161b22]/70 border border-[#30363d] rounded-2xl p-5 flex flex-col space-y-4 shadow-lg min-h-0">
          <div className="border-b border-[#30363d] pb-3 flex justify-between items-center select-none">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
                <Workflow className="w-4 h-4 text-blue-400 mr-1.5" />
                <span>Device Proximity Automation Scripting Node</span>
              </h2>
              <p className="text-xs text-gray-500 mt-1">Hook Quest trigger indicators into custom lighting changes or sound wave frequencies.</p>
            </div>
            <button 
              onClick={() => {
                const triggerPrompt = prompt("Enter custom Trigger event name:", "On Teleport Hover");
                const actionPrompt = prompt("Enter custom automation Action outcome:", "Glow Glass Wall translucent");
                if (triggerPrompt && actionPrompt) {
                  setAutomationRules(prev => [
                    ...prev,
                    { trigger: triggerPrompt, source: "Spatial Vector", action: actionPrompt, active: true }
                  ]);
                }
              }}
              className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 rounded-xl text-xs font-bold text-white flex items-center space-x-1.5 cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Compile Rule</span>
            </button>
          </div>

          <div className="space-y-3">
            {automationRules.map((rule, idx) => (
              <div key={idx} className="bg-[#0f141c] p-4 rounded-xl border border-white/5 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-9 h-9 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    <Gamepad2 className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="text-left font-mono">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-white font-bold">{rule.trigger}</span>
                      <span className="text-[8px] bg-blue-500/10 text-blue-300 px-1 py-0.2 rounded font-semibold uppercase">{rule.source}</span>
                    </div>
                    <p className="text-[10px] text-gray-500 font-sans mt-1">
                      Action outcome mapped: <span className="text-blue-400 font-bold">{rule.action}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 select-none">
                  <button 
                    onClick={() => {
                      setAutomationRules(prev => prev.map((item, i) => i === idx ? { ...item, active: !item.active } : item));
                    }}
                    className={`px-3 py-1.5 rounded-xl font-bold font-mono text-[9.5px] uppercase tracking-wide cursor-pointer border ${
                      rule.active 
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                        : "bg-gray-800/10 border-gray-800 text-gray-500"
                    }`}
                  >
                    {rule.active ? "✓ Active Listener" : "● Offline Pool"}
                  </button>

                  <button 
                    onClick={() => {
                      setAutomationRules(prev => prev.filter((_, i) => i !== idx));
                    }}
                    className="p-2 text-gray-500 hover:text-red-400 hover:bg-white/5 rounded-lg cursor-pointer"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "Target Build" && (
        <div className="bg-[#161b22]/70 border border-[#30363d] rounded-2xl p-5 flex flex-col space-y-4 shadow-lg min-h-0 select-none text-left">
          <div className="border-b border-[#30363d] pb-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
              <Cpu className="w-4 h-4 text-blue-400" />
              <span>Project Build and Target Compilations</span>
            </h2>
            <p className="text-xs text-gray-500 mt-1">Bundle and export your interactive 3D spatial scenes onto real consumer physical headsets.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              { id: "vision", name: "Apple Vision Pro OS Simulator", spec: "visionOS 2.1 • Translucent Glass Shader", buildable: true, progressValue: isBuildingTargets ? buildProgress : 100 },
              { id: "quest", name: "Meta Quest 3/Pro Goggles SDK", spec: "Android OpenXR Target • APK Output", buildable: true, progressValue: isBuildingTargets ? buildProgress : 100 },
              { id: "webxr", name: "WebXR Standard Sandbox Chrome", spec: "Stereoscopic Canvas API • Cross-browser compatible", buildable: false, progressValue: 100 }
            ].map((target, idx) => (
              <div key={idx} className="bg-[#0f141c] p-4.5 rounded-xl border border-[#30363d] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 font-bold text-xs">{target.name}</span>
                    <span className="text-[8.5px] font-mono text-gray-500">{target.spec}</span>
                  </div>

                  <div className="h-2 w-full bg-[#161b22] rounded-full overflow-hidden mb-4 border border-[#30363d]">
                    <div 
                      className="bg-blue-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${target.progressValue}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-gray-500">
                    {target.progressValue === 100 ? "Ready to deploy" : `Building pipeline: ${target.progressValue}%`}
                  </span>
                  
                  <button 
                    onClick={handleBuildAllTargets}
                    disabled={isBuildingTargets}
                    className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-bold rounded-xl text-[10px] tracking-wide uppercase transition-all"
                  >
                    🚀 Trigger Compilation Build
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

        </div>
      </StudioNode>
    </StudioShell>
  );
}
