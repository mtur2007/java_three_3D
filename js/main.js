// --- 基本設定 ---

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75, window.innerWidth / window.innerHeight, 0.1, 1000
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);

renderer.outputColorSpace = THREE.SRGBColorSpace;


document.body.appendChild(renderer.domElement);

scene.add(new THREE.GridHelper(200, 80));
scene.add(new THREE.AmbientLight(0xffffff, 0.6));

const light = new THREE.DirectionalLight(0xffffff, 0.8);
light.position.set(20, 30, 10);
scene.add(light);

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

// 線路表示
function createTrack(curve, color = 0x333333) {
  const geom = new THREE.BufferGeometry().setFromPoints(curve.getPoints(100));
  const mat = new THREE.LineBasicMaterial({ color });
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
      const pos = Equal_path[Math.floor(leng*((time+i*depth_idx)%step_diff))]; // 位置だけ取得
      steps[i].position.copy(pos);
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
// const glassMaterial = new THREE.MeshPhysicalMaterial({
//   color: 0xFFFFFF,
//   metalness: 0,
//   roughness: 0,
//   transmission: 1, // 光の透過率 (1で完全に透明)
//   thickness: 0.5,  // ガラスの厚み
//   transparent: true,
//   opacity: 1,
//   side: THREE.DoubleSide, // 両面表示（必要なら）
//   clearcoat: 1.0,
//   clearcoatRoughness: 0.1
// });

// const glassGeometry = new THREE.BoxGeometry(1, 1, 0.1);
// const glassMesh = new THREE.Mesh(glassGeometry, glassMaterial);
// glassMesh.position.set(2,7,0)
// scene.add(glassMesh);

const glass_material = new THREE.MeshStandardMaterial({
  color: 0xccccff,         // 白ベース
  transparent: true,       // 透明を有効に
  opacity: 0.1,            // 透明度（0: 完全透明）
  roughness: 0.05,         // 表面のザラザラ感（低いほどつるつる）
  metalness: 0.5,          // 金属度（高いほど光沢が強く反射）
  envMapIntensity: 1.0,    // 環境マップの反射強度（envMapを使うなら）
  side: THREE.DoubleSide   // 両面描画（必要なら）
});

const elevatorY = 7.1
const elevatorz = 36

let glassGeometry = new THREE.BoxGeometry(1.2, 1, 0.05);
let glassMesh = new THREE.Mesh(glassGeometry, glass_material);
glassMesh.position.set(2.7,elevatorY,elevatorz)
scene.add(glassMesh);

glassGeometry = new THREE.BoxGeometry(1.2, 1, 0.05);
glassMesh = new THREE.Mesh(glassGeometry, glass_material);
glassMesh.position.set(2.7,elevatorY,elevatorz+2)
scene.add(glassMesh);

const glassGeometry3 = new THREE.BoxGeometry(0.05, 1, 2);
const glassMesh3 = new THREE.Mesh(glassGeometry3, glass_material);
glassMesh3.position.set(2.1,elevatorY,elevatorz+1)
scene.add(glassMesh3);

glassGeometry = new THREE.BoxGeometry(0.05, 1, 2);
glassMesh = new THREE.Mesh(glassGeometry, glass_material);
glassMesh.position.set(3.3,elevatorY,elevatorz+1)
scene.add(glassMesh);

const pillar_material = new THREE.MeshStandardMaterial({
  color: 0x666666,         // 濃いグレー（鉄っぽい色）
  metalness: 0.5,          // 完全な金属
  roughness: 0.3,          // 少しザラつき（0.0だと鏡面すぎる）
  envMapIntensity: 0.5,    // 環境マップの反射強度（あるとリアル）
  side: THREE.FrontSide,   // 通常は片面でOK
});

let ceilingGeometry = new THREE.BoxGeometry(0.1, 3, 0.1);
let ceilingMesh = new THREE.Mesh(ceilingGeometry, pillar_material);
ceilingMesh.position.set(3.3,elevatorY,elevatorz+1)
scene.add(ceilingMesh);

const door_material = new THREE.MeshStandardMaterial({
  color: 0x888888,         // 濃いグレー（鉄っぽい色）
  metalness: 0.5,          // 完全な金属
  roughness: 0.3,          // 少しザラつき（0.0だと鏡面すぎる）
  envMapIntensity: 1.0,    // 環境マップの反射強度（あるとリアル）
  side: THREE.FrontSide,   // 通常は片面でOK
});

let doorGeometry = new THREE.BoxGeometry(0.2, 1, 0.01);
let doorMesh = new THREE.Mesh(doorGeometry, door_material);
doorMesh.position.set(3,elevatorY,elevatorz+1)


// グループを作成
const ElevatorDoorGroup_A1 = new THREE.Group();

doorGeometry = new THREE.BoxGeometry(0.1, 0.3, 0.01);
doorMesh = new THREE.Mesh(doorGeometry, door_material);
doorMesh.position.set(3,elevatorY-0.35,elevatorz+1)
ElevatorDoorGroup_A1.add(doorMesh);

doorGeometry = new THREE.BoxGeometry(0.1, 0.2, 0.01);
doorMesh = new THREE.Mesh(doorGeometry, door_material);
doorMesh.position.set(3,elevatorY+0.4,elevatorz+1)
ElevatorDoorGroup_A1.add(doorMesh);

doorGeometry = new THREE.BoxGeometry(0.05, 1, 0.01);
doorMesh = new THREE.Mesh(doorGeometry, door_material);
doorMesh.position.set(3.075,elevatorY,elevatorz+1)
ElevatorDoorGroup_A1.add(doorMesh);

doorGeometry = new THREE.BoxGeometry(0.05, 1, 0.01);
doorMesh = new THREE.Mesh(doorGeometry, door_material);
doorMesh.position.set(2.925,elevatorY,elevatorz+1)
ElevatorDoorGroup_A1.add(doorMesh);

const ElevatorDoorGroup_A2 = ElevatorDoorGroup_A1.clone(true); // true で子も含めてディープコピー
const ElevatorDoorGroup_B1 = ElevatorDoorGroup_A1.clone(true); // true で子も含めてディープコピー
const ElevatorDoorGroup_B2 = ElevatorDoorGroup_A1.clone(true); // true で子も含めてディープコピー
const ElevatorDoorGroup_C1 = ElevatorDoorGroup_A1.clone(true); // true で子も含めてディープコピー
const ElevatorDoorGroup_C2 = ElevatorDoorGroup_A1.clone(true); // true で子も含めてディープコピー

ElevatorDoorGroup_A1.position.set(0, 0, 0);
ElevatorDoorGroup_A2.position.set(-0.2, 0, 0);

ElevatorDoorGroup_B1.position.set(0, 3.5, 0);
ElevatorDoorGroup_B2.position.set(-0.2, 3.5, 0);

ElevatorDoorGroup_C1.position.set(0, 0, -0.05);
ElevatorDoorGroup_C2.position.set(-0.2, 0, -0.05);

// グループをシーンに追加
scene.add(ElevatorDoorGroup_A1);
scene.add(ElevatorDoorGroup_A2);
scene.add(ElevatorDoorGroup_B1);
scene.add(ElevatorDoorGroup_B2);
scene.add(ElevatorDoorGroup_C1);
scene.add(ElevatorDoorGroup_C2);

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
  const xOffset = 0.2 / range_num;

  // ドアを開ける（徐々に）
  for (let i = 0; i <= range_num; i++) {
    ElevatorDoorGroup_1.position.x += xOffset;
    ElevatorDoorGroup_2.position.x += -xOffset;

    // 内側は少し遅れて動き始める
    if (i > range_num * 0.2) {
      ElevatorDoorGroup_3.position.x += xOffset;
      ElevatorDoorGroup_4.position.x += -xOffset;
    }

    await sleep(25);
  }

  // 🔁 内側ドアの残り 0.2 分を追加で動かす
  const delayedSteps = Math.floor(range_num * 0.2);
  for (let i = 0; i < delayedSteps; i++) {
    ElevatorDoorGroup_3.position.x += xOffset;
    ElevatorDoorGroup_4.position.x += -xOffset;
    await sleep(25);
  }

  await sleep(7000);

  // ドアを閉める（徐々に）
  for (let i = range_num; i >= 0; i--) {
    ElevatorDoorGroup_1.position.x += -xOffset;
    ElevatorDoorGroup_2.position.x += xOffset;

    if (i < range_num * 0.8) {  // 外側が先に閉まり、内側は少し遅れて
      ElevatorDoorGroup_3.position.x += -xOffset;
      ElevatorDoorGroup_4.position.x += xOffset;
    }

    await sleep(25);
  }

  // 🔁 内側ドアの残り 0.2 分を追加で閉じる
  for (let i = 0; i < delayedSteps; i++) {
    ElevatorDoorGroup_3.position.x += -xOffset;
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
    await elevator_door_open(
      ElevatorDoorGroup_A1,
      ElevatorDoorGroup_A2,
      ElevatorDoorGroup_C1,
      ElevatorDoorGroup_C2
    );
    await sleep(3000); // 3秒待ってからまた開ける

    // Cドアを y+方向へスライド（内側ドアを上に移動して2階へ）
    const F2_y = 3.5
    const range_num = 1800
    const yOffset = F2_y/range_num
    const steps = 30
    
    for (let i = 0; i < range_num; i++) {
      ElevatorDoorGroup_C1.position.y += yOffset;
      ElevatorDoorGroup_C2.position.y += yOffset;
    
      const sleepTime = getSleepTime(i, range_num, steps);
      await sleep(sleepTime);
    }

    await sleep(3000); // 3秒待ってからまた開ける

    await elevator_door_open(
      ElevatorDoorGroup_B1,
      ElevatorDoorGroup_B2,
      ElevatorDoorGroup_C1,
      ElevatorDoorGroup_C2
    );
    await sleep(3000); // 3秒待ってからまた開ける


    for (let i = 0; i < range_num; i++) {
      ElevatorDoorGroup_C1.position.y -= yOffset;
      ElevatorDoorGroup_C2.position.y -= yOffset;
    
      const sleepTime = getSleepTime(i, range_num, steps);
      await sleep(sleepTime);
    }

    await sleep(3000); // 3秒待ってからまた開ける
  }
}

startLoop(); // 処理開始


// --- 鉄橋用ユーティリティ ---
// 柱
function createBridgePillar(x, z, height = 5) {
  const geometry = new THREE.BoxGeometry(0.5, height-2, 0.5);
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
  const geometry = new THREE.BoxGeometry(length, 0.2 ,2);
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
    const material = new THREE.MeshBasicMaterial({ color: 0x869989 });
    const mesh = new THREE.Mesh(geometry, materials);

    mesh.rotation.x = 1.57;
    mesh.position.y = y-0.4; // 高さ1.5に移動

    scene.add(mesh);
    
  }
}

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
function RailMargin(points, margin){
  const edit_points = structuredClone(points); // 深いコピーを作る（破壊防止）

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
  }

  return edit_points;
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

  for (let i = 0; i < doorCount; i++) {
    const offset = (i - half) * spacing;      // -1.5, 1 -0.5, 1 +0.5, 1 +1.5（m）(ドアの横幅4mの場合)
    const x = centerX + dirX * offset;
    const z = centerZ + dirZ * offset;
    const y = centerY;

    // ドア(開閉部分)（横:可変長, 高さ0.37m, 厚さ0.03m）
    const door_geometry = new THREE.BoxGeometry(0.03, 0.37, doorWidth/2);
    const door_material = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
    const door_0 = new THREE.Mesh(door_geometry, door_material);
    const door_1 = new THREE.Mesh(door_geometry, door_material);
    const over_space = 0.05
    const half_fence = (fenceLength/2) + over_space
    const half_fence_diff = half_fence/2 - over_space

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
      const fence_material = new THREE.MeshStandardMaterial({ color: 0xffffff });
      const fence = new THREE.Mesh(fence_geometry, fence_material);
      
      // 高さ中央をY=ドア中心に（例：y+1）
      fence.position.set(centerX + dirX * (offset-fence_point+half_fence_diff), y, centerZ + dirZ * (offset-fence_point+half_fence_diff));
      fence.rotation.y = angle;
      scene.add(fence);
    }
    
    if (i === 3) {
      const fence_geometry = new THREE.BoxGeometry(0.07, 0.45, half_fence);
      const fence_material = new THREE.MeshStandardMaterial({ color: 0xffffff });
      const fence = new THREE.Mesh(fence_geometry, fence_material);

      // 高さ中央をY=ドア中心に（例：y+1）
      fence.position.set(centerX + dirX * (offset+fence_point-half_fence_diff), y, centerZ + dirZ * (offset+fence_point-half_fence_diff));
      fence.rotation.y = angle;
      scene.add(fence);

    } else {
      const fence_geometry = new THREE.BoxGeometry(0.07, 0.45, fenceLength);
      const fence_material = new THREE.MeshStandardMaterial({ color: 0xffffff });
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

  // 指定されたテクスチャセットをもとにマテリアル6面分を生成
  function createMaterials(set) {
    const sideRightMat = set.side_right
      ? new THREE.MeshStandardMaterial({ map: loadTexture(set.side_right), transparent: true, opacity: transparency })
      : set.side
        ? new THREE.MeshStandardMaterial({ map: loadTexture(set.side), transparent: true, opacity: transparency })
        : new THREE.MeshStandardMaterial({ color, transparent: true, opacity: transparency });

    const sideLeftMat = set.side_left
      ? new THREE.MeshStandardMaterial({ map: loadTexture(set.side_left), transparent: true, opacity: transparency }) // 反転なし
      : set.side
        ? new THREE.MeshStandardMaterial({ map: loadTexture(set.side), transparent: true, opacity: transparency })
        : sideRightMat.clone();

    const topMat = set.top
      ? new THREE.MeshStandardMaterial({ map: loadTexture(set.top), transparent: true, opacity: transparency })
      : new THREE.MeshStandardMaterial({ color, transparent: true, opacity: transparency });

    const bottomMat = set.bottom
      ? new THREE.MeshStandardMaterial({ map: loadTexture(set.bottom), transparent: true, opacity: transparency })
      : topMat.clone();

    const frontMat = set.front
      ? new THREE.MeshStandardMaterial({ map: loadTexture(set.front), transparent: true, opacity: transparency })
      : new THREE.MeshStandardMaterial({ color, transparent: true, opacity: transparency });

    const backMat = set.back
      ? new THREE.MeshStandardMaterial({ map: loadTexture(set.back), transparent: true, opacity: transparency })
      : new THREE.MeshStandardMaterial({ color, transparent: true, opacity: transparency });

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
    trainCars.push(car);
    scene.add(car);
  }

  return trainCars;
}


// --- アニメーション ---

// 列車の運行
function runTrain(trainCars, root, track_doors, door_interval, max_speed=0.002, add_speed=0.000005, stop_point=0.5, t=0) {

  const Equal_root = getPointsEveryM(root, 0.01); // spacing=0.1mごと（細かすぎたら25に）
  const totalPoints = Equal_root.length;

  const length = root.getLength(root);

  let test = getPointByDistanceRatio(Equal_root, stop_point+3.4/length);
  // Map_pin(test.x,test.z, 15, 0.05)

  const carSpacing = door_interval / length
  
  const maxOffsetT = carSpacing * (trainCars.length + 1);

  let speed = max_speed
  let stop_point_diff = 0

  while (speed >= 0){
    speed -= add_speed
    stop_point_diff += speed};
  
  const brake_point = stop_point - stop_point_diff

  speed = max_speed
  
  test = getPointByDistanceRatio(Equal_root, brake_point);
 
  let door_move_O = false
  let door_move_C = false
  let cool_time = 0.1

  let train_stoped = false
  
  const value = getRandomFloat(0.1, 1); // 1.5以上5.5未満の小数
  cool_time = value

  function runCar() {
    if (t >= 1 + maxOffsetT) {
      t = 0
      const value = getRandomFloat(0.1, 1); // 1.5以上5.5未満の小数
      cool_time = value
      train_stoped = false
      speed = max_speed
      
    }
    
    if (cool_time < 0){
      if (speed >= 0){ 
        for (let i = 0; i < trainCars.length; i++) {
          const offsetT = t - carSpacing * i;
    
          // offsetT が負ならその車両はまだ線路に出ない
          if (offsetT < 0) continue;
    
          const index = Math.floor(offsetT * totalPoints);
          const safeIndex = Math.min(index, totalPoints - 2); // 最後の点を超えないように
    
          const Pos = Equal_root[safeIndex];
          const nextIndex = safeIndex + 1;
          const Tan = Equal_root[nextIndex].clone().sub(Pos).normalize();
    
          trainCars[i].position.copy(Pos);
          trainCars[i].lookAt(Pos.clone().add(Tan));
        }

        if (train_stoped === false && t > brake_point){
          speed -= add_speed;
        } else {
          speed += add_speed
          if (speed >= max_speed){speed = max_speed}
        }
        
        t += speed;

      } else {
        console.log("停車")
        train_stoped = true
        door_move_O = true
        door_move_C = true
        cool_time = 1
        speed = 0
      }

    } else {

      cool_time -= 0.001
    
      if ((cool_time < 0.88) && door_move_O){
        console.log("< > door_open");
        door_move_O = false
        moveDoorsFromGroup(track_doors,1)
      } else if ((cool_time < 0.3) && door_move_C){
        console.log("> < door_close");
        door_move_C = false
        moveDoorsFromGroup(track_doors,0)
      }

      if (cool_time < 0){
        console.log("発車")
      }
    }
    requestAnimationFrame(runCar);
  }
  runCar();

}

// ホームドア開閉
function moveDoorsFromGroup(group, mode, distance = 0.31, duration = 1500) {

  if (mode === 0) {
    mode = -1
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
    
      const sign = index % 2 === 0 ? 1*mode : -1*mode;
      const start = startPositions[index];
      child.position.set(
        start.x + dirX * distance * sign * t,
        start.y,
        start.z + dirZ * distance * sign * t
      );
    });

    if (t < 1) requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
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
// --- JR中央線 track1 ---
Points_0 = [

  new THREE.Vector3(30, y+1, -135),

  new THREE.Vector3(20, y+0.5, -100),

  new THREE.Vector3(6, y, -50),
  new THREE.Vector3(4.8, y, -30),

  // new THREE.Vector3(4.8, y, -20),
  // new THREE.Vector3(4.8, y, 40),

  new THREE.Vector3(4.8, y, 50),     // お茶の水駅上空
  new THREE.Vector3(3,y, 90), // 高架にする（y = 5）
];
// --- JR総武線 track2 ---
Points_1 = [

  new THREE.Vector3(15, y+4, -140),

  new THREE.Vector3(18, y+3, -110),

  new THREE.Vector3(3, y, -50),
  new THREE.Vector3(0.8, y, -30), 

  // new THREE.Vector3(0.8, y, -20),
  // new THREE.Vector3(0.8, y, 40),

  new THREE.Vector3(0.8, y, 50),
  new THREE.Vector3(-2, y, 90),
];

// --- JR総武線 track3 ---
Points_2 = [
  
  new THREE.Vector3(13, y+4, -140),
  new THREE.Vector3(16, y+3, -110),
  new THREE.Vector3(1, y, -50),
  new THREE.Vector3(-0.8, y, -30),

  // new THREE.Vector3(-0.8, y, -20),
  // new THREE.Vector3(-0.8, y, 40),

  new THREE.Vector3(-0.8, y, 50),     // お茶の水駅上空
  new THREE.Vector3(-4,y, 90), // 高架にする（y = 5）
];

// --- JR中央線 track4 ---
Points_3 = [ 

  new THREE.Vector3(28, y+1, -135),
  new THREE.Vector3(14, y-0.5, -105),
  new THREE.Vector3(-2, y, -50),
  new THREE.Vector3(-4.8, y, -30),
  
  // new THREE.Vector3(-4.8, y, -20),
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

// 電車の運行
// const max_speed = 0.001 // 制限速度(最高)
// const add_speed = 0.0000010 // 追加速度(加速/減速)
const max_speed = 0.0005 // 制限速度(最高)
const add_speed = 0.000001 // 追加速度(加速/減速)

const Train_1 = TrainSettings(
  train_width,
  0x888888,
  12,
  1,
  {
    side_right: 'textures/tyuou_1.png',
    side_left: 'textures/tyuou_3.png',
    front:  'textures/tyuou_2.png',
  },
  {
    side: 'textures/tyuou.png',
  },
  { 
    side_right: 'textures/tyuou_3.png',
    side_left: 'textures/tyuou_1.png',
    back:  'textures/tyuou_2.png',
  }
);

const Train_4 = TrainSettings(
  train_width,
  0x888888,
  12,
  1,
  {
    side_right: 'textures/tyuou_1.png',
    side_left: 'textures/tyuou_3.png',
    front:  'textures/tyuou_2.png',
  },
  {
    side: 'textures/tyuou.png',
  },
  { 
    side_right: 'textures/tyuou_3.png',
    side_left: 'textures/tyuou_1.png',
    back:  'textures/tyuou_2.png',
  }
);

const reversedCurve_4 = new THREE.CatmullRomCurve3(
  line_4.getPoints(100).reverse()
);

const Train_2 = TrainSettings(
  train_width,
  0x888888,
  10,
  1,
  {
    side_right: 'textures/soubu_1.png',
    side_left: 'textures/soubu_4.png',
    front:  'textures/soubu_3.png',
  },
  {
    side: 'textures/soubu.png',
  },
  {
    side_right: 'textures/soubu_4.png',
    side_left: 'textures/soubu_1.png',
    back:  'textures/soubu_3.png',
  }
);

const Train_3 = TrainSettings(
  train_width,
  0x888888,
  10,
  1,
  {
    side_right: 'textures/soubu_1.png',
    side_left: 'textures/soubu_4.png',
    front:  'textures/soubu_3.png',
  },
  {
    side: 'textures/soubu.png',
  },
  {
    side_right: 'textures/soubu_4.png',
    side_left: 'textures/soubu_1.png',
    back:  'textures/soubu_3.png',
  }
);

const reversedCurve_3 = new THREE.CatmullRomCurve3(
  line_3.getPoints(100).reverse()
);

runTrain(Train_1, line_1, track1_doors, door_interval, max_speed, add_speed, 0.7745)
runTrain(Train_2, line_2, track2_doors, door_interval, max_speed, add_speed, 0.7775)
runTrain(Train_3, reversedCurve_3, track3_doors, door_interval, max_speed, add_speed, 0.4985)
runTrain(Train_4, reversedCurve_4, track4_doors, door_interval, max_speed, add_speed, 0.5625)

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

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

if (true) {

  // 鉄のような金属マテリアル設定
  const metalParams = {
    color: 0xffffff,      // 明るめのグレー（鉄色）
    metalness: 0.3,       // 金属光沢最大
    roughness: 0.25,      // 少しザラザラ（低くするとツルツル）
    side: THREE.DoubleSide,
  };

  // 鉄のような金属マテリアル設定
  const metalParams_2 = {
    color: 0xffffff,      // 暗めのグレー（鉄色）
    metalness: 0.5,       // 金属光沢最大
    roughness: 0.0,       // 少しザラザラ（低くするとツルツル）
    side: THREE.DoubleSide,
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
    createPointLight(0xffffff, 2, 10, [2.55, beam_y-1.05, beam_z-Podium_deck_start+ beam_Spacing/2*3 - ceiling_Spacing/4 + Light_Spot_margin + i*ceiling_Spacing]);
    createPointLight(0xffffff, 2, 10, [2.55, beam_y-1.05, beam_z-Podium_deck_start+ beam_Spacing/2*3 - ceiling_Spacing/4 + Light_Spot_margin*2 + i*ceiling_Spacing]);
    createPointLight(0xffffff, 2, 10, [-2.9, beam_y-1.05, beam_z-Podium_deck_start+ beam_Spacing/2*3 - ceiling_Spacing/4 + Light_Spot_margin + i*ceiling_Spacing]);
    createPointLight(0xffffff, 2, 10, [-2.9, beam_y-1.05, beam_z-Podium_deck_start+ beam_Spacing/2*3 - ceiling_Spacing/4 + Light_Spot_margin*2 + i*ceiling_Spacing]);
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
