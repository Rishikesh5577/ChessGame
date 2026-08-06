package com.chessbet.model;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;

import java.time.Instant;
import java.util.UUID;

/**
 * AuditableEntity class. Represents an entity with audit fields.
 * It provides an id field for all entities.
 * It also provides fields for the creation and update dates and the user who created and updated the entity.
 * The id is a UUID and is generated automatically when the entity is created.
 */
public abstract class AuditableEntity {
    @Id
    private UUID id = UUID.randomUUID();

    @CreatedDate
    private Instant createdDate = Instant.now();

    @LastModifiedDate
    private Instant updatedDate;

    private String createdBy;

    private String updatedBy;

    /**
     * Gets the entity's id.
     * @return The entity's id.
     */
    public UUID getId() {
        return id;
    }

    public Instant getCreatedDate() {
        return createdDate;
    }

    public Instant getUpdatedDate() {
        return updatedDate;
    }

    public void setUpdatedDate(final Instant updatedAt) {
        this.updatedDate = updatedAt;
    }

    public String getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(final String createdBy) {
        this.createdBy = createdBy;
    }

    public String getUpdatedBy() {
        return updatedBy;
    }

    public void setUpdatedBy(final String updatedBy) {
        this.updatedBy = updatedBy;
    }
}
