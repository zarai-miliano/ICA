/* Photographic exploration. Independent from all ICA calculations and models. */
(() => {
  'use strict';
  const hero=document.querySelector('.hero');
  const lightButtons=[...document.querySelectorAll('button[data-light]')];
  lightButtons.forEach(button=>button.addEventListener('click',()=>{
    hero.dataset.light=button.dataset.light;
    lightButtons.forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
    updateVideo();
  }));
  const choices=[...document.querySelectorAll('[data-habitat]')];
  const scenes=[...document.querySelectorAll('.habitat-scene')];
  choices.forEach(button=>button.addEventListener('click',()=>{
    choices.forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
    scenes.forEach(scene=>{scene.hidden=scene.id!==button.getAttribute('aria-controls');});
  }));
  const video=document.getElementById('lake-video');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const scene=document.querySelector('.water-scene');
  let inView=false;
  function updateVideo() {
    if (!video) return;
    const canPlay=inView && !document.hidden && !reduced.matches
      && document.documentElement.dataset.motion!=='paused' && hero.dataset.light!=='evening';
    if (!canPlay) {video.pause();return;}
    video.muted=true;
    const playing=video.play();
    if (playing) playing.catch(()=>hero.classList.remove('has-video'));
  }
  if (video) {
    video.addEventListener('playing',()=>hero.classList.add('has-video'));
    video.addEventListener('error',()=>hero.classList.remove('has-video'));
    new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;updateVideo();}).observe(hero);
    document.addEventListener('visibilitychange',updateVideo);
    reduced.addEventListener('change',()=>{if(reduced.matches) hero.classList.remove('has-video');updateVideo();});
    if(scene) scene.addEventListener('motionchange',updateVideo);
  }
})();
