// 税务师学习平台 - 完整版JavaScript

// Supabase配置
const SUPABASE_URL = 'https://mrpomuidxsocqifpkvbc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ycG9tdWlkeHNvY3FpZnBrdmJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNjc0MjQsImV4cCI6MjA3NDY0MzQyNH0.2HD9XQvXNaGgTnwtumcY1pejwN77BNJtUQ-TFDm40YQ';

// 初始化Supabase客户端
let supabase;

// 应用状态
let currentScreen = 'home';
let allCards = [];
let userProgress = {};
let currentCard = null;
let learningSession = null;

// 显示提示消息
function showToast(message, type = 'info') {
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

// 用户管理

// 用户注册
async function signUp(email, password, name) {
    try {
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    name: name
                }
            }
        });

        if (error) {
            console.error('注册失败:', error);
            showToast('注册失败: ' + error.message, 'error');
            return false;
        }

        console.log('注册成功:', data);
        showToast('注册成功！请检查邮箱验证', 'success');
        return true;
    } catch (error) {
        console.error('注册异常:', error);
        showToast('注册失败，请重试', 'error');
        return false;
    }
}

// 用户登录
async function signIn(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            console.error('登录失败:', error);
            showToast('登录失败: ' + error.message, 'error');
            return false;
        }

        console.log('登录成功:', data);
        showToast('登录成功！', 'success');

        // 更新用户状态
        if (data.user) {
            currentUser = {
                id: data.user.id,
                email: data.user.email,
                name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || '用户'
            };
            updateUserUI();
        }

        return true;
    } catch (error) {
        console.error('登录异常:', error);
        showToast('登录失败，请重试', 'error');
        return false;
    }
}

// 用户退出
async function signOut() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('退出失败:', error);
            showToast('退出失败', 'error');
            return false;
        }

        console.log('退出成功');
        showToast('已退出登录', 'success');
        return true;
    } catch (error) {
        console.error('退出异常:', error);
        showToast('退出失败，请重试', 'error');
        return false;
    }
}

// 检查用户会话状态
async function checkUserSession() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
            console.error('获取会话失败:', error);
            return null;
        }

        if (session) {
            console.log('用户已登录:', session.user);
            return session.user;
        }

        return null;
    } catch (error) {
        console.error('检查会话异常:', error);
        return null;
    }
}

// 更新用户UI状态
function updateUserUI() {
    const guestUser = document.getElementById('user-guest');
    const loggedInUser = document.getElementById('user-logged-in');
    const userName = document.getElementById('user-name');
    const profileName = document.getElementById('profile-name');
    const profileEmail = document.getElementById('profile-email');

    if (currentUser && currentUser.email) {
        // 已登录用户
        guestUser.classList.add('hidden');
        loggedInUser.classList.remove('hidden');
        userName.textContent = currentUser.name || currentUser.email.split('@')[0];
        profileName.textContent = currentUser.name || currentUser.email.split('@')[0];
        profileEmail.textContent = currentUser.email;
    } else {
        // 游客用户
        guestUser.classList.remove('hidden');
        loggedInUser.classList.add('hidden');
        userName.textContent = '欢迎体验';
        profileName.textContent = '演示用户';
        profileEmail.textContent = 'demo@example.com';
    }
}

// 用户ID生成和管理（向后兼容）
function getUserId() {
    if (currentUser && currentUser.id) {
        return currentUser.id;
    }

    let userId = localStorage.getItem('tax_learning_user_id');
    if (!userId) {
        userId = 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
        localStorage.setItem('tax_learning_user_id', userId);
    }
    return userId;
}

// 显示登录/注册模态框
function showAuthModal(mode = 'login') {
    const modal = document.getElementById('auth-modal');
    if (modal) {
        // 设置模态框模式
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        const loginTab = document.getElementById('login-tab');
        const registerTab = document.getElementById('register-tab');

        if (mode === 'register') {
            loginForm.classList.add('hidden');
            registerForm.classList.remove('hidden');
            loginTab.classList.remove('active');
            registerTab.classList.add('active');
        } else {
            loginForm.classList.remove('hidden');
            registerForm.classList.add('hidden');
            loginTab.classList.add('active');
            registerTab.classList.remove('active');
        }

        modal.classList.remove('hidden');
    }
}

// 隐藏认证模态框
function hideAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// 切换认证模态框标签页
function switchAuthTab(mode) {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginTab = document.getElementById('login-tab');
    const registerTab = document.getElementById('register-tab');

    if (mode === 'register') {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        loginTab.classList.remove('active');
        registerTab.classList.add('active');
    } else {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
    }
}

// 处理登录表单提交
async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
        showToast('请填写完整信息', 'warning');
        return;
    }

    const success = await signIn(email, password);
    if (success) {
        hideAuthModal();
        // 重新初始化应用以加载用户数据
        setTimeout(() => {
            location.reload();
        }, 1000);
    }
}

// 处理注册表单提交
async function handleRegister(event) {
    event.preventDefault();

    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
    const name = document.getElementById('register-name').value;

    if (!email || !password || !confirmPassword || !name) {
        showToast('请填写完整信息', 'warning');
        return;
    }

    if (password !== confirmPassword) {
        showToast('两次密码输入不一致', 'warning');
        return;
    }

    if (password.length < 6) {
        showToast('密码长度至少6位', 'warning');
        return;
    }

    const success = await signUp(email, password, name);
    if (success) {
        // 注册成功后切换到登录页面
        switchAuthTab('login');
        showToast('注册成功！请登录', 'success');
    }
}

// 处理用户退出
async function handleSignOut() {
    const success = await signOut();
    if (success) {
        // 清除本地数据
        currentUser = null;
        allCards = [];
        userProgress = {};
        localStorage.removeItem('tax_learning_user_id');

        // 跳转到首页
        showScreen('home');
        setTimeout(() => {
            location.reload();
        }, 1000);
    }
}

// 初始化Supabase客户端
function initializeSupabase() {
    if (typeof supabase !== 'undefined') {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase客户端初始化成功');
    } else {
        console.error('Supabase库未加载');
        showToast('数据库连接失败', 'error');
    }
}

// 加载卡片数据
async function loadCardData() {
    try {
        // 首先加载静态数据
        const response = await fetch('data.json');
        if (!response.ok) {
            throw new Error('无法加载卡片数据');
        }
        allCards = await response.json();
        console.log('加载了', allCards.length, '张卡片');
        
        // 然后加载用户进度
        await loadUserProgress();
        
        // 合并数据和进度
        mergeDataWithProgress();
        
    } catch (error) {
        console.error('加载卡片数据失败:', error);
        showToast('加载卡片数据失败', 'error');
    }
}

// 加载用户进度
async function loadUserProgress() {
    if (!supabase || !currentUser) return;
    
    try {
        const { data, error } = await supabase
            .from('progress')
            .select('*')
            .eq('user_id', currentUser.id);
            
        if (error) {
            console.error('加载用户进度失败:', error);
            return;
        }
        
        // 转换为键值对格式
        userProgress = {};
        data.forEach(progress => {
            userProgress[progress.card_id] = progress;
        });
        
        console.log('加载了用户进度:', Object.keys(userProgress).length, '张卡片');
        
    } catch (error) {
        console.error('加载用户进度失败:', error);
    }
}

// 合并数据和进度
function mergeDataWithProgress() {
    allCards.forEach(card => {
        const progress = userProgress[card.id];
        if (progress) {
            card.level = progress.level;
            card.reviewDate = progress.review_date;
            card.lastUpdated = progress.last_updated;
        } else {
            // 新卡片，设置默认值
            card.level = 0;
            card.reviewDate = '2023-01-01';
            card.lastUpdated = null;
        }
    });
}

// 计算下次复习日期（间隔重复算法）
function calculateNextReviewDate(level) {
    const intervals = [1, 2, 4, 8, 16, 32, 64, 128]; // 天数
    const interval = intervals[Math.min(level, intervals.length - 1)];
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + interval);
    return nextDate.toISOString().split('T')[0];
}

// 保存进度到云端
async function saveProgress(cardId, level) {
    if (!supabase || !currentUser) return false;
    
    try {
        const reviewDate = calculateNextReviewDate(level);
        
        const { error } = await supabase
            .from('progress')
            .upsert({
                card_id: cardId,
                user_id: currentUser.id,
                level: level,
                review_date: reviewDate,
                last_updated: new Date().toISOString()
            }, {
                onConflict: 'card_id,user_id'
            });
            
        if (error) {
            console.error('保存进度失败:', error);
            return false;
        }
        
        // 更新本地数据
        userProgress[cardId] = {
            card_id: cardId,
            user_id: currentUser.id,
            level: level,
            review_date: reviewDate,
            last_updated: new Date().toISOString()
        };
        
        // 更新卡片数据
        const card = allCards.find(c => c.id === cardId);
        if (card) {
            card.level = level;
            card.reviewDate = reviewDate;
            card.lastUpdated = new Date().toISOString();
        }
        
        console.log('进度保存成功:', cardId, '等级:', level);
        return true;
        
    } catch (error) {
        console.error('保存进度失败:', error);
        return false;
    }
}

// 选择下一张卡片
function getNextCard() {
    const today = new Date().toISOString().split('T')[0];
    
    // 按复习日期排序
    const sortedCards = [...allCards].sort((a, b) => {
        const dateA = new Date(a.reviewDate);
        const dateB = new Date(b.reviewDate);
        return dateA - dateB;
    });
    
    // 找到第一张到期或已过的卡片
    const dueCard = sortedCards.find(card => new Date(card.reviewDate) <= new Date(today));
    
    return dueCard || sortedCards[0]; // 如果没有到期卡片，返回第一张
}

// 显示下一张卡片
function showNextCard() {
    currentCard = getNextCard();
    if (!currentCard) {
        showToast('没有可学习的卡片', 'info');
        return;
    }
    
    updateCardDisplay();
}

// 更新卡片显示
function updateCardDisplay() {
    if (!currentCard) return;
    
    const cardElement = document.getElementById('study-card');
    if (!cardElement) return;
    
    // 更新问题
    const questionElement = cardElement.querySelector('.card-question');
    if (questionElement) {
        questionElement.textContent = currentCard.question;
    }
    
    // 更新答案
    const answerElement = cardElement.querySelector('.card-answer');
    if (answerElement) {
        answerElement.textContent = currentCard.answer;
    }
    
    // 更新卡片信息
    const typeElement = cardElement.querySelector('.card-type');
    if (typeElement) {
        typeElement.textContent = currentCard.type || '问答';
    }
    
    const difficultyElement = cardElement.querySelector('.card-difficulty');
    if (difficultyElement) {
        difficultyElement.textContent = currentCard.difficulty || '初级';
    }
    
    // 重置卡片状态
    cardElement.classList.remove('flipped');
}

// 初始化应用
async function initializeApp() {
    console.log('税务师学习平台初始化中...');

    // 初始化Supabase
    initializeSupabase();

    // 检查用户会话状态
    const user = await checkUserSession();
    if (user) {
        currentUser = {
            id: user.id,
            email: user.email,
            name: user.user_metadata?.name || user.email?.split('@')[0] || '用户'
        };
        console.log('用户已登录:', currentUser);
    } else {
        // 使用匿名用户
        currentUser = {
            id: getUserId(),
            name: '游客用户'
        };
        console.log('使用匿名用户:', currentUser);
    }

    // 确保所有屏幕都是隐藏的
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => {
        screen.classList.add('hidden');
    });

    // 确保模态框是隐藏的
    const modal = document.getElementById('modal');
    if (modal) {
        modal.classList.add('hidden');
    }

    const authModal = document.getElementById('auth-modal');
    if (authModal) {
        authModal.classList.add('hidden');
    }
    
    // 显示主界面
    showScreen('home');
    
    // 初始化事件监听
    initializeEventListeners();
    
    // 加载数据
    await loadCardData();

    // 更新用户UI状态
    updateUserUI();

    console.log('应用初始化完成');
}

// 初始化事件监听
function initializeEventListeners() {
    // 模态框外部点击关闭
    const modal = document.getElementById('modal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                hideModal();
            }
        });
    }
    
    // 键盘快捷键
    document.addEventListener('keydown', function(e) {
        // ESC键关闭当前屏幕或模态框
        if (e.key === 'Escape') {
            if (!modal.classList.contains('hidden')) {
                hideModal();
            } else if (currentScreen !== 'home') {
                showScreen('home');
            }
        }
    });
}

// 显示指定屏幕
function showScreen(screenName) {
    console.log('切换到屏幕:', screenName);
    
    try {
        // 隐藏所有屏幕
        const screens = document.querySelectorAll('.screen');
        screens.forEach(screen => {
            screen.classList.add('hidden');
        });
        
        // 显示目标屏幕
        const targetScreen = document.getElementById(`${screenName}-screen`);
        if (targetScreen) {
            targetScreen.classList.remove('hidden');
            currentScreen = screenName;
            console.log('屏幕切换成功:', screenName);
        } else {
            console.error('未找到屏幕:', screenName);
            showToast('页面不存在', 'error');
        }
        
    } catch (error) {
        console.error('屏幕切换失败:', error);
        showToast('页面切换失败', 'error');
    }
}

// 快捷学习功能
function startNewLearning() {
    showScreen('new-learning');
}

function startReview() {
    showScreen('review');
}

// (旧的学习会话功能已被新的函数替代)

// 学习卡片功能
function flipCard() {
    const cardElement = document.getElementById('study-card');
    if (cardElement) {
        cardElement.classList.toggle('flipped');
    }
}

async function handleAnswer(isCorrect) {
    if (!currentCard) {
        showToast('没有当前学习的卡片', 'error');
        return;
    }
    
    let newLevel;
    if (isCorrect) {
        // 回答正确，提升等级
        newLevel = currentCard.level + 1;
        showToast('回答正确！继续加油！', 'success');
    } else {
        // 回答错误，重置为0级
        newLevel = 0;
        showToast('需要加强记忆，明天再复习吧！', 'warning');
    }
    
    // 保存进度
    const success = await saveProgress(currentCard.id, newLevel);
    if (success) {
        // 延迟一下再显示下一张卡片
        setTimeout(() => {
            showNextCard();
        }, 1500);
    } else {
        showToast('保存进度失败，请重试', 'error');
    }
}

// 开始学习会话
function startLearningSession() {
    if (allCards.length === 0) {
        showToast('没有可学习的卡片', 'error');
        return;
    }
    
    showToast('开始学习新卡片！', 'success');
    setTimeout(() => {
        showScreen('learning');
        showNextCard();
    }, 1000);
}

// 开始复习会话
function startReviewSession() {
    if (allCards.length === 0) {
        showToast('没有可复习的卡片', 'error');
        return;
    }
    
    showToast('开始复习卡片！', 'success');
    setTimeout(() => {
        showScreen('learning');
        showNextCard();
    }, 1000);
}

// 模态框功能
function showModal() {
    const modal = document.getElementById('modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function hideModal() {
    const modal = document.getElementById('modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initializeApp);

// 导出全局函数供HTML调用
window.showScreen = showScreen;
window.startNewLearning = startNewLearning;
window.startReview = startReview;
window.startLearningSession = startLearningSession;
window.startReviewSession = startReviewSession;
window.flipCard = flipCard;
window.handleAnswer = handleAnswer;
window.showModal = showModal;
window.hideModal = hideModal;
window.showToast = showToast;
window.showAuthModal = showAuthModal;
window.hideAuthModal = hideAuthModal;
window.switchAuthTab = switchAuthTab;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.handleSignOut = handleSignOut;
window.updateUserUI = updateUserUI;