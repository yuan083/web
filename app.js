// 税务学习平台 - 应用核心逻辑
class TaxLearningApp {
    constructor() {
        this.currentScreen = 'loading';
        this.currentDeck = null;
        this.currentCard = null;
        this.studySession = null;
        this.searchResults = [];
        this.reviewIntervals = [1, 3, 7, 14, 30, 60, 120, 240]; // 间隔重复算法的时间间隔
        
        // 初始化组件
        this.init();
    }

    async init() {
        try {
            console.log('正在初始化应用...');
            
            // 初始化数据库
            await window.dbManager.init();
            console.log('数据库初始化完成');
            
            // 初始化认证系统
            await window.authManager.init();
            console.log('认证系统初始化完成');
            
            // 绑定事件监听器
            this.bindEvents();
            console.log('事件监听器绑定完成');
            
            // 显示初始界面
            await this.showInitialScreen();
            console.log('初始界面显示完成');
            
            // 监听认证事件
            window.addEventListener('auth:login', this.handleLogin.bind(this));
            window.addEventListener('auth:logout', this.handleLogout.bind(this));
            
            console.log('应用初始化完成');
        } catch (error) {
            console.error('应用初始化失败:', error);
            this.showToast('应用初始化失败: ' + error.message, 'error');
        }
    }

    // 显示初始界面
    async showInitialScreen() {
        this.showScreen('loading');
        
        // 模拟加载时间
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (window.authManager.isAuthenticated()) {
            await this.showHomeScreen();
        } else {
            this.showAuthScreen();
        }
    }

    // 屏幕切换
    showScreen(screenName) {
        const screens = document.querySelectorAll('.screen');
        screens.forEach(screen => {
            screen.classList.add('hidden');
        });
        
        const targetScreen = document.getElementById(`${screenName}-screen`);
        if (targetScreen) {
            targetScreen.classList.remove('hidden');
            this.currentScreen = screenName;
        }
        
        // 触发屏幕切换事件
        window.dispatchEvent(new CustomEvent('screen:change', { detail: { screen: screenName } }));
    }

    // 认证界面
    showAuthScreen() {
        this.showScreen('auth');
        this.resetAuthForm();
    }

    // 主界面
    async showHomeScreen() {
        this.showScreen('home');
        await this.updateHomeScreen();
    }

    // 科目选择界面
    async showDeckScreen() {
        this.showScreen('deck');
        await this.loadDecks();
    }

    // 学习界面
    async showLearningScreen(deck) {
        this.currentDeck = deck;
        this.showScreen('learning');
        await this.updateLearningScreen();
    }

    // 科目管理界面
    async showDeckManagementScreen() {
        this.showScreen('deck-management');
        await this.loadUserDecks();
    }

    // 个人资料界面
    async showProfileScreen() {
        this.showScreen('profile');
        await this.updateProfileScreen();
    }

    // 绑定事件监听器
    bindEvents() {
        // 认证相关事件
        document.getElementById('login-btn')?.addEventListener('click', this.handleLogin.bind(this));
        document.getElementById('register-btn')?.addEventListener('click', this.handleRegister.bind(this));
        document.getElementById('forgot-password-btn')?.addEventListener('click', this.handleForgotPassword.bind(this));
        
        // 导航相关事件
        document.getElementById('nav-home')?.addEventListener('click', () => this.showHomeScreen());
        document.getElementById('nav-decks')?.addEventListener('click', () => this.showDeckScreen());
        document.getElementById('nav-management')?.addEventListener('click', () => this.showDeckManagementScreen());
        document.getElementById('nav-profile')?.addEventListener('click', () => this.showProfileScreen());
        document.getElementById('logout-btn')?.addEventListener('click', this.handleLogout.bind(this));
        
        // 科目相关事件
        document.getElementById('create-deck-btn')?.addEventListener('click', this.showCreateDeckModal.bind(this));
        document.getElementById('save-deck-btn')?.addEventListener('click', this.saveDeck.bind(this));
        
        // 学习相关事件
        document.getElementById('start-study-btn')?.addEventListener('click', this.startStudy.bind(this));
        document.getElementById('card-flip-btn')?.addEventListener('click', this.flipCard.bind(this));
        document.getElementById('answer-correct-btn')?.addEventListener('click', () => this.handleAnswer(true));
        document.getElementById('answer-wrong-btn')?.addEventListener('click', () => this.handleAnswer(false));
        
        // 搜索相关事件
        document.getElementById('search-input')?.addEventListener('input', this.handleSearch.bind(this));
        
        // 模态框关闭事件
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', this.closeModal.bind(this));
        });
        
        // 表单提交事件
        document.querySelectorAll('form').forEach(form => {
            form.addEventListener('submit', this.handleFormSubmit.bind(this));
        });
    }

    // 处理登录
    async handleLogin(event) {
        event.preventDefault();
        
        const email = document.getElementById('login-email')?.value;
        const password = document.getElementById('login-password')?.value;
        
        if (!email || !password) {
            this.showToast('请填写邮箱和密码', 'warning');
            return;
        }
        
        try {
            const result = await window.authManager.login({ email, password });
            if (result.success) {
                this.showToast(result.message, 'success');
                await this.showHomeScreen();
            }
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    // 处理注册
    async handleRegister(event) {
        event.preventDefault();
        
        const email = document.getElementById('register-email')?.value;
        const password = document.getElementById('register-password')?.value;
        const confirmPassword = document.getElementById('register-confirm-password')?.value;
        const nickname = document.getElementById('register-nickname')?.value;
        
        if (!email || !password || !confirmPassword) {
            this.showToast('请填写所有必填字段', 'warning');
            return;
        }
        
        if (password !== confirmPassword) {
            this.showToast('两次输入的密码不一致', 'warning');
            return;
        }
        
        try {
            const result = await window.authManager.register({ email, password, nickname });
            if (result.success) {
                this.showToast(result.message, 'success');
                await this.showHomeScreen();
            }
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    // 处理忘记密码
    async handleForgotPassword(event) {
        event.preventDefault();
        
        const email = document.getElementById('forgot-email')?.value;
        if (!email) {
            this.showToast('请输入邮箱地址', 'warning');
            return;
        }
        
        try {
            const result = await window.authManager.forgotPassword(email);
            if (result.success) {
                this.showToast(result.message, 'success');
                this.closeModal();
            }
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    // 处理登出
    async handleLogout() {
        try {
            const result = await window.authManager.logout();
            if (result.success) {
                this.showToast(result.message, 'success');
                this.showAuthScreen();
            }
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    // 更新主界面
    async updateHomeScreen() {
        const user = window.authManager.getCurrentUser();
        if (!user) return;
        
        // 更新用户信息
        document.getElementById('user-welcome')?.textContent = `欢迎回来，${user.nickname || user.email}`;
        document.getElementById('user-avatar')?.src = user.avatar || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNFNUU3RUIiLz4KPGNpcmNsZSBjeD0iMjAiIGN5PSIxNiIgcj0iNiIgZmlsbD0iIzlEQ0EwNSIvPgo8cGF0aCBkPSJNMzAgMzNDMzAgMjYuNjczIDIzLjMyNyAyMCAyMCAyMEMxNi42NzMgMjAgMTAgMjYuNjczIDEwIDMzIiBmaWxsPSIjOUNDQTBANSIvPgo8L3N2Zz4K';
        
        // 更新统计数据
        await this.updateUserStats();
        
        // 更新最近学习
        await this.updateRecentStudy();
        
        // 更新推荐科目
        await this.updateRecommendedDecks();
    }

    // 更新用户统计
    async updateUserStats() {
        const stats = await window.authManager.getUserStats();
        if (stats) {
            document.getElementById('total-study-time')?.textContent = this.formatTime(stats.total_study_time);
            document.getElementById('total-cards-studied')?.textContent = stats.total_cards_studied || 0;
            document.getElementById('current-streak')?.textContent = `${stats.current_streak || 0}天`;
            document.getElementById('total-decks')?.textContent = stats.total_decks || 0;
        }
    }

    // 更新最近学习
    async updateRecentStudy() {
        const container = document.getElementById('recent-study');
        if (!container) return;
        
        const user = window.authManager.getCurrentUser();
        if (!user) return;
        
        try {
            const sessions = await window.dbManager.getByIndex('study_sessions', 'user_id', user.id);
            const recentSessions = sessions.slice(-5).reverse();
            
            if (recentSessions.length === 0) {
                container.innerHTML = '<p class="text-gray-500">还没有学习记录</p>';
                return;
            }
            
            container.innerHTML = recentSessions.map(session => `
                <div class="recent-session-item">
                    <div class="session-header">
                        <span class="session-date">${this.formatDate(session.start_time)}</span>
                        <span class="session-time">${this.formatTime(session.total_time)}</span>
                    </div>
                    <div class="session-stats">
                        <span>学习了${session.cards_studied}张卡片</span>
                        <span>正确率${Math.round(session.accuracy * 100)}%</span>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('更新最近学习失败:', error);
        }
    }

    // 更新推荐科目
    async updateRecommendedDecks() {
        const container = document.getElementById('recommended-decks');
        if (!container) return;
        
        try {
            const publicDecks = await window.dbManager.getPublicDecks();
            const featuredDecks = publicDecks.filter(deck => deck.is_featured).slice(0, 4);
            
            if (featuredDecks.length === 0) {
                container.innerHTML = '<p class="text-gray-500">暂无推荐科目</p>';
                return;
            }
            
            container.innerHTML = featuredDecks.map(deck => `
                <div class="deck-card" onclick="app.showLearningScreen(${deck.id})">
                    <div class="deck-cover">
                        ${deck.cover_image ? 
                            `<img src="${deck.cover_image}" alt="${deck.name}">` : 
                            `<div class="deck-placeholder">${deck.name.charAt(0)}</div>`
                        }
                    </div>
                    <div class="deck-info">
                        <h3>${deck.name}</h3>
                        <p>${deck.description || '暂无描述'}</p>
                        <div class="deck-meta">
                            <span>${deck.card_count}张卡片</span>
                            <span>${deck.download_count}次下载</span>
                        </div>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('更新推荐科目失败:', error);
        }
    }

    // 加载科目
    async loadDecks() {
        const user = window.authManager.getCurrentUser();
        if (!user) return;
        
        try {
            const decks = await window.dbManager.getAccessibleDecks(user.id);
            const container = document.getElementById('deck-list');
            
            if (decks.length === 0) {
                container.innerHTML = '<div class="empty-state">还没有任何科目，快去创建吧！</div>';
                return;
            }
            
            container.innerHTML = decks.map(deck => {
                const isOwner = deck.user_id === user.id;
                const visibilityClass = deck.visibility === 'public' ? 'public' : 'private';
                const visibilityIcon = deck.visibility === 'public' ? '🌍' : '🔒';
                
                return `
                    <div class="deck-item ${visibilityClass}" onclick="app.showLearningScreen(${deck.id})">
                        <div class="deck-header">
                            <h3>${deck.name}</h3>
                            <span class="deck-visibility">${visibilityIcon}</span>
                        </div>
                        <p class="deck-description">${deck.description || '暂无描述'}</p>
                        <div class="deck-meta">
                            <span class="deck-cards">${deck.card_count}张卡片</span>
                            <span class="deck-difficulty">${this.getDifficultyLabel(deck.difficulty)}</span>
                            ${isOwner ? '<span class="deck-owner">我的</span>' : ''}
                        </div>
                    </div>
                `;
            }).join('');
        } catch (error) {
            console.error('加载科目失败:', error);
            this.showToast('加载科目失败', 'error');
        }
    }

    // 显示创建科目模态框
    showCreateDeckModal() {
        const modal = document.getElementById('deck-modal');
        if (modal) {
            modal.classList.remove('hidden');
            this.resetDeckForm();
        }
    }

    // 保存科目
    async saveDeck() {
        const user = window.authManager.getCurrentUser();
        if (!user) {
            this.showToast('请先登录', 'error');
            return;
        }
        
        const name = document.getElementById('deck-name')?.value;
        const description = document.getElementById('deck-description')?.value;
        const visibility = document.getElementById('deck-visibility')?.value;
        const category = document.getElementById('deck-category')?.value;
        const difficulty = document.getElementById('deck-difficulty')?.value;
        
        if (!name) {
            this.showToast('科目名称不能为空', 'warning');
            return;
        }
        
        try {
            const deckData = {
                name,
                description,
                visibility,
                category,
                difficulty,
                user_id: user.id
            };
            
            await window.dbManager.createDeck(deckData);
            this.showToast('科目创建成功', 'success');
            this.closeModal();
            await this.loadDecks();
        } catch (error) {
            console.error('保存科目失败:', error);
            this.showToast('保存科目失败', 'error');
        }
    }

    // 开始学习
    async startStudy() {
        if (!this.currentDeck) return;
        
        try {
            // 创建学习会话
            this.studySession = {
                id: Date.now(),
                user_id: window.authManager.getCurrentUser().id,
                deck_id: this.currentDeck.id,
                start_time: new Date().toISOString(),
                cards_studied: 0,
                cards_correct: 0,
                cards_new: 0,
                cards_review: 0,
                total_time: 0,
                accuracy: 0
            };
            
            // 获取需要学习的卡片
            await this.loadNextCard();
        } catch (error) {
            console.error('开始学习失败:', error);
            this.showToast('开始学习失败', 'error');
        }
    }

    // 加载下一张卡片
    async loadNextCard() {
        const user = window.authManager.getCurrentUser();
        if (!user || !this.currentDeck) return;
        
        try {
            // 获取该科目的所有卡片
            const cards = await window.dbManager.getDeckCards(this.currentDeck.id);
            
            // 获取用户的学习进度
            const progress = await window.dbManager.getUserProgress(user.id);
            const progressMap = new Map(progress.map(p => [p.card_id, p]));
            
            // 筛选需要复习的卡片
            const today = new Date().toISOString().split('T')[0];
            const dueCards = cards.filter(card => {
                const cardProgress = progressMap.get(card.id);
                return !cardProgress || cardProgress.review_date <= today;
            });
            
            if (dueCards.length === 0) {
                this.showStudyComplete();
                return;
            }
            
            // 选择下一张卡片
            this.currentCard = dueCards[0];
            this.displayCard();
        } catch (error) {
            console.error('加载卡片失败:', error);
            this.showToast('加载卡片失败', 'error');
        }
    }

    // 显示卡片
    displayCard() {
        if (!this.currentCard) return;
        
        const cardElement = document.getElementById('study-card');
        if (!cardElement) return;
        
        // 更新卡片内容
        cardElement.querySelector('.card-question').innerHTML = this.currentCard.question;
        cardElement.querySelector('.card-answer').innerHTML = this.currentCard.answer;
        
        // 更新卡片信息
        cardElement.querySelector('.card-type').textContent = this.getCardTypeLabel(this.currentCard.card_type);
        cardElement.querySelector('.card-difficulty').textContent = this.getDifficultyLabel(this.currentCard.difficulty);
        
        // 重置卡片状态
        cardElement.classList.remove('flipped');
        
        // 开始计时
        this.startTime = Date.now();
    }

    // 翻转卡片
    flipCard() {
        const cardElement = document.getElementById('study-card');
        if (cardElement) {
            cardElement.classList.toggle('flipped');
        }
    }

    // 处理答题
    async handleAnswer(isCorrect) {
        if (!this.currentCard || !this.studySession) return;
        
        const user = window.authManager.getCurrentUser();
        if (!user) return;
        
        try {
            // 计算学习时间
            const timeSpent = Math.floor((Date.now() - this.startTime) / 1000);
            
            // 更新学习会话
            this.studySession.cards_studied++;
            this.studySession.total_time += timeSpent;
            if (isCorrect) {
                this.studySession.cards_correct++;
            }
            
            // 获取或创建进度记录
            let progress = await window.dbManager.get('progress', [user.id, this.currentCard.id]);
            
            if (!progress) {
                progress = {
                    user_id: user.id,
                    card_id: this.currentCard.id,
                    deck_id: this.currentDeck.id,
                    level: 0,
                    review_date: new Date().toISOString().split('T')[0],
                    last_answered: isCorrect,
                    total_attempts: 0,
                    correct_attempts: 0,
                    streak: 0,
                    ease_factor: 2.5,
                    interval: 1,
                    first_seen: new Date().toISOString(),
                    last_reviewed: new Date().toISOString(),
                    time_spent: 0,
                    notes: ''
                };
            }
            
            // 更新进度
            progress.total_attempts++;
            if (isCorrect) {
                progress.correct_attempts++;
                progress.streak++;
                progress.level = Math.min(progress.level + 1, this.reviewIntervals.length - 1);
            } else {
                progress.streak = 0;
                progress.level = 0;
            }
            
            progress.last_answered = isCorrect;
            progress.last_reviewed = new Date().toISOString();
            progress.time_spent += timeSpent;
            
            // 计算下次复习时间
            const nextInterval = this.reviewIntervals[progress.level];
            progress.interval = nextInterval;
            progress.review_date = this.addDays(new Date(), nextInterval).toISOString().split('T')[0];
            
            // 保存进度
            await window.dbManager.saveProgress(progress);
            
            // 显示反馈
            this.showToast(isCorrect ? '回答正确！' : '需要加强记忆', isCorrect ? 'success' : 'warning');
            
            // 加载下一张卡片
            setTimeout(() => {
                this.loadNextCard();
            }, 1000);
            
        } catch (error) {
            console.error('处理答题失败:', error);
            this.showToast('处理答题失败', 'error');
        }
    }

    // 显示学习完成
    showStudyComplete() {
        const container = document.getElementById('learning-content');
        if (container) {
            container.innerHTML = `
                <div class="study-complete">
                    <h2>🎉 学习完成！</h2>
                    <div class="study-summary">
                        <p>学习了${this.studySession.cards_studied}张卡片</p>
                        <p>正确率${Math.round((this.studySession.cards_correct / this.studySession.cards_studied) * 100)}%</p>
                        <p>学习时间${this.formatTime(this.studySession.total_time)}</p>
                    </div>
                    <button onclick="app.showDeckScreen()" class="btn-primary">返回科目列表</button>
                </div>
            `;
        }
        
        // 保存学习会话
        this.saveStudySession();
    }

    // 保存学习会话
    async saveStudySession() {
        if (!this.studySession) return;
        
        try {
            this.studySession.end_time = new Date().toISOString();
            this.studySession.accuracy = this.studySession.cards_studied > 0 ? 
                this.studySession.cards_correct / this.studySession.cards_studied : 0;
            
            await window.dbManager.add('study_sessions', this.studySession);
            
            // 更新用户统计
            await this.updateUserStatsFromSession();
        } catch (error) {
            console.error('保存学习会话失败:', error);
        }
    }

    // 更新用户统计
    async updateUserStatsFromSession() {
        const user = window.authManager.getCurrentUser();
        if (!user) return;
        
        try {
            let stats = await window.dbManager.get('user_stats', user.id);
            
            if (!stats) {
                stats = {
                    user_id: user.id,
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
            }
            
            stats.total_study_time += this.studySession.total_time;
            stats.total_cards_studied += this.studySession.cards_studied;
            stats.total_sessions++;
            stats.average_accuracy = (stats.average_accuracy * (stats.total_sessions - 1) + this.studySession.accuracy) / stats.total_sessions;
            stats.last_study_date = new Date().toISOString().split('T')[0];
            stats.updated_at = new Date().toISOString();
            
            await window.dbManager.put('user_stats', stats);
        } catch (error) {
            console.error('更新用户统计失败:', error);
        }
    }

    // 处理搜索
    async handleSearch(event) {
        const query = event.target.value.toLowerCase().trim();
        
        if (!query) {
            this.searchResults = [];
            this.displaySearchResults([]);
            return;
        }
        
        try {
            // 搜索卡片
            const cards = await window.dbManager.getAll('cards');
            this.searchResults = cards.filter(card => 
                card.question.toLowerCase().includes(query) ||
                card.answer.toLowerCase().includes(query) ||
                card.tags.some(tag => tag.toLowerCase().includes(query))
            );
            
            this.displaySearchResults(this.searchResults);
        } catch (error) {
            console.error('搜索失败:', error);
        }
    }

    // 显示搜索结果
    displaySearchResults(results) {
        const container = document.getElementById('search-results');
        if (!container) return;
        
        if (results.length === 0) {
            container.innerHTML = '<div class="search-no-results">没有找到相关内容</div>';
            return;
        }
        
        container.innerHTML = results.map(card => `
            <div class="search-result-item" onclick="app.viewCard(${card.id})">
                <div class="result-header">
                    <span class="result-type">${this.getCardTypeLabel(card.card_type)}</span>
                    <span class="result-difficulty">${this.getDifficultyLabel(card.difficulty)}</span>
                </div>
                <div class="result-question">${card.question.substring(0, 100)}...</div>
                <div class="result-answer">${card.answer.substring(0, 100)}...</div>
            </div>
        `).join('');
    }

    // 查看卡片
    async viewCard(cardId) {
        try {
            const card = await window.dbManager.get('cards', cardId);
            if (card) {
                // 显示卡片详情模态框
                this.showCardDetailModal(card);
            }
        } catch (error) {
            console.error('查看卡片失败:', error);
        }
    }

    // 显示卡片详情模态框
    showCardDetailModal(card) {
        const modal = document.getElementById('card-detail-modal');
        if (modal) {
            modal.querySelector('.modal-question').innerHTML = card.question;
            modal.querySelector('.modal-answer').innerHTML = card.answer;
            modal.classList.remove('hidden');
        }
    }

    // 关闭模态框
    closeModal() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.add('hidden');
        });
    }

    // 工具方法
    formatTime(seconds) {
        if (seconds < 60) {
            return `${seconds}秒`;
        } else if (seconds < 3600) {
            return `${Math.floor(seconds / 60)}分钟`;
        } else {
            return `${Math.floor(seconds / 3600)}小时`;
        }
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('zh-CN');
    }

    addDays(date, days) {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }

    getCardTypeLabel(type) {
        const labels = {
            'qa': '问答',
            'mcq': '选择',
            'fill_blank': '填空',
            'type_in': '输入'
        };
        return labels[type] || '未知';
    }

    getDifficultyLabel(difficulty) {
        const labels = {
            'beginner': '初级',
            'intermediate': '中级',
            'advanced': '高级'
        };
        return labels[difficulty] || '未知';
    }

    resetAuthForm() {
        document.getElementById('login-email') && (document.getElementById('login-email').value = '');
        document.getElementById('login-password') && (document.getElementById('login-password').value = '');
        document.getElementById('register-email') && (document.getElementById('register-email').value = '');
        document.getElementById('register-password') && (document.getElementById('register-password').value = '');
        document.getElementById('register-confirm-password') && (document.getElementById('register-confirm-password').value = '');
        document.getElementById('register-nickname') && (document.getElementById('register-nickname').value = '');
    }

    resetDeckForm() {
        document.getElementById('deck-name') && (document.getElementById('deck-name').value = '');
        document.getElementById('deck-description') && (document.getElementById('deck-description').value = '');
        document.getElementById('deck-visibility') && (document.getElementById('deck-visibility').value = 'private');
        document.getElementById('deck-category') && (document.getElementById('deck-category').value = '税务师考试');
        document.getElementById('deck-difficulty') && (document.getElementById('deck-difficulty').value = 'intermediate');
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        if (toast) {
            toast.textContent = message;
            toast.className = `toast ${type}`;
            toast.classList.add('show');
            
            setTimeout(() => {
                toast.classList.remove('show');
            }, 3000);
        }
    }

    // 导出数据
    async exportData() {
        try {
            const data = await window.dbManager.exportData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `tax-learning-export-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showToast('数据导出成功', 'success');
        } catch (error) {
            console.error('数据导出失败:', error);
            this.showToast('数据导出失败', 'error');
        }
    }

    // 导入数据
    async importData(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            if (!confirm('导入数据将覆盖现有数据，是否继续？')) {
                return;
            }
            
            await window.dbManager.importData(data);
            this.showToast('数据导入成功', 'success');
            
            // 重新加载当前界面
            if (this.currentScreen === 'home') {
                await this.updateHomeScreen();
            } else if (this.currentScreen === 'deck') {
                await this.loadDecks();
            }
        } catch (error) {
            console.error('数据导入失败:', error);
            this.showToast('数据导入失败', 'error');
        }
        
        // 清空文件输入
        event.target.value = '';
    }
}

// 创建全局应用实例
window.app = new TaxLearningApp();

// 导出应用类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TaxLearningApp;
}