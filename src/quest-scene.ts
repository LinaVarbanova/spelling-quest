import * as THREE from "three";
import { appearance, type Slot } from "./shop";
import { companionModel, companionPosition } from "./companion-scene";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  palette,
  realmColors,
  tree,
  portal,
  cone,
  crystal,
  tower,
  castle,
} from "./playground-scene";
export type QuestSceneOptions = {
  world: number;
  boss: boolean;
  wordCount: number;
  seed: string;
  motion: boolean;
  equipment?: Record<Slot, string>;
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
  hear(on: boolean): void;
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
export function propPositions(seed: string, island: number) {
  let state = 2166136261;
  for (const ch of seed + ":" + island)
    state = Math.imul(state ^ ch.charCodeAt(0), 16777619);
  const random = () =>
    (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296;
  const side = sideOf(directionOf(island)),
    positions: { x: number; z: number }[] = [];
  for (let i = 0; i < 9; i++) {
    const angle = random() * Math.PI * 2,
      radius = 1 + random();
    const x = Math.cos(angle) * radius,
      z = Math.sin(angle) * radius;
    if (x * side.x + z * side.z > 0.8) positions.push({ x, z });
  }
  if (!positions.length) positions.push({ x: side.x * 1.4, z: side.z * 1.4 });
  return positions;
}
export const questLightTypes = [
  "lantern",
  "crystal shard",
  "summit beacon",
  "candle window",
  "ember brazier",
  "crown jewel",
];
export function createQuestScene(
  container: HTMLElement,
  opts: QuestSceneOptions,
  onState?: (s: QuestSceneState) => void,
): QuestSceneAPI {
  const world =
    Number.isInteger(opts.world) && opts.world >= 0 && opts.world < 6
      ? opts.world
      : 0;
  container.dataset.sceneWorld = String(world);
  container.dataset.sceneLight = questLightTypes[world];
  const count = Math.max(1, Math.min(25, Math.floor(opts.wordCount))),
    state: QuestSceneState = {
      arrived: 0,
      gap: 0,
      gold: 0,
      blue: 0,
      walking: false,
      phase: opts.motion ? "intro" : "ready",
    };
  let motion = opts.motion,
    disposed = false,
    visible = true,
    frame = 0,
    last = 0,
    time = 0,
    yaw = 0,
    dragging = false,
    lastX = 0,
    introAge = 0,
    hearing = false;
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
  let detach: (() => void) | undefined;
  try {
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
        container.dataset.sceneTriangles = String(
          renderer.info.render.triangles,
        );
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
        const transformed = source.clone().applyMatrix4(node.matrixWorld);
        const baked = geometry(
          transformed.index ? transformed.toNonIndexed() : transformed,
        );
        if (baked !== transformed) transformed.dispose();
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
      color: string;
    }[] = [];
    const islands: THREE.Group[] = [],
      gate = new THREE.Group();
    for (let i = 0; i <= count; i++) {
      const g = new THREE.Group();
      add(
        g,
        new THREE.CylinderGeometry(2.3, 2.13, 0.5, 9),
        mat(palette[world][0]),
      );
      const rock = add(
        g,
        new THREE.ConeGeometry(2.13, 3.4, 9),
        mat(palette[world][1]),
        0,
        -1.95,
      );
      rock.rotation.x = Math.PI;
      if (i < count) {
        propPositions(opts.seed, i).forEach(({ x, z }, index) => {
          const prop = new THREE.Group();
          prop.position.set(x, 0, z);
          prop.rotation.y = Math.sin(i * 9 + index) * 0.7;
          const small = 0.45 + (index % 3) * 0.1;
          if (world === 0)
            tree(prop, 0, 0, small + 0.15, index % 2 ? "#80c7b4" : "#8cc8c8");
          else if (world === 1)
            crystal(prop, index % 2 ? "#9de7ee" : "#baadf4", 0, 0.8, 0, small);
          else if (world === 2) {
            cone(
              prop,
              "#8cb9d0",
              small,
              small * 2.5,
              0,
              small * 1.25 + 0.25,
              0,
              6,
            );
            cone(
              prop,
              "#ecf5fa",
              small * 0.4,
              small,
              0,
              small * 2.1 + 0.25,
              0,
              6,
            );
          } else if (world === 3) {
            if (index === 0) tower(prop, 0, 0, 1.2, "#a99bc6", "#7d639e");
            else crystal(prop, "#b7a2d7", 0, 0.55, 0, 0.28);
          } else if (world === 4) {
            cone(
              prop,
              "#78556c",
              small,
              small * 1.2,
              0,
              small * 0.6 + 0.25,
              0,
              7,
            );
            crystal(prop, "#efb285", 0, small + 0.3, 0, 0.22);
          } else {
            if (index === 0) tower(prop, 0, 0, 1.3, "#e6e3cb", "#8ac9be");
            else if (index % 2) tree(prop, 0, 0, 0.45, "#dbb6d1");
            else crystal(prop, "#f3d392", 0, 0.65, 0, 0.24);
          }
          g.add(prop);
        });
      }
      mergeIsland(g);
      if (i === count && !opts.boss) {
        portal(gate, "#f2d397");
        mergeIsland(gate);
        g.add(gate);
      }
      g.position.copy(islandPosition(i));
      scene.add(g);
      islands.push(g);
      if (i > 0) {
        const post = new THREE.Group(),
          side = sideOf(directionOf(i - 1));
        post.position.copy(islandPosition(i)).addScaledVector(side, 1.15);
        post.position.y += 0.25;
        const color = [
          "#ffd89c",
          "#93def3",
          "#e2f1ff",
          "#dfc6fb",
          "#ffc58a",
          "#ffdf9c",
        ][world];
        const lampMaterial = new THREE.MeshStandardMaterial({
          color: "#756b8b",
          emissive: color,
          emissiveIntensity: 0,
          roughness: 0.65,
        });
        materials.add(lampMaterial);
        let lamp: THREE.Mesh;
        if (world === 0) {
          add(
            post,
            new THREE.CylinderGeometry(0.045, 0.06, 1.5, 6),
            mat("#655576"),
            0,
            0.75,
          );
          add(
            post,
            new THREE.BoxGeometry(0.4, 0.05, 0.05),
            mat("#655576"),
            0.15,
            1.5,
          );
          lamp = add(
            post,
            new THREE.OctahedronGeometry(0.19),
            lampMaterial,
            0.3,
            1.25,
          );
        } else if (world === 1) {
          add(
            post,
            new THREE.CylinderGeometry(0.24, 0.3, 0.35, 6),
            mat("#777598"),
            0,
            0.175,
          );
          lamp = add(
            post,
            new THREE.OctahedronGeometry(0.32),
            lampMaterial,
            0,
            0.75,
          );
          lamp.scale.set(0.65, 1.4, 0.65);
        } else if (world === 2) {
          add(
            post,
            new THREE.CylinderGeometry(0.07, 0.12, 1.25, 6),
            mat("#9bacc3"),
            0,
            0.625,
          );
          add(
            post,
            new THREE.CylinderGeometry(0.22, 0.18, 0.1, 8),
            mat("#d2dfdf"),
            0,
            1.3,
          );
          lamp = add(
            post,
            new THREE.SphereGeometry(0.17, 8, 6),
            lampMaterial,
            0,
            1.55,
          );
        } else if (world === 3) {
          add(
            post,
            new THREE.BoxGeometry(0.55, 0.65, 0.12),
            mat("#77688e"),
            0,
            1.15,
          );
          add(
            post,
            new THREE.CylinderGeometry(0.06, 0.08, 0.85, 6),
            mat("#71647e"),
            0,
            0.425,
          );
          lamp = add(
            post,
            new THREE.BoxGeometry(0.35, 0.45, 0.14),
            lampMaterial,
            0,
            1.15,
            0.02,
          );
        } else if (world === 4) {
          add(
            post,
            new THREE.CylinderGeometry(0.08, 0.14, 0.9, 6),
            mat("#806276"),
            0,
            0.45,
          );
          add(
            post,
            new THREE.CylinderGeometry(0.32, 0.22, 0.22, 8),
            mat("#967786"),
            0,
            1,
          );
          lamp = add(
            post,
            new THREE.OctahedronGeometry(0.2),
            lampMaterial,
            0,
            1.3,
          );
          lamp.scale.y = 1.5;
        } else {
          add(
            post,
            new THREE.CylinderGeometry(0.13, 0.2, 1, 8),
            mat("#bea77c"),
            0,
            0.5,
          );
          const ring = add(
            post,
            new THREE.TorusGeometry(0.3, 0.045, 5, 16),
            mat("#e3c687"),
            0,
            1.05,
          );
          ring.rotation.x = Math.PI / 2;
          for (let k = 0; k < 3; k++) {
            const a = (k * Math.PI * 2) / 3;
            add(
              post,
              new THREE.ConeGeometry(0.07, 0.22, 5),
              mat("#e3c687"),
              Math.sin(a) * 0.26,
              1.18,
              Math.cos(a) * 0.26,
            );
          }
          lamp = add(
            post,
            new THREE.OctahedronGeometry(0.22),
            lampMaterial,
            0,
            1.45,
          );
        }
        const light = new THREE.PointLight(color, 0, 7, 2);
        light.position.copy(lamp.position);
        light.visible = false;
        post.add(light);
        scene.add(post);
        posts[i] = { lamp, material: lampMaterial, light, color };
      }
    }
    const guardian = new THREE.Group(),
      shield: THREE.Mesh<THREE.TorusGeometry, THREE.MeshStandardMaterial>[] =
        [];
    let cracked = 0;
    function shieldState() {
      container.dataset.sceneShield = String(opts.boss ? count - cracked : 0);
    }
    if (opts.boss) {
      const keep = new THREE.Group();
      if (world >= 3) castle(keep, world === 5);
      else tower(keep, 0, 0, 2.4, palette[world][1], realmColors[world]);
      keep.scale.setScalar(0.75);
      mergeIsland(keep);
      guardian.add(keep);
      // The same shield-and-four-point-star silhouette as the DOM Crest, in original geometry.
      const crest = new THREE.Shape();
      crest.moveTo(0, 0.8);
      crest.lineTo(0.62, 0.53);
      crest.lineTo(0.62, -0.1);
      crest.lineTo(0, -0.8);
      crest.lineTo(-0.62, -0.1);
      crest.lineTo(-0.62, 0.53);
      crest.closePath();
      add(
        guardian,
        new THREE.ShapeGeometry(crest),
        mat("#e4c88e", true),
        0,
        1.55,
        0.85,
      );
      const star = new THREE.Shape();
      star.moveTo(0, 0.52);
      star.lineTo(0.13, 0.12);
      star.lineTo(0.46, 0);
      star.lineTo(0.13, -0.12);
      star.lineTo(0, -0.52);
      star.lineTo(-0.13, -0.12);
      star.lineTo(-0.46, 0);
      star.lineTo(-0.13, 0.12);
      star.closePath();
      add(
        guardian,
        new THREE.ShapeGeometry(star),
        mat("#63528b"),
        0,
        1.55,
        0.86,
      );
      for (let k = 0; k < count; k++) {
        const material = new THREE.MeshStandardMaterial({
          color: "#b9a5e6",
          emissive: "#8274b8",
          emissiveIntensity: 0.6,
          transparent: true,
        });
        const segment = add(
          guardian,
          new THREE.TorusGeometry(
            1.75,
            0.105,
            5,
            8,
            ((Math.PI * 2) / count) * 0.78,
          ),
          material,
          0,
          1.6,
          1.05,
        ) as THREE.Mesh<THREE.TorusGeometry, THREE.MeshStandardMaterial>;
        segment.rotation.z = (k * Math.PI * 2) / count;
        shield.push(segment);
      }
      guardian.position.copy(islandPosition(count));
      scene.add(guardian);
    }
    shieldState();
    async function crackShield(gap: number) {
      if (!opts.boss || cracked >= count || disposed) return;
      const segment = shield[cracked++];
      shieldState();
      if (motion && visible && !document.hidden) {
        const start = bridgePoint(gap, 0.65).add(new THREE.Vector3(0, 0.5, 0)),
          end = guardian.position.clone().add(new THREE.Vector3(0, 1.6, 1.05)),
          middle = start
            .clone()
            .lerp(end, 0.5)
            .add(new THREE.Vector3(0, 3, 0));
        const geo = geometry(
            new THREE.TubeGeometry(
              new THREE.CatmullRomCurve3([start, middle, end]),
              24,
              0.045,
              5,
              false,
            ),
          ),
          material = new THREE.MeshBasicMaterial({
            color: "#ffe3a0",
            transparent: true,
          });
        materials.add(material);
        const bolt = new THREE.Mesh(geo, material);
        scene.add(bolt);
        await animate(220, (t) => {
          material.opacity = Math.sin(Math.PI * t);
        });
        scene.remove(bolt);
        geo.dispose();
        geometries.delete(geo);
        material.dispose();
        materials.delete(material);
      }
      const from = segment.position.y;
      await animate(600, (t) => {
        segment.position.y = from - t * t * 2.4;
        segment.rotation.x = t * 0.7;
        segment.material.opacity = 1 - t;
      });
      segment.visible = false;
    }
    async function swayGuardian() {
      if (!opts.boss) return;
      await animate(
        500,
        (t) => {
          guardian.rotation.z =
            ((Math.sin(t * Math.PI * 4) * Math.PI) / 90) * (1 - t);
        },
        (t) => t,
      );
      guardian.rotation.z = 0;
    }
    async function shatterShield() {
      if (!opts.boss || disposed) return;
      shield.forEach((s) => {
        s.visible = false;
      });
      cracked = count;
      shieldState();
      if (!motion || !visible || document.hidden) return;
      await burstParticles(
        guardian.position.clone().add(new THREE.Vector3(0, 1.6, 0)),
        40,
        "#ffdf9c",
      );
    }

    const look = appearance(opts.equipment);
    const hero = new THREE.Group(),
      body = new THREE.Group();
    hero.add(body);
    add(body, new THREE.ConeGeometry(0.36, 0.95, 8), mat(look.robe), 0, 0.48);
    add(
      body,
      new THREE.ConeGeometry(
        0.3,
        0.7,
        8,
        1,
        true,
        Math.PI * 0.6,
        Math.PI * 0.8,
      ),
      mat("#5b4a91"),
      0,
      0.55,
      -0.04,
    );
    add(body, new THREE.SphereGeometry(0.2, 10, 8), mat("#f0c9a5"), 0, 1.08);
    const hat = add(
      body,
      look.crown
        ? new THREE.CylinderGeometry(0.26, 0.22, 0.17, 8)
        : new THREE.ConeGeometry(0.27, 0.55, 8),
      mat(look.hat),
      0,
      look.crown ? 1.27 : 1.42,
    );
    hat.visible = !look.noHat;
    hat.rotation.z = look.crown ? 0 : -0.15;
    if (look.crown)
      for (let k = 0; k < 5; k++) {
        const a = (k * Math.PI * 2) / 5;
        add(
          body,
          new THREE.ConeGeometry(0.07, 0.22, 5),
          mat(look.hat),
          Math.sin(a) * 0.22,
          1.46,
          Math.cos(a) * 0.22,
        );
      }
    const brim = add(
      body,
      new THREE.TorusGeometry(0.24, 0.04, 5, 14),
      mat(opts.equipment?.hat === "hat-moon" ? "#e2f3ff" : "#f2d397"),
      0,
      1.2,
    );
    brim.rotation.x = Math.PI / 2;
    brim.visible = !look.noHat;
    if (look.hair !== "hair-none") {
      const hair = add(
        body,
        new THREE.SphereGeometry(0.215, 10, 7),
        mat(look.hairColor),
        0,
        1.13,
        -0.045,
      );
      hair.scale.set(1.04, 0.9, 1);
      // A fringe and side locks remain visible under hats; long styles extend down the back.
      for (const side of [-1, 1])
        add(
          body,
          new THREE.SphereGeometry(0.08, 7, 5),
          mat(look.hairColor),
          side * 0.17,
          1.02,
          0.02,
        );
      if (look.hair === "hair-chestnut")
        for (let k = 0; k < 6; k++)
          add(
            body,
            new THREE.SphereGeometry(0.075, 6, 5),
            mat(look.hairColor),
            Math.cos(k) * 0.15,
            1.23,
            Math.sin(k) * 0.15,
          );
      else
        for (let k = 0; k < (look.hair === "hair-midnight" ? 5 : 2); k++)
          add(
            body,
            new THREE.SphereGeometry(0.075, 7, 5),
            mat(look.hairColor),
            0,
            1.02 - k * 0.1,
            -0.2,
          );
    }
    const backAccessory = new THREE.Group();
    backAccessory.name = "back-accessory";
    body.add(backAccessory);
    if (look.back === "back-pack") {
      add(
        backAccessory,
        new THREE.BoxGeometry(0.4, 0.5, 0.22),
        mat(look.backColor),
        0,
        0.72,
        -0.32,
      );
      add(
        backAccessory,
        new THREE.BoxGeometry(0.26, 0.18, 0.05),
        mat("#e6c69b"),
        0,
        0.65,
        -0.45,
      );
    } else if (look.back !== "back-none")
      for (const side of [-1, 1]) {
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        if (look.back === "back-fairy") {
          shape.bezierCurveTo(
            side * 0.85,
            0.9,
            side * 1.1,
            0.3,
            side * 0.48,
            -0.15,
          );
          shape.bezierCurveTo(side * 0.9, -0.7, side * 0.25, -0.65, 0, 0);
        } else {
          shape.lineTo(side * 0.95, 0.65);
          shape.lineTo(side * 0.78, -0.1);
          shape.lineTo(side * 0.47, 0.04);
          shape.lineTo(side * 0.3, -0.43);
          shape.closePath();
        }
        const wing = add(
          backAccessory,
          new THREE.ShapeGeometry(shape, 8),
          mat(look.backColor, true),
          side * 0.08,
          0.9,
          -0.21,
        );
        (wing.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
        wing.rotation.y = side * 1.0;
      }
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
      mat(look.staff, true),
      0.34,
      1.4,
      0.08,
    );
    const staffLight = new THREE.PointLight(look.staff, 1, 5, 2);
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
    const companion = companionModel(look.pet);
    companion.name = "quest-companion";
    companion.scale.setScalar(1.4);
    companion.position.copy(companionPosition(hero.position, directionOf(0)));
    companion.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        geometry(node.geometry);
        materials.add(node.material as THREE.Material);
      }
    });
    scene.add(companion);
    const aura = new THREE.Group();
    hero.add(aura);
    if (look.aura === "aura-ring") {
      const ring = add(
        aura,
        new THREE.TorusGeometry(0.65, 0.025, 5, 24),
        mat("#a9e7e0", true),
        0,
        0.13,
      );
      ring.rotation.x = Math.PI / 2;
    }
    if (look.aura === "aura-stars")
      for (let k = 0; k < 3; k++) {
        const a = (k * Math.PI * 2) / 3;
        add(
          aura,
          new THREE.OctahedronGeometry(0.07),
          mat("#ffe3a0", true),
          Math.sin(a) * 0.65,
          0.45,
          Math.cos(a) * 0.65,
        );
      }
    container.dataset.scenePet = look.pet;
    container.dataset.sceneHair = look.hair;
    container.dataset.sceneBack = look.back;
    container.dataset.sceneRobe = opts.equipment?.robe || "robe-lilac";
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
        color: kind === "blue" ? "#bfe3ff" : realmColors[world],
        emissive: kind === "blue" ? "#45769d" : palette[world][1],
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
      if (motion && visible && !document.hidden) {
        tile.position.y -= 3.2;
        m.opacity = 0.3;
      }
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
    // Point sprites batch the sky into three draws; every texture is generated locally.
    const sky = new THREE.Group();
    scene.add(sky);
    const fraction = (i: number) => {
      const v = Math.sin(i * 78.233 + opts.seed.length * 19.19) * 43758.5453;
      return v - Math.floor(v);
    };
    function pointField(
      amount: number,
      color: string,
      size: number,
      cloud = false,
    ) {
      const positions = new Float32Array(amount * 3);
      for (let k = 0; k < amount; k++) {
        positions[k * 3] = fraction(k * 3 + 1) * (count * 10.5 + 70) - 25;
        positions[k * 3 + 1] = cloud
          ? -5 - fraction(k * 3 + 2) * 5
          : size < 0.1
            ? 8 + fraction(k * 3 + 2) * 65
            : 0.3 + fraction(k * 3 + 2) * 5;
        positions[k * 3 + 2] =
          (fraction(k * 3 + 3) - 0.5) * (cloud ? 55 : size < 0.1 ? 140 : 18);
      }
      const geo = geometry(new THREE.BufferGeometry());
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const material = new THREE.PointsMaterial({
        color,
        size,
        map: glowTexture,
        transparent: true,
        opacity: cloud ? 0.27 : 0.8,
        depthWrite: false,
        blending: cloud ? THREE.NormalBlending : THREE.AdditiveBlending,
      });
      materials.add(material);
      const points = new THREE.Points(geo, material);
      sky.add(points);
      return points;
    }
    const stars = pointField(700, "#eee1ff", 0.075),
      fireflies = pointField(90, "#ffe0a0", 0.16),
      clouds = pointField(70, "#a49ec9", 9, true);
    stars.visible = fireflies.visible = motion;
    const flyOrigin = (
      fireflies.geometry.attributes.position.array as Float32Array
    ).slice();
    async function burstParticles(
      origin: THREE.Vector3,
      amount: number,
      color: string,
    ) {
      if (!motion || !visible || document.hidden || disposed) return;
      const positions = new Float32Array(amount * 3),
        geo = geometry(new THREE.BufferGeometry()),
        material = new THREE.PointsMaterial({
          color,
          size: 0.2,
          map: glowTexture,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
      materials.add(material);
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const burst = new THREE.Points(geo, material);
      burst.position.copy(origin);
      scene.add(burst);
      await animate(
        1000,
        (t) => {
          for (let k = 0; k < amount; k++) {
            const a = k * 2.39996;
            positions[k * 3] = Math.cos(a) * t * (1 + (k % 3));
            positions[k * 3 + 1] = Math.sin(k * 7) * t * 2 + t * 1.4 - t * t;
            positions[k * 3 + 2] = Math.sin(a) * t * (1 + (k % 3));
          }
          geo.attributes.position.needsUpdate = true;
          material.opacity = 1 - t;
        },
        (t) => t,
      );
      scene.remove(burst);
      geo.dispose();
      geometries.delete(geo);
      material.dispose();
      materials.delete(material);
    }
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
      post.material.emissive.set(helped ? "#bfe3ff" : post.color);
      post.light.color.set(helped ? "#bfe3ff" : post.color);
      post.light.visible = true;
      void animate(700, (t) => {
        post.material.emissiveIntensity = t * 1.4;
        post.light.intensity = t * 1.6;
      });
      for (let i = 1; i < posts.length; i++)
        if (posts[i]) posts[i].light.visible = Math.abs(i - index) < 2;
      void burstParticles(
        islandPosition(index).add(new THREE.Vector3(0, 1.4, 0)),
        26,
        helped ? "#bfe3ff" : post.color,
      );
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
            if (disposed) return;
            if (result.retrySameGap) {
              await swayGuardian();
              return;
            }
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
          await crackShield(gap);
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
      if (state.phase === "finished") {
        const centre = islandPosition(count),
          angle = (motion ? time * 0.18 : 0.7) + yaw;
        const wanted = centre
          .clone()
          .add(
            new THREE.Vector3(Math.sin(angle) * 7, 3.6, Math.cos(angle) * 7),
          );
        camera.position.lerp(wanted, motion ? 1 - Math.exp(-5 * dt) : 1);
        camera.lookAt(centre.add(new THREE.Vector3(0, 1, 0)));
        if (!dragging) yaw *= motion ? Math.exp(-3 * dt) : 0;
        return;
      }
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
      if (state.phase === "intro" && motion) {
        const progress = ease(Math.min(1, introAge / 2)),
          middle = islandPosition(count / 2),
          wide = middle
            .clone()
            .add(new THREE.Vector3(0, 22, -26 - count * 1.1));
        wanted.lerpVectors(wide, wanted.clone(), progress);
        target.lerpVectors(middle, target.clone(), progress);
      }
      const follow =
        state.phase === "intro" ? 0.9 + Math.min(1, introAge / 2) * 6.1 : 7;
      camera.position.lerp(wanted, motion ? 1 - Math.exp(-follow * dt) : 1);
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
        backAccessory.rotation.y = Math.sin(time * 2) * 0.06;
        aura.rotation.y = time * 0.45;
      }
      if (state.phase === "intro") {
        introAge += dt;
        if (!motion || introAge >= 2) state.phase = "ready";
      }
      if (motion) {
        const cloudPositions = clouds.geometry.attributes.position
          .array as Float32Array;
        for (let k = 0; k < 70; k++) {
          cloudPositions[k * 3] += dt * 0.18;
          if (cloudPositions[k * 3] > count * 10.5 + 45)
            cloudPositions[k * 3] = -25;
        }
        clouds.geometry.attributes.position.needsUpdate = true;
        const flyPositions = fireflies.geometry.attributes.position
          .array as Float32Array;
        for (let k = 0; k < 90; k++)
          flyPositions[k * 3 + 1] =
            flyOrigin[k * 3 + 1] + Math.sin(time * 0.8 + k) * 0.22;
        fireflies.geometry.attributes.position.needsUpdate = true;
        fireflies.material.opacity = 0.55 + Math.sin(time * 1.6) * 0.15;
      }
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
      const companionTarget = companionPosition(
        hero.position,
        directionOf(Math.min(state.arrived, count - 1)),
      );
      if (motion) companionTarget.y += Math.sin(time * 2.2) * 0.07;
      companion.position.lerp(
        companionTarget,
        motion ? 1 - Math.exp(-9 * dt) : 1,
      );
      companion.rotation.y = hero.rotation.y;
      const wispWant = wispFree
        ? hero.position
            .clone()
            .add(
              new THREE.Vector3(
                hearing ? 0 : motion ? Math.cos(time * 1.1) * 1.15 : 1.15,
                (hearing ? 2.7 : 2.05) +
                  (motion ? Math.sin(time * 2.1) * 0.15 : 0),
                hearing ? 0 : motion ? Math.sin(time * 1.1) * 1.15 : 0,
              ),
            )
        : wispTarget;
      wisp.position.lerp(wispWant, motion ? 1 - Math.exp(-6 * dt) : 1);
      updateCamera(dt);
      try {
        renderer.render(scene, camera);
      } catch {
        container.dispatchEvent(new Event("quest-scene-unavailable"));
        return;
      }
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
    detach = () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      renderer.domElement.removeEventListener("pointerdown", down);
      renderer.domElement.removeEventListener("pointermove", move);
      renderer.domElement.removeEventListener("pointerup", up);
      renderer.domElement.removeEventListener("pointercancel", up);
      renderer.domElement.removeEventListener("webglcontextlost", lost);
    };
    resize();
    notify();
    return {
      typed: syncTyped,
      resolve,
      finish: () => {
        chain = chain.then(async () => {
          if (disposed) return;
          if (!opts.boss) {
            await animate(700, (t) => {
              gate.scale.set(1 + t * 0.4, 1 + t * 0.15, 1);
              gate.rotation.y = (t * Math.PI) / 2;
            });
            container.dataset.sceneGate = "open";
          }
          await shatterShield();
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
        if (!on) {
          if (state.phase === "intro") state.phase = "ready";
          flush();
        }
        stars.visible = fireflies.visible = on;
        cancelAnimationFrame(frame);
        frame = 0;
        body.position.y = 0;
        updateCamera(1);
        requestRender();
      },
      hear: (on) => {
        hearing = on;
        container.dataset.sceneHearing = String(on);
        requestRender();
      },
      dispose: () => {
        if (disposed) return;
        disposed = true;
        flush();
        detach?.();
        scene.clear();
        geometries.forEach((g) => g.dispose());
        materials.forEach((m) => m.dispose());
        textures.forEach((t) => t.dispose());
        renderer.dispose();
        renderer.forceContextLoss();
        renderer.domElement.remove();
      },
    };
  } catch (error) {
    disposed = true;
    cancelAnimationFrame(frame);
    detach?.();
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose());
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement.remove();
    throw error;
  }
}
