'use strict';
const assert=require('node:assert/strict');
const {findScaleDisplayBounds}=require('../scale-detail.js');
const width=320,height=180;
function frame(boxes=[]){const data=new Uint8ClampedArray(width*height*4);for(let i=0;i<data.length;i+=4){data[i]=120;data[i+1]=120;data[i+2]=120;data[i+3]=255;}for(const [x,y,w,h,color]of boxes){for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){data.set([...color,255],(yy*width+xx)*4);}}return data;}
const blue=[30,60,180],green=[30,160,65];
const lcd=findScaleDisplayBounds(frame([[80,130,38,13,blue]]),width,height);
assert(lcd);assert(lcd.x*width<80);assert((lcd.x+lcd.width)*width>118);
assert(lcd.y*height<130);assert((lcd.y+lcd.height)*height>143);
assert.equal(findScaleDisplayBounds(frame(),width,height),null);
assert.equal(findScaleDisplayBounds(frame([[80,130,38,13,green]]),width,height),null);
assert.equal(findScaleDisplayBounds(frame([[80,20,38,13,blue]]),width,height),null);
assert.equal(findScaleDisplayBounds(frame([[30,130,200,13,blue]]),width,height),null);
assert.equal(findScaleDisplayBounds(frame([[80,100,38,13,blue],[180,140,38,13,blue]]),width,height),null);
console.log('PASS scale-detail: lower LCD with unit padding; no-blue/top/oversized/ambiguous fallback');
