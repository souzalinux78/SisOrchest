export const dashboardView = `
  <section class="view is-active" data-view="dashboard">
    <section class="dashboard">
      <div class="kpi-grid">
        <article class="kpi-card">
          <span class="kpi-label">Presença confirmada</span>
          <strong id="kpi-attendance" class="kpi-value">--</strong>
          <span id="kpi-attendance-detail" class="kpi-detail">Base: --</span>
        </article>
        <article class="kpi-card">
          <span class="kpi-label">Músicos ativos</span>
          <strong id="kpi-musicians" class="kpi-value">--</strong>
          <span id="kpi-musicians-detail" class="kpi-detail">Ativos: --</span>
        </article>
        <article class="kpi-card">
          <span class="kpi-label">Cultos futuros</span>
          <strong id="kpi-services" class="kpi-value">--</strong>
          <span id="kpi-services-detail" class="kpi-detail">Próxima data: --</span>
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
    </section>
  </section>
`
