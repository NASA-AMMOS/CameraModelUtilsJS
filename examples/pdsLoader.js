import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { PDSLoader, VicarLoader } from '../src/index.js';
import { addLabelToGUI, stretchTextureData } from './utils.js';

let camera, scene, renderer, controls, plane, gui;

const images = {
	'M2020 EDL': './data/m2020/ESF_0001_0667022261_840FDR_N0010052EDLC00001_0010LUJ01.IMG',
	'M2020 Heli Deploy': './data/m2020/SI1_0039_0670409192_132FDR_N0031392SRLC07000_000085J01.IMG',
	'M2020 Heli Image': './data/m2020/ZLF_0045_0670943049_156FDR_N0031416ZCAM05014_0340LUJ01.IMG',
	'MSL Navcam': './data/NRB_701383954RAS_F0933408NCAM00200M1.IMG',
};

const params = {

	image: images[ 'M2020 Heli Image' ],

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
	renderer.setAnimationLoop( animation );
	document.body.appendChild( renderer.domElement );

	// init camera
	camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.01, 100 );
	camera.position.set( 0, 0, 1.5 );

	scene = new THREE.Scene();

	// image plane
	plane = new THREE.Mesh(
		new THREE.PlaneGeometry(),
		new THREE.MeshBasicMaterial( { side: THREE.DoubleSide } )
	);
	scene.add( plane );

	reloadImage();

	controls = new OrbitControls( camera, renderer.domElement );

	window.addEventListener( 'resize', () => {

		renderer.setSize( window.innerWidth, window.innerHeight );
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();

	} );

}

function reloadImage() {

	if ( gui ) {

		gui.destroy();
		gui = null;

	}

	// PGM file load
	const loader = new PDSLoader();
	loader.parsers[ 'VICAR2' ] = buffer => new VicarLoader().parse( buffer );
	loader.load( params.image ).then( result => {

		const { labels, product } = result;

		if ( plane.material.map ) {

			plane.material.map.dispose();

		}

		// add labels to gui
		gui = new GUI();
		gui.domElement.style.width = '300px';
		gui.add( params, 'image', images ).onChange( () => {

			reloadImage();

		} );

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

}

// animation
function animation() {

	renderer.render( scene, camera );

}
