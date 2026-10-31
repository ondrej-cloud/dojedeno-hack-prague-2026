/* Same-frame detail for OCR. Blue LCD detection is only a crop heuristic;
 * it never reads digits or supplies a weight. Other displays use a broad crop. */
(function(root){
 'use strict';
 function findScaleDisplayBounds(rgba,width,height){
  const start=Math.floor(height*.45), rows=[];
  for(let y=start;y<height;y++){
   let count=0,min=width,max=-1;
   for(let x=0;x<width;x++){
    const i=(y*width+x)*4,r=rgba[i],g=rgba[i+1],b=rgba[i+2];
    if(b>70&&b-r>18&&b>g*1.02&&b-Math.min(r,g)>25){count++;min=Math.min(min,x);max=x;}
   }
   if(count>=Math.max(3,Math.ceil(width*.009)))rows.push({y,count,min,max});
  }
  const bands=[];
  for(const row of rows){
   let band=bands[bands.length-1];
   if(!band||row.y-band.bottom>3){band={top:row.y,bottom:row.y,left:row.min,right:row.max,count:0};bands.push(band);}
   band.bottom=row.y;band.left=Math.min(band.left,row.min);band.right=Math.max(band.right,row.max);band.count+=row.count;
  }
  const candidates=bands.filter(b=>{
   const w=b.right-b.left+1,h=b.bottom-b.top+1,aspect=w/h;
   return w>=width*.05&&w<=width*.45&&h>=Math.max(3,height*.018)&&h<=height*.18&&
    aspect>=1.5&&aspect<=7&&b.count/(w*h)>=.07&&(b.top+b.bottom)/2>=height*.5;
  }).sort((a,b)=>b.count-a.count);
  if(!candidates.length||(candidates[1]&&candidates[1].count>candidates[0].count*.65))return null;
  const b=candidates[0],w=b.right-b.left+1,h=b.bottom-b.top+1;
  // Include the tiny unit, decimal point and bezel around the coloured pixels.
  const left=Math.max(0,b.left-w*.55),top=Math.max(0,b.top-h*.75);
  const right=Math.min(width,b.right+1+w*.65),bottom=Math.min(height,b.bottom+1+h*.75);
  return {x:left/width,y:top/height,width:(right-left)/width,height:(bottom-top)/height};
 }
 function makeScaleDetail(source){
  if(!source||!source.width||!source.height)return null;
  const probe=document.createElement('canvas');probe.width=Math.min(320,source.width);
  probe.height=Math.max(1,Math.round(source.height*probe.width/source.width));
  const ctx=probe.getContext('2d',{willReadFrequently:true});ctx.drawImage(source,0,0,probe.width,probe.height);
  let bounds=null;
  try{bounds=findScaleDisplayBounds(ctx.getImageData(0,0,probe.width,probe.height).data,probe.width,probe.height);}catch{}
  const focused=!!bounds;bounds=bounds||{x:0,y:.45,width:1,height:.55};
  const x=Math.floor(bounds.x*source.width),y=Math.floor(bounds.y*source.height);
  const w=Math.min(source.width-x,Math.ceil(bounds.width*source.width)),h=Math.min(source.height-y,Math.ceil(bounds.height*source.height));
  const scale=Math.min(focused?3:2,1280/w),detail=document.createElement('canvas');
  detail.width=Math.max(1,Math.round(w*scale));detail.height=Math.max(1,Math.round(h*scale));
  detail.getContext('2d').drawImage(source,x,y,w,h,0,0,detail.width,detail.height);
  detail.scaleDetail={focused,sourceRect:{x,y,width:w,height:h}};
  return detail;
 }
 root.makeScaleDetail=makeScaleDetail;
 if(typeof module!=='undefined'&&module.exports)module.exports={findScaleDisplayBounds};
})(typeof globalThis!=='undefined'?globalThis:this);
