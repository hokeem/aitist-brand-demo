const intro = document.querySelector('.intro-scroll');
if (intro) {
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const stage = intro.querySelector('.intro-stage');
  const svg = intro.querySelector('.intro-art');
  const layer = svg.querySelector('.morph-layer');
  const glyphs = [...svg.querySelectorAll('.glyph')];
  const logo = [
    [[431,355],[519,178],[597,178],[510,355]],
    [[565,107],[646,107],[724,266],[643,266]],
    [[563,279],[730,279],[769,355],[563,355]]
  ];
  const modules = [264, 600, 936].map(x => [[x-130,270],[x-98,170],[x+98,170],[x+130,270]]);
  const clamp = value => Math.max(0, Math.min(1, value));
  const ease = value => value * value * (3 - 2 * value);
  const mix = (a,b,t) => a + (b-a)*t;
  const blend = (a,b,t) => a.map(([x,y],i)=>[mix(x,b[i][0],t),mix(y,b[i][1],t)]);
  const midpoint = (a,b) => blend([a],[b],.5)[0];
  const half = ([a,b,c,d],i) => i ? [midpoint(a,d),midpoint(b,c),c,d] : [a,b,midpoint(b,c),midpoint(a,d)];
  const sample = polygon => polygon.flatMap((point,i) => Array.from({length:12},(_,j)=>blend([point],[polygon[(i+1)%4]],j/12)[0]));
  function align(source, target) {
    let best = target;
    let error = Infinity;
    for (const order of [target,[...target].reverse()]) {
      for (let shift=0;shift<order.length;shift++) {
        const candidate = order.slice(shift).concat(order.slice(0,shift));
        const cost = source.reduce((sum,[x,y],i)=>sum+(x-candidate[i][0])**2+(y-candidate[i][1])**2,0);
        if (cost<error) { best=candidate; error=cost; }
      }
    }
    return best;
  }
  const center = polygon => polygon.reduce(([x,y],[px,py])=>[x+px/polygon.length,y+py/polygon.length],[0,0]);
  const pathData = points => 'M'+points.map(([x,y])=>x.toFixed(2)+' '+y.toFixed(2)).join('L')+'Z';
  const pieces = glyphs.map((glyph,i) => {
    const contours = [...glyph.querySelectorAll('.glyph-contours path')].sort((a,b)=>b.getTotalLength()-a.getTotalLength());
    const matrix = svg.getCTM().inverse().multiply(glyph.getCTM());
    const original = contours.map(contour => Array.from({length:48},(_,j)=>{
      const point = contour.getPointAtLength(contour.getTotalLength()*j/48).matrixTransform(matrix);
      return [point.x,point.y];
    }));
    const destination = align(original[0],sample(half(modules[Math.floor(i/2)],i%2)));
    const final = align(destination,sample(half(logo[Math.floor(i/2)],i%2)));
    const path = document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('fill-rule','evenodd');
    layer.append(path);
    return {glyph,path,original,destination,final};
  });
  let frame;
  function render() {
    frame = null;
    const progress = motion.matches ? 0 : clamp(-intro.getBoundingClientRect().top / Math.max(1,intro.offsetHeight-stage.offsetHeight));
    const form = ease(clamp(progress/.48));
    const assemble = ease(clamp((progress-.61)/.36));
    pieces.forEach(({glyph,path,original,destination,final},i)=>{
      glyph.style.visibility = progress ? 'hidden' : 'visible';
      if (!progress) { path.removeAttribute('d'); return; }
      const shape = form<1 ? blend(original[0],destination,form) : blend(destination,final,assemble);
      const collapse = center(shape);
      const details = form<1 ? original.slice(1).map(points=>pathData(blend(points,points.map(()=>collapse),form))).join('') : '';
      const [cx,cy]=center(shape);
      const angle = (i%2 ? -1 : 1)*19*Math.sin(Math.PI*form) + (Math.floor(i/2)-1)*24*Math.sin(Math.PI*assemble);
      path.setAttribute('transform',`rotate(${angle} ${cx} ${cy})`);
      path.setAttribute('d',pathData(shape)+details);
    });
  }
  function schedule() {
    if (frame == null) frame = requestAnimationFrame(render);
  }
  addEventListener('scroll',schedule,{passive:true});
  addEventListener('resize',schedule);
  motion.addEventListener('change',schedule);
  render();
}
