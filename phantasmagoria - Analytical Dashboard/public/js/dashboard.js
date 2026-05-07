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
                'overview': 'University Intelligence Overview',
                'alumni': 'Detailed Alumni Analysis',
                'profile': 'My Account & Identity'
            };
            document.getElementById('view-title').textContent = titleMap[view] || 'Dashboard';
            
            // Toggle global actions visibility
            const actionsEl = document.getElementById('overview-actions');
            if (actionsEl) {
                actionsEl.style.display = (view === 'overview') ? 'flex' : 'none';
            }

            if (view === 'profile') {
                renderProfileData();
            }
            if (view === 'alumni') {
                loadAlumniList();
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
    
    // Initial Render with Mock Data (for demo/fallback)
    const mockData = getMockData();
    updateStats(mockData);
    renderAllCharts(mockData);
    
    // Attempt to fetch real data
    await refreshDashboardData();
    await renderProfileData(); // Fetch profile early

    // Export Handlers
    setupExportHandlers();
});

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
        updateStats(statsRes.data);
        renderAllCharts(statsRes.data);
    }
}

function updateStats(data) {
    document.getElementById('stat-total-alumni').textContent = data.totalAlumni || '0';
    document.getElementById('stat-active-bids').textContent = data.activeBids || '0';
    document.getElementById('stat-total-revenue').textContent = `£${data.totalRevenue?.toFixed(2) || '0.00'}`;
    document.getElementById('stat-api-hits').textContent = data.apiHits || '0';
}

function renderAllCharts(data) {
    renderDegreeChart(data.degreeDist);
    renderGeoChart(data.geoDist);
    renderTopBiddersChart(data.topBidders);
    
    // New Mandatory Charts
    renderIndustryChart(data.industryGrowth);
    renderSkillsGapChart(data.skillsGap);
    renderSalaryChart(data.salaryBenchmarks);
    renderEngagementChart(data.engagementTrends);
}

// --- Chart Renderers ---

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

async function loadAlumniList() {
    const tbody = document.getElementById('alumni-list-body');
    if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="padding:3rem;text-align:center;color:var(--text-muted);">⏳ Loading alumni directory...</td></tr>';

    const res = await API.get('/analytics/alumni');

    // Proxy unwraps {success, data} → raw array
    const alumni = Array.isArray(res.data) ? res.data : (res.data?.data || []);

    if (!res.ok) {
        if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="padding:3rem;text-align:center;color:var(--danger);">Failed to load alumni. Check API connection.</td></tr>';
        return;
    }

    // Update stat cards
    const totalEl = document.getElementById('alumni-total-count');
    const verifiedEl = document.getElementById('alumni-verified-count');
    const profileEl = document.getElementById('alumni-profile-count');
    if (totalEl) totalEl.textContent = alumni.length;
    if (verifiedEl) verifiedEl.textContent = alumni.filter(a => a.is_verified).length;
    if (profileEl) profileEl.textContent = alumni.filter(a => a.biography).length;

    if (alumni.length === 0) {
        if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="padding:3rem;text-align:center;color:var(--text-muted);">No alumni registered yet.</td></tr>';
        return;
    }

    window._alumniData = alumni;
    renderAlumniTable(alumni);

    // Live search
    const searchEl = document.getElementById('alumni-search');
    if (searchEl) {
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
