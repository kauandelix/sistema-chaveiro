// Variáveis de estado
let transacaoEditandoId = null; // ID da transação em edição (venda ou despesa)
let transacaoEditandoTipo = null; // 'venda' ou 'despesa'
let paginaAtual = 1;
const transacoesPorPagina = 10; // Mais transações por página
let transacoesFiltradas = [];

// --- Funções Auxiliares (reutilizadas ou aprimoradas) ---

function gerarIdUnico() {
    return 'transacao-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

function obterDataHoje(iso = true) {
    const hoje = new Date();
    if (iso) {
        return hoje.toISOString().split('T')[0];
    }
    return hoje.toLocaleDateString('pt-BR');
}

function formatarValor(valor) {
    return parseFloat(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function exibirToast(mensagem, tipo = 'sucesso') {
    const container = document.getElementById('toast-container');
    if (!container) return; // Garante que o contêiner exista

    const toast = document.createElement('div');
    toast.classList.add('toast', tipo);
    toast.textContent = mensagem;
    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 4000); // Tempo da animação no CSS
}

// --- Funções de Carregamento/Salvamento de Dados ---

function carregarClientes() {
    const dados = localStorage.getItem('clientes');
    return dados ? JSON.parse(dados) : [];
}

function getNomeClientePorCpf(cpf) {
    const clientes = carregarClientes();
    const clienteEncontrado = clientes.find(cliente => cliente.cpf === cpf);
    return clienteEncontrado ? clienteEncontrado.nome : 'Cliente Não Encontrado';
}

function carregarProdutos() {
    // Esta função DEVE carregar os produtos do estoque.
    // Presume-se que 'produtos' é a chave no localStorage para o estoque.
    const dados = localStorage.getItem('produtos');
    return dados ? JSON.parse(dados) : [];
}

function carregarCaixaHistorico() {
    // O histórico do caixa agora pode conter 'vendas' e 'despesas' para cada dia.
    const dados = localStorage.getItem('caixaHistorico');
    return dados ? JSON.parse(dados) : [];
}

function salvarCaixaHistorico(historico) {
    localStorage.setItem('caixaHistorico', JSON.stringify(historico));
}

function carregarFechamentosCaixa() {
    const dados = localStorage.getItem('fechamentosCaixa');
    return dados ? JSON.parse(dados) : [];
}

function salvarFechamentosCaixa(fechamentos) {
    localStorage.setItem('fechamentosCaixa', JSON.stringify(fechamentos));
}

// --- População de Selects ---

function popularSelectClientes() {
    const selectVenda = document.getElementById('clienteSelect');
    const selectFiltro = document.getElementById('filtroCliente');
    const clientes = carregarClientes();

    // Limpa selects antes de popular
    selectVenda.innerHTML = '<option value="">Selecione o Cliente</option>';
    selectFiltro.innerHTML = '<option value="">Todos os clientes</option>';

    clientes.forEach(cliente => {
        const optionVenda = document.createElement('option');
        optionVenda.value = cliente.cpf;
        optionVenda.textContent = `${cliente.nome} (${cliente.cpf})`;
        selectVenda.appendChild(optionVenda);

        const optionFiltro = document.createElement('option');
        optionFiltro.value = cliente.cpf;
        optionFiltro.textContent = `${cliente.nome} (${cliente.cpf})`;
        selectFiltro.appendChild(optionFiltro);
    });
}

function popularSelectProdutosServicos(selectElement) {
    const produtos = carregarProdutos();
    selectElement.innerHTML = '<option value="">Selecione Produto/Serviço</option>';
    // Adiciona uma opção para serviços que não estão no estoque como produto
    selectElement.innerHTML += '<option value="Serviço Manual">Serviço (digitar descrição)</option>';

    produtos.forEach(p => {
        const option = document.createElement('option');
        option.value = p.id; // Usar ID do produto para vincular
        option.textContent = `${p.nome} (Estoque: ${p.quantidade || 0})`; // Mostra quantidade em estoque
        option.setAttribute('data-valor', p.valor || 0); // Armazena o valor unitário no data attribute
        option.setAttribute('data-tipo', 'produto');
        selectElement.appendChild(option);
    });
}

// --- Funções de Venda Itemizada ---

function adicionarItemVendaLinha(item = {}) {
    const container = document.getElementById('itensVendaContainer');
    const linha = document.createElement('div');
    linha.classList.add('item-venda-linha');

    linha.innerHTML = `
        <select class="select-campo produto-servico-select" required>
            <option value="">Selecione Produto/Serviço</option>
        </select>
        <input type="text" class="input-campo item-descricao-manual" placeholder="Descrição Serviço" style="display:none;">
        <input type="number" class="input-campo item-quantidade" placeholder="Qtd" min="1" value="${item.quantidade || 1}" required>
        <input type="number" class="input-campo item-valor-unitario" placeholder="Valor Unit." step="0.01" min="0" value="${item.valorUnitario || ''}" required>
        <span class="item-subtotal">Subtotal: ${formatarValor(0)}</span>
        <button type="button" class="btn btn-danger-outline remover-item-btn">X</button>
    `;

    container.appendChild(linha);

    const select = linha.querySelector('.produto-servico-select');
    const inputDescricaoManual = linha.querySelector('.item-descricao-manual');
    const inputQuantidade = linha.querySelector('.item-quantidade');
    const inputValorUnitario = linha.querySelector('.item-valor-unitario');
    const removerBtn = linha.querySelector('.remover-item-btn');

    popularSelectProdutosServicos(select);

    // Se editando, pré-seleciona ou preenche o item
    if (item.tipo === 'produto' && item.produtoId) {
        select.value = item.produtoId;
        const selectedOption = select.options[select.selectedIndex];
        inputValorUnitario.value = selectedOption.dataset.valor || '';
        inputDescricaoManual.style.display = 'none'; // Esconde se for produto
        select.style.display = 'block';
    } else if (item.tipo === 'servico' && item.descricao) {
        select.value = 'Serviço Manual';
        inputDescricaoManual.style.display = 'block';
        inputDescricaoManual.value = item.descricao;
        select.style.display = 'none'; // Esconde o select
    }

    // Event Listeners para a nova linha
    select.addEventListener('change', () => {
        if (select.value === 'Serviço Manual') {
            inputDescricaoManual.style.display = 'block';
            inputDescricaoManual.value = item.descricao || ''; // Mantém valor se editando
            select.style.display = 'none';
        } else {
            inputDescricaoManual.style.display = 'none';
            inputDescricaoManual.value = '';
            select.style.display = 'block';
            const selectedOption = select.options[select.selectedIndex];
            inputValorUnitario.value = selectedOption.dataset.valor || ''; // Preenche valor do produto
        }
        calcularTotalVenda();
    });

    inputQuantidade.addEventListener('input', calcularTotalVenda);
    inputValorUnitario.addEventListener('input', calcularTotalVenda);
    removerBtn.addEventListener('click', () => {
        linha.remove();
        calcularTotalVenda();
        exibirToast('Item removido da venda.', 'aviso');
    });

    calcularTotalVenda(); // Recalcula o total ao adicionar uma nova linha
}

function calcularTotalVenda() {
    let total = 0;
    const itensContainer = document.getElementById('itensVendaContainer');
    const linhas = itensContainer.querySelectorAll('.item-venda-linha');

    linhas.forEach(linha => {
        const quantidade = parseFloat(linha.querySelector('.item-quantidade').value) || 0;
        const valorUnitario = parseFloat(linha.querySelector('.item-valor-unitario').value) || 0;
        const subtotal = quantidade * valorUnitario;
        linha.querySelector('.item-subtotal').textContent = `Subtotal: ${formatarValor(subtotal)}`;
        total += subtotal;
    });

    document.getElementById('valorTotalVenda').textContent = formatarValor(total);
    return total;
}

// --- Gerenciamento de Estoque (Baixa) ---
function darBaixaEstoque(produtoId, quantidadeVendida) {
    let produtos = carregarProdutos();
    const index = produtos.findIndex(p => p.id === produtoId);

    if (index !== -1) {
        if (produtos[index].quantidade >= quantidadeVendida) {
            produtos[index].quantidade -= quantidadeVendida;
            localStorage.setItem('produtos', JSON.stringify(produtos));
            return true;
        } else {
            exibirToast(`Estoque insuficiente para "${produtos[index].nome}". Disponível: ${produtos[index].quantidade}`, 'erro');
            return false;
        }
    } else {
        exibirToast(`Produto com ID ${produtoId} não encontrado no estoque.`, 'aviso');
        return false;
    }
}

function reverterBaixaEstoque(produtoId, quantidadeVendida) {
    let produtos = carregarProdutos();
    const index = produtos.findIndex(p => p.id === produtoId);
    if (index !== -1) {
        produtos[index].quantidade += quantidadeVendida;
        localStorage.setItem('produtos', JSON.stringify(produtos));
    }
}


// --- Funções de Registro e Edição de Transações ---

document.getElementById('registroVendaForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const vendaId = document.getElementById('vendaId').value;
    const clienteCpf = document.getElementById('clienteSelect').value;
    const formaPagamento = document.getElementById('formaPagamento').value;
    const observacoesVenda = document.getElementById('observacoesVenda').value.trim();

    if (!clienteCpf || !formaPagamento) {
        exibirToast('Por favor, selecione o cliente e a forma de pagamento.', 'erro');
        return;
    }

    const itensVenda = [];
    const linhas = document.querySelectorAll('.item-venda-linha');
    let hasValidItems = false;

    for (const linha of linhas) {
        const selectProdServ = linha.querySelector('.produto-servico-select');
        const inputDescricaoManual = linha.querySelector('.item-descricao-manual');
        const quantidade = parseFloat(linha.querySelector('.item-quantidade').value);
        const valorUnitario = parseFloat(linha.querySelector('.item-valor-unitario').value);

        if (!quantidade || !valorUnitario || quantidade <= 0 || valorUnitario < 0) {
            exibirToast('Quantidade e Valor Unitário devem ser maiores que zero para todos os itens.', 'erro');
            return;
        }

        let item = { quantidade, valorUnitario };

        if (selectProdServ.value === 'Serviço Manual') {
            const descricaoServico = inputDescricaoManual.value.trim();
            if (!descricaoServico) {
                exibirToast('Por favor, preencha a descrição do serviço manual.', 'erro');
                return;
            }
            item.tipo = 'servico';
            item.descricao = descricaoServico;
        } else {
            const selectedOption = selectProdServ.options[selectProdServ.selectedIndex];
            if (!selectedOption || !selectedOption.value) {
                exibirToast('Selecione um produto/serviço válido para todos os itens.', 'erro');
                return;
            }
            item.tipo = 'produto';
            item.produtoId = selectedOption.value;
            item.descricao = selectedOption.textContent.split(' (Estoque:')[0]; // Pega o nome do produto
        }
        itensVenda.push(item);
        hasValidItems = true;
    }

    if (!hasValidItems) {
        exibirToast('Adicione pelo menos um item à venda.', 'erro');
        return;
    }

    const valorTotal = calcularTotalVenda();
    if (valorTotal <= 0) {
        exibirToast('O valor total da venda deve ser maior que zero.', 'erro');
        return;
    }

    let historico = carregarCaixaHistorico();
    const hoje = obterDataHoje();

    let diaCaixa = historico.find(d => d.data === hoje);
    if (!diaCaixa) {
        diaCaixa = { data: hoje, vendas: [], despesas: [], fechado: false };
        historico.push(diaCaixa);
        historico.sort((a, b) => new Date(a.data) - new Date(b.data)); // Garante ordem cronológica
    }

    const novaVenda = {
        id: vendaId || gerarIdUnico(),
        tipo: 'Venda',
        clienteCpf,
        items: itensVenda,
        valorTotal,
        formaPagamento,
        observacoes: observacoesVenda,
        dataHora: new Date().toISOString(), // Hora exata da transação
    };

    if (vendaId) {
        // Edição de venda
        const vendaIndex = diaCaixa.vendas.findIndex(v => v.id === vendaId);
        if (vendaIndex !== -1) {
            // Reverte baixa de estoque anterior para os itens modificados
            diaCaixa.vendas[vendaIndex].items.forEach(oldItem => {
                if (oldItem.tipo === 'produto') {
                    reverterBaixaEstoque(oldItem.produtoId, oldItem.quantidade);
                }
            });

            diaCaixa.vendas[vendaIndex] = novaVenda;
            exibirToast('Venda atualizada com sucesso!', 'sucesso');
        }
    } else {
        // Nova venda
        diaCaixa.vendas.push(novaVenda);
        exibirToast('Venda registrada com sucesso!', 'sucesso');
    }

    // Dar baixa no estoque para os novos itens/quantidades
    let estoqueOK = true;
    novaVenda.items.forEach(item => {
        if (item.tipo === 'produto') {
            if (!darBaixaEstoque(item.produtoId, item.quantidade)) {
                estoqueOK = false;
            }
        }
    });

    if (!estoqueOK) {
        // Se houve erro no estoque, pode-se reverter a transação de venda ou apenas avisar.
        // Por simplicidade, apenas exibe o toast de erro de estoque.
        // A transação ainda é salva, mas o estoque não foi baixado para os itens com problema.
    }


    salvarCaixaHistorico(historico);
    document.getElementById('registroVendaForm').reset();
    document.getElementById('vendaId').value = '';
    document.querySelector('#registroVendaForm button[type="submit"]').textContent = 'Registrar Venda';
    document.getElementById('btnCancelarEdicaoVenda').style.display = 'none';
    document.getElementById('itensVendaContainer').innerHTML = ''; // Limpa os itens
    adicionarItemVendaLinha(); // Adiciona uma linha vazia novamente
    aplicarFiltros(); // Atualiza a lista de transações
});


document.getElementById('registroDespesaForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const despesaId = document.getElementById('despesaId').value;
    const descricao = document.getElementById('descricaoDespesa').value.trim();
    const valor = parseFloat(document.getElementById('valorDespesa').value);
    const dataDespesa = document.getElementById('dataDespesa').value;

    if (!descricao || !valor || valor <= 0 || !dataDespesa) {
        exibirToast('Preencha todos os campos da despesa corretamente.', 'erro');
        return;
    }

    let historico = carregarCaixaHistorico();
    let diaCaixa = historico.find(d => d.data === dataDespesa);

    if (!diaCaixa) {
        diaCaixa = { data: dataDespesa, vendas: [], despesas: [], fechado: false };
        historico.push(diaCaixa);
        historico.sort((a, b) => new Date(a.data) - new Date(b.data));
    }

    const novaDespesa = {
        id: despesaId || gerarIdUnico(),
        tipo: 'Despesa',
        descricao,
        valor,
        dataHora: new Date(dataDespesa).toISOString(), // Usa a data fornecida, com hora da criação
    };

    if (despesaId) {
        // Edição de despesa
        const despesaIndex = diaCaixa.despesas.findIndex(d => d.id === despesaId);
        if (despesaIndex !== -1) {
            diaCaixa.despesas[despesaIndex] = novaDespesa;
            exibirToast('Despesa atualizada com sucesso!', 'sucesso');
        }
    } else {
        // Nova despesa
        diaCaixa.despesas.push(novaDespesa);
        exibirToast('Despesa registrada com sucesso!', 'sucesso');
    }

    salvarCaixaHistorico(historico);
    document.getElementById('registroDespesaForm').reset();
    document.getElementById('despesaId').value = '';
    document.querySelector('#registroDespesaForm button[type="submit"]').textContent = 'Registrar Despesa';
    document.getElementById('btnCancelarEdicaoDespesa').style.display = 'none';
    aplicarFiltros(); // Atualiza a lista de transações
});


function editarTransacao(id, tipo) {
    transacaoEditandoId = id;
    transacaoEditandoTipo = tipo;

    const historico = carregarCaixaHistorico();
    let transacaoEncontrada = null;
    let diaDaTransacao = null;

    // Procura em todos os dias do histórico
    for (const dia of historico) {
        if (tipo === 'Venda') {
            transacaoEncontrada = dia.vendas.find(t => t.id === id);
        } else if (tipo === 'Despesa') {
            transacaoEncontrada = dia.despesas.find(t => t.id === id);
        }
        if (transacaoEncontrada) {
            diaDaTransacao = dia;
            break;
        }
    }

    if (!transacaoEncontrada || diaDaTransacao.fechado) {
        exibirToast(`Transação ${id} não encontrada ou dia já fechado para edição.`, 'erro');
        cancelarEdicao();
        return;
    }

    if (tipo === 'Venda') {
        document.getElementById('vendaId').value = transacaoEncontrada.id;
        document.getElementById('clienteSelect').value = transacaoEncontrada.clienteCpf;
        document.getElementById('formaPagamento').value = transacaoEncontrada.formaPagamento;
        document.getElementById('observacoesVenda').value = transacaoEncontrada.observacoes || '';

        // Preenche os itens da venda
        const itensContainer = document.getElementById('itensVendaContainer');
        itensContainer.innerHTML = ''; // Limpa os itens existentes
        transacaoEncontrada.items.forEach(item => adicionarItemVendaLinha(item));
        calcularTotalVenda();

        document.querySelector('#registroVendaForm button[type="submit"]').textContent = 'Atualizar Venda';
        document.getElementById('btnCancelarEdicaoVenda').style.display = 'inline-block';
        document.getElementById('registroVendaForm').scrollIntoView({ behavior: 'smooth' });
        exibirToast('Editando venda. Altere os campos e clique em "Atualizar Venda".', 'sucesso');
    } else if (tipo === 'Despesa') {
        document.getElementById('despesaId').value = transacaoEncontrada.id;
        document.getElementById('descricaoDespesa').value = transacaoEncontrada.descricao;
        document.getElementById('valorDespesa').value = transacaoEncontrada.valor;
        document.getElementById('dataDespesa').value = new Date(transacaoEncontrada.dataHora).toISOString().split('T')[0];

        document.querySelector('#registroDespesaForm button[type="submit"]').textContent = 'Atualizar Despesa';
        document.getElementById('btnCancelarEdicaoDespesa').style.display = 'inline-block';
        document.getElementById('registroDespesaForm').scrollIntoView({ behavior: 'smooth' });
        exibirToast('Editando despesa. Altere os campos e clique em "Atualizar Despesa".', 'sucesso');
    }
}

function apagarTransacao(id, tipo) {
    if (!confirm(`Tem certeza que deseja apagar esta ${tipo.toLowerCase()}?`)) {
        return;
    }

    let historico = carregarCaixaHistorico();
    let transacaoRemovida = null;
    let diaDaTransacao = null;

    historico = historico.map(dia => {
        if (dia.fechado) {
            // Não permite apagar transações de dias fechados
            return dia;
        }

        if (tipo === 'Venda') {
            const vendasRestantes = dia.vendas.filter(v => {
                if (v.id === id) {
                    transacaoRemovida = v;
                    diaDaTransacao = dia;
                    return false; // Remove esta venda
                }
                return true;
            });
            return { ...dia, vendas: vendasRestantes };
        } else if (tipo === 'Despesa') {
            const despesasRestantes = dia.despesas.filter(d => {
                if (d.id === id) {
                    transacaoRemovida = d;
                    diaDaTransacao = dia;
                    return false; // Remove esta despesa
                }
                return true;
            });
            return { ...dia, despesas: despesasRestantes };
        }
        return dia;
    });

    if (transacaoRemovida && !diaDaTransacao.fechado) {
        salvarCaixaHistorico(historico);
        exibirToast(`${tipo} apagada com sucesso!`, 'sucesso');

        // Reverte baixa de estoque se for uma venda de produto
        if (tipo === 'Venda' && transacaoRemovida.items) {
            transacaoRemovida.items.forEach(item => {
                if (item.tipo === 'produto') {
                    reverterBaixaEstoque(item.produtoId, item.quantidade);
                }
            });
        }
    } else if (diaDaTransacao && diaDaTransacao.fechado) {
         exibirToast(`Não é possível apagar transações de um dia já fechado.`, 'erro');
    } else {
        exibirToast(`Erro ao apagar ${tipo}: transação não encontrada ou já apagada.`, 'erro');
    }

    aplicarFiltros(); // Atualiza a lista
}

function cancelarEdicao() {
    document.getElementById('registroVendaForm').reset();
    document.getElementById('vendaId').value = '';
    document.querySelector('#registroVendaForm button[type="submit"]').textContent = 'Registrar Venda';
    document.getElementById('btnCancelarEdicaoVenda').style.display = 'none';
    document.getElementById('itensVendaContainer').innerHTML = '';
    adicionarItemVendaLinha(); // Adiciona linha vazia

    document.getElementById('registroDespesaForm').reset();
    document.getElementById('despesaId').value = '';
    document.querySelector('#registroDespesaForm button[type="submit"]').textContent = 'Registrar Despesa';
    document.getElementById('btnCancelarEdicaoDespesa').style.display = 'none';

    transacaoEditandoId = null;
    transacaoEditandoTipo = null;
    exibirToast('Edição cancelada.', 'aviso');
}


// --- Funções de Filtro e Renderização da Lista de Transações ---

function aplicarFiltros() {
    const filtroTipoTransacao = document.getElementById('filtroTipoTransacao').value;
    const filtroClienteCpf = document.getElementById('filtroCliente').value;
    const filtroDataInicio = document.getElementById('filtroDataInicio').value;
    const filtroDataFim = document.getElementById('filtroDataFim').value;
    const filtroForma = document.getElementById('filtroForma').value;
    const filtroValorMin = parseFloat(document.getElementById('filtroValorMin').value) || 0;
    const filtroValorMax = parseFloat(document.getElementById('filtroValorMax').value) || Infinity;

    const historico = carregarCaixaHistorico();
    let todasTransacoes = [];

    historico.forEach(dia => {
        dia.vendas.forEach(venda => {
            todasTransacoes.push({ ...venda, dataRegistro: new Date(venda.dataHora).toISOString().split('T')[0] });
        });
        dia.despesas.forEach(despesa => {
            todasTransacoes.push({ ...despesa, dataRegistro: new Date(despesa.dataHora).toISOString().split('T')[0] });
        });
    });

    transacoesFiltradas = todasTransacoes.filter(t => {
        // Filtro por tipo de transação
        if (filtroTipoTransacao !== 'Todas' && t.tipo !== filtroTipoTransacao) {
            return false;
        }

        // Filtro por cliente (apenas para vendas)
        if (filtroClienteCpf && t.tipo === 'Venda' && t.clienteCpf !== filtroClienteCpf) {
            return false;
        }

        // Filtro por data
        const dataTransacao = t.dataRegistro;
        if (filtroDataInicio && dataTransacao < filtroDataInicio) {
            return false;
        }
        if (filtroDataFim && dataTransacao > filtroDataFim) {
            return false;
        }

        // Filtro por forma de pagamento (apenas para vendas)
        if (filtroForma && t.tipo === 'Venda' && t.formaPagamento !== filtroForma) {
            return false;
        }

        // Filtro por valor
        const valorTransacao = t.tipo === 'Venda' ? t.valorTotal : t.valor;
        if (valorTransacao < filtroValorMin || valorTransacao > filtroValorMax) {
            return false;
        }

        return true;
    }).sort((a, b) => new Date(b.dataHora) - new Date(a.dataHora)); // Mais recentes primeiro

    paginaAtual = 1; // Reseta para a primeira página após filtrar
    renderizarTransacoes();
}

function renderizarTransacoes() {
    const listaTransacoesDiv = document.getElementById('listaTransacoes');
    const paginacaoDiv = document.getElementById('paginacao');
    listaTransacoesDiv.innerHTML = '';
    paginacaoDiv.innerHTML = '';

    const totalTransacoes = transacoesFiltradas.length;
    const totalPaginas = Math.ceil(totalTransacoes / transacoesPorPagina);

    const inicio = (paginaAtual - 1) * transacoesPorPagina;
    const fim = inicio + transacoesPorPagina;
    const transacoesDaPagina = transacoesFiltradas.slice(inicio, fim);

    if (transacoesDaPagina.length === 0) {
        listaTransacoesDiv.innerHTML = '<p>Nenhuma transação encontrada para os filtros aplicados.</p>';
        return;
    }

    let htmlContent = `
        <table class="tabela-transacoes">
            <thead>
                <tr>
                    <th>Tipo</th>
                    <th>Descrição / Itens</th>
                    <th>Cliente</th>
                    <th>Valor</th>
                    <th>Forma Pgto.</th>
                    <th>Data/Hora</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>
    `;

    transacoesDaPagina.forEach(transacao => {
        const dataLocal = new Date(transacao.dataHora).toLocaleString('pt-BR');
        const isVenda = transacao.tipo === 'Venda';
        const clienteNome = isVenda ? getNomeClientePorCpf(transacao.clienteCpf) : 'N/A';
        const valorFormatado = formatarValor(isVenda ? transacao.valorTotal : transacao.valor);
        const formaPgto = isVenda ? transacao.formaPagamento : 'N/A';
        const descricaoDetalhada = isVenda
            ? `<ul>${transacao.items.map(item => `<li>${item.quantidade}x ${item.descricao} (${formatarValor(item.valorUnitario)})</li>`).join('')}</ul>`
            : transacao.descricao;

        // Verifica se o dia da transação está fechado para desabilitar edicao/delete
        const historico = carregarCaixaHistorico();
        const diaCorrente = historico.find(d => d.data === new Date(transacao.dataHora).toISOString().split('T')[0]);
        const diaFechado = diaCorrente && diaCorrente.fechado;
        const acoesDesabilitadas = diaFechado ? 'disabled' : '';

        htmlContent += `
            <tr class="${transacao.tipo.toLowerCase()}">
                <td>${transacao.tipo}</td>
                <td>${descricaoDetalhada}</td>
                <td>${clienteNome}</td>
                <td class="valor-${isVenda ? 'entrada' : 'saida'}">${valorFormatado}</td>
                <td>${formaPgto}</td>
                <td>${dataLocal}</td>
                <td>
                    <button onclick="editarTransacao('${transacao.id}', '${transacao.tipo}')" class="btn-acao editar-btn" ${acoesDesabilitadas}>Editar</button>
                    <button onclick="apagarTransacao('${transacao.id}', '${transacao.tipo}')" class="btn-acao apagar-btn" ${acoesDesabilitadas}>Apagar</button>
                    ${isVenda ? `<button onclick="abrirReciboModal('${transacao.id}')" class="btn-acao recibo-btn">Recibo</button>` : ''}
                </td>
            </tr>
        `;
    });

    htmlContent += '</tbody></table>';
    listaTransacoesDiv.innerHTML = htmlContent;

    // Paginacao
    if (totalPaginas > 1) {
        let paginacaoHtml = '';
        if (paginaAtual > 1) {
            paginacaoHtml += `<button onclick="mudarPagina(${paginaAtual - 1})" class="btn-paginacao">Anterior</button> `;
        }
        for (let i = 1; i <= totalPaginas; i++) {
            paginacaoHtml += `<button onclick="mudarPagina(${i})" class="btn-paginacao ${i === paginaAtual ? 'active' : ''}">${i}</button> `;
        }
        if (paginaAtual < totalPaginas) {
            paginacaoHtml += `<button onclick="mudarPagina(${paginaAtual + 1})" class="btn-paginacao">Próxima</button>`;
        }
        paginacaoDiv.innerHTML = paginacaoHtml;
    }
}

function mudarPagina(novaPagina) {
    paginaAtual = novaPagina;
    renderizarTransacoes();
    document.getElementById('listaTransacoes').scrollIntoView({ behavior: 'smooth' }); // Rola para o topo da lista
}

// --- Fechamento de Caixa ---

document.getElementById('dataFechamento').value = obterDataHoje(); // Preenche com a data atual

document.getElementById('gerarRelatorioBtn').addEventListener('click', () => {
    const dataSelecionada = document.getElementById('dataFechamento').value;
    gerarRelatorioFechamento(dataSelecionada);
});

function gerarRelatorioFechamento(data) {
    const historico = carregarCaixaHistorico();
    const diaCaixa = historico.find(d => d.data === data);

    const resumoDiv = document.getElementById('resumoFechamento');
    resumoDiv.innerHTML = '';

    if (!diaCaixa) {
        resumoDiv.innerHTML = `<p>Nenhuma transação encontrada para ${new Date(data).toLocaleDateString('pt-BR')}.</p>`;
        return;
    }

    let totalEntradas = diaCaixa.vendas.reduce((sum, v) => sum + v.valorTotal, 0);
    let totalSaidas = diaCaixa.despesas.reduce((sum, d) => sum + d.valor, 0);
    let saldoDoDia = totalEntradas - totalSaidas;

    let vendasPorForma = {};
    diaCaixa.vendas.forEach(v => {
        vendasPorForma[v.formaPagamento] = (vendasPorForma[v.formaPagamento] || 0) + v.valorTotal;
    });

    let html = `
        <h4>Relatório de Caixa para ${new Date(data).toLocaleDateString('pt-BR')}</h4>
        <p><strong>Status:</strong> ${diaCaixa.fechado ? '<span class="status-concluido">FECHADO</span>' : '<span class="status-pendente">ABERTO</span>'}</p>
        <p><strong>Total de Entradas:</strong> ${formatarValor(totalEntradas)}</p>
        <p><strong>Total de Saídas:</strong> ${formatarValor(totalSaidas)}</p>
        <p><strong>Saldo do Dia:</strong> ${formatarValor(saldoDoDia)}</p>
        <h5>Vendas por Forma de Pagamento:</h5>
        <ul>
    `;
    for (const forma in vendasPorForma) {
        html += `<li>${forma}: ${formatarValor(vendasPorForma[forma])}</li>`;
    }
    html += '</ul>';

    if (diaCaixa.despesas.length > 0) {
        html += `
            <h5>Detalhes das Despesas:</h5>
            <ul>
        `;
        diaCaixa.despesas.forEach(d => {
            html += `<li>${d.descricao}: ${formatarValor(d.valor)}</li>`;
        });
        html += '</ul>';
    }

    resumoDiv.innerHTML = html;
}

document.getElementById('fecharCaixaBtn').addEventListener('click', () => {
    const dataParaFechar = document.getElementById('dataFechamento').value;
    if (!dataParaFechar) {
        exibirToast('Selecione uma data para fechar o caixa.', 'erro');
        return;
    }

    let historico = carregarCaixaHistorico();
    const diaCaixaIndex = historico.findIndex(d => d.data === dataParaFechar);

    if (diaCaixaIndex === -1) {
        exibirToast('Nenhuma transação para fechar nesta data.', 'aviso');
        return;
    }

    if (historico[diaCaixaIndex].fechado) {
        exibirToast('Caixa para esta data já está fechado.', 'aviso');
        return;
    }

    if (confirm(`Tem certeza que deseja fechar o caixa para o dia ${new Date(dataParaFechar).toLocaleDateString('pt-BR')}? Esta ação não pode ser desfeita.`)) {
        historico[diaCaixaIndex].fechado = true;
        salvarCaixaHistorico(historico);
        exibirToast('Caixa fechado com sucesso!', 'sucesso');
        gerarRelatorioFechamento(dataParaFechar); // Atualiza o relatório para mostrar como fechado
        aplicarFiltros(); // Atualiza a lista de transações para desabilitar edicao/delete
    }
});


// --- Geração de Recibos ---

const reciboModal = document.getElementById('reciboModal');
const closeButton = document.querySelector('.modal .close-button');
const imprimirReciboBtn = document.getElementById('imprimirReciboBtn');

function abrirReciboModal(vendaId) {
    const historico = carregarCaixaHistorico();
    let vendaParaRecibo = null;

    for (const dia of historico) {
        vendaParaRecibo = dia.vendas.find(v => v.id === vendaId);
        if (vendaParaRecibo) break;
    }

    if (!vendaParaRecibo) {
        exibirToast('Venda não encontrada para gerar recibo.', 'erro');
        return;
    }

    const clienteNome = getNomeClientePorCpf(vendaParaRecibo.clienteCpf);
    const dataHoraVenda = new Date(vendaParaRecibo.dataHora).toLocaleString('pt-BR');
    const valorTotalFormatado = formatarValor(vendaParaRecibo.valorTotal);

    let itensHtml = vendaParaRecibo.items.map(item => `
        <li>${item.quantidade}x ${item.descricao} @ ${formatarValor(item.valorUnitario)} = ${formatarValor(item.quantidade * item.valorUnitario)}</li>
    `).join('');

    const reciboConteudo = document.getElementById('reciboConteudo');
    reciboConteudo.innerHTML = `
        <div class="recibo-cabecalho">
            <h3>RECIBO DE PAGAMENTO</h3>
            <p><strong>Data:</strong> ${dataHoraVenda}</p>
            <p><strong>No. Transação:</strong> ${vendaParaRecibo.id}</p>
        </div>
        <div class="recibo-detalhes">
            <p>Recebemos de: <strong>${clienteNome}</strong></p>
            <p>A quantia de: <strong>${valorTotalFormatado}</strong></p>
            <p>Referente a:</p>
            <ul>${itensHtml}</ul>
            ${vendaParaRecibo.observacoes ? `<p><strong>Observações:</strong> ${vendaParaRecibo.observacoes}</p>` : ''}
            <p>Forma de Pagamento: <strong>${vendaParaRecibo.formaPagamento}</strong></p>
        </div>
        <div class="recibo-rodape">
            <p>____________________________________</p>
            <p>Assinatura do Responsável</p>
            <p>${obterDataHoje(false)}</p>
        </div>
    `;

    reciboModal.style.display = 'block';
}

closeButton.addEventListener('click', () => {
    reciboModal.style.display = 'none';
});

window.addEventListener('click', (event) => {
    if (event.target === reciboModal) {
        reciboModal.style.display = 'none';
    }
});

imprimirReciboBtn.addEventListener('click', () => {
    const printContent = document.getElementById('reciboConteudo').outerHTML;
    const originalBody = document.body.innerHTML;
    document.body.innerHTML = printContent;
    window.print();
    document.body.innerHTML = originalBody; // Restaura o corpo original após a impressão
    reciboModal.style.display = 'none'; // Fecha o modal após a impressão
});


// --- Inicialização ---

document.addEventListener('DOMContentLoaded', () => {
    popularSelectClientes();
    adicionarItemVendaLinha(); // Adiciona a primeira linha de item na venda
    document.getElementById('dataDespesa').value = obterDataHoje(); // Define a data da despesa como hoje

    // Event listeners para os botões de cancelar edição
    document.getElementById('btnCancelarEdicaoVenda').addEventListener('click', cancelarEdicao);
    document.getElementById('btnCancelarEdicaoDespesa').addEventListener('click', cancelarEdicao);

    // Event listener para o botão "Adicionar Item"
    document.getElementById('adicionarItemBtn').addEventListener('click', () => adicionarItemVendaLinha());

    // Event listeners para filtros
    document.getElementById('filtroForm').addEventListener('submit', function (e) {
        e.preventDefault();
        aplicarFiltros();
    });
    document.getElementById('limparFiltros').addEventListener('click', function () {
        document.getElementById('filtroForm').reset();
        document.getElementById('filtroDataInicio').value = '';
        document.getElementById('filtroDataFim').value = '';
        aplicarFiltros();
    });

    // Chama aplicarFiltros no carregamento para exibir todas as transações
    aplicarFiltros();

    // Gera o relatório do dia atual ao carregar
    gerarRelatorioFechamento(obterDataHoje());
});