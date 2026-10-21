package br.com.passebackend.club;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import br.com.passebackend.nucleo.base.ObjectBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Entity
@Table(name = "clubes")
public class Club extends ObjectBase{

	@Column(name = "nome", length = 60, nullable = false, unique = true)
	private String name;

	@Column(name = "sigla", columnDefinition = "CHAR(3)", nullable = false, unique = true)
	private String acronym;

	@NotNull
	@Column(name = "caixa", precision = 10, scale = 2, nullable = false)
	private BigDecimal cash;

	@Size(max = 5)
	@Column(name = "formacao", length = 5)
	private String formation;

	@Column(name = "criado_em", nullable = false, updatable = false)
	private LocalDateTime createdAt;

	public Club() {
		
	}
	
	public Club(Integer id ,String name, String acronym, BigDecimal cash, String formation) {
		super(id);
		this.name = name;
		this.acronym = acronym;
		this.cash = cash;
		this.formation = formation;
	}

	@PrePersist
	public void onCreate() {
		if (createdAt == null) {
			createdAt = LocalDateTime.now();
		}

		if (cash == null) {
			cash = new BigDecimal("300.00");
		}
	}

	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}

	public String getAcronym() {
		return acronym;
	}

	public void setAcronym(String acronym) {
		this.acronym = acronym;
	}

	public BigDecimal getCash() {
		return cash;
	}

	public void setCash(BigDecimal cash) {
		this.cash = cash;
	}

	public String getFormation() {
		return formation;
	}

	public void setFormation(String formation) {
		this.formation = formation;
	}

	public LocalDateTime getCreatedAt() {
		return createdAt;
	}

	public void setCreatedAt(LocalDateTime createdAt) {
		this.createdAt = createdAt;
	}
	
}