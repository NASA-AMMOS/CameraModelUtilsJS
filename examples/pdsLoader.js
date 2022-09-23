import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { PDSLoader, VicarLoader } from '../src/index.js';
import { addLabelToGUI, stretchTextureData } from './utils.js';

let camera, scene, renderer, controls;

init();

// init
async function init() {

	// renderer init
	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setClearColor( 0x11161C );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.outputEncoding = THREE.sRGBEncoding;
	renderer.setAnimationLoop( animation );
	document.body.appendChild( renderer.domElement );

	// init camera
	camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.01, 100 );
	camera.position.set( 0, 0, 1.5 );

	scene = new THREE.Scene();

	// image plane
	const plane = new THREE.Mesh(
		new THREE.PlaneGeometry(),
		new THREE.MeshBasicMaterial( { side: THREE.DoubleSide } )
	);
	scene.add( plane );

	// PGM file load
	const loader = new PDSLoader();
	loader.parsers[ 'VICAR2' ] = buffer => new VicarLoader().parse( buffer );
	loader.load( './data/NRB_701383954RAS_F0933408NCAM00200M1.IMG' ).then( result => {

		const { labels, product } = result;

		// add labels to gui
		const gui = new GUI();
		gui.title( 'Labels' );

		const pdsLabels = gui.addFolder( 'PDS Labels' );
		pdsLabels.close();

		const vicarLabels = gui.addFolder( 'Vicar Labels' );
		vicarLabels.close();

		addLabelToGUI( pdsLabels, labels )
		addLabelToGUI( vicarLabels, product.labels )

		const tex = product.texture;
		plane.material.map = tex;
		plane.material.needsUpdate = true;
		plane.scale.x = tex.image.width / tex.image.height;

		// map the color data to the available precision for a richer image
		stretchTextureData( tex );

	} );

	controls = new OrbitControls( camera, renderer.domElement );

	window.addEventListener( 'resize', () => {

		renderer.setSize( window.innerWidth, window.innerHeight );
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();

	} );

}

// animation
function animation() {

	renderer.render( scene, camera );

}
