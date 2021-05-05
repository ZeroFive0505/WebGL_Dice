"use strict";
const loc_aPosition = 1;
const loc_aColor = 2;
const loc_UVCoord = 3;
const VSHADER_SOURCE = 
`#version 300 es
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

const FSHADER_SOURCE =
`#version 300 es
precision mediump float;
in vec4 vColor;
in vec2 vUVCoord;
out vec4 fColor;
uniform sampler2D uSampler;
uniform int uToggle;
void main()
{
    if(uToggle == 0)
      fColor = vColor;
    else
    {
      fColor = texture(uSampler, vUVCoord);
    }
}`;

let g_eyeX = 0;
let g_eyeY = 0;
let g_eyeZ = 2;

const EYE_X = 5;
const EYE_Y = 2;
const EYE_Z = 10;

const FAR = 500;
const NEAR = 1;
const R = 10;

const LEFT = -10;
const RIGHT = 10;
const TOP = 10;
const BOTTOM = -10;

const PERSE_ANGLE = 45;


let Left_VIEWPORT_MVP = new Matrix4();
let Right_VIEWPORT_MVP = new Matrix4();
let CamLineMVP = new Matrix4();
let latitudeMVP = new Matrix4();


function main()

{
  const canvas = document.getElementById('webgl');
  const gl = canvas.getContext("webgl2");
  
  initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE);
  
  let w = canvas.width;
  let h = canvas.height;

    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


    const latitudeCircle = init_latitude(gl);
    const equator = init_equator(gl);
    const camLine = init_camline(gl);
    const axes = init_axes(gl);
    const cube = init_cube(gl, equator, latitudeCircle, camLine, axes, w, h);

    
    
    const loc_MVP = gl.getUniformLocation(gl.program, 'uMVP');
    const loc_uToggle = gl.getUniformLocation(gl.program, 'uToggle');
    
    //left view
    gl.viewport(0, 0, w/2, h);
    Left_VIEWPORT_MVP.setOrtho(LEFT, RIGHT, BOTTOM, TOP, NEAR, FAR); // setting MVP matrix to orthographic mode
    Left_VIEWPORT_MVP.lookAt(EYE_X, EYE_Y, EYE_Z, 0,0,0, 0,1,0); // Eye position x, y, z Look at position 0, 0, 0 Up vector 0, 1, 0
    gl.uniformMatrix4fv(loc_MVP, false, Left_VIEWPORT_MVP.elements);

    gl.uniform1i(loc_uToggle, 1);

    gl.bindVertexArray(cube.vao);
    gl.drawElements(gl.TRIANGLES, cube.n, gl.UNSIGNED_BYTE, 0);

    
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
    gl.viewport(w/2, 0, w/2, h);
    Right_VIEWPORT_MVP.setPerspective(PERSE_ANGLE, (w/2)/h, NEAR, FAR);
    Right_VIEWPORT_MVP.translate(0, 0, -R);
    Right_VIEWPORT_MVP.rotate(g_eyeY, 1, 0, 0);
    Right_VIEWPORT_MVP.rotate(g_eyeX, 0, 1, 0);
    gl.uniformMatrix4fv(loc_MVP, false, Right_VIEWPORT_MVP.elements);

    gl.uniform1i(loc_uToggle, 1);

    gl.bindVertexArray(cube.vao);
    gl.drawElements(gl.TRIANGLES, cube.n, gl.UNSIGNED_BYTE, 0)



    document.onkeydown = function(event)
    {
      keydown(event, gl, cube, equator, latitudeCircle, camLine, axes,
        loc_MVP, loc_uToggle, Left_VIEWPORT_MVP, Right_VIEWPORT_MVP, CamLineMVP, latitudeMVP, canvas);
    }
    document.getElementById("longitude").oninput = function(event) 
    {refresh(gl, cube, equator, latitudeCircle, camLine, axes,
      loc_MVP, loc_uToggle, Left_VIEWPORT_MVP, Right_VIEWPORT_MVP, CamLineMVP, latitudeMVP, canvas);};
    document.getElementById("latitude").oninput = function(event)
    {refresh(gl, cube, equator, latitudeCircle, camLine, axes,
      loc_MVP, loc_uToggle, Left_VIEWPORT_MVP, Right_VIEWPORT_MVP, CamLineMVP, latitudeMVP, canvas);};
}

function init_cube(gl, equator, latitudeCircle, camLine, axes, w, h)
  {
      const vertices = new Float32Array([   // Vertex coordinates
        1.0, 1.0, 1.0,  -1.0, 1.0, 1.0,  -1.0, -1.0, 1.0,   1.0, -1.0, 1.0,  
        // v0-v1-v2-v3 front
        1.0, 1.0, 1.0,   1.0, -1.0, 1.0,   1.0, -1.0, -1.0,   1.0, 1.0, -1.0,  
        // v0-v3-v4-v5 right
        1.0, 1.0, 1.0,   1.0, 1.0, -1.0,  -1.0, 1.0, -1.0,  -1.0, 1.0, 1.0,  
        // v0-v5-v6-v1 up
       -1.0, 1.0, 1.0,  -1.0, 1.0, -1.0,  -1.0, -1.0, -1.0,  -1.0, -1.0, 1.0,  
       // v1-v6-v7-v2 left
       -1.0, -1.0, -1.0,   1.0, -1.0, -1.0,   1.0, -1.0, 1.0,  -1.0, -1.0, 1.0,  
       // v7-v4-v3-v2 down
        1.0, -1.0, -1.0,  -1.0, -1.0, -1.0,  -1.0, 1.0, -1.0,   1.0, 1.0, -1.0
      // v4-v7-v6-v5 back
     ]);
  
    const indices = new Uint8Array([       // Indices of the vertices
      0, 1, 2,   0, 2, 3,    // front
      4, 5, 6,   4, 6, 7,    // right
      8, 9,10,   8,10,11,    // up
     12,13,14,  12,14,15,    // left
     16,17,18,  16,18,19,    // down
     20,21,22,  20,22,23     // back
   ]);
  
  
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const indexBuffer = gl.createBuffer();
  
    if(!indexBuffer)
    {
      console.log("Failed to create an index buffer");
      return;
    }
  
    if(!initArrayBuffer(gl, vertices, 3, gl.FLOAT, loc_aPosition))
    {
      console.log("Failed to initialize an array buffer for the position");
      return;
    }
  
  
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
  
  
    init_texture(gl, vao, indices.length, equator, latitudeCircle, camLine, axes, w, h);
  
    gl.bindVertexArray(null);
  
    return {vao, n:indices.length};
}
  
function init_texture(gl, vao, n, equator, latitudeCircle, camLine, axes, w, h)
{  
    const UVCoord = new Float32Array
    (
      [
        //First
        0, 0.5,
        0.25, 0.5,
        0.25, 0.75,
        0, 0.75,
        //Second
        0.25, 0.5,
        0.5, 0.5,
        0.5, 0.75,
        0.25, 0.75,
        //Third
        0.5, 0.5,
        0.75, 0.5,
        0.75, 0.75,
        0.5, 0.75,
        //Fifth
        0.5, 0.75,
        0.75, 0.75,
        0.75, 1,
        0.5, 1,
        //Fourth
        0.75, 0.5,
        1, 0.5,
        1, 0.75,
        0.75, 0.75,
        //Sixth
        0.5, 0.25,
        0.75, 0.25,
        0.75, 0.5,
        0.5, 0.5
      ]
    );
  
    let UVCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, UVCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, UVCoord, gl.STATIC_DRAW);
    
    
    gl.vertexAttribPointer(loc_UVCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(loc_UVCoord);
    
    let texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 255, 255]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  
      
    let image = new Image();
    let url = "https://live.staticflickr.com/65535/49093406911_7d185dba0e_b.jpg";
    image.src = url;
    image.onload = function() 
    {
      loadTexture(gl, texture, image, vao, n, equator, latitudeCircle, camLine, axes, w, h);
    }
    requestCORSIfNotSameOrigin(image, url);
}

function loadTexture(gl, texture, image, vao, n, equator, latitudeCircle, camLine, axes, w, h)
{
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.generateMipmap(gl.TEXTURE_2D);
  
  const loc_MVP = gl.getUniformLocation(gl.program, 'uMVP');
  const loc_uToggle = gl.getUniformLocation(gl.program, 'uToggle');



  //left view
  gl.viewport(0, 0, w/2, h);
  Left_VIEWPORT_MVP.setOrtho(LEFT, RIGHT, BOTTOM, TOP, NEAR, FAR); // setting MVP matrix to orthographic mode
  Left_VIEWPORT_MVP.lookAt(EYE_X, EYE_Y, EYE_Z, 0,0,0, 0,1,0); // Eye position x, y, z Look at position 0, 0, 0 Up vector 0, 1, 0
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
  gl.viewport(w/2, 0, w/2, h);
  Right_VIEWPORT_MVP.setPerspective(PERSE_ANGLE, (w/2)/h, NEAR, FAR);
  Right_VIEWPORT_MVP.translate(0, 0, -R);
  Right_VIEWPORT_MVP.rotate(g_eyeY, 1, 0, 0);
  Right_VIEWPORT_MVP.rotate(g_eyeX, 0, 1, 0);
  gl.uniformMatrix4fv(loc_MVP, false, Right_VIEWPORT_MVP.elements);

  gl.uniform1i(loc_uToggle, 1);
  gl.bindVertexArray(vao);
  gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);
}


function initArrayBuffer(gl, data, num, type, loc_attribute) 
{
  const buffer = gl.createBuffer();   // Create a buffer object
  if (!buffer) 
  {
    console.log('Failed to create the buffer object');
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

function keydown
(event, gl, cube, equator, latitudeCircle, camLine, axes,
  loc_MVP, loc_uToggle, LEFT_VIEWPORT_MVP, RIGHT_VIEWPORT_MVP, CamLineMVP, latitudeMVP, canvas)
{
  if(event.keyCode == 39) 
  { // The right arrow key was pressed
    if(g_eyeX < 360)
      g_eyeX += 1;
  } 
  else if (event.keyCode == 37) 
  { // The left arrow key was pressed
    if(g_eyeX > 0)
      g_eyeX -= 1;
  } 
  
  //UP
  if(event.keyCode == 38)
  {
    if(g_eyeY < 90)
      g_eyeY += 1;
  }
  //DOWN
  else if(event.keyCode == 40)
  {
    if(g_eyeY > -90)
      g_eyeY -= 1;
  }

  let longitudeVal = document.getElementById("currentLongitude");
  LongitudeSliderValue(g_eyeX);
  longitudeVal.innerHTML = g_eyeX;

  let latitudeVal = document.getElementById("currentLatitude");
  LatitudeSliderValue(g_eyeY);
  latitudeVal.innerHTML = g_eyeY;

  draw(gl, cube, equator, latitudeCircle, camLine, axes,
    loc_MVP, loc_uToggle, LEFT_VIEWPORT_MVP, RIGHT_VIEWPORT_MVP, CamLineMVP, latitudeMVP, canvas);    
}


function draw(gl, cube, equator, latitudeCircle, camLine, axes,
  loc_MVP, loc_uToggle, LEFT_VIEWPORT_MVP, RIGHT_VIEWPORT_MVP, CamLineMVP, latitudeMVP, canvas)
{
 
  let w = canvas.width;
  let h = canvas.height;
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
  
  //left view
  gl.viewport(0, 0, w/2, h);
  LEFT_VIEWPORT_MVP.setOrtho(LEFT, RIGHT, BOTTOM, TOP, NEAR, FAR);
  LEFT_VIEWPORT_MVP.lookAt(EYE_X, EYE_Y, EYE_Z, 0,0,0, 0,1,0);
  gl.uniformMatrix4fv(loc_MVP, false, LEFT_VIEWPORT_MVP.elements);

  gl.uniform1i(loc_uToggle, 1);

  gl.bindVertexArray(cube.vao);
  gl.drawElements(gl.TRIANGLES, cube.n, gl.UNSIGNED_BYTE, 0)

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
  gl.viewport(w/2, 0, w/2, h);
  RIGHT_VIEWPORT_MVP.setPerspective(PERSE_ANGLE, (w/2)/h, NEAR, FAR);
  RIGHT_VIEWPORT_MVP.translate(0, 0, -R);
  RIGHT_VIEWPORT_MVP.rotate(g_eyeY, 1, 0, 0);
  RIGHT_VIEWPORT_MVP.rotate(g_eyeX, 0, 1, 0);
  gl.uniformMatrix4fv(loc_MVP, false, RIGHT_VIEWPORT_MVP.elements);

  gl.uniform1i(loc_uToggle, 1);

  gl.bindVertexArray(cube.vao);
  gl.drawElements(gl.TRIANGLES, cube.n, gl.UNSIGNED_BYTE, 0);
}




function refresh(gl, cube, equator, latitudeCircle, camLine, axes,
  loc_MVP, loc_uToggle, Left_VIEWPORT_MVP, Right_VIEWPORT_MVP, CamLineMVP, latitudeMVP, canvas)
{
    g_eyeX = parseInt(document.getElementById("longitude").value);
    g_eyeY = parseInt(document.getElementById("latitude").value);
    let w = canvas.width;
    let h = canvas.height;
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  //left view
  gl.viewport(0, 0, w/2, h);
  Left_VIEWPORT_MVP.setOrtho(LEFT, RIGHT, BOTTOM, TOP, NEAR, FAR);
  Left_VIEWPORT_MVP.lookAt(EYE_X, EYE_Y, EYE_Z, 0,0,0, 0,1,0);
  gl.uniformMatrix4fv(loc_MVP, false, Left_VIEWPORT_MVP.elements);

  gl.uniform1i(loc_uToggle, 1);

  gl.bindVertexArray(cube.vao);
  gl.drawElements(gl.TRIANGLES, cube.n, gl.UNSIGNED_BYTE, 0)

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
  gl.viewport(w/2, 0, w/2, h);
  Right_VIEWPORT_MVP.setPerspective(PERSE_ANGLE, (w/2)/h, NEAR, FAR);
  Right_VIEWPORT_MVP.translate(0, 0, -R);
  Right_VIEWPORT_MVP.rotate(g_eyeY, 1, 0, 0);
  Right_VIEWPORT_MVP.rotate(g_eyeX, 0, 1, 0);
  gl.uniformMatrix4fv(loc_MVP, false, Right_VIEWPORT_MVP.elements);

  gl.uniform1i(loc_uToggle, 1);

  gl.bindVertexArray(cube.vao);
  gl.drawElements(gl.TRIANGLES, cube.n, gl.UNSIGNED_BYTE, 0)


  let longitudeVal = document.getElementById("currentLongitude");
  longitudeVal.innerHTML = g_eyeX;

  let latitudeVal = document.getElementById("currentLatitude");
  latitudeVal.innerHTML = g_eyeY;
}


function init_equator(gl)
{
  let vertices = []; 
  let color = [1, 0, 1]; 
  for(var i = 0; i <= 360; i+=10)
  {
    let j = i * Math.PI/180;
    let vert = [R * Math.cos(j), 0, R * Math.sin(j)]; // drawing a circle at the XZ plane since it has to be an equator for the cube...
    vertices.push( vert[0], vert[1], vert[2] );   // push the vertices
    vertices.push( color[0], color[1], color[2]); // set the color
  }  

  
  let vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  let vbo = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

  gl.vertexAttribPointer(loc_aPosition, 3, gl.FLOAT, false, 4 * 6, 0); // stride is 6, 3 for positions and 3 for the color
  gl.enableVertexAttribArray(loc_aPosition);


  gl.vertexAttribPointer(loc_aColor, 3, gl.FLOAT, false, 4 * 6, 4 * 3); // stride is 6, offset is this is because 3 color elements are located after 3 position elements..
  gl.enableVertexAttribArray(loc_aColor);

  gl.bindVertexArray(null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return { vao, n : vertices.length / 6 }; // since it has three coordinates so devide by 3
}


function init_latitude(gl)
{
  let vertices = []; 
  let color = [1, 0, 1]; 
  for(var i = 0; i <= 360; i+=10)
  {
    let j = i * Math.PI/180;
    let vert = [0, R * Math.cos(j), R * Math.sin(j)]; // drawing a circle on the YZ plane
    vertices.push( vert[0], vert[1], vert[2] ); 
    vertices.push( color[0], color[1], color[2]);   
  }  
  
  let vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  let vbo = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

  gl.vertexAttribPointer(loc_aPosition, 3, gl.FLOAT, false, 4 * 6, 0); // stride is 6, 3 for positions and 3 for the color
  gl.enableVertexAttribArray(loc_aPosition);

  gl.vertexAttribPointer(loc_aColor, 3, gl.FLOAT, false, 4 * 6, 4 * 3); // stride is 6, offset is this is because 3 color elements are located after 3 position elements..
  gl.enableVertexAttribArray(loc_aColor);

  gl.bindVertexArray(null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return { vao, n : vertices.length / 6 }; // since it has three coordinates so devide by 3
}


function LongitudeSliderValue(val)
{
  document.getElementById('longitude').value = val;
}

function LatitudeSliderValue(val)
{
  document.getElementById('latitude').value = val;
}

function init_camline(gl)
{
  let vertices = new Float32Array([
    0, 0, 0, 0.5, 1, 0,             
    0, 0, 10, 0.5, 1, 0
  ]);

  let vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  let vbo = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  gl.vertexAttribPointer(loc_aPosition, 3, gl.FLOAT, false, 6 * 4, 0);
  gl.enableVertexAttribArray(loc_aPosition);

  gl.vertexAttribPointer(loc_aColor, 3, gl.FLOAT, false, 6 * 4, 4 * 3);
  gl.enableVertexAttribArray(loc_aColor);

  gl.bindVertexArray(null);
  
  return {vao, n:vertices.length / 6};                 
}


function init_axes(gl)
{
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
    
    const vbo = gl.createBuffer();   // Create a buffer object

    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const SZ = vertices.BYTES_PER_ELEMENT;

    gl.vertexAttribPointer(loc_aPosition, 3, gl.FLOAT, false, SZ*6, 0);
    gl.enableVertexAttribArray(loc_aPosition);

    gl.vertexAttribPointer(loc_aColor, 3, gl.FLOAT, false, SZ*6, SZ*3);
    gl.enableVertexAttribArray(loc_aColor);
 
    gl.bindVertexArray(null);
    
    return {vao, n : vertices.length / 6};

}

function requestCORSIfNotSameOrigin(img, url) //For Cross origin
{
  if ((new URL(url)).origin !== window.location.origin) 
  {
    img.crossOrigin = "";
  }
}