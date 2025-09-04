import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { sql } from '@vercel/postgres';
import Mailgun from 'mailgun.js';
import formData from 'form-data';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5001;

// Initialize Mailgun
const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY || 'your-mailgun-api-key-here',
});

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Routes
app.get('/api', (req, res) => {
  res.json({ message: 'Welcome to the Expat API' });
});

app.get('/api/get-countries', async (req, res) => {
  try {
    const result = await sql`SELECT id, name FROM countries ORDER BY name`;
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching countries:', err);
    res.status(500).json({ error: 'Failed to fetch countries' });
  }
});

app.get('/api/get-visas/:countryId', async (req, res) => {
  try {
    const { countryId } = req.params;
    const result = await sql`
      SELECT v.id, v.name, v.description, v.duration, v.cost,
             v.requirements
      FROM visas v
      WHERE v.country = ${countryId}
      GROUP BY v.id
      ORDER BY v.name
    `;
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching visas:', err);
    res.status(500).json({ error: 'Failed to fetch visas' });
  }
});

// Contact form endpoint
app.post('/api/mexico-contact', async (req, res) => {
  try {
    const { name, email, country, contact, message, subject } = req.body;

    // Validate required fields
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required' });
    }

    // Prepare email content
    const emailContent = `
New Mexico Residency Inquiry

Name: ${name}
Email: ${email}
Country of Citizenship: ${country || 'Not provided'}
Contact Info: ${contact || 'Not provided'}

Message:
${message}
    `.trim();

    // Send email via Mailgun
    const emailData = {
      from: `Expat List Contact Form <tuomas@${process.env.MAILGUN_DOMAIN || 'expater.com'}>`,
      to: 'babycancunmexico@gmail.com',
      subject: 'Mexico Residency Inquiry From Tuomas (expater.com)',
      text: emailContent,
      'h:Reply-To': email
    };

    await mg.messages.create(process.env.MAILGUN_DOMAIN || 'expater.com', emailData);

    res.json({ message: 'Email sent successfully' });
  } catch (err) {
    console.error('Error sending email:', err);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
