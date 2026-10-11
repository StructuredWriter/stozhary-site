// Night sky behind the Stozhary pages: one endless camera drift through stars
// toward the Pleiades, the road running through stars 5, 7 and 2, the compass
// ring hunting north around the driver. Brand geometry from docs/brand.
(function () {
  var canvas = document.getElementById('sky');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Box 100×100, y down: [x, y, diameter, bright]
  var STARS = [[36,29,7.5,0],[58,23,10,1],[74,45,6.5,0],[66,69,7.5,0],[42,77,9,1],[24,59,5.5,0],[50,51,5,0]];
  function roadX(y) { return 50 - 8 * Math.sin(Math.PI * (y - 51) / 52); }

  var W = 0, H = 0, dpr = 1, field = [], N = 0, seed = 7;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function spawn(s, z) {
    s.x = (rnd() * 2 - 1) * 1.6; s.y = (rnd() * 2 - 1) * 1.6;
    s.z = z; s.m = 0.4 + rnd() * 0.9; s.tw = rnd() * 6.28;
    s.c = rnd() < 0.12 ? '201,214,255' : (rnd() < 0.08 ? '255,226,170' : '238,237,254');
    return s;
  }
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var want = Math.round(Math.min(520, Math.max(220, W * H / 3200)));
    while (field.length < want) field.push(spawn({}, rnd()));
    field.length = want; N = want;
  }

  function project(s, cx, cy, f, rot) {
    var px = s.x / s.z, py = s.y / s.z;
    var c = Math.cos(rot), si = Math.sin(rot);
    return [cx + (px * c - py * si) * f, cy + (px * si + py * c) * f];
  }

  function glow(x, y, r, rgb, a) {
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(' + rgb + ',' + a + ')');
    g.addColorStop(1, 'rgba(' + rgb + ',0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
  }

  var meteor = null, nextMeteor = 6;
  var last = 0, T = 0;

  function frame(now) {
    var dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
    last = now; if (!still) T += dt;
    var t = T;

    // Base sky
    var fx = W * 0.5, fy = H * 0.42;
    if (canvas.getAttribute('data-focus') === 'side') { if (W >= 900) { fx = W * 0.73; fy = H * 0.46; } else { fy = H * 0.8; } }
    var bg = ctx.createRadialGradient(fx, fy, 0, fx, fy, Math.max(W, H) * 0.8);
    bg.addColorStop(0, '#1b1c48'); bg.addColorStop(0.55, '#12132B'); bg.addColorStop(1, '#070818');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    var cx = fx, cy = fy, f = Math.max(W, H) * 0.32;
    var rot = t * 0.012;                       // slow turn of the whole sky
    var speed = 0.035;                         // camera flies forward

    // Star field with short motion trails
    ctx.lineCap = 'round';
    for (var i = 0; i < N; i++) {
      var s = field[i];
      var z0 = s.z;
      s.z -= speed * dt;
      if (s.z < 0.04) { spawn(s, 1); continue; }
      var p = project(s, cx, cy, f, rot);
      if (p[0] < -20 || p[0] > W + 20 || p[1] < -20 || p[1] > H + 20) { spawn(s, 0.6 + rnd() * 0.4); continue; }
      var near = 1 - s.z;
      var a = Math.min(1, near * 1.6) * (0.55 + 0.45 * Math.sin(t * 1.3 + s.tw)) * 0.85;
      var w = (0.5 + near * 2.0) * s.m;
      ctx.strokeStyle = 'rgba(' + s.c + ',' + a.toFixed(3) + ')';
      ctx.lineWidth = w;
      ctx.beginPath();
      if (still) { ctx.moveTo(p[0], p[1]); ctx.lineTo(p[0] + 0.01, p[1]); }
      else {
        var pz = s.z + speed * 0.5 * (0.6 + near);  // position ~0.5 s ago: the streak
        var q = project({ x: s.x, y: s.y, z: Math.min(pz, z0 + 0.03) }, cx, cy, f, rot);
        ctx.moveTo(q[0], q[1]); ctx.lineTo(p[0], p[1]);
      }
      ctx.stroke();
    }

    // Shooting star
    if (!still) {
      nextMeteor -= dt;
      if (!meteor && nextMeteor <= 0) {
        var ang = 0.45 + rnd() * 0.5;
        meteor = { x: rnd() * W * 0.8, y: rnd() * H * 0.35, vx: Math.cos(ang) * 620, vy: Math.sin(ang) * 620, life: 0 };
        nextMeteor = 9 + rnd() * 9;
      }
      if (meteor) {
        meteor.life += dt; meteor.x += meteor.vx * dt; meteor.y += meteor.vy * dt;
        var ml = Math.sin(Math.min(meteor.life / 0.9, 1) * Math.PI);
        var tail = ctx.createLinearGradient(meteor.x, meteor.y, meteor.x - meteor.vx * 0.22, meteor.y - meteor.vy * 0.22);
        tail.addColorStop(0, 'rgba(255,240,200,' + (0.85 * ml) + ')'); tail.addColorStop(1, 'rgba(255,240,200,0)');
        ctx.strokeStyle = tail; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(meteor.x, meteor.y); ctx.lineTo(meteor.x - meteor.vx * 0.22, meteor.y - meteor.vy * 0.22); ctx.stroke();
        if (meteor.life > 0.9) meteor = null;
      }
    }

    // The Pleiades: brand box, slow breathing zoom and sway
    var unit = Math.min(W, H) * (W < 640 ? 0.0068 : 0.0056) * (1 + 0.045 * Math.sin(t * 0.16));
    var sway = 0.05 * Math.sin(t * 0.07);
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(sway); ctx.scale(unit, unit); ctx.translate(-50, -50);

    // Road: asphalt, edge glow, flowing gold axis
    ctx.beginPath();
    for (var y = 118; y >= -18; y -= 2) { var x = roadX(y); if (y === 118) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(156,134,255,0.16)'; ctx.lineWidth = 9.5; ctx.stroke();
    ctx.strokeStyle = 'rgba(42,37,96,0.78)'; ctx.lineWidth = 7.5; ctx.stroke();
    ctx.strokeStyle = 'rgba(64,55,124,0.55)'; ctx.lineWidth = 5.5; ctx.stroke();
    ctx.setLineDash([2.4, 3.2]); ctx.lineDashOffset = still ? 0 : t * 3.2;
    ctx.strokeStyle = 'rgba(255,211,78,0.75)'; ctx.lineWidth = 0.7; ctx.stroke();
    ctx.setLineDash([]);
    // A light travelling up the road
    if (!still) {
      var k = (t % 9) / 9, ly = 118 - k * 136;
      glow(roadX(ly), ly, 6, '255,217,138', 0.35 * Math.sin(k * Math.PI));
    }

    // Compass ring around the driver, hunting north
    var hunt = still ? 0 : (0.16 * Math.sin(t * 0.55) * (0.55 + 0.45 * Math.sin(t * 0.13)));
    ctx.save(); ctx.translate(50, 51); ctx.rotate(hunt);
    ctx.strokeStyle = 'rgba(238,237,254,0.30)'; ctx.lineWidth = 0.25;
    ctx.beginPath(); ctx.arc(0, 0, 17, 0, 6.2832); ctx.stroke();
    ctx.beginPath();
    for (var d = 0; d < 72; d++) {
      var aa = d * Math.PI / 36, L = d % 6 === 0 ? 2.4 : 1.1;
      ctx.moveTo(Math.sin(aa) * 17, -Math.cos(aa) * 17);
      ctx.lineTo(Math.sin(aa) * (17 - L), -Math.cos(aa) * (17 - L));
    }
    ctx.strokeStyle = 'rgba(238,237,254,0.38)'; ctx.lineWidth = 0.22; ctx.stroke();
    ctx.fillStyle = 'rgba(255,211,78,0.9)';
    ctx.beginPath(); ctx.moveTo(0, -20.4); ctx.lineTo(-1.3, -17.8); ctx.lineTo(1.3, -17.8); ctx.closePath(); ctx.fill();
    ctx.restore();

    // Seven stars
    for (var j = 0; j < 7; j++) {
      var st = STARS[j], r = st[2] / 2, tw = 0.85 + 0.15 * Math.sin(t * (0.9 + j * 0.17) + j);
      if (j === 6) continue;
      glow(st[0], st[1], r * (st[3] ? 3.2 : 2.4), '201,214,255', 0.32 * tw);
      if (st[3]) {
        var fl = 0.13 + 0.06 * Math.sin(t * 0.6 + j);
        var g = ctx.createLinearGradient(st[0] - 26, 0, st[0] + 26, 0);
        g.addColorStop(0, 'rgba(201,214,255,0)'); g.addColorStop(0.5, 'rgba(201,214,255,' + fl + ')'); g.addColorStop(1, 'rgba(201,214,255,0)');
        ctx.fillStyle = g; ctx.fillRect(st[0] - 26, st[1] - 0.18, 52, 0.36);
      }
      ctx.fillStyle = 'rgba(238,237,254,' + (0.9 * tw + 0.1) + ')';
      ctx.beginPath(); ctx.arc(st[0], st[1], r * 0.42, 0, 6.2832); ctx.fill();
    }
    // Driver: blue dot with a breathing circle of uncertainty
    var br = still ? 0.5 : 0.5 + 0.5 * Math.sin(t * 1.1);
    ctx.fillStyle = 'rgba(89,184,255,' + (0.10 + 0.06 * br) + ')';
    ctx.beginPath(); ctx.arc(50, 51, 6.5 + 1.5 * br, 0, 6.2832); ctx.fill();
    ctx.strokeStyle = 'rgba(89,184,255,0.55)'; ctx.lineWidth = 0.35;
    ctx.beginPath(); ctx.arc(50, 51, 6.5 + 1.5 * br, 0, 6.2832); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(50, 51, 2.0, 0, 6.2832); ctx.fill();
    ctx.fillStyle = '#59B8FF'; ctx.beginPath(); ctx.arc(50, 51, 1.45, 0, 6.2832); ctx.fill();
    ctx.restore();

    // Vignette
    var v = ctx.createRadialGradient(cx, cy, Math.min(W, H) * 0.25, cx, cy, Math.max(W, H) * 0.78);
    v.addColorStop(0, 'rgba(7,8,24,0)'); v.addColorStop(1, 'rgba(7,8,24,0.72)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);

    if (!still && !document.hidden) requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener('resize', function () { resize(); if (still) requestAnimationFrame(frame); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden && !still) { last = 0; requestAnimationFrame(frame); } });
  requestAnimationFrame(frame);
})();
