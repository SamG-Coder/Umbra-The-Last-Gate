/** Mouse, keyboard and independent multi-touch input. No pointer lock is required. */
export class Input {
  constructor(game, canvas) {
    this.game = game; this.canvas = canvas; this.keys = new Set(); this.attackHeld = false;
    this.touch = { x: 0, z: 0 }; this.orbitPointer = null; this.stickPointer = null;
    this.yaw = 0; this.pitch = .63; this.distance = 11;
    const coarse = matchMedia('(pointer: coarse)').matches;
    if (coarse) document.body.classList.add('pointer-touch');
    window.addEventListener('contextmenu', e => { if (e.target === canvas) e.preventDefault(); });
    window.addEventListener('keydown', e => this.key(e, true));
    window.addEventListener('keyup', e => this.key(e, false));
    canvas.addEventListener('pointerdown', e => {
      if (game.mode !== 'playing' || game.ui.modalOpen) return;
      game.sound.start();
      if (e.pointerType === 'touch') document.body.classList.add('pointer-touch');
      if (e.button === 2 || e.pointerType === 'touch') {
        this.orbitPointer = e.pointerId; this.lastX = e.clientX; this.lastY = e.clientY;
        canvas.setPointerCapture(e.pointerId);
      } else if (e.button === 0) this.attackHeld = true;
      e.preventDefault();
    });
    canvas.addEventListener('pointermove', e => {
      if (e.pointerId !== this.orbitPointer || game.ui.modalOpen) return;
      this.yaw -= (e.clientX - this.lastX) * .006;
      this.pitch = Math.max(.35, Math.min(1.05, this.pitch + (e.clientY - this.lastY) * .003));
      this.lastX = e.clientX; this.lastY = e.clientY;
    });
    window.addEventListener('pointerup', e => {
      if (e.pointerId === this.orbitPointer) this.orbitPointer = null;
      if (e.button === 0 && e.pointerType !== 'touch') this.attackHeld = false;
    });
    window.addEventListener('pointercancel', () => this.clear());
    canvas.addEventListener('wheel', e => {
      e.preventDefault(); this.distance = Math.max(6.5, Math.min(17, this.distance + e.deltaY * .008));
    }, { passive: false });
    const stick = document.getElementById('joystick'), knob = document.getElementById('stick');
    const stickMove = e => {
      const rect = stick.getBoundingClientRect(), radius = rect.width * .36;
      let dx = e.clientX - rect.left - rect.width / 2, dy = e.clientY - rect.top - rect.height / 2;
      const length = Math.hypot(dx, dy), scale = Math.max(1, length / radius);
      dx /= scale; dy /= scale;
      this.touch.x = dx / radius; this.touch.z = dy / radius;
      knob.style.transform = `translate(${dx}px,${dy}px)`;
    };
    stick.addEventListener('pointerdown', e => {
      if (game.ui.modalOpen) return;
      e.preventDefault(); this.stickPointer = e.pointerId; stick.setPointerCapture(e.pointerId); stickMove(e);
    });
    stick.addEventListener('pointermove', e => { if (e.pointerId === this.stickPointer) stickMove(e); });
    const endStick = e => { if (e.pointerId === this.stickPointer) { this.stickPointer = null; this.touch.x = this.touch.z = 0; knob.style.transform = ''; } };
    stick.addEventListener('pointerup', endStick); stick.addEventListener('pointercancel', endStick);
    for (const button of document.querySelectorAll('[data-action]')) {
      button.addEventListener('pointerdown', e => {
        e.preventDefault(); e.stopPropagation(); button.setPointerCapture(e.pointerId);
        if (button.dataset.action === 'attack') this.attackHeld = true;
        game.action(button.dataset.action);
      });
      const release = () => { if (button.dataset.action === 'attack') this.attackHeld = false; };
      button.addEventListener('pointerup', release); button.addEventListener('pointercancel', release);
    }
    const suspend = () => {
      this.clear();
      if (game.mode === 'playing' && !game.ui.modalOpen) game.ui.pause();
    };
    window.addEventListener('blur', suspend);
    document.addEventListener('visibilitychange', () => { if (document.hidden) suspend(); });
  }
  key(e, down) {
    if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    const used = ['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyQ','KeyE','KeyR','KeyF','KeyI','KeyH','KeyJ','Digit1','Space','Tab','Escape'];
    if (!used.includes(e.code)) return;
    e.preventDefault();
    if (!down) { this.keys.delete(e.code); if (e.code === 'KeyJ') this.attackHeld = false; return; }
    if (e.repeat) return;
    const g = this.game;
    if (e.code === 'Escape') { if (g.ui.modalOpen) g.ui.close(); else g.ui.pause(); return; }
    if (g.ui.modalOpen) { if (['Tab','KeyI'].includes(e.code) && g.ui.kind === 'inventory') g.ui.close(); return; }
    if (g.mode !== 'playing') return;
    if (e.code === 'Tab' || e.code === 'KeyI') { g.ui.inventory(); return; }
    if (e.code === 'KeyH') { g.ui.help(); return; }
    this.keys.add(e.code);
    if (e.code === 'KeyJ') this.attackHeld = true;
    const actions = { Space: 'dash', KeyQ: 'rift', KeyE: 'extract', KeyR: 'army', Digit1: 'potion', KeyF: 'interact' };
    if (actions[e.code]) g.action(actions[e.code]);
  }
  movement() {
    const k = this.keys;
    let x = +(k.has('KeyD') || k.has('ArrowRight')) - +(k.has('KeyA') || k.has('ArrowLeft')) + this.touch.x;
    let z = +(k.has('KeyS') || k.has('ArrowDown')) - +(k.has('KeyW') || k.has('ArrowUp')) + this.touch.z;
    const n = Math.max(1, Math.hypot(x,z)); x /= n; z /= n;
    return { x: Math.cos(this.yaw)*x + Math.sin(this.yaw)*z, z: -Math.sin(this.yaw)*x + Math.cos(this.yaw)*z };
  }
  clear() {
    this.keys.clear(); this.attackHeld = false; this.touch.x = this.touch.z = 0;
    this.orbitPointer = this.stickPointer = null;
    const knob = document.getElementById('stick'); if (knob) knob.style.transform = '';
  }
}
