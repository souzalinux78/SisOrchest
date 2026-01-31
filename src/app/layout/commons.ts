export const commonsView = `
  <section class="view" data-view="commons">
    <div class="view-header">
      <div>
        <h2>Comuns</h2>
        <p>Cadastro e organização das comuns.</p>
      </div>
    </div>
    <div id="commons-status" class="data-status"></div>

    <div class="form-card">
      <h3>Nova comum</h3>
      <div class="form-grid">
        <label>
          <span>Nome da comum</span>
          <input id="common-name" type="text" placeholder="Ex: Comum Central" />
        </label>
      </div>
      <button id="common-save" class="primary">Salvar comum</button>
    </div>

    <div class="data-card">
      <h3>Comuns cadastradas</h3>
      <table class="data-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody id="commons-table-body"></tbody>
      </table>
    </div>
  </section>
`
