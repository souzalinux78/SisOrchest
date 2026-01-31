import { attendanceView } from './attendance'
import { commonsView } from './commons'
import { dashboardView } from './dashboard'
import { musiciansView } from './musicians'
import { reportsView } from './reports'
import { servicesView } from './services'
import { usersView } from './users'

export const layoutHtml = `
  <div class="app">
    <header class="topbar">
      <div class="brand">
        <span class="brand__mark">SisOrchest</span>
        <span class="brand__tag">Sistema SaaS premium para gestão de músicos em cultos</span>
      </div>
    </header>

    <main class="content-stack">
      <section class="login-section">
        <div class="login-stack">
          <div class="login-card">
          <div class="login-header">
            <span class="eyebrow">Acesso seguro</span>
            <h1>SisOrchest</h1>
            <p>
              Presença e comunicação com a orquestra em um único painel.
            </p>
          </div>
          <form class="login-form" id="login-form">
            <label class="field">
              <span>E-mail corporativo</span>
              <input id="login-email" type="email" placeholder="seu@email.com" autocomplete="email" required />
            </label>
            <label class="field">
              <span>Senha</span>
              <input id="login-password" type="password" placeholder="••••••••" autocomplete="current-password" required />
            </label>
            <button class="primary full" type="submit">Entrar no SisOrchest</button>
              <button id="toggle-register" class="ghost ghost--dark" type="button">
                Cadastro de encarregado
              </button>
            <div id="login-status" class="login-status"></div>
          </form>
          </div>

          <div class="restricted-card">
            <div class="login-header">
              <span class="eyebrow">Acesso restrito</span>
              <h2>Somente administrador</h2>
              <p>Seu perfil está aguardando liberação ou não possui permissão administrativa.</p>
            </div>
            <button id="restricted-logout" class="ghost ghost--dark">Sair</button>
          </div>
        </div>
      </section>

      <section class="register-modal" id="register-modal">
        <div class="register-modal__content">
          <div class="login-header">
            <span class="eyebrow">Auto cadastro</span>
            <h2>Cadastro de encarregado</h2>
            <p>Solicite acesso SaaS vinculando-se à sua comum.</p>
          </div>
          <form class="login-form" id="self-register-form">
            <label class="field">
              <span>Nome</span>
              <input id="self-name" type="text" placeholder="Nome completo" autocomplete="name" required />
            </label>
            <label class="field">
              <span>Email</span>
              <input id="self-email" type="email" placeholder="email@exemplo.com" autocomplete="email" required />
            </label>
            <label class="field">
              <span>Celular</span>
              <input id="self-phone" type="text" placeholder="(00) 00000-0000" autocomplete="tel" required maxlength="15" />
            </label>
            <label class="field">
              <span>Comum cadastrada</span>
              <select id="self-common-select"></select>
            </label>
            <label class="field">
              <span>Nova comum (CAIXA ALTA)</span>
              <input id="self-common-name" class="upper" type="text" placeholder="EX: COMUM CENTRAL" />
            </label>
            <label class="field">
              <span>Senha</span>
              <input id="self-password" type="password" placeholder="Defina uma senha" autocomplete="new-password" required />
            </label>
            <button class="primary full" type="submit">Solicitar aprovação</button>
            <button id="close-register" class="ghost ghost--dark" type="button">Fechar</button>
            <div id="self-register-status" class="login-status"></div>
          </form>
        </div>
      </section>

      <section class="shell">
        <div id="menu-backdrop" class="menu-backdrop"></div>
        <aside class="sidebar">
          <div class="sidebar__brand">
            <span class="brand__mark">SisOrchest</span>
            <span class="brand__tag">Painel administrativo</span>
          </div>
          <nav class="menu">
            <button class="menu__item active" data-view="dashboard">Dashboard</button>
            <button class="menu__item" data-view="musicians">Músicos</button>
            <button class="menu__item" data-view="services">Cultos</button>
            <button class="menu__item" data-view="attendance">Presenças</button>
            <button class="menu__item" data-view="commons">Comuns</button>
            <button class="menu__item" data-view="users">Usuários</button>
            <button class="menu__item" data-view="reports">Relatórios</button>
          </nav>
          <div class="sidebar__footer">
            <span>Versão SaaS premium</span>
          </div>
        </aside>

        <div class="shell__main">
          <div id="pwa-install-banner" class="install-banner">
            <span>Instale o SisOrchest no seu dispositivo.</span>
            <div class="install-actions">
              <button id="pwa-install-button" class="primary">Instalar</button>
              <button id="pwa-install-dismiss" class="ghost ghost--dark">Agora não</button>
            </div>
          </div>
          <div id="update-banner" class="update-banner">
            <span>Nova versão disponível.</span>
            <button id="update-banner-reload" class="primary">Atualizar agora</button>
          </div>
          <div class="appbar">
            <div class="appbar__title" id="appbar-title">Dashboard principal</div>
            <div class="appbar__actions">
              <button id="menu-toggle" class="icon-button menu-toggle" aria-label="Abrir menu">☰</button>
              <button id="logout-button" class="ghost ghost--dark">Sair</button>
            </div>
          </div>

          <div class="views">
            ${dashboardView}
            ${musiciansView}
            ${servicesView}
            ${attendanceView}
            ${commonsView}
            ${usersView}
            ${reportsView}
          </div>
        </div>
      </section>
    </main>
  </div>
`
