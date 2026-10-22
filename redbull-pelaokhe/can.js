// Lata de Red Bull Zero (250 ml): cuerpo con la etiqueta desenrollada de las fotos,
// cuello cónico, borde, tapa con anilla y base abovedada. Radio 1; alto total ≈ 5,7.
import * as THREE from 'three';

export const CAN = {body: 4.9, neck: 0.55, base: 0.28};
CAN.height = CAN.body + CAN.neck + CAN.base;
CAN.center = (CAN.neck - CAN.base) / 2; // desplazamiento del centro visual sobre el centro del cuerpo

export function createCan(label, lid) {
  const group = new THREE.Group();
  const pivot = new THREE.Group();
  group.add(pivot);
  const metal = new THREE.MeshPhysicalMaterial({color: 0xd8dde4, metalness: 1, roughness: 0.26, clearcoat: 0.3, clearcoatRoughness: 0.2, side: THREE.DoubleSide});
  const print = new THREE.MeshPhysicalMaterial({map: label, metalness: 0.45, roughness: 0.27, clearcoat: 0.85, clearcoatRoughness: 0.12});
  const top = new THREE.MeshPhysicalMaterial({map: lid, metalness: 1, roughness: 0.3});

  // Cuerpo: la costura de la textura queda atrás (thetaStart = π) y el logo mira a +Z.
  const body = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, CAN.body, 128, 1, true, Math.PI, Math.PI * 2), print);
  pivot.add(body);

  const h = CAN.body / 2;
  const neck = [[1, 0], [0.996, 0.05], [0.965, 0.16], [0.905, 0.3], [0.876, 0.38], [0.872, 0.44], [0.89, 0.48], [0.888, 0.53], [0.862, 0.552], [0.836, 0.532], [0.83, 0.46], [0.81, 0.44]]
    .map(([r, y]) => new THREE.Vector2(r, h + y));
  pivot.add(new THREE.Mesh(new THREE.LatheGeometry(neck, 128), metal));
  const cap = new THREE.Mesh(new THREE.CircleGeometry(0.812, 96), top);
  cap.rotation.x = -Math.PI / 2;
  cap.rotation.z = Math.PI;
  cap.position.y = h + 0.44;
  pivot.add(cap);

  const base = [[0, -0.12], [0.5, -0.17], [0.74, -0.25], [0.8, -0.28], [0.86, -0.245], [0.93, -0.16], [0.99, -0.05], [1, 0]]
    .map(([r, y]) => new THREE.Vector2(r, -h + y));
  pivot.add(new THREE.Mesh(new THREE.LatheGeometry(base, 128), metal));

  return {group, pivot};
}
