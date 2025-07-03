// editar_produto.js

document.addEventListener('DOMContentLoaded', () => {
  const formEdicao = document.getElementById('formEdicao');
  const editNome = document.getElementById('editNome');
  const editCategoria = document.getElementById('editCategoria');
  const editObservacoes = document.getElementById('editObservacoes');
  const produtoIndexInput = document.getElementById('produtoIndex');

  let produtos = [];
  let produtoParaEditar = null; // O objeto do produto que estamos editando

  // Carregar todos os produtos do localStorage
  function carregarProdutos() {
    const produtosSalvos = localStorage.getItem('produtos');
    produtos = produtosSalvos ? JSON.parse(produtosSalvos) : [];
  }

  // Salvar os produtos atualizados no localStorage
  function salvarProdutos() {
    localStorage.setItem('produtos', JSON.stringify(produtos));
  }

  // Função para carregar os dados do produto na página de edição
  function popularFormularioEdicao() {
    carregarProdutos();
    const indexParaEditar = localStorage.getItem('produtoParaEditarIndex');

    if (indexParaEditar !== null && produtos[indexParaEditar]) {
      produtoParaEditar = produtos[indexParaEditar];
      produtoIndexInput.value = indexParaEditar; // Armazena o índice no campo oculto
      editNome.value = produtoParaEditar.nome;
      editCategoria.value = produtoParaEditar.categoria;
      editObservacoes.value = produtoParaEditar.observacoes;
    } else {
      alert('Produto não encontrado para edição.');
      window.location.href = 'estoque.html'; // Redireciona de volta
    }
  }

  // Adicionar listener para o envio do formulário de edição
  formEdicao.addEventListener('submit', (e) => {
    e.preventDefault();

    const index = produtoIndexInput.value;
    const novoNome = editNome.value.trim();
    const novaCategoria = editCategoria.value.trim();
    const novasObservacoes = editObservacoes.value.trim();

    if (!novoNome || !novaCategoria) {
      alert('Nome e Categoria são obrigatórios.');
      return;
    }

    // Verificar se o novo nome/categoria já existe em outro produto (excluindo o próprio)
    const produtoExistenteComMesmoNomeCat = produtos.find((p, i) =>
      i != index && // Não comparar com o próprio produto que está sendo editado
      p.nome.toLowerCase() === novoNome.toLowerCase() &&
      p.categoria.toLowerCase() === novaCategoria.toLowerCase()
    );

    if (produtoExistenteComMesmoNomeCat) {
      alert('Já existe outro produto com este nome e categoria.');
      return;
    }

    // Atualizar o produto na array
    if (produtos[index]) {
      produtos[index].nome = novoNome;
      produtos[index].categoria = novaCategoria;
      produtos[index].observacoes = novasObservacoes;
      salvarProdutos();
      alert('Produto atualizado com sucesso!');
      localStorage.removeItem('produtoParaEditarIndex'); // Limpa o item do localStorage
      window.location.href = 'estoque.html'; // Redireciona de volta para a página de estoque
    } else {
      alert('Erro ao atualizar produto: Índice inválido.');
    }
  });

  // Carregar os dados do produto quando a página for carregada
  popularFormularioEdicao();
});