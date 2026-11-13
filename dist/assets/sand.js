const hero = document.querySelector('.sand-hero');
const stage = hero.querySelector('.sand-stage');
const canvas = hero.querySelector('canvas');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const gl = canvas.getContext('webgl', { alpha: true, antialias: false, depth: false });

const circulation = `
const float tau = 6.2831853;
const vec2 center = vec2(.5, .365);
const vec2 radius = vec2(.425, .248);

float orbitPhase(float time, float travel) {
  return time * .24 + travel * 2.7;
}

// A continuous horizontal ribbon; recycling happens beyond the viewport.
vec2 currentPath(float a) {
  float x = fract(a / tau) * 1.8 - .4;
  float wave = time * .16 + travel * 1.8;
  float y = .35 + .115*sin(x*5.6-wave) + .035*sin(x*10.2-wave*.7);
  return vec2(x,y);
}

vec2 swirl(float angle, float radial) {
  vec2 tangent = normalize(currentPath(angle + .014) - currentPath(angle - .014));
  vec2 normal = vec2(-tangent.y, tangent.x);
  float width = .040 + .065 * pow(.5 + .5*sin(angle*2.0 - time*.09 + .8), 2.0);
  width *= .85 + .15*sin(angle*3.0 + .5);
  float lane = radial - 1.0;
  float fold = .014*sin(angle*5.0 + lane*5.0 - time*.17);
  return currentPath(angle) + normal*(lane*width*2.1 + fold);
}

vec2 stoneAnchor(vec2 initial, float offset, float time, float travel) {
  float drift = time * .42 + offset;
  initial += vec2(sin(drift) * .028, cos(drift) * .043);
  float departure = smoothstep(.0, 1.0, time * .15 + travel);
  return mix(initial, swirl(orbitPhase(time, travel) + offset, 1.0), departure);
}
`;

const volumeVertex = `
attribute vec2 corner;
varying vec2 uv;
void main() {
  uv = vec2(corner.x, -corner.y) * .5 + .5;
  gl_Position = vec4(corner, 0.0, 1.0);
}
`;

const volumeFragment = `
precision mediump float;
uniform float time, travel;
varying vec2 uv;
${circulation}
void main() {
  // Subtle atmosphere only; the grains themselves define every bend and edge.
  float haze = exp(-pow((uv.y - .34) * 3.8, 2.0));
  gl_FragColor = vec4(vec3(.28), haze * .045);

}
`;

const grainsPerStone = 16800;
const surfaceComponents = 7;

const vertex = `
attribute vec4 sample;
attribute vec4 form;
attribute vec4 surface;
uniform vec2 screen;
uniform float time, travel, pixel;
uniform vec2 anchors[24];
varying vec2 tone;
varying float goldMix;

${circulation}

mat3 rockRotation(float yaw, float pitch, float roll) {
  float cy = cos(yaw), sy = sin(yaw);
  float cx = cos(pitch), sx = sin(pitch);
  float cz = cos(roll), sz = sin(roll);
  return mat3(cz, sz, 0, -sz, cz, 0, 0, 0, 1)
       * mat3(cy, 0, -sy, 0, 1, 0, sy, 0, cy)
       * mat3(1, 0, 0, 0, cx, sx, 0, -sx, cx);
}

void main() {
  float kind = sample.w;
  float random = form.w;
  float phase = orbitPhase(time, travel);
  float mobile = step(screen.x / screen.y, .78);
  vec2 position;
  float light, alpha, size;
  if (kind < 2.5) {
    float depth = sample.y * 2.0 - 1.0;
    // Differential advection shears layers without moving grains randomly.
    float angle = sample.x*tau + phase + depth*.30;
    angle += time*.025*depth + .085*sin(sample.x*tau*3.0 + time*.12);
    float radial = 1.0 + depth*.70;
    float packet = .5 + .5*sin((angle-phase)*3.0 + .7*sin((angle-phase)*7.0));
    float density = .24 + .76*pow(packet, .65);
    float ridge = exp(-abs(depth - .18*sin(angle*3.0-time*.14))*5.5);
    if (kind < .5) {
      radial = 1.0 + depth*3.4;
      position = swirl(angle, radial);
      position += vec2(sin(angle*4.0+random*8.0),cos(angle*3.0+random*7.0))*.045;
      light = .62 + sample.z*.33;
      alpha = (.035 + sample.z*.23)*density;
      size = .65 + sample.z*1.5;
    } else {
      // A smaller tributary separates and merges gently with the main current.
      float tributary = step(.78, random);
      radial += tributary*.38*sin(angle*2.0 - .4);
      if (kind > 1.5) radial += sample.z*.75;
      position = swirl(angle, radial);
      position += vec2(sample.z*.004, sample.z*.005);
      float edge = pow(max(0.0, 1.0-abs(depth)), .55);
      if (kind < 1.5) {
        light = .56 + .36*ridge + .06*random;
        alpha = (.32 + .49*ridge)*edge*density;
        size = 2.25 + random*1.20 + .40*ridge;
      } else {
        light = .66 + .26*ridge;
        alpha = (.10 + .25*ridge)*edge*density;
        size = .70 + random*1.05;
      }
    }
  } else if (kind > 3.5) {
    // Smaller eddies orbit their stone while trailing the shared flow.
    float orbit = phase + sample.z;
    vec2 anchor = anchors[int(floor(sample.z / .86 + .5))];
    float tail = sample.x * sample.x * .58;
    vec2 trail = swirl(orbit - tail, 1.0) - swirl(orbit, 1.0);
    float curl = orbit + sample.y * tau + time * 1.15 + tail * 5.0;
    float spread = (.024 + .090 * tail + random * .033) * form.z;
    position = anchor + trail + vec2(cos(curl), sin(curl) * .69) * spread;
    light = .71 + random * .24;
    alpha = (.17 + .28 * random) * (1.0 - sample.x * .70);
    size = .78 + random * 1.28;
  } else {
    float drift = time * .42 + sample.z;
    float orbit = phase + sample.z;
    vec2 anchor = anchors[int(floor(sample.z / .86 + .5))];
    float emerge = .99 + .065 * sin(drift * .7);
    float collect = smoothstep(.015, .25, time + .10) * emerge;
    collect *= 1.0 - .28 * smoothstep(.15, .99, travel);
    float yaw = time * (.30 + .05 * sin(sample.z)) + .42 * sin(sample.z) + travel * 2.35;
    float pitch = .50 * sin(orbit + sample.z * .24) + .28 * sin(time * .37 + sample.z);
    float roll = .43 * sin(orbit + 1.0) + travel * .33;
    mat3 rotation = rockRotation(yaw, pitch, roll);
    vec3 local = rotation * vec3(sample.xy, surface.x) * (1.0 + mobile * .38);
    vec3 normal = rotation * surface.yzw;
    float lens = 1.0 / (1.0 - local.z * 1.18);
    vec2 target = anchor + local.xy * vec2(1.0, screen.x / screen.y) * lens;
    vec2 stream = swirl(orbit - random * .75, .75 + random * .48);
    float shape = clamp(collect + (random - .5) * .53, .0, 1.0);
    shape = 1.0; // Solid coarse mineral surface; never dissolve the stone silhouette.
    position = mix(stream, target, shape);
    position.y += .010 * (1.0 - shape) * sin(random * 30.0 + drift);
    vec3 key = normalize(vec3(-.53, -.66, .72));
    float diffuse = max(0.0, dot(normal, key));
    float highlight = pow(max(0.0, dot(normal, normalize(key + vec3(0, 0, 1)))), 19.0);
    float visible = smoothstep(-.035, .21, normal.z);
    float material = .40 + form.z * .44;
    float lit = material * (.64 + diffuse * .58) + highlight * .32;
    light = mix(.69, clamp(lit, .13, 1.0), shape);
    alpha = .99 * visible;
    size = (3.4 + floor(random * 4.0) * .65) * (1.0 + mobile * .16);
  }
  gl_Position = vec4(position.x * 2.0 - 1.0, 1.0 - position.y * 2.0, 0.0, 1.0);
  gl_PointSize = size * pixel;
  tone = vec2(light, alpha);
  goldMix = smoothstep(.30, .96, position.x);
}
`;

const fragment = `
precision mediump float;
varying vec2 tone;
varying float goldMix;
void main() {
  float radius = length(gl_PointCoord - .5) * 2.0;
  float grain = 1.0 - smoothstep(.23, 1.0, radius);
  vec3 pigment = mix(vec3(1.0), vec3(.721569,.607843,.396078), goldMix);
  gl_FragColor = vec4(pigment * tone.x, tone.y * grain);
}
`;

let seed = 16301;
function random() {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
}

function program(vertexSource, fragmentSource) {
  const result = gl.createProgram();
  for (const [type, source] of [[gl.VERTEX_SHADER, vertexSource], [gl.FRAGMENT_SHADER, fragmentSource]]) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    gl.attachShader(result, shader);
  }
  gl.linkProgram(result);
  if (!gl.getProgramParameter(result, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(result));
  return result;
}

// source 03 (lightning/fold) is intentionally excluded.
const sources = [0,6,2,4,6,5,0,6,4,0,6,0,4,6,0,6,4,6];
const poses = sources.map((source,i) => {
  const a=i*2.399;
  return [.5+Math.sin(a)*.35, .365+Math.cos(a)*.24,
    i<9 ? [.14,.12,.105,.10,.13,.11,.115,.095,.10][i] : .022+(i%3)*.009];
});

function particleData(stones, mobile) {
  const dustCount = mobile ? 15000 : 29000;
  const sandCount = mobile ? 122000 : 285000;
  const surfaceCount = mobile ? 21100 : 46800;
  const step = mobile ? 2 : 1;
  const stoneCount = poses.length * grainsPerStone / step;
  const eddyCount = mobile ? 900 : 1600;
  const points = new Float32Array((dustCount + sandCount + stoneCount + surfaceCount + poses.length * eddyCount) * 12);
  let cursor = 0;
  function add(x, y, variance, kind, anchorX = 0, anchorY = 0, light = 0,
    z = 0, normalX = 0, normalY = 0, normalZ = 0) {
    points.set([x, y, variance, kind, anchorX, anchorY, light, random(),
      z, normalX, normalY, normalZ], cursor);
    cursor += 12;
  }
  for (let i = 0; i < dustCount; i++) add(random(), random(), random(), 0);
  for (let i = 0; i < sandCount; i++) add(random(), random(), (random() + random() - 1) * .74, 1);

  const data = new DataView(stones);
  const recordBytes = surfaceComponents * 2;
  function value(point, component) {
    return data.getInt16(point + component * 2, true) / 32767;
  }
  poses.forEach(([x, y, width], index) => {
    const scale = width * 1.20;
    const offset = sources[index] * grainsPerStone * recordBytes;
    for (let i = 0; i < grainsPerStone; i += step) {
      const point = offset + i * recordBytes;
      add(value(point, 0) * scale, value(point, 1) * scale, index * .86, 3,
        x, y, value(point, 6), value(point, 2) * scale,
        value(point, 3), value(point, 4), value(point, 5));
    }
  });
  for (let i = 0; i < surfaceCount; i++) {
    const x = random();
    const depth = .5 + (random() - .5) * .98;
    add(x, depth, random() + random() - 1, 2);
  }
  poses.forEach(([x, y, width], index) => {
    for (let i = 0; i < eddyCount; i++) {
      add(random(), random(), index * .86, 4, x, y, width / .12);
    }
  });
  return points;
}

async function start() {
  if (!gl) return;
  const renderer = program(vertex, fragment);
  const volume = program(volumeVertex, volumeFragment);
  const response = await fetch('/assets/stone-surfaces.bin');
  if (!response.ok) throw new Error('Stone particle data failed to load');
  const stones = await response.arrayBuffer();
  if (stones.byteLength !== 7 * grainsPerStone * surfaceComponents * 2) throw new Error('Stone particle data is incomplete');

  const backdrop = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, backdrop);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const corner = gl.getAttribLocation(volume, 'corner');
  const volumeTime = gl.getUniformLocation(volume, 'time');
  const volumeTravel = gl.getUniformLocation(volume, 'travel');
  const buffer = gl.createBuffer();
  const particleAttributes = [['sample', 0], ['form', 16], ['surface', 32]]
    .map(([name, offset]) => [gl.getAttribLocation(renderer, name), offset]);
  const uniforms = Object.fromEntries(['screen', 'time', 'travel', 'pixel', 'anchors[0]']
    .map(name => [name, gl.getUniformLocation(renderer, name)]));
  gl.enable(gl.BLEND);
  gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  let pointCount, isMobile, visible = true, frame = 0, progress = 0;
  let previous = -Infinity;
  const startTime = performance.now();

  const positions = new Float32Array(48);
  const impulses = poses.map(()=>({start:-100,dx:0,dy:0,hover:0,phase:0}));
  let hovered=-1, sceneTime=0;
  function path(a,t) {
    const x=((a/(Math.PI*2))%1+1)%1*1.8-.4;
    const wave=t*.16+progress*1.8;
    return [x,.35+.115*Math.sin(x*5.6-wave)+.035*Math.sin(x*10.2-wave*.7)];
  }
  function anchorsAt(t) {
    poses.forEach(([x,y,w],i)=>{
      const state=impulses[i], age=Math.max(0,t-state.start);
      const flight=age<3.8?Math.sin(Math.PI*age/3.8):0;
      const advance=state.phase+(state.start>-50 ? .62*Math.min(1,age/3.8):0);
      const a=t*.24+progress*2.7+i*.86+advance;
      let [px,py]=path(a,t);
      const blend=1;
      px=x+(px-x)*blend;py=y+(py-y)*blend;
      if(i>=9){py+=(i%2?1:-1)*(.10+(i%3)*.035);}
      state.hover+=((hovered===i?.022:0)-state.hover)*.12;
      const len=Math.hypot(px-.5,py-.365)||1;
      positions[i*2]=px+(px-.5)/len*state.hover+state.dx*flight;
      positions[i*2+1]=py+(py-.365)/len*state.hover+state.dy*flight;
    });
  }
  function hit(e) {
    if(e.target.closest('a,button'))return -1;
    const r=stage.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
    let best=-1,dist=Infinity;
    poses.forEach((p,i)=>{const d=Math.hypot(x-positions[i*2]*r.width,y-positions[i*2+1]*r.height);
      const radius=Math.max(12,p[2]*r.width*.68);
      if(d<radius&&d<dist){best=i;dist=d;}});return best;
  }
  stage.addEventListener('pointermove',e=>{hovered=hit(e);stage.style.cursor=hovered<0?'':'pointer';});
  stage.addEventListener('pointerleave',()=>{hovered=-1;stage.style.cursor='';});
  stage.addEventListener('click',e=>{
    const i=hit(e);if(i<0 || sceneTime-impulses[i].start<3.8)return;
    const x=positions[i*2]-.5,y=positions[i*2+1]-.365,l=Math.hypot(x,y)||1;
    const prior=impulses[i];
    impulses[i]={start:sceneTime,dx:x/l*.13,dy:y/l*.13,hover:0,phase:prior.phase+(prior.start>-50?.62:0)};
  });

  function draw(now) {
    if (!pointCount || gl.isContextLost()) return;
    const maxTravel = Math.max(1, hero.offsetHeight - stage.offsetHeight);
    const target = reduced.matches ? 0 : Math.min(1, Math.max(0, -hero.getBoundingClientRect().top / maxTravel));
    progress = reduced.matches ? 0 : progress + (target - progress) * .18;
    const elapsed = reduced.matches ? 2.8 : (now - startTime) / 1000;
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(volume);
    gl.bindBuffer(gl.ARRAY_BUFFER, backdrop);
    gl.enableVertexAttribArray(corner);
    gl.vertexAttribPointer(corner, 2, gl.FLOAT, false, 0, 0);
    gl.uniform1f(volumeTime, elapsed);
    gl.uniform1f(volumeTravel, progress);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.disableVertexAttribArray(corner);

    gl.useProgram(renderer);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    for (const [attribute, offset] of particleAttributes) {
      gl.enableVertexAttribArray(attribute);
      gl.vertexAttribPointer(attribute, 4, gl.FLOAT, false, 48, offset);
    }
    sceneTime=elapsed;
    anchorsAt(elapsed);
    gl.uniform2fv(uniforms["anchors[0]"],positions);
    gl.uniform1f(uniforms.time, elapsed);
    gl.uniform1f(uniforms.travel, progress);
    gl.drawArrays(gl.POINTS, 0, pointCount);
  }

  function resize() {
    const { width, height } = stage.getBoundingClientRect();
    const mobile = width < 660;
    if (mobile !== isMobile) {
      isMobile = mobile;
      const points = particleData(stones, mobile);
      pointCount = points.length / 12;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, points, gl.STATIC_DRAW);
    }
    const density = Math.min(devicePixelRatio || 1, mobile ? 1.35 : 1.6);
    canvas.width = Math.round(width * density);
    canvas.height = Math.round(height * density);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(renderer);
    gl.uniform2f(uniforms.screen, width, height);
    gl.uniform1f(uniforms.pixel, density);
    draw(performance.now());
    stage.classList.add('scene-ready');
  }

  function tick(now) {
    if (now - previous >= 29) {
      draw(now);
      previous = now;
    }
    frame = requestAnimationFrame(tick);
  }

  function update() {
    cancelAnimationFrame(frame);
    if (visible && !document.hidden && !reduced.matches) frame = requestAnimationFrame(tick);
    else if (visible && !document.hidden) draw(performance.now());
  }

  new ResizeObserver(resize).observe(stage);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    update();
  }).observe(stage);
  document.addEventListener('visibilitychange', update);
  reduced.addEventListener('change', update);
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    cancelAnimationFrame(frame);
    stage.classList.remove('scene-ready');
  });
}

start().catch(error => console.warn('Aitist sand scene:', error));
