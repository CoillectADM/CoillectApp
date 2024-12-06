package com.coillect.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;

import com.coillect.model.UsuarioDados;
import com.coillect.model.UsuarioEndereco;

public interface UsuarioEnderecoRepository extends JpaRepository<UsuarioEndereco, Integer> {
    void deleteByUsuario(@Param("usuario") UsuarioDados usuario);
}


