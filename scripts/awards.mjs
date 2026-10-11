import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {getDb,REPO_ROOT} from './lib/db.mjs';
import {parseCsv,pick} from './lib/csv.mjs';
export const reads={
 seasons:'select id,code,name,closes_on,judging_due,owner from awards.seasons order by closes_on',
 categories:'select id,season_id,name,required_judges from awards.categories order by name',
 criteria:'select id,category_id,name,weight from awards.criteria order by name',
 entries:'select id,season_id,name,entrant,organisation,status,eligibility,decision from awards.entries order by name',
 judges:'select id,season_id,name,organisation from awards.judges order by name',
 'entry-check':'select e.name as entry,c.name as category,e.status,e.eligibility,e.eligibility_evidence from awards.entries e join awards.categories c on c.id=e.category_id order by e.name',
 'panel-check':'select entry,category,required_judges,assigned,completed,ready from awards.results order by entry',
 'judge-chase':'select entry,judge,declaration,due_on,criteria_required,criteria_scored from awards.judging_progress where declaration<>\'conflict\' and weighted_score is null order by due_on,entry,judge',
 'conflict-register':'select p.entry,p.judge,p.declaration,a.evidence from awards.judging_progress p join awards.assignments a on a.id=p.id order by p.entry,p.judge',
 results:'select entry,category,completed,required_judges,mean_score,judge_spread,ready,decision from awards.results order by category,mean_score desc nulls last,entry',
 'score-ledger':'select p.entry,p.judge,p.declaration,c.name as criterion,c.weight,s.value,s.rationale from awards.scores s join awards.criteria c on c.id=s.criterion_id join awards.judging_progress p on p.id=s.assignment_id order by p.entry,p.judge,c.name',
 attention:'select kind,item,next_step from awards.attention order by kind,item',
 compliance:'select rule,item,action from awards.compliance order by rule,item',
 decisions:'select name,decision,decision_reason from awards.entries where decision<>\'undecided\' order by name',
 activity:'select actor,action,detail,created_at from awards.activity order by created_at,id'
};
const specs={
 help:[],...Object.fromEntries(Object.keys(reads).map(k=>[k,[]])),
 'weekly-review':[], 'draft-panel-brief':['season'],export:['out'],
 'add-season':['code','name','closes','due','owner','actor'],
 'add-category':['season','name','required','actor'], 'add-criterion':['season','category','name','weight','actor'],
 'add-entry':['season','category','name','entrant','organisation','actor'],
 'add-judge':['season','name','organisation','actor'],
 eligibility:['season','entry','state','evidence','actor'],
 assign:['season','entry','judge','due','actor'],
 declare:['season','entry','judge','state','evidence','actor'],
 score:['season','entry','judge','criterion','value','reason','actor'],
 decide:['season','entry','state','reason','actor'],
 'reopen-decision':['season','entry','reason','actor'],
 withdraw:['season','entry','reason','actor'],
 'privacy-review':['season','entry','notice','retention','actor'],
 'security-review':['season','date','evidence','actor'],
 log:['season','note','actor'], import:['season','file','mapping','dry-run','actor']
};
export const commands=Object.keys(specs);
function parse(args){const [cmd='help',...rest]=args,f={},pos=[];for(const arg of rest){if(!arg.startsWith('--')){pos.push(arg);continue;}const at=arg.indexOf('='),k=arg.slice(2,at<0?undefined:at),v=at<0?true:arg.slice(at+1);if(k in f)throw Error(`Repeated --${k}`);f[k]=v;}if(!specs[cmd])throw Error(`Unknown command ${cmd}`);for(const k of Object.keys(f))if(k!=='json'&&!specs[cmd].includes(k))throw Error(`Unknown --${k} for ${cmd}`);if(pos.length&&(cmd!=='import'||pos.length!==1||pos[0]!=='award-force'))throw Error('Unexpected positional argument');if(cmd==='import'&&pos[0]!=='award-force')throw Error('Use import award-force');return {cmd,f};}
function req(f,k){if(typeof f[k]!=='string'||!f[k].trim())throw Error(`Required --${k}=value`);return f[k].trim();}
function date(v){if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)throw Error(`Invalid date ${v}`);return v;}
function num(v,min,max){if(!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(v)||!Number.isFinite(+v)||+v<min||+v>max)throw Error(`Number must be ${min} to ${max}`);return +v;}
function choice(v,list){if(!list.includes(v))throw Error(`Choose ${list.join(', ')}`);return v;}
async function resolve(db,table,value,season=null,category=null){const params=[value.toLowerCase()],where=['(lower(name)=$1 or left(id::text,length($1))=$1'+(table==='seasons'?' or lower(code)=$1':'')+')'];if(season){params.push(season);where.push(`season_id=$${params.length}`);}if(category){params.push(category);where.push(`category_id=$${params.length}`);}const rows=await db.query(`select * from awards.${table} where ${where.join(' and ')} order by name,id`,params);if(rows.length!==1)throw Error(`${rows.length?'Ambiguous':'No'} ${table} match: ${value}${rows.length?'\n'+rows.map(r=>r.id+' '+r.name).join('\n'):''}`);return rows[0];}
async function insert(db,table,obj){const keys=Object.keys(obj);return (await db.query(`insert into awards.${table} (${keys.join(',')}) values (${keys.map((_,i)=>'$'+(i+1)).join(',')}) returning *`,Object.values(obj)))[0];}
async function update(db,table,id,obj){const keys=Object.keys(obj);return (await db.query(`update awards.${table} set ${keys.map((k,i)=>k+'=$'+(i+1)).join(',')} where id=$${keys.length+1} returning *`,[...Object.values(obj),id]))[0];}
async function history(db,season,actor,action,detail){return insert(db,'activity',{season_id:season,actor,action,detail:typeof detail==='string'?detail:JSON.stringify(detail)});}
async function assignment(db,e,j){const [a]=await db.query('select * from awards.assignments where entry_id=$1 and judge_id=$2',[e.id,j.id]);if(!a)throw Error('No assignment for this entry and judge');return a;}
function unlocked(e){if(e.decision!=='undecided')throw Error('Reopen decision before changing judging');}
export async function run(db,args){const {cmd,f}=parse(args);
 if(cmd==='help')return commands.map(command=>({command,flags:specs[command].map(k=>'--'+k).join(' ')}));
 if(reads[cmd])return db.query(reads[cmd]);
 if(cmd==='weekly-review')return {attention:await db.query(reads.attention),results:await db.query(reads.results),compliance:await db.query(reads.compliance)};
 if(cmd==='export'){const out={format:'awards-v1',exported_at:new Date().toISOString()};for(const t of ['seasons','categories','criteria','entries','judges','assignments','scores','activity'])out[t]=await db.query(`select * from awards.${t} order by id`);if(f.out){const file=path.resolve(req(f,'out'));fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(out,null,2)+'\n');return {file,records:Object.values(out).filter(Array.isArray).reduce((n,r)=>n+r.length,0)};}return out;}
 if(cmd==='draft-panel-brief'){const s=await resolve(db,'seasons',req(f,'season'));const rows=await db.query('select * from awards.results where season_id=$1 order by category,entry',[s.id]);const dir=path.resolve(process.env.OUTPUT_DIR||REPO_ROOT,'drafts');fs.mkdirSync(dir,{recursive:true});const file=path.join(dir,`panel-${s.id}-${Date.now()}.md`);fs.writeFileSync(file,`# DRAFT: ${s.name}\n\nInternal panel brief. Human decisions only. Nothing sent.\n\n`+display(rows)+'\n');return {file,entries:rows.length};}
 const actor=req(f,'actor');await db.exec('BEGIN');
 try{
 let s=null,result;
 if(cmd!=='add-season'){s=await resolve(db,'seasons',req(f,'season'));await db.query('select id from awards.seasons where id=$1 for update',[s.id]);}
 const entry=()=>resolve(db,'entries',req(f,'entry'),s.id),judge=()=>resolve(db,'judges',req(f,'judge'),s.id),category=()=>resolve(db,'categories',req(f,'category'),s.id);
 switch(cmd){
 case 'add-season': result=await insert(db,'seasons',{code:req(f,'code'),name:req(f,'name'),closes_on:date(req(f,'closes')),judging_due:date(req(f,'due')),owner:req(f,'owner')});s=result;break;
 case 'add-category':{const n=num(req(f,'required'),1,20);if(!Number.isInteger(n))throw Error('Required judges must be an integer');result=await insert(db,'categories',{season_id:s.id,name:req(f,'name'),required_judges:n});break;}
 case 'add-criterion':{const c=await category();const used=await db.query('select id from awards.assignments where category_id=$1 limit 1',[c.id]);if(used.length)throw Error('Criteria locked after first assignment');result=await insert(db,'criteria',{category_id:c.id,name:req(f,'name'),weight:num(req(f,'weight'),0.0001,100)});break;}
 case 'add-entry':{const c=await category();result=await insert(db,'entries',{season_id:s.id,category_id:c.id,name:req(f,'name'),entrant:req(f,'entrant'),organisation:f.organisation||''});break;}
 case 'add-judge':result=await insert(db,'judges',{season_id:s.id,name:req(f,'name'),organisation:f.organisation||''});break;
 case 'eligibility':{const e=await entry();unlocked(e);result=await update(db,'entries',e.id,{eligibility:choice(req(f,'state'),['eligible','ineligible']),eligibility_evidence:req(f,'evidence')});break;}
 case 'assign':{const e=await entry(),j=await judge();unlocked(e);if(e.status!=='submitted'||e.eligibility!=='eligible')throw Error('Entry must be submitted and eligible');const criteria=await db.query('select id from awards.criteria where category_id=$1',[e.category_id]);if(!criteria.length)throw Error('Add criteria first');result=await insert(db,'assignments',{season_id:s.id,category_id:e.category_id,entry_id:e.id,judge_id:j.id,due_on:date(req(f,'due'))});break;}
 case 'declare':{const e=await entry(),j=await judge();unlocked(e);const a=await assignment(db,e,j);result=await update(db,'assignments',a.id,{declaration:choice(req(f,'state'),['clear','conflict']),evidence:req(f,'evidence')});break;}
 case 'score':{const e=await entry(),j=await judge();unlocked(e);if(e.status!=='submitted'||e.eligibility!=='eligible')throw Error('Entry must be submitted and eligible');const a=await assignment(db,e,j);if(a.declaration!=='clear')throw Error('A clear conflict declaration is required');const c=await resolve(db,'criteria',req(f,'criterion'),null,e.category_id);const value=num(req(f,'value'),0,10),reason=req(f,'reason');result=(await db.query('insert into awards.scores(category_id,assignment_id,criterion_id,value,rationale) values($1,$2,$3,$4,$5) on conflict(assignment_id,criterion_id) do update set value=excluded.value,rationale=excluded.rationale returning *',[e.category_id,a.id,c.id,value,reason]))[0];break;}
 case 'decide':{const e=await entry();unlocked(e);const state=choice(req(f,'state'),['shortlisted','winner','not selected']);const [r]=await db.query('select * from awards.results where id=$1',[e.id]);if(!r.ready)throw Error('Decision blocked: eligibility, declarations or scoring incomplete');result=await update(db,'entries',e.id,{decision:state,decision_reason:req(f,'reason')});break;}
 case 'reopen-decision':{const e=await entry();req(f,'reason');result=await update(db,'entries',e.id,{decision:'undecided',decision_reason:null});break;}
 case 'withdraw':{const e=await entry();unlocked(e);req(f,'reason');result=await update(db,'entries',e.id,{status:'withdrawn'});break;}
 case 'privacy-review':{const e=await entry();result=await update(db,'entries',e.id,{notice_review:req(f,'notice'),retention_review_on:date(req(f,'retention'))});break;}
 case 'security-review':{const day=date(req(f,'date'));const [now]=await db.query('select current_date::text as day');if(day>now.day)throw Error('Review cannot be future dated');req(f,'evidence');result=await update(db,'seasons',s.id,{security_review_on:day});break;}
 case 'log':result={note:req(f,'note')};break;
 case 'import': result=await importEntries(db,s,f);break;
 default:throw Error('Not implemented');
 }
 await history(db,s.id,actor,cmd,{input:f,result});
 await db.exec(cmd==='import'&&f['dry-run']?'ROLLBACK':'COMMIT');return result;
 }catch(e){await db.exec('ROLLBACK');throw e;}
}
async function importEntries(db,s,f){
 const rows=parseCsv(fs.readFileSync(path.resolve(req(f,'file')),'utf8'));if(!rows.length)throw Error('No entries in CSV');
 const map=f.mapping?JSON.parse(fs.readFileSync(path.resolve(req(f,'mapping')),'utf8')):{};
 const aliases={id:['Entry ID','Entry slug','Slug','ID'],name:['Entry name','Entry title','Title'],category:['Category','Category name'],entrant:['Entrant','Entrant name','Name'],organisation:['Organisation','Organization'],status:['Status','Entry status'],season:['Season','Season name']};
 for(const [k,v] of Object.entries(map))if(!(k in aliases)||typeof v!=='string'||!v.trim())throw Error(`Invalid mapping ${k}`);
 const read=(r,k)=>pick(r,...(map[k]?[map[k]]:aliases[k])).trim();let inserted=0,skipped=0;const ids=new Set();
 for(const r of rows){
 const source=read(r,'id'),name=read(r,'name'),cat=read(r,'category'),entrant=read(r,'entrant'),raw=read(r,'status').toLowerCase(),season=read(r,'season');
 if(!source||!name||!cat||!entrant||!raw)throw Error('Required import columns: Entry ID, Entry name, Category, Entrant, Status');
 if(season&&![s.name,s.code].some(v=>v.toLowerCase()===season.toLowerCase()))throw Error('Source season does not match destination');
 if(ids.has(source))throw Error(`Duplicate source ID ${source}`);ids.add(source);
 const status=choice(raw,['submitted','in progress','withdrawn']);
 const c=await resolve(db,'categories',cat,s.id);
 const hash=createHash('sha256').update(JSON.stringify(Object.entries(r).sort(([a],[b])=>a.localeCompare(b)))).digest('hex');
 const [old]=await db.query('select source_hash from awards.entries where season_id=$1 and source_id=$2',[s.id,source]);
 if(old){if(old.source_hash!==hash)throw Error(`Source entry ${source} changed: reconcile before importing`);skipped++;continue;}
 await insert(db,'entries',{season_id:s.id,category_id:c.id,name,entrant,organisation:read(r,'organisation'),status,source_id:source,source_data:JSON.stringify(r),source_hash:hash});inserted++;
 }
 return {inserted,skipped,dry_run:Boolean(f['dry-run']),scope:'entry records only; judging and attachments require reconciliation'};
}
export function display(value){if(Array.isArray(value)){if(!value.length)return '(none)';const keys=Object.keys(value[0]),cell=v=>String(v??'').replaceAll('|','/').replaceAll('\n',' ');return [keys.join(' | '),keys.map(()=> '---').join(' | '),...value.map(r=>keys.map(k=>cell(r[k])).join(' | '))].join('\n');}return JSON.stringify(value,null,2);}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){let db;try{db=await getDb();const result=await run(db,process.argv.slice(2));console.log(process.argv.includes('--json')?JSON.stringify(result,null,2):display(result));}catch(e){console.error(e.message);process.exitCode=1;}finally{if(db)await db.close();}}
