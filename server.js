const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const DB_FILE = path.join(__dirname, 'database.json');

// Khởi tạo database nếu chưa có
function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    const init = { users: {}, adminKeys: {}, wallet: {} };
    fs.writeFileSync(DB_FILE, JSON.stringify(init, null, 2));
    return init;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}
function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// ===== API TÀI KHOẢN =====
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.json({ ok: false, msg: 'Thiếu thông tin' });
  const db = loadDB();
  if (db.users[username]) return res.json({ ok: false, msg: 'Tên đã tồn tại!' });
  db.users[username] = { password, coins: 0, happy: 0, pets: [] };
  saveDB(db);
  res.json({ ok: true, msg: 'Tạo tài khoản thành công!' });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const db = loadDB();
  const u = db.users[username];
  if (!u || u.password !== password) return res.json({ ok: false, msg: 'Sai tên hoặc mật khẩu!' });
  res.json({ ok: true, user: { username, coins: u.coins, happy: u.happy, pets: u.pets } });
});

// Lưu tiến trình
app.post('/api/save', (req, res) => {
  const { username, coins, happy, pets } = req.body;
  const db = loadDB();
  if (!db.users[username]) return res.json({ ok: false });
  db.users[username].coins = coins;
  db.users[username].happy = happy;
  db.users[username].pets = pets;
  saveDB(db);
  res.json({ ok: true });
});

// ===== API ADMIN KEY =====
app.post('/api/admin/create', (req, res) => {
  const { key, duration } = req.body; // duration: ms
  const db = loadDB();
  const expire = duration > 0 ? Date.now() + duration : null;
  db.adminKeys[key] = { expire, createdAt: Date.now() };
  saveDB(db);
  res.json({ ok: true });
});

app.post('/api/admin/delete', (req, res) => {
  const { key } = req.body;
  const db = loadDB();
  delete db.adminKeys[key];
  saveDB(db);
  res.json({ ok: true });
});

app.get('/api/admin/list', (req, res) => {
  const db = loadDB();
  const now = Date.now();
  const list = Object.entries(db.adminKeys).map(([k, v]) => ({
    key: k,
    expire: v.expire,
    valid: !v.expire || v.expire > now
  }));
  res.json({ ok: true, list });
});

app.post('/api/admin/check', (req, res) => {
  const { key } = req.body;
  const db = loadDB();
  const k = db.adminKeys[key];
  if (!k) return res.json({ ok: false, msg: 'Key không tồn tại' });
  if (k.expire && k.expire < Date.now()) return res.json({ ok: false, msg: 'Key đã hết hạn' });
  res.json({ ok: true });
});

// Admin nâng xu / max vui vẻ cho user
app.post('/api/admin/give', (req, res) => {
  const { key, username, coins, happyMax } = req.body;
  const db = loadDB();
  const k = db.adminKeys[key];
  if (!k || (k.expire && k.expire < Date.now())) return res.json({ ok: false, msg: 'Key không hợp lệ' });
  if (!db.users[username]) return res.json({ ok: false, msg: 'User không tồn tại' });
  if (coins) db.users[username].coins += coins;
  if (happyMax) db.users[username].happy = 999999;
  saveDB(db);
  res.json({ ok: true });
});

app.listen(3000, () => console.log('Server chạy tại http://localhost:3000'));
