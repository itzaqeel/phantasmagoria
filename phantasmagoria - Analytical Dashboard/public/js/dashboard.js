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
                loadAlumniData();
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

// --- Alumni Analytics ---

// Track chart instances so we can destroy and re-render on filter change
const alumniCharts = {};

async function loadAlumniData() {
    const programme = document.getElementById('filter-programme')?.value.trim() || '';
    const year = document.getElementById('filter-year')?.value.trim() || '';
    const loadingEl = document.getElementById('alumni-loading');
    if (loadingEl) loadingEl.style.display = 'inline';

    const params = new URLSearchParams();
    if (programme) params.set('programme', programme);
    if (year) params.set('gradYear', year);
    const qs = params.toString() ? `?${params.toString()}` : '';

    // Fetch all alumni endpoints in parallel
    const [employmentRes, jobTitlesRes, employersRes, geoRes, skillsRes] = await Promise.all([
        API.get(`/analytics/employment-by-industry${qs}`),
        API.get(`/analytics/top-job-titles${qs}`),
        API.get(`/analytics/top-employers${qs}`),
        API.get('/analytics/geographic'),
        API.get('/analytics/skills-gap')
    ]);

    if (loadingEl) loadingEl.style.display = 'none';

    // The analytics proxy unwraps response.data.data, so these endpoints return arrays directly
    const empData = Array.isArray(employmentRes.data) ? employmentRes.data : (employmentRes.data?.data || []);
    if (employmentRes.ok && empData.length >= 0) {
        renderAlumniBarChart('employmentChart', alumniCharts,
            empData.map(r => r.sector || r.role || 'Unknown'),
            empData.map(r => r.count),
            'Alumni Count', true);
    }

    const jobData = Array.isArray(jobTitlesRes.data) ? jobTitlesRes.data : (jobTitlesRes.data?.data || []);
    if (jobTitlesRes.ok && jobData.length >= 0) {
        renderAlumniBarChart('jobTitlesChart', alumniCharts,
            jobData.map(r => r.title || r.role || 'Unknown'),
            jobData.map(r => r.count),
            'Alumni Count', true);
    }

    const emprsData = Array.isArray(employersRes.data) ? employersRes.data : (employersRes.data?.data || []);
    if (employersRes.ok && emprsData.length >= 0) {
        renderAlumniBarChart('employersChart', alumniCharts,
            emprsData.map(r => r.company || 'Unknown'),
            emprsData.map(r => r.count),
            'Alumni Count', false);
    }

    const geoData = Array.isArray(geoRes.data) ? geoRes.data : (geoRes.data?.data || []);
    if (geoRes.ok && geoData.length >= 0) {
        renderAlumniBarChart('geoAlumniChart', alumniCharts,
            geoData.map(r => r.location || r.company || 'Unknown'),
            geoData.map(r => r.count),
            'Alumni Count', false);
    }

    // Render skills table (skills-gap is NOT unwrapped — returns {success, certifications, courses} directly)
    const skillsData = skillsRes.data?.certifications ? skillsRes.data : (skillsRes.data?.data || skillsRes.data || {});
    if (skillsRes.ok && skillsData) {
        const tbody = document.getElementById('skills-table-body');
        const combined = [
            ...(skillsData.certifications || []),
            ...(skillsData.courses || [])
        ].sort((a, b) => b.count - a.count);

        if (tbody) {
            if (combined.length === 0) {
                tbody.innerHTML = `<tr><td colspan="2" style="padding: 2rem; text-align: center; color: var(--text-muted);">No certification or course data available yet.</td></tr>`;
            } else {
                tbody.innerHTML = combined.map((item, i) => `
                    <tr style="border-bottom: 1px solid var(--border);">
                        <td style="padding: 0.75rem 1rem;">
                            <span style="display:inline-block; width:24px; height:24px; border-radius:50%; background:rgba(251,191,36,0.15); color:var(--accent); font-size:0.75rem; font-weight:700; text-align:center; line-height:24px; margin-right:0.75rem;">${i + 1}</span>
                            ${item.title}
                        </td>
                        <td style="padding: 0.75rem 1rem; text-align: right; font-weight: 600; color: var(--accent);">${item.count}</td>
                    </tr>
                `).join('');
            }
        }
    }
}

function renderAlumniBarChart(canvasId, chartStore, labels, values, dataLabel, horizontal) {
    // Destroy previous instance to avoid duplication
    if (chartStore[canvasId]) {
        chartStore[canvasId].destroy();
    }
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;

    const hasData = values.length > 0;
    chartStore[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: hasData ? labels : ['No data yet'],
            datasets: [{
                label: dataLabel,
                data: hasData ? values : [0],
                backgroundColor: '#fbbf24',
                borderRadius: 6
            }]
        },
        options: {
            indexAxis: horizontal ? 'y' : 'x',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.04)' }, beginAtZero: true },
                y: { grid: { display: false } }
            }
        }
    });
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
