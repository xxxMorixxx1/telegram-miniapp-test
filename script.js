// --- БЛОК 0: ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ И ИНИЦИАЛИЗАЦИЯ ---

// Firebase
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
} catch (e) {
    console.error("Ошибка инициализации Firebase: ", e);
}

// Иконки для категорий
const categoryIcons = {
    electronics: 'fa-solid fa-mobile-screen-button',
    books: 'fa-solid fa-book-open',
    tools: 'fa-solid fa-wrench',
    default: 'fa-solid fa-cart-shopping'
};


// --- БЛОК 1: УПРАВЛЕНИЕ ИНТЕРФЕЙСОМ (UI) ---

document.addEventListener('DOMContentLoaded', () => {

    // Логика переключения страниц
    const navButtons = document.querySelectorAll('.nav-btn');
    const pages = document.querySelectorAll('.page');
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            pages.forEach(page => page.classList.remove('active'));
            document.querySelector(`#${button.dataset.page}`).classList.add('active');
            navButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
        });
    });

    // Логика переключения тем
    const themeSwitcher = document.querySelector('.theme-switcher');
    themeSwitcher.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            const theme = e.target.dataset.theme;
            document.documentElement.setAttribute('data-theme', theme);
            themeSwitcher.querySelector('.active').classList.remove('active');
            e.target.classList.add('active');
            // TODO: Сохранять выбор темы в профиле пользователя в Firebase
        }
    });

    // Логика кнопки "Наверх"
    const scrollTopBtn = document.getElementById('scrollTopBtn');
    window.onscroll = () => {
        if (document.body.scrollTop > 100 || document.documentElement.scrollTop > 100) {
            scrollTopBtn.style.display = "block";
        } else {
            scrollTopBtn.style.display = "none";
        }
    };
    scrollTopBtn.addEventListener('click', () => {
        document.body.scrollTop = 0;
        document.documentElement.scrollTop = 0;
    });

    // Логика модального окна новостей
    const modal = document.getElementById('news-modal');
    const closeBtn = document.querySelector('.close-btn');
    // TODO: Добавить логику, чтобы окно показывалось не каждый раз
    // setTimeout(() => { modal.style.display = 'block'; }, 2000);
    closeBtn.onclick = () => { modal.style.display = "none"; }
    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }

    // Запуск основного приложения
    runApp();
});


// --- БЛОК 2: ОСНОВНАЯ ЛОГИКА ПРИЛОЖЕНИЯ ---

function runApp() {
    // Пытаемся получить данные из Telegram
    // ВРЕМЕННО: используем ID 'user1' для теста.
    let userId = 'user1';
    // if (window.Telegram && window.Telegram.WebApp) {
    //     window.Telegram.WebApp.ready();
    //     const tgUser = window.Telegram.WebApp.initDataUnsafe?.user;
    //     if (tgUser) {
    //         userId = tgUser.id.toString();
    //         // TODO: Сохранить/обновить данные пользователя в Firebase
    //     }
    // }

    if (userId) {
        fetchPurchases(userId);
        // TODO: Запускать загрузку данных для других разделов
        // fetchWarranties(userId);
        // fetchProfile(userId);
    } else {
        document.getElementById('page-purchases').innerHTML = '<h2>Ошибка</h2><p>Не удалось определить пользователя.</p>';
    }
}


// --- БЛОК 3: ЗАГРУЗКА И ОТОБРАЖЕНИЕ ДАННЫХ ---

function fetchPurchases(userId) {
    const container = document.getElementById('purchases-list-container');
    showSkeleton(container); // Показываем анимацию загрузки

    const purchasesRef = db.ref(`users/${userId}/purchases`);
    purchasesRef.on('value', (snapshot) => {
        const purchases = snapshot.val();
        renderPurchases(purchases, container);
    }, (error) => {
        console.error("Ошибка загрузки данных: ", error);
        container.innerHTML = '<p>Ошибка загрузки данных.</p>';
    });
}

function showSkeleton(container) {
    let skeletonHTML = '';
    for (let i = 0; i < 3; i++) {
        skeletonHTML += `
            <div class="skeleton">
                <div class="skeleton-line"></div>
                <div class="skeleton-line short"></div>
            </div>
        `;
    }
    container.innerHTML = skeletonHTML;
}

function renderPurchases(purchases, container) {
    container.innerHTML = ''; // Очищаем скелетон/старые данные

    if (!purchases) {
        container.innerHTML = '<p>У вас пока нет покупок.</p>';
        return;
    }

    Object.keys(purchases).forEach(key => {
        const purchase = purchases[key];
        const item = document.createElement('div');
        item.className = 'purchase-item';

        const iconClass = categoryIcons[purchase.category] || categoryIcons.default;
        
        item.innerHTML = `
            <div class="purchase-summary">
                <i class="${iconClass}"></i>
                <h4>${purchase.name}</h4>
                <span>&#9660;</span> <!-- Стрелочка вниз -->
            </div>
            <div class="purchase-details">
                <p><strong>Дата покупки:</strong> ${new Date(purchase.date).toLocaleDateString()}</p>
                <p><strong>Цена:</strong> ${purchase.price} руб.</p>
                ${purchase.warrantyUntil ? `<p><strong>Гарантия до:</strong> ${new Date(purchase.warrantyUntil).toLocaleDateString()}</p>` : ''}
                <!-- Сюда можно будет добавить другие детали -->
            </div>
        `;
        
        item.querySelector('.purchase-summary').addEventListener('click', () => {
            item.classList.toggle('open');
        });

        container.appendChild(item);
    });
}
