const {FilterPill,ListRow,Badge,ModuleCard,NoteCard}=window.LumenDesignSystem_44a90c;
function DesktopModules(){
const [cls,setCls]=React.useState('chem');
const classes=[{id:'chem',name:'Chemistry HL',color:'var(--subject-chemistry)'},{id:'math',name:'Math AA SL',color:'var(--subject-plum)'}];
const chem=[["Week 5 — Energetics: Born–Haber cycles"],["Week 4 — Kinetics: rate expressions"],["Week 3 — Equilibrium: K & Q"],["Week 2 — Bonding: shapes & polarity"],["Week 1 — Stoichiometry refresh"]];
const math=[["Week 5 — Integration by parts"],["Week 4 — Differential equations"],["Week 3 — Maclaurin series"],["Week 2 — Complex numbers"],["Week 1 — Sequences & series"]];
const past=cls==='chem'?chem:math;
const color=cls==='chem'?'var(--subject-chemistry)':'var(--subject-plum)';
return <div data-screen-label="Desktop modules" style={{maxWidth:1040,margin:'0 auto',padding:'40px 32px 64px'}}>
<div style={{display:'flex',alignItems:'center',gap:12,marginBottom:24}}>
<h1 style={{margin:0,fontSize:'var(--text-heading-lg)',fontWeight:700,letterSpacing:'var(--tracking-heading-lg)',lineHeight:1.15,flex:1}}>Modules</h1>
{classes.map(c=><FilterPill key={c.id} active={cls===c.id} onClick={()=>setCls(c.id)}><span style={{width:8,height:8,borderRadius:'50%',background:cls===c.id?'#fff':c.color,display:'inline-block'}}></span>{c.name}</FilterPill>)}
</div>
<div style={{display:'grid',gridTemplateColumns:'1.6fr 1fr',gap:24,alignItems:'start'}}>
<div style={{display:'flex',flexDirection:'column',gap:10}}>
{cls==='chem'?
<ModuleCard week="Week 6 · This week" isNew title="Buffers & titration curves" meta="3 videos · slides · 8 exercises" done={2} total={5} cta="Continue module"/>:
<ModuleCard week="Week 6 · This week" isNew title="Vectors: lines & planes" meta="2 videos · slides · 6 exercises" done={0} total={4} cta="Start module"/>}
{past.map(([t])=><ListRow key={t} icon="check_circle" iconColor={color} label={t} meta="Completed" trailing={<Badge tone="done" icon="check">Done</Badge>} chevron={false}/>)}
<ListRow icon="lock" iconColor="var(--state-locked)" label="Week 7" meta="Unlocks Mon 19 Oct" chevron={false}/>
</div>
{cls==='chem'?<NoteCard compact date="Mon 12 Oct" note="Buffers trip everyone up the first week — watch video 2 twice before the exercises. Bring your titration curves on Thursday."/>:
<NoteCard compact date="Mon 12 Oct" note="Vectors reward drawing — sketch every plane before you compute. We'll do past-paper picks in Tuesday's clinic."/>}
</div>
</div>;
}
Object.assign(window,{DesktopModules});
