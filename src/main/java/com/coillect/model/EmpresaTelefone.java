package com.coillect.model;

import jakarta.persistence.*;

@Entity
@Table(name = "empresa_telefone")
public class EmpresaTelefone {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer idTelefone;

    @Column(nullable = false, length = 15)
    private String telefone;

    @ManyToOne
    @JoinColumn(name = "id_empresa", nullable = false)
    private EmpresaDados empresa;

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

    public EmpresaDados getEmpresa() {
        return empresa;
    }

    public void setEmpresa(EmpresaDados empresa) {
        this.empresa = empresa;
    }
}
