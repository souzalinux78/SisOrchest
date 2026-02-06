export function loadReports() {
  const container = document.getElementById('app')
  if (!container) return

  container.innerHTML = `
    <div style="padding:40px;color:white;font-size:24px">
      <h1>Relatórios carregando corretamente</h1>
      <p>Sistema de relatórios ativo.</p>
    </div>
  `
}

export function setupReports() {
  console.log('setupReports executado')
}
