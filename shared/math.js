export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
export const length = (a) => Math.hypot(a.x, a.y, a.z);
export const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
export const rotate = (v, q) => {
  const tx = 2 * (q.y * v.z - q.z * v.y);
  const ty = 2 * (q.z * v.x - q.x * v.z);
  const tz = 2 * (q.x * v.y - q.y * v.x);
  return { x: v.x + q.w * tx + q.y * tz - q.z * ty,
    y: v.y + q.w * ty + q.z * tx - q.x * tz,
    z: v.z + q.w * tz + q.x * ty - q.y * tx };
};
export function sanitizeInput(raw = {}) {
  const finite = n => typeof n === 'number' && Number.isFinite(n) ? clamp(n, -1, 1) : 0;
  let x = finite(raw.x), z = finite(raw.z);
  const magnitude = Math.hypot(x, z);
  if (magnitude > 1) { x /= magnitude; z /= magnitude; }
  return { x, z, jump: raw.jump === true, balance: raw.balance === true };
}
export const idleInput = () => ({ x: 0, z: 0, jump: false, balance: false });
