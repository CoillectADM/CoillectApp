package com.coillect.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.coillect.service.ServicoService;
import com.coillect.service.JwtService;
import com.coillect.model.UsuarioDados;
import com.coillect.service.UsuarioService;

import java.util.Map; // Adicionando a importação de Map

@RestController
@RequestMapping("/api/servicos")
public class ServicoController {

    @Autowired
    private ServicoService servicoService;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private UsuarioService usuarioService;

    // Endpoint para solicitar um serviço
    @PostMapping("/solicitar")
    public ResponseEntity<?> solicitarServico(
            @RequestHeader("Authorization") String token,
            @RequestBody Map<String, Object> payload) { // Corrigido com importação de Map
        try {
            // Validar token JWT
            String email = jwtService.validateToken(token.replace("Bearer ", ""));
            if (email == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Token inválido ou expirado.");
            }

            // Extrair dados do payload
            String cpfUsuario = (String) payload.get("cpfUsuario");
            String cnpjEmpresa = (String) payload.get("cnpjEmpresa");
            Integer idServico = (Integer) payload.get("idServico");

            // Verificar se o usuário está autenticado
            UsuarioDados usuario = usuarioService.buscarPorEmail(email);
            if (usuario == null || !usuario.getCpf().equals(cpfUsuario)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Usuário não está logado corretamente.");
            }

            // Solicitar o serviço
            servicoService.solicitarServico(cpfUsuario, cnpjEmpresa, idServico);
            return ResponseEntity.ok("Serviço solicitado com sucesso.");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Erro ao solicitar serviço: " + e.getMessage());
        }
    }
}
