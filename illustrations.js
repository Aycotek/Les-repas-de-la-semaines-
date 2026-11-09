/* Illustrations des plats : dessins vectoriels générés par le code à partir des ingrédients de chaque recette.
   Ce sont des dessins illustratifs (pas des photos du plat réel) : aucune image externe, aucun droit tiers. */
(function(){
"use strict";
const hash=s=>{let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
const rng=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
const f=n=>Math.round(n*10)/10;
/* catégorie visuelle d'un ingrédient : [cat, libellé] ; null = non dessiné (assaisonnement, liquide, farine…) */
const REGLES=[
 [/^(boeuf|veau|agneau|cote_agneau|merguez|moelle)/,"viande"],[/^(poulet|filet_poulet|haut_de_cuisse|escalope_dinde|pintade|confit_canard)/,"volaille"],
 [/^(porc_|jambon_|lardons|saucisse_)/,"porc"],[/^(saumon|rouget|truite|thon_frais)/,"poisson_rose"],
 [/^(cabillaud|colin|lieu_jaune|loup|merlan|merlu|morue|raie|maquereau|sardine|hareng|thon_boite)/,"poisson"],
 [/^crevette/,"crevette"],[/^(crabe|encornet|poulpe|seiche)/,"anneau"],[/^moule/,"moule"],[/^oeuf/,"oeuf"],
 [/^(comte|gruyere|beaufort|cheddar|parmesan|pecorino|reblochon|mozzarella|burrata|feta|bleu|chevre|ricotta)/,"fromage"],
 [/^(riz|boulgour|semoule|quinoa|epeautre|orge|polenta)/,"grain"],[/^(pates|spaghetti|tagliatelle|nouilles|vermicelle|crozets|lasagne)/,"pate"],
 [/^(pomme_de_terre|topinambour|panais|navet|celeri_boule)/,"cube"],[/^(lentille|pois_chiches|pois_casses|haricots_|feve|mais)/,"legumineuse"],
 [/^(carotte|butternut|courge|potiron|patate_douce|orange)/,"orange"],[/^(tomate|poivron|betterave|chou_rouge|radis|fraise)/,"rouge"],
 [/^(brocoli|haricot_vert|epinards|chou_kale|chou_vert|chou_de_bruxelles|courgette|asperge|petit_pois|laitue|roquette|mache|salade|pak_choi|concombre|artichaut|oseille|ortie|cardon|fenouil|endive|avocat)/,"vert"],
 [/^(champignon|cepe|girolle)/,"champignon"],[/^chou_fleur/,"chou_fleur"],[/^(oignon|echalote|poireau)/,"oignon"],[/^aubergine/,"aubergine"],
 [/^(pomme$|peche|mangue|melon|raisin$|kiwi|rhubarbe)/,"fruit"],[/^(pain_|naan|tortilla|vol_au_vent|pate_)/,"pain"],[/^tofu/,"tofu"]
];
const HERBES=/^(persil|basilic|ciboulette|coriandre|aneth|menthe|thym|romarin|sauge)/;
const SOUPE=/soupe|velouté|bouillon|minestrone|dahl|curry|ramen|potage|chili|ragoût|blanquette|pot-au-feu|tajine/i;
function elements(r){
 const m=new Map();
 for(const [k,g] of r.ing){let cat=null;for(const [re,c] of REGLES)if(re.test(k)){cat=c;break;}if(cat&&cat!=="pain")m.set(cat,(m.get(cat)||0)+g);}
 const tri=[...m].sort((a,b)=>b[1]-a[1]).slice(0,5).map(x=>x[0]);
 return tri;
}
function fond(cats){
 if(cats.includes("orange"))return"#e0913b";if(cats.includes("rouge"))return"#c5543a";if(cats.includes("legumineuse"))return"#a9763f";if(cats.includes("vert"))return"#9fb36a";return"#e9d5a8";
}
const P={
 viande:(x,y,s,R,id)=>`<rect x="${f(x-s)}" y="${f(y-s*.8)}" width="${f(s*2)}" height="${f(s*1.6)}" rx="${f(s*.45)}" fill="#8f3f31" transform="rotate(${f(R()*80-40)} ${f(x)} ${f(y)})"/><rect x="${f(x-s*.7)}" y="${f(y-s*.6)}" width="${f(s*1.1)}" height="${f(s*.5)}" rx="${f(s*.25)}" fill="#b96a52" opacity=".7" transform="rotate(${f(R()*80-40)} ${f(x)} ${f(y)})"/>`,
 volaille:(x,y,s,R)=>`<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(s*1.15)}" ry="${f(s*.8)}" fill="#d8a45f" transform="rotate(${f(R()*180)} ${f(x)} ${f(y)})"/><ellipse cx="${f(x-s*.2)}" cy="${f(y-s*.2)}" rx="${f(s*.6)}" ry="${f(s*.3)}" fill="#f0cd92" opacity=".8"/>`,
 porc:(x,y,s,R)=>`<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(s*1.1)}" ry="${f(s*.7)}" fill="#e39a96" transform="rotate(${f(R()*180)} ${f(x)} ${f(y)})"/><path d="M${f(x-s)} ${f(y)}q${f(s)} ${f(-s*.5)} ${f(s*2)} 0" stroke="#fbd5d0" stroke-width="2" fill="none"/>`,
 poisson_rose:(x,y,s,R)=>`<g transform="rotate(${f(R()*60-30)} ${f(x)} ${f(y)})"><path d="M${f(x-s*1.6)} ${f(y)}q${f(s*1.6)} ${f(-s*1.3)} ${f(s*3.2)} 0q${f(-s*1.6)} ${f(s*1.3)} ${f(-s*3.2)} 0z" fill="#f2977b"/><path d="M${f(x-s)} ${f(y-1)}q${f(s)} ${f(-s*.5)} ${f(s*2)} 0M${f(x-s*.8)} ${f(y+s*.3)}q${f(s*.8)} ${f(-s*.4)} ${f(s*1.6)} 0" stroke="#fbcfb9" stroke-width="2" fill="none"/></g>`,
 poisson:(x,y,s,R)=>`<g transform="rotate(${f(R()*60-30)} ${f(x)} ${f(y)})"><path d="M${f(x-s*1.6)} ${f(y)}q${f(s*1.6)} ${f(-s*1.3)} ${f(s*3.2)} 0q${f(-s*1.6)} ${f(s*1.3)} ${f(-s*3.2)} 0z" fill="#efe3cb"/><path d="M${f(x-s)} ${f(y)}q${f(s)} ${f(-s*.4)} ${f(s*2)} 0" stroke="#d6c4a0" stroke-width="2" fill="none"/></g>`,
 crevette:(x,y,s,R)=>`<path d="M${f(x-s)} ${f(y+s*.6)}c${f(-s*.2)} ${f(-s*1.8)} ${f(s*1.9)} ${f(-s*1.8)} ${f(s*2)} ${f(s*.2)}" stroke="#f08a5d" stroke-width="${f(s*.8)}" stroke-linecap="round" fill="none" transform="rotate(${f(R()*360)} ${f(x)} ${f(y)})"/>`,
 anneau:(x,y,s)=>`<circle cx="${f(x)}" cy="${f(y)}" r="${f(s*.8)}" fill="none" stroke="#f1e4d0" stroke-width="${f(s*.55)}"/>`,
 moule:(x,y,s,R)=>`<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(s*1.1)}" ry="${f(s*.7)}" fill="#33405a" transform="rotate(${f(R()*180)} ${f(x)} ${f(y)})"/><ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(s*.6)}" ry="${f(s*.25)}" fill="#f1a45f" opacity=".85" transform="rotate(${f(R()*180)} ${f(x)} ${f(y)})"/>`,
 oeuf:(x,y,s)=>`<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(s*1.5)}" ry="${f(s*1.2)}" fill="#fffaf0"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(s*.6)}" fill="#f2b632"/>`,
 fromage:(x,y,s,R)=>`<path d="M${f(x-s)} ${f(y+s*.7)}l${f(s*2)} 0l${f(-s)} ${f(-s*1.5)}z" fill="#f2cf6a" transform="rotate(${f(R()*360)} ${f(x)} ${f(y)})"/>`,
 grain:(x,y,s,R)=>Array.from({length:9},()=>`<ellipse cx="${f(x+(R()-.5)*s*3)}" cy="${f(y+(R()-.5)*s*2.4)}" rx="${f(s*.35)}" ry="${f(s*.17)}" fill="#efe0b8" transform="rotate(${f(R()*180)} ${f(x)} ${f(y)})"/>`).join(""),
 pate:(x,y,s,R)=>`<path d="M${f(x-s*1.3)} ${f(y)}q${f(s*.6)} ${f(-s)} ${f(s*1.3)} 0t${f(s*1.3)} 0" stroke="#e8c978" stroke-width="${f(s*.4)}" fill="none" stroke-linecap="round" transform="rotate(${f(R()*60-30)} ${f(x)} ${f(y)})"/><path d="M${f(x-s*1.2)} ${f(y+s*.7)}q${f(s*.6)} ${f(-s)} ${f(s*1.3)} 0t${f(s*1.3)} 0" stroke="#dbb85f" stroke-width="${f(s*.4)}" fill="none" stroke-linecap="round" transform="rotate(${f(R()*60-30)} ${f(x)} ${f(y)})"/>`,
 cube:(x,y,s,R)=>`<rect x="${f(x-s*.75)}" y="${f(y-s*.75)}" width="${f(s*1.5)}" height="${f(s*1.5)}" rx="${f(s*.25)}" fill="#f2dfa5" transform="rotate(${f(R()*90)} ${f(x)} ${f(y)})"/>`,
 legumineuse:(x,y,s,R)=>Array.from({length:7},()=>`<circle cx="${f(x+(R()-.5)*s*2.8)}" cy="${f(y+(R()-.5)*s*2.8)}" r="${f(s*.38)}" fill="#b98a4e"/>`).join(""),
 orange:(x,y,s)=>`<circle cx="${f(x)}" cy="${f(y)}" r="${f(s*.95)}" fill="#e98a2a"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(s*.45)}" fill="#f5b55a"/>`,
 rouge:(x,y,s)=>`<circle cx="${f(x)}" cy="${f(y)}" r="${f(s)}" fill="#c1392b"/><path d="M${f(x-s*.4)} ${f(y-s*.7)}l${f(s*.4)} ${f(s*.2)}l${f(s*.4)} ${f(-s*.2)}" stroke="#4d7a36" stroke-width="2" fill="none"/>`,
 vert:(x,y,s,R)=>`<g transform="rotate(${f(R()*360)} ${f(x)} ${f(y)})"><path d="M${f(x-s*1.3)} ${f(y)}q${f(s*1.3)} ${f(-s*1.2)} ${f(s*2.6)} 0q${f(-s*1.3)} ${f(s*1.2)} ${f(-s*2.6)} 0z" fill="#6f9a4b"/><path d="M${f(x-s*1.1)} ${f(y)}l${f(s*2.2)} 0" stroke="#a9cc7a" stroke-width="1.5"/></g>`,
 champignon:(x,y,s)=>`<circle cx="${f(x)}" cy="${f(y)}" r="${f(s)}" fill="#b98f66"/><circle cx="${f(x-s*.25)}" cy="${f(y-s*.25)}" r="${f(s*.5)}" fill="#d7b68f" opacity=".8"/>`,
 chou_fleur:(x,y,s)=>`<circle cx="${f(x-s*.5)}" cy="${f(y)}" r="${f(s*.65)}" fill="#f4ecd6"/><circle cx="${f(x+s*.4)}" cy="${f(y-s*.3)}" r="${f(s*.7)}" fill="#efe4c8"/><circle cx="${f(x+s*.1)}" cy="${f(y+s*.5)}" r="${f(s*.6)}" fill="#f8f2e0"/>`,
 oignon:(x,y,s)=>`<circle cx="${f(x)}" cy="${f(y)}" r="${f(s*.8)}" fill="none" stroke="#efe0c2" stroke-width="${f(s*.4)}"/>`,
 aubergine:(x,y,s)=>`<circle cx="${f(x)}" cy="${f(y)}" r="${f(s)}" fill="#5b3a6e"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(s*.65)}" fill="#ebe1b9"/>`,
 fruit:(x,y,s)=>`<circle cx="${f(x)}" cy="${f(y)}" r="${f(s)}" fill="#e7a842"/><circle cx="${f(x+s*.3)}" cy="${f(y-s*.3)}" r="${f(s*.3)}" fill="#f7d98b" opacity=".8"/>`,
 tofu:(x,y,s,R)=>`<rect x="${f(x-s)}" y="${f(y-s)}" width="${f(s*2)}" height="${f(s*2)}" rx="${f(s*.3)}" fill="#f4e8c8" transform="rotate(${f(R()*40-20)} ${f(x)} ${f(y)})"/>`
};
const NOMS={viande:"viande",volaille:"volaille",porc:"porc",poisson_rose:"poisson",poisson:"poisson",crevette:"crevettes",anneau:"fruits de mer",moule:"moules",oeuf:"œuf",fromage:"fromage",grain:"céréales",pate:"pâtes",cube:"pommes de terre ou racines",legumineuse:"légumineuses",orange:"légumes orangés",rouge:"légumes rouges",vert:"légumes verts",champignon:"champignons",chou_fleur:"chou-fleur",oignon:"oignons",aubergine:"aubergine",fruit:"fruit",tofu:"tofu"};
let compteur=0;
globalThis.illustrationPlat=function(r){
 const R=rng(hash(r.i||r.n)),cats=elements(r),uid="il"+(++compteur),bol=SOUPE.test(r.n);
 const cx=180,cy=108,pr=98;
 let s=`<svg class="plat" viewBox="0 0 360 216" role="img" aria-label="Dessin illustratif du plat, pas une photo : ${cats.map(c=>NOMS[c]).join(", ")||"plat"}" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="${uid}a" cx="50%" cy="40%" r="70%"><stop offset="0" stop-color="#fffaf3"/><stop offset="1" stop-color="#e9dcc6"/></radialGradient><radialGradient id="${uid}b" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="#fffdf9"/><stop offset="1" stop-color="#f0e5d2"/></radialGradient><linearGradient id="${uid}t" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d9c3a0"/><stop offset="1" stop-color="#c9ae86"/></linearGradient></defs>`;
 s+=`<rect width="360" height="216" fill="url(#${uid}t)"/>`;
 for(let i=0;i<18;i++)s+=`<path d="M0 ${f(i*12+R()*6)}h360" stroke="#fff" stroke-opacity=".07" stroke-width="2"/>`;
 s+=`<ellipse cx="${cx+4}" cy="${cy+10}" rx="${pr+4}" ry="${pr-2}" fill="#4a1220" opacity=".22"/>`;
 s+=`<circle cx="${cx}" cy="${cy}" r="${pr}" fill="url(#${uid}a)"/><circle cx="${cx}" cy="${cy}" r="${pr-12}" fill="url(#${uid}b)" stroke="#e2d3b8" stroke-width="1.5"/>`;
 if(bol){
  const col=fond(cats);
  s+=`<circle cx="${cx}" cy="${cy}" r="${pr-22}" fill="${col}"/><circle cx="${cx}" cy="${cy}" r="${pr-22}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="3"/><path d="M${cx-40} ${cy-30}a56 56 0 0 1 30 -18" stroke="#fff" stroke-opacity=".35" stroke-width="3" stroke-linecap="round" fill="none"/>`;
  const garn=cats.filter(c=>!["grain","legumineuse"].includes(c)).slice(0,5);
  for(let i=0;i<13;i++){const a=R()*6.28,d=R()*(pr-50);const c=garn.length?garn[i%garn.length]:"vert";s+=P[c](cx+Math.cos(a)*d,cy+Math.sin(a)*d,8+R()*4,R);}
  if(!/froid/i.test(r.n))s+=`<g class="vapeur" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"><path d="M150 38q-8 -10 0 -20t0 -16"/><path d="M180 34q-8 -10 0 -20t0 -16"/><path d="M210 38q-8 -10 0 -20t0 -16"/></g>`;
 } else {
  const n=Math.max(1,cats.length);
  cats.forEach((c,i)=>{
   const ang=n===1?0:-1.2+i*(6.28/n),rad=n===1?0:48;
   const px=cx+Math.cos(ang)*rad,py=cy+Math.sin(ang)*rad,cnt=i===0?8:6,big=i===0?14:11;
   if(c==="grain"||c==="legumineuse"||c==="pate"){s+=`<ellipse cx="${f(px)}" cy="${f(py+3)}" rx="36" ry="28" fill="#e6d6b2" opacity=".55"/>`;}
   for(let j=0;j<cnt;j++)s+=P[c](px+(R()-.5)*54,py+(R()-.5)*44,big*(.75+R()*.4),R);
  });
  if(!cats.length)s+=`<circle cx="${cx}" cy="${cy}" r="30" fill="#e6d6b2"/>`;
 }
 if(r.ing.some(([k])=>HERBES.test(k)))for(let i=0;i<4;i++){const a=R()*6.28,d=15+R()*45;s+=`<ellipse cx="${f(cx+Math.cos(a)*d)}" cy="${f(cy+Math.sin(a)*d)}" rx="4.5" ry="2" fill="#4f8a3c" transform="rotate(${f(R()*180)} ${f(cx+Math.cos(a)*d)} ${f(cy+Math.sin(a)*d)})"/>`;}
 s+=`<circle cx="${cx}" cy="${cy}" r="${pr}" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="2"/><path d="M${cx-70} ${cy-48}a84 84 0 0 1 60 -28" stroke="#fff" stroke-opacity=".6" stroke-width="4" stroke-linecap="round" fill="none"/></svg>`;
 return s;
};

})();
