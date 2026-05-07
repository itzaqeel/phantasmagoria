const { pool } = require('../config/db');

async function skillsGap(req, res) {
  try {
    const { programme, gradYear } = req.query;
    let subFilter = '';
    const params  = [];

    if (programme || gradYear) {
      subFilter = `AND p.id IN (
        SELECT d.profile_id FROM degrees d WHERE 1=1
        ${programme ? 'AND d.title LIKE ?' : ''}
        ${gradYear  ? 'AND YEAR(d.completion_date) = ?' : ''}
      )`;
      if (programme) params.push(`%${programme}%`);
      if (gradYear)  params.push(parseInt(gradYear));
    }

    const [certRows] = await pool.query(
      `SELECT c.title, COUNT(*) AS count
       FROM certifications c
       JOIN profiles p ON c.profile_id = p.id
       JOIN users u ON p.user_id = u.id
       WHERE u.is_verified = 1 ${subFilter}
       GROUP BY c.title ORDER BY count DESC LIMIT 20`,
      params
    );

    const [courseRows] = await pool.query(
      `SELECT co.title, COUNT(*) AS count
       FROM courses co
       JOIN profiles p ON co.profile_id = p.id
       JOIN users u ON p.user_id = u.id
       WHERE u.is_verified = 1 ${subFilter}
       GROUP BY co.title ORDER BY count DESC LIMIT 20`,
      params
    );

    res.json({ success: true, certifications: certRows, courses: courseRows });
  } catch (err) {
    console.error('skillsGap error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

async function employmentByIndustry(req, res) {
  try {
    const { programme, gradYear } = req.query;
    let subFilter = '';
    const params  = [];

    if (programme || gradYear) {
      subFilter = `AND e.profile_id IN (
        SELECT d.profile_id FROM degrees d WHERE 1=1
        ${programme ? 'AND d.title LIKE ?' : ''}
        ${gradYear  ? 'AND YEAR(d.completion_date) = ?' : ''}
      )`;
      if (programme) params.push(`%${programme}%`);
      if (gradYear)  params.push(parseInt(gradYear));
    }

    const [rows] = await pool.query(
      `SELECT e.role AS sector, COUNT(*) AS count
       FROM employment e
       JOIN profiles p ON e.profile_id = p.id
       JOIN users u ON p.user_id = u.id
       WHERE u.is_verified = 1 ${subFilter}
       GROUP BY e.role ORDER BY count DESC LIMIT 15`,
      params
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('employmentByIndustry error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

async function topJobTitles(req, res) {
  try {
    const { programme, gradYear } = req.query;
    let subFilter = '';
    const params  = [];

    if (programme || gradYear) {
      subFilter = `AND e.profile_id IN (
        SELECT d.profile_id FROM degrees d WHERE 1=1
        ${programme ? 'AND d.title LIKE ?' : ''}
        ${gradYear  ? 'AND YEAR(d.completion_date) = ?' : ''}
      )`;
      if (programme) params.push(`%${programme}%`);
      if (gradYear)  params.push(parseInt(gradYear));
    }

    const [rows] = await pool.query(
      `SELECT e.role AS title, COUNT(*) AS count
       FROM employment e
       JOIN profiles p ON e.profile_id = p.id
       JOIN users u ON p.user_id = u.id
       WHERE u.is_verified = 1 ${subFilter}
       GROUP BY e.role ORDER BY count DESC LIMIT 10`,
      params
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('topJobTitles error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

async function topEmployers(req, res) {
  try {
    const n = Math.min(parseInt(req.query.n) || 10, 50);
    const { programme, gradYear } = req.query;
    let subFilter = '';
    const params  = [];

    if (programme || gradYear) {
      subFilter = `AND e.profile_id IN (
        SELECT d.profile_id FROM degrees d WHERE 1=1
        ${programme ? 'AND d.title LIKE ?' : ''}
        ${gradYear  ? 'AND YEAR(d.completion_date) = ?' : ''}
      )`;
      if (programme) params.push(`%${programme}%`);
      if (gradYear)  params.push(parseInt(gradYear));
    }
    params.push(n);

    const [rows] = await pool.query(
      `SELECT e.company, COUNT(*) AS count
       FROM employment e
       JOIN profiles p ON e.company IS NOT NULL
       JOIN users u ON p.user_id = u.id
       WHERE u.is_verified = 1 ${subFilter}
       GROUP BY e.company ORDER BY count DESC LIMIT ?`,
      params
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('topEmployers error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

async function geographic(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT e.company AS location, COUNT(*) AS count
       FROM employment e
       JOIN profiles p ON e.profile_id = p.id
       JOIN users u ON p.user_id = u.id
       WHERE u.is_verified = 1
       GROUP BY e.company ORDER BY count DESC LIMIT 20`
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('geographic error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

async function overview(req, res) {
  try {
    const [alumniCount] = await pool.query('SELECT COUNT(*) AS count FROM users WHERE role = "alumni" AND is_verified = 1');
    const [activeBids]  = await pool.query('SELECT COUNT(*) AS count FROM bids WHERE status = "active"');
    const [revenue]     = await pool.query('SELECT SUM(amount) AS total FROM bids WHERE status = "active"');
    const [certCount]   = await pool.query('SELECT COUNT(*) AS count FROM certifications');
    const [degCount]    = await pool.query('SELECT COUNT(*) AS count FROM degrees');

    // Degree distribution for Analytics charts
    const [degreeRows] = await pool.query('SELECT title, COUNT(*) as count FROM degrees GROUP BY title ORDER BY count DESC LIMIT 5');

    // Graduation trends — all degrees, grouped by completion year (NULL = Undated)
    const [gradTrends] = await pool.query(
      `SELECT COALESCE(CAST(YEAR(completion_date) AS CHAR), 'Undated') AS year,
              COUNT(*) AS count
       FROM degrees
       GROUP BY year
       ORDER BY MIN(completion_date) ASC`
    );

    res.json({
      success: true,
      data: {
        totalAlumni:          alumniCount[0].count,
        totalCertifications:  certCount[0].count,
        totalDegrees:         degCount[0].count,
        activeBids:           activeBids[0].count,
        totalRevenue:         parseFloat(revenue[0].total || 0),
        apiHits:              0,
        degreeDist: {
          labels: degreeRows.map(r => r.title),
          values: degreeRows.map(r => r.count)
        },
        graduationTrends: {
          labels: gradTrends.map(r => String(r.year)),
          values: gradTrends.map(r => r.count)
        },
        // Fallbacks for other chart types
        geoDist:          { labels: ['UK', 'USA', 'SL', 'UAE'], values: [40, 20, 15, 10] },
        topBidders:       [],
        industryGrowth:   { labels: ['Tech', 'Finance'], values: [10, 5] },
        skillsGap:        { labels: ['A', 'B'], curriculum: [1, 2], industry: [3, 4] },
        salaryBenchmarks: { labels: ['2023'], values: [35000] },
        engagementTrends: { labels: ['W1'], values: [100] }
      }
    });
  } catch (err) {
    console.error('overview error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}


async function alumniList(req, res) {
  try {
    const { programme, gradYear, industry } = req.query;
    const conditions = ['u.role = "alumni"'];
    const params = [];

    if (programme) {
      conditions.push('p.id IN (SELECT profile_id FROM degrees WHERE title LIKE ?)');
      params.push(`%${programme}%`);
    }
    if (gradYear) {
      conditions.push('p.id IN (SELECT profile_id FROM degrees WHERE YEAR(completion_date) = ?)');
      params.push(parseInt(gradYear));
    }
    if (industry) {
      conditions.push('p.id IN (SELECT profile_id FROM employment WHERE role LIKE ?)');
      params.push(`%${industry}%`);
    }

    const [rows] = await pool.query(`
      SELECT u.id, u.email, u.role, u.is_verified, u.created_at,
             p.first_name, p.last_name, p.biography, p.linkedin_url,
             p.profile_image, p.is_featured_today
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY u.created_at DESC
    `, params);

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('alumniList error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

async function filterOptions(req, res) {
  try {
    const [programmes] = await pool.query(
      `SELECT DISTINCT title FROM degrees WHERE title IS NOT NULL AND title != '' ORDER BY title`
    );
    const [years] = await pool.query(
      `SELECT DISTINCT YEAR(completion_date) AS year FROM degrees WHERE completion_date IS NOT NULL ORDER BY year DESC`
    );
    const [industries] = await pool.query(
      `SELECT DISTINCT role FROM employment WHERE role IS NOT NULL AND role != '' ORDER BY role`
    );
    res.json({
      success: true,
      data: {
        programmes: programmes.map(r => r.title),
        years: years.map(r => r.year).filter(Boolean),
        industries: industries.map(r => r.role)
      }
    });
  } catch (err) {
    console.error('filterOptions error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}
async function employedVsUnemployed(req, res) {
  try {
    const { programme, gradYear } = req.query;
    const conditions = ['u.role = "alumni"'];
    const params = [];

    if (programme) {
      conditions.push('p.id IN (SELECT profile_id FROM degrees WHERE title LIKE ?)');
      params.push(`%${programme}%`);
    }
    if (gradYear) {
      conditions.push('p.id IN (SELECT profile_id FROM degrees WHERE YEAR(completion_date) = ?)');
      params.push(parseInt(gradYear));
    }

    const [[result]] = await pool.query(`
      SELECT
        COUNT(DISTINCT CASE WHEN curr.profile_id IS NOT NULL THEN u.id END) AS employed,
        COUNT(DISTINCT CASE WHEN curr.profile_id IS NULL     THEN u.id END) AS unemployed
      FROM users u
      JOIN profiles p ON p.user_id = u.id
      LEFT JOIN (
        SELECT DISTINCT profile_id FROM employment WHERE end_date IS NULL
      ) curr ON curr.profile_id = p.id
      WHERE ${conditions.join(' AND ')}
    `, params);

    res.json({ success: true, data: { employed: result.employed || 0, unemployed: result.unemployed || 0 } });
  } catch (err) {
    console.error('employedVsUnemployed error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

async function alumniProfile(req, res) {

  try {
    const { id } = req.params;
    const [users] = await pool.query(`
      SELECT u.id, u.email, u.role, u.is_verified, u.created_at,
             p.first_name, p.last_name, p.biography, p.linkedin_url, p.profile_image
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE u.id = ? AND u.role = 'alumni'
    `, [id]);

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'Alumni not found.' });
    }

    const alumni = users[0];
    const profileId = alumni.id; // will use user id to sub-query

    const [degrees] = await pool.query(
      `SELECT d.* FROM degrees d JOIN profiles p ON d.profile_id = p.id WHERE p.user_id = ?`,
      [id]
    );
    const [employment] = await pool.query(
      `SELECT e.* FROM employment e JOIN profiles p ON e.profile_id = p.id WHERE p.user_id = ?`,
      [id]
    );
    const [certifications] = await pool.query(
      `SELECT c.* FROM certifications c JOIN profiles p ON c.profile_id = p.id WHERE p.user_id = ?`,
      [id]
    );

    res.json({ success: true, data: { ...alumni, degrees, employment, certifications } });
  } catch (err) {
    console.error('alumniProfile error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

module.exports = { overview, skillsGap, employmentByIndustry, topJobTitles, topEmployers, geographic, alumniList, alumniProfile, filterOptions, employedVsUnemployed };
