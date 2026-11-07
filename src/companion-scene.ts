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
  const fox = id === "pet-fox",
    owl = id === "pet-owl",
    color = fox ? "#efa779" : owl ? "#b7c8ee" : "#8fe0c9";
  const body = part(new THREE.SphereGeometry(0.23, 8, 6), color, 0, 0.25);
  body.scale.set(0.8, 1.2, 0.85);
  part(new THREE.SphereGeometry(0.21, 8, 6), color, 0, 0.58, 0.04);
  for (const x of [-0.13, 0.13]) {
    if (!owl)
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
  if (!fox && !owl)
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
