package com.coillect.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.coillect.repository.RelacaoServicoUsuarioRepository;

@Service
public class ServicoService {

    @Autowired
    private RelacaoServicoUsuarioRepository relacaoServicoUsuarioRepo;

    public void solicitarServico(String cpfUsuario, String cnpjEmpresa, Integer idServico) {
        try {
            // Criar a relação do serviço com status true
            relacaoServicoUsuarioRepo.inserirRelacaoServicoUsuario(cpfUsuario, cnpjEmpresa, idServico, true);
        } catch (Exception e) {
            throw new RuntimeException("Erro ao solicitar serviço: " + e.getMessage());
        }
    }
}
