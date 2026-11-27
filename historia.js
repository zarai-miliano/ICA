/* Scroll state controls the illustration only; it never edits form values. */
(() => {
  'use strict';
  const story=document.getElementById('historia');
  const visual=story?.querySelector('.story-visual');
  const chapters=[...document.querySelectorAll('[data-chapter]')];
  if(!visual || !chapters.length) return;
  const links=[...visual.querySelectorAll('.story-route a')];
  const caption=document.getElementById('story-scene-label');
  const labels=['La muestra comienza en el lago','Los análisis construyen el registro','La laptop recibe las mediciones','El panel permite estimar el ICA'];
  const keyboard=visual.querySelector('.laptop-keyboard');
  for(let key=0;key<48;key++) keyboard.append(document.createElement('i'));
  const motionButton=visual.querySelector('.story-motion');
  motionButton?.addEventListener('click',()=>{
    const paused=story.classList.toggle('transitions-paused');
    motionButton.setAttribute('aria-pressed',String(paused));
    motionButton.textContent=paused?'Activar transiciones':'Pausar transiciones';
  });
  let pending=false,visible=false,current=-1;
  function render() {
    pending=false;
    if(!visible) return;
    const anchor=innerHeight*.52;
    const centers=chapters.map(chapter=>{const r=chapter.getBoundingClientRect();return r.top+r.height/2;});
    let progress=0;
    if(anchor>=centers[centers.length-1]) progress=centers.length-1;
    else for(let i=0;i<centers.length-1;i++) {
      if(anchor>=centers[i] && anchor<centers[i+1]) {
        progress=i+(anchor-centers[i])/(centers[i+1]-centers[i]);break;
      }
    }
    visual.style.setProperty('--story-p',progress.toFixed(3));
    const next=Math.round(progress);
    if(next===current) return;
    current=next;visual.dataset.stage=String(current);story.dataset.stage=String(current);caption.textContent=labels[current];
    links.forEach((link,i)=>{if(i===current) link.setAttribute('aria-current','step');else link.removeAttribute('aria-current');});
  }
  function schedule() {if(!pending && visible){pending=true;requestAnimationFrame(render);}}
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;story.classList.toggle('story-hidden',!visible);schedule();}).observe(story);
  document.addEventListener('visibilitychange',()=>story.classList.toggle('story-hidden',document.hidden));
  addEventListener('scroll',schedule,{passive:true});
  addEventListener('resize',schedule,{passive:true});
})();
