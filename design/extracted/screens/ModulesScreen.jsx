const {TopBar,FilterPill,ListRow,Badge,ModuleCard}=window.LumenDesignSystem_44a90c;
function ModulesScreen({go}){
const [cls,setCls]=React.useState('chem');
const classes=[{id:'chem',name:'Chemistry HL',color:'var(--subject-chemistry)'},{id:'math',name:'Math AA SL',color:'var(--subject-plum)'}];
const chem=[["Week 5 — Energetics: Born–Haber cycles",true],["Week 4 — Kinetics: rate expressions",true],["Week 3 — Equilibrium: K & Q",true]];
const math=[["Week 5 — Integration by parts",true],["Week 4 — Differential equations",true],["Week 3 — Maclaurin series",true]];
const past=cls==='chem'?chem:math;
return <div data-screen-label="Modules" style={{display:'flex',flexDirection:'column',height:'100%'}}>
<TopBar title="Modules"/>
<div style={{flex:1,overflowY:'auto',padding:'4px 20px 24px',display:'flex',flexDirection:'column',gap:10}}>
<div style={{display:'flex',gap:8,marginBottom:6}}>{classes.map(c=><FilterPill key={c.id} active={cls===c.id} onClick={()=>setCls(c.id)}>{c.name}</FilterPill>)}</div>
{cls==='chem'?
<ModuleCard week="Week 6 · This week" isNew title="Buffers & titration curves" meta="3 videos · slides · 8 exercises" done={2} total={5} cta="Continue module" onOpen={()=>go('module')}/>:
<ModuleCard week="Week 6 · This week" isNew title="Vectors: lines & planes" meta="2 videos · slides · 6 exercises" done={0} total={4} cta="Start module" onOpen={()=>{}}/>}
{past.map(([t])=><ListRow key={t} icon="check_circle" iconColor={cls==='chem'?'var(--subject-chemistry)':'var(--subject-plum)'} label={t} meta="Completed" trailing={<Badge tone="done" icon="check">Done</Badge>} chevron={false}/>)}
<ListRow icon="lock" iconColor="var(--state-locked)" label="Week 7" meta="Unlocks Mon 19 Oct" chevron={false}/>
</div>
</div>;
}
Object.assign(window,{ModulesScreen});
