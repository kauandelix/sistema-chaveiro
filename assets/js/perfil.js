// --- Funções Auxiliares para Carregar Dados (podem ser do clientes.js, agendamentos.js, etc.) ---

// Estas funções são placeholders. Em uma aplicação real, você as importaria
// ou se certificaria de que os scripts que as contêm (como clientes.js, agendamentos.js)
// já estão carregados antes deste script.
// Para este exemplo, estou replicando algumas para garantir que o perfil.js funcione de forma isolada,
// mas o ideal é reutilizar as funções existentes.

function carregarClientes() { //
  const dados = localStorage.getItem('clientes'); //
  return dados ? JSON.parse(dados) : []; //
}

function carregarAgendamentos() { //
  const dados = localStorage.getItem('agendamentos'); //
  return dados ? JSON.parse(dados) : []; //
}

function carregarCaixaHistorico() { // Supondo que você tem um histórico de caixa global
  const dados = localStorage.getItem('caixaHistorico');
  return dados ? JSON.parse(dados) : [];
}

function carregarNotasFiscais() { // Supondo que você tem um histórico de notas fiscais
  const dados = localStorage.getItem('notasFiscais'); // Pode ser 'notas' ou outra chave
  return dados ? JSON.parse(dados) : [];
}

// --- Função Principal para Carregar e Exibir Perfil ---

function carregarPerfilCliente() {
  const urlParams = new URLSearchParams(window.location.search);
  const clienteCpf = urlParams.get('cpf'); // Agora esperamos o CPF como identificador na URL

  if (!clienteCpf) {
    document.getElementById('nomeClientePerfil').textContent = 'Erro: Cliente não especificado.';
    return;
  }

  const clientes = carregarClientes(); //
  const cliente = clientes.find(c => c.cpf === clienteCpf); //

  if (!cliente) {
    document.getElementById('nomeClientePerfil').textContent = 'Erro: Cliente não encontrado.';
    return;
  }

  document.getElementById('nomeClientePerfil').textContent = cliente.nome; //
  document.getElementById('perfilNome').textContent = cliente.nome; //
  document.getElementById('perfilCpf').textContent = cliente.cpf; //
  document.getElementById('perfilEmail').textContent = cliente.email; //
  document.getElementById('perfilTelefone').textContent = cliente.telefone; //
  document.getElementById('perfilEndereco').textContent = cliente.endereco; //
  document.getElementById('perfilDataCadastro').textContent = cliente.data || 'N/A'; //
  document.getElementById('perfilObservacoes').textContent = cliente.observacoes || 'Nenhuma observação.'; //

  // Preencher Campos Personalizados
  const camposPersonalizadosDiv = document.getElementById('camposPersonalizadosPerfil');
  camposPersonalizadosDiv.innerHTML = '';
  if (cliente.camposPersonalizados && Object.keys(cliente.camposPersonalizados).length > 0) {
    for (const key in cliente.camposPersonalizados) {
      const p = document.createElement('p');
      p.innerHTML = `<strong>${key}:</strong> ${cliente.camposPersonalizados[key]}`;
      camposPersonalizadosDiv.appendChild(p);
    }
  } else {
    camposPersonalizadosDiv.innerHTML = '<p>Nenhum campo personalizado cadastrado.</p>';
  }


  // --- Histórico de Agendamentos ---
  const historicoAgendamentosDiv = document.getElementById('historicoAgendamentos');
  historicoAgendamentosDiv.innerHTML = '';
  const agendamentos = carregarAgendamentos(); //
  const agendamentosDoCliente = agendamentos.filter(ag => ag.cliente === cliente.cpf) //
                                          .sort((a, b) => new Date(b.dataHora) - new Date(a.dataHora)); // Mais recentes primeiro

  if (agendamentosDoCliente.length > 0) {
    agendamentosDoCliente.forEach(ag => {
      const card = document.createElement('div');
      card.classList.add('card-historico');
      card.innerHTML = `
        <p><strong>Data/Hora:</strong> ${new Date(ag.dataHora).toLocaleString('pt-BR')}</p>
        <p><strong>Serviço:</strong> ${ag.servico}</p>
        <p><strong>Status:</strong> ${ag.status}</p>
        ${ag.valorServico ? `<p><strong>Valor:</strong> ${parseFloat(ag.valorServico).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>` : ''}
      `;
      historicoAgendamentosDiv.appendChild(card);
    });
  } else {
    historicoAgendamentosDiv.innerHTML = '<p>Nenhum agendamento encontrado para este cliente.</p>';
  }

  // --- Histórico de Vendas (Caixa) ---
  const historicoVendasDiv = document.getElementById('historicoVendas');
  historicoVendasDiv.innerHTML = '';
  const caixaHistorico = carregarCaixaHistorico();
  let vendasDoCliente = [];

  caixaHistorico.forEach(diaCaixa => {
    diaCaixa.vendas.forEach(venda => {
      if (venda.clienteCpf === cliente.cpf) {
        vendasDoCliente.push(venda);
      }
    });
  });
  vendasDoCliente.sort((a, b) => new Date(b.dataHora) - new Date(a.dataHora)); // Mais recentes primeiro

  if (vendasDoCliente.length > 0) {
    vendasDoCliente.forEach(venda => {
      const card = document.createElement('div');
      card.classList.add('card-historico');
      card.innerHTML = `
        <p><strong>Data/Hora:</strong> ${new Date(venda.dataHora).toLocaleString('pt-BR')}</p>
        <p><strong>Serviço/Produto:</strong> ${venda.servico || 'Venda Direta'}</p>
        <p><strong>Valor:</strong> ${parseFloat(venda.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
        <p><strong>Forma de Pgto:</strong> ${venda.forma || 'N/A'}</p>
      `;
      historicoVendasDiv.appendChild(card);
    });
  } else {
    historicoVendasDiv.innerHTML = '<p>Nenhuma venda encontrada para este cliente.</p>';
  }

  // --- Histórico de Notas Fiscais ---
  const historicoNotasDiv = document.getElementById('historicoNotas');
  historicoNotasDiv.innerHTML = '';
  const notasFiscais = carregarNotasFiscais();
  const notasDoCliente = notasFiscais.filter(nota => nota.clienteCpf === cliente.cpf)
                                   .sort((a, b) => new Date(b.dataEmissao) - new Date(a.dataEmissao)); // Mais recentes primeiro

  if (notasDoCliente.length > 0) {
    notasDoCliente.forEach(nota => {
      const card = document.createElement('div');
      card.classList.add('card-historico');
      card.innerHTML = `
        <p><strong>Número da Nota:</strong> ${nota.numero}</p>
        <p><strong>Data de Emissão:</strong> ${new Date(nota.dataEmissao).toLocaleDateString('pt-BR')}</p>
        <p><strong>Valor Total:</strong> ${parseFloat(nota.valorTotal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
        <p><strong>Descrição:</strong> ${nota.descricao || 'N/A'}</p>
      `;
      historicoNotasDiv.appendChild(card);
    });
  } else {
    historicoNotasDiv.innerHTML = '<p>Nenhuma nota fiscal encontrada para este cliente.</p>';
  }
}

document.addEventListener('DOMContentLoaded', carregarPerfilCliente);