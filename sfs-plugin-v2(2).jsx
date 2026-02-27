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
  sans:"system-ui,sans-serif",
};

const fmt  = (n) => (n<0?"-":"")+"$"+Math.abs(Math.round(n)).toLocaleString();
const fmtK = (n) => { const a=Math.abs(n),s=n<0?"-":""; return a>=1000000?s+"$"+(a/1000000).toFixed(2)+"M":a>=1000?s+"$"+(a/1000).toFixed(0)+"K":s+"$"+Math.round(a); };
const fmtP = (n) => (n>0?"+":"")+n.toFixed(2)+"%";

// ── UPLOAD CONFIGS PER TAB ─────────────────────────────────────────────────
const UPLOAD_CONFIG = {
  je: {
    source: "NetSuite",
    label: "Journal Entry Log",
    hint: "NetSuite: Financial → Journal Entries → All → Export CSV\nInclude columns: Date, JE Ref, Prepared By, Approved By, Account, Debit, Credit, Memo",
    color: T.blue,
    quickPaths: [
      { sys: "NetSuite", col: T.blue, path: "Financial → Journal Entries → All → Export CSV" },
    ],
  },
  recon: {
    source: "NetSuite + Snowflake",
    label: "GL Trial Balance + Product Ledger",
    hint: "NetSuite: Financial → Trial Balance → Export CSV\nSnowflake: Run saved query 'product_ledger_balances' → Export CSV\nUpload both files — label which is which",
    color: T.green,
    quickPaths: [
      { sys: "NetSuite",  col: T.blue,  path: "Financial → Trial Balance → Export CSV" },
      { sys: "Snowflake", col: T.blue,  path: "Saved Queries → product_ledger_balances → Export CSV" },
    ],
  },
  flux: {
    source: "NetSuite",
    label: "Two-Period Trial Balance (Current + Prior Month)",
    hint: "NetSuite: Financial → Trial Balance → set date range for current month → Export CSV\nRepeat for prior month\nUpload both files",
    color: T.blue,
    quickPaths: [
      { sys: "NetSuite (current month)", col: T.blue, path: "Financial → Trial Balance → set Jan 2024 → Export CSV" },
      { sys: "NetSuite (prior month)",   col: T.blue, path: "Financial → Trial Balance → set Dec 2023 → Export CSV" },
    ],
  },
  cecl: {
    source: "NetSuite + Snowflake",
    label: "Loan Portfolio Detail + Loss History",
    hint: "NetSuite: Banking → Loan Schedule → Export CSV\nSnowflake: Run saved query 'cecl_loss_history_by_segment' → Export CSV",
    color: T.green,
    quickPaths: [
      { sys: "NetSuite",  col: T.blue, path: "Banking → Loan Schedule → Export CSV" },
      { sys: "Snowflake", col: T.blue, path: "Saved Queries → cecl_loss_history_by_segment → Export CSV" },
    ],
  },
  sox: {
    source: "Workiva",
    label: "SOX Controls Testing Log",
    hint: "Workiva: Controls → Control Library → Export to CSV\nInclude columns: Control ID, Owner, Frequency, Last Tested, Status, Evidence",
    color: T.purple,
    quickPaths: [
      { sys: "Workiva", col: T.purple, path: "Controls → Control Library → Export to CSV" },
    ],
  },
  pbc: {
    source: "Workiva",
    label: "PBC Request Tracker",
    hint: "Workiva: Audit → PBC Requests → Export CSV\nInclude columns: Request ID, Description, Requestor, Due Date, Owner, Status, Delivered Date",
    color: T.purple,
    quickPaths: [
      { sys: "Workiva", col: T.purple, path: "Audit → PBC Requests → Export CSV" },
    ],
  },
  callreport: {
    source: "AxiomSL",
    label: "FFIEC 041 Call Report Draft",
    hint: "AxiomSL: Regulatory → Call Report → FFIEC 041 → Export Working Draft CSV\nIncludes Schedule RC, RC-A, RC-C, RC-E, RC-R, RC-O",
    color: T.purpleBr,
    quickPaths: [
      { sys: "AxiomSL", col: T.purpleBr, path: "Regulatory → Call Report → FFIEC 041 → Export Working Draft CSV" },
    ],
  },
  axiomsl: {
    source: "AxiomSL",
    label: "Regulatory Package Export",
    hint: "AxiomSL: Reports → Full Regulatory Package → Export ZIP or CSV\nIncludes Call Report, Capital Adequacy, Reg W Transaction Log",
    color: T.purpleBr,
    quickPaths: [
      { sys: "AxiomSL", col: T.purpleBr, path: "Reports → Full Regulatory Package → Export CSV" },
    ],
  },
  regw: {
    source: "AxiomSL",
    label: "Reg W Transaction Log",
    hint: "AxiomSL: Compliance → Reg W Monitor → Transaction Log → Export CSV\nIncludes all covered transactions with Block Inc. subsidiaries YTD",
    color: T.red,
    quickPaths: [
      { sys: "AxiomSL", col: T.red, path: "Compliance → Reg W Monitor → Transaction Log → Export CSV" },
    ],
  },
};

const SOURCE_COLORS = {
  "NetSuite": T.blue,
  "Snowflake": T.blue,
  "Workiva": T.purple,
  "AxiomSL": T.purpleBr,
  "NetSuite + Snowflake": T.green,
  "AxiomSL + Workiva": T.purpleBr,
};

const SAMPLE = {
  period:"January 2024",
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
    {acct:"2200 Merchant Payables",gl:-3200000,product:-3412000,bank:null,diff:212000,status:"EXCEPTION",aged:3,note:"2 settlement batches pending"},
    {acct:"3100 Due to Block Inc.",gl:-4250000,product:null,bank:null,diff:0,status:"RECONCILED",aged:0},
  ],
  flux:[
    {acct:"Cash",dec:52100000,jan:48250000,chg:-3850000,pct:-7.39,driver:"Net settlement outflows exceed inflows"},
    {acct:"Loans Receivable",dec:41800000,jan:45200000,chg:3400000,pct:8.13,driver:"Strong merchant advance originations"},
    {acct:"BNPL Receivables",dec:11200000,jan:12840000,chg:1640000,pct:14.64,driver:"Afterpay volume up 14.6% MoM"},
    {acct:"Deposits",dec:-58900000,jan:-62100000,chg:-3200000,pct:5.43,driver:"Merchant deposit growth tracking loan growth"},
    {acct:"Interest Income",dec:174000,jan:187250,chg:13250,pct:7.61,driver:"Portfolio growth - NIM stable at 5.0%"},
    {acct:"Fee Income",dec:298000,jan:312000,chg:14000,pct:4.70,driver:"GMV growth - processing volume up 4.7%"},
    {acct:"Provision for Credit Losses",dec:62000,jan:73500,chg:11500,pct:18.55,driver:"Higher originations - higher CECL reserve"},
  ],
  callReport:[
    {schedule:"RC-A",line:"1.a",description:"Cash and balances due from depository institutions",glAcct:"1000",glAmt:48250000,crAmt:48250000,flag:false},
    {schedule:"RC-C",line:"1.a.1",description:"Construction, land development, and other land loans",glAcct:"1200",glAmt:45200000,crAmt:45200000,flag:false},
    {schedule:"RC-C",line:"6",description:"Credit cards and other revolving plans",glAcct:"1250",glAmt:12840000,crAmt:12840000,flag:false},
    {schedule:"RC-E",line:"1.a",description:"Total transaction accounts - demand deposits",glAcct:"2100",glAmt:62100000,crAmt:62100000,flag:false},
    {schedule:"RC-R",line:"26",description:"Tier 1 leverage ratio",glAcct:"3300",glAmt:8500000,crAmt:8500000,flag:false},
    {schedule:"RC-O",line:"11",description:"Related organization - amounts due to affiliates",glAcct:"3100",glAmt:4250000,crAmt:4250000,flag:true,flagNote:"Verify Reg W threshold"},
  ],
  sox:[
    {id:"SOX-001",control:"Journal Entry Authorization",owner:"Controller",frequency:"Monthly",lastTested:"2023-10-15",status:"OVERDUE",risk:"HIGH"},
    {id:"SOX-002",control:"Bank Reconciliation Completeness",owner:"Sr. Accountant",frequency:"Monthly",lastTested:"2024-01-15",status:"CURRENT",risk:"HIGH"},
    {id:"SOX-003",control:"CECL Reserve Calculation Review",owner:"CFO",frequency:"Quarterly",lastTested:"2023-12-31",status:"CURRENT",risk:"HIGH"},
    {id:"SOX-004",control:"Regulation W Monitoring",owner:"Compliance",frequency:"Monthly",lastTested:"2024-01-31",status:"CURRENT",risk:"HIGH"},
    {id:"SOX-005",control:"Settlement Reconciliation",owner:"Sr. Accountant",frequency:"Daily",lastTested:"2024-01-30",status:"CURRENT",risk:"MED"},
    {id:"SOX-006",control:"Access Controls - NetSuite",owner:"IT/Finance",frequency:"Quarterly",lastTested:"2023-09-30",status:"OVERDUE",risk:"MED"},
  ],
  regW:[
    {id:"RW-001",date:"2024-01-05",counterparty:"Block Inc.",type:"Management Fee",amt:425000,capitalPct:0.5,flag:false},
    {id:"RW-002",date:"2024-01-12",counterparty:"Block Inc. Treasury",type:"Cash Transfer",amt:2100000,capitalPct:2.47,flag:false},
    {id:"RW-003",date:"2024-01-19",counterparty:"Cash App (Block subsidiary)",type:"Data Services",amt:180000,capitalPct:0.21,flag:false},
    {id:"RW-004",date:"2024-01-25",counterparty:"Block Inc. - Afterpay",type:"BNPL Origination Funding",amt:7500000,capitalPct:8.82,flag:true},
  ],
  pbc:[
    {id:"PBC-001",request:"Trial Balance - January 2024",requestor:"Deloitte",due:"2024-02-07",status:"DELIVERED",owner:"Sr. Accountant"},
    {id:"PBC-002",request:"Loan Portfolio Schedule with CECL workpapers",requestor:"Deloitte",due:"2024-02-07",status:"IN REVIEW",owner:"Controller"},
    {id:"PBC-003",request:"Reg W transaction log YTD",requestor:"OCC Examiner",due:"2024-02-14",status:"OPEN",owner:"Compliance"},
    {id:"PBC-004",request:"Settlement reconciliation - Dec & Jan",requestor:"Deloitte",due:"2024-02-10",status:"IN REVIEW",owner:"Sr. Accountant"},
    {id:"PBC-005",request:"SOX control testing evidence - SOX-001, SOX-006",requestor:"Internal Audit",due:"2024-02-05",status:"OPEN",owner:"Controller",urgent:true},
    {id:"PBC-006",request:"Board minutes - Q4 2023 capital resolution",requestor:"OCC Examiner",due:"2024-02-14",status:"DELIVERED",owner:"General Counsel"},
  ],
};

const SYSTEM = `You are SFS ACCOUNTING ASSISTANT for Square Financial Services, a bank subsidiary of Block Inc. 
Analyze the uploaded data and automate bank accounting workflows. 
Flag [HIGH], [MED], [LOW] issues. Mark [HUMAN REVIEW REQUIRED] on all estimates and judgment calls.
End every response with READY TO POST: YES / NO and REGULATORY RISK: LOW / MEDIUM / HIGH.
Be specific with dollar amounts, account numbers, and required actions.`;

const callClaude = async (prompt, system, maxTokens=1800) => {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:maxTokens,system:system||SYSTEM,messages:[{role:"user",content:prompt}]})
  });
  if(!res.ok) throw new Error("API "+res.status);
  const j = await res.json();
  return j.content?.[0]?.text||"";
};

// ── REUSABLE UPLOAD ZONE ───────────────────────────────────────────────────
function UploadZone({ tabId, uploads, setUploads }) {
  const cfg = UPLOAD_CONFIG[tabId];
  if (!cfg) return null;
  const fileRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const existing = uploads[tabId] || [];

  const handleFiles = (files) => {
    const newFiles = Array.from(files).map(f => {
      return new Promise(resolve => {
        const r = new FileReader();
        r.onload = e => resolve({ name: f.name, text: e.target.result, uploadedAt: new Date().toLocaleTimeString() });
        r.readAsText(f);
      });
    });
    Promise.all(newFiles).then(parsed => {
      setUploads(p => ({ ...p, [tabId]: [...(p[tabId]||[]), ...parsed] }));
    });
  };

  const sourceColor = SOURCE_COLORS[cfg.source] || T.blue;

  return (
    <div style={{background:T.card,border:"1px solid "+T.borderHi,borderRadius:10,padding:"16px 18px",marginBottom:18}}>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:3,height:28,background:sourceColor,borderRadius:2}}/>
          <div>
            <div style={{fontFamily:T.mono,fontSize:10,fontWeight:700,color:sourceColor,letterSpacing:"1.5px",textTransform:"uppercase"}}>{cfg.source}</div>
            <div style={{fontSize:13,fontWeight:600,color:T.txt,marginTop:1}}>{cfg.label}</div>
          </div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {existing.length > 0 && (
            <span style={{fontFamily:T.mono,fontSize:9,color:T.greenBr,background:T.greenDim,border:"1px solid "+T.green+"44",borderRadius:4,padding:"3px 8px"}}>
              {existing.length} file{existing.length>1?"s":""} loaded
            </span>
          )}
          <button onClick={() => setUploads(p => ({...p,[tabId]:[]}))}
            style={{padding:"4px 10px",background:T.redDim,color:T.redBr,border:"1px solid "+T.red+"33",borderRadius:5,fontSize:9,fontFamily:T.mono,cursor:"pointer",display:existing.length?"flex":"none",alignItems:"center",gap:4}}>
            Clear all
          </button>
        </div>
      </div>

      {/* Export instructions */}
      <div style={{background:T.panel,border:"1px solid "+sourceColor+"22",borderLeft:"2px solid "+sourceColor,borderRadius:5,padding:"8px 12px",marginBottom:12}}>
        <div style={{fontFamily:T.mono,fontSize:8,color:sourceColor,letterSpacing:"1.5px",marginBottom:5,textTransform:"uppercase"}}>How to export from {cfg.source}</div>
        <div style={{fontSize:11,color:T.muted,lineHeight:1.8,whiteSpace:"pre-line"}}>{cfg.hint}</div>
      </div>

      {/* Loaded files */}
      {existing.length > 0 && (
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>
          {existing.map((f,i) => (
            <div key={i} style={{display:"flex",alignItems:"center",gap:6,background:T.greenDim,border:"1px solid "+T.green+"33",borderRadius:6,padding:"5px 10px"}}>
              <span style={{color:T.greenBr,fontSize:10}}>✓</span>
              <span style={{fontFamily:T.mono,fontSize:10,color:T.greenBr,fontWeight:600}}>{f.name}</span>
              <span style={{fontFamily:T.mono,fontSize:9,color:T.muted}}>{f.text.split("\n").length} rows</span>
              <button onClick={() => setUploads(p => ({...p,[tabId]:p[tabId].filter((_,j)=>j!==i)}))}
                style={{background:"transparent",border:"none",color:T.muted,fontSize:11,cursor:"pointer",padding:"0 2px"}}>×</button>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragEnter={e=>{e.preventDefault();setDrag(true);}}
        onDragLeave={()=>setDrag(false)}
        onDragOver={e=>e.preventDefault()}
        onDrop={e=>{e.preventDefault();setDrag(false);handleFiles(e.dataTransfer.files);}}
        onClick={()=>fileRef.current?.click()}
        style={{border:"1px dashed "+(drag?T.amber:T.borderHi),borderRadius:7,padding:"14px 16px",background:drag?T.amberDim:T.surf,cursor:"pointer",transition:"all .15s"}}>
        <input ref={fileRef} type="file" accept=".csv,.txt,.tsv" multiple style={{display:"none"}}
          onChange={e=>{handleFiles(e.target.files);e.target.value="";}}/>

        <div style={{textAlign:"center"}}>
          {/* System name badges */}
          <div style={{display:"flex",justifyContent:"center",gap:6,marginBottom:10,flexWrap:"wrap"}}>
            {(cfg.quickPaths||[]).map((qp,i)=>(
              <span key={i} style={{fontFamily:T.mono,fontSize:10,fontWeight:700,color:qp.col,background:qp.col+"15",border:"1px solid "+qp.col+"33",borderRadius:5,padding:"4px 12px"}}>
                {qp.sys}
              </span>
            ))}
          </div>
          <div style={{fontSize:16,color:T.muted,opacity:0.35,marginBottom:3}}>↑</div>
          <div style={{fontFamily:T.mono,fontSize:9.5,color:drag?T.amberBr:T.muted,fontWeight:600}}>
            {drag ? "DROP FILE HERE" : "DROP CSV HERE OR CLICK TO BROWSE"}
          </div>
          {(cfg.quickPaths||[]).length > 1 && (
            <div style={{fontSize:9,color:T.faint,marginTop:3}}>Upload {cfg.quickPaths.length} files — one per system</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── AI ANALYSIS BUTTON ─────────────────────────────────────────────────────
function RunAIButton({ tabId, uploads, onResult, running, setRunning }) {
  const cfg = UPLOAD_CONFIG[tabId];
  const files = uploads[tabId] || [];
  const hasFiles = files.length > 0;

  const run = async () => {
    setRunning(tabId);
    try {
      const dataStr = hasFiles
        ? files.map(f => `FILE: ${f.name}\n${f.text}`).join("\n\n---\n\n")
        : `Using sample data for ${tabId} analysis`;
      const prompt = `Analyze this ${cfg?.label || tabId} data for Square Financial Services.\n\nSource: ${cfg?.source || "Unknown"}\nTab: ${tabId}\n\n${dataStr}`;
      const result = await callClaude(prompt, SYSTEM, 1800);
      onResult(result);
    } catch(e) {
      onResult("Error: " + e.message);
    } finally {
      setRunning(null);
    }
  };

  const isRunning = running === tabId;

  return (
    <button onClick={run} disabled={isRunning}
      style={{width:"100%",padding:"11px",background:isRunning?T.blueDim:hasFiles?"linear-gradient(135deg,"+T.blue+","+T.green+"88)":"linear-gradient(135deg,"+T.blue+"88,"+T.blue+"44)",color:isRunning?T.blueBr:"#fff",border:isRunning?"1px solid "+T.blue+"44":"none",borderRadius:8,fontWeight:700,fontSize:13,fontFamily:T.sans,cursor:isRunning?"not-allowed":"pointer",marginBottom:20,display:"flex",alignItems:"center",justifyContent:"center",gap:10,transition:"all .2s"}}>
      {isRunning
        ? <><span style={{animation:"spin .8s linear infinite",display:"inline-block"}}>◎</span> Analyzing with AI...</>
        : hasFiles
          ? `▶  Run AI Analysis on ${files.length} uploaded file${files.length>1?"s":""}`
          : "▶  Run AI Analysis on Sample Data"
      }
    </button>
  );
}

function SmartOutput({text}) {
  if(!text) return null;
  return <div style={{marginTop:16}}>{text.split("\n").map((raw,i)=>{
    const t=raw.trim();
    if(!t) return <div key={i} style={{height:5}}/>;
    if(/^(SUMMARY|ANALYSIS|JOURNAL|RECONCIL|EXCEPTIONS|DOUBLE-ENTRY|READY TO POST|REGULATORY RISK)/i.test(t)&&!t.startsWith("[")) {
      return <div key={i} style={{marginTop:18,marginBottom:8,paddingBottom:6,borderBottom:"1px solid "+T.border}}>
        <span style={{fontFamily:T.mono,fontSize:13,fontWeight:700,color:T.blueBr}}>{t.replace(/-+$/,"").trim()}</span>
      </div>;
    }
    const fl=t.match(/^\[(HIGH|MED|LOW|HUMAN REVIEW)\]/i);
    if(fl){
      const l=fl[1].toUpperCase();
      const c={HIGH:{bg:T.redDim,b:T.red,col:T.redBr},MED:{bg:T.amberDim,b:T.amber,col:T.amberBr},LOW:{bg:T.blueDim,b:T.blue,col:T.blueBr},"HUMAN REVIEW":{bg:"#160a00",b:T.amber,col:"#ffd080"}}[l]||{bg:T.blueDim,b:T.blue,col:T.blueBr};
      return <div key={i} style={{background:c.bg,borderLeft:"3px solid "+c.b,padding:"8px 13px",margin:"4px 0",borderRadius:"0 5px 5px 0",fontFamily:T.mono,fontSize:12,color:c.col,lineHeight:1.7}}>{t}</div>;
    }
    if(/READY TO POST|REGULATORY RISK/i.test(t)){
      const good=/YES|LOW/.test(t);const bad=/NO|HIGH/.test(t);
      return <div key={i} style={{background:good?T.greenDim:bad?T.redDim:T.amberDim,border:"1px solid "+(good?T.green:bad?T.red:T.amber)+"44",padding:"9px 13px",borderRadius:5,margin:"10px 0",fontFamily:T.mono,fontSize:12,color:good?T.greenBr:bad?T.redBr:T.amberBr,fontWeight:700}}>{good?"✓ ":bad?"✕ ":"⚠ "}{t}</div>;
    }
    return <div key={i} style={{fontFamily:T.mono,fontSize:12.5,lineHeight:1.9,color:T.txt}}>{raw}</div>;
  })}</div>;
}

function StatusBadge({status}) {
  const cfg={
    "RECONCILED":{bg:T.greenDim,color:T.greenBr},"EXCEPTION":{bg:T.redDim,color:T.redBr},
    "CURRENT":{bg:T.greenDim,color:T.greenBr},"OVERDUE":{bg:T.redDim,color:T.redBr},
    "DELIVERED":{bg:T.greenDim,color:T.greenBr},"IN REVIEW":{bg:T.amberDim,color:T.amberBr},
    "OPEN":{bg:T.blueDim,color:T.blueBr},"SAFE":{bg:T.greenDim,color:T.greenBr},"REVIEW":{bg:T.amberDim,color:T.amberBr},
  }[status]||{bg:T.card,color:T.muted};
  return <span style={{fontFamily:T.mono,fontSize:9,fontWeight:700,padding:"2px 8px",borderRadius:4,background:cfg.bg,color:cfg.color,whiteSpace:"nowrap"}}>{status}</span>;
}

function THead({cols}) {
  return <thead><tr style={{background:"#040810"}}>
    {cols.map((c,i)=><th key={i} style={{padding:"9px 12px",textAlign:typeof c==="object"?c.align||"left":"left",fontFamily:T.mono,fontSize:10,fontWeight:700,color:T.blueBr,letterSpacing:"0.5px",borderBottom:"2px solid "+T.borderHi,whiteSpace:"nowrap"}}>{typeof c==="object"?c.label:c}</th>)}
  </tr></thead>;
}

function Flag({level,text}) {
  const c={HIGH:{bg:T.redDim,b:T.red,col:T.redBr},MED:{bg:T.amberDim,b:T.amber,col:T.amberBr}}[level]||{bg:T.blueDim,b:T.blue,col:T.blueBr};
  return <div style={{background:c.bg,borderLeft:"3px solid "+c.b,padding:"8px 13px",margin:"4px 0",borderRadius:"0 5px 5px 0",fontFamily:T.mono,fontSize:12,color:c.col,lineHeight:1.7}}>[{level}] {text}</div>;
}

const NAV = [
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
  ]},
  {group:"AI TOOLS",items:[
    {id:"assistant",label:"✦ Ask the Assistant"},
    {id:"signoff",label:"✦ Close Sign-Off"},
  ]},
];

const TAB_COLORS = {overview:T.blueBr,je:T.greenBr,recon:T.amberBr,flux:T.blueBr,cecl:T.greenBr,sox:T.amberBr,pbc:T.muted,callreport:T.purpleBr,axiomsl:T.purpleBr,regw:T.redBr,assistant:T.amberBr,signoff:T.greenBr};
const BADGES = (d) => ({recon:(d.reconciliations||[]).filter(r=>r.status==="EXCEPTION").length||null,sox:(d.sox||[]).filter(s=>s.status==="OVERDUE").length||null,pbc:(d.pbc||[]).filter(p=>p.status==="OPEN"||p.status==="IN REVIEW").length||null,regw:(d.regW||[]).filter(r=>r.flag).length||null});

export default function App() {
  const [tab,setTab]         = useState("overview");
  const [uploads,setUploads] = useState({});
  const [aiResults,setAIResults] = useState({});
  const [running,setRunning] = useState(null);
  const [platform,setPlatform] = useState("netsuite");

  // Assistant state
  const [chatMessages, setChatMessages] = useState([
    {role:"assistant", text:"Hi — I'm your SFS close assistant. Ask me anything about this month's close. For example: \"Are we ready to post?\" or \"What is our biggest risk?\" or \"Why did provision go up?\""}
  ]);
  const [chatInput, setChatInput]     = useState("");
  const [chatRunning, setChatRunning] = useState(false);

  // Sign-off state
  const [signoff, setSignoff]           = useState(null);
  const [signoffRunning, setSignoffRunning] = useState(false);

  const badges = BADGES(SAMPLE);
  const activeColor = TAB_COLORS[tab] || T.blueBr;
  const tier1 = 85000000;
  const regWTotal = SAMPLE.regW.reduce((s,r)=>s+r.amt,0);
  const regWPct = (regWTotal/tier1)*100;

  const setResult = (tabId) => (result) => setAIResults(p=>({...p,[tabId]:result}));

  // ── SHARED SECTION WRAPPER ───────────────────────────────────────────────
  const Section = ({id, title, subtitle, children}) => (
    <div style={{flex:1,overflowY:"auto",padding:"18px 22px 36px"}}>
      <div style={{marginBottom:18}}>
        <div style={{fontSize:21,fontWeight:700,color:activeColor}}>{title}</div>
        {subtitle&&<div style={{fontSize:12,color:T.muted,marginTop:3}}>{subtitle}</div>}
      </div>
      {children}
      {/* Upload zone + AI for tabs that have data sources */}
      {UPLOAD_CONFIG[id] && (
        <div style={{marginTop:24,borderTop:"1px solid "+T.border,paddingTop:20}}>
          <div style={{fontFamily:T.mono,fontSize:8,color:T.faint,letterSpacing:"2px",marginBottom:12,textTransform:"uppercase"}}>Upload Real Data from {UPLOAD_CONFIG[id].source}</div>
          <UploadZone tabId={id} uploads={uploads} setUploads={setUploads}/>
          <RunAIButton tabId={id} uploads={uploads} onResult={setResult(id)} running={running} setRunning={setRunning}/>
          {aiResults[id] && (
            <div style={{background:T.card,border:"1px solid "+T.border,borderRadius:8,padding:"16px 18px"}}>
              <div style={{fontFamily:T.mono,fontSize:8,color:T.faint,letterSpacing:"2px",marginBottom:4,textTransform:"uppercase"}}>AI Analysis Result</div>
              <SmartOutput text={aiResults[id]}/>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div style={{background:T.bg,height:"100vh",display:"flex",flexDirection:"column",fontFamily:T.sans,color:T.txt,overflow:"hidden"}}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-thumb{background:${T.border};border-radius:3px;}
        button{cursor:pointer;transition:all .15s;}
        tr:hover td{background:${T.panel}!important;}
        .nav-btn:hover{background:#0a1628!important;}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
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
            <div style={{fontSize:16,fontWeight:900,color:T.blueBr,letterSpacing:"1px"}}>SFS</div>
            <div style={{fontFamily:T.mono,fontSize:7,color:T.faint,letterSpacing:"1.5px"}}>ACCOUNTING & COMPLIANCE</div>
          </div>
        </div>
        <div style={{flex:1,padding:"0 16px",display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:12,color:T.muted}}>Square Financial Services</span>
          <span style={{color:T.faint}}>›</span>
          <span style={{fontSize:13,color:activeColor,fontWeight:600}}>{NAV.flatMap(g=>g.items).find(i=>i.id===tab)?.label||"Overview"}</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {/* Platform pills */}
          <div style={{display:"flex",gap:4}}>
            {[["netsuite","NetSuite",T.blue],["snowflake","Snowflake",T.blue],["workiva","Workiva",T.purple],["axiomsl","AxiomSL",T.purpleBr]].map(([v,l,col])=>(
              <button key={v} onClick={()=>setPlatform(v)}
                style={{padding:"4px 10px",background:platform===v?col+"22":"transparent",color:platform===v?col:T.faint,border:"1px solid "+(platform===v?col+"55":T.border),borderRadius:5,fontSize:10,fontFamily:T.mono,fontWeight:platform===v?700:400}}>
                {l}
              </button>
            ))}
          </div>
          <div style={{fontFamily:T.mono,fontSize:9,color:T.faint,borderLeft:"1px solid "+T.border,paddingLeft:10}}>{SAMPLE.period}</div>
        </div>
      </div>

      {/* BODY */}
      <div style={{flex:1,display:"flex",overflow:"hidden",minHeight:0}}>

        {/* SIDEBAR */}
        <div style={{width:200,background:"#020609",borderRight:"1px solid "+T.border,display:"flex",flexDirection:"column",flexShrink:0,overflowY:"auto"}}>
          {NAV.map(({group,items})=>(
            <div key={group}>
              <div style={{padding:"14px 14px 5px",fontFamily:T.mono,fontSize:8,color:group==="REGULATORY"?T.purpleBr:T.faint,letterSpacing:"2px",fontWeight:700}}>{group}</div>
              {items.map(({id,label})=>{
                const active=tab===id;
                const badge=badges[id];
                const hasUpload=!!(uploads[id]?.length);
                return (
                  <button key={id} className="nav-btn" onClick={()=>setTab(id)}
                    style={{width:"100%",textAlign:"left",padding:"9px 14px",background:active?"#0a1628":"transparent",border:"none",borderLeft:"3px solid "+(active?activeColor:"transparent"),display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:12,fontWeight:active?600:400,color:active?activeColor:T.muted,flex:1}}>{label}</span>
                    {hasUpload&&<span style={{color:T.greenBr,fontSize:9}}>●</span>}
                    {badge&&<span style={{background:id==="regw"?T.amber:T.red,color:"#fff",borderRadius:10,padding:"1px 6px",fontSize:8,fontWeight:700}}>{badge}</span>}
                  </button>
                );
              })}
            </div>
          ))}
          <div style={{flex:1}}/>
          {/* Upload status summary */}
          <div style={{padding:"12px 14px",borderTop:"1px solid "+T.border}}>
            <div style={{fontFamily:T.mono,fontSize:7,color:T.faint,letterSpacing:"1.5px",marginBottom:6,textTransform:"uppercase"}}>Data Sources</div>
            {Object.entries(UPLOAD_CONFIG).map(([id,cfg])=>{
              const files = uploads[id]||[];
              return (
                <div key={id} style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontFamily:T.mono,fontSize:9,color:T.faint}}>{cfg.source.split("+")[0].trim()}</span>
                  <span style={{fontFamily:T.mono,fontSize:9,color:files.length?T.greenBr:T.faint}}>{files.length?`${files.length} file${files.length>1?"s":""}`:"-"}</span>
                </div>
              );
            }).filter((el,i)=>i<5)}
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column",minHeight:0}}>

          {/* OVERVIEW */}
          {tab==="overview"&&(
            <div style={{flex:1,overflowY:"auto",padding:"18px 22px 36px"}}>
              <div style={{marginBottom:16}}>
                <div style={{fontSize:21,fontWeight:700,color:T.blueBr}}>SFS Month-End Dashboard</div>
                <div style={{fontSize:12,color:T.muted,marginTop:3}}>{SAMPLE.period} · Square Financial Services · Block Inc. Subsidiary</div>
              </div>

              {/* Data source status banner */}
              <div style={{background:T.card,border:"1px solid "+T.border,borderRadius:8,padding:"12px 16px",marginBottom:16}}>
                <div style={{fontFamily:T.mono,fontSize:8,color:T.faint,letterSpacing:"1.5px",marginBottom:10,textTransform:"uppercase"}}>Data Source Status — Upload CSVs on each tab to use real data</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
                  {[
                    {sys:"NetSuite",tabs:["je","recon","flux"],col:T.blue},
                    {sys:"Snowflake",tabs:["recon","cecl"],col:T.blue},
                    {sys:"Workiva",tabs:["sox","pbc"],col:T.purple},
                    {sys:"AxiomSL",tabs:["callreport","axiomsl","regw"],col:T.purpleBr},
                  ].map(({sys,tabs,col})=>{
                    const loaded = tabs.some(t=>(uploads[t]||[]).length>0);
                    return (
                      <div key={sys} style={{background:loaded?T.greenDim:T.panel,border:"1px solid "+(loaded?T.green:T.border)+"44",borderRadius:7,padding:"10px 12px",textAlign:"center"}}>
                        <div style={{fontFamily:T.mono,fontSize:11,fontWeight:700,color:loaded?T.greenBr:col,marginBottom:4}}>{sys}</div>
                        <div style={{fontSize:10,color:loaded?T.greenBr:T.faint}}>{loaded?"✓ Data loaded":"No files yet"}</div>
                        <div style={{fontFamily:T.mono,fontSize:8,color:T.faint,marginTop:3}}>{tabs.join(", ")} tabs</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* KPI Cards */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
                {[
                  {label:"Loan Portfolio",val:fmtK(45200000),sub:"+$3.4M MoM",good:true},
                  {label:"BNPL Receivables",val:fmtK(12840000),sub:"+14.6% MoM",good:true},
                  {label:"Tier 1 Capital",val:fmtK(85000000),sub:"CET1: 12.0%",good:true},
                  {label:"Reg W Exposure",val:fmtP(regWPct),sub:fmtK(regWTotal)+" total",good:regWPct<8},
                  {label:"Recon Exceptions",val:SAMPLE.reconciliations.filter(r=>r.status==="EXCEPTION").length,sub:"2 accounts",good:false},
                  {label:"SOX Overdue",val:SAMPLE.sox.filter(s=>s.status==="OVERDUE").length,sub:"SOX-001, SOX-006",good:false},
                  {label:"Open PBC Items",val:SAMPLE.pbc.filter(p=>p.status==="OPEN"||p.status==="IN REVIEW").length,sub:"Audit requests",good:false},
                  {label:"NIM",val:"5.00%",sub:"Stable MoM",good:true},
                ].map((k,i)=>(
                  <div key={i} style={{background:k.good?T.card:T.redDim,border:"1px solid "+(k.good?T.border:T.red+"44"),borderRadius:8,padding:"11px 13px"}}>
                    <div style={{fontFamily:T.mono,fontSize:9,color:T.muted,marginBottom:6,textTransform:"uppercase",fontWeight:600}}>{k.label}</div>
                    <div style={{fontFamily:T.mono,fontSize:20,fontWeight:700,color:k.good?T.blueBr:T.redBr,lineHeight:1,marginBottom:4}}>{k.val}</div>
                    <div style={{fontSize:10,color:k.good?T.greenBr:T.redBr,fontWeight:500}}>{k.sub}</div>
                  </div>
                ))}
              </div>

              {/* How to use + Data source map side by side */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>

                <div style={{background:T.blueDim,border:"1px solid "+T.blue+"33",borderRadius:8,padding:"14px 16px"}}>
                  <div style={{fontFamily:T.mono,fontSize:9,color:T.blueBr,letterSpacing:"1.5px",marginBottom:10,fontWeight:700,textTransform:"uppercase"}}>How to Use</div>
                  <div style={{display:"flex",flexDirection:"column",gap:7}}>
                    {[
                      {step:"1",text:"Click any tab in the sidebar"},
                      {step:"2",text:"See where to export data from on that tab"},
                      {step:"3",text:"Upload your CSV — drag and drop works"},
                      {step:"4",text:"Click Run AI Analysis for a full review"},
                      {step:"5",text:"No file yet? Run on Sample Data first"},
                      {step:"6",text:"Green dot = file loaded · Nothing posts without your approval"},
                    ].map((s,i)=>(
                      <div key={i} style={{display:"flex",gap:9,alignItems:"flex-start"}}>
                        <span style={{fontFamily:T.mono,fontSize:12,fontWeight:700,color:T.blue,flexShrink:0,minWidth:16}}>{s.step}.</span>
                        <span style={{fontSize:11.5,color:T.muted,lineHeight:1.5}}>{s.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{background:T.card,border:"1px solid "+T.border,borderRadius:8,padding:"14px 16px"}}>
                  <div style={{fontFamily:T.mono,fontSize:9,color:T.faint,letterSpacing:"1.5px",marginBottom:10,fontWeight:700,textTransform:"uppercase"}}>Where Each Tab Gets Its Data</div>
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {[
                      {sys:"NetSuite",   col:T.blue,     tabs:"Journal Entries · Reconciliations · Flux"},
                      {sys:"Snowflake",  col:T.blue,     tabs:"Reconciliations · CECL Model"},
                      {sys:"Workiva",    col:T.purple,   tabs:"SOX Controls · Audit Tracker"},
                      {sys:"AxiomSL",   col:T.purpleBr, tabs:"Call Report · Reg W · AxiomSL Hub"},
                    ].map(({sys,col,tabs})=>(
                      <div key={sys} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",background:T.panel,borderRadius:6,border:"1px solid "+col+"22"}}>
                        <span style={{fontFamily:T.mono,fontSize:10,fontWeight:700,color:col,minWidth:70,flexShrink:0}}>{sys}</span>
                        <span style={{fontSize:11,color:T.muted,lineHeight:1.5}}>{tabs}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* JOURNAL ENTRIES */}
          {tab==="je"&&(
            <Section id="je" title="Journal Entries" subtitle={`${SAMPLE.period} · ${SAMPLE.journalEntries.length} entries · NetSuite Import Ready`}>
              <Flag level="MED" text="4 entries require Controller approval before posting — CECL reserve, BNPL, intercompany, reg capital"/>
              <div style={{height:12}}/>
              {SAMPLE.journalEntries.map((je,i)=>(
                <div key={i} style={{background:T.card,border:"1px solid "+(je.status==="REVIEW"?T.amber:T.border)+"44",borderLeft:"3px solid "+(je.status==="REVIEW"?T.amber:T.green)+"77",borderRadius:6,padding:"11px 15px",marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:6}}>
                    <div style={{display:"flex",gap:10,alignItems:"center"}}>
                      <span style={{fontFamily:T.mono,fontSize:11,fontWeight:700,color:T.blueBr}}>{je.id}</span>
                      <span style={{fontFamily:T.mono,fontSize:9,color:T.muted}}>{je.date}</span>
                      <span style={{fontFamily:T.mono,fontSize:9,color:T.muted,background:T.panel,border:"1px solid "+T.border,borderRadius:3,padding:"2px 8px"}}>{je.type}</span>
                    </div>
                    <StatusBadge status={je.status==="REVIEW"?"REVIEW":"SAFE"}/>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                    <div style={{background:T.blueDim,border:"1px solid "+T.blue+"18",borderRadius:4,padding:"7px 10px"}}>
                      <div style={{fontFamily:T.mono,fontSize:7,color:T.blue,letterSpacing:"1.5px",marginBottom:3,textTransform:"uppercase"}}>Debit</div>
                      <div style={{fontFamily:T.mono,fontSize:11,color:T.blueBr}}>{je.dr}</div>
                      <div style={{fontFamily:T.mono,fontSize:13,fontWeight:700,color:T.txt,marginTop:2}}>{fmt(je.amt)}</div>
                    </div>
                    <div style={{background:T.amberDim,border:"1px solid "+T.amber+"18",borderRadius:4,padding:"7px 10px"}}>
                      <div style={{fontFamily:T.mono,fontSize:7,color:T.amber,letterSpacing:"1.5px",marginBottom:3,textTransform:"uppercase"}}>Credit</div>
                      <div style={{fontFamily:T.mono,fontSize:11,color:T.amberBr}}>{je.cr}</div>
                      <div style={{fontFamily:T.mono,fontSize:13,fontWeight:700,color:T.txt,marginTop:2}}>{fmt(je.amt)}</div>
                    </div>
                  </div>
                  <div style={{fontSize:11,color:T.muted,fontStyle:"italic"}}>{je.memo}</div>
                </div>
              ))}
              <div style={{background:T.greenDim,border:"1px solid "+T.green+"44",borderRadius:7,padding:"10px 14px",fontFamily:T.mono,fontSize:11,color:T.greenBr}}>
                Double-Entry Check: Total Debits = Total Credits = {fmt(SAMPLE.journalEntries.reduce((s,j)=>s+j.amt,0))} · Variance: $0.00 · STATUS: PASS
              </div>
            </Section>
          )}

          {/* RECONCILIATIONS */}
          {tab==="recon"&&(
            <Section id="recon" title="Account Reconciliations" subtitle={`${SAMPLE.period} · GL vs Product Ledger vs Bank · SOX-compliant`}>
              {SAMPLE.reconciliations.filter(r=>r.status==="EXCEPTION").map((r,i)=>(
                <Flag key={i} level="HIGH" text={`${r.acct} — Exception ${fmt(r.diff)} — ${r.note} — Aged ${r.aged} days`}/>
              ))}
              <div style={{height:12}}/>
              <div style={{border:"1px solid "+T.border,borderRadius:8,overflow:"hidden"}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <THead cols={["Account","GL Balance","Product Ledger","Bank Balance","Difference","Aged","Status"]}/>
                  <tbody>
                    {SAMPLE.reconciliations.map((r,i)=>(
                      <tr key={i} style={{borderBottom:"1px solid "+T.border+"33",background:r.status==="EXCEPTION"?T.redDim+"33":"transparent"}}>
                        <td style={{padding:"9px 12px",fontFamily:T.mono,fontSize:11,color:T.txt,fontWeight:500}}>{r.acct}</td>
                        <td style={{padding:"9px 12px",fontFamily:T.mono,fontSize:11,color:T.txt,textAlign:"right"}}>{fmt(r.gl)}</td>
                        <td style={{padding:"9px 12px",fontFamily:T.mono,fontSize:11,color:r.product?T.txt:T.faint,textAlign:"right"}}>{r.product?fmt(r.product):"N/A"}</td>
                        <td style={{padding:"9px 12px",fontFamily:T.mono,fontSize:11,color:r.bank?T.txt:T.faint,textAlign:"right"}}>{r.bank?fmt(r.bank):"N/A"}</td>
                        <td style={{padding:"9px 12px",fontFamily:T.mono,fontSize:11,fontWeight:700,color:r.diff===0?T.greenBr:T.redBr,textAlign:"right"}}>{r.diff===0?"—":fmt(r.diff)}</td>
                        <td style={{padding:"9px 12px",fontFamily:T.mono,fontSize:10,color:r.aged>5?T.redBr:r.aged>0?T.amberBr:T.greenBr,textAlign:"center"}}>{r.aged>0?r.aged+" days":"—"}</td>
                        <td style={{padding:"9px 12px",textAlign:"center"}}><StatusBadge status={r.status}/></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {/* FLUX */}
          {tab==="flux"&&(
            <Section id="flux" title="Flux Analysis" subtitle="Month-over-month changes · Upload two trial balance periods to compare">
              <div style={{background:T.card,border:"1px solid "+T.border,borderRadius:8,padding:"12px 15px",marginBottom:16,borderLeft:"3px solid "+T.blue}}>
                <span style={{color:T.blueBr,fontWeight:600,fontSize:13}}>Controller Commentary: </span>
                <span style={{fontSize:12,color:T.muted,lineHeight:1.8}}>January 2024 shows continued portfolio growth. Provision for credit losses up 18.6% MoM — CECL reserve rate should be reviewed by CFO before finalizing.</span>
              </div>
              <div style={{border:"1px solid "+T.border,borderRadius:8,overflow:"hidden"}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <THead cols={["Account","Dec 2023","Jan 2024",{label:"$ Change",align:"right"},{label:"% Change",align:"right"},"Driver"]}/>
                  <tbody>
                    {SAMPLE.flux.map((f,i)=>{
                      const isCost=/(provision|expense)/i.test(f.acct);
                      const isGood=isCost?f.chg<0:f.chg>0;
                      return (
                        <tr key={i} style={{borderBottom:"1px solid "+T.border+"33",background:i%2===0?"transparent":T.card+"44"}}>
                          <td style={{padding:"9px 12px",fontSize:12,color:T.txt,fontWeight:600}}>{f.acct}</td>
                          <td style={{padding:"9px 12px",fontFamily:T.mono,fontSize:11,color:T.muted,textAlign:"right"}}>{fmtK(f.dec)}</td>
                          <td style={{padding:"9px 12px",fontFamily:T.mono,fontSize:11,color:T.txt,textAlign:"right",fontWeight:600}}>{fmtK(f.jan)}</td>
                          <td style={{padding:"9px 12px",fontFamily:T.mono,fontSize:11,fontWeight:700,color:isGood?T.greenBr:T.redBr,textAlign:"right"}}>{f.chg>=0?"+":""}{fmtK(f.chg)}</td>
                          <td style={{padding:"9px 12px",fontFamily:T.mono,fontSize:11,fontWeight:700,color:isGood?T.greenBr:T.redBr,textAlign:"right"}}>{fmtP(f.pct)}</td>
                          <td style={{padding:"9px 12px",fontSize:11,color:T.muted}}>{f.driver}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {/* CECL */}
          {tab==="cecl"&&(
            <Section id="cecl" title="CECL Reserve Model" subtitle="ASC 326 · Current Expected Credit Loss · CFO approval required">
              <Flag level="HIGH" text="CECL reserve requires CFO sign-off every month before JE-SFS-002 posts"/>
              <Flag level="HIGH" text={`Reserve shortfall — JE-SFS-002 books $73,500 but model requires $384,600. Gap: $311,100. Escalate to CFO.`}/>
              <div style={{height:12}}/>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
                {[
                  {label:"Total Loan Portfolio",val:"$45,200,000",note:"Account 1200"},
                  {label:"BNPL Receivables",val:"$12,840,000",note:"Account 1250"},
                  {label:"Applied Reserve Rate",val:"3.00%",note:"Historical + Q-Factor"},
                  {label:"Required Reserve",val:"$1,740,600",note:"Portfolio × Rate"},
                  {label:"Existing Allowance",val:"$1,356,000",note:"Account 1210"},
                  {label:"Shortfall",val:"$384,600",note:"Needs CFO approval",alert:true},
                ].map((k,i)=>(
                  <div key={i} style={{background:k.alert?T.redDim:T.card,border:"1px solid "+(k.alert?T.red:T.border),borderRadius:7,padding:"11px 13px"}}>
                    <div style={{fontFamily:T.mono,fontSize:9,color:T.muted,marginBottom:6,fontWeight:600,textTransform:"uppercase"}}>{k.label}</div>
                    <div style={{fontFamily:T.mono,fontSize:18,fontWeight:700,color:k.alert?T.redBr:T.txt,lineHeight:1}}>{k.val}</div>
                    <div style={{fontSize:10,color:T.muted,marginTop:4}}>{k.note}</div>
                  </div>
                ))}
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
                        <td style={{padding:"9px 12px",fontSize:12,color:T.txt,fontWeight:600}}>{r.seg}</td>
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
            </Section>
          )}

          {/* SOX */}
          {tab==="sox"&&(
            <Section id="sox" title="SOX Controls" subtitle={`${SAMPLE.period} · Internal Controls · Workiva`}>
              {SAMPLE.sox.filter(s=>s.status==="OVERDUE").map((s,i)=>(
                <Flag key={i} level="HIGH" text={`${s.id} — ${s.control} — OVERDUE — Owner: ${s.owner}`}/>
              ))}
              <div style={{height:12}}/>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {SAMPLE.sox.map((s,i)=>(
                  <div key={i} style={{background:T.card,border:"1px solid "+(s.status==="OVERDUE"?T.red:T.border)+"44",borderLeft:"3px solid "+(s.status==="OVERDUE"?T.red:s.risk==="HIGH"?T.amber:T.blue)+"77",borderRadius:7,padding:"12px 15px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:6}}>
                      <div style={{display:"flex",gap:10,alignItems:"center"}}>
                        <span style={{fontFamily:T.mono,fontSize:11,fontWeight:700,color:T.blueBr}}>{s.id}</span>
                        <span style={{fontSize:13,fontWeight:600,color:T.txt}}>{s.control}</span>
                      </div>
                      <div style={{display:"flex",gap:8,alignItems:"center"}}>
                        <span style={{fontFamily:T.mono,fontSize:9,color:T.muted}}>{s.frequency} · {s.owner}</span>
                        <StatusBadge status={s.status}/>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* CALL REPORT */}
          {tab==="callreport"&&(
            <Section id="callreport" title="Call Report — FFIEC 041" subtitle="Q4 2023 · OCC Submission · AxiomSL">
              <Flag level="MED" text="RC-O Line 11 — Due to affiliates $4.25M — Verify Reg W threshold before filing"/>
              <div style={{height:12}}/>
              <div style={{border:"1px solid "+T.border,borderRadius:8,overflow:"hidden"}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <THead cols={["Schedule","Line","Description","GL Account","GL Amount","CR Amount",{label:"Flag",align:"center"}]}/>
                  <tbody>
                    {SAMPLE.callReport.map((r,i)=>(
                      <tr key={i} style={{borderBottom:"1px solid "+T.border+"33",background:r.flag?T.amberDim+"33":"transparent"}}>
                        <td style={{padding:"9px 12px",fontFamily:T.mono,fontSize:11,color:T.purpleBr,fontWeight:700}}>{r.schedule}</td>
                        <td style={{padding:"9px 12px",fontFamily:T.mono,fontSize:11,color:T.muted,textAlign:"center"}}>{r.line}</td>
                        <td style={{padding:"9px 12px",fontSize:12,color:T.txt}}>{r.description}</td>
                        <td style={{padding:"9px 12px",fontFamily:T.mono,fontSize:10,color:T.faint}}>{r.glAcct}</td>
                        <td style={{padding:"9px 12px",fontFamily:T.mono,fontSize:11,color:T.muted,textAlign:"right"}}>{fmtK(r.glAmt)}</td>
                        <td style={{padding:"9px 12px",fontFamily:T.mono,fontSize:11,color:T.greenBr,textAlign:"right",fontWeight:600}}>{fmtK(r.crAmt)}</td>
                        <td style={{padding:"9px 12px",textAlign:"center"}}>{r.flag?<StatusBadge status="REVIEW"/>:<span style={{color:T.greenBr,fontSize:12}}>✓</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {/* AXIOMSL */}
          {tab==="axiomsl"&&(
            <Section id="axiomsl" title="AxiomSL — Regulatory Hub" subtitle="FFIEC 041 · Reg W · Capital Adequacy · OCC Submission">
              <div style={{background:T.purpleDim,border:"1px solid "+T.purple+"33",borderRadius:8,padding:"12px 15px",marginBottom:16,borderLeft:"3px solid "+T.purple}}>
                <div style={{fontSize:12,color:T.txt,lineHeight:1.9}}>AxiomSL is the regulatory reporting software SFS uses to prepare and submit filings to the OCC. Export data from NetSuite, import into AxiomSL, it maps to FFIEC schedules, validates, and submits.</div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                {[
                  {title:"Call Report — FFIEC 041",col:T.purple,items:["AxiomSL: Regulatory → Call Report → Export CSV","Schedules: RC-A, RC-C, RC-E, RC-R, RC-O","Upload to Call Report tab","Review RC-O Line 11 — Due to Block Inc."]},
                  {title:"Reg W Transaction Log",col:T.red,items:["AxiomSL: Compliance → Reg W Monitor → Export CSV","All covered transactions with Block subsidiaries","Upload to Reg W tab for threshold calculation","Board memo auto-generated when exposure >8%"]},
                  {title:"Capital Adequacy — Tier 1",col:T.green,items:["AxiomSL: Capital → Tier 1 Schedule → Export CSV","Feeds RC-R Call Report schedule","Reg W threshold = 10% of Tier 1 ($85M × 10% = $8.5M)","Monthly JE-SFS-008 allocates $500K to maintain 12%"]},
                  {title:"CECL Loss History",col:T.amber,items:["AxiomSL or Snowflake: CECL Loss History → Export CSV","Historical loss rates by loan segment","Q-factor documentation approved by CFO","Upload to CECL Model tab"]},
                ].map((m,i)=>(
                  <div key={i} style={{background:T.card,border:"1px solid "+m.col+"22",borderLeft:"3px solid "+m.col,borderRadius:8,padding:"13px 15px"}}>
                    <div style={{fontSize:13,fontWeight:700,color:m.col,marginBottom:10}}>{m.title}</div>
                    {m.items.map((item,j)=>(
                      <div key={j} style={{display:"flex",gap:7,marginBottom:6,alignItems:"flex-start"}}>
                        <span style={{color:m.col,fontSize:8,flexShrink:0,marginTop:3}}>›</span>
                        <span style={{fontSize:11,color:T.muted,lineHeight:1.6}}>{item}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* REG W */}
          {tab==="regw"&&(
            <Section id="regw" title="Regulation W Monitoring" subtitle={`SFS vs Block Inc. · Tier 1 Capital: $85M · Legal Limit: $8.5M (10%)`}>
              <div style={{background:T.card,border:"1px solid "+T.border,borderRadius:8,padding:"13px 15px",marginBottom:14}}>
                <div style={{fontFamily:T.mono,fontSize:8,color:T.faint,letterSpacing:"1.5px",marginBottom:10,textTransform:"uppercase"}}>Cumulative Exposure vs 10% Threshold</div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:8}}>
                  <div>
                    <div style={{fontFamily:T.mono,fontSize:24,fontWeight:700,color:regWPct>8?T.amberBr:T.greenBr}}>{fmtP(regWPct)}</div>
                    <div style={{fontFamily:T.mono,fontSize:10,color:T.muted}}>of Tier 1 Capital · {fmtK(regWTotal)} total</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontFamily:T.mono,fontSize:10,color:T.muted}}>Remaining headroom:</div>
                    <div style={{fontFamily:T.mono,fontSize:16,fontWeight:700,color:T.greenBr}}>{fmtK(tier1*0.10-regWTotal)}</div>
                  </div>
                </div>
                <div style={{height:10,background:T.border,borderRadius:5,overflow:"hidden"}}>
                  <div style={{height:"100%",width:regWPct+"%",background:regWPct>8?"linear-gradient(90deg,"+T.green+","+T.amber+","+T.red+")":"linear-gradient(90deg,"+T.green+","+T.greenBr+")",borderRadius:5}}/>
                </div>
              </div>
              {SAMPLE.regW.filter(r=>r.flag).map((r,i)=>(
                <Flag key={i} level="HIGH" text={`${r.id} — ${r.counterparty} — ${r.type} — ${fmtK(r.amt)} — ${r.capitalPct.toFixed(2)}% of Tier 1 — Board notification required`}/>
              ))}
              <div style={{height:12}}/>
              <div style={{border:"1px solid "+T.border,borderRadius:8,overflow:"hidden"}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <THead cols={["Ref","Date","Counterparty","Type","Amount","% Capital",{label:"Flag",align:"center"}]}/>
                  <tbody>
                    {SAMPLE.regW.map((r,i)=>(
                      <tr key={i} style={{borderBottom:"1px solid "+T.border+"33",background:r.flag?T.amberDim+"33":"transparent"}}>
                        <td style={{padding:"9px 12px",fontFamily:T.mono,fontSize:10,color:T.blueBr,fontWeight:700}}>{r.id}</td>
                        <td style={{padding:"9px 12px",fontFamily:T.mono,fontSize:10,color:T.muted}}>{r.date}</td>
                        <td style={{padding:"9px 12px",fontSize:12,color:T.txt,fontWeight:600}}>{r.counterparty}</td>
                        <td style={{padding:"9px 12px",fontFamily:T.mono,fontSize:10,color:T.faint}}>{r.type}</td>
                        <td style={{padding:"9px 12px",fontFamily:T.mono,fontSize:11,color:T.txt,textAlign:"right",fontWeight:600}}>{fmtK(r.amt)}</td>
                        <td style={{padding:"9px 12px",fontFamily:T.mono,fontSize:11,textAlign:"right",fontWeight:700,color:r.capitalPct>8?T.amberBr:r.capitalPct>5?T.blueBr:T.greenBr}}>{r.capitalPct.toFixed(2)}%</td>
                        <td style={{padding:"9px 12px",textAlign:"center"}}>{r.flag?<StatusBadge status="REVIEW"/>:<span style={{color:T.greenBr}}>✓</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {/* AUDIT TRACKER */}
          {tab==="pbc"&&(
            <Section id="pbc" title="Audit Tracker — PBC Log" subtitle={`${SAMPLE.period} · Deloitte · OCC Examiner · Internal Audit · Workiva`}>
              {SAMPLE.pbc.filter(p=>p.urgent).map((p,i)=>(
                <Flag key={i} level="HIGH" text={`${p.id} — ${p.request} — URGENT — Due ${p.due}`}/>
              ))}
              <div style={{height:12}}/>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
                {[
                  {label:"Open",count:SAMPLE.pbc.filter(p=>p.status==="OPEN").length,col:T.blue,bg:T.blueDim},
                  {label:"In Review",count:SAMPLE.pbc.filter(p=>p.status==="IN REVIEW").length,col:T.amber,bg:T.amberDim},
                  {label:"Delivered",count:SAMPLE.pbc.filter(p=>p.status==="DELIVERED").length,col:T.green,bg:T.greenDim},
                ].map((s,i)=>(
                  <div key={i} style={{background:s.bg,border:"1px solid "+s.col+"33",borderRadius:8,padding:"13px",textAlign:"center"}}>
                    <div style={{fontFamily:T.mono,fontSize:26,fontWeight:700,color:s.col}}>{s.count}</div>
                    <div style={{fontFamily:T.mono,fontSize:9,color:T.muted,letterSpacing:"1.5px",textTransform:"uppercase"}}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div style={{border:"1px solid "+T.border,borderRadius:8,overflow:"hidden"}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <THead cols={["ID","Request","Requestor","Due Date","Owner","Status"]}/>
                  <tbody>
                    {SAMPLE.pbc.map((p,i)=>(
                      <tr key={i} style={{borderBottom:"1px solid "+T.border+"33",background:p.urgent?T.redDim+"33":i%2===0?"transparent":T.card+"44"}}>
                        <td style={{padding:"9px 12px",fontFamily:T.mono,fontSize:10,color:T.blueBr,fontWeight:700}}>{p.id}</td>
                        <td style={{padding:"9px 12px",fontSize:12,color:T.txt,fontWeight:500}}>{p.request}</td>
                        <td style={{padding:"9px 12px",fontFamily:T.mono,fontSize:10,color:T.muted}}>{p.requestor}</td>
                        <td style={{padding:"9px 12px",fontFamily:T.mono,fontSize:10,color:T.muted}}>{p.due}</td>
                        <td style={{padding:"9px 12px",fontSize:11,color:T.muted}}>{p.owner}</td>
                        <td style={{padding:"9px 12px"}}><StatusBadge status={p.status}/></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {/* NATURAL LANGUAGE ASSISTANT */}
          {tab==="assistant"&&(
            <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>

              {/* Explainer banner */}
              <div style={{padding:"14px 22px 0",flexShrink:0}}>
                <div style={{fontSize:20,fontWeight:700,color:T.amberBr,marginBottom:4}}>✦ Close Assistant</div>
                <div style={{fontSize:12,color:T.muted,marginBottom:14}}>Ask anything about this month's close in plain English. The assistant reads all 9 modules and answers instantly — no tab switching needed.</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
                  {[
                    "Are we ready to close January?",
                    "What is our biggest risk this month?",
                    "Why did provision for credit losses go up?",
                    "Which SOX controls are overdue?",
                    "Is Reg W close to the limit?",
                    "Summarize exceptions for the CFO",
                  ].map((q,i)=>(
                    <button key={i} onClick={()=>setChatInput(q)}
                      style={{padding:"5px 12px",background:T.card,border:"1px solid "+T.amber+"33",borderRadius:20,fontSize:11,color:T.amberBr,cursor:"pointer",fontFamily:T.sans,transition:"all .15s"}}
                      onMouseEnter={e=>e.currentTarget.style.background=T.amberDim}
                      onMouseLeave={e=>e.currentTarget.style.background=T.card}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat messages */}
              <div style={{flex:1,overflowY:"auto",padding:"0 22px 16px",display:"flex",flexDirection:"column",gap:12}}>
                {chatMessages.map((m,i)=>(
                  <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",flexDirection:m.role==="user"?"row-reverse":"row"}}>
                    <div style={{width:28,height:28,borderRadius:"50%",background:m.role==="user"?T.blueDim:T.amberDim,border:"1px solid "+(m.role==="user"?T.blue:T.amber)+"44",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:12}}>
                      {m.role==="user"?"👤":"✦"}
                    </div>
                    <div style={{maxWidth:"75%",background:m.role==="user"?T.blueDim:T.card,border:"1px solid "+(m.role==="user"?T.blue:T.border)+"44",borderRadius:10,padding:"11px 14px"}}>
                      <SmartOutput text={m.text}/>
                    </div>
                  </div>
                ))}
                {chatRunning&&(
                  <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                    <div style={{width:28,height:28,borderRadius:"50%",background:T.amberDim,border:"1px solid "+T.amber+"44",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>✦</div>
                    <div style={{background:T.card,border:"1px solid "+T.border+"44",borderRadius:10,padding:"11px 14px"}}>
                      <span style={{fontFamily:T.mono,fontSize:11,color:T.amberBr,animation:"pulse 1.5s ease infinite",display:"inline-block"}}>Analyzing all modules…</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Input bar */}
              <div style={{padding:"12px 22px 16px",borderTop:"1px solid "+T.border,flexShrink:0,display:"flex",gap:10}}>
                <input
                  value={chatInput}
                  onChange={e=>setChatInput(e.target.value)}
                  onKeyDown={async e=>{
                    if(e.key==="Enter"&&chatInput.trim()&&!chatRunning){
                      const q = chatInput.trim();
                      setChatInput("");
                      setChatMessages(p=>[...p,{role:"user",text:q}]);
                      setChatRunning(true);
                      const context = `
You are the SFS Close Assistant for Square Financial Services — January 2024.

CURRENT MONTH DATA SUMMARY:
- Loan Portfolio: $45.2M (+$3.4M MoM)
- BNPL Receivables: $12.84M (+14.6% MoM)
- Tier 1 Capital: $85M | CET1: 12.0%
- Reg W Exposure: 8.82% of Tier 1 ($7.505M) — WARNING: approaching 10% limit
- Recon Exceptions: 2 (BNPL $190K lag, Merchant Payables $212K pending settlements)
- SOX Overdue: 2 controls (SOX-001 JE Authorization, SOX-006 NetSuite Access Controls)
- Open PBC Items: 4 (including URGENT: SOX evidence for Internal Audit due Feb 5)
- CECL Shortfall: $311,100 — JE-SFS-002 books $73,500 but model requires $384,600
- NIM: 5.00% stable
- Journal Entries: 8 total — 4 require Controller approval before posting
- Call Report RC-O: $4.25M due to Block Inc. affiliates — verify Reg W before filing

READY TO POST STATUS: NO — blocking items: CECL shortfall, 2 SOX controls overdue, Reg W approaching limit

Answer the user's question in plain English. Be specific with dollar amounts. If something is a risk, say so clearly. If something is fine, say so clearly. Keep answers concise — CFO level, not textbook level.`;
                      try {
                        const answer = await callClaude(context+"\n\nUSER QUESTION: "+q, "", 800);
                        setChatMessages(p=>[...p,{role:"assistant",text:answer}]);
                      } catch(err) {
                        setChatMessages(p=>[...p,{role:"assistant",text:"Error: "+err.message}]);
                      } finally {
                        setChatRunning(false);
                      }
                    }
                  }}
                  placeholder="Ask anything — e.g. Are we ready to close January?"
                  style={{flex:1,background:T.card,border:"1px solid "+T.borderHi,borderRadius:8,padding:"10px 14px",fontSize:13,color:T.txt,fontFamily:T.sans,outline:"none"}}
                />
                <button
                  disabled={!chatInput.trim()||chatRunning}
                  onClick={async()=>{
                    const q=chatInput.trim();
                    if(!q||chatRunning) return;
                    setChatInput("");
                    setChatMessages(p=>[...p,{role:"user",text:q}]);
                    setChatRunning(true);
                    const context=`You are the SFS Close Assistant for Square Financial Services — January 2024. CECL shortfall $311K. Reg W at 8.82%. 2 SOX overdue. 4 JEs need approval. Ready to post: NO. Answer concisely at CFO level with specific dollar amounts.`;
                    try {
                      const answer=await callClaude(context+"\n\nUSER QUESTION: "+q,"",800);
                      setChatMessages(p=>[...p,{role:"assistant",text:answer}]);
                    } catch(err) {
                      setChatMessages(p=>[...p,{role:"assistant",text:"Error: "+err.message}]);
                    } finally { setChatRunning(false); }
                  }}
                  style={{padding:"10px 20px",background:chatInput.trim()&&!chatRunning?"linear-gradient(135deg,"+T.amber+","+T.amberBr+")":T.card,color:chatInput.trim()&&!chatRunning?"#000":T.faint,border:"1px solid "+(chatInput.trim()?T.amber:T.border),borderRadius:8,fontWeight:700,fontSize:13,transition:"all .2s"}}>
                  {chatRunning?"…":"Ask"}
                </button>
              </div>
            </div>
          )}

          {/* CONTROLLER SIGN-OFF PACKAGE */}
          {tab==="signoff"&&(
            <div style={{flex:1,overflowY:"auto",padding:"18px 22px 36px"}}>
              <div style={{marginBottom:16}}>
                <div style={{fontSize:20,fontWeight:700,color:T.greenBr}}>✦ Controller Sign-Off Package</div>
                <div style={{fontSize:12,color:T.muted,marginTop:3}}>AI-generated close certification memo · {SAMPLE.period} · Review before signing</div>
              </div>

              {/* What this does */}
              <div style={{background:T.greenDim,border:"1px solid "+T.green+"33",borderRadius:8,padding:"13px 16px",marginBottom:18,borderLeft:"3px solid "+T.green}}>
                <div style={{fontSize:13,fontWeight:600,color:T.greenBr,marginBottom:6}}>What this generates</div>
                <div style={{fontSize:12,color:T.muted,lineHeight:1.9}}>
                  After reviewing all 9 modules the AI writes a complete Controller close memo — executive summary, all exceptions found, blocking items, items cleared, and a formal sign-off statement ready for the CFO. What normally takes 2-4 hours of senior accountant time takes 30 seconds. <strong style={{color:T.greenBr}}>Human review and signature required before any use.</strong>
                </div>
              </div>

              {!signoff && !signoffRunning && (
                <button onClick={async()=>{
                  setSignoffRunning(true);
                  const prompt=`Generate a formal Controller Month-End Close Certification Memo for Square Financial Services for January 2024.

DATA SUMMARY:
- Period: January 2024
- Entity: Square Financial Services (bank subsidiary of Block Inc.)
- Loan Portfolio: $45.2M | BNPL Receivables: $12.84M | Tier 1 Capital: $85M
- NIM: 5.00% | CET1 Ratio: 12.0%

EXCEPTIONS FOUND:
1. CECL Reserve Shortfall — JE-SFS-002 books $73,500 but model requires $384,600. Gap: $311,100. CFO sign-off required.
2. BNPL Reconciliation Exception — $190,000 product ledger lag. 15 days aged. Under investigation.
3. Merchant Payables Exception — $212,000 in 2 pending settlement batches. Expected to clear within 3 business days.
4. SOX-001 Overdue — Journal Entry Authorization control not tested since October 2023. Owner: Controller.
5. SOX-006 Overdue — NetSuite Access Controls not tested since September 2023. Owner: IT/Finance.
6. Reg W Warning — Exposure at 8.82% of Tier 1 ($7.505M). Approaching 10% legal limit. Board notification required if exceeded.
7. PBC Urgent — SOX control testing evidence due Internal Audit February 5. Not yet delivered.

ITEMS CLEARED:
- Bank reconciliation: PASS — all cash accounts reconciled
- Double-entry check: PASS — all JEs balanced
- Call Report RC-O: mapped and verified
- Intercompany JE-SFS-007: documented per ICA
- Capital allocation JE-SFS-008: on track for 12% CET1

READY TO POST: NO — 3 blocking items (CECL shortfall, SOX overdue x2)

Write a formal professional memo with these sections:
1. EXECUTIVE SUMMARY (3 sentences — what happened this month, key finding, overall status)
2. ITEMS CLEARED FOR POSTING (list what is clean)
3. BLOCKING ITEMS — REQUIRES RESOLUTION BEFORE POSTING (specific dollar amounts and required actions)
4. ITEMS REQUIRING MONITORING (non-blocking but needs follow-up)
5. CONTROLLER CERTIFICATION STATEMENT (formal language — "I have reviewed..." with signature line)

Tone: formal, professional, CFO-ready. Be specific with dollar amounts and account references.`;
                  try {
                    const result = await callClaude(prompt, "", 1400);
                    setSignoff(result);
                  } catch(err) {
                    setSignoff("Error generating sign-off: "+err.message);
                  } finally {
                    setSignoffRunning(false);
                  }
                }}
                style={{width:"100%",padding:"14px",background:"linear-gradient(135deg,"+T.green+","+T.greenBr+"44)",color:"#fff",border:"none",borderRadius:8,fontWeight:700,fontSize:14,fontFamily:T.sans,cursor:"pointer",marginBottom:20,display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
                  ✦ Generate Controller Close Memo for {SAMPLE.period}
                </button>
              )}

              {signoffRunning&&(
                <div style={{textAlign:"center",padding:"40px",background:T.card,borderRadius:10,border:"1px solid "+T.border,marginBottom:20}}>
                  <div style={{fontFamily:T.mono,fontSize:11,color:T.greenBr,animation:"pulse 1.5s ease infinite",display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
                    <span style={{animation:"spin .8s linear infinite",display:"inline-block"}}>◎</span>
                    Reviewing all 9 modules and drafting close memo… 20–30 seconds
                  </div>
                </div>
              )}

              {signoff&&(
                <div>
                  {/* Toolbar */}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}>
                    <div style={{background:T.amberDim,border:"1px solid "+T.amber+"44",borderRadius:6,padding:"6px 12px",fontFamily:T.mono,fontSize:10,color:T.amberBr,fontWeight:700}}>
                      ⚠ AI DRAFT — Controller review and signature required before use
                    </div>
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={()=>{
                        const blob=new Blob([signoff],{type:"text/plain"});
                        const a=document.createElement("a");
                        a.href=URL.createObjectURL(blob);
                        a.download="SFS-Close-Memo-"+SAMPLE.period.replace(" ","-")+".txt";
                        a.click();
                      }} style={{padding:"6px 14px",background:T.card,color:T.muted,border:"1px solid "+T.border,borderRadius:6,fontSize:10,fontFamily:T.mono,cursor:"pointer"}}>
                        Export TXT
                      </button>
                      <button onClick={()=>{setSignoff(null);}}
                        style={{padding:"6px 14px",background:T.redDim,color:T.redBr,border:"1px solid "+T.red+"33",borderRadius:6,fontSize:10,fontFamily:T.mono,cursor:"pointer"}}>
                        Regenerate
                      </button>
                    </div>
                  </div>

                  {/* Memo output */}
                  <div style={{background:T.card,border:"1px solid "+T.green+"33",borderRadius:10,padding:"24px 28px",borderTop:"4px solid "+T.green}}>
                    <SmartOutput text={signoff}/>

                    {/* Signature block */}
                    <div style={{marginTop:32,paddingTop:20,borderTop:"1px solid "+T.border}}>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24}}>
                        {[
                          {role:"Controller",label:"Reviewed and approved by Controller"},
                          {role:"CFO",label:"Reviewed and approved by CFO"},
                        ].map((s,i)=>(
                          <div key={i} style={{background:T.panel,border:"1px solid "+T.border,borderRadius:8,padding:"14px 16px"}}>
                            <div style={{fontFamily:T.mono,fontSize:9,color:T.faint,letterSpacing:"1.5px",textTransform:"uppercase",marginBottom:16}}>{s.label}</div>
                            <div style={{borderBottom:"1px solid "+T.muted+"44",marginBottom:8,height:32}}/>
                            <div style={{fontFamily:T.mono,fontSize:10,color:T.muted}}>Signature · {s.role}</div>
                            <div style={{borderBottom:"1px solid "+T.muted+"44",marginBottom:8,height:24,marginTop:12}}/>
                            <div style={{fontFamily:T.mono,fontSize:10,color:T.muted}}>Date</div>
                          </div>
                        ))}
                      </div>
                    </div>
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
