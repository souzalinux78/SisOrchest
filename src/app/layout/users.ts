export const usersView = `
  <section class="view" data-view="users">
    <div class="view-header">
      <div>
        <h2>Usuários</h2>
        <p>Cadastro de novos usuários e aprovações.</p>
      </div>
      <button id="users-export" class="ghost ghost--dark">Exportar PDF</button>
    </div>
    <div id="users-status" class="data-status"></div>

    <div class="form-card">
      <h3>Novo usuário</h3>
      <div class="form-grid">
        <label>
          <span>Nome completo</span>
          <input id="user-name" type="text" placeholder="Nome do usuário" />
        </label>
        <label>
          <span>E-mail</span>
          <input id="user-email" type="email" placeholder="email@exemplo.com" />
        </label>
        <label>
          <span>Celular</span>
          <input id="user-phone" type="text" placeholder="(00) 00000-0000" />
        </label>
        <label>
          <span>Senha</span>
          <input id="user-password" type="password" placeholder="Defina uma senha" />
        </label>
        <label>
          <span>Comum</span>
          <select id="user-common"></select>
        </label>
      </div>
      <button id="user-save" class="primary">Enviar para aprovação</button>
    </div>

    <div class="data-card">
      <h3>Usuários pendentes</h3>
      <table class="data-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Email</th>
            <th>Comum</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody id="users-table-body"></tbody>
      </table>
    </div>
  </section>
`
