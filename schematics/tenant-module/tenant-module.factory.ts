import {
  apply,
  chain,
  filter,
  mergeWith,
  move,
  noop,
  Rule,
  SchematicContext,
  template,
  Tree,
  url,
} from '@angular-devkit/schematics';
import { normalize, strings } from '@angular-devkit/core';
import { TenantModuleOptions } from './schema';

export function tenantModule(options: TenantModuleOptions): Rule {
  return (tree: Tree, context: SchematicContext) => {
    context.logger.info(`Generating tenant-aware module: ${options.name}`);

    const templateSource = apply(url('./files'), [
      options.skipTests ? filter((path) => !path.endsWith('.spec.ts.template')) : noop(),
      !options.includeController ? filter((path) => !path.includes('controller')) : noop(),
      !options.includeService ? filter((path) => !path.includes('service')) : noop(),
      template({
        ...strings,
        ...options,
        classify: strings.classify,
        dasherize: strings.dasherize,
        camelize: strings.camelize,
      }),
      move(normalize(options.path || 'src')),
    ]);

    return chain([mergeWith(templateSource)])(tree, context);
  };
}
