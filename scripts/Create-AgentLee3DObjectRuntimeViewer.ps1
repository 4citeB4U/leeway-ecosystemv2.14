$ErrorActionPreference = "Stop"

$Root = "D:\Leeway-Ecosystem v2.1.4"
$JobId = "82abc3b1-9c41-4fa4-ba3a-6209fa3ed3eb"

$JobDir = Join-Path $Root "Archive\agent-lee-artifacts\true-character-3d-lane\true-mesh\$JobId"
$Viewer = Join-Path $JobDir "agent-lee-object-runtime.html"
$Proof = Join-Path $Root "Archive\proofs\true-character-3d-lane"

New-Item -ItemType Directory -Force -Path $Proof | Out-Null

$Glb = Join-Path $JobDir "model.glb"
$MeshObj = Join-Path $JobDir "mesh.obj"
$ModelObj = Join-Path $JobDir "model.obj"

if (-not (Test-Path $Glb)) {
  throw "Missing model.glb: $Glb"
}

if ((Test-Path $MeshObj) -and -not (Test-Path $ModelObj)) {
  Copy-Item -Force $MeshObj $ModelObj
}

@"
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Agent Lee 3D Object Runtime</title>

  <script type="importmap">
  {
    "imports": {
      "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
      "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
    }
  }
  </script>

  <style>
    html, body {
      margin: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #050505;
      color: white;
      font-family: Arial, sans-serif;
      user-select: none;
    }

    canvas {
      display: block;
    }

    #hud {
      position: fixed;
      top: 12px;
      left: 12px;
      z-index: 20;
      background: rgba(0,0,0,.78);
      border: 1px solid #333;
      border-radius: 12px;
      padding: 12px 14px;
      width: 430px;
      box-shadow: 0 0 30px rgba(0,0,0,.5);
    }

    #status {
      color: #ffe08a;
      margin-top: 8px;
      font-size: 14px;
    }

    button {
      background: #1b1b1b;
      color: #fff;
      border: 1px solid #444;
      border-radius: 8px;
      padding: 6px 8px;
      margin: 4px 4px 0 0;
      cursor: pointer;
    }

    button:hover {
      background: #303030;
    }

    a {
      color: #8fd3ff;
      margin-right: 10px;
      display: inline-block;
      margin-top: 8px;
    }

    #menu {
      position: fixed;
      z-index: 30;
      display: none;
      background: #101010;
      border: 1px solid #444;
      border-radius: 10px;
      box-shadow: 0 10px 40px rgba(0,0,0,.65);
      padding: 6px;
      min-width: 210px;
    }

    #menu button {
      display: block;
      width: 100%;
      text-align: left;
      margin: 0;
      border-radius: 6px;
      border: 0;
      background: transparent;
      padding: 9px 10px;
    }

    #menu button:hover {
      background: #242424;
    }

    #minihelp {
      position: fixed;
      right: 12px;
      bottom: 12px;
      z-index: 20;
      background: rgba(0,0,0,.68);
      border: 1px solid #333;
      border-radius: 12px;
      padding: 10px 12px;
      font-size: 13px;
      color: #ccc;
    }
  </style>
</head>

<body>
  <div id="hud">
    <b>Agent Lee 3D Object Runtime</b><br/>
    Job ID: <code>$JobId</code><br/>
    <span>Drag rotate | wheel zoom | right-click menu</span>

    <div>
      <button id="spinBtn">Spin On/Off</button>
      <button id="resetBtn">Reset</button>
      <button id="fitBtn">Fit Object</button>
      <button id="zoomInBtn">Zoom In</button>
      <button id="zoomOutBtn">Zoom Out</button>
      <button id="wireBtn">Wireframe</button>
      <button id="gridBtn">Grid</button>
      <button id="bgBtn">Background</button>
    </div>

    <div>
      <button id="rotXBtn">Rotate X 90</button>
      <button id="rotYBtn">Rotate Y 90</button>
      <button id="rotZBtn">Rotate Z 90</button>
      <button id="uprightBtn">Try Upright</button>
    </div>

    <div>
      <a href="./model.glb" download>Download GLB</a>
      <a href="./model.obj" download>Download OBJ</a>
      <a href="./mesh.obj" download>Original mesh.obj</a>
      <a href="./agent_lee_true_character_mesh_package.zip" download>ZIP</a>
    </div>

    <div id="status">Loading model.glb...</div>
  </div>

  <div id="menu">
    <button data-action="spin">Toggle Freestyle Spin</button>
    <button data-action="reset">Reset View</button>
    <button data-action="fit">Fit Object</button>
    <button data-action="zoomIn">Zoom In</button>
    <button data-action="zoomOut">Zoom Out</button>
    <button data-action="wire">Toggle Wireframe</button>
    <button data-action="grid">Toggle Grid</button>
    <button data-action="bg">Toggle Background</button>
    <button data-action="upright">Try Upright</button>
    <button data-action="screenshot">Save Screenshot</button>
  </div>

  <div id="minihelp">
    Right-click object area for controls.<br/>
    Keys: R reset | S spin | W wire | G grid
  </div>

  <script type="module">
    import * as THREE from "three";
    import { OrbitControls } from "three/addons/controls/OrbitControls.js";
    import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

    const status = document.getElementById("status");
    const menu = document.getElementById("menu");

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.001, 10000);
    camera.position.set(0, 0.8, 4);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = true;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.2;

    const hemi = new THREE.HemisphereLight(0xffffff, 0x222222, 2.4);
    scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 3.0);
    key.position.set(4, 6, 5);
    scene.add(key);

    const redFill = new THREE.DirectionalLight(0xff3344, 1.3);
    redFill.position.set(-4, 2, 4);
    scene.add(redFill);

    const blueFill = new THREE.DirectionalLight(0x4477ff, 1.0);
    blueFill.position.set(3, 1, -4);
    scene.add(blueFill);

    const grid = new THREE.GridHelper(6, 24, 0x333333, 0x171717);
    grid.position.y = -1.2;
    scene.add(grid);

    let model = null;
    let wire = false;
    let bgDark = true;

    function fitObject() {
      if (!model) return;

      const box = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();

      box.getSize(size);
      box.getCenter(center);

      model.position.sub(center);

      const maxDim = Math.max(size.x, size.y, size.z);
      if (maxDim > 0) {
        model.scale.setScalar(2.8 / maxDim);
      }

      controls.target.set(0, 0, 0);
      camera.position.set(0, 0.8, 4);
      controls.update();
    }

    function resetView() {
      camera.position.set(0, 0.8, 4);
      controls.target.set(0, 0, 0);
      controls.update();
    }

    function zoom(factor) {
      camera.position.multiplyScalar(factor);
      controls.update();
    }

    function toggleWire() {
      wire = !wire;
      if (!model) return;

      model.traverse((obj) => {
        if (obj.isMesh && obj.material) {
          obj.material.wireframe = wire;
          obj.material.needsUpdate = true;
        }
      });
    }

    function toggleGrid() {
      grid.visible = !grid.visible;
    }

    function toggleBackground() {
      bgDark = !bgDark;
      scene.background = new THREE.Color(bgDark ? 0x050505 : 0x2b2b2b);
    }

    function tryUpright() {
      if (!model) return;
      model.rotation.x += Math.PI / 2;
      fitObject();
    }

    function screenshot() {
      const link = document.createElement("a");
      link.download = "agent_lee_3d_object_screenshot.png";
      link.href = renderer.domElement.toDataURL("image/png");
      link.click();
    }

    const loader = new GLTFLoader();

    loader.load(
      "./model.glb",
      (gltf) => {
        model = gltf.scene;
        scene.add(model);

        let meshCount = 0;

        model.traverse((obj) => {
          if (obj.isMesh) {
            meshCount++;

            if (!obj.material) {
              obj.material = new THREE.MeshStandardMaterial({ color: 0x999999 });
            }

            obj.material.side = THREE.DoubleSide;
          }
        });

        fitObject();

        status.textContent = "Loaded. Mesh count: " + meshCount + ". Right-click for object controls.";
      },
      (xhr) => {
        if (xhr.total) {
          status.textContent = "Loading model.glb... " + Math.round((xhr.loaded / xhr.total) * 100) + "%";
        } else {
          status.textContent = "Loading model.glb... " + xhr.loaded + " bytes";
        }
      },
      (err) => {
        console.error(err);
        status.textContent = "FAILED loading model.glb. Press F12 and check Console.";
      }
    );

    document.getElementById("spinBtn").onclick = () => controls.autoRotate = !controls.autoRotate;
    document.getElementById("resetBtn").onclick = resetView;
    document.getElementById("fitBtn").onclick = fitObject;
    document.getElementById("zoomInBtn").onclick = () => zoom(0.82);
    document.getElementById("zoomOutBtn").onclick = () => zoom(1.18);
    document.getElementById("wireBtn").onclick = toggleWire;
    document.getElementById("gridBtn").onclick = toggleGrid;
    document.getElementById("bgBtn").onclick = toggleBackground;

    document.getElementById("rotXBtn").onclick = () => { if(model) model.rotation.x += Math.PI / 2; };
    document.getElementById("rotYBtn").onclick = () => { if(model) model.rotation.y += Math.PI / 2; };
    document.getElementById("rotZBtn").onclick = () => { if(model) model.rotation.z += Math.PI / 2; };
    document.getElementById("uprightBtn").onclick = tryUpright;

    window.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      menu.style.left = e.clientX + "px";
      menu.style.top = e.clientY + "px";
      menu.style.display = "block";
    });

    window.addEventListener("click", () => {
      menu.style.display = "none";
    });

    menu.addEventListener("click", (e) => {
      e.stopPropagation();
      const action = e.target.getAttribute("data-action");

      if (action === "spin") controls.autoRotate = !controls.autoRotate;
      if (action === "reset") resetView();
      if (action === "fit") fitObject();
      if (action === "zoomIn") zoom(0.82);
      if (action === "zoomOut") zoom(1.18);
      if (action === "wire") toggleWire();
      if (action === "grid") toggleGrid();
      if (action === "bg") toggleBackground();
      if (action === "upright") tryUpright();
      if (action === "screenshot") screenshot();

      menu.style.display = "none";
    });

    window.addEventListener("keydown", (e) => {
      const k = e.key.toLowerCase();
      if (k === "r") resetView();
      if (k === "s") controls.autoRotate = !controls.autoRotate;
      if (k === "w") toggleWire();
      if (k === "g") toggleGrid();
    });

    function animate() {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }

    animate();

    window.addEventListener("resize", () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  </script>
</body>
</html>
"@ | Set-Content -Path $Viewer -Encoding UTF8

$Receipt = @{
  verdict = "AGENT_LEE_OBJECT_RUNTIME_VIEWER_CREATED"
  job_id = $JobId
  viewer = $Viewer
  features = @(
    "right_click_menu",
    "auto_spin",
    "drag_rotate",
    "wheel_zoom",
    "reset_view",
    "wireframe_toggle",
    "grid_toggle",
    "background_toggle",
    "screenshot",
    "download_links"
  )
  note = "This improves interaction for the existing GLB. It does not fix bad mesh quality."
  created_at = (Get-Date).ToString("o")
}

$ReceiptPath = Join-Path $Proof ("AGENT_LEE_OBJECT_RUNTIME_VIEWER_CREATED_" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".receipt.json")
$Receipt | ConvertTo-Json -Depth 80 | Set-Content -Path $ReceiptPath -Encoding UTF8

Write-Host ""
Write-Host "Agent Lee object runtime viewer created." -ForegroundColor Green
Write-Host "Viewer: $Viewer" -ForegroundColor Cyan
Write-Host "Receipt: $ReceiptPath" -ForegroundColor Cyan
