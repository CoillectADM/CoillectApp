package com.coillect.service;

import java.time.LocalDate;
import java.util.List;
import java.util.regex.Pattern;
import java.util.Map;


import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;


import com.coillect.model.UsuarioDados;
import com.coillect.model.UsuarioEndereco;
import com.coillect.model.UsuarioTelefone;
import com.coillect.repository.UsuarioDadosRepository;
import com.coillect.repository.UsuarioEnderecoRepository;
import com.coillect.repository.UsuarioTelefoneRepository;

@Service
@Transactional
public class UsuarioService {

    @Autowired
    private UsuarioDadosRepository usuarioDadosRepo;

    @Autowired
    private UsuarioEnderecoRepository usuarioEnderecoRepo;

    @Autowired
    private UsuarioTelefoneRepository usuarioTelefoneRepo;

    private UsuarioDados dadosTemporarios;
    private UsuarioEndereco enderecoTemporario;
    private UsuarioTelefone telefoneTemporario;

    // Alterar Senha
    public boolean alterarSenha(String email, String senhaAtual, String novaSenha) {
        UsuarioDados usuario = usuarioDadosRepo.findByEmail(email);

        if (usuario == null) {
            return false; // Email não encontrado
        }

        if (!usuario.getSenha().equals(senhaAtual)) {
            return false; // Senha atual incorreta
        }

        // Atualizar a senha
        usuario.setSenha(novaSenha);
        usuario.setUltimaAtualizacao(LocalDate.now()); // Atualiza a data de modificação
        usuarioDadosRepo.save(usuario); // Salva no banco de dados
        return true;
    }

    // Validação de credenciais
    public UsuarioDados validarCredenciaisRetornarUsuario(String email, String senha) {
        try {
            UsuarioDados usuario = usuarioDadosRepo.findByEmail(email);
            if (usuario != null && usuario.getSenha().equals(senha)) {
                return usuario;
            }
            return null;
        } catch (Exception e) {
            System.err.println("Erro ao validar credenciais: " + e.getMessage());
            throw new RuntimeException("Erro ao validar credenciais.");
        }
    }

    // Buscar usuário por email
    public UsuarioDados buscarPorEmail(String email) {
        return usuarioDadosRepo.findByEmail(email);
    }

    // Verificar se o email já está cadastrado
    public boolean verificarEmail(String email) {
        return usuarioDadosRepo.existsByEmail(email);
    }

    // Verificar se o CPF já está cadastrado
    public boolean verificarCpf(String cpf) {
        return usuarioDadosRepo.existsByCpf(cpf);
    }

    // Verificar se o telefone já está cadastrado
    public boolean verificarTelefone(String telefone) {
        return usuarioTelefoneRepo.existsByTelefone(telefone);
    }

    // Validar sintaxe do email
    public boolean validarSintaxeEmail(String email) {
        String emailRegex = "^[A-Za-z0-9+_.-]+@(.+)$";
        Pattern pattern = Pattern.compile(emailRegex);
        return pattern.matcher(email).matches();
    }

    // Validar confirmação de senha
    public boolean validarConfirmacaoSenha(String senha, String confirmacaoSenha) {
        return senha != null && senha.equals(confirmacaoSenha);
    }

    // Armazenar dados temporariamente
    public void armazenarDadosTemporariamente(UsuarioDados usuario, UsuarioEndereco endereco, UsuarioTelefone telefone) {
        this.dadosTemporarios = usuario;
        this.enderecoTemporario = endereco;
        this.telefoneTemporario = telefone;
    }

    // Inserir dados no banco de dados
    public void inserirDados() {
        if (dadosTemporarios == null || enderecoTemporario == null || telefoneTemporario == null) {
            throw new IllegalStateException("Dados temporários incompletos.");
        }

        // Salvar dados no banco
        usuarioDadosRepo.save(dadosTemporarios);
        enderecoTemporario.setUsuario(dadosTemporarios);
        usuarioEnderecoRepo.save(enderecoTemporario);
        telefoneTemporario.setUsuario(dadosTemporarios);
        usuarioTelefoneRepo.save(telefoneTemporario);

        limparDadosTemporarios();
    }

    // Limpar dados temporários
    public void limparDadosTemporarios() {
        this.dadosTemporarios = null;
        this.enderecoTemporario = null;
        this.telefoneTemporario = null;
    }

    public UsuarioDados getDadosTemporarios() {
        return dadosTemporarios;
    }

    public UsuarioEndereco getEnderecoTemporario() {
        return enderecoTemporario;
    }

    public UsuarioTelefone getTelefoneTemporario() {
        return telefoneTemporario;
    }

    // Buscar usuário por ID
    public UsuarioDados buscarPorId(Integer idUsuario) {
        return usuarioDadosRepo.findById(idUsuario).orElse(null);
    }

    // Listar todos os usuários
    public List<UsuarioDados> listarTodosUsuarios() {
        return usuarioDadosRepo.findAll();
    }

    public void deletarConta(String email, String senha) {
        UsuarioDados usuario = usuarioDadosRepo.findByEmail(email);
        if (usuario == null || !usuario.getSenha().equals(senha)) {
            throw new IllegalArgumentException("Email ou senha incorretos.");
        }
    
        // Remove telefone e endereço associados
        usuarioTelefoneRepo.deleteByUsuario(usuario);
        usuarioEnderecoRepo.deleteByUsuario(usuario);
    
        // Remove o usuário
        usuarioDadosRepo.delete(usuario);
    }
    

}
