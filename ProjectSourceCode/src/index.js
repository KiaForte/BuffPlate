require('dotenv').config();
const express    = require('express');
const session    = require('express-session');
const bcrypt     = require('bcryptjs');
const path       = require('path');
const { engine } = require('express-handlebars');

const db         = require('./db');
const { fetchHallMenu } = require('./services/menu');
const hallsConfig        = require('./config/menus');

const app  = express();
const PORT = process.env.PORT ?? 3000;

// ── View engine ───────────────────────────────────────────────────────────────

app.engine('hbs', engine({
  extname: '.hbs',
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'views/layouts'),
  helpers: {
    roundVal: n => (n != null ? Math.round(n) : '—'),
  },
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// ── Middleware ────────────────────────────────────────────────────────────────

app.use(express.urlencoded({ extended: false }));
app.use(session({
  secret: process.env.SESSION_SECRET ?? 'dev_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 },
}));

// Expose session user to every template
app.use((req, res, next) => {
  res.locals.user = req.session.user ?? null;
  next();
});

function requireLogin(req, res, next) {
  if (req.session.user) return next();
  res.redirect('/login');
}

// ── Routes ────────────────────────────────────────────────────────────────────

app.get('/', (req, res) => {
  if (req.session.user) return res.redirect('/menu');
  res.redirect('/login');
});

// Auth
app.get('/login', (req, res) => res.render('login', { title: 'Sign in' }));

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const { rows } = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.render('login', { title: 'Sign in', error: 'Invalid username or password.' });
    }
    req.session.user = { id: user.id, username: user.username };
    res.redirect('/menu');
  } catch (err) {
    console.error(err);
    res.render('login', { title: 'Sign in', error: 'Something went wrong. Try again.' });
  }
});

app.get('/register', (req, res) => res.render('register', { title: 'Create account' }));

app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    await db.query(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3)',
      [username, email, hash]
    );
    res.redirect('/login');
  } catch (err) {
    const duplicate = err.code === '23505';
    res.render('register', {
      title: 'Create account',
      error: duplicate ? 'Username or email already taken.' : 'Registration failed. Try again.',
    });
  }
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

// Menu (login required)
app.get('/menu', requireLogin, async (req, res) => {
  const halls = hallsConfig.map(h => ({
    id: h.id, displayName: h.displayName, live: h.live, active: h.id === 'c5',
  }));

  const dateStr = req.query.date;
  const today   = dateStr ? new Date(dateStr) : new Date();
  if (isNaN(today.getTime())) {
    return res.render('menu', { title: 'Menu', halls, error: 'Invalid date.' });
  }

  try {
    const items = await fetchHallMenu('c5', today);

    // Group by station, then by section within each station
    const stationMap = new Map();
    for (const item of items) {
      if (!stationMap.has(item.station)) stationMap.set(item.station, new Map());
      const key = item.section ?? '';
      const sec = stationMap.get(item.station);
      if (!sec.has(key)) sec.set(key, []);
      sec.get(key).push(item);
    }
    const stations = [...stationMap.entries()].map(([station, secMap]) => ({
      station,
      sections: [...secMap.entries()].map(([section, items]) => ({
        section: section || null, items,
      })),
    }));

    const dateLabel = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    res.render('menu', { title: 'Menu', date: dateLabel, halls, stations, noItems: stations.length === 0 });
  } catch (err) {
    console.error('[menu route]', err.message);
    res.render('menu', { title: 'Menu', halls, error: 'Could not load today\'s menu. Try again in a few minutes.' });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => console.log(`BuffPlate running on http://localhost:${PORT}`));
