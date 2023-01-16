// Types for compiled templates
declare module 'base-ts-v1-addon/templates/*' {
  import type { TemplateFactory } from 'htmlbars-inline-precompile';
  const tmpl: TemplateFactory;
  export default tmpl;
}
