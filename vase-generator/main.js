import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";

const defaultProfile = [
    { y: 0.00, r: 0.18 },
    { y: 0.20, r: 0.25 },
    { y: 0.50, r: 0.45 },
    { y: 1.00, r: 0.55 },
    { y: 1.40, r: 0.42 },
    { y: 1.80, r: 0.32 },
    { y: 2.20, r: 0.38 },
    { y: 2.50, r: 0.50 },
    { y: 2.80, r: 0.40 }
];

const profile = structuredClone(defaultProfile);

const state = {
    vase: null,
    selectedPoint: -1,
    dragging: false,
    profileScale: 180,
    height: 220,
    wallThickness: 3,
    baseThickness: 5,
    latheSegments: 128,
    smoothness: 64,
    spiralEnabled: false,
    spiralTurns: 3,
    spiralAmplitude: 0.08,
    showGrid: true,
    showPoints: true,
    showWireframe: false,
    autoRotate: false
};

function resetProfile() {
    profile.length = 0;
    defaultProfile.forEach(p => {
        profile.push({ y: p.y, r: p.r });
    });
}

function randomProfile() {
    profile.length = 0;
    const count = 8 + Math.floor(Math.random() * 5);
    let y = 0;
    for (let i = 0; i < count; i++) {
        profile.push({ y, r: 0.18 + Math.random() * 0.45 });
        y += 2.8 / (count - 1);
    }
}

function getModelInfo() {
    let maxRadius = 0;
    profile.forEach(p => {
        if (p.r > maxRadius) maxRadius = p.r;
    });
    return {
        height: state.height,
        diameter: Math.round(maxRadius * 2 * 100),
        points: profile.length,
        segments: state.latheSegments
    };
}

function buildCurve() {
    const curvePoints = profile.map(p => new THREE.Vector3(p.r, p.y, 0));
    const curve = new THREE.CatmullRomCurve3(curvePoints);
    return curve.getPoints(state.smoothness);
}

function buildLathePoints() {
    const smooth = buildCurve();
    const radiusScale = Math.max(1, Math.min(3, state.height * 0.01));
    const heightScale = (state.height / 80) / Math.max(1, profile[profile.length - 1].y);
    const wall = Math.max(0.2, Number(state.wallThickness) * 0.1);
    const ribAmplitude = Math.max(0.02, Math.min(0.2, wall * 0.16));
    const outerPath = [];
    const innerPath = [];
    
    smooth.forEach((point, index) => {
        const y = point.y * heightScale;
        const baseRadius = point.x * radiusScale;
        const ripple = Math.sin(y * 0.018 + index * 0.32) * ribAmplitude;
        const outerRadius = Math.max(0.2, baseRadius + ripple);
        outerPath.push(new THREE.Vector2(outerRadius, y));
    });
    
    outerPath.slice().reverse().forEach((point) => {
        const innerRadius = Math.max(0.1, point.x - wall);
        innerPath.push(new THREE.Vector2(innerRadius, point.y));
    });
    
    return [
        new THREE.Vector2(0, 0),
        ...outerPath,
        ...innerPath,
        new THREE.Vector2(0, 0)
    ];
}

function createGeometry() {
    const lathePoints = buildLathePoints();
    const geometry = new THREE.LatheGeometry(lathePoints, state.latheSegments);
    
    if (state.spiralEnabled) {
        const positions = geometry.attributes.position;
        const vertexCount = positions.count;
        const maxHeight = state.height / 80;
        
        for (let i = 0; i < vertexCount; i++) {
            const x = positions.getX(i);
            const y = positions.getY(i);
            const z = positions.getZ(i);
            const currentRadius = Math.sqrt(x * x + z * z);
            if (currentRadius < 0.15) continue;
            
            const currentAngle = Math.atan2(z, x);
            const heightRatio = Math.max(0, Math.min(1, y / maxHeight));
            const spiralPhase = (currentAngle * state.spiralTurns + heightRatio * state.spiralTurns * Math.PI * 2);
            const radiusModulation = Math.cos(spiralPhase * 2) * state.spiralAmplitude;
            const newRadius = currentRadius + radiusModulation;
            
            positions.setX(i, Math.cos(currentAngle) * newRadius);
            positions.setZ(i, Math.sin(currentAngle) * newRadius);
        }
        positions.needsUpdate = true;
    }
    
    geometry.computeVertexNormals();
    return geometry;
}

function createMaterial() {
    return new THREE.MeshPhysicalMaterial({
        color: 0xd6a46a,
        roughness: 0.72,
        metalness: 0,
        clearcoat: 0.15,
        clearcoatRoughness: 0.8
    });
}

function createVase() {
    const body = new THREE.Mesh(createGeometry(), createMaterial());
    body.castShadow = true;
    body.receiveShadow = true;
    const group = new THREE.Group();
    group.add(body);
    return group;
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2d3138);

const camera = new THREE.PerspectiveCamera(45, (window.innerWidth - 340) / window.innerHeight, 0.1, 100);
camera.position.set(3.5, 2.8, 4.5);

const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector("#bg"), antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth - 340, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

const ambient = new THREE.HemisphereLight(0xffffff, 0x555555, 1.5);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xffffff, 2.4);
sun.position.set(6, 8, 6);
sun.castShadow = true;
sun.shadow.mapSize.width = 2048;
sun.shadow.mapSize.height = 2048;
sun.shadow.camera.left = -6;
sun.shadow.camera.right = 6;
sun.shadow.camera.top = 6;
sun.shadow.camera.bottom = -6;
scene.add(sun);

const fill = new THREE.DirectionalLight(0xffffff, 0.6);
fill.position.set(-4, 2, 5);
scene.add(fill);

const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: 0.18 }));
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const grid = new THREE.GridHelper(30, 30, 0x666666, 0x444444);
grid.position.y = -0.001;
scene.add(grid);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.target.set(0, state.height / 2, 0);
controls.minDistance = 0.5;
controls.maxDistance = 500;
controls.maxPolarAngle = Math.PI / 2;

function disposeObject(object) {
    if (!object) return;
    if (object.geometry) object.geometry.dispose();
    if (Array.isArray(object.material)) {
        object.material.forEach(material => material.dispose());
    } else if (object.material) {
        object.material.dispose();
    }
    object.children?.forEach(child => disposeObject(child));
}

function rebuildVase() {
    if (state.vase) {
        scene.remove(state.vase);
        disposeObject(state.vase);
    }
    state.vase = createVase();
    state.vase.castShadow = true;
    state.vase.receiveShadow = true;
    const vaseHeight = state.height / 80;
    controls.target.set(0, vaseHeight * 0.5, 0);
    camera.position.set(0, vaseHeight * 0.5 + 2, vaseHeight * 0.5 + 4);
    scene.add(state.vase);
}

function animate() {
    requestAnimationFrame(animate);
    if (state.autoRotate) state.vase.rotation.y += 0.003;
    controls.update();
    renderer.render(scene, camera);
}

window.addEventListener("resize", () => {
    camera.aspect = (window.innerWidth - 340) / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth - 340, window.innerHeight);
});

const canvas = document.getElementById("profileCanvas");
const ctx = canvas.getContext("2d");
const margin = 25;
let activePoint = null;

const heightSlider = document.getElementById("heightSlider");
const wallSlider = document.getElementById("wallSlider");
const segmentSlider = document.getElementById("segmentSlider");
const heightValue = document.getElementById("heightValue");
const wallValue = document.getElementById("wallValue");
const segmentValue = document.getElementById("segmentValue");
const spiralEnabled = document.getElementById("spiralEnabled");
const spiralTurns = document.getElementById("spiralTurns");
const spiralAmplitude = document.getElementById("spiralAmplitude");
const spiralTurnsValue = document.getElementById("spiralTurnsValue");
const spiralAmplitudeValue = document.getElementById("spiralAmplitudeValue");
const infoHeight = document.getElementById("infoHeight");
const infoDiameter = document.getElementById("infoDiameter");
const infoVertices = document.getElementById("infoVertices");
const resetBtn = document.getElementById("resetBtn");
const randomBtn = document.getElementById("randomBtn");
const exportBtn = document.getElementById("exportBtn");

function resizeCanvas() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
}

resizeCanvas();
window.addEventListener("resize", () => {
    resizeCanvas();
    drawProfile();
});

function screenPoint(point) {
    const topMargin = margin * 2;
    const safeY = Math.max(topMargin, Math.min(canvas.height - margin, canvas.height - margin - point.y * state.profileScale));
    const safeX = Math.min(canvas.width - margin, margin + point.r * state.profileScale);
    return { x: safeX, y: safeY };
}

function pointFromScreen(x, y) {
    const maxY = Math.max(2.8, ...profile.map(p => p.y));
    const topMargin = margin * 2;
    return {
        y: Math.max(0, Math.min(maxY, (canvas.height - topMargin - y) / state.profileScale)),
        r: Math.max(0.03, Math.min(0.9, (x - margin) / state.profileScale))
    };
}

function drawProfile() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = "#222";
    for (let x = 0; x < canvas.width; x += 25) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 25) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    
    ctx.strokeStyle = "#555";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(margin, 0);
    ctx.lineTo(margin, canvas.height);
    ctx.stroke();
    
    ctx.beginPath();
    profile.forEach((p, i) => {
        const s = screenPoint(p);
        if (i === 0) ctx.moveTo(s.x, s.y);
        else ctx.lineTo(s.x, s.y);
    });
    ctx.strokeStyle = "#00bfff";
    ctx.lineWidth = 3;
    ctx.stroke();
    
    ctx.beginPath();
    profile.forEach((p, i) => {
        const s = screenPoint(p);
        if (i === 0) ctx.moveTo(margin, s.y);
        ctx.lineTo(s.x, s.y);
    });
    const last = screenPoint(profile[profile.length - 1]);
    ctx.lineTo(margin, last.y);
    ctx.closePath();
    ctx.fillStyle = "rgba(0,180,255,.08)";
    ctx.fill();
    
    profile.forEach((p, i) => {
        const s = screenPoint(p);
        ctx.beginPath();
        ctx.arc(s.x, s.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = i === state.selectedPoint ? "#ffb300" : "#ffffff";
        ctx.fill();
        ctx.strokeStyle = "#00bfff";
        ctx.lineWidth = 2;
        ctx.stroke();
    });
    
    updateInfo();
}

function updateInfo() {
    const info = getModelInfo();
    infoHeight.textContent = info.height + " mm";
    infoDiameter.textContent = info.diameter + " mm";
    if (state.vase) {
        let vertexCount = 0;
        state.vase.traverse((child) => {
            if (child.isMesh && child.geometry?.attributes?.position) {
                vertexCount += child.geometry.attributes.position.count;
            }
        });
        infoVertices.textContent = vertexCount;
    }
}

function initEditor() {
    canvas.style.touchAction = "none";
    
    const startDrag = (event) => {
        event.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        let hit = -1;
        let bestDistance = 12;
        
        profile.forEach((point, index) => {
            const screen = screenPoint(point);
            const distance = Math.hypot(screen.x - x, screen.y - y);
            if (distance < bestDistance) {
                bestDistance = distance;
                hit = index;
            }
        });
        
        if (hit >= 0) {
            state.selectedPoint = hit;
            activePoint = profile[hit];
            canvas.style.cursor = "grabbing";
            canvas.setPointerCapture?.(event.pointerId);
            drawProfile();
        }
    };
    
    const moveDrag = (event) => {
        if (!activePoint || state.selectedPoint < 0) return;
        event.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const next = pointFromScreen(x, y);
        activePoint.r = next.r;
        activePoint.y = next.y;
        profile.sort((a, b) => a.y - b.y);
        state.selectedPoint = profile.indexOf(activePoint);
        rebuildVase();
        drawProfile();
    };
    
    const endDrag = (event) => {
        activePoint = null;
        canvas.style.cursor = "crosshair";
        if (canvas.hasPointerCapture?.(event.pointerId)) {
            canvas.releasePointerCapture(event.pointerId);
        }
    };
    
    canvas.addEventListener("pointerdown", startDrag);
    canvas.addEventListener("mousedown", startDrag);
    window.addEventListener("pointermove", moveDrag);
    window.addEventListener("mousemove", moveDrag);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("mouseup", endDrag);
    
    canvas.addEventListener("pointerleave", () => {
        if (!activePoint) return;
        activePoint = null;
        canvas.style.cursor = "crosshair";
    });
    
    canvas.addEventListener("touchstart", (event) => {
        if (event.touches.length > 0) {
            const touch = event.touches[0];
            startDrag({ clientX: touch.clientX, clientY: touch.clientY, pointerId: 0 });
        }
    }, { passive: false });
    
    canvas.addEventListener("touchmove", (event) => {
        if (event.touches.length > 0) {
            const touch = event.touches[0];
            moveDrag({ clientX: touch.clientX, clientY: touch.clientY, pointerId: 0 });
        }
    }, { passive: false });
    
    canvas.addEventListener("touchend", endDrag, { passive: false });
    
    heightSlider.oninput = () => {
        state.height = Number(heightSlider.value);
        heightValue.textContent = state.height + " mm";
        rebuildVase();
        drawProfile();
    };
    
    wallSlider.oninput = () => {
        state.wallThickness = Number(wallSlider.value);
        wallValue.textContent = state.wallThickness + " mm";
        rebuildVase();
        drawProfile();
    };
    
    segmentSlider.oninput = () => {
        state.latheSegments = Number(segmentSlider.value);
        segmentValue.textContent = state.latheSegments;
        rebuildVase();
        drawProfile();
    };
    
    spiralEnabled.onchange = () => {
        state.spiralEnabled = spiralEnabled.checked;
        rebuildVase();
    };
    
    spiralTurns.oninput = () => {
        state.spiralTurns = Number(spiralTurns.value);
        spiralTurnsValue.textContent = state.spiralTurns;
        rebuildVase();
    };
    
    spiralAmplitude.oninput = () => {
        state.spiralAmplitude = Number(spiralAmplitude.value);
        spiralAmplitudeValue.textContent = state.spiralAmplitude;
        rebuildVase();
    };
    
    resetBtn.onclick = () => {
        resetProfile();
        rebuildVase();
        drawProfile();
    };
    
    randomBtn.onclick = () => {
        randomProfile();
        rebuildVase();
        drawProfile();
    };
    
    exportBtn.onclick = () => {
        const exporter = new STLExporter();
        const output = exporter.parse(state.vase, { binary: true });
        const blob = new Blob([output], { type: "application/sla" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "vase.stl";
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    };
    
    drawProfile();
}

rebuildVase();
drawProfile();
initEditor();
animate();
