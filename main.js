/* ===========================
   VINTAGE BAG STORE — MAIN JS
   =========================== */

/* ── Sheet endpoints ─────────────────────────────────────────────────────── */
const BAGS_URL         = 'https://opensheet.elk.sh/1G7rBoIyAmoV9tF9nfsp1h-rGOLvPrf2ke2Kh8axr05I/Bags';
const TESTIMONIALS_URL = 'https://opensheet.elk.sh/1AWA_pZLbjzO34Ls99ysc-niIKOTVwESg8uZROpufx2k/Testimonials';

/*
  Bags sheet columns (your actual sheet):
    Images | Name | Description
  Optional extras recognised: Category | Price | Era | Featured

  Testimonials sheet columns (your actual sheet):
    Name | Testimonials | Date
  Optional extras recognised: Location | Stars
*/

/* ── Helpers ─────────────────────────────────────────────────────────────── */
const norm = row =>
  Object.fromEntries(Object.entries(row).map(([k, v]) => [k.trim().toLowerCase(), String(v ?? '').trim()]));

const starsHtml = n => {
  const c = Math.min(5, Math.max(1, parseInt(n, 10) || 5));
  return '★'.repeat(c) + '☆'.repeat(5 - c);
};

const initials = name =>
  (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

const fmtPrice = p => {
  if (!p) return '';
  return p.startsWith('$') ? p : '$' + p;
};

/* ── Fetch with timeout ──────────────────────────────────────────────────── */
async function fetchSheet(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

/* ── Skeleton helpers ────────────────────────────────────────────────────── */
function bagSkeleton() {
  return `<article class="bag-card skeleton-card">
    <div class="bag-card-img skeleton-pulse"></div>
    <div class="bag-card-body">
      <div class="skeleton-line" style="width:38%;height:11px;margin-bottom:.5rem"></div>
      <div class="skeleton-line" style="width:78%;height:15px;margin-bottom:.4rem"></div>
      <div class="skeleton-line" style="width:90%;height:11px"></div>
    </div>
    <div class="bag-card-footer">
      <div class="skeleton-line" style="width:30%;height:18px"></div>
      <div class="skeleton-line" style="width:28%;height:30px;border-radius:50px"></div>
    </div>
  </article>`;
}

function testiSkeleton() {
  return `<div class="testimonial-card skeleton-card">
    <div class="skeleton-line" style="width:32%;height:13px;margin-bottom:.8rem"></div>
    <div class="skeleton-line" style="width:100%;height:11px;margin-bottom:.35rem"></div>
    <div class="skeleton-line" style="width:88%;height:11px;margin-bottom:.35rem"></div>
    <div class="skeleton-line" style="width:52%;height:11px"></div>
  </div>`;
}

function showError(el, msg) {
  el.innerHTML = `<div class="data-error" role="alert"><span>⚠️</span><p>${msg}</p></div>`;
}

/* ── Resolve image URL from any likely column name ───────────────────────── */
function getImgSrc(bag) {
  // Handles: Images, Image, ImageURL, image url, etc. (all lowercased by norm())
  return bag.images || bag.image || bag.imageurl || bag['image url'] || bag['image link'] || bag.photo || bag.url || '';
}

/* ── Bag card HTML ───────────────────────────────────────────────────────── */
function bagCardHtml(bag) {
  const cat    = (bag.category || 'vintage').toLowerCase();
  const imgSrc = getImgSrc(bag);
  const imgHtml = imgSrc
    ? `<img src="${imgSrc}" alt="${bag.name || 'Vintage bag'}" loading="lazy"
           onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />
       <span class="bag-emoji" style="display:none" aria-hidden="true">👜</span>`
    : `<span class="bag-emoji" aria-hidden="true">👜</span>`;

  const price = bag.price ? fmtPrice(bag.price) : null;

  return `
    <article class="bag-card">
      <div class="bag-card-img">
        ${imgHtml}
        ${price ? `<div class="bag-price-badge">${price}</div>` : ''}
      </div>
      <div class="bag-card-body">
        <span class="bag-tag">${cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
        <h3>${bag.name || 'Vintage Bag'}</h3>
        <p>${bag.description || ''}</p>
      </div>
      <div class="bag-card-footer">
        ${price
          ? `<span class="bag-price">${price}</span>`
          : `<span class="bag-price-na">Price on request</span>`}
        <a href="contact.html" class="btn-buy">Enquire →</a>
      </div>
    </article>`;
}

/* ── Resolve testimonial text from any likely column name ────────────────── */
function getReviewText(r) {
  // Handles: Testimonials, Review, Message, Comment (all lowercased by norm())
  return r.testimonials || r.testimonial || r.review || r.message || r.comment || '';
}

/* ── Resolve date string ─────────────────────────────────────────────────── */
function getReviewDate(r) {
  const raw = r.date || r.dateadded || r['date added'] || r.submitted || '';
  if (!raw) return '';
  // Try to format nicely; fall back to raw string if invalid
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/* ── Testimonial card HTML ───────────────────────────────────────────────── */
function testiCardHtml(r) {
  const text = getReviewText(r);
  const date = getReviewDate(r);
  return `
    <div class="testimonial-card">
      <span class="stars" aria-label="${r.stars || 5} stars">${starsHtml(r.stars || 5)}</span>
      <blockquote>"${text}"</blockquote>
      <div class="reviewer">
        <div class="reviewer-avatar" aria-hidden="true">${initials(r.name)}</div>
        <div class="reviewer-info">
          <cite>${r.name || 'Anonymous'}</cite>
          <span>${[r.location || r.country || '', date].filter(Boolean).join(' · ')}</span>
          <span class="verified-badge">✓ Verified Buyer</span>
        </div>
      </div>
    </div>`;
}

/* ── Load featured bags (Home) ───────────────────────────────────────────── */
async function loadFeaturedBags() {
  const grid = document.getElementById('featured-grid');
  if (!grid) return;

  grid.innerHTML = Array(4).fill(bagSkeleton()).join('');

  let rows;
  try { rows = await fetchSheet(BAGS_URL); }
  catch { showError(grid, 'Could not load bags right now.'); return; }

  const bags     = rows.map(norm);
  const featured = bags.filter(b => ['yes','true','1','y'].includes((b.featured || '').toLowerCase()));
  const display  = (featured.length ? featured : bags).slice(0, 4);

  grid.innerHTML = display.map(bagCardHtml).join('');
  revealOnScroll(grid.querySelectorAll('.bag-card'), true);
}

/* ── Load testimonial preview (Home — 2 cards) ───────────────────────────── */
async function loadTestimonialPreview() {
  const grid = document.getElementById('testi-preview-grid');
  if (!grid) return;

  let rows;
  try { rows = await fetchSheet(TESTIMONIALS_URL); }
  catch { grid.innerHTML = ''; return; }

  if (!rows.length) { grid.innerHTML = ''; return; }

  const reviews = rows.map(norm).slice(0, 2);
  grid.innerHTML = reviews.map(testiCardHtml).join('');
  revealOnScroll(grid.querySelectorAll('.testimonial-card'), true);
}

/* ── Load full gallery ───────────────────────────────────────────────────── */
const GALLERY_DEFAULT_LIMIT = 8;

async function loadGallery() {
  const grid        = document.getElementById('gallery-grid');
  const filterWrap  = document.getElementById('gallery-filters');
  const viewAllWrap = document.getElementById('gallery-view-all');
  const viewAllBtn  = document.getElementById('view-all-btn');
  const viewAllCount = document.getElementById('view-all-count');
  if (!grid) return;

  grid.innerHTML = Array(GALLERY_DEFAULT_LIMIT).fill(
    `<div class="gallery-item skeleton-card"><div class="gallery-item-img skeleton-pulse"></div></div>`
  ).join('');

  let rows;
  try { rows = await fetchSheet(BAGS_URL); }
  catch { showError(grid, 'Could not load the gallery. Please try again later.'); return; }

  if (!rows.length) { showError(grid, 'No bags found yet — check back soon!'); return; }

  const bags = rows.map(norm);
  let showAll = false;
  let activeFilter = 'all';

  /* Build filter buttons from unique categories */
  if (filterWrap) {
    const cats = ['all', ...new Set(bags.map(b => b.category).filter(Boolean).map(c => c.toLowerCase()))];
    filterWrap.innerHTML = cats.map((c, i) =>
      `<button class="filter-btn${i === 0 ? ' active' : ''}" data-filter="${c}">
         ${c.charAt(0).toUpperCase() + c.slice(1)}
       </button>`
    ).join('');
  }

  /* Build one gallery item HTML */
  function itemHtml(bag) {
    const cat    = (bag.category || 'other').toLowerCase();
    const imgSrc = getImgSrc(bag);
    const imgHtml = imgSrc
      ? `<img src="${imgSrc}" alt="${bag.name || 'Vintage bag'}" loading="lazy"
             onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />
         <span class="bag-emoji" style="display:none" aria-hidden="true">👜</span>`
      : `<span class="bag-emoji" aria-hidden="true">👜</span>`;
    const detail = [cat.charAt(0).toUpperCase() + cat.slice(1), bag.era].filter(Boolean).join(' · ');
    const price  = bag.price ? fmtPrice(bag.price) : null;
    return `
      <div class="gallery-item" data-category="${cat}" tabindex="0" role="button" aria-label="${bag.name || 'Vintage bag'}">
        <div class="gallery-item-img">${imgHtml}</div>
        <div class="gallery-item-overlay">
          <h4>${bag.name || 'Vintage Bag'}</h4>
          <p>${detail}</p>
          ${price ? `<span class="gallery-price">${price}</span>` : ''}
        </div>
        <div class="gallery-item-label">${bag.name || 'Vintage Bag'}</div>
      </div>`;
  }

  /* Render grid respecting filter + showAll */
  function renderGrid() {
    const filtered = activeFilter === 'all'
      ? bags
      : bags.filter(b => (b.category || 'other').toLowerCase() === activeFilter);

    const visible = showAll ? filtered : filtered.slice(0, GALLERY_DEFAULT_LIMIT);
    const hidden  = filtered.length - visible.length;

    grid.innerHTML = visible.map(itemHtml).join('');
    revealOnScroll(grid.querySelectorAll('.gallery-item'), true);

    /* View All button */
    if (viewAllWrap && viewAllBtn && viewAllCount) {
      if (hidden > 0 && !showAll) {
        viewAllWrap.style.display = 'flex';
        viewAllCount.textContent  = `(${filtered.length} total)`;
        viewAllBtn.textContent    = `View All Bags (${filtered.length} total)`;
      } else {
        viewAllWrap.style.display = 'none';
      }
    }
  }

  /* Filter button clicks */
  filterWrap?.addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    filterWrap.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter;
    showAll = false; // reset to 8 on filter change
    renderGrid();
  });

  /* View All click */
  viewAllBtn?.addEventListener('click', () => {
    showAll = true;
    renderGrid();
    viewAllWrap.style.display = 'none';
  });

  renderGrid();
}

/* ── Load full testimonials page ─────────────────────────────────────────── */
async function loadTestimonials() {
  const grid = document.getElementById('testimonials-grid');
  if (!grid) return;

  grid.innerHTML = Array(6).fill(testiSkeleton()).join('');

  let rows;
  try { rows = await fetchSheet(TESTIMONIALS_URL); }
  catch { showError(grid, 'Could not load reviews. Please check back soon.'); return; }

  if (!rows.length) { showError(grid, 'No reviews yet — be the first!'); return; }

  const reviews = rows.map(norm);

  const countEl = document.getElementById('review-count');
  const avgEl   = document.getElementById('avg-stars');
  if (countEl) countEl.textContent = `Based on ${reviews.length} review${reviews.length !== 1 ? 's' : ''}`;
  if (avgEl) {
    const avg = reviews.reduce((s, r) => s + (parseInt(r.stars, 10) || 5), 0) / reviews.length;
    avgEl.textContent = avg.toFixed(1);
  }

  grid.innerHTML = reviews.map(testiCardHtml).join('');
  revealOnScroll(grid.querySelectorAll('.testimonial-card'), true);
}

/* ── Gallery filter listeners ────────────────────────────────────────────── */
function attachFilterListeners() {
  const btns = document.querySelectorAll('.filter-btn');
  const grid = document.getElementById('gallery-grid');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const f = btn.dataset.filter;
      grid?.querySelectorAll('.gallery-item').forEach(item => {
        const show = f === 'all' || item.dataset.category === f;
        if (show) {
          item.style.display = '';
          requestAnimationFrame(() => {
            item.style.opacity = '1';
            item.style.transform = 'scale(1) translateY(0)';
          });
        } else {
          item.style.opacity = '0';
          item.style.transform = 'scale(.95) translateY(8px)';
          setTimeout(() => { if (!show) item.style.display = 'none'; }, 280);
        }
      });
    });
  });
}

/* ── Scroll reveal — staggered support ───────────────────────────────────── */
function revealOnScroll(els, stagger = false) {
  if (!('IntersectionObserver' in window)) {
    els.forEach(el => { el.classList.add('visible'); });
    return;
  }
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((e, i) => {
      if (e.isIntersecting) {
        if (stagger) {
          setTimeout(() => e.target.classList.add('visible'), i * 70);
        } else {
          e.target.classList.add('visible');
        }
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.07 });
  els.forEach(el => { el.classList.add('reveal'); obs.observe(el); });
}

/* ── Toast ───────────────────────────────────────────────────────────────── */
function showToast(msg) {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 4000);
}

/* ── Count-up animation for stat numbers ─────────────────────────────────── */
function initCountUp() {
  const statNums = document.querySelectorAll('.stat-num');
  if (!statNums.length) return;

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      obs.unobserve(el);

      const raw = el.textContent.trim();
      const suffix = raw.replace(/[\d.]/g, ''); // e.g. '+', 'k'
      const target = parseFloat(raw.replace(/[^\d.]/g, ''));
      if (isNaN(target)) return;

      const duration = 1400;
      const start = performance.now();
      el.classList.add('counting');

      function tick(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(eased * target);
        el.textContent = current + suffix;
        if (progress < 1) requestAnimationFrame(tick);
        else el.classList.remove('counting');
      }
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.4 });

  statNums.forEach(el => obs.observe(el));
}

/* ── Online status indicator ─────────────────────────────────────────────── */
function initOnlineStatus() {
  const statusEl = document.getElementById('online-status-text');
  if (!statusEl) return;
  // Randomly show online or typical response time
  const isOnline = Math.random() > 0.35;
  if (isOnline) {
    statusEl.innerHTML = `<span class="online-dot"></span>Online now`;
    statusEl.style.color = '#2ecc71';
  } else {
    statusEl.innerHTML = `<span class="online-dot"></span>Usually responds in 2–4 hours`;
  }
}

/* ── DOM Ready ───────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {

  /* Navbar scroll */
  const navbar    = document.getElementById('navbar');
  const backToTop = document.getElementById('back-to-top');
  window.addEventListener('scroll', () => {
    const s = window.scrollY > 60;
    navbar?.classList.toggle('scrolled', s);
    backToTop?.classList.toggle('visible', s);
  });
  backToTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  /* Hero parallax / loaded class */
  const hero = document.getElementById('hero');
  if (hero) {
    setTimeout(() => hero.classList.add('loaded'), 100);
    window.addEventListener('scroll', () => {
      if (window.scrollY < window.innerHeight) {
        hero.style.setProperty('--scroll', window.scrollY + 'px');
      }
    }, { passive: true });
  }

  /* Hamburger */
  const hamburger = document.querySelector('.hamburger');
  const navLinks  = document.querySelector('.nav-links');
  hamburger?.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    navLinks.classList.toggle('open');
    hamburger.setAttribute('aria-expanded', navLinks.classList.contains('open'));
  });
  navLinks?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    hamburger?.classList.remove('open');
    navLinks.classList.remove('open');
  }));

  /* Active nav link */
  const page = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a => {
    if (a.getAttribute('href') === page || (page === '' && a.getAttribute('href') === 'index.html')) {
      a.classList.add('active');
    }
  });

  /* Scroll reveal for static elements */
  revealOnScroll(document.querySelectorAll('.reveal'), false);
  revealOnScroll(document.querySelectorAll('.step-card, .value-item, .stat-item'), true);

  /* ── Contact form — EmailJS ──────────────────────────────────────────────── */
  const form      = document.getElementById('contact-form');
  const feedback  = document.getElementById('form-feedback');
  const submitBtn = document.getElementById('submit-btn');

  if (form) {
    // Clear individual field errors on input
    form.querySelectorAll('input, textarea, select').forEach(field => {
      field.addEventListener('input',  () => clearFieldError(field));
      field.addEventListener('change', () => clearFieldError(field));
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!validateContactForm()) return;

      const originalHTML = submitBtn.innerHTML;
      submitBtn.innerHTML = '<span style="opacity:.7">Sending…</span>';
      submitBtn.disabled = true;
      hideFeedback();

      const templateParams = {
        from_name:  `${form.first_name.value.trim()} ${form.last_name.value.trim()}`,
        from_email: form.from_email.value.trim(),
        phone:      form.phone.value.trim() || 'Not provided',
        subject:    form.subject.value,
        message:    form.message.value.trim(),
        to_email:   'vintagebagstore23@gmail.com',
      };

      try {
        await emailjs.send(
          window.EMAILJS_SERVICE_ID,
          window.EMAILJS_TEMPLATE_ID,
          templateParams
        );
        form.reset();
        showFeedback('✓ Message sent! We\'ll get back to you soon.', 'success');
        showToast("✓ Message sent! We'll get back to you soon.");
      } catch (err) {
        console.error('EmailJS error:', err);
        showFeedback('Something went wrong. Please try again or email us at vintagebagstore23@gmail.com', 'error');
      }

      submitBtn.innerHTML = originalHTML;
      submitBtn.disabled = false;
    });
  }

  function validateContactForm() {
    let valid = true;
    const checks = [
      { id: 'first-name', errId: 'err-first-name', msg: 'First name is required.' },
      { id: 'last-name',  errId: 'err-last-name',  msg: 'Last name is required.' },
      { id: 'subject',    errId: 'err-subject',    msg: 'Please select a subject.' },
      { id: 'message',    errId: 'err-message',    msg: 'Message cannot be empty.' },
    ];
    checks.forEach(({ id, errId, msg }) => {
      const f = document.getElementById(id);
      if (!f || !f.value.trim()) { setFieldError(f, errId, msg); valid = false; }
    });
    const emailField = document.getElementById('email');
    if (!emailField.value.trim()) {
      setFieldError(emailField, 'err-email', 'Email address is required.'); valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailField.value.trim())) {
      setFieldError(emailField, 'err-email', 'Please enter a valid email address.'); valid = false;
    }
    const msgField = document.getElementById('message');
    if (msgField && msgField.value.trim().length > 0 && msgField.value.trim().length < 10) {
      setFieldError(msgField, 'err-message', 'Message is too short (min 10 characters).'); valid = false;
    }
    return valid;
  }

  function setFieldError(field, errId, msg) {
    if (field) field.style.borderColor = '#c0392b';
    const el = document.getElementById(errId);
    if (el) el.textContent = msg;
  }

  function clearFieldError(field) {
    field.style.borderColor = '';
    const el = document.getElementById('err-' + field.id);
    if (el) el.textContent = '';
  }

  function showFeedback(msg, type) {
    if (!feedback) return;
    feedback.textContent = msg;
    feedback.className = 'form-feedback-' + type;
    feedback.style.display = 'block';
    if (type === 'success') setTimeout(hideFeedback, 7000);
  }

  function hideFeedback() {
    if (!feedback) return;
    feedback.style.display = 'none';
    feedback.textContent = '';
  }

  /* ── Load dynamic data ── */
  loadFeaturedBags();
  loadTestimonialPreview();
  loadGallery();
  loadTestimonials();
  initCountUp();
  initOnlineStatus();
});
