import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PDSLoader, VicarLoader } from '../src/index.js';
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';

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

	const addLabelToGUI = ( folder, labels ) => {

		for ( let i = 0, l = labels.length; i < l; i ++ ) {

			const label = labels[ i ];
			if ( ! ( label instanceof Object ) ) {

				folder.add( { value: label }, 'value' ).name( `${ i }:` ).disable();

			} else if ( Array.isArray( label.value ) ) {

				const newFolder = folder.addFolder( label.name );
				newFolder.close();
				addLabelToGUI( newFolder, label.value );

			} else {

				folder.add( label, 'value' ).name( label.name ).disable();

			}

		}

	};

	// PGM file load
	const loader = new PDSLoader();
	loader.parsers[ 'VICAR2' ] = buffer => new VicarLoader().parse( buffer );
	loader.load( './data/NRB_701383954RAS_F0933408NCAM00200M1.IMG' ).then( result => {

		// add labels to gui
		const gui = new GUI();
		gui.title( 'Labels' );

		const pdsLabels = gui.addFolder( 'PDS Labels' );
		pdsLabels.close();

		const vicarLabels = gui.addFolder( 'Vicar Labels' );
		vicarLabels.close();

		addLabelToGUI( pdsLabels, result.labels )
		addLabelToGUI( vicarLabels, result.product.labels )

		const tex = result.product.texture;
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
