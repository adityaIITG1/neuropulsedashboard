const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(path, dependencies = {}, extra = {}) {
 const exports = {};
 const code = ts.transpileModule(fs.readFileSync(path,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 vm.runInNewContext(code, {exports, require:name=>dependencies[name] || require(name), Buffer, AbortSignal, URL, process:{env:{}}, ...extra});
 return exports;
}
const {distribution,cumulative,metricPresent} = load('src/lib/research-statistics.ts');
assert.equal(distribution([]),null);
assert.equal(distribution([1,2,3,4]).median,2.5);
assert.equal(distribution([1,2,3,4]).q1,1.75);
assert.equal(distribution([1,1,1,1,100]).outliers.join(','),'100');
assert.equal(cumulative([1,1,2])[0].percent,2/3*100);
assert.equal(metricPresent({activePercent:0},'activePercent'),true);
assert.equal(metricPresent({},'activePercent'),false);
const {matchesSegment,categoryValue,reviewFlags} = load('src/lib/segmentation.ts');
const report = {SessionId:'real-uuid',patientAge:'21 Y',patientGender:'Male',muscle:'Biceps',condition:'Recorded condition',activeTimeSec:45.2,activePercent:75.3,peakActiveEnvelope:120,averageActiveEnvelope:18.75,activityGrade:4,longestEpisodeSec:12,graphValues:[{}]};
assert.equal(categoryValue(report,'ageGroup'),'18–25');
assert.equal(categoryValue({...report,patientAge:undefined},'ageGroup'),'Not recorded');
assert.equal(categoryValue({...report,condition:undefined},'condition'),'Not recorded');
assert.equal(matchesSegment(report,{condition:'Recorded condition',activeTimeSec_min:'45',activeTimeSec_max:'46',longestEpisodeSec_min:'12'}),true);
assert.equal(matchesSegment(report,{longestEpisodeSec_min:'13'}),false);
assert.equal(matchesSegment({...report,longestEpisodeSec:undefined},{longestEpisodeSec_min:'0'}),false);
assert.equal(matchesSegment(report,{patientGender:'Female'}),false);
assert.equal(matchesSegment(report,{id:'UUID'}),true);
assert.equal(reviewFlags({...report,activePercent:110}).some(f=>f.includes('Invalid')),true);
assert.equal(reviewFlags({...report,activeTimeSec:0,activePercent:0}).some(f=>f.includes('Invalid')),false);
assert.equal(matchesSegment({...report,affectedSide:'Left',side:'Right',patientCondition:'Stroke',condition:undefined},{affectedSide:'Left',side:'Right',condition:'Stroke',patientAge:'21 Y'}),true);
assert.equal(matchesSegment({...report,affectedSide:'Left'},{affectedSide:'Right'}),false);
console.log('Segmentation boundaries, missing data, combined filters, and review flags passed.');
const json = (body,options)=>({body,status:options?.status||200});
const env = {DASHBOARD_ADMIN_KEY:'a'.repeat(32),REPORTS_TABLE_NAME:'test-table',REPORTS_DELETE_ENABLED:'true'};
let calls = [];
class DynamoDBClient { async send(command) { calls.push(command.input); if(command.input.Key.SessionId.S === 'fail') throw Error('denied'); } destroy() {} }
class DeleteItemCommand {constructor(input){this.input=input;}}
function route(environment=env){ return load('src/app/api/reports/delete/route.ts',{'next/server':{NextResponse:{json}},'@aws-sdk/client-dynamodb':{DynamoDBClient,DeleteItemCommand}}, {process:{env:environment}}).POST; }
function request(body, authorization=`Bearer ${env.DASHBOARD_ADMIN_KEY}`, origin='https://dashboard.test') {return {url:'https://dashboard.test/api/reports/delete',headers:new Headers({authorization,origin}),json:async()=>body};}
(async()=>{
 assert.equal((await route({})(request({}))).status,503);
 assert.equal((await route()(request({},'wrong'))).status,401);
 assert.equal((await route()(request({},undefined,'https://other.test'))).status,403);
 for(const body of [{sessionIds:[],confirmation:'DELETE'},{sessionIds:['a','a'],confirmation:'DELETE'},{sessionIds:['a'],confirmation:'NO'},{sessionIds:Array.from({length:21},(_,i)=>String(i)),confirmation:'DELETE'}]) assert.equal((await route()(request(body))).status,400);
 assert.equal(calls.length,0);
 const result=await route()(request({sessionIds:['ok','fail'],confirmation:'DELETE'}));
 assert.equal(result.status,200);
 assert.equal(result.body.deleted.join(','),'ok'); assert.equal(result.body.failed.join(','),'fail');
 assert.equal(calls.length,2); assert.equal(calls[0].TableName,'test-table'); assert.equal(calls[0].ConditionExpression,'attribute_exists(#id)');
 console.log('Deletion configuration, authentication, origin, validation, exact IDs and partial failures passed. No AWS calls were made.');
})().catch(error=>{console.error(error);process.exitCode=1;});
