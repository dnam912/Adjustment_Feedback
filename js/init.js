import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';

// =========================
// Global variables
// =========================
let aspect = window.innerWidth / window.innerHeight;
let scene, camera, renderer;

// =========================
// Constants
// =========================
const frustumSize = 125;


export function init() {
    // =========================
    // Create Scene
    // =========================
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xF5F5F5); // 0xF5F5F5

    // =========================
    // Create Camera
    // =========================
    camera = new THREE.OrthographicCamera(
        -frustumSize * aspect,  // left
        frustumSize * aspect,   // right
        frustumSize,            // top
        -frustumSize,           // bottom
        1,                      // near
        1000                    // far
    );
    camera.position.set(0, 0, 100); // move camera
    camera.lookAt(scene.position);  // Look at origin
    scene.add(camera);

    // =========================
    // Create Renderer
    // =========================
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    /* COMMENTS
        renderer.domElement is HTML canvas that three.js creates internally
        It means taking the canvas created by three.js and insert it into the webpage
        Instead of <canvas></canvas>
    */
    document.body.appendChild(renderer.domElement);

    window.addEventListener('resize', resize);
    //buildAudiogramView('L');
    //updateAxisLabels();
    animate();

    return { scene, camera, renderer }; // To return objects to main.js
}

export function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

export function resize() {
    console.log( 'width: ' + window.innerWidth, 'height: ' + window.innerHeight );
    aspect = window.innerWidth / window.innerHeight;

    camera.left = -frustumSize * aspect;
    camera.right = frustumSize * aspect;
    camera.top = frustumSize;
    camera.bottom = -frustumSize;

    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}