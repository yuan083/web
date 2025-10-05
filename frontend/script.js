// 税务学习平台前端脚本
class TaxLearningApp {
    constructor() {
        console.log('🌸 TaxLearningApp Initializing...');
        this.API_BASE_URL = 'http://localhost:9365/api';
        this.currentPage = 'login';
        this.currentTopic = null;
        this.currentChapter = null;
        this.currentKnowledge = null;
        this.quizData = [];
        this.currentQuestionIndex = 0;
        this.userAnswers = [];
        this.topicsData = []; //  用于缓存税种数据

        // 用户认证相关
        this.currentUser = null;
        this.authToken = null;

        // [新] 初始化会话相关属性
        this.currentSessionMode = null;
        this.currentSession = null;
        this.sessionData = {};
        this._sessionEventListeners = []; // [修复点] 初始化事件监听器数组
        this.progressData = null; // 用于存储 /session/stats 的数据

        this.init();
    }

    init() {
        this.checkExistingAuth();
        this.bindAuthEvents();
        this.bindEvents();
        this.checkConnection();
        this.updateConnectionStatus();

        // [修复点] 统一绑定所有事件处理和异步回调方法
        this.bindAllMethods();
    }

    // [新] 创建一个集中的方法来绑定所有 'this'
    bindAllMethods() {
        // 核心认证与导航
        this.handleLogin = this.handleLogin.bind(this);
        this.handleRegister = this.handleRegister.bind(this);
        this.handleLogout = this.handleLogout.bind(this);
        this.switchPage = this.switchPage.bind(this);

        // 页面加载
        this.loadProgressPage = this.loadProgressPage.bind(this);
        this.loadProfilePage = this.loadProfilePage.bind(this);

        // 消息显示
        this.showMessage = this.showMessage.bind(this);
        this.showError = this.showError.bind(this);
        this.setLoading = this.setLoading.bind(this);
        this.updateProfileUI = this.updateProfileUI.bind(this);

        // --- 会话模式核心方法绑定 ---
        this.initSessionPage = this.initSessionPage.bind(this);
        this.hideAllSessionViews = this.hideAllSessionViews.bind(this);
        this.loadSessionStats = this.loadSessionStats.bind(this);
        this.updateSessionStatsDisplay = this.updateSessionStatsDisplay.bind(this);
        this.bindSessionEvents = this.bindSessionEvents.bind(this);
        this.unbindSessionEvents = this.unbindSessionEvents.bind(this);
        this.startSession = this.startSession.bind(this);
        this.showActiveSession = this.showActiveSession.bind(this);
        this.loadNextSessionItem = this.loadNextSessionItem.bind(this);
        this.showKnowledgePoint = this.showKnowledgePoint.bind(this);
        this.showKnowledgeDetails = this.showKnowledgeDetails.bind(this);
        this.startKnowledgeQuiz = this.startKnowledgeQuiz.bind(this);
        this.loadQuizQuestion = this.loadQuizQuestion.bind(this);
        this.selectOption = this.selectOption.bind(this);
        this.submitAnswer = this.submitAnswer.bind(this);
        this.showQuizFeedback = this.showQuizFeedback.bind(this);
        this.nextQuestion = this.nextQuestion.bind(this);
        this.skipQuestion = this.skipQuestion.bind(this);
        this.completeKnowledgeQuiz = this.completeKnowledgeQuiz.bind(this);
        this.continueToNext = this.continueToNext.bind(this);
        this.updateSessionProgress = this.updateSessionProgress.bind(this);
        this.startSessionTimer = this.startSessionTimer.bind(this);
        this.pauseSession = this.pauseSession.bind(this);
        this.continueSession = this.continueSession.bind(this);
        this.endSession = this.endSession.bind(this);
        this.completeSession = this.completeSession.bind(this);
        this.updateCompletionDisplay = this.updateCompletionDisplay.bind(this);
        this.generateAchievements = this.generateAchievements.bind(this);
    }

    // 检查现有认证
    checkExistingAuth() {
        const token = localStorage.getItem('authToken');
        const user = localStorage.getItem('currentUser');

        if (token && user) {
            try {
                this.currentUser = JSON.parse(user);
                this.authToken = token;
                this.showAuthenticatedUI();

                // 加载用户学习进度
                this.loadUserProgress();

                this.switchPage('learning');
            } catch (error) {
                console.error('恢复登录状态失败:', error);
                this.clearAuth();
            }
        } else {
            this.showLoginPage();
        }
    }

    // 认证相关事件绑定
    bindAuthEvents() {
        // 登录表单切换
        document.getElementById('show-register-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showRegisterForm();
        });

        document.getElementById('show-login-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showLoginForm();
        });

        // 登录按钮
        document.getElementById('login-btn')?.addEventListener('click', () => {
            this.handleLogin();
        });

        // 注册按钮
        document.getElementById('register-btn')?.addEventListener('click', () => {
            this.handleRegister();
        });

        // 退出登录
        document.getElementById('logout-btn')?.addEventListener('click', () => {
            this.handleLogout();
        });

        // 回车键提交
        document.getElementById('login-password')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleLogin();
        });

        document.getElementById('register-confirm-password')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleRegister();
        });
    }

    // 显示登录页面
    showLoginPage() {
        this.hideAllPages();
        document.getElementById('login-page').classList.add('active');
        this.showLoginForm();
    }

    showLoginForm() {
        document.getElementById('login-form').style.display = 'block';
        document.getElementById('register-form').style.display = 'none';
        this.clearFormErrors();
    }

    showRegisterForm() {
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('register-form').style.display = 'block';
        this.clearFormErrors();
    }

    // 清除表单错误
    clearFormErrors() {
        document.querySelectorAll('.form-group').forEach(group => {
            group.classList.remove('error', 'success');
        });
        document.querySelectorAll('.error-message').forEach(msg => {
            msg.remove();
        });
    }

    // 处理登录
    async handleLogin() {
        const phone = document.getElementById('login-phone').value.trim();
        const password = document.getElementById('login-password').value;

        // 表单验证
        if (!this.validateLoginForm(phone, password)) {
            return;
        }

        const loginBtn = document.getElementById('login-btn');
        this.setButtonLoading(loginBtn, true);

        try {
            console.log('🔍 Attempting login with:', { phone, password: password ? '[PROVIDED]' : '[MISSING]' });
            const response = await fetch(`${this.API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ phone, password })
            });

            console.log('🔍 Login response status:', response.status);
            console.log('🔍 Login response headers:', response.headers);

            // 检查HTTP状态码
            if (!response.ok) {
                console.error('❌ Login failed with status:', response.status);
                const errorData = await response.json();
                this.showFormError('login-password', errorData.message || '登录失败');
                return;
            }

            const data = await response.json();
            console.log('✅ Login response data:', data);

            if (data.success) {
                console.log('✅ Login successful, setting user data:', data.user);
                this.currentUser = data.user;
                this.authToken = data.token;

                console.log('✅ User data set:', this.currentUser);
                console.log('✅ Token set:', this.authToken ? 'Present' : 'Missing');

                // 保存到本地存储
                localStorage.setItem('authToken', this.authToken);
                localStorage.setItem('currentUser', JSON.stringify(this.currentUser));

                console.log('✅ Saved to localStorage');

                this.showAuthenticatedUI();
                this.showMessage('登录成功！', 'success');

                console.log('✅ About to load user progress...');

                // 加载用户学习进度
                this.loadUserProgress();

                console.log('✅ About to switch to learning page...');
                this.switchPage('learning');
                console.log('✅ About to load topics...');
                this.loadTopics();
                console.log('✅ Login process completed successfully');
            } else {
                console.error('❌ Login failed - data.success is false:', data);
                this.showFormError('login-password', data.message || '登录失败');
            }
        } catch (error) {
            console.error('❌ 登录失败:', error);
            this.showFormError('login-password', '网络错误，请重试');
        } finally {
            this.setButtonLoading(loginBtn, false);
        }
    }

    // 处理注册
    async handleRegister() {
        const nickname = document.getElementById('register-nickname').value.trim();
        const phone = document.getElementById('register-phone').value.trim();
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm-password').value;

        // 表单验证
        if (!this.validateRegisterForm(nickname, phone, password, confirmPassword)) {
            return;
        }

        const registerBtn = document.getElementById('register-btn');
        this.setButtonLoading(registerBtn, true);

        try {
            const response = await fetch(`${this.API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ nickname, phone, password })
            });

            const data = await response.json();

            if (data.success) {
                this.showMessage('注册成功！请登录', 'success');
                this.showLoginForm();
                // 预填手机号
                document.getElementById('login-phone').value = phone;
            } else {
                this.showFormError('register-phone', data.message);
            }
        } catch (error) {
            console.error('注册失败:', error);
            this.showFormError('register-phone', '网络错误，请重试');
        } finally {
            this.setButtonLoading(registerBtn, false);
        }
    }

    // 处理退出登录
    handleLogout() {
        if (confirm('确定要退出登录吗？')) {
            this.clearAuth();
            this.showLoginPage();
            this.showMessage('已退出登录', 'info');
        }
    }

    // 清除认证信息
    clearAuth() {
        this.currentUser = null;
        this.authToken = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        this.hideUserMenu();
    }

    // 显示已认证UI
    showAuthenticatedUI() {
        document.getElementById('user-nickname').textContent = this.currentUser.nickname;
        document.getElementById('user-menu').style.display = 'flex';
    }

    // 隐藏用户菜单
    hideUserMenu() {
        document.getElementById('user-menu').style.display = 'none';
    }

    // 表单验证
    validateLoginForm(phone, password) {
        let isValid = true;

        if (!phone) {
            this.showFormError('login-phone', '请输入手机号');
            isValid = false;
        } else if (!/^1[3-9]\d{9}$/.test(phone)) {
            this.showFormError('login-phone', '请输入正确的手机号');
            isValid = false;
        }

        if (!password) {
            this.showFormError('login-password', '请输入密码');
            isValid = false;
        } else if (password.length < 6) {
            this.showFormError('login-password', '密码至少6位');
            isValid = false;
        }

        return isValid;
    }

    validateRegisterForm(nickname, phone, password, confirmPassword) {
        let isValid = true;

        if (!nickname) {
            this.showFormError('register-nickname', '请输入昵称');
            isValid = false;
        } else if (nickname.length < 2) {
            this.showFormError('register-nickname', '昵称至少2个字符');
            isValid = false;
        }

        if (!phone) {
            this.showFormError('register-phone', '请输入手机号');
            isValid = false;
        } else if (!/^1[3-9]\d{9}$/.test(phone)) {
            this.showFormError('register-phone', '请输入正确的手机号');
            isValid = false;
        }

        if (!password) {
            this.showFormError('register-password', '请输入密码');
            isValid = false;
        } else if (password.length < 6) {
            this.showFormError('register-password', '密码至少6位');
            isValid = false;
        }

        if (password !== confirmPassword) {
            this.showFormError('register-confirm-password', '两次密码输入不一致');
            isValid = false;
        }

        return isValid;
    }

    // 显示表单错误
    showFormError(fieldId, message) {
        const field = document.getElementById(fieldId);
        const formGroup = field.closest('.form-group');

        formGroup.classList.add('error');
        formGroup.classList.remove('success');

        // 移除之前的错误消息
        const existingError = formGroup.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }

        // 添加新的错误消息
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        formGroup.appendChild(errorDiv);
    }

    // 显示通用消息
    showMessage(message, type = 'info') {
        console.log(`✅ Showing message: ${message} (${type})`);

        // 创建消息元素
        const messageDiv = document.createElement('div');
        messageDiv.className = `message-popup message-${type}`;

        // 根据类型设置图标
        let icon = '';
        switch(type) {
            case 'success':
                icon = '<i class="fas fa-check-circle"></i> ';
                break;
            case 'error':
                icon = '<i class="fas fa-exclamation-circle"></i> ';
                break;
            case 'warning':
                icon = '<i class="fas fa-exclamation-triangle"></i> ';
                break;
            default:
                icon = '<i class="fas fa-info-circle"></i> ';
        }

        messageDiv.innerHTML = `${icon}${message}`;

        // 添加到页面
        document.body.appendChild(messageDiv);

        // 显示动画
        setTimeout(() => {
            messageDiv.classList.add('show');
        }, 100);

        // 自动隐藏
        setTimeout(() => {
            messageDiv.classList.remove('show');
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.parentNode.removeChild(messageDiv);
                }
            }, 300);
        }, 3000);
    }

    // 显示错误消息（showMessage的别名）
    showError(message) {
        this.showMessage(message, 'error');
    }

    // 设置按钮加载状态
    setButtonLoading(button, isLoading) {
        if (isLoading) {
            button.classList.add('loading');
            button.disabled = true;
        } else {
            button.classList.remove('loading');
            button.disabled = false;
        }
    }

    // API请求封装
    async makeAPIRequest(url, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (this.authToken) {
            defaultOptions.headers['Authorization'] = `Bearer ${this.authToken}`;
        }

        const finalOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        };

        const response = await fetch(`${this.API_BASE_URL}${url}`, finalOptions);

        if (response.status === 401) {
            // Token过期，清除登录状态
            this.clearAuth();
            this.showLoginPage();
            this.showMessage('登录已过期，请重新登录', 'error');
            throw new Error('认证失败');
        }

        return response;
    }

    // 原有的事件绑定和其他方法保持不变
    bindEvents() {
        // 导航切换
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const page = e.currentTarget.dataset.page;
                this.switchPage(page);
            });
        });

        // 返回按钮
        document.getElementById('back-to-topics')?.addEventListener('click', () => {
            this.showTopicSelection();
        });

        document.getElementById('back-to-chapter')?.addEventListener('click', () => {
            this.showChapterContent();
        });

        // 操作按钮
        document.getElementById('start-quiz-btn')?.addEventListener('click', () => {
            this.startQuiz();
        });

        document.getElementById('mark-learned-btn')?.addEventListener('click', () => {
            this.markAsLearned();
        });

        // 定期检查连接状态
        setInterval(() => {
            this.checkConnection();
        }, 30000);
    }

    // 页面切换
    switchPage(page) {
        console.log('🔄 switchPage called with:', page);
        console.log('🔄 Current user:', this.currentUser);
        console.log('🔄 Current page before switch:', this.currentPage);

        // 检查是否需要登录
        if (page !== 'login' && !this.currentUser) {
            console.log('❌ User not logged in, showing login page');
            this.showLoginPage();
            this.showMessage('请先登录', 'error');
            return;
        }

        // 更新导航状态
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-page="${page}"]`)?.classList.add('active');

        // 切换页面内容
        this.hideAllPages();
        const targetPage = document.getElementById(`${page}-page`);
        if (targetPage) {
            targetPage.classList.add('active');
            console.log(`✅ Successfully switched to page: ${page}-page`);
        } else {
            console.error(`❌ Target page not found: ${page}-page`);
        }

        this.currentPage = page;

        // 页面特定逻辑
        switch(page) {
            case 'learning':
                console.log('📚 Loading session-based learning page...');
                this.initSessionPage();
                break;
            case 'quiz':
                console.log('📝 Initializing quiz page...');
                this.initQuizPage();
                break;
            case 'progress':
                console.log('📊 Loading progress page...');
                this.loadProgressPage();
                break;
            case 'profile':
                console.log('👤 Loading profile page...');
                this.loadProfilePage();
                break;
        }

        console.log('✅ Page switch completed');
    }

    hideAllPages() {
        document.querySelectorAll('.page').forEach(p => {
            p.classList.remove('active');
        });
    }

    // 连接检查
    async checkConnection() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/../health`);
            const isOnline = response.ok;
            this.updateConnectionStatus(isOnline);
            return isOnline;
        } catch (error) {
            this.updateConnectionStatus(false);
            return false;
        }
    }

    updateConnectionStatus(isOnline = null) {
        const statusElement = document.getElementById('connection-status');
        if (isOnline === null) {
            statusElement.innerHTML = '<i class="fas fa-wifi"></i> 检查中...';
            statusElement.className = 'connection-status';
        } else if (isOnline) {
            statusElement.innerHTML = '<i class="fas fa-wifi"></i> 已连接';
            statusElement.className = 'connection-status connected';
        } else {
            statusElement.innerHTML = '<i class="fas fa-wifi-slash"></i> 离线';
            statusElement.className = 'connection-status disconnected';
        }
    }

    updateSyncStatus(syncing = false) {
        const statusElement = document.getElementById('sync-status');
        if (syncing) {
            statusElement.innerHTML = '<i class="fas fa-sync"></i> 同步中...';
            statusElement.className = 'sync-status syncing';
        } else {
            statusElement.innerHTML = '<i class="fas fa-check"></i> 已同步';
            statusElement.className = 'sync-status';
        }
    }

    // 加载税种列表
    async loadTopics() {
        try {
            this.updateSyncStatus(true);
            const response = await this.makeAPIRequest('/knowledge/topics');
            if (!response.ok) throw new Error('获取税种列表失败');

            const data = await response.json();
            this.renderTopics(data.data.topics);
            this.updateSyncStatus(false);
        } catch (error) {
            console.error('加载税种失败:', error);
            this.showError('加载税种失败，请检查网络连接');
            this.updateSyncStatus(false);
        }
    }

    renderTopics(topics) {
        this.topicsData = topics; // 缓存主题数据以备后用
        const topicGrid = document.getElementById('topic-grid');
        if (!topicGrid) return;

        const topicIcons = {
            '环境保护税': 'fa-leaf',
            '增值税': 'fa-coins',
            '企业所得税': 'fa-building',
            '个人所得税': 'fa-user',
            '消费税': 'fa-shopping-cart',
            '关税': 'fa-ship'
        };

        topicGrid.innerHTML = topics.map(topic => `
            <div class="topic-card" data-topic="${topic.name}">
                <div class="icon">
                    <i class="fas ${topicIcons[topic.name] || 'fa-book'}"></i>
                </div>
                <h3>${topic.name}</h3>
                <p>${topic.chapters.length} 个章节 • ${topic.total_points} 个知识点</p>
            </div>
        `).join('');

        // 绑定点击事件
        topicGrid.querySelectorAll('.topic-card').forEach(card => {
            card.addEventListener('click', () => {
                const topic = card.dataset.topic;
                this.loadTopicChapters(topic);
            });
        });
    }

    // 加载并渲染指定主题的章节列表
    async loadTopicChapters(topicName) {
        this.currentTopic = topicName;
        // 从已缓存的数据中查找，避免重复API调用
        const topicData = this.topicsData.find(t => t.name === topicName);

        if (topicData && topicData.chapters) {
            this.renderChapters(topicData.chapters);
            this.showChapterContent(); // 切换到章节视图
        } else {
            console.error(`在缓存中未找到主题 '${topicName}' 的章节数据`);
            this.showError('加载章节列表失败');
        }
    }

    // 渲染章节列表
    renderChapters(chapters) {
        const knowledgeList = document.getElementById('knowledge-list');
        const chapterTitle = document.getElementById('chapter-title');
        if (!knowledgeList || !chapterTitle) return;

        chapterTitle.textContent = `${this.currentTopic} - 章节列表`;

        knowledgeList.innerHTML = chapters.map(chapter => `
            <div class="knowledge-item" data-chapter="${chapter.name}">
                <h4>
                    <span>${chapter.name}</span>
                    <div class="status">
                        <i class="fas fa-book-open"></i>
                        ${chapter.count} 个知识点
                    </div>
                </h4>
                <div class="preview">
                    学习 ${chapter.name} 的相关知识点
                </div>
            </div>
        `).join('');

        // 为新渲染的章节列表项绑定点击事件
        knowledgeList.querySelectorAll('.knowledge-item').forEach(item => {
            item.addEventListener('click', () => {
                const chapter = item.dataset.chapter;
                this.loadChapterKnowledge(chapter);
            });
        });
    }

    async loadChapterKnowledge(chapterName) {
        this.currentChapter = chapterName;
        console.log(`正在加载知识点: ${this.currentTopic} - ${chapterName}`);

        // 切换到知识点列表页面
        this.showChapterContent();
        this.updateSyncStatus(true);

        try {
            const response = await this.makeAPIRequest(`/knowledge/${encodeURIComponent(this.currentTopic)}/${encodeURIComponent(chapterName)}`);
            if (!response.ok) throw new Error('获取知识点列表失败');

            const data = await response.json();
            this.renderKnowledgePoints(data.data.points);
            this.updateSyncStatus(false);
        } catch (error) {
            console.error('加载知识点列表失败:', error);
            this.showError('加载知识点列表失败');
            this.updateSyncStatus(false);
        }
    }

    // 渲染知识点列表
    renderKnowledgePoints(points) {
        const knowledgeList = document.getElementById('knowledge-list');
        const chapterTitle = document.getElementById('chapter-title');
        if (!knowledgeList || !chapterTitle) return;

        chapterTitle.textContent = `${this.currentTopic} - ${this.currentChapter}`;

        // 从学习进度中获取已学习的知识点ID集合
        const learnedIds = new Set(Object.keys(this.learningProgress || {}));

        knowledgeList.innerHTML = points.map(point => {
            const isLearned = learnedIds.has(point._id);
            const statusClass = isLearned ? 'learned' : '';
            const statusIcon = isLearned ? 'fa-check-circle' : 'fa-circle';

            return `
                <div class="knowledge-item ${statusClass}" data-point-id="${point._id}">
                    <h4>
                        <span>${point.sub_topic}</span>
                        <div class="status ${statusClass}">
                            <i class="fas ${statusIcon}"></i>
                            ${isLearned ? '已学' : '未学'}
                        </div>
                    </h4>
                    <div class="preview">
                        ${point.content.substring(0, 100)}...
                    </div>
                </div>
            `;
        }).join('');

        // 绑定点击事件
        knowledgeList.querySelectorAll('.knowledge-item').forEach(item => {
            item.addEventListener('click', () => {
                const pointId = item.dataset.pointId;
                this.loadKnowledgeDetail(pointId);
            });
        });
    }

    // 加载并渲染知识点详情
    async loadKnowledgeDetail(pointId) {
        this.updateSyncStatus(true);
        try {
            const response = await this.makeAPIRequest(`/knowledge/point/${pointId}`);
            if (!response.ok) throw new Error('获取知识点详情失败');

            const data = await response.json();
            this.currentKnowledge = data.data;
            this.renderKnowledgeDetail(this.currentKnowledge);
            this.showKnowledgeDetail(); // 切换到详情视图
            this.updateSyncStatus(false);
        } catch (error) {
            console.error('加载知识点详情失败:', error);
            this.showError('加载知识点详情失败');
            this.updateSyncStatus(false);
        }
    }

    // 渲染知识点详情
    renderKnowledgeDetail(knowledge) {
        const knowledgeTitle = document.getElementById('knowledge-title');
        const knowledgeContent = document.getElementById('knowledge-content');
        const keyPointsList = document.getElementById('key-points-list');

        if (!knowledgeTitle || !knowledgeContent || !keyPointsList) return;

        knowledgeTitle.textContent = knowledge.sub_topic;
        knowledgeContent.textContent = knowledge.content;

        const keyPointsSection = document.querySelector('.key-points-section');
        if (knowledge.key_points && Array.isArray(knowledge.key_points) && knowledge.key_points.length > 0) {
            keyPointsList.innerHTML = knowledge.key_points.map(point => `<li>${point}</li>`).join('');
            keyPointsSection.style.display = 'block';
        } else {
            keyPointsList.innerHTML = '';
            keyPointsSection.style.display = 'none';
        }

        // 根据用户学习进度更新按钮状态
        const learnedIds = new Set(Object.keys(this.learningProgress || {}));
        const isLearned = learnedIds.has(knowledge._id);
        const markLearnedBtn = document.getElementById('mark-learned-btn');
        if (markLearnedBtn) {
            if (isLearned) {
                markLearnedBtn.innerHTML = '<i class="fas fa-check-circle"></i> 已学习';
                markLearnedBtn.classList.add('btn-secondary');
                markLearnedBtn.classList.remove('btn-primary');
                markLearnedBtn.disabled = true;
            } else {
                markLearnedBtn.innerHTML = '<i class="fas fa-check"></i> 标记已学';
                markLearnedBtn.classList.remove('btn-secondary');
                markLearnedBtn.classList.add('btn-primary');
                markLearnedBtn.disabled = false;
            }
        }
    }

    showTopicSelection() {
        document.querySelector('.topic-selection').style.display = 'block';
        document.querySelector('.chapter-content').style.display = 'none';
        document.querySelector('.knowledge-detail').style.display = 'none';
    }

    showChapterContent() {
        document.querySelector('.topic-selection').style.display = 'none';
        document.querySelector('.chapter-content').style.display = 'block';
        document.querySelector('.knowledge-detail').style.display = 'none';
    }

    async startQuiz() {
        if (!this.currentKnowledge || !this.currentUser) {
            this.showMessage('请先登录', 'error');
            return;
        }

        try {
            this.updateSyncStatus(true);
            const response = await this.makeAPIRequest(`/knowledge/point/${this.currentKnowledge._id}/quizzes`);

            if (!response.ok) throw new Error('获取题目失败');

            const data = await response.json();
            if (data.success && data.data.quizzes.length > 0) {
                this.quizData = data.data.quizzes;
                this.currentQuestionIndex = 0;
                this.userAnswers = [];
                this.switchPage('quiz');
                this.renderCurrentQuestion();
            } else {
                this.showMessage('该知识点暂无练习题目', 'info');
            }
        } catch (error) {
            console.error('加载练习题目失败:', error);
            this.showError('加载练习题目失败');
        } finally {
            this.updateSyncStatus(false);
        }
    }

    async markAsLearned() {
        if (!this.currentKnowledge || !this.currentUser) {
            this.showMessage('请先登录', 'error');
            return;
        }

        const markLearnedBtn = document.getElementById('mark-learned-btn');
        this.setButtonLoading(markLearnedBtn, true);

        try {
            const response = await this.makeAPIRequest('/user/progress/mark-learned', {
                method: 'POST',
                body: JSON.stringify({
                    pointId: this.currentKnowledge._id
                })
            });

            const data = await response.json();

            if (data.success) {
                this.showMessage(data.message, 'success');

                // 更新按钮状态
                if (markLearnedBtn) {
                    markLearnedBtn.innerHTML = '<i class="fas fa-check-double"></i> 已学习';
                    markLearnedBtn.classList.add('btn-secondary');
                    markLearnedBtn.classList.remove('btn-primary');
                    markLearnedBtn.disabled = true;
                }

                // 更新缓存的学习进度
                this.updateLocalProgress(this.currentKnowledge._id, 'learned');

                // 如果有知识点列表，更新显示状态
                this.updateKnowledgeItemStatus(this.currentKnowledge._id, true);
            } else {
                this.showMessage(data.message || '标记失败', 'error');
            }
        } catch (error) {
            console.error('标记已学失败:', error);
            this.showMessage('网络错误，请重试', 'error');
        } finally {
            this.setButtonLoading(markLearnedBtn, false);
        }
    }

    // 更新本地学习进度
    updateLocalProgress(pointId, status) {
        if (!this.learningProgress) {
            this.learningProgress = {};
        }

        // 更新学习进度缓存
        this.learningProgress[pointId] = {
            ...this.learningProgress[pointId],
            status: status,
            last_studied_at: new Date().toISOString()
        };

        // 同时更新currentUser中的learning_progress
        if (this.currentUser) {
            if (!this.currentUser.learning_progress) {
                this.currentUser.learning_progress = [];
            }

            // 查找是否已存在该知识点的进度记录
            const existingIndex = this.currentUser.learning_progress.findIndex(p => p.point_id === pointId);
            const progressItem = {
                point_id: pointId,
                status: status,
                last_studied_at: new Date().toISOString()
            };

            if (existingIndex >= 0) {
                // 更新现有记录
                this.currentUser.learning_progress[existingIndex] = progressItem;
            } else {
                // 添加新记录
                this.currentUser.learning_progress.push(progressItem);
            }

            // 更新localStorage中的currentUser
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        }

        // 保存到localStorage作为备份
        this.saveProgressToCloud();
    }

    // 保存进度到localStorage (本地缓存)
    saveProgress() {
        try {
            localStorage.setItem('taxLearningProgress', JSON.stringify(this.learningProgress));
        } catch (error) {
            console.error('保存进度失败:', error);
        }
    }

    // 从localStorage加载进度
    loadProgress() {
        try {
            const saved = localStorage.getItem('taxLearningProgress');
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            console.error('加载进度失败:', error);
            return {};
        }
    }

    // 同步进度到云端
    async saveProgressToCloud() {
        // 这里已经在markAsLearned中通过API调用实现了云端同步
        // 本地缓存只是作为备份
        this.saveProgress();
    }

    // 从云端加载用户学习进度
    async loadUserProgress() {
        if (!this.currentUser) return;

        try {
            this.updateSyncStatus(true);
            const response = await this.makeAPIRequest('/user/progress');

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    // 更新本地进度缓存
                    const progress = {};
                    data.data.learning_progress.forEach(item => {
                        progress[item.point_id] = item;
                    });
                    this.learningProgress = progress;
                    this.saveProgress(); // 保存到本地

                    // 更新currentUser的learning_progress
                    this.currentUser.learning_progress = data.data.learning_progress;
                    localStorage.setItem('currentUser', JSON.stringify(this.currentUser));

                    console.log(`✅ 成功加载 ${data.data.total_learned} 条学习记录`);

                    // 如果当前在学习页面，则刷新列表状态
                    if(this.currentPage === 'learning') {
                        this.refreshCurrentKnowledgeList();
                    }
                }
            }
        } catch (error) {
            console.error('加载学习进度失败:', error);
        } finally {
            this.updateSyncStatus(false);
        }
    }

    // 刷新当前知识点列表的已学状态
    refreshCurrentKnowledgeList() {
        const learnedIds = new Set(Object.keys(this.learningProgress || {}));
        document.querySelectorAll('.knowledge-item[data-point-id]').forEach(item => {
            const pointId = item.dataset.pointId;
            this.updateKnowledgeItemStatus(pointId, learnedIds.has(pointId));
        });
    }

    // 更新知识点列表中的状态显示
    updateKnowledgeItemStatus(pointId, isLearned) {
        const knowledgeItem = document.querySelector(`[data-point-id="${pointId}"]`);
        if (knowledgeItem) {
            const statusElement = knowledgeItem.querySelector('.status');
            if (statusElement) {
                if (isLearned) {
                    knowledgeItem.classList.add('learned');
                    statusElement.classList.add('learned');
                    statusElement.innerHTML = '<i class="fas fa-check-circle"></i> 已学';
                } else {
                    knowledgeItem.classList.remove('learned');
                    statusElement.classList.remove('learned');
                    statusElement.innerHTML = '<i class="fas fa-circle"></i> 未学';
                }
            }
        }
    }

    initQuizPage() {
        console.log('📝 Initializing quiz page...');
        this.loadQuizData();
    }

    // 加载练习题目数据
    async loadQuizData() {
        try {
            this.updateSyncStatus(true);

            // 获取所有知识点进行练习
            const response = await this.makeAPIRequest('/knowledge/topics');
            if (!response.ok) throw new Error('获取知识点失败');

            const data = await response.json();
            const topicData = data.data;
            const topics = topicData.topics || [];

            if (topics.length === 0) {
                this.showQuizMessage('暂无练习题目');
                this.updateSyncStatus(false);
                return;
            }

            console.log('📚 Found topics:', topics.map(t => t.name));

            // 随机选择一些知识点和题目进行练习
            await this.loadQuizQuestions(topics);

        } catch (error) {
            console.error('❌ Load quiz data failed:', error);
            this.showQuizMessage('加载练习题目失败');
            this.updateSyncStatus(false);
        }
    }

    // 从知识点加载题目 - 简化版本，使用session数据
    async loadQuizQuestions(topics) {
        try {
            // 直接使用session API获取包含题目的学习数据
            const response = await fetch(`${this.API_BASE_URL}/session/start`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const sessionResponse = await response.json();
            const sessionData = sessionResponse.data;
            const allQuizzes = [];

            // 从session数据中提取有题目的项目
            if (sessionData.items && sessionData.items.length > 0) {
                for (const item of sessionData.items) {
                    if (item.quiz) {
                        allQuizzes.push({
                            ...item.quiz,
                            topic: item.knowledgePoint.topic,
                            knowledgePoint: item.knowledgePoint.sub_topic
                        });
                    }
                }
            }

            console.log(`✅ Loaded ${allQuizzes.length} quizzes from session data`);

            // 如果没有找到题目，创建一些示例题目
            if (allQuizzes.length === 0) {
                return this.createSampleQuizzes();
            }

            return allQuizzes;

        } catch (error) {
            console.warn('Failed to load session quizzes, using sample data:', error);
            return this.createSampleQuizzes();
        }
    }

    // 创建示例题目（当API数据不可用时）
    createSampleQuizzes() {
        return [
            {
                _id: 'sample1',
                quizType: 'multiple_choice',
                source: '示例题目',
                question_text: '环境保护税的纳税人不包括以下哪项？',
                options: [
                    { key: 'A', text: '事业单位' },
                    { key: 'B', text: '个人家庭' },
                    { key: 'C', text: '私营企业' },
                    { key: 'D', text: '国有企业' }
                ],
                correct_answer: ['B'],
                explanation: '根据税法规定，政府机关、家庭、其他个人不属于环境保护税的纳税人。',
                difficulty: 'easy',
                topic: '环境保护税',
                knowledgePoint: '纳税人'
            },
            {
                _id: 'sample2',
                quizType: 'multiple_choice',
                source: '示例题目',
                question_text: '下列哪些属于应税污染物？',
                options: [
                    { key: 'A', text: '二氧化硫' },
                    { key: 'B', text: '工业噪声' },
                    { key: 'C', text: '交通噪声' },
                    { key: 'D', text: '危险废物' }
                ],
                correct_answer: ['A', 'B', 'D'],
                explanation: '应税污染物包括大气污染物、水污染物、固体废物、噪声等四大类。但噪声仅指工业噪声，不包括交通噪声。',
                difficulty: 'medium',
                topic: '环境保护税',
                knowledgePoint: '应税污染物'
            }
        ];
    }

    
    // 显示练习页面消息
    showQuizMessage(message) {
        const quizContent = document.getElementById('quiz-content');
        if (quizContent) {
            quizContent.innerHTML = `
                <div class="quiz-message">
                    <i class="fas fa-info-circle"></i>
                    <p>${message}</p>
                </div>
            `;
        }
    }

    // 更新练习进度
    updateQuizProgress() {
        const questionCounter = document.getElementById('question-counter');
        const correctRate = document.getElementById('correct-rate');

        if (questionCounter) {
            questionCounter.textContent = `${this.currentQuestionIndex + 1} / ${this.quizData.length}`;
        }

        if (correctRate && this.currentQuestionIndex > 0) {
            const rate = Math.round((this.correctCount / this.currentQuestionIndex) * 100);
            correctRate.textContent = `正确率: ${rate}%`;
        }
    }

    // 更新提交按钮状态
    updateSubmitButton() {
        const submitBtn = document.getElementById('submit-answer-btn');
        if (!submitBtn) return;

        const selectedOptions = document.querySelectorAll('input[name="quiz-answer"]:checked');
        submitBtn.disabled = selectedOptions.length === 0;
    }

    // 提交答案
    submitAnswer() {
        const selectedOptions = document.querySelectorAll('input[name="quiz-answer"]:checked');
        if (selectedOptions.length === 0) {
            this.showMessage('请选择答案', 'warning');
            return;
        }

        const currentQuiz = this.quizData[this.currentQuestionIndex];
        const userAnswers = Array.from(selectedOptions).map(option => option.value);
        const correctAnswers = currentQuiz.correct_answer;

        // 检查答案是否正确
        const isCorrect = this.checkAnswer(userAnswers, correctAnswers);
        if (isCorrect) {
            this.correctCount++;
        }

        // 显示反馈
        this.showQuizFeedback(currentQuiz, userAnswers, correctAnswers, isCorrect);
    }

    // 检查答案是否正确
    checkAnswer(userAnswers, correctAnswers) {
        if (userAnswers.length !== correctAnswers.length) {
            return false;
        }

        const sortedUser = [...userAnswers].sort();
        const sortedCorrect = [...correctAnswers].sort();

        return sortedUser.every((answer, index) => answer === sortedCorrect[index]);
    }

    // 显示题目反馈
    showQuizFeedback(quiz, userAnswers, correctAnswers, isCorrect) {
        const feedbackDiv = document.getElementById('quiz-feedback');
        const feedbackTitle = document.getElementById('feedback-title');
        const feedbackExplanation = document.getElementById('feedback-explanation');
        const correctAnswerDiv = document.getElementById('correct-answer');
        const correctAnswerText = document.getElementById('correct-answer-text');
        const nextBtn = document.getElementById('next-question-btn');
        const finishBtn = document.getElementById('finish-quiz-btn');

        if (!feedbackDiv) return;

        // 设置反馈内容
        feedbackTitle.textContent = isCorrect ? '✅ 回答正确！' : '❌ 回答错误';
        feedbackExplanation.textContent = quiz.explanation;

        if (!isCorrect) {
            correctAnswerDiv.style.display = 'block';
            correctAnswerText.textContent = correctAnswers.join(', ');
        } else {
            correctAnswerDiv.style.display = 'none';
        }

        // 显示下一步按钮
        const isLastQuestion = this.currentQuestionIndex === this.quizData.length - 1;
        nextBtn.style.display = isLastQuestion ? 'none' : 'block';
        finishBtn.style.display = isLastQuestion ? 'block' : 'none';

        // 禁用所有选项
        const options = document.querySelectorAll('input[name="quiz-answer"]');
        options.forEach(option => {
            option.disabled = true;
        });

        // 隐藏提交按钮，显示反馈
        document.getElementById('submit-answer-btn').style.display = 'none';
        feedbackDiv.style.display = 'block';

        // 更新进度
        this.updateQuizProgress();
    }

    // 下一题
    nextQuestion() {
        this.currentQuestionIndex++;
        this.renderCurrentQuestion();
    }

    // 完成练习
    finishQuiz() {
        const totalQuestions = this.quizData.length;
        const correctRate = Math.round((this.correctCount / totalQuestions) * 100);

        const quizContent = document.getElementById('quiz-content');
        if (quizContent) {
            quizContent.innerHTML = `
                <div class="quiz-completion">
                    <div class="completion-header">
                        <i class="fas fa-trophy"></i>
                        <h3>练习完成！</h3>
                    </div>
                    <div class="completion-stats">
                        <div class="stat">
                            <span class="label">总题数</span>
                            <span class="value">${totalQuestions}</span>
                        </div>
                        <div class="stat">
                            <span class="label">正确数</span>
                            <span class="value">${this.correctCount}</span>
                        </div>
                        <div class="stat">
                            <span class="label">正确率</span>
                            <span class="value">${correctRate}%</span>
                        </div>
                    </div>
                    <div class="completion-actions">
                        <button class="btn btn-primary" onclick="app.initQuizPage()">
                            <i class="fas fa-redo"></i> 再做一次
                        </button>
                        <button class="btn btn-secondary" onclick="app.showPage('learning')">
                            <i class="fas fa-book"></i> 返回学习
                        </button>
                    </div>
                </div>
            `;
        }

        // 显示完成消息
        let message = '';
        if (correctRate >= 90) {
            message = '🎉 表现优秀！继续保持！';
        } else if (correctRate >= 70) {
            message = '👍 做得不错！继续加油！';
        } else if (correctRate >= 60) {
            message = '💪 还有提升空间，多练习会更好！';
        } else {
            message = '📚 建议先学习相关知识点再练习';
        }

        setTimeout(() => {
            this.showMessage(message, correctRate >= 70 ? 'success' : 'info');
        }, 1000);
    }

    // 渲染当前题目
    renderCurrentQuestion() {
        if (!this.quizData || this.quizData.length === 0) return;

        const quizContent = document.getElementById('quiz-content');
        const currentQuiz = this.quizData[this.currentQuestionIndex];
        const progress = `${this.currentQuestionIndex + 1} / ${this.quizData.length}`;

        if (!quizContent) return;

        let optionsHtml = '';
        if (currentQuiz.type === 'single_choice' || currentQuiz.type === 'multiple_choice') {
            optionsHtml = currentQuiz.options.map(option => `
                <div class="quiz-option">
                    <label>
                        <input type="${currentQuiz.type === 'single_choice' ? 'radio' : 'checkbox'}"
                               name="quiz-answer" value="${option.key}">
                        <span class="option-key">${option.key}.</span>
                        <span class="option-text">${option.text}</span>
                    </label>
                </div>
            `).join('');
        } else if (currentQuiz.type === 'judgment') {
            optionsHtml = currentQuiz.options.map(option => `
                <div class="quiz-option">
                    <label>
                        <input type="radio" name="quiz-answer" value="${option.key}">
                        <span class="option-key">${option.key}.</span>
                        <span class="option-text">${option.text}</span>
                    </label>
                </div>
            `).join('');
        }

        quizContent.innerHTML = `
            <div class="quiz-container">
                <div class="quiz-header">
                    <h3>${this.currentKnowledge?.sub_topic || '练习题目'}</h3>
                    <div class="quiz-progress">
                        <span class="progress-text">${progress}</span>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${(this.currentQuestionIndex + 1) / this.quizData.length * 100}%"></div>
                        </div>
                    </div>
                </div>

                <div class="quiz-question">
                    <div class="question-text">${currentQuiz.question_text}</div>
                    <div class="question-meta">
                        <span class="question-source">${currentQuiz.source}</span>
                        <span class="question-difficulty">${currentQuiz.difficulty}</span>
                    </div>
                </div>

                <div class="quiz-options">
                    ${optionsHtml}
                </div>

                <div class="quiz-actions">
                    <button class="btn btn-secondary" onclick="app.backToKnowledge()">
                        <i class="fas fa-arrow-left"></i> 返回知识点
                    </button>
                    <button class="btn btn-primary" id="submit-answer-btn" onclick="app.submitAnswer()">
                        提交答案
                    </button>
                </div>

                <div id="quiz-feedback" style="display: none;">
                    <div class="feedback-content">
                        <h4 id="feedback-title"></h4>
                        <p id="feedback-explanation"></p>
                        <div id="correct-answer" style="display: none;">
                            <strong>正确答案：</strong>
                            <span id="correct-answer-text"></span>
                        </div>
                    </div>
                    <div class="feedback-actions">
                        <button class="btn btn-primary" id="next-question-btn" onclick="app.nextQuestion()" style="display: none;">
                            下一题 <i class="fas fa-arrow-right"></i>
                        </button>
                        <button class="btn btn-success" id="finish-quiz-btn" onclick="app.finishQuiz()" style="display: none;">
                            完成练习 <i class="fas fa-check"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;

        // 绑定选项点击事件
        const options = quizContent.querySelectorAll('input[name="quiz-answer"]');
        options.forEach(option => {
            option.addEventListener('change', () => {
                this.updateSubmitButton();
            });
        });
    }

    async loadProgressPage() {
        if (!this.currentUser) {
            this.showMessage('请先登录', 'error');
            return;
        }

        try {
            this.updateSyncStatus(true);
            console.log('🔄 Loading progress data from new SRS API...');

            // 使用新的 SRS API 接口
            const response = await this.makeAPIRequest('/session/stats');
            console.log('📊 Raw API Response:', response);

            if (!response.ok) throw new Error('获取进度数据失败');

            const data = await response.json();
            console.log('📊 Parsed API Data:', data);

            if (data.success && data.data) {
                this.progressData = data.data;
                console.log('✅ Progress data loaded successfully:', this.progressData);
                this.renderProgressPage();
            } else {
                console.error('❌ API returned error:', data);
                this.showMessage('获取进度数据失败', 'error');
            }
        } catch (error) {
            console.error('加载进度数据失败:', error);
            this.showError('加载进度数据失败，请稍后重试');
        } finally {
            this.updateSyncStatus(false);
        }
    }

    // 渲染进度页面
    renderProgressPage() {
        const progressPage = document.getElementById('progress-page');
        if (!progressPage || !this.progressData) return;

        console.log('🎨 Rendering progress page with data:', this.progressData);

        // 适配新的 SRS API 数据结构
        const { overall, today, streak } = this.progressData;
        const nickname = this.currentUser?.nickname || '用户';

        // 使用新的 SRS 数据结构来显示进度
        const totalLearned = overall.new + overall.learning + overall.learned + overall.mastered;
        const totalProgress = totalLearned > 0 ? Math.round((overall.learned + overall.mastered) / totalLearned * 100) : 0;

        // 构建统计数据展示
        const statsHtml = `
            <div class="stats-overview">
                <div class="stat-card">
                    <div class="stat-number">${totalLearned}</div>
                    <div class="stat-label">已学知识点</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${overall.accuracy}%</div>
                    <div class="stat-label">正确率</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${streak}</div>
                    <div class="stat-label">连续天数</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${today.reviews}</div>
                    <div class="stat-label">今日复习</div>
                </div>
            </div>
        `;

        // 学习状态分布
        const statusDistribution = `
            <div class="status-distribution">
                <div class="status-item">
                    <div class="status-color new"></div>
                    <span>新学: ${overall.new}</span>
                </div>
                <div class="status-item">
                    <div class="status-color learning"></div>
                    <span>学习中: ${overall.learning}</span>
                </div>
                <div class="status-item">
                    <div class="status-color learned"></div>
                    <span>已掌握: ${overall.learned}</span>
                </div>
                <div class="status-item">
                    <div class="status-color mastered"></div>
                    <span>已精通: ${overall.mastered}</span>
                </div>
            </div>
        `;

        // 今日复习统计
        const todayStatsHtml = `
            <div class="today-stats">
                <h4>📅 今日学习</h4>
                <div class="today-progress">
                    <div class="progress-item">
                        <span>复习完成</span>
                        <span>${today.correct}/${today.reviews}</span>
                    </div>
                    <div class="progress-bar-container">
                        <div class="progress-bar-fill" style="width: ${today.accuracy}%"></div>
                    </div>
                </div>
            </div>
        `;

        progressPage.innerHTML = `
            <div class="progress-container">
                <div class="progress-header">
                    <h2><i class="fas fa-chart-line"></i> 🌸 学习进度统计 🌸</h2>
                    <div class="user-info">
                        <span class="user-name">${nickname}</span>
                        <span class="last-update">最后更新: ${new Date().toLocaleString('zh-CN')}</span>
                    </div>
                </div>

                <!-- 总体统计 -->
                <div class="statistics-section">
                    <h3>📊 总体学习情况</h3>
                    ${statsHtml}
                </div>

                <!-- 学习状态分布 -->
                <div class="status-section">
                    <h3>🎯 学习状态分布</h3>
                    ${statusDistribution}
                </div>

                <!-- 今日统计 -->
                <div class="today-section">
                    ${todayStatsHtml}
                </div>

                <!-- 学习建议 -->
                <div class="suggestions-section">
                    <h3>💡 学习建议</h3>
                    <div class="suggestions-list">
                        ${this.generateLearningSuggestions()}
                    </div>
                </div>
            </div>
        `;

  }

    // 更新提交按钮状态
    updateSubmitButton() {
        const submitBtn = document.getElementById('submit-answer-btn');
        const selectedOptions = document.querySelectorAll('input[name="quiz-answer"]:checked');
        if (submitBtn) {
            submitBtn.disabled = selectedOptions.length === 0;
        }
    }

    // 返回知识点页面
    backToKnowledge() {
        this.switchPage('learning');
        this.showChapterContent();
    }

    // 提交答案
    async submitAnswer() {
        const selectedOptions = document.querySelectorAll('input[name="quiz-answer"]:checked');
        if (selectedOptions.length === 0) {
            this.showMessage('请选择答案', 'warning');
            return;
        }

        const currentQuiz = this.quizData[this.currentQuestionIndex];
        const userAnswer = Array.from(selectedOptions).map(option => option.value);

        // 判断是否正确
        const isCorrect = this.checkAnswer(userAnswer, currentQuiz.correct_answer);

        // 显示反馈
        this.showQuizFeedback(isCorrect, currentQuiz);

        // 保存答题记录（这里先保存到本地，后续会同步到后端）
        this.userAnswers.push({
            quizId: currentQuiz._id,
            userAnswer: userAnswer,
            isCorrect: isCorrect
        });

        // 禁用选项和提交按钮
        const options = document.querySelectorAll('input[name="quiz-answer"]');
        options.forEach(option => {
            option.disabled = true;
        });

        const submitBtn = document.getElementById('submit-answer-btn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = '已提交';
        }

        // 显示下一步按钮
        if (this.currentQuestionIndex < this.quizData.length - 1) {
            document.getElementById('next-question-btn').style.display = 'inline-block';
        } else {
            document.getElementById('finish-quiz-btn').style.display = 'inline-block';
        }
    }

    // 检查答案是否正确
    checkAnswer(userAnswer, correctAnswer) {
        if (userAnswer.length !== correctAnswer.length) return false;

        const sortedUser = [...userAnswer].sort();
        const sortedCorrect = [...correctAnswer].sort();

        return sortedUser.every((answer, index) => answer === sortedCorrect[index]);
    }

    // 显示答题反馈
    showQuizFeedback(isCorrect, quiz) {
        const feedbackDiv = document.getElementById('quiz-feedback');
        const feedbackTitle = document.getElementById('feedback-title');
        const feedbackExplanation = document.getElementById('feedback-explanation');
        const correctAnswerDiv = document.getElementById('correct-answer');
        const correctAnswerText = document.getElementById('correct-answer-text');

        if (feedbackTitle) {
            feedbackTitle.textContent = isCorrect ? '✅ 回答正确！' : '❌ 回答错误';
            feedbackTitle.style.color = isCorrect ? '#28a745' : '#dc3545';
        }

        if (feedbackExplanation) {
            feedbackExplanation.textContent = quiz.explanation || '暂无解析';
        }

        if (correctAnswerDiv && correctAnswerText) {
            if (!isCorrect) {
                correctAnswerDiv.style.display = 'block';
                correctAnswerText.textContent = quiz.correct_answer.join(', ');
            } else {
                correctAnswerDiv.style.display = 'none';
            }
        }

        if (feedbackDiv) {
            feedbackDiv.style.display = 'block';
        }
    }

    // 下一题
    nextQuestion() {
        this.currentQuestionIndex++;
        this.renderCurrentQuestion();
    }

    // 完成练习
    async finishQuiz() {
        const correctCount = this.userAnswers.filter(answer => answer.isCorrect).length;
        const totalCount = this.userAnswers.length;
        const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

        try {
            this.updateSyncStatus(true);

            // 准备批量提交的数据
            const quizResults = this.userAnswers.map(answer => ({
                quizId: answer.quizId,
                userAnswer: answer.userAnswer
            }));

            // 调用后端API批量保存答题记录
            const response = await this.makeAPIRequest('/user/quiz-history/batch', {
                method: 'POST',
                body: JSON.stringify({ quizResults })
            });

            if (!response.ok) throw new Error('保存答题记录失败');

            const data = await response.json();
            if (data.success) {
                console.log('✅ 答题记录已保存到后端:', data.data);
                this.showMessage(`练习完成！正确率：${accuracy}% (${correctCount}/${totalCount}) - 成绩已保存`, 'success');
            } else {
                throw new Error(data.message || '保存失败');
            }
        } catch (error) {
            console.error('保存答题记录失败:', error);
            // 即使保存失败，也显示练习完成结果
            this.showMessage(`练习完成！正确率：${accuracy}% (${correctCount}/${totalCount}) - 成绩保存失败`, 'warning');
        } finally {
            this.updateSyncStatus(false);
        }

        // 返回知识点页面
        this.backToKnowledge();
    }

    // 切换进度页面标签
    switchProgressTab(tabName) {
        // 移除所有标签的激活状态
        document.querySelectorAll('.progress-tab').forEach(tab => {
            tab.classList.remove('active');
        });

        // 激活当前标签
        const currentTab = document.querySelector(`[data-tab="${tabName}"]`);
        if (currentTab) {
            currentTab.classList.add('active');
        }

        // 隐藏所有内容区域
        document.querySelectorAll('.tab-content').forEach(content => {
            content.style.display = 'none';
        });

        // 显示对应内容
        const contentArea = document.getElementById(`${tabName}Content`);
        if (contentArea) {
            contentArea.style.display = 'block';
        }
    }

    // 生成学习建议
    generateLearningSuggestions() {
        if (!this.progressData) {
            console.log('⚠️ No progress data available for suggestions');
            return '<p class="no-data">暂无足够数据生成学习建议</p>';
        }

        console.log('💡 Generating suggestions from data:', this.progressData);
        const suggestions = [];
        const { overall, today, streak } = this.progressData;

        // 计算总学习量
        const totalLearned = overall.new + overall.learning + overall.learned + overall.mastered;

        // 基于学习数量的建议
        if (totalLearned < 10) {
            suggestions.push({
                type: 'action',
                icon: '📚',
                title: '增加学习量',
                description: '建议每天学习至少5个新知识点，打好基础'
            });
        } else if (totalLearned < 30) {
            suggestions.push({
                type: 'encouragement',
                icon: '🌱',
                title: '稳步前进',
                description: '学习进度不错！继续保持每天学习的节奏'
            });
        } else {
            suggestions.push({
                type: 'achievement',
                icon: '🎯',
                title: '学习达人',
                description: '已经掌握了大量知识点，可以考虑进行综合练习'
            });
        }

        // 基于答题正确率的建议
        if (overall.accuracy < 60) {
            suggestions.push({
                type: 'warning',
                icon: '⚠️',
                title: '正确率偏低',
                description: '建议先复习已学知识点，理解概念后再大量练习'
            });
        } else if (overall.accuracy < 80) {
            suggestions.push({
                type: 'improvement',
                icon: '📈',
                title: '提升空间',
                description: '正确率良好，可以通过错题复习来进一步提高'
            });
        } else {
            suggestions.push({
                type: 'praise',
                icon: '🌟',
                title: '表现优秀',
                description: '答题正确率很高！可以挑战更高难度的题目'
            });
        }

        // 基于连续学习天数的建议
        if (streak === 0) {
            suggestions.push({
                type: 'action',
                icon: '🔥',
                title: '开始连续学习',
                description: '连续学习能够获得更好的效果，建议每天坚持学习'
            });
        } else if (streak < 3) {
            suggestions.push({
                type: 'encouragement',
                icon: '🌟',
                title: '良好开端',
                description: `已经连续学习${streak}天了，继续保持这个好习惯！`
            });
        } else if (streak < 7) {
            suggestions.push({
                type: 'praise',
                icon: '🏆',
                title: '学习坚持者',
                description: `连续学习${streak}天，您的坚持令人佩服！`
            });
        } else {
            suggestions.push({
                type: 'achievement',
                icon: '👑',
                title: '学习大师',
                description: `连续学习${streak}天，您已经是真正的学习大师了！`
            });
        }

        // 基于今日复习量的建议
        if (today.reviews === 0) {
            suggestions.push({
                type: 'action',
                icon: '📖',
                title: '开始今日学习',
                description: '今天还没有开始学习，现在就开始吧！'
            });
        } else if (today.reviews < 5) {
            suggestions.push({
                type: 'encouragement',
                icon: '💪',
                title: '继续努力',
                description: `今天已完成${today.reviews}次复习，再多做一些吧！`
            });
        } else {
            suggestions.push({
                type: 'praise',
                icon: '🎉',
                title: '今日目标达成',
                description: `今天已完成${today.reviews}次复习，表现非常出色！`
            });
        }

        // 基于学习状态分布的建议
        const newItemsCount = overall.new;
        const reviewItemsCount = overall.todayReview;

        if (newItemsCount > reviewItemsCount * 2) {
            suggestions.push({
                type: 'strategy',
                icon: '⚖️',
                title: '平衡学习与复习',
                description: '新知识点较多，建议增加复习频率来巩固已学内容'
            });
        }

        // 基于学习成果的建议
        if (overall.mastered > 10) {
            suggestions.push({
                type: 'achievement',
                icon: '🎓',
                title: '知识掌握者',
                description: '已经精通大量知识点，可以考虑进行更深入的学习'
            });
        }

        // 渲染建议为HTML
        if (suggestions.length === 0) {
            return '<p class="no-data">继续保持良好的学习习惯！</p>';
        }

        // 随机打乱建议顺序，增加多样性
        const shuffledSuggestions = suggestions.sort(() => 0.5 - Math.random());

        return shuffledSuggestions.slice(0, 4).map(suggestion => `
            <div class="suggestion-item ${suggestion.type}">
                <div class="suggestion-icon">${suggestion.icon}</div>
                <div class="suggestion-content">
                    <div class="suggestion-title">${suggestion.title}</div>
                    <div class="suggestion-description">${suggestion.description}</div>
                </div>
            </div>
        `).join('');
    }

    // ==================== 个人中心页面方法 ====================

    // 加载个人中心页面
    async loadProfilePage() {
        console.log('👤 Loading profile page...');
        this.setLoading(true, '正在加载您的个人档案...');

        try {
            // [修复点] 调用我们刚刚在后端创建的新接口
            const response = await this.makeAPIRequest('/user/profile');

            if (!response.success || !response.data) {
                // 如果 API 返回 success: false 或没有 data 字段
                throw new Error(response.message || '获取个人资料失败');
            }

            // 将获取到的完整 profile 数据存起来
            this.userProfileData = response.data;
            console.log('✅ Profile data loaded:', this.userProfileData);

            // 同时获取会话统计数据
            let sessionStats = null;
            try {
                sessionStats = await this.makeAPIRequest('/session/stats');
            } catch (sessionError) {
                console.warn('Failed to load session stats:', sessionError);
                sessionStats = { streak: { days: 0 }, due: { count: 0 }, mastered: { count: 0 } };
            }

            this.updateProfileUI(this.userProfileData, sessionStats);
            this.renderProfileCharts(this.userProfileData); // 分离出图表渲染逻辑

            // 绑定个人中心事件
            this.bindProfileEvents();

        } catch (error) {
            console.error('加载个人中心失败:', error);
            this.showError('加载个人中心失败，请稍后重试。');

            // 可选：显示一个错误状态的UI，而不是空白页面
            const profilePage = document.getElementById('profile-page');
            if (profilePage) {
                profilePage.innerHTML = `
                    <div class="error-placeholder" style="text-align: center; padding: 50px;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 3em; color: var(--sakura-red); margin-bottom: 20px;"></i>
                        <h3>无法加载您的个人信息</h3>
                        <p style="color: var(--gray-600); margin: 20px 0;">网络连接异常，请稍后重试</p>
                        <button id="retry-load-profile" class="btn btn-primary">重试</button>
                    </div>`;

                const retryBtn = document.getElementById('retry-load-profile');
                if (retryBtn) {
                    retryBtn.addEventListener('click', () => this.loadProfilePage());
                }
            }
        } finally {
            this.setLoading(false);
        }
    }

    // 获取用户详细资料
    async fetchUserProfile() {
        try {
            const response = await this.makeAPIRequest('/user/profile');
            return response.data;
        } catch (error) {
            console.error('获取用户资料失败:', error);
            // 返回默认数据
            return {
                nickname: this.currentUser?.nickname || '用户',
                phone: this.currentUser?.phone || '',
                joinDate: '2024-01-01',
                level: 1,
                experience: 0,
                achievements: []
            };
        }
    }

    // 更新个人中心UI
    updateProfileUI(userProfile, sessionStats) {
        // [修复点] 从 profileData 中安全地解构数据
        const { nickname, phone, joinDate, streak, stats, achievements, settings } = userProfile || {};

        // 更新用户基本信息
        const nicknameElement = document.getElementById('profile-nickname');
        if (nicknameElement) {
            nicknameElement.textContent = nickname || '税务学习者';
        }

        const phoneElement = document.getElementById('profile-phone');
        if (phoneElement) {
            phoneElement.textContent = this.formatPhone(phone || '');
        }

        // 更新连续学习天数
        const streakElement = document.querySelector('.streak-days');
        if (streakElement) {
            streakElement.textContent = streak || 0;
        }

        // 更新加入日期
        const joinDateElement = document.querySelector('.join-date');
        if (joinDateElement) {
            joinDateElement.textContent = `🌸 ${new Date(joinDate || Date.now()).toLocaleDateString()} 加入学习之旅`;
        }

        // 更新每日目标 (示例)
        const dailyGoalProgress = 8; // 这个数据也应该来自后端
        const dailyGoalTotal = settings?.dailyGoal || 10;
        const goalProgressFill = document.querySelector('.goal-progress-fill');
        if (goalProgressFill) {
            goalProgressFill.style.width = `${(dailyGoalProgress / dailyGoalTotal) * 100}%`;
        }

        const goalText = document.querySelector('.goal-text');
        if (goalText) {
            goalText.textContent = `今日已完成 ${dailyGoalProgress} / ${dailyGoalTotal} 个目标`;
        }

        // 更新学习统计
        if (stats) {
            const totalLearnedElement = document.getElementById('total-learned');
            if (totalLearnedElement) {
                totalLearnedElement.textContent = stats.totalLearned || 0;
            }

            const masteredCountElement = document.getElementById('mastered-count');
            if (masteredCountElement) {
                masteredCountElement.textContent = stats.masteredCount || 0;
            }

            const accuracyElement = document.getElementById('accuracy-rate');
            if (accuracyElement) {
                accuracyElement.textContent = `${stats.accuracy || 0}%`;
            }
        }

        // 渲染徽章
        this.renderBadges(achievements || []);
    }

    // 渲染成就徽章
    renderBadges(achievements) {
        const achievementsContainer = document.getElementById('achievements-list');
        if (!achievementsContainer) return;

        achievementsContainer.innerHTML = '';

        const achievementIcons = {
            'newbie': { icon: 'fas fa-seedling', text: '初学者', color: '#10B981' },
            'streak_7': { icon: 'fas fa-fire', text: '连续7天', color: '#F59E0B' },
            'mastered_10': { icon: 'fas fa-star', text: '掌握10个知识点', color: '#3B82F6' },
            'mastered_50': { icon: 'fas fa-trophy', text: '掌握50个知识点', color: '#8B5CF6' },
            'accuracy_expert': { icon: 'fas fa-bullseye', text: '精准射手', color: '#EF4444' },
            'quiz_veteran': { icon: 'fas fa-medal', text: '答题老兵', color: '#6366F1' }
        };

        achievements.forEach(achievement => {
            const achievementData = achievementIcons[achievement] || {
                icon: 'fas fa-award',
                text: achievement,
                color: '#6B7280'
            };

            const badge = document.createElement('div');
            badge.className = 'achievement-badge';
            badge.style.cssText = `
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 12px;
                background: linear-gradient(135deg, ${achievementData.color}20, ${achievementData.color}10);
                border: 1px solid ${achievementData.color}40;
                border-radius: 20px;
                font-size: 0.875rem;
                color: ${achievementData.color};
            `;
            badge.innerHTML = `
                <i class="${achievementData.icon}"></i>
                <span>${achievementData.text}</span>
            `;
            achievementsContainer.appendChild(badge);
        });
    }

    // 渲染个人中心图表
    renderProfileCharts(profileData) {
        if (!profileData) return;

        // 可以在这里添加图表渲染逻辑
        // 例如：学习进度图表、答题正确率图表等
        console.log('📊 Rendering profile charts for:', profileData);
    }

    // 格式化手机号
    formatPhone(phone) {
        if (!phone) return '未知';
        return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
    }

    // 更新统计数据
    updateStatistics(sessionStats) {
        const stats = sessionStats?.overall || {};

        // 连续学习天数
        document.getElementById('streak-days').textContent = sessionStats?.streak?.current || 0;

        // 总学习时长（转换为小时）
        const totalHours = Math.floor((stats.totalStudyTime || 0) / 3600);
        document.getElementById('total-hours').textContent = `${totalHours}h`;

        // 已学知识点数量
        document.getElementById('knowledge-count').textContent = stats.totalKnowledgePoints || 0;

        // 正确率
        const accuracy = stats.totalQuizzes > 0
            ? Math.round((stats.correctAnswers / stats.totalQuizzes) * 100)
            : 0;
        document.getElementById('accuracy-rate').textContent = `${accuracy}%`;
    }

    // 更新成就系统
    updateAchievements(achievements, sessionStats) {
        const stats = sessionStats?.overall || {};
        const currentStreak = sessionStats?.streak?.current || 0;

        // 定义成就条件
        const achievementConditions = [
            {
                id: 'first_knowledge',
                name: '初学者',
                description: '完成第一个知识点',
                icon: 'fas fa-star',
                unlocked: stats.totalKnowledgePoints > 0,
                progress: stats.totalKnowledgePoints > 0 ? '1/1' : '0/1'
            },
            {
                id: 'streak_7',
                name: '连续7天',
                description: '连续学习7天',
                icon: 'fas fa-fire-alt',
                unlocked: currentStreak >= 7,
                progress: `${Math.min(currentStreak, 7)}/7`
            },
            {
                id: 'knowledge_master',
                name: '知识达人',
                description: '掌握100个知识点',
                icon: 'fas fa-brain',
                unlocked: stats.totalKnowledgePoints >= 100,
                progress: `${Math.min(stats.totalKnowledgePoints, 100)}/100`
            },
            {
                id: 'perfect_quiz',
                name: '完美主义者',
                description: '单次测试100%正确',
                icon: 'fas fa-medal',
                unlocked: achievements.includes('perfect_quiz'),
                progress: achievements.includes('perfect_quiz') ? '已达成' : '未达成'
            }
        ];

        // 渲染成就卡片
        const achievementsGrid = document.querySelector('.achievements-grid');
        achievementsGrid.innerHTML = achievementConditions.map(achievement => `
            <div class="achievement-card ${achievement.unlocked ? 'unlocked' : 'locked'}">
                <div class="achievement-icon">
                    <i class="${achievement.icon}"></i>
                </div>
                <div class="achievement-info">
                    <h4>${achievement.name}</h4>
                    <p>${achievement.description}</p>
                </div>
                <div class="achievement-progress">
                    <span>${achievement.progress}</span>
                </div>
            </div>
        `).join('');
    }

    // 初始化图表
    initializeCharts(sessionStats) {
        this.createWeeklyChart(sessionStats);
        this.createMasteryChart(sessionStats);
    }

    // 创建周学习时长图表
    createWeeklyChart(sessionStats) {
        const ctx = document.getElementById('weekly-chart').getContext('2d');

        // 生成最近7天的模拟数据
        const weeklyData = this.generateWeeklyData(sessionStats);

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: weeklyData.labels,
                datasets: [{
                    label: '学习时长（分钟）',
                    data: weeklyData.data,
                    borderColor: '#ff8fab',
                    backgroundColor: 'rgba(255, 139, 171, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#ff6b88',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        titleColor: '#333',
                        bodyColor: '#666',
                        borderColor: '#ff8fab',
                        borderWidth: 1,
                        cornerRadius: 8,
                        padding: 12
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            color: '#666'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#666'
                        }
                    }
                }
            }
        });
    }

    // 创建知识点掌握分布图表
    createMasteryChart(sessionStats) {
        const ctx = document.getElementById('mastery-chart').getContext('2d');

        // 从会话统计中获取状态分布
        const statusDistribution = sessionStats?.statusDistribution || {};

        const chartData = [
            { label: '新学习', value: statusDistribution.new || 0, color: '#ffc0cb' },
            { label: '学习中', value: statusDistribution.learning || 0, color: '#ffb7c5' },
            { label: '已掌握', value: statusDistribution.learned || 0, color: '#87ceeb' },
            { label: '已精通', value: statusDistribution.mastered || 0, color: '#98fb98' }
        ];

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: chartData.map(item => item.label),
                datasets: [{
                    data: chartData.map(item => item.value),
                    backgroundColor: chartData.map(item => item.color),
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#666',
                            padding: 15,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        titleColor: '#333',
                        bodyColor: '#666',
                        borderColor: '#ff8fab',
                        borderWidth: 1,
                        cornerRadius: 8,
                        padding: 12,
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? Math.round((context.parsed / total) * 100) : 0;
                                return `${context.label}: ${context.parsed} (${percentage}%)`;
                            }
                        }
                    }
                },
                cutout: '60%'
            }
        });
    }

    // 生成周学习数据
    generateWeeklyData(sessionStats) {
        const labels = [];
        const data = [];
        const today = new Date();

        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            labels.push(this.formatDate(date));

            // 生成模拟数据，实际应用中应从后端获取
            data.push(Math.floor(Math.random() * 60) + 20); // 20-80分钟
        }

        return { labels, data };
    }

    // 格式化日期
    formatDate(date) {
        const month = date.getMonth() + 1;
        const day = date.getDate();
        return `${month}/${day}`;
    }

    // 生成个性化学习建议
    generatePersonalizedSuggestions(sessionStats) {
        const stats = sessionStats?.overall || {};
        const suggestions = [];

        // 基于学习进度生成建议
        if (stats.newKnowledgePoints > 0) {
            suggestions.push({
                type: 'high',
                icon: 'fas fa-exclamation-circle',
                title: '复习待巩固知识点',
                description: `您有${stats.newKnowledgePoints}个知识点需要复习，建议优先复习`,
                action: 'review',
                buttonText: '开始复习'
            });
        }

        if (stats.totalKnowledgePoints < 10) {
            suggestions.push({
                type: 'medium',
                icon: 'fas fa-book',
                title: '学习新知识点',
                description: '今天可以学习2-3个新的知识点',
                action: 'learn',
                buttonText: '开始学习'
            });
        }

        if (stats.totalQuizzes < 5) {
            suggestions.push({
                type: 'low',
                icon: 'fas fa-chart-line',
                title: '做练习测试',
                description: '通过测试检验学习效果',
                action: 'quiz',
                buttonText: '开始测试'
            });
        }

        // 更新建议UI
        this.updateSuggestionsUI(suggestions);
    }

    // 更新建议UI
    updateSuggestionsUI(suggestions) {
        const suggestionsCard = document.querySelector('.suggestions-card');
        suggestionsCard.innerHTML = suggestions.map(suggestion => `
            <div class="suggestion-item priority-${suggestion.type}">
                <div class="suggestion-icon">
                    <i class="${suggestion.icon}"></i>
                </div>
                <div class="suggestion-content">
                    <h4>${suggestion.title}</h4>
                    <p>${suggestion.description}</p>
                </div>
                <button class="btn btn-${suggestion.type === 'high' ? 'primary' : 'outline'} btn-sm"
                        data-action="${suggestion.action}">
                    ${suggestion.buttonText}
                </button>
            </div>
        `).join('');

        // 绑定建议按钮事件
        suggestionsCard.querySelectorAll('button[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.getAttribute('data-action');
                this.handleSuggestionAction(action);
            });
        });
    }

    // 处理建议操作
    handleSuggestionAction(action) {
        switch (action) {
            case 'review':
                this.switchPage('progress');
                break;
            case 'learn':
                this.switchPage('learning');
                break;
            case 'quiz':
                this.switchPage('quiz');
                break;
            default:
                console.log('未知操作:', action);
        }
    }

    // 绑定个人中心事件
    bindProfileEvents() {
        // 编辑资料按钮
        document.getElementById('edit-profile-btn')?.addEventListener('click', () => {
            this.showEditProfileModal();
        });

        // 设置按钮
        document.getElementById('settings-btn')?.addEventListener('click', () => {
            this.showSettingsModal();
        });

        // 快速操作按钮
        document.getElementById('quick-study-btn')?.addEventListener('click', () => {
            this.switchPage('learning');
        });

        document.getElementById('quick-quiz-btn')?.addEventListener('click', () => {
            this.switchPage('quiz');
        });

        document.getElementById('quick-review-btn')?.addEventListener('click', () => {
            this.switchPage('progress');
        });

        document.getElementById('quick-stats-btn')?.addEventListener('click', () => {
            this.showMessage('详细统计功能开发中...', 'info');
        });
    }

    // 显示编辑资料模态框
    showEditProfileModal() {
        this.showMessage('编辑资料功能开发中...', 'info');
    }

    // 显示设置模态框
    showSettingsModal() {
        this.showMessage('设置功能开发中...', 'info');
    }

    // 显示加载状态
    showLoading(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            // 对于个人中心页面，只在profile-container内部显示加载状态
            const profileContainer = container.querySelector('.profile-container');
            if (profileContainer) {
                profileContainer.innerHTML = `
                    <div style="text-align: center; padding: 50px;">
                        <i class="fas fa-spinner fa-spin" style="font-size: 2em; color: var(--primary-color);"></i>
                        <p style="margin-top: 20px; color: var(--gray-600);">加载中...</p>
                    </div>
                `;
            } else {
                // 对于其他页面，直接替换整个容器内容
                container.innerHTML = `
                    <div style="text-align: center; padding: 50px;">
                        <i class="fas fa-spinner fa-spin" style="font-size: 2em; color: var(--primary-color);"></i>
                        <p style="margin-top: 20px; color: var(--gray-600);">加载中...</p>
                    </div>
                `;
            }
        }
    }

    // ========================================
    // 会话模式学习功能
    // ========================================

    // 初始化会话页面
    async initSessionPage() {
        console.log('🚀 Initializing session-based learning page...');

        try {
            // 隐藏所有会话界面，显示开始界面
            this.hideAllSessionViews();
            document.getElementById('session-start').style.display = 'flex';

            // 加载会话统计数据
            await this.loadSessionStats();

            // 绑定会话事件
            this.bindSessionEvents();

        } catch (error) {
            console.error('❌ Failed to initialize session page:', error);
            this.showMessage('初始化学习会话失败', 'error');
        }
    }

    // 隐藏所有会话界面
    hideAllSessionViews() {
        document.getElementById('session-start').style.display = 'none';
        document.getElementById('session-active').style.display = 'none';
        document.getElementById('session-complete').style.display = 'none';
    }

    // 加载会话统计数据
    async loadSessionStats() {
        try {
            console.log('📊 Loading session statistics...');

            const response = await fetch(`${this.API_BASE_URL}/session/stats`, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const stats = await response.json();
            console.log('✅ Session stats loaded:', stats);

            // 更新统计显示
            this.updateSessionStatsDisplay(stats);

        } catch (error) {
            console.error('❌ Failed to load session stats:', error);
            // 显示默认统计数据
            this.updateSessionStatsDisplay({
                streak: { days: 0 },
                due: { count: 0 },
                mastered: { count: 0 }
            });
        }
    }

    // 更新会话统计显示
    updateSessionStatsDisplay(stats) {
        const streakDays = document.getElementById('streak-days');
        const dueCount = document.getElementById('due-count');
        const masteredCount = document.getElementById('mastered-count');

        if (streakDays) {
            streakDays.textContent = `${stats.streak?.days || 0}天`;
        }
        if (dueCount) {
            dueCount.textContent = stats.due?.count || 0;
        }
        if (masteredCount) {
            masteredCount.textContent = stats.mastered?.count || 0;
        }
    }

    // 绑定会话事件
    bindSessionEvents() {
        // 解除旧的事件监听器，避免重复绑定
        this.unbindSessionEvents();

        // 会话模式选择按钮
        const startDailySession = document.getElementById('start-daily-session');
        const startReviewSession = document.getElementById('start-review-session');
        const startNewSession = document.getElementById('start-new-session');

        if (startDailySession) {
            this._sessionEventListeners.push({
                element: startDailySession,
                event: 'click',
                handler: () => this.startSession('daily')
            });
            startDailySession.addEventListener('click', () => this.startSession('daily'));
        }

        if (startReviewSession) {
            startReviewSession.addEventListener('click', () => this.startSession('review'));
        }

        if (startNewSession) {
            startNewSession.addEventListener('click', () => this.startSession('new'));
        }

        // 会话控制按钮
        const pauseSessionBtn = document.getElementById('pause-session-btn');
        const continueSessionBtn = document.getElementById('continue-session-btn');
        const endSessionBtn = document.getElementById('end-session-btn');

        if (pauseSessionBtn) {
            pauseSessionBtn.addEventListener('click', () => this.pauseSession());
        }

        if (continueSessionBtn) {
            continueSessionBtn.addEventListener('click', () => this.continueSession());
        }

        if (endSessionBtn) {
            endSessionBtn.addEventListener('click', () => this.endSession());
        }

        // 会话完成界面按钮
        const startNewSessionBtn = document.getElementById('start-new-session-btn');
        const viewProgressBtn = document.getElementById('view-progress-btn');

        if (startNewSessionBtn) {
            startNewSessionBtn.addEventListener('click', () => this.initSessionPage());
        }

        if (viewProgressBtn) {
            viewProgressBtn.addEventListener('click', () => this.switchPage('progress'));
        }

        // 知识点卡片按钮
        const showDetailsBtn = document.getElementById('show-details-btn');
        const showQuizBtn = document.getElementById('show-quiz-btn');

        if (showDetailsBtn) {
            showDetailsBtn.addEventListener('click', () => this.showKnowledgeDetails());
        }

        if (showQuizBtn) {
            showQuizBtn.addEventListener('click', () => this.startKnowledgeQuiz());
        }

        // 测试卡片按钮
        const submitAnswerBtn = document.getElementById('submit-answer-btn');
        const skipQuestionBtn = document.getElementById('skip-question-btn');
        const nextQuestionBtn = document.getElementById('next-question-btn');

        if (submitAnswerBtn) {
            submitAnswerBtn.addEventListener('click', () => this.submitAnswer());
        }

        if (skipQuestionBtn) {
            skipQuestionBtn.addEventListener('click', () => this.skipQuestion());
        }

        if (nextQuestionBtn) {
            nextQuestionBtn.addEventListener('click', () => this.nextQuestion());
        }
    }

    // 解除会话事件绑定
    unbindSessionEvents() {
        // 这里可以存储事件监听器引用并后续移除，简化处理
    }

    // 开始学习会话
    async startSession(mode) {
        console.log(`🚀 Starting ${mode} session...`);

        try {
            this.currentSessionMode = mode;
            this.sessionStartTime = Date.now();
            this.sessionData = {
                completed: 0,
                correct: 0,
                total: 0
            };

            // 调用后端API开始会话
            const response = await fetch(`${this.API_BASE_URL}/session/start`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const sessionResponse = await response.json();
            console.log('✅ Session started:', sessionResponse);

            this.currentSession = sessionResponse.data;
            this.sessionData.total = sessionResponse.data.items?.length || 0;

            // 切换到会话进行界面
            this.showActiveSession();

            // 开始第一个学习项目
            this.loadNextSessionItem();

            // 启动会话计时器
            this.startSessionTimer();

        } catch (error) {
            console.error('❌ Failed to start session:', error);
            this.showMessage('开始学习会话失败', 'error');
        }
    }

    // 显示活跃会话界面
    showActiveSession() {
        this.hideAllSessionViews();
        document.getElementById('session-active').style.display = 'block';

        // 更新会话模式显示
        const modeNames = {
            'daily': '每日学习',
            'review': '专注复习',
            'new': '学习新知'
        };

        const modeElement = document.getElementById('current-session-mode');
        if (modeElement) {
            modeElement.textContent = modeNames[this.currentSessionMode] || '学习会话';
        }

        // 更新进度计数
        this.updateSessionProgress();
    }

    // 加载下一个会话项目
    async loadNextSessionItem() {
        if (!this.currentSession || !this.currentSession.items || this.sessionData.completed >= this.currentSession.items.length) {
            // 会话完成
            this.completeSession();
            return;
        }

        const currentItem = this.currentSession.items[this.sessionData.completed];
        console.log('📚 Loading session item:', currentItem);

        try {
            // 直接使用API返回的完整数据，不再需要单独获取知识点详情
            const knowledgePoint = currentItem.knowledgePoint;
            console.log('✅ Knowledge point data:', knowledgePoint);

            // 设置当前进度ID，用于答案提交
            this.currentProgressId = currentItem.progressId;
            this.currentLearningStage = currentItem.learningStage;

            // 如果有题目，直接进入答题模式
            if (currentItem.quiz) {
                console.log('🎯 Quiz available, starting quiz mode');
                this.startQuizWithQuestion(currentItem.quiz, knowledgePoint, currentItem.srsData);
            } else {
                console.log('📚 No quiz available, showing knowledge point');
                // 显示知识点（学习模式）
                this.showKnowledgePoint(knowledgePoint, currentItem.srsData.status);
            }

        } catch (error) {
            console.error('❌ Failed to load session item:', error);
            this.showMessage('加载学习项目失败', 'error');
            // 跳过这个项目
            this.sessionData.completed++;
            this.loadNextSessionItem();
        }
    }

    // 使用API返回的题目直接开始答题
    startQuizWithQuestion(quiz, knowledgePoint, srsData) {
        console.log('🎯 Starting quiz with question:', quiz);

        // 设置当前题目数据
        this.currentQuizzes = [quiz]; // 包装成数组以复用现有逻辑
        this.currentQuizIndex = 0;
        this.currentQuizAnswers = [];
        this.currentKnowledgePoint = knowledgePoint;

        // 切换到答题界面
        this.showActiveSession();
        document.getElementById('knowledge-card').style.display = 'none';
        document.getElementById('quiz-card').style.display = 'block';

        // 加载题目
        this.loadQuizQuestion();
    }

    // 显示知识点
    showKnowledgePoint(knowledgePoint, status) {
        // 隐藏测试卡片，显示知识点卡片
        document.getElementById('knowledge-card').style.display = 'block';
        document.getElementById('quiz-card').style.display = 'none';

        // 更新知识点内容
        const titleElement = document.getElementById('knowledge-title');
        const contentElement = document.getElementById('content-text');
        const topicElement = document.getElementById('card-topic');
        const statusElement = document.getElementById('card-status');

        if (titleElement) {
            titleElement.textContent = knowledgePoint.sub_topic;
        }

        if (contentElement) {
            contentElement.textContent = knowledgePoint.content;
        }

        if (topicElement) {
            topicElement.textContent = knowledgePoint.topic;
        }

        if (statusElement) {
            const statusTexts = {
                'new': '新学习',
                'learning': '学习中',
                'review': '需复习',
                'mastered': '已掌握'
            };
            statusElement.textContent = statusTexts[status] || '学习中';
        }

        // 隐藏详情和关键要点
        document.getElementById('key-points').style.display = 'none';
        document.getElementById('comparison-section').style.display = 'none';

        // 重置按钮状态
        const showDetailsBtn = document.getElementById('show-details-btn');
        const showQuizBtn = document.getElementById('show-quiz-btn');

        if (showDetailsBtn) {
            showDetailsBtn.style.display = 'inline-flex';
            showDetailsBtn.querySelector('i').className = 'fas fa-eye';
        }

        if (showQuizBtn) {
            showQuizBtn.style.display = 'inline-flex';
        }

        // 存储当前知识点数据
        this.currentKnowledgePoint = knowledgePoint;
    }

    // 显示知识点详情
    showKnowledgeDetails() {
        if (!this.currentKnowledgePoint) return;

        const keyPointsSection = document.getElementById('key-points');
        const comparisonSection = document.getElementById('comparison-section');
        const showDetailsBtn = document.getElementById('show-details-btn');

        // 切换显示状态
        const isHidden = keyPointsSection.style.display === 'none';

        if (isHidden) {
            // 显示详情
            if (this.currentKnowledgePoint.key_points && this.currentKnowledgePoint.key_points.length > 0) {
                const keyPointsList = document.getElementById('key-points-list');
                if (keyPointsList) {
                    keyPointsList.innerHTML = '';
                    this.currentKnowledgePoint.key_points.forEach(point => {
                        const li = document.createElement('li');
                        li.textContent = point;
                        keyPointsList.appendChild(li);
                    });
                }
                keyPointsSection.style.display = 'block';
            }

            if (this.currentKnowledgePoint.comparison) {
                const comparisonTable = document.getElementById('comparison-table');
                if (comparisonTable) {
                    // 简化显示对比内容
                    comparisonTable.innerHTML = `
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                            <div>
                                <h5 style="color: var(--sakura-red); margin-bottom: 10px;">${this.currentKnowledgePoint.comparison.title}</h5>
                                <ul style="list-style: none; padding: 0;">
                                    ${this.currentKnowledgePoint.comparison.field1.map(item => `<li style="padding: 5px 0;">• ${item}</li>`).join('')}
                                </ul>
                            </div>
                            <div>
                                <h5 style="color: var(--sakura-purple); margin-bottom: 10px;">对比内容</h5>
                                <ul style="list-style: none; padding: 0;">
                                    ${this.currentKnowledgePoint.comparison.field2.map(item => `<li style="padding: 5px 0;">• ${item}</li>`).join('')}
                                </ul>
                            </div>
                        </div>
                    `;
                }
                comparisonSection.style.display = 'block';
            }

            // 更新按钮
            if (showDetailsBtn) {
                showDetailsBtn.querySelector('i').className = 'fas fa-eye-slash';
            }
        } else {
            // 隐藏详情
            keyPointsSection.style.display = 'none';
            comparisonSection.style.display = 'none';

            // 更新按钮
            if (showDetailsBtn) {
                showDetailsBtn.querySelector('i').className = 'fas fa-eye';
            }
        }
    }

    // 开始知识点测试
    async startKnowledgeQuiz() {
        if (!this.currentKnowledgePoint) return;

        try {
            console.log('📝 Loading quiz for knowledge point...');

            // 获取相关题目
            const response = await fetch(`${this.API_BASE_URL}/knowledge/point/${this.currentKnowledgePoint._id}/quizzes`, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const quizzes = await response.json();
            console.log('✅ Quizzes loaded:', quizzes);

            if (quizzes.length === 0) {
                this.showMessage('该知识点暂无测试题', 'info');
                return;
            }

            // 开始测试
            this.currentQuizzes = quizzes;
            this.currentQuizIndex = 0;
            this.currentQuizAnswers = [];

            // 切换到测试界面
            document.getElementById('knowledge-card').style.display = 'none';
            document.getElementById('quiz-card').style.display = 'block';

            // 加载第一题
            this.loadQuizQuestion();

        } catch (error) {
            console.error('❌ Failed to load quiz:', error);
            this.showMessage('加载测试题失败', 'error');
        }
    }

    // 加载测试题目 - 支持多题型
    loadQuizQuestion() {
        // 健壮性检查：确保quizzes数组存在且索引有效
        if (!this.currentQuizzes || this.currentQuizIndex >= this.currentQuizzes.length || this.currentQuizIndex < 0) {
            console.log('✅ Quiz completed or invalid quiz index');
            this.completeKnowledgeQuiz();
            return;
        }

        // 健壮性检查：确保当前quiz存在
        const quiz = this.currentQuizzes[this.currentQuizIndex];
        if (!quiz) {
            console.error("Load quiz failed: current quiz is undefined at index", this.currentQuizIndex);
            this.showMessage('题目加载失败', 'error');
            this.nextQuestion(); // 跳到下一题
            return;
        }

        console.log('📝 Loading quiz question:', quiz);

        // 更新题目进度
        const progressElement = document.getElementById('quiz-question-text');
        if (progressElement) {
            const quizType = this.getQuizTypeDisplayName(quiz.quizType || quiz.type || 'multiple_choice');
            progressElement.textContent = `题目 ${this.currentQuizIndex + 1}/${this.currentQuizzes.length} (${quizType})`;
        }

        // 根据题型渲染不同的答题界面
        this.renderQuizByType(quiz);

        // 隐藏反馈和下一题按钮
        document.getElementById('quiz-feedback').style.display = 'none';
        document.getElementById('next-question-btn').style.display = 'none';
        document.getElementById('submit-answer-btn').style.display = 'inline-flex';

        // 重置选择状态
        this.currentSelectedAnswer = null;
    }

    // 根据题型渲染答题界面
    renderQuizByType(quiz) {
        const questionElement = document.getElementById('question-text');
        const optionsContainer = document.getElementById('options-container');

        // 显示题目内容
        if (questionElement) {
            questionElement.textContent = quiz.question_text;
        }

        // 清空选项容器
        if (optionsContainer) {
            optionsContainer.innerHTML = '';
        }

        // 获取题型，兼容新旧数据格式
        const quizType = this.normalizeQuizType(quiz.quizType || quiz.type || 'multiple_choice');

        console.log(`🎯 Rendering quiz type: ${quizType}`);

        switch (quizType) {
            case 'multiple_choice':
                this.renderMultipleChoice(quiz, optionsContainer);
                break;
            case 'multiple_response':
                this.renderMultipleResponse(quiz, optionsContainer);
                break;
            case 'true_false':
                this.renderTrueFalse(quiz, optionsContainer);
                break;
            case 'fill_in_the_blank':
                this.renderFillInTheBlank(quiz, optionsContainer);
                break;
            case 'recall':
                this.renderRecallQuestion(quiz, optionsContainer);
                break;
            default:
                console.warn(`Unknown quiz type: ${quizType}, defaulting to multiple choice`);
                this.renderMultipleChoice(quiz, optionsContainer);
        }
    }

    // 标准化题型名称
    normalizeQuizType(type) {
        // 处理MongoDB聚合操作符格式
        if (typeof type === 'object' && type !== null) {
            // 如果是 {$switch: {...}} 格式，尝试从中提取实际类型
            if (type.$switch && type.$switch.branches) {
                // 查找第一个匹配的分支的then值
                for (const branch of type.$switch.branches) {
                    if (branch.then && typeof branch.then === 'string') {
                        type = branch.then;
                        break;
                    }
                }
                // 如果没找到，使用默认值
                if (typeof type === 'object' && type.$switch && type.$switch.default) {
                    type = type.$switch.default;
                }
            } else if (type.type && typeof type.type === 'string') {
                // 如果是 {type: "..."} 格式
                type = type.type;
            } else {
                // 其他对象格式，转换为字符串
                type = JSON.stringify(type);
            }
        }

        // 确保type是字符串
        if (typeof type !== 'string') {
            console.warn('Invalid quiz type format:', type, 'defaulting to multiple_choice');
            return 'multiple_choice';
        }

        const typeMap = {
            'single_choice': 'multiple_choice',
            'multiple_choice': 'multiple_response',
            'judgment': 'true_false',
            'fill_blank': 'fill_in_the_blank',
            'blank': 'fill_in_the_blank'
        };
        return typeMap[type] || type;
    }

    // 获取题型显示名称
    getQuizTypeDisplayName(type) {
        const displayNames = {
            'multiple_choice': '单选题',
            'multiple_response': '多选题',
            'true_false': '判断题',
            'fill_in_the_blank': '填空题',
            'recall': '回想题'
        };
        return displayNames[type] || '未知题型';
    }

    // 渲染单选题
    renderMultipleChoice(quiz, container) {
        if (!quiz.options || quiz.options.length === 0) {
            container.innerHTML = '<div class="alert alert-warning">题目选项不完整</div>';
            return;
        }

        quiz.options.forEach((option, index) => {
            const optionElement = document.createElement('div');
            optionElement.className = 'option-item';
            optionElement.dataset.value = option.key;

            optionElement.innerHTML = `
                <span class="option-letter">${option.key}</span>
                <span class="option-text">${option.text}</span>
            `;

            optionElement.addEventListener('click', () => this.selectOption(option.key));
            container.appendChild(optionElement);
        });
    }

    // 渲染多选题
    renderMultipleResponse(quiz, container) {
        if (!quiz.options || quiz.options.length === 0) {
            container.innerHTML = '<div class="alert alert-warning">题目选项不完整</div>';
            return;
        }

        container.innerHTML = '<div class="quiz-instruction mb-3"><i class="fas fa-info-circle"></i> 请选择所有正确答案（可多选）</div>';

        quiz.options.forEach((option, index) => {
            const optionElement = document.createElement('div');
            optionElement.className = 'option-item checkbox-option';
            optionElement.dataset.value = option.key;

            optionElement.innerHTML = `
                <input type="checkbox" id="option-${option.key}" value="${option.key}" class="quiz-checkbox">
                <label for="option-${option.key}" class="checkbox-label">
                    <span class="option-letter">${option.key}</span>
                    <span class="option-text">${option.text}</span>
                </label>
            `;

            const checkbox = optionElement.querySelector('input');
            checkbox.addEventListener('change', () => this.handleMultipleSelection(option.key, checkbox.checked));

            container.appendChild(optionElement);
        });
    }

    // 渲染判断题
    renderTrueFalse(quiz, container) {
        const trueOption = document.createElement('div');
        trueOption.className = 'option-item true-false-option';
        trueOption.dataset.value = 'true';

        trueOption.innerHTML = `
            <span class="option-letter">A</span>
            <span class="option-text">正确</span>
        `;

        const falseOption = document.createElement('div');
        falseOption.className = 'option-item true-false-option';
        falseOption.dataset.value = 'false';

        falseOption.innerHTML = `
            <span class="option-letter">B</span>
            <span class="option-text">错误</span>
        `;

        trueOption.addEventListener('click', () => this.selectOption('true'));
        falseOption.addEventListener('click', () => this.selectOption('false'));

        container.appendChild(trueOption);
        container.appendChild(falseOption);
    }

    // 渲染填空题
    renderFillInTheBlank(quiz, container) {
        if (!quiz.question_text) {
            container.innerHTML = '<div class="alert alert-warning">题目内容不完整</div>';
            return;
        }

        // 分析题目中的填空位置
        const blankMatches = quiz.question_text.match(/\_\_(.*?)\_\_/g) ||
                           quiz.question_text.match(/\【(.*?)\】/g) ||
                           quiz.question_text.match(/\{(.*?)\}/g);

        if (blankMatches.length === 0) {
            container.innerHTML = '<div class="alert alert-warning">未找到填空位置</div>';
            return;
        }

        container.innerHTML = '<div class="quiz-instruction mb-3"><i class="fas fa-edit"></i> 请在下方填空中输入答案</div>';

        blankMatches.forEach((blank, index) => {
            const blankText = blank.replace(/[\_\_\【\】\{\}]/g, '');
            const inputGroup = document.createElement('div');
            inputGroup.className = 'mb-3';

            inputGroup.innerHTML = `
                <label class="form-label">填空 ${index + 1}: ${blankText}</label>
                <input type="text" class="form-control blank-input" data-blank-index="${index}"
                       placeholder="请输入答案..." autocomplete="off">
            `;

            const input = inputGroup.querySelector('input');
            input.addEventListener('input', () => this.updateBlankAnswer(index, input.value));

            container.appendChild(inputGroup);
        });

        // 显示提示（如果有）
        if (quiz.hint) {
            const hintElement = document.createElement('div');
            hintElement.className = 'alert alert-info mt-3';
            hintElement.innerHTML = `<i class="fas fa-lightbulb"></i> 提示：${quiz.hint}`;
            container.appendChild(hintElement);
        }
    }

    // 渲染回想题
    renderRecallQuestion(quiz, container) {
        container.innerHTML = `
            <div class="quiz-instruction mb-3">
                <i class="fas fa-brain"></i>
                <strong>回想题：</strong>请根据您的记忆回答下列问题
            </div>
            <div class="recall-answer-container">
                <textarea class="form-control recall-textarea"
                          placeholder="请在此输入您的答案..."
                          rows="4"
                          autocomplete="off"></textarea>
                <div class="mt-2 text-muted">
                    <small><i class="fas fa-info-circle"></i> 请详细说明您的理解和记忆</small>
                </div>
            </div>
        `;

        const textarea = container.querySelector('.recall-textarea');
        textarea.addEventListener('input', () => {
            this.currentSelectedAnswer = textarea.value;
        });

        // 显示关键词提示（如果有）
        if (quiz.keywords && quiz.keywords.length > 0) {
            const keywordsElement = document.createElement('div');
            keywordsElement.className = 'mt-3';
            keywordsElement.innerHTML = `
                <div class="text-muted mb-2"><small>关键词提示：</small></div>
                <div class="keyword-tags">
                    ${quiz.keywords.map(keyword => `<span class="badge bg-secondary me-1">${keyword}</span>`).join('')}
                </div>
            `;
            container.appendChild(keywordsElement);
        }
    }

    // 处理多选题选择
    handleMultipleSelection(value, isSelected) {
        if (!this.currentSelectedAnswer) {
            this.currentSelectedAnswer = [];
        }

        if (Array.isArray(this.currentSelectedAnswer)) {
            if (isSelected) {
                if (!this.currentSelectedAnswer.includes(value)) {
                    this.currentSelectedAnswer.push(value);
                }
            } else {
                this.currentSelectedAnswer = this.currentSelectedAnswer.filter(v => v !== value);
            }
        } else {
            this.currentSelectedAnswer = isSelected ? [value] : [];
        }

        console.log('Multiple selection updated:', this.currentSelectedAnswer);
        this.updateSubmitButtonState();
    }

    // 更新填空题答案
    updateBlankAnswer(index, value) {
        if (!this.currentSelectedAnswer) {
            this.currentSelectedAnswer = [];
        }

        this.currentSelectedAnswer[index] = value;
        console.log('Blank answer updated:', this.currentSelectedAnswer);
        this.updateSubmitButtonState();
    }

    // 更新提交按钮状态
    updateSubmitButtonState() {
        const submitBtn = document.getElementById('submit-answer-btn');
        if (!submitBtn) return;

        let canSubmit = false;

        if (this.currentSelectedAnswer === null || this.currentSelectedAnswer === undefined) {
            canSubmit = false;
        } else if (Array.isArray(this.currentSelectedAnswer)) {
            canSubmit = this.currentSelectedAnswer.some(answer => answer && answer.trim() !== '');
        } else {
            canSubmit = this.currentSelectedAnswer.trim() !== '';
        }

        submitBtn.disabled = !canSubmit;
    }

    // 选择选项
    selectOption(value) {
        // 清除之前的选择（仅对单选题）
        document.querySelectorAll('.option-item:not(.checkbox-option)').forEach(item => {
            item.classList.remove('selected');
        });

        // 标记当前选择
        const selectedItem = document.querySelector(`.option-item[data-value="${value}"]:not(.checkbox-option)`);
        if (selectedItem) {
            selectedItem.classList.add('selected');
            this.currentSelectedAnswer = value;
        }
    }

    // 提交答案 - 支持多题型
    async submitAnswer() {
        if (!this.validateAnswer()) {
            return;
        }

        const quiz = this.currentQuizzes[this.currentQuizIndex];
        const normalizedAnswer = this.normalizeUserAnswer(this.currentSelectedAnswer);
        const isCorrect = this.checkAnswerCorrectness(normalizedAnswer, quiz.correct_answer);

        // 显示反馈
        this.showQuizFeedback(isCorrect, quiz.explanation);

        // 记录答案
        this.currentQuizAnswers.push({
            quizId: quiz._id,
            userAnswer: normalizedAnswer,
            isCorrect: isCorrect
        });

        // 更新会话统计
        if (isCorrect) {
            this.sessionData.correct++;
        }

        // 提交答案到后端
        try {
            await fetch(`${this.API_BASE_URL}/user/quiz-history`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    quiz_id: quiz._id,
                    user_answer: Array.isArray(normalizedAnswer) ? normalizedAnswer : [normalizedAnswer],
                    is_correct: isCorrect
                })
            });
        } catch (error) {
            console.error('❌ Failed to submit answer:', error);
        }

        // 显示下一题按钮
        document.getElementById('submit-answer-btn').style.display = 'none';
        document.getElementById('next-question-btn').style.display = 'inline-flex';
    }

    // 验证答案格式
    validateAnswer() {
        // 健壮性检查：确保当前quiz存在
        const quiz = this.currentQuizzes?.[this.currentQuizIndex];
        if (!quiz) {
            console.error("Validation failed: current quiz is not available.");
            this.showMessage('当前没有题目，无法验证答案', 'error');
            return false;
        }

        const quizType = this.normalizeQuizType(quiz.quizType || quiz.type || 'multiple_choice');

        if (!this.currentSelectedAnswer) {
            let message = '请先选择一个答案';
            if (quizType === 'fill_in_the_blank') {
                message = '请填写答案';
            } else if (quizType === 'recall') {
                message = '请输入您的答案';
            }
            this.showMessage(message, 'warning');
            return false;
        }

        if (Array.isArray(this.currentSelectedAnswer)) {
            if (quizType === 'fill_in_the_blank') {
                const hasEmptyBlanks = this.currentSelectedAnswer.some(answer => !answer || answer.trim() === '');
                if (hasEmptyBlanks) {
                    this.showMessage('请填写所有填空', 'warning');
                    return false;
                }
            } else if (quizType === 'multiple_response') {
                if (this.currentSelectedAnswer.length === 0) {
                    this.showMessage('请至少选择一个答案', 'warning');
                    return false;
                }
            }
        } else if (this.currentSelectedAnswer.trim() === '') {
            this.showMessage('答案不能为空', 'warning');
            return false;
        }

        return true;
    }

    // 标准化用户答案格式
    normalizeUserAnswer(answer) {
        if (Array.isArray(answer)) {
            return answer
                .map(a => a && a.trim ? a.trim() : a)
                .filter(a => a && a !== '');
        } else {
            const trimmed = answer && answer.trim ? answer.trim() : answer;
            return trimmed;
        }
    }

    // 检查答案正确性 - 支持多种题型
    checkAnswerCorrectness(userAnswer, correctAnswer) {
        // 如果是字符串答案（单选、判断）
        if (typeof userAnswer === 'string' && Array.isArray(correctAnswer)) {
            return correctAnswer.includes(userAnswer);
        }

        // 如果是数组答案（多选、填空）
        if (Array.isArray(userAnswer) && Array.isArray(correctAnswer)) {
            // 多选题：必须完全匹配且顺序不重要
            if (userAnswer.length !== correctAnswer.length) {
                return false;
            }

            const sortedUser = [...userAnswer].sort();
            const sortedCorrect = [...correctAnswer].sort();

            return sortedUser.every((answer, index) => answer === sortedCorrect[index]);
        }

        // 回想题：模糊匹配（可以后续扩展为更智能的匹配）
        if (typeof userAnswer === 'string' && typeof correctAnswer === 'string') {
            return userAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
        }

        // 默认情况
        return userAnswer === correctAnswer;
    }

    // 显示测试反馈
    showQuizFeedback(isCorrect, explanation) {
        const feedbackElement = document.getElementById('quiz-feedback');
        const iconElement = document.getElementById('feedback-icon');
        const textElement = document.getElementById('feedback-text');

        if (feedbackElement) {
            feedbackElement.style.display = 'flex';

            if (iconElement) {
                iconElement.className = `feedback-icon ${isCorrect ? 'correct' : 'incorrect'}`;
                iconElement.innerHTML = isCorrect ? '<i class="fas fa-check"></i>' : '<i class="fas fa-times"></i>';
            }

            if (textElement) {
                textElement.textContent = isCorrect ?
                    '回答正确！太棒了！' :
                    `回答错误。${explanation || '请继续努力！'}`;
            }
        }
    }

    // 下一题
    nextQuestion() {
        this.currentQuizIndex++;
        this.loadQuizQuestion();
    }

    // 跳过题目
    skipQuestion() {
        // 健壮性检查：确保当前quiz存在
        const quiz = this.currentQuizzes?.[this.currentQuizIndex];
        if (!quiz) {
            console.error("Skip failed: current quiz is not available.");
            this.showMessage('当前没有题目可跳过', 'error');
            return;
        }

        this.currentQuizAnswers.push({
            quizId: quiz._id,
            userAnswer: null,
            isCorrect: false,
            skipped: true
        });
        this.nextQuestion();
    }

    // 完成知识点测试
    completeKnowledgeQuiz() {
        console.log('✅ Knowledge quiz completed');

        // 计算得分
        const totalQuestions = this.currentQuizzes.length;
        const correctAnswers = this.currentQuizAnswers.filter(a => a.isCorrect).length;
        const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

        // 显示结果
        const scoreMessage = score >= 80 ? '优秀！' : score >= 60 ? '良好！' : '继续努力！';
        this.showMessage(`测试完成！得分：${score}分 ${scoreMessage}`, score >= 60 ? 'success' : 'info');

        // 返回知识点卡片
        setTimeout(() => {
            document.getElementById('quiz-card').style.display = 'none';
            document.getElementById('knowledge-card').style.display = 'block';

            // 隐藏测试按钮，显示继续按钮
            document.getElementById('show-quiz-btn').style.display = 'none';

            // 继续下一个学习项目
            setTimeout(() => {
                this.continueToNext();
            }, 2000);
        }, 2000);
    }

    // 继续下一个学习项目
    continueToNext() {
        this.sessionData.completed++;
        this.updateSessionProgress();
        this.loadNextSessionItem();
    }

    // 更新会话进度
    updateSessionProgress() {
        const currentElement = document.getElementById('session-current');
        const totalElement = document.getElementById('session-total');
        const progressElement = document.getElementById('session-progress-fill');

        if (currentElement) {
            currentElement.textContent = this.sessionData.completed + 1;
        }

        if (totalElement) {
            totalElement.textContent = this.sessionData.total;
        }

        if (progressElement) {
            const progress = this.sessionData.total > 0 ?
                ((this.sessionData.completed / this.sessionData.total) * 100) : 0;
            progressElement.style.width = `${progress}%`;
        }
    }

    // 启动会话计时器
    startSessionTimer() {
        if (this.sessionTimer) {
            clearInterval(this.sessionTimer);
        }

        this.sessionTimer = setInterval(() => {
            const elapsed = Date.now() - this.sessionStartTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);

            const timerElement = document.getElementById('session-timer');
            if (timerElement) {
                timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        }, 1000);
    }

    // 暂停会话
    pauseSession() {
        if (this.sessionTimer) {
            clearInterval(this.sessionTimer);
            this.sessionTimer = null;
        }
        this.showMessage('会话已暂停', 'info');
    }

    // 继续会话
    continueSession() {
        this.startSessionTimer();
        this.showMessage('会话已继续', 'info');
    }

    // 结束会话
    endSession() {
        if (this.sessionTimer) {
            clearInterval(this.sessionTimer);
            this.sessionTimer = null;
        }
        this.completeSession();
    }

    // 完成会话
    async completeSession() {
        console.log('🎉 Completing session...');

        // 停止计时器
        if (this.sessionTimer) {
            clearInterval(this.sessionTimer);
            this.sessionTimer = null;
        }

        // 计算会话统计
        const sessionTime = Date.now() - this.sessionStartTime;
        const timeSpent = Math.round(sessionTime / 60000); // 分钟
        const pointsGained = this.sessionData.correct * 10 + this.sessionData.completed * 5;

        // 更新完成界面显示
        this.updateCompletionDisplay({
            completed: this.sessionData.completed,
            correct: this.sessionData.correct,
            timeSpent: timeSpent,
            pointsGained: pointsGained
        });

        // 切换到完成界面
        this.hideAllSessionViews();
        document.getElementById('session-complete').style.display = 'flex';

        // 提交会话完成数据到后端
        try {
            await fetch(`${this.API_BASE_URL}/session/complete`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sessionId: this.currentSession?.sessionId,
                    completed: this.sessionData.completed,
                    correct: this.sessionData.correct,
                    timeSpent: timeSpent
                })
            });
        } catch (error) {
            console.error('❌ Failed to complete session on server:', error);
        }
    }

    // 更新完成界面显示
    updateCompletionDisplay(stats) {
        // 更新统计数据
        const completedElement = document.getElementById('completed-count');
        const correctElement = document.getElementById('correct-count');
        const timeElement = document.getElementById('time-spent');
        const pointsElement = document.getElementById('points-gained');

        if (completedElement) completedElement.textContent = stats.completed;
        if (correctElement) correctElement.textContent = stats.correct;
        if (timeElement) timeElement.textContent = `${stats.timeSpent}分钟`;
        if (pointsElement) pointsElement.textContent = stats.pointsGained;

        // 生成成就徽章
        this.generateAchievements(stats);
    }

    // 生成成就徽章
    generateAchievements(stats) {
        const achievements = [];
        const achievementsContainer = document.getElementById('achievements');

        if (stats.correct >= 8) {
            achievements.push({
                icon: 'fas fa-star',
                text: '答题高手'
            });
        }

        if (stats.timeSpent >= 15) {
            achievements.push({
                icon: 'fas fa-clock',
                text: '专注学习'
            });
        }

        if (stats.pointsGained >= 100) {
            achievements.push({
                icon: 'fas fa-trophy',
                text: '积分达人'
            });
        }

        if (achievementsContainer) {
            achievementsContainer.innerHTML = '';
            achievements.forEach(achievement => {
                const badge = document.createElement('div');
                badge.className = 'achievement-badge';
                badge.innerHTML = `
                    <i class="${achievement.icon}"></i>
                    <span>${achievement.text}</span>
                `;
                achievementsContainer.appendChild(badge);
            });
        }
    }
}

// 初始化应用
const app = new TaxLearningApp();

// =======================================
// 樱花飘落特效JavaScript
// =======================================

class SakuraEffect {
    constructor() {
        this.container = document.getElementById('sakura-container');
        this.petals = [];
        this.maxPetals = 20;
        this.init();
    }

    init() {
        // 创建初始樱花花瓣
        for (let i = 0; i < this.maxPetals; i++) {
            setTimeout(() => {
                this.createPetal();
            }, i * 1000);
        }

        // 定期添加新的樱花花瓣
        setInterval(() => {
            if (this.petals.length < this.maxPetals) {
                this.createPetal();
            }
        }, 3000);

        // 清理完成动画的花瓣
        setInterval(() => {
            this.cleanupPetals();
        }, 10000);
    }

    createPetal() {
        const petal = document.createElement('div');
        petal.className = 'sakura-petal';

        // 随机位置和动画参数
        const startPosition = Math.random() * 100;
        const animationDuration = 8 + Math.random() * 6; // 8-14秒
        const swayDuration = 2 + Math.random() * 2; // 2-4秒
        const size = 10 + Math.random() * 10; // 10-20px

        petal.style.left = startPosition + '%';
        petal.style.animationDuration = `${animationDuration}s, ${swayDuration}s`;
        petal.style.width = size + 'px';
        petal.style.height = size + 'px';

        // 添加光泽效果
        const shimmer = document.createElement('div');
        shimmer.style.position = 'absolute';
        shimmer.style.top = '20%';
        shimmer.style.left = '20%';
        shimmer.style.width = '30%';
        shimmer.style.height = '30%';
        shimmer.style.background = 'rgba(255, 255, 255, 0.8)';
        shimmer.style.borderRadius = '50%';
        petal.appendChild(shimmer);

        this.container.appendChild(petal);
        this.petals.push(petal);

        // 动画结束后移除花瓣
        setTimeout(() => {
            if (petal.parentNode) {
                petal.parentNode.removeChild(petal);
            }
            const index = this.petals.indexOf(petal);
            if (index > -1) {
                this.petals.splice(index, 1);
            }
        }, animationDuration * 1000);
    }

    cleanupPetals() {
        // 清理已移除的花瓣引用
        this.petals = this.petals.filter(petal => petal.parentNode);
    }

    // 暴风雨效果（增加花瓣数量）
    storm() {
        const stormCount = 10;
        for (let i = 0; i < stormCount; i++) {
            setTimeout(() => {
                this.createPetal();
            }, i * 200);
        }
    }

    // 停止效果
    stop() {
        this.petals.forEach(petal => {
            if (petal.parentNode) {
                petal.parentNode.removeChild(petal);
            }
        });
        this.petals = [];
    }
}

// 页面加载完成后初始化樱花效果
document.addEventListener('DOMContentLoaded', () => {
    const sakuraEffect = new SakuraEffect();

    // 点击页面任意位置触发樱花暴风雨
    document.addEventListener('click', (e) => {
        // 避免点击按钮时触发
        if (!e.target.closest('button') && !e.target.closest('input')) {
            sakuraEffect.storm();
        }
    });

    // 添加樱花特效到全局作用域，方便调试
    window.sakuraEffect = sakuraEffect;
});
