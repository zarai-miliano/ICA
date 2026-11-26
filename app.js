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
      div.querySelector('span').textContent=data.names[p].unit;
      input.value=values[p];
      if (p==='pH') input.max='14';
      input.addEventListener('input',()=>{
        values[p]=input.value;sample=false;
        byId('sample').textContent='';
        byId('result').textContent='Pulsa Calcular ICA para actualizar el resultado.';
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
    result.innerHTML=`<h3>${mode==='full'?'ICA estimado por la ANN':mode==='nine'?'ICA con tres concentraciones estimadas':'ICA con nueve concentraciones estimadas'}</h3>
      <div class="index-row"><strong class="index-value">${format(ica)}</strong><span>/ 100 · ${classifyICA(ica).label}</span></div>
      <div class="track" aria-hidden="true"><span style="width:${ica}%"></span></div>
      <p class="sub-result">${mode==='full'?'ICA por fórmula con las entradas: '+format(modelResult.ica)+' · '+classifyICA(modelResult.ica).label+'. ':''}
      ${modelResult.count} parámetros exceden el ECA según los valores usados en la fórmula. F1 y F2: ${format(modelResult.f1)} %. F3: ${format(modelResult.f3)} %.</p>
      ${sample?`<p class="small">ICA de referencia del episodio: ${format(data.example.reference)}.</p>`:''}
      ${outside.length?`<p class="small">Fuera del rango de entrenamiento: ${outside.map(p=>data.names[p].label).join(', ')}.</p>`:''}
      ${mode==='nine'?'<p class="small">Ridge · 44 de 45 episodios retrospectivos dentro de 3 puntos del ICA. La precisión de las concentraciones se evalúa por separado.</p>':''}`;
    if (mode!=='full') {
      const dl=document.createElement('dl');
      dl.className='outputs';
      (mode==='nine'?panelNine.outputs:data.outputs).forEach((p,i)=>{
        const label=document.createElement('dt'), value=document.createElement('dd');
        label.textContent=data.names[p].label;
        value.textContent=format(modelResult.estimates[i])+' '+data.names[p].unit;
        dl.append(label,value);
      });
      result.append(dl);
    }
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
  byId('form').addEventListener('submit',event=>{event.preventDefault();render()});
  showExample();

}
