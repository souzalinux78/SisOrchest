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
        <span>Modo</span>
        <select id="report-mode">
          <option value="culto">Relatório por Culto</option>
          <option value="mensal">Relatório Mensal</option>
        </select>
      </label>
      <label id="report-date-label" style="display: none;">
        <span>Data do culto</span>
        <select id="report-date"></select>
      </label>
      <label id="report-mes-label" style="display: none;">
        <span>Mês</span>
        <select id="report-mes">
          <option value="">Selecione</option>
          <option value="1">Janeiro</option>
          <option value="2">Fevereiro</option>
          <option value="3">Março</option>
          <option value="4">Abril</option>
          <option value="5">Maio</option>
          <option value="6">Junho</option>
          <option value="7">Julho</option>
          <option value="8">Agosto</option>
          <option value="9">Setembro</option>
          <option value="10">Outubro</option>
          <option value="11">Novembro</option>
          <option value="12">Dezembro</option>
        </select>
      </label>
      <label id="report-ano-label" style="display: none;">
        <span>Ano</span>
        <select id="report-ano">
          <option value="">Selecione</option>
        </select>
      </label>
      <label id="report-weekday-label" style="display: none;">
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

    <div id="report-alert-banner" class="report-alert-banner" style="display: none;">
      <div class="alert-banner-content">
        <span class="alert-icon">⚠️</span>
        <span class="alert-message">Atenção: Existem músicos com percentual de faltas acima de 40% no período selecionado.</span>
      </div>
    </div>

    <div class="report-kpis" id="report-kpis">
      <div class="kpi-card kpi-card--total">
        <div class="kpi-value" id="kpi-total-musicos">--</div>
        <div class="kpi-label">Total de Músicos</div>
      </div>
      <div class="kpi-card kpi-card--media">
        <div class="kpi-value" id="kpi-media-presenca">--</div>
        <div class="kpi-label">Média Geral de Presença (%)</div>
      </div>
      <div class="kpi-card kpi-card--faltas">
        <div class="kpi-value" id="kpi-total-faltas">--</div>
        <div class="kpi-label">Total de Faltas no Período</div>
      </div>
      <div class="kpi-card kpi-card--risco">
        <div class="kpi-value" id="kpi-musicos-risco">--</div>
        <div class="kpi-label">Músicos em Risco (>30% faltas)</div>
      </div>
    </div>

    <div class="report-chart">
      <canvas id="report-chart"></canvas>
    </div>

    <div class="data-card">
      <h3>Detalhamento por músico</h3>
      <table class="data-table">
        <thead id="reports-table-header">
          <tr>
            <th>Músico</th>
            <th>Comum</th>
            <th>Presenças</th>
            <th>Total de cultos</th>
            <th data-sortable data-sort="percentual_presenca" class="sortable-header">Percentual <span class="sort-indicator"></span></th>
            <th data-sortable data-sort="total_faltas" class="sortable-header">Total Faltas <span class="sort-indicator"></span></th>
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

    <div class="data-card">
      <h3>Top 5 músicos que mais faltaram</h3>
      <div id="reports-ranking-faltas">
        <p>Aguardando dados do ranking...</p>
      </div>
    </div>

    <div class="data-card">
      <div id="reports-ranking-chart"></div>
    </div>
  </section>
`
