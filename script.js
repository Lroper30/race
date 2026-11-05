(() => {
  "use strict";

  const canvas = document.getElementById("gameCanvas");
  const $ = id => document.getElementById(id);
  const ui = {
    distance: $("distance"), speed: $("speed"), best: $("best"),
    start: $("startScreen"), pause: $("pauseScreen"), over: $("gameOverScreen"),
    finalDistance: $("finalDistance"), finalSpeed: $("finalSpeed"),
    crash: $("crashFlash"), pauseBtn: $("pauseBtn"), laneHint: $("laneHint"),
    replayStatus: $("replayStatus"), replayStatusOver: $("replayStatusOver"),
    saveReplayMenu: $("saveReplayMenuBtn"),
    watchReplay: $("watchReplayBtn"), saveReplayOver: $("saveReplayOverBtn"),
    mapName: $("mapName")
  };
  const THREE = window.THREE;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.35));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#9bb9c7");
  scene.fog = new THREE.Fog("#9bb9c7", 55, 180);
  const camera = new THREE.PerspectiveCamera(57, 1, 0.1, 240);
  camera.position.set(0, 7.4, 15.5);
  camera.lookAt(0, 0.8, -24);

  const hemiLight = new THREE.HemisphereLight("#dceeff", "#334237", 2.1);
  scene.add(hemiLight);
  const sunLight = new THREE.DirectionalLight("#ffe0ae", 3.2);
  sunLight.position.set(-12, 24, 10);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(512, 512);
  sunLight.shadow.camera.left = -22;
  sunLight.shadow.camera.right = 22;
  sunLight.shadow.camera.top = 24;
  sunLight.shadow.camera.bottom = -24;
  sunLight.shadow.camera.near = 1;
  sunLight.shadow.camera.far = 70;
  sunLight.shadow.bias = -0.0004;
  scene.add(sunLight);

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const choose = items => items[Math.floor(Math.random() * items.length)];
  const wrapPosition = (value, start, length) =>
    start + (((value - start) % length) + length) % length;
  const laneX = lane => (lane - 2) * 3.65;
  const regularLanes = [1, 2, 3];
  const interstateLanes = [0, 1, 2, 3, 4];
  const material = (color, roughness = 0.78, metalness = 0) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness });

  const roadMat = material("#303a43");
  const shoulderMat = material("#60665f");
  const groundMat = material("#526d50");
  const lineMat = new THREE.MeshStandardMaterial({
    color: "#e5e4d7", roughness: 0.65, emissive: "#272820"
  });
  const railMat = material("#9aa5a5", 0.43, 0.48);
  const darkMat = material("#141b20");
  const glassMat = new THREE.MeshStandardMaterial({
    color: "#193747", roughness: 0.25, metalness: 0.15
  });
  const wheelMat = material("#101316", 0.98);
  const chromeMat = material("#aab5ba", 0.3, 0.75);
  const tailMat = new THREE.MeshStandardMaterial({
    color: "#ff342b", emissive: "#b71510", emissiveIntensity: 1.5
  });
  const rampMat = new THREE.MeshStandardMaterial({
    color: "#d67a32", roughness: 0.58, metalness: 0.08, side: THREE.DoubleSide
  });
  const rampStripeMat = material("#f4dfb4", 0.65);
  const cactusMat = material("#467b4b", 0.82);
  const cactusStemGeometry = new THREE.CylinderGeometry(0.28, 0.36, 2.9, 8);
  const cactusArmGeometry = new THREE.CylinderGeometry(0.13, 0.16, 1.25, 7);
  const cactusBridgeGeometry = new THREE.CylinderGeometry(0.13, 0.16, 0.72, 7);
  const sharedMaterials = new Set([
    roadMat, shoulderMat, groundMat, lineMat, railMat, darkMat, glassMat,
    wheelMat, chromeMat, tailMat, rampMat, rampStripeMat, cactusMat
  ]);
  const biomes = [
    {
      name: "FOREST",
      sky: "#9bb9c7", ground: "#526d50", shoulder: "#60665f",
      leaves: ["#344f3c", "#405b40", "#596642"], trunk: "#534238",
      sun: "#ffe2b4", sunlight: "#ffe0ae", hemisphere: "#dceeff", ambient: "#334237"
    },
    {
      name: "DESERT",
      sky: "#e9c18c", ground: "#bb9b67", shoulder: "#8e7757",
      leaves: ["#8b7951", "#a38a58", "#b59a62"], trunk: "#66503a",
      sun: "#fff0c4", sunlight: "#ffe1aa", hemisphere: "#fff0d4", ambient: "#604d38"
    },
    {
      name: "ALPINE",
      sky: "#9ebfd7", ground: "#c5d0d1", shoulder: "#8f9ca4",
      leaves: ["#b8cbd0", "#d0dfe0", "#e7eeee"], trunk: "#635f58",
      sun: "#fff2dc", sunlight: "#e0edff", hemisphere: "#e5f4ff", ambient: "#56616b"
    },
    {
      name: "TROPICAL",
      sky: "#72c9c4", ground: "#39734e", shoulder: "#697d5a",
      leaves: ["#176b48", "#238652", "#51a34f"], trunk: "#654b35",
      sun: "#fff0a8", sunlight: "#ffe59b", hemisphere: "#d8fff1", ambient: "#294d3a"
    },
    {
      name: "VOLCANIC",
      sky: "#524451", ground: "#39363a", shoulder: "#554849",
      leaves: ["#443d3e", "#6a4138", "#984a34"], trunk: "#3d302d",
      sun: "#ff9c62", sunlight: "#ff8158", hemisphere: "#d9a18b", ambient: "#30292c"
    },
    {
      name: "COASTAL",
      sky: "#8dd4e8", ground: "#9dbb87", shoulder: "#c0ad82",
      leaves: ["#4c7857", "#689366", "#8ba46d"], trunk: "#6d5540",
      sun: "#fff2c6", sunlight: "#ffe9b6", hemisphere: "#e4faff", ambient: "#536c65"
    },
    {
      name: "AUTUMN",
      sky: "#d99b72", ground: "#80613f", shoulder: "#73614d",
      leaves: ["#a84f2d", "#d07a32", "#d5a33e"], trunk: "#543c2f",
      sun: "#ffe0a0", sunlight: "#ffd18b", hemisphere: "#ffe6ca", ambient: "#4c3b32"
    },
    {
      name: "NIGHT",
      sky: "#17243f", ground: "#263442", shoulder: "#343d4a",
      leaves: ["#263d3d", "#304744", "#465247"], trunk: "#3c3536",
      sun: "#b9d8ff", sunlight: "#9bbcff", hemisphere: "#b3c9f0", ambient: "#18232e"
    }
  ].map(biome => ({
    ...biome,
    colors: Object.fromEntries(
      ["sky", "ground", "shoulder", "trunk", "sun", "sunlight", "hemisphere", "ambient"]
        .map(key => [key, new THREE.Color(biome[key])])
    ),
    leafColors: biome.leaves.map(color => new THREE.Color(color))
  }));
  const biomeSegmentLength = 3000;
  const biomeTransitionLength = 650;
  const biomeTransitionStart = biomeSegmentLength - biomeTransitionLength;
  const colorScratch = new THREE.Color();
  const interstateGroundColor = new THREE.Color("#60716b");
  const interstateShoulderColor = new THREE.Color("#59646a");
  const interstateRoadColor = new THREE.Color("#27323c");
  const normalRoadColor = new THREE.Color("#303a43");
  let currentBiomeIndex = 0;
  let nextBiomeIndex = 0;
  let desertBlend = 0;
  let roadSection = "regular";
  let highwayBlend = 0;
  let nextInterstateAt = rand(2800, 4200);
  const explosionGeometry = new THREE.SphereGeometry(1, 10, 8);
  const explosionDuration = 1.35;

  const badgeCanvas = document.createElement("canvas");
  badgeCanvas.width = 128;
  badgeCanvas.height = 128;
  const badgeContext = badgeCanvas.getContext("2d");
  badgeContext.translate(64, 64);
  badgeContext.beginPath();
  badgeContext.arc(0, 0, 62, 0, Math.PI * 2);
  badgeContext.fillStyle = "#101820";
  badgeContext.fill();
  badgeContext.beginPath();
  badgeContext.arc(0, 0, 53, 0, Math.PI * 2);
  badgeContext.fillStyle = "#f4f6f7";
  badgeContext.fill();
  badgeContext.save();
  badgeContext.beginPath();
  badgeContext.arc(0, 0, 43, 0, Math.PI * 2);
  badgeContext.clip();
  badgeContext.fillStyle = "#2f82bf";
  badgeContext.fillRect(-43, -43, 43, 43);
  badgeContext.fillRect(0, 0, 43, 43);
  badgeContext.fillStyle = "#f7f7f4";
  badgeContext.fillRect(0, -43, 43, 43);
  badgeContext.fillRect(-43, 0, 43, 43);
  badgeContext.restore();
  badgeContext.fillStyle = "#f4f6f7";
  badgeContext.font = "bold 16px Arial";
  badgeContext.textAlign = "center";
  badgeContext.fillText("BMW", 0, -45);
  const badgeTexture = new THREE.CanvasTexture(badgeCanvas);
  badgeTexture.colorSpace = THREE.SRGBColorSpace;
  const badgeMaterial = new THREE.MeshBasicMaterial({
    map: badgeTexture, transparent: true, side: THREE.DoubleSide
  });
  sharedMaterials.add(badgeMaterial);

  function box(parent, width, height, depth, mat, x, y, z, castShadow = true) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(800, 360), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.12, -65);
  ground.receiveShadow = true;
  scene.add(ground);

  const road = new THREE.Mesh(new THREE.BoxGeometry(12, 0.16, 150), roadMat);
  road.position.set(0, -0.035, -48);
  road.receiveShadow = true;
  scene.add(road);
  const shoulders = [];
  const guardrails = [];
  for (const side of [-1, 1]) {
    const shoulder = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.17, 150), shoulderMat);
    shoulder.position.set(side * 6.62, -0.03, -48);
    shoulder.receiveShadow = true;
    scene.add(shoulder);
    shoulders.push({ mesh: shoulder, side });

    const rail = box(scene, 0.15, 0.18, 150, railMat, side * 7.36, 0.72, -48, false);
    rail.receiveShadow = false;
    const post = box(scene, 0.12, 0.72, 0.15, railMat, side * 7.36, 0.36, -48, false);
    guardrails.push({ rail, post, side });
  }

  const laneMarkings = [];
  for (const x of [-5.475, -1.825, 1.825, 5.475]) {
    for (let i = 0; i < 22; i++) {
      const dash = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.025, 3.1), lineMat);
      dash.position.set(x, 0.06, -110 + i * 7);
      dash.receiveShadow = true;
      scene.add(dash);
      laneMarkings.push({ mesh: dash, x });
    }
  }

  const constructionCones = [];
  const coneMat = material("#f07832", 0.62);
  const coneStripeMat = material("#f4eee1", 0.58);
  sharedMaterials.add(coneMat);
  sharedMaterials.add(coneStripeMat);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 18; i++) {
      const cone = new THREE.Group();
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.12, 8), darkMat);
      base.position.y = 0.06;
      cone.add(base);
      const body = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.8, 8), coneMat);
      body.position.y = 0.5;
      cone.add(body);
      const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.21, 0.12, 8), coneStripeMat);
      stripe.position.y = 0.5;
      cone.add(stripe);
      const baseZ = -135 + i * 16;
      cone.position.set(side * 5.48, 0, baseZ);
      cone.visible = false;
      scene.add(cone);
      constructionCones.push({ mesh: cone, baseZ });
    }
  }

  function applyRoadLayout(blend, section) {
    highwayBlend = clamp(blend, 0, 1);
    roadSection = section;
    road.scale.x = 1 + highwayBlend * (19.3 / 12 - 1);
    for (const { mesh, side } of shoulders) {
      mesh.position.x = side * (6.62 + highwayBlend * 3.65);
    }
    for (const { rail, post, side } of guardrails) {
      const x = side * (7.36 + highwayBlend * 3.65);
      rail.position.x = x;
      post.position.x = x;
    }
    for (const { mesh, x } of laneMarkings) {
      mesh.visible = highwayBlend > 0.18 || Math.abs(x) < 2;
    }
    for (const { mesh } of constructionCones) {
      mesh.visible = section === "construction";
    }
    const activeLanes = section === "highway" ? interstateLanes : regularLanes;
    lane = clamp(lane, activeLanes[0], activeLanes[activeLanes.length - 1]);
  }

  function updateRoadSection(distanceValue) {
    const openingLength = 300;
    const interstateLength = 1400;
    const constructionLength = 420;
    const openingEnd = nextInterstateAt + openingLength;
    const interstateEnd = openingEnd + interstateLength;
    const constructionEnd = interstateEnd + constructionLength;
    const ease = progress => {
      const t = clamp(progress, 0, 1);
      return t * t * (3 - 2 * t);
    };

    if (distanceValue < nextInterstateAt) {
      applyRoadLayout(0, "regular");
    } else if (distanceValue < openingEnd) {
      applyRoadLayout(ease((distanceValue - nextInterstateAt) / openingLength), "opening");
    } else if (distanceValue < interstateEnd) {
      applyRoadLayout(1, "highway");
    } else if (distanceValue < constructionEnd) {
      if (roadSection === "highway") {
        const closedRamps = ramps.filter(ramp => !regularLanes.includes(ramp.lane));
        for (const ramp of closedRamps) removeObject(ramp.mesh);
        ramps = ramps.filter(ramp => regularLanes.includes(ramp.lane));
        if (rampRide && !regularLanes.includes(rampRide.lane)) rampRide = null;
        const closedTraffic = obstacles.filter(obstacle => !regularLanes.includes(obstacle.lane));
        for (const obstacle of closedTraffic) removeObject(obstacle.mesh);
        obstacles = obstacles.filter(obstacle => regularLanes.includes(obstacle.lane));
      }
      applyRoadLayout(1 - ease((distanceValue - interstateEnd) / constructionLength), "construction");
    } else {
      nextInterstateAt = distanceValue + rand(2500, 4200);
      applyRoadLayout(0, "regular");
    }
  }

  const scenery = [];
  const trunkMat = material("#534238");
  const leafMats = ["#344f3c", "#405b40", "#596642"].map(c => material(c));
  leafMats.forEach(mat => sharedMaterials.add(mat));
  function makeTree() {
    const group = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 1.8, 7), trunkMat);
    trunk.position.y = 0.9;
    trunk.castShadow = true;
    group.add(trunk);
    for (let i = 0; i < 3; i++) {
      const crown = new THREE.Mesh(
        new THREE.ConeGeometry(1.15 - i * 0.19, 2.2 - i * 0.18, 7),
        leafMats[i]
      );
      crown.position.y = 2.05 + i * 0.72;
      crown.castShadow = true;
      group.add(crown);
    }
    return group;
  }

  function makeCactus() {
    const group = new THREE.Group();
    const stem = new THREE.Mesh(cactusStemGeometry, cactusMat);
    stem.position.y = 1.45;
    group.add(stem);
    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(cactusArmGeometry, cactusMat);
      arm.position.set(side * 0.62, 1.2, 0);
      arm.rotation.z = side * 0.48;
      group.add(arm);
      const bridge = new THREE.Mesh(cactusBridgeGeometry, cactusMat);
      bridge.position.set(side * 0.38, 0.7, 0);
      bridge.rotation.z = Math.PI / 2;
      group.add(bridge);
    }
    group.traverse(object => {
      if (object.isMesh) object.castShadow = true;
    });
    return group;
  }

  for (let i = 0; i < 28; i++) {
    const tree = makeTree();
    const side = i % 2 === 0 ? -1 : 1;
    const x = side * rand(10, 25);
    const z = -110 + Math.floor(i / 2) * 16;
    const baseScale = rand(0.75, 1.55);
    tree.position.set(x, 0, z);
    tree.scale.setScalar(baseScale);
    scene.add(tree);
    const cactus = makeCactus();
    cactus.position.set(x, 0, z);
    cactus.scale.setScalar(0);
    cactus.visible = false;
    scene.add(cactus);
    scenery.push({ tree, cactus, baseZ: z, baseScale });
  }

  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(3.2, 20, 16),
    new THREE.MeshBasicMaterial({ color: "#ffe2b4" })
  );
  sun.position.set(36, 25, -115);
  scene.add(sun);

  function applyBiome(distanceValue) {
    if (!Number.isFinite(distanceValue)) {
      console.error("Biome update received an invalid distance.", distanceValue);
      distanceValue = 0;
    }
    const progressDistance = Math.max(0, distanceValue);
    const segmentProgress = progressDistance % biomeSegmentLength;
    currentBiomeIndex =
      Math.floor(progressDistance / biomeSegmentLength) % biomes.length;
    nextBiomeIndex = (currentBiomeIndex + 1) % biomes.length;
    const current = biomes[currentBiomeIndex];
    const next = biomes[nextBiomeIndex];
    const rawBlend = clamp(
      (segmentProgress - biomeTransitionStart) / biomeTransitionLength, 0, 1
    );
    const blend = rawBlend * rawBlend * (3 - 2 * rawBlend);
    const paintColor = (target, key) =>
      target.copy(current.colors[key]).lerp(next.colors[key], blend);

    scene.background.copy(paintColor(colorScratch, "sky"));
    scene.fog.color.copy(paintColor(colorScratch, "sky"));
    groundMat.color.copy(paintColor(colorScratch, "ground")).lerp(interstateGroundColor, highwayBlend * 0.65);
    shoulderMat.color.copy(paintColor(colorScratch, "shoulder")).lerp(interstateShoulderColor, highwayBlend * 0.65);
    roadMat.color.copy(interstateRoadColor).lerp(normalRoadColor, highwayBlend);
    trunkMat.color.copy(paintColor(colorScratch, "trunk"));
    sun.material.color.copy(paintColor(colorScratch, "sun"));
    sunLight.color.copy(paintColor(colorScratch, "sunlight"));
    hemiLight.color.copy(paintColor(colorScratch, "hemisphere"));
    hemiLight.groundColor.copy(paintColor(colorScratch, "ambient"));
    leafMats.forEach((mat, index) =>
      mat.color.copy(current.leafColors[index]).lerp(next.leafColors[index], blend)
    );

    const isDesert = biome => biome.name === "DESERT";
    desertBlend = isDesert(current)
      ? 1 - blend
      : isDesert(next) ? blend : 0;
    for (const item of scenery) {
      item.tree.scale.setScalar(item.baseScale * (1 - desertBlend));
      item.cactus.visible = desertBlend > 0.001;
      item.cactus.scale.setScalar(item.baseScale * 0.9 * desertBlend);
    }

    const mapName = blend > 0.08 && blend < 0.92
      ? `${current.name} → ${next.name}`
      : blend >= 0.92 ? next.name : current.name;
    ui.mapName.textContent = roadSection === "highway"
      ? `INTERSTATE • ${mapName}`
      : roadSection === "construction" ? "CONSTRUCTION • MERGING BACK"
        : roadSection === "opening" ? "INTERSTATE • ENTERING" : mapName;
  }

  applyBiome(0);

  function makeCar(type, color, player = false, branded = false) {
    const group = new THREE.Group();
    const paint = new THREE.MeshStandardMaterial({
      color, roughness: 0.34, metalness: 0.22
    });
    const brightPaint = new THREE.MeshStandardMaterial({
      color, roughness: 0.3, metalness: 0.28
    });
    const truck = type === "truck" || type === "semi";
    const bodyWidth = type === "van" ? 1.95 : truck ? 2.35 : 1.8;
    const bodyLength = truck ? 6.6 : type === "van" ? 3.8 : 3.45;
    const bodyHeight = truck ? 1.05 : 0.58;

    box(group, bodyWidth, bodyHeight, bodyLength, paint, 0, truck ? 1.05 : 0.73, 0);

    if (truck) {
      const trailerLength = type === "semi" ? 4.7 : 3.9;
      const trailerZ = type === "semi" ? 0.3 : 0.65;
      box(group, bodyWidth * 0.92, type === "semi" ? 2.55 : 1.8, trailerLength,
        brightPaint, 0, type === "semi" ? 2.65 : 2.22, trailerZ);
      box(group, bodyWidth * 0.89, 0.08, 0.09, chromeMat, 0, type === "semi" ? 3.7 : 3.0, trailerZ - trailerLength / 2 - 0.05, false);
      box(group, 0.06, type === "semi" ? 2.25 : 1.45, 0.08, darkMat, 0, type === "semi" ? 2.62 : 2.2, trailerZ - trailerLength / 2 - 0.07, false);
      for (const x of [-0.62, 0.62]) {
        box(group, 0.24, 0.27, 0.07, tailMat, x, 0.76, -bodyLength / 2 - 0.035, false);
      }
      const cab = new THREE.Mesh(
        new THREE.BoxGeometry(bodyWidth * 0.88, 1.55, 1.9),
        brightPaint
      );
      cab.position.set(0, 1.72, bodyLength * 0.36);
      cab.castShadow = true;
      group.add(cab);
      box(group, bodyWidth * 0.72, 0.54, 0.08, glassMat, 0, 2.02, bodyLength * 0.36 + 0.96, false);
      for (const x of [-0.68, 0.68]) {
        box(group, 0.32, 0.18, 0.08, chromeMat, x, 0.85, bodyLength / 2 + 0.04, false);
      }
    } else {
      const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(bodyWidth * 0.76, 0.67, type === "van" ? 1.85 : 1.72),
        brightPaint
      );
      cabin.position.set(0, 1.28, -0.2);
      cabin.castShadow = true;
      group.add(cabin);
      box(group, bodyWidth * 0.64, 0.43, 0.06, glassMat, 0, 1.37, 0.68, false);
      box(group, bodyWidth * 0.64, 0.43, 0.06, glassMat, 0, 1.37, -1.08, false);
      for (const side of [-1, 1]) {
        box(group, 0.055, 0.35, 0.77, glassMat, side * bodyWidth * 0.39, 1.35, -0.2, false);
      }
      box(group, bodyWidth * 0.27, 0.08, 0.08, chromeMat, 0, 0.53, 1.74, false);
      for (const x of [-0.58, 0.58]) {
        box(group, 0.34, 0.19, 0.08, chromeMat, x, 0.66, -1.76, false);
      }
      box(group, 0.28, 0.34, 0.08, darkMat, 0, 0.73, -1.77, false);
    }

    const wheelZ = truck ? [-2.3, -1.55, 1.55, 2.3] : [-1.12, 1.12];
    for (const x of [-bodyWidth * 0.48, bodyWidth * 0.48]) {
      for (const z of wheelZ) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.39, 0.39, 0.22, 14), wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x, 0.42, z);
        wheel.castShadow = true;
        group.add(wheel);
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.235, 12), chromeMat);
        hub.rotation.z = Math.PI / 2;
        hub.position.set(x * 1.02, 0.42, z);
        group.add(hub);
      }
    }

    if (player) {
      for (const x of [-0.58, 0.58]) {
        box(group, 0.28, 0.2, 0.08, tailMat, x, 0.77, 1.77, false);
        box(group, 0.19, 0.09, 0.1, chromeMat, x, 0.49, 1.78, false);
      }
      box(group, 1.45, 0.06, 0.16, darkMat, 0, 0.43, 1.84, false);
    }
    if (branded) {
      for (const front of [false, true]) {
        const badge = new THREE.Mesh(new THREE.CircleGeometry(0.27, 24), badgeMaterial);
        badge.position.set(0, 0.92, front ? -bodyLength / 2 - 0.045 : bodyLength / 2 + 0.045);
        if (front) badge.rotation.y = Math.PI;
        group.add(badge);
      }
    }

    group.traverse(object => {
      if (object.isMesh) object.receiveShadow = true;
    });
    return group;
  }

  const player = makeCar("sedan", "#19bfc0", true);
  player.position.set(0, 0, 4.7);
  scene.add(player);

  const vehicleTypes = [
    { name: "sedan", color: "#dc493d", weight: 28 },
    { name: "hatch", color: "#e8ac45", weight: 24 },
    { name: "sport", color: "#43a9ce", weight: 20 },
    { name: "van", color: "#dce1e3", weight: 15 },
    { name: "truck", color: "#df9a4a", weight: 10 },
    { name: "semi", color: "#c5d0d5", weight: 3 }
  ];
  const bmwColors = ["#e3262e", "#2468c9", "#f2f2ed", "#171a1f", "#37a36b", "#e7b73c"];

  const difficultySettings = {
    easy: { label: "EASY", startSpeed: 92, acceleration: 0.012, maxSpeed: 205, trafficInterval: 1.3, extraCarChance: 0.28, swerveChance: 0.12, rampMin: 15, rampMax: 22 },
    medium: { label: "MEDIUM", startSpeed: 115, acceleration: 0.018, maxSpeed: 235, trafficInterval: 1, extraCarChance: 0.5, swerveChance: 0.2, rampMin: 12, rampMax: 19 },
    hard: { label: "HARD", startSpeed: 145, acceleration: 0.026, maxSpeed: 270, trafficInterval: 0.68, extraCarChance: 0.72, swerveChance: 0.3, rampMin: 10, rampMax: 16 },
    impossible: { label: "IMPOSSIBLE", startSpeed: 165, acceleration: 0.032, maxSpeed: 300, trafficInterval: 0.38, extraCarChance: 1, swerveChance: 0.42, rampMin: 8, rampMax: 13, singleSafeLane: true }
  };

  let state = "menu";
  let trafficDirection = "oncoming";
  let difficultyMode = ["easy", "medium", "hard", "impossible"].includes(localStorage.getItem("laneRushDifficulty"))
    ? localStorage.getItem("laneRushDifficulty")
    : "medium";
  document.querySelectorAll("[data-difficulty]").forEach(button => {
    const selected = button.dataset.difficulty === difficultyMode;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  let lane = 2;
  let laneVisual = 2;
  let obstacles = [];
  let ramps = [];
  let explosions = [];
  let lastVehicleType = "";
  let previousSafeLane = null;
  let lastSemiDistance = -Infinity;
  let nextObstacleId = 0;
  let nextRampId = 0;
  let runElapsed = 0;
  let captureElapsed = 0;
  let replayFrames = [];
  let replayCatalog = {};
  let lastReplay = null;
  let savedReplay = null;
  let replayActors = new Map();
  let replayPlaybackTime = 0;
  let replayPhase = "playback";
  let replayElapsed = 0;
  let replayReturnToMenu = false;
  let replayRampActors = new Map();
  let crashVelocity = new THREE.Vector3();
  let crashSpin = new THREE.Vector3();
  let crashBounced = false;
  let crashExplosion = null;
  let distance = 0;
  let speed = 80;
  let topSpeed = 80;
  let spawnTimer = 0;
  let rampTimer = 8;
  let jumpElapsed = -1;
  let jumpVelocity = 0;
  let jumpStartHeight = 0;
  let rampRide = null;
  const jumpGravity = 9.8;
  let roadOffset = 0;
  let lastTime = performance.now();
  let flashTimer = 0;
  let touchStartX = null;
  let shake = 0;
  let best = Number(localStorage.getItem("laneRushBest") || 0);
  ui.best.textContent = `${Math.floor(best)} m`;
  try {
    const storedReplay = localStorage.getItem("laneRushReplay");
    if (storedReplay) {
      const parsed = JSON.parse(storedReplay);
      if (parsed && Array.isArray(parsed.frames) && parsed.frames.length > 0 &&
          parsed.frames.every(frame => frame && Array.isArray(frame.p) &&
            frame.p.length === 5 && Array.isArray(frame.c)) &&
          parsed.cars && typeof parsed.cars === "object") {
        savedReplay = parsed;
      } else {
        ui.replayStatus.textContent = "Saved replay data is invalid.";
      }
    }
  } catch {
    ui.replayStatus.textContent = "Could not load the saved replay.";
  }
  ui.watchReplay.classList.toggle("hidden", !savedReplay);

  function resize() {
    const width = Math.max(320, canvas.clientWidth);
    const height = Math.max(320, canvas.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  function removeObject(object) {
    scene.remove(object);
    object.traverse(child => {
      if (!child.isMesh) return;
      if (child.geometry !== explosionGeometry) child.geometry.dispose();
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const mat of materials) {
        if (mat && !sharedMaterials.has(mat)) mat.dispose();
      }
    });
  }

  function spawnObstacle(options = {}) {
    const difficulty = clamp(distance / 5000, 0, 1);
    const settings = difficultySettings[difficultyMode];
    const activeLanes = roadSection === "highway" ? interstateLanes : regularLanes;
    const blockedLanes = ramps
      .filter(ramp => Math.abs(ramp.mesh.position.z - player.position.z) < 150)
      .map(ramp => ramp.lane);
    const availableLanes = activeLanes.filter(candidate => !blockedLanes.includes(candidate));
    if (!options.rampLinked && availableLanes.length === 0) return;
    const lanesForPattern = availableLanes;
    const desiredCount = options.rampLinked ? 1 : settings.singleSafeLane
      ? Math.max(0, lanesForPattern.length - 1)
      : distance > 220 && Math.random() < settings.extraCarChance + difficulty * 0.12 ? 2 : 1;
    const nearbySafeLanes = previousSafeLane === null
      ? lanesForPattern
      : lanesForPattern.filter(candidate => Math.abs(candidate - previousSafeLane) <= 1);
    const freeLane = options.rampLinked ? null : choose(
      nearbySafeLanes.length ? nearbySafeLanes : lanesForPattern
    );
    if (!options.rampLinked) previousSafeLane = freeLane;
    const chosen = options.lane !== undefined ? [options.lane] :
      lanesForPattern.filter(candidate => candidate !== freeLane);
    for (let i = chosen.length - 1; i > 0; i--) {
      const swapIndex = Math.floor(Math.random() * (i + 1));
      [chosen[i], chosen[swapIndex]] = [chosen[swapIndex], chosen[i]];
    }
    const count = Math.min(desiredCount, chosen.length);
    for (let i = 0; i < count; i++) {
      let pool = distance < 500 ? vehicleTypes.slice(0, 4) : vehicleTypes;
      if (distance - lastSemiDistance < 900 || obstacles.some(obstacle => obstacle.type === "semi")) {
        pool = pool.filter(candidate => candidate.name !== "semi");
      }
      const variedPool = pool.filter(candidate => candidate.name !== lastVehicleType);
      if (variedPool.length) pool = variedPool;
      const totalWeight = pool.reduce((sum, candidate) => sum + candidate.weight, 0);
      let roll = Math.random() * totalWeight;
      let type = pool[pool.length - 1];
      for (const candidate of pool) {
        roll -= candidate.weight;
        if (roll < 0) {
          type = candidate;
          break;
        }
      }
      const swerver = !options.rampLinked && distance > 180 &&
        Math.random() < settings.swerveChance + difficulty * 0.08;
      const sourceLane = options.lane !== undefined ? options.lane : chosen[i];
      const willSwerve = swerver;
      const carType = willSwerve ? "sport" : type.name;
      const carColor = willSwerve ? choose(bmwColors) : type.color;
      lastVehicleType = carType;
      if (carType === "semi") lastSemiDistance = distance;
      const mesh = makeCar(
        carType,
        carColor,
        false,
        willSwerve
      );
      mesh.traverse(child => {
        if (child.isMesh) child.castShadow = false;
      });
      mesh.position.set(laneX(sourceLane), 0, options.z ?? -100);
      if (trafficDirection === "same") mesh.rotation.y = Math.PI;
      scene.add(mesh);
      obstacles.push({
        id: nextObstacleId++,
        lane: sourceLane,
        mesh,
        type: carType,
        color: carColor,
        branded: willSwerve,
        rampLinked: Boolean(options.rampLinked),
        swerver: willSwerve,
        swerveTarget: sourceLane,
        swerveStarted: false,
        moveFactor: options.rampLinked ? 1 :
          trafficDirection === "oncoming" ? 1.25 + difficulty * 0.16 : 0.48 - difficulty * 0.06,
        collisionDepth: carType === "semi" ? 6.5 : carType === "truck" ? 5.3 : 3.45,
        swerveSpeed: rand(2.2, 3.1),
        exploded: false
      });
    }
  }

  function buildRampMesh(laneIndex, positionZ) {
    const group = new THREE.Group();
    const vertices = [
      -1.2, 1.3, -2.7,  1.2, 1.3, -2.7,
       1.2, 0.08,  2.5, -1.2, 0.08,  2.5,
      -1.2, 0.08, -2.7,  1.2, 0.08, -2.7,
       1.2, 0.08,  2.5, -1.2, 0.08,  2.5
    ];
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex([
      0, 2, 1, 0, 3, 2,
      0, 3, 7, 0, 7, 4,
      1, 5, 6, 1, 6, 2,
      3, 2, 6, 3, 6, 7,
      4, 5, 6, 4, 6, 7
    ]);
    geometry.computeVertexNormals();
    const surface = new THREE.Mesh(geometry, rampMat);
    surface.castShadow = true;
    surface.receiveShadow = true;
    group.add(surface);

    const stripeAngle = Math.atan(1.22 / 5.2);
    for (const z of [-1.6, -0.3, 1]) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.055, 0.12), rampStripeMat);
      stripe.position.set(0, 0.08 + ((2.5 - z) / 5.2) * 1.22 + 0.035, z);
      stripe.rotation.x = stripeAngle;
      group.add(stripe);
    }
    group.position.set(laneX(laneIndex), 0, positionZ);
    return group;
  }

  function makeRamp(laneIndex) {
    const group = buildRampMesh(laneIndex, -85);
    scene.add(group);
    ramps.push({
      id: nextRampId++,
      mesh: group,
      lane: laneIndex,
      triggered: false
    });
    spawnObstacle({ lane: laneIndex, z: -97, rampLinked: true });
  }

  function createExplosion(x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0.9, z);
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: "#ff3b12", transparent: true, opacity: 0.95
    });
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: "#ffd43b", transparent: true, opacity: 0.82
    });
    const core = new THREE.Mesh(explosionGeometry, coreMaterial);
    core.scale.setScalar(0.85);
    group.add(core);
    const glow = new THREE.Mesh(explosionGeometry, glowMaterial);
    glow.scale.setScalar(0.55);
    group.add(glow);

    const sparks = [];
    const shockwaveMaterial = new THREE.MeshBasicMaterial({
      color: "#ffc857", transparent: true, opacity: 0.9,
      side: THREE.DoubleSide
    });
    const shockwave = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.07, 6, 40),
      shockwaveMaterial
    );
    shockwave.rotation.x = Math.PI / 2;
    shockwave.position.y = -0.55;
    shockwave.scale.setScalar(0.3);
    group.add(shockwave);
    for (let i = 0; i < 32; i++) {
      const sparkMaterial = new THREE.MeshBasicMaterial({
        color: i % 3 ? "#ff8b16" : "#fff3ad",
        transparent: true,
        opacity: 1
      });
      const spark = new THREE.Mesh(explosionGeometry, sparkMaterial);
      const size = rand(0.11, 0.28);
      spark.scale.set(size, size, size);
      group.add(spark);
      const direction = new THREE.Vector3(rand(-1, 1), rand(-0.15, 1), rand(-1, 1))
        .normalize();
      sparks.push({
        mesh: spark,
        velocity: direction.multiplyScalar(rand(8, 17))
      });
    }

    scene.add(group);
    const light = new THREE.PointLight("#ff671d", 22, 26);
    light.position.set(x, 1.2, z);
    scene.add(light);
    return {
      mesh: group, core, glow, coreMaterial, glowMaterial, shockwave,
      shockwaveMaterial, sparks, light, age: 0
    };
  }

  function recordReplayFrame(force = false) {
    if (!force && captureElapsed < 0.05) return;
    captureElapsed %= 0.05;
    replayFrames.push({
      t: runElapsed,
      p: [
        player.position.x, player.position.y, player.position.z,
        player.rotation.y, player.rotation.z
      ],
      c: obstacles.filter(obstacle => !obstacle.removed).map(obstacle => {
        replayCatalog[obstacle.id] = {
          type: obstacle.type,
          color: obstacle.color,
          branded: obstacle.branded
        };
        return [
          obstacle.id,
          obstacle.mesh.position.x, obstacle.mesh.position.y, obstacle.mesh.position.z,
          obstacle.mesh.rotation.y, obstacle.mesh.rotation.z
        ];
      }),
      r: ramps.map(ramp => [
        ramp.id, ramp.lane, ramp.mesh.position.z, ramp.triggered ? 1 : 0
      ]),
      o: roadOffset,
      d: distance,
      h: highwayBlend,
      q: roadSection
    });
    const oldestTime = runElapsed - 8;
    while (replayFrames.length > 2 && replayFrames[1].t < oldestTime) replayFrames.shift();
    const recordedIds = new Set(replayFrames.flatMap(frame => frame.c.map(car => car[0])));
    for (const id of Object.keys(replayCatalog)) {
      if (!recordedIds.has(Number(id))) delete replayCatalog[id];
    }
  }

  function interpolate(a, b, amount) {
    return a + (b - a) * amount;
  }

  function applyRoadOffset(offset) {
    roadOffset = offset;
    for (let i = 0; i < laneMarkings.length; i++) {
      const baseZ = -110 + (i % 22) * 7;
      laneMarkings[i].mesh.position.z = wrapPosition(baseZ + offset, -146, 154);
    }
    for (const item of scenery) {
      const z = wrapPosition(item.baseZ + offset, -206, 224);
      item.tree.position.z = z;
      item.cactus.position.z = z;
    }
    for (const cone of constructionCones) {
      cone.mesh.position.z = wrapPosition(cone.baseZ + offset, -206, 224);
    }
  }

  function setReplayFrame(time) {
    const frames = replayData.frames;
    const first = frames[0];
    let index = 0;
    while (index < frames.length - 2 && frames[index + 1].t < time) index++;
    const a = frames[index];
    const b = frames[Math.min(index + 1, frames.length - 1)];
    const duration = b.t - a.t;
    const amount = duration > 0 ? clamp((time - a.t) / duration, 0, 1) : 0;
    player.position.x = interpolate(a.p[0], b.p[0], amount);
    player.position.y = interpolate(a.p[1], b.p[1], amount);
    player.position.z = interpolate(a.p[2], b.p[2], amount);
    player.rotation.y = interpolate(a.p[3], b.p[3], amount);
    player.rotation.z = interpolate(a.p[4], b.p[4], amount);
    const offsetA = Number.isFinite(a.o) ? a.o : (a.t - first.t) * 18;
    const offsetB = Number.isFinite(b.o) ? b.o : (b.t - first.t) * 18;
    applyRoadOffset(interpolate(offsetA, offsetB, amount));
    const highwayBlendA = Number.isFinite(a.h) ? a.h : 0;
    const highwayBlendB = Number.isFinite(b.h) ? b.h : 0;
    const replayRoadSection = amount < 0.5 ? a.q : b.q;
    applyRoadLayout(
      interpolate(highwayBlendA, highwayBlendB, amount),
      ["regular", "opening", "highway", "construction"].includes(replayRoadSection)
        ? replayRoadSection : "regular"
    );
    const replayDuration = frames[frames.length - 1].t - first.t;
    const legacyDistanceStart = Math.max(
      0, (replayData.distance || 0) - replayDuration * 22
    );
    const biomeDistanceA = Number.isFinite(a.d)
      ? a.d : legacyDistanceStart + (a.t - first.t) * 22;
    const biomeDistanceB = Number.isFinite(b.d)
      ? b.d : legacyDistanceStart + (b.t - first.t) * 22;
    applyBiome(interpolate(biomeDistanceA, biomeDistanceB, amount));

    const aCars = new Map(a.c.map(car => [car[0], car]));
    const bCars = new Map(b.c.map(car => [car[0], car]));
    for (const [id, mesh] of replayActors) {
      const carA = aCars.get(id);
      const carB = bCars.get(id);
      const from = carA ?? carB;
      const to = carB ?? carA;
      mesh.visible = Boolean(from && to);
      if (!mesh.visible) continue;
      mesh.position.set(
        interpolate(from[1], to[1], amount),
        interpolate(from[2], to[2], amount),
        interpolate(from[3], to[3], amount)
      );
      mesh.rotation.y = interpolate(from[4], to[4], amount);
      mesh.rotation.z = interpolate(from[5], to[5], amount);
    }

    const aRamps = new Map((a.r ?? []).map(ramp => [ramp[0], ramp]));
    const bRamps = new Map((b.r ?? []).map(ramp => [ramp[0], ramp]));
    for (const [id, mesh] of replayRampActors) {
      const rampA = aRamps.get(id);
      const rampB = bRamps.get(id);
      const currentRamp = rampA ?? rampB;
      mesh.visible = Boolean(currentRamp);
      if (!currentRamp) continue;
      const nextRamp = rampB ?? currentRamp;
      mesh.position.x = laneX(currentRamp[1]);
      mesh.position.z = interpolate(currentRamp[2], nextRamp[2], amount);
    }

    camera.position.x = lerp(camera.position.x, player.position.x * 0.48, 0.18);
    camera.position.y = lerp(camera.position.y, 7.4 + player.position.y * 0.12, 0.18);
    camera.lookAt(player.position.x * 0.36, 0.85 + player.position.y * 0.12, -24);
  }

  let replayData = null;

  function playReplay(data, returnToMenu) {
    if (!data || !Array.isArray(data.frames) || data.frames.length === 0 ||
        !data.cars || !data.frames[0].p || !Array.isArray(data.frames[0].c)) {
      ui.replayStatus.textContent = "No replay is available to play.";
      return;
    }
    replayData = data;
    replayReturnToMenu = returnToMenu;
    replayPlaybackTime = 0;
    replayElapsed = 0;
    replayPhase = "playback";
    crashExplosion = null;
    shake = 0;
    flashTimer = 0;
    ui.crash.style.opacity = "0";
    for (const mesh of replayActors.values()) removeObject(mesh);
    for (const mesh of replayRampActors.values()) removeObject(mesh);
    replayActors = new Map();
    replayRampActors = new Map();
    for (const obstacle of obstacles) obstacle.mesh.visible = false;
    for (const ramp of ramps) ramp.mesh.visible = false;
    const carCatalog = { ...data.cars };
    for (const frame of data.frames) {
      for (const car of frame.c) {
        if (!carCatalog[car[0]]) {
          carCatalog[car[0]] = { type: "sedan", color: "#dc493d", branded: false };
        }
      }
    }
    for (const [id, description] of Object.entries(carCatalog)) {
      const mesh = makeCar(description.type, description.color, false, description.branded);
      mesh.visible = false;
      scene.add(mesh);
      replayActors.set(Number(id), mesh);
    }
    for (const frame of data.frames) {
      for (const [id, laneIndex, z] of frame.r ?? []) {
        if (replayRampActors.has(id)) continue;
        const mesh = buildRampMesh(laneIndex, z);
        mesh.visible = false;
        scene.add(mesh);
        replayRampActors.set(id, mesh);
      }
    }
    player.visible = true;
    ui.start.classList.add("hidden");
    ui.pause.classList.add("hidden");
    ui.over.classList.add("hidden");
    ui.laneHint.textContent = "REPLAY • CRASH INCOMING";
    ui.distance.textContent = `${data.distance || 0} m`;
    ui.speed.textContent = `${data.topSpeed || 80} km/h`;
    state = "replay";
    setReplayFrame(data.frames[0].t);
    lastTime = performance.now();
  }

  function createCrashFlight() {
    player.visible = true;
    crashVelocity.set(rand(-1.8, 1.8), 9.4, -9);
    crashSpin.set(rand(3, 5.5), rand(-2.8, 2.8), rand(-6.5, 6.5));
    crashBounced = false;
    replayPhase = "flight";
    replayElapsed = 0;
    ui.laneHint.textContent = "CRASH • CAR AIRBORNE";
  }

  function updateReplay(dt) {
    if (replayPhase === "playback") {
      replayPlaybackTime += dt;
      const first = replayData.frames[0];
      const last = replayData.frames[replayData.frames.length - 1];
      setReplayFrame(Math.min(last.t, first.t + replayPlaybackTime));
      if (first.t + replayPlaybackTime >= last.t) {
        createCrashFlight();
      }
      return;
    }

    replayElapsed += dt;
    if (replayPhase === "flight") {
      crashVelocity.y -= jumpGravity * dt;
      player.position.addScaledVector(crashVelocity, dt);
      player.rotation.x += crashSpin.x * dt;
      player.rotation.y += crashSpin.y * dt;
      player.rotation.z += crashSpin.z * dt;
      if (player.position.y < 0.15 && replayElapsed > 0.35) {
        player.position.y = 0.15;
        if (!crashBounced) {
          crashVelocity.y = Math.abs(crashVelocity.y) * 0.3;
          crashVelocity.x *= 0.55;
          crashVelocity.z *= 0.55;
          crashBounced = true;
        } else {
          crashVelocity.y = 0;
        }
      }
      camera.position.x = lerp(camera.position.x, player.position.x * 0.82, 1 - Math.exp(-dt * 2.6));
      camera.position.y = lerp(camera.position.y, 7.4 + player.position.y * 0.12, 1 - Math.exp(-dt * 2));
      camera.position.z = lerp(camera.position.z, player.position.z + 10.8, 1 - Math.exp(-dt * 2));
      camera.lookAt(player.position.x * 0.75, 0.85 + player.position.y * 0.12, player.position.z - 28.7);
      if (replayElapsed >= 1.65) {
        crashExplosion = createExplosion(player.position.x, player.position.z);
        replayPhase = "explosion";
        replayElapsed = 0;
      }
      return;
    }

    if (crashExplosion) {
      updateExplosion(crashExplosion, dt);
      if (crashExplosion.age >= explosionDuration) {
        scene.remove(crashExplosion.light);
        removeObject(crashExplosion.mesh);
        crashExplosion = null;
        finishReplay();
      }
    }
  }

  function updateExplosion(explosion, dt) {
    explosion.age += dt;
    const progress = clamp(explosion.age / explosionDuration, 0, 1);
    explosion.core.scale.setScalar(0.85 + progress * 3.8);
    explosion.glow.scale.setScalar(0.55 + progress * 5.2);
    explosion.coreMaterial.opacity = 0.95 * (1 - progress);
    explosion.glowMaterial.opacity = 0.82 * (1 - progress);
    explosion.shockwave.scale.setScalar(0.3 + progress * 8);
    explosion.shockwaveMaterial.opacity = 0.9 * (1 - progress);
    explosion.light.intensity = 22 * (1 - progress);
    for (const spark of explosion.sparks) {
      spark.mesh.position.addScaledVector(spark.velocity, dt);
      spark.velocity.y -= 11.5 * dt;
      spark.mesh.material.opacity = 1 - progress;
    }
  }

  function finishReplay() {
    replayActors.forEach(removeObject);
    replayActors.clear();
    replayRampActors.forEach(removeObject);
    replayRampActors.clear();
    for (const obstacle of obstacles) removeObject(obstacle.mesh);
    obstacles = [];
    for (const ramp of ramps) removeObject(ramp.mesh);
    ramps = [];
    rampRide = null;
    jumpElapsed = -1;
    player.visible = true;
    player.position.set(0, 0, 4.7);
    player.rotation.set(0, 0, 0);
    lane = 2;
    laneVisual = 2;
    applyRoadLayout(0, "regular");
    applyRoadOffset(0);
    applyBiome(0);
    camera.position.set(0, 7.4, 15.5);
    camera.lookAt(0, 0.8, -24);
    if (replayReturnToMenu) {
      state = "menu";
      ui.start.classList.remove("hidden");
      ui.laneHint.textContent = "← A / ← SWITCH LANES → / D →";
      ui.saveReplayMenu.classList.toggle("hidden", !lastReplay);
      ui.watchReplay.classList.toggle("hidden", !savedReplay);
      return;
    }
    state = "over";
    ui.laneHint.textContent = "REPLAY COMPLETE";
    ui.saveReplayOver.disabled = !lastReplay;
    ui.over.classList.remove("hidden");
  }

  function update(dt) {
    if (state === "replay") {
      updateReplay(dt);
      return;
    }
    if (state !== "playing") return;
    if (!Number.isFinite(distance) || distance < 0) {
      console.error("Run distance became invalid; resetting its counter.", distance);
      distance = 0;
    }
    runElapsed += dt;
    captureElapsed += dt;
    const settings = difficultySettings[difficultyMode];
    speed = Math.min(settings.maxSpeed, settings.startSpeed + distance * settings.acceleration);
    topSpeed = Math.max(topSpeed, speed);
    distance += speed / 3.6 * dt;
    updateRoadSection(distance);
    const distanceDifficulty = clamp(distance / 5000, 0, 1);
    const travelSpeed = 13 + (speed - 80) * 0.105;
    roadOffset += dt * travelSpeed;

    laneVisual = lerp(laneVisual, lane, 1 - Math.exp(-dt * 9));
    player.position.x = lerp(player.position.x, laneX(laneVisual), 1 - Math.exp(-dt * 8));
    player.rotation.y = clamp((laneX(laneVisual) - player.position.x) * -0.12, -0.12, 0.12);

    for (const { mesh } of laneMarkings) {
      mesh.position.z += travelSpeed * dt;
      if (mesh.position.z > 8) mesh.position.z -= 154;
    }
    for (const { mesh } of constructionCones) {
      mesh.position.z += travelSpeed * dt;
      if (mesh.position.z > 18) mesh.position.z -= 288;
    }
    for (const item of scenery) {
      item.tree.position.z += travelSpeed * dt;
      if (item.tree.position.z > 18) item.tree.position.z -= 224;
      item.cactus.position.z = item.tree.position.z;
    }

    spawnTimer -= dt;
    const interval = clamp(1.2 - distance / 18000, 0.38, 1.2) * settings.trafficInterval;
    if (spawnTimer <= 0) {
      spawnObstacle();
      const trafficFactor = trafficDirection === "oncoming"
        ? 1.25 + distanceDifficulty * 0.16
        : 0.48 - distanceDifficulty * 0.06;
      spawnTimer = Math.max(interval * rand(0.82, 1.18), 7.5 / (travelSpeed * trafficFactor));
    }

    rampTimer -= dt;
    if (rampTimer <= 0 && ramps.length === 0) {
      const activeLanes = roadSection === "highway" ? interstateLanes : regularLanes;
      const clearRampLanes = activeLanes.filter(candidate =>
        !obstacles.some(obstacle => !obstacle.removed &&
          (obstacle.lane === candidate ||
            (obstacle.targetX !== undefined && Math.abs(obstacle.targetX - laneX(candidate)) < 1.6) ||
            Math.abs(obstacle.mesh.position.x - laneX(candidate)) < 1.6) &&
          obstacle.mesh.position.z > -145 &&
          obstacle.mesh.position.z < -55)
      );
      if (clearRampLanes.length) {
        makeRamp(choose(clearRampLanes));
        rampTimer = rand(settings.rampMin, settings.rampMax);
      } else {
        rampTimer = 0.75;
      }
    }
    for (const ramp of ramps) {
      ramp.mesh.position.z += travelSpeed * dt;
      const localZ = player.position.z - ramp.mesh.position.z;
      if (!ramp.triggered && ramp.lane === lane && localZ <= 2.5 && localZ >= -2.7) {
        ramp.triggered = true;
        rampRide = ramp;
      }
    }
    if (rampRide) {
      const localZ = player.position.z - rampRide.mesh.position.z;
      if (localZ < -2.7) {
        rampRide = null;
        jumpElapsed = 0;
        jumpStartHeight = 1.3;
        jumpVelocity = clamp((travelSpeed * 1.22 / 5.2) * 1.5, 5.2, 8.5);
      } else if (localZ <= 2.5) {
        player.position.y = Math.max(0.08, 0.08 + ((2.5 - localZ) / 5.2) * 1.22);
        ui.laneHint.textContent = "RAMP • LAUNCHING";
      } else {
        rampRide = null;
      }
    }
    if (jumpElapsed >= 0) {
      jumpElapsed += dt;
      player.position.y = jumpStartHeight + jumpVelocity * jumpElapsed -
        0.5 * jumpGravity * jumpElapsed * jumpElapsed;
      if (player.position.y <= 0) {
        jumpElapsed = -1;
        player.position.y = 0;
        ui.laneHint.textContent = trafficDirection === "oncoming"
          ? "ONCOMING TRAFFIC • WATCH FOR RAMPS"
          : "SAME DIRECTION • WATCH FOR RAMPS";
      } else {
        ui.laneHint.textContent = "AIRBORNE — CLEAR THE TRAFFIC";
      }
    } else if (!rampRide) {
      player.position.y = 0;
    }
    camera.position.x = lerp(camera.position.x, player.position.x * 0.3, 1 - Math.exp(-dt * 2.6));
    camera.position.y = lerp(camera.position.y, 7.4 + player.position.y * 0.12, 1 - Math.exp(-dt * 2));
    camera.lookAt(player.position.x * 0.16, 0.85 + player.position.y * 0.12, -24);
    const passedRamps = ramps.filter(ramp => ramp.mesh.position.z > player.position.z + 9);
    for (const ramp of passedRamps) removeObject(ramp.mesh);
    ramps = ramps.filter(ramp => ramp.mesh.position.z <= player.position.z + 9);

    for (const obstacle of obstacles) {
      if (state !== "playing") break;
      obstacle.mesh.position.z += travelSpeed * obstacle.moveFactor * dt;
      if (obstacle.swerver && obstacle.mesh.position.z > -29 && !obstacle.swerveStarted) {
        obstacle.swerveStarted = true;
        const activeLanes = roadSection === "highway" ? interstateLanes : regularLanes;
        const adjacentLanes = [obstacle.lane - 1, obstacle.lane + 1]
          .filter(candidate => activeLanes.includes(candidate));
        const openLanes = adjacentLanes.filter(candidate =>
          !ramps.some(ramp => ramp.lane === candidate &&
            Math.abs(ramp.mesh.position.z - obstacle.mesh.position.z) < 14) &&
          !obstacles.some(other => other !== obstacle && !other.removed &&
            ((other.swerver && other.swerveStarted && !other.wallTarget &&
              other.swerveTarget === candidate) ||
              Math.abs(other.mesh.position.x - laneX(candidate)) < 1.55) &&
            Math.abs(other.mesh.position.z - obstacle.mesh.position.z) <
              (other.collisionDepth + obstacle.collisionDepth) / 2 + 5)
        );
        if (openLanes.length) {
          obstacle.swerveTarget = choose(openLanes);
          obstacle.wallTarget = false;
          obstacle.targetX = laneX(obstacle.swerveTarget);
        } else {
          const wallDirection = obstacle.lane === activeLanes[0] ? -1 :
            obstacle.lane === activeLanes[activeLanes.length - 1] ? 1 : choose([-1, 1]);
          obstacle.swerveTarget = obstacle.lane + wallDirection;
          obstacle.wallTarget = true;
          obstacle.targetX = wallDirection * (roadSection === "highway" ? 10.2 : 6.9);
        }
      }

      if (obstacle.targetX !== undefined) {
        obstacle.mesh.position.x = lerp(
          obstacle.mesh.position.x,
          obstacle.targetX,
          1 - Math.exp(-dt * (obstacle.swerveSpeed || 2.8))
        );
        obstacle.mesh.rotation.z = clamp((obstacle.targetX - obstacle.mesh.position.x) * -0.035, -0.08, 0.08);
        if (obstacle.swerver && obstacle.swerveStarted && !obstacle.wallTarget &&
            Math.abs(obstacle.mesh.position.x - obstacle.targetX) < 0.35) {
          obstacle.lane = obstacle.swerveTarget;
        }
      }

      if (obstacle.swerver && obstacle.swerveStarted && obstacle.wallTarget &&
          Math.abs(obstacle.mesh.position.x) >= (roadSection === "highway" ? 9.7 : 6.25) &&
          !obstacle.exploded) {
        obstacle.exploded = true;
        explosions.push(createExplosion(Math.sign(obstacle.mesh.position.x) * 6.2, obstacle.mesh.position.z));
        removeObject(obstacle.mesh);
        obstacle.removed = true;
        continue;
      }
      if (Math.abs(obstacle.mesh.position.z - player.position.z) <
            (obstacle.collisionDepth + 3.45) / 2 &&
          Math.abs(obstacle.mesh.position.x - player.position.x) < 1.85 &&
          player.position.y < 1.45 && !obstacle.hit) {
        obstacle.hit = true;
        crash();
      }
    }
    if (state !== "playing") return;
    obstacles = obstacles.filter(obstacle => !obstacle.removed);
    const passed = obstacles.filter(obstacle => obstacle.mesh.position.z > 17);
    for (const obstacle of passed) removeObject(obstacle.mesh);
    obstacles = obstacles.filter(obstacle => obstacle.mesh.position.z <= 17);

    for (const explosion of explosions) updateExplosion(explosion, dt);
    const expiredExplosions = explosions.filter(explosion =>
      explosion.age >= explosionDuration
    );
    for (const explosion of expiredExplosions) {
      scene.remove(explosion.light);
      removeObject(explosion.mesh);
    }
    explosions = explosions.filter(explosion => explosion.age < explosionDuration);

    shake = Math.max(0, shake - dt * 25);
    if (shake > 0) {
      camera.position.y = 7.4 + Math.sin(performance.now() * 0.06) * shake * 0.012;
    } else {
      camera.position.y = lerp(camera.position.y, 7.4, 0.12);
    }
    if (flashTimer > 0) {
      flashTimer -= dt;
      ui.crash.style.opacity = String(Math.max(0, flashTimer / 0.22) * 0.4);
    }
    ui.distance.textContent = `${Math.floor(distance)} m`;
    ui.speed.textContent = `${Math.floor(speed)} km/h`;
    applyBiome(distance);
    recordReplayFrame();
  }

  function crash() {
    if (state !== "playing") return;
    recordReplayFrame(true);
    lastReplay = {
      version: 1,
      distance: Math.floor(distance),
      topSpeed: Math.floor(topSpeed),
      direction: trafficDirection,
      frames: replayFrames,
      cars: replayCatalog
    };
    shake = 16;
    flashTimer = 0.22;
    ui.crash.style.opacity = "0.4";
    ui.finalDistance.textContent = `${Math.floor(distance)} m`;
    ui.finalSpeed.textContent = `${Math.floor(topSpeed)} km/h`;
    for (const explosion of explosions) {
      scene.remove(explosion.light);
      removeObject(explosion.mesh);
    }
    explosions = [];
    if (distance > best) {
      best = Math.floor(distance);
      localStorage.setItem("laneRushBest", String(best));
    }
    ui.best.textContent = `${Math.floor(best)} m`;
    playReplay(lastReplay, false);
  }

  function changeLane(dir) {
    if (state !== "playing") return;
    const activeLanes = roadSection === "highway" ? interstateLanes : regularLanes;
    lane = clamp(lane + dir, activeLanes[0], activeLanes[activeLanes.length - 1]);
  }

  function start(direction = trafficDirection) {
    for (const mesh of replayActors.values()) removeObject(mesh);
    replayActors.clear();
    for (const mesh of replayRampActors.values()) removeObject(mesh);
    replayRampActors.clear();
    if (crashExplosion) {
      scene.remove(crashExplosion.light);
      removeObject(crashExplosion.mesh);
      crashExplosion = null;
    }
    trafficDirection = direction;
    distance = 0;
    speed = difficultySettings[difficultyMode].startSpeed;
    topSpeed = speed;
    lane = 2;
    laneVisual = 2;
    nextInterstateAt = rand(2800, 4200);
    player.position.set(0, 0, 4.7);
    player.rotation.set(0, 0, 0);
    jumpElapsed = -1;
    jumpVelocity = 0;
    jumpStartHeight = 0;
    rampRide = null;
    for (const obstacle of obstacles) removeObject(obstacle.mesh);
    obstacles = [];
    for (const ramp of ramps) removeObject(ramp.mesh);
    ramps = [];
    for (const explosion of explosions) {
      scene.remove(explosion.light);
      removeObject(explosion.mesh);
    }
    explosions = [];
    replayFrames = [];
    replayCatalog = {};
    nextObstacleId = 0;
    nextRampId = 0;
    runElapsed = 0;
    captureElapsed = 0;
    lastVehicleType = "";
    previousSafeLane = null;
    lastSemiDistance = -Infinity;
    player.visible = true;
    spawnTimer = 0.8;
    rampTimer = rand(difficultySettings[difficultyMode].rampMin, difficultySettings[difficultyMode].rampMax);
    applyRoadOffset(0);
    updateRoadSection(0);
    applyBiome(0);
    shake = 0;
    flashTimer = 0;
    ui.crash.style.opacity = "0";
    ui.laneHint.textContent = trafficDirection === "oncoming"
      ? "ONCOMING TRAFFIC • WATCH FOR RAMPS"
      : "SAME DIRECTION • WATCH FOR RAMPS";
    ui.distance.textContent = "0 m";
    ui.speed.textContent = `${Math.floor(speed)} km/h`;
    ui.start.classList.add("hidden");
    ui.pause.classList.add("hidden");
    ui.over.classList.add("hidden");
    ui.saveReplayMenu.classList.toggle("hidden", !lastReplay);
    ui.watchReplay.classList.toggle("hidden", !savedReplay);
    ui.replayStatus.textContent = "";
    ui.replayStatusOver.textContent = "";
    ui.replayStatusOver.textContent = "";
    state = "playing";
    lastTime = performance.now();
  }

  function saveLastReplay() {
    if (!lastReplay) {
      ui.replayStatus.textContent = "Finish a run to create a replay.";
      return;
    }
    try {
      localStorage.setItem("laneRushReplay", JSON.stringify(lastReplay));
      savedReplay = lastReplay;
      ui.replayStatus.textContent = "Replay saved in this browser.";
      ui.replayStatusOver.textContent = "Replay saved in this browser.";
      ui.watchReplay.classList.remove("hidden");
      ui.saveReplayMenu.classList.remove("hidden");
    } catch {
      ui.replayStatus.textContent = "Could not save replay. Browser storage may be full.";
      ui.replayStatusOver.textContent = "Could not save replay. Browser storage may be full.";
    }
  }

  function showMainMenu() {
    state = "menu";
    ui.over.classList.add("hidden");
    ui.pause.classList.add("hidden");
    ui.start.classList.remove("hidden");
    ui.saveReplayMenu.classList.toggle("hidden", !lastReplay);
    ui.watchReplay.classList.toggle("hidden", !savedReplay);
    ui.replayStatus.textContent = "";
    ui.replayStatusOver.textContent = "";
    player.visible = true;
    player.position.set(0, 0, 4.7);
    player.rotation.set(0, 0, 0);
    ui.laneHint.textContent = "← A / ← SWITCH LANES → / D →";
  }

  function pause() {
    if (state === "playing") {
      state = "paused";
      ui.pause.classList.remove("hidden");
    } else if (state === "paused") {
      state = "playing";
      ui.pause.classList.add("hidden");
      lastTime = performance.now();
    }
  }

  $("oncomingBtn").addEventListener("click", () => start("oncoming"));
  $("sameWayBtn").addEventListener("click", () => start("same"));
  document.querySelectorAll("[data-difficulty]").forEach(button => {
    button.addEventListener("click", () => {
      difficultyMode = button.dataset.difficulty;
      localStorage.setItem("laneRushDifficulty", difficultyMode);
      document.querySelectorAll("[data-difficulty]").forEach(option => {
        const selected = option === button;
        option.classList.toggle("selected", selected);
        option.setAttribute("aria-pressed", String(selected));
      });
    });
  });
  $("againBtn").addEventListener("click", () => start());
  ui.saveReplayOver.addEventListener("click", saveLastReplay);
  ui.saveReplayMenu.addEventListener("click", saveLastReplay);
  ui.watchReplay.addEventListener("click", () => {
    if (savedReplay) playReplay(savedReplay, true);
  });
  $("menuBtn").addEventListener("click", showMainMenu);
  $("resumeBtn").addEventListener("click", pause);
  $("restartPauseBtn").addEventListener("click", () => start());
  ui.pauseBtn.addEventListener("click", pause);
  window.addEventListener("keydown", event => {
    if (["ArrowLeft", "ArrowRight", " ", "Escape"].includes(event.key)) event.preventDefault();
    if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") changeLane(-1);
    if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") changeLane(1);
    if (event.key === "Escape" || event.key.toLowerCase() === "p") {
      if (state === "playing" || state === "paused") pause();
    }
    if (event.key === "Enter" && (state === "menu" || state === "over")) start();
  });
  canvas.addEventListener("pointerdown", event => { touchStartX = event.clientX; });
  canvas.addEventListener("pointerup", event => {
    if (touchStartX === null) return;
    const dx = event.clientX - touchStartX;
    if (Math.abs(dx) > 24) changeLane(dx > 0 ? 1 : -1);
    touchStartX = null;
  });
  canvas.addEventListener("pointercancel", () => { touchStartX = null; });

  function loop(now) {
    const dt = Math.min((now - lastTime) / 1000 || 0, 0.04);
    lastTime = now;
    update(dt);
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
