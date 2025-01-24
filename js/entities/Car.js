import { GLTFLoader } from '../lib/GLTFLoader.js';
import * as THREE from '../lib/three.module.js';
import { CollisionManager } from '../CollisionManager.js';

class Car {
    constructor() {
        this.speed = 0.7;
        this.turnSpeed = 0.07;
        this.maxSteeringAngle = 0.5;
        this.steeringAngle = 0;

        // Create main group for the car
        this.carGroup = new THREE.Group();
        
        // Initialize loader
        this.loader = new GLTFLoader();
        
        // Create temporary box as placeholder while model loads
        const tempBody = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 2),
            new THREE.MeshPhongMaterial({ color: 0xff0000 })
        );
        tempBody.visible = false;
        this.carGroup.add(tempBody);

        // Load the model
        this.loadModel();

        // Create wheels
        this.setupWheels();

        // Add lights
        this.setupLights();
    }

    setupLights() {
        // Headlights
        const createHeadlight = (x) => {
            const headlightGroup = new THREE.Group();
            
            // Headlight bulb (visible part)
            const bulbGeometry = new THREE.SphereGeometry(0.05, 16, 16);
            const bulbMaterial = new THREE.MeshPhongMaterial({ 
                color: 0xffffcc,
                emissive: 0xffffcc,
                emissiveIntensity: 0.5
            });
            const bulb = new THREE.Mesh(bulbGeometry, bulbMaterial);
            headlightGroup.add(bulb);

            // Actual light source
            const light = new THREE.SpotLight(0xffffcc, 2);
            light.angle = Math.PI / 6;
            light.penumbra = 0.3;
            light.decay = 1;
            light.distance = 12;
            light.castShadow = true;
            
            // Create and set target for the spotlight
            const target = new THREE.Object3D();
            target.position.set(0, 0, -5);
            headlightGroup.add(target);
            light.target = target;
            
            headlightGroup.add(light);
            return headlightGroup;
        };

        // Create and position left headlight
        const leftHeadlight = createHeadlight();
        leftHeadlight.position.set(-0.4, 0.5, 1.8);
        this.carGroup.add(leftHeadlight);

        // Create and position right headlight
        const rightHeadlight = createHeadlight();
        rightHeadlight.position.set(0.4, 0.5, 1.8);
        this.carGroup.add(rightHeadlight);

        // Taillights
        const createTaillight = () => {
            const tailLightGroup = new THREE.Group();

            // Taillight housing (visible part)
            const housingGeometry = new THREE.BoxGeometry(0.1, 0.05, 0.02);
            const housingMaterial = new THREE.MeshPhongMaterial({ 
                color: 0xff0000,
                emissive: 0xff0000,
                emissiveIntensity: 0.5
            });
            const housing = new THREE.Mesh(housingGeometry, housingMaterial);
            tailLightGroup.add(housing);

            // Actual light source (subtle glow)
            const light = new THREE.PointLight(0xff0000, 0.5, 2);
            light.position.z = 0.1;
            tailLightGroup.add(light);

            return tailLightGroup;
        };

        // Create and position left taillight
        const leftTaillight = createTaillight();
        leftTaillight.position.set(-0.4, 0.5, -1.8);
        this.carGroup.add(leftTaillight);

        // Create and position right taillight
        const rightTaillight = createTaillight();
        rightTaillight.position.set(0.4, 0.5, -1.8);
        this.carGroup.add(rightTaillight);
    }

    loadModel() {
        this.loader.load(
            '../models/car.glb',
            (gltf) => {
                console.log('Model loaded successfully:', gltf);

                const temp = this.carGroup.getObjectByName('temp-body');
                if (temp) this.carGroup.remove(temp);

                const model = gltf.scene;

                model.scale.set(0.5, 0.5, 0.5);
                model.position.y = 0.5;
                model.rotation.y = Math.PI;

                model.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;

                        if (child.material) {
                            child.material.needsUpdate = true;
                            child.material.map && (child.material.map.encoding = THREE.sRGBEncoding);
                            child.material.emissiveMap && (child.material.emissiveMap.encoding = THREE.sRGBEncoding);
                            child.material.metalness = 1.0;
                            child.material.roughness = 0.4;
                            child.material.envMapIntensity = 1.5;
                            child.material.needsUpdate = true;
                        }
                    }
                });

                this.carGroup.add(model);
            },
            (xhr) => {
                console.log(`Model loading: ${Math.round((xhr.loaded / xhr.total) * 100)}% complete`);
            },
            (error) => {
                console.error('An error occurred while loading the model:', error);
            }
        );
    }

    setupWheels() {
        this.wheelRadius = 0.4;

        // Front wheels
        const flWheel = this.createWheel();
        flWheel.position.set(-0.9, this.wheelRadius, 1.6);

        const frWheel = this.createWheel();
        frWheel.position.set(0.9, this.wheelRadius, 1.6);

        // Rear wheels in groups for steering
        this.rearLeftWheelGroup = new THREE.Group();
        const rlWheel = this.createWheel();
        this.rearLeftWheelGroup.add(rlWheel);
        this.rearLeftWheelGroup.position.set(-0.9, this.wheelRadius, -1.1);

        this.rearRightWheelGroup = new THREE.Group();
        const rrWheel = this.createWheel();
        this.rearRightWheelGroup.add(rrWheel);
        this.rearRightWheelGroup.position.set(0.9, this.wheelRadius, -1.1);

        this.carGroup.add(
            flWheel,
            frWheel,
            this.rearLeftWheelGroup,
            this.rearRightWheelGroup
        );
    }

    createWheel() {
        const wheelGeometry = new THREE.CylinderGeometry(this.wheelRadius, this.wheelRadius, 0.2, 12);
        const wheelMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
        const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheel.rotation.z = Math.PI / 2;
        wheel.castShadow = true;
        return wheel;
    }

    update(controls, collisionManager) {
        let moved = false;
        const newPosition = new THREE.Vector3().copy(this.carGroup.position);

        if (controls.isPressed('KeyW')) {
            const nextPos = new THREE.Vector3().copy(newPosition);
            nextPos.z -= Math.cos(this.carGroup.rotation.y) * this.speed;
            nextPos.x -= Math.sin(this.carGroup.rotation.y) * this.speed;

            if (collisionManager) {
                const hasCollision = collisionManager.checkCollision(this.carGroup, nextPos, 1);
                if (!hasCollision) {
                    this.carGroup.position.copy(nextPos);
                    moved = true;
                }
            } else {
                this.carGroup.position.copy(nextPos);
                moved = true;
            }
        }

        if (controls.isPressed('KeyS') && !moved) {
            const nextPos = new THREE.Vector3().copy(newPosition);
            nextPos.z += Math.cos(this.carGroup.rotation.y) * this.speed;
            nextPos.x += Math.sin(this.carGroup.rotation.y) * this.speed;

            if (collisionManager) {
                const hasCollision = collisionManager.checkCollision(this.carGroup, nextPos, 1);
                if (!hasCollision) {
                    this.carGroup.position.copy(nextPos);
                }
            } else {
                this.carGroup.position.copy(nextPos);
            }
        }

        if (controls.isPressed('KeyA')) {
            this.carGroup.rotation.y += this.turnSpeed;
            this.steeringAngle += this.turnSpeed;
            if (this.steeringAngle > this.maxSteeringAngle) {
                this.steeringAngle = this.maxSteeringAngle;
            }
        }
        else if (controls.isPressed('KeyD')) {
            this.carGroup.rotation.y -= this.turnSpeed;
            this.steeringAngle -= this.turnSpeed;
            if (this.steeringAngle < -this.maxSteeringAngle) {
                this.steeringAngle = -this.maxSteeringAngle;
            }
        }
        else {
            if (this.steeringAngle > 0) {
                this.steeringAngle = Math.max(0, this.steeringAngle - 0.02);
            } else if (this.steeringAngle < 0) {
                this.steeringAngle = Math.min(0, this.steeringAngle + 0.02);
            }
        }

        this.rearLeftWheelGroup.rotation.y = this.steeringAngle;
        this.rearRightWheelGroup.rotation.y = this.steeringAngle;
    }

    getObject() {
        return this.carGroup;
    }
}

export { Car };
