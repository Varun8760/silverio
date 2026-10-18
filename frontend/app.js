const app = document.getElementById('app');
const state = { user: null, token: null, page: 'dashboard' };

const NAV_ITEMS = [
    ['dashboard', 'Dashboard'], ['orders', 'Orders'], ['stock', 'Sheet / Raw Stock'],
    ['colourStock', 'Colour Stock'], ['delivery', 'Delivery'], ['accounts', 'Accounts'],
    ['complaints', 'Complaints & Replacements'], ['mistakes', 'Mistakes'],
    ['reports', 'Reports'], ['staff', 'Staff & Permissions']
];
const ALL_STAFF_PAGES = ['dashboard', 'orders', 'stock', 'colourStock', 'delivery', 'accounts'];
const ROLE_PAGES = {
    order: ['dashboard', 'orders'],
    delivery: ['dashboard', 'orders', 'delivery', 'stock'],
    accounts: ['dashboard', 'orders', 'accounts'],
    colourStock: ['dashboard', 'orders', 'colourStock']
};
const PAGE_LOADERS = { staff: loadPeople };

function esc(v) {
    return String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}
function field(id, label, val = '', type = 'text', opts = [], hint = '') {
    if (type === 'select') return `<div class="field"><label>${esc(label)}</label><select id="f_${id}">${opts.map(x => `<option value="${esc(x)}" ${String(x) === String(val) ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></div>`;
    return `<div class="field"><label>${esc(label)}</label><input id="f_${id}" type="${type}" value="${esc(val)}">${hint ? `<small class="muted" style="display:block;margin-top:4px">${esc(hint)}</small>` : ''}</div>`;
}
function closeModal() { document.getElementById('modal')?.remove(); }

async function api(path, options = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (state.token) headers['Authorization'] = 'Bearer ' + state.token;
    const res = await fetch(path, { ...options, headers });
    if (res.status === 401 && state.token) {
        logout();
        throw new Error('Session expired. Please log in again.');
    }
    let body = null;
    try { body = await res.json(); } catch (e) { /* no JSON body */ }
    if (!res.ok) {
        const detail = body?.detail;
        throw new Error(Array.isArray(detail) ? detail.map(d => d.msg).join('; ') : (detail || 'Request failed'));
    }
    return body;
}

function isManagement() { return state.user?.role === 'admin'; }
function hasPage(p) {
    const r = state.user?.role;
    if (r === 'admin') return true;
    if (r === 'customer') return p === 'customer';
    return (state.user?.permissions || []).includes(p);
}
function firstPage() {
    if (state.user.role === 'customer') return 'customer';
    return NAV_ITEMS.find(x => hasPage(x[0]))?.[0] || 'dashboard';
}

async function doLogin(loginId, password) {
    const data = await api('/auth/login', { method: 'POST', body: JSON.stringify({ login_id: loginId, password }) });
    state.token = data.access_token;
    state.user = data.user;
    sessionStorage.setItem('token', state.token);
    state.page = firstPage();
    render();
}
async function restoreSession() {
    const token = sessionStorage.getItem('token');
    if (!token) { loginScreen(); return; }
    state.token = token;
    try {
        state.user = await api('/auth/me');
        state.page = firstPage();
        render();
    } catch (e) {
        logout();
    }
}
function logout() {
    state.user = null; state.token = null;
    sessionStorage.removeItem('token');
    loginScreen();
}

function loginScreen() {
    app.innerHTML = `<div class="login-wrap"><div class="login-card customer-login-card">
    <div class="brand">Manufacturing Management System</div>
    <div class="customer-welcome"><div class="customer-icon"></div><h1>Customer Login</h1><p class="muted">Place and track your orders directly with the company.</p></div>
    <div class="form-grid one">
      <div class="field"><label>GST Number</label><input id="loginUser" autocomplete="username" placeholder="Your company GST number"></div>
      <div class="field"><label>Password</label><input id="loginPass" type="password" autocomplete="current-password" placeholder="Password" onkeydown="if(event.key==='Enter') customerLogin()"></div>
    </div>
    <button class="btn" style="margin-top:16px;width:100%" onclick="customerLogin()">Customer Login</button>
    <div class="admin-entry"><span>Company staff?</span><button class="btn secondary" onclick="adminLoginModal()">Admin / Staff Login</button></div>
  </div></div>`;
}
async function customerLogin() {
    const u = document.getElementById('loginUser').value.trim();
    const p = document.getElementById('loginPass').value;
    if (!u || !p) { alert('Enter your GST number and password.'); return; }
    try { await doLogin(u, p); } catch (e) { alert(e.message); }
}
function adminLoginModal() {
    document.body.insertAdjacentHTML('beforeend', `<div class="modal" id="modal"><div class="modal-box small-modal">
    <div class="modal-head"><h2>Admin / Staff Login</h2><button onclick="closeModal()">✕</button></div>
    <p class="muted">Admin and staff use this login.</p>
    <div class="form-grid one"><div class="field"><label>Login ID</label><input id="f_admin_username" autocomplete="username"></div><div class="field"><label>Password</label><input id="f_admin_password" type="password" autocomplete="current-password" onkeydown="if(event.key==='Enter') adminLogin()"></div></div>
    <button class="btn" style="margin-top:16px;width:100%" onclick="adminLogin()">Login</button>
  </div></div>`);
}
async function adminLogin() {
    const u = document.getElementById('f_admin_username').value.trim();
    const p = document.getElementById('f_admin_password').value;
    if (!u || !p) { alert('Enter login ID and password.'); return; }
    try { await doLogin(u, p); closeModal(); } catch (e) { alert(e.message); }
}

function nav() {
    return NAV_ITEMS.filter(x => hasPage(x[0])).map(x => `<button class="${state.page === x[0] ? 'active' : ''}" onclick="go('${x[0]}')">${x[1]}</button>`).join('');
}
function go(p) { if (hasPage(p)) { state.page = p; render(); } }
function pageTitle() { return NAV_ITEMS.find(x => x[0] === state.page)?.[1] || ''; }

function render() {
    if (!state.user) { loginScreen(); return; }
    if (state.user.role === 'customer') {
        app.innerHTML = `<div class="content">${customerPanel()}</div>`;
        return;
    }
    app.innerHTML = `<div class="layout"><aside class="sidebar"><div class="side-brand">Manufacturing<br>Management</div><div class="nav">${nav()}</div></aside><main class="main"><header class="topbar"><b>${esc(pageTitle())}</b><div><span class="user-pill">${esc(state.user.full_name)}</span> <button class="btn secondary" onclick="logout()">Logout</button></div></header><div class="content">${pageHTML()}</div></main></div>`;
    PAGE_LOADERS[state.page]?.();
}
function pageHTML() {
    if (state.page === 'staff') return staffPage();
    return `<h1 class="section-title">${esc(pageTitle())}</h1><div class="panel"><p class="muted">This page will be connected in a later step.</p></div>`;
}
function customerPanel() {
    return `<div class="customer-shop"><div class="shop-head"><div><span class="eyebrow">CUSTOMER</span><h1>Welcome, ${esc(state.user.full_name)}</h1><p class="muted">Ordering will be connected in a later step.</p></div><button class="btn secondary" onclick="logout()">Logout</button></div></div>`;
}

function staffPage() {
    return `<div class="toolbar"><div><h1 class="section-title">Staff & Permissions</h1><p class="muted">Create logins, choose which pages staff can open, and switch accounts on or off.</p></div><div><button class="btn" onclick="staffModal()">+ Add Staff</button> <button class="btn secondary" onclick="customerModal()">+ Add Customer</button></div></div>
  <div class="panel"><h3 class="section-title">Staff</h3><div class="table-wrap"><table><thead><tr><th>Name</th><th>Login ID</th><th>Pages</th><th>Status</th><th>Action</th></tr></thead><tbody id="staffRows"><tr><td colspan="5" class="empty">Loading…</td></tr></tbody></table></div></div>
  <div class="panel"><h3 class="section-title">Customers</h3><div class="table-wrap"><table><thead><tr><th>Company</th><th>GST Number (login ID)</th><th>State</th><th>Phone</th><th>Status</th><th>Action</th></tr></thead><tbody id="companyRows"><tr><td colspan="6" class="empty">Loading…</td></tr></tbody></table></div></div>`;
}
function loadPeople() { return Promise.all([loadStaff(), loadCompanies()]); }

function toggleButton(active, handler, id) {
    return `<button class="btn ${active ? 'danger' : 'success'}" onclick="${handler}(${id}, ${!active})">${active ? 'Deactivate' : 'Activate'}</button>`;
}
async function loadStaff() {
    const body = document.getElementById('staffRows');
    if (!body) return;
    try {
        const rows = await api('/admin/staff');
        body.innerHTML = rows.map(x => `<tr><td>${esc(x.full_name)}</td><td>${esc(x.login_id)}</td><td>${esc(x.permissions.join(', '))}</td><td><span class="tag">${x.is_active ? 'Active' : 'Inactive'}</span></td><td>${toggleButton(x.is_active, 'toggleStaff', x.id)}</td></tr>`).join('') || '<tr><td colspan="5" class="empty">No staff yet.</td></tr>';
    } catch (e) {
        body.innerHTML = `<tr><td colspan="5" class="empty">${esc(e.message)}</td></tr>`;
    }
}
async function loadCompanies() {
    const body = document.getElementById('companyRows');
    if (!body) return;
    try {
        const rows = await api('/admin/companies');
        body.innerHTML = rows.map(x => `<tr><td>${esc(x.name)}</td><td>${esc(x.gst_number)}</td><td>${esc(x.state)}</td><td>${esc(x.phone)}</td><td><span class="tag">${x.is_active ? 'Active' : 'Inactive'}</span></td><td>${toggleButton(x.is_active, 'toggleCompany', x.id)}</td></tr>`).join('') || '<tr><td colspan="6" class="empty">No customers yet.</td></tr>';
    } catch (e) {
        body.innerHTML = `<tr><td colspan="6" class="empty">${esc(e.message)}</td></tr>`;
    }
}
async function toggleStaff(id, active) {
    if (!active && !confirm('Deactivate this staff member? They lose access immediately.')) return;
    try {
        await api('/admin/staff/' + id, { method: 'PATCH', body: JSON.stringify({ is_active: active }) });
        loadStaff();
    } catch (e) { alert(e.message); }
}
async function toggleCompany(id, active) {
    if (!active && !confirm('Deactivate this company? Its login stops working immediately.')) return;
    try {
        await api('/admin/companies/' + id, { method: 'PATCH', body: JSON.stringify({ is_active: active }) });
        loadCompanies();
    } catch (e) { alert(e.message); }
}

function customerModal() {
    document.body.insertAdjacentHTML('beforeend', `<div class="modal" id="modal"><div class="modal-box">
    <div class="modal-head"><h2>Add Customer</h2><button onclick="closeModal()">✕</button></div>
    <div class="form-grid">${field('company', 'Company Name')}${field('gst', 'GST Number', '', 'text', [], 'Example: 27ABCDE5678F2Z6 (15 characters)')}${field('address', 'Address')}${field('cstate', 'State')}${field('phone', 'Phone')}${field('cpassword', 'First Password', '', 'password')}</div>
    <p class="muted" style="margin-top:12px">The GST number is the customer's login ID. Give them the first password yourself.</p>
    <button class="btn" style="margin-top:16px" onclick="saveCustomer()">Create Customer</button>
  </div></div>`);
}
async function saveCustomer() {
    const g = k => document.getElementById('f_' + k)?.value || '';
    try {
        await api('/admin/companies', {
            method: 'POST',
            body: JSON.stringify({ name: g('company'), gst_number: g('gst'), address: g('address'), state: g('cstate'), phone: g('phone'), password: g('cpassword') })
        });
        closeModal();
        render();
    } catch (e) { alert(e.message); }
}
function staffModal() {
    document.body.insertAdjacentHTML('beforeend', `<div class="modal" id="modal"><div class="modal-box">
    <div class="modal-head"><h2>Add Staff</h2><button onclick="closeModal()">✕</button></div>
    <div class="form-grid">${field('name', 'Name')}${field('username', 'Login ID')}${field('password', 'Password', '', 'password')}${field('preset', 'Start from', 'order', 'select', ['order', 'delivery', 'accounts', 'colourStock', 'custom'])}</div>
    <div class="field" style="margin-top:14px"><label>Page permissions</label>
      <div class="permission-grid">${ALL_STAFF_PAGES.map(p => `<label class="check"><input type="checkbox" name="perm" value="${p}"> ${p}</label>`).join('')}</div>
      <small class="muted">The preset only ticks the usual pages. Change the ticks as needed before creating the account.</small></div>
    <button class="btn" style="margin-top:16px" onclick="saveStaff()">Create Staff</button>
  </div></div>`);
    const preset = document.getElementById('f_preset');
    preset.onchange = () => {
        const defaults = ROLE_PAGES[preset.value] || [];
        document.querySelectorAll('input[name="perm"]').forEach(c => { c.checked = defaults.includes(c.value); });
    };
    preset.onchange();
}
async function saveStaff() {
    const g = k => document.getElementById('f_' + k)?.value || '';
    const permissions = [...document.querySelectorAll('input[name="perm"]:checked')].map(x => x.value);
    try {
        await api('/admin/staff', {
            method: 'POST',
            body: JSON.stringify({ login_id: g('username'), full_name: g('name'), password: g('password'), permissions })
        });
        closeModal();
        render();
    } catch (e) { alert(e.message); }
}

restoreSession();