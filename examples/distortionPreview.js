import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { FrustumMesh, getLinearFrustumInfo, frameBoundsToProjectionMatrix, CahvoreDistortionMaterial } from '../src/index.js';
import { TilesRenderer } from '3d-tiles-renderer';

let camera, frustumCamera, scene, renderer, controls, clock, cameraHelper, frameEl;
let light, ambient, cameraModels, tilesGroup, tiles, skyTiles, renderTarget, pass;
let frustumGroup, tiltGroup, distortedFrustum, distortedLines, minFrustum, maxFrustum;
let time = 0;
const RENDER_SCALE = 0.5;
const SRGB_CLEAR_COLOR = 0x11161C;
const LINEAR_CLEAR_COLOR = new THREE.Color( SRGB_CLEAR_COLOR ).convertSRGBToLinear().getHex();

// TODO:
// - cleanup
// - stencil
// - max 50% width

const params = {

	animate: true,
	fullscreen: false,
	tilt: - 0.25,
	camera: 'HAZFLA',
	rendering: 'distorted',
	near: 0.2,
	far: 200,
	planarProjectionFactor: 0,
	displayCameraHelper: false,

};

init();

// init
async function init() {

	frameEl = document.getElementById( 'frame' );

	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setClearColor( SRGB_CLEAR_COLOR );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.outputEncoding = THREE.sRGBEncoding;
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	renderer.setAnimationLoop( animation );
	document.body.appendChild( renderer.domElement );

	camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.01, 500 );
	camera.position.set( 6, 6, - 6 );

	clock = new THREE.Clock();

	scene = new THREE.Scene();

	// frustum
	frustumGroup = new THREE.Group();
	frustumGroup.rotation.x = Math.PI / 2;
	frustumGroup.position.set( - 4, 1, 4 );
	scene.add( frustumGroup );

	tiltGroup = new THREE.Group();
	frustumGroup.add( tiltGroup );

	frustumCamera = new THREE.PerspectiveCamera();
	tiltGroup.add( frustumCamera );

	cameraHelper = new THREE.CameraHelper( frustumCamera );
	scene.add( cameraHelper );

	// distorted frustum
	distortedFrustum = new FrustumMesh( new THREE.MeshPhongMaterial( {

		transparent: true,
		opacity: 0.1,
		side: THREE.DoubleSide,
		depthWrite: false,

	} ) );
	tiltGroup.add( distortedFrustum );

	// distorted lines
	distortedLines = new THREE.LineSegments(
		new THREE.EdgesGeometry(),
		new THREE.LineBasicMaterial(),
	);
	tiltGroup.add( distortedLines );

	// min frustum
	minFrustum = new THREE.LineSegments(
		new THREE.EdgesGeometry(),
		new THREE.LineBasicMaterial(),
	);
	tiltGroup.add( minFrustum );

	// max frustum
	maxFrustum = new THREE.LineSegments(
		new THREE.EdgesGeometry(),
		new THREE.LineBasicMaterial(),
	);
	tiltGroup.add( maxFrustum );

	light = new THREE.DirectionalLight();
	light.position.set( 3, 3, 3 );

	tilesGroup = new THREE.Group();
	tilesGroup.rotation.x = Math.PI / 2;
	tilesGroup.position.y = - 1;
	scene.add( tilesGroup );

	tiles = new TilesRenderer( 'https://raw.githubusercontent.com/NASA-AMMOS/3DTilesSampleData/master/msl-dingo-gap/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize_tileset.json' );

	tiles.fetchOptions.mode = 'cors';
	tiles.lruCache.minSize = 900;
	tiles.lruCache.maxSize = 1300;
	tiles.errorTarget = 12;
	tiles.setCamera( camera );
	tiles.setCamera( frustumCamera );
	tilesGroup.add( tiles.group );

	skyTiles = new TilesRenderer( 'https://raw.githubusercontent.com/NASA-AMMOS/3DTilesSampleData/master/msl-dingo-gap/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_sky/0528_0260184_to_s64o256_sky_tileset.json' );
	skyTiles.fetchOptions.mode = 'cors';
	skyTiles.lruCache = tiles.lruCache;
	skyTiles.downloadQueue = tiles.downloadQueue;
	skyTiles.parseQueue = tiles.parseQueue;
	skyTiles.errorTarget = 12;
	skyTiles.setCamera( camera );
	skyTiles.setCamera( frustumCamera );
	tilesGroup.add( skyTiles.group );

	// rendering
	renderTarget = new THREE.WebGLRenderTarget( 1, 1, {
		generateMipmaps: true,
		minFilter: THREE.LinearMipMapLinearFilter,
		magFilter: THREE.LinearMipMapLinearFilter,
	} );
	console.log
	pass = new FullScreenQuad( new CahvoreDistortionMaterial( { map: renderTarget.texture } ) );

	ambient = new THREE.AmbientLight( 0xffffff, 0.2 );
	scene.add( ambient );

	fetch( 'https://raw.githubusercontent.com/nasa-jpl/m2020-urdf-models/main/m2020-camera-models.json' )
		.then( res => res.json() )
		.then( result => {

			cameraModels = {};
			result.forEach( c => {

				cameraModels[ c.name ] = c;

			} );

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
	gui.add( params, 'fullscreen' ).onChange( updateRenderTarget );
	gui.add( params, 'displayCameraHelper' );

	const frustumSettings = gui.addFolder( 'frustum' );
	frustumSettings.add( params, 'camera', Object.keys( cameraModels ) ).onChange( updateFrustums );
	frustumSettings.add( params, 'rendering', [ 'distorted', 'minimum', 'maximum', 'checkerboard' ] ).onChange( updateFrustums );
	frustumSettings.add( params, 'near', 0.01, 250 ).onChange( updateFrustums );
	frustumSettings.add( params, 'far', 0.01, 250 ).onChange( updateFrustums );
	frustumSettings.add( params, 'tilt', - 0.5, 0.5 ).onChange( updateFrustums );
	frustumSettings.add( params, 'planarProjectionFactor', 0, 1 ).onChange( updateFrustums );

	updateFrustums();
	updateRenderTarget();

}

function updateRenderTarget() {

	// TODO: simplify
	const model = cameraModels[ params.camera ];
	const m = { ...model, ...model.model };
	for ( const key in m ) {

		if ( Array.isArray( m[ key ] ) ) m[ key ] = new THREE.Vector3( ...m[ key ] );

	}

	const { minFrameBounds, maxFrameBounds } = getLinearFrustumInfo( m );
	const minHeight = minFrameBounds.top - minFrameBounds.bottom;
	const maxHeight = maxFrameBounds.top - maxFrameBounds.bottom;
	const upscaleRatio = maxHeight / minHeight;
	const aspect = m.width / m.height;
	const dpr = window.devicePixelRatio;
	const height = params.fullscreen ? window.innerHeight : window.innerHeight * RENDER_SCALE;

	// TODO: must use the max bounds here for the render aspect
	renderTarget.setSize(
		Math.ceil( height * dpr * aspect * upscaleRatio ),
		Math.ceil( height * dpr * upscaleRatio ),
	);

}

function updateFrustums() {

	// TODO: simplify
	const model = cameraModels[ params.camera ];
	const m = { ...model, ...model.model };
	for ( const key in m ) {

		if ( Array.isArray( m[ key ] ) ) m[ key ] = new THREE.Vector3( ...m[ key ] );

	}

	// generate the frustums
	const matrix = new THREE.Matrix4();
	const linearInfo = getLinearFrustumInfo( m );
	if ( params.rendering === 'minimum' ) {

		frameBoundsToProjectionMatrix( linearInfo.minFrameBounds, params.near, params.far, matrix );
		distortedFrustum.setFromProjectionMatrix( matrix, linearInfo.frame, params.near, params.far );

	} else if ( params.rendering === 'maximum' ) {

		frameBoundsToProjectionMatrix( linearInfo.maxFrameBounds, params.near, params.far, matrix );
		distortedFrustum.setFromProjectionMatrix( matrix, linearInfo.frame, params.near, params.far );

	} else {

		m.near = params.near;
		m.far = params.far;
		m.planarProjectionFactor = params.planarProjectionFactor;
		distortedFrustum.setFromCahvoreParameters( m );
		frameBoundsToProjectionMatrix( linearInfo.maxFrameBounds, params.near, params.far, matrix );

	}

	distortedLines.geometry.dispose();
	distortedLines.geometry = new THREE.EdgesGeometry( distortedFrustum.geometry, 10 );

	frustumCamera.projectionMatrix.copy( matrix );
	frustumCamera.projectionMatrixInverse.copy( matrix ).invert();
	linearInfo.frame.decompose(
		frustumCamera.position,
		frustumCamera.quaternion,
		frustumCamera.scale,
	);

	pass.material.checkerboard = params.rendering === 'checkerboard';
	pass.material.passthrough = params.passthrough === 'minimum' || params.rendering === 'maximum';
	pass.material.setFromCameraModel( m );
	updateRenderTarget();

}

// animation
function animation() {

	const delta = clock.getDelta();
	if ( params.animate ) {

		time += delta;

	}

	cameraHelper.update();
	cameraHelper.visible = params.displayCameraHelper;

	frustumGroup.rotation.z = Math.sin( time * 0.25 ) * 0.5 - 0.5;
	tiltGroup.rotation.y = params.tilt;

	camera.updateMatrixWorld();

	tiles.setResolutionFromRenderer( camera, renderer );
	tiles.setResolutionFromRenderer( frustumCamera, renderer );
	tiles.update();

	skyTiles.setResolutionFromRenderer( camera, renderer );
	skyTiles.setResolutionFromRenderer( frustumCamera, renderer );
	skyTiles.update();

	minFrustum.visible = params.displayMinFrustum;
	maxFrustum.visible = params.displayMaxFrustum;

	// render the scene to the target
	scene.updateMatrixWorld();
	renderer.setClearColor( LINEAR_CLEAR_COLOR );
	renderer.setRenderTarget( renderTarget );
	renderer.render( tilesGroup, frustumCamera );
	renderer.setRenderTarget( null );
	renderer.setClearColor( SRGB_CLEAR_COLOR );

	if ( params.fullscreen && cameraModels ) {

		const model = cameraModels[ params.camera ];
		const aspect = model.model.width / model.model.height;
		const windowAspect = window.innerWidth / window.innerHeight;

		let w, h;
		let marginX = 0, marginY = 0;
		if ( aspect < windowAspect ) {

			w = window.innerHeight * aspect;
			h = window.innerHeight;
			marginX = ( window.innerWidth - w ) / 2;

		} else {

			w = window.innerWidth;
			h = window.innerWidth / aspect;
			marginY = ( window.innerHeight - h ) / 2;

		}

		renderer.setViewport( marginX, marginY, w, h );
		pass.render( renderer );
		renderer.setViewport( 0, 0, window.innerWidth, window.innerHeight );
		frameEl.style.visibility = 'hidden';

	} else {

		renderer.render( scene, camera );

		if ( cameraModels ) {

			const model = cameraModels[ params.camera ];
			const aspect = model.model.width / model.model.height;
			const w = Math.ceil( window.innerHeight * aspect * RENDER_SCALE );
			const h = Math.ceil( window.innerHeight * RENDER_SCALE );

			renderer.setViewport( 1, 1, w, h );
			renderer.setScissor( 1, 1, w, h );
			renderer.setScissorTest( true );
			pass.render( renderer );
			renderer.setViewport( 0, 0, window.innerWidth, window.innerHeight );
			renderer.setScissorTest( false );

			frameEl.style.width = `${ w }px`;
			frameEl.style.height = `${ h }px`;
			frameEl.style.visibility = 'visible';

		}

	}

}
