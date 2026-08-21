const {Avatar,Card,Icon,Button}=window.LumenDesignSystem_44a90c;
function DesktopAbout(){
const cv=[["school","MSc Chemistry, National & Kapodistrian University of Athens"],["history_edu","12 years teaching IB Chemistry HL, 1:1 and small groups"],["fact_check","IB examiner — Paper 2, five sessions"],["trending_up","Students average 6.4 in HL Chemistry over the last three cohorts"]];
return <div data-screen-label="Desktop about" style={{maxWidth:860,margin:'0 auto',padding:'48px 32px 64px'}}>
<div style={{display:'flex',alignItems:'center',gap:24,marginBottom:32}}>
<Avatar size="xl"/>
<div><h1 style={{margin:0,fontSize:'var(--text-heading)',fontWeight:700,letterSpacing:'var(--tracking-heading)'}}>Dimitra Anglou</h1>
<p style={{margin:'4px 0 0',fontSize:'var(--text-body)',fontWeight:500,color:'var(--text-secondary)'}}>IB Chemistry HL · Athens</p></div>
<Button variant="dark" style={{marginLeft:'auto'}}>Message Dimitra</Button>
</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24,alignItems:'start'}}>
<Card padding="28px">
<div style={{fontSize:'var(--text-body-sm)',fontWeight:700,textTransform:'uppercase',letterSpacing:'.03em',color:'var(--text-tertiary)',marginBottom:16}}>Credentials</div>
<div style={{display:'flex',flexDirection:'column',gap:16}}>
{cv.map(([ic,t])=><div key={ic} style={{display:'flex',gap:12,alignItems:'flex-start'}}>
<Icon name={ic} size={20} color="var(--color-deep-indigo)"/>
<span style={{fontSize:'var(--text-body-sm)',lineHeight:1.55,letterSpacing:'var(--tracking-body-sm)'}}>{t}</span>
</div>)}
</div>
</Card>
<Card surface="indigo" featured>
<p style={{margin:0,fontSize:'var(--text-subheading)',lineHeight:1.5,letterSpacing:'var(--tracking-subheading)',fontWeight:500}}>“Chemistry isn't hard — it's cumulative. My job is making sure nothing quietly slips, so exam season feels like revision, not rescue.”</p>
<p style={{margin:'16px 0 0',fontSize:'var(--text-body-sm)',fontStyle:'italic',opacity:.8}}>— Dimitra</p>
</Card>
</div>
</div>;
}
Object.assign(window,{DesktopAbout});
