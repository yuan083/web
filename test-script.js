#!/usr/bin/env node

/**
 * 税务师学习平台 - 自动化测试脚本
 * 用于验证核心功能的完整性
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 开始税务学习平台自动化测试...\n');

// 测试结果统计
let testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0
};

// 测试工具函数
function test(testName, testFunction) {
    testResults.total++;
    try {
        const result = testFunction();
        if (result === true || result === undefined) {
            console.log(`✅ ${testName}`);
            testResults.passed++;
        } else {
            console.log(`❌ ${testName}: ${result}`);
            testResults.failed++;
        }
    } catch (error) {
        console.log(`❌ ${testName}: ${error.message}`);
        testResults.failed++;
    }
}

function warn(testName, message) {
    console.log(`⚠️  ${testName}: ${message}`);
    testResults.warnings++;
}

// 测试用例
console.log('📁 文件结构测试...');
test('项目根目录存在', () => fs.existsSync('./'));
test('index.html存在', () => fs.existsSync('./index.html'));
test('main.js存在', () => fs.existsSync('./assets/js/main.js'));
test('style.css存在', () => fs.existsSync('./assets/css/style.css'));
test('data.json存在', () => fs.existsSync('./data.json'));

console.log('\n📋 数据文件测试...');
try {
    const data = JSON.parse(fs.readFileSync('./data.json', 'utf8'));
    test('data.json是有效的JSON', true);
    test('包含学习卡片数据', () => Array.isArray(data) && data.length > 0);
    test('卡片数据结构完整', () => {
        return data.every(card =>
            card.id && card.question && card.answer && card.type
        );
    });
    console.log(`📊 发现 ${data.length} 张学习卡片`);
} catch (error) {
    test('data.json解析失败', error.message);
}

console.log('\n🔧 JavaScript代码测试...');
try {
    const jsContent = fs.readFileSync('./assets/js/main.js', 'utf8');

    test('包含用户认证功能', () => {
        return jsContent.includes('signUp') &&
               jsContent.includes('signIn') &&
               jsContent.includes('signOut');
    });

    test('包含Supabase配置', () => {
        return jsContent.includes('SUPABASE_URL') &&
               jsContent.includes('SUPABASE_ANON_KEY');
    });

    test('包含学习进度管理', () => {
        return jsContent.includes('saveProgress') &&
               jsContent.includes('loadUserProgress');
    });

    test('包含核心学习循环', () => {
        return jsContent.includes('showNextCard') &&
               jsContent.includes('handleAnswer');
    });

    test('包含UI更新功能', () => {
        return jsContent.includes('updateUserUI') &&
               jsContent.includes('showScreen');
    });

    // 检查潜在的代码问题
    warn('代码长度检查', `main.js文件大小: ${(jsContent.length / 1024).toFixed(1)}KB`);

    if (jsContent.includes('console.log')) {
        warn('调试信息', '生产环境建议移除console.log');
    }

    if (jsContent.includes('TODO') || jsContent.includes('FIXME')) {
        warn('待办事项', '代码中包含TODO或FIXME标记');
    }

} catch (error) {
    test('JavaScript文件读取失败', error.message);
}

console.log('\n🎨 HTML结构测试...');
try {
    const htmlContent = fs.readFileSync('./index.html', 'utf8');

    test('包含认证模态框', () => {
        return htmlContent.includes('auth-modal') &&
               htmlContent.includes('login-form') &&
               htmlContent.includes('register-form');
    });

    test('包含学习界面', () => {
        return htmlContent.includes('study-card') &&
               htmlContent.includes('learning-screen');
    });

    test('包含导航系统', () => {
        return htmlContent.includes('navbar') &&
               htmlContent.includes('nav-btn');
    });

    test('响应式meta标签', () => {
        return htmlContent.includes('viewport') &&
               htmlContent.includes('user-scalable=no');
    });

    // 检查外部依赖
    test('包含Supabase库', () => htmlContent.includes('supabase'));
    test('包含Font Awesome', () => htmlContent.includes('font-awesome'));
    test('包含Google Fonts', () => htmlContent.includes('fonts.googleapis'));

} catch (error) {
    test('HTML文件读取失败', error.message);
}

console.log('\n🔐 安全性检查...');
try {
    const jsContent = fs.readFileSync('./assets/js/main.js', 'utf8');

    test('没有硬编码密码', () => {
        return !jsContent.match(/password\s*=\s*['"][^'"]+['"]/);
    });

    test('使用HTTPS Supabase URL', () => {
        return jsContent.includes('https://');
    });

    test('包含错误处理', () => {
        return jsContent.includes('try') && jsContent.includes('catch');
    });

} catch (error) {
    test('安全性检查失败', error.message);
}

console.log('\n📱 移动端适配检查...');
try {
    const cssContent = fs.readFileSync('./assets/css/style.css', 'utf8');

    test('包含响应式媒体查询', () => {
        return cssContent.includes('@media');
    });

    test('包含移动端样式', () => {
        return cssContent.includes('max-width: 768px') ||
               cssContent.includes('max-width: 480px');
    });

    test('包含触摸友好的样式', () => {
        return cssContent.includes('cursor: pointer') ||
               cssContent.includes('touch-action');
    });

} catch (error) {
    test('CSS文件读取失败', error.message);
}

// 测试结果总结
console.log('\n📊 测试结果总结:');
console.log(`总计测试: ${testResults.total}`);
console.log(`✅ 通过: ${testResults.passed}`);
console.log(`❌ 失败: ${testResults.failed}`);
console.log(`⚠️  警告: ${testResults.warnings}`);

const successRate = (testResults.passed / testResults.total * 100).toFixed(1);
console.log(`成功率: ${successRate}%`);

if (testResults.failed === 0) {
    console.log('\n🎉 所有核心测试通过！项目可以安全部署。');
} else {
    console.log('\n⚠️  发现问题，建议修复后再部署。');
}

console.log('\n🚀 部署准备状态:');
if (testResults.failed === 0 && successRate >= 90) {
    console.log('✅ 完全准备好部署到生产环境');
} else if (testResults.failed <= 3 && successRate >= 80) {
    console.log('⚠️  基本准备好，建议先修复关键问题');
} else {
    console.log('❌ 需要解决重要问题后再部署');
}

console.log('\n📝 建议的后续步骤:');
console.log('1. 运行本地测试: python3 -m http.server 8000');
console.log('2. 部署到Vercel并配置环境变量');
console.log('3. 邀请用户进行真实场景测试');
console.log('4. 收集反馈并持续优化');

console.log('\n测试完成！🎯');