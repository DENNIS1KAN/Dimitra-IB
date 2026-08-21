const {NoteCard,ModuleCard,SessionCard,ListRow,ProgressBar,Card}=window.LumenDesignSystem_44a90c;
function DesktopHome({go}){
return <div data-screen-label="Desktop home" style={{maxWidth:1040,margin:'0 auto',padding:'40px 32px 64px'}}>
<h1 style={{margin:'0 0 16px',fontSize:'var(--text-heading-lg)',fontWeight:700,letterSpacing:'var(--tracking-heading-lg)',lineHeight:1.15}}>Hi Nikos.</h1>
<div style={{display:'flex',gap:10,alignItems:'center',marginBottom:24,fontFamily:'var(--font-sans)'}}>
{[['Chemistry HL','var(--subject-chemistry)'],['Math AA SL','var(--subject-plum)']].map(([n,c])=><span key={n} style={{display:'inline-flex',alignItems:'center',gap:8,border:'1px solid var(--border-card)',background:'var(--surface-card)',borderRadius:'var(--radius-pills)',padding:'9px 16px',fontSize:'var(--text-body-sm)',fontWeight:500,letterSpacing:'var(--tracking-body-sm)',cursor:'pointer'}}><span style={{width:8,height:8,borderRadius:'50%',background:c}}></span>{n}</span>)}
<span onClick={()=>go('modules')} style={{fontSize:'var(--text-body-sm)',fontWeight:500,color:'var(--action-primary)',cursor:'pointer',marginLeft:4}}>All modules →</span>
</div>
<div style={{display:'grid',gridTemplateColumns:'1.6fr 1fr',gap:24,alignItems:'start'}}>
<div style={{display:'flex',flexDirection:'column',gap:20}}>
<NoteCard date="Mon 12 Oct" note="Buffers trip everyone up the first week — watch video 2 twice before you try the exercises. Bring your titration curves on Thursday and we'll fix them together."/>
<ModuleCard week="Week 6" isNew title="Buffers & titration curves" meta="3 videos · slides · 8 exercises" done={2} total={5} cta="Continue module" onOpen={()=>{}}/>
</div>
<div style={{display:'flex',flexDirection:'column',gap:16}}>
<SessionCard title="Weekly clinic" datetime="Thu 15 Oct · 18:00–19:00" detail="Bring your titration curves" seats="6 of 10 seats left"/>
<Card padding="20px">
<div style={{fontSize:'var(--text-body-sm)',fontWeight:700,marginBottom:12}}>This term</div>
<ProgressBar value={12} total={18} label="12 of 18 modules"/>
</Card>
<ListRow icon="school" iconColor="var(--color-graphite)" label="About Dimitra" meta="Credentials & approach" onClick={()=>go('about')}/>
</div>
</div>
</div>;
}
Object.assign(window,{DesktopHome});
