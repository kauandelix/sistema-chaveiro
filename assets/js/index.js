// --- Funções para carregar dados do localStorage ---

function carregarClientes() {
  const dados = localStorage.getItem('clientes');
  return dados ? JSON.parse(dados) : [];
}

function carregarEstoque() {
  const dados = localStorage.getItem('produtos');
  return dados ? JSON.parse(dados) : [];
}

function carregarAgendamentos() {
  const dados = localStorage.getItem('agendamentos');
  return dados ? JSON.parse(dados) : [];
}

function carregarCaixa() {
  const dados = localStorage.getItem('caixaAtual');
  return dados ? JSON.parse(dados) : { data: '', vendas: [] };
}

// NEW: Function to load historical cash register data (assuming new structure for detailed reports)
function carregarCaixaHistorico() {
  // This key would store an array of daily cash register summaries, each with dated sales.
  // Example structure in localStorage:
  // [
  //   { data: '2024-06-25', vendas: [{ valor: 50, forma: 'PIX', servico: 'Copia Chave', funcionario: 'Ana' }] },
  //   { data: '2024-06-26', vendas: [{ valor: 120, forma: 'Cartao', servico: 'Troca Cilindro', funcionario: 'Bruno' }] }
  // ]
  const dados = localStorage.getItem('caixaHistorico');
  return dados ? JSON.parse(dados) : [];
}

// NEW: Function to load stock movement data
function carregarMovimentacaoEstoque() {
  // Example structure in localStorage:
  // [
  //   { id: 'm1', produtoId: 'p1', produtoNome: 'Cilindro Pado', tipo: 'entrada', quantidade: 10, data: '2024-06-01' },
  //   { id: 'm2', produtoId: 'p1', produtoNome: 'Cilindro Pado', tipo: 'saida', quantidade: 2, data: '2024-06-15' }
  // ]
  const dados = localStorage.getItem('movimentacaoEstoque');
  return dados ? JSON.parse(dados) : [];
}


// --- Atualizar contadores do Resumo Geral ---

function atualizarResumoGeral() {
  const clientes = carregarClientes();
  const produtos = carregarEstoque();
  const agendamentos = carregarAgendamentos();
  const caixa = carregarCaixa();

  const totalClientes = clientes.length;
  const totalProdutos = produtos.reduce((soma, p) => soma + (p.quantidade || 0), 0);
  const agendPendentes = agendamentos.length; // Assuming all are pending for now
  const servicosAndamento = agendamentos.length; // Assuming all are in progress for now
  const caixaTotal = caixa.vendas.reduce((soma, v) => soma + v.valor, 0);

  document.getElementById('totalClientes').textContent = totalClientes;
  document.getElementById('totalProdutosEstoque').textContent = totalProdutos;
  document.getElementById('agendamentosPendentes').textContent = agendPendentes;
  document.getElementById('servicosEmAndamento').textContent = servicosAndamento;
  document.getElementById('caixaHoje').textContent = caixaTotal.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

// --- Gráfico: Vendas por Forma de Pagamento ---

function gerarGraficoVendasPorForma() {
  const caixa = carregarCaixa();
  const vendas = caixa.vendas || [];

  const formas = ['Dinheiro', 'PIX', 'Cartão', 'A Receber'];
  const contagem = formas.map(
    forma => vendas.filter(v => v.forma === forma).length
  );

  // Destroy previous chart instance if it exists to prevent re-render issues
  const chartElement = document.getElementById('graficoVendasPagamento');
  if (chartElement) {
    const existingChart = Chart.getChart(chartElement);
    if (existingChart) existingChart.destroy();
  }

  new Chart(chartElement, {
    type: 'doughnut',
    data: {
      labels: formas,
      datasets: [{
        data: contagem,
        backgroundColor: ['#6B8E23', '#20c997', '#007bff', '#ffc107'],
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
}

// --- Gráfico: Produtos por Categoria (Estoque) ---

function gerarGraficoProdutosCategoria() {
  const estoque = carregarEstoque();

  const categorias = {};
  estoque.forEach(p => {
    const categoria = p.categoria || 'Sem Categoria'; // Handle missing category
    if (!categorias[categoria]) categorias[categoria] = 0;
    categorias[categoria] += (p.quantidade || 0);
  });

  // Destroy previous chart instance
  const chartElement = document.getElementById('graficoProdutosCategoria');
  if (chartElement) {
    const existingChart = Chart.getChart(chartElement);
    if (existingChart) existingChart.destroy();
  }

  new Chart(chartElement, {
    type: 'bar',
    data: {
      labels: Object.keys(categorias),
      datasets: [{
        label: 'Quantidade',
        data: Object.values(categorias),
        backgroundColor: '#6B8E23'
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      scales: {
        x: {
          beginAtZero: true
        }
      },
      plugins: {
        legend: {
          display: false
        }
      }
    }
  });
}

// --- Gráfico: Status dos Serviços (simulado como todos pendentes) ---

function gerarGraficoServicosStatus() {
  const agendamentos = carregarAgendamentos();
  const pendentes = agendamentos.length;
  // To make this dynamic, 'agendamentos' would need a 'status' field (e.g., 'pending', 'completed')
  const concluidos = 0; // Update if you implement status tracking

  // Destroy previous chart instance
  const chartElement = document.getElementById('graficoServicosStatus');
  if (chartElement) {
    const existingChart = Chart.getChart(chartElement);
    if (existingChart) existingChart.destroy();
  }

  new Chart(chartElement, {
    type: 'pie',
    data: {
      labels: ['Pendentes', 'Concluídos'],
      datasets: [{
        data: [pendentes, concluidos],
        backgroundColor: ['#dc3545', '#28a745'],
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
}

// --- NEW: Gráfico: Vendas por Período (Mensal) ---
function gerarGraficoVendasMensal() {
  const historicoCaixa = carregarCaixaHistorico();
  const vendasPorMes = {}; // { 'YYYY-MM': totalVendas }

  historicoCaixa.forEach(diaCaixa => {
    // Ensure 'data' is in 'YYYY-MM-DD' format and is valid
    const date = new Date(diaCaixa.data);
    if (isNaN(date.getTime())) return; // Skip invalid dates

    const mesAno = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    const totalVendasDia = diaCaixa.vendas.reduce((sum, v) => sum + (v.valor || 0), 0);

    if (!vendasPorMes[mesAno]) {
      vendasPorMes[mesAno] = 0;
    }
    vendasPorMes[mesAno] += totalVendasDia;
  });

  const labels = Object.keys(vendasPorMes).sort();
  const data = labels.map(mesAno => vendasPorMes[mesAno]);

  // Destroy previous chart instance
  const chartElement = document.getElementById('graficoVendasMensal');
  if (chartElement) {
    const existingChart = Chart.getChart(chartElement);
    if (existingChart) existingChart.destroy();
  }

  new Chart(chartElement, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Vendas Totais (R$)',
        data: data,
        borderColor: '#007bff',
        backgroundColor: 'rgba(0, 123, 255, 0.2)',
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Valor (R$)'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Mês/Ano'
          }
        }
      },
      plugins: {
        legend: {
          display: true,
          position: 'top'
        }
      }
    }
  });
}

// --- NEW: Gráfico: Serviços Mais Procurados ---
function gerarGraficoServicosMaisProcurados() {
  const agendamentos = carregarAgendamentos(); // Assuming 'agendamentos' now stores 'servico' or a list of services
  const servicosContagem = {};

  agendamentos.forEach(ag => {
    // Example: assuming 'ag' has a 'servico' property (string or array of strings)
    const servicos = Array.isArray(ag.servico) ? ag.servico : [ag.servico].filter(Boolean); // Handle single string or array

    servicos.forEach(servico => {
      const servicoNormalizado = servico ? servico.trim() : 'Serviço Não Especificado';
      if (!servicosContagem[servicoNormalizado]) {
        servicosContagem[servicoNormalizado] = 0;
      }
      servicosContagem[servicoNormalizado]++;
    });
  });

  const labels = Object.keys(servicosContagem);
  const data = Object.values(servicosContagem);

  // Destroy previous chart instance
  const chartElement = document.getElementById('graficoServicosPopulares');
  if (chartElement) {
    const existingChart = Chart.getChart(chartElement);
    if (existingChart) existingChart.destroy();
  }

  new Chart(chartElement, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Número de Vezes Agendado',
        data: data,
        backgroundColor: '#20c997'
      }]
    },
    options: {
      indexAxis: 'y', // Horizontal bars
      responsive: true,
      scales: {
        x: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Contagem'
          }
        }
      },
      plugins: {
        legend: {
          display: false
        }
      }
    }
  });
}

// --- NEW: Gráfico: Desempenho por Funcionário ---
function gerarGraficoDesempenhoFuncionarios() {
  const historicoCaixa = carregarCaixaHistorico();
  const desempenhoFuncionarios = {}; // { 'Funcionario A': totalVendas, 'Funcionario B': totalVendas }

  historicoCaixa.forEach(diaCaixa => {
    diaCaixa.vendas.forEach(venda => {
      // Assuming 'venda' objects have a 'funcionario' field
      const funcionario = venda.funcionario || 'Não Atribuído';
      if (!desempenhoFuncionarios[funcionario]) {
        desempenhoFuncionarios[funcionario] = 0;
      }
      desempenhoFuncionarios[funcionario] += (venda.valor || 0);
    });
  });

  const labels = Object.keys(desempenhoFuncionarios);
  const data = Object.values(desempenhoFuncionarios);

  // Destroy previous chart instance
  const chartElement = document.getElementById('graficoDesempenhoFuncionarios');
  if (chartElement) {
    const existingChart = Chart.getChart(chartElement);
    if (existingChart) existingChart.destroy();
  }

  new Chart(chartElement, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Vendas Totais (R$)',
        data: data,
        backgroundColor: '#ffc107'
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Valor (R$)'
          }
        }
      },
      plugins: {
        legend: {
          display: false
        }
      }
    }
  });
}

// --- NEW: Tabela: Movimentação de Estoque ---
function gerarTabelaMovimentacaoEstoque() {
  const movimentacoes = carregarMovimentacaoEstoque();
  const tabelaBody = document.querySelector('#tabelaMovimentacaoEstoque tbody');
  tabelaBody.innerHTML = ''; // Clear previous entries

  // Sort by most recent date, then by time if available (or just date)
  movimentacoes.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  // Display only the last 10 movements for brevity on the dashboard
  movimentacoes.slice(0, 10).forEach(mov => {
    const row = tabelaBody.insertRow();
    row.insertCell().textContent = mov.produtoNome || 'N/A'; // Assumes 'produtoNome' is stored
    row.insertCell().textContent = mov.tipo === 'entrada' ? 'Entrada' : 'Saída';
    row.insertCell().textContent = mov.quantidade;
    row.insertCell().textContent = new Date(mov.data).toLocaleDateString('pt-BR');
  });

  // If no movements, display a message
  if (movimentacoes.length === 0) {
    const row = tabelaBody.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 4;
    cell.textContent = 'Nenhuma movimentação de estoque registrada.';
    cell.style.textAlign = 'center';
  }
}

// --- NEW: Placeholder for Customization Function ---
function openCustomizationModal() {
  alert('Funcionalidade de Customização: Em desenvolvimento!\n\nAqui você poderia selecionar quais gráficos e informações deseja exibir no Dashboard.');
  // In a real application, you would open a modal dialog here
  // with checkboxes or toggles for each dashboard section/chart.
  // When the user saves their preferences, you would store them in localStorage
  // and then call functions to show/hide relevant sections.
}


// --- Inicialização ao carregar página ---

document.addEventListener('DOMContentLoaded', () => {
  atualizarResumoGeral();
  gerarGraficoVendasPorForma();
  gerarGraficoProdutosCategoria();
  gerarGraficoServicosStatus();

  // Call the new report generation functions
  gerarGraficoVendasMensal();
  gerarGraficoServicosMaisProcurados();
  gerarGraficoDesempenhoFuncionarios();
  gerarTabelaMovimentacaoEstoque();
});

// --- Atalhos Globais de Teclado (F1–F5) ---

document.addEventListener('keydown', (e) => {
  const map = {
    'F1': 'agendamentos.html',
    'F2': 'caixa.html',
    'F3': 'estoque.html',
    'F4': 'clientes.html',
    'F5': 'notas.html'
  };

  if (map[e.key]) {
    e.preventDefault();
    window.location.href = map[e.key];
  }
});