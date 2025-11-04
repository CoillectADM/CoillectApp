package com.coillect.model;

import jakarta.persistence.*;

@Entity
@Table(name = "usuario_telefone")
public class UsuarioTelefone {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer idTelefone;

    @Column(nullable = false, length = 15)
    private String telefone;

    @ManyToOne
    @JoinColumn(name = "id_usuario", nullable = false)
    private UsuarioDados usuario; // Sem alteração necessária


    // Getters e Setters
    public Integer getIdTelefone() {
        return idTelefone;
    }

    public void setIdTelefone(Integer idTelefone) {
        this.idTelefone = idTelefone;
    }

    public String getTelefone() {
        return telefone;
    }

    public void setTelefone(String telefone) {
        this.telefone = telefone;
    }

    public UsuarioDados getUsuario() {
        return usuario;
    }

    public void setUsuario(UsuarioDados usuario) {
        this.usuario = usuario;
    }
}
