const {TopBar,Badge,LessonRow,LockPanel,TextArea,Button,Toast,Icon}=window.LumenDesignSystem_44a90c;
function ModuleScreen({go,initialUnlocked=false}){
const [sheet,setSheet]=React.useState(false);
const [unlocked,setUnlocked]=React.useState(initialUnlocked);
const [toast,setToast]=React.useState(false);
const submit=()=>{setSheet(false);setUnlocked(true);setToast(true);setTimeout(()=>setToast(false),2600);};
return <div data-screen-label="Module detail" style={{display:'flex',flexDirection:'column',height:'100%',position:'relative'}}>
<TopBar title="Week 6" onBack={()=>go('home')}/>
<div style={{flex:1,overflowY:'auto',padding:'4px 20px 24px',display:'flex',flexDirection:'column',gap:10}}>
<h1 style={{margin:'4px 0 2px',fontSize:'var(--text-heading-sm)',fontWeight:700,letterSpacing:'var(--tracking-heading-sm)',lineHeight:1.25}}>Buffers & titration curves</h1>
<div style={{display:'flex',gap:8,marginBottom:8}}><Badge tone="new">New this Monday</Badge><Badge tone="neutral">Topic 8 · Acids & bases</Badge></div>
<LessonRow kind="video" title="1 · What a buffer actually is" duration="6 min" done/>
<LessonRow kind="video" title="2 · Why buffers resist pH change" duration="7 min" done/>
<LessonRow kind="video" title="3 · Reading titration curves" duration="9 min"/>
<LessonRow kind="slides" title="Slides — annotated" duration="18 pages"/>
<LessonRow kind="exercise" title="Exercises — set A" duration="8 questions"/>
{unlocked?<LessonRow kind="solutions" title="Worked solutions" duration="Compare line by line"/>:null}
<div style={{marginTop:8}}>
{unlocked?
<LockPanel locked={false} title="Solutions unlocked" body="Nice work. Compare line by line before Thursday's clinic — bring anything that still feels off." cta="Open solutions"/>:
<LockPanel title="Solutions unlock after your attempt" body="Upload a photo of your working — marks don't matter here, honest attempts do." cta="Submit my attempt" onAction={()=>setSheet(true)}/>}
</div>
</div>
{sheet&&<div style={{position:'absolute',inset:0,background:'rgba(45,44,43,.4)',display:'flex',alignItems:'flex-end',zIndex:5}} onClick={()=>setSheet(false)}>
<div style={{background:'var(--surface-card)',borderRadius:'24px 24px 0 0',padding:'24px 20px 28px',width:'100%',boxSizing:'border-box',display:'flex',flexDirection:'column',gap:14}} onClick={e=>e.stopPropagation()}>
<h3 style={{margin:0,fontSize:'var(--text-subheading)',fontWeight:700,letterSpacing:'var(--tracking-subheading)'}}>Submit your attempt</h3>
<button style={{border:'1px dashed var(--border-divider)',background:'var(--surface-page)',borderRadius:'var(--radius-cards)',padding:'22px',display:'flex',flexDirection:'column',alignItems:'center',gap:6,cursor:'pointer',fontFamily:'inherit'}}>
<Icon name="photo_camera" size={24} color="var(--text-secondary)"/>
<span style={{fontSize:'var(--text-body-sm)',fontWeight:500,color:'var(--text-secondary)'}}>Photo of your working</span>
</button>
<TextArea placeholder="Anything you got stuck on? (optional)" rows={2}/>
<Button variant="primary" fullWidth onClick={submit}>Send to Dimitra</Button>
</div>
</div>}
{toast&&<div style={{position:'absolute',top:12,left:16,right:16,zIndex:6,display:'flex',justifyContent:'center'}}><Toast message="Attempt sent to Dimitra" detail="Solutions are unlocked below"/></div>}
</div>;
}
Object.assign(window,{ModuleScreen});
