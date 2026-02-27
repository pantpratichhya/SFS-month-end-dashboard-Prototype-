import { useState, useRef, useCallback } from "react";

const T = {
  bg:"#04080f",surf:"#080e18",card:"#0c1420",panel:"#101a28",
  border:"#1a2d42",borderHi:"#243d58",
  blue:"#0ea5e9",blueBr:"#38bdf8",blueDim:"#041220",
  green:"#10b981",greenBr:"#34d399",greenDim:"#041a10",
  amber:"#f59e0b",amberBr:"#fcd34d",amberDim:"#1c1300",
  red:"#ef4444",redBr:"#f87171",redDim:"#1a0505",
  purple:"#8b5cf6",purpleBr:"#a78bfa",purpleDim:"#100820",
  txt:"#e2f0ff",muted:"#7fa8c8",faint:"#2d4a60",
  mono:"'IBM Plex Mono','Courier New',monospace",
  display:"'Georgia',serif",
  sans:"system-ui,sans-serif",
};

const fmt  = (n) => (n<0?"-":"")+"$"+Math.abs(Math.round(n)).toLocaleString();
const fmtK = (n) => { const a=Math.abs(n),s=n<0?"-":""; return a>=1000000?s+"$"+(a/1000000).toFixed(2)+"M":a>=1000?s+"$"+(a/1000).toFixed(0)+"K":s+"$"+Math.round(a); };
const fmtP = (n) => (n>0?"+":"")+n.toFixed(2)+"%";

const SAMPLE = {
  period:"January 2024",
  company:"Square Financial Services",
  journalEntries:[
    {id:"JE-SFS-001",date:"2024-01-31",type:"Loan Origination",dr:"1200 Loans Receivable",cr:"2100 Deposits",amt:2450000,memo:"Merchant cash advance - Apex Retail TXN-88421",status:"SAFE"},
    {id:"JE-SFS-002",date:"2024-01-31",type:"CECL Reserve",dr:"6100 Provision for Credit Losses",cr:"1210 Allowance for Loan Losses",amt:73500,memo:"CECL reserve - 3% of new originations Jan 2024",status:"REVIEW"},
    {id:"JE-SFS-003",date:"2024-01-31",type:"Interest Accrual",dr:"1300 Interest Receivable",cr:"4100 Interest Income",amt:187250,memo:"30-day accrual on $45.2M loan portfolio at 5.0% APR",status:"SAFE"},
    {id:"JE-SFS-004",date:"2024-01-31",type:"Merchant Settlement",dr:"2200 Merchant Payables",cr:"1000 Cash",amt:8912000,memo:"Daily settlement batch SQ-SETTLE-20240131",status:"SAFE"},
    {id:"JE-SFS-005",date:"2024-01-31",type:"Fee Income",dr:"1000 Cash",cr:"4200 Fee Income",amt:312000,memo:"Processing fees Jan 2024 - 2.6% avg rate",status:"SAFE"},
    {id:"JE-SFS-006",date:"2024-01-31",type:"BNPL/Afterpay",dr:"1250 BNPL Receivables",cr:"4300 BNPL Revenue",amt:1840000,memo:"Afterpay installment originations Jan 2024",status:"REVIEW"},
    {id:"JE-SFS-007",date:"2024-01-31",type:"Intercompany",dr:"3100 Due to Block Inc.",cr:"6200 Management Fee Expense",amt:425000,memo:"Monthly mgmt fee - Block Inc. per ICA dated 2023-01-01",status:"REVIEW"},
    {id:"JE-SFS-008",date:"2024-01-31",type:"Reg Capital",dr:"3200 Retained Earnings",cr:"3300 Tier 1 Capital Reserve",amt:500000,memo:"Monthly capital allocation - maintain 12% CET1 ratio",status:"REVIEW"},
  ],
  reconciliations:[
    {acct:"1000 Cash",gl:48250000,product:48250000,bank:48250000,diff:0,status:"RECONCILED",aged:0},
    {acct:"1200 Loans Receivable",gl:45200000,product:45200000,bank:null,diff:0,status:"RECONCILED",aged:0},
    {acct:"1210 Allowance for Loan Losses",gl:-1356000,product:-1356000,bank:null,diff:0,status:"RECONCILED",aged:0},
    {acct:"1250 BNPL Receivables",gl:12840000,product:12650000,bank:null,diff:190000,status:"EXCEPTION",aged:15,note:"Product ledger lag - $190K not yet booked in GL"},
    {acct:"2100 Deposits",gl:-62100000,product:-62100000,bank:-62100000,diff:0,status:"RECONCILED",aged:0},
    {acct:"2200 Merchant Payables",gl:-3200000,product:-3412000,bank:null,diff:212000,status:"EXCEPTION",aged:3,note:"2 settlement batches pending - SQ-SETTLE-20240129, 20240130"},
    {acct:"3100 Due to Block Inc.",gl:-4250000,product:null,bank:null,diff:0,status:"RECONCILED",aged:0},
  ],
  flux:[
    {acct:"Cash",dec:52100000,jan:48250000,chg:-3850000,pct:-7.39,driver:"Net settlement outflows exceed inflows - normal seasonal pattern"},
    {acct:"Loans Receivable",dec:41800000,jan:45200000,chg:3400000,pct:8.13,driver:"Strong merchant advance originations - 23 new loans issued"},
    {acct:"BNPL Receivables",dec:11200000,jan:12840000,chg:1640000,pct:14.64,driver:"Afterpay volume up 14.6% MoM - holiday season tail"},
    {acct:"Deposits",dec:-58900000,jan:-62100000,chg:-3200000,pct:5.43,driver:"Merchant deposit growth tracking loan growth - expected"},
    {acct:"Interest Income",dec:174000,jan:187250,chg:13250,pct:7.61,driver:"Portfolio growth - NIM stable at 5.0%"},
    {acct:"Fee Income",dec:298000,jan:312000,chg:14000,pct:4.70,driver:"GMV growth - processing volume up 4.7%"},
    {acct:"Provision for Credit Losses",dec:62000,jan:73500,chg:11500,pct:18.55,driver:"Higher originations - higher CECL reserve - review reserve rate"},
  ],
  callReport:[
    {schedule:"RC-A",line:"1.a",description:"Cash and balances due from depository institutions",glAcct:"1000",glAmt:48250000,crAmt:48250000,flag:false},
    {schedule:"RC-C",line:"1.a.1",description:"Construction, land development, and other land loans",glAcct:"1200",glAmt:45200000,crAmt:45200000,flag:false},
    {schedule:"RC-C",line:"6",description:"Credit cards and other revolving plans",glAcct:"1250",glAmt:12840000,crAmt:12840000,flag:false},
    {schedule:"RC-E",line:"1.a",description:"Total transaction accounts - demand deposits",glAcct:"2100",glAmt:62100000,crAmt:62100000,flag:false},
    {schedule:"RC-R",line:"26",description:"Tier 1 leverage ratio",glAcct:"3300",glAmt:8500000,crAmt:8500000,flag:false},
    {schedule:"RC-O",line:"11",description:"Related organization - amounts due to affiliates",glAcct:"3100",glAmt:4250000,crAmt:4250000,flag:true,flagNote:"Verify Reg W threshold - Due to Block Inc. $4.25M"},
  ],
  sox:[
    {id:"SOX-001",control:"Journal Entry Authorization",owner:"Controller",frequency:"Monthly",lastTested:"2023-10-15",status:"OVERDUE",risk:"HIGH",narrative:"All JEs over $50K require dual approval before posting to GL."},
    {id:"SOX-002",control:"Bank Reconciliation Completeness",owner:"Sr. Accountant",frequency:"Monthly",lastTested:"2024-01-15",status:"CURRENT",risk:"HIGH",narrative:"Cash accounts reconciled within 3 business days of month-end."},
    {id:"SOX-003",control:"CECL Reserve Calculation Review",owner:"CFO",frequency:"Quarterly",lastTested:"2023-12-31",status:"CURRENT",risk:"HIGH",narrative:"CECL model reviewed quarterly by CFO and external auditors."},
    {id:"SOX-004",control:"Regulation W Monitoring",owner:"Compliance",frequency:"Monthly",lastTested:"2024-01-31",status:"CURRENT",risk:"HIGH",narrative:"All intercompany transactions with Block Inc. reviewed against 10% capital threshold."},
    {id:"SOX-005",control:"Settlement Reconciliation",owner:"Sr. Accountant",frequency:"Daily",lastTested:"2024-01-30",status:"CURRENT",risk:"MED",narrative:"Daily settlement batches reconciled within T+1. Aged items >3 days escalated."},
    {id:"SOX-006",control:"Access Controls - NetSuite",owner:"IT/Finance",frequency:"Quarterly",lastTested:"2023-09-30",status:"OVERDUE",risk:"MED",narrative:"User access review for NetSuite GL posting rights. SoD verified."},
  ],
  regW:[
    {id:"RW-001",date:"2024-01-05",counterparty:"Block Inc.",type:"Management Fee",amt:425000,capitalPct:0.5,flag:false,memo:"Monthly ICA management fee - recurring"},
    {id:"RW-002",date:"2024-01-12",counterparty:"Block Inc. Treasury",type:"Cash Transfer",amt:2100000,capitalPct:2.47,flag:false,memo:"Intercompany cash sweep - per treasury agreement"},
    {id:"RW-003",date:"2024-01-19",counterparty:"Cash App (Block subsidiary)",type:"Data Services",amt:180000,capitalPct:0.21,flag:false,memo:"Monthly data sharing fee - per MSA dated 2022-06-01"},
    {id:"RW-004",date:"2024-01-25",counterparty:"Block Inc. - Afterpay",type:"BNPL Origination Funding",amt:7500000,capitalPct:8.82,flag:true,memo:"APPROACHING THRESHOLD - $7.5M = 8.82% of $85M Tier 1. Board notification required."},
  ],
  pbc:[
    {id:"PBC-001",request:"Trial Balance - January 2024",requestor:"Deloitte",due:"2024-02-07",status:"DELIVERED",owner:"Sr. Accountant",deliveredDate:"2024-02-05"},
    {id:"PBC-002",request:"Loan Portfolio Schedule with CECL workpapers",requestor:"Deloitte",due:"2024-02-07",status:"IN REVIEW",owner:"Controller",deliveredDate:null},
    {id:"PBC-003",request:"Reg W transaction log YTD",requestor:"OCC Examiner",due:"2024-02-14",status:"OPEN",owner:"Compliance",deliveredDate:null},
    {id:"PBC-004",request:"Settlement reconciliation - Dec & Jan",requestor:"Deloitte",due:"2024-02-10",status:"IN REVIEW",owner:"Sr. Accountant",deliveredDate:null},
    {id:"PBC-005",request:"SOX control testing evidence - SOX-001, SOX-006",requestor:"Internal Audit",due:"2024-02-05",status:"OPEN",owner:"Controller",deliveredDate:null,urgent:true},
    {id:"PBC-006",request:"Board minutes - Q4 2023 capital resolution",requestor:"OCC Examiner",due:"2024-02-14",status:"DELIVERED",owner:"General Counsel",deliveredDate:"2024-02-01"},
  ],
};

const SYSTEM = `You are SFS ACCOUNTING ASSISTANT for Square Financial Services, a bank subsidiary of Block Inc. Automate bank accounting workflows - journal entries, reconciliations, CECL, Reg W, Call Report, SOX. Flag [HIGH], [MED], [LOW] issues. Mark [HUMAN REVIEW REQUIRED] on estimates. End with READY TO POST: YES/NO and REGULATORY RISK: LOW/MEDIUM/HIGH.`;

const callClaude = async (prompt, system, maxTokens=1800) => {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:maxTokens,system:system||SYSTEM,messages:[{role:"user",content:prompt}]})
  });
  if(!res.ok) throw new Error("API "+res.status);
  const j = await res.json();
  return j.content?.[0]?.text||"";
};

function StatusBadge({status}) {
  const cfg={
    "RECONCILED":{bg:T.greenDim,color:T.greenBr,border:T.green},
    "EXCEPTION":{bg:T.redDim,color:T.redBr,border:T.red},
    "CURRENT":{bg:T.greenDim,color:T.greenBr,border:T.green},
    "OVERDUE":{bg:T.redDim,color:T.redBr,border:T.red},
    "DELIVERED":{bg:T.greenDim,color:T.greenBr,border:T.green},
    "IN REVIEW":{bg:T.amberDim,color:T.amberBr,border:T.amber},
    "OPEN":{bg:T.blueDim,color:T.blueBr,border:T.blue},
    "SAFE":{bg:T.greenDim,color:T.greenBr,border:T.green},
    "REVIEW":{bg:T.amberDim,color:T.amberBr,border:T.amber},
  }[status]||{bg:T.card,color:T.muted,border:T.border};
  return <span style={{fontFamily:T.mono,fontSize:9,fontWeight:700,padding:"2px 8px",borderRadius:4,background:cfg.bg,color:cfg.color,border:"1px solid "+cfg.border+"55",whiteSpace:"nowrap"}}>{status}</span>;
}

function THead({cols}) {
  return <thead><tr style={{background:"#040810"}}>
    {cols.map((c,i)=><th key={i} style={{padding:"10px 14px",textAlign:typeof c==="object"?c.align||"left":"left",fontFamily:T.mono,fontSize:11,fontWeight:700,color:T.blueBr,letterSpacing:"0.5px",borderBottom:"2px solid "+T.borderHi,whiteSpace:"nowrap"}}>{typeof c==="object"?c.label:c}</th>)}
  </tr></thead>;
}

function Flag({level,text}) {
  const cfg={HIGH:{bg:T.redDim,b:T.red,color:T.redBr},MED:{bg:T.amberDim,b:T.amber,color:T.amberBr},LOW:{bg:T.blueDim,b:T.blue,color:T.blueBr}}[level]||{bg:T.blueDim,b:T.blue,color:T.blueBr};
  return <div style={{background:cfg.bg,borderLeft:"3px solid "+cfg.b,padding:"8px 14px",margin:"4px 0",borderRadius:"0 5px 5px 0",fontFamily:T.mono,fontSize:12,color:cfg.color,lineHeight:1.7}}>[{level}] {text}</div>;
}

function SmartOutput({text}) {
  if(!text) return null;
  return <div>{text.split("\n").map((raw,i)=>{
    const t=raw.trim();
    if(!t) return <div key={i} style={{height:6}}/>;
    if(/^(SUMMARY|ANALYSIS|JOURNAL|RECONCIL|EXCEPTIONS|DOUBLE-ENTRY|READY TO POST|REGULATORY RISK)/i.test(t)&&!t.startsWith("[")) {
      return <div key={i} style={{marginTop:20,marginBottom:8,paddingBottom:6,borderBottom:"1px solid "+T.border}}>
        <span style={{fontFamily:T.display,fontSize:14,fontWeight:700,color:T.blueBr}}>{t.replace(/-+$/,"").trim()}</span>
      </div>;
    }
    const fl=t.match(/^\[(HIGH|MED|LOW|HUMAN REVIEW)\]/i);
    if(fl){
      const l=fl[1].toUpperCase();
      const c={HIGH:{bg:T.redDim,b:T.red,color:T.redBr},MED:{bg:T.amberDim,b:T.amber,color:T.amberBr},LOW:{bg:T.blueDim,b:T.blue,color:T.blueBr},"HUMAN REVIEW":{bg:"#160a00",b:T.amber,color:"#ffd080"}}[l]||{bg:T.blueDim,b:T.blue,color:T.blueBr};
      return <div key={i} style={{background:c.bg,borderLeft:"3px solid "+c.b,padding:"8px 14px",margin:"4px 0",borderRadius:"0 5px 5px 0",fontFamily:T.mono,fontSize:12,color:c.color,lineHeight:1.7}}>{t}</div>;
    }
    if(/READY TO POST|REGULATORY RISK/i.test(t)){
      const good=/YES|LOW/.test(t);const bad=/NO|HIGH/.test(t);
      return <div key={i} style={{background:good?T.greenDim:bad?T.redDim:T.amberDim,border:"1px solid "+(good?T.green:bad?T.red:T.amber)+"44",padding:"9px 13px",borderRadius:5,margin:"10px 0",fontFamily:T.mono,fontSize:12,color:good?T.greenBr:bad?T.redBr:T.amberBr,fontWeight:700}}>{t}</div>;
    }
    return <div key={i} style={{fontFamily:T.mono,fontSize:12.5,lineHeight:1.9,color:T.txt,marginBottom:1}}>{raw}</div>;
  })}</div>;
}

const NAV_ITEMS = [
  {group:"ACCOUNTING",items:[
    {id:"overview",label:"Overview"},
    {id:"je",label:"Journal Entries"},
    {id:"recon",label:"Reconciliations"},
    {id:"flux",label:"Flux Analysis"},
    {id:"cecl",label:"CECL Model"},
    {id:"sox",label:"SOX Controls"},
    {id:"pbc",label:"Audit Tracker"},
  ]},
  {group:"REGULATORY",items:[
    {id:"callreport",label:"Call Report"},
    {id:"axiomsl",label:"AxiomSL"},
    {id:"regw",label:"Reg W"},
    {id:"ai",label:"AI Analysis"},
  ]},
];

const TAB_COLORS = {
  overview:"#38bdf8",je:"#34d399",recon:"#f59e0b",flux:"#0ea5e9",
  cecl:"#34d399",sox:"#f59e0b",pbc:"#7fa8c8",
  callreport:"#a78bfa",axiomsl:"#a78bfa",regw:"#ef4444",ai:"#fcd34d",
};

export default function App() {
  const [tab,setTab]           = useState("overview");
  const [platform,setPlatform] = useState("netsuite");
  const [inputMode,setInput]   = useState("sample");
  const [analysis,setAnalysis] = useState(null);
  const [running,setRunning]   = useState(false);
  const [error,setError]       = useState(null);
  const [periods,setPeriods]   = useState({});
  const [activePeriod,setActive] = useState(null);
  const [pendingLabel,setPending] = useState("");
  const [pendingSource,setPendingSource] = useState("NetSuite");
  const [showModal,setShowModal] = useState(false);
  const [tempFile,setTempFile] = useState(null);
  const [drag,setDrag]         = useState(false);
  const fileRef = useRef(null);

  const handleFile = (file) => {
    if(!file) return;
    const r = new FileReader();
    r.onload = e => { setTempFile({name:file.name,text:e.target.result}); setShowModal(true); };
    r.readAsText(file);
  };

  const confirmUpload = () => {
    if(!tempFile||!pendingLabel.trim()) return;
    const key = pendingLabel.trim();
    setPeriods(p=>({...p,[key]:{name:tempFile.name,text:tempFile.text,source:pendingSource,uploadedAt:new Date().toLocaleDateString()}}));
    setActive(key); setTempFile(null); setPending(""); setShowModal(false);
  };

  const removePeriod = (key) => {
    setPeriods(p=>{const n={...p};delete n[key];return n;});
    if(activePeriod===key) setActive(null);
  };

  const totalExceptions = SAMPLE.reconciliations.filter(r=>r.status==="EXCEPTION").length;
  const overdueControls = SAMPLE.sox.filter(s=>s.status==="OVERDUE").length;
  const regWHigh        = SAMPLE.regW.filter(r=>r.flag).length;
  const openPBC         = SAMPLE.pbc.filter(p=>p.status==="OPEN"||p.status==="IN REVIEW").length;
  const tier1           = 85000000;
  const regWTotal       = SAMPLE.regW.reduce((s,r)=>s+r.amt,0);
  const regWPct         = (regWTotal/tier1)*100;

  const badges = {recon:totalExceptions||null,sox:overdueControls||null,pbc:openPBC||null,regw:regWHigh||null};
  const activeColor = TAB_COLORS[tab]||"#38bdf8";

  const runAI = useCallback(async () => {
    setRunning(true); setError(null); setAnalysis(null);
    try {
      let prompt;
      if(inputMode==="upload"&&Object.keys(periods).length>0) {
        const keys = Object.keys(periods);
        prompt = keys.length===1
          ? `Analyze this CSV for Square Financial Services - Period: ${keys[0]}.\n\n${periods[keys[0]].text}`
          : `Analyze these ${keys.length} periods for SFS. Compare trends and flag exceptions.\n\n`+keys.map(k=>`=== ${k} ===\n${periods[k].text}`).join("\n\n");
      } else {
        prompt = `Perform a complete SFS month-end review for January 2024. Data:\n${JSON.stringify(SAMPLE,null,2)}`;
      }
      const result = await callClaude(prompt,SYSTEM,1800);
      setAnalysis(result);
    } catch(e) { setError("Error: "+e.message); } finally { setRunning(false); }
  },[inputMode,periods,activePeriod]);

  return (
    <div style={{background:T.bg,height:"100vh",display:"flex",flexDirection:"column",fontFamily:T.sans,color:T.txt,overflow:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-thumb{background:${T.border};border-radius:3px;}
        button{cursor:pointer;transition:all .15s;}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .pu{animation:pulse 1.5s ease infinite;}
        .sp{animation:spin .8s linear infinite;display:inline-block;}
        tr:hover td{background:${T.panel}!important;}
        .nav-btn:hover{background:#0a1628!important;}
      `}</style>

      {/* HEADER */}
      <div style={{background:"#02060e",borderBottom:"1px solid "+T.border,height:46,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 16px 0 0",flexShrink:0}}>
        <div style={{width:200,display:"flex",alignItems:"center",gap:10,padding:"0 16px",borderRight:"1px solid "+T.border,height:"100%",flexShrink:0}}>
          <div style={{display:"flex",flexDirection:"column",gap:2}}>
            <div style={{width:20,height:2,background:T.blue,borderRadius:1}}/>
            <div style={{width:14,height:2,background:T.green,borderRadius:1}}/>
            <div style={{width:10,height:2,background:T.amber,borderRadius:1}}/>
          </div>
          <div>
            <div style={{fontSize:17,fontWeight:900,color:T.blueBr,letterSpacing:"1px"}}>SFS</div>
            <div style={{fontFamily:T.mono,fontSize:7,color:T.faint,letterSpacing:"1.5px"}}>ACCOUNTING & COMPLIANCE</div>
          </div>
        </div>
        <div style={{flex:1,padding:"0 20px",display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:12,color:T.muted}}>Square Financial Services</span>
          <span style={{color:T.faint}}>›</span>
          <span style={{fontSize:13,color:activeColor,fontWeight:600}}>
            {NAV_ITEMS.flatMap(g=>g.items).find(i=>i.id===tab)?.label||"Overview"}
          </span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{fontFamily:T.mono,fontSize:9,color:activePeriod?T.greenBr:T.faint}}>
            {activePeriod||SAMPLE.period}
          </div>
          <div style={{background:T.card,border:"1px solid "+T.borderHi,borderRadius:6,overflow:"hidden",display:"flex"}}>
            {[["axiomsl","AxiomSL",T.purple],["netsuite","NetSuite",T.blue],["snowflake","Snowflake",T.blue],["workiva","Workiva",T.blue]].map(([v,l,col])=>(
              <button key={v} onClick={()=>setPlatform(v)} style={{padding:"5px 11px",background:platform===v?(v==="axiomsl"?T.purple:T.blue):"transparent",color:platform===v?"#fff":T.muted,border:"none",borderRight:"1px solid "+T.border,fontSize:10,fontWeight:platform===v?700:400,fontFamily:T.sans}}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      {/* BODY */}
      <div style={{flex:1,display:"flex",overflow:"hidden",minHeight:0}}>

        {/* SIDEBAR */}
        <div style={{width:200,background:"#020609",borderRight:"1px solid "+T.border,display:"flex",flexDirection:"column",flexShrink:0,overflowY:"auto"}}>
          {NAV_ITEMS.map(({group,items})=>(
            <div key={group}>
              <div style={{padding:"14px 14px 6px",fontFamily:T.mono,fontSize:8,color:group==="REGULATORY"?T.purpleBr:T.faint,letterSpacing:"2px",fontWeight:700}}>{group}</div>
              {items.map(({id,label})=>{
                const active=tab===id;
                const badge=badges[id];
                return (
                  <button key={id} className="nav-btn" onClick={()=>setTab(id)}
                    style={{width:"100%",textAlign:"left",padding:"9px 14px",background:active?"#0a1628":"transparent",border:"none",borderLeft:"3px solid "+(active?activeColor:"transparent"),display:"flex",alignItems:"center",gap:9}}>
                    <span style={{fontSize:12.5,fontWeight:active?600:400,color:active?activeColor:T.muted,flex:1}}>{label}</span>
                    {badge&&<span style={{background:id==="regw"?T.amber:T.red,color:id==="regw"?"#000":"#fff",borderRadius:10,padding:"1px 6px",fontSize:8,fontWeight:700}}>{badge}</span>}
                  </button>
                );
              })}
            </div>
          ))}
          <div style={{flex:1}}/>
          <div style={{padding:"12px 14px",borderTop:"1px solid "+T.border}}>
            <div style={{fontFamily:T.mono,fontSize:8,color:T.faint,marginBottom:4}}>ACTIVE PERIOD</div>
            <div style={{fontFamily:T.mono,fontSize:10,color:activePeriod?T.greenBr:T.faint}}>{activePeriod||SAMPLE.period}</div>
          </div>
        </div>

        {/* MAIN */}
        <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column",minHeight:0}}>

          {/* OVERVIEW */}
          {tab==="overview"&&(
            <div style={{flex:1,overflowY:"auto",padding:"18px 22px 36px"}}>
              <div style={{marginBottom:20}}>
                <div style={{fontSize:22,fontWeight:700,color:T.blueBr}}>SFS Month-End Dashboard</div>
                <div style={{fontSize:12,color:T.muted,marginTop:4}}>{SAMPLE.period} · Square Financial Services · Block Inc. Subsidiary</div>
              </div>

              {(totalExceptions>0||overdueControls>0||regWHigh>0)&&(
                <div style={{background:T.redDim,border:"1px solid "+T.red+"44",borderRadius:6,padding:"10px 14px",marginBottom:14,display:"flex",gap:16,alignItems:"center",flexWrap:"wrap"}}>
                  <span style={{fontFamily:T.mono,fontSize:11,fontWeight:700,color:T.redBr}}>ATTENTION REQUIRED</span>
                  {totalExceptions>0&&<span style={{fontFamily:T.mono,fontSize:10,color:T.redBr}}>{totalExceptions} recon exceptions</span>}
                  {overdueControls>0&&<span style={{fontFamily:T.mono,fontSize:10,color:T.redBr}}>{overdueControls} SOX controls overdue</span>}
                  {regWHigh>0&&<span style={{fontFamily:T.mono,fontSize:10,color:T.amberBr}}>1 Reg W transaction approaching threshold</span>}
                </div>
              )}

              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:20}}>
                {[
                  {label:"Loan Portfolio",val:fmtK(45200000),sub:"+$3.4M MoM",good:true,note:"23 new advances"},
                  {label:"BNPL Receivables",val:fmtK(12840000),sub:"+14.6% MoM",good:true,note:"Afterpay volume"},
                  {label:"Total Deposits",val:fmtK(62100000),sub:"+$3.2M MoM",good:true,note:"Tracking loan growth"},
                  {label:"Tier 1 Capital",val:fmtK(85000000),sub:"CET1: 12.0%",good:true,note:"Above 8% minimum"},
                  {label:"NIM",val:"5.00%",sub:"Stable MoM",good:true,note:"Interest income / assets"},
                  {label:"Reg W Exposure",val:fmtP(regWPct),sub:fmtK(regWTotal)+" total",good:regWPct<8,note:"10% threshold = $8.5M"},
                  {label:"Recon Exceptions",val:totalExceptions,sub:"2 accounts",good:false,note:"BNPL + Merchant Pay"},
                  {label:"SOX Overdue",val:overdueControls,sub:"SOX-001, SOX-006",good:false,note:"Remediate immediately"},
                ].map((k,i)=>(
                  <div key={i} style={{background:k.good?T.card:T.redDim,border:"1px solid "+(k.good?T.border:T.red+"44"),borderRadius:8,padding:"12px 14px"}}>
                    <div style={{fontFamily:T.mono,fontSize:10,color:T.muted,marginBottom:8,textTransform:"uppercase",fontWeight:600}}>{k.label}</div>
                    <div style={{fontFamily:T.mono,fontSize:22,fontWeight:700,color:k.good?T.blueBr:T.redBr,lineHeight:1,marginBottom:6}}>{k.val}</div>
                    <div style={{fontSize:11,color:k.good?T.greenBr:T.redBr,marginBottom:4,fontWeight:500}}>{k.sub}</div>
                    <div style={{fontSize:11,color:T.muted}}>{k.note}</div>
                  </div>
                ))}
              </div>

              <div style={{background:T.card,border:"1px solid "+T.border,borderRadius:8,padding:"14px 16px",marginBottom:16}}>
                <div style={{fontFamily:T.mono,fontSize:9,color:T.faint,letterSpacing:"1.5px",marginBottom:12,textTransform:"uppercase"}}>Month-End Close Checklist</div>
                <div style={{display:"flex",flexDirection:"column",gap:4}}>
                  {[
                    {task:"Post all journal entries",status:"REVIEW",note:"2 entries require approval"},
                    {task:"Reconcile all GL accounts",status:"EXCEPTION",note:"BNPL + Merchant Payables"},
                    {task:"CECL reserve calculation",status:"REVIEW",note:"CFO sign-off required"},
                    {task:"Reg W threshold check",status:"REVIEW",note:"Afterpay at 8.82% - monitor"},
                    {task:"SOX control sign-offs",status:"EXCEPTION",note:"SOX-001, SOX-006 overdue"},
                    {task:"Call Report mapping",status:"REVIEW",note:"RC-O line 11 flagged"},
                    {task:"PBC requests",status:"REVIEW",note:openPBC+" open/in-review items"},
                    {task:"Controller review package",status:"OPEN",note:"Flux commentary pending AI"},
                  ].map((item,i)=>{
                    const col=item.status==="EXCEPTION"?T.red:item.status==="REVIEW"?T.amber:T.blue;
                    return (
                      <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 12px",background:T.card,borderLeft:"3px solid "+col,borderRadius:"0 5px 5px 0",border:"1px solid "+T.border}}>
                        <span style={{color:col,fontSize:11,width:14,textAlign:"center"}}>{item.status==="EXCEPTION"?"x":item.status==="REVIEW"?"!":"o"}</span>
                        <span style={{fontSize:12,fontWeight:600,color:T.txt,whiteSpace:"nowrap"}}>{item.task}</span>
                        <span style={{fontSize:11,color:T.muted}}>{item.note}</span>
                        <div style={{marginLeft:"auto"}}><StatusBadge status={item.status}/></div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Period Manager */}
              <div style={{background:T.surf,border:"1px solid "+T.border,borderRadius:8,padding:"16px",marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <div style={{fontFamily:T.mono,fontSize:8,color:T.faint,letterSpacing:"2px",textTransform:"uppercase"}}>Period Manager</div>
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={()=>setInput("sample")} style={{padding:"4px 10px",background:inputMode==="sample"?T.blue:T.card,color:inputMode==="sample"?"#fff":T.muted,border:"1px solid "+(inputMode==="sample"?T.blue:T.border),borderRadius:5,fontSize:9.5,fontFamily:T.mono}}>Sample Data</button>
                    <button onClick={()=>setInput("upload")} style={{padding:"4px 10px",background:inputMode==="upload"?T.blue:T.card,color:inputMode==="upload"?"#fff":T.muted,border:"1px solid "+(inputMode==="upload"?T.blue:T.border),borderRadius:5,fontSize:9.5,fontFamily:T.mono}}>Upload CSV</button>
                  </div>
                </div>

                {inputMode==="sample"&&(
                  <div style={{background:T.card,border:"1px solid "+T.border,borderRadius:6,padding:"10px 12px"}}>
                    <div style={{fontFamily:T.mono,fontSize:8,color:T.faint,marginBottom:5}}>SAMPLE - JANUARY 2024 - SQUARE FINANCIAL SERVICES</div>
                    <div style={{fontSize:11,color:T.muted,lineHeight:1.7}}>8 journal entries · 7 reconciliations · flux analysis · Call Report · 6 SOX controls · 4 Reg W transactions · 6 PBC requests</div>
                  </div>
                )}

                {inputMode==="upload"&&(
                  <div>
                    {Object.keys(periods).length>0&&(
                      <div style={{marginBottom:12}}>
                        <div style={{fontFamily:T.mono,fontSize:8,color:T.faint,letterSpacing:"1px",marginBottom:7,textTransform:"uppercase"}}>Loaded Periods</div>
                        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                          {Object.entries(periods).map(([key,p])=>(
                            <div key={key} style={{display:"flex",alignItems:"center",background:activePeriod===key?T.blueDim:T.card,border:"1px solid "+(activePeriod===key?T.blue:T.border),borderRadius:6,overflow:"hidden"}}>
                              <button onClick={()=>setActive(key)} style={{padding:"5px 10px",background:"transparent",border:"none",color:activePeriod===key?T.blueBr:T.muted,fontFamily:T.mono,fontSize:10,fontWeight:activePeriod===key?700:400}}>
                                {activePeriod===key?"> ":""}{key} <span style={{fontSize:8.5,color:T.faint}}>{p.source}</span>
                              </button>
                              <button onClick={()=>removePeriod(key)} style={{padding:"5px 8px",background:"transparent",border:"none",borderLeft:"1px solid "+T.border,color:T.faint,fontSize:10}}>x</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div onDragEnter={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)} onDragOver={e=>e.preventDefault()}
                      onDrop={e=>{e.preventDefault();setDrag(false);handleFile(e.dataTransfer.files[0]);}}
                      onClick={()=>fileRef.current?.click()}
                      style={{border:"1px dashed "+(drag?T.amber:T.borderHi),borderRadius:7,padding:"18px",textAlign:"center",background:drag?T.amberDim:T.card,cursor:"pointer"}}>
                      <input ref={fileRef} type="file" accept=".csv,.txt,.tsv" style={{display:"none"}} onChange={e=>{handleFile(e.target.files?.[0]);e.target.value="";}}/>
                      <div style={{fontSize:20,color:T.muted,marginBottom:6,opacity:0.4}}>+</div>
                      <div style={{fontFamily:T.mono,fontSize:10,color:drag?T.amberBr:T.muted}}>DROP CSV OR CLICK TO BROWSE</div>
                      <div style={{fontSize:9,color:T.faint,marginTop:4}}>Each file = one period · Upload multiple · Switch with one click</div>
                    </div>
                  </div>
                )}
              </div>

              {showModal&&(
                <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"#000000aa",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <div style={{background:T.card,border:"1px solid "+T.borderHi,borderRadius:10,padding:"24px 28px",width:360}}>
                    <div style={{fontSize:16,fontWeight:700,color:T.blueBr,marginBottom:4}}>Name This Period</div>
                    <div style={{fontFamily:T.mono,fontSize:9,color:T.muted,marginBottom:16}}>File: {tempFile?.name}</div>
                    <input value={pendingLabel} onChange={e=>setPending(e.target.value)} placeholder="e.g. Jan 2024, Q1 2024"
                      onKeyDown={e=>e.key==="Enter"&&confirmUpload()}
                      style={{width:"100%",background:T.panel,border:"1px solid "+T.borderHi,borderRadius:6,padding:"9px 12px",fontFamily:T.mono,fontSize:12,color:T.txt,outline:"none",marginBottom:12}}/>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
                      {["NetSuite","Snowflake","Workiva","AxiomSL","Combined"].map(s=>(
                        <button key={s} onClick={()=>setPendingSource(s)}
                          style={{padding:"5px 10px",background:pendingSource===s?T.blue:T.panel,color:pendingSource===s?"#fff":T.muted,border:"1px solid "+(pendingSource===s?T.blue:T.border),borderRadius:5,fontSize:10,fontFamily:T.mono}}>{s}</button>
                      ))}
                    </div>
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={confirmUpload} disabled={!pendingLabel.trim()}
                        style={{flex:1,padding:"10px",background:pendingLabel.trim()?T.blue:T.border,color:"#fff",border:"none",borderRadius:6,fontWeight:700,fontSize:12,opacity:pendingLabel.trim()?1:0.4}}>Add Period</button>
                      <button onClick={()=>{setShowModal(false);setTempFile(null);setPending("");}}
                        style={{padding:"10px 14px",background:T.redDim,color:T.redBr,border:"1px solid "+T.red+"33",borderRadius:6,fontSize:12,fontFamily:T.mono}}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}

              <button onClick={()=>{setTab("ai");runAI();}} disabled={running||(inputMode==="upload"&&!activePeriod)}
                style={{width:"100%",padding:"13px",background:(inputMode==="sample"||(inputMode==="upload"&&activePeriod))?"linear-gradient(135deg,"+T.blue+","+T.green+"88)":T.card,color:(inputMode==="sample"||(inputMode==="upload"&&activePeriod))?"#fff":T.faint,border:"none",borderRadius:8,fontWeight:700,fontSize:13,boxShadow:(inputMode==="sample"||(inputMode==="upload"&&activePeriod))?"0 4px 24px "+T.blue+"40":"none",cursor:"pointer",opacity:running?0.5:1}}>
                {running?"Analyzing...":inputMode==="upload"&&!activePeriod?"Upload a CSV period above to run":"Run AI Analysis"+(activePeriod?" - "+activePeriod:" - Sample Data")}
              </button>
            </div>
          )}

          {/* JOURNAL ENTRIES */}
          {tab==="je"&&(
            <div style={{flex:1,overflowY:"auto",padding:"18px 24px 32px"}}>
              <div style={{marginBottom:20}}>
                <div style={{fontSize:22,fontWeight:700,color:T.blueBr}}>Journal Entries</div>
                <div style={{fontSize:12,color:T.muted,marginTop:4}}>{SAMPLE.period} · Ready for NetSuite import · {SAMPLE.journalEntries.length} entries</div>
              </div>
              <Flag level="MED" text="4 entries require Controller approval before posting - CECL reserve, BNPL, intercompany, reg capital"/>
              <div style={{height:14}}/>
              {SAMPLE.journalEntries.map((je,i)=>(
                <div key={i} style={{background:T.card,border:"1px solid "+(je.status==="REVIEW"?T.amber:T.border)+"55",borderLeft:"3px solid "+(je.status==="REVIEW"?T.amber:T.green)+"88",borderRadius:6,padding:"12px 16px",marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:8}}>
                    <div style={{display:"flex",gap:12,alignItems:"center"}}>
                      <span style={{fontFamily:T.mono,fontSize:12,fontWeight:700,color:T.blueBr}}>{je.id}</span>
                      <span style={{fontFamily:T.mono,fontSize:9.5,color:T.muted}}>{je.date}</span>
                      <span style={{fontFamily:T.mono,fontSize:10,color:T.muted,background:T.panel,border:"1px solid "+T.border,borderRadius:3,padding:"2px 9px"}}>{je.type}</span>
                    </div>
                    <StatusBadge status={je.status==="REVIEW"?"REVIEW":"SAFE"}/>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                    <div style={{background:T.blueDim,border:"1px solid "+T.blue+"22",borderRadius:5,padding:"8px 12px"}}>
                      <div style={{fontFamily:T.mono,fontSize:7.5,color:T.blue,letterSpacing:"1.5px",marginBottom:4,textTransform:"uppercase"}}>Debit</div>
                      <div style={{fontFamily:T.mono,fontSize:11.5,color:T.blueBr}}>{je.dr}</div>
                      <div style={{fontFamily:T.mono,fontSize:13,fontWeight:700,color:T.txt,marginTop:3}}>{fmt(je.amt)}</div>
                    </div>
                    <div style={{background:T.amberDim,border:"1px solid "+T.amber+"22",borderRadius:5,padding:"8px 12px"}}>
                      <div style={{fontFamily:T.mono,fontSize:7.5,color:T.amber,letterSpacing:"1.5px",marginBottom:4,textTransform:"uppercase"}}>Credit</div>
                      <div style={{fontFamily:T.mono,fontSize:11.5,color:T.amberBr}}>{je.cr}</div>
                      <div style={{fontFamily:T.mono,fontSize:13,fontWeight:700,color:T.txt,marginTop:3}}>{fmt(je.amt)}</div>
                    </div>
                  </div>
                  <div style={{fontSize:11,color:T.muted,fontStyle:"italic"}}>{je.memo}</div>
                </div>
              ))}
              <div style={{marginTop:16,background:T.greenDim,border:"1px solid "+T.green+"44",borderRadius:7,padding:"12px 16px",fontFamily:T.mono,fontSize:11,color:T.greenBr}}>
                Double-Entry Check: Total Debits = Total Credits = {fmt(SAMPLE.journalEntries.reduce((s,j)=>s+j.amt,0))} · Variance: $0.00 · STATUS: PASS
              </div>
            </div>
          )}

          {/* RECONCILIATIONS */}
          {tab==="recon"&&(
            <div style={{flex:1,overflowY:"auto",padding:"18px 24px 32px"}}>
              <div style={{marginBottom:20}}>
                <div style={{fontSize:22,fontWeight:700,color:T.blueBr}}>Account Reconciliations</div>
                <div style={{fontSize:12,color:T.muted,marginTop:4}}>{SAMPLE.period} · GL vs Product Ledger vs Bank · SOX-compliant</div>
              </div>
              {SAMPLE.reconciliations.filter(r=>r.status==="EXCEPTION").map((r,i)=>(
                <Flag key={i} level="HIGH" text={r.acct+" - Exception $"+Math.abs(r.diff).toLocaleString()+" - "+r.note+" - Aged "+r.aged+" days"}/>
              ))}
              <div style={{height:14}}/>
              <div style={{border:"1px solid "+T.border,borderRadius:8,overflow:"hidden"}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <THead cols={["Account","GL Balance","Product Ledger","Bank Balance","Difference","Aged","Status"]}/>
                  <tbody>
                    {SAMPLE.reconciliations.map((r,i)=>(
                      <tr key={i} style={{borderBottom:"1px solid "+T.border+"33",background:r.status==="EXCEPTION"?T.redDim+"44":"transparent"}}>
                        <td style={{padding:"10px 14px",fontFamily:T.mono,fontSize:12,color:T.txt,fontWeight:500}}>{r.acct}</td>
                        <td style={{padding:"10px 14px",fontFamily:T.mono,fontSize:12,color:T.txt,textAlign:"right"}}>{fmt(r.gl)}</td>
                        <td style={{padding:"10px 14px",fontFamily:T.mono,fontSize:12,color:r.product?T.txt:T.faint,textAlign:"right"}}>{r.product?fmt(r.product):"N/A"}</td>
                        <td style={{padding:"10px 14px",fontFamily:T.mono,fontSize:12,color:r.bank?T.txt:T.faint,textAlign:"right"}}>{r.bank?fmt(r.bank):"N/A"}</td>
                        <td style={{padding:"9px 12px",fontFamily:T.mono,fontSize:11,fontWeight:700,color:r.diff===0?T.greenBr:T.redBr,textAlign:"right"}}>{r.diff===0?"—":fmt(r.diff)}</td>
                        <td style={{padding:"9px 12px",fontFamily:T.mono,fontSize:11,color:r.aged>5?T.redBr:r.aged>0?T.amberBr:T.greenBr,textAlign:"center"}}>{r.aged>0?r.aged+" days":"—"}</td>
                        <td style={{padding:"9px 12px",textAlign:"center"}}><StatusBadge status={r.status}/></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* FLUX */}
          {tab==="flux"&&(
            <div style={{flex:1,overflowY:"auto",padding:"18px 24px 32px"}}>
              <div style={{marginBottom:20}}>
                <div style={{fontSize:22,fontWeight:700,color:T.blueBr}}>Flux Analysis</div>
                <div style={{fontSize:12,color:T.muted,marginTop:4}}>MoM balance sheet movement · Controller commentary</div>
              </div>
              <div style={{background:T.card,border:"1px solid "+T.border,borderRadius:8,padding:"14px 16px",marginBottom:18,borderLeft:"3px solid "+T.blue}}>
                <span style={{color:T.blueBr,fontWeight:600}}>Controller Commentary: </span>
                <span style={{fontSize:13,color:T.muted,lineHeight:1.8}}>January 2024 shows continued portfolio growth with loans up $3.4M (+8.1%) and BNPL receivables up $1.6M (+14.6%). NIM held stable at 5.0%. Primary concern is elevated provision for credit losses (+18.6% MoM) - CECL reserve rate should be reviewed by CFO before finalizing.</span>
              </div>
              <div style={{border:"1px solid "+T.border,borderRadius:8,overflow:"hidden"}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <THead cols={["Account","Dec 2023","Jan 2024",{label:"$ Change",align:"right"},{label:"% Change",align:"right"},"Driver"]}/>
                  <tbody>
                    {SAMPLE.flux.map((f,i)=>{
                      const isCost=/(provision|expense|loss)/i.test(f.acct);
                      const isGood=isCost?f.chg<0:f.chg>0;
                      return (
                        <tr key={i} style={{borderBottom:"1px solid "+T.border+"33",background:i%2===0?"transparent":T.card+"44"}}>
                          <td style={{padding:"10px 14px",fontSize:13,color:T.txt,fontWeight:600}}>{f.acct}</td>
                          <td style={{padding:"10px 14px",fontFamily:T.mono,fontSize:12,color:T.muted,textAlign:"right"}}>{fmtK(f.dec)}</td>
                          <td style={{padding:"9px 12px",fontFamily:T.mono,fontSize:11,color:T.txt,textAlign:"right",fontWeight:600}}>{fmtK(f.jan)}</td>
                          <td style={{padding:"9px 12px",fontFamily:T.mono,fontSize:11,fontWeight:700,color:isGood?T.greenBr:T.redBr,textAlign:"right"}}>{f.chg>=0?"+":""}{fmtK(f.chg)}</td>
                          <td style={{padding:"9px 12px",fontFamily:T.mono,fontSize:11,fontWeight:700,color:isGood?T.greenBr:T.redBr,textAlign:"right"}}>{fmtP(f.pct)}</td>
                          <td style={{padding:"9px 12px",fontSize:11,color:T.muted,lineHeight:1.4}}>{f.driver}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CECL */}
          {tab==="cecl"&&(
            <div style={{flex:1,overflowY:"auto",padding:"18px 24px 32px"}}>
              <div style={{marginBottom:20}}>
                <div style={{fontSize:22,fontWeight:700,color:T.blueBr}}>CECL Reserve Model - ASC 326</div>
                <div style={{fontSize:12,color:T.muted,marginTop:4}}>Current Expected Credit Loss · CFO approval required before posting</div>
              </div>
              <Flag level="HIGH" text="CECL reserve is an estimate - requires CFO sign-off every month before JE-SFS-002 posts"/>
              <Flag level="HIGH" text="Reserve shortfall - JE-SFS-002 posts $73,500 but model requires $384,600. Difference: $311,100. Escalate to CFO."/>
              <div style={{height:14}}/>
              <div style={{background:T.card,border:"1px solid "+T.border,borderRadius:8,padding:"18px 20px",marginBottom:18}}>
                <div style={{fontFamily:T.mono,fontSize:9,color:T.faint,letterSpacing:"1.5px",marginBottom:14,textTransform:"uppercase"}}>Model Inputs - January 2024</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
                  {[
                    {label:"Total Loan Portfolio",val:"$45,200,000",note:"Account 1200 - per GL"},
                    {label:"BNPL Receivables",val:"$12,840,000",note:"Account 1250 - Afterpay"},
                    {label:"Historical Loss Rate",val:"2.85%",note:"12-month trailing avg"},
                    {label:"Q-Factor Adjustment",val:"+0.15%",note:"Macro uncertainty adj"},
                    {label:"Applied Reserve Rate",val:"3.00%",note:"Historical + Q-Factor"},
                    {label:"Required Reserve",val:"$1,740,600",note:"Portfolio x Rate"},
                    {label:"Existing Allowance",val:"$1,356,000",note:"Account 1210 balance"},
                    {label:"Reserve Needed",val:"$384,600",note:"Required - Existing"},
                    {label:"JE-SFS-002 Amount",val:"$73,500",note:"SHORTFALL - see flag above"},
                  ].map((k,i)=>(
                    <div key={i} style={{background:T.panel,border:"1px solid "+(k.label==="JE-SFS-002 Amount"?T.red:T.border),borderRadius:7,padding:"12px 14px"}}>
                      <div style={{fontFamily:T.mono,fontSize:10,color:T.muted,marginBottom:6,fontWeight:600}}>{k.label}</div>
                      <div style={{fontFamily:T.mono,fontSize:15,fontWeight:700,color:k.label==="JE-SFS-002 Amount"?T.redBr:T.txt}}>{k.val}</div>
                      <div style={{fontSize:10,color:T.muted,marginTop:4}}>{k.note}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{border:"1px solid "+T.border,borderRadius:8,overflow:"hidden"}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <THead cols={["Segment","Balance","Loss Rate","Reserve Required","Prior Reserve","Change","Status"]}/>
                  <tbody>
                    {[
                      {seg:"Merchant Cash Advance",bal:28500000,rate:3.5,req:997500,prior:855000},
                      {seg:"Small Business Loans",bal:12400000,rate:2.2,req:272800,prior:248000},
                      {seg:"BNPL - Afterpay",bal:12840000,rate:1.8,req:231120,prior:210000},
                      {seg:"Personal Loans",bal:4300000,rate:4.1,req:176300,prior:163000},
                    ].map((r,i)=>(
                      <tr key={i} style={{borderBottom:"1px solid "+T.border+"33",background:i%2===0?"transparent":T.card+"44"}}>
                        <td style={{padding:"10px 14px",fontSize:13,color:T.txt,fontWeight:600}}>{r.seg}</td>
                        <td style={{padding:"9px 12px",fontFamily:T.mono,fontSize:11,color:T.muted,textAlign:"right"}}>{fmtK(r.bal)}</td>
                        <td style={{padding:"9px 12px",fontFamily:T.mono,fontSize:11,color:T.blueBr,textAlign:"right"}}>{r.rate}%</td>
                        <td style={{padding:"9px 12px",fontFamily:T.mono,fontSize:11,color:T.txt,textAlign:"right",fontWeight:600}}>{fmtK(r.req)}</td>
                        <td style={{padding:"9px 12px",fontFamily:T.mono,fontSize:11,color:T.muted,textAlign:"right"}}>{fmtK(r.prior)}</td>
                        <td style={{padding:"9px 12px",fontFamily:T.mono,fontSize:11,color:T.amberBr,textAlign:"right",fontWeight:700}}>+{fmtK(r.req-r.prior)}</td>
                        <td style={{padding:"9px 12px",textAlign:"center"}}><StatusBadge status="REVIEW"/></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CALL REPORT */}
          {tab==="callreport"&&(
            <div style={{flex:1,overflowY:"auto",padding:"18px 24px 32px"}}>
              <div style={{marginBottom:20}}>
                <div style={{fontSize:22,fontWeight:700,color:T.blueBr}}>Call Report Draft - FFIEC 041</div>
                <div style={{fontSize:12,color:T.muted,marginTop:4}}>Q4 2023 · Regulatory Filing · OCC Submission</div>
              </div>
              <Flag level="MED" text="RC-O Line 11 - Due to affiliates $4.25M - Verify Reg W threshold before filing"/>
              <div style={{height:14}}/>
              <div style={{border:"1px solid "+T.border,borderRadius:8,overflow:"hidden",marginBottom:20}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <THead cols={["Schedule","Line","Description","GL Account","GL Amount","CR Amount",{label:"Flag",align:"center"}]}/>
                  <tbody>
                    {SAMPLE.callReport.map((r,i)=>(
                      <tr key={i} style={{borderBottom:"1px solid "+T.border+"33",background:r.flag?T.amberDim+"44":"transparent"}}>
                        <td style={{padding:"9px 12px",fontFamily:T.mono,fontSize:11,color:T.purpleBr,fontWeight:700}}>{r.schedule}</td>
                        <td style={{padding:"9px 12px",fontFamily:T.mono,fontSize:11,color:T.muted,textAlign:"center"}}>{r.line}</td>
                        <td style={{padding:"9px 12px",fontSize:11.5,color:T.txt}}>{r.description}</td>
                        <td style={{padding:"9px 12px",fontFamily:T.mono,fontSize:10.5,color:T.faint}}>{r.glAcct}</td>
                        <td style={{padding:"9px 12px",fontFamily:T.mono,fontSize:11,color:T.muted,textAlign:"right"}}>{fmtK(r.glAmt)}</td>
                        <td style={{padding:"9px 12px",fontFamily:T.mono,fontSize:11,color:T.greenBr,textAlign:"right",fontWeight:600}}>{fmtK(r.crAmt)}</td>
                        <td style={{padding:"9px 12px",textAlign:"center"}}>{r.flag?<StatusBadge status="REVIEW"/>:<span style={{color:T.greenBr}}>v</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SOX */}
          {tab==="sox"&&(
            <div style={{flex:1,overflowY:"auto",padding:"18px 24px 32px"}}>
              <div style={{marginBottom:20}}>
                <div style={{fontSize:22,fontWeight:700,color:T.blueBr}}>SOX Controls & Documentation</div>
                <div style={{fontSize:12,color:T.muted,marginTop:4}}>{SAMPLE.period} · Internal Controls · Audit Readiness</div>
              </div>
              {SAMPLE.sox.filter(s=>s.status==="OVERDUE").map((s,i)=>(
                <Flag key={i} level="HIGH" text={s.id+" - "+s.control+" - OVERDUE - Owner: "+s.owner}/>
              ))}
              <div style={{height:14}}/>
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                {SAMPLE.sox.map((s,i)=>(
                  <div key={i} style={{background:T.card,border:"1px solid "+(s.status==="OVERDUE"?T.red:T.border)+"55",borderLeft:"3px solid "+(s.status==="OVERDUE"?T.red:s.risk==="HIGH"?T.amber:T.blue)+"88",borderRadius:7,padding:"14px 16px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8,flexWrap:"wrap",gap:8}}>
                      <div style={{display:"flex",gap:12,alignItems:"center"}}>
                        <span style={{fontFamily:T.mono,fontSize:12,fontWeight:700,color:T.blueBr}}>{s.id}</span>
                        <span style={{fontSize:14,fontWeight:700,color:T.txt}}>{s.control}</span>
                      </div>
                      <div style={{display:"flex",gap:8,alignItems:"center"}}>
                        <span style={{fontFamily:T.mono,fontSize:9,color:T.muted}}>{s.frequency} · Owner: {s.owner}</span>
                        <StatusBadge status={s.status}/>
                      </div>
                    </div>
                    <div style={{fontSize:12,color:T.muted,lineHeight:1.7,background:T.panel,borderRadius:5,padding:"8px 12px"}}>{s.narrative}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* REG W */}
          {tab==="regw"&&(
            <div style={{flex:1,overflowY:"auto",padding:"18px 24px 32px"}}>
              <div style={{marginBottom:20}}>
                <div style={{fontSize:22,fontWeight:700,color:T.blueBr}}>Regulation W - Related Party Monitoring</div>
                <div style={{fontSize:12,color:T.muted,marginTop:4}}>SFS vs Block Inc. · Tier 1 Capital: $85M · Threshold: $8.5M (10%)</div>
              </div>
              <div style={{background:T.card,border:"1px solid "+T.border,borderRadius:8,padding:"14px 16px",marginBottom:16}}>
                <div style={{fontFamily:T.mono,fontSize:9,color:T.faint,letterSpacing:"1.5px",marginBottom:12,textTransform:"uppercase"}}>Cumulative Exposure vs 10% Threshold</div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:8}}>
                  <div>
                    <div style={{fontFamily:T.mono,fontSize:24,fontWeight:700,color:regWPct>8?T.amberBr:T.greenBr}}>{fmtP(regWPct)}</div>
                    <div style={{fontFamily:T.mono,fontSize:10,color:T.muted}}>of Tier 1 Capital · {fmtK(regWTotal)} total</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontFamily:T.mono,fontSize:11,color:T.muted}}>Remaining headroom:</div>
                    <div style={{fontFamily:T.mono,fontSize:16,fontWeight:700,color:T.greenBr}}>{fmtK(tier1*0.10-regWTotal)}</div>
                  </div>
                </div>
                <div style={{height:10,background:T.border,borderRadius:5,overflow:"hidden"}}>
                  <div style={{height:"100%",width:regWPct+"%",background:regWPct>8?"linear-gradient(90deg,"+T.green+","+T.amber+","+T.red+")":"linear-gradient(90deg,"+T.green+","+T.greenBr+")",borderRadius:5}}/>
                </div>
              </div>
              {SAMPLE.regW.filter(r=>r.flag).map((r,i)=>(
                <Flag key={i} level="HIGH" text={r.id+" - "+r.counterparty+" - "+r.type+" - "+fmtK(r.amt)+" - "+r.capitalPct.toFixed(2)+"% of Tier 1"}/>
              ))}
              <div style={{height:14}}/>
              <div style={{border:"1px solid "+T.border,borderRadius:8,overflow:"hidden",marginBottom:16}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <THead cols={["Ref","Date","Counterparty","Type","Amount","% Capital","Flag"]}/>
                  <tbody>
                    {SAMPLE.regW.map((r,i)=>(
                      <tr key={i} style={{borderBottom:"1px solid "+T.border+"33",background:r.flag?T.amberDim+"44":"transparent"}}>
                        <td style={{padding:"9px 12px",fontFamily:T.mono,fontSize:10,color:T.blueBr,fontWeight:700}}>{r.id}</td>
                        <td style={{padding:"9px 12px",fontFamily:T.mono,fontSize:10,color:T.muted}}>{r.date}</td>
                        <td style={{padding:"10px 14px",fontSize:13,color:T.txt,fontWeight:600}}>{r.counterparty}</td>
                        <td style={{padding:"9px 12px",fontFamily:T.mono,fontSize:10,color:T.faint}}>{r.type}</td>
                        <td style={{padding:"9px 12px",fontFamily:T.mono,fontSize:11,color:T.txt,textAlign:"right",fontWeight:600}}>{fmtK(r.amt)}</td>
                        <td style={{padding:"9px 12px",fontFamily:T.mono,fontSize:11,textAlign:"right",fontWeight:700,color:r.capitalPct>8?T.amberBr:r.capitalPct>5?T.blueBr:T.greenBr}}>{r.capitalPct.toFixed(2)}%</td>
                        <td style={{padding:"9px 12px",textAlign:"center"}}>{r.flag?<StatusBadge status="REVIEW"/>:<span style={{color:T.greenBr}}>v</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* AUDIT TRACKER */}
          {tab==="pbc"&&(
            <div style={{flex:1,overflowY:"auto",padding:"18px 24px 32px"}}>
              <div style={{marginBottom:20}}>
                <div style={{fontSize:22,fontWeight:700,color:T.blueBr}}>Audit Request Tracker - PBC Log</div>
                <div style={{fontSize:12,color:T.muted,marginTop:4}}>{SAMPLE.period} · Deloitte · OCC Examiner · Internal Audit</div>
              </div>
              {SAMPLE.pbc.filter(p=>p.urgent).map((p,i)=>(
                <Flag key={i} level="HIGH" text={p.id+" - "+p.request+" - URGENT - Due "+p.due}/>
              ))}
              <div style={{height:14}}/>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
                {[
                  {label:"Open",count:SAMPLE.pbc.filter(p=>p.status==="OPEN").length,color:T.blue,bg:T.blueDim},
                  {label:"In Review",count:SAMPLE.pbc.filter(p=>p.status==="IN REVIEW").length,color:T.amber,bg:T.amberDim},
                  {label:"Delivered",count:SAMPLE.pbc.filter(p=>p.status==="DELIVERED").length,color:T.green,bg:T.greenDim},
                ].map((s,i)=>(
                  <div key={i} style={{background:s.bg,border:"1px solid "+s.color+"33",borderRadius:8,padding:"14px",textAlign:"center"}}>
                    <div style={{fontFamily:T.mono,fontSize:28,fontWeight:700,color:s.color}}>{s.count}</div>
                    <div style={{fontFamily:T.mono,fontSize:9,color:T.muted,letterSpacing:"1.5px",textTransform:"uppercase"}}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div style={{border:"1px solid "+T.border,borderRadius:8,overflow:"hidden"}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <THead cols={["PBC ID","Request","Requestor","Due Date","Owner","Status","Delivered"]}/>
                  <tbody>
                    {SAMPLE.pbc.map((p,i)=>(
                      <tr key={i} style={{borderBottom:"1px solid "+T.border+"33",background:p.urgent?T.redDim+"44":i%2===0?"transparent":T.card+"44"}}>
                        <td style={{padding:"9px 12px",fontFamily:T.mono,fontSize:10,color:T.blueBr,fontWeight:700}}>{p.id}</td>
                        <td style={{padding:"10px 14px",fontSize:12,color:T.txt,fontWeight:500,maxWidth:220}}>{p.request}</td>
                        <td style={{padding:"9px 12px",fontFamily:T.mono,fontSize:10,color:T.muted}}>{p.requestor}</td>
                        <td style={{padding:"9px 12px",fontFamily:T.mono,fontSize:10,color:T.muted}}>{p.due}</td>
                        <td style={{padding:"9px 12px",fontSize:11,color:T.muted}}>{p.owner}</td>
                        <td style={{padding:"9px 12px"}}><StatusBadge status={p.status}/></td>
                        <td style={{padding:"9px 12px",fontFamily:T.mono,fontSize:10,color:T.muted}}>{p.deliveredDate||"—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* AXIOMSL */}
          {tab==="axiomsl"&&(
            <div style={{flex:1,overflowY:"auto",padding:"18px 24px 32px"}}>
              <div style={{marginBottom:20}}>
                <div style={{fontSize:22,fontWeight:700,color:T.purpleBr}}>AxiomSL - Regulatory Reporting Hub</div>
                <div style={{fontSize:12,color:T.muted,marginTop:4}}>FFIEC 041 Call Report · Reg W Monitor · Capital Adequacy · OCC Submission</div>
              </div>
              <div style={{background:T.purpleDim,border:"1px solid "+T.purple+"44",borderRadius:8,padding:"14px 16px",marginBottom:18,borderLeft:"3px solid "+T.purple}}>
                <div style={{fontSize:12,color:T.txt,lineHeight:1.9}}>AxiomSL is the regulatory reporting software SFS uses to prepare and submit filings to the OCC. It sits between your accounting data (NetSuite/Snowflake) and the regulator. Export data from NetSuite, import into AxiomSL, it maps to FFIEC schedules, validates, and submits. It also maintains the Reg W transaction log and Tier 1 capital calculations.</div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                {[
                  {title:"Call Report - FFIEC 041",color:T.purple,status:"Q4 2023 FILED · Q1 2024 DUE MAR 31",items:["Pull: Regulatory > Call Report > Export CSV","Schedules: RC-A, RC-C, RC-E, RC-R, RC-O","Upload to Call Report tab for AI mapping","Review RC-O Line 11 - Due to Block Inc."]},
                  {title:"Reg W Transaction Log",color:T.red,status:"JAN 2024 - THRESHOLD AT 8.82%",items:["Pull: Reg W Monitor > Transaction Log > Export CSV","Includes ALL covered transactions with Block subsidiaries","Upload to Reg W tab for threshold calculation","Board memo auto-generated when exposure >8%"]},
                  {title:"Capital Adequacy - Tier 1",color:T.green,status:"CET1: 12.0% - ABOVE 8% MINIMUM",items:["Pull: Capital > Tier 1 Schedule > Export CSV","Feeds RC-R Call Report schedule","Reg W threshold = 10% of this ($85M x 10% = $8.5M)","Monthly JE-SFS-008 allocates $500K to maintain 12%"]},
                  {title:"CECL Loss History",color:T.amber,status:"FEEDS CECL MODEL TAB",items:["Pull: CECL > Loss History > Export by Segment CSV","Historical loss rates by loan segment","Q-factor documentation approved by CFO","Upload to CECL Model tab for reserve calculation"]},
                ].map((m,i)=>(
                  <div key={i} style={{background:T.card,border:"1px solid "+m.color+"33",borderLeft:"3px solid "+m.color,borderRadius:8,padding:"14px 16px"}}>
                    <div style={{fontSize:13,fontWeight:700,color:m.color,marginBottom:4}}>{m.title}</div>
                    <div style={{fontFamily:T.mono,fontSize:8.5,color:T.faint,marginBottom:10}}>{m.status}</div>
                    {m.items.map((item,j)=>(
                      <div key={j} style={{display:"flex",gap:8,marginBottom:6,alignItems:"flex-start"}}>
                        <span style={{color:m.color,fontSize:8,flexShrink:0,marginTop:3}}>›</span>
                        <span style={{fontSize:11,color:T.muted,lineHeight:1.6}}>{item}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI ANALYSIS */}
          {tab==="ai"&&(
            <div style={{flex:1,overflowY:"auto",padding:"22px 28px 40px"}}>
              {running&&(
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:300,gap:16}}>
                  <div className="pu" style={{fontFamily:T.mono,fontSize:11,color:T.blueBr,letterSpacing:"2px",display:"flex",alignItems:"center",gap:10}}>
                    <span className="sp" style={{fontSize:18}}>o</span>SFS ACCOUNTING ASSISTANT - ANALYZING
                  </div>
                  <div style={{fontSize:13,color:T.muted,textAlign:"center",lineHeight:1.8}}>
                    Applying CECL · Reg W · Call Report · SOX framework...<br/>
                    <span style={{color:T.faint,fontSize:11}}>20-40 seconds</span>
                  </div>
                </div>
              )}
              {error&&<div style={{marginBottom:14,padding:"10px 14px",background:T.redDim,border:"1px solid "+T.red+"44",borderRadius:6,color:T.redBr,fontSize:12}}>{error}</div>}
              {!running&&analysis&&<SmartOutput text={analysis}/>}
              {!running&&!analysis&&(
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:300,gap:16,opacity:0.5}}>
                  <div style={{fontFamily:T.mono,fontSize:28,color:T.faint}}>o</div>
                  <div style={{fontFamily:T.mono,fontSize:11,color:T.muted,textAlign:"center",lineHeight:2}}>
                    No analysis yet<br/><span style={{color:T.faint,fontSize:10}}>Go to Overview and click Run AI Analysis</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* FOOTER */}
          <div style={{background:"#030a12",borderTop:"1px solid "+T.blue+"20",padding:"7px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
            <div style={{fontSize:11,color:T.blueBr}}><strong>Controller or CFO review required</strong> before posting, filing, or distributing.</div>
            <div style={{fontFamily:T.mono,fontSize:9,color:T.faint}}>FFIEC 041 · ASC 326 · Reg W · SOX · {SAMPLE.period}</div>
          </div>

        </div>
      </div>
    </div>
  );
}
