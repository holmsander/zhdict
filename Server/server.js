const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const app = express();
const port = 319;
require('dotenv').config();

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'User')));

const pool = mysql.createPool({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQL_ROOT_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: process.env.MYSQLPORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'User', 'HTML', 'index.html'));
});

app.get('/search', async (req, res) => {
  const searchTerm = req.query.term;
  if (!searchTerm) {
    return res.status(400).json({ error: 'Search term is required' });
  }

  try {
    const [rows] = await pool.execute('CALL find(?)', [searchTerm]);
    res.json(rows[0]);
  } catch (error) {
    console.error('Error executing search:', error);
    res.status(500).json({ error: 'An error occurred while searching' });
  }
});

app.post('/bulk-search', async (req, res) => {
    const { terms } = req.body;
    if (!terms || !Array.isArray(terms) || terms.length === 0) {
      return res.status(400).json({ error: 'Invalid search terms' });
    }
  
    // Join all terms into a single string of comma-separated, quoted values
    const quotedTerms = terms.map(term => mysql.escape(term)).join(',');
  
    try {
      const [rows] = await pool.execute(`CALL bulk_find(?)`, [quotedTerms]);
      
      // Create a map of found words
      const foundWords = new Map(rows[0].map(word => [word.simplified, word]));
      
      // Prepare the result, including words not found
      const result = terms.map(term => {
        if (foundWords.has(term)) {
          return foundWords.get(term);
        } else {
          return {
            simplified: term,
            traditional: '',
            pinyin: '',
            meaning: 'Not found',
            new_hsk_level: 0,
            hsk_level: 0,
            freq_global: -1,
            freq_weibo: -1,
            freq_literary: -1,
            freq_news: -1,
            freq_tech: -1,
            freq_blog: -1,
            rank_global: Infinity,
            rank_weibo: Infinity,
            rank_literary: Infinity,
            rank_news: Infinity,
            rank_tech: Infinity,
            rank_blog: Infinity
          };
        }
      });
  
      res.json(result);
    } catch (error) {
      console.error('Error executing bulk search:', error);
      res.status(500).json({ error: 'An error occurred while searching' });
    }
  });

  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
