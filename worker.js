export default{async fetch(r,env){
 const H={'access-control-allow-origin':env.ORIGIN||'*','access-control-allow-headers':'content-type','content-type':'application/json'};
 if(r.method=='OPTIONS')return new Response(null,{headers:H});
 const bad=(e,s=400)=>new Response(JSON.stringify({error:e}),{status:s,headers:H});
 try{
  const{text,n,level,token}=JSON.parse(await r.text());
  const v=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key='+env.FB_KEY,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({idToken:token})});
  if(!v.ok)return bad('غير مصرح: تأكد من FB_KEY',401);
  if(!env.GEMINI_KEY)return bad('GEMINI_KEY غير مضاف في Cloudflare',500);
  const N=Math.min(30,Math.max(3,+n||10));
  const p=`Create ${N} multiple-choice questions (difficulty: ${level}) STRICTLY and ONLY from the text below, written in the same language as the text. Never use outside knowledge. Return a JSON array only: [{"q":"question","o":["a","b","c","d"],"a":0}] where o has exactly 4 options and a is the index (0-3) of the correct option. Vary the correct option position.\n\nTEXT:\n${String(text).slice(0,25000)}`;
  let j=null,err='',ms=['gemini-flash-latest','gemini-3.8-flash','gemini-flash-lite-latest'];
  try{const l=await(await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200',{headers:{'x-goog-api-key':env.GEMINI_KEY},signal:AbortSignal.timeout(8000)})).json();
   const f=(l.models||[]).filter(x=>/flash/.test(x.name)&&!/lite|image|tts|live|audio|embed|exp|vision/.test(x.name)&&(x.supportedGenerationMethods||[]).includes('generateContent')).map(x=>x.name.replace('models/','')).sort().reverse();
   ms=[...new Set([...ms,...f.slice(0,3)])]}catch(e){}
  const t0=Date.now();
  for(let rd=0;rd<2&&!j;rd++){if(rd){await new Promise(r=>setTimeout(r,2500));err=''}
  for(const m of ms){if(Date.now()-t0>55000)break;
   const g=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`,{method:'POST',headers:{'content-type':'application/json','x-goog-api-key':env.GEMINI_KEY},body:JSON.stringify({contents:[{parts:[{text:p}]}],generationConfig:{responseMimeType:'application/json'}}),signal:AbortSignal.timeout(22000)}).catch(()=>null);
   if(!g){err+=m+': timeout | ';continue}
   const x=await g.json().catch(()=>({}));
   if(g.ok&&x.candidates&&x.candidates[0]&&x.candidates[0].content){j=x;break}
   err+=m+': '+((x.error&&x.error.message)||JSON.stringify(x)).slice(0,100)+' | ';
  }}
  if(!j)return bad(/demand|overload|quota|exceed|timeout/i.test(err)?'ضغط عالٍ على Gemini مؤقتًا، جرّب مرة أخرى بعد دقيقة. ('+err.slice(0,140)+')':'Gemini: '+err.slice(0,300),503);
  const a=JSON.parse(j.candidates[0].content.parts.map(t=>t.text||'').join('').replace(/```json|```/g,'').trim());
  const qs=a.filter(x=>x&&x.q&&Array.isArray(x.o)&&x.o.length==4&&x.a>=0&&x.a<4).slice(0,N);
  if(qs.length<3)return bad('تعذر توليد أسئلة كافية من الملف');
  return new Response(JSON.stringify({questions:qs.map(x=>({q:String(x.q),o:x.o.map(String)})),key:qs.map(x=>x.a).join('')}),{headers:H});
 }catch(e){return bad('خطأ: '+String(e&&e.message||e).slice(0,120),500)}}}
