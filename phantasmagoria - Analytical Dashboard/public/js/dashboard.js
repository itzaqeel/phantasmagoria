// public/js/dashboard.js

document.addEventListener('DOMContentLoaded', async () => {
    initChartDefaults();
    await updateAppStatus();
    
    // View Switching Logic
    document.querySelectorAll('.nav-link[data-view]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const view = link.getAttribute('data-view');
            
            // Update UI
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            document.querySelectorAll('.dashboard-view').forEach(v => v.classList.add('hidden'));
            document.getElementById(`view-${view}`)?.classList.remove('hidden');
            
            // Update Title
            const titleMap = {
                'overview':  'University Intelligence Overview',
                'analytics': 'Detailed Analytics',
                'alumni':    'Alumni',
                'profile':   'My Account & Identity'
            };
            document.getElementById('view-title').textContent = titleMap[view] || 'Dashboard';
            
            // Toggle global actions visibility
            const actionsEl = document.getElementById('overview-actions');
            if (actionsEl) {
                actionsEl.style.display = (view === 'overview') ? 'flex' : 'none';
            }

            if (view === 'profile') { renderProfileData(); }
            if (view === 'alumni') {
                loadFilterOptions().then(() => setupAlumniFilterHandlers());
                loadAlumniList({});
            }
            if (view === 'analytics') {
                loadAnalyticsCharts();
            }
        });
    });

    // Logout Logic
    document.getElementById('logout-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'auth.html';
    });
    
    // Fetch real data immediately
    await refreshDashboardData();
    await renderProfileData();

    // Export Handlers
    setupExportHandlers();
});

// ── Profile Action Handlers ──────────────────────────────────────────────────

async function handleResetPassword() {
    const user  = JSON.parse(localStorage.getItem('user') || '{}');
    const email = user.email;
    const btn   = document.getElementById('btn-reset-password');
    const fb    = document.getElementById('reset-feedback');
    if (!email) return;

    btn.disabled    = true;
    btn.textContent = 'Sending…';

    const BASE = window.API_BASE || (window.API && window.API._base) || '';
    try {
        const res = await fetch(`${BASE}/api/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();
        fb.style.display = 'block';
        if (res.ok) {
            fb.style.color   = 'var(--success)';
            fb.textContent   = '✓ Reset link sent — check your email inbox.';
            showProfileToast('✓ Password reset email sent!', 'success');
        } else {
            fb.style.color   = '#f87171';
            fb.textContent   = data.message || 'Could not send reset email.';
        }
    } catch {
        fb.style.display = 'block';
        fb.style.color   = '#f87171';
        fb.textContent   = 'Network error. Please try again.';
    } finally {
        btn.disabled    = false;
        btn.textContent = 'Send Reset Link';
    }
}

async function handleResendVerification() {
    const user  = JSON.parse(localStorage.getItem('user') || '{}');
    const email = user.email;
    const btn   = document.getElementById('btn-resend-verify');
    const fb    = document.getElementById('verify-feedback');
    if (!email) return;

    btn.disabled    = true;
    btn.textContent = 'Sending…';

    const BASE = window.API_BASE || (window.API && window.API._base) || '';
    try {
        const res  = await fetch(`${BASE}/api/auth/resend-verification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();
        fb.style.display = 'block';
        if (res.ok) {
            fb.style.color = 'var(--success)';
            fb.textContent = '✓ Verification email resent — check your inbox.';
            showProfileToast('✓ Verification email sent!', 'success');
        } else {
            fb.style.color = '#f87171';
            fb.textContent = data.message || 'Could not resend verification email.';
        }
    } catch {
        fb.style.display = 'block';
        fb.style.color   = '#f87171';
        fb.textContent   = 'Network error. Please try again.';
    } finally {
        btn.disabled    = false;
        btn.textContent = 'Resend Verification Email';
    }
}

function handleProfileLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'auth.html';
}

function showProfileToast(message, type = 'success') {
    const toast = document.getElementById('profile-toast');
    if (!toast) return;
    toast.textContent   = message;
    toast.style.color   = type === 'success' ? 'var(--success)' : '#f87171';
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 3500);
}

function initChartDefaults() {
    Chart.defaults.color = '#94a3b8'; // text-secondary
    Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.08)';
    Chart.defaults.font.family = "'Outfit', sans-serif";
    Chart.defaults.plugins.tooltip.backgroundColor = '#212126';
    Chart.defaults.plugins.tooltip.titleColor = '#fbbf24';
    Chart.defaults.plugins.tooltip.borderColor = 'rgba(251, 191, 36, 0.3)';
    Chart.defaults.plugins.tooltip.borderWidth = 1;
}

async function updateAppStatus() {
    const statusEl = document.getElementById('api-status');
    const { ok } = await API.get('/health');
    if (ok) {
        statusEl.textContent = '● Connected';
        statusEl.style.color = 'var(--success)';
    } else {
        statusEl.textContent = '● Offline';
        statusEl.style.color = 'var(--danger)';
    }
}

async function refreshDashboardData() {
    const statsRes = await API.get('/analytics/overview');
    if (statsRes.ok && statsRes.data) {
        window._lastOverviewData = statsRes.data;
        updateStats(statsRes.data);
        renderOverviewCharts(statsRes.data);
    }
}

function updateStats(data) {
    const s = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    s('stat-total-alumni',   data.totalAlumni   ?? '—');
    s('stat-total-certs',    data.totalCertifications ?? '—');
    s('stat-total-degrees',  data.totalDegrees  ?? '—');
}

// Called on load and when Analytics nav is clicked
function renderAllCharts(data) {
    renderDegreeChart(data.degreeDist);
    renderGeoChart(data.geoDist);
    renderTopBiddersChart(data.topBidders);
    renderIndustryChart(data.industryGrowth);
    renderSkillsGapChart(data.skillsGap);
    renderSalaryChart(data.salaryBenchmarks);
    renderEngagementChart(data.engagementTrends);
}

// Two overview-specific charts: Industry Distribution + Graduation Trends
let _overviewChartsRendered = false;
function renderOverviewCharts(data) {
    if (_overviewChartsRendered) return; // avoid re-rendering on each dashboard refresh
    _overviewChartsRendered = true;

    // Industry Distribution — fetch from live endpoint
    API.get('/analytics/employment-by-industry').then(res => {
        const rows = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        const ctx  = document.getElementById('overviewIndustryChart')?.getContext('2d');
        if (!ctx) return;
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: rows.length ? rows.map(r => r.sector) : ['No data'],
                datasets: [{ label: 'Alumni', data: rows.length ? rows.map(r => r.count) : [0],
                    backgroundColor: 'rgba(251,191,36,0.8)', borderRadius: 6 }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false } },
                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.04)' } }
                }
            }
        });
    });

    // Graduation Trends — line chart from overview data
    const grad = data.graduationTrends || { labels: [], values: [] };
    const ctx2 = document.getElementById('graduationChart')?.getContext('2d');
    if (ctx2) {
        const gradient = ctx2.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, 'rgba(251,191,36,0.35)');
        gradient.addColorStop(1, 'rgba(251,191,36,0)');
        new Chart(ctx2, {
            type: 'line',
            data: {
                labels: grad.labels.length ? grad.labels : ['No data'],
                datasets: [{ label: 'Graduates', data: grad.labels.length ? grad.values : [0],
                    borderColor: '#fbbf24', backgroundColor: gradient,
                    fill: true, tension: 0.4, pointRadius: 5, pointBackgroundColor: '#fbbf24' }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false } },
                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.04)' } }
                }
            }
        });
    }
}

// ─── Analytics View ─────────────────────────────────────────────────────────

const _aCharts = {}; // keyed by canvas ID to allow destroy+re-render on filter

function setupAnalyticsFilters() {
    // Populate from same filter-options data already loaded for Alumni
    const populate = (destId, srcId) => {
        const src  = document.getElementById(srcId);
        const dest = document.getElementById(destId);
        if (!src || !dest || dest.options.length > 1) return; // already populated
        Array.from(src.options).slice(1).forEach(opt => {
            dest.appendChild(opt.cloneNode(true));
        });
    };
    populate('analytics-filter-programme', 'filter-programme');
    populate('analytics-filter-year',      'filter-grad-year');

    document.getElementById('analytics-btn-apply')?.addEventListener('click', () => {
        const f = getAnalyticsFilters();
        updateAnalyticsBadge(f);
        loadAnalyticsCharts(f);
    });
    document.getElementById('analytics-btn-clear')?.addEventListener('click', () => {
        ['analytics-filter-programme', 'analytics-filter-year'].forEach(id => {
            const el = document.getElementById(id); if (el) el.value = '';
        });
        updateAnalyticsBadge({});
        loadAnalyticsCharts({});
    });
}

function getAnalyticsFilters() {
    return {
        programme: document.getElementById('analytics-filter-programme')?.value || '',
        gradYear:  document.getElementById('analytics-filter-year')?.value      || ''
    };
}

function updateAnalyticsBadge(f) {
    const badge = document.getElementById('analytics-filter-badge');
    if (!badge) return;
    const count = [f.programme, f.gradYear].filter(Boolean).length;
    badge.style.display = count ? 'inline' : 'none';
    badge.textContent   = count ? `${count} active` : '';
}

async function loadAnalyticsCharts() {
    if (window._analyticsLoaded) return; // don't re-fetch on repeated tab clicks
    window._analyticsLoaded = true;

    const [indRes, jobRes, empRes, skillsRes, statusRes] = await Promise.all([
        API.get('/analytics/employment-by-industry'),
        API.get('/analytics/top-job-titles'),
        API.get('/analytics/top-employers'),
        API.get('/analytics/skills-gap'),
        API.get('/analytics/employed-vs-unemployed')
    ]);

    const rows = r => Array.isArray(r.data) ? r.data : (r.data?.data || []);
    const overview = window._lastOverviewData || {};

    renderAIndustry('aIndustryChart',    rows(indRes));
    renderAJobTitles('aJobTitlesChart',  rows(jobRes));
    renderAHBar('aEmployersChart',       rows(empRes),  r => r.company, r => r.count);
    renderASkillsGap('aSkillsGapChart',  skillsRes.data || {});
    renderACertTypes('aCertTypesChart',  skillsRes.data || {});
    renderAEmpStatus('aEmpStatusChart',  statusRes.data || {});
    renderAGradTrends('aGradChart',      overview.graduationTrends || { labels: [], values: [] });
    renderADegrees('aDegreeBubble',      overview.degreeDist       || { labels: [], values: [] });
}

// 1. Radar / Spider — Employment by Industry Sector
function renderAIndustry(canvasId, rows) {
    if (_aCharts[canvasId]) { _aCharts[canvasId].destroy(); }
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;
    const hasData = rows.length > 0;
    _aCharts[canvasId] = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: hasData ? rows.map(r => r.sector) : ['No data'],
            datasets: [{
                label: 'Alumni Count',
                data: hasData ? rows.map(r => r.count) : [0],
                borderColor: '#fbbf24',
                backgroundColor: 'rgba(251,191,36,0.15)',
                pointBackgroundColor: '#fbbf24',
                pointBorderColor: '#fbbf24',
                pointRadius: 5,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            layout: { padding: 20 },
            scales: { r: {
                angleLines: { color: 'rgba(255,255,255,0.08)' },
                grid:        { color: 'rgba(255,255,255,0.08)' },
                pointLabels: { color: '#94a3b8', font: { size: 11 } },
                ticks:       { display: false, beginAtZero: true }
            }},
            plugins: { legend: { display: false } }
        }
    });
}

// 2. Vertical bar — Most Common Job Titles (each bar a different colour)
function renderAJobTitles(canvasId, rows) {
    if (_aCharts[canvasId]) { _aCharts[canvasId].destroy(); }
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;
    const palette = ['#fbbf24','#d97706','#f59e0b','#b45309','#fcd34d','#fde68a','#92400e','#78350f','#fed7aa','#fdba74'];
    const hasData = rows.length > 0;
    _aCharts[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: hasData ? rows.map(r => r.title || r.role) : ['No data'],
            datasets: [{ label: 'Count', data: hasData ? rows.map(r => r.count) : [0],
                backgroundColor: palette, borderRadius: 10, borderSkipped: false }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            layout: { padding: 20 },
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#94a3b8', maxRotation: 30 } },
                y: { grid: { color: 'rgba(255,255,255,0.04)' }, beginAtZero: true, ticks: { color: '#94a3b8' } }
            }
        }
    });
}

// 3. Horizontal bar — Top Employers
function renderAHBar(canvasId, rows, labelFn, valueFn) {
    if (_aCharts[canvasId]) { _aCharts[canvasId].destroy(); }
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;
    const hasData = rows.length > 0;
    _aCharts[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: hasData ? rows.map(labelFn) : ['No data'],
            datasets: [{ label: 'Count', data: hasData ? rows.map(valueFn) : [0],
                backgroundColor: 'rgba(251,191,36,0.8)', borderRadius: 6 }]
        },
        options: {
            indexAxis: 'y',
            responsive: true, maintainAspectRatio: false,
            layout: { padding: 20 },
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.04)' }, beginAtZero: true, ticks: { color: '#94a3b8' } },
                y: { grid: { display: false }, ticks: { color: '#94a3b8' } }
            }
        }
    });
}

// 4. Radar — Curriculum Skills Gap
function renderASkillsGap(canvasId, data) {
    if (_aCharts[canvasId]) { _aCharts[canvasId].destroy(); }
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;
    const certs = (data.certifications || []).slice(0, 8);
    const hasData = certs.length > 0;
    _aCharts[canvasId] = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: hasData ? certs.map(c => c.title) : ['No data'],
            datasets: [{
                label: 'Alumni Certified',
                data: hasData ? certs.map(c => c.count) : [0],
                borderColor: '#fbbf24', backgroundColor: 'rgba(251,191,36,0.15)',
                pointBackgroundColor: '#fbbf24', borderWidth: 2
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            layout: { padding: 20 },
            scales: { r: {
                angleLines: { color: 'rgba(255,255,255,0.06)' },
                grid:       { color: 'rgba(255,255,255,0.06)' },
                pointLabels:{ color: '#94a3b8', font: { size: 10 } },
                ticks:      { display: false, beginAtZero: true }
            }},
            plugins: { legend: { display: false } }
        }
    });
}

// 5. Doughnut — Certificate Types
function renderACertTypes(canvasId, data) {
    if (_aCharts[canvasId]) { _aCharts[canvasId].destroy(); }
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;
    const certs = (data.certifications || []).slice(0, 8);
    const palette = ['#fbbf24','#d97706','#f59e0b','#b45309','#92400e','#fcd34d','#fde68a','#78350f'];
    _aCharts[canvasId] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: certs.length ? certs.map(c => c.title) : ['No data'],
            datasets: [{ data: certs.length ? certs.map(c => c.count) : [1],
                backgroundColor: palette, borderWidth: 2,
                borderColor: '#18181b', hoverOffset: 10 }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            layout: { padding: 20 },
            plugins: { legend: { position: 'bottom',
                labels: { color: '#94a3b8', font: { size: 10 }, boxWidth: 10, padding: 8 } } },
            cutout: '65%'
        }
    });
}

// 6. Pie — Employment Status
function renderAEmpStatus(canvasId, data) {
    if (_aCharts[canvasId]) { _aCharts[canvasId].destroy(); }
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;
    const employed   = Number(data.employed   || 0);
    const unemployed = Number(data.unemployed || 0);
    _aCharts[canvasId] = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Currently Employed', 'Not Employed'],
            datasets: [{ data: [employed, unemployed],
                backgroundColor: ['rgba(16,185,129,0.85)', 'rgba(239,68,68,0.75)'],
                borderWidth: 2, borderColor: '#18181b', hoverOffset: 10 }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            layout: { padding: 20 },
            plugins: { legend: { position: 'bottom',
                labels: { color: '#94a3b8', font: { size: 12 }, boxWidth: 14, padding: 10 } } }
        }
    });
}

// 7. Scatter — Graduation Trends (year vs graduate count)
function renderAGradTrends(canvasId, data) {
    if (_aCharts[canvasId]) { _aCharts[canvasId].destroy(); }
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;
    const hasData = data.labels?.length > 0;
    const points  = hasData
        ? data.labels.map((yr, i) => ({ x: Number(yr) || i + 1, y: data.values[i] }))
        : [{ x: 2024, y: 0 }];
    _aCharts[canvasId] = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Graduates',
                data: points,
                backgroundColor: 'rgba(251,191,36,0.75)',
                borderColor: '#fbbf24',
                borderWidth: 2,
                pointRadius: 10,
                pointHoverRadius: 14
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            layout: { padding: 20 },
            plugins: { legend: { display: false } },
            scales: {
                x: { type: 'linear', grid: { color: 'rgba(255,255,255,0.04)' },
                     ticks: { color: '#94a3b8', stepSize: 1,
                              callback: v => Number.isInteger(v) ? v : '' } },
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.04)' },
                     ticks: { color: '#94a3b8', stepSize: 1 } }
            }
        }
    });
}

// 8. Bubble — Degree Distribution (size = alumni count)
function renderADegrees(canvasId, data) {
    if (_aCharts[canvasId]) { _aCharts[canvasId].destroy(); }
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;
    const palette = ['#fbbf24','#d97706','#f59e0b','#b45309','#fcd34d','#fde68a','#92400e','#78350f'];
    const hasData = data.labels?.length > 0;
    _aCharts[canvasId] = new Chart(ctx, {
        type: 'bubble',
        data: {
            datasets: hasData ? data.labels.map((label, i) => ({
                label,
                data: [{ x: (i + 1) * 1.5, y: data.values[i], r: Math.max(10, Math.min(40, data.values[i] * 12)) }],
                backgroundColor: palette[i % palette.length] + 'aa',
                borderColor:     palette[i % palette.length],
                borderWidth: 2
            })) : [{ label: 'No data', data: [{ x: 1, y: 0, r: 15 }], backgroundColor: '#fbbf2444' }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            layout: { padding: 20 },
            plugins: { legend: { position: 'bottom',
                labels: { color: '#94a3b8', font: { size: 10 }, boxWidth: 10, padding: 8 } } },
            scales: {
                x: { display: false },
                y: { grid: { color: 'rgba(255,255,255,0.04)' }, beginAtZero: true, ticks: { color: '#94a3b8' } }
            }
        }
    });
}



function renderDegreeChart(data) {
    const ctx = document.getElementById('degreeChart').getContext('2d');
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.labels,
            datasets: [{
                data: data.values,
                backgroundColor: ['#fbbf24', '#d97706', '#fcd34d', '#b45309', '#78350f'],
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } },
            cutout: '70%'
        }
    });
}


function renderGeoChart(data) {
    const ctx = document.getElementById('geoChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Alumni Count',
                data: data.values,
                backgroundColor: '#fbbf24',
                borderRadius: 6
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.04)' } },
                y: { grid: { display: false } }
            }
        }
    });
}

function renderTopBiddersChart(data) {
    const ctx = document.getElementById('topBiddersChart').getContext('2d');
    new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Wins', 'Bid Value', 'Consistency', 'Profile Completion', 'Participation'],
            datasets: data.map(bidder => ({
                label: bidder.name,
                data: bidder.scores,
                borderColor: bidder.color,
                backgroundColor: bidder.color + '22',
                borderWidth: 2
            }))
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    angleLines: { color: 'rgba(255,255,255,0.08)' },
                    grid: { color: 'rgba(255,255,255,0.08)' },
                    pointLabels: { color: '#94a3b8' },
                    ticks: { display: false }
                }
            }
        }
    });
}

function renderIndustryChart(data) {
    const ctx = document.getElementById('industryChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Growth %',
                data: data.values,
                backgroundColor: ['#fbbf24', '#f59e0b', '#d97706', '#b45309'],
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } }
        }
    });
}

function renderSkillsGapChart(data) {
    const ctx = document.getElementById('skillsGapChart').getContext('2d');
    new Chart(ctx, {
        type: 'radar',
        data: {
            labels: data.labels,
            datasets: [
                { label: 'Curriculum Coverage', data: data.curriculum, borderColor: '#fbbf24', backgroundColor: 'rgba(251, 191, 36, 0.2)' },
                { label: 'Industry Adoption', data: data.industry, borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.2)' }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { r: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { display: false } } }
        }
    });
}

function renderSalaryChart(data) {
    const ctx = document.getElementById('salaryChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Avg Salary',
                data: data.values,
                borderColor: '#fbbf24',
                fill: false,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { grid: { color: 'rgba(255,255,255,0.05)' } } }
        }
    });
}

function renderEngagementChart(data) {
    const ctx = document.getElementById('engagementChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Logins',
                data: data.values,
                backgroundColor: 'rgba(251, 191, 36, 0.8)',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

// --- Export Functionality ---

function setupExportHandlers() {
    document.getElementById('btn-export-csv')?.addEventListener('click', () => exportToCSV());
    document.getElementById('btn-export-pdf')?.addEventListener('click', () => exportToPDF());
    document.getElementById('btn-apply-filter')?.addEventListener('click', () => loadAlumniData());
    document.getElementById('btn-clear-filter')?.addEventListener('click', () => {
        document.getElementById('filter-programme').value = '';
        document.getElementById('filter-year').value = '';
        loadAlumniData();
    });
}

function exportToCSV() {
    const data = getMockData(); // Use current data in real scenario
    let csv = 'Metric,Value\n';
    csv += `Total Alumni,${data.totalAlumni}\n`;
    csv += `Active Bids,${data.activeBids}\n`;
    csv += `Total Revenue,${data.totalRevenue}\n`;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Phantasmagoria_Report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
}

function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text("Phantasmagoria University Intelligence Report", 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, 30);
    
    const data = getMockData();
    doc.text(`Total Alumni: ${data.totalAlumni}`, 20, 45);
    doc.text(`Active Bids: ${data.activeBids}`, 20, 55);
    doc.text(`Total Revenue: GBP ${data.totalRevenue}`, 20, 65);
    
    doc.save("Phantasmagoria_Report.pdf");
}

// --- Alumni Directory ---

let _filterOptionsLoaded = false;

async function loadFilterOptions() {
    if (_filterOptionsLoaded) return;
    const res = await API.get('/analytics/alumni-filter-options');
    if (!res.ok) return;
    const opts = res.data; // { programmes, years, industries }

    const populate = (selectId, values) => {
        const sel = document.getElementById(selectId);
        if (!sel || !values) return;
        values.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v;
            opt.textContent = v;
            sel.appendChild(opt);
        });
    };
    populate('filter-programme', opts.programmes);
    populate('filter-grad-year', opts.years);
    populate('filter-industry',  opts.industries);
    _filterOptionsLoaded = true;
}

async function loadAlumniList(filters = {}) {
    const tbody    = document.getElementById('alumni-list-body');
    const resultLbl = document.getElementById('alumni-result-label');
    if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="padding:3rem;text-align:center;color:var(--text-muted);">⏳ Loading alumni directory...</td></tr>';

    const params = new URLSearchParams();
    if (filters.programme) params.set('programme', filters.programme);
    if (filters.gradYear)   params.set('gradYear',  filters.gradYear);
    if (filters.industry)   params.set('industry',  filters.industry);
    const qs = params.toString() ? `?${params.toString()}` : '';

    const res   = await API.get(`/analytics/alumni${qs}`);
    const alumni = Array.isArray(res.data) ? res.data : (res.data?.data || []);

    if (!res.ok) {
        if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="padding:3rem;text-align:center;color:var(--danger);">Failed to load alumni. Check API connection.</td></tr>';
        return;
    }

    // Stats
    const totalEl    = document.getElementById('alumni-total-count');
    const verifiedEl = document.getElementById('alumni-verified-count');
    const profileEl  = document.getElementById('alumni-profile-count');
    if (totalEl)    totalEl.textContent    = alumni.length;
    if (verifiedEl) verifiedEl.textContent = alumni.filter(a => a.is_verified).length;
    if (profileEl)  profileEl.textContent  = alumni.filter(a => a.biography).length;
    if (resultLbl)  resultLbl.textContent  = alumni.length === 0 ? 'No results' : `${alumni.length} result${alumni.length !== 1 ? 's' : ''}`;

    if (alumni.length === 0) {
        if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="padding:3rem;text-align:center;color:var(--text-muted);">No alumni match the selected filters.</td></tr>';
        return;
    }

    window._alumniData = alumni;
    renderAlumniTable(alumni);

    // Live name/email search (client-side after server filters applied)
    const searchEl = document.getElementById('alumni-search');
    if (searchEl) {
        searchEl.value = '';
        searchEl.oninput = (e) => {
            const q = e.target.value.toLowerCase();
            const filtered = window._alumniData.filter(a => {
                const name = `${a.first_name || ''} ${a.last_name || ''}`.toLowerCase();
                return name.includes(q) || a.email.toLowerCase().includes(q);
            });
            renderAlumniTable(filtered);
        };
    }
}

function getActiveFilters() {
    return {
        programme: document.getElementById('filter-programme')?.value  || '',
        gradYear:  document.getElementById('filter-grad-year')?.value  || '',
        industry:  document.getElementById('filter-industry')?.value   || ''
    };
}

function updateFilterChips(filters) {
    const chips      = document.getElementById('filter-chips');
    const chipsRow   = document.getElementById('active-filters-row');
    const badge      = document.getElementById('filter-count-badge');
    if (!chips) return;

    const active = [
        filters.programme ? { label: `🎓 ${filters.programme}`, key: 'filter-programme' } : null,
        filters.gradYear  ? { label: `📅 ${filters.gradYear}`,  key: 'filter-grad-year' } : null,
        filters.industry  ? { label: `🏢 ${filters.industry}`,  key: 'filter-industry'  } : null,
    ].filter(Boolean);

    const count = active.length;
    chipsRow.style.display = count ? 'block' : 'none';
    badge.style.display    = count ? 'inline' : 'none';
    badge.textContent      = count > 0 ? `${count} active` : '';

    // Use data-filter-key instead of inline onclick (more reliable with dynamic HTML)
    chips.innerHTML = active.map(f => `
        <span class="filter-chip">
            ${f.label}
            <button class="filter-chip-remove" data-filter-key="${f.key}" title="Remove filter">&times;</button>
        </span>`).join('');

    // Event delegation on the container — no inline handlers needed
    chips.onclick = (e) => {
        const btn = e.target.closest('.filter-chip-remove');
        if (!btn) return;
        removeFilter(btn.dataset.filterKey);
    };
}


function removeFilter(selectId) {
    const el = document.getElementById(selectId);
    if (el) el.value = '';
    const filters = getActiveFilters();
    updateFilterChips(filters);
    loadAlumniList(filters);
}

function setupAlumniFilterHandlers() {
    document.getElementById('btn-apply-filter')?.addEventListener('click', () => {
        const filters = getActiveFilters();
        updateFilterChips(filters);
        loadAlumniList(filters);
    });
    document.getElementById('btn-clear-filter')?.addEventListener('click', () => {
        ['filter-programme', 'filter-grad-year', 'filter-industry'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        updateFilterChips({});
        loadAlumniList({});
    });
}


function renderAlumniTable(alumni) {

    const tbody = document.getElementById('alumni-list-body');
    if (!tbody) return;

    if (alumni.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="padding:2rem;text-align:center;color:var(--text-muted);">No matching alumni found.</td></tr>';
        return;
    }

    tbody.innerHTML = alumni.map(a => {
        const firstName = a.first_name || '';
        const lastName  = a.last_name  || '';
        const name      = (firstName + ' ' + lastName).trim() || '—';
        const initial   = (firstName || a.email)[0].toUpperCase();
        const joined    = new Date(a.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        const verified  = a.is_verified
            ? '<span class="status-badge status-success">✓ Verified</span>'
            : '<span class="status-badge status-warning">⚠ Unverified</span>';

        return `
            <tr style="border-bottom:1px solid var(--border); transition:background 0.15s;"
                onmouseover="this.style.background='rgba(255,255,255,0.025)'"
                onmouseout="this.style.background='transparent'">
                <td style="padding:0.9rem 1rem;">
                    <div style="display:flex;align-items:center;gap:0.75rem;">
                        <div style="width:38px;height:38px;border-radius:50%;background:rgba(251,191,36,0.12);border:1px solid rgba(251,191,36,0.3);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.9rem;color:var(--accent);flex-shrink:0;">${initial}</div>
                        <div style="font-weight:600;">${name}</div>
                    </div>
                </td>
                <td style="padding:0.9rem 1rem;color:var(--text-secondary);font-size:0.88rem;">${a.email}</td>
                <td style="padding:0.9rem 1rem;text-align:center;">
                    <span class="status-badge" style="background:rgba(99,102,241,0.12);color:#a5b4fc;text-transform:capitalize;">${a.role}</span>
                </td>
                <td style="padding:0.9rem 1rem;text-align:center;">${verified}</td>
                <td style="padding:0.9rem 1rem;text-align:center;color:var(--text-secondary);font-size:0.85rem;">${joined}</td>
                <td style="padding:0.9rem 1rem;text-align:center;">
                    <button onclick="viewAlumniProfile(${a.id})"
                        class="btn btn-secondary btn-sm"
                        style="font-size:0.78rem;padding:0.3rem 0.8rem;">
                        View Profile
                    </button>
                </td>
            </tr>`;
    }).join('');
}

async function viewAlumniProfile(id) {
    const modal   = document.getElementById('alumni-modal');
    const content = document.getElementById('modal-content');
    modal.style.display = 'flex';
    content.innerHTML = '<div style="padding:3rem;text-align:center;color:var(--text-muted);">⏳ Loading profile...</div>';

    const res    = await API.get(`/analytics/alumni/${id}`);
    const alumni = res.data?.data || res.data;

    if (!res.ok || !alumni) {
        content.innerHTML = '<p style="color:var(--danger);padding:1rem;">Failed to load profile.</p>';
        return;
    }

    const firstName = alumni.first_name || '';
    const lastName  = alumni.last_name  || '';
    const name      = (firstName + ' ' + lastName).trim() || alumni.email;
    const initial   = (firstName || alumni.email)[0].toUpperCase();
    const joined    = new Date(alumni.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    const row = (label, value) => value ? `
        <div style="padding:0.65rem 0.85rem;background:rgba(255,255,255,0.04);border-radius:8px;">
            <div style="font-size:0.68rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.2rem;">${label}</div>
            <div style="font-weight:500;font-size:0.9rem;">${value}</div>
        </div>` : '';

    const section = (title, items, emptyMsg) => `
        <div style="margin-bottom:1.25rem;">
            <div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:0.6rem;">${title}</div>
            ${items.length === 0
                ? `<p style="color:var(--text-muted);font-size:0.85rem;">${emptyMsg}</p>`
                : items.map(item => `<div style="padding:0.7rem 0.9rem;background:rgba(255,255,255,0.04);border-radius:8px;margin-bottom:0.4rem;">${item}</div>`).join('')
            }
        </div>`;

    const degreeItems = (alumni.degrees || []).map(d =>
        `<div style="font-weight:600;font-size:0.88rem;">${d.title}</div>
         <div style="font-size:0.78rem;color:var(--text-muted);margin-top:2px;">${[d.institution, d.completion_date ? new Date(d.completion_date).getFullYear() : null].filter(Boolean).join(' · ')}</div>`
    );

    const empItems = (alumni.employment || []).map(e =>
        `<div style="font-weight:600;font-size:0.88rem;">${e.role}</div>
         <div style="font-size:0.78rem;color:var(--text-muted);margin-top:2px;">${[e.company, e.start_date ? new Date(e.start_date).getFullYear() + (e.end_date ? '–' + new Date(e.end_date).getFullYear() : '–Present') : null].filter(Boolean).join(' · ')}</div>`
    );

    const certItems = (alumni.certifications || []).map(c =>
        `<div style="font-weight:600;font-size:0.88rem;">${c.title}</div>
         <div style="font-size:0.78rem;color:var(--text-muted);margin-top:2px;">${c.completion_date ? new Date(c.completion_date).toLocaleDateString('en-GB', {month:'short',year:'numeric'}) : ''}</div>`
    );

    content.innerHTML = `
        <!-- Header -->
        <div style="display:flex;align-items:center;gap:1.25rem;margin-bottom:1.5rem;padding-bottom:1.5rem;border-bottom:1px solid var(--border);">
            <div style="width:60px;height:60px;border-radius:50%;background:rgba(251,191,36,0.12);border:2px solid var(--accent);display:flex;align-items:center;justify-content:center;font-size:1.4rem;font-weight:700;color:var(--accent);flex-shrink:0;">${initial}</div>
            <div>
                <h3 style="margin:0;font-size:1.2rem;">${name}</h3>
                <p style="margin:0.2rem 0 0;color:var(--text-secondary);font-size:0.88rem;">${alumni.email}</p>
            </div>
        </div>

        <!-- Key Info Grid -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-bottom:1.5rem;">
            ${row('User Type', `<span style="text-transform:capitalize;color:var(--accent);">${alumni.role}</span>`)}
            ${row('Status', alumni.is_verified ? '✓ Verified' : '⚠ Unverified')}
            ${row('Member Since', joined)}
            ${alumni.linkedin_url ? row('LinkedIn', `<a href="${alumni.linkedin_url}" target="_blank" style="color:var(--accent);">View Profile ↗</a>`) : ''}
        </div>

        ${alumni.biography ? `
        <div style="margin-bottom:1.25rem;">
            <div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:0.5rem;">About</div>
            <p style="color:var(--text-secondary);font-size:0.88rem;line-height:1.65;margin:0;">${alumni.biography}</p>
        </div>` : ''}

        ${section('Education', degreeItems, 'No degrees recorded.')}
        ${section('Employment History', empItems, 'No employment recorded.')}
        ${section('Certifications', certItems, 'No certifications recorded.')}
    `;
}

function closeAlumniModal() {
    const modal = document.getElementById('alumni-modal');
    if (modal) modal.style.display = 'none';
}

// Close modal when clicking the backdrop
document.getElementById('alumni-modal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeAlumniModal();
});



// --- Profile Logic ---

async function renderProfileData() {
    const user = API.getUser();
    if (!user) return;

    // Fill UI elements
    const nameEl = document.getElementById('profile-full-name');
    const emailSubEl = document.getElementById('profile-email-sub');
    const roleBadgeEl = document.getElementById('profile-role-badge');
    
    const infoEmail = document.getElementById('info-email');
    const infoRole = document.getElementById('info-role');
    const infoJoined = document.getElementById('info-joined');

    if (nameEl) nameEl.textContent = user.first_name ? `${user.first_name} ${user.last_name || ''}` : user.email.split('@')[0];
    if (emailSubEl) emailSubEl.textContent = user.email;
    if (roleBadgeEl) roleBadgeEl.textContent = user.role === 'developer' ? 'University Analyst (Dev)' : 'Alumni Viewer';
    
    if (infoEmail) infoEmail.textContent = user.email;
    if (infoRole) infoRole.textContent = user.role;
    if (infoJoined) infoJoined.textContent = new Date(user.created_at || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    
    // Set Avatar Initial
    const avatar = document.getElementById('profile-avatar-large');
    if (avatar) avatar.textContent = (user.first_name ? user.first_name[0] : user.email[0]).toUpperCase();
}

function getMockData() {
    return {
        totalAlumni: 1240,
        activeBids: 42,
        totalRevenue: 15600.50,
        apiHits: 8400,
        degreeDist: {
            labels: ['CS', 'Business', 'Eng', 'Arts', 'Other'],
            values: [450, 300, 250, 150, 90]
        },
        biddingTrends: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            values: [12, 19, 15, 25, 32, 28, 45]
        },
        geoDist: {
            labels: ['London', 'Colombo', 'Dubai', 'NY', 'SG'],
            values: [400, 250, 180, 120, 80]
        },
        topBidders: [
            { name: 'John Doe', scores: [80, 90, 70, 100, 60], color: '#fbbf24' },
            { name: 'Jane Smith', scores: [60, 70, 90, 80, 100], color: '#d97706' }
        ],
        industryGrowth: {
            labels: ['Tech', 'Finance', 'Health', 'Creative'],
            values: [156, 84, 42, 38]
        },
        skillsGap: {
            labels: ['Cloud', 'AI/ML', 'Blockchain', 'Cyber', 'DevOps'],
            curriculum: [20, 10, 5, 15, 10],
            industry: [85, 70, 40, 65, 80]
        },
        salaryBenchmarks: {
            labels: ['2021', '2022', '2023', '2024'],
            values: [32000, 35000, 38000, 42000]
        },
        engagementTrends: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            values: [1200, 1500, 1800, 2100]
        }
    };
}
