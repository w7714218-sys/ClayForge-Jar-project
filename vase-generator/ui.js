import { profile, state, resetProfile, randomProfile, getModelInfo } from "./state.js";
import { rebuildVase } from "./scene.js";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
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
function screenPoint(point){
    const topMargin = margin * 2;
    const safeY = Math.max(topMargin, Math.min(canvas.height - margin, canvas.height - margin - point.y * state.profileScale));
    const safeX = Math.min(canvas.width - margin, margin + point.r * state.profileScale);
    return{
        x:safeX,
        y:safeY
    };
}
function pointFromScreen(x,y){
    const maxY = Math.max(2.8, ...profile.map(p => p.y));
    const topMargin = margin * 2;
    return{
        y:Math.max(0, Math.min(maxY, (canvas.height-topMargin-y)/state.profileScale)),
        r:Math.max(0.03, Math.min(0.9, (x-margin)/state.profileScale))
    };
}
export function drawProfile(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle="#111";
    ctx.fillRect(0,0,canvas.width,canvas.height);
    // Cuadrícula
    ctx.strokeStyle="#222";
    for(let x=0;x<canvas.width;x+=25){
        ctx.beginPath();
        ctx.moveTo(x,0);
        ctx.lineTo(x,canvas.height);
        ctx.stroke();
    }
    for(let y=0;y<canvas.height;y+=25){
        ctx.beginPath();
        ctx.moveTo(0,y);
        ctx.lineTo(canvas.width,y);
        ctx.stroke();
    }
    // Eje
    ctx.strokeStyle="#555";
    ctx.lineWidth=2;
    ctx.beginPath();
    ctx.moveTo(margin,0);
    ctx.lineTo(margin,canvas.height);
    ctx.stroke();
    // Perfil
    ctx.beginPath();
    profile.forEach((p,i)=>{
        const s=screenPoint(p);
        if(i===0)
            ctx.moveTo(s.x,s.y);
        else
            ctx.lineTo(s.x,s.y);
    });
    ctx.strokeStyle="#00bfff";
    ctx.lineWidth=3;
    ctx.stroke();
    // Área
    ctx.beginPath();
    profile.forEach((p,i)=>{
        const s=screenPoint(p);
        if(i===0)
            ctx.moveTo(margin,s.y);
        ctx.lineTo(s.x,s.y);
    });
    const last=screenPoint(profile[profile.length-1]);
    ctx.lineTo(margin,last.y);
    ctx.closePath();
    ctx.fillStyle="rgba(0,180,255,.08)";
    ctx.fill();
    // Puntos
    profile.forEach((p,i)=>{
        const s=screenPoint(p);
        ctx.beginPath();
        ctx.arc(s.x,s.y,6,0,Math.PI*2);
        ctx.fillStyle=
        i===state.selectedPoint
        ? "#ffb300"
        : "#ffffff";
        ctx.fill();
        ctx.strokeStyle="#00bfff";
        ctx.lineWidth=2;
        ctx.stroke();
    });
    updateInfo();
}
function updateInfo(){
    const info=getModelInfo();
    infoHeight.textContent=info.height+" mm";
    infoDiameter.textContent=info.diameter+" mm";
    if(state.vase){
        let vertexCount = 0;
        state.vase.traverse((child)=>{
            if(child.isMesh && child.geometry?.attributes?.position){
                vertexCount += child.geometry.attributes.position.count;
            }
        });
        infoVertices.textContent=vertexCount;
    }
}
export function initEditor(){
    canvas.style.touchAction = "none";
    const startDrag = (event) => {
        event.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        let hit = -1;
        let bestDistance = 12;
        profile.forEach((point,index)=>{
            const screen = screenPoint(point);
            const distance = Math.hypot(screen.x - x, screen.y - y);
            if(distance < bestDistance){
                bestDistance = distance;
                hit = index;
            }
        });
        if(hit >= 0){
            state.selectedPoint = hit;
            activePoint = profile[hit];
            canvas.style.cursor = "grabbing";
            canvas.setPointerCapture?.(event.pointerId);
            drawProfile();
        }
    };
    const moveDrag = (event) => {
        if(!activePoint || state.selectedPoint < 0){
            return;
        }
        event.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const next = pointFromScreen(x,y);
        activePoint.r = next.r;
        activePoint.y = next.y;
        profile.sort((a,b)=>a.y-b.y);
        state.selectedPoint = profile.indexOf(activePoint);
        rebuildVase();
        drawProfile();
    };

    const endDrag = (event) => {
        activePoint = null;
        canvas.style.cursor = "crosshair";
        if(canvas.hasPointerCapture?.(event.pointerId)){
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
        if(!activePoint){
            return;
        }
        activePoint = null;
        canvas.style.cursor = "crosshair";
    });
    canvas.addEventListener("touchstart", (event) => {
        if(event.touches.length > 0){
            const touch = event.touches[0];
            startDrag({
                clientX: touch.clientX,
                clientY: touch.clientY,
                pointerId: 0
            });
        }
    }, { passive: false });
    canvas.addEventListener("touchmove", (event) => {
        if(event.touches.length > 0){
            const touch = event.touches[0];
            moveDrag({
                clientX: touch.clientX,
                clientY: touch.clientY,
                pointerId: 0
            });
        }
    }, { passive: false });
    canvas.addEventListener("touchend", endDrag, { passive: false });
    heightSlider.oninput=()=>{
        state.height=Number(heightSlider.value);
        heightValue.textContent=state.height+" mm";
        rebuildVase();
        drawProfile();
    };
    wallSlider.oninput=()=>{
        state.wallThickness=Number(wallSlider.value);
        wallValue.textContent=state.wallThickness+" mm";
        rebuildVase();
        drawProfile();
    };
    segmentSlider.oninput=()=>{
        state.latheSegments=
        Number(segmentSlider.value);
        segmentValue.textContent=
        state.latheSegments;
        rebuildVase();
        drawProfile();
    };
    spiralEnabled.onchange=()=>{
        state.spiralEnabled = spiralEnabled.checked;
        rebuildVase();
    };
    spiralTurns.oninput=()=>{
        state.spiralTurns = Number(spiralTurns.value);
        spiralTurnsValue.textContent = state.spiralTurns;
        rebuildVase();
    };
    spiralAmplitude.oninput=()=>{
        state.spiralAmplitude = Number(spiralAmplitude.value);
        spiralAmplitudeValue.textContent = state.spiralAmplitude;
        rebuildVase();
    };
    resetBtn.onclick=()=>{
        resetProfile();
        rebuildVase();
        drawProfile();
    };
    randomBtn.onclick=()=>{
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