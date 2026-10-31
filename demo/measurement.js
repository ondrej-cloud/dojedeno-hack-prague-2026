/* Gross display readings and plate tare are independent of visual food estimates. */
(function(root){
 'use strict';
 function derive(result,options={}){
  const tare=options.subtractPlate===false?0:(Number.isFinite(options.tareGrams)&&options.tareGrams>=0?options.tareGrams:216);
  const reading=result?.scaleReading;
  const manual=Number.isFinite(options.manualGross)&&options.manualGross>=0&&options.manualGross<=50000;
  const read=reading?.visible&&Number.isFinite(reading.grams)&&reading.grams>=0&&reading.grams<=50000;
  const gross=manual?options.manualGross:read?reading.grams:null;
  const source=manual?'manual':read?(reading.confidence==='low'?'estimated':'display'):'missing';
  const valid=gross!==null&&gross>=tare;
  const net=valid?Math.round((gross-tare)*1000)/1000:null;
  const components=(result?.components||[]).map(c=>({...c,estimatedGrams:null}));
  const shares=components.map(c=>c.estimatedMassShare),totalShare=shares.reduce((a,b)=>a+(Number.isFinite(b)?b:0),0);
  const allocation=valid&&shares.length>0&&shares.every(s=>Number.isFinite(s)&&s>=0&&s<=1)&&totalShare>=.98&&totalShare<=1.02;
  if(allocation){
   const total=Math.round(net),raw=shares.map(s=>s/totalShare*total),grams=raw.map(Math.floor);
   const ranked=grams.map((_,i)=>i).sort((a,b)=>(raw[b]-grams[b])-(raw[a]-grams[a]));
   for(let i=0;i<total-grams.reduce((a,b)=>a+b,0);i++)components[ranked[i]].roundUp=true;
   components.forEach((c,i)=>{c.estimatedGrams=grams[i]+(c.roundUp?1:0);delete c.roundUp;});
  }
  return {gross,net,tare,source,valid,reason:gross===null?'missing':valid?null:'below_tare',components,allocation};
 }
 root.PlateMeasurement={derive};
 if(typeof module!=='undefined'&&module.exports)module.exports={derive};
})(typeof globalThis!=='undefined'?globalThis:this);
