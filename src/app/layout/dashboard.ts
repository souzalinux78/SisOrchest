export const dashboardView = `
  <section class="view is-active" data-view="dashboard">
    <section class="dashboard">
      <div class="kpi-grid">
        <article class="kpi-card">
          <span class="kpi-label">Presença geral</span>
          <strong id="kpi-attendance" class="kpi-value">--</strong>
          <span id="kpi-attendance-detail" class="kpi-detail">Base: --</span>
        </article>
        <article class="kpi-card">
          <span class="kpi-label">Lançamentos no período</span>
          <strong id="kpi-launches" class="kpi-value">--</strong>
          <span id="kpi-launches-detail" class="kpi-detail">Total de registros</span>
        </article>
        <article class="kpi-card">
          <span class="kpi-label">Faltas registradas</span>
          <strong id="kpi-absences" class="kpi-value">--</strong>
          <span id="kpi-absences-detail" class="kpi-detail">Ausências contabilizadas</span>
        </article>
        <article class="kpi-card">
          <span class="kpi-label">Frequência média por músico</span>
          <strong id="kpi-average" class="kpi-value">--</strong>
          <span id="kpi-average-detail" class="kpi-detail">Presença média</span>
        </article>
        <article class="kpi-card">
          <span class="kpi-label">Músicos ativos</span>
          <strong id="kpi-musicians" class="kpi-value">--</strong>
          <span id="kpi-musicians-detail" class="kpi-detail">Ativos: --</span>
        </article>
        <article class="kpi-card">
          <span class="kpi-label">Cultos cadastrados</span>
          <strong id="kpi-services" class="kpi-value">--</strong>
          <span id="kpi-services-detail" class="kpi-detail">Próximo: --</span>
        </article>
      </div>

      <section class="data-section">
        <div class="data-header">
          <div>
            <h2>Dados operacionais</h2>
            <p>Atualização em tempo real do SisOrchest.</p>
          </div>
          <button id="refresh-data" class="ghost">Atualizar dados</button>
        </div>
        <div id="data-status" class="data-status"></div>

        <div class="data-grid">
          <div class="data-card">
            <h3>Músicos</h3>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Instrumento</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody id="musicians-body"></tbody>
            </table>
          </div>

          <div class="data-card">
            <h3>Cultos</h3>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Dia/Hora</th>
                  <th>Comum</th>
                </tr>
              </thead>
              <tbody id="services-body"></tbody>
            </table>
          </div>

          <div class="data-card">
            <h3>Presenças</h3>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Músico</th>
                  <th>Instrumento</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody id="attendance-body"></tbody>
            </table>
          </div>
        </div>
      </section>

      <section class="data-section">
        <div class="data-header">
          <div>
            <h2>Insights de presença</h2>
            <p>Indicadores e alertas para decisões rápidas.</p>
          </div>
        </div>
        <div class="data-grid">
          <div class="data-card">
            <h3>Ranking de músicos</h3>
            <div id="rank-present" class="data-status"></div>
            <div id="rank-absent" class="data-status"></div>
          </div>
          <div class="data-card">
            <h3>Frequência por dia</h3>
            <div id="weekday-frequency" class="data-status"></div>
          </div>
          <div class="data-card">
            <h3>Comparativo entre cultos</h3>
            <div id="service-comparison" class="data-status"></div>
          </div>
          <div class="data-card">
            <h3>Alertas de gestão</h3>
            <div id="attendance-alerts" class="data-status"></div>
          </div>
        </div>
      </section>
    </section>
  </section>
`
