/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

'use strict';

const packageDir = `${__dirname}/../..`;

const getFluidTestMochaConfig = require("@fluidframework/mocha-test-setup/mocharc-common.js");
const config = getFluidTestMochaConfig(packageDir);
module.exports = config;
