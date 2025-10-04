// 税务学习平台前端脚本
class TaxLearningApp {
    constructor() {
        this.API_BASE_URL = 'http://localhost:9365/api';
        this.currentPage = 'learning';
        this.currentTopic = null;
        this.currentChapter = null;
        this.currentKnowledge = null;
        this.quizData = [];
        this.currentQuestionIndex = 0;
        this.userAnswers = [];
        this.learningProgress = this.loadProgress();

        this.init();
    }

    init() {
        this.bindEvents();
        this.checkConnection();
        this.loadTopics();
        this.updateConnectionStatus();
    }

    // 事件绑定
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
        // 更新导航状态
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-page="${page}"]`).classList.add('active');

        // 切换页面内容
        document.querySelectorAll('.page').forEach(p => {
            p.classList.remove('active');
        });
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
            const response = await fetch(`${this.API_BASE_URL}/knowledge/topics`);
            if (!response.ok) throw new Error('获取税种列表失败');

            const topics = await response.json();
            this.renderTopics(topics);
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
                <p>${topic.chapter_count} 个章节 • ${topic.point_count} 个知识点</p>
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

    // 加载税种章节
    async loadTopicChapters(topicName) {
        try {
            this.currentTopic = topicName;
            this.updateSyncStatus(true);

            const response = await fetch(`${this.API_BASE_URL}/knowledge/topic/${encodeURIComponent(topicName)}`);
            if (!response.ok) throw new Error('获取章节失败');

            const chapters = await response.json();
            this.renderChapters(chapters);
            this.showChapterContent();
            this.updateSyncStatus(false);
        } catch (error) {
            console.error('加载章节失败:', error);
            this.showError('加载章节失败');
            this.updateSyncStatus(false);
        }
    }

    renderChapters(chapters) {
        const knowledgeList = document.getElementById('knowledge-list');
        const chapterTitle = document.getElementById('chapter-title');
        if (!knowledgeList || !chapterTitle) return;

        chapterTitle.textContent = `${this.currentTopic} - 章节列表`;

        knowledgeList.innerHTML = chapters.map(chapter => `
            <div class="knowledge-item" data-chapter="${chapter.main_topic}">
                <h4>
                    <span>${chapter.main_topic}</span>
                    <div class="status">
                        <i class="fas fa-book-open"></i>
                        ${chapter.point_count} 个知识点
                    </div>
                </h4>
                <div class="preview">
                    ${chapter.description || `学习${chapter.main_topic}的相关知识`}
                </div>
            </div>
        `).join('');

        // 绑定点击事件
        knowledgeList.querySelectorAll('.knowledge-item').forEach(item => {
            item.addEventListener('click', () => {
                const chapter = item.dataset.chapter;
                this.loadChapterKnowledge(chapter);
            });
        });
    }

    // 加载章节知识点
    async loadChapterKnowledge(chapterName) {
        try {
            this.currentChapter = chapterName;
            this.updateSyncStatus(true);

            const response = await fetch(`${this.API_BASE_URL}/knowledge/${encodeURIComponent(this.currentTopic)}/${encodeURIComponent(chapterName)}`);
            if (!response.ok) throw new Error('获取知识点失败');

            const knowledgePoints = await response.json();
            this.renderKnowledgePoints(knowledgePoints);
            this.updateSyncStatus(false);
        } catch (error) {
            console.error('加载知识点失败:', error);
            this.showError('加载知识点失败');
            this.updateSyncStatus(false);
        }
    }

    renderKnowledgePoints(knowledgePoints) {
        const knowledgeList = document.getElementById('knowledge-list');
        const chapterTitle = document.getElementById('chapter-title');
        if (!knowledgeList || !chapterTitle) return;

        chapterTitle.textContent = `${this.currentTopic} - ${this.currentChapter}`;

        knowledgeList.innerHTML = knowledgePoints.map(point => {
            const progress = this.learningProgress[point._id] || { level: 0, learned: false };
            const statusClass = progress.learned ? 'learned' : '';
            const statusIcon = progress.learned ? 'fa-check-circle' : 'fa-circle';

            return `
                <div class="knowledge-item ${statusClass}" data-point-id="${point._id}">
                    <h4>
                        <span>${point.sub_topic}</span>
                        <div class="status ${statusClass}">
                            <i class="fas ${statusIcon}"></i>
                            ${progress.learned ? '已学' : '未学'}
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

    // 加载知识点详情
    async loadKnowledgeDetail(pointId) {
        try {
            this.updateSyncStatus(true);

            const response = await fetch(`${this.API_BASE_URL}/knowledge/point/${pointId}`);
            if (!response.ok) throw new Error('获取知识点详情失败');

            const knowledge = await response.json();
            this.currentKnowledge = knowledge;
            this.renderKnowledgeDetail(knowledge);
            this.showKnowledgeDetail();
            this.updateSyncStatus(false);
        } catch (error) {
            console.error('加载知识点详情失败:', error);
            this.showError('加载知识点详情失败');
            this.updateSyncStatus(false);
        }
    }

    renderKnowledgeDetail(knowledge) {
        const knowledgeTitle = document.getElementById('knowledge-title');
        const knowledgeContent = document.getElementById('knowledge-content');
        const keyPointsList = document.getElementById('key-points-list');

        if (!knowledgeTitle || !knowledgeContent || !keyPointsList) return;

        knowledgeTitle.textContent = knowledge.sub_topic;
        knowledgeContent.textContent = knowledge.content;

        keyPointsList.innerHTML = knowledge.key_points.map(point =>
            `<li>${point}</li>`
        ).join('');

        // 更新按钮状态
        const progress = this.learningProgress[knowledge._id] || { level: 0, learned: false };
        const markLearnedBtn = document.getElementById('mark-learned-btn');
        if (markLearnedBtn) {
            if (progress.learned) {
                markLearnedBtn.innerHTML = '<i class="fas fa-check-double"></i> 已学习';
                markLearnedBtn.classList.add('btn-secondary');
                markLearnedBtn.classList.remove('btn-primary');
            } else {
                markLearnedBtn.innerHTML = '<i class="fas fa-check"></i> 标记已学';
                markLearnedBtn.classList.add('btn-primary');
                markLearnedBtn.classList.remove('btn-secondary');
            }
        }
    }

    // 页面显示切换
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

    showKnowledgeDetail() {
        document.querySelector('.topic-selection').style.display = 'none';
        document.querySelector('.chapter-content').style.display = 'none';
        document.querySelector('.knowledge-detail').style.display = 'block';
    }

    // 练习功能
    async startQuiz() {
        if (!this.currentKnowledge) return;

        try {
            this.updateSyncStatus(true);

            const response = await fetch(`${this.API_BASE_URL}/knowledge/point/${this.currentKnowledge._id}/quizzes`);
            if (!response.ok) throw new Error('获取练习题失败');

            const quizzes = await response.json();
            if (quizzes.length === 0) {
                this.showMessage('该知识点暂无练习题');
                this.updateSyncStatus(false);
                return;
            }

            this.quizData = quizzes;
            this.currentQuestionIndex = 0;
            this.userAnswers = [];

            this.switchPage('quiz');
            this.showQuestion();
            this.updateSyncStatus(false);
        } catch (error) {
            console.error('开始练习失败:', error);
            this.showError('开始练习失败');
            this.updateSyncStatus(false);
        }
    }

    showQuestion() {
        if (this.currentQuestionIndex >= this.quizData.length) {
            this.showQuizResults();
            return;
        }

        const question = this.quizData[this.currentQuestionIndex];
        const quizContent = document.getElementById('quiz-content');
        const questionCounter = document.getElementById('question-counter');
        const correctRate = document.getElementById('correct-rate');

        if (!quizContent) return;

        // 更新统计信息
        questionCounter.textContent = `${this.currentQuestionIndex + 1} / ${this.quizData.length}`;

        const correctCount = this.userAnswers.filter((answer, index) =>
            answer === this.quizData[index].correct_answer
        ).length;
        const rate = this.userAnswers.length > 0 ? Math.round((correctCount / this.userAnswers.length) * 100) : 0;
        correctRate.textContent = `正确率: ${rate}%`;

        // 渲染题目
        quizContent.innerHTML = `
            <div class="question-item">
                <div class="question-text">${question.question_text}</div>
                <div class="options-list">
                    ${question.options.map((option, index) => `
                        <div class="option-item" data-option="${index}">
                            <div class="option-indicator">${String.fromCharCode(65 + index)}</div>
                            <div class="option-text">${option}</div>
                        </div>
                    `).join('')}
                </div>
                ${question.explanation ? `
                    <div class="question-feedback" style="display: none;" id="feedback-${this.currentQuestionIndex}">
                        <h5><i class="fas fa-lightbulb"></i> 解析</h5>
                        <p>${question.explanation}</p>
                    </div>
                ` : ''}
            </div>
            <div class="quiz-navigation">
                <button class="btn btn-secondary" onclick="app.previousQuestion()" ${this.currentQuestionIndex === 0 ? 'disabled' : ''}>
                    <i class="fas fa-arrow-left"></i>
                    上一题
                </button>
                <button class="btn btn-primary" onclick="app.nextQuestion()" id="next-btn">
                    下一题
                    <i class="fas fa-arrow-right"></i>
                </button>
            </div>
        `;

        // 绑定选项点击事件
        quizContent.querySelectorAll('.option-item').forEach(option => {
            option.addEventListener('click', () => {
                this.selectOption(parseInt(option.dataset.option));
            });
        });
    }

    selectOption(optionIndex) {
        // 清除之前的选择
        document.querySelectorAll('.option-item').forEach(item => {
            item.classList.remove('selected');
        });

        // 选中当前选项
        const selectedOption = document.querySelector(`[data-option="${optionIndex}"]`);
        selectedOption.classList.add('selected');

        // 保存答案
        this.userAnswers[this.currentQuestionIndex] = optionIndex;

        // 显示反馈
        this.showFeedback();

        // 更新按钮文本
        const nextBtn = document.getElementById('next-btn');
        if (nextBtn) {
            if (this.currentQuestionIndex === this.quizData.length - 1) {
                nextBtn.innerHTML = '完成练习 <i class="fas fa-check"></i>';
            } else {
                nextBtn.innerHTML = '下一题 <i class="fas fa-arrow-right"></i>';
            }
        }
    }

    showFeedback() {
        const question = this.quizData[this.currentQuestionIndex];
        const userAnswer = this.userAnswers[this.currentQuestionIndex];

        if (userAnswer === undefined) return;

        const options = document.querySelectorAll('.option-item');
        const feedback = document.getElementById(`feedback-${this.currentQuestionIndex}`);

        // 标记正确和错误答案
        options.forEach((option, index) => {
            if (index === question.correct_answer) {
                option.classList.add('correct');
            } else if (index === userAnswer && userAnswer !== question.correct_answer) {
                option.classList.add('incorrect');
            }
        });

        // 显示解析
        if (feedback && question.explanation) {
            feedback.style.display = 'block';
        }
    }

    nextQuestion() {
        if (this.userAnswers[this.currentQuestionIndex] === undefined) {
            this.showMessage('请先选择一个答案');
            return;
        }

        this.currentQuestionIndex++;
        this.showQuestion();
    }

    previousQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.showQuestion();
        }
    }

    showQuizResults() {
        const quizContent = document.getElementById('quiz-content');
        if (!quizContent) return;

        const correctCount = this.userAnswers.filter((answer, index) =>
            answer === this.quizData[index].correct_answer
        ).length;
        const totalCount = this.quizData.length;
        const correctRate = Math.round((correctCount / totalCount) * 100);

        quizContent.innerHTML = `
            <div class="quiz-results">
                <h3>练习完成！</h3>
                <div class="results-stats">
                    <div class="stat-item">
                        <div class="stat-value">${correctCount}</div>
                        <div class="stat-label">答对题数</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${totalCount}</div>
                        <div class="stat-label">总题数</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${correctRate}%</div>
                        <div class="stat-label">正确率</div>
                    </div>
                </div>
                <div class="action-buttons">
                    <button class="btn btn-primary" onclick="app.startQuiz()">
                        <i class="fas fa-redo"></i>
                        重新练习
                    </button>
                    <button class="btn btn-secondary" onclick="app.switchPage('learning')">
                        <i class="fas fa-arrow-left"></i>
                        返回学习
                    </button>
                </div>
            </div>
        `;
    }

    // 标记已学习
    markAsLearned() {
        if (!this.currentKnowledge) return;

        const pointId = this.currentKnowledge._id;
        if (!this.learningProgress[pointId]) {
            this.learningProgress[pointId] = { level: 0, learned: false };
        }

        this.learningProgress[pointId].learned = true;
        this.learningProgress[pointId].lastUpdated = new Date().toISOString();

        this.saveProgress();
        this.renderKnowledgeDetail(this.currentKnowledge);

        // 更新列表中的状态
        const item = document.querySelector(`[data-point-id="${pointId}"]`);
        if (item) {
            item.classList.add('learned');
            const status = item.querySelector('.status');
            if (status) {
                status.classList.add('learned');
                status.innerHTML = '<i class="fas fa-check-circle"></i> 已学';
            }
        }

        this.showMessage('已标记为学习完成');
    }

    // 进度管理
    loadProgress() {
        try {
            const saved = localStorage.getItem('taxLearningProgress');
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            console.error('加载进度失败:', error);
            return {};
        }
    }

    saveProgress() {
        try {
            localStorage.setItem('taxLearningProgress', JSON.stringify(this.learningProgress));
        } catch (error) {
            console.error('保存进度失败:', error);
        }
    }

    // 进度页面
    initQuizPage() {
        const quizContent = document.getElementById('quiz-content');
        if (quizContent) {
            quizContent.innerHTML = `
                <div class="loading">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>请先在学习页面选择知识点开始练习</p>
                </div>
            `;
        }
    }

    loadProgressPage() {
        const progressList = document.getElementById('progress-list');
        const totalHours = document.querySelector('.progress-value');
        const completedPoints = document.querySelectorAll('.progress-value')[1];
        const accuracyRate = document.querySelectorAll('.progress-value')[2];

        if (!progressList) return;

        // 计算统计数据
        const totalPoints = Object.keys(this.learningProgress).length;
        const learnedPoints = Object.values(this.learningProgress).filter(p => p.learned).length;
        const learningRate = totalPoints > 0 ? Math.round((learnedPoints / totalPoints) * 100) : 0;

        // 更新统计卡片
        if (totalHours) totalHours.textContent = '0 小时'; // TODO: 计算实际学习时长
        if (completedPoints) completedPoints.textContent = `${learnedPoints} / ${totalPoints}`;
        if (accuracyRate) accuracyRate.textContent = `${learningRate}%`;

        // 生成进度列表
        const topicProgress = {};
        Object.entries(this.learningProgress).forEach(([pointId, progress]) => {
            // TODO: 根据pointId获取对应的topic信息
            const topic = '未分类'; // 临时显示
            if (!topicProgress[topic]) {
                topicProgress[topic] = { total: 0, learned: 0 };
            }
            topicProgress[topic].total++;
            if (progress.learned) {
                topicProgress[topic].learned++;
            }
        });

        progressList.innerHTML = Object.entries(topicProgress).map(([topic, stats]) => {
            const progressPercent = stats.total > 0 ? Math.round((stats.learned / stats.total) * 100) : 0;
            return `
                <div class="progress-item">
                    <span class="topic-name">${topic}</span>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progressPercent}%"></div>
                    </div>
                    <span class="progress-text">${progressPercent}%</span>
                </div>
            `;
        }).join('');
    }

    // 工具方法
    showError(message) {
        this.showMessage(message, 'error');
    }

    showMessage(message, type = 'info') {
        // 创建消息元素
        const messageDiv = document.createElement('div');
        messageDiv.className = type;
        messageDiv.innerHTML = `
            <h4><i class="fas fa-${type === 'error' ? 'exclamation-triangle' : 'info-circle'}"></i> 提示</h4>
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
}

// 初始化应用
const app = new TaxLearningApp();