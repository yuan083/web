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

    // 其他方法保持原来的实现...
    // (为了节省空间，其他方法如loadTopicChapters, renderChapters等保持不变)

    showError(message) {
        this.showMessage(message, 'error');
    }

    showMessage(message, type = 'info') {
        // 创建消息元素
        const messageDiv = document.createElement('div');
        messageDiv.className = type;
        messageDiv.innerHTML = `
            <h4><i class="fas fa-${type === 'error' ? 'exclamation-triangle' : type === 'success' ? 'check-circle' : 'info-circle'}"></i> 提示</h4>
            <p>${message}</p>
        `;

        // 插入到页面顶部
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.insertBefore(messageDiv, mainContent.firstChild);

            // 3秒后自动移除
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.parentNode.removeChild(messageDiv);
                }
            }, 3000);
        }
    }

    // 占位方法，需要在完整实现中添加
    async loadTopicChapters(topicName) {
        console.log('加载章节:', topicName);
        this.showMessage('章节加载功能开发中...', 'info');
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

    startQuiz() {
        this.showMessage('练习功能开发中...', 'info');
    }

    markAsLearned() {
        this.showMessage('学习进度将同步到云端', 'success');
    }

    initQuizPage() {
        const quizContent = document.getElementById('quiz-content');
        if (quizContent) {
            quizContent.innerHTML = `
                <div class="loading">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>练习功能开发中...</p>
                </div>
            `;
        }
    }

    loadProgressPage() {
        this.showMessage('进度统计功能开发中...', 'info');
    }
}

// 初始化应用
const app = new TaxLearningApp();