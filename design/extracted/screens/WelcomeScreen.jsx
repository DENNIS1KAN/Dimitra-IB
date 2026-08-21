const {Wordmark,Input,Button}=window.LumenDesignSystem_44a90c;
function WelcomeScreen({onSignIn}){
return <div data-screen-label="Welcome" style={{display:'flex',flexDirection:'column',height:'100%',padding:'0 24px 32px',boxSizing:'border-box'}}>
<div style={{flex:1,display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center',textAlign:'center',gap:16}}>
<Wordmark size="xl" style={{alignItems:'center'}}/>
<p style={{margin:0,fontSize:'var(--text-subheading)',fontWeight:500,letterSpacing:'var(--tracking-subheading)',lineHeight:1.4,color:'var(--text-secondary)',maxWidth:280}}>Private IB Chemistry HL<br/>with Dimitra Anglou</p>
</div>
<div style={{display:'flex',flexDirection:'column',gap:14}}>
<Input label="Email" type="email" placeholder="you@school.gr"/>
<Input label="Invite code" placeholder="From Dimitra's message" helper="Lumen is invite-only — ask Dimitra if you need one"/>
<Button variant="primary" size="lg" fullWidth onClick={onSignIn}>Sign in</Button>
</div>
</div>;
}
Object.assign(window,{WelcomeScreen});
