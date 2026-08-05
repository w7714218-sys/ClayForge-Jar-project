import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import { createVase } from "./geometry.js";
import { state } from "./state.js";

// ======================================
// ESCENA
// ======================================

export const scene = new THREE.Scene();

scene.background = new THREE.Color(0x2d3138);

// ======================================
// CÁMARA
// ======================================

export const camera = new THREE.PerspectiveCamera(

    45,

    (window.innerWidth - 340) / window.innerHeight,

    0.1,

    100

);

camera.position.set(3.5, 2.8, 4.5);

// ======================================
// RENDERER
// ======================================

export const renderer = new THREE.WebGLRenderer({

    canvas: document.querySelector("#bg"),

    antialias: true

});

renderer.setPixelRatio(window.devicePixelRatio);

renderer.setSize(

    window.innerWidth - 340,

    window.innerHeight

);

renderer.shadowMap.enabled = true;

renderer.shadowMap.type = THREE.PCFShadowMap;

// ======================================
// LUCES
// ======================================

// Ambiente

const ambient = new THREE.HemisphereLight(

    0xffffff,

    0x555555,

    1.5

);

scene.add(ambient);

// Sol

const sun = new THREE.DirectionalLight(

    0xffffff,

    2.4

);

sun.position.set(6,8,6);

sun.castShadow = true;

sun.shadow.mapSize.width = 2048;
sun.shadow.mapSize.height = 2048;

sun.shadow.camera.left = -6;
sun.shadow.camera.right = 6;
sun.shadow.camera.top = 6;
sun.shadow.camera.bottom = -6;

scene.add(sun);

// Luz frontal

const fill = new THREE.DirectionalLight(

    0xffffff,

    0.6

);

fill.position.set(-4,2,5);

scene.add(fill);

// ======================================
// SUELO
// ======================================

const floor = new THREE.Mesh(

    new THREE.PlaneGeometry(30,30),

    new THREE.ShadowMaterial({

        opacity:0.18

    })

);

floor.rotation.x = -Math.PI/2;

floor.receiveShadow = true;

scene.add(floor);

// ======================================
// GRID
// ======================================

const grid = new THREE.GridHelper(

    30,

    30,

    0x666666,

    0x444444

);

grid.position.y=-0.001;

scene.add(grid);

// ======================================
// CONTROLES
// ======================================

export const controls = new OrbitControls(

    camera,

    renderer.domElement

);

controls.enableDamping = true;

controls.dampingFactor = 0.06;

controls.target.set(0, state.height / 2, 0);

controls.minDistance = 0.5;

controls.maxDistance = 500;

controls.maxPolarAngle = Math.PI/2;

// ======================================
// JARRÓN
// ======================================

function disposeObject(object){

    if(!object){

        return;

    }

    if(object.geometry){

        object.geometry.dispose();

    }

    if(Array.isArray(object.material)){

        object.material.forEach(material => material.dispose());

    }
    else if(object.material){

        object.material.dispose();

    }

    object.children?.forEach(child => disposeObject(child));

}

export function rebuildVase(){

    if(state.vase){

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

// ======================================
// ANIMACIÓN
// ======================================

export function animate(){

    requestAnimationFrame(animate);

    if(state.autoRotate){

        state.vase.rotation.y += 0.003;

    }

    controls.update();

    renderer.render(scene,camera);

}

// ======================================
// RESIZE
// ======================================

window.addEventListener("resize",()=>{

    camera.aspect =

        (window.innerWidth-340)/window.innerHeight;

    camera.updateProjectionMatrix();

    renderer.setSize(

        window.innerWidth-340,

        window.innerHeight

    );

});