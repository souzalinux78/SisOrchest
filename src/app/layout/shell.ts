import { attendanceView } from './attendance'
import { commonsView } from './commons'
import { dashboardView } from './dashboard'
import { musiciansView } from './musicians'
import { reportsView } from './reports'
import { servicesView } from './services'
import { usersView } from './users'

export const layoutHtml = `
  <div class="app saas-v2">
    <section class="login-section">
      <div class="auth-layout">
        <div class="auth-container">
          <div class="auth-card">
            <div class="auth-header">
              <div class="auth-logo">S</div>
              <h1 class="auth-title">SisOrchest</h1>
              <p class="auth-subtitle">Acesso seguro à plataforma</p>
            </div>
            <form class="auth-content login-form" id="login-form">
              <div class="input-group">
                <label class="input-label" for="login-email">E-mail corporativo</label>
                <input id="login-email" class="input-field" type="email" placeholder="seu@email.com" autocomplete="email" required />
              </div>
              <div class="input-group">
                <label class="input-label" for="login-password">Senha</label>
                <input id="login-password" class="input-field" type="password" placeholder="••••••••" autocomplete="current-password" required />
              </div>
              <button class="btn btn--primary btn--full" type="submit">Entrar no SisOrchest</button>
              <button id="toggle-register" class="btn btn--ghost btn--full auth-register-toggle" type="button">
                Cadastro de encarregado
              </button>
              <div id="login-status" class="login-status"></div>
            </form>
          </div>
        </div>
      </div>
    </section>

    <section class="restricted-card">
       <div class="auth-layout">
        <div class="auth-container">
          <div class="auth-card auth-card--centered">
            <div class="auth-logo auth-logo--warning">!</div>
            <h2 class="auth-title">Acesso restrito</h2>
            <p class="auth-subtitle">Seu perfil está aguardando liberação administrativa.</p>
            <button id="restricted-logout" class="btn btn--outline btn--full auth-restricted-logout">Sair</button>
          </div>
        </div>
      </div>
    </section>

    <section class="register-modal" id="register-modal">
       <div class="auth-layout auth-layout--modal">
        <div class="auth-container">
          <div class="auth-card">
            <div class="auth-header">
              <h2 class="auth-title">Auto cadastro</h2>
              <p class="auth-subtitle">Vincule-se à sua comum</p>
            </div>
            <form class="auth-content login-form" id="self-register-form">
              <div class="input-group">
                <label class="input-label">Nome</label>
                <input id="self-name" class="input-field" type="text" placeholder="Nome completo" required />
              </div>
              <div class="input-group">
                <label class="input-label">Email</label>
                <input id="self-email" class="input-field" type="email" placeholder="email@exemplo.com" required />
              </div>
              <div class="input-group">
                <label class="input-label">Celular</label>
                <input id="self-phone" class="input-field" type="text" placeholder="(00) 00000-0000" required />
              </div>
              <div class="input-group">
                <label class="input-label">Comum cadastrada</label>
                <select id="self-common-select" class="input-field auth-full-width"></select>
              </div>
              <div class="input-group">
                <label class="input-label">Nova comum</label>
                <input id="self-common-name" class="input-field upper" type="text" placeholder="EX: CENTRAL" />
              </div>
              <div class="input-group">
                <label class="input-label">Senha</label>
                <input id="self-password" class="input-field" type="password" placeholder="Defite uma senha" required />
              </div>
              <button class="btn btn--primary btn--full" type="submit">Solicitar aprovação</button>
              <button id="close-register" class="btn btn--ghost btn--full auth-register-toggle" type="button">Fechar</button>
              <div id="self-register-status" class="login-status"></div>
            </form>
          </div>
        </div>
      </div>
    </section>

    <section class="shell saas-layout">
      <div id="menu-backdrop" class="sidebar-overlay"></div>
      
      <aside class="saas-sidebar">
        <div class="sidebar-brand">
          <div class="brand-logo">S</div>
          <span class="brand-name">SisOrchest</span>
        </div>

        <nav class="sidebar-nav">
          <button class="nav-item is-active" data-view="dashboard">
            <span class="nav-icon">📊</span>
            <span class="nav-label">Dashboard</span>
          </button>
          <button class="nav-item" data-view="musicians">
            <span class="nav-icon">🎵</span>
            <span class="nav-label">Músicos</span>
          </button>
          <button class="nav-item" data-view="services">
            <span class="nav-icon">⛪</span>
            <span class="nav-label">Cultos</span>
          </button>
          <button class="nav-item" data-view="attendance">
            <span class="nav-icon">📝</span>
            <span class="nav-label">Presenças</span>
          </button>
          <button class="nav-item" data-view="commons">
            <span class="nav-icon">🏢</span>
            <span class="nav-label">Comuns</span>
          </button>
          <button class="nav-item" data-view="users">
            <span class="nav-icon">👥</span>
            <span class="nav-label">Usuários</span>
          </button>
          <button class="nav-item" data-view="reports">
            <span class="nav-icon">📈</span>
            <span class="nav-label">Relatórios</span>
          </button>
        </nav>

        <div class="sidebar-footer">
          <div class="user-info">
            <div id="sidebar-user-avatar" class="user-avatar">?</div>
            <div class="user-details">
              <p id="sidebar-user-name" class="user-name">Usuário</p>
              <p id="sidebar-user-role" class="user-role">SaaS Admin</p>
            </div>
          </div>
          <button id="logout-button" class="logout-btn">Sair</button>
        </div>
      </aside>

      <main class="saas-main">
        <div id="pwa-install-banner" class="install-banner">
          <span>Deseja instalar o SisOrchest?</span>
          <div class="install-actions">
            <button id="pwa-install-button" class="btn btn--primary btn--sm">Instalar</button>
            <button id="pwa-install-dismiss" class="btn btn--ghost btn--sm">Agora não</button>
          </div>
        </div>
        
        <header class="saas-header">
          <div class="header-left">
            <button id="menu-toggle" class="mobile-menu-toggle">☰</button>
            <div class="header-breadcrumb">
              <span class="breadcrumb-parent">Painel</span>
              <span class="breadcrumb-separator">/</span>
              <span class="breadcrumb-current" id="appbar-title">Dashboard</span>
            </div>
          </div>
          
          <div class="header-actions">
            <button class="header-action-btn" aria-label="Notificações">🔔</button>
            <div class="header-avatar" id="header-avatar">?</div>
          </div>
        </header>

        <div class="content-area">
          <div class="content-container views">
            ${dashboardView}
            ${musiciansView}
            ${servicesView}
            ${attendanceView}
            ${commonsView}
            ${usersView}
            ${reportsView}
          </div>
        </div>
      </main>
    </section>
  </div>
`
