const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (your portfolio)
app.use(express.static(path.join(__dirname)));

// MySQL Database Configuration
// ⚠️ UPDATE THESE SETTINGS TO MATCH YOUR MySQL SETUP
const dbConfig = {
    host: 'localhost',
    user: 'root',           // Your MySQL username
    password: 'root',           // Your MySQL password
    database: 'portfolio_db' // Database name we'll create
};

// Create MySQL connection pool
const pool = mysql.createPool(dbConfig).promise();

// Initialize database and table
async function initializeDatabase() {
    try {
        // Create database if not exists (connect without database first)
        const tempConnection = mysql.createConnection({
            host: dbConfig.host,
            user: dbConfig.user,
            password: dbConfig.password
        }).promise();

        await tempConnection.query(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
        await tempConnection.end();

        // Create contacts table
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS contacts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                subject VARCHAR(500),
                message TEXT,
                submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

        await pool.query(createTableQuery);
        console.log('✅ Database and table initialized successfully!');
        console.log('📊 Table: contacts');

    } catch (error) {
        console.error('❌ Database initialization error:', error.message);
        console.log('\n⚠️  Make sure MySQL is running and credentials are correct in server.js');
    }
}

// API Route: Submit Contact Form
app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        // Validate required fields
        if (!name || !email || !message) {
            return res.status(400).json({
                success: false,
                message: 'Please fill all required fields (name, email, message)'
            });
        }

        // Insert into database
        const insertQuery = `
            INSERT INTO contacts (name, email, subject, message) 
            VALUES (?, ?, ?, ?)
        `;

        const [result] = await pool.query(insertQuery, [name, email, subject, message]);

        console.log(`📧 New contact received from: ${name} (${email})`);

        res.status(200).json({
            success: true,
            message: 'Thank you for your message! I will get back to you soon.',
            id: result.insertId
        });

    } catch (error) {
        console.error('Error saving contact:', error);
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again later.'
        });
    }
});

// API Route: Get all contacts (for viewing submissions)
app.get('/api/contacts', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM contacts ORDER BY submitted_at DESC');
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching contacts:', error);
        res.status(500).json({ success: false, message: 'Error fetching contacts' });
    }
});

// API Route: View contacts in HTML format
app.get('/admin/contacts', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM contacts ORDER BY submitted_at DESC');

        let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Contact Submissions - Admin</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                    font-family: 'Inter', sans-serif; 
                    background: #0f0f23; 
                    color: #fff; 
                    padding: 40px;
                }
                h1 { 
                    text-align: center; 
                    margin-bottom: 30px;
                    background: linear-gradient(135deg, #6366f1, #8b5cf6);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    background: rgba(255,255,255,0.05);
                    border-radius: 12px;
                    overflow: hidden;
                }
                th, td { 
                    padding: 15px; 
                    text-align: left; 
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                }
                th { 
                    background: linear-gradient(135deg, #6366f1, #8b5cf6);
                    font-weight: 600;
                }
                tr:hover { background: rgba(255,255,255,0.05); }
                .no-data { text-align: center; padding: 50px; color: #888; }
                .count { 
                    text-align: center; 
                    margin-bottom: 20px; 
                    color: #818cf8;
                }
                a { color: #0ea5e9; }
            </style>
        </head>
        <body>
            <h1>📧 Contact Form Submissions</h1>
            <p class="count">Total Submissions: ${rows.length}</p>
        `;

        if (rows.length === 0) {
            html += '<div class="no-data">No contact submissions yet.</div>';
        } else {
            html += `
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Subject</th>
                        <th>Message</th>
                        <th>Submitted At</th>
                    </tr>
                </thead>
                <tbody>
            `;

            rows.forEach(row => {
                html += `
                    <tr>
                        <td>${row.id}</td>
                        <td>${row.name}</td>
                        <td><a href="mailto:${row.email}">${row.email}</a></td>
                        <td>${row.subject || '-'}</td>
                        <td>${row.message}</td>
                        <td>${new Date(row.submitted_at).toLocaleString()}</td>
                    </tr>
                `;
            });

            html += '</tbody></table>';
        }

        html += '</body></html>';
        res.send(html);

    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Error loading contacts');
    }
});

// Start server
app.listen(PORT, async () => {
    console.log('\n========================================');
    console.log('🚀 Portfolio Server Started!');
    console.log('========================================');
    console.log(`📂 Portfolio:      http://localhost:${PORT}`);
    console.log(`📧 Admin Panel:    http://localhost:${PORT}/admin/contacts`);
    console.log(`🔗 API Endpoint:   http://localhost:${PORT}/api/contact`);
    console.log('========================================\n');

    await initializeDatabase();
});
