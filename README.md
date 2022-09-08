# CameraModelUtilsJS

[![build](https://img.shields.io/github/workflow/status/NASA-AMMOS/CameraModelUtilsJS/Node.js%20CI?style=flat-square&label=build)](https://github.com/NASA-AMMOS/CameraModelUtilsJS/actions)
[![lgtm code quality](https://img.shields.io/lgtm/grade/javascript/g/NASA-AMMOS/CameraModelUtilsJS.svg?style=flat-square&label=code-quality)](https://lgtm.com/projects/g/NASA-AMMOS/CameraModelUtilsJS/)

Series of packages for visualizing and rendering images and frustum shapes based on CAHVORE camera models as well as loading SGI and PGM images in three.js.

## Packages

[SGI Loader](./src/sgi-loader/)

Project for loading Silicon Graphics image format files into a three.js data texture.

[PGM Loader](./src/pgm-loader/)

Project for loading PGM image format files into a three.js data texture.

[Frustum Meshes](./src/frustum-mesh/)

Three.js utilitiies to for generating and visualizing linear and CAHVORE frustum geometry.

[Cahvore Functions and Distortion Shader](./src/cahvore-utilities/)

Three.js Javascript port of functions for retreiving distorted CAHVORE rays, calculating three.js frames and frustums, and rendering CAHVORE-distorted rendered images.

# LICENSE

The software is available under the [Apache V2.0 license](../LICENSE.txt).

Copyright © 2022 California Institute of Technology. ALL RIGHTS
RESERVED. United States Government Sponsorship Acknowledged.
Neither the name of Caltech nor its operating division, the
Jet Propulsion Laboratory, nor the names of its contributors may be
used to endorse or promote products derived from this software
without specific prior written permission.
