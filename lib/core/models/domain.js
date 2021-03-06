const extend = require('lodash/extend');
const Promise = require('bluebird');

const Base = require('./base');
const ComplexTypes = require('./../complex-types');
const debug = require('./debug')('domain');
const Entity = require('./entity');
const WarpWorksError = require('./../error');
const utils = require('./../utils');

const TYPE = ComplexTypes.Domain;

class DomainError extends WarpWorksError {
}

class Domain extends Base {
    constructor(warpworks, name, desc, recreate) {
        // Special case - the parent of domain is warpworks, which is not of type "Base"
        // FIXME: This `1` is a hard-coded value.
        super(TYPE, warpworks, 1, name, desc);
        this.entities = [];
        this.definitionOfMany = 100;
        this.persistenceId = null;
        this.lastUpdated = null;

        // Create rootEntity entity:
        if (!recreate) {
            this.addNewEntity(this.name, `Root for domain ${this.name}`, null, false, true);
        }
    }

    async save(persistence) {
        if (!persistence) {
            throw new DomainError("Should not be called without params");
        }

        const saveResult = await super.save(persistence, null);
        const domainPersistenceId = saveResult.id;
        await Promise.each(
            this.getEntities(),
            async (entity) => entity.save(persistence, domainPersistenceId)
        );
        return null;
    }

    createNewID() {
        const max = Math.max.apply(null, this.getAllElements().map((element) => element.id));
        return max + 1;
    }

    compareIDs(id1, id2) {
        return id1.toString() === id2.toString();
    }

    validateModel() {
        let i;
        let vRes = "";
        let wCount = 0;

        if (this.name === "New_Domain") {
            wCount++;
            vRes += "<br>[" + wCount + "]: <strong>" + this.name + "</strong> is not a unique name - please rename your Domain!";
        }

        // All Relationships need targets
        for (i in this.entities) {
            for (const j in this.entities[i].relationships) {
                if (!this.entities[i].relationships[j].hasTargetEntity()) {
                    wCount++;
                    vRes += "<br>[" + wCount + "]: <strong>" + this.entities[i].name + "::" + this.entities[i].relationships[j].name + "</strong> does not have a target!";
                }
            }
        }

        // All entities should either be abstract, root entity or aggregated by another entity (directly or through inheritance):
        for (i in this.entities) {
            if (!this.entities[i].isAbstract && !this.entities[i].canBeInstantiated()) {
                wCount++;
                vRes += "<br>[" + wCount + "]: <strong>" + this.entities[i].name + "</strong> can not be instantiated (solution: make it a RootEntity or child of another entity)";
            }
        }

        // No Entity of type "Embedded" should aggregate an Entity of type "Document"
        for (i in this.entities) {
            for (const j in this.entities[i].relationships) {
                if (!this.entities[i].isDocument() &&
                    this.entities[i].relationships[j].isAggregation &&
                    this.entities[i].relationships[j].hasTargetEntity() &&
                    this.entities[i].relationships[j].getTargetEntity().isDocument()) {
                    wCount++;
                    vRes += "<br>[" + wCount + "]: <strong>" + this.entities[i].name + "::" + this.entities[i].relationships[j].name + "</strong>: Embedded entity '" + this.entities[i].name + "' can not aggregate document-type '" + this.entities[i].relationships[j].getTargetEntity().name + "'!";
                }
            }
        }

        if (wCount === 0) {
            return null;
        }
        return wCount === 1 ? "<strong>1 Warning:</strong>" + vRes : "<strong>" + wCount + " Warnings:</strong>" + vRes;
    }

    getEntityByName(name) {
        const entities = this.getEntities().filter((entity) => entity.name === name);
        if (entities.length === 1) {
            return entities[0];
        }

        throw new DomainError(`Cannot find entity with name='${name}'.`);
    }

    getParentEntityByRelationship(parentRelnID) {
        return this.getEntities(/* true */).find((entity) => {
            return entity.getRelationships(/* true */).find((relationship) => {
                return relationship.id === parentRelnID;
            });
        });
    }

    /**
     *  Retrieve the parent's entity based on the information of
     *  `parentBaseClassName` from the instance data.
     */
    getParentEntityByParentBaseClassName(instance) {
        debug(`@DEPRECATED: Use getParentEntityByParentBaseClassID()...`);
        return (instance.parentBaseClassName) ? this.getEntityByName(instance.parentBaseClassName) : null;
    }

    getParentEntityByParentBaseClassID(instance) {
        return (instance.parentBaseClassID) ? this.getEntityById(instance.parentBaseClassID) : null;
    }

    getEntities(sortByInheritance) {
        if (!sortByInheritance) {
            return this.entities;
        }
        for (const i in this.entities) {
            const entity = this.entities[i];
            entity.longName = entity.name;
            let tmpEntity = entity;
            while (tmpEntity.hasParentClass()) {
                tmpEntity = tmpEntity.getParentClass();
                entity.longName = tmpEntity.name + ":" + entity.longName;
            }
        }
        return this.entities.sort(function(a, b) {
            if (a.longName < b.longName) {
                return -1;
            }
            if (a.longName > b.longName) {
                return 1;
            }
            return 0;
        });
    }

    getRootEntities() {
        const allEntities = this.entities;
        const rootEntities = [];
        for (const i in allEntities) {
            if (allEntities[i].isRootEntity) {
                rootEntities.push(allEntities[i]);
            }
        }
        return allEntities;
    }

    getRootInstance() {
        const rootInstance = this.getEntities(false).find((entity) => entity.isRootInstance);
        if (rootInstance) {
            return rootInstance;
        } else {
            throw new Error("Domain without root instance!");
        }
    }

    addEntity(newEntity) {
        return this.entities.push(newEntity);
    }

    addNewEntity(name, desc, parentClass, isRootEntity, isRootInstance) {
        const id = this.getDomain().createNewID();
        const newEntity = new Entity(this, id, name, desc, parentClass, isRootEntity, isRootInstance);

        this.addEntity(newEntity);
        return newEntity;
    }

    // createNewDefaultViews() {
    //     this.getEntities().forEach(function(elem) {
    //         elem.createNewDefaultViews();
    //     });
    // }

    getAllElements(includeSelf) {
        // Returns an array containing all child elements; optional: also include self
        let r = [];
        if (includeSelf) {
            r = r.concat(this);
        }
        for (const i in this.getEntities()) {
            r = r.concat(this.getEntities()[i].getAllElements(true));
        }
        return r;
    }

    getElementById(id, includeSelf) {
        return this.getAllElements(includeSelf).find((element) => String(element.id) === String(id));
    }

    toJSON() {
        return extend({}, super.toJSON(), {
            definitionOfMany: this.definitionOfMany,
            lastUpdated: this.lastUpdated,

            entities: utils.mapJSON(this.getEntities())
        });
    }

    fromJSON(json) {
        super.fromJSON(json);

        this.definitionOfMany = json.definitionOfMany;
        this.lastUpdated = json.lastUpdated;

        this.entities = this.fromJsonMapper(Entity, json.entities);
    }

    static fromFileJSON(json, parent) {
        const warpCore = require('./../');

        super.validateFromFileJSON(json, TYPE);

        const instance = new Domain(warpCore, json.name, json.desc, true);
        instance.fromJSON(json);

        instance.replaceOIDs();

        return instance;
    }

    toString() {
        return []
            .concat('//')
            .concat(`// ${(new Date()).toISOString()}`)
            .concat(`// Domain '${this.name}'`)
            .concat('//')
            .concat('')
            .concat('// Basic Entity Definitions:')
            .concat(this.getEntities().map((entity) => entity.toString(Entity.TO_STRING_TYPES.PROPERTIES)).filter((s) => s))
            .concat('')
            .concat('// Aggregation Hierarchy:')
            .concat(this.getEntities().map((entity) => entity.toString(Entity.TO_STRING_TYPES.AGGREGATIONS)).filter((s) => s))
            .concat('')
            .concat('// Associations:')
            .concat(this.getEntities().map((entity) => entity.toString(Entity.TO_STRING_TYPES.ASSOCIATIONS)).filter((s) => s))
            .join('\n')
        ;
    }

    createNewInstance() {
        return {
            domainName: 'UNDEFINED',
            isRootInstance: true,
            parentID: null
        };
    }

    getEntityByInstance(instance) {
        if (instance.typeID) {
            return this.getEntityById(instance.typeID);
        } else {
            return this.getEntityByName(instance.type);
        }
    }

    getEntityById(entityId) {
        const entities = this.getEntities().filter((entity) => String(entity.id) === String(entityId));
        if (entities.length === 1) {
            return entities.pop();
        } else {
            throw new DomainError(`Cannot find entity with id=${entityId}.`);
        }
    }

    getElementByPersistenceId(persistenceId) {
        const elements = this.getAllElements().filter((element) => String(element.persistenceId) === String(persistenceId));
        if (elements.length) {
            if (elements.length > 1) {
                throw new DomainError(`Multiple elements found with persistenceId='${persistenceId}'.`);
            } else {
                return elements[0];
            }
        } else {
            throw new DomainError(`Cannot find element with persistenceId='${persistenceId}'.`);
        }
    }

    /**
     *  Retrieve all entities that are documents.
     */
    getDocumentEntities() {
        return this.getEntities().filter((entity) => entity.isDocument() && !entity.isAbstract);
    }

    /**
     *  Gets all domain defined.
     */
    static async list(persistence) {
        return persistence.documents(TYPE);
    }

    toPersistenceJSON() {
        const json = extend({}, super.toPersistenceJSON(), {
            // For persistence
            id: this.persistenceId,
            lastUpdated: this.lastUpdated,

            // From constructor
            definitionOfMany: this.definitionOfMany
        });

        return json;
    }

    async fromPersistenceJSON(persistence, json) {
        await super.fromPersistenceJSON(json);

        this.persistenceId = json.id;
        this.lastUpdated = json.lastUpdated;

        this.definitionOfMany = json.definitionOfMany;

        // Retrieve entities.
        await this.fromPersistenceCollection(persistence, Entity, 'entities');

        return this;
    }

    static async instantiateFromPersistenceJSON(persistence, json, parent) {
        const instance = new Domain(parent, json.name, json.desc, false);

        await instance.fromPersistenceJSON(persistence, json);

        // Replace OIDs with real objects.
        await instance.replaceOIDs();

        return instance;
    }

    /**
     *  In JSON format, in-memory references have been replaced with OIDs. Now,
     *  we must replace any of these OIDs with in-memory object references
     *  again. This method should only be called with the domain has been
     *  reconstructed from JSON.
     */
    replaceOIDs() {
        this.getEntities().forEach((entity) => {
            // Parent class
            if (entity.hasParentClass()) {
                const oid = entity.getParentClass();
                if (oid) {
                    const target = this.findElementByID(oid);
                    if (target) {
                        entity.setParentClass(target);
                    } else {
                        entity.setParentClass(null);
                        // eslint-disable-next-line no-console
                        console.error(new WarpWorksError(`Cannot find parent class OID ${oid} for ${entity.name}.`));
                    }
                }
            }

            // Relationships
            entity.relationships.forEach((relationship) => {
                const oid = relationship.targetEntity && relationship.targetEntity.length ? relationship.targetEntity[0] : null;
                // debug(`replaceOIDs(): entity=${entity.name} relationship=${relationship.name} oid=${oid}`);
                if (oid) {
                    const target = this.findElementByID(oid);
                    if (target) {
                        relationship.setTargetEntity(target);
                    } else {
                        relationship.setTargetEntity(null);
                        // eslint-disable-next-line no-console
                        console.error(new WarpWorksError(`Cannot find OID ${oid} target entity for ${entity.name}.${relationship.name}`));
                    }
                }
            });

            // Table views
            entity.tableViews.forEach((tableView) => {
                tableView.tableItems.forEach((tableItem) => {
                    const oid = tableItem.hasProperty() ? tableItem.getProperty() : null;
                    if (oid) {
                        const target = this.findElementByID(oid);
                        if (target) {
                            tableItem.setProperty(target);
                        } else {
                            tableItem.setProperty(null);
                            // eslint-disable-next-line no-console
                            console.error(new WarpWorksError(`Cannot find property OID ${oid} for ${entity.name}.${tableView.name}.${tableItem.name}.`));
                        }
                    }
                });
            });

            // Page views
            entity.pageViews.forEach((pageView) => {
                pageView.panels.forEach((panel) => {
                    panel.relationshipPanelItems.forEach((relationshipPanelItem) => {
                        const oid = relationshipPanelItem.hasRelationship() ? relationshipPanelItem.getRelationship() : null;
                        if (oid) {
                            const target = this.findElementByID(oid);
                            if (target) {
                                relationshipPanelItem.setRelationship(target);
                            } else {
                                relationshipPanelItem.setRelationship(null);
                                // eslint-disable-next-line no-console
                                console.error(new WarpWorksError(`Cannot find OID ${oid} relationship for ${entity.name}.${pageView.name}.${panel.name}.${relationshipPanelItem.name}.`));
                            }
                        }
                    });

                    panel.basicPropertyPanelItems.forEach((basicPropertyPanelItem) => {
                        const oid = basicPropertyPanelItem.hasBasicProperty() ? basicPropertyPanelItem.getBasicProperty() : null;
                        if (oid) {
                            const target = this.findElementByID(oid);
                            if (target) {
                                basicPropertyPanelItem.setBasicProperty(target);
                            } else {
                                basicPropertyPanelItem.setBasicProperty(target);
                                // eslint-disable-next-line no-console
                                console.error(new WarpWorksError(`Cannot find OID ${oid} basic property OID ${oid} for ${entity.name}.${pageView.name}.${panel.name}.${basicPropertyPanelItem.name}.`));
                            }
                        }
                    });

                    panel.enumPanelItems.forEach((enumPanelItem) => {
                        // debug(`panel.enumPanelItems.forEach(): enumPanelItem=`, enumPanelItem);
                        const oid = enumPanelItem.hasEnumeration() ? enumPanelItem.getEnumeration() : null;
                        if (oid) {
                            const oid = enumPanelItem.enumeration;
                            const target = this.findElementByID(oid);
                            if (target) {
                                enumPanelItem.setEnumeration(target);
                            } else {
                                enumPanelItem.setEnumeration(null);
                                // eslint-disable-next-line no-console
                                console.error(new WarpWorksError(`Cannot find enumeration OID '${oid}' for '${entity.name}.${pageView.name}.${panel.name}.${enumPanelItem.name}'.`));
                            }
                        }
                    });
                });
            });
        });

        return this;
    }

    getEntityLabelByEntityName(entityName) {
        const entity = this.getEntityByName(entityName);
        return entity.label || entity.name;
    }
}

module.exports = Domain;
