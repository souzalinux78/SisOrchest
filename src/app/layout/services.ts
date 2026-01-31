export const servicesView = `
  <section class="view" data-view="services">
    <div class="view-header">
      <div>
        <h2>Cultos</h2>
        <p>Planejamento e agenda de eventos.</p>
      </div>
    </div>
    <div id="services-status" class="data-status"></div>

    <div class="form-card">
      <h3>Novo culto</h3>
      <div class="form-grid">
        <label>
          <span>Dia da semana</span>
          <select id="service-weekday">
            <option value="">Selecione</option>
            <option value="Domingo">Domingo</option>
            <option value="Segunda">Segunda</option>
            <option value="Terça">Terça</option>
            <option value="Quarta">Quarta</option>
            <option value="Quinta">Quinta</option>
            <option value="Sexta">Sexta</option>
            <option value="Sábado">Sábado</option>
          </select>
        </label>
        <label>
          <span>Horário</span>
          <input id="service-time" type="time" />
        </label>
        <label id="service-common-label">
          <span>Comum</span>
          <select id="service-common"></select>
        </label>
      </div>
      <button id="service-save" class="primary">Salvar culto</button>
    </div>

    <div class="data-card">
      <h3>Cultos cadastrados</h3>
      <table class="data-table">
        <thead>
          <tr>
            <th>Dia</th>
            <th>Hora</th>
            <th>Comum</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody id="services-table-body"></tbody>
      </table>
    </div>
  </section>
`
