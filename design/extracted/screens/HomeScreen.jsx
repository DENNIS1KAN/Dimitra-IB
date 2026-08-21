const {TopBar,Avatar,NoteCard,ModuleCard,ListRow}=window.LumenDesignSystem_44a90c;
function HomeScreen({go}){
return <div data-screen-label="Home" style={{display:'flex',flexDirection:'column',height:'100%'}}>
<TopBar trailing={<Avatar initials="NK" tone="neutral"/>}/>
<div style={{flex:1,overflowY:'auto',padding:'8px 20px 24px',display:'flex',flexDirection:'column',gap:16}}>
<h1 style={{margin:'8px 0 0',fontSize:'var(--text-heading)',fontWeight:700,letterSpacing:'var(--tracking-heading)',lineHeight:1.2}}>Hi Nikos.</h1>
<NoteCard date="Mon 12 Oct" note="Buffers trip everyone up the first week — watch video 2 twice before you try the exercises. Bring your titration curves on Thursday and we'll fix them together."/>
<ModuleCard week="Week 6" isNew title="Buffers & titration curves" meta="3 videos · slides · 8 exercises" done={2} total={5} cta="Continue module" onOpen={()=>go('module')}/>
<ListRow icon="event" iconColor="var(--color-deep-indigo)" label="Thursday clinic" meta="18:00 · 6 seats left" onClick={()=>go('clinics')}/>
<ListRow icon="school" iconColor="var(--color-graphite)" label="About Dimitra" meta="Credentials, approach, results" onClick={()=>go('about')}/>
</div>
</div>;
}
Object.assign(window,{HomeScreen});
