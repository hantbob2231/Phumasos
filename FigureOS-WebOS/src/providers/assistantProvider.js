let csrfToken='';
async function csrf(){if(csrfToken)return csrfToken;const r=await fetch('/api/csrf',{credentials:'same-origin'});if(!r.ok)throw new Error('Assistant API unavailable.');const j=await r.json();csrfToken=j.token;return csrfToken;}
export const assistantProvider={
  async send(message){
    try{const token=await csrf();const r=await fetch('/api/assistant',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json','x-csrf-token':token},body:JSON.stringify({message})});const j=await r.json().catch(()=>({}));if(!r.ok)return j.message||'No external assistant provider is configured. Local CIRI commands are still available.';return j.message||'Done.';}catch{return 'No external assistant provider is configured. Local CIRI commands are still available.';}
  }
};
