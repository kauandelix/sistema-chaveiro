// --- Funções básicas para carregar e salvar ---
function carregarClientes() {
    const clientes = localStorage.getItem('clientes');
    return clientes ? JSON.parse(clientes) : [];
}

function salvarClientes(clientes) {
    localStorage.setItem('clientes', JSON.stringify(clientes));
}

// --- Toast animado ---
function exibirToast(mensagem, tipo = 'sucesso') {
    const container = document.getElementById('toast-container');
    if (!container) {
        // Se o contêiner não existir, cria-o dinamicamente
        const div = document.createElement('div');
        div.id = 'toast-container';
        document.body.appendChild(div);
        // Tenta pegar novamente
        return exibirToast(mensagem, tipo);
    }
    const toast = document.createElement('div');
    toast.classList.add('toast', tipo);
    toast.textContent = mensagem;
    container.appendChild(toast);

    // Remove toast após 4 segundos (tempo da animação no CSS)
    setTimeout(() => {
        toast.remove();
    }, 4000);
}

// --- Validações ---
function validarCPF(cpf) {
    // Remove tudo que não for dígito e verifica se tem 11 dígitos
    const cleanCpf = cpf.replace(/\D/g, '');
    if (!/^\d{11}$/.test(cleanCpf)) {
        return false;
    }
    // Implementação básica de validação de CPF (não aprofunda todos os dígitos verificadores)
    return true;
}

function validarTelefone(telefone) {
    // Aceita formatos como (xx)xxxx-xxxx, (xx)xxxxx-xxxx, xxxxx-xxxx etc.
    // Garante pelo menos 8 dígitos para o número base
    return /^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/.test(telefone);
}

function validarEmail(email) {
    // Validação básica de email
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// --- Variável global para controle de edição ---
let clienteEditandoIndex = null;
let clienteEditandoCpf = null; // NOVO: para identificar o cliente pelo CPF na edição

// --- Função para renderizar resultados da busca ---
function renderizarResultados(clientesFiltrados) {
    const resultadoDiv = document.getElementById('resultadoBusca');

    if (clientesFiltrados.length === 0) {
        resultadoDiv.innerHTML = '<p>Nenhum cliente encontrado.</p>';
        return;
    }

    resultadoDiv.innerHTML = `
        <ul class="lista-clientes">
            ${clientesFiltrados
                .map(c => `
                    <li>
                        <a href="perfil.html?cpf=${c.cpf}" class="link-cliente">${c.nome}</a>
                        <div class="botoes-card-cliente">
                            <button onclick="prepararEdicao('${c.cpf}')" class="btn btn-secundario-outline">Editar</button>
                            <button onclick="removerCliente('${c.cpf}')" class="btn btn-danger-outline">Remover</button>
                        </div>
                    </li>
                `)
                .join('')}
        </ul>
    `;
}

// Função para remover cliente
function removerCliente(cpf) {
    if (confirm('Tem certeza que deseja remover este cliente?')) {
        let clientes = carregarClientes();
        clientes = clientes.filter(c => c.cpf !== cpf);
        salvarClientes(clientes);
        atualizarListaBusca(); // Atualiza a lista após remoção
        exibirToast('Cliente removido com sucesso!', 'sucesso');
    }
}


// NOVO: Função para preparar o formulário para edição
function prepararEdicao(cpf) {
    const clientes = carregarClientes();
    const clienteParaEditar = clientes.find((c, index) => {
        if (c.cpf === cpf) {
            clienteEditandoIndex = index; // Guarda o índice para edição
            clienteEditandoCpf = cpf; // Guarda o CPF do cliente que está sendo editado
            return true;
        }
        return false;
    });

    if (clienteParaEditar) {
        document.getElementById('nome').value = clienteParaEditar.nome;
        document.getElementById('cpf').value = clienteParaEditar.cpf;
        document.getElementById('email').value = clienteParaEditar.email;
        document.getElementById('telefone').value = clienteParaEditar.telefone;
        document.getElementById('endereco').value = clienteParaEditar.endereco;
        document.getElementById('observacoes').value = clienteParaEditar.observacoes || '';

        // NOVO: Carrega campos personalizados para edição
        const camposPersonalizadosContainer = document.getElementById('camposPersonalizadosContainer');
        camposPersonalizadosContainer.innerHTML = ''; // Limpa campos existentes
        if (clienteParaEditar.camposPersonalizados) {
            for (const key in clienteParaEditar.camposPersonalizados) {
                adicionarCampoPersonalizado(key, clienteParaEditar.camposPersonalizados[key]);
            }
        }

        document.getElementById('cpf').readOnly = true; // Impede a edição do CPF em modo de edição
        document.querySelector('#clienteForm button[type="submit"]').textContent = 'Atualizar Cliente';
        document.getElementById('btnCancelarEdicao').style.display = 'inline-block';
        exibirToast('Editando cliente. Altere os campos e clique em "Atualizar Cliente".', 'sucesso');
    } else {
        exibirToast('Cliente para edição não encontrado.', 'erro');
    }
}

// --- Atualiza a lista de clientes visível na busca ---
function atualizarListaBusca() {
    const busca = document.getElementById('campoBusca').value.toLowerCase().trim();
    const clientes = carregarClientes();

    if (busca === '') {
        renderizarResultados(clientes); // Se busca vazia, mostra todos os clientes
        return;
    }

    const resultados = clientes.filter(
        (c) =>
            c.nome.toLowerCase().includes(busca) ||
            c.telefone.toLowerCase().includes(busca) ||
            c.cpf.toLowerCase().includes(busca) ||
            c.email.toLowerCase().includes(busca) ||
            c.endereco.toLowerCase().includes(busca) ||
            (c.observacoes && c.observacoes.toLowerCase().includes(busca)) ||
            // NOVO: Busca também em campos personalizados
            (c.camposPersonalizados && Object.values(c.camposPersonalizados).some(val => String(val).toLowerCase().includes(busca)))
    );

    renderizarResultados(resultados);
}

// NOVO: Adiciona um novo campo personalizado dinamicamente
function adicionarCampoPersonalizado(chave = '', valor = '') {
    const container = document.getElementById('camposPersonalizadosContainer');
    const div = document.createElement('div');
    div.classList.add('campo-personalizado-item');

    div.innerHTML = `
        <input type="text" class="input-campo campo-personalizado-chave" placeholder="Nome do Campo" value="${chave}" required>
        <input type="text" class="input-campo campo-personalizado-valor" placeholder="Valor do Campo" value="${valor}" required>
        <button type="button" class="btn btn-danger-outline btn-remover-campo">X</button>
    `;

    container.appendChild(div);

    div.querySelector('.btn-remover-campo').addEventListener('click', () => {
        div.remove();
    });
}

// --- Event listener para o formulário de cadastro/edição ---
document.getElementById('clienteForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const nome = document.getElementById('nome').value.trim();
    const cpf = document.getElementById('cpf').value.trim();
    const email = document.getElementById('email').value.trim();
    const telefone = document.getElementById('telefone').value.trim();
    const endereco = document.getElementById('endereco').value.trim();
    const observacoes = document.getElementById('observacoes').value.trim();

    // Validações
    if (!validarCPF(cpf)) {
        exibirToast('CPF inválido. Deve conter 11 dígitos numéricos.', 'erro');
        return;
    }

    if (!validarTelefone(telefone)) {
        exibirToast('Telefone inválido. Use formato (xx)xxxxx-xxxx.', 'erro');
        return;
    }

    if (!validarEmail(email)) {
        exibirToast('Email inválido.', 'erro');
        return;
    }

    let clientes = carregarClientes();

    // Checa duplicidade de CPF ou Telefone, ignorando o próprio cliente que está sendo editado
    const duplicado = clientes.some(
        (c) => (c.cpf === cpf || c.telefone === telefone) && c.cpf !== clienteEditandoCpf
    );

    if (duplicado) {
        exibirToast('Cliente com esse telefone ou CPF já está cadastrado.', 'erro');
        return;
    }

    // NOVO: Coleta campos personalizados
    const camposPersonalizados = {};
    const camposItens = document.querySelectorAll('.campo-personalizado-item');
    let camposPersonalizadosValidos = true;
    camposItens.forEach(item => {
        const chaveInput = item.querySelector('.campo-personalizado-chave');
        const valorInput = item.querySelector('.campo-personalizado-valor');
        const chave = chaveInput.value.trim();
        const valor = valorInput.value.trim();

        if (chave && valor) {
            camposPersonalizados[chave] = valor;
        } else {
            camposPersonalizadosValidos = false;
            exibirToast('Campos personalizados não podem ter chave ou valor vazios.', 'erro');
            return;
        }
    });

    if (!camposPersonalizadosValidos) return;

    if (clienteEditandoIndex !== null) {
        // --- Lógica de EDIÇÃO ---
        clientes = carregarClientes(); // Recarrega clientes para ter certeza que está atualizado

        if (clientes[clienteEditandoIndex] && clientes[clienteEditandoIndex].cpf === clienteEditandoCpf) {
            clientes[clienteEditandoIndex] = {
                ...clientes[clienteEditandoIndex],
                nome,
                cpf, // O CPF não é editável no formulário, então será o mesmo
                email,
                telefone,
                endereco,
                observacoes,
                camposPersonalizados: camposPersonalizados // NOVO: Salva campos personalizados
            };
            salvarClientes(clientes);
            exibirToast('Cliente atualizado com sucesso!', 'sucesso');
        } else {
            exibirToast('Erro ao atualizar: Cliente não encontrado para edição.', 'erro');
        }
    } else {
        // --- Lógica de NOVO CADASTRO ---
        clientes.push({
            nome,
            cpf,
            email,
            telefone,
            endereco,
            observacoes,
            data: new Date().toLocaleString(), // Data e hora do cadastro
            camposPersonalizados: camposPersonalizados // NOVO: Salva campos personalizados
        });
        salvarClientes(clientes);
        exibirToast('Cliente cadastrado com sucesso!', 'sucesso');
    }

    this.reset(); // Limpa o formulário
    document.getElementById('cpf').readOnly = false; // Habilita o campo CPF novamente
    document.getElementById('btnCancelarEdicao').style.display = 'none';
    document.querySelector('#clienteForm button[type="submit"]').textContent = 'Cadastrar';
    clienteEditandoIndex = null;
    clienteEditandoCpf = null;
    document.getElementById('camposPersonalizadosContainer').innerHTML = ''; // Limpa campos personalizados do formulário
    atualizarListaBusca(); // Atualiza a lista de clientes exibida
});

// Botão Cancelar Edição
document.getElementById('btnCancelarEdicao').addEventListener('click', function () {
    document.getElementById('clienteForm').reset();
    document.getElementById('cpf').readOnly = false;
    document.querySelector('#clienteForm button[type="submit"]').textContent = 'Cadastrar';
    this.style.display = 'none';
    clienteEditandoIndex = null;
    clienteEditandoCpf = null;
    document.getElementById('camposPersonalizadosContainer').innerHTML = ''; // Limpa campos personalizados do formulário
    atualizarListaBusca();
});


// --- Lógica para PREENCHER O FORMULÁRIO em modo de EDIÇÃO (ao carregar a página com CPF na URL) ---
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const editCpf = urlParams.get('editCpf'); // Pega o valor do parâmetro 'editCpf' da URL

    if (editCpf) {
        prepararEdicao(editCpf);
        // Limpa o parâmetro 'editCpf' da URL para evitar recarregar em modo de edição
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    atualizarListaBusca();
});

// --- Event listener para o campo de busca (filtra a lista em tempo real) ---
document.getElementById('campoBusca').addEventListener('input', atualizarListaBusca);

// --- Exportar Clientes para CSV ---
document.getElementById('btnExportarCSV').addEventListener('click', () => {
    const clientes = carregarClientes();
    if (clientes.length === 0) {
        exibirToast('Nenhum cliente para exportar.', 'erro');
        return;
    }

    const cabecalho = ['Nome', 'CPF', 'Email', 'Telefone', 'Endereço', 'Observações', 'Data de Cadastro'];
    // NOVO: Adiciona chaves dos campos personalizados ao cabeçalho
    const todasChavesPersonalizadas = new Set();
    clientes.forEach(c => {
        if (c.camposPersonalizados) {
            Object.keys(c.camposPersonalizados).forEach(key => todasChavesPersonalizadas.add(key));
        }
    });
    const chavesPersonalizadasArray = Array.from(todasChavesPersonalizadas);
    const cabecalhoCompleto = [...cabecalho, ...chavesPersonalizadasArray];

    const linhas = clientes.map((c) => {
        const dadosBase = [
            c.nome,
            c.cpf,
            c.email,
            c.telefone,
            c.endereco,
            c.observacoes ? c.observacoes.replace(/(\r\n|\n|\r)/gm, ' ') : '',
            c.data,
        ];
        // NOVO: Adiciona valores dos campos personalizados
        const dadosPersonalizados = chavesPersonalizadasArray.map(key =>
            c.camposPersonalizados && c.camposPersonalizados[key] ? String(c.camposPersonalizados[key]).replace(/(\r\n|\n|\r)/gm, ' ') : ''
        );
        return [...dadosBase, ...dadosPersonalizados]
            .map((item) => `"${String(item).replace(/"/g, '""')}"`)
            .join(',');
    });

    const csv = [cabecalhoCompleto.join(','), ...linhas].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'clientes.csv';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    exibirToast('Arquivo CSV gerado com sucesso!', 'sucesso');
});

// Event listener para o botão "Adicionar Campo Personalizado"
document.getElementById('btnAdicionarCampoPersonalizado').addEventListener('click', () => adicionarCampoPersonalizado());