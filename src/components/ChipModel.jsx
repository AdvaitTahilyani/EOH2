import { useEffect, useRef } from "react";
import * as THREE from "three";

function createSubstrateTexture() {
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#10314d";
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = "rgba(22, 61, 95, 0.6)";
  for (let i = 0; i < 6; i += 1) {
    ctx.fillRect(120 + i * 130, 120, 30, 784);
  }

  ctx.strokeStyle = "rgba(99, 185, 255, 0.28)";
  ctx.lineWidth = 2;
  for (let i = 88; i < size - 88; i += 34) {
    ctx.beginPath();
    ctx.moveTo(88, i);
    ctx.lineTo(size - 88, i);
    ctx.stroke();
  }

  for (let i = 88; i < size - 88; i += 34) {
    ctx.beginPath();
    ctx.moveTo(i, 88);
    ctx.lineTo(i, size - 88);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(220, 236, 255, 0.72)";
  ctx.font = "700 26px sans-serif";
  ctx.fillText("SFA-5X COMPUTE PACKAGE", 102, 98);
  ctx.fillText("HIGH DENSITY INTERCONNECT", 102, 972);

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function createFrameTexture() {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, "#dbe0e8");
  grad.addColorStop(0.5, "#b8bec8");
  grad.addColorStop(1, "#eceff5");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = "rgba(120, 120, 120, 0.22)";
  for (let i = -80; i < size; i += 16) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 90, size);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export function ChipModel({ orbitEnabled = true }) {
  const mountRef = useRef(null);
  const orbitEnabledRef = useRef(orbitEnabled);

  useEffect(() => {
    orbitEnabledRef.current = orbitEnabled;
  }, [orbitEnabled]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const root = new THREE.Group();
    root.position.y = 0.34;
    root.position.x = -0.28;
    root.scale.setScalar(0.6);
    root.rotation.x = 0.52;
    root.rotation.y = 0.12;
    scene.add(root);

    const traceMaterials = [];

    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(5.3, 0.36, 5.3),
      new THREE.MeshPhysicalMaterial({
        color: "#c7cbd4",
        map: createFrameTexture() ?? null,
        metalness: 0.94,
        roughness: 0.2,
        clearcoat: 0.62,
      }),
    );
    frame.position.y = -0.02;
    root.add(frame);

    const innerFrameCut = new THREE.Mesh(
      new THREE.BoxGeometry(4.78, 0.2, 4.78),
      new THREE.MeshStandardMaterial({ color: "#122d47", metalness: 0.32, roughness: 0.56 }),
    );
    innerFrameCut.position.y = 0.08;
    root.add(innerFrameCut);

    const substrate = new THREE.Mesh(
      new THREE.BoxGeometry(4.46, 0.17, 4.46),
      new THREE.MeshStandardMaterial({
        color: "#12324d",
        map: createSubstrateTexture() ?? null,
        metalness: 0.36,
        roughness: 0.56,
      }),
    );
    substrate.position.y = 0.11;
    root.add(substrate);

    const topDieFrame = new THREE.Mesh(
      new THREE.BoxGeometry(2.04, 0.14, 2.04),
      new THREE.MeshStandardMaterial({ color: "#293d52", metalness: 0.64, roughness: 0.3 }),
    );
    topDieFrame.position.set(0, 0.24, -0.52);
    root.add(topDieFrame);

    const topDie = new THREE.Mesh(
      new THREE.BoxGeometry(1.74, 0.36, 1.74),
      new THREE.MeshPhysicalMaterial({
        color: "#d9dfeb",
        metalness: 0.98,
        roughness: 0.1,
        clearcoat: 1,
        emissive: "#5fa3ff",
        emissiveIntensity: 0.05,
      }),
    );
    const topDieMat = topDie.material;
    topDie.position.set(0, 0.37, -0.52);
    root.add(topDie);

    const dieBase = new THREE.Mesh(
      new THREE.BoxGeometry(2.74, 0.1, 1.38),
      new THREE.MeshStandardMaterial({ color: "#273a4f", metalness: 0.42, roughness: 0.44 }),
    );
    dieBase.position.set(0, 0.17, 1.08);
    root.add(dieBase);

    const lowerDieMat = new THREE.MeshStandardMaterial({
      color: "#627586",
      metalness: 0.76,
      roughness: 0.2,
      emissive: "#4f87c8",
      emissiveIntensity: 0.04,
    });

    const lowerDieLeft = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.2, 1.08), lowerDieMat);
    lowerDieLeft.position.set(-0.67, 0.23, 1.08);
    root.add(lowerDieLeft);

    const lowerDieRight = lowerDieLeft.clone();
    lowerDieRight.position.x = 0.67;
    root.add(lowerDieRight);

    const makeTraceMaterial = () =>
      new THREE.MeshStandardMaterial({
        color: "#4fe4ff",
        emissive: "#4fe4ff",
        emissiveIntensity: 0.24,
        metalness: 0.2,
        roughness: 0.32,
      });

    const addHTrace = (x, z, length, phase, width = 0.045) => {
      const mat = makeTraceMaterial();
      const trace = new THREE.Mesh(new THREE.BoxGeometry(length, 0.03, width), mat);
      trace.position.set(x, 0.2, z);
      root.add(trace);
      traceMaterials.push({ material: mat, phase });
    };

    const addVTrace = (x, z, length, phase, width = 0.045) => {
      const mat = makeTraceMaterial();
      const trace = new THREE.Mesh(new THREE.BoxGeometry(width, 0.03, length), mat);
      trace.position.set(x, 0.2, z);
      root.add(trace);
      traceMaterials.push({ material: mat, phase });
    };

    // Perimeter ring
    addHTrace(0, -2.08, 3.95, 0.2);
    addHTrace(0, 2.08, 3.95, 0.6);
    addVTrace(-2.08, 0, 3.95, 1.0);
    addVTrace(2.08, 0, 3.95, 1.4);

    // Routes around yellow pad clusters (kept off the pad footprints)
    // Upper-left cluster
    addHTrace(-1.62, -0.78, 0.95, 1.9);
    addHTrace(-1.62, 0.30, 0.95, 2.2);
    addVTrace(-2.04, -0.24, 1.05, 2.5);
    // Upper-right cluster
    addHTrace(1.62, -0.78, 0.95, 2.8);
    addHTrace(1.62, 0.30, 0.95, 3.1);
    addVTrace(2.04, -0.24, 1.05, 3.4);

    // Lower-left cluster
    addHTrace(-1.62, 0.94, 0.95, 3.7);
    addHTrace(-1.62, 1.72, 0.95, 4.0);
    addVTrace(-2.04, 1.33, 0.78, 4.3);
    // Lower-right cluster
    addHTrace(1.62, 0.94, 0.95, 4.6);
    addHTrace(1.62, 1.72, 0.95, 4.9);
    addVTrace(2.04, 1.33, 0.78, 5.2);

    // Top and bottom center utility channels
    addHTrace(0, -1.96, 1.5, 5.5);
    addHTrace(0, 1.98, 1.5, 5.8);
    addVTrace(-0.98, -1.26, 0.9, 6.1);
    addVTrace(0.98, -1.26, 0.9, 6.4);
    addVTrace(-0.98, 1.42, 0.9, 6.7);
    addVTrace(0.98, 1.42, 0.9, 7.0);

    const addPadGrid = (centerX, centerZ, cols, rows, spacingX, spacingZ) => {
      const padGeo = new THREE.BoxGeometry(0.06, 0.04, 0.06);
      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const padMat = new THREE.MeshStandardMaterial({
            color: "#ffe8a1",
            emissive: "#ffd24d",
            emissiveIntensity: 0.16,
            metalness: 0.7,
            roughness: 0.28,
          });
          const pad = new THREE.Mesh(padGeo, padMat);
          pad.position.set(
            centerX + (col - (cols - 1) / 2) * spacingX,
            0.21,
            centerZ + (row - (rows - 1) / 2) * spacingZ,
          );
          root.add(pad);
          traceMaterials.push({ material: padMat, phase: (row + col) * 0.16 });
        }
      }
    };

    addPadGrid(1.46, -0.26, 9, 9, 0.105, 0.105);
    addPadGrid(-1.46, -0.26, 9, 9, 0.105, 0.105);
    addPadGrid(1.46, 1.32, 9, 6, 0.105, 0.105);
    addPadGrid(-1.46, 1.32, 9, 6, 0.105, 0.105);
    addPadGrid(0, -1.7, 14, 2, 0.1, 0.11);
    addPadGrid(0, 1.86, 14, 2, 0.1, 0.11);

    const addCapacitor = (x, z, w = 0.28, h = 0.08, d = 0.18) => {
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshStandardMaterial({ color: "#2c3239", metalness: 0.38, roughness: 0.5 }),
      );
      body.position.set(x, 0.24, z);
      root.add(body);

      const endMat = new THREE.MeshStandardMaterial({
        color: "#d7dde5",
        metalness: 0.95,
        roughness: 0.2,
      });
      const left = new THREE.Mesh(new THREE.BoxGeometry(0.04, h + 0.01, d + 0.01), endMat);
      left.position.set(x - w / 2 + 0.02, 0.24, z);
      root.add(left);
      const right = left.clone();
      right.position.x = x + w / 2 - 0.02;
      root.add(right);
    };

    for (let i = 0; i < 7; i += 1) {
      addCapacitor(-1.35 + i * 0.46, -2.03);
      addCapacitor(-1.35 + i * 0.46, 2.02);
    }
    for (let i = 0; i < 5; i += 1) {
      addCapacitor(-2.03, -1.1 + i * 0.55, 0.18, 0.08, 0.28);
      addCapacitor(2.03, -1.1 + i * 0.55, 0.18, 0.08, 0.28);
    }

    const viaMat = new THREE.MeshStandardMaterial({ color: "#d0d8e2", metalness: 0.88, roughness: 0.2 });
    const viaGeo = new THREE.CylinderGeometry(0.017, 0.017, 0.03, 10);
    const addVias = (cx, cz, cols, rows, sx, sz) => {
      for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
          const via = new THREE.Mesh(viaGeo, viaMat);
          via.position.set(
            cx + (c - (cols - 1) / 2) * sx,
            0.215,
            cz + (r - (rows - 1) / 2) * sz,
          );
          root.add(via);
        }
      }
    };

    addVias(0, -0.2, 16, 3, 0.16, 0.12);
    addVias(0, 1.58, 14, 3, 0.16, 0.12);

    const keyLight = new THREE.DirectionalLight("#d6e9ff", 1.2);
    keyLight.position.set(4.6, 7.2, 4.2);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight("#76b8ff", 0.6);
    fillLight.position.set(-5, 4.8, -3.6);
    scene.add(fillLight);

    const ambientLight = new THREE.AmbientLight("#6189b8", 0.52);
    scene.add(ambientLight);

    const rimLight = new THREE.PointLight("#5ce7ff", 0.4, 18);
    rimLight.position.set(0, 2.5, 4.5);
    scene.add(rimLight);

    const targetRot = { x: 0.52, y: 0.12 };
    const pointerState = { dragging: false, lastX: 0, lastY: 0, userDragged: false };

    mount.style.cursor = "grab";

    const onPointerDown = (event) => {
      pointerState.dragging = true;
      pointerState.lastX = event.clientX;
      pointerState.lastY = event.clientY;
      mount.style.cursor = "grabbing";
      if (mount.setPointerCapture) {
        mount.setPointerCapture(event.pointerId);
      }
    };

    const onPointerMove = (event) => {
      if (!pointerState.dragging) return;
      const deltaX = event.clientX - pointerState.lastX;
      const deltaY = event.clientY - pointerState.lastY;
      pointerState.lastX = event.clientX;
      pointerState.lastY = event.clientY;
      pointerState.userDragged = true;

      targetRot.y += deltaX * 0.008;
      targetRot.x += deltaY * 0.008;
    };

    const onPointerUp = (event) => {
      pointerState.dragging = false;
      mount.style.cursor = "grab";
      if (mount.releasePointerCapture) {
        try {
          mount.releasePointerCapture(event.pointerId);
        } catch {
          // ignore when pointer capture isn't active
        }
      }
    };

    mount.addEventListener("pointerdown", onPointerDown);
    mount.addEventListener("pointermove", onPointerMove);
    mount.addEventListener("pointerup", onPointerUp);
    mount.addEventListener("pointercancel", onPointerUp);

    let rafId;
    const clock = new THREE.Clock();
    const bounds = new THREE.Box3();
    const sphere = new THREE.Sphere();

    const fitCameraToModel = () => {
      bounds.setFromObject(root);
      bounds.getBoundingSphere(sphere);
      const aspect = mount.clientWidth / Math.max(mount.clientHeight, 1);
      camera.aspect = aspect;

      const fov = THREE.MathUtils.degToRad(camera.fov);
      const fitHeightDistance = sphere.radius / Math.sin(fov / 2);
      const fitWidthDistance = fitHeightDistance / Math.max(aspect, 0.1);
      const distance = Math.max(fitHeightDistance, fitWidthDistance) * 0.98;

      camera.position.set(
        sphere.center.x - 0.32,
        sphere.center.y + 0.72,
        sphere.center.z + distance,
      );
      camera.near = Math.max(0.1, distance / 100);
      camera.far = distance * 20;
      camera.lookAt(sphere.center.x - 0.14, sphere.center.y + 0.02, sphere.center.z);
      camera.updateProjectionMatrix();
    };

    const animate = () => {
      const elapsed = clock.getElapsedTime();

      traceMaterials.forEach(({ material, phase }) => {
        material.emissiveIntensity = 0.08 + (Math.sin(elapsed * 3.2 + phase) * 0.5 + 0.5) * 0.58;
      });

      topDieMat.emissiveIntensity = 0.03 + (Math.sin(elapsed * 2.1) * 0.5 + 0.5) * 0.12;
      lowerDieMat.emissiveIntensity = 0.02 + (Math.sin(elapsed * 2.4 + 0.7) * 0.5 + 0.5) * 0.1;

      if (orbitEnabledRef.current) {
        targetRot.y += 0.0026;
      }

      root.rotation.y += (targetRot.y - root.rotation.y) * 0.07;
      root.rotation.x += (targetRot.x - root.rotation.x) * 0.07;
      root.position.y = 0.34 + Math.sin(elapsed * 0.8) * 0.03;

      renderer.render(scene, camera);
      rafId = requestAnimationFrame(animate);
    };

    animate();

    const onResize = () => {
      const width = Math.max(1, mount.clientWidth);
      const height = Math.max(1, mount.clientHeight);
      renderer.setSize(width, height, false);
      fitCameraToModel();
    };

    onResize();
    window.addEventListener("resize", onResize);
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(mount);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      resizeObserver.disconnect();
      mount.removeEventListener("pointerdown", onPointerDown);
      mount.removeEventListener("pointermove", onPointerMove);
      mount.removeEventListener("pointerup", onPointerUp);
      mount.removeEventListener("pointercancel", onPointerUp);
      renderer.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
      mount.style.cursor = "";
    };
  }, []);

  return <div className="chip-model" ref={mountRef} />;
}
