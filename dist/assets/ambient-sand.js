(() => {
  const canvas=document.querySelector('.ambient-sand'),ctx=canvas?.getContext('2d');
  if(!ctx)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let w=0,h=0,frame=0,previous=0,time=0;
  let seed=741;
  const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const grains=Array.from({length:440},()=>({x:rand(),y:rand(),r:.35+rand()*.8,a:.06+rand()*.16,s:.3+rand(),p:rand()*6.28}));
  function draw(){
    ctx.clearRect(0,0,w,h);
    for(const g of grains){
      const x=((g.x*w+time*3*g.s+Math.sin(time*.14+g.p)*14)%w+w)%w;
      const y=((g.y*h-time*2*g.s+Math.cos(time*.12+g.p)*11-window.scrollY*.035)%h+h)%h;
      const mix=Math.max(0,Math.min(1,(x/w-.3)/.66));
      ctx.fillStyle=`rgba(${Math.round(220-36*mix)},${Math.round(220-65*mix)},${Math.round(220-119*mix)},${g.a})`;
      ctx.beginPath();ctx.arc(x,y,g.r,0,Math.PI*2);ctx.fill();
    }
  }
  function resize(){w=innerWidth;h=innerHeight;const d=Math.min(devicePixelRatio||1,1.5);canvas.width=w*d;canvas.height=h*d;ctx.setTransform(d,0,0,d,0,0);draw();}
  function tick(now){if(now-previous>40){time+=Math.min((now-previous)/1000,.08);previous=now;draw();}frame=requestAnimationFrame(tick);}
  function update(){cancelAnimationFrame(frame);previous=performance.now();if(!document.hidden&&!reduced.matches)frame=requestAnimationFrame(tick);else draw();}
  addEventListener('resize',resize);addEventListener('scroll',()=>{if(reduced.matches)draw();},{passive:true});document.addEventListener('visibilitychange',update);reduced.addEventListener('change',update);resize();update();
})();
