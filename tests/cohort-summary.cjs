const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
function load(path,deps={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,require:n=>deps[n]});return exports;}
const segmentation=load('src/lib/segmentation.ts');
const {average,cohorts}=load('src/lib/cohort-summary.ts',{'./segmentation':segmentation});
const rows=[{SessionId:'a',patientAge:'29 Y',activePercent:75.3},{SessionId:'b',patientAge:'21 Y'},{SessionId:'c',patientAge:'25 Y'}];
assert.equal(average(rows,'activePercent'),75.3);
const groups=cohorts(rows,'ageGroup','activePercent');
assert.equal(groups.find(g=>g.measured===1).value,average(rows,'activePercent'));
assert.equal(groups.find(g=>g.measured===0).value,null);
assert.equal(average([{activePercent:0},{}],'activePercent'),0);
assert.equal(average([{}, {activePercent:NaN}],'activePercent'),null);
assert.equal(average([{activePercent:50},{activePercent:100},{}],'activePercent'),75);
console.log('Shared mean, missing-versus-zero, and cohort consistency checks passed.');
