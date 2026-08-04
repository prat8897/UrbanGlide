(function(){

  // ============ ISO PROJECTION HELPERS ============
  const ANG = Math.PI/6; // 30 deg
  const RX = Math.cos(ANG), RY = Math.sin(ANG);

  function project(base, right, left, up){
    return [
      base[0] + right*RX - left*RX,
      base[1] + right*RY + left*RY - up
    ];
  }

  function poly(pts, fill, extra){
    extra = extra || '';
    return `<polygon points="${pts.map(p=>p.join(',')).join(' ')}" fill="${fill}" ${extra}/>`;
  }

  // draws an isometric box; base = [x,y] screen anchor (bottom-front corner), w/d/h in local units
  function cube(base, w, d, h, shades){
    shades = shades || {top:'var(--face-top)', left:'var(--face-left)', right:'var(--face-right)'};
    const b000 = project(base,0,0,0);
    const b100 = project(base,w,0,0);
    const b010 = project(base,0,d,0);
    const b110 = project(base,w,d,0);
    const b001 = project(base,0,0,h);
    const b101 = project(base,w,0,h);
    const b011 = project(base,0,d,h);
    const b111 = project(base,w,d,h);
    let out = '';
    out += poly([b011,b111,b101,b001], shades.left);   // left-front face (x=0..w plane at y=? ) darker
    out += poly([b010,b110,b111,b011], shades.right);  // right-front face
    out += poly([b001,b101,b111,b011], shades.top);    // top face (lightest)
    return out;
  }

  // simple flat ellipse platform (ground plate) for a cluster, with soft ring contours
  function platform(cx, cy, rx, ry){
    let out = '';
    out += `<ellipse cx="${cx}" cy="${cy}" rx="${rx*1.55}" ry="${ry*1.55}" fill="url(#platformShade)"/>`;
    out += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#ececeA" stroke="#d7d7d4" stroke-width="1.5"/>`;
    for(let i=1;i<=2;i++){
      const rrx = rx + i*14, rry = ry + i*7;
      out += `<ellipse cx="${cx}" cy="${cy}" rx="${rrx}" ry="${rry}" fill="none" stroke="#dcdcd9" stroke-width="1" opacity="${0.55 - i*0.15}"/>`;
    }
    return out;
  }

  function ellipseShadow(cx, cy, rx, ry, op){
    return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#2a2a28" opacity="${op||0.10}" filter="url(#softBlur)"/>`;
  }

  // small pine tree
  function tree(x, y, scale){
    scale = scale || 1;
    const s = scale;
    let out = `<g opacity="0.9">`;
    out += `<ellipse cx="${x}" cy="${y+2*s}" rx="${7*s}" ry="${2.4*s}" fill="#2a2a28" opacity="0.08" filter="url(#softBlur)"/>`;
    out += `<rect x="${x-1.2*s}" y="${y-6*s}" width="${2.4*s}" height="${6*s}" fill="#8a8a86"/>`;
    out += `<polygon points="${x},${y-32*s} ${x-11*s},${y-10*s} ${x+11*s},${y-10*s}" fill="#9a9a94"/>`;
    out += `<polygon points="${x},${y-24*s} ${x-9*s},${y-4*s} ${x+9*s},${y-4*s}" fill="#adada6"/>`;
    out += `</g>`;
    return out;
  }

  function personFig(x,y,scale){
    const s = scale||1;
    return `<g><ellipse cx="${x}" cy="${y+1}" rx="${3*s}" ry="${1.2*s}" fill="#2a2a28" opacity="0.12"/>
      <circle cx="${x}" cy="${y-10*s}" r="${2.6*s}" fill="#6b6b68"/>
      <rect x="${x-2*s}" y="${y-8*s}" width="${4*s}" height="${8*s}" rx="1.5" fill="#7a7a76"/></g>`;
  }

  function truck(base, colorCab, colorTrailer, dir){
    dir = dir || 1;
    let out = '<g>';
    // trailer box
    out += cube(base, 34*dir, 15, 16, {top:'#e7e7e4', left:'#c7c7c3', right:colorTrailer||'#b7b7b3'});
    // Position cab in front (further along 'right' axis)
    const cabAnchor = [ base[0] + 34*RX*dir, base[1] + 34*RY*dir ];
    out += cube(cabAnchor, 12*dir, 15, 13, {top:'#dedeDA', left:'#b3b3ae', right: colorCab||'#8f8f8a'});
    // wheels (simple dark circles at base)
    const w1 = project(base, 6*dir, 3, 0);
    const w2 = project(base, 26*dir, 3, 0);
    const w3 = project(cabAnchor, 6*dir, 3, 0);
    [w1,w2,w3].forEach(w=>{
      out += `<circle cx="${w[0]}" cy="${w[1]+3}" r="3.4" fill="#2c2c2a"/>`;
    });
    out += '</g>';
    return out;
  }

  function car(base, color){
    let out = '<g>';
    out += cube(base, 16, 9, 6, {top:'#e2e2df', left:'#c2c2be', right: color||'#9c9c97'});
    out += cube([base[0], base[1]-0.001], 10, 9, 9.5, {top:'#dcdcd8', left:'#bcbcb8', right: color||'#9c9c97'});
    out += '</g>';
    return out;
  }

  // ============ SCENE CONFIG (viewBox 1024 x 1190) ============
  const HUB = [512, 350];
  const NODES = {
    goLeft:    {name:'factory',     pos:[228, 168]},
    airport:   {name:'airport',     pos:[792, 168]},
    how:       {name:'office',      pos:[168, 512]},
    withWhom:  {name:'warehouse',   pos:[822, 402]},
    why:       {name:'residential', pos:[706, 668]},
    talk:      {name:'port',        pos:[500, 918]}
  };

  // ============ TERRAIN (topographic contour lines) ============
  function buildTerrain(){
    let out = '';
    const waves = [
      {y:70,  amp:10, len:1180}, {y:150, amp:14, len:1180},
      {y:260, amp:9,  len:1180}, {y:360, amp:16, len:1180},
      {y:470, amp:11, len:1180}, {y:590, amp:15, len:1180},
      {y:710, amp:10, len:1180}, {y:830, amp:17, len:1180},
      {y:950, amp:12, len:1180}, {y:1060,amp:14, len:1180},
      {y:1150,amp:9,  len:1180}
    ];
    waves.forEach((w,i)=>{
      let d = `M -60 ${w.y}`;
      const segs = 8;
      for(let s=1;s<=segs;s++){
        const x = -60 + (w.len/segs)*s;
        const yOff = Math.sin(s*1.3+i) * w.amp;
        d += ` Q ${x - (w.len/segs)/2} ${w.y+yOff+ (s%2?w.amp:-w.amp)}, ${x} ${w.y+yOff}`;
      }
      out += `<path d="${d}" fill="none" stroke="#dcdcd9" stroke-width="1.1" opacity="${0.5}"/>`;
    });
    return out;
  }

  // ============ ROADS ============
  function pointOnQuad(p0,p1,p2,t){
    const x = (1-t)*(1-t)*p0[0] + 2*(1-t)*t*p1[0] + t*t*p2[0];
    const y = (1-t)*(1-t)*p0[1] + 2*(1-t)*t*p1[1] + t*t*p2[1];
    return [x,y];
  }

  function buildRoads(){
    let out = '';
    const roadsDef = [
      {to: NODES.goLeft.pos,   bend:[-70,-10]},
      {to: NODES.airport.pos,  bend:[70,-20]},
      {to: NODES.how.pos,      bend:[-90,30]},
      {to: NODES.withWhom.pos, bend:[100,10]},
      {to: NODES.why.pos,      bend:[60,40]},
      {to: NODES.talk.pos,     bend:[10,60]}
    ];
    roadsDef.forEach(r=>{
      const mx = (HUB[0]+r.to[0])/2 + r.bend[0];
      const my = (HUB[1]+r.to[1])/2 + r.bend[1];
      const d = `M ${HUB[0]} ${HUB[1]} Q ${mx} ${my} ${r.to[0]} ${r.to[1]}`;
      out += `<path d="${d}" fill="none" stroke="#2a2a2a" stroke-opacity="0.06" stroke-width="26" filter="url(#softBlur)"/>`;
      out += `<path d="${d}" fill="none" stroke="var(--road)" stroke-width="15" stroke-linecap="round"/>`;
      out += `<path d="${d}" fill="none" stroke="#ffffff" stroke-width="1.6" stroke-dasharray="8 10" opacity="0.75"/>`;
      // glow dots along road
      const p0=[HUB[0],HUB[1]], p1=[mx,my], p2=r.to;
      for(let t=0.12;t<0.98;t+=0.16){
        const p = pointOnQuad(p0,p1,p2,t);
        out += `<circle cx="${p[0]}" cy="${p[1]}" r="2.6" fill="#fff" filter="url(#dotGlow)" opacity="0.9"/>`;
        out += `<circle cx="${p[0]}" cy="${p[1]}" r="1.3" fill="#fff"/>`;
      }
    });
    return out;
  }

  // ============ BUILDING CLUSTERS ============
  function buildFactory(cx,cy){
    let out = platform(cx,cy,95,46);
    out += ellipseShadow(cx+10,cy+18,70,26,0.10);
    const base = [cx-40, cy+20];
    out += cube(base, 70, 34, 30, {top:'#f3f3f0', left:'#d2d2ce', right:'#bcbcb7'});
    // chimneys
    out += cube([cx-20, cy-6], 8,8,54, {top:'#e6e6e2', left:'#c6c6c2', right:'#adada8'});
    out += cube([cx-2, cy-2], 8,8,46, {top:'#e6e6e2', left:'#c6c6c2', right:'#adada8'});
    // tanks
    out += cube([cx+22, cy+8], 16,16,20, {top:'#eaeae6', left:'#cacac6', right:'#b4b4af'});
    out += cube([cx+42, cy+10], 14,14,17, {top:'#eaeae6', left:'#cacac6', right:'#b4b4af'});
    // truck
    out += truck([cx-72, cy+46], '#8f8f8a', '#b7b7b3', 1);
    out += tree(cx-100, cy+30, 1.1);
    out += tree(cx+96, cy+38, 0.9);
    out += tree(cx+70, cy-40, 0.8);
    return out;
  }

  function buildAirport(cx,cy){
    let out = platform(cx,cy,100,48);
    out += ellipseShadow(cx,cy+18,74,26,0.10);
    // tower
    out += cube([cx-58,cy+14], 14,14,58, {top:'#eeeeeb', left:'#cfcfcb', right:'#b7b7b2'});
    out += cube([cx-64,cy+2], 26,20,10, {top:'#f0f0ed', left:'#d3d3cf', right:'#bbbbb6'});
    // hangar
    out += cube([cx-6, cy+8], 66,30,24, {top:'#f4f4f1', left:'#d6d6d2', right:'#c0c0bb'});
    // plane on tarmac (flat top-view)
    const p = project([cx+40, cy+42],0,0,1);
    out += `<g transform="translate(${p[0]},${p[1]}) rotate(-25)">
      <path d="M0,-22 L4,-6 L22,2 L22,6 L4,3 L4,14 L12,20 L12,23 L0,19 L-12,23 L-12,20 L-4,14 L-4,3 L-22,6 L-22,2 L-4,-6 Z" fill="#d7d7d3" stroke="#b9b9b4" stroke-width="0.6"/>
    </g>`;
    out += tree(cx-96, cy+36, 0.9);
    out += tree(cx+90, cy-30, 0.8);
    return out;
  }

  function buildOffice(cx,cy){
    let out = platform(cx,cy,88,44);
    out += ellipseShadow(cx,cy+16,64,24,0.10);
    const base = [cx-30, cy+18];
    out += cube(base, 52, 40, 62, {top:'#f2f2ef', left:'#d0d0cc', right:'#b9b9b4'});
    // window rows on the right (front) face
    for(let row=0; row<4; row++){
      const wA = project(base, 4, 40, 10+row*13);
      const wB = project(base, 48, 40, 10+row*13);
      out += `<line x1="${wA[0]}" y1="${wA[1]}" x2="${wB[0]}" y2="${wB[1]}" stroke="#a6a6a1" stroke-width="1.4" opacity="0.55"/>`;
    }
    // parking + cars
    out += `<rect x="${cx-92}" y="${cy+28}" width="70" height="26" rx="4" fill="#e3e3e0" opacity="0.7"/>`;
    out += car([cx-86, cy+40], '#9c9c97');
    out += car([cx-62, cy+44], '#8a8a85');
    // sign
    out += cube([cx+58,cy+30], 3,3,20, {top:'#dedeDA', left:'#c2c2be', right:'#aaaaa5'});
    out += `<rect x="${cx+48}" y="${cy-4}" width="26" height="14" rx="2" fill="#eaeae7" stroke="#c8c8c4"/>`;
    out += tree(cx-96, cy-20, 0.85);
    out += tree(cx+80, cy+40, 0.9);
    return out;
  }

  function buildWarehouse(cx,cy){
    let out = platform(cx,cy,105,50);
    out += ellipseShadow(cx,cy+18,78,28,0.10);
    out += cube([cx-20,cy-4], 60,26,22, {top:'#f2f2ef', left:'#d1d1cd', right:'#bbbbb6'});
    out += cube([cx-56,cy+6], 30,20,16, {top:'#eeeeea', left:'#cccccc8', right:'#b6b6b1'});
    // canopy shelter
    out += `<line x1="${cx+40}" y1="${cy+30}" x2="${cx+40}" y2="${cy+52}" stroke="#a9a9a4" stroke-width="2"/>`;
    out += `<line x1="${cx+66}" y1="${cy+22}" x2="${cx+66}" y2="${cy+44}" stroke="#a9a9a4" stroke-width="2"/>`;
    // trucks row
    out += truck([cx-2, cy+58], '#8a8a85', '#c2c2be', -1);
    out += truck([cx+40, cy+40], '#8a8a85', '#c2c2be', 1);
    out += truck([cx+2, cy+30], '#94948f', '#cfcfcb', 1);
    out += personFig(cx-70, cy+56, 1);
    out += tree(cx-100, cy-14, 0.9);
    out += tree(cx+96, cy+58, 0.85);
    return out;
  }

  function house(base, roofColor){
    let out = '<g>';
    out += cube(base, 22,20,18, {top:'#f0f0ed', left:'#cfcfcb', right:'#b8b8b3'});
    const p0 = project(base,0,0,18);
    const p1 = project(base,22,0,18);
    const p2 = project(base,22,20,18);
    const p3 = project(base,0,20,18);
    const apex1 = project(base,0,10,30);
    const apex2 = project(base,22,10,30);
    out += poly([p0,p1,apex2,apex1], roofColor || '#9c9c97');
    out += poly([p3,p2,apex2,apex1], roofColor || '#8f8f8a');
    out += poly([p1,p2,apex2], '#a9a9a4');
    out += '</g>';
    return out;
  }

  function buildResidential(cx,cy){
    let out = platform(cx,cy,100,48);
    out += ellipseShadow(cx,cy+16,72,26,0.10);
    out += house([cx-56, cy+22]);
    out += house([cx-14, cy+34]);
    out += house([cx+26, cy+16]);
    // playground: swing
    out += `<line x1="${cx+62}" y1="${cy+40}" x2="${cx+62}" y2="${cy+16}" stroke="#a9a9a4" stroke-width="2"/>`;
    out += `<line x1="${cx+86}" y1="${cy+40}" x2="${cx+86}" y2="${cy+16}" stroke="#a9a9a4" stroke-width="2"/>`;
    out += `<line x1="${cx+62}" y1="${cy+16}" x2="${cx+86}" y2="${cy+16}" stroke="#a9a9a4" stroke-width="2"/>`;
    out += `<line x1="${cx+70}" y1="${cy+18}" x2="${cx+70}" y2="${cy+32}" stroke="#8f8f8a" stroke-width="1.4"/>`;
    out += `<line x1="${cx+78}" y1="${cy+18}" x2="${cx+78}" y2="${cy+32}" stroke="#8f8f8a" stroke-width="1.4"/>`;
    out += personFig(cx+66, cy+42, 1);
    out += tree(cx-92, cy+40, 0.9);
    out += tree(cx+40, cy+50, 0.85);
    out += tree(cx-70, cy-24, 0.8);
    out += tree(cx+70, cy-16, 0.75);
    return out;
  }

  function buildPort(cx,cy){
    let out = '';
    // water
    out += `<ellipse cx="${cx+10}" cy="${cy+70}" rx="220" ry="70" fill="#e7e7e4"/>`;
    out += `<ellipse cx="${cx+10}" cy="${cy+70}" rx="220" ry="70" fill="none" stroke="#d3d3cf" stroke-width="1"/>`;
    for(let i=1;i<=3;i++){
      out += `<ellipse cx="${cx+10}" cy="${cy+70}" rx="${220-i*30}" ry="${70-i*9}" fill="none" stroke="#dcdcd8" stroke-width="0.8" opacity="0.6"/>`;
    }
    // dock platform (left)
    out += `<rect x="${cx-190}" y="${cy+10}" width="120" height="60" rx="4" fill="#eeeeea" stroke="#d6d6d2"/>`;
    out += cube([cx-170, cy+10], 24,20,20, {top:'#f0f0ec', left:'#cfcfcb', right:'#b8b8b3'});
    // crane
    out += `<line x1="${cx-120}" y1="${cy+30}" x2="${cx-120}" y2="${cy-70}" stroke="#8f8f8a" stroke-width="5"/>`;
    out += `<line x1="${cx-120}" y1="${cy-66}" x2="${cx-30}" y2="${cy-40}" stroke="#8f8f8a" stroke-width="5"/>`;
    out += `<line x1="${cx-120}" y1="${cy-66}" x2="${cx-150}" y2="${cy-46}" stroke="#8f8f8a" stroke-width="5"/>`;
    out += `<line x1="${cx-70}" y1="${cy-52}" x2="${cx-70}" y2="${cy-20}" stroke="#a9a9a4" stroke-width="2.4"/>`;

    // ship hull
    const hull = `M ${cx-150} ${cy+40} L ${cx+170} ${cy+40} L ${cx+190} ${cy+62} L ${cx+150} ${cy+92} L ${cx-140} ${cy+92} L ${cx-170} ${cy+62} Z`;
    out += `<path d="${hull}" fill="#d8d8d4" stroke="#bcbcb7" stroke-width="1.5"/>`;
    out += `<path d="M ${cx-150} ${cy+40} L ${cx+170} ${cy+40} L ${cx+164} ${cy+50} L ${cx-146} ${cy+50} Z" fill="#e4e4e0"/>`;
    // bridge
    out += cube([cx-138, cy+18], 30,22,26, {top:'#efefec', left:'#cdcdc9', right:'#b6b6b1'});
    // containers grid
    const rows=2, cols=8;
    for(let r=0;r<rows;r++){
      for(let c=0;c<cols;c++){
        const bx = cx-96 + c*30;
        const by = cy+34 - r*17;
        const shade = (r+c)%2===0 ? {top:'#e6e6e2', left:'#c6c6c2', right:'#adada8'} : {top:'#dad9d5', left:'#b7b7b2', right:'#9d9d98'};
        out += cube([bx,by], 22,16,15, shade);
      }
    }
    out += tree(cx-190, cy-20, 0.9);
    out += tree(cx-200, cy+40, 0.8);
    return out;
  }

  // ============ HUB ============
  function buildHub(){
    let out = '';
    out += `<circle cx="${HUB[0]}" cy="${HUB[1]}" r="86" fill="url(#hubGlow)"/>`;
    out += `<ellipse cx="${HUB[0]}" cy="${HUB[1]+2}" rx="58" ry="26" fill="#ffffff" opacity="0.85" filter="url(#softBlur)"/>`;
    out += `<ellipse cx="${HUB[0]}" cy="${HUB[1]}" rx="46" ry="20" fill="#f6f6f4" stroke="#e3e3df" stroke-width="1.5"/>`;
    out += `<ellipse cx="${HUB[0]}" cy="${HUB[1]}" rx="30" ry="13" fill="#ffffff"/>`;
    return out;
  }

  function buildPlane(){
    const x = 700, y = 60;
    let out = `<g transform="translate(${x},${y}) rotate(18)">
      <path d="M0,-16 L3,-4 L30,4 L30,8 L3,3 L3,13 L11,19 L11,22 L0,17 L-11,22 L-11,19 L-3,13 L-3,3 L-30,8 L-30,4 L-3,-4 Z" fill="#b9b9b4" stroke="#a2a29d" stroke-width="0.6"/>
    </g>`;
    out += `<path d="M ${x-20} ${y+10} Q ${x+120} ${y-90} ${x+260} ${y-140}" fill="none" stroke="#c7c7c3" stroke-width="1.6" stroke-dasharray="2 8" opacity="0.8"/>`;
    return out;
  }

  // ============ ASSEMBLE SVG ============
  document.getElementById('terrainGroup').innerHTML = buildTerrain();
  document.getElementById('roadsGroup').innerHTML = buildRoads();
  document.getElementById('platformsGroup').innerHTML = '';
  document.getElementById('hubGroup').innerHTML = buildHub();
  document.getElementById('planeGroup').innerHTML = buildPlane();

  let buildingsHTML = '';
  buildingsHTML += buildFactory(NODES.goLeft.pos[0], NODES.goLeft.pos[1]);
  buildingsHTML += buildAirport(NODES.airport.pos[0], NODES.airport.pos[1]);
  buildingsHTML += buildOffice(NODES.how.pos[0], NODES.how.pos[1]);
  buildingsHTML += buildWarehouse(NODES.withWhom.pos[0], NODES.withWhom.pos[1]);
  buildingsHTML += buildResidential(NODES.why.pos[0], NODES.why.pos[1]);
  buildingsHTML += buildPort(NODES.talk.pos[0], NODES.talk.pos[1]);
  document.getElementById('buildingsGroup').innerHTML = buildingsHTML;

  // ambient scattered trees for texture
  let farTrees = '';
  const scatter = [[60,220],[960,240],[40,760],[980,820],[300,60],[620,1080],[880,1020],[130,1040]];
  scatter.forEach(p=>{ farTrees += tree(p[0],p[1],0.7); });
  document.getElementById('treesFarGroup').innerHTML = farTrees;

  // ============ PILLS (HTML overlay, percentage positioned) ============
  const W = 1024, H = 1190;
  function pct(pos){ return {left: (pos[0]/W*100)+'%', top: (pos[1]/H*100)+'%'}; }

  const pillsLayer = document.getElementById('layerNear');

  const pillDefs = [
    {label:"Let's go",   pos:[150, 92],  anchor: NODES.goLeft.pos},
    {label:"You",        pos: HUB,       anchor: null, hub:true},
    {label:"How",        pos:[150, 402], anchor: NODES.how.pos},
    {label:"With whom",  pos:[880, 322], anchor: NODES.withWhom.pos},
    {label:"Why",        pos:[884, 596], anchor: NODES.why.pos},
    {label:"Let's talk", pos:[500, 826], anchor: NODES.talk.pos}
  ];

  pillDefs.forEach(pd=>{
    const p = pct(pd.pos);
    const pill = document.createElement('div');
    pill.className = 'pill' + (pd.hub ? ' hub' : '');
    pill.style.left = p.left;
    pill.style.top = p.top;
    pill.textContent = pd.label;
    pillsLayer.appendChild(pill);

    if(pd.anchor){
      const from = pct(pd.pos);
      const to = pct(pd.anchor);
      const connector = document.createElement('div');
      connector.className = 'connector';
      connector.style.left = from.left;
      connector.style.top = from.top;
      const heightPct = (pd.anchor[1]-pd.pos[1]) / H * 100;
      connector.style.height = Math.max(6, Math.abs(heightPct)) + '%';
      if(heightPct < 0){ connector.style.top = to.top; }
      const dot = document.createElement('div');
      dot.className='dot';
      connector.appendChild(dot);
      pillsLayer.appendChild(connector);
    }

    // ---- interactive hooks: "Let's go" opens the who-are-you modal, "You" opens the You. page ----
    if (pd.label === "Let's go") {
      pill.classList.add('is-interactive');
      pill.setAttribute('role', 'button');
      pill.setAttribute('aria-haspopup', 'dialog');
      pill.setAttribute('aria-controls', 'who-modal');
      pill.tabIndex = 0;
      pill.addEventListener('click', function(){ if (window.openWhoModal) window.openWhoModal(pill); });
      pill.addEventListener('keydown', function(e){
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (window.openWhoModal) window.openWhoModal(pill); }
      });
    } else if (pd.label === 'You') {
      pill.classList.add('is-interactive');
      pill.setAttribute('role', 'link');
      pill.setAttribute('aria-label', 'You — see clients, industries and case studies');
      pill.tabIndex = 0;
      pill.addEventListener('click', function(){ window.location.href = 'you.html'; });
      pill.addEventListener('keydown', function(e){
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.location.href = 'you.html'; }
      });
    } else if (pd.label === 'How') {
      pill.classList.add('is-interactive');
      pill.setAttribute('role', 'link');
      pill.setAttribute('aria-label', 'How — the systems, network and people behind every move');
      pill.tabIndex = 0;
      pill.addEventListener('click', function(){ window.location.href = 'how.html'; });
      pill.addEventListener('keydown', function(e){
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.location.href = 'how.html'; }
      });
    }
  });

  // ============ SUBTLE PARALLAX ============
  const wrap = document.getElementById('illustrationWrap');
  const layerFar = document.getElementById('layerFar');
  const layerNear = document.getElementById('layerNear');

  wrap.addEventListener('mousemove', function(e){
    const rect = wrap.getBoundingClientRect();
    const cx = (e.clientX - rect.left) / rect.width - 0.5;
    const cy = (e.clientY - rect.top) / rect.height - 0.5;
    const farX = cx * 3, farY = cy * 3;
    const nearX = cx * 5, nearY = cy * 5;
    layerFar.style.transform = `translate(${farX}px, ${farY}px)`;
    layerNear.style.transform = `translate(${nearX}px, ${nearY}px)`;
  });
  wrap.addEventListener('mouseleave', function(){
    layerFar.style.transform = 'translate(0,0)';
    layerNear.style.transform = 'translate(0,0)';
  });

})();
