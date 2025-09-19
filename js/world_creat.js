import * as THREE from 'three';

import { TrainSystem } from './functions.js';

export function WorldCreat(scene,train_width,car_Spacing){

// --- 駅舎作成 ---

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

// --- 橋の作成 ---

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

}