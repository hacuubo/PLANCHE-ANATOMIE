// Ombres de contact (occlusion ambiante en espace écran) : les creux, les jonctions entre structures (cordages et
// feuillets, piliers et paroi, coronaires et sillons, valves et anneau) s'assombrissent doucement, comme dans une
// animation 3D calculée.
//
// La scène est rendue dans une cible hors écran (couleur HDR + profondeur/stencil, multi-échantillonnée) ; l'occlusion
// est calculée à partir de CETTE profondeur, donc de l'image réellement affichée : plans de coupe, capuchons stencil
// et déformation du battement compris (une passe toute faite redessinerait la scène sans coupe ni battement).
// Normales reconstruites depuis la profondeur, échantillonnage en spirale (demi-résolution), flou bilatéral à la
// recomposition, puis tonalité et espace de couleur de sortie identiques au rendu direct.
// Les éléments d'interface 3D (flèches de la circulation, calque 1) sont dessinés après, sans ombrage.
import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

const AO_FRAG = /* glsl */`
uniform sampler2D tDepth;
uniform mat4 uProj, uProjInv;
uniform vec2 uTexel;      // 1 / taille de la profondeur (pleine résolution)
uniform float uRadius;    // rayon d'influence (cm)
uniform float uIntensity;
varying vec2 vUv;
#define NS 14
vec3 viewPos(vec2 uv) {
  float d = texture2D(tDepth, uv).x;
  vec4 v = uProjInv * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);
  return v.xyz / v.w;
}
void main() {
  float d = texture2D(tDepth, vUv).x;
  if (d >= 1.0) { gl_FragColor = vec4(1.0); return; }
  vec3 P = viewPos(vUv);
  // normale : différences du côté le plus proche en profondeur (pas de halo aux silhouettes)
  vec3 pr = viewPos(vUv + vec2(uTexel.x, 0.0)), pl = viewPos(vUv - vec2(uTexel.x, 0.0));
  vec3 pu = viewPos(vUv + vec2(0.0, uTexel.y)), pd = viewPos(vUv - vec2(0.0, uTexel.y));
  vec3 dx = abs(pr.z - P.z) < abs(P.z - pl.z) ? pr - P : P - pl;
  vec3 dy = abs(pu.z - P.z) < abs(P.z - pd.z) ? pu - P : P - pd;
  vec3 Nc = cross(dx, dy);
  if (dot(Nc, Nc) < 1e-14) { gl_FragColor = vec4(1.0); return; } // normale indéterminée : pas d'occlusion
  vec3 N = normalize(Nc);
  vec2 rUv = vec2(uProj[0][0], uProj[1][1]) * 0.5 * uRadius / max(-P.z, 0.1);
  // rotation de la spirale selon un motif régulier 4 × 4, que le flou 4 × 4 de la recomposition annule exactement
  vec2 cell = mod(floor(gl_FragCoord.xy), 4.0);
  float a0 = (cell.x * 4.0 + cell.y + 0.5) / 16.0 * 6.2831853, R2 = uRadius * uRadius, occ = 0.0;
  for (int i = 0; i < NS; i++) {
    float t = (float(i) + 0.5) / float(NS);
    float a = a0 + t * 6.2831853 * 3.0;
    vec3 Q = viewPos(vUv + vec2(cos(a), sin(a)) * t * rUv);
    vec3 v = Q - P;
    float vv = dot(v, v);
    float fall = 1.0 - smoothstep(0.4 * R2, R2, vv);       // occultants lointains ignorés
    // angle d'élévation de l'occultant au-dessus du plan tangent (insensible aux surfaces vues en biais)
    occ += fall * max(dot(v, N) * inversesqrt(vv + 1e-6) - 0.2, 0.0);
  }
  float ao = clamp(1.0 - uIntensity * occ / float(NS), 0.0, 1.0);
  if (!(ao == ao)) ao = 1.0; // garde-fou NaN
  gl_FragColor = vec4(ao, ao, ao, 1.0);
}`;

const COMPOSE_FRAG = /* glsl */`
uniform sampler2D tColor, tAO, tDepth;
uniform vec2 uAOTexel;
uniform mat4 uProjInv;
uniform float uStrength;
varying vec2 vUv;
float viewZ(vec2 uv) {
  float d = texture2D(tDepth, uv).x;
  vec4 v = uProjInv * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);
  return v.z / v.w;
}
void main() {
  vec4 col = texture2D(tColor, vUv);
  float z0 = viewZ(vUv), sum = 0.0, wsum = 0.0;
  // flou bilatéral 4 × 4 : lisse le bruit de l'échantillonnage sans baver par-dessus les bords
  for (int x = -2; x <= 1; x++) for (int y = -2; y <= 1; y++) {
    vec2 uv = vUv + (vec2(float(x), float(y)) + 0.5) * uAOTexel;
    float w = exp(-abs(viewZ(uv) - z0) * 6.0);
    sum += texture2D(tAO, uv).r * w; wsum += w;
  }
  float ao = wsum > 1e-4 ? sum / wsum : 1.0;
  if (!(ao == ao)) ao = 1.0;
  col.rgb *= mix(1.0, ao, uStrength);
  gl_FragColor = col;
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const VERT = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';

export class ContactShadows {
  constructor(renderer, scene, camera, { radius = 0.6, intensity = 3, strength = 0.9, overlayLayer = 1 } = {}) {
    Object.assign(this, { renderer, scene, camera, overlayLayer });
    this.enabled = true;
    const depth = new THREE.DepthTexture(1, 1, THREE.UnsignedInt248Type);
    depth.format = THREE.DepthStencilFormat;
    // couleur HDR si l'appareil sait la rendre (sinon 8 bits : quelques dégradés moins fins, mais même image)
    const hdr = renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float');
    this.target = new THREE.WebGLRenderTarget(1, 1, { type: hdr ? THREE.HalfFloatType : THREE.UnsignedByteType, samples: 4, stencilBuffer: true, depthTexture: depth });
    this.aoTarget = new THREE.WebGLRenderTarget(1, 1, { type: THREE.UnsignedByteType, depthBuffer: false });
    this.aoMat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: AO_FRAG, depthTest: false, depthWrite: false,
      uniforms: { tDepth: { value: depth }, uProj: { value: new THREE.Matrix4() }, uProjInv: { value: new THREE.Matrix4() }, uTexel: { value: new THREE.Vector2() }, uRadius: { value: radius }, uIntensity: { value: intensity } },
    });
    this.composeMat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: COMPOSE_FRAG, depthTest: false, depthWrite: false, transparent: true, blending: THREE.NoBlending, toneMapped: true,
      uniforms: { tColor: { value: this.target.texture }, tAO: { value: this.aoTarget.texture }, tDepth: { value: depth }, uAOTexel: { value: new THREE.Vector2() }, uProjInv: { value: new THREE.Matrix4() }, uStrength: { value: strength } },
    });
    this.aoQuad = new FullScreenQuad(this.aoMat);
    this.composeQuad = new FullScreenQuad(this.composeMat);
  }
  setSize(w, h) {
    const pr = this.renderer.getPixelRatio(), W = Math.max(1, Math.round(w * pr)), H = Math.max(1, Math.round(h * pr));
    this.target.setSize(W, H);
    this.aoTarget.setSize(Math.max(1, W >> 1), Math.max(1, H >> 1)); // occlusion en demi-résolution
    this.aoMat.uniforms.uTexel.value.set(1 / W, 1 / H);
    this.composeMat.uniforms.uAOTexel.value.set(2 / W, 2 / H);
  }
  render() {
    const { renderer, scene, camera } = this;
    if (!this.enabled) { renderer.render(scene, camera); return; }
    const mask = camera.layers.mask;
    camera.layers.disable(this.overlayLayer);
    renderer.setRenderTarget(this.target);
    renderer.clear();
    renderer.render(scene, camera);
    camera.layers.mask = mask;
    this.aoMat.uniforms.uProj.value.copy(camera.projectionMatrix);
    this.aoMat.uniforms.uProjInv.value.copy(camera.projectionMatrixInverse);
    this.composeMat.uniforms.uProjInv.value.copy(camera.projectionMatrixInverse);
    renderer.setRenderTarget(this.aoTarget);
    this.aoQuad.render(renderer);
    renderer.setRenderTarget(null);
    renderer.clear();
    this.composeQuad.render(renderer);
    // calque d'interface (flèches) : par-dessus, sans ombrage ni nouvel effacement
    const auto = renderer.autoClear;
    renderer.autoClear = false;
    camera.layers.set(this.overlayLayer);
    renderer.render(scene, camera);
    camera.layers.mask = mask;
    renderer.autoClear = auto;
  }
}
