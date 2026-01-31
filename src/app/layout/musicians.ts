export const musiciansView = `
  <section class="view" data-view="musicians">
    <div class="view-header">
      <div>
        <h2>Músicos</h2>
        <p>Cadastro completo da orquestra.</p>
      </div>
    </div>
    <div id="musicians-status" class="data-status"></div>

    <div class="form-card">
      <h3>Novo músico</h3>
      <div class="form-grid">
        <label>
          <span>Nome completo</span>
          <input id="musician-name" type="text" placeholder="Nome do músico" />
        </label>
        <label>
          <span>Instrumento</span>
          <input id="musician-instrument" type="text" placeholder="Ex: Violino" />
        </label>
        <label>
          <span>Telefone</span>
          <input id="musician-phone" type="text" placeholder="(00) 00000-0000" />
        </label>
        <label>
          <span>E-mail</span>
          <input id="musician-email" type="email" placeholder="email@exemplo.com" />
        </label>
        <label>
          <span>Status</span>
          <select id="musician-status">
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
          </select>
        </label>
        <label id="musician-common-label">
          <span>Comum</span>
          <select id="musician-common"></select>
        </label>
      </div>
      <button id="musician-save" class="primary">Salvar músico</button>
      <div class="csv-upload">
        <input id="musicians-csv" type="file" accept=".csv" />
        <button id="musicians-csv-upload" class="ghost ghost--dark" type="button">
          Importar CSV
        </button>
      </div>
    </div>

    <div class="data-card">
      <h3>Músicos cadastrados</h3>
      <table class="data-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Instrumento</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody id="musicians-table-body"></tbody>
      </table>
    </div>
  </section>
`
