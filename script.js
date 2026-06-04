// script.js
import { supabase } from './supabase.js';

// ========== ФУНКЦИИ РАБОТЫ С БАЗОЙ ДАННЫХ ==========
async function loadBooksFromSupabase() {
    try {
        // Убираем order by created_at, так как этой колонки нет
        const { data: books, error } = await supabase
            .from('books')
            .select('*');
            // .order('created_at', { ascending: false }); // УДАЛЯЕМ ЭТУ СТРОКУ
        
        if (error) {
            console.error('Ошибка загрузки:', error);
            return [];
        }
        
        console.log(`✅ Загружено ${books.length} книг`);
        console.log('Пример книги:', books[0]); // Посмотрим структуру
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
    const container = document.getElementById('booksGrid');
    if (!container) return;
    
    if (!books || books.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 40px;">📚 Книги не найдены</div>';
        return;
    }
    
    container.innerHTML = books.map(book => `
        <div class="book-card" data-id="${book.id}">
            <div class="book-cover">
                <img src="${book.cover_image || book.cover || 'https://placehold.co/300x400/e2e8f0/1e3c3a?text=📖+No+Cover'}" 
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

// ========== ЗАПУСК ПРИ ЗАГРУЗКЕ СТРАНИЦЫ ==========
document.addEventListener('DOMContentLoaded', async () => {
    // Показываем загрузку
    const container = document.getElementById('booksGrid');
    if (container) {
        container.innerHTML = '<div style="text-align: center; padding: 40px;">📚 Загрузка книг...</div>';
    }
    
    // Загружаем книги из Supabase
    const books = await loadBooksFromSupabase();
    renderBooks(books);
    
    // Настройка поиска и меню
    setupSearch();
    mobileMenu();
    
    // Корзина
    const cartBtn = document.querySelector('.cart-btn');
    if (cartBtn) {
        cartBtn.addEventListener('click', () => alert('🛒 Корзина: пока пуста. Добавьте книгу!'));
    }
    
    // Кнопка входа
    const loginBtn = document.querySelector('.btn-outline');
    if (loginBtn && loginBtn.innerText.includes('Войти')) {
        loginBtn.addEventListener('click', () => alert('🔐 Форма входа будет доступна в ближайшее время'));
    }
});