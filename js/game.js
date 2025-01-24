import * as THREE from './lib/three.module.js';
import { MenuUI } from './Menu.js';
import { Camera } from './Camera.js';
import { Lighting } from './Lighting.js';
import { Controls } from './controls.js';
import { SoundManager } from './SoundManager.js';

let gameInstance = null;
class Game {
	constructor() {

		//Make a global variable to store the game instance, for the sound manager to access
		if (gameInstance) {
			return gameInstance;
		}
		gameInstance = this;
		window.game = this;  
		this.soundManager = new SoundManager();
		this.scene = null;
		this.renderer = null;
		this.camera = null;
		this.lighting = null;
		this.controls = null;
		this.menuUI = null;
		this.currentLevel = null;
		this.isGameActive = false;
		// Initialize core systems
		this.init();

		this.animate = this.animate.bind(this); //Start the animation loop
		requestAnimationFrame(this.animate);
	}

	init() {
		this.scene = new THREE.Scene();


		// Initialize renderer with PBR support for the metallic material
		this.renderer = new THREE.WebGLRenderer({ 
			antialias: true,
			physicallyCorrectLights: true
		});
		this.renderer.setSize(window.innerWidth, window.innerHeight);
		this.renderer.shadowMap.enabled = true;
		this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
		this.renderer.toneMappingExposure = 1;

		document.getElementById('gameContainer').appendChild(this.renderer.domElement);

		// Initialise the camera
		this.camera = new Camera(this.scene);

		this.lighting = new Lighting(this.scene);
		this.controls = new Controls();
		this.menuUI = new MenuUI();
		this.setupMenuListeners();

		// Show menu initially when the game starts
		this.menuUI.show();

		// For resizing the window
		window.addEventListener('resize', () => this.onWindowResize(), false);
	}
	//Select the level
	setupMenuListeners() {
		document.addEventListener('DOMContentLoaded', () => {
			const level1Btn = document.getElementById('level1Btn');
			const level2Btn = document.getElementById('level2Btn');

			if (level1Btn) {
				level1Btn.addEventListener('click', () => this.startLevel(1));
			} 

			if (level2Btn) {
				level2Btn.addEventListener('click', () => this.startLevel(2));
			} 

		});
	}


	async startLevel(levelNumber) {
		// Hide menu
		this.menuUI.hide();

		// Clear previous level if exists
		if (this.currentLevel) {
			this.currentLevel.cleanup();
		}

		try {
			const LevelModule = await import(`./levels/Level${levelNumber}.js`);
			this.currentLevel = new LevelModule.default(this.scene, this.camera, this.lighting);
			await this.currentLevel.init();
			this.soundManager.playEngineStart();
			this.isGameActive = true; // Start the game 

		} catch (error) {
			console.error(`Error loading level ${levelNumber}:`, error);
		}
	}

	onWindowResize() {
		if (this.camera) {
			this.camera.instance.aspect = window.innerWidth / window.innerHeight;
			this.camera.instance.updateProjectionMatrix();
		}
		if (this.renderer) {
			this.renderer.setSize(window.innerWidth, window.innerHeight);
		}
	}

	update() {
		if (this.isGameActive && this.currentLevel) {
			// Update current level
			this.currentLevel.update(this.controls);
			// Update camera
			if (this.currentLevel.getTarget()) {
				this.camera.followTarget(this.currentLevel.getTarget());
			}
		}

	}

	animate() {
		requestAnimationFrame(this.animate);
		this.update();
		if (this.renderer && this.scene && this.camera && this.currentLevel) {
			// Render main camera
			this.renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
			this.renderer.setScissorTest(false);
			this.renderer.clear();
			this.renderer.render(this.scene, this.camera.instance);
			// Lower right corner camera
			if (this.currentLevel.gunCamera) {
				const smallW = window.innerWidth / 4;
				const smallH = window.innerHeight / 4;
				const smallX = window.innerWidth - smallW;
				const smallY = 0;

				this.renderer.setViewport(smallX, smallY, smallW, smallH);
				this.renderer.setScissor(smallX, smallY, smallW, smallH);
				this.renderer.setScissorTest(true);
				this.renderer.clearDepth();
				this.renderer.render(this.scene, this.currentLevel.gunCamera);
			}
		}
	}

	// Helper method to get the menu
	returnToMenu() {
		this.isGameActive = false;
		if (this.currentLevel) {
			this.currentLevel.cleanup();
			this.currentLevel = null;
		}
		this.menuUI.show();
	}
}

export { Game };
