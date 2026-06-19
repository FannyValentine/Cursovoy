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

// ========== КОРЗИНА ==========
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// Сохранение корзины
function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartBadge();
    renderCartDropdown();
}

// Обновить значок корзины
function updateCartBadge() {
    const badge = document.querySelector('.cart-badge');
    if (badge) {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        badge.innerText = totalItems;
        badge.style.display = totalItems > 0 ? 'flex' : 'none';
    }
}

// Показать уведомление
function showToast(title, message, type = 'success') {
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-shopping-cart'}"></i>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close"><i class="fas fa-times"></i></button>
    `;
    
    document.body.appendChild(toast);
    
    toast.querySelector('.toast-close').addEventListener('click', () => toast.remove());
    
    setTimeout(() => {
        if (toast && toast.remove) toast.remove();
    }, 3000);
}

// Добавить в корзину
function addToCart(book, type, price) {
    const existingItem = cart.find(item => item.id === book.id && item.type === type);
    
    if (existingItem) {
        existingItem.quantity++;
        showToast('Корзина обновлена', `${book.title} (${type === 'rent' ? 'Аренда' : 'Покупка'}) добавлено еще раз`, 'success');
    } else {
        cart.push({
            id: book.id,
            title: book.title,
            author: book.author,
            cover_image: book.cover_image,
            type: type,
            price: price,
            quantity: 1
        });
        showToast('Добавлено в корзину', `${book.title} - ${type === 'rent' ? 'Аренда' : 'Покупка'} за ${price} ₽`, 'success');
    }
    
    saveCart();
}

// Удалить из корзины
function removeFromCart(itemId, type) {
    cart = cart.filter(item => !(item.id === itemId && item.type === type));
    saveCart();
    showToast('Удалено из корзины', 'Товар удален из корзины', 'success');
}

// Отрисовать корзину
function renderCartDropdown() {
    const cartItemsContainer = document.getElementById('cartItems');
    const cartTotalSpan = document.getElementById('cartTotal');
    
    if (!cartItemsContainer) return;
    
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `
            <div class="cart-empty">
                <i class="fas fa-shopping-cart"></i>
                <p>Корзина пуста</p>
                <small>Добавьте книги из каталога</small>
            </div>
        `;
        if (cartTotalSpan) cartTotalSpan.textContent = '0 ₽';
        return;
    }
    
    let total = 0;
    cartItemsContainer.innerHTML = cart.map(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        const typeText = item.type === 'rent' ? 'Аренда' : 'Покупка';
        return `
            <div class="cart-item">
                <div class="cart-item-image">
                    <img src="${item.cover_image || 'https://placehold.co/300x400/e2e8f0/1e3c3a?text=📖'}" 
                         alt="${escapeHtml(item.title)}"
                         onerror="this.src='https://placehold.co/300x400/e2e8f0/1e3c3a?text=📖'">
                </div>
                <div class="cart-item-details">
                    <div class="cart-item-title">${escapeHtml(item.title)}</div>
                    <div class="cart-item-author">${escapeHtml(item.author || 'Автор не указан')}</div>
                    <div class="cart-item-price">
                        ${item.price} ₽ × ${item.quantity}
                        <span class="cart-item-type">${typeText}</span>
                    </div>
                </div>
                <button class="cart-item-remove" data-id="${item.id}" data-type="${item.type}">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `;
    }).join('');
    
    if (cartTotalSpan) cartTotalSpan.textContent = total + ' ₽';
    
    document.querySelectorAll('.cart-item-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id);
            const type = btn.dataset.type;
            removeFromCart(id, type);
        });
    });
}

// Переключение корзины
function toggleCart() {
    const dropdown = document.getElementById('cartDropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
        renderCartDropdown();
    }
}

// Оформление заказа
async function checkout() {
    if (cart.length === 0) {
        showToast('Корзина пуста', 'Добавьте книги перед оформлением', 'error');
        return;
    }
    
    const user = getCurrentUser();
    if (!user) {
        showToast('Требуется авторизация', 'Войдите в аккаунт для оформления заказа', 'error');
        setTimeout(() => openModal(), 1500);
        return;
    }
    
    showToast('Заказ оформлен', 'Спасибо за покупку!', 'success');
    cart = [];
    saveCart();
    toggleCart();
}

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
                <!-- Удалена строка с отображением жанра -->
            </div>
            <div class="book-info">
                <div class="book-title">${escapeHtml(book.title)}</div>
                <div class="book-author">${escapeHtml(book.author)}</div>
                <div class="book-description">${book.description ? escapeHtml(book.description.substring(0, 80)) + '...' : ''}</div>
                <div class="book-actions">
                    <span class="price">${book.purchase_price || book.price} ₽</span>
                    <div>
                        <button class="rent-btn" data-id="${book.id}" data-title="${escapeHtml(book.title)}" data-author="${escapeHtml(book.author)}" data-cover="${book.cover_image || ''}" data-price="${book.rent_price || book.rent}">Аренда ${book.rent_price || book.rent} ₽</button>
                        <button class="buy-btn" data-id="${book.id}" data-title="${escapeHtml(book.title)}" data-author="${escapeHtml(book.author)}" data-cover="${book.cover_image || ''}" data-price="${book.purchase_price || book.price}">Купить</button>
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

const modal = document.getElementById('authModal');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const resetForm = document.getElementById('resetForm');
const modalTitle = document.getElementById('modalTitle');
const authMessage = document.getElementById('authMessage');

function openModal() {
    if (modal) {
        modal.style.display = 'block';
        showLoginForm();
    }
}

function closeModal() {
    if (modal) {
        modal.style.display = 'none';
        clearAuthMessage();
    }
}

function showLoginForm() {
    if (loginForm) loginForm.style.display = 'block';
    if (registerForm) registerForm.style.display = 'none';
    if (resetForm) resetForm.style.display = 'none';
    if (modalTitle) modalTitle.textContent = 'Вход в аккаунт';
    clearAuthMessage();
}

function showRegisterForm() {
    if (loginForm) loginForm.style.display = 'none';
    if (registerForm) registerForm.style.display = 'block';
    if (resetForm) resetForm.style.display = 'none';
    if (modalTitle) modalTitle.textContent = 'Регистрация';
    clearAuthMessage();
}

function showResetForm() {
    if (loginForm) loginForm.style.display = 'none';
    if (registerForm) registerForm.style.display = 'none';
    if (resetForm) resetForm.style.display = 'block';
    if (modalTitle) modalTitle.textContent = 'Сброс пароля';
    clearAuthMessage();
}

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

async function updateUserUI() {
    const user = getCurrentUser();
    const authButtons = document.getElementById('authButtons');
    const userMenuContainer = document.getElementById('userMenuContainer');
    const userMenu = document.getElementById('userMenu');
    const userName = document.getElementById('userName');
    
    if (user) {
        if (authButtons) authButtons.style.display = 'none';
        if (userMenuContainer && userMenu) {
            userMenuContainer.appendChild(userMenu);
            userMenu.style.display = 'block';
            if (userName) userName.textContent = user.username || user.email?.split('@')[0] || 'Пользователь';
        }
    } else {
        if (authButtons) authButtons.style.display = 'block';
        if (userMenu) userMenu.style.display = 'none';
    }
}

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
            loadBooksFromSupabase().then(renderBooks);
        }, 1500);
    } else {
        showAuthMessage(result.error || 'Неверный email или пароль');
    }
}

async function handleLogout() {
    const result = await logoutUser();
    if (result.success) {
        showToast('Выход из аккаунта', 'Вы успешно вышли', 'success');
        updateUserUI();
        loadBooksFromSupabase().then(renderBooks);
        cart = [];
        saveCart();
    } else {
        alert('Ошибка выхода: ' + result.error);
    }
}

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

function setupAuth() {
    const openModalBtn = document.getElementById('openLoginModal');
    if (openModalBtn) openModalBtn.addEventListener('click', openModal);
    
    const closeBtn = document.querySelector('.modal-close');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    
    window.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
    
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
    
    const registerBtn = document.getElementById('registerBtn');
    const loginBtn = document.getElementById('loginBtn');
    const resetBtn = document.getElementById('resetBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (registerBtn) registerBtn.addEventListener('click', handleRegister);
    if (loginBtn) loginBtn.addEventListener('click', handleLogin);
    if (resetBtn) resetBtn.addEventListener('click', handleResetPassword);
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    
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

// ========== ЗАПУСК ==========
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Страница загружена, инициализация...');
    
    setupAuth();
    
    await checkCurrentUser();
    await updateUserUI();
    
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
    
    setupSearch();
    mobileMenu();
    
    const cartBtn = document.querySelector('.cart-btn');
    if (cartBtn) {
        cartBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleCart();
        });
    }
    
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('cartDropdown');
        const cartButton = document.querySelector('.cart-btn');
        if (dropdown && cartButton && !cartButton.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove('show');
        }
    });
    
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) checkoutBtn.addEventListener('click', checkout);
    
    updateCartBadge();
});