export const reportsView = `
  <section class="view" data-view="reports">
    <div class="view-header">
      <div>
        <h2>Relatórios</h2>
        <p>Visões executivas para a direção musical.</p>
      </div>
    </div>

    <div class="report-filters">
      <label>
        <span>Comum</span>
        <select id="report-common"></select>
      </label>
      <label>
        <span>Músico</span>
        <select id="report-musician"></select>
      </label>
      <label>
        <span>Dia da semana</span>
        <select id="report-weekday">
          <option value="">Todos</option>
          <option value="Domingo">Domingo</option>
          <option value="Segunda">Segunda</option>
          <option value="Terça">Terça</option>
          <option value="Quarta">Quarta</option>
          <option value="Quinta">Quinta</option>
          <option value="Sexta">Sexta</option>
          <option value="Sábado">Sábado</option>
        </select>
      </label>
      <div class="report-actions">
        <button id="report-generate" class="primary">Gerar relatório</button>
        <button id="report-export" class="ghost ghost--dark">Exportar PDF</button>
      </div>
    </div>

    <div class="report-grid">
      <div class="report-card">
        <h3>Resumo geral</h3>
        <p id="reports-summary">Carregando indicadores...</p>
      </div>
      <div class="report-card">
        <h3>Frequência</h3>
        <p id="reports-attendance">Aguardando dados de presença.</p>
      </div>
      <div class="report-card">
        <h3>Agenda</h3>
        <p id="reports-services">Aguardando dados de cultos.</p>
      </div>
      <div class="report-card">
        <h3>Período</h3>
        <p id="reports-period">Aguardando dados do período.</p>
      </div>
    </div>

    <div class="report-chart">
      <canvas id="report-chart"></canvas>
    </div>

    <div class="data-card">
      <h3>Detalhamento por músico</h3>
      <table class="data-table">
        <thead>
          <tr>
            <th>Músico</th>
            <th>Comum</th>
            <th>Presenças</th>
            <th>Total de cultos</th>
            <th>Percentual</th>
          </tr>
        </thead>
        <tbody id="reports-table-body"></tbody>
      </table>
    </div>

    <div class="data-card">
      <h3>Histórico por data</h3>
      <table class="data-table">
        <thead>
          <tr>
            <th>Data</th>
            <th>Dia</th>
            <th>Presenças</th>
            <th>Faltas</th>
          </tr>
        </thead>
        <tbody id="reports-history-body"></tbody>
      </table>
    </div>
  </section>
`
