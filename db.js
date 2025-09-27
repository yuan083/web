// 数据库操作模块 - IndexedDB封装
class DatabaseManager {
    constructor() {
        this.dbName = 'TaxLearningPlatformDB';
        this.dbVersion = 1;
        this.db = null;
        this.initPromise = null;
    }

    // 初始化数据库
    async init() {
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = (event) => {
                console.error('数据库打开失败:', event.target.error);
                reject(event.target.error);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('数据库初始化成功');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                console.log('数据库升级中...');
                const db = event.target.result;
                this.createSchema(db);
            };
        });

        return this.initPromise;
    }

    // 创建数据库架构
    createSchema(db) {
        // 创建用户表
        if (!db.objectStoreNames.contains('users')) {
            const userStore = db.createObjectStore('users', { keyPath: 'id' });
            userStore.createIndex('email', 'email', { unique: true });
            userStore.createIndex('role', 'role', { unique: false });
            userStore.createIndex('created_at', 'created_at', { unique: false });
        }

        // 创建科目表
        if (!db.objectStoreNames.contains('decks')) {
            const deckStore = db.createObjectStore('decks', { keyPath: 'id', autoIncrement: true });
            deckStore.createIndex('user_id', 'user_id', { unique: false });
            deckStore.createIndex('visibility', 'visibility', { unique: false });
            deckStore.createIndex('category', 'category', { unique: false });
            deckStore.createIndex('created_at', 'created_at', { unique: false });
        }

        // 创建卡片表
        if (!db.objectStoreNames.contains('cards')) {
            const cardStore = db.createObjectStore('cards', { keyPath: 'id', autoIncrement: true });
            cardStore.createIndex('deck_id', 'deck_id', { unique: false });
            cardStore.createIndex('card_type', 'card_type', { unique: false });
            cardStore.createIndex('difficulty', 'difficulty', { unique: false });
            cardStore.createIndex('created_at', 'created_at', { unique: false });
        }

        // 创建学习进度表
        if (!db.objectStoreNames.contains('progress')) {
            const progressStore = db.createObjectStore('progress', { keyPath: ['user_id', 'card_id'] });
            progressStore.createIndex('user_id', 'user_id', { unique: false });
            progressStore.createIndex('card_id', 'card_id', { unique: false });
            progressStore.createIndex('deck_id', 'deck_id', { unique: false });
            progressStore.createIndex('review_date', 'review_date', { unique: false });
            progressStore.createIndex('user_review_date', ['user_id', 'review_date'], { unique: false });
        }

        // 创建学习会话表
        if (!db.objectStoreNames.contains('study_sessions')) {
            const sessionStore = db.createObjectStore('study_sessions', { keyPath: 'id', autoIncrement: true });
            sessionStore.createIndex('user_id', 'user_id', { unique: false });
            sessionStore.createIndex('deck_id', 'deck_id', { unique: false });
            sessionStore.createIndex('start_time', 'start_time', { unique: false });
        }

        // 创建用户统计表
        if (!db.objectStoreNames.contains('user_stats')) {
            const statsStore = db.createObjectStore('user_stats', { keyPath: 'user_id' });
            statsStore.createIndex('last_study_date', 'last_study_date', { unique: false });
        }

        // 创建书签表
        if (!db.objectStoreNames.contains('bookmarks')) {
            const bookmarkStore = db.createObjectStore('bookmarks', { keyPath: 'id', autoIncrement: true });
            bookmarkStore.createIndex('user_id', 'user_id', { unique: false });
            bookmarkStore.createIndex('card_id', 'card_id', { unique: false });
            bookmarkStore.createIndex('deck_id', 'deck_id', { unique: false });
        }

        // 创建媒体文件表
        if (!db.objectStoreNames.contains('media_files')) {
            const mediaStore = db.createObjectStore('media_files', { keyPath: 'id', autoIncrement: true });
            mediaStore.createIndex('user_id', 'user_id', { unique: false });
            mediaStore.createIndex('file_type', 'file_type', { unique: false });
            mediaStore.createIndex('card_id', 'card_id', { unique: false });
        }

        console.log('数据库架构创建完成');
    }

    // 获取数据库连接
    async getDB() {
        if (!this.db) {
            await this.init();
        }
        return this.db;
    }

    // 通用数据库操作方法
    async operation(storeName, mode, callback) {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], mode);
            const store = transaction.objectStore(storeName);
            const request = callback(store);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // 添加数据
    async add(storeName, data) {
        return this.operation(storeName, 'readwrite', (store) => store.add(data));
    }

    // 更新数据
    async put(storeName, data) {
        return this.operation(storeName, 'readwrite', (store) => store.put(data));
    }

    // 获取数据
    async get(storeName, key) {
        return this.operation(storeName, 'readonly', (store) => store.get(key));
    }

    // 删除数据
    async delete(storeName, key) {
        return this.operation(storeName, 'readwrite', (store) => store.delete(key));
    }

    // 获取所有数据
    async getAll(storeName) {
        return this.operation(storeName, 'readonly', (store) => store.getAll());
    }

    // 通过索引获取数据
    async getByIndex(storeName, indexName, key) {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(key);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // 通过索引获取单个数据
    async getByIndexSingle(storeName, indexName, key) {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.get(key);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // 清空表
    async clear(storeName) {
        return this.operation(storeName, 'readwrite', (store) => store.clear());
    }

    // 计算表中的记录数
    async count(storeName) {
        return this.operation(storeName, 'readonly', (store) => store.count());
    }

    // 批量操作
    async bulkAdd(storeName, items) {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            let completed = 0;
            let hasError = false;

            items.forEach((item, index) => {
                const request = store.add(item);
                
                request.onsuccess = () => {
                    completed++;
                    if (completed === items.length && !hasError) {
                        resolve();
                    }
                };
                
                request.onerror = () => {
                    hasError = true;
                    reject(request.error);
                };
            });
        });
    }

    // 游标遍历
    async cursor(storeName, callback, mode = 'readonly') {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], mode);
            const store = transaction.objectStore(storeName);
            const request = store.openCursor();

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    callback(cursor);
                    cursor.continue();
                } else {
                    resolve();
                }
            };

            request.onerror = () => reject(request.error);
        });
    }

    // 索引游标遍历
    async indexCursor(storeName, indexName, key, callback, mode = 'readonly') {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], mode);
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.openCursor(key);

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    callback(cursor);
                    cursor.continue();
                } else {
                    resolve();
                }
            };

            request.onerror = () => reject(request.error);
        });
    }

    // 用户相关操作
    async createUser(userData) {
        const user = {
            id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            email: userData.email,
            password: this.hashPassword(userData.password),
            nickname: userData.nickname || userData.email,
            role: userData.role || 'student',
            avatar: userData.avatar || null,
            created_at: new Date().toISOString(),
            last_login: null,
            settings: {
                theme: 'light',
                language: 'zh-CN',
                study_reminder: true,
                review_interval: [1, 3, 7, 14, 30]
            }
        };
        return this.add('users', user);
    }

    async getUserByEmail(email) {
        return this.getByIndexSingle('users', 'email', email);
    }

    async updateUser(userId, updates) {
        const user = await this.get('users', userId);
        if (user) {
            Object.assign(user, updates);
            user.updated_at = new Date().toISOString();
            return this.put('users', user);
        }
        throw new Error('用户不存在');
    }

    // 科目相关操作
    async createDeck(deckData) {
        const deck = {
            name: deckData.name,
            description: deckData.description || '',
            user_id: deckData.user_id,
            visibility: deckData.visibility || 'private',
            category: deckData.category || '税务师考试',
            difficulty: deckData.difficulty || 'intermediate',
            cover_image: deckData.cover_image || null,
            is_featured: deckData.is_featured || false,
            download_count: 0,
            card_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            tags: deckData.tags || []
        };
        return this.add('decks', deck);
    }

    async getUserDecks(userId) {
        return this.getByIndex('decks', 'user_id', userId);
    }

    async getPublicDecks() {
        return this.getByIndex('decks', 'visibility', 'public');
    }

    async getAccessibleDecks(userId) {
        const userDecks = await this.getUserDecks(userId);
        const publicDecks = await this.getPublicDecks();
        return [...userDecks, ...publicDecks.filter(deck => deck.user_id !== userId)];
    }

    // 卡片相关操作
    async createCard(cardData) {
        const card = {
            deck_id: cardData.deck_id,
            question: cardData.question,
            answer: cardData.answer,
            card_type: cardData.card_type || 'qa',
            difficulty: cardData.difficulty || 3,
            options: cardData.options || [],
            correct_answer: cardData.correct_answer || null,
            explanation: cardData.explanation || '',
            image: cardData.image || null,
            audio: cardData.audio || null,
            video: cardData.video || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            tags: cardData.tags || []
        };
        return this.add('cards', card);
    }

    async getDeckCards(deckId) {
        return this.getByIndex('cards', 'deck_id', deckId);
    }

    // 学习进度相关操作
    async saveProgress(progressData) {
        const progress = {
            user_id: progressData.user_id,
            card_id: progressData.card_id,
            deck_id: progressData.deck_id,
            level: progressData.level || 0,
            review_date: progressData.review_date,
            last_answered: progressData.last_answered,
            total_attempts: progressData.total_attempts || 0,
            correct_attempts: progressData.correct_attempts || 0,
            streak: progressData.streak || 0,
            ease_factor: progressData.ease_factor || 2.5,
            interval: progressData.interval || 1,
            first_seen: progressData.first_seen || new Date().toISOString(),
            last_reviewed: progressData.last_reviewed || new Date().toISOString(),
            time_spent: progressData.time_spent || 0,
            notes: progressData.notes || ''
        };
        return this.put('progress', progress);
    }

    async getUserProgress(userId) {
        return this.getByIndex('progress', 'user_id', userId);
    }

    async getDueCards(userId, date = new Date()) {
        const today = date.toISOString().split('T')[0];
        return this.getByIndex('progress', 'user_review_date', [userId, today]);
    }

    // 工具方法
    hashPassword(password) {
        // 简单的密码哈希，实际应用中应使用更安全的方法
        return btoa(password + 'salt_' + Date.now());
    }

    verifyPassword(password, hash) {
        // 简单的密码验证
        return this.hashPassword(password) === hash;
    }

    generateId(prefix = '') {
        return `${prefix}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // 数据导出
    async exportData() {
        const tables = ['users', 'decks', 'cards', 'progress', 'study_sessions', 'user_stats', 'bookmarks', 'media_files'];
        const exportData = {};
        
        for (const table of tables) {
            try {
                exportData[table] = await this.getAll(table);
            } catch (error) {
                console.warn(`导出表 ${table} 失败:`, error);
                exportData[table] = [];
            }
        }
        
        exportData.exportDate = new Date().toISOString();
        exportData.version = '1.0';
        
        return exportData;
    }

    // 数据导入
    async importData(data) {
        const tables = ['users', 'decks', 'cards', 'progress', 'study_sessions', 'user_stats', 'bookmarks', 'media_files'];
        
        for (const table of tables) {
            if (data[table] && Array.isArray(data[table])) {
                try {
                    await this.clear(table);
                    await this.bulkAdd(table, data[table]);
                } catch (error) {
                    console.warn(`导入表 ${table} 失败:`, error);
                }
            }
        }
        
        return true;
    }

    // 清空所有数据
    async clearAllData() {
        const tables = ['users', 'decks', 'cards', 'progress', 'study_sessions', 'user_stats', 'bookmarks', 'media_files'];
        
        for (const table of tables) {
            try {
                await this.clear(table);
            } catch (error) {
                console.warn(`清空表 ${table} 失败:`, error);
            }
        }
        
        return true;
    }
}

// 创建全局数据库管理器实例
window.dbManager = new DatabaseManager();

// 导出数据库管理器
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DatabaseManager;
}