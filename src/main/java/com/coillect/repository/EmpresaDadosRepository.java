package com.coillect.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import com.coillect.model.EmpresaDados;

public interface EmpresaDadosRepository extends JpaRepository<EmpresaDados, Integer> {
    boolean existsByCnpj(String cnpj);

    EmpresaDados findByCnpj(String cnpj);

    boolean existsByEmail(String email);

    EmpresaDados findByEmail(String email);

    @Transactional
    @Modifying
    @Query("UPDATE EmpresaDados e SET e.logoUrl = :logoUrl WHERE e.idEmpresa = :idEmpresa")
    void updateLogoUrl(Integer idEmpresa, String logoUrl);
}
