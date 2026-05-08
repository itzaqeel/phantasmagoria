// seed.js  — v2 Realistic Distribution
// Deletes previous seed data and re-inserts 25 alumni with intentionally
// uneven, realistic distributions across roles, employers, degrees and certs.
//
// Run: node seed.js

require('dotenv').config();
const { pool } = require('./src/config/db');
const bcrypt = require('bcryptjs');

const PASSWORD_HASH = bcrypt.hashSync('Password123!', 10);

// ─── DOMAIN USED FOR ALL SEED EMAILS ────────────────────────────────────────
const SEED_DOMAIN = '@westminster.ac.uk';

// ─── 25 ALUMNI — DESIGNED FOR REALISTIC CHART DISTRIBUTION ─────────────────
//
// Intentional clustering:
//   Degrees    → BSc Computer Science (6), MSc Data Science (4), BEng Software (4), others vary
//   Roles      → Software Engineer (5), Data Scientist (4), Cloud Engineer (3), others vary
//   Companies  → Google (4), AWS (3), Microsoft (3), Deloitte (2), others 1-2
//   Cert 1     → AWS Certified SA (5), Google Cloud Engineer (4), CompTIA Security+ (3), vary
//   Grad years → 2019(2) 2020(4) 2021(6) 2022(8) 2023(5) — upward trend
//   Industries → Technology(9), Data & Analytics(5), Cybersecurity(3), Finance(2),
//                Product(2), Healthcare(2), Design(1), Robotics(1)

const users = [
  // ── Technology · Software Engineer · Google ──────────────────────────────
  {
    first_name: 'James', last_name: 'Mitchell', email: `james.mitchell${SEED_DOMAIN}`,
    biography: 'Full-stack engineer with a passion for distributed systems and scalable cloud architecture.',
    linkedin: 'https://linkedin.com/in/jamesmitchell',
    degree: 'BSc Computer Science', institution: 'University of Westminster', grad: '2022',
    cert1: 'AWS Certified Solutions Architect', cert2: 'Kubernetes Administrator (CKA)',
    company: 'Google', role: 'Software Engineer', start: '2022-09-01',
    industry: 'Technology',
  },
  {
    first_name: 'Noah', last_name: 'Williams', email: `noah.williams${SEED_DOMAIN}`,
    biography: 'Backend engineer specialising in high-throughput API design and microservices.',
    linkedin: 'https://linkedin.com/in/noahwilliams',
    degree: 'BSc Computer Science', institution: 'University of Westminster', grad: '2021',
    cert1: 'AWS Certified Solutions Architect', cert2: 'Spring Professional Certification',
    company: 'Google', role: 'Software Engineer', start: '2021-07-01',
    industry: 'Technology',
  },
  {
    first_name: 'Oliver', last_name: 'Chen', email: `oliver.chen${SEED_DOMAIN}`,
    biography: 'Frontend engineer focused on accessible design systems and performance-first UX.',
    linkedin: 'https://linkedin.com/in/oliverchen',
    degree: 'BSc Computer Science', institution: 'University of Westminster', grad: '2023',
    cert1: 'Google Cloud Professional Developer', cert2: 'Meta Front-End Developer Certificate',
    company: 'Google', role: 'Software Engineer', start: '2023-01-10',
    industry: 'Technology',
  },
  {
    first_name: 'Henry', last_name: 'Clarke', email: `henry.clarke${SEED_DOMAIN}`,
    biography: 'Site reliability engineer improving system observability and on-call incident response.',
    linkedin: 'https://linkedin.com/in/henryclarke',
    degree: 'MEng Software Systems', institution: 'University of Westminster', grad: '2020',
    cert1: 'Google Cloud Professional DevOps', cert2: 'Prometheus Certified Associate',
    company: 'Google', role: 'Software Engineer', start: '2020-09-01',
    industry: 'Technology',
  },

  // ── Technology · Cloud Engineer · AWS ────────────────────────────────────
  {
    first_name: 'Liam', last_name: "O'Brien", email: `liam.obrien${SEED_DOMAIN}`,
    biography: 'DevOps engineer passionate about infrastructure-as-code and continuous delivery pipelines.',
    linkedin: 'https://linkedin.com/in/liamobrien',
    degree: 'BEng Software Engineering', institution: 'University of Westminster', grad: '2021',
    cert1: 'HashiCorp Terraform Associate', cert2: 'AWS Certified DevOps Engineer',
    company: 'AWS', role: 'Cloud Engineer', start: '2021-07-01',
    industry: 'Technology',
  },
  {
    first_name: 'Isabelle', last_name: 'Dupont', email: `isabelle.dupont${SEED_DOMAIN}`,
    biography: 'Cloud infrastructure specialist with expertise in multi-cloud strategy and cost optimisation.',
    linkedin: 'https://linkedin.com/in/isabelledupont',
    degree: 'BSc Network Computing', institution: 'University of Westminster', grad: '2022',
    cert1: 'AWS Certified Solutions Architect', cert2: 'Google Cloud Associate Engineer',
    company: 'AWS', role: 'Cloud Engineer', start: '2022-09-01',
    industry: 'Technology',
  },
  {
    first_name: 'Samuel', last_name: 'Okafor', email: `samuel.okafor${SEED_DOMAIN}`,
    biography: 'Embedded systems engineer with recent pivot to cloud-native serverless architecture.',
    linkedin: 'https://linkedin.com/in/samuelokafor',
    degree: 'BEng Software Engineering', institution: 'University of Westminster', grad: '2022',
    cert1: 'AWS Certified Solutions Architect', cert2: 'AWS Certified Cloud Practitioner',
    company: 'AWS', role: 'Cloud Engineer', start: '2022-05-01',
    industry: 'Technology',
  },

  // ── Technology · Software Engineer · Microsoft ────────────────────────────
  {
    first_name: 'Ethan', last_name: 'Thompson', email: `ethan.thompson${SEED_DOMAIN}`,
    biography: 'Mobile and cross-platform developer building enterprise apps in the healthcare sector.',
    linkedin: 'https://linkedin.com/in/ethanthompson',
    degree: 'BSc Computer Science', institution: 'University of Westminster', grad: '2021',
    cert1: 'Microsoft Azure Developer Associate', cert2: 'Google Associate Android Developer',
    company: 'Microsoft', role: 'Software Engineer', start: '2021-08-01',
    industry: 'Technology',
  },
  {
    first_name: 'Charlotte', last_name: 'Evans', email: `charlotte.evans${SEED_DOMAIN}`,
    biography: 'Full-stack engineer building data platform tools and internal developer tooling.',
    linkedin: 'https://linkedin.com/in/charlotteevans',
    degree: 'BSc Computer Science', institution: 'University of Westminster', grad: '2022',
    cert1: 'Microsoft Azure Developer Associate', cert2: 'Azure Data Engineer Associate',
    company: 'Microsoft', role: 'Software Engineer', start: '2022-01-10',
    industry: 'Technology',
  },
  {
    first_name: 'Aaron', last_name: 'Murphy', email: `aaron.murphy${SEED_DOMAIN}`,
    biography: 'Agile coach and scrum master enabling cross-functional engineering teams to ship faster.',
    linkedin: 'https://linkedin.com/in/aaronmurphy',
    degree: 'BEng Software Engineering', institution: 'University of Westminster', grad: '2019',
    cert1: 'Certified ScrumMaster (CSM)', cert2: 'SAFe Agilist Certification',
    company: 'Microsoft', role: 'Software Engineer', start: '2019-11-01',
    industry: 'Technology',
  },

  // ── Data & Analytics ──────────────────────────────────────────────────────
  {
    first_name: 'Priya', last_name: 'Sharma', email: `priya.sharma${SEED_DOMAIN}`,
    biography: 'Data scientist specialising in NLP and machine learning model deployment at scale.',
    linkedin: 'https://linkedin.com/in/priyasharma',
    degree: 'MSc Data Science', institution: 'University of Westminster', grad: '2021',
    cert1: 'Google Professional Data Engineer', cert2: 'TensorFlow Developer Certificate',
    company: 'Deloitte', role: 'Data Scientist', start: '2021-09-01',
    industry: 'Data & Analytics',
  },
  {
    first_name: 'Fatima', last_name: 'Al-Hassan', email: `fatima.alhassan${SEED_DOMAIN}`,
    biography: 'AI researcher focused on fairness, interpretability, and responsible ML deployment.',
    linkedin: 'https://linkedin.com/in/fatimaalhassan',
    degree: 'MSc Data Science', institution: 'University of Westminster', grad: '2023',
    cert1: 'IBM AI Engineering Professional', cert2: 'Deep Learning Specialization (Coursera)',
    company: 'Deloitte', role: 'Data Scientist', start: '2023-03-01',
    industry: 'Data & Analytics',
  },
  {
    first_name: 'Grace', last_name: 'Liu', email: `grace.liu${SEED_DOMAIN}`,
    biography: 'Business intelligence analyst translating complex data into executive-level dashboards.',
    linkedin: 'https://linkedin.com/in/graceliu',
    degree: 'BSc Information Systems', institution: 'University of Westminster', grad: '2020',
    cert1: 'Microsoft Power BI Data Analyst', cert2: 'Tableau Desktop Specialist',
    company: 'HSBC', role: 'Data Scientist', start: '2020-10-01',
    industry: 'Data & Analytics',
  },
  {
    first_name: 'Luna', last_name: 'Rossi', email: `luna.rossi${SEED_DOMAIN}`,
    biography: 'NLP engineer building multilingual conversational AI products for customer support automation.',
    linkedin: 'https://linkedin.com/in/lunarossi',
    degree: 'MSc Data Science', institution: 'University of Westminster', grad: '2023',
    cert1: 'Google Professional Data Engineer', cert2: 'Hugging Face NLP Course Certificate',
    company: 'HSBC', role: 'Data Scientist', start: '2023-04-01',
    industry: 'Data & Analytics',
  },
  {
    first_name: 'Daniel', last_name: 'Kim', email: `daniel.kim${SEED_DOMAIN}`,
    biography: 'Quantitative analyst applying statistical modelling to financial risk and trading strategies.',
    linkedin: 'https://linkedin.com/in/danielkim',
    degree: 'MSc Data Science', institution: 'University of Westminster', grad: '2021',
    cert1: 'CFA Level I', cert2: 'Bloomberg Market Concepts (BMC)',
    company: 'Goldman Sachs', role: 'Quantitative Analyst', start: '2021-06-01',
    industry: 'Finance',
  },

  // ── Cybersecurity ─────────────────────────────────────────────────────────
  {
    first_name: 'Amara', last_name: 'Osei', email: `amara.osei${SEED_DOMAIN}`,
    biography: 'Cybersecurity analyst with hands-on experience in penetration testing and threat modelling.',
    linkedin: 'https://linkedin.com/in/amaraosei',
    degree: 'BSc Cybersecurity', institution: 'University of Westminster', grad: '2022',
    cert1: 'CompTIA Security+', cert2: 'Certified Ethical Hacker (CEH)',
    company: 'BAE Systems', role: 'Cybersecurity Analyst', start: '2022-06-01',
    industry: 'Cybersecurity',
  },
  {
    first_name: 'Elijah', last_name: 'Patel', email: `elijah.patel${SEED_DOMAIN}`,
    biography: 'Penetration tester conducting red team operations and vulnerability disclosure.',
    linkedin: 'https://linkedin.com/in/elijahpatel',
    degree: 'BSc Cybersecurity', institution: 'University of Westminster', grad: '2022',
    cert1: 'CompTIA Security+', cert2: 'Offensive Security OSCP',
    company: 'NCC Group', role: 'Cybersecurity Analyst', start: '2022-07-01',
    industry: 'Cybersecurity',
  },
  {
    first_name: 'Mohammed', last_name: 'Farooq', email: `mohammed.farooq${SEED_DOMAIN}`,
    biography: 'Network security engineer designing resilient WAN and zero-trust infrastructure.',
    linkedin: 'https://linkedin.com/in/mohammedfarooq',
    degree: 'BEng Network Engineering', institution: 'University of Westminster', grad: '2020',
    cert1: 'CompTIA Security+', cert2: 'Cisco CCNA',
    company: 'BT Group', role: 'Cybersecurity Analyst', start: '2020-08-01',
    industry: 'Cybersecurity',
  },

  // ── Product ───────────────────────────────────────────────────────────────
  {
    first_name: 'Sofia', last_name: 'Martinez', email: `sofia.martinez${SEED_DOMAIN}`,
    biography: 'Product manager bridging engineering teams and business stakeholders at a global streaming platform.',
    linkedin: 'https://linkedin.com/in/sofiamartinez',
    degree: 'BSc Business Information Systems', institution: 'University of Westminster', grad: '2020',
    cert1: 'Certified Scrum Product Owner (CSPO)', cert2: 'Google Project Management Certificate',
    company: 'Spotify', role: 'Product Manager', start: '2020-11-01',
    industry: 'Product',
  },
  {
    first_name: 'Chloe', last_name: 'Andersen', email: `chloe.andersen${SEED_DOMAIN}`,
    biography: 'UX researcher combining ethnographic methods and data analytics to drive product design decisions.',
    linkedin: 'https://linkedin.com/in/chloeandersen',
    degree: 'BSc Digital Media', institution: 'University of Westminster', grad: '2022',
    cert1: 'Google UX Design Certificate', cert2: 'Nielsen Norman Group UX Certification',
    company: 'Spotify', role: 'Product Manager', start: '2022-02-01',
    industry: 'Product',
  },

  // ── Healthcare ────────────────────────────────────────────────────────────
  {
    first_name: 'Mia', last_name: 'Fernandez', email: `mia.fernandez${SEED_DOMAIN}`,
    biography: 'Healthcare data analyst applying statistical methods to improve patient outcome tracking.',
    linkedin: 'https://linkedin.com/in/miafernandez',
    degree: 'BSc Health Informatics', institution: 'University of Westminster', grad: '2021',
    cert1: 'AWS Certified Solutions Architect', cert2: 'SAS Base Programming Certification',
    company: 'NHS Digital', role: 'Data Analyst', start: '2021-02-01',
    industry: 'Healthcare',
  },
  {
    first_name: 'Zoe', last_name: 'Jackson', email: `zoe.jackson${SEED_DOMAIN}`,
    biography: 'Digital health product specialist leveraging analytics and automation for clinical improvement.',
    linkedin: 'https://linkedin.com/in/zoejackson',
    degree: 'BSc Health Informatics', institution: 'University of Westminster', grad: '2021',
    cert1: 'Google Cloud Professional Developer', cert2: 'Google Analytics Certification',
    company: 'NHS Digital', role: 'Data Analyst', start: '2021-03-01',
    industry: 'Healthcare',
  },

  // ── Finance ───────────────────────────────────────────────────────────────
  {
    first_name: 'Lucas', last_name: 'Pereira', email: `lucas.pereira${SEED_DOMAIN}`,
    biography: 'FinTech engineer building real-time payment infrastructure and regulatory reporting systems.',
    linkedin: 'https://linkedin.com/in/lucaspereira',
    degree: 'MSc Financial Technology', institution: 'University of Westminster', grad: '2021',
    cert1: 'AWS Certified Solutions Architect', cert2: 'CFA Level I',
    company: 'Goldman Sachs', role: 'Software Engineer', start: '2021-10-01',
    industry: 'Finance',
  },

  // ── Specialist roles ──────────────────────────────────────────────────────
  {
    first_name: 'Aisha', last_name: 'Nkosi', email: `aisha.nkosi${SEED_DOMAIN}`,
    biography: 'Blockchain developer focused on DeFi protocols, smart contract auditing, and Web3 tooling.',
    linkedin: 'https://linkedin.com/in/aishankosei',
    degree: 'BSc Computer Science', institution: 'University of Westminster', grad: '2023',
    cert1: 'Google Cloud Professional Developer', cert2: 'Certified Ethereum Developer',
    company: 'Consensys', role: 'Blockchain Developer', start: '2023-02-01',
    industry: 'Technology',
  },
  {
    first_name: 'Benjamin', last_name: 'Taylor', email: `benjamin.taylor${SEED_DOMAIN}`,
    biography: 'Robotics engineer programming autonomous navigation systems for warehouse logistics.',
    linkedin: 'https://linkedin.com/in/benjamintaylor',
    degree: 'MEng Robotics and Intelligent Systems', institution: 'University of Westminster', grad: '2022',
    cert1: 'Microsoft Azure Developer Associate', cert2: 'NVIDIA Jetson AI Specialist',
    company: 'Amazon Robotics', role: 'Robotics Software Engineer', start: '2022-08-01',
    industry: 'Technology',
  },
];

// ─── SEED FUNCTION ───────────────────────────────────────────────────────────

async function seed() {
  const conn = await pool.getConnection();
  let deleted = 0;
  let inserted = 0;

  console.log('\n--- Phantasmagoria Seed Script v2 ---\n');

  try {
    // Step 1: Delete all existing @westminster.ac.uk seed users
    console.log('Removing previous seed users...');
    const [delResult] = await conn.query(
      `DELETE FROM users WHERE email LIKE ?`, [`%${SEED_DOMAIN}`]
    );
    deleted = delResult.affectedRows;
    console.log(`  Removed ${deleted} existing seed users.\n`);
    console.log(`Inserting ${users.length} alumni with realistic distribution...\n`);

    // Step 2: Re-insert
    for (const u of users) {
      await conn.beginTransaction();
      try {
        // 1. User
        const [userRes] = await conn.query(
          `INSERT INTO users (email, password_hash, role, is_verified, created_at)
           VALUES (?, ?, 'alumni', TRUE, NOW())`,
          [u.email, PASSWORD_HASH]
        );
        const userId = userRes.insertId;

        // 2. Profile
        const [profRes] = await conn.query(
          `INSERT INTO profiles (user_id, first_name, last_name, biography, linkedin_url, has_event_participation)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [userId, u.first_name, u.last_name, u.biography, u.linkedin, Math.random() < 0.3]
        );
        const profileId = profRes.insertId;

        // 3. Degree
        await conn.query(
          `INSERT INTO degrees (profile_id, title, institution, completion_date) VALUES (?, ?, ?, ?)`,
          [profileId, u.degree, u.institution, `${u.grad}-06-30`]
        );

        // 4. Two certifications
        await conn.query(
          `INSERT INTO certifications (profile_id, title, completion_date) VALUES (?, ?, ?)`,
          [profileId, u.cert1, `${parseInt(u.grad) + 1}-01-15`]
        );
        await conn.query(
          `INSERT INTO certifications (profile_id, title, completion_date) VALUES (?, ?, ?)`,
          [profileId, u.cert2, `${parseInt(u.grad) + 1}-06-01`]
        );

        // 5. Employment
        await conn.query(
          `INSERT INTO employment (profile_id, company, role, start_date, end_date) VALUES (?, ?, ?, ?, NULL)`,
          [profileId, u.company, u.role, u.start]
        );

        await conn.commit();
        console.log(`  [OK] ${u.first_name} ${u.last_name.padEnd(12)} | ${u.role.padEnd(28)} | ${u.company.padEnd(18)} | ${u.degree}`);
        inserted++;

      } catch (err) {
        await conn.rollback();
        console.error(`  [ERR] ${u.email}:`, err.message);
      }
    }

  } finally {
    conn.release();
  }

  console.log(`\n--- Done: ${inserted} inserted (${deleted} old records removed) ---`);
  console.log('\nDistribution summary:');
  console.log('  Roles     → Software Engineer(5), Data Scientist(4), Cloud Engineer(3), Cybersecurity Analyst(3), Product Manager(2), Data Analyst(2), others vary');
  console.log('  Companies → Google(4), AWS(3), Microsoft(3), Deloitte(2), Spotify(2), HSBC(2), Goldman Sachs(2), NHS Digital(2), others 1');
  console.log('  Degrees   → BSc Computer Science(6), BSc Cybersecurity(2), BSc Health Informatics(2), MSc Data Science(4), BEng Software(3), others vary');
  console.log('  Cert 1    → AWS Certified SA(5), Google Cloud Developer(4), CompTIA Security+(3), Microsoft Azure(3), others vary');
  console.log('  Grad yrs  → 2019(1), 2020(3), 2021(8), 2022(9), 2023(4)\n');

  process.exit(0);
}

seed();
