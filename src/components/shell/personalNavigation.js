export const PREP_NAV_GROUPS = [
  {label:'每日备战',labelEn:'DAILY PRACTICE',items:[
    {id:'overview',path:'/',label:'今日工作台',labelEn:'Today'},
    {id:'daily-mock',path:'/daily-mock',label:'Daily Mock',labelEn:'Daily Mock'},
    {id:'tools',path:'/tools',label:'Mental Math',labelEn:'Mental Math'},
    {id:'problems',path:'/problems',label:'量化题库',labelEn:'Question bank'},
    {id:'review',path:'/review',label:'错题与复习',labelEn:'Review queue'},
    {id:'calendar',path:'/calendar',label:'训练日历',labelEn:'Training calendar'},
  ]},
  {label:'申请与资料',labelEn:'APPLICATIONS & RESOURCES',items:[
    {id:'applications',path:'/applications',label:'申请追踪',labelEn:'Applications'},
    {id:'jobs',path:'/jobs',label:'岗位列表',labelEn:'Job listings'},
    {id:'interview',path:'/interview',label:'模拟面试',labelEn:'Mock interview'},
    {id:'resume',path:'/resume',label:'我的简历',labelEn:'My resume'},
    {id:'memory',path:'/memory',label:'资料笔记',labelEn:'Study notes'},
    {id:'settings',path:'/settings',label:'设置与备份',labelEn:'Settings & backup'},
  ]},
];
export const PERSONAL_MODULE_IDS = new Set([...PREP_NAV_GROUPS.flatMap(group => group.items.map(item => item.id)), 'account','companies','library','courses']);
export const RETIRED_MODULE_IDS = new Set(['community','messages','network','news','league','pk','skills','plan','experiences']);
