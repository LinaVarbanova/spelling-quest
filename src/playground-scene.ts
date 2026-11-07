import * as THREE from "three";

export const realmColors = [
  "#70ebbb",
  "#96b4ff",
  "#8ae1ff",
  "#c59bff",
  "#ffac7d",
  "#ffe19a",
];
const palette = [
  ["#6bc8a0", "#66508e"],
  ["#817bca", "#514374"],
  ["#b5d9e9", "#7276a6"],
  ["#9b82be", "#4a426a"],
  ["#d57d70", "#73445f"],
  ["#b5e1d1", "#8576a4"],
];
function material(color: string, emissive = false) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.48,
    metalness: 0.08,
    ...(emissive ? { emissive: color, emissiveIntensity: 0.55 } : {}),
  });
}
function mesh(
  parent: THREE.Group,
  geometry: THREE.BufferGeometry,
  color: string,
  x = 0,
  y = 0,
  z = 0,
  glow = false,
) {
  const m = new THREE.Mesh(geometry, material(color, glow));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
function ball(
  g: THREE.Group,
  color: string,
  r: number,
  x: number,
  y: number,
  z: number,
) {
  return mesh(g, new THREE.SphereGeometry(r, 16, 12), color, x, y, z);
}
function box(g: THREE.Group, color: string, size: number[], p: number[]) {
  return mesh(
    g,
    new THREE.BoxGeometry(...(size as [number, number, number])),
    color,
    ...(p as [number, number, number]),
  );
}
function cone(
  g: THREE.Group,
  color: string,
  r: number,
  h: number,
  x: number,
  y: number,
  z: number,
  sides = 10,
) {
  return mesh(g, new THREE.ConeGeometry(r, h, sides), color, x, y, z);
}
function crystal(
  g: THREE.Group,
  color: string,
  x: number,
  y: number,
  z: number,
  size = 0.5,
) {
  const c = mesh(g, new THREE.OctahedronGeometry(size), color, x, y, z, true);
  c.scale.set(0.6, 1.65, 0.6);
  c.rotation.z = x * 0.12;
  return c;
}
function tree(g: THREE.Group, x: number, z: number, s = 1, color = "#77cdb0") {
  const t = new THREE.Group();
  t.position.set(x, 0.2, z);
  t.scale.setScalar(s);
  g.add(t);
  mesh(
    t,
    new THREE.CylinderGeometry(0.12, 0.19, 1.0, 8),
    "#8d648a",
    0,
    0.45,
    0,
  );
  ball(t, color, 0.64, 0, 1.25, 0);
  ball(t, color, 0.48, -0.4, 1.0, 0.1);
  ball(t, "#a1e3bb", 0.45, 0.36, 1.15, -0.05);
  return t;
}
function portal(g: THREE.Group, color: string, x = 0, z = 0) {
  const arc = mesh(
    g,
    new THREE.TorusGeometry(0.67, 0.14, 8, 30),
    color,
    x,
    1.05,
    z,
    true,
  );
  arc.scale.y = 1.25;
  const inner = mesh(
    g,
    new THREE.CircleGeometry(0.56, 32),
    "#332851",
    x,
    1.05,
    z - 0.03,
  );
  inner.scale.y = 1.25;
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    ball(
      g,
      "#ffe2a3",
      0.06,
      x + Math.sin(a) * 0.67,
      1.05 + Math.cos(a) * 0.84,
      z + 0.1,
    );
  }
}
function tower(
  g: THREE.Group,
  x: number,
  z: number,
  h: number,
  body: string,
  roof: string,
) {
  mesh(
    g,
    new THREE.CylinderGeometry(0.36, 0.4, h, 12),
    body,
    x,
    h / 2 + 0.2,
    z,
  );
  cone(g, roof, 0.53, 0.85, x, h + 0.55, z);
  box(g, "#ffe2a1", [0.17, 0.28, 0.05], [x, h * 0.7, z + 0.38]);
}
function castle(g: THREE.Group, champion = false) {
  const body = champion ? "#eee8d3" : "#aaa2d5",
    roof = champion ? "#6ed5c7" : "#8768bb";
  box(g, body, [1.3, 1.1, 0.9], [0, 0.8, 0]);
  tower(g, -0.85, -0.35, 1.65, body, roof);
  tower(g, 0.85, -0.35, 1.65, body, roof);
  tower(g, 0, -0.55, champion ? 2.9 : 2.5, body, roof);
  box(g, champion ? "#a3e4d5" : "#6e5c99", [0.42, 0.65, 0.05], [0, 0.55, 0.48]);
  for (let i = 0; i < 4; i++)
    box(g, body, [0.22, 0.22, 0.22], [-0.6 + i * 0.4, 1.47, 0.38]);
  if (champion) {
    crystal(g, "#ffd58a", 0, 3.9, -0.55, 0.3);
    const halo = mesh(
      g,
      new THREE.TorusGeometry(0.82, 0.035, 6, 36),
      "#ffdb8d",
      0,
      3.65,
      -0.55,
      true,
    );
    halo.rotation.x = Math.PI / 2;
    const rainbow = ["#ffb8d8", "#ffe4a2", "#a2e7da"];
    rainbow.forEach((c, i) =>
      mesh(
        g,
        new THREE.TorusGeometry(1.5 + i * 0.1, 0.035, 6, 32, Math.PI),
        c,
        0,
        0.7,
        -1.1,
        true,
      ),
    );
  } else ball(g, "#f4d5ff", 0.35, 1.35, 2.7, -0.9);
}
function dragon(g: THREE.Group) {
  const d = new THREE.Group();
  d.position.set(-0.15, 0.25, 0.1);
  g.add(d);
  const body = ball(d, "#f09a81", 0.65, 0, 0.6, 0);
  body.scale.set(1.35, 0.9, 1);
  const belly = ball(d, "#ffd6a0", 0.48, 0.3, 0.55, 0.4);
  belly.scale.set(1, 0.8, 0.7);
  const head = ball(d, "#f6ad8d", 0.4, 0.8, 1.02, 0.3);
  head.scale.set(1.1, 1, 0.95);
  const snout = ball(d, "#ffbc9b", 0.28, 1.08, 0.93, 0.48);
  snout.scale.x = 1.25;
  ball(d, "#fff6dc", 0.12, 0.88, 1.18, 0.62);
  ball(d, "#372d58", 0.063, 0.91, 1.19, 0.71);
  cone(d, "#ffe8b3", 0.09, 0.31, 0.65, 1.44, 0.2);
  cone(d, "#ffe8b3", 0.09, 0.31, 1.0, 1.43, 0.2);
  for (let i = 0; i < 5; i++)
    cone(d, "#ffd38b", 0.1, 0.27, -0.75 + i * 0.29, 1.03, -0.08);
  const tail = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.6, 0.45, 0),
    new THREE.Vector3(-1.3, 0.3, -0.4),
    new THREE.Vector3(-1.45, 0.45, -1),
    new THREE.Vector3(-0.9, 0.65, -1.15),
  ]);
  mesh(d, new THREE.TubeGeometry(tail, 18, 0.15, 8, false), "#ed937f");
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(-0.1, 1.35);
  shape.lineTo(0.75, 1.8);
  shape.lineTo(1.25, 0.72);
  shape.lineTo(0.65, 0.85);
  shape.lineTo(0.42, 0.3);
  shape.closePath();
  const wing = mesh(
    d,
    new THREE.ExtrudeGeometry(shape, {
      depth: 0.06,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.04,
      bevelSegments: 1,
      steps: 1,
    }),
    "#c778a0",
    -0.35,
    0.5,
    -0.35,
  );
  wing.rotation.set(0, -0.5, -0.2);
  const wing2 = wing.clone();
  wing2.material = material("#f1b196");
  wing2.position.z = 0.4;
  wing2.scale.set(0.7, 0.7, 0.7);
  wing2.rotation.y = 0.4;
  d.add(wing2);
  for (let i = 0; i < 14; i++) {
    const a = i * 2.4,
      r = 0.7 + (i % 3) * 0.16;
    mesh(
      g,
      new THREE.CylinderGeometry(0.16, 0.16, 0.08, 12),
      "#ffdc83",
      Math.sin(a) * r,
      0.31 + (i % 3) * 0.08,
      1 + Math.cos(a) * 0.45,
    );
  }
  crystal(g, "#ffbc79", -1.3, 0.7, 0.8, 0.25);
}
export function buildRealm(world: number) {
  const g = new THREE.Group();
  g.userData.world = world;
  const [ground, rock] = palette[world];
  const under = mesh(
    g,
    new THREE.IcosahedronGeometry(1.9, 0),
    rock,
    0,
    -0.95,
    0,
  );
  under.scale.set(1.0, 0.75, 0.92);
  under.rotation.y = 0.35;
  mesh(g, new THREE.CylinderGeometry(1.87, 1.98, 0.36, 12), ground, 0, 0.0, 0);
  const rim = mesh(
    g,
    new THREE.TorusGeometry(1.88, 0.035, 6, 60),
    realmColors[world],
    0,
    0.18,
    0,
    true,
  );
  rim.rotation.x = Math.PI / 2;
  rim.name = "selection-ring";
  if (world === 0) {
    tree(g, -1.05, -0.65, 1.0);
    tree(g, 0.7, -0.8, 1.15, "#87c5cd");
    tree(g, 1.3, 0.35, 0.6);
    tree(g, -1.2, 0.9, 0.65);
    portal(g, "#ffe4a4", -0.1, 0.2);
    const path = mesh(
      g,
      new THREE.CircleGeometry(0.65, 20),
      "#d9e9b1",
      0,
      0.2,
      1.15,
    );
    path.rotation.x = -Math.PI / 2;
    path.scale.set(0.5, 1, 1);
    for (let i = 0; i < 4; i++) {
      const x = -1.25 + i * 0.65;
      mesh(
        g,
        new THREE.CylinderGeometry(0.025, 0.025, 0.35, 6),
        "#dfb988",
        x,
        0.5,
        1.2,
      );
      ball(g, "#ffe4a3", 0.1, x, 0.75, 1.2);
    }
  } else if (world === 1) {
    for (let i = 0; i < 7; i++) {
      const a = i * 0.9;
      crystal(
        g,
        i % 2 ? "#b5a6ff" : "#81e7ef",
        Math.sin(a) * 1.2,
        0.65 + (i % 3) * 0.24,
        Math.cos(a) * 1.05,
        0.35 + (i % 3) * 0.1,
      );
    }
    portal(g, "#b6b0ff", 0, -0.3);
  } else if (world === 2) {
    cone(g, "#8bbad4", 1, 2.6, -0.5, 1.45, -0.5, 5);
    cone(g, "#eaf6fb", 0.4, 1, -0.5, 2.28, -0.5, 5);
    cone(g, "#b2d0e2", 0.68, 1.8, -1.0, 1.05, 0.2, 5);
    box(g, "#eee5d6", [0.7, 0.7, 0.7], [0.9, 0.6, 0.5]);
    const roof = cone(g, "#69a9cf", 0.62, 0.55, 0.9, 1.2, 0.5, 4);
    roof.rotation.y = Math.PI / 4;
    for (let i = 0; i < 7; i++)
      box(
        g,
        "#d1b8a0",
        [0.22, 0.07, 0.35],
        [-0.65 + i * 0.23, 0.3 + Math.sin((i / 6) * Math.PI) * 0.15, 1],
      );
  } else if (world === 3) {
    castle(g);
    crystal(g, "#ce99ff", -1.2, 0.7, 0.85, 0.3);
    crystal(g, "#b5a3ed", 1.3, 0.6, 0.8, 0.24);
  } else if (world === 4) {
    dragon(g);
  } else {
    castle(g, true);
    tree(g, -1.3, 0.65, 0.5, "#e5b2d4");
    tree(g, 1.3, 0.6, 0.5, "#e8c1da");
  }
  for (let i = 0; i < 3; i++) {
    const a = i * 2.1 + 0.6;
    ball(
      g,
      realmColors[world],
      0.07,
      Math.sin(a) * 2.15,
      0.75 + i * 0.35,
      Math.cos(a) * 2.0,
    );
  }
  return g;
}

export function createPlayground(
  container: HTMLElement,
  onSelect: (world: number) => void,
) {
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute("aria-hidden", "true");
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-10, 10, 8, -8, 0.1, 100);
  camera.position.set(7, 12, 20);
  camera.lookAt(0, 0, 0);
  scene.add(new THREE.HemisphereLight("#e6ecff", "#7b528d", 2.6));
  const light = new THREE.DirectionalLight("#fff0d6", 4.1);
  light.position.set(-5, 12, 8);
  light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  light.shadow.camera.left = -12;
  light.shadow.camera.right = 12;
  light.shadow.camera.top = 12;
  light.shadow.camera.bottom = -12;
  light.shadow.bias = -0.002;
  light.shadow.normalBias = 0.06;
  scene.add(light);
  scene.add(new THREE.AmbientLight("#d1c4f7", 0.6));
  const root = new THREE.Group();
  scene.add(root);
  const islands = Array.from({ length: 6 }, (_, i) => {
    const g = buildRealm(i);
    g.position.set(
      ((i % 3) - 1) * 5.1,
      [0.2, 0.4, 0.15, -0.3, -0.1, -0.35][i],
      i < 3 ? -2.3 : 3.4,
    );
    g.userData.baseY = g.position.y;
    root.add(g);
    return g;
  });
  const curve = new THREE.CatmullRomCurve3(
    islands.map((g) => g.position.clone().add(new THREE.Vector3(0, -1.8, 0))),
  );
  const routeGeometry = new THREE.BufferGeometry().setFromPoints(
    curve.getPoints(100),
  );
  const route = new THREE.Line(
    routeGeometry,
    new THREE.LineDashedMaterial({
      color: "#b3a2ef",
      dashSize: 0.16,
      gapSize: 0.16,
      transparent: true,
      opacity: 0.3,
    }),
  );
  route.computeLineDistances();
  root.add(route);
  let selected = 0,
    motion = true,
    targetRotation = 0,
    frame = 0,
    visible = true,
    disposed = false,
    dragging = false,
    downX = 0,
    lastX = 0,
    moved = 0,
    contextLost = false;
  const raycaster = new THREE.Raycaster(),
    pointer = new THREE.Vector2();
  const resize = () => {
    const w = container.clientWidth,
      h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    const aspect = w / h;
    const halfHeight = Math.max(6.3, 8.4 / aspect);
    camera.left = -halfHeight * aspect;
    camera.right = halfHeight * aspect;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();
  const clock = new THREE.Clock();
  let lastPaint = 0;
  const render = () => {
    if (disposed || !visible || document.hidden || contextLost) return;
    const now = performance.now();
    if (motion && now - lastPaint < 32) {
      frame = requestAnimationFrame(render);
      return;
    }
    lastPaint = now;
    const t = clock.getElapsedTime();
    root.rotation.y = motion
      ? THREE.MathUtils.lerp(root.rotation.y, targetRotation, 0.1)
      : targetRotation;
    islands.forEach((g, i) => {
      const targetScale = i === selected ? 1.08 : 0.9;
      if (motion)
        g.scale.lerp(
          new THREE.Vector3(targetScale, targetScale, targetScale),
          0.09,
        );
      else g.scale.setScalar(targetScale);
      g.position.y =
        Number(g.userData.baseY) +
        (i === selected ? 0.18 : 0) +
        (motion ? Math.sin(t * 0.8 + i) * 0.12 : 0);
      const ring = g.getObjectByName("selection-ring") as THREE.Mesh;
      const m = ring.material as THREE.MeshStandardMaterial;
      m.emissiveIntensity = i === selected ? 1.2 : 0.3;
    });
    renderer.render(scene, camera);
    frame = motion ? requestAnimationFrame(render) : 0;
  };
  const resume = () => {
    cancelAnimationFrame(frame);
    lastPaint = 0;
    render();
  };
  const visibility = new IntersectionObserver(
    (entries) => {
      visible = entries[0].isIntersecting;
      if (visible) resume();
      else cancelAnimationFrame(frame);
    },
    { threshold: 0.02 },
  );
  visibility.observe(container);
  const onVisibility = () => {
    if (document.hidden) cancelAnimationFrame(frame);
    else resume();
  };
  document.addEventListener("visibilitychange", onVisibility);
  const onDown = (e: PointerEvent) => {
    dragging = true;
    downX = lastX = e.clientX;
    moved = 0;
    renderer.domElement.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    if (!dragging) return;
    moved = Math.max(moved, Math.abs(e.clientX - downX));
    targetRotation = THREE.MathUtils.clamp(
      targetRotation + (e.clientX - lastX) * 0.004,
      -0.75,
      0.75,
    );
    lastX = e.clientX;
    if (!motion) resume();
  };
  const onUp = (e: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    if (moved > 6) return;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      (-(e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(islands, true)[0];
    if (hit) {
      let node: THREE.Object3D | null = hit.object;
      while (node && node.userData.world === undefined) node = node.parent;
      if (node) onSelect(Number(node.userData.world));
    }
  };
  const onCancel = () => {
    dragging = false;
  };
  const onLost = (e: Event) => {
    e.preventDefault();
    contextLost = true;
    cancelAnimationFrame(frame);
    container.dispatchEvent(new Event("playground-unavailable"));
  };
  renderer.domElement.addEventListener("pointerdown", onDown);
  renderer.domElement.addEventListener("pointermove", onMove);
  renderer.domElement.addEventListener("pointerup", onUp);
  renderer.domElement.addEventListener("pointercancel", onCancel);
  renderer.domElement.addEventListener("webglcontextlost", onLost);
  resume();
  return {
    select: (i: number) => {
      selected = i;
      resume();
    },
    setMotion: (value: boolean) => {
      motion = value;
      resume();
    },
    rotate: (delta: number) => {
      targetRotation = THREE.MathUtils.clamp(
        targetRotation + delta,
        -0.75,
        0.75,
      );
      resume();
    },
    dispose: () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      visibility.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointermove", onMove);
      renderer.domElement.removeEventListener("pointerup", onUp);
      renderer.domElement.removeEventListener("pointercancel", onCancel);
      renderer.domElement.removeEventListener("webglcontextlost", onLost);
      const geometries = new Set<THREE.BufferGeometry>(),
        materials = new Set<THREE.Material>();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.Line) {
          geometries.add(o.geometry);
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
            materials.add(m),
          );
        }
      });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}

/** Build-time artwork renderer: a separate high-resolution view for each realm, never an enlarged crop. */
export function renderRealmPoster(world: number) {
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true,
  });
  renderer.setSize(2400, 1400);
  renderer.setPixelRatio(1);
  renderer.setClearColor(0, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight("#eff2ff", "#6d4e86", 3));
  const light = new THREE.DirectionalLight("#fff1d9", 4);
  light.position.set(-5, 9, 8);
  scene.add(light);
  const camera = new THREE.OrthographicCamera(-4.8, 4.8, 2.8, -2.8, 0.1, 100);
  camera.position.set(6, 5, 9);
  camera.lookAt(0, 0.8, 0);
  const model = buildRealm(world);
  scene.add(model);
  scene.updateMatrixWorld(true);
  camera.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(model),
    viewBounds = new THREE.Box3();
  for (const x of [bounds.min.x, bounds.max.x])
    for (const y of [bounds.min.y, bounds.max.y])
      for (const z of [bounds.min.z, bounds.max.z])
        viewBounds.expandByPoint(
          new THREE.Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse),
        );
  const center = viewBounds.getCenter(new THREE.Vector3());
  const halfH =
    Math.max(
      (viewBounds.max.y - viewBounds.min.y) / 2,
      (viewBounds.max.x - viewBounds.min.x) / 2 / (2400 / 1400),
    ) * 1.18;
  const halfW = (halfH * 2400) / 1400;
  camera.left = center.x - halfW;
  camera.right = center.x + halfW;
  camera.top = center.y + halfH;
  camera.bottom = center.y - halfH;
  camera.updateProjectionMatrix();
  renderer.render(scene, camera);
  const data = renderer.domElement.toDataURL("image/webp", 0.95);
  scene.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.geometry.dispose();
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
        m.dispose(),
      );
    }
  });
  renderer.dispose();
  renderer.forceContextLoss();
  return data;
}
