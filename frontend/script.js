// 税务学习平台前端脚本
class TaxLearningApp {
    constructor() {
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

        this.init();
    }

    init() {
        this.checkExistingAuth();
        this.bindAuthEvents();
        this.bindEvents();
        this.checkConnection();
        this.updateConnectionStatus();
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
            const response = await fetch(`${this.API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ phone, password })
            });

            const data = await response.json();

            if (data.success) {
                this.currentUser = data.user;
                this.authToken = data.token;

                // 保存到本地存储
                localStorage.setItem('authToken', this.authToken);
                localStorage.setItem('currentUser', JSON.stringify(this.currentUser));

                this.showAuthenticatedUI();
                this.showMessage('登录成功！', 'success');

                // 加载用户学习进度
                this.loadUserProgress();

                this.switchPage('learning');
                this.loadTopics();
            } else {
                this.showFormError('login-password', data.message);
            }
        } catch (error) {
            console.error('登录失败:', error);
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
        // 检查是否需要登录
        if (page !== 'login' && !this.currentUser) {
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
        document.getElementById(`${page}-page`).classList.add('active');

        this.currentPage = page;

        // 页面特定逻辑
        switch(page) {
            case 'learning':
                this.loadTopics();
                break;
            case 'quiz':
                this.initQuizPage();
                break;
            case 'progress':
                this.loadProgressPage();
                break;
        }
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
        // 初始化练习页面，具体内容由 renderCurrentQuestion 处理
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
            const response = await this.makeAPIRequest('/user/progress');

            if (!response.ok) throw new Error('获取进度数据失败');

            const data = await response.json();
            if (data.success) {
                this.progressData = data.data;
                this.renderProgressPage();
            } else {
                this.showMessage('获取进度数据失败', 'error');
            }
        } catch (error) {
            console.error('加载进度数据失败:', error);
            this.showError('加载进度数据失败');
        } finally {
            this.updateSyncStatus(false);
        }
    }

    // 渲染进度页面
    renderProgressPage() {
        const progressPage = document.getElementById('progress-page');
        if (!progressPage || !this.progressData) return;

        const { statistics, topic_progress, learning_progress, quiz_history, nickname } = this.progressData;

        // 计算主题进度百分比
        const topicProgressHtml = Object.entries(topic_progress).map(([topic, progress]) => {
            const percentage = progress.total > 0 ? Math.round((progress.learned / progress.total) * 100) : 0;
            return `
                <div class="progress-item">
                    <div class="progress-header">
                        <h4>${topic}</h4>
                        <span class="progress-percentage">${percentage}%</span>
                    </div>
                    <div class="progress-bar-container">
                        <div class="progress-bar-fill" style="width: ${percentage}%"></div>
                    </div>
                    <div class="progress-stats">
                        <span>${progress.learned} / ${progress.total} 已学</span>
                    </div>
                </div>
            `;
        }).join('');

        // 获取最近学习记录
        const recentLearning = learning_progress
            .sort((a, b) => new Date(b.last_studied_at) - new Date(a.last_studied_at))
            .slice(0, 5);

        const recentLearningHtml = recentLearning.map(progress => {
            const date = new Date(progress.last_studied_at).toLocaleDateString('zh-CN');
            return `
                <div class="recent-item">
                    <div class="recent-date">${date}</div>
                    <div class="recent-status ${progress.status}">
                        <i class="fas fa-${progress.status === 'learned' ? 'check-circle' : 'clock'}"></i>
                        ${progress.status === 'learned' ? '已学' : '学习中'}
                    </div>
                </div>
            `;
        }).join('');

        // 获取最近答题记录
        const recentQuizzes = quiz_history
            .sort((a, b) => new Date(b.attempted_at) - new Date(a.attempted_at))
            .slice(0, 5);

        const recentQuizzesHtml = recentQuizzes.map(quiz => {
            const date = new Date(quiz.attempted_at).toLocaleDateString('zh-CN');
            return `
                <div class="recent-item">
                    <div class="recent-date">${date}</div>
                    <div class="recent-status ${quiz.is_correct ? 'correct' : 'incorrect'}">
                        <i class="fas fa-${quiz.is_correct ? 'check' : 'times'}"></i>
                        ${quiz.is_correct ? '正确' : '错误'}
                    </div>
                </div>
            `;
        }).join('');

        progressPage.innerHTML = `
            <div class="progress-container">
                <div class="progress-header">
                    <h2><i class="fas fa-chart-line"></i> 学习进度统计</h2>
                    <div class="user-info">
                        <span class="user-name">${nickname}</span>
                        <span class="last-update">最后更新: ${new Date(this.progressData.last_updated).toLocaleString('zh-CN')}</span>
                    </div>
                </div>

                <!-- 总体统计 -->
                <div class="statistics-section">
                    <h3>📊 总体学习情况</h3>
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-icon">
                                <i class="fas fa-graduation-cap"></i>
                            </div>
                            <div class="stat-content">
                                <div class="stat-number">${statistics.total_learned}</div>
                                <div class="stat-label">已学知识点</div>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon">
                                <i class="fas fa-tasks"></i>
                            </div>
                            <div class="stat-content">
                                <div class="stat-number">${statistics.total_quizzes}</div>
                                <div class="stat-label">总答题数</div>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon">
                                <i class="fas fa-check-circle"></i>
                            </div>
                            <div class="stat-content">
                                <div class="stat-number">${statistics.correct_quizzes}</div>
                                <div class="stat-label">正确答题</div>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon">
                                <i class="fas fa-percentage"></i>
                            </div>
                            <div class="stat-content">
                                <div class="stat-number">${statistics.quiz_accuracy}%</div>
                                <div class="stat-label">总正确率</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 主题进度 -->
                <div class="topic-progress-section">
                    <h3>📚 主题学习进度</h3>
                    <div class="topic-progress-list">
                        ${topicProgressHtml || '<p class="no-data">暂无主题进度数据</p>'}
                    </div>
                </div>

                <!-- 最近活动 -->
                <div class="recent-activity-section">
                    <div class="activity-tabs">
                        <button class="tab-btn active" onclick="app.switchProgressTab('learning')">
                            <i class="fas fa-book"></i> 最近学习
                        </button>
                        <button class="tab-btn" onclick="app.switchProgressTab('quizzes')">
                            <i class="fas fa-clipboard-check"></i> 最近答题
                        </button>
                    </div>
                    <div class="activity-content">
                        <div id="learning-tab" class="tab-content active">
                            ${recentLearningHtml || '<p class="no-data">暂无学习记录</p>'}
                        </div>
                        <div id="quizzes-tab" class="tab-content">
                            ${recentQuizzesHtml || '<p class="no-data">暂无答题记录</p>'}
                        </div>
                    </div>
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
    generateLearningSuggestions(progressData) {
        const suggestions = [];
        const { statistics, learning_progress, quiz_history } = progressData;

        // 基于学习数量的建议
        if (statistics.total_learned < 10) {
            suggestions.push({
                type: 'action',
                icon: '📚',
                title: '增加学习量',
                description: '建议每天学习至少5个新知识点，打好基础'
            });
        } else if (statistics.total_learned < 30) {
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
        if (statistics.quiz_accuracy < 60) {
            suggestions.push({
                type: 'warning',
                icon: '⚠️',
                title: '正确率偏低',
                description: '建议先复习已学知识点，理解概念后再大量练习'
            });
        } else if (statistics.quiz_accuracy < 80) {
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

        // 基于最近活跃度的建议
        const recentActivity = quiz_history.slice(-5);
        if (recentActivity.length === 0) {
            suggestions.push({
                type: 'action',
                icon: '🎮',
                title: '开始练习',
                description: '还没有练习记录，建议从简单题目开始练习'
            });
        } else if (statistics.recent_accuracy < statistics.quiz_accuracy) {
            suggestions.push({
                type: 'reminder',
                icon: '🔄',
                title: '复习巩固',
                description: '最近正确率有所下降，建议复习之前学过的知识点'
            });
        }

        // 基于学习习惯的建议
        const today = new Date();
        const lastStudyDate = learning_progress.length > 0 ?
            new Date(learning_progress[learning_progress.length - 1].last_studied_at) : null;

        if (lastStudyDate) {
            const daysSinceLastStudy = Math.floor((today - lastStudyDate) / (1000 * 60 * 60 * 24));
            if (daysSinceLastStudy > 3) {
                suggestions.push({
                    type: 'reminder',
                    icon: '⏰',
                    title: '保持连续性',
                    description: `已经${daysSinceLastStudy}天没有学习了，建议今天回来学习`
                });
            } else if (daysSinceLastStudy <= 1) {
                suggestions.push({
                    type: 'praise',
                    icon: '🔥',
                    title: '连续学习',
                    description: '连续学习效果很好！保持这个良好习惯'
                });
            }
        }

        // 添加个性化学习路径建议
        if (statistics.total_learned >= 20 && statistics.quiz_accuracy >= 70) {
            suggestions.push({
                type: 'strategy',
                icon: '🎓',
                title: '进阶学习',
                description: '基础扎实，建议尝试模拟考试或综合性练习'
            });
        }

        return suggestions.slice(0, 4); // 最多显示4条建议
    }
}

// 初始化应用
const app = new TaxLearningApp();