import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { FrustumMesh, getLinearFrustumInfo, frameBoundsToProjectionMatrix, CahvoreDistortionMaterial } from '../src/index.js';
import { TilesRenderer } from '3d-tiles-renderer';

let camera, frustumCamera, scene, renderer, controls, clock, cameraHelper, frameEl;
let light, ambient, cameraModels, tilesGroup, tiles, skyTiles, renderTarget, pass;
let frustumGroup, tiltGroup, frustumMesh, frustumLines, stencilGroup;
let time = 0;
const PIP_RENDER_SCALE = 0.5;
const TERRAIN_RENDER_ORDER = - 10;
const SRGB_CLEAR_COLOR = 0x11161C;
const LINEAR_CLEAR_COLOR = new THREE.Color( SRGB_CLEAR_COLOR ).convertSRGBToLinear().getHex();

const params = {

	animate: true,
	fullscreen: false,
	stretchCompensation: true,
	displayCameraHelper: false,

	camera: 'HAZFLA',
	rendering: 'distorted',
	near: 0.2,
	far: 200,
	planarProjectionFactor: 0,
	tilt: - 0.25,
	showTint: true,
	showVolume: true,

};

init();

// init
async function init() {

	// get the picture in picture frame
	frameEl = document.getElementById( 'frame' );

	// init the renderer
	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setClearColor( SRGB_CLEAR_COLOR );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.outputEncoding = THREE.sRGBEncoding;
	renderer.setAnimationLoop( animation );
	document.body.appendChild( renderer.domElement );

	// init the camera
	camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.1, 1000 );
	camera.position.set( - 6, 6, 6 ).multiplyScalar( 5 );

	clock = new THREE.Clock();

	scene = new THREE.Scene();

	// lights
	light = new THREE.DirectionalLight();
	light.position.set( 3, 3, 3 );
	scene.add( light );

	ambient = new THREE.AmbientLight( 0xffffff, 0.1 );
	scene.add( ambient );

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
	frustumMesh = new FrustumMesh( new THREE.MeshPhongMaterial( {

		transparent: true,
		opacity: 0.1,
		side: THREE.DoubleSide,
		depthWrite: false,

	} ) );
	tiltGroup.add( frustumMesh );

	// distorted lines
	frustumLines = new THREE.LineSegments(
		new THREE.EdgesGeometry(),
		new THREE.LineBasicMaterial(),
	);
	tiltGroup.add( frustumLines );

	// stencil group for terrain tinting
	stencilGroup = new THREE.Group();
	stencilGroup.add( new THREE.Mesh( undefined, new THREE.MeshBasicMaterial( {

		depthTest: false,
		depthWrite: false,
		colorWrite: false,
		side: THREE.BackSide,
		stencilWrite: true,
		stencilZFail: THREE.DecrementWrapStencilOp,
		stencilZPass: THREE.DecrementWrapStencilOp,

	} ) ) );
	stencilGroup.add( new THREE.Mesh( undefined, new THREE.MeshBasicMaterial( {

		depthTest: false,
		depthWrite: false,
		colorWrite: false,
		side: THREE.FrontSide,
		stencilWrite: true,
		stencilZFail: THREE.IncrementWrapStencilOp,
		stencilZPass: THREE.IncrementWrapStencilOp,

	} ) ) );
	stencilGroup.add( new THREE.Mesh( undefined, new THREE.MeshBasicMaterial( {

		depthTest: true,
		depthWrite: false,
		colorWrite: false,
		side: THREE.BackSide,
		stencilWrite: true,
		stencilZFail: THREE.KeepStencilOp,
		stencilZPass: THREE.IncrementWrapStencilOp,

	} ) ) );
	stencilGroup.add( new THREE.Mesh( undefined, new THREE.MeshBasicMaterial( {

		depthTest: true,
		depthWrite: false,
		colorWrite: false,
		side: THREE.FrontSide,
		stencilWrite: true,
		stencilZFail: THREE.KeepStencilOp,
		stencilZPass: THREE.DecrementWrapStencilOp,

	} ) ) );
	stencilGroup.add( new THREE.Mesh( undefined, new THREE.MeshBasicMaterial( {

		color: 0xffffff,
		opacity: 0.15,
		blending: THREE.AdditiveBlending,

		depthTest: false,
		depthWrite: false,
		side: THREE.BackSide,
		stencilWrite: true,
		stencilRef: 0,
		stencilFunc: THREE.NotEqualStencilFunc,
		stencilFail: THREE.ReplaceStencilOp,
		stencilZFail: THREE.ReplaceStencilOp,
		stencilPass: THREE.ReplaceStencilOp,
		stencilZPass: THREE.ReplaceStencilOp,

	} ) ) );

	// ensure the stencil operations render after the terrain but before the other objects in the scene
	stencilGroup.children.forEach( ( child, index ) => {

		child.renderOrder = TERRAIN_RENDER_ORDER + index + 1;

	} );
	tiltGroup.add( stencilGroup );

	// init the terrain
	tilesGroup = new THREE.Group();
	tilesGroup.rotation.x = Math.PI / 2;
	tilesGroup.position.y = - 1;
	scene.add( tilesGroup );

	// callback for setting the render order on each object
	const loadTileCallback = scene => {

		scene.traverse( c => {

			if ( c.isMesh ) {

				c.renderOrder = TERRAIN_RENDER_ORDER;

			}

		} );

	};

	tiles = new TilesRenderer( 'https://raw.githubusercontent.com/NASA-AMMOS/3DTilesSampleData/master/msl-dingo-gap/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize_tileset.json' );
	tiles.fetchOptions.mode = 'cors';
	tiles.lruCache.minSize = 900;
	tiles.lruCache.maxSize = 1300;
	tiles.errorTarget = 12;
	tiles.setCamera( camera );
	tiles.setCamera( frustumCamera );
	tiles.onLoadModel = loadTileCallback;
	tilesGroup.add( tiles.group );

	skyTiles = new TilesRenderer( 'https://raw.githubusercontent.com/NASA-AMMOS/3DTilesSampleData/master/msl-dingo-gap/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_sky/0528_0260184_to_s64o256_sky_tileset.json' );
	skyTiles.fetchOptions.mode = 'cors';
	skyTiles.lruCache = tiles.lruCache;
	skyTiles.downloadQueue = tiles.downloadQueue;
	skyTiles.parseQueue = tiles.parseQueue;
	skyTiles.errorTarget = 12;
	skyTiles.setCamera( camera );
	skyTiles.setCamera( frustumCamera );
	skyTiles.onLoadModel = loadTileCallback;
	tilesGroup.add( skyTiles.group );

	// render target and distortion material init
	renderTarget = new THREE.WebGLRenderTarget( 1, 1, {
		generateMipmaps: true,
		minFilter: THREE.LinearMipMapLinearFilter,
	} );
	pass = new FullScreenQuad(
		new CahvoreDistortionMaterial( {
			map: renderTarget.texture,
		} ),
	);

	// load the camera models
	fetch( 'https://raw.githubusercontent.com/nasa-jpl/m2020-urdf-models/main/m2020-camera-models.json' )
		.then( res => res.json() )
		.then( result => {

			cameraModels = {};
			result.forEach( c => {

				// convert the CAHVORE arrays to vectors
				const model = c.model;
				for ( const key in model ) {

					if ( Array.isArray( model[ key ] ) ) {

						model[ key ] = new THREE.Vector3( ...model[ key ] );

					}

				}

				cameraModels[ c.name ] = c;

			} );

			buildGUI();

		} );

	controls = new OrbitControls( camera, renderer.domElement );

	window.addEventListener( 'resize', () => {

		renderer.setSize( window.innerWidth, window.innerHeight );
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
		updateRenderTarget();

	} );

}

function buildGUI() {

	const gui = new GUI();
	gui.add( params, 'animate' );
	gui.add( params, 'fullscreen' ).onChange( updateRenderTarget );
	gui.add( params, 'stretchCompensation' ).onChange( updateRenderTarget );
	gui.add( params, 'displayCameraHelper' );

	const frustumSettings = gui.addFolder( 'frustum' );
	frustumSettings.add( params, 'camera', Object.keys( cameraModels ) ).onChange( updateFrustums );
	frustumSettings.add( params, 'rendering', [ 'distorted', 'minimum', 'maximum', 'checkerboard' ] ).onChange( updateFrustums );
	frustumSettings.add( params, 'showTint' );
	frustumSettings.add( params, 'showVolume' );
	frustumSettings.add( params, 'near', 0.01, 250 ).onChange( updateFrustums );
	frustumSettings.add( params, 'far', 0.01, 250 ).onChange( updateFrustums );
	frustumSettings.add( params, 'tilt', - 0.5, 0.5 ).onChange( updateFrustums );
	frustumSettings.add( params, 'planarProjectionFactor', 0, 1 ).onChange( updateFrustums );

	updateFrustums();
	updateRenderTarget();

}

function updateRenderTarget() {

	const camera = cameraModels[ params.camera ];

	// get the width and height differences
	const { minFrameBounds, maxFrameBounds } = getLinearFrustumInfo( camera.model );
	const minHeight = minFrameBounds.top - minFrameBounds.bottom;
	const maxHeight = maxFrameBounds.top - maxFrameBounds.bottom;
	const minWidth = minFrameBounds.right - minFrameBounds.left;
	const maxWidth = maxFrameBounds.right - maxFrameBounds.left;

	// compute a upscale ratio to compensate for stretching in the distortion stage
	let upscaleRatio = 1;
	if ( params.stretchCompensation ) {

		upscaleRatio = Math.max( maxHeight / minHeight, maxWidth / minWidth );

	}

	const aspect = maxWidth / maxHeight;
	const dpr = window.devicePixelRatio;
	const height = window.innerHeight;
	const pipFactor = params.fullscreen ? 1 : PIP_RENDER_SCALE;
	renderTarget.setSize(
		Math.ceil( pipFactor * height * dpr * aspect * upscaleRatio ),
		Math.ceil( pipFactor * height * dpr * upscaleRatio ),
	);

}

function updateFrustums() {

	const camera = cameraModels[ params.camera ];

	// generate the frustums
	const matrix = new THREE.Matrix4();
	const linearInfo = getLinearFrustumInfo( camera.model );
	if ( params.rendering === 'minimum' ) {

		// set the frustum shape based on the minimum linear frustum
		frameBoundsToProjectionMatrix( linearInfo.minFrameBounds, params.near, params.far, matrix );
		frustumMesh.setFromProjectionMatrix( matrix, linearInfo.frame, params.near, params.far );

	} else if ( params.rendering === 'maximum' ) {

		// set the frustum shape based on the maximum linear frustum
		frameBoundsToProjectionMatrix( linearInfo.maxFrameBounds, params.near, params.far, matrix );
		frustumMesh.setFromProjectionMatrix( matrix, linearInfo.frame, params.near, params.far );

	} else {

		// set the frustum shape based on the CAHVORE parameters
		camera.near = params.near;
		camera.far = params.far;
		camera.planarProjectionFactor = params.planarProjectionFactor;
		frustumMesh.setFromCahvoreParameters( camera );
		frameBoundsToProjectionMatrix( linearInfo.maxFrameBounds, params.near, params.far, matrix );

	}

	// update the frustum lines
	frustumLines.geometry.dispose();
	frustumLines.geometry = new THREE.EdgesGeometry( frustumMesh.geometry, 10 );

	// update the stencil geometry
	stencilGroup.children.forEach( child => {

		child.geometry = frustumMesh.geometry;

	} );

	// position and update the rendering camera
	frustumCamera.projectionMatrix.copy( matrix );
	frustumCamera.projectionMatrixInverse.copy( matrix ).invert();
	linearInfo.frame.decompose(
		frustumCamera.position,
		frustumCamera.quaternion,
		frustumCamera.scale,
	);

	// update the distortion material
	pass.material.checkerboard = params.rendering === 'checkerboard';
	pass.material.passthrough = params.rendering === 'minimum' || params.rendering === 'maximum';
	pass.material.setFromCameraModel( camera.model );

	updateRenderTarget();

}

// animation
function animation() {

	const delta = clock.getDelta();
	if ( params.animate ) {

		time += delta;

	}

	// visibility update
	stencilGroup.visible = params.showTint;
	frustumLines.visible = params.showVolume;
	frustumMesh.visible = params.showVolume;

	// toggle the camera helper
	cameraHelper.update();
	cameraHelper.visible = params.displayCameraHelper;

	// adjust the frustum animation
	frustumGroup.rotation.z = Math.sin( time * 0.25 ) * 0.5 - 0.5;
	tiltGroup.rotation.y = params.tilt;

	// update the scene and camera for rendering and tiles update
	scene.updateMatrixWorld();
	camera.updateMatrixWorld();

	// update tiles
	tiles.setResolutionFromRenderer( camera, renderer );
	tiles.setResolution( frustumCamera, renderTarget.texture.image.width, renderTarget.texture.image.height );
	tiles.update();

	skyTiles.setResolutionFromRenderer( camera, renderer );
	skyTiles.setResolution( frustumCamera, renderTarget.texture.image.width, renderTarget.texture.image.height );
	skyTiles.update();

	// render the scene to the target
	renderer.setClearColor( LINEAR_CLEAR_COLOR );
	renderer.setRenderTarget( renderTarget );
	renderer.render( tilesGroup, frustumCamera );
	renderer.setRenderTarget( null );
	renderer.setClearColor( SRGB_CLEAR_COLOR );

	if ( params.fullscreen && cameraModels ) {

		// render in full screen mode
		const camera = cameraModels[ params.camera ];
		const aspect = camera.model.width / camera.model.height;
		const windowAspect = window.innerWidth / window.innerHeight;

		// set the display based on image aspect ratio
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

		// render the distorted view
		renderer.setViewport( marginX, marginY, w, h );
		pass.render( renderer );
		renderer.setViewport( 0, 0, window.innerWidth, window.innerHeight );
		frameEl.style.visibility = 'hidden';

	} else {

		// render the scene
		renderer.render( scene, camera );

		// render the picture in picture
		if ( cameraModels ) {

			const model = cameraModels[ params.camera ];
			const aspect = model.model.width / model.model.height;
			let w = Math.ceil( window.innerHeight * aspect * PIP_RENDER_SCALE );
			let h = Math.ceil( window.innerHeight * PIP_RENDER_SCALE );
			if ( w > window.innerWidth * PIP_RENDER_SCALE ) {

				w = Math.ceil( window.innerWidth * PIP_RENDER_SCALE );
				h = Math.ceil( window.innerWidth * PIP_RENDER_SCALE / aspect );

			}

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
