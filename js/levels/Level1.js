import * as THREE from '../lib/three.module.js';
import { Car } from '../entities/Car.js';
import { Projectile } from '../entities/Projectile.js';
import { Enemy } from '../entities/Enemy.js';
import { GLTFLoader } from '../lib/GLTFLoader.js';
import { CollisionManager } from '../CollisionManager.js';

export default class Level1 {
	constructor(scene, camera, lighting) {
		this.scene = scene;
		this.camera = camera;
		this.lighting = lighting;
		this.lighting.setLightingCondition('night'); 
		this.car = null;
		this.soundManager = window.game.soundManager;  
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
		// Define street light colors, based on the dracula colour theme
		this.streetLightColors = [
			{ color: 0xff33cc, light: 0xff33cc }, 
			{ color: 0xff0066, light: 0xff0066 }, 
			{ color: 0xffff00, light: 0xffff00 }  
		];
	}

	async init() {
		// Setup ground
		const textureLoader = new THREE.TextureLoader();
		const stoneTexture = textureLoader.load('../assets/stone.png');
		stoneTexture.wrapS = THREE.RepeatWrapping;
		stoneTexture.wrapT = THREE.RepeatWrapping;
		stoneTexture.repeat.set(20, 20);
		// Setup the sky
		const skyTexture = textureLoader.load('../models/s5.jpg');
		skyTexture.mapping = THREE.EquirectangularReflectionMapping;
		this.scene.background = skyTexture;
		this.scene.environment = skyTexture;
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
		// Create 10 street lights at random positions
		for (let i = 0; i < 10; i++) {
			this.createStreetLight();
		}
		// My Building object
		this.loader = new GLTFLoader();
		this.loader.load(
			'../models/building1.glb',
			(gltf) => {
				console.log('Building loaded successfully');
				const building = gltf.scene;
				building.scale.set(1,1,1);
				building.position.set(20, 0, 20);
				building.rotation.y = Math.PI / 2;

				building.traverse((child) => {
					if (child.isMesh) {
						child.castShadow = true;
						child.receiveShadow = true;
					}
				});

				this.scene.add(building);
				this.collisionManager.addCollider(building, 'static', 15);
			},
			undefined,
			(error) => {
				console.error('Error loading building:', error);
			}
		);    
		// Setup the car
		this.car = new Car();
		this.scene.add(this.car.getObject());
		// Set up the players' Gun 
		this.gun = new THREE.Mesh(
			new THREE.BoxGeometry(0.2, 0.2, 1),
			new THREE.MeshPhongMaterial({ color: 0x000000 })
		);
		this.gun.position.y = 1;
		this.gun.position.z = -0.5;
		this.gun.castShadow = false;
		this.car.getObject().add(this.gun);
		// Add the lower conrner camera to the gun
		this.gunCamera = new THREE.PerspectiveCamera(
			75,
			window.innerWidth / window.innerHeight,
			0.1,
			1000
		);
		this.gunCamera.position.set(0, 0.2, 2);
		this.gunCamera.rotation.y = Math.PI;
		this.gun.add(this.gunCamera);
		const headlight = new THREE.SpotLight(0xFFAA00, 10); // Headlight of the car
		headlight.angle = Math.PI / 6;
		headlight.penumbra = 0.3;
		headlight.decay = 1;
		headlight.distance = 15;
		headlight.castShadow =  false;
		headlight.position.set(0, 0.5, -0.8);
		const headlightTarget = new THREE.Object3D();
		headlightTarget.position.set(0, 0, -5);
		this.car.getObject().add(headlightTarget);
		headlight.target = headlightTarget;
		this.car.getObject().add(headlight);
		this.collisionManager.addCollider(this.car.getObject(), 'player', 0.5);
		this.spawnEnemies(5); // Spawn 5 enemies
		document.addEventListener('mousemove', this.onMouseMove);
		document.addEventListener('click', this.onShoot);
	}

	createStreetLight() {
		const streetLightGroup = new THREE.Group();
		//Random positions  
		const x = (Math.random() - 0.5) * 100; 
		const z = (Math.random() - 0.5) * 100; 
		streetLightGroup.position.set(x, 0, z);

		// Random color selection
		const colorScheme = this.streetLightColors[Math.floor(Math.random() * this.streetLightColors.length)];

		// The street light pole
		const poleGeometry = new THREE.CylinderGeometry(0.1, 0.1, 3, 16);
		const poleMaterial = new THREE.MeshPhongMaterial({ color: 0x888888 });
		const pole = new THREE.Mesh(poleGeometry, poleMaterial);
		pole.position.y = 1.5;
		pole.castShadow = true;
		streetLightGroup.add(pole);
		// Bulb sphere
		const bulbGeometry = new THREE.SphereGeometry(0.2, 16, 16);
		const bulbMaterial = new THREE.MeshPhongMaterial({ 
			color: colorScheme.color,
			emissive: colorScheme.color
		});
		// The light source
		const bulb = new THREE.Mesh(bulbGeometry, bulbMaterial);
		bulb.position.y = 1.6;
		pole.add(bulb);
		const streetLight = new THREE.PointLight(colorScheme.light, 50, 40);
		streetLight.castShadow = true;
		bulb.add(streetLight);

		this.scene.add(streetLightGroup);
		this.collisionManager.addCollider(streetLightGroup, 'static', 0.3);
	}

	spawnEnemies(count) {
		for (let i = 0; i < count; i++) {
			const enemy = new Enemy(this.scene, this.car, this.soundManager);

			const x = (Math.random() - 0.5) * 180; 
			const z = (Math.random() - 0.5) * 180; 

			enemy.getObject().position.x = x;
			enemy.getObject().position.z = z;

			this.collisionManager.addCollider(enemy.getObject(), 'enemy', 1);
			this.enemies.push(enemy);
		}
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
		this.healthDisplay.innerHTML = '🧡'.repeat(this.playerHealth);

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

	onShoot(event) {
		const now = Date.now();
		if (now - this.lastShot < this.SHOT_COOLDOWN) {
			return;
		}

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
	}

	update(controls) {
		if (this.car) {
			this.car.update(controls, this.collisionManager);
		}
		this.updateGunRotation();
		this.updateProjectiles();
		this.handleProjectileCollisions(); 
		if (this.enemies.length > 0) {
			this.enemies.forEach((enemy) => {
				enemy.update(this.collisionManager);
			});
		}
	}

	handleProjectileCollisions() {
		const playerPosition = this.car.getObject().position;
		const COLLISION_THRESHOLD = 2;
		// For every nemy projectiles that has collided
		this.enemies.forEach(enemy => {
			for (let i = enemy.projectiles.length - 1; i >= 0; i--) {
				const projectile = enemy.projectiles[i];
				const projectilePosition = projectile.mesh.position;
				// Calculate distance between projectile and player
				const distance = projectilePosition.distanceTo(playerPosition);

				if (distance < COLLISION_THRESHOLD) {
					console.log('Projectile hit player!');
					const now = Date.now();

					if (now - this.lastHitTime > this.invincibilityTime) {
						this.playerHealth = Math.max(0, this.playerHealth - 1);
						this.lastHitTime = now;
						this.updateHealthDisplay();

						if (this.playerHealth <= 0) {
							console.log('Player died!');
							this.gameOver();
						}
					}

					// Remove the projectile
					projectile.remove(this.scene);
					enemy.projectiles.splice(i, 1);
				}
			}
		});

		// Process player projectiles
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

	getTarget() {
		return this.car ? this.car.getObject() : null;
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
}
