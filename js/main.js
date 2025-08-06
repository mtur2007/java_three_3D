// --- 基本設定 ---
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


// if (true){
//   const loader = new THREE.TextureLoader();

//   loader.load('textures/shanghai_bund_4k.jpg', (texture) => {
//     texture.mapping = THREE.EquirectangularReflectionMapping;
//     texture.colorSpace = THREE.SRGBColorSpace; // ←ここを修正
//     scene.background = texture;     // 背景用（オプション）
//     scene.environment = texture;    // マテリアルの環境反射に使用
//   });
// } else {
//   const envMap = new THREE.CubeTextureLoader()
//     .setPath('https://threejs.org/examples/textures/cube/Bridge2/')
//     .load([
//       'posx.jpg','negx.jpg',
//       'posy.jpg','negy.jpg',
//       'posz.jpg','negz.jpg'
//     ]);
//   scene.environment = envMap;
//   scene.background = envMap;

//   scene.add(new THREE.GridHelper(200, 80));
//   scene.add(new THREE.AmbientLight(0xffffff, 0.6));

//   const light = new THREE.DirectionalLight(0xffffff, 1);
//   light.position.set(0, 20, 0);
//   scene.add(light);

// };


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

// --- デバッグ用 ---

// ピン(マーキング)
function Map_pin(x, z, height = 5, Thickness=0.5, color=0xff0000) {
  const geometry = new THREE.BoxGeometry(Thickness, height-2, Thickness);
  const material = new THREE.MeshStandardMaterial({ color: color });
  const pillar = new THREE.Mesh(geometry, material);
  pillar.position.set(x, height / 2, z);
  scene.add(pillar);
}

// 三角関数(ラジアンの方向可視化)
function getArrowSymbolFromAngle(deg,red) {
  if (red){
    const angle = (radian + 2 * Math.PI) % (2 * Math.PI); // 0〜2π に正規化
    deg = angle * (180 / Math.PI); // 度数に変換
  };

  if (deg >= 337.5 || deg < 22.5) return '↑'+deg;
  if (deg >= 22.5 && deg < 67.5) return '↗'+deg;
  if (deg >= 67.5 && deg < 112.5) return '→'+deg;
  if (deg >= 112.5 && deg < 157.5) return '↘'+deg;
  if (deg >= 157.5 && deg < 202.5) return '↓'+deg;
  if (deg >= 202.5 && deg < 247.5) return '↙'+deg;
  if (deg >= 247.5 && deg < 292.5) return '←'+deg;
  if (deg >= 292.5 && deg < 337.5) return '↖'+deg;
}

function degToRad(deg) {
  return deg * (Math.PI / 180);
}

function radToDeg(rad) {
  return rad * (180 / Math.PI);
}

function vectorToDegreesXZ(vector) {
  let angleRad = Math.atan2(vector.x, vector.z); // Z前方基準
  let angleDeg = angleRad * (180 / Math.PI);
  return (angleDeg + 360) % 360; // 0〜360度に正規化
}

function normalizeRad(rad) {
  return (rad % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
}

function getRandomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

function getPointByDistanceRatio(curvePoints, ratio) {
  const totalLength = curvePoints.length;
  const index = Math.floor(ratio * totalLength);
  return curvePoints[Math.min(index, totalLength - 1)];
}

function createDebugSphere(scene, position, radius = 0.1, color = 0xff0000) {
  const geometry = new THREE.SphereGeometry(radius, 16, 16);
  const material = new THREE.MeshBasicMaterial({ color: color });
  const sphere = new THREE.Mesh(geometry, material);
  sphere.position.set(position.x, position.y, position.z);
  scene.add(sphere);
  return sphere;  // 必要なら戻り値でMeshを返す
}

// 線路表示
function createTrack(curve, color = 0x333333) {
  const points = curve.getPoints(100);
  // すべての点にY座標を追加 or 修正（例：Y=1.5）
  for (let i = 0; i < points.length; i++) {
    points[i].y += 0.865;
  }
  const geom = new THREE.BufferGeometry().setFromPoints(points);
  const mat = new THREE.LineBasicMaterial({ color: 0x000000 });
  const line = new THREE.Line(geom, mat);
  scene.add(line);
}

// --- エスカレーター ---

// エスカレーター軌道表示
function createPathMesh(path, segments = 100, radius = 0.02, radialSegments = 8, closed = false, color = 0x00ff00) {
  const geometry = new THREE.TubeGeometry(path, segments, radius, radialSegments, closed);
  const material = new THREE.MeshBasicMaterial({ color: color });
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}

function updateObjectOnPath(path, time=0, speed=0.0005) {
  const Equal_path = getPointsEveryM(path, 0.005); // spacing=0.1mごと（細かすぎたら25に）
  const length = path.getLength(path);
  const step_depth = 0.3
  const depth_idx = step_depth/length
  const steps_num = Math.floor(length/step_depth)
  const step_diff = depth_idx * steps_num
  const steps = createSteps(steps_num);
  const leng = Equal_path.length-1

  // 1. 長方形の幅と高さを指定（例：幅3、高さ1.5）
  const width = 0.6;
  const height = 1;

  // 2. 形状を作成（PlaneGeometry はXZ平面ではなくXY平面）
  const geometry = new THREE.PlaneGeometry(height, width);

  const textureLoader = new THREE.TextureLoader();
  const texture = textureLoader.load('textures/roof.png'); // ← パスを適宜変更
  texture.colorSpace = THREE.SRGBColorSpace;

  // 3. マテリアル（色やテクスチャ）を設定
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    // color: 0x00ff00,
    side: THREE.DoubleSide // 裏からも見えるようにする
  });

  // 4. メッシュを作成してシーンに追加
  const rectangle = new THREE.Mesh(geometry, material);

  rectangle.rotation.x = -Math.PI/2;
  // rectangle.rotation.z = -Math.PI/2;
  const point = 0
  rectangle.position.set(Equal_path[point].x,Equal_path[point].y+0.085,Equal_path[point].z); 
  scene.add(rectangle);

  const rectangle2 = new THREE.Mesh(geometry, material);
  rectangle2.rotation.x = -Math.PI/2;
  const point2 = Math.floor(leng * step_diff)
  rectangle2.position.set(Equal_path[point2].x,Equal_path[point2].y+0.085,Equal_path[point2].z); 
  scene.add(rectangle2);

  function moveObject(){
    for (let i =0; i < steps_num; i++){
      steps[i].position.copy(Equal_path[Math.floor(leng*((time+i*depth_idx)%step_diff))]);
    }
    if (time >= step_diff){time = 0}else{time+=speed};
    requestAnimationFrame(moveObject);
  };
  moveObject();
}  

// 斜め前カットのステップ形状を返す関数
function createEscalatorStepMesh() {
  const shape = new THREE.Shape();
  shape.moveTo(0.3, 0.15);    // 1. 上奥  
  shape.lineTo(0, 0.15);      // 2. 上手前 2 . - . 1
  shape.lineTo(0.015, 0.075); // 3. 中手前  3 .  |
  shape.lineTo(0.06, -0.015); // 4. 下       4  .
  // shape.lineTo(0.015, 0.075); // 3. 上手前
  // shape.lineTo(0, 0.15);      // 2. 中手前

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.8,               // ステップの奥行き
    bevelEnabled: false,
  });

  const textureLoader = new THREE.TextureLoader();
  const texture = textureLoader.load('textures/step.png'); // ← パスを適宜変更
  texture.colorSpace = THREE.SRGBColorSpace;

  const material = new THREE.MeshStandardMaterial({
    map: texture,           // ← テクスチャ画像を適用
    color: 0xffffff,        // ← 色も併用可能（色 × テクスチャ）
  });

  geometry.center(); // ← これを追加すると原点中心になります

  const mesh = new THREE.Mesh(geometry, material);
  // 形状が縦に立っているので寝かせる
  mesh.rotation.y = -Math.PI / 2;
  return mesh;
}


function createSteps(numSteps = 5) {
  const group = [];

  for (let i = 0; i < numSteps; i++) {
    const step = createEscalatorStepMesh();

    // ステップを少しずつ後ろに配置（例：0.3m間隔）
    step.position.y = 0; // 高さは固定
    step.position.z = i * -0.35; // 奥に並べる

    scene.add(step);
    group.push(step);
  }

  return group;
}

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
updateObjectOnPath(path_1);
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
updateObjectOnPath(path_2);

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
updateObjectOnPath(test);

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


// --- 鉄橋用ユーティリティ ---

// 線路の座標を指定されたmで均等に分ける為の関数
function getPointsEveryM(curve, interval = 25) {
  const length = curve.getLength();
  const divisions = Math.floor(length / interval);
  const points = [];

  let num = divisions
  for (let i = 0; i <= divisions; i++) {
    const t = Math.min((interval * i) / length,1);
    const point = curve.getPointAt(t).clone();
    points.push(point);
  }

  return points;
}

// 線路から均等に空ける関数
function RailMargin(points, margin, angle=false){
  const edit_points = structuredClone(points); // 深いコピーを作る（破壊防止）
  const angles_y = []

  for (let i = 0; i < points.length; i++){
    const rear = i > 0 ? points[i - 1] : points[i];
    const now = points[i];
    const next = i < points.length-1 ? points[i + 1] : points[i];

    let rear_atan2 = normalizeRad(Math.atan2(now.x - rear.x, now.z - rear.z));
    let next_atan2 = normalizeRad(Math.atan2(now.x - next.x, now.z - next.z));
    if (i === 0){
      rear_atan2 = next_atan2 + 180 * Math.PI / 180;
    } else if (i === points.length-1){
      next_atan2 = rear_atan2 + 180 * Math.PI / 180;
    }

    let whole = next_atan2 - rear_atan2;
    if (whole < 0) whole += Math.PI * 2;

    const diff = rear_atan2 + whole * 0.5;

    edit_points[i].x = now.x - Math.sin(diff) * margin;
    edit_points[i].z = now.z - Math.cos(diff) * margin;
    
    angles_y.push(diff)
  }
  if (angle){return [edit_points,angles_y]}else{return edit_points}
}

// 柱
function createBridgePillar(x, z, height = 5) {
  const geometry = new THREE.BoxGeometry(0.2, height-2, 0.2);
  const material = new THREE.MeshStandardMaterial({ color: 0x555555 });
  const pillar = new THREE.Mesh(geometry, material);
  pillar.position.set(x, height / 2, z);
  scene.add(pillar);
}

// 橋げた
function createBridgeGirder(start, end) {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const dy = end.y - start.y;

  const length = Math.sqrt(dx * dx + dz * dz);
  const geometry = new THREE.BoxGeometry(length, 0.2 ,1.75);
  const material = new THREE.MeshStandardMaterial({ color: 0x888888 });
  const girder = new THREE.Mesh(geometry, material);
  girder.position.set(
    (start.x + end.x) / 2,
     start.y +dy/2 -1,
    (start.z + end.z) / 2
  );
  girder.rotation.y = Math.atan2(dx,dz)-1.57;
  girder.rotation.z = Math.atan2(dy,length);
  scene.add(girder);
}

// 高架線路生成(線型に沿う)
function generateBridge(curve, pillarInterval = 10, interval = 25) {
  const points = getPointsEveryM(curve, interval);
  for (let i = 0; i < points.length; i += pillarInterval) {
    const p = points[i];
    createBridgePillar(p.x, p.z, p.y);

    if (i + pillarInterval < points.length) {
      const p2 = points[i + pillarInterval];
      createBridgeGirder(p, p2);
    }
  }
} 

// 縦方向の角度を求める関数
function getVerticalAngle(p1, p2) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dz = p2.z - p1.z;

  const horizontalDistance = Math.sqrt(dx * dx + dz * dz);
  const verticalAngle = Math.atan2(dy, horizontalDistance);  // ラジアン

  return verticalAngle;
}

function scaleVectors(vectors, scale = 1.0) {
  return vectors.map(([x, y]) => [x * scale, y * scale]);
}

// 線路 ,I...I,
function rawRail(points_data){
  const points = points_data[0]
  const angles = points_data[1]
  
  //   0123456
  // 7 .#---#.
  // 6 ..\./..
  // 5 ..#.#..
  // 4 ..|.|..
  // 3.5  ◆
  // 3 ..|.|..
  // 2 ..|.|..
  // 1 . #.#..
  // 0 #-----#
  const baseVectors = [
    [  0.07,  0.175 ],
    [ -0.07,  0.175 ],
    [  0.02,  0.075 ],
    [ -0.02,  0.075 ],
    [  0.02, -0.125 ],
    [ -0.02, -0.125 ],
    [  0.14, -0.15 ],
    [ -0.14, -0.15 ]
  ];
  
  // 任意の倍率（例：0.5倍）
  const scaleFactor = 0.25;
  const scaledVectors_plane = scaleVectors(baseVectors, scaleFactor);
  
  const verticesArray = [];
  const vertexArray = [];
  
  let before_pos = points[0]
  for (let i = 0; i<points.length; i++){
    
    const pos = points[i]; //基準座標

    const anglex = getVerticalAngle(before_pos, pos);
    const angle_vertical = Math.cos(anglex)
    const angle_plene = Math.sin(anglex)
    // createDebugSphere(scene, pos, 0.01, 0xff0000);
    // createDebugSphere(scene, {x:0,y:0,z:0}, 0.01, 0xff0000);
    // 新しい座標配列（x, z の2D座標）
    scaledVectors_plane.map((theta, c) => {

      const y_new = pos.y+theta[1] * angle_vertical -0.83;
      let z_new = theta[1] * angle_plene
      let x_new = theta[0]

      // console.log(angles[i])
      const rotation_y = Math.atan2(z_new,x_new)+angles[i]// + i*90 * Math.PI / 180;
      const length = Math.sqrt(x_new**2 + z_new**2)
      x_new = pos.x+Math.sin(rotation_y)*length
      z_new = pos.z+Math.cos(rotation_y)*length

      const debugPos = { x: x_new, y: y_new, z: z_new };
      // createDebugSphere(scene, debugPos, 0.005, 0x00ff00);

      verticesArray.push(x_new, y_new, z_new);
    });
    if (i>1){
      // vertexArray.push((i-1)*8,(i-1)*8+1,i*8)
      // vertexArray.push((i-1)*8+1,i*8+1,i*8)

      // vertexArray.push(i*8+1,(i-1)*8+3,(i-1)*8+1)
      // vertexArray.push(i*8+1,i*8+3,(i-1)*8+3)

      // vertexArray.push(i*8+3,(i-1)*8+5,(i-1)*8+3)
      // vertexArray.push(i*8+3,i*8+5,(i-1)*8+5)

      // vertexArray.push((i-1)*8+5,(i-1)*8+7,i*8+5)
      // vertexArray.push((i-1)*8+7,i*8+7,i*8+5)

      // // -----------------------------------------

      // vertexArray.push((i-1)*8+2,(i-1)*8+4,i*8+2)
      // vertexArray.push((i-1)*8+4,i*8+4,i*8+2)

      // vertexArray.push((i-1)*8+4,(i-1)*8+6,i*8+4)
      // vertexArray.push((i-1)*8+6,i*8+6,i*8+4)

      // vertexArray.push((i-1)*8,(i-1)*8+2,i*8)
      // vertexArray.push((i-1)*8+2,i*8+2,i*8)
      // =========================================
      // vertexArray.push(i*8,(i-1)*8+1,(i-1)*8)
      // vertexArray.push(i*8,i*8+1,(i-1)*8+1)

      // vertexArray.push(i*8+1,(i-1)*8+3,(i-1)*8+1)
      // vertexArray.push(i*8+1,i*8+3,(i-1)*8+3)

      // vertexArray.push(i*8+3,(i-1)*8+5,(i-1)*8+3)
      // vertexArray.push(i*8+3,i*8+5,(i-1)*8+5)

      // vertexArray.push((i-1)*8+5,(i-1)*8+7,i*8+5)
      // vertexArray.push((i-1)*8+7,i*8+7,i*8+5)

      // // -----------------------------------------

      // vertexArray.push((i-1)*8+2,(i-1)*8+4,i*8+2)
      // vertexArray.push((i-1)*8+4,i*8+4,i*8+2)

      // vertexArray.push((i-1)*8+4,(i-1)*8+6,i*8+4)
      // vertexArray.push((i-1)*8+6,i*8+6,i*8+4)

      // vertexArray.push((i-1)*8,(i-1)*8+2,i*8)
      // vertexArray.push((i-1)*8+2,i*8+2,i*8)

      // =========================================

      vertexArray.push((i-1)*8,(i-1)*8+1,i*8)
      vertexArray.push((i-1)*8+1,i*8+1,i*8)

      vertexArray.push((i-1)*8+1,(i-1)*8+3,i*8+1)
      vertexArray.push((i-1)*8+3,i*8+3,i*8+1)

      vertexArray.push((i-1)*8+3,(i-1)*8+5,i*8+3)
      vertexArray.push((i-1)*8+5,i*8+5,i*8+3)

      vertexArray.push((i-1)*8+5,(i-1)*8+7,i*8+5)
      vertexArray.push((i-1)*8+7,i*8+7,i*8+5)

      // -----------------------------------------

      vertexArray.push((i-1)*8+4,(i-1)*8+2,i*8+2)
      vertexArray.push(i*8+2,i*8+4,(i-1)*8+4)

      vertexArray.push(i*8+4,(i-1)*8+6,(i-1)*8+4)
      vertexArray.push(i*8+4,i*8+6,(i-1)*8+6)

      vertexArray.push(i*8,(i-1)*8+2,(i-1)*8)
      vertexArray.push(i*8,i*8+2,(i-1)*8+2)

    }
    // console.log(rotatedPositions);
    before_pos = pos
  }

  // 最後にFloat32Arrayに変換
  const vertices = new Float32Array(verticesArray);
  
  // BufferGeometryにセット
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

  geometry.setIndex(vertexArray); // 2枚の三角形で四角形に
  geometry.computeVertexNormals(); // 光の当たり具合を正しくする
  
  const material = new THREE.MeshStandardMaterial({
    color: 0x603513,
    metalness: 1,   // 金属っぽさ（0〜1）
    roughness: 0.3,   // 表面の粗さ（0：つるつる、1：ザラザラ）
    envMapIntensity: 3,    // 環境マップの反射強度（envMapを使うなら）
    side: THREE.FrontSide
  });
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

}


function createRail(curve, interval){
  const points_right = RailMargin(curve.getPoints(70), 0.24,true);
  const points_lift = RailMargin(curve.getPoints(70), -0.24,true);
  const points_center = RailMargin(getPointsEveryM(curve, 0.3), 0,true);
  const points = points_center[0]
  const angles = points_center[1]

  const geometry = new THREE.BoxGeometry(0.12, 0.05, 0.95);
  const stoneMaterial = new THREE.MeshStandardMaterial({
    color: 0x676767,     // 石っぽいグレー（DimGray）
    roughness: 0.9,      // 表面ザラザラ（石っぽさを出す）
    metalness: 0.0,      // 金属感なし
    side: THREE.FrontSide
  });
  const loc_geometry = new THREE.BoxGeometry(0.05, 0.02, 0.1);
  const loc_material = new THREE.MeshStandardMaterial({
    color: 0x774513,
    metalness: 1,   // 金属っぽさ（0〜1）
    roughness: 0.5,   // 表面の粗さ（0：つるつる、1：ザラザラ）
    side: THREE.FrontSide
  });

  const sleeper = new THREE.InstancedMesh(geometry, stoneMaterial, points.length);
  const loc = new THREE.InstancedMesh(loc_geometry, loc_material, points.length*2);
  for(let i = 0; i<points.length; i++){
    const pos = points[i]
    object_update({ins_obj: sleeper, ins_idx: i, pos_x: pos.x,  pos_y: pos.y-0.9, pos_z: pos.z, rot_x: NaN, rot_y: angles[i], rot_z: NaN,scale: NaN})
    const x_sin = Math.sin(angles[i])
    const z_cos = Math.cos(angles[i])
    object_update({ins_obj: loc, ins_idx: i*2, pos_x: pos.x+x_sin*0.245,  pos_y: pos.y-0.86, pos_z: pos.z+z_cos*0.21, rot_x: NaN, rot_y: angles[i], rot_z: NaN,scale: NaN})
    object_update({ins_obj: loc, ins_idx: i*2+1, pos_x: pos.x+x_sin*-0.245,  pos_y: pos.y-0.86, pos_z: pos.z+z_cos*-0.21, rot_x: NaN, rot_y: angles[i], rot_z: NaN,scale: NaN})

  }
  scene.add(sleeper)
  scene.add(loc)

  rawRail(points_right)
  rawRail(points_lift)
  
}

// 架線柱 トラス型                   ,__________|¯'¯|_______________|¯'¯|__________,
function createCatenaryPole(left_height, right_height, beamLength, beam_height, makes) {
  const pos_x = 0 //　             |_|_/_\_/_\_|_|_/_\_/_\_/_\_/_\_|_|_/_\_/_\_|_|
  const pos_y = 0 //　             |X|/      ___|___             ___|___      \|X|
  const pos_z = 0 //　             |X|        ¯¯¥¯¯               ¯¯¥¯¯        |X|
  const Poles = new THREE.Group(); // 　　　 　　　　                            |X|
  const Side_len = 0.1 //　        |X|                                         |X|
  const board_rotation = 45 * Math.PI / 180; // /_ 45度  　　　                 |X|
  //　                             |X|__,I,,,I,__,I,,,I,_____,I,,,I,__,I,,,I,__|X|
  const rotation_x_len = Math.sin(board_rotation)*Side_len*0.8
  const board_xlen = (Side_len/rotation_x_len)*rotation_x_len+rotation_x_len
  const boardGeometry = new THREE.BoxGeometry(board_xlen, 0.02, 0.01);
  const poleMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xaaaaaa,
    metalness: 1,   // 金属っぽさ（0〜1）
    roughness: 0.6,   // 表面の粗さ（0：つるつる、1：ザラザラ）
    envMapIntensity: 1,    // 環境マップの反射強度（envMapを使うなら）
    side: THREE.FrontSide
   });
  const board = new THREE.InstancedMesh(boardGeometry, poleMaterial, ((right_height/Side_len)*4+(left_height/Side_len)*4+(beamLength/Side_len)*4));

  right_height = right_height-right_height%Side_len
  left_height = left_height-left_height%Side_len
  beam_height = beam_height-beam_height%Side_len
  beamLength = beamLength-beamLength%Side_len

  let plus_index = 0
  const Pole = new THREE.Group();

  if (right_height != 0){
    for (let i =0; i<right_height/Side_len; i++){
      if (i%2===0){
        object_update({ins_obj: board, ins_idx: plus_index+i*4, pos_x: pos_x,  pos_y: pos_y+Side_len*i+Side_len*0.5, pos_z: pos_z+Side_len*0.5, rot_x: NaN, rot_y: 0 * Math.PI / 180, rot_z: board_rotation,scale: NaN})      
        object_update({ins_obj: board, ins_idx: plus_index+i*4+1, pos_x: pos_x+Side_len*0.5,  pos_y: pos_y+Side_len*i+Side_len*0.5, pos_z: pos_z, rot_x: NaN, rot_y: 90 * Math.PI / 180, rot_z: board_rotation,scale: NaN})  
        object_update({ins_obj: board, ins_idx: plus_index+i*4+2, pos_x: pos_x,  pos_y: pos_y+Side_len*i+Side_len*0.5, pos_z: pos_z-Side_len*0.5, rot_x: NaN, rot_y: 180 * Math.PI / 180, rot_z: board_rotation,scale: NaN}) 
        object_update({ins_obj: board, ins_idx: plus_index+i*4+3, pos_x: pos_x-Side_len*0.5,  pos_y: pos_y+Side_len*i+Side_len*0.5, pos_z: pos_z, rot_x: NaN, rot_y: 270 * Math.PI / 180, rot_z: board_rotation,scale: NaN}) 
      } else {
        object_update({ins_obj: board, ins_idx: plus_index+i*4, pos_x: pos_x,  pos_y: pos_y+Side_len*i+Side_len*0.5, pos_z: pos_z+Side_len*0.5, rot_x: NaN, rot_y: 0 * Math.PI / 180, rot_z: -board_rotation,scale: NaN}) 
        object_update({ins_obj: board, ins_idx: plus_index+i*4+1, pos_x: pos_x+Side_len*0.5,  pos_y: pos_y+Side_len*i+Side_len*0.5, pos_z: pos_z, rot_x: NaN, rot_y: 90 * Math.PI / 180, rot_z: -board_rotation,scale: NaN}) 
        object_update({ins_obj: board, ins_idx: plus_index+i*4+2, pos_x: pos_x,  pos_y: pos_y+Side_len*i+Side_len*0.5, pos_z: pos_z-Side_len*0.5, rot_x: NaN, rot_y: 180 * Math.PI / 180, rot_z: -board_rotation,scale: NaN})
        object_update({ins_obj: board, ins_idx: plus_index+i*4+3, pos_x: pos_x-Side_len*0.5,  pos_y: pos_y+Side_len*i+Side_len*0.5, pos_z: pos_z, rot_x: NaN, rot_y: 270 * Math.PI / 180, rot_z: -board_rotation,scale: NaN}) 
      }
      
    }
    const poleGeometry_right = new THREE.BoxGeometry(0.02, right_height, 0.02);
    const pole_right = new THREE.Mesh(poleGeometry_right, poleMaterial);
    pole_right.position.set(pos_x+Side_len*0.5,pos_y+right_height*0.5,pos_z+Side_len*0.5)
    Pole.add(pole_right.clone());
    pole_right.position.set(pos_x+Side_len*0.5,pos_y+right_height*0.5,pos_z-Side_len*0.5)
    Pole.add(pole_right.clone());
    pole_right.position.set(pos_x-Side_len*0.5,pos_y+right_height*0.5,pos_z+Side_len*0.5)
    Pole.add(pole_right.clone());
    pole_right.position.set(pos_x-Side_len*0.5,pos_y+right_height*0.5,pos_z-Side_len*0.5)
    Pole.add(pole_right.clone());
  
    plus_index += (right_height/Side_len)*4
  }

  if (left_height != 0){
    const move_x = beamLength-Side_len
    for (let i =0; i<left_height/Side_len; i++){
      if (i%2===0){
        object_update({ins_obj: board, ins_idx: plus_index+i*4, pos_x: pos_x+move_x,  pos_y: pos_y+Side_len*i+Side_len*0.5, pos_z: pos_z+Side_len*0.5, rot_x: NaN, rot_y: 0 * Math.PI / 180, rot_z: board_rotation,scale: NaN})      
        object_update({ins_obj: board, ins_idx: plus_index+i*4+1, pos_x: pos_x+Side_len*0.5+move_x,  pos_y: pos_y+Side_len*i+Side_len*0.5, pos_z: pos_z, rot_x: NaN, rot_y: 90 * Math.PI / 180, rot_z: board_rotation,scale: NaN})  
        object_update({ins_obj: board, ins_idx: plus_index+i*4+2, pos_x: pos_x+move_x,  pos_y: pos_y+Side_len*i+Side_len*0.5, pos_z: pos_z-Side_len*0.5, rot_x: NaN, rot_y: 180 * Math.PI / 180, rot_z: board_rotation,scale: NaN}) 
        object_update({ins_obj: board, ins_idx: plus_index+i*4+3, pos_x: pos_x-Side_len*0.5+move_x,  pos_y: pos_y+Side_len*i+Side_len*0.5, pos_z: pos_z, rot_x: NaN, rot_y: 270 * Math.PI / 180, rot_z: board_rotation,scale: NaN}) 
      } else {
        object_update({ins_obj: board, ins_idx: plus_index+i*4, pos_x: pos_x+move_x,  pos_y: pos_y+Side_len*i+Side_len*0.5, pos_z: pos_z+Side_len*0.5, rot_x: NaN, rot_y: 0 * Math.PI / 180, rot_z: -board_rotation,scale: NaN}) 
        object_update({ins_obj: board, ins_idx: plus_index+i*4+1, pos_x: pos_x+Side_len*0.5+move_x,  pos_y: pos_y+Side_len*i+Side_len*0.5, pos_z: pos_z, rot_x: NaN, rot_y: 90 * Math.PI / 180, rot_z: -board_rotation,scale: NaN}) 
        object_update({ins_obj: board, ins_idx: plus_index+i*4+2, pos_x: pos_x+move_x,  pos_y: pos_y+Side_len*i+Side_len*0.5, pos_z: pos_z-Side_len*0.5, rot_x: NaN, rot_y: 180 * Math.PI / 180, rot_z: -board_rotation,scale: NaN})
        object_update({ins_obj: board, ins_idx: plus_index+i*4+3, pos_x: pos_x-Side_len*0.5+move_x,  pos_y: pos_y+Side_len*i+Side_len*0.5, pos_z: pos_z, rot_x: NaN, rot_y: 270 * Math.PI / 180, rot_z: -board_rotation,scale: NaN}) 
      }
    }
    const poleGeometry_left = new THREE.BoxGeometry(0.02, left_height, 0.02);
    const pole_left = new THREE.Mesh(poleGeometry_left, poleMaterial);
    pole_left.position.set(pos_x+Side_len*0.5+move_x,pos_y+left_height*0.5,pos_z+Side_len*0.5)
    Pole.add(pole_left.clone());
    pole_left.position.set(pos_x+Side_len*0.5+move_x,pos_y+left_height*0.5,pos_z-Side_len*0.5)
    Pole.add(pole_left.clone());
    pole_left.position.set(pos_x-Side_len*0.5+move_x,pos_y+left_height*0.5,pos_z+Side_len*0.5)
    Pole.add(pole_left.clone());
    pole_left.position.set(pos_x-Side_len*0.5+move_x,pos_y+left_height*0.5,pos_z-Side_len*0.5)
    Pole.add(pole_left.clone());
  
    plus_index += (left_height/Side_len)*4
  }
  
  // scene.add(Pole2)

  for (let i =0; i<beamLength/Side_len; i++){
    if (i%2===0){
      object_update({ins_obj: board, ins_idx: plus_index+i*4, pos_y: beam_height-Side_len*0.5,  pos_x: Side_len*i, pos_z: Side_len*0.5, rot_y: NaN, rot_x: 0 * Math.PI / 180, rot_z: board_rotation,scale: NaN})      
      object_update({ins_obj: board, ins_idx: plus_index+i*4+1, pos_y: beam_height,  pos_x: Side_len*i, pos_z: 0, rot_y: NaN, rot_x: 270 * Math.PI / 180, rot_z: board_rotation,scale: NaN})  
      object_update({ins_obj: board, ins_idx: plus_index+i*4+2, pos_y: beam_height-Side_len*0.5,  pos_x: Side_len*i, pos_z: -Side_len*0.5, rot_y: NaN, rot_x: 180 * Math.PI / 180, rot_z: board_rotation,scale: NaN}) 
      object_update({ins_obj: board, ins_idx: plus_index+i*4+3, pos_y: beam_height-Side_len,  pos_x: Side_len*i, pos_z: 0, rot_y: NaN, rot_x: 90 * Math.PI / 180, rot_z: board_rotation,scale: NaN}) 
    } else {
      object_update({ins_obj: board, ins_idx: plus_index+i*4, pos_y: beam_height-Side_len*0.5,  pos_x: Side_len*i, pos_z: Side_len*0.5, rot_y: NaN, rot_x: 0 * Math.PI / 180, rot_z: -board_rotation,scale: NaN})      
      object_update({ins_obj: board, ins_idx: plus_index+i*4+1, pos_y: beam_height,  pos_x: Side_len*i, pos_z: 0, rot_y: NaN, rot_x: 270 * Math.PI / 180, rot_z: -board_rotation,scale: NaN})  
      object_update({ins_obj: board, ins_idx: plus_index+i*4+2, pos_y: beam_height-Side_len*0.5,  pos_x: Side_len*i, pos_z: -Side_len*0.5, rot_y: NaN, rot_x: 180 * Math.PI / 180, rot_z: -board_rotation,scale: NaN}) 
      object_update({ins_obj: board, ins_idx: plus_index+i*4+3, pos_y: beam_height-Side_len,  pos_x: Side_len*i, pos_z: 0, rot_y: NaN, rot_x: 90 * Math.PI / 180, rot_z: -board_rotation,scale: NaN}) 
    }
  }

  const poleGeometry_beam = new THREE.BoxGeometry(beamLength, 0.02, 0.02);
  const pole_beam = new THREE.Mesh(poleGeometry_beam, poleMaterial);
  pole_beam.position.set(beamLength*0.5-Side_len*0.5,beam_height-Side_len,Side_len*0.5)
  Pole.add(pole_beam.clone());
  pole_beam.position.set(beamLength*0.5-Side_len*0.5,beam_height,-Side_len*0.5)
  Pole.add(pole_beam.clone());
  pole_beam.position.set(beamLength*0.5-Side_len*0.5,beam_height,Side_len*0.5)
  Pole.add(pole_beam.clone());
  pole_beam.position.set(beamLength*0.5-Side_len*0.5,beam_height-Side_len,-Side_len*0.5)
  Pole.add(pole_beam.clone());

  Pole.add(board)

  Pole.rotation.y += -90 * Math.PI / 180
  plus_index += (beamLength/Side_len)*4

  for (let i=0; i<makes; i++){Poles.add(Pole.clone())}
  return Poles
}


// 壁の生成
function createWall(track_1,track_2,quantity,margin_1=0.8,margin_2=-0.8,y_1=0,y_2=0,color=0x666666,material=false){
  const board_length_1 = track_1.getLength(track_1)/quantity;
  const board_length_2 = track_2.getLength(track_2)/quantity;
  const points_1 = RailMargin(getPointsEveryM(track_1, board_length_1), margin_1);
  const points_2 = RailMargin(getPointsEveryM(track_2, board_length_2), margin_2);
  
  const verticesArray = [];
  const vertexArray = [];

  for(let i=0; i < points_1.length; i++){
    const coordinate1 = points_1[i]
    verticesArray.push(coordinate1.x, coordinate1.y+y_1, coordinate1.z)
    const coordinate2 = points_2[i]
    verticesArray.push(coordinate2.x, coordinate2.y+y_2, coordinate2.z)
    if (i < points_1.length-2){
      vertexArray.push(i*2,i*2+1,i*2+2);
      vertexArray.push(i*2+3,i*2+2,i*2+1);
    }
  }

  // 最後にFloat32Arrayに変換
  const vertices = new Float32Array(verticesArray);
  
  // BufferGeometryにセット
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

  geometry.setIndex(vertexArray); // 2枚の三角形で四角形に
  geometry.computeVertexNormals(); // 光の当たり具合を正しくする
  
  if (material === false){material =  new THREE.MeshStandardMaterial({ color: color, side: THREE.DoubleSide })};
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);
  
}

// --- 駅用ユーティリティ ---
// 駅
function createStation(track_1,track_2,delicacy,y,margin,a){

  const points_1 = track_1.getPoints(delicacy);
  const points_2 = track_2.getPoints(delicacy);

  let track_1_s = 0;
  let track_1_after = track_1_s
  let track_1_m = points_1[0];
  let track_1_f = points_1[1];

  let track_2_s = 0;
  let track_2_after = track_2_s
  let track_2_m = points_2[0];
  let track_2_f = points_2[1];

  let track_1_diff = 0
  let track_2_diff = 0

  let track_1a_atan2 = 0
  let track_1b_atan2 = 0

  let track_2a_atan2 = 0
  let track_2b_atan2 = 0

  for (let i = 1; i < delicacy-3; i++) {

    track_1_after = track_1_m.clone();

    track_1_s = points_1[i-1].clone();
    track_1_m = points_1[i].clone();
    track_1_f = points_1[i+1].clone();

    track_1a_atan2 = normalizeRad(Math.atan2(track_1_m.x-track_1_s.x,track_1_m.z-track_1_s.z));
    track_1b_atan2 = normalizeRad(Math.atan2(track_1_m.x-track_1_f.x,track_1_m.z-track_1_f.z));
    track_1b_atan2 -= track_1a_atan2;
    if (track_1b_atan2 < 0) {track_1b_atan2 += 6.283185307179586};
   
    track_1_diff = track_1a_atan2+track_1b_atan2*0.5;
    track_1_m.x -= Math.sin(track_1_diff) *margin; // dx
    track_1_m.z -= Math.cos(track_1_diff) *margin; // dy
   
    track_2_after = track_2_m.clone();

    track_2_s = points_2[i-1].clone();
    track_2_m = points_2[i].clone();
    track_2_f = points_2[i+1].clone();

    track_2a_atan2 = normalizeRad(Math.atan2(track_2_s.x-track_2_m.x,track_2_s.z-track_2_m.z));
    track_2b_atan2 = normalizeRad(Math.atan2(track_2_f.x-track_2_m.x,track_2_f.z-track_2_m.z));

    track_2b_atan2 -= track_2a_atan2;
    if (track_2b_atan2 < 0) {track_2b_atan2 += 6.283185307179586}
  
    track_2_diff = track_2a_atan2-track_2b_atan2*0.5;

    track_2_m.x += Math.sin(track_2_diff) *margin; // dx
    track_2_m.z += Math.cos(track_2_diff) *margin; // dy

    const shape = new THREE.Shape();
    shape.moveTo(track_1_after.x, track_1_after.z);
    shape.lineTo(track_1_m.x, track_1_m.z);
    shape.lineTo(track_2_m.x, track_2_m.z);
    shape.lineTo(track_2_after.x, track_2_after.z);

    const materials = [
      new THREE.MeshStandardMaterial({ color: 0x222222 }), // right
      new THREE.MeshStandardMaterial({ color: 0x444444 }), // left
      new THREE.MeshStandardMaterial({ color: 0x000000 }), // top
      new THREE.MeshStandardMaterial({ color: 0x000000 }), // bottom
      new THREE.MeshStandardMaterial({ color: 0x111111 }), // front
      new THREE.MeshStandardMaterial({ color: 0x000000 })  // back
    ];
    
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.2, bevelEnabled: false });
    const material = new THREE.MeshBasicMaterial({ color: 0x869989, side: THREE.FrontSide });
    const mesh = new THREE.Mesh(geometry, materials);

    mesh.rotation.x = 90 * Math.PI / 180;
    mesh.position.y = y-0.4; // 高さ1.5に移動

    scene.add(mesh);
    
  }
}

// ホーム屋根 の作成
function placePlatformRoof(track_1,track_2,y,quantity) {
  
  const board_length_1 = track_1.getLength(track_1)/quantity;
  const board_length_2 = track_2.getLength(track_2)/quantity;
  const points_1 = RailMargin(getPointsEveryM(track_1, board_length_1), 0.7);
  const points_2 = RailMargin(getPointsEveryM(track_2, board_length_2), -0.7);
  
  if (points_1.length != points_2.length){console.log('Err: 不均一')}


  // 1. テクスチャ読み込み
  const textureLoader = new THREE.TextureLoader();
  const texture = textureLoader.load('textures/roof.png');
  texture.colorSpace = THREE.SRGBColorSpace;

  // 表示位置
  texture.repeat.set(0.2, 0.2);   // サイズを50%
  texture.offset.set(0.25, 0.25); // 真ん中に寄せる
  
  // 2. 繰り返し設定
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;

  // 3. 幾何体サイズ（例：10m × 5m）
  const width = 0.6;
  const height = 0.4;

  // 4. 画像1枚 = 1m四方とみなして、自動で repeat を計算
  texture.repeat.set(width / 1, height / 1);

  // 5. マテリアルに貼る
  const material = new THREE.MeshStandardMaterial({ map: texture });

  const diff_x = points_1[0].x - points_2[0].x
  const diff_z = points_1[0].z - points_2[0].z

  let middle_0 = {}
  let middle_1 = {
    x: points_1[0].x - diff_x / 2,
    z: points_1[0].z - diff_z / 2
  }

  for (let i = 0; i < points_1.length-1; i++){

    // for (let i = 0; i < 1; i++){
    const diff_x = points_1[i+1].x - points_2[i+1].x
    const diff_z = points_1[i+1].z - points_2[i+1].z

    middle_0 = middle_1
    middle_1 = {
      x: points_1[i+1].x - diff_x / 2,
      z: points_1[i+1].z - diff_z / 2
    }

    // １番線
    const corner_1 = {
      x: middle_0.x - middle_1.x, 
      z: middle_0.z - middle_1.z}
    const diff_rotation = 0 - Math.atan2(corner_1.x,corner_1.z)
    const fixes_rotation_1 = Math.atan2(corner_1.x,corner_1.z) + diff_rotation
    const radius_1 = Math.sqrt(corner_1.x**2 + corner_1.z**2)

    const geometry = new THREE.BoxGeometry(0.15, 1.4, 0.15);
    const roofpillar = new THREE.InstancedMesh(geometry, new THREE.MeshStandardMaterial({color: 0xaaaaaa}), 4);
    roofpillar.position.x = middle_0.x-corner_1.x/2
    roofpillar.position.y = y-1.1
    roofpillar.position.z = middle_0.z-corner_1.z/2
    scene.add(roofpillar)

    const corner_2 = {
      x: middle_0.x - points_1[i].x, 
      z: middle_0.z - points_1[i].z}
    const fixes_rotation_2 = Math.atan2(corner_2.x,corner_2.z) + diff_rotation
    const radius_2 = Math.sqrt(corner_2.x**2 + corner_2.z**2)

    const corner_3 = {
      x: middle_0.x - points_1[i+1].x, 
      z: middle_0.z - points_1[i+1].z}
    const fixes_rotation_3 = Math.atan2(corner_3.x,corner_3.z) + diff_rotation
    const radius_3 = Math.sqrt(corner_3.x**2 + corner_3.z**2)

    // Map_pin(middle_0.x,middle_0.z,15,0.05,0x00ff00)
    // Map_pin(points_1[i].x,points_1[i].z,15,0.05,0x0000ff)

    // Map_pin(middle_1.x,middle_1.z,15,0.05,0x00ff00)
    // Map_pin(points_1[i+1].x,points_1[i+1].z,15,0.05,0x0000ff)

    const board_1 = new THREE.Shape();
    board_1.moveTo(0, 0);
    board_1.lineTo(Math.sin(fixes_rotation_1) * radius_1, Math.cos(fixes_rotation_1) * radius_1);
    board_1.lineTo(Math.sin(fixes_rotation_3) * radius_3,Math.cos(fixes_rotation_3) * radius_3);
    board_1.lineTo(Math.sin(fixes_rotation_2) * radius_2, Math.cos(fixes_rotation_2) * radius_2);

    const geometry_1 = new THREE.ExtrudeGeometry(board_1, { depth: 0.1, bevelEnabled: false });
    const mesh_1 = new THREE.Mesh(geometry_1, material);

    mesh_1.rotation.z = Math.atan2(corner_1.x,corner_1.z)
    mesh_1.rotation.x = -90 * Math.PI / 180;
    
    const cornerA = new THREE.Vector3(
      0, 
      0,
      0
    );
    
    const cornerB = new THREE.Vector3(
      Math.sin(fixes_rotation_1) * radius_1,
      Math.cos(fixes_rotation_1) * radius_1,
      0
    );

    // 1. 最新の点Aと点Bを取得（ローカル or ワールド座標で）
    const pointA_world = mesh_1.localToWorld(cornerA.clone());
    const pointB_world = mesh_1.localToWorld(cornerB.clone());

    // 2. 回転軸 = B - A（単位ベクトルに正規化）
    const axis = new THREE.Vector3().subVectors(pointB_world, pointA_world).normalize();

    // 3. クォータニオンで回転
    const angle = -170 * Math.PI / 180; // 例えば毎回2度ずつ回転させたいとき
    const quat = new THREE.Quaternion().setFromAxisAngle(axis, angle);

    // 4. 回転を適用
    mesh_1.applyQuaternion(quat);

    mesh_1.position.x = middle_0.x
    mesh_1.position.z = middle_0.z
    mesh_1.position.y = y-0.4; // 高さ1.5に移動
  
    scene.add(mesh_1);

    // 2番線
    const corner2_1 = {
      x: middle_0.x - middle_1.x, 
      z: middle_0.z - middle_1.z}
    const diff_rotation2 = 0 - Math.atan2(corner2_1.x,corner2_1.z)
    const fixes_rotation2_1 = Math.atan2(corner2_1.x,corner2_1.z) + diff_rotation2
    const radius2_1 = Math.sqrt(corner2_1.x**2 + corner2_1.z**2)

    const corner2_2 = {
      x: middle_0.x - points_2[i].x, 
      z: middle_0.z - points_2[i].z}
    const fixes_rotation2_2 = Math.atan2(corner2_2.x,corner2_2.z) + diff_rotation2
    const radius2_2 = Math.sqrt(corner2_2.x**2 + corner2_2.z**2)

    const corner2_3 = {
      x: middle_0.x - points_2[i+1].x, 
      z: middle_0.z - points_2[i+1].z}
    const fixes_rotation2_3 = Math.atan2(corner2_3.x,corner2_3.z) + diff_rotation2
    const radius2_3 = Math.sqrt(corner2_3.x**2 + corner2_3.z**2)

    // Map_pin(points_2[i].x,points_2[i].z,15,0.05,0xff0000)
    // Map_pin(points_2[i+1].x,points_2[i+1].z,15,0.05,0x000000)

    const board2_1 = new THREE.Shape();
    board2_1.moveTo(0, 0);
    board2_1.lineTo(Math.sin(fixes_rotation2_1) * radius2_1, Math.cos(fixes_rotation2_1) * radius2_1);
    board2_1.lineTo(Math.sin(fixes_rotation2_3) * radius2_3,Math.cos(fixes_rotation2_3) * radius2_3);
    board2_1.lineTo(Math.sin(fixes_rotation2_2) * radius2_2, Math.cos(fixes_rotation2_2) * radius2_2);

    const geometry2_1 = new THREE.ExtrudeGeometry(board2_1, { depth: 0.1, bevelEnabled: false });
    const mesh2_1 = new THREE.Mesh(geometry2_1, material);

    mesh2_1.rotation.z = Math.atan2(corner2_1.x,corner2_1.z)
    mesh2_1.rotation.x = -90 * Math.PI / 180;
    
    const corner2A = new THREE.Vector3(
      0, 
      0,
      0
    );
    
    const corner2B = new THREE.Vector3(
      Math.sin(fixes_rotation2_1) * radius2_1,
      Math.cos(fixes_rotation2_1) * radius2_1,
      0
    );

    // 1. 最新の点Aと点Bを取得（ローカル or ワールド座標で）
    const point2A_world = mesh2_1.localToWorld(corner2A.clone());
    const point2B_world = mesh2_1.localToWorld(corner2B.clone());

    // 2. 回転軸 = B - A（単位ベクトルに正規化）
    const axis2 = new THREE.Vector3().subVectors(point2B_world, point2A_world).normalize();

    // 3. クォータニオンで回転
    const angle2 = 170 * Math.PI / 180; // 例えば毎回2度ずつ回転させたいとき
    const quat2 = new THREE.Quaternion().setFromAxisAngle(axis2, angle2);

    // 4. 回転を適用
    mesh2_1.applyQuaternion(quat2);

    mesh2_1.position.x = middle_0.x
    mesh2_1.position.z = middle_0.z
    mesh2_1.position.y = y-0.4; // 高さ1.5に移動
  
    scene.add(mesh2_1);

  }
}

// ホームドア の生成
function placeTrainDoors(centerX, centerY, centerZ, angle, track_doors, totalLength = 4, doorCount = 4) {
  const spacing = totalLength / doorCount;   // ドア同士の中心間隔（例：1m）
  const doorWidth = 0.65;                    // ドアの横幅
  const half = (doorCount - 1) / 2;          // 例：4枚 → half = 1.5

  const dirX = Math.sin(angle);
  const dirZ = Math.cos(angle);

  const fence_point = spacing/2;
  const fenceLength = spacing - doorWidth;

  const fence_material = new THREE.MeshStandardMaterial({
    color: 0xdddddd,
    metalness: 0.3,
    roughness: 0.15,
    envMapIntensity: 1.0,
    side: THREE.FrontSide
  });

  for (let i = 0; i < doorCount; i++) {
    const offset = (i - half) * spacing;      // -1.5, 1 -0.5, 1 +0.5, 1 +1.5（m）(ドアの横幅4mの場合)
    const x = centerX + dirX * offset;
    const z = centerZ + dirZ * offset;
    const y = centerY;

    // ドア(開閉部分)（横:可変長, 高さ0.37m, 厚さ0.03m）
    const door_0 = new THREE.Group();
    
    let door_center = 0.37/2
    let leng_move_door = 0.05
    
    let door_object = new THREE.Mesh(new THREE.BoxGeometry(0.02, leng_move_door, doorWidth/2), fence_material)
    door_object.position.set(0,door_center-leng_move_door*0.5,0)
    door_0.add(door_object)

    door_object = new THREE.Mesh(new THREE.BoxGeometry(0.02, leng_move_door, doorWidth/2), fence_material)
    door_object.position.set(0,(-door_center)+leng_move_door*0.5,0)
    door_0.add(door_object)
    
    const over_space = 0.045
    const half_fence = (fenceLength/2) + over_space
    const half_fence_diff = half_fence/2 - over_space
    
    const door_1 = door_0.clone(true);
    
    door_center = doorWidth/4
    leng_move_door = 0.015
  
    door_object = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.37, leng_move_door), fence_material)
    door_object.position.set(0,0,(-door_center)+leng_move_door*0.5)
    door_0.add(door_object)

    door_object = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.37, leng_move_door), fence_material)
    door_object.position.set(0,0,door_center-leng_move_door*0.5)
    door_1.add(door_object)


    // ドア:右
    door_0.position.set(x+dirX*doorWidth/4, y+0.005, z+dirZ*doorWidth/4);
    door_0.rotation.y = angle;
  
    // ドア:左
    door_1.position.set(x-dirX*doorWidth/4, y+0.005, z-dirZ*doorWidth/4);
    door_1.rotation.y = angle;
  
    track_doors.add(door_0);
    track_doors.add(door_1);

    // 柵(非開閉部分)（横:可変長, 高さ0.45m, 厚さ0.07m）
    if ( i === 0 ){
      const fence_geometry = new THREE.BoxGeometry(0.07, 0.45, half_fence);
      const fence = new THREE.Mesh(fence_geometry, fence_material);
      
      // 高さ中央をY=ドア中心に（例：y+1）
      fence.position.set(centerX + dirX * (offset-fence_point+half_fence_diff), y, centerZ + dirZ * (offset-fence_point+half_fence_diff));
      fence.rotation.y = angle;
      scene.add(fence);
    }
    
    if (i === 3) {
      const fence_geometry = new THREE.BoxGeometry(0.07, 0.45, half_fence);
      const fence = new THREE.Mesh(fence_geometry, fence_material);

      // 高さ中央をY=ドア中心に（例：y+1）
      fence.position.set(centerX + dirX * (offset+fence_point-half_fence_diff), y, centerZ + dirZ * (offset+fence_point-half_fence_diff));
      fence.rotation.y = angle;
      scene.add(fence);

    } else {
      const fence_geometry = new THREE.BoxGeometry(0.07, 0.45, fenceLength);
      const fence = new THREE.Mesh(fence_geometry, fence_material);

      // 高さ中央をY=ドア中心に（例：y+1）
      fence.position.set(centerX + dirX * (offset+fence_point), y, centerZ + dirZ * (offset+fence_point));
      fence.rotation.y = angle;
      scene.add(fence);
    }
  }
  
  scene.add(track_doors);
  return track_doors;
}

// ホームドア場所の計算
function placePlatformDoors(curve, offset = 1, interval = 25, side = 'left') {
  const points = getPointsEveryM(curve, interval);
  let track_doors = new THREE.Group();

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];

    const angle = Math.atan2(p2.x - p1.x, p2.z - p1.z);
    const dist = p1.distanceTo(p2);

    // 中点をラジアンと長さで計算
    const midX = p1.x + Math.sin(angle) * (dist / 2);
    const midZ = p1.z + Math.cos(angle) * (dist / 2);

    // 左右方向のオフセット
    const direction = (side === 'left') ? 1 : -1;
    const offsetAngle = angle + direction * Math.PI / 2;

    const x = midX - Math.sin(offsetAngle) * offset;
    const z = midZ - Math.cos(offsetAngle) * offset;

    track_doors = placeTrainDoors(x, p1.y-0.2, z, angle, track_doors, interval);  // 中心点と角度を渡すだけ！
  }
  return track_doors
}

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
      const headlight = new THREE.SpotLight(0xffffff, 15);
      headlight.angle = Math.PI / 15;
      headlight.penumbra = 0.2;
      headlight.distance = 10;
      headlight.decay = 1;
      headlight.castShadow = false;

      headlight.position.set(0, -0.3, -1);  // 先頭部に合わせて調整（電車前方向に）
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

  const Equal_root = getPointsEveryM(root, 0.01); // spacing=0.1mごと（細かすぎたら25に）
  const totalPoints = Equal_root.length;

  const length = root.getLength(root);

  let test = getPointByDistanceRatio(Equal_root, stop_point+3.4/length);
 
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
  
  test = getPointByDistanceRatio(Equal_root, brake_point);

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
          if (Pos.z >= -20) {
            front_right.visible = false;
          } else {
            front_right.visible = true;
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
const track2 = sliceCurvePoints(line_2, start, end);

const track3 = sliceCurvePoints(line_3, start, end);
const track4 = sliceCurvePoints(line_4, start, end+0.04);


createTrack(line_1, 0xff0000)
createTrack(line_2, 0x772200)

createTrack(line_3, 0x002277)
createTrack(line_4, 0x0000ff)

// 高架(柱/床版)を生成
const interval = 1
generateBridge(line_1, 10, interval);
generateBridge(line_2, 10, interval);
generateBridge(line_3, 10, interval);
generateBridge(line_4, 10, interval);

// 線路生成
createRail(line_1, 60)
createRail(line_2, 60)
createRail(line_3, 60)
createRail(line_4, 60)

// 駅(プラットホーム)を生成
createStation(track1,track2,200,y,0.7, '|[]|') // 島式 |[]| : 相対式 []||[]
createStation(track3,track4,200,y,0.7, '|[]|') // 島式 |[]| : 相対式 []||[]

// 駅(屋根)を生成
const roof_start = 0.4;
const roof_end = 0.675;
const roof_track1 = sliceCurvePoints(line_1, roof_start, roof_end);
const roof_track2 = sliceCurvePoints(line_2, roof_start, roof_end);
placePlatformRoof(roof_track1,roof_track2,y+1.4,10)

const roof_track3 = sliceCurvePoints(line_3, roof_start, roof_end);
const roof_track4 = sliceCurvePoints(line_4, roof_start, 0.6846);
placePlatformRoof(roof_track3,roof_track4,y+1.4,10)

// 駅(ホームドア)を生成
const train_width = 6.8
const car_Spacing = 0.15

const door_interval = train_width + car_Spacing
const track1_doors = placePlatformDoors(track1, 0.9, door_interval, 'left');  // 左側に設置
const track2_doors = placePlatformDoors(track2, 0.9, door_interval, 'right');  // 左側に設置

const track3_doors = placePlatformDoors(track3, 0.9, door_interval, 'left');  // 左側に設置
const track4_doors = placePlatformDoors(track4, 0.9, door_interval, 'right');  // 左側に設置

// 壁の生成
const wall_start = 0.24;
const wall_end = 0.42;
const wall_track1 = sliceCurvePoints(line_1, wall_start, wall_end);
const wall_track2 = sliceCurvePoints(line_2, wall_start, wall_end);
createWall(wall_track1,wall_track2,40,0.8,-0.8,-0.9,-0.9)
const wall_track3 = sliceCurvePoints(line_3, wall_start, wall_end);
const wall_track4 = sliceCurvePoints(line_4, wall_start, wall_end);
createWall(wall_track3,wall_track4,40,0.8,-0.8,-0.9,-0.9)

const tunnel_start = 0.16;
const tunnel_end = 0.24;
// const tunnel_start = 0.25;
// const tunnel_end = 0.7;
const tunnel_1 = sliceCurvePoints(line_4, tunnel_start, tunnel_end);
// const points_3 = sliceCurvePoints(line_4, tunnel_start, tunnel_end);
const tunnel_2 = sliceCurvePoints(line_4, tunnel_start, tunnel_end);
const quantity = 3

createWall(tunnel_1,tunnel_1,40,-0.9,-0.9,-1,1.5)
createWall(tunnel_1,tunnel_1,40,0.9,0.9,-1,1.5)

createWall(line_4,line_4,40,0.885,2,-0.95,-5)
createWall(line_4,line_4,40,10,10,-5,-2.5)
createWall(line_4,line_4,40,10,30,-2.5,-2.5)

const water_material = new THREE.MeshStandardMaterial({
  color: 0x005555,         // 白ベース
  metalness: 0.3,          // 完全な金属
  roughness: 0,          // 少しザラつき（0.0だと鏡面すぎる）
  envMapIntensity: 1,    // 環境マップの反射強度（あるとリアル）
  side: THREE.DoubleSide   // 両面描画（必要なら）
});
createWall(line_4,line_4,40,2,10,-5,-5,0x003355,water_material)

const board_length_1 = tunnel_1.getLength(line_4)/quantity;
const board_length_2 = tunnel_2.getLength(line_4)/quantity;
const points_1 = RailMargin(getPointsEveryM(tunnel_1, board_length_1), 1);
const points_2 = RailMargin(getPointsEveryM(tunnel_2, board_length_2), -1);

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

  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.4, bevelEnabled: false });
  const material = new THREE.MeshBasicMaterial({ color: 0x333333 });
  const mesh = new THREE.Mesh(geometry, material);

  mesh.rotation.x = 91.5 * Math.PI / 180;
  mesh.position.y = 5.3; // 高さ1.5に移動

  scene.add(mesh);

}

// 架線柱の生成
const point_data = RailMargin(getPointsEveryM(wall_track4, 8), 1, true);
const pole_line = point_data[0]
const pole_angle = point_data[1]

// right_height, left_height, beamLength, beam_height
const Poles = createCatenaryPole(0,3.2,1.4,2.3, 5)
for(let i=0; i<Poles.children.length; i++){
  Poles.children[i].rotation.y += pole_angle[i]
  Poles.children[i].position.set(pole_line[i].x,pole_line[i].y-1,pole_line[i].z)
}
scene.add(Poles)

const poletrak = sliceCurvePoints(line_3, 0, 0.7);
const point_data2 = RailMargin(getPointsEveryM(poletrak, 8), 1, true);
const pole_line2 = point_data2[0]
const pole_angle2 = point_data2[1]

// right_height, left_height, beamLength, beam_height
const Poles2 = createCatenaryPole(2.8,2.8,3.5,2.3, 13)
for(let i=0; i<Poles2.children.length; i++){
  Poles2.children[i].rotation.y += pole_angle2[i]
  Poles2.children[i].position.set(pole_line2[i].x,pole_line2[i].y-1,pole_line2[i].z)
}
scene.add(Poles2)

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
  {
    side_right: 'textures/tyuou_end_rightside.png',
    side_left: 'textures/tyuou_end_leftside.png',
    front:  'textures/tyuou_front.png',
  },
  {
    side: 'textures/tyuou_middle_side.png',
  },
  { 
    side_right: 'textures/tyuou_end_leftside.png',
    side_left: 'textures/tyuou_end_rightside.png',
    back:  'textures/tyuou_front.png',
  }
);

const exhibition_soubu = TrainSettings(
  train_width,
  0xaaaaaa,
  10,
  1,
  {
    side_right: 'textures/soubu_end_rightside.png',
    side_left: 'textures/soubu_end_leftside.png',
    front:  'textures/soubu_front.png',
  },
  {
    side: 'textures/soubu_middle_side.png',
  },
  {
    side_right: 'textures/soubu_end_leftside.png',
    side_left: 'textures/soubu_end_rightside.png',
    back:  'textures/soubu_front.png',
  }
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
  {
    side_right: 'textures/tyuou_end_rightside.png',
    side_left: 'textures/tyuou_end_leftside.png',
    front:  'textures/tyuou_front.png',
  },
  {
    side: 'textures/tyuou_middle_side.png',
  },
  { 
    side_right: 'textures/tyuou_end_leftside.png',
    side_left: 'textures/tyuou_end_rightside.png',
    back:  'textures/tyuou_front.png',
  }
);

const Train_4 = TrainSettings(
  train_width,
  0xaaaaaa,
  12,
  1,
  {
    side_right: 'textures/tyuou_end_rightside.png',
    side_left: 'textures/tyuou_end_leftside.png',
    front:  'textures/tyuou_front.png',
  },
  {
    side: 'textures/tyuou_middle_side.png',
  },
  { 
    side_right: 'textures/tyuou_end_leftside.png',
    side_left: 'textures/tyuou_end_rightside.png',
    back:  'textures/tyuou_front.png',
  }
);

const reversedCurve_4 = new THREE.CatmullRomCurve3(
  line_4.getPoints(100).reverse()
);

const Train_2 = TrainSettings(
  train_width,
  0xaaaaaa,
  10,
  1,
  {
    side_right: 'textures/soubu_end_rightside.png',
    side_left: 'textures/soubu_end_leftside.png',
    front:  'textures/soubu_front.png',
  },
  {
    side: 'textures/soubu_middle_side.png',
  },
  {
    side_right: 'textures/soubu_end_leftside.png',
    side_left: 'textures/soubu_end_rightside.png',
    back:  'textures/soubu_front.png',
  }
);

const Train_3 = TrainSettings(
  train_width,
  0xaaaaaa,
  10,
  1,
  {
    side_right: 'textures/soubu_end_rightside.png',
    side_left: 'textures/soubu_end_leftside.png',
    front:  'textures/soubu_front.png',
  },
  {
    side: 'textures/soubu_middle_side.png',
  },
  {
    side_right: 'textures/soubu_end_leftside.png',
    side_left: 'textures/soubu_end_rightside.png',
    back:  'textures/soubu_front.png',
  }
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
renderer.render(scene, camera);

// キーボード操作（鑑賞用）
// ========== 設定値 ========== //
let baseSpeed = 0.1;
const rotateSpeed = 0.03;
const pitchLimit = Math.PI / 2 - 0.1;

// ========== 入力管理 ========== //
const keys = {};
document.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
document.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

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
  
  document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
  
    // 数字キー押下で倍率設定
    if (key >= '1' && key <= '9') {
      baseSpeed = parseInt(key, 10) * (parseInt(key, 10) *0.005);
    }
    // 0キーで倍率リセット
    else if (key === '0') {
      baseSpeed = moveSpeed;
    }
  
    keys[key] = true;
  });

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