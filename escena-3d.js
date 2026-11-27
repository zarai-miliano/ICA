/* Decorative WebGL geometry. No measurements or prediction code are involved. */
(() => {
  'use strict';
  const scene = document.querySelector('.water-scene');
  const canvas = document.getElementById('water-canvas');
  if (!scene || !canvas) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const hero = document.querySelector('.hero');
  const pointer = {x: 0, y: 0};

  hero.addEventListener('pointermove', event => {
    if (reducedMotion.matches || !finePointer.matches) return;
    const rect = hero.getBoundingClientRect();
    pointer.x = (event.clientX - rect.left) / rect.width - .5;
    pointer.y = (event.clientY - rect.top) / rect.height - .5;
    scene.style.setProperty('--scene-x', `${pointer.x * 13}px`);
    scene.style.setProperty('--scene-y', `${pointer.y * 9}px`);
  }, {passive: true});
  hero.addEventListener('pointerleave', () => {
    pointer.x = pointer.y = 0;
    scene.style.setProperty('--scene-x', '0px');
    scene.style.setProperty('--scene-y', '0px');
  });

  document.querySelectorAll('.switch button').forEach(card => {
    card.addEventListener('pointermove', event => {
      if (reducedMotion.matches || !finePointer.matches) return;
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      card.style.setProperty('--tilt-x', `${(y - .5) * -7}deg`);
      card.style.setProperty('--tilt-y', `${(x - .5) * 7}deg`);
      card.style.setProperty('--shine-x', `${x * 100}%`);
      card.style.setProperty('--shine-y', `${y * 100}%`);
    }, {passive: true});
    card.addEventListener('pointerleave', () => {
      ['--tilt-x', '--tilt-y', '--shine-x', '--shine-y'].forEach(key => card.style.removeProperty(key));
    });
  });

  const gl = canvas.getContext('webgl', {alpha: true, antialias: true, powerPreference: 'low-power'});
  if (!gl) return; // The SVG sculpture is always present as a fallback.

  const vertex = `
    attribute vec3 aPosition;
    attribute vec3 aNormal;
    uniform float uAspect;
    uniform float uTime;
    uniform vec2 uPointer;
    varying vec3 vPosition;
    varying vec3 vNormal;
    void main() {
      float ax = -.10 + uPointer.y * .20;
      float ay = .40 + uTime * .10 + uPointer.x * .35;
      float az = .08 * sin(uTime * .4);
      mat3 rx = mat3(1.,0.,0., 0.,cos(ax),sin(ax), 0.,-sin(ax),cos(ax));
      mat3 ry = mat3(cos(ay),0.,-sin(ay), 0.,1.,0., sin(ay),0.,cos(ay));
      mat3 rz = mat3(cos(az),sin(az),0., -sin(az),cos(az),0., 0.,0.,1.);
      mat3 rotation = rz * ry * rx;
      vec3 p = rotation * aPosition;
      p.y += .05 * sin(uTime * .7);
      vPosition = p;
      vNormal = rotation * aNormal;
      float z = p.z - 5.6;
      gl_Position = vec4(p.x * 2.35 / uAspect, p.y * 2.35, -1.004 * z - .2004, -z);
    }`;
  const fragment = `
    precision mediump float;
    uniform sampler2D uEnvironment;
    uniform float uTime;
    varying vec3 vPosition;
    varying vec3 vNormal;
    void main() {
      vec3 n = normalize(vNormal);
      vec3 view = normalize(vec3(0.,0.,5.6) - vPosition);
      vec3 reflected = reflect(-view, n);
      vec2 uv = vec2(.5 + atan(reflected.z, reflected.x) / 6.28318, .5 + asin(clamp(reflected.y,-1.,1.)) / 3.14159);
      vec3 environment = texture2D(uEnvironment, uv).rgb;
      float fresnel = pow(1. - max(dot(n,view),0.), 2.4);
      float light = .5 + .5 * dot(n, normalize(vec3(-.6,1.,1.2)));
      vec3 water = mix(vec3(.025,.20,.26), vec3(.24,.72,.65), light);
      vec3 color = mix(water, environment * vec3(.8,1.12,1.08), .44);
      float reflection = pow(max(dot(n,normalize(vec3(-.65,.65,1.4))),0.),30.);
      float strip = pow(max(dot(n,normalize(vec3(.8,.3,1.0))),0.),65.);
      color += vec3(.75,1.,.93) * reflection * .78;
      color += vec3(.70,.96,1.) * strip * .38;
      color = mix(color, vec3(.63,.94,.85), fresnel * .78);
      float lowerGlow = max(0., -vPosition.y) * .08;
      color += vec3(.12,.65,.52) * lowerGlow;
      gl_FragColor = vec4(color, .93);
    }`;

  function shader(type, source) {
    const item = gl.createShader(type);
    gl.shaderSource(item, source);
    gl.compileShader(item);
    if (!gl.getShaderParameter(item, gl.COMPILE_STATUS)) {
      gl.deleteShader(item);
      throw new Error('La visualización 3D utilizará su versión estática.');
    }
    return item;
  }

  let program;
  try {
    program = gl.createProgram();
    gl.attachShader(program, shader(gl.VERTEX_SHADER, vertex));
    gl.attachShader(program, shader(gl.FRAGMENT_SHADER, fragment));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
  } catch (_) { return; }
  gl.useProgram(program);

  const positions = [], indices = [];
  const latitudes = 64, longitudes = 96, columns = longitudes + 1;
  for (let lat = 0; lat <= latitudes; lat++) {
    const theta = lat * Math.PI / latitudes;
    const radius = .98 * Math.sin(theta) * (.14 + .86 * Math.sin(theta / 2));
    const c = Math.cos(theta);
    const y = 1.43 * c + .27 * Math.pow(Math.max(0,c), 3);
    for (let lon = 0; lon <= longitudes; lon++) {
      const phi = lon * Math.PI * 2 / longitudes;
      positions.push(radius * Math.cos(phi), y, radius * Math.sin(phi));
      if (lat < latitudes && lon < longitudes) {
        const a = lat * columns + lon, b = a + columns;
        indices.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
  }
  const normals = new Float32Array(positions.length);
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i] * 3, b = indices[i + 1] * 3, c = indices[i + 2] * 3;
    const ux = positions[b] - positions[a], uy = positions[b+1] - positions[a+1], uz = positions[b+2] - positions[a+2];
    const vx = positions[c] - positions[a], vy = positions[c+1] - positions[a+1], vz = positions[c+2] - positions[a+2];
    const n = [uy*vz-uz*vy, uz*vx-ux*vz, ux*vy-uy*vx];
    [a,b,c].forEach(j => { normals[j] += n[0]; normals[j+1] += n[1]; normals[j+2] += n[2]; });
  }
  // Join the longitude seam, then normalize the accumulated surface normals.
  for (let lat = 0; lat <= latitudes; lat++) {
    const first = lat * columns * 3, last = (lat * columns + longitudes) * 3;
    for (let axis = 0; axis < 3; axis++) {
      normals[first+axis] = normals[last+axis] = normals[first+axis] + normals[last+axis];
    }
  }
  for (let i = 0; i < normals.length; i += 3) {
    const length = Math.hypot(normals[i],normals[i+1],normals[i+2]);
    if (length < 1e-8) { normals[i+1] = positions[i+1] > 0 ? 1 : -1; }
    else { normals[i] /= length; normals[i+1] /= length; normals[i+2] /= length; }
  }
  function attribute(name, values) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(values), gl.STATIC_DRAW);
    const location = gl.getAttribLocation(program, name);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 0, 0);
  }
  attribute('aPosition', positions);
  attribute('aNormal', normals);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
  const uniforms = Object.fromEntries(['uAspect','uTime','uPointer','uEnvironment'].map(name => [name,gl.getUniformLocation(program,name)]));
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([85,145,150,255]));
  [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T].forEach(key => gl.texParameteri(gl.TEXTURE_2D,key,gl.CLAMP_TO_EDGE));
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.uniform1i(uniforms.uEnvironment,0);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.clearColor(0,0,0,0);

  let visible = false, lost = false, frame = 0, previous = 0, elapsed = 0;
  function draw() {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    const width = Math.max(1, Math.round(rect.width * ratio));
    const height = Math.max(1, Math.round(rect.height * ratio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width; canvas.height = height;
    }
    gl.viewport(0,0,width,height);
    gl.uniform1f(uniforms.uAspect, width / height);
    gl.uniform1f(uniforms.uTime, reducedMotion.matches ? 0 : elapsed);
    gl.uniform2f(uniforms.uPointer, reducedMotion.matches ? 0 : pointer.x, reducedMotion.matches ? 0 : pointer.y);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
    scene.classList.add('is-rendered');
  }
  function tick(now) {
    frame = 0;
    if (!visible || document.hidden || lost || reducedMotion.matches) return;
    if (now - previous >= 33) {
      elapsed += Math.min((now - previous) / 1000, .05);
      previous = now;
      draw();
    }
    frame = requestAnimationFrame(tick);
  }
  function resume() {
    cancelAnimationFrame(frame); frame = 0; previous = performance.now();
    if (visible && !document.hidden && !lost) {
      draw();
      if (!reducedMotion.matches) frame = requestAnimationFrame(tick);
    }
  }
  const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; resume(); }, {rootMargin:'40px'});
  observer.observe(scene);
  new ResizeObserver(resume).observe(canvas);
  document.addEventListener('visibilitychange',resume);
  reducedMotion.addEventListener('change',resume);
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault(); lost = true; cancelAnimationFrame(frame);
    scene.classList.remove('is-rendered');
  });
  const image = new Image();
  image.onload = () => {
    if (lost) return;
    gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
    resume();
  };
  image.src = 'chinchaycocha.jpg';
})();
