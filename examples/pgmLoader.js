import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PGMLoader } from '../src/index.js';

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
	camera.position.set( 0, 0, - 1.5 );

	scene = new THREE.Scene();

	// image plane
	const plane = new THREE.Mesh(
		new THREE.PlaneGeometry(),
		new THREE.MeshBasicMaterial( { side: THREE.DoubleSide } )
	);
	scene.add( plane );

	// PGM file load
	const loader = new PGMLoader();
	loader.load( './data/saturn.ascii.pgm' ).then( tex => {

		plane.material.map = tex;
		plane.material.map.needsUpdate = true;
		plane.material.needsUpdate = true;
		plane.scale.x = tex.image.width / tex.image.height;

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
