export const dashboardView = `
  <section id="view-dashboard" class="view active">
    <!-- Hero/State -->
    <div id="dashboard-hero-container"></div>

    <div class="dashboard-content">
      <!-- KPIs Grid -->
      <div class="kpi-grid">
        <article class="kpi-card">
          <div class="kpi-icon">📈</div>
          <div class="kpi-body">
            <span class="kpi-label">Presença geral</span>
            <strong id="kpi-attendance" class="kpi-value">--</strong>
            <span id="kpi-attendance-detail" class="kpi-detail">Base: --</span>
          </div>
        </article>
        
        <article class="kpi-card">
          <div class="kpi-icon">📝</div>
          <div class="kpi-body">
            <span class="kpi-label">Lançamentos</span>
            <strong id="kpi-launches" class="kpi-value">--</strong>
            <span id="kpi-launches-detail" class="kpi-detail">Total no período</span>
          </div>
        </article>

        <article class="kpi-card">
          <div class="kpi-icon">⚠️</div>
          <div class="kpi-body">
            <span class="kpi-label">Faltas</span>
            <strong id="kpi-absences" class="kpi-value">--</strong>
            <span id="kpi-absences-detail" class="kpi-detail">Registradas</span>
          </div>
        </article>

        <article class="kpi-card">
          <div class="kpi-icon">👤</div>
          <div class="kpi-body">
            <span class="kpi-label">Músicos Ativos</span>
            <strong id="kpi-musicians" class="kpi-value">--</strong>
            <span id="kpi-musicians-detail" class="kpi-detail">Cadastrados: --</span>
          </div>
        </article>
      </div>

      <!-- Operational Recap -->
      <div class="data-section dashboard-section">
        <div class="data-header">
          <div>
            <h2>Resumo da Orquestra</h2>
            <p>Atividade recente e cultos agendados.</p>
          </div>
          <div class="header-actions">
            <button id="refresh-data" class="btn btn--secondary btn--sm">
              Sincronizar Dados
            </button>
            <div id="data-status" class="data-status-tag"></div>
          </div>
        </div>

        <div class="dashboard-grid">
          <!-- Recent Musicians -->
          <div class="card-saas">
            <div class="card-header">
              <h3 class="card-title">Músicos</h3>
              <p class="card-description">Últimos ativos</p>
            </div>
            <div class="card-content card-content--no-padding">
              <table class="data-table">
                <tbody id="musicians-body"></tbody>
              </table>
            </div>
            <div class="card-footer">
              <button class="btn btn--ghost btn--sm view-all-btn" data-target="musicians">Ver todos</button>
            </div>
          </div>

          <!-- Upcoming Services -->
          <div class="card-saas">
            <div class="card-header">
              <h3 class="card-title">Cultos</h3>
              <p class="card-description">Próximos horários</p>
            </div>
            <div class="card-content card-content--no-padding">
              <table class="data-table">
                <tbody id="services-body"></tbody>
              </table>
            </div>
            <div class="card-footer">
              <button class="btn btn--ghost btn--sm view-all-btn" data-target="services">Gerenciar</button>
            </div>
          </div>

          <!-- Recent Attendance -->
          <div class="card-saas">
            <div class="card-header">
              <h3 class="card-title">Presenças</h3>
              <p class="card-description">Registros recentes</p>
            </div>
            <div class="card-content card-content--no-padding">
              <table class="data-table">
                <tbody id="attendance-body"></tbody>
              </table>
            </div>
            <div class="card-footer">
              <button class="btn btn--ghost btn--sm view-all-btn" data-target="attendance">Relatório completo</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Analytical Section -->
      <div class="data-section dashboard-section">
        <div class="data-header">
          <div>
            <h2>Análise e Performance</h2>
            <p>Indicadores estratégicos de frequência.</p>
          </div>
        </div>
        
        <div class="dashboard-grid">
          <div class="card-saas">
             <div class="card-header"><h3 class="card-title">Rankings</h3></div>
             <div class="card-content">
                <div id="rank-present"></div>
                <div id="rank-absent" class="rank-gap"></div>
             </div>
          </div>
          
          <div class="card-saas">
             <div class="card-header"><h3 class="card-title">Alertas de Gestão</h3></div>
             <div class="card-content">
                <div id="attendance-alerts"></div>
             </div>
          </div>

          <div class="card-saas">
             <div class="card-header"><h3 class="card-title">Comparativo</h3></div>
             <div class="card-content">
                <div id="weekday-frequency"></div>
             </div>
          </div>
        </div>
      </div>

    </div>
  </section>
`
