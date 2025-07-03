// notas.js

// --- Variáveis de Estado e Dados ---
let notas = [];
let clientes = []; // Carregado de clientes.js
let produtosEstoque = []; // Carregado de estoque.js

let notaEditandoId = null; // ID da nota em edição (null = sem edição)
let notasFiltradas = []; // Notas após aplicação dos filtros
let paginaAtualNotas = 1;
const notasPorPagina = 10; // Notas exibidas por página

// --- Elementos DOM ---
// Formulário de Emissão
const formEmissaoNota = document.getElementById('formEmissaoNota');
const notaIdInput = document.getElementById('notaId');
const tipoDocumentoSelect = document.getElementById('tipoDocumento');
const clienteNotaSelect = document.getElementById('clienteNota');
const dataEmissaoInput = document.getElementById('dataEmissao');
const itensNotaContainer = document.getElementById('itensNotaContainer');
const adicionarItemNotaBtn = document.getElementById('adicionarItemNotaBtn');
const valorTotalNotaSpan = document.getElementById('valorTotalNota');
const observacoesNotaInput = document.getElementById('observacoesNota');
const btnCancelarEdicaoNota = document.getElementById('btnCancelarEdicaoNota');

// Consulta de Notas
const filtroBuscaNotaInput = document.getElementById('filtroBuscaNota');
const filtroTipoNotaSelect = document.getElementById('filtroTipoNota');
const filtroStatusNotaSelect = document.getElementById('filtroStatusNota');
const filtroDataInicioNotaInput = document.getElementById('filtroDataInicioNota');
const filtroDataFimNotaInput = document.getElementById('filtroDataFimNota');
const aplicarFiltrosNotasBtn = document.getElementById('aplicarFiltrosNotasBtn');
const limparFiltrosNotasBtn = document.getElementById('limparFiltrosNotasBtn');
const tabelaNotasBody = document.getElementById('tabelaNotas');
const paginacaoNotasDiv = document.getElementById('paginacaoNotas');

// Modal de Visualização
const modalVisualizacaoNota = document.getElementById('modalVisualizacaoNota');
const conteudoNotaVisualizacaoDiv = document.getElementById('conteudoNotaVisualizacao');
const imprimirNotaBtn = document.getElementById('imprimirNotaBtn');
const closeModalButton = document.querySelector('.modal-content .close-button');

// --- Funções Auxiliares (duplicadas se não forem globais em assets/js/common.js) ---
function gerarIdUnico() {
    return 'id-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

function exibirToast(mensagem, tipo = 'sucesso') {
    const container = document.getElementById('toast-container');
    if (!container) return; // Se o contêiner não existir, não faz nada
    const toast = document.createElement('div');
    toast.classList.add('toast', tipo);
    toast.textContent = mensagem;
    container.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 4000);
}

function formatarValor(valor) {
    return parseFloat(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function obterDataHojeISO() {
    return new Date().toISOString().split('T')[0];
}

// --- Funções de Carregamento e Salvamento de Dados ---
function carregarNotas() {
    notas = JSON.parse(localStorage.getItem('notas')) || [];
}

function salvarNotas() {
    localStorage.setItem('notas', JSON.stringify(notas));
}

// --- Funções de Cliente e Estoque (assumindo que são carregadas de outros scripts) ---
// Estes stubs são para garantir que o código funcione mesmo se os outros JS não carregarem
// Em um ambiente real, você esperaria que `clientes.js` e `estoque.js` já tivessem
// definido `carregarClientes` e `carregarEstoque` e as variáveis `clientes` e `produtos`.

function carregarClientes() {
    try {
        return JSON.parse(localStorage.getItem('clientes')) || [];
    } catch (e) {
        console.error("Erro ao carregar clientes do localStorage:", e);
        return [];
    }
}

function carregarEstoque() {
    try {
        return JSON.parse(localStorage.getItem('produtos')) || [];
    } catch (e) {
        console.error("Erro ao carregar produtos do estoque do localStorage:", e);
        return [];
    }
}


function obterNomeClientePorId(clienteId) {
    const cliente = clientes.find(c => c.id === clienteId);
    return cliente ? `${cliente.nome} (CPF: ${cliente.cpf})` : 'Cliente Desconhecido';
}

function obterDescricaoProdutoEstoque(produtoId) {
    const produto = produtosEstoque.find(p => p.id === produtoId);
    return produto ? `${produto.nome} (${produto.categoria})` : '';
}

// --- Funções do Formulário de Emissão de Nota ---

function popularSelectClientesNota() {
    clienteNotaSelect.innerHTML = '<option value="">Selecione o Cliente</option>';
    clientes.forEach(cliente => {
        const option = document.createElement('option');
        option.value = cliente.id;
        option.textContent = `${cliente.nome} (${cliente.cpf})`;
        clienteNotaSelect.appendChild(option);
    });
}

function popularSelectProdutosServicosNota(selectElement) {
    selectElement.innerHTML = '<option value="">Selecione Produto/Serviço</option>';
    selectElement.innerHTML += '<option value="manual">Inserir Descrição Manualmente</option>';
    produtosEstoque.forEach(produto => {
        const option = document.createElement('option');
        option.value = produto.id;
        option.textContent = `${produto.nome} (Estoque: ${produto.quantidade}) - ${formatarValor(produto.valor)}`;
        option.dataset.valorUnitario = produto.valor; // Armazena o valor para auto-preenchimento
        selectElement.appendChild(option);
    });
}

function adicionarItemNota(item = null) {
    const itemRow = document.createElement('div');
    itemRow.classList.add('item-nota-linha');

    itemRow.innerHTML = `
        <select class="select-campo produto-servico-nota-select" required>
            <option value="">Selecione Produto/Serviço</option>
        </select>
        <input type="text" class="input-campo item-descricao-manual" placeholder="Descrição Serviço" style="display:none;">
        <input type="number" class="input-campo item-quantidade" placeholder="Qtd" min="1" value="${item ? item.quantidade : 1}" required>
        <input type="number" class="input-campo item-valor-unitario" placeholder="Valor Unit." step="0.01" min="0" value="${item ? item.valorUnitario : ''}" required>
        <span class="item-subtotal">Subtotal: ${formatarValor(0)}</span>
        <button type="button" class="btn btn-danger-outline remover-item-btn">Remover</button>
    `;

    itensNotaContainer.appendChild(itemRow);

    const selectProdServ = itemRow.querySelector('.produto-servico-nota-select');
    const inputDescricaoManual = itemRow.querySelector('.item-descricao-manual');
    const inputQuantidade = itemRow.querySelector('.item-quantidade');
    const inputValorUnitario = itemRow.querySelector('.item-valor-unitario');
    const removerBtn = itemRow.querySelector('.remover-item-btn');

    popularSelectProdutosServicosNota(selectProdServ);

    if (item) {
        // Se for um item existente, tenta pré-selecionar
        if (item.produtoServicoId && produtosEstoque.some(p => p.id === item.produtoServicoId)) {
            selectProdServ.value = item.produtoServicoId;
            inputDescricaoManual.style.display = 'none';
        } else {
            selectProdServ.value = 'manual';
            inputDescricaoManual.style.display = 'inline-block';
            inputDescricaoManual.value = item.descricao;
        }
        inputQuantidade.value = item.quantidade;
        inputValorUnitario.value = item.valorUnitario;
        calcularSubtotalItem(itemRow);
    }

    // Event Listeners para cada linha de item
    selectProdServ.addEventListener('change', () => {
        if (selectProdServ.value === 'manual') {
            inputDescricaoManual.style.display = 'inline-block';
            inputDescricaoManual.value = ''; // Limpa a descrição manual ao selecionar
            inputValorUnitario.value = ''; // Limpa o valor para ser inserido manualmente
        } else {
            inputDescricaoManual.style.display = 'none';
            const selectedOption = selectProdServ.options[selectProdServ.selectedIndex];
            if (selectedOption && selectedOption.dataset.valorUnitario) {
                inputValorUnitario.value = parseFloat(selectedOption.dataset.valorUnitario).toFixed(2);
            }
        }
        calcularSubtotalItem(itemRow);
        calcularTotalNota();
    });

    inputQuantidade.addEventListener('input', () => {
        calcularSubtotalItem(itemRow);
        calcularTotalNota();
    });

    inputValorUnitario.addEventListener('input', () => {
        calcularSubtotalItem(itemRow);
        calcularTotalNota();
    });

    removerBtn.addEventListener('click', () => {
        if (itensNotaContainer.children.length > 1) { // Garante que pelo menos 1 item permaneça
            itemRow.remove();
            calcularTotalNota();
        } else {
            exibirToast('A nota deve ter pelo menos um item.', 'aviso');
        }
    });
}

function calcularSubtotalItem(itemRow) {
    const quantidade = parseFloat(itemRow.querySelector('.item-quantidade').value) || 0;
    const valorUnitario = parseFloat(itemRow.querySelector('.item-valor-unitario').value) || 0;
    const subtotal = quantidade * valorUnitario;
    itemRow.querySelector('.item-subtotal').textContent = `Subtotal: ${formatarValor(subtotal)}`;
    return subtotal;
}

function calcularTotalNota() {
    let total = 0;
    document.querySelectorAll('.item-nota-linha').forEach(itemRow => {
        total += calcularSubtotalItem(itemRow);
    });
    valorTotalNotaSpan.textContent = formatarValor(total);
}

adicionarItemNotaBtn.addEventListener('click', () => adicionarItemNota());

formEmissaoNota.addEventListener('submit', function (e) {
    e.preventDefault();

    const id = notaIdInput.value;
    const tipoDocumento = tipoDocumentoSelect.value;
    const clienteId = clienteNotaSelect.value;
    const dataEmissao = dataEmissaoInput.value;
    const observacoes = observacoesNotaInput.value.trim();

    if (!clienteId || !dataEmissao) {
        exibirToast('Por favor, preencha o cliente e a data de emissão.', 'erro');
        return;
    }

    const itens = [];
    let validItems = true;
    document.querySelectorAll('.item-nota-linha').forEach(itemRow => {
        const selectProdServ = itemRow.querySelector('.produto-servico-nota-select');
        const inputDescricaoManual = itemRow.querySelector('.item-descricao-manual');
        const inputQuantidade = itemRow.querySelector('.item-quantidade');
        const inputValorUnitario = itemRow.querySelector('.item-valor-unitario');

        let descricao = '';
        let produtoServicoId = '';

        if (selectProdServ.value === 'manual') {
            descricao = inputDescricaoManual.value.trim();
            if (!descricao) {
                exibirToast('A descrição do item manual não pode estar vazia.', 'erro');
                validItems = false;
                return;
            }
        } else if (selectProdServ.value) {
            produtoServicoId = selectProdServ.value;
            descricao = selectProdServ.options[selectProdServ.selectedIndex].textContent.split(' (Estoque:')[0]; // Pega só o nome do produto/serviço
        } else {
            exibirToast('Selecione um produto/serviço ou insira uma descrição para todos os itens.', 'erro');
            validItems = false;
            return;
        }

        const quantidade = parseInt(inputQuantidade.value);
        const valorUnitario = parseFloat(inputValorUnitario.value);

        if (isNaN(quantidade) || quantidade <= 0 || isNaN(valorUnitario) || valorUnitario < 0) {
            exibirToast('Quantidade e valor unitário dos itens devem ser números positivos.', 'erro');
            validItems = false;
            return;
        }

        itens.push({
            produtoServicoId,
            descricao,
            quantidade,
            valorUnitario,
            subtotal: quantidade * valorUnitario
        });
    });

    if (!validItems || itens.length === 0) {
        exibirToast('Por favor, verifique os itens da nota. Pelo menos um item válido é necessário.', 'erro');
        return;
    }

    const valorTotal = itens.reduce((sum, item) => sum + item.subtotal, 0);

    const notaData = {
        id: id || gerarIdUnico(),
        tipoDocumento,
        clienteId,
        dataEmissao,
        itens,
        valorTotal,
        observacoes,
        status: id ? notas.find(n => n.id === id).status : 'Ativa', // Mantém o status se for edição, senão 'Ativa'
        dataCriacao: id ? notas.find(n => n.id === id).dataCriacao : obterDataHojeISO(),
    };

    if (id) {
        // Edição de nota
        const index = notas.findIndex(n => n.id === id);
        if (index !== -1) {
            notas[index] = notaData;
            exibirToast('Nota atualizada com sucesso!', 'sucesso');
        }
    } else {
        // Nova nota
        notas.push(notaData);
        exibirToast('Nota emitida com sucesso!', 'sucesso');
    }

    salvarNotas();
    resetFormEmissao();
    aplicarFiltrosNotas(); // Recarrega a lista com a nova/editada nota
});

btnCancelarEdicaoNota.addEventListener('click', resetFormEmissao);

function resetFormEmissao() {
    formEmissaoNota.reset();
    notaIdInput.value = '';
    btnCancelarEdicaoNota.style.display = 'none';
    formEmissaoNota.querySelector('button[type="submit"]').textContent = 'Emitir Nota';
    notaEditandoId = null;

    // Limpa e adiciona um item vazio novamente
    itensNotaContainer.innerHTML = '';
    adicionarItemNota();
    calcularTotalNota(); // Zera o total
    exibirToast('Formulário de emissão de nota resetado.', 'info');
}


// --- Funções de Consulta e Arquivamento de Notas ---

function aplicarFiltrosNotas() {
    const busca = filtroBuscaNotaInput.value.toLowerCase();
    const tipo = filtroTipoNotaSelect.value;
    const status = filtroStatusNotaSelect.value;
    const dataInicio = filtroDataInicioNotaInput.value;
    const dataFim = filtroDataFimNotaInput.value;

    notasFiltradas = notas.filter(nota => {
        const matchesBusca = busca === '' ||
            obterNomeClientePorId(nota.clienteId).toLowerCase().includes(busca) ||
            nota.itens.some(item => item.descricao.toLowerCase().includes(busca)) ||
            nota.id.toLowerCase().includes(busca);

        const matchesTipo = tipo === 'Todas' || nota.tipoDocumento === tipo;
        const matchesStatus = status === 'Todas' || nota.status === status;

        const matchesDataInicio = !dataInicio || new Date(nota.dataEmissao) >= new Date(dataInicio);
        const matchesDataFim = !dataFim || new Date(nota.dataEmissao) <= new Date(dataFim);

        return matchesBusca && matchesTipo && matchesStatus && matchesDataInicio && matchesDataFim;
    }).sort((a, b) => new Date(b.dataEmissao) - new Date(a.dataEmissao)); // Ordena por data mais recente

    paginaAtualNotas = 1; // Reseta para a primeira página após aplicar filtros
    renderizarTabelaNotas();
    renderizarPaginacaoNotas();
}

filtroBuscaNotaInput.addEventListener('input', aplicarFiltrosNotas);
filtroTipoNotaSelect.addEventListener('change', aplicarFiltrosNotas);
filtroStatusNotaSelect.addEventListener('change', aplicarFiltrosNotas);
filtroDataInicioNotaInput.addEventListener('change', aplicarFiltrosNotas);
filtroDataFimNotaInput.addEventListener('change', aplicarFiltrosNotas);
aplicarFiltrosNotasBtn.addEventListener('click', aplicarFiltrosNotas);
limparFiltrosNotasBtn.addEventListener('click', () => {
    filtroBuscaNotaInput.value = '';
    filtroTipoNotaSelect.value = 'Todas';
    filtroStatusNotaSelect.value = 'Todas';
    filtroDataInicioNotaInput.value = '';
    filtroDataFimNotaInput.value = '';
    aplicarFiltrosNotas();
    exibirToast('Filtros de notas limpos.', 'info');
});

function renderizarTabelaNotas() {
    tabelaNotasBody.innerHTML = '';
    const inicio = (paginaAtualNotas - 1) * notasPorPagina;
    const fim = inicio + notasPorPagina;
    const notasParaExibir = notasFiltradas.slice(inicio, fim);

    if (notasParaExibir.length === 0) {
        tabelaNotasBody.innerHTML = '<tr><td colspan="7">Nenhuma nota encontrada com os filtros aplicados.</td></tr>';
        return;
    }

    notasParaExibir.forEach(nota => {
        const row = tabelaNotasBody.insertRow();
        const clienteNome = obterNomeClientePorId(nota.clienteId);
        row.innerHTML = `
            <td>${nota.id.substring(0, 8)}...</td>
            <td>${nota.tipoDocumento}</td>
            <td>${clienteNome}</td>
            <td>${nota.dataEmissao}</td>
            <td>${formatarValor(nota.valorTotal)}</td>
            <td><span class="status-badge ${nota.status === 'Ativa' ? 'status-ativa' : 'status-arquivada'}">${nota.status}</span></td>
            <td class="acoes">
                <button onclick="visualizarNota('${nota.id}')" class="btn-acao ver-btn">Ver</button>
                <button onclick="editarNota('${nota.id}')" class="btn-acao editar-btn">Editar</button>
                <button onclick="alternarArquivamentoNota('${nota.id}')" class="btn-acao ${nota.status === 'Ativa' ? 'arquivar-btn' : 'desarquivar-btn'}">
                    ${nota.status === 'Ativa' ? 'Arquivar' : 'Desarquivar'}
                </button>
                <button onclick="excluirNota('${nota.id}')" class="btn-acao apagar-btn">Excluir</button>
            </td>
        `;
    });
}

function renderizarPaginacaoNotas() {
    paginacaoNotasDiv.innerHTML = '';
    const totalPaginas = Math.ceil(notasFiltradas.length / notasPorPagina);

    if (totalPaginas <= 1) return;

    const btnAnterior = document.createElement('button');
    btnAnterior.textContent = 'Anterior';
    btnAnterior.classList.add('btn-paginacao');
    btnAnterior.disabled = paginaAtualNotas === 1;
    btnAnterior.addEventListener('click', () => mudarPaginaNotas(paginaAtualNotas - 1));
    paginacaoNotasDiv.appendChild(btnAnterior);

    for (let i = 1; i <= totalPaginas; i++) {
        const btnPagina = document.createElement('button');
        btnPagina.textContent = i;
        btnPagina.classList.add('btn-paginacao');
        if (i === paginaAtualNotas) {
            btnPagina.classList.add('active');
        }
        btnPagina.addEventListener('click', () => mudarPaginaNotas(i));
        paginacaoNotasDiv.appendChild(btnPagina);
    }

    const btnProxima = document.createElement('button');
    btnProxima.textContent = 'Próxima';
    btnProxima.classList.add('btn-paginacao');
    btnProxima.disabled = paginaAtualNotas === totalPaginas;
    btnProxima.addEventListener('click', () => mudarPaginaNotas(paginaAtualNotas + 1));
    paginacaoNotasDiv.appendChild(btnProxima);
}

function mudarPaginaNotas(novaPagina) {
    paginaAtualNotas = novaPagina;
    renderizarTabelaNotas();
    renderizarPaginacaoNotas();
}

function visualizarNota(id) {
    const nota = notas.find(n => n.id === id);
    if (!nota) {
        exibirToast('Nota não encontrada para visualização.', 'erro');
        return;
    }

    const cliente = clientes.find(c => c.id === nota.clienteId);
    const clienteInfo = cliente ? `
        <p><strong>Nome:</strong> ${cliente.nome}</p>
        <p><strong>CPF/CNPJ:</strong> ${cliente.cpf}</p>
        <p><strong>Endereço:</strong> ${cliente.endereco}</p>
        <p><strong>Telefone:</strong> ${cliente.telefone}</p>
    ` : '<p>Cliente: Desconhecido</p>';

    let itensHtml = '<ul>';
    nota.itens.forEach(item => {
        itensHtml += `<li>${item.descricao} (Qtd: ${item.quantidade} x ${formatarValor(item.valorUnitario)}) = ${formatarValor(item.subtotal)}</li>`;
    });
    itensHtml += '</ul>';

    conteudoNotaVisualizacaoDiv.innerHTML = `
        <h3>${nota.tipoDocumento} - #${nota.id.substring(0, 8)}</h3>
        <p><strong>Data de Emissão:</strong> ${nota.dataEmissao}</p>
        <h4>Dados do Cliente:</h4>
        ${clienteInfo}
        <h4>Itens / Serviços:</h4>
        ${itensHtml}
        <p><strong>Total Geral:</strong> ${formatarValor(nota.valorTotal)}</p>
        ${nota.observacoes ? `<p><strong>Observações:</strong> ${nota.observacoes}</p>` : ''}
        <p class="nota-status"><strong>Status:</strong> ${nota.status}</p>
    `;

    modalVisualizacaoNota.style.display = 'block';
}

function editarNota(id) {
    const nota = notas.find(n => n.id === id);
    if (nota) {
        notaEditandoId = nota.id;
        notaIdInput.value = nota.id;
        tipoDocumentoSelect.value = nota.tipoDocumento;
        clienteNotaSelect.value = nota.clienteId;
        dataEmissaoInput.value = nota.dataEmissao;
        observacoesNotaInput.value = nota.observacoes;

        // Limpa e adiciona os itens da nota para edição
        itensNotaContainer.innerHTML = '';
        nota.itens.forEach(item => adicionarItemNota(item));
        calcularTotalNota(); // Recalcula o total inicial

        formEmissaoNota.querySelector('button[type="submit"]').textContent = 'Atualizar Nota';
        btnCancelarEdicaoNota.style.display = 'inline-block';
        exibirToast('Editando nota. Altere os campos e clique em "Atualizar Nota".', 'info');
        // Role para a seção de emissão
        formEmissaoNota.scrollIntoView({ behavior: 'smooth' });
    } else {
        exibirToast('Nota não encontrada para edição.', 'erro');
    }
}

function alternarArquivamentoNota(id) {
    const notaIndex = notas.findIndex(n => n.id === id);
    if (notaIndex !== -1) {
        const nota = notas[notaIndex];
        nota.status = nota.status === 'Ativa' ? 'Arquivada' : 'Ativa';
        salvarNotas();
        aplicarFiltrosNotas(); // Re-aplica filtros para atualizar a tabela
        exibirToast(`Nota ${nota.id.substring(0, 8)}... ${nota.status === 'Ativa' ? 'desarquivada' : 'arquivada'} com sucesso!`, 'sucesso');
    } else {
        exibirToast('Nota não encontrada para arquivamento.', 'erro');
    }
}

function excluirNota(id) {
    const nota = notas.find(n => n.id === id);
    if (nota && confirm(`Tem certeza que deseja excluir a nota ${nota.id.substring(0, 8)}... (${nota.tipoDocumento}) do cliente ${obterNomeClientePorId(nota.clienteId)}? Esta ação é irreversível.`)) {
        notas = notas.filter(n => n.id !== id);
        salvarNotas();
        aplicarFiltrosNotas(); // Re-aplica filtros para atualizar a tabela
        exibirToast('Nota excluída com sucesso!', 'sucesso');
    }
}

// --- Event Listeners do Modal ---
closeModalButton.addEventListener('click', () => {
    modalVisualizacaoNota.style.display = 'none';
});

window.addEventListener('click', (event) => {
    if (event.target === modalVisualizacaoNota) {
        modalVisualizacaoNota.style.display = 'none';
    }
});

imprimirNotaBtn.addEventListener('click', () => {
    const printContent = conteudoNotaVisualizacaoDiv.innerHTML;
    const originalBody = document.body.innerHTML;
    document.body.innerHTML = printContent; // Temporariamente altera o body para imprimir só o conteúdo da nota
    window.print();
    document.body.innerHTML = originalBody; // Restaura o corpo original
    exibirToast('Nota enviada para impressão.', 'info');
    modalVisualizacaoNota.style.display = 'none'; // Fecha o modal após imprimir
});


// --- Inicialização ---
document.addEventListener('DOMContentLoaded', () => {
    carregarNotas();
    // Tenta carregar clientes e produtos do estoque (assumindo que já foram definidos globalmente)
    clientes = typeof carregarClientes === 'function' ? carregarClientes() : [];
    produtosEstoque = typeof carregarEstoque === 'function' ? carregarEstoque() : [];

    popularSelectClientesNota();
    adicionarItemNota(); // Adiciona a primeira linha de item vazia ao carregar o form
    dataEmissaoInput.value = obterDataHojeISO(); // Preenche a data com a data atual

    aplicarFiltrosNotas(); // Aplica filtros iniciais e renderiza a tabela
});

// Garante que o total seja calculado ao carregar a página se houver itens preenchidos (ex: após edição ou refresh)
itensNotaContainer.addEventListener('input', calcularTotalNota);