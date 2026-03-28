async function me() {
  const r = await fetch('/api/me');
  return r.json();
}
function currency(v) { return Number(v || 0).toLocaleString('vi-VN'); }
function shell(title, body) {
  return `
  <div class="bg-orb orb1"></div><div class="bg-orb orb2"></div>
  <div class="shell">
    <header class="topbar glass">
      <div class="brand">🎬 Fluent Cinema</div>
      <nav class="nav" id="nav"></nav>
      <div class="userbox" id="userbox"></div>
    </header>
    <main class="page">${body}</main>
  </div>`;
}
async function renderLayout(title, body, roleRequired = null) {
  const info = await me();
  if (!info.user) { window.location.href = '/login.html'; return; }
  if (roleRequired && !roleRequired.includes(info.user.Role)) { window.location.href = '/forbidden.html'; return; }
  document.title = title;
  document.body.innerHTML = shell(title, body);
  const nav = [];
  nav.push('<a href="/dashboard.html">Dashboard</a>');
  if (['admin', 'staff'].includes(info.user.Role)) nav.push('<a href="/movies.html">Movies</a><a href="/showtimes.html">Showtimes</a><a href="/foods.html">Food & Combo</a>');
  if (info.user.Role === 'admin') nav.push('<a href="/promotions.html">Promotions</a><a href="/users.html">Users</a>');
  if (info.user.Role === 'customer') nav.push('<a href="/booking.html">Đặt vé</a><a href="/my-bookings.html">Vé của tôi</a>');
  document.getElementById('nav').innerHTML = nav.join('');
  document.getElementById('userbox').innerHTML = `Xin chào, ${info.user.Fullname} (${info.user.Role}) • <a href="#" id="logoutBtn">Đăng xuất</a>`;
  document.getElementById('logoutBtn').onclick = async () => { await fetch('/api/logout', { method: 'POST' }); window.location.href = '/login.html'; };
  bindFluentEffects();
  return info.user;
}
function bindFluentEffects() {
  document.querySelectorAll('.card, button, .seat span, .nav a').forEach((el) => {
    el.addEventListener('click', (e) => {
      const ring = document.createElement('span');
      ring.className = 'ring';
      ring.style.left = `${e.offsetX}px`;
      ring.style.top = `${e.offsetY}px`;
      el.appendChild(ring); setTimeout(() => ring.remove(), 500);
    });
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.backgroundImage = `radial-gradient(circle at ${((e.clientX-r.left)/r.width)*100}% ${((e.clientY-r.top)/r.height)*100}%, rgba(255,255,255,.18), transparent 45%)`;
    });
    el.addEventListener('mouseleave', () => { el.style.backgroundImage = ''; });
  });
}
