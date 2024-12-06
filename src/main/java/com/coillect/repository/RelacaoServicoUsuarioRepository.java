package com.coillect.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import com.coillect.model.RelacaoServicoUsuario;

public interface RelacaoServicoUsuarioRepository extends JpaRepository<RelacaoServicoUsuario, Integer> {

    @Transactional
    @Modifying
    @Query(value = "INSERT INTO relacao_servico_usuario (cpf_usuario, cnpj_empresa, id_servico, status) VALUES (?1, ?2, ?3, ?4)", nativeQuery = true)
    void inserirRelacaoServicoUsuario(String cpfUsuario, String cnpjEmpresa, Integer idServico, boolean status);
}
