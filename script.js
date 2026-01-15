// --- БЛОК 0: КОНФИГУРАЦИЯ И ИНИЦИАЛИЗАЦИЯ ---
const firebaseConfig = {
    apiKey: "AIzaSyDFrEbOwmtZlWlrPhImDlA0PE1tQKvYNAY",
    authDomain: "rakstore-a80a8.firebaseapp.com",
    projectId: "rakstore-a80a8",
    storageBucket: "rakstore-a80a8.appspot.com",
    messagingSenderId: "55025016203",
    appId: "1:55025016203:web:8a6b67666dbb3df285238e"
};

let db;
try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.database();
} catch (e) { console.error("Ошибка инициализации Firebase:", e); }


// --- БЛОК 1: СТАРТ ПРИЛОЖЕНИЯ И ИДЕНТИФИКАЦИЯ ПОЛЬЗОВАТЕЛЯ ---
document.addEventListener('DOMContentLoaded', () => {
    let currentUserId = 'user1'; // ID по умолчанию для тестов вне Telegram

    // Пытаемся получить реальные данные из Telegram Web App
    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.ready();
        const tgUser = window.Telegram.WebApp.initDataUnsafe?.user;
        if (tgUser) {
            currentUserId = tgUser.id.toString();
            // Обновляем/создаем профиль пользователя в Firebase с данными из Telegram
            updateUserInFirebase(tgUser);
        }
    }
    
    // Запускаем все основные функции приложения
    initNavigation();
    initGlobalThemeListener();
    loadUserProfile(currentUserId);
});

// Функция для обновления данных пользователя (аватар, имя) в Firebase
function updateUserInFirebase(tgUser) {
    const userRef = db.ref(`users/${tgUser.id}/profile`);
    // Используем .update(), чтобы не затереть другие данные, например, ачивки
    userRef.update({
        name: `${tgUser.first_name || ''} ${tgUser.last_name || ''}`.trim(),
        username: tgUser.username,
        avatar: tgUser.photo_url
    });
}


// --- БЛОК 2: НАВИГАЦИЯ ---
function initNavigation() {
    const btns = document.querySelectorAll('.nav-btn');
    const pages = document.querySelectorAll('.page');
    const adminBtn = document.getElementById('admin-login-btn');

    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            pages.forEach(p => p.classList.remove('active'));
            document.getElementById(btn.dataset.page).classList.add('active');
            
            btns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    adminBtn.addEventListener('click', () => {
        pages.forEach(p => p.classList.remove('active'));
        document.getElementById('page-admin').classList.add('active');
        btns.forEach(b => b.classList.remove('active'));
    });
}


// --- БЛОК 3: ГЛОБАЛЬНАЯ ТЕМА ---
function initGlobalThemeListener() {
    const themeRef = db.ref('appSettings/theme');
    themeRef.on('value', (snapshot) => {
        const theme = snapshot.val() || 'light';
        document.documentElement.setAttribute('data-theme', theme);
    });
}


// --- БЛОК 4: ЗАГРУЗКА И ОТОБРАЖЕНИЕ ДАННЫХ ---

// Главная функция-загрузчик
function loadUserProfile(userId) {
    db.ref(`users/${userId}`).on('value', (snap) => {
        const userData = snap.val() || {};
        const profile = userData.profile || {};
        const purchases = userData.purchases || {};

        // Вызываем функции рендеринга для каждого раздела
        renderPurchases(purchases, document.getElementById('purchases-list-container'));
        renderProfilePage(profile, purchases);
        // renderWarranties(purchases); // Задел на будущее
    });
}

// Рендеринг списка покупок
function renderPurchases(purchases, container) {
    container.innerHTML = '';
    if (Object.keys(purchases).length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#888">Покупок пока нет.</p>';
        return;
    }
    Object.values(purchases).forEach(item => {
        const div = document.createElement('div');
        div.className = 'purchase-item';
        div.innerHTML = `
            <h4>${item.name}</h4>
            <div>💰 ${item.price} руб.</div>
            <div style="font-size:0.8em; color:#666">${new Date(item.date).toLocaleDateString()}</div>
            ${item.category ? `<small style="color:var(--accent)">${item.category}</small>` : ''}
        `;
        container.appendChild(div);
    });
}

// Рендеринг страницы профиля
function renderProfilePage(profile, purchases) {
    const purchaseValues = Object.values(purchases);

    const totalPurchases = purchaseValues.length;
    const totalSpent = purchaseValues.reduce((sum, item) => sum + Number(item.price), 0);
    const points = (profile.points || 0) + (totalPurchases * 10);

    const level = Math.floor(points / 100) + 1;
    const pointsForNextLevel = 100;
    const progress = (points % pointsForNextLevel) / pointsForNextLevel * 100;
    
    document.getElementById('profile-avatar').src = profile.avatar || 'https://t.me/i/userpic/320/null.jpg';
    document.getElementById('profile-name').innerText = profile.name || 'Неизвестный пользователь';
    document.getElementById('profile-level-num').innerText = level;
    document.getElementById('profile-level-progress').style.width = `${progress}%`;
    
    document.getElementById('stat-purchases').innerText = totalPurchases;
    document.getElementById('stat-spent').innerText = `${totalSpent.toLocaleString('ru-RU')} ₽`;
    document.getElementById('stat-points').innerText = points;

    renderAchievements(profile, purchases);
}


// --- БЛОК 5: ГЕЙМИФИКАЦИЯ (ДОСТИЖЕНИЯ) ---

const ALL_ACHIEVEMENTS = {
    first_purchase: { icon: '🔰', title: 'Первые шаги' },
    five_purchases: { icon: '🛍️', title: 'Шопоголик' },
    big_spender: { icon: '💸', title: 'Крупный расход' },
    tech_guru: { icon: '🤖', title: 'Техно-гуру' },
    bookworm: { icon: '📚', title: 'Книжный червь' },
};

function renderAchievements(profile, purchases) {
    const grid = document.getElementById('achievements-grid');
    grid.innerHTML = '';
    const unlocked = checkUnlockedAchievements(profile, purchases);

    for (const key in ALL_ACHIEVEMENTS) {
        const ach = ALL_ACHIEVEMENTS[key];
        const isUnlocked = unlocked.has(key);
        
        const item = document.createElement('div');
        item.className = `achievement-item ${isUnlocked ? '' : 'locked'}`;
        item.innerHTML = `
            <div class="icon">${ach.icon}</div>
            <h5>${ach.title}</h5>
        `;
        grid.appendChild(item);
    }
}

function checkUnlockedAchievements(profile, purchases) {
    const unlocked = new Set(profile.achievements || []);
    const purchaseValues = Object.values(purchases);
    
    if (purchaseValues.length >= 1) unlocked.add('first_purchase');
    if (purchaseValues.length >= 5) unlocked.add('five_purchases');
    if (purchaseValues.some(p => p.price > 20000)) unlocked.add('big_spender');
    if (purchaseValues.filter(p => p.category === 'electronics').length >= 3) unlocked.add('tech_guru');
    if (purchaseValues.filter(p => p.category === 'books').length >= 1) unlocked.add('bookworm');

    // TODO: Здесь нужно будет сохранять новые разблокированные ачивки в Firebase,
    // чтобы они не проверялись каждый раз заново.
    return unlocked;
}


// --- БЛОК 6: АДМИН-ПАНЕЛЬ ---

function loginAdmin() {
    const inputPass = document.getElementById('admin-password-input').value;
    const errorMsg = document.getElementById('auth-error');
    
    db.ref('admin/password').once('value').then(snap => {
        // Если в базе нет пароля, используем 'admin123' как пароль по умолчанию
        const realPass = snap.val() || 'admin123'; 

        if (inputPass === realPass) {
            document.getElementById('admin-auth-block').style.display = 'none';
            document.getElementById('admin-panel-content').style.display = 'block';
            errorMsg.style.display = 'none';
        } else {
            errorMsg.style.display = 'block';
        }
    });
}

function logoutAdmin() {
    document.getElementById('admin-auth-block').style.display = 'block';
    document.getElementById('admin-panel-content').style.display = 'none';
    document.getElementById('admin-password-input').value = '';
}

function setGlobalTheme(themeName) {
    if(confirm(`Вы уверены? Тема "${themeName}" установится ВСЕМ пользователям.`)) {
        db.ref('appSettings/theme').set(themeName);
    }
}

function changeAdminPassword() {
    const newPass = document.getElementById('new-admin-password').value;
    if(newPass && newPass.length > 3) {
        db.ref('admin/password').set(newPass);
        alert('Пароль изменен!');
    } else {
        alert('Пароль слишком короткий');
    }
}

function adminAddPurchase() {
    const userId = document.getElementById('adm-user-id').value;
    const name = document.getElementById('adm-item-name').value;
    const price = document.getElementById('adm-item-price').value;
    const date = document.getElementById('adm-item-date').value;
    const cat = document.getElementById('adm-item-cat').value;

    if (!userId || !name || !price) {
        alert("Заполните ID, Название и Цену");
        return;
    }

    const newPurchaseRef = db.ref(`users/${userId}/purchases`).push();
    newPurchaseRef.set({
        name: name,
        price: price,
        date: date || new Date().toISOString(),
        category: cat
    }, (error) => {
        if (error) {
            alert('Ошибка: ' + error.message);
        } else {
            alert('Покупка добавлена!');
            document.getElementById('adm-item-name').value = '';
            document.getElementById('adm-item-price').value = '';
        }
    });
}
