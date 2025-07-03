JavaScript

// --- Funções para carregar e salvar dados do localStorage ---

function carregarAgendamentos() {
  const dados = localStorage.getItem('agendamentos');
  return dados ? JSON.parse(dados) : [];
}

function salvarAgendamentos(agendamentos) {
  localStorage.setItem('agendamentos', JSON.stringify(agendamentos));
}

function carregarClientes() {
  const dados = localStorage.getItem('clientes');
  return dados ? JSON.parse(dados) : [];
}

// NOVO: Carregar produtos/serviços do estoque
function carregarProdutos() {
  const dados = localStorage.getItem('produtos');
  return dados ? JSON.parse(dados) : [];
}

function carregarCaixaHistorico() {
  const dados = localStorage.getItem('caixaHistorico');
  return dados ? JSON.parse(dados) : [];
}

function salvarCaixaHistorico(caixaHistorico) {
  localStorage.setItem('caixaHistorico', JSON.stringify(caixaHistorico));
}


function getNomeClientePorCpf(cpf) {
  const clientes = carregarClientes();
  const clienteEncontrado = clientes.find(cliente => cliente.cpf === cpf);
  return clienteEncontrado ? clienteEncontrado.nome : 'Cliente Desconhecido';
}

function popularSelectClientes() {
  const selectCliente = document.getElementById('cliente');
  selectCliente.innerHTML = '<option value="">Selecione um Cliente</option>';
  const clientes = carregarClientes();

  clientes.forEach(cliente => {
    const option = document.createElement('option');
    option.value = cliente.cpf;
    option.textContent = `${cliente.nome} (${cliente.cpf})`;
    selectCliente.appendChild(option);
  });
}

// NOVO: Função para popular o select de serviços/produtos
function popularSelectServicos() {
  const selectServico = document.getElementById('servico');
  selectServico.innerHTML = '<option value="">Selecione o Serviço/Produto</option>';
  const produtos = carregarProdutos(); // Carrega os produtos do estoque

  // Filtra produtos que podem ser considerados serviços ou itens a serem usados em serviços
  // Adapte a lógica de filtro conforme a sua necessidade (ex: ter um campo 'isService' no produto)
  const servicosDisponiveis = produtos.filter(p => p.categoria === 'Serviço' || p.tipo === 'Serviço' || p.nome.toLowerCase().includes('serviço'));

  servicosDisponiveis.forEach(produto => {
    const option = document.createElement('option');
    option.value = produto.nome; // Usa o nome do produto como o serviço
    option.textContent = `${produto.nome} (Estoque: ${produto.quantidade})`; // Mostra a quantidade em estoque se relevante
    selectServico.appendChild(option);
  });
  // Opcional: Adicionar uma opção para "Outro Serviço" caso não esteja no estoque
  const optionOutro = document.createElement('option');
  optionOutro.value = 'Outro Serviço (digitar)';
  optionOutro.textContent = 'Outro Serviço (digitar manualmente)';
  selectServico.appendChild(optionOutro);

  selectServico.addEventListener('change', function() {
    if (this.value === 'Outro Serviço (digitar)') {
      const novoServicoInput = document.createElement('input');
      novoServicoInput.type = 'text';
      novoServicoInput.id = 'servicoManual';
      novoServicoInput.classList.add('input-campo');
      novoServicoInput.placeholder = 'Digite o nome do serviço';
      novoServicoInput.required = true;
      selectServico.parentNode.insertBefore(novoServicoInput, selectServico.nextSibling);
      selectServico.style.display = 'none'; // Esconde o select original
    } else {
      const servicoManualInput = document.getElementById('servicoManual');
      if (servicoManualInput) {
        servicoManualInput.remove();
        selectServico.style.display = 'block';
      }
    }
  });
}


function gerarIdUnico() {
  return 'agendamento-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

// NOVO: Adiciona venda ao histórico do caixa
function adicionarVendaAoHistoricoCaixa(data, valor, formaPagamento, servico, clienteCpf) {
  let caixaHistorico = carregarCaixaHistorico();
  const hoje = new Date(data).toISOString().split('T')[0]; // Apenas a data YYYY-MM-DD

  let diaCaixa = caixaHistorico.find(c => c.data === hoje);

  if (!diaCaixa) {
    diaCaixa = { data: hoje, vendas: [] };
    caixaHistorico.push(diaCaixa);
  }

  // Adiciona a venda ao dia específico
  diaCaixa.vendas.push({
    valor: parseFloat(valor),
    forma: formaPagamento, // Pode ser 'Dinheiro', 'PIX', 'Cartão' - definir como 'N/A' ou adicionar um campo para isso no agendamento
    servico: servico,
    clienteCpf: clienteCpf,
    dataHora: new Date().toISOString() // Hora exata da conclusão/registro
  });

  salvarCaixaHistorico(caixaHistorico);
}

// NOVO: Renderiza agendamentos com filtro de status
function renderizarAgendamentos() {
  const agendamentos = carregarAgendamentos();
  const lista = document.getElementById('listaAgendamentos');
  lista.innerHTML = '';

  const filtroStatus = document.getElementById('filtroStatus').value;

  const agendamentosFiltrados = agendamentos.filter(item => {
    return filtroStatus === 'Todos' || item.status === filtroStatus;
  });

  // Agrupar por status para exibição organizada
  const gruposStatus = {
    'Pendente': [],
    'Confirmado': [],
    'Em Andamento': [],
    'Concluido': [],
    'Cancelado': []
  };

  agendamentosFiltrados.forEach(item => {
    if (gruposStatus[item.status]) {
      gruposStatus[item.status].push(item);
    }
  });

  let hasContent = false;
  for (const status in gruposStatus) {
    if (gruposStatus[status].length > 0) {
      hasContent = true;
      const tituloStatus = document.createElement('h4');
      tituloStatus.textContent = `Serviços ${status}`;
      lista.appendChild(tituloStatus);
      gruposStatus[status].forEach(item => lista.appendChild(criarCardAgendamento(item)));
    }
  }

  if (!hasContent) {
    lista.innerHTML = '<p>Nenhum agendamento encontrado para o filtro selecionado.</p>';
  }
}

function criarCardAgendamento(item) {
  const nomeCliente = getNomeClientePorCpf(item.cliente);
  const div = document.createElement('div');
  div.classList.add('card-agendamento');
  div.setAttribute('data-status', item.status); // Adiciona atributo de dados para styling

  div.innerHTML = `
    <p><strong>Cliente:</strong> ${nomeCliente}</p>
    <p><strong>Data/Hora:</strong> ${new Date(item.dataHora).toLocaleString('pt-BR')}</p>
    <p><strong>Serviço:</strong> ${item.servico}</p>
    <p><strong>Status:</strong> <span class="status-${item.status.toLowerCase().replace(/\s/g, '-')}">${item.status}</span></p>
    ${item.valorServico ? `<p><strong>Valor:</strong> ${parseFloat(item.valorServico).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>` : ''}
    <div class="botoes-card">
      <button onclick="mudarStatusAgendamento('${item.id}', 'Concluido', ${item.valorServico || 0})" class="btn btn-sucesso" ${item.status === 'Concluido' ? 'disabled' : ''}>Concluir</button>
      <button onclick="mudarStatusAgendamento('${item.id}', 'Cancelado')" class="btn btn-danger" ${item.status === 'Cancelado' ? 'disabled' : ''}>Cancelar</button>
      <button onclick="editarAgendamento('${item.id}')" class="btn btn-secundario">Editar</button>
      <button onclick="removerAgendamento('${item.id}')" class="btn btn-danger-outline">Remover</button>
    </div>
    <hr>
  `;

  return div;
}

// NOVO: Função para mudar o status do agendamento
function mudarStatusAgendamento(id, novoStatus, valorServico = 0) {
  const agendamentos = carregarAgendamentos();
  const index = agendamentos.findIndex(item => item.id === id);

  if (index !== -1) {
    agendamentos[index].status = novoStatus;
    if (novoStatus === 'Concluido' && valorServico > 0) {
      // Adiciona ao histórico do caixa se concluído e com valor
      adicionarVendaAoHistoricoCaixa(agendamentos[index].dataHora, valorServico, 'Dinheiro', agendamentos[index].servico, agendamentos[index].cliente); // Assumindo 'Dinheiro' como forma padrão ou ajustar conforme necessário
      // Opcional: Remover produtos do estoque se o serviço consumiu algum item
      // Opcional: Adicionar ao histórico do cliente (requer modificação no clientes.js)
    }
    salvarAgendamentos(agendamentos);
    renderizarAgendamentos();
    verificarAgendamentosProximos(); // Re-verifica notificações após mudança de status
  }
}


function removerAgendamento(id) {
  if (confirm('Deseja remover este agendamento?')) {
    let agendamentos = carregarAgendamentos();
    agendamentos = agendamentos.filter(item => item.id !== id);
    salvarAgendamentos(agendamentos);
    renderizarAgendamentos();
    verificarAgendamentosProximos(); // Re-verifica notificações após remoção
  }
}

function editarAgendamento(id) {
  const agendamentos = carregarAgendamentos();
  const agendamento = agendamentos.find(item => item.id === id);

  if (agendamento) {
    document.getElementById('agendamentoId').value = agendamento.id;
    document.getElementById('cliente').value = agendamento.cliente;
    document.getElementById('dataHora').value = agendamento.dataHora;

    // NOVO: Seleciona o serviço e lida com "Outro Serviço"
    const selectServico = document.getElementById('servico');
    const servicoManualInput = document.getElementById('servicoManual');
    
    if (agendamento.servico && Array.from(selectServico.options).some(opt => opt.value === agendamento.servico)) {
        selectServico.value = agendamento.servico;
        if (servicoManualInput) servicoManualInput.remove(); // Remove input manual se existir
        selectServico.style.display = 'block'; // Mostra o select original
    } else {
        selectServico.value = 'Outro Serviço (digitar)'; // Seleciona a opção "Outro"
        if (!servicoManualInput) { // Cria o input manual se não existir
            const novoServicoInput = document.createElement('input');
            novoServicoInput.type = 'text';
            novoServicoInput.id = 'servicoManual';
            novoServicoInput.classList.add('input-campo');
            novoServicoInput.placeholder = 'Digite o nome do serviço';
            novoServicoInput.required = true;
            selectServico.parentNode.insertBefore(novoServicoInput, selectServico.nextSibling);
        }
        document.getElementById('servicoManual').value = agendamento.servico; // Preenche o valor digitado
        selectServico.style.display = 'none'; // Esconde o select original
    }

    document.getElementById('statusAgendamento').value = agendamento.status; // NOVO: Popula status
    document.getElementById('valorServico').value = agendamento.valorServico || ''; // NOVO: Popula valor

    document.querySelector('#agendamentoForm button[type="submit"]').textContent = 'Salvar Alterações';
    document.getElementById('btnCancelarEdicao').style.display = 'inline-block';
  }
}

document.getElementById('agendamentoForm').addEventListener('submit', function (e) {
  e.preventDefault();

  const id = document.getElementById('agendamentoId').value;
  const cliente = document.getElementById('cliente').value.trim();
  const dataHora = document.getElementById('dataHora').value;
  let servico = document.getElementById('servico').value.trim();
  const statusAgendamento = document.getElementById('statusAgendamento').value; // NOVO
  const valorServico = document.getElementById('valorServico').value; // NOVO

  // Se "Outro Serviço" foi selecionado, pega o valor do campo de texto manual
  const servicoManualInput = document.getElementById('servicoManual');
  if (servico === 'Outro Serviço (digitar)' && servicoManualInput) {
    servico = servicoManualInput.value.trim();
  }

  if (!cliente || !dataHora || !servico || !statusAgendamento) { // Inclui status na validação
    alert('Preencha todos os campos obrigatórios.');
    return;
  }

  const dataAgendamento = new Date(dataHora);
  // Permitir agendamentos no passado para fins de histórico, mas alertar se for o caso
  if (dataAgendamento < new Date() && !id) { // Se for um novo agendamento e a data é passada
    if (!confirm('A data e hora do agendamento estão no passado. Deseja prosseguir?')) {
      return;
    }
  }


  let agendamentos = carregarAgendamentos();

  if (id) {
    const index = agendamentos.findIndex(item => item.id === id);
    if (index !== -1) {
      agendamentos[index] = {
        ...agendamentos[index],
        cliente,
        dataHora,
        servico,
        status: statusAgendamento, // NOVO: Atualiza status
        valorServico: valorServico ? parseFloat(valorServico) : null // NOVO: Salva valor
      };

      // Se o status foi alterado para 'Concluido' na edição e tem valor
      if (statusAgendamento === 'Concluido' && valorServico && parseFloat(valorServico) > 0) {
          // Verifica se já foi registrado para evitar duplicidade ao editar um agendamento já concluído
          // Uma lógica mais robusta pode ser necessária, mas para este exemplo, registra se não estava concluído antes OU se o valor foi adicionado
          if (agendamentos[index].status !== 'Concluido' || !agendamentos[index].valorServico) {
              adicionarVendaAoHistoricoCaixa(dataHora, valorServico, 'Dinheiro', servico, cliente);
          }
      }
    }

    document.querySelector('#agendamentoForm button[type="submit"]').textContent = 'Agendar';
    document.getElementById('btnCancelarEdicao').style.display = 'none';
  } else {
    const novoAgendamento = {
      id: gerarIdUnico(),
      cliente,
      dataHora,
      servico,
      status: statusAgendamento, // NOVO: Define status inicial
      valorServico: valorServico ? parseFloat(valorServico) : null
    };
    agendamentos.push(novoAgendamento);

    // Se o novo agendamento já for 'Concluido' e tiver valor
    if (statusAgendamento === 'Concluido' && valorServico && parseFloat(valorServico) > 0) {
        adicionarVendaAoHistoricoCaixa(dataHora, valorServico, 'Dinheiro', servico, cliente);
    }
  }

  salvarAgendamentos(agendamentos);
  renderizarAgendamentos();
  verificarAgendamentosProximos(); // Re-verifica notificações após adicionar/editar
  this.reset();
  document.getElementById('agendamentoId').value = '';

  // Limpa o campo de texto manual se ele foi usado
  if (servicoManualInput) {
    servicoManualInput.remove();
    document.getElementById('servico').style.display = 'block';
  }
});

document.getElementById('btnCancelarEdicao').addEventListener('click', function () {
  document.getElementById('agendamentoForm').reset();
  document.getElementById('agendamentoId').value = '';
  document.querySelector('#agendamentoForm button[type="submit"]').textContent = 'Agendar';
  this.style.display = 'none';

  // Garante que o select de serviço esteja visível e o campo manual removido
  const servicoManualInput = document.getElementById('servicoManual');
  if (servicoManualInput) {
    servicoManualInput.remove();
    document.getElementById('servico').style.display = 'block';
  }
});

// NOVO: Event listener para o filtro de status
document.getElementById('filtroStatus').addEventListener('change', renderizarAgendamentos);


// --- NOVO: Lembretes e Notificações (funcionalidade interna básica) ---

function verificarAgendamentosProximos() {
    const agendamentos = carregarAgendamentos();
    const agora = new Date();
    const proximaHora = new Date(agora.getTime() + 60 * 60 * 1000); // Próxima 1 hora

    const agendamentosProximos = agendamentos.filter(ag => {
        const dataHoraAgendamento = new Date(ag.dataHora);
        // Considera agendamentos Pendente, Confirmado, Em Andamento que ocorrerão em até 1 hora
        return (ag.status === 'Pendente' || ag.status === 'Confirmado' || ag.status === 'Em Andamento') &&
               dataHoraAgendamento > agora &&
               dataHoraAgendamento <= proximaHora;
    }).sort((a, b) => new Date(a.dataHora) - new Date(b.dataHora)); // Ordena cronologicamente

    const notificacoesDiv = document.getElementById('notificacoesProximosAgendamentos');
    const listaNotificacoes = document.getElementById('listaNotificacoes');
    listaNotificacoes.innerHTML = '';

    if (agendamentosProximos.length > 0) {
        agendamentosProximos.forEach(ag => {
            const nomeCliente = getNomeClientePorCpf(ag.cliente);
            const itemLista = document.createElement('li');
            itemLista.textContent = `Em ${new Date(ag.dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}: ${ag.servico} para ${nomeCliente}`;
            listaNotificacoes.appendChild(itemLista);
        });
        notificacoesDiv.style.display = 'block';
    } else {
        notificacoesDiv.style.display = 'none';
    }
}

function fecharNotificacaoAgendamento() {
    document.getElementById('notificacoesProximosAgendamentos').style.display = 'none';
}

// Verifica agendamentos próximos a cada 5 minutos
setInterval(verificarAgendamentosProximos, 5 * 60 * 1000); // 5 minutos


document.addEventListener('DOMContentLoaded', () => {
  popularSelectClientes();
  popularSelectServicos(); // NOVO: Popular serviços ao carregar
  renderizarAgendamentos();
  verificarAgendamentosProximos(); // Verifica ao carregar
});