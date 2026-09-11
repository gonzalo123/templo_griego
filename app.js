import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/loaders/GLTFLoader.js';

const canvas = document.querySelector('#scene');
const loading = document.querySelector('#loading');
const loadingLabel = document.querySelector('#loading-label');
const errorBox = document.querySelector('#error');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#0d1725');
scene.fog = new THREE.Fog('#0d1725', 28, 68);
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 150);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.065;
controls.minDistance = 5;
controls.maxDistance = 42;
controls.maxPolarAngle = Math.PI * 0.49;
controls.target.set(0, 0, 3.5);

scene.add(new THREE.HemisphereLight('#f4dfbd', '#18283a', 2.0));
const key = new THREE.DirectionalLight('#ffe4bd', 4.4);
key.position.set(9, -13, 19);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
scene.add(key);
const fill = new THREE.DirectionalLight('#8eafcc', 1.8);
fill.position.set(-12, 4, 9);
scene.add(fill);
const rim = new THREE.DirectionalLight('#c87558', 1.65);
rim.position.set(7, 12, 14);
scene.add(rim);

let model = null;
let focusCenter = new THREE.Vector3(0, 0, 3.5);
let focusSize = new THREE.Vector3(12, 10, 8);
const homePosition = new THREE.Vector3(13.5, -19.5, 9.1);

function resize() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (!width || !height) return;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

function focusBounds() {
  const box = new THREE.Box3();
  model.traverse((object) => {
    if (object.isMesh && !object.name.toLowerCase().includes('suelo')) box.expandByObject(object);
  });
  if (box.isEmpty()) box.setFromCenterAndSize(new THREE.Vector3(0, 0, 3.5), focusSize);
  focusCenter.copy(box.getCenter(new THREE.Vector3()));
  focusSize.copy(box.getSize(new THREE.Vector3()));
  controls.target.copy(focusCenter);
  camera.position.copy(homePosition);
  camera.lookAt(focusCenter);
  controls.update();
}

function setView(view) {
  if (!model) return;
  const c = focusCenter;
  const max = Math.max(focusSize.x, focusSize.y, focusSize.z);
  const positions = {
    hero: new THREE.Vector3(max * 1.06, -max * 1.48, max * 0.72),
    front: new THREE.Vector3(0, -max * 1.9, max * 0.48),
    top: new THREE.Vector3(max * 0.8, -max * 0.9, max * 1.95),
  };
  const offset = positions[view] || positions.hero;
  camera.position.copy(c).add(offset);
  controls.target.copy(c);
  controls.update();
  document.querySelectorAll('.view-button').forEach((button) => button.classList.toggle('is-active', button.dataset.view === view));
}

function nudgeZoom(amount) {
  const vector = camera.position.clone().sub(controls.target);
  const next = Math.max(controls.minDistance, Math.min(controls.maxDistance, vector.length() + amount));
  camera.position.copy(controls.target).add(vector.normalize().multiplyScalar(next));
  controls.update();
}

document.querySelectorAll('.view-button').forEach((button) => button.addEventListener('click', () => setView(button.dataset.view)));
document.querySelector('#reset-view').addEventListener('click', () => setView('hero'));
const autoButton = document.querySelector('#auto-rotate');
autoButton.addEventListener('click', () => {
  controls.autoRotate = !controls.autoRotate;
  controls.autoRotateSpeed = 1.2;
  autoButton.classList.toggle('is-on', controls.autoRotate);
  autoButton.setAttribute('aria-pressed', String(controls.autoRotate));
});
canvas.addEventListener('wheel', () => { controls.autoRotate = false; autoButton.classList.remove('is-on'); autoButton.setAttribute('aria-pressed', 'false'); }, { passive: true });

new GLTFLoader().load(
  './templo_griego.glb',
  (gltf) => {
    model = gltf.scene;
    model.traverse((object) => {
      if (object.isMesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
    scene.add(model);
    focusBounds();
    setView('hero');
    loading.hidden = true;
  },
  (progress) => {
    if (progress.total) loadingLabel.textContent = `Cargando modelo ${Math.round((progress.loaded / progress.total) * 100)}%`;
  },
  () => {
    loading.hidden = true;
    errorBox.hidden = false;
  },
);

window.addEventListener('resize', resize);
resize();
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();
