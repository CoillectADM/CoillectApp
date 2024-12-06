package com.coillect.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.coillect.model.UsuarioDados;

public interface UsuarioDadosRepository extends JpaRepository<UsuarioDados, Integer> {
    boolean existsByEmail(String email);
    boolean existsByCpf(String cpf);
    UsuarioDados findByEmail(String email);
}
