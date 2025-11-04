package com.coillect.model;

import jakarta.persistence.*;

@Entity
@Table(name = "relacao_servico_usuario")
public class RelacaoServicoUsuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "cpf_usuario", nullable = false)
    private String cpfUsuario;

    @Column(name = "cnpj_empresa", nullable = false)
    private String cnpjEmpresa;

    @Column(name = "id_servico", nullable = false)
    private Integer idServico;

    @Column(name = "status", nullable = false)
    private Boolean status = true;

    // Getters e setters
    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getCpfUsuario() {
        return cpfUsuario;
    }

    public void setCpfUsuario(String cpfUsuario) {
        this.cpfUsuario = cpfUsuario;
    }

    public String getCnpjEmpresa() {
        return cnpjEmpresa;
    }

    public void setCnpjEmpresa(String cnpjEmpresa) {
        this.cnpjEmpresa = cnpjEmpresa;
    }

    public Integer getIdServico() {
        return idServico;
    }

    public void setIdServico(Integer idServico) {
        this.idServico = idServico;
    }

    public Boolean getStatus() {
        return status;
    }

    public void setStatus(Boolean status) {
        this.status = status;
    }
}
