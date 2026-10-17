let currentUser = null;
let state = { coins: 0, happy: 0, pets: [], rooms: [] };
const API = 'http://localhost:3000';

// ===== AUTH =====
async function doRegister() {
  const username = document.getElementById('authUser').value.trim();
  const password = document.getElementById('authPass').value;
  const res = await fetch(API + '/api/register', {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ username, password })
  }).then(r => r.json());
  document.getElementById('authMsg').textContent = res.msg;
}

async function doLogin() {
  const username = document.getElementById('authUser').value.trim();
  const password = document.getElementById('authPass').value;
  const res = await fetch(API + '/api/login', {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ username, password })
  }).then(r => r.json());
  if (!res.ok) { document.getElementById('authMsg').textContent = res.msg; return; }
  currentUser = username;
  state.coins = res.user.coins || 0;
  state.happy = res.user.happy || 0;
  state.pets = res.user.pets || [];
  state.rooms = [];
  document.getElementById('authScreen').classList.add('hidden');
  document.getElementById('gameScreen').classList.remove('hidden');
  document.getElementById('playerName').textContent = username;
  renderAll();
}

function logout() {
  currentUser = null;
  location.reload();
}

async function saveServer() {
  if (!currentUser) return;
  await fetch(API + '/api/save', {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ username: currentUser, coins: state.coins, happy: state.happy, pets: state.pets })
  });
}

// ===== TABS =====
function openTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.add('hidden'));
  document.getElementById('tab-' + name).classList.remove('hidden');
}

// ===== PETS =====
function adoptPet(type, emoji) {
  if (state.pets.find(p => p.type === type)) { alert('Bạn đã có thú cưng này!'); return; }
  state.pets.push({ type, emoji, happy: 50 });
  renderPets(); saveServer();
}

function feedPet(idx) {
  // Mỗi vui vẻ tốn 1 xu → +1 happy
  if (state.coins < 1) { alert('Không đủ xu!'); return; }
  state.coins -= 1;
  const pet = state.pets[idx];
  pet.happy = Math.min(100, pet.happy + 1);
  state.happy = state.pets.reduce((s,p)=>s+p.happy,0);
  renderAll(); saveServer();
}

function renderPets() {
  const box = document.getElementById('myPets');
  box.innerHTML = '';
  if (state.pets.length === 0) { box.innerHTML = '<p>Chưa có thú cưng. Hãy chọn ở trên!</p>'; return; }
  state.pets.forEach((p, i) => {
    const div = document.createElement('div');
    div.className = 'pet';
    div.innerHTML = `${p.emoji}<br><small>${p.happy}%</small>
      <div class="happy-bar"><div class="happy-fill" style="width:${p.happy}%"></div></div>
      <button style="margin-top:6px;font-size:12px" onclick="feedPet(${i})">Cho ăn (1 xu)</button>`;
    box.appendChild(div);
  });
}

// ===== ROOMS =====
function buyRoom(id, cost) {
  if (state.rooms.includes(id)) { alert('Đã mở rồi!'); return; }
  if (state.coins < cost) { alert('Không đủ xu!'); return; }
  state.coins -= cost;
  state.rooms.push(id);
  document.getElementById('room' + id[0].toUpperCase() + id.slice(1)).innerHTML =
    `✅ Đã mở`;
  renderAll(); saveServer();
}

// ===== UPGRADE =====
function upgrade(kind) {
  const cost = state.coins * 2;
  if (state.coins < cost) { alert('Không đủ xu (cần ' + cost + ')'); return; }
  state.coins -= cost;
  if (kind === 'coin') state.coins += cost * 10;
  else state.happy += cost * 10;
  renderAll(); saveServer();
}

// ===== RENDER =====
function renderAll() {
  document.getElementById('coins').textContent = state.coins;
  document.getElementById('happy').textContent = state.happy;
  const totalHappy = state.pets.reduce((s,p)=>s+p.happy,0);
  if (totalHappy) state.happy = totalHappy;
  document.getElementById('costCoin').textContent = state.coins * 2;
  document.getElementById('costHappy').textContent = state.coins * 2;
  renderPets();
}

// Auto refresh nhẹ
setInterval(() => { if (currentUser) renderAll(); }, 5000);
