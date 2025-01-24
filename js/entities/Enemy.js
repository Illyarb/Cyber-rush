import * as THREE from '../lib/three.module.js';
import { GLTFLoader } from '../lib/GLTFLoader.js';
import { Projectile } from './Projectile.js';

export class Enemy {
    constructor(scene, playerCar, soundManager) {
        this.scene = scene;
        this.playerCar = playerCar;
	this.soundManager = soundManager;
        this.speed = 0.8 * (1 + Math.random() * 0.5); //Give different speeds to enemies
        this.turnSpeed = 0.00001;
        this.lastShot = 0;
        this.SHOT_COOLDOWN = 1000 + Math.random() * 1000;
        this.target = playerCar.getObject().position;
        this.safeRadius = 10;
        this.modelLoaded = false;
        
        // Create main group for the enemy
        this.enemyGroup = new THREE.Group();
        
        // Initialize loader
        this.loader = new GLTFLoader();
        
        // Create visible temporary box as placeholder while model loads
        const tempBody = new THREE.Mesh(
            new THREE.BoxGeometry(2, 1, 4), // Increased size to match final model
            new THREE.MeshPhongMaterial({ color: 0xff0000 })
        );
        tempBody.castShadow = true;
        tempBody.receiveShadow = true;
        tempBody.position.y = 0.5;
        tempBody.name = 'temp-body';
        this.enemyGroup.add(tempBody);

        // Add gun
        this.gun = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 0.2, 1),
            new THREE.MeshPhongMaterial({ color: 0x000000 })
        );
        this.gun.position.y = 1.5;
        this.gun.position.z = 0.5;
        this.gun.castShadow = true;
        this.enemyGroup.add(this.gun);

        // Set initial position
        this.enemyGroup.position.y = 0.5;

        this.scene.add(this.enemyGroup);
        this.projectiles = [];

        // Load the enemy model
        this.loadModel();
    }

    loadModel() {
        this.loader.load(
            '../models/enemy.glb',  
            (gltf) => {
                console.log('Enemy model loaded successfully:', gltf);
                
                const model = gltf.scene;
                
                // Scale and position model
                model.scale.set(0.8,0.8,0.8);
                model.position.y = -0.2;
                model.rotation.y = Math.PI;

                // Process all meshes in the model
                model.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;

                        // Ensure material is properly set up
                        if (child.material) {
                            child.material.needsUpdate = true;
                            if (child.material.map) {
                                child.material.map.encoding = THREE.sRGBEncoding;
                            }
                            if (child.material.emissiveMap) {
                                child.material.emissiveMap.encoding = THREE.sRGBEncoding;
                            }
                            child.material.metalness = 0.8;
                            child.material.roughness = 0.4;
                            child.material.envMapIntensity = 1.0;
                        }
                    }
                });

                // Remove temporary body only after model is fully loaded
                const temp = this.enemyGroup.getObjectByName('temp-body');
                if (temp) {
                    this.enemyGroup.remove(temp);
                }

                // Add the model to the group
                this.enemyGroup.add(model);
                this.modelLoaded = true;

                // Ensure gun is properly positioned relative to the loaded model
                this.gun.position.y = 1.2;
                this.gun.position.z = 1.5;
            },
            (xhr) => {
                console.log(`Enemy model loading: ${Math.round((xhr.loaded / xhr.total) * 100)}% complete`);
            },
            (error) => {
                console.error('An error occurred while loading the enemy model:', error);
                // Keep temporary body visible if model fails to load
                const temp = this.enemyGroup.getObjectByName('temp-body');
                if (temp) {
                    temp.visible = true;
                }
            }
        );
    }

    update(collisionManager) {
        if (!this.playerCar) return;

        const playerPos = new THREE.Vector3();
        this.playerCar.getObject().getWorldPosition(playerPos);

        const enemyPos = new THREE.Vector3();
        this.enemyGroup.getWorldPosition(enemyPos);

        // Calculate distance to player
        const distanceToPlayer = enemyPos.distanceTo(playerPos);

        // Update target occasionally    
        if(Math.random() < 0.01) { // 1% chance each frame
            this.target = playerPos.clone();
        }

        const direction = new THREE.Vector3()
            .subVectors(this.target, enemyPos)
            .normalize();

        // Calculate potential new position
        const newPosition = new THREE.Vector3().copy(this.enemyGroup.position);
        const bufferZone = 2;
        const targetRadius = this.safeRadius;

        if (distanceToPlayer < targetRadius) {
            // When inside radius, move away at full speed
            const awayFromPlayer = new THREE.Vector3()
                .subVectors(enemyPos, playerPos)
                .normalize();

            newPosition.x += awayFromPlayer.x * this.speed;
            newPosition.z += awayFromPlayer.z * this.speed;
        } else if (distanceToPlayer < targetRadius + bufferZone) {
            // In the buffer zone, maintain position with small adjustments
            const difference = distanceToPlayer - targetRadius;
            const movementFactor = difference / bufferZone;

            newPosition.x += direction.x * this.speed * movementFactor * 0.1;
            newPosition.z += direction.z * this.speed * movementFactor * 0.1;
        } else {
            // Outside buffer zone, approach normally
            newPosition.x += direction.x * this.speed;
            newPosition.z += direction.z * this.speed;
        }

        // Check collision before applying movement
        if (!collisionManager.checkCollision(this.enemyGroup, newPosition, 1)) {
            this.enemyGroup.position.copy(newPosition);
        }

        // Rotate to face player
        const angle = Math.atan2(direction.x, direction.z);
        this.enemyGroup.rotation.y = -angle;

        // Update gun rotation to face player
        const gunDirection = new THREE.Vector3().subVectors(
            playerPos,
            this.gun.getWorldPosition(new THREE.Vector3())
        );
        const gunAngle = Math.atan2(gunDirection.x, gunDirection.z);
        this.gun.rotation.y = gunAngle - this.enemyGroup.rotation.y;

        this.tryShoot();
        this.updateProjectiles();
    }
async tryShoot() {
        const now = Date.now();
        if (now - this.lastShot < this.SHOT_COOLDOWN) return;

        const gunPosition = this.gun.getWorldPosition(new THREE.Vector3());
        const playerPosition = this.playerCar.getObject().position;

        const direction = new THREE.Vector3()
            .subVectors(playerPosition, gunPosition)
            .normalize();

        const projectile = new Projectile(gunPosition, direction, this.scene, 'enemy');
        projectile.source = 'enemy';
        this.projectiles.push(projectile);
        this.lastShot = now;

        await this.soundManager.playRandomGunshot();
    }
    updateProjectiles() {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            projectile.update();
            if (projectile.shouldRemove()) {
                projectile.remove(this.scene);
                this.projectiles.splice(i, 1);
            }
        }
    }

    setSafeRadius(radius) {
        this.safeRadius = radius;
    }

    getObject() {
        return this.enemyGroup;
    }

    cleanup() {
        this.projectiles.forEach(projectile => projectile.remove(this.scene));
        this.projectiles = [];
        this.scene.remove(this.enemyGroup);
    }
}

