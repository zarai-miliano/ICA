/* Photographic exploration. Independent from all ICA calculations and models. */
(() => {
  'use strict';
  const choices=[...document.querySelectorAll('[data-habitat]')];
  const scenes=[...document.querySelectorAll('.habitat-scene')];
  choices.forEach(button=>button.addEventListener('click',()=>{
    choices.forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
    scenes.forEach(scene=>{scene.hidden=scene.id!==button.getAttribute('aria-controls');});
  }));
})();
