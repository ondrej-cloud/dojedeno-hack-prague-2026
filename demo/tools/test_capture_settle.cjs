'use strict';
const assert=require('node:assert/strict'),Gate=require('../capture-settle.js');
const w=256,h=192,base=new Uint8ClampedArray(w*h*4).fill(80);
const digit=new Uint8ClampedArray(base);
// Only eight changed pixels: invisible to a whole-frame 8% motion threshold.
for(let x=120;x<124;x++)for(let y=160;y<162;y++){const i=(y*w+x)*4;digit[i]=digit[i+1]=digit[i+2]=230;}
let g=new Gate(),s;
for(let t=0;t<3000;t+=100){s=g.sample(base,w,h,t,true);assert(!s.ready);}
assert(g.sample(base,w,h,3000,true).ready);
g.reset();for(let t=0;t<7000;t+=100){s=g.sample(Math.floor(t/200)%2?digit:base,w,h,t,true);assert(!s.ready,'Changing LCD must postpone capture');}
for(let t=7000;t<8800;t+=100)assert(!g.sample(base,w,h,t,true).ready);
assert(g.sample(base,w,h,8800,true).ready);
assert(!g.sample(base,w,h,10000,true).ready,'A feed gap invalidates stable time');
g.sample(base,w,h,10100,false);
assert(!g.sample(base,w,h,10200,true).ready,'Removal starts fresh placement timer');
for(let t=10300;t<13200;t+=100)assert(!g.sample(base,w,h,t,true).ready);
assert(g.sample(base,w,h,13200,true).ready);
console.log('PASS placement delay, small LCD digit changes, stable dwell, dropped frames and removal reset.');
