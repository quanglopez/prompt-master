/* app.js — Prompt Master Application Logic */

(function() {
  'use strict';

  const API = 'port/8000';

  // ===== STATE =====
  let currentTheme = 'light';
  let selectedCreativity = 'balanced';
  let activeRules = [];
  let history = [];
  let isStreaming = false;
  let currentCategory = 'all';

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
  const copyBtn = $('#copyBtn');
  const copyText = $('#copyText');
  const historyList = $('#historyList');
  const newPromptBtn = $('#newPromptBtn');
  const hamburgerBtn = $('#hamburgerBtn');
  const sidebar = $('#sidebar');
  const sidebarOverlay = $('#sidebarOverlay');
  const discoverySection = $('#discoverySection');
  const templateGrid = $('#templateGrid');

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

  // ===== ENHANCE PROMPT =====
  async function enhancePrompt() {
    const prompt = promptInput.value.trim();
    if (!prompt || isStreaming) return;

    isStreaming = true;
    updateSendButton();

    // Show output section with skeleton
    heroSection.classList.add('has-output');
    heroTitle.style.display = 'none';
    heroSubtitle.style.display = 'none';
    outputSection.style.display = 'block';
    outputBody.textContent = '';
    outputTips.style.display = 'none';
    outputTips.innerHTML = '';
    skeletonLoader.style.display = 'block';
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
        }),
      });

      if (!response.ok) throw new Error('Lỗi kết nối server');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';

      // Hide skeleton, show body
      skeletonLoader.style.display = 'none';

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
              } else {
                outputBody.textContent = fullText;
              }

              // Show tips
              if (data.tips && data.tips.length > 0) {
                outputTips.style.display = 'flex';
                outputTips.innerHTML = data.tips.map(tip =>
                  `<div class="output-tip">
                    <svg class="output-tip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                    <span>${tip}</span>
                  </div>`
                ).join('');
              }

              // Add to history
              addToHistory(prompt, data.enhanced || fullText);
            } else if (data.type === 'error') {
              outputBody.textContent = '❌ Lỗi: ' + data.message;
            }
          } catch(e) {
            // JSON parse error, skip
          }
        }

        // Show streaming text (raw, will be replaced by parsed on done)
        if (fullText && !outputBody.textContent) {
          // Try to show just the enhanced part if JSON is being built
          try {
            const partial = JSON.parse(fullText);
            outputBody.textContent = partial.enhanced || fullText;
          } catch {
            // Show raw for now, it's streaming
            outputBody.textContent = fullText;
          }
        }
      }

      // If we never got a 'done' event, show what we have
      if (!outputBody.textContent && fullText) {
        try {
          const parsed = JSON.parse(fullText);
          outputBody.textContent = parsed.enhanced || fullText;
          if (parsed.tips && parsed.tips.length > 0) {
            outputTips.style.display = 'flex';
            outputTips.innerHTML = parsed.tips.map(tip =>
              `<div class="output-tip">
                <svg class="output-tip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                <span>${tip}</span>
              </div>`
            ).join('');
          }
          addToHistory(prompt, parsed.enhanced || fullText);
        } catch {
          outputBody.textContent = fullText;
          addToHistory(prompt, fullText);
        }
      }

    } catch (error) {
      skeletonLoader.style.display = 'none';
      outputBody.textContent = '❌ Không thể kết nối đến server. Vui lòng thử lại sau.';
    }

    isStreaming = false;
    updateSendButton();
  }

  // ===== HISTORY =====
  function addToHistory(original, enhanced) {
    const item = {
      original: original,
      enhanced: enhanced,
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
          heroTitle.style.display = 'none';
          heroSubtitle.style.display = 'none';
          outputSection.style.display = 'block';
          skeletonLoader.style.display = 'none';
          updateSendButton();
          closeSidebar();
          heroSection.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
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
    heroSection.classList.remove('has-output');
    heroTitle.style.display = '';
    heroSubtitle.style.display = '';
    updateSendButton();
    promptInput.focus();
    closeSidebar();
  }

  // ===== AUTO-RESIZE TEXTAREA =====
  function autoResize() {
    promptInput.style.height = 'auto';
    const maxH = 300;
    promptInput.style.height = Math.min(promptInput.scrollHeight, maxH) + 'px';
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

  // ===== INIT =====
  function init() {
    initTheme();
    initCreativity();
    initRules();
    initDiscoveryTabs();
    renderTemplates('all');
    renderHistory();
    initPricing();

    // Event listeners
    promptInput.addEventListener('input', () => {
      updateSendButton();
      autoResize();
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
