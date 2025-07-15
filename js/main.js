// --- 基本設定 ---
console.log('run')

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

  for (let i = 0; i <= divisions; i++) {
    const t = (interval * i) / length;
    const point = curve.getPointAt(t).clone();
    points.push(point);
  }

  return points;
}


// ホームドア ドアの生成
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

// 線路表示
function createTrack(curve, color = 0x333333) {
  const geom = new THREE.BufferGeometry().setFromPoints(curve.getPoints(100));
  const mat = new THREE.LineBasicMaterial({ color });
  const line = new THREE.Line(geom, mat);
  scene.add(line);
}

// 車両設定（テクスチャ対応版）
// function TrainSettings(length, color, cars, transparency = 1, texturePath = null) {

//   const geo = new THREE.BoxGeometry(1, 1, length);
//   let baseMaterial;

//   // テクスチャ指定がある場合
//   if (texturePath) {
//     const texture = new THREE.TextureLoader().load(texturePath);
//     texture.wrapS = THREE.RepeatWrapping;
//     texture.wrapT = THREE.RepeatWrapping;

//     texture.repeat.set(1, 1); // 必要に応じて調整
//     texture.colorSpace = THREE.SRGBColorSpace;

//     baseMaterial = new THREE.MeshStandardMaterial({
//       map: texture,
//       transparent: true,
//       opacity: transparency
//     });
//   } else {
//     // 通常の単色マテリアル
//     baseMaterial = new THREE.MeshStandardMaterial({
//       color: color,
//       transparent: true,
//       opacity: transparency
//     });
//   }

//   const trainCars = [];

//   for (let i = 0; i < cars; i++) {
//     const car = new THREE.Mesh(geo, baseMaterial.clone());
//     trainCars.push(car);
//     scene.add(car);
//   }

//   return trainCars;
// }

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

  let test = getPointByDistanceRatio(Equal_root, stop_point);
  // Map_pin(test.x,test.z, 15, 0.05)

  const length = root.getLength(root);
  const carSpacing = door_interval / length
  
  const maxOffsetT = carSpacing * (trainCars.length + 1);

  let speed = max_speed
  let stop_point_diff = max_speed%add_speed

  for (let i = 0; i < Math.floor(max_speed / add_speed); i++) {
    stop_point_diff += (i+1)*add_speed};
  const brake_point = stop_point - stop_point_diff
  
  test = getPointByDistanceRatio(Equal_root, brake_point);
 
  t = 0
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
        } else if (speed >= max_speed){
          speed = max_speed
        } else {
          speed += add_speed
        };
        
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
    
      if ((cool_time < 0.8) && door_move_O){
        console.log("< > door_open");
        door_move_O = false
        moveDoorsFromGroup(track_doors,1)
      } else if ((cool_time < 0.2) && door_move_C){
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

Map_pin(8,-50,15,0.5,0xff0000)

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

// ホームドアの設置
const train_width = 6.8
const car_Spacing = 0.15

const door_interval = train_width + car_Spacing
const track1_doors = placePlatformDoors(track1, 0.9, door_interval, 'left');  // 左側に設置
const track2_doors = placePlatformDoors(track2, 0.9, door_interval, 'right');  // 左側に設置

const track3_doors = placePlatformDoors(track3, 0.9, door_interval, 'left');  // 左側に設置
const track4_doors = placePlatformDoors(track4, 0.9, door_interval, 'right');  // 左側に設置

// 電車の運行
const max_speed = 0.001 // 制限速度(最高)
const add_speed = 0.0000015 // 追加速度(加速/減速)

const Train_1 = TrainSettings(
  train_width,
  0x888888,
  10,
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
  10,
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

runTrain(Train_1, line_1, track1_doors, door_interval, max_speed, add_speed, 0.775, 0.098)
runTrain(Train_2, line_2, track2_doors, door_interval, max_speed, add_speed, 0.778, 0.098)
runTrain(Train_3, reversedCurve_3, track3_doors, door_interval, max_speed, add_speed, 0.4987, 0.098)
runTrain(Train_4, reversedCurve_4, track4_doors, door_interval, max_speed, add_speed, 0.563, 0.098)


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
const baseSpeed = 0.1;
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
let moveUp = false;
let moveDown = false;

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
  const speed = data.distance * 0.01;

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
  const speed_x = vecX*0.8 ;   // 距離（スティックの傾き強さ）
  const speed_y = vecY*0.8 ;   // 距離（スティックの傾き強さ）
  
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
  camera.position.x += moveVector.x;
  camera.position.z += moveVector.y;

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
  cameraAngleY += lookVector.x * rotateSpeed;
  cameraAngleX += lookVector.y * rotateSpeed;

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
  const ceilingGeometry = new THREE.BoxGeometry(10, 0.1, 72);
  const ceilingMaterial = new THREE.MeshStandardMaterial({...metalParams});
  const ceilingMesh = new THREE.Mesh(ceilingGeometry, ceilingMaterial);

  let geometry = NaN
  let material = NaN

  // 2. 柱（縦方向ビーム）
  geometry = new THREE.BoxGeometry(0.1, 1, 72);
  material = new THREE.MeshStandardMaterial({...metalParams});
  const beam_pillar = new THREE.InstancedMesh(geometry, material, 8);

  // 3. 柱（横方向ビーム）
  geometry = new THREE.BoxGeometry(0.1, 1, 10);
  material = new THREE.MeshStandardMaterial({...metalParams});
  const count = 54;
  const beam_pillar_2 = new THREE.InstancedMesh(geometry, material, count);

  // 4. 鉄骨梁（縦）
  geometry = new THREE.BoxGeometry(0.2, 0.1, 72);
  material = new THREE.MeshStandardMaterial({...metalParams});
  const beam = new THREE.InstancedMesh(geometry, material, 7);

  // 5. 鉄骨梁（横）
  geometry = new THREE.BoxGeometry(0.2, 0.1, 10);
  material = new THREE.MeshStandardMaterial({...metalParams});
  const beam_2 = new THREE.InstancedMesh(geometry, material, count);

  // 6. 小天井板（パーツ）
  geometry = new THREE.BoxGeometry(1.5, 0.1, 10);
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

  // 6. 小天井板（パーツ）
  geometry = new THREE.BoxGeometry(70, 0.04, 0.3);
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

  let beam_y = 9.5
  let beam_z = 10
  object_update({ins_obj: beam_pillar, ins_idx: 0, pos_x: 5.5,  pos_y: beam_y, pos_z: beam_z, rot_x: NaN, rot_y: NaN, rot_z: NaN,scale: NaN})
  object_update({ins_obj: beam_pillar, ins_idx: 1, pos_x: 3.5,  pos_y: beam_y, pos_z: beam_z, rot_x: NaN, rot_y: NaN, rot_z: NaN,scale: NaN})
  object_update({ins_obj: beam_pillar, ins_idx: 2, pos_x: 1.7,  pos_y: beam_y, pos_z: beam_z, rot_x: NaN, rot_y: NaN, rot_z: NaN,scale: NaN})
  object_update({ins_obj: beam_pillar, ins_idx: 3, pos_x: 0.7,  pos_y: beam_y, pos_z: beam_z, rot_x: NaN, rot_y: NaN, rot_z: NaN,scale: NaN})
  object_update({ins_obj: beam_pillar, ins_idx: 4, pos_x: -1.1, pos_y: beam_y, pos_z: beam_z, rot_x: NaN, rot_y: NaN, rot_z: NaN,scale: NaN})
  object_update({ins_obj: beam_pillar, ins_idx: 5, pos_x: -2.1, pos_y: beam_y, pos_z: beam_z, rot_x: NaN, rot_y: NaN, rot_z: NaN,scale: NaN})
  object_update({ins_obj: beam_pillar, ins_idx: 6, pos_x: -4,   pos_y: beam_y, pos_z: beam_z, rot_x: NaN, rot_y: NaN, rot_z: NaN,scale: NaN})
  object_update({ins_obj: beam_pillar, ins_idx: 7, pos_x: -4.5, pos_y: beam_y+0.5, pos_z: beam_z, rot_x: NaN, rot_y: NaN, rot_z: NaN,scale: NaN})

  beam_y -= 0.5
  object_update({ins_obj: beam, ins_idx: 0, pos_x: 5.5,  pos_y: beam_y, pos_z: beam_z, rot_x: NaN, rot_y: NaN, rot_z: NaN,scale: NaN})
  object_update({ins_obj: beam, ins_idx: 1, pos_x: 3.5,  pos_y: beam_y, pos_z: beam_z, rot_x: NaN, rot_y: NaN, rot_z: NaN,scale: NaN})
  object_update({ins_obj: beam, ins_idx: 2, pos_x: 1.7,  pos_y: beam_y, pos_z: beam_z, rot_x: NaN, rot_y: NaN, rot_z: NaN,scale: NaN})
  object_update({ins_obj: beam, ins_idx: 3, pos_x: 0.7,  pos_y: beam_y, pos_z: beam_z, rot_x: NaN, rot_y: NaN, rot_z: NaN,scale: NaN})
  object_update({ins_obj: beam, ins_idx: 4, pos_x: -1.1, pos_y: beam_y, pos_z: beam_z, rot_x: NaN, rot_y: NaN, rot_z: NaN,scale: NaN})
  object_update({ins_obj: beam, ins_idx: 5, pos_x: -2.1, pos_y: beam_y, pos_z: beam_z, rot_x: NaN, rot_y: NaN, rot_z: NaN,scale: NaN})
  object_update({ins_obj: beam, ins_idx: 6, pos_x: -4,   pos_y: beam_y, pos_z: beam_z, rot_x: NaN, rot_y: NaN, rot_z: NaN,scale: NaN})
  object_update({ins_obj: beam, ins_idx: 7, pos_x: -4.5, pos_y: beam_y+0.5, pos_z: beam_z, rot_x: NaN, rot_y: NaN, rot_z: NaN,scale: NaN})


  beam_y += 0.5
  for (let i = 0; i < 49; i++) {
    object_update({ins_obj: beam_pillar_2, ins_idx: i, pos_x: 0.5, pos_y: beam_y, pos_z: beam_z-36 + i*1.5, rot_x: NaN, rot_y: Math.PI/2, rot_z: NaN,scale: NaN})
    object_update({ins_obj: beam_2, ins_idx: i, pos_x: 0.5, pos_y: beam_y-0.5, pos_z: beam_z-36 + i*1.5, rot_x: NaN, rot_y: Math.PI/2, rot_z: NaN,scale: NaN})
  }

  for (let i = 0; i < 6; i++) {
    object_update({ins_obj: ceiling,  ins_idx: i, pos_x: 0.5, pos_y: beam_y-0.5, pos_z: beam_z-36+1.5/2*3 + i*1.5 * 9, rot_x: NaN, rot_y: Math.PI/2, rot_z: NaN,scale: NaN})
    object_update({ins_obj: cylinder, ins_idx: i*2, pos_x: 2.55, pos_y: beam_y-1.5, pos_z: beam_z-36+1.5/2*3 + i*1.5 * 9, rot_x: NaN, rot_y: Math.PI/2, rot_z: NaN,scale: NaN})
    object_update({ins_obj: cylinder, ins_idx: i*2+1, pos_x: -3, pos_y: beam_y-1.5, pos_z: beam_z-36+1.5/2*3 + i*1.5 * 9, rot_x: NaN, rot_y: Math.PI/2, rot_z: NaN,scale: NaN})
    createPointLight(0xffffff, 2, 10, [2.55, beam_y-1.05, beam_z-37.125 + 6.75 + i*1.5 * 9]);
    createPointLight(0xffffff, 2, 10, [2.55, beam_y-1.05, beam_z-37.125 + 13.5 + i*1.5 * 9]);
    createPointLight(0xffffff, 2, 10, [-3, beam_y-1.05, beam_z-37.125 + 6.75 + i*1.5 * 9]);
    createPointLight(0xffffff, 2, 10, [-3, beam_y-1.05, beam_z-37.125 + 13.5 + i*1.5 * 9]);
  }

  const padding = 1.5
  for (let i = 0; i < 47; i++){
    // 3.5
    object_update({ins_obj: prop, ins_idx: i*8,   pos_x: 3.55, pos_y: beam_y-0.8, pos_z: beam_z-36+1.5/2*3 + i*padding, rot_x: NaN, rot_y: Math.PI/2, rot_z: NaN,scale: NaN})
    object_update({ins_obj: prop, ins_idx: i*8+1, pos_x: 3.45, pos_y: beam_y-0.8, pos_z: beam_z-36+1.5/2*3 + i*padding, rot_x: NaN, rot_y: Math.PI/2, rot_z: NaN,scale: NaN})
    // 1.7
    object_update({ins_obj: prop, ins_idx: i*8+2, pos_x: 1.75, pos_y: beam_y-0.8, pos_z: beam_z-36+1.5/2*3 + i*padding, rot_x: NaN, rot_y: Math.PI/2, rot_z: NaN,scale: NaN})
    object_update({ins_obj: prop, ins_idx: i*8+3, pos_x: 1.65, pos_y: beam_y-0.8, pos_z: beam_z-36+1.5/2*3 + i*padding, rot_x: NaN, rot_y: Math.PI/2, rot_z: NaN,scale: NaN})
    // -2.1
    object_update({ins_obj: prop, ins_idx: i*8+4, pos_x: -2.15, pos_y: beam_y-0.8, pos_z: beam_z-36+1.5/2*3 + i*padding, rot_x: NaN, rot_y: Math.PI/2, rot_z: NaN,scale: NaN})
    object_update({ins_obj: prop, ins_idx: i*8+5, pos_x: -2.05, pos_y: beam_y-0.8, pos_z: beam_z-36+1.5/2*3 + i*padding, rot_x: NaN, rot_y: Math.PI/2, rot_z: NaN,scale: NaN})
    // -4
    object_update({ins_obj: prop, ins_idx: i*8+6, pos_x: -3.95, pos_y: beam_y-0.8, pos_z: beam_z-36+1.5/2*3 + i*padding, rot_x: NaN, rot_y: Math.PI/2, rot_z: NaN,scale: NaN})
    object_update({ins_obj: prop, ins_idx: i*8+7, pos_x: -4.05, pos_y: beam_y-0.8, pos_z: beam_z-36+1.5/2*3 + i*padding, rot_x: NaN, rot_y: Math.PI/2, rot_z: NaN,scale: NaN})
  }

  for (let i = 0; i < 4; i++){
    object_update({ins_obj: board, ins_idx: i*4,   pos_x: 3.5,  pos_y: beam_y-1.05, pos_z: beam_z, rot_x: NaN, rot_y: Math.PI/2, rot_z: NaN,scale: NaN})
    object_update({ins_obj: board, ins_idx: i*4+1, pos_x: 1.7,  pos_y: beam_y-1.05, pos_z: beam_z, rot_x: NaN, rot_y: Math.PI/2, rot_z: NaN,scale: NaN})
    object_update({ins_obj: board, ins_idx: i*4+2, pos_x: -2.1, pos_y: beam_y-1.05, pos_z: beam_z, rot_x: NaN, rot_y: Math.PI/2, rot_z: NaN,scale: NaN})
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