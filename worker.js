// Cloudflare Worker (مجاني) — يحمل مفتاح Gemini بعيدًا عن المتصفح
// Secrets: GEMINI_KEY (من aistudio.google.com) ، FB_KEY (Web API Key لمشروع Firebase) ، اختياري ORIGIN
export default{async fetch(r,env){
 const H={'access-control-allow-origin':env.ORIGIN||'*','access-control-allow-headers':'content-type','content-type':'application/json'};
 if(r.method=='OPTIONS')return new Response(null,{headers:H});
 const bad=(e,s=400)=>new Response(JSON.stringify({error:e}),{status:s,headers:H});
 try{
  const{text,n,level,token}=JSON.parse(await r.text());
  const v=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key='+env.FB_KEY,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({idToken:token})});
  if(!v.ok)return bad('غير مصرح',401);
  const N=Math.min(30,Math.max(3,+n||10));
  const p=`Create ${N} multiple-choice questions (difficulty: ${level}) STRICTLY and ONLY from the text below, written in the same language as the text. Never use outside knowledge. Return a JSON array only: [{"q":"question","o":["a","b","c","d"],"a":0}] where o has exactly 4 options and a is the index (0-3) of the correct option. Vary the correct option position.\n\nTEXT:\n${String(text).slice(0,40000)}`;
  const g=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_KEY}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:p}]}],generationConfig:{responseMimeType:'application/json'}})});
  const j=await g.json();
  const a=JSON.parse(j.candidates[0].content.parts[0].text);
  const qs=a.filter(x=>x&&x.q&&Array.isArray(x.o)&&x.o.length==4&&x.a>=0&&x.a<4).slice(0,N);
  if(qs.length<3)return bad('تعذر توليد أسئلة كافية من الملف');
  return new Response(JSON.stringify({questions:qs.map(x=>({q:String(x.q),o:x.o.map(String)})),key:qs.map(x=>x.a).join('')}),{headers:H});
 }catch(e){return bad('فشل التوليد')}}}
