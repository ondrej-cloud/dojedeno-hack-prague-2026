'use strict';
const assert = require('node:assert/strict');
const PlatePresence = require('../presence.js');
const W=40,H=30;
function frame({fraction=0, shift=0, offset=0, object=205}={}) {
  const data=new Uint8ClampedArray(W*H*4);
  for(let p=0;p<W*H;p++) {
    const foreground=p>=offset&&p<offset+Math.round(fraction*W*H);
    const value=(foreground?object:70)+shift;
    data.set([value,value,value,255],p*4);
  }
  return data;
}
const empty=frame(), plate=frame({fraction:.3});
function run(detector, image, start, end, increment=100) {
  const results=[];
  for(let t=start;t<=end;t+=increment)results.push(detector.sample(image,W,H,t));
  return results;
}
function ready(){const d=new PlatePresence();const r=run(d,empty,0,2000);assert.equal(r.at(-1).state,'empty');assert.equal(r[0].calibrationProgress,0);return d;}
{
  const d=ready();
  const r=run(d,plate,2100,8000);
  assert.equal(r.filter(s=>s.event==='arrived').length,1,'held plate must arrive once');
  assert.equal(r[0].event,null,'moving entry is not immediately accepted');
  assert.equal(r.at(-1).state,'present');
  assert.equal(r.at(-1).coverage,.3);
  const gone=run(d,empty,8100,10000);
  assert.equal(gone.filter(s=>s.event==='removed').length,1,'removal happens once');
  const again=run(d,plate,10100,13000);
  assert.equal(again.filter(s=>s.event==='arrived').length,1,'second plate triggers after removal');
}
{
  const d=ready();
  const hand=run(d,plate,2100,2600);
  const after=run(d,empty,2700,5000);
  assert(![...hand,...after].some(s=>s.event),'brief hand must not trigger');
}
{
  const d=ready(), results=[];
  for(let t=2100;t<=5100;t+=100)results.push(d.sample(frame({fraction:.3,offset:t%200===0?0:600}),W,H,t));
  assert(!results.some(s=>s.event),'continuous large motion must not trigger');
}
{
  const d=ready();
  assert(!run(d,frame({shift:20}),2100,5000).some(s=>s.event),'mild exposure change is ignored');
  assert(run(d,frame({fraction:.3,shift:20}),5100,7000).some(s=>s.event==='arrived'),'plate remains detectable after exposure change');
}
{
  const d=ready();
  assert(!run(d,frame({fraction:.1}),2100,5000).some(s=>s.event),'small background changes below arrival threshold are ignored');
  run(d,plate,5100,7000);
  assert(!run(d,frame({fraction:.12}),7100,10000).some(s=>s.event==='removed'),'hysteresis retains partially occluded plate');
}
{
  const d=ready();run(d,plate,2100,4000);
  assert(!run(d,empty,4100,4500).some(s=>s.event==='removed'),'brief occlusion cannot rearm');
  assert(!run(d,plate,4600,7000).some(s=>s.event),'return after brief occlusion must not duplicate');
}
{
  const d=new PlatePresence();run(d,empty,0,1000);
  assert.equal(d.sample(plate,W,H,1100).calibrationProgress,0,'motion restarts calibration');
  assert.equal(d.sample(empty,W,H,1200).calibrationProgress,0);
  assert.equal(run(d,empty,1300,3200).at(-1).state,'empty');
  d.reset();assert.equal(d.sample(empty,W,H,3300).state,'calibrating');
  assert.equal(d.sample(empty,W,H,0).calibrationProgress,0,'clock reset restarts calibration');
}
{
  const a=ready(), b=ready();
  for(let t=2100;t<5000;t+=100)assert.deepEqual(a.sample(plate,W,H,t),b.sample(plate,W,H,t),'same frames and times are deterministic');
  assert.throws(()=>a.sample(empty,W+1,H,5000),TypeError);
  assert.throws(()=>new PlatePresence({presenceCoverage:.05}),RangeError);
}
{
  const d=ready();
  const arrivals=run(d,plate,2200,5000,200);
  assert.equal(arrivals.filter(s=>s.event==='arrived').length,1,'5 fps arrival works');
  const gone=run(d,empty,5200,7000,200);
  assert.equal(gone.filter(s=>s.event==='removed').length,1,'5 fps removal works');
}
{
  const d=ready(), results=[];
  for(let t=2200,offset=0;t<=8000;t+=200,offset+=20) {
    const noisy=frame({fraction:.3,offset:offset%600});
    for(let p=0;p<noisy.length;p+=4)for(let c=0;c<3;c++)noisy[p+c]+=((p+t+c)%9)-4;
    results.push(d.sample(noisy,W,H,t));
  }
  assert(!results.some(s=>s.event==='arrived'),'slow continuous movement at 5 fps must not look stationary');
}
// Tracking uses the entire frame independently of the arrival threshold.
function rectangle(data,x,y,width,height,value=205) {
  for(let yy=y;yy<y+height;yy++)for(let xx=x;xx<x+width;xx++) {
    data.set([value,value,value,255],(yy*W+xx)*4);
  }
  return data;
}
{
  const d=ready();
  assert.equal(d.sample(empty,W,H,2100).bounds,null,'empty scene has no bounds');
  const left=rectangle(frame(),3,6,10,9);
  const result=d.sample(left,W,H,2200);
  assert.equal(result.state,'empty','tracking works below the 16% trigger threshold');
  assert.deepEqual(result.bounds,{x:3/W,y:6/H,width:10/W,height:9/H});
  const right=rectangle(frame(),26,7,10,9);
  assert.deepEqual(d.sample(right,W,H,2300).bounds,{x:26/W,y:7/H,width:10/W,height:9/H});
  const large=rectangle(frame(),5,4,20,16);
  assert.deepEqual(d.sample(large,W,H,2400).bounds,{x:5/W,y:4/H,width:20/W,height:16/H});
  assert.equal(d.sample(empty,W,H,2500).bounds,null);
  d.reset();assert.equal(d.sample(empty,W,H,2600).bounds,null,'calibration has no bounds');
}
{
  const d=ready();
  const noisy=rectangle(frame(),15,10,10,10);
  for(const [x,y] of [[1,1],[38,1],[1,28],[38,28]])rectangle(noisy,x,y,1,1);
  assert.deepEqual(d.sample(noisy,W,H,2100).bounds,{x:15/W,y:10/H,width:10/W,height:10/H},'isolated noise must not enlarge bounds');
  const justNoise=frame();
  for(let y=1;y<H;y+=5)for(let x=1;x<W;x+=5)rectangle(justNoise,x,y,1,1);
  assert.equal(d.sample(justNoise,W,H,2200).bounds,null,'isolated noise has no bounds');
  assert.equal(d.sample(rectangle(frame(),5,5,3,3),W,H,2300).bounds,null,'component under 1% is rejected');
  assert.equal(d.sample(rectangle(frame(),5,5,2,20),W,H,2400).bounds,null,'thin line is rejected');
}
{
  const d=ready(), two=rectangle(rectangle(frame(),2,3,5,5),20,10,12,10);
  assert.deepEqual(d.sample(two,W,H,2100).bounds,{x:20/W,y:10/H,width:12/W,height:10/H},'largest component wins');
  const exposed=rectangle(frame({shift:20}),20,10,12,10,225);
  assert.deepEqual(d.sample(exposed,W,H,2200).bounds,{x:20/W,y:10/H,width:12/W,height:10/H},'bounds reuse exposure compensation');
}
{
  const d=ready(), small=rectangle(frame(),20,10,4,4);
  const samples=run(d,small,2100,10000);
  assert.deepEqual(samples.at(-1).bounds,{x:20/W,y:10/H,width:4/W,height:4/H},'small tracked object must not be absorbed into the background');
}
console.log('PASS: calibration, stationary arrivals, repeat prevention, removal/rearming, hand/motion rejection, exposure tolerance, hysteresis, reset, deterministic output and exposure-compensated connected-component bounds');
