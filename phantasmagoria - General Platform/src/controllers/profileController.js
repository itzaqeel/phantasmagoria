// src/controllers/profileController.js
// Handles all alumni profile operations
// Includes: personal info, LinkedIn, degrees, certs, licences, courses, employment, image upload

const { pool } = require('../config/db');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');

// ─────────────────────────────────────────────
// GET FULL PROFILE
// GET /api/profile/:id
// Returns profile + all nested sections in one response
// ─────────────────────────────────────────────
async function getProfile(req, res) {
  const profileId = req.params.id;
  const todayDate = new Date().toISOString().split('T')[0];
  const yearMonth = todayDate.substring(0, 7); // YYYY-MM

  try {
    // Fetch all sections + monthly wins 
    const [
      [profileData],
      [degrees],
      [certifications],
      [licences],
      [courses],
      [employment],
      [monthlyWinsStats],
    ] = await Promise.all([
      pool.query(`
        SELECT p.*, u.email 
        FROM profiles p 
        JOIN users u ON p.user_id = u.id 
        WHERE p.id = ?`, [profileId]),
      pool.query('SELECT * FROM degrees WHERE profile_id = ? ORDER BY completion_date DESC', [profileId]),
      pool.query('SELECT * FROM certifications WHERE profile_id = ? ORDER BY completion_date DESC', [profileId]),
      pool.query('SELECT * FROM licences WHERE profile_id = ? ORDER BY completion_date DESC', [profileId]),
      pool.query('SELECT * FROM courses WHERE profile_id = ? ORDER BY completion_date DESC', [profileId]),
      pool.query('SELECT * FROM employment WHERE profile_id = ? ORDER BY start_date DESC', [profileId]),
      pool.query('SELECT win_count FROM monthly_wins WHERE user_id = (SELECT user_id FROM profiles WHERE id = ?) AND `year_month` = ?', [profileId, yearMonth]),
    ]);

    if (!profileData || profileData.length === 0) {
      console.warn(`[DIAGNOSTIC] Profile ${profileId} not found in DB.`);
      return res.status(404).json({ success: false, message: 'Profile not found.' });
    }

    // 4th WIN RULE
    const userMonthlyWinCount = monthlyWinsStats.length > 0 ? monthlyWinsStats[0].win_count : 0;
    const maxWins = profileData[0].has_event_participation ? 4 : 3;
    const remainingWins = Math.max(0, maxWins - userMonthlyWinCount);

    // Don't expose sensitive fields
    const { password_hash, verify_token, reset_token, ...safeProfile } = profileData[0];

    res.json({
      success: true,
      data: {
        ...safeProfile,
        remaining_wins: remainingWins,
        total_monthly_wins: userMonthlyWinCount,
        degrees,
        certifications,
        licences,
        courses,
        employment,
      },
    });

  } catch (profileOperationError) {
    console.error('Get profile error:', profileOperationError);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─────────────────────────────────────────────
// GET MY PROFILE (logged-in user's own profile)
// GET /api/profile/me
// ─────────────────────────────────────────────
async function getMyProfile(req, res) {
  try {
    const userId = req.user.id;
    
    // ATOMIC SELECT OR CREATE
    let [rows] = await pool.query('SELECT id FROM profiles WHERE user_id = ?', [userId]);
    
    if (rows.length === 0) {
      console.log(`[Auto-Healing] Creating missing profile for user ${userId}`);
      await pool.query('INSERT IGNORE INTO profiles (user_id) VALUES (?)', [userId]);
      [rows] = await pool.query('SELECT id FROM profiles WHERE user_id = ?', [userId]);
    }

    if (rows.length === 0) {
      throw new Error('Critical: Profile creation failed.');
    }

    // Set ID for getProfile
    req.params.id = rows[0].id;
    return getProfile(req, res);

  } catch (error) {
    console.error('Get my profile error:', error);
    res.status(500).json({ success: false, message: 'Server error loading profile.' });
  }
}

// ─────────────────────────────────────────────
// UPDATE PERSONAL INFO
// PUT /api/profile/me
// Updates: first_name, last_name, biography, linkedin_url
// ─────────────────────────────────────────────
async function updateProfile(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { first_name, last_name, biography, linkedin_url } = req.body;

  try {
    const profileId = await getProfileId(req.user.id);

    await pool.query(
      `UPDATE profiles SET first_name = ?, last_name = ?, biography = ?, linkedin_url = ?
       WHERE user_id = ?`,
      [first_name, last_name, biography, linkedin_url, req.user.id]
    );

    res.json({ success: true, message: 'Profile updated successfully.' });

  } catch (profileOperationError) {
    console.error('Update profile error:', profileOperationError);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─────────────────────────────────────────────
// UPDATE LINKEDIN URL
// PATCH /api/profile/me/linkedin
// ─────────────────────────────────────────────
async function updateLinkedIn(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const { linkedin_url } = req.body;

  try {
    await pool.query('UPDATE profiles SET linkedin_url = ? WHERE user_id = ?', [linkedin_url, req.user.id]);
    res.json({ success: true, message: 'LinkedIn URL updated.' });
  } catch (profileOperationError) {
    console.error('Update linkedin error:', profileOperationError);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─────────────────────────────────────────────
// UPLOAD PROFILE IMAGE
// POST /api/profile/me/image
// Uses multer (configured in routes file)
// ─────────────────────────────────────────────
async function uploadImage(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file provided.' });
    }

    const imagePath = `/uploads/${req.file.filename}`;

    // Delete old image file if it exists (avoid filling up disk)
    const profileId = await getProfileId(req.user.id);
    const [profileRows] = await pool.query('SELECT profile_image FROM profiles WHERE id = ?', [profileId]);
    if (profileRows[0]?.profile_image) {
      const oldPath = path.join(__dirname, '../../', profileRows[0].profile_image);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    await pool.query('UPDATE profiles SET profile_image = ? WHERE user_id = ?', [imagePath, req.user.id]);

    res.json({ success: true, message: 'Profile image uploaded.', image_url: imagePath });

  } catch (profileOperationError) {
    console.error('Upload image error:', profileOperationError);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}


// ─────────────────────────────────────────────
// DEGREES
// POST   /api/profile/me/degrees       → add degree
// DELETE /api/profile/me/degrees/:id   → remove degree
// ─────────────────────────────────────────────
async function addDegree(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  try {
    const profileId = await getProfileId(req.user.id);
    const { title, institution, degree_url, completion_date } = req.body;

    const [result] = await pool.query(
      'INSERT INTO degrees (profile_id, title, institution, degree_url, completion_date) VALUES (?, ?, ?, ?, ?)',
      [profileId, title, institution, degree_url, completion_date]
    );

    res.status(201).json({ success: true, message: 'Degree added.', id: result.insertId });
  } catch (profileOperationError) {
    console.error('Add degree error:', profileOperationError);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

async function deleteDegree(req, res) {
  try {
    const profileId = await getProfileId(req.user.id);
    const { id } = req.params;

    // Make sure the degree belongs to this user's profile
    const [rows] = await pool.query('SELECT id FROM degrees WHERE id = ? AND profile_id = ?', [id, profileId]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Degree not found.' });

    await pool.query('DELETE FROM degrees WHERE id = ?', [id]);
    res.json({ success: true, message: 'Degree deleted.' });
  } catch (profileOperationError) {
    console.error('Delete degree error:', profileOperationError);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

async function updateDegree(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  try {
    const profileId = await getProfileId(req.user.id);
    const { id } = req.params;
    const { title, institution, degree_url, completion_date } = req.body;

    const [rows] = await pool.query('SELECT id FROM degrees WHERE id = ? AND profile_id = ?', [id, profileId]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Degree not found.' });

    await pool.query(
      'UPDATE degrees SET title = ?, institution = ?, degree_url = ?, completion_date = ? WHERE id = ?',
      [title, institution, degree_url, completion_date, id]
    );

    res.json({ success: true, message: 'Degree updated.' });
  } catch (profileOperationError) {
    console.error('Update degree error:', profileOperationError);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─────────────────────────────────────────────
// CERTIFICATIONS
// POST   /api/profile/me/certifications
// DELETE /api/profile/me/certifications/:id
// ─────────────────────────────────────────────
async function addCertification(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  try {
    const profileId = await getProfileId(req.user.id);
    const { title, cert_url, completion_date } = req.body;

    const [result] = await pool.query(
      'INSERT INTO certifications (profile_id, title, cert_url, completion_date) VALUES (?, ?, ?, ?)',
      [profileId, title, cert_url, completion_date]
    );

    res.status(201).json({ success: true, message: 'Certification added.', id: result.insertId });
  } catch (profileOperationError) {
    console.error('Add certification error:', profileOperationError);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

async function deleteCertification(req, res) {
  try {
    const profileId = await getProfileId(req.user.id);
    const [rows] = await pool.query('SELECT id FROM certifications WHERE id = ? AND profile_id = ?', [req.params.id, profileId]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Certification not found.' });

    await pool.query('DELETE FROM certifications WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Certification deleted.' });
  } catch (profileOperationError) {
    console.error('Delete certification error:', profileOperationError);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

async function updateCertification(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  try {
    const profileId = await getProfileId(req.user.id);
    const { id } = req.params;
    const { title, cert_url, completion_date } = req.body;

    const [rows] = await pool.query('SELECT id FROM certifications WHERE id = ? AND profile_id = ?', [id, profileId]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Certification not found.' });

    await pool.query(
      'UPDATE certifications SET title = ?, cert_url = ?, completion_date = ? WHERE id = ?',
      [title, cert_url, completion_date, id]
    );

    res.json({ success: true, message: 'Certification updated.' });
  } catch (profileOperationError) {
    console.error('Update certification error:', profileOperationError);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─────────────────────────────────────────────
// LICENCES
// POST   /api/profile/me/licences
// DELETE /api/profile/me/licences/:id
// ─────────────────────────────────────────────
async function addLicence(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  try {
    const profileId = await getProfileId(req.user.id);
    const { title, awarding_body, licence_url, completion_date } = req.body;

    const [result] = await pool.query(
      'INSERT INTO licences (profile_id, title, awarding_body, licence_url, completion_date) VALUES (?, ?, ?, ?, ?)',
      [profileId, title, awarding_body, licence_url, completion_date]
    );

    res.status(201).json({ success: true, message: 'Licence added.', id: result.insertId });
  } catch (profileOperationError) {
    console.error('Add licence error:', profileOperationError);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

async function deleteLicence(req, res) {
  try {
    const profileId = await getProfileId(req.user.id);
    const [rows] = await pool.query('SELECT id FROM licences WHERE id = ? AND profile_id = ?', [req.params.id, profileId]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Licence not found.' });

    await pool.query('DELETE FROM licences WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Licence deleted.' });
  } catch (profileOperationError) {
    console.error('Delete licence error:', profileOperationError);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

async function updateLicence(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  try {
    const profileId = await getProfileId(req.user.id);
    const { id } = req.params;
    const { title, awarding_body, licence_url, completion_date } = req.body;

    const [rows] = await pool.query('SELECT id FROM licences WHERE id = ? AND profile_id = ?', [id, profileId]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Licence not found.' });

    await pool.query(
      'UPDATE licences SET title = ?, awarding_body = ?, licence_url = ?, completion_date = ? WHERE id = ?',
      [title, awarding_body, licence_url, completion_date, id]
    );

    res.json({ success: true, message: 'Licence updated.' });
  } catch (profileOperationError) {
    console.error('Update licence error:', profileOperationError);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─────────────────────────────────────────────
// SHORT COURSES
// POST   /api/profile/me/courses
// DELETE /api/profile/me/courses/:id
// ─────────────────────────────────────────────
async function addCourse(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  try {
    const profileId = await getProfileId(req.user.id);
    const { title, course_url, completion_date } = req.body;

    const [result] = await pool.query(
      'INSERT INTO courses (profile_id, title, course_url, completion_date) VALUES (?, ?, ?, ?)',
      [profileId, title, course_url, completion_date]
    );

    res.status(201).json({ success: true, message: 'Course added.', id: result.insertId });
  } catch (profileOperationError) {
    console.error('Add course error:', profileOperationError);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

async function deleteCourse(req, res) {
  try {
    const profileId = await getProfileId(req.user.id);
    const [rows] = await pool.query('SELECT id FROM courses WHERE id = ? AND profile_id = ?', [req.params.id, profileId]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Course not found.' });

    await pool.query('DELETE FROM courses WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Course deleted.' });
  } catch (profileOperationError) {
    console.error('Delete course error:', profileOperationError);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

async function updateCourse(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  try {
    const profileId = await getProfileId(req.user.id);
    const { id } = req.params;
    const { title, course_url, completion_date } = req.body;

    const [rows] = await pool.query('SELECT id FROM courses WHERE id = ? AND profile_id = ?', [id, profileId]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Course not found.' });

    await pool.query(
      'UPDATE courses SET title = ?, course_url = ?, completion_date = ? WHERE id = ?',
      [title, course_url, completion_date, id]
    );

    res.json({ success: true, message: 'Course updated.' });
  } catch (profileOperationError) {
    console.error('Update course error:', profileOperationError);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─────────────────────────────────────────────
// EMPLOYMENT HISTORY
// POST   /api/profile/me/employment
// DELETE /api/profile/me/employment/:id
// ─────────────────────────────────────────────
async function addEmployment(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  try {
    const profileId = await getProfileId(req.user.id);
    const { company, role, start_date, end_date } = req.body;

    const [result] = await pool.query(
      'INSERT INTO employment (profile_id, company, role, start_date, end_date) VALUES (?, ?, ?, ?, ?)',
      [profileId, company, role, start_date, end_date || null] // end_date NULL = current job
    );

    res.status(201).json({ success: true, message: 'Employment added.', id: result.insertId });
  } catch (profileOperationError) {
    console.error('Add employment error:', profileOperationError);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

async function deleteEmployment(req, res) {
  try {
    const profileId = await getProfileId(req.user.id);
    const [rows] = await pool.query('SELECT id FROM employment WHERE id = ? AND profile_id = ?', [req.params.id, profileId]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Employment record not found.' });

    await pool.query('DELETE FROM employment WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Employment record deleted.' });
  } catch (profileOperationError) {
    console.error('Delete employment error:', profileOperationError);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

async function updateEmployment(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  try {
    const profileId = await getProfileId(req.user.id);
    const { id } = req.params;
    const { company, role, start_date, end_date } = req.body;

    const [rows] = await pool.query('SELECT id FROM employment WHERE id = ? AND profile_id = ?', [id, profileId]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Employment record not found.' });

    await pool.query(
      'UPDATE employment SET company = ?, role = ?, start_date = ?, end_date = ? WHERE id = ?',
      [company, role, start_date, end_date || null, id]
    );

    res.json({ success: true, message: 'Employment record updated.' });
  } catch (profileOperationError) {
    console.error('Update employment error:', profileOperationError);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─────────────────────────────────────────────
// GET PROFILE COMPLETION STATUS
// GET /api/profile/me/completion
//
// Weighted scoring across 7 sections:
//   first_name + last_name   → 20 pts  (core identity)
//   biography                → 15 pts
//   linkedin_url             → 10 pts
//   profile_image            → 15 pts
//   degrees (≥1)             → 15 pts
//   employment (≥1)          → 15 pts
//   certs/licences/courses   → 10 pts  (any one counts)
//   Total                    → 100 pts
// ─────────────────────────────────────────────
async function getCompletionStatus(req, res) {
  try {
    const profileId = await getProfileId(req.user.id);

    const [
      [profileRows],
      [degrees],
      [certs],
      [licences],
      [courses],
      [employment],
    ] = await Promise.all([
      pool.query('SELECT first_name, last_name, biography, linkedin_url, profile_image FROM profiles WHERE id = ?', [profileId]),
      pool.query('SELECT id FROM degrees WHERE profile_id = ?', [profileId]),
      pool.query('SELECT id FROM certifications WHERE profile_id = ?', [profileId]),
      pool.query('SELECT id FROM licences WHERE profile_id = ?', [profileId]),
      pool.query('SELECT id FROM courses WHERE profile_id = ?', [profileId]),
      pool.query('SELECT id FROM employment WHERE profile_id = ?', [profileId]),
    ]);

    const profileRecord = profileRows[0];

    const sections = [
      {
        key: 'basic_info',
        label: 'Name',
        weight: 20,
        complete: !!(profileRecord.first_name && profileRecord.first_name.trim() && profileRecord.last_name && profileRecord.last_name.trim()),
        hint: 'Add your first and last name.',
      },
      {
        key: 'biography',
        label: 'Biography',
        weight: 15,
        complete: !!(profileRecord.biography && profileRecord.biography.trim().length >= 20),
        hint: 'Write at least a short biography (20+ characters).',
      },
      {
        key: 'linkedin',
        label: 'LinkedIn',
        weight: 10,
        complete: !!(profileRecord.linkedin_url && profileRecord.linkedin_url.trim()),
        hint: 'Add your LinkedIn profile URL.',
      },
      {
        key: 'profile_image',
        label: 'Profile Photo',
        weight: 15,
        complete: !!(profileRecord.profile_image && profileRecord.profile_image.trim()),
        hint: 'Upload a profile photo.',
      },
      {
        key: 'degrees',
        label: 'Degree',
        weight: 15,
        complete: degrees.length > 0,
        hint: 'Add at least one academic degree.',
      },
      {
        key: 'employment',
        label: 'Employment',
        weight: 15,
        complete: employment.length > 0,
        hint: 'Add at least one employment record.',
      },
      {
        key: 'qualifications',
        label: 'Certifications / Licences / Courses',
        weight: 10,
        complete: (certs.length + licences.length + courses.length) > 0,
        hint: 'Add at least one certification, licence, or course.',
      },
    ];

    const earned = sections.filter(s => s.complete).reduce((sum, s) => sum + s.weight, 0);
    const percent = earned; // weights sum to 100

    return res.json({
      success: true,
      percent,
      label: percent === 100 ? 'Complete' : percent >= 60 ? 'Good' : percent >= 30 ? 'Getting there' : 'Just started',
      sections: sections.map(({ key, label, weight, complete, hint }) => ({ key, label, weight, complete, hint: complete ? null : hint })),
      missing: sections.filter(s => !s.complete).map(s => s.hint),
    });

  } catch (profileOperationError) {
    console.error('Get completion status error:', profileOperationError);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─────────────────────────────────────────────
// HELPER: GET PROFILE ID FROM USER ID (Auto-Healing)
// ─────────────────────────────────────────────
async function getProfileId(userId) {
  const [rows] = await pool.query('SELECT id FROM profiles WHERE user_id = ?', [userId]);
  
  if (rows.length === 0) {
    console.log(`[Auto-Healing] Creating missing profile for user ${userId}`);
    await pool.query('INSERT IGNORE INTO profiles (user_id) VALUES (?)', [userId]);
    const [newRows] = await pool.query('SELECT id FROM profiles WHERE user_id = ?', [userId]);
    return newRows[0].id;
  }
  
  return rows[0].id;
}

module.exports = {
  getProfile,
  getMyProfile,
  updateProfile,
  uploadImage,
  addDegree, deleteDegree, updateDegree,
  addCertificate: addCertification,
  addCertification, deleteCertification, updateCertification,
  addLicence, deleteLicence, updateLicence,
  addCourse, deleteCourse, updateCourse,
  addEmployment, deleteEmployment, updateEmployment,
  updateLinkedIn,
  getCompletionStatus,
};

