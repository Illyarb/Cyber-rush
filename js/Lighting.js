import * as THREE from './lib/three.module.js';

export class Lighting {
    constructor(scene) {
        this.scene = scene;
        this.lights = {
            ambient: null,
            directional: null
        };
    }

    setLightingCondition(condition) {
        this.cleanup();

        switch (condition) {
            case 'day':
                this.setupDayLighting();
                break;
            case 'night':
                this.setupNightLighting();
                break;
            default:
                console.warn('Unknown lighting condition:', condition);
                this.setupNightLighting(); // Default to night lighting
        }
    }

    setupDayLighting() {
        this.lights.ambient = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(this.lights.ambient);
	//Sun light
        this.lights.directional = new THREE.DirectionalLight(0xffffff, 1.0);
        this.lights.directional.position.set(50, 100, 50);
        this.lights.directional.castShadow = true;
	

	//Configure the shaodw 
        this.lights.directional.shadow.mapSize.width = 2048;
        this.lights.directional.shadow.mapSize.height = 2048;
        this.lights.directional.shadow.camera.near = 0.1;
        this.lights.directional.shadow.camera.far = 500;
        this.lights.directional.shadow.camera.left = -100;
        this.lights.directional.shadow.camera.right = 100;
        this.lights.directional.shadow.camera.top = 100;
        this.lights.directional.shadow.camera.bottom = -100;
        this.lights.directional.shadow.bias = -0.0001;

        this.scene.add(this.lights.directional);
    }

    setupNightLighting() {
        // Moon ambient light for night time
        this.lights.ambient = new THREE.AmbientLight(0x1a1a2a, 0.1);
        this.scene.add(this.lights.ambient);

        // No directional light at night - we'll rely on street lights
    }


    cleanup() {
        // Remove existing lights from the scene
        if (this.lights.ambient) {
            this.scene.remove(this.lights.ambient);
            this.lights.ambient = null;
        }
        if (this.lights.directional) {
            this.scene.remove(this.lights.directional);
            this.lights.directional = null;
        }
    }
}
