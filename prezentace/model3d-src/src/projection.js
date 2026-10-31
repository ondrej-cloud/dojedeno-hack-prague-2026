import { Vector3 } from 'three';

// Screen bounds of the actual bucket silhouette, in the canvas's CSS coordinates.
export function screenBounds(mesh, camera, width, height) {
  mesh.updateWorldMatrix(true, false);
  camera.updateMatrixWorld();
  const positions = mesh.geometry.attributes.position;
  const p = new Vector3();
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
  for (let i = 0; i < positions.count; i++) {
    p.fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld).project(camera);
    const x = (p.x + 1) * width / 2, y = (1 - p.y) * height / 2;
    left = Math.min(left, x); right = Math.max(right, x);
    top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
  return { left, top, width: right - left, height: bottom - top };
}
