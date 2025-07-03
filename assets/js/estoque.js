// estoque.js

// --- Variáveis de Estado e Dados ---
let produtos = [];
let historicoMovimentacoes = []; // Renomeado para evitar conflito com histórico de inventário
let fornecedores = [];
let requisicoesCompra = [];
let historicoInventario = [];

let produtoEditandoId = null;
let fornecedorEditandoId = null;
let produtoSelecionadoMovimentacaoId = null; // ID do produto no modal de movimentação

// --- Elementos DOM ---
// Cadastro de Produto
const formCadastro = document.getElementById('formCadastro');
const produtoIdInput = document.getElementById('produtoId');
const nomeInput = document.getElementById('nome');
const categoriaInput = document.getElementById('categoria');
const quantidadeInput = document.getElementById('quantidade');
const valorInput = document.getElementById('valor');
const nivelMinimoInput = document.getElementById('nivelMinimo');
const fornecedorProdutoSelect = document.getElementById('fornecedorProduto');
const observacoesProdutoInput = document.getElementById('observacoes');
const btnCancelarEdicaoProduto = document.getElementById('btnCancelarEdicao');

// Listagem de Produtos
const buscaInput = document.getElementById('busca');
const alertasEstoqueBaixoDiv = document.getElementById('alertasEstoqueBaixo');
const tabelaEstoqueBody = document.getElementById('tabelaEstoque');

// Gestão de Fornecedores
const formFornecedor = document.getElementById('formFornecedor');
const fornecedorIdInput = document.getElementById('fornecedorId');
const nomeFornecedorInput = document.getElementById('nomeFornecedor');
const contatoFornecedorInput = document.getElementById('contatoFornecedor');
const telefoneFornecedorInput = document.getElementById('telefoneFornecedor');
const emailFornecedorInput = document.getElementById('emailFornecedor');
const btnCancelarEdicaoFornecedor = document.getElementById('btnCancelarEdicaoFornecedor');
const tabelaFornecedoresBody = document.getElementById('tabelaFornecedores');

// Inventário / Contagem
const formInventario = document.getElementById('formInventario');
const produtoInventarioSelect = document.getElementById('produtoInventarioSelect');
const quantidadeContadaInput = document.getElementById('quantidadeContada');
const observacoesInventarioInput = document.getElementById('observacoesInventario');
const tabelaHistoricoInventarioBody = document.getElementById('tabelaHistoricoInventario');

// Requisições de Compra
const gerarRequisicaoEstoqueBaixoBtn = document.getElementById('gerarRequisicaoEstoqueBaixo');
const imprimirRequisicaoBtn = document.getElementById('imprimirRequisicao');
const areaRequisicaoDiv = document.getElementById('areaRequisicao');
const dataRequisicaoSpan = document.getElementById('dataRequisicao');
const tabelaItensRequisicaoBody = document.getElementById('tabelaItensRequisicao');
const tabelaHistoricoRequisicoesBody = document.getElementById('tabelaHistoricoRequisicoes');

// Histórico de Movimentações
const listaHistoricoUl = document.getElementById('listaHistorico');

// Modal de Movimentação (existente)
const modal = document.getElementById('modal');
const modalTitulo = document.getElementById('modalTitulo');
const modalProduto = document.getElementById('modalProduto');
const tipoMovimentacaoSelect = document.getElementById('tipoMovimentacao');
const quantidadeMovimentacaoInput = document.getElementById('quantidadeMovimentacao');
const observacoesMovimentacaoInput = document.getElementById('observacoesMovimentacao');
const btnConfirmarMovimentacao = document.getElementById('btnConfirmarMovimentacao');

// Abas de Navegação
const abasBtns = document.querySelectorAll('.aba-btn');
const secoes = document.querySelectorAll('section');

// --- Funções Auxiliares ---
function gerarIdUnico() {
    return 'id-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

function exibirToast(mensagem, tipo = 'sucesso') {
    const container = document.getElementById('toast-container');
    if (!container) return;
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

function obterDataHoraAtual() {
    const now = new Date();
    return now.toLocaleString('pt-BR');
}

function obterDataHojeISO() {
    return new Date().toISOString().split('T')[0];
}

// --- Funções de Carregamento e Salvamento de Dados ---
function carregarDados() {
    produtos = JSON.parse(localStorage.getItem('produtos')) || [];
    historicoMovimentacoes = JSON.parse(localStorage.getItem('historicoMovimentacoes')) || [];
    fornecedores = JSON.parse(localStorage.getItem('fornecedores')) || [];
    requisicoesCompra = JSON.parse(localStorage.getItem('requisicoesCompra')) || [];
    historicoInventario = JSON.parse(localStorage.getItem('historicoInventario')) || [];
}

function salvarDados() {
    localStorage.setItem('produtos', JSON.stringify(produtos));
    localStorage.setItem('historicoMovimentacoes', JSON.stringify(historicoMovimentacoes));
    localStorage.setItem('fornecedores', JSON.stringify(fornecedores));
    localStorage.setItem('requisicoesCompra', JSON.stringify(requisicoesCompra));
    localStorage.setItem('historicoInventario', JSON.stringify(historicoInventario));
}

// --- Funções de Navegação por Abas ---
function mostrarSecao(secaoId) {
    secoes.forEach(secao => {
        if (secao.id === secaoId) {
            secao.classList.add('secao-ativa');
            secao.classList.remove('secao-oculta');
        } else {
            secao.classList.add('secao-oculta');
            secao.classList.remove('secao-ativa');
        }
    });

    abasBtns.forEach(btn => {
        if (btn.dataset.target === secaoId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Ações específicas ao mostrar uma seção
    if (secaoId === 'controle') {
        renderizarTabela(buscaInput.value);
        verificarEstoqueBaixo();
    } else if (secaoId === 'fornecedores') {
        renderizarFornecedores();
    } else if (secaoId === 'inventario') {
        popularSelectProdutosInventario();
        renderizarHistoricoInventario();
    } else if (secaoId === 'requisicoes') {
        renderizarHistoricoRequisicoes();
        // Não renderiza uma requisição por padrão, espera o botão 'Gerar Requisição'
        areaRequisicaoDiv.style.display = 'none';
        imprimirRequisicaoBtn.style.display = 'none';
    } else if (secaoId === 'historico') {
        renderizarHistoricoMovimentacoes();
    }
}

// --- Funções de Produto ---
formCadastro.addEventListener('submit', function (e) {
    e.preventDefault();

    const id = produtoIdInput.value;
    const nome = nomeInput.value.trim();
    const categoria = categoriaInput.value.trim();
    const quantidade = parseInt(quantidadeInput.value);
    const valor = parseFloat(valorInput.value);
    const nivelMinimo = parseInt(nivelMinimoInput.value);
    const fornecedorId = fornecedorProdutoSelect.value;
    const observacoes = observacoesProdutoInput.value.trim();

    if (!nome || !categoria || isNaN(quantidade) || quantidade < 0 || isNaN(valor) || valor < 0 || isNaN(nivelMinimo) || nivelMinimo < 0) {
        exibirToast('Por favor, preencha todos os campos corretamente.', 'erro');
        return;
    }

    if (id) {
        // Edição de produto
        const index = produtos.findIndex(p => p.id === id);
        if (index !== -1) {
            produtos[index] = { id, nome, categoria, quantidade, valor, nivelMinimo, fornecedorId, observacoes };
            exibirToast('Produto atualizado com sucesso!', 'sucesso');
        }
    } else {
        // Novo produto
        const novoProduto = {
            id: gerarIdUnico(),
            nome,
            categoria,
            quantidade,
            valor,
            nivelMinimo,
            fornecedorId,
            observacoes,
            dataCadastro: obterDataHojeISO(),
        };
        produtos.push(novoProduto);
        exibirToast('Produto cadastrado com sucesso!', 'sucesso');
    }

    salvarDados();
    formCadastro.reset();
    produtoIdInput.value = '';
    btnCancelarEdicaoProduto.style.display = 'none';
    formCadastro.querySelector('button[type="submit"]').textContent = 'Cadastrar Produto';

    renderizarTabela();
    verificarEstoqueBaixo(); // Recalcula e exibe alertas de estoque baixo
    popularSelectFornecedores(); // Recarrega o select de fornecedores para o produto
    popularSelectProdutosInventario(); // Recarrega o select de produtos para o inventário
});

btnCancelarEdicaoProduto.addEventListener('click', () => {
    formCadastro.reset();
    produtoIdInput.value = '';
    btnCancelarEdicaoProduto.style.display = 'none';
    formCadastro.querySelector('button[type="submit"]').textContent = 'Cadastrar Produto';
    produtoEditandoId = null;
    exibirToast('Edição de produto cancelada.', 'aviso');
});

function renderizarTabela(filtro = '') {
    tabelaEstoqueBody.innerHTML = '';
    const produtosFiltrados = produtos.filter(produto =>
        produto.nome.toLowerCase().includes(filtro.toLowerCase()) ||
        produto.categoria.toLowerCase().includes(filtro.toLowerCase())
    ).sort((a, b) => a.nome.localeCompare(b.nome)); // Ordena por nome

    if (produtosFiltrados.length === 0) {
        tabelaEstoqueBody.innerHTML = '<tr><td colspan="7">Nenhum produto encontrado.</td></tr>';
        return;
    }

    produtosFiltrados.forEach(produto => {
        const row = tabelaEstoqueBody.insertRow();
        const isEstoqueBaixo = produto.quantidade <= produto.nivelMinimo;
        if (isEstoqueBaixo) {
            row.classList.add('estoque-baixo');
        }

        const fornecedor = fornecedores.find(f => f.id === produto.fornecedorId);
        const nomeFornecedor = fornecedor ? fornecedor.nome : 'N/A';

        row.innerHTML = `
            <td>${produto.nome}</td>
            <td>${produto.categoria}</td>
            <td>${produto.quantidade} ${isEstoqueBaixo ? '(BAIXO!)' : ''}</td>
            <td>${produto.nivelMinimo}</td>
            <td>${formatarValor(produto.valor)}</td>
            <td>${nomeFornecedor}</td>
            <td class="acoes">
                <button onclick="editarProduto('${produto.id}')" class="btn-acao editar-btn">Editar</button>
                <button onclick="excluirProduto('${produto.id}')" class="btn-acao apagar-btn">Excluir</button>
                <button onclick="abrirModal('${produto.id}', '${produto.nome}', ${produto.quantidade})" class="btn-acao movimentar-btn">Movimentar</button>
            </td>
        `;
    });
    verificarEstoqueBaixo(); // Atualiza a seção de alertas após renderizar a tabela
}

function editarProduto(id) {
    const produto = produtos.find(p => p.id === id);
    if (produto) {
        produtoEditandoId = produto.id;
        produtoIdInput.value = produto.id;
        nomeInput.value = produto.nome;
        categoriaInput.value = produto.categoria;
        quantidadeInput.value = produto.quantidade;
        valorInput.value = produto.valor;
        nivelMinimoInput.value = produto.nivelMinimo;
        fornecedorProdutoSelect.value = produto.fornecedorId || '';
        observacoesProdutoInput.value = produto.observacoes || '';

        formCadastro.querySelector('button[type="submit"]').textContent = 'Atualizar Produto';
        btnCancelarEdicaoProduto.style.display = 'inline-block';
        exibirToast('Editando produto. Altere os campos e clique em "Atualizar Produto".', 'info');
        nomeInput.focus();
        mostrarSecao('cadastro'); // Garante que a seção de cadastro esteja visível
    } else {
        exibirToast('Produto não encontrado para edição.', 'erro');
    }
}

function excluirProduto(id) {
    const produto = produtos.find(p => p.id === id);
    if (produto && confirm(`Tem certeza que deseja excluir o produto "${produto.nome}"? Esta ação não pode ser desfeita.`)) {
        produtos = produtos.filter(p => p.id !== id);
        salvarDados();
        renderizarTabela(buscaInput.value);
        verificarEstoqueBaixo();
        exibirToast('Produto excluído com sucesso!', 'sucesso');
    }
}

buscaInput.addEventListener('input', e => {
    renderizarTabela(e.target.value);
});

// --- Funções de Alertas de Estoque Baixo ---
function verificarEstoqueBaixo() {
    alertasEstoqueBaixoDiv.innerHTML = '';
    const produtosBaixoEstoque = produtos.filter(p => p.quantidade <= p.nivelMinimo && p.quantidade > 0);
    const produtosZerados = produtos.filter(p => p.quantidade === 0);

    if (produtosBaixoEstoque.length > 0) {
        let html = '<h4>⚠️ Alertas de Estoque Baixo:</h4><ul>';
        produtosBaixoEstoque.forEach(p => {
            html += `<li><strong>${p.nome}</strong>: ${p.quantidade} em estoque (mínimo: ${p.nivelMinimo}).</li>`;
        });
        html += '</ul><p><button class="btn btn-secundario-outline" onclick="mostrarSecao(\'requisicoes\'); document.getElementById(\'gerarRequisicaoEstoqueBaixo\').click();">Gerar Requisição para Itens Baixos</button></p>';
        alertasEstoqueBaixoDiv.innerHTML += html;
        alertasEstoqueBaixoDiv.style.display = 'block';
    }

    if (produtosZerados.length > 0) {
        let html = '<h4>⛔ Itens Fora de Estoque:</h4><ul>';
        produtosZerados.forEach(p => {
            html += `<li><strong>${p.nome}</strong>: 0 em estoque.</li>`;
        });
        html += '</ul><p><button class="btn btn-secundario-outline" onclick="mostrarSecao(\'requisicoes\'); document.getElementById(\'gerarRequisicaoEstoqueBaixo\').click();">Gerar Requisição para Itens Zerados</button></p>';
        alertasEstoqueBaixoDiv.innerHTML += html;
        alertasEstoqueBaixoDiv.style.display = 'block';
    }

    if (produtosBaixoEstoque.length === 0 && produtosZerados.length === 0) {
        alertasEstoqueBaixoDiv.style.display = 'none';
        alertasEstoqueBaixoDiv.innerHTML = '';
    }
}

// --- Funções de Fornecedor ---
function getNomeFornecedor(id) {
    const fornecedor = fornecedores.find(f => f.id === id);
    return fornecedor ? fornecedor.nome : 'Fornecedor Desconhecido';
}

function popularSelectFornecedores() {
    fornecedorProdutoSelect.innerHTML = '<option value="">Selecione o Fornecedor (Opcional)</option>';
    fornecedores.forEach(forn => {
        const option = document.createElement('option');
        option.value = forn.id;
        option.textContent = forn.nome;
        fornecedorProdutoSelect.appendChild(option);
    });
}

formFornecedor.addEventListener('submit', function (e) {
    e.preventDefault();

    const id = fornecedorIdInput.value;
    const nome = nomeFornecedorInput.value.trim();
    const contato = contatoFornecedorInput.value.trim();
    const telefone = telefoneFornecedorInput.value.trim();
    const email = emailFornecedorInput.value.trim();

    if (!nome) {
        exibirToast('O nome do fornecedor é obrigatório.', 'erro');
        return;
    }

    if (id) {
        // Edição
        const index = fornecedores.findIndex(f => f.id === id);
        if (index !== -1) {
            fornecedores[index] = { id, nome, contato, telefone, email };
            exibirToast('Fornecedor atualizado com sucesso!', 'sucesso');
        }
    } else {
        // Novo
        const novoFornecedor = { id: gerarIdUnico(), nome, contato, telefone, email };
        fornecedores.push(novoFornecedor);
        exibirToast('Fornecedor cadastrado com sucesso!', 'sucesso');
    }

    salvarDados();
    formFornecedor.reset();
    fornecedorIdInput.value = '';
    btnCancelarEdicaoFornecedor.style.display = 'none';
    formFornecedor.querySelector('button[type="submit"]').textContent = 'Cadastrar Fornecedor';

    renderizarFornecedores();
    popularSelectFornecedores();
});

btnCancelarEdicaoFornecedor.addEventListener('click', () => {
    formFornecedor.reset();
    fornecedorIdInput.value = '';
    btnCancelarEdicaoFornecedor.style.display = 'none';
    formFornecedor.querySelector('button[type="submit"]').textContent = 'Cadastrar Fornecedor';
    fornecedorEditandoId = null;
    exibirToast('Edição de fornecedor cancelada.', 'aviso');
});

function renderizarFornecedores() {
    tabelaFornecedoresBody.innerHTML = '';
    if (fornecedores.length === 0) {
        tabelaFornecedoresBody.innerHTML = '<tr><td colspan="5">Nenhum fornecedor cadastrado.</td></tr>';
        return;
    }

    fornecedores.forEach(forn => {
        const row = tabelaFornecedoresBody.insertRow();
        row.innerHTML = `
            <td>${forn.nome}</td>
            <td>${forn.contato || 'N/A'}</td>
            <td>${forn.telefone || 'N/A'}</td>
            <td>${forn.email || 'N/A'}</td>
            <td class="acoes">
                <button onclick="editarFornecedor('${forn.id}')" class="btn-acao editar-btn">Editar</button>
                <button onclick="excluirFornecedor('${forn.id}')" class="btn-acao apagar-btn">Excluir</button>
            </td>
        `;
    });
}

function editarFornecedor(id) {
    const forn = fornecedores.find(f => f.id === id);
    if (forn) {
        fornecedorEditandoId = forn.id;
        fornecedorIdInput.value = forn.id;
        nomeFornecedorInput.value = forn.nome;
        contatoFornecedorInput.value = forn.contato;
        telefoneFornecedorInput.value = forn.telefone;
        emailFornecedorInput.value = forn.email;

        formFornecedor.querySelector('button[type="submit"]').textContent = 'Atualizar Fornecedor';
        btnCancelarEdicaoFornecedor.style.display = 'inline-block';
        exibirToast('Editando fornecedor. Altere os campos e clique em "Atualizar Fornecedor".', 'info');
        nomeFornecedorInput.focus();
        mostrarSecao('fornecedores'); // Garante que a seção esteja visível
    } else {
        exibirToast('Fornecedor não encontrado para edição.', 'erro');
    }
}

function excluirFornecedor(id) {
    const forn = fornecedores.find(f => f.id === id);
    if (forn && confirm(`Tem certeza que deseja excluir o fornecedor "${forn.nome}"? Isso removerá o vínculo com produtos.`)) {
        fornecedores = fornecedores.filter(f => f.id !== id);
        // Desvincula o fornecedor dos produtos
        produtos.forEach(p => {
            if (p.fornecedorId === id) {
                p.fornecedorId = ''; // Define como vazio ou null
            }
        });
        salvarDados();
        renderizarFornecedores();
        popularSelectFornecedores();
        renderizarTabela(buscaInput.value); // Atualiza a tabela de produtos
        exibirToast('Fornecedor excluído com sucesso!', 'sucesso');
    }
}

// --- Funções de Inventário / Contagem ---
function popularSelectProdutosInventario() {
    produtoInventarioSelect.innerHTML = '<option value="">Selecione o Produto</option>';
    produtos.forEach(p => {
        const option = document.createElement('option');
        option.value = p.id;
        option.textContent = `${p.nome} (Estoque atual: ${p.quantidade})`;
        produtoInventarioSelect.appendChild(option);
    });
}

formInventario.addEventListener('submit', function (e) {
    e.preventDefault();

    const produtoId = produtoInventarioSelect.value;
    const quantidadeContada = parseInt(quantidadeContadaInput.value);
    const observacoes = observacoesInventarioInput.value.trim();

    if (!produtoId || isNaN(quantidadeContada) || quantidadeContada < 0) {
        exibirToast('Selecione um produto e insira uma quantidade contada válida.', 'erro');
        return;
    }

    const produto = produtos.find(p => p.id === produtoId);
    if (produto) {
        const quantidadeSistema = produto.quantidade;
        const diferenca = quantidadeContada - quantidadeSistema;

        // Atualiza a quantidade do produto
        produto.quantidade = quantidadeContada;

        // Registra no histórico de inventário
        historicoInventario.push({
            id: gerarIdUnico(),
            data: obterDataHoraAtual(),
            produtoId: produto.id,
            nomeProduto: produto.nome,
            quantidadeSistema,
            quantidadeContada,
            diferenca,
            observacoes,
        });

        salvarDados();
        exibirToast(`Contagem de inventário para "${produto.nome}" registrada. Diferença: ${diferenca}.`, 'sucesso');
        formInventario.reset();
        popularSelectProdutosInventario(); // Atualiza o select para refletir a nova quantidade
        renderizarHistoricoInventario();
        renderizarTabela(buscaInput.value); // Atualiza a tabela de produtos
        verificarEstoqueBaixo(); // Verifica se o ajuste afetou o status de estoque baixo
    } else {
        exibirToast('Produto não encontrado para contagem.', 'erro');
    }
});

function renderizarHistoricoInventario() {
    tabelaHistoricoInventarioBody.innerHTML = '';
    if (historicoInventario.length === 0) {
        tabelaHistoricoInventarioBody.innerHTML = '<tr><td colspan="6">Nenhuma contagem de inventário registrada.</td></tr>';
        return;
    }

    historicoInventario.sort((a, b) => new Date(b.data) - new Date(a.data)); // Mais recentes primeiro

    historicoInventario.forEach(registro => {
        const row = tabelaHistoricoInventarioBody.insertRow();
        const diferencaClass = registro.diferenca === 0 ? '' : (registro.diferenca > 0 ? 'diferenca-positiva' : 'diferenca-negativa');
        row.innerHTML = `
            <td>${registro.data}</td>
            <td>${registro.nomeProduto}</td>
            <td>${registro.quantidadeSistema}</td>
            <td>${registro.quantidadeContada}</td>
            <td class="${diferencaClass}">${registro.diferenca}</td>
            <td>${registro.observacoes || 'N/A'}</td>
        `;
    });
}

// --- Funções de Requisições de Compra ---
gerarRequisicaoEstoqueBaixoBtn.addEventListener('click', () => {
    const itensRequisicao = produtos.filter(p => p.quantidade <= p.nivelMinimo);

    if (itensRequisicao.length === 0) {
        exibirToast('Nenhum item com estoque baixo para gerar requisição.', 'aviso');
        areaRequisicaoDiv.style.display = 'none';
        imprimirRequisicaoBtn.style.display = 'none';
        return;
    }

    const novaRequisicao = {
        id: gerarIdUnico(),
        data: obterDataHoraAtual(),
        status: 'Pendente',
        itens: itensRequisicao.map(p => ({
            produtoId: p.id,
            nomeProduto: p.nome,
            fornecedorId: p.fornecedorId,
            quantidadeAtual: p.quantidade,
            quantidadeMinima: p.nivelMinimo,
            quantidadeSugerida: Math.max(p.nivelMinimo * 2, p.nivelMinimo + 5) // Sugere o dobro do mínimo ou mínimo + 5
        }))
    };

    requisicoesCompra.push(novaRequisicao);
    salvarDados();
    renderizarRequisicao(novaRequisicao);
    renderizarHistoricoRequisicoes();
    exibirToast('Requisição de compra gerada com sucesso!', 'sucesso');
});

function renderizarRequisicao(requisicao) {
    dataRequisicaoSpan.textContent = requisicao.data;
    tabelaItensRequisicaoBody.innerHTML = '';

    requisicao.itens.forEach(item => {
        const row = tabelaItensRequisicaoBody.insertRow();
        const fornecedorNome = getNomeFornecedor(item.fornecedorId);
        row.innerHTML = `
            <td>${item.nomeProduto}</td>
            <td>${fornecedorNome}</td>
            <td>${item.quantidadeAtual}</td>
            <td>${item.quantidadeMinima}</td>
            <td>${item.quantidadeSugerida}</td>
        `;
    });

    areaRequisicaoDiv.style.display = 'block';
    imprimirRequisicaoBtn.style.display = 'inline-block';
}

imprimirRequisicaoBtn.addEventListener('click', () => {
    const printContent = areaRequisicaoDiv.outerHTML;
    const originalBody = document.body.innerHTML;
    document.body.innerHTML = printContent;
    window.print();
    document.body.innerHTML = originalBody; // Restaura o corpo original
    exibirToast('Requisição enviada para impressão.', 'info');
});

function renderizarHistoricoRequisicoes() {
    tabelaHistoricoRequisicoesBody.innerHTML = '';
    if (requisicoesCompra.length === 0) {
        tabelaHistoricoRequisicoesBody.innerHTML = '<tr><td colspan="4">Nenhuma requisição de compra registrada.</td></tr>';
        return;
    }

    requisicoesCompra.sort((a, b) => new Date(b.data) - new Date(a.data)); // Mais recentes primeiro

    requisicoesCompra.forEach(req => {
        const row = tabelaHistoricoRequisicoesBody.insertRow();
        row.innerHTML = `
            <td>${req.data}</td>
            <td>${req.itens.length}</td>
            <td>${req.status}</td>
            <td class="acoes">
                <button onclick="renderizarRequisicao(requisicoesCompra.find(r => r.id === '${req.id}'))" class="btn-acao ver-btn">Ver</button>
                <button onclick="excluirRequisicao('${req.id}')" class="btn-acao apagar-btn">Excluir</button>
            </td>
        `;
    });
}

function excluirRequisicao(id) {
    if (confirm('Tem certeza que deseja excluir esta requisição de compra?')) {
        requisicoesCompra = requisicoesCompra.filter(req => req.id !== id);
        salvarDados();
        renderizarHistoricoRequisicoes();
        exibirToast('Requisição excluída com sucesso!', 'sucesso');
    }
}


// --- Funções de Histórico de Movimentações (Melhoradas) ---
function adicionarMovimentacao(tipo, produtoId, quantidade, observacoes) {
    const produto = produtos.find(p => p.id === produtoId);
    if (produto) {
        historicoMovimentacoes.push({
            id: gerarIdUnico(),
            data: obterDataHoraAtual(),
            tipo,
            produtoId: produto.id,
            nomeProduto: produto.nome,
            quantidadeMovimentada: quantidade,
            quantidadeAtualizada: produto.quantidade,
            observacoes,
        });
        salvarDados();
        renderizarHistoricoMovimentacoes();
    }
}

function renderizarHistoricoMovimentacoes() {
    listaHistoricoUl.innerHTML = '';
    if (historicoMovimentacoes.length === 0) {
        listaHistoricoUl.innerHTML = '<p>Nenhuma movimentação registrada.</p>';
        return;
    }

    historicoMovimentacoes.sort((a, b) => new Date(b.data) - new Date(a.data)); // Mais recentes primeiro

    historicoMovimentacoes.forEach(mov => {
        const li = document.createElement('li');
        let tipoClass = '';
        if (mov.tipo === 'entrada' || mov.tipo === 'devolucao') {
            tipoClass = 'mov-entrada';
        } else if (mov.tipo === 'saida') {
            tipoClass = 'mov-saida';
        }

        li.classList.add(tipoClass);
        li.innerHTML = `
            <strong>${mov.data}</strong> -
            <span class="tipo-movimentacao">[${mov.tipo.toUpperCase()}]</span>
            <strong>${mov.nomeProduto}</strong>:
            ${mov.quantidadeMovimentada} unidades. Estoque atual: ${mov.quantidadeAtualizada}.
            ${mov.observacoes ? `<br><small>Obs: ${mov.observacoes}</small>` : ''}
        `;
        listaHistoricoUl.appendChild(li);
    });
}

// --- Funções do Modal de Movimentação (Atualizadas) ---
function abrirModal(produtoId, nomeProduto, quantidadeAtual) {
    produtoSelecionadoMovimentacaoId = produtoId;
    modalTitulo.textContent = 'Movimentar Estoque';
    modalProduto.textContent = `Produto: ${nomeProduto} (Estoque Atual: ${quantidadeAtual})`;
    quantidadeMovimentacaoInput.value = '';
    observacoesMovimentacaoInput.value = '';
    tipoMovimentacaoSelect.value = 'entrada'; // Reseta para entrada
    modal.style.display = 'flex';
}

function fecharModal() {
    modal.style.display = 'none';
    produtoSelecionadoMovimentacaoId = null;
}

btnConfirmarMovimentacao.addEventListener('click', () => {
    const produtoId = produtoSelecionadoMovimentacaoId;
    const tipo = tipoMovimentacaoSelect.value;
    const quantidade = parseInt(quantidadeMovimentacaoInput.value);
    const observacoes = observacoesMovimentacaoInput.value.trim();

    if (!produtoId || isNaN(quantidade) || quantidade <= 0) {
        exibirToast('Por favor, insira uma quantidade válida para a movimentação.', 'erro');
        return;
    }

    const produtoIndex = produtos.findIndex(p => p.id === produtoId);
    if (produtoIndex === -1) {
        exibirToast('Erro: Produto não encontrado.', 'erro');
        return;
    }

    const produto = produtos[produtoIndex];
    let novaQuantidade = produto.quantidade;

    if (tipo === 'entrada' || tipo === 'devolucao') {
        novaQuantidade += quantidade;
    } else if (tipo === 'saida') {
        if (novaQuantidade < quantidade) {
            exibirToast('Erro: Quantidade de saída maior que o estoque atual.', 'erro');
            return;
        }
        novaQuantidade -= quantidade;
    }

    produtos[produtoIndex].quantidade = novaQuantidade;
    salvarDados();
    adicionarMovimentacao(tipo, produtoId, quantidade, observacoes); // Adiciona ao histórico de movimentações
    renderizarTabela(buscaInput.value);
    verificarEstoqueBaixo();
    popularSelectProdutosInventario(); // Atualiza o select de inventário também
    fecharModal();
    exibirToast('Movimentação realizada com sucesso!', 'sucesso');
});

// Fecha o modal ao clicar fora dele
window.addEventListener('click', (event) => {
    if (event.target === modal) {
        fecharModal();
    }
});


// --- Inicialização ---
document.addEventListener('DOMContentLoaded', () => {
    carregarDados();

    // Configura os botões das abas
    abasBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            mostrarSecao(btn.dataset.target);
        });
    });

    // Popula selects e renderiza tabelas iniciais
    popularSelectFornecedores();
    popularSelectProdutosInventario();

    // Exibe a seção de "Controle de Estoque" como padrão ao carregar
    mostrarSecao('controle'); // Ou 'cadastro' se preferir começar por lá
});