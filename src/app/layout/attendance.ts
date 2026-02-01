export const attendanceView = `
  <section class="view" data-view="attendance">
    <div class="view-header">
      <div>
        <h2>Presenças</h2>
        <p>Controle de presença por culto e músico.</p>
      </div>
    </div>
    <div id="attendance-status-text" class="data-status"></div>

    <div class="form-card">
      <h3>Registrar presença</h3>
      <div class="form-grid">
        <label>
          <span>Culto</span>
          <select id="attendance-service"></select>
        </label>
        <label>
          <span>Data do culto (DD/MM/AAAA)</span>
          <input id="attendance-date" type="text" inputmode="numeric" placeholder="31/01/2026" />
        </label>
      </div>
      <div id="attendance-warning" class="data-status"></div>
      <div id="attendance-existing" class="attendance-existing"></div>
      <div class="attendance-checklist">
        <h4>Músicos da comum</h4>
        <div id="attendance-musicians-list" class="attendance-list"></div>
      </div>
    </div>

    <div class="data-card">
      <h3>Presenças registradas</h3>
      <table class="data-table">
        <thead>
          <tr>
            <th>Músico</th>
            <th>Instrumento</th>
            <th>Status</th>
            <th>Data</th>
            <th>Dia</th>
          </tr>
        </thead>
        <tbody id="attendance-table-body"></tbody>
      </table>
    </div>
  </section>
`
