-- Supabase 数据库架构设计

-- 1. 卡组表 (Decks)
CREATE TABLE decks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    user_id TEXT NULL, -- NULL 表示官方卡组，非 NULL 表示用户私有卡组
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 卡片表 (Cards)
CREATE TABLE cards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    deck_id UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
    user_id TEXT NULL, -- NULL 表示官方卡片，非 NULL 表示用户私有卡片
    card_type TEXT NOT NULL DEFAULT 'qa', -- 'qa', 'mcq', 'fill_blank', 'true_false'
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    options TEXT[] NULL, -- 选择题选项数组，仅选择题需要
    correct_answer TEXT NULL, -- 填空题/选择题正确答案
    difficulty INTEGER DEFAULT 1, -- 1-5 难度等级
    tags TEXT[] DEFAULT '{}', -- 标签数组
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 学习进度表 (Progress) - 更新后的结构
CREATE TABLE progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    deck_id UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    level INTEGER DEFAULT 0,
    review_date DATE NOT NULL,
    last_answered BOOLEAN NULL, -- 上次是否答对
    streak INTEGER DEFAULT 0, -- 连续正确次数
    total_attempts INTEGER DEFAULT 0, -- 总尝试次数
    correct_attempts INTEGER DEFAULT 0, -- 正确次数
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(card_id, user_id)
);

-- 4. 用户学习统计表 (User Stats)
CREATE TABLE user_stats (
    user_id TEXT PRIMARY KEY,
    total_cards_studied INTEGER DEFAULT 0,
    total_time_spent INTEGER DEFAULT 0, -- 总学习时间（分钟）
    current_streak INTEGER DEFAULT 0, -- 当前连续学习天数
    longest_streak INTEGER DEFAULT 0, -- 最长连续学习天数
    last_study_date DATE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 创建索引以提高查询性能
CREATE INDEX idx_cards_deck_id ON cards(deck_id);
CREATE INDEX idx_cards_user_id ON cards(user_id);
CREATE INDEX idx_cards_card_type ON cards(card_type);
CREATE INDEX idx_progress_deck_user ON progress(deck_id, user_id);
CREATE INDEX idx_progress_review_date ON progress(review_date);
CREATE INDEX idx_decks_user_id ON decks(user_id);

-- 6. 创建触发器自动更新 updated_at 字段
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_decks_updated_at BEFORE UPDATE ON decks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cards_updated_at BEFORE UPDATE ON cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_progress_updated_at BEFORE UPDATE ON progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_stats_updated_at BEFORE UPDATE ON user_stats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();