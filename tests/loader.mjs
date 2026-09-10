/** Unit-test only: no graphics are rendered. The real game logic is not replaced. */
const mocks=new URL('./render-mocks.mjs',import.meta.url).href;
export async function resolve(specifier,context,nextResolve){
  if(specifier==='three'||(['./render.js','./world.js','./models.js','./effects.js','./audio.js','./input.js','./ui.js'].includes(specifier)&&context.parentURL?.endsWith('/src/game.js')))return {url:mocks,shortCircuit:true};
  return nextResolve(specifier,context);
}
