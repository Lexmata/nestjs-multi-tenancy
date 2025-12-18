"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantModule = tenantModule;
const schematics_1 = require("@angular-devkit/schematics");
const core_1 = require("@angular-devkit/core");
function tenantModule(options) {
    return (tree, context) => {
        context.logger.info(`Generating tenant-aware module: ${options.name}`);
        const templateSource = (0, schematics_1.apply)((0, schematics_1.url)('./files'), [
            options.skipTests ? (0, schematics_1.filter)((path) => !path.endsWith('.spec.ts.template')) : (0, schematics_1.noop)(),
            !options.includeController ? (0, schematics_1.filter)((path) => !path.includes('controller')) : (0, schematics_1.noop)(),
            !options.includeService ? (0, schematics_1.filter)((path) => !path.includes('service')) : (0, schematics_1.noop)(),
            (0, schematics_1.template)({
                ...core_1.strings,
                ...options,
                classify: core_1.strings.classify,
                dasherize: core_1.strings.dasherize,
                camelize: core_1.strings.camelize,
            }),
            (0, schematics_1.move)((0, core_1.normalize)(options.path || 'src')),
        ]);
        return (0, schematics_1.chain)([(0, schematics_1.mergeWith)(templateSource)])(tree, context);
    };
}
