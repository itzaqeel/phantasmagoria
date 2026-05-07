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
                'bidding': 'Blind Bidding Trends',
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
    renderBiddingChart(data.biddingTrends);
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

function renderBiddingChart(data) {
    const ctx = document.getElementById('biddingChart').getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(251, 191, 36, 0.4)');
    gradient.addColorStop(1, 'rgba(251, 191, 36, 0)');

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Bids Placed',
                data: data.values,
                borderColor: '#fbbf24',
                backgroundColor: gradient,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#fbbf24'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.04)' } },
                x: { grid: { display: false } }
            }
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
