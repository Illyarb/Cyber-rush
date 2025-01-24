import * as THREE from '../lib/three.module.js';

export class Projectile {
    constructor(position, direction, scene, source = 'enemy') {
        this.source = source;
        const projectileColor = this.source === 'player' ? 0xff00ff : 0xff8c00;

        // Create a larger, more visible projectile
        this.mesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.4, 8, 8), // Increased size from 0.2 to 0.4
            new THREE.MeshPhongMaterial({ 
                color: projectileColor,
                emissive: projectileColor,
                emissiveIntensity: 0.8,
            })
        );

        this.mesh.position.copy(position);
        this.direction = direction;
        this.speed = 2; // Slightly increased speed
        this.lifespan = 2000;
        this.created = Date.now();

        // Create a point light for illumination
        this.light = new THREE.PointLight(projectileColor, 2, 4);
        this.light.position.copy(position);

        // Store previous position for interpolation
        this.previousPosition = position.clone();

        scene.add(this.mesh);
        scene.add(this.light);
    }

    update() {
        // Store previous position
        this.previousPosition.copy(this.mesh.position);

        // Move the projectile
        this.mesh.position.x += this.direction.x * this.speed;
        this.mesh.position.z += this.direction.z * this.speed;

        // Keep the light in sync with the projectile mesh
        this.light.position.copy(this.mesh.position);
    }

    shouldRemove() {
        return Date.now() - this.created > this.lifespan;
    }

    remove(scene) {
        scene.remove(this.mesh);
        scene.remove(this.light);
    }
}

