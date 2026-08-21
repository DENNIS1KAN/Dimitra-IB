const {TopBar,Avatar,Card,Icon,Button}=window.LumenDesignSystem_44a90c;
function AboutScreen({go}){
const cv=[["school","MSc Chemistry, National & Kapodistrian University of Athens"],["history_edu","12 years teaching IB Chemistry HL, 1:1 and small groups"],["fact_check","IB examiner — Paper 2, five sessions"],["trending_up","Students average 6.4 in HL Chemistry over the last three cohorts"]];
return <div data-screen-label="About Dimitra" style={{display:'flex',flexDirection:'column',height:'100%'}}>
<TopBar title="About Dimitra" onBack={()=>go('home')}/>
<div style={{flex:1,overflowY:'auto',padding:'8px 20px 24px',display:'flex',flexDirection:'column',gap:16}}>
<div style={{display:'flex',alignItems:'center',gap:16}}>
<Avatar size="xl"/>
<div><div style={{fontSize:'var(--text-heading-sm)',fontWeight:700,letterSpacing:'var(--tracking-heading-sm)'}}>Dimitra Anglou</div>
<div style={{fontSize:'var(--text-body-sm)',fontWeight:500,color:'var(--text-secondary)',marginTop:2}}>IB Chemistry HL · Athens</div></div>
</div>
<Card padding="20px">
<div style={{display:'flex',flexDirection:'column',gap:14}}>
{cv.map(([ic,t])=><div key={ic} style={{display:'flex',gap:12,alignItems:'flex-start'}}>
<Icon name={ic} size={20} color="var(--color-deep-indigo)"/>
<span style={{fontSize:'var(--text-body-sm)',letterSpacing:'var(--tracking-body-sm)',lineHeight:1.5,color:'var(--text-primary)'}}>{t}</span>
</div>)}
</div>
</Card>
<Card surface="indigo" featured>
<p style={{margin:0,fontSize:'var(--text-body)',lineHeight:1.55,letterSpacing:'var(--tracking-body)',fontWeight:500}}>“Chemistry isn't hard — it's cumulative. My job is making sure nothing quietly slips, so exam season feels like revision, not rescue.”</p>
<p style={{margin:'12px 0 0',fontSize:'var(--text-body-sm)',fontStyle:'italic',opacity:.8}}>— Dimitra</p>
</Card>
<Button variant="dark" fullWidth>Message Dimitra</Button>
</div>
</div>;
}
Object.assign(window,{AboutScreen});
