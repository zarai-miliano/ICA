/* Water-inspired motion, deliberately independent of all model calculations. */
(() => {
  'use strict';
  const hero = document.querySelector('.hero');
  const canvas = document.getElementById('water-atmosphere');
  if (!hero || !canvas) return;
  const context = canvas.getContext('2d');
  if (!context) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const scene = document.querySelector('.water-scene');
  let width=1,height=1,time=0,last=0,frame=0,visible=false;
  let ripples=[],lastRipple=0;
  const paused=()=>document.documentElement.dataset.motion==='paused';

  function resize() {
    const rect=hero.getBoundingClientRect();
    width=rect.width;height=rect.height;
    const ratio=Math.min(devicePixelRatio || 1,1.25);
    canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
    context.setTransform(ratio,0,0,ratio,0,0);
    if (visible) paint();
  }
  function paint() {
    context.clearRect(0,0,width,height);
    context.lineWidth=1;
    for (let band=0;band<14;band++) {
      context.beginPath();
      for (let x=-20;x<=width+20;x+=14) {
        const y=height*.32 + band*24
          + Math.sin(x*.004+time*.33+band*.19)*45
          + Math.sin(x*.009-time*.21+band*.32)*17;
        if (x===-20) context.moveTo(x,y); else context.lineTo(x,y);
      }
      context.strokeStyle=`rgba(164,213,197,${.065 + (band%4)*.014})`;
      context.stroke();
    }
    for (const ripple of ripples) {
      const age=time-ripple.born,progress=age/2.4;
      if (progress>=1) continue;
      context.beginPath();
      context.ellipse(ripple.x,ripple.y,18+progress*150,8+progress*58,-.15,0,Math.PI*2);
      context.strokeStyle=`rgba(206,239,220,${(1-progress)*.22})`;
      context.stroke();
    }
    ripples=ripples.filter(item=>time-item.born<2.4);
  }
  function tick(now) {
    frame=0;
    if (!visible || document.hidden || reduced.matches || paused()) return;
    if (now-last>40) {
      time+=Math.min((now-last)/1000,.07);last=now;paint();
    }
    frame=requestAnimationFrame(tick);
  }
  function resume() {
    cancelAnimationFrame(frame);frame=0;last=performance.now();
    if (!visible || document.hidden) return;
    paint();
    if (!reduced.matches && !paused()) frame=requestAnimationFrame(tick);
  }
  function addRipple(event) {
    if (reduced.matches || paused() || event.target.closest('a,button')) return;
    const now=performance.now();
    if (now-lastRipple<300) return;
    lastRipple=now;
    const rect=hero.getBoundingClientRect();
    ripples.push({x:event.clientX-rect.left,y:event.clientY-rect.top,born:time});
    if (ripples.length>7) ripples.shift();
  }
  hero.addEventListener('pointermove',event=>{
    if (event.pointerType==='mouse') addRipple(event);
  },{passive:true});
  hero.addEventListener('pointerdown',addRipple,{passive:true});
  new ResizeObserver(resize).observe(hero);
  new IntersectionObserver(entries=>{
    visible=entries[0].isIntersecting;
    document.documentElement.classList.toggle('hero-out-of-view',!visible);
    resume();
  }).observe(hero);
  document.addEventListener('visibilitychange',()=>{
    document.documentElement.classList.toggle('page-hidden',document.hidden);resume();
  });
  if (scene) scene.addEventListener('motionchange',resume);
  reduced.addEventListener('change',resume);
  resize();

  // Reveal each section once; important form inputs are never hidden.
  const revealObserver=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if (!entry.isIntersecting) return;
      if (!reduced.matches && !paused()) entry.target.classList.add('section-arrives');
      revealObserver.unobserve(entry.target);
    });
  },{threshold:.12});
  document.querySelectorAll('.section-heading,.parameter-panel,.ica-guide').forEach(item=>revealObserver.observe(item));
})();
