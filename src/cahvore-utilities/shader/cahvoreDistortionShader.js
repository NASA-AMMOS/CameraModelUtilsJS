import { Matrix4, Vector3 } from 'three';
import { mathFunctions } from './mathFunctions.js';
import { cahvoreFunction } from './shaderFunctions.js';

export const CAHV = 0;
export const CAHVOR = 1;
export const CAHVORE = 2;

export const cahvoreUnprojectShader = {
	uniforms: {

		map: { value: null },
		inverseFrame: { value: new Matrix4() },
		cahvoreProjectionMatrix: { value: new Matrix4() },

		// left, bottom, width, height
		imageWidth: { value: 0 },
		imageHeight: { value: 0 },

		C: { value: new Vector3() },
		A: { value: new Vector3() },
		H: { value: new Vector3() },
		V: { value: new Vector3() },
		O: { value: new Vector3() },
		R: { value: new Vector3() },
		E: { value: new Vector3() },
		linearity: { value: 1.0 },

	},

	defines: {
		MODEL_TYPE: CAHVORE,
		CHECKERBOARD: 0,
		PASSTHROUGH: 0,
	},

	vertexShader: /* glsl */`
        varying vec2 vUv;
		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}
    `,

	fragmentShader: /* glsl */`
        #define CAHV 0
        #define CAHVOR 1
        #define CAHVORE 2

        uniform sampler2D map;
        uniform mat4 inverseFrame;
        uniform mat4 cahvoreProjectionMatrix;
        uniform float linearity;
        uniform float imageWidth;
        uniform float imageHeight;
        uniform vec3 C;
        uniform vec3 A;
        uniform vec3 H;
        uniform vec3 V;

        #if MODEL_TYPE == CAHVOR || MODEL_TYPE == CAHVORE
            uniform vec3 O;
            uniform vec3 R;
        #endif

        #if MODEL_TYPE == CAHVORE
            uniform vec3 E;
        #endif

        varying vec2 vUv;

        ${ mathFunctions }
        ${ cahvoreFunction }

        void main() {

            #if PASSTHROUGH

                gl_FragColor = texture2D( map, vUv );

            #else

                vec2 samplePos;
                float range;
                vec3 rayOrigin, rayDirection;

                // WebGL camera 0,0 is bottom left while CAHVORE 0,0 is top left
                vec2 imageCoord = vec2( vUv.x, 1.0 - vUv.y ) * vec2( imageWidth, imageHeight );

                // get the ray associated with the image-space x, y value
                #if MODEL_TYPE == CAHV

                    cmod_cahv_2d_to_3d(
                        imageCoord,
                        C, A, H, V,
                        rayOrigin, rayDirection
                    );

                #elif MODEL_TYPE == CAHVOR

                    cmod_cahvor_2d_to_3d(
                        imageCoord,
                        C, A, H, V, O, R,
                        rayOrigin, rayDirection
                    );

                #elif MODEL_TYPE == CAHVORE

                    cmod_cahvore_2d_to_3d_general(
                        imageCoord, linearity,
                        C, A, H, V, O, R, E,
                        rayOrigin, rayDirection
                    );

                #endif

                vec4 sampleCoord = vec4( rayOrigin + rayDirection, 1.0 );
                sampleCoord = cahvoreProjectionMatrix * inverseFrame * sampleCoord;
                sampleCoord.xyz /= sampleCoord.w;
                sampleCoord.xy += vec2(1.0);
                sampleCoord.xy *= 0.5;

                #if CHECKERBOARD

                    bool checker = true;
                    sampleCoord *= 10.0;

                    if ( int( sampleCoord.x ) % 2 == 0 ) {

                        checker = ! checker;
                    }

                    if ( int( sampleCoord.y ) % 2 == 0 ) {
                        checker = ! checker;
                    }

                    gl_FragColor = vec4( checker );
					gl_FragColor.a = 1.0;

                #else

                    // sample pixel at the found x, y value
                    gl_FragColor = texture2D( map, sampleCoord.xy );

                #endif

            #endif

			#include <encodings_fragment>
			#include <tonemapping_fragment>

        }
    `,
};
