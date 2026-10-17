// ====== CẤU HÌNH ======
const API_BASE = window.location.origin; // ví dụ http://localhost:3000
let currentUser = null;
let gameState = null;
let authToken = null;

// ====== ĐĂNG NHẬP GOOGLE ======
function handleGoogleLogin(response) {
  // Gửi credential lên server xác thực
  fetch(`${API_BASE}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential: response.credential })
  })
  .then(r => r.json())
  .then(data => {
    if (data.success) {
      authToken = data.token;
      currentUser = data.user;
      gameState = data.gameState;
      localStorage.setItem('petgame_token', authToken);
      showGame();
    } else {
      showToast('❌ Đăng nhập thất bại');
    }
  })
  .catch(err => {
    console.error(err);
    showToast('❌ Lỗi kết nối server');
  });
}

// Tự động đăng nhập nếu có token
window.addEventListener('DOMContentLoaded', () => {
  const savedToken = localStorage.getItem('petgame_token');
  if (savedToken) {
    fetch(`${API_BASE}/api/me`, {
      headers: { 'Authorization': `Bearer ${savedToken}` }
    })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        authToken = savedToken;
        currentUser = data.user;
        gameState = data.gameState;
        showGame();
      } else {
        localStorage.removeItem('petgame_token');
      }
    })
    .catch(() => {});
  }
});

function showGame() {
  document.getElementById('loginScreen').classList.remove('active');
  document.getElementById('gameScreen').classList.add('active');
  document.getElementById('userName').textContent = currentUser.name;
  document.getElementById('userAvatar').src = currentUser.picture || '';
  render();
}

document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('petgame_token');
  location.reload();
});

// ====== RENDER ======
const PET_TYPES = [
  { emoji: '🐶', name: 'Cún con' },
  { emoji: '🐱', name: 'Mèo con' },
  { emoji: '🐰', name: 'Thỏ con' },
  { emoji: '🐹', name: 'Hamster' },
  { emoji: '🐼', name: 'Gấu trúc' },
  { emoji: '🦊', name: 'Cáo con' },
  { emoji: '🐨', name: 'Koala' },
  { emoji: '🐧', name: 'Cánh cụt' }
];

function render() {
  if (!gameState) return;

  // Resources
  document.getElementById('coinDisplay').textContent = Math.floor(gameState.coins);
  document.getElementById('multiplierDisplay').textContent = `x${gameState.coinMultiplier}`;

  // Pets
  const petContainer = document.getElementById('petContainer');
  petContainer.innerHTML = '';
  if (gameState.pets.length === 0) {
    petContainer.innerHTML = '<p style="color:#999;grid-column:1/-1;text-align:center">Chưa có thú cưng nào. Nhấn "Nhận thú cưng mới" để bắt đầu! 🐾</p>';
  }
  gameState.pets.forEach((pet, idx) => {
    const card = document.createElement('div');
    card.className = 'pet-card';
    const joyPercent = Math.min(100, pet.joy);
    card.innerHTML = `
      <div class="pet-emoji">${pet.emoji}</div>
      <div class="pet-name">${pet.name}</div>
      <div class="joy-bar-wrap">
        <div class="joy-bar" style="width:${joyPercent}%"></div>
        <div class="joy-text">${Math.floor(pet.joy)} / 100 vui vẻ</div>
      </div>
      <button class="btn-feed" onclick="feedPet(${idx})">🍖 Cho ăn (+5 vui vẻ)</button>
    `;
    petContainer.appendChild(card);
  });

  // Rooms
  ['bathroom','dining','playroom','stressroom','garden'].forEach(room => {
    const card = document.querySelector(`[data-room="${room}"]`);
    if (!card) return;
    const unlocked = gameState.rooms.includes(room);
    card.classList.toggle('locked', !unlocked);
    card.classList.toggle('unlocked', unlocked);
    const btn = card.querySelector('.btn-room');
    if (unlocked) {
      btn.textContent = 'Sử dụng';
      btn.setAttribute('onclick', `useRoom('${room}')`);
    }
  });

  // Upgrade
  document.getElementById('coinUpgradeCost').textContent = gameState.coinUpgradeCost;
  document.getElementById('joyUpgradeCost').textContent = gameState.joyUpgradeCost;
  document.getElementById('coinMultiplier').textContent = `x${gameState.coinMultiplier}`;
  document.getElementById('joyMultiplier').textContent = `x${gameState.joyMultiplier}`;
}

// ====== API CALLS ======
async function apiCall(endpoint, method = 'GET', body = null) {
  const opts = {
    method,
    headers: { 'Authorization': `Bearer ${authToken}` }
  };
  if (body) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${API_BASE}${endpoint}`, opts);
  return res.json();
}

// ====== HÀNH ĐỘNG ======
async function addPet() {
  const type = PET_TYPES[Math.floor(Math.random() * PET_TYPES.length)];
  const result = await apiCall('/api/pet/add', 'POST', { emoji: type.emoji, name: type.name });
  if (result.success) {
    gameState = result.gameState;
    render();
    showToast(`🎉 Bạn nhận được ${type.name} ${type.emoji}!`);
  }
}

async function feedPet(idx) {
  const result = await apiCall('/api/pet/feed', 'POST', { index: idx });
  if (result.success) {
    gameState = result.gameState;
    render();
    showToast('🍖 Thú cưng vui vẻ hơn!');
  } else {
    showToast('❌ ' + result.message);
  }
}

async function useRoom(room) {
  const result = await apiCall('/api/room/use', 'POST', { room });
  if (result.success) {
    gameState = result.gameState;
    render();
    showToast(`✅ Sử dụng phòng thành công! +${result.gain} xu`);
  } else {
    showToast('❌ ' + result.message);
  }
}

async function unlockRoom(room, cost) {
  const result = await apiCall('/api/room/unlock', 'POST', { room });
  if (result.success) {
    gameState = result.gameState;
    render();
    showToast(`🔓 Mở khóa phòng thành công!`);
  } else {
    showToast('❌ ' + result.message);
  }
}

async function upgradeCoin() {
  const result = await apiCall('/api/upgrade/coin', 'POST');
  if (result.success) {
    gameState = result.gameState;
    render();
    showToast(`⚡ Nâng cấp xu! Hệ số hiện tại: x${gameState.coinMultiplier}`);
  } else {
    showToast('❌ ' + result.message);
  }
}

async function upgradeJoy() {
  const result = await apiCall('/api/upgrade/joy', 'POST');
  if (result.success) {
    gameState = result.gameState;
    render();
    showToast(`⚡ Nâng cấp vui vẻ! Hệ số hiện tại: x${gameState.joyMultiplier}`);
  } else {
    showToast('❌ ' + result.message);
  }
}

document.getElementById('addPetBtn').addEventListener('click', addPet);

// ====== TOAST ======
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}
