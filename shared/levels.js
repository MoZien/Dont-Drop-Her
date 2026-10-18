const platform = (id, x, z, w, d, options = {}) => ({
  id, x, y: -0.25, z, w, h: 0.5, d, ...options,
});
const obstacle = (id, type, x, z, options = {}) => ({ id, type, x, y: 0.65, z, w: 1, h: 1.3, d: 1, ...options });
const pads = [{ x: -1.12, z: 11.5 }, { x: 1.12, z: 11.5 }];
const base = (i, title, subtitle, tip, theme, surfaces, obstacles, options = {}) => ({
  id: i, title, subtitle, tip, theme, length: 66, spawn: { x: 0, z: 2 },
  checkpoints: [16.2, 24, 46], pads, gateZ: 14.3, finish: 62,
  difficulty: ['Warm-up','Tricky','Challenging','Expert','Expert'][i] || 'Master',
  surfaces, obstacles, wind: 0, friction: 0.85, ...options,
});
export const LEVELS = [
  base(0, 'Love Garden', 'Every great love starts with a small step.',
    'Walk together. Hold Shift / Balance to calm the heart. Stand on both glowing circles to open the arch.',
    { sky: '#c6e8e1', fog: '#d9eee7', land: '#7ebfa0', path: '#eadbb8', accent: '#ff819c', dark: '#325b56', water: '#75bdd2' },
    [platform('start', 0, 6, 7.4, 16), platform('garden-bridge', 0, 18, 4.2, 8),
      platform('first-rest', 0, 27, 6, 10), platform('floating', 0, 34, 3.9, 4.8, { motion: { axis: 'x', amplitude: 1.05, speed: 0.8 } }),
      platform('slope', 0, 40.7, 5.5, 8.6, { tilt: -0.055 }), platform('final-rest', 0, 54, 7.4, 19)],
    [obstacle('pot-left', 'pot', -2.45, 25, { w: 1.1 }), obstacle('pot-right', 'pot', 2.4, 29),
      obstacle('garden-sweeper', 'roller', 0, 43, { w: 4.7, h: .48, d: .48, y: .48, motion: { axis: 'z', amplitude: .6, speed: 1 } }),
      obstacle('garden-bumper', 'bumper', 0, 51, { w: .8, h: 1, d: .8, motion: { axis: 'x', amplitude: 2.7, speed: 1.1 } })]),
  base(1, 'Crazy Kitchen', 'Small people. Big feelings. Giant cutlery.',
    'The puddles are slippery. Wait for the rolling pin, then cross together. Jump the little gaps at the same time.',
    { sky: '#f7d6b7', fog: '#fae6cc', land: '#bd8871', path: '#f4dda9', accent: '#fa9069', dark: '#754b4c', water: '#e8b172' },
    [platform('counter', 0, 7, 8, 18), platform('cutting-board', 0, 22, 6.5, 10),
      platform('turntable', 0, 31, 6.1, 7, { spin: 0.2 }), platform('sponge', 0, 39, 5.3, 6.4, { motion: { axis: 'y', amplitude: 0.3, speed: 0.8 } }),
      platform('sink-bridge', 0, 44.6, 4.1, 5), platform('dessert', 0, 55, 8, 19)],
    [obstacle('rolling-pin', 'roller', 0, 22, { w: 5.2, h: 0.65, d: 0.75, y: 0.6, motion: { axis: 'z', amplitude: 1.6, speed: 1.05 } }),
      obstacle('spoon', 'spoon', -2.3, 36, { w: 0.65, h: 2.4, d: 1.1, motion: { axis: 'x', amplitude: 1.2, speed: 0.65 } }),
      obstacle('sugar', 'bumper', 2.3, 54, { motion: { axis: 'x', amplitude: 1.4, speed: 1.1 } })],
    { slippery: [{ z: 7, d: 3 }, { z: 51, d: 4 }], heavy: { from: 27, to: 35 }, wind: .6 }),
  base(2, 'Broken Bridge', 'A leap of faith, with someone at your side.',
    'Watch the wind. Jump together across missing planks. The golden boards collapse if you linger.',
    { sky: '#c2d8f7', fog: '#e0e9ff', land: '#849dcc', path: '#d8b78c', accent: '#aa93fa', dark: '#4b5e85', water: '#b0cdf1' },
    [platform('cloud-start', 0, 6, 7, 16), platform('rope-bridge', 0, 18.4, 4.2, 7.8, { sway: 0.045 }),
      platform('landing', 0, 26.3, 6, 7), platform('fragile-a', 0, 32.8, 4.4, 4.9, { collapse: true }),
      platform('fragile-b', 0, 38.5, 4.4, 4.9, { collapse: true }), platform('cloud-rest', 0, 44.5, 6, 6),
      platform('last-bridge', 0, 50.8, 4.1, 5.5, { sway: 0.075 }), platform('cloud-end', 0, 59, 7, 11)],
    [obstacle('cloud-bell', 'pendulum', 0, 48.5, { w: 0.85, h: 1.1, d: 0.85, motion: { axis: 'x', amplitude: 2.5, speed: 0.85 } })], { wind: 3.8 }),
  base(3, 'Ice of Love', 'Cold toes. Warm hearts.',
    'Short steps on the ice. Balance together to brake. Let snowballs pass before you cross.',
    { sky: '#b8dcec', fog: '#d8edf4', land: '#c6e6ed', path: '#a9e0eb', accent: '#69b9dd', dark: '#417c97', water: '#68aec9' },
    [platform('ice-start', 0, 6, 8, 16), platform('frozen-bridge', 0, 18.4, 4.5, 8), platform('snow-rest', 0, 27, 7, 9),
      platform('ice-float', 0, 34, 5, 4.7, { motion: { axis: 'x', amplitude: 1, speed: 0.65 } }),
      platform('ice-float-b', 0, 40, 5, 6, { motion: { axis: 'y', amplitude: 0.15, speed: 0.85 } }),
      platform('ice-end', 0, 54, 7.5, 21)],
    [obstacle('snowball-a', 'snowball', 0, 25.5, { w: 1.35, h: 1.35, d: 1.35, y: 0.75, motion: { axis: 'x', amplitude: 4.1, speed: 0.9 } }),
      obstacle('snowball-b', 'snowball', 0, 50, { w: 1.3, h: 1.3, d: 1.3, motion: { axis: 'x', amplitude: 4.2, speed: 1.15 } })], { wind: 2.5, friction: 0.06 }),
  base(4, 'Heart Castle', 'A royal test of timing and trust.',
    'Keep your rhythm through the clockwork gates. Carry the heart together onto the glowing pedestal.',
    { sky: '#303453', fog: '#66618f', land: '#897baa', path: '#c8b6d9', accent: '#fcaacb', dark: '#383455', water: '#796eb0' },
    [platform('castle-start', 0, 6, 8, 16),platform('castle-entry',0,16.1,6,4.5), platform('clockwork', 0, 22.2, 6.4, 11, { spin: 0.14 }),
      platform('castle-rest', 0, 29, 7, 5), platform('magic-lift', 0, 35.5, 5, 6.5, { motion: { axis: 'y', amplitude: 0.35, speed: 0.7 } }),
      platform('pendulum-bridge', 0, 42.5, 5.2, 6), platform('ballroom', 0, 54.5, 8, 20)],
    [obstacle('rotating-trap', 'spinner', 0, 22, { w: 4.8, h: 0.45, d: 0.45, y: 0.7, spin: 0.8 }),
      obstacle('castle-pendulum', 'pendulum', 0, 42.2, { w: 1, h: 1.1, d: 1, motion: { axis: 'x', amplitude: 2.2, speed: 1.05 } }),
      obstacle('timed-gate', 'timedGate', 0, 52, { w: 7.5, h: 2.4, d: 0.4, y: 1.2, period: 7 })], { wind: 1.1 }),
  base(5, 'Clockwork Carnival', 'Find your rhythm. Keep your person.',
    'Moving belts push sideways. Cross the carousel together, then wait for the brass gates to rise.',
    { sky:'#f1c4b8',fog:'#f7dcba',land:'#bd83ac',path:'#edcf9b',accent:'#de6688',dark:'#61456f',water:'#a390c5',kind:'carnival' },
    [platform('fairground',0,6,7,16),platform('carnival-entry',0,17,5.2,5),platform('entry-belt',0,22.2,4,4.6,{conveyor:{x:.9,z:0}}),
      platform('carousel',0,27,5.4,6,{spin:.42}),platform('ticket-rest',0,33,6,6),
      platform('left-belt',-.8,40,3.8,7,{conveyor:{x:-1.1,z:.3}}),platform('right-belt',.8,47.8,3.8,7),
      platform('return-belt',0,54.5,4.2,5.8,{conveyor:{x:.8,z:-.6}}),platform('carnival-rest',0,61,6,7),
      platform('grand-carousel',0,68.4,5,6.6,{spin:-.4}),platform('curtain-call',0,77.5,7,11)],
    [obstacle('carnival-arm','spinner',0,27,{w:4.5,h:.45,d:.45,y:.55,spin:1.05}),
      obstacle('brass-gate','timedGate',0,60,{w:5.8,h:2.4,d:.45,y:1.2,period:6,duty:.52}),
      obstacle('metronome','pendulum',0,69,{w:.85,h:1,d:.85,motion:{axis:'x',amplitude:2.4,speed:1.25}})],
    {length:84,finish:80,checkpoints:[16.2,32,58],wind:2.8,route:[{z:34,x:0},{z:39,x:-.8},{z:43,x:-.8},{z:47,x:.8},{z:50,x:.8},{z:54,x:0}]}),
  base(6, 'Volcano Vows', 'Some promises are forged in fire.',
    'Read the steam vents: glowing means wait. Cross cooled stones quickly and jump the broken basalt together.',
    {sky:'#553f52',fog:'#a56c6d',land:'#594f63',path:'#8b7c80',accent:'#ffac64',dark:'#3b344d',water:'#f47742',kind:'volcano'},
    [platform('basalt-start',0,6,7.5,16),platform('lava-causeway',0,19.5,4,10),platform('first-crater',0,29.5,6,9),
      platform('cooling-stone-a',0,37.2,3.8,5.1,{collapse:true}),platform('cooling-stone-b',0,43.6,3.8,5.1,{collapse:true}),
      platform('basalt-ferry',0,50.3,4.5,6.8,{motion:{axis:'x',amplitude:.85,speed:.75}}),
      platform('vent-rest',0,58.5,6.6,8.5),platform('ember-bridge',0,67,3.7,7,{sway:.055}),platform('vow-sanctuary',0,77,7,12)],
    [obstacle('steam-a','geyser',0,27,{w:4.9,h:1.7,d:1,y:.85,period:6.5,duty:.56,phase:1}),
      obstacle('steam-b','geyser',0,60.5,{w:5.7,h:1.7,d:1,y:.85,period:6.8,duty:.6,phase:2}),
      obstacle('ember-boulder','snowball',0,68,{w:1.1,h:1.1,d:1.1,y:.65,motion:{axis:'x',amplitude:3.3,speed:1.2}})],
    {length:84,finish:80,checkpoints:[16.2,32,58],wind:4.2}),
  base(7, 'Starlight Observatory', 'Carry your love beyond the ordinary.',
    'Follow the drifting star bridges. Time both light gates, then place your heart beneath the constellations.',
    {sky:'#171e3e',fog:'#444970',land:'#727baf',path:'#c5cee8',accent:'#8de0e3',dark:'#303953',water:'#414d80',kind:'observatory'},
    [platform('starlight-dock',0,6,7.5,16),platform('orbit-entry',0,19.5,4.2,10),platform('observatory-rest',0,29,6.2,8),
      platform('orbit-a',-.6,37,4.1,6.5,{motion:{axis:'x',amplitude:.85,speed:.7}}),
      platform('orbit-b',.6,44.5,4.1,6.5,{motion:{axis:'x',amplitude:.85,speed:.7,phase:Math.PI}}),
      platform('lunar-turntable',0,52.1,5.2,6.5,{spin:-.28}),platform('star-rest',0,59.3,6.4,8),
      platform('last-orbit',0,67.7,4,7.2,{motion:{axis:'y',amplitude:.23,speed:.9}}),platform('forever-platform',0,77.3,7.6,11)],
    [obstacle('light-gate-a','timedGate',0,27,{w:5.9,h:2.4,d:.4,y:1.2,period:6,duty:.5}),
      obstacle('stellar-arm','spinner',0,52,{w:4.5,h:.4,d:.4,y:.6,spin:1.15}),
      obstacle('light-gate-b','timedGate',0,60.8,{w:6.2,h:2.4,d:.4,y:1.2,period:6.4,duty:.52,phase:2.4}),
      obstacle('star-pendulum','pendulum',0,68,{w:.85,h:1,d:.85,motion:{axis:'x',amplitude:2.2,speed:1.4}})],
    {length:84,finish:80,checkpoints:[16.2,32,58],wind:3.2,route:[{z:33,x:0},{z:36,x:-.6},{z:39.5,x:-.6},{z:43,x:.6},{z:47,x:.6},{z:51,x:0}]}),
];

export function passageOpen(def,time) { return (time+(def.phase||0))%def.period < def.period*(def.duty??.58); }
export function routeCenter(level,z) {
  const route=level.route;if(!route?.length)return 0;
  if(z<=route[0].z)return route[0].x;
  for(let i=1;i<route.length;i++)if(z<=route[i].z){const a=route[i-1],b=route[i];return a.x+(b.x-a.x)*(z-a.z)/(b.z-a.z);}
  return route.at(-1).x;
}

export function poseAt(def, time, collapseAt = null) {
  const position = { x: def.x, y: def.y, z: def.z };
  if (def.motion) position[def.motion.axis] += Math.sin(time * def.motion.speed+(def.motion.phase||0)) * def.motion.amplitude;
  if (def.collapse && collapseAt !== null) position.y -= Math.min(8, Math.max(0, time - collapseAt - 3.8) * 3);
  if (def.type === 'timedGate') position.y += passageOpen(def,time) ? 3.5 : 0;
  if (def.type === 'geyser') position.y -= passageOpen(def,time) ? 3 : 0;
  const angle = def.spin ? time * def.spin : (def.tilt || 0) + (def.sway ? Math.sin(time * 0.8) * def.sway : 0);
  return { position, rotation: def.spin ? { x: 0, y: Math.sin(angle / 2), z: 0, w: Math.cos(angle / 2) } : { x: Math.sin(angle / 2), y: 0, z: 0, w: Math.cos(angle / 2) } };
}
