document.querySelectorAll('.card, button, .seat span, .nav a').forEach((el) => {
  el.addEventListener('click', (e) => {
    const ring = document.createElement('span');
    ring.className = 'ring';
    ring.style.left = `${e.offsetX}px`;
    ring.style.top = `${e.offsetY}px`;
    el.appendChild(ring);
    setTimeout(() => ring.remove(), 500);
  });
  el.addEventListener('mousemove', (e) => {
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    el.style.backgroundImage = `radial-gradient(circle at ${x}% ${y}%, rgba(255,255,255,.18), transparent 45%)`;
  });
  el.addEventListener('mouseleave', () => {
    el.style.backgroundImage = '';
  });
});

const style = document.createElement('style');
style.innerHTML = `
  .ring { position:absolute; width:10px; height:10px; border-radius:999px; background:rgba(255,255,255,.75); transform:translate(-50%,-50%); animation:ripple .5s ease-out forwards; pointer-events:none; }
  @keyframes ripple { to { width:240px; height:240px; opacity:0; } }
  .card, button, .seat span, .nav a { position:relative; overflow:hidden; }
`;
document.head.appendChild(style);
