// 税务师考试学习系统 - 主脚本

// 应用状态管理
class TaxQuizApp {
    constructor() {
        this.currentCard = null;
        this.cards = [];
        this.userId = null;
        this.db = null;
        this.isFlipped = false;
        this.reviewIntervals = [1, 2, 4, 8, 16, 32, 64, 128]; // 间隔重复算法的时间间隔（天）
        this.searchResults = [];
        this.isSearchMode = false;
        this.typeInSubmitted = false;
        
        this.init();
        
        // 初始化搜索功能
        this.initSearch();
    }

    // 初始化应用
    async init() {
        try {
            console.log('开始初始化应用...');
            await this.initDatabase();
            console.log('数据库初始化完成');
            await this.initUser();
            console.log('用户初始化完成');
            await this.loadData();
            console.log('数据加载完成');
            this.updateUI();
            console.log('UI更新完成');
            console.log('最终卡片数组长度:', this.cards.length);
            console.log('最终卡片数组内容:', this.cards);
            this.showNextCard();
            console.log('第一张卡片显示完成');
            this.showToast('应用初始化成功', 'success');
        } catch (error) {
            console.error('初始化失败:', error);
            console.error('错误详情:', error.message, error.stack);
            this.showToast('应用初始化失败: ' + error.message, 'error');
        }
    }

    // 初始化 IndexedDB
    async initDatabase() {
        try {
            return await this.initDatabaseV2();
        } catch (error) {
            console.log('版本2初始化失败，尝试版本1:', error);
            try {
                return await this.initDatabaseV1();
            } catch (error2) {
                console.log('版本1也失败，尝试清理后重试:', error2);
                return await this.initDatabaseWithCleanup();
            }
        }
    }

    // 版本2数据库初始化（包含images表）
    async initDatabaseV2() {
        return new Promise((resolve, reject) => {
            console.log('尝试初始化数据库版本2');
            const request = indexedDB.open('TaxQuizDB', 2);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                console.log('数据库版本2初始化成功');
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                console.log('升级数据库到版本2');
                this.createDatabaseSchema(event.target.result);
            };
        });
    }

    // 版本1数据库初始化（兼容旧版本）
    async initDatabaseV1() {
        return new Promise((resolve, reject) => {
            console.log('尝试初始化数据库版本1');
            const request = indexedDB.open('TaxQuizDB', 1);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                console.log('数据库版本1初始化成功');
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                console.log('创建数据库版本1');
                this.createDatabaseSchemaV1(event.target.result);
            };
        });
    }

    // 清理后重新初始化
    async initDatabaseWithCleanup() {
        return new Promise((resolve, reject) => {
            console.log('清理旧数据库并重新创建');
            const deleteRequest = indexedDB.deleteDatabase('TaxQuizDB');
            
            deleteRequest.onsuccess = () => {
                console.log('旧数据库已删除，创建新数据库');
                setTimeout(() => {
                    this.initDatabaseV2().then(resolve).catch(reject);
                }, 100);
            };
            
            deleteRequest.onerror = () => reject(deleteRequest.error);
        });
    }

    // 创建完整的数据库架构（版本2）
    createDatabaseSchema(db) {
        // 创建卡片存储
        if (!db.objectStoreNames.contains('cards')) {
            const cardStore = db.createObjectStore('cards', { keyPath: 'id' });
            cardStore.createIndex('question', 'question', { unique: false });
            cardStore.createIndex('category', 'category', { unique: false });
            cardStore.createIndex('cardType', 'cardType', { unique: false });
        }
        
        // 创建图片存储
        if (!db.objectStoreNames.contains('images')) {
            const imageStore = db.createObjectStore('images', { keyPath: 'id', autoIncrement: true });
            imageStore.createIndex('cardId', 'cardId', { unique: false });
        }
        
        // 创建进度存储
        if (!db.objectStoreNames.contains('progress')) {
            const progressStore = db.createObjectStore('progress', { keyPath: ['cardId', 'userId'] });
            progressStore.createIndex('userId', 'userId', { unique: false });
            progressStore.createIndex('reviewDate', 'reviewDate', { unique: false });
        }
        
        // 创建卡组存储
        if (!db.objectStoreNames.contains('decks')) {
            const deckStore = db.createObjectStore('decks', { keyPath: 'id', autoIncrement: true });
            deckStore.createIndex('name', 'name', { unique: false });
        }
    }

    // 创建基础数据库架构（版本1）
    createDatabaseSchemaV1(db) {
        // 创建卡片存储
        if (!db.objectStoreNames.contains('cards')) {
            const cardStore = db.createObjectStore('cards', { keyPath: 'id' });
            cardStore.createIndex('question', 'question', { unique: false });
            cardStore.createIndex('category', 'category', { unique: false });
            cardStore.createIndex('cardType', 'cardType', { unique: false });
        }
        
        // 创建进度存储
        if (!db.objectStoreNames.contains('progress')) {
            const progressStore = db.createObjectStore('progress', { keyPath: ['cardId', 'userId'] });
            progressStore.createIndex('userId', 'userId', { unique: false });
            progressStore.createIndex('reviewDate', 'reviewDate', { unique: false });
        }
        
        // 创建卡组存储
        if (!db.objectStoreNames.contains('decks')) {
            const deckStore = db.createObjectStore('decks', { keyPath: 'id', autoIncrement: true });
            deckStore.createIndex('name', 'name', { unique: false });
        }
    }

    
    // 初始化用户（本地）
    async initUser() {
        let userId = localStorage.getItem('taxQuizUserId');
        if (!userId) {
            userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('taxQuizUserId', userId);
        }
        this.userId = userId;
        document.getElementById('userInfo').textContent = `用户ID: ${userId.substr(0, 8)}...`;
    }

    // 数据库操作封装
    async dbOperation(storeName, mode, operation) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], mode);
            const store = transaction.objectStore(storeName);
            const request = operation(store);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // 添加或更新卡片
    async saveCard(card) {
        return this.dbOperation('cards', 'readwrite', store => store.put(card));
    }

    // 获取所有卡片
    async getAllCards() {
        return this.dbOperation('cards', 'readonly', store => store.getAll());
    }

    // 删除卡片
    async deleteCard(cardId) {
        return this.dbOperation('cards', 'readwrite', store => store.delete(cardId));
    }

    // 保存学习进度
    async saveProgress(cardId, progress) {
        const fullProgress = {
            cardId: cardId,
            userId: this.userId,
            ...progress,
            lastUpdated: new Date().toISOString()
        };
        return this.dbOperation('progress', 'readwrite', store => store.put(fullProgress));
    }

    // 获取学习进度
    async getProgress(cardId) {
        try {
            return this.dbOperation('progress', 'readonly', store => store.get([cardId, this.userId]));
        } catch (error) {
            return null; // 如果没有进度记录，返回null
        }
    }

    // 获取用户所有进度
    async getAllProgress() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['progress'], 'readonly');
            const store = transaction.objectStore('progress');
            const index = store.index('userId');
            const request = index.getAll(this.userId);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // 获取所有图片
    async getAllImages() {
        return this.dbOperation('images', 'readonly', store => store.getAll());
    }

    // 加载数据
    async loadData() {
        try {
            console.log('开始加载数据...');
            console.log('数据库连接状态:', this.db ? '已连接' : '未连接');
            
            // 加载所有卡片
            this.cards = await this.getAllCards();
            console.log('从数据库加载的卡片数量:', this.cards.length);
            
            // 如果没有卡片，加载示例数据
            if (this.cards.length === 0) {
                console.log('数据库中没有卡片数据，加载示例数据...');
                await this.loadSampleData();
                this.cards = await this.getAllCards();
                console.log('示例数据加载完成，卡片数量:', this.cards.length);
            }
            
            console.log('卡片数据示例:', this.cards[0]);
            
            // 加载用户进度
            const progressList = await this.getAllProgress();
            console.log('用户进度数量:', progressList.length);
            
            const progressMap = {};
            progressList.forEach(progress => {
                progressMap[progress.cardId] = progress;
            });
            
            // 合并卡片数据和学习进度
            this.cards = this.cards.map(card => ({
                ...card,
                progress: progressMap[card.id] || {
                    level: 0,
                    reviewDate: new Date().toISOString().split('T')[0],
                    lastUpdated: new Date().toISOString()
                }
            }));
            
            console.log('数据合并完成，最终卡片数量:', this.cards.length);
            console.log('第一张卡片合并后:', this.cards[0]);
            
        } catch (error) {
            console.error('加载数据失败:', error);
            console.error('错误堆栈:', error.stack);
            throw error;
        }
    }

    // 加载示例数据
    async loadSampleData() {
        try {
            // 尝试从sample-data.json文件加载
            const response = await fetch('sample-data.json');
            if (response.ok) {
                const data = await response.json();
                if (data.cards && Array.isArray(data.cards)) {
                    console.log('从sample-data.json加载了', data.cards.length, '张卡片');
                    for (const card of data.cards) {
                        await this.saveCard(card);
                    }
                    return;
                }
            }
        } catch (error) {
            console.log('无法从文件加载示例数据，使用内置数据:', error);
        }
        
        // 如果文件加载失败，使用内置的备选数据
        const sampleCards = [
            {
                id: 1,
                question: "增值税的基本税率是多少？",
                answer: "增值税的基本税率为13%。适用于一般纳税人销售货物、提供劳务、有形动产租赁服务。",
                category: "增值税",
                difficulty: "基础",
                cardType: "qa"
            },
            {
                id: 2,
                question: "增值税的___税率是多少？",
                answer: "13%",
                category: "增值税",
                difficulty: "基础",
                cardType: "fill_in_blank"
            },
            {
                id: 3,
                question: "请输入增值税的基本税率：",
                answer: "13%",
                category: "增值税",
                difficulty: "基础",
                cardType: "type_in"
            },
            {
                id: 4,
                question: "增值税的基本税率是：",
                answer: "13%",
                category: "增值税",
                difficulty: "基础",
                cardType: "mcq",
                options: ["6%", "9%", "13%", "16%"],
                correctAnswer: 2
            },
            {
                id: 5,
                question: "企业所得税的税率是多少？",
                answer: "企业所得税的基本税率为25%。符合条件的小型微利企业可享受20%的优惠税率。",
                category: "企业所得税",
                difficulty: "基础",
                cardType: "qa"
            }
        ];

        console.log('使用内置示例数据，加载了', sampleCards.length, '张卡片');
        for (const card of sampleCards) {
            await this.saveCard(card);
        }
    }

    // 计算下次复习日期
    calculateNextReviewDate(currentLevel, isCorrect) {
        if (!isCorrect) {
            // 回答错误，重置到第一天
            return this.addDays(new Date(), 1);
        }
        
        const nextLevel = Math.min(currentLevel + 1, this.reviewIntervals.length - 1);
        const daysToAdd = this.reviewIntervals[nextLevel];
        return this.addDays(new Date(), daysToAdd);
    }

    // 日期工具函数
    addDays(date, days) {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }

    formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    // 获取今天需要复习的卡片
    getTodayCards() {
        const today = this.formatDate(new Date());
        return this.cards.filter(card => 
            new Date(card.progress.reviewDate) <= new Date(today)
        ).sort((a, b) => new Date(a.progress.reviewDate) - new Date(b.progress.reviewDate));
    }

    // 显示下一张卡片
    showNextCard() {
        console.log('showNextCard 被调用，卡片总数:', this.cards.length);
        
        const todayCards = this.getTodayCards();
        console.log('今日待复习卡片数:', todayCards.length);
        
        if (todayCards.length === 0) {
            this.currentCard = this.cards[0]; // 如果没有待复习的卡片，显示第一张
            console.log('没有待复习卡片，选择第一张卡片:', this.currentCard);
        } else {
            this.currentCard = todayCards[0];
            console.log('选择今日待复习卡片:', this.currentCard);
        }
        
        if (this.currentCard) {
            console.log('准备显示卡片:', this.currentCard);
            this.displayCard();
            this.resetCardFlip();
        } else {
            console.log('没有可显示的卡片');
        }
    }

    // 翻转卡片
    flipCard() {
        this.isFlipped = !this.isFlipped;
        const cardInner = document.getElementById('cardInner');
        cardInner.classList.toggle('flipped', this.isFlipped);
    }

    // 重置卡片翻转状态
    resetCardFlip() {
        this.isFlipped = false;
        const cardInner = document.getElementById('cardInner');
        cardInner.classList.remove('flipped');
    }

    // 处理答题
    async handleAnswer(isCorrect) {
        if (!this.currentCard) return;
        
        const newLevel = isCorrect ? 
            Math.min(this.currentCard.progress.level + 1, this.reviewIntervals.length - 1) : 
            0;
        
        const nextReviewDate = this.calculateNextReviewDate(this.currentCard.progress.level, isCorrect);
        
        // 更新进度
        const updatedProgress = {
            level: newLevel,
            reviewDate: this.formatDate(nextReviewDate),
            lastUpdated: new Date().toISOString()
        };
        
        await this.saveProgress(this.currentCard.id, updatedProgress);
        
        // 更新本地数据
        this.currentCard.progress = updatedProgress;
        
        // 显示反馈
        this.showToast(isCorrect ? '回答正确！' : '需要加强记忆', isCorrect ? 'success' : 'warning');
        
        // 显示下一张卡片
        setTimeout(() => {
            this.showNextCard();
        }, 1000);
    }

    // 更新UI统计信息
    updateUI() {
        const todayCards = this.getTodayCards();
        const masteredCards = this.cards.filter(card => card.progress.level >= 5).length;
        const learningCards = this.cards.filter(card => card.progress.level > 0 && card.progress.level < 5).length;
        
        document.getElementById('todayCount').textContent = todayCards.length;
        document.getElementById('totalProgress').textContent = 
            Math.round((masteredCards / this.cards.length) * 100) || 0;
        document.getElementById('totalCards').textContent = this.cards.length;
        document.getElementById('masteredCards').textContent = masteredCards;
        document.getElementById('learningCards').textContent = learningCards;
    }

    // 导入数据
    async importData() {
        const input = document.getElementById('fileInput');
        input.click();
    }

    // 处理文件导入
    async handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            if (data.cards && Array.isArray(data.cards)) {
                // 清空现有卡片
                const allCards = await this.getAllCards();
                for (const card of allCards) {
                    await this.deleteCard(card.id);
                    await this.deleteCardImage(card.id); // 删除相关图片
                }
                
                // 导入新卡片
                for (const card of data.cards) {
                    await this.saveCard(card);
                }
                
                // 导入图片（如果有）
                if (data.images && Array.isArray(data.images)) {
                    for (const image of data.images) {
                        await this.dbOperation('images', 'readwrite', store => store.add(image));
                    }
                }
                
                // 重新加载数据
                await this.loadData();
                this.updateUI();
                this.showNextCard();
                
                const imageCount = data.images ? data.images.length : 0;
                this.showToast(`成功导入 ${data.cards.length} 张卡片和 ${imageCount} 张图片`, 'success');
            } else {
                throw new Error('无效的数据格式');
            }
        } catch (error) {
            this.showToast('导入失败: ' + error.message, 'error');
        }
        
        // 清空文件输入
        event.target.value = '';
    }

    // 导出数据
    async exportData() {
        try {
            const cards = await this.getAllCards();
            const progress = await this.getAllProgress();
            const images = await this.getAllImages();
            
            const exportData = {
                cards: cards,
                progress: progress,
                images: images,
                exportDate: new Date().toISOString(),
                version: '2.0'
            };
            
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `tax-quiz-export-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showToast('数据导出成功', 'success');
        } catch (error) {
            this.showToast('导出失败: ' + error.message, 'error');
        }
    }

    // 清空数据
    async clearData() {
        if (!confirm('确定要清空所有数据吗？此操作不可恢复！')) {
            return;
        }
        
        try {
            // 清空卡片
            const allCards = await this.getAllCards();
            for (const card of allCards) {
                await this.deleteCard(card.id);
            }
            
            // 清空图片
            const allImages = await this.getAllImages();
            for (const image of allImages) {
                await this.dbOperation('images', 'readwrite', store => store.delete(image.id));
            }
            
            // 清空进度
            const allProgress = await this.getAllProgress();
            for (const progress of allProgress) {
                await this.dbOperation('progress', 'readwrite', store => 
                    store.delete([progress.cardId, progress.userId])
                );
            }
            
            // 重新加载示例数据
            await this.loadSampleData();
            await this.loadData();
            this.updateUI();
            this.showNextCard();
            
            this.showToast('数据已清空并重置为示例数据', 'success');
        } catch (error) {
            this.showToast('清空数据失败: ' + error.message, 'error');
        }
    }

    // 显示提示信息
    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // 初始化搜索功能
    initSearch() {
        const searchInput = document.getElementById('searchInput');
        let searchTimeout;

        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim();
            
            if (query.length === 0) {
                this.closeSearchResults();
                return;
            }

            searchTimeout = setTimeout(() => {
                this.performSearch(query);
            }, 300);
        });

        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = e.target.value.trim();
                if (query) {
                    this.performSearch(query);
                }
            }
        });
    }

    // 执行搜索
    async performSearch(query) {
        try {
            const allCards = await this.getAllCards();
            const results = allCards.filter(card => {
                const searchText = `${card.question} ${card.answer} ${card.category || ''}`.toLowerCase();
                return searchText.includes(query.toLowerCase());
            });

            this.displaySearchResults(results, query);
        } catch (error) {
            console.error('搜索失败:', error);
            this.showToast('搜索失败', 'error');
        }
    }

    // 显示搜索结果
    displaySearchResults(results, query) {
        const searchResults = document.getElementById('searchResults');
        const searchList = document.getElementById('searchList');
        
        if (results.length === 0) {
            searchList.innerHTML = `
                <div class="search-item">
                    <p>没有找到包含 "${query}" 的题目</p>
                </div>
            `;
        } else {
            searchList.innerHTML = results.map(card => `
                <div class="search-item" onclick="app.selectCardFromSearch(${card.id})">
                    <h4>${this.escapeHtml(card.question)}</h4>
                    <p>${this.escapeHtml(card.answer.substring(0, 100))}...</p>
                    <div class="meta">
                        <span>题目 #${card.id}</span>
                        <span>${this.getCardTypeLabel(card.cardType || 'qa')}</span>
                        ${card.category ? `<span>${card.category}</span>` : ''}
                    </div>
                </div>
            `).join('');
        }

        searchResults.style.display = 'block';
        this.searchResults = results;
        this.isSearchMode = true;
    }

    // 从搜索结果中选择卡片
    selectCardFromSearch(cardId) {
        const card = this.cards.find(c => c.id === cardId);
        if (card) {
            this.currentCard = card;
            this.displayCard();
            this.resetCardFlip();
            this.closeSearchResults();
            this.showToast('已选择题目 #' + cardId, 'success');
        }
    }

    // 关闭搜索结果
    closeSearchResults() {
        const searchResults = document.getElementById('searchResults');
        const searchInput = document.getElementById('searchInput');
        
        searchResults.style.display = 'none';
        searchInput.value = '';
        this.searchResults = [];
        this.isSearchMode = false;
    }

    // 获取卡片类型标签
    getCardTypeLabel(cardType) {
        const typeLabels = {
            'qa': '问答',
            'fill_in_blank': '填空',
            'type_in': '输入',
            'mcq': '选择'
        };
        return typeLabels[cardType] || '问答';
    }

    // HTML转义
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 渲染填空题
    renderFillInTheBlank(question, answer) {
        // 处理 {{c1::答案}} 格式
        let processedQuestion = question.replace(/\{\{c(\d+)::([^}]+)\}\}/g, (match, index, blankAnswer) => {
            return `<span class="blank-space" data-answer="${blankAnswer}">_________</span>`;
        });
        
        // 处理 ___ 格式
        processedQuestion = processedQuestion.replace(/___+/g, '<span class="blank-space">_________</span>');
        
        return marked(processedQuestion);
    }

    // 渲染输入题
    renderTypeInCard(card) {
        document.getElementById('typeInputContainer').style.display = 'flex';
        document.getElementById('flipBtn').style.display = 'none';
        document.getElementById('typeAnswerInput').value = '';
        document.getElementById('typeAnswerInput').focus();
        this.typeInSubmitted = false;
    }

    // 提交输入题答案
    submitTypeAnswer() {
        if (!this.currentCard || this.typeInSubmitted) return;
        
        const userAnswer = document.getElementById('typeAnswerInput').value.trim();
        const correctAnswer = this.currentCard.answer.trim();
        const isCorrect = userAnswer.toLowerCase() === correctAnswer.toLowerCase();
        
        this.typeInSubmitted = true;
        
        // 显示反馈
        document.getElementById('yourAnswer').innerHTML = `你的答案: <strong>${this.escapeHtml(userAnswer)}</strong>`;
        document.getElementById('correctAnswer').innerHTML = `正确答案: <strong>${this.escapeHtml(correctAnswer)}</strong>`;
        document.getElementById('typeFeedback').style.display = 'block';
        
        // 自动翻转到背面
        setTimeout(() => {
            this.flipCard();
        }, 500);
        
        // 自动处理结果
        setTimeout(() => {
            this.handleAnswer(isCorrect);
        }, 3000);
    }

    // 重置输入题状态
    resetTypeInState() {
        document.getElementById('typeInputContainer').style.display = 'none';
        document.getElementById('flipBtn').style.display = 'block';
        document.getElementById('typeFeedback').style.display = 'none';
        document.getElementById('typeAnswerInput').value = '';
        this.typeInSubmitted = false;
    }

    // 渲染选择题
    renderMultipleChoice(card) {
        // 如果有options字段，显示选择题界面
        if (card.options && Array.isArray(card.options)) {
            const questionElement = document.getElementById('questionText');
            const optionsHtml = card.options.map((option, index) => `
                <div class="mcq-option" onclick="app.selectMCQOption(${index})">
                    <input type="radio" name="mcq" value="${index}" id="option${index}">
                    <label for="option${index}">${this.escapeHtml(option)}</label>
                </div>
            `).join('');
            
            questionElement.innerHTML = marked(card.question) + '<div class="mcq-options">' + optionsHtml + '</div>';
        } else {
            // 如果没有options，降级为普通问答
            this.renderQACard(card);
        }
    }

    // 选择选择题选项
    selectMCQOption(index) {
        const selectedOption = document.querySelector(`input[name="mcq"][value="${index}"]`);
        if (selectedOption) {
            selectedOption.checked = true;
            
            // 检查答案
            const card = this.currentCard;
            const correctIndex = card.correctAnswer !== undefined ? card.correctAnswer : 0;
            const isCorrect = index === correctIndex;
            
            // 显示反馈
            this.showToast(isCorrect ? '回答正确！' : '回答错误', isCorrect ? 'success' : 'error');
            
            // 自动处理结果
            setTimeout(() => {
                this.handleAnswer(isCorrect);
            }, 1500);
        }
    }

    // 渲染问答卡片
    renderQACard(card) {
        console.log('renderQACard 被调用，卡片问题:', card.question);
        console.log('marked库是否可用:', typeof marked);
        
        try {
            const questionElement = document.getElementById('questionText');
            const answerElement = document.getElementById('answerText');
            
            if (questionElement) {
                questionElement.innerHTML = marked(card.question);
                console.log('问题文本设置完成');
            } else {
                console.log('问题元素未找到');
            }
            
            if (answerElement) {
                answerElement.innerHTML = marked(card.answer);
                console.log('答案文本设置完成');
            } else {
                console.log('答案元素未找到');
            }
        } catch (error) {
            console.error('渲染问答卡片时出错:', error);
        }
    }

    // 根据卡片类型渲染不同的界面
    renderCardByType(card) {
        console.log('renderCardByType 被调用，卡片:', card);
        
        // 重置所有特殊界面
        this.resetTypeInState();
        
        // 更新卡片类型显示
        const cardType = card.cardType || 'qa';
        const typeLabel = this.getCardTypeLabel(cardType);
        
        const cardTypeElement = document.getElementById('cardType');
        const cardTypeBackElement = document.getElementById('cardTypeBack');
        
        if (cardTypeElement) cardTypeElement.textContent = typeLabel;
        if (cardTypeBackElement) cardTypeBackElement.textContent = typeLabel;
        
        console.log('卡片类型:', cardType, '标签:', typeLabel);
        
        try {
            const questionElement = document.getElementById('questionText');
            const answerElement = document.getElementById('answerText');
            
            console.log('问题元素存在:', !!questionElement);
            console.log('答案元素存在:', !!answerElement);
            
            switch (cardType) {
                case 'fill_in_blank':
                    console.log('渲染填空题');
                    if (questionElement) questionElement.innerHTML = this.renderFillInTheBlank(card.question, card.answer);
                    if (answerElement) answerElement.innerHTML = marked(card.answer);
                    break;
                    
                case 'type_in':
                    console.log('渲染输入题');
                    this.renderTypeInCard(card);
                    if (questionElement) questionElement.innerHTML = marked(card.question);
                    if (answerElement) answerElement.innerHTML = marked(card.answer);
                    break;
                    
                case 'mcq':
                    console.log('渲染选择题');
                    this.renderMultipleChoice(card);
                    if (answerElement) answerElement.innerHTML = marked(card.answer);
                    break;
                    
                case 'qa':
                default:
                    console.log('渲染问答题');
                    this.renderQACard(card);
                    break;
            }
            
            console.log('卡片渲染完成');
            
        } catch (error) {
            console.error('渲染卡片时出错:', error);
        }
    }

    // 显示卡片内容（更新版本）
    displayCard() {
        console.log('displayCard 被调用，当前卡片:', this.currentCard);
        
        if (!this.currentCard) {
            console.log('displayCard: 没有当前卡片，返回');
            return;
        }
        
        try {
            // 根据卡片类型渲染界面
            console.log('开始渲染卡片，类型:', this.currentCard.cardType);
            this.renderCardByType(this.currentCard);
            
            // 加载并显示图片
            this.loadCardImage(this.currentCard.id);
            
            // 更新正面内容
            const cardNumberElement = document.getElementById('cardNumber');
            const cardLevelElement = document.getElementById('cardLevel');
            
            if (cardNumberElement && cardLevelElement) {
                cardNumberElement.textContent = `#${this.currentCard.id}`;
                cardLevelElement.textContent = `等级 ${this.currentCard.progress.level}`;
                console.log('正面内容更新完成');
            } else {
                console.log('正面元素未找到');
            }
            
            // 更新背面内容
            const cardNumberBackElement = document.getElementById('cardNumberBack');
            const cardLevelBackElement = document.getElementById('cardLevelBack');
            
            if (cardNumberBackElement && cardLevelBackElement) {
                cardNumberBackElement.textContent = `#${this.currentCard.id}`;
                cardLevelBackElement.textContent = `等级 ${this.currentCard.progress.level}`;
                console.log('背面内容更新完成');
            } else {
                console.log('背面元素未找到');
            }
            
            console.log('卡片显示完成');
            
        } catch (error) {
            console.error('显示卡片时出错:', error);
        }
    }

    // 加载卡片图片
    async loadCardImage(cardId) {
        try {
            const image = await this.getCardImage(cardId);
            const imageContainer = document.getElementById('cardImageContainer');
            const cardImage = document.getElementById('cardImage');
            
            if (image && image.data) {
                cardImage.src = image.data;
                imageContainer.style.display = 'block';
            } else {
                imageContainer.style.display = 'none';
            }
        } catch (error) {
            console.error('加载图片失败:', error);
            document.getElementById('cardImageContainer').style.display = 'none';
        }
    }

    // 获取卡片图片
    async getCardImage(cardId) {
        try {
            return this.dbOperation('images', 'readonly', store => {
                const index = store.index('cardId');
                const request = index.get(cardId);
                return new Promise((resolve, reject) => {
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => reject(request.error);
                });
            });
        } catch (error) {
            return null;
        }
    }

    // 保存卡片图片
    async saveCardImage(cardId, imageData) {
        try {
            // 先删除该卡片现有的图片
            await this.deleteCardImage(cardId);
            
            // 保存新图片
            const imageRecord = {
                cardId: cardId,
                data: imageData,
                uploadedAt: new Date().toISOString()
            };
            
            return this.dbOperation('images', 'readwrite', store => store.add(imageRecord));
        } catch (error) {
            console.error('保存图片失败:', error);
            throw error;
        }
    }

    // 删除卡片图片
    async deleteCardImage(cardId) {
        try {
            const existingImage = await this.getCardImage(cardId);
            if (existingImage) {
                return this.dbOperation('images', 'readwrite', store => store.delete(existingImage.id));
            }
        } catch (error) {
            console.error('删除图片失败:', error);
        }
    }

    // 添加图片到当前卡片
    addImageToCard() {
        if (!this.currentCard) {
            this.showToast('请先选择一张卡片', 'warning');
            return;
        }
        
        document.getElementById('imageInput').click();
    }

    // 处理图片上传
    async handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (!file.type.startsWith('image/')) {
            this.showToast('请选择图片文件', 'error');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) { // 5MB限制
            this.showToast('图片大小不能超过5MB', 'error');
            return;
        }
        
        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    await this.saveCardImage(this.currentCard.id, e.target.result);
                    await this.loadCardImage(this.currentCard.id);
                    this.showToast('图片上传成功', 'success');
                } catch (error) {
                    this.showToast('图片上传失败', 'error');
                }
            };
            reader.readAsDataURL(file);
        } catch (error) {
            this.showToast('图片读取失败', 'error');
        }
        
        // 清空文件输入
        event.target.value = '';
    }
}

// 全局函数（供HTML调用）
let app;

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    app = new TaxQuizApp();
});

// 全局函数
function flipCard() {
    app.flipCard();
}

function handleAnswer(isCorrect) {
    app.handleAnswer(isCorrect);
}

function importData() {
    app.importData();
}

function exportData() {
    app.exportData();
}

function clearData() {
    app.clearData();
}

function handleFileImport(event) {
    app.handleFileImport(event);
}

// 搜索相关函数
function toggleSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput.style.display === 'none') {
        searchInput.style.display = 'block';
        searchInput.focus();
    } else {
        searchInput.style.display = 'none';
        app.closeSearchResults();
    }
}

function closeSearchResults() {
    app.closeSearchResults();
}

// 输入题相关函数
function submitTypeAnswer() {
    app.submitTypeAnswer();
}

// 图片相关函数
function addImageToCard() {
    app.addImageToCard();
}

function handleImageUpload(event) {
    app.handleImageUpload(event);
}