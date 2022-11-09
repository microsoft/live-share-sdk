/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = (env) => {
    const htmlTemplate = "./src/index.html";

    const plugins = env && env.clean ? [new CleanWebpackPlugin()] : [];

    plugins.push(
        new HtmlWebpackPlugin({ template: htmlTemplate }),
        new CopyWebpackPlugin({
            patterns: [{ from: "./src/app.css", to: "app.css" }],
        })
    );

    const mode = env && env.prod ? "production" : "development";

    return {
        devtool: "inline-source-map",
        entry: {
            app: "./src/app.ts",
        },
        mode,
        output: {
            filename: "[name].[contenthash].js",
        },
        resolve: {
            extensions: [".ts", ".tsx", ".js"],
        },
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    loader: "ts-loader",
                    exclude: /(node_modules)/,
                },
            ],
        },
        plugins,
        devServer: {
            open: true,
        },
    };
};
