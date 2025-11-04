package com.coillect.controller;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.coillect.model.UsuarioDados;
import com.coillect.model.UsuarioEndereco;
import com.coillect.model.UsuarioTelefone;
import com.coillect.service.JwtService;
import com.coillect.service.UsuarioService;

@RestController
@RequestMapping("/api/usuarios")
public class UsuarioController {

    @Autowired
    private UsuarioService usuarioService;

    @Autowired
    private JwtService jwtService;

    // Alterar Senha
    @PostMapping("/alterarSenha")
    public ResponseEntity<?> alterarSenha(@RequestBody Map<String, String> dados) {
        String email = dados.get("email");
        String senhaAtual = dados.get("senhaAtual");
        String novaSenha = dados.get("novaSenha");

        try {
            boolean sucesso = usuarioService.alterarSenha(email, senhaAtual, novaSenha);
            if (sucesso) {
                return ResponseEntity.ok("Senha atualizada com sucesso.");
            } else {
                return ResponseEntity.badRequest().body("Credenciais inválidas ou senha atual incorreta.");
            }
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Erro ao atualizar a senha: " + e.getMessage());
        }
    }

    // Etapa 1: Receber dados do usuário
    @PostMapping("/etapa1")
    public ResponseEntity<?> etapa1(@RequestBody UsuarioDados usuarioDados) {
        if (usuarioService.verificarCpf(usuarioDados.getCpf())) {
            return ResponseEntity.badRequest().body("CPF já cadastrado.");
        }
        if (usuarioService.verificarEmail(usuarioDados.getEmail())) {
            return ResponseEntity.badRequest().body("Email já cadastrado.");
        }
        if (!usuarioService.validarConfirmacaoSenha(usuarioDados.getSenha(), usuarioDados.getConfirmacaoSenha())) {
            return ResponseEntity.badRequest().body("As senhas não coincidem.");
        }
        usuarioService.armazenarDadosTemporariamente(usuarioDados, null, null);
        return ResponseEntity.ok("Dados do usuário armazenados temporariamente.");
    }

    // Etapa 2: Receber telefone
    @PostMapping("/etapa2")
    public ResponseEntity<?> etapa2(@RequestBody UsuarioTelefone usuarioTelefone) {
        if (usuarioService.verificarTelefone(usuarioTelefone.getTelefone())) {
            return ResponseEntity.badRequest().body("Telefone já cadastrado.");
        }
        UsuarioDados usuarioTemporario = usuarioService.getDadosTemporarios();
        if (usuarioTemporario == null) {
            return ResponseEntity.badRequest().body("Dados do usuário não foram informados na etapa 1.");
        }
        usuarioService.armazenarDadosTemporariamente(usuarioTemporario, null, usuarioTelefone);
        return ResponseEntity.ok("Telefone armazenado temporariamente.");
    }

    // Etapa 3: Receber endereço
    @PostMapping("/etapa3")
    public ResponseEntity<?> etapa3(@RequestBody UsuarioEndereco usuarioEndereco) {
        UsuarioDados usuarioTemporario = usuarioService.getDadosTemporarios();
        UsuarioTelefone telefoneTemporario = usuarioService.getTelefoneTemporario();
        if (usuarioTemporario == null || telefoneTemporario == null) {
            return ResponseEntity.badRequest().body("Dados do usuário ou telefone não foram informados nas etapas anteriores.");
        }
        usuarioService.armazenarDadosTemporariamente(usuarioTemporario, usuarioEndereco, telefoneTemporario);
        return ResponseEntity.ok("Endereço armazenado temporariamente.");
    }

    // Confirmar cadastro
    @PostMapping("/confirmar")
    public ResponseEntity<?> confirmarCadastro() {
        try {
            usuarioService.inserirDados();
            return ResponseEntity.ok("Cadastro realizado com sucesso.");
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // Login com autenticação JWT
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody UsuarioDados usuario) {
        try {
            UsuarioDados usuarioValido = usuarioService.validarCredenciaisRetornarUsuario(usuario.getEmail(), usuario.getSenha());
            if (usuarioValido != null) {
                String token = jwtService.generateToken(usuarioValido.getEmail());
                return ResponseEntity.ok(Map.of(
                    "token", token,
                    "usuarioId", usuarioValido.getIdUsuario(),
                    "cpf", usuarioValido.getCpf() // Incluído CPF na resposta
                ));
            } else {
                return ResponseEntity.status(401).body("Credenciais inválidas.");
            }
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Erro interno ao processar o login.");
        }
    }

    @PostMapping("/deletar")
    public ResponseEntity<?> deletarConta(@RequestBody Map<String, String> dados) {
        try {
            String email = dados.get("email");
            String senha = dados.get("senha");
            usuarioService.deletarConta(email, senha);
            return ResponseEntity.ok("Conta deletada com sucesso.");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Erro interno ao deletar conta.");
        }
    }
    


    // Obter dados do usuário autenticado
    @GetMapping("/me")
    public ResponseEntity<?> buscarUsuarioAutenticado(@RequestHeader("Authorization") String token) {
        String email = jwtService.validateToken(token);
        if (email == null) {
            return ResponseEntity.status(401).body("Token inválido ou expirado.");
        }
        UsuarioDados usuario = usuarioService.buscarPorEmail(email);
        if (usuario == null) {
            return ResponseEntity.status(404).body("Usuário não encontrado.");
        }
        return ResponseEntity.ok(Map.of(
            "nome", usuario.getNome(),
            "cpf", usuario.getCpf(),
            "email", usuario.getEmail()
        ));
    }
}
