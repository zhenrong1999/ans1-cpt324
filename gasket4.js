var canvas;
var gl;
var program;
var points = [];
var colors = [];
var NumTimesToSubdivide = 3;
var speed = 100;

window.onload = function init() {
	canvas = document.getElementById("gl-canvas");

	gl = WebGLUtils.setupWebGL(canvas);
	if (!gl) {
		alert("WebGL isn't available");
	}

	//
	//  Initialize our data for the Sierpinski Gasket
	//

	// First, initialize the vertices of our 3D gasket
	// Four vertices on unit circle
	// Intial tetrahedron with equal length sides

	var vertices = [
		vec3(0.0, 0.0, -1.0),
		vec3(0.0, 0.9428, 0.3333),
		vec3(-0.8165, -0.4714, 0.3333),
		vec3(0.8165, -0.4714, 0.3333),
	];

	divideTetra(
		vertices[0],
		vertices[1],
		vertices[2],
		vertices[3],
		NumTimesToSubdivide
	);

	//
	//  Configure WebGL
	//
	gl.viewport(0, 0, canvas.width, canvas.height);
	gl.clearColor(0.0, 0.0, 0.0, 1.0);

	// enable hidden-surface removal

	gl.enable(gl.DEPTH_TEST);

	//  Load shaders and initialize attribute buffers
	program = initShaders(gl, "vertex-shader", "fragment-shader");
	gl.useProgram(program);

	programInfo = {
		vPosition: gl.getAttribLocation(program, "vPosition"),
		vColor: gl.getAttribLocation(program, "vColor"),
		umodelViewMatrix: gl.getUniformLocation(program, "uModelViewMatrix"),
	};

	requestAnimationFrame(render_rotate_180(programInfo));
};

function render_rotate_180(programInfo) {
	var then = 0;
	var rotation = 0;
	var rotate_reached = false;
	speed = 100;
	function render_rotate(now) {
		now *= 0.001; // convert to seconds
		deltaTime = (now - then) * speed;
		then = now;
		transx = 0;
		transy = 0;
		scaling = 0.5;

		if (rotate_reached != true) {
			if (rotation + deltaTime < 180) rotation += deltaTime;
			else {
				rotation = 180;
				rotate_reached = true;
			}
		} else {
			if (rotation - deltaTime > 0) rotation -= deltaTime;
			else {
				rotation = 0;
				rotate_reached = false;
			}
		}

		modelViewMatrix = modelViewMatrixCalculation(
			transx,
			transy,
			rotation,
			scaling
		);
		drawScene(programInfo, modelViewMatrix);

		if (rotation != 0 || rotate_reached != true)
			requestAnimationFrame(render_rotate);
	}

	requestAnimationFrame(render_rotate);
}

function modelViewMatrixCalculation(transx, transy, rotation, scaling) {
	modelViewMatrix = mat4();
	transMx = translate(transx, transy, 0);
	scaleMx = scalem(scaling, scaling, scaling);
	rotateMx = rotate(rotation, [0, 0, -1]);
	modelViewMatrix = mult(modelViewMatrix, transMx);
	modelViewMatrix = mult(modelViewMatrix, rotateMx);
	modelViewMatrix = mult(modelViewMatrix, scaleMx);
	return modelViewMatrix;
}

function drawScene(programInfo, modelViewMatrix) {
	var cBuffer = gl.createBuffer();
	var vBuffer = gl.createBuffer();
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.clearDepth(1.0);
	gl.enable(gl.DEPTH_TEST);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);
	gl.vertexAttribPointer(programInfo.vPosition, 3, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(programInfo.vPosition);

	gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);
	gl.vertexAttribPointer(programInfo.vColor, 4, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(programInfo.vColor);

	gl.uniformMatrix4fv(
		programInfo.umodelViewMatrix,
		false,
		flatten(modelViewMatrix)
	);
	gl.drawArrays(gl.TRIANGLES, 0, points.length);
}

function triangle(a, b, c, color) {
	// add colors and vertices for one triangle

	var baseColors = [
		vec4(1.0, 0.0, 0.0, 1.0),
		vec4(0.0, 1.0, 0.0, 1.0),
		vec4(0.0, 0.0, 1.0, 1.0),
		vec4(0.0, 0.0, 0.0, 1.0),
	];

	colors.push(baseColors[color]);
	points.push(a);
	colors.push(baseColors[color]);
	points.push(b);
	colors.push(baseColors[color]);
	points.push(c);
}

function tetra(a, b, c, d) {
	// tetrahedron with each side using
	// a different color

	triangle(a, c, b, 0);
	triangle(a, c, d, 1);
	triangle(a, b, d, 2);
	triangle(b, c, d, 3);
}

function divideTetra(a, b, c, d, count) {
	// check for end of recursion

	if (count === 0) {
		tetra(a, b, c, d);
	}

	// find midpoints of sides
	// divide four smaller tetrahedra
	else {
		var ab = mix(a, b, 0.5);
		var ac = mix(a, c, 0.5);
		var ad = mix(a, d, 0.5);
		var bc = mix(b, c, 0.5);
		var bd = mix(b, d, 0.5);
		var cd = mix(c, d, 0.5);

		--count;

		divideTetra(a, ab, ac, ad, count);
		divideTetra(ab, b, bc, bd, count);
		divideTetra(ac, bc, c, cd, count);
		divideTetra(ad, bd, cd, d, count);
	}
}

function render(programInfo) {
	var cBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);

	//var vColor = gl.getAttribLocation( program, "vColor" );
	gl.vertexAttribPointer(programInfo.vColor, 4, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(programInfo.vColor);

	var vBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);

	//var vPosition = gl.getAttribLocation( program, "vPosition" );
	gl.vertexAttribPointer(programInfo.vPosition, 3, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(programInfo.vPosition);

	modelViewMatrix = mat4();
	rotateMx = rotate(0, [0, 0, 1]);
	modelViewMatrix = mult(modelViewMatrix, rotateMx);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.uniformMatrix4fv(
		programInfo.umodelViewMatrix,
		false,
		flatten(modelViewMatrix)
	);
	gl.drawArrays(gl.TRIANGLES, 0, points.length);
}
