// =====================================
// CLAYFORGE - GLOBAL STATE
// =====================================

export const defaultProfile = [

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

export const profile = structuredClone(defaultProfile);

export const state = {

    // ---------- Three.js ----------

    vase: null,

    // ---------- Editor ----------

    selectedPoint: -1,

    dragging: false,

    profileScale: 180,

    // ---------- Dimensions ----------

    height: 220,

    wallThickness: 3,

    baseThickness: 5,

    // ---------- Geometry ----------

    latheSegments: 128,

    smoothness: 64,

    // ---------- Spirals ----------

    spiralEnabled: false,

    spiralTurns: 3,

    spiralAmplitude: 0.08,

    // ---------- Display ----------

    showGrid: true,

    showPoints: true,

    showWireframe: false,

    autoRotate: false

};

// =====================================
// RESET PROFILE
// =====================================

export function resetProfile(){

    profile.length = 0;

    defaultProfile.forEach(p=>{

        profile.push({

            y:p.y,

            r:p.r

        });

    });

}

// =====================================
// RANDOM PROFILE
// =====================================

export function randomProfile(){

    profile.length=0;

    const count=8+Math.floor(Math.random()*5);

    let y=0;

    for(let i=0;i<count;i++){

        profile.push({

            y,

            r:0.18+Math.random()*0.45

        });

        y+=2.8/(count-1);

    }

}

// =====================================
// MODEL INFO
// =====================================

export function getModelInfo(){

    let maxRadius=0;

    profile.forEach(p=>{

        if(p.r>maxRadius)

            maxRadius=p.r;

    });

    return{

        height:state.height,

        diameter:Math.round(maxRadius*2*100),

        points:profile.length,

        segments:state.latheSegments

    };

}