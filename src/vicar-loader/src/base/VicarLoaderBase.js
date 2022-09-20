import { readUntil, parseLabels, readString, getFirstLabelInstance } from './utils.js';

/**
 * @typedef {Object} VicarResult
 * @param {Array<{ isLabelGroup: Boolean, name: String, value: any }>} labels
 * The set of header labels in the file. This includes both the header
 * and EOL extension labels if present.
 *
 * @param {TypedArray} data
 * The data of the file in a typed array of the type defined by the
 * `labels.FORMAT` field with the binary prefix data stripped out.
 *
 * The array is of length `width * height * depth`. If {@link #VicarResult#complex complex}
 * is true then the length will be `width * height * depth * 2` to account
 * for the imaginary and real components of the values.
 *
 * @param {Number} width
 * The row stride of the image as defined by the `labels.N1` field.
 *
 * @param {Number} height
 * The height of the image as defined by the `labels.N2` field.
 *
 * @param {Number} depth
 * The depth of the image as defined by the `labels.N3` field.
 *
 * @param {Uint8Array} prefixData
 * The binary prefix data for each row defined at a `Uint8Array`. The
 * array is of length `width * prefixWidth`.
 *
 * @param {Number} prefixWidth
 * The width of the binary prefix as defined by the `labels.NBB` field.
 *
 * @param {Boolean} complex
 * Whether the values are complex or not as dependent on the `labels.FORMAT`
 * field. This will be `true` if `labels.FORMAT` is `COMP` or `COMPLEX`.
 */

/** Class for loading and parsing Vicar files */
export class VicarLoaderBase {
    constructor() {
        /**
         * @member {Object}
         * @description Fetch options for loading the file.
         * @default { credentials: 'same-origin' }
         */
        this.fetchOptions = { credentials: 'same-origin' };
    }

    /**
     * Loads and parses the Vicar file. The promise resolves with the returned
     * data from the {@link #VicarLoaderBase#parse parse} function.
     * @param {String} url
     * @returns {Promise<VicarResult>}
     */
    load(url) {
        return fetch(url, this.fetchOptions)
            .then(res => {
                if (!res.ok) {
                    throw new Error(`VicarLoader: Failed to load file "${url}" with status ${res.status} : ${res.statusText}`);
                }
                return res.arrayBuffer();
            })
            .then(buffer => this.parse(buffer));
    }

    /**
     * Parses the contents of the given Vicar file and returns an object describing
     * the telemetry.
     * @param {Uint8Array | ArrayBuffer} buffer
     * @returns {VicarResult}
     */
    parse(buffer) {
        let byteBuffer;
        if (buffer instanceof Uint8Array) {
            byteBuffer = buffer;
            buffer = byteBuffer.buffer;
        } else {
            byteBuffer = new Uint8Array(buffer);
        }
        const lblsizeStr = readUntil(byteBuffer, 0, c => /\s/.test(c));
        const labelSize = parseInt(lblsizeStr.split('=')[1]);

        if (Number.isNaN(labelSize)) {
            throw new Error('VicarLoader: Label size not provided.');
        }

        const header = readString(byteBuffer, 0, labelSize);
        const labels = parseLabels(header);
        const LBLSIZE = getFirstLabelInstance(labels, 'LBLSIZE');
        const RECSIZE = getFirstLabelInstance(labels, 'RECSIZE');
        const ORG = getFirstLabelInstance(labels, 'ORG');
        const NS = getFirstLabelInstance(labels, 'NS');
        const NL = getFirstLabelInstance(labels, 'NL');
        const NB = getFirstLabelInstance(labels, 'NB');
        const FORMAT = getFirstLabelInstance(labels, 'FORMAT');

        const EOL = getFirstLabelInstance(labels, 'EOL', 0);
        const INTFMT = getFirstLabelInstance(labels, 'INTFMT', 'LOW');
        const REALFMT = getFirstLabelInstance(labels, 'REALFMT', 'VAX');
        const NLB = getFirstLabelInstance(labels, 'NLB', 0);
        const NBB = getFirstLabelInstance(labels, 'NBB', 0);
        // const DIM = getFirstLabelInstance(labels, 'DIM', 3);
        // const TYPE = getFirstLabelInstance(labels, 'TYPE', 'IMAGE');
        // const HOST = getFirstLabelInstance(labels, 'HOST', 'VAX-VMS');
        // const N4 = getFirstLabelInstance(labels, 'N4', 0);

        let N1, N2, N3;
        switch (ORG) {
            case 'BSQ':
                N1 = getFirstLabelInstance(labels, 'N1', NS);
                N2 = getFirstLabelInstance(labels, 'N2', NL);
                N3 = getFirstLabelInstance(labels, 'N3', NB);

                if (N1 !== NS || N2 !== NL || N3 !== NB) {
                    throw new Error(
                        `VicarLoader: N1, N2, N3 labels do not match NS, NL, NB in BSQ order: ${ N1 }, ${ N2 }, ${ N2 } != ${ NS }, ${ NL }, ${ NB }`
                    );
                }

                break;
            case 'BIL':
                N1 = getFirstLabelInstance(labels, 'N1', NS);
                N2 = getFirstLabelInstance(labels, 'N2', NB);
                N3 = getFirstLabelInstance(labels, 'N3', NL);

                if (N1 !== NS || N2 !== NB || N3 !== NL) {
                    throw new Error(
                        `VicarLoader: N1, N2, N3 labels do not match NS, NB, NL in BSQ order: ${ N1 }, ${ N2 }, ${ N2 } != ${ NS }, ${ NB }, ${ NL }`
                    );
                }

                break;
            case 'BIP':
                N1 = getFirstLabelInstance(labels, 'N1', NB);
                N2 = getFirstLabelInstance(labels, 'N2', NS);
                N3 = getFirstLabelInstance(labels, 'N3', NL);

                if (N1 !== NS || N2 !== NB || N3 !== NL) {
                    throw new Error(
                        `VicarLoader: N1, N2, N3 labels do not match NB, NS, NL in BSQ order: ${ N1 }, ${ N2 }, ${ N2 } != ${ NB }, ${ NS }, ${ NL }`
                    );
                }

                break;
        }

        const imageOffset = LBLSIZE;
        const imageSize = RECSIZE * (N2 * N3 + NLB);

        if (EOL === 1) {
            const eolOffset = imageOffset + imageSize;
            const eolLabelStr = readUntil(byteBuffer, eolOffset, c => /\s/.test(c));
            const eolLabelSize = parseInt(eolLabelStr.split('=')[1]);
            const eolHeader = readString(byteBuffer, eolOffset, eolOffset + eolLabelSize);
            const eolLabels = parseLabels(eolHeader);
            labels.push(...eolLabels);
        }

        let cons;
        let readFunc;
        let littleEndian;
        let complex = false;
        switch (FORMAT) {
            case 'BYTE':
                cons = Uint8Array;
                readFunc = 'getUint8';
                littleEndian = INTFMT === 'LOW';
                break;
            case 'WORD':
            case 'HALF':
                cons = Int16Array;
                readFunc = 'getInt16';
                littleEndian = INTFMT === 'LOW';
                break;
            case 'LONG':
            case 'FULL':
                cons = Int32Array;
                readFunc = 'getInt32';
                littleEndian = INTFMT === 'LOW';
                break;
            case 'REAL':
                cons = Float32Array;
                readFunc = 'getFloat32';
                littleEndian = REALFMT === 'RIEEE';
                if (labels.REALFMT === 'VAX') {
                    throw new Error('VicarLoader: VAX REALFMT not supported.');
                }
                break;
            case 'DOUB':
                cons = Float64Array;
                readFunc = 'getFloat64';
                littleEndian = REALFMT === 'RIEEE';
                if (REALFMT === 'VAX') {
                    throw new Error('VicarLoader: VAX REALFMT not supported.');
                }
                break;
            case 'COMPLEX':
            case 'COMP':
                complex = true;
                cons = Float32Array;
                readFunc = 'getFloat32';
                littleEndian = REALFMT === 'RIEEE';
                if (REALFMT === 'VAX') {
                    throw new Error('VicarLoader: VAX REALFMT not supported.');
                }
                break;
        }

        const dataOffset = imageOffset + NLB * RECSIZE;
        const dataSize = imageSize - NLB * RECSIZE;
        const view = new DataView(buffer, byteBuffer.byteOffset + dataOffset, dataSize);
        const data = new cons(N1 * N2 * N3);
        const prefixData = new Uint8Array(NBB * N2 * N3);

        const recsize = RECSIZE;
        const pxlSize = cons.BYTES_PER_ELEMENT;
        const nbb = NBB;
        for (let i3 = 0, l3 = N3; i3 < l3; i3++) {
            for (let i2 = 0, l2 = N2; i2 < l2; i2++) {
                // row number
                const row = i3 * l2 + i2;

                // row start index in bytes
                const rowStart = row * recsize;

                // copy the row data
                for (let i1 = 0, l1 = N1; i1 < l1; i1++) {
                    const byteOffset = rowStart + nbb + i1 * pxlSize;
                    const index = row * l1 + i1;
                    data[index] = view[readFunc](byteOffset, littleEndian);
                    if (complex) {
                        data[index + 1] = view[readFunc](byteOffset + 4, littleEndian);
                    }
                }

                // copy the prefix data
                for (let ib = 0; ib < nbb; ib++) {
                    const byteOffset = rowStart + ib;
                    const index = row * nbb + ib;
                    prefixData[index] = view.getUint8(byteOffset);
                }
            }
        }

        const width = NS;
        const prefixWidth = NBB;
        const height = NL;
        const depth = NB;

        if (NLB !== 0) {
            console.warn('VicarLoader: NLB Data is present but is not being procesed.');
        }

        return {
            labels,

            data,
            width,
            height,
            depth,

            prefixData,
            prefixWidth,

            complex,
        };
    }
}
