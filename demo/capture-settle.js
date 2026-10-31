/* Wait for placement and local image stability before an automatic snapshot.
 * Small display changes must not disappear in a whole-frame motion average.
 * This checks pixels, not physical scale stability or semantic hand presence. */
(function(root){
 'use strict';
 class CaptureSettle {
  constructor(options={}){this.options={minimumMs:3000,stableMs:2000,maxGapMs:700,minFrames:8,pixelDelta:22,tileSize:8,...options};this.reset();}
  reset(){this.started=null;this.stableSince=null;this.lastTime=null;this.previous=null;this.anchor=null;this.frames=0;this.width=0;this.height=0;}
  changed(frame,reference,w,h){
   const o=this.options;
   for(let y=0;y<h;y+=o.tileSize)for(let x=0;x<w;x+=o.tileSize){
    let count=0,total=0;
    for(let yy=y;yy<Math.min(h,y+o.tileSize);yy++)for(let xx=x;xx<Math.min(w,x+o.tileSize);xx++){
     const i=(yy*w+xx)*4;total++;
     if((Math.abs(frame[i]-reference[i])+Math.abs(frame[i+1]-reference[i+1])+Math.abs(frame[i+2]-reference[i+2]))/3>=o.pixelDelta)count++;
    }
    if(count>=Math.max(4,Math.ceil(total*.08)))return true;
   }
   return false;
  }
  sample(frame,w,h,now,present){
   if(!present){this.reset();return {ready:false,remainingMs:this.options.minimumMs,moving:false};}
   if(this.lastTime!==null&&(now-this.lastTime>this.options.maxGapMs||now<this.lastTime)||w!==this.width||h!==this.height)this.reset();
   this.width=w;this.height=h;this.lastTime=now;
   if(this.started===null){this.started=now;this.stableSince=now;this.anchor=new Uint8ClampedArray(frame);}
   const moving=!!this.previous&&(this.changed(frame,this.previous,w,h)||this.changed(frame,this.anchor,w,h));
   if(moving){this.stableSince=now;this.anchor=new Uint8ClampedArray(frame);this.frames=0;}
   this.previous=new Uint8ClampedArray(frame);this.frames++;
   const remainingMs=Math.max(0,this.options.minimumMs-(now-this.started),this.options.stableMs-(now-this.stableSince));
   return {ready:remainingMs===0&&this.frames>=this.options.minFrames,remainingMs,moving};
  }
 }
 root.CaptureSettle=CaptureSettle;
 if(typeof module!=='undefined'&&module.exports)module.exports=CaptureSettle;
})(typeof globalThis!=='undefined'?globalThis:this);
