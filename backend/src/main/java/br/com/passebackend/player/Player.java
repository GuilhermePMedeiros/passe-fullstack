package br.com.passebackend.player;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import br.com.passebackend.club.Club;
import br.com.passebackend.nucleo.base.ObjectBase;
import br.com.passebackend.player.converter.PlayerConditionConverter;
import br.com.passebackend.player.converter.PlayerPositionConverter;
import br.com.passebackend.player.enums.PlayerCondition;
import br.com.passebackend.player.enums.PlayerPosition;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@Entity
@Table(name = "jogadores")
public class Player extends ObjectBase {

	@NotBlank
	@Column(name = "nome", length = 100, nullable = false)
	private String name;

	@NotNull
	@Convert(converter = PlayerPositionConverter.class)
	@Column(name = "posicao", length = 3, nullable = false)
	private PlayerPosition position;

	@NotNull
	@Column(name = "agilidade", nullable = false)
	private Integer agility;

	@NotNull
	@Column(name = "idade", nullable = false)
	private Integer age;

	@NotNull
	@Column(name = "valor_base", precision = 6, scale = 2, nullable = false)
	private BigDecimal baseValue;

	@NotNull
	@Convert(converter = PlayerConditionConverter.class)
	@Column(name = "condicao", length = 20, nullable = false)
	private PlayerCondition condition;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "clube_id")
	private Club club;

	@NotNull
	@Column(name = "velocidade", nullable = false)
	private Integer pace;

	@NotNull
	@Column(name = "finalizacao", nullable = false)
	private Integer shooting;

	@NotNull
	@Column(name = "passe", nullable = false)
	private Integer passing;

	@NotNull
	@Column(name = "drible", nullable = false)
	private Integer dribbling;

	@NotNull
	@Column(name = "defesa", nullable = false)
	private Integer defending;

	@NotNull
	@Column(name = "fisico", nullable = false)
	private Integer physical;

	@NotNull
	@Column(name = "potencial", nullable = false)
	private Integer potential;

	@Column(name = "excluido_em")
	private LocalDateTime deletedAt;

	@Column(name = "criado_em", nullable = false, updatable = false)
	private LocalDateTime createdAt;

	@Column(name = "atualizado_em", nullable = false)
	private LocalDateTime updatedAt;

	@PrePersist
	protected void onCreate() {
		LocalDateTime now = LocalDateTime.now();
		createdAt = now;
		updatedAt = now;

		condition = PlayerCondition.FIT;
	}

	@PreUpdate
	protected void onUpdate() {
		updatedAt = LocalDateTime.now();
	}

	public Player() {

	}

	public Player(Integer id, String name, PlayerPosition position, Integer agility, Integer age, BigDecimal baseValue,
			PlayerCondition condition, Club club, Integer pace, Integer shooting, Integer passing, Integer dribbling,
			Integer defending, Integer physical, Integer potential) {
		super(id);
		this.name = name;
		this.position = position;
		this.agility = agility;
		this.age = age;
		this.baseValue = baseValue;
		this.condition = condition;
		this.club = club;
		this.pace = pace;
		this.shooting = shooting;
		this.passing = passing;
		this.dribbling = dribbling;
		this.defending = defending;
		this.physical = physical;
		this.potential = potential;
	}

	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}

	public PlayerPosition getPosition() {
		return position;
	}

	public void setPosition(PlayerPosition position) {
		this.position = position;
	}

	public Integer getAgility() {
		return agility;
	}

	public void setAgility(Integer agility) {
		this.agility = agility;
	}

	public Integer getAge() {
		return age;
	}

	public void setAge(Integer age) {
		this.age = age;
	}

	public BigDecimal getBaseValue() {
		return baseValue;
	}

	public void setBaseValue(BigDecimal baseValue) {
		this.baseValue = baseValue;
	}

	public PlayerCondition getCondition() {
		return condition;
	}

	public void setCondition(PlayerCondition condition) {
		this.condition = condition;
	}

	public Club getClub() {
		return club;
	}

	public void setClub(Club club) {
		this.club = club;
	}

	public Integer getPace() {
		return pace;
	}

	public void setPace(Integer pace) {
		this.pace = pace;
	}

	public Integer getShooting() {
		return shooting;
	}

	public void setShooting(Integer shooting) {
		this.shooting = shooting;
	}

	public Integer getPassing() {
		return passing;
	}

	public void setPassing(Integer passing) {
		this.passing = passing;
	}

	public Integer getDribbling() {
		return dribbling;
	}

	public void setDribbling(Integer dribbling) {
		this.dribbling = dribbling;
	}

	public Integer getDefending() {
		return defending;
	}

	public void setDefending(Integer defending) {
		this.defending = defending;
	}

	public Integer getPhysical() {
		return physical;
	}

	public void setPhysical(Integer physical) {
		this.physical = physical;
	}

	public Integer getPotential() {
		return potential;
	}

	public void setPotential(Integer potential) {
		this.potential = potential;
	}

	public LocalDateTime getDeletedAt() {
		return deletedAt;
	}

	public void setDeletedAt(LocalDateTime deletedAt) {
		this.deletedAt = deletedAt;
	}

	public LocalDateTime getCreatedAt() {
		return createdAt;
	}

	public void setCreatedAt(LocalDateTime createdAt) {
		this.createdAt = createdAt;
	}

	public LocalDateTime getUpdatedAt() {
		return updatedAt;
	}

	public void setUpdatedAt(LocalDateTime updatedAt) {
		this.updatedAt = updatedAt;
	}

}
