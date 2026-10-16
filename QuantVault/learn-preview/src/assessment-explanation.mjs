// Read-only arithmetic trace for the explicitly selected v1 UI. This does not
// replace the source model or modify the scenario / learning progress.
export function buildV1Explanation(bar) {
 const {skill,engagement,assessmentCount,progressCount}=bar.diagnostics;
 const eligible=bar.topics.filter(t=>t.evidence>=3);
 const weightedSum=eligible.reduce((sum,t)=>sum+t.relevance*t.mastery,0);
 const weightSum=eligible.reduce((sum,t)=>sum+t.relevance,0);
 const contributions=bar.topics.map(topic=>({...topic,included:topic.evidence>=3,
  contribution:topic.evidence>=3&&weightSum>0?topic.relevance*topic.mastery/weightSum:0}));
 const contributionTotal=contributions.reduce((sum,t)=>sum+t.contribution,0);
 const base=0.72*assessmentCount/(assessmentCount+2);
 const grind=progressCount/(progressCount+130);
 const beforeRounding=skill*engagement*100;
 const rounded=Math.round(beforeRounding);
 const final=Math.max(2,Math.min(99,rounded));
 return{skill,engagement,assessmentCount,progressCount,eligible,weightedSum,weightSum,contributions,contributionTotal,base,grind,beforeRounding,rounded,final,
  matchesModel:bar.modelInfo.requested==='v1'&&final===bar.readiness};
}
