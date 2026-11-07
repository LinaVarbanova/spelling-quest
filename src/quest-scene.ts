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
  let narrow = false;
  function updateCamera(dt: number) {
    const gap = Math.min(state.arrived, count - 1),
      direction = directionOf(gap),
      target = bridgePoint(gap, 0.36).add(new THREE.Vector3(0, 0.5, 0));
    const side = sideOf(direction).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      yaw,
    );
    const wanted = target
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
    if (motion) {
      body.position.y = Math.sin(time * 2) * 0.02;
      updateCamera(dt);
    }
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
    typed: () => {},
    resolve: async () => {},
    finish: async () => {
      state.phase = "finished";
      notify();
      requestRender();
    },
    setMotion: (on) => {
      motion = on;
      cancelAnimationFrame(frame);
      frame = 0;
      body.position.y = 0;
      updateCamera(1);
      requestRender();
    },
    dispose: () => {
      if (disposed) return;
      disposed = true;
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
