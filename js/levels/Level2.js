import * as THREE from '../lib/three.module.js';
import { Car } from '../entities/Car.js';
import { Projectile } from '../entities/Projectile.js';
import { Enemy } from '../entities/Enemy.js';
import { Lighting } from '../Lighting.js';
import { CollisionManager } from '../CollisionManager.js';
import { GLTFLoader } from '../lib/GLTFLoader.js';

export default class Level2 {  
	constructor(scene, camera, lighting) {
		this.scene = scene;
		this.camera = camera;
		this.lighting = new Lighting(scene);
		this.lighting.setLightingCondition('day');
		this.car = null;
		this.gun = null;
		this.gunCamera = null;
		this.projectiles = [];
		this.enemies = [];
		this.lastShot = 0;
		this.SHOT_COOLDOWN = 250;
		this.collisionManager = new CollisionManager(); 
		// Health system
		this.playerHealth = 10;
		this.lastHitTime = 0;
		this.invincibilityTime = 100; 
		this.createHealthDisplay();
		this.raycaster = new THREE.Raycaster();
		this.mouse = new THREE.Vector2();
		this.onMouseMove = this.onMouseMove.bind(this);
		this.onShoot = this.onShoot.bind(this);
	}

	createHealthDisplay() {
		this.healthDisplay = document.createElement('div');
		this.healthDisplay.style.position = 'absolute';
		this.healthDisplay.style.top = '20px';
		this.healthDisplay.style.left = '20px';
		this.healthDisplay.style.color = 'red';
		this.healthDisplay.style.fontSize = '24px';
		this.updateHealthDisplay();
		document.body.appendChild(this.healthDisplay);
	}

	updateHealthDisplay() {
		this.healthDisplay.innerHTML = '❤️ '.repeat(this.playerHealth);
	}

	addKone() {
		const geometry = new THREE.ConeGeometry(6, 9, 48);
		const material = new THREE.MeshPhongMaterial({ color: 0xEEEEEE });
		const cone = new THREE.Mesh(geometry, material);
		const x = (Math.random() - 0.5) * 80;
		const z = (Math.random() - 0.5) * 80;
		cone.position.set(x, 3, z);
		cone.castShadow = true;
		cone.receiveShadow = true;
		this.scene.add(cone);
		this.collisionManager.addCollider(cone, 'static', 3);
	}
	// Load the lovely dinosaur model 
	loadDinosaur() {
		const loader = new GLTFLoader();
		loader.load(
			'../models/dia.glb',
			(gltf) => {
				const dinosaur = gltf.scene;
				const x = (Math.random() - 0.5) * 80; //Make sure its spawned somewhere close 
				const z = (Math.random() - 0.5) * 80;
				dinosaur.position.set(x, 0, z);
				dinosaur.scale.set(3, 3, 3);
				dinosaur.traverse((child) => {
					if (child.isMesh) {
						child.castShadow = true;
						child.receiveShadow = true;
					}
				});

				this.scene.add(dinosaur);
				this.collisionManager.addCollider(dinosaur, 'static', 3);
			},
			undefined,
			(error) => {
				console.error('Error loading dinosaur model:', error);
			}
		);
	}
	async init() {
		const textureLoader = new THREE.TextureLoader();
		const skyTexture = textureLoader.load('../models/sky.jpg');
		skyTexture.mapping = THREE.EquirectangularReflectionMapping;
		this.scene.background = skyTexture;
		this.scene.environment = skyTexture;

		const stoneTexture = textureLoader.load('../assets/sand.png');
		stoneTexture.wrapS = THREE.RepeatWrapping;
		stoneTexture.wrapT = THREE.RepeatWrapping;
		stoneTexture.repeat.set(20, 20);

		const plane = new THREE.Mesh(
			new THREE.PlaneGeometry(200, 200),
			new THREE.MeshPhongMaterial({ 
				map: stoneTexture,
				side: THREE.DoubleSide 
			})
		);

		plane.rotation.x = Math.PI / 2;
		plane.receiveShadow = true;
		plane.name = 'ground';
		this.scene.add(plane);
		this.plane = plane;

		this.loadDinosaur();
		this.addKone();

		// Setup car with collision
		this.car = new Car();
		this.scene.add(this.car.getObject());
		this.collisionManager.addCollider(this.car.getObject(), 'player', 0.5);

		this.gun = new THREE.Mesh(
			new THREE.BoxGeometry(0.2, 0.2, 1),
			new THREE.MeshPhongMaterial({ color: 0x000000 })
		);
		this.gun.position.y = 1;
		this.gun.position.z = -0.5;
		this.gun.castShadow = false;
		this.car.getObject().add(this.gun);

		this.gunCamera = new THREE.PerspectiveCamera(
			75,
			window.innerWidth / window.innerHeight,
			0.1,
			1000
		);
		this.gunCamera.position.set(0, 0.2, 2);
		this.gunCamera.rotation.y = Math.PI;
		this.gun.add(this.gunCamera);

		this.spawnEnemies(3);

		document.addEventListener('mousemove', this.onMouseMove);
		document.addEventListener('click', this.onShoot);
	}

	spawnEnemies(count) {
		for (let i = 0; i < count; i++) {
			const enemy = new Enemy(this.scene, this.car);
			const angle = (Math.PI * 2 / count) * i;
			const radius = 20;
			enemy.getObject().position.x = Math.cos(angle) * radius;
			enemy.getObject().position.z = Math.sin(angle) * radius;

			this.collisionManager.addCollider(enemy.getObject(), 'enemy', 1);
			this.enemies.push(enemy);
		}
	}

	onMouseMove(event) {
		this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
		this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
	}

	updateGunRotation() {
		this.raycaster.setFromCamera(this.mouse, this.camera.instance);
		const intersects = this.raycaster.intersectObject(this.plane);

		if (intersects.length > 0) {
			const point = intersects[0].point;
			const direction = new THREE.Vector3().subVectors(point, this.gun.getWorldPosition(new THREE.Vector3()));
			const angle = Math.atan2(direction.x, direction.z);
			this.gun.rotation.y = angle - this.car.getObject().rotation.y;
		}
	}

	onShoot() {
		const now = Date.now();
		if (now - this.lastShot < this.SHOT_COOLDOWN) return;

		const gunPosition = this.gun.getWorldPosition(new THREE.Vector3());
		this.raycaster.setFromCamera(this.mouse, this.camera.instance);
		const intersects = this.raycaster.intersectObject(this.plane);

		if (intersects.length > 0) {
			const targetPoint = intersects[0].point;
			const direction = new THREE.Vector3()
				.subVectors(targetPoint, gunPosition)
				.normalize();

			const projectile = new Projectile(gunPosition, direction, this.scene, 'player');
			this.projectiles.push(projectile);
			this.lastShot = now;
		}
	}

	updateProjectiles() {
		this.projectiles.forEach(projectile => projectile.update());
		this.projectiles = this.projectiles.filter(projectile => {
			if (projectile.shouldRemove()) {
				projectile.remove(this.scene);
				return false;
			}
			return true;
		});

		// Update enemy projectiles
		this.enemies.forEach(enemy => {
			enemy.projectiles.forEach(projectile => projectile.update());
			enemy.projectiles = enemy.projectiles.filter(projectile => {
				if (projectile.shouldRemove()) {
					projectile.remove(this.scene);
					return false;
				}
				return true;
			});
		});
	}

	handleProjectileCollisions() {
		const playerPosition = this.car.getObject().position;
		const COLLISION_THRESHOLD = 2;

		this.enemies.forEach(enemy => { // Check for enemy projectiles
			for (let i = enemy.projectiles.length - 1; i >= 0; i--) {
				const projectile = enemy.projectiles[i];
				const projectilePosition = projectile.mesh.position;
				const distance = projectilePosition.distanceTo(playerPosition);

				if (distance < COLLISION_THRESHOLD) {
					const now = Date.now();

					if (now - this.lastHitTime > this.invincibilityTime) {
						this.playerHealth = Math.max(0, this.playerHealth - 1);
						this.lastHitTime = now;
						this.updateHealthDisplay();

						if (this.playerHealth <= 0) {
							this.gameOver();
						}
					}

					// Remove the projectile
					projectile.remove(this.scene);
					enemy.projectiles.splice(i, 1);
				}
			}
		});
		// For the player's projectiles 
		for (let i = this.projectiles.length - 1; i >= 0; i--) {
			const projectile = this.projectiles[i];
			const hitCollider = this.collisionManager.checkProjectileCollision(projectile);

			if (hitCollider) {
				if (hitCollider.type === 'enemy') {
					const enemyIndex = this.enemies.findIndex(
						enemy => enemy.getObject() === hitCollider.object
					);

					if (enemyIndex !== -1) {
						this.enemies[enemyIndex].cleanup();
						this.enemies.splice(enemyIndex, 1);
						this.collisionManager.removeCollider(hitCollider.object);
					}
				}

				projectile.remove(this.scene);
				this.projectiles.splice(i, 1);
			}
		}
	}

	update(controls) {
		if (this.car) {
			this.car.update(controls, this.collisionManager);
		}

		this.updateGunRotation();
		this.updateProjectiles();
		this.handleProjectileCollisions();

		if (this.enemies.length > 0) {
			this.enemies.forEach(enemy => {
				enemy.update(this.collisionManager);
			});
		}
	}

	gameOver() {
		this.cleanup();

		const gameOverDiv = document.createElement('div');
		gameOverDiv.style.position = 'absolute';
		gameOverDiv.style.top = '50%';
		gameOverDiv.style.left = '50%';
		gameOverDiv.style.transform = 'translate(-50%, -50%)';
		gameOverDiv.style.color = 'red';
		gameOverDiv.style.fontSize = '48px';
		gameOverDiv.innerHTML = 'GAME OVER';
		document.body.appendChild(gameOverDiv);

		setTimeout(() => {
			document.body.removeChild(gameOverDiv);
			window.game.returnToMenu();
		}, 2000);
	}

	cleanup() {
		document.removeEventListener('mousemove', this.onMouseMove);
		document.removeEventListener('click', this.onShoot);

		if (this.car) {
			this.scene.remove(this.car.getObject());
		}

		this.projectiles.forEach(projectile => projectile.remove(this.scene));
		this.projectiles = [];

		this.enemies.forEach(enemy => enemy.cleanup());
		this.enemies = [];

		if (this.healthDisplay && this.healthDisplay.parentNode) {
			this.healthDisplay.parentNode.removeChild(this.healthDisplay);
		}
	}

	getTarget() {
		return this.car ? this.car.getObject() : null;
	}
}
