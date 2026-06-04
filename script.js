// script.js
import { supabase } from './supabase.js';
import { 
    registerUser, 
    loginUser, 
    logoutUser, 
    checkCurrentUser,
    getCurrentUser,
    resetPassword
} from './auth.js';

// ========== ФУНКЦИИ РАБОТЫ С БАЗОЙ ДАННЫХ ==========
async function loadBooksFromSupabase() {
    try {
        const { data: books, error } = await supabase
            .from('books')
            .select('*');
        
        if (error) {
            console.error('Ошибка загрузки:', error);
            return [];
        }
        
        console.log(`✅ Загружено ${books.length} книг`);
        return books || [];
    } catch (error) {
        console.error('Ошибка подключения:', error);
        return [];
    }
}

async function searchBooksInSupabase(query) {
    if (!query || query.length < 2) {
        return await loadBooksFromSupabase();
    }
    
    try {
        const { data: books, error } = await supabase
            .from('books')
            .select('*')
            .or(`title.ilike.%${query}%,author.ilike.%${query}%`);
        
        if (error) {
            console.error('Ошибка поиска:', error);
            return [];
        }
        
        return books || [];
    } catch (error) {
        console.error('Ошибка:', error);
        return [];
    }
}

// ========== ФУНКЦИЯ ОТРИСОВКИ ==========
function renderBooks(books) {
    const booksContainer = document.getElementById('booksGrid');
    if (!booksContainer) return;
    
    if (!books || books.length === 0) {
        booksContainer.innerHTML = '<div style="text-align: center; padding: 40px;">📚 Книги не найдены</div>';
        return;
    }
    
    booksContainer.innerHTML = books.map(book => `
        <div class="book-card" data-id="${book.id}">
            <div class="book-cover">
                <img src="${book.cover_image || 'https://placehold.co/300x400/e2e8f0/1e3c3a?text=📖+No+Cover'}" 
                     alt="${book.title}" 
                     onerror="this.src='https://placehold.co/300x400/e2e8f0/1e3c3a?text=📖+No+Cover'">
            </div>
            <div class="book-info">
                <div class="book-title">${escapeHtml(book.title)}</div>
                <div class="book-author">${escapeHtml(book.author)}</div>
                <div class="book-description">${book.description ? escapeHtml(book.description.substring(0, 80)) + '...' : ''}</div>
                <div class="book-actions">
                    <span class="price">${book.purchase_price || book.price} ₽</span>
                    <div>
                        <button class="rent-btn" data-id="${book.id}" data-title="${escapeHtml(book.title)}" data-price="${book.rent_price || book.rent}">Аренда ${book.rent_price || book.rent} ₽</button>
                        <button class="buy-btn" data-id="${book.id}" data-title="${escapeHtml(book.title)}" data-price="${book.purchase_price || book.price}">Купить</button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    
    // Обработчики для кнопок
    document.querySelectorAll('.rent-btn, .buy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const title = btn.getAttribute('data-title');
            const price = btn.getAttribute('data-price');
            const action = btn.classList.contains('rent-btn') ? 'аренду' : 'покупку';
            alert(`✅ Книга "${title}" добавлена для ${action} за ${price} ₽`);
            updateCartBadge();
        });
    });
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function updateCartBadge() {
    const badge = document.querySelector('.cart-badge');
    if (badge) {
        let current = parseInt(badge.innerText) || 0;
        badge.innerText = current + 1;
    }
}

function setupSearch() {
    const searchToggle = document.getElementById('searchToggle');
    const searchBar = document.getElementById('searchBar');
    const searchInput = document.getElementById('searchInput');
    
    if (searchToggle && searchBar) {
        searchToggle.addEventListener('click', () => {
            searchBar.classList.toggle('open');
            if (searchBar.classList.contains('open')) {
                searchInput?.focus();
            }
        });
    }
    
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', async (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(async () => {
                const query = e.target.value;
                const books = await searchBooksInSupabase(query);
                renderBooks(books);
            }, 500);
        });
    }
}

function mobileMenu() {
    const btn = document.getElementById('mobileMenuBtn');
    const nav = document.querySelector('.nav');
    const actions = document.querySelector('.header-actions');
    
    if (btn && nav && actions) {
        let isOpen = false;
        btn.addEventListener('click', () => {
            if (!isOpen) {
                nav.style.display = 'flex';
                actions.style.display = 'flex';
                nav.style.flexDirection = 'column';
                nav.style.position = 'absolute';
                nav.style.top = '70px';
                nav.style.left = '0';
                nav.style.width = '100%';
                nav.style.backgroundColor = 'white';
                nav.style.padding = '20px';
                nav.style.gap = '16px';
                actions.style.position = 'absolute';
                actions.style.top = '200px';
                actions.style.left = '0';
                actions.style.width = '100%';
                actions.style.justifyContent = 'center';
                actions.style.backgroundColor = 'white';
                actions.style.padding = '16px';
                isOpen = true;
            } else {
                nav.style.display = '';
                actions.style.display = '';
                nav.style = '';
                actions.style = '';
                isOpen = false;
            }
        });
    }
}

// ========== УПРАВЛЕНИЕ АВТОРИЗАЦИЕЙ ==========

// Элементы модального окна
const modal = document.getElementById('authModal');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const resetForm = document.getElementById('resetForm');
const modalTitle = document.getElementById('modalTitle');
const authMessage = document.getElementById('authMessage');

// Открыть модальное окно
function openModal() {
    if (modal) {
        modal.style.display = 'block';
        showLoginForm();
    }
}

// Закрыть модальное окно
function closeModal() {
    if (modal) {
        modal.style.display = 'none';
        clearAuthMessage();
    }
}

// Показать форму входа
function showLoginForm() {
    if (loginForm) loginForm.style.display = 'block';
    if (registerForm) registerForm.style.display = 'none';
    if (resetForm) resetForm.style.display = 'none';
    if (modalTitle) modalTitle.textContent = 'Вход в аккаунт';
    clearAuthMessage();
}

// Показать форму регистрации
function showRegisterForm() {
    if (loginForm) loginForm.style.display = 'none';
    if (registerForm) registerForm.style.display = 'block';
    if (resetForm) resetForm.style.display = 'none';
    if (modalTitle) modalTitle.textContent = 'Регистрация';
    clearAuthMessage();
}

// Показать форму сброса пароля
function showResetForm() {
    if (loginForm) loginForm.style.display = 'none';
    if (registerForm) registerForm.style.display = 'none';
    if (resetForm) resetForm.style.display = 'block';
    if (modalTitle) modalTitle.textContent = 'Сброс пароля';
    clearAuthMessage();
}

// Показать сообщение
function showAuthMessage(text, isError = true) {
    if (authMessage) {
        authMessage.textContent = text;
        authMessage.className = `auth-message ${isError ? 'error' : 'success'}`;
        authMessage.style.display = 'block';
        setTimeout(() => {
            if (authMessage) {
                authMessage.style.display = 'none';
            }
        }, 3000);
    }
}

function clearAuthMessage() {
    if (authMessage) {
        authMessage.textContent = '';
        authMessage.className = 'auth-message';
        authMessage.style.display = 'none';
    }
}

// Обновить UI после входа
async function updateUserUI() {
    const user = getCurrentUser();
    const authButtons = document.getElementById('authButtons');
    const userMenuContainer = document.getElementById('userMenuContainer');
    const userMenu = document.getElementById('userMenu');
    const userName = document.getElementById('userName');
    
    if (user) {
        // Пользователь вошел
        if (authButtons) authButtons.style.display = 'none';
        if (userMenuContainer && userMenu) {
            userMenuContainer.appendChild(userMenu);
            userMenu.style.display = 'block';
            if (userName) userName.textContent = user.username || user.email?.split('@')[0] || 'Пользователь';
        }
    } else {
        // Пользователь вышел
        if (authButtons) authButtons.style.display = 'block';
        if (userMenu) userMenu.style.display = 'none';
    }
}

// Обработчик регистрации
async function handleRegister() {
    const username = document.getElementById('regUsername')?.value;
    const email = document.getElementById('regEmail')?.value;
    const password = document.getElementById('regPassword')?.value;
    const confirmPassword = document.getElementById('regConfirmPassword')?.value;
    
    if (!username || !email || !password) {
        showAuthMessage('Заполните все поля');
        return;
    }
    
    if (password !== confirmPassword) {
        showAuthMessage('Пароли не совпадают');
        return;
    }
    
    if (password.length < 6) {
        showAuthMessage('Пароль должен содержать минимум 6 символов');
        return;
    }
    
    const result = await registerUser(email, password, username);
    
    if (result.success) {
        showAuthMessage('Регистрация успешна! Теперь войдите в аккаунт.', false);
        setTimeout(() => {
            showLoginForm();
        }, 2000);
    } else {
        showAuthMessage(result.error || 'Ошибка регистрации');
    }
}

// Обработчик входа
async function handleLogin() {
    const email = document.getElementById('loginEmail')?.value;
    const password = document.getElementById('loginPassword')?.value;
    
    if (!email || !password) {
        showAuthMessage('Заполните все поля');
        return;
    }
    
    const result = await loginUser(email, password);
    
    if (result.success) {
        showAuthMessage('Добро пожаловать!', false);
        setTimeout(() => {
            closeModal();
            updateUserUI();
            // Перезагружаем книги
            loadBooksFromSupabase().then(renderBooks);
        }, 1500);
    } else {
        showAuthMessage(result.error || 'Неверный email или пароль');
    }
}

// Обработчик выхода
async function handleLogout() {
    const result = await logoutUser();
    if (result.success) {
        alert('Вы вышли из аккаунта');
        updateUserUI();
        // Перезагружаем книги
        loadBooksFromSupabase().then(renderBooks);
    } else {
        alert('Ошибка выхода: ' + result.error);
    }
}

// Обработчик сброса пароля
async function handleResetPassword() {
    const email = document.getElementById('resetEmail')?.value;
    
    if (!email) {
        showAuthMessage('Введите email');
        return;
    }
    
    const result = await resetPassword(email);
    
    if (result.success) {
        showAuthMessage('Инструкции по сбросу пароля отправлены на email', false);
        setTimeout(() => {
            showLoginForm();
        }, 3000);
    } else {
        showAuthMessage(result.error || 'Ошибка сброса пароля');
    }
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========

// Настройка обработчиков событий
function setupAuth() {
    // Кнопки открытия модального окна
    const openModalBtn = document.getElementById('openLoginModal');
    if (openModalBtn) openModalBtn.addEventListener('click', openModal);
    
    // Закрытие модального окна
    const closeBtn = document.querySelector('.modal-close');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    
    // Клик вне модального окна
    window.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
    
    // Переключение между формами
    const switchToRegister = document.getElementById('switchToRegister');
    const switchToLogin = document.getElementById('switchToLogin');
    const forgotPassword = document.getElementById('forgotPassword');
    const backToLogin = document.getElementById('backToLogin');
    
    if (switchToRegister) switchToRegister.addEventListener('click', (e) => {
        e.preventDefault();
        showRegisterForm();
    });
    
    if (switchToLogin) switchToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        showLoginForm();
    });
    
    if (forgotPassword) forgotPassword.addEventListener('click', (e) => {
        e.preventDefault();
        showResetForm();
    });
    
    if (backToLogin) backToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        showLoginForm();
    });
    
    // Кнопки действий
    const registerBtn = document.getElementById('registerBtn');
    const loginBtn = document.getElementById('loginBtn');
    const resetBtn = document.getElementById('resetBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (registerBtn) registerBtn.addEventListener('click', handleRegister);
    if (loginBtn) loginBtn.addEventListener('click', handleLogin);
    if (resetBtn) resetBtn.addEventListener('click', handleResetPassword);
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    
    // Enter для отправки форм
    const inputs = document.querySelectorAll('.auth-form input');
    inputs.forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                if (loginForm && loginForm.style.display !== 'none') handleLogin();
                else if (registerForm && registerForm.style.display !== 'none') handleRegister();
                else if (resetForm && resetForm.style.display !== 'none') handleResetPassword();
            }
        });
    });
}

// ========== ЗАПУСК ПРИ ЗАГРУЗКЕ СТРАНИЦЫ ==========
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Страница загружена, инициализация...');
    
    // Настройка авторизации
    setupAuth();
    
    // Проверяем текущего пользователя
    await checkCurrentUser();
    await updateUserUI();
    
    // Загружаем книги
    const booksContainer = document.getElementById('booksGrid');
    if (booksContainer) {
        booksContainer.innerHTML = '<div style="text-align: center; padding: 40px;">📚 Загрузка книг...</div>';
    }
    
    try {
        const books = await loadBooksFromSupabase();
        renderBooks(books);
    } catch (error) {
        console.error('Ошибка при загрузке книг:', error);
        if (booksContainer) {
            booksContainer.innerHTML = '<div style="text-align: center; padding: 40px; color: red;">❌ Ошибка загрузки книг</div>';
        }
    }
    
    // Настройка поиска и меню
    setupSearch();
    mobileMenu();
    
    // Корзина
    const cartBtn = document.querySelector('.cart-btn');
    if (cartBtn) {
        cartBtn.addEventListener('click', () => alert('🛒 Корзина: пока пуста. Добавьте книгу!'));
    }
});