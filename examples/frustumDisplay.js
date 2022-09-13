import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import URDFLoader from 'urdf-loader';

let camera, scene, mesh, renderer, controls;
let robot, light, ambient;

init();

// init
async function init() {

	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setClearColor( 0x090909 );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.outputEncoding = THREE.sRGBEncoding;
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	renderer.setAnimationLoop( animation );
	document.body.appendChild( renderer.domElement );

	camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.01, 100 );
	camera.position.set( 3, 3, - 3 );

	scene = new THREE.Scene();

	light = new THREE.DirectionalLight();
	light.position.set( 3, 3, 3 );
	light.castShadow = true;
	light.shadow.mapSize.set( 2048, 2048 );

	const shadowCam = light.shadow.camera;
	shadowCam.left = - 2;
	shadowCam.right = 2;
	shadowCam.top = 2;
	shadowCam.bottom = - 2;
	shadowCam.updateProjectionMatrix();
	scene.add( light );

	ambient = new THREE.AmbientLight( 0xffffff, 0.1 );
	scene.add( ambient );

	const loader = new URDFLoader();
	loader.loadMeshCb = function( path, manager, onComplete ) {

		new GLTFLoader( manager ).load(
			path,
			result => {

				const scene = result.scene;
				scene.traverse( c => {

					c.castShadow = true;
					c.receiveShadow = true;
					if ( c.geometry ) {

						c.geometry.computeVertexNormals();

					}

				} );

				onComplete( scene );

			},
			undefined,
			err => onComplete( null, err ),
		);

	};

	loader.load( 'https://raw.githubusercontent.com/nasa-jpl/m2020-urdf-models/main/rover/m2020.urdf', result => {

		robot = result;
		robot.rotation.x = Math.PI / 2;
		robot.position.y = - 0.5;

		scene.add( robot );

	} );

	controls = new OrbitControls( camera, renderer.domElement );

	window.addEventListener( 'resize', () => {

		renderer.setSize( window.innerWidth, window.innerHeight );
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();

	} );

}

// animation
function animation( time ) {

	if ( robot ) {

		const { mapLinear, pingpong, clamp, DEG2RAD } = THREE.MathUtils;
		const t = pingpong( time * 0.0002, 1 );
		const mastAnim = clamp( mapLinear( t, 0.2, 0.3, 0, 1 ), 0, 1 );
		const joint1Anim = clamp( mapLinear( t, 0.55, 0.65, 0, 1 ), 0, 1 );
		const joint3Anim = clamp( mapLinear( t, 0.4, 0.5, 0, 1 ), 0, 1 );
		const joint5Anim = clamp( mapLinear( t, 0.7, 0.8, 0, 1 ), 0, 1 );

		robot.setJointValues( {

			JOINT1_ENC: mapLinear( joint1Anim, 0, 1, 90 * DEG2RAD, 65 * DEG2RAD ),
			JOINT2_ENC: - 18 * DEG2RAD,
			JOINT3_ENC: mapLinear( joint3Anim, 0, 1, - 160 * DEG2RAD, - 140 * DEG2RAD ),
			JOINT4_ENC: 178 * DEG2RAD,
			JOINT5_ENC: mapLinear( joint5Anim, 0, 1, 90 * DEG2RAD, 260 * DEG2RAD ),
			RSM_AZ_ENC: mapLinear( mastAnim, 0, 1, 180 * DEG2RAD, 160 * DEG2RAD ),
			RSM_EL_ENC: mapLinear( mastAnim, 0, 1, 90 * DEG2RAD, 55 * DEG2RAD ),

		} );

	}

	renderer.render( scene, camera );

}
