import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';

export function createPostFX(renderer, scene, camera, opts = {}) {
    const width = renderer.domElement.clientWidth || window.innerWidth;
    const height = renderer.domElement.clientHeight || window.innerHeight;
    const pixelRatio = renderer.getPixelRatio();

    const composer = new EffectComposer(renderer);
    composer.setSize(width, height);

    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const outlinePass = new OutlinePass(
        new THREE.Vector2(width, height), scene, camera
    );
    outlinePass.edgeStrength = opts.outlineStrength ?? 2.0;
    outlinePass.edgeThickness = opts.outlineThickness ?? 1.0;
    outlinePass.edgeGlow = 0.0;
    outlinePass.pulsePeriod = 0;
    outlinePass.visibleEdgeColor.set(opts.outlineColor ?? 0x000000);
    outlinePass.hiddenEdgeColor.set(0x000000);
    composer.addPass(outlinePass);

    // Brighter "hover/target" outline — populated with the entity under
    // the cursor (and/or the selected target) so it pops over the soft
    // black world silhouette above.
    const hoverOutlinePass = new OutlinePass(
        new THREE.Vector2(width, height), scene, camera
    );
    hoverOutlinePass.edgeStrength = opts.hoverOutlineStrength ?? 5.0;
    hoverOutlinePass.edgeThickness = opts.hoverOutlineThickness ?? 1.2;
    hoverOutlinePass.edgeGlow = 0.6;
    hoverOutlinePass.pulsePeriod = 0;
    hoverOutlinePass.visibleEdgeColor.set(opts.hoverOutlineColor ?? 0xff5050);
    hoverOutlinePass.hiddenEdgeColor.set(0x661a1a);
    composer.addPass(hoverOutlinePass);

    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(width, height),
        opts.bloomStrength ?? 0.25,
        opts.bloomRadius ?? 0.4,
        opts.bloomThreshold ?? 0.85
    );
    composer.addPass(bloomPass);

    const fxaaPass = new ShaderPass(FXAAShader);
    fxaaPass.material.uniforms['resolution'].value.set(
        1 / (width * pixelRatio), 1 / (height * pixelRatio)
    );
    composer.addPass(fxaaPass);

    const outputPass = new OutputPass();
    composer.addPass(outputPass);

    function setSize(w, h) {
        composer.setSize(w, h);
        outlinePass.setSize(w, h);
        hoverOutlinePass.setSize(w, h);
        bloomPass.setSize(w, h);
        const pr = renderer.getPixelRatio();
        fxaaPass.material.uniforms['resolution'].value.set(
            1 / (w * pr), 1 / (h * pr)
        );
    }

    return { composer, renderPass, outlinePass, hoverOutlinePass, bloomPass, fxaaPass, setSize };
}
