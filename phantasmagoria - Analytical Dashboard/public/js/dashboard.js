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
                'security': 'API Security & Scoping'
            };
            document.getElementById('view-title').textContent = titleMap[view] || 'Dashboard';
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
    await refreshSecurityData();

    // Export Handlers
    setupExportHandlers();
    setupSecurityHandlers();
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
    // CSV Export
    document.querySelectorAll('.btn-secondary').forEach(btn => {
        if (btn.textContent.includes('CSV')) {
            btn.addEventListener('click', () => exportToCSV());
        }
        if (btn.textContent.includes('PDF')) {
            btn.addEventListener('click', () => exportToPDF());
        }
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

// --- Security & Scoping Logic ---

async function refreshSecurityData() {
    const res = await API.get('/admin/tokens');
    if (res.ok && res.data.tokens) {
        renderTokenList(res.data.tokens);
    }
    
    // Usage logs usually require a token ID, but we can show recent logs for all tokens if backend supports
    // For now we'll fetch logs for the first token as an example
    if (res.data.tokens && res.data.tokens.length > 0) {
        const usageRes = await API.get(`/admin/tokens/${res.data.tokens[0].id}/usage`);
        if (usageRes.ok) {
            renderUsageLogs(usageRes.data.recent_logs);
        }
    }
}

function renderTokenList(tokens) {
    const container = document.getElementById('token-list');
    if (!container) return;
    
    container.innerHTML = tokens.map(token => `
        <tr>
            <td style="padding: 1rem;">
                <div class="fw-600">${token.token_name}</div>
                <div class="text-xs text-muted">Created ${new Date(token.created_at).toLocaleDateString()}</div>
            </td>
            <td style="padding: 1rem;">
                ${JSON.parse(token.permissions || '[]').map(p => `<span class="status-badge" style="background: rgba(251,191,36,0.1); color: var(--accent); margin-right: 0.25rem;">${p}</span>`).join('')}
            </td>
            <td style="padding: 1rem;">${token.last_used_at ? new Date(token.last_used_at).toLocaleTimeString() : 'Never'}</td>
            <td style="padding: 1rem;">
                <button class="btn btn-sm btn-danger" onclick="handleRevokeToken(${token.id})" ${token.is_revoked ? 'disabled' : ''}>
                    ${token.is_revoked ? 'Revoked' : 'Revoke'}
                </button>
            </td>
        </tr>
    `).join('');
}

function renderUsageLogs(logs) {
    const container = document.getElementById('usage-logs');
    if (!container) return;
    
    container.innerHTML = logs.map(log => `
        <tr>
            <td style="padding: 1rem;">${new Date(log.accessed_at).toLocaleString()}</td>
            <td style="padding: 1rem;"><code style="background: rgba(255,255,255,0.05); padding: 2px 4px; border-radius: 4px;">${log.endpoint}</code></td>
            <td style="padding: 1rem;">${log.ip_address}</td>
            <td style="padding: 1rem;"><span style="color: var(--success);">200 OK</span></td>
        </tr>
    `).join('');
}

function setupSecurityHandlers() {
    document.getElementById('btn-create-token')?.addEventListener('click', async () => {
        const name = prompt("Enter Application Name:");
        if (!name) return;
        
        const permsInput = prompt("Enter Scopes (comma separated, e.g. read:alumni,read:analytics):", "read:alumni");
        const permissions = permsInput ? permsInput.split(',').map(p => p.trim()) : ['read:alumni'];
        
        const res = await API.post('/admin/tokens', { token_name: name, permissions });
        if (res.ok) {
            alert(`Token Generated Successfully!\n\nRAW TOKEN: ${res.data.api_token}\n\nWARNING: This will never be shown again. Copy it now.`);
            refreshSecurityData();
        } else {
            alert("Error generating token: " + res.data.message);
        }
    });
}

async function handleRevokeToken(id) {
    if (!confirm("Are you sure you want to revoke this key immediately? This cannot be undone.")) return;
    
    const res = await API.request(`/admin/tokens/${id}`, 'DELETE');
    if (res.ok) {
        refreshSecurityData();
    } else {
        alert("Error revoking token.");
    }
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
