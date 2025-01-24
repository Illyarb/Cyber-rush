import * as THREE from './lib/three.module.js';

export class CollisionManager {
    constructor() {
        this.colliders = [];
    }

    // Add a new collider with its type and collision radius
    addCollider(object, type, radius) {
        this.colliders.push({
            object,
            type,
            radius,
            id: object.uuid,
            name: object.name || 'unnamed'
        }); }

    // Check if one object is part of another's 
    isPartOfObject(child, parent) {
        let node = child;
        while (node !== null) {
            if (node === parent) return true;
            node = node.parent;
        }
        return false;
    }

    // Check for collisions in new position
    checkCollision(object, newPosition, radius) {
        for (const collider of this.colliders) {
            // Make sure we aren't fireing at ourselves
            if (collider.object === object || 
                this.isPartOfObject(object, collider.object) || 
                this.isPartOfObject(collider.object, object)) {
                continue;
            }

            const colliderPos = new THREE.Vector3();
            collider.object.getWorldPosition(colliderPos);

            const distance = newPosition.distanceTo(colliderPos);
            const combinedRadius = radius + collider.radius;

            if (distance < combinedRadius) {
                return collider;
            }
        }
        return null;
    }

    // Check projectile collisions 
    checkProjectileCollision(projectile) {
        const projectilePos = new THREE.Vector3();
        projectile.mesh.getWorldPosition(projectilePos);
        
        for (const collider of this.colliders) {
	    // Make sure we aren't fireing at ourselves
            if (collider.type === 'static' || 
                (projectile.source === 'player' && collider.type === 'player') ||
                (projectile.source === 'enemy' && collider.type === 'enemy')) {
                continue;
            }
            
            const colliderPos = new THREE.Vector3();
            collider.object.getWorldPosition(colliderPos);
            
            const distance = projectilePos.distanceTo(colliderPos);
            const combinedRadius = 0.2 + collider.radius;
            
            if (distance < combinedRadius) {
                return collider;
            }
        }
        
        return null;
    }

    removeCollider(object) {
        const index = this.colliders.findIndex(c => c.object === object);
        if (index !== -1) {
            this.colliders.splice(index, 1);
        }
    }
}
