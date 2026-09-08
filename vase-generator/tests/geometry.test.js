import test from 'node:test';
import assert from 'node:assert/strict';
import { createVase } from '../geometry.js';
import { resetProfile, state } from '../state.js';
function getBounds(group) {
  let minY = Infinity;
  let maxY = -Infinity;
  let maxRadius = 0;
  group.traverse((child) => {
    if (!child.isMesh || !child.geometry?.attributes?.position) {
      return;
    }
    const positions = child.geometry.attributes.position;
    for (let i = 0; i < positions.count; i += 1) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      minY = Math.min(minY, y + child.position.y);
      maxY = Math.max(maxY, y + child.position.y);
      maxRadius = Math.max(maxRadius, Math.sqrt(x * x + z * z));
    }
  });
  return { minY, maxY, maxRadius };
}
test('createVase uses height and wall thickness in its geometry', () => {
  resetProfile();
  state.height = 220;
  state.wallThickness = 3;
  const first = createVase();
  const firstBounds = getBounds(first);
  state.height = 320;
  state.wallThickness = 6;
  const second = createVase();
  const secondBounds = getBounds(second);
  assert.ok(secondBounds.maxY > firstBounds.maxY, 'higher height should increase the geometry height');
  assert.ok(secondBounds.maxRadius >= firstBounds.maxRadius * 0.95, 'greater wall thickness should preserve a stable printable shell');
});
