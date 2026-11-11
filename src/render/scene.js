import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// Distància base dissenyada per a N=4 (offset 1.725) en escriptori
const CAM_BASE = new THREE.Vector3(7, 6, 8);
const CAM_BASE_OFFSET = 1.725;

function camDistanceScale() {
  const aspect = innerWidth / innerHeight;
  // En portrait (aspect < 1) el cub ompliria tota la pantalla; escalam la distància
  return aspect < 1 ? Math.max(1, 0.82 / aspect) : 1;
}

export function createScene() {
  const scene = new THREE.Scene();

  const cosmosCanvas = document.createElement('canvas');
  cosmosCanvas.width  = innerWidth;
  cosmosCanvas.height = innerHeight;
  const cosmosTexture = new THREE.CanvasTexture(cosmosCanvas);
  cosmosTexture.minFilter = THREE.LinearFilter;
  cosmosTexture.generateMipmaps = false;
  scene.background = cosmosTexture;

  const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100);
  const s = camDistanceScale();
  camera.position.copy(CAM_BASE.clone().multiplyScalar(s));

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  document.body.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.autoRotateSpeed = 2.0;

  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const dir = new THREE.DirectionalLight(0xffffff, 0.9);
  dir.position.set(5, 8, 6);
  scene.add(dir);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(innerWidth, innerHeight), 0.35, 0.5, 0.75
  );
  composer.addPass(bloom);

  let lastAspect = innerWidth / innerHeight;
  addEventListener('resize', () => {
    const newAspect = innerWidth / innerHeight;
    camera.aspect = newAspect;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    composer.setSize(innerWidth, innerHeight);
    cosmosCanvas.width  = innerWidth;
    cosmosCanvas.height = innerHeight;
    cosmosTexture.needsUpdate = true;
    // Si el jugador gira el telèfon i no ha fet zoom manual, reposiciona la càmera
    const prevScale = lastAspect < 1 ? Math.max(1, 0.82 / lastAspect) : 1;
    const newScale  = camDistanceScale();
    if (Math.abs(prevScale - newScale) > 0.05) {
      const prevDist = CAM_BASE.length() * prevScale;
      const curDist  = camera.position.length();
      // Reposiciona proporcionalment si el jugador no s'ha mogut gaire del punt inicial
      if (Math.abs(curDist - prevDist) < 4) {
        camera.position.copy(CAM_BASE.clone().multiplyScalar(newScale));
        controls.update();
      }
    }
    lastAspect = newAspect;
  });

  return { scene, camera, renderer, controls, composer, bloom, cosmosCanvas, cosmosTexture };
}

export function addAxesHelper(scene, offset) {
  const axesHelper = new THREE.AxesHelper(3);
  axesHelper.position.set(-offset - 1.2, -offset - 1.2, -offset - 1.2);
  scene.add(axesHelper);
  return axesHelper;
}

export function resetCameraForOffset(camera, controls, offset) {
  const aspect = innerWidth / innerHeight;
  const nominalS   = camDistanceScale() * Math.pow(offset / CAM_BASE_OFFSET, 0.35);
  const nominalDist = CAM_BASE.length() * nominalS;

  // Garantir que l'esfera de contenció del cub càpiga al viewport (crític en portrait N=9)
  const halfFovV  = (camera.fov / 2) * (Math.PI / 180);
  const halfFovH  = Math.atan(Math.tan(halfFovV) * aspect);
  const minHalfFov = Math.min(halfFovV, halfFovH);
  const minDist   = (offset * Math.sqrt(3)) / Math.tan(minHalfFov) * 1.12;

  const finalDist = Math.max(nominalDist, minDist);
  camera.position.copy(CAM_BASE.clone().normalize().multiplyScalar(finalDist));
  controls.target.set(0, 0, 0);
  controls.update();
}

export function updateAxesHelper(axesHelper, offset) {
  axesHelper.position.set(-offset - 1.2, -offset - 1.2, -offset - 1.2);
}

export function applyBloomTheme(bloom, theme) {
  bloom.strength = theme.bloom.strength;
  bloom.radius = theme.bloom.radius;
  bloom.threshold = theme.bloom.threshold;
}
