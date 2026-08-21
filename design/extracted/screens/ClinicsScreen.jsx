const {TopBar,FilterPill,SessionCard,ListRow}=window.LumenDesignSystem_44a90c;
function ClinicsScreen(){
const [booked,setBooked]=React.useState(false);
const [tab,setTab]=React.useState('up');
return <div data-screen-label="Clinics & 1:1" style={{display:'flex',flexDirection:'column',height:'100%'}}>
<TopBar title="Clinics & 1:1"/>
<div style={{flex:1,overflowY:'auto',padding:'4px 20px 24px',display:'flex',flexDirection:'column',gap:12}}>
<div style={{display:'flex',gap:8}}><FilterPill active={tab==='up'} onClick={()=>setTab('up')}>Upcoming</FilterPill><FilterPill active={tab==='past'} onClick={()=>setTab('past')}>Recordings</FilterPill></div>
{tab==='up'?<React.Fragment>
<SessionCard title="Weekly clinic" datetime="Thu 15 Oct · 18:00–19:00" detail="Bring your titration curves" seats="6 of 10 seats left" booked={booked} onBook={()=>setBooked(true)}/>
<SessionCard kind="oneonone" title="1:1 with Dimitra" datetime="Pick a slot · 30 min" detail="2 slots left this month" onBook={()=>{}}/>
<p style={{margin:'4px 2px 0',fontSize:'var(--text-caption)',letterSpacing:'var(--tracking-caption)',color:'var(--text-tertiary)',lineHeight:1.5}}>Clinics are small on purpose — come with questions, leave with fixed working.</p>
</React.Fragment>:<React.Fragment>
<ListRow icon="play_circle" label="Clinic — energetics recap" meta="Thu 8 Oct · 52 min"/>
<ListRow icon="play_circle" label="Clinic — equilibrium K & Q" meta="Thu 1 Oct · 48 min"/>
<ListRow icon="play_circle" label="Clinic — Born–Haber cycles" meta="Thu 24 Sep · 55 min"/>
</React.Fragment>}
</div>
</div>;
}
Object.assign(window,{ClinicsScreen});
