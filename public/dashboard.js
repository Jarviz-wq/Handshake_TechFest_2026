window.addEventListener('DOMContentLoaded', async () => {

  // ---------- DOM ELEMENTS ----------
  const userDisplayNameEl = document.getElementById('userDisplayName');
  const userHandleEl = document.getElementById('userHandle');
  const pendingList = document.getElementById('pendingList');
  const recentList = document.getElementById('recentList');
  const pendingCountEl = document.getElementById('pendingCount');
  const countNumberEl = document.getElementById('countNumber');
  const glyph = document.getElementById('glyph');

  const modalBackdrop = document.getElementById('modalBackdrop');
  const openModalBtn = document.getElementById('openModalBtn');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const codeInput = document.getElementById('codeInput');
  const connectBtn = document.getElementById('connectBtn');
  const cameraBtn = document.getElementById('cameraBtn'); 
  const pasteBtn = document.getElementById('pasteBtn'); 
  const formView = document.getElementById('formView');
  const successView = document.getElementById('successView');
  const successName = document.getElementById('successName');

  // ---------- AUTH CHECK ----------
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  // ---------- HELPER FUNCTIONS ----------
  function updateIdentityUI(username, fullName) {
    const handle = username || 'user';
    const displayName = fullName || (handle !== 'user' ? handle.charAt(0).toUpperCase() + handle.slice(1) : 'User');

    if (userDisplayNameEl) userDisplayNameEl.textContent = displayName;
    if (userHandleEl) userHandleEl.textContent = `@${handle}`;
  }

  function animateCount(from, to, duration) {
    if (!countNumberEl) return;
    const start = performance.now();
    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const val = Math.round(from + (to - from) * eased);
      countNumberEl.textContent = val;
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // ---------- 1. FETCH USER PROFILE FROM DATABASE ----------
  async function fetchUserProfile() {
    try {
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        const userObj = result.data?.user || result.user || result.data || {};
        
        const username = userObj.username;
        const fullName = userObj.full_name || userObj.fullName || userObj.name;
        const dbHandshakeCount = userObj.handshakeCount ?? userObj.handshake_count ?? 0;

        updateIdentityUI(username, fullName);
        animateCount(0, dbHandshakeCount, 800);
      } else {
        localStorage.removeItem('token');
        window.location.href = 'login.html';
      }
    } catch (err) {
      console.error('Error connecting to DB profile endpoint:', err);
    }
  }

  // ---------- 2. FETCH DASHBOARD DATA ----------
  async function fetchDashboardData() {
    try {
      const response = await fetch('/api/handshakes', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        const data = result.data || result;
        
        renderPendingList(data.pending || []);
        renderRecentList(data.recent || []);
      }
    } catch (err) {
      console.error('Error fetching dashboard lists:', err);
    }
  }

  function renderPendingList(items) {
    if (!pendingList || !pendingCountEl) return;
    pendingList.innerHTML = '';
    pendingCountEl.textContent = items.length;

    if (items.length === 0) {
      pendingList.innerHTML = '<div class="empty-note">No pending requests right now.</div>';
      return;
    }

    items.forEach(p => {
      const row = document.createElement('div');
      row.className = 'row';
      row.dataset.id = p.id;
      const nameStr = p.full_name || p.name || p.username || 'User';
      const initials = nameStr.slice(0, 2).toUpperCase();
      
      row.innerHTML = `
        <div class="avatar">${initials}</div>
        <div class="row-info">
          <div class="row-name">${nameStr}</div>
          <div class="row-dept">${p.department || p.dept || 'Attendee'}</div>
        </div>
        <div class="row-actions">
          <button class="icon-btn reject" title="Decline"><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M1 1L13 13M13 1L1 13"/></svg></button>
          <button class="icon-btn accept" title="Accept"><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 7l3.5 3.5L12 3"/></svg></button>
        </div>
      `;
      pendingList.appendChild(row);

      row.querySelector('.reject').addEventListener('click', () => handlePendingAction(p.id, row, 'reject'));
      row.querySelector('.accept').addEventListener('click', () => handlePendingAction(p.id, row, 'accept'));
    });
  }

  async function handlePendingAction(id, rowEl, action) {
    rowEl.classList.add('leaving');
    try {
      const response = await fetch(`/api/handshakes/pending/${id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      if (response.ok) {
        setTimeout(() => { fetchUserProfile(); fetchDashboardData(); }, 400);
      } else {
        rowEl.classList.remove('leaving');
      }
    } catch (err) {
      rowEl.classList.remove('leaving');
    }
  }

  function renderRecentList(items) {
    if (!recentList) return;
    recentList.innerHTML = '';
    if (items.length === 0) {
      recentList.innerHTML = '<div class="empty-note">No recent handshakes yet.</div>';
      return;
    }

    items.forEach((r, i) => {
      const row = document.createElement('div');
      row.className = 'timeline-row';
      row.style.animationDelay = (i * 0.04) + 's';
      row.innerHTML = `
        <div class="check"><svg viewBox="0 0 12 12" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6.5l2.5 2.5L10 3"/></svg></div>
        <div class="timeline-info">
          <div class="timeline-name">${r.full_name || r.name || r.username}</div>
          <div class="timeline-meta">${r.department || r.dept || 'Attendee'}</div>
        </div>
        <div class="timeline-when">${r.when || r.time || 'Recently'}</div>
      `;
      recentList.appendChild(row);
    });
  }

  // ---------- 3. MODAL LOGIC ----------
  function openModal() {
    if (!modalBackdrop) return;
    modalBackdrop.classList.add('open');
    if (formView) formView.classList.remove('hide');
    if (successView) successView.classList.remove('show');
    
    // Reset Modal Title
    const titleEl = document.querySelector('.modal h3, #modalTitle');
    if (titleEl) titleEl.textContent = 'Enter Handshake Code';

    if (codeInput) {
      codeInput.value = '';
      codeInput.placeholder = "HS-4821";
      codeInput.readOnly = false;
      setTimeout(() => codeInput.focus(), 380);
    }
    if (connectBtn) {
      connectBtn.disabled = true;
      connectBtn.textContent = 'Connect';
    }
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    if (!modalBackdrop) return;
    modalBackdrop.classList.remove('open');
    document.body.style.overflow = '';
    if (glyph) glyph.classList.remove('linked');
  }

  if (openModalBtn) openModalBtn.addEventListener('click', openModal);
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
  if (modalBackdrop) modalBackdrop.addEventListener('click', (e) => { if (e.target === modalBackdrop) closeModal(); });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalBackdrop && modalBackdrop.classList.contains('open')) closeModal();
  });

  if (codeInput && connectBtn) {
    codeInput.addEventListener('input', () => {
      codeInput.value = codeInput.value.toUpperCase();
      connectBtn.disabled = codeInput.value.trim().length < 4;
    });
  }

  // CLIPBOARD PASTE BUTTON
  if (pasteBtn && codeInput) {
    pasteBtn.addEventListener('click', async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          codeInput.value = text.toUpperCase().trim();
          if (connectBtn) connectBtn.disabled = codeInput.value.length < 4;
          codeInput.focus();
        }
      } catch (err) {
        console.log('Clipboard paste unavailable');
      }
    });
  }

  // CODE GENERATOR BUTTON (Repurposed Camera Button)
  if (cameraBtn && codeInput) {
    cameraBtn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4m-4.93-7.07l-2.83 2.83m-8.48 8.48l-2.83 2.83"/></svg>`;
    cameraBtn.title = "Generate your shareable code";

    cameraBtn.addEventListener('click', async () => {
      cameraBtn.style.color = 'var(--accent)';
      
      try {
        const response = await fetch('/api/handshakes/generate-code', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });

        const result = await response.json();

        if (response.ok && result.success && result.data?.code) {
          codeInput.readOnly = true; 
          codeInput.value = result.data.code;
          
          const titleEl = document.querySelector('.modal h3, #modalTitle');
          if (titleEl) titleEl.textContent = 'Your Active Handshake Code';

          if (connectBtn) {
            connectBtn.disabled = false;
            connectBtn.textContent = 'Code Active (Valid 45s)';
          }
        } else {
          alert('Could not generate handshake code.');
        }
      } catch (err) {
        alert('Server error generating code.');
      } finally {
        setTimeout(() => { cameraBtn.style.color = ''; }, 500);
      }
    });
  }

  if (connectBtn) {
    connectBtn.addEventListener('click', async () => {
      if (codeInput.readOnly) return; 

      if (connectBtn.disabled) return;
      const code = codeInput.value.trim();
      
      connectBtn.disabled = true;
      connectBtn.textContent = 'Connecting…';
      if (glyph) glyph.classList.add('linked');

      try {
        const response = await fetch('/api/handshakes/connect', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ code })
        });

        const result = await response.json();

        if (response.ok && result.success) {
          const connectedUser = result.data?.full_name || result.data?.name || result.data?.username || 'Attendee';

          if (formView) formView.classList.add('hide');
          if (successView) successView.classList.add('show');
          if (successName) successName.textContent = `Connected with ${connectedUser}`;

          fetchUserProfile();
          fetchDashboardData();

          setTimeout(() => { closeModal(); }, 1500);
        } else {
          alert(result.message || 'Invalid Handshake Code or connection failed.');
          connectBtn.disabled = false;
          connectBtn.textContent = 'Connect';
          if (glyph) glyph.classList.remove('linked');
        }
      } catch (err) {
        alert('Could not reach backend database.');
        connectBtn.disabled = false;
        connectBtn.textContent = 'Connect';
        if (glyph) glyph.classList.remove('linked');
      }
    });
  }

  // ---------- INITIALIZATION ----------
  await fetchUserProfile();
  await fetchDashboardData();

  // Auto-poll for pending requests every 10 seconds
  setInterval(fetchDashboardData, 10000);
});
