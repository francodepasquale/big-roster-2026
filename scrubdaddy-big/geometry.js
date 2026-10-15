import * as THREE from './assets/vendor/three.module.min.js';

// The silhouette and all three through-holes are traced from the supplied photos.
// This file is also used by export_models.mjs; it deliberately has no DOM dependencies.
export function spongeGeometry(data, depth = data.depth, offset = 0) {
  const outline = data.outline.map(([x,y]) => new THREE.Vector2(x,y));
  const shape = new THREE.Shape(outline);
  for (const points of data.holes) {
    shape.holes.push(new THREE.Path(points.map(([x,y]) => new THREE.Vector2(x,y))));
  }
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth, steps: 1, bevelEnabled: true,
    bevelThickness: .026, bevelSize: .019, bevelSegments: 5,
    curveSegments: 32,
    UVGenerator: {
      generateTopUV(g, vertices, a, b, c) {
        return [a,b,c].map(i => new THREE.Vector2(vertices[i*3]/2+.5, vertices[i*3+1]/2+.5));
      },
      generateSideWallUV(g, vertices, a,b,c,d) {
        const horizontal = Math.abs(vertices[a*3]-vertices[b*3]) > Math.abs(vertices[a*3+1]-vertices[b*3+1]);
        return [a,b,c,d].map(i => new THREE.Vector2(vertices[i*3+(horizontal?0:1)]*2, vertices[i*3+2]*2));
      }
    }
  });
  geometry.translate(0,0,offset-depth/2);
  geometry.computeBoundingSphere();
  return geometry;
}

export function spongeParts(data, key) {
  if (key === 'mommy') {
    return [
      {geometry:spongeGeometry(data,.35,.185),material:'mommy'},
      {geometry:spongeGeometry(data,.35,-.185),material:'resofoam'},
    ];
  }
  return [{geometry:spongeGeometry(data),material:key}];
}
