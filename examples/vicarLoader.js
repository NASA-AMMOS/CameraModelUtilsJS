import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { VicarLoader } from '../src/index.js';
import { addLabelToGUI } from './utils.js';

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
	const loader = new VicarLoader();
	loader.load( './data/D001L0040_600081076EDR_F0002_0010M2.VIC' ).then( result => {

		const { labels, texture } = result;

		// add labels to gui
		const gui = new GUI();
		gui.domElement.style.width = '300px';
		gui.title( 'Labels' );

		addLabelToGUI( gui, labels )

		plane.material.map = texture;
		plane.material.needsUpdate = true;
		plane.scale.x = texture.image.width / texture.image.height;

		// image seems to have gamma correction pre-applied
		texture.encoding = THREE.sRGBEncoding;

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
