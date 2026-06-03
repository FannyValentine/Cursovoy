// auth.js
import { supabase } from './supabase.js';

// Состояние авторизации
let currentUser = null;

// ========== ФУНКЦИИ АВТОРИЗАЦИИ ==========

// Регистрация нового пользователя
export async function registerUser(email, password, username) {
    try {
        // 1. Регистрируем пользователя в Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    username: username,
                    avatar_url: null
                }
            }
        });
        
        if (authError) throw authError;
        
        // 2. Сохраняем дополнительные данные в таблицу profiles
        if (authData.user) {
            const { error: profileError } = await supabase
                .from('profiles')
                .insert([
                    {
                        id: authData.user.id,
                        email: email,
                        username: username,
                        created_at: new Date(),
                        role: 'user'
                    }
                ]);
            
            if (profileError) console.error('Ошибка сохранения профиля:', profileError);
        }
        
        return { success: true, user: authData.user };
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        return { success: false, error: error.message };
    }
}

// Вход в аккаунт
export async function loginUser(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) throw error;
        
        // Получаем дополнительные данные пользователя
        const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();
        
        currentUser = {
            id: data.user.id,
            email: data.user.email,
            ...profileData
        };
        
        return { success: true, user: currentUser };
    } catch (error) {
        console.error('Ошибка входа:', error);
        return { success: false, error: error.message };
    }
}

// Выход из аккаунта
export async function logoutUser() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        currentUser = null;
        return { success: true };
    } catch (error) {
        console.error('Ошибка выхода:', error);
        return { success: false, error: error.message };
    }
}

// Проверка текущего пользователя
export async function checkCurrentUser() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
            currentUser = null;
            return null;
        }
        
        // Получаем профиль
        const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
        
        currentUser = {
            id: user.id,
            email: user.email,
            ...profileData
        };
        
        return currentUser;
    } catch (error) {
        console.error('Ошибка проверки пользователя:', error);
        return null;
    }
}

// Получить текущего пользователя
export function getCurrentUser() {
    return currentUser;
}

// Сброс пароля
export async function resetPassword(email) {
    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/reset-password.html'
        });
        
        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Ошибка сброса пароля:', error);
        return { success: false, error: error.message };
    }
}