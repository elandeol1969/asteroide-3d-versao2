import * as THREE from 'three';
import { DragControls } from 'three/addons/controls/DragControls.js';

// --- 1. Configuração da Cena ---
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.02);

// Câmera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 10; // A câmera está a 10 unidades de distância do centro (0,0,0)

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio); // Importante para nitidez em celulares (Retina/High DPI)
container.appendChild(renderer.domElement);

// --- 2. Iluminação ---
const ambientLight = new THREE.AmbientLight(0x404040, 2); 
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
directionalLight.position.set(5, 10, 7);
scene.add(directionalLight);

// --- 3. O Dodecaedro ---
const radius = 1.5; // Tamanho do dodecaedro
const geometry = new THREE.DodecahedronGeometry(radius, 0);
const nonIndexedGeometry = geometry.toNonIndexed();
const count = nonIndexedGeometry.attributes.position.count;

const colors = [];
const color = new THREE.Color();

for (let i = 0; i < count; i += 3) {
    color.setHSL(Math.random(), 1.0, 0.5);
    colors.push(color.r, color.g, color.b);
    colors.push(color.r, color.g, color.b);
    colors.push(color.r, color.g, color.b);
}

nonIndexedGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

const material = new THREE.MeshPhysicalMaterial({ 
    vertexColors: true, 
    roughness: 0.1,     
    metalness: 0.1,     
    flatShading: true,  
});

const dodecaedro = new THREE.Mesh(nonIndexedGeometry, material);
scene.add(dodecaedro);

// --- 4. Estrelas ---
const starsGeometry = new THREE.BufferGeometry();
const starsCount = 1500;
const posArray = new Float32Array(starsCount * 3);
for(let i = 0; i < starsCount * 3; i++) {
    posArray[i] = (Math.random() - 0.5) * 100;
}
starsGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
const starMesh = new THREE.Points(starsGeometry, new THREE.PointsMaterial({
    size: 0.15, color: 0xffffff, transparent: true, opacity: 0.8
}));
scene.add(starMesh);

// --- 5. Cálculo de Limites Responsivos ---
// Objeto para guardar os limites da tela
let bounds = { x: 0, y: 0 };

function updateBounds() {
    // Matemática para calcular o tamanho da visão da câmera na profundidade 0 (onde o dodecaedro vive)
    // O objeto está em Z=0, a câmera em Z=10. Distância = 10.
    const distance = camera.position.z - 0; 
    
    // Converte FOV de graus para radianos
    const vFOV = THREE.MathUtils.degToRad(camera.fov); 
    
    // Altura visível = 2 * tan(fov/2) * distancia
    const visibleHeight = 2 * Math.tan(vFOV / 2) * distance;
    // Largura visível = altura * aspecto da tela
    const visibleWidth = visibleHeight * camera.aspect;

    // Define os limites (dividido por 2 pois o centro é 0)
    // Subtraímos o raio do objeto (1.5) para ele bater na borda e não entrar nela pela metade
    bounds.y = (visibleHeight / 2) - radius;
    bounds.x = (visibleWidth / 2) - radius;
}

// Chama a função inicialmente
updateBounds();

// --- 6. Lógica de Movimento ---
let velocity = new THREE.Vector3((Math.random() - 0.5) * 0.15, (Math.random() - 0.5) * 0.15, 0);
let rotationSpeed = { x: Math.random() * 0.02, y: Math.random() * 0.02 };
let isDragging = false;

// --- 7. Interação Drag & Drop ---
const controls = new DragControls([dodecaedro], camera, renderer.domElement);

controls.addEventListener('dragstart', function (event) {
    isDragging = true;
    event.object.material.emissive.set(0x333333);
});

controls.addEventListener('dragend', function (event) {
    isDragging = false;
    event.object.material.emissive.set(0x000000);
    // Ao soltar, dá um empurrãozinho aleatório
    velocity.x = (Math.random() - 0.5) * 0.2;
    velocity.y = (Math.random() - 0.5) * 0.2;
});

// --- 8. Loop de Animação ---
function animate() {
    requestAnimationFrame(animate);

    starMesh.rotation.y += 0.0005;

    if (!isDragging) {
        dodecaedro.rotation.x += rotationSpeed.x;
        dodecaedro.rotation.y += rotationSpeed.y;
        dodecaedro.position.add(velocity);

        // Colisão Dinâmica com as Bordas Responsivas
        // X (Laterais)
        if (dodecaedro.position.x >= bounds.x) {
            dodecaedro.position.x = bounds.x;
            velocity.x = -velocity.x;
        } else if (dodecaedro.position.x <= -bounds.x) {
            dodecaedro.position.x = -bounds.x;
            velocity.x = -velocity.x;
        }
        
        // Y (Topo e Base)
        if (dodecaedro.position.y >= bounds.y) {
            dodecaedro.position.y = bounds.y;
            velocity.y = -velocity.y;
        } else if (dodecaedro.position.y <= -bounds.y) {
            dodecaedro.position.y = -bounds.y;
            velocity.y = -velocity.y;
        }
        
        // Z (Profundidade) - Mantém ele no plano 0
        if (Math.abs(dodecaedro.position.z) > 0.1) {
             dodecaedro.position.z *= 0.9; // Traz suavemente de volta para o centro
        }
    }

    renderer.render(scene, camera);
}

// --- 9. Evento de Resize (Responsividade Total) ---
window.addEventListener('resize', () => {
    // Atualiza proporção da câmera
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    
    // Atualiza tamanho do renderizador
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // IMPORTANTE: Recalcula os limites físicos baseado no novo tamanho da tela
    updateBounds();
});

animate();