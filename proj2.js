"use strict";
const loc_aPosition = 1; // layout variables for vertexAttribPointer position
const loc_aColor = 2; // color
const loc_UVCoord = 3; // texture coordinates
const VSHADER_SOURCE = `#version 300 es
layout(location=${loc_aPosition}) in vec4 aPosition;
layout(location=${loc_aColor}) in vec4 aColor;
layout(location=${loc_UVCoord}) in vec2 UVCoord;
out vec4 vColor;
out vec2 vUVCoord;
uniform mat4 uMVP;
void main()
{
    gl_Position = uMVP * aPosition;
    vColor = aColor;
    vUVCoord = UVCoord;
}`;

const FSHADER_SOURCE = `#version 300 es
precision mediump float;
in vec4 vColor; // input color
in vec2 vUVCoord; // input texture coordinates from vertex shader
out vec4 fColor;  // output color
uniform sampler2D uSampler; 
uniform int uToggle;
void main()
{
    if(uToggle == 0) // when uToggle is 0 simply makes output color as input color
      fColor = vColor;
    else // if not use texture coordinates for output color
    {
      fColor = texture(uSampler, vUVCoord);
    }
}`;

// eye position
let g_eyeX = 0;
let g_eyeY = 0;
let g_eyeZ = 2;

// Constant eye positions for left viewport
const EYE_X = 5;
const EYE_Y = 2;
const EYE_Z = 10;

// FAR and NEAR plane
const FAR = 500;
const NEAR = 1;
// Radius for camera
const R = 10;

// Frustrum variables for orthograhic projection
const LEFT = -10;
const RIGHT = 10;
const TOP = 10;
const BOTTOM = -10;

// FOV 45 degree
const PERSE_ANGLE = 45;

// There are two viewports
// for the left dice
let Left_VIEWPORT_MVP = new Matrix4();
// for the right dice
let Right_VIEWPORT_MVP = new Matrix4();
// Camera line
let CamLineMVP = new Matrix4();
// Latitude line
let latitudeMVP = new Matrix4();

function main() 
{
  // Get webgl context
  const canvas = document.getElementById("webgl");
  const gl = canvas.getContext("webgl2");

  // init vertex shader and fragment shader.
  initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE);

  // Get width and height
  let w = canvas.width;
  let h = canvas.height;

  // Clear canvas with white color
  gl.clearColor(1.0, 1.0, 1.0, 1.0);
  // Turn on depth buffer
  gl.enable(gl.DEPTH_TEST);
  // Turn on culling
  gl.enable(gl.CULL_FACE);
  // clear back buffers
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Make Vertex array object and vertex buffer object for each objects
  const latitudeCircle = init_latitude(gl);
  const equator = init_equator(gl);
  const camLine = init_camline(gl);
  const axes = init_axes(gl);
  const cube = init_cube(gl, equator, latitudeCircle, camLine, axes, w, h);

  // Get uniform variables in shader program
  const loc_MVP = gl.getUniformLocation(gl.program, "uMVP");
  const loc_uToggle = gl.getUniformLocation(gl.program, "uToggle");

  //left view
  gl.viewport(0, 0, w / 2, h);
  Left_VIEWPORT_MVP.setOrtho(LEFT, RIGHT, BOTTOM, TOP, NEAR, FAR); // setting MVP matrix to orthographic mode
  Left_VIEWPORT_MVP.lookAt(EYE_X, EYE_Y, EYE_Z, 0, 0, 0, 0, 1, 0); // Eye position x, y, z Look at position 0, 0, 0 Up vector 0, 1, 0
  gl.uniformMatrix4fv(loc_MVP, false, Left_VIEWPORT_MVP.elements);

  // Set toggle to 1 for the texture.
  gl.uniform1i(loc_uToggle, 1);

  // Prepare for rendering cube
  gl.bindVertexArray(cube.vao);
  gl.drawElements(gl.TRIANGLES, cube.n, gl.UNSIGNED_BYTE, 0);

  // Settings for rendering equator line.
  gl.uniform1i(loc_uToggle, 0);

  gl.bindVertexArray(equator.vao);
  // Draw line.
  gl.drawArrays(gl.LINE_LOOP, 0, equator.n);

  // Prepare for the x, y, z axes for the cube
  gl.bindVertexArray(axes.vao);
  gl.drawArrays(gl.LINES, 0, axes.n);

  // Set camera model view projection matrix
  CamLineMVP.setOrtho(LEFT, RIGHT, BOTTOM, TOP, NEAR, FAR);
  CamLineMVP.lookAt(EYE_X, EYE_Y, EYE_Z, 0, 0, 0, 0, 1, 0);
  // Reverse the eye values for proper translation
  CamLineMVP.rotate(-g_eyeY, 1, 0, 0);
  CamLineMVP.rotate(-g_eyeX, 0, 1, 0);
  gl.uniformMatrix4fv(loc_MVP, false, CamLineMVP.elements);

  // Draw camera line
  gl.bindVertexArray(camLine.vao);
  gl.drawArrays(gl.LINES, 0, camLine.n);

  // Prepare for the latitude circle
  latitudeMVP.setOrtho(LEFT, RIGHT, BOTTOM, TOP, NEAR, FAR);
  latitudeMVP.lookAt(EYE_X, EYE_Y, EYE_Z, 0, 0, 0, 0, 1, 0);
  latitudeMVP.rotate(-g_eyeX, 0, 1, 0);
  gl.uniformMatrix4fv(loc_MVP, false, latitudeMVP.elements);

  // Draw latitude circle
  gl.bindVertexArray(latitudeCircle.vao);
  gl.drawArrays(gl.LINE_LOOP, 0, latitudeCircle.n);

  // Right view
  gl.viewport(w / 2, 0, w / 2, h);
  // Set perspective mode.
  Right_VIEWPORT_MVP.setPerspective(PERSE_ANGLE, w / 2 / h, NEAR, FAR);
  // Move along z axis by -R
  Right_VIEWPORT_MVP.translate(0, 0, -R);
  // In this case don't need to reverse the axes.
  Right_VIEWPORT_MVP.rotate(g_eyeY, 1, 0, 0);
  Right_VIEWPORT_MVP.rotate(g_eyeX, 0, 1, 0);
  gl.uniformMatrix4fv(loc_MVP, false, Right_VIEWPORT_MVP.elements);

  // Using texture.
  gl.uniform1i(loc_uToggle, 1);

  // Drawing cube in the right canvas
  gl.bindVertexArray(cube.vao);
  gl.drawElements(gl.TRIANGLES, cube.n, gl.UNSIGNED_BYTE, 0);

  // Key event for the inputs.
  document.onkeydown = function (event) {
    keydown(
      event,
      gl,
      cube,
      equator,
      latitudeCircle,
      camLine,
      axes,
      loc_MVP,
      loc_uToggle,
      Left_VIEWPORT_MVP,
      Right_VIEWPORT_MVP,
      CamLineMVP,
      latitudeMVP,
      canvas
    );
  };
  // Slider bar input event.
  document.getElementById("longitude").oninput = function (event) {
    refresh(
      gl,
      cube,
      equator,
      latitudeCircle,
      camLine,
      axes,
      loc_MVP,
      loc_uToggle,
      Left_VIEWPORT_MVP,
      Right_VIEWPORT_MVP,
      CamLineMVP,
      latitudeMVP,
      canvas
    );
  };
  // Slider bar input event.
  document.getElementById("latitude").oninput = function (event) {
    refresh(
      gl,
      cube,
      equator,
      latitudeCircle,
      camLine,
      axes,
      loc_MVP,
      loc_uToggle,
      Left_VIEWPORT_MVP,
      Right_VIEWPORT_MVP,
      CamLineMVP,
      latitudeMVP,
      canvas
    );
  };
}

// Inintialize the cube.
function init_cube(gl, equator, latitudeCircle, camLine, axes, w, h) {
  const vertices = new Float32Array([
    // Vertex coordinates
    1.0, 1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0,
    // v0-v1-v2-v3 front
    1.0, 1.0, 1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, 1.0, 1.0, -1.0,
    // v0-v3-v4-v5 right
    1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0,
    // v0-v5-v6-v1 up
    -1.0, 1.0, 1.0, -1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0,
    // v1-v6-v7-v2 left
    -1.0, -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, -1.0, -1.0, 1.0,
    // v7-v4-v3-v2 down
    1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0,
    // v4-v7-v6-v5 back
  ]);

  const indices = new Uint8Array([
    // Indices of the vertices
    0,
    1,
    2,
    0,
    2,
    3, // front
    4,
    5,
    6,
    4,
    6,
    7, // right
    8,
    9,
    10,
    8,
    10,
    11, // up
    12,
    13,
    14,
    12,
    14,
    15, // left
    16,
    17,
    18,
    16,
    18,
    19, // down
    20,
    21,
    22,
    20,
    22,
    23, // back
  ]);

  // Make VAO first!
  const vao = gl.createVertexArray();
  // Bind VAO
  gl.bindVertexArray(vao);
  // Elements buffer object for the indices
  const indexBuffer = gl.createBuffer();

  // Error checking
  if (!indexBuffer) {
    console.log("Failed to create an index buffer");
    return;
  }

  // After making VBO and then binding finally error checking
  // There are 3 points for the x, y, z so pass 3, no offset.
  if (!initArrayBuffer(gl, vertices, 3, gl.FLOAT, loc_aPosition)) {
    console.log("Failed to initialize an array buffer for the position");
    return;
  }

  // Bind buffer and modify the data.
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

  // initialize the texture
  init_texture(
    gl,
    vao,
    indices.length,
    equator,
    latitudeCircle,
    camLine,
    axes,
    w,
    h
  );

  // Unbind!
  gl.bindVertexArray(null);

  return { vao, n: indices.length };
}

// Initialize the texture
function init_texture(
  gl,
  vao,
  n,
  equator,
  latitudeCircle,
  camLine,
  axes,
  w,
  h
) {
  // Texture coordinates for the cube.
  const UVCoord = new Float32Array([
    //First
    0, 0.5, 0.25, 0.5, 0.25, 0.75, 0, 0.75,
    //Second
    0.25, 0.5, 0.5, 0.5, 0.5, 0.75, 0.25, 0.75,
    //Third
    0.5, 0.5, 0.75, 0.5, 0.75, 0.75, 0.5, 0.75,
    //Fifth
    0.5, 0.75, 0.75, 0.75, 0.75, 1, 0.5, 1,
    //Fourth
    0.75, 0.5, 1, 0.5, 1, 0.75, 0.75, 0.75,
    //Sixth
    0.5, 0.25, 0.75, 0.25, 0.75, 0.5, 0.5, 0.5,
  ]);

  // Create VBO and bind
  let UVCoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, UVCoordBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, UVCoord, gl.STATIC_DRAW);

  // UV coordinates need two floating points.
  gl.vertexAttribPointer(loc_UVCoord, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(loc_UVCoord);

  // Create the texture.
  let texture = gl.createTexture();
  // Activate 0 texture slot
  gl.activeTexture(gl.TEXTURE0);
  // Bind texture
  gl.bindTexture(gl.TEXTURE_2D, texture);
  // Setting the texture parametes.
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    1,
    1,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    new Uint8Array([0, 0, 255, 255])
  );
  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_MIN_FILTER,
    gl.LINEAR_MIPMAP_LINEAR
  );

  // Load the image.
  let image = new Image();
  let url = "https://live.staticflickr.com/65535/49093406911_7d185dba0e_b.jpg";
  image.src = url;
  // load texture when it's done.
  image.onload = function () {
    loadTexture(
      gl,
      texture,
      image,
      vao,
      n,
      equator,
      latitudeCircle,
      camLine,
      axes,
      w,
      h
    );
  };
  // Prevent Cross origin
  requestCORSIfNotSameOrigin(image, url);
}

// Call immediately after texutre load. it is almost identical to the main function but in this case bind texture to use it.
function loadTexture(
  gl,
  texture,
  image,
  vao,
  n,
  equator,
  latitudeCircle,
  camLine,
  axes,
  w,
  h
) {
  // Bind the texture.
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  // Generate mipmap
  gl.generateMipmap(gl.TEXTURE_2D);

  // Get uniform variables.
  const loc_MVP = gl.getUniformLocation(gl.program, "uMVP");
  const loc_uToggle = gl.getUniformLocation(gl.program, "uToggle");

  //left view
  gl.viewport(0, 0, w / 2, h);
  Left_VIEWPORT_MVP.setOrtho(LEFT, RIGHT, BOTTOM, TOP, NEAR, FAR); // setting MVP matrix to orthographic mode
  Left_VIEWPORT_MVP.lookAt(EYE_X, EYE_Y, EYE_Z, 0, 0, 0, 0, 1, 0); // Eye position x, y, z Look at position 0, 0, 0 Up vector 0, 1, 0
  gl.uniformMatrix4fv(loc_MVP, false, Left_VIEWPORT_MVP.elements);

  gl.uniform1i(loc_uToggle, 1);

  gl.bindVertexArray(vao);
  gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);

  gl.uniform1i(loc_uToggle, 0);

  gl.bindVertexArray(equator.vao);
  gl.drawArrays(gl.LINE_LOOP, 0, equator.n);

  gl.bindVertexArray(axes.vao);
  gl.drawArrays(gl.LINES, 0, axes.n);

  CamLineMVP.setOrtho(LEFT, RIGHT, BOTTOM, TOP, NEAR, FAR);
  CamLineMVP.lookAt(EYE_X, EYE_Y, EYE_Z, 0, 0, 0, 0, 1, 0);
  CamLineMVP.rotate(-g_eyeY, 1, 0, 0);
  CamLineMVP.rotate(-g_eyeX, 0, 1, 0);
  gl.uniformMatrix4fv(loc_MVP, false, CamLineMVP.elements);

  gl.bindVertexArray(camLine.vao);
  gl.drawArrays(gl.LINES, 0, camLine.n);

  latitudeMVP.setOrtho(LEFT, RIGHT, BOTTOM, TOP, NEAR, FAR);
  latitudeMVP.lookAt(EYE_X, EYE_Y, EYE_Z, 0, 0, 0, 0, 1, 0);
  latitudeMVP.rotate(-g_eyeX, 0, 1, 0);
  gl.uniformMatrix4fv(loc_MVP, false, latitudeMVP.elements);

  gl.bindVertexArray(latitudeCircle.vao);
  gl.drawArrays(gl.LINE_LOOP, 0, latitudeCircle.n);

  //right view
  gl.viewport(w / 2, 0, w / 2, h);
  Right_VIEWPORT_MVP.setPerspective(PERSE_ANGLE, w / 2 / h, NEAR, FAR);
  Right_VIEWPORT_MVP.translate(0, 0, -R);
  Right_VIEWPORT_MVP.rotate(g_eyeY, 1, 0, 0);
  Right_VIEWPORT_MVP.rotate(g_eyeX, 0, 1, 0);
  gl.uniformMatrix4fv(loc_MVP, false, Right_VIEWPORT_MVP.elements);

  gl.uniform1i(loc_uToggle, 1);
  gl.bindVertexArray(vao);
  gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);
}

// A function for make VBO and binding.
function initArrayBuffer(gl, data, num, type, loc_attribute) {
  const buffer = gl.createBuffer(); // Create a buffer object
  if (!buffer) {
    console.log("Failed to create the buffer object");
    return false;
  }
  // Write date into the buffer object
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  // Assign the buffer object to the attribute variable
  gl.vertexAttribPointer(loc_attribute, num, type, false, 0, 0);
  // Enable the assignment of the buffer object to the attribute variable
  gl.enableVertexAttribArray(loc_attribute);

  return true;
}

// Handling key input events.
function keydown(
  event,
  gl,
  cube,
  equator,
  latitudeCircle,
  camLine,
  axes,
  loc_MVP,
  loc_uToggle,
  LEFT_VIEWPORT_MVP,
  RIGHT_VIEWPORT_MVP,
  CamLineMVP,
  latitudeMVP,
  canvas
) {
  if (event.keyCode == 39) {
    // The right arrow key was pressed
    if (g_eyeX < 360) g_eyeX += 1;
  } else if (event.keyCode == 37) {
    // The left arrow key was pressed
    if (g_eyeX > 0) g_eyeX -= 1;
  }

  //UP
  if (event.keyCode == 38) {
    if (g_eyeY < 90) g_eyeY += 1;
  }
  //DOWN
  else if (event.keyCode == 40) {
    if (g_eyeY > -90) g_eyeY -= 1;
  }

  // Get dom elemetns by id and modify it.
  let longitudeVal = document.getElementById("currentLongitude");
  LongitudeSliderValue(g_eyeX);
  longitudeVal.innerHTML = g_eyeX;

  let latitudeVal = document.getElementById("currentLatitude");
  LatitudeSliderValue(g_eyeY);
  latitudeVal.innerHTML = g_eyeY;

  // Redraw after modifying the values.
  draw(
    gl,
    cube,
    equator,
    latitudeCircle,
    camLine,
    axes,
    loc_MVP,
    loc_uToggle,
    LEFT_VIEWPORT_MVP,
    RIGHT_VIEWPORT_MVP,
    CamLineMVP,
    latitudeMVP,
    canvas
  );
}

// Drwing all the objects after the key input events.
function draw(
  gl,
  cube,
  equator,
  latitudeCircle,
  camLine,
  axes,
  loc_MVP,
  loc_uToggle,
  LEFT_VIEWPORT_MVP,
  RIGHT_VIEWPORT_MVP,
  CamLineMVP,
  latitudeMVP,
  canvas
) {
  let w = canvas.width;
  let h = canvas.height;
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  //left view
  gl.viewport(0, 0, w / 2, h);
  LEFT_VIEWPORT_MVP.setOrtho(LEFT, RIGHT, BOTTOM, TOP, NEAR, FAR);
  LEFT_VIEWPORT_MVP.lookAt(EYE_X, EYE_Y, EYE_Z, 0, 0, 0, 0, 1, 0);
  gl.uniformMatrix4fv(loc_MVP, false, LEFT_VIEWPORT_MVP.elements);

  gl.uniform1i(loc_uToggle, 1);

  gl.bindVertexArray(cube.vao);
  gl.drawElements(gl.TRIANGLES, cube.n, gl.UNSIGNED_BYTE, 0);

  gl.uniform1i(loc_uToggle, 0);

  gl.bindVertexArray(equator.vao);
  gl.drawArrays(gl.LINE_STRIP, 0, equator.n);

  gl.bindVertexArray(axes.vao);
  gl.drawArrays(gl.LINES, 0, axes.n);

  CamLineMVP.setOrtho(LEFT, RIGHT, BOTTOM, TOP, NEAR, FAR);
  CamLineMVP.lookAt(EYE_X, EYE_Y, EYE_Z, 0, 0, 0, 0, 1, 0);
  CamLineMVP.rotate(-g_eyeX, 0, 1, 0);
  CamLineMVP.rotate(-g_eyeY, 1, 0, 0);
  gl.uniformMatrix4fv(loc_MVP, false, CamLineMVP.elements);

  gl.bindVertexArray(camLine.vao);
  gl.drawArrays(gl.LINES, 0, camLine.n);

  latitudeMVP.setOrtho(LEFT, RIGHT, BOTTOM, TOP, NEAR, FAR);
  latitudeMVP.lookAt(EYE_X, EYE_Y, EYE_Z, 0, 0, 0, 0, 1, 0);
  latitudeMVP.rotate(-g_eyeX, 0, 1, 0);
  gl.uniformMatrix4fv(loc_MVP, false, latitudeMVP.elements);

  gl.bindVertexArray(latitudeCircle.vao);
  gl.drawArrays(gl.LINE_STRIP, 0, latitudeCircle.n);

  //right view
  gl.viewport(w / 2, 0, w / 2, h);
  RIGHT_VIEWPORT_MVP.setPerspective(PERSE_ANGLE, w / 2 / h, NEAR, FAR);
  RIGHT_VIEWPORT_MVP.translate(0, 0, -R);
  RIGHT_VIEWPORT_MVP.rotate(g_eyeY, 1, 0, 0);
  RIGHT_VIEWPORT_MVP.rotate(g_eyeX, 0, 1, 0);
  gl.uniformMatrix4fv(loc_MVP, false, RIGHT_VIEWPORT_MVP.elements);

  gl.uniform1i(loc_uToggle, 1);

  gl.bindVertexArray(cube.vao);
  gl.drawElements(gl.TRIANGLES, cube.n, gl.UNSIGNED_BYTE, 0);
}

// Drawing function after slider bar input events.
function refresh(
  gl,
  cube,
  equator,
  latitudeCircle,
  camLine,
  axes,
  loc_MVP,
  loc_uToggle,
  Left_VIEWPORT_MVP,
  Right_VIEWPORT_MVP,
  CamLineMVP,
  latitudeMVP,
  canvas
) {
  g_eyeX = parseInt(document.getElementById("longitude").value);
  g_eyeY = parseInt(document.getElementById("latitude").value);
  let w = canvas.width;
  let h = canvas.height;
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  //left view
  gl.viewport(0, 0, w / 2, h);
  Left_VIEWPORT_MVP.setOrtho(LEFT, RIGHT, BOTTOM, TOP, NEAR, FAR);
  Left_VIEWPORT_MVP.lookAt(EYE_X, EYE_Y, EYE_Z, 0, 0, 0, 0, 1, 0);
  gl.uniformMatrix4fv(loc_MVP, false, Left_VIEWPORT_MVP.elements);

  gl.uniform1i(loc_uToggle, 1);

  gl.bindVertexArray(cube.vao);
  gl.drawElements(gl.TRIANGLES, cube.n, gl.UNSIGNED_BYTE, 0);

  gl.uniform1i(loc_uToggle, 0);

  gl.bindVertexArray(equator.vao);
  gl.drawArrays(gl.LINE_STRIP, 0, equator.n);

  gl.bindVertexArray(axes.vao);
  gl.drawArrays(gl.LINES, 0, axes.n);

  CamLineMVP.setOrtho(LEFT, RIGHT, BOTTOM, TOP, NEAR, FAR);
  CamLineMVP.lookAt(EYE_X, EYE_Y, EYE_Z, 0, 0, 0, 0, 1, 0);
  CamLineMVP.rotate(-g_eyeX, 0, 1, 0);
  CamLineMVP.rotate(-g_eyeY, 1, 0, 0);
  gl.uniformMatrix4fv(loc_MVP, false, CamLineMVP.elements);

  gl.bindVertexArray(camLine.vao);
  gl.drawArrays(gl.LINES, 0, camLine.n);

  latitudeMVP.setOrtho(LEFT, RIGHT, BOTTOM, TOP, NEAR, FAR);
  latitudeMVP.lookAt(EYE_X, EYE_Y, EYE_Z, 0, 0, 0, 0, 1, 0);
  latitudeMVP.rotate(-g_eyeX, 0, 1, 0);
  gl.uniformMatrix4fv(loc_MVP, false, latitudeMVP.elements);

  gl.bindVertexArray(latitudeCircle.vao);
  gl.drawArrays(gl.LINE_STRIP, 0, latitudeCircle.n);

  //right view
  gl.viewport(w / 2, 0, w / 2, h);
  Right_VIEWPORT_MVP.setPerspective(PERSE_ANGLE, w / 2 / h, NEAR, FAR);
  Right_VIEWPORT_MVP.translate(0, 0, -R);
  Right_VIEWPORT_MVP.rotate(g_eyeY, 1, 0, 0);
  Right_VIEWPORT_MVP.rotate(g_eyeX, 0, 1, 0);
  gl.uniformMatrix4fv(loc_MVP, false, Right_VIEWPORT_MVP.elements);

  gl.uniform1i(loc_uToggle, 1);

  gl.bindVertexArray(cube.vao);
  gl.drawElements(gl.TRIANGLES, cube.n, gl.UNSIGNED_BYTE, 0);

  let longitudeVal = document.getElementById("currentLongitude");
  longitudeVal.innerHTML = g_eyeX;

  let latitudeVal = document.getElementById("currentLatitude");
  latitudeVal.innerHTML = g_eyeY;
}

// make an equator and return it with vao and the number of vertices.
function init_equator(gl) {
  let vertices = [];
  let color = [1, 0, 1];
  // push 36 vertices to make a circle
  for (var i = 0; i <= 360; i += 10) {
    // Degree to radian
    let j = (i * Math.PI) / 180;
    let vert = [R * Math.cos(j), 0, R * Math.sin(j)]; // drawing a circle at the XZ plane since it has to be an equator for the cube...
    vertices.push(vert[0], vert[1], vert[2]); // push the vertices
    vertices.push(color[0], color[1], color[2]); // set the color
  }

  // VAO first
  let vao = gl.createVertexArray();
  // Bind VAO
  gl.bindVertexArray(vao);
  // Make VBO for the vertices and colors
  let vbo = gl.createBuffer();

  // Bind and upload the data.
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);


  // takes 3 elements and the whole data set is sizeof(float) * the size of vertices array(6)
  // stride is 6, 3 for positions and 3 for the color
  // pass data to the shader program.
  gl.vertexAttribPointer(loc_aPosition, 3, gl.FLOAT, false, 4 * 6, 0); 
  gl.enableVertexAttribArray(loc_aPosition);
  
  // takes 3 elements and the whole data set is sizeof(float) * the size of vertices array(6)
  // stride is 6, offset is 3 this is because 3 color elements are located after 3 position elements..
  gl.vertexAttribPointer(loc_aColor, 3, gl.FLOAT, false, 4 * 6, 4 * 3); 
  gl.enableVertexAttribArray(loc_aColor);

  // Unbind VAO
  gl.bindVertexArray(null);
  // Unbind VBO
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return { vao, n: vertices.length / 6 }; // since it has three coordinates and three color values so devide by 6
}

// Almost same as init_equator function
function init_latitude(gl) {
  let vertices = [];
  let color = [1, 0, 1];
  for (var i = 0; i <= 360; i += 10) {
    let j = (i * Math.PI) / 180;
    let vert = [0, R * Math.cos(j), R * Math.sin(j)]; // drawing a circle on the YZ plane
    vertices.push(vert[0], vert[1], vert[2]);
    vertices.push(color[0], color[1], color[2]);
  }

  let vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  let vbo = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

  // stride is 6, 3 for positions and 3 for the color
  gl.vertexAttribPointer(loc_aPosition, 3, gl.FLOAT, false, 4 * 6, 0); 
  gl.enableVertexAttribArray(loc_aPosition);

  // stride is 6, offset in this case is 3 color elements are located after 3 position elements..
  gl.vertexAttribPointer(loc_aColor, 3, gl.FLOAT, false, 4 * 6, 4 * 3); 
  gl.enableVertexAttribArray(loc_aColor);

  gl.bindVertexArray(null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return { vao, n: vertices.length / 6 }; // since it has three coordinates and colors so devide by 6
}

// Update dom value
function LongitudeSliderValue(val) {
  document.getElementById("longitude").value = val;
}

// Update dom value
function LatitudeSliderValue(val) {
  document.getElementById("latitude").value = val;
}

// Initialize the camera line
function init_camline(gl) {
  // camera line needs two points
  let vertices = new Float32Array([
    0, 0, 0, // Origin (center)
    0.5, 1, 0, // Color 
    0, 0, 10, // The second point 10 away along the z axis
    0.5, 1, 0 // Color same as above.
  ]);

  // VAO
  let vao = gl.createVertexArray();
  // Bind VAO
  gl.bindVertexArray(vao);
  
  // Create VBO and bind, upload data
  let vbo = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  // Each points conatin 3 x, y, z and r, g, b color so total 6
  // and the size would be 6 * 4(float size)
  // for the position there is no offset.
  gl.vertexAttribPointer(loc_aPosition, 3, gl.FLOAT, false, 6 * 4, 0);
  gl.enableVertexAttribArray(loc_aPosition);

  // Same as above but in this case offset is 3 because there are 3 position values ahead of color informations.
  gl.vertexAttribPointer(loc_aColor, 3, gl.FLOAT, false, 6 * 4, 4 * 3);
  gl.enableVertexAttribArray(loc_aColor);

  // Unbind!
  gl.bindVertexArray(null);

  return { vao, n: vertices.length / 6 }; // 3 coordinates and 3 colors so divide by 6 to get actual length.
}

// Intialize the axes variables.
function init_axes(gl) {
   const vertices = new Float32Array([
        0, 0, 0, 1, 0, 0,
        10, 0, 0, 1, 0, 0, //X axis R
        0, 0, 0, 0, 1, 0,
        0, 10, 0, 0, 1, 0, //Y axis G
        0, 0, 0, 0, 0, 1,
        0, 0, 10, 0, 0, 1 //Z axis B
    ]);
  let vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  const vbo = gl.createBuffer(); // Create a buffer object

  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  // vertices.BYTES_PER_ELEMENT will return the size of single element which we can use for the data size and the offset size.
  const SZ = vertices.BYTES_PER_ELEMENT;

  gl.vertexAttribPointer(loc_aPosition, 3, gl.FLOAT, false, SZ * 6, 0);
  gl.enableVertexAttribArray(loc_aPosition);

  gl.vertexAttribPointer(loc_aColor, 3, gl.FLOAT, false, SZ * 6, SZ * 3);
  gl.enableVertexAttribArray(loc_aColor);

  gl.bindVertexArray(null);

  return { vao, n: vertices.length / 6 };
}

function requestCORSIfNotSameOrigin(img, url) {
  //For Cross origin
  if (new URL(url).origin !== window.location.origin) {
    img.crossOrigin = "";
  }
}
