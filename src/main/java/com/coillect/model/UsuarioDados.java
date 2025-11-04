package com.coillect.model;

import java.time.LocalDate;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;

@Entity
@Table(name = "usuario_dados")
public class UsuarioDados {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer idUsuario;

    @Column(nullable = false, length = 100)
    private String nome;

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @Column(nullable = false, unique = true, length = 14)
    private String cpf;

    @Column(nullable = false)
    private LocalDate dataNascimento;

    @Column(nullable = false)
    private Boolean statusEmail = false;

    @Column(nullable = false)
    private String senha;

    @Transient // Campo não persistido no banco de dados
    private String confirmacaoSenha;

    @Column(nullable = false, updatable = false)
    private LocalDate dataCadastro = LocalDate.now();

    @Column(nullable = true)
    private LocalDate ultimaAtualizacao;

    @Column(nullable = true)
    private Boolean ativo = true;

    // Relacionamento com endereço (1:1) com exclusão em cascata
    @OneToOne(mappedBy = "usuario", cascade = CascadeType.ALL, orphanRemoval = true)
    private UsuarioEndereco endereco;

    // Relacionamento com telefone (1:1) com exclusão em cascata
    @OneToOne(mappedBy = "usuario", cascade = CascadeType.ALL, orphanRemoval = true)
    private UsuarioTelefone telefone;

    // Construtor padrão
    public UsuarioDados() {
    }

    // Construtor adicional para testes ou inicialização rápida
    public UsuarioDados(String nome, String email, String cpf, LocalDate dataNascimento, String senha) {
        this.nome = nome;
        this.email = email;
        this.cpf = cpf;
        this.dataNascimento = dataNascimento;
        this.senha = senha;
    }

    // Getters e Setters
    public Integer getIdUsuario() {
        return idUsuario;
    }

    public void setIdUsuario(Integer idUsuario) {
        this.idUsuario = idUsuario;
    }

    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getCpf() {
        return cpf;
    }

    public void setCpf(String cpf) {
        this.cpf = cpf;
    }

    public LocalDate getDataNascimento() {
        return dataNascimento;
    }

    public void setDataNascimento(LocalDate dataNascimento) {
        this.dataNascimento = dataNascimento;
    }

    public Boolean getStatusEmail() {
        return statusEmail;
    }

    public void setStatusEmail(Boolean statusEmail) {
        this.statusEmail = statusEmail;
    }

    public String getSenha() {
        return senha;
    }

    public void setSenha(String senha) {
        this.senha = senha;
    }

    public String getConfirmacaoSenha() {
        return confirmacaoSenha;
    }

    public void setConfirmacaoSenha(String confirmacaoSenha) {
        this.confirmacaoSenha = confirmacaoSenha;
    }

    public LocalDate getDataCadastro() {
        return dataCadastro;
    }

    public void setDataCadastro(LocalDate dataCadastro) {
        this.dataCadastro = dataCadastro;
    }

    public LocalDate getUltimaAtualizacao() {
        return ultimaAtualizacao;
    }

    public void setUltimaAtualizacao(LocalDate ultimaAtualizacao) {
        this.ultimaAtualizacao = ultimaAtualizacao;
    }

    public Boolean getAtivo() {
        return ativo;
    }

    public void setAtivo(Boolean ativo) {
        this.ativo = ativo;
    }

    public UsuarioEndereco getEndereco() {
        return endereco;
    }

    public void setEndereco(UsuarioEndereco endereco) {
        this.endereco = endereco;
    }

    public UsuarioTelefone getTelefone() {
        return telefone;
    }

    public void setTelefone(UsuarioTelefone telefone) {
        this.telefone = telefone;
    }
}
