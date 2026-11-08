import * as THREE from "three";
/** Original low-poly companion models; the caller owns and disposes all resources. */
export function companionModel(id: string) {
  const group = new THREE.Group();
  const part = (
    geo: THREE.BufferGeometry,
    color: string,
    x = 0,
    y = 0,
    z = 0,
  ) => {
    const mesh = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({ color, roughness: 0.7 }),
    );
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  };
  if (id === "pet-none") return group;
  const bunny = id === "pet-bunny",
    cat = id === "pet-cat",
    phoenix = id === "pet-phoenix";
  const fox = id === "pet-fox",
    owl = id === "pet-owl",
    color = fox
      ? "#efa779"
      : owl
        ? "#b7c8ee"
        : bunny
          ? "#eee0d2"
          : cat
            ? "#b0a0dd"
            : phoenix
              ? "#f2ac72"
              : "#8fe0c9";
  const body = part(new THREE.SphereGeometry(0.23, 8, 6), color, 0, 0.25);
  body.scale.set(0.8, 1.2, 0.85);
  part(new THREE.SphereGeometry(0.21, 8, 6), color, 0, 0.58, 0.04);
  for (const x of [-0.13, 0.13]) {
    if (!owl && !phoenix && !bunny)
      part(
        new THREE.ConeGeometry(0.085, 0.2, 5),
        fox ? color : "#f4d48e",
        x,
        0.79,
      );
    const wing = part(
      new THREE.SphereGeometry(0.12, 6, 4),
      owl ? "#879ac7" : color,
      x * 1.9,
      0.3,
    );
    wing.scale.set(0.4, 1.5, owl ? 1 : 0.6);
    part(new THREE.SphereGeometry(0.045, 6, 4), "#302b48", x * 0.65, 0.6, 0.22);
  }
  part(
    new THREE.ConeGeometry(0.05, 0.08, 4),
    "#f4d48e",
    0,
    0.52,
    0.24,
  ).rotation.x = Math.PI / 2;
  if (fox) {
    const tail = part(
      new THREE.ConeGeometry(0.14, 0.65, 7),
      "#fff0d6",
      0.24,
      0.25,
      -0.3,
    );
    tail.rotation.x = -0.8;
    tail.rotation.z = -0.5;
  }
  if (bunny)
    for (const x of [-0.11, 0.11]) {
      const ear = part(new THREE.SphereGeometry(0.09, 6, 6), color, x, 0.98);
      ear.scale.set(0.7, 3, 0.7);
    }
  if (cat) {
    const tail = part(
      new THREE.TorusGeometry(0.2, 0.055, 5, 12, Math.PI * 1.5),
      color,
      0.25,
      0.24,
      -0.22,
    );
    tail.rotation.y = 0.7;
    part(new THREE.OctahedronGeometry(0.08), "#ffe3a0", 0.31, 0.42, -0.22);
  }
  if (phoenix)
    for (const x of [-1, 1]) {
      const feather = part(
        new THREE.ConeGeometry(0.13, 0.6, 5),
        "#ffd28b",
        x * 0.22,
        0.4,
      );
      feather.rotation.z = x * 0.55;
      part(new THREE.ConeGeometry(0.09, 0.32, 5), "#f4cc7a", x * 0.06, 0.9);
    }
  if (!fox && !owl && !bunny && !cat && !phoenix)
    for (const x of [-1, 1]) {
      const wing = part(
        new THREE.ConeGeometry(0.26, 0.45, 3),
        "#afa3ed",
        x * 0.32,
        0.4,
        -0.07,
      );
      wing.rotation.z = x * 0.8;
      wing.scale.z = 0.16;
    }
  return group;
}

/** Keep the companion on the camera-facing side of the path, independent of hero rotation. */
export function companionPosition(hero: THREE.Vector3, heading: THREE.Vector3) {
  const side = new THREE.Vector3(heading.z, 0, -heading.x).normalize();
  return hero
    .clone()
    .addScaledVector(side, -1.05)
    .addScaledVector(heading, -0.6)
    .add(new THREE.Vector3(0, 0.06, 0));
}
