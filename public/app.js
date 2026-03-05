/* app.js — Prompt Master Application Logic */

(function() {
  'use strict';

  const API = '';

  // ===== PLAN CONFIG =====
  const PLAN_CONFIG = {
    free:    { name: 'Miễn phí',   badge: '🆓', limit: 10,       color: 'default' },
    student: { name: 'Sinh viên',  badge: '🎓', limit: 50,       color: 'student' },
    pro:     { name: 'Pro',        badge: '🚀', limit: Infinity,  color: 'pro' },
    yearly:  { name: 'Pro Năm',    badge: '💎', limit: Infinity,  color: 'yearly' },
  };

  // ===== STATE =====
  let currentTheme = 'light';
  let selectedCreativity = 'balanced';
  let activeRules = [];
  let history = [];
  let isStreaming = false;
  let currentCategory = 'all';
  let currentPlan = 'free';
  let usageToday = 0;
  let planExpires = null;

  // Refinement state
  let currentOriginalPrompt = '';
  let currentEnhancedPrompt = '';

  // ===== USAGE TRACKING (in-memory + backend sync) =====
  const usageStore = {};

  function getUsageKey() {
    const user = window.Clerk?.user;
    const userId = user ? user.id : 'anonymous';
    const today = new Date().toISOString().slice(0, 10);
    return `${userId}_${today}`;
  }

  function loadUsage() {
    const key = getUsageKey();
    usageToday = usageStore[key] || 0;
  }

  async function syncUsageFromBackend() {
    const userId = window.Clerk?.user?.id || 'anonymous';
    try {
      const resp = await fetch(`${API}/api/usage/${userId}`);
      if (resp.ok) {
        const data = await resp.json();
        usageToday = data.usage || 0;
        const key = getUsageKey();
        usageStore[key] = usageToday;
        updateUsageUI();
      }
    } catch (e) {
      // Silently fail, use in-memory count
    }
  }

  function incrementUsage() {
    usageToday++;
    const key = getUsageKey();
    usageStore[key] = usageToday;
    updateUsageUI();
  }

  function getLimit() {
    return PLAN_CONFIG[currentPlan]?.limit || 10;
  }

  function canUse() {
    return usageToday < getLimit();
  }

  // ===== DOM REFS =====
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const heroSection = $('#heroSection');
  const heroTitle = $('#heroTitle');
  const heroSubtitle = $('#heroSubtitle');
  const promptInput = $('#promptInput');
  const promptType = $('#promptType');
  const sendBtn = $('#sendBtn');
  const outputSection = $('#outputSection');
  const outputBody = $('#outputBody');
  const outputTips = $('#outputTips');
  const skeletonLoader = $('#skeletonLoader');
  const loadingMessage = $('#loadingMessage');
  const copyBtn = $('#copyBtn');
  const copyText = $('#copyText');
  const historyList = $('#historyList');
  const newPromptBtn = $('#newPromptBtn');
  const hamburgerBtn = $('#hamburgerBtn');
  const sidebar = $('#sidebar');
  const sidebarOverlay = $('#sidebarOverlay');
  const discoverySection = $('#discoverySection');
  const templateGrid = $('#templateGrid');
  const charCount = $('#charCount');
  const refinementBar = $('#refinementBar');
  const refinementInput = $('#refinementInput');
  const refinementSendBtn = $('#refinementSendBtn');
  const openChatGPTBtn = $('#openChatGPT');
  const openGeminiBtn = $('#openGemini');

  // ===== TEMPLATES =====
  const templates = [
    // Tổng hợp / All
    { icon: '📝', title: 'Viết email chuyên nghiệp', desc: 'Soạn email rõ ràng, ấn tượng cho mọi tình huống', category: ['all', 'business'], prompt: 'Viết cho tôi một email chuyên nghiệp' },
    { icon: '💡', title: 'Brainstorm ý tưởng', desc: 'Tạo danh sách ý tưởng sáng tạo cho bất kỳ chủ đề nào', category: ['all', 'creative'], prompt: 'Brainstorm ý tưởng cho dự án mới' },
    { icon: '📊', title: 'Phân tích dữ liệu', desc: 'Yêu cầu AI phân tích và đưa ra insight từ dữ liệu', category: ['all', 'business', 'tech'], prompt: 'Phân tích dữ liệu bán hàng quý vừa rồi' },
    { icon: '✍️', title: 'Viết bài blog', desc: 'Tạo nội dung blog hấp dẫn, đúng chuẩn SEO', category: ['all', 'marketing', 'creative'], prompt: 'Viết một bài blog về xu hướng công nghệ' },
    { icon: '🎯', title: 'Tóm tắt văn bản', desc: 'Rút gọn nội dung dài thành các điểm chính', category: ['all'], prompt: 'Tóm tắt văn bản sau cho tôi' },
    { icon: '🌐', title: 'Dịch thuật', desc: 'Dịch văn bản giữ nguyên ngữ cảnh và sắc thái', category: ['all'], prompt: 'Dịch đoạn văn này sang tiếng Anh' },

    // Kinh doanh
    { icon: '📈', title: 'Lập kế hoạch kinh doanh', desc: 'Xây dựng kế hoạch kinh doanh chi tiết và khả thi', category: ['business'], prompt: 'Lập kế hoạch kinh doanh cho startup' },
    { icon: '🤝', title: 'Đề xuất hợp tác', desc: 'Soạn đề xuất hợp tác chuyên nghiệp, thuyết phục', category: ['business'], prompt: 'Viết đề xuất hợp tác giữa hai công ty' },
    { icon: '💼', title: 'Mô tả công việc', desc: 'Tạo JD thu hút ứng viên phù hợp', category: ['business'], prompt: 'Viết mô tả công việc cho vị trí marketing manager' },

    // Marketing
    { icon: '📱', title: 'Content mạng xã hội', desc: 'Tạo bài đăng viral cho các nền tảng social media', category: ['marketing'], prompt: 'Viết bài đăng Facebook quảng bá sản phẩm mới' },
    { icon: '🎨', title: 'Brief sáng tạo', desc: 'Soạn brief cho đội thiết kế hoặc agency', category: ['marketing', 'creative'], prompt: 'Viết creative brief cho chiến dịch marketing' },
    { icon: '📧', title: 'Email marketing', desc: 'Soạn email marketing tăng tỷ lệ mở và chuyển đổi', category: ['marketing'], prompt: 'Viết email marketing cho chương trình khuyến mãi' },

    // Giáo dục
    { icon: '📚', title: 'Giải thích khái niệm', desc: 'Giải thích các khái niệm phức tạp một cách dễ hiểu', category: ['education'], prompt: 'Giải thích machine learning cho người mới bắt đầu' },
    { icon: '📋', title: 'Tạo bài kiểm tra', desc: 'Thiết kế câu hỏi đánh giá kiến thức', category: ['education'], prompt: 'Tạo bài kiểm tra về lịch sử Việt Nam' },
    { icon: '🎓', title: 'Kế hoạch học tập', desc: 'Lên lộ trình học tập cá nhân hóa', category: ['education'], prompt: 'Lập kế hoạch học lập trình Python trong 3 tháng' },

    // Công nghệ
    { icon: '💻', title: 'Review code', desc: 'Yêu cầu AI review và cải thiện code', category: ['tech'], prompt: 'Review đoạn code Python của tôi' },
    { icon: '🏗️', title: 'Kiến trúc hệ thống', desc: 'Thiết kế kiến trúc phần mềm tối ưu', category: ['tech'], prompt: 'Thiết kế kiến trúc microservices cho ứng dụng e-commerce' },
    { icon: '🐛', title: 'Debug lỗi', desc: 'Tìm và sửa lỗi trong code nhanh chóng', category: ['tech'], prompt: 'Tìm lỗi trong đoạn code sau' },

    // Sáng tạo
    { icon: '🎬', title: 'Kịch bản video', desc: 'Viết kịch bản video sáng tạo, hấp dẫn', category: ['creative'], prompt: 'Viết kịch bản video giới thiệu sản phẩm' },
    { icon: '🖼️', title: 'Prompt hình ảnh AI', desc: 'Tạo prompt chi tiết cho Midjourney, DALL-E', category: ['creative'], prompt: 'Tạo hình ảnh một quán café Việt Nam hiện đại' },
    { icon: '📖', title: 'Viết truyện ngắn', desc: 'Sáng tác truyện ngắn với cốt truyện hấp dẫn', category: ['creative'], prompt: 'Viết một truyện ngắn về Hà Nội' },
  ];

  // ===== THEME =====
  function initTheme() {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    currentTheme = prefersDark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcons();
  }

  function toggleTheme() {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcons();
  }

  function updateThemeIcons() {
    const sunIcon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
    const moonIcon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    const icon = currentTheme === 'dark' ? sunIcon : moonIcon;
    $$('[data-theme-toggle], [data-theme-toggle-mobile]').forEach(el => {
      el.innerHTML = icon;
    });
  }

  // ===== SIDEBAR =====
  function openSidebar() {
    sidebar.classList.add('open');
    sidebarOverlay.classList.add('active');
    sidebarOverlay.style.display = 'block';
  }

  function closeSidebar() {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('active');
    setTimeout(() => {
      if (!sidebar.classList.contains('open')) {
        sidebarOverlay.style.display = '';
      }
    }, 300);
  }

  // ===== CREATIVITY =====
  function initCreativity() {
    $$('.creativity-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        $$('.creativity-pill').forEach(p => {
          p.classList.remove('active');
          p.setAttribute('aria-checked', 'false');
        });
        pill.classList.add('active');
        pill.setAttribute('aria-checked', 'true');
        selectedCreativity = pill.dataset.creativity;
      });
    });
  }

  // ===== RULES =====
  function initRules() {
    $$('.rule-toggle').forEach(toggle => {
      toggle.addEventListener('click', () => {
        const rule = toggle.dataset.rule;
        const isActive = toggle.classList.contains('active');

        if (isActive) {
          toggle.classList.remove('active');
          toggle.setAttribute('aria-pressed', 'false');
          activeRules = activeRules.filter(r => r !== rule);
        } else {
          toggle.classList.add('active');
          toggle.setAttribute('aria-pressed', 'true');
          activeRules.push(rule);
        }
      });
    });
  }

  // ===== SEND BUTTON STATE =====
  function updateSendButton() {
    const hasText = promptInput.value.trim().length > 0;
    sendBtn.disabled = !hasText || isStreaming;
  }

  // ===== USAGE UI =====
  function updateUsageUI() {
    const usageBar = $('#usageBar');
    const usageText = $('#usageText');
    const usageFill = $('#usageFill');
    if (!usageBar) return;

    const limit = getLimit();
    const isUnlimited = limit === Infinity;

    if (isUnlimited) {
      usageText.textContent = `${usageToday} lượt hôm nay — Không giới hạn`;
      usageFill.style.width = '100%';
      usageFill.classList.remove('usage-warning', 'usage-danger');
      usageFill.classList.add('usage-unlimited');
    } else {
      const remaining = Math.max(0, limit - usageToday);
      usageText.textContent = `${usageToday}/${limit} lượt hôm nay`;
      const pct = Math.min(100, (usageToday / limit) * 100);
      usageFill.style.width = pct + '%';
      usageFill.classList.remove('usage-unlimited', 'usage-warning', 'usage-danger');
      if (pct >= 100) {
        usageFill.classList.add('usage-danger');
      } else if (pct >= 70) {
        usageFill.classList.add('usage-warning');
      }
    }
  }

  function updatePlanBadge() {
    const planBadge = $('#planBadge');
    const planBadgeName = $('#planBadgeName');
    const planExpireText = $('#planExpireText');
    if (!planBadge) return;

    const config = PLAN_CONFIG[currentPlan] || PLAN_CONFIG.free;
    planBadge.className = 'plan-badge plan-badge-' + config.color;
    planBadgeName.textContent = config.badge + ' ' + config.name;

    if (planExpires && currentPlan !== 'free') {
      const expDate = new Date(planExpires);
      const now = new Date();
      const diffDays = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));

      if (diffDays <= 0) {
        planExpireText.textContent = 'Đã hết hạn';
        planExpireText.classList.add('expired');
        // Reset to free
        currentPlan = 'free';
        planBadge.className = 'plan-badge plan-badge-default';
        planBadgeName.textContent = PLAN_CONFIG.free.badge + ' ' + PLAN_CONFIG.free.name;
        planExpireText.textContent = '';
      } else if (diffDays <= 7) {
        planExpireText.textContent = `Còn ${diffDays} ngày`;
        planExpireText.classList.add('expiring-soon');
      } else {
        planExpireText.textContent = `HSD: ${expDate.toLocaleDateString('vi-VN')}`;
        planExpireText.classList.remove('expired', 'expiring-soon');
      }
    } else {
      planExpireText.textContent = '';
      planExpireText.classList.remove('expired', 'expiring-soon');
    }
  }

  // ===== RENDER TIPS =====
  function renderTips(tips) {
    if (tips && tips.length > 0) {
      outputTips.style.display = 'flex';
      outputTips.innerHTML = tips.map(tip =>
        `<button class="output-tip" data-tip="${tip.replace(/"/g, '&quot;')}" type="button">
          <svg class="output-tip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          <span>${tip}</span>
        </button>`
      ).join('');

      // Attach click handlers for tip chips
      outputTips.querySelectorAll('.output-tip').forEach(tipBtn => {
        tipBtn.addEventListener('click', () => {
          const tipText = tipBtn.dataset.tip;
          const currentVal = promptInput.value.trim();
          if (currentVal) {
            promptInput.value = currentVal + '\n\n[Áp dụng gợi ý: ' + tipText + ']';
          } else {
            promptInput.value = '[Áp dụng gợi ý: ' + tipText + ']';
          }
          updateSendButton();
          autoResize();
          enhancePrompt();
        });
      });
    } else {
      outputTips.style.display = 'none';
      outputTips.innerHTML = '';
    }
  }

  // ===== ENHANCE PROMPT =====
  async function enhancePrompt() {
    const prompt = promptInput.value.trim();
    if (!prompt || isStreaming) return;

    // Check usage limit
    if (!canUse()) {
      const limit = getLimit();
      const planName = PLAN_CONFIG[currentPlan]?.name || 'Miễn phí';

      // Show limit reached message
      heroSection.classList.add('has-output');
      outputSection.style.display = 'block';
      skeletonLoader.style.display = 'none';
      loadingMessage.style.display = 'none';
      outputTips.style.display = 'none';
      refinementBar.style.display = 'none';

      if (currentPlan === 'free') {
        outputBody.innerHTML = `<div class="limit-reached">
          <div class="limit-reached-icon">⚡</div>
          <div class="limit-reached-title">Hết lượt miễn phí hôm nay</div>
          <div class="limit-reached-desc">Bạn đã dùng hết ${limit} lượt miễn phí trong ngày. Nâng cấp để có thêm lượt sử dụng.</div>
          <button class="limit-reached-btn" onclick="document.querySelector('#pricingSection').scrollIntoView({behavior:'smooth'})">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            Xem bảng giá
          </button>
        </div>`;
      } else {
        outputBody.innerHTML = `<div class="limit-reached">
          <div class="limit-reached-icon">⏳</div>
          <div class="limit-reached-title">Hết lượt hôm nay</div>
          <div class="limit-reached-desc">Bạn đã dùng hết ${limit} lượt của gói ${planName}. Lượt sẽ được reset vào 0:00 ngày mai.</div>
        </div>`;
      }
      return;
    }

    isStreaming = true;
    updateSendButton();

    // Show loading state on send button
    sendBtn.classList.add('loading');
    sendBtn.innerHTML = '<svg class="spinner-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10" opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" stroke-width="2.5"/></svg>';

    // Show output section with skeleton
    heroSection.classList.add('has-output');
    outputSection.style.display = 'block';
    outputBody.textContent = '';
    outputTips.style.display = 'none';
    outputTips.innerHTML = '';
    refinementBar.style.display = 'none';
    skeletonLoader.style.display = 'block';
    loadingMessage.style.display = 'flex';
    copyBtn.classList.remove('copied');
    copyText.textContent = 'Sao chép';

    // Scroll to output
    outputSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    try {
      const response = await fetch(`${API}/api/enhance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt,
          type: promptType.value,
          creativity: selectedCreativity,
          rules: activeRules,
          user_id: window.Clerk?.user?.id || 'anonymous',
          plan: currentPlan,
        }),
      });

      if (!response.ok) throw new Error('Lỗi kết nối server');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';

      // Hide skeleton & loading message, show body
      skeletonLoader.style.display = 'none';
      loadingMessage.style.display = 'none';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const data = JSON.parse(jsonStr);

            if (data.type === 'chunk') {
              fullText += data.content;
            } else if (data.type === 'done') {
              // Use the parsed enhanced prompt if available
              if (data.enhanced) {
                outputBody.textContent = data.enhanced;
                currentEnhancedPrompt = data.enhanced;
              } else {
                outputBody.textContent = fullText;
                currentEnhancedPrompt = fullText;
              }
              currentOriginalPrompt = prompt;

              // Show tips
              renderTips(data.tips);

              // Show refinement bar
              refinementBar.style.display = 'flex';

              // Show "use" buttons
              showUseButtons();

              // Add to history & increment usage
              addToHistory(prompt, currentEnhancedPrompt, data.tips || []);
              incrementUsage();
            } else if (data.type === 'error') {
              outputBody.textContent = '❌ Lỗi: ' + data.message;
            }
          } catch(e) {
            // JSON parse error, skip
          }
        }

        // Show streaming text (raw, will be replaced by parsed on done)
        if (fullText && !outputBody.textContent) {
          try {
            const partial = JSON.parse(fullText);
            outputBody.textContent = partial.enhanced || fullText;
          } catch {
            outputBody.textContent = fullText;
          }
        }
      }

      // If we never got a 'done' event, show what we have
      if (!outputBody.textContent && fullText) {
        try {
          const parsed = JSON.parse(fullText);
          outputBody.textContent = parsed.enhanced || fullText;
          currentEnhancedPrompt = parsed.enhanced || fullText;
          currentOriginalPrompt = prompt;
          renderTips(parsed.tips);
          refinementBar.style.display = 'flex';
          showUseButtons();
          addToHistory(prompt, currentEnhancedPrompt, parsed.tips || []);
          incrementUsage();
        } catch {
          outputBody.textContent = fullText;
          currentEnhancedPrompt = fullText;
          currentOriginalPrompt = prompt;
          refinementBar.style.display = 'flex';
          showUseButtons();
          addToHistory(prompt, fullText, []);
          incrementUsage();
        }
      }

    } catch (error) {
      skeletonLoader.style.display = 'none';
      loadingMessage.style.display = 'none';
      outputBody.textContent = '❌ Không thể kết nối đến server. Vui lòng thử lại sau.';
    }

    // Restore send button
    sendBtn.classList.remove('loading');
    sendBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
    isStreaming = false;
    updateSendButton();
  }

  // ===== REFINE PROMPT =====
  async function refinePrompt() {
    const instruction = refinementInput.value.trim();
    if (!instruction || isStreaming) return;
    if (!currentEnhancedPrompt) return;

    isStreaming = true;
    refinementSendBtn.disabled = true;
    refinementInput.disabled = true;

    // Show loading
    skeletonLoader.style.display = 'block';
    loadingMessage.style.display = 'flex';
    outputBody.textContent = '';
    outputTips.style.display = 'none';
    outputTips.innerHTML = '';

    try {
      const response = await fetch(`${API}/api/refine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          original_prompt: currentOriginalPrompt,
          enhanced_prompt: currentEnhancedPrompt,
          instruction: instruction,
          user_id: window.Clerk?.user?.id || 'anonymous',
          plan: currentPlan,
        }),
      });

      if (!response.ok) throw new Error('Lỗi kết nối server');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';

      skeletonLoader.style.display = 'none';
      loadingMessage.style.display = 'none';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const data = JSON.parse(jsonStr);
            if (data.type === 'chunk') {
              fullText += data.content;
            } else if (data.type === 'done') {
              const refined = data.enhanced || fullText;
              outputBody.textContent = refined;
              currentEnhancedPrompt = refined;
              renderTips(data.tips);
            } else if (data.type === 'error') {
              outputBody.textContent = '❌ Lỗi: ' + data.message;
            }
          } catch(e) {}
        }

        if (fullText && !outputBody.textContent) {
          try {
            const partial = JSON.parse(fullText);
            outputBody.textContent = partial.enhanced || fullText;
          } catch {
            outputBody.textContent = fullText;
          }
        }
      }

      if (!outputBody.textContent && fullText) {
        try {
          const parsed = JSON.parse(fullText);
          outputBody.textContent = parsed.enhanced || fullText;
          currentEnhancedPrompt = parsed.enhanced || fullText;
          renderTips(parsed.tips);
        } catch {
          outputBody.textContent = fullText;
          currentEnhancedPrompt = fullText;
        }
      }

    } catch (error) {
      skeletonLoader.style.display = 'none';
      loadingMessage.style.display = 'none';
      outputBody.textContent = '❌ Không thể kết nối đến server. Vui lòng thử lại sau.';
    }

    refinementInput.value = '';
    refinementSendBtn.disabled = false;
    refinementInput.disabled = false;
    isStreaming = false;
  }

  // ===== HISTORY =====
  function addToHistory(original, enhanced, tips) {
    const item = {
      original: original,
      enhanced: enhanced,
      tips: tips || [],
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };
    history.unshift(item);
    if (history.length > 20) history.pop();
    renderHistory();
  }

  function renderHistory() {
    if (history.length === 0) {
      historyList.innerHTML = '<div class="sidebar-history-empty" style="font-size: var(--text-xs); color: var(--color-text-faint); padding: var(--space-2) var(--space-3); text-align: center;">Chưa có lịch sử</div>';
      return;
    }

    historyList.innerHTML = history.map((item, i) =>
      `<button class="sidebar-history-item" data-index="${i}" role="listitem" title="${item.original}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;opacity:0.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        <span style="overflow:hidden;text-overflow:ellipsis;">${item.original.substring(0, 40)}${item.original.length > 40 ? '...' : ''}</span>
      </button>`
    ).join('');

    // Click handler
    historyList.querySelectorAll('.sidebar-history-item').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.index);
        const item = history[idx];
        if (item) {
          promptInput.value = item.original;
          outputBody.textContent = item.enhanced;
          heroSection.classList.add('has-output');
          outputSection.style.display = 'block';
          skeletonLoader.style.display = 'none';
          loadingMessage.style.display = 'none';
          // Restore tips
          renderTips(item.tips);
          // Set refinement state
          currentOriginalPrompt = item.original;
          currentEnhancedPrompt = item.enhanced;
          // Show refinement bar
          refinementBar.style.display = 'flex';
          showUseButtons();
          updateSendButton();
          closeSidebar();
          heroSection.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  }

  // ===== "USE" BUTTONS (ChatGPT / Gemini) =====
  function showUseButtons() {
    if (openChatGPTBtn) openChatGPTBtn.style.display = 'flex';
    if (openGeminiBtn) openGeminiBtn.style.display = 'flex';
  }

  function hideUseButtons() {
    if (openChatGPTBtn) openChatGPTBtn.style.display = 'none';
    if (openGeminiBtn) openGeminiBtn.style.display = 'none';
  }

  function openInChatGPT() {
    const text = outputBody.textContent;
    if (!text) return;
    const url = 'https://chatgpt.com/?q=' + encodeURIComponent(text);
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function openInGemini() {
    const text = outputBody.textContent;
    if (!text) return;
    const url = 'https://gemini.google.com/app?q=' + encodeURIComponent(text);
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  // ===== ZALO FAB DISMISS =====
  let zaloFabDismissed = false;

  function initZaloFab() {
    const zaloFabClose = $('#zaloFabClose');
    const zaloFabWrapper = $('#zaloFabWrapper');
    if (zaloFabClose && zaloFabWrapper) {
      zaloFabClose.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        zaloFabWrapper.classList.add('hidden');
        zaloFabDismissed = true;
      });
    }
  }

  // ===== HISTORY FREE PLAN NOTE =====
  function updateHistoryFreePlanNote() {
    const note = $('#historyFreePlanNote');
    if (!note) return;
    if (currentPlan === 'free') {
      note.style.display = 'flex';
    } else {
      note.style.display = 'none';
    }
  }

  // ===== COPY =====
  function copyToClipboard() {
    const text = outputBody.textContent;
    if (!text) return;

    navigator.clipboard.writeText(text).then(() => {
      copyBtn.classList.add('copied');
      copyText.textContent = 'Đã sao chép!';
      setTimeout(() => {
        copyBtn.classList.remove('copied');
        copyText.textContent = 'Sao chép';
      }, 2000);
    }).catch(() => {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      copyBtn.classList.add('copied');
      copyText.textContent = 'Đã sao chép!';
      setTimeout(() => {
        copyBtn.classList.remove('copied');
        copyText.textContent = 'Sao chép';
      }, 2000);
    });
  }

  // ===== TEMPLATES =====
  function renderTemplates(category) {
    const filtered = category === 'all'
      ? templates
      : templates.filter(t => t.category.includes(category));

    templateGrid.innerHTML = filtered.map((t, i) =>
      `<div class="template-card" data-index="${i}" style="animation: slideUp 0.4s var(--ease-golden) ${i * 0.04}s both;">
        <div class="template-icon">${t.icon}</div>
        <div class="template-title">${t.title}</div>
        <div class="template-desc">${t.desc}</div>
      </div>`
    ).join('');

    // Click handler
    templateGrid.querySelectorAll('.template-card').forEach(card => {
      card.addEventListener('click', () => {
        const idx = parseInt(card.dataset.index);
        const template = filtered[idx];
        if (template) {
          promptInput.value = template.prompt;
          promptInput.focus();
          updateSendButton();
          updateCharCount();
          heroSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  function initDiscoveryTabs() {
    $$('.discovery-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        $$('.discovery-tab').forEach(t => {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        currentCategory = tab.dataset.category;
        renderTemplates(currentCategory);
      });
    });
  }

  // ===== NEW PROMPT =====
  function newPrompt() {
    promptInput.value = '';
    outputSection.style.display = 'none';
    outputBody.textContent = '';
    outputTips.style.display = 'none';
    outputTips.innerHTML = '';
    refinementBar.style.display = 'none';
    heroSection.classList.remove('has-output');
    // Reset rules
    activeRules = [];
    document.querySelectorAll('.rule-toggle').forEach(t => {
      t.classList.remove('active');
      t.setAttribute('aria-pressed', 'false');
    });
    currentOriginalPrompt = '';
    currentEnhancedPrompt = '';
    hideUseButtons();
    updateSendButton();
    updateCharCount();
    promptInput.focus();
    closeSidebar();
  }

  // ===== AUTO-RESIZE TEXTAREA =====
  function autoResize() {
    promptInput.style.height = 'auto';
    const maxH = 300;
    promptInput.style.height = Math.min(promptInput.scrollHeight, maxH) + 'px';
  }

  // ===== CHARACTER COUNT =====
  function updateCharCount() {
    if (!charCount) return;
    const len = promptInput.value.length;
    charCount.textContent = len + ' ký tự';
    if (len > 2000) {
      charCount.classList.add('char-count-warn');
    } else {
      charCount.classList.remove('char-count-warn');
    }
  }

  // ===== ROTATING PLACEHOLDERS =====
  const placeholders = [
    'Ví dụ: Viết cho tôi một bài blog về AI...',
    'Ví dụ: Tạo kế hoạch marketing cho startup...',
    'Ví dụ: Giải thích machine learning đơn giản...',
    'Ví dụ: Viết email xin việc chuyên nghiệp...',
    'Ví dụ: Phân tích dữ liệu bán hàng Q4...',
    'Ví dụ: Viết prompt tạo hình ảnh Midjourney...',
  ];
  let placeholderIdx = 0;
  let placeholderInterval = null;
  let inputFocused = false;

  function startPlaceholderRotation() {
    placeholderInterval = setInterval(() => {
      if (!inputFocused && !promptInput.value) {
        placeholderIdx = (placeholderIdx + 1) % placeholders.length;
        promptInput.classList.add('placeholder-fade');
        setTimeout(() => {
          promptInput.placeholder = placeholders[placeholderIdx];
          promptInput.classList.remove('placeholder-fade');
        }, 200);
      }
    }, 3000);
  }

  function initPlaceholders() {
    promptInput.placeholder = placeholders[0];
    promptInput.addEventListener('focus', () => { inputFocused = true; });
    promptInput.addEventListener('blur', () => { inputFocused = false; });
    startPlaceholderRotation();
  }

  // ===== PAYMENT MODAL =====
  const paymentModal = $('#paymentModal');
  const paymentModalClose = $('#paymentModalClose');
  const paymentPlanTag = $('#paymentPlanTag');
  const paymentAmount = $('#paymentAmount');
  const paymentContent = $('#paymentContent');
  const copyStkBtn = $('#copyStkBtn');

  const planNames = {
    student: 'Gói Sinh viên',
    pro: 'Gói Pro',
    yearly: 'Gói Pro Năm',
  };

  const planContents = {
    student: 'PROMPTMASTER SV',
    pro: 'PROMPTMASTER PRO',
    yearly: 'PROMPTMASTER PRONAM',
  };

  function formatVND(num) {
    return num.toLocaleString('vi-VN') + 'đ';
  }

  function openPaymentModal(plan, price) {
    paymentPlanTag.textContent = planNames[plan] || plan;
    paymentAmount.textContent = formatVND(price);
    paymentContent.textContent = planContents[plan] || 'PROMPTMASTER';
    paymentModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function closePaymentModal() {
    paymentModal.style.display = 'none';
    document.body.style.overflow = '';
  }

  function initPricing() {
    // Pricing buttons
    $$('.pricing-btn-primary[data-plan]').forEach(btn => {
      btn.addEventListener('click', () => {
        // Check if user is logged in first
        if (!window.Clerk?.user) {
          window.Clerk?.openSignIn();
          return;
        }
        const plan = btn.dataset.plan;
        const price = parseInt(btn.dataset.price);
        openPaymentModal(plan, price);
      });
    });

    // Close modal
    if (paymentModalClose) {
      paymentModalClose.addEventListener('click', closePaymentModal);
    }

    // Close on overlay click
    if (paymentModal) {
      paymentModal.addEventListener('click', (e) => {
        if (e.target === paymentModal) closePaymentModal();
      });
    }

    // Copy STK
    if (copyStkBtn) {
      copyStkBtn.addEventListener('click', () => {
        const stk = '9990100199404';
        navigator.clipboard.writeText(stk).then(() => {
          copyStkBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
          setTimeout(() => {
            copyStkBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
          }, 2000);
        }).catch(() => {
          const ta = document.createElement('textarea');
          ta.value = stk;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
        });
      });
    }
  }

  // ===== CLERK AUTH =====
  async function initClerk() {
    // Wait for Clerk to be available
    if (typeof window.Clerk === 'undefined') {
      await new Promise((resolve) => {
        const check = setInterval(() => {
          if (typeof window.Clerk !== 'undefined') {
            clearInterval(check);
            resolve();
          }
        }, 100);
        setTimeout(() => { clearInterval(check); resolve(); }, 10000);
      });
    }

    if (typeof window.Clerk === 'undefined') {
      console.warn('Clerk SDK not loaded');
      loadUsage();
      updateUsageUI();
      updatePlanBadge();
      return;
    }

    try {
      await window.Clerk.load({
        localization: {
          locale: 'vi-VN',
        },
      });
    } catch (e) {
      console.warn('Clerk load error:', e);
      loadUsage();
      updateUsageUI();
      updatePlanBadge();
      return;
    }

    const authLoggedOut = $('#authLoggedOut');
    const authLoggedIn = $('#authLoggedIn');
    const authAvatar = $('#authAvatar');
    const authUserName = $('#authUserName');
    const authUserEmail = $('#authUserEmail');
    const authLoginBtn = $('#authLoginBtn');
    const authSignupBtn = $('#authSignupBtn');
    const authLogoutBtn = $('#authLogoutBtn');
    const mobileAuthBtn = $('#mobileAuthBtn');

    function updateAuthUI() {
      const user = window.Clerk.user;
      if (user) {
        // Logged in
        authLoggedOut.style.display = 'none';
        authLoggedIn.style.display = 'flex';
        authAvatar.src = user.imageUrl || '';
        authUserName.textContent = user.fullName || user.firstName || 'Người dùng';
        authUserEmail.textContent = user.primaryEmailAddress?.emailAddress || '';

        // Mobile button - show avatar
        mobileAuthBtn.classList.add('logged-in');
        mobileAuthBtn.innerHTML = `<img src="${user.imageUrl || ''}" alt="Avatar" width="36" height="36">`;

        // Read plan from public metadata
        const meta = user.publicMetadata || {};
        currentPlan = meta.plan || 'free';
        planExpires = meta.expires || null;

        // Validate expiration
        if (planExpires && currentPlan !== 'free') {
          const expDate = new Date(planExpires);
          if (expDate < new Date()) {
            currentPlan = 'free';
            planExpires = null;
          }
        }
      } else {
        // Logged out
        authLoggedOut.style.display = 'flex';
        authLoggedIn.style.display = 'none';
        currentPlan = 'free';
        planExpires = null;

        // Mobile button - show icon
        mobileAuthBtn.classList.remove('logged-in');
        mobileAuthBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
      }

      // Update membership UI
      loadUsage();
      updateUsageUI();
      updatePlanBadge();
      syncUsageFromBackend();
      updateHistoryFreePlanNote();

      // Broadcast auth data for extension sync
      broadcastAuthForExtension(user);
    }

    // Listen for auth state changes
    window.Clerk.addListener(updateAuthUI);

    // Initial UI update
    updateAuthUI();

    // Login button
    if (authLoginBtn) {
      authLoginBtn.addEventListener('click', () => {
        window.Clerk.openSignIn();
      });
    }

    // Signup button
    if (authSignupBtn) {
      authSignupBtn.addEventListener('click', () => {
        window.Clerk.openSignUp();
      });
    }

    // Logout button
    if (authLogoutBtn) {
      authLogoutBtn.addEventListener('click', async () => {
        await window.Clerk.signOut();
      });
    }

    // Mobile auth button
    if (mobileAuthBtn) {
      mobileAuthBtn.addEventListener('click', () => {
        if (window.Clerk.user) {
          window.Clerk.openUserProfile();
        } else {
          window.Clerk.openSignIn();
        }
      });
    }
  }

  // ===== EXTENSION AUTH SYNC =====
  function broadcastAuthForExtension(user) {
    try {
      const data = user ? {
        userId: user.id,
        fullName: user.fullName || user.firstName || '',
        email: user.primaryEmailAddress?.emailAddress || '',
        imageUrl: user.imageUrl || '',
        plan: user.publicMetadata?.plan || 'free',
        expires: user.publicMetadata?.expires || null,
      } : null;

      // Store in a hidden element for extension to read
      let el = document.getElementById('pm-ext-auth');
      if (!el) {
        el = document.createElement('div');
        el.id = 'pm-ext-auth';
        el.style.display = 'none';
        document.body.appendChild(el);
      }
      el.setAttribute('data-auth', JSON.stringify(data));

      // Also dispatch a custom event
      window.dispatchEvent(new CustomEvent('pm-auth-update', { detail: data }));
    } catch (_) {}
  }

  // Listen for extension requesting auth data
  window.addEventListener('message', (e) => {
    if (e.data?.type === 'PM_GET_AUTH') {
      const user = window.Clerk?.user;
      const data = user ? {
        userId: user.id,
        fullName: user.fullName || user.firstName || '',
        email: user.primaryEmailAddress?.emailAddress || '',
        imageUrl: user.imageUrl || '',
        plan: user.publicMetadata?.plan || 'free',
        expires: user.publicMetadata?.expires || null,
      } : null;
      window.postMessage({ type: 'PM_AUTH_DATA', data }, '*');
    }
  });

  // ===== INIT =====
  function init() {
    initTheme();
    initCreativity();
    initRules();
    initDiscoveryTabs();
    renderTemplates('all');
    renderHistory();
    initPricing();
    initClerk();
    initPlaceholders();
    initZaloFab();
    updateHistoryFreePlanNote();

    // Event listeners
    promptInput.addEventListener('input', () => {
      updateSendButton();
      autoResize();
      updateCharCount();
    });

    promptInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!sendBtn.disabled) enhancePrompt();
      }
    });

    sendBtn.addEventListener('click', enhancePrompt);
    copyBtn.addEventListener('click', copyToClipboard);
    newPromptBtn.addEventListener('click', newPrompt);

    // "Use" buttons
    if (openChatGPTBtn) openChatGPTBtn.addEventListener('click', openInChatGPT);
    if (openGeminiBtn) openGeminiBtn.addEventListener('click', openInGemini);

    // History upgrade link
    const historyUpgradeLink = $('#historyUpgradeLink');
    if (historyUpgradeLink) {
      historyUpgradeLink.addEventListener('click', (e) => {
        e.preventDefault();
        closeSidebar();
        const pricing = $('#pricingSection');
        if (pricing) pricing.scrollIntoView({ behavior: 'smooth' });
      });
    }

    // Refinement bar
    if (refinementSendBtn) {
      refinementSendBtn.addEventListener('click', refinePrompt);
    }
    if (refinementInput) {
      refinementInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          refinePrompt();
        }
      });
    }

    // Theme toggles
    $$('[data-theme-toggle], [data-theme-toggle-mobile]').forEach(el => {
      el.addEventListener('click', toggleTheme);
    });

    // Mobile sidebar
    hamburgerBtn.addEventListener('click', openSidebar);
    sidebarOverlay.addEventListener('click', closeSidebar);

    // Close sidebar/modal on escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeSidebar();
        closePaymentModal();
      }
    });

    // Initial send button state
    updateSendButton();
    updateCharCount();

    // Sidebar pricing button
    const sidebarPricingBtn = $('#sidebarPricingBtn');
    if (sidebarPricingBtn) {
      sidebarPricingBtn.addEventListener('click', () => {
        const pricing = $('#pricingSection');
        if (pricing) {
          closeSidebar();
          pricing.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }
  }

  // Start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
