package com.coillect.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.coillect.model.EmpresaDados;
import com.coillect.service.EmpresaService;
import com.coillect.service.JwtService;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/empresas")
public class EmpresaController {

    @Autowired
    private EmpresaService empresaService;

    @Autowired
    private JwtService jwtService;

    // Login com autenticação JWT
    @PostMapping("/login")
    public ResponseEntity<?> loginEmpresa(
            @RequestParam String email,
            @RequestParam String senha) {
        try {
            EmpresaDados empresa = empresaService.validarCredenciaisRetornarEmpresa(email, senha);
            if (empresa == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Email ou senha incorretos.");
            }

            // Gerar token JWT
            String token = jwtService.generateToken(email);

            Map<String, Object> response = new HashMap<>();
            response.put("idEmpresa", empresa.getIdEmpresa());
            response.put("nomeCorporativo", empresa.getNomeCorporativo());
            response.put("logoUrl", empresa.getLogoUrl());
            response.put("token", token);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Erro interno ao realizar login: " + e.getMessage());
        }
    }

    // Atualizar logo da empresa
    @PostMapping("/upload-logo")
    public ResponseEntity<?> uploadLogo(
            @RequestParam Integer idEmpresa,
            @RequestParam String logoUrl) {
        try {
            empresaService.atualizarLogoEmpresa(idEmpresa, logoUrl);
            return ResponseEntity.ok("Logo atualizada com sucesso.");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Erro ao atualizar logo: " + e.getMessage());
        }
    }

    // Buscar dados de uma empresa por ID
    @GetMapping("/{idEmpresa}")
    public ResponseEntity<?> buscarDadosEmpresa(@PathVariable Integer idEmpresa) {
        try {
            EmpresaDados empresa = empresaService.buscarEmpresaPorId(idEmpresa);
            if (empresa == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Empresa não encontrada.");
            }
            return ResponseEntity.ok(empresa);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Erro interno ao buscar empresa: " + e.getMessage());
        }
    }

    // Listar todas as empresas
    @GetMapping("/listar")
    public ResponseEntity<?> listarEmpresas() {
        try {
            List<EmpresaDados> empresas = empresaService.listarTodasEmpresas();
            if (empresas.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NO_CONTENT).body("Nenhuma empresa encontrada.");
            }
            return ResponseEntity.ok(empresas);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Erro ao listar empresas: " + e.getMessage());
        }
    }

    // Relacionar serviço com usuário
    @PostMapping("/solicitar-servico")
    public ResponseEntity<?> solicitarServico(
            @RequestParam String cpfUsuario,
            @RequestParam String cnpjEmpresa,
            @RequestParam Integer idServico) {
        try {
            empresaService.solicitarServico(cpfUsuario, cnpjEmpresa, idServico);
            return ResponseEntity.ok("Serviço solicitado com sucesso.");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Erro ao solicitar serviço: " + e.getMessage());
        }
    }
}
