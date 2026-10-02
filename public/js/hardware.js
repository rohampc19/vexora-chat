const parts=[
 {type:'gpu',name:'NVIDIA GeForce RTX 5070',brand:'NVIDIA / Blackwell',spec:'12GB GDDR7 · 1440p Ultra',score:92},
 {type:'gpu',name:'AMD Radeon RX 9070 XT',brand:'AMD / RDNA 4',spec:'16GB GDDR6 · 4K Ready',score:94},
 {type:'cpu',name:'AMD Ryzen 7 9800X3D',brand:'AMD / AM5',spec:'۸ هسته · ۱۶ رشته · 3D V-Cache',score:97},
 {type:'cpu',name:'Intel Core Ultra 7 265K',brand:'Intel / LGA1851',spec:'۲۰ هسته · NPU · DDR5',score:88},
 {type:'monitor',name:'LG UltraGear OLED 27GS',brand:'LG / OLED',spec:'۲۷ اینچ · QHD · 240Hz',score:95},
 {type:'peripheral',name:'Logitech G Pro X 2',brand:'Logitech / Wireless',spec:'هدفون گیمینگ · ۵۰ ساعت شارژ',score:90}
];
const grid=document.getElementById('hardwareGrid');
function render(filter='all'){const list=parts.filter(x=>filter==='all'||x.type===filter);grid.innerHTML=list.length?list.map(x=>`<article class="hardware-card"><span class="hardware-kicker">${x.type.toUpperCase()}</span><h2>${x.name}</h2><p>${x.brand}</p><p>${x.spec}</p><div class="hardware-meta"><span>امتیاز انتخاب</span><b>${x.score}/100</b></div></article>`).join(''):'<div class="hardware-empty">قطعه‌ای پیدا نشد.</div>';}
document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-filter]').forEach(x=>x.classList.remove('active'));button.classList.add('active');render(button.dataset.filter)}));
render();
