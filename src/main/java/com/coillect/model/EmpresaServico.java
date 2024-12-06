package com.coillect.model;

import jakarta.persistence.*;

@Entity
@Table(name = "empresa_servico")
public class EmpresaServico {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer idServico; // Altere para Integer para refletir corretamente o campo SERIAL no banco de dados.

    @Column(nullable = false, length = 14)
    private String cnpjEmpresa;

    @Column(nullable = false, length = 50)
    private String modalidade;

    // Getters e Setters
    public Integer getIdServico() {
        return idServico;
    }

    public void setIdServico(Integer idServico) {
        this.idServico = idServico;
    }

    public String getCnpjEmpresa() {
        return cnpjEmpresa;
    }

    public void setCnpjEmpresa(String cnpjEmpresa) {
        this.cnpjEmpresa = cnpjEmpresa;
    }

    public String getModalidade() {
        return modalidade;
    }

    public void setModalidade(String modalidade) {
        this.modalidade = modalidade;
    }
}
