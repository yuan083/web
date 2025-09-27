// 用户认证系统
class AuthManager {
    constructor() {
        this.SESSION_KEY = 'taxLearningSession';
        this.currentUser = null;
        this.sessionExpiry = 24 * 60 * 60 * 1000; // 24小时过期
    }

    // 初始化认证管理器
    async init() {
        await this.loadSession();
        return this.currentUser;
    }

    // 用户注册
    async register(userData) {
        const { email, password, nickname, role = 'student' } = userData;

        // 验证输入
        if (!email || !password) {
            throw new Error('邮箱和密码不能为空');
        }

        if (!this.isValidEmail(email)) {
            throw new Error('邮箱格式不正确');
        }

        if (password.length < 6) {
            throw new Error('密码长度不能少于6位');
        }

        // 检查邮箱是否已存在
        const existingUser = await window.dbManager.getUserByEmail(email);
        if (existingUser) {
            throw new Error('该邮箱已被注册');
        }

        // 创建用户
        const newUser = await window.dbManager.createUser({
            email,
            password,
            nickname: nickname || email.split('@')[0],
            role
        });

        // 自动登录
        await this.createSession(newUser);

        return {
            success: true,
            user: this.sanitizeUser(newUser),
            message: '注册成功'
        };
    }

    // 用户登录
    async login(credentials) {
        const { email, password } = credentials;

        // 验证输入
        if (!email || !password) {
            throw new Error('邮箱和密码不能为空');
        }

        // 查找用户
        const user = await window.dbManager.getUserByEmail(email);
        if (!user) {
            throw new Error('邮箱或密码错误');
        }

        // 验证密码
        if (!window.dbManager.verifyPassword(password, user.password)) {
            throw new Error('邮箱或密码错误');
        }

        // 更新最后登录时间
        await window.dbManager.updateUser(user.id, {
            last_login: new Date().toISOString()
        });

        // 创建会话
        await this.createSession(user);

        return {
            success: true,
            user: this.sanitizeUser(user),
            message: '登录成功'
        };
    }

    // 用户登出
    async logout() {
        try {
            // 清除会话数据
            sessionStorage.removeItem(this.SESSION_KEY);
            localStorage.removeItem(this.SESSION_KEY + '_persistent');
            
            // 清除当前用户
            this.currentUser = null;
            
            // 触发登出事件
            window.dispatchEvent(new CustomEvent('auth:logout'));
            
            return { success: true, message: '已安全登出' };
        } catch (error) {
            console.error('登出失败:', error);
            return { success: false, message: '登出失败' };
        }
    }

    // 创建会话
    async createSession(user) {
        const sessionData = {
            userId: user.id,
            userEmail: user.email,
            userRole: user.role,
            loginTime: Date.now(),
            expiryTime: Date.now() + this.sessionExpiry,
            rememberMe: false
        };

        // 存储到sessionStorage
        sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionData));

        // 同时存储到localStorage作为持久化备份
        localStorage.setItem(this.SESSION_KEY + '_persistent', JSON.stringify({
            ...sessionData,
            expiryTime: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30天
        }));

        this.currentUser = user;
        
        // 触发登录事件
        window.dispatchEvent(new CustomEvent('auth:login', { detail: { user } }));
    }

    // 加载会话
    async loadSession() {
        try {
            // 优先从sessionStorage加载
            let sessionData = sessionStorage.getItem(this.SESSION_KEY);
            
            // 如果sessionStorage中没有，尝试从localStorage加载
            if (!sessionData) {
                const persistentSession = localStorage.getItem(this.SESSION_KEY + '_persistent');
                if (persistentSession) {
                    const parsed = JSON.parse(persistentSession);
                    if (parsed.expiryTime > Date.now()) {
                        sessionData = persistentSession;
                        // 恢复到sessionStorage
                        sessionStorage.setItem(this.SESSION_KEY, sessionData);
                    } else {
                        // 会话已过期，清除持久化数据
                        localStorage.removeItem(this.SESSION_KEY + '_persistent');
                    }
                }
            }

            if (!sessionData) {
                this.currentUser = null;
                return null;
            }

            const session = JSON.parse(sessionData);
            
            // 检查会话是否过期
            if (session.expiryTime < Date.now()) {
                await this.logout();
                return null;
            }

            // 获取用户完整信息
            const user = await window.dbManager.get('users', session.userId);
            if (!user) {
                await this.logout();
                return null;
            }

            this.currentUser = user;
            
            // 更新会话过期时间
            session.expiryTime = Date.now() + this.sessionExpiry;
            sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
            
            return user;
        } catch (error) {
            console.error('加载会话失败:', error);
            await this.logout();
            return null;
        }
    }

    // 获取当前用户
    getCurrentUser() {
        return this.currentUser ? this.sanitizeUser(this.currentUser) : null;
    }

    // 检查是否已登录
    isAuthenticated() {
        return this.currentUser !== null;
    }

    // 检查用户权限
    hasPermission(permission) {
        if (!this.currentUser) return false;
        
        const permissions = {
            'student': ['view_cards', 'study', 'create_bookmarks'],
            'teacher': ['view_cards', 'study', 'create_bookmarks', 'create_decks', 'edit_own_content'],
            'admin': ['view_cards', 'study', 'create_bookmarks', 'create_decks', 'edit_own_content', 'manage_users', 'manage_platform']
        };

        const userPermissions = permissions[this.currentUser.role] || [];
        return userPermissions.includes(permission);
    }

    // 检查是否是内容所有者
    isContentOwner(contentUserId) {
        return this.currentUser && this.currentUser.id === contentUserId;
    }

    // 更新用户信息
    async updateProfile(updates) {
        if (!this.currentUser) {
            throw new Error('用户未登录');
        }

        const allowedUpdates = ['nickname', 'avatar', 'settings'];
        const filteredUpdates = {};
        
        for (const key of allowedUpdates) {
            if (updates[key] !== undefined) {
                filteredUpdates[key] = updates[key];
            }
        }

        const updatedUser = await window.dbManager.updateUser(this.currentUser.id, filteredUpdates);
        this.currentUser = updatedUser;
        
        return {
            success: true,
            user: this.sanitizeUser(updatedUser),
            message: '个人信息更新成功'
        };
    }

    // 修改密码
    async changePassword(currentPassword, newPassword) {
        if (!this.currentUser) {
            throw new Error('用户未登录');
        }

        if (newPassword.length < 6) {
            throw new Error('新密码长度不能少于6位');
        }

        // 验证当前密码
        if (!window.dbManager.verifyPassword(currentPassword, this.currentUser.password)) {
            throw new Error('当前密码错误');
        }

        // 更新密码
        await window.dbManager.updateUser(this.currentUser.id, {
            password: window.dbManager.hashPassword(newPassword)
        });

        // 强制重新登录
        await this.logout();

        return {
            success: true,
            message: '密码修改成功，请重新登录'
        };
    }

    // 忘记密码（本地版本，简化处理）
    async forgotPassword(email) {
        const user = await window.dbManager.getUserByEmail(email);
        if (!user) {
            throw new Error('该邮箱未注册');
        }

        // 在本地版本中，只能重置为默认密码
        const defaultPassword = '123456';
        await window.dbManager.updateUser(user.id, {
            password: window.dbManager.hashPassword(defaultPassword)
        });

        return {
            success: true,
            message: `密码已重置为: ${defaultPassword}`
        };
    }

    // 删除账户
    async deleteAccount(password) {
        if (!this.currentUser) {
            throw new Error('用户未登录');
        }

        // 验证密码
        if (!window.dbManager.verifyPassword(password, this.currentUser.password)) {
            throw new Error('密码错误');
        }

        // 删除用户相关数据
        try {
            // 删除用户创建的科目和卡片
            const userDecks = await window.dbManager.getUserDecks(this.currentUser.id);
            for (const deck of userDecks) {
                // 删除科目下的卡片
                const cards = await window.dbManager.getDeckCards(deck.id);
                for (const card of cards) {
                    await window.dbManager.delete('cards', card.id);
                }
                await window.dbManager.delete('decks', deck.id);
            }

            // 删除用户的学习进度
            const progress = await window.dbManager.getUserProgress(this.currentUser.id);
            for (const item of progress) {
                await window.dbManager.delete('progress', [this.currentUser.id, item.card_id]);
            }

            // 删除用户统计
            await window.dbManager.delete('user_stats', this.currentUser.id);

            // 删除用户书签
            const bookmarks = await window.dbManager.getByIndex('bookmarks', 'user_id', this.currentUser.id);
            for (const bookmark of bookmarks) {
                await window.dbManager.delete('bookmarks', bookmark.id);
            }

            // 删除用户
            await window.dbManager.delete('users', this.currentUser.id);

            // 登出
            await this.logout();

            return {
                success: true,
                message: '账户删除成功'
            };
        } catch (error) {
            console.error('删除账户失败:', error);
            throw new Error('删除账户失败，请重试');
        }
    }

    // 工具方法
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    sanitizeUser(user) {
        if (!user) return null;
        
        const { password, ...sanitizedUser } = user;
        return sanitizedUser;
    }

    // 验证会话有效性
    async validateSession() {
        if (!this.currentUser) return false;
        
        try {
            // 检查用户是否仍然存在
            const user = await window.dbManager.get('users', this.currentUser.id);
            if (!user) {
                await this.logout();
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('验证会话失败:', error);
            await this.logout();
            return false;
        }
    }

    // 刷新会话
    async refreshSession() {
        if (!this.currentUser) return false;
        
        try {
            const sessionData = sessionStorage.getItem(this.SESSION_KEY);
            if (!sessionData) return false;
            
            const session = JSON.parse(sessionData);
            session.expiryTime = Date.now() + this.sessionExpiry;
            sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
            
            return true;
        } catch (error) {
            console.error('刷新会话失败:', error);
            return false;
        }
    }

    // 获取用户统计信息
    async getUserStats() {
        if (!this.currentUser) return null;
        
        try {
            let stats = await window.dbManager.get('user_stats', this.currentUser.id);
            
            if (!stats) {
                // 创建默认统计
                stats = {
                    user_id: this.currentUser.id,
                    total_study_time: 0,
                    total_cards_studied: 0,
                    total_sessions: 0,
                    current_streak: 0,
                    longest_streak: 0,
                    total_decks: 0,
                    mastered_cards: 0,
                    average_accuracy: 0,
                    last_study_date: null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
                await window.dbManager.put('user_stats', stats);
            }
            
            return stats;
        } catch (error) {
            console.error('获取用户统计失败:', error);
            return null;
        }
    }
}

// 创建全局认证管理器实例
window.authManager = new AuthManager();

// 导出认证管理器
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManager;
}