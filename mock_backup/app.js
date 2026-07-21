/**
 * NEMS - Noxora Enterprise Management System
 * Core Application Engine
 * Version 1.0
 */

const NEMS_APP = {
  currentUser: null,
  activeRole: null,
  activeView: 'dashboard',
  isMobile: false,
  isOffline: false,
  language: 'ar',
  projectRoomTab: 'tasks',
  financeTab: 'transactions',
  ownersTab: 'board',
  settingsTab: 'company',
  otpTimerInterval: null,
  activeOTP: null,
  hourlyCheckInterval: null,

  // UI Translation Dictionaries
  translations: {
    ar: {
      appName: 'NEMS',
      welcome: 'مرحباً بك في NEMS',
      login: 'تسجيل الدخول',
      logout: 'تسجيل الخروج',
      dashboard: 'لوحة التحكم',
      employees: 'الموظفون',
      attendance: 'الحضور والانصراف',
      projects: 'المشاريع',
      tasks: 'المهام',
      finance: 'المالية والمحاسبة',
      owners: 'الملاك والأسهم',
      meetings: 'الاجتماعات',
      documents: 'الوثائق',
      messages: 'الرسائل',
      reports: 'التقارير',
      settings: 'الإعدادات',
      logs: 'سجل النظام',
      help: 'المساعدة',
      profile: 'الملف الشخصي',
      notifications: 'الإشعارات',
      search: 'البحث'
    },
    en: {
      appName: 'NEMS',
      welcome: 'Welcome to NEMS',
      login: 'Login',
      logout: 'Logout',
      dashboard: 'Dashboard',
      employees: 'Employees',
      attendance: 'Attendance',
      projects: 'Projects',
      tasks: 'Tasks',
      finance: 'Finance & Accounting',
      owners: 'Owners & Shares',
      meetings: 'Meetings',
      documents: 'Documents',
      messages: 'Messages',
      reports: 'Reports',
      settings: 'Settings',
      logs: 'System Logs',
      help: 'Help Center',
      profile: 'User Profile',
      notifications: 'Notifications',
      search: 'Search'
    }
  },

  // -------------------------------------------------------------------------
  // 1. INITIALIZATION & ROUTING
  // -------------------------------------------------------------------------
  init: function() {
    this.detectDevice();
    window.addEventListener('resize', () => this.detectDevice());
    
    // Check network status
    window.addEventListener('online', () => this.updateNetworkStatus(false));
    window.addEventListener('offline', () => this.updateNetworkStatus(true));
    
    // Load saved preferences
    const savedLang = localStorage.getItem('nems_pref_lang');
    if (savedLang) this.setLanguage(savedLang);

    const savedTheme = localStorage.getItem('nems_pref_theme');
    if (savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme);
    }

    // Load active session
    const sessionUser = sessionStorage.getItem('nems_session_user');
    if (sessionUser) {
      this.currentUser = JSON.parse(sessionUser);
      this.activeRole = window.NEMS_DB.getTable('roles').find(r => r.role_id === this.currentUser.role_id);
      
      // Update Dev select value
      document.getElementById('dev-role-select').value = this.currentUser.role_id;
      
      // Load UI colors
      this.applyBrandColors();
      
      // Simulate splash loading then navigate
      setTimeout(() => {
        document.getElementById('view-splash').style.display = 'none';
        document.getElementById('main-app').style.display = 'grid';
        this.navigateTo('dashboard');
        this.startHourlyAttendanceSimulator();
      }, 2000);
    } else {
      setTimeout(() => {
        document.getElementById('view-splash').style.display = 'none';
        this.showLogin();
      }, 2000);
    }

    this.updateStorageSizeGauge();
    this.animateSplashProgress();
  },

  animateSplashProgress: function() {
    const bar = document.getElementById('splash-bar');
    let width = 0;
    const interval = setInterval(() => {
      if (width >= 100) {
        clearInterval(interval);
      } else {
        width += 5;
        bar.style.width = width + '%';
      }
    }, 90);
  },

  detectDevice: function() {
    const width = window.innerWidth;
    const menuBtn = document.querySelector('.header .icon-btn');
    if (width <= 768) {
      this.isMobile = true;
      if (menuBtn) menuBtn.style.display = 'flex';
      document.querySelector('.sidebar').style.display = 'none';
    } else {
      this.isMobile = false;
      if (menuBtn) menuBtn.style.display = 'none';
      document.querySelector('.sidebar').style.display = 'flex';
    }
    if (this.currentUser) this.buildBottomNav();
  },

  navigateTo: function(view, params = null) {
    if (this.isOffline && view !== 'help' && view !== 'profile') {
      this.showToast('📡 لا يوجد اتصال بالإنترنت حالياً. يرجى إعادة المحاولة.', 'warning');
      return;
    }

    // Auth gate check
    if (!this.currentUser && view !== 'login') {
      this.showLogin();
      return;
    }

    // Role permission check
    if (this.currentUser && view !== 'profile' && view !== 'notifications' && view !== 'help') {
      const allowedModules = this.activeRole.sidebar_modules;
      if (view !== 'dashboard' && !allowedModules.includes(view) && this.currentUser.role_id !== 1) {
        this.showToast('ليس لديك صلاحية الوصول لهذه الوحدة.', 'danger');
        return;
      }
    }

    this.activeView = view;
    
    // Hide all view sections
    document.querySelectorAll('.page-section').forEach(sec => sec.style.display = 'none');

    // Update active nav in sidebar
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    const navItem = document.querySelector(`.nav-item[onclick*="'${view}'"]`);
    if (navItem) navItem.classList.add('active');

    // Update active nav in mobile bottombar
    document.querySelectorAll('.bottom-nav-item').forEach(item => item.classList.remove('active'));
    const mobNavItem = document.querySelector(`.bottom-nav-item[onclick*="'${view}'"]`);
    if (mobNavItem) mobNavItem.classList.add('active');

    // Show selected view
    const section = document.getElementById(`sec-${view}`);
    if (section) section.style.display = 'block';

    // Update Breadcrumbs
    this.updateBreadcrumbs(view);

    // Call render functions for specific views
    switch (view) {
      case 'dashboard':
        this.renderDashboard();
        break;
      case 'employees':
        this.renderEmployeesTable();
        break;
      case 'attendance':
        this.renderAttendanceView();
        break;
      case 'projects':
        this.renderProjectsView();
        break;
      case 'finance':
        this.renderFinanceView();
        break;
      case 'owners':
        this.renderOwnersView();
        break;
      case 'meetings':
        this.renderMeetingsView();
        break;
      case 'messages':
        this.renderMessagesView();
        break;
      case 'documents':
        this.renderDocumentsView();
        break;
      case 'settings':
        this.renderSettingsView();
        break;
      case 'notifications':
        this.renderNotificationsView();
        break;
      case 'profile':
        this.renderProfileView();
        break;
    }

    // Log to simulated UX interactions
    if (this.currentUser) {
      window.NEMS_DB.auditLog(this.currentUser.user_id, 'view_page', 'System', 'page', view, null, params);
    }
  },

  updateBreadcrumbs: function(view) {
    const crumbCurrent = document.getElementById('breadcrumb-current');
    if (crumbCurrent) {
      const label = this.translations[this.language][view] || view;
      crumbCurrent.textContent = label;
    }
  },

  // -------------------------------------------------------------------------
  // 2. AUTHENTICATION & LOGIN
  // -------------------------------------------------------------------------
  showLogin: function() {
    document.getElementById('view-splash').style.display = 'none';
    document.getElementById('main-app').style.display = 'none';
    document.getElementById('view-login').style.display = 'flex';
  },

  handleLogin: function() {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    const remember = document.getElementById('login-remember').checked;

    const users = window.NEMS_DB.getTable('users');
    const user = users.find(u => u.email === email && u.password_hash === pass);

    if (user) {
      if (user.status === 'suspended') {
        this.showToast('حسابك موقوف مؤقتاً. يرجى مراجعة إدارة الموارد البشرية.', 'danger');
        return;
      }

      this.currentUser = user;
      this.activeRole = window.NEMS_DB.getTable('roles').find(r => r.role_id === user.role_id);
      
      sessionStorage.setItem('nems_session_user', JSON.stringify(user));
      if (remember) {
        localStorage.setItem('nems_saved_email', email);
      } else {
        localStorage.removeItem('nems_saved_email');
      }

      // Update sidebar details
      document.getElementById('sidebar-username').textContent = user.name;
      document.getElementById('sidebar-userrole').textContent = this.activeRole.role_name;
      if (user.avatar) {
        document.getElementById('sidebar-user-avatar').src = user.avatar;
      }

      // Logging Audit
      window.NEMS_DB.auditLog(user.user_id, 'login', 'Users', 'session', user.user_id, null, { success: true });

      // Visual transitions
      document.getElementById('view-login').style.display = 'none';
      document.getElementById('main-app').style.display = 'grid';
      document.getElementById('system-fab-box').style.display = 'flex';

      // Load UI and go
      this.buildSidebarNav();
      this.buildBottomNav();
      this.applyBrandColors();
      this.navigateTo('dashboard');
      this.showToast('تم تسجيل الدخول بنجاح.', 'success');
      this.startHourlyAttendanceSimulator();
    } else {
      this.showToast('خطأ في البريد الإلكتروني أو كلمة المرور.', 'danger');
    }
  },

  handleLogout: function() {
    if (this.currentUser) {
      window.NEMS_DB.auditLog(this.currentUser.user_id, 'logout', 'Users', 'session', this.currentUser.user_id, null, null);
    }
    this.currentUser = null;
    this.activeRole = null;
    sessionStorage.removeItem('nems_session_user');
    
    // Stop intervals
    if (this.otpTimerInterval) clearInterval(this.otpTimerInterval);
    if (this.hourlyCheckInterval) clearInterval(this.hourlyCheckInterval);

    document.getElementById('system-fab-box').style.display = 'none';
    this.showLogin();
  },

  showForgotPassword: function() {
    document.getElementById('view-login').style.display = 'none';
    document.getElementById('view-recovery').style.display = 'flex';
    document.getElementById('recovery-step-email').style.display = 'block';
    document.getElementById('recovery-step-otp').style.display = 'none';
    document.getElementById('recovery-step-newpass').style.display = 'none';
  },

  sendRecoveryOTP: function() {
    const email = document.getElementById('recovery-email').value;
    if (!email) {
      this.showToast('يرجى إدخال بريدك أولاً.', 'warning');
      return;
    }

    const users = window.NEMS_DB.getTable('users');
    const user = users.find(u => u.email === email);
    if (!user) {
      this.showToast('البريد المدخل غير مسجل لدينا.', 'danger');
      return;
    }

    // Generate simulated 6 digit code
    this.activeOTP = String(Math.floor(100000 + Math.random() * 900000));
    document.getElementById('dev-otp-code').textContent = this.activeOTP;

    // Show step 2
    document.getElementById('recovery-step-email').style.display = 'none';
    document.getElementById('recovery-step-otp').style.display = 'block';

    // Start timer (5 minutes countdown)
    let time = 300;
    const timerText = document.getElementById('otp-timer');
    if (this.otpTimerInterval) clearInterval(this.otpTimerInterval);
    this.otpTimerInterval = setInterval(() => {
      if (time <= 0) {
        clearInterval(this.otpTimerInterval);
        this.activeOTP = null;
        timerText.textContent = 'منتهي الصلاحية';
      } else {
        time--;
        const mins = String(Math.floor(time / 60)).padStart(2, '0');
        const secs = String(time % 60).padStart(2, '0');
        timerText.textContent = `${mins}:${secs}`;
      }
    }, 1000);

    this.showToast('تم إرسال رمز التحقق للبريد (راجع لوحة المحاكاة).', 'info');
  },

  handleOtpInput: function(input, index) {
    if (input.value && index < 5) {
      input.nextElementSibling.focus();
    }
  },

  verifyRecoveryOTP: function() {
    const boxes = document.querySelectorAll('.otp-box');
    let code = '';
    boxes.forEach(b => code += b.value);

    if (this.activeOTP && code === this.activeOTP) {
      clearInterval(this.otpTimerInterval);
      this.showToast('تم التحقق بنجاح. يرجى وضع كلمة المرور الجديدة.', 'success');
      document.getElementById('recovery-step-otp').style.display = 'none';
      document.getElementById('recovery-step-newpass').style.display = 'block';
    } else {
      this.showToast('رمز التحقق خاطئ أو منتهي الصلاحية.', 'danger');
    }
  },

  checkPasswordStrength: function(val) {
    const bar = document.getElementById('pass-strength-bar');
    const text = document.getElementById('pass-strength-text');
    let strength = 0;
    
    if (val.length >= 6) strength += 25;
    if (val.match(/[A-Z]/)) strength += 25;
    if (val.match(/[0-9]/)) strength += 25;
    if (val.match(/[^A-Za-z0-9]/)) strength += 25;

    bar.style.width = strength + '%';
    if (strength <= 25) {
      bar.style.backgroundColor = 'var(--color-danger)';
      text.textContent = 'قوة كلمة المرور: ضعيفة 🔴';
    } else if (strength <= 75) {
      bar.style.backgroundColor = 'var(--color-secondary)';
      text.textContent = 'قوة كلمة المرور: متوسطة 🟡';
    } else {
      bar.style.backgroundColor = 'var(--color-success)';
      text.textContent = 'قوة كلمة المرور: قوية جداً 🟢';
    }
  },

  saveNewPassword: function() {
    const email = document.getElementById('recovery-email').value;
    const newPass = document.getElementById('recovery-newpass').value;
    const confirm = document.getElementById('recovery-confirm').value;

    if (!newPass || newPass !== confirm) {
      this.showToast('كلمتا المرور غير متطابقتين.', 'warning');
      return;
    }

    const users = window.NEMS_DB.getTable('users');
    const index = users.findIndex(u => u.email === email);
    if (index !== -1) {
      users[index].password_hash = newPass;
      window.NEMS_DB.saveTable('users', users);
      this.showToast('تم تحديث كلمة المرور بنجاح. سجل دخولك الآن.', 'success');
      
      // Audit log
      window.NEMS_DB.auditLog(users[index].user_id, 'password_reset', 'Users', 'user', users[index].user_id, null, null);
      
      document.getElementById('view-recovery').style.display = 'none';
      this.showLogin();
    }
  },

  // -------------------------------------------------------------------------
  // 3. UI SIDEBAR, LANGUAGE, THEME Repainting
  // -------------------------------------------------------------------------
  buildSidebarNav: function() {
    const container = document.getElementById('app-sidebar-menu');
    container.innerHTML = '';
    
    const allowed = this.activeRole.sidebar_modules;
    const allItems = [
      { key: 'dashboard', label: 'لوحة التحكم', icon: 'fa-chart-pie' },
      { key: 'employees', label: 'الموظفون', icon: 'fa-users' },
      { key: 'attendance', label: 'الحضور', icon: 'fa-clock' },
      { key: 'projects', label: 'المشاريع', icon: 'fa-folder-open' },
      { key: 'finance', label: 'المالية', icon: 'fa-wallet' },
      { key: 'owners', label: 'الملاك والأسهم', icon: 'fa-handshake' },
      { key: 'meetings', label: 'الاجتماعات والتصويت', icon: 'fa-calendar-check' },
      { key: 'messages', label: 'الرسائل', icon: 'fa-comment-dots' },
      { key: 'documents', label: 'الوثائق', icon: 'fa-file-invoice' },
      { key: 'settings', label: 'إعدادات النظام', icon: 'fa-gears' }
    ];

    allItems.forEach(item => {
      if (allowed.includes(item.key) || this.currentUser.role_id === 1) {
        const div = document.createElement('a');
        div.className = `nav-item ${this.activeView === item.key ? 'active' : ''}`;
        div.setAttribute('onclick', `NEMS_APP.navigateTo('${item.key}')`);
        
        const langLabel = this.translations[this.language][item.key] || item.label;
        div.innerHTML = `<i class="fa-solid ${item.icon}"></i> <span>${langLabel}</span>`;
        
        // Add badges counter simulation for specific items
        if (item.key === 'messages') {
          div.innerHTML += `<span class="nav-badge" id="side-msg-badge" style="display:none;">3</span>`;
        }
        
        container.appendChild(div);
      }
    });

    // Add extra static pages for profile, help & logout
    const hr = document.createElement('hr');
    hr.style.margin = '10px 0';
    hr.style.opacity = '0.1';
    container.appendChild(hr);

    const helpDiv = document.createElement('a');
    helpDiv.className = 'nav-item';
    helpDiv.setAttribute('onclick', "NEMS_APP.navigateTo('help')");
    helpDiv.innerHTML = `<i class="fa-solid fa-circle-question"></i> <span>${this.language === 'ar' ? 'مركز المساعدة' : 'Help Center'}</span>`;
    container.appendChild(helpDiv);

    const logoutDiv = document.createElement('a');
    logoutDiv.className = 'nav-item';
    logoutDiv.setAttribute('onclick', 'NEMS_APP.handleLogout()');
    logoutDiv.style.color = '#e74c3c';
    logoutDiv.innerHTML = `<i class="fa-solid fa-power-off"></i> <span>${this.language === 'ar' ? 'تسجيل الخروج' : 'Logout'}</span>`;
    container.appendChild(logoutDiv);
  },

  buildBottomNav: function() {
    const nav = document.getElementById('app-bottom-nav');
    nav.innerHTML = '';
    if (!this.currentUser) return;

    // Define 5 key links based on active role
    let links = [];
    if (this.currentUser.role_id === 6) { // Employee
      links = [
        { key: 'dashboard', label: 'الرئيسية', icon: 'fa-chart-pie' },
        { key: 'projects', label: 'المشاريع', icon: 'fa-folder' },
        { key: 'attendance', label: 'الحضور', icon: 'fa-clock' },
        { key: 'messages', label: 'الرسائل', icon: 'fa-comments' },
        { key: 'profile', label: 'ملفي', icon: 'fa-user' }
      ];
    } else if (this.currentUser.role_id === 7) { // Owner
      links = [
        { key: 'dashboard', label: 'الرئيسية', icon: 'fa-chart-pie' },
        { key: 'owners', label: 'الأسهم', icon: 'fa-handshake' },
        { key: 'meetings', label: 'التصويت', icon: 'fa-calendar-check' },
        { key: 'profile', label: 'ملفي', icon: 'fa-user' }
      ];
    } else { // Managers / Admins
      links = [
        { key: 'dashboard', label: 'الرئيسية', icon: 'fa-chart-pie' },
        { key: 'employees', label: 'الموظفون', icon: 'fa-users' },
        { key: 'projects', label: 'المشاريع', icon: 'fa-folder' },
        { key: 'finance', label: 'المالية', icon: 'fa-wallet' },
        { key: 'profile', label: 'ملفي', icon: 'fa-user' }
      ];
    }

    links.forEach(link => {
      const div = document.createElement('div');
      div.className = `bottom-nav-item ${this.activeView === link.key ? 'active' : ''}`;
      div.setAttribute('onclick', `NEMS_APP.navigateTo('${link.key}')`);
      div.innerHTML = `<i class="fa-solid ${link.icon}" style="font-size: 1.25rem;"></i> <span>${link.label}</span>`;
      nav.appendChild(div);
    });
  },

  toggleLanguage: function() {
    this.language = this.language === 'ar' ? 'en' : 'ar';
    localStorage.setItem('nems_pref_lang', this.language);
    this.setLanguage(this.language);
  },

  setLanguage: function(lang) {
    this.language = lang;
    document.documentElement.setAttribute('lang', lang);
    if (lang === 'ar') {
      document.documentElement.setAttribute('dir', 'rtl');
    } else {
      document.documentElement.setAttribute('dir', 'ltr');
    }
    this.buildSidebarNav();
    this.buildBottomNav();
  },

  toggleTheme: function() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('nems_pref_theme', nextTheme);
    this.showToast(`تم التبديل للوضع ${nextTheme === 'dark' ? 'الداكن' : 'الفاتح'}.`, 'info');
  },

  toggleSidebar: function() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar.style.display === 'none') {
      sidebar.style.display = 'flex';
    } else {
      sidebar.style.display = 'none';
    }
  },

  toggleFullscreen: function() {
    const container = document.querySelector('.app-container');
    container.classList.toggle('fullscreen-mode');
    
    const icon = document.querySelector('#presentation-btn i');
    if (container.classList.contains('fullscreen-mode')) {
      icon.className = 'fa-solid fa-compress';
      this.showToast('تم تفعيل وضع العرض التقديمي وملء الشاشة.', 'info');
    } else {
      icon.className = 'fa-solid fa-expand';
      this.showToast('تم إلغاء وضع العرض التقديمي.', 'info');
    }
  },

  applyBrandColors: function() {
    const settings = window.NEMS_DB.getTable('system_settings');
    const primary = settings.find(s => s.key === 'primary_color')?.value || '#C0392B';
    const secondary = settings.find(s => s.key === 'secondary_color')?.value || '#F39C12';
    
    document.documentElement.style.setProperty('--color-primary', primary);
    document.documentElement.style.setProperty('--color-secondary', secondary);
  },

  // -------------------------------------------------------------------------
  // 4. TOAST NOTIFICATIONS MANAGER
  // -------------------------------------------------------------------------
  showToast: function(message, type = 'info') {
    const container = document.getElementById('toast-manager-box');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-check-circle';
    if (type === 'warning') icon = 'fa-exclamation-triangle';
    if (type === 'danger') icon = 'fa-skull-crossbones';

    toast.innerHTML = `
      <i class="fa-solid ${icon}"></i>
      <span>${message}</span>
      <div class="toast-progress"></div>
    `;

    container.appendChild(toast);
    
    // Auto-remove toast after 3 seconds
    setTimeout(() => {
      toast.style.animation = 'slideIn 0.3s reverse';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  // -------------------------------------------------------------------------
  // 5. ROLE-BASED DASHBOARDS RENDERING
  // -------------------------------------------------------------------------
  renderDashboard: function() {
    const container = document.getElementById('dashboard-widgets');
    container.innerHTML = '';
    
    const roleId = this.currentUser.role_id;
    let cards = [];

    // Dashboard customization layout loading
    const userPref = this.currentUser.preferences || {};
    const hiddenCards = userPref.hidden_cards || [];
    const orderedCards = userPref.ordered_cards || [];

    const allRoleCards = {
      // 1. Admin
      1: [
        { key: 'users', label: 'المستخدمون المسجلون', value: window.NEMS_DB.getTable('users').length, icon: 'fa-users-gear', link: 'users' },
        { key: 'logs', label: 'سجلات التدقيق الأمني', value: window.NEMS_DB.getTable('audit_log').length, icon: 'fa-shield-halved', link: 'settings' },
        { key: 'feedback', label: 'بلاغات وملاحظات الجودة', value: window.NEMS_DB.getTable('feedback_reports').length, icon: 'fa-comments', link: 'settings' }
      ],
      // 2. CEO
      2: [
        { key: 'total_emp', label: 'إجمالي الموظفين', value: window.NEMS_DB.getTable('employees').length, icon: 'fa-users', link: 'employees' },
        { key: 'act_proj', label: 'المشاريع النشطة', value: window.NEMS_DB.getTable('projects').filter(p => p.status === 'active').length, icon: 'fa-folder-open', link: 'projects' },
        { key: 'tasks_comp', label: 'المهام المكتملة', value: window.NEMS_DB.getTable('tasks').filter(t => t.status === 'completed').length, icon: 'fa-circle-check', link: 'projects' },
        { key: 'rev', label: 'إجمالي الإيرادات', value: window.NEMS_DB.getTable('revenues').reduce((acc, r) => acc + r.amount, 0) + ' SAR', icon: 'fa-circle-up', type: 'secondary' },
        { key: 'exp', label: 'إجمالي المصروفات', value: window.NEMS_DB.getTable('expenses').reduce((acc, e) => acc + e.amount, 0) + ' SAR', icon: 'fa-circle-down' }
      ],
      // 3. FM
      3: [
        { key: 'rev', label: 'الإيرادات المستلمة', value: window.NEMS_DB.getTable('revenues').reduce((acc, r) => acc + r.amount, 0) + ' SAR', icon: 'fa-arrow-trend-up', link: 'finance', type: 'secondary' },
        { key: 'exp', label: 'المصروفات المعتمدة', value: window.NEMS_DB.getTable('expenses').reduce((acc, e) => acc + e.amount, 0) + ' SAR', icon: 'fa-arrow-trend-down', link: 'finance' },
        { key: 'pending_appr', label: 'فواتير معلقة للاعتماد', value: window.NEMS_DB.getTable('expenses').filter(e => e.status === 'pending_approval').length, icon: 'fa-clock', link: 'finance' }
      ],
      // 4. HR
      4: [
        { key: 'total_emp', label: 'موظفي الشركة', value: window.NEMS_DB.getTable('employees').length, icon: 'fa-users', link: 'employees' },
        { key: 'leaves_pen', label: 'طلبات إجازات معلقة', value: window.NEMS_DB.getTable('leaves').filter(l => l.status === 'pending').length, icon: 'fa-plane', link: 'employees' },
        { key: 'att_rate', label: 'الحضور اليومي', value: '100%', icon: 'fa-clock-rotate-left', link: 'attendance' }
      ],
      // 5. PM
      5: [
        { key: 'my_proj', label: 'مشاريع تحت إدارتي', value: window.NEMS_DB.getTable('projects').filter(p => p.manager_id === 'EMP-004').length, icon: 'fa-folder-open', link: 'projects' },
        { key: 'pending_tasks', label: 'المهام المعلقة بالفريق', value: window.NEMS_DB.getTable('tasks').filter(t => t.status !== 'completed').length, icon: 'fa-bars-progress', link: 'projects' }
      ],
      // 6. Employee
      6: [
        { key: 'my_tasks', label: 'مهامي الشخصية المعلقة', value: window.NEMS_DB.getTable('tasks').filter(t => t.assigned_to === 'EMP-005' && t.status !== 'completed').length, icon: 'fa-list-check', link: 'projects' },
        { key: 'checkins_today', label: 'بصمات الدوام اليوم', value: window.NEMS_DB.getTable('attendance_logs').filter(l => l.employee_id === 'EMP-005' && l.status === 'confirmed').length + ' / 8', icon: 'fa-clock', link: 'attendance' }
      ],
      // 7. Owner
      7: [
        { key: 'my_shares', label: 'عدد أسهمك', value: '4,000 سهم', icon: 'fa-handshake', link: 'owners' },
        { key: 'ownership_pct', label: 'نسبة الملكية في نوكسورا', value: '40%', icon: 'fa-percent', link: 'owners' },
        { key: 'pending_dividends', label: 'الأرباح المستحقة', value: '0 SAR', icon: 'fa-wallet', link: 'owners' }
      ]
    };

    let rawCards = allRoleCards[roleId] || [];

    // Filter hidden cards
    rawCards = rawCards.filter(c => !hiddenCards.includes(c.key));

    // Sort cards based on user preference
    if (orderedCards.length > 0) {
      rawCards.sort((a, b) => {
        const indexA = orderedCards.indexOf(a.key);
        const indexB = orderedCards.indexOf(b.key);
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });
    }

    rawCards.forEach(c => {
      const card = document.createElement('div');
      card.className = `n-card stat-card ${c.type || ''}`;
      if (c.link) {
        card.style.cursor = 'pointer';
        card.setAttribute('onclick', `NEMS_APP.navigateTo('${c.link}')`);
      }
      card.innerHTML = `
        <div class="stat-info">
          <span class="stat-label">${c.label}</span>
          <span class="stat-value">${c.value}</span>
        </div>
        <div class="stat-icon"><i class="fa-solid ${c.icon}"></i></div>
      `;
      container.appendChild(card);
    });

    // Populate chart simulation
    this.renderFinancialGrowthChart();
    
    // Populate activities simulation
    this.renderDashboardActivities();
  },

  renderFinancialGrowthChart: function() {
    const chart = document.getElementById('chart-finance-grow');
    if (!chart) return;
    chart.innerHTML = '';
    
    const data = [
      { month: 'يناير', value: 30 },
      { month: 'فبراير', value: 45 },
      { month: 'مارس', value: 60 },
      { month: 'أبريل', value: 80 },
      { month: 'مايو', value: 75 },
      { month: 'يونيو', value: 95 }
    ];

    data.forEach(item => {
      const col = document.createElement('div');
      col.style.display = 'flex';
      col.style.flexDirection = 'column';
      col.style.alignItems = 'center';
      col.style.height = '100%';
      col.style.justifyContent = 'flex-end';
      
      const bar = document.createElement('div');
      bar.style.width = '35px';
      bar.style.height = `${item.value}%`;
      bar.style.backgroundColor = 'var(--color-primary)';
      bar.style.borderRadius = '4px 4px 0 0';
      bar.style.position = 'relative';
      bar.style.transition = 'height 1s ease';
      
      // Hover tooltip
      bar.title = `${item.value}% نمو`;

      const label = document.createElement('span');
      label.style.fontSize = '0.75rem';
      label.style.marginTop = '8px';
      label.textContent = item.month;

      col.appendChild(bar);
      col.appendChild(label);
      chart.appendChild(col);
    });
  },

  renderDashboardActivities: function() {
    const list = document.getElementById('dashboard-activities-list');
    if (!list) return;
    list.innerHTML = '';

    const logs = window.NEMS_DB.getTable('audit_log').slice(-4).reverse();
    logs.forEach(log => {
      const div = document.createElement('div');
      div.className = 'n-card';
      div.style.padding = '10px 15px';
      div.style.display = 'flex';
      div.style.justifyContent = 'space-between';
      div.style.alignItems = 'center';
      div.style.fontSize = '0.85rem';

      let actionText = '';
      if (log.action === 'create') actionText = 'إنشاء سجل جديد';
      if (log.action === 'update') actionText = 'تحديث وتعديل سجل';
      if (log.action === 'delete') actionText = 'حذف سجل';
      if (log.action === 'login') actionText = 'تسجيل دخول ناجح';
      if (log.action === 'initialized') actionText = 'تهيئة البنية للشركة';

      div.innerHTML = `
        <div>
          <strong>${log.user_name}</strong> - ${actionText} في قسم <span>${log.module}</span>
        </div>
        <div style="font-size:0.75rem; color:var(--text-muted);">${log.timestamp.split(' ')[1]}</div>
      `;
      list.appendChild(div);
    });
  },

  showDashboardCustomizer: function() {
    const modalBox = document.getElementById('general-modal-box');
    modalBox.innerHTML = `
      <div class="modal-header">
        <h3 class="modal-title">تخصيص وداجت لوحة التحكم</h3>
        <span class="modal-close" onclick="NEMS_APP.closeModal()"><i class="fa-solid fa-xmark"></i></span>
      </div>
      <div style="display:flex; flex-direction:column; gap:12px;">
        <p style="font-size:0.85rem; color:var(--text-muted);">قم بتحديد الترتيب والوداجت التي ترغب في إخفائها من لوحتك الرئيسية:</p>
        
        <div style="display:flex; flex-direction:column; gap:8px;" id="customizer-options-list">
          <!-- Populated based on roles -->
        </div>

        <button class="btn btn-primary" onclick="NEMS_APP.saveDashboardCustomization()" style="margin-top:15px;">حفظ التخصيص</button>
      </div>
    `;

    const list = document.getElementById('customizer-options-list');
    const roleId = this.currentUser.role_id;
    
    // Find all potential cards for this role
    const allRoleCards = {
      1: [{ key: 'users', label: 'المستخدمون' }, { key: 'logs', label: 'سجلات التدقيق' }, { key: 'feedback', label: 'بلاغات الجودة' }],
      2: [{ key: 'total_emp', label: 'إجمالي الموظفين' }, { key: 'act_proj', label: 'المشاريع النشطة' }, { key: 'tasks_comp', label: 'المهام المكتملة' }, { key: 'rev', label: 'الإيرادات' }, { key: 'exp', label: 'المصروفات' }],
      3: [{ key: 'rev', label: 'الإيرادات' }, { key: 'exp', label: 'المصروفات' }, { key: 'pending_appr', label: 'الموافقات المعلقة' }],
      4: [{ key: 'total_emp', label: 'موظفي الشركة' }, { key: 'leaves_pen', label: 'طلبات الإجازات' }, { key: 'att_rate', label: 'الحضور اليومي' }],
      5: [{ key: 'my_proj', label: 'المشاريع' }, { key: 'pending_tasks', label: 'المهام المعلقة' }],
      6: [{ key: 'my_tasks', label: 'مهامي الشخصية' }, { key: 'checkins_today', label: 'بصمات الحضور' }],
      7: [{ key: 'my_shares', label: 'عدد أسهمك' }, { key: 'ownership_pct', label: 'نسبة الملكية' }, { key: 'pending_dividends', label: 'الأرباح المستحقة' }]
    };

    const cards = allRoleCards[roleId] || [];
    const pref = this.currentUser.preferences || {};
    const hidden = pref.hidden_cards || [];

    cards.forEach(c => {
      const isChecked = !hidden.includes(c.key);
      const div = document.createElement('div');
      div.style.display = 'flex';
      div.style.justifyContent = 'space-between';
      div.style.alignItems = 'center';
      div.innerHTML = `
        <span>${c.label}</span>
        <label class="switch">
          <input type="checkbox" value="${c.key}" ${isChecked ? 'checked' : ''} class="customizer-toggle">
          <span class="slider"></span>
        </label>
      `;
      list.appendChild(div);
    });

    document.getElementById('general-modal').style.display = 'flex';
  },

  saveDashboardCustomization: function() {
    const toggles = document.querySelectorAll('.customizer-toggle');
    const hidden = [];
    toggles.forEach(t => {
      if (!t.checked) hidden.push(t.value);
    });

    // Save preference to user table
    const users = window.NEMS_DB.getTable('users');
    const index = users.findIndex(u => u.user_id === this.currentUser.user_id);
    if (index !== -1) {
      if (!users[index].preferences) users[index].preferences = {};
      users[index].preferences.hidden_cards = hidden;
      
      window.NEMS_DB.saveTable('users', users);
      this.currentUser = users[index];
      sessionStorage.setItem('nems_session_user', JSON.stringify(this.currentUser));
      
      this.showToast('تم حفظ إعدادات لوحة التحكم الشخصية.', 'success');
      this.closeModal();
      this.renderDashboard();
    }
  },

  // -------------------------------------------------------------------------
  // 6. EMPLOYEES & ORG CHART MODULE
  // -------------------------------------------------------------------------
  renderEmployeesTable: function() {
    const searchVal = document.getElementById('search-emp').value.toLowerCase();
    const deptVal = document.getElementById('filter-emp-dept').value;
    const statusVal = document.getElementById('filter-emp-status').value;

    const employees = window.NEMS_DB.getTable('employees');
    const users = window.NEMS_DB.getTable('users');
    const depts = window.NEMS_DB.getTable('departments');

    // Populate Department dropdown filter if empty
    const select = document.getElementById('filter-emp-dept');
    if (select.options.length <= 1) {
      depts.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.department_id;
        opt.textContent = d.name;
        select.appendChild(opt);
      });
    }

    // Stats calculations
    document.getElementById('hr-stat-total').textContent = employees.length;
    document.getElementById('hr-stat-active').textContent = employees.filter(e => e.employment_status === 'active').length;
    document.getElementById('hr-stat-leave').textContent = employees.filter(e => e.employment_status === 'on_leave').length;
    const totalEpi = employees.reduce((acc, e) => acc + e.epi_score, 0);
    document.getElementById('hr-stat-epi').textContent = Math.round(totalEpi / employees.length) + '%';

    const table = document.getElementById('employees-table-body');
    table.innerHTML = `
      <thead>
        <tr>
          <th>الصورة</th>
          <th>رقم الموظف</th>
          <th>الاسم</th>
          <th>المنصب الوظيفي</th>
          <th>القسم</th>
          <th>مؤشر الأداء EPI</th>
          <th>الحالة</th>
          <th>تاريخ التعيين</th>
          <th>الإجراءات</th>
        </tr>
      </thead>
      <tbody>
    `;

    employees.forEach(emp => {
      const user = users.find(u => u.user_id === emp.user_id) || {};
      const dept = depts.find(d => d.department_id === emp.department_id) || { name: 'غير محدد' };

      // Apply filters
      if (searchVal && !user.name?.toLowerCase().includes(searchVal)) return;
      if (deptVal && emp.department_id !== parseInt(deptVal)) return;
      if (statusVal && emp.employment_status !== statusVal) return;

      const avatar = user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200';
      const statusBadge = emp.employment_status === 'active' ? 'badge-success' : emp.employment_status === 'on_leave' ? 'badge-warning' : 'badge-danger';
      const statusText = emp.employment_status === 'active' ? 'نشط' : emp.employment_status === 'on_leave' ? 'في إجازة' : 'موقوف';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td data-label="الصورة"><img src="${avatar}" style="width:32px; height:32px; border-radius:50%; object-fit:cover;"></td>
        <td data-label="رقم الموظف"><strong>${emp.employee_id}</strong></td>
        <td data-label="الاسم">${user.name}</td>
        <td data-label="المنصب">${emp.job_title}</td>
        <td data-label="القسم">${dept.name}</td>
        <td data-label="مؤشر EPI"><strong>${emp.epi_score}%</strong></td>
        <td data-label="الحالة"><span class="badge ${statusBadge}">${statusText}</span></td>
        <td data-label="تاريخ التعيين">${emp.hire_date}</td>
        <td data-label="الإجراءات">
          <button class="btn btn-secondary btn-sm" onclick="NEMS_APP.showEmployeeProfile('${emp.employee_id}')"><i class="fa-solid fa-eye"></i></button>
          <button class="btn btn-danger btn-sm" onclick="NEMS_APP.toggleEmployeeSuspension('${emp.employee_id}')"><i class="fa-solid fa-ban"></i></button>
        </td>
      `;
      table.querySelector('tbody').appendChild(tr);
    });
  },

  showAddEmployeeModal: function() {
    const modalBox = document.getElementById('general-modal-box');
    modalBox.style.maxWidth = '600px';
    modalBox.innerHTML = `
      <div class="modal-header">
        <h3 class="modal-title">إضافة موظف جديد</h3>
        <span class="modal-close" onclick="NEMS_APP.closeModal()"><i class="fa-solid fa-xmark"></i></span>
      </div>
      
      <!-- Multi-tab Form wizard -->
      <div style="display:flex; gap:10px; margin-bottom:15px; border-bottom:1px solid var(--border-color); padding-bottom:8px;">
        <span class="btn btn-secondary active wizard-step-btn" onclick="NEMS_APP.switchWizardTab(this, 1)">1. المعلومات الأساسية</span>
        <span class="btn btn-secondary wizard-step-btn" onclick="NEMS_APP.switchWizardTab(this, 2)">2. الوظيفية والمالية</span>
      </div>

      <form id="add-employee-form" onsubmit="event.preventDefault(); NEMS_APP.saveNewEmployee();">
        <div id="wizard-tab-1" class="wizard-tab-content">
          <div class="form-row">
            <div class="form-group"><label>الاسم الكامل</label><input type="text" id="emp-new-name" class="n-input" required></div>
            <div class="form-group"><label>البريد الإلكتروني</label><input type="email" id="emp-new-email" class="n-input" required></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>رقم الجوال</label><input type="text" id="emp-new-phone" class="n-input" required></div>
            <div class="form-group"><label>الهوية الوطنية</label><input type="text" id="emp-new-nid" class="n-input" required></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>الجنسية</label><input type="text" id="emp-new-nat" class="n-input" required value="سعودي"></div>
            <div class="form-group">
              <label>الجنس</label>
              <select id="emp-new-gender" class="n-input">
                <option value="male">ذكر</option>
                <option value="female">أنثى</option>
              </select>
            </div>
          </div>
        </div>

        <div id="wizard-tab-2" class="wizard-tab-content" style="display:none;">
          <div class="form-row">
            <div class="form-group">
              <label>القسم</label>
              <select id="emp-new-dept" class="n-input"></select>
            </div>
            <div class="form-group"><label>المنصب الوظيفي</label><input type="text" id="emp-new-title" class="n-input" required></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>الراتب الأساسي</label><input type="number" id="emp-new-salary" class="n-input" required></div>
            <div class="form-group"><label>البدلات</label><input type="number" id="emp-new-allowances" class="n-input" value="0"></div>
          </div>
          <div class="form-group">
            <label>الدور والصلاحيات</label>
            <select id="emp-new-role" class="n-input">
              <option value="6">Employee (موظف)</option>
              <option value="5">PM (مدير مشروع)</option>
              <option value="4">HR (الموارد البشرية)</option>
              <option value="3">FM (المدير المالي)</option>
            </select>
          </div>
          <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 15px;">حفظ الموظف الجديد</button>
        </div>
      </form>
    `;

    // Populate departments select option
    const depts = window.NEMS_DB.getTable('departments');
    const select = document.getElementById('emp-new-dept');
    depts.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.department_id;
      opt.textContent = d.name;
      select.appendChild(opt);
    });

    document.getElementById('general-modal').style.display = 'flex';
  },

  switchWizardTab: function(btn, tabNum) {
    document.querySelectorAll('.wizard-step-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    document.querySelectorAll('.wizard-tab-content').forEach(t => t.style.display = 'none');
    document.getElementById(`wizard-tab-${tabNum}`).style.display = 'block';
  },

  saveNewEmployee: function() {
    const name = document.getElementById('emp-new-name').value;
    const email = document.getElementById('emp-new-email').value;
    const phone = document.getElementById('emp-new-phone').value;
    const nationalId = document.getElementById('emp-new-nid').value;
    const nationality = document.getElementById('emp-new-nat').value;
    const gender = document.getElementById('emp-new-gender').value;
    
    const deptId = parseInt(document.getElementById('emp-new-dept').value);
    const title = document.getElementById('emp-new-title').value;
    const salary = parseFloat(document.getElementById('emp-new-salary').value);
    const allowances = parseFloat(document.getElementById('emp-new-allowances').value);
    const roleId = parseInt(document.getElementById('emp-new-role').value);

    // 1. Create User account first
    const newUser = window.NEMS_DB.insertRecord('users', {
      name: name,
      email: email,
      password_hash: '123456', // default initial pass
      phone: phone,
      role_id: roleId,
      status: 'active',
      avatar: ''
    }, this.currentUser.user_id);

    // 2. Create connected employee record
    window.NEMS_DB.insertRecord('employees', {
      user_id: newUser.user_id,
      department_id: deptId,
      job_title: title,
      reports_to: 2, // Defaults to CEO Ahmad
      basic_salary: salary,
      allowances: allowances,
      hire_date: new Date().toISOString().split('T')[0],
      contract_type: 'Full-Time',
      employment_status: 'active',
      national_id: nationalId,
      nationality: nationality,
      gender: gender,
      birth_date: '1995-01-01',
      address: 'المملكة العربية السعودية',
      emergency_contact: '0500000000',
      epi_score: 90
    }, this.currentUser.user_id);

    this.showToast('تمت إضافة الموظف الجديد وحسابه بنجاح.', 'success');
    this.closeModal();
    this.renderEmployeesTable();
  },

  showEmployeeProfile: function(empId) {
    const employees = window.NEMS_DB.getTable('employees');
    const users = window.NEMS_DB.getTable('users');
    const depts = window.NEMS_DB.getTable('departments');
    
    const emp = employees.find(e => e.employee_id === empId);
    const user = users.find(u => u.user_id === emp.user_id);
    const dept = depts.find(d => d.department_id === emp.department_id);

    const modalBox = document.getElementById('general-modal-box');
    modalBox.style.maxWidth = '700px';
    modalBox.innerHTML = `
      <div class="modal-header">
        <h3 class="modal-title">ملف الموظف: ${user.name}</h3>
        <span class="modal-close" onclick="NEMS_APP.closeModal()"><i class="fa-solid fa-xmark"></i></span>
      </div>

      <!-- Employee Daily Performance Card Widget (Suggested in f3) -->
      <div class="n-card" style="margin-bottom: 20px; border-inline-start: 6px solid var(--color-secondary); padding: 15px; background-color: var(--bg-main);">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <strong>بطاقة الأداء والالتزام اليومي</strong>
            <div style="font-size:0.8rem; color:var(--text-muted); margin-top:4px;">تحديث مباشر من شبكات البصمات والمهام.</div>
          </div>
          <span class="badge badge-success">مؤشر EPI: ${emp.epi_score}%</span>
        </div>
        <div class="grid-4" style="margin-top: 12px; font-size: 0.8rem;">
          <div>ساعات العمل اليوم: <strong id="lbl-perf-hours">8.0 ساعة</strong></div>
          <div>البصمات المكتملة: <strong id="lbl-perf-confirmed">8 / 8</strong></div>
          <div>المهام المنجزة: <strong id="lbl-perf-tasks">1 مهمة</strong></div>
          <div>المخالفات: <strong id="lbl-perf-alerts" style="color:var(--color-success)">لا يوجد</strong></div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
        <div><strong>رقم الموظف:</strong> ${emp.employee_id}</div>
        <div><strong>القسم:</strong> ${dept.name}</div>
        <div><strong>المنصب الوظيفي:</strong> ${emp.job_title}</div>
        <div><strong>تاريخ التعيين:</strong> ${emp.hire_date}</div>
        <div><strong>الراتب الأساسي:</strong> ${this.maskValue(emp.basic_salary)} SAR</div>
        <div><strong>البدلات:</strong> ${this.maskValue(emp.allowances)} SAR</div>
        <div><strong>رقم الجوال:</strong> ${user.phone}</div>
        <div><strong>البريد الإلكتروني:</strong> ${user.email}</div>
      </div>
    `;

    document.getElementById('general-modal').style.display = 'flex';
  },

  toggleEmployeeSuspension: function(empId) {
    const employees = window.NEMS_DB.getTable('employees');
    const index = employees.findIndex(e => e.employee_id === empId);
    if (index !== -1) {
      const current = employees[index].employment_status;
      const next = current === 'active' ? 'suspended' : 'active';
      employees[index].employment_status = next;
      window.NEMS_DB.saveTable('employees', employees);
      
      // Suspend/Activate corresponding User status
      const users = window.NEMS_DB.getTable('users');
      const uIndex = users.findIndex(u => u.user_id === employees[index].user_id);
      if (uIndex !== -1) {
        users[uIndex].status = next;
        window.NEMS_DB.saveTable('users', users);
      }

      this.showToast(`تم تغيير حالة الموظف بنجاح إلى ${next === 'suspended' ? 'موقف' : 'نشط'}.`, 'warning');
      this.renderEmployeesTable();
    }
  },

  // -------------------------------------------------------------------------
  // 7. ATTENDANCE SYSTEM & HOURLY STAMP SIMULATOR
  // -------------------------------------------------------------------------
  renderAttendanceView: function() {
    const roleId = this.currentUser.role_id;
    const empId = 'EMP-005'; // Hardcoded for Demo Employee

    const atts = window.NEMS_DB.getTable('attendance');
    const today = new Date().toISOString().split('T')[0];
    const myAttToday = atts.find(a => a.employee_id === empId && a.date === today);

    // Update Action Buttons
    if (myAttToday) {
      document.getElementById('btn-checkin').disabled = true;
      document.getElementById('btn-checkout').disabled = false;
      document.getElementById('card-first-in').textContent = myAttToday.check_in.split(' ')[1];
      document.getElementById('card-work-hours').textContent = myAttToday.total_hours + ' ساعة';
      document.getElementById('card-attendance-status').textContent = 'حاضر';
      document.getElementById('card-attendance-status').className = 'badge badge-success';
    } else {
      document.getElementById('btn-checkin').disabled = false;
      document.getElementById('btn-checkout').disabled = true;
      document.getElementById('card-first-in').textContent = '-';
      document.getElementById('card-work-hours').textContent = '0 ساعة';
      document.getElementById('card-attendance-status').textContent = 'غائب';
      document.getElementById('card-attendance-status').className = 'badge badge-danger';
    }

    // Render Stamps grid
    const stampsGrid = document.getElementById('hourly-stamps-grid');
    stampsGrid.innerHTML = '';
    
    const logs = window.NEMS_DB.getTable('attendance_logs').filter(l => l.employee_id === empId && l.attendance_id === (myAttToday?.attendance_id || 2));
    
    for (let i = 1; i <= 8; i++) {
      const log = logs.find(l => l.hour_slot === i);
      const div = document.createElement('div');
      div.style.padding = '8px';
      div.style.borderRadius = '4px';
      div.style.textAlign = 'center';
      div.style.fontWeight = 'bold';
      div.style.fontSize = '0.8rem';
      
      if (log) {
        if (log.status === 'confirmed') {
          div.style.backgroundColor = 'rgba(46,204,113,0.15)';
          div.style.color = 'var(--color-success)';
          div.textContent = `س${i}: 🟢`;
        } else if (log.status === 'missed') {
          div.style.backgroundColor = 'rgba(231,76,60,0.15)';
          div.style.color = 'var(--color-danger)';
          div.textContent = `س${i}: 🔴`;
        }
      } else {
        div.style.backgroundColor = 'var(--bg-main)';
        div.style.color = 'var(--text-muted)';
        div.textContent = `س${i}: 🟡`;
      }
      stampsGrid.appendChild(div);
    }
    document.getElementById('card-confirmed-checks').textContent = `${logs.filter(l => l.status === 'confirmed').length} / 8`;

    // Show Admin pane if CEO or HR manager
    if (roleId === 2 || roleId === 4) {
      document.getElementById('attendance-admin-panel').style.display = 'block';
      this.renderAttendanceAdminTable();
    } else {
      document.getElementById('attendance-admin-panel').style.display = 'none';
    }

    // Set Live timer
    setInterval(() => {
      const now = new Date();
      const timeStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0') + ':' + String(now.getSeconds()).padStart(2, '0');
      const timer = document.getElementById('att-live-timer');
      if (timer) timer.textContent = timeStr;
    }, 1000);
  },

  performCheckIn: function() {
    const empId = 'EMP-005';
    const today = new Date().toISOString().split('T')[0];
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const att = window.NEMS_DB.insertRecord('attendance', {
      employee_id: empId,
      date: today,
      check_in: nowStr,
      check_out: null,
      total_hours: 8.0,
      overtime_hours: 0.0,
      status: 'present',
      notes: 'تسجيل دخول من واجهة الموظف'
    }, this.currentUser.user_id);

    // Seed the first hourly slot checkin
    window.NEMS_DB.insertRecord('attendance_logs', {
      employee_id: empId,
      attendance_id: att.attendance_id,
      timestamp: nowStr,
      hour_slot: 1,
      status: 'confirmed',
      device: '💻 PC',
      location: 'المكتب الرئيسي'
    }, this.currentUser.user_id);

    this.showToast('تم تسجيل حضور اليوم بنزاهة وبصمة الساعة الأولى.', 'success');
    this.renderAttendanceView();
  },

  performCheckOut: function() {
    const empId = 'EMP-005';
    const today = new Date().toISOString().split('T')[0];
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const atts = window.NEMS_DB.getTable('attendance');
    const index = atts.findIndex(a => a.employee_id === empId && a.date === today);
    if (index !== -1) {
      atts[index].check_out = nowStr;
      atts[index].status = 'present';
      window.NEMS_DB.saveTable('attendance', atts);
      
      // Audit log
      window.NEMS_DB.auditLog(this.currentUser.user_id, 'checkout', 'Attendance', 'attendance', atts[index].attendance_id, null, null);
      
      this.showToast('تم تسجيل الانصراف وإنهاء دوام اليوم.', 'info');
      this.renderAttendanceView();
    }
  },

  renderAttendanceAdminTable: function() {
    const table = document.getElementById('attendance-admin-table');
    const depts = window.NEMS_DB.getTable('departments');
    const users = window.NEMS_DB.getTable('users');
    const employees = window.NEMS_DB.getTable('employees');
    const atts = window.NEMS_DB.getTable('attendance');
    const today = new Date().toISOString().split('T')[0];

    table.innerHTML = `
      <thead>
        <tr>
          <th>الموظف</th>
          <th>أول بصمة</th>
          <th>تأكيد البصمات الساعية (8 ساعات)</th>
          <th>وقت الانصراف</th>
          <th>مجموع الساعات</th>
          <th>الحالة</th>
        </tr>
      </thead>
      <tbody>
    `;

    employees.forEach(emp => {
      const user = users.find(u => u.user_id === emp.user_id);
      const att = atts.find(a => a.employee_id === emp.employee_id && a.date === today);
      const logs = window.NEMS_DB.getTable('attendance_logs').filter(l => l.employee_id === emp.employee_id && l.attendance_id === (att?.attendance_id || 0));

      const firstIn = att ? att.check_in.split(' ')[1] : '-';
      const lastOut = att?.check_out ? att.check_out.split(' ')[1] : '-';
      const hours = att ? att.total_hours + ' س' : '-';
      const statusBadge = att ? 'badge-success' : 'badge-danger';
      const statusText = att ? 'حاضر' : 'غائب';

      let stampsHtml = '<div style="display:flex; gap:4px;">';
      for (let i = 1; i <= 8; i++) {
        const log = logs.find(l => l.hour_slot === i);
        const color = log ? (log.status === 'confirmed' ? '#2ECC71' : '#E74C3C') : '#BDC3C7';
        stampsHtml += `<span style="width:10px; height:10px; border-radius:50%; background-color:${color}; display:inline-block;" title="الساعة ${i}"></span>`;
      }
      stampsHtml += '</div>';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td data-label="الموظف"><strong>${user.name}</strong><br><small style="color:var(--text-muted);">${emp.job_title}</small></td>
        <td data-label="أول بصمة">${firstIn}</td>
        <td data-label="البصمات الساعية">${stampsHtml}</td>
        <td data-label="الانصراف">${lastOut}</td>
        <td data-label="مجموع الساعات">${hours}</td>
        <td data-label="الحالة"><span class="badge ${statusBadge}">${statusText}</span></td>
      `;
      table.querySelector('tbody').appendChild(tr);
    });
  },

  startHourlyAttendanceSimulator: function() {
    if (this.hourlyCheckInterval) clearInterval(this.hourlyCheckInterval);

    // Simulate hourly check prompt every 30 seconds for test purposes
    this.hourlyCheckInterval = setInterval(() => {
      if (this.currentUser.role_id === 6) { // Only prompt for Demo Employee
        const modalBox = document.getElementById('general-modal-box');
        modalBox.style.maxWidth = '400px';
        modalBox.innerHTML = `
          <div style="text-align: center; padding: 15px;">
            <div style="font-size: 3rem; color: var(--color-secondary); margin-bottom: 15px;"><i class="fa-solid fa-clock"></i></div>
            <h3>تأكيد حضور البصمة الساعية</h3>
            <p style="margin-top: 8px; font-size: 0.9rem; color: var(--text-muted);">يرجى النقر لتأكيد تواجدك بالساعة الحالية في العمل.</p>
            <div style="font-size: 0.8rem; color: var(--color-danger); margin-top: 10px; font-weight: bold;">ينتهي المؤقت خلال 10 دقائق</div>
            <button class="btn btn-primary" onclick="NEMS_APP.confirmHourlyCheck()" style="width: 100%; margin-top: 20px;">أنا متواجد حالياً ✅</button>
          </div>
        `;
        document.getElementById('general-modal').style.display = 'flex';
      }
    }, 45000); // 45 seconds simulated intervals
  },

  confirmHourlyCheck: function() {
    const empId = 'EMP-005';
    const today = new Date().toISOString().split('T')[0];
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const atts = window.NEMS_DB.getTable('attendance');
    const att = atts.find(a => a.employee_id === empId && a.date === today);

    if (att) {
      const logs = window.NEMS_DB.getTable('attendance_logs').filter(l => l.employee_id === empId && l.attendance_id === att.attendance_id);
      const nextSlot = logs.length + 1;
      
      if (nextSlot <= 8) {
        window.NEMS_DB.insertRecord('attendance_logs', {
          employee_id: empId,
          attendance_id: att.attendance_id,
          timestamp: nowStr,
          hour_slot: nextSlot,
          status: 'confirmed',
          device: '💻 PC',
          location: 'المكتب الرئيسي'
        }, this.currentUser.user_id);

        this.showToast(`تم تأكيد بصمة الساعة ${nextSlot} بنجاح.`, 'success');
      } else {
        this.showToast('تم إكمال جميع بصمات الدوام الساعية اليوم.', 'info');
      }
    }

    this.closeModal();
    if (this.activeView === 'attendance') this.renderAttendanceView();
  },

  // -------------------------------------------------------------------------
  // 8. PROJECTS & JOINT WORKSPACE
  // -------------------------------------------------------------------------
  renderProjectsView: function() {
    const projects = window.NEMS_DB.getTable('projects');
    const container = document.getElementById('projects-grid');
    container.innerHTML = '';

    projects.forEach(p => {
      const card = document.createElement('div');
      card.className = 'n-card';
      card.style.display = 'flex';
      card.style.flexDirection = 'column';
      card.style.justifyContent = 'space-between';
      card.style.gap = '15px';

      const statusBadge = p.status === 'active' ? 'badge-success' : p.status === 'planning' ? 'badge-warning' : 'badge-info';
      const statusText = p.status === 'active' ? 'نشط' : p.status === 'planning' ? 'قيد التخطيط' : 'مكتمل';

      card.innerHTML = `
        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <strong style="color:var(--text-muted); font-size:0.8rem;">${p.project_id}</strong>
            <span class="badge ${statusBadge}">${statusText}</span>
          </div>
          <h3 style="font-weight:700; margin-bottom:8px;">${p.name}</h3>
          <p style="font-size:0.85rem; color:var(--text-muted); line-height:1.5; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden;">${p.description}</p>
        </div>

        <div>
          <div style="margin: 10px 0;">
            <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:4px;">
              <span>نسبة الإنجاز:</span>
              <strong>${p.progress}%</strong>
            </div>
            <div style="width: 100%; height: 6px; background:#e2e8f0; border-radius:3px; overflow:hidden;">
              <div style="width:${p.progress}%; height:100%; background:var(--color-primary);"></div>
            </div>
          </div>
          
          <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border-color); padding-top:10px; margin-top:10px;">
            <span style="font-size:0.8rem; font-weight:bold;">${p.budget.toLocaleString()} SAR</span>
            <button class="btn btn-primary btn-sm" onclick="NEMS_APP.openProjectRoom('${p.project_id}')">دخول غرفة العمل <i class="fa-solid fa-arrow-left"></i></button>
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  },

  openProjectRoom: function(projId) {
    const projects = window.NEMS_DB.getTable('projects');
    const p = projects.find(pr => pr.project_id === projId);
    if (!p) return;

    // Load workspace values
    document.getElementById('proj-room-name').textContent = p.name;
    document.getElementById('proj-room-desc').textContent = p.description;
    document.getElementById('proj-room-budget').textContent = p.budget.toLocaleString() + ' ' + p.currency;
    document.getElementById('proj-room-progress').textContent = p.progress + '%';
    document.getElementById('proj-room-bar').style.width = p.progress + '%';
    
    // Status Badge repainting
    const badge = document.getElementById('proj-room-status');
    badge.textContent = p.status === 'active' ? 'نشط' : p.status === 'planning' ? 'قيد التخطيط' : 'مكتمل';
    badge.className = `badge ${p.status === 'active' ? 'badge-success' : p.status === 'planning' ? 'badge-warning' : 'badge-info'}`;

    // Switch view
    this.activeView = 'project-room';
    document.querySelectorAll('.page-section').forEach(sec => sec.style.display = 'none');
    document.getElementById('sec-project-room').style.display = 'block';

    // Populate default tab
    this.switchProjectRoomTab(document.querySelector('[onclick*="switchProjectRoomTab"]'), 'tasks', projId);
  },

  switchProjectRoomTab: function(btn, tab, projId = null) {
    // UI active buttons
    if (btn) {
      btn.parentElement.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    }

    this.projectRoomTab = tab;
    document.querySelectorAll('.proj-tab-content').forEach(c => c.style.display = 'none');
    document.getElementById(`proj-tab-${tab}`).style.display = 'block';

    // Reload tab content based on projects ID
    const pid = projId || window.NEMS_DB.getTable('projects')[0].project_id; // fallback
    switch (tab) {
      case 'tasks':
        this.renderKanbanBoard(pid);
        break;
      case 'gantt':
        this.renderGanttChart(pid);
        break;
      case 'team':
        this.renderProjectTeam(pid);
        break;
      case 'budget':
        this.renderProjectBudget(pid);
        break;
      case 'risks':
        this.renderProjectRisks(pid);
        break;
      case 'chat':
        this.renderProjectChat(pid);
        break;
    }
  },

  renderKanbanBoard: function(projId) {
    const board = document.getElementById('project-kanban-board');
    board.innerHTML = '';
    
    const tasks = window.NEMS_DB.getTable('tasks').filter(t => t.project_id === projId);
    const users = window.NEMS_DB.getTable('users');
    const employees = window.NEMS_DB.getTable('employees');

    const columns = [
      { key: 'new', label: 'المهام الجديدة', icon: 'fa-star' },
      { key: 'in_progress', label: 'قيد التنفيذ', icon: 'fa-spinner' },
      { key: 'review', label: 'بانتظار المراجعة', icon: 'fa-eye' },
      { key: 'completed', label: 'المكتملة والمنجزة', icon: 'fa-circle-check' }
    ];

    columns.forEach(col => {
      const colDiv = document.createElement('div');
      colDiv.className = 'kanban-col';
      colDiv.innerHTML = `
        <div class="kanban-col-header">
          <span><i class="fa-solid ${col.icon}"></i> ${col.label}</span>
          <span class="nav-badge" style="background-color: var(--border-color); color:var(--text-main);">${tasks.filter(t => t.status === col.key).length}</span>
        </div>
        <div class="kanban-cards-list" style="flex:1; display:flex; flex-direction:column; gap:10px;" id="col-list-${col.key}">
        </div>
      `;

      const listContainer = colDiv.querySelector('.kanban-cards-list');
      const colTasks = tasks.filter(t => t.status === col.key);

      colTasks.forEach(task => {
        const emp = employees.find(e => e.employee_id === task.assigned_to);
        const user = users.find(u => u.user_id === emp.user_id);
        const card = document.createElement('div');
        card.className = 'kanban-card';
        card.innerHTML = `
          <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:5px; font-weight:bold;">${task.task_id}</div>
          <strong style="display:block; margin-bottom:8px;">${task.title}</strong>
          
          <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.8rem;">
            <div style="display:flex; align-items:center; gap:6px;">
              <img src="${user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'}" style="width:20px; height:20px; border-radius:50%; object-fit:cover;">
              <span>${user.name.split(' ')[0]}</span>
            </div>
            
            <div style="display:flex; gap:5px;">
              <!-- Quick state shifting buttons for Kanban simulation -->
              <button onclick="NEMS_APP.shiftTaskStatus('${task.task_id}', 'prev')" class="btn btn-secondary btn-sm" style="padding:2px 6px;"><i class="fa-solid fa-arrow-right"></i></button>
              <button onclick="NEMS_APP.shiftTaskStatus('${task.task_id}', 'next')" class="btn btn-primary btn-sm" style="padding:2px 6px;"><i class="fa-solid fa-arrow-left"></i></button>
            </div>
          </div>
        `;
        listContainer.appendChild(card);
      });
      board.appendChild(colDiv);
    });
  },

  shiftTaskStatus: function(taskId, dir) {
    const tasks = window.NEMS_DB.getTable('tasks');
    const index = tasks.findIndex(t => t.task_id === taskId);
    if (index === -1) return;

    const currentStatus = tasks[index].status;
    const states = ['new', 'in_progress', 'review', 'completed'];
    let stateIdx = states.indexOf(currentStatus);

    if (dir === 'next' && stateIdx < 3) {
      // Gate check: only manager or CEO can complete
      if (stateIdx === 2 && this.currentUser.role_id !== 2 && this.currentUser.role_id !== 5) {
        this.showToast('فقط مدير المشروع أو المدير العام يستطيع إكمال واعتماد المهمة.', 'danger');
        return;
      }
      stateIdx++;
    } else if (dir === 'prev' && stateIdx > 0) {
      stateIdx--;
    }

    tasks[index].status = states[stateIdx];
    tasks[index].completion_percentage = states[stateIdx] === 'completed' ? 100 : states[stateIdx] === 'review' ? 90 : states[stateIdx] === 'in_progress' ? 50 : 0;
    
    window.NEMS_DB.saveTable('tasks', tasks);
    this.showToast('تم تحديث حالة المهمة بنجاح.', 'success');
    this.renderKanbanBoard(tasks[index].project_id);
  },

  renderGanttChart: function(projId) {
    const gantt = document.getElementById('project-gantt-chart');
    gantt.innerHTML = '';

    const tasks = window.NEMS_DB.getTable('tasks').filter(t => t.project_id === projId);
    
    // Render timeline columns headers (Mock months)
    let timelineHtml = `
      <div class="gantt-grid" style="border-bottom: 2px solid var(--border-color); font-weight:bold;">
        <div>اسم المهمة</div>
        <div style="display:flex; justify-content:space-between; padding:0 10px;">
          <span>مايو</span>
          <span>يونيو</span>
          <span>يوليو</span>
          <span>أغسطس</span>
        </div>
      </div>
    `;

    tasks.forEach(task => {
      const isCritical = task.priority === 'critical' ? 'critical' : '';
      const leftShift = task.status === 'completed' ? '40%' : task.status === 'review' ? '25%' : '10%';
      const width = task.status === 'completed' ? '50%' : '30%';

      timelineHtml += `
        <div class="gantt-grid" style="align-items:center; border-bottom: 1px solid var(--border-color); height:50px;">
          <div style="font-size:0.85rem; font-weight:bold;">${task.title}</div>
          <div style="position:relative; width:100%; height:100%; display:flex; align-items:center;">
            <div class="gantt-bar ${isCritical}" style="position:absolute; left:${leftShift}; width:${width};">
              ${task.completion_percentage}% إنجاز
            </div>
          </div>
        </div>
      `;
    });

    gantt.innerHTML = timelineHtml;
  },

  renderProjectTeam: function(projId) {
    const container = document.getElementById('project-team-grid');
    container.innerHTML = '';

    const employees = window.NEMS_DB.getTable('employees');
    const users = window.NEMS_DB.getTable('users');
    const tasks = window.NEMS_DB.getTable('tasks').filter(t => t.project_id === projId);

    // Map team members based on tasks assignments
    const assignedEmpIds = [...new Set(tasks.map(t => t.assigned_to))];
    
    assignedEmpIds.forEach(empId => {
      const emp = employees.find(e => e.employee_id === empId);
      if (!emp) return;
      const user = users.find(u => u.user_id === emp.user_id);

      const div = document.createElement('div');
      div.className = 'n-card';
      div.style.display = 'flex';
      div.style.alignItems = 'center';
      div.style.gap = '15px';
      
      div.innerHTML = `
        <img src="${user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'}" style="width:48px; height:48px; border-radius:50%; object-fit:cover;">
        <div>
          <strong style="display:block;">${user.name}</strong>
          <span style="font-size:0.75rem; color:var(--text-muted);">${emp.job_title}</span>
          <div style="font-size:0.8rem; margin-top:5px; font-weight:bold; color:var(--color-primary);">المهام المسندة: ${tasks.filter(t => t.assigned_to === empId).length}</div>
        </div>
      `;
      container.appendChild(div);
    });
  },

  renderProjectBudget: function(projId) {
    const table = document.getElementById('project-expenses-table');
    const expenses = window.NEMS_DB.getTable('expenses').filter(e => e.project_id === projId);

    table.innerHTML = `
      <thead>
        <tr>
          <th>المصروف</th>
          <th>المبلغ</th>
          <th>الحالة</th>
        </tr>
      </thead>
      <tbody>
    `;

    expenses.forEach(e => {
      const statusBadge = e.status === 'approved' ? 'badge-success' : 'badge-warning';
      const statusText = e.status === 'approved' ? 'معتمد' : 'معلق';
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td data-label="المصروف"><strong>${e.title}</strong></td>
        <td data-label="المبلغ">${e.amount.toLocaleString()} SAR</td>
        <td data-label="الحالة"><span class="badge ${statusBadge}">${statusText}</span></td>
      `;
      table.querySelector('tbody').appendChild(tr);
    });
  },

  // -------------------------------------------------------------------------
  // 9. FINANCE, PAYROLL, APPROVALS
  // -------------------------------------------------------------------------
  renderFinanceView: function() {
    const revenues = window.NEMS_DB.getTable('revenues');
    const expenses = window.NEMS_DB.getTable('expenses');
    
    const totalRev = revenues.reduce((acc, r) => acc + r.amount, 0);
    const totalExp = expenses.reduce((acc, e) => acc + e.amount, 0);
    const netProf = totalRev - totalExp;

    document.getElementById('fin-stat-revenues').textContent = totalRev.toLocaleString() + ' SAR';
    document.getElementById('fin-stat-expenses').textContent = totalExp.toLocaleString() + ' SAR';
    
    const profitEl = document.getElementById('fin-stat-profits');
    profitEl.textContent = netProf.toLocaleString() + ' SAR';
    profitEl.style.color = netProf >= 0 ? 'var(--color-success)' : 'var(--color-danger)';

    document.getElementById('fin-stat-pending').textContent = expenses.filter(e => e.status === 'pending_approval').length;

    this.switchFinanceTab(null, this.financeTab);
  },

  switchFinanceTab: function(btn, tab) {
    if (btn) {
      btn.parentElement.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    }

    this.financeTab = tab;
    document.querySelectorAll('.fin-tab-content').forEach(c => c.style.display = 'none');
    document.getElementById(`fin-tab-${tab}`).style.display = 'block';

    if (tab === 'transactions') {
      this.renderTransactionsList();
    } else if (tab === 'payroll') {
      this.renderPayrollSheet();
    } else if (tab === 'approvals') {
      this.renderApprovalsQueue();
    }
  },

  renderTransactionsList: function() {
    const table = document.getElementById('finance-transactions-table');
    const revenues = window.NEMS_DB.getTable('revenues');
    const expenses = window.NEMS_DB.getTable('expenses');

    table.innerHTML = `
      <thead>
        <tr>
          <th>رقم العملية</th>
          <th>البيان</th>
          <th>النوع</th>
          <th>المبلغ</th>
          <th>التاريخ</th>
          <th>العملة</th>
        </tr>
      </thead>
      <tbody>
    `;

    // Merging into one single ledger
    let ledger = [];
    revenues.forEach(r => ledger.push({ id: `REV-${r.revenue_id}`, title: r.title, type: 'إيراد', amount: r.amount, date: r.date, class: 'badge-success' }));
    expenses.forEach(e => ledger.push({ id: `EXP-${e.expense_id}`, title: e.title, type: 'مصروف', amount: e.amount, date: e.date, class: 'badge-danger' }));

    // Sort by date newest
    ledger.sort((a,b) => new Date(b.date) - new Date(a.date));

    ledger.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td data-label="رقم العملية"><strong>${item.id}</strong></td>
        <td data-label="البيان">${item.title}</td>
        <td data-label="النوع"><span class="badge ${item.class}">${item.type}</span></td>
        <td data-label="المبلغ"><strong>${item.amount.toLocaleString()}</strong></td>
        <td data-label="التاريخ">${item.date}</td>
        <td data-label="العملة">SAR</td>
      `;
      table.querySelector('tbody').appendChild(tr);
    });
  },

  renderPayrollSheet: function() {
    const table = document.getElementById('finance-payroll-table');
    const employees = window.NEMS_DB.getTable('employees');
    const users = window.NEMS_DB.getTable('users');
    const proposals = window.NEMS_DB.getTable('deduction_proposals');

    table.innerHTML = `
      <thead>
        <tr>
          <th>الموظف</th>
          <th>الراتب الأساسي</th>
          <th>البدلات</th>
          <th>الخصومات المقترحة (مسودات)</th>
          <th>صافي الراتب المستحق</th>
          <th>الإجراءات</th>
        </tr>
      </thead>
      <tbody>
    `;

    employees.forEach(emp => {
      const user = users.find(u => u.user_id === emp.user_id);
      const myDeductions = proposals.filter(p => p.employee_id === emp.employee_id && p.status === 'draft');
      const totalProps = myDeductions.reduce((acc, d) => acc + d.amount, 0);

      const netSalary = emp.basic_salary + emp.allowances - totalProps;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td data-label="الموظف"><strong>${user.name}</strong><br><small style="color:var(--text-muted);">${emp.job_title}</small></td>
        <td data-label="الأساسي">${this.maskValue(emp.basic_salary)} SAR</td>
        <td data-label="البدلات">${this.maskValue(emp.allowances)} SAR</td>
        <td data-label="الخصم المقترح" style="color:var(--color-warning); font-weight:bold;">${totalProps} SAR</td>
        <td data-label="الصافي" style="font-weight:bold; color:var(--color-success);">${this.maskValue(netSalary)} SAR</td>
        <td data-label="الإجراءات">
          <button class="btn btn-secondary btn-sm" onclick="NEMS_APP.showDeductionDetailsModal('${emp.employee_id}')"><i class="fa-solid fa-hand-holding-dollar"></i> مراجعة الخصومات</button>
        </td>
      `;
      table.querySelector('tbody').appendChild(tr);
    });
  },

  showDeductionDetailsModal: function(empId) {
    const proposals = window.NEMS_DB.getTable('deduction_proposals').filter(p => p.employee_id === empId && p.status === 'draft');
    
    const modalBox = document.getElementById('general-modal-box');
    modalBox.style.maxWidth = '500px';
    modalBox.innerHTML = `
      <div class="modal-header">
        <h3 class="modal-title">الخصومات المقترحة المعلقة</h3>
        <span class="modal-close" onclick="NEMS_APP.closeModal()"><i class="fa-solid fa-xmark"></i></span>
      </div>
      <div style="display:flex; flex-direction:column; gap:12px;" id="modal-deductions-list">
        <!-- Rendered -->
      </div>
    `;

    const list = document.getElementById('modal-deductions-list');
    if (proposals.length === 0) {
      list.innerHTML = '<p style="color:var(--text-muted); text-align:center;">لا يوجد أي خصومات مقترحة لهذا الموظف.</p>';
    } else {
      proposals.forEach(prop => {
        const item = document.createElement('div');
        item.className = 'n-card';
        item.style.display = 'flex';
        item.style.justifyContent = 'space-between';
        item.style.alignItems = 'center';
        
        item.innerHTML = `
          <div>
            <strong>السبب: ${prop.reason}</strong>
            <div style="font-size:0.9rem; color:var(--color-danger); font-weight:bold; margin-top:4px;">القيمة: ${prop.amount} SAR</div>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="btn btn-primary btn-sm" onclick="NEMS_APP.approveDeduction(${prop.deduction_id})" style="background-color:var(--color-success);"><i class="fa-solid fa-circle-check"></i> اعتماد</button>
            <button class="btn btn-danger btn-sm" onclick="NEMS_APP.cancelDeduction(${prop.deduction_id})"><i class="fa-solid fa-circle-xmark"></i> إلغاء</button>
          </div>
        `;
        list.appendChild(item);
      });
    }

    document.getElementById('general-modal').style.display = 'flex';
  },

  approveDeduction: function(deductionId) {
    const proposals = window.NEMS_DB.getTable('deduction_proposals');
    const index = proposals.findIndex(p => p.deduction_id === deductionId);
    if (index !== -1) {
      proposals[index].status = 'approved';
      proposals[index].approved_by = this.currentUser.user_id;
      proposals[index].approved_at = new Date().toISOString().replace('T', ' ').substring(0, 19);
      
      window.NEMS_DB.saveTable('deduction_proposals', proposals);
      this.showToast('تم اعتماد الخصم بنجاح وضمه للفاتورة الشهرية.', 'success');
      this.closeModal();
      this.renderPayrollSheet();
    }
  },

  cancelDeduction: function(deductionId) {
    const proposals = window.NEMS_DB.getTable('deduction_proposals');
    const index = proposals.findIndex(p => p.deduction_id === deductionId);
    if (index !== -1) {
      proposals[index].status = 'cancelled';
      window.NEMS_DB.saveTable('deduction_proposals', proposals);
      this.showToast('تم إلغاء الخصم المقترح بنجاح.', 'info');
      this.closeModal();
      this.renderPayrollSheet();
    }
  },

  renderApprovalsQueue: function() {
    const table = document.getElementById('finance-approvals-table');
    const expenses = window.NEMS_DB.getTable('expenses').filter(e => e.status === 'pending_approval');

    table.innerHTML = `
      <thead>
        <tr>
          <th>رقم المعاملة</th>
          <th>البيان والطلب</th>
          <th>المبلغ المطلوب</th>
          <th>طالب الصرف</th>
          <th>تاريخ الطلب</th>
          <th>الإجراءات</th>
        </tr>
      </thead>
      <tbody>
    `;

    if (expenses.length === 0) {
      table.innerHTML += '<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">لا يوجد أي فواتير أو طلبات بانتظار الاعتماد.</td></tr>';
      return;
    }

    expenses.forEach(e => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td data-label="رقم المعاملة"><strong>EXP-${e.expense_id}</strong></td>
        <td data-label="البيان"><strong>${e.title}</strong><br><small style="color:var(--text-muted);">${e.category}</small></td>
        <td data-label="المبلغ">${e.amount.toLocaleString()} SAR</td>
        <td data-label="طالب الصرف">المحاسبة المالية</td>
        <td data-label="التاريخ">${e.date}</td>
        <td data-label="الإجراءات">
          <button class="btn btn-primary btn-sm" onclick="NEMS_APP.approveExpense(${e.expense_id})" style="background-color:var(--color-success);"><i class="fa-solid fa-check"></i> موافقة</button>
          <button class="btn btn-danger btn-sm" onclick="NEMS_APP.rejectExpense(${e.expense_id})"><i class="fa-solid fa-xmark"></i> رفض</button>
        </td>
      `;
      table.querySelector('tbody').appendChild(tr);
    });
  },

  approveExpense: function(expenseId) {
    const expenses = window.NEMS_DB.getTable('expenses');
    const index = expenses.findIndex(e => e.expense_id === expenseId);
    if (index !== -1) {
      expenses[index].status = 'approved';
      expenses[index].approved_by = this.currentUser.user_id;
      expenses[index].approved_at = new Date().toISOString().replace('T', ' ').substring(0, 19);
      
      window.NEMS_DB.saveTable('expenses', expenses);
      this.showToast('تم اعتماد طلب الصرف المالي وإصداره بنجاح.', 'success');
      this.renderFinanceView();
    }
  },

  rejectExpense: function(expenseId) {
    const expenses = window.NEMS_DB.getTable('expenses');
    const index = expenses.findIndex(e => e.expense_id === expenseId);
    if (index !== -1) {
      expenses[index].status = 'rejected';
      window.NEMS_DB.saveTable('expenses', expenses);
      this.showToast('تم رفض طلب الصرف المالي وإلغاؤه.', 'danger');
      this.renderFinanceView();
    }
  },

  // -------------------------------------------------------------------------
  // 10. OWNERS, SHARES, governance
  // -------------------------------------------------------------------------
  renderOwnersView: function() {
    this.switchOwnersTab(null, this.ownersTab);
    
    // Personal share details widget
    const personalCard = document.getElementById('owner-personal-share-card');
    if (personalCard) {
      const ownerId = 2; // Hardcoded Demo Owner Layla (1000 shares)
      const shares = window.NEMS_DB.getTable('shares').find(s => s.owner_id === ownerId);
      
      if (shares) {
        personalCard.innerHTML = `
          <div style="display:flex; justify-content:space-between;"><span>عدد أسهمك المملوكة:</span><span style="font-weight:bold;">${shares.total_shares.toLocaleString()} سهم</span></div>
          <div style="display:flex; justify-content:space-between;"><span>نسبة ملكيتك في الشركة:</span><span style="font-weight:bold; color:var(--color-primary);">${shares.ownership_percentage}%</span></div>
          <div style="display:flex; justify-content:space-between;"><span>القيمة التقديرية لمحفظتك:</span><span style="font-weight:bold; color:var(--color-success);">${(shares.total_shares * shares.current_value).toLocaleString()} SAR</span></div>
          <div style="display:flex; justify-content:space-between;"><span>حالة الأسهم الحالية:</span><span class="badge ${shares.is_frozen ? 'badge-danger' : 'badge-success'}">${shares.is_frozen ? 'مجمدة' : 'نشطة وقابلة للتداول'}</span></div>
        `;
      }
    }
  },

  switchOwnersTab: function(btn, tab) {
    if (btn) {
      btn.parentElement.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    }

    this.ownersTab = tab;
    document.querySelectorAll('.owner-tab-content').forEach(c => c.style.display = 'none');
    document.getElementById(`owner-tab-${tab}`).style.display = 'block';

    if (tab === 'board') {
      this.renderOwnersBoard();
    } else if (tab === 'ledger') {
      this.renderSharesLedger();
    }
  },

  renderOwnersBoard: function() {
    const container = document.getElementById('owners-cards-container');
    container.innerHTML = '';

    const owners = window.NEMS_DB.getTable('owners');
    const shares = window.NEMS_DB.getTable('shares');

    owners.forEach(owner => {
      const myShare = shares.find(s => s.owner_id === owner.owner_id) || {};
      const value = myShare.total_shares ? myShare.total_shares * myShare.current_value : 0;

      const card = document.createElement('div');
      card.className = 'n-card';
      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <strong>${owner.name}</strong>
          <span class="badge badge-success">${myShare.ownership_percentage || 0}%</span>
        </div>
        <div style="font-size:0.85rem; display:flex; flex-direction:column; gap:6px;">
          <div>عدد الأسهم: <strong>${myShare.total_shares?.toLocaleString() || 0} سهم</strong></div>
          <div>قيمة المحفظة: <strong>${value.toLocaleString()} SAR</strong></div>
          <div>تاريخ الانضمام: <strong>${owner.join_date}</strong></div>
        </div>
      `;
      container.appendChild(card);
    });
  },

  renderSharesLedger: function() {
    const table = document.getElementById('shares-transactions-table');
    const txs = window.NEMS_DB.getTable('share_transactions');
    const owners = window.NEMS_DB.getTable('owners');

    table.innerHTML = `
      <thead>
        <tr>
          <th>رقم العملية</th>
          <th>من المالك</th>
          <th>المستفيد الجديد</th>
          <th>عدد الأسهم</th>
          <th>نوع العملية</th>
          <th>الحالة</th>
          <th>التاريخ</th>
        </tr>
      </thead>
      <tbody>
    `;

    txs.forEach(tx => {
      const from = owners.find(o => o.owner_id === tx.from_owner_id)?.name || 'الشركة الأساسية';
      const to = owners.find(o => o.owner_id === tx.to_owner_id)?.name || 'غير محدد';
      
      const badge = tx.status === 'completed' ? 'badge-success' : 'badge-warning';
      const statusText = tx.status === 'completed' ? 'مكتملة' : 'معلقة';
      const typeText = tx.transaction_type === 'transfer' ? 'تحويل' : tx.transaction_type === 'sale' ? 'بيع' : 'إهداء';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td data-label="رقم العملية"><strong>SHR-${tx.transaction_id}</strong></td>
        <td data-label="من المالك">${from}</td>
        <td data-label="المستفيد">${to}</td>
        <td data-label="عدد الأسهم">${tx.shares_count.toLocaleString()}</td>
        <td data-label="النوع">${typeText}</td>
        <td data-label="الحالة"><span class="badge ${badge}">${statusText}</span></td>
        <td data-label="التاريخ">${tx.created_at.split(' ')[0]}</td>
      `;
      table.querySelector('tbody').appendChild(tr);
    });
  },

  showShareTransferModal: function() {
    const modalBox = document.getElementById('general-modal-box');
    modalBox.style.maxWidth = '500px';
    modalBox.innerHTML = `
      <div class="modal-header">
        <h3 class="modal-title">طلب تداول ونقل ملكية الأسهم</h3>
        <span class="modal-close" onclick="NEMS_APP.closeModal()"><i class="fa-solid fa-xmark"></i></span>
      </div>
      <form id="share-transfer-form" onsubmit="event.preventDefault(); NEMS_APP.submitShareTransferRequest();">
        <div class="form-group">
          <label>المستفيد (الشريك الجديد)</label>
          <select id="transfer-target-owner" class="n-input"></select>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>عدد الأسهم</label>
            <input type="number" id="transfer-shares-count" class="n-input" required min="1">
          </div>
          <div class="form-group">
            <label>نوع العملية</label>
            <select id="transfer-type" class="n-input">
              <option value="transfer">تحويل رسمي</option>
              <option value="sale">بيع استثماري</option>
              <option value="gift">هبة أو إهداء</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>ملاحظات ومبررات النقل</label>
          <textarea id="transfer-notes" class="n-input" rows="3"></textarea>
        </div>
        
        <!-- Sensitive OTP requirement warning -->
        <div style="background-color:rgba(192,57,43,0.1); padding:10px; border-radius:6px; font-size:0.8rem; color:var(--color-primary); margin-bottom:15px;">
          <i class="fa-solid fa-shield-halved"></i> تتطلب هذه العملية تأكيد الهوية برمز OTP قبل الإحالة للموافقة الإدارية.
        </div>

        <button type="submit" class="btn btn-primary" style="width: 100%;">تأكيد وإرسال الطلب</button>
      </form>
    `;

    // Populate owners dropdown except the current active owner
    const owners = window.NEMS_DB.getTable('owners');
    const select = document.getElementById('transfer-target-owner');
    owners.forEach(o => {
      if (o.owner_id !== 3) { // Mock owner id is 3 (Layla)
        const opt = document.createElement('option');
        opt.value = o.owner_id;
        opt.textContent = o.name;
        select.appendChild(opt);
      }
    });

    document.getElementById('general-modal').style.display = 'flex';
  },

  submitShareTransferRequest: function() {
    const targetOwner = parseInt(document.getElementById('transfer-target-owner').value);
    const sharesCount = parseInt(document.getElementById('transfer-shares-count').value);
    const type = document.getElementById('transfer-type').value;
    const notes = document.getElementById('transfer-notes').value;

    // Call OTP verification prompt
    this.closeModal();
    this.showOTPVerificationPrompt(() => {
      // Execute transaction draft
      window.NEMS_DB.insertRecord('share_transactions', {
        from_owner_id: 3, // Mock Layla
        to_owner_id: targetOwner,
        shares_count: sharesCount,
        transaction_type: type,
        price_per_share: type === 'sale' ? 25 : 0,
        total_value: type === 'sale' ? sharesCount * 25 : 0,
        status: 'pending_approval',
        approved_by: null,
        approved_at: null,
        notes: notes
      }, this.currentUser.user_id);

      this.showToast('تم التحقق وتقديم طلب نقل الأسهم بنجاح للاعتماد من المدير العام.', 'success');
      if (this.activeView === 'owners') this.renderOwnersView();
    });
  },

  showOTPVerificationPrompt: function(onSuccess) {
    // Generate simulated code
    this.activeOTP = String(Math.floor(100000 + Math.random() * 900000));
    document.getElementById('dev-otp-code').textContent = this.activeOTP;

    const modalBox = document.getElementById('general-modal-box');
    modalBox.style.maxWidth = '400px';
    modalBox.innerHTML = `
      <div class="modal-header">
        <h3 class="modal-title">تأكيد أمان العملية (OTP)</h3>
        <span class="modal-close" onclick="NEMS_APP.closeModal()"><i class="fa-solid fa-xmark"></i></span>
      </div>
      <div style="text-align:center;">
        <p style="font-size:0.9rem; color:var(--text-muted); margin-bottom:15px;">تم إرسال رمز OTP مؤلف من 6 خانات لتأكيد تنفيذ العملية الحساسة.</p>
        <div class="otp-container">
          <input type="text" maxlength="1" class="otp-box-verify" style="width:40px; height:40px; text-align:center; font-size:1.2rem; border-radius:4px; border:1px solid var(--border-color); outline:none;" onkeyup="NEMS_APP.handleVerifyOtpInput(this, 0)">
          <input type="text" maxlength="1" class="otp-box-verify" style="width:40px; height:40px; text-align:center; font-size:1.2rem; border-radius:4px; border:1px solid var(--border-color); outline:none;" onkeyup="NEMS_APP.handleVerifyOtpInput(this, 1)">
          <input type="text" maxlength="1" class="otp-box-verify" style="width:40px; height:40px; text-align:center; font-size:1.2rem; border-radius:4px; border:1px solid var(--border-color); outline:none;" onkeyup="NEMS_APP.handleVerifyOtpInput(this, 2)">
          <input type="text" maxlength="1" class="otp-box-verify" style="width:40px; height:40px; text-align:center; font-size:1.2rem; border-radius:4px; border:1px solid var(--border-color); outline:none;" onkeyup="NEMS_APP.handleVerifyOtpInput(this, 3)">
          <input type="text" maxlength="1" class="otp-box-verify" style="width:40px; height:40px; text-align:center; font-size:1.2rem; border-radius:4px; border:1px solid var(--border-color); outline:none;" onkeyup="NEMS_APP.handleVerifyOtpInput(this, 4)">
          <input type="text" maxlength="1" class="otp-box-verify" style="width:40px; height:40px; text-align:center; font-size:1.2rem; border-radius:4px; border:1px solid var(--border-color); outline:none;" onkeyup="NEMS_APP.handleVerifyOtpInput(this, 5)">
        </div>
        <button class="btn btn-primary" id="btn-verify-otp-action" style="width: 100%; margin-top: 15px;">التحقق من الرمز وتنفيذ العملية</button>
      </div>
    `;

    document.getElementById('btn-verify-otp-action').onclick = () => {
      const boxes = document.querySelectorAll('.otp-box-verify');
      let code = '';
      boxes.forEach(b => code += b.value);

      if (this.activeOTP && code === this.activeOTP) {
        this.closeModal();
        onSuccess();
      } else {
        this.showToast('رمز التحقق غير صحيح.', 'danger');
      }
    };

    document.getElementById('general-modal').style.display = 'flex';
  },

  handleVerifyOtpInput: function(input, index) {
    if (input.value && index < 5) {
      input.nextElementSibling.focus();
    }
  },

  // -------------------------------------------------------------------------
  // 11. MEETINGS & COLLABORATION
  // -------------------------------------------------------------------------
  renderMeetingsView: function() {
    const list = document.getElementById('meetings-list');
    list.innerHTML = '';
    
    const meetings = window.NEMS_DB.getTable('meetings');
    const users = window.NEMS_DB.getTable('users');

    meetings.forEach(m => {
      const org = users.find(u => u.user_id === m.organizer_id)?.name || 'غير محدد';
      const div = document.createElement('div');
      div.className = 'n-card';
      div.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <strong>${m.title}</strong>
          <span class="badge badge-success">مجدول</span>
        </div>
        <p style="font-size:0.85rem; color:var(--text-muted);">${m.description}</p>
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.8rem; margin-top:12px; border-top:1px solid var(--border-color); padding-top:8px;">
          <span>المنظم: <strong>${org}</strong></span>
          <span>التاريخ والوقت: <strong>${m.date} - ${m.start_time.substring(0, 5)}</strong></span>
        </div>
      `;
      list.appendChild(div);
    });

    // Populate active votes
    const votesList = document.getElementById('votes-list');
    votesList.innerHTML = '';

    const votes = window.NEMS_DB.getTable('votes').filter(v => v.status === 'active');
    votes.forEach(v => {
      const div = document.createElement('div');
      div.className = 'n-card';
      
      let optionsHtml = '';
      const opts = window.NEMS_DB.getTable('vote_options').filter(o => o.vote_id === v.vote_id);
      
      opts.forEach(opt => {
        optionsHtml += `
          <button class="btn btn-secondary btn-sm" onclick="NEMS_APP.performVote(${v.vote_id}, ${opt.option_id})" style="width:100%; justify-content:space-between; margin-top:5px;">
            <span>${opt.option_text}</span>
            <strong>${opt.weighted_percentage}%</strong>
          </button>
        `;
      });

      div.innerHTML = `
        <div style="font-weight:bold; margin-bottom:5px;">${v.title}</div>
        <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:12px;">${v.description}</p>
        <div>${optionsHtml}</div>
      `;
      votesList.appendChild(div);
    });
  },

  performVote: function(voteId, optionId) {
    const votes = window.NEMS_DB.getTable('user_votes');
    const alreadyVoted = votes.some(v => v.vote_id === voteId && v.user_id === this.currentUser.user_id);

    if (alreadyVoted) {
      this.showToast('لقد قمت بالتصويت مسبقاً على هذا القرار.', 'warning');
      return;
    }

    // Get owner shares weight
    const shares = window.NEMS_DB.getTable('shares');
    // layla is owner_id 3, connected to user_id 3. আহমদ user_id 2 connected to owner_id 1
    const owner = window.NEMS_DB.getTable('owners').find(o => o.user_id === this.currentUser.user_id);
    const weight = owner ? shares.find(s => s.owner_id === owner.owner_id)?.total_shares || 0 : 0;

    window.NEMS_DB.insertRecord('user_votes', {
      vote_id: voteId,
      user_id: this.currentUser.user_id,
      option_id: optionId,
      shares_weight: weight
    }, this.currentUser.user_id);

    // Recalculate options percentages based on shares
    const allVotes = window.NEMS_DB.getTable('user_votes').filter(v => v.vote_id === voteId);
    const totalWeightedShares = allVotes.reduce((acc, v) => acc + v.shares_weight, 0);

    const opts = window.NEMS_DB.getTable('vote_options');
    opts.forEach((opt, idx) => {
      if (opt.vote_id === voteId) {
        const optionVotes = allVotes.filter(v => v.option_id === opt.option_id);
        const optionWeightSum = optionVotes.reduce((acc, v) => acc + v.shares_weight, 0);
        
        opts[idx].votes_count = optionVotes.length;
        opts[idx].weighted_percentage = totalWeightedShares > 0 ? parseFloat(((optionWeightSum / totalWeightedShares) * 100).toFixed(1)) : 0;
      }
    });
    window.NEMS_DB.saveTable('vote_options', opts);

    this.showToast('تم تسجيل صوتك ونسب وزن الأسهم الخاص بك بنجاح.', 'success');
    this.renderMeetingsView();
  },

  // -------------------------------------------------------------------------
  // 12. MESSAGES MODULE
  // -------------------------------------------------------------------------
  renderMessagesView: function() {
    const list = document.getElementById('messages-conv-list');
    list.innerHTML = '';

    const convs = window.NEMS_DB.getTable('conversations');
    convs.forEach(c => {
      const item = document.createElement('div');
      item.className = 'nav-item';
      item.style.margin = '5px 10px';
      item.style.padding = '10px';
      item.style.borderRadius = '6px';
      item.style.backgroundColor = 'var(--bg-card)';
      item.style.cursor = 'pointer';
      
      const icon = c.type === 'direct' ? 'fa-user' : 'fa-users';
      item.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${c.name}</span>`;
      item.onclick = () => this.openConversation(c.conversation_id);
      list.appendChild(item);
    });
  },

  openConversation: function(convId) {
    const convs = window.NEMS_DB.getTable('conversations');
    const c = convs.find(co => co.conversation_id === convId);
    if (!c) return;

    document.getElementById('active-chat-header').textContent = c.name;
    const history = document.getElementById('active-chat-messages');
    history.innerHTML = '';

    const messages = window.NEMS_DB.getTable('messages').filter(m => m.conversation_id === convId);
    const users = window.NEMS_DB.getTable('users');

    messages.forEach(msg => {
      const senderName = users.find(u => u.user_id === msg.sender_id)?.name || 'غير معروف';
      const isMe = msg.sender_id === this.currentUser.user_id;

      const div = document.createElement('div');
      div.style.padding = '10px 14px';
      div.style.borderRadius = '8px';
      div.style.maxWidth = '75%';
      div.style.fontSize = '0.85rem';
      div.style.marginBottom = '8px';
      div.style.alignSelf = isMe ? 'flex-end' : 'flex-start';
      div.style.backgroundColor = isMe ? 'var(--color-primary)' : 'var(--bg-card)';
      div.style.color = isMe ? '#FFFFFF' : 'var(--text-main)';

      div.innerHTML = `
        <strong style="display:block; font-size:0.75rem; opacity:0.8; margin-bottom:4px;">${senderName}</strong>
        <span>${msg.message_text}</span>
      `;
      history.appendChild(div);
    });

    // Save active chat ID inside session
    sessionStorage.setItem('active_chat_conv_id', convId);
    history.scrollTop = history.scrollHeight;
  },

  sendDirectMessage: function() {
    const convId = parseInt(sessionStorage.getItem('active_chat_conv_id'));
    const input = document.getElementById('chat-text-input');
    const text = input.value;
    if (!convId || !text) return;

    window.NEMS_DB.insertRecord('messages', {
      sender_id: this.currentUser.user_id,
      receiver_id: null,
      conversation_id: convId,
      message_text: text,
      file_id: null,
      is_read: true,
      status: 'read'
    }, this.currentUser.user_id);

    input.value = '';
    this.openConversation(convId);
  },

  // -------------------------------------------------------------------------
  // 13. DOCUMENTS & VERSIONS Explorer
  // -------------------------------------------------------------------------
  renderDocumentsView: function(category = null) {
    const table = document.getElementById('documents-table-body');
    const docs = window.NEMS_DB.getTable('files');
    const users = window.NEMS_DB.getTable('users');

    table.innerHTML = `
      <thead>
        <tr>
          <th>اسم الملف</th>
          <th>القسم</th>
          <th>نوع المستند</th>
          <th>سرية الملف</th>
          <th>رقم الإصدار</th>
          <th>الرافع</th>
          <th>الإجراءات</th>
        </tr>
      </thead>
      <tbody>
    `;

    docs.forEach(doc => {
      if (category && doc.category !== category) return;

      const uploader = users.find(u => u.user_id === doc.uploaded_by)?.name || 'غير معروف';
      
      let badgeClass = 'badge-success';
      if (doc.confidentiality === 'top_secret') badgeClass = 'badge-danger';
      if (doc.confidentiality === 'confidential') badgeClass = 'badge-warning';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td data-label="اسم الملف"><strong>${doc.name}</strong><br><small style="color:var(--text-muted);">${(doc.size / 1024).toFixed(0)} KB</small></td>
        <td data-label="القسم">الموارد البشرية</td>
        <td data-label="النوع">${doc.category === 'contract' ? 'عقد' : 'سياسة'}</td>
        <td data-label="السرية"><span class="badge ${badgeClass}">${doc.confidentiality}</span></td>
        <td data-label="الإصدار">v${doc.current_version}.0</td>
        <td data-label="الرافع">${uploader}</td>
        <td data-label="الإجراءات">
          <button class="btn btn-secondary btn-sm" onclick="NEMS_APP.showDocumentVersionsModal(${doc.file_id})"><i class="fa-solid fa-code-branch"></i> تاريخ الإصدارات</button>
        </td>
      `;
      table.querySelector('tbody').appendChild(tr);
    });
  },

  showDocumentVersionsModal: function(fileId) {
    const versions = window.NEMS_DB.getTable('file_versions').filter(v => v.file_id === fileId);
    
    const modalBox = document.getElementById('general-modal-box');
    modalBox.style.maxWidth = '550px';
    modalBox.innerHTML = `
      <div class="modal-header">
        <h3 class="modal-title">تاريخ إصدارات الملف</h3>
        <span class="modal-close" onclick="NEMS_APP.closeModal()"><i class="fa-solid fa-xmark"></i></span>
      </div>
      <div style="display:flex; flex-direction:column; gap:12px;" id="modal-versions-list">
        <!-- Rendered -->
      </div>
    `;

    const list = document.getElementById('modal-versions-list');
    versions.forEach(v => {
      const item = document.createElement('div');
      item.className = 'n-card';
      item.style.display = 'flex';
      item.style.justifyContent = 'space-between';
      item.style.alignItems = 'center';
      
      item.innerHTML = `
        <div>
          <strong>الإصدار v${v.version_number}.0</strong>
          <p style="font-size:0.8rem; color:var(--text-muted); margin-top:4px;">${v.change_note}</p>
        </div>
        <button class="btn btn-primary btn-sm" onclick="NEMS_APP.rollbackFileVersion(${fileId}, ${v.version_number})" style="background-color:var(--color-secondary); color:#000;"><i class="fa-solid fa-rotate-left"></i> استعادة هذا الإصدار</button>
      `;
      list.appendChild(item);
    });

    document.getElementById('general-modal').style.display = 'flex';
  },

  rollbackFileVersion: function(fileId, versionNum) {
    const files = window.NEMS_DB.getTable('files');
    const fIndex = files.findIndex(f => f.file_id === fileId);
    if (fIndex === -1) return;

    const versions = window.NEMS_DB.getTable('file_versions');
    const targetVersion = versions.find(v => v.file_id === fileId && v.version_number === versionNum);
    
    if (targetVersion) {
      const nextVersionNum = files[fIndex].current_version + 1;
      
      // Update main file current version
      files[fIndex].current_version = nextVersionNum;
      window.NEMS_DB.saveTable('files', files);

      // Create new version snapshot linking to rollback target
      window.NEMS_DB.insertRecord('file_versions', {
        file_id: fileId,
        version_number: nextVersionNum,
        content_snapshot: targetVersion.content_snapshot,
        change_note: `استعادة متطابقة للإصدار v${versionNum}.0 بواسطة ${this.currentUser.name}`,
        uploaded_by: this.currentUser.user_id,
        is_rollback: true
      }, this.currentUser.user_id);

      this.showToast(`تم التراجع واستعادة الإصدار v${versionNum}.0 بنجاح كإصدار v${nextVersionNum}.0`, 'success');
      this.closeModal();
      this.renderDocumentsView();
    }
  },

  // -------------------------------------------------------------------------
  // 14. SETTINGS, BRAND Repainting, BACKUP/RESTORE
  // -------------------------------------------------------------------------
  renderSettingsView: function() {
    const settings = window.NEMS_DB.getTable('system_settings');
    
    // Fill company setting fields
    document.getElementById('set-company-name').value = settings.find(s => s.key === 'company_name')?.value || '';
    document.getElementById('set-primary-color').value = settings.find(s => s.key === 'primary_color')?.value || '#C0392B';
    document.getElementById('set-secondary-color').value = settings.find(s => s.key === 'secondary_color')?.value || '#F39C12';
    
    // Fill policies fields
    document.getElementById('set-start-time').value = settings.find(s => s.key === 'work_start_time')?.value || '08:00';
    document.getElementById('set-end-time').value = settings.find(s => s.key === 'work_end_time')?.value || '17:00';
    document.getElementById('set-hourly-checks').value = settings.find(s => s.key === 'hourly_checkins_required')?.value || 8;
    document.getElementById('set-late-tolerance').value = settings.find(s => s.key === 'late_tolerance_minutes')?.value || 15;
    
    // Fill maintenance checkbox
    document.getElementById('set-maintenance-mode').checked = settings.find(s => s.key === 'maintenance_mode')?.value === 'true';

    this.switchSettingsTab(null, this.settingsTab);
  },

  switchSettingsTab: function(btn, tab) {
    if (btn) {
      btn.parentElement.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    }

    this.settingsTab = tab;
    document.querySelectorAll('.settings-content').forEach(c => c.style.display = 'none');
    document.getElementById(`settings-tab-${tab}`).style.display = 'block';
  },

  saveCompanySettings: function() {
    const name = document.getElementById('set-company-name').value;
    const primary = document.getElementById('set-primary-color').value;
    const secondary = document.getElementById('set-secondary-color').value;

    const settings = window.NEMS_DB.getTable('system_settings');
    this.updateSettingKey(settings, 'company_name', name);
    this.updateSettingKey(settings, 'primary_color', primary);
    this.updateSettingKey(settings, 'secondary_color', secondary);
    
    window.NEMS_DB.saveTable('system_settings', settings);
    this.applyBrandColors();
    this.showToast('تم حفظ إعدادات الهوية البصرية للشركة وإعادة طلائها.', 'success');
  },

  savePolicySettings: function() {
    const start = document.getElementById('set-start-time').value;
    const end = document.getElementById('set-end-time').value;
    const checks = parseInt(document.getElementById('set-hourly-checks').value);
    const late = parseInt(document.getElementById('set-late-tolerance').value);

    const settings = window.NEMS_DB.getTable('system_settings');
    this.updateSettingKey(settings, 'work_start_time', start);
    this.updateSettingKey(settings, 'work_end_time', end);
    this.updateSettingKey(settings, 'hourly_checkins_required', checks);
    this.updateSettingKey(settings, 'late_tolerance_minutes', late);

    window.NEMS_DB.saveTable('system_settings', settings);
    this.showToast('تم حفظ سياسات وقواعد احتساب الدوام بنجاح.', 'success');
  },

  updateSettingKey: function(settings, key, val) {
    const idx = settings.findIndex(s => s.key === key);
    if (idx !== -1) {
      settings[idx].value = String(val);
      settings[idx].updated_at = new Date().toISOString().replace('T', ' ').substring(0, 19);
      settings[idx].updated_by = this.currentUser.user_id;
    }
  },

  toggleMaintenanceMode: function(isChecked) {
    const settings = window.NEMS_DB.getTable('system_settings');
    this.updateSettingKey(settings, 'maintenance_mode', isChecked);
    window.NEMS_DB.saveTable('system_settings', settings);
    this.showToast(`وضع الصيانة العالمي للنظام أصبح: ${isChecked ? 'مفعّل' : 'معطّل'}.`, 'warning');
  },

  performDatabaseExport: function() {
    const tables = Object.keys(window.NEMS_DB.seed);
    const backup = {};
    tables.forEach(t => {
      backup[t] = window.NEMS_DB.getTable(t);
    });

    const json = JSON.stringify(backup, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `NEMS_DB_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    this.showToast('تم تصدير قاعدة البيانات بنجاح كملف JSON.', 'success');
  },

  performDatabaseImport: function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        const check = window.NEMS_DB.schemaIntegrityCheck(data);
        
        if (check.success) {
          // Restore all tables
          Object.keys(data).forEach(t => {
            window.NEMS_DB.saveTable(t, data[t]);
          });
          
          this.showToast('تم استيراد قاعدة البيانات بنجاح بنزاهة هيكلية 100%.', 'success');
          // Reload page to reflect imports
          setTimeout(() => location.reload(), 1000);
        } else {
          this.showToast(check.error, 'danger');
        }
      } catch (err) {
        this.showToast('فشل قراءة الملف. يرجى التأكد من اختيار ملف JSON صحيح.', 'danger');
      }
    };
    reader.readAsText(file);
  },

  triggerUpgradeSimulation: function() {
    this.showToast('جاري بدء محاكاة ترقية النواة التقنية...', 'info');
    
    // Simulate modal countdown progress
    const modalBox = document.getElementById('general-modal-box');
    modalBox.style.maxWidth = '400px';
    modalBox.innerHTML = `
      <div style="text-align: center; padding: 20px;">
        <div style="font-size: 3rem; color: var(--color-primary);"><i class="fa-solid fa-circle-up"></i></div>
        <h3 style="margin-top: 15px;">جاري ترقية هيكل نظام NEMS</h3>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 8px;">يرجى عدم إغلاق الصفحة أثناء تحديث ترخيص الصلاحيات.</p>
        
        <div style="width: 100%; height: 6px; background:#e2e8f0; border-radius:3px; overflow:hidden; margin-top:20px;">
          <div id="upgrade-bar" style="width:0%; height:100%; background:var(--color-primary); transition: width 0.2s;"></div>
        </div>
        <div id="upgrade-text" style="font-size: 0.8rem; font-weight: bold; margin-top: 8px;">0% مكتمل</div>
      </div>
    `;
    document.getElementById('general-modal').style.display = 'flex';

    let pct = 0;
    const bar = document.getElementById('upgrade-bar');
    const text = document.getElementById('upgrade-text');
    
    const interval = setInterval(() => {
      if (pct >= 100) {
        clearInterval(interval);
        this.closeModal();
        this.showToast('تمت ترقية إصدار النظام وقاعدة البيانات بنجاح لـ v1.0.1.', 'success');
      } else {
        pct += 10;
        bar.style.width = pct + '%';
        text.textContent = `${pct}% مكتمل`;
      }
    }, 300);
  },

  // -------------------------------------------------------------------------
  // 15. NOTIFICATIONS & HELP
  // -------------------------------------------------------------------------
  renderNotificationsView: function() {
    const list = document.getElementById('notifications-full-list');
    list.innerHTML = '';

    const notifs = window.NEMS_DB.getTable('notifications').filter(n => n.user_id === this.currentUser.user_id);
    if (notifs.length === 0) {
      list.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding: 20px;">لا يوجد أي تنبيهات حالية.</p>';
      return;
    }

    notifs.forEach(n => {
      const item = document.createElement('div');
      item.style.padding = '15px';
      item.style.borderBottom = '1px solid var(--border-color)';
      item.style.display = 'flex';
      item.style.justifyContent = 'space-between';
      item.style.alignItems = 'center';
      
      item.innerHTML = `
        <div>
          <strong>${n.title}</strong>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">${n.message}</p>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="NEMS_APP.deleteNotification(${n.notification_id})"><i class="fa-solid fa-trash-can"></i></button>
      `;
      list.appendChild(item);
    });
  },

  deleteNotification: function(id) {
    window.NEMS_DB.deleteRecord('notifications', id, this.currentUser.user_id);
    this.showToast('تمت أرشفة/حذف الإشعار.', 'info');
    this.renderNotificationsView();
  },

  markAllNotificationsRead: function() {
    const notifs = window.NEMS_DB.getTable('notifications');
    notifs.forEach((n, idx) => {
      if (n.user_id === this.currentUser.user_id) {
        notifs[idx].is_read = true;
      }
    });
    window.NEMS_DB.saveTable('notifications', notifs);
    this.showToast('تم تحديد جميع الإشعارات كمقروءة.', 'success');
  },

  renderProfileView: function() {
    document.getElementById('profile-name').textContent = this.currentUser.name;
    document.getElementById('profile-role').textContent = this.activeRole.description;
    document.getElementById('profile-email').textContent = this.currentUser.email;
    document.getElementById('profile-phone').textContent = this.currentUser.phone;
    document.getElementById('profile-hire-date').textContent = this.currentUser.created_at.split(' ')[0];
  },

  // -------------------------------------------------------------------------
  // 16. QUALITY ASSURANCE FEEDBACK & DIALOG CLOSE
  // -------------------------------------------------------------------------
  showFeedbackModal: function() {
    const modalBox = document.getElementById('general-modal-box');
    modalBox.style.maxWidth = '400px';
    modalBox.innerHTML = `
      <div class="modal-header">
        <h3 class="modal-title">إرسال بلاغ أو ملاحظة للجودة</h3>
        <span class="modal-close" onclick="NEMS_APP.closeModal()"><i class="fa-solid fa-xmark"></i></span>
      </div>
      <form id="feedback-form" onsubmit="event.preventDefault(); NEMS_APP.submitFeedback();">
        <div class="form-group">
          <label>نوع الملاحظة</label>
          <select id="feed-type" class="n-input">
            <option value="تحسين">اقتراح تحسين بصري</option>
            <option value="مشكلة">إبلاغ عن خطأ/مشكلة (Bug)</option>
            <option value="أخرى">أخرى</option>
          </select>
        </div>
        <div class="form-group">
          <label>وصف الملاحظة بالتفصيل</label>
          <textarea id="feed-desc" class="n-input" rows="4" required placeholder="يرجى كتابة تفاصيل ما ترغب بتعديله أو تحسينه بالجودة..."></textarea>
        </div>
        <button type="submit" class="btn btn-primary" style="width:100%;">إرسال الملاحظة الفنية</button>
      </form>
    `;
    document.getElementById('general-modal').style.display = 'flex';
  },

  submitFeedback: function() {
    const type = document.getElementById('feed-type').value;
    const desc = document.getElementById('feed-desc').value;

    window.NEMS_DB.insertRecord('feedback_reports', {
      userId: this.currentUser.user_id,
      screen: this.activeView,
      type: type,
      description: desc,
      priority: 'normal',
      status: 'pending',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19)
    }, this.currentUser.user_id);

    this.showToast('تم إرسال بلاغ الملاحظة لفريق المراجعة بنجاح. شكراً لك!', 'success');
    this.closeModal();
    this.updateStorageSizeGauge();
  },

  closeModal: function() {
    document.getElementById('general-modal').style.display = 'none';
  },

  togglePasswordVisibility: function(fieldId) {
    const input = document.getElementById(fieldId);
    if (input.type === 'password') {
      input.type = 'text';
    } else {
      input.type = 'password';
    }
  },

  // -------------------------------------------------------------------------
  // 17. DEVELOPER UTILITIES MOCK SIMULATIONS
  // -------------------------------------------------------------------------
  devSwitchUserRole: function(roleId) {
    const users = window.NEMS_DB.getTable('users');
    const targetUser = users.find(u => u.role_id === parseInt(roleId));
    if (targetUser) {
      this.currentUser = targetUser;
      this.activeRole = window.NEMS_DB.getTable('roles').find(r => r.role_id === parseInt(roleId));
      sessionStorage.setItem('nems_session_user', JSON.stringify(targetUser));
      
      // Re-trigger layout rebuild
      document.getElementById('sidebar-username').textContent = targetUser.name;
      document.getElementById('sidebar-userrole').textContent = this.activeRole.role_name;
      
      this.buildSidebarNav();
      this.buildBottomNav();
      this.navigateTo('dashboard');
      this.showToast(`تم محاكاة تبديل صلاحية المستخدم إلى: ${this.activeRole.role_name}`, 'success');
    }
  },

  devToggleNetworkStatus: function() {
    const btn = document.getElementById('dev-net-btn');
    if (this.isOffline) {
      this.updateNetworkStatus(false);
      btn.textContent = 'تغيير للوضع غير المتصل (Go Offline)';
      btn.style.backgroundColor = '#00FF00';
      this.showToast('تم استعادة الاتصال بالشبكة (الوضع متصل).', 'success');
    } else {
      this.updateNetworkStatus(true);
      btn.textContent = 'تغيير للوضع المتصل (Go Online)';
      btn.style.backgroundColor = '#E74C3C';
      this.showToast('📡 لا يوجد اتصال بالإنترنت حالياً.', 'danger');
    }
  },

  updateNetworkStatus: function(isOffline) {
    this.isOffline = isOffline;
    if (isOffline) {
      document.body.style.filter = 'grayscale(20%)';
    } else {
      document.body.style.filter = 'none';
    }
  },

  toggleDevConsole: function() {
    const console = document.getElementById('dev-console');
    const body = document.getElementById('dev-console-body');
    const icon = document.getElementById('dev-toggle-icon');

    if (body.style.display === 'none') {
      body.style.display = 'block';
      console.style.width = '280px';
      icon.className = 'fa-solid fa-chevron-up';
    } else {
      body.style.display = 'none';
      console.style.width = '180px';
      icon.className = 'fa-solid fa-chevron-down';
    }
  },

  updateStorageSizeGauge: function() {
    let size = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('nems_')) {
        size += localStorage.getItem(key).length * 2; // Estimation size in bytes
      }
    }
    const kb = (size / 1024).toFixed(1);
    document.getElementById('dev-storage-text').textContent = `${kb} KB`;
    
    // Percentage against 5MB limit
    const pct = Math.min(100, ((size / (5 * 1024 * 1024)) * 100));
    document.getElementById('dev-storage-pct').textContent = `${pct.toFixed(2)}%`;
    document.getElementById('dev-storage-bar').style.width = `${pct}%`;
  },

  // Helpers
  maskValue: function(val) {
    if (this.currentUser.role_id === 6) { // Employee
      return '****';
    }
    return val.toLocaleString();
  },

  // Search logic
  handleGlobalSearch: function() {
    const val = document.getElementById('global-search-input').value;
    if (!val) return;
    this.navigateTo('search-results', val);
  }
};

// Start system on load
window.addEventListener('DOMContentLoaded', () => NEMS_APP.init());
window.NEMS_APP = NEMS_APP;
