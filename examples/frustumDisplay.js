import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import URDFLoader from 'urdf-loader';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { FrustumMesh, getLinearFrustumInfo, frameBoundsToProjectionMatrix } from '../src/index.js';

let camera, scene, renderer, controls, clock;
let robot, light, ambient, cameraModels;
let frustumGroup, distortedFrustum, distortedLines, minFrustum, maxFrustum;
let time = 0;
const tempFrustum = new FrustumMesh();

const params = {

	animate: true,
	camera: 'MCAM_Z_RIGHT-Z026',
	near: 0.2,
	far: 3.5,
	planarProjectionFactor: 0,
	widthSegments: 16,
	heightSegments: 16,
	displayMinFrustum: false,
	displayMaxFrustum: false,

};

init();

// init
async function init() {

	// renderer init
	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setClearColor( 0x11161C );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.outputEncoding = THREE.sRGBEncoding;
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	renderer.setAnimationLoop( animation );
	document.body.appendChild( renderer.domElement );

	// init camera
	camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.01, 500 );
	camera.position.set( 3, 3, - 3 );

	clock = new THREE.Clock();

	scene = new THREE.Scene();

	// shadow catcher
	const ground = new THREE.Mesh(
		new THREE.PlaneGeometry(),
		new THREE.ShadowMaterial( {
			opacity: 0.05,
			color: 0xffffff,
			depthWrite: false,
		} ),
	);
	ground.rotation.x = - Math.PI / 2;
	ground.scale.setScalar( 10 );
	ground.receiveShadow = true;
	ground.position.y = - 0.5;
	scene.add( ground );

	// frustum
	frustumGroup = new THREE.Group();
	scene.add( frustumGroup );

	// distorted frustum
	distortedFrustum = new FrustumMesh( new THREE.MeshPhongMaterial( {

		transparent: true,
		opacity: 0.1,
		side: THREE.DoubleSide,
		depthWrite: false,

	} ) );
	frustumGroup.add( distortedFrustum );

	// distorted lines
	distortedLines = new THREE.LineSegments(
		new THREE.EdgesGeometry(),
		new THREE.LineBasicMaterial(),
	);
	frustumGroup.add( distortedLines );

	// min frustum
	minFrustum = new THREE.LineSegments(
		new THREE.EdgesGeometry(),
		new THREE.LineBasicMaterial(),
	);
	frustumGroup.add( minFrustum );

	// max frustum
	maxFrustum = new THREE.LineSegments(
		new THREE.EdgesGeometry(),
		new THREE.LineBasicMaterial(),
	);
	frustumGroup.add( maxFrustum );

	// lighting
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

	ambient = new THREE.AmbientLight( 0xffffff, 0.2 );
	scene.add( ambient );

	// load the model
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

	// camera models
	fetch( 'https://raw.githubusercontent.com/nasa-jpl/m2020-urdf-models/main/m2020-camera-models.json' )
		.then( res => res.json() )
		.then( result => {

			cameraModels = {};
			result.forEach( c => {

				cameraModels[ c.name ] = c;

			} );

			delete cameraModels.HELI_NAVCAM;
			delete cameraModels.HELI_RTE_CAM;

			buildGUI();

		} );

	controls = new OrbitControls( camera, renderer.domElement );

	window.addEventListener( 'resize', () => {

		renderer.setSize( window.innerWidth, window.innerHeight );
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();

	} );

}

function buildGUI() {

	const gui = new GUI();
	gui.add( params, 'animate' );
	gui.add( params, 'displayMinFrustum' );
	gui.add( params, 'displayMaxFrustum' );

	const frustumSettings = gui.addFolder( 'frustum' );
	frustumSettings.add( params, 'camera', Object.keys( cameraModels ) ).onChange( updateFrustums );
	frustumSettings.add( params, 'near', 0.01, 50 ).onChange( updateFrustums );
	frustumSettings.add( params, 'far', 0.01, 50 ).onChange( updateFrustums );
	frustumSettings.add( params, 'widthSegments', 2, 40, 1 ).onChange( updateFrustums );
	frustumSettings.add( params, 'heightSegments', 2, 40, 1 ).onChange( updateFrustums );
	frustumSettings.add( params, 'planarProjectionFactor', 0, 1 ).onChange( updateFrustums );

	updateFrustums();

}

function updateFrustums() {

	// TODO: simplify
	const model = cameraModels[ params.camera ];
	const m = { ...model, ...model.model };
	for ( const key in m ) {

		if ( Array.isArray( m[ key ] ) ) m[ key ] = new THREE.Vector3( ...m[ key ] );

	}

	// init the cahvore frustum volume
	m.near = params.near;
	m.far = params.far;
	m.widthSegments = params.widthSegments;
	m.heightSegments = params.heightSegments;
	m.planarProjectionFactor = params.planarProjectionFactor;
	distortedFrustum.setFromCahvoreParameters( m );

	distortedLines.geometry.dispose();
	distortedLines.geometry = new THREE.EdgesGeometry( distortedFrustum.geometry, 35 );

	// generate the linear frustums
	const minMatrix = new THREE.Matrix4();
	const maxMatrix = new THREE.Matrix4();
	const linearInfo = getLinearFrustumInfo( m );
	frameBoundsToProjectionMatrix( linearInfo.minFrameBounds, params.near, params.far, minMatrix );
	frameBoundsToProjectionMatrix( linearInfo.maxFrameBounds, params.near, params.far, maxMatrix );

	tempFrustum.setFromProjectionMatrix( minMatrix, linearInfo.frame, params.near, params.far );
	minFrustum.geometry.dispose();
	minFrustum.geometry = new THREE.EdgesGeometry( tempFrustum.geometry, 35 );

	tempFrustum.setFromProjectionMatrix( maxMatrix, linearInfo.frame, params.near, params.far );
	maxFrustum.geometry.dispose();
	maxFrustum.geometry = new THREE.EdgesGeometry( tempFrustum.geometry, 35 );

}

// animation
function animation() {

	const delta = clock.getDelta();
	if ( params.animate ) {

		time += delta;

	}

	if ( robot ) {

		// animate the rover joints
		const { mapLinear, pingpong, clamp, DEG2RAD } = THREE.MathUtils;
		const t = pingpong( time * 0.2, 1 );
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

		// update the frustum position
		if ( cameraModels ) {

			robot.updateMatrixWorld();
			const frame = cameraModels[ params.camera ].frame;
			robot.frames[ frame ].matrixWorld.decompose(
				frustumGroup.position,
				frustumGroup.quaternion,
				frustumGroup.scale,
			);

		}

	}

	minFrustum.visible = params.displayMinFrustum;
	maxFrustum.visible = params.displayMaxFrustum;

	renderer.render( scene, camera );

}
