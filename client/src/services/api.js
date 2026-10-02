export const api=async(path,options={},retry=true)=>{
  const run=()=>fetch(`/api${path}`,{credentials:'include',headers:{'Content-Type':'application/json',...(options.headers||{})},...options});
  let response=await run();
  if(response.status===401&&retry&&!['/auth/login','/auth/register','/auth/refresh'].includes(path)){const rr=await fetch('/api/auth/refresh',{method:'POST',credentials:'include'});if(rr.ok)response=await run()}
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.message||'خطا در ارتباط با سرور');
  return data;
};
export const authApi={register:b=>api('/auth/register',{method:'POST',body:JSON.stringify(b)}),login:b=>api('/auth/login',{method:'POST',body:JSON.stringify(b)}),me:()=>api('/auth/me'),logout:()=>api('/auth/logout',{method:'POST'},false)};
export const newsApi={
  list:(params={})=>{const q=new URLSearchParams();if(params.q)q.set('q',params.q);if(params.category)q.set('category',params.category);if(params.featured)q.set('featured','true');return api(`/news${q.toString()?`?${q}`:''}`)},
  get:id=>api(`/news/${id}`),like:id=>api(`/news/${id}/like`,{method:'POST'}),comment:(id,text)=>api(`/news/${id}/comments`,{method:'POST',body:JSON.stringify({text})}),likeComment:(id,commentId)=>api(`/news/${id}/comments/${commentId}/like`,{method:'POST'})
};
export const userApi={profile:username=>api(`/users/${encodeURIComponent(username)}`),follow:id=>api(`/users/${id}/follow`,{method:'POST'}),update:body=>api('/users/me',{method:'PATCH',body:JSON.stringify(body)})};
export const communityApi={
  list:(page=1)=>api(`/community?page=${page}&limit=12`),
  create:body=>api('/community',{method:'POST',body:JSON.stringify(body)}),
  like:id=>api(`/community/${id}/like`,{method:'POST'}),
  comments:id=>api(`/community/${id}/comments`),
  comment:(id,text)=>api(`/community/${id}/comments`,{method:'POST',body:JSON.stringify({text})}),
  remove:id=>api(`/community/${id}`,{method:'DELETE'})
};
export const groupApi={list:()=>api('/groups'),details:id=>api(`/groups/${id}`),create:b=>api('/groups',{method:'POST',body:JSON.stringify(b)}),join:id=>api(`/groups/${id}/join`,{method:'POST'}),approve:(id,userId)=>api(`/groups/${id}/members/${userId}/approve`,{method:'POST'}),reject:(id,userId)=>api(`/groups/${id}/members/${userId}/reject`,{method:'POST'}),remove:(id,userId)=>api(`/groups/${id}/members/${userId}`,{method:'DELETE'}),transfer:(id,userId)=>api(`/groups/${id}/transfer/${userId}`,{method:'POST'}),invite:(id,username)=>api(`/groups/${id}/invite`,{method:'POST',body:JSON.stringify({username})}),leave:id=>api(`/groups/${id}/leave`,{method:'POST'}),destroy:id=>api(`/groups/${id}`,{method:'DELETE'})};
export const friendApi={list:()=>api('/friends'),request:username=>api(`/friends/${encodeURIComponent(username)}`,{method:'POST'}),accept:id=>api(`/friends/requests/${id}/accept`,{method:'POST'}),reject:id=>api(`/friends/requests/${id}/reject`,{method:'POST'}),block:username=>api(`/friends/${encodeURIComponent(username)}/block`,{method:'POST'})};
export const newsAdminApi={list:()=>api('/admin/news'),create:b=>api('/admin/news',{method:'POST',body:JSON.stringify(b)}),update:(id,b)=>api(`/admin/news/${id}`,{method:'PATCH',body:JSON.stringify(b)}),remove:id=>api(`/admin/news/${id}`,{method:'DELETE'})};
export const adminApi={stats:()=>api('/admin/stats'),users:()=>api('/admin/users'),pending:()=>api('/admin/users/pending'),approve:(id,approved)=>api(`/admin/users/${id}/${approved?'approve':'reject'}`,{method:'POST'}),reports:()=>api('/admin/reports'),logs:()=>api('/admin/logs'),closeReport:id=>api(`/admin/reports/${id}/close`,{method:'POST'}),blockUser:id=>api(`/admin/users/${id}/block`,{method:'POST'}),unblockUser:id=>api(`/admin/users/${id}/unblock`,{method:'POST'})};
export const reportApi={create:body=>api('/reports',{method:'POST',body:JSON.stringify(body)})};
export const notificationApi={list:()=>api('/notifications'),read:id=>api(`/notifications/${id}/read`,{method:'POST'}),readAll:()=>api('/notifications/read-all',{method:'POST'})};
export default api;

export const monetizationApi={catalog:()=>api('/monetization/catalog'),me:()=>api('/monetization/me'),transactions:()=>api('/monetization/transactions'),buyPremium:planId=>api('/monetization/premium/purchase',{method:'POST',body:JSON.stringify({planId})}),buyCoins:packageId=>api('/monetization/coins/purchase',{method:'POST',body:JSON.stringify({packageId})}),mockComplete:paymentId=>api('/monetization/payments/'+paymentId+'/mock-complete',{method:'POST',body:JSON.stringify({paymentId})}),buyItem:id=>api('/monetization/items/'+id+'/purchase',{method:'POST'}),customize:body=>api('/monetization/customize',{method:'PATCH',body:JSON.stringify(body)})};

export const monetizationAdminApi={catalog:()=>api('/admin/monetization'),updateItem:(id,b)=>api('/admin/monetization/items/'+id,{method:'PATCH',body:JSON.stringify(b)}),createItem:b=>api('/admin/monetization/items',{method:'POST',body:JSON.stringify(b)}),updatePlan:(id,b)=>api('/admin/monetization/plans/'+id,{method:'PATCH',body:JSON.stringify(b)}),updateCoin:(id,b)=>api('/admin/monetization/coins/'+id,{method:'PATCH',body:JSON.stringify(b)}),adjustWallet:(userId,amount)=>api('/admin/monetization/wallet/'+userId+'/adjust',{method:'POST',body:JSON.stringify({amount})})};
