const {TopBar,Card,ProgressBar,Icon,Badge}=window.LumenDesignSystem_44a90c;
function ProgressScreen(){
const topics=[["Stoichiometry","done"],["Atomic structure","done"],["Bonding & structure","done"],["Energetics","done"],["Kinetics","done"],["Equilibrium","done"],["Acids & bases","now"],["Redox","next"],["Organic chemistry","next"]];
return <div data-screen-label="Progress" style={{display:'flex',flexDirection:'column',height:'100%'}}>
<TopBar title="Progress"/>
<div style={{flex:1,overflowY:'auto',padding:'4px 20px 24px',display:'flex',flexDirection:'column',gap:14}}>
<Card featured>
<div style={{fontSize:'var(--text-body-sm)',fontWeight:500,color:'var(--text-tertiary)',marginBottom:4}}>Nikos K. · IB Chemistry HL · May 2027</div>
<div style={{fontSize:'var(--text-heading-sm)',fontWeight:700,letterSpacing:'var(--tracking-heading-sm)',marginBottom:14}}>12 of 18 modules</div>
<ProgressBar value={12} total={18}/>
<div style={{display:'flex',gap:18,marginTop:16}}>
<div><div style={{fontSize:'var(--text-subheading)',fontWeight:700}}>11</div><div style={{fontSize:'var(--text-caption)',color:'var(--text-tertiary)'}}>attempts submitted</div></div>
<div><div style={{fontSize:'var(--text-subheading)',fontWeight:700}}>9</div><div style={{fontSize:'var(--text-caption)',color:'var(--text-tertiary)'}}>clinics attended</div></div>
<div><div style={{fontSize:'var(--text-subheading)',fontWeight:700}}>Mar</div><div style={{fontSize:'var(--text-caption)',color:'var(--text-tertiary)'}}>Paper 1 mock</div></div>
</div>
</Card>
<div style={{display:'flex',flexDirection:'column',gap:0,background:'var(--surface-card)',border:'1px solid var(--border-card)',borderRadius:'var(--radius-cards)',padding:'6px 16px'}}>
{topics.map(([t,s],i)=><div key={t} style={{display:'flex',alignItems:'center',gap:10,padding:'11px 0',borderBottom:i<topics.length-1?'1px solid var(--color-page-cream)':'none'}}>
<Icon name={s==='done'?'check_circle':s==='now'?'radio_button_checked':'circle'} size={18} color={s==='done'?'var(--action-primary)':s==='now'?'var(--color-deep-indigo)':'var(--color-driftwood)'}/>
<span style={{flex:1,fontSize:'var(--text-body-sm)',fontWeight:500,letterSpacing:'var(--tracking-body-sm)',color:s==='next'?'var(--text-tertiary)':'var(--text-primary)'}}>{t}</span>
{s==='now'&&<Badge tone="neutral">this week</Badge>}
</div>)}
</div>
</div>
</div>;
}
Object.assign(window,{ProgressScreen});
