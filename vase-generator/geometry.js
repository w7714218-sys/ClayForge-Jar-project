import * as THREE from "three";
import { profile, state } from "./state.js";

// =====================================
// CURVA SUAVIZADA
// =====================================

function buildCurve() {

    const curvePoints = profile.map(p =>
        new THREE.Vector3(p.r, p.y, 0)
    );

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

// =====================================
// GEOMETRÍA
// =====================================

export function createGeometry() {

    const lathePoints = buildLathePoints();

    const geometry = new THREE.LatheGeometry(
        lathePoints,
        state.latheSegments
    );

    // Apply spiral effect if enabled
    if (state.spiralEnabled) {
        const positions = geometry.attributes.position;
        const vertexCount = positions.count;
        const maxHeight = state.height / 80;

        for (let i = 0; i < vertexCount; i++) {
            const x = positions.getX(i);
            const y = positions.getY(i);
            const z = positions.getZ(i);

            // Skip center vertices (radius near 0)
            const currentRadius = Math.sqrt(x * x + z * z);
            if (currentRadius < 0.15) continue;

            // Calculate current angle
            const currentAngle = Math.atan2(z, x);

            // Calculate spiral phase based on angle and height
            const heightRatio = Math.max(0, Math.min(1, y / maxHeight));
            const spiralPhase = (currentAngle * state.spiralTurns + heightRatio * state.spiralTurns * Math.PI * 2);

            // Create spiral ridges using cosine - more pronounced effect
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

// =====================================
// MATERIAL
// =====================================

export function createMaterial() {

    return new THREE.MeshPhysicalMaterial({

        color: 0xd6a46a,

        roughness: 0.72,

        metalness: 0,

        clearcoat: 0.15,

        clearcoatRoughness: 0.8

    });

}

// =====================================
// CREA EL JARRÓN
// =====================================

export function createVase() {

    const body = new THREE.Mesh(

        createGeometry(),

        createMaterial()

    );

    body.castShadow = true;
    body.receiveShadow = true;

    const group = new THREE.Group();
    group.add(body);

    return group;

}

// =====================================
// ACTUALIZA EL MATERIAL
// =====================================

export function updateMaterial(mesh){

    mesh.traverse((child)=>{

        if(child.isMesh && child.material){

            child.material.wireframe = state.showWireframe;

        }

    });

}