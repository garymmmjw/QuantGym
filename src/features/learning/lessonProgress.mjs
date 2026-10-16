import {activeDaysStreak,calculateLevel,creditLesson} from './scoring/scoring-model.mjs';

// Completion is editable; the award ledger is permanent for this local profile.
// Older preview versions stored only completed IDs, so migrate those as credited
// without awarding points again or guessing their historical accuracy bonus.
export function normalizeProgress(value={}) {
 const completed=[...new Set(Array.isArray(value.completed)?value.completed:[])];
 const awards=value.awards&&typeof value.awards==='object'&&!Array.isArray(value.awards)?{...value.awards}:{};
 for(const id of completed)if(!Object.hasOwn(awards,id))awards[id]={migrated:true,xpAwarded:null};
 return {...value,completed,awards,xp:Number.isFinite(value.xp)?Math.max(0,value.xp):0,
  days:Array.isArray(value.days)?value.days:[],notes:Array.isArray(value.notes)?value.notes:[]};
}
export function progressProfile(value,now=Date.now()) {
 const p=normalizeProgress(value),level=calculateLevel(p.xp),today=new Date(now).toISOString().slice(0,10);
 return{xp:p.xp,...level,streak:{current:activeDaysStreak(p.days,today)}};
}
export function completeLocalLesson(value,id,bonus=0,now=Date.now()) {
 const before=normalizeProgress(value),previous=progressProfile(before,now);
 const {learnProgress,result}=creditLesson(before.awards,id,bonus,{now,maxLessons:Infinity});
 if(result.error)return{progress:before,result};
 const progress={...before,completed:[...new Set([...before.completed,id])],awards:learnProgress,xp:before.xp+result.total};
 if(!result.alreadyEarned)progress.days=[...new Set([...before.days,new Date(now).toISOString().slice(0,10)])];
 const profile=progressProfile(progress,now);
 return{progress,result:{...result,xp:profile.xp,level:profile.level,levelXp:profile.currentXP,nextLevelXp:profile.nextLevelXP,levelPct:profile.percent,leveledUp:profile.level>previous.level,streak:profile.streak.current}};
}
export function uncompleteLocalLesson(value,id) {
 const progress=normalizeProgress(value);
 return{...progress,completed:progress.completed.filter(x=>x!==id)};
}
