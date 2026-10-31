/* Project object center through object-fit: contain, then draw a true circle. */
(function(root){
 'use strict';
 function projectPlateBounds(bounds,sourceWidth,sourceHeight,boxWidth,boxHeight){
  if(!bounds||![sourceWidth,sourceHeight,boxWidth,boxHeight].every(n=>Number.isFinite(n)&&n>0))return null;
  const scale=Math.min(boxWidth/sourceWidth,boxHeight/sourceHeight);
  const width=bounds.width*sourceWidth*scale,height=bounds.height*sourceHeight*scale;
  const diameter=Math.max(width,height);
  const centerX=(bounds.x+bounds.width/2)*sourceWidth*scale-(sourceWidth*scale-boxWidth)/2;
  const centerY=(bounds.y+bounds.height/2)*sourceHeight*scale-(sourceHeight*scale-boxHeight)/2;
  return {left:centerX-diameter/2,top:centerY-diameter/2,width:diameter,height:diameter};
 }
 root.projectPlateBounds=projectPlateBounds;
 if(typeof module!=='undefined'&&module.exports)module.exports=projectPlateBounds;
})(typeof globalThis!=='undefined'?globalThis:this);
