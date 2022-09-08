import { SGILoaderBase } from '../base/SGILoaderBase.js';
import {
    DataTexture,
    RGBAFormat,
    RGFormat,
    RedFormat,
    UnsignedByteType,
    UnsignedShortType,
    LinearFilter,
    LinearMipmapLinearFilter,
    DefaultLoadingManager,
} from 'three';

/**
 * A three.js implementation of SGILoader that returns a data texture rather than raw results.
 */
export class SGILoader extends SGILoaderBase {
    /**
     * @param {LoadingManager} manager
     */
    constructor(manager = DefaultLoadingManager) {
        super();

        /**
         * @member {LoadingManager}
         * @default DefaultLoadingManager
         */
        this.manager = manager;
    }

    /**
     * Loads and parses the SGI file and returns a DataTexture. If a DataTexture is passed into
    * the function the data is applied to it.
     * @param {String} url
     * @param {DataTexture} texture
     * @returns {DataTexture}
     */
    load(url, texture = new DataTexture()) {
        const manager = this.manager;
        manager.itemStart(url);
        super.load(url).then(result => {
            texture.copy(result);
            texture.needsUpdate = true;
        }).catch(err => {
            manager.itemError(url, err);
        }).finally(() => {
            manager.itemEnd(url);
        });
        return texture;
    }

    /**
     * Parses the contents of the given SGI contents and returns a texture.
     * @param {ArrayBuffer|Uint8Array} buffer
     * @param {DataTexture} texture
     * @returns {DataTexture}
     */
    parse(buffer, texture = new DataTexture()) {
        let result = buffer;
        if (buffer instanceof ArrayBuffer) {
            result = super.parse(buffer);
        }

        texture.image.width = result.width;
        texture.image.height = result.height;
        texture.image.data = result.data;
        texture.generateMipmaps = true;
        texture.minFilter = LinearMipmapLinearFilter;
        texture.magFilter = LinearFilter;
        texture.type = result.data.BYTES_PER_ELEMENT === 1 ? UnsignedByteType : UnsignedShortType;

        switch (result.channels) {
            case 1:
                texture.format = RedFormat;
                break;
            case 2:
                texture.format = RGFormat;
                break;
            case 3: {
                // three.js no long supports RGBFormat so conver the data to
                // 4 channel data.
                const { width, height, data } = result;
                const newData = new data.constructor(width * height * 4);
                const maxValue = Math.pow(2, newData.BYTES_PER_ELEMENT * 8);
                for ( let i = 0, l = data.length; i < l; i += 3 ) {
                    newData[i + 0] = data[i + 0];
                    newData[i + 1] = data[i + 1];
                    newData[i + 2] = data[i + 2];
                    newData[i + 3] = maxValue;
                }

                texture.format = RGBAFormat;
                texture.image.data = newData;
                break;
            }
            case 4:
                texture.format = RGBAFormat;
                break;
        }
        texture.needsUpdate = true;

        return texture;
    }
}
