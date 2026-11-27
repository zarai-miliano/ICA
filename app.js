const data = globalThis.ICA_DATA;
const panelNine = globalThis.ICA_PANEL_NINE;
const maximum = [5,Infinity,9,.035,.315,.15,.0001,.0025,.12,.1,1000,25];
const minimum = [0,5,6.5,0,0,0,0,0,0,0,0,0];

function forward(layers, input) {
  return layers.reduce((values, layer, index) => layer.w.map((weights, j) => {
    const linear = weights.reduce((sum, weight, k) => sum + weight*values[k], layer.b[j]);
    return index < layers.length-1 ? Math.max(0,linear) : linear;
  }), input);
}

function formula(values) {
  const excess = values.map((x,i) => Math.max(0,x/maximum[i]-1,minimum[i]/Math.max(x,1e-12)-1));
  const count = excess.filter(x=>x>0).length;
  const f1 = 100*count/12;
  const sum = excess.reduce((a,b)=>a+b,0);
  const f3 = 100*sum/(1+sum);
  return {ica:100-Math.sqrt((2*f1*f1+f3*f3)/3),count,f1,f3};
}

function formulaPeriod(monitors) {
  if (monitors.length<4 || monitors.some(row=>row.length!==12 || row.some(v=>!Number.isFinite(v)||v<0))) {
    throw new Error('Se requieren al menos cuatro monitoreos completos de doce parámetros.');
  }
  const excess = monitors.map(row=>row.map((x,i)=>Math.max(0,x/maximum[i]-1,minimum[i]/Math.max(x,1e-12)-1)));
  const failedParameters = maximum.filter((_,i)=>excess.some(row=>row[i]>0)).length;
  const failedResults = excess.flat().filter(x=>x>0).length;
  const total = monitors.length*12;
  const nse = excess.flat().reduce((a,b)=>a+b,0)/total;
  const f1 = 100*failedParameters/12, f2 = 100*failedResults/total, f3 = 100*(1-1/(1+nse));
  return {ica:100-Math.sqrt((f1*f1+f2*f2+f3*f3)/3),f1,f2,f3,nse};
}

function predictFull(values) {
  const {layers,mean,scale} = data.complete;
  const [logit] = forward(layers,values.map((v,i)=>(v-mean[i])/scale[i]));
  return 100/(1+Math.exp(-logit));
}

function predictThree(values) {
  const m = data.multi;
  const x = values.map((v,i)=>(Math.log1p(v/m.xu[i])-m.xmean[i])/m.xscale[i]);
  const estimates = forward(m.layers,x).map((v,i)=>m.yu[i]*Math.expm1(Math.max(0,Math.min(25,v*m.yscale[i]+m.ymean[i]))));
  const all = Object.fromEntries([...data.inputs.map((p,i)=>[p,values[i]]),...data.outputs.map((p,i)=>[p,estimates[i]])]);
  return {estimates,...formula(data.order.map(p=>all[p]))};
}

function predictNine(values) {
  const panel = panelNine;
  const all = Array(data.order.length);
  const z = panel.inputs.map((p,i)=>{
    const j = data.order.indexOf(p);
    all[j] = values[i];
    return (Math.log1p(values[i]/panel.units[j])-panel.mean[j])/panel.scale[j];
  });
  const estimates = forward([{w:panel.w,b:panel.b}],z).map((value,i)=>{
    const j = data.order.indexOf(panel.outputs[i]);
    all[j] = panel.units[j]*Math.expm1(Math.max(0,Math.min(25,value*panel.scale[j]+panel.mean[j])));
    return all[j];
  });
  return {estimates,...formula(all)};
}

function classifyICA(value) {
  if (value>=90) return {key:'excelente', label:'Excelente'};
  if (value>=75) return {key:'bueno', label:'Bueno'};
  if (value>=45) return {key:'regular', label:'Regular'};
  if (value>=30) return {key:'malo', label:'Malo'};
  return {key:'pesimo', label:'Pésimo'};
}

if (typeof module !== 'undefined') module.exports = {predictFull,predictThree,predictNine,formula,formulaPeriod,classifyICA};

if (typeof document !== 'undefined') {
  const byId = id=>document.getElementById(id);
  const number = new Intl.NumberFormat('es-PE',{maximumSignificantDigits:5});
  const format = value=>value===null ? '—' : number.format(value);
  const scoreFormat = new Intl.NumberFormat('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
  const scoreColors = {excelente:['#3b6fbe','#eff5fe'],bueno:['#087c8d','#edf8fa'],regular:['#45845c','#edf7ed'],malo:['#966f19','#fcf7e7'],pesimo:['#aa4550','#fff0f1']};
  const infoIcon = '<svg aria-hidden="true" viewBox="0 0 20 20"><circle cx="10" cy="10" r="7"/><path d="M10 9v4m0-7v.2"/></svg>';
  function gauge(value) {
    const point = (v,r=125)=>{const a=Math.PI*(1-v/100);return [150+r*Math.cos(a),145-r*Math.sin(a)]};
    const cuts = [[0,30,'#b86b72'],[30,45,'#c5a455'],[45,75,'#83b594'],[75,90,'#6eafb9'],[90,100,'#7c9dcf']];
    const arcs = cuts.map(([start,end,color])=>{
      const a=point(start+.6),b=point(end-.6);
      return `<path d="M${a.join(' ')} A125 125 0 0 1 ${b.join(' ')}" stroke="${color}" stroke-width="8" fill="none" stroke-linecap="round"/>`;
    }).join('');
    const dot=point(Math.max(0,Math.min(100,value)));
    return `<div class="gauge"><svg viewBox="0 0 300 165" aria-hidden="true">${arcs}<circle cx="${dot[0]}" cy="${dot[1]}" r="8" fill="var(--deep)" stroke="white" stroke-width="3"/></svg><div class="gauge-values"><strong class="index-value">${scoreFormat.format(value)}</strong><div class="score-total">de 100 puntos</div></div><div class="gauge-labels" aria-hidden="true"><span>0</span><span>100</span></div></div>`;
  }
  const classificationRows = [...document.querySelectorAll('.ica-table tbody tr')];
  function markClassification(results = []) {
    for (const row of classificationRows) {
      row.classList.remove('ica-selected');
      row.querySelector('.ica-marks').replaceChildren();
    }
    for (const {label,value} of results) {
      const row = byId('ica-'+classifyICA(value).key);
      const mark = document.createElement('span');
      mark.className = 'ica-marker';
      mark.textContent = label+' · '+format(value);
      row.querySelector('.ica-marks').append(mark);
      row.classList.add('ica-selected');
    }
    byId('ica-guide-status').textContent = results.length
      ? results.map(({label,value})=>label+' '+format(value)+' · '+classifyICA(value).label).join(' | ')
      : 'Calcula el ICA para marcar su calificación.';
  }
  let mode = 'nine', sample = false;
  const values = Object.fromEntries(data.order.map((p,i)=>[p,data.example.values[i]]));
  const fields = byId('fields');
  const active = ()=>mode==='full'?data.order:mode==='nine'?panelNine.inputs:data.inputs;
  const modes = [['full-mode','full'],['nine-mode','nine'],['three-mode','three']];

  function form() {
    for (const [id,name] of modes) byId(id).setAttribute('aria-pressed',String(mode===name));
    byId('instructions').textContent = mode==='full'
      ? 'Ingresa las doce concentraciones para comparar la estimación de la ANN con la fórmula del ICA.'
      : mode==='nine'
      ? 'Ingresa las nueve mediciones. Ridge estima DBO₅, arsénico y coliformes termotolerantes para calcular el ICA con los doce valores.'
      : 'Ingresa fósforo total, nitrógeno total y arsénico. La red estima las otras nueve concentraciones y la fórmula calcula el ICA.';
    fields.replaceChildren(...active().map(p=>{
      const div=document.createElement('div');
      div.className='field';
      div.innerHTML='<label></label><span class="unit"></span><input type="number" step="any" min="0" required>';
      const input=div.querySelector('input');
      input.id='value-'+p;
      div.querySelector('label').htmlFor=input.id;
      div.querySelector('label').textContent=data.names[p].label;
      const unit=div.querySelector('.unit');
      unit.id='unit-'+p;
      unit.textContent=data.names[p].unit;
      input.setAttribute('aria-describedby',unit.id);
      input.inputMode='decimal';
      input.value=values[p];
      if (p==='pH') input.max='14';
      input.addEventListener('input',()=>{
        values[p]=input.value;sample=false;
        byId('sample').textContent='';
        byId('result').innerHTML='<div class="result-empty">'+infoIcon+'Tus mediciones han cambiado.<br>Pulsa <strong>Calcular ICA</strong> para actualizar el resultado.</div>';
        markClassification();
      });
      return div;
    }));
    byId('sample').textContent = sample ? `Ejemplo histórico · ${data.example.point} · ${data.example.date} · entradas del Excel L/2` : '';
  }

  function render() {
    markClassification();
    if (!byId('form').reportValidity()) return;
    const inputs=active().map(p=>Number(values[p]));
    const result=byId('result');
    if (inputs.some(v=>!Number.isFinite(v)||v<0)) {
      result.textContent='Ingresa concentraciones finitas y mayores o iguales a cero.';
      return;
    }
    const modelResult=mode==='three'?predictThree(inputs):mode==='nine'?predictNine(inputs):formula(inputs);
    const ica=mode==='full'?predictFull(inputs):modelResult.ica;
    if (!Number.isFinite(ica) || !Number.isFinite(modelResult.ica)) {
      result.textContent='Las concentraciones exceden el rango numérico del simulador.';
      return;
    }
    const ranges = mode==='nine'?panelNine:mode==='three'?data.multi:null;
    const outside = ranges ? active().filter((_,i)=>inputs[i]<ranges.min[i]||inputs[i]>ranges.max[i]) : [];
    const category=classifyICA(ica),colors=scoreColors[category.key];
    result.style.setProperty('--score-color',colors[0]);
    result.style.setProperty('--score-soft',colors[1]);
    result.innerHTML=`<div class="result-head"><p class="eyebrow">RESULTADO DEL MONITOREO</p><span class="model-pill">${mode==='nine'?'Ridge + fórmula':mode==='three'?'ANN + fórmula':'Red neuronal'}</span></div>
      <h3>${mode==='full'?'ICA estimado por la ANN':mode==='nine'?'ICA con tres concentraciones estimadas':'ICA con nueve concentraciones estimadas'}</h3>
      ${gauge(ica)}<div class="result-category"><span class="category-badge">${category.label}</span></div>
      <dl class="result-factors"><div><dt>Incumplimientos</dt><dd>${modelResult.count}<small> / 12</small></dd></div><div><dt>F1 y F2</dt><dd>${scoreFormat.format(modelResult.f1)}<small> %</small></dd></div><div><dt>F3</dt><dd>${scoreFormat.format(modelResult.f3)}<small> %</small></dd></div></dl>
      <p class="sub-result">${modelResult.count} de los doce parámetros exceden el ECA según los valores usados en la fórmula.</p>
      ${mode==='full'?`<div class="formula-comparison"><span>ICA calculado por fórmula</span><strong>${scoreFormat.format(modelResult.ica)} <small>· ${classifyICA(modelResult.ica).label}</small></strong></div>`:''}
      ${sample?`<p class="small">ICA de referencia del ejemplo: ${scoreFormat.format(data.example.reference)}.</p>`:''}
      ${outside.length?`<div class="result-note range-note">${infoIcon}<span>Fuera del rango de entrenamiento: ${outside.map(p=>data.names[p].label).join(', ')}.</span></div>`:''}`;
    if (mode!=='full') {
      const dl=document.createElement('dl');
      dl.className='outputs';
      (mode==='nine'?panelNine.outputs:data.outputs).forEach((p,i)=>{
        const label=document.createElement('dt'), value=document.createElement('dd');
        label.textContent=data.names[p].label;
        value.textContent=format(modelResult.estimates[i])+' '+data.names[p].unit;
        dl.append(label,value);
      });
      const heading=document.createElement('h4');
      heading.className='outputs-heading';
      heading.textContent='Concentraciones estimadas';
      result.append(heading,dl);
    }
    const note=document.createElement('div');
    note.className='result-note';
    note.innerHTML=infoIcon+'<span>'+(mode==='nine'?'Ridge · 44 de 45 episodios retrospectivos dentro de 3 puntos del ICA. La precisión de las concentraciones se evalúa por separado.':mode==='three'?'Las nueve concentraciones son estimaciones de la ANN. Un ICA cercano no garantiza la precisión de cada parámetro.':'La ANN aproxima el ICA. El cálculo por fórmula con las doce mediciones es la referencia del panel parcial.')+'</span>';
    result.append(note);
    const updated=document.createElement('div');
    updated.className='result-updated';
    updated.innerHTML='<svg aria-hidden="true" viewBox="0 0 20 20"><path d="m4 10 4 4 8-8"/></svg> Resultado actualizado · ICA-PE parcial';
    result.append(updated);
    result.classList.remove('result-enter');
    requestAnimationFrame(()=>result.classList.add('result-enter'));
    markClassification(mode==='full'
      ? [{label:'ICA ANN',value:ica},{label:'ICA por fórmula',value:modelResult.ica}]
      : [{label:'ICA con estimaciones',value:ica}]);
  }

  function showExample() {
    data.order.forEach((p,i)=>{values[p]=data.example.values[i]});
    sample=true;form();render();
  }
  for (const [id,next] of modes) {
    byId(id).addEventListener('click',()=>{mode=next;form();render()});
  }
  byId('example').addEventListener('click',showExample);
  byId('form').addEventListener('submit',event=>{
    event.preventDefault();render();
    if (window.matchMedia('(max-width: 760px)').matches && byId('result').querySelector('.gauge')) {
      byId('result').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
    }
  });
  showExample();

}
