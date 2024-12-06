package com.coillect.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;

import com.coillect.model.UsuarioDados;
import com.coillect.model.UsuarioTelefone;

public interface UsuarioTelefoneRepository extends JpaRepository<UsuarioTelefone, Integer> {
    void deleteByUsuario(@Param("usuario") UsuarioDados usuario);
    boolean existsByTelefone(String telefone);
}
