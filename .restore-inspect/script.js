console.log("VEXORA CHAT");

const cards=document.querySelectorAll(".card");

cards.forEach(card=>{

card.addEventListener("mouseenter",()=>{

card.style.transform="scale(1.04)";

});

card.addEventListener("mouseleave",()=>{

card.style.transform="scale(1)";

});

});