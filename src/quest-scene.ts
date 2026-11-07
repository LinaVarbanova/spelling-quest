import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { palette, tree, portal } from "./playground-scene";
export type QuestSceneOptions = {
  world: number;
  boss: boolean;
  wordCount: number;
  seed: string;
  motion: boolean;
};
export type QuestSceneState = {
  arrived: number;
  gap: number;
  gold: number;
  blue: number;
  walking: boolean;
  phase: "intro" | "ready" | "crossing" | "finished";
};
export type QuestResolution = {
  correct: boolean;
  word: string;
  retrySameGap?: boolean;
};
export type QuestSceneAPI = {
  typed(letters: string): void;
  resolve(result: QuestResolution): Promise<void>;
  finish(): Promise<void>;
  setMotion(on: boolean): void;
  dispose(): void;
};
export const islandPosition = (i: number) =>
  new THREE.Vector3(
    i * 10.5,
    Math.sin(i * 1.3) * 0.9,
    Math.sin(i * 0.75) * 4.2,
  );
export function bridgePoint(gap: number, fraction: number) {
  const a = islandPosition(gap),
    b = islandPosition(gap + 1),
    direction = b.clone().sub(a).setY(0).normalize();
  a.addScaledVector(direction, 2.05).y += 0.25;
  b.addScaledVector(direction, -2.05).y += 0.25;
  return a
    .lerp(b, fraction)
    .add(new THREE.Vector3(0, -Math.sin(Math.PI * fraction) * 0.55, 0));
}
export const typedSlot = (gap: number, index: number) =>
  bridgePoint(gap, (index + 0.6) / 11).add(new THREE.Vector3(0, 0.08, 0));
export const queueSpeed = (pending: number) =>
  4.2 * (1 + Math.max(0, pending - 1) * 0.8);
const directionOf = (i: number) =>
  islandPosition(i + 1)
    .sub(islandPosition(i))
    .setY(0)
    .normalize();
const sideOf = (d: THREE.Vector3) => new THREE.Vector3(d.z, 0, -d.x);
export function createQuestScene(
  container: HTMLElement,
  opts: QuestSceneOptions,
  onState?: (s: QuestSceneState) => void,
): QuestSceneAPI {
  const count = Math.max(1, Math.min(25, Math.floor(opts.wordCount))),
    state: QuestSceneState = {
      arrived: 0,
      gap: 0,
      gold: 0,
      blue: 0,
      walking: false,
      phase: "ready",
    };
  let motion = opts.motion,
    disposed = false,
    visible = true,
    frame = 0,
    last = 0,
    time = 0,
    yaw = 0,
    dragging = false,
    lastX = 0;
  const geometries = new Set<THREE.BufferGeometry>(),
    materials = new Set<THREE.Material>(),
    textures = new Set<THREE.Texture>(),
    shared = new Map<string, THREE.MeshStandardMaterial>();
  const geometry = <T extends THREE.BufferGeometry>(g: T) => {
    geometries.add(g);
    return g;
  };
  const mat = (color: string, glow = false) => {
    const key = color + glow;
    if (!shared.has(key)) {
      const m = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.72,
        metalness: 0.08,
        emissive: glow ? color : "#000000",
        emissiveIntensity: glow ? 0.8 : 0,
      });
      materials.add(m);
      shared.set(key, m);
    }
    return shared.get(key)!;
  };
  const add = (
    g: THREE.Object3D,
    geo: THREE.BufferGeometry,
    m: THREE.Material,
    x = 0,
    y = 0,
    z = 0,
  ) => {
    geometry(geo);
    materials.add(m);
    const item = new THREE.Mesh(geo, m);
    item.position.set(x, y, z);
    g.add(item);
    return item;
  };
  const renderer = new THREE.WebGLRenderer({
    alpha: false,
    antialias: true,
    powerPreference: "low-power",
  });
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 1.75),
  );
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor("#17172e");
  renderer.shadowMap.enabled = false;
  renderer.domElement.setAttribute("aria-hidden", "true");
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#17172e");
  scene.fog = new THREE.FogExp2("#29233f", 0.03);
  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 400),
    hemi = new THREE.HemisphereLight("#e3dcff", "#554367", 2.6),
    sun = new THREE.DirectionalLight("#fff0d8", 4.1);
  sun.position.set(-12, 25, 14);
  scene.add(hemi, sun);
  const notify = () => {
    if (!disposed) {
      container.dataset.sceneTriangles = String(renderer.info.render.triangles);
      onState?.({ ...state });
    }
  };
  // Static props are flattened by shared material into one island group. No shadow maps.
  function mergeIsland(group: THREE.Group) {
    group.updateMatrixWorld(true);
    const buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();
    group.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;
      const original = node.geometry;
      geometry(original);
      const m = node.material as THREE.MeshStandardMaterial;
      materials.add(m);
      let source = original;
      if (original instanceof THREE.SphereGeometry) {
        source = geometry(
          new THREE.SphereGeometry(original.parameters.radius, 8, 6),
        );
      }
      const baked = geometry(
        source.clone().applyMatrix4(node.matrixWorld).toNonIndexed(),
      );
      baked.deleteAttribute("uv");
      const common = mat(
        "#" + m.color.getHexString(),
        m.emissive.getHex() !== 0,
      );
      const list = buckets.get(common) || [];
      list.push(baked);
      buckets.set(common, list);
    });
    group.clear();
    const pieces: THREE.BufferGeometry[] = [],
      used: THREE.Material[] = [];
    for (const [m, parts] of buckets) {
      const merged = mergeGeometries(parts, false);
      if (merged) {
        pieces.push(geometry(merged));
        used.push(m);
      }
    }
    const merged = mergeGeometries(pieces, true);
    if (merged) group.add(new THREE.Mesh(geometry(merged), used));
  }
  const tweens = new Set<{
    start: number;
    duration: number;
    update: (t: number) => void;
    done: () => void;
    ease: (t: number) => number;
  }>();
  const ease = (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const backOut = (t: number) =>
    1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2);
  const animate = (
    duration: number,
    update: (t: number) => void,
    curve = ease,
  ): Promise<void> => {
    if (disposed) return Promise.resolve();
    if (!motion || !visible || document.hidden || duration === 0) {
      update(1);
      requestRender();
      return Promise.resolve();
    }
    return new Promise((done) => {
      tweens.add({ start: time * 1000, duration, update, done, ease: curve });
      requestRender();
    });
  };
  const flush = () => {
    const list = [...tweens];
    tweens.clear();
    for (const tween of list) {
      if (!disposed) tween.update(1);
      tween.done();
    }
  };
  const posts: {
    lamp: THREE.Mesh;
    material: THREE.MeshStandardMaterial;
    light: THREE.PointLight;
  }[] = [];
  const islands: THREE.Group[] = [];
  for (let i = 0; i <= count; i++) {
    const g = new THREE.Group();
    add(g, new THREE.CylinderGeometry(2.3, 2.13, 0.5, 9), mat(palette[0][0]));
    const rock = add(
      g,
      new THREE.ConeGeometry(2.13, 3.4, 9),
      mat(palette[0][1]),
      0,
      -1.95,
    );
    rock.rotation.x = Math.PI;
    if (i < count) {
      const d = directionOf(Math.min(i, count - 1)),
        s = sideOf(d);
      tree(g, s.x * 1.35, s.z * 1.35, 0.75);
    } else portal(g as THREE.Group, "#f2d397");
    mergeIsland(g);
    g.position.copy(islandPosition(i));
    scene.add(g);
    islands.push(g);
    if (i > 0) {
      const post = new THREE.Group(),
        side = sideOf(directionOf(i - 1));
      post.position.copy(islandPosition(i)).addScaledVector(side, 1.15);
      post.position.y += 0.25;
      add(
        post,
        new THREE.CylinderGeometry(0.045, 0.06, 1.5, 6),
        mat("#655576"),
        0,
        0.75,
      );
      const lampMaterial = new THREE.MeshStandardMaterial({
        color: "#756b8b",
        emissive: "#ffd89c",
        emissiveIntensity: 0,
        roughness: 0.65,
      });
      materials.add(lampMaterial);
      const lamp = add(
        post,
        new THREE.OctahedronGeometry(0.2),
        lampMaterial,
        0,
        1.7,
      );
      const light = new THREE.PointLight("#ffd89c", 0, 7, 2);
      light.position.set(0, 1.7, 0);
      light.visible = false;
      post.add(light);
      scene.add(post);
      posts[i] = { lamp, material: lampMaterial, light };
    }
  }
  const hero = new THREE.Group(),
    body = new THREE.Group();
  hero.add(body);
  add(body, new THREE.ConeGeometry(0.36, 0.95, 8), mat("#9d8ad7"), 0, 0.48);
  add(
    body,
    new THREE.ConeGeometry(0.3, 0.7, 8, 1, true, Math.PI * 0.6, Math.PI * 0.8),
    mat("#5b4a91"),
    0,
    0.55,
    -0.04,
  );
  add(body, new THREE.SphereGeometry(0.2, 10, 8), mat("#f0c9a5"), 0, 1.08);
  const hat = add(
    body,
    new THREE.ConeGeometry(0.27, 0.55, 8),
    mat("#635194"),
    0,
    1.42,
  );
  hat.rotation.z = -0.15;
  const brim = add(
    body,
    new THREE.TorusGeometry(0.24, 0.04, 5, 14),
    mat("#f2d397"),
    0,
    1.2,
  );
  brim.rotation.x = Math.PI / 2;
  add(
    body,
    new THREE.CylinderGeometry(0.025, 0.03, 1.35, 5),
    mat("#80687a"),
    0.34,
    0.68,
    0.08,
  );
  add(
    body,
    new THREE.SphereGeometry(0.08, 8, 6),
    mat("#ffe1a0", true),
    0.34,
    1.4,
    0.08,
  );
  const staffLight = new THREE.PointLight("#ffd59a", 1, 5, 2);
  staffLight.position.set(0.34, 1.45, 0.1);
  body.add(staffLight);
  const shadowMaterial = new THREE.MeshBasicMaterial({
    color: "#000000",
    transparent: true,
    opacity: 0.25,
    depthWrite: false,
  });
  materials.add(shadowMaterial);
  const shadow = add(
    hero,
    new THREE.CircleGeometry(0.42, 16),
    shadowMaterial,
    0,
    0.012,
  );
  shadow.rotation.x = -Math.PI / 2;
  const standAt = (i: number) =>
    islandPosition(i)
      .add(new THREE.Vector3(0, 0.25, 0))
      .addScaledVector(
        directionOf(Math.min(i, count - 1)),
        i === 0 ? 0.6 : 0.3,
      );
  hero.position.copy(standAt(0));
  hero.rotation.y = Math.atan2(directionOf(0).x, directionOf(0).z);
  scene.add(hero);
  type Stone = {
    mesh: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
    sprite: THREE.Sprite;
    letter: string;
  };
  const runeGeometry = geometry(new THREE.BoxGeometry(0.42, 0.16, 0.95)),
    letterTextures = new Map<string, THREE.CanvasTexture>();
  const stones = Array.from({ length: count }, () => [] as Stone[]);
  function letterTexture(letter: string, color: string) {
    const key = letter + color;
    if (letterTextures.has(key)) return letterTextures.get(key)!;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 128;
    const context = canvas.getContext("2d");
    if (!context) throw Error("Rune rendering unavailable");
    context.clearRect(0, 0, 128, 128);
    context.font = "bold 96px Georgia, serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = color;
    context.fillText(letter.toUpperCase(), 64, 69);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    letterTextures.set(key, texture);
    textures.add(texture);
    return texture;
  }
  function makeStone(
    gap: number,
    letter: string,
    index: number,
    kind: "typed" | "blue" = "typed",
  ) {
    const m = new THREE.MeshStandardMaterial({
      color: kind === "blue" ? "#bfe3ff" : "#a194d6",
      emissive: kind === "blue" ? "#45769d" : "#46356e",
      emissiveIntensity: 0.55,
      roughness: 0.6,
      transparent: true,
    });
    materials.add(m);
    const tile = new THREE.Mesh(runeGeometry, m);
    const spriteMaterial = new THREE.SpriteMaterial({
      map: letterTexture(letter, kind === "blue" ? "#dff3ff" : "#fff0d2"),
      transparent: true,
      depthWrite: false,
    });
    materials.add(spriteMaterial);
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(0.66, 0.66, 1);
    sprite.position.y = 0.5;
    tile.add(sprite);
    const target = typedSlot(gap, index);
    tile.position.copy(target);
    tile.rotation.y = Math.atan2(directionOf(gap).x, directionOf(gap).z);
    scene.add(tile);
    const stone = { mesh: tile, sprite, letter };
    void animate(
      340,
      (t) => {
        tile.position.y = target.y - 3.2 * (1 - t);
        m.opacity = 0.3 + 0.7 * Math.min(1, t);
      },
      backOut,
    );
    return stone;
  }
  function removeStone(stone: Stone) {
    scene.remove(stone.mesh);
    stone.mesh.material.dispose();
    materials.delete(stone.mesh.material);
    const sm = stone.sprite.material;
    sm.dispose();
    materials.delete(sm);
  }
  function syncTyped(text: string) {
    if (disposed || state.gap >= count) return;
    const letters = text
        .toLowerCase()
        .replace(/[^a-z]/g, "")
        .slice(0, 14),
      list = stones[state.gap];
    while (list.length > letters.length) {
      const stone = list.pop()!,
        y = stone.mesh.position.y;
      void animate(200, (t) => {
        stone.mesh.position.y = y + t * 0.2;
        stone.mesh.material.opacity = 1 - t;
        stone.sprite.material.opacity = 1 - t;
      }).then(() => removeStone(stone));
    }
    list.forEach((stone, i) => {
      if (stone.letter !== letters[i]) {
        stone.letter = letters[i];
        stone.sprite.material.map = letterTexture(letters[i], "#fff0d2");
        stone.sprite.material.needsUpdate = true;
      }
    });
    for (let i = list.length; i < letters.length; i++)
      list.push(makeStone(state.gap, letters[i], i));
    requestRender();
  }
  const stretch = (gap: number, list: Stone[]) =>
    Promise.all(
      list.map((stone, i) => {
        const from = stone.mesh.position.clone(),
          to = bridgePoint(gap, (i + 0.5) / list.length).add(
            new THREE.Vector3(0, 0.08, 0),
          );
        return animate(380, (t) =>
          stone.mesh.position.lerpVectors(from, to, t),
        );
      }),
    );
  const glowCanvas = document.createElement("canvas");
  glowCanvas.width = glowCanvas.height = 64;
  const glowContext = glowCanvas.getContext("2d");
  let glowTexture: THREE.Texture;
  if (glowContext) {
    const gradient = glowContext.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, "rgba(220,244,255,1)");
    gradient.addColorStop(1, "rgba(145,196,255,0)");
    glowContext.fillStyle = gradient;
    glowContext.fillRect(0, 0, 64, 64);
    glowTexture = new THREE.CanvasTexture(glowCanvas);
  } else {
    glowTexture = new THREE.DataTexture(
      new Uint8Array([190, 227, 255, 180]),
      1,
      1,
    );
    glowTexture.needsUpdate = true;
  }
  textures.add(glowTexture);
  const wisp = new THREE.Group();
  add(wisp, new THREE.SphereGeometry(0.1, 8, 6), mat("#dff3ff", true));
  const glowMaterial = new THREE.SpriteMaterial({
    map: glowTexture,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  materials.add(glowMaterial);
  const glow = new THREE.Sprite(glowMaterial);
  glow.scale.set(0.65, 0.65, 1);
  wisp.add(glow);
  const wispLight = new THREE.PointLight("#bfe3ff", 0.6, 4, 2);
  wisp.add(wispLight);
  wisp.position.copy(hero.position).add(new THREE.Vector3(1.15, 2.05, 0));
  scene.add(wisp);
  let wispFree = true;
  const wispTarget = wisp.position.clone();
  const wait = (ms: number) =>
    animate(
      ms,
      () => {},
      (t) => t,
    );
  async function crumble(list: Stone[]) {
    list.forEach((stone) => {
      stone.mesh.material.color.set("#77708f");
      stone.mesh.material.emissive.set("#27243f");
      stone.sprite.material.map = letterTexture(stone.letter, "#b8afcb");
    });
    await wait(250);
    if (disposed) return;
    await Promise.all(
      list.splice(0).map(async (stone, i) => {
        await wait(i * 60);
        if (disposed) return;
        const from = stone.mesh.position.clone(),
          rotation = stone.mesh.rotation.clone();
        await animate(
          900,
          (t) => {
            stone.mesh.position
              .copy(from)
              .add(
                new THREE.Vector3(
                  Math.sin(i + 1) * t * 0.4,
                  -t * t * 5,
                  Math.cos(i + 1) * t * 0.4,
                ),
              );
            stone.mesh.rotation.x = rotation.x + Math.sin(i + 1) * t * 2;
            stone.mesh.rotation.z = rotation.z + Math.cos(i + 1) * t * 2;
            stone.mesh.material.opacity = 1 - t;
            stone.sprite.material.opacity = 1 - t;
          },
          (t) => t,
        );
        if (!disposed) removeStone(stone);
      }),
    );
  }
  async function blueBridge(gap: number, word: string, list: Stone[]) {
    wispFree = false;
    wispTarget.copy(bridgePoint(gap, 0)).add(new THREE.Vector3(0, 1.2, 0));
    if (!motion) wisp.position.copy(wispTarget);
    await wait(500);
    if (disposed) return;
    const letters = word
      .toLowerCase()
      .replace(/[^a-z]/g, "")
      .slice(0, 14);
    for (let i = 0; i < letters.length; i++) {
      if (disposed) return;
      list.push(makeStone(gap, letters[i], i, "blue"));
      wispTarget.copy(typedSlot(gap, i)).add(new THREE.Vector3(0, 1.1, 0));
      await wait(120);
    }
    await stretch(gap, list);
    wispFree = true;
  }
  let chain = Promise.resolve(),
    pending = 0;
  async function crossGap(gap: number) {
    const points = [hero.position.clone(), bridgePoint(gap, 0)];
    for (let i = 0; i < 12; i++)
      points.push(
        bridgePoint(gap, (i + 0.5) / 12).add(new THREE.Vector3(0, 0.16, 0)),
      );
    points.push(bridgePoint(gap, 1), standAt(gap + 1));
    const lengths = points.slice(1).map((p, i) => p.distanceTo(points[i])),
      total = lengths.reduce((a, b) => a + b, 0);
    state.walking = true;
    notify();
    await animate(
      (total / queueSpeed(pending)) * 1000,
      (t) => {
        let distance = t * total,
          index = 0;
        while (index < lengths.length - 1 && distance > lengths[index])
          distance -= lengths[index++];
        hero.position.lerpVectors(
          points[index],
          points[index + 1],
          Math.min(1, distance / (lengths[index] || 1)),
        );
        const d = points[index + 1].clone().sub(points[index]);
        hero.rotation.y = Math.atan2(d.x, d.z);
      },
      (t) => t,
    );
    state.walking = false;
    body.position.y = 0;
    body.rotation.z = 0;
  }
  function ignite(index: number, helped = false) {
    const post = posts[index];
    if (!post) return;
    post.material.color.set(helped ? "#dff3ff" : "#ffe8b4");
    post.material.emissive.set(helped ? "#bfe3ff" : "#ffd89c");
    post.light.color.set(helped ? "#bfe3ff" : "#ffd89c");
    post.light.visible = true;
    void animate(700, (t) => {
      post.material.emissiveIntensity = t * 1.4;
      post.light.intensity = t * 1.6;
    });
    for (let i = 1; i < posts.length; i++)
      if (posts[i]) posts[i].light.visible = Math.abs(i - index) < 2;
    if (helped) return;
    const from = hemi.intensity,
      fog = scene.fog as THREE.FogExp2,
      startFog = fog.density;
    void animate(1200, (t) => {
      hemi.intensity = THREE.MathUtils.lerp(from, 2.6 + state.gold * 0.11, t);
      fog.density = THREE.MathUtils.lerp(
        startFog,
        0.03 - Math.min(1, state.gold / count) * 0.012,
        t,
      );
    });
  }
  function resolve(result: QuestResolution) {
    if (disposed || state.gap >= count) return Promise.resolve();
    const gap = state.gap;
    if (result.correct) syncTyped(result.word);
    const list = stones[gap];
    stones[gap] = [];
    if (result.correct || !result.retrySameGap) state.gap++;
    pending++;
    notify();
    chain = chain.then(async () => {
      if (disposed) return;
      state.phase = "crossing";
      notify();
      try {
        if (!result.correct) {
          await crumble(list);
          if (disposed || result.retrySameGap) return;
          await blueBridge(gap, result.word, list);
          if (disposed) return;
          await crossGap(gap);
          if (disposed) return;
          state.arrived = gap + 1;
          state.blue++;
          ignite(gap + 1, true);
          return;
        }
        list.forEach((stone) => {
          stone.mesh.material.color.set("#f0cf88");
          stone.mesh.material.emissive.set("#996b29");
          stone.sprite.material.map = letterTexture(stone.letter, "#fff2cf");
        });
        await stretch(gap, list);
        if (disposed) return;
        await crossGap(gap);
        if (disposed) return;
        state.arrived = gap + 1;
        state.gold++;
        ignite(gap + 1);
      } finally {
        pending--;
        if (!disposed) {
          state.phase = "ready";
          notify();
          requestRender();
        }
      }
    });
    return chain;
  }
  let narrow = false;
  function updateCamera(dt: number) {
    const gap = Math.min(state.arrived, count - 1),
      direction = directionOf(gap),
      target = state.walking
        ? hero.position
            .clone()
            .addScaledVector(direction, 3)
            .add(new THREE.Vector3(0, 0.8, 0))
        : bridgePoint(gap, 0.36).add(new THREE.Vector3(0, 0.5, 0));
    const side = sideOf(direction).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      yaw,
    );
    const wanted = state.walking
      ? hero.position
          .clone()
          .addScaledVector(direction, -6.8)
          .add(new THREE.Vector3(0, 3.9, 0))
          .addScaledVector(side, -1.6)
      : target
          .clone()
          .addScaledVector(side, narrow ? -12.5 : -10)
          .add(new THREE.Vector3(0, 3.4, 0))
          .addScaledVector(direction, -2.2);
    camera.position.lerp(wanted, motion ? 1 - Math.exp(-7 * dt) : 1);
    camera.lookAt(target);
    if (!dragging) yaw *= motion ? Math.exp(-3 * dt) : 0;
  }
  const resize = () => {
    if (disposed) return;
    const width = container.clientWidth || 800,
      height = container.clientHeight || 420;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    narrow = camera.aspect < 1.2;
    camera.fov = narrow ? 60 : 48;
    camera.updateProjectionMatrix();
    updateCamera(1);
    requestRender();
  };
  function render(now: number) {
    if (disposed || !visible || document.hidden) return;
    if (motion && last && now - last < 32) {
      frame = requestAnimationFrame(render);
      return;
    }
    const dt = Math.min(0.1, (now - last || 33) / 1000);
    last = now;
    time += dt;
    for (const tween of [...tweens]) {
      const t = Math.min(1, (time * 1000 - tween.start) / tween.duration);
      tween.update(tween.ease(t));
      if (t >= 1) {
        tweens.delete(tween);
        tween.done();
      }
    }
    if (motion) {
      body.position.y = state.walking
        ? Math.abs(Math.sin(time * 9)) * 0.09
        : Math.sin(time * 2) * 0.02;
      body.rotation.z = state.walking ? Math.sin(time * 9) * 0.06 : 0;
    }
    const wispWant = wispFree
      ? hero.position
          .clone()
          .add(
            new THREE.Vector3(
              motion ? Math.cos(time * 1.1) * 1.15 : 1.15,
              2.05 + (motion ? Math.sin(time * 2.1) * 0.15 : 0),
              motion ? Math.sin(time * 1.1) * 1.15 : 0,
            ),
          )
      : wispTarget;
    wisp.position.lerp(wispWant, motion ? 1 - Math.exp(-6 * dt) : 1);
    updateCamera(dt);
    renderer.render(scene, camera);
    notify();
    frame = motion ? requestAnimationFrame(render) : 0;
  }
  function requestRender() {
    if (disposed || !visible || document.hidden) return;
    if (!frame)
      frame = requestAnimationFrame((now) => {
        frame = 0;
        render(now);
      });
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  const intersection = new IntersectionObserver(
    (entries) => {
      visible = entries[0].isIntersecting;
      if (!visible) {
        cancelAnimationFrame(frame);
        frame = 0;
        flush();
      } else {
        last = 0;
        requestRender();
      }
    },
    { threshold: 0.01 },
  );
  intersection.observe(container);
  const visibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
      flush();
    } else {
      last = 0;
      requestRender();
    }
  };
  document.addEventListener("visibilitychange", visibility);
  const down = (e: PointerEvent) => {
    dragging = true;
    lastX = e.clientX;
    renderer.domElement.setPointerCapture(e.pointerId);
  };
  const move = (e: PointerEvent) => {
    if (!dragging) return;
    yaw = THREE.MathUtils.clamp(yaw + (e.clientX - lastX) * 0.006, -1.1, 1.1);
    lastX = e.clientX;
    updateCamera(1);
    requestRender();
  };
  const up = () => {
    dragging = false;
    if (!motion) {
      yaw = 0;
      updateCamera(1);
      requestRender();
    }
  };
  const lost = (e: Event) => {
    e.preventDefault();
    container.dispatchEvent(new Event("quest-scene-unavailable"));
  };
  renderer.domElement.addEventListener("pointerdown", down);
  renderer.domElement.addEventListener("pointermove", move);
  renderer.domElement.addEventListener("pointerup", up);
  renderer.domElement.addEventListener("pointercancel", up);
  renderer.domElement.addEventListener("webglcontextlost", lost);
  resize();
  notify();
  return {
    typed: syncTyped,
    resolve,
    finish: () => {
      chain = chain.then(() => {
        if (disposed) return;
        state.phase = "finished";
        notify();
        updateCamera(1);
        requestRender();
      });
      return chain;
    },
    setMotion: (on) => {
      motion = on;
      if (!on) flush();
      cancelAnimationFrame(frame);
      frame = 0;
      body.position.y = 0;
      updateCamera(1);
      requestRender();
    },
    dispose: () => {
      if (disposed) return;
      disposed = true;
      flush();
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      renderer.domElement.removeEventListener("pointerdown", down);
      renderer.domElement.removeEventListener("pointermove", move);
      renderer.domElement.removeEventListener("pointerup", up);
      renderer.domElement.removeEventListener("pointercancel", up);
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      scene.clear();
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
