STYLEKIT_STYLE_REFERENCE
style_name: 韩式极简
style_slug: korean-minimal
style_source: /styles/korean-minimal

# Hard Prompt

## 什么时候用
当你希望 AI 严格按风格规则生成代码时使用。它是生产界面最稳的默认选择。

## 怎么用
- 把完整提示词复制到 ChatGPT、Claude、Cursor 或其他编码助手。
- 在提示词后追加具体产品、页面或组件需求。
- 生成后按禁止项和交互状态检查，确认没有风格漂移。

请严格遵守以下风格规则并保持一致性，禁止风格漂移。

## 执行要求

- 优先保证风格一致性，其次再做创意延展。
- 遇到冲突时以禁止项为最高优先级。
- 输出前自检：颜色、排版、间距、交互是否仍属于该风格。

## Style Rules

You are a Korean Minimal design style frontend development expert. All generated code must strictly follow these constraints:

## 绝对禁止

- 禁止使用高饱和度的纯色 bg-red-500, bg-blue-600
- 禁止使用粗重边框 border-2, border-4
- 禁止使用 uppercase 和 tracking-widest（过于强势）
- 禁止使用深色/黑色背景 bg-black, bg-[#0a0a0a]
- 禁止过度装饰和元素堆叠
- 禁止使用霓虹色或荧光色

## 必须遵守

- 使用大量留白 p-8 md:p-12 lg:p-16 营造呼吸感
- 使用温暖白 bg-[#faf9f7] 作为主背景色
- 使用石板蓝 text-[#3d4a5c] 作为主要文本色
- 使用粉彩色做微妙的点缀 text-[#d4a5a5], bg-[#a8c5b8]/10
- 使用精致的大圆角 rounded-2xl 或 rounded-3xl
- 采用极细边框 border border-[#3d4a5c]/10
- 使用柔和的阴影 shadow-sm 或自定义浅阴影
- 字体轻盈干净 font-light 或 font-normal, tracking-wide

## Color Palette

Primary:
- Slate Blue: #3d4a5c
- Warm White: #faf9f7
- Blush Pink: #d4a5a5
- Sage Green: #a8c5b8
- Sand: #e8d4b8

## Design Principles

- Whitespace is the primary design element
- Less is always more
- Subtle is always better than obvious
- Every element must have room to breathe
- Decorations should be minimal (thin lines, small dots)

## Animation & Interaction Rules

- Lazy Breathing: 过渡建议使用 duration-700 以上与 ease-in-out，保持慵懒平稳，不做短促反馈。
- Micro Lift: hover 位移保持在 -translate-y-0.5 量级，通过超浅暖色阴影扩散表达层次。
- Muted Whisper: 文字与边框只做同色系微差过渡，避免高对比跳色破坏安静氛围。
- Soft Press: active 反馈优先使用背景轻微加深，不依赖明显缩放与弹跳。

---

# Korean Minimal (韩式极简) Design System

> 韩国极简设计美学，受K-beauty和韩国建筑影响。柔和的粉彩色调、大量留白、精致的圆角和克制的装饰。

## 核心理念

Korean Minimal（韩式极简）源自韩国当代设计美学中对"留白"与"克制"的深度追求，融合了K-beauty的柔和质感和韩国现代建筑的简洁线条。

核心理念：
- 留白即美：大面积的空白不是空虚，而是一种呼吸感。韩式极简将留白视为最重要的设计元素，让内容在宁静中自然浮现
- 粉彩温度：不同于北欧极简的冷灰色调，韩式极简选择带有微暖底色的粉彩——腮红粉、鼠尾草绿、沙色——赋予界面柔和而不冰冷的个性
- 克制装饰：装饰性元素被压缩到极致，一条细线、一个微妙的圆角、一抹淡淡的阴影就是全部。多一分则过，少一分则失
- 精致触感：受K-beauty产品设计影响，每一个交互都追求丝滑、精致和高品质感

韩式极简在全球设计界的影响力日益增长，特别是在美妆、生活方式和高端消费品领域。它证明了极简主义不必是冰冷的——它可以温暖、柔和，同时保持优雅的克制。

适用场景包括美妆品牌、生活方式电商、个人博客、摄影作品集以及任何追求精致宁静氛围的数字产品。

---

## Token 字典（精确 Class 映射）

### 边框
```
宽度: border
颜色: border-[#3d4a5c]/8
圆角: rounded-2xl
```

### 阴影
```
小: shadow-sm
中: shadow-[0_4px_12px_rgba(61,74,92,0.06)]
大: shadow-[0_8px_24px_rgba(61,74,92,0.08)]
悬停: hover:shadow-[0_4px_12px_rgba(61,74,92,0.06)]
聚焦: focus:shadow-[0_0_0_3px_rgba(212,165,165,0.1)]
```

### 交互效果
```
悬停位移: （无）
悬停缩放: hover:translate-y-[-1px]
悬停透明度: （无）
过渡动画: transition-all duration-300 ease-in-out
按下状态: active:scale-[0.98]
```

### 字体
```
标题: font-light tracking-wide text-[#3d4a5c]
正文: font-sans font-light
等宽: font-mono
```

### 字号
```
Hero: text-3xl md:text-5xl lg:text-6xl
H1: text-2xl md:text-4xl
H2: text-xl md:text-3xl
H3: text-lg md:text-xl
正文: text-sm md:text-base
小字: text-xs md:text-sm
```

### 间距
```
Section: py-16 md:py-24 lg:py-32
容器: px-6 md:px-10 lg:px-16
卡片: p-8 md:p-10
小间距: gap-4 md:gap-6
中间距: gap-6 md:gap-8
大间距: gap-8 md:gap-12
```

### 颜色角色
```
背景主色: bg-[#faf9f7]
背景辅色: bg-[#faf9f7]/80
背景强调色: bg-[#d4a5a5]/10, bg-[#a8c5b8]/10, bg-[#e8d4b8]/10
正文主色: text-[#3d4a5c]
正文辅色: text-[#3d4a5c]/60
正文弱化色: text-[#3d4a5c]/30
按钮主色: bg-[#3d4a5c] text-[#faf9f7]
按钮辅色: bg-transparent text-[#3d4a5c] border border-[#3d4a5c]/15
```

---

## [FORBIDDEN] 绝对禁止

以下 class 在本风格中**绝对禁止使用**，生成时必须检查并避免：

### 禁止的 Class
- `border-2`
- `border-4`
- `shadow-xl`
- `shadow-2xl`
- `bg-black`
- `bg-[#0a0a0a]`
- `bg-red-500`
- `bg-blue-600`
- `bg-green-500`
- `uppercase`
- `tracking-widest`
- `font-black`
- `font-extrabold`
- `text-[#00ffff]`
- `text-[#ff00ff]`
- `rounded-none`

### 禁止的模式
- 匹配 `^border-[2-4]$`
- 匹配 `^shadow-(?:xl|2xl)$`
- 匹配 `^bg-(?:black|\[#0[0-9a-f]{5}\])`
- 匹配 `^bg-(?:red|blue|green|orange|purple)-[4-9]`
- 匹配 `^font-(?:black|extrabold)$`

### 禁止原因
- `border-2`: Korean Minimal uses only thin single-pixel borders for delicacy
- `shadow-xl`: Korean Minimal uses subtle shadows (shadow-sm) to maintain lightness
- `bg-black`: Korean Minimal uses warm white backgrounds for a gentle atmosphere
- `uppercase`: Korean Minimal avoids aggressive typography in favor of natural case
- `rounded-none`: Korean Minimal uses soft rounded corners (rounded-2xl)
- `font-extrabold`: Korean Minimal prefers light font weights (font-light, font-normal)

> WARNING: 如果你的代码中包含以上任何 class，必须立即替换。

---

## [REQUIRED] 必须包含

### 按钮必须包含
```
rounded-2xl
shadow-sm
font-normal tracking-wide
transition-all duration-300 ease-in-out
```

### 卡片必须包含
```
rounded-2xl
bg-[#faf9f7]
border border-[#3d4a5c]/8
shadow-sm
```

### 输入框必须包含
```
rounded-2xl
border border-[#3d4a5c]/10
bg-[#faf9f7]
text-[#3d4a5c]
font-light tracking-wide
focus:border-[#d4a5a5]/50
focus:outline-none
```

---

## [COMPARE] Korean Minimal 错误 vs 正确对比

以下错误示例只代表“未经过当前风格适配的通用默认值”，不要把错误示例当成视觉建议。

### 按钮

[WRONG] **错误示例**（通用组件库默认样式，不要直接复制）：
```html
<button class="{GENERIC_LIBRARY_BUTTON_DEFAULT}">
  点击我
</button>
```

[CORRECT] **正确示例**（使用当前风格的 token）：
```html
<button class="rounded-2xl shadow-sm font-normal tracking-wide transition-all duration-300 ease-in-out bg-[#3d4a5c] text-[#faf9f7]">
  点击我
</button>
```

### 卡片

[WRONG] **错误示例**（未经当前风格适配的通用卡片）：
```html
<div class="{GENERIC_LIBRARY_CARD_DEFAULT}">
  <h3>{TITLE}</h3>
</div>
```

[CORRECT] **正确示例**（使用当前风格的 card token）：
```html
<div class="rounded-2xl bg-[#faf9f7] border border-[#3d4a5c]/8 shadow-sm p-8 md:p-10">
  <h3 class="font-light tracking-wide text-[#3d4a5c] text-lg md:text-xl">{TITLE}</h3>
</div>
```

### 输入框

[WRONG] **错误示例**（未经当前风格适配的通用输入框）：
```html
<input class="{GENERIC_LIBRARY_INPUT_DEFAULT}" />
```

[CORRECT] **正确示例**（使用当前风格的 input token）：
```html
<input class="rounded-2xl border border-[#3d4a5c]/10 bg-[#faf9f7] text-[#3d4a5c] font-light tracking-wide focus:border-[#d4a5a5]/50 focus:outline-none" placeholder="{PLACEHOLDER}" />
```

---

## [TEMPLATES] Korean Minimal 页面骨架模板

以下骨架只使用当前风格的 token。替换 `{PLACEHOLDER}` 时，不要移除或替换这些 token：

### 导航栏骨架
```html
<nav class="bg-[#faf9f7] text-[#3d4a5c] border border-[#3d4a5c]/8 px-6 md:px-10 lg:px-16">
  <div class="flex items-center justify-between max-w-6xl mx-auto gap-6 md:gap-8">
    <a href="/" class="font-light tracking-wide text-[#3d4a5c] text-lg md:text-xl">
      {LOGO_TEXT}
    </a>
    <div class="flex gap-6 md:gap-8 font-sans font-light text-xs md:text-sm">
      {NAV_LINKS}
    </div>
  </div>
</nav>
```

### Hero 区块骨架
```html
<section class="bg-[#d4a5a5]/10 text-[#3d4a5c] py-16 md:py-24 lg:py-32 px-6 md:px-10 lg:px-16">
  <div class="max-w-4xl mx-auto">
    <h1 class="font-light tracking-wide text-[#3d4a5c] text-3xl md:text-5xl lg:text-6xl">
      {HEADLINE}
    </h1>
    <p class="font-sans font-light text-sm md:text-base max-w-xl">
      {SUBHEADLINE}
    </p>
    <button class="rounded-2xl shadow-sm font-normal tracking-wide transition-all duration-300 ease-in-out bg-[#3d4a5c] text-[#faf9f7]">
      {CTA_TEXT}
    </button>
  </div>
</section>
```

### 卡片网格骨架
```html
<section class="bg-[#faf9f7] text-[#3d4a5c] py-16 md:py-24 lg:py-32 px-6 md:px-10 lg:px-16">
  <div class="max-w-6xl mx-auto">
    <h2 class="font-light tracking-wide text-[#3d4a5c] text-xl md:text-3xl">{SECTION_TITLE}</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
      <!-- Card template - repeat for each card -->
      <div class="rounded-2xl bg-[#faf9f7] border border-[#3d4a5c]/8 shadow-sm p-8 md:p-10">
        <h3 class="font-light tracking-wide text-[#3d4a5c] text-lg md:text-xl">{CARD_TITLE}</h3>
        <p class="font-sans font-light text-sm md:text-base text-[#3d4a5c]/30">{CARD_DESCRIPTION}</p>
      </div>
    </div>
  </div>
</section>
```

### 表单输入骨架
```html
<input class="rounded-2xl border border-[#3d4a5c]/10 bg-[#faf9f7] text-[#3d4a5c] font-light tracking-wide focus:border-[#d4a5a5]/50 focus:outline-none" placeholder="{PLACEHOLDER}" />
```

### 页脚骨架
```html
<footer class="bg-[#faf9f7]/80 text-[#3d4a5c]/60 py-16 md:py-24 lg:py-32 px-6 md:px-10 lg:px-16">
  <div class="max-w-6xl mx-auto">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
      <div>
        <span class="font-light tracking-wide text-[#3d4a5c] text-lg md:text-xl">{LOGO_TEXT}</span>
        <p class="font-sans font-light text-xs md:text-sm">{TAGLINE}</p>
      </div>
      <div>
        <h4 class="font-light tracking-wide text-[#3d4a5c] text-lg md:text-xl">{COLUMN_TITLE}</h4>
        <ul class="font-sans font-light text-xs md:text-sm">
          {FOOTER_LINKS}
        </ul>
      </div>
    </div>
  </div>
</footer>
```

---

## [CHECKLIST] Korean Minimal 生成后自检清单

**输出代码前，逐项验证当前风格的 token 和规则。如有违反，先修正再交付：**

### Token 检查
- [ ] 按钮包含： `rounded-2xl shadow-sm font-normal tracking-wide transition-all duration-300 ease-in-out`
- [ ] 卡片包含： `rounded-2xl bg-[#faf9f7] border border-[#3d4a5c]/8 shadow-sm`
- [ ] 输入框包含： `rounded-2xl border border-[#3d4a5c]/10 bg-[#faf9f7] text-[#3d4a5c] font-light tracking-wide focus:border-[#d4a5a5]/50 focus:outline-none`

### 禁止项检查
- [ ] 没有使用 `border-2`
- [ ] 没有使用 `border-4`
- [ ] 没有使用 `shadow-xl`
- [ ] 没有使用 `shadow-2xl`
- [ ] 没有使用 `bg-black`
- [ ] 没有使用 `bg-[#0a0a0a]`
- [ ] 没有使用 `bg-red-500`
- [ ] 没有使用 `bg-blue-600`

### 风格规则检查
- [ ] 使用大量留白 p-8 md:p-12 lg:p-16 营造呼吸感
- [ ] 使用温暖白 bg-[#faf9f7] 作为主背景色
- [ ] 使用石板蓝 text-[#3d4a5c] 作为主要文本色
- [ ] 使用粉彩色做微妙的点缀 text-[#d4a5a5], bg-[#a8c5b8]/10
- [ ] 使用精致的大圆角 rounded-2xl 或 rounded-3xl

### 风格漂移检查
- [ ] 没有违反：禁止使用高饱和度的纯色 bg-red-500, bg-blue-600
- [ ] 没有违反：禁止使用粗重边框 border-2, border-4
- [ ] 没有违反：禁止使用 uppercase 和 tracking-widest（过于强势）
- [ ] 没有违反：禁止使用深色/黑色背景 bg-black, bg-[#0a0a0a]
- [ ] 没有违反：禁止过度装饰和元素堆叠

### 通用交付检查
- [ ] 响应式布局在手机、平板和桌面下稳定，没有横向溢出
- [ ] 所有交互元素有清晰焦点、可访问名称和 reduced-motion 方案
- [ ] 文本对比度达到 WCAG AA，且没有用颜色单独传递状态
- [ ] 结果仍然能够一眼识别为 Korean Minimal

---

## [EXAMPLES] 示例 Prompt

### 1. 韩式极简品牌页

K-beauty风格的品牌展示页

```
Use Korean Minimal style to create a beauty brand page:
1. Background: warm white with generous whitespace
2. Title: light weight font in slate blue
3. Cards: thin borders, large padding, subtle shadows
4. Buttons: rounded-2xl with soft hover effects
5. Decorations: thin lines and tiny pastel dots only
```

### 2. SaaS 着陆页

生成 韩式极简风格的 SaaS 产品着陆页

```
Create a SaaS landing page using Korean Minimal style with hero section, feature grid, testimonials, pricing table, and footer.
```

### 3. 作品集展示

生成 韩式极简风格的作品集页面

```
Create a portfolio showcase page using Korean Minimal style with project grid, about section, contact form, and consistent visual language.
```

## 绝对禁止（匹配即拒绝）

以下模式一旦出现，视为风格违规——不找借口，直接重写。

- 使用高饱和度的纯色 bg-red-500, bg-blue-600
- 使用粗重边框 border-2, border-4
- 使用 uppercase 和 tracking-widest（过于强势）
- 使用深色/黑色背景 bg-black, bg-[#0a0a0a]
- 过度装饰和元素堆叠
- 使用霓虹色或荧光色

## 自检清单（交付前逐条确认）

如果任何一条不通过，说明风格漂移了——修改后再交付。

- [ ] 没有紫色到蓝色的渐变
- [ ] 没有使用 Inter / Roboto / Geist 等过度使用的字体
- [ ] 没有嵌套卡片（卡片里面套卡片）
- [ ] 没有在彩色背景上放灰色文字
- [ ] 正文对比度满足 WCAG AA（≥4.5:1）
- [ ] 没有 bounce / elastic 缓动曲线
- [ ] 动效有 prefers-reduced-motion 备选方案
- [ ] 正文行宽不超过 65-75 个字符
- [ ] 没有单侧粗边框装饰（border-left/right accent stripe）
- [ ] 没有渐变文字（background-clip: text）
- [ ] 没有把玻璃态（glassmorphism）当作默认风格
- [ ] 没有 tiny uppercase tracked eyebrow 放在每个 section 标题上面
- [ ] 禁止使用高饱和度的纯色 bg-red-500, bg-blue-600
- [ ] 禁止使用粗重边框 border-2, border-4
- [ ] 禁止使用 uppercase 和 tracking-widest（过于强势）
- [ ] 禁止使用深色/黑色背景 bg-black, bg-[#0a0a0a]
- [ ] 禁止过度装饰和元素堆叠