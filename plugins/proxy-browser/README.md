# Proxy Browser 插件使用指南

## 功能概述

Proxy Browser 插件是一个强大的网页抓取工具，支持代理访问、登录状态检测、自动登录和 localStorage 数据抓取。特别适用于需要登录后才能获取数据的网站。

## 主要功能

1. **代理访问**: 支持通过代理服务器访问目标网站
2. **登录状态检测**: 自动检测网站登录状态
3. **有头浏览器登录**: 使用有头浏览器进行手动登录
4. **无头浏览器抓取**: 使用无头浏览器高效抓取数据
5. **localStorage 抓取**: 获取指定网站的 localStorage 数据
6. **会话保持**: 自动保存和恢复登录会话

## 使用方法

### 1. 完整抓取流程（推荐）

这是最简单的方法，插件会自动处理整个流程：

```javascript
// 在前端页面中调用
const result = await window.electronAPI.invokePluginAction('proxy-browser', 'scrapeWithLogin', {
  url: 'https://example.com',
  targetKeys: ['userToken', 'userInfo', 'sessionId'], // 要抓取的 localStorage 键
  loginIndicators: ['.login-btn', '#signin'], // 自定义登录按钮选择器
  loginConfig: {
    waitForLogin: () => {
      // 自定义登录完成检测函数
      return document.querySelector('.user-profile') !== null;
    }
  }
});

if (result.success) {
  console.log('抓取成功:', result.data);
  console.log('localStorage 数据:', result.data.localStorage);
  console.log('是否需要登录:', result.data.loginRequired);
} else {
  console.error('抓取失败:', result.error);
}
```

### 2. 分步执行

如果需要更精细的控制，可以分步执行：

#### 步骤1: 检测登录状态

```javascript
const loginStatus = await window.electronAPI.invokePluginAction('proxy-browser', 'checkLoginStatus', {
  url: 'https://example.com',
  loginIndicators: ['.login-button', '#login']
});

if (loginStatus.success) {
  console.log('登录状态:', loginStatus.isLoggedIn ? '已登录' : '未登录');
}
```

#### 步骤2: 执行登录（如需要）

```javascript
if (!loginStatus.isLoggedIn) {
  const loginResult = await window.electronAPI.invokePluginAction('proxy-browser', 'performLogin', {
    url: 'https://example.com',
    loginConfig: {
      waitForLogin: () => {
        // 等待用户信息出现
        return document.querySelector('.user-info') !== null;
      }
    }
  });
  
  if (loginResult.success) {
    console.log('登录成功，会话数据已保存');
  }
}
```

#### 步骤3: 抓取 localStorage 数据

```javascript
const scrapeResult = await window.electronAPI.invokePluginAction('proxy-browser', 'scrapeLocalStorage', {
  url: 'https://example.com',
  targetKeys: ['userToken', 'userInfo'], // 指定要抓取的键
  sessionData: loginResult // 使用登录后的会话数据
});

if (scrapeResult.success) {
  console.log('抓取的数据:', scrapeResult.data.localStorage);
}
```

## 配置参数详解

### scrapeWithLogin 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `url` | string | 是 | 目标网站 URL |
| `targetKeys` | string[] | 否 | 要抓取的 localStorage 键名数组，为空则抓取所有 |
| `loginIndicators` | string[] | 否 | 登录按钮的 CSS 选择器数组 |
| `loginConfig` | object | 否 | 登录配置对象 |
| `maxRetries` | number | 否 | 最大重试次数，默认 3 |

### loginConfig 配置

| 参数 | 类型 | 说明 |
|------|------|------|
| `waitForLogin` | function | 自定义登录完成检测函数，返回 true 表示登录完成 |

### 返回数据格式

```javascript
{
  success: true,
  data: {
    url: "https://example.com",
    title: "网站标题",
    timestamp: "2024-01-01T00:00:00.000Z",
    localStorage: {
      "userToken": "abc123",
      "userInfo": "{\"name\":\"张三\"}",
      "sessionId": "xyz789"
    },
    proxy: "http://proxy.example.com:8080",
    loginRequired: true,
    sessionData: {
      cookies: [...],
      localStorage: {...}
    }
  }
}
```

## 使用场景示例

### 场景1: 抓取用户信息

```javascript
const result = await window.electronAPI.invokePluginAction('proxy-browser', 'scrapeWithLogin', {
  url: 'https://user.example.com/profile',
  targetKeys: ['userProfile', 'authToken', 'preferences'],
  loginIndicators: ['.login-btn', '[data-testid="login"]']
});
```

### 场景2: 抓取购物车数据

```javascript
const result = await window.electronAPI.invokePluginAction('proxy-browser', 'scrapeWithLogin', {
  url: 'https://shop.example.com/cart',
  targetKeys: ['cartItems', 'userSession', 'checkoutData'],
  loginConfig: {
    waitForLogin: () => {
      // 等待购物车页面加载完成
      return document.querySelector('.cart-items') !== null;
    }
  }
});
```

### 场景3: 抓取所有 localStorage

```javascript
const result = await window.electronAPI.invokePluginAction('proxy-browser', 'scrapeWithLogin', {
  url: 'https://example.com',
  targetKeys: [], // 空数组表示抓取所有 localStorage
  loginIndicators: ['.signin', '#login-button']
});
```

## 注意事项

1. **代理配置**: 确保代理管理器正常运行，插件会自动获取可用代理
2. **登录超时**: 登录操作默认超时时间为 5 分钟
3. **浏览器下载**: 首次使用可能需要下载浏览器，请耐心等待
4. **错误处理**: 所有操作都包含完善的错误处理，请检查返回的 `success` 字段
5. **会话保持**: 登录后的会话数据会自动保存，支持后续无头抓取

## 故障排除

### 常见问题

1. **代理不可用**
   - 检查代理管理器是否正常运行
   - 确认代理服务器配置正确

2. **登录检测失败**
   - 检查 `loginIndicators` 选择器是否正确
   - 可以自定义 `waitForLogin` 函数

3. **抓取失败**
   - 检查目标网站是否可访问
   - 确认 localStorage 键名是否正确

4. **浏览器启动失败**
   - 检查系统是否支持 Playwright
   - 尝试重新下载浏览器

### 调试技巧

1. 使用 `checkLoginStatus` 单独测试登录状态检测
2. 使用 `performLogin` 单独测试登录流程
3. 使用 `scrapeLocalStorage` 单独测试数据抓取
4. 查看控制台日志获取详细错误信息

## 更新日志

- v1.0.0: 初始版本，支持基本的代理访问和浏览器操作
- v2.0.0: 添加 localStorage 抓取功能
- v2.1.0: 添加登录状态检测和自动登录功能
- v2.2.0: 添加完整抓取流程和会话保持功能
