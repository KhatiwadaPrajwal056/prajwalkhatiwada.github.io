/* =========================================================
   FLOATING NEURAL NETWORK
   ---------------------------------------------------------
   A slow, organic neural-network background.

   FLOW:

   INPUT
      ↓
   HIDDEN
      ↓
   HIDDEN
      ↓
   HIDDEN
      ↓
   OUTPUT
      ↓
   BACKPROPAGATION
      ↓
   REPEAT

   The entire network slowly floats while individual
   neurons have subtle independent movement.
   ========================================================= */

const canvas = document.getElementById("neural-bg");
const ctx = canvas.getContext("2d");

let width = 0;
let height = 0;
let dpr = 1;

let layers = [];
let connections = [];

let animation = {
  phase: "forward",
  progress: 0,
  path: [],
  timer: 0
};

let startTime = performance.now();


/* =========================================================
   CONFIGURATION
   ========================================================= */

const CONFIG = {

  layerSizes: [
    4,
    5,
    5,
    5,
    3,
    1
  ],

  /*
    Network occupies roughly this portion
    of the viewport.
  */

  networkWidth: 0.72,
  networkHeight: 0.62,

  /*
    Neuron size.
  */

  nodeRadius: 21,

  /*
    Network visibility.
  */

  connectionOpacity: 0.27,

  /*
    SLOW propagation.

    Previous:
      ~850ms

    Now:
      ~3 seconds
  */

  forwardDuration: 3000,
  backwardDuration: 2800,

  /*
    Pause between phases.
  */

  forwardPause: 900,
  backwardPause: 1300,

  /*
    Weight range.
  */

  minWeight: 0.15,
  maxWeight: 1.0,

  /*
    -------------------------------------------------------
    FLOATING MOTION
    -------------------------------------------------------
  */

  /*
    Overall movement of the entire network.
  */

  floatX: 14,
  floatY: 10,

  /*
    Very slow movement speed.
  */

  floatSpeed: 0.00032,

  /*
    Individual neuron movement.
  */

  neuronFloatX: 4,
  neuronFloatY: 3,

  /*
    Very subtle breathing scale.
  */

  breathingAmount: 0.012,

  /*
    Tiny rotation.
  */

  rotationAmount: 0.004

};


/* =========================================================
   COLORS
   ========================================================= */

const COLORS = {

  background: "#e4e7e7",

  line: "70, 80, 84",

  neuron: "#216271",

  input: "#d6b85a",

  output: "#e8793f",

  forward: "244, 197, 66",

  backward: "239, 125, 50"

};


/* =========================================================
   RESIZE
   ========================================================= */

function resize() {

  dpr =
    Math.min(
      window.devicePixelRatio || 1,
      2
    );

  width = window.innerWidth;
  height = window.innerHeight;

  canvas.width =
    width * dpr;

  canvas.height =
    height * dpr;

  canvas.style.width =
    `${width}px`;

  canvas.style.height =
    `${height}px`;

  ctx.setTransform(
    dpr,
    0,
    0,
    dpr,
    0,
    0
  );

  createNetwork();
}

window.addEventListener(
  "resize",
  resize
);


/* =========================================================
   RANDOM
   ========================================================= */

function random(min, max) {

  return (
    Math.random() *
    (max - min)
  ) + min;

}


function randomInt(min, max) {

  return Math.floor(
    Math.random() *
    (max - min + 1)
  ) + min;

}


/* =========================================================
   CREATE NETWORK
   ========================================================= */

function createNetwork() {

  layers = [];
  connections = [];

  let sizes =
    [...CONFIG.layerSizes];


  /*
    Simplify slightly on smaller screens.
  */

  if (width < 700) {

    sizes = [
      3,
      4,
      4,
      3,
      2,
      1
    ];

  }


  const networkWidth =
    Math.min(
      width *
        CONFIG.networkWidth,
      1050
    );


  const networkHeight =
    Math.min(
      height *
        CONFIG.networkHeight,
      560
    );


  const startX =
    width / 2 -
    networkWidth / 2;


  const startY =
    height / 2 -
    networkHeight / 2;


  const layerSpacing =
    networkWidth /
    (sizes.length - 1);


  /*
    Create neurons.
  */

  sizes.forEach(
    (size, layerIndex) => {

      const layer = [];

      const x =
        startX +
        layerIndex *
        layerSpacing;


      for (
        let i = 0;
        i < size;
        i++
      ) {

        let y;


        if (
          size === 1
        ) {

          y =
            height / 2;

        }

        else {

          const spacing =
            networkHeight /
            (size - 1);

          y =
            startY +
            i * spacing;

        }


        /*
          Give every neuron its own
          tiny movement characteristics.

          This is what prevents the
          network from looking like one
          rigid object.
        */

        layer.push({

          x,
          y,

          baseX: x,
          baseY: y,

          activation: 0,

          /*
            Different neurons move at
            slightly different frequencies.
          */

          phaseX:
            random(
              0,
              Math.PI * 2
            ),

          phaseY:
            random(
              0,
              Math.PI * 2
            ),

          speedX:
            random(
              0.7,
              1.3
            ),

          speedY:
            random(
              0.7,
              1.25
            )

        });

      }

      layers.push(layer);

    }
  );


  /*
    Create weighted connections.
  */

  for (
    let layerIndex = 0;
    layerIndex <
      layers.length - 1;
    layerIndex++
  ) {

    const sourceLayer =
      layers[layerIndex];

    const targetLayer =
      layers[layerIndex + 1];


    sourceLayer.forEach(
      (source, sourceIndex) => {

        targetLayer.forEach(
          (target, targetIndex) => {

            connections.push({

              sourceLayer:
                layerIndex,

              sourceIndex,

              targetLayer:
                layerIndex + 1,

              targetIndex,

              weight:
                random(
                  CONFIG.minWeight,
                  CONFIG.maxWeight
                ),

              activation: 0

            });

          }
        );

      }
    );

  }


  buildForwardPath();

}


/* =========================================================
   BUILD WEIGHTED PATH
   ========================================================= */

function buildForwardPath() {

  animation.path = [];

  let currentNeuron =
    randomInt(
      0,
      layers[0].length - 1
    );


  animation.path.push({

    layer: 0,

    neuron:
      currentNeuron

  });


  /*
    At every layer choose the next neuron
    according to the connection weight.

    Higher weight = higher probability.
  */

  for (
    let layerIndex = 0;
    layerIndex <
      layers.length - 1;
    layerIndex++
  ) {

    const candidates =
      layers[
        layerIndex + 1
      ].map(
        (_, targetIndex) => {

          const connection =
            getConnection(
              layerIndex,
              currentNeuron,
              layerIndex + 1,
              targetIndex
            );

          return {

            targetIndex,

            weight:
              connection
                ? connection.weight
                : 0.5

          };

        }
      );


    const totalWeight =
      candidates.reduce(
        (sum, item) =>
          sum + item.weight,
        0
      );


    let randomValue =
      Math.random() *
      totalWeight;


    let selected =
      candidates[0];


    for (
      const candidate
      of candidates
    ) {

      randomValue -=
        candidate.weight;

      if (
        randomValue <= 0
      ) {

        selected =
          candidate;

        break;

      }

    }


    currentNeuron =
      selected.targetIndex;


    animation.path.push({

      layer:
        layerIndex + 1,

      neuron:
        currentNeuron

    });

  }

}


/* =========================================================
   GET CONNECTION
   ========================================================= */

function getConnection(
  sourceLayer,
  sourceIndex,
  targetLayer,
  targetIndex
) {

  return connections.find(
    connection =>

      connection.sourceLayer ===
        sourceLayer &&

      connection.sourceIndex ===
        sourceIndex &&

      connection.targetLayer ===
        targetLayer &&

      connection.targetIndex ===
        targetIndex
  );

}


/* =========================================================
   ACTIVATE NODE
   ========================================================= */

function activateNode(
  layerIndex,
  neuronIndex,
  amount
) {

  const neuron =
    layers[layerIndex]
      ?. [neuronIndex];

  if (!neuron) {
    return;
  }

  neuron.activation =
    Math.max(
      neuron.activation,
      amount
    );

}


/* =========================================================
   FORWARD PROPAGATION
   ========================================================= */

function updateForward(delta) {

  animation.progress +=
    delta /
    CONFIG.forwardDuration;


  const totalSteps =
    animation.path.length - 1;


  const position =
    animation.progress *
    totalSteps;


  const segment =
    Math.floor(
      position
    );


  const segmentProgress =
    position -
    segment;


  /*
    Activate input.
  */

  const input =
    animation.path[0];


  if (input) {

    activateNode(
      input.layer,
      input.neuron,
      1
    );

  }


  /*
    Move activation through
    the selected weighted path.
  */

  if (
    segment >= 0 &&
    segment < totalSteps
  ) {

    const current =
      animation.path[
        segment
      ];


    const next =
      animation.path[
        segment + 1
      ];


    activateNode(
      current.layer,
      current.neuron,
      1
    );


    /*
      Target neuron gradually
      activates as signal arrives.
    */

    activateNode(
      next.layer,
      next.neuron,
      segmentProgress
    );


    /*
      Brighten actual connection.
    */

    const connection =
      getConnection(
        current.layer,
        current.neuron,
        next.layer,
        next.neuron
      );


    if (connection) {

      connection.activation =
        Math.max(
          connection.activation,
          1
        );

    }

  }


  /*
    Forward pass finished.
  */

  if (
    animation.progress >= 1
  ) {

    const output =
      animation.path[
        animation.path.length - 1
      ];


    activateNode(
      output.layer,
      output.neuron,
      1
    );


    animation.phase =
      "forwardPause";


    animation.timer = 0;

  }

}


/* =========================================================
   BACKPROPAGATION
   ========================================================= */

function updateBackward(delta) {

  animation.progress +=
    delta /
    CONFIG.backwardDuration;


  const totalSteps =
    animation.path.length - 1;


  const position =
    animation.progress *
    totalSteps;


  const reversePosition =
    totalSteps -
    position;


  const segment =
    Math.floor(
      reversePosition
    );


  const segmentProgress =
    reversePosition -
    segment;


  if (
    segment >= 0 &&
    segment < totalSteps
  ) {

    const current =
      animation.path[
        segment + 1
      ];


    const previous =
      animation.path[
        segment
      ];


    /*
      Output/hidden neuron active.
    */

    activateNode(
      current.layer,
      current.neuron,
      1
    );


    /*
      Backpropagated activation
      reaches previous neuron.
    */

    activateNode(
      previous.layer,
      previous.neuron,
      segmentProgress
    );


    /*
      Same weighted connection,
      now highlighted in reverse.
    */

    const connection =
      getConnection(
        previous.layer,
        previous.neuron,
        current.layer,
        current.neuron
      );


    if (connection) {

      connection.activation =
        Math.max(
          connection.activation,
          1
        );

    }

  }


  /*
    Backpropagation finished.
  */

  if (
    animation.progress >= 1
  ) {

    animation.phase =
      "backwardPause";

    animation.timer = 0;

  }

}


/* =========================================================
   UPDATE NETWORK MOVEMENT
   ========================================================= */

function updateNetworkMovement(
  time
) {

  /*
    A very slow global floating motion.
  */

  const globalX =
    Math.sin(
      time *
      CONFIG.floatSpeed
    ) *
    CONFIG.floatX;


  const globalY =
    Math.cos(
      time *
      CONFIG.floatSpeed *
      0.82
    ) *
    CONFIG.floatY;


  /*
    Tiny breathing movement.

    This gives the network some depth
    without making it look like it is
    zooming.
  */

  const breathing =
    1 +
    Math.sin(
      time *
      0.00028
    ) *
    CONFIG.breathingAmount;


  /*
    Very tiny rotation.
  */

  const rotation =
    Math.sin(
      time *
      0.00025
    ) *
    CONFIG.rotationAmount;


  const centerX =
    width / 2;

  const centerY =
    height / 2;


  /*
    Calculate every node's new
    visual position.
  */

  layers.forEach(
    layer => {

      layer.forEach(
        neuron => {

          /*
            Individual floating movement.
          */

          const individualX =
            Math.sin(
              time *
              0.00045 *
              neuron.speedX +
              neuron.phaseX
            ) *
            CONFIG.neuronFloatX;


          const individualY =
            Math.cos(
              time *
              0.00038 *
              neuron.speedY +
              neuron.phaseY
            ) *
            CONFIG.neuronFloatY;


          /*
            Scale around center.
          */

          const scaledX =
            centerX +
            (
              neuron.baseX -
              centerX
            ) *
            breathing;


          const scaledY =
            centerY +
            (
              neuron.baseY -
              centerY
            ) *
            breathing;


          /*
            Tiny rotation around center.
          */

          const dx =
            scaledX -
            centerX;

          const dy =
            scaledY -
            centerY;


          neuron.x =
            centerX +
            dx *
              Math.cos(rotation) -
            dy *
              Math.sin(rotation) +
            globalX +
            individualX;


          neuron.y =
            centerY +
            dx *
              Math.sin(rotation) +
            dy *
              Math.cos(rotation) +
            globalY +
            individualY;

        }

      );

    }
  );

}


/* =========================================================
   FADE ACTIVATION
   ========================================================= */

function fadeNetwork(delta) {

  /*
    Slow fade so activation trails
    remain visible for a moment.
  */

  const fade =
    Math.pow(
      0.03,
      delta / 1000
    );


  layers.forEach(
    layer => {

      layer.forEach(
        neuron => {

          neuron.activation *=
            fade;

        }

      );

    }
  );


  connections.forEach(
    connection => {

      connection.activation *=
        fade;

    }
  );

}


/* =========================================================
   UPDATE STATE
   ========================================================= */

function update(
  delta,
  time
) {

  /*
    Network movement is independent
    of propagation.
  */

  updateNetworkMovement(
    time
  );


  fadeNetwork(
    delta
  );


  switch (
    animation.phase
  ) {

    case "forward":

      updateForward(
        delta
      );

      break;


    case "forwardPause":

      animation.timer +=
        delta;

      if (
        animation.timer >
        CONFIG.forwardPause
      ) {

        animation.phase =
          "backward";

        animation.progress =
          0;

      }

      break;


    case "backward":

      updateBackward(
        delta
      );

      break;


    case "backwardPause":

      animation.timer +=
        delta;

      if (
        animation.timer >
        CONFIG.backwardPause
      ) {

        /*
          Create another path so the
          next propagation can use
          different weighted neurons.
        */

        buildForwardPath();

        animation.progress =
          0;

        animation.phase =
          "forward";

      }

      break;

  }

}


/* =========================================================
   DRAW CONNECTION
   ========================================================= */

function drawConnection(
  connection
) {

  const source =
    layers[
      connection.sourceLayer
    ][
      connection.sourceIndex
    ];


  const target =
    layers[
      connection.targetLayer
    ][
      connection.targetIndex
    ];


  /*
    Base visibility depends
    slightly on weight.

    Heavy weight = more visible.
  */

  const baseAlpha =
    CONFIG.connectionOpacity *
    (
      0.35 +
      connection.weight *
      0.65
    );


  ctx.beginPath();

  ctx.moveTo(
    source.x,
    source.y
  );

  ctx.lineTo(
    target.x,
    target.y
  );


  ctx.strokeStyle =
    `rgba(
      ${COLORS.line},
      ${baseAlpha}
    )`;


  ctx.lineWidth =
    0.65 +
    connection.weight *
    1.15;


  ctx.stroke();


  /*
    Active path.
  */

  if (
    connection.activation >
    0.015
  ) {

    const active =
      connection.activation;


    const isBackward =
      animation.phase ===
        "backward" ||
      animation.phase ===
        "backwardPause";


    const color =
      isBackward
        ? COLORS.backward
        : COLORS.forward;


    /*
      Soft glow.
    */

    ctx.beginPath();

    ctx.moveTo(
      source.x,
      source.y
    );

    ctx.lineTo(
      target.x,
      target.y
    );


    ctx.strokeStyle =
      `rgba(
        ${color},
        ${active}
      )`;


    ctx.lineWidth =
      1.5 +
      connection.weight *
      2.2;


    ctx.shadowBlur =
      7 +
      connection.weight *
      7;


    ctx.shadowColor =
      `rgba(
        ${color},
        ${active}
      )`;


    ctx.stroke();


    ctx.shadowBlur = 0;

  }

}


/* =========================================================
   DRAW ALL CONNECTIONS
   ========================================================= */

function drawConnections() {

  connections.forEach(
    drawConnection
  );

}


/* =========================================================
   DRAW NEURON
   ========================================================= */

function drawNeuron(
  neuron,
  layerIndex
) {

  const activation =
    neuron.activation;


  let color;


  /*
    Input.
  */

  if (
    layerIndex === 0
  ) {

    color =
      COLORS.input;

  }


  /*
    Output.
  */

  else if (
    layerIndex ===
    layers.length - 1
  ) {

    color =
      COLORS.output;

  }


  /*
    Hidden.
  */

  else {

    color =
      COLORS.neuron;

  }


  /*
    Active glow.
  */

  if (
    activation > 0.015
  ) {

    const isBackward =
      animation.phase ===
        "backward" ||
      animation.phase ===
        "backwardPause";


    const glowColor =
      isBackward
        ? COLORS.backward
        : COLORS.forward;


    const glow =
      ctx.createRadialGradient(
        neuron.x,
        neuron.y,
        0,
        neuron.x,
        neuron.y,
        65
      );


    glow.addColorStop(
      0,
      `rgba(
        ${glowColor},
        ${activation * 0.42}
      )`
    );


    glow.addColorStop(
      1,
      `rgba(
        ${glowColor},
        0
      )`
    );


    ctx.beginPath();

    ctx.arc(
      neuron.x,
      neuron.y,
      65,
      0,
      Math.PI * 2
    );


    ctx.fillStyle =
      glow;

    ctx.fill();

  }


  /*
    Node.
  */

  ctx.beginPath();

  ctx.arc(
    neuron.x,
    neuron.y,
    CONFIG.nodeRadius +
      activation * 3,
    0,
    Math.PI * 2
  );


  ctx.fillStyle =
    color;

  ctx.fill();


  /*
    Subtle border.
  */

  ctx.lineWidth = 1;

  ctx.strokeStyle =
    "rgba(255,255,255,0.65)";

  ctx.stroke();


  /*
    Active ring.
  */

  if (
    activation > 0.15
  ) {

    const isBackward =
      animation.phase ===
        "backward" ||
      animation.phase ===
        "backwardPause";


    ctx.beginPath();

    ctx.arc(
      neuron.x,
      neuron.y,
      CONFIG.nodeRadius +
        6 +
        activation * 3,
      0,
      Math.PI * 2
    );


    ctx.strokeStyle =
      isBackward
        ? `rgba(239,125,50,${activation})`
        : `rgba(244,197,66,${activation})`;


    ctx.lineWidth = 2;

    ctx.stroke();

  }

}


/* =========================================================
   DRAW ALL NEURONS
   ========================================================= */

function drawNeurons() {

  layers.forEach(
    (layer, layerIndex) => {

      layer.forEach(
        neuron => {

          drawNeuron(
            neuron,
            layerIndex
          );

        }
      );

    }
  );

}


/* =========================================================
   DRAW
   ========================================================= */

function draw() {

  ctx.clearRect(
    0,
    0,
    width,
    height
  );


  /*
    Background.
  */

  ctx.fillStyle =
    COLORS.background;

  ctx.fillRect(
    0,
    0,
    width,
    height
  );


  /*
    Connections first,
    neurons second.
  */

  drawConnections();

  drawNeurons();

}


/* =========================================================
   MAIN LOOP
   ========================================================= */

let previousTime =
  performance.now();


function animate(
  currentTime
) {

  const delta =
    Math.min(
      currentTime -
        previousTime,
      40
    );


  previousTime =
    currentTime;


  update(
    delta,
    currentTime -
      startTime
  );


  draw();


  requestAnimationFrame(
    animate
  );

}


/* =========================================================
   START
   ========================================================= */

resize();

requestAnimationFrame(
  animate
);