var canvas;
var gl;
var program;
var points = [];
var colors = [];
var NumTimesToSubdivide = 3;
var speed = 5;
var paused = false;
var programInfo;
default_state = {
	transx: 0,
	transy: 0,
	rotation: 0,
	scaling: 0.5,
	//speed: 50,
	//pause_state: false,
};
current_state = {
	transx: 0,
	transy: 0,
	rotation: 0,
	scaling: 0.5,
	speed: 50,
	pause_state: false,
};
var baseColors = [
	vec4(1.0, 0.0, 0.0, 1.0),
	vec4(0.0, 1.0, 0.0, 1.0),
	vec4(0.0, 0.0, 1.0, 1.0),
	vec4(0.0, 0.0, 0.0, 1.0),
];
window.onload = function init() {
	canvas = document.getElementById("gl-canvas");
	document.getElementById("slide").value = current_state.speed;
	change_speed(document.getElementById("slide"));
	gl = WebGLUtils.setupWebGL(canvas);
	if (!gl) {
		alert("WebGL isn't available");
	}

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
	for (var i = 1; i <= 3; i++) {
		var color_picker_current = document.getElementById("fcolor" + i);
		var color_temp = [0, 0, 0];
		for (var c = 0; c < 3; c++) {
			color_temp[c] = baseColors[i - 1][c] * 255;
		}

		color_picker_current.value = RGBToHex(
			color_temp[0],
			color_temp[1],
			color_temp[2]
		);
	}
	NumTimesToSubdivideFunc(NumTimesToSubdivide);
	render_engine(programInfo);
};
function RGBToHex(r, g, b) {
	r = r.toString(16);
	g = g.toString(16);
	b = b.toString(16);

	if (r.length == 1) r = "0" + r;
	if (g.length == 1) g = "0" + g;
	if (b.length == 1) b = "0" + b;

	return "#" + r + g + b;
}
function change_color() {
	for (var i = 1; i <= 3; i++) {
		var color_picker_current = document.getElementById("fcolor" + i);
		result = hexToRgb(color_picker_current.value);
		if (result != null) {
			for (var j = 0; j < 3; j++) {
				baseColors[i - 1][j] = result[j] / 255;
			}
		}
	}
	NumTimesToSubdivideFunc(NumTimesToSubdivide);
}
function NumTimesToSubdivideFunc(number_to_divide) {
	points = [];
	colors = [];
	NumTimesToSubdivide = parseInt(number_to_divide);
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
	minimum_render_current_state();
}

function hexToRgb(hex) {
	// Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
	var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
	hex = hex.replace(shorthandRegex, function (m, r, g, b) {
		return r + r + g + g + b + b;
	});

	var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

	return result
		? [
				parseInt(result[1], 16),
				parseInt(result[2], 16),
				parseInt(result[3], 16),
		  ]
		: null;
}

function change_state(id) {
	if (paused == true) {
		id.innerHTML = "Stop";
		paused = false;
		render_engine(programInfo);
		//requestAnimationFrame(render_using_delay);
	} else {
		id.innerHTML = "Play";
		paused = true;
	}
}

function change_speed(id) {
	current_state.speed = id.value;
	document.getElementById("current_speed").innerHTML = current_state.speed;
	document.getElementById("current_speed_table").innerHTML =
		current_state.speed;
}

function reset_state() {
	if (paused == false) {
		change_state(document.getElementById("stop-play-button"));
	}
	current_state.transx = default_state.transx;
	current_state.transy = default_state.transy;
	current_state.rotation = default_state.rotation;
	current_state.scaling = default_state.scaling;
	minimum_render_current_state();
	animation = 1;
	value_updated_to_page(0);
}

var then = 0;
var animation = 1;
var animation_rotate_left = true;
var target_rotation = 180;
var done_animation = false;
var point_goto = [0, 0];
function render_engine(programInfo) {
	function rotate_animation_calc(deltaTime, target_rotation) {
		reached = false;
		remainder = target_rotation - current_state.rotation;
		to_be_rotate = deltaTime * 3 * current_state.speed;
		if (Math.abs(remainder) > to_be_rotate)
			current_state.rotation += Math.sign(remainder) * to_be_rotate;
		else {
			current_state.rotation = target_rotation;
			reached = true;
		}
		return reached;
	}

	function scaling_animation(deltaTime, target_scale) {
		reached = false;
		deltascaletime = (deltaTime * current_state.speed) / 100;
		remainder = target_scale - current_state.scaling + deltascaletime;
		if (Math.abs(remainder) > deltascaletime)
			current_state.scaling += Math.sign(remainder) * deltascaletime;
		else {
			current_state.scaling = target_scale;
			reached = true;
		}
		return reached;
	}
	function moving_animtation(deltaTime, target_position) {
		reached = false;
		deltascaletime = (deltaTime * current_state.speed) / 25;
		remainderx = target_position[0] - current_state.transx;
		remaindery = target_position[1] - current_state.transy;
		remainder = Math.pow(
			Math.pow(remainderx, 2) + Math.pow(remaindery, 2),
			0.5
		);
		if ((Math.abs(remainderx) + Math.abs(remaindery)) / 2 < deltascaletime) {
			current_state.transx = target_position[0];
			current_state.transy = target_position[1];
			reached = true;
		}
		if (Math.abs(remainderx) > deltascaletime / 2) {
			current_state.transx += (remainderx * deltascaletime) / remainder;
		}
		if (Math.abs(remaindery) > deltascaletime / 2) {
			current_state.transy += (remaindery * deltascaletime) / remainder;
		}
		return reached;
	}

	function random_point_for_moving() {
		//top-right: 0.6,0.53
		//top-left: -0.6,0.53
		//bottom-left: -0.6,-0.76
		//bottom-right: 0.6,-0.76
		position = Math.floor(Math.random() * 100) % 4;
		var point = [0, 0];
		random_y = (Math.random() * 10) / 9;
		if (position < 2) {
			point[1] = 1.29 * Math.sin((Math.random() * Math.PI) / 2) - 0.76;
			point[1] = Math.round(point[1] * 1000) / 1000;
			if (position == 0) {
				point[0] = 0.6;
			} else {
				point[0] = -0.6;
			}
		} else {
			point[0] = 1.2 * Math.sin((Math.random() * Math.PI) / 2) - 0.6;
			point[0] = Math.round(point[0] * 1000) / 1000;
			if (position == 2) {
				point[1] = -0.76;
			} else {
				point[1] = 0.53;
			}
		}
		return point;
	}

	function render_frame(now) {
		if (paused == false) {
			now *= 0.001;
			var deltaTime = now - then;
			then = now;
			if (current_state.pause_state != false) {
				deltaTime = 0;
				current_state.pause_state = false;
			}
			//if (current_state.pause_state == false) {
			if (animation == 1) {
				done_animation = rotate_animation_calc(deltaTime, 180);
			} else if (animation == 2) {
				done_animation = rotate_animation_calc(deltaTime, 0);
			} else if (animation == 3) {
				done_animation = rotate_animation_calc(deltaTime, -180);
			} else if (animation == 4) {
				done_animation = rotate_animation_calc(deltaTime, 0);
			} else if (animation == 5) {
				done_animation = scaling_animation(deltaTime, 0.9);
			} else if (animation == 6) {
				done_animation = scaling_animation(deltaTime, 0.5);
			} else if (animation == 7) {
				done_animation = moving_animtation(deltaTime, point_goto);
			} else if (animation == -1) {
				if (
					scaling_animation(deltaTime, 0.5) &&
					rotate_animation_calc(deltaTime, 0) &&
					moving_animtation(deltaTime, point_goto)
				)
					done_animation = true;
			}
			//} else current_state.pause_state = false;
			minimum_render_current_state();
			value_updated_to_page(deltaTime);
			if (done_animation != true) {
				requestAnimationFrame(render_frame);
				//current_state.iterations++;
			} else {
				if (++animation <= 6) {
				} else if (animation == 7) {
					point_goto = random_point_for_moving();
				} else if (animation == 8) {
					point_goto = random_point_for_moving();
					animation = 7;
				} else {
					point_goto = [0, 0];
					animation = -1;
				}
				done_animation = false;
				if (animation != 0) requestAnimationFrame(render_frame);
			}
		} else {
			//current_state.transx = default_state.transx;
			//current_state.transy = default_state.transy;
			//current_state.rotation = default_state.rotation;
			//current_state.scaling = default_state.scaling;
			//minimum_render_current_state();
			current_state.pause_state = true;
		}
		//if (reset == true) {
		//	current_state.transx = default_state.transx;
		//	current_state.transy = default_state.transy;
		//	current_state.rotation = default_state.rotation;
		//	current_state.scaling = default_state.scaling;
		//	minimum_render_current_state();
		//	animation = 1;
		//	reset = false;
		//}
	}
	requestAnimationFrame(render_frame);
}
function value_updated_to_page(delta_Time) {
	document.getElementById("current_animation").innerHTML = animation;
	document.getElementById("delta_time").innerHTML = delta_Time;
	document.getElementById("current_rotation").innerHTML =
		current_state.rotation;
	document.getElementById("current_scaling").innerHTML = current_state.scaling;
	var position_display =
		"x:<br>" + current_state.transx + "<br>y:<br>" + current_state.transy;
	document.getElementById("current_position").innerHTML = position_display;

	if (delta_Time == 0) {
		fps = 0;
	} else {
		fps = Math.round((1 / delta_Time) * 100) / 100;
	}
	document.getElementById("fps").innerHTML = fps;
}
function minimum_render_current_state() {
	modelViewMatrix = modelViewMatrixCalculation(
		current_state.transx,
		current_state.transy,
		current_state.rotation,
		current_state.scaling
	);
	drawScene(programInfo, modelViewMatrix);
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

/*
function render_using_delay() {
	var transx = current_state.transx;
	var transy = current_state.transy;
	var rotation = current_state.rotation;
	var scaling = current_state.scaling;

	if (paused == false) {
		modelViewMatrix = modelViewMatrixCalculation(
			current_state.transx,
			current_state.transy,
			current_state.rotation,
			current_state.scaling
		);
		//

		//current_state.rotation++;
		if (current_state.rotate_to_left == false) {
			if (current_state.rotation < 180) current_state.rotation++;
			else {
				current_state.rotation--;
				current_state.rotate_to_left = true;
			}
		} else {
			if (current_state.rotation > 0) current_state.rotation--;
			else {
				current_state.rotation = 0;
				current_state.rotate_to_left = false;
			}
		}
		drawScene(programInfo, modelViewMatrix);
		var t = setTimeout(
			requestAnimationFrame(render_using_delay),
			current_state.delay
		);
		
	}
}*/
