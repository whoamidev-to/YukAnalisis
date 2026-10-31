const $ = id => document.getElementById(id);
const STORAGE_KEY = "yukAnalisisDataV1";
let data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"name":"Aspianto","activities":[]}');
let editingId = null;
const today = new Date().toISOString().slice(0,10);
$("userName").textContent = data.name || "Teman";
$("editName").textContent = (data.name || "YA").slice(0,2).toUpperCase();
$("editName").addEventListener("click",()=>{const n=prompt("Nama yang ingin ditampilkan:",data.name||"");if(n&&n.trim()){data.name=n.trim();save();render();}});
function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(data));}
function selectedActivities(){
 const days=$("period").value;
 if(days==="all") return data.activities;
 const cutoff=new Date();cutoff.setDate(cutoff.getDate()-Number(days));const key=cutoff.toISOString().slice(0,10);
 return data.activities.filter(a=>a.end>=key);
}
function fmtDate(s){return new Date(s+"T00:00:00").toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"});}
function pct(a,b){return b>0?Math.min(100,Math.round(a/b*100)):null;}
function render(){
 const list=selectedActivities();
 $("totalActivities").textContent=list.length;
 const attendance=list.filter(a=>a.total>0);
 const att=attendance.length?pct(attendance.reduce((s,a)=>s+a.present,0),attendance.reduce((s,a)=>s+a.total,0)):null;
 const targets=list.filter(a=>a.target>0);
 const ach=targets.length?pct(targets.reduce((s,a)=>s+a.actual,0),targets.reduce((s,a)=>s+a.target,0)):null;
 $("attendanceRate").textContent=att===null?"—":att+"%";
 $("achievementRate").textContent=ach===null?"—":ach+"%";
 $("activityList").innerHTML=list.slice().sort((a,b)=>b.start.localeCompare(a.start)).map(a=>`<article class="activity"><div><h3>${escapeHtml(a.name)}</h3><p>${fmtDate(a.start)}${a.end!==a.start?" – "+fmtDate(a.end):""}${a.notes?" · "+escapeHtml(a.notes):""}</p></div><div class="activity-right"><b>${a.present}/${a.total} hadir</b><button data-delete="${a.id}">Hapus</button></div></article>`).join("");
 $("emptyState").hidden=list.length>0;
 $("activityList").querySelectorAll("[data-delete]").forEach(b=>b.onclick=()=>{if(confirm("Hapus kegiatan ini?")){data.activities=data.activities.filter(a=>a.id!==b.dataset.delete);save();render();}});
 drawChart(list);
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function drawChart(list){
 const svg=$("chart"), W=600,H=220,pad=28;let days=Number($("period").value)||30;if($("period").value==="all")days=14;
 const end=new Date();const points=[];
 for(let i=Math.min(days,14)-1;i>=0;i--){const d=new Date(end);d.setDate(d.getDate()-i);const key=d.toISOString().slice(0,10);points.push({key,label:d.toLocaleDateString("id-ID",{day:"numeric",month:"short"}),n:list.filter(a=>a.start<=key&&a.end>=key).length});}
 const max=Math.max(1,...points.map(p=>p.n)),x=i=>pad+i*(W-pad*2)/Math.max(1,points.length-1),y=n=>H-pad-(n/max)*(H-pad*2);
 const line=points.map((p,i)=>(i?"L":"M")+x(i)+","+y(p.n)).join(" ");
 const area=line+` L${x(points.length-1)},${H-pad} L${x(0)},${H-pad} Z`;
 svg.innerHTML=`<defs><linearGradient id="fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#8d78ff" stop-opacity=".28"/><stop offset="100%" stop-color="#8d78ff" stop-opacity=".02"/></linearGradient></defs><path d="${area}" fill="url(#fill)"/><path d="${line}" fill="none" stroke="#7658f6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${points.map((p,i)=>`<circle cx="${x(i)}" cy="${y(p.n)}" r="3.5" fill="#7658f6"/>`).join("")}${points.filter((p,i)=>i%Math.ceil(points.length/5)===0||i===points.length-1).map(p=>`<text x="${x(points.indexOf(p))}" y="${H-5}" text-anchor="middle" font-size="11" fill="#9993ad">${p.label}</text>`).join("")}`;
}
$("period").addEventListener("change",render);
$("addActivity").onclick=()=>{editingId=null;$("activityForm").reset();$("startDate").value=today;$("endDate").value=today;$("dialogTitle").textContent="Tambah kegiatan";$("formError").textContent="";$("activityDialog").showModal();};
$("closeDialog").onclick=()=>$("activityDialog").close();
$("activityForm").addEventListener("submit",e=>{
 e.preventDefault();const start=$("startDate").value,end=$("endDate").value,present=+$("present").value,total=+$("total").value,target=+$("target").value,actual=+$("actual").value;
 if(end<start){$("formError").textContent="Tanggal selesai tidak boleh sebelum tanggal mulai.";return;}
 if(present>total){$("formError").textContent="Jumlah hadir tidak boleh melebihi total peserta.";return;}
 const item={id:crypto.randomUUID(),name:$("activityName").value.trim(),start,end,present,total,target,actual,notes:$("notes").value.trim()};
 data.activities.push(item);save();$("activityDialog").close();render();
});
function download(name,content,type){const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);}
$("exportCsv").onclick=()=>{const rows=[["Nama kegiatan","Tanggal mulai","Tanggal selesai","Hadir","Total peserta","Target","Realisasi","Catatan"],...selectedActivities().map(a=>[a.name,a.start,a.end,a.present,a.total,a.target,a.actual,a.notes])];const csv=rows.map(r=>r.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\r\n");download("laporan-yuk-analisis.csv","\ufeff"+csv,"text/csv;charset=utf-8");};
$("exportWord").onclick=()=>{const rows=selectedActivities().map(a=>`<tr><td>${escapeHtml(a.name)}</td><td>${fmtDate(a.start)} – ${fmtDate(a.end)}</td><td>${a.present}/${a.total}</td><td>${a.actual}/${a.target}</td><td>${escapeHtml(a.notes)}</td></tr>`).join("");const doc=`<html><meta charset="utf-8"><h1>Laporan Yuk Analisis</h1><table border="1" cellspacing="0" cellpadding="6"><tr><th>Kegiatan</th><th>Tanggal</th><th>Kehadiran</th><th>Capaian</th><th>Catatan</th></tr>${rows}</table></html>`;download("laporan-yuk-analisis.doc",doc,"application/msword");};
render();
if("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("service-worker.js").catch(()=>{});
