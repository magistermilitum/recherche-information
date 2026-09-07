/* Five dedicated demonstrations. Offline, deterministic, no third-party runtime. */
(() => {
  'use strict';
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const query = 'L’air est-il meilleur à Lille ?';
  const atmo = 'https://www.atmo-hdf.fr/actualite/les-bilans-annuels-de-la-qualite-de-lair-2024-sont-parus';
  const geodair = 'https://www.geodair.fr/donnees/api';
  const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const link = (url) => `<a href="${esc(url)}" target="_blank" rel="noreferrer">Lien</a>`;
  const searchBar = (text='',compact=false) => `<div class="v4-search${compact?' compact':''}"><i class="v4-search-icon" aria-hidden="true"></i><div class="v4-query">${esc(text)}</div></div>`;
  const indexDocs = [
    {id:'jour',title:'Indice Atmo : Lille',source:'Atmo · indice journalier',url:'https://www.atmo-hdf.fr/air-commune/Lille/59350/indice-atmo',text:'qualité air Lille indice air Lille prévision air Lille commune'},
    {id:'ville',title:'Comprendre la qualité de l’air à Lille',source:'Ville de Lille · information générale',url:'https://www.lille.fr/Actualites/Comprendre-la-qualite-de-l-air-a-Lille',text:'qualité air Lille pollution air chauffage émissions'},
    {id:'logement',title:'Comment savoir si l’air de son logement est pollué ?',source:'ADEME · air intérieur',url:'https://agirpourlatransition.ademe.fr/particuliers/proteger-sante/eviter-polluants/comment-savoir-air-logement-pollue',text:'meilleur air air logement polluants microcapteurs intérieur'},
    {id:'bilan',title:'Bilans annuels de la qualité de l’air 2024',source:'Atmo · trajectoire régionale',url:atmo,text:'qualité air bilans annuels évolution concentrations région Hauts de France'},
    {id:'series',title:'Geod’air : données et statistiques',source:'LCSQA / Ineris · séries et métadonnées',url:geodair,text:'NO2 moyennes annuelles stations concentrations historiques mesures'}
  ];
  const terms = ['air','meilleur','Lille'];
  const pairs = [['air Lille',false],['meilleur air',false],['meilleur Lille',false]];
  const triples = [['air meilleur Lille',false],['qualité air Lille',true],['air quality Lille',true]];
  function df(value) {const t=norm(value).split(' ');return indexDocs.filter(d=>t.every(w=>norm(d.text).split(' ').includes(w))).length;}
  function idf(value) {return Math.log(1+indexDocs.length/(1+df(value)));}
  // Toy lexical index: saturated term counts, plus co-occurrence bonuses.
  // The weights are calculated from these five abridged teaching texts.
  function docScore(doc) {
    const words=norm(doc.text).split(' ');
    const single=terms.reduce((sum,t)=>{const tf=words.filter(w=>w===norm(t)).length;return sum+idf(t)*tf/(tf+1);},0);
    const bonus=[...pairs,...triples].filter(x=>!x[1]).reduce((sum,[group])=>sum+(norm(group).split(' ').every(t=>words.includes(t))?.2*idf(group):0),0);
    return single+bonus;
  }
  const ranked = indexDocs.map(d=>({...d,score:docScore(d)})).sort((a,b)=>b.score-a.score);
  const fieldDocs = [
    {id:'A',title:'NO₂ en milieu urbain',ville:'Lille',type:'rapport',annee:2024,texte:'Le réseau de Lille suit le NO₂ en milieu urbain.'},
    {id:'B',title:'Capteurs de particules à Lyon',ville:'Lyon',type:'article',annee:2024,texte:'Le dispositif de Lille sert de point de comparaison.'},
    {id:'C',title:'Air extérieur : réseau urbain',ville:'Lille',type:'rapport',annee:2023,texte:'La station du centre-ville mesure le dioxyde d’azote.'},
    {id:'D',title:'Bilan lillois : concentrations',ville:'Lille',type:'rapport',annee:2024,texte:'La série annuelle décrit les concentrations mesurées.'},
    {id:'E',title:'Mesures anciennes du réseau',ville:'Lille',type:'rapport',annee:2008,texte:'Lille est suivie par plusieurs points de prélèvement.'},
    {id:'F',title:'Guide des microcapteurs',ville:'Lille',type:'guide',annee:2024,texte:'Un atelier à Lille illustre la mise en route du matériel.'}
  ];
  const evalDocs = [
    ['A','NO₂ · Lille · 2015–2025',true],['B','Dioxyde d’azote · Lille',true],['C','Stations de fond · Lille',true],
    ['D','Trafic et NO₂ · Lille',true],['E','Bilan lillois · évolution',true],['F','Nitrogen dioxide · Lille',true],
    ['G','NO₂ · indice du jour',false],['H','Ozone · Lille',false],['I','NO₂ · Lyon',false],
    ['J','Capteurs · guide d’achat',false],['K','Pollens · Lille',false],['L','Air intérieur · Paris',false]
  ].map(([id,title,relevant])=>({id,title,relevant}));
  const selections = {broad:['A','B','C','D','E','G','H','I'],strict:['A','C','D','G'],revised:['A','B','C','D','E','F','G']};
  function measures(ids) {
    const useful=evalDocs.filter(d=>d.relevant&&ids.includes(d.id)).length;
    return {retrieved:ids.length,useful,relevant:6,noise:ids.length-useful,missed:6-useful,precision:useful/ids.length,recall:useful/6};
  }
  function pct(n){return (n*100).toLocaleString('fr-FR',{maximumFractionDigits:1})+' %';}

  class Demo {
    constructor(slide,deck) {
      this.slide=slide;this.deck=deck;this.config=JSON.parse(slide.querySelector('.v4-data').textContent);
      this.type=this.config.type;this.surface=slide.querySelector('.v4-surface');
      this.states=JSON.parse(slide.querySelector('.state-data').textContent);this.timers=new Set();this.rafs=new Set();this.generation=0;
      this.fieldState={term:'Lille',type:true,date:true};this.lastIndex=-1;
      this.surface.addEventListener('click',e=>{if(e.target.closest('a,input,label,button,select'))return;this.deck.moveState(1);});
    }
    cancel() {
      this.generation++;
      for(const id of this.timers)clearTimeout(id);for(const id of this.rafs)cancelAnimationFrame(id);
      this.timers.clear();this.rafs.clear();
      this.surface.querySelectorAll('.is-typing').forEach(e=>e.classList.remove('is-typing'));
    }
    later(fn,delay) {
      if(!this.animate){fn();return;}
      const generation=this.generation;
      const id=setTimeout(()=>{this.timers.delete(id);if(this.generation===generation&&!this.slide.hidden)fn();},delay);
      this.timers.add(id);
    }
    frame(fn){const id=requestAnimationFrame(t=>{this.rafs.delete(id);fn(t)});this.rafs.add(id);}
    typeText(el,value,duration=1000) {
      if(!this.animate){el.textContent=value;return;}
      el.textContent='';el.classList.add('is-typing');const start=performance.now(),generation=this.generation;
      const tick=now=>{if(generation!==this.generation||this.slide.hidden)return;const p=Math.min(1,(now-start)/duration);el.textContent=value.slice(0,Math.ceil(value.length*p));if(p<1)this.frame(tick);else el.classList.remove('is-typing');};
      this.frame(tick);
    }
    render(index,options={}) {
      this.cancel();this.lastIndex=index;
      this.animate=options.animate!==false&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.slide.classList.toggle('is-v4-dark',this.type==='ranking'&&index===1);
      const copy=index<0?this.config.baseline:this.states[index];
      this.slide.querySelector('.v4-step-label').textContent=copy.label;
      this.slide.querySelector('.v4-caption h3').textContent=copy.headline;
      this.slide.querySelector('.v4-caption p').textContent=copy.body;
      if(this.type==='fields')this.showFields(index);else this[this.type](index);
    }
    tree(index) {
      if(!this.world) this.createTree();
      const visibleLevel=index<0?0:index===0?1:3;
      const focusFamily=index===2?'history':index===3?'measure':null;
      for(const n of this.treeNodes){
        const el=this.surface.querySelector(`[data-tree-id="${n.id}"]`);
        const show=n.depth<=visibleLevel;
        if(!show)el.classList.remove('is-shown','is-focus');
        else if(!el.classList.contains('is-shown'))this.later(()=>el.classList.add('is-shown'),index===0?n.order*140:Math.max(0,n.depth-1)*260+n.order*25);
        el.classList.toggle('is-focus',(index===2&&n.family==='history')||(index===3&&n.family==='measure'));
        el.classList.toggle('is-outside-focus',!!focusFamily&&n.family!==focusFamily);
      }
      for(const edge of this.treeEdges){
        const el=this.surface.querySelector(`[data-tree-edge="${edge.to}"]`);
        el.classList.toggle('is-outside-focus',!!focusFamily&&(edge.from==='root'||!edge.to.startsWith(focusFamily)));
        if(edge.depth>visibleLevel||el.classList.contains('is-outside-focus')){el.classList.remove('is-shown');el.style.visibility='hidden';}
        else this.later(()=>{el.style.visibility='visible';el.classList.add('is-shown');},index===0?edge.order*140:Math.max(0,edge.depth-1)*240+edge.order*25);
      }
      const cameras=[{x:1550,y:480,z:1.80},{x:1550,y:480,z:.64},{x:1550,y:490,z:.425},{x:530,y:210,z:.90},{x:2550,y:725,z:.84}];
      const cam=cameras[index+1],w=this.surface.clientWidth,h=this.surface.clientHeight;
      if(!this.animate)this.world.classList.add('no-motion');else this.world.classList.remove('no-motion');
      this.world.style.transform=`translate(${w/2-cam.x*cam.z}px,${h/2-cam.y*cam.z}px) scale(${cam.z})`;
      this.world.dataset.camera=JSON.stringify(cam);
      this.surface.querySelector('.v4-tree-location').textContent=['La question','Quatre interprétations','Vue d’ensemble des ramifications','Comparer dans le temps → NO₂','Vérifier la mesure → comparabilité'][index+1];
      this.surface.querySelector('.v4-tree-scale').textContent=index===1?'Vue d’ensemble · les détails suivent':'';
    }
    createTree() {
      this.treeNodes=[];this.treeEdges=[];
      const add=(id,label,x,y,w,h,depth,family,color,tint,parent)=>{
        const n={id,label,x,y,w,h,depth,family,color,tint,order:this.treeNodes.length};this.treeNodes.push(n);
        if(parent)this.treeEdges.push({from:parent,to:id,depth,order:n.order});return n;
      };
      add('root',query,1550,480,560,110,0,'root','#829eaf','#fff');
      const branches=[
        {id:'history',title:'Comparer dans le temps',x:1010,y:220,sx:580,lx:120,color:'#2b62bb',tint:'#eef4fe',subs:[
          ['NO₂ · 2015–2025',83,[['Moyennes annuelles',20],['Même station',146]]],
          ['2015 ou 2025 ?',335,[['Année observée',272],['Date de publication',398]]]]},
        {id:'today',title:'Respirer aujourd’hui',x:2090,y:220,sx:2520,lx:2980,color:'#2f8070',tint:'#edf6f1',subs:[
          ['Indice du jour',83,[['Commune de Lille',20],['Prévision datée',146]]],
          ['Lieu de la sortie',335,[['Rue ou quartier',272],['Air de fond',398]]]]},
        {id:'inside',title:'Air extérieur ou intérieur ?',x:1010,y:720,sx:580,lx:120,color:'#947049',tint:'#f7f2e9',subs:[
          ['Un logement',590,[['Ventilation',520],['Sources intérieures',660]]],
          ['Un bâtiment',860,[['Salle occupée',790],['Heure de mesure',930]]]]},
        {id:'measure',title:'Vérifier la mesure',x:2090,y:720,sx:2520,lx:2980,color:'#7a5999',tint:'#f3eef8',subs:[
          ['Station comparable ?',590,[['Déplacement du site',520],['Instrument utilisé',660]]],
          ['Série comparable ?',860,[['Périodes complètes',790],['Couverture du réseau',930]]]]}
      ];
      for(const b of branches){
        add(b.id,b.title,b.x,b.y,420,146,1,b.id,b.color,b.tint,'root');
        b.subs.forEach(([name,y,leaves],j)=>{
          const id=b.id+'-'+j;add(id,name,b.sx,y,328,112,2,b.id,b.color,b.tint,b.id);
          leaves.forEach(([label,ly],k)=>add(id+'-'+k,label,b.lx,ly,350,114,3,b.id,b.color,b.tint,id));
        });
      }
      const byId=Object.fromEntries(this.treeNodes.map(n=>[n.id,n]));
      const edgeMarkup=this.treeEdges.map(e=>{
        const a=byId[e.from],b=byId[e.to],dir=Math.sign(b.x-a.x);
        const x1=a.x+dir*a.w/2,x2=b.x-dir*b.w/2,mid=(x1+x2)/2;
        return `<path class="v4-tree-edge" data-tree-edge="${e.to}" fill="none" stroke="${b.color}" stroke-width="5" style="--branch-color:${b.color};visibility:hidden" pathLength="1" d="M${x1},${a.y} C${mid},${a.y} ${mid},${b.y} ${x2},${b.y}"/>`;
      }).join('');
      const nodeMarkup=this.treeNodes.map(n=>`<div class="v4-tree-node tree-${['root','main','sub','leaf'][n.depth]}" data-tree-id="${n.id}" data-depth="${n.depth}" style="left:${n.x-n.w/2}px;top:${n.y-n.h/2}px;width:${n.w}px;height:${n.h}px;--branch-color:${n.color};--branch-tint:${n.tint}">${n.depth===0?'<i class="v4-search-icon" aria-hidden="true"></i>':''}<span>${esc(n.label)}</span></div>`).join('');
      this.surface.innerHTML=`<div class="v4-tree-view"><div class="v4-tree-world"><svg class="v4-tree-edges" viewBox="0 0 3200 1000" aria-hidden="true">${edgeMarkup}</svg>${nodeMarkup}</div><div class="v4-tree-location"></div><div class="v4-tree-scale"></div></div>`;
      this.world=this.surface.querySelector('.v4-tree-world');
    }
    ranking(index) {
      if(index<1){
        this.surface.innerHTML=`<div class="v4-search-hero">${searchBar(index===0&&!this.animate?query:'')}<p class="v4-hero-context">Besoin humain : comparer l’évolution entre 2015 et 2025.</p></div>`;
        if(index===0)this.typeText(this.surface.querySelector('.v4-query'),query,1150);
      }else if(index===1){
        const rows=(items,translation=false)=>items.map(([name,extra])=>`<div class="v4-term"><span>${esc(name)}${extra?'<br><small>expansion proposée</small>':''}</span><b data-df="${df(name)}">0/5</b></div>`).join('');
        this.surface.innerHTML=`<div class="v4-console-head"><span>Mini-index · cinq textes abrégés · calcul lexical simplifié</span><span class="v4-console-status">Analyse en cours</span></div><div class="v4-console-grid"><div class="v4-console-column"><h4>Termes retenus</h4>${rows(terms.map(t=>[t,false]))}</div><div class="v4-console-column"><h4>Paires de termes</h4>${rows(pairs)}</div><div class="v4-console-column"><h4>Triples et traduction</h4>${rows(triples)}</div></div><div class="v4-console-foot"><span>Fréquence = documents où ces termes apparaissent (sur 5).</span><span>Score : poids des termes + bonus de cooccurrence.<br>Traductions : pistes proposées, pas encore appliquées.</span></div><div class="v4-progress"><i></i></div>`;
        const start=performance.now(),duration=4000,generation=this.generation;
        const finish=()=>{this.surface.querySelectorAll('[data-df]').forEach(el=>el.textContent=el.dataset.df+'/5');this.surface.querySelector('.v4-console-status').textContent='Scores stabilisés';this.surface.querySelector('.v4-progress i').style.width='100%';};
        if(!this.animate){finish();return;}
        const tick=now=>{
          if(generation!==this.generation||this.slide.hidden)return;
          const p=Math.min(1,(now-start)/duration);
          this.surface.querySelectorAll('[data-df]').forEach((el,i)=>{const active=Math.floor(p*12)%3===Math.floor(i/3);el.parentElement.classList.toggle('is-active',active&&p<1);el.textContent=Math.min(+el.dataset.df,Math.floor(p*6))+'/5';});
          this.surface.querySelector('.v4-progress i').style.width=(p*100)+'%';
          if(p<1)this.frame(tick);else finish();
        };this.frame(tick);
      }else if(index===2){
        this.surface.innerHTML=`${searchBar(query,true)}<ol class="v4-ranked">${ranked.map((d,i)=>`<li class="v4-rank-row v4-enter" style="animation-delay:${i*110}ms"><span class="v4-rank-index">${String(i+1).padStart(2,'0')}</span><div><p class="v4-rank-title">${esc(d.title)}</p><p class="v4-rank-source">${esc(d.source)} · ${link(d.url)}</p></div><span class="v4-score"><small>score</small>${d.score.toFixed(2).replace('.',',')}</span></li>`).join('')}</ol>`;
      }else{
        const f=[['Objet','NO₂'],['Mesure','Moyenne annuelle'],['Lieu','Lille'],['Période','2015–2025'],['Contrôle','Stations comparables']];
        this.surface.innerHTML=`<div class="v4-intent"><b>Une demande explicite</b><span>· les filtres disponibles dépendent du portail</span></div><div class="v4-refinements">${f.map(([a,b],i)=>`<div class="v4-refinement" data-reveal="${i}"><b>${a}</b><span>${b}</span></div>`).join('')}</div><div class="v4-refined-query">NO₂ Lille moyennes annuelles 2015–2025</div><p class="v4-small">Sources attendues : séries de mesures, bilans annuels et historique des stations.</p>`;
        this.revealItems('[data-reveal]',210);
      }
    }
    revealItems(selector,step=200) {
      const items=[...this.surface.querySelectorAll(selector)];
      if(!this.animate)return;
      items.forEach((el,i)=>{el.style.opacity='0';this.later(()=>{el.style.opacity='';el.classList.add('v4-enter');},i*step);});
    }
    iteration(index) {
      if(index<0){this.surface.innerHTML=`<div class="v4-search-hero">${searchBar(query)}<p class="v4-hero-context">Une enquête documentaire, puis une seconde si les preuves manquent.</p></div>`;return;}
      if(index===0){
        const steps=[['Question spontanée',query],['Objet défini','Comment évolue la pollution de l’air à Lille ?'],['Mesure choisie','Comment évoluent les moyennes annuelles de NO₂ à Lille ?'],['Périmètre testable','Entre 2015 et 2025, comment évoluent-elles à stations comparables ?']];
        this.surface.innerHTML=`<ol class="v4-question-ladder">${steps.map(([a,b])=>`<li class="v4-question-rung"><b>${esc(a)}</b><span>${esc(b)}</span></li>`).join('')}</ol>`;
        this.revealItems('.v4-question-rung',500);
      }else if(index===1){
        const rows=[
          ['Bilans · Atmo','#2c62b1','Lire une synthèse territoriale','site:atmo-hdf.fr Lille bilan NO2','Vérifier le territoire et la période couverte.',atmo],
          ['Mesures · Geod’air','#2f806d','Construire la comparaison','NO₂ · Lille · moyenne annuelle','Filtrer les stations et les années 2015–2025.',geodair],
          ['Articles · HAL','#7e609b','Comprendre les méthodes','Lille NO2 évolution','Compléter avec « nitrogen dioxide » et comparer les protocoles.','https://hal.science/']
        ];
        this.surface.innerHTML=`<div class="v4-intent"><b>Question stable</b><span>· traductions adaptées aux sources recherchées</span></div><div class="v4-source-routing">${rows.map(([title,color,why,q,note,url])=>`<article class="v4-route" style="--route-color:${color}"><h4>${title}</h4><code>${esc(q)}</code><p>${note}</p>${link(url)}</article>`).join('')}</div>`;
        this.revealItems('.v4-route',350);
      }else{
        const columns=[
          ['Retenir','#2c7e65',[['Bilan territorial','La bonne zone et les bonnes années.'],['Série annuelle NO₂','Mesures exploitables pour comparer.']]],
          ['Vérifier','#8a659f',[['Historique d’une station','Le site semble avoir changé : vérifier sa continuité.']]],
          ['Écarter pour cette tâche','#a65343',[['Indice du jour','Horizon trop court.'],['Bilan d’une autre région','Périmètre géographique inadéquat.']]]
        ];
        this.surface.innerHTML=`<div class="v4-evaluation">${columns.map(([t,c,items])=>`<div class="v4-eval-column" style="--eval-color:${c}"><h4>${t}</h4>${items.map(([title,body])=>`<div class="v4-eval-card"><b>${title}</b><p>${body}</p></div>`).join('')}</div>`).join('')}</div><div class="v4-iteration-next"><b>Itération 2 →</b><span>Vérifier les ruptures de station, puis reprendre la comparaison.</span></div>`;
        this.revealItems('.v4-eval-card',270);
        const next=this.surface.querySelector('.v4-iteration-next');if(this.animate){next.style.opacity='0';this.later(()=>{next.style.opacity='';next.classList.add('v4-enter');},1900);}
      }
    }
    showFields(index) {
      if(index<0){this.fieldState={term:'Lille',type:true,date:true};this.surface.innerHTML=`<div class="v4-search-hero">${searchBar('')}<p class="v4-hero-context">Trouver des rapports sur l’air à Lille, publiés entre 2020 et 2025.</p></div>`;return;}
      if(index<2){
        const metadata=index===1;
        const controls=metadata?`<p>La ville décrit le document.</p><label class="v4-filter-control"><input type="checkbox" data-filter="type" ${this.fieldState.type?'checked':''}><span>Type : rapport</span></label><label class="v4-filter-control"><input type="checkbox" data-filter="date" ${this.fieldState.date?'checked':''}><span>Année : 2020–2025</span></label><p>Un filtre retiré élargit la sélection.</p>`:`<p>Le mot est cherché dans le texte disponible.</p><p>Une mention dans un exemple ou une comparaison suffit.</p><p>Corpus d’exercice : six notices, texte abrégé.</p>`;
        this.surface.innerHTML=`<div class="v4-field-layout"><aside class="v4-field-sidebar"><h4>${metadata?'Métadonnées':'Plein texte'}</h4>${controls}</aside><div>${searchBar('',true).replace('<div class="v4-query"></div>',`<div class="v4-query"><input class="v4-field-input" aria-label="Terme recherché" value="${esc(this.fieldState.term)}"></div>`)}<div class="v4-result-count" aria-live="polite"></div><div class="v4-field-cards"></div></div></div>`;
        const input=this.surface.querySelector('input.v4-field-input');
        input.addEventListener('input',()=>{this.fieldState.term=input.value;this.refreshFields(metadata);});
        input.addEventListener('keydown',e=>{if(e.key==='Escape'||e.key==='Enter'){e.preventDefault();input.blur();}});
        this.surface.querySelectorAll('[data-filter]').forEach(el=>el.addEventListener('change',()=>{this.fieldState[el.dataset.filter]=el.checked;this.refreshFields(metadata);}));
        this.refreshFields(metadata);
        if(index===0&&this.animate){input.value='';this.later(()=>{input.value=this.fieldState.term;this.refreshFields(false);},650);}
      }else{
        const ids=this.selectedFieldDocs(true).map(d=>d.id);
        const filters=[`    <span class="code-city">{ "term": { "ville": ${esc(JSON.stringify(this.canonicalCity()))} } }</span>`];
        if(this.fieldState.type)filters.push('    <span class="code-type">{ "term": { "type": "rapport" } }</span>');
        if(this.fieldState.date)filters.push('    <span class="code-year">{ "range": { "annee":\n      { "gte": 2020, "lte": 2025 } } }</span>');
        const code='{\n  "query": { "bool": { "filter": [\n'+filters.join(',\n')+'\n  ] } }\n}';
        this.surface.innerHTML=`<div class="v4-code-layout"><div class="v4-code-guide"><h4>De l’interface au code</h4><p style="--code-color:#719fce"><code>ville</code> = ${esc(this.fieldState.term)}<br>Une valeur exacte.</p><p style="--code-color:#6bac95"><code>type</code> = ${this.fieldState.type?'rapport':'tous'}<br>Une catégorie documentaire.</p><p style="--code-color:#b495ca"><code>annee</code> : ${this.fieldState.date?'2020 à 2025':'toutes'}<br>Un intervalle numérique.</p><div class="v4-small">Schéma d’index simplifié, compatible avec le DSL Elasticsearch.</div></div><div class="v4-code-box"><div class="v4-code-endpoint">POST /documents/_search · corps JSON</div><pre>${code}</pre><p class="v4-code-result">Réponse attendue dans ce corpus : ${ids.length} notices · ${ids.join(', ')||'aucune'}</p><div class="v4-small" style="color:#b4c8d8;margin-top:10px">filter croise des contraintes ; il ne mesure pas la pertinence de lecture.</div></div></div>`;
        this.revealItems('.v4-code-guide p',400);
        this.surface.dataset.query=JSON.stringify(this.makeFieldQuery());
      }
    }
    selectedFieldDocs(metadata) {
      const term=norm(this.fieldState.term);
      return fieldDocs.filter(d=>metadata?(norm(d.ville)===term&&(!this.fieldState.type||d.type==='rapport')&&(!this.fieldState.date||(d.annee>=2020&&d.annee<=2025))):norm(d.texte).split(' ').includes(term));
    }
    canonicalCity() {
      return fieldDocs.find(d=>norm(d.ville)===norm(this.fieldState.term))?.ville||this.fieldState.term.trim();
    }
    makeFieldQuery() {
      const filter=[{term:{ville:this.canonicalCity()}}];
      if(this.fieldState.type)filter.push({term:{type:'rapport'}});
      if(this.fieldState.date)filter.push({range:{annee:{gte:2020,lte:2025}}});
      return {query:{bool:{filter}}};
    }
    refreshFields(metadata) {
      const docs=this.selectedFieldDocs(metadata),node=this.surface.querySelector('.v4-field-cards');
      node.classList.toggle('is-many',docs.length>4);
      this.surface.querySelector('.v4-result-count').textContent=`${docs.length} résultat${docs.length!==1?'s':''} / 6 notices · ${metadata?'valeur de champ + filtres':'occurrence dans le texte'}`;
      node.innerHTML=docs.length?docs.map(d=>{
        const words=d.texte.split(/(\s+)/).map(w=>norm(w)===norm(this.fieldState.term)?'<mark>'+esc(w)+'</mark>':esc(w)).join('');
        return `<article class="v4-field-card" data-field-doc="${d.id}"><h4>${d.id} · ${esc(d.title)}</h4><p class="v4-meta">${esc(d.ville)} · ${d.type} · ${d.annee}</p><p class="v4-excerpt">${words}</p></article>`;
      }).join(''):'<p class="v4-text">Aucune notice avec ces critères.</p>';
      this.surface.dataset.resultIds=docs.map(d=>d.id).join(',');
    }
    precision(index) {
      const key=index<2?'broad':index===2?'strict':'revised',ids=selections[key],m=measures(ids);
      const queryText=index<0?'Corpus jugé : 6 documents pertinents sur 12':index===2?'Titre : NO₂ + Lille':index===3?'NO₂ OR « dioxyde d’azote » OR « nitrogen dioxide »':'Requête large : Lille qualité de l’air';
      let right;
      if(index<0)right=`<h4>Le besoin définit la pertinence</h4><p>Polluant : NO₂<br>Lieu : Lille<br>Évolution : 2015–2025</p><div class="v4-metric-number">6 / 12</div><p>Six notices répondent au besoin. Cet ensemble est connu pour l’exercice.</p>`;
      else if(index===0)right=`<h4>Précision</h4><div class="v4-fraction"><b>5 utiles retrouvés</b><span>8 résultats retrouvés</span></div><div class="v4-metric-number">${pct(m.precision)}</div><p>3 hors cible = <b>bruit</b>.</p><p class="v4-metric-note">Le contenu de la liste suffit à calculer cette proportion après lecture.</p>`;
      else if(index===1)right=`<h4>Rappel</h4><div class="v4-fraction"><b>5 utiles retrouvés</b><span>6 documents pertinents</span></div><div class="v4-metric-number">${pct(m.recall)}</div><p>F manque = <b>silence</b>.<br>Son titre emploie l’anglais.</p><p class="v4-metric-note">On découvre cet oubli grâce au corpus jugé, pas en regardant uniquement les résultats.</p>`;
      else right=`<h4>${index===2?'Un filtre plus strict':'Une reformulation enrichie'}</h4><p><b>${m.useful}</b> utiles parmi <b>${m.retrieved}</b> résultats.</p><div class="v4-metric-mini"><span>Précision<strong>${pct(m.precision)}</strong></span><span>Rappel<strong>${pct(m.recall)}</strong></span></div><p>${m.noise} bruit · ${m.missed} silence${m.missed!==1?'s':''}</p><p class="v4-metric-note">${index===2?'Le filtre a aussi retiré B, E et F, pourtant pertinents.':'Ajouter les synonymes et contrôler les années récupère les manqués. G reste à écarter par lecture.'}</p>`;
      const card=d=>{
        let style='',status='';
        if(index<0){style=d.relevant?'is-hit':'is-outside';status=d.relevant?'pertinent':'hors cible';}
        else if(ids.includes(d.id)){style=d.relevant?'is-hit':'is-noise';status=d.relevant?'utile retrouvé':'bruit';}
        else if(d.relevant&&index>=1){style='is-missed';status='silence';}
        else{style='is-outside';status=index===0?'non retourné':'hors sélection';}
        const icon=style==='is-hit'?'✓':style==='is-noise'?'!':style==='is-missed'?'?':'·';
        return `<div class="v4-doc ${style}" aria-label="${d.id} · ${esc(d.title)} · ${status}" data-doc="${d.id}" data-relevant="${d.relevant}" data-retrieved="${index>=0&&ids.includes(d.id)}"><span class="v4-doc-index">${d.id}<small aria-hidden="true">${icon}</small></span><span class="v4-doc-label">${esc(d.title)}</span></div>`;
      };
      this.surface.innerHTML=`<div class="v4-measures-layout"><div><div class="v4-corpus-head"><p class="v4-corpus-query">${esc(queryText)}</p></div><div class="v4-corpus">${evalDocs.map(card).join('')}</div><div class="v4-legend"><span style="--key-color:#75b49b">utile</span><span style="--key-color:#d59989">bruit</span><span style="--key-color:#b397c8">silence</span><span style="--key-color:#bcc5c9">hors sélection</span></div></div><aside class="v4-metric-panel">${right}</aside></div>`;
      if(index===0)this.revealItems('.v4-doc.is-hit,.v4-doc.is-noise',90);
      if(index===1)this.revealItems('.v4-doc.is-missed',180);
      this.surface.dataset.metrics=JSON.stringify(m);
    }
  }
  function boot(){
    const deck=window.AtlasDeck;if(!deck)return;
    const demos=new Map([...document.querySelectorAll('[data-v4-demo]')].map(el=>[el,new Demo(el,deck)]));
    // Do not patch the shared engine. These adapters exist only in the two CM pages.
    const apply=deck.applyState,activate=deck.activate;
    deck.applyState=function(slide,index,options){apply.call(this,slide,index,options);const d=demos.get(slide);if(d)d.render(index,options);};
    deck.activate=function(...args){for(const d of demos.values())d.cancel();return activate.apply(this,args);};
    const current=deck.activeSlide();if(demos.has(current))demos.get(current).render(deck.stateIndexBySlide.get(current)??-1,{animate:false});
    deck.dockH?.addEventListener('click',()=>deck.moveState(1));
    deck.dockZ?.addEventListener('click',()=>{if(deck.isZoomOpen())deck.moveZoomState(1);else {const t=deck.zoomTarget();if(t)deck.openZoom(t);}});
    window.AtlasDemos={demos,indexDocs,ranked,fieldDocs,evalDocs,selections,measures,df,idf,version:4};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
