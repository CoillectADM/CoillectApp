package com.coillect.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.coillect.model.EmpresaDados;
import com.coillect.repository.EmpresaDadosRepository;
import com.coillect.repository.RelacaoServicoUsuarioRepository;
import com.coillect.model.RelacaoServicoUsuario;

import java.util.List;

@Service
public class EmpresaService {

    @Autowired
    private EmpresaDadosRepository empresaDadosRepo;

    @Autowired
    private RelacaoServicoUsuarioRepository relacaoServicoUsuarioRepo;

    // Validar credenciais e retornar a empresa correspondente
    public EmpresaDados validarCredenciaisRetornarEmpresa(String email, String senha) {
        try {
            EmpresaDados empresa = empresaDadosRepo.findByEmail(email);

            if (empresa == null) {
                System.err.println("Empresa não encontrada para o email: " + email);
                return null;
            }

            if (!empresa.getSenha().equals(senha)) {
                System.err.println("Senha incorreta para o email: " + email);
                return null;
            }

            return empresa;
        } catch (Exception e) {
            System.err.println("Erro ao validar credenciais: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    // Atualizar a logo da empresa
    public void atualizarLogoEmpresa(Integer idEmpresa, String logoUrl) {
        try {
            EmpresaDados empresa = empresaDadosRepo.findById(idEmpresa)
                    .orElseThrow(() -> new IllegalArgumentException("Empresa não encontrada com ID: " + idEmpresa));
            empresa.setLogoUrl(logoUrl);
            empresaDadosRepo.save(empresa);
        } catch (Exception e) {
            System.err.println("Erro ao atualizar logo da empresa: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    // Buscar empresa por ID
    public EmpresaDados buscarEmpresaPorId(Integer idEmpresa) {
        try {
            return empresaDadosRepo.findById(idEmpresa).orElse(null);
        } catch (Exception e) {
            System.err.println("Erro ao buscar empresa por ID: " + idEmpresa + ", " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    // Listar todas as empresas
    public List<EmpresaDados> listarTodasEmpresas() {
        try {
            return empresaDadosRepo.findAll();
        } catch (Exception e) {
            System.err.println("Erro ao listar todas as empresas: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    // Solicitar serviço
    public void solicitarServico(String cpfUsuario, String cnpjEmpresa, Integer idServico) {
        try {
            RelacaoServicoUsuario relacao = new RelacaoServicoUsuario();
            relacao.setCpfUsuario(cpfUsuario);
            relacao.setCnpjEmpresa(cnpjEmpresa);
            relacao.setIdServico(idServico);
            relacao.setStatus(true);

            relacaoServicoUsuarioRepo.save(relacao);
        } catch (Exception e) {
            System.err.println("Erro ao solicitar serviço: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }
}
