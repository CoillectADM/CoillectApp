package com.coillect.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.coillect.model.EmpresaTelefone;

public interface EmpresaTelefoneRepository extends JpaRepository<EmpresaTelefone, Integer> {
    boolean existsByTelefone(String telefone);
}
