'use strict';
const assert=require('node:assert/strict');
const {derive}=require('../measurement.js');
const options={tareGrams:216,subtractPlate:true,manualGross:null};
function reading(grams,confidence='high',shares=[.75,.25]){
 return {plateDetected:true,scaleReading:{visible:true,grams,confidence},components:shares.map((estimatedMassShare,i)=>({name:`Část ${i+1}`,estimatedMassShare,estimatedGrams:999}))};
}
let result=derive(reading(263),options);
assert.equal(result.gross,263);assert.equal(result.net,47);assert.equal(result.tare,216);assert.equal(result.source,'display');assert.equal(result.valid,true);
assert.deepEqual(result.components.map(c=>c.estimatedGrams),[35,12]);
result=derive(reading(263,'low'),options);
assert.equal(result.net,47);assert.equal(result.source,'estimated');assert.equal(result.valid,true);
result=derive(reading(null,'low'),options);
assert.equal(result.net,null);assert.equal(result.gross,null);assert.equal(result.valid,false);assert.equal(result.source,'missing');assert.equal(result.allocation,false);
assert(result.components.every(c=>c.estimatedGrams===null),'Missing scale data cannot retain API component gram guesses');
result=derive(reading(null,'low'),{...options,manualGross:263});
assert.equal(result.net,47);assert.equal(result.source,'manual');assert.equal(result.valid,true);
assert.equal(derive(reading(400),{...options,manualGross:263}).gross,263,'Manual correction overrides OCR');
for(const gross of [0,100,215]){
 result=derive(reading(gross),options);assert.equal(result.valid,false);assert.equal(result.net,null);assert.equal(result.reason,'below_tare');
}
result=derive(reading(216),options);
assert.equal(result.valid,true);assert.equal(result.net,0);assert.deepEqual(result.components.map(c=>c.estimatedGrams),[0,0]);
assert.equal(derive(reading(263),{...options,subtractPlate:false}).net,263);
assert.equal(derive(reading(263),{...options,tareGrams:0}).net,263);
for(const gross of [217,218,219,263,263.4,416,1716]){
 result=derive(reading(gross,'high',[.333,.333,.334]),options);
 assert.equal(result.components.reduce((sum,c)=>sum+c.estimatedGrams,0),Math.round(gross-216),'Component sum equals rounded NET food mass');
 assert(result.components.every(c=>Number.isInteger(c.estimatedGrams)&&c.estimatedGrams>=0));
}
for(const shares of [[.7,.1],[null,1],[NaN,1],[-.2,1.2],[]]){
 result=derive(reading(263,'high',shares),options);assert.equal(result.allocation,false);assert(result.components.every(c=>c.estimatedGrams===null));
}
for(const grams of [NaN,Infinity,-1,50001])assert.equal(derive(reading(grams),options).valid,false);
const original=reading(263);derive(original,options);assert.equal(original.components[0].estimatedGrams,999,'Derivation does not mutate API response');
const reference=derive(reading(416),options),leftover=derive(reading(266),options);
assert.equal(Math.round((1-leftover.net/reference.net)*100),75);
console.log('PASS measurement: gross/net tare, uncertain OCR, manual correction, zero/invalid handling and net component allocation.');
