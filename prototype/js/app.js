/* InnocenZ MVP v3 — interactive prototype wired to InnocenZ_MVP_v3_Final.xlsx */
(function () {
  'use strict';

  var root, screenEl;
  var STORAGE_KEY = 'innocenz_mvp_v3';

  var ROLE_META = {
    pr: { label: 'PR Personnel', color: '#ecd9a4', home: 'pr-home' },
    agency: { label: 'PR Agency', color: '#67e8f9', home: 'agency-home' },
    outlet: { label: 'Outlet', color: '#4ade80', home: 'outlet-home' }
  };

  function defaultState() {
    return {
      role: 'pr',
      profileStatus: 'active',
      prType: 'agency',
      userName: 'Maya Tan',
      shift: {
        venue: 'Velvet 23',
        accepted: false,
        checkedIn: false,
        checkedOut: false,
        sealed: false,
        drinks: 0,
        tables: 0,
        liveEarnings: 0,
        baseWage: 320
      },
      job: { headcount: 5, filled: 1, language: 'Mandarin', eventType: 'VIP' },
      pv: {
        id: '01872',
        status: 'SENT',
        venue: 'Velvet 23',
        wages: 320,
        drinks: 140,
        tables: 95,
        tips: 60,
        signed: false,
        disputed: false
      },
      wallet: { balance: 1284.5, pending: 615 },
      pendingPRs: [
        { id: 'p1', name: 'Siti Rahman', langs: 'EN', status: 'pending' },
        { id: 'p2', name: 'Chen Wei', langs: 'EN · 中文', status: 'pending' }
      ],
      ratingDone: false,
      platformFee: 0.05,
      geofenceM: 50
    };
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return Object.assign(defaultState(), JSON.parse(raw));
    } catch (e) { /* ignore */ }
    return defaultState();
  }

  var izState = loadState();

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(izState)); } catch (e) { /* ignore */ }
  }

  function pvTotal() {
    var p = izState.pv;
    return p.wages + p.drinks + p.tables + p.tips;
  }

  function fmt(n) { return 'RM ' + (Math.round(n * 100) / 100).toFixed(2).replace(/\.00$/, ''); }

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  /* ---------- boot ---------- */
  root = document.getElementById('iz-root');
  root.innerHTML =
    '<div class="iz-head">' +
      '<h1>InnocenZ — MVP Prototype</h1>' +
      '<p>Wired to InnocenZ_MVP_v3_Final · Modules 1–9</p>' +
      '<div class="tip">✦ Pick a role, then tap through each module flow</div>' +
    '</div>' +
    '<div class="phone"><div class="notch"></div><div class="screen" id="iz-screen"></div></div>';

  screenEl = document.getElementById('iz-screen');

  /* ---------- navigation ---------- */
  window.izGo = function (name) {
    var fn = views[name] || views.welcome;
    var html;
    try {
      html = '<div class="view">' + fn() + '</div>';
    } catch (e) {
      html = '<div class="view"><div class="scroll"><div class="card" style="margin-top:40px">' +
        '<div class="eyebrow" style="color:#f43f5e">RENDER ERROR</div>' +
        '<div class="muted" style="margin-top:8px">' + esc(String(e)) + '</div></div></div></div>';
    }
    screenEl.innerHTML = html;
    bind(name);
    var sc = screenEl.querySelector('.scroll');
    if (sc) sc.scrollTop = 0;
  };

  window.izToast = function (msg) {
    var t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = '<div class="ti">✓</div><div style="font-size:13px">' + esc(msg) + '</div>';
    screenEl.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('show'); });
    setTimeout(function () {
      t.classList.remove('show');
      setTimeout(function () { t.remove(); }, 400);
    }, 2400);
  };

  window.izSetRole = function (key) {
    izState.role = key;
    saveState();
  };

  window.izContinue = function () {
    var sel = screenEl.querySelector('.role.sel');
    if (sel && sel.dataset.role) izState.role = sel.dataset.role;
    saveState();
    izGo('signin');
  };

  window.izVerify = function () {
    var home = ROLE_META[izState.role] ? ROLE_META[izState.role].home : 'pr-home';
    if (izState.role === 'pr' && izState.profileStatus === 'pending') {
      izToast('Account pending — Agency must approve before shifts unlock');
      izGo('pr-pending');
      return;
    }
    izToast('Signed in as ' + ROLE_META[izState.role].label);
    izGo(home);
  };

  window.izSimPending = function () {
    izState.profileStatus = 'pending';
    saveState();
    izGo('pr-pending');
  };

  window.izApprovePR = function (id) {
    izState.pendingPRs = izState.pendingPRs.map(function (p) {
      return p.id === id ? Object.assign({}, p, { status: 'approved' }) : p;
    });
    saveState();
    izToast('PR approved — status ACTIVE, shift board unlocked');
    izGo('agency-pending');
  };

  window.izRejectPR = function (id) {
    izState.pendingPRs = izState.pendingPRs.filter(function (p) { return p.id !== id; });
    saveState();
    izToast('PR rejected — notification sent');
    izGo('agency-pending');
  };

  window.izPostJob = function () {
    var hc = parseInt((document.getElementById('jobHeadcount') || {}).value, 10) || 5;
    izState.job.headcount = hc;
    izState.job.filled = 0;
    saveState();
    izToast('Job order broadcast — ' + hc + ' slots, cost estimate incl. 5% fee');
    izGo('outlet-home');
  };

  window.izNeutralCalc = function () {
    var hc = parseFloat((document.getElementById('nmHeadcount') || {}).value) || 5;
    var hrs = parseFloat((document.getElementById('nmHours') || {}).value) || 6;
    var rate = parseFloat((document.getElementById('nmRate') || {}).value) || 30;
    var sub = hc * hrs * rate;
    var total = sub * (1 + izState.platformFee);
    var el = document.getElementById('nmResult');
    if (el) {
      el.innerHTML = li('Subtotal', fmt(sub)) + li('Platform fee (5%)', fmt(sub * izState.platformFee)) +
        '<div class="li total"><span class="k">Estimate</span><span class="v">' + fmt(total) + '</span></div>';
    }
    izToast('Neutral Mode — client-side only, not saved to DB');
  };

  window.izAccept = function () {
    if (izState.profileStatus !== 'active') {
      izToast('Cannot accept — profile not ACTIVE');
      return;
    }
    if (izState.prType === 'agency' && !izState.shift.accepted) {
      izToast('Agency approval simulated — shift locked');
    }
    izState.shift.accepted = true;
    saveState();
    izToast('Shift accepted — reminders set T-24h & T-2h');
    setTimeout(function () { izGo('shift'); }, 800);
  };

  window.izCheckIn = function () {
    izState.shift.checkedIn = true;
    izState.shift.liveEarnings = 0;
    saveState();
    izToast('Check-in OK — GPS ≤' + izState.geofenceM + 'm, selfie stored, Time-In locked');
    izGo('shift');
  };

  window.izCheckOut = function () {
    if (!izState.shift.checkedIn) {
      izToast('Check-in required first');
      return;
    }
    izState.shift.checkedOut = true;
    saveState();
    izToast('Check-out captured — shift hours calculated for payroll');
    izGo('shift');
  };

  window.izTally = function (type) {
    if (!izState.shift.checkedIn) {
      izToast('PR must be checked in before sales logging');
      return;
    }
    if (type === 'drink') {
      izState.shift.drinks++;
      izState.shift.liveEarnings += 12;
    } else {
      izState.shift.tables++;
      izState.shift.liveEarnings += 25;
    }
    saveState();
    izToast('+1 ' + (type === 'drink' ? 'Drink' : 'Table') + ' logged');
    izGo(screenEl.dataset.view === 'outlet-ops' ? 'outlet-ops' : 'shift');
  };

  window.izSealShift = function () {
    izState.shift.sealed = true;
    izState.pv.status = 'SENT';
    izState.pv.signed = false;
    izState.pv.disputed = false;
    saveState();
    izToast('Shift SEALED — immutable. PV auto-sent to PR.');
    setTimeout(function () { izGo('outlet-home'); }, 900);
  };

  window.izSignPV = function () {
    if (izState.pv.disputed) {
      izToast('Resolve dispute before signing');
      return;
    }
    izState.pv.signed = true;
    izState.pv.status = 'SIGNED';
    izState.wallet.balance += pvTotal();
    izState.wallet.pending = 0;
    saveState();
    izToast('PV signed — Golden Audit passed, wallet credited ' + fmt(pvTotal()));
    setTimeout(function () { izGo('wallet'); }, 900);
  };

  window.izDisputePV = function () {
    izState.pv.disputed = true;
    izState.pv.status = 'DISPUTED';
    saveState();
    izToast('Dispute opened — payment HELD, agency notified (7-day SLA)');
    izGo('pv');
  };

  window.izWithdraw = function () {
    if (!izState.pv.signed) {
      izToast('Withdraw blocked — sign PV first (Module 6 rule)');
      return;
    }
    izToast('Withdrawal queued via FPX / DuitNow — T+1 business day');
  };

  window.izSOS = function () {
    izToast('SOS CRITICAL — GPS stream to Agency, contacts alerted');
  };

  window.izRate = function () {
    izState.ratingDone = true;
    saveState();
    izToast('Ratings submitted — reputation scores updated');
    izGo(izState.role === 'pr' ? 'pr-home' : 'outlet-home');
  };

  window.izSignOut = function () {
    izGo('welcome');
  };

  function bind(name) {
    screenEl.dataset.view = name;
    if (name === 'welcome') {
      screenEl.querySelectorAll('.role').forEach(function (r) {
        r.onclick = function () {
          screenEl.querySelectorAll('.role').forEach(function (x) { x.classList.remove('sel'); });
          r.classList.add('sel');
          if (r.dataset.role) izState.role = r.dataset.role;
          saveState();
        };
      });
      var pre = screenEl.querySelector('.role[data-role="' + izState.role + '"]');
      if (pre) pre.classList.add('sel');
    }
  }

  function topbar(back, title, right) {
    return '<div class="topbar">' +
      (back ? '<button class="back" onclick="izGo(\'' + back + '\')">‹</button>' : '<div style="width:36px"></div>') +
      '<div class="logo" style="font-size:16px">' + title + '</div>' +
      (right || '<div style="width:36px"></div>') +
      '</div>';
  }

  function modCard(ico, title, desc, go, tag) {
    return '<div class="card mod-card" onclick="izGo(\'' + go + '\')">' +
      '<div class="row"><div><span class="mod-ico">' + ico + '</span>' +
      '<div style="font-weight:600;margin-top:6px">' + title + '</div>' +
      '<div class="muted" style="margin-top:4px;font-size:12px">' + desc + '</div></div>' +
      (tag ? '<span class="badge vip">' + tag + '</span>' : '<span class="faint">→</span>') +
      '</div></div>';
  }

  function statusPill(text, kind) {
    return '<span class="badge ' + (kind || 'star') + '">' + text + '</span>';
  }

  function roleCard(ico, name, desc, key, center) {
    var sel = izState.role === key ? ' sel' : '';
    return '<div class="role' + sel + (center ? ' role-center' : '') + '" data-role="' + key + '">' +
      '<div class="arrow">→</div><div class="ico">' + ico + '</div>' +
      '<div class="rname">' + name + '</div><div class="rdesc">' + desc + '</div></div>';
  }

  function shiftCard(venue, loc, time, rate, star, vip, act) {
    return '<div class="card shift neon">' +
      '<div class="row"><div><div class="venue">' + venue + '</div><div class="loc">📍 ' + loc + '</div></div>' +
      '<div style="text-align:right"><div class="rate">RM ' + rate + '</div><div class="faint">+ tips</div></div></div>' +
      '<div class="time" style="margin-top:8px">🕙 ' + time + ' <span class="badge star">★ ' + star + '</span> ' +
      (vip ? '<span class="badge vip">VIP</span>' : '') + '</div>' +
      '<button class="btn ' + (act === 'accept' ? 'btn-gold' : 'btn-ghost') + ' btn-sm" style="width:100%;margin-top:13px" onclick="izGo(\'detail\')">' +
      (act === 'accept' ? 'Accept Shift' : 'View Details') + '</button></div>';
  }

  function tile(lbl, val, size, color) {
    var st = 'font-size:' + (size || '24px') + ';' + (color ? 'color:' + color + ';' : '');
    return '<div class="tile"><div class="t-lbl">' + lbl + '</div><div class="t-val" style="' + st + '">' + val + '</div></div>';
  }

  function li(k, v) {
    return '<div class="li"><span class="k">' + k + '</span><span class="v">' + v + '</span></div>';
  }

  /* ---------- views ---------- */
  var views = {
    welcome: function () {
      return '<div class="scroll center" style="text-align:center">' +
        '<div class="brand"><div class="logo-mark">Z</div><div class="logo logo-lg">InnocenZ</div>' +
        '<div class="tagline">CONNECT · ENGAGE · ENTERTAIN</div></div>' +
        '<div class="h2" style="margin-top:28px">Welcome to <span class="gold">InnocenZ</span></div>' +
        '<div class="muted" style="margin-top:8px;padding:0 14px">MVP v3 — choose your portal (Admin is on a separate URL per spec).</div>' +
        '<div class="role-grid" style="margin-top:22px;text-align:left">' +
        roleCard('👥', 'PR Personnel', 'Shifts · check-in · wallet · PV · SOS', 'pr', false) +
        roleCard('🏛️', 'PR Agency', 'Approve PRs · roster · PV · payroll', 'agency', false) +
        roleCard('🍸', 'Outlet', 'Job orders · sales · seal shift', 'outlet', true) +
        '</div>' +
        '<div style="margin-top:20px"><button class="btn btn-violet" onclick="izContinue()">Continue →</button></div>' +
        '<div class="divider">or</div>' +
        '<div style="display:flex;gap:11px">' +
        '<button class="btn btn-ghost" onclick="izContinue()">Sign In</button>' +
        '<button class="btn btn-ghost" onclick="izContinue()">Create Account</button>' +
        '</div></div>';
    },

    signin: function () {
      var meta = ROLE_META[izState.role] || ROLE_META.pr;
      return topbar('welcome', 'Sign In', '') +
        '<div class="scroll center">' +
        '<div class="eyebrow" style="color:' + meta.color + '">' + meta.label.toUpperCase() + '</div>' +
        '<div class="h2" style="margin-top:8px">Sign in</div>' +
        '<div class="muted" style="margin-top:8px">Phone OTP verification (Module 1)</div>' +
        '<div style="margin-top:22px"><input class="input" value="+60 12-987 6543" readonly/>' +
        '<input class="input" value="• • • • • •" readonly/></div>' +
        '<button class="btn btn-violet" onclick="izVerify()">Verify &amp; Enter →</button>' +
        (izState.role === 'pr'
          ? '<button class="btn btn-ghost" style="margin-top:10px" onclick="izSimPending()">Demo: Pending Review</button>'
          : '') +
        '<div class="card" style="margin-top:20px"><div class="faint" style="line-height:1.55">' +
        '<span class="gold">Module 1 —</span> IC unique key · PDA consent · RBAC by role. Outlet cannot pay PR directly.</div></div></div>';
    },

    'pr-pending': function () {
      return topbar('signin', 'Pending Review', '') +
        '<div class="scroll center" style="text-align:center">' +
        '<div style="font-size:48px;margin-top:20px">⏳</div>' +
        '<div class="h3" style="margin-top:14px">Pending Agency Approval</div>' +
        '<div class="muted" style="margin-top:10px;padding:0 20px">Status: PENDING_REVIEW. Shift board locked until Agency approves (Module 1).</div>' +
        '<button class="btn btn-violet" style="margin-top:24px" onclick="izState.profileStatus=\'active\';saveState();izToast(\'Approved (demo)\');izGo(\'pr-home\')">Simulate Approval</button>' +
        '</div>';
    },

    'pr-home': function () {
      var s = izState.shift;
      return topbar('welcome', 'PR Portal', '<div class="av" onclick="izGo(\'profile\')">M</div>') +
        '<div class="scroll">' +
        '<div class="card neon"><div class="eyebrow">MODULE HUB · PR PERSONNEL</div>' +
        '<div class="muted" style="margin-top:6px">E2E: accept → check-in → earn → seal → sign PV → withdraw</div>' +
        statusPill(izState.profileStatus.toUpperCase(), izState.profileStatus === 'active' ? 'star' : 'vip') +
        '</div>' +
        modCard('◈', 'Shifts (Module 2)', 'Browse nearby · accept · VIP priority', 'home', s.accepted ? '1 active' : '') +
        modCard('◎', 'Attendance (Module 4)', 'Geo check-in ≤50m · Time-out · live earnings', 'shift', s.checkedIn ? 'ON DUTY' : '') +
        modCard('◇', 'Wallet & PV (Modules 6–7)', 'Sign PV before withdraw · 4-part breakdown', 'wallet', izState.pv.signed ? '' : 'PV due') +
        modCard('⚠', 'SOS & Safety (Module 5)', 'Panic · incident report · ratings', 'sos', '') +
        (s.sealed && !izState.ratingDone ? modCard('★', 'Rate Shift', 'Mutual 1–5★ within 24h', 'rating', 'New') : '') +
        '</div>';
    },

    home: function () {
      if (izState.profileStatus !== 'active') return views['pr-pending']();
      return topbar('pr-home', 'Shifts', '<div class="av" onclick="izGo(\'profile\')">M</div>') +
        '<div class="scroll">' +
        '<div class="seg"><button class="on">Nearby</button><button>Top Paid</button><button>VIP</button></div>' +
        shiftCard('Velvet 23', 'Bukit Bintang · 1.2km', '22:00 — 04:00', '320', '4.9', true, 'accept') +
        shiftCard('Onyx KL', 'TREC · 3.4km', '23:00 — 05:00', '280', '4.7', false, 'view') +
        '<div class="card"><div class="eyebrow">MATCHING (Module 2)</div>' +
        '<div class="muted" style="margin-top:6px">Language + rating + conflict check. Cancel &lt;2h = penalty. No direct outlet→PR pay.</div></div></div>';
    },

    detail: function () {
      return topbar('home', 'Shift Details', '') +
        '<div class="scroll">' +
        '<div class="card neon"><div class="venue" style="font-size:22px">Velvet 23</div>' +
        '<div class="loc">📍 Bukit Bintang · VIP Request</div>' +
        '<div class="tiles" style="margin-top:14px">' +
        tile('Base', 'RM 320', '20px') + tile('Est. total', 'RM 520+', '18px', 'var(--gold-bright)') +
        '</div></div>' +
        '<div class="card" style="margin-top:12px">' + li('Drink comm. (est.)', 'RM 120') + li('Table comm. (est.)', 'RM 80') +
        '</div>' +
        '<button class="btn btn-gold" style="margin-top:14px" onclick="izAccept()">Accept Shift →</button></div>';
    },

    shift: function () {
      var s = izState.shift;
      var ringClass = s.checkedIn ? 'ring done' : 'ring';
      var ringLbl = s.checkedOut ? 'Shift complete' : (s.checkedIn ? s.venue : 'Tap to Check-In');
      var ringSub = s.checkedOut ? 'Time-Out locked' : (s.checkedIn ? 'ON DUTY · GPS live' : 'GPS ≤ ' + izState.geofenceM + 'm');
      return topbar('pr-home', 'During Shift', '<span class="pill"><span class="live-dot"></span> Live</span>') +
        '<div class="scroll">' +
        '<div class="ring-wrap"><div class="' + ringClass + '" onclick="' + (s.checkedOut ? '' : 'izCheckIn()') + '">' +
        '<div class="ico">' + (s.checkedIn ? '✓' : '◎') + '</div><div class="lbl">' + ringLbl + '</div><div class="sub">' + ringSub + '</div></div></div>' +
        (s.checkedIn && !s.checkedOut
          ? '<button class="btn btn-ghost" onclick="izCheckOut()">Check-Out (Time-Out) →</button>'
          : '') +
        '<div class="tiles" style="margin-top:14px">' +
        tile('Live earnings', fmt(s.liveEarnings || 0), '22px', 'var(--green)') +
        tile('Sales logged', s.drinks + ' drinks · ' + s.tables + ' tables', '14px') +
        '</div>' +
        '<div class="card" style="margin-top:12px"><div class="eyebrow">QUICK ACTIONS</div>' +
        '<div style="display:flex;gap:10px;margin-top:10px">' +
        '<button class="btn btn-ghost btn-sm" style="flex:1" onclick="izGo(\'wallet\')">Wallet</button>' +
        '<button class="btn btn-danger btn-sm" style="flex:1" onclick="izGo(\'sos\')">SOS</button></div></div></div>';
    },

    wallet: function () {
      var w = izState.wallet;
      var p = izState.pv;
      return topbar('pr-home', 'Wallet', '') +
        '<div class="scroll">' +
        '<div class="card neon"><div class="faint">AVAILABLE</div>' +
        '<div style="font-family:var(--serif);font-size:36px;font-weight:700;margin-top:4px">' + fmt(w.balance) + '</div>' +
        '<div style="display:flex;gap:10px;margin-top:14px">' +
        '<button class="btn btn-violet btn-sm" style="flex:1" onclick="izToast(\'Top-up via FPX\')">Top Up</button>' +
        '<button class="btn btn-gold btn-sm" style="flex:1" onclick="izWithdraw()">Withdraw</button></div></div>' +
        '<div class="tiles" style="margin-top:12px">' +
        tile('Pending PV', p.signed ? '—' : fmt(pvTotal()), '18px', 'var(--gold-bright)') +
        tile('PV status', p.status, '14px') +
        '</div>' +
        (p.status !== 'SIGNED'
          ? '<div class="card" style="margin-top:12px;background:rgba(201,168,106,.1)">' +
            '<div class="eyebrow" style="color:var(--gold)">ACTION</div>' +
            '<div style="font-weight:600;margin-top:6px">Payment Voucher #' + p.id + '</div>' +
            '<button class="btn btn-gold btn-sm" style="width:100%;margin-top:12px" onclick="izGo(\'pv\')">Review &amp; Sign PV →</button></div>'
          : '') +
        '<div class="card" style="margin-top:12px"><div class="faint">Module 6: withdraw only after PV signed. Dispute blocks sign.</div></div></div>';
    },

    pv: function () {
      var p = izState.pv;
      var total = pvTotal();
      return topbar('wallet', 'Payment Voucher', '') +
        '<div class="scroll">' +
        '<div class="card neon"><div class="eyebrow">PV #' + p.id + ' · ' + p.status + '</div>' +
        '<div class="h3" style="margin-top:6px">' + p.venue + '</div>' +
        li('(1) Daily wages', fmt(p.wages)) +
        li('(2) Drink commission', fmt(p.drinks)) +
        li('(3) Table commission', fmt(p.tables)) +
        li('(4) Tips', fmt(p.tips)) +
        '<div class="li total"><span class="k">Total</span><span class="v">' + fmt(total) + '</span></div></div>' +
        '<div class="card" style="margin-top:12px"><div class="faint">Module 7: sign only after disputes resolved. Golden Audit runs on seal (Module 8).</div></div>' +
        (p.signed
          ? '<div class="card" style="margin-top:12px;text-align:center;color:var(--green)">✓ Signed &amp; immutable</div>'
          : '<div style="margin-top:14px;display:flex;flex-direction:column;gap:10px">' +
            '<button class="btn btn-gold" onclick="izSignPV()">✓ Sign &amp; Confirm</button>' +
            '<button class="btn btn-ghost" onclick="izDisputePV()">⚠ Raise Dispute</button></div>') +
        '</div>';
    },

    sos: function () {
      return topbar('pr-home', 'SOS & Safety', '') +
        '<div class="scroll" style="text-align:center">' +
        '<div class="muted">Module 5 — bypasses lock screen</div>' +
        '<div class="card" style="margin-top:16px;border-color:rgba(244,63,94,.4)">' +
        '<button onclick="izSOS()" style="width:110px;height:110px;border-radius:50%;border:none;cursor:pointer;margin:8px auto 0;font-family:var(--serif);font-size:24px;font-weight:700;color:#fff;background:linear-gradient(120deg,#fb7185,#e11d48)">SOS</button>' +
        '<div style="font-weight:600;margin-top:12px">Emergency</div></div>' +
        modCard('📄', 'Incident Report', 'Immutable once filed', 'sos', '') +
        modCard('★', 'Post-Shift Rating', 'Mutual 1–5★', 'rating', '') +
        '</div>';
    },

    rating: function () {
      return topbar('pr-home', 'Ratings', '') +
        '<div class="scroll"><div class="muted">Rate outlet (Module 5) — permanent, affects matching</div>' +
        '<div class="card" style="margin-top:14px;text-align:center"><div class="star-row" style="font-size:28px">★★★★★</div>' +
        '<div class="faint" style="margin-top:8px">Working environment · payment reliability</div></div>' +
        '<button class="btn btn-gold" style="margin-top:16px" onclick="izRate()">Submit Rating</button></div>';
    },

    profile: function () {
      return topbar('pr-home', 'Profile', '') +
        '<div class="scroll" style="text-align:center">' +
        '<div class="prof-pic">M</div><div class="h3" style="margin-top:12px">' + izState.userName + '</div>' +
        '<div class="faint">PR · ' + (izState.prType === 'agency' ? 'Agency-Tied' : 'Freelance') + '</div>' +
        '<div class="card" style="margin-top:16px;text-align:left">' +
        li('IC Verified', '✓') + li('PDA Consent', '✓') + li('Languages', 'EN · 中文 · 粤语') +
        '</div><button class="btn btn-ghost" style="margin-top:16px" onclick="izSignOut()">Sign Out</button></div>';
    },

    'agency-home': function () {
      var pending = izState.pendingPRs.filter(function (p) { return p.status === 'pending'; }).length;
      return topbar('welcome', 'Agency Portal', '') +
        '<div class="scroll">' +
        '<div class="card neon"><div class="eyebrow">MODULE HUB · PR AGENCY</div>' +
        '<div class="muted" style="margin-top:6px">Owner / Finance sub-roles (Module 1)</div></div>' +
        modCard('👥', 'Approve PR Sign-ups', 'Pending: ' + pending, 'agency-pending', pending ? String(pending) : '') +
        modCard('📅', 'Schedule & Roster', 'Assign PRs · conflict check (Module 2)', 'agency-roster', '') +
        modCard('🧾', 'Payment Vouchers', 'Raise PV · 4-part breakdown (Module 7)', 'agency-pv', izState.pv.status) +
        modCard('📊', 'Payroll & Reports', 'Revenue · collections (Module 6)', 'agency-reports', '') +
        '</div>';
    },

    'agency-pending': function () {
      var list = izState.pendingPRs.map(function (p) {
        if (p.status !== 'pending') return '';
        return '<div class="card" style="margin-top:10px"><div class="row"><div><div style="font-weight:600">' +
          esc(p.name) + '</div><div class="faint">' + esc(p.langs) + '</div></div></div>' +
          '<div style="display:flex;gap:10px;margin-top:12px">' +
          '<button class="btn btn-gold btn-sm" style="flex:1" onclick="izApprovePR(\'' + p.id + '\')">Approve</button>' +
          '<button class="btn btn-ghost btn-sm" style="flex:1" onclick="izRejectPR(\'' + p.id + '\')">Reject</button></div></div>';
      }).join('');
      return topbar('agency-home', 'Pending PRs', '') +
        '<div class="scroll"><div class="muted">Only Agency approves PR onboarding (Module 1)</div>' + list +
        (list ? '' : '<div class="card" style="margin-top:14px;text-align:center">No pending PRs</div>') +
        '</div>';
    },

    'agency-roster': function () {
      return topbar('agency-home', 'Roster', '') +
        '<div class="scroll"><div class="card"><div class="eyebrow">LIVE STATUS</div>' +
        li('Maya Tan · Velvet 23', izState.shift.checkedIn ? 'ON DUTY' : 'EN ROUTE') +
        li('Chen Wei · Onyx KL', 'EN ROUTE') +
        '</div><div class="faint" style="margin-top:12px">Module 4: map view · no-show alert at +30min</div></div>';
    },

    'agency-pv': function () {
      return topbar('agency-home', 'PV Management', '') +
        '<div class="scroll"><div class="card neon"><div class="eyebrow">PV #' + izState.pv.id + '</div>' +
        '<div class="muted" style="margin-top:6px">Status: ' + izState.pv.status + ' · ' + izState.shift.venue + '</div>' +
        '<div class="li total" style="margin-top:12px"><span class="k">Total</span><span class="v">' + fmt(pvTotal()) + '</span></div>' +
        '<button class="btn btn-violet btn-sm" style="width:100%;margin-top:14px" onclick="izToast(\'PV sent to PR for e-sign\')">Send to PR →</button></div>' +
        '<div class="card" style="margin-top:12px"><div class="faint">Agency Net = Gross − 5% platform − PR wages (Module 3)</div></div></div>';
    },

    'agency-reports': function () {
      return topbar('agency-home', 'Analytics', '') +
        '<div class="scroll"><div class="tiles">' +
        tile('Net profit (mo)', 'RM 12.4k', '22px', 'var(--green)') +
        tile('No-show rate', '4.2%', '22px') +
        '</div><div class="card" style="margin-top:12px"><div class="eyebrow">Module 6</div>' +
        '<div class="muted" style="margin-top:6px">Auto reports: 15th, 28th, month-end. Finance sub-role: payroll + PV only.</div></div></div>';
    },

    'outlet-home': function () {
      var j = izState.job;
      return topbar('welcome', 'Outlet Portal', '') +
        '<div class="scroll">' +
        '<div class="card neon"><div class="eyebrow">MODULE HUB · OUTLET</div>' +
        '<div class="muted" style="margin-top:6px">Owner / Finance / Ops Head (same permissions)</div></div>' +
        modCard('📋', 'New PR Request', 'Module 2 · headcount · language · VIP', 'outlet-booking', j.filled + '/' + j.headcount) +
        modCard('🧮', 'Neutral Mode', 'Cost simulator — not saved to DB', 'outlet-neutral', '') +
        modCard('🍸', 'Shift Operations', '+Drink / +Table · seal shift', 'outlet-ops', izState.shift.sealed ? 'SEALED' : 'Live') +
        modCard('📊', 'Spend Report', 'Own outlet only (Module 6)', 'outlet-reports', '') +
        '</div>';
    },

    'outlet-booking': function () {
      return topbar('outlet-home', 'New PR Request', '') +
        '<div class="scroll"><div class="muted">Module 2 — broadcasts to matching PRs</div>' +
        '<label class="faint">Headcount</label><input class="input" id="jobHeadcount" type="number" value="' + izState.job.headcount + '"/>' +
        '<label class="faint">Language</label><input class="input" value="Mandarin / English"/>' +
        '<label class="faint">Event</label><input class="input" value="VIP Private"/>' +
        '<div class="card" style="margin-top:8px">' + li('Est. cost (×1.05 fee)', fmt(5 * 6 * 30 * 1.05)) + '</div>' +
        '<button class="btn btn-gold" style="margin-top:14px" onclick="izPostJob()">Post Job Order →</button></div>';
    },

    'outlet-neutral': function () {
      return topbar('outlet-home', 'Neutral Mode', '') +
        '<div class="scroll"><div class="muted">Module 3 — client-side dry run only</div>' +
        '<input class="input" id="nmHeadcount" type="number" value="5" placeholder="Headcount"/>' +
        '<input class="input" id="nmHours" type="number" value="6" placeholder="Hours"/>' +
        '<input class="input" id="nmRate" type="number" value="30" placeholder="Hourly rate (RM)"/>' +
        '<button class="btn btn-violet" onclick="izNeutralCalc()">Calculate →</button>' +
        '<div class="card" id="nmResult" style="margin-top:14px"></div></div>';
    },

    'outlet-ops': function () {
      var s = izState.shift;
      return topbar('outlet-home', 'Shift Ops', '') +
        '<div class="scroll"><div class="card"><div class="eyebrow">LIVE SALES · Module 4</div>' +
        '<div class="muted" style="margin-top:6px">' + s.drinks + ' drinks · ' + s.tables + ' tables</div>' +
        '<div style="display:flex;gap:10px;margin-top:14px">' +
        '<button class="btn btn-violet btn-sm" style="flex:1" onclick="izTally(\'drink\')">+1 Drink</button>' +
        '<button class="btn btn-gold btn-sm" style="flex:1" onclick="izTally(\'table\')">+1 Table</button></div></div>' +
        (s.sealed
          ? '<div class="card" style="margin-top:12px;color:var(--green)">✓ Shift SEALED — immutable</div>'
          : '<button class="btn btn-gold" style="margin-top:14px" onclick="izSealShift()">End Shift &amp; Seal →</button>') +
        '<div class="faint" style="margin-top:10px">Payment: Outlet → Agency → PR only</div></div>';
    },

    'outlet-reports': function () {
      return topbar('outlet-home', 'Spend Report', '') +
        '<div class="scroll"><div class="tiles">' +
        tile('Manpower spend', 'RM 18.2k', '20px') + tile('Utilisation', '87%', '20px', 'var(--green)') +
        '</div><div class="card" style="margin-top:12px"><div class="faint">No cross-outlet visibility (Module 6)</div></div></div>';
    }
  };

  izGo('welcome');
})();
