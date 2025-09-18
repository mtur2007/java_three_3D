// functions.js
// import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169/build/three.module.js';
import * as THREE from 'three';

const scene = new THREE.Scene();

// 昼の環境マップ（初期）
const envMap = new THREE.CubeTextureLoader()
  .setPath('https://threejs.org/examples/textures/cube/Bridge2/')
  .load([
    'posx.jpg','negx.jpg',
    'posy.jpg','negy.jpg',
    'posz.jpg','negz.jpg'
  ], (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    scene.environment = texture;
    scene.background = texture;
  });

// --- GridHelper 追加（初回のみ） ---
const grid = new THREE.GridHelper(200, 80);
grid.name = "Grid";
scene.add(grid);

// -------------- GLB 読み込み差し込みコード（そのまま貼る） --------------
// 必ず three と同バージョンの examples モジュールを使う（あなたは three@0.169 を使っているので合わせる）
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/loaders/DRACOLoader.js';

// DRACO 使用版（.glb が Draco 圧縮されている／将来使うなら有効化）
const gltfLoader = new GLTFLoader();
const useDraco = true; // Draco を使う場合は true に。未圧縮なら false
if (useDraco) {
  const dracoLoader = new DRACOLoader();
  // CDN のデコーダパス（例）。必要ならローカルの decoder に変えてください
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
  gltfLoader.setDRACOLoader(dracoLoader);
}

/**
 * modelUrl の glb を読み込んでシーンに追加するユーティリティ。
 * - 中心化（大きな座標を原点付近に移す）
 * - 自動スケール（巨大なら縮小）
 * - マテリアルに scene.environment を適用（PBR反射）
 * - シャドウ設定（必要なら有効化）
 */
async function loadModelToScene(modelUrl, options = {}) {
  const {
    autoCenter = true,
    autoScaleMax = 1000,   // モデルの最大寸法がこの値を超えるなら縮小する閾値
    scaleIfLarge = 0.001,   // 縮小係数（例：0.001）
    castShadow = false,
    receiveShadow = false,
    onProgress = (xhr) => { if (xhr.total) console.log(`model ${(xhr.loaded/xhr.total*100).toFixed(1)}%`); },
  } = options;

  return new Promise((resolve, reject) => {
    gltfLoader.load(
      modelUrl,
      (gltf) => {
        const root = gltf.scene || gltf.scenes[0];
        if (!root) return reject(new Error('glTF にシーンがありません'));

        // 1) マテリアル側に環境マップをセット（PBRの反射を有効化）
        root.traverse((node) => {
          if (node.isMesh) {
            // ランタイムで環境マップがあれば適用
            if (scene.environment) {
              // 一部のマテリアルは envMap を直接参照しないことがあるが、通常はこれで反射が得られます
              if (node.material) {
                if (Array.isArray(node.material)) {
                  node.material.forEach(m => {
                    if (m && 'envMap' in m) {
                      m.envMap = scene.environment;
                      m.needsUpdate = true;
                    }
                  });
                } else {
                  if ('envMap' in node.material) {
                    node.material.envMap = scene.environment;
                    node.material.needsUpdate = true;
                  }
                }
              }
            }

            // シャドウ（重くなる場合は false に）
            node.castShadow = false//!!castShadow;
            node.receiveShadow = false//!!receiveShadow;

            // GPU負荷低減のために、if necessary, フラグなどを調整してもよい
          }
        });

        // 2) 中心化＋自動縮小（CityGML は世界座標が大きいことが多い）
        if (autoCenter) {
          const box = new THREE.Box3().setFromObject(root);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());

          // 原点に移動
          root.position.sub(center);

          // 必要なら scale を下げる
          const maxDim = Math.max(size.x, size.y, size.z);
          if (maxDim > autoScaleMax) {
            root.scale.setScalar(scaleIfLarge);
            console.log(`モデルが大きかったため scale=${scaleIfLarge} を適用しました（maxDim=${maxDim}）`);
          }
        }

        // 手動調整

        root.rotation.y = 100 * Math.PI / 180
        root.position.set(145,40,-175)
        root.scale.setScalar(0.45);


        // 3) シーンに追加
        scene.add(root);

        resolve(root);
      },
      onProgress,
      (err) => {
        console.error('GLTF load error', err);
        reject(err);
      }
    );
  });
}

// --------------- 実行例：model.glb を読み込む ----------------
// ここのファイル名をあなたの .glb の名前に変えてください
loadModelToScene('model.glb', { autoCenter: true, autoScaleMax: 10000, scaleIfLarge: 0.001 })
  .then((root) => {
    console.log('GLB loaded and added to scene:', root);
  })
  .catch((err) => {
    console.error('モデルの読み込みで失敗:', err);
    alert('モデル読み込みに失敗しました。コンソールを確認してください。');
  });
// -----------------------------------------------------------------


// --- ライト追加（初回のみ） ---
const ambient = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambient);

const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(0, 20, 0);
dirLight.name = "SunLight";
scene.add(dirLight);

// --- 昼夜切替 ---
let isNight = false;
let envMapNight = null;

const toggleBtn = document.getElementById("toggle-daynight");

toggleBtn.addEventListener("click", () => {
  isNight = !isNight;

  if (isNight) {
    // 🌙 夜モード
    if (envMapNight) {
      scene.background = envMapNight;
      scene.environment = envMapNight;
    } else {
      const loader = new THREE.TextureLoader();
      loader.load('textures/shanghai_bund_4k.jpg', (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        texture.colorSpace = THREE.SRGBColorSpace;
        scene.background = texture;
        scene.environment = texture;
        envMapNight = texture;
      });
    }

    grid.visible = false;
    dirLight.visible = false;
    ambient.visible = false;

    renderer.toneMappingExposure = 1.0;
    toggleBtn.textContent = "☀️ 昼にする";

  } else {
    // ☀️ 昼モード
    scene.background = envMap;
    scene.environment = envMap;

    grid.visible = true;
    dirLight.visible = true;
    ambient.visible = true;

    renderer.toneMappingExposure = 2.5;
    toggleBtn.textContent = "🌙 夜にする";
  }
});

const camera = new THREE.PerspectiveCamera(
  75, window.innerWidth / window.innerHeight, 0.1, 1000
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);

renderer.outputColorSpace = THREE.SRGBColorSpace;


document.body.appendChild(renderer.domElement);

let run_STOP = false
let quattro = 0
let run_num = 0

import { TrainSystem } from './functions.js';
const TSys = new TrainSystem(scene);

// --- エスカレーター ---
let path_x = 2.8
let path_y = 6.536
let path_z = 20.2
// ② 軌道を定義
const path_1 = new THREE.CatmullRomCurve3([
  new THREE.Vector3(path_x, 0+path_y, -3.42+path_z),
  new THREE.Vector3(path_x, 0+path_y, -3+path_z),
  new THREE.Vector3(path_x, 0.1+path_y, -2+path_z),
  new THREE.Vector3(path_x, 3.28+path_y, 3.7+path_z),
  new THREE.Vector3(path_x, 3.38+path_y, 4.7+path_z),
  new THREE.Vector3(path_x, 3.38+path_y, 5.2+path_z),
]);

// const pathMesh = createPathMesh(path_1);
// scene.add(pathMesh);

// ③ アニメーション
TSys.updateObjectOnPath(path_1);
path_x = -2.8
// ② 軌道を定義
const path_2 = new THREE.CatmullRomCurve3([
  new THREE.Vector3(path_x, 0+path_y, -3.42+path_z),
  new THREE.Vector3(path_x, 0+path_y, -3+path_z),
  new THREE.Vector3(path_x, 0.1+path_y, -2+path_z),
  new THREE.Vector3(path_x, 3.28+path_y, 3.7+path_z),
  new THREE.Vector3(path_x, 3.38+path_y, 4.7+path_z),
  new THREE.Vector3(path_x, 3.38+path_y, 5.2+path_z),
]);

// const pathMesh_2 = createPathMesh(path_2);
// scene.add(pathMesh_2);

// ③ アニメーション
TSys.updateObjectOnPath(path_2);

path_x = 15
// ② 軌道を定義
const test = new THREE.CatmullRomCurve3([
  new THREE.Vector3(path_x, 0+path_y, -3.42+path_z),
  new THREE.Vector3(path_x, 0+path_y, -3+path_z),
  new THREE.Vector3(path_x, 0.1+path_y, -2+path_z),
  new THREE.Vector3(path_x, 3.28+path_y, 3.7+path_z),
  new THREE.Vector3(path_x, 3.38+path_y, 4.7+path_z),
  new THREE.Vector3(path_x, 3.38+path_y, 5.2+path_z),
]);

// const pathMesh_2 = createPathMesh(path_2);
// scene.add(pathMesh_2);

// ③ アニメーション
TSys.updateObjectOnPath(test);

// --- エレベーター🛗 ---

const glass_material = new THREE.MeshStandardMaterial({
  // color: 0x003333,         // 白ベース
  color: 0x004444,         // 白ベース
  transparent: true,       // 透明を有効に
  opacity: 0.05,            // 透明度（0: 完全透明）
  roughness: -1,         // 表面のザラザラ感（低いほどつるつる）
  metalness: 2,          // 金属度（高いほど光沢が強く反射）
  envMapIntensity: 10.0,    // 環境マップの反射強度（envMapを使うなら）
  side: THREE.DoubleSide   // 両面描画（必要なら）
});

const metal_material = new THREE.MeshStandardMaterial({
  color: 0xffffff,         // 白ベース
  metalness: 1,          // 完全な金属
  roughness: 0.1,          // 少しザラつき（0.0だと鏡面すぎる）
  envMapIntensity: 0.3,    // 環境マップの反射強度（あるとリアル）
  side: THREE.DoubleSide   // 両面描画（必要なら）
});


// 2.82
const pillar_material = new THREE.MeshStandardMaterial({
  color: 0x666666,         // 濃いグレー（鉄っぽい色）
  metalness: 0.5,          // 完全な金属
  roughness: 0.3,          // 少しザラつき（0.0だと鏡面すぎる）
  envMapIntensity: 0.5,    // 環境マップの反射強度（あるとリアル）
  side: THREE.FrontSide,   // 通常は片面でOK
});


const body_material = new THREE.MeshStandardMaterial({
  color: 0x888888,
  metalness: 0.8,
  roughness: 0.1,
  envMapIntensity: 1.0,
  side: THREE.DoubleSide, // 念のため両面表示
});

// 表用マテリアル
const bodyFront = new THREE.MeshStandardMaterial({
  color: 0x888888,
  metalness: 0.8,
  roughness: 0.1,
  envMapIntensity: 1.0,
  side: THREE.FrontSide
});

// 裏用マテリアル
const bodyBack = new THREE.MeshStandardMaterial({
  color: 0xcccccc,
  color: 0x999999,
  metalness: 0.3,
  roughness: 1,
  envMapIntensity: 1.0,
  side: THREE.FrontSide,
});

function createElevator(x, y, z, scale_x=1, scale_z=1, F1=false) {
  const ElevatorGaugeGroup = new THREE.Group();
  const ElevatorBodyGroup = new THREE.Group();
  const ElevatorDoorGroup_gate = new THREE.Group();
  const ElevatorDoorGroup_body = new THREE.Group();

  const pos_x = x
  const pos_y = y
  const pos_z = z

  x = 0
  y = 0
  z = 0

  // 各パラメータ定義（元のコードから）
  const x_len = 0.9;
  const z_len = 1.2;
  const thickness = 0.02;
  const thickness_diff_x = x_len - thickness;
  const thickness_diff_z = z_len - thickness;
  const gaugebody_space = 0.15;
  const body_x_len = x_len - gaugebody_space * 2;
  const body_z_len = z_len - gaugebody_space * 2;
  const elevatorz_center = z + gaugebody_space + body_z_len / 2;
  const door_z_diff = z_len - 0.1785;

  // ----- Glass and Metal Frames -----
  let glassGeometry = new THREE.BoxGeometry(thickness_diff_x, 0.8, 0.01);
  let glassMesh = new THREE.Mesh(glassGeometry, glass_material);
  glassMesh.position.set(x, y + 0.5, z);
  ElevatorGaugeGroup.add(glassMesh);

  let metalGeometry = new THREE.BoxGeometry(thickness_diff_x, 0.1, 0.02);
  let metalMesh = new THREE.Mesh(metalGeometry, metal_material);
  metalMesh.position.set(x, y + 0.05, z);
  ElevatorGaugeGroup.add(metalMesh);

  glassGeometry = new THREE.BoxGeometry(0.01, 0.8, thickness_diff_z);
  glassMesh = new THREE.Mesh(glassGeometry, glass_material);
  glassMesh.position.set(x + x_len / 2, y + 0.5, z + z_len / 2);
  ElevatorGaugeGroup.add(glassMesh);

  metalGeometry = new THREE.BoxGeometry(0.02, 0.1, thickness_diff_z);
  metalMesh = new THREE.Mesh(metalGeometry, metal_material);
  metalMesh.position.set(x + x_len / 2, y + 0.05, z + z_len / 2);
  ElevatorGaugeGroup.add(metalMesh);

  glassMesh = new THREE.Mesh(glassGeometry, glass_material);
  glassMesh.position.set(x + x_len / 2, y + 0.5, z + z_len / 2);
  ElevatorGaugeGroup.add(glassMesh);

  metalMesh = new THREE.Mesh(metalGeometry, metal_material);
  metalMesh.position.set(x - x_len / 2, y + 0.05, z + z_len / 2);
  ElevatorGaugeGroup.add(metalMesh);

  glassGeometry = new THREE.BoxGeometry(thickness_diff_x / 9, 0.8, 0.01);
  glassMesh = new THREE.Mesh(glassGeometry, glass_material);
  glassMesh.position.set(x + x_len / 2 - thickness_diff_x / 18 - thickness / 2, y + 0.5, z + z_len);
  ElevatorGaugeGroup.add(glassMesh);

  const geom3 = new THREE.BoxGeometry(thickness_diff_x / 9, 0.1, thickness);
  glassMesh = new THREE.Mesh(geom3, new THREE.MeshStandardMaterial(metal_material));
  glassMesh.position.set(x + x_len / 2 - thickness_diff_x / 18 - thickness / 2, y + 0.05, z + z_len);
  ElevatorGaugeGroup.add(glassMesh);

  glassGeometry = new THREE.BoxGeometry(thickness_diff_x / 9, 0.8, 0.01);
  glassMesh = new THREE.Mesh(glassGeometry, glass_material);
  glassMesh.position.set(x - x_len / 2 + thickness_diff_x / 18 + thickness / 2, y + 0.5, z + z_len);
  ElevatorGaugeGroup.add(glassMesh);

  glassMesh = new THREE.Mesh(geom3, new THREE.MeshStandardMaterial(metal_material));
  glassMesh.position.set(x - x_len / 2 + thickness_diff_x / 18 + thickness / 2, y + 0.05, z + z_len);
  ElevatorGaugeGroup.add(glassMesh);

  glassGeometry = new THREE.BoxGeometry(0.195, 0.8, 0.01);
  glassMesh = new THREE.Mesh(glassGeometry, new THREE.MeshStandardMaterial({ color: 0xffffff }));
  glassMesh.position.set(x - x_len / 2 + thickness_diff_x / 18 + thickness / 2 + 0.0975 + thickness_diff_x / 18, y + 0.5, z + z_len);
  ElevatorGaugeGroup.add(glassMesh);

  const geom4 = new THREE.BoxGeometry(0.195, 0.1, thickness);
  glassMesh = new THREE.Mesh(geom4, new THREE.MeshStandardMaterial(metal_material));
  glassMesh.position.set(x - x_len / 2 + thickness_diff_x / 18 + thickness / 2 + 0.0975 + thickness_diff_x / 18, y + 0.05, z + z_len);
  ElevatorGaugeGroup.add(glassMesh);

  // 横棒・縦棒
  const geom1 = new THREE.BoxGeometry(thickness, 0.9, 0.001);
  const geom2 = new THREE.BoxGeometry(0.001, 0.9, thickness);

  const barPositions = [
    [x + x_len / 2, y + 0.45, z + thickness / 2, geom1],
    [x + x_len / 2 - thickness / 2, y + 0.45, z, geom2],
    [x - x_len / 2, y + 0.45, z + thickness / 2, geom1],
    [x - x_len / 2 + thickness / 2, y + 0.45, z, geom2],
    [x - x_len / 2, y + 0.45, z + z_len - thickness / 2, geom1],
    [x - x_len / 2 + thickness / 2, y + 0.45, z + z_len, geom2],
    [x + x_len / 2, y + 0.45, z + z_len - thickness / 2, geom1],
    [x + x_len / 2 - thickness / 2, y + 0.45, z + z_len, geom2],
  ];

  for (const [px, py, pz, geom] of barPositions) {
    const mesh = new THREE.Mesh(geom, new THREE.MeshStandardMaterial(metal_material));
    mesh.position.set(px, py, pz);
    ElevatorGaugeGroup.add(mesh);
  }

  // gate / 上部ボックス
  let gate1 = new THREE.BoxGeometry(0.08, 0.75, 0.22);
  let mesh = new THREE.Mesh(gate1, new THREE.MeshStandardMaterial(metal_material));
  mesh.position.set(x + x_len / 2 - thickness_diff_x / 18 - thickness / 2 - thickness_diff_x / 18 - 0.04, y + 0.375, z + z_len - 0.1 + 0.02);
  ElevatorGaugeGroup.add(mesh);

  gate1 = new THREE.BoxGeometry(0.08, 0.75, 0.185);
  mesh = new THREE.Mesh(gate1, new THREE.MeshStandardMaterial(metal_material));
  mesh.position.set(x + x_len / 2 - thickness_diff_x / 18 - thickness / 2 - thickness_diff_x / 18 - 0.45, y + 0.375, z + z_len - 0.1 + 0.0375);
  ElevatorGaugeGroup.add(mesh);

  const gateGeometry = new THREE.BoxGeometry(0.49, 0.15, 0.22);
  const gateMesh = new THREE.Mesh(gateGeometry, new THREE.MeshStandardMaterial(metal_material));
  gateMesh.position.set(x + x_len / 2 - thickness_diff_x / 18 - thickness / 2 - thickness_diff_x / 18 - 0.04 - 0.205, y + 0.75 + 0.075, z + z_len - 0.1 + 0.02);
  ElevatorGaugeGroup.add(gateMesh);

  const box = new THREE.BoxGeometry(x_len, 0.2, z_len);
  mesh = new THREE.Mesh(box, new THREE.MeshStandardMaterial({ color: 0x222222 }));
  mesh.position.set(x, y + 1, z + z_len / 2);
  ElevatorGaugeGroup.add(mesh);

  if (F1 === true){  
  const box2 = new THREE.BoxGeometry(x_len, 2, z_len);
  mesh = new THREE.Mesh(box2, new THREE.MeshStandardMaterial(glass_material));
  mesh.position.set(x, y + 2.1, z + z_len / 2);
  ElevatorGaugeGroup.add(mesh);
  }

  // ----- ElevatorBodyGroup 作成 -----
  let wall_x = x - x_len / 2 + (x_len - gaugebody_space);
  const bodyGeometry1 = new THREE.BoxGeometry(body_z_len, 0.35, 0.01);
  const bodyGeometry2 = new THREE.BoxGeometry(body_z_len * 0.1, 0.4, 0.01);
  const bodyGeometry3 = new THREE.BoxGeometry(body_z_len, 0.1, 0.01);

  ElevatorBodyGroup.add(createDualSidedDoor(bodyGeometry1, new THREE.Vector3(wall_x, y + 0.175, elevatorz_center), -Math.PI / 2));
  ElevatorBodyGroup.add(createDualSidedDoor(bodyGeometry2, new THREE.Vector3(wall_x, y + 0.55, elevatorz_center + body_z_len * 0.5 - body_z_len * 0.05), -Math.PI / 2));
  ElevatorBodyGroup.add(createDualSidedDoor(bodyGeometry2, new THREE.Vector3(wall_x, y + 0.55, elevatorz_center - body_z_len * 0.5 + body_z_len * 0.05), -Math.PI / 2));
  ElevatorBodyGroup.add(createDualSidedDoor(bodyGeometry3, new THREE.Vector3(wall_x, y + 0.8, elevatorz_center), -Math.PI / 2));

  wall_x = x + x_len / 2 - (x_len - gaugebody_space);
  ElevatorBodyGroup.add(createDualSidedDoor(bodyGeometry1, new THREE.Vector3(wall_x, y + 0.175, elevatorz_center), Math.PI / 2));
  ElevatorBodyGroup.add(createDualSidedDoor(bodyGeometry2, new THREE.Vector3(wall_x, y + 0.55, elevatorz_center + body_z_len * 0.5 - body_z_len * 0.05), Math.PI / 2));
  ElevatorBodyGroup.add(createDualSidedDoor(bodyGeometry2, new THREE.Vector3(wall_x, y + 0.55, elevatorz_center - body_z_len * 0.5 + body_z_len * 0.05), Math.PI / 2));
  ElevatorBodyGroup.add(createDualSidedDoor(bodyGeometry3, new THREE.Vector3(wall_x, y + 0.8, elevatorz_center), Math.PI / 2));
 
  // ドアを生成する補助関数
  function createDualSidedDoor(geometry, position, rotation_y = false) {
    const meshFront = new THREE.Mesh(geometry, bodyFront);
    const meshBack = new THREE.Mesh(geometry, bodyBack);
    meshFront.position.copy(position);
    meshBack.position.copy(position);
    meshBack.scale.z = -0.009;
    if (rotation_y !== false) {
      meshFront.rotation.y = rotation_y;
      meshBack.rotation.y = rotation_y;
    }
    rotation_y = meshFront.rotation.y;
    meshBack.position.x += Math.sin(rotation_y) * 0.005;
    meshBack.position.z += Math.cos(rotation_y) * 0.005;
    const group = new THREE.Group();
    group.add(meshFront);
    group.add(meshBack);
    return group;
  }

  // ----- ドアグループ作成（A1〜D2） -----
  const door_x = x + x_len / 2 - thickness_diff_x / 18 - thickness / 2 - thickness_diff_x / 18 - 0.04 - 0.205 + 0.02125// - 0.045
  function makeDoorGroupA1(xOffset = 0, yOffset = 0, zOffset = 0) {
    const group = new THREE.Group();
    const doorGeometry1 = new THREE.BoxGeometry(0.0425, 0.75, 0.01);
    const doorGeometry2 = new THREE.BoxGeometry(0.085, 0.1, 0.01);
    const doorGeometry3 = new THREE.BoxGeometry(0.085, 0.25, 0.01);
    const doorGeometry4 = new THREE.BoxGeometry(0.0425, 0.75, 0.01);

    group.add(createDualSidedDoor(doorGeometry1, new THREE.Vector3(door_x + xOffset, y + 0.375 + yOffset, z + door_z_diff + zOffset), Math.PI));
    group.add(createDualSidedDoor(doorGeometry2, new THREE.Vector3(door_x + 0.06375 + xOffset, y + 0.7 + yOffset, z + door_z_diff + zOffset), Math.PI));
    group.add(createDualSidedDoor(doorGeometry3, new THREE.Vector3(door_x + 0.06375 + xOffset, y + 0.125 + yOffset, z + door_z_diff + zOffset), Math.PI));
    group.add(createDualSidedDoor(doorGeometry4, new THREE.Vector3(door_x + 0.1275 + xOffset, y + 0.375 + yOffset, z + door_z_diff + zOffset), Math.PI));
    return group;
  }

  ElevatorDoorGroup_gate.add(makeDoorGroupA1(0, 0, 0));
  ElevatorDoorGroup_gate.add(makeDoorGroupA1(-0.17, 0, 0.0125));
  ElevatorDoorGroup_body.add(makeDoorGroupA1(0, 0, -0.02));
  ElevatorDoorGroup_body.add(makeDoorGroupA1(-0.17, 0, -0.0325));

  const ElevatorGroups ={
    gauge: ElevatorGaugeGroup,
    body: ElevatorBodyGroup,
    door_gate: ElevatorDoorGroup_gate,
    door_body: ElevatorDoorGroup_body,
  }
  const elevatorGroup = new THREE.Group();
  elevatorGroup.add(ElevatorGaugeGroup);
  elevatorGroup.add(ElevatorDoorGroup_gate);
  elevatorGroup.add(ElevatorDoorGroup_body);
  if (F1===true){elevatorGroup.add(ElevatorBodyGroup)};

  elevatorGroup.scale.x = scale_x
  elevatorGroup.scale.z = scale_z

  elevatorGroup.position.set(pos_x,pos_y,pos_z)
  //rotation
  return elevatorGroup;
}


const elevatorA1 = createElevator(-2.7, 6.62, 36, 1, 1, true);
scene.add(elevatorA1);
const elevatorA2 = createElevator(-2.7, 9.9, 37.2, 1, -1);
scene.add(elevatorA2);

const ElevatorDoorGroup_A1 = elevatorA1.children[1].children[0]
const ElevatorDoorGroup_A2 = elevatorA1.children[1].children[1]
const ElevatorDoorGroup_C1 = elevatorA1.children[2].children[0]
const ElevatorDoorGroup_C2 = elevatorA1.children[2].children[1]
const ElevatorDoorGroup_B1 = elevatorA2.children[1].children[0]
const ElevatorDoorGroup_B2 = elevatorA2.children[1].children[1]
const ElevatorDoorGroup_D1 = elevatorA2.children[2].children[0]
const ElevatorDoorGroup_D2 = elevatorA2.children[2].children[1]
ElevatorDoorGroup_D1.position.y = -3.28
ElevatorDoorGroup_D2.position.y = -3.28
const ElevatorBodyGroup = elevatorA1.children[3]

const elevatorB1 = createElevator(2.7, 6.62, 36, -1, 1, true);
scene.add(elevatorB1);
const elevatorB2 = createElevator(2.7, 9.9, 37.2, -1, -1);
scene.add(elevatorB2);

const ElevatorDoorGroup_Ab1 = elevatorB1.children[1].children[0]
const ElevatorDoorGroup_Ab2 = elevatorB1.children[1].children[1]
const ElevatorDoorGroup_Cb1 = elevatorB1.children[2].children[0]
const ElevatorDoorGroup_Cb2 = elevatorB1.children[2].children[1]
const ElevatorDoorGroup_Bb1 = elevatorB2.children[1].children[0]
const ElevatorDoorGroup_Bb2 = elevatorB2.children[1].children[1]
const ElevatorDoorGroup_Db1 = elevatorB2.children[2].children[0]
const ElevatorDoorGroup_Db2 = elevatorB2.children[2].children[1]
const ElevatorBodyGroup_B = elevatorB1.children[3]

ElevatorDoorGroup_Cb1.position.y = +3.28
ElevatorDoorGroup_Cb2.position.y = +3.28
ElevatorBodyGroup_B.position.y = +3.28

// グループ全体を移動
// 一定時間待つ関数
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ドア開閉アニメーション
async function elevator_door_open(
  ElevatorDoorGroup_1,
  ElevatorDoorGroup_2,
  ElevatorDoorGroup_3,
  ElevatorDoorGroup_4
) {
  const range_num = 100;
  const xOffset = 0.17 / range_num;

  // ドアを開ける（徐々に）
  for (let i = 0; i <= range_num; i++) {
    ElevatorDoorGroup_1.position.x += -xOffset*2;
    ElevatorDoorGroup_2.position.x += -xOffset;

    // 内側は少し遅れて動き始める
    if (i > range_num * 0.05) {
      ElevatorDoorGroup_3.position.x += -xOffset*2;
      ElevatorDoorGroup_4.position.x += -xOffset;
    }

    await sleep(25);
  }

  // 🔁 内側ドアの残り 0.2 分を追加で動かす
  const delayedSteps = Math.floor(range_num * 0.05);
  for (let i = 0; i < delayedSteps; i++) {
    ElevatorDoorGroup_3.position.x += -xOffset*2;
    ElevatorDoorGroup_4.position.x += -xOffset;
    await sleep(25);
  }

  await sleep(7000);

  // ドアを閉める（徐々に）
  for (let i = range_num; i >= 0; i--) {
    ElevatorDoorGroup_1.position.x += xOffset*2;
    ElevatorDoorGroup_2.position.x += xOffset;

    if (i < range_num * 0.95) {  // 外側が先に閉まり、内側は少し遅れて
      ElevatorDoorGroup_3.position.x += xOffset*2;
      ElevatorDoorGroup_4.position.x += xOffset;
    }

    await sleep(25);
  }

  // 🔁 内側ドアの残り 0.2 分を追加で閉じる
  for (let i = 0; i < delayedSteps; i++) {
    ElevatorDoorGroup_3.position.x += xOffset*2;
    ElevatorDoorGroup_4.position.x += xOffset;
    await sleep(25);
  }

}

function getSleepTime(i, range_num, steps) {
  const slowRange = range_num * 0.15; // 10%部分の全ステップ数
  const stepSize = slowRange / steps; // 1段階あたりのステップ数

  if (i < slowRange) {
    // 最初の10%（加速）: 何段階目か計算
    const currentStep = Math.floor(i / stepSize);
    // sleep時間を段階ごとに段階的に減らす（30ms→10ms）
    const sleepStart = 30;
    const sleepEnd = 10;
    const sleepDiff = sleepStart - sleepEnd;
    const sleepTime = sleepStart - (sleepDiff / (steps - 1)) * currentStep;
    return sleepTime;

  } else if (i >= range_num - slowRange) {
    // 最後の10%（減速）: 何段階目か計算
    const currentStep = Math.floor((i - (range_num - slowRange)) / stepSize);
    const sleepStart = 10;
    const sleepEnd = 30;
    const sleepDiff = sleepEnd - sleepStart;
    const sleepTime = sleepStart + (sleepDiff / (steps - 1)) * currentStep;
    return sleepTime;

  } else {
    // 中央80%は一定速度
    return 10;
  }
}

// 無限ループで繰り返し（止めたいなら条件を追加）
async function startLoop() {
  while (true) {
    elevator_door_open(
      ElevatorDoorGroup_A1,
      ElevatorDoorGroup_A2,
      ElevatorDoorGroup_C1,
      ElevatorDoorGroup_C2
    );

    await elevator_door_open(
      ElevatorDoorGroup_Bb1,
      ElevatorDoorGroup_Bb2,
      ElevatorDoorGroup_Db1,
      ElevatorDoorGroup_Db2
    );
    await sleep(7000); // 3秒待ってからまた開ける

    // Cドアを y+方向へスライド（内側ドアを上に移動して2階へ）
    const F2_y = 3.28
    const range_num = 1800
    const yOffset = F2_y/range_num
    const steps = 30
    
    for (let i = 0; i < range_num; i++) {
      ElevatorBodyGroup.position.y += yOffset;
      ElevatorDoorGroup_C1.position.y += yOffset;
      ElevatorDoorGroup_C2.position.y += yOffset;
      ElevatorDoorGroup_D1.position.y += yOffset;
      ElevatorDoorGroup_D2.position.y += yOffset;

      ElevatorBodyGroup_B.position.y -= yOffset;
      ElevatorDoorGroup_Cb1.position.y -= yOffset;
      ElevatorDoorGroup_Cb2.position.y -= yOffset;
      ElevatorDoorGroup_Db1.position.y -= yOffset;
      ElevatorDoorGroup_Db2.position.y -= yOffset;
    
      const sleepTime = getSleepTime(i, range_num, steps);
      await sleep(sleepTime);
    }

    await sleep(3000); // 3秒待ってからまた開ける

    elevator_door_open(
      ElevatorDoorGroup_B1,
      ElevatorDoorGroup_B2,
      ElevatorDoorGroup_D1,
      ElevatorDoorGroup_D2
    );

    await elevator_door_open(
      ElevatorDoorGroup_Ab1,
      ElevatorDoorGroup_Ab2,
      ElevatorDoorGroup_Cb1,
      ElevatorDoorGroup_Cb2
    );

    await sleep(3000); // 3秒待ってからまた開ける


    for (let i = 0; i < range_num; i++) {
      ElevatorBodyGroup.position.y -= yOffset;
      ElevatorDoorGroup_C1.position.y -= yOffset;
      ElevatorDoorGroup_C2.position.y -= yOffset;
      ElevatorDoorGroup_D1.position.y -= yOffset;
      ElevatorDoorGroup_D2.position.y -= yOffset;

      ElevatorBodyGroup_B.position.y += yOffset;
      ElevatorDoorGroup_Cb1.position.y += yOffset;
      ElevatorDoorGroup_Cb2.position.y += yOffset;
      ElevatorDoorGroup_Db1.position.y += yOffset;
      ElevatorDoorGroup_Db2.position.y += yOffset;

      const sleepTime = getSleepTime(i, range_num, steps);
      await sleep(sleepTime);
    }

    await sleep(3000); // 3秒待ってからまた開ける
  }
}

startLoop(); // 処理開始

// --- 駅用ユーティリティ ---

// パンタフラフ ¯¯"<"¯¯
function createPantograph(Arm_rotation_z) {
  const pantograph = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial(metal_material);

  const Arm_len = 0.45
  const Arm_X_len = Math.sin(Arm_rotation_z)*Arm_len*0.5
  const Arm_Y_len = Math.cos(Arm_rotation_z)*Arm_len
  // 下アーム
  const lowerArm = new THREE.Mesh(new THREE.BoxGeometry(0.02, Arm_len, 0.02), mat);
  lowerArm.rotation.z = Arm_rotation_z;
  lowerArm.position.set(0, Arm_Y_len*0.5, 0);
  pantograph.add(lowerArm);

  const lowerArm2 = new THREE.Mesh(new THREE.BoxGeometry(0.004, Arm_len-0.1, 0.004), mat);
  lowerArm2.rotation.z = Arm_rotation_z-0.065;
  lowerArm2.position.set(-0.07,(Math.cos(Arm_rotation_z-0.065)*(Arm_len-0.1)*0.5), 0);
  pantograph.add(lowerArm2);

  // 上アーム（斜め）
  const upperArm = new THREE.Mesh(new THREE.BoxGeometry(0.02, Arm_len, 0.02), mat);
  upperArm.rotation.z = -Arm_rotation_z;
  upperArm.position.set(0, Arm_Y_len*1.5, 0);
  pantograph.add(upperArm.clone());

  const upperArm2 = new THREE.Mesh(new THREE.BoxGeometry(0.004, Arm_len-0.02, 0.004), mat);
  upperArm2.rotation.z = -(Arm_rotation_z-0.065);
  upperArm2.rotation.y = 0.27;
  upperArm2.position.set(+0.03, Arm_Y_len*1.5-0.02, -0.045);
  pantograph.add(upperArm2.clone());

  const upperArm3 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 0.02), mat);
  upperArm3.rotation.z = -(Arm_rotation_z-0.35);
  upperArm3.position.set(-0.19, Arm_Y_len-0.015, 0);
  pantograph.add(upperArm3.clone());


  pantograph.rotation.y = Math.PI / 2;
  // 接触板
  const contactGroup = new THREE.Group();
  const contact = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.01, 0.5), new THREE.MeshStandardMaterial(metal_material));
  contact.position.set(Arm_X_len-0.02, Arm_Y_len*2,0);
  contactGroup.add(contact.clone());
  contact.position.set(Arm_X_len+0.02, Arm_Y_len*2,0);
  contactGroup.add(contact.clone());

  const contact_rotation_x = Math.PI / 3
  const contact_Y_len = Math.sin(contact_rotation_x)*0.1*0.5
  const contact_X_len = Math.cos(contact_rotation_x)*0.1*0.5

  const contact2 = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.015, 0.1), new THREE.MeshStandardMaterial(metal_material));
  contact2.rotation.x = contact_rotation_x
  contact2.position.set(Arm_X_len, Arm_Y_len*2-contact_Y_len, 0.25+contact_X_len);
  contactGroup.add(contact2.clone());

  contact2.rotation.x = -contact_rotation_x
  contact2.position.x = Arm_X_len
  contact2.position.z = -(0.25+contact_X_len);
  contactGroup.add(contact2.clone());

  contactGroup.position.x = -0.05
  pantograph.add(contactGroup.clone())
  contactGroup.position.x = 0.05
  pantograph.add(contactGroup.clone())
  return pantograph;
}

// 車両設定（テクスチャ対応版）
function TrainSettings(
  length,
  color,
  cars,
  transparency = 1,
  textureHead = {},
  textureMiddle = {},
  textureTail = {}
) {
  const geo = new THREE.BoxGeometry(1, 1, length);
  const loader = new THREE.TextureLoader();

  // テクスチャ読み込みヘルパー
  function loadTexture(path) {
    const texture = loader.load(path);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  const metalness_num = 1
  const roughness_num = 0.6
  const envMapIntensity_num = 1.0
  // 指定されたテクスチャセットをもとにマテリアル6面分を生成
  function createMaterials(set) {
    const sideRightMat = set.side_right
      ? new THREE.MeshStandardMaterial({ map: loadTexture(set.side_right),   transparent: true, opacity: transparency, metalness: metalness_num, roughness: roughness_num, envMap: scene.environment, envMapIntensity: envMapIntensity_num })
      : set.side
        ? new THREE.MeshStandardMaterial({ map: loadTexture(set.side), transparent: true, opacity: transparency, metalness: metalness_num, roughness: roughness_num, envMap: scene.environment, envMapIntensity: envMapIntensity_num })
        : new THREE.MeshStandardMaterial({ color, transparent: true, opacity: transparency, metalness: metalness_num, roughness: roughness_num, envMap: scene.environment, envMapIntensity: envMapIntensity_num });

    const sideLeftMat = set.side_left
      ? new THREE.MeshStandardMaterial({ map: loadTexture(set.side_left), transparent: true, opacity: transparency, metalness: metalness_num, roughness: roughness_num, envMap: scene.environment, envMapIntensity: envMapIntensity_num }) // 反転なし
      : set.side
        ? new THREE.MeshStandardMaterial({ map: loadTexture(set.side), transparent: true, opacity: transparency, metalness: metalness_num, roughness: roughness_num, envMap: scene.environment, envMapIntensity: envMapIntensity_num })
        : sideRightMat.clone();

    const topMat = set.top
      ? new THREE.MeshStandardMaterial({ map: loadTexture(set.top), transparent: true, opacity: transparency, metalness: metalness_num, roughness: roughness_num, envMap: scene.environment, envMapIntensity: envMapIntensity_num })
      : new THREE.MeshStandardMaterial({ color, transparent: true, opacity: transparency, metalness: metalness_num, roughness: roughness_num, envMap: scene.environment, envMapIntensity: envMapIntensity_num });

    const bottomMat = set.bottom
      ? new THREE.MeshStandardMaterial({ map: loadTexture(set.bottom), transparent: true, opacity: transparency, metalness: metalness_num, roughness: roughness_num, envMap: scene.environment, envMapIntensity: envMapIntensity_num })
      : topMat.clone();

    const frontMat = set.front
      ? new THREE.MeshStandardMaterial({ map: loadTexture(set.front), transparent: true, opacity: transparency, metalness: metalness_num, roughness: roughness_num, envMap: scene.environment, envMapIntensity: envMapIntensity_num })
      : new THREE.MeshStandardMaterial({ color, transparent: true, opacity: transparency, metalness: metalness_num, roughness: roughness_num, envMap: scene.environment, envMapIntensity: envMapIntensity_num });

    const backMat = set.back
      ? new THREE.MeshStandardMaterial({ map: loadTexture(set.back), transparent: true, opacity: transparency, metalness: metalness_num, roughness: roughness_num, envMap: scene.environment, envMapIntensity: envMapIntensity_num })
      : new THREE.MeshStandardMaterial({ color, transparent: true, opacity: transparency, metalness: metalness_num, roughness: roughness_num, envMap: scene.environment, envMapIntensity: envMapIntensity_num });

    // 面の順番：[右, 左, 上, 下, 前, 後]
    return [
      sideRightMat,  // +X
      sideLeftMat,   // -X
      topMat,        // +Y
      bottomMat,     // -Y
      frontMat,      // +Z
      backMat        // -Z
    ];
  }


  const trainGroup = new THREE.Group(); // これをまとめる親
  const trainCars = [];

  for (let i = 0; i < cars; i++) {
    let textureSet;

    if (i === 0 && Object.keys(textureHead).length > 0) {
      textureSet = textureHead;
    } else if (i === cars - 1 && Object.keys(textureTail).length > 0) {
      textureSet = textureTail;
    } else {
      textureSet = textureMiddle;
    }

    const materials = createMaterials(textureSet);
    const car = new THREE.Mesh(geo, materials.map(m => m.clone()));

    // ▼ 車両の位置を z 方向にずらす（中央起点）
    const spacing = 6.95; // 車両の長さと同じだけ間隔を空ける
    car.position.z = - i * spacing;

    if (i === 0){
      const headlight = new THREE.SpotLight(0xfff5e1, 7);
      headlight.angle = Math.PI / 8;
      headlight.penumbra = 0.2;
      headlight.distance = 10;
      headlight.decay = 1;
      headlight.castShadow = false;

      headlight.position.set(0, -0.3, 1);  // 先頭部に合わせて調整（電車前方向に）
      car.add(headlight);
      car.add(headlight.target);   // スポットライトはtargetが必須
      headlight.target.position.set(0, 0, 4);  // 向き（車両前方）に合わせて調整
      
      // const hemiLight = new THREE.PointLight(0xffffbb,  5, 1.5);
      // hemiLight.position.set(0, 0.5, 0);
      // car.add(hemiLight);
    } 
    
    // ▼ パンタグラフ設置（例: 1, 4, 7 両目など）
    if (i % 3 === 1) {
      const pantograph = createPantograph(Math.PI / 2.7);
      pantograph.position.set(0, 0.5, 2.8);
      car.add(pantograph);

      const pantograph2 = createPantograph(Math.PI / -2.1);
      pantograph2.position.set(0, 0.5, -2.8);
      car.add(pantograph2);
    }

    trainCars.push(car);
    trainGroup.add(car); // グループに追加
  }

  trainGroup.userData.cars = trainCars; // 必要ならアクセスしやすく保存
  trainGroup.visible = false;   // 再表示する
  
  scene.add(trainGroup); // シーンに一括追加

  return trainGroup;
  
}


// --- アニメーション ---
// ホームドア開閉
function moveDoorsFromGroup(group, mode, distance = 0.32, duration = 2000) {
  return new Promise(resolve => {

    if (mode === 0) {
      mode = -1;
    }

    const children = group.children;
    const startPositions = children.map(child => child.position.clone());
    const startTime = performance.now();

    function animate(time) {
      const t = Math.min((time - startTime) / duration, 1);

      children.forEach((child, index) => {
        let angle = child.rotation.y;
        let dirX = Math.sin(angle);
        let dirZ = Math.cos(angle);
        const sign = index % 2 === 0 ? 1 * mode : -1 * mode;
        const start = startPositions[index];
        child.position.set(
          start.x + dirX * distance * sign * t,
          start.y,
          start.z + dirZ * distance * sign * t
        );
      });

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        resolve();  // アニメーション終了を通知
      }
    }

    requestAnimationFrame(animate);  // アニメーション開始
  });
}


// 列車の運行
async function runTrain(trainCars, root, track_doors, door_interval, max_speed=0.002, add_speed=0.000005, stop_point=0.5, start_position = 0) {

  const Equal_root = TSys.getPointsEveryM(root, 0.01); // spacing=0.1mごと（細かすぎたら25に）
  const totalPoints = Equal_root.length;

  const length = root.getLength(root);

  const carSpacing = door_interval / length
  
  const maxOffsetT = carSpacing * (trainCars.userData.cars.length + 1);

  let t = start_position

  let speed = max_speed
  let stop_point_diff = 0

  while (speed >= 0){
    speed -= add_speed
    stop_point_diff += speed};
  
  const brake_point = stop_point - stop_point_diff

  speed = max_speed
  
  let train_stoped = false
  if (quattro > 0){train_stoped = true}

  trainCars.visible = false;   // 再表示する
 
  let offsetT = NaN;
  let safeIndex = NaN

  let Pos = NaN
  let Tan = NaN
  let car = NaN // ← ここだけ変わる

  run_num += 1

  const front_right = trainCars.userData.cars[0].children[0]

  // ランダムな秒数（1000〜5000ミリ秒）
  await sleep( 1000 + Math.random() * 15000);
  trainCars.visible = true;   // 再表示する

  async function runCar() {
    if (t >= 1 + maxOffsetT) {
      
      if (quattro > 0){
        quattro -= 1
        run_num -= 1
        return
      };

      speed = max_speed
      train_stoped = false
      t = 0
      await sleep( 1000 + Math.random() * 20000);
      // return NaN
      
    }
  
    if (speed >= 0){ 
      for (let i = 0; i < trainCars.userData.cars.length; i++) {

        // const offsetT = t - carSpacing * i;
        offsetT = t - carSpacing * i;
    
        // offsetT が負ならその車両はまだ線路に出ない
        if (offsetT < 0 | offsetT > 1) {
          trainCars.userData.cars[i].visible = false;
          continue;
        } else {
          trainCars.userData.cars[i].visible = true;
        };
      
        safeIndex = Math.min(Math.floor(offsetT * totalPoints), totalPoints - 2);
      
        Pos = Equal_root[safeIndex];
        Tan = Equal_root[safeIndex+1].clone().sub(Pos).normalize();
        
        if (i === 0 & isNight){
          if (Pos.z <= -20) {
            front_right.visible = true;
          } else {
            front_right.visible = false;
          }
        } else if (!isNight) {front_right.visible = false}
      
        car = trainCars.userData.cars[i]; // ← ここだけ変わる
        car.position.copy(Pos);
        car.lookAt(Pos.clone().add(Tan));
      
      }

      if (train_stoped === false && t > brake_point){
        speed -= add_speed;
      } else {
        speed += add_speed
        if (speed >= max_speed){speed = max_speed}
      }
      
      t += speed;

    } else {

      train_stoped = true
      speed = 0

      await sleep(3000); // 3秒待ってからまた開ける
      if (run_STOP){
        trainCars.visible = false;
        run_num -= 1
        return
      }
      await moveDoorsFromGroup(track_doors,1);

      await sleep(7000); // 3秒待ってからまた開ける
      if (run_STOP){
        trainCars.visible = false;
        moveDoorsFromGroup(track_doors,0);
        run_num -= 1
        return
      }
      await moveDoorsFromGroup(track_doors,0)
      if (run_STOP){
        trainCars.visible = false;
        run_num -= 1
        return
      }
      await sleep(3000); // 3秒待ってからまた開ける

    }

    if (run_STOP){
      trainCars.visible = false;
      run_num -= 1
      return
    }
    requestAnimationFrame(runCar);
    
  }

  runCar();

}

// --- リサイズ対応 ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- マップの半自動作成(路線設定) ---

// 座標感覚の可視化
// Map_pin(10,10,20,0.2,0xff0000)
// Map_pin(10,10,10,0.5,0xff0000)

// Map_pin(-10,10,20,0.2,0xff0000)
// Map_pin(-10,10,10,0.5,0x0000ff)

// Map_pin(-10,-10,20,0.2,0x0000ff)
// Map_pin(-10,-10,10,0.5,0x0000ff)

// Map_pin(10,-10,20,0.2,0x0000ff)
// Map_pin(10,-10,10,0.5,0xff0000)


let y = 0
let Points_0 = []
let Points_1 = []
let Points_2 = []
let Points_3 = []

y = 7
const x_plus = 10
const z_plus = 0
const points = [
  new THREE.Vector3(7+x_plus, y+0.7, -140.601+z_plus),
  new THREE.Vector3(0.312+x_plus, y+0.5, -104.023+z_plus),
  new THREE.Vector3(-14.196+x_plus, y+2.3, -146.858+z_plus),
  new THREE.Vector3(-4.561+x_plus, y+2.3, -109.569+z_plus),
  new THREE.Vector3(-15.657+x_plus, y+2.3, -146.520+z_plus),
  new THREE.Vector3(-6.022+x_plus, y+2.3, -109.232+z_plus),
  new THREE.Vector3(5+x_plus, y+0.4, -140.151+z_plus),
  new THREE.Vector3(-5.198+x_plus, y-0.5, -107.883+z_plus),
]

// --- JR中央線 track1 ---
Points_0 = [

  points[0],
  points[1],
  // points[2],
  
  // new THREE.Vector3(31-1, y+0.7, -135),
  // new THREE.Vector3(20-1, y+0.5, -100),

  new THREE.Vector3(5.5, y, -50),

  // new THREE.Vector3(4.8, y, -20),
  // new THREE.Vector3(4.8, y, 40),
  new THREE.Vector3(4.8, y, -30),
  new THREE.Vector3(4.8, y, 50),     // お茶の水駅上空
  new THREE.Vector3(3,y, 90), // 高架にする（y = 5）
];
// --- JR総武線 track2 ---
Points_1 = [
  
  new THREE.Vector3(-11.3, y+2.3, -170),

  points[2],
  points[3],
  // new THREE.Vector3(15-0.5, y+2.3, -140),
  // new THREE.Vector3(16-0.5, y+2.3, -101.5),

  new THREE.Vector3(3-0.5, y, -50),

  new THREE.Vector3(0.8, y, -25),
  new THREE.Vector3(0.8, y, 50),
  new THREE.Vector3(-2, y, 90),
];

// --- JR総武線 track3 ---
Points_2 = [

  new THREE.Vector3(-13.3, y+2.3, -170),

  points[4],
  points[5],

  // new THREE.Vector3(13, y+2.3, -140),
  // new THREE.Vector3(14, y+2.3, -101.5),

  new THREE.Vector3(1, y, -50),
  // new THREE.Vector3(-0.8, y, -30),

  new THREE.Vector3(-0.8, y, -20),
  // new THREE.Vector3(-0.8, y, 40),

  new THREE.Vector3(-0.8, y, 50),     // お茶の水駅上空
  new THREE.Vector3(-4,y, 90), // 高架にする（y = 5）
];

// --- JR中央線 track4 ---
Points_3 = [ 
  points[6],
  points[7],
  // points[8],
  // points[9],
  // points[10],
  // points[11],
  // new THREE.Vector3(28, y+0.4, -135),
  // new THREE.Vector3(14.5, y-0.4, -105),
  new THREE.Vector3(-2.5, y, -50),
  
  new THREE.Vector3(-4.8, y, -20),
  // new THREE.Vector3(-4.8, y, 30),

  new THREE.Vector3(-4.8, y, 40),
  new THREE.Vector3(-9, y, 90),
];

// 指定したポイントから線(線路の軌道)を生成
const line_1 = new THREE.CatmullRomCurve3(Points_0);
const line_2 = new THREE.CatmullRomCurve3(Points_1);
const line_3 = new THREE.CatmullRomCurve3(Points_2);
const line_4 = new THREE.CatmullRomCurve3(Points_3);

function sliceCurvePoints(curve, startRatio, endRatio, resolution = 1000) {
  const points = curve.getPoints(resolution);
  const startIndex = Math.floor(startRatio * points.length);
  const endIndex = Math.floor(endRatio * points.length);
  const sliced = points.slice(startIndex, endIndex);
  return new THREE.CatmullRomCurve3(sliced);
}

const start = 0.4;
const end = 0.8;
const track1 = sliceCurvePoints(line_1, start, end);
const track4 = sliceCurvePoints(line_4, start, end+0.04);
const start2 = 0.5;
const end2 = 0.85;
const track2 = sliceCurvePoints(line_2, start2, end2);
const track3 = sliceCurvePoints(line_3, start2, end2);

TSys.createTrack(line_1, 0xff0000)
TSys.createTrack(line_2, 0x772200)

TSys.createTrack(line_3, 0x002277)
TSys.createTrack(line_4, 0x0000ff)

// 高架(柱/床版)を生成
const interval = 1
const Elevated_start = 0.32
const Elevated_end = 1
TSys.generateElevated(line_1, 10, interval);
TSys.generateElevated(sliceCurvePoints(line_2, Elevated_start, Elevated_end), 10, interval);
TSys.generateElevated(sliceCurvePoints(line_3, Elevated_start+0.02, Elevated_end), 10, interval);
TSys.generateElevated(line_4, 10, interval);

TSys.createBridgeGirder(sliceCurvePoints(line_2, 0, Elevated_start), 10, interval);
TSys.createBridgeGirder(sliceCurvePoints(line_3, 0, Elevated_start+0.02), 10, interval);

// 線路生成
TSys.createRail(line_1, 60)
TSys.createRail(line_2, 60)
TSys.createRail(line_3, 60)
TSys.createRail(line_4, 60)

// 駅(プラットホーム)を生成
TSys.createStation(track1,track2,200,y,0.7, '|[]|') // 島式 |[]| : 相対式 []||[]
TSys.createStation(track3,track4,200,y,0.7, '|[]|') // 島式 |[]| : 相対式 []||[]

// 駅(屋根)を生成
const roof_start = 0.4;
const roof_end = 0.675;
const roof_track1 = sliceCurvePoints(line_1, roof_start, roof_end);
const roof_start2 = 0.5;
const roof_end2 = 0.725;
const roof_track2 = sliceCurvePoints(line_2, roof_start2, roof_end2);
TSys.placePlatformRoof(roof_track1,roof_track2,y+1.4,10)

const roof_track3 = sliceCurvePoints(line_3, roof_start2, roof_end2);
const roof_track4 = sliceCurvePoints(line_4, roof_start, 0.6846);
TSys.placePlatformRoof(roof_track3,roof_track4,y+1.4,10)

// 駅(ホームドア)を生成
const train_width = 6.8
const car_Spacing = 0.15

const door_interval = train_width + car_Spacing
const track1_doors = TSys.placePlatformDoors(track1, 0.9, door_interval, 'left');  // 左側に設置
const track2_doors = TSys.placePlatformDoors(track2, 0.9, door_interval, 'right');  // 左側に設置

const track3_doors = TSys.placePlatformDoors(track3, 0.9, door_interval, 'left');  // 左側に設置
const track4_doors = TSys.placePlatformDoors(track4, 0.9, door_interval, 'right');  // 左側に設置

// 壁の生成
const wall_start = 0.24;
const wall_end = 0.42;
const wall_track1 = sliceCurvePoints(line_1, wall_start, wall_end);
const wall_track2 = sliceCurvePoints(line_2, 0.37, 0.5);
TSys.createWall(wall_track1,wall_track2,40,0.8,-0.8,-0.9,-0.9)
const wall_track3 = sliceCurvePoints(line_3, 0.37, 0.5);
const wall_track4 = sliceCurvePoints(line_4, wall_start, wall_end);
TSys.createWall(wall_track3,wall_track4,40,0.8,-0.8,-0.9,-0.9)

const tunnel_start = 0.16;
const tunnel_end = 0.24;
// const tunnel_start = 0.25;
// const tunnel_end = 0.7;
const tunnel_1 = sliceCurvePoints(line_4, tunnel_start, tunnel_end);
// const points_3 = sliceCurvePoints(line_4, tunnel_start, tunnel_end);
const tunnel_2 = sliceCurvePoints(line_4, tunnel_start, tunnel_end);
const quantity = 3

TSys.createWall(tunnel_1,tunnel_1,40,-0.9,-0.9,-1,1.5)
TSys.createWall(tunnel_1,tunnel_1,40,0.9,0.9,-1,1.5)

TSys.createWall(line_4,line_4,40,0.885,2,-0.95,-6)
TSys.createWall(line_4,line_4,40,10,10,-6,-4)
TSys.createWall(line_4,line_4,40,10,30,-4,-4)

const water_material = new THREE.MeshStandardMaterial({
  color: 0x005555,         // 白ベース
  metalness: 0.3,          // 完全な金属
  roughness: 0,          // 少しザラつき（0.0だと鏡面すぎる）
  envMapIntensity: 1,    // 環境マップの反射強度（あるとリアル）
  side: THREE.DoubleSide   // 両面描画（必要なら）
});
TSys.createWall(line_4,line_4,40,2,10,-5,-5,0x003355,water_material)

const board_length_1 = tunnel_1.getLength(line_4)/quantity;
const board_length_2 = tunnel_2.getLength(line_4)/quantity;
const points_1 = TSys.RailMargin(TSys.getPointsEveryM(tunnel_1, board_length_1), 1);
const points_2 = TSys.RailMargin(TSys.getPointsEveryM(tunnel_2, board_length_2), -1);

for(let i=0; i < points_1.length-1; i++){
  const coordinate1 = points_1[i]
  const coordinate2 = points_2[i]
  
  const coordinate4 = points_1[i+1]
  const coordinate3 = points_2[i+1]

  const shape = new THREE.Shape();
  shape.moveTo(coordinate1.x, coordinate1.z);
  shape.lineTo( coordinate2.x, coordinate2.z);
  shape.lineTo(coordinate3.x, coordinate3.z);
  shape.lineTo(coordinate4.x, coordinate4.z);

  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.55, bevelEnabled: false });
  const material = new THREE.MeshStandardMaterial({
    color: 0x333333,
    metalness: 0.5,
    roughness: 0.9,
    envMap: scene.environment,  // もし読み込んでるなら
    envMapIntensity: 3,
    side: THREE.FrontSide
  });
  
  
  const mesh = new THREE.Mesh(geometry, material);

  mesh.rotation.x = 91 * Math.PI / 180;
  mesh.position.y = 6.25; // 高さ1.5に移動

  scene.add(mesh);

}

// 架線柱の生成
const point_data = TSys.RailMargin(TSys.getPointsEveryM(wall_track4, 8), 1, true);
const pole_line = point_data[0]
const pole_angle = point_data[1]

// right_height, left_height, beamLength, beam_height
const Poles = TSys.createCatenaryPole(0,3.2,1.4,2.3, 5)
for(let i=0; i<Poles.children.length; i++){
  Poles.children[i].rotation.y += pole_angle[i]
  Poles.children[i].position.set(pole_line[i].x,pole_line[i].y-1,pole_line[i].z)
}
scene.add(Poles)

const poletrak = sliceCurvePoints(line_3, 0, 0.8);
const point_data2 = TSys.RailMargin(TSys.getPointsEveryM(poletrak, 8), 1, true);
const pole_line2 = point_data2[0]
const pole_angle2 = point_data2[1]

// right_height, left_height, beamLength, beam_height
const Poles2 = TSys.createCatenaryPole(2.8,2.8,3.5,2.3, 16)
for(let i=0; i<Poles2.children.length; i++){
  Poles2.children[i].rotation.y += pole_angle2[i]
  Poles2.children[i].position.set(pole_line2[i].x,pole_line2[i].y-1,pole_line2[i].z)
}
scene.add(Poles2)

// 桁橋 実装中
TSys.placeGirderBridge(sliceCurvePoints(line_2, 0.24, 0.32),sliceCurvePoints(line_3, 0.25, 0.34),8,2)

// 電車の運行
// const max_speed = 0.001 // 制限速度(最高)
// const add_speed = 0.0000010 // 追加速度(加速/減速)
const max_speed = 0.0004 // 制限速度(最高)
const add_speed = 0.000001 // 追加速度(加速/減速)

const exhibition_tyuou = TrainSettings(
  train_width,
  0xaaaaaa,
  12,
  1,
);

const exhibition_soubu = TrainSettings(
  train_width,
  0xaaaaaa,
  10,
  1,
);

exhibition_tyuou.position.set(11,0.8,15)
exhibition_tyuou.visible = true;   // 再表示する
exhibition_soubu.position.set(13,0.8,15)
exhibition_soubu.visible = true;   // 再表示する

const Train_1 = TrainSettings(
  train_width,
  0xaaaaaa,
  12,
  1,
);

const Train_4 = TrainSettings(
  train_width,
  0xaaaaaa,
  12,
  1,
);

const reversedCurve_4 = new THREE.CatmullRomCurve3(
  line_4.getPoints(100).reverse()
);

const Train_2 = TrainSettings(
  train_width,
  0xaaaaaa,
  10,
  1,
);

const Train_3 = TrainSettings(
  train_width,
  0xaaaaaa,
  10,
  1,
);

const reversedCurve_3 = new THREE.CatmullRomCurve3(
  line_3.getPoints(100).reverse()
);

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// ボタン取得
let button = document.getElementById("toggle-crossover");
let crossoverRequested = false;
let run_quattro = 0
// クアトロ交差を実行する関数
async function startQuadrupleCrossDemo() {
  
  run_quattro += 1
  const run_number = run_quattro
  
  // ボタン押下イベント（要求をフラグにする）
  button.addEventListener("click", () => {
    crossoverRequested = true;
    button.innerText = `立体交差 [ 準備中... ]（列車未撤収 ${run_num} 編成）`;
  });

  crossoverRequested = true;

  while (run_quattro != run_number){
    await sleep(2000)
  }

  run_STOP = true
  quattro = 4

  while (run_num > 0){
    if (run_quattro > run_number){
      return
    }  
    button.innerText = `立体交差 [ 準備中... ]（列車未撤収 ${run_num} 編成）`;
    await sleep(2000)
  }

  run_STOP = false

  // 4本の列車を同時にスタート
  runTrain(Train_3, reversedCurve_3, track3_doors, door_interval, max_speed, add_speed, 0.501, 0.5)
  runTrain(Train_4, reversedCurve_4, track4_doors, door_interval, max_speed, add_speed, 0.5439, 0.5)
  runTrain(Train_1, line_1, track1_doors, door_interval, max_speed, add_speed, 0.7695, -0.4)
  runTrain(Train_2, line_2, track2_doors, door_interval, max_speed, add_speed, 0.777 -0.4)

  while (quattro > 0){
    if (run_quattro > run_number){
      return
    }  
    button.innerText = `立体交差 実行中...（走行中 ${run_num}）`;
    await sleep(2000)
  }

  button.innerText = `ランダム立体交差（クアトロ交差）切替`

  runTrain(Train_1, line_1, track1_doors, door_interval, max_speed, add_speed, 0.7695)
  runTrain(Train_2, line_2, track2_doors, door_interval, max_speed, add_speed, 0.777)
  runTrain(Train_3, reversedCurve_3, track3_doors, door_interval, max_speed, add_speed, 0.501)
  runTrain(Train_4, reversedCurve_4, track4_doors, door_interval, max_speed, add_speed, 0.5439)

  run_quattro = 0
  crossoverRequested = false;
}

document.getElementById("toggle-crossover").addEventListener("click", () => {
  // camera.position.set(-5, 8, -60);
  // cameraAngleX = 0.1
  // cameraAngleY = 2.3;

  startQuadrupleCrossDemo();  // ← ここで関数を呼び出す
});


// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

runTrain(Train_1, line_1, track1_doors, door_interval, max_speed, add_speed, 0.7695)
runTrain(Train_2, line_2, track2_doors, door_interval, max_speed, add_speed, 0.777)
runTrain(Train_3, reversedCurve_3, track3_doors, door_interval, max_speed, add_speed, 0.501)
runTrain(Train_4, reversedCurve_4, track4_doors, door_interval, max_speed, add_speed, 0.5439)

// カメラ操作 ----------------------------------------------------------------

// アナロク操作（デバッグ用）
// カメラの位置（視点の位置）
3, y, -50
//                  -         ↑↓
camera.position.set(-0.1, 14, -35);
// カメラの注視点（視線の向き
camera.lookAt(new THREE.Vector3(3, y, -35));
// renderer.render(scene, camera);

// キーボード操作（鑑賞用）
// ========== 設定値 ========== //
let baseSpeed = 0.1;
const rotateSpeed = 0.03;
const pitchLimit = Math.PI / 2 - 0.1;

// ========== 入力管理 ========== //
const keys = {};
document.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
document.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);
let key = null
document.addEventListener('keydown', (e) => {
  key = e.key.toLowerCase();
});
document.addEventListener('keyup', (e) => {
  key = null
});
// ========== カメラ制御変数 ========== //
let cameraAngleY = 0;  // 水平回転
let cameraAngleX = 0;  // 垂直回転

// ========== ボタン UI ========== //
// 状態フラグ
let speedUp = false;
let moveUp = false;
let moveDown = false;

document.getElementById('speed-up').addEventListener('touchstart', () => speedUp = true);
document.getElementById('speed-up').addEventListener('mousedown', () => speedUp = true);

document.getElementById('speed-down').style.display = 'none';
document.getElementById('speed-down').addEventListener('touchstart', () => speedUp = true);
document.getElementById('speed-down').addEventListener('mousedown', () => speedUp = true);

document.getElementById('btn-up').addEventListener('touchstart', () => moveUp = true);
document.getElementById('btn-up').addEventListener('touchend', () => moveUp = false);
document.getElementById('btn-down').addEventListener('touchstart', () => moveDown = true);
document.getElementById('btn-down').addEventListener('touchend', () => moveDown = false);

document.getElementById('btn-up').addEventListener('mousedown', () => moveUp = true);
document.getElementById('btn-up').addEventListener('mouseup', () => moveUp = false);
document.getElementById('btn-down').addEventListener('mousedown', () => moveDown = true);
document.getElementById('btn-down').addEventListener('mouseup', () => moveDown = false);

// ========== スティック移動ベクトル ========== //
let moveVector = { x: 0, y: 0 };

// ========== スティック UI ========== //
const joystickLeft = nipplejs.create({
  zone: document.getElementById('left-stick'),
  mode: 'static',
  position: { left: '20%', bottom: '20%' },
  color: 'blue',
});

const joystickLook = nipplejs.create({
  zone: document.getElementById('right-stick'),
  mode: 'static',
  position: { right: '20%', bottom: '20%' },
  color: 'red',
});

joystickLeft.on('move', (evt, data) => {
  if (!data.angle) return;
  const rad = data.angle.radian -1.6;
  const speed = data.distance * 0.02;

  const adjustedRad = rad + cameraAngleY;

  moveVector.x = Math.sin(adjustedRad) * speed;
  moveVector.y = Math.cos(adjustedRad) * speed;
});

joystickLeft.on('end', () => {
  moveVector.x = 0;
  moveVector.y = 0;
});

let lookVector = { x: 0, y: 0 };

joystickLook.on('move', (evt, data) => {
  const rad = data.angle.radian - 1.6;

  // ベクトル成分に変換（X: 横方向, Y: 縦方向）
  const vecX = Math.sin(rad)
  const vecY = Math.cos(rad)

  const speed = data.distance * 0.0006;

  const speed_x = vecX*speed ;   // 距離（スティックの傾き強さ）
  const speed_y = vecY*speed ;   // 距離（スティックの傾き強さ）
  
  // 水平方向の回転量
  lookVector.x = speed_x
  // 垂直方向の回転量
  lookVector.y = speed_y

});

joystickLook.on('end', () => {
  lookVector.x = 0;
  lookVector.y = 0;
});

// ========== アニメーションループ ========== //
function animate() {
  requestAnimationFrame(animate);

  const moveSpeed = baseSpeed;

  // キーボード移動処理
  const strafe = (keys['a'] ? 1 : 0) - (keys['d'] ? 1 : 0);
  const forward = (keys['w'] ? 1 : 0) - (keys['s'] ? 1 : 0);

  // 数字キー押下で倍率設定
  if (key >= '1' && key <= '9') {
    baseSpeed = parseInt(key, 10) * (parseInt(key, 10) *0.005);
  }
  // 0キーで倍率リセット
  else if (key === '0') {
    baseSpeed = moveSpeed;
  }

  // カメラ角度による方向ベクトル
  const camX = Math.sin(cameraAngleY);
  const camZ = Math.cos(cameraAngleY);

  // 横移動
  camera.position.x += Math.sin(cameraAngleY + Math.PI / 2) * moveSpeed * strafe;
  camera.position.z += Math.cos(cameraAngleY + Math.PI / 2) * moveSpeed * strafe;

  // 前後移動
  camera.position.x += camX * moveSpeed * forward;
  camera.position.z += camZ * moveSpeed * forward;

  // スティック入力（カメラ基準移動）
  camera.position.x += moveVector.x * moveSpeed;
  camera.position.z += moveVector.y * moveSpeed;

  if (speedUp) {
    if (baseSpeed === 0.1){
      baseSpeed = 0.3
      document.getElementById('speed-up').style.display = 'none';
      document.getElementById('speed-down').style.display = 'block';
    } else {
      baseSpeed = 0.1
      document.getElementById('speed-up').style.display = 'block';
      document.getElementById('speed-down').style.display = 'none';
    }
    speedUp = false
  }

  // 上下移動（Q/Eキー）
  if (keys['q'] || moveUp) {
    camera.position.y += moveSpeed;
  }
  if (keys['e'] || moveDown) {
    camera.position.y -= moveSpeed;
  }
  
  // 回転（左右）
  if (keys['arrowleft'])  cameraAngleY += rotateSpeed;
  if (keys['arrowright']) cameraAngleY -= rotateSpeed;

  // 回転（上下）
  if (keys['arrowup'])    cameraAngleX += rotateSpeed;
  if (keys['arrowdown'])  cameraAngleX -= rotateSpeed;
  cameraAngleX = Math.max(-pitchLimit, Math.min(pitchLimit, cameraAngleX));

  // カメラ注視点の更新
  // rightStickVector.x → 左右方向（横回転に使う）
  // rightStickVector.y → 上下方向（縦回転に使う）
  cameraAngleY += lookVector.x;
  cameraAngleX += lookVector.y;

  // ピッチ制限（上下の角度が大きくなりすぎないように）
  cameraAngleX = Math.min(pitchLimit, Math.max(-pitchLimit, cameraAngleX));

  // カメラの注視点の更新（カメラ位置 + 方向ベクトル）
  const direction = new THREE.Vector3(
    Math.sin(cameraAngleY) * Math.cos(cameraAngleX),
    Math.sin(cameraAngleX),
    Math.cos(cameraAngleY) * Math.cos(cameraAngleX)
  );

  const target = new THREE.Vector3().addVectors(camera.position, direction);
  camera.lookAt(target);

  renderer.render(scene, camera);
}

animate();

// // -----------------------------------------------------------------------------

// --- マップの手動作成(駅舎設定) ---

const ceiling_Spacing = (train_width+car_Spacing) +2
const beam_Spacing = ceiling_Spacing/9
const Podium_deck_width = ceiling_Spacing*5 + beam_Spacing*3

function object_update({
  ins_obj = NaN,
  ins_idx = NaN,
  pos_x = NaN,
  pos_y = NaN,
  pos_z = NaN,
  rot_x = NaN,
  rot_y = NaN,
  rot_z = NaN,
  scale = NaN} = {}) {
    
    const dummy = new THREE.Object3D();
    // 位置の更新
    if (!Number.isNaN(pos_x)) dummy.position.x = pos_x;
    if (!Number.isNaN(pos_y)) dummy.position.y = pos_y;
    if (!Number.isNaN(pos_z)) dummy.position.z = pos_z;

    // 回転の更新
    if (!Number.isNaN(rot_x)) dummy.rotation.x = rot_x;
    if (!Number.isNaN(rot_y)) dummy.rotation.y = rot_y;
    if (!Number.isNaN(rot_z)) dummy.rotation.z = rot_z;

    // スケールの更新
    if (!Number.isNaN(scale)) dummy.scale.setScalar(scale);

    dummy.updateMatrix();                       // 行列計算更新
    ins_obj.setMatrixAt(ins_idx, dummy.matrix); // i番目のインスタンスに行列を適用
    ins_obj.instanceMatrix.needsUpdate = true;  // 更新フラグ
  }

if (true) {

  // 鉄のような金属マテリアル設定
  const metalParams = {
    color: 0x999999,      // 明るめのグレー（鉄色）
    metalness: 0.3,       // 金属光沢最大
    roughness: 0.25,      // 少しザラザラ（低くするとツルツル）
    envMapIntensity: 1.0,    // 環境マップの反射強度（envMapを使うなら）
    side: THREE.FrontSide,
  };

  // 鉄のような金属マテリアル設定
  const metalParams_2 = {
    color: 0xffffff,      // 暗めのグレー（鉄色）
    metalness: 0.5,       // 金属光沢最大
    roughness: 0.0,       // 少しザラザラ（低くするとツルツル）
    envMapIntensity: 1.0,    // 環境マップの反射強度（envMapを使うなら）
    side: THREE.FrontSide,
  };

  // 1. 天井本体（Mesh）
  const ceilingGeometry = new THREE.BoxGeometry(10, 0.1, Podium_deck_width);
  const ceilingMaterial = new THREE.MeshStandardMaterial({...metalParams});
  const ceilingMesh = new THREE.Mesh(ceilingGeometry, ceilingMaterial);

  let geometry = NaN
  let material = NaN

  // 2. 柱（縦方向ビーム）
  geometry = new THREE.BoxGeometry(0.05, 1, Podium_deck_width);
  material = new THREE.MeshStandardMaterial({...metalParams});
  const beam_pillar = new THREE.InstancedMesh(geometry, material, 10);

  // 3. 柱（横方向ビーム）
  geometry = new THREE.BoxGeometry(0.05, 1, 10);
  material = new THREE.MeshStandardMaterial({...metalParams});
  const count = 49;
  const beam_pillar_2 = new THREE.InstancedMesh(geometry, material, count);

  // 4. 鉄骨梁（縦）
  geometry = new THREE.BoxGeometry(0.15, 0.05, Podium_deck_width);
  material = new THREE.MeshStandardMaterial({...metalParams});
  const beam = new THREE.InstancedMesh(geometry, material, 10);

  // 5. 鉄骨梁（横）
  geometry = new THREE.BoxGeometry(0.15, 0.05, 10);
  material = new THREE.MeshStandardMaterial({...metalParams});
  const beam_2 = new THREE.InstancedMesh(geometry, material, count);

  // 6. 小天井板（パーツ）
  geometry = new THREE.BoxGeometry(beam_Spacing, 0.05, 10);
  material = new THREE.MeshStandardMaterial({...metalParams});
  const ceiling = new THREE.InstancedMesh(geometry, material, 6);

  // 7. 柱
  const radiusTop = 0.3;     // 上面の半径
  const radiusBottom = 0.3;  // 下面の半径
  const height = 3;          // 高さ
  const radialSegments = 32; // 円周方向の分割数

  geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments);
  material = new THREE.MeshStandardMaterial({...metalParams});
  const cylinder = new THREE.InstancedMesh(geometry, material, 12);
  
  // 8. 支柱
  const radiusTop_2 = 0.01;    // 上面の半径
  const radiusBottom_2 = 0.01; // 下面の半径
  const height_2 = 0.5;        // 高さ
  const radialSegments_2 = 5;  // 円周方向の分割数

  geometry = new THREE.CylinderGeometry(radiusTop_2, radiusBottom_2, height_2, radialSegments_2);
  material = new THREE.MeshStandardMaterial({...metalParams_2});
  const prop = new THREE.InstancedMesh(geometry, material, 376);

  // 9. 小天井板（パーツ）
  geometry = new THREE.BoxGeometry(Podium_deck_width, 0.04, 0.3);
  material = new THREE.MeshStandardMaterial({...metalParams});
  const board = new THREE.InstancedMesh(geometry, material, 4);

  // 光源の追加
  function createPointLight(color = 0xffffff, intensity = 1, distance = 100, position = [0, 10, 0]) {
    const light = new THREE.PointLight(color, intensity, distance);
    light.position.set(...position);
    scene.add(light);
    return light;
  }  

  let beam_y = 9.4
  let beam_z = 20
  object_update({ins_obj: beam_pillar, ins_idx: 0, pos_x: 5.5,  pos_y: beam_y, pos_z: beam_z, rot_x: NaN, rot_y: NaN, rot_z: NaN,scale: NaN})      // | : : : : : : :
  object_update({ins_obj: beam_pillar, ins_idx: 1, pos_x: 4,  pos_y: beam_y, pos_z: beam_z, rot_x: NaN, rot_y: NaN, rot_z: NaN,scale: NaN})      // : | : : : : : :
  object_update({ins_obj: beam_pillar, ins_idx: 2, pos_x: 2.8,  pos_y: beam_y, pos_z: beam_z, rot_x: NaN, rot_y: NaN, rot_z: NaN,scale: NaN})      // : : | : : : : :
  object_update({ins_obj: beam_pillar, ins_idx: 3, pos_x: 1.7,  pos_y: beam_y, pos_z: beam_z, rot_x: NaN, rot_y: NaN, rot_z: NaN,scale: NaN})      // : : | : : : : :
  object_update({ins_obj: beam_pillar, ins_idx: 4, pos_x: 0.6,  pos_y: beam_y, pos_z: beam_z, rot_x: NaN, rot_y: NaN, rot_z: NaN,scale: NaN})      // : : : | : : : :
  object_update({ins_obj: beam_pillar, ins_idx: 5, pos_x: -0.6, pos_y: beam_y, pos_z: beam_z, rot_x: NaN, rot_y: NaN, rot_z: NaN,scale: NaN})      // : : : : | : : :
  object_update({ins_obj: beam_pillar, ins_idx: 6, pos_x: -1.7, pos_y: beam_y, pos_z: beam_z, rot_x: NaN, rot_y: NaN, rot_z: NaN,scale: NaN})      // : : : : : | : :
  object_update({ins_obj: beam_pillar, ins_idx: 7, pos_x: -2.9,   pos_y: beam_y, pos_z: beam_z, rot_x: NaN, rot_y: NaN, rot_z: NaN,scale: NaN})      // : : : : : : | : 
  object_update({ins_obj: beam_pillar, ins_idx: 8, pos_x: -4,   pos_y: beam_y, pos_z: beam_z, rot_x: NaN, rot_y: NaN, rot_z: NaN,scale: NaN})      // : : : : : : | :
  object_update({ins_obj: beam_pillar, ins_idx: 9, pos_x: -4.5, pos_y: beam_y+0.5, pos_z: beam_z, rot_x: NaN, rot_y: NaN, rot_z: NaN,scale: NaN})  // : : : : : : : |

  beam_y -= 0.5
  object_update({ins_obj: beam, ins_idx: 0, pos_x: 5.5,  pos_y: beam_y, pos_z: beam_z, rot_x: NaN, rot_y: NaN, rot_z: NaN,scale: NaN})
  object_update({ins_obj: beam, ins_idx: 1, pos_x: 4,  pos_y: beam_y, pos_z: beam_z, rot_x: NaN, rot_y: NaN, rot_z: NaN,scale: NaN})
  object_update({ins_obj: beam, ins_idx: 2, pos_x: 2.8,  pos_y: beam_y, pos_z: beam_z, rot_x: NaN, rot_y: NaN, rot_z: NaN,scale: NaN})      // : : | : : : : :
  object_update({ins_obj: beam, ins_idx: 3, pos_x: 1.7,  pos_y: beam_y, pos_z: beam_z, rot_x: NaN, rot_y: NaN, rot_z: NaN,scale: NaN})
  object_update({ins_obj: beam, ins_idx: 4, pos_x: 0.6,  pos_y: beam_y, pos_z: beam_z, rot_x: NaN, rot_y: NaN, rot_z: NaN,scale: NaN})
  object_update({ins_obj: beam, ins_idx: 6, pos_x: -0.6, pos_y: beam_y, pos_z: beam_z, rot_x: NaN, rot_y: NaN, rot_z: NaN,scale: NaN})
  object_update({ins_obj: beam, ins_idx: 5, pos_x: -1.7, pos_y: beam_y, pos_z: beam_z, rot_x: NaN, rot_y: NaN, rot_z: NaN,scale: NaN})
  object_update({ins_obj: beam, ins_idx: 7, pos_x: -2.9,   pos_y: beam_y, pos_z: beam_z, rot_x: NaN, rot_y: NaN, rot_z: NaN,scale: NaN})
  object_update({ins_obj: beam, ins_idx: 8, pos_x: -4,   pos_y: beam_y, pos_z: beam_z, rot_x: NaN, rot_y: NaN, rot_z: NaN,scale: NaN})
  object_update({ins_obj: beam, ins_idx: 9, pos_x: -4.5, pos_y: beam_y+0.5, pos_z: beam_z, rot_x: NaN, rot_y: NaN, rot_z: NaN,scale: NaN})


  beam_y += 0.5
  const Podium_deck_start = Podium_deck_width/2
  for (let i = 0; i < 49; i++) {
    object_update({ins_obj: beam_pillar_2, ins_idx: i, pos_x: 0.5, pos_y: beam_y, pos_z: beam_z-Podium_deck_start + i*beam_Spacing, rot_x: NaN, rot_y: Math.PI/2, rot_z: NaN,scale: NaN})
    object_update({ins_obj: beam_2, ins_idx: i, pos_x: 0.5, pos_y: beam_y-0.5, pos_z: beam_z-Podium_deck_start + i*beam_Spacing, rot_x: NaN, rot_y: Math.PI/2, rot_z: NaN,scale: NaN})
  }

  const Light_Spot_margin = ceiling_Spacing/2
  for (let i = 0; i < 6; i++) {
    object_update({ins_obj: ceiling,  ins_idx: i, pos_x: 0.5, pos_y: beam_y-0.5, pos_z: beam_z-Podium_deck_start+beam_Spacing/2*3 + i*ceiling_Spacing, rot_x: NaN, rot_y: Math.PI/2, rot_z: NaN,scale: NaN})
    object_update({ins_obj: cylinder, ins_idx: i*2, pos_x: 2.8, pos_y: beam_y-1.5, pos_z: beam_z-Podium_deck_start+beam_Spacing/2*3 + i*ceiling_Spacing, rot_x: NaN, rot_y: Math.PI/2, rot_z: NaN,scale: NaN})
    object_update({ins_obj: cylinder, ins_idx: i*2+1, pos_x: -2.9, pos_y: beam_y-1.5, pos_z: beam_z-Podium_deck_start+beam_Spacing/2*3 + i*ceiling_Spacing, rot_x: NaN, rot_y: Math.PI/2, rot_z: NaN,scale: NaN})
    createPointLight(0xffffff, 10, 10, [2.55, beam_y-1.05, beam_z-Podium_deck_start+ beam_Spacing/2*3 - ceiling_Spacing/4 + Light_Spot_margin + i*ceiling_Spacing]);
    createPointLight(0xffffff, 10, 10, [2.55, beam_y-1.05, beam_z-Podium_deck_start+ beam_Spacing/2*3 - ceiling_Spacing/4 + Light_Spot_margin*2 + i*ceiling_Spacing]);
    createPointLight(0xffffff, 10, 10, [-2.9, beam_y-1.05, beam_z-Podium_deck_start+ beam_Spacing/2*3 - ceiling_Spacing/4 + Light_Spot_margin + i*ceiling_Spacing]);
    createPointLight(0xffffff, 10, 10, [-2.9, beam_y-1.05, beam_z-Podium_deck_start+ beam_Spacing/2*3 - ceiling_Spacing/4 + Light_Spot_margin*2 + i*ceiling_Spacing]);
  }

  for (let i = 0; i < 47; i++){
    // 3.5
    object_update({ins_obj: prop, ins_idx: i*8,   pos_x: 4.05, pos_y: beam_y-0.8, pos_z: beam_z-Podium_deck_start+beam_Spacing/2*3 + i*beam_Spacing, rot_x: NaN, rot_y: Math.PI/2, rot_z: NaN,scale: NaN})
    object_update({ins_obj: prop, ins_idx: i*8+1, pos_x: 3.95, pos_y: beam_y-0.8, pos_z: beam_z-Podium_deck_start+beam_Spacing/2*3 + i*beam_Spacing, rot_x: NaN, rot_y: Math.PI/2, rot_z: NaN,scale: NaN})
    // 1.7
    object_update({ins_obj: prop, ins_idx: i*8+2, pos_x: 1.75, pos_y: beam_y-0.8, pos_z: beam_z-Podium_deck_start+beam_Spacing/2*3 + i*beam_Spacing, rot_x: NaN, rot_y: Math.PI/2, rot_z: NaN,scale: NaN})
    object_update({ins_obj: prop, ins_idx: i*8+3, pos_x: 1.65, pos_y: beam_y-0.8, pos_z: beam_z-Podium_deck_start+beam_Spacing/2*3 + i*beam_Spacing, rot_x: NaN, rot_y: Math.PI/2, rot_z: NaN,scale: NaN})
    // -2.1
    object_update({ins_obj: prop, ins_idx: i*8+4, pos_x: -1.65, pos_y: beam_y-0.8, pos_z: beam_z-Podium_deck_start+beam_Spacing/2*3 + i*beam_Spacing, rot_x: NaN, rot_y: Math.PI/2, rot_z: NaN,scale: NaN})
    object_update({ins_obj: prop, ins_idx: i*8+5, pos_x: -1.75, pos_y: beam_y-0.8, pos_z: beam_z-Podium_deck_start+beam_Spacing/2*3 + i*beam_Spacing, rot_x: NaN, rot_y: Math.PI/2, rot_z: NaN,scale: NaN})
    // -4
    object_update({ins_obj: prop, ins_idx: i*8+6, pos_x: -3.95, pos_y: beam_y-0.8, pos_z: beam_z-Podium_deck_start+beam_Spacing/2*3 + i*beam_Spacing, rot_x: NaN, rot_y: Math.PI/2, rot_z: NaN,scale: NaN})
    object_update({ins_obj: prop, ins_idx: i*8+7, pos_x: -4.05, pos_y: beam_y-0.8, pos_z: beam_z-Podium_deck_start+beam_Spacing/2*3 + i*beam_Spacing, rot_x: NaN, rot_y: Math.PI/2, rot_z: NaN,scale: NaN})
  }

  for (let i = 0; i < 4; i++){
    object_update({ins_obj: board, ins_idx: i*4,   pos_x: 4,  pos_y: beam_y-1.05, pos_z: beam_z, rot_x: NaN, rot_y: Math.PI/2, rot_z: NaN,scale: NaN})
    object_update({ins_obj: board, ins_idx: i*4+1, pos_x: 1.7,  pos_y: beam_y-1.05, pos_z: beam_z, rot_x: NaN, rot_y: Math.PI/2, rot_z: NaN,scale: NaN})
    object_update({ins_obj: board, ins_idx: i*4+2, pos_x: -1.7, pos_y: beam_y-1.05, pos_z: beam_z, rot_x: NaN, rot_y: Math.PI/2, rot_z: NaN,scale: NaN})
    object_update({ins_obj: board, ins_idx: i*4+3, pos_x: -4,   pos_y: beam_y-1.05, pos_z: beam_z, rot_x: NaN, rot_y: Math.PI/2, rot_z: NaN,scale: NaN})
  }

  // 4. 配置（位置の設定）
  ceilingMesh.position.set(0.5, beam_y+0.5, beam_z); // 高さ12に配置（天井）
  // 5. シーンに追加
  scene.add(ceilingMesh);
  scene.add(ceiling);

  scene.add(beam_pillar);
  scene.add(beam);

  scene.add(beam_pillar_2);
  scene.add(beam_2);

  scene.add(cylinder);
  scene.add(prop);
  scene.add(board)

}

// -------------------------------------------------------------------------
cameraAngleY
cameraAngleX

// position.x, position.y, position.z で個別取得も可能

let frontViewActive = false;
let currentTrainCar = null;
let frontViewRequestId = null;
// 各列車の定義（先頭車両）
const trainCars = {
  1: Train_1.userData.cars[0],
  2: Train_2.userData.cars[0],
  3: Train_3.userData.cars[0],
  4: Train_4.userData.cars[0],
};

function startFrontView(trainCar) {
  currentTrainCar = trainCar;
  frontViewActive = true;

  function update() {
    if (!frontViewActive || !currentTrainCar) return;

    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const direction = new THREE.Vector3();

    currentTrainCar.getWorldPosition(position);
    currentTrainCar.getWorldQuaternion(quaternion);
    currentTrainCar.getWorldDirection(direction);

    // オフセット（少し後ろ＆上から）
    const offset = new THREE.Vector3(0, 0.2, 3.4);
    offset.applyQuaternion(quaternion);

    camera.position.copy(position).add(offset);

    // === 🔽 Yaw / Pitch で視線方向を調整 ===
    const yaw = Math.atan2(direction.x, direction.z);   // Y軸回転（左右）
    const pitch = Math.asin(direction.y);               // X軸回転（上下）

    // 必要な変数に代入（外部で使いたい場合）
    cameraAngleY = yaw;
    cameraAngleX = pitch;

    camera.rotation.set(pitch, yaw, 0); // ← Three.jsは (X, Y, Z) の順です
    // ====================================

    frontViewRequestId = requestAnimationFrame(update);
  }

  update();
}

function stopFrontView() {
  frontViewActive = false;
  if (frontViewRequestId !== null) {
    cancelAnimationFrame(frontViewRequestId);
    frontViewRequestId = null;
  }
}

const buttons = document.querySelectorAll(".frontViewBtn");

buttons.forEach(button => {
  button.addEventListener("click", () => {
    const trainNum = parseInt(button.dataset.train);
    const selectedCar = trainCars[trainNum];

    if (!frontViewActive || currentTrainCar !== selectedCar) {
      stopFrontView(); // 他の列車からの切り替え対応
      startFrontView(selectedCar);
      updateButtonLabels(trainNum);
    } else {
      stopFrontView();
      updateButtonLabels(null);
    }
  });
});

function updateButtonLabels(activeTrainNum) {
  buttons.forEach(button => {
    const num = parseInt(button.dataset.train);
    if (num === activeTrainNum) {
      button.textContent = `${num}番線 🚫 停止`;
    } else {
      button.textContent = `${num}番線`;
    }
  });
}

const group = new THREE.Group();

// 円弧Aのパラメータ
const arcA = {
  radius: 29,
  rangeDeg: 65,
  stepDeg: 16,
  thickness: 0.4,
  depth: 0.5,
  color: 0x996633,
  centerOffset: new THREE.Vector3(5, 0, 0),
  rotationOffset: 90 * Math.PI / 180
};

// 円弧Bのパラメータ
const arcB = {
  radius: 25.2,
  rangeDeg: 85,
  stepDeg: 16,
  thickness: 0.4,
  depth: 0.5,
  color: 0x336699,
  centerOffset: new THREE.Vector3(5, 3, 0),
  rotationOffset: 90 * Math.PI / 180
};

function createBoxBetweenPoints(x1, y1, x2, y2, thickness, depth, material) {
  // 長さと角度
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);

  // 中心位置
  const centerX = (x1 + x2) / 2;
  const centerY = (y1 + y2) / 2;

  // Box Geometry（幅＝length、厚み、奥行き）
  const geometry = new THREE.BoxGeometry(length, thickness, depth);
  const mesh = new THREE.Mesh(geometry, material);

  // 平面上での回転（Z軸回転でX-Yに合わせる）
  mesh.rotation.z = angle;

  // 配置
  mesh.position.set(centerX, centerY, 0); // zは0平面に
  return mesh;
}

function createBoxBetweenPoints3D(p1, p2, thickness, depth, material) {
  const dir = new THREE.Vector3().subVectors(p2, p1); // 方向ベクトル
  const length = dir.length(); // 距離（ボックスの長さ）
  const center = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5); // 中心点

  const geometry = new THREE.BoxGeometry(length, thickness, depth);
  const mesh = new THREE.Mesh(geometry, material);

  // デフォルトのボックスはX軸方向に長い → 回転してdir方向に合わせる
  const quaternion = new THREE.Quaternion();
  quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir.clone().normalize());
  mesh.quaternion.copy(quaternion);

  mesh.position.copy(center);
  return mesh;
}

function createDoubleArcPoints(params1, params2) {
  const Bridge = new THREE.Group()
  const Bridge_beam = new THREE.Group()

  const rangeRad1 = (params1.rangeDeg * Math.PI) / 180;
  const segments1 = params1.stepDeg;
  const halfRangeX1 = params1.radius * Math.sin(rangeRad1 / 2);
  const xStart1 = -halfRangeX1;
  const xEnd1 = halfRangeX1;
  const stepX1 = (xEnd1 - xStart1) / segments1;

  const rangeRad2 = (params2.rangeDeg * Math.PI) / 180;
  const segments2 = params2.stepDeg;
  const halfRangeX2 = params2.radius * Math.sin(rangeRad2 / 2);
  const xStart2 = -halfRangeX2;
  const xEnd2 = halfRangeX2;
  const stepX2 = (xEnd2 - xStart2) / segments2;

  const material = new THREE.MeshStandardMaterial({//color: 0x3399cc 
    color: 0xffffff,      // 暗めのグレー（鉄色）
    metalness: 0.8,       // 金属光沢最大
    roughness: 0.5,       // 少しザラザラ（低くするとツルツル）
    envMapIntensity: 1.0,    // 環境マップの反射強度（envMapを使うなら）
    side: THREE.FrontSide,
  });

  const x1 = xStart1 + 1 * stepX1;
  const y1 = Math.sqrt(params1.radius ** 2 - x1 ** 2) + params1.centerOffset.y;
  const x2 = xStart1 + 2 * stepX1;

  const x1_b = xStart2 + 1 * stepX2;
  const y1_b = Math.sqrt(params2.radius ** 2 - x1_b ** 2) + params2.centerOffset.y;

  const x2_b = xStart2 + 2 * stepX2;
  const y2_b = Math.sqrt(params2.radius ** 2 - x2_b ** 2) + params2.centerOffset.y;

  const beam_x = x2;
  const beam_y = y2_b;

  const box = createBoxBetweenPoints3D(
    new THREE.Vector3(x1, y1, 0),
    new THREE.Vector3(x1, y1_b, 0),
    0.3, 0.3, material
  );
  Bridge.add(box);

  const Bridge_depth = 3.5

  for (let i = 1; i < Math.max(segments1, segments2) - 1; i++) {
    let x1 = xStart1 + i * stepX1;
    const y1 = Math.sqrt(params1.radius ** 2 - x1 ** 2) + params1.centerOffset.y;
  
    let x2 = xStart1 + (i + 1) * stepX1;
    const y2 = Math.sqrt(params1.radius ** 2 - x2 ** 2) + params1.centerOffset.y;

    const box = createBoxBetweenPoints3D(
      new THREE.Vector3(x2, y2, 0),
      new THREE.Vector3(x1, y1, 0),
      0.3, 0.3, material
    );
    Bridge.add(box);

    const x1_b = xStart2 + i * stepX2;
    const y1_b = Math.sqrt(params2.radius ** 2 - x1_b ** 2) + params2.centerOffset.y;

    const x2_b = xStart2 + (i + 1) * stepX2;
    const y2_b = Math.sqrt(params2.radius ** 2 - x2_b ** 2) + params2.centerOffset.y;

    const box2 = createBoxBetweenPoints3D(
      new THREE.Vector3(x1, y1_b, 0),
      new THREE.Vector3(x2, y2_b, 0),
      0.3, 0.3, material
    );
    Bridge.add(box2);

    if (i < (Math.max(segments1, segments2) - 1) / 2) {
      const box3 = createBoxBetweenPoints3D(
        new THREE.Vector3(x1, y1, 0),
        new THREE.Vector3(x2, y2_b, 0),
        0.2, 0.2, material
      );
      Bridge.add(box3);
      if (i>2){
        const box3_1 = createBoxBetweenPoints3D(
          new THREE.Vector3(x1, y1, 0),
          new THREE.Vector3(x2, y2, Bridge_depth*0.5),
          0.1, 0.1, material
        );
        const box3_2 = createBoxBetweenPoints3D(
          new THREE.Vector3(x1, y1, Bridge_depth),
          new THREE.Vector3(x2, y2, Bridge_depth*0.5),
          0.1, 0.1, material
        );
        Bridge_beam.add(box3_1)
        Bridge_beam.add(box3_2)
      }
    } else {
      const box3 = createBoxBetweenPoints3D(
        new THREE.Vector3(x2, y2, 0),
        new THREE.Vector3(x1, y1_b, 0),
        0.2, 0.2, material
      );
      Bridge.add(box3);
      if (i<Math.max(segments1, segments2) - 3){
        const box3_1 = createBoxBetweenPoints3D(
          new THREE.Vector3(x1, y1, Bridge_depth*0.5),
          new THREE.Vector3(x2, y2, 0),
          0.1, 0.1, material
        );
        const box3_2 = createBoxBetweenPoints3D(
          new THREE.Vector3(x1, y1, Bridge_depth*0.5),
          new THREE.Vector3(x2, y2, Bridge_depth),
          0.1, 0.1, material
        );
      
        Bridge_beam.add(box3_1)
        Bridge_beam.add(box3_2)
      }
    }

    const box4 = createBoxBetweenPoints3D(
      new THREE.Vector3(x2, y2, 0),
      new THREE.Vector3(x2, y2_b, 0),
      0.2, 0.2, material
    );
    Bridge.add(box4);

    if (i>2&&i<Math.max(segments1, segments2) - 3){
      const box4_1 = createBoxBetweenPoints3D(
        new THREE.Vector3(x1, y1, Bridge_depth),
        new THREE.Vector3(x1, y1, 0),
        0.1, 0.1, material
      );
      Bridge_beam.add(box4_1)
    }

    const box5 = createBoxBetweenPoints3D(
      new THREE.Vector3(x2, y2, 0),
      new THREE.Vector3(x2, beam_y, 0),
      0.2, 0.2, material
    );
    Bridge.add(box5);

    if (i === (Math.max(segments1, segments2) - 4)){
      const box6 = createBoxBetweenPoints3D(
        new THREE.Vector3(x2, y2, Bridge_depth),
        new THREE.Vector3(x2, y2, 0),
        0.2, 0.2, material
      );
      Bridge_beam.add(box6);
  
    }

    if (i === (Math.max(segments1, segments2) - 2)) {
      const box5 = createBoxBetweenPoints3D(
        new THREE.Vector3(beam_x, beam_y, 0),
        new THREE.Vector3(x1, y1_b, 0),
        0.3, 0.3, material
      );
      Bridge.add(box5);
    
    }

  }

  const Bridge2 = Bridge.clone();
  Bridge2.position.z += Bridge_depth
  const ArchBridge = new THREE.Group()
  ArchBridge.add(Bridge)
  ArchBridge.add(Bridge2)
  ArchBridge.add(Bridge_beam)
  return ArchBridge
}
const ArchBridge = createDoubleArcPoints(arcA, arcB)
ArchBridge.position.set(-6.2,-17,-145)
ArchBridge.rotation.y = 107 * Math.PI / 180
scene.add(ArchBridge)

console.log(line_2.points[0])
console.log(line_2.points[1])
