// Ombres de contact (occlusion ambiante en espace écran) : les creux, les jonctions entre structures (cordages et
// feuillets, piliers et paroi, coronaires et sillons, valves et anneau) s'assombrissent doucement, comme dans une
// animation 3D calculée.
//
// La scène est rendue dans une cible hors écran (couleur HDR + profondeur/stencil, multi-échantillonnée) ; l'occlusion
// est calculée à partir de CETTE profondeur, donc de l'image réellement affichée : plans de coupe, capuchons stencil
// et déformation du battement compris (une passe toute faite redessinerait la scène sans coupe ni battement).
// Normales reconstruites depuis la profondeur, échantillonnage en spirale (demi-résolution), flou bilatéral à la
// recomposition, puis tonalité et espace de couleur de sortie identiques au rendu direct.
// Les éléments d'interface 3D éventuels (calque 1) sont dessinés après, sans ombrage.
// Écran partagé (split) : deux images côte à côte dans la même cible (moitié gauche, moitié droite), préparées par
// split.before(i) ; l'occlusion lit chaque moitié avec sa propre projection et ne déborde pas sur l'autre.
import * as THREE from 'three';

// Triangle plein écran (sans dépendance aux modules d'exemples de three)
class FullScreenQuad {
  constructor(material) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-1, 3, 0, -1, -1, 0, 3, -1, 0], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 2, 0, 0, 2, 0], 2));
    this.mesh = new THREE.Mesh(g, material);
    this.mesh.frustumCulled = false;
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }
  render(renderer) { renderer.render(this.mesh, this.camera); }
}

const AO_FRAG = /* glsl */`
uniform sampler2D tDepth;
uniform mat4 uProj, uProjInv;
uniform vec2 uTexel;      // 1 / taille de la profondeur (pleine résolution)
uniform float uRadius;    // rayon d'influence (cm)
uniform float uIntensity;
uniform float uSplit;     // 1 : deux moitiés, chacune avec la projection complète
varying vec2 vUv;
#define NS 14
vec2 toNdc(vec2 uv) {
  if (uSplit > 0.5) uv.x = uv.x < 0.5 ? uv.x * 2.0 : uv.x * 2.0 - 1.0;
  return uv * 2.0 - 1.0;
}
vec3 viewPos(vec2 uv) {
  float d = texture2D(tDepth, uv).x;
  vec4 v = uProjInv * vec4(toNdc(uv), d * 2.0 - 1.0, 1.0);
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
  float lo = 0.0, hi = 1.0;
  if (uSplit > 0.5) { rUv.x *= 0.5; lo = vUv.x < 0.5 ? 0.0 : 0.5; hi = lo + 0.5; } // reste dans sa moitié
  // rotation de la spirale selon un motif régulier 4 × 4, que le flou 4 × 4 de la recomposition annule exactement
  vec2 cell = mod(floor(gl_FragCoord.xy), 4.0);
  float a0 = (cell.x * 4.0 + cell.y + 0.5) / 16.0 * 6.2831853, R2 = uRadius * uRadius, occ = 0.0;
  for (int i = 0; i < NS; i++) {
    float t = (float(i) + 0.5) / float(NS);
    float a = a0 + t * 6.2831853 * 3.0;
    vec2 sUv = vUv + vec2(cos(a), sin(a)) * t * rUv; sUv.x = clamp(sUv.x, lo + uTexel.x, hi - uTexel.x);
    vec3 Q = viewPos(sUv);
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
  // silhouettes antialiasées sur fond transparent : couleur prémultipliée → tonalité sur la couleur vraie
  float a = col.a;
  gl_FragColor = vec4(col.rgb / max(a, 1e-4), a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  gl_FragColor.rgb *= a;
}`;

const VERT = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';

export class ContactShadows {
  constructor(renderer, scene, camera, { radius = 0.6, intensity = 3, strength = 0.9, overlayLayer = 1 } = {}) {
    Object.assign(this, { renderer, scene, camera, overlayLayer });
    this.enabled = true;
    this.split = null; // { before(i), after() } : écran partagé
    const depth = new THREE.DepthTexture(1, 1, THREE.UnsignedInt248Type);
    depth.format = THREE.DepthStencilFormat;
    // couleur HDR si l'appareil sait la rendre (sinon 8 bits : quelques dégradés moins fins, mais même image)
    const hdr = renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float');
    this.target = new THREE.WebGLRenderTarget(1, 1, { type: hdr ? THREE.HalfFloatType : THREE.UnsignedByteType, samples: 4, stencilBuffer: true, depthTexture: depth });
    this.target.resolveStencilBuffer = false;
    this.aoTarget = new THREE.WebGLRenderTarget(1, 1, { type: THREE.UnsignedByteType, depthBuffer: false });
    this.aoMat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: AO_FRAG, depthTest: false, depthWrite: false,
      uniforms: { tDepth: { value: depth }, uProj: { value: new THREE.Matrix4() }, uProjInv: { value: new THREE.Matrix4() }, uTexel: { value: new THREE.Vector2() }, uRadius: { value: radius }, uIntensity: { value: intensity }, uSplit: { value: 0 } },
    });
    this.composeMat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: COMPOSE_FRAG, depthTest: false, depthWrite: false, transparent: true, blending: THREE.NoBlending, toneMapped: true,
      uniforms: { tColor: { value: this.target.texture }, tAO: { value: this.aoTarget.texture }, tDepth: { value: depth }, uAOTexel: { value: new THREE.Vector2() }, uProjInv: { value: new THREE.Matrix4() }, uStrength: { value: strength } },
    });
    this.aoQuad = new FullScreenQuad(this.aoMat);
    this.composeQuad = new FullScreenQuad(this.composeMat);
  }
  setSize() {
    const s = this.renderer.getDrawingBufferSize(new THREE.Vector2()), W = Math.max(1, s.x), H = Math.max(1, s.y);
    this.target.setSize(W, H); // mêmes dimensions que le canevas : pas de rééchantillonnage
    const aw = Math.max(1, W >> 1), ah = Math.max(1, H >> 1);
    this.aoTarget.setSize(aw, ah); // occlusion en demi-résolution
    this.aoMat.uniforms.uTexel.value.set(1 / W, 1 / H);
    this.composeMat.uniforms.uAOTexel.value.set(1 / aw, 1 / ah);
  }
  render() {
    const { renderer, scene, camera } = this;
    if (!this.enabled) { renderer.render(scene, camera); return; }
    const mask = camera.layers.mask;
    camera.layers.disable(this.overlayLayer);
    renderer.setRenderTarget(this.target);
    const split = this.split, T = this.target;
    if (split) {
      const W = T.width, H = T.height, hw = Math.floor(W / 2);
      for (let i = 0; i < 2; i++) {
        split.before(i);
        T.viewport.set(i * hw, 0, i ? W - hw : hw, H); T.scissor.copy(T.viewport); T.scissorTest = true;
        renderer.setRenderTarget(T); // la cible applique sa fenêtre au moment où elle est choisie
        renderer.render(scene, camera);
      }
      T.viewport.set(0, 0, W, H); T.scissor.set(0, 0, W, H); T.scissorTest = false;
      renderer.setRenderTarget(T);
    } else renderer.render(scene, camera);
    this.aoMat.uniforms.uSplit.value = split ? 1 : 0;
    camera.layers.mask = mask;
    this.aoMat.uniforms.uProj.value.copy(camera.projectionMatrix);
    this.aoMat.uniforms.uProjInv.value.copy(camera.projectionMatrixInverse);
    this.composeMat.uniforms.uProjInv.value.copy(camera.projectionMatrixInverse);
    renderer.setRenderTarget(this.aoTarget);
    this.aoQuad.render(renderer);
    renderer.setRenderTarget(null);
    this.composeQuad.render(renderer);
    split?.after();
    // calque d'interface : par-dessus, sans ombrage ni nouvel effacement (rien à dessiner : passe sautée)
    let any = false;
    scene.traverseVisible((o) => { if (!any && o.isMesh && o.layers.isEnabled(this.overlayLayer) && !o.layers.isEnabled(0)) any = true; });
    if (!any) return;
    const auto = renderer.autoClear;
    renderer.autoClear = false;
    camera.layers.set(this.overlayLayer);
    renderer.render(scene, camera);
    camera.layers.mask = mask;
    renderer.autoClear = auto;
  }
}
