/**
 * 间隔重复系统 (Spaced Repetition System)
 * 基于SM-2算法实现
 */

class SRSAlgorithm {
    /**
     * 计算下一次复习时间和参数
     * @param {Object} progress - 当前的学习进度记录
     * @param {string} performance - 用户表现: 'correct_easy', 'correct_hard', 'incorrect'
     * @returns {Object} - 更新后的进度参数
     */
    static calculateNextReview(progress, performance) {
        let { interval, easeFactor, repetitions } = progress;

        switch (performance) {
            case 'correct_easy':
                // 简单正确回答
                if (repetitions === 0) {
                    interval = 1;
                } else if (repetitions === 1) {
                    interval = 6;
                } else {
                    interval = Math.round(interval * easeFactor);
                }
                repetitions += 1;
                easeFactor = Math.max(1.3, easeFactor + 0.15);
                break;

            case 'correct_hard':
                // 困难但正确回答
                if (repetitions === 0) {
                    interval = 1;
                } else if (repetitions === 1) {
                    interval = 4;
                } else {
                    interval = Math.round(interval * easeFactor * 0.8);
                }
                repetitions += 1;
                easeFactor = Math.max(1.3, easeFactor - 0.1);
                break;

            case 'incorrect':
                // 错误回答
                interval = 1;
                repetitions = 0;
                easeFactor = Math.max(1.3, easeFactor - 0.2);
                break;
        }

        // 计算下次复习日期
        const nextReviewDate = new Date();
        nextReviewDate.setDate(nextReviewDate.getDate() + interval);

        // 确定知识点状态
        let status = 'learning';
        if (repetitions >= 4 && interval >= 21) {
            status = 'mastered';
        } else if (repetitions >= 2) {
            status = 'learned';
        } else if (repetitions >= 1) {
            status = 'learning';
        }

        return {
            interval,
            easeFactor: Math.round(easeFactor * 100) / 100, // 保留两位小数
            repetitions,
            nextReviewDate,
            lastReviewedDate: new Date(),
            status
        };
    }

    /**
     * 创建新的学习进度记录
     * @param {string} userId - 用户ID
     * @param {string} knowledgePointId - 知识点ID
     * @returns {Object} - 新的进度记录
     */
    static createNewProgress(userId, knowledgePointId) {
        return {
            user: userId,
            knowledgePoint: knowledgePointId,
            status: 'new',
            nextReviewDate: new Date(), // 立即可学习
            lastReviewedDate: null,
            interval: 0,
            easeFactor: 2.5,
            repetitions: 0,
            incorrectCount: 0,
            totalAttempts: 0,
            correctAttempts: 0,
            createdAt: new Date(),
            updatedAt: new Date()
        };
    }

    /**
     * 获取用户今日需要复习的知识点数量
     * @param {Array} progressRecords - 用户的进度记录数组
     * @returns {number} - 今日需要复习的数量
     */
    static getTodayReviewCount(progressRecords) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        return progressRecords.filter(record => {
            const nextReview = new Date(record.nextReviewDate);
            return nextReview >= today && nextReview < tomorrow;
        }).length;
    }

    /**
     * 获取用户的学习统计信息
     * @param {Array} progressRecords - 用户的进度记录数组
     * @returns {Object} - 统计信息
     */
    static getLearningStats(progressRecords) {
        const stats = {
            total: progressRecords.length,
            new: 0,
            learning: 0,
            learned: 0,
            mastered: 0,
            todayReview: 0,
            overdue: 0,
            accuracy: 0
        };

        const now = new Date();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let totalAttempts = 0;
        let correctAttempts = 0;

        progressRecords.forEach(record => {
            // 统计状态
            stats[record.status]++;

            // 统计今日复习
            const nextReview = new Date(record.nextReviewDate);
            if (nextReview >= today && nextReview < now) {
                stats.todayReview++;
            }

            // 统计逾期
            if (nextReview < now && record.status !== 'new') {
                stats.overdue++;
            }

            // 统计准确率
            totalAttempts += record.totalAttempts || 0;
            correctAttempts += record.correctAttempts || 0;
        });

        stats.accuracy = totalAttempts > 0
            ? Math.round((correctAttempts / totalAttempts) * 100)
            : 0;

        return stats;
    }
}

module.exports = SRSAlgorithm;